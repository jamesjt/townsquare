<template>
  <div
    id="app"
    @keyup="keyup"
    tabindex="-1"
    :class="{
      night: grimoire.isNight,
      static: grimoire.isStatic,
      booting: !booted
    }"
    :style="{
      backgroundImage: grimoire.background
        ? `url('${grimoire.background}')`
        : ''
    }"
  >
    <video
      id="background"
      v-if="grimoire.background && grimoire.background.match(/\.(mp4|webm)$/i)"
      :src="grimoire.background"
      autoplay
      loop
    ></video>
    <div class="backdrop"></div>
    <transition name="blur">
      <!-- Golem fork: while the host is BUILDING (hosting, roles undealt) the
           town centre is the tools panel — from zero seats up. TownInfo
           returns once the game starts; Intro only when nothing is happening
           at all. -->
      <HostTools
        v-if="showHostTools && !session.nomination"
      ></HostTools>
      <Intro v-else-if="!players.length"></Intro>
      <TownInfo
        v-else-if="!session.nomination"
      ></TownInfo>
      <Vote v-if="session.nomination"></Vote>
    </transition>
    <TownSquare></TownSquare>
    <Menu ref="menu"></Menu>
    <!-- FT-847: ref'd so Intro can auto-load an owned town's saved script
         through the same vault path as a ?script= link. -->
    <EditionModal ref="edition" />
    <FabledModal />
    <RolesModal />
    <ReferenceModal />
    <NightOrderModal />
    <VoteHistoryModal />
    <GameStateModal />
    <Gradients />
    <!-- Golem fork: the version corner is the SESSION PILL — which room you
         are in, who is with you, the vote-history count, and the door out.
         Nothing renders when there is no session. -->
    <div id="session-pill" v-if="session.sessionId">
      <span
        class="who"
        :class="{ reconnecting: session.isReconnecting }"
        :title="session.ping ? session.ping + 'ms latency' : ''"
      >
        <font-awesome-icon icon="broadcast-tower" />
        {{ session.isSpectator ? "Playing in" : "Hosting" }}
        <b>{{ session.sessionId }}</b>
        · {{ session.playerCount }} {{ session.playerCount === 1 ? "player" : "players" }}
      </span>
      <span
        class="nomlog"
        v-if="session.voteHistory.length"
        @click="$store.commit('toggleModal', 'voteHistory')"
        :title="session.voteHistory.length + ' recent nominations'"
      >
        <font-awesome-icon icon="book-dead" /> {{ session.voteHistory.length }}
      </span>
      <!-- FT-847 follow-up: the toolbar's "Copy player link" retired with the
           broadcast-tower tab — it wasn't otherwise covered, so it relocates
           here rather than dropping. -->
      <span
        class="copylink"
        @click="copyPillLink"
        :title="pillCopied ? 'Copied!' : 'Copy the player link'"
      >
        <font-awesome-icon :icon="pillCopied ? 'check' : 'copy'" />
      </span>
      <span class="leave" @click="$refs.menu.leaveSession()" title="Leave this session">
        <font-awesome-icon icon="times-circle" /> Leave
      </span>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { version } from "../package.json";
import TownSquare from "./components/TownSquare";
import TownInfo from "./components/TownInfo";
import HostTools from "./components/HostTools";
import Menu from "./components/Menu";
import RolesModal from "./components/modals/RolesModal";
import EditionModal from "./components/modals/EditionModal";
import Intro from "./components/Intro";
import ReferenceModal from "./components/modals/ReferenceModal";
import Vote from "./components/Vote";
import Gradients from "./components/Gradients";
import NightOrderModal from "./components/modals/NightOrderModal";
import FabledModal from "@/components/modals/FabledModal";
import VoteHistoryModal from "@/components/modals/VoteHistoryModal";
import GameStateModal from "@/components/modals/GameStateModal";

export default {
  components: {
    GameStateModal,
    VoteHistoryModal,
    FabledModal,
    NightOrderModal,
    Vote,
    ReferenceModal,
    Intro,
    TownInfo,
    HostTools,
    TownSquare,
    Menu,
    EditionModal,
    RolesModal,
    Gradients
  },
  computed: {
    ...mapState(["grimoire", "session"]),
    ...mapState("players", ["players"]),
    // Golem fork: the building phase = hosting live, roles not yet dealt.
    showHostTools() {
      return (
        !!this.session.sessionId &&
        !this.session.isSpectator &&
        !this.session.isRolesDistributed
      );
    }
  },
  // Golem fork: THE BOOT GATE — the ordering the user asked for, literally:
  // background first, fonts second, content third. The UI stays hidden (dark
  // ground only) until the background art AND the display fonts are ready,
  // then fades in whole. A 4s cap means a slow network degrades to the old
  // progressive load rather than an indefinite blank.
  mounted() {
    const bg = new Promise(resolve => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = require("./assets/background-clocktower.png");
    });
    const fonts = Promise.all([
      document.fonts.load("1em PiratesBay"),
      document.fonts.load("1em Bloody"),
      document.fonts.ready
    ]).catch(() => {});
    const cap = new Promise(resolve => setTimeout(resolve, 4000));
    Promise.race([Promise.all([bg, fonts]), cap]).then(() => {
      this.booted = true;
    });
  },
  data() {
    return {
      booted: false,
      version,
      pillCopied: false
    };
  },
  methods: {
    copyPillLink() {
      this.$refs.menu.copySessionUrl();
      this.pillCopied = true;
      setTimeout(() => {
        this.pillCopied = false;
      }, 1500);
    },
    keyup({ key, ctrlKey, metaKey, target }) {
      if (ctrlKey || metaKey) return;
      // Golem fork: keys typed into a field are typing, not hotkeys.
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      switch (key.toLocaleLowerCase()) {
        case "g":
          this.$store.commit("toggleGrimoire");
          break;
        case "a":
          this.$refs.menu.addPlayer();
          break;
        case "h":
          this.$refs.menu.hostSession();
          break;
        case "j":
          this.$refs.menu.joinSession();
          break;
        case "r":
          this.$store.commit("toggleModal", "reference");
          break;
        case "n":
          this.$store.commit("toggleModal", "nightOrder");
          break;
        case "e":
          if (this.session.isSpectator) return;
          this.$store.commit("toggleModal", "edition");
          break;
        case "c":
          if (this.session.isSpectator) return;
          this.$store.commit("toggleModal", "roles");
          break;
        case "v":
          if (this.session.voteHistory.length || !this.session.isSpectator) {
            this.$store.commit("toggleModal", "voteHistory");
          }
          break;
        case "s":
          if (this.session.isSpectator) return;
          this.$refs.menu.toggleNight();
          break;
        case "escape":
          this.$store.commit("toggleModal");
      }
    }
  }
};
</script>

<style lang="scss">
@import "vars";

@font-face {
  font-family: "Papyrus";
  src: url("assets/fonts/papyrus.eot"); /* IE9*/
  src: url("assets/fonts/papyrus.eot?#iefix") format("embedded-opentype"),
    /* IE6-IE8 */ url("assets/fonts/papyrus.woff2") format("woff2"),
    /* chrome firefox */ url("assets/fonts/papyrus.woff") format("woff"),
    /* chrome firefox */ url("assets/fonts/papyrus.ttf") format("truetype"),
    /* chrome firefox opera Safari, Android, iOS 4.2+*/
      url("assets/fonts/papyrus.svg#PapyrusW01") format("svg"); /* iOS 4.1- */
}

@font-face {
  font-family: PiratesBay;
  src: url("assets/fonts/piratesbay.ttf");
  font-display: swap;
}

html,
body {
  font-size: 1.2em;
  line-height: 1.4;
  // Golem fork: our clocktower art is the shipped default (upstream's
  // background.jpg stays in the tree untouched).
  // The dark ground paints FIRST — while the 2.3MB art is still downloading,
  // the page reads as night instead of flashing white behind the intro.
  background: #0b0d12 url("assets/background-clocktower.png") center center;
  background-size: cover;
  color: white;
  height: 100%;
  font-family: "Roboto Condensed", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

@import "media";

* {
  box-sizing: border-box;
  position: relative;
}

a {
  color: $townsfolk;
  &:hover {
    color: $demon;
  }
}

h1,
h2,
h3,
h4,
h5 {
  margin: 0;
  text-align: center;
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  font-weight: normal;
}

ul {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

#app {
  height: 100%;

  // Golem fork: the boot gate — children stay invisible until the background
  // art and display fonts are ready, then fade in together. Until then the
  // dark body ground is all that shows.
  > * {
    transition: opacity 400ms ease-in;
  }
  &.booting > * {
    opacity: 0 !important;
  }

  background-position: center center;
  background-size: cover;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;

  // disable all animations
  &.static *,
  &.static *:after,
  &.static *:before {
    transition: none !important;
    animation: none !important;
  }
}

#session-pill {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 80;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  border: 3px solid black;
  border-radius: 10px;
  box-shadow: 0 0 10px black;
  font-size: 80%;

  b {
    color: #c00;
  }
  .who.reconnecting {
    animation: blink 1s infinite;
  }
  .nomlog,
  .copylink,
  .leave {
    cursor: pointer;
    &:hover {
      color: red;
    }
  }
}

@keyframes blink {
  50% {
    opacity: 0.3;
  }
}

.blur-enter-active,
.blur-leave-active {
  transition: all 250ms;
  filter: blur(0);
}
.blur-enter,
.blur-leave-to {
  opacity: 0;
  filter: blur(20px);
}

// Buttons
.button-group {
  display: flex;
  align-items: center;
  justify-content: center;
  align-content: center;
  .button {
    margin: 5px 0;
    border-radius: 0;
    &:first-child {
      border-top-left-radius: 15px;
      border-bottom-left-radius: 15px;
    }
    &:last-child {
      border-top-right-radius: 15px;
      border-bottom-right-radius: 15px;
    }
  }
}
.button {
  padding: 0;
  border: solid 0.125em transparent;
  border-radius: 15px;
  box-shadow: inset 0 1px 1px #9c9c9c, 0 0 10px #000;
  background: radial-gradient(
        at 0 -15%,
        rgba(#fff, 0.07) 70%,
        rgba(#fff, 0) 71%
      )
      0 0/ 80% 90% no-repeat content-box,
    linear-gradient(#4e4e4e, #040404) content-box,
    linear-gradient(#292929, #010101) border-box;
  color: white;
  font-weight: bold;
  text-shadow: 1px 1px rgba(0, 0, 0, 0.5);
  line-height: 170%;
  margin: 5px auto;
  cursor: pointer;
  transition: all 200ms;
  white-space: nowrap;
  &:hover {
    color: red;
  }
  &.disabled {
    color: gray;
    cursor: default;
    opacity: 0.75;
  }
  &:before,
  &:after {
    content: " ";
    display: inline-block;
    width: 10px;
    height: 10px;
  }
  &.townsfolk {
    background: radial-gradient(
          at 0 -15%,
          rgba(255, 255, 255, 0.07) 70%,
          rgba(255, 255, 255, 0) 71%
        )
        0 0/80% 90% no-repeat content-box,
      linear-gradient(#0031ad, rgba(5, 0, 0, 0.22)) content-box,
      linear-gradient(#292929, #001142) border-box;
    box-shadow: inset 0 1px 1px #002c9c, 0 0 10px #000;
    &:hover:not(.disabled) {
      color: #008cf7;
    }
  }
  &.demon {
    background: radial-gradient(
          at 0 -15%,
          rgba(255, 255, 255, 0.07) 70%,
          rgba(255, 255, 255, 0) 71%
        )
        0 0/80% 90% no-repeat content-box,
      linear-gradient(#ad0000, rgba(5, 0, 0, 0.22)) content-box,
      linear-gradient(#292929, #420000) border-box;
    box-shadow: inset 0 1px 1px #9c0000, 0 0 10px #000;
  }
}

/* video background */
video#background {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Night phase backdrop */
#app > .backdrop {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  pointer-events: none;
  background: black;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 1) 0%,
    rgba(1, 22, 46, 1) 50%,
    rgba(0, 39, 70, 1) 100%
  );
  opacity: 0;
  transition: opacity 1s ease-in-out;
  &:after {
    content: " ";
    display: block;
    width: 100%;
    padding-right: 2000px;
    height: 100%;
    background: url("assets/clouds.png") repeat;
    background-size: 2000px auto;
    animation: move-background 120s linear infinite;
    opacity: 0.3;
  }
}

@keyframes move-background {
  from {
    transform: translate3d(-2000px, 0px, 0px);
  }
  to {
    transform: translate3d(0px, 0px, 0px);
  }
}

#app.night > .backdrop {
  opacity: 0.5;
}
</style>
