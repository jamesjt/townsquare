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
    v-if="active || bannerOn"
    :class="rootClasses"
    @click="skip"
  >
    <!-- everything the ceremony PAINTS lives in .ec-show, which is what the
         fade phase fades — the verdict banner below stays outside it, so it
         can persist over the settled town (FT-1053d) -->
    <div class="ec-show" v-if="active">
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
        <!-- FT-1053d: tentacles out of the hole — six painted SVG assets
           (end-tentacle-*.svg: gradient-shaded violet-black bodies, one cold
           rim light each, sucker rows, turbulence-roughened edges), placed
           and swayed by the wrapper; the art itself carries a slower
           counter-sway so no two read as the same motion -->
        <div class="ec-tentacles">
          <div
            v-for="(t, i) in tentacles"
            :key="'tent-' + i"
            class="ec-tent"
            :style="t.style"
          >
            <img class="ec-tent-art" :src="tentArts[t.art]" alt="" />
          </div>
        </div>
        <!-- the red wash -->
        <div class="ec-redwash"></div>
        <!-- FT-1053b: THE PROCESSION — every evil seat rises centre one at a
           time (dead minions, living minions, the demon last), each the
           seat's REAL coin with its name plate, minions settling aside into
           the flanks while the demon ends centre-stage -->
        <div class="ec-procession">
          <div
            v-for="p in procession"
            :key="p.key"
            class="ec-proc"
            :class="{ 'ec-proc-demon': p.demon, 'ec-proc-dead': p.dead }"
            :style="p.style"
          >
            <Token :role="p.role" />
            <span class="ec-proc-name">{{ p.name }}</span>
          </div>
        </div>
      </template>

      <!-- ── GOOD: dawn breaks over the face, the dead ascend ──────────────── -->
      <template v-if="verdictOn && winner === 'good'">
        <!-- FT-1053d: the horizon glow behind the dawn line — a warm dome
           breathing over the top of the face, with a dusky rose spill -->
        <div class="ec-dawn-sky"></div>
        <div class="ec-dawn"></div>
        <!-- FT-1053c: each beam finds ONE good seat — alive first, then the
           dead, one toll per beam, the beam's whole animation as long as the
           toll (SINGLE_TOLL_SEC). Geometry is measured px (dawn point to the
           seat's real coin box), set inline per beam. -->
        <!-- FT-1053d gave each beam a BODY: a taper-clipped shaft holding
           streaming light and drifting dust motes, plus an impact bloom that
           pops ON the coin at the strike moment (the reveal's overexposure
           kiss). Children inherit the beam's own delay/duration. -->
        <div class="ec-beams">
          <div
            v-for="(b, i) in beams"
            :key="'beam-' + i"
            class="ec-beam"
            :style="b"
          >
            <div class="ec-beam-shaft">
              <div class="ec-beam-streaks"></div>
              <div class="ec-beam-motes"></div>
            </div>
            <div class="ec-beam-bloom"></div>
          </div>
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

      <!-- the dawn point, as a measurable 0×0 probe: the beams' shared origin
         in real pixels (CSS owns the calc; JS reads the resolved box) -->
      <div class="ec-dawn-origin" ref="dawnOrigin"></div>
    </div>

    <!-- FT-1053d: THE VERDICT SHOUTS. A display-voice banner over the clock
         face — arriving with the settle (the fade phase), standing over the
         settled town until the next game clears isEnded. Composition call:
         it hangs ABOVE the face centre, clearing the procession's coin line
         (the demon stays centre-stage beneath it) and the centre stats
         block; z-topmost in the ceremony's own stack, pointer-transparent so
         the skip surface (the root) still takes the one click through it. -->
    <div
      v-if="bannerOn"
      class="ec-banner"
      :class="'ec-banner-' + settledWinner"
      aria-live="polite"
    >
      <span class="ec-banner-text">
        {{ settledWinner === "evil" ? "Evil wins" : "Good wins" }}
      </span>
    </div>
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
  evilProcession,
  goodSequence,
  rayToll,
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
      /** FT-1053b: the evil team's one-at-a-time rise, marshalled at verdict */
      procession: [],
      /** FT-1053c: one measured beam per good seat, alive first */
      beams: [],
      /** the good seats veiled for the choreographed reveal — their li
       *  elements, so skip/settle can unveil exactly what was veiled */
      veiledEls: [],
      ghostArt: require("../assets/ui-ghost-cowl.png"),
      /** FT-1053d: the six painted tentacle assets, in generator order */
      tentArts: [
        require("../assets/end-tentacle-1.svg"),
        require("../assets/end-tentacle-2.svg"),
        require("../assets/end-tentacle-3.svg"),
        require("../assets/end-tentacle-4.svg"),
        require("../assets/end-tentacle-5.svg"),
        require("../assets/end-tentacle-6.svg"),
      ],
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
    /** the tentacles' variety — static configs, not per-frame randomness.
     *  FT-1053d: six wrappers, one painted asset each; --tx/--ts/--tr/--td
     *  place and stagger the rise, --wa/--wd drive the wrapper's sway and
     *  --wa2/--wd2 the art's own slower counter-sway (two composed rotations
     *  at different periods read as non-uniform undulation, transform-only) */
    tentacles() {
      return [
        {
          art: 0,
          style: {
            "--tx": "-152",
            "--ts": "0.8",
            "--tr": "-15deg",
            "--td": "2.25s",
            "--wa": "3.4deg",
            "--wd": "3.6s",
            "--wa2": "1.8deg",
            "--wd2": "5.3s",
          },
        },
        {
          art: 1,
          style: {
            "--tx": "-88",
            "--ts": "1.05",
            "--tr": "-6deg",
            "--td": "1.95s",
            "--wa": "2.6deg",
            "--wd": "4.1s",
            "--wa2": "1.4deg",
            "--wd2": "6.1s",
          },
        },
        {
          art: 2,
          style: {
            "--tx": "-18",
            "--ts": "1.2",
            "--tr": "-1deg",
            "--td": "2.45s",
            "--wa": "2.2deg",
            "--wd": "4.8s",
            "--wa2": "1.2deg",
            "--wd2": "6.9s",
          },
        },
        {
          art: 3,
          style: {
            "--tx": "44",
            "--ts": "0.92",
            "--tr": "6deg",
            "--td": "2.1s",
            "--wa": "3.1deg",
            "--wd": "3.9s",
            "--wa2": "1.7deg",
            "--wd2": "5.7s",
          },
        },
        {
          art: 4,
          style: {
            "--tx": "104",
            "--ts": "1.12",
            "--tr": "12deg",
            "--td": "2.55s",
            "--wa": "2.4deg",
            "--wd": "4.4s",
            "--wa2": "1.3deg",
            "--wd2": "6.5s",
          },
        },
        {
          art: 5,
          style: {
            "--tx": "162",
            "--ts": "0.74",
            "--tr": "18deg",
            "--td": "2.35s",
            "--wa": "3.8deg",
            "--wd": "3.3s",
            "--wa2": "2deg",
            "--wd2": "4.9s",
          },
        },
      ];
    },
    /** FT-1053d: the standing verdict banner — up from the settle (the fade
     *  phase) and for as long as the town stays ended. A reload of an ended
     *  town shows it too: the banner is part of the SETTLED state, not of
     *  the show (which never replays). Hidden through breath and verdict so
     *  the ceremony keeps its suspense. */
    bannerOn() {
      return this.isEnded && (this.phase === "fade" || this.phase === "idle");
    },
    /** the winner as the STORE knows it — ceremonyState.winner clears at
     *  idle, and the banner outlives the show */
    settledWinner() {
      return this.storeWinner();
    },
    rootClasses() {
      return ["ec-" + this.phase, "ec-" + (this.winner || this.settledWinner)];
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
      const winner = this.storeWinner();
      const cast = this.castCounts();
      if (winner === "good") {
        // FT-1053c: the choreographed reveal — good seats hide their
        // identity NOW (synchronously, before Vue paints the end reveal
        // this same flush), and each seat's ray strike lifts its veil
        this.veilGoodSeats();
      }
      beginCeremony(winner, {
        isMuted: this.$store.state.grimoire.isMuted,
        evilCount: cast.evil,
        goodCount: cast.good,
        anyDeadGood: cast.deadGood > 0,
      });
    },
    /** the verdict phase mounting is when the dressing is measured/cut —
     *  shards off the face geometry, beams/ghosts off the real seat boxes */
    phase(now) {
      if (now !== "verdict") {
        // fade or idle: pending strikes die and every veil lifts — the skip
        // and the settle both land on the fully revealed board
        if (now === "fade" || now === "idle") {
          this.clearNotes();
          this.unveilAll();
        }
        return;
      }
      if (this.winner === "evil") {
        this.shards = this.cutShards();
        this.procession = this.marshalProcession();
      } else {
        this.buildGoodVerdict();
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
    this.unveilAll();
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
    /** who stands where, team-wise — the counts the sequencer sizes both
     *  verdicts by */
    castCounts() {
      let evil = 0;
      let good = 0;
      let deadGood = 0;
      this.$store.state.players.players.forEach((p) => {
        const team = p.role && p.role.team;
        if (team === "minion" || team === "demon") evil++;
        else if (team === "townsfolk" || team === "outsider") {
          good++;
          if (p.isDead) deadGood++;
        }
      });
      return { evil, good, deadGood };
    },
    /** every seat's li beside its player, in seat order */
    seatRows() {
      const players = this.$store.state.players.players;
      const els = document.querySelectorAll("#townsquare .circle > li");
      return players.map((player, i) => ({ player, li: els[i] || null, i }));
    },
    /**
     * FT-1053b: THE PROCESSION, marshalled. Order is the user's: dead
     * minions first, living minions, the demon(s) last — the crescendo.
     * Minions settle aside into alternating flank slots (inner-out, a
     * shallow arc dipping with distance); whoever comes last holds centre,
     * which is the demon whenever one is seated. Slots/timing in face-px
     * and seconds; the entry keyframe reads them as custom properties.
     */
    marshalProcession() {
      const evil = [];
      this.$store.state.players.players.forEach((p, i) => {
        const team = p.role && p.role.team;
        if (team !== "minion" && team !== "demon") return;
        evil.push({ p, seat: i, demon: team === "demon", dead: !!p.isDead });
      });
      const rank = (e) => (e.demon ? 2 : e.dead ? 0 : 1);
      evil.sort((a, b) => rank(a) - rank(b) || a.seat - b.seat);
      const t = evilProcession(evil.length);
      const flanks = [-105, 105, -190, 190, -275, 275, -360, 360];
      let m = 0;
      return evil.map((e, i) => {
        // exactly ONE centre — the last to rise (the demon whenever one is
        // seated; a second demon flanks like a minion rather than stacking)
        const center = i === evil.length - 1;
        const x = center ? 0 : flanks[m++ % flanks.length];
        return {
          key: "proc-" + e.seat,
          role: e.p.role,
          name: e.p.name || `Seat ${e.seat + 1}`,
          dead: e.dead,
          demon: e.demon,
          style: {
            "--px": x.toFixed(0),
            "--py": center ? "0" : (26 + Math.abs(x) * 0.06).toFixed(0),
            "--ps": center ? "1" : "0.78",
            zIndex: center ? 3 : 2,
            animationDelay: (t.start + i * t.stagger).toFixed(2) + "s",
            animationDuration: t.entry.toFixed(2) + "s",
          },
        };
      });
    },
    /**
     * FT-1053c: THE DAWN FINDS EACH OF THE GOOD. One measured beam per good
     * seat — dawn point to the seat's real coin box — alive seats first,
     * then the dead; each beam brings one toll (rayToll) as it leaves, its
     * whole animation exactly the toll's length; the seat's veil lifts (the
     * choreographed reveal) at the beam's LANDING; a dead seat's ghost
     * ascends a beat after its strike.
     */
    buildGoodVerdict() {
      const isMuted = this.$store.state.grimoire.isMuted;
      const rows = this.seatRows().filter(({ player }) => {
        const team = player.role && player.role.team;
        return team === "townsfolk" || team === "outsider";
      });
      const order = [
        ...rows.filter((r) => !r.player.isDead),
        ...rows.filter((r) => r.player.isDead),
      ];
      const t = goodSequence(
        order.length,
        order.some((r) => r.player.isDead),
      );
      const probe = this.$refs.dawnOrigin;
      const o = probe
        ? probe.getBoundingClientRect()
        : { left: window.innerWidth / 2, top: 0 };
      const beams = [];
      const ghosts = [];
      order.forEach((row, i) => {
        const el = row.li && (row.li.querySelector(".token") || row.li);
        if (!el) return;
        const box = el.getBoundingClientRect();
        const sx = box.left + box.width / 2;
        const sy = box.top + box.height / 2;
        const dx = sx - o.left;
        const dy = sy - o.top;
        const len = Math.hypot(dx, dy);
        // a div hanging from the dawn point, rotated so its far end lands on
        // the seat: for rotate(θ) about top-centre, (0, len) → (−sinθ·len,
        // cosθ·len), so θ = atan2(−dx, dy)
        const rot = (Math.atan2(-dx, dy) * 180) / Math.PI;
        const w = Math.max(24, box.width * 0.7);
        const delay = t.start + i * t.cadence;
        beams.push({
          left: (o.left - w / 2).toFixed(0) + "px",
          top: o.top.toFixed(0) + "px",
          width: w.toFixed(0) + "px",
          height: len.toFixed(0) + "px",
          "--ba": rot.toFixed(2) + "deg",
          animationDelay: delay.toFixed(2) + "s",
          animationDuration: t.rayDur.toFixed(2) + "s",
        });
        // the toll leaves with the beam; the veil lifts when the beam lands
        this.noteTimers.push(
          setTimeout(() => rayToll(i, isMuted), Math.round(delay * 1000)),
        );
        this.noteTimers.push(
          setTimeout(
            () => row.li && row.li.classList.remove("ec-unstruck"),
            Math.round((delay + t.rayLand) * 1000),
          ),
        );
        if (row.player.isDead) {
          ghosts.push({
            left: sx.toFixed(0) + "px",
            top: box.top.toFixed(0) + "px",
            height: Math.max(48, box.height * 0.9).toFixed(0) + "px",
            animationDelay: (delay + t.ghostLag).toFixed(2) + "s",
          });
        }
      });
      this.beams = beams;
      this.ghosts = ghosts;
    },
    /** FT-1053c: the good seats hold their pre-verdict face until their ray
     *  lands — the veil is a class on the seat's own li */
    veilGoodSeats() {
      this.veiledEls = [];
      this.seatRows().forEach(({ player, li }) => {
        const team = player.role && player.role.team;
        if (!li || (team !== "townsfolk" && team !== "outsider")) return;
        li.classList.add("ec-unstruck");
        this.veiledEls.push(li);
      });
    },
    /** every veil lifts — the skip's, the settle's and the unmount's floor:
     *  whatever happens, the board ends fully revealed */
    unveilAll() {
      this.veiledEls.forEach((li) => li.classList.remove("ec-unstruck"));
      this.veiledEls = [];
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
    /* everything the ceremony painted lets go together — but only the show:
       the verdict banner (a sibling of .ec-show) stands through the settle */
    .ec-show {
      opacity: 0;
      transition: opacity 1.05s ease-out;
    }
  }
  /* FT-1053d: the standing state — the show is gone, only the banner
     remains, and the settled town underneath is fully live */
  &.ec-idle {
    pointer-events: none;
    cursor: default;
  }
}

.ec-show {
  position: absolute;
  inset: 0;
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

/* THE TENTACLES (FT-1053d) — painted things from the deep, not shapes. Each
   wrapper carries placement (a face-pixel x offset, a lean, a scale, its own
   delay) plus its OWN sway amplitude/period; the art (end-tentacle-*.svg:
   gradient body, cold rim light, suckers, turbulence-roughened edges) adds a
   slower counter-sway of its own, so the two composed rotations undulate
   non-uniformly — transform/opacity only, the SVG filters are static. */
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
  bottom: calc(-76 * var(--fpx));
  width: calc(106 * var(--fpx));
  height: calc(288 * var(--fpx));
  margin-left: calc(-53 * var(--fpx));
  transform-origin: bottom center;
  rotate: var(--tr);
  transform: translateY(82%) scale(var(--ts));
  opacity: 0;
  /* the deep's own light: a violet occlusion glow, warmed once the red wash
     arrives (the drop-shadow reads the art's alpha, suckers and all) */
  filter: drop-shadow(0 0 10px rgba(70, 15, 55, 0.7));
  animation:
    ec-tent-rise 2s cubic-bezier(0.2, 0.7, 0.3, 1) var(--td) forwards,
    ec-tent-wiggle var(--wd, 3.4s) ease-in-out calc(var(--td) + 2s) infinite
      alternate;
  will-change: transform, opacity;
}
.ec-tent-art {
  width: 100%;
  height: 100%;
  display: block;
  transform-origin: 50% 96%;
  animation: ec-tent-sway var(--wd2, 5.5s) ease-in-out calc(var(--td) + 2.4s)
    infinite alternate;
}
@keyframes ec-tent-rise {
  to {
    transform: translateY(4%) scale(var(--ts));
    opacity: 1;
  }
}
@keyframes ec-tent-wiggle {
  from {
    transform: translateY(4%) scale(var(--ts))
      rotate(calc(var(--wa, 3deg) * -1)) skewX(-1.5deg);
  }
  to {
    transform: translateY(2%) scale(var(--ts)) rotate(var(--wa, 3deg))
      skewX(1.5deg);
  }
}
@keyframes ec-tent-sway {
  from {
    transform: rotate(calc(var(--wa2, 1.5deg) * -1));
  }
  to {
    transform: rotate(var(--wa2, 1.5deg));
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

/* FT-1053b: THE PROCESSION — each evil figure rises from the hole to
   centre-stage (coin + name plate), holds its moment, then settles aside to
   its flank slot as the next rises; the LAST figure (the demon) ends centre.
   One keyframe serves every figure: the flank slot rides custom properties,
   and the centre figure's slot is simply 0,0 — "slide to centre" is "stay". */
.ec-procession {
  position: absolute;
  left: var(--ec-cx);
  top: var(--ec-cy);
  width: 0;
  height: 0;
}
.ec-proc {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(var(--pw, 120) * var(--fpx));
  margin-left: calc(var(--pw, 120) / -2 * var(--fpx));
  margin-top: calc(var(--pw, 120) / -2 * var(--fpx));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(5 * var(--fpx));
  /* the ceremony's one click is SKIP — the coins are pictures here, and
     Token's own click handler must never fire from inside the show */
  pointer-events: none;
  font-size: calc(12 * var(--fpx));
  filter: drop-shadow(0 0 12px rgba(140, 16, 16, 0.65));
  opacity: 0;
  transform: translateY(calc(80 * var(--fpx))) scale(0.45);
  animation: ec-proc-enter cubic-bezier(0.25, 0.7, 0.3, 1) forwards;
  will-change: transform, opacity;

  .token {
    width: calc(var(--pw, 120) * var(--fpx));
    height: calc(var(--pw, 120) * var(--fpx));
    pointer-events: none;
  }
}
/* the crescendo wears more: a bigger coin, a hotter halo */
.ec-proc-demon {
  --pw: 150;
  font-size: calc(15 * var(--fpx));
  filter: drop-shadow(0 0 18px rgba(160, 20, 20, 0.8))
    drop-shadow(0 0 46px rgba(120, 10, 10, 0.5));
}
/* a dead minion rises anyway — but wears its death */
.ec-proc-dead .token {
  filter: grayscale(0.45) brightness(0.82);
}
.ec-proc-dead .ec-proc-name {
  opacity: 0.7;
}
/* the seat plate idiom (Player.vue's .name: dark plate, black border, soft
   shadow), team-tinted for the occasion */
.ec-proc-name {
  max-width: calc(170 * var(--fpx));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
  background: rgba(0, 0, 0, 0.65);
  border: 2px solid rgba(60, 0, 0, 0.9);
  border-radius: 10px;
  box-shadow: 0 0 5px black;
  padding: calc(1 * var(--fpx)) calc(9 * var(--fpx));
}
@keyframes ec-proc-enter {
  0% {
    transform: translateY(calc(80 * var(--fpx))) scale(0.45);
    opacity: 0;
  }
  25% {
    transform: translate(0, 0) scale(1.03);
    opacity: 1;
  }
  55% {
    transform: translate(0, 0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(
        calc(var(--px, 0) * var(--fpx)),
        calc(var(--py, 0) * var(--fpx))
      )
      scale(var(--ps, 1));
    opacity: 1;
  }
}

/* ══ GOOD ══════════════════════════════════════════════════════════════════ */

/* FT-1053d: the horizon GLOW — a warm dome breathing around the dawn line
   (gold core, a dusky rose spill wider and fainter), screen-blended so it
   lights the face art instead of painting over it. Static after its fade. */
.ec-dawn-sky {
  position: absolute;
  left: calc(var(--ec-cx) - 420 * var(--fpx));
  top: calc(var(--ec-cy) - 520 * var(--fpx));
  width: calc(840 * var(--fpx));
  height: calc(480 * var(--fpx));
  /* every gradient reaches full transparency INSIDE its box — an ellipse
     larger than the box clips into a hard-edged plate (first-run frame) */
  background: radial-gradient(
      ellipse 30% 34% at 50% 54%,
      rgba(255, 238, 190, 0.5) 0%,
      rgba(255, 205, 130, 0.22) 52%,
      transparent 78%
    ),
    radial-gradient(
      ellipse 44% 48% at 50% 54%,
      rgba(226, 120, 90, 0.18) 0%,
      transparent 74%
    );
  mix-blend-mode: screen;
  opacity: 0;
  animation: ec-fade-in 1.7s ease-out 0.15s forwards;
}

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
/* FT-1053c: the dawn point, measurable — the beams' shared origin. JS reads
   this 0×0 box's resolved position; CSS keeps sole ownership of the calc. */
.ec-dawn-origin {
  position: absolute;
  left: var(--ec-cx);
  top: calc(var(--ec-cy) - 262 * var(--fpx));
  width: 0;
  height: 0;
  pointer-events: none;
}
/* the beams — one per good seat, geometry set inline (measured px). Each
   hangs from the dawn point, rotated so its far end lands ON its seat; the
   animation is exactly one toll long (SINGLE_TOLL_SEC): the sweep reaches
   the seat ~30% in (the strike — the reveal moment), then the beam holds
   and dims with the bell's decay. */
.ec-beams {
  position: absolute;
  inset: 0;
  mix-blend-mode: screen;
}
.ec-beam {
  position: absolute;
  transform-origin: top center;
  rotate: var(--ba, 0deg);
  transform: scaleY(0);
  opacity: 0;
  animation-name: ec-beam-strike;
  animation-timing-function: cubic-bezier(0.3, 0.5, 0.25, 1);
  animation-fill-mode: forwards;
  will-change: transform, opacity;
}
/* FT-1053d: the beam's BODY — a taper-clipped shaft (narrow at the dawn
   point, opening toward the seat) with a warm chromatic cross-section: a
   near-white gold core falling away through pale amber fringes. The clip
   also crops the streaming/mote children to the shaft's shape. */
.ec-beam-shaft {
  position: absolute;
  inset: 0;
  overflow: hidden;
  clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%);
  background: linear-gradient(
      90deg,
      rgba(255, 190, 120, 0) 0%,
      rgba(255, 196, 125, 0.14) 22%,
      rgba(255, 238, 196, 0.34) 44%,
      rgba(255, 250, 228, 0.44) 50%,
      rgba(255, 238, 196, 0.34) 56%,
      rgba(255, 196, 125, 0.14) 78%,
      rgba(255, 190, 120, 0) 100%
    ),
    linear-gradient(
      180deg,
      rgba(255, 240, 200, 0.05) 0%,
      rgba(255, 236, 185, 0.2) 30%,
      rgba(255, 232, 175, 0.16) 68%,
      rgba(255, 246, 215, 0.42) 88%,
      rgba(255, 246, 215, 0) 100%
    );
  filter: blur(0.6px);
}
/* internal streaking — long noise-modulated bands streaming DOWN the shaft
   (the light's direction). The band pattern repeats every 10% of the double-
   height layer and the loop translates exactly five periods, so the stream
   is seamless; a static turbulence mask breaks the bands into volume. */
.ec-beam-streaks {
  position: absolute;
  left: 0;
  top: -100%;
  width: 100%;
  height: 200%;
  background: repeating-linear-gradient(
    180deg,
    rgba(255, 246, 215, 0) 0%,
    rgba(255, 246, 215, 0.17) 2.4%,
    rgba(255, 246, 215, 0.02) 4.4%,
    rgba(255, 250, 230, 0.12) 7.2%,
    rgba(255, 246, 215, 0) 10%
  );
  mask-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='420'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.045 0.008' numOctaves='3' seed='7'/><feColorMatrix type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0.85 0 0 0 0.15'/></filter><rect width='140' height='420' filter='url(%23n)'/></svg>");
  mask-size: 100% 50%;
  animation: ec-beam-stream 5.5s linear infinite;
  animation-delay: inherit;
  will-change: transform;
}
@keyframes ec-beam-stream {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(50%);
  }
}
/* dust motes drifting UP inside the beam — few, small, blurred; one drift
   per toll (duration inherited from the beam) */
.ec-beam-motes {
  position: absolute;
  left: 0;
  top: 26%;
  width: 100%;
  height: 74%;
  background: radial-gradient(
      circle 2.6px at 32% 18%,
      rgba(255, 250, 230, 0.9),
      transparent 70%
    ),
    radial-gradient(
      circle 2px at 58% 42%,
      rgba(255, 244, 215, 0.8),
      transparent 70%
    ),
    radial-gradient(
      circle 3px at 47% 66%,
      rgba(255, 250, 235, 0.85),
      transparent 70%
    ),
    radial-gradient(
      circle 1.8px at 66% 82%,
      rgba(255, 240, 210, 0.7),
      transparent 70%
    ),
    radial-gradient(
      circle 2.2px at 38% 90%,
      rgba(255, 248, 225, 0.75),
      transparent 70%
    );
  filter: blur(0.9px);
  opacity: 0;
  transform: translateY(14%);
  animation-name: ec-beam-motes-drift;
  animation-duration: inherit;
  animation-delay: inherit;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  will-change: transform, opacity;
}
@keyframes ec-beam-motes-drift {
  0% {
    transform: translateY(14%);
    opacity: 0;
  }
  34% {
    opacity: 0.9;
  }
  85% {
    opacity: 0.55;
  }
  100% {
    transform: translateY(-16%);
    opacity: 0;
  }
}
/* the impact bloom — a radial flare popping ON the coin at the strike beat
   (the beam's 30% keyframe = rayLand), opening with a brief overexposure
   kiss, then settling to a held halo for the toll's decay. It sits OUTSIDE
   the shaft clip so the flare can spill past the taper. */
.ec-beam-bloom {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 210%;
  height: 30%;
  translate: -50% 50%;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    rgba(255, 255, 250, 1) 0%,
    rgba(255, 244, 200, 0.6) 30%,
    rgba(255, 214, 140, 0.24) 60%,
    transparent 100%
  );
  transform: scale(0.15);
  opacity: 0;
  animation-name: ec-beam-bloom-pop;
  animation-duration: inherit;
  animation-delay: inherit;
  animation-timing-function: cubic-bezier(0.3, 0.6, 0.3, 1);
  animation-fill-mode: forwards;
  will-change: transform, opacity;
}
@keyframes ec-beam-bloom-pop {
  0%,
  25% {
    transform: scale(0.15);
    opacity: 0;
  }
  30% {
    /* the strike: the reveal's overexposure kiss */
    transform: scale(1.28);
    opacity: 1;
  }
  40% {
    transform: scale(0.95);
    opacity: 0.75;
  }
  70% {
    transform: scale(1);
    opacity: 0.55;
  }
  100% {
    transform: scale(1.06);
    opacity: 0.4;
  }
}
@keyframes ec-beam-strike {
  0% {
    transform: scaleY(0);
    opacity: 0;
  }
  8% {
    opacity: 0.9;
  }
  30% {
    /* the strike lands — rayLand: ~1.2s of the 3.98s toll */
    transform: scaleY(1);
    opacity: 0.9;
  }
  70% {
    transform: scaleY(1);
    opacity: 0.55;
  }
  100% {
    /* held glow, dimming with the bell's decay */
    transform: scaleY(1);
    opacity: 0.35;
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

/* ══ THE VERDICT BANNER (FT-1053d) ═════════════════════════════════════════
   "GOOD WINS" / "EVIL WINS", loud — the app's display voice (PiratesBay, the
   entry page's tower lettering), sized to the face, hung above its centre so
   the procession's coins and the centre stats stay readable beneath it.
   Topmost in the ceremony's own stack; pointer-transparent. */
.ec-banner {
  position: absolute;
  left: var(--ec-cx);
  top: calc(var(--ec-cy) - 148 * var(--fpx));
  width: 0;
  height: 0;
  z-index: 10;
  pointer-events: none;
}
.ec-banner-text {
  position: absolute;
  translate: -50% -50%;
  display: block;
  white-space: nowrap;
  font-family: PiratesBay, sans-serif;
  text-transform: uppercase;
  font-size: calc(68 * var(--fpx));
  line-height: 1;
  letter-spacing: calc(6 * var(--fpx));
  padding-left: calc(6 * var(--fpx)); /* re-centres the tracked line */
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  transform: scale(1.6);
  opacity: 0;
  animation: ec-banner-in 0.95s cubic-bezier(0.22, 0.9, 0.3, 1.05) forwards;
  will-change: transform, opacity;
}
/* arriving with presence: oversized and gone → lands with a settle bounce */
@keyframes ec-banner-in {
  0% {
    transform: scale(1.6);
    opacity: 0;
  }
  55% {
    transform: scale(0.97);
    opacity: 1;
  }
  78% {
    transform: scale(1.025);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
/* GOOD: dawn-gold lettering with a warm halo and a cold blue under-glow */
.ec-banner-good .ec-banner-text {
  background-image: linear-gradient(
    180deg,
    #fffbe8 0%,
    #ffeaa9 34%,
    #eab659 62%,
    #a5762c 100%
  );
  filter: drop-shadow(0 0 calc(12 * var(--fpx)) rgba(255, 220, 140, 0.55))
    drop-shadow(0 0 calc(34 * var(--fpx)) rgba(120, 170, 255, 0.3))
    drop-shadow(
      0 calc(2 * var(--fpx)) calc(2 * var(--fpx)) rgba(30, 16, 0, 0.85)
    );
}
/* EVIL: blood lettering out of the red wash, dark-cored */
.ec-banner-evil .ec-banner-text {
  background-image: linear-gradient(
    180deg,
    #ffd9c9 0%,
    #ff7a56 30%,
    #bb1e12 62%,
    #4a0505 100%
  );
  filter: drop-shadow(0 0 calc(12 * var(--fpx)) rgba(255, 60, 30, 0.5))
    drop-shadow(0 0 calc(36 * var(--fpx)) rgba(120, 6, 6, 0.55))
    drop-shadow(0 calc(2 * var(--fpx)) calc(2 * var(--fpx)) rgba(0, 0, 0, 0.9));
}
/* motion-reduced clients get the verdict, not the entrance */
@media (prefers-reduced-motion: reduce) {
  .ec-banner-text {
    animation: none;
    transform: none;
    opacity: 1;
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

/* ── GOOD WINS: the choreographed reveal (FT-1053c) ────────────────────────
   Every good seat holds its PRE-VERDICT face while it waits: identity veiled
   (the coin's icon and name arc — the seat plate stays), no lift, no halo.
   The seat's own ray landing removes `.ec-unstruck` (EndCeremony's strike
   timer), and everything below arrives WITH the strike — the reveal, the
   lift and the halo are one moment now, so the old fixed transition-delays
   came off. The end-reveal publication underneath is untouched: this only
   choreographs WHEN each revealed face first shows. */
#app.ec-active #townsquare .token .icon-fit,
#app.ec-active #townsquare .token .name {
  transition: opacity 0.7s ease;
}
#app.ec-active #townsquare li.ec-unstruck .token .icon-fit,
#app.ec-active #townsquare li.ec-unstruck .token .name {
  opacity: 0;
  transition: none;
}
/* the living good lift, warm-haloed — struck seats only */
#app.ec-verdict.ec-good
  #townsquare
  .circle
  > li:not(.ec-unstruck):has(.player.townsfolk),
#app.ec-verdict.ec-good
  #townsquare
  .circle
  > li:not(.ec-unstruck):has(.player.outsider) {
  translate: 0 calc(-7 * var(--fpx));
}
#app.ec-verdict.ec-good #townsquare li:not(.ec-unstruck) .player.townsfolk,
#app.ec-verdict.ec-good #townsquare li:not(.ec-unstruck) .player.outsider {
  filter: drop-shadow(0 0 14px rgba(255, 214, 140, 0.7));
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
