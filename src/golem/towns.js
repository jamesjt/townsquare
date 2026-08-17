/**
 * Golem fork: the towns shelf — which live-game channels this browser has
 * hosted or joined, remembered locally (the same pattern as the script
 * recents). A "town" is just a relay channel name with a memory attached.
 *
 * FT-847 — OWNED towns: same anonymous-key model as the script vault. A claim
 * (POST) returns the town's edit key exactly once; holding it means rename /
 * attach-script update in place (PUT). The key lives only here, on the shelf:
 * {id, name?, editKey?, role, at}. Every server call is best-effort — the
 * plain hosting flow never blocks on the API being reachable.
 */

const API =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3939/api/botc/towns"
    : "/api/botc/towns";

const KEY = "golem.towns";
const MAX = 12;

/** All remembered towns, newest first; filter by role ("host" | "player"). */
export function listTowns(role = null) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY)) || [];
    return role ? all.filter(town => town.role === role) : all;
  } catch (e) {
    return [];
  }
}

/**
 * Record a visit (any entry path: panel, hash link, toolbar). Upserts: a
 * later visit never loses a stored edit key or cached display name, and the
 * role only upgrades (player → host), mirroring the script shelf's semantics.
 * `extra` may carry {editKey, name} from a claim or a server meta refresh.
 */
export function rememberTown(id, role, extra = {}) {
  const clean = normalizeTownId(id);
  if (!clean) return;
  const rank = { player: 0, host: 1 };
  const all = listTowns();
  const prior = all.find(town => town.id === clean) || {};
  const towns = all.filter(town => town.id !== clean);
  towns.unshift({
    ...prior,
    id: clean,
    role: (rank[role] || 0) >= (rank[prior.role] || 0) ? role : prior.role,
    editKey: extra.editKey || prior.editKey,
    name: extra.name || prior.name,
    at: Date.now()
  });
  // Trim to MAX, but an OWNED entry is never rotated off — losing the key
  // would orphan the town forever.
  const kept = towns
    .slice(0, MAX)
    .concat(towns.slice(MAX).filter(town => town.editKey));
  localStorage.setItem(KEY, JSON.stringify(kept));
}

/** The stored edit key for a town id, if this browser holds one. */
export function editKeyFor(id) {
  const entry = listTowns().find(town => town.id === normalizeTownId(id));
  return (entry && entry.editKey) || null;
}

/** Forget a shelf entry (client-side only — the server row is untouched).
 *  Forgetting an OWNED entry discards its locally-held edit key for good. */
export function removeTown(id) {
  const clean = normalizeTownId(id);
  const towns = listTowns().filter(town => town.id !== clean);
  localStorage.setItem(KEY, JSON.stringify(towns));
}

/**
 * Claim a town id (POST). On success the shelf entry gains the edit key —
 * its single appearance — and the display name.
 * → { town } | { taken: true }; throws only on network/server failure.
 */
export async function claimTown(id, name, scriptId) {
  const body = { id: normalizeTownId(id), name };
  if (scriptId) body.scriptId = scriptId;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (res.status === 409) return { taken: true };
  if (!res.ok) throw new Error(`claim failed (${res.status})`);
  // NOTE: towns responses are FLAT (unlike the scripts API's {script} wrap).
  const town = await res.json();
  rememberTown(town.id, "host", { editKey: town.editKey, name: town.name });
  return { town };
}

/**
 * Keyed save on an owned town (PUT): {name?, scriptId?} — scriptId null
 * detaches. Uses the shelf's stored key; refreshes the cached name.
 */
export async function updateTown(id, patch) {
  const clean = normalizeTownId(id);
  const key = editKeyFor(clean);
  if (!key) throw new Error("no edit key held for " + clean);
  const res = await fetch(`${API}/${clean}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-botc-edit-key": key },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error(`town save failed (${res.status})`);
  const town = await res.json(); // flat, like all towns responses
  rememberTown(town.id, "host", { name: town.name });
  return town;
}

/**
 * Batch public meta for shelf ids (≤30; unknown ids silently absent).
 * → { id: {id, name, scriptId, version, ...} }. Also refreshes the shelf's
 * cached display names in place — without reordering it.
 */
export function townMeta(ids) {
  const clean = [...new Set(ids.map(normalizeTownId).filter(Boolean))].slice(
    0,
    30
  );
  if (!clean.length) return Promise.resolve({});
  return fetch(API + "?ids=" + encodeURIComponent(clean.join(",")))
    .then(res => (res.ok ? res.json() : { towns: [] }))
    .then(({ towns }) => {
      const meta = {};
      (towns || []).forEach(town => {
        meta[town.id] = town;
      });
      cacheTownNames(meta);
      return meta;
    })
    .catch(() => ({}));
}

/** Quiet name refresh: update shelf names from meta, keep order + timestamps. */
function cacheTownNames(meta) {
  const towns = listTowns();
  let changed = false;
  towns.forEach(town => {
    const m = meta[town.id];
    if (m && m.name && m.name !== town.name) {
      town.name = m.name;
      changed = true;
    }
  });
  if (changed) localStorage.setItem(KEY, JSON.stringify(towns));
}

/** Ask the relay which towns are awake. → { id: { players, host } } */
export function townStatuses(ids) {
  if (!ids.length) return Promise.resolve({});
  return fetch("/ws/status?towns=" + encodeURIComponent(ids.join(",")))
    .then(res => (res.ok ? res.json() : {}))
    .catch(() => ({}));
}

/** The relay lowercases channel names on arrival — mirror that here so the
 *  shelf, the status API and the socket all speak of the same town. The
 *  24-char cap matches the session store's sanitizer AND the server's town-id
 *  rule (/^[a-z0-9_-]{1,24}$/) — one id, never forked between surfaces. */
export function normalizeTownId(id) {
  return String(id || "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/g, "");
}

// A readable, flavorful default the host can still edit.
const PLACES = [
  "ravenswood",
  "hallowmere",
  "gallowsgate",
  "thornbury",
  "ashcombe",
  "blackpond",
  "mirefen",
  "crowmarket",
  "dunhollow",
  "candlewick",
  "bellchapel",
  "gravesend",
  "mothhaven",
  "ironvale",
  "nightbell",
  "wolfsden",
  "graymoor",
  "duskwood",
  "cinderfall",
  "wraithmoor",
  "hollowmere",
  "blackfen",
  "ashgrove",
  "crowsfoot",
  "ebonvale",
  "foxglove",
  "greymarsh",
  "hangmoor",
  "ironthorn",
  "mourncreek",
  "nettlewick",
  "oldgrave",
  "pinehollow",
  "quietfen",
  "rookwood",
  "shadowmere",
  "stonecairn",
  "thistlewood",
  "tombury",
  "vulturewatch",
  "westfen",
  "witchmoor",
  "yewbrook",
  "bramblegate",
  "coldharbor",
  "deadfall",
  "elmshadow",
  "foggate"
];

// Mood/adjective words for the fallback `adjective-place` compound, used only
// when bare place names keep colliding (see mintAvailableTownId below).
const MOODS = [
  "silent",
  "hollow",
  "ashen",
  "veiled",
  "gloomy",
  "withered",
  "forsaken",
  "moonlit",
  "ghostly",
  "crimson",
  "weeping",
  "restless",
  "forgotten",
  "brittle",
  "shadowed",
  "drowned"
];

function pickPlace() {
  return PLACES[Math.floor(Math.random() * PLACES.length)];
}

function pickMood() {
  return MOODS[Math.floor(Math.random() * MOODS.length)];
}

/** A readable default town id — a bare place name, no digits, unchecked. */
export function mintTownId() {
  return pickPlace();
}

/**
 * Best-effort availability check for a candidate id: unclaimed (404 from the
 * towns API) AND not currently awake (0 players via townStatuses). Any
 * network failure resolves true — an unreachable API never blocks minting,
 * it just skips the check and hands back the candidate unverified.
 */
async function isAvailable(id) {
  let res;
  try {
    res = await fetch(`${API}/${id}`);
  } catch (e) {
    return true; // API unreachable — best effort, proceed unchecked
  }
  if (res.status !== 404) return false; // claimed
  const statuses = await townStatuses([id]).catch(() => ({}));
  const s = statuses[id];
  return !s || !s.players;
}

const MINT_ATTEMPTS = 5;

/**
 * Mint a town id, availability-checked best-effort: bare place names first
 * (a few attempts), falling back to `adjective-place` compounds if the plain
 * names keep colliding. Never blocks — an unreachable API returns the first
 * candidate unchecked (isAvailable resolves true immediately).
 */
export async function mintAvailableTownId() {
  let candidate = pickPlace();
  for (let i = 0; i < MINT_ATTEMPTS; i++) {
    if (await isAvailable(candidate)) return candidate;
    candidate = pickPlace();
  }
  for (let i = 0; i < MINT_ATTEMPTS; i++) {
    const compound = pickMood() + "-" + pickPlace();
    if (await isAvailable(compound)) return compound;
    candidate = compound;
  }
  return candidate; // exhausted attempts — hand back the last try
}
