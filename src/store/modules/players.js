// FT-1084: the deal chooses the demon's three bluffs and every believing
// seat's believed character. Pure picker; this module only commits it.
import { chooseLies } from "../../golem/dealLies";
// FT-1117: ...and the deal places every reminder a character DECLARES as
// auto-dealt (the Fortune Teller's red herring is the first). Same shape:
// pure picker, this module only commits it.
import { chooseDealtReminders, DEALT_MARK } from "../../golem/dealReminders";
// FT-1393: ...and the deal tells evil who evil is — the believed-team table
// (host-side, one row per seat) and the reminder tokens that deliver it. The
// Lunatic is fed the same dish, faked. Same shape again: pure builder,
// this module only commits it.
import { buildEvilInfoTable, evilInfoAdditions } from "../../golem/evilInfo";

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
  // Golem fork (FT-1163): WHEN THIS SEAT DIED, beside the fact that it did.
  // `isDead` is a boolean with no time next to it, so a finished game could
  // say who died and never when — and the moment cannot be recovered
  // afterwards. These two carry it:
  //
  //   deathDay    the cycle, on `night.day`'s scale (first night = 1)
  //   deathPhase  "night" | "day" — which half of that cycle
  //
  // Both null while the seat lives, and both set back to null when a shroud
  // is LIFTED — a seat that is alive again has no death moment.
  //
  // THEY LIVE ON THE PLAYER, not in a seat-indexed side table, so that they
  // move with the chair: `swap`, `move` and `reseat` below all relocate whole
  // player objects, so anything held here follows its seat for free, while an
  // index-keyed stash would quietly come to describe the wrong player.
  //
  // Written ONLY by `setDeathMoment` (see the mutation, and the deathMoment
  // store plugin that calls it). NOT broadcast: `sendPlayer` forwards whatever
  // property `players/update` carries, which is exactly why the stamp has its
  // own mutation instead. Nothing on the wire needs it — the town already
  // hears "X dies" as a dated chronicle line (FT-1010/FT-1140), and the
  // storyteller's grimoire is the only client that records a game.
  //
  // The keys exist from the start because Vue 2 cannot see keys added later.
  deathDay: null,
  deathPhase: null,
  pronouns: ""
};

const state = () => ({
  players: [],
  fabled: [],
  bluffs: [],
  // FT-1393: THE BELIEVED-TEAM TABLE — host-side, one row per seat, built by
  // the deal (golem/evilInfo.js): what each seat is due to learn about the
  // evil team, truth-derived for real evil, fiction for the Lunatic, empty
  // for everyone else. Rows carry a delivery state (delivered/held). This is
  // the surface a later storyteller editor reads and rewrites; tonight the
  // deal writes it and the reminder tokens deliver it. Never broadcast and
  // never persisted — rebuilt by every deal.
  evilInfo: [],
  // FT-1396: THE BADGES THIS CLIENT WAS TOLD — client-local, player-side:
  // `{ index, team }` per teammate chair, fed ONLY by this client's own
  // direct "evilTeam" frame (store/socket.js sendEvilTeam — the bluffs
  // discipline: content reaches exactly the seats the believed-team table
  // entitles, an empty frame is "you hold none"). The host's copy stays
  // empty (the grimoire already says more), and nothing persists it — a
  // reload gets it back on the same full sync the bluffs ride.
  evilBadges: []
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
    // FT-1393: cleared characters take the believed-team table with them —
    // its rows describe a deal that no longer exists.
    commit("setEvilInfo");
    // FT-1396: ...and the badges a player's client was holding. This action
    // is the one Play again already reaches on every client (the host
    // dispatches it directly; a spectator's clearEnded resync dispatches it
    // in _updateGamestate — the FT-1389 residue door), so knowledge dies
    // with the game it belonged to, on the same clock the roles do.
    commit("setEvilBadges");
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
  dealLies({ state, commit, rootState }, { keepBluffs = false } = {}) {
    if (rootState.session.isSpectator) return;
    // FT-1383: the Start path keeps the storyteller's staged bluffs (only
    // empty or newly-illegal slots refill); the drawer's deliberate
    // re-deal keeps its full re-roll by not passing the flag.
    const { bluffs, beliefs } = chooseLies({
      players: state.players,
      roles: rootState.roles,
      keepBluffs: keepBluffs ? state.bluffs : null,
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
   * NO BROADCAST, BY THE OLDEST GUARD IN THE FILE. socket.js's `sendPlayer`
   * still refuses to put `reminders` on a frame the town receives, so a dealt
   * token is grimoire furniture on the host's screen — the same as a
   * hand-placed one has always been.
   *
   * FT-1295: with one door, opened on purpose. A token reaches a seat the
   * storyteller has GRANTED THE GRIMOIRE to, in that seat's own direct frame
   * (socket.js's `sendGrimoire`), because a grimoire is its tokens as much as
   * its characters. A dealt token is indistinguishable from a hand-placed one
   * there too — the deal's own mark is cut off the wire.
   */
  dealReminders({ state, commit, rootState }) {
    if (rootState.session.isSpectator) return;
    const changes = chooseDealtReminders({ players: state.players });
    // FT-1393: EVIL KNOWS EVIL — the deal builds the believed-team table
    // (golem/evilInfo.js explains the whole decision: truth rows for real
    // evil, a fiction row for the Lunatic, empty rows for everyone else,
    // receipt keyed off the BELIEVED team) and its delivered rows land as
    // reminder tokens on the receiving chairs, through the same pipe the
    // red herring takes. dealLies has ALREADY committed the beliefs by the
    // time either caller dispatches this, so the Lunatic's believed demon
    // is on the seat when the table reads it.
    const table = buildEvilInfoTable({
      players: state.players,
      roles: rootState.roles,
    });
    commit("setEvilInfo", table);
    // Merge the evil-team tokens onto whatever the declared-reminders pass
    // decided. A seat the pass did not touch had no dealt tokens to strip
    // (or an identical list), so its base is its current list minus any
    // dealt mark — the same strip the pass itself opens with.
    const lists = new Map();
    changes.forEach(({ index, reminders }) => lists.set(index, reminders));
    evilInfoAdditions(table).forEach(({ index, tokens }) => {
      const player = state.players[index];
      if (!player) return;
      const base = lists.has(index)
        ? lists.get(index)
        : (player.reminders || []).filter((r) => !r || !r[DEALT_MARK]);
      lists.set(index, [...base, ...tokens]);
    });
    lists.forEach((reminders, index) => {
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
    // FT-1393: a cleared town has no believed-team table.
    state.evilInfo = [];
    // FT-1396: ...and no badges — leaving a town takes them along (the same
    // "a town is a room" rule the chat log and the claimed seat follow).
    state.evilBadges = [];
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
  /**
   * FT-1163: stamp (or clear) WHEN a seat died.
   *
   * Its own mutation rather than two `players/update` calls, for one reason:
   * the socket layer answers every `players/update` by broadcasting that
   * property to the town (see `sendPlayer`), and a death moment has no
   * business on the wire — the storyteller's own grimoire is the only place
   * that records a game, and the town already hears the death itself as a
   * dated chronicle line. A separate type is simply not in that subscriber's
   * switch, so nothing is sent and nothing had to be special-cased there.
   *
   * Clearing is `{ player, day: null, phase: null }` — a lifted shroud leaves
   * no moment behind.
   */
  setDeathMoment(state, { player, day = null, phase = null } = {}) {
    const index = state.players.indexOf(player);
    if (index < 0) return;
    state.players[index].deathDay = day;
    state.players[index].deathPhase = phase;
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
  /**
   * FT-1393: the believed-team table, whole. Its own mutation for the same
   * reason setDeathMoment has one — the socket layer answers `update` by
   * broadcasting, and this table is host bookkeeping with no business on
   * the wire. A bare call (no rows) clears it.
   */
  setEvilInfo(state, rows = []) {
    state.evilInfo = Array.isArray(rows) ? rows : [];
  },
  /**
   * FT-1396: the badge list this client holds — written only by the direct
   * "evilTeam" frame's handler (and the two clears above). Its own mutation
   * for the setEvilInfo/setDeathMoment reason: the socket layer answers
   * `update` by broadcasting, and who is on whose team must never ride that
   * path. A bare call (no list) clears it.
   */
  setEvilBadges(state, badges = []) {
    state.evilBadges = Array.isArray(badges) ? badges : [];
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
