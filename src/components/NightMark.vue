<template>
  <!--
    Golem fork (FT-1384): THE NIGHT MARKS — each acting character's own dress
    on the coins while the night is asking, staged, and sealed.

    THREE STATES, one word each, decided entirely by Player.vue
    (nightMarkState) so this file is a RENDERER and never a second rules
    engine:

      invite   state 1 — the night wants a pick and this coin can take it.
               The one treatment allowed to LOOP (the breathe), because an
               invitation that stops moving stops inviting.
      staged   state 2 — the pick has settled here, still movable. The mark
               arrives in one short motion (≤1s) and then HOLDS; nothing
               loops, because a staged pick is a decision at rest.
      sealed   state 3 — the Confirm was pressed (or the storyteller's answer
               landed). The role's seal plays ONCE (≤1s) and holds until the
               storyteller re-asks. This is the receipt now — the FT-1330
               receive-only sentences stood down in its favour.

    THE ART REGISTER is the 2026-09-04 concept strips
    (claude_temp_test/2026-09-04-nightstates-shots/concept-*.png): dark
    bodies, one hot rim light, organic edges. Colours are each role's own —
    the Monk's white-gold, the Poisoner's sick green — never the team blues
    and reds (a night mark must not say what anyone IS; the FT-1150 rule).

    A ROLE WITHOUT AUTHORED ART RENDERS NOTHING — the purple ring idiom in
    Player.vue still dresses every un-authored character exactly as before
    this card. Roles land here one commit at a time (Monk first, the
    reference), so `HAS_ART` is the registry the template branches read.

    GEOMETRY: one SVG filling the coin's round box, with headroom above it
    (the viewBox starts at -20) because several marks live at the coin's
    shoulder — the Monk's halo hovers ABOVE the rim before it lands.
    pointer-events are off on everything: the mark never intercepts the tap
    it is decorating.
  -->
  <span
    v-if="hasArt"
    class="nm"
    :class="['nm-' + state, 'nm-' + roleId]"
    aria-hidden="true"
  >
    <!-- ── MONK — THE HALO (protection descends) ─────────────────────────
         invite: a rosary-bead ring breathes on every legal coin.
         staged: the halo hovers over the picked coin, rays waking.
         sealed: the halo DROPS onto the coin and rings once like a struck
                 bell, then holds as a solid ring + a soft dome of light. -->
    <svg v-if="roleId === 'monk'" viewBox="0 -24 100 124">
      <template v-if="state === 'invite'">
        <!-- r=38: INSIDE the coin's own gear teeth (which live at the rim
             and are the same brass as a bead at r=45 — measured invisible,
             first probe shot). On the coin's darker inner field the beads
             read. -->
        <circle class="mk-beads" cx="50" cy="50" r="38" />
      </template>
      <template v-else-if="state === 'staged'">
        <g class="mk-hover">
          <ellipse class="mk-halo" cx="50" cy="-8" rx="21" ry="6" />
          <path class="mk-ray" d="M50 -20 l0 -5" />
          <path class="mk-ray mk-ray2" d="M32 -14 l-4 -3" />
          <path class="mk-ray mk-ray3" d="M68 -14 l4 -3" />
        </g>
      </template>
      <template v-else-if="state === 'sealed'">
        <!-- the bell-flash: one expanding ring that burns out -->
        <circle class="mk-toll" cx="50" cy="50" r="45" />
        <!-- the dome of light, held -->
        <path
          class="mk-dome"
          d="M 8 50 A 42 42 0 0 1 92 50 L 86 50 A 36 36 0 0 0 14 50 Z"
        />
        <!-- the halo, landed on the rim -->
        <ellipse class="mk-halo mk-landed" cx="50" cy="2" rx="19" ry="5.5" />
        <!-- the solid ring the seal holds as -->
        <circle class="mk-seal-ring" cx="50" cy="50" r="45" />
      </template>
    </svg>

    <!-- ── POISONER — THE SEEP (venom takes the rim) ─────────────────────
         invite: a sick-green seep ring breathes on every legal coin, one
                 bright bead slowly circling it (the state-1 loop).
         staged: venom crawls over the chosen coin's crown — an arc seeps on
                 once, three drips run down and HOLD, mid-crawl.
         sealed: the seep completes the circle in one smooth sweep and goes
                 STILL; the drips harden; the skull wisp fades in last. -->
    <svg v-else-if="roleId === 'poisoner'" viewBox="0 -24 100 124">
      <template v-if="state === 'invite'">
        <circle class="ps-seep-ring" cx="50" cy="50" r="38" />
        <circle class="ps-bead" cx="50" cy="50" r="38" pathLength="1" />
      </template>
      <template v-else-if="state === 'staged'">
        <path class="ps-arc" d="M 14 34 A 38 38 0 0 1 86 34" pathLength="1" />
        <path class="ps-drip ps-d1" d="M 30 22 q 1.5 9 0 15" pathLength="1" />
        <path class="ps-drip ps-d2" d="M 50 13 q -1 12 0.5 21" pathLength="1" />
        <path class="ps-drip ps-d3" d="M 68 20 q 1 7 -0.5 12" pathLength="1" />
        <circle class="ps-bubble ps-b1" cx="30" cy="39" r="1.8" />
        <circle class="ps-bubble ps-b2" cx="50.5" cy="36" r="2.2" />
        <circle class="ps-bubble ps-b3" cx="67.5" cy="34" r="1.6" />
      </template>
      <template v-else-if="state === 'sealed'">
        <circle class="ps-seal-ring" cx="50" cy="50" r="41" pathLength="1" />
        <path class="ps-drip ps-hard ps-d1" d="M 30 22 q 1.5 9 0 15" />
        <path class="ps-drip ps-hard ps-d2" d="M 50 13 q -1 12 0.5 21" />
        <path class="ps-drip ps-hard ps-d3" d="M 68 20 q 1 7 -0.5 12" />
        <!-- the skull wisp — dark body, hot green rim light, last to arrive -->
        <g class="ps-skull">
          <path
            d="M 50 -18 a 7.5 7 0 0 1 7.5 7 c 0 3 -1.6 4.6 -3.2 5.6
               l 0 2.6 a 1.4 1.4 0 0 1 -1.4 1.4 l -5.8 0 a 1.4 1.4 0 0 1
               -1.4 -1.4 l 0 -2.6 c -1.6 -1 -3.2 -2.6 -3.2 -5.6 a 7.5 7 0
               0 1 7.5 -7 z"
          />
          <circle class="ps-eye" cx="47" cy="-10.5" r="1.7" />
          <circle class="ps-eye" cx="53" cy="-10.5" r="1.7" />
        </g>
      </template>
    </svg>

    <!-- ── FORTUNE TELLER — THE SCRYING THREAD (two coins, one question) ──
         invite: sparkles wink in and out around every legal coin.
         staged: a starlight crescent veils each picked coin; the dotted
                 thread between the two is NightThread.vue's (it lives
                 between coins, not on one).
         sealed: the eye opens on the coin and stays open; the thread burns
                 solid one component over. -->
    <svg v-else-if="roleId === 'fortuneteller'" viewBox="0 -24 100 124">
      <template v-if="state === 'invite'">
        <path class="ft-spark ft-s1" :d="star(15, 26, 3.2)" />
        <path class="ft-spark ft-s2" :d="star(84, 20, 2.6)" />
        <path class="ft-spark ft-s3" :d="star(74, 82, 3)" />
        <path class="ft-spark ft-s4" :d="star(22, 76, 2.2)" />
      </template>
      <template v-else-if="state === 'staged'">
        <!-- a lune hugging the coin's upper-left rim: the outer arc rides
             the coin's own circle (r≈44 on c 50,50), the inner arc cuts
             back shallower (r=33), so the veil is thickest at its middle —
             a real crescent, not a hairline (the first draw measured
             invisible under the staged ring). -->
        <path
          class="ft-crescent"
          d="M 19 19 A 44 44 0 0 0 10 63 A 33 33 0 0 1 19 19 Z"
        />
        <path class="ft-spark ft-held ft-s1" :d="star(20, 14, 2.8)" />
        <path class="ft-spark ft-held ft-s3" :d="star(9, 68, 2.2)" />
      </template>
      <template v-else-if="state === 'sealed'">
        <g class="ft-eye">
          <path class="ft-lid" d="M 32 8 Q 50 -6 68 8 Q 50 22 32 8 Z" />
          <circle class="ft-iris" cx="50" cy="8" r="4.6" />
          <circle class="ft-pupil" cx="50" cy="8" r="2" />
        </g>
      </template>
    </svg>
  </span>
</template>

<script>
/** The roles whose art has landed — grows one commit at a time (FT-1384's
 *  role-by-role order: monk, poisoner, fortuneteller, butler, imp,
 *  ravenkeeper). Everything else renders nothing and keeps the app's
 *  standing purple idiom. */
const HAS_ART = ["monk", "poisoner", "fortuneteller"];

export default {
  name: "NightMark",
  props: {
    roleId: {
      type: String,
      required: true,
    },
    /** "invite" | "staged" | "sealed" — Player.vue's nightMarkState. */
    state: {
      type: String,
      required: true,
    },
  },
  computed: {
    hasArt() {
      return HAS_ART.includes(this.roleId) && !!this.state;
    },
  },
  methods: {
    /** A four-point star path at (cx, cy), radius r — the Fortune Teller's
     *  sparkles. Geometry in the template stays declarative; only the shape
     *  maths lives here. */
    star(cx, cy, r) {
      const w = r * 0.28;
      return (
        `M ${cx} ${cy - r} L ${cx + w} ${cy - w} L ${cx + r} ${cy} ` +
        `L ${cx + w} ${cy + w} L ${cx} ${cy + r} L ${cx - w} ${cy + w} ` +
        `L ${cx - r} ${cy} L ${cx - w} ${cy - w} Z`
      );
    },
  },
};
</script>

<style scoped lang="scss">
// The mark fills the night-pick box (the coin's square) and spills 24 units
// of headroom above it for shoulder-borne art. Never a control.
.nm {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  svg {
    position: absolute;
    left: 0;
    // 124 viewBox units on a 100-unit-wide box; the extra 24 sit above.
    top: -24%;
    width: 100%;
    height: 124%;
    overflow: visible;
  }
}

// ── THE MONK'S PALETTE ──────────────────────────────────────────────────
// White-gold — hotter and paler than the coins' brass so it reads as LIGHT
// laid on metal, with a dark under-shadow doing the edge work the way every
// bright mark on this dial does (the vote marks' halo rule).
$mk-gold: #ffe9b0;
$mk-gold-hot: #fff6dc;

// state 1 — the rosary beads. Dotted ring just inside the rim, breathing by
// opacity. THE ONE LOOP THIS FILE IS ALLOWED (the invite breathe).
.mk-beads {
  fill: none;
  stroke: $mk-gold-hot;
  stroke-width: 3.4;
  stroke-linecap: round;
  // 0.1-long dashes with round caps read as beads, not dashes
  stroke-dasharray: 0.1 6.9;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 5px rgba(255, 233, 176, 0.8));
  animation: mk-breathe 2s ease-in-out infinite alternate;
}

// a frame caught at the bottom of the cycle still reads — the
// seat-move-invite rule, kept here for every breathe that follows
@keyframes mk-breathe {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}

// state 2 — the halo hovers over the chosen coin. One settle-in (≤0.6s),
// then it HOLDS; the rays wake once with it.
.mk-halo {
  fill: none;
  stroke: $mk-gold-hot;
  stroke-width: 3;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.85))
    drop-shadow(0 0 6px rgba(255, 233, 176, 0.8));
}

.mk-hover {
  animation: mk-hover-in 0.6s ease-out both;
}

@keyframes mk-hover-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mk-ray {
  stroke: $mk-gold-hot;
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0;
  animation: mk-ray-wake 0.5s ease-out 0.35s both;
  &.mk-ray2 {
    animation-delay: 0.45s;
  }
  &.mk-ray3 {
    animation-delay: 0.55s;
  }
}

@keyframes mk-ray-wake {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.85;
  }
}

// state 3 — the seal. The halo drops the last stretch onto the rim, the
// bell-flash rings ONCE (an expanding ring that burns out), and what holds
// is a solid ring plus a soft dome of light over the coin's crown.
.mk-landed {
  animation: mk-halo-land 0.45s ease-in both;
}

@keyframes mk-halo-land {
  from {
    opacity: 0;
    transform: translateY(-14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mk-toll {
  fill: none;
  stroke: $mk-gold-hot;
  stroke-width: 3;
  transform-origin: 50px 50px;
  animation: mk-toll-once 0.8s ease-out 0.3s both;
}

@keyframes mk-toll-once {
  from {
    opacity: 0.95;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.22);
  }
}

.mk-dome {
  fill: $mk-gold;
  opacity: 0;
  animation: mk-dome-in 0.5s ease-out 0.45s both;
}

@keyframes mk-dome-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.5;
  }
}

.mk-seal-ring {
  fill: none;
  stroke: $mk-gold;
  stroke-width: 2.4;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.85))
    drop-shadow(0 0 7px rgba(255, 233, 176, 0.7));
  opacity: 0;
  animation: mk-seal-hold 0.45s ease-out 0.4s both;
}

@keyframes mk-seal-hold {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.9;
  }
}

// ── THE POISONER'S PALETTE ──────────────────────────────────────────────
// Sick toxic green — nothing else on the square speaks it (the yes-chip's
// #7ed67e is a leaf green and lives only in answer pills), so venom cannot
// be mistaken for anything benign.
$ps-green: #8fe33c;
$ps-green-hot: #c8ff6e;
$ps-dark: #24350f;

// state 1 — the seep ring breathes, and one bright bead slowly rounds it.
.ps-seep-ring {
  fill: none;
  stroke: $ps-green;
  stroke-width: 2.4;
  stroke-dasharray: 5 4;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 5px rgba(143, 227, 60, 0.7));
  animation: mk-breathe 2s ease-in-out infinite alternate;
}

.ps-bead {
  fill: none;
  stroke: $ps-green-hot;
  stroke-width: 3.6;
  stroke-linecap: round;
  stroke-dasharray: 0.045 0.955;
  filter: drop-shadow(0 0 4px rgba(200, 255, 110, 0.9));
  animation: ps-round 6s linear infinite;
}

@keyframes ps-round {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -1;
  }
}

// state 2 — the crawl-on: the crown arc seeps in first, the drips run down
// after it, the bubbles surface last. Everything lands inside a second and
// HOLDS mid-crawl (the no-loop rule for a decision at rest).
.ps-arc {
  fill: none;
  stroke: $ps-green;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 6px rgba(143, 227, 60, 0.75));
  animation: ps-crawl 0.55s ease-out both;
}

.ps-drip {
  fill: none;
  stroke: $ps-green;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(143, 227, 60, 0.65));
  animation: ps-crawl 0.5s ease-in 0.35s both;
  &.ps-d2 {
    animation-delay: 0.45s;
  }
  &.ps-d3 {
    animation-delay: 0.55s;
  }
}

@keyframes ps-crawl {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.ps-bubble {
  fill: $ps-green-hot;
  opacity: 0;
  animation: ps-surface 0.35s ease-out 0.75s both;
  &.ps-b2 {
    animation-delay: 0.85s;
  }
  &.ps-b3 {
    animation-delay: 0.95s;
  }
}

@keyframes ps-surface {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 0.95;
    transform: translateY(0);
  }
}

// state 3 — the seal: one smooth sweep closes the circle and goes STILL.
// The drips arrive already hardened (brighter, no crawl); the skull wisp
// fades in last, dark-bodied with the hot rim doing the reading.
.ps-seal-ring {
  fill: none;
  stroke: $ps-green;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 8px rgba(143, 227, 60, 0.8));
  animation: ps-sweep 0.8s ease-in-out both;
}

@keyframes ps-sweep {
  from {
    stroke-dashoffset: 1;
    opacity: 0.7;
  }
  to {
    stroke-dashoffset: 0;
    opacity: 0.95;
  }
}

.ps-hard {
  stroke: $ps-green-hot;
  stroke-width: 2.8;
  animation: mk-seal-hold 0.3s ease-out 0.5s both;
}

.ps-skull {
  path {
    fill: $ps-dark;
    stroke: $ps-green-hot;
    stroke-width: 1.4;
    filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 4px rgba(200, 255, 110, 0.7));
  }
  .ps-eye {
    fill: $ps-green-hot;
  }
  opacity: 0;
  animation: ps-wisp 0.45s ease-out 0.75s both;
}

@keyframes ps-wisp {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 0.92;
    transform: translateY(0);
  }
}

// ── THE FORTUNE TELLER'S PALETTE ────────────────────────────────────────
// Starlight — the thread's own pale violet-white (NightThread.vue), so the
// coin marks and the line between them read as one act.
$ft-star: #d9ccff;
$ft-star-hot: #f4eeff;

// state 1 — sparkles wink in and out around the coin. The state-1 loop.
.ft-spark {
  fill: $ft-star-hot;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(217, 204, 255, 0.85));
  animation: ft-wink 2s ease-in-out infinite;
  &.ft-s2 {
    animation-delay: 0.5s;
  }
  &.ft-s3 {
    animation-delay: 1s;
  }
  &.ft-s4 {
    animation-delay: 1.5s;
  }
}

@keyframes ft-wink {
  0%,
  100% {
    opacity: 0.15;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

// staged sparkles hold still beside the crescent — no loop at rest.
.ft-spark.ft-held {
  animation: mk-seal-hold 0.4s ease-out 0.3s both;
}

// state 2 — the crescent veils the picked coin's shoulder, one settle-in.
.ft-crescent {
  fill: $ft-star;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 6px rgba(217, 204, 255, 0.8));
  animation: ft-veil 0.6s ease-out both;
}

@keyframes ft-veil {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 0.92;
    transform: translateY(0);
  }
}

// state 3 — the eye OPENS and stays open: lids part (a scaleY unfold), the
// iris arrives with them. Dark pupil, hot rim — the register's rule.
.ft-eye {
  transform-origin: 50px 8px;
  animation: ft-open 0.55s ease-out 0.2s both;

  .ft-lid {
    fill: rgba(20, 14, 40, 0.85);
    stroke: $ft-star-hot;
    stroke-width: 1.6;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 6px rgba(244, 238, 255, 0.8));
  }
  .ft-iris {
    fill: $ft-star;
  }
  .ft-pupil {
    fill: #14092c;
  }
}

@keyframes ft-open {
  from {
    opacity: 0;
    transform: scaleY(0.1);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

// The information without the travel: every mark appears at rest.
@media (prefers-reduced-motion: reduce) {
  .nm *,
  .nm svg * {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
</style>
