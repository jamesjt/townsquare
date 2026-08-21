/**
 * Golem fork (FT-850): game recording + stats — the games API client and the
 * deal-moment stash.
 *
 * A finished game is POSTed as one flat record (town, script, winner, seats);
 * the stats endpoints aggregate those records per town or platform-wide.
 * Recording is BEST-EFFORT like every golem call: an unreachable server costs
 * a toast, never the game UI.
 *
 * The deal-moment stash remembers WHEN the host dealt characters (localStorage
 * `golem.dealTime`, a map of session id → ISO instant). It serves two jobs:
 * the recorded game's `startedAt`, and the persistent "a game is underway"
 * signal — upstream's `isRolesDistributed` is a 2-second broadcast pulse, not
 * a durable flag, so it cannot gate the End-game affordance.
 */

// Same-origin in both modes — the dev server proxies /api (vue.config.js,
// FT-1010); the old absolute dev base was CORS-blocked in every browser.
const API = "/api/botc";

const DEAL_KEY = "golem.dealTime";

/**
 * POST a finished game. The server validates the flat record (seat numbers
 * unique, playerCount === seats.length, role types in the shared taxonomy —
 * note its BotC spelling is "traveller", double L). Throws on network or
 * server failure; callers toast, they never block on it.
 */
export async function recordGame(payload) {
  const res = await fetch(`${API}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`record failed (${res.status})`);
  return res.json();
}

/** One town's aggregate record → {games, byTeam, byScript, players}. */
export async function townStats(id) {
  const res = await fetch(`${API}/stats/town/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`stats failed (${res.status})`);
  return res.json();
}

/**
 * FT-1019: one town's RECORDED GAMES, newest first — the flat per-game rows
 * (script, winner, startedAt…) behind the chronicles records band. Same
 * best-effort contract as the aggregates.
 */
export async function townGames(id, limit = 50) {
  const qs = new URLSearchParams({ town: id, limit: String(limit) });
  const res = await fetch(`${API}/games?${qs}`);
  if (!res.ok) throw new Error(`games failed (${res.status})`);
  const body = await res.json();
  return Array.isArray(body.games) ? body.games : [];
}

/**
 * FT-1037: ONE recorded game, seats included — the roster behind the
 * chronicles' per-game stats tab (seatNo, playerName, roleIdFinal,
 * teamAtEnd, survived). Same best-effort contract as the rest.
 */
export async function gameRecord(id) {
  const res = await fetch(`${API}/games/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`game failed (${res.status})`);
  return res.json();
}

/** Every town together — same shape as townStats. */
export async function platformStats() {
  const res = await fetch(`${API}/stats/platform`);
  if (!res.ok) throw new Error(`stats failed (${res.status})`);
  return res.json();
}

/** The whole stash — a plain {sessionId: ISO} map, defensively parsed. */
function readStash() {
  try {
    return JSON.parse(localStorage.getItem(DEAL_KEY)) || {};
  } catch (e) {
    return {};
  }
}

/** Stamp NOW as the deal moment for a session (the host just dealt roles). */
export function markDealt(sessionId) {
  if (!sessionId) return;
  const stash = readStash();
  stash[sessionId] = new Date().toISOString();
  localStorage.setItem(DEAL_KEY, JSON.stringify(stash));
}

/** The stashed deal instant for a session, or null — doubles as the
 *  "a game is underway here" signal. */
export function dealTimeFor(sessionId) {
  return (sessionId && readStash()[sessionId]) || null;
}

/** Forget a session's deal moment (the game was recorded or abandoned). */
export function clearDealt(sessionId) {
  if (!sessionId) return;
  const stash = readStash();
  delete stash[sessionId];
  localStorage.setItem(DEAL_KEY, JSON.stringify(stash));
}
