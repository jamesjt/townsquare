/**
 * Handle a vote request.
 * If the vote is from a seat that is already locked, ignore it.
 * @param state session state
 * @param index seat of the player in the circle
 * @param vote true or false
 */
const handleVote = (state, [index, vote]) => {
  if (!state.nomination) return;
  state.votes = [...state.votes];
  state.votes[index] = vote === undefined ? !state.votes[index] : vote;
};

const state = () => ({
  sessionId: "",
  isSpectator: false,
  isReconnecting: false,
  playerCount: 0,
  ping: 0,
  playerId: "",
  claimedSeat: -1,
  nomination: false,
  votes: [],
  lockedVote: 0,
  votingSpeed: 3000,
  isVoteInProgress: false,
  voteHistory: [],
  markedPlayer: -1,
  // FT-1314: THE TIE-CROSS — the auto-mark automation's "tied, nobody hangs
  // as it stands": { seats: [i, …], votes: N } while two (or more) marks
  // stand crossed at the same recorded count, null otherwise. Synced like
  // markedPlayer (its own "markedTie" frame + the full gamestate), rendered
  // by the seats as a struck-through noose on every listed chair. A REAL
  // mark supersedes it (setMarkedPlayer to a seat clears it in the same
  // commit) and the night retires it with the day (socket.js's toggleNight
  // case) — the same lifetime the mark itself has.
  markedTie: null,
  // FT-1314: THE SIX AUTOMATION FLAGS, MIRRORED. The truth lives on the
  // tower shelf (golem/towerBells — per-town persisted, synced); this copy
  // exists because towerState is not reactive and the night roster getter
  // has to re-run when a toggle flips (the Scarlet Woman row's hide).
  // Written only by socket.js's TOWER_EVENT listener, from
  // golem/automations' automationFlags().
  automations: {
    autoMark: false,
    autoExecute: false,
    autoGhostVote: false,
    autoScarletWoman: false,
    autoStarpass: false,
    autoUndertaker: false,
  },
  // FT-1314: THE STARPASS CHOOSER, both halves of it (the grimoireGrants
  // idiom: host ledger + player flag, neither persisted).
  //   starpassOffer    PLAYER side — the "who inherits" ask standing on this
  //                    client: { minions: [{seat, name}] } or null. Written
  //                    by the socket's "starpass" direct frame; cleared by
  //                    the player's own answer or a null frame.
  //   starpassPending  HOST side — the playerId the chooser was sent to, ""
  //                    when none is outstanding. Only that client's answer
  //                    is honoured (golem/automations.onStarpassPick).
  starpassOffer: null,
  starpassPending: "",
  isVoteHistoryAllowed: true,
  isRolesDistributed: false,
  // FT-880: when the storyteller last called the town back (epoch ms, 0 = not
  // this session). Local to whichever client pressed it — it is not synced and
  // not persisted; it exists so the moment is a fact somewhere rather than only
  // a side effect inside a click handler.
  calledBackAt: 0,
  // FT-1344: when the storyteller last kicked a watcher (epoch ms, 0 = not
  // this session). calledBackAt's own shape and reasoning — the commit is
  // the event; this makes the moment a fact rather than only a side effect.
  lastKickAt: 0,
  // FT-931: THE TOWN HAS ENDED. Written only by the root `endGame` /
  // `clearEnded` mutations (store/index.js) — never here directly — because
  // ending the game also clears the grimoire grants, another module's state
  // that a namespaced mutation in this file cannot reach. See store/index.js's
  // `toggleNight` for the same "root mutation reaches into a submodule" shape
  // already used in this app. (FT-1294: it used to reach for the face-down
  // flag as well; that flag is retired.)
  isEnded: false,
  // 'good' | 'evil' | null — who won, set alongside isEnded and cleared with it.
  winningTeam: null,
  // FT-1003: THE GRANTED GRIMOIRE, both halves of it.
  //
  // `grimoireGrants` is the HOST's ledger — playerId → { pinned } for every
  // seat currently shown the grimoire (the Spy's night row's control writes
  // it). Host-local, not synced, not persisted: a grant is transient session
  // state like `calledBackAt` above, not game state — no prevX snapshot,
  // because "undo" here IS the revoke, and the revoke rebuilds the normal
  // view rather than restoring a stash.
  //
  // `isGrimoireGranted` is the PLAYER's flag — the window is OPEN right now,
  // meaning the host is still pushing changes to this client. Written only by
  // the root grantGrimoire/revokeGrimoire mutations (store/index.js), which
  // also write what the grant delivered onto the roster — the same "root
  // mutation reaches into a submodule" shape isEnded documents above.
  //
  // FT-1295: `hasGrimoireMemory` is the SECOND half, and the two are different
  // questions on purpose:
  //
  //   isGrimoireGranted   is the window open — is the host still updating me
  //   hasGrimoireMemory   have I ever been shown it — do I still HOLD what I saw
  //
  // The close stops updating instead of wiping (user's call: "memory for spy,
  // and it would update again in the next night phase when the storyteller
  // shows it to them"), so everything the grant delivered outlives the window
  // and stays editable on the Spy's own board. The first flag goes false at the
  // close; the second stays true for as long as the DATA does, and is cleared
  // in exactly one place — `clearEnded`, beside the `players/clearRoles` that
  // wipes the table for a new game.
  //
  // The render side reads the second, never the first (golem/bluffs.js's
  // `canSeeBluffs`), because what a client may look at follows from what it is
  // holding, not from whether a socket is still feeding it.
  grimoireGrants: {},
  isGrimoireGranted: false,
  hasGrimoireMemory: false,
  // FT-1200: THE ACCOUNT — who this browser is on the platform, or null.
  // `{ id, name, email }`, written only by golem/account.js (boot /me, the
  // door's sign-in/out). Session state, not game state: not synced, not
  // persisted (the cookie is the persistence), no prevX snapshot.
  account: null,
  // FT-1226: LABS — is the platform's `labs` flag on for THIS caller? Written
  // only by golem/account.js's boot fetch of /api/flags/self. Default false:
  // an unreachable platform, a failed fetch or a switched-off flag all mean
  // the unfinished surfaces (currently the guide) stay hidden. Session state
  // like `account` above: not synced, not persisted, no prevX snapshot.
  labs: false,
  // FT-1200: THE HOST'S SEAT-ACCOUNT LEDGER — playerId → accountId for every
  // claimant who offered one (socket.js's "accountId" direct frame). Host
  // side only; players never hold it. Resolved through each seat's live
  // `player.id` at record time (EndGameOverlay), so a stale entry from a
  // refused or abandoned claim is inert. Transient like grimoireGrants above.
  seatAccounts: {},
  // FT-1344: WHO IS WATCHING — the host's live list of seatless viewers,
  // [{ id, name }] (name is what the watcher's own client offered on its
  // ping; "" when it never said). Host side only, derived by socket.js from
  // its ping roster minus the seated ids — a player's client never receives
  // it. Transient like seatAccounts above: not synced, not persisted.
  spectators: []
});

const getters = {};

const actions = {};

// mutations helper functions
const set = key => (state, val) => {
  state[key] = val;
};

const mutations = {
  setPlayerId: set("playerId"),
  setSpectator: set("isSpectator"),
  setReconnecting: set("isReconnecting"),
  setPlayerCount: set("playerCount"),
  setPing: set("ping"),
  setVotingSpeed: set("votingSpeed"),
  setVoteInProgress: set("isVoteInProgress"),
  /**
   * FT-1311: THE NOOSE LEAVES A BREADCRUMB. A marked-for-execution state
   * survived past where it should have died in a real game (2026-08-28, no
   * repro), and this mutation is the ONE gate every mark transition passes
   * — host writes, the spectator's "marked" frame, the full-sync copy. So
   * every transition now says who moved it: old seat, new seat, and the
   * top of the call stack (trimmed past this frame — enough to name the
   * committing module). When the noose sticks again, the console holds the
   * whole history of how it got there. `no-console` is off outside
   * production builds (.eslintrc.js); the sweep's own hot path never
   * touches this mutation, so the cost is one line per genuine transition.
   */
  setMarkedPlayer(state, index) {
    if (state.markedPlayer !== index) {
      // Skip this frame and vuex's own commit plumbing (wrappedMutation-
      // Handler / commitIterator / commit) — the first frames left are the
      // component or socket module that asked for the change, which is the
      // fact the breadcrumb exists to hold. (Measured: without the filter
      // the trail was three lines of vuex.esm.js and named nobody.)
      const trail = new Error().stack
        .split("\n")
        .slice(2)
        .filter(
          (line) => !line.includes("vuex") && !line.includes("Array.forEach"),
        )
        .slice(0, 3)
        .map((line) => line.trim())
        .join(" « ");
      // eslint-disable-next-line no-console
      console.warn(
        `[noose] markedPlayer ${state.markedPlayer} → ${index}`,
        trail,
      );
    }
    state.markedPlayer = index;
    // FT-1314: A REAL MARK SUPERSEDES THE TIE-CROSS. The crossed pair means
    // "tied, nobody hangs as it stands", and it stands only until a later
    // higher vote — or the storyteller's own hand — puts somebody on the
    // block for real. Cleared here, in the one gate every mark transition
    // passes, so the host's automation and a spectator's incoming "marked"
    // frame retire the pair identically. A -1 does NOT clear it: lifting a
    // mark is not a verdict, and the tie itself stands with markedPlayer -1.
    if (index >= 0 && state.markedTie) {
      state.markedTie = null;
    }
  },
  /**
   * FT-1314: the tie-cross itself — see the state note. Validated the way
   * every synced field is: a payload that is not {seats:[ints], votes>0}
   * reads as null, so a malformed frame can only ever CLEAR the pair.
   */
  setMarkedTie(state, tie) {
    if (
      tie &&
      Array.isArray(tie.seats) &&
      tie.seats.length >= 2 &&
      tie.seats.every((s) => Number.isInteger(s) && s >= 0) &&
      Number.isFinite(tie.votes) &&
      tie.votes > 0
    ) {
      state.markedTie = {
        seats: [...new Set(tie.seats)],
        votes: Math.round(tie.votes),
      };
    } else {
      state.markedTie = null;
    }
  },
  /** FT-1314: the automation flags' reactive mirror — see the state note. */
  setAutomations(state, flags) {
    const next = {};
    Object.keys(state.automations).forEach((key) => {
      next[key] = !!(flags && flags[key]);
    });
    state.automations = next;
  },
  /** FT-1314: the "who inherits" ask landing on (or leaving) THIS client. */
  setStarpassOffer(state, offer) {
    if (offer && Array.isArray(offer.minions) && offer.minions.length) {
      state.starpassOffer = {
        minions: offer.minions
          .filter((m) => m && Number.isInteger(m.seat))
          .map((m) => ({ seat: m.seat, name: String(m.name || "") })),
      };
      if (!state.starpassOffer.minions.length) state.starpassOffer = null;
    } else {
      state.starpassOffer = null;
    }
  },
  /**
   * FT-1314: the dying Imp answers — the callBack idiom: the commit is the
   * event, socket.js's subscriber is the one place it goes out (direct to
   * the host, stamped with this client's own playerId there). The chooser
   * stands down at the moment of the pick; the truth of what the pick DID
   * comes back on the ordinary frames (the new character, the night row).
   */
  starpassAnswer(state) {
    state.starpassOffer = null;
  },
  /** FT-1314: the host's outstanding chooser — see the state note. */
  setStarpassPending: set("starpassPending"),
  setNomination: set("nomination"),
  setVoteHistoryAllowed: set("isVoteHistoryAllowed"),
  claimSeat: set("claimedSeat"),
  distributeRoles: set("isRolesDistributed"),
  // FT-1200: the platform account (or null on sign-out) — see the state note.
  setAccount: set("account"),
  // FT-1226: the caller's own `labs` verdict — see the state note.
  setLabs: set("labs"),
  // FT-1200: one claimant's account offer, keyed by the playerId their claim
  // rides under (exact case — it must match the `player.id` the host's
  // roster holds, which is the same value from the same claim frame).
  // A null accountId is a retraction: vacating a seat, or a guest claiming.
  setSeatAccount(state, [playerId, accountId]) {
    if (!playerId || typeof playerId !== "string") return;
    const next = { ...state.seatAccounts };
    if (accountId && typeof accountId === "string") {
      next[playerId] = accountId;
    } else {
      delete next[playerId];
    }
    state.seatAccounts = next;
  },
  setSessionId(state, sessionId) {
    // Golem fork: dashes and underscores are legal town-name characters (our
    // relay lowercases but never strips), and readable minted names like
    // "ravenswood-757" need more room than upstream's 10.
    state.sessionId = sessionId
      .toLocaleLowerCase()
      .replace(/[^0-9a-z_-]/g, "")
      .substr(0, 24);
  },
  nomination(
    state,
    { nomination, votes, votingSpeed, lockedVote, isVoteInProgress } = {}
  ) {
    state.nomination = nomination || false;
    state.votes = votes || [];
    state.votingSpeed = votingSpeed || state.votingSpeed;
    state.lockedVote = lockedVote || 0;
    state.isVoteInProgress = isVoteInProgress || false;
  },
  /**
   * Create an entry in the vote history log. Requires current player array because it might change later in the game.
   * Only stores votes that were completed.
   * @param state
   * @param players
   */
  addHistory(state, players) {
    if (!state.isVoteHistoryAllowed && state.isSpectator) return;
    if (!state.nomination || state.lockedVote <= players.length) return;
    const isExile = players[state.nomination[1]].role.team === "traveler";
    state.voteHistory.push({
      timestamp: new Date(),
      nominator: players[state.nomination[0]].name,
      nominee: players[state.nomination[1]].name,
      type: isExile ? "Exile" : "Execution",
      majority: Math.ceil(
        players.filter(player => !player.isDead || isExile).length / 2
      ),
      votes: players
        .filter((player, index) => state.votes[index])
        .map(({ name }) => name)
    });
  },
  clearVoteHistory(state) {
    state.voteHistory = [];
  },
  /**
   * FT-880: call the town back. The socket plugin listens for this and is the
   * one place that decides whether it may go out (storyteller only).
   */
  callBack(state) {
    state.calledBackAt = Date.now();
  },
  /**
   * FT-1344: the host's live watcher list — see the state note. Validated
   * the way every derived list is: anything that is not [{id, name}] rows
   * reads as empty, and a malformed row is dropped rather than rendered.
   */
  setSpectators(state, list) {
    state.spectators = (Array.isArray(list) ? list : [])
      .filter((s) => s && typeof s.id === "string" && s.id)
      .map((s) => ({ id: s.id, name: String(s.name || "") }));
  },
  /**
   * FT-1344: the storyteller shows a watcher out — the callBack idiom: the
   * commit is the event, and the socket plugin (storyteller only there) is
   * the one place it goes out. The list itself is corrected by the host's
   * own bookkeeping the moment the kick lands (setSpectators above), so the
   * only state written here is the moment, calledBackAt's own shape.
   */
  kickSpectator(state) {
    state.lastKickAt = Date.now();
  },
  /**
   * FT-1003: grant, revoke, or re-pin one seat's grimoire window. Host only
   * in practice (the night sheet is the only writer); the socket plugin
   * listens for this mutation and is what actually delivers the change to
   * that one seat. The map is REPLACED rather than mutated so Vue 2 sees the
   * key appear/disappear without a Vue.set import.
   */
  setGrimoireGrant(state, { playerId, granted, pinned }) {
    if (!playerId) return;
    const grants = { ...state.grimoireGrants };
    if (granted) {
      grants[playerId] = { pinned: !!pinned };
    } else {
      delete grants[playerId];
    }
    state.grimoireGrants = grants;
  },
  /**
   * Store a vote with and without syncing it to the live session.
   * This is necessary in order to prevent infinite voting loops.
   * @param state
   * @param vote
   */
  vote: handleVote,
  voteSync: handleVote,
  lockVote(state, lock) {
    state.lockedVote = lock !== undefined ? lock : state.lockedVote + 1;
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
