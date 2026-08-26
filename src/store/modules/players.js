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
  /**
   * FT-1133: THE SHUFFLE MOVES THE PEOPLE, NOT THE GAME.
   *
   * User, verbatim: "shouldn't it just shuffle which seat each player is in,
   * not move the roles at all?"
   *
   * It should, and it did not. The roster ARRAY is the seating — index i IS
   * chair i — and one object per chair carried BOTH the human and everything
   * the chair holds. So reordering the array (the stood-down code below) moved
   * each person together with their character, their reminders and their
   * shroud: the person-to-character pairing was the one thing a shuffle could
   * never change, which is the one job a storyteller wants from the button.
   *
   * TWO SIDES, and the split is the whole fix:
   *   · THE PERSON travels — `name`, `id`, `pronouns`. Who they are, what to
   *     call them, and which browser is holding this chair. Nothing here is a
   *     fact about the game.
   *   · THE CHAIR stays — `role`, `believedRole`, `reminders`, `isDead`,
   *     `isVoteless`. Every one of these is a game fact laid out on the table:
   *     the character in front of that chair, the lie that chair is told, the
   *     stickers beside it, its shroud and its spent vote. A shuffle is people
   *     standing up and sitting down somewhere else; the table does not move.
   *
   * The chair keeps anything ADDED LATER too (the spread below), which is the
   * safer default of the two — a new field on a seat is far more likely to be
   * a game fact than a new piece of identity.
   *
   * BEFORE THE DEAL THIS IS INDISTINGUISHABLE from what the button always did,
   * because every field on the chair side is empty. That is the point: the two
   * only diverge once characters are laid out, and there the new one is the
   * useful one.
   *
   * `moves` is the seating CHANGE, not just its result: which seated person
   * came from which chair. socket.js's `reseatPlayers` needs the old index to
   * take a mover's stale character off their own client — see its note.
   */
  randomize({ state, commit }) {
    // (the roster-array shuffle stood down here 2026-08-25 — kept for the
    //  record. It is the same shuffle, applied one level too high up:
    //    const players = state.players
    //      .map(a => [Math.random(), a])
    //      .sort((a, b) => a[0] - b[0])
    //      .map(a => a[1]);
    //    commit("set", players);
    //  Everything the chair holds rode along with the person.)
    const seats = state.players;
    // Lift the PEOPLE off the chairs and shuffle those alone (Fisher-Yates —
    // a uniform permutation, unlike sorting on a random key).
    const people = seats.map(({ name, id, pronouns }) => ({
      name,
      id,
      pronouns
    }));
    for (let i = people.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const held = people[i];
      people[i] = people[j];
      people[j] = held;
    }
    // ...and sit them back down. The chair is spread FIRST so the three person
    // fields land on top of it; everything else the seat was holding is
    // untouched, in the chair it was already in.
    const players = seats.map((seat, index) => ({ ...seat, ...people[index] }));
    // WHO WENT WHERE — claimed chairs only; an empty chair has no client to
    // correct. `seats` is still the OLD order at this point.
    const moves = [];
    people.forEach((person, to) => {
      if (!person.id) return;
      const from = seats.findIndex(({ id }) => id && id === person.id);
      if (from >= 0 && from !== to) moves.push({ id: person.id, from, to });
    });
    commit("reseat", { players, moves });
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
   * FT-1133: the seat shuffle's own mutation. It sets the roster exactly as
   * `set` does — it exists so the socket layer can tell THIS roster change
   * apart from every other one and answer it properly.
   *
   * `set` is answered by a lightweight gamestate broadcast, and that broadcast
   * carries names, ids, pronouns and shrouds but NOT a seat's character. That
   * is right for every other `set` (nobody's character moved) and wrong for
   * this one, where a chair changing hands is exactly what happened — see
   * socket.js's `reseatPlayers`.
   *
   * `moves` rides on the payload rather than the state because it describes
   * the CHANGE; by the time the subscriber reads the roster it is already the
   * new seating, and the old chair of each mover is unrecoverable from it.
   */
  reseat(state, { players } = {}) {
    if (players) state.players = players;
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
