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
 *
 * COVERAGE (checked by hand against roles.json + the shipped reminder text,
 * 2026-08-18): every Trouble Brewing character that wakes at all, PLUS the
 * handful of Bad Moon Rising / Sects & Violets number-signal roles this fork
 * already had reminder text for on hand (Chambermaid, Clockmaker,
 * Mathematician, Oracle, Juggler). Nothing else from BMR or SNV is entered —
 * an unlisted id falls through to TEXT via fieldsFor()'s fallback, which is
 * safe (a plain text box, never a wrong yes/no) but under-specific. That
 * fallback is load-bearing: a custom script's own characters were never
 * going to be in this table at all.
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
    label: "Learns:"
  },
  librarian: {
    wakes: ["first"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }
    ],
    mayBeFalse: true,
    label: "Learns:"
  },
  investigator: {
    wakes: ["first"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.STORYTELLER },
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }
    ],
    mayBeFalse: true,
    label: "Learns:"
  },
  chef: {
    wakes: ["first"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 7 }],
    mayBeFalse: true,
    label: "Learns:"
  },
  empath: {
    wakes: ["first", "other"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 2 }],
    mayBeFalse: true,
    label: "Learns:"
  },
  fortuneteller: {
    wakes: ["first", "other"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.BOOLEAN, by: FIELD_OWNERS.STORYTELLER }
    ],
    mayBeFalse: true,
    label: "Learns:"
  },
  undertaker: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }],
    mayBeFalse: true,
    label: "Learns executed was:"
  },
  monk: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER }],
    mayBeFalse: false,
    label: "Protects:"
  },
  ravenkeeper: {
    wakes: ["other"],
    fields: [
      { type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER },
      { type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }
    ],
    mayBeFalse: true,
    label: "Learns:"
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
    label: "Chooses master:"
  },
  drunk: { wakes: [], fields: [], mayBeFalse: false }, // never wakes as itself — see golem/belief's performance rows
  recluse: { wakes: [], fields: [], mayBeFalse: false }, // passive
  saint: { wakes: [], fields: [], mayBeFalse: false }, // passive
  // ── Trouble Brewing — Minions ────────────────────────────────────────────
  poisoner: {
    wakes: ["first", "other"],
    fields: [{ type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER }],
    mayBeFalse: false,
    label: "Poisons:"
  },
  spy: {
    wakes: ["first", "other"],
    // sees the WHOLE grimoire — nothing structured to set; TEXT is the
    // honest choice here, not a placeholder for a control that's missing
    fields: [{ type: FIELD_TYPES.TEXT, by: FIELD_OWNERS.STORYTELLER }],
    mayBeFalse: false,
    label: "Sees:"
  },
  scarletwoman: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.CHARACTER, by: FIELD_OWNERS.STORYTELLER }],
    mayBeFalse: false, // "you are now the Demon" is a state transition, not corruptible info
    label: "Becomes:"
  },
  baron: { wakes: [], fields: [], mayBeFalse: false }, // setup-only, never wakes
  // ── Trouble Brewing — Demon ──────────────────────────────────────────────
  imp: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.PLAYER, by: FIELD_OWNERS.PLAYER }],
    mayBeFalse: false, // chooses a kill, told nothing back — the Demon's OWN first-night reveal is GROUP_INFO.demon, below
    label: "Kills:"
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
    label: "Learns:"
  },
  clockmaker: {
    wakes: ["first"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 1, max: 20 }],
    mayBeFalse: true,
    label: "Learns:"
  },
  mathematician: {
    wakes: ["first", "other"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 20 }],
    mayBeFalse: true,
    label: "Learns:"
  },
  oracle: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 20 }],
    mayBeFalse: true,
    label: "Learns:"
  },
  juggler: {
    wakes: ["other"],
    fields: [{ type: FIELD_TYPES.NUMBER, by: FIELD_OWNERS.STORYTELLER, min: 0, max: 5 }],
    mayBeFalse: true,
    label: "Learns:"
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
  if (!entry) {
    return {
      fields: [{ type: FIELD_TYPES.TEXT, by: FIELD_OWNERS.STORYTELLER }],
      mayBeFalse: true,
      known: false
    };
  }
  return { fields: entry.fields || [], mayBeFalse: !!entry.mayBeFalse, known: true };
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
