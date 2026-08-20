/**
 * Golem role library (fork addition, FT-851) — save/load/fork CUSTOM ROLES
 * against the golem server, plus the localStorage "recents" shelf. Mirrors
 * the script vault (scripts.js): same anonymous edit-link model, same shelf
 * semantics — the secret EDIT KEY is returned exactly once on create and kept
 * only here; a keyless save of someone else's role FORKS it (the server
 * answers 403 {hint:"fork"}), recording the original as its parent.
 *
 * Wire notes (the roles API speaks towns-FLAT, not the scripts {script:...}
 * wrapper): POST → 201 flat row + editKey; GET /:id and PUT /:id → flat row;
 * GET / → {roles:[...]}. The server spells the fifth type "traveller"; the
 * app spells it "traveler" — map at this boundary, both directions.
 */

const API =
  process.env.NODE_ENV === "development"
    ? "/api/botc/roles" // the dev server proxies /api (vue.config.js, FT-1010)
    : "/api/botc/roles";

const SHELF_KEY = "golem.roles";
const SHELF_MAX = 30;

/** The recents shelf: [{id, name, editKey?, role, lastSeen}] newest first. */
export function getRecents() {
  try {
    const raw = JSON.parse(localStorage.getItem(SHELF_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

/** Upsert a shelf entry by id. `role` upgrades (viewed < forked < created). */
export function remember(entry) {
  const rank = { viewed: 0, forked: 1, created: 2 };
  const shelf = getRecents().filter(e => e.id !== entry.id);
  const prior = getRecents().find(e => e.id === entry.id) || {};
  shelf.unshift({
    ...prior,
    ...entry,
    // never DOWNGRADE a role or lose a stored edit key on a later view
    role:
      (rank[entry.role] || 0) >= (rank[prior.role] || 0)
        ? entry.role
        : prior.role,
    editKey: entry.editKey || prior.editKey,
    lastSeen: Date.now()
  });
  localStorage.setItem(SHELF_KEY, JSON.stringify(shelf.slice(0, SHELF_MAX)));
}

/** The stored edit key for a library role id, if this browser holds one. */
export function editKeyFor(id) {
  const entry = getRecents().find(e => e.id === id);
  return entry && entry.editKey;
}

/** A plain-text dump of the shelf for "export my links" (clipboard-bound). */
export function exportLinks() {
  return getRecents()
    .map(e => {
      const key = e.editKey ? `  (edit key: ${e.editKey})` : "";
      return `${e.name} — role id: ${e.id}${key}`;
    })
    .join("\n");
}

/** server 'traveller' → app 'traveler'; the other four pass through. */
export function teamFromRoleType(roleType) {
  return roleType === "traveller" ? "traveler" : roleType;
}

/** app 'traveler' → server 'traveller'; the other four pass through. */
export function roleTypeFromTeam(team) {
  return team === "traveler" ? "traveller" : team;
}

/** Read the server's error body into a human sentence (zod details first). */
async function apiMessage(res, fallback) {
  try {
    const data = await res.json();
    if (data && Array.isArray(data.details) && data.details.length) {
      const issue = data.details[0];
      const path = Array.isArray(issue.path) ? issue.path.join(".") : "";
      return path ? `${path}: ${issue.message}` : issue.message;
    }
    if (data && data.error) return data.error;
  } catch (e) {
    /* fall through to the fallback */
  }
  return fallback;
}

/** GET a library role. Returns the flat row; remembers it as viewed. */
export async function loadRole(id) {
  const res = await fetch(`${API}/${id}`);
  if (!res.ok) throw new Error(`role not found (${res.status})`);
  const role = await res.json();
  remember({ id: role.id, name: role.name, role: "viewed" });
  return role;
}

/** Browse the library. Filters compose; returns the flat rows newest-first. */
export async function browseRoles({ q, type, author, limit } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (author) params.set("author", author);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  const res = await fetch(qs ? `${API}?${qs}` : API);
  if (!res.ok) throw new Error(await apiMessage(res, `browse failed (${res.status})`));
  const { roles } = await res.json();
  return roles;
}

/**
 * Save a role to the library. Decides create / update / fork from what this
 * browser holds (the scripts.js decision, verbatim):
 *   - a stored edit key for `sourceId` → PUT in place (a 403 falls through to
 *     fork — the key was revoked or wrong);
 *   - otherwise → POST, with `sourceId` as parentId when the role came from
 *     the library (the FORK) or none when it is brand new.
 * `fields` = {name, roleType, ability, icon, firstNight, otherNight,
 * reminders, setup, authorName}. Returns { role, created, forked }.
 */
export async function saveRole({ sourceId, ...fields }) {
  const key = sourceId && editKeyFor(sourceId);
  if (key) {
    const res = await fetch(`${API}/${sourceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-botc-edit-key": key },
      body: JSON.stringify(fields)
    });
    if (res.ok) {
      const role = await res.json();
      remember({ id: role.id, name: role.name, role: "created" });
      return { role, created: false, forked: false };
    }
    if (res.status !== 403) {
      throw new Error(await apiMessage(res, `save failed (${res.status})`));
    }
    // fall through: key no longer valid → fork
  }
  const body = { ...fields };
  if (sourceId) body.parentId = sourceId;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await apiMessage(res, `save failed (${res.status})`));
  const { editKey, ...role } = await res.json();
  remember({
    id: role.id,
    name: role.name,
    editKey,
    role: sourceId ? "forked" : "created"
  });
  return { role, created: !sourceId, forked: !!sourceId };
}

/**
 * A library row → the app's custom-role object (the upstream custom-script
 * shape), SNAPSHOT semantics — the script carries the whole role:
 *   - team uses the app's spelling ('traveller' → 'traveler');
 *   - `image` resolves the chosen icon (an official role id) to that role's
 *     bundled image URL — shown when the grimoire's image opt-in is on;
 *   - `golemIcon` carries the official id so the store maps imageAlt to the
 *     bundled icon even WITHOUT the opt-in (see store setCustomRoles);
 *   - `golemRoleId` carries the library id for future edits/stats — harmless
 *     to upstream consumers.
 */
export function toAppRole(role) {
  const id = ("golem" + role.id).toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
  let image = "";
  if (role.icon) {
    try {
      image = require("../assets/icons/" + role.icon + ".png");
    } catch (e) {
      image = ""; // an unknown icon id degrades to the team-generic token
    }
  }
  return {
    id,
    name: role.name,
    team: teamFromRoleType(role.roleType),
    ability: role.ability,
    image,
    golemIcon: role.icon || "",
    golemRoleId: role.id,
    edition: "custom",
    firstNight: role.firstNight || 0,
    otherNight: role.otherNight || 0,
    reminders: Array.isArray(role.reminders) ? role.reminders.slice() : [],
    setup: !!role.setup
  };
}
