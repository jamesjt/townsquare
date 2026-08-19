/**
 * Golem fork (FT-860): the STORYTELLER'S NIGHT LOG — pure helpers.
 *
 * Three jobs, none of them Vue:
 *
 *   1. TARGET COUNT. How many players a night row records. Derived from the
 *      role's own night reminder text wherever the sentence says it ("points
 *      to two players", "Point to the 2 players marked KNOW"), with a small
 *      explicit table for the handful the prose cannot express. There is no
 *      second source of night ORDER here — that stays firstNight/otherNight
 *      and the players/nightOrder getter.
 *
 *   2. THE ENTRY SHAPE. One flat record per acting seat per night, built so
 *      two future consumers can read it without a migration: the end-game
 *      record we already POST (golem/stats) and a post-game replay. The
 *      cardinal rule is that an entry records WHAT WAS TOLD, not what was
 *      true — a poisoned Fortune Teller is told "no" when the answer is
 *      "yes", and a log holding only the truth cannot explain the game
 *      afterwards. `told` is therefore the delivered information and
 *      `isFalseInfo` marks it as a lie; the truth is recoverable from the
 *      pair, never overwritten by it.
 *
 *   3. PERSISTENCE. The log is stashed per session id, the same idiom
 *      golem/stats uses for the deal moment: one localStorage key holding a
 *      map of session → log, so re-hosting a town gets its own log back and
 *      a different town never sees it.
 */

const LOG_KEY = "golem.nightLog";
const MODE_KEY = "golem.nightMode";

/** The three visibility states of the night sheet, in toggle order. */
export const MODES = ["off", "storyteller", "everyone"];

/**
 * A fresh town's setting (user call 2026-08-18: "Default to everyone").
 *
 * Note what "everyone" does and does not open up. The CHECKLIST — the ordered
 * list of who acts tonight — is storyteller information in every mode: the
 * order names the characters in play. "Everyone" adds exactly one thing, a
 * per-seat read of a player's OWN entries. It never widens the sheet.
 */
export const DEFAULT_MODE = "everyone";

export const MODE_LABELS = {
  off: "Off",
  storyteller: "Storyteller",
  everyone: "Everyone"
};

/**
 * The one line under the switch. Kept SHORT on purpose: the build panel has
 * no width of its own — it is shrink-to-fit around its widest row — so a
 * sentence here does not wrap, it stretches the whole panel (measured: a full
 * sentence took the panel from 370px to 1001px). The long form rides the
 * buttons' tooltips instead.
 */
export const MODE_HINTS = {
  off: "No sheet, no log.",
  storyteller: "Only you see it.",
  everyone: "Players read their own notes."
};

/** The full explanation, on each option's tooltip. */
export const MODE_TITLES = {
  off: "No night sheet and no log.",
  storyteller:
    "You get the checklist. Players see nothing of it at all.",
  everyone:
    "You still own the checklist — a player can read their OWN night notes, and nothing of any other seat."
};

/** Words a night reminder uses to count players. */
const COUNT_WORDS = {
  a: 1,
  an: 1,
  any: 1,
  the: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4
};

/**
 * Roles whose reminder prose cannot express the count, with the reason. Every
 * one of these was read by hand against the role's text (2026-08-18):
 *
 *   eviltwin   — "Point to the Evil Twin… Point to the twin." Two pointings
 *                that are one mutual reveal, not a choice; nothing to log per
 *                target, so the row is a note row.
 *   lunatic    — the text is a whole scripted performance ("Show 3 character
 *                tokens of arbitrary good characters…"); the players involved
 *                vary with the count and cannot be read off the sentence.
 *   hatter     — "wake the Minions & Demons. Each may choose a new character"
 *                — a set of choices by a set of players, of CHARACTERS.
 *   shugenja   — "Point clockwise or anticlockwise": a direction, not a seat.
 *   ojo        — "chooses a character", not a player.
 *   courtier   — "points to a character on the sheet", not a player.
 *   philosopher— "points to a good character on their sheet", not a player.
 *   engineer   — "points to a Demon or points to the relevant number of
 *                Minions" — characters again, and a variable number.
 *
 * A 0 here does NOT mean "nothing happened": the row still gets its told /
 * false-info controls and its note, which is where these belong.
 */
export const HARD_TARGETS = {
  eviltwin: 0,
  lunatic: 0,
  hatter: 0,
  shugenja: 0,
  ojo: 0,
  courtier: 0,
  philosopher: 0,
  engineer: 0
};

/** Ceiling on derived targets — no night row needs more slots than this. */
const MAX_TARGETS = 3;

/**
 * Read a target count out of one night-reminder sentence.
 * Matches every "points to / points at / chooses … player(s)" clause and
 * takes the largest count named in it, so "the 2 players marked KNOW" reads
 * as 2 while "the player marked KNOW" reads as 1.
 */
export function countFromReminder(text) {
  if (!text) return 0;
  const s = String(text)
    .toLowerCase()
    .replace(/[‘’]/g, "'");
  const re = /(?:points?\s+(?:to|at)|pointing\s+(?:to|at)|chooses?|choose)\s+((?:[a-z0-9']+\s+){0,4}?)players?\b/g;
  let best = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    const words = m[1].trim().split(/\s+/).filter(Boolean);
    let n = 1;
    words.forEach(w => {
      const known =
        COUNT_WORDS[w] !== undefined
          ? COUNT_WORDS[w]
          : /^\d+$/.test(w)
          ? parseInt(w, 10)
          : 0;
      if (known > n) n = known;
    });
    if (n > best) best = n;
  }
  return Math.min(best, MAX_TARGETS);
}

/**
 * How many player slots this role's row shows tonight.
 * @param role  a role object off a seated player
 * @param isFirstNight  which reminder text applies
 */
export function targetCount(role, isFirstNight) {
  if (!role || !role.id) return 0;
  if (HARD_TARGETS[role.id] !== undefined) return HARD_TARGETS[role.id];
  const text = isFirstNight ? role.firstNightReminder : role.otherNightReminder;
  return countFromReminder(text);
}

/** The reminder line a row shows tonight. */
export function reminderFor(role, isFirstNight) {
  if (!role) return "";
  return (
    (isFirstNight ? role.firstNightReminder : role.otherNightReminder) || ""
  );
}

/**
 * The stable id of one night row: which night, which chair, which character.
 * Seat index is part of it because the log is a record of the TABLE, and a
 * seat that swaps mid-night starts a new row rather than silently rewriting
 * the old one.
 */
export function entryId(day, seat, roleId) {
  return `d${day}:s${seat}:${roleId || "none"}`;
}

/**
 * A fresh log entry. Every key exists from the start — Vue 2 cannot see keys
 * added later, and a flat, fully-populated record is also what makes this
 * safe to POST or replay without a shape check.
 */
export function makeEntry({
  day,
  seat,
  seatName,
  playerId,
  roleId,
  roleName,
  order,
  slots
}) {
  return {
    id: entryId(day, seat, roleId),
    // WHEN
    day,
    phase: "night",
    order,
    // WHO acted
    seat,
    seatName: seatName || "",
    // the claim on that chair at the time, so a per-seat read can be scoped
    // to a person and not just to an index
    playerId: playerId || "",
    roleId: roleId || "",
    roleName: roleName || "",
    // WHAT THEY DID — seat indexes, and the names those seats wore tonight
    // (seats move; a replay needs the name it was told)
    targets: new Array(slots).fill(-1),
    targetNames: new Array(slots).fill(""),
    // WHAT THEY WERE TOLD — the delivered information, never the truth.
    // ping: null = nothing signalled, true/false = the yes/no given.
    told: { ping: null, text: "" },
    // the storyteller's mark that the delivered information was FALSE
    // (drunk, poisoned, a Recluse read). With `told` this recovers the truth.
    isFalseInfo: false,
    // the storyteller's walk-the-list checkmark
    done: false,
    // last write, so a replay can order rows inside one night
    at: new Date().toISOString()
  };
}

/** The whole stash — a plain {sessionId: {day, entries}} map, safely parsed. */
function readStash() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY)) || {};
  } catch (e) {
    return {};
  }
}

/** One town's stored log, or null. */
export function loadLog(sessionId) {
  if (!sessionId) return null;
  const stash = readStash();
  const log = stash[sessionId];
  if (!log || !Array.isArray(log.entries)) return null;
  return { day: log.day || 0, entries: log.entries };
}

/** Stash one town's log. */
export function saveLog(sessionId, day, entries) {
  if (!sessionId) return;
  const stash = readStash();
  stash[sessionId] = { day, entries };
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(stash));
  } catch (e) {
    // a full quota costs the log, never the game
  }
}

/** The saved visibility mode (a town setting that outlives one session). */
export function loadMode() {
  const m = localStorage.getItem(MODE_KEY);
  return MODES.includes(m) ? m : null;
}

export function saveMode(mode) {
  if (MODES.includes(mode)) localStorage.setItem(MODE_KEY, mode);
}
