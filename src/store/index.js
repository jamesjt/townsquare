import Vue from "vue";
import Vuex from "vuex";
import persistence from "./persistence";
import socket from "./socket";
import players from "./modules/players";
import session from "./modules/session";
// FT-860: the storyteller's night checklist + append-only night log.
import night from "./modules/night";
import editionJSON from "../editions.json";
import rolesJSON from "../roles.json";
import fabledJSON from "../fabled.json";
import jinxesJSON from "../hatred.json";

Vue.use(Vuex);

// helper functions
const getRolesByEdition = (edition = editionJSON[0]) => {
  return new Map(
    rolesJSON
      .filter(r => r.edition === edition.id || edition.roles.includes(r.id))
      .sort((a, b) => b.team.localeCompare(a.team))
      .map(role => [role.id, role])
  );
};

const getTravelersNotInEdition = (edition = editionJSON[0]) => {
  return new Map(
    rolesJSON
      .filter(
        r =>
          r.team === "traveler" &&
          r.edition !== edition.id &&
          !edition.roles.includes(r.id)
      )
      .map(role => [role.id, role])
  );
};

const set = key => ({ grimoire }, val) => {
  grimoire[key] = val;
};

const toggle = key => ({ grimoire }, val) => {
  if (val === true || val === false) {
    grimoire[key] = val;
  } else {
    grimoire[key] = !grimoire[key];
  }
};

const clean = id => id.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

// global data maps
const editionJSONbyId = new Map(
  editionJSON.map(edition => [edition.id, edition])
);
const rolesJSONbyId = new Map(rolesJSON.map(role => [role.id, role]));
const fabled = new Map(fabledJSON.map(role => [role.id, role]));

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
      new Map(hatred.map(({ id, reason }) => [clean(id), reason]))
    ])
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
  golemRoleId: ""
};

export default new Vuex.Store({
  modules: {
    players,
    session,
    night
  },
  state: {
    grimoire: {
      isNight: false,
      isNightOrder: true,
      isPublic: true,
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
      background: ""
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
      chronicleDrawer: false
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
    // FT-857: which tab the script drawer opens on — "team" | "first" |
    // "other". The strip's night icon lands on "first".
    scriptDrawerView: "team",
    edition: editionJSONbyId.get("tb"),
    roles: getRolesByEdition(),
    otherTravelers: getTravelersNotInEdition(),
    fabled,
    jinxes
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
        "isCustom"
      ];
      roles.forEach(role => {
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
    rolesJSONbyId: () => rolesJSONbyId
  },
  mutations: {
    setZoom: set("zoom"),
    setBackground: set("background"),
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
    toggleImageOptIn: toggle("isImageOptIn"),
    setAllowDupRoles(state, on) {
      state.allowDupRoles = !!on;
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
        .map(role => {
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
        .map(role => {
          role.id = clean(role.id);
          return role;
        })
        // map existing roles to base definition or pre-populate custom roles to ensure all properties
        .map(role => {
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
        .map(role => {
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
              fabled: "fabled"
            }[role.team] || "custom";
          role.firstNight = Math.abs(role.firstNight);
          role.otherNight = Math.abs(role.otherNight);
          return role;
        })
        // filter out roles that don't match an existing role and also don't have name/ability/team
        .filter(role => role.name && role.ability && role.team)
        // sort by team
        .sort((a, b) => b.team.localeCompare(a.team));
      // convert to Map without Fabled
      state.roles = new Map(
        processedRoles
          .filter(role => role.team !== "fabled")
          .map(role => [role.id, role])
      );
      // update Fabled to include custom Fabled from this script
      state.fabled = new Map([
        ...processedRoles.filter(r => r.team === "fabled").map(r => [r.id, r]),
        ...fabledJSON.map(role => [role.id, role])
      ]);
      // update extraTravelers map to only show travelers not in this script
      state.otherTravelers = new Map(
        rolesJSON
          .filter(r => r.team === "traveler" && !roles.some(i => i.id === r.id))
          .map(role => [role.id, role])
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
    }
  },
  plugins: [persistence, socket]
});
