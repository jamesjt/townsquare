<template>
  <div
    id="app"
    @keyup="keyup"
    tabindex="-1"
    :class="{
      night: grimoire.isNight,
      static: grimoire.isStatic,
      booting: !booted,
      'in-game': inGame
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
    <!-- the dial's two words each wear their own font (the Aa panel,
         top-left, is the control) -->
    <div class="dial-letters" aria-hidden="true" v-if="!inGame">
      <span
        v-for="d in dialLetters"
        :key="d.cls + wordKey(d)"
        :class="['dl', d.cls]"
      >
        <img
          v-if="wordKey(d) !== 'text' && dialGlyph(d)"
          :src="dialGlyph(d).src"
          :style="dialStyle(d)"
          :alt="d.letter"
        />
        <template v-else>{{ d.letter }}</template>
      </span>
    </div>
    <!-- the FONT LAB: the dev dropdown that owns every lettering choice -->
    <!-- the DRIP LAB (Dr): the user's own dials for the blood scrollbar -->
    <div id="drip-lab" :class="{ open: drOpen }">
      <div class="fd-toggle" title="Drip lab" @click="drOpen = !drOpen">Dr</div>
      <div class="dr-rows" v-if="drOpen">
        <div class="dr-row" v-for="d in drDials" :key="d.key">
          <span class="dr-label">{{ d.label }}</span>
          <input
            type="range"
            :min="d.min"
            :max="d.max"
            :step="d.step"
            v-model.number="dripRef[d.key]"
            @input="saveDrip"
          />
          <span class="dr-val">{{ dripRef[d.key] }}</span>
        </div>
        <button class="dr-reset" @click="resetDrip">Reset</button>
      </div>
    </div>
    <!-- dev labs hidden for now (user call 2026-08-18) — flip devLabs -->
    <div id="font-debug" :class="{ open: fontDebugOpen }" v-if="devLabs">
      <div class="fd-toggle" title="Font lab" @click="fontDebugOpen = !fontDebugOpen">
        Aa
      </div>
      <div class="fd-rows" v-if="fontDebugOpen">
        <div class="fd-row" v-for="row in fdRows" :key="row.field">
          <span class="fd-label">{{ row.label }}</span>
          <button class="fd-cycle" @click="fdCycle(row.field)">
            {{ fdLabel(row.field) }}
          </button>
        </div>
      </div>
      <div class="fd-toggle ik-toggle" title="Engraver lab" @click="toggleIkLab">
        Ik
      </div>
      <div class="ik-panel" v-if="ikOpen">
        <div class="ik-previews">
          <div class="ik-pair" v-for="p in ikPreviews" :key="p.key">
            <img :src="p.ours" alt="" />
            <img :src="p.official" alt="" />
            <span>{{ p.key }}</span>
          </div>
        </div>
        <div class="ik-row" v-for="d in ikDials" :key="d.key">
          <span class="ik-label">{{ d.label }}</span>
          <input
            type="range"
            :min="d.min"
            :max="d.max"
            :step="d.step"
            v-model.number="engraverRef[d.key]"
            @change="onIkDial"
          />
          <span class="ik-val">{{ engraverRef[d.key] }}</span>
        </div>
        <div class="ik-acts">
          <button @click="ikReroll">Re-roll</button>
          <button @click="ikReset">Reset</button>
        </div>
      </div>
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
    <!-- FT-854: the role DRAWER + its grimoire tab (host, town on table) -->
    <RoleDrawer />
    <div
      class="drawer-tab"
      v-if="!session.isSpectator && players.length"
      :class="{ open: modals.roleDrawer }"
      :title="modals.roleDrawer ? 'Close the grimoire' : 'Open the grimoire'"
      @click="$store.commit('toggleModal', 'roleDrawer')"
    >
      <!-- OUR grimoire art (engraver-baked library books), not FA -->
      <img
        class="tab-book"
        :src="modals.roleDrawer ? grimoireOpen : grimoireClosed"
        alt="Grimoire"
      />
    </div>
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
        <font-awesome-icon :icon="pillCopied ? 'check' : 'link'" />
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
import RoleDrawer from "./components/RoleDrawer";
import { dripKnobs, saveDripKnobs, resetDripKnobs } from "./golem/bloodScrollbar";
import grimoireClosed from "./assets/grimoire-cover.png";
import grimoireOpen from "./assets/grimoire-open.png";
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
// the FONT LAB: per-element lettering choices (title, on-the, the dial's
// two words, the drop-caps)
import {
  fontState,
  glyphFrom,
  glyphStyleFrom,
  cycleField,
  labelFor
} from "./golem/titleFonts";
// the ENGRAVER LAB (Ik): the icon stylizer's dials, dragged live against
// official reference icons (the library chunk loads on first open)
import {
  engraver,
  ENGRAVER_DIALS,
  saveEngraver,
  resetEngraver
} from "./golem/iconStyle";
import ikRefGood from "./assets/icons/ravenkeeper.png";
import ikRefEvil from "./assets/icons/imp.png";

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
    RoleDrawer,
    Gradients
  },
  computed: {
    ...mapState(["grimoire", "session", "modals"]),
    ...mapState("players", ["players"]),
    // in a session (or with a town on the table): the dial letters leave
    // and the handless clock art takes the wall (user call 2026-08-18)
    inGame() {
      return !!this.session.sessionId || this.players.length > 0;
    },
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
    // (The legacy webkit blood scrollbar — the --sb-trail writer and its
    // droplet spawner — was KILLED 2026-08-17 by user order. The only blood
    // scrollbar is the v-blood-scroll overlay directive.)
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
      // the app-wide PNG-font state + the font lab panel
      fontState,
      fontDebugOpen: false,
      // dev labs visibility (Aa + Ik) — hidden for now
      devLabs: false,
      grimoireClosed,
      grimoireOpen,
      // the drip lab
      drOpen: false,
      dripRef: dripKnobs,
      drDials: [
        { key: "w", label: "Bulb width", min: 8, max: 34, step: 1 },
        { key: "h", label: "Bulb height", min: 20, max: 130, step: 2 },
        { key: "trailW", label: "Trail width", min: 2, max: 16, step: 1 },
        { key: "overlap", label: "Overlap", min: 0, max: 48, step: 2 },
        { key: "dx", label: "X offset", min: -20, max: 20, step: 1 },
        { key: "dy", label: "Y offset", min: -30, max: 30, step: 1 }
      ],
      // the engraver lab
      engraverRef: engraver,
      ikDials: ENGRAVER_DIALS,
      ikOpen: false,
      ikSeed: 0,
      ikPreviews: [],
      // Blood + On-the rows retired 2026-08-18 (settled on Red 970000)
      fdRows: [
        { field: "clockKey", label: "Clock" },
        { field: "towerKey", label: "Tower" },
        { field: "capKey", label: "Hotkey letters" }
      ],
      dialLetters: [
        { cls: "dl-c1", letter: "C", word: "clock" },
        { cls: "dl-l", letter: "L", word: "clock" },
        { cls: "dl-o1", letter: "O", word: "clock" },
        { cls: "dl-c2", letter: "C", word: "clock" },
        { cls: "dl-k", letter: "K", word: "clock" },
        { cls: "dl-t", letter: "T", word: "tower" },
        { cls: "dl-o2", letter: "O", word: "tower" },
        { cls: "dl-w", letter: "W", word: "tower" },
        { cls: "dl-e", letter: "E", word: "tower" },
        { cls: "dl-r", letter: "R", word: "tower" }
      ]
    };
  },
  methods: {
    // FT-852: arm on the first click, leave on the second — no native
    // confirm() anywhere in the pill (see the template note).
    // ── the drip lab ────────────────────────────────────────────────────
    saveDrip() {
      saveDripKnobs();
    },
    resetDrip() {
      resetDripKnobs();
    },
    // ── the engraver lab ────────────────────────────────────────────────
    async toggleIkLab() {
      this.ikOpen = !this.ikOpen;
      if (this.ikOpen) this.ikBake();
    },
    async ikBake() {
      const lib = await import("./golem/iconLibrary");
      const list = await lib.loadIcons();
      const pairs = [
        { key: "raven / good", n: "raven", team: "townsfolk", ref: ikRefGood },
        { key: "imp / evil", n: "imp-laugh", team: "demon", ref: ikRefEvil }
      ];
      const done = [];
      for (const p of pairs) {
        const entry = lib.findIcon(list, p.n);
        if (!entry) continue;
        done.push({
          key: p.key,
          official: p.ref,
          ours: await lib.bakeIcon(entry, p.team, {
            seed: this.ikSeed,
            size: 128
          })
        });
      }
      this.ikPreviews = done;
    },
    onIkDial() {
      saveEngraver();
      clearTimeout(this.__ikTimer);
      this.__ikTimer = setTimeout(() => this.ikBake(), 250);
    },
    ikReroll() {
      this.ikSeed = 1 + Math.floor(Math.random() * 1e6);
      this.ikBake();
    },
    ikReset() {
      resetEngraver();
      this.ikBake();
    },
    // ── the font lab ─────────────────────────────────────────────────────
    fdCycle(field) {
      cycleField(field);
    },
    fdLabel(field) {
      return labelFor(this.fontState[field]);
    },
    wordKey(d) {
      return d.word === "clock" ? this.fontState.clockKey : this.fontState.towerKey;
    },
    dialGlyph(d) {
      return glyphFrom(this.wordKey(d), d.letter);
    },
    dialStyle(d) {
      return glyphStyleFrom(this.wordKey(d), d.letter, 1);
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
          // in-session: upstream's add player (the Scripts door moved to S)
          if (this.session.sessionId) this.$refs.menu.addPlayer();
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
          // Golem fork: sessionless, S opens the SCRIPTS door (renamed from
          // Almanac 2026-08-18); in-session it keeps the night toggle.
          if (!this.session.sessionId && this.$refs.intro) {
            this.$refs.intro.openCreate();
            break;
          }
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

// Golem fork: input fields APP-WIDE wear the game's chrome — dark plate,
// hairline border, blood-red focus glow, parchment-italic ghost text
// (user call 2026-08-17: the default fields didn't match the game).
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
textarea,
select {
  background: rgba(0, 0, 0, 0.55);
  color: #eee;
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  padding: 4px 8px;
  font-family: inherit;
  font-size: inherit;
  &:focus {
    outline: none;
    border-color: #a01414;
    box-shadow: 0 0 7px rgba(160, 20, 20, 0.4);
  }
  &::placeholder {
    color: rgba(232, 220, 194, 0.4);
    font-style: italic;
  }
}

// The legacy webkit BLOOD scrollbar was killed 2026-08-17 (user order:
// never use it again) — the v-blood-scroll overlay directive is the only
// blood bar. Native bars everywhere else stay quiet, thin, and dark.
* {
  scrollbar-width: thin;
  scrollbar-color: #2a2a2a #000;
}
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #000;
}
::-webkit-scrollbar-thumb {
  background: #2a2a2a;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3a3a3a;
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
    // natural-scale texture ANCHORED AT THE DROP: growth reveals more run
    // instead of stretching it (the stretch read as mucus, not blood); the
    // baked strip alternates flipped/jittered segments, so its repeat has
    // no visible period
    background-repeat: repeat-y;
    background-position: center bottom;
    background-size: 100% auto;
    opacity: 0.9;
  }
  .blooddrip-drop {
    position: absolute;
    top: 0;
    left: 50%;
    margin-left: -7.5px;
    pointer-events: auto;
    cursor: grab;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.6));
    // a touch of liquid lag — the drop eases after the content
    transition: transform 120ms ease-out;
    &:active {
      cursor: grabbing;
      transition: none;
    }
  }
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
// the DRIP LAB — top-left, the user's own scrollbar dials
#drip-lab {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 96;
  font-size: 13px;
  .fd-toggle {
    width: 30px;
    height: 26px;
    line-height: 26px;
    text-align: center;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #3d3d3d;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0.45;
    &:hover {
      opacity: 1;
      border-color: #a01414;
    }
  }
  &.open .fd-toggle {
    opacity: 1;
    border-color: #a01414;
  }
  .dr-rows {
    margin-top: 4px;
    background: rgba(8, 8, 12, 0.96);
    border: 1px solid #400;
    border-radius: 6px;
    padding: 8px;
    width: 240px;
    .dr-row {
      display: flex;
      align-items: center;
      gap: 6px;
      .dr-label {
        width: 78px;
        opacity: 0.75;
        font-size: 12px;
      }
      input[type="range"] {
        flex: 1;
        accent-color: #a01414;
      }
      .dr-val {
        width: 28px;
        text-align: right;
        font-size: 11px;
        opacity: 0.7;
      }
    }
    .dr-reset {
      margin-top: 6px;
      width: 100%;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      padding: 2px 0;
      cursor: pointer;
      font-family: inherit;
      &:hover {
        border-color: #a01414;
      }
    }
  }
}

// the grimoire drawer's tab — rides the left edge, above the drawer
.drawer-tab {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 21;
  padding: 3px;
  background: rgba(8, 8, 10, 0.92);
  border: 1px solid #4a0d0d;
  border-left: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  .tab-book {
    // the cover at its own proportions (80x96 asset), barely framed
    width: 40px;
    height: 48px;
    display: block;
    filter: drop-shadow(0 1px 3px black);
  }
  &:hover .tab-book {
    filter: drop-shadow(0 1px 3px black) brightness(1.25);
  }
  &.open {
    left: 250px;
  }
  transition: left 220ms ease;
}

// in a game the hands leave the face — #app paints the handless art over
// the body's default (the class rides #app, not body)
#app.in-game {
  background: #0b0d12 url("assets/background-clocktower-blank.png") center
    center;
  background-size: cover;
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

/* Golem fork: the FONT LAB — the top-left dev dropdown owning every
   lettering choice. Deliberately plain: it is a debug tool. */
#font-debug {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 96;
  font-size: 13px;
  .ik-toggle {
    margin-top: 4px;
  }
  .ik-panel {
    margin-top: 4px;
    background: rgba(8, 8, 12, 0.96);
    border: 1px solid #400;
    border-radius: 6px;
    padding: 8px;
    width: 300px;
    .ik-previews {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-bottom: 6px;
      .ik-pair {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        img {
          width: 96px;
          height: 96px;
        }
        span {
          font-size: 11px;
          opacity: 0.6;
        }
      }
    }
    .ik-row {
      display: flex;
      align-items: center;
      gap: 6px;
      .ik-label {
        width: 74px;
        opacity: 0.75;
        font-size: 12px;
      }
      input[type="range"] {
        flex: 1;
        accent-color: #a01414;
      }
      .ik-val {
        width: 34px;
        text-align: right;
        font-size: 11px;
        opacity: 0.7;
      }
    }
    .ik-acts {
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-top: 6px;
      button {
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: 1px solid #3d3d3d;
        border-radius: 6px;
        padding: 2px 12px;
        cursor: pointer;
        font-family: inherit;
        &:hover {
          border-color: #a01414;
        }
      }
    }
  }
  .fd-toggle {
    width: 30px;
    height: 26px;
    line-height: 26px;
    text-align: center;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #3d3d3d;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0.45;
    &:hover {
      opacity: 1;
      border-color: #a01414;
    }
  }
  &.open .fd-toggle {
    opacity: 1;
    border-color: #a01414;
  }
  .fd-rows {
    margin-top: 4px;
    background: rgba(8, 8, 12, 0.96);
    border: 1px solid #400;
    border-radius: 6px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    .fd-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      .fd-label {
        opacity: 0.75;
      }
      .fd-cycle {
        font-family: inherit;
        font-size: 12px;
        color: white;
        background: rgba(0, 0, 0, 0.55);
        border: 1px solid #3d3d3d;
        border-radius: 5px;
        padding: 1px 8px;
        cursor: pointer;
        min-width: 130px;
        text-align: center;
        &:hover {
          border-color: #a01414;
          color: #ff8a8a;
        }
      }
    }
  }
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
