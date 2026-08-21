/**
 * Golem fork (FT-1010): CHRONICLES — the town's whole story as one stream.
 *
 * Three surfaces merged into one (user decision, 2026-08-20): the town chat,
 * the live chronicle, and the town records. The stream is the PERSISTENT town
 * log (FT-963/987 — one permanent room per town, a game is a filter over it),
 * with GAME EVENTS as rows in that same log beside the talk, so the story
 * survives every reload and reaches every client from one store.
 *
 * This file owns two things and no rendering:
 *
 *   1. THE EVENT ENVELOPE — how a game event rides a stored chat row.
 *   2. SECTIONING — cutting the one stream into per-game chapters with the
 *      between-games talk standing between them.
 *
 * ── WHY AN ENVELOPE INSIDE `kind: "system"`, NOT A NEW ROW KIND ────────────
 * The lane brief suggested `kind: "event"`. The relay rules it out without
 * being touched: server/chat.js accepts exactly {say, whisper, system} and
 * refuses anything else, and the relay is hand-deployed — this design must
 * not need it changed. What the relay DOES already give `system` is exactly
 * what events need: host-only authorship (a frame from anyone else is
 * refused, so N clients can never write N duplicate rows), store-accepted
 * delivery, broadcast to the whole town. So an event IS a system row, and
 * the event's machine half rides INSIDE the body:
 *
 *   body = "EV1" + JSON.stringify({ t, text, ...detail })
 *
 *   t      the event type — see EVENTS below
 *   text   the human sentence, ALWAYS present, so any surface that does not
 *          know the envelope (an older build, a raw DB read) still has a
 *          renderable line by stripping the prefix — and the envelope can be
 *          dropped entirely someday without losing the story.
 *
 * A system row whose body does NOT start with the prefix is a plain
 * announcement (every pre-FT-1010 row: "A game begins.", "Night 1 falls.")
 * and renders as one. Decode never throws; it answers null and the caller
 * falls back to the raw body.
 */

/** The envelope prefix. Versioned so a future shape can coexist in one log. */
export const EV_PREFIX = "EV1";

/**
 * The event vocabulary — what the host's client writes down as it happens.
 *
 *   start       the deal — a game begins (gameId is born with it)
 *   end         the storyteller named the winner
 *   phase       day/night turned; detail: { night: bool, day: number }
 *   death       a shroud placed;  detail: { name, seat }
 *   revive      a shroud lifted;  detail: { name, seat }
 *   nomination  a vote concluded; detail: { nominator, nominee, type,
 *               votes: number, majority: number, carried: bool,
 *               voters: [names], ghosts: [names] }.
 *               FT-1019: `voters` is WHO RAISED HANDS at the conclusion —
 *               recorded once, when the vote is recorded, never per-hand —
 *               and `ghosts` is the subset who were dead when they did (a
 *               spent ghost vote). Rows written before FT-1019 carry
 *               neither key and render tally-only.
 *   execution   a seat marked for execution; detail: { name, seat }.
 *               "Marked", not "died" — the storyteller decides what a
 *               majority means, and the record must not invent an outcome
 *               (the same honesty rule golem/chronicle.js stated).
 *   unmark      the mark lifted DELIBERATELY (the storyteller's own clear,
 *               during the day); detail: { name, seat }. The night falling
 *               also clears the mark, but that is the day expiring, not
 *               news — socket.js writes no row for it.
 */
export const EVENTS = [
  "start",
  "end",
  "phase",
  "death",
  "revive",
  "nomination",
  "execution",
  "unmark",
  // FT-1037: the town-session boundary — the storyteller opened the town.
  // Current mode anchors on the LAST of these (openAnchorSeq below).
  "open",
  // FT-1037: a BOARD PORTRAIT — the ring as data, not pixels; detail:
  // { moment: "day1" | "end", seats: [{name, role, dead, traveler}] }.
  // Captured when Day 1 breaks and at game end, but both POSTED at game
  // end: a day-1 row broadcast mid-game would hand every player the full
  // grimoire (roles ride the body, and system rows reach everyone).
  "board",
];

/** Event → stored body. `text` is required; detail keys ride beside it. */
export function encodeEvent(event) {
  return EV_PREFIX + JSON.stringify(event);
}

/**
 * Stored body → event, or null for a plain announcement. Defensive on every
 * edge: a truncated body, hand-typed JSON, an unknown `t` — all null, all
 * rendered as the plain line they still carry.
 */
export function decodeEvent(body) {
  if (typeof body !== "string" || !body.startsWith(EV_PREFIX + "{")) {
    return null;
  }
  try {
    const event = JSON.parse(body.slice(EV_PREFIX.length));
    if (!event || typeof event !== "object") return null;
    if (!EVENTS.includes(event.t)) return null;
    if (typeof event.text !== "string" || !event.text) return null;
    return event;
  } catch (e) {
    return null;
  }
}

/** The human line for ANY system row — decoded text, or the body as it is. */
export function eventTextOf(row) {
  const event = decodeEvent(row.body);
  return event ? event.text : row.body;
}

/** The stream filters. "Talk" is people; "Gallows" is the nomination arc
 *  (FT-1019, user call — the vote-history door's icon lives on as its
 *  filter); "Events" is everything else the town does. */
export const FILTERS = ["all", "talk", "gallows", "events"];

/** The event types that belong to the gallows — the nomination arc. */
const GALLOWS_T = new Set(["nomination", "execution", "unmark"]);

/** Does a row survive the talk/events filter? System rows ARE the events. */
export function inFilter(row, filter) {
  if (filter === "talk") return row.kind !== "system";
  if (filter === "gallows") {
    if (row.kind !== "system") return false;
    const ev = decodeEvent(row.body);
    return !!ev && GALLOWS_T.has(ev.t);
  }
  if (filter === "events") return row.kind === "system";
  return true;
}

/**
 * Cut the stream into SECTIONS: one per game, in the order the games were
 * played, with between-games rows standing between them as their own
 * uncollapsible runs. Order in = order out (the caller hands rows ascending
 * by seq; a game slice keeps the town's numbering, so a section is simply a
 * consecutive run of one gameId).
 *
 * Returns [{ key, gameId, ordinal, rows }]:
 *   key      stable across rebuilds (Vue :key + the collapse map's key)
 *   gameId   null for a between-games run
 *   ordinal  1-based game number in this town's story; null between games
 *
 * A row with an unexpected out-of-run gameId (should not happen — a game's
 * rows are written while it is live, so they are contiguous) starts a new
 * run rather than being dropped: the story must hold every row somewhere.
 */
export function sectionize(rows) {
  const sections = [];
  let current = null;
  let ordinal = 0;
  (rows || []).forEach((row) => {
    const gameId = row.gameId || null;
    if (!current || current.gameId !== gameId) {
      if (gameId) ordinal += 1;
      current = {
        key: gameId ? gameId : "between:" + (row.seq || sections.length),
        gameId,
        ordinal: gameId ? ordinal : null,
        rows: [],
      };
      sections.push(current);
    }
    current.rows.push(row);
  });
  return sections;
}

/**
 * The games the picker offers, newest first, derived from the rows in hand —
 * the same derivation everywhere, so the picker and the sections can never
 * disagree about which games exist.
 */
export function gamesOf(rows) {
  const seen = new Map();
  (rows || []).forEach((row) => {
    if (row.gameId && !seen.has(row.gameId)) {
      seen.set(row.gameId, {
        gameId: row.gameId,
        ordinal: seen.size + 1,
        startedAt: row.createdAt || null,
      });
    }
  });
  return [...seen.values()].reverse();
}

/** "20 Aug" for a section header, or "" when the clock is unreadable. */
/** FT-1020 (user call): a game is LABELLED by when it began — "20 Aug 21:15" —
 *  not by an ordinal. */
export function startLabelOf(createdAt) {
  const at = Date.parse(createdAt);
  if (!Number.isFinite(at)) return "";
  const d = new Date(at);
  const hm =
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0");
  return dayOf(createdAt) + " · " + hm;
}

/**
 * FT-1019: THE GALLOWS THREAD — the strand a nomination row unfolds into.
 *
 * A concluded nomination is one beat of a longer arc: hands went up, the
 * storyteller may have marked the nominee for execution, may have lifted the
 * mark again, and the nominee may then have died. The roster travels INSIDE
 * the nomination's own envelope (voters/ghosts); the mark, the unmark and the
 * outcome are their own rows in the same stream, written as they happened.
 * This walks FORWARD from the nomination row and gathers the rows that belong
 * to ITS arc:
 *
 *   · same game only — a thread never crosses a chapter
 *   · about the NOMINEE by name — another seat's mark is another arc
 *   · until the day turns (a `phase` row) — the gallows is a daytime
 *     machine and the night falling ends every standing arc — or until the
 *     same nominee is nominated AGAIN (a fresh arc supersedes)
 *
 * Returns { mark, unmark, death } — each the matched ROW or null. Honest by
 * construction: it reports rows that were actually written, never inferring
 * an outcome from a majority (the record's own rule).
 */
export function gallowsThreadOf(rows, nominationRow) {
  const out = { mark: null, unmark: null, death: null };
  const nom = decodeEvent(nominationRow.body);
  if (!nom || nom.t !== "nomination") return out;
  const from = (rows || []).findIndex((r) => r.seq === nominationRow.seq);
  if (from < 0) return out;
  for (let i = from + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.gameId !== nominationRow.gameId) break;
    if (row.kind !== "system") continue;
    const ev = decodeEvent(row.body);
    if (!ev) continue;
    if (ev.t === "phase") break;
    if (ev.t === "nomination" && ev.nominee === nom.nominee) break;
    if (ev.name !== nom.nominee) continue;
    if (ev.t === "execution" && !out.mark) out.mark = row;
    else if (ev.t === "unmark" && out.mark && !out.unmark) out.unmark = row;
    else if (ev.t === "death" && !out.death) out.death = row;
  }
  return out;
}

/**
 * FT-1019: a RECORDED game (the games API's DTO) → the id its rows carry in
 * the town log, or null when the bridge cannot be built. The log's gameId is
 * minted from the town and the deal instant (golem/chat's gameIdFor); the
 * recorded game's `startedAt` IS that same stashed instant, posted with the
 * record — so the two sides meet on `g-<town>-<ms>` without either being
 * taught about the other. A record with no startedAt (never dealt through
 * this client, or a pre-FT-965 row) has no bridge and answers null.
 */
export function logGameIdOf(townId, startedAt) {
  if (!townId || !startedAt) return null;
  const at = Date.parse(startedAt);
  if (!Number.isFinite(at)) return null;
  return `g-${townId}-${at}`;
}

/** FT-1032 (user call): how long each phase RAN, keyed by the phase-turn
 *  row that ENDED it — "Night 1 falls" carries the length of the day (or
 *  setup) it closed. Computed from the rows' own timestamps; only phase
 *  turns and the game start anchor the clock. */
export function phaseDurations(rows) {
  const out = {};
  let anchorAt = null;
  for (const row of rows) {
    if (row.kind !== "system") continue;
    const ev = decodeEvent(row.body);
    if (!ev) continue;
    const at = Date.parse(row.createdAt);
    if (ev.t === "start") {
      anchorAt = at;
      continue;
    }
    if (ev.t !== "phase") continue;
    if (anchorAt != null && Number.isFinite(at))
      out[row.id] = Math.max(0, Math.round((at - anchorAt) / 1000));
    anchorAt = at;
  }
  return out;
}

/**
 * FT-1037: THE CURRENT ANCHOR — the seq of the LAST `open` row in the log,
 * or 0 when the town has never written one. Current mode shows rows at or
 * after this seq; History reads per game. Derived from the log itself so
 * every client — host, player, a reload mid-game — computes the same
 * boundary from the same rows, with no per-browser state to drift.
 */
export function openAnchorSeq(rows) {
  let anchor = 0;
  (rows || []).forEach((row) => {
    if (row.kind !== "system") return;
    const ev = decodeEvent(row.body);
    if (ev && ev.t === "open") anchor = row.seq;
  });
  return anchor;
}

/**
 * FT-1037: the ring as DATA — one compact seat per chair, in seat order.
 * Names capped so a 20-seat ring stays well under the store's BODY_MAX.
 */
export function boardRingOf(players) {
  return (players || []).map((player, i) => ({
    name: ((player && player.name) || `Seat ${i + 1}`).slice(0, 32),
    role: (player && player.role && player.role.id) || "",
    dead: !!(player && player.isDead),
    traveler: !!(player && player.role && player.role.team === "traveler"),
  }));
}

/**
 * FT-1037: a game's two portraits, decoded — { day1, end }, each the board
 * EVENT or null. The first day1 wins and the last end wins, so a duplicate
 * row (a re-recorded end) can never split the pair.
 */
export function boardsOf(rows, gameId) {
  const out = { day1: null, end: null };
  (rows || []).forEach((row) => {
    if (row.gameId !== gameId || row.kind !== "system") return;
    const ev = decodeEvent(row.body);
    if (!ev || ev.t !== "board" || !Array.isArray(ev.seats)) return;
    if (ev.moment === "day1" && !out.day1) out.day1 = ev;
    else if (ev.moment === "end") out.end = ev;
  });
  return out;
}

/** FT-1037: a game's winner from its own `end` row — for a game the log
 *  holds but the records API never got. */
export function winnerOf(rows, gameId) {
  let winner = null;
  (rows || []).forEach((row) => {
    if (row.gameId !== gameId || row.kind !== "system") return;
    const ev = decodeEvent(row.body);
    if (ev && ev.t === "end" && (ev.winner === "good" || ev.winner === "evil"))
      winner = ev.winner;
  });
  return winner;
}

/*
 * FT-1037: THE TOWN-SESSION STASH — is this connect a fresh OPENING, or the
 * same sitting resumed (a reload, a relay blip)? localStorage `golem.townOpen`
 * holds {townId: {at, seen}}. A host whose `seen` is within OPEN_STALE_MS is
 * resuming and writes no new open row; older (or absent) means the town was
 * shut and this connect opens it. socket.js bumps `seen` on a heartbeat while
 * hosting, so "recently seen" literally means "the town was recently open".
 */
const OPEN_KEY = "golem.townOpen";
const OPEN_STALE_MS = 45 * 60 * 1000;

function readOpenStash() {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function writeOpenStash(stash) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(stash));
  } catch (e) {
    // storage denied — the host just re-opens each visit, honestly
  }
}

/** Host connects: true = a FRESH opening (write the open row), false = the
 *  same sitting resumed. Stamps/bumps the stash either way. */
export function beginTownSession(townId) {
  if (!townId) return false;
  const stash = readOpenStash();
  const now = Date.now();
  const prior = stash[townId];
  const fresh = !prior || !prior.seen || now - prior.seen > OPEN_STALE_MS;
  stash[townId] = { at: fresh ? now : prior.at, seen: now };
  writeOpenStash(stash);
  return fresh;
}

/** The hosting heartbeat — keeps `seen` current while the town is open. */
export function touchTownSession(townId) {
  if (!townId) return;
  const stash = readOpenStash();
  if (!stash[townId]) return;
  stash[townId].seen = Date.now();
  writeOpenStash(stash);
}

/*
 * FT-1037: THE DAY-1 BOARD STASH — the ring captured as Day 1 breaks, held on
 * the host until game end posts it (see EVENTS's `board` note for why it is
 * not broadcast live). One entry only — a new game's capture replaces the
 * last game's orphan (an abandoned game leaves nothing behind). First write
 * wins per game, so a day counter scrubbed back to 1 cannot re-capture a
 * later board as "day 1".
 */
const DAY1_KEY = "golem.boardDay1";

export function stashDay1Board(gameId, seats) {
  if (!gameId || !Array.isArray(seats) || !seats.length) return;
  try {
    const prior = JSON.parse(localStorage.getItem(DAY1_KEY)) || {};
    if (prior.gameId === gameId) return; // first write wins
    localStorage.setItem(DAY1_KEY, JSON.stringify({ gameId, seats }));
  } catch (e) {
    // storage denied — the game just records with an end portrait only
  }
}

/** The stashed day-1 ring for a game, cleared on read, or null. */
export function takeDay1Board(gameId) {
  try {
    const stash = JSON.parse(localStorage.getItem(DAY1_KEY)) || {};
    if (stash.gameId !== gameId || !Array.isArray(stash.seats)) return null;
    localStorage.removeItem(DAY1_KEY);
    return stash.seats;
  } catch (e) {
    return null;
  }
}

export function dayOf(createdAt) {
  const at = Date.parse(createdAt);
  if (!Number.isFinite(at)) return "";
  const d = new Date(at);
  return (
    d.getDate() +
    " " +
    [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ][d.getMonth()]
  );
}
