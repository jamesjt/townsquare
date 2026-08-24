// FT-1084: the deal chooses the demon's three bluffs and every believing
// seat's believed character. Pure picker; this module only commits it.
import { chooseLies } from "../../golem/dealLies";
// FT-1117: ...and the deal places every reminder a character DECLARES as
// auto-dealt (the Fortune Teller's red herring is the first). Same shape:
// pure picker, this module only commits it.
import { chooseDealtReminders } from "../../golem/dealReminders";

const NEWPLAYER = {
  name: "",
  id: "",
  role: {},
  // Golem fork (FT-861): THE BELIEVED ROLE — the character this seat SHOWS its
  // player, or null when they were told the truth (nearly every seat). The
  // Drunk, the Lunatic and the Marionette are one mechanism through this field
  // rather than three booleans. See golem/belief.js — and note that this is
  // not "registers as", which is a separate axis and gets its own field.
  //
  // The key exists from the start because Vue 2 cannot see keys added later,
  // and every seat is built from this object.
  believedRole: null,
  reminders: [],
  isVoteless: false,
  isDead: false,
  pronouns: ""
};

const state = () => ({
  players: [],
  fabled: [],
  bluffs: []
});

const getters = {
  alive({ players }) {
    return players.filter(player => !player.isDead).length;
  },
  nonTravelers({ players }) {
    const nonTravelers = players.filter(
      player => player.role.team !== "traveler"
    );
    return Math.min(nonTravelers.length, 15);
  },
  // calculate a Map of player => night order
  nightOrder({ players, fabled }) {
    const firstNight = [0];
    const otherNight = [0];
    players.forEach(({ role }) => {
      if (role.firstNight && !firstNight.includes(role.firstNight)) {
        firstNight.push(role.firstNight);
      }
      if (role.otherNight && !otherNight.includes(role.otherNight)) {
        otherNight.push(role.otherNight);
      }
    });
    fabled.forEach(role => {
      if (role.firstNight && !firstNight.includes(role.firstNight)) {
        firstNight.push(role.firstNight);
      }
      if (role.otherNight && !otherNight.includes(role.otherNight)) {
        otherNight.push(role.otherNight);
      }
    });
    firstNight.sort((a, b) => a - b);
    otherNight.sort((a, b) => a - b);
    const nightOrder = new Map();
    players.forEach(player => {
      const first = Math.max(firstNight.indexOf(player.role.firstNight), 0);
      const other = Math.max(otherNight.indexOf(player.role.otherNight), 0);
      nightOrder.set(player, { first, other });
    });
    fabled.forEach(role => {
      const first = Math.max(firstNight.indexOf(role.firstNight), 0);
      const other = Math.max(otherNight.indexOf(role.otherNight), 0);
      nightOrder.set(role, { first, other });
    });
    return nightOrder;
  }
};

const actions = {
  randomize({ state, commit }) {
    const players = state.players
      .map(a => [Math.random(), a])
      .sort((a, b) => a[0] - b[0])
      .map(a => a[1]);
    commit("set", players);
  },
  clearRoles({ state, commit, rootState }) {
    let players;
    if (rootState.session.isSpectator) {
      players = state.players.map(player => {
        if (player.role.team !== "traveler") {
          player.role = {};
        }
        // FT-861: a cleared chair believes nothing — the belief must not
        // outlive the character it was attached to.
        player.believedRole = null;
        player.reminders = [];
        return player;
      });
    } else {
      players = state.players.map(({ name, id, pronouns }) => ({
        ...NEWPLAYER,
        name,
        id,
        pronouns
      }));
      commit("setFabled", { fabled: [] });
    }
    commit("set", players);
    commit("setBluff");
  },
  /**
   * FT-1084: THE DEAL WRITES THE LIES TOO.
   *
   * Dealing already handed every seat a character and carried the two lies
   * to the clients entitled to them (FT-1073); it never CHOSE the lies, so
   * a fresh game opened with three blank bluff coins and a Drunk wearing the
   * "?" placeholder. This fills both from the same not-in-play pool —
   * golem/dealLies.js holds the whole decision and explains it.
   *
   * DEFAULTS, NOT LOCKS. Each is the same field the storyteller's own
   * surfaces write (the drawer's bluff slots, the seat's belief chip), set
   * through the same two mutations, so changing one afterwards works
   * exactly as it did — and the next deal rolls a new set over the top.
   *
   * CALLED BEFORE `session/distributeRoles`, deliberately: both mutations
   * below are watched by the socket plugin, and both of its handlers are
   * silent until roles are distributed. So the choosing makes no wire
   * traffic of its own — the deal a beat later sends the finished set, down
   * the one proven private path each of them already had.
   */
  dealLies({ state, commit, rootState }) {
    if (rootState.session.isSpectator) return;
    const { bluffs, beliefs } = chooseLies({
      players: state.players,
      roles: rootState.roles,
    });
    beliefs.forEach(({ index, role }) => {
      const player = state.players[index];
      if (!player) return;
      commit("update", { player, property: "believedRole", value: role });
    });
    bluffs.forEach((role, index) => commit("setBluff", { index, role }));
  },
  /**
   * FT-1117: THE DEAL PLACES THE DEALT REMINDERS.
   *
   * The red herring was a sticker the storyteller hunted down in the picker
   * after every single deal — but it is not a note they write, it is a
   * decision the rules oblige them to make the moment the roles land, exactly
   * like the demon's bluffs above. Now the character declares it (roles.json's
   * Fortune Teller carries `{ name: "Red herring", deal: {...} }`) and
   * golem/dealReminders.js reads the declaration. Nothing here knows what a
   * Fortune Teller is.
   *
   * DEFAULTS, NOT LOCKS — the same contract dealLies has. The token lands on
   * the same `reminders` field the picker writes, through the same mutation,
   * so the storyteller moves it (drag, FT-1117) or removes it (click) exactly
   * as they always could, and the next deal draws a fresh seat.
   *
   * NO WIRE TRAFFIC, BY THE OLDEST GUARD IN THE FILE. socket.js's `sendPlayer`
   * drops `reminders` before it looks at anything else, so a dealt token is
   * grimoire furniture on the host's screen and nowhere else — the same as a
   * hand-placed one has always been.
   */
  dealReminders({ state, commit, rootState }) {
    if (rootState.session.isSpectator) return;
    const changes = chooseDealtReminders({ players: state.players });
    changes.forEach(({ index, reminders }) => {
      const player = state.players[index];
      if (!player) return;
      commit("update", { player, property: "reminders", value: reminders });
    });
  }
};

const mutations = {
  clear(state) {
    state.players = [];
    state.bluffs = [];
    state.fabled = [];
  },
  set(state, players = []) {
    state.players = players;
  },
  /**
  The update mutation also has a property for isFromSockets
  this property can be addded to payload object for any mutations
  then can be used to prevent infinite loops when a property is
  able to be set from multiple different session on websockets.
  An example of this is in the sendPlayerPronouns and _updatePlayerPronouns
  in socket.js.
   */
  update(state, { player, property, value }) {
    const index = state.players.indexOf(player);
    if (index >= 0) {
      state.players[index][property] = value;
    }
  },
  add(state, name) {
    state.players.push({
      ...NEWPLAYER,
      name
    });
  },
  remove(state, index) {
    state.players.splice(index, 1);
  },
  swap(state, [from, to]) {
    [state.players[from], state.players[to]] = [
      state.players[to],
      state.players[from]
    ];
    // hack: "modify" the array so that Vue notices something changed
    state.players.splice(0, 0);
  },
  move(state, [from, to]) {
    state.players.splice(to, 0, state.players.splice(from, 1)[0]);
  },
  setBluff(state, { index, role } = {}) {
    if (index !== undefined) {
      state.bluffs.splice(index, 1, role);
    } else {
      state.bluffs = [];
    }
  },
  setFabled(state, { index, fabled } = {}) {
    if (index !== undefined) {
      state.fabled.splice(index, 1);
    } else if (fabled) {
      if (!Array.isArray(fabled)) {
        state.fabled.push(fabled);
      } else {
        state.fabled = fabled;
      }
    }
  }
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations
};
