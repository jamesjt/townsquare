/**
 * Golem fork (FT-886): THE CHRONICLE — this game's timeline, assembled.
 *
 * The app already has a door onto PAST games (the hourglass → StatsOverlay).
 * It had none onto the game being played right now: what happened tonight is
 * in the night log, who was put up is in the vote history, who is dead is on
 * the seats themselves, and which night it is lives in two more places again.
 * This file is the join.
 *
 * IT OWNS NO STATE. Every event here already exists somewhere else; this
 * normalises the sources into one shape, orders them, and cuts them into
 * chapters. Nothing is recorded, nothing is synced, nothing is persisted —
 * which is also why nothing here can disagree with the sources it reads.
 *
 * ── THE EVENT CONTRACT ────────────────────────────────────────────────────
 * Every source is normalised to:
 *
 *   { id, kind, at, day, phase, ...payload }
 *
 *   id     unique and stable across rebuilds (it is a Vue :key)
 *   kind   which source it came from — KIND below
 *   at     ms since epoch, or NULL when the source does not record a time
 *   day    the day/night number, or NULL when it cannot be known
 *   phase  "night" | "day", or NULL with an unknown day
 *
 * `at` and `day` are allowed to be null ON PURPOSE. Two of the four sources
 * genuinely do not record when they happened, and a chronicle that made a
 * number up would be worse than one that says it does not know.
 *
 * A CHAT MESSAGE IS ANOTHER SOURCE. It arrives with a real clock time and —
 * being live — a real day and phase, so it needs none of the derivation
 * below: it is pushed into the same array, sorts by the same `at`, and lands
 * in a chapter by the same rule. KIND.MESSAGE is reserved for it here so the
 * shape is on the record; nothing in this pass emits one.
 *
 * ── PRIVACY IS NOT DECIDED HERE ───────────────────────────────────────────
 * This module never asks who is looking. It is handed the night rows the
 * VIEWER may read — the night/visibleEntries getter, which returns the whole
 * log to a storyteller, nothing at all to a player in "storyteller" mode, and
 * a player's OWN rows, field-projected, in "everyone" mode — and it can only
 * assemble what it was given. A secret a player must not have is absent from
 * the input, so it is absent from the output, so it is absent from the DOM.
 * That is the same rule the night module states for itself, and this file is
 * downstream of it rather than a second copy of it.
 *
 * The one privacy decision that IS made here: `deadRoll` carries names and
 * seat numbers only, never a role. A shroud is public at the table; the
 * character under it is not.
 */

/** Which source an event came from. */
export const KIND = {
  NIGHT: "night",
  NOMINATION: "nomination",
  // Reserved: chat lands here without changing anything above it. See the
  // header — a message carries its own time, day and phase already.
  MESSAGE: "message",
};

/** The sort key of undated events that fall BEFORE the earliest anchor —
 *  below every real chapter, because that is where they happened. */
const UNDATED_ORDER = -1;
/** …and the sort key for undated events that could not be placed at all,
 *  which belong after everything rather than before it. See buildChronicle. */
const UNPLACED_ORDER = Number.MAX_SAFE_INTEGER;

/**
 * ms since epoch from whatever a source stored.
 * The night log writes ISO strings; the vote history stores a real `Date`
 * locally and an ISO string once it has been through the socket. Returns null
 * for anything unreadable, which is the same answer as "not recorded" and is
 * handled identically downstream.
 */
export function stamp(value) {
  if (value === null || value === undefined || value === "") return null;
  const t = value instanceof Date ? value : new Date(value);
  const ms = t.getTime();
  return isNaN(ms) ? null : ms;
}

/**
 * THE DAY BOUNDARIES, derived from the night log.
 *
 * This is the only join in the file that is not exact, and it is worth being
 * plain about why. A night-log row records WHICH night it belongs to; a vote
 * record does not record a day at all — it has a wall-clock timestamp and
 * nothing else. So the two are joined on the clock: night N's earliest write
 * is a time that day N had not started yet, and every nomination after it
 * (and before night N+1's) belongs to day N.
 *
 * Returns [{ day, at }] ordered by DAY.
 *
 * Two known limits, both stated on the surface rather than papered over:
 *   · A night with no logged rows leaves no anchor, so the day after it folds
 *     into the previous chapter.
 *   · `at` is the row's LAST write, not its first (patchEntry restamps it), so
 *     editing an old night days later moves that night's anchor forward.
 * Neither can leak anything; both can only file a nomination in the wrong
 * chapter. The fix for both is a day stamped on the vote record at the moment
 * it is made — see the report; it needs the socket, which this pass does not
 * touch.
 */
export function nightAnchors(entries) {
  const earliest = new Map();
  (entries || []).forEach((e) => {
    const at = stamp(e && e.at);
    if (at === null || !e || typeof e.day !== "number") return;
    const known = earliest.get(e.day);
    if (known === undefined || at < known) earliest.set(e.day, at);
  });
  return [...earliest.entries()]
    .map(([day, at]) => ({ day, at }))
    .sort((a, b) => a.day - b.day);
}

/**
 * Which chapter a bare clock time falls in.
 * The largest day whose night had already been written when this happened —
 * so a nomination lands on the day that FOLLOWS that night, which is what a
 * nomination is. Unknown when there are no anchors, or when it predates all
 * of them.
 */
export function placeByClock(anchors, at) {
  if (at === null || !anchors || !anchors.length)
    return { day: null, phase: null };
  let found = null;
  anchors.forEach((a) => {
    if (a.at <= at && (found === null || a.day > found)) found = a.day;
  });
  if (found === null) return { day: null, phase: null };
  return { day: found, phase: "day" };
}

/**
 * What a seat was told, from either shape of night row.
 *
 * A storyteller reads raw entries, which nest this under `told`. A player
 * reads night/myEntries, which projects the same four values FLAT and drops
 * everything else — no `told` wrapper, no `isFalseInfo`, no `done`, no
 * character ids. Both shapes are read here so the view has one to render, and
 * neither shape is ever widened: a key that is not in the input does not
 * appear in the output.
 */
function tellOf(e) {
  const told = e.told || e;
  const number = told.number;
  return {
    ping: told.ping === true || told.ping === false ? told.ping : null,
    number: typeof number === "number" ? number : null,
    characterName: told.characterName || "",
    text: told.text || "",
  };
}

/** Does this row say anything at all beyond "they woke"? */
function hasTell(t) {
  return t.ping !== null || t.number !== null || !!t.characterName || !!t.text;
}

/** One night-log row → one event. */
function nightEvent(e, index) {
  const told = tellOf(e);
  const event = {
    id: "night:" + (e.id || index),
    kind: KIND.NIGHT,
    // null for a player: night/myEntries deliberately does not project `at`.
    // Costs nothing — those rows carry an exact `day`, so their chapter is
    // exact and only the order WITHIN one night falls back to `order`.
    at: stamp(e.at),
    day: typeof e.day === "number" ? e.day : null,
    phase: "night",
    order: typeof e.order === "number" ? e.order : 0,
    seat: typeof e.seat === "number" ? e.seat : -1,
    // the chair's name, which only a storyteller's row carries (a player's own
    // row is about themselves and does not need to say whose it is)
    seatName: e.seatName || "",
    roleName: e.roleName || "",
    // The role's ID, and with it the hover card, is a STORYTELLER-ONLY field:
    // night/myEntries projects the name a player was shown and never an id to
    // cross-reference with. So a player's rows name their character in plain
    // text and the card is simply absent, rather than present-and-suppressed.
    roleId: e.roleId || "",
    targetNames: (e.targetNames || []).filter(Boolean),
    told,
    hasTold: hasTell(told),
  };
  // THE STORYTELLER'S OWN MARKS, copied only where the input actually has
  // them. A player's projected row has neither key, so the event object it
  // produces has neither key, so there is nothing for the template to render
  // and nothing for a missing CSS rule to fail to hide.
  if (e.isFalseInfo === true) event.isFalseInfo = true;
  if (e.trueRoleName && e.trueRoleName !== e.roleName) {
    event.trueRoleName = e.trueRoleName;
  }
  if (e.isPerformance === true) event.isPerformance = true;
  return event;
}

/** One vote-history row → one event. */
function nominationEvent(v, index, anchors) {
  const at = stamp(v.timestamp);
  const placed = placeByClock(anchors, at);
  const votes = Array.isArray(v.votes) ? v.votes : [];
  const majority = typeof v.majority === "number" ? v.majority : 0;
  return {
    id: "vote:" + index,
    kind: KIND.NOMINATION,
    at,
    day: placed.day,
    phase: placed.phase,
    nominator: v.nominator || "",
    nominee: v.nominee || "",
    // "Execution" | "Exile" — the KIND of nomination, not its outcome.
    type: v.type || "",
    votes,
    majority,
    // What the record actually supports. It does NOT say the nominee died:
    // the storyteller decides that, ties happen, and a later nomination
    // supersedes an earlier one. Saying "executed" here would be inventing an
    // event the app never recorded — the same mistake as inventing a death
    // time. The dead roll below is the honest half of that answer.
    reachedMajority: majority > 0 && votes.length >= majority,
  };
}

/** Chapters sort by day, and a night comes before the day that follows it. */
function chapterOrder(day, phase) {
  return day * 2 + (phase === "night" ? 0 : 1);
}

/** Within one chapter: by the clock where both have one, else by night order,
 *  else stable in the order they were assembled. */
function withinChapter(a, b) {
  if (a.at !== null && b.at !== null && a.at !== b.at) return a.at - b.at;
  if (a.kind === KIND.NIGHT && b.kind === KIND.NIGHT) return a.order - b.order;
  // a night row before a nomination: the night comes first inside its own
  // chapter by construction, and this only matters when clocks are missing
  if (a.kind !== b.kind) return a.kind === KIND.NIGHT ? -1 : 1;
  return 0;
}

/**
 * WHO IS DEAD, right now.
 *
 * Not on the timeline, because the app does not record WHEN anybody died:
 * `isDead` is a boolean on the seat with no time and no phase beside it, and
 * nothing anywhere writes one. An execution is partly recoverable from the
 * vote history — but a nomination reaching majority is not a death, and
 * night kills leave no trace at all. So this is a roll, not an event, and the
 * surface says outright that the app has no time for it.
 *
 * Names and seat numbers only. A shroud is public at the table; the character
 * beneath it is exactly what a player must not learn here.
 */
export function deadRoll(players) {
  const roll = [];
  (players || []).forEach((p, seat) => {
    if (!p || !p.isDead) return;
    roll.push({
      seat,
      name: p.name || "Seat " + (seat + 1),
      // a used-up ghost vote is public too — the seat shows it
      isVoteless: !!p.isVoteless,
    });
  });
  return roll;
}

/**
 * Assemble the chronicle.
 *
 * @param entries      the night rows THIS VIEWER may read (night/visibleEntries)
 * @param voteHistory  session.voteHistory
 * @param players      players.players — for the dead roll only
 * @param day          night.day, the current counter
 * @param isNight      grimoire.isNight, the current phase
 * @returns { chapters, dead, count, chaptered }
 */
export function buildChronicle({
  entries = [],
  voteHistory = [],
  players = [],
  day = 0,
  isNight = false,
} = {}) {
  const anchors = nightAnchors(entries);
  const events = [];
  entries.forEach((e, i) => events.push(nightEvent(e, i)));
  voteHistory.forEach((v, i) => events.push(nominationEvent(v, i, anchors)));

  const byChapter = new Map();
  const put = (order, chapter, event) => {
    if (!byChapter.has(order)) byChapter.set(order, chapter);
    if (event) byChapter.get(order).events.push(event);
  };

  const undated = [];
  events.forEach((event) => {
    if (event.day === null || event.phase === null) {
      undated.push(event);
      return;
    }
    put(
      chapterOrder(event.day, event.phase),
      {
        key: event.phase + event.day,
        day: event.day,
        phase: event.phase,
        events: [],
      },
      event,
    );
  });

  // The chapter the game is standing in RIGHT NOW is always known — the day
  // counter and the phase are both live on every client, storyteller or not —
  // so the timeline always ends where the game actually is, even when nothing
  // has been recorded in it yet. Only emitted for an ANCHORED timeline: with
  // no boundaries there is nothing for a "now" to be the end OF, and a "Day 3"
  // header standing over a pile of undated events would be a claim about them.
  const chaptered = anchors.length > 0;
  if (chaptered && day > 0) {
    const nowPhase = isNight ? "night" : "day";
    const nowOrder = chapterOrder(day, nowPhase);
    put(nowOrder, { key: nowPhase + day, day, phase: nowPhase, events: [] });
    byChapter.get(nowOrder).isNow = true;
  }

  // ── WHERE THE UNDATED EVENTS GO ───────────────────────────────────────────
  // Two different things wear the same "no day" flag, and they belong at
  // opposite ends of the timeline:
  //
  //   BEFORE — there are anchors, and these fall before the earliest one. That
  //   is a real position: they happened before a night we can name. First.
  //
  //   UNPLACED — there are no anchors at all, so nothing can be placed. This
  //   is every player's case, because the night log does not cross the socket
  //   and their own rows carry a day but no clock time. Filing these FIRST put
  //   a player's nominations above their own Night 1, which is the one order
  //   we know to be wrong. They go LAST, under a heading that says why.
  if (undated.length) {
    const hasDated = byChapter.size > 0;
    const order = chaptered
      ? UNDATED_ORDER
      : hasDated
      ? UNPLACED_ORDER
      : UNDATED_ORDER;
    byChapter.set(order, {
      key: "undated",
      day: null,
      phase: null,
      unplaced: !chaptered && hasDated,
      events: undated,
    });
  }

  const chapters = [...byChapter.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, chapter]) => {
      chapter.events.sort(withinChapter);
      chapter.label = chapterLabel(chapter, anchors, chaptered);
      chapter.note = chapterNote(chapter, chaptered);
      return chapter;
    });

  return {
    chapters,
    dead: deadRoll(players),
    count: events.length,
    chaptered,
  };
}

/** The heading over a chapter. Precise about what is actually known. */
function chapterLabel(chapter, anchors, chaptered) {
  if (chapter.day !== null) {
    return (chapter.phase === "night" ? "Night " : "Day ") + chapter.day;
  }
  // Undated, but the timeline HAS boundaries: everything here predates the
  // first one, and the first one is a night we can name. "Before the first
  // night" only when that night really is night 1.
  if (chaptered) {
    const first = anchors[0].day;
    return first <= 1 ? "Before the first night" : "Before night " + first;
  }
  // Nothing could be placed, but dated chapters stand above this one — so the
  // heading has to say which of the two kinds of "unknown" this is.
  if (chapter.unplaced) return "Day not recorded";
  return "This game";
}

/** The one honest line under a heading that needs one. */
function chapterNote(chapter, chaptered) {
  if (chapter.day !== null || chaptered) return "";
  // No night log to draw boundaries from — which is every player's case, and
  // a storyteller's whenever the night sheet is off. Say so, rather than
  // printing a day number nothing supports.
  return "In the order they happened. Which day each fell on is not recorded.";
}
