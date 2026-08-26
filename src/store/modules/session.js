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
  isVoteHistoryAllowed: true,
  isRolesDistributed: false,
  // FT-880: when the storyteller last called the town back (epoch ms, 0 = not
  // this session). Local to whichever client pressed it — it is not synced and
  // not persisted; it exists so the moment is a fact somewhere rather than only
  // a side effect inside a click handler.
  calledBackAt: 0,
  // FT-931: THE TOWN HAS ENDED. Written only by the root `endGame` /
  // `clearEnded` mutations (store/index.js) — never here directly — because
  // ending the game also forces `grimoire.isPublic` off (the reveal), a
  // different module's state that a namespaced mutation in this file cannot
  // reach. See store/index.js's `toggleNight` for the same "root mutation
  // reaches into a submodule" shape already used in this app.
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
  // `isGrimoireGranted` is the PLAYER's flag — this client is currently shown
  // the grimoire. Written only by the root grantGrimoire/revokeGrimoire
  // mutations (store/index.js), which also touch grimoire.isPublic — the same
  // "root mutation reaches into a submodule" shape isEnded documents above.
  grimoireGrants: {},
  isGrimoireGranted: false,
  // FT-1200: THE ACCOUNT — who this browser is on the platform, or null.
  // `{ id, name, email }`, written only by golem/account.js (boot /me, the
  // door's sign-in/out). Session state, not game state: not synced, not
  // persisted (the cookie is the persistence), no prevX snapshot.
  account: null,
  // FT-1200: THE HOST'S SEAT-ACCOUNT LEDGER — playerId → accountId for every
  // claimant who offered one (socket.js's "accountId" direct frame). Host
  // side only; players never hold it. Resolved through each seat's live
  // `player.id` at record time (EndGameOverlay), so a stale entry from a
  // refused or abandoned claim is inert. Transient like grimoireGrants above.
  seatAccounts: {}
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
  setMarkedPlayer: set("markedPlayer"),
  setNomination: set("nomination"),
  setVoteHistoryAllowed: set("isVoteHistoryAllowed"),
  claimSeat: set("claimedSeat"),
  distributeRoles: set("isRolesDistributed"),
  // FT-1200: the platform account (or null on sign-out) — see the state note.
  setAccount: set("account"),
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
