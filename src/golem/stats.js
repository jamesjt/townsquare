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
const DEV_KEY = "golem.devGame";

/**
 * FT-1236 — THE TEST-LEDGER PARAM, the client half of the server's one
 * contract: absent = real games only (every ordinary surface), `test=only` =
 * test games only (the labs-gated dev view of the Chronicles). Appended by
 * every read helper below when the caller asks for the dev ledger, so the
 * question is spelled identically on every route.
 */
function withTestView(qs, test) {
  if (test) qs.set("test", "only");
  return qs;
}

/**
 * FT-1299 — THE TOWNS-SCOPE PARAM, the test param's sibling: absent = every
 * town (the anonymous default, always), `scope=mine` = only the towns the
 * signed-in caller has sat in. The server answers 401 to an anonymous
 * `scope=mine` rather than silently widening, so callers only pass `mine`
 * when the session store says an account is present.
 */
function withMineScope(qs, mine) {
  if (mine) qs.set("scope", "mine");
  return qs;
}

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
export async function townStats(id, test = false) {
  const qs = withTestView(new URLSearchParams(), test).toString();
  const res = await fetch(
    `${API}/stats/town/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`,
  );
  if (!res.ok) throw new Error(`stats failed (${res.status})`);
  return res.json();
}

/**
 * FT-1019: one town's RECORDED GAMES, newest first — the flat per-game rows
 * (script, winner, startedAt…) behind the chronicles records band. Same
 * best-effort contract as the aggregates.
 */
export async function townGames(id, limit = 50, test = false) {
  const qs = withTestView(
    new URLSearchParams({ town: id, limit: String(limit) }),
    test,
  );
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

/**
 * FT-1155: EVERY recorded game, newest first, across every town — one call.
 *
 * This is the read the ledger could not make. `GET /games` used to REQUIRE a
 * town and answer 400 without one, and nothing enumerates the towns that
 * exist, so "every game on the platform" had to be faked by fanning the
 * per-town read over whatever towns this browser had happened to visit (see
 * golem/records). The town parameter is now optional and its absence means
 * every town; each row already carries its own `townId`, so a mixed list needs
 * nothing new to stay readable. The server's ceiling is 50 either way.
 */
export async function allGames(limit = 50, test = false, mine = false) {
  const qs = withMineScope(
    withTestView(new URLSearchParams({ limit: String(limit) }), test),
    mine,
  );
  const res = await fetch(`${API}/games?${qs}`);
  if (!res.ok) throw new Error(`games failed (${res.status})`);
  const body = await res.json();
  return Array.isArray(body.games) ? body.games : [];
}

/**
 * FT-1164: THE BREAKDOWN — every recorded game, by script and by role.
 *
 * Totals and the good/evil split; then per script its games, its share of the
 * platform and its own split; then per role within that script how many games
 * it was in, that as a share of the script, its win rate and when it died.
 *
 * The response DOCUMENTS ITSELF: an `about` block carries, in sentences, what
 * each figure counted — what an unrecorded game length does to a median, why
 * night and day are never averaged together, what the mode is worth, and where
 * the small-sample line sits (`about.smallSampleThreshold`). The page reads
 * that threshold from here rather than keeping its own copy, so the two can
 * never disagree about which numbers are too thin to read.
 */
export async function platformBreakdown(test = false, mine = false) {
  const qs = withMineScope(
    withTestView(new URLSearchParams(), test),
    mine,
  ).toString();
  const res = await fetch(`${API}/stats/breakdown${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`breakdown failed (${res.status})`);
  return res.json();
}

/**
 * FT-1164: games of one script containing EVERY one of the named roles, with
 * the share of the script that is and the split of who won them.
 *
 * A QUERY, asked fresh each time, never a table read: 22 roles is 231 pairs
 * and 1,540 triples, and the only combination worth an answer is the one a
 * reader just picked.
 */
export async function roleCombination(
  scriptName,
  roleIds,
  test = false,
  mine = false,
) {
  const qs = withMineScope(
    withTestView(
      new URLSearchParams({
        script: scriptName,
        roles: (roleIds || []).join(","),
      }),
      test,
    ),
    mine,
  );
  const res = await fetch(`${API}/stats/combination?${qs}`);
  if (!res.ok) throw new Error(`combination failed (${res.status})`);
  return res.json();
}

/**
 * FT-1301: THE FACT ROWS — every game in the asked-for view, with per-seat
 * ROLE facts (role id/type, side at end, survived; never a name), in one
 * read. The records page's model inverted: filters define a set CLIENT-side
 * and every figure is computed over it, so what the server serves is scoping
 * + facts, not aggregates. Same view params as every other read.
 */
export async function gameFacts(test = false, mine = false) {
  const qs = withMineScope(
    withTestView(new URLSearchParams(), test),
    mine,
  ).toString();
  const res = await fetch(`${API}/games/facts${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`facts failed (${res.status})`);
  const body = await res.json();
  return Array.isArray(body.games) ? body.games : [];
}

/** Every town together — same shape as townStats. */
export async function platformStats(test = false) {
  const qs = withTestView(new URLSearchParams(), test).toString();
  const res = await fetch(`${API}/stats/platform${qs ? `?${qs}` : ""}`);
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

/**
 * FT-1236 — THE DEV-GAME MARK (localStorage `golem.devGame`, a map of
 * session id → true), the deal stash's sibling and lifecycle twin.
 *
 * A game that used a dev fixture AT ANY POINT is a TEST GAME: the fake-player
 * fill (ids `dev-N`) and the shift-click Start both stamp the mark the moment
 * the gesture happens — the fact is recorded when it exists, not inferred
 * from seat names at record time. It persists like the deal moment does
 * (host-side, per town, across the host's own reload) so the end-of-game POST
 * can still say `isTest: true` however long the game ran, and it dies with
 * the game exactly where the deal stash dies (App.vue's onGameRecorded and
 * Play again), so the NEXT game in the same town starts unmarked.
 */
function readDevStash() {
  try {
    return JSON.parse(localStorage.getItem(DEV_KEY)) || {};
  } catch (e) {
    return {};
  }
}

/** Stamp this session's running game as a dev/test game. */
export function markDevGame(sessionId) {
  if (!sessionId) return;
  const stash = readDevStash();
  stash[sessionId] = true;
  localStorage.setItem(DEV_KEY, JSON.stringify(stash));
}

/** Was a dev fixture used in this session's running game? */
export function isDevGame(sessionId) {
  return !!(sessionId && readDevStash()[sessionId]);
}

/** Forget the mark (the game was recorded or abandoned). */
export function clearDevGame(sessionId) {
  if (!sessionId) return;
  const stash = readDevStash();
  delete stash[sessionId];
  localStorage.setItem(DEV_KEY, JSON.stringify(stash));
}
