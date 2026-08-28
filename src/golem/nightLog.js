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
// FT-1101: ...and the four the shared `tonightActionFor` below asks about a
// character — whether it wakes when dead, whether anyone designed its
// controls, how many of its choices are the PLAYER's own, and our own
// instruction line for it.
import {
  authoredNightFor,
  FIELD_TYPES,
  deadStillWakes,
  fieldsFor,
  playerSlots,
  lineFor,
} from "./nightInfo";

const LOG_KEY = "golem.nightLog";
// FT-1168: THE TWO CHECKLIST SETTINGS BELONG TO A TOWN, not to a browser.
//
// Both of these were STANDING settings — one value carried into every town you
// ever hosted. The build panel's new Game settings tab is defined as "this
// town's rules, remembered per user that hosts on it", and these two are the
// first rows in it, so they move onto the same per-town idiom the night LOG
// beside them has always used: one localStorage key holding a {town: value}
// map, written by the browser that is hosting. That browser IS the "per user"
// half of the rule — localStorage is not shared between people — and the town
// id is the "per town" half.
//
// The key names still say "night" rather than "town" because they are the
// night code's own stash; the map's KEYS are what changed, not the owner.
const MODE_KEY = "golem.nightMode";
// FT-874: "how hard the checklist is enforced when the night ends". The key
// name predates the setting going tri-state (it was a boolean, "Require
// checks"); the values it holds are CHECK_MODES below.
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

/**
 * A fresh town's setting.
 *
 * FT-1168 (user call: "Checklist settings: default this to everyone, warn, not
 * required"): WARN, where FT-874's boolean default was ON and this therefore
 * read `required`. It lands the default on the middle state this file's own
 * note above already calls "the honest default position of every stop-control
 * on this fork" — the list still means something, and ending a night early is
 * still a storyteller deciding to move their own table on rather than a button
 * refusing to work.
 */
export const DEFAULT_CHECK_MODE = "warn";

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
 * order names the characters in play. "Everyone" adds exactly one thing and
 * never widens the sheet.
 *
 * FT-1107 rider (user) narrowed that one thing further. It used to be "a
 * per-seat read of a player's OWN entries"; that read now happens in
 * "storyteller" mode too, because a player's own night is theirs whoever
 * typed it. What "everyone" adds is THE ASK — the night's prompt standing on
 * the clock face, and the player's own picks travelling back. Only "off"
 * withholds the rows, because in "off" there are none.
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
  // FT-1107 rider: "Only you see it" was true when the setting withheld the
  // rows as well as the prompt, and became a lie the moment the two were
  // split. What "Storyteller" now means is that you do the asking.
  storyteller: "Only you are asked.",
  everyone: "Players read their own notes.",
};

/** The full explanation, on each option's tooltip. */
export const MODE_TITLES = {
  off: "No night sheet and no log.",
  // FT-1107 rider (user): "if it is set to storyteller only for night actions
  // the user doesn't see the action menu at night, but they still see the log
  // if the story teller fills it in." The setting governs THE ASK, not THE
  // RECORD — see socket.js sendNightRows for the two gates.
  storyteller:
    "You get the checklist. Players are not asked, but still read their own night.",
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
    // FT-1121: WHO SET THAT MARK — "" (nobody; it follows the truth oracle's
    // own verdict, golem/nightTruth) or "storyteller" (a hand on the mask,
    // and from then on the hand wins). The key exists here rather than being
    // added on first click for the reason stated at the top of makeEntry:
    // Vue 2 cannot see keys added later. It is storyteller-only data and is
    // absent from projectPlayerRow's whitelist, exactly like isFalseInfo.
    lieBy: "",
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

/**
 * FT-1274: THE NIGHT SENTENCE, written once and said the same way to everyone.
 *
 * The template, stated (user call — this is the shape, verbatim):
 *
 *   [role icon] [Role name] chose [pick] and [pick] and was given [answer]
 *
 * Every clause is dropped when its part is empty, and the only connector is
 * "and" — there are no commas in this grammar, because the user's own
 * sentence has none and one connector is one thing to get wrong:
 *
 *   Fortune Teller chose Fake 3 and Fake 6 and was given YES
 *   Empath was given 1
 *   Undertaker chose Sara and was given Baron
 *   Ojo said “the Imp” and was given a Fool token
 *
 * THE ACTOR IS THE ROLE, NOT THE SEAT, and that one choice is what makes the
 * sentence reader-independent. Before FT-1274 the same event was two
 * different sentences: the storyteller read "Nadia (Fortune Teller) chose…"
 * and the player read "Fortune Teller / You chose…" from a second renderer
 * one room over. Naming the actor by the character it acted as removes the
 * only reader-dependent word there was — and it is unambiguous, because a
 * character is on exactly one seat in a game, and a player's own row is
 * theirs by definition. The seat's NAME survives on the row's hover, where
 * the storyteller (the only reader who holds it) can still read it.
 *
 * WHAT COMES BACK IS A TOKEN LIST, not a formatted string and not loose
 * parts. `tokens` IS the sentence: `text` is `tokens.map(w).join(" ")`, and
 * the renderer walks the same array and styles each token by its kind. One
 * array, so the words a reader SEES and the words the fallback line SAYS
 * cannot drift by construction — which is the whole property this pass was
 * asked to guarantee.
 *
 * Token kinds:
 *   role       the character that acted — wears its team's colour
 *   lead       a clause's verb ("chose", "said", "was given")
 *   name       a seat this action picked
 *   join       the connector, always "and"
 *   yes / no   the answer given — the two the user dressed by hand
 *   number     a numeric readout (an Empath's count, a Chef's number)
 *   character  a character shown (an Undertaker's, a Ravenkeeper's)
 *   said       the player's own words, quoted
 *   note       the storyteller's free-text answer
 *
 * Reads a FULL log entry (nested `told`) or an already-projected player row
 * (flat), the same either-shape contract projectPlayerRow has, because the
 * storyteller's copy and the player's copy of the same action are exactly
 * those two shapes — and both must come out as the same tokens.
 *
 * WHAT IS DELIBERATELY NOT HERE:
 *   · `isFalseInfo` — the storyteller's private judgement that what they said
 *     was a lie. It is not part of what HAPPENED, and it stays theirs even
 *     after the reveal makes everything else public.
 *   · `done` — walk-the-list bookkeeping, never information.
 * Neither can arrive on a player's copy at all (projectPlayerRow drops them);
 * dropping them here means the STORYTELLER's copy cannot leak them into a
 * published row either.
 *
 * @param own STOOD DOWN (FT-1274), not deleted — every caller still passes it
 *   and it no longer changes a single word. It used to swap the actor's name
 *   to "You" for the reader's own row, which is precisely the divergence this
 *   pass exists to remove. Kept in the signature so the two callers
 *   (ChroniclesDrawer's live blocks, App.vue's published ones) compile
 *   unchanged, and so the reason it went is written where the next reader of
 *   this function will look for it.
 */
// eslint-disable-next-line no-unused-vars
export function chronicleLineOf(entry, { own = false } = {}) {
  const told = entry.told || entry;
  const chose = (
    Array.isArray(entry.targetNames) ? entry.targetNames : []
  ).filter(Boolean);

  // The GIVEN clause's own parts, in the order a row records them. A row can
  // carry more than one (a Ravenkeeper shown a character with a note beside
  // it), so this is a list and never a single value.
  const given = [];
  if (told.ping === true) given.push({ k: "yes", w: "YES" });
  else if (told.ping === false) given.push({ k: "no", w: "no" });
  if (told.number !== null && told.number !== undefined && told.number !== "")
    given.push({ k: "number", w: String(told.number) });
  if (told.characterName) given.push({ k: "character", w: told.characterName });
  if (told.text) given.push({ k: "note", w: String(told.text) });

  const said = entry.playerText || "";

  // ── THE SENTENCE, ASSEMBLED ──────────────────────────────────────────────
  const tokens = [];
  const roleName = entry.roleName || "Someone";
  tokens.push({ k: "role", w: roleName });
  /** One clause: its verb, then its parts with "and" between them. */
  const clause = (lead, parts) => {
    if (!parts.length) return;
    // the connector BETWEEN clauses is the same "and" that stands between
    // parts — see the template note above
    if (tokens.length > 1) tokens.push({ k: "join", w: "and" });
    tokens.push({ k: "lead", w: lead });
    parts.forEach((part, i) => {
      if (i) tokens.push({ k: "join", w: "and" });
      tokens.push(part);
    });
  };
  clause(
    "chose",
    chose.map((name) => ({ k: "name", w: name })),
  );
  clause("said", said ? [{ k: "said", w: "“" + said + "”" }] : []);
  clause("was given", given);

  return {
    seat: entry.seat,
    // FT-1274: the seat's own name, for the HOVER and nothing else. Empty on
    // a player's copy by construction — projectPlayerRow does not carry
    // seatName — so a player's row cannot show one even if a surface asked.
    who: entry.seatName || "",
    // the character this row is about: its id drives the leading icon and the
    // team colour, its name is the sentence's subject
    roleId: entry.roleId || "",
    roleName: entry.roleName || "",
    chose,
    said,
    given,
    tokens,
    // the flat line — the EV1 envelope's required `text` for this action, the
    // hover fallback, and the thing a byte-comparison proof reads
    text: tokens.map((t) => t.w).join(" "),
  };
}

/**
 * FT-1101: A NIGHT'S ACTIONS AS ONE BLOCK PER NIGHT (user call: "maybe as a
 * single block of night actions" rather than a row per action).
 *
 * Rows with nothing in them yet are dropped — a night log entry is born the
 * moment the storyteller first touches the row, often with no content at all,
 * and a chronicle line saying a character acted and doing nothing else is
 * noise in a stream people read under time pressure.
 *
 * FT-1274: `own` is passed straight through to chronicleLineOf, where it is
 * now inert — see the stand-down note there. The CALLER's own use of it (which
 * set of entries to read: the storyteller's whole log, or one seat's projected
 * rows) is untouched and is the only thing it ever really decided.
 *
 * @returns [{ day, lines }] ascending by night.
 */
export function nightBlocksOf(entries, { own = false } = {}) {
  const byDay = new Map();
  (entries || []).forEach((entry) => {
    const line = chronicleLineOf(entry, { own });
    if (!line.chose.length && !line.given.length && !line.said) return;
    const day = entry.day || 0;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(line);
  });
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, lines]) => ({
      day,
      lines: lines.sort((a, b) => a.seat - b.seat),
    }));
}

/**
 * The one-sentence fallback every EV1 event must carry — what a surface that
 * has never heard of a night block still shows (see chronicles.js's envelope
 * note on why `text` is always present).
 */
export function nightBlockText(day, lines) {
  const n = (lines || []).length;
  return "Night " + day + " — " + n + (n === 1 ? " action." : " actions.");
}

/**
 * FT-1101: TONIGHT'S OWN ACTION FOR THIS SEAT, or null when there is none.
 *
 * Lifted out of ChroniclesNights (FT-1005's `tonight` computed) unchanged in
 * behaviour, because two surfaces now ask the same question: the nights view
 * that has always rendered the inputs, and the drawer's pinned call band that
 * makes the night impossible to miss. One definition, so the two can never
 * disagree about whether a player is being asked for something.
 *
 * FT-1107: BOTH OF THOSE ROOMS HAVE STOOD DOWN and the ask moved onto the
 * clock face, which is not one component — the hub words it (TownInfo) and
 * every seat can take the pick (Player). So this function is now called from
 * exactly one place, the `night/myCall` getter, and every surface reads that.
 * The rule is unchanged and one level higher: one definition, no disagreement.
 *
 * BELIEF IS CORRECT BY CONSTRUCTION: `me.role` on a player's client is only
 * ever the character they were TOLD they are (FT-1006 dealt the belief; the
 * truth never crossed the wire), so this IS "the night action for what they
 * believe they have". No Drunk handling.
 *
 * `live` is the HOST's sharing verdict (playerNight.live), never this
 * browser's own saved night mode — see FT-1101's gate note in
 * ChroniclesDrawer.
 */
export function tonightActionFor({ isNight, live, day, me }) {
  if (!isNight || !live) return null;
  const role = me && me.role && me.role.id ? me.role : null;
  if (!role) return null;
  const first = day <= 1;
  if (!(role[first ? "firstNight" : "otherNight"] > 0)) return null;
  if (me.isDead && !deadStillWakes(role, null)) return null;
  const { known } = fieldsFor(role.id);
  return {
    role,
    slots: playerSlots(role.id),
    // the same two texts the checklist row shows: our line where one is
    // written, the shipped reminder where none is
    line: lineFor(role.id, first) || reminderFor(role, first),
    // the universal fallback: a character nobody designed controls for states
    // their choice in words — never a picker whose slots would mean
    // something else
    freeText: !known,
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

/** One town's stored log, or null.
 *
 *  FT-1173: `staged` rides the same stash — the deaths the storyteller has
 *  queued for the night's end but not yet committed (see night.js's staged
 *  state). Stored beside the log because it has the same owner (the host),
 *  the same scope (one town) and the same lifetime question: the brief's
 *  rule is that an uncommitted stage PERSISTS until End night or explicit
 *  removal, and a stash that forgot it across a reload would silently apply
 *  nothing. A log written before this field existed reads as "nothing
 *  staged", never as a migration. */
export function loadLog(sessionId) {
  if (!sessionId) return null;
  const stash = readStash();
  const log = stash[sessionId];
  if (!log || !Array.isArray(log.entries)) return null;
  return {
    day: log.day || 0,
    entries: log.entries,
    staged: Array.isArray(log.staged) ? log.staged : [],
  };
}

/** Stash one town's log (and its staged, uncommitted deaths — FT-1173). */
export function saveLog(sessionId, day, entries, staged) {
  if (!sessionId) return;
  const stash = readStash();
  stash[sessionId] = { day, entries, staged: staged || [] };
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(stash));
  } catch (e) {
    // a full quota costs the log, never the game
  }
}

/**
 * FT-1168: one town's stored value out of a {town: value} map.
 *
 * THE EMPTY TOWN ID IS A REAL KEY HERE, unlike in loadLog/saveLog above. A
 * grimoire run in person has no town and still has a night checklist, so ""
 * gets its own slot rather than being refused — otherwise the one setup that
 * cannot sync anything would also be the one that cannot remember anything.
 */
function readSettingMap(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    return raw && typeof raw === "object" ? raw : {};
  } catch (e) {
    return {};
  }
}

function writeSetting(key, townId, value) {
  const map = readSettingMap(key);
  map[townId || ""] = value;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch (e) {
    // a full quota costs the setting, never the game
  }
}

/** This town's saved visibility mode, or null if it has never been set —
 *  the store's own DEFAULT_MODE applies in that case. */
export function loadMode(townId) {
  const m = readSettingMap(MODE_KEY)[townId || ""];
  return MODES.includes(m) ? m : null;
}

export function saveMode(townId, mode) {
  if (MODES.includes(mode)) writeSetting(MODE_KEY, townId, mode);
}

/**
 * This town's saved enforcement setting, or null if never set — the store's
 * own default applies in that case, same idiom as loadMode().
 *
 * A stored "1" / "0" is FT-874's BOOLEAN, written before this went tri-state.
 * It is read across rather than migrated (we are in dev; there is no stored
 * value anywhere that is owed a migration): the old ON blocked, so it reads
 * as `required`, and the old OFF asked nothing, so it reads as `off`. The
 * warn state simply had no boolean to come from.
 */
export function loadRequireChecks(townId) {
  const v = readSettingMap(REQUIRE_CHECKS_KEY)[townId || ""];
  if (v === undefined || v === null) return null;
  if (v === "1") return "required";
  if (v === "0") return "off";
  return CHECK_MODES.includes(v) ? v : null;
}

export function saveRequireChecks(townId, checkMode) {
  if (CHECK_MODES.includes(checkMode))
    writeSetting(REQUIRE_CHECKS_KEY, townId, checkMode);
}
