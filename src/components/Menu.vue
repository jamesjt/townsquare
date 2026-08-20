<template>
  <div id="controls">
    <!-- Golem fork: the session badge + vote-history count moved to the
         BOTTOM-RIGHT session pill (App.vue) — up here they sat ON TOP of the
         standing toolbar and stole its clicks. -->
    <!-- Golem fork: the gear is gone — the tab row IS the menu, always
         visible. Clicking a tab opens its section; clicking the open tab
         collapses back to the bare toolbar. -->
    <div class="menu open" :class="{ collapsed: tab === null }">
      <ul>
        <!-- Golem fork (2026-08-18, user call): the grimoire/help tabs left;
             the strip is the PLAYER surface now — script, vote history,
             night order — in our engraved art. Menu sections stay in-tree. -->
        <li class="tabs player-strip" :class="tab" v-if="inGame">
          <!-- FT-857: script + night open the SAME drawer, on their own tab.
               (The old reference / night-order overlays stay in-tree.) -->
          <img
            :src="uiScript"
            title="The script (reference sheet)"
            @click="openScriptDrawer('team')"
          />
          <!-- FT-858: the gallows opens the vote-history DRAWER, on the same
               right-hand rail as the script (the old overlay stays in-tree). -->
          <img
            :src="uiVotes"
            title="Vote history"
            @click="toggleModal('voteDrawer')"
          />
          <!-- (the moon retired 2026-08-18 as a NIGHT-ORDER door — that is a
               tab inside the script drawer now. FT-860 gives it a different
               job: a player's OWN night notes, and only where the town has
               opted into sharing them.) -->
          <img
            v-if="showNightInfo"
            :src="uiNight"
            title="What you learned at night"
            @click="toggleModal('nightDrawer')"
          />
          <!-- TOWN RECORDS — the recorded-games ledger (StatsOverlay). Same
               door, same overlay, same store flag as before; only the mark
               changed (user call 2026-08-19): the quill that used to sit on
               the chronicle moved here — a quill and inkwell reads as the
               written ledger, which is what finished games are. Baked to the
               strip's measured stone (128px, silhouette only, no outline,
               mean rgb 154,146,133, luminance wandering 110-176). The
               hourglass this mark replaced is unused now; ui-records.png
               stays in the tree. -->
          <img
            :src="uiQuill"
            title="Town records"
            @click="$emit('records')"
          />
          <!-- FT-886: THE CHRONICLE — what has happened in the game being
               played right now, which until now had no door at all — it was
               scattered across the night log, the vote history and the
               shrouds on the seats.

               Open to everyone. What each viewer gets differs, and the
               difference is enforced in the store rather than here: the drawer
               reads night/visibleEntries, which hands a storyteller the whole
               log and a player either nothing or only their own rows with the
               storyteller's marks stripped off. Nominations, executions and
               the dead are public at the table and public here.

               A CHAT BUBBLE now (user call 2026-08-19): the chronicle is the
               live, conversational log of the game in progress, so it wears
               the mark for that rather than the quill, which moved to Town
               records. Same baked stone as the rest of the strip (128px,
               silhouette only, no outline, mean rgb 154,146,133, luminance
               wandering 110-176). -->
          <img
            :src="uiChat"
            title="Chronicle — what has happened this game"
            @click="toggleModal('chronicleDrawer')"
          />
          <!-- FT-880: CALL THE TOWN BACK — every connected client makes a
               noise at once. During the day the town scatters into private
               conversations and the storyteller has no way to end them.

               STORYTELLER ONLY, by `v-if`, so a player's component tree never
               contains the control at all — there is no rule here for a
               missing stylesheet to fail to apply. (The strip already varies
               by viewer: the moon two lines up is a seated PLAYER's door and
               a storyteller never gets it.)

               Here rather than in the session pill, where the host's other
               controls live, for the reason the records door moved: this is
               wanted at exactly one moment — mid-day, nothing open — and the
               strip is the one piece of chrome that is never hidden by a
               drawer or a phone's orientation. A summons behind a closed
               drawer is not a summons.

               No confirm and no arm-then-press: unlike Leave there is nothing
               to undo, and a summons that takes two clicks arrives after the
               conversation it was meant to interrupt. -->
          <font-awesome-icon
            v-if="!session.isSpectator"
            class="call-back"
            :class="{ cooling: callBackCooling }"
            icon="bell"
            :title="
              callBackCooling
                ? 'Just called the town back'
                : 'Call the town back — everyone hears a sound'
            "
            @click="callTownBack"
          />
          <!-- FT-880: THE KEYS. Every one of this app's hotkeys has been
               undiscoverable since upstream — no screen mentions them. This is
               the door onto the list, and it is last in the row on purpose:
               it is the one mark here that is never part of running a game,
               so it sits where the eye stops rather than where it starts. -->
          <font-awesome-icon
            icon="question"
            title="Keys"
            @click="$emit('hotkeys')"
          />
        </li>

        <template v-if="tab === 'grimoire'">
          <!-- Grimoire -->
          <li class="headline">Grimoire</li>
          <li @click="toggleGrimoire" v-if="players.length">
            <template v-if="!grimoire.isPublic">Hide</template>
            <template v-if="grimoire.isPublic">Show</template>
            <!-- FT-880: the coins moved off G (which is the grimoire drawer
                 now) onto R, and the badge wears the index page's own key
                 treatment rather than bracketed plain text. -->
            <em><KeyCap letter="R" /></em>
          </li>
          <!-- Golem fork (2026-08-18, user call): Switch to Night, Select
               Edition, Show Custom Images and Disable Animations left the
               menu — redundant beside the workbench/host tools (the S and E
               hotkeys still answer). Methods untouched. -->
          <li v-if="!session.isSpectator" @click="toggleModal('fabled')">
            Add Fabled
            <em><font-awesome-icon icon="dragon"/></em>
          </li>
          <li @click="toggleNightOrder" v-if="players.length">
            Night order
            <em>
              <font-awesome-icon
                :icon="[
                  'fas',
                  grimoire.isNightOrder ? 'check-square' : 'square'
                ]"
              />
            </em>
          </li>
          <li v-if="players.length">
            Zoom
            <em>
              <font-awesome-icon
                @click="setZoom(grimoire.zoom - 1)"
                icon="search-minus"
              />
              {{ Math.round(100 + grimoire.zoom * 10) }}%
              <font-awesome-icon
                @click="setZoom(grimoire.zoom + 1)"
                icon="search-plus"
              />
            </em>
          </li>
          <li @click="toggleMuted">
            Mute Sounds
            <em
              ><font-awesome-icon
                :icon="['fas', grimoire.isMuted ? 'volume-mute' : 'volume-up']"
            /></em>
          </li>
        </template>

        <!-- Golem fork (FT-852): the Characters tab retired — Choose & Assign
             and Remove all live in the host tools; Select Edition and Add
             Fabled relocated into the Grimoire section below so no host
             capability is lost. Methods untouched. -->

        <template v-if="tab === 'help'">
          <!-- Help -->
          <li class="headline">Help</li>
          <!-- FT-857: both entries open the one script drawer, on their tab -->
          <li @click="openScriptDrawer('team')">
            Reference Sheet
            <!-- FT-880: S is the script key now, but for a HOST it opens the
                 editor, not this sheet — so this entry claims no letter
                 rather than promising one that does something else. The
                 strip's scroll mark is its other door. -->
          </li>
          <li @click="openScriptDrawer('first')">
            Night Order Sheet
            <em><KeyCap letter="F" /></em>
          </li>
          <li @click="openScriptDrawer('other')">
            Other Nights
            <em><KeyCap letter="N" /></em>
          </li>
          <li @click="$emit('hotkeys')">
            All keys
            <em><font-awesome-icon icon="question"/></em>
          </li>
          <li @click="toggleModal('gameState')">
            Game State JSON
            <em><font-awesome-icon icon="file-code"/></em>
          </li>
          <!-- Golem fork: the upstream Discord + source-code items are removed
               from the menu. Source availability (GPL) is carried by our public
               fork, credited on the intro screen. -->
        </template>
      </ul>
    </div>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import uiScript from "../assets/ui-script.png";
import uiVotes from "../assets/ui-votes.png";
import uiNight from "../assets/ui-night.png";
// FT-886: the chronicle's chat bubble — this game's live, running timeline
import uiChat from "../assets/ui-chat.png";
// the town-records quill — moved here from the chronicle 2026-08-19; the file
// is still named for its old home (ui-chronicle.png) but the drawing on it,
// a quill in an inkwell, is now the Town records door's mark. ui-records.png
// (the hourglass this replaced) is unused but stays in the tree.
import uiQuill from "../assets/ui-chronicle.png";
// FT-880: the town summons — the storyteller's press plays it here too, since
// the relay never echoes a message back to whoever sent it.
import { playCallBack, CALL_BACK_COOLDOWN } from "../golem/callBack";
// FT-890: leaving a town is one call, not a commit sequence copied per caller.
import { leaveTown } from "../golem/townRoute";
// FT-880: the index page's key lettering, shared so the menu's badges and the
// key list print a key the same way.
import KeyCap from "./KeyCap";

export default {
  components: { KeyCap },
  computed: {
    ...mapState([
      "grimoire",
      "session",
      "edition",
      "modals",
      "scriptDrawerView",
      "night"
    ]),
    ...mapState("players", ["players"]),
    /**
     * FT-860: the night-notes door. It appears only where the town's night
     * setting is "Everyone" AND this viewer holds a chair — the drawer behind
     * it shows that seat's own rows and nothing else. The storyteller has the
     * night sheet instead and never needs this.
     */
    showNightInfo() {
      if (this.night.mode !== "everyone") return false;
      if (!this.session.isSpectator) return false;
      return (
        this.session.claimedSeat >= 0 ||
        this.players.some(p => p.id && p.id === this.session.playerId)
      );
    },
    // the player strip is IN-GAME chrome — on the intro there is no script,
    // no votes and no night to look at (user call, 2026-08-18)
    inGame() {
      return !!this.session.sessionId || this.players.length > 0;
    }
  },
  data() {
    return {
      uiScript,
      uiVotes,
      uiNight,
      uiChat,
      uiQuill,
      // FT-880: the nervous-double-press guard, held locally the same way the
      // pill's Leave holds its two-click arm — it is about this one button's
      // feel, not about the town's state, so it does not belong in the store.
      callBackCooling: false,
      callBackTimer: null,
      // Golem fork: null = collapsed to the bare toolbar (the default).
      tab: null
    };
  },
  beforeDestroy() {
    clearTimeout(this.callBackTimer);
  },
  watch: {
    // The intro screen's "Menu" button flips the store flag the old gear used;
    // honour it by expanding the first section.
    "grimoire.isMenuOpen"(open) {
      if (open && this.tab === null) this.tab = "grimoire";
    }
  },
  methods: {
    // Click the open tab → collapse to the toolbar; click another → switch.
    setTab(name) {
      this.tab = this.tab === name ? null : name;
    },
    /**
     * FT-857: the strip's script + night icons open ONE drawer on their own
     * tab. Clicking the icon whose tab is already showing closes it, so each
     * icon still feels like a toggle.
     */
    openScriptDrawer(view) {
      if (this.modals.scriptDrawer && this.scriptDrawerView === view) {
        this.toggleModal("scriptDrawer");
        return;
      }
      this.$store.commit("setScriptDrawerView", view);
      if (!this.modals.scriptDrawer) this.toggleModal("scriptDrawer");
    },
    /**
     * FT-880: ring the town.
     *
     * Two things happen, and the second is not decoration: the mutation is
     * what travels (the socket plugin owns the storyteller-only guard on it),
     * and the local play is because the relay never sends a message back to
     * the client that sent it — without it the storyteller presses a button
     * and gets total silence, which is indistinguishable from a broken one.
     *
     * The guard here is a courtesy, not a defence: the real refusals are in
     * socket.js and the relay. This one just keeps a twitchy double-tap from
     * chopping the clip off at half a second and starting it again.
     */
    callTownBack() {
      if (this.session.isSpectator) return;
      if (this.callBackCooling) return;
      this.callBackCooling = true;
      this.callBackTimer = setTimeout(() => {
        this.callBackCooling = false;
      }, CALL_BACK_COOLDOWN);
      this.$store.commit("session/callBack");
      playCallBack(this.grimoire.isMuted);
    },
    setBackground() {
      const background = prompt("Enter custom background URL");
      if (background || background === "") {
        this.$store.commit("setBackground", background);
      }
    },
    hostSession() {
      if (this.session.sessionId) return;
      const sessionId = prompt(
        "Enter a channel number / name for your session",
        Math.round(Math.random() * 10000)
      );
      if (sessionId) {
        this.$store.commit("session/clearVoteHistory");
        this.$store.commit("session/setSpectator", false);
        this.$store.commit("session/setSessionId", sessionId);
        this.copySessionUrl();
      }
    },
    copySessionUrl() {
      const link = window.location.origin + "/" + this.session.sessionId;
      navigator.clipboard.writeText(link);
    },
    /**
     * Deal the assigned characters out to the seated players. No confirm:
     * starting the game IS the intent, and a native dialog is worse than
     * redundant here — driven and embedded contexts auto-dismiss it, which
     * returns false and silently swallows the deal (the same trap FT-852
     * hit on Leave). (user call 2026-08-18)
     */
    distributeRoles() {
      if (this.session.isSpectator) return;
      this.$store.commit("session/distributeRoles", true);
      setTimeout(
        (() => {
          this.$store.commit("session/distributeRoles", false);
        }).bind(this),
        2000
      );
    },
    imageOptIn() {
      const popup =
        "Are you sure you want to allow custom images? A malicious script file author might track your IP address this way.";
      if (this.grimoire.isImageOptIn || confirm(popup)) {
        this.toggleImageOptIn();
      }
    },
    joinSession() {
      if (this.session.sessionId) return this.leaveSession();
      let sessionId = prompt(
        "Enter the channel number / name of the session you want to join"
      );
      if (sessionId.match(/^https?:\/\//i)) {
        const hashAt = sessionId.indexOf("#");
        sessionId =
          hashAt >= 0
            ? sessionId.slice(hashAt + 1)
            : sessionId.replace(/^https?:\/\/[^/]+\/?/i, "").split(/[/?]/)[0];
      }
      if (sessionId) {
        this.$store.commit("session/clearVoteHistory");
        this.$store.commit("session/setSpectator", true);
        this.$store.commit("toggleGrimoire", false);
        this.$store.commit("session/setSessionId", sessionId);
      }
    },
    // FT-852: `confirmed === true` (the pill's own two-click arm) skips the
    // native confirm() — browser dialogs are silently auto-dismissed in
    // dialog-less contexts (driven browser panes, embeds), which returned
    // false and deadened the caller.
    leaveSession(confirmed) {
      if (
        confirmed === true ||
        confirm("Are you sure you want to leave the active live game?")
      ) {
        // Golem fork: ONE way out of a town, shared with a Back press and
        // with a relay-initiated close — leaveTown owns what leaving has to
        // take with it (seats, bluffs, fabled, any live nomination), because
        // clearing the session id alone leaves the sessionless in-person
        // square standing. An owned town re-loads its saved script when
        // re-hosted.
        leaveTown(this.$store);
      }
    },
    addPlayer() {
      if (this.session.isSpectator) return;
      if (this.players.length >= 20) return;
      const name = prompt("Player name");
      if (name) {
        this.$store.commit("players/add", name);
      }
    },
    randomizeSeatings() {
      if (this.session.isSpectator) return;
      if (confirm("Are you sure you want to randomize seatings?")) {
        this.$store.dispatch("players/randomize");
      }
    },
    clearPlayers() {
      if (this.session.isSpectator) return;
      if (confirm("Are you sure you want to remove all players?")) {
        // abort vote if in progress
        if (this.session.nomination) {
          this.$store.commit("session/nomination");
        }
        this.$store.commit("players/clear");
      }
    },
    clearRoles() {
      if (confirm("Are you sure you want to remove all player roles?")) {
        this.$store.dispatch("players/clearRoles");
      }
    },
    toggleNight() {
      this.$store.commit("toggleNight");
      if (this.grimoire.isNight) {
        this.$store.commit("session/setMarkedPlayer", -1);
      }
    },
    ...mapMutations([
      "toggleGrimoire",
      "toggleMenu",
      "toggleImageOptIn",
      "toggleMuted",
      "toggleNightOrder",
      "toggleStatic",
      "setZoom",
      "toggleModal"
    ])
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

// success animation
@keyframes greenToWhite {
  from {
    color: green;
  }
  to {
    color: white;
  }
}

// Controls
#controls {
  position: absolute;
  right: 3px;
  top: 3px;
  text-align: right;
  padding-right: 50px;
  z-index: 75;

  svg {
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 1));
    &.success {
      animation: greenToWhite 1s normal forwards;
      animation-iteration-count: 1;
    }
  }

  > span {
    display: inline-block;
    cursor: pointer;
    z-index: 5;
    margin-top: 7px;
    margin-left: 10px;
  }

  span.nomlog-summary {
    color: $townsfolk;
  }

  span.session {
    color: $demon;
    &.spectator {
      color: $townsfolk;
    }
    &.reconnecting {
      animation: blink 1s infinite;
    }
  }
}

@keyframes blink {
  50% {
    opacity: 0.5;
    color: gray;
  }
}

.menu {
  // Golem fork: no gear, no fold-away rotation — the tab row is a standing
  // toolbar; only the SECTION below it comes and goes.
  width: 220px;
  position: absolute;
  right: 0;
  top: 0;

  // collapsed = the strip alone: hug the icons instead of stretching them
  // across a 220px section width (user call — the gaps read as dead space)
  &.collapsed {
    width: auto;
  }

  a {
    color: white;
    text-decoration: none;
    &:hover {
      color: red;
    }
  }

  ul {
    display: flex;
    list-style-type: none;
    padding: 0;
    margin: 0;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 0 10px black;
    border: 3px solid black;
    border-radius: 10px 0 10px 10px;
    // Golem fork: collapsed = the toolbar alone, corners fully rounded.

    li {
      padding: 2px 5px;
      color: white;
      text-align: left;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 30px;

      &.tabs {
        display: flex;
        padding: 0;
        svg {
          flex-grow: 1;
          flex-shrink: 0;
          height: 35px;
          border-bottom: 3px solid black;
          border-right: 3px solid black;
          padding: 5px 0;
          cursor: pointer;
          transition: color 250ms;
          &:hover {
            color: red;
          }
          &:last-child {
            border-right: 0;
          }
        }
        &.grimoire .fa-book-open,
        &.players .fa-users,
        &.characters .fa-theater-masks,
        &.help .fa-question {
          background: linear-gradient(
            to bottom,
            $townsfolk 0%,
            rgba(0, 0, 0, 0.5) 100%
          );
        }
      }

      &:not(.headline):not(.tabs):hover {
        cursor: pointer;
        color: red;
      }

      em {
        flex-grow: 0;
        font-style: normal;
        margin-left: 10px;
        font-size: 80%;
      }
    }

    .headline {
      font-family: PiratesBay, sans-serif;
      letter-spacing: 1px;
      padding: 0 10px;
      text-align: center;
      justify-content: center;
      background: linear-gradient(
        to right,
        $townsfolk 0%,
        rgba(0, 0, 0, 0.5) 20%,
        rgba(0, 0, 0, 0.5) 80%,
        $demon 100%
      );
    }
  }
}
.menu ul li.player-strip {
  justify-content: center;
  gap: 10px;
  padding: 3px 10px;
  min-height: 0;
}
.player-strip img {
  width: 26px;
  height: 26px;
  cursor: pointer;
  filter: drop-shadow(0 1px 2px black);
}
/* THE STRIP IS ONE SET, not a row of PNGs with some icons after it.
   Two of the marks are our engraved art and two are Font Awesome, and the
   glyphs arrive already carrying `.tabs svg` from further up this file — 35px
   tall, 5px of vertical padding, black borders down two sides. That is the OLD
   tab treatment, and it out-specifies a plain `.player-strip svg`: measured,
   it stood the two new marks 26x35 beside the art's 26x26, and on a phone gave
   them a 29x48 tap box against the art's 42x42.

   Hence `li.tabs.player-strip` — the same row the old rule matches, named
   precisely enough to outrank it rather than tie with it on source order.
   Same 26px box, same shadow, same hover, so the eye reads four marks of one
   family and a finger finds four boxes of one size. */
.menu ul li.tabs.player-strip svg {
  width: 26px;
  height: 26px;
  flex-grow: 0;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  cursor: pointer;
  color: #e8e2d4;
  filter: drop-shadow(0 1px 2px black);
  transition: color 200ms, filter 200ms;
}
.menu ul li.tabs.player-strip svg:hover {
  color: #fff;
  filter: drop-shadow(0 1px 2px black) brightness(1.3);
}
/* Just-pressed: the bell steps back and stops taking clicks for the cooldown,
   so a second press has something to say no with that the storyteller can
   see. It does not vanish — a control that disappears under your finger reads
   as a fault, not as a wait. */
.menu ul li.tabs.player-strip svg.call-back.cooling {
  color: #7a736a;
  cursor: default;
  pointer-events: none;
}
/* The scroll and the gallows are the only two doors a PLAYER has in a running
   game — the script and the vote history — and they were 26px marks with no
   box around them. The art keeps its size; the box a finger has to find grows
   under it. */
@media (pointer: coarse) {
  .menu ul li.player-strip {
    gap: 4px;
    padding: 0 4px;
  }
  .player-strip img,
  .menu ul li.tabs.player-strip svg {
    box-sizing: content-box;
    padding: 8px;
  }
}
.player-strip img:hover {
  filter: drop-shadow(0 1px 2px black) brightness(1.3);
}
</style>
