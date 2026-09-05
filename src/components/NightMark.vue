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
  </span>
</template>

<script>
/** The roles whose art has landed — grows one commit at a time (FT-1384's
 *  role-by-role order: monk, poisoner, fortuneteller, butler, imp,
 *  ravenkeeper). Everything else renders nothing and keeps the app's
 *  standing purple idiom. */
const HAS_ART = ["monk"];

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

// The information without the travel: every mark appears at rest.
@media (prefers-reduced-motion: reduce) {
  .nm *,
  .nm svg * {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
</style>
