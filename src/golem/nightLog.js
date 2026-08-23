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

// FT-1040: a FORGED role's composed action names its player slots outright —
// its count comes from the registered schema entry, never from reminder prose
// (a forged role has none to parse).
import { authoredNightFor, FIELD_TYPES } from "./nightInfo";

const LOG_KEY = "golem.nightLog";
const MODE_KEY = "golem.nightMode";
// FT-874: "how hard the checklist is enforced when the night ends" — a
// standing setting like MODE_KEY above, not per-town log data. The key name
// predates the setting going tri-state (it was a boolean, "Require checks");
// the values it holds are CHECK_MODES below.
const REQUIRE_CHECKS_KEY = "golem.nightRequireChecks";

/** The three visibility states of the night sheet, in toggle order. */
export const MODES = ["off", "storyteller", "everyone"];

/**
 * FT-874 → tri-state (2026-08-19, user call): HOW HARD THE CHECKLIST IS
 * ENFORCED when the storyteller presses "End night". In cycle order.
 *
 *   off       Nothing is asked. The night ends in silence.
 *   warn      The night ENDS — and the sheet says what was left unticked.
 *             This is the state the old boolean was missing: a storyteller
 *             who wants the list to mean something without a button that
 *             refuses to work.
 *   required  Ending the night is blocked until every row is ticked. The
 *             old `true`.
 *
 * The middle state is the honest default position of every stop-control on
 * this fork — warn rather than enforce, and enforce only where the thing is
 * genuinely impossible. Ending a night early is never impossible: it is a
 * storyteller deciding to move their own table on.
 */
export const CHECK_MODES = ["off", "warn", "required"];

/** A fresh town's setting. Unchanged from FT-874's boolean default (ON): a
 *  checklist nobody is asked to finish has no teeth. */
export const DEFAULT_CHECK_MODE = "required";

/**
 * The chip's own word, which is the ONLY thing that says which state this is
 * — it replaced a labelled checkbox on its own line. "Optional" rather than
 * "Off" on purpose: the mode switch sitting immediately to its left already
 * has an "Off" in it, and two Offs on one row read as one setting said twice.
 */
export const CHECK_LABELS = {
  off: "Optional",
  warn: "Warn",
  required: "Required",
};

/** The full explanation, on each option's tooltip.
 *
 *  FT-1087: the trailing "Click for Warn." / "Click for Required." /
 *  "Click for Optional." sentences came off. They described the ORIGINAL
 *  control — a single chip that cycled the three states on repeated clicks
 *  — and had already been wrong for the FT-959 segment, where every state
 *  was one press away. On a select they would be actively misleading: what
 *  a click does now is open the list. Nothing else in these strings moved. */
export const CHECK_TITLES = {
  off: "Ticking the rows is optional — the night ends without comment.",
  warn: "The night still ends with rows unticked, and the sheet says how many.",
  required: "Ending the night is blocked until every row is ticked.",
};

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
  everyone: "Everyone",
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
  everyone: "Players read their own notes.",
};

/** The full explanation, on each option's tooltip. */
export const MODE_TITLES = {
  off: "No night sheet and no log.",
  storyteller: "You get the checklist. Players see nothing of it at all.",
  everyone:
    "You still own the checklist — a player can read their OWN night notes, and nothing of any other seat.",
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
  four: 4,
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
  engineer: 0,
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
  const s = String(text).toLowerCase().replace(/[‘’]/g, "'");
  const re =
    /(?:points?\s+(?:to|at)|pointing\s+(?:to|at)|chooses?|choose)\s+((?:[a-z0-9']+\s+){0,4}?)players?\b/g;
  let best = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    const words = m[1].trim().split(/\s+/).filter(Boolean);
    let n = 1;
    words.forEach((w) => {
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
  // FT-1040: a forged character's composed action states its count — one
  // SeatPicker per PLAYER field, whoever fills it (the checklist rule).
  const authored = authoredNightFor(role.id);
  if (authored) {
    return Math.min(
      authored.fields.filter((f) => f.type === FIELD_TYPES.PLAYER).length,
      MAX_TARGETS,
    );
  }
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
  trueRoleId,
  trueRoleName,
  shownRoleId,
  shownRoleName,
  isPerformance,
  order,
  slots,
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
    // FT-861: THE TWO CHARACTERS OF A SEAT, both stamped on every row so a
    // finished game can be read back without the grimoire that produced it.
    //   trueRole  — what the seat WAS. What resolved.
    //   shownRole — what its player was TOLD they were. Equal to the truth on
    //               nearly every row; different on a Drunk, a Lunatic, a
    //               Marionette.
    // `roleId` above stays the character THIS ROW is about, which is the shown
    // one on a performance and the true one otherwise — so a per-seat read can
    // be scoped by comparing it to shownRoleId and never has to know why.
    trueRoleId: trueRoleId || "",
    trueRoleName: trueRoleName || "",
    shownRoleId: shownRoleId || "",
    shownRoleName: shownRoleName || "",
    // this row is the storyteller PERFORMING a character the seat only thinks
    // it has — the wake happened, the effect did not
    isPerformance: !!isPerformance,
    // WHAT THEY DID — seat indexes, and the names those seats wore tonight
    // (seats move; a replay needs the name it was told)
    targets: new Array(slots).fill(-1),
    targetNames: new Array(slots).fill(""),
    // FT-1005: WHO FILLED EACH SLOT — "" (the storyteller, or nothing yet) or
    // "player" (the seat's own player picked it themselves, arriving over the
    // wire). The checklist reads this to mark a player's own pick apart from
    // the storyteller's record of it, and the merge rule reads it to keep a
    // storyteller-entered value from being silently overwritten by a later
    // player frame. A storyteller editing a slot clears its mark.
    targetsBy: new Array(slots).fill(""),
    // FT-1005: the player's OWN words — the universal fallback where their
    // choice has no designed control (a character picked from the sheet, a
    // custom script's own character). Written only from a player frame; the
    // storyteller's own free note stays told.text, so the two never collide.
    playerText: "",
    // WHAT THEY WERE TOLD — the delivered information, never the truth.
    // FT-862: golem/nightInfo's field table decides which of these a row
    // actually uses; every key exists on every entry regardless (Vue 2's
    // reactivity rule again), so a row switching what it records — a script
    // edit that reclassifies a custom character — never needs a shape
    // migration.
    //   ping           null = nothing signalled, true/false = the yes/no given
    //   number         a numeric readout (a finger/hand-signal count), or null
    //   characterId/Name  a character shown (cached name for a role that's
    //                  later renamed or leaves the script)
    //   text           free-form — the universal fallback, and also "the
    //                  exact words" a supplementary note captures elsewhere
    told: {
      ping: null,
      number: null,
      characterId: "",
      characterName: "",
      text: "",
    },
    // the storyteller's mark that the delivered information was FALSE
    // (drunk, poisoned, a Recluse read). With `told` this recovers the truth.
    isFalseInfo: false,
    // the storyteller's walk-the-list checkmark
    done: false,
    // last write, so a replay can order rows inside one night
    at: new Date().toISOString(),
  };
}

/**
 * FT-1005: ONE ROW, PROJECTED TO WHAT ITS OWN PLAYER MAY KNOW.
 *
 * This is the wire shape of a player's night row AND the sanctioned shape of
 * their client state — the same projection night/myEntries has always made,
 * now shared between the host's sender and the receiving client's mutation so
 * the two cannot drift. The rules it encodes:
 *
 *   · `isFalseInfo` (the storyteller's lie mark) and `done` (their walk-the-
 *     list state) DO NOT EXIST here — not false, ABSENT. The receiving
 *     mutation re-projects through this same function, so even a malformed or
 *     hostile frame cannot seed the key into a player's store.
 *   · `trueRole*` / `shownRole*` are absent for the same reason: a readable
 *     row is by definition about the character the player was told they have,
 *     and the pair would name the deception.
 *   · `told` is flattened to the delivered values (never the truth of them);
 *     characterId stays behind — the player gets the NAME they were shown.
 *
 * Accepts either a full log entry (nested `told`) or an already-projected
 * row (flat), so the client-side re-projection is the identity on honest
 * frames.
 */
export function projectPlayerRow(e) {
  const told = e.told || e;
  return {
    id: e.id,
    day: e.day,
    phase: e.phase,
    seat: e.seat,
    roleId: e.roleId || "",
    roleName: e.roleName || "",
    targets: Array.isArray(e.targets) ? e.targets.slice() : [],
    targetNames: (Array.isArray(e.targetNames) ? e.targetNames : []).filter(
      Boolean,
    ),
    ping: told.ping === true || told.ping === false ? told.ping : null,
    number:
      told.number === null || told.number === undefined ? null : told.number,
    characterName: told.characterName || "",
    text: told.text || "",
    playerText: e.playerText || "",
  };
}

/**
 * FT-1005: every row ONE player may read, projected — the host-side builder
 * of the "night" frame. The row filters are exactly night/myEntries':
 *   · rows logged against the seat this player holds (durable playerId first,
 *     seat index only for rows predating a claim);
 *   · never a truth row about a believing seat (shownRoleId === roleId).
 */
export function projectEntriesFor(entries, playerId, seat) {
  return (entries || [])
    .filter((e) => {
      if (e.playerId && playerId) return e.playerId === playerId;
      return seat >= 0 && e.seat === seat;
    })
    .filter((e) => !e.shownRoleId || e.shownRoleId === e.roleId)
    .map(projectPlayerRow);
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

/**
 * The saved enforcement setting, or null if never set — the store's own
 * default applies in that case, same idiom as loadMode().
 *
 * A stored "1" / "0" is FT-874's BOOLEAN, written before this went tri-state.
 * It is read across rather than migrated (we are in dev; there is no stored
 * value anywhere that is owed a migration): the old ON blocked, so it reads
 * as `required`, and the old OFF asked nothing, so it reads as `off`. The
 * warn state simply had no boolean to come from.
 */
export function loadRequireChecks() {
  const v = localStorage.getItem(REQUIRE_CHECKS_KEY);
  if (v === null) return null;
  if (v === "1") return "required";
  if (v === "0") return "off";
  return CHECK_MODES.includes(v) ? v : null;
}

export function saveRequireChecks(checkMode) {
  if (CHECK_MODES.includes(checkMode))
    localStorage.setItem(REQUIRE_CHECKS_KEY, checkMode);
}
