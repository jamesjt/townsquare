<template>
  <!-- Golem fork (FT-1053): THE END-GAME CEREMONY — the visual half.
       The state machine, timers, hand-spin and sound live in
       src/golem/endCeremony.js; this component renders the dressing over the
       town and owns the TRIGGER (the armed watch on session.isEnded below).
       Everything here is presentation: one click anywhere skips to the
       settled state, and unmounting mid-show (a reload) leaves exactly the
       end state today's flow already reaches. DESKTOP ONLY this pass. -->
  <div
    id="end-ceremony"
    v-if="active"
    :class="['ec-' + phase, 'ec-' + winner]"
    @click="skip"
  >
    <!-- the held breath: the veil deepens over everything but this show -->
    <div class="ec-veil"></div>

    <!-- ── EVIL: the face cracks, shatters inward, and something rises ───── -->
    <template v-if="verdictOn && winner === 'evil'">
      <!-- the dark hole the face leaves — under the shards, over the art -->
      <div class="ec-hole"></div>
      <!-- the hairline crack racing across the dial -->
      <div class="ec-crack"></div>
      <!-- the face itself, as clip-path shards of the REAL dial art (the
           same background #app.in-game paints, re-declared here so each
           piece can fall on its own transform) -->
      <div class="ec-shards">
        <div
          v-for="(s, i) in shards"
          :key="'shard-' + i"
          class="ec-shard"
          :style="s"
        ></div>
      </div>
      <!-- tentacles out of the hole — CSS-first silhouettes, layered so a
           drawn-art pass can replace each .ec-tent-art in place -->
      <div class="ec-tentacles">
        <div
          v-for="(t, i) in tentacles"
          :key="'tent-' + i"
          class="ec-tent"
          :style="t"
        >
          <svg class="ec-tent-art" viewBox="0 0 120 320" aria-hidden="true">
            <path
              d="M54,320 C28,248 84,210 58,142 C46,100 68,74 60,18
                 C59,12 66,14 65,20 C74,80 54,110 72,158
                 C88,222 46,252 92,320 Z"
            />
          </svg>
        </div>
      </div>
      <!-- the red wash -->
      <div class="ec-redwash"></div>
      <!-- the demon that stood among you — the seat's real coin, risen -->
      <div class="ec-demon" v-if="demonRole">
        <Token :role="demonRole" />
      </div>
    </template>

    <!-- ── GOOD: dawn breaks over the face, the dead ascend ──────────────── -->
    <template v-if="verdictOn && winner === 'good'">
      <div class="ec-dawn"></div>
      <div class="ec-rays">
        <div
          v-for="(r, i) in rays"
          :key="'ray-' + i"
          class="ec-ray"
          :style="r"
        ></div>
      </div>
      <img
        v-for="(g, i) in ghosts"
        :key="'ghost-' + i"
        class="ec-ghost"
        :src="ghostArt"
        alt=""
        :style="g"
      />
    </template>
  </div>
</template>

<script>
import Token from "./Token";
import {
  ceremonyState,
  beginCeremony,
  skipCeremony,
  stopCeremony,
  ceremonyAllowed,
  ghostNote,
  END_CEREMONY_EVENT,
} from "../golem/endCeremony";

/** The measured dial centre, in face-pixels off `--face-cx/cy` — the same
 *  -11,-20 FaceHands carries (the art's dial is not quite at the art's
 *  centre; see FaceHands.vue's measurement block). Restated as numbers here
 *  because the shard polygons are computed in JS. */
const ART_DX = -11;
const ART_DY = -20;

/** How far out the shards reach, in face-pixels: past the numeral ring (196)
 *  and the outer bronze rim (~259), so the whole face goes with them. */
const SHARD_RIM_MIN = 244;
const SHARD_RIM_MAX = 272;

export default {
  name: "EndCeremony",
  components: { Token },
  data() {
    return {
      /** mirrored module state — Vue.observable, so these bindings track */
      ceremony: ceremonyState,
      /** armed only once THIS client has seen a live game (see gameLive) —
       *  a reload of an ended town, or a spectator joining one, must restore
       *  to the settled state, never replay the show */
      armed: false,
      shards: [],
      ghosts: [],
      ghostArt: require("../assets/ui-ghost-cowl.png"),
      noteTimers: [],
    };
  },
  computed: {
    phase() {
      return this.ceremony.phase;
    },
    winner() {
      return this.ceremony.winner;
    },
    active() {
      return this.phase !== "idle";
    },
    /** the verdict dressing stays mounted through the fade so it fades in
     *  place instead of vanishing on the phase edge */
    verdictOn() {
      return this.phase === "verdict" || this.phase === "fade";
    },
    isEnded() {
      return this.$store.state.session.isEnded;
    },
    /** "a game is live on this client" — the arming condition. chat.gameId
     *  is the synced fact every client holds while a dealt game runs (set on
     *  every gamestate sync, null between games), so a client that joins or
     *  reloads an ALREADY-ended town never sees this true and never arms:
     *  its endGame commit lands in the same tick as the gameId it rode in
     *  with, and Vue's watchers only ever see the settled pair. */
    gameLive() {
      return !!this.$store.state.chat.gameId && !this.isEnded;
    },
    /** the winning demon's actual role — "the Imp stood among you". First
     *  demon seat; absent (a no-record end with the roster gone) skips the
     *  coin, never the ceremony. */
    demonRole() {
      const demon = this.$store.state.players.players.find(
        (p) => p.role && p.role.team === "demon",
      );
      return demon ? demon.role : null;
    },
    /** the tentacles' variety — static configs, not per-frame randomness */
    tentacles() {
      return [
        { "--tx": "-118", "--ts": "0.85", "--tr": "-14deg", "--td": "2.2s" },
        { "--tx": "-52", "--ts": "1.1", "--tr": "-5deg", "--td": "1.95s" },
        { "--tx": "18", "--ts": "0.95", "--tr": "4deg", "--td": "2.35s" },
        { "--tx": "84", "--ts": "1.2", "--tr": "11deg", "--td": "2.05s" },
        { "--tx": "150", "--ts": "0.8", "--tr": "19deg", "--td": "2.5s" },
      ];
    },
    /** the light — six beams fanned from above the dial's top */
    rays() {
      const out = [];
      for (let i = 0; i < 6; i++) {
        out.push({
          "--ra": (i - 2.5) * 13 + "deg",
          "--rd": (0.5 + i * 0.14).toFixed(2) + "s",
          "--rw": (10 + (i % 3) * 7).toFixed(0),
        });
      }
      return out;
    },
  },
  watch: {
    /** arm on the first sight of a live game; re-arms after Play again the
     *  same way (gameId clears between games and returns on the next deal) */
    gameLive(live) {
      if (live) this.armed = true;
    },
    /** THE TRIGGER — the end broadcast landing on this client (the host's
     *  own endGame commit, or a player's via the gamestate sync). */
    isEnded(now, was) {
      if (!now || was || !this.armed) return;
      this.armed = false;
      if (!ceremonyAllowed(this.$store)) {
        // motion-reduced / the app's static kill-switch: no show — the
        // settled end state is already what renders. Say so for the rig.
        try {
          window.dispatchEvent(
            new CustomEvent(END_CEREMONY_EVENT, {
              detail: { beat: "reduced", winner: this.storeWinner() },
            }),
          );
        } catch (e) {
          // no CustomEvent; nothing to announce to
        }
        return;
      }
      beginCeremony(this.storeWinner(), {
        isMuted: this.$store.state.grimoire.isMuted,
      });
    },
    /** the verdict phase mounting is when the dressing is measured/cut —
     *  shards off the face geometry, ghosts off the real seat boxes */
    phase(now) {
      if (now !== "verdict") {
        if (now === "idle") this.clearNotes();
        return;
      }
      if (this.winner === "evil") {
        this.shards = this.cutShards();
      } else {
        this.ghosts = this.riseGhosts();
      }
    },
  },
  mounted() {
    // a client that mounts INTO a live game (reload mid-game) arms here —
    // the watcher only fires on change, and gameLive may already be true
    if (this.gameLive) this.armed = true;
  },
  beforeDestroy() {
    this.clearNotes();
    stopCeremony();
  },
  methods: {
    storeWinner() {
      return this.$store.state.session.winningTeam === "evil" ? "evil" : "good";
    },
    skip() {
      skipCeremony();
    },
    clearNotes() {
      this.noteTimers.forEach(clearTimeout);
      this.noteTimers = [];
    },
    /**
     * THE FACE, CUT INTO TWELVE. Each shard is a full-viewport div wearing
     * the SAME background #app.in-game paints, clipped to one irregular
     * wedge of the dial (polygon points in face-pixels around the measured
     * centre, spoken as calc() off --face-cx/cy so they track the art at
     * every viewport), falling INWARD on its own transform: translate toward
     * the centre, shrink, fade — the dial becomes the hole beneath.
     */
    cutShards() {
      const pt = (angleDeg, r) => {
        const a = (angleDeg * Math.PI) / 180;
        const x = ART_DX + Math.sin(a) * r;
        const y = ART_DY - Math.cos(a) * r;
        return { x, y };
      };
      const cs = (p) =>
        `calc(var(--face-cx) + ${p.x.toFixed(1)} * var(--fpx)) ` +
        `calc(var(--face-cy) + ${p.y.toFixed(1)} * var(--fpx))`;
      const shards = [];
      for (let i = 0; i < 12; i++) {
        const a0 = i * 30 + (Math.random() * 8 - 4);
        const a1 = (i + 1) * 30 + (Math.random() * 8 - 4);
        const mid = (a0 + a1) / 2;
        // apex near (never exactly at) the centre — a jittered break point
        const apex = pt(mid + (Math.random() * 14 - 7), 4 + Math.random() * 26);
        const rim = (t) =>
          SHARD_RIM_MIN + Math.random() * (SHARD_RIM_MAX - SHARD_RIM_MIN) - t;
        const points = [
          apex,
          pt(a0, rim(0)),
          pt(a0 + (a1 - a0) * 0.33, rim(6)),
          pt(a0 + (a1 - a0) * 0.66, rim(6)),
          pt(a1, rim(0)),
        ];
        // the fall: most of the way back toward the centre, in face-pixels
        const centroid = points.reduce(
          (acc, p) => ({ x: acc.x + p.x / 5, y: acc.y + p.y / 5 }),
          { x: 0, y: 0 },
        );
        shards.push({
          clipPath: "polygon(" + points.map(cs).join(", ") + ")",
          // each piece shrinks about ITS OWN centre while it flies — one
          // shared origin made the twelve read as a whole face zooming out
          // rather than shards tumbling in (first-run screenshot)
          transformOrigin: cs(centroid),
          "--ec-dx": (-(centroid.x - ART_DX) * 0.82).toFixed(1),
          "--ec-dy": (-(centroid.y - ART_DY) * 0.82).toFixed(1),
          "--ec-rot": (Math.random() * 50 - 25).toFixed(0) + "deg",
          animationDelay: (0.8 + Math.random() * 0.6).toFixed(2) + "s",
        });
      }
      return shards;
    },
    /**
     * THE DEAD RISE. Every dead GOOD seat's cowled ghost, measured off the
     * REAL rendered seat (the coin's own box), ascending into the rays. One
     * soft bell note per ghost, staggered with them.
     */
    riseGhosts() {
      const players = this.$store.state.players.players;
      const seats = document.querySelectorAll("#townsquare .circle > li");
      const isMuted = this.$store.state.grimoire.isMuted;
      const out = [];
      players.forEach((player, i) => {
        const team = player.role && player.role.team;
        if (!player.isDead) return;
        if (team !== "townsfolk" && team !== "outsider") return;
        const li = seats[i];
        if (!li) return;
        const box = (li.querySelector(".token") || li).getBoundingClientRect();
        const n = out.length;
        const delayMs = 1400 + n * 450;
        out.push({
          left: (box.left + box.width / 2).toFixed(0) + "px",
          top: box.top.toFixed(0) + "px",
          height: Math.max(48, box.height * 0.9).toFixed(0) + "px",
          animationDelay: (delayMs / 1000).toFixed(2) + "s",
        });
        this.noteTimers.push(
          setTimeout(() => ghostNote(n, isMuted), delayMs + 350),
        );
      });
      return out;
    },
  },
};
</script>

<style scoped lang="scss">
/* ── THE CEREMONY OVERLAY ──────────────────────────────────────────────────
   z-index 85: over the town, the readout and the strip (#controls is 75), so
   the veil genuinely quiets the working UI — and under EndGameOverlay (90)
   and the vote-history/edition modals (100+), none of which are up when this
   plays. The root takes THE ONE CLICK (skip); during the fade the pointer is
   released so the settled town is immediately live again. */
#end-ceremony {
  position: absolute;
  inset: 0;
  z-index: 85;
  overflow: hidden;
  cursor: pointer;
  /* the dial's measured centre — the same -11,-20 face-pixel correction the
     hands carry (FaceHands.vue's measurement block) */
  --ec-cx: calc(var(--face-cx) + -11 * var(--fpx));
  --ec-cy: calc(var(--face-cy) + -20 * var(--fpx));

  &.ec-fade {
    pointer-events: none;
    /* everything the ceremony painted lets go together */
    opacity: 0;
    transition: opacity 1.05s ease-out;
  }
}

/* the held breath — darkness soaks in over one long beat */
.ec-veil {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at var(--ec-cx) var(--ec-cy),
    rgba(4, 4, 10, 0.42) 0%,
    rgba(3, 3, 8, 0.66) 70%,
    rgba(2, 2, 6, 0.8) 100%
  );
  opacity: 0;
  animation: ec-veil-in 1.1s ease-out 0.05s forwards;
}
@keyframes ec-veil-in {
  to {
    opacity: 1;
  }
}

/* ══ EVIL ══════════════════════════════════════════════════════════════════ */

/* the dark hole the face leaves behind — revealed as the shards fall */
.ec-hole {
  position: absolute;
  left: var(--ec-cx);
  top: var(--ec-cy);
  width: calc(540 * var(--fpx));
  height: calc(540 * var(--fpx));
  margin: calc(-270 * var(--fpx)) 0 0 calc(-270 * var(--fpx));
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #010103 0%,
    #030208 44%,
    #08040e 58%,
    rgba(8, 4, 14, 0.55) 66%,
    transparent 72%
  );
  opacity: 0;
  animation: ec-fade-in 0.9s ease-out 0.75s forwards;
}
@keyframes ec-fade-in {
  to {
    opacity: 1;
  }
}

/* the hairline crack — a lit fissure racing across the dial, then gone into
   the shatter it caused */
.ec-crack {
  position: absolute;
  left: calc(var(--ec-cx) - 250 * var(--fpx));
  top: var(--ec-cy);
  width: calc(500 * var(--fpx));
  height: calc(3 * var(--fpx));
  transform-origin: left center;
  rotate: -24deg;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 120, 90, 0.9) 12%,
    #fff3e0 50%,
    rgba(255, 120, 90, 0.9) 88%,
    transparent 100%
  );
  filter: drop-shadow(0 0 6px rgba(255, 100, 60, 0.85));
  transform: scaleX(0);
  animation: ec-crack-race 1.15s cubic-bezier(0.7, 0, 0.3, 1) 0.15s forwards;
}
@keyframes ec-crack-race {
  0% {
    transform: scaleX(0);
    opacity: 1;
  }
  32% {
    transform: scaleX(1);
    opacity: 1;
  }
  70% {
    transform: scaleX(1);
    opacity: 0.9;
  }
  100% {
    transform: scaleX(1);
    opacity: 0;
  }
}

/* THE SHARDS — the real dial art, re-painted and cut. Same image, same
   position and size rules as #app.in-game's own background (App.vue), so
   before they move the pieces sit pixel-on-pixel over the face they were cut
   from; brightness matches the veil so the cut is invisible until it falls. */
.ec-shards {
  position: absolute;
  inset: 0;
  opacity: 0;
  animation: ec-fade-in 0.35s ease-out 0.45s forwards;
}
.ec-shard {
  position: absolute;
  inset: 0;
  background: #0b0d12 url("../assets/background-clocktower-blank-centered.png");
  background-position: calc(50% + 7px + var(--bg-off-x, 0px))
    calc(50% + var(--bg-off-y, 0px));
  background-size: auto calc(max(100vh, 100vw / 1.8244) + var(--bg-h, 0px));
  filter: brightness(0.62);
  animation: ec-shard-fall 2s cubic-bezier(0.55, 0, 0.85, 0.4) forwards;
  will-change: transform, opacity;
}
@keyframes ec-shard-fall {
  0% {
    transform: none;
    opacity: 1;
  }
  100% {
    transform: translate(
        calc(var(--ec-dx) * var(--fpx)),
        calc(var(--ec-dy) * var(--fpx))
      )
      scale(0.1) rotate(var(--ec-rot));
    opacity: 0;
  }
}

/* THE TENTACLES — dark silhouettes out of the hole. Each wrapper carries the
   placement (a face-pixel x offset, a lean, a scale, its own delay); the
   inner .ec-tent-art is the swappable drawing. */
.ec-tentacles {
  position: absolute;
  left: var(--ec-cx);
  top: var(--ec-cy);
  width: 0;
  height: 0;
}
.ec-tent {
  position: absolute;
  left: calc(var(--tx) * var(--fpx));
  bottom: calc(-90 * var(--fpx));
  width: calc(86 * var(--fpx));
  height: calc(300 * var(--fpx));
  margin-left: calc(-43 * var(--fpx));
  transform-origin: bottom center;
  rotate: var(--tr);
  transform: translateY(78%) scale(var(--ts));
  opacity: 0;
  animation:
    ec-tent-rise 2s cubic-bezier(0.2, 0.7, 0.3, 1) var(--td) forwards,
    ec-tent-wiggle 3.4s ease-in-out calc(var(--td) + 2s) infinite alternate;
}
.ec-tent-art {
  width: 100%;
  height: 100%;
  display: block;
  path {
    /* a FORM against the hole, not a wisp and not a neon tube — the first
       run's bare outlines and the second's glow-stick edges were the two
       failure modes; a near-black body with one faint cold rim is the lane
       between them */
    fill: #170d20;
    stroke: rgba(150, 80, 180, 0.22);
    stroke-width: 2;
  }
  filter: drop-shadow(0 0 10px rgba(70, 15, 55, 0.7));
}
@keyframes ec-tent-rise {
  to {
    transform: translateY(4%) scale(var(--ts));
    opacity: 1;
  }
}
@keyframes ec-tent-wiggle {
  from {
    transform: translateY(4%) scale(var(--ts)) rotate(-3.5deg) skewX(-2deg);
  }
  to {
    transform: translateY(2%) scale(var(--ts)) rotate(3.5deg) skewX(2deg);
  }
}

/* the red wash */
.ec-redwash {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at var(--ec-cx) var(--ec-cy),
    rgba(120, 8, 8, 0.34) 0%,
    rgba(70, 4, 10, 0.22) 55%,
    rgba(40, 0, 8, 0.12) 100%
  );
  opacity: 0;
  animation: ec-fade-in 1.4s ease-in 2.7s forwards;
}

/* the demon's own coin, risen from the hole to centre */
.ec-demon {
  position: absolute;
  left: var(--ec-cx);
  top: var(--ec-cy);
  width: calc(150 * var(--fpx));
  height: calc(150 * var(--fpx));
  margin: calc(-75 * var(--fpx)) 0 0 calc(-75 * var(--fpx));
  /* the ceremony's one click is SKIP — the coin is a picture here, and
     Token's own click handler must never fire from inside the show */
  pointer-events: none;
  font-size: calc(15 * var(--fpx));
  filter: drop-shadow(0 0 18px rgba(160, 20, 20, 0.8))
    drop-shadow(0 0 46px rgba(120, 10, 10, 0.5));
  opacity: 0;
  transform: translateY(calc(70 * var(--fpx))) scale(0.55);
  animation: ec-demon-rise 1.5s cubic-bezier(0.2, 0.8, 0.25, 1) 3.4s forwards;
}
@keyframes ec-demon-rise {
  to {
    opacity: 1;
    transform: none;
  }
}

/* ══ GOOD ══════════════════════════════════════════════════════════════════ */

/* the thin dawn line along the top of the face */
.ec-dawn {
  position: absolute;
  left: calc(var(--ec-cx) - 270 * var(--fpx));
  top: calc(var(--ec-cy) - 262 * var(--fpx));
  width: calc(540 * var(--fpx));
  height: calc(4 * var(--fpx));
  border-radius: 50%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 226, 160, 0.85) 30%,
    #fff6dc 50%,
    rgba(255, 226, 160, 0.85) 70%,
    transparent 100%
  );
  filter: blur(1px) drop-shadow(0 0 10px rgba(255, 220, 150, 0.8));
  transform: scaleX(0.1);
  opacity: 0;
  animation: ec-dawn-in 0.9s ease-out 0.2s forwards;
}
@keyframes ec-dawn-in {
  to {
    transform: scaleX(1);
    opacity: 1;
  }
}

/* the light — beams fanned from above the dial, sweeping down over it.
   screen-blended, transform+opacity only. */
.ec-rays {
  position: absolute;
  left: var(--ec-cx);
  top: calc(var(--ec-cy) - 262 * var(--fpx));
  width: 0;
  height: 0;
  mix-blend-mode: screen;
}
.ec-ray {
  position: absolute;
  left: calc(-0.5 * var(--rw) * var(--fpx));
  top: 0;
  width: calc(var(--rw) * var(--fpx));
  height: 88vh;
  transform-origin: top center;
  rotate: var(--ra);
  background: linear-gradient(
    180deg,
    rgba(255, 240, 200, 0.55) 0%,
    rgba(255, 232, 175, 0.28) 45%,
    rgba(255, 226, 160, 0) 100%
  );
  transform: scaleY(0);
  opacity: 0;
  animation:
    ec-ray-sweep 2.3s cubic-bezier(0.25, 0.6, 0.3, 1) var(--rd) forwards,
    ec-ray-breathe 3.6s ease-in-out calc(var(--rd) + 2.3s) infinite alternate;
}
@keyframes ec-ray-sweep {
  0% {
    transform: scaleY(0);
    opacity: 0;
  }
  35% {
    opacity: 0.95;
  }
  100% {
    transform: scaleY(1);
    opacity: 0.8;
  }
}
@keyframes ec-ray-breathe {
  from {
    opacity: 0.8;
  }
  to {
    opacity: 0.55;
  }
}

/* a dead good player's cowled ghost, rising from their own seat into the
   rays — the seat's ghost art, ascending */
.ec-ghost {
  position: absolute;
  transform: translate(-50%, 0);
  opacity: 0;
  filter: drop-shadow(0 0 12px rgba(210, 230, 255, 0.55));
  animation: ec-ghost-rise 2.8s cubic-bezier(0.3, 0.1, 0.3, 1) forwards;
  will-change: transform, opacity;
}
@keyframes ec-ghost-rise {
  0% {
    transform: translate(-50%, 0) scale(0.9);
    opacity: 0;
  }
  18% {
    opacity: 0.95;
  }
  70% {
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -46vh) scale(1.05);
    opacity: 0;
  }
}
</style>

<!-- ── THE CEREMONY'S REACH BEYOND ITS OWN BOX (deliberately unscoped) ──────
     Seat-level dressing and the hands' spin discipline. The phase classes ride
     #app's own root class binding (App.vue reads ceremonyState), and the seats
     already wear their team as a class (Player.vue puts player.role.team on
     .player) — at the end the roles are revealed on every client, so the teams
     are known exactly when this fires. `translate` is the independent
     transform property, so it composes with the ring's own rotate/scale
     without touching them. -->
<style lang="scss">
/* the hands' snap transitions die while the ceremony drives --fh-angle —
   a transition chasing a per-frame write smears the blade (FaceHands' own
   Sweep-mode rule, restated for the spin) */
#face-hands.ec-spin .fh-part {
  transition: none;
}

/* THE VERDICT IS THE CEREMONY'S TO ANNOUNCE. TownInfo's result pill renders
   the instant isEnded lands, which put "Evil wins" on screen during the held
   breath (first-run screenshot 01) — a spoiler over the show built to say it.
   Hidden through breath and verdict, it fades up WITH the settle (the fade
   phase no longer matches these selectors, so the transition below plays). */
#app.ec-active .result-now {
  transition: opacity 0.9s ease;
}
#app.ec-breath .result-now,
#app.ec-verdict .result-now {
  opacity: 0;
}

/* every seat learns to move/fade smoothly the moment the show starts */
#app.ec-breath #townsquare .circle > li,
#app.ec-verdict #townsquare .circle > li,
#app.ec-fade #townsquare .circle > li {
  transition:
    translate 1.1s ease,
    opacity 1.1s ease,
    filter 1.3s ease;
}
#app.ec-breath #townsquare .player,
#app.ec-verdict #townsquare .player,
#app.ec-fade #townsquare .player {
  transition: filter 1.3s ease;
}

/* ── EVIL WINS: the good seats go cold ─────────────────────────────────── */
#app.ec-verdict.ec-evil #townsquare .player.townsfolk,
#app.ec-verdict.ec-evil #townsquare .player.outsider {
  filter: grayscale(1) brightness(0.5);
  transition-delay: 1.1s;
}
/* ...and the winners burn a little */
#app.ec-verdict.ec-evil #townsquare .player.minion,
#app.ec-verdict.ec-evil #townsquare .player.demon {
  filter: drop-shadow(0 0 12px rgba(150, 12, 12, 0.75));
  transition-delay: 1.6s;
}

/* ── GOOD WINS: the living good lift, warm-haloed ──────────────────────── */
#app.ec-verdict.ec-good #townsquare .circle > li:has(.player.townsfolk),
#app.ec-verdict.ec-good #townsquare .circle > li:has(.player.outsider) {
  translate: 0 calc(-7 * var(--fpx));
  transition-delay: 0.9s;
}
#app.ec-verdict.ec-good #townsquare .player.townsfolk,
#app.ec-verdict.ec-good #townsquare .player.outsider {
  filter: drop-shadow(0 0 14px rgba(255, 214, 140, 0.7));
  transition-delay: 0.9s;
}
/* the evil seats are PINNED — pressed down, dimmed, cracks spidering under
   them (a pseudo-element the li did not otherwise use) */
#app.ec-verdict.ec-good #townsquare .circle > li:has(.player.minion),
#app.ec-verdict.ec-good #townsquare .circle > li:has(.player.demon) {
  translate: 0 calc(5 * var(--fpx));
  transition-delay: 1.1s;
}
#app.ec-verdict.ec-good #townsquare .player.minion,
#app.ec-verdict.ec-good #townsquare .player.demon {
  filter: brightness(0.6) saturate(0.7);
  transition-delay: 1.1s;
}
#app.ec-good #townsquare .circle > li:has(.player.minion)::before,
#app.ec-good #townsquare .circle > li:has(.player.demon)::before {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -6%;
  width: 120%;
  height: 26%;
  translate: -50% 0;
  pointer-events: none;
  /* dark cracks: thin crossing seams, no art */
  background:
    linear-gradient(
        104deg,
        transparent 46%,
        rgba(5, 3, 8, 0.85) 48%,
        transparent 50%
      )
      0 0 / 42% 100% no-repeat,
    linear-gradient(
        76deg,
        transparent 47%,
        rgba(5, 3, 8, 0.8) 49%,
        transparent 51%
      )
      40% 0 / 40% 90% no-repeat,
    linear-gradient(
        94deg,
        transparent 46%,
        rgba(5, 3, 8, 0.75) 49%,
        transparent 52%
      )
      100% 0 / 34% 80% no-repeat;
  opacity: 0;
  transition: opacity 1s ease 1.3s;
}
#app.ec-verdict.ec-good #townsquare .circle > li:has(.player.minion)::before,
#app.ec-verdict.ec-good #townsquare .circle > li:has(.player.demon)::before {
  opacity: 1;
}
</style>
