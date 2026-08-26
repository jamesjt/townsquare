// Golem fork: every session entry path (panel, hash link, toolbar) lands on
// setSessionId — remembering the town HERE catches them all.
const {
  rememberTown,
  sessionIdFromPath,
  normalizeTownId
} = require("../golem/towns");
// FT-860: the night log is stashed PER TOWN (the same idiom golem/stats uses
// for the deal moment); the visibility mode is a standing setting.
const {
  loadLog,
  saveLog,
  loadMode,
  saveMode,
  // FT-874: the "require every row ticked before the night can end" setting.
  loadRequireChecks,
  saveRequireChecks
} = require("../golem/nightLog");

module.exports = store => {
  const updatePagetitle = isPublic =>
    (document.title = `Blood on the Clocktower ${
      isPublic ? "Town Square" : "Grimoire"
    }`);

  // FT-889: the town named by the URL — a clean /<town> path, or a legacy
  // #<town> link. Empty means this url names no town at all.
  const urlTown =
    window.location.hash.substr(1) || sessionIdFromPath(window.location.pathname);

  // FT-889: a bare url means you are not in a town. If the stash still names
  // one, this browser LEFT it (typed "/", followed a bare link, arrived from
  // anywhere that is not the town) — so the town's local mirror goes with it,
  // exactly as the leave pill already does (Menu.leaveSession clears seats,
  // bluffs and fabled on the way out). Without this the entry screen stays
  // unreachable a second way: the session is gone but the last town's seats
  // are restored, and seats alone render the sessionless square.
  //
  // The stash is the discriminator, so an IN-PERSON grimoire — one that was
  // never in a town — has none of this run against it and keeps its seats.
  // The towns shelf is untouched either way: it is what makes you the host
  // again when you come back to /<town>.
  if (localStorage.getItem("session") && !urlTown) {
    ["session", "players", "bluffs", "fabled"].forEach(key =>
      localStorage.removeItem(key)
    );
  }

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
  // Golem fork (2026-08-19): the bluffs cluster defaults SHOWN, so the stash
  // records only the HIDDEN state — an untouched browser, and every new one,
  // gets the default without a key having to exist.
  if (localStorage.getItem("bluffsHidden")) {
    store.commit("toggleBluffsOpen", false);
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
  // FT-889: the URL is the one thing that says which town you are in, so this
  // block no longer RESTORES a session. It used to put you back into your last
  // town whenever the URL named none — which made the entry screen unreachable
  // except by the leave pill. A bare URL is now the entry screen, always.
  //
  // Kept as a corroborating READ of the ROLE: when the URL already names the
  // same town, the stash's spectator flag is seeded here so nothing flickers
  // before socket.js's boot resolver runs. That resolver (golem/townRoute →
  // resolveTownRole, reading the towns shelf) commits after this plugin and
  // wins any disagreement — it is the authority on who this browser is.
  if (localStorage.getItem("session")) {
    try {
      const [spectator, sessionId] = JSON.parse(localStorage.getItem("session"));
      if (urlTown && normalizeTownId(urlTown) === normalizeTownId(sessionId)) {
        store.commit("session/setSpectator", spectator);
      }
    } catch (e) {
      // an unreadable stash says nothing; the shelf answers on its own
    }
  }
  // FT-931: THE ENDED TOWN, restored before the socket ever opens.
  //
  // Every other synced-but-unpersisted field (isNight, nomination) is safe to
  // lose on reload because SOMEONE ELSE — the host — still holds the truth and
  // corrects it the moment a resync lands. isEnded has no such backstop: the
  // HOST is the authority on it, and a host who reloads their own tab has
  // nobody else to be corrected BY. Without this, the host's own refresh
  // after ending a game would silently un-end it — broadcasting isEnded:false
  // to every player who reconnects afterward, exactly backwards.
  //
  // Same idiom `players`/`session` already use: a flat, single-slot stash (no
  // per-town key), because this browser only ever mirrors one town at a time.
  if (localStorage.getItem("gameEnded")) {
    try {
      const { winningTeam } = JSON.parse(localStorage.getItem("gameEnded"));
      store.commit("endGame", winningTeam);
    } catch (e) {
      // an unreadable stash says nothing; the game resumes live
    }
  }

  /**** FT-860: night sheet + log ****/
  // The mode is a standing setting, so it is read before any town is known.
  const savedMode = loadMode();
  if (savedMode) store.commit("night/setMode", savedMode);
  // FT-874: same idiom — a standing setting, read before any town is known.
  const savedRequireChecks = loadRequireChecks();
  if (savedRequireChecks !== null)
    store.commit("night/setRequireChecks", savedRequireChecks);
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
      // FT-931: the game-end reveal writes grimoire.isPublic directly (a
      // different mutation, not toggleGrimoire — see store/index.js), so it
      // needs its own case to keep the tab title in step. isPublic itself is
      // deliberately NOT stashed to localStorage.isGrimoire here — that key
      // is a browser's standing preference, and the reveal's isPublic value
      // is a CONSEQUENCE of isEnded, not an independent preference; restoring
      // gameEnded (below) on boot re-derives it via the same endGame mutation
      // that set it live, rather than two stashes that could disagree.
      case "endGame":
      case "clearEnded":
        if (state.session.isEnded) {
          localStorage.setItem(
            "gameEnded",
            JSON.stringify({ winningTeam: state.session.winningTeam })
          );
        } else {
          localStorage.removeItem("gameEnded");
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
      case "toggleBluffsOpen":
        if (state.grimoire.isBluffsOpen) {
          localStorage.removeItem("bluffsHidden");
        } else {
          localStorage.setItem("bluffsHidden", 1);
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
      // FT-1163: `players/setDeathMoment` joins this list. The death moment is
      // stamped by its own mutation so it never reaches the wire (see that
      // mutation), and a type missing from here would mean a host reload kept
      // THAT a seat died and dropped WHEN. The stash keeps whole player
      // objects, so the two fields ride along with no projection change.
      case "players/add":
      case "players/update":
      case "players/setDeathMoment":
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
      // FT-882: removeEntry joins them — a deleted row has to leave the stash
      // as well, or a reload brings it straight back.
      case "night/setMode":
        saveMode(state.night.mode);
        break;
      case "night/setRequireChecks":
        saveRequireChecks(state.night.requireChecks);
        break;
      case "toggleNight":
      case "night/setDay":
      case "night/setLog":
      case "night/addEntry":
      case "night/patchEntry":
      case "night/removeEntry":
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
