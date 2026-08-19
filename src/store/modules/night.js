/**
 * Golem fork (FT-860): THE NIGHT MODULE — the storyteller's checklist state
 * and the append-only night log.
 *
 * WHAT LIVES HERE
 *   mode           the town's visibility setting: off | storyteller | everyone
 *   day            the day counter. 0 = the town has not reached its first
 *                  night; entering a night increments it (see the root
 *                  toggleNight mutation, which is the ONE place that does
 *                  it, so every path that flips the phase — the sheet's
 *                  button, the S hotkey, the menu — moves the counter
 *                  identically).
 *   entries        the log. Rows are added when the storyteller first writes
 *                  to them and are otherwise patched in place.
 *
 *                  FT-882 ENDED THE APPEND-ONLY RULE, deliberately and by
 *                  the user's call: `removeEntry` takes a row back out. The
 *                  reasoning is that the alternative on the table was a
 *                  time-boxed undo for the phase flip — a snapshot, a
 *                  broadcast, a cleanup of the abandoned night, and a rule
 *                  about when the offer expires — and that machinery fixes
 *                  exactly one mistake. An editable day counter plus a
 *                  deletable row fixes that mistake and every other
 *                  bookkeeping error, with no machinery at all, and treats
 *                  the storyteller as the authority the rest of this sheet
 *                  already treats them as. There is no undo behind the
 *                  delete; the surface that offers it confirms first.
 *   requireChecks  FT-874: a standing setting, like `mode` — gates the night
 *                  sheet's "end night" button until every row is ticked.
 *                  Read by NightSheet's `canFlip`; set from NightModeRow's
 *                  own "Require checks" checkbox, next to the mode switch.
 *
 * WHAT DOES NOT LIVE HERE
 *   The night ORDER. That is firstNight / otherNight on the roles plus the
 *   players/nightOrder getter, and the roster getter below consumes exactly
 *   those — there is no second ordering in this file.
 *   The phase. That is grimoire.isNight, which already exists and already
 *   syncs to players.
 *
 * VISIBILITY IS ENFORCED HERE, NOT IN CSS.
 *   `roster` and `visibleEntries` return EMPTY for anyone who is not the
 *   storyteller. `myEntries` returns only the rows belonging to the viewer's
 *   own claimed seat. Components read those getters and never state.entries,
 *   so a secret cannot reach the DOM to be hidden by a rule that might go
 *   missing — which is precisely how the night order leaked earlier today.
 */

import {
  DEFAULT_MODE,
  MODES,
  targetCount,
  reminderFor,
  entryId,
  makeEntry
} from "../../golem/nightLog";
// FT-861: what a seat IS versus what its player is TOLD it is.
import { beliefOf, isBelieving } from "../../golem/belief";
// FT-886: our own one-line instruction for a character's night action, where
// one is written — see golem/nightInfo's THE INSTRUCTION LINE section.
import { lineFor } from "../../golem/nightInfo";

const state = () => ({
  // user call 2026-08-18: a fresh town shares. See DEFAULT_MODE's note for
  // exactly how much "everyone" opens up (one per-seat read, never the sheet).
  mode: DEFAULT_MODE,
  day: 0,
  entries: [],
  // FT-874: ON by default — a checklist nobody is asked to finish has no
  // teeth. The escape is unconditional and one tap per row (tick it, move
  // on), never blocking; see NightSheet's flipPhase/flashUnchecked.
  requireChecks: true
});

const getters = {
  /** Is tonight the FIRST night? Day 1 is the first night by construction. */
  isFirstNight: ({ day }) => day <= 1,

  /**
   * Tonight's ordered acting seats — the checklist itself.
   *
   * STORYTELLER ONLY, in every mode. The ordering of who wakes is not a
   * neutral fact: it names which characters are in play, so it is exactly as
   * secret as the grimoire. "Everyone" mode does not widen this.
   */
  roster(state, getters, rootState) {
    if (state.mode === "off") return [];
    if (rootState.session.isSpectator) return [];
    const first = getters.isFirstNight;
    const prop = first ? "firstNight" : "otherNight";
    const seats = [];
    rootState.players.players.forEach((player, seat) => {
      const trueRole = player.role || {};
      const shownRole = beliefOf(player);
      const believes = isBelieving(player);

      // FT-861: A BELIEVING SEAT CAN OWE THE STORYTELLER TWO ROWS, because two
      // different things happen at that chair on a night:
      //
      //   the PERFORMANCE — wake them and play out the character they think
      //   they have, at the position THAT character wakes. This is the row the
      //   user's correction is about: the Drunk wakes too, not only the
      //   Lunatic. The Drunk has no night of its own at all (firstNight and
      //   otherNight are both 0), so without this row a Drunk-as-Empath is
      //   simply missing from the checklist and never gets their number.
      //
      //   the TRUTH — the character the seat really is, at its own position,
      //   when it has one. Dropping this would lose real wakes: a true Lunatic
      //   is woken at the Lunatic's slot and its own reminder text IS the
      //   script for the deception ("Allow the Lunatic to do the actions of the
      //   Demon"), and the Marionette's first night is the Demon learning who
      //   they are. Neither is recoverable from the believed character.
      //
      // A seat that knows what it is is unchanged: one row, the way it was.
      const acting = believes
        ? [
            { role: shownRole, isPerformance: true },
            { role: trueRole, isPerformance: false }
          ]
        : [{ role: trueRole, isPerformance: false }];

      acting.forEach(({ role, isPerformance }) => {
        if (!role || !role.id) return;
        if (!(role[prop] > 0)) return;
        // FT-886: THE TWO TEXTS OF A ROW.
        //   official — the shipped reminder, written for a table with physical
        //              tokens ("points to a player", "show the token"). Still
        //              the row's fallback, and still the exact wording a
        //              storyteller can go and ask for.
        //   reminder — what the row SHOWS: our own line where one is written,
        //              the official text where none is. Keeping the display
        //              under the existing key means the sheet reads it without
        //              knowing any of this happened.
        const official = reminderFor(role, first);
        seats.push({
          seat,
          player,
          role,
          // both characters ride every row: the sheet shows the one that acts
          // big and the other one small, because the storyteller needs to know
          // which of the two they are looking at without a second lookup
          trueRole,
          shownRole,
          isPerformance,
          // does this seat know what it is at all? (true on BOTH of a
          // believing seat's rows — the sheet says a different thing on each)
          isBelieving: believes,
          night: role[prop],
          slots: targetCount(role, first),
          reminder: lineFor(role.id, first) || official,
          official
        });
      });
    });
    // Ordered by the raw night number rather than the players/nightOrder rank.
    // The two give the SAME order for a true role — the rank is just the dense
    // index of the sorted night numbers — but that getter is built from the
    // seated players' true characters, so a BELIEVED character's number is
    // frequently absent from it and would rank 0 and sort to the top of the
    // night. The raw number is the thing the rank was standing in for.
    seats.sort((a, b) => a.night - b.night || a.seat - b.seat);
    return seats.map((row, i) => ({ ...row, order: i + 1 }));
  },

  /**
   * Every entry the VIEWER is allowed to read.
   *   off         → nothing
   *   storyteller → the host reads all; a player reads nothing
   *   everyone    → the host reads all; a player reads only their own seat
   * The scoping happens here, before any component sees a row.
   */
  visibleEntries(state, getters, rootState) {
    if (state.mode === "off") return [];
    if (!rootState.session.isSpectator) return state.entries;
    if (state.mode !== "everyone") return [];
    return getters.myEntries;
  },

  /**
   * The viewer's OWN rows, PROJECTED to what a player may know.
   *
   * Two filters, and both matter:
   *
   *   WHICH ROWS — only rows logged against the seat this viewer holds,
   *   matched on the durable player id first and on the claimed seat index
   *   only when the row predates a claim.
   *
   *   WHICH FIELDS — `isFalseInfo` is the storyteller's private mark that
   *   what they said was a lie, and `done` is their walk-the-list state.
   *   Neither may reach a player, so this returns a NEW object that never
   *   carries them rather than a filtered entry a template might spread.
   *   The rule is that a secret must not be in the page at all; hiding a
   *   rendered one with CSS is the bug class this whole feature was warned
   *   about.
   */
  myEntries(state, getters, rootState) {
    if (state.mode !== "everyone") return [];
    const { playerId, claimedSeat } = rootState.session;
    if (!playerId && claimedSeat < 0) return [];
    return state.entries
      .filter(e => {
        if (e.playerId && playerId) return e.playerId === playerId;
        return claimedSeat >= 0 && e.seat === claimedSeat;
      })
      // FT-861: WHICH ROWS, second filter. A believing seat has a row for the
      // character it really is, and that row names it outright — the Lunatic's
      // own row would tell the Lunatic they are the Lunatic. A player may read
      // only rows about the character they were told they have, which is
      // exactly `roleId === shownRoleId`: true on every ordinary row, true on a
      // performance, false on a truth row. (Rows written before this field
      // existed carry no shownRoleId and stay readable.)
      .filter(e => !e.shownRoleId || e.shownRoleId === e.roleId)
      .map(e => ({
        id: e.id,
        day: e.day,
        phase: e.phase,
        seat: e.seat,
        roleName: e.roleName,
        // their own choices, by the names those seats wore that night
        targetNames: (e.targetNames || []).filter(Boolean),
        // what they were TOLD — never whether it was true. FT-862 added
        // number/characterName alongside the original ping; characterId is
        // deliberately NOT projected (a player gets the name shown to them,
        // never an id to cross-reference against anything else — the same
        // reasoning targetNames-not-targets already applies here).
        ping: e.told ? e.told.ping : null,
        number: e.told && e.told.number !== undefined ? e.told.number : null,
        characterName: e.told ? e.told.characterName : "",
        text: e.told ? e.told.text : ""
      }));
  },

  /** How much of tonight the storyteller has walked. */
  progress(state, getters) {
    const rows = getters.roster;
    const byId = new Map(state.entries.map(e => [e.id, e]));
    let done = 0;
    rows.forEach(r => {
      const e = byId.get(entryId(state.day, r.seat, r.role.id));
      if (e && e.done) done++;
    });
    return { done, total: rows.length };
  }
};

const actions = {
  /**
   * Write to tonight's row for a seat, creating the entry on first touch.
   * This is the ONLY way a row is born, which is what keeps the log free of
   * empty rows for seats the storyteller never logged.
   */
  write({ state, commit, rootState }, { row, patch }) {
    const id = entryId(state.day, row.seat, row.role.id);
    const existing = state.entries.find(e => e.id === id);
    if (!existing) {
      const player = rootState.players.players[row.seat] || {};
      commit(
        "addEntry",
        Object.assign(
          makeEntry({
            day: state.day,
            seat: row.seat,
            seatName: player.name || "",
            playerId: player.id || "",
            roleId: row.role.id,
            roleName: row.role.name || "",
            // FT-861: both of the seat's characters, stamped at the moment the
            // row was written — so a finished game can be read back and say
            // what each player believed, night by night, without the grimoire
            // that produced it. (Rows fall back to the acting character, which
            // is what a seat that knows itself has anyway.)
            trueRoleId: (row.trueRole && row.trueRole.id) || row.role.id,
            trueRoleName:
              (row.trueRole && row.trueRole.name) || row.role.name || "",
            shownRoleId: (row.shownRole && row.shownRole.id) || row.role.id,
            shownRoleName:
              (row.shownRole && row.shownRole.name) || row.role.name || "",
            isPerformance: !!row.isPerformance,
            order: row.order,
            slots: row.slots
          }),
          patch
        )
      );
      return;
    }
    commit("patchEntry", { id, patch });
  }
};

const mutations = {
  setMode(state, mode) {
    if (MODES.includes(mode)) state.mode = mode;
  },
  /** FT-874: NightModeRow's "Require checks" toggle. */
  setRequireChecks(state, require) {
    state.requireChecks = !!require;
  },
  setDay(state, day) {
    state.day = Math.max(0, parseInt(day, 10) || 0);
  },
  addEntry(state, entry) {
    state.entries.push(entry);
  },
  /**
   * Patch a row in place. Every key already exists (makeEntry populates the
   * whole shape), so plain assignment stays reactive under Vue 2 — and the
   * splice re-publishes the array for any consumer watching it whole.
   */
  patchEntry(state, { id, patch }) {
    const index = state.entries.findIndex(e => e.id === id);
    if (index < 0) return;
    const entry = state.entries[index];
    Object.keys(patch).forEach(key => {
      entry[key] = patch[key];
    });
    entry.at = new Date().toISOString();
    state.entries.splice(index, 1, entry);
  },
  /**
   * FT-882: take a row back out of the log, by entry id.
   *
   * The whole entry goes — targets, told, the false-info mark and the tick —
   * so the row reads as never-written rather than as written-and-empty. A
   * missing id is a no-op: the sheet only offers this where an entry exists,
   * and a double-fire must not throw.
   */
  removeEntry(state, id) {
    const index = state.entries.findIndex(e => e.id === id);
    if (index < 0) return;
    state.entries.splice(index, 1);
  },
  /** Restore a stashed log (persistence only). */
  setLog(state, { day, entries } = {}) {
    state.day = day || 0;
    state.entries = Array.isArray(entries) ? entries : [];
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
