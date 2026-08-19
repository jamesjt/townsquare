/**
 * Golem fork (FT-860): THE NIGHT MODULE — the storyteller's checklist state
 * and the append-only night log.
 *
 * WHAT LIVES HERE
 *   mode     the town's visibility setting: off | storyteller | everyone
 *   day      the day counter. 0 = the town has not reached its first night;
 *            entering a night increments it (see the root toggleNight
 *            mutation, which is the ONE place that does it, so every path
 *            that flips the phase — the sheet's button, the S hotkey, the
 *            menu — moves the counter identically).
 *   entries  the log. Append-only: rows are added when the storyteller first
 *            writes to them and are never removed, only patched in place.
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

const state = () => ({
  // user call 2026-08-18: a fresh town shares. See DEFAULT_MODE's note for
  // exactly how much "everyone" opens up (one per-seat read, never the sheet).
  mode: DEFAULT_MODE,
  day: 0,
  entries: []
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
  roster(state, getters, rootState, rootGetters) {
    if (state.mode === "off") return [];
    if (rootState.session.isSpectator) return [];
    const first = getters.isFirstNight;
    const key = first ? "first" : "other";
    const prop = first ? "firstNight" : "otherNight";
    const order = rootGetters["players/nightOrder"];
    const seats = [];
    rootState.players.players.forEach((player, seat) => {
      const role = player.role;
      if (!role || !role.id) return;
      if (!(role[prop] > 0)) return;
      const rank = order.get(player);
      seats.push({
        seat,
        player,
        role,
        // the canonical rank from the shared getter; the raw night number is
        // the tiebreak so two seats never trade places between renders
        rank: (rank && rank[key]) || 0,
        night: role[prop],
        slots: targetCount(role, first),
        reminder: reminderFor(role, first)
      });
    });
    seats.sort((a, b) => a.rank - b.rank || a.night - b.night || a.seat - b.seat);
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
      .map(e => ({
        id: e.id,
        day: e.day,
        phase: e.phase,
        seat: e.seat,
        roleName: e.roleName,
        // their own choices, by the names those seats wore that night
        targetNames: (e.targetNames || []).filter(Boolean),
        // what they were TOLD — never whether it was true
        ping: e.told ? e.told.ping : null,
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
