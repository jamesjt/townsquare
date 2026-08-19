// Golem fork: every session entry path (panel, hash link, toolbar) lands on
// setSessionId — remembering the town HERE catches them all.
const { rememberTown, sessionIdFromPath } = require("../golem/towns");
// FT-860: the night log is stashed PER TOWN (the same idiom golem/stats uses
// for the deal moment); the visibility mode is a standing setting.
const {
  loadLog,
  saveLog,
  loadMode,
  saveMode
} = require("../golem/nightLog");

module.exports = store => {
  const updatePagetitle = isPublic =>
    (document.title = `Blood on the Clocktower ${
      isPublic ? "Town Square" : "Grimoire"
    }`);

  // initialize data
  if (localStorage.getItem("background")) {
    store.commit("setBackground", localStorage.background);
  }
  if (localStorage.getItem("muted")) {
    store.commit("toggleMuted", true);
  }
  if (localStorage.getItem("static")) {
    store.commit("toggleStatic", true);
  }
  if (localStorage.getItem("imageOptIn")) {
    store.commit("toggleImageOptIn", true);
  }
  if (localStorage.getItem("zoom")) {
    store.commit("setZoom", parseFloat(localStorage.getItem("zoom")));
  }
  if (localStorage.getItem("isGrimoire")) {
    store.commit("toggleGrimoire", false);
    updatePagetitle(false);
  }
  if (localStorage.roles !== undefined) {
    store.commit("setCustomRoles", JSON.parse(localStorage.roles));
    store.commit("setEdition", { id: "custom" });
  }
  if (localStorage.edition !== undefined) {
    // this will initialize state.roles for official editions
    store.commit("setEdition", JSON.parse(localStorage.edition));
  }
  if (localStorage.bluffs !== undefined) {
    JSON.parse(localStorage.bluffs).forEach((role, index) => {
      store.commit("players/setBluff", {
        index,
        role: store.state.roles.get(role) || {}
      });
    });
  }
  if (localStorage.fabled !== undefined) {
    store.commit("players/setFabled", {
      fabled: JSON.parse(localStorage.fabled).map(
        fabled => store.state.fabled.get(fabled.id) || fabled
      )
    });
  }
  if (localStorage.players) {
    // FT-861: the believed role is stashed as an id beside the true one and is
    // resolved the same way — null (not {}) when the seat believes the truth,
    // because "no belief" is what golem/belief.js tests for.
    const roleById = id =>
      store.state.roles.get(id) || store.getters.rolesJSONbyId.get(id);
    store.commit(
      "players/set",
      JSON.parse(localStorage.players).map(player => ({
        ...player,
        role: roleById(player.role) || {},
        believedRole: player.believedRole
          ? roleById(player.believedRole) || null
          : null
      }))
    );
  }
  /**** Session related data *****/
  if (localStorage.getItem("playerId")) {
    store.commit("session/setPlayerId", localStorage.getItem("playerId"));
  }
  if (
    localStorage.getItem("session") &&
    !window.location.hash.substr(1) &&
    !sessionIdFromPath(window.location.pathname)
  ) {
    const [spectator, sessionId] = JSON.parse(localStorage.getItem("session"));
    store.commit("session/setSpectator", spectator);
    store.commit("session/setSessionId", sessionId);
  }

  /**** FT-860: night sheet + log ****/
  // The mode is a standing setting, so it is read before any town is known.
  const savedMode = loadMode();
  if (savedMode) store.commit("night/setMode", savedMode);
  // The log belongs to a TOWN — read whichever one the block above restored.
  // (setSessionId's own handler below catches every later hop between towns.)
  const bootLog = loadLog(store.state.session.sessionId);
  if (bootLog) store.commit("night/setLog", bootLog);

  // listen to mutations
  store.subscribe(({ type, payload }, state) => {
    switch (type) {
      case "toggleGrimoire":
        if (!state.grimoire.isPublic) {
          localStorage.setItem("isGrimoire", 1);
        } else {
          localStorage.removeItem("isGrimoire");
        }
        updatePagetitle(state.grimoire.isPublic);
        break;
      case "setBackground":
        if (payload) {
          localStorage.setItem("background", payload);
        } else {
          localStorage.removeItem("background");
        }
        break;
      case "toggleMuted":
        if (state.grimoire.isMuted) {
          localStorage.setItem("muted", 1);
        } else {
          localStorage.removeItem("muted");
        }
        break;
      case "toggleStatic":
        if (state.grimoire.isStatic) {
          localStorage.setItem("static", 1);
        } else {
          localStorage.removeItem("static");
        }
        break;
      case "toggleImageOptIn":
        if (state.grimoire.isImageOptIn) {
          localStorage.setItem("imageOptIn", 1);
        } else {
          localStorage.removeItem("imageOptIn");
        }
        break;
      case "setZoom":
        if (payload !== 0) {
          localStorage.setItem("zoom", payload);
        } else {
          localStorage.removeItem("zoom");
        }
        break;
      case "setEdition":
        localStorage.setItem("edition", JSON.stringify(payload));
        if (state.edition.isOfficial) {
          localStorage.removeItem("roles");
        }
        break;
      case "setCustomRoles":
        if (!payload.length) {
          localStorage.removeItem("roles");
        } else {
          localStorage.setItem("roles", JSON.stringify(payload));
        }
        break;
      case "players/setBluff":
        localStorage.setItem(
          "bluffs",
          JSON.stringify(state.players.bluffs.map(({ id }) => id))
        );
        break;
      case "players/setFabled":
        localStorage.setItem(
          "fabled",
          JSON.stringify(
            state.players.fabled.map(fabled =>
              fabled.isCustom ? fabled : { id: fabled.id }
            )
          )
        );
        break;
      case "players/add":
      case "players/update":
      case "players/remove":
      case "players/clear":
      case "players/set":
      case "players/swap":
      case "players/move":
        if (state.players.players.length) {
          localStorage.setItem(
            "players",
            JSON.stringify(
              state.players.players.map(player => ({
                ...player,
                // simplify the stored data
                role: player.role.id || {},
                // FT-861: what this seat's player was TOLD they are, by id;
                // null when they were told the truth
                believedRole:
                  (player.believedRole && player.believedRole.id) || null
              }))
            )
          );
        } else {
          localStorage.removeItem("players");
        }
        break;
      case "session/setSessionId":
        if (payload) {
          localStorage.setItem(
            "session",
            JSON.stringify([state.session.isSpectator, payload])
          );
          // Remember the SANITIZED id (state, not payload) — the shelf must
          // name the town the socket actually joins.
          rememberTown(
            state.session.sessionId,
            state.session.isSpectator ? "player" : "host"
          );
          // FT-860: a town carries its own night log — hopping to another
          // town must never show the last one's. An unknown town starts clean.
          store.commit(
            "night/setLog",
            loadLog(state.session.sessionId) || { day: 0, entries: [] }
          );
        } else {
          localStorage.removeItem("session");
        }
        break;
      // FT-860 — the night sheet. The mode is a standing setting; the log and
      // the day counter are stashed against the town they belong to. The day
      // moves inside toggleNight (see the root mutation), so the phase flip
      // has to write too or a reload would lose which night it is.
      case "night/setMode":
        saveMode(state.night.mode);
        break;
      case "toggleNight":
      case "night/setDay":
      case "night/setLog":
      case "night/addEntry":
      case "night/patchEntry":
        saveLog(state.session.sessionId, state.night.day, state.night.entries);
        break;
      case "session/setPlayerId":
        if (payload) {
          localStorage.setItem("playerId", payload);
        } else {
          localStorage.removeItem("playerId");
        }
        break;
    }
  });
};
