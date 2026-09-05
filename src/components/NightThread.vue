<template>
  <!--
    Golem fork (FT-1384): THE NIGHT THREAD — the one night mark that lives
    BETWEEN coins rather than on one, so it cannot be drawn inside a seat's
    own box (Player.vue) and stands in its own full-square overlay instead,
    the WhisperPlanes idiom one component over: geometry read fresh off the
    seats' rendered coins, pointer-transparent, pure ambience.

    WHO SEES IT: the ACTOR alone. Everything it reads is this client's own
    staged/echoed picks (night/myShownTargets) — a bystander's client holds
    none of this state, so there is nothing here to hide from them.

    THE DRESSES (per acting role, as their art lands):
      fortuneteller  the scrying thread — starlight strung between the TWO
                     picked coins. Staged: a dotted shimmer. Sealed: the
                     thread burns solid, one pulse travelling its length.

    Re-measured on every relevant change and on resize; the line is drawn in
    viewport pixels exactly as the planes fly in them.
  -->
  <div class="night-thread" aria-hidden="true" v-if="thread">
    <svg :style="svgStyle" :viewBox="viewBox" preserveAspectRatio="none">
      <line
        class="nt-line"
        :class="{ sealed: thread.sealed }"
        :x1="thread.x1"
        :y1="thread.y1"
        :x2="thread.x2"
        :y2="thread.y2"
        pathLength="1"
      />
      <line
        v-if="thread.sealed"
        class="nt-pulse"
        :x1="thread.x1"
        :y1="thread.y1"
        :x2="thread.x2"
        :y2="thread.y2"
        pathLength="1"
      />
    </svg>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";

/** The roles whose mark strings a thread, and how its ends are chosen. */
const THREADED = {
  // the Fortune Teller's two picks are the two ends
  fortuneteller: { from: "pick0", to: "pick1" },
};

export default {
  name: "NightThread",
  data() {
    return {
      // the measured line, or null while there is nothing to string
      thread: null,
      raf: 0,
    };
  },
  computed: {
    ...mapState(["session"]),
    ...mapGetters({
      call: "night/myCall",
      shown: "night/myShownTargets",
      locked: "night/myCallLocked",
    }),
    /** The ends this role wants, as seat indexes — or null. */
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
      return { a, b };
    },
    viewBox() {
      return `0 0 ${this.vw} ${this.vh}`;
    },
    svgStyle() {
      return { width: this.vw + "px", height: this.vh + "px" };
    },
    vw() {
      return (this.thread && this.thread.vw) || 0;
    },
    vh() {
      return (this.thread && this.thread.vh) || 0;
    },
  },
  watch: {
    ends: "measure",
    locked: "measure",
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
      const ends = this.ends;
      if (!ends) {
        this.thread = null;
        return;
      }
      // next tick: the picked coin's own marks may still be mounting
      this.$nextTick(() => {
        const from = this.coinCenter(ends.a);
        const to = this.coinCenter(ends.b);
        if (!from || !to) {
          this.thread = null;
          return;
        }
        this.thread = {
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          vw: window.innerWidth,
          vh: window.innerHeight,
          sealed: this.locked,
        };
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

// staged: a dotted shimmer, drawn on once (≤1s) and then at rest — beads
// drifting along it would be a loop, and a staged pick is a decision at
// rest (the FT-1384 animation contract).
.nt-line {
  stroke: $nt-star;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 0.012 0.024;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(217, 204, 255, 0.7));
  opacity: 0;
  animation: nt-string 0.6s ease-out both;

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
