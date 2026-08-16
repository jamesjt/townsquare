/**
 * Golem script vault (fork addition) — save/load/fork scripts against the
 * golem server, plus the localStorage "recents" shelf.
 *
 * The ANONYMOUS EDIT-LINK model: a script's public VIEW id lives in its share
 * link; the secret EDIT KEY is returned exactly once on create and kept only
 * here, in the creator's browser. Holding the key means "Save" updates in
 * place; not holding it means the first save FORKS — a new script with a fresh
 * key, recording the original as its parent. The server answers 403
 * {hint:"fork"} to a keyless save, so the fork flow needs no local guesswork.
 */

const API =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3939/api/botc/scripts"
    : "/api/botc/scripts";

const SHELF_KEY = "golem.scripts.recents";
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

/** The stored edit key for a script id, if this browser holds one. */
export function editKeyFor(id) {
  const entry = getRecents().find(e => e.id === id);
  return entry && entry.editKey;
}

/** A plain-text dump of the shelf for "export my links" (clipboard-bound). */
export function exportLinks() {
  return getRecents()
    .map(e => {
      const link = `${window.location.origin}/?script=${e.id}`;
      const key = e.editKey ? `  (edit key: ${e.editKey})` : "";
      return `${e.name} — ${link}${key}`;
    })
    .join("\n");
}

/** Accepts a bare id, a share link, or anything ending in the id. */
export function parseScriptRef(text) {
  if (!text) return null;
  const trimmed = text.trim();
  const fromQuery = /[?&]script=([A-Za-z0-9_-]+)/.exec(trimmed);
  if (fromQuery) return fromQuery[1];
  const tail = trimmed.split(/[/?&=\s]/).filter(Boolean).pop();
  return /^[A-Za-z0-9_-]{8,}$/.test(tail) ? tail : null;
}

/** GET a script. Returns the DTO ({id, name, roles, parentId, version}). */
export async function loadScript(id) {
  const res = await fetch(`${API}/${id}`);
  if (!res.ok) throw new Error(`script not found (${res.status})`);
  const { script } = await res.json();
  remember({ id: script.id, name: script.name, role: "viewed" });
  return script;
}

/**
 * Save the current script. Decides create / update / fork from what this
 * browser holds:
 *   - a stored edit key for `sourceId` → PUT in place (a 403 falls through to
 *     fork — the key was revoked or wrong);
 *   - otherwise → POST, with `sourceId` as parentId when the script came from
 *     the vault (the FORK) or none when it is brand new.
 * Returns { script, created, forked }.
 */
export async function saveScript({ name, author, roles, sourceId }) {
  const body = { name, author, roles };
  const key = sourceId && editKeyFor(sourceId);
  if (key) {
    const res = await fetch(`${API}/${sourceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-botc-edit-key": key },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      const { script } = await res.json();
      remember({ id: script.id, name: script.name, role: "created" });
      return { script, created: false, forked: false };
    }
    if (res.status !== 403) throw new Error(`save failed (${res.status})`);
    // fall through: key no longer valid → fork
  }
  if (sourceId) body.parentId = sourceId;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`save failed (${res.status})`);
  const { script, editKey } = await res.json();
  remember({
    id: script.id,
    name: script.name,
    editKey,
    role: sourceId ? "forked" : "created"
  });
  return { script, created: !sourceId, forked: !!sourceId };
}

/** The share link for a script id (same origin — ?script survives the hash). */
export function shareLink(id) {
  return `${window.location.origin}/?script=${id}`;
}
