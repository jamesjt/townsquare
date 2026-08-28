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
 *   requireChecks  FT-874: a TOWN setting, like `mode` (FT-1168 moved both off
 *                  the standing keys they were born on and onto the town's own
 *                  per-host stash) — how hard the checklist is enforced when
 *                  the night ends. TRI-STATE:
 *                  off (silent) | warn (ends, and says what was skipped) |
 *                  required (blocked until every row is ticked). Read by
 *                  NightSheet's `canFlip` and `warnUnchecked`; set from the
 *                  chip on NightModeRow's own row, beside the mode switch.
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
  CHECK_MODES,
  DEFAULT_CHECK_MODE,
  targetCount,
  reminderFor,
  entryId,
  makeEntry,
  // FT-1005: the player-safe projection, shared with the socket layer's
  // sender so the wire shape and the client state shape cannot drift.
  projectPlayerRow,
  // FT-1101: THE one definition of "is the night asking this seat for
  // something". FT-1107 puts it behind the getters below so the clock face,
  // the seats and the chronicles all read the same answer rather than each
  // rebuilding the call from root state.
  tonightActionFor
} from "../../golem/nightLog";
// FT-861: what a seat IS versus what its player is TOLD it is.
import { beliefOf, isBelieving } from "../../golem/belief";
// FT-886: our own one-line instruction for a character's night action, where
// one is written — see golem/nightInfo's THE INSTRUCTION LINE section.
// FT-874 (2026-08-19): …and whether a character still wakes once its seat is
// DEAD — see that file's WAKING WHEN DEAD section for the eleven and the sweep
// that found them.
import { lineFor, deadStillWakes, deadWakeTeams } from "../../golem/nightInfo";

const state = () => ({
  // user call 2026-08-18: a fresh town shares. See DEFAULT_MODE's note for
  // exactly how much "everyone" opens up (one per-seat read, never the sheet).
  mode: DEFAULT_MODE,
  day: 0,
  entries: [],
  // FT-874 shipped this "required"; FT-1168 (user call) makes a fresh town
  // "warn" — the list still says what was skipped, and the button still works.
  // The escape was already unconditional and one tap per row (tick it, move
  // on); see NightSheet's flipPhase/flashUnchecked.
  //
  // TRI-STATE since 2026-08-19 (user call): off | warn | required. See
  // CHECK_MODES in golem/nightLog for what each one does. The key keeps its
  // FT-874 name — every consumer already reads `night.requireChecks`, and
  // what it holds is still "how much this town requires the checks".
  requireChecks: DEFAULT_CHECK_MODE,
  // FT-1173: STAGED DEATHS — the storyteller's queue of shrouds (and lifted
  // shrouds) for THIS night, applied only when the night ends. Entries are
  // { seat, playerId, name, roleName, dir: "death"|"revive" }; the direction
  // is decided when the entry is STAGED, from the seat's own state at that
  // moment (a living seat stages a death, a dead one a revive).
  //
  // HOST-LOCAL BY CONSTRUCTION: none of the three staged mutations appears in
  // socket.js's subscription table, so nothing about a staged (i.e. merely
  // intended) death ever crosses the wire — the town learns of a death when
  // End night commits it through the same players/update path the direct
  // shroud click takes, and not a frame sooner. Persisted beside the log
  // (see golem/nightLog's saveLog) so a stage survives the sheet closing any
  // way but End night; only the commit — or the storyteller removing the
  // entry — clears it.
  staged: [],
  // FT-1005: A PLAYER'S OWN NIGHT ROWS, AS DELIVERED — the receiving half of
  // the host's "night" frame, and the ONLY night data a spectator client ever
  // holds. `live` is the host's actual sharing verdict (their mode is
  // "everyone"), which gates the drawer's input surface — a player's own
  // localStorage mode default says nothing about the town they joined.
  // `rows` are projectPlayerRow shapes, re-projected on the way in (see
  // setPlayerNight) so the lie mark cannot exist in this state no matter what
  // arrives. FT-1291: the storyteller's tick DOES arrive, as `sent`, and only
  // ever on this seat's own row — it is what closes this seat's picker once
  // the answer has gone out. Transient by design: not persisted, emptied with
  // the frame that says so.
  playerNight: { live: false, rows: [] }
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
    // FT-874 (2026-08-19): does anything in play keep DEAD seats of a whole
    // team waking? In practice this is the Vigormortis and its Minions, and on
    // almost every town it comes back empty. Computed once per roster read
    // rather than per seat — it is a fact about the TOWN, not about a chair.
    const deadTeams = deadWakeTeams(
      rootState.players.players.map(p => (p.role && p.role.id) || "")
    );
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
        // FT-874 (2026-08-19): A DEAD SEAT DOES NOT WAKE — unless its
        // character says otherwise. The checklist is scanned under time
        // pressure and a row for a seat that cannot act is pure noise; but for
        // eleven characters DYING IS THE TRIGGER (the Ravenkeeper's own line
        // already read "Only if they died tonight"), and dropping those
        // deletes the row at the one moment it is needed.
        //
        // The test runs against `role`, which on a believing seat's
        // PERFORMANCE row is the character the player THINKS they have — and
        // that is right: a dead Drunk who believes they are the Ravenkeeper is
        // still walked through the Ravenkeeper's wake.
        if (player.isDead && !deadStillWakes(role, deadTeams)) return;
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
   *   what they said was a lie. It may not reach a player, so this returns a
   *   NEW object that never carries it rather than a filtered entry a template
   *   might spread. The rule is that a secret must not be in the page at all;
   *   hiding a rendered one with CSS is the bug class this whole feature was
   *   warned about. (FT-1291: the storyteller's tick crosses as `sent` — a
   *   fact about this player's OWN row and the reason their picker stands
   *   down. projectPlayerRow holds the reasoning for why that one is not a
   *   secret.)
   */
  myEntries(state, getters, rootState) {
    // FT-1005: A CONNECTED PLAYER READS WHAT THE HOST DELIVERED, nothing
    // else. Their local `entries` are empty in a live town (the log lives on
    // the host's client alone), so before the "night" frame existed this
    // getter could only ever answer [] for them; now it answers with the
    // host-projected rows, already sanitised on the way into the store. The
    // host's own sharing mode gated the send, so no further mode check
    // belongs here — a player's local mode is a different browser's setting.
    //
    // FT-1107 rider (user): the town's visibility setting governs THE ASK,
    // not THE RECORD. On "Storyteller" the host sends this seat's rows all
    // the same and only `live` goes false, so a player who was never asked
    // still reads what the storyteller entered for them. Only "off" — no
    // sheet, no log — sends nothing at all. See socket.js sendNightRows.
    if (rootState.session.isSpectator) return state.playerNight.rows;
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
      // FT-1005: the field projection moved to golem/nightLog's
      // projectPlayerRow — ONE definition of "what a player may know about
      // their own row", shared with the host's wire sender and the receiving
      // client's sanitiser. Same rules as the inline map it replaces (told
      // flattened, characterId withheld, isFalseInfo/done ABSENT), plus the
      // keys FT-1005 added (targets for the player's own pickers, roleId to
      // match the live row, playerText — their own words).
      .map(projectPlayerRow);
  },

  /**
   * FT-1107: IS THE NIGHT ASKING **THIS CLIENT** FOR SOMETHING RIGHT NOW?
   *
   * The same question ChroniclesDrawer and ChroniclesNights each asked for
   * themselves, asked ONCE here instead — because FT-1107 moved the asking
   * onto the clock face, and the clock face is not one component: the ask
   * itself renders in the town readout (TownInfo) while the picking happens
   * on the seats (Player). Two components reconstructing "am I being asked"
   * from root state is exactly the drift the FT-1101 fold was about, one
   * level up.
   *
   * `tonightActionFor` stays the definition; this getter only feeds it the
   * four things it wants, from the one place that holds them all.
   *
   * STORYTELLER NEVER: the host runs the checklist, they are not asked by it.
   *
   * `live` is the HOST's sharing verdict (playerNight.live, delivered with
   * the rows), never this browser's own saved night mode — see the FT-1101
   * note in ChroniclesDrawer for the bug that rule came from. This is THE
   * ask gate, and it is the only thing the town's "Storyteller" visibility
   * setting switches off: a player in a Storyteller-only town is not asked,
   * and still reads whatever the storyteller entered on their behalf
   * (FT-1107 rider — see sendNightRows, which shares the ROWS in every mode
   * but "off").
   */
  myCall(state, getters, rootState) {
    if (!rootState.session.isSpectator) return null;
    return tonightActionFor({
      isNight: rootState.grimoire.isNight,
      live: state.playerNight.live,
      day: state.day,
      me:
        rootState.players.players.find(
          (p) => p.id && p.id === rootState.session.playerId,
        ) || null,
    });
  },

  /**
   * FT-1107: this seat's delivered row for tonight's call, or null before the
   * host has echoed anything. The echo is the truth — a pick is not "made"
   * until the host says so, which is what keeps a refused pick (a slot the
   * storyteller filled themselves) from sticking on a coin.
   */
  myCallRow(state, getters) {
    const call = getters.myCall;
    if (!call) return null;
    return (
      getters.myEntries.find(
        (r) => r.day === state.day && (!r.roleId || r.roleId === call.role.id),
      ) || null
    );
  },

  /**
   * FT-1107: the seats this client has picked tonight, in slot order, as the
   * HOST recorded them. `-1` is an empty slot and is kept in place — the slot
   * a coin lands in is the first empty one, so the holes matter.
   */
  myCallTargets(state, getters) {
    const row = getters.myCallRow;
    if (!row || !Array.isArray(row.targets)) return [];
    return row.targets;
  },

  /**
   * FT-1291: HAS THE STORYTELLER ANSWERED THIS SEAT AND SENT IT?
   *
   * The one question the ring and the face both have to ask before offering a
   * pick, asked once here — the FT-1101 rule that put `myCall` in this module
   * rather than in two components. Player.vue owns the coins and NightCall
   * owns the words; they must not be able to disagree about whether tonight's
   * choice is still open.
   *
   * It reads the HOST's echoed row (`sent`, projected by golem/nightLog), so
   * this is the delivered truth and never a local guess — and it comes back
   * false the moment the storyteller reopens, because reopening clears the
   * same flag and the next frame carries it. The lock follows the row.
   *
   * False before anything is echoed, which is the honest answer: a row that
   * does not exist yet has not been sent.
   */
  myCallSent(state, getters) {
    const row = getters.myCallRow;
    return !!(row && row.sent);
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
  },

  /**
   * FT-1005: A PLAYER'S OWN NIGHT INPUT, ARRIVING AT THE HOST — the merge
   * half of the "nightAction" frame (socket.js resolved the sender to a seat
   * and verified the roleId is the character that seat was TOLD it has).
   *
   * THE OWNERSHIP RULE, per slot:
   *   · an empty slot, or one the player filled earlier, takes the player's
   *     pick and wears the "player" mark (targetsBy);
   *   · a slot the STORYTELLER filled stands — a later player frame never
   *     silently overwrites the storyteller's own record. The storyteller's
   *     edit is the authority the whole sheet already treats it as.
   *   · a player clearing their own pick (-1) empties the slot AND its mark,
   *     so the storyteller may fill it after.
   *
   * `text` is the player's own words (playerText) — theirs alone, so it
   * always applies; the storyteller's free note (told.text) is a different
   * field and never collides.
   *
   * ── FT-1291 (user): A SENT ROW IS CLOSED TO THE PLAYER TOO ─────────────
   *
   * "After a storyteller has sent a message to a user they shouldn't be able
   * to change their selection. Fortune teller can change theirs after the
   * send."
   *
   * FT-1272 locked every control on the STORYTELLER's half of a sent row, for
   * the reason written at NightSheet's `isLocked`: the row composed something
   * that has already been delivered, and letting it change silently rewrites
   * an answer somebody was given. The player's half was never locked, so the
   * identical damage was still one click away from the other side — and worse
   * shaped, because what changes there are the PICKS the answer was computed
   * from. A Fortune Teller told "no" about seats 3 and 6 could point at seat 5
   * and be left holding a "no" that was never about seat 5.
   *
   * So the refusal lives HERE, at the merge, and not only in the picker that
   * calls it. This is the host's own store — the one authority in the room —
   * and a client can always be lied to, or be running an older bundle, or be
   * mid-flight when the Send lands. The UI lock is the courtesy; this is the
   * truth.
   *
   * WHOLE-ROW, NOT PER-SLOT, and deliberately: `done` is a fact about the row,
   * the storyteller's own lock is whole-row (every seat picker on a sent row
   * goes dead, filled or empty), and a half-open row would let a Fortune
   * Teller add a second seat to an answer that has already been given about
   * the first. The two halves have to close on the same boundary or they
   * disagree about what "sent" means.
   *
   * IT FOLLOWS THE ROW BOTH WAYS. Reopening is the same Send button's other
   * job and clears `done` through the ordinary patch, so the player's picks
   * come live again with the storyteller's — no latch, no second flag, and
   * nothing to keep in step.
   *
   * Silent when the town is not sharing (mode !== "everyone"), when the row
   * has been sent, when nothing on tonight's roster matches, or when nothing
   * actually changes — the last so an idle re-send does not restamp `at` on
   * every entry it grazes. Every one of those refusals is answered anyway:
   * socket.js re-sends this seat's rows after the merge either way, so a
   * refused pick is told the standing truth rather than left hanging.
   */
  applyPlayerAction(
    { state, getters, dispatch, rootState },
    { seat, roleId, targets, text }
  ) {
    if (state.mode !== "everyone") return;
    const row = getters.roster.find(
      r => r.seat === seat && r.role.id === roleId
    );
    if (!row) return;
    const id = entryId(state.day, seat, roleId);
    const existing = state.entries.find(e => e.id === id);
    // FT-1291: the sent row refuses — see the note above. Ahead of the patch
    // build so it covers BOTH the picks and the player's own words: `text`
    // rides the same frame and the same delivered answer.
    if (existing && existing.done) return;
    const cur = existing || {
      targets: new Array(row.slots).fill(-1),
      targetNames: new Array(row.slots).fill(""),
      targetsBy: new Array(row.slots).fill(""),
      playerText: ""
    };
    const patch = {};
    if (Array.isArray(targets)) {
      const t = (cur.targets || []).slice();
      const names = (cur.targetNames || []).slice();
      const by = (cur.targetsBy || []).slice();
      while (t.length < row.slots) t.push(-1);
      while (names.length < row.slots) names.push("");
      while (by.length < row.slots) by.push("");
      let changed = false;
      const seats = rootState.players.players;
      for (let i = 0; i < row.slots; i++) {
        const v = targets[i];
        if (v === undefined || v === null) continue;
        const s = Number.isInteger(v) && v >= 0 && v < seats.length ? v : -1;
        // a storyteller-entered value stands (filled slot, no player mark)
        if (t[i] !== -1 && by[i] !== "player") continue;
        if (t[i] === s) continue;
        t[i] = s;
        by[i] = s === -1 ? "" : "player";
        // the name is stamped host-side from the seat, never trusted off the
        // wire — the same "seats move, replays need the name worn tonight"
        // rule setTarget applies
        names[i] = (seats[s] && seats[s].name) || "";
        changed = true;
      }
      if (changed) {
        patch.targets = t;
        patch.targetNames = names;
        patch.targetsBy = by;
      }
    }
    if (typeof text === "string") {
      const clean = text.slice(0, 280);
      if (clean !== (cur.playerText || "")) patch.playerText = clean;
    }
    if (Object.keys(patch).length) dispatch("write", { row, patch });
  }
};

const mutations = {
  setMode(state, mode) {
    if (MODES.includes(mode)) state.mode = mode;
  },
  /**
   * FT-874: NightModeRow's enforcement chip — off | warn | required.
   *
   * Guarded like setMode above rather than coerced: an unknown value is
   * ignored, so a stale boolean arriving from anywhere cannot land the store
   * in a state no branch of canFlip handles. (loadRequireChecks does the
   * boolean read-across before this ever sees it.)
   */
  setRequireChecks(state, checkMode) {
    if (CHECK_MODES.includes(checkMode)) state.requireChecks = checkMode;
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
  /**
   * FT-1005: the "night" frame landing on a player's client — the host's
   * projected rows for THIS seat, plus the town's live sharing verdict.
   *
   * RE-PROJECTED ON THE WAY IN, not trusted: every row is passed back through
   * projectPlayerRow, which builds a fresh object holding exactly the allowed
   * keys — so `isFalseInfo` (the lie mark) cannot exist anywhere in this
   * client's state even if a frame carried them. Absent, not hidden: the same
   * rule the projection has enforced since FT-860. FT-1291 added `sent` to the
   * allowed set, and the whitelist is what makes that a decision rather than a
   * leak — one named key crossed, everything else still refused by default.
   */
  setPlayerNight(state, { live, rows } = {}) {
    state.playerNight = {
      live: !!live,
      rows: (Array.isArray(rows) ? rows : []).map(projectPlayerRow)
    };
  },

  /**
   * FT-1005: THE PLAYER SPEAKS — their own picks and words for tonight's
   * action, riding a mutation like every wire event in this app (the
   * session/callBack idiom): the socket plugin listens for this commit and is
   * the one place that sends it, direct to the host and nowhere else. The
   * stamp is the only state it keeps — the truth of what was entered comes
   * back as the host's own "night" frame, never from local optimism.
   */
  playerAction(state) {
    state.playerNight = { ...state.playerNight, sentAt: Date.now() };
  },

  /**
   * FT-1173: queue one seat's death (or revive) for the night's end. A seat
   * already staged is REPLACED rather than doubled — re-picking the same
   * chair refreshes its direction from the chair's current state, which is
   * what a storyteller re-picking means.
   */
  stageDeath(state, entry) {
    if (!entry || typeof entry.seat !== "number") return;
    state.staged = state.staged
      .filter((s) => s.seat !== entry.seat)
      .concat([
        {
          seat: entry.seat,
          playerId: entry.playerId || "",
          name: entry.name || "",
          roleName: entry.roleName || "",
          dir: entry.dir === "revive" ? "revive" : "death",
        },
      ]);
  },
  /** FT-1173: un-stage one entry — nothing has happened yet, so nothing is
   *  undone; the queued intention simply leaves the list. */
  unstageDeath(state, index) {
    if (index < 0 || index >= state.staged.length) return;
    state.staged = state.staged
      .slice(0, index)
      .concat(state.staged.slice(index + 1));
  },
  /** FT-1173: the commit emptied the queue (End night applied every entry). */
  clearStaged(state) {
    state.staged = [];
  },

  /** Restore a stashed log (persistence only). */
  setLog(state, { day, entries, staged } = {}) {
    state.day = day || 0;
    state.entries = Array.isArray(entries) ? entries : [];
    // FT-1173: the staged queue rides the same stash — see its state note.
    state.staged = Array.isArray(staged) ? staged : [];
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
