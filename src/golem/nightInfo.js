/**
 * Golem fork (FT-862): THE NIGHT INFORMATION SCHEMA — one definition of what
 * a character's night action IS, shared by the checklist (which controls a
 * row renders) and, eventually, whoever authors a NEW character (what they
 * choose from). Same pattern as golem/belief.js and golem/glyphs.js: one
 * file, every surface reads it, nobody hand-lists character names at the
 * call site.
 *
 * SHAPE (2026-08-18, revised from an earlier "asks vs tells" draft on user
 * direction — this is the version meant to survive a later lift to the
 * framework as the general primitive for "information a game hands a
 * player"): a night action is ONE ORDERED LIST OF FIELDS, and each field
 * carries WHO FILLS IT.
 *
 *   { wakes: ["first","other"], fields: [ { type, by, ... } ] }
 *
 *   type   what domain the field's value comes from: PLAYER (the seats),
 *          CHARACTER (the current script), NUMBER (a range), BOOLEAN,
 *          ALIGNMENT, or TEXT (free-form, and the universal fallback).
 *   by     who fills it — FIELD_OWNERS.PLAYER (the seat's own player made a
 *          choice; the storyteller is recording it) or .STORYTELLER (the
 *          storyteller is setting information from nothing).
 *
 * The earlier draft treated "the player chooses" and "the storyteller
 * tells" as two separate tables and then needed a special case for every
 * character that does both (the Fortune Teller points to two players AND is
 * given a yes/no). Here that's just two PLAYER fields with by:"player"
 * followed by one BOOLEAN field with by:"storyteller" — same list, same
 * machinery, no special case.
 *
 * WAKING IS NOT A FIELD, on purpose, and NOT derived from ability text.
 * `wakes` names which nights a character's OWN row applies, but whether a
 * seat wakes AT ALL is still governed entirely by role.firstNight /
 * role.otherNight (already read by the night/roster getter) — an
 * ability-text rule would mark the Imp as not waking on night one, because
 * its ability text is "each night*" (no night-one KILL), when every Demon is
 * in fact woken on night one for the "these are your minions / bluffs"
 * reveal. That reveal is not this file's `imp` entry — see GROUP WAKES below.
 *
 * GROUP WAKES ARE STILL MISSING FROM THE CHECKLIST — named, not fixed, this
 * pass. NightOrderModal.vue already carries them as two synthetic entries
 * neither tied to a single seat: "Minion info" (first night, tells each
 * Minion who the Demon is and, with more than one Minion, who the others
 * are) and "Demon info & bluffs" (first night, tells the Demon its Minions
 * AND three good characters not in play). Both are told to a GROUP of seats
 * at once, which the night log's per-seat entryId(day, seat, roleId) cannot
 * key today — that is a roster-getter change, not a control choice. They are
 * entered below under GROUP_INFO purely as schema documentation (nothing
 * reads them yet) because they are the field list's best exercise: the
 * Demon's bluffs is the one place this pass needed a FILTER and a COUNT.
 */

/** The domain a field's value is drawn from. */
export const FIELD_TYPES = {
  PLAYER: "player", // a seat — SeatPicker
  CHARACTER: "character", // a character on the current script — CharacterPicker
  NUMBER: "number", // an integer in [min, max]
  BOOLEAN: "boolean", // yes / no
  ALIGNMENT: "alignment", // good / evil
  TEXT: "text", // free-form — also the universal fallback for an unknown type
  // FT-1003: the information IS the whole grimoire — the Spy's and the
  // Widow's night action is not a value the storyteller records but a view
  // they OPEN (and later close) on one seat's client. The night sheet
  // renders this field as the show/keep-shown control; the rows that get it
  // are exactly the rows whose entry carries this field, never a role-name
  // list at a call site.
  GRIMOIRE: "grimoire",
};

/** Who fills a field: a player's own choice, or the storyteller's own information. */
export const FIELD_OWNERS = {
  PLAYER: "player",
  STORYTELLER: "storyteller",
};

/**
 * A small, NAMED set of filters narrowing a field's domain. Kept short on
 * purpose — add one only when a real character needs it. This pass needed
 * exactly one: the Demon's bluffs are characters NOT currently in play.
 */
export const FIELD_FILTERS = {
  NOT_IN_PLAY: "notInPlay",
};

/**
 * Which field TYPES render a real control today (2026-08-18 scope cut, user-
 * directed). PLAYER fields are a special case, not a scope cut — see
 * `extraFields()` below for why they are never rendered from THIS table at
 * all. Of the rest, only ALIGNMENT has no control yet; it — and anything
 * this table has never heard of — degrades to TEXT via `renderableType()`.
 */
export const RENDERED_FIELD_TYPES = [
  FIELD_TYPES.PLAYER,
  FIELD_TYPES.CHARACTER,
  FIELD_TYPES.NUMBER,
  FIELD_TYPES.BOOLEAN,
  FIELD_TYPES.TEXT,
  FIELD_TYPES.GRIMOIRE,
];

/** A field's type, degraded to TEXT if nothing renders it yet. Never throws, never renders nothing. */
export function renderableType(type) {
  return RENDERED_FIELD_TYPES.includes(type) ? type : FIELD_TYPES.TEXT;
}

/**
 * Per-character entries, keyed by role id — the same id nightLog's
 * HARD_TARGETS and every icon lookup already use.
 *
 *   wakes       which nights this character's OWN row applies to — informational
 *               (the roster getter's role.firstNight/otherNight is still what
 *               decides whether tonight's row exists at all).
 *   fields      the ordered list described above.
 *   mayBeFalse  can the storyteller mark this row's answer a LIE (drunk,
 *               poisoned, a misread)? False when nothing is told back
 *               (every field is by:"player" with no storyteller field to
 *               corrupt) or when a reveal genuinely can't be corrupted
 *               (Scarlet Woman's "you are now the Demon" is a state
 *               transition, not information).
 *   label       FT-874: the ACTION being recorded, storyteller-voice, ending
 *               in a colon — "Kills:", "Poisons:", "Learns executed was:".
 *               Renders once, immediately before the row's first control (see
 *               NightSheet's `rowLabel`), so what's being recorded is STATED
 *               rather than left implied by the ability text. Present only on
 *               characters that actually record something; a character with
 *               `wakes: []` (nothing chosen, nothing learned) carries no
 *               `label` key at all, and an unlisted role falls through to no
 *               label the same way it falls through to a bare text box —
 *               never a guessed verb.
 *   line        FT-886: THE INSTRUCTION LINE — see the section below.
 *   received    FT-1330: THE RECEIVED-ACKNOWLEDGEMENT EFFECT PHRASE, for
 *               RECEIVE-ONLY rows (nightExchange() === RECORDS — the player
 *               chooses, nothing comes back). Once the storyteller ticks
 *               Received, the player's own night surface stops saying "the
 *               storyteller has answered" (nothing was answered) and instead
 *               names what happened: "Storyteller received your choice —
 *               <target name> is Poisoned." The phrase here is the predicate
 *               after the name — "is Poisoned", "is your target" — written in
 *               the second person to the acting player, present tense, no
 *               trailing period. Only meaningful on RECORDS rows; a TELLS row
 *               never reads it (its answer is the acknowledgement). A
 *               receive-only role without one falls back to the generic
 *               "Storyteller received your choice — <target name>." — a
 *               missing phrase is never a broken line. Read via receivedFor().
 *   wakesWhenDead
 *               FT-874 (2026-08-19): does a seat holding this character still
 *               belong on the checklist once it is DEAD? — see the section
 *               below.
 *
 * ── WAKING WHEN DEAD (`wakesWhenDead`) ───────────────────────────────────
 *
 * A dead seat does not wake, and listing it is noise on a surface a
 * storyteller scans under time pressure. So the roster getter drops dead
 * seats — EXCEPT that for a handful of characters, dying IS the trigger.
 * Excluding those wholesale deletes the row at exactly the moment it is
 * needed: the Ravenkeeper's own instruction line already read "Only if they
 * died tonight."
 *
 * So it is a property of the CHARACTER, kept here beside everything else this
 * file already knows about a character's night, and NOT a list of ids at the
 * call site. `wakesWhenDead: true` means "keep this row when the seat is
 * dead"; its absence means the ordinary rule.
 *
 * HOW THE ELEVEN WERE CHOSEN. Every character in roles.json carrying a night
 * order (114 of them) was read against one question: is the seat's OWN death
 * the trigger, or a precondition, of what happens at its slot? Eleven answer
 * yes:
 *
 *   ravenkeeper   "If you die at night, you are woken to choose a player."
 *   sage          "If the Demon kills you, you learn that it is 1 of 2."
 *   sweetheart    "When you die, 1 player is drunk from now on."
 *   barber        "If you died today or tonight, the Demon may swap 2."
 *   moonchild     "When you learn that you died, publicly choose 1 alive."
 *   farmer        "If you die at night, an alive good player becomes a Farmer."
 *   poppygrower   "If you die, they learn who each other are that night."
 *   banshee       "If the Demon kills you, all players learn this."
 *   plaguedoctor  "When you die, the Storyteller gains a Minion ability."
 *   hatter        "If you died today or tonight, the Minion & Demon players
 *                  may choose new characters to be."
 *   zombuul       the odd one out, and the one most easily missed: "The 1st
 *                 time you die, you live but register as dead." The app has
 *                 one death flag and a storyteller marks that first death on
 *                 the seat, so a Zombuul spends most of its game on the board
 *                 as a dead player that kills every night.
 *
 * DELIBERATELY NOT FLAGGED, where the wording invites it:
 *   grandmother   DIES when the Demon kills the grandchild — alive up to that
 *                 row, gone after it.
 *   gambler       dies from a wrong guess; must be alive to guess.
 *   fanggu        dies when its kill jumps to an Outsider; the character
 *                 continues at a DIFFERENT seat.
 *   acrobat / lleech / vizier  die under a condition; never act after.
 *   professor / bonecollector  act ON the dead, and must be alive to do it.
 *   scarletwoman  becomes the Demon when the Demon dies — alive throughout.
 *   spy           "even if dead" qualifies how they REGISTER, not the wake.
 *   pixie / bountyhunter  someone ELSE's death is the trigger.
 *
 * THE FALLBACK IS "does not wake when dead", and that is a real choice, and
 * the OPPOSITE of `fieldsFor()`'s. A custom script's own character is not in
 * this table, so it takes the ordinary rule. Keeping every unlisted dead seat
 * instead would reproduce on custom scripts exactly the noise this change
 * removes from the shipped ones — and the sweep above found 11 exceptions in
 * 114.
 *
 * ── DEAD_WAKE_ENABLERS: when ANOTHER character keeps a dead seat waking ───
 *
 * One rule in the shipped roles is not a property of the seat that wakes at
 * all. The Vigormortis's Minions "keep their ability" after it kills them —
 * so a dead Poisoner under a Vigormortis poisons somebody every remaining
 * night of the game, and dropping that row costs a wake per night for the
 * rest of the game. That is the exact failure this whole section exists to
 * prevent, so it is modelled rather than lost: see DEAD_WAKE_ENABLERS below.
 *
 * IT IS OVER-INCLUSIVE ON PURPOSE. Only the Minions the VIGORMORTIS killed
 * keep their ability, and the log does not know which of them it killed. So a
 * Vigormortis in play keeps every dead Minion on the list. A spurious row
 * costs a glance; a missing one costs a wake.
 *
 * WHAT IS NOT AN ENABLER, and the line is worth drawing here: the Bone
 * Collector also hands a dead player their ability back — but for ONE player,
 * for ONE night, chosen by the storyteller on the Bone Collector's own row
 * moments earlier. It is already in their hand. Making it an enabler would
 * put every dead seat back on every night's list for a one-night effect.
 *
 * ── THE INSTRUCTION LINE (`line`, FT-886) ────────────────────────────────
 *
 * The shipped reminder text is written for a table with physical tokens: it
 * says "points to a player", "show the character token", "show the 'You are'
 * card", "replace it with a spare Imp token". None of that exists on a
 * screen, where the storyteller has a seat picker and a character picker on
 * the row itself. `line` is OUR sentence for the same action — one line,
 * present tense, saying what the storyteller does HERE.
 *
 * What a line is for, in order:
 *   TRUE first. Every condition the official text carries is kept ("if a
 *     player was executed today", "if an Outsider died today") — the
 *     condition is the part a tired storyteller forgets, so it is the last
 *     thing compression may take. Where a rule would not survive the
 *     shortening, the character keeps the official text instead (see LEFT
 *     ALONE below).
 *   ONE LINE, AND THE LINE IS SHORT. Measured against the live sheet rather
 *     than guessed: since FT-882 made the sheet a disc inscribed in the clock
 *     face, the ability sentence shares row two WITH the controls, so its
 *     width is whatever the answer zone leaves — 249px on the tightest rows
 *     (a "Learns:" label beside a number scrub) and 383px on the loosest, at
 *     13.5px Roboto Condensed. 249px is about 45 characters. Every line below
 *     was measured against ITS OWN row's width and fits without an ellipsis;
 *     45 characters is the working budget for a new one. That ceiling is the
 *     hard constraint on this whole file — see the COMPRESSION COSTS note.
 *   SAYING WHAT THE LABEL CANNOT. The row already reads "Poisons: [seat]",
 *     so the line never repeats the verb or the character's own name — it
 *     carries the timing, the condition and the consequence.
 *
 * Shape: a STRING when both nights read the same, or `{ first, other }` when
 * the action genuinely differs between them — the Godfather learns the
 * Outsiders on night one and kills on later nights, and one sentence cannot
 * be true of both. Resolved by `lineFor()`.
 *
 * FALLBACK, and it is deliberate: a character with no line shows the official
 * reminder text exactly as before. Custom scripts carry characters nobody has
 * written for, and a missing line is never a broken row.
 *
 * LEFT ALONE ON PURPOSE: the Lunatic, whose reminder is not an instruction
 * but a whole scripted performance (arbitrary Minions, three bluff tokens,
 * waking the real Demon afterwards to show it what was marked). There is no
 * short sentence that is also true of it, and the long official one is the
 * better row.
 *
 * COMPRESSION COSTS — what the width actually took, recorded so nobody
 * re-derives it, and so the next person to widen this column knows exactly
 * what to put back. Each is a rule the official text carries and the line
 * does not. None changes what the row's controls record, and every one is
 * still quoted in full on the character's own token and in the night order
 * sheet. Ordered by what it would cost a storyteller to forget.
 *
 * WORTH RESTORING FIRST (a rule that changes what happens tonight):
 *   poisoner      that the PREVIOUS poisoning ends as this one begins. The
 *                 line is down to the new poisoning alone; at 162px — this
 *                 row's own width, a label and a seat picker sharing the
 *                 sentence's line — there was no room for the clause.
 *   scarletwoman  "(Travellers don't count)" toward the five alive.
 *   exorcist      the chosen Demon LEARNS who the Exorcist is. The line kept
 *                 the two facts that change tonight's play (not last night's
 *                 pick; the Demon does not act) and lost the reveal.
 *   imp           that YOU choose which Minion inherits it, not the Imp.
 *   monk          that the protection is for TONIGHT only.
 *   barber        that the Demon may not swap another Demon.
 *   sage          that one of the two players named IS the Demon.
 *
 * DELIBERATELY DROPPED (a standing or day rule, not tonight's action):
 *   spy           that they may register as good, and as a Townsfolk or an
 *                 Outsider.
 *   vortox        that evil wins on a day with no execution.
 *   pithag        that a Demon made this way makes tonight's deaths arbitrary.
 *   sailor        that the Sailor cannot die.
 *
 * NARROWED, NOT LOST (the line states the case that matters):
 *   professor     they may choose a dead player who ISN'T a Townsfolk, and
 *                 nothing happens; the line states the successful case.
 *   philosopher   the owner is only drunk if that character is IN PLAY.
 *   fanggu        "and there are no other Fang Gu in play" on the turn.
 *   vigormortis   the poisoned neighbour is specifically a TOWNSFOLK one.
 *   seamstress    the two chosen may not include the Seamstress.
 *   devilsadvocate their choice must be a LIVING player.
 *   cerenovus     "might be executed" became "or executed" — the line reads
 *                 a shade harder than the rule, which is the safe direction
 *                 for a storyteller's memory but is not the exact rule.
 *
 * COVERAGE (checked by hand against roles.json + the shipped reminder text,
 * 2026-08-18; lines added 2026-08-19): every Trouble Brewing character that
 * wakes at all, PLUS the handful of Bad Moon Rising / Sects & Violets
 * number-signal roles this fork already had reminder text for on hand
 * (Chambermaid, Clockmaker, Mathematician, Oracle, Juggler). An unlisted id
 * falls through to TEXT via fieldsFor()'s fallback, which is safe (a plain
 * text box, never a wrong yes/no) but under-specific. That fallback is
 * load-bearing: a custom script's own characters were never going to be in
 * this table at all.
 *
 * LINE-ONLY ENTRIES (FT-886). Writing a line for a character does NOT require
 * designing its controls: an entry with no `fields` KEY AT ALL is a line-only
 * entry, and `fieldsFor()` treats it exactly as it treats an unlisted role —
 * one free-text box, `mayBeFalse: true`, `known: false`, no label. That is
 * what every Bad Moon Rising / Sects & Violets character added below is: the
 * prose is written, the field design is not, and the row renders tonight
 * precisely as it rendered yesterday but with a sentence a storyteller can
 * act on. A later pass fills in `fields` without touching a word of the line.
 * (Note the distinction from `fields: []`, which is a real, deliberate answer
 * — "this character records nothing" — and is what the day-ability and
 * passive entries below carry.)
 */
export const NIGHT_INFO = {
  // ── Trouble Brewing — Townsfolk ──────────────────────────────────────────
  washerwoman: {
    wakes: ["first"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER },
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "A Townsfolk and two players — one is it.",
  },
  librarian: {
    wakes: ["first"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER },
    ],
    mayBeFalse: true,
    label: "Learns:",
    // the zero case is the whole reason this one differs from its neighbours
    line: "An Outsider and two players, or zero if none.",
  },
  investigator: {
    wakes: ["first"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER },
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "A Minion and two players — one is it.",
  },
  chef: {
    wakes: ["first"],
    fields: [
      {
        type: FIELD_TYPES.NUMBER,
        by: FIELD_OWNERS.STORYTELLER,
        min: 0,
        max: 7,
      },
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "How many pairs of evil players sit together.",
  },
  empath: {
    wakes: ["first", "other"],
    fields: [
      {
        type: FIELD_TYPES.NUMBER,
        by: FIELD_OWNERS.STORYTELLER,
        min: 0,
        max: 2,
      },
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "How many of their 2 live neighbours are evil.",
  },
  fortuneteller: {
    wakes: ["first", "other"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.BOOLEAN, by: FIELD_OWNERS.STORYTELLER },
    ],
    mayBeFalse: true,
    label: "Learns:",
    // the red herring is the rule this row exists to stop you forgetting
    // FT-1272 (user): their own wording — an ellipsis where the em dash
// was, and the pause reads as the storyteller's own hesitation.
    line: "Yes if either is the demon...or the red herring.",
  },
  undertaker: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }],
    mayBeFalse: true,
    label: "Learns executed was:",
    line: "Only if a player was executed today.",
  },
  monk: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER }],
    mayBeFalse: false,
    label: "Protects:",
    line: "Not themselves; Demon only.",
    received: "is protected tonight",
  },
  ravenkeeper: {
    wakes: ["other"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER },
    ],
    mayBeFalse: true,
    label: "Learns:",
    // the row exists ONLY for a dead seat — the line has said so all along
    wakesWhenDead: true,
    line: "Only if they died tonight. They choose.",
  },
  virgin: { wakes: [], fields: [], mayBeFalse: false }, // day ability — never reaches a night row
  slayer: { wakes: [], fields: [], mayBeFalse: false }, // day ability
  soldier: { wakes: [], fields: [], mayBeFalse: false }, // passive
  mayor: { wakes: [], fields: [], mayBeFalse: false }, // passive
  // ── Trouble Brewing — Outsiders ──────────────────────────────────────────
  butler: {
    wakes: ["first", "other"],
    fields: [{ type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER }],
    mayBeFalse: false,
    label: "Chooses master:",
    line: "Tomorrow they vote only with that player.",
    received: "is your master",
  },
  drunk: { wakes: [], fields: [], mayBeFalse: false }, // never wakes as itself — see golem/belief's performance rows
  recluse: { wakes: [], fields: [], mayBeFalse: false }, // passive
  saint: { wakes: [], fields: [], mayBeFalse: false }, // passive
  // ── Trouble Brewing — Minions ────────────────────────────────────────────
  poisoner: {
    wakes: ["first", "other"],
    fields: [{ type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER }],
    mayBeFalse: false,
    label: "Poisons:",
    // night one has nobody to recover — the only difference between the two
    line: "Poisoned to dusk tomorrow.",
    received: "is Poisoned",
  },
  spy: {
    wakes: ["first", "other"],
    // FT-1003: sees the WHOLE grimoire — the GRIMOIRE field renders the
    // show/keep-shown control that opens the reveal on that one seat's
    // client. The TEXT field stays: it is the row's note, exactly what the
    // free box recorded before the control existed.
    fields: [
      { type: FIELD_TYPES.GRIMOIRE, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.TEXT, by: FIELD_OWNERS.STORYTELLER },
    ],
    mayBeFalse: false,
    label: "Sees:",
    line: "Each night the Storyteller will show you the Grimoire.",
  },
  scarletwoman: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }],
    mayBeFalse: false, // "you are now the Demon" is a state transition, not corruptible info
    label: "Becomes:",
    line: "If the Demon died, 5+ alive.",
  },
  baron: { wakes: [], fields: [], mayBeFalse: false }, // setup-only, never wakes
  // ── Trouble Brewing — Demon ──────────────────────────────────────────────
  imp: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER }],
    mayBeFalse: false, // chooses a kill, told nothing back — the Demon's OWN first-night reveal is GROUP_INFO.demon, below
    label: "Kills:",
    // "Kills:" already says the kill; the starpass is what the label can't say
    line: "A self-kill passes it to a Minion.",
    // "is your target", not "dies" — the storyteller may rule otherwise (a
    // Monk's protection, a Soldier), and the acknowledgement must not promise
    // an outcome the night has not settled
    received: "is your target",
  },
  // ── Trouble Brewing — Travellers ─────────────────────────────────────────
  // Line-only (see the header): both already render a seat picker off their
  // reminder text, and neither field design was ever made.
  bureaucrat: {
    wakes: ["first", "other"],
    line: "Their vote counts three times tomorrow.",
  },
  thief: {
    wakes: ["first", "other"],
    line: "Their vote counts minus one tomorrow.",
  },

  // ── Bad Moon Rising / Sects & Violets — entered opportunistically ───────
  chambermaid: {
    wakes: ["first", "other"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      {
        type: FIELD_TYPES.NUMBER,
        by: FIELD_OWNERS.STORYTELLER,
        min: 0,
        max: 2,
      },
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "How many of their two choices wake tonight.",
  },
  clockmaker: {
    wakes: ["first"],
    fields: [
      {
        type: FIELD_TYPES.NUMBER,
        by: FIELD_OWNERS.STORYTELLER,
        min: 1,
        max: 20,
      },
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "Seats from the Demon to its nearest Minion.",
  },
  mathematician: {
    wakes: ["first", "other"],
    fields: [
      {
        type: FIELD_TYPES.NUMBER,
        by: FIELD_OWNERS.STORYTELLER,
        min: 0,
        max: 20,
      },
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "Abilities another broke since dawn.",
  },
  oracle: {
    wakes: ["other"],
    fields: [
      {
        type: FIELD_TYPES.NUMBER,
        by: FIELD_OWNERS.STORYTELLER,
        min: 0,
        max: 20,
      },
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "How many of the dead are evil.",
  },
  juggler: {
    wakes: ["other"],
    fields: [
      {
        type: FIELD_TYPES.NUMBER,
        by: FIELD_OWNERS.STORYTELLER,
        min: 0,
        max: 5,
      },
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "How many first-day guesses were right.",
  },

  // ── Bad Moon Rising — line-only (FT-886) ─────────────────────────────────
  // Prose written, field design not yet made: each of these renders exactly
  // as it did before (a free text box), now with a sentence written for a
  // screen instead of a table full of tokens. See the header.
  grandmother: {
    wakes: ["first", "other"],
    line: {
      first: "The grandchild — a player and their character.",
      other: "If the Demon killed the grandchild, they die.",
    },
  },
  sailor: {
    wakes: ["first", "other"],
    line: "They or their choice is drunk till dusk; you pick.",
  },
  exorcist: {
    wakes: ["other"],
    line: "Not last night's pick. A chosen Demon skips.",
  },
  innkeeper: {
    wakes: ["other"],
    line: "Both safe tonight; one of them drunk till dusk.",
  },
  gambler: {
    wakes: ["other"],
    line: "A player and a character: wrong, and they die.",
  },
  gossip: {
    wakes: ["other"],
    line: "Only if today's claim was true: someone dies.",
  },
  courtier: {
    wakes: ["first", "other"],
    line: "Once per game: a character drunk for 3 days.",
  },
  professor: {
    wakes: ["other"],
    line: "Once per game: a dead Townsfolk lives again.",
  },
  tinker: {
    wakes: ["other"],
    line: "They may die at any moment — your choice.",
  },
  moonchild: {
    wakes: ["other"],
    wakesWhenDead: true,
    line: "Only if they died today: their pick dies, if good.",
  },
  // lunatic — DELIBERATELY UNWRITTEN, see LEFT ALONE in the header.
  godfather: {
    wakes: ["first", "other"],
    line: {
      first: "Name every Outsider in play.",
      other: "Only if an Outsider died today.",
    },
  },
  devilsadvocate: {
    wakes: ["first", "other"],
    line: "Survives tomorrow's execution. Never twice.",
  },
  assassin: {
    wakes: ["other"],
    line: "Once per game: their choice dies regardless.",
  },
  zombuul: {
    wakes: ["other"],
    // "The 1st time you die, you live but register as dead" — the app marks
    // that death on the seat, so a Zombuul is a DEAD player that kills
    wakesWhenDead: true,
    line: "Only if nobody died today.",
  },
  pukka: {
    wakes: ["first", "other"],
    line: {
      first: "Their choice is poisoned.",
      other: "The new choice is poisoned; the last dies.",
    },
  },
  shabaloth: {
    wakes: ["other"],
    line: "Two die; one of last night's dead may return.",
  },
  po: {
    wakes: ["other"],
    line: "If they chose nobody last night, three die.",
  },
  apprentice: {
    wakes: ["first"],
    line: "A Townsfolk ability if good, a Minion's if evil.",
  },

  // FT-1003: the other "sees the grimoire" character. New entry rather than
  // line-only so the GRIMOIRE control reaches its row; the PLAYER field is
  // the poison pick (already a SeatPicker via nightLog's phrasing-derived
  // count — see extraFields), and the TEXT field keeps the free note the
  // fallback used to render. mayBeFalse stays true, matching the fallback
  // this entry replaces: the "a Widow is in play" tell can be corrupted.
  widow: {
    wakes: ["first"],
    fields: [
      { type: FIELD_TYPES.GRIMOIRE, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.TEXT, by: FIELD_OWNERS.STORYTELLER },
    ],
    mayBeFalse: true,
    label: "Poisons:",
    line: "They see the grimoire; one good player learns.",
  },

  // ── Sects & Violets — line-only (FT-886) ─────────────────────────────────
  dreamer: {
    wakes: ["first", "other"],
    line: "One good and one evil character; one is true.",
  },
  snakecharmer: {
    wakes: ["first", "other"],
    line: "A chosen Demon swaps, and is poisoned.",
  },
  flowergirl: {
    wakes: ["other"],
    line: "Whether the Demon voted today.",
  },
  towncrier: {
    wakes: ["other"],
    line: "Whether a Minion nominated today.",
  },
  seamstress: {
    wakes: ["first", "other"],
    line: "Once per game: same alignment or not?",
  },
  philosopher: {
    wakes: ["first", "other"],
    line: "Once per game: a good ability, its owner drunk.",
  },
  sage: {
    wakes: ["other"],
    wakesWhenDead: true,
    line: "Only if the Demon killed them: two players.",
  },
  sweetheart: {
    wakes: ["other"],
    wakesWhenDead: true,
    line: "Only if they died: someone stays drunk.",
  },
  barber: {
    wakes: ["other"],
    wakesWhenDead: true,
    line: "If they died today, the Demon may swap two.",
  },
  eviltwin: {
    wakes: ["first"],
    line: "Wake both twins; each learns who the other is.",
  },
  witch: {
    wakes: ["first", "other"],
    line: "Dies if they nominate tomorrow; four alive.",
  },
  cerenovus: {
    wakes: ["first", "other"],
    line: "Mad as that character tomorrow, or executed.",
  },
  pithag: {
    wakes: ["other"],
    line: "They become that character, if it is out of play.",
  },
  fanggu: {
    wakes: ["other"],
    line: "First Outsider killed turns evil; they die.",
  },
  vigormortis: {
    wakes: ["other"],
    line: "A killed Minion keeps it, poisons a neighbour.",
  },
  nodashii: {
    wakes: ["other"],
    line: "Their two Townsfolk neighbours are poisoned.",
  },
  vortox: {
    wakes: ["other"],
    line: "Every Townsfolk reading is false tonight.",
  },
  barista: {
    wakes: ["first", "other"],
    line: "True information tonight, or their ability twice.",
  },
  harlot: {
    wakes: ["other"],
    line: "If they agree, they learn it — and both may die.",
  },
  bonecollector: {
    wakes: ["other"],
    line: "Once per game: a dead player's ability returns.",
  },

  // ── Experimental / Carousel — FLAG-ONLY entries (FT-874, 2026-08-19) ─────
  // Five characters that reach this table for ONE reason: the wakes-when-dead
  // sweep found them, and without an entry a dead seat holding one would drop
  // off the checklist on the very night it matters.
  //
  // They carry no `fields` and no `line`, which is a legal, already-handled
  // shape and not an oversight: `fieldsFor()` treats a missing `fields` key
  // exactly as it treats an unlisted role (one free-text box), and `lineFor()`
  // returning "" falls the row back to the shipped reminder text. So each
  // renders tonight precisely as it rendered yesterday — it just no longer
  // vanishes when its player dies. Writing the prose and designing the
  // controls is a later pass that touches nothing here.
  farmer: { wakes: ["other"], wakesWhenDead: true },
  poppygrower: { wakes: ["first", "other"], wakesWhenDead: true },
  banshee: { wakes: ["other"], wakesWhenDead: true },
  plaguedoctor: { wakes: ["other"], wakesWhenDead: true },
  hatter: { wakes: ["other"], wakesWhenDead: true },
};

/**
 * Characters whose presence IN PLAY keeps OTHER seats on the checklist after
 * those seats die — keyed by the enabler's role id, valued by the TEAMS whose
 * dead seats it keeps. See the DEAD_WAKE_ENABLERS section in the file header
 * for why this is modelled at all, why it is deliberately over-inclusive, and
 * why the Bone Collector is not one.
 */
export const DEAD_WAKE_ENABLERS = {
  // "Minions you kill keep their ability & poison 1 Townsfolk neighbour"
  vigormortis: ["minion"],
};

/**
 * FT-1006: CHARACTERS WHOSE OWN PLAYER DOES NOT KNOW WHAT THEY ARE — keyed by
 * role id, valued by the TEAM whose characters they are told they belong to.
 * This is the schema half of golem/belief.js: that file models the seat's
 * `believedRole` field and reads it; this map names WHICH characters put a
 * lie on the seat in the first place, so the assignment doorway (Player.vue's
 * seat menu) can appear exactly where the deal calls for one — never a
 * role-name test at a call site (the file header's standing rule).
 *
 * `pool` is the team the character's ability text says the player is shown
 * ("You think you are a Townsfolk character") — advisory for a future picker
 * filter, not enforced: a storyteller may hand any seat any belief through
 * the same doorway, and belief.js deliberately supports "anything a
 * storyteller invents on the night".
 */
export const BELIEVES_OTHER = {
  // "You do not know you are the Drunk. You think you are a Townsfolk
  // character, but you are not."
  drunk: { pool: "townsfolk" },
  // "You think you are a Demon, but you are not."
  lunatic: { pool: "demon" },
  // "You think you are a good character, but you are not." (custom scripts)
  marionette: { pool: "townsfolk" },
};

/**
 * Does dealing this character mean its player is TOLD they are someone else?
 * True exactly for the BELIEVES_OTHER ids — the doorway-gating question, as
 * distinct from belief.js's isBelieving(), which asks whether a belief has
 * actually been SET on a seat.
 */
export function believesOther(role) {
  return !!(role && role.id && BELIEVES_OTHER[role.id]);
}

/**
 * GROUP_INFO — documentation only (see file header). Neither key is a role
 * id, so fieldsFor()/extraFields() never return these via the normal lookup;
 * nothing renders them yet. They demonstrate the two field properties the
 * per-character table above never needed: `count` (more than one value from
 * the same domain) and `filter` (narrowing that domain).
 */
export const GROUP_INFO = {
  minion: {
    wakes: ["first"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER }, // who the Demon is
      // the other Minions, when there's more than one in play — `count` is
      // dynamic here (the team's own size minus one), not a fixed number
      {
        type: FIELD_TYPES.PLAYER,
        by: FIELD_OWNERS.STORYTELLER,
        count: "otherMinions",
      },
    ],
    mayBeFalse: false,
  },
  demon: {
    wakes: ["first"],
    fields: [
      {
        type: FIELD_TYPES.PLAYER,
        by: FIELD_OWNERS.STORYTELLER,
        count: "allMinions",
      }, // its Minions
      {
        type: FIELD_TYPES.CHARACTER,
        by: FIELD_OWNERS.STORYTELLER,
        filter: FIELD_FILTERS.NOT_IN_PLAY,
        count: 3,
      }, // the three bluffs
    ],
    mayBeFalse: false,
  },
};

/**
 * FT-887 (2026-08-19): TEAMS WOKEN AS A GROUP ON THE FIRST NIGHT.
 *
 * Night one has two steps that belong to no single character: "Minion info"
 * (every Minion is woken and shown who the Demon is) and "Demon info & bluffs"
 * (the Demon is woken and shown its Minions and three characters not in play).
 * NightOrderModal has always carried both as synthetic entries at positions 5
 * and 8 — see GROUP WAKES in the file header.
 *
 * Because neither step is a property of any character's OWN roles.json row,
 * twelve of the nineteen shipped Demons carry `firstNight: 0` — the Imp among
 * them — and eight of the twenty-eight Minions do. Anything deriving "does
 * this character wake on night one" from that number alone therefore said the
 * Imp does not wake on the first night, which is how the hover card and the
 * night order sheet came to disagree.
 *
 * So the rule is a fact about the TEAM, kept here beside everything else this
 * file knows about a character's night, and read by `wakesOn()` below.
 */
export const FIRST_NIGHT_GROUP_TEAMS = ["minion", "demon"];

/**
 * FT-887: THE ONE ANSWER to "when does this character wake" — every surface
 * that makes that claim reads it here, so no two can disagree.
 *
 *   { first, other, known }
 *
 * `first` / `other` are the claim itself. `known` is whether the role tells us
 * anything about its nights AT ALL, and it exists so a surface can stay silent
 * rather than guess: a custom character carrying no night fields gets NO chip,
 * never a wrong "Never wakes".
 *
 * Three inputs, in order of authority:
 *   · the team's group wake (above) — night one, whatever the number says;
 *   · the character's own night order number;
 *   · its reminder text, which a hand-authored character often has when the
 *     number was never filled in.
 *
 * WHAT THIS IS NOT: the night ORDER. Whether a character earns its own ROW on
 * an ordered night sheet is still `role.firstNight / otherNight`, and the
 * group steps above are already separate rows there. The order-editing and
 * roster surfaces read the numbers directly and are right to — see the file
 * header. This function answers only "does the seat wake".
 *
 * Never throws; a null role answers no to everything, `known: false`.
 */
export function wakesOn(role) {
  const r = role || {};
  const group = FIRST_NIGHT_GROUP_TEAMS.includes(
    String(r.team || "").toLowerCase(),
  );
  const declares =
    "firstNight" in r ||
    "otherNight" in r ||
    "firstNightReminder" in r ||
    "otherNightReminder" in r;
  return {
    first: group || r.firstNight > 0 || !!r.firstNightReminder,
    other: r.otherNight > 0 || !!r.otherNightReminder,
    known: group || declares,
  };
}

/**
 * ── AUTHORED NIGHT ACTIONS (FT-1040) ──────────────────────────────────────
 *
 * The forge (EditionModal's role form) lets an author COMPOSE a night action
 * for their own character, from a palette of exactly six shapes — each one a
 * one-to-one dressing of a field list this file already renders. The composed
 * entry rides the forged role itself (`role.golemNight`, script-snapshot
 * semantics like the baked icon), and REGISTERS here when the script loads
 * (store setCustomRoles), so every consumer — the storyteller checklist, the
 * player's night prompt, the chronicle — answers for a forged character
 * through the same four functions it already calls for a shipped one. No
 * surface knows authored roles exist.
 *
 * THE SIX SHAPES, and their one-to-one field dressings:
 *
 *   players    N × { PLAYER, by }   — the only shape where the FILLER choice
 *                                     is real: by:"player" is FT-1005's own-
 *                                     pick slot, by:"storyteller" is a
 *                                     pointing the storyteller records (the
 *                                     Washerwoman's two). N is 1–3, nightLog's
 *                                     own MAX_TARGETS ceiling.
 *   yesno      { BOOLEAN, storyteller }
 *   number     { NUMBER, storyteller, 0–20 }
 *   character  { CHARACTER, storyteller }
 *   grimoire   { GRIMOIRE, storyteller } — the Spy's whole-town view
 *   note       { TEXT, storyteller }     — the universal free box
 *
 * Non-PLAYER shapes are STORYTELLER-ONLY by construction, not by scope cut:
 * a by:"player" BOOLEAN would map to no player-side control at all
 * (playerSlots counts PLAYER fields alone, and the drawer renders SeatPickers
 * and the free box, nothing else) — a filler toggle there would be a lie.
 *
 * label / mayBeFalse are DERIVED from the shape, never guessed: the author
 * chose the shape, and the shape IS the semantics ("Chooses:" for their own
 * pick, "Learns:" for told information, "Sees:" for the grimoire; mayBeFalse
 * exactly when a storyteller-filled field exists to have lied in).
 *
 * THE REGISTRY IS RUNTIME-ONLY and rebuilt wholesale on every script load —
 * never persisted here, never merged into NIGHT_INFO (the shipped table wins
 * a collision, though forged ids are golem-prefixed and cannot collide in
 * practice). An UNREGISTERED forged role — an old one saved before the
 * composer existed, or a malformed entry — falls through every lookup exactly
 * as an unlisted role always has: free-text box, zero player slots, official
 * reminder line. The fallback is the compatibility story.
 */

/** The forge's shape palette — id, face label, and the composed row's hint. */
export const NIGHT_SHAPES = [
  {
    id: "players",
    label: "Chooses players",
    hint: "One seat picker per player",
  },
  { id: "yesno", label: "Learns yes / no", hint: "The told yes-or-no answer" },
  {
    id: "number",
    label: "Learns a number",
    hint: "A number the storyteller sets",
  },
  {
    id: "character",
    label: "Is shown a character",
    hint: "A character off the script",
  },
  {
    id: "grimoire",
    label: "Sees the grimoire",
    hint: "The whole town, shown to that seat",
  },
  { id: "note", label: "Free note", hint: "The storyteller's own words" },
];

/** Ceiling on the players shape's count — nightLog's own MAX_TARGETS. */
export const AUTHORED_MAX_PLAYERS = 3;

/**
 * Compose a full schema entry from the forge's four dials. Returns the entry
 * (the exact shape NIGHT_INFO rows carry) or null when `shape` names nothing
 * — the caller stores null as "no composed action".
 */
export function composeAuthoredNight({ shape, count, by, prompt, wakes }) {
  const st = FIELD_OWNERS.STORYTELLER;
  const filler = by === FIELD_OWNERS.PLAYER ? FIELD_OWNERS.PLAYER : st;
  let fields = null;
  let label = "";
  let mayBeFalse = true;
  switch (shape) {
    case "players": {
      const n = Math.min(
        Math.max(parseInt(count, 10) || 1, 1),
        AUTHORED_MAX_PLAYERS,
      );
      fields = Array.from({ length: n }, () => ({
        type: FIELD_TYPES.PLAYER,
        by: filler,
      }));
      label = filler === FIELD_OWNERS.PLAYER ? "Chooses:" : "Learns:";
      // their own pick with nothing told back cannot be lied about
      mayBeFalse = filler !== FIELD_OWNERS.PLAYER;
      break;
    }
    case "yesno":
      fields = [{ type: FIELD_TYPES.BOOLEAN, by: st }];
      label = "Learns:";
      break;
    case "number":
      fields = [{ type: FIELD_TYPES.NUMBER, by: st, min: 0, max: 20 }];
      label = "Learns:";
      break;
    case "character":
      fields = [{ type: FIELD_TYPES.CHARACTER, by: st }];
      label = "Learns:";
      break;
    case "grimoire":
      fields = [{ type: FIELD_TYPES.GRIMOIRE, by: st }];
      label = "Sees:";
      // a view opened on their client, not information to have corrupted
      mayBeFalse = false;
      break;
    case "note":
      fields = [{ type: FIELD_TYPES.TEXT, by: st }];
      break;
    default:
      return null;
  }
  return {
    wakes: Array.isArray(wakes)
      ? wakes.filter((w) => w === "first" || w === "other")
      : [],
    fields,
    label,
    line: String(prompt || "")
      .trim()
      .slice(0, 200),
    mayBeFalse,
  };
}

/**
 * The reverse map — a stored entry back to the forge's dials, so re-editing a
 * forged role reopens the composer where it was left. Null for anything that
 * doesn't read as one of the six shapes (the forge then starts blank, and a
 * save without a shape simply stores no composed action).
 */
export function decomposeAuthoredNight(entry) {
  if (!entry || !Array.isArray(entry.fields) || !entry.fields.length)
    return null;
  const dials = {
    shape: "",
    count: 1,
    by: FIELD_OWNERS.STORYTELLER,
    prompt: typeof entry.line === "string" ? entry.line : "",
  };
  const types = entry.fields.map((f) => f && f.type);
  if (types.every((t) => t === FIELD_TYPES.PLAYER)) {
    dials.shape = "players";
    dials.count = Math.min(entry.fields.length, AUTHORED_MAX_PLAYERS);
    dials.by =
      entry.fields[0].by === FIELD_OWNERS.PLAYER
        ? FIELD_OWNERS.PLAYER
        : FIELD_OWNERS.STORYTELLER;
    return dials;
  }
  if (types.length !== 1) return null;
  const shapeByType = {
    [FIELD_TYPES.BOOLEAN]: "yesno",
    [FIELD_TYPES.NUMBER]: "number",
    [FIELD_TYPES.CHARACTER]: "character",
    [FIELD_TYPES.GRIMOIRE]: "grimoire",
    [FIELD_TYPES.TEXT]: "note",
  };
  dials.shape = shapeByType[types[0]] || "";
  return dials.shape ? dials : null;
}

/**
 * Validate a stored `golemNight` into a clean schema entry, or null. Strict
 * on purpose: this is the one door through which PERSISTED data (a script
 * vault row, a wire frame from another client) reaches the schema, so an
 * unknown field type, a missing list, or an empty list all answer null and
 * the role stays an ordinary unlisted one. Numbers are clamped, strings
 * trimmed and capped, and the result is a fresh object — never a reference
 * into the stored role.
 */
export function sanitizeAuthoredNight(raw) {
  if (!raw || !Array.isArray(raw.fields) || !raw.fields.length) return null;
  const validTypes = Object.values(FIELD_TYPES);
  const fields = [];
  for (const f of raw.fields.slice(0, 8)) {
    if (!f || !validTypes.includes(f.type)) return null;
    const clean = {
      type: f.type,
      by:
        f.by === FIELD_OWNERS.PLAYER
          ? FIELD_OWNERS.PLAYER
          : FIELD_OWNERS.STORYTELLER,
    };
    if (f.type === FIELD_TYPES.NUMBER) {
      clean.min = Number.isInteger(f.min) ? f.min : 0;
      clean.max = Number.isInteger(f.max) ? f.max : 20;
      if (clean.max < clean.min) clean.max = clean.min;
    }
    fields.push(clean);
  }
  return {
    wakes: Array.isArray(raw.wakes)
      ? raw.wakes.filter((w) => w === "first" || w === "other")
      : [],
    fields,
    label: typeof raw.label === "string" ? raw.label.trim().slice(0, 40) : "",
    line: typeof raw.line === "string" ? raw.line.trim().slice(0, 200) : "",
    // FT-1330: a forged role may author its own received-acknowledgement
    // phrase the same way the shipped table does; absent, the generic
    // fallback covers it (see the header's `received` note)
    received:
      typeof raw.received === "string" ? raw.received.trim().slice(0, 80) : "",
    mayBeFalse: !!raw.mayBeFalse,
  };
}

/** roleId → sanitized authored entry. Runtime-only; rebuilt on script load. */
const AUTHORED_NIGHT = Object.create(null);

/** Register one forged role's composed action. False when the raw entry
 *  doesn't sanitize — the role then falls through as unlisted, by design. */
export function registerAuthoredNight(roleId, raw) {
  const entry = sanitizeAuthoredNight(raw);
  if (!roleId || !entry) return false;
  AUTHORED_NIGHT[roleId] = entry;
  return true;
}

/** Drop every authored registration — the start of each script load. */
export function resetAuthoredNight() {
  Object.keys(AUTHORED_NIGHT).forEach((id) => delete AUTHORED_NIGHT[id]);
}

/** The registered authored entry for a role id, or null. Exposed for the
 *  forge (re-edit seeding) and for nightLog's targetCount. */
export function authoredNightFor(roleId) {
  return (roleId && AUTHORED_NIGHT[roleId]) || null;
}

/** ONE lookup for both tables — the shipped table wins a collision (forged
 *  ids are golem-prefixed, so in practice there is none). Every per-role
 *  function below reads through this, which is the whole registration story:
 *  a forged character is native everywhere because no consumer ever asks a
 *  second question. */
function entryOf(roleId) {
  return NIGHT_INFO[roleId] || AUTHORED_NIGHT[roleId];
}

/**
 * The field list for one character — and the SAFE FALLBACK for everything
 * this table has never heard of (a custom script's own characters, or a
 * shipped one this pass didn't reach). Never returns an empty result for an
 * unknown id; a row always gets a control, and an unlisted role gets the one
 * that can never be wrong: free text.
 */
export function fieldsFor(roleId) {
  const entry = entryOf(roleId);
  // FT-886: no entry, or a LINE-ONLY entry (one that carries prose but has no
  // `fields` KEY at all) — both mean "nobody has designed this row's controls",
  // and both must render identically. Note this is `!entry.fields`, not a
  // length check: `fields: []` is a deliberate answer — "records nothing" —
  // and keeps meaning that.
  if (!entry || !entry.fields) {
    return {
      fields: [{ type: FIELD_TYPES.TEXT, by: FIELD_OWNERS.STORYTELLER }],
      mayBeFalse: true,
      known: false,
    };
  }
  return { fields: entry.fields, mayBeFalse: !!entry.mayBeFalse, known: true };
}

/**
 * FT-874: the night-action label for one character — "Kills:", "Poisons:" —
 * or "" when there is nothing to name: an unlisted role (never a guessed
 * verb), or a listed one with nothing to record (`wakes: []` entries never
 * carry a `label` key at all). Never throws, always a string — the template
 * can `v-if` on the return value directly.
 */
export function labelFor(roleId) {
  const entry = entryOf(roleId);
  return (entry && entry.label) || "";
}

/**
 * FT-886: the instruction line for one character on THIS night — our sentence
 * for what the storyteller does on a screen — or "" when none is written.
 *
 * "" is the signal to fall back to the shipped reminder text, which the caller
 * owns (the night roster getter does exactly `lineFor(...) || reminderFor(...)`).
 * That keeps this function honest about one thing only: whether WE have
 * written a line. Never throws, always a string.
 *
 * A `line` may be a plain string (both nights read the same) or
 * `{ first, other }` where the action genuinely differs — the Godfather learns
 * the Outsiders on night one and kills on the nights after. A split line with
 * only the half that doesn't apply tonight returns "", so the row falls back
 * to the official text rather than showing a sentence about a different night.
 */
export function lineFor(roleId, isFirstNight) {
  const entry = entryOf(roleId);
  const line = entry && entry.line;
  if (!line) return "";
  if (typeof line === "string") return line;
  return (isFirstNight ? line.first : line.other) || "";
}

/**
 * FT-1330: the received-acknowledgement effect phrase for one character —
 * "is Poisoned", "is your target" — or "" where none is written. "" is the
 * signal to fall back to the generic acknowledgement ("Storyteller received
 * your choice — <target name>."), which the caller owns; this function is
 * only honest about whether WE have authored a phrase. Never throws, always
 * a string. Only meaningful on receive-only rows (nightExchange() ===
 * RECORDS); callers gate on that, not this.
 */
export function receivedFor(roleId) {
  const entry = entryOf(roleId);
  return (entry && typeof entry.received === "string" && entry.received) || "";
}

/**
 * FT-874 (2026-08-19): which TEAMS keep their dead seats on tonight's list,
 * given the characters actually in play. Almost always empty — pass the seated
 * role ids, get back a Set of team names (see DEAD_WAKE_ENABLERS).
 *
 * A Set rather than an array because the caller tests it once per seat, and
 * because two enablers naming the same team must not double it.
 */
export function deadWakeTeams(roleIds) {
  const teams = new Set();
  (roleIds || []).forEach((id) => {
    (DEAD_WAKE_ENABLERS[id] || []).forEach((team) => teams.add(team));
  });
  return teams;
}

/**
 * FT-874 (2026-08-19): does a DEAD seat holding this character still belong on
 * tonight's checklist?
 *
 * Two ways to answer yes, and they are different kinds of fact:
 *   · the character's own trigger is dying (`wakesWhenDead` — the eleven
 *     listed in the file header);
 *   · something ELSE in play keeps this seat's team waking (a Vigormortis and
 *     its Minions) — pass `deadWakeTeams()`'s Set as the second argument.
 *
 * Called ONLY for seats already known to be dead; a living seat never reaches
 * it. An unlisted character answers no, which is the ordinary rule — see THE
 * FALLBACK in the header for why that default is the safe one here and the
 * opposite of the safe one for `fieldsFor()`.
 */
export function deadStillWakes(role, enabledTeams) {
  if (!role || !role.id) return false;
  const entry = NIGHT_INFO[role.id];
  if (entry && entry.wakesWhenDead) return true;
  return !!enabledTeams && enabledTeams.has(role.team);
}

/**
 * FT-1005: how many of this character's night choices belong to THE PLAYER
 * THEMSELVES — the count of PLAYER-typed fields with by:"player". This is the
 * player-surface twin of `targetCount()` (nightLog): the checklist renders a
 * SeatPicker per pointing REGARDLESS of who points (the Washerwoman's two are
 * the storyteller's own pointing, information given), while the player's own
 * night row may only offer pickers for the choices that are genuinely theirs
 * (the Fortune Teller's two, the Monk's one, the Imp's kill).
 *
 * Zero for an unlisted or line-only character, deliberately — the OPPOSITE
 * fallback direction from fieldsFor()'s free-text box, because this count
 * gates an INPUT: a control nobody designed must not invite a player to write
 * into a row whose slots mean something else. The player's universal fallback
 * is the free-text "in your own words" box, gated on `known` by the caller.
 */
export function playerSlots(roleId) {
  const entry = entryOf(roleId);
  if (!entry || !entry.fields) return 0;
  return entry.fields.filter(
    (f) => f.type === FIELD_TYPES.PLAYER && f.by === FIELD_OWNERS.PLAYER,
  ).length;
}

/**
 * FT-1272: WHOSE ACT ARE THIS CHARACTER'S SEAT POINTINGS?
 *
 * The fact itself is not new — every PLAYER field has carried `by` since this
 * file's first shape, and it is the whole reason `playerSlots()` can count the
 * player's own choices apart from the storyteller's. What was missing is a way
 * to ask the question about a ROW rather than about a field, and the cost of
 * that gap was a real bug: FT-1229 split the checklist row's grammar into
 * "Selects:" / "Learns:" on the presence of seat SLOTS, and slots are rendered
 * for every pointing whoever makes it (see `extraFields`'s note). So the
 * Librarian's row read "Selects: [seat] [seat]" — and a Librarian selects
 * nothing. The storyteller picks the two players to point at.
 *
 * Three answers, and the third is not a shrug:
 *   FIELD_OWNERS.PLAYER       the seats are the player's own choice — the
 *                             Fortune Teller's two, the Monk's one, the
 *                             Poisoner's, the Butler's master.
 *   FIELD_OWNERS.STORYTELLER  the seats are the storyteller's own pick of what
 *                             to SHOW — the first-night info roles
 *                             (Washerwoman, Librarian, Investigator) and the
 *                             Minion-info group reveal.
 *   ""                        this file has never heard of the character, or
 *                             it points at nobody. The caller decides what an
 *                             unknown row says; this function does not guess.
 *
 * A row holding BOTH kinds answers PLAYER — the Ravenkeeper points at a seat
 * itself and is then shown a character, and the seat is unambiguously theirs.
 * A mixed row where the storyteller ALSO points would need a per-slot answer;
 * no character in the schema is that shape today, and when one appears this
 * function is where it gets solved (per-slot, from the same `by` it already
 * reads), not at a call site.
 */
export function seatPickOwner(roleId) {
  const entry = entryOf(roleId);
  if (!entry || !entry.fields) return "";
  const seats = entry.fields.filter((f) => f.type === FIELD_TYPES.PLAYER);
  if (!seats.length) return "";
  return seats.some((f) => f.by === FIELD_OWNERS.PLAYER)
    ? FIELD_OWNERS.PLAYER
    : FIELD_OWNERS.STORYTELLER;
}

/**
 * FT-1296 (user): DOES ANYTHING ACTUALLY GO BACK TO THE PLAYER ON THIS ROW?
 *
 * The night sheet's per-row button read "Send" on every row, and on most of
 * them that is a lie: the Imp chooses a kill and is told nothing; the Poisoner
 * picks a target and is told nothing. Nothing travels, so "Send" names an act
 * that does not happen. The button's own tooltip had already half-admitted it
 * ("nothing was composed, so nothing new is delivered").
 *
 * THE RULE WAS ALREADY IN THE DATA — this is `seatPickOwner`'s move again, a
 * question about a ROW put to the `by` every field has always carried. A row
 * tells the player something exactly when one of its fields is filled by the
 * STORYTELLER: the Fortune Teller's yes/no, the Empath's number, the
 * Undertaker's character. Where every field is `by:"player"` the row is only
 * the storyteller writing down a choice that was made at the table.
 *
 * THREE ANSWERS, and the third is not a shrug — same shape as seatPickOwner:
 *   TELLS     a storyteller-filled field exists; something is delivered.
 *   RECORDS   fields exist and every one is the player's own; nothing goes
 *             back. The Monk, the Butler, the Poisoner, the Imp — all four of
 *             the shipped table's, plus any forged role whose composed action
 *             is "Chooses players" filled BY THE PLAYER.
 *   NEITHER   the row has no fields at all (`fields: []` — the deliberate
 *             "records nothing" the day-ability and passive entries carry).
 *             Nothing is chosen and nothing is told, so it is a plain tick.
 *
 * WHY IT READS THROUGH `fieldsFor()` AND NOT `entryOf()`: an unlisted or
 * line-only character falls through to one free-text box filled by the
 * STORYTELLER, so it answers TELLS — and that is the honest answer, because
 * that box is a message the storyteller composes and the row does deliver it.
 * The safe fallback direction here is the same one fieldsFor documents.
 *
 * NEITHER IS UNREACHABLE ON THE CHECKLIST TODAY, and that is recorded rather
 * than assumed: all eight `fields: []` entries (Virgin, Slayer, Soldier,
 * Mayor, Drunk, Recluse, Saint, Baron) carry firstNight 0 and otherNight 0,
 * and the roster getter drops any role with neither. `sanitizeAuthoredNight`
 * rejects an empty field list outright, so a forged role cannot reach it
 * either. It is answered anyway because the alternative is folding it in with
 * RECORDS and telling a storyteller their Baron "received" something.
 *
 * GROUP_INFO — the first night's Minion info and Demon info & bluffs — is
 * every-field-storyteller on both keys, so both are TELLS whenever the roster
 * getter learns to render them. Neither key is a role id, so nothing routes
 * through here today; the answer is stated so that pass has one less thing to
 * decide.
 */
export const NIGHT_EXCHANGE = {
  TELLS: "tells",
  RECORDS: "records",
  NEITHER: "neither",
};

/** FT-1296: which of the three this character's row is. Never throws, always
 *  one of NIGHT_EXCHANGE's values — see the note above for the fallback. */
export function nightExchange(roleId) {
  const { fields } = fieldsFor(roleId);
  if (fields.some((f) => f.by === FIELD_OWNERS.STORYTELLER)) {
    return NIGHT_EXCHANGE.TELLS;
  }
  return fields.length ? NIGHT_EXCHANGE.RECORDS : NIGHT_EXCHANGE.NEITHER;
}

/**
 * The fields a row needs a NEW control for. PLAYER fields are excluded
 * regardless of `by` — every one of them, chosen by the player or set by the
 * storyteller, is already a seat someone points at, and the row already
 * renders one SeatPicker per seat via nightLog's own targetCount()/
 * HARD_TARGETS (built off the reminder's "points to N players" phrasing).
 * Deriving that count a SECOND time from this table risked the two ever
 * disagreeing; excluding PLAYER here means they can't.
 */
export function extraFields(roleId) {
  const { fields, mayBeFalse, known } = fieldsFor(roleId);
  return {
    fields: fields.filter((f) => f.type !== FIELD_TYPES.PLAYER),
    mayBeFalse,
    known,
  };
}
