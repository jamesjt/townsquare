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
 *               votes: number, majority: number, carried: bool }
 *   execution   a seat marked for execution; detail: { name, seat }.
 *               "Marked", not "died" — the storyteller decides what a
 *               majority means, and the record must not invent an outcome
 *               (the same honesty rule golem/chronicle.js stated).
 */
export const EVENTS = [
  "start",
  "end",
  "phase",
  "death",
  "revive",
  "nomination",
  "execution",
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
const GALLOWS_T = new Set(["nomination", "execution"]);

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
