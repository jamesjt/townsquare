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
import {
  chatErrorText,
  gameIdFor,
  viewerOf,
  STORYTELLER_KEY,
} from "../golem/chat";
// FT-1206: the whisper's public trace (the paper plane, metadata only) and
// the received-whisper toast — event names, wire validator, timing.
import {
  WHISPER_MARK_EVENT,
  WHISPER_TOAST_EVENT,
  cleanMark,
} from "../golem/whisperMarks";
// FT-1105: the DURABLE deal marker — see `_isDealt` below. The stash is the
// host's own record of when this town was dealt (golem/stats.js), and it is
// already the thing App.vue trusts for "a game is underway here".
import { dealTimeFor } from "../golem/stats";
// FT-1020: the storyteller's tower (hour display, hand motion, day-start
// bell) rides the full gamestate sync. FT-1045 adds one live frame on top:
// a tower CHANGE now broadcasts as it happens (see TOWER_EVENT below) —
// before that, a bell picked mid-session reached only future joiners, and
// the custom bell's URL has to reach the town before the day it rings for.
import {
  TOWER_EVENT,
  towerSyncPayload,
  applyTowerSync,
  // FT-1206: sendChat reads the town's whisper-mark setting at send (Off
  // keeps the wire quiet) and the mark handler reads it again on receive.
  towerState,
} from "../golem/towerBells";
// FT-1010: the event envelope — a game event riding a system row's body.
import {
  encodeEvent,
  beginTownSession,
  touchTownSession,
  stashOpeningBoard,
  boardRingOf,
} from "../golem/chronicles";
// FT-1005: a player wakes to their own night action. The projection is the
// privacy rule made code — a player-bound night row NEVER carries the lie
// mark, the done tick, or the true/shown pair (see golem/nightLog).
import { projectEntriesFor } from "../golem/nightLog";
// FT-1314: THE AUTOMATIONS ENGINE. Every hook below is a no-op on a
// spectator, on an unarmed rule, or when its condition is not met — the
// module's own header holds the whole design. This subscriber is where the
// hooks live because it is the one place that already sees every game event
// on the host's client.
import {
  automationFlags,
  onVoteConcluded,
  onDayEnds,
  prefillUndertaker,
  onDeath,
  onNightEntry,
  onStarpassPick,
  retireStarpassOffer,
} from "../golem/automations";

/**
 * FT-1295: ONE REMINDER TOKEN, CUT DOWN TO WHAT A GRIMOIRE WINDOW SHOWS.
 *
 * A token on the storyteller's board is `{ role, image, imageAlt, name }` —
 * ReminderModal's `mapReminder` and golem/dealReminders' `dealtToken` build the
 * same four, deliberately, so a hand-placed token and a dealt one render alike.
 * All four travel: the receiver paints a token from `image`/`imageAlt`/`role`
 * (Player.vue's `reminderIcon`), so sending a name to look up would leave it
 * with a broken require for every token whose role it cannot resolve — a
 * bluff's character, a custom role out of its edition.
 *
 * THE DEAL'S MARK IS THE ONE FIELD LEFT BEHIND. `dealReminders` stamps
 * `dealt: true` on a token the DEAL placed, so a re-deal knows which of them to
 * draw again and which are the storyteller's own notes. That is host
 * bookkeeping — and worse, on a Spy's board it would be a genuine tell: it
 * separates "the rules put this here at deal time" from "the storyteller
 * decided this mid-game", which is a distinction the grimoire itself does not
 * show anyone. So the mark stops here.
 *
 * Rebuilt field by field rather than spread-and-delete: whatever a future
 * token grows, it does not reach a player until someone adds it to this list
 * on purpose.
 */
const _reminderForWire = (reminder) => ({
  role: (reminder && reminder.role) || "",
  image: (reminder && reminder.image) || "",
  imageAlt: (reminder && reminder.imageAlt) || "",
  name: (reminder && reminder.name) || "",
});

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
    // FT-1344: HOST side — what each connected client said its name was
    // (the third element of its ping; "" until it says). Only ever read for
    // the watcher list: a SEATED player's name lives on the seat itself.
    this._watcherNames = {};
    // FT-1289: armed by a spectator's _onOpen, spent by the first roster that
    // arrives after it — the one-shot permission to take a chair back. See
    // _updateGamestate.
    this._reclaimOnSync = false;
    // FT-1312: the seat the HOST'S SWEEP took from this client while it was
    // away (a direct "swept" frame said so — see _handleSwept). -1 means
    // none. Spent by the wake handler below: the re-claim waits for the
    // player to actually come back to the tab, so a pocketed phone never
    // sits itself back down in a loop against the sweep.
    this._sweptSeat = -1;
    // FT-1312: HOST side — who the sweep unseated, playerId → seat index.
    // A frozen tab (locked phone) DROPS frames delivered while it sleeps,
    // so the "swept" notice sent at sweep time can vanish; the one thing a
    // waking client provably sends is its resumed ping, so the ping is what
    // re-offers the notice (see _handlePing). Cleared when the player
    // claims a chair again, leaves, or the offer stops being true.
    this._swept = {};
    // FT-1312: when this client last put a ping on the wire — the guard that
    // keeps the answer-the-host's-ping path (see the "ping" case) from ever
    // doubling traffic.
    this._lastPingSent = 0;
    // FT-1312: A PHONE WAKING UP IS AN EVENT, NOT A TIMER. Background tabs
    // throttle setTimeout (Chrome pins chained timers to ~1/minute after
    // five minutes; a locked iPhone suspends JS outright), so both the 30s
    // ping loop and the 3s reconnect timer sleep exactly when a player's
    // seat is most at risk. The moment the tab is visible again — or the
    // network returns — presence is re-asserted NOW instead of whenever the
    // throttled timer next fires.
    this._onWake = this._onWake.bind(this);
    window.addEventListener("visibilitychange", this._onWake);
    window.addEventListener("pageshow", this._onWake);
    window.addEventListener("online", this._onWake);
    // reconnect to previous session
    if (this._store.state.session.sessionId) {
      this.connect(this._store.state.session.sessionId);
    }
  }

  /**
   * FT-1312: the tab came back (visibility/pageshow/online). Three cases:
   * socket open → ping immediately (refresh this player's presence on the
   * host before its sweep can judge the silence) and take back a seat the
   * sweep freed while we were away; socket gone with a reconnect pending →
   * the 3s timer was throttled along with everything else, so reconnect NOW
   * (the FT-1289 reclaim-on-open path then reseats us); anything else →
   * leave the ordinary machinery alone.
   * @private
   */
  _onWake() {
    if (document.visibilityState === "hidden") return;
    if (!this._store.state.session.sessionId) return;
    if (this._socket && this._socket.readyState === 1) {
      this._ping();
      if (this._isSpectator && this._sweptSeat >= 0) {
        this._reclaimSeat(this._sweptSeat);
      }
    } else if (!this._socket && this._store.state.session.isReconnecting) {
      clearTimeout(this._reconnectTimer);
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
      // FT-1289: A RETURN IS THE ONLY MOMENT A CHAIR MAY BE TAKEN BACK. The
      // roster this asks for is the one allowed to put this client back in
      // the seat it holds — and no later one, which is what keeps the
      // re-claim from ever fighting the storyteller (see _updateGamestate).
      this._reclaimOnSync = true;
      this._sendDirect(
        "host",
        "getGamestate",
        this._store.state.session.playerId,
      );
    } else {
      // FT-1089: THE TOWN STAYS SEATED THROUGH THE HOST'S OWN RELOAD.
      //
      // `_players` is this socket's live-connection roster, and it is built
      // in the constructor — so it is EMPTY on every fresh page load. The
      // sweep in `_handlePing` vacates any claimed seat whose player is not
      // in it, and the host's own first ping (one line below) runs that
      // sweep before a single player has had the chance to ping the new
      // socket. Every chair the town had claimed was therefore emptied by
      // the reload itself: seats read "Open", `canStart` went false, and
      // pressing Start did nothing at all — no deal, and so no bluffs and no
      // beliefs, which is what FT-1084 looked like failing to do.
      //
      // Seeding the roster from the seats the store has already restored
      // hands the decision back to the timeout that was always meant to make
      // it: a player who is really gone stops pinging and is dropped by that
      // same sweep two intervals later, and a player who is still here
      // refreshes their entry long before then. No new rule about who counts
      // as connected — the existing one simply stops being asked before
      // anybody could answer it.
      const now = new Date().getTime();
      this._store.state.players.players.forEach(({ id }) => {
        if (id && !this._players[id]) this._players[id] = now;
      });
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
    this._lastPingSent = new Date().getTime();
    // FT-1344: a spectator's ping carries the name this browser goes by (the
    // same remembered name a claim rides, golem.playerName) so the host's
    // watcher list can say WHO is watching. The relay routes a player's ping
    // to the HOST ALONE (server/index.js's ping branch), so the name reaches
    // no other client. Capped defensively — this string rides every 30s.
    let pingName = "";
    if (this._isSpectator) {
      try {
        pingName = (localStorage.getItem("golem.playerName") || "")
          .trim()
          .substr(0, 40);
      } catch (e) {
        // storage refused — the watcher lists as anonymous, nothing breaks
      }
    }
    this._send("ping", [
      this._isSpectator
        ? this._store.state.session.playerId
        : Object.keys(this._players).length,
      "latency",
      ...(this._isSpectator ? [pingName] : []),
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
      case "accountId":
        // FT-1200: a claimant's account offer, arriving on the direct lane
        // (see claimSeat). Host-only — a player's client has no ledger to
        // write, and nothing ever sends this frame TO a player anyway.
        // `params` is [playerId, accountId|null]; the mutation validates
        // shapes and treats null as a retraction.
        if (this._isSpectator) return;
        if (!Array.isArray(params)) return;
        this._store.commit("session/setSeatAccount", params);
        break;
      case "ping":
        this._handlePing(params);
        // FT-1312: ANSWER THE HOST'S PING, don't wait for our own timer.
        // Message events still fire in a backgrounded tab whose TIMERS are
        // throttled — which was exactly the tab the old timer-only cadence
        // starved: its pings stretched past the host's sweep grace and the
        // sweep freed a chair whose player was still connected. Replying to
        // the host's own 30s ping makes presence request-response — a
        // socket that can hear the host can always prove it is alive. The
        // 5s guard keeps a ping burst from ever doubling into one, and
        // _ping() reschedules the fallback timer, so total traffic stays
        // one ping per player per interval.
        if (
          this._isSpectator &&
          new Date().getTime() - this._lastPingSent > 5000
        ) {
          this._ping();
        }
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
      // FT-1314: the tie-cross moving — markedPlayer's own sibling frame,
      // same one-value ST-broadcast shape. The mutation validates; a
      // malformed payload can only ever clear the pair.
      case "markedTie":
        if (!this._isSpectator) return;
        this._store.commit("session/setMarkedTie", params);
        break;
      // FT-1314: the starpass chooser landing on the dying Imp's client —
      // always a direct frame from the host to that one seat (the grimoire
      // frame's shape). A null payload stands the chooser down.
      case "starpass":
        if (!this._isSpectator) return;
        this._store.commit("session/setStarpassOffer", params || null);
        break;
      // FT-1314: ...and the Imp's answer arriving at the host on the direct
      // lane (the nightAction shape — the payload carries the sender's own
      // playerId; the engine honours only the client the chooser went to).
      case "starpassPick":
        if (this._isSpectator) return;
        onStarpassPick({ store: this._store, live: this }, params);
        break;
      case "isNight":
        if (!this._isSpectator) return;
        this._store.commit("toggleNight", params);
        break;
      // FT-1045: the storyteller changed the tower (a bell picked, a custom
      // sound linked) — applied live, same sanitizing gate the full sync's
      // copy goes through. Before this frame, a mid-session tower change
      // reached only clients that joined or reconnected after it.
      case "tower":
        if (!this._isSpectator) return;
        applyTowerSync(params);
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
      // FT-1312: the host's sweep freed THIS client's chair — the one unseat
      // that is nobody's decision, so the one unseat the client may undo on
      // its own. Always a direct frame from the host to the swept player.
      case "swept":
        this._handleSwept(params);
        break;
      // FT-1344: the storyteller showed this watcher out — always a direct
      // frame to the one client it means. See _handleKicked.
      case "kicked":
        this._handleKicked(params);
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
        // FT-1206: a LIVE whisper addressed to this viewer raises the toast.
        // Here rather than in the mutation because catch-up lands through the
        // same commit — a reload must not replay a night's worth of toasts.
        this._notifyWhisper(params);
        break;
      // FT-1206: A PLANE FLEW — one player whispered another, somewhere in
      // this town. Metadata only ({from, to} seats); the whisper itself
      // travelled the private three-socket lane and never comes through here.
      // The relay broadcasts this frame on its default branch, untouched.
      case "whisperMark":
        this._handleWhisperMark(params);
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
        // FT-1314: the tie-cross rides beside the mark it stands in for.
        markedTie: session.markedTie,
        fabled: fabled.map((f) => (f.isCustom ? f : { id: f.id })),
        // FT-931: the ended flag + the result. A joining or reconnecting
        // client learns the town is over from this same full sync — the
        // reveal's role data travels in `gamestate` above, so the two
        // arrive together, exactly as they do for a client already
        // connected when the game ends (see the "endGame"/"clearEnded"
        // cases in the mutation subscriber below).
        isEnded: session.isEnded,
        winningTeam: session.winningTeam,
        // FT-1020: the town's tower — five fields, host-authoritative, so a
        // joiner's dial and bell match the storyteller's from the first sync.
        tower: towerSyncPayload(),
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
      // FT-1343: ...and the spectator feed's standing truth — a seatless
      // watcher arriving (or everyone, on the deal's own broadcast sync)
      // gets the grimoire when the town allows it, the self-healing revoke
      // when it does not. Sent AFTER the grant sync so a watcher's frame is
      // the one that stands. Seated ids are filtered inside; watchers only.
      this.sendSpectatorGrimoire(playerId);
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
      // FT-1314: the tie-cross (absent from an older host reads as null —
      // the mutation coerces).
      markedTie,
      fabled,
      // FT-931: the ended flag + result — see the matching fields sendGamestate
      // now sends, above.
      isEnded,
      winningTeam,
      // FT-965: which game the chat log's "this game" filter means.
      gameId,
      // FT-1020: the host's tower choices (absent from an older host, and
      // applyTowerSync sanitizes every field it does find).
      tower,
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
      // FT-1020: the tower, guarded — an older host sending none leaves this
      // client's defaults standing rather than zeroing them.
      if (tower) applyTowerSync(tower);
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
      // guard). `clearEnded` is a real reset — it clears the town's result
      // AND every grimoire grant standing on this client — so committing it
      // on every sync that simply has no opinion (isEnded undefined/false
      // because the game never ended) would stomp that state on every
      // reconnect. This only fires on a genuine transition either way.
      // (FT-1294: the flag this guard used to protect first was the
      // face-down grimoire, which is retired; the guard still earns its keep
      // for the grants.)
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
      // FT-1314: AFTER setMarkedPlayer, never before — a real mark's commit
      // clears any standing tie, so the pair must land second to survive.
      this._store.commit("session/setMarkedTie", markedTie || null);
      this._store.commit("players/setFabled", {
        fabled: fabled.map((f) => this._store.state.fabled.get(f.id) || f),
      });
    }
    // FT-1200: RE-OFFER THE ACCOUNT to a host that may be new. The host's
    // seat-account ledger (session.seatAccounts) is in-memory only, so a
    // storyteller's reload starts it empty — and a reload is exactly when
    // every seated player is sent a fresh gamestate. If this client is
    // signed in and holds a chair in the roster that just arrived, tell the
    // host again. Direct to the host, never broadcast, and idempotent (the
    // ledger write is a plain map set), so the occasional resync-triggered
    // repeat costs one tiny frame.
    const me = this._store.state.session.playerId;
    const account = this._store.state.session.account;
    if (account && me && gamestate.some((seat) => seat.id === me)) {
      this._sendDirect("host", "accountId", [me, account.id]);
    }
    // FT-1289: TAKE THE CHAIR BACK.
    //
    // The host's own ping sweep empties any claimed seat whose player has
    // stopped pinging (`_handlePing`, above). That is right, and it is the
    // only way a chair is ever freed for somebody else. What was missing is
    // the other half: when that player's socket comes back, NOTHING
    // re-asserted the seat. The client went on believing it held chair N
    // (`session.claimedSeat` is not touched by a dropped socket), the host's
    // roster had chair N standing open under the same NAME, and the deal —
    // addressed per seat id, see `distributeRoles` — simply had no address
    // for them. A blank coin on a chair with your own name on it.
    //
    // PLAY AGAIN is where this bites, which is why it was reported as a Play
    // again bug: the stretch between one game ending and the next being dealt
    // is the one time nobody is watching the town square. Phones lock, laptops
    // sleep, tabs are backgrounded — and two ping intervals later the host has
    // quietly emptied half the ring. Mid-game the same drop is harmless,
    // because the player is looking at the screen and re-claims by hand.
    //
    // ONCE, ON THE RETURN ITSELF — never on any later sync. `_reclaimOnSync`
    // is armed by `_onOpen` and spent here, so the only roster that can seat
    // this client is the first one after a socket opens. That is what keeps
    // this from FIGHTING THE STORYTELLER: emptying a chair is one of their
    // tools (Player.vue's Empty seat), it reaches players as the same
    // "id: ''" this would otherwise read as a sweep, and a condition that
    // re-fired on every sync put the player straight back in the chair the
    // storyteller had just cleared. Measured, not reasoned about — that is
    // exactly what the first version of this fix did.
    //
    // THE REST OF THE CONDITION IS DELIBERATELY NARROW TOO. Only a client
    // that believes it holds a chair, holds NO chair in the roster that just
    // arrived, and finds that chair still EMPTY says anything. So a player
    // who stood up (Leave commits claimedSeat -1), a player the storyteller
    // moved to a different chair, and a chair somebody else has taken in the
    // meantime are all silent.
    //
    // It reuses `claimSeat` rather than putting a frame of its own on the
    // wire. That method already carries the same "seat must be free" test and
    // the remembered name, so the re-claim is exactly the claim the player
    // would have made by hand — nothing new crosses the wire, and nothing
    // about who may hold a chair changes. The host's side of an id landing on
    // a chair already hands that chair its character (`sendPlayer`'s
    // `_sendBelief` on a claimed id, FT-1105), so a return that lands AFTER
    // the deal is dealt in by that existing path rather than a second one.
    if (this._reclaimOnSync) {
      this._reclaimOnSync = false;
      const mySeat = this._store.state.session.claimedSeat;
      if (
        me &&
        mySeat >= 0 &&
        gamestate[mySeat] &&
        !gamestate[mySeat].id &&
        !gamestate.some((seat) => seat.id === me)
      ) {
        // FT-1312: breadcrumb — this is the reconnect path taking the chair
        // back (FT-1289), as opposed to the swept-while-connected path
        // (_handleSwept) or a claim by hand.
        console.info(`[seat] re-claiming seat ${mySeat + 1} on reconnect`);
        this.claimSeat(mySeat);
      }
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
    if (this._isSpectator) return;
    // FT-1295: THE REMINDERS STILL DO NOT BROADCAST — and this early return,
    // the oldest guard in the file, is why. It used to be the whole story:
    // `if (this._isSpectator || property === "reminders") return;`, a token
    // dropped on the floor before anything else looked at it, so a reminder
    // was grimoire furniture on the host's screen and nowhere else.
    //
    // It stays a refusal to broadcast. What changed is that there is now
    // exactly ONE path a token may travel — a granted grimoire window, direct
    // to the one seat the storyteller opened it for (see sendGrimoire) — so a
    // token moved or removed mid-grant refreshes that window instead of
    // vanishing here. Nothing is added to the frame the town gets, because
    // this branch still never reaches the broadcast below.
    if (property === "reminders") {
      this._refreshGrimoire();
      return;
    }
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
      // FT-1105: A CHAIR THAT JUST CHANGED HANDS NEEDS ITS CHARACTER FIRST.
      // The bluffs line below has been here since 2026-08-19 and was right as
      // far as it went — but the cluster it feeds is anchored to the seat
      // whose CHARACTER is a demon (golem/bluffs.js's demonSeatIndex), and
      // nothing sent that character to a player who claimed their chair after
      // the deal. They held three bluffs and an empty seat, so the anchor
      // found no demon and both the cluster and its mask stayed out of the
      // DOM — the user's report. `_sendBelief` is the existing per-seat
      // primitive for exactly this (a character reaching one chair, privately,
      // as the belief the seat is meant to hold), and it carries that seat's
      // bluffs with it, so the line below is now a harmless repeat of a frame
      // it already sent rather than the only delivery.
      if (property === "id" && value) this._sendBelief(player, index);
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
    // FT-1312: breadcrumb — OUR OWN chair just emptied on a frame from the
    // host. Which path did it (sweep vs storyteller) is said by whether a
    // direct "swept" frame follows; this line is the constant.
    if (
      property === "id" &&
      !value &&
      index === this._store.state.session.claimedSeat &&
      player.id === this._store.state.session.playerId
    ) {
      console.warn(
        `[seat] the host emptied your chair (seat ${index + 1}) — ` +
          `sweep or storyteller`,
      );
    }
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
  _handlePing([playerIdOrCount = 0, latency, name] = []) {
    const now = new Date().getTime();
    if (!this._isSpectator) {
      // FT-1312: REGISTER THE ARRIVING PING BEFORE JUDGING ANYONE. The old
      // order was sweep-then-register, so a ping arriving just past the
      // grace unseated its own sender — the frame that proved a player was
      // alive was the very thing that swept them. Chrome's background
      // throttling pins a hidden tab's pings to ~one a minute, which sat
      // exactly on the old 60s boundary: tonight's players lost their seats
      // to their own late pings, repeatedly.
      if (playerIdOrCount && typeof playerIdOrCount === "string") {
        this._players[playerIdOrCount] = now;
        // FT-1344: the name the pinging client goes by, for the watcher
        // list. Only a real string writes; an old client's two-element ping
        // leaves whatever was known standing.
        if (typeof name === "string") {
          this._watcherNames[playerIdOrCount] = name.trim().substr(0, 40);
        }
        // FT-1312: A SWEPT PLAYER'S PING IS THEIR RETURN. The "swept"
        // notice sent at sweep time is lost on a frozen tab (frames
        // delivered to a sleeping page are dropped), so it is re-offered
        // on the first ping that proves the player is back — and on every
        // one after, until the offer resolves or stops being true. One
        // tiny direct frame per ping, at most.
        if (this._swept[playerIdOrCount] !== undefined) {
          const seat = this._swept[playerIdOrCount];
          const players = this._store.state.players.players;
          const stillOpen =
            players[seat] &&
            !players[seat].id &&
            !players.some((p) => p.id === playerIdOrCount);
          if (stillOpen) {
            this._sendDirect(playerIdOrCount, "swept", seat);
          } else {
            // the chair was taken, or they sat somewhere else — the offer
            // is dead, and keeping it could only fight the living roster
            delete this._swept[playerIdOrCount];
          }
        }
      }
      // FT-1312: the sweep grace is THREE intervals (90s), not two. Two was
      // exactly the worst-case spacing of a throttled-but-connected phone's
      // pings; the margin now covers real phones, while a genuinely gone
      // player (dead socket — the relay terminates those in ≤60s, and a
      // dead socket sends nothing) still frees their chair ≤2 minutes after
      // they vanish. That is the sweep's actual job, kept.
      for (let player in this._players) {
        if (now - this._players[player] > this._pingInterval * 3) {
          delete this._players[player];
          delete this._pings[player];
          // FT-1344: a gone connection leaves the watcher ledger too.
          delete this._watcherNames[player];
        }
      }
      // remove claimed seats from players that are no longer connected
      this._store.state.players.players.forEach((player, index) => {
        if (player.id && !this._players[player.id]) {
          // FT-1312: EVERY SWEEP LEAVES A TRAIL. The console line is the
          // host-side forensic (which path freed the chair); the direct
          // "swept" frame tells the player's own client — if its socket
          // still lives — that THE SWEEP did this, not the storyteller, so
          // it may take the chair back on its own (see _handleSwept). The
          // storyteller's Empty-seat never sends this frame, which is what
          // keeps the recovery from ever fighting their decision. Sent
          // AFTER the commit so the freed-seat broadcast lands first and
          // the returning claim sees the chair open. The id is captured
          // BEFORE the commit clears it — a "" address would broadcast.
          const sweptId = player.id;
          this._swept[sweptId] = index;
          console.warn(
            `[seat] sweep freed seat ${index + 1} (${player.name}) — ` +
              `no ping for ${(this._pingInterval * 3) / 1000}s`,
          );
          this._store.commit("players/update", {
            player,
            property: "id",
            value: "",
          });
          this._sendDirect(sweptId, "swept", index);
          // FT-1312: ...and the town's own log gets the plain sentence, so
          // a game where chairs empty can be read back afterwards. Untyped
          // on purpose — an unknown event type would render as raw
          // envelope; a plain announcement renders everywhere.
          this.systemMessage(
            `${player.name || `Seat ${index + 1}`}'s chair was freed — ` +
              `connection lost.`,
          );
        }
      });
      // store new player data
      if (playerIdOrCount) {
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
      // FT-1344: every host-side ping pass re-derives the watcher list —
      // registrations, the timeout sweep and the seat sweep above are the
      // three things that change who counts as "watching". Cheap (a filter
      // over a handful of ids) and committed only on an actual change.
      this._syncSpectators();
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
   * FT-1312: THE SWEEP TOOK YOUR CHAIR — the host said so, by name, on the
   * direct lane. Player only.
   *
   * This frame exists because a swept client whose SOCKET never dropped has
   * no other way to know: FT-1289's reclaim only arms on a socket reopening,
   * and the freed-seat broadcast is byte-identical to the storyteller's own
   * Empty-seat. The sweep is the one sender of this frame, so acting on it
   * can never fight a storyteller's decision.
   *
   * Visible tab → take the chair back immediately (the player is looking at
   * the screen; the silence was a hiccup, not an absence). Hidden tab → note
   * the seat and let the wake handler re-claim when the player actually
   * returns — re-claiming from a pocketed phone would just be swept again,
   * a slow flicker war with the host.
   * @private
   */
  _handleSwept(index) {
    if (!this._isSpectator) return;
    if (typeof index !== "number" || index < 0) return;
    if (this._store.state.session.claimedSeat !== index) return;
    console.warn(
      `[seat] the host's sweep freed your chair (seat ${index + 1}) — ` +
        `no pings reached it`,
    );
    if (document.visibilityState !== "hidden") {
      this._reclaimSeat(index);
    } else {
      this._sweptSeat = index;
    }
  }

  /**
   * FT-1312: take back a chair the sweep freed — the same narrow conditions
   * FT-1289's reclaim-on-open uses: we still believe we hold that seat, the
   * seat is still empty, and no other chair holds us. Anything else stays
   * silent (someone took it, the storyteller moved us, we stood up).
   * @private
   */
  _reclaimSeat(index) {
    this._sweptSeat = -1;
    const players = this._store.state.players.players;
    const me = this._store.state.session.playerId;
    if (this._store.state.session.claimedSeat !== index) return;
    if (!me || !players[index]) return;
    // FT-1312: a frozen tab drops the freed-seat broadcast along with
    // everything else, so this client's OWN roster may still show it in the
    // chair the host has already emptied. The "swept" frame is the host's
    // word; bring the local seat to the host's truth first, or claimSeat's
    // own is-it-free check would refuse the very recovery it exists for.
    if (players[index].id === me) {
      this._store.commit("players/update", {
        player: players[index],
        property: "id",
        value: "",
      });
    }
    if (players[index].id) return;
    if (players.some((p) => p.id === me)) return;
    console.info(`[seat] re-claiming seat ${index + 1} after the sweep`);
    this.claimSeat(index);
  }

  /**
   * Handle a player leaving the sessions. ST only
   * @param playerId
   * @private
   */
  _handleBye(playerId) {
    if (this._isSpectator) return;
    delete this._players[playerId];
    // FT-1312: leaving the town retires any standing swept-seat offer.
    delete this._swept[playerId];
    // FT-1344: ...and the watcher ledger's entry, and the list with it.
    delete this._watcherNames[playerId];
    this._store.commit(
      "session/setPlayerCount",
      Object.keys(this._players).length,
    );
    this._syncSpectators();
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
      // FT-1035: the remembered name rides along with the claim itself —
      // every claim entry point (the one-tap overlay, the seat menu's
      // "Claim seat" row) goes through this one method, so this is the one
      // place that has to know it, rather than each UI surface re-deriving
      // it (and, before this fix, only one of them bothering to).
      const name = (localStorage.getItem("golem.playerName") || "").trim();
      this._send("claim", [seat, this._store.state.session.playerId, name]);
      // FT-1200: THE ACCOUNT RIDES BESIDE THE CLAIM, NOT INSIDE IT. The claim
      // frame above is a broadcast — every client in the town sees it — and
      // the account id is the host's business only (it exists so the finished
      // game records to the right person). The relay already carries a
      // private lane ("direct", routed by playerId and never echoed to
      // anyone else — see server/index.js's direct branch and the existing
      // `_sendDirect("host", …)` bye/nightAction frames), so the id takes
      // that lane. Sent on vacate too (seat < 0, id null) so standing up
      // retracts the offer; a guest's claim sends null, which writes nothing.
      const account = this._store.state.session.account;
      this._sendDirect("host", "accountId", [
        this._store.state.session.playerId,
        seat >= 0 && account ? account.id : null,
      ]);
    }
  }

  /**
   * Update a player id associated with that seat.
   * @param index seat index or -1
   * @param value playerId to add / remove
   * @param name FT-1035: the claimant's remembered name, applied to the seat
   *  being claimed only — an unclaimed seat (host-typed or a placeholder)
   *  never has its label touched, and neither does any OTHER seat.
   * @private
   */
  _updateSeat([index, value, name]) {
    if (this._isSpectator) return;
    // FT-1312: a claim of ANY chair (or a deliberate stand-up) settles the
    // swept-seat offer — the player has spoken for themselves now.
    delete this._swept[value];
    const property = "id";
    const players = this._store.state.players.players;
    // remove previous seat
    const oldIndex = players.findIndex(({ id }) => id === value);
    // FT-1112: ONCE THE TOWN IS DEALT, A PLAYER STAYS IN THEIR CHAIR.
    //
    // A seat move is a claim like any other, and the two lines below are what
    // makes it one: the claimant's OLD chair is emptied and they are written
    // into the new one. Mid-game that quietly re-deals the town — the
    // characters do not follow (they are per-seat, socket.js's `_sendBelief`),
    // so whoever holds each chair afterwards is holding somebody else's
    // character. A tester clicking a neighbouring coin out of curiosity is the
    // whole reported bug, and it costs the storyteller the game.
    //
    // REFUSED HERE, AT THE HOST, because the host is the only party that can
    // actually refuse: a player's own client can be told not to offer the
    // button (Player.vue's `canOneTapClaim` reads the same boundary off
    // `chat.gameId`, the town's game marker the host itself syncs), but a
    // claim frame put on the wire by hand would otherwise still be honoured.
    // A UI gate is a suggestion; this is the rule.
    //
    // NARROW BY CONSTRUCTION — only a claimant who ALREADY HOLDS A SEAT naming
    // a DIFFERENT one is turned away:
    //   · `oldIndex < 0` (holds nothing) still passes — that is how a player
    //     whose socket died gets back into their game, and how a latecomer
    //     fills an empty chair. Locking that out would strand people outside
    //     their own town.
    //   · `index < 0` (the Leave door) still passes — standing up is not a
    //     move, and a player must always be able to stop playing.
    //   · the STORYTELLER is not here at all: their Move/Swap/Empty tools go
    //     out as `players/move`, `players/swap` and `sendPlayer`, none of
    //     which pass through this method. Their table, their arrangement.
    //
    // `_isDealt` is FT-1105's durable marker (the deal pulse OR the host's
    // per-town deal stash), not the two-second `isRolesDistributed` pulse, so
    // it holds for the whole game and survives the host reloading.
    //
    // The refusal ANSWERS: a lightweight resync to that one claimant — the
    // idiom this file already uses to put a client's roster straight
    // (`players/add`|`set`|`clear` above) — so a client that had painted the
    // move optimistically is corrected by the truth rather than by silence.
    if (index >= 0 && oldIndex >= 0 && oldIndex !== index && this._isDealt()) {
      this.sendGamestate(value, true);
      return;
    }
    if (oldIndex >= 0 && oldIndex !== index) {
      // FT-1312: breadcrumb — every unseat names its path.
      console.info(
        index >= 0
          ? `[seat] claim moved a player: seat ${oldIndex + 1} freed for ` +
              `seat ${index + 1}`
          : `[seat] player stood up from seat ${oldIndex + 1}`,
      );
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
      // FT-1035: THE NAME FOLLOWS THE CLAIM. A claimant's own remembered
      // name wins over whatever the seat was showing — a "Fake N"
      // placeholder or a name left behind by whoever held the chair
      // before — the same way claiming already overrides who HOLDS it.
      // Only fires when the claimant actually has a name to offer, so an
      // anonymous claim (should not happen via the UI, but costs nothing
      // to guard) leaves the seat's label alone.
      const trimmedName = (name || "").trim();
      if (trimmedName && trimmedName !== player.name) {
        this._store.commit("players/update", {
          player,
          property: "name",
          value: trimmedName,
        });
      }
    }
    // update player session list as if this was a ping
    //
    // FT-1312: THE CLAIM NOW REGISTERS THE CLAIMANT. This call has passed
    // `[true, value, 0]` since upstream — which registered the literal key
    // "true" in `_players` and never the claimant, so the one act that
    // proves a player is present counted for nothing. Worse: the sweep
    // inside this very call then saw a seat whose id was absent from
    // `_players` and emptied the chair in the same tick it was claimed —
    // FT-1292's "a claim on a seat the sweep has not freed dies silently".
    // Passing the real id (registered FIRST, see _handlePing's reorder)
    // makes the claim its own proof of life.
    this._handlePing([value, 0]);
    // FT-1343: a chair changing THIS client's standing settles its grimoire
    // window. Sitting down: the grant ledger's own truth is re-cut for the
    // claimant (a pinned grant survives, anything else — the spectator
    // feed's window included — is revoked; what they already saw stays
    // theirs, the FT-1295 memory rule). Standing up: they are a watcher now,
    // and the feed's standing truth reaches them like any other watcher's.
    if (index >= 0) {
      this._syncGrimoireGrant(value);
    } else {
      this.sendSpectatorGrimoire(value);
    }
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
   * FT-1133: THE SEATS WERE SHUFFLED — put every client straight.
   *
   * The shuffle moves the PEOPLE between chairs and leaves everything the
   * chair holds where it is (players.js's `randomize`). Before the deal that
   * is a pure renaming and the broadcast below is the whole job. After it,
   * chairs have changed hands, and a chair changing hands is the one event
   * this file has always had to be careful about: a character is delivered
   * per SEAT, privately, so nothing about a shuffle is visible to the wire
   * unless it is said here.
   *
   * FOUR THINGS ARE SAID, in this order:
   *
   * 1. THE SEATING, to everyone. Names, ids, pronouns and shrouds, on the
   *    ordinary lightweight sync — the same frame `players/set` has always
   *    answered with. It also rebuilds `_gamestate`, which step 2 reads.
   *
   * 2. A MOVER'S OLD CHARACTER, taken off the mover's own client. This is the
   *    frame with no substitute: the lightweight sync carries a roleId only
   *    for a traveler's chair, and the receiver deliberately leaves a
   *    non-traveler role standing when none arrives (`_updateGamestate`). So
   *    without this, a player who moved keeps painting the character they
   *    were dealt onto a chair somebody else is now sitting in — and step 3
   *    would hand them a second one, leaving two characters on one screen and
   *    two clients believing they hold the same character. That is worse than
   *    the bug being fixed, which is why it is sent FIRST and to the mover
   *    alone. The value is not a blanket clear but exactly what EVERY client
   *    is entitled to hold at that index — a traveler's id, a revealed id
   *    after the game ends, otherwise nothing — read off the gamestate step 1
   *    just rebuilt, so a mover leaving a traveler's chair does not blank it.
   *
   * 3. THE CHARACTER NOW UNDER THEM, to each seated player. `_sendBelief` is
   *    the existing per-seat primitive for precisely this, and it carries that
   *    seat's bluffs with it — so the demon's chair changing hands moves the
   *    three in BOTH directions (the new holder is sent them, the old holder
   *    is sent an empty set) with no bluff logic here at all. Silent before
   *    the deal by its own guard.
   *
   * 4. THE GRANTS AND THE NIGHT ROWS, re-cut. A grimoire grant is keyed to a
   *    PERSON and omits that person's own seat, which just moved; night rows
   *    are delivered per seat. Both are re-sent rather than reasoned about.
   *
   * @param moves [{ id, from, to }] for every seated person who changed chair.
   */
  reseatPlayers({ moves } = {}) {
    if (this._isSpectator) return;
    this.sendGamestate("", true);
    if (!this._isDealt()) return;
    (moves || []).forEach(({ id, from }) => {
      if (!id || !(from >= 0)) return;
      const seat = this._gamestate[from];
      this._sendDirect(id, "player", {
        index: from,
        property: "role",
        value: (seat && seat.roleId) || "",
      });
    });
    this._store.state.players.players.forEach((player, index) => {
      this._sendBelief(player, index);
    });
    this._refreshGrimoire();
    this.sendNightRows();
  }

  /**
   * FT-1105: HAS THIS TOWN BEEN DEALT? The one question four private senders
   * below (`_sendBelief`, `sendBluffs`, `sendGrimoire`, `_syncGrimoireGrant`)
   * all need, and all of them used to ask it of the wrong flag.
   *
   * `session.isRolesDistributed` is a TWO-SECOND PULSE, not a state: Menu.vue
   * commits it true to run the deal animation and commits it false again two
   * seconds later (the fork has said so in three other places already —
   * App.vue's `showHostTools`, golem/stats.js's header, TownSquare's
   * `townLive`). Read as "the game has started" it is true for two seconds per
   * game and false for the rest of it, so every private per-seat delivery
   * AFTER the deal was dropped in silence: a demon claiming their chair a
   * minute in got no character and no bluffs, which is the bug this fixes.
   *
   * THE PULSE STAYS AS THE FIRST TEST and that ordering is load-bearing. The
   * stash is stamped by App.vue on this very mutation from a subscriber
   * registered AFTER the socket plugin's, so at the instant the deal itself
   * sends, the stash is still empty and only the pulse is true.
   *
   * THE STASH IS THE RIGHT DURABLE ANSWER rather than "does any seat hold a
   * role": a storyteller assigns characters in the build panel long before
   * pressing Start, and a roster test would start pushing characters at
   * players mid-build — the exact leak the original guard exists to prevent.
   * `dealTimeFor` is host-side, per town, survives the host's own reload, and
   * is cleared when the game is recorded or abandoned (golem/stats.js), so it
   * closes again between games with no extra bookkeeping.
   */
  _isDealt() {
    const { session } = this._store.state;
    return (
      !!session.isRolesDistributed || !!dealTimeFor(session.sessionId || "")
    );
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
    if (!this._isDealt()) return;
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
    if (!this._isDealt()) return;
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
    // FT-1295: a granted window carries the three as part of the grimoire
    // (sendGrimoire), so a bluff the storyteller just changed has to reach it
    // through that frame — this channel says nothing to a seat that is not a
    // demon, which is exactly the point of carrying them over there instead.
    // Almost always an empty loop; the ledger holds a key only while a window
    // is open. The one path that reaches here twice (a role edit: sendPlayer
    // refreshes, then _sendBelief lands here and refreshes again) sends one
    // extra idempotent frame to one seat, which is cheaper than a flag.
    this._refreshGrimoire();
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
    // FT-1295: AN EMPTY LIST DOES NOT ERASE A GRIMOIRE MEMORY.
    //
    // This channel clears a seat by sending nothing — that is how a client
    // which stops being the demon loses what it was holding, and it is right.
    // But it goes to EVERY seated player on every bluff edit, so after a
    // granted window closed it would reach the Spy carrying an empty set and
    // wipe the three they were shown. Exactly the loss this lane removed from
    // the roles; the same answer here.
    //
    // NARROW ON PURPOSE — only the empty list, only for a client that has been
    // shown the grimoire. A real set still writes (a Spy who later becomes the
    // demon gets the demon's three), and a client that was never granted is
    // untouched in both directions. What overwrites a memory is a fresh look,
    // and nothing else.
    if (!list.length && this._store.state.session.hasGrimoireMemory) return;
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
   * broadcast-on-empty branch is unreachable. A grant payload describes every
   * OTHER seat — the recipient's own seat is skipped, so a seat whose belief
   * differs from its truth (a Lunatic granted by mistake) cannot learn what it
   * really is from its own grant.
   *
   * A REVOKE IS SENT WHEN THE LEDGER HOLDS NOTHING, deliberately: the client
   * side is idempotent (revokeGrimoire no-ops when nothing is granted), so a
   * revoke frame doubles as the self-healing answer for a joiner and for a
   * host that reloaded and lost its ledger — a stale window always closes on
   * the holder's next full sync.
   *
   * FT-1295: A GRIMOIRE IS NOT A ROLE LIST. The payload was `[{index,roleId}]`
   * — characters and nothing else — and the user reported the hole: "spy isn't
   * seeing reminder tokens or demon bluffs and they should when shown the
   * grimoire". A storyteller's grimoire is the characters, the tokens laid
   * beside them and the three the demon may claim; a window onto it that shows
   * one of the three is a role list with a nicer name. So the frame is now
   * `{ seats, bluffs }` and carries all three.
   *
   * THIS IS THE FIRST AND ONLY PATH A REMINDER TRAVELS. `sendPlayer` has
   * dropped the property since the fork began and still does — see its own
   * note — and no broadcast anywhere carries one. A token reaches exactly the
   * seats this method addresses, one at a time, by name.
   *
   * THE BLUFFS RIDE IN THIS FRAME rather than through `sendBluffs`, and that
   * is a privacy decision, not a plumbing one. The bluffs channel exists to
   * answer one question — does this chair believe it is the demon — and it
   * clears a seat by sending an empty list. Teaching it a second entitlement
   * would mean the close had to clear the Spy, which is the wipe this lane
   * exists to remove. Carried here instead, the REASON a granted seat holds
   * bluffs is the grant frame itself, revoking removes that reason (no later
   * frame carries them), and `sendBluffs` is left exactly as it was: no new
   * sender, no widened predicate, nothing to re-argue.
   *
   * WHICH SEATS THE GRIMOIRE SPEAKS ABOUT: those holding a character. A seat
   * with no character is one the grant is silent about, so the holder keeps
   * whatever they remember there — the same rule the recipient's own chair
   * gets, and the reason `grantGrimoire` can safely own every field of the
   * seats it DOES name.
   *
   * @param playerId REQUIRED — the one seat this frame is for.
   */
  sendGrimoire(playerId) {
    if (this._isSpectator) return;
    if (!playerId) return;
    if (!this._isDealt()) return;
    const grant = (this._store.state.session.grimoireGrants || {})[playerId];
    if (!grant) {
      this._sendDirect(playerId, "grimoire", false);
      return;
    }
    this._sendDirect(playerId, "grimoire", this._grimoirePayload(playerId));
  }

  /**
   * FT-1343: ONE GRIMOIRE FRAME'S PAYLOAD — the `{ seats, bluffs }` body
   * sendGrimoire has always sent, extracted so the spectator feed below
   * sends the SAME shape through the same client-side arrival
   * (_updateGrimoireGrant/grantGrimoire) rather than a parallel one.
   *
   * @param excludeId THE OWN-SEAT RULE, and it covers the tokens as well as
   * the character. Skipping the recipient's own chair is FT-1003's guard
   * against a seat reading its own truth out of its own grant (a Lunatic, a
   * Drunk); their REMINDERS would reopen that hole from the side, because
   * the tokens are the same secret written in words — "Drunk", "Poisoned",
   * "Is the Demon", "Red herring" sitting on their own chair. One skip,
   * both, which is also why this is a `return` on the seat rather than two
   * filters that could drift apart. The Spy ends up complete about the town
   * and silent about themselves, which is the shape of every other
   * information character in the game. A SEATLESS recipient (FT-1343's
   * watcher) matches no seat, so the same rule hands them the whole board —
   * they have no chair to be protected from.
   * @private
   */
  _grimoirePayload(excludeId) {
    const seats = [];
    this._store.state.players.players.forEach((player, index) => {
      if (player.id && player.id === excludeId) return;
      if (!player.role || !player.role.id) return;
      seats.push({
        index,
        roleId: player.role.id,
        // Sent VERBATIM (minus the deal's own bookkeeping — see
        // `_reminderForWire`) rather than as names to look up: the receiving
        // client resolves a token's art from `image`/`imageAlt`/`role`, and an
        // id it cannot resolve — a bluff's role, a custom character out of its
        // edition — would land as a broken require rather than a token.
        reminders: (player.reminders || []).map(_reminderForWire),
      });
    });
    const bluffs = this._store.state.players.bluffs || [];
    const bluffIds = [];
    for (let i = 0; i < BLUFF_COUNT; i++) {
      bluffIds.push((bluffs[i] && bluffs[i].id) || "");
    }
    return { seats, bluffs: bluffIds };
  }

  /**
   * FT-1344: the connected clients holding NO chair — the host's ping roster
   * minus the seated ids. The watcher list and the spectator-grimoire feed
   * both ask this one question.
   * @private
   */
  _watcherIds() {
    const seated = new Set(
      this._store.state.players.players.map((p) => p.id).filter(Boolean),
    );
    return Object.keys(this._players).filter((id) => !seated.has(id));
  }

  /**
   * FT-1344: derive the watcher list and put it in the store when it moved —
   * the host-only mirror the panel renders. Sorted for a stable render
   * (named first, then by id) and compared before committing so the 30s ping
   * cadence does not churn the panel.
   * @private
   */
  _syncSpectators() {
    if (this._isSpectator) return;
    const list = this._watcherIds()
      .map((id) => ({ id, name: this._watcherNames[id] || "" }))
      .sort((a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1));
    const held = this._store.state.session.spectators || [];
    if (
      held.length === list.length &&
      held.every((s, i) => s.id === list[i].id && s.name === list[i].name)
    ) {
      return;
    }
    this._store.commit("session/setSpectators", list);
  }

  /**
   * FT-1343: THE SPECTATOR FEED — the whole grimoire to every seatless
   * watcher, or the standing truth to one of them. Host only, dealt only,
   * and the town's own setting (towerState.spectatorGrimoire, the tower
   * shelf) is THE gate: while it is off nothing secret is built, let alone
   * sent — a watcher's "public view only" is enforced at this send layer,
   * not by the receiving client's paint.
   *
   * NEVER A BROADCAST, structurally — the sendBluffs/sendGrimoire rule: each
   * watcher is addressed by id on the direct lane, so a seated client cannot
   * receive a watcher's frame by any path through here. A watcher who SITS
   * DOWN stops being in `_watcherIds` and their window is settled by
   * `_syncGrimoireGrant` on the claim (see _updateSeat); what they already
   * saw stays theirs — the FT-1295 memory rule, unchanged.
   *
   * @param playerId optional — just that one watcher (a joiner's full sync,
   * a player standing up); omitted means every current watcher. When the
   * setting is OFF this sends the self-healing revoke instead, so a flip
   * lands on connected watchers and a stale window always closes.
   */
  sendSpectatorGrimoire(playerId = "") {
    if (this._isSpectator) return;
    if (!this._isDealt()) return;
    const watchers = this._watcherIds().filter(
      (id) => !playerId || id === playerId,
    );
    if (!watchers.length) return;
    const on = !!towerState.spectatorGrimoire;
    const payload = on ? this._grimoirePayload("") : false;
    watchers.forEach((id) => this._sendDirect(id, "grimoire", payload));
  }

  /**
   * FT-1344: SHOW A WATCHER OUT. Host only, and only ever a seatless viewer
   * — a seated player's removal travels the seat tools' own frames, never
   * this one. Two independent messages, so the kick lands whichever relay is
   * deployed:
   *
   *   · a direct "kicked" frame to that client — it leaves the town and says
   *     why on the door (the FT-890 landing, reused);
   *   · a "kick" command to the RELAY, which closes that playerId's socket
   *     with a REASONED code-1000 close — the one signal a client already
   *     treats as "the relay put you out — leave, don't reconnect"
   *     (FT-1011). That half is enforced at the wire: a client that ignores
   *     the frame is disconnected anyway. On a relay from before the branch
   *     the command falls through to the broadcast default, which every
   *     client's message switch ignores — the direct frame still lands.
   *
   * KICKED IS NOT BANNED — the fork holds no ban primitive, and none is
   * invented here: the same invite link walks them straight back in, which
   * is the storyteller's own social problem to solve, not the wire's.
   */
  kickSpectator(playerId) {
    if (this._isSpectator || !playerId) return;
    if (!this._watcherIds().includes(playerId)) return;
    this._sendDirect(
      playerId,
      "kicked",
      "The storyteller ended your spectating in this town.",
    );
    this._send("kick", playerId);
    // the host's own bookkeeping does not wait for the bye that may never
    // come — the list says now what the town has decided.
    delete this._players[playerId];
    delete this._pings[playerId];
    delete this._watcherNames[playerId];
    delete this._swept[playerId];
    this._store.commit(
      "session/setPlayerCount",
      Object.keys(this._players).length,
    );
    this._syncSpectators();
  }

  /**
   * FT-1344: the "kicked" frame landing on THIS client — the storyteller
   * showed a watcher out, and the watcher is us. Spectator only, and only
   * while genuinely seatless (a client that sat down in the race window is
   * a player now; if the storyteller still means it, the relay's close —
   * aimed at the same decision — lands regardless). Leaving is the FT-890
   * one-call landing: the entry screen, with the reason said in the app.
   * @private
   */
  _handleKicked(reason) {
    if (!this._isSpectator) return;
    const me = this._store.state.session.playerId;
    if (this._store.state.players.players.some((p) => p.id && p.id === me)) {
      return;
    }
    leaveTown(this._store);
    flashHint(
      typeof reason === "string" && reason
        ? reason
        : "The storyteller ended your spectating in this town.",
    );
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
    if (!this._isDealt()) return;
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
    // FT-1343: a live spectator feed goes stale on exactly the changes the
    // granted windows do, so it refreshes on the same beat. Only while ON —
    // a refresh is never the thing that closes a window (the flip and the
    // full sync own the revoke).
    if (towerState.spectatorGrimoire) this.sendSpectatorGrimoire();
  }

  /**
   * FT-1003: the grimoire window opening or closing on this client. Player
   * only — the storyteller's own grimoire is the authority and is never
   * written from the wire. Roles resolve here, the same session-then-global
   * lookup _updateGamestate uses; an id this client cannot resolve is skipped
   * rather than rendered as a blank coin.
   *
   * FT-1295: the open payload is `{ seats, bluffs }` (see sendGrimoire) and
   * anything that is not that shape is the close. Reminders arrive already
   * whole — they are display objects, not ids — so they are copied through
   * the same field-by-field cut the sender applied rather than trusted as
   * they stand: a client applies to its own board only the four fields a
   * token is, whatever a frame happens to carry.
   * @private
   */
  _updateGrimoireGrant(payload) {
    if (!this._isSpectator) return;
    if (!payload || !Array.isArray(payload.seats)) {
      this._store.commit("revokeGrimoire");
      return;
    }
    const seats = [];
    payload.seats.forEach((seat) => {
      if (!seat || typeof seat.index !== "number") return;
      const role =
        this._store.state.roles.get(seat.roleId) ||
        this._store.getters.rolesJSONbyId.get(seat.roleId);
      if (!role) return;
      seats.push({
        index: seat.index,
        role,
        reminders: (Array.isArray(seat.reminders) ? seat.reminders : []).map(
          _reminderForWire,
        ),
      });
    });
    // The three, in slot order and including the empty ones — a storyteller
    // who cleared a bluff has to be able to clear it here too, and the
    // mutation's splice needs slot 0 filled before slot 2 exists.
    const ids = Array.isArray(payload.bluffs) ? payload.bluffs : [];
    const bluffs = [];
    for (let index = 0; index < BLUFF_COUNT; index++) {
      const id = ids[index];
      bluffs.push(
        (id &&
          (this._store.state.roles.get(id) ||
            this._store.getters.rolesJSONbyId.get(id))) ||
          {},
      );
    }
    this._store.commit("grantGrimoire", { seats, bluffs });
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
   * everything a player may not know (the lie mark, the true/shown pair —
   * absent from the frame, not hidden by the client).
   *
   * FT-1291: the storyteller's tick DOES cross now, as `sent`, and only ever
   * on a row this recipient already owns — so the frame gained one boolean
   * about that seat's own row and no socket receives anything it did not
   * receive before. It is what lets the seat's own picker stand down once the
   * answer has gone out. projectPlayerRow holds the reasoning.
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
    // FT-1107 rider (user, verbatim): "if it is set to storyteller only for
    // night actions the user doesn't see the action menu at night, but they
    // still see the log if the story teller fills it in."
    //
    // TWO GATES, NOT ONE. `live` is THE ASK — whether this seat gets the
    // night's prompt on the clock face at all — and only "everyone" turns it
    // on. `share` is THE RECORD, and it is on in every mode but "off",
    // because a Storyteller-only town still has a storyteller writing this
    // seat's row and that row is the player's own night. Until now the two
    // were the same flag, so choosing "Storyteller" took a player's log away
    // along with their prompt.
    //
    // "off" is the one mode that sends nothing: it means no sheet and no log,
    // so there is nothing to record and nothing to share.
    //
    // The PRIVACY is unchanged and does not depend on which gate is open:
    // projectEntriesFor scopes to this seat's own rows and strips the lie
    // mark, and every seat gets its own direct frame — never a broadcast.
    // (FT-1291 added `sent` to a row's own shape; scoping is what makes that
    // safe, and scoping is what has not changed.)
    const share = night.mode !== "off";
    const message = {};
    players.players.forEach((player, seat) => {
      if (!player.id) return;
      if (playerId && player.id !== playerId) return;
      message[player.id] = [
        "night",
        {
          live,
          rows: share ? projectEntriesFor(night.entries, player.id, seat) : [],
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
   * FT-1045: send the whole tower (a handful of small fields), live. ST only.
   * Fired from the TOWER_EVENT listener in the plugin below — the same
   * event every tower surface already re-reads on — so any surface that
   * writes the tower inherits the delivery without knowing this exists.
   */
  sendTower() {
    if (this._isSpectator) return;
    this._send("tower", towerSyncPayload());
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
   * FT-1314: the tie-cross moving — the mark's own broadcast, one frame over.
   * ST only, like every mark transition.
   */
  sendMarkedTie() {
    if (this._isSpectator) return;
    this._send("markedTie", this._store.state.session.markedTie);
  }

  /**
   * FT-1314: the dying Imp's "who inherits" answer going up — the
   * sendNightAction shape verbatim: direct to the host, stamped with this
   * client's own playerId because the relay attaches no sender.
   */
  sendStarpassAnswer(payload) {
    if (!this._isSpectator) return;
    this._sendDirect("host", "starpassPick", {
      seat: payload && payload.seat,
      playerId: this._store.state.session.playerId,
    });
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
    // FT-1140: THE DAY COUNTER DOES NOT SURVIVE ITS GAME. `night.day` still
    // holds the finished game's last day after a game ends — Play again is
    // what resets it, not the ending — so a row written in the lull between
    // two games would carry, and be read as, a moment belonging to the game
    // before it (a death written after the end reading "Day 3"). Null is the
    // honest answer there: that row happened outside any game's own time, and
    // its wall clock is the only moment it has.
    //
    // HERE, because this is the one funnel every writer reaches the wire
    // through — systemMessage, the two composers, and App.vue's end-of-game
    // rows (which are all committed BEFORE `endGame`, so they still carry the
    // running clock and are untouched by this).
    const { session } = this._store.state;
    this._send(
      "chat",
      session.isEnded ? { ...payload, dayNumber: null } : payload,
    );
    // FT-1206: THE PLANE RIDES BESIDE THE WHISPER, NOT INSIDE IT. A whisper
    // between two SEATED players (both seats integers — a storyteller end is
    // null and flies nothing) broadcasts its metadata-only mark to the whole
    // town, unless the town turned the marks off — Off is suppressed at SEND,
    // so the wire stays quiet, and receive ignores strays defensively too.
    // One plane per message, the user's own call ("an airport is fine").
    //
    // The relay never echoes a broadcast to its sender, so this browser shows
    // its own plane through the same handler every other browser uses.
    if (
      payload.kind === "whisper" &&
      Number.isInteger(payload.senderSeat) &&
      Number.isInteger(payload.recipientSeat) &&
      towerState.whisperMarkSec > 0
    ) {
      const mark = { from: payload.senderSeat, to: payload.recipientSeat };
      this._send("whisperMark", mark);
      this._handleWhisperMark(mark);
    }
  }

  /**
   * FT-1206: a whisper-mark frame, from the wire or from this client's own
   * send. Refused unless the town's marks are on and the shape is two real,
   * distinct seats on this ring (golem/whisperMarks.cleanMark) — a
   * hand-written frame from a console draws nothing. What survives is a
   * window event; WhisperPlanes.vue draws it.
   */
  _handleWhisperMark(params) {
    if (!(towerState.whisperMarkSec > 0)) return;
    const mark = cleanMark(params, this._store.state.players.players.length);
    if (!mark) return;
    // FT-1263: the plane's MEMORY — a bystander keeps a local traffic row
    // ("Ana ✈ Bea", metadata only) so the day's whispering reads in the
    // Chronicle after the plane is gone. The mutation itself refuses the
    // storyteller and the whisper's own seats: their log holds the whisper
    // row, which is already their record of this traffic.
    //
    // FT-1309: AND THE ROW IS A HOST SETTING NOW — "Whisper traffic", a
    // tower key synced like its siblings, gated HERE at the mint so no
    // client records a line while it is Off. The mint runs per client from
    // this broadcast frame, so the frame itself still crosses the wire —
    // it drives the plane, which whisperMarkSec owns — and that is honest:
    // this setting is about the LOG, not the wire, and whisper CONTENT was
    // never aboard the frame either way. Rows minted before the flip stand;
    // the setting governs minting from the moment it changes.
    if (towerState.whisperTraffic) {
      this._store.commit("chatMarkTraffic", mark);
    }
    try {
      window.dispatchEvent(
        new CustomEvent(WHISPER_MARK_EVENT, { detail: mark }),
      );
    } catch (e) {
      // no CustomEvent: the whisper still lands; only the plane is lost
    }
  }

  /**
   * FT-1206: A WHISPER REACHED THIS VIEWER — raise the unfold toast. Only for
   * a row that (a) is a whisper, (b) names this viewer as its RECIPIENT (the
   * storyteller answers to the Storyteller key whatever name they typed),
   * (c) was not sent by this viewer (the relay echoes the sender too), and
   * (d) actually SURVIVED ingest — the level defence may have dropped it, and
   * a toast for a line the log refuses to hold would be the notification
   * outliving the message.
   */
  _notifyWhisper(row) {
    if (!row || row.kind !== "whisper") return;
    const state = this._store.state;
    const viewer = viewerOf(state);
    if (!viewer.key || row.senderKey === viewer.key) return;
    const mine = viewer.isStoryteller
      ? row.recipientKey === STORYTELLER_KEY || row.recipientKey === viewer.key
      : row.recipientKey === viewer.key;
    if (!mine) return;
    if (!state.chat.log.some((r) => r.seq === row.seq)) return;
    try {
      window.dispatchEvent(
        new CustomEvent(WHISPER_TOAST_EVENT, { detail: row }),
      );
    } catch (e) {
      // no CustomEvent: the row is in the log; only the toast is lost
    }
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

  // FT-1045: THE TOWER CHANGED, somewhere on this client — the same window
  // event every tower surface re-reads on. A HOST broadcasts the new tower
  // live; a spectator's event (their own display pick, or a sync applying)
  // is nobody else's business and the guard drops it. Also fires on the
  // host's own load/mount — a redundant send of a small object, and a
  // closed socket swallows it (_send checks readyState).
  window.addEventListener(TOWER_EVENT, () => {
    if (!store.state.session.isSpectator && store.state.session.sessionId) {
      session.sendTower();
    }
  });

  // FT-1314: THE AUTOMATION FLAGS' REACTIVE MIRROR. towerState is a plain
  // module object Vue cannot watch, and the night roster getter needs to
  // re-run when the Scarlet Woman automation flips (her row's hide). So the
  // six flags are mirrored into session state on every tower event — a load,
  // a host's toggle, a sync arriving — and once at boot for the defaults.
  store.commit("session/setAutomations", automationFlags());
  window.addEventListener(TOWER_EVENT, () => {
    store.commit("session/setAutomations", automationFlags());
  });

  // FT-1206: THE CHAT LEVEL CHANGED — on the host's own pick or on a sync
  // arriving. Rows are level-filtered at ingest (store's chatIngest), so the
  // held log answers to the OLD level and the cursor has moved past whatever
  // it dropped; throw the log away and re-read it under the level now in
  // force — the exact move the live-game-boundary watcher below makes, for
  // the exact same reason.
  let lastChatLevel = towerState.chatLevel;
  window.addEventListener(TOWER_EVENT, () => {
    if (towerState.chatLevel === lastChatLevel) return;
    lastChatLevel = towerState.chatLevel;
    if (!store.state.session.sessionId) return;
    store.commit("chatReset");
    store.dispatch("chatCatchUp");
  });

  // FT-1343: THE SPECTATOR-GRIMOIRE SETTING FLIPPED — the host delivers the
  // new truth to every connected watcher NOW (the board when it went on, the
  // revoke when it went off) rather than on their next full sync. The same
  // change-only tower watcher the chat level rides above; a spectator's own
  // event (a sync arriving) is dropped by the host guard.
  let lastSpectatorGrimoire = towerState.spectatorGrimoire;
  window.addEventListener(TOWER_EVENT, () => {
    if (towerState.spectatorGrimoire === lastSpectatorGrimoire) return;
    lastSpectatorGrimoire = towerState.spectatorGrimoire;
    const { session: s } = store.state;
    if (!s.sessionId || s.isSpectator) return;
    session.sendSpectatorGrimoire();
  });

  // FT-1010: the live game id as last seen, for spotting the moment it
  // CHANGES. `chatSetGameId` is committed on every gamestate sync, almost
  // always with the value it already had — only an actual change means the
  // finished/live boundary moved and the log must be re-read (see the case
  // below).
  let lastLiveGameId = null;

  // FT-1019: the execution mark as last seen, for telling a DELIBERATE
  // unmark (news — the storyteller lifted a standing mark during the day)
  // from the night falling (housekeeping — the day expired and took its mark
  // with it). Updated on every setMarkedPlayer commit, host and spectator
  // alike; only the host's client ever turns it into a row.
  let lastMarkedSeat = -1;

  // FT-1037: the town this host is about to OPEN — set when the host enters
  // a town whose session stash says it was shut (golem/chronicles'
  // beginTownSession), consumed by the first `chatSetGameId` commit, which is
  // the host's own sendGamestate on socket open: the one moment that is both
  // "connected" and reachable from this subscriber without touching
  // LiveSession. A resume (reload, relay blip) never sets it, so Current's
  // anchor holds across a mid-game reload.
  let pendingOpenTown = null;

  // FT-1037: the hosting heartbeat — keeps the session stash's `seen` fresh
  // while the town is open, so "shut" is measured from when the host actually
  // left, not from when they arrived.
  let openHeartbeat = null;

  // listen to mutations
  store.subscribe(({ type, payload }, state) => {
    switch (type) {
      case "session/setSessionId":
        if (state.session.sessionId) {
          session.connect(state.session.sessionId);
        } else {
          session.disconnect();
        }
        // FT-1037: entering as HOST decides fresh-opening vs resumed sitting;
        // the open row itself waits for the connect (see pendingOpenTown).
        clearInterval(openHeartbeat);
        openHeartbeat = null;
        pendingOpenTown = null;
        if (state.session.sessionId && !state.session.isSpectator) {
          const town = state.session.sessionId;
          if (beginTownSession(town)) pendingOpenTown = town;
          openHeartbeat = setInterval(() => touchTownSession(town), 60 * 1000);
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
        // FT-1289: ...and the chair goes with the room. `claimedSeat` is this
        // browser's own note of WHERE IT SITS, and it survived every town
        // change — sit in seat 3 of one town, leave, join another, and the
        // note still said 3. Harmless while nothing acted on it alone; not
        // harmless now that a resync re-asserts an empty chair from it (see
        // `_updateGamestate`), which would have walked this client into a
        // stranger's town and sat down in seat 3. Cleared on the same
        // mutation, for the same reason the log above is: a town is a room,
        // and nothing about the last one comes into the next.
        store.commit("session/claimSeat", -1);
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
            // FT-1057: THE OPENING BOARD — the ring as dealt, captured at
            // this very moment, host only, STASHED rather than sent: a
            // board row broadcast now would hand every player the grimoire
            // (roles ride the body). The host's own chronicle renders it
            // straight from this stash; App.vue posts it into the shared
            // log at game end, when the reveal has made every role public.
            // (FT-1037 captured this as Day 1 broke; the deal is the truer
            // opening — the board before the first night touches it.)
            stashOpeningBoard(
              state.chat.gameId,
              boardRingOf(state.players.players),
            );
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
        // FT-1037: THE TOWN OPENS — written once, on the first sync after a
        // fresh-opening connect (the host's own sendGamestate commits this
        // mutation with the socket already open, so the row cannot be lost
        // to a not-yet-ready connection). Current mode anchors on the LAST
        // of these rows; History reads everything by game.
        if (pendingOpenTown && pendingOpenTown === state.session.sessionId) {
          pendingOpenTown = null;
          session.systemMessage("The town opens.", { t: "open" });
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
        // FT-1019: THE ROSTER RIDES THE ROW — who raised hands, recorded once
        // at the conclusion (this case only ever fires on a completed sweep),
        // never per-hand. `ghosts` is the subset who were dead as they voted:
        // a spent ghost vote, which the render marks with the cowl. Read from
        // the live seats + tallies (still standing — the nomination clears one
        // commit later), not from `rec`, which only kept the names.
        const ghosts = state.players.players
          .filter((p, i) => state.session.votes[i] && p.isDead)
          .map((p) => p.name)
          .filter(Boolean);
        // FT-1310: THE NO LIST, recorded the way `ghosts` is — from the live
        // seats at the conclusion, because the frames carry no per-player
        // vote record (only the raised hands ride `rec.votes`). No is the
        // seats ELIGIBLE to vote on this nomination minus the hands:
        // eligibility here is Vote.vue's own canVote rule — a spent ghost
        // vote (`isVoteless`) bars a seat unless the nominee is a traveler
        // (an Exile, where every seat votes). A voteless seat is not "No",
        // it is INELIGIBLE — it had no hand to keep down — so it appears on
        // neither line. A dead seat with its ghost vote unspent could have
        // raised it, and its stillness is a real No.
        const nays = state.players.players
          .filter(
            (p, i) =>
              !state.session.votes[i] &&
              (rec.type === "Exile" || !p.isVoteless),
          )
          .map((p) => p.name);
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
            voters: rec.votes,
            ghosts,
            // FT-1310: the hands that stayed down (see above). A row from
            // before this field renders its Yes line only — the render
            // refuses to guess a No set it was never given.
            nays,
          },
        );
        // FT-1314: THE VOTE CONCLUDED — the auto-mark and ghost-vote rules
        // judge this record. Here, after the row above, because the live
        // tallies (session.votes) still stand for one more commit and the
        // engine reads them; each rule gates itself on its own checkbox.
        onVoteConcluded({ store, live: session }, rec);
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
      // FT-1344: the storyteller shows a watcher out — the callBack idiom:
      // the commit is the event, this is the one place it goes out (the
      // direct frame + the relay's wire-level close; host-only inside).
      case "session/kickSpectator":
        session.kickSpectator(payload);
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
        // FT-1314: THE DAY'S END IS THE AUTOMATIONS' BELL. Host only, on the
        // genuine day→night turn, and BEFORE the phase's own housekeeping
        // (Menu/NightSheet clear the mark one commit after this; the tie is
        // retired just below) — so the end-day execution still finds the
        // mark it hangs, and the Undertaker's prefill reads the execution
        // it may have just recorded. Order inside the pair matters too:
        // the execution writes the record the prefill wants.
        if (!state.session.isSpectator && state.grimoire.isNight) {
          onDayEnds({ store, live: session });
          prefillUndertaker({ store, live: session });
        }
        // FT-1314: THE NIGHT RETIRES THE TIE-CROSS with the day it belongs
        // to — every client, the same clock (a spectator reaches here on the
        // host's isNight frame). The host's commit re-broadcasts the null;
        // a spectator's own send is refused by the ST guard.
        if (state.grimoire.isNight && state.session.markedTie) {
          store.commit("session/setMarkedTie", null);
        }
        // FT-1314: ...and a starpass chooser nobody answered does not
        // outlive its night. Host clears + tells the one client; a player
        // client also stands its own copy down when day breaks (the direct
        // "starpass" null covers a client that missed this commit).
        if (!state.grimoire.isNight) {
          retireStarpassOffer({ store, live: session });
          if (state.session.starpassOffer) {
            store.commit("session/setStarpassOffer", null);
          }
        }
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
        // FT-1057: the board capture that lived here (FT-1037's Day-1 shot)
        // moved to the deal itself — see the `session/distributeRoles` case
        // above. The opening board is the game as it BEGINS, before the
        // first night touches it.
        break;
      // FT-931: THE TOWN ENDS / PLAY AGAIN. Both mutations live at the root
      // (store/index.js — they reach into the session module's own state)
      // and both fire the SAME response: one full gamestate resync. That
      // single call carries the ended flag + result
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
        // FT-1314: the starpass watches the log itself — a row born already
        // sent (a player's own pick echoed, or a hand-written record) is
        // judged the same as a patched one.
        onNightEntry({ store, live: session }, payload);
        break;
      case "night/patchEntry": {
        const entry = state.night.entries.find(
          (e) => e.id === (payload && payload.id),
        );
        session.sendNightRows((entry && entry.playerId) || "");
        // FT-1314: the Imp's row reaching SENT with itself among the targets
        // is the starpass trigger — see golem/automations.onNightEntry.
        if (entry) onNightEntry({ store, live: session }, entry);
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
        // an outcome (golem/chronicle.js's own honesty rule).
        const prevMarked = lastMarkedSeat;
        lastMarkedSeat = typeof payload === "number" ? payload : -1;
        if (typeof payload === "number" && payload >= 0) {
          const marked = state.players.players[payload];
          const name = (marked && marked.name) || `Seat ${payload + 1}`;
          session.systemMessage(`${name} is marked for execution.`, {
            t: "execution",
            name,
            seat: payload,
          });
        } else if (
          payload === -1 &&
          prevMarked >= 0 &&
          !state.grimoire.isNight
        ) {
          // FT-1019: THE UNMARK IS NEWS TOO — but only the deliberate one.
          // The night falling also commits -1 (Menu.toggleNight /
          // NightSheet.flipPhase, both AFTER toggleNight, so isNight is
          // already true here) and that is the day expiring, not a decision;
          // it writes no row. A -1 during the day with a mark standing is
          // the storyteller's own lift, and the record keeps it.
          const was = state.players.players[prevMarked];
          const name = (was && was.name) || `Seat ${prevMarked + 1}`;
          session.systemMessage(`The mark is lifted from ${name}.`, {
            t: "unmark",
            name,
            seat: prevMarked,
          });
        }
        break;
      }
      // FT-1314: the tie-cross rides a mutation like every mark transition —
      // the host's write broadcasts, a spectator's incoming copy is refused
      // by the sender's own ST guard.
      case "session/setMarkedTie":
        session.sendMarkedTie();
        break;
      // FT-1314: the dying Imp's answer — the night/playerAction idiom: the
      // commit is the event, this is the one place it goes out.
      case "session/starpassAnswer":
        session.sendStarpassAnswer(payload);
        break;
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
      // FT-1133: a roster change where the CHAIRS changed hands. It sends the
      // same lightweight sync the three cases above do, and then the per-seat
      // frames that only this change needs — see reseatPlayers.
      case "players/reseat":
        session.reseatPlayers(payload);
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
          // FT-1314: EVERY DEATH PASSES THIS ONE COMMIT — execution, night
          // kill, staged shroud, the automations' own — so this is where
          // the Scarlet Woman rule watches for the Demon falling, and where
          // a day-phase death of the marked player is recorded as the
          // execution the Undertaker's prefill reads. Host only inside.
          if (payload.value && !state.session.isSpectator && seat >= 0) {
            onDeath({ store, live: session }, payload.player, seat);
          }
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
