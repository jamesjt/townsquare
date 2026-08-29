<template>
  <!--
    Golem fork (FT-1206): THE AIRPORT — every whisper between two players is a
    small paper airplane flying from the sender's coin to the recipient's, on
    EVERY browser in the town. One plane per message, no batching (the user:
    "an airport is fine"); several in the air at once simply stack.

    WHAT THIS KNOWS is exactly what the wire carries: two seat numbers.
    Content, names and accounts never reach this component — the mark frame is
    metadata-only by contract (golem/whisperMarks), and the whisper itself
    travels its own private lane.

    GEOMETRY IS READ FRESH PER PLANE off the seats' own rendered coins, the
    same way SeatRing reads its obstacles: a plane launched after a zoom or a
    seat shuffle flies between the coins as they are NOW. The whole overlay is
    pointer-transparent — planes are ambience, never controls.

    THE FLIGHT is one transform transition; the REST is a hold beside the
    recipient's coin for the town's configured linger (towerBells'
    whisperMarkSec — synced, so every browser holds the same beat); the END is
    a fade. `prefers-reduced-motion` skips the flight entirely: the mark
    appears at rest, holds, and goes — the information without the travel.
  -->
  <div class="whisper-planes" aria-hidden="true">
    <div v-for="p in planes" :key="p.id" class="wp-plane" :style="p.style">
      <svg viewBox="0 0 24 24">
        <path class="wp-body" d="M22.8 2.2 1.6 10.9l6 2.5L22.8 2.2Z" />
        <path
          class="wp-body"
          d="M22.8 2.2 9.2 14.8l.3 6.4 3-4.4 5.6-2.2 4.7-12.4Z"
        />
        <path class="wp-fold" d="M9.2 14.8 22.8 2.2 12.2 16.4l-3-1.6Z" />
      </svg>
    </div>
  </div>
</template>

<script>
import {
  WHISPER_MARK_EVENT,
  MARK_FLIGHT_MS,
  MARK_FADE_MS,
} from "../golem/whisperMarks";
import { towerState } from "../golem/towerBells";

/** The plane's box, px — reads at a glance without covering a coin. */
const SIZE = 26;

export default {
  data() {
    return { planes: [], nextId: 1 };
  },
  mounted() {
    window.addEventListener(WHISPER_MARK_EVENT, this.onMark);
  },
  beforeDestroy() {
    window.removeEventListener(WHISPER_MARK_EVENT, this.onMark);
    this.planes.forEach((p) => p.timers.forEach(clearTimeout));
  },
  methods: {
    /** The center of one seat's coin, in viewport pixels, or null. */
    coinCenter(seat) {
      const li = document.querySelectorAll("#townsquare .circle > li")[seat];
      const coin = li && li.querySelector(".player .token");
      if (!coin) return null;
      const b = coin.getBoundingClientRect();
      if (!b.width) return null;
      return {
        x: b.left + b.width / 2,
        y: b.top + b.height / 2,
        r: Math.min(b.width, b.height) / 2,
      };
    },
    onMark(e) {
      const mark = e && e.detail;
      if (!mark) return;
      const from = this.coinCenter(mark.from);
      const to = this.coinCenter(mark.to);
      if (!from || !to) return;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      // rest just off the recipient's rim, on the incoming side, with a
      // small per-plane jitter so a busy pair's planes pile rather than
      // vanish into one another
      const jitter = (Math.random() - 0.5) * 14;
      const rest = {
        x: to.x - ux * (to.r + 10) - uy * jitter,
        y: to.y - uy * (to.r + 10) + ux * jitter,
      };
      const rot = (Math.atan2(dy, dx) * 180) / Math.PI;
      const at = (p) =>
        `translate(${Math.round(p.x - SIZE / 2)}px, ${Math.round(
          p.y - SIZE / 2,
        )}px) rotate(${Math.round(rot)}deg)`;
      let reduced = false;
      try {
        reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (err) {
        reduced = false;
      }
      const id = this.nextId++;
      const plane = {
        id,
        timers: [],
        style: {
          width: `${SIZE}px`,
          height: `${SIZE}px`,
          transform: at(reduced ? rest : from),
          opacity: 1,
          transition: "none",
        },
      };
      this.planes.push(plane);
      const flight = reduced ? 0 : MARK_FLIGHT_MS;
      if (!reduced) {
        // two frames: the first paints the plane at the sender's coin, the
        // second arms the transition and points it at the rest position
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            plane.style = {
              ...plane.style,
              transform: at(rest),
              transition: `transform ${MARK_FLIGHT_MS}ms cubic-bezier(0.3, 0, 0.45, 1)`,
            };
          }),
        );
      }
      // the linger is the town's own setting, read at LAUNCH so a plane in
      // the air keeps the beat it took off under
      const linger = Math.max(0, towerState.whisperMarkSec) * 1000;
      plane.timers.push(
        setTimeout(() => {
          plane.style = {
            ...plane.style,
            opacity: 0,
            transition: `opacity ${MARK_FADE_MS}ms ease-out`,
          };
        }, flight + linger),
      );
      plane.timers.push(
        setTimeout(
          () => {
            this.planes = this.planes.filter((q) => q.id !== id);
          },
          flight + linger + MARK_FADE_MS,
        ),
      );
    },
  },
};
</script>

<style lang="scss">
.whisper-planes {
  position: fixed;
  inset: 0;
  /* ambience, never a control — the whole sky is pointer-transparent */
  pointer-events: none;
  /* FT-1316 (user: the plane dove under the coins): THE SKY IS THE TOP.
     This shipped at 70 — over the ring, under the menu plates (201) — and
     the plates are exactly what stands ON a coin at the moment a plane
     lands: whisper a seat from its plate and the SeatWhisper box (201) is
     still up when the plane arrives, so the delivery slid UNDER the seat it
     was delivering to (measured: elementsFromPoint at the rest point put
     `seat-whisper` first — claude_temp_test/2026-08-29-ft1315-16-plane-
     plate.mjs; the bare ring was never the problem, 70 already cleared it).
     205 clears the whole plate family (SeatMenu / SeatRing / SeatWhisper,
     201, the app's highest slots) — a plane is 26px of pointer-transparent
     paper alive for a second or two, and nothing it crosses stops working
     under it. */
  z-index: 205;
}

.wp-plane {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform, opacity;

  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7));
  }

  /* the fork's bone-warm paper, not printer white — the note the toast
     unfolds into wears the same stock */
  .wp-body {
    fill: #e6dcc4;
  }
  .wp-fold {
    fill: #b8ac8e;
  }
}
</style>
