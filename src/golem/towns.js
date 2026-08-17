/**
 * Golem fork: the towns shelf — which live-game channels this browser has
 * hosted or joined, remembered locally (the same pattern as the script
 * recents). A "town" is just a relay channel name with a memory attached.
 */

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

/** Record a visit (any entry path: panel, hash link, toolbar). */
export function rememberTown(id, role) {
  const clean = normalizeTownId(id);
  if (!clean) return;
  const towns = listTowns().filter(town => town.id !== clean);
  towns.unshift({ id: clean, role, at: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(towns.slice(0, MAX)));
}

/** Ask the relay which towns are awake. → { id: { players, host } } */
export function townStatuses(ids) {
  if (!ids.length) return Promise.resolve({});
  return fetch("/ws/status?towns=" + encodeURIComponent(ids.join(",")))
    .then(res => (res.ok ? res.json() : {}))
    .catch(() => ({}));
}

/** The relay lowercases channel names on arrival — mirror that here so the
 *  shelf, the status API and the socket all speak of the same town. */
export function normalizeTownId(id) {
  return String(id || "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  "wolfsden"
];

export function mintTownId() {
  const place = PLACES[Math.floor(Math.random() * PLACES.length)];
  return place + "-" + (100 + Math.floor(Math.random() * 900));
}
