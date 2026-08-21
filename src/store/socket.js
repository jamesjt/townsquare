import {
  enterWhenOpen,
  normalizeTownId,
  sessionIdFromPath,
} from "../golem/towns";
// FT-889: the URL is the one thing that says which town you are in. This is
// where the address bar is written and read; the role always comes from the
// shelf, never from the link.
import {
  enterTown,
  isReplayingHistory,
  leaveTown,
  resolveTownRole,
  syncAddressBar,
  withHistory,
} from "../golem/townRoute";
// FT-861: what a seat's player is TOLD they are. Every message that carries a
// character TO a player reads this instead of player.role.
import { beliefOf } from "../golem/belief";
// 2026-08-19: the demon's three bluffs now cross the wire, to the demon's own
// seat and the Lunatic's. `believesDemon` is the same test the clock face and
// the menu strip use, so the sender cannot drift from the viewer.
import { believesDemon, BLUFF_COUNT } from "../golem/bluffs";
// FT-880: the town summons. The sound is bundled in every client, so the
// message carries nothing and this is the only import it needs.
import { playCallBack } from "../golem/callBack";
// FT-890: the app's own transient notice — the relay's reason is said here,
// never in a browser dialog.
import { flashHint } from "../golem/hint";
// FT-1013: a town OWNER refused as a duplicate host is offered an
// authenticated takeover instead of a dead end.
import { offerHostTakeover, takeoverSuffix } from "../golem/hostTakeover";
// FT-965: the town log. `chatErrorText` says a relay refusal in the app's own
// voice; `gameIdFor` derives the game a line belongs to from the deal moment
// the host already stashes (golem/stats), so no new per-game identity is minted.
import { chatErrorText, gameIdFor } from "../golem/chat";
// FT-1010: the event envelope — a game event riding a system row's body.
import { encodeEvent } from "../golem/chronicles";
// FT-1005: a player wakes to their own night action. The projection is the
// privacy rule made code — a player-bound night row NEVER carries the lie
// mark, the done tick, or the true/shown pair (see golem/nightLog).
import { projectEntriesFor } from "../golem/nightLog";

class LiveSession {
  constructor(store) {
    // Golem fork: live sessions go through OUR relay on the same host the app
    // is served from (Caddy proxies /ws to it), so the fork never leans on the
    // upstream project's infrastructure. Local dev keeps the localhost relay.
    this._wss =
      process.env.NODE_ENV === "development"
        ? "ws://localhost:8081/"
        : `wss://${window.location.host}/ws/`;
    this._socket = null;
    this._isSpectator = true;
    this._gamestate = [];
    this._store = store;
    this._pingInterval = 30 * 1000; // 30 seconds between pings
    this._pingTimer = null;
    this._reconnectTimer = null;
    this._players = {}; // map of players connected to a session
    this._pings = {}; // map of player IDs to ping
    // reconnect to previous session
    if (this._store.state.session.sessionId) {
      this.connect(this._store.state.session.sessionId);
    }
  }

  /**
   * Open a new session for the passed channel.
   * @param channel
   * @private
   */
  _open(channel) {
    this.disconnect();
    this._socket = new WebSocket(
      this._wss +
        channel +
        "/" +
        (this._isSpectator ? this._store.state.session.playerId : "host") +
        // FT-1013: one-shot owner-takeover credential; "" in every other case.
        takeoverSuffix(channel, this._isSpectator),
    );
    this._socket.addEventListener("message", this._handleMessage.bind(this));
    this._socket.onopen = this._onOpen.bind(this);
    this._socket.onclose = (err) => {
      this._socket = null;
      clearInterval(this._pingTimer);
      this._pingTimer = null;
      // FT-1011: a maintenance shutdown (the relay restarting for a deploy)
      // closes every socket with code 1000 and NO reason — the server never
      // calls ws.close() at all, the process just drops out from under the
      // connection. That is indistinguishable from a deliberate eviction by
      // code alone, and treating it as one exiled every connected town the
      // moment a routine deploy restarted the relay. The two deliberate
      // eviction paths (refuseDuplicateHost's duplicate-host refusal, and the
      // spam-disconnect in server/index.js) both ALWAYS pass a reason string
      // — that is the one signal that actually distinguishes "the relay put
      // you out" from "the relay went away". So: reasonless 1000 now reads as
      // an interruption, same as any non-1000 close.
      if (err.code !== 1000 || !err.reason) {
        // connection interrupted, reconnect after 3 seconds
        this._store.commit("session/setReconnecting", true);
        this._reconnectTimer = setTimeout(
          () => this.connect(channel),
          3 * 1000,
        );
      } else {
        // FT-890: the relay ended the session (a refused duplicate host, a
        // spam disconnect). That is LEAVING, and leaving is one call: clearing
        // the session id alone left seats, roles and bluffs on the table, and
        // seats alone render the sessionless in-person square — so the app sat
        // in a town it was no longer connected to, with no way back to the
        // entry screen.
        // FT-1013: the town's owner, refused as a duplicate host, is offered
        // an authenticated takeover; the module owns both outcomes.
        if (offerHostTakeover(err.reason, channel, this)) return;
        leaveTown(this._store);
        // ...and the reason is said IN the app. alert() was doubly wrong here:
        // a browser dialog is silently auto-dismissed in some contexts (the
        // trap Menu.leaveSession and the script editor's save path each hit
        // before this), and it blocks the page at the exact moment the app is
        // trying to put itself back together.
        flashHint(err.reason);
      }
    };
  }

  /**
   * Send a message through the socket.
   * @param command
   * @param params
   * @private
   */
  _send(command, params) {
    if (this._socket && this._socket.readyState === 1) {
      this._socket.send(JSON.stringify([command, params]));
    }
  }

  /**
   * Send a message directly to a single playerId, if provided.
   * Otherwise broadcast it.
   * @param playerId player ID or "host", optional
   * @param command
   * @param params
   * @private
   */
  _sendDirect(playerId, command, params) {
    if (playerId) {
      this._send("direct", { [playerId]: [command, params] });
    } else {
      this._send(command, params);
    }
  }

  /**
   * Open event handler for socket.
   * @private
   */
  _onOpen() {
    if (this._isSpectator) {
      this._sendDirect(
        "host",
        "getGamestate",
        this._store.state.session.playerId,
      );
    } else {
      this.sendGamestate();
    }
    this._ping();
    // FT-965: CATCH THE LOG UP, on every open — the first one and every
    // reconnect alike. A reconnect is exactly the case the split between
    // `syncedSeq` and the live stream exists for: whatever the drop swallowed
    // sits above the cursor, and this is the read that fills it. Idempotent by
    // construction (the action refuses to overlap itself, and every row is
    // deduped by seq), so the drawer opening and calling it again is free.
    this._store.dispatch("chatCatchUp");
  }

  /**
   * Send a ping message with player ID and ST flag.
   * @private
   */
  _ping() {
    this._handlePing();
    this._send("ping", [
      this._isSpectator
        ? this._store.state.session.playerId
        : Object.keys(this._players).length,
      "latency",
    ]);
    clearTimeout(this._pingTimer);
    this._pingTimer = setTimeout(this._ping.bind(this), this._pingInterval);
  }

  /**
   * Handle an incoming socket message.
   * @param data
   * @private
   */
  _handleMessage({ data }) {
    let command, params;
    try {
      [command, params] = JSON.parse(data);
    } catch (err) {
      console.log("unsupported socket message", data);
    }
    switch (command) {
      case "getGamestate":
        this.sendGamestate(params);
        break;
      case "edition":
        this._updateEdition(params);
        break;
      case "fabled":
        this._updateFabled(params);
        break;
      case "gs":
        this._updateGamestate(params);
        break;
      case "player":
        this._updatePlayer(params);
        break;
      case "claim":
        this._updateSeat(params);
        break;
      case "ping":
        this._handlePing(params);
        break;
      case "nomination":
        if (!this._isSpectator) return;
        if (!params) {
          // create vote history record
          this._store.commit(
            "session/addHistory",
            this._store.state.players.players,
          );
        }
        this._store.commit("session/nomination", { nomination: params });
        break;
      case "swap":
        if (!this._isSpectator) return;
        this._store.commit("players/swap", params);
        break;
      case "move":
        if (!this._isSpectator) return;
        this._store.commit("players/move", params);
        break;
      case "remove":
        if (!this._isSpectator) return;
        this._store.commit("players/remove", params);
        break;
      case "marked":
        if (!this._isSpectator) return;
        this._store.commit("session/setMarkedPlayer", params);
        break;
      case "isNight":
        if (!this._isSpectator) return;
        this._store.commit("toggleNight", params);
        break;
      // FT-882: the storyteller moved the night counter by hand (the night
      // sheet's day scrub). Its own channel rather than a full gamestate
      // resend — the same shape every other one-value ST broadcast here has.
      case "nightDay":
        if (!this._isSpectator) return;
        this._store.commit("night/setDay", params);
        break;
      case "isVoteHistoryAllowed":
        if (!this._isSpectator) return;
        this._store.commit("session/setVoteHistoryAllowed", params);
        this._store.commit("session/clearVoteHistory");
        break;
      case "votingSpeed":
        if (!this._isSpectator) return;
        this._store.commit("session/setVotingSpeed", params);
        break;
      case "clearVoteHistory":
        if (!this._isSpectator) return;
        this._store.commit("session/clearVoteHistory");
        break;
      case "isVoteInProgress":
        if (!this._isSpectator) return;
        this._store.commit("session/setVoteInProgress", params);
        break;
      case "vote":
        this._handleVote(params);
        break;
      case "lock":
        this._handleLock(params);
        break;
      case "bye":
        this._handleBye(params);
        break;
      case "callback":
        // FT-880: THE RECEIVER'S REFUSAL. A call-back travels storyteller →
        // town, so a storyteller's own client has no business acting on one
        // arriving; the same shape as every ST-only broadcast above. The
        // sender refuses too (callBack, below), and the relay refuses to
        // forward a call-back that did not come from the host — three
        // independent noes, so no future sender can ring the town by accident
        // and no player can do it on purpose from a console.
        if (!this._isSpectator) return;
        // A player's OWN mute setting outranks the summons — see the note on
        // playCallBack. Read here rather than in the module so the module
        // never has to know there is a store.
        playCallBack(this._store.state.grimoire.isMuted);
        break;
      case "bluffs":
        this._updateBluffs(params);
        break;
      // FT-1003: the granted grimoire opening or closing on THIS client —
      // always a direct frame to one seat, never a broadcast (see
      // sendGrimoire for why that shape cannot exist).
      case "grimoire":
        this._updateGrimoireGrant(params);
        break;
      // FT-1005: a player's own night rows arriving on THEIR client — always
      // a direct frame to one seat, never a broadcast (see sendNightRows).
      case "night":
        this._updateNightRows(params);
        break;
      // FT-1005: ...and a player's own night input arriving at the host —
      // always a direct frame TO the host (the same player→host direct lane
      // "claim" and "getGamestate" already ride).
      case "nightAction":
        this._updateNightAction(params);
        break;
      case "playername":
        this._updatePlayerName(params);
        break;
      case "pronouns":
        this._updatePlayerPronouns(params);
        break;
      // FT-965: A LINE THE STORE ACCEPTED. `params` is the platform's row
      // verbatim — id, seq, createdAt and all — echoed by the relay after the
      // store took it, so nothing reaches a log here that was not recorded.
      //
      // Every client applies this, the storyteller's included: the relay
      // echoes to the sender too, so a line appears once, from the store,
      // rather than being optimistically appended locally and then arriving
      // again. There is deliberately no `isSpectator` guard — chat is the one
      // thing in this file that travels in BOTH directions.
      //
      // The privacy rule is not here. It is in `chatIngest` (store/index.js),
      // where the catch-up read comes through the same door — see its note for
      // why the client has to drop whispers even though the relay never sends
      // this client one it should not have.
      case "chat":
        this._store.commit("chatIngest", [params]);
        break;
      // ...and the sender-only refusal. Nobody saw the line; say so where the
      // sender is looking, which is the composer.
      case "chatError":
        this._store.commit("chatError", chatErrorText(params && params.reason));
        break;
    }
  }

  /**
   * Connect to a new live session, either as host or spectator.
   * Set a unique playerId if there isn't one yet.
   * @param channel
   */
  connect(channel) {
    if (!this._store.state.session.playerId) {
      this._store.commit(
        "session/setPlayerId",
        Math.random().toString(36).substr(2),
      );
    }
    this._pings = {};
    this._store.commit("session/setPlayerCount", 0);
    this._store.commit("session/setPing", 0);
    this._isSpectator = this._store.state.session.isSpectator;
    this._open(channel);
  }

  /**
   * Close the current session, if any.
   */
  disconnect() {
    this._pings = {};
    this._store.commit("session/setPlayerCount", 0);
    this._store.commit("session/setPing", 0);
    this._store.commit("session/setReconnecting", false);
    clearTimeout(this._reconnectTimer);
    if (this._socket) {
      if (this._isSpectator) {
        this._sendDirect("host", "bye", this._store.state.session.playerId);
      }
      // FT-889: a close WE asked for must not report back as the session
      // ending. The handler exists for a server-side 1000 close (it clears
      // the session and shows the relay's reason); it fires late — after the
      // socket finishes closing — so on a town→town hop (Back/Forward
      // between two towns) the old socket's close would land after the new
      // session id is set and wipe it. Detaching first leaves the
      // server-initiated path untouched, since we did not initiate those.
      this._socket.onclose = null;
      this._socket.close(1000);
      this._socket = null;
    }
  }

  /**
   * Publish the current gamestate.
   * Optional param to reduce traffic. (send only player data)
   * @param playerId
   * @param isLightweight
   */
  sendGamestate(playerId = "", isLightweight = false) {
    if (this._isSpectator) return;
    const { session } = this._store.state;
    this._gamestate = this._store.state.players.players.map((player) => ({
      name: player.name,
      id: player.id,
      isDead: player.isDead,
      isVoteless: player.isVoteless,
      pronouns: player.pronouns,
      // FT-931: THE REVEAL'S DATA. Once the town has ENDED there is no
      // belief left to protect — every seat's TRUE character rides the
      // ordinary gamestate sync now, on the exact field travelers have
      // always carried over it (roleId). The receiving end
      // (_updateGamestate, below) already applies ANY roleId it finds —
      // that logic was never actually traveler-specific, only the SENDER
      // was — so this is the only change the reveal needs on the wire.
      ...(session.isEnded
        ? { roleId: (player.role && player.role.id) || "" }
        : player.role && player.role.team === "traveler"
        ? { roleId: player.role.id }
        : {}),
    }));
    if (isLightweight) {
      this._sendDirect(playerId, "gs", {
        gamestate: this._gamestate,
        isLightweight,
      });
    } else {
      const { grimoire } = this._store.state;
      const { fabled } = this._store.state.players;
      this.sendEdition(playerId);
      // FT-965: WHICH GAME IS BEING PLAYED, for the chat log to filter by.
      // Only the storyteller's browser holds the deal-moment stash the id is
      // derived from, so this sync is how a player learns it — the same
      // "the host is the authority, a joiner inherits it" shape `nightDay`
      // above already has. Committed locally too, so the host's own composer
      // tags its lines with the same id it just told the town.
      const gameId = gameIdFor(this._store.state.session.sessionId);
      this._store.commit("chatSetGameId", gameId);
      this._sendDirect(playerId, "gs", {
        gamestate: this._gamestate,
        gameId,
        isNight: grimoire.isNight,
        // FT-882: WHICH night it is, sent explicitly. Until now every client
        // DERIVED this by counting its own day→night transitions, which is
        // exact as long as nobody ever corrects it — and the night sheet now
        // lets a storyteller correct it. A joiner also inherits the right
        // number instead of starting from zero.
        nightDay: this._store.state.night.day,
        isVoteHistoryAllowed: session.isVoteHistoryAllowed,
        nomination: session.nomination,
        votingSpeed: session.votingSpeed,
        lockedVote: session.lockedVote,
        isVoteInProgress: session.isVoteInProgress,
        markedPlayer: session.markedPlayer,
        fabled: fabled.map((f) => (f.isCustom ? f : { id: f.id })),
        // FT-931: the ended flag + the result. A joining or reconnecting
        // client learns the town is over from this same full sync — the
        // reveal's role data travels in `gamestate` above, so the two
        // arrive together, exactly as they do for a client already
        // connected when the game ends (see the "endGame"/"clearEnded"
        // cases in the mutation subscriber below).
        isEnded: session.isEnded,
        winningTeam: session.winningTeam,
        ...(session.nomination ? { votes: session.votes } : {}),
      });
      // 2026-08-19: a full sync is what a joining or RECONNECTING client gets,
      // so it is where a demon who refreshed gets their bluffs back. Sent on
      // its own channel, never inside the gamestate blob — that blob goes to
      // everyone, and this must not.
      this.sendBluffs(playerId);
      // FT-1003: ...and where a granted grimoire is settled for an arriving
      // client — a PINNED grant is re-delivered, an unpinned one is revoked
      // (it does not survive its holder's reconnect), and everyone else gets
      // the self-healing no-op revoke. Skipped on a broadcast sync: grants
      // are per-seat by construction.
      this._syncGrimoireGrant(playerId);
      // FT-1005: ...and each seat's own night rows — a joiner or reconnector
      // gets their notes back on the same full sync everything else rides.
      this.sendNightRows(playerId);
    }
  }

  /**
   * Update the gamestate based on incoming data.
   * @param data
   * @private
   */
  _updateGamestate(data) {
    if (!this._isSpectator) return;
    const {
      gamestate,
      isLightweight,
      isNight,
      // FT-882: the storyteller's night counter, now that it can be edited
      // by hand and is no longer derivable from the transitions alone
      nightDay,
      isVoteHistoryAllowed,
      nomination,
      votingSpeed,
      votes,
      lockedVote,
      isVoteInProgress,
      markedPlayer,
      fabled,
      // FT-931: the ended flag + result — see the matching fields sendGamestate
      // now sends, above.
      isEnded,
      winningTeam,
      // FT-965: which game the chat log's "this game" filter means.
      gameId,
    } = data;
    const players = this._store.state.players.players;
    // adjust number of players
    if (players.length < gamestate.length) {
      for (let x = players.length; x < gamestate.length; x++) {
        this._store.commit("players/add", gamestate[x].name);
      }
    } else if (players.length > gamestate.length) {
      for (let x = players.length; x > gamestate.length; x--) {
        this._store.commit("players/remove", x - 1);
      }
    }
    // update status for each player
    gamestate.forEach((state, x) => {
      const player = players[x];
      const { roleId } = state;
      // update relevant properties
      ["name", "id", "isDead", "isVoteless", "pronouns"].forEach((property) => {
        const value = state[property];
        if (player[property] !== value) {
          this._store.commit("players/update", { player, property, value });
        }
      });
      // roles are special, because of travelers
      if (roleId && player.role.id !== roleId) {
        const role =
          this._store.state.roles.get(roleId) ||
          this._store.getters.rolesJSONbyId.get(roleId);
        if (role) {
          this._store.commit("players/update", {
            player,
            property: "role",
            value: role,
          });
        }
      } else if (!roleId && player.role.team === "traveler") {
        this._store.commit("players/update", {
          player,
          property: "role",
          value: {},
        });
      }
    });
    if (!isLightweight) {
      // FT-965: the game the town is playing, straight from the storyteller.
      // Applied unconditionally — including when it is absent, which is the
      // real state BETWEEN games and must be able to clear a stale id.
      this._store.commit("chatSetGameId", gameId || null);
      this._store.commit("toggleNight", !!isNight);
      // FT-882: AFTER toggleNight, never before — that mutation is the one
      // place the counter auto-increments, so a value applied ahead of it
      // would be bumped by the very sync that delivered it. The host's
      // number is the authority; this overwrites whatever the client
      // counted for itself. Guarded so an older host that sends no
      // nightDay leaves the client's own count alone rather than zeroing it.
      if (typeof nightDay === "number") {
        this._store.commit("night/setDay", nightDay);
      }
      // FT-931: apply the ended state exactly as the host set it — but only
      // ever UN-end on an explicit "not ended" from the host (the `else if`
      // guard). A resync during a perfectly ordinary, never-ended game must
      // never touch `grimoire.isPublic`: that flag is also a storyteller's
      // own local R-toggle, and committing `clearEnded` on every sync that
      // simply has no opinion (isEnded undefined/false because the game
      // never ended) would stomp it on every reconnect. This only fires on a
      // genuine transition either way.
      if (isEnded) {
        this._store.commit("endGame", winningTeam);
      } else if (this._store.state.session.isEnded) {
        this._store.commit("clearEnded");
        // FT-931: PLAY AGAIN, retracting the reveal on THIS client.
        //
        // The gamestate loop above only ever clears a role when the incoming
        // roleId is empty AND the seat is currently a traveler — that rule
        // predates this feature and is right for what it was built for
        // (a traveler un-made mid-game), but a revealed NON-traveler role
        // never existed on a player's client before the ended-state reveal,
        // so nothing before now has ever had to retract one. Dispatching the
        // SAME action the host's own Play again uses (players/clearRoles)
        // reuses its existing spectator branch — "wipe every non-traveler
        // role's local knowledge, keep the seat" — rather than teaching the
        // generic sync loop a second, narrower clearing rule.
        this._store.dispatch("players/clearRoles");
      }
      this._store.commit("session/setVoteHistoryAllowed", isVoteHistoryAllowed);
      this._store.commit("session/nomination", {
        nomination,
        votes,
        votingSpeed,
        lockedVote,
        isVoteInProgress,
      });
      this._store.commit("session/setMarkedPlayer", markedPlayer);
      this._store.commit("players/setFabled", {
        fabled: fabled.map((f) => this._store.state.fabled.get(f.id) || f),
      });
    }
  }

  /**
   * Publish an edition update. ST only
   * @param playerId
   */
  sendEdition(playerId = "") {
    if (this._isSpectator) return;
    const { edition } = this._store.state;
    let roles;
    if (!edition.isOfficial) {
      roles = this._store.getters.customRolesStripped;
    }
    this._sendDirect(playerId, "edition", {
      edition: edition.isOfficial ? { id: edition.id } : edition,
      ...(roles ? { roles } : {}),
    });
  }

  /**
   * Update edition and roles for custom editions.
   * @param edition
   * @param roles
   * @private
   */
  _updateEdition({ edition, roles }) {
    if (!this._isSpectator) return;
    this._store.commit("setEdition", edition);
    if (roles) {
      this._store.commit("setCustomRoles", roles);
      if (this._store.state.roles.size !== roles.length) {
        const missing = [];
        roles.forEach(({ id }) => {
          if (!this._store.state.roles.get(id)) {
            missing.push(id);
          }
        });
        alert(
          `This session contains custom characters that can't be found. ` +
            `Please load them before joining! ` +
            `Missing roles: ${missing.join(", ")}`,
        );
        this.disconnect();
        this._store.commit("toggleModal", "edition");
      }
    }
  }

  /**
   * Publish a fabled update. ST only
   */
  sendFabled() {
    if (this._isSpectator) return;
    const { fabled } = this._store.state.players;
    this._send(
      "fabled",
      fabled.map((f) => (f.isCustom ? f : { id: f.id })),
    );
  }

  /**
   * Update fabled roles.
   * @param fabled
   * @private
   */
  _updateFabled(fabled) {
    if (!this._isSpectator) return;
    this._store.commit("players/setFabled", {
      fabled: fabled.map((f) => this._store.state.fabled.get(f.id) || f),
    });
  }

  /**
   * Publish a player update.
   * @param player
   * @param property
   * @param value
   */
  sendPlayer({ player, property, value }) {
    if (this._isSpectator || property === "reminders") return;
    const index = this._store.state.players.players.indexOf(player);
    // FT-871: a player object that is no longer in the roster (evicted while an
    // update was in flight) has no seat to name — indexOf hands back -1 and
    // every line below it addresses the wrong chair or none at all.
    if (index < 0) return;
    // FT-861: THE BELIEF IS NEVER BROADCAST. Without this the property would
    // fall through to the plain _send below and go to the whole town, naming
    // both the seat that does not know what it is and the character it thinks
    // it has — the loudest possible version of the leak this feature exists to
    // prevent. It travels to exactly one chair, and only after the deal.
    if (property === "believedRole") {
      this._sendBelief(player, index);
      return;
    }
    if (property === "role") {
      // FT-871: the gamestate is a PARALLEL array to the roster, rebuilt on
      // its own schedule — it can be shorter than the seating for a beat after
      // a chair appears. Both reads below used to assume the entry was there.
      // A missing entry means only that there is no traveller memory to keep;
      // the broadcast itself still has to go out.
      const seat = this._gamestate[index];
      if (value.team && value.team === "traveler") {
        // update local gamestate to remember this player as a traveler
        if (seat) seat.roleId = value.id;
        this._send("player", {
          index,
          property,
          value: value.id,
        });
        return;
      }
      if (seat && seat.roleId) {
        // player was previously a traveler
        delete seat.roleId;
        this._send("player", { index, property, value: "" });
      }
      // FT-861: a character changed on a chair AFTER the deal — the player
      // holding it is re-dealt what they BELIEVE, privately. On a believing
      // seat that is unchanged by construction (the belief did not move), so
      // editing the Drunk's true character tells them nothing.
      this._sendBelief(player, index);
      // FT-1003: any open grimoire window shows the town as it IS — a role
      // edit mid-grant refreshes every granted seat's copy, so their window
      // never goes stale against the storyteller's own grimoire.
      this._refreshGrimoire();
    } else {
      this._send("player", { index, property, value });
      // 2026-08-19: a chair that just changed hands may be the demon's. The
      // new holder gets the three, or an empty set if it is any other seat.
      if (property === "id" && value) this.sendBluffs(value);
    }
  }

  /**
   * Update a player based on incoming data. Player only.
   * @param index
   * @param property
   * @param value
   * @private
   */
  _updatePlayer({ index, property, value }) {
    if (!this._isSpectator) return;
    const player = this._store.state.players.players[index];
    if (!player) return;
    // FT-861: a player's client has no use for anybody's belief and nothing
    // sends one — refusing it here means a future sender cannot create the
    // leak by accident either.
    if (property === "believedRole") return;
    // special case where a player stops being a traveler
    if (property === "role") {
      if (!value && player.role.team === "traveler") {
        // reset to an unknown role
        this._store.commit("players/update", {
          player,
          property: "role",
          value: {},
        });
      } else {
        // load role, first from session, the global, then fail gracefully
        const role =
          this._store.state.roles.get(value) ||
          this._store.getters.rolesJSONbyId.get(value) ||
          {};
        this._store.commit("players/update", {
          player,
          property: "role",
          value: role,
        });
      }
    } else {
      // just update the player otherwise
      this._store.commit("players/update", { player, property, value });
    }
  }

  /**
   * Publish a player pronouns update
   * @param player
   * @param value
   * @param isFromSockets
   */
  /**
   * Golem fork: publish a player NAME update — the same spectator guard as
   * pronouns (only your own seat), so a player names their seat on claim and
   * the storyteller can still rename anyone.
   */
  sendPlayerName({ player, value, isFromSockets }) {
    if (
      isFromSockets ||
      (this._isSpectator && this._store.state.session.playerId !== player.id)
    )
      return;
    const index = this._store.state.players.players.indexOf(player);
    this._send("playername", [index, value]);
  }

  /** Golem fork: apply an incoming player-name update. */
  _updatePlayerName([index, value]) {
    const player = this._store.state.players.players[index];
    if (!player) return;
    this._store.commit("players/update", {
      player,
      property: "name",
      value,
      isFromSockets: true,
    });
  }

  sendPlayerPronouns({ player, value, isFromSockets }) {
    //send pronoun only for the seated player or storyteller
    //Do not re-send pronoun data for an update that was recieved from the sockets layer
    if (
      isFromSockets ||
      (this._isSpectator && this._store.state.session.playerId !== player.id)
    )
      return;
    const index = this._store.state.players.players.indexOf(player);
    this._send("pronouns", [index, value]);
  }

  /**
   * Update a pronouns based on incoming data.
   * @param index
   * @param value
   * @private
   */
  _updatePlayerPronouns([index, value]) {
    const player = this._store.state.players.players[index];

    this._store.commit("players/update", {
      player,
      property: "pronouns",
      value,
      isFromSockets: true,
    });
  }

  /**
   * Handle a ping message by another player / storyteller
   * @param playerIdOrCount
   * @param latency
   * @private
   */
  _handlePing([playerIdOrCount = 0, latency] = []) {
    const now = new Date().getTime();
    if (!this._isSpectator) {
      // remove players that haven't sent a ping in twice the timespan
      for (let player in this._players) {
        if (now - this._players[player] > this._pingInterval * 2) {
          delete this._players[player];
          delete this._pings[player];
        }
      }
      // remove claimed seats from players that are no longer connected
      this._store.state.players.players.forEach((player) => {
        if (player.id && !this._players[player.id]) {
          this._store.commit("players/update", {
            player,
            property: "id",
            value: "",
          });
        }
      });
      // store new player data
      if (playerIdOrCount) {
        this._players[playerIdOrCount] = now;
        const ping = parseInt(latency, 10);
        if (ping && ping > 0 && ping < 30 * 1000) {
          // ping to Players
          this._pings[playerIdOrCount] = ping;
          const pings = Object.values(this._pings);
          this._store.commit(
            "session/setPing",
            Math.round(pings.reduce((a, b) => a + b, 0) / pings.length),
          );
        }
      }
    } else if (latency) {
      // ping to ST
      this._store.commit("session/setPing", parseInt(latency, 10));
    }
    // update player count
    if (!this._isSpectator || playerIdOrCount) {
      this._store.commit(
        "session/setPlayerCount",
        this._isSpectator ? playerIdOrCount : Object.keys(this._players).length,
      );
    }
  }

  /**
   * Handle a player leaving the sessions. ST only
   * @param playerId
   * @private
   */
  _handleBye(playerId) {
    if (this._isSpectator) return;
    delete this._players[playerId];
    this._store.commit(
      "session/setPlayerCount",
      Object.keys(this._players).length,
    );
  }

  /**
   * Claim a seat, needs to be confirmed by the Storyteller.
   * Seats already occupied can't be claimed.
   * @param seat either -1 to vacate or the index of the seat claimed
   */
  claimSeat(seat) {
    if (!this._isSpectator) return;
    const players = this._store.state.players.players;
    if (players.length > seat && (seat < 0 || !players[seat].id)) {
      this._send("claim", [seat, this._store.state.session.playerId]);
    }
  }

  /**
   * Update a player id associated with that seat.
   * @param index seat index or -1
   * @param value playerId to add / remove
   * @private
   */
  _updateSeat([index, value]) {
    if (this._isSpectator) return;
    const property = "id";
    const players = this._store.state.players.players;
    // remove previous seat
    const oldIndex = players.findIndex(({ id }) => id === value);
    if (oldIndex >= 0 && oldIndex !== index) {
      this._store.commit("players/update", {
        player: players[oldIndex],
        property,
        value: "",
      });
    }
    // add playerId to new seat
    if (index >= 0) {
      const player = players[index];
      if (!player) return;
      this._store.commit("players/update", { player, property, value });
    }
    // update player session list as if this was a ping
    this._handlePing([true, value, 0]);
  }

  /**
   * Distribute player roles to all seated players in a direct message.
   * This will be split server side so that each player only receives their own (sub)message.
   */
  distributeRoles() {
    if (this._isSpectator) return;
    const message = {};
    this._store.state.players.players.forEach((player, index) => {
      if (player.id && player.role) {
        message[player.id] = [
          "player",
          // FT-861: THE SUBSTITUTION. This is the one moment a character
          // crosses to the player who holds that chair, so it is the one place
          // the Drunk is handed the Empath and the Lunatic is handed the Imp.
          // The truth never enters this message at all — it is not sent and
          // hidden, it is absent, which is the only version of this that
          // survives a missing CSS rule.
          { index, property: "role", value: beliefOf(player).id },
        ];
      }
    });
    if (Object.keys(message).length) {
      this._send("direct", message);
    }
    // 2026-08-19: the deal is also the moment the demon is told what they may
    // claim. Same beat as the characters, so the two never arrive apart.
    this.sendBluffs();
  }

  /**
   * FT-861: hand ONE seat's player the character they believe they have.
   *
   * The private twin of distributeRoles, for everything that happens after the
   * deal: a storyteller who makes a seat the Drunk on night two, or who edits a
   * character mid-game, would otherwise leave that player holding a stale (or
   * true) character. It is a DIRECT message by construction — a belief is
   * between the storyteller and one chair, and broadcasting it would tell the
   * whole town both that the seat is lying to itself and what it was told.
   *
   * Silent before the deal: nobody has been handed anything yet, and pushing a
   * character to a player mid-build is how the town learns the grimoire early.
   */
  _sendBelief(player, index) {
    if (this._isSpectator) return;
    if (!player || !player.id) return;
    if (!this._store.state.session.isRolesDistributed) return;
    this._sendDirect(player.id, "player", {
      index,
      property: "role",
      value: beliefOf(player).id || "",
    });
    // The seat's character just moved, which is the only thing that decides
    // whether it holds bluffs. One chair, same message.
    this.sendBluffs(player.id);
  }

  /**
   * 2026-08-19: HAND THE DEMON THEIR OWN THREE BLUFFS — and the Lunatic the
   * same three.
   *
   * NEVER A BROADCAST, structurally. There is no `_send("bluffs", …)` anywhere
   * and no path through `_sendDirect`'s broadcast-on-empty branch: this always
   * builds the `{playerId: [command, params]}` map the relay splits per
   * recipient, exactly as `distributeRoles` does for characters. A broadcast
   * here would hand every player the demon's bluffs, which is worse than not
   * shipping the feature at all — so the shape that could do it does not
   * exist rather than being guarded against.
   *
   * EVERY SEATED PLAYER GETS A MESSAGE, and that is deliberate: the ones who
   * do not hold bluffs get an EMPTY list, which is how a client that stops
   * being the demon (a Lunatic un-made, a character edited on the night) loses
   * what it was holding. An empty list carries nothing, so the extra
   * recipients learn nothing from being written to.
   *
   * SHARED WITH THE LUNATIC, not a second set. The Lunatic's whole job is to
   * be indistinguishable from the demon, and identical data over an identical
   * code path is the strongest form of that; a separate set needs a second
   * authoring surface, and an unfilled one shows the Lunatic three blanks
   * where the demon has three characters — a perfect tell, produced by the
   * storyteller forgetting rather than by anything they decided. The transport
   * is already per-seat, so a per-seat set later is a change to what goes in
   * this map, not to how it travels.
   *
   * @param playerId optional — only that one seat (a joiner, a chair that just
   *                 changed hands or character); omitted means every seat.
   */
  sendBluffs(playerId = "") {
    if (this._isSpectator) return;
    // Nothing is dealt yet: pushing characters at players mid-build is how the
    // town learns the grimoire early (the same guard `_sendBelief` carries).
    if (!this._store.state.session.isRolesDistributed) return;
    const bluffs = this._store.state.players.bluffs || [];
    const ids = [];
    for (let i = 0; i < BLUFF_COUNT; i++) {
      ids.push((bluffs[i] && bluffs[i].id) || "");
    }
    const message = {};
    this._store.state.players.players.forEach((player) => {
      if (!player.id) return;
      if (playerId && player.id !== playerId) return;
      message[player.id] = ["bluffs", believesDemon(player) ? ids : []];
    });
    if (Object.keys(message).length) {
      this._send("direct", message);
    }
  }

  /**
   * The three bluffs arriving at the one client entitled to them. Player only
   * — a storyteller's own copy is the authority and must never be written by
   * something coming back off the wire.
   * @param ids an array of role ids, or an empty array meaning "you hold none"
   * @private
   */
  _updateBluffs(ids) {
    if (!this._isSpectator) return;
    const list = Array.isArray(ids) ? ids : [];
    // Set every slot in order, 0 upward, including the empty ones: `setBluff`
    // splices, and splicing index 2 of an empty array appends at 0 — so slots
    // must be filled in sequence or the three arrive shuffled.
    for (let index = 0; index < BLUFF_COUNT; index++) {
      const id = list[index];
      const role =
        (id &&
          (this._store.state.roles.get(id) ||
            this._store.getters.rolesJSONbyId.get(id))) ||
        {};
      this._store.commit("players/setBluff", { index, role });
    }
  }

  /**
   * FT-1003: DELIVER ONE SEAT'S GRIMOIRE WINDOW — open or shut, whichever the
   * host's ledger (session.grimoireGrants) currently says for that playerId.
   *
   * NEVER A BROADCAST, structurally — the same rule sendBluffs states above:
   * this only ever calls `_sendDirect` with a concrete playerId, so the
   * broadcast-on-empty branch is unreachable. A grant payload is the list of
   * every OTHER seat's true role — the recipient's own seat is skipped, so a
   * seat whose belief differs from its truth (a Lunatic granted by mistake)
   * cannot learn what it really is from its own grant.
   *
   * A REVOKE IS SENT WHEN THE LEDGER HOLDS NOTHING, deliberately: the client
   * side is idempotent (revokeGrimoire no-ops when nothing is granted), so a
   * revoke frame doubles as the self-healing answer for a joiner and for a
   * host that reloaded and lost its ledger — a stale window always closes on
   * the holder's next full sync.
   *
   * @param playerId REQUIRED — the one seat this frame is for.
   */
  sendGrimoire(playerId) {
    if (this._isSpectator) return;
    if (!playerId) return;
    if (!this._store.state.session.isRolesDistributed) return;
    const grant = (this._store.state.session.grimoireGrants || {})[playerId];
    if (!grant) {
      this._sendDirect(playerId, "grimoire", false);
      return;
    }
    const seats = [];
    this._store.state.players.players.forEach((player, index) => {
      if (player.id === playerId) return;
      if (player.role && player.role.id) {
        seats.push({ index, roleId: player.role.id });
      }
    });
    this._sendDirect(playerId, "grimoire", seats);
  }

  /**
   * FT-1003: settle an arriving client's grimoire window (called from the
   * full-sync path). A pinned grant survives its holder's reconnect and is
   * re-delivered; an unpinned one dies — revoked through the ledger so the
   * night sheet's control shows the truth; no ledger entry sends the
   * self-healing revoke via sendGrimoire's own empty branch.
   */
  _syncGrimoireGrant(playerId) {
    if (this._isSpectator || !playerId) return;
    if (!this._store.state.session.isRolesDistributed) return;
    const grant = (this._store.state.session.grimoireGrants || {})[playerId];
    if (grant && !grant.pinned) {
      // the commit's subscriber sends the revoke frame
      this._store.commit("session/setGrimoireGrant", {
        playerId,
        granted: false,
      });
      return;
    }
    this.sendGrimoire(playerId);
  }

  /**
   * FT-1003: re-deliver every open grimoire window (a role changed mid-grant).
   * Almost always an empty loop — the ledger holds a key only while a window
   * is open.
   */
  _refreshGrimoire() {
    if (this._isSpectator) return;
    const grants = this._store.state.session.grimoireGrants || {};
    Object.keys(grants).forEach((playerId) => this.sendGrimoire(playerId));
  }

  /**
   * FT-1003: the grimoire window opening (an array of {index, roleId}) or
   * closing (anything else) on this client. Player only — the storyteller's
   * own grimoire is the authority and is never written from the wire.
   * Roles resolve here, the same session-then-global lookup _updateGamestate
   * uses; an id this client cannot resolve is skipped rather than rendered
   * as a blank coin.
   * @private
   */
  _updateGrimoireGrant(seats) {
    if (!this._isSpectator) return;
    if (!Array.isArray(seats)) {
      this._store.commit("revokeGrimoire");
      return;
    }
    const resolved = [];
    seats.forEach((seat) => {
      if (!seat || typeof seat.index !== "number") return;
      const role =
        this._store.state.roles.get(seat.roleId) ||
        this._store.getters.rolesJSONbyId.get(seat.roleId);
      if (role) resolved.push({ index: seat.index, role });
    });
    this._store.commit("grantGrimoire", resolved);
  }

  /**
   * FT-1005: DELIVER EACH SEAT'S OWN NIGHT ROWS — the read half of "a player
   * wakes to their own night action". Host only.
   *
   * NEVER A BROADCAST, structurally — the sendBluffs/sendGrimoire rule: this
   * only ever builds the `{playerId: [command, params]}` map the relay splits
   * per recipient, so no seat can receive another seat's rows by any path
   * through here. Each recipient's payload is built by projectEntriesFor,
   * which filters to THAT player's own readable rows and projects away
   * everything a player may not know (the lie mark, the done tick, the
   * true/shown pair — absent from the frame, not hidden by the client).
   *
   * `live` is the town's sharing verdict (mode === "everyone"). When it is
   * off every seat still gets a frame — with `live: false` and no rows —
   * which is how a town that stops sharing empties what players were holding;
   * an empty frame teaches its recipient nothing about anyone else.
   *
   * @param playerId optional — only that one seat (a joiner, the seat whose
   *                 row just changed); omitted means every claimed seat.
   */
  sendNightRows(playerId = "") {
    if (this._isSpectator) return;
    const { night, players } = this._store.state;
    const live = night.mode === "everyone";
    const message = {};
    players.players.forEach((player, seat) => {
      if (!player.id) return;
      if (playerId && player.id !== playerId) return;
      message[player.id] = [
        "night",
        {
          live,
          rows: live ? projectEntriesFor(night.entries, player.id, seat) : [],
        },
      ];
    });
    if (Object.keys(message).length) {
      this._send("direct", message);
    }
  }

  /**
   * FT-1005: the "night" frame landing. Player only — a storyteller's own
   * log is the authority and is never written from the wire. The mutation
   * re-projects every row on the way in (see night/setPlayerNight), so this
   * hands the params over whole.
   * @private
   */
  _updateNightRows(params) {
    if (!this._isSpectator) return;
    this._store.commit("night/setPlayerNight", params || {});
  }

  /**
   * FT-1005: SAY WHAT YOU DID TONIGHT — a player's own picks and words,
   * travelling player → host on the direct lane. The payload carries this
   * client's own playerId because the relay attaches no sender to a direct
   * frame — the same trust shape "claim" and "getGamestate" already have.
   */
  sendNightAction(payload) {
    if (!this._isSpectator) return;
    this._sendDirect("host", "nightAction", {
      ...payload,
      playerId: this._store.state.session.playerId,
    });
  }

  /**
   * FT-1005: a player's night input arriving. Host only.
   *
   * Two gates before the store sees it:
   *   · the sender must HOLD a seat (the claimed playerId resolves to one);
   *   · the roleId must be the character that seat was TOLD it has
   *     (beliefOf) — so a player can only ever write the row of the
   *     character they believe they are, never a believing seat's truth row,
   *     structurally.
   * The slot-by-slot merge (a storyteller's own entry is never silently
   * overwritten) lives in night/applyPlayerAction.
   *
   * The rows are re-sent even when nothing changed: the sender's client
   * shows what the HOST recorded, never local optimism, so every action
   * frame is answered by a state frame — including a refusal, which answers
   * with the standing state.
   * @private
   */
  _updateNightAction(params) {
    if (this._isSpectator) return;
    if (!params || typeof params !== "object") return;
    const { playerId, roleId, targets, text } = params;
    if (!playerId || !roleId) return;
    const seat = this._store.state.players.players.findIndex(
      (p) => p.id && p.id === playerId,
    );
    if (seat < 0) return;
    const player = this._store.state.players.players[seat];
    if (beliefOf(player).id !== roleId) return;
    this._store.dispatch("night/applyPlayerAction", {
      seat,
      roleId,
      targets,
      text,
    });
    this.sendNightRows(playerId);
  }

  /**
   * A player nomination. ST only
   * This also syncs the voting speed to the players.
   * Payload can be an object with {nomination} property or just the nomination itself, or undefined.
   * @param payload [nominator, nominee]|{nomination}
   */
  nomination(payload) {
    if (this._isSpectator) return;
    const nomination = payload ? payload.nomination || payload : payload;
    const players = this._store.state.players.players;
    if (
      !nomination ||
      (players.length > nomination[0] && players.length > nomination[1])
    ) {
      this.setVotingSpeed(this._store.state.session.votingSpeed);
      this._send("nomination", nomination);
    }
  }

  /**
   * Set the isVoteInProgress status. ST only
   */
  setVoteInProgress() {
    if (this._isSpectator) return;
    this._send("isVoteInProgress", this._store.state.session.isVoteInProgress);
  }

  /**
   * Send the isNight status. ST only
   */
  setIsNight() {
    if (this._isSpectator) return;
    this._send("isNight", this._store.state.grimoire.isNight);
  }

  /**
   * FT-882: send WHICH night it is. ST only.
   *
   * Only needed because the counter became editable — a phase flip still
   * moves it on every client by itself (toggleNight owns the increment), so
   * this carries the corrections, and the full gamestate carries the rest.
   */
  setNightDay() {
    if (this._isSpectator) return;
    this._send("nightDay", this._store.state.night.day);
  }

  /**
   * Send the isVoteHistoryAllowed state. ST only
   */
  setVoteHistoryAllowed() {
    if (this._isSpectator) return;
    this._send(
      "isVoteHistoryAllowed",
      this._store.state.session.isVoteHistoryAllowed,
    );
  }

  /**
   * Send the voting speed. ST only
   * @param votingSpeed voting speed in seconds, minimum 1
   */
  setVotingSpeed(votingSpeed) {
    if (this._isSpectator) return;
    if (votingSpeed) {
      this._send("votingSpeed", votingSpeed);
    }
  }

  /**
   * Set which player is on the block. ST only
   * @param playerIndex, player id or -1 for empty
   */
  setMarked(playerIndex) {
    if (this._isSpectator) return;
    this._send("marked", playerIndex);
  }

  /**
   * FT-880: CALL THE TOWN BACK. ST only.
   *
   * The lightest message in the file: no payload at all. Every client already
   * carries the sound in its own bundle, so "play it" is the entire contents —
   * which also means there is nothing here for a future change to accidentally
   * start leaking into.
   *
   * The storyteller's own client does NOT hear this come back (the relay never
   * echoes a message to its sender), so the press plays locally as well — see
   * App.callTownBack.
   */
  callBack() {
    if (this._isSpectator) return;
    this._send("callback");
  }

  /**
   * Clear the vote history for everyone. ST only
   */
  clearVoteHistory() {
    if (this._isSpectator) return;
    this._send("clearVoteHistory");
  }

  /**
   * Send a vote. Player or ST
   * @param index Seat of the player
   * @param sync Flag whether to sync this vote with others or not
   */
  vote([index]) {
    const player = this._store.state.players.players[index];
    if (
      this._store.state.session.playerId === player.id ||
      !this._isSpectator
    ) {
      // send vote only if it is your own vote or you are the storyteller
      this._send("vote", [
        index,
        this._store.state.session.votes[index],
        !this._isSpectator,
      ]);
    }
  }

  /**
   * Handle an incoming vote, but only if it is from ST or unlocked.
   * @param index
   * @param vote
   * @param fromST
   */
  _handleVote([index, vote, fromST]) {
    const { session, players } = this._store.state;
    const playerCount = players.players.length;
    const indexAdjusted =
      (index - 1 + playerCount - session.nomination[1]) % playerCount;
    if (fromST || indexAdjusted >= session.lockedVote - 1) {
      this._store.commit("session/vote", [index, vote]);
    }
  }

  /**
   * Lock a vote. ST only
   */
  lockVote() {
    if (this._isSpectator) return;
    const { lockedVote, votes, nomination } = this._store.state.session;
    const { players } = this._store.state.players;
    const index = (nomination[1] + lockedVote - 1) % players.length;
    this._send("lock", [this._store.state.session.lockedVote, votes[index]]);
  }

  /**
   * Update vote lock and the locked vote, if it differs. Player only
   * @param lock
   * @param vote
   * @private
   */
  _handleLock([lock, vote]) {
    if (!this._isSpectator) return;
    this._store.commit("session/lockVote", lock);
    if (lock > 1) {
      const { lockedVote, nomination } = this._store.state.session;
      const { players } = this._store.state.players;
      const index = (nomination[1] + lockedVote - 1) % players.length;
      if (this._store.state.session.votes[index] !== vote) {
        this._store.commit("session/vote", [index, vote]);
      }
    }
  }

  /**
   * FT-965: SAY SOMETHING IN THE TOWN. Anyone may — this is the one message in
   * this file that is not storyteller-to-town or town-to-storyteller.
   *
   * The frame is handed to the relay and nothing is appended locally: the
   * relay posts it to the store and only echoes it back once the store has
   * accepted it (server/chat.js), so a line that was never recorded can never
   * be on screen looking recorded. A refusal comes back as `chatError`, to
   * this sender alone.
   *
   * `to` is ROUTING — the raw connection playerId the relay hands the whisper
   * to — and is deliberately separate from `recipientKey`/`recipientSeat`,
   * which are the stored row's identity. The same split the "direct" case
   * above already draws.
   */
  sendChat(payload) {
    this._send("chat", payload);
  }

  /**
   * FT-965: a line the TOWN says about itself — a phase turning, a game
   * starting. Storyteller-only, matching the relay's own refusal of a system
   * message from anyone else; a player's client calling this is a no-op rather
   * than a frame the relay throws away.
   *
   * FT-1010: the line can now carry a MACHINE HALF — `event`, an object from
   * golem/chronicles' vocabulary (minus `text`, which is the first argument).
   * It rides INSIDE the body as the EV1 envelope, so the relay (untouched,
   * hand-deployed) and the store (untouched) carry it as the plain system row
   * it still is, and the chronicles surface decodes it back into a typed
   * event. Host-only authorship is the relay's own rule for `kind: "system"`,
   * which is exactly why events ride this kind: one writer, no duplicates.
   */
  systemMessage(text, event) {
    if (this._isSpectator) return;
    const { session, grimoire, chat, night } = this._store.state;
    if (!session.sessionId) return;
    this.sendChat({
      kind: "system",
      gameId: chat.gameId,
      senderKey: "system",
      senderKind: "system",
      body: event ? encodeEvent({ ...event, text }) : text,
      phase: grimoire.isNight ? "night" : "day",
      dayNumber: night.day,
    });
  }

  /**
   * Swap two player seats. ST only
   * @param payload
   */
  swapPlayer(payload) {
    if (this._isSpectator) return;
    this._send("swap", payload);
  }

  /**
   * Move a player to another seat. ST only
   * @param payload
   */
  movePlayer(payload) {
    if (this._isSpectator) return;
    this._send("move", payload);
  }

  /**
   * Remove a player. ST only
   * @param payload
   */
  removePlayer(payload) {
    if (this._isSpectator) return;
    this._send("remove", payload);
  }
}

/**
 * 2026-08-19 — ENTER THE TOWN, OR WAIT FOR ITS STORYTELLER TO OPEN IT.
 *
 * Shared by the two entry paths this file owns: the invite link parsed at
 * boot, and a Forward press back into a town. Both used to enter
 * unconditionally, which is how someone following a link before the town was
 * opened landed in an empty square with nothing to explain it.
 *
 * A HOST IS NEVER GATED. Opening a town is exactly the moment no host is
 * connected to it, so asking the relay first would lock the storyteller out
 * of their own game — the one failure this must not have.
 *
 * @param mode the history mode the entry commits under, once it happens
 */
const enterOrWait = (store, id, mode) => {
  const enter = () => withHistory(mode, () => enterTown(store, id));
  if (resolveTownRole(id) === "host") return enter();
  enterWhenOpen(id, enter).then((entered) => {
    if (entered) return;
    // Not open — so the waiting screen has to be reachable, and the waiting
    // screen IS the entry screen (App renders Intro only when there is no
    // session AND no seats). A boot from an invite link has just restored the
    // last game's seats from storage, so without this the player would sit in
    // front of a stale town square instead. Entering the town would have
    // replaced those seats with the host's gamestate anyway; this is the same
    // clearing, a beat earlier.
    //
    // "silent" because the address bar still names the town they were invited
    // to, and it stays true: that is the town they are waiting for, and a
    // reload puts them straight back onto this screen rather than losing it.
    withHistory("silent", () => leaveTown(store));
  });
};

export default (store) => {
  // setup
  const session = new LiveSession(store);

  // FT-1010: the live game id as last seen, for spotting the moment it
  // CHANGES. `chatSetGameId` is committed on every gamestate sync, almost
  // always with the value it already had — only an actual change means the
  // finished/live boundary moved and the log must be re-read (see the case
  // below).
  let lastLiveGameId = null;

  // listen to mutations
  store.subscribe(({ type, payload }, state) => {
    switch (type) {
      case "session/setSessionId":
        if (state.session.sessionId) {
          session.connect(state.session.sessionId);
        } else {
          session.disconnect();
        }
        // FT-889: the ONE place the address bar is written. Every entry path
        // funnels through this mutation — the intro's host/join, the menu's
        // join-by-link, the boot parse, a Back/Forward hop — so the URL is
        // kept true in exactly one place. (This replaces the old
        // `location.hash = ""` on leave: the href built here carries no hash,
        // so a legacy link is dropped by the same write.)
        syncAddressBar(state.session.sessionId);
        // FT-965: a town is a room, so leaving one empties the log this
        // browser is holding. Not a courtesy — rows are filtered on the way in
        // by town AND by viewer, and carrying a cursor from one town into
        // another would claim a completeness that was never fetched. The next
        // catch-up starts from zero in the town actually being entered.
        store.commit("chatReset");
        break;
      case "session/claimSeat":
        session.claimSeat(payload);
        break;
      case "session/distributeRoles":
        if (payload) {
          session.distributeRoles();
          // FT-965: THE DEAL IS THE START OF A GAME, and a game is what the
          // chat log filters by. The deal moment the id is derived from is
          // stamped by App.vue on this same mutation, from a subscriber
          // registered AFTER this one — so the id does not exist yet at this
          // instant and is read a tick later, when it does.
          //
          // A full resync rather than a new wire message: it is what
          // `endGame` / `clearEnded` below already do for the same reason,
          // and it carries the new id to everyone connected in one shot.
          setTimeout(() => {
            session.sendGamestate();
            // FT-1010: typed, so the chronicles surface can anchor a game
            // section on it. The gamestate sync one line up is what stamps
            // chat.gameId, so the row lands inside the game it begins.
            session.systemMessage("A game begins.", { t: "start" });
          }, 0);
        }
        break;
      // FT-965: SAY SOMETHING. The mutation is what travels, the same shape
      // every other broadcast in this table has — so any future surface that
      // wants to speak commits `chatSay` and inherits the delivery, the store
      // round trip and the error reporting for free.
      case "chatSay":
        session.sendChat(payload);
        break;
      // FT-1010: THE LIVE GAME CHANGED — a game ended (id → null), a new one
      // was dealt (null → id), or a reload learned which game is on. The set
      // of whispers this viewer may hold changes with it (a finished game's
      // whispers are public, a live game's are party-only — golem/chat's
      // canSee), and rows dropped at ingest under the old answer sit BELOW a
      // cursor that has moved past them. So the log is thrown away and
      // re-read under the boundary now in force — the same move the viewer-
      // identity watcher makes, for the same reason.
      case "chatSetGameId":
        if (state.chat.gameId !== lastLiveGameId) {
          lastLiveGameId = state.chat.gameId;
          store.commit("chatReset");
          store.dispatch("chatCatchUp");
        }
        break;
      // FT-1010: a CONCLUDED VOTE is a chronicle event, written by the host
      // into the town's own log. The mutation's guards decide whether a
      // record was actually pushed (its early returns leave the ledger
      // unchanged); this mirrors them, then reads the row it just wrote.
      // A spectator commits this same mutation on receipt and is refused
      // here AND by systemMessage — one writer, no duplicate rows.
      case "session/addHistory": {
        if (
          state.session.isSpectator ||
          !state.session.nomination ||
          state.session.lockedVote <= state.players.players.length
        ) {
          break;
        }
        const rec =
          state.session.voteHistory[state.session.voteHistory.length - 1];
        if (!rec) break;
        const carried = rec.majority > 0 && rec.votes.length >= rec.majority;
        session.systemMessage(
          `${rec.nominator} nominated ${rec.nominee} — ${rec.votes.length} of ` +
            `${rec.majority} needed${carried ? ", majority reached" : ""}.`,
          {
            t: "nomination",
            nominator: rec.nominator,
            nominee: rec.nominee,
            type: rec.type,
            votes: rec.votes.length,
            majority: rec.majority,
            carried,
          },
        );
        break;
      }
      case "session/nomination":
      case "session/setNomination":
        session.nomination(payload);
        break;
      case "session/setVoteInProgress":
        session.setVoteInProgress(payload);
        break;
      case "session/voteSync":
        session.vote(payload);
        break;
      case "session/lockVote":
        session.lockVote();
        break;
      case "session/setVotingSpeed":
        session.setVotingSpeed(payload);
        break;
      case "session/clearVoteHistory":
        session.clearVoteHistory();
        break;
      // FT-880: the summons rides a mutation like every other ST broadcast, so
      // any future surface that wants to call the town back commits this one
      // thing and inherits the guard.
      case "session/callBack":
        session.callBack();
        break;
      case "session/setVoteHistoryAllowed":
        session.setVoteHistoryAllowed();
        break;
      // FT-1003: the night sheet's Show-grimoire control. The mutation is the
      // host's ledger write; delivery to that one seat happens here, so any
      // later surface that grants a window commits the same thing and
      // inherits the routing.
      case "session/setGrimoireGrant":
        session.sendGrimoire(payload.playerId);
        break;
      case "toggleNight":
        session.setIsNight();
        // FT-1003: the night ending closes every UNPINNED grimoire window —
        // host only (a spectator's ledger is empty by construction, but the
        // guard keeps the rule visible). Each commit re-enters this
        // subscriber, whose case above sends that seat its revoke.
        if (!state.session.isSpectator && !state.grimoire.isNight) {
          const grants = state.session.grimoireGrants || {};
          Object.keys(grants).forEach((playerId) => {
            if (!grants[playerId].pinned) {
              store.commit("session/setGrimoireGrant", {
                playerId,
                granted: false,
              });
            }
          });
        }
        // FT-965: the phase turning is the town's own news, so it goes in the
        // town's own log beside what people said about it. Storyteller-only
        // (systemMessage refuses otherwise), which matches the relay's refusal
        // of a system line from anyone but the host — so a player applying
        // this same mutation on receipt does not echo it back.
        session.systemMessage(
          state.grimoire.isNight
            ? `Night ${state.night.day} falls.`
            : `Day ${state.night.day} breaks.`,
          // FT-1010: typed — the phase turning is a chapter mark in the
          // chronicles stream, not just a sentence.
          { t: "phase", night: state.grimoire.isNight, day: state.night.day },
        );
        break;
      // FT-931: THE TOWN ENDS / PLAY AGAIN. Both mutations live at the root
      // (store/index.js — endGame also forces grimoire.isPublic, a
      // different module's state) and both fire the SAME response: one full
      // gamestate resync. That single call carries the ended flag + result
      // AND (via sendGamestate's own change, above) every seat's TRUE role,
      // so the reveal and the "game over" state reach every connected
      // client together — the same full sync a joining spectator already
      // gets in one shot, reused rather than inventing a second wire
      // message for this. Guarded internally (sendGamestate is a no-op for
      // a spectator's own client), so this is safe to list unconditionally
      // even though a spectator applies these same mutation types too when
      // the broadcast arrives.
      case "endGame":
      case "clearEnded":
        session.sendGamestate();
        break;
      // FT-882: the night sheet's day scrub. It rides a mutation like every
      // other ST broadcast in this table, so any later surface that wants to
      // correct the counter commits the same thing and inherits the guard.
      // FT-1005: re-keying the night also re-scopes which rows are "tonight",
      // so every seat's own rows go out again beside the counter.
      case "night/setDay":
        session.setNightDay();
        session.sendNightRows();
        break;
      // FT-1005: THE LOG CHANGED — each affected seat's own rows follow it.
      // A new or patched entry names its player, so only that one seat is
      // written to; the shapes that cannot (a removal, a restored log, the
      // sharing mode flipping) go to every claimed seat — each still receives
      // only their OWN rows, that is sendNightRows' own structure. All four
      // are host-only inside sendNightRows; a spectator committing these
      // (they never do today) would send nothing.
      case "night/addEntry":
        session.sendNightRows((payload && payload.playerId) || "");
        break;
      case "night/patchEntry": {
        const entry = state.night.entries.find(
          (e) => e.id === (payload && payload.id),
        );
        session.sendNightRows((entry && entry.playerId) || "");
        break;
      }
      case "night/removeEntry":
      case "night/setLog":
      case "night/setMode":
        session.sendNightRows();
        break;
      // FT-1005: the player's own night input going up — the callBack idiom:
      // the commit is the event, this is the one place it goes out (direct to
      // the host; sendNightAction stamps the sender's own playerId).
      case "night/playerAction":
        session.sendNightAction(payload);
        break;
      case "setEdition":
        session.sendEdition();
        break;
      case "players/setFabled":
        session.sendFabled();
        break;
      // 2026-08-19: the storyteller changed one of the three. It rides a
      // mutation like every other broadcast in this table, so any later
      // surface that sets a bluff (the grimoire drawer's own section, the
      // clock face's coins) inherits the delivery for free.
      case "players/setBluff":
        session.sendBluffs();
        break;
      case "session/setMarkedPlayer": {
        session.setMarked(payload);
        // FT-1010: MARKED FOR EXECUTION — the closest thing to an execution
        // the app actually records. "Marked", never "executed": the
        // storyteller decides what a mark means, and the log must not invent
        // an outcome (golem/chronicle.js's own honesty rule). -1 is the mark
        // being cleared, which is housekeeping, not news.
        if (typeof payload === "number" && payload >= 0) {
          const marked = state.players.players[payload];
          const name = (marked && marked.name) || `Seat ${payload + 1}`;
          session.systemMessage(`${name} is marked for execution.`, {
            t: "execution",
            name,
            seat: payload,
          });
        }
        break;
      }
      case "players/swap":
        session.swapPlayer(payload);
        break;
      case "players/move":
        session.movePlayer(payload);
        break;
      case "players/remove":
        session.removePlayer(payload);
        break;
      case "players/set":
      case "players/clear":
      case "players/add":
        session.sendGamestate("", true);
        break;
      case "players/update":
        if (payload.property === "pronouns") {
          session.sendPlayerPronouns(payload);
        } else if (payload.property === "name") {
          // Golem fork: names travel their own channel so a SPECTATOR can
          // name their claimed seat (sendPlayer is host-only and drops it).
          session.sendPlayerName(payload);
        } else {
          session.sendPlayer(payload);
        }
        // FT-1010: A SHROUD PLACED OR LIFTED is the town's own news. Only
        // the shroud — the app records THAT a seat died, never why (night
        // kill, execution, storyteller's ruling), and the row says no more
        // than the record supports. Host-only twice over: `isDead` only ever
        // originates on the storyteller's client, and systemMessage refuses
        // a spectator anyway.
        if (payload.property === "isDead") {
          const seat = state.players.players.indexOf(payload.player);
          const name =
            (payload.player && payload.player.name) ||
            (seat >= 0 ? `Seat ${seat + 1}` : "A player");
          session.systemMessage(
            payload.value ? `${name} dies.` : `${name} returns to life.`,
            {
              t: payload.value ? "death" : "revive",
              name,
              seat: seat >= 0 ? seat : null,
            },
          );
        }
        break;
    }
  });

  // check for a session id in the hash (legacy links) or a clean invite
  // path (/<town>, current links) — hash wins if somehow both are present.
  const hashSessionId = window.location.hash.substr(1);
  const sessionId = normalizeTownId(
    hashSessionId || sessionIdFromPath(window.location.pathname),
  );
  if (sessionId) {
    // FT-889: role comes from what THIS browser holds (edit key / hosting
    // shelf entry), not from the link — a host who reloads their own town
    // stays host, and the same link handed to someone else joins them as a
    // player. "replace" mode canonicalises the address bar without pushing a
    // history entry of its own: a legacy `/#town` is rewritten to `/town`,
    // and a `/town` path is already true so nothing is written at all.
    enterOrWait(store, sessionId, "replace");
  }

  // FT-889: Back leaves the town, Forward re-enters it. The browser has
  // already moved the address bar by the time this fires, so every commit
  // made here runs "silent" — the subscriber above must not write history
  // back over the entry the user just travelled to (which would also make
  // this listener fight itself on the next hop). No confirm(): a Back press
  // IS the intent, and a dialog here is auto-dismissed in driven contexts.
  window.addEventListener("popstate", () => {
    // Re-entrancy guard: a hop already being applied owns the address bar
    // until its commits finish. (pushState/replaceState never raise popstate
    // themselves, so this is a belt on top of braces — but it is the one
    // place where the listener and the subscriber could otherwise interleave.)
    if (isReplayingHistory()) return;
    const pathId = normalizeTownId(sessionIdFromPath(window.location.pathname));
    const live = store.state.session.sessionId;
    if (pathId === live) return;
    // 2026-08-19: arriving at a town is gated on it being open, wherever the
    // arrival came from — a Forward press is an entry like any other. The
    // "silent" wrapper moved INSIDE the two branches because the gate is
    // asynchronous: wrapping the await would restore the history mode before
    // the commits ran, and the entry would push a history entry over the one
    // the browser had just travelled to.
    if (pathId) {
      enterOrWait(store, pathId, "silent");
    } else if (live) {
      withHistory("silent", () => leaveTown(store));
    }
  });
};
