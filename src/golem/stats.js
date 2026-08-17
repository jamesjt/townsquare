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

const API =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3939/api/botc"
    : "/api/botc";

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
    body: JSON.stringify(payload)
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
