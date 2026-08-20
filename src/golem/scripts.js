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
    ? "/api/botc/scripts" // the dev server proxies /api (vue.config.js, FT-1010)
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

/**
 * FORGET (FT-970) — drop a script from THIS BROWSER'S shelf. Purely local: the
 * script stays on the server, the share link keeps working, and anyone else's
 * shelf is untouched. This is the one that clears clutter, and it is available
 * for every entry, including scripts this browser merely viewed.
 *
 * It is not free for a script you OWN: the edit key lives nowhere else, so
 * forgetting one discards the only proof of ownership this browser holds. The
 * script becomes read-only to you — saving it would fork instead. That is why
 * the control asks twice, and why "Export my script links" writes the keys out.
 */
export function forget(id) {
  localStorage.setItem(
    SHELF_KEY,
    JSON.stringify(getRecents().filter(e => e.id !== id))
  );
}

/**
 * DELETE FOR EVERYONE (FT-970) — destroy the script on the server. Needs the
 * edit key, so it is only ever possible for a script this browser created; the
 * server refuses the request outright without it.
 *
 * A 404 counts as success. The goal state is "this script is not on the
 * server", and a shelf entry pointing at a row somebody already deleted has
 * simply gone stale — reporting that as a failure would strand the entry on the
 * shelf with no way to clear it.
 *
 * The shelf entry goes either way: keeping a key for a row that no longer
 * exists serves nothing.
 */
export async function deleteScript(id) {
  const key = editKeyFor(id);
  if (!key) {
    throw Object.assign(new Error("this script is not yours to delete"), {
      code: "not-yours"
    });
  }
  const res = await fetch(`${API}/${id}`, {
    method: "DELETE",
    headers: { "x-botc-edit-key": key }
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`delete failed (${res.status})`);
  }
  forget(id);
  return { alreadyGone: res.status === 404 };
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

/** GET a script DTO WITHOUT touching the recents shelf — metadata peeks
 *  (e.g. the Host panel's script grid showing role counts) must not reorder
 *  or upsert history the way loadScript's remember() does. */
export async function peekScript(id) {
  const res = await fetch(`${API}/${id}`);
  if (!res.ok) throw new Error(`script not found (${res.status})`);
  const { script } = await res.json();
  return script;
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
 *   - a stored edit key for `sourceId` → PUT in place;
 *   - otherwise → POST, with `sourceId` as parentId when the script came from
 *     the vault (the FORK) or none when it is brand new.
 *
 * A FORK NEVER HAPPENS BY ITSELF. The caller decides to fork and passes
 * `forceFork` with the name the user confirmed for their copy — a fork used to
 * inherit the original's name silently, which is how a vault filled up with
 * three scripts all called the same thing. So a stale/revoked key does NOT
 * fall through here any more: the PUT's 403 throws `code:"fork-required"` and
 * the caller comes back round with a name.
 *
 * Returns { script, created, forked }.
 */
export async function saveScript({ name, author, roles, sourceId, forceFork }) {
  const body = { name, author, roles };
  const key = !forceFork && sourceId && editKeyFor(sourceId);
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
    // the key is no longer good — this can only become a fork now, and a fork
    // needs a name the user picked. Hand that decision back to the caller.
    throw Object.assign(new Error("this script needs a name of its own"), {
      code: "fork-required"
    });
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
