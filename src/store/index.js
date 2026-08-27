import Vue from "vue";
import Vuex from "vuex";
import persistence from "./persistence";
// FT-1163: stamps WHEN a seat died, at the instant the shroud goes down —
// the only instant that fact exists. See the file header.
import deathMoment from "./deathMoment";
import socket from "./socket";
import players from "./modules/players";
import session from "./modules/session";
// FT-860: the storyteller's night checklist + append-only night log.
import night from "./modules/night";
// FT-965: THE TOWN LOG. The merge/cursor/visibility rules live in the module,
// not in these mutations — see golem/chat.js for why "no gap, no duplicate" is
// a property of the data structure rather than of arrival timing.
import {
  canSee,
  catchUp,
  levelSilences,
  mergeLog,
  SCOPES,
  seatOf,
  viewerOf,
} from "../golem/chat";
// FT-1263: a bystander's traffic row — the plane's memory in the Chronicle.
import { TRAFFIC_KIND } from "../golem/whisperMarks";
// FT-1206: the town's chat level rides the tower shelf; ingest reads it as a
// plain snapshot (towerState is the module's own single copy, sanitized on
// every write), the same way the components snapshot it.
import { towerState } from "../golem/towerBells";
// FT-1019: the chronicles stream's filter vocabulary — the store holds which
// one is showing so the V hotkey can arm "gallows" before the drawer opens.
import { FILTERS } from "../golem/chronicles";
// FT-1040: a FORGED role's composed night action (role.golemNight) registers
// into the night schema as the script loads, so the checklist, the player
// prompt and the chronicle all answer for it natively — see nightInfo's
// AUTHORED NIGHT ACTIONS section.
import { registerAuthoredNight, resetAuthoredNight } from "../golem/nightInfo";
import editionJSON from "../editions.json";
import rolesJSON from "../roles.json";
import fabledJSON from "../fabled.json";
import jinxesJSON from "../hatred.json";

Vue.use(Vuex);

// helper functions
const getRolesByEdition = (edition = editionJSON[0]) => {
  return new Map(
    rolesJSON
      .filter((r) => r.edition === edition.id || edition.roles.includes(r.id))
      .sort((a, b) => b.team.localeCompare(a.team))
      .map((role) => [role.id, role]),
  );
};

const getTravelersNotInEdition = (edition = editionJSON[0]) => {
  return new Map(
    rolesJSON
      .filter(
        (r) =>
          r.team === "traveler" &&
          r.edition !== edition.id &&
          !edition.roles.includes(r.id),
      )
      .map((role) => [role.id, role]),
  );
};

const set =
  (key) =>
  ({ grimoire }, val) => {
    grimoire[key] = val;
  };

const toggle =
  (key) =>
  ({ grimoire }, val) => {
    if (val === true || val === false) {
      grimoire[key] = val;
    } else {
      grimoire[key] = !grimoire[key];
    }
  };

const clean = (id) => id.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

// global data maps
const editionJSONbyId = new Map(
  editionJSON.map((edition) => [edition.id, edition]),
);
const rolesJSONbyId = new Map(rolesJSON.map((role) => [role.id, role]));
const fabled = new Map(fabledJSON.map((role) => [role.id, role]));

// jinxes
let jinxes = {};
try {
  // Note: can't fetch live list due to lack of CORS headers
  // fetch("https://bloodontheclocktower.com/script/data/hatred.json")
  //   .then(res => res.json())
  //   .then(jinxesJSON => {
  jinxes = new Map(
    jinxesJSON.map(({ id, hatred }) => [
      clean(id),
      new Map(hatred.map(({ id, reason }) => [clean(id), reason])),
    ]),
  );
  // });
} catch (e) {
  console.error("couldn't load jinxes", e);
}

// base definition for custom roles
const customRole = {
  id: "",
  name: "",
  image: "",
  ability: "",
  edition: "custom",
  firstNight: 0,
  firstNightReminder: "",
  otherNight: 0,
  otherNightReminder: "",
  reminders: [],
  remindersGlobal: [],
  setup: false,
  team: "townsfolk",
  isCustom: true,
  // Golem fork (FT-851): appended LAST so upstream's numeric key mapping is
  // unchanged. golemIcon = an official role id whose bundled icon this custom
  // role reuses; golemRoleId = the role-library id (lineage/edit handle).
  golemIcon: "",
  golemRoleId: "",
  // FT-1040: the composed night action the forge authored — a full schema
  // entry ({wakes, fields, label, line, mayBeFalse}), null when none was
  // composed. In this template so it survives customRolesStripped's wire
  // form (only template keys ride the numeric mapping to other clients).
  golemNight: null,
  // FT-1042: the art's FIT on the coin — scale (0.4–2, default 1) and x/y
  // offsets in percent of the coin's width (±50, default 0). Appended LAST
  // so the numeric wire mapping's existing keys are unchanged; in this
  // template so the fit rides customRolesStripped to every client — the
  // adjustment is part of the role, 1:1 in game. Token.vue clamps at render.
  golemArtScale: 1,
  golemArtX: 0,
  golemArtY: 0,
};

export default new Vuex.Store({
  modules: {
    players,
    session,
    night,
  },
  state: {
    grimoire: {
      isNight: false,
      isNightOrder: true,
      // FT-999b (2026-08-20, user call): a game starts with the grimoire
      // REVEALED. FT-999 already reveals on deal, but isPublic was not
      // restored across a reload, so every host refresh reset to face-down
      // until the next deal or a G press. Revealed is the resting state now;
      // the streaming hide stays one G away. Players are unaffected — their
      // join path commits toggleGrimoire(false) anyway (golem/townRoute).
      isPublic: false,
      isMenuOpen: false,
      // Golem fork (2026-08-19): the demon's bluffs cluster, shown or hidden.
      // In the store rather than on TownSquare because the switch is a mark in
      // the MENU STRIP now (Menu.vue) and the cluster it drives is somewhere
      // else entirely. Defaults SHOWN on every viewport (user call) and is
      // stashed by persistence.js.
      isBluffsOpen: true,
      isStatic: false,
      isMuted: false,
      isImageOptIn: false,
      zoom: 0,
      background: "",
      // Golem fork (FT-936, moved to the store FT-991): the centre-face
      // splat's FROZEN seed for THIS client's view of the current game —
      // null until TownSquare.vue's created()/subscribe sets it (see that
      // file's own comment for what freezes it and why). In the store
      // rather than component-local data because TownInfo.vue reads it too
      // now (its `.info` background carries the splat, replacing the old
      // demon-head knocker) and TownInfo, unlike TownSquare, is NOT always
      // mounted — it unmounts and remounts around every nomination (App.vue
      // swaps it for Vote.vue) — so a component-local field would forget
      // the frozen mark on the very next vote. Never stashed to
      // localStorage (no persistence.js entry, deliberately) — per-tab,
      // per-load, same as it was as local data before this move.
      faceSplatSeed: null,
    },
    modals: {
      edition: false,
      fabled: false,
      gameState: false,
      nightOrder: false,
      reference: false,
      reminder: false,
      role: false,
      roles: false,
      roleDrawer: false,
      // FT-857: the PLAYER's script drawer (right side) — the one surface for
      // the reference sheet and the night order. The old `reference` and
      // `nightOrder` overlay flags stay in place; nothing routes to them.
      scriptDrawer: false,
      // FT-858: the VOTE HISTORY drawer (right side, beside the script) — the
      // nomination log's surface now. `voteHistory` below is the old overlay:
      // it stays in place and still renders the same body, unrouted.
      voteDrawer: false,
      voteHistory: false,
      // FT-860: a PLAYER's own night information — the third right-hand
      // drawer, and the only night surface a non-storyteller ever gets.
      nightDrawer: false,
      // FT-886: THE CHRONICLE — this game's own timeline, the fourth drawer on
      // the right-hand rail. It holds no state of its own: golem/chronicle
      // assembles it out of the night log, the vote history and the seats
      // every time it renders, so this flag is the whole of its footprint here.
      chronicleDrawer: false,
      // FT-965: THE TOWN CHAT — the fifth drawer on the right-hand rail, and
      // the only one that is not scoped to the game being played. Its contents
      // live in `chat` below rather than being reassembled per render, because
      // unlike the chronicle it is fed by the wire and cannot be derived.
      chatDrawer: false,
      // FT-1010: CHRONICLES — the town's whole story as one surface: the
      // chat log, the game events and the town records merged (user decision,
      // 2026-08-20). This is the drawer the strip's quill opens now. The two
      // flags above stay in place, unrouted — their components are retired by
      // unmounting, never deleted.
      chroniclesDrawer: false,
      // FT-1146: THE RECORDS PAGE — what has happened across every town, on
      // its own full-window surface (StatsOverlay.vue, the old town-records
      // overlay grown up). A modal rather than a component-local flag because
      // it is opened from three unrelated places — the entry screen, the
      // Chronicles drawer's boards line, and App's own strip wiring — and
      // `toggleModal` closing whatever else was open is exactly right: this
      // is a page you go to, not a panel you raise over the town.
      records: false,
    },
    /**
     * FT-965: THE TOWN'S ONE PERMANENT ROOM.
     *
     *  log        rows, ascending by `seq`, deduped by `seq`. Whispers this
     *             viewer was not party to never enter it (see `chatIngest`).
     *  syncedSeq  the high-water mark below which `log` is COMPLETE and
     *             CONTIGUOUS. Only the REST catch-up advances it; a live row
     *             arriving out of the blue proves nothing about its
     *             predecessors and must never move it. This separation is what
     *             makes a reconnect re-fetch the right range.
     *  scope      which slice is being LOOKED at — "town" | "game" | "none".
     *             A view, never a fetch: catch-up always reads the whole town.
     *  gameId     the game currently being played, or null between games. The
     *             host derives it; a player is told it on the gamestate sync.
     */
    chat: {
      log: [],
      syncedSeq: 0,
      syncing: false,
      scope: "town",
      gameId: null,
      error: "",
      /**
       * FT-1263: WHISPER TRAFFIC THIS BYSTANDER SAW FLY — local rows of
       * golem/whisperMarks' TRAFFIC_KIND, written by `chatMarkTraffic` when
       * a validated whisperMark lands and this viewer is NOT a party to it
       * (a party's own log holds the whisper row itself — that is their
       * record). Client ephemera, never merged into `log`: no store seq, no
       * wire row, forgotten on reload — the plane's memory, no more.
       */
      marks: [],
    },
    // FT-854: the role drawer's click-to-place selection (a role object,
    // or null) — clicking a seat's token places it
    drawerPick: null,
    // Which SEAT the armed character was picked up from, or null when it came
    // off a list (the tray, the grimoire drawer). This is the tap path's twin
    // of the drag's `golem/from` payload, and it is what makes tapping a
    // second seat a SWAP rather than an overwrite — the same trade the drag
    // has always done. Local view state: neither persisted nor synced.
    drawerPickFrom: null,
    // FT-854: when OFF (the default), a role lives in at most one chair —
    // placing it anywhere else MOVES it. Shared state so every placing path
    // (drag, click, assign, shuffle) obeys the same rule.
    allowDupRoles: false,
    /**
     * FT-1175: THE CHARACTERS THE STORYTELLER HAS SET ASIDE — role ids that
     * Deal must skip. Empty is the whole script, which is exactly how this
     * app has always dealt, so the feature costs nothing until it is used.
     *
     * IT IS A SET OF EXCLUSIONS, NOT A SET OF INCLUSIONS, and that is forced
     * rather than chosen: "which roles will be dealt" starts as ALL of them,
     * so a list of the included ones would have to be written out in full
     * before Deal worked at all, and a script swap would silently empty it.
     * A list of what is held back starts empty, means nothing until someone
     * means something by it, and a script swap simply leaves ids in it that
     * no longer match anything.
     *
     * AN ARRAY, NOT A Set: Vue 2's reactivity does not see into a Set, and
     * the tray paints one tile per role off this on every change.
     *
     * IT GOVERNS DEALING ONLY. An aimed placement — a drag onto a chair, the
     * tap path, the grimoire drawer — is the storyteller doing it on purpose
     * and is never refused; see RoleTray's own note.
     */
    dealExcluded: [],
    // FT-857: which tab the script drawer opens on — "team" | "first" |
    // "other". The strip's night icon lands on "first".
    scriptDrawerView: "team",
    // FT-1019: which kind of line the chronicles stream shows — one of
    // golem/chronicles' FILTERS. Root state (not drawer-local) for the same
    // reason scriptDrawerView is: the V hotkey opens the drawer ALREADY
    // pointed at the gallows, so the pointer must exist before the drawer
    // does.
    chroniclesFilter: "all",
    // FT-1146: which recorded game the RECORDS page should open onto, or null
    // for its landing view. Root state for the same reason chroniclesFilter
    // is: the Chronicles drawer names the game BEFORE the page exists, and
    // `toggleModal` unmounts the drawer in the same breath — so the pointer
    // cannot live on either component. The page reads it once and clears it.
    recordsPick: null,
    edition: editionJSONbyId.get("tb"),
    roles: getRolesByEdition(),
    otherTravelers: getTravelersNotInEdition(),
    fabled,
    jinxes,
  },
  actions: {
    /**
     * FT-965: CATCH THE TOWN LOG UP over REST, from the contiguity cursor to
     * the store's head, and leave the cursor pointing at the new frontier.
     *
     * Safe to call at any time and from anywhere — the socket calls it on
     * every (re)connect, the drawer calls it on open. Overlapping calls are
     * refused rather than queued: the second one would fetch the same range as
     * the first and merge to nothing.
     *
     * The pages land as they arrive (`chatIngest` per page) so a long history
     * fills in progressively, and every one of them is deduped against
     * whatever the socket delivered in the meantime.
     */
    async chatCatchUp({ state, commit }) {
      const town = state.session.sessionId;
      if (!town || state.chat.syncing) return;
      commit("chatSyncing", true);
      try {
        const seq = await catchUp(town, state.chat.syncedSeq, (rows) => {
          commit("chatIngest", rows);
        });
        // The town can change under a fetch (a Back press, a hop between two
        // towns). `chatIngest` drops the rows themselves by townId; this stops
        // the OLD town's cursor being stamped onto the NEW town's empty log,
        // which would claim a completeness that was never fetched.
        if (state.session.sessionId === town) commit("chatSynced", seq);
      } catch (e) {
        commit("chatError", "Couldn't load the town log.");
      } finally {
        commit("chatSyncing", false);
      }
    },
  },
  getters: {
    /**
     * Return all custom roles, with default values and non-essential data stripped.
     * Role object keys will be replaced with a numerical index to conserve bandwidth.
     * @param roles
     * @returns {[]}
     */
    customRolesStripped: ({ roles }) => {
      const customRoles = [];
      const customKeys = Object.keys(customRole);
      const strippedProps = [
        "firstNightReminder",
        "otherNightReminder",
        "isCustom",
      ];
      roles.forEach((role) => {
        if (!role.isCustom) {
          customRoles.push({ id: role.id });
        } else {
          const strippedRole = {};
          for (let prop in role) {
            if (strippedProps.includes(prop)) {
              continue;
            }
            const value = role[prop];
            if (customKeys.includes(prop) && value !== customRole[prop]) {
              strippedRole[customKeys.indexOf(prop)] = value;
            }
          }
          customRoles.push(strippedRole);
        }
      });
      return customRoles;
    },
    rolesJSONbyId: () => rolesJSONbyId,
  },
  mutations: {
    setZoom: set("zoom"),
    setBackground: set("background"),
    // FT-991: committed once per freeze by TownSquare.vue's own
    // created()/subscribe — see that file and grimoire.faceSplatSeed above.
    setFaceSplatSeed: set("faceSplatSeed"),
    toggleMuted: toggle("isMuted"),
    toggleMenu: toggle("isMenuOpen"),
    /** Golem fork (2026-08-19): show/hide the demon's bluffs cluster. */
    toggleBluffsOpen: toggle("isBluffsOpen"),
    toggleNightOrder: toggle("isNightOrder"),
    toggleStatic: toggle("isStatic"),
    /**
     * FT-860: the phase flip, and the ONE place the day counter moves.
     *
     * Every path that reaches night comes through here — the night sheet's
     * button, the S hotkey, the menu, and the socket's incoming gamestate —
     * so putting the increment here is what stops the counter drifting
     * between them. It fires only on a real day→night TRANSITION: a full
     * gamestate sync re-commits the current value on every reconnect, and
     * that must not count as a new night.
     */
    toggleNight(state, val) {
      const wasNight = state.grimoire.isNight;
      toggle("isNight")(state, val);
      if (!wasNight && state.grimoire.isNight) {
        state.night.day += 1;
      }
    },
    /**
     * FT-931: THE TOWN ENDS. The host declared a winner (EndGameOverlay);
     * this is the one commit every client applies — the host's own, and a
     * spectator's when it arrives over the wire (socket.js commits this
     * exact mutation on receipt, the same "one type, two callers" shape
     * `toggleNight` above already uses).
     *
     * It sets the result AND forces the grimoire's reveal flag off in the
     * same commit, atomically — `isPublic` is Player.vue/TownSquare.vue's
     * existing "does a seat's coin show its character" switch (see
     * `#townsquare.public` in TownSquare.vue), reused rather than replaced:
     * once it is false and the true role has reached this client (the
     * gamestate sync, socket.js), the existing render pipeline draws the
     * reveal on its own — nothing here touches how a role is drawn.
     */
    endGame(state, winningTeam) {
      state.session.isEnded = true;
      state.session.winningTeam = winningTeam === "evil" ? "evil" : "good";
      state.grimoire.isPublic = false;
      // FT-1003: the end reveal shows everyone everything — a per-seat
      // grimoire grant has nothing left to grant, on either side of the wire.
      state.session.grimoireGrants = {};
      state.session.isGrimoireGranted = false;
    },
    /**
     * FT-931: PLAY AGAIN. Only the result and the reveal are this
     * mutation's concern — the roster's roles clear through the existing
     * `players/clearRoles` action (same table, a new game), dispatched
     * alongside this from wherever Play again is pressed (App.vue).
     */
    clearEnded(state) {
      state.session.isEnded = false;
      state.session.winningTeam = null;
      state.grimoire.isPublic = true;
      // FT-1003: a new game starts with no grimoire windows open anywhere —
      // the roles a grant delivered go through players/clearRoles alongside
      // this, exactly as the end reveal's do.
      state.session.grimoireGrants = {};
      state.session.isGrimoireGranted = false;
    },
    /**
     * FT-931: the R hotkey's mutation (and Menu's Hide/Show), guarded so the
     * game-end reveal cannot be hidden again while the town is still ended.
     * `endGame` / `clearEnded` below are the only other writers of
     * `grimoire.isPublic` during an ended town, and both always leave it
     * revealed — this is what makes that irreversible rather than a rule
     * every future isPublic writer has to remember to respect.
     */
    toggleGrimoire(state, val) {
      if (state.session.isEnded) return;
      toggle("isPublic")(state, val);
    },
    /**
     * FT-1003: THE GRANTED GRIMOIRE ARRIVES — one seat's client is shown the
     * whole town face-up. `seats` is [{index, role}] with roles already
     * resolved by the socket layer (never this client's own seat: the sender
     * skips it, so a seat whose belief differs from its truth can never learn
     * the difference from its own grant). The render path is FT-931's end
     * reveal verbatim — true roles present + isPublic off — scoped to the
     * live `isGrimoireGranted` flag instead of isEnded.
     */
    grantGrimoire(state, seats) {
      (seats || []).forEach(({ index, role }) => {
        const player = state.players.players[index];
        if (player) player.role = role;
      });
      state.session.isGrimoireGranted = true;
      state.grimoire.isPublic = false;
    },
    /**
     * FT-1003: the window closes. Clears every role the grant delivered —
     * everything except this client's own seat (their dealt view, which the
     * grant never touched) and travelers (public knowledge). Idempotent, so
     * a revoke frame arriving at a client that was never granted (a joiner's
     * self-healing sync) is a no-op.
     *
     * isPublic is deliberately NOT touched here: a player's normal state IS
     * isPublic=false (their join path commits toggleGrimoire(false) —
     * golem/townRoute), so the granted view and the normal view differ only
     * in which roles this client holds. Clearing the roles is the whole
     * revoke; writing isPublic=true would have flipped the seat into the
     * face-down streaming view no player ever sits in.
     */
    revokeGrimoire(state) {
      if (!state.session.isGrimoireGranted) return;
      const own = state.players.players.findIndex(
        (p) => p.id === state.session.playerId,
      );
      state.players.players.forEach((player, index) => {
        if (index === own) return;
        if (player.role && player.role.team === "traveler") return;
        player.role = {};
      });
      state.session.isGrimoireGranted = false;
    },
    toggleImageOptIn: toggle("isImageOptIn"),
    setAllowDupRoles(state, on) {
      state.allowDupRoles = !!on;
    },
    /** FT-1175: set a character aside from the deal, or put it back. One
     *  mutation for both directions — the tray's tiles are a toggle, and a
     *  pair of add/remove mutations would only give a caller a way to get
     *  the two out of step. */
    toggleDealExcluded(state, id) {
      if (!id) return;
      const at = state.dealExcluded.indexOf(id);
      if (at === -1) state.dealExcluded.push(id);
      else state.dealExcluded.splice(at, 1);
    },
    /** Every character back in the deal. */
    clearDealExcluded(state) {
      state.dealExcluded = [];
    },
    /** Arm a character. The source seat always resets here, so a pick made
     *  from a list can never inherit the last seat-pick's origin — a caller
     *  that means "from this chair" says so with setDrawerPickFrom after. */
    setDrawerPick(state, role) {
      state.drawerPick = role || null;
      state.drawerPickFrom = null;
    },
    setDrawerPickFrom(state, seat) {
      state.drawerPickFrom = typeof seat === "number" ? seat : null;
    },
    /** FT-857: point the script drawer at one of its three tabs. */
    setScriptDrawerView(state, view) {
      state.scriptDrawerView = view || "team";
    },
    /** FT-1019: point the chronicles stream at one of its filters (the V
     *  hotkey lands on "gallows"; the drawer's own cells commit this too). */
    setChroniclesFilter(state, filter) {
      state.chroniclesFilter = FILTERS.includes(filter) ? filter : "all";
    },
    /** FT-1146: name the recorded game the Records page should open onto
     *  (null = its landing view). Set by whoever opens the page; the page
     *  clears it as it reads, so a second visit lands on the landing again. */
    setRecordsPick(state, id) {
      state.recordsPick = id || null;
    },
    /**
     * FT-965: THE ONE DOOR INTO THE LOG. Both feeds come through here — the
     * socket's live rows and the catch-up's pages — so the two rules that make
     * the log correct are stated once and cannot be applied to one path and
     * forgotten on the other:
     *
     *   1. A row for a DIFFERENT TOWN is dropped. The stored row carries its
     *      own `townId`, so a page still in flight when the browser hops towns
     *      cannot land in the new town's log.
     *   2. A whisper this viewer was not party to is dropped BEFORE the store.
     *      The catch-up GET is unauthenticated and returns every row in the
     *      town — the relay's live-path guard cannot help there, so this is
     *      where a whisper stops. Never rendered, because never held.
     *
     * Dedup and ordering are `mergeLog`'s, keyed on the store's per-town `seq`.
     */
    chatIngest(state, rows) {
      if (!Array.isArray(rows) || !rows.length) return;
      const town = state.session.sessionId;
      const viewer = viewerOf(state);
      const allowed = rows.filter(
        (row) =>
          row &&
          typeof row.seq === "number" &&
          row.townId === town &&
          // FT-1010: the live game's id rides along — a whisper from a
          // FINISHED game is public (see canSee), and "finished" can only be
          // judged against the game being played right now.
          canSee(row, viewer, state.chat.gameId) &&
          // FT-1206: THE CHAT LEVEL'S SECOND GATE. The composer refuses to
          // build a forbidden line; this drops one a bypassing client sent
          // anyway, before the store, live game only — finished games are
          // published history and the storyteller is never silenced (the
          // helper owns both rules). socket.js re-reads the log when the
          // level changes, so a relaxed level re-offers what this dropped.
          !levelSilences(
            row,
            viewer,
            state.chat.gameId,
            towerState.chatLevel,
            state.players.players.length,
          ),
      );
      state.chat.log = mergeLog(state.chat.log, allowed);
    },
    /**
     * FT-1263: A PLANE FLEW AND THIS VIEWER WAS NOT ON IT — keep its memory
     * as a local traffic row. Called by socket.js beside the plane dispatch,
     * so the gate chain is the plane's own: marks on at SEND (Off is quiet
     * on the wire), shape validated (cleanMark). Here only the party test
     * remains: the storyteller and the whisper's two seats hold the whisper
     * row itself — their record — and write nothing.
     *
     * The row wears the whisper row's own field names (senderKey /
     * recipientKey carry SEAT NAMES, read from the ring at the moment the
     * plane flew) so the Chronicle renders it with the machinery it already
     * has. `seq` is synthetic — after the newest row this client holds,
     * clear of the +0.5/+0.6 the opening board and the night blocks use,
     * monotonic across marks — the FT-1057 splice idiom exactly.
     */
    chatMarkTraffic(state, mark) {
      const viewer = viewerOf(state);
      if (viewer.isStoryteller) return;
      const seat = seatOf(state);
      if (seat === mark.from || seat === mark.to) return;
      const players = state.players.players;
      const nameAt = (i) => (players[i] && players[i].name) || `Seat ${i + 1}`;
      const log = state.chat.log;
      const base = log.length ? log[log.length - 1].seq : 0;
      const marks = state.chat.marks;
      const prev = marks.length ? marks[marks.length - 1].seq : 0;
      const seq = Math.max(base + 0.7, prev + 0.001);
      marks.push({
        id: "traffic:" + seq,
        seq,
        kind: TRAFFIC_KIND,
        gameId: state.chat.gameId,
        senderKey: nameAt(mark.from),
        recipientKey: nameAt(mark.to),
        senderSeat: mark.from,
        recipientSeat: mark.to,
        createdAt: new Date().toISOString(),
        // the moment, stamped the way sendChat stamps a row's: the running
        // phase and day, and no day at all once the game has ended
        phase: state.grimoire.isNight ? "night" : "day",
        dayNumber: state.session.isEnded ? null : state.night.day,
      });
    },
    chatSyncing(state, on) {
      state.chat.syncing = !!on;
    },
    /** The contiguity cursor. Monotonic — only the REST loop ever calls it. */
    chatSynced(state, seq) {
      if (Number.isFinite(seq) && seq > state.chat.syncedSeq) {
        state.chat.syncedSeq = seq;
      }
    },
    /**
     * Forget the log entirely — a different town, or a different VIEWER.
     *
     * The viewer matters as much as the town: rows are filtered on the way in,
     * so a browser that takes a seat (or hands the storyteller's chair over)
     * now has a different answer to "may I see this", and the rows it dropped
     * under its old identity will never be re-offered by a cursor that has
     * already moved past them. Resetting sends the catch-up back to zero,
     * where it re-reads the whole log against the identity now in force.
     */
    chatReset(state) {
      state.chat.log = [];
      state.chat.syncedSeq = 0;
      state.chat.syncing = false;
      state.chat.error = "";
      // FT-1263: another town's (or another identity's) planes are not this
      // viewer's memory — the party test was made against the old identity.
      state.chat.marks = [];
    },
    chatSetGameId(state, id) {
      state.chat.gameId = id || null;
    },
    chatSetScope(state, scope) {
      state.chat.scope = SCOPES.includes(scope) ? scope : "town";
    },
    chatError(state, message) {
      state.chat.error = message || "";
    },
    /**
     * SAY SOMETHING. The mutation is what travels — socket.js's subscriber
     * turns it into the wire frame, exactly as `session/callBack` and every
     * other broadcast in this app does. Nothing is appended to the log here:
     * a line reaches the log when the STORE has accepted it and the relay
     * echoes the row back, so what is on screen is only ever what was recorded.
     */
    chatSay(state) {
      state.chat.error = "";
    },
    toggleModal({ modals }, name) {
      if (name) {
        modals[name] = !modals[name];
      }
      for (let modal in modals) {
        if (modal === name) continue;
        modals[modal] = false;
      }
    },
    /**
     * Store custom roles
     * @param state
     * @param roles Array of role IDs or full role definitions
     */
    setCustomRoles(state, roles) {
      const processedRoles = roles
        // replace numerical role object keys with matching key names
        .map((role) => {
          if (role[0]) {
            const customKeys = Object.keys(customRole);
            const mappedRole = {};
            for (let prop in role) {
              if (customKeys[prop]) {
                mappedRole[customKeys[prop]] = role[prop];
              }
            }
            return mappedRole;
          } else {
            return role;
          }
        })
        // clean up role.id
        .map((role) => {
          role.id = clean(role.id);
          return role;
        })
        // map existing roles to base definition or pre-populate custom roles to ensure all properties
        .map((role) => {
          const out =
            rolesJSONbyId.get(role.id) ||
            state.roles.get(role.id) ||
            Object.assign({}, customRole, role);
          // Golem fork (FT-854): per-script NIGHT-ORDER overrides — the
          // Almanac's drag-reorder writes firstNight/otherNight onto the
          // script entry; overlay them on a CLONE (bases are shared objects).
          if (
            out !== role &&
            (role.firstNight !== undefined || role.otherNight !== undefined)
          ) {
            const f =
              role.firstNight !== undefined ? role.firstNight : out.firstNight;
            const o =
              role.otherNight !== undefined ? role.otherNight : out.otherNight;
            if (f !== out.firstNight || o !== out.otherNight) {
              return Object.assign({}, out, { firstNight: f, otherNight: o });
            }
          }
          return out;
        })
        // default empty icons and placeholders, clean up firstNight / otherNight
        .map((role) => {
          if (rolesJSONbyId.get(role.id)) return role;
          // Golem fork (FT-856): a locally BAKED icon (library pick or
          // upload run through the engraver) rides the role as a data URL —
          // no network, so it renders without the remote-image opt-in.
          if (role.golemIconData) role.image = role.golemIconData;
          // Golem fork (FT-851): a custom role that borrows an OFFICIAL
          // role's icon names it in golemIcon — the bundled asset renders
          // without the remote-image opt-in. Unknown ids fall back to the
          // team-generic token.
          role.imageAlt =
            (role.golemIcon && rolesJSONbyId.has(role.golemIcon)
              ? role.golemIcon
              : null) ||
            {
              townsfolk: "good",
              outsider: "outsider",
              minion: "minion",
              demon: "evil",
              fabled: "fabled",
            }[role.team] ||
            "custom";
          role.firstNight = Math.abs(role.firstNight);
          role.otherNight = Math.abs(role.otherNight);
          return role;
        })
        // filter out roles that don't match an existing role and also don't have name/ability/team
        .filter((role) => role.name && role.ability && role.team)
        // sort by team
        .sort((a, b) => b.team.localeCompare(a.team));
      // FT-1040: register every forged role's composed night action — the
      // whole registry rebuilds with the script, on every client this
      // mutation runs on (local load, vault load, the socket's edition
      // frame). A role without one, or with one that doesn't sanitize,
      // simply stays unlisted — the free-text fallback, as before.
      resetAuthoredNight();
      processedRoles.forEach((role) => {
        if (role.golemNight) registerAuthoredNight(role.id, role.golemNight);
      });
      // convert to Map without Fabled
      state.roles = new Map(
        processedRoles
          .filter((role) => role.team !== "fabled")
          .map((role) => [role.id, role]),
      );
      // update Fabled to include custom Fabled from this script
      state.fabled = new Map([
        ...processedRoles
          .filter((r) => r.team === "fabled")
          .map((r) => [r.id, r]),
        ...fabledJSON.map((role) => [role.id, role]),
      ]);
      // update extraTravelers map to only show travelers not in this script
      state.otherTravelers = new Map(
        rolesJSON
          .filter(
            (r) => r.team === "traveler" && !roles.some((i) => i.id === r.id),
          )
          .map((role) => [role.id, role]),
      );
    },
    setEdition(state, edition) {
      if (editionJSONbyId.has(edition.id)) {
        state.edition = editionJSONbyId.get(edition.id);
        state.roles = getRolesByEdition(state.edition);
        state.otherTravelers = getTravelersNotInEdition(state.edition);
      } else {
        state.edition = edition;
      }
      state.modals.edition = false;
    },
  },
  plugins: [persistence, deathMoment, socket],
});
