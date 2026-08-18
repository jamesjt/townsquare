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
    <!-- Golem fork (FT-852): the dial's CLOCKTOWER letters are static DOM
         now, not baked into the art — positions are plain numbers in
         image-pixels (see --fpx below), adjustable in devtools and scaling
         with the clock face at every viewport. -->
    <!-- click any dial letter to cycle ITS font (independent of the title's;
         "text" = the painted spans) -->
    <div
      class="dial-letters"
      title="Click to change the dial's lettering"
      @click="cycleDial"
    >
      <span
        v-for="d in dialLetters"
        :key="d.cls + fontState.dialKey"
        :class="['dl', d.cls]"
      >
        <img
          v-if="fontState.dialKey !== 'text' && dialGlyph(d.letter)"
          :src="dialGlyph(d.letter).src"
          :style="dialStyle(d.letter)"
          :alt="d.letter"
        />
        <template v-else>{{ d.letter }}</template>
      </span>
    </div>
    <transition name="blur">
      <!-- Golem fork: while the host is BUILDING (hosting, roles undealt) the
           town centre is the tools panel — from zero seats up. TownInfo
           returns once the game starts; Intro ONLY when sessionless (FT-852:
           a player in a session always sees the live town square — seats
           appear as the host adds them; no waiting screen). -->
      <HostTools
        v-if="showHostTools && !session.nomination"
      ></HostTools>
      <Intro
        ref="intro"
        v-else-if="!session.sessionId && !players.length"
      ></Intro>
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
      <!-- (broadcast icon retired — user call 2026-08-17) -->
      <span
        class="who"
        :class="{ reconnecting: session.isReconnecting }"
        :title="session.ping ? session.ping + 'ms latency' : ''"
      >
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
      <!-- FT-850: TOWN RECORDS — the pill's stats door, open to anyone in
           the session. -->
      <span
        class="stats"
        @click="statsOpen = true"
        title="Town records"
      >
        <font-awesome-icon icon="chart-bar" />
      </span>
      <!-- FT-850: once the host has dealt characters, the game can END here —
           pick the winner, the record lands on the golem server. Gated on the
           stashed deal moment (upstream's isRolesDistributed is a 2s pulse,
           not a durable flag). -->
      <span
        class="endgame"
        v-if="!session.isSpectator && dealAt"
        @click="endGameOpen = true"
        title="End the game and record who won"
      >
        <font-awesome-icon icon="flag-checkered" /> End game
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
      <!-- FT-852: two-click arm instead of a native confirm() — browser
           dialogs are silently auto-dismissed in dialog-less contexts
           (driven browser panes, embeds), which made this control read as
           dead. First click arms for 3s, second click leaves. -->
      <!-- the door out wears a DOOR, not an X (user call 2026-08-17) -->
      <span
        class="leave"
        :class="{ armed: leaveArmed }"
        @click="pillLeave"
        :title="leaveArmed ? 'Click again to confirm' : 'Leave this town'"
      >
        <font-awesome-icon icon="door-open" />
        {{ leaveArmed ? "Sure?" : "Leave" }}
      </span>
    </div>
    <!-- FT-850: game recording + town records (see the components). -->
    <EndGameOverlay
      v-if="endGameOpen"
      @close="endGameOpen = false"
      @recorded="dealAt = null"
    />
    <StatsOverlay
      v-if="statsOpen"
      :town-id="session.sessionId"
      @close="statsOpen = false"
    />
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
import EndGameOverlay from "./components/EndGameOverlay";
import StatsOverlay from "./components/StatsOverlay";
import { markDealt, dealTimeFor } from "./golem/stats";
import { flashHint } from "./golem/hint";
// the dial's CLOCKTOWER can wear any glyph family (its own choice)
import {
  fontState,
  glyphFrom,
  glyphStyleFrom,
  cycleDialFont
} from "./golem/titleFonts";

export default {
  components: {
    EndGameOverlay,
    StatsOverlay,
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
  // FT-850: hosting or joining a (different) session re-reads that session's
  // stashed deal moment and drops any overlay left open from the last one.
  watch: {
    "session.sessionId"(sessionId) {
      this.dealAt = dealTimeFor(sessionId);
      this.endGameOpen = false;
      this.statsOpen = false;
      clearTimeout(this.leaveTimer);
      this.leaveArmed = false;
    }
  },
  mounted() {
    // Golem fork: the scrollbar's dried-blood TRAIL — every scroll container
    // remembers the furthest its thumb has traveled via --sb-trail, which
    // its ::-webkit-scrollbar-track gradient reads. Capture phase catches
    // scrolls on ANY element; static paint, so the kill-switch is moot.
    document.addEventListener(
      "scroll",
      e => {
        const el = e.target;
        if (!(el instanceof Element)) return;
        const max = el.scrollHeight - el.clientHeight;
        if (max <= 0) return;
        const reached = Math.min(
          100,
          Math.round(((el.scrollTop + el.clientHeight * 0.6) / el.scrollHeight) * 100)
        );
        const prev = parseFloat(el.style.getPropertyValue("--sb-trail")) || 0;
        if (reached > prev) el.style.setProperty("--sb-trail", reached + "%");
        // a droplet breaks off the thumb while scrolling (throttled per
        // element; skipped under the animation kill-switch)
        if (!this.grimoire.isStatic && max > 40) {
          const now = performance.now();
          if (!el.__lastDrip || now - el.__lastDrip > 600) {
            el.__lastDrip = now;
            const rect = el.getBoundingClientRect();
            const ratio = (el.scrollTop + el.clientHeight) / el.scrollHeight;
            const drop = document.createElement("div");
            drop.className = "blood-droplet";
            drop.style.left = rect.right - 7 + "px";
            drop.style.top = rect.top + ratio * rect.height - 12 + "px";
            document.body.appendChild(drop);
            const anim = drop.animate(
              [
                { transform: "translateY(0) scale(1)", opacity: 0.9 },
                { transform: "translateY(64px) scale(0.85)", opacity: 0 }
              ],
              { duration: 650, easing: "cubic-bezier(0.5, 0, 0.9, 0.6)" }
            );
            anim.onfinish = () => drop.remove();
            setTimeout(() => drop.remove(), 900); // belt for a frozen pane
          }
        }
      },
      true
    );
    // FT-850: the DEAL MOMENT — the host committing session/distributeRoles
    // with a truthy payload is the instant the characters go out. Stash it
    // (the recorded game's startedAt) and mirror it reactively so the pill
    // grows its End-game door; localStorage alone wouldn't re-render.
    this.$store.subscribe(({ type, payload }) => {
      if (
        type === "session/distributeRoles" &&
        payload &&
        !this.session.isSpectator
      ) {
        markDealt(this.session.sessionId);
        this.dealAt = dealTimeFor(this.session.sessionId);
      }
    });
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
      pillCopied: false,
      // FT-850: game recording + stats state. dealAt mirrors the stashed
      // deal moment for the current session (null = no game underway) — a
      // reload mid-game re-reads it here (persistence has already restored
      // the session by the time the root component's data runs).
      endGameOpen: false,
      statsOpen: false,
      dealAt: dealTimeFor(this.$store.state.session.sessionId),
      // FT-852: the pill Leave's two-click arm.
      leaveArmed: false,
      leaveTimer: null,
      // the app-wide PNG-font state (dial lettering lives on dialKey)
      fontState,
      dialLetters: [
        { cls: "dl-c1", letter: "C" },
        { cls: "dl-l", letter: "L" },
        { cls: "dl-o1", letter: "O" },
        { cls: "dl-c2", letter: "C" },
        { cls: "dl-k", letter: "K" },
        { cls: "dl-t", letter: "T" },
        { cls: "dl-o2", letter: "O" },
        { cls: "dl-w", letter: "W" },
        { cls: "dl-e", letter: "E" },
        { cls: "dl-r", letter: "R" }
      ]
    };
  },
  methods: {
    // FT-852: arm on the first click, leave on the second — no native
    // confirm() anywhere in the pill (see the template note).
    // ── the dial's font control ──────────────────────────────────────────
    cycleDial() {
      const next = cycleDialFont();
      flashHint("Dial lettering: " + next.label);
    },
    dialGlyph(letter) {
      return glyphFrom(this.fontState.dialKey, letter);
    },
    dialStyle(letter) {
      return glyphStyleFrom(this.fontState.dialKey, letter, 1);
    },
    pillLeave() {
      if (!this.leaveArmed) {
        this.leaveArmed = true;
        this.leaveTimer = setTimeout(() => {
          this.leaveArmed = false;
        }, 3000);
        return;
      }
      clearTimeout(this.leaveTimer);
      this.leaveArmed = false;
      this.$refs.menu.leaveSession(true);
    },
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
          // Golem fork: sessionless, A opens the Almanac (the third door);
          // in-session it keeps upstream's meaning — add player.
          if (!this.session.sessionId && this.$refs.intro) {
            this.$refs.intro.openCreate();
          } else {
            this.$refs.menu.addPlayer();
          }
          break;
        case "h":
          // Golem fork: sessionless routes to the SAME panel the Host door
          // opens (Intro.openHost) — the legacy prompt() path only remains
          // reachable in-session, where it's already a no-op (guarded).
          if (this.session.sessionId) this.$refs.menu.hostSession();
          else if (this.$refs.intro) this.$refs.intro.openHost();
          break;
        case "j":
          // Golem fork: sessionless → Intro.openJoin (the Join door's own
          // panel). In-session, unchanged — joinSession() drives the leave
          // flow there.
          if (this.session.sessionId) this.$refs.menu.joinSession();
          else if (this.$refs.intro) this.$refs.intro.openJoin();
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
          // In-session: the roles modal, as upstream. (The sessionless
          // Almanac moved to the A key with the door's rename.)
          if (!this.session.sessionId) break;
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

// Golem fork: BLOOD SCROLLBARS — a thin black strip, the indicator a run of
// blood that beads at its lower end. The thumb clips its own paint, so the
// "drip" is a bead inside the pill: a long dark-to-bright run, a bright
// gathering at the bottom, and a drop-shaped tail via asymmetric radii.
// Firefox only — in Chromium the standard property WINS over the webkit
// pseudo-elements and would flatten the blood paint to a plain thin bar.
@supports not selector(::-webkit-scrollbar) {
  * {
    scrollbar-width: thin;
    scrollbar-color: #8a1010 #000;
  }
}
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
// The track remembers where the drop has been: a dried-blood TRAIL from the
// top down to the furthest point scrolled (--sb-trail, written by the
// capture-phase scroll listener in mounted()).
::-webkit-scrollbar-track {
  background: linear-gradient(
    to bottom,
    #2c0707 0,
    #1c0404 var(--sb-trail, 0%),
    #000 var(--sb-trail, 0%)
  );
}
// The thumb IS the drop now: a glassy crimson column ending in a real
// baked teardrop tip (the image's transparent corners let the track show,
// so the point reads as a hanging drop, not a squared bar).
::-webkit-scrollbar-thumb {
  background:
    url("assets/blood/scroll-tip.png") no-repeat bottom center / 100% auto,
    linear-gradient(
        to right,
        rgba(255, 255, 255, 0.28),
        rgba(255, 255, 255, 0.05) 40%,
        rgba(0, 0, 0, 0.15) 90%
      )
      no-repeat top center / 100% calc(100% - 16px),
    linear-gradient(to bottom, #4a0606, #9c1010 40%, #b01616)
      no-repeat top center / 100% calc(100% - 16px);
  border-radius: 4px 4px 0 0;
  min-height: 44px;
}
::-webkit-scrollbar-thumb:hover {
  background:
    url("assets/blood/scroll-tip.png") no-repeat bottom center / 100% auto,
    linear-gradient(
        to right,
        rgba(255, 255, 255, 0.35),
        rgba(255, 255, 255, 0.08) 40%,
        rgba(0, 0, 0, 0.12) 90%
      )
      no-repeat top center / 100% calc(100% - 16px),
    linear-gradient(to bottom, #5a0707, #b41414 40%, #c92020)
      no-repeat top center / 100% calc(100% - 16px);
}

// The blood-drip OVERLAY scrollbar (v-blood-scroll): the native bar hides,
// the drop art takes over. The track is click-transparent; only the drop
// itself drags.
.blooddrip-host {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
.blooddrip-track {
  position: absolute;
  width: 20px;
  pointer-events: none;
  z-index: 6;
  .blooddrip-trail {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 7px;
    height: 0;
    overflow: hidden;
    background-repeat: repeat-y;
    background-position: center top;
    background-size: 100% auto;
    opacity: 0.9;
  }
  .blooddrip-drop {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: auto;
    cursor: grab;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.6));
    &:active {
      cursor: grabbing;
    }
  }
}

// A droplet breaks off and falls as you scroll (spawned by the listener in
// mounted(); respects the animation kill-switch).
.blood-droplet {
  position: fixed;
  width: 5px;
  height: 9px;
  background: radial-gradient(ellipse at 50% 35%, #d42020, #7a0909);
  border-radius: 50% 50% 60% 60% / 40% 40% 70% 70%;
  z-index: 90;
  pointer-events: none;
}
::-webkit-scrollbar-corner {
  background: #000;
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
  .stats,
  .endgame,
  .copylink,
  .leave {
    cursor: pointer;
    &:hover {
      color: red;
    }
  }
  // FT-852: the armed Leave reads as the question it is.
  .leave.armed {
    color: red;
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

/* Golem fork (FT-852): one face-pixel — the unit the background's cover fit
   actually draws at. The art is 1672×941 with the dial centered at
   image (851,450); every dial-anchored element positions in these units so
   it rides the face at any viewport. Adjust letters by editing the plain
   numbers below (they are image pixels). */
#app {
  /* container units so the face math reads the SAME box the background
     paints in — mobile browser bars make vh lie; cqh doesn't. */
  container-type: size;
  --fpx: max(0.05981cqw, 0.10627cqh);
  /* the door stack's unit: face-proportional but CAPPED so the cover-fit
     zoom on portrait phones can't balloon the buttons. */
  --dfpx: min(var(--fpx), 0.145vmin);
}
#app > .dial-letters {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  font-family: "Times New Roman", Times, serif;
  font-weight: bold;
  font-size: calc(82 * var(--fpx));
  color: #0a0502;
  text-shadow: 0 calc(2 * var(--fpx)) calc(3 * var(--fpx)) rgba(0, 0, 0, 0.55);
  .dl {
    position: absolute;
    transform: translate(-50%, -50%);
    line-height: 1;
    /* only the letters themselves take the font-cycling click */
    pointer-events: auto;
    cursor: pointer;
    img {
      /* glyph mode: no painted-text shadow double-up */
      filter: drop-shadow(0 calc(2 * var(--fpx)) calc(3 * var(--fpx)) rgba(0, 0, 0, 0.45));
    }
  }
  /* hour positions on the measured tick rays (image px from viewport
     center, dial center offset +15,-20.5 already folded in) */
  .dl-c1 { left: calc(50% + 96.9 * var(--fpx)); top: calc(50% + -172.6 * var(--fpx)); }
  .dl-l  { left: calc(50% + 163.3 * var(--fpx)); top: calc(50% + -117.4 * var(--fpx)); }
  .dl-o1 { left: calc(50% + 177.5 * var(--fpx)); top: calc(50% + -34.0 * var(--fpx)); }
  .dl-c2 { left: calc(50% + 156.1 * var(--fpx)); top: calc(50% + 47.5 * var(--fpx)); }
  .dl-k  { left: calc(50% + 105.0 * var(--fpx)); top: calc(50% + 109.0 * var(--fpx)); }
  .dl-t  { left: calc(50% + -85.4 * var(--fpx)); top: calc(50% + 111.7 * var(--fpx)); }
  .dl-o2 { left: calc(50% + -139.5 * var(--fpx)); top: calc(50% + 47.4 * var(--fpx)); }
  .dl-w  { left: calc(50% + -162.5 * var(--fpx)); top: calc(50% + -33.5 * var(--fpx)); }
  .dl-e  { left: calc(50% + -141.5 * var(--fpx)); top: calc(50% + -117.2 * var(--fpx)); }
  .dl-r  { left: calc(50% + -82.5 * var(--fpx)); top: calc(50% + -176.6 * var(--fpx)); }
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
