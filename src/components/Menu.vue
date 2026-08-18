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
        <li class="tabs player-strip" :class="tab">
          <img
            :src="uiScript"
            title="The script (reference sheet)"
            @click="toggleModal('reference')"
          />
          <img
            :src="uiVotes"
            title="Vote history"
            @click="toggleModal('voteHistory')"
          />
          <img
            :src="uiNight"
            title="Night order"
            @click="toggleModal('nightOrder')"
          />
        </li>

        <template v-if="tab === 'grimoire'">
          <!-- Grimoire -->
          <li class="headline">Grimoire</li>
          <li @click="toggleGrimoire" v-if="players.length">
            <template v-if="!grimoire.isPublic">Hide</template>
            <template v-if="grimoire.isPublic">Show</template>
            <em>[G]</em>
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
          <li @click="toggleModal('reference')">
            Reference Sheet
            <em>[R]</em>
          </li>
          <li @click="toggleModal('nightOrder')">
            Night Order Sheet
            <em>[N]</em>
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

export default {
  computed: {
    ...mapState(["grimoire", "session", "edition"]),
    ...mapState("players", ["players"])
  },
  data() {
    return {
      uiScript,
      uiVotes,
      uiNight,
      // Golem fork: null = collapsed to the bare toolbar (the default).
      tab: null
    };
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
    distributeRoles() {
      if (this.session.isSpectator) return;
      const popup =
        "Do you want to distribute assigned characters to all SEATED players?";
      if (confirm(popup)) {
        this.$store.commit("session/distributeRoles", true);
        setTimeout(
          (() => {
            this.$store.commit("session/distributeRoles", false);
          }).bind(this),
          2000
        );
      }
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
        this.$store.commit("session/setSpectator", false);
        this.$store.commit("session/setSessionId", "");
        // Golem fork: leaving a town takes the town off the screen — clear
        // the local mirror (seats, bluffs, fabled, any live nomination) so
        // the intro returns instead of the sessionless in-person square.
        // An owned town re-loads its saved script when re-hosted.
        this.$store.commit("session/nomination");
        this.$store.commit("players/setBluff");
        this.$store.commit("players/setFabled", { fabled: [] });
        this.$store.commit("players/clear");
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
.player-strip img {
  width: 26px;
  height: 26px;
  cursor: pointer;
  filter: drop-shadow(0 1px 2px black);
}
.player-strip img:hover {
  filter: drop-shadow(0 1px 2px black) brightness(1.3);
}
</style>
