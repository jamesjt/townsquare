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
  TEXT: "text" // free-form — also the universal fallback for an unknown type
};

/** Who fills a field: a player's own choice, or the storyteller's own information. */
export const FIELD_OWNERS = {
  PLAYER: "player",
  STORYTELLER: "storyteller"
};

/**
 * A small, NAMED set of filters narrowing a field's domain. Kept short on
 * purpose — add one only when a real character needs it. This pass needed
 * exactly one: the Demon's bluffs are characters NOT currently in play.
 */
export const FIELD_FILTERS = {
  NOT_IN_PLAY: "notInPlay"
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
  FIELD_TYPES.TEXT
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
 *   ONE LINE. The row truncates at roughly 90 characters; every line here is
 *     comfortably under that, so nothing needs a tooltip to be read.
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
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "A Townsfolk in play, and two players — one of them is it."
  },
  librarian: {
    wakes: ["first"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }
    ],
    mayBeFalse: true,
    label: "Learns:",
    // the zero case is the whole reason this one differs from its neighbours
    line: "An Outsider in play, and two players — one is it. Or zero, if none."
  },
  investigator: {
    wakes: ["first"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "A Minion in play, and two players — one of them is it."
  },
  chef: {
    wakes: ["first"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 7 }],
    mayBeFalse: true,
    label: "Learns:",
    line: "How many pairs of evil players sit side by side."
  },
  empath: {
    wakes: ["first", "other"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 2 }],
    mayBeFalse: true,
    label: "Learns:",
    line: "How many of their two living neighbours are evil."
  },
  fortuneteller: {
    wakes: ["first", "other"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.BOOLEAN, by: FIELD_OWNERS.STORYTELLER }
    ],
    mayBeFalse: true,
    label: "Learns:",
    // the red herring is the rule this row exists to stop you forgetting
    line: "They choose two; yes if either is the Demon, or the red herring."
  },
  undertaker: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }],
    mayBeFalse: true,
    label: "Learns executed was:",
    line: "Only if a player was executed today."
  },
  monk: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER }],
    mayBeFalse: false,
    label: "Protects:",
    line: "Anyone but themselves — safe from the Demon until dawn."
  },
  ravenkeeper: {
    wakes: ["other"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "Only if they died tonight. They choose the player."
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
    line: "Tomorrow they may only vote alongside that player."
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
    line: {
      first: "Poisoned tonight and all through tomorrow.",
      other: "Poisoned tonight and all through tomorrow; the last one recovers."
    }
  },
  spy: {
    wakes: ["first", "other"],
    // sees the WHOLE grimoire — nothing structured to set; TEXT is the
    // honest choice here, not a placeholder for a control that's missing
    fields: [{ type: FIELD_TYPES.TEXT, by: FIELD_OWNERS.STORYTELLER }],
    mayBeFalse: false,
    label: "Sees:",
    line: "They read the whole grimoire, for as long as they need."
  },
  scarletwoman: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }],
    mayBeFalse: false, // "you are now the Demon" is a state transition, not corruptible info
    label: "Becomes:",
    line: "Only if the Demon died today, five or more alive — Travellers aside."
  },
  baron: { wakes: [], fields: [], mayBeFalse: false }, // setup-only, never wakes
  // ── Trouble Brewing — Demon ──────────────────────────────────────────────
  imp: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER }],
    mayBeFalse: false, // chooses a kill, told nothing back — the Demon's OWN first-night reveal is GROUP_INFO.demon, below
    label: "Kills:",
    // "Kills:" already says the kill; the starpass is what the label can't say
    line: "If they choose themselves, a Minion you pick takes their place."
  },
  // ── Trouble Brewing — Travellers ─────────────────────────────────────────
  // Line-only (see the header): both already render a seat picker off their
  // reminder text, and neither field design was ever made.
  bureaucrat: {
    wakes: ["first", "other"],
    line: "Another player's vote counts three times tomorrow."
  },
  thief: {
    wakes: ["first", "other"],
    line: "Another player's vote counts as minus one tomorrow."
  },

  // ── Bad Moon Rising / Sects & Violets — entered opportunistically ───────
  chambermaid: {
    wakes: ["first", "other"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 2 }
    ],
    mayBeFalse: true,
    label: "Learns:",
    line: "They choose two living others — how many of them wake tonight."
  },
  clockmaker: {
    wakes: ["first"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 1, max: 20 }],
    mayBeFalse: true,
    label: "Learns:",
    line: "How many seats from the Demon to its nearest Minion."
  },
  mathematician: {
    wakes: ["first", "other"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 20 }],
    mayBeFalse: true,
    label: "Learns:",
    line: "How many abilities have misfired since dawn, by another's doing."
  },
  oracle: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 20 }],
    mayBeFalse: true,
    label: "Learns:",
    line: "How many of the dead are evil."
  },
  juggler: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 5 }],
    mayBeFalse: true,
    label: "Learns:",
    line: "Only after their first day — how many guesses they got right."
  },

  // ── Bad Moon Rising — line-only (FT-886) ─────────────────────────────────
  // Prose written, field design not yet made: each of these renders exactly
  // as it did before (a free text box), now with a sentence written for a
  // screen instead of a table full of tokens. See the header.
  grandmother: {
    wakes: ["first", "other"],
    line: {
      first: "Name a good player and their character — their grandchild.",
      other: "If the Demon killed their grandchild tonight, they die too."
    }
  },
  sailor: {
    wakes: ["first", "other"],
    line: "Either they or their choice is drunk until dusk — you decide which."
  },
  exorcist: {
    wakes: ["other"],
    line: "Not last night's choice. A chosen Demon learns them, and skips tonight."
  },
  innkeeper: {
    wakes: ["other"],
    line: "Both are safe tonight; one of them is drunk until dusk — your pick."
  },
  gambler: {
    wakes: ["other"],
    line: "They name a player and a character; wrong, and they die."
  },
  gossip: {
    wakes: ["other"],
    line: "Only if their public claim today was true: someone dies, your choice."
  },
  courtier: {
    wakes: ["first", "other"],
    line: "Once per game: a character they name is drunk three days and nights."
  },
  professor: {
    wakes: ["other"],
    line: "Once per game they choose a dead player — a Townsfolk returns to life."
  },
  tinker: {
    wakes: ["other"],
    line: "They may die at any moment; tonight is your choice."
  },
  moonchild: {
    wakes: ["other"],
    line: "Only if they were told they died today: their pick dies, if good."
  },
  // lunatic — DELIBERATELY UNWRITTEN, see LEFT ALONE in the header.
  godfather: {
    wakes: ["first", "other"],
    line: {
      first: "Name every Outsider in play.",
      other: "Only if an Outsider died today — then they choose a kill."
    }
  },
  devilsadvocate: {
    wakes: ["first", "other"],
    line: "Someone living survives tomorrow's execution — never twice running."
  },
  assassin: {
    wakes: ["other"],
    line: "Once per game: their choice dies, whatever protects them."
  },
  zombuul: {
    wakes: ["other"],
    line: "Only if nobody died today — then they choose a kill."
  },
  pukka: {
    wakes: ["first", "other"],
    line: {
      first: "Their choice is poisoned.",
      other: "Their new choice is poisoned; the last one dies."
    }
  },
  shabaloth: {
    wakes: ["other"],
    line: "Two die; one of last night's dead may return, your call."
  },
  po: {
    wakes: ["other"],
    line: "They may choose nobody; if they did last night, three die tonight."
  },
  apprentice: {
    wakes: ["first"],
    line: "They gain a Townsfolk ability if good, a Minion's if evil."
  },

  // ── Sects & Violets — line-only (FT-886) ─────────────────────────────────
  dreamer: {
    wakes: ["first", "other"],
    line: "They choose someone; name a good and an evil character, one true."
  },
  snakecharmer: {
    wakes: ["first", "other"],
    line: "Choosing the Demon swaps them, sides and all — the new one is poisoned."
  },
  flowergirl: {
    wakes: ["other"],
    line: "Whether the Demon voted today."
  },
  towncrier: {
    wakes: ["other"],
    line: "Whether a Minion nominated today."
  },
  seamstress: {
    wakes: ["first", "other"],
    line: "Once per game: two others, and whether they share an alignment."
  },
  philosopher: {
    wakes: ["first", "other"],
    line: "Once per game they gain a good character's ability; its owner goes drunk."
  },
  sage: {
    wakes: ["other"],
    line: "Only if the Demon killed them — two players, one of them it."
  },
  sweetheart: {
    wakes: ["other"],
    line: "Only if they died — someone of your choosing is drunk from now on."
  },
  barber: {
    wakes: ["other"],
    line: "Only if they died today: the Demon may swap two players' characters."
  },
  eviltwin: {
    wakes: ["first"],
    line: "Wake both twins; each learns who the other is."
  },
  witch: {
    wakes: ["first", "other"],
    line: "Their choice dies if they nominate tomorrow, while four still live."
  },
  cerenovus: {
    wakes: ["first", "other"],
    line: "They pick a player and a character: mad as it tomorrow, or executable."
  },
  pithag: {
    wakes: ["other"],
    line: "A player and a character — if it is out of play, they become it."
  },
  fanggu: {
    wakes: ["other"],
    line: "The first Outsider they kill becomes an evil Fang Gu; they die instead."
  },
  vigormortis: {
    wakes: ["other"],
    line: "A Minion killed keeps its ability and poisons a Townsfolk neighbour."
  },
  nodashii: {
    wakes: ["other"],
    line: "Their two Townsfolk neighbours are poisoned."
  },
  vortox: {
    wakes: ["other"],
    line: "Every Townsfolk reading is false tonight."
  },
  barista: {
    wakes: ["first", "other"],
    line: "Tell one player which: true information tonight, or a double ability."
  },
  harlot: {
    wakes: ["other"],
    line: "If they agree, they learn that character — and both may die."
  },
  bonecollector: {
    wakes: ["other"],
    line: "Once per game: a dead player has their ability back until dusk."
  }
};

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
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER, count: "otherMinions" }
    ],
    mayBeFalse: false
  },
  demon: {
    wakes: ["first"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER, count: "allMinions" }, // its Minions
      {
        type: FIELD_TYPES.CHARACTER,
        by: FIELD_OWNERS.STORYTELLER,
        filter: FIELD_FILTERS.NOT_IN_PLAY,
        count: 3
      } // the three bluffs
    ],
    mayBeFalse: false
  }
};

/**
 * The field list for one character — and the SAFE FALLBACK for everything
 * this table has never heard of (a custom script's own characters, or a
 * shipped one this pass didn't reach). Never returns an empty result for an
 * unknown id; a row always gets a control, and an unlisted role gets the one
 * that can never be wrong: free text.
 */
export function fieldsFor(roleId) {
  const entry = NIGHT_INFO[roleId];
  // FT-886: no entry, or a LINE-ONLY entry (one that carries prose but has no
  // `fields` KEY at all) — both mean "nobody has designed this row's controls",
  // and both must render identically. Note this is `!entry.fields`, not a
  // length check: `fields: []` is a deliberate answer — "records nothing" —
  // and keeps meaning that.
  if (!entry || !entry.fields) {
    return {
      fields: [{ type: FIELD_TYPES.TEXT, by: FIELD_OWNERS.STORYTELLER }],
      mayBeFalse: true,
      known: false
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
  const entry = NIGHT_INFO[roleId];
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
  const entry = NIGHT_INFO[roleId];
  const line = entry && entry.line;
  if (!line) return "";
  if (typeof line === "string") return line;
  return (isFirstNight ? line.first : line.other) || "";
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
  return { fields: fields.filter(f => f.type !== FIELD_TYPES.PLAYER), mayBeFalse, known };
}
