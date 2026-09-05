<template>
  <!--
    Golem fork (FT-1384): THE NIGHT THREAD — the one night mark that lives
    BETWEEN coins rather than on one, so it cannot be drawn inside a seat's
    own box (Player.vue) and stands in its own full-square overlay instead,
    the WhisperPlanes idiom one component over: geometry read fresh off the
    seats' rendered coins, pointer-transparent, pure ambience.

    WHO SEES IT: the ACTOR alone. Everything it reads is this client's own
    staged/echoed picks (night/myShownTargets) and own delivered tellings
    (night/myTold) — a bystander's client holds none of this state, so
    there is nothing here to hide from them.

    THE DRESSES (per acting role, as their art lands):
      fortuneteller  the scrying thread ("star") — starlight strung between
                     the TWO picked coins. Staged: a dotted shimmer. Sealed:
                     the thread burns solid, one pulse travelling its length.
      butler         the cord ("cord") — deference, tied off: it runs from
                     the Butler's OWN coin to the staged master, SLACK (a
                     sagging curve, the pendulum ease of an unmade promise).
                     Sealed: the cord SNAPS TAUT — dead straight, one snap —
                     and the bow cinches on the master's coin (NightMark's
                     half of the act).

    ── FT-1385: AND THE TOLD-INFORMATION LINES ──────────────────────────────
    The first-night told roles string threads too, but theirs are TWO-BEAT
    (telling → settled residue) and PERSIST past the night's end — knowledge
    does not expire, so the overlay no longer assumes one thread or one
    grammar. `threads` is a measured LIST now; the FT-1384 call thread is
    simply its first entry when one stands.
      washerwoman    the laundry line ("laundry") — pegged between the two
                     candidate coins. Telling: the line strings itself on,
                     barely sagging. Settled: it eases SLACK and dotted —
                     washing left out overnight — and stays all game.

    Re-measured on every relevant change and on resize; the lines are drawn
    in viewport pixels exactly as the planes fly in them.
  -->
  <div class="night-thread" aria-hidden="true" v-if="threads.length">
    <svg :style="svgStyle" :viewBox="viewBox" preserveAspectRatio="none">
      <template v-for="t in threads">
        <path
          class="nt-line"
          :class="['nt-' + t.dress, { sealed: t.sealed, settled: t.settled }]"
          :key="t.key"
          :d="lineD(t)"
          pathLength="1"
        />
        <path
          v-if="t.sealed && t.dress === 'star'"
          class="nt-pulse"
          :key="t.key + '-pulse'"
          :d="lineD(t)"
          pathLength="1"
        />
      </template>
    </svg>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import { TOLD_ROLES, liveNeighbours } from "../golem/toldInfo";

/** The roles whose mark strings a thread, and how its ends are chosen. */
const THREADED = {
  // the Fortune Teller's two picks are the two ends
  fortuneteller: { from: "pick0", to: "pick1", dress: "star" },
  // the Butler's cord runs from their own chair to the staged master
  butler: { from: "self", to: "pick0", dress: "cord" },
};

/** FT-1385: the told roles whose telling strings lines, keyed by the line's
 *  dress. Pair roles run one line between the delivered candidates; the
 *  Empath (a later commit) runs one from her own chair to each neighbour. */
const TOLD_DRESS = {
  washerwoman: "laundry",
  librarian: "ribbon",
  // the evidence string NEVER slacks — the tonal split from the
  // Washerwoman's line is the whole point (no sag case in lineD)
  investigator: "evidence",
  // the heart-threads run self → each LIVE neighbour, recomputed off the
  // players array so a death re-anchors them by itself
  empath: "vein",
};

export default {
  name: "NightThread",
  data() {
    return {
      // the measured lines, empty while there is nothing to string
      threads: [],
      raf: 0,
    };
  },
  computed: {
    ...mapState(["session"]),
    // FT-1385: the Empath's veins re-anchor off the live players array.
    ...mapState("players", ["players"]),
    ...mapGetters({
      call: "night/myCall",
      shown: "night/myShownTargets",
      locked: "night/myCallLocked",
      told: "night/myTold",
    }),
    /** The FT-1384 call thread's ends, as seat indexes — or null. */
    ends() {
      if (!this.call) return null;
      const spec = THREADED[this.call.role.id];
      if (!spec) return null;
      const seatOf = (key) => {
        if (key === "pick0") return this.pick(0);
        if (key === "pick1") return this.pick(1);
        if (key === "self") return this.session.claimedSeat;
        return -1;
      };
      const a = seatOf(spec.from);
      const b = seatOf(spec.to);
      if (!Number.isInteger(a) || a < 0) return null;
      if (!Number.isInteger(b) || b < 0 || b === a) return null;
      return { a, b, dress: spec.dress };
    },
    /**
     * FT-1385: the standing telling's lines, as seat-index pairs. Pair
     * roles: candidate to candidate, one line, exactly the coins the marks
     * acknowledge. Nothing while the role has no thread dress (the Chef's
     * count points at nobody).
     */
    toldEnds() {
      const told = this.told;
      if (!told) return [];
      const dress = TOLD_DRESS[told.roleId];
      if (!dress) return [];
      const spec = TOLD_ROLES[told.roleId] || {};
      const out = [];
      const settled = told.phase === "settled";
      if (spec.kind === "pair" && told.targets.length >= 2) {
        const [a, b] = told.targets;
        if (a !== b) {
          out.push({ a, b, dress, settled, key: told.rowId });
        }
      }
      // the Empath: one vein from her own chair to each LIVE neighbour —
      // computed fresh every read, so a mid-game death re-anchors the
      // thread to the next living seat without any event handling.
      if (spec.kind === "neighbours") {
        liveNeighbours(this.players, told.seat).forEach((s, i) => {
          if (s === told.seat) return;
          out.push({
            a: told.seat,
            b: s,
            dress,
            settled,
            key: told.rowId + "-n" + i,
          });
        });
      }
      return out;
    },
    /** One string the watcher can diff — re-measuring on every getter touch
     *  would thrash the DOM reads for nothing. */
    threadInputs() {
      return JSON.stringify([this.ends, this.locked, this.toldEnds]);
    },
    viewBox() {
      return `0 0 ${this.vw} ${this.vh}`;
    },
    svgStyle() {
      return { width: this.vw + "px", height: this.vh + "px" };
    },
    vw() {
      return (this.threads.length && this.threads[0].vw) || 0;
    },
    vh() {
      return (this.threads.length && this.threads[0].vh) || 0;
    },
  },
  watch: {
    threadInputs: "measure",
  },
  mounted() {
    window.addEventListener("resize", this.onResize);
    this.measure();
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.onResize);
    cancelAnimationFrame(this.raf);
  },
  methods: {
    pick(i) {
      const t = this.shown;
      return Array.isArray(t) && Number.isInteger(t[i]) ? t[i] : -1;
    },
    onResize() {
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(this.measure);
    },
    /**
     * One drawn line. A star thread is straight in both states; a cord SAGS
     * while staged (a quadratic bow toward the floor, deeper the longer the
     * span, capped so a cross-ring cord does not drag through the hub) and
     * snaps dead straight at the seal. A laundry line sags a LITTLE at the
     * telling and goes properly slack once settled — the opposite journey
     * from the cord's, because nothing here ever pulls taut again.
     */
    lineD(t) {
      const from = `M ${t.x1} ${t.y1}`;
      let sag = 0;
      const len = Math.hypot(t.x2 - t.x1, t.y2 - t.y1);
      if (t.dress === "cord" && !t.sealed) sag = Math.min(60, len * 0.18);
      if (t.dress === "laundry") {
        sag = t.settled ? Math.min(70, len * 0.2) : Math.min(30, len * 0.08);
      }
      // the ribbon drapes — gentler than laundry in both states, because a
      // ribbon between pages was never meant to carry weight
      if (t.dress === "ribbon") {
        sag = t.settled ? Math.min(50, len * 0.14) : Math.min(24, len * 0.06);
      }
      // a vein curves a little always — a living line, not a strung one
      if (t.dress === "vein") {
        sag = t.settled ? Math.min(32, len * 0.09) : Math.min(18, len * 0.05);
      }
      if (sag) {
        const mx = (t.x1 + t.x2) / 2;
        const my = (t.y1 + t.y2) / 2;
        return `${from} Q ${mx} ${my + sag} ${t.x2} ${t.y2}`;
      }
      return `${from} L ${t.x2} ${t.y2}`;
    },
    /** The center of one seat's coin, in viewport pixels — the planes' own
     *  read, unchanged. */
    coinCenter(seat) {
      const li = document.querySelectorAll("#townsquare .circle > li")[seat];
      const coin = li && li.querySelector(".player .token");
      if (!coin) return null;
      const b = coin.getBoundingClientRect();
      if (!b.width) return null;
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    },
    measure() {
      const wanted = [];
      if (this.ends) {
        wanted.push({
          ...this.ends,
          sealed: this.locked,
          settled: false,
          key: "call",
        });
      }
      this.toldEnds.forEach((e) => wanted.push({ sealed: false, ...e }));
      if (!wanted.length) {
        this.threads = [];
        return;
      }
      // next tick: the picked coin's own marks may still be mounting
      this.$nextTick(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const out = [];
        wanted.forEach((w) => {
          const from = this.coinCenter(w.a);
          const to = this.coinCenter(w.b);
          if (!from || !to) return;
          out.push({
            ...w,
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            vw,
            vh,
          });
        });
        this.threads = out;
      });
    },
  },
};
</script>

<style scoped lang="scss">
.night-thread {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  // the planes' own altitude: over the seats, under the modals
  z-index: 60;

  svg {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
  }
}

// THE STARLIGHT — the Fortune Teller's pale violet-white; the same family
// as the pick ink but paler, because this is thread, not chrome.
$nt-star: #d9ccff;
$nt-star-hot: #f4eeff;

// THE BUTLER'S RIBBON — champagne cord, warmer and rounder than starlight.
$nt-cord: #e8c98f;
$nt-cord-hot: #ffe9c4;

// THE WASHERWOMAN'S LINE — laundry white, NightMark's own soap-pale ink.
$nt-laundry: #eaf2ff;

// THE LIBRARIAN'S RIBBON — old-parchment sepia, the book's own ink.
$nt-ribbon: #e8d9a8;

// THE INVESTIGATOR'S STRING — evidence red, hot when fresh, dried darker.
$nt-evidence: #ff5a5a;
$nt-evidence-dry: #c23b3b;

// THE EMPATH'S VEINS — heart pink, the warmest ink on the ring and used
// by nothing else on the square.
$nt-vein: #ff9fd0;

.nt-line {
  fill: none;
  opacity: 0;
  animation: nt-string 0.6s ease-out both;
}

// staged: a dotted shimmer, drawn on once (≤1s) and then at rest — beads
// drifting along it would be a loop, and a staged pick is a decision at
// rest (the FT-1384 animation contract).
.nt-star {
  stroke: $nt-star;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 0.012 0.024;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(217, 204, 255, 0.7));

  // sealed: the thread burns SOLID and brighter, and holds.
  &.sealed {
    stroke: $nt-star-hot;
    stroke-width: 2.6;
    stroke-dasharray: none;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 6px rgba(244, 238, 255, 0.85));
    animation: nt-string 0.4s ease-out both;
  }
}

// the cord: SLACK while staged (the sag is in the path), swinging on once
// with a pendulum ease; sealed it is dead straight — the SNAP is one hard
// width-and-light crack that settles inside half a second.
.nt-cord {
  stroke: $nt-cord;
  stroke-width: 2.4;
  stroke-linecap: round;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(232, 201, 143, 0.6));
  animation: nt-string 0.7s ease-in-out both;

  &.sealed {
    stroke: $nt-cord-hot;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 6px rgba(255, 233, 196, 0.85));
    animation: nt-snap 0.4s ease-out both;
  }
}

// FT-1385 — the laundry line: strings itself on at the telling (the same
// one-shot draw the marks use), long-dashed like line with washing on it;
// settled it hangs slack (the sag is in the path), dotted and dimmer, and
// simply stays. The transition covers the dash flip so the settle reads as
// the line relaxing rather than being swapped.
.nt-laundry {
  stroke: $nt-laundry;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-dasharray: 0.03 0.015;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 5px rgba(234, 242, 255, 0.7));
  animation: nt-draw 0.7s ease-out both;
  transition:
    d 0.9s ease,
    stroke-width 0.9s ease,
    opacity 0.9s ease,
    filter 0.9s ease;

  &.settled {
    stroke-width: 1.6;
    stroke-dasharray: 0.008 0.026;
    opacity: 0.65;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 3px rgba(234, 242, 255, 0.4));
    animation: nt-hold 0.9s ease-out both;
  }
}

// FT-1385 — the Librarian's ribbon: unspools between the two candidates at
// the telling (long ribbon-dashes, warmer and softer than the laundry
// line); settled it rests dotted sepia — the ribbon left between pages.
.nt-ribbon {
  stroke: $nt-ribbon;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-dasharray: 0.05 0.012;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 5px rgba(232, 217, 168, 0.65));
  animation: nt-draw 0.7s ease-out both;
  transition:
    d 0.9s ease,
    stroke-width 0.9s ease,
    opacity 0.9s ease,
    filter 0.9s ease;

  &.settled {
    stroke-width: 1.6;
    stroke-dasharray: 0.008 0.026;
    opacity: 0.6;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 3px rgba(232, 217, 168, 0.4));
    animation: nt-hold 0.9s ease-out both;
  }
}

// FT-1385 — the Investigator's evidence string: SNAPS taut between the two
// pinned coins at the telling and NEVER slacks — the Washerwoman's line
// eases, this one does not; that is the tonal split. Settled it only
// THINS and dries darker, still dead straight, still solid.
.nt-evidence {
  stroke: $nt-evidence;
  stroke-width: 2.6;
  stroke-linecap: round;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 5px rgba(255, 90, 90, 0.7));
  animation: nt-snap 0.45s ease-out both;
  transition:
    stroke-width 0.9s ease,
    stroke 0.9s ease,
    opacity 0.9s ease,
    filter 0.9s ease;

  &.settled {
    stroke: $nt-evidence-dry;
    stroke-width: 1.4;
    opacity: 0.75;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 3px rgba(194, 59, 59, 0.45));
    animation: nt-hold 0.9s ease-out both;
  }
}

// FT-1385 — the Empath's veins: each PULSES out once from her own coin to
// a neighbour (the draw-on is the heartbeat), then rests faint and dotted
// between nights. Night two re-runs the same beat on the same threads —
// the phase flip back to telling replays the one-shot draw.
.nt-vein {
  stroke: $nt-vein;
  stroke-width: 2.4;
  stroke-linecap: round;
  // one dash the length of the path: the dashoffset draw-on IS the pulse
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 5px rgba(255, 159, 208, 0.75));
  animation: nt-draw 0.55s ease-out both;
  transition:
    d 0.9s ease,
    stroke-width 0.9s ease,
    opacity 0.9s ease,
    filter 0.9s ease;

  &.settled {
    stroke-width: 1.4;
    stroke-dasharray: 0.008 0.026;
    opacity: 0.55;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 3px rgba(255, 159, 208, 0.4));
    animation: nt-hold 0.9s ease-out both;
  }
}

// the telling's draw-on: the line strings itself end to end, once.
@keyframes nt-draw {
  from {
    opacity: 0.9;
    stroke-dashoffset: 1;
  }
  to {
    opacity: 0.9;
    stroke-dashoffset: 0;
  }
}

// the residue simply stands — the class flip replays animations, so the
// settled state's is a plain fade to its own held opacity.
@keyframes nt-hold {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 0.65;
  }
}

@keyframes nt-snap {
  0% {
    opacity: 0.55;
    stroke-width: 1.4;
  }
  35% {
    opacity: 1;
    stroke-width: 3.8;
  }
  100% {
    opacity: 0.95;
    stroke-width: 2.6;
  }
}

@keyframes nt-string {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.9;
  }
}

// the answer pulses down the thread ONCE — a short bright dash running the
// length, then gone (the line above is what holds).
.nt-pulse {
  stroke: white;
  stroke-width: 3.4;
  stroke-linecap: round;
  stroke-dasharray: 0.12 0.88;
  stroke-dashoffset: 0.12;
  filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.9));
  animation: nt-pulse-run 0.9s ease-in-out 0.15s both;
}

@keyframes nt-pulse-run {
  from {
    stroke-dashoffset: 0.12;
    opacity: 1;
  }
  to {
    stroke-dashoffset: -1;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nt-line,
  .nt-pulse {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
  .nt-pulse {
    opacity: 0;
  }
}
</style>
