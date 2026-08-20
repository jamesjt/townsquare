<template>
  <!-- ── THE CLOCK HANDS ON THE TOWN'S DIAL (FT-973) ────────────────────────
       The town square is played on a BLANK plate: `#app.in-game` paints
       `background-clocktower-blank-centered.png`, the art with no hands on it,
       while the entry screen keeps the painting's own hands. This layer is what
       puts moving hands back — and it is mounted `v-if="inGame"` in App.vue for
       exactly that reason. On the entry screen it must not exist at all, or the
       painted hands and these would both be standing there.

       WHAT DRIVES THEM: one number, `elapsedMs` — how long this phase has been
       running — turned into three angles by `handAngles` in
       src/golem/faceHands.js. See `phaseEpoch` below for where that number
       comes from today and the one line that changes when the real phase log
       lands.

       IT TAKES NO CLICKS, EVER. `pointer-events: none` on the layer, and none
       of the four parts turns it back on. The dial sits under the town's whole
       working surface — seats, the readout, the disc — and a decorative layer
       that could swallow a click on any of them would be a bug that only shows
       up as "the seat sometimes doesn't respond".

       WHERE IT SITS: z-index 0, a direct child of #app, mounted before
       `.backdrop`. These are PAINT, not furniture — the town's readout, seats
       and discs all belong over them, and the night veil dims them along with
       the art they lie on. z-index -1 was tried first and paints NOTHING; the
       stylesheet carries the measurement and the reason.

       ARIA-HIDDEN: it is decoration. The hands carry no reading a screen reader
       could use — the face has eight spokes, so they do not even tell the time
       (see faceHands.js). -->
  <div id="face-hands" aria-hidden="true" ref="layer">
    <div
      class="fh-part fh-hour"
      :style="{ backgroundImage: sprite('hour') }"
    ></div>
    <div
      class="fh-part fh-minute"
      :style="{ backgroundImage: sprite('minute') }"
    ></div>
    <div
      class="fh-part fh-second"
      :style="{ backgroundImage: sprite('second') }"
    ></div>
    <div
      class="fh-part fh-boss"
      :style="{ backgroundImage: sprite('boss') }"
    ></div>
  </div>
</template>

<script>
import {
  handAngles,
  handSprite,
  readFaceHandsStyle,
  readFaceHandsColorway,
  readFaceHandsFreeze,
  readFaceHandsMotion,
  readFaceHandsLab,
  overshootDegrees,
  FACE_HANDS_FROZEN,
  FACE_HANDS_EVENT,
} from "../golem/faceHands";

export default {
  name: "FaceHands",
  data() {
    return {
      /**
       * ── THE INPUT. THIS IS THE LINE THAT CHANGES. ─────────────────────────
       *
       * When the current phase began, in `performance.now()` milliseconds.
       * Everything the hands do is `now - phaseEpoch` handed to `handAngles`,
       * so this one assignment is the whole of "what drives the hands".
       *
       * WHY IT IS OBSERVED RATHER THAN READ. The app records no phase-start
       * timestamp anywhere — checked, not assumed: `toggleNight`
       * (src/store/index.js) flips `grimoire.isNight` and increments
       * `night.day` and stores no time, and the chronicle's entries carry
       * `day` and `phase` but no wall clock. So this component watches those
       * two values and re-stamps the epoch when either moves. That is the
       * brief's page-load fallback plus the one thing the client genuinely
       * knows: mount stamps it, and every phase flip after that re-stamps it.
       *
       * WHEN THE REAL PHASE LOG LANDS, this becomes a read of the recorded
       * start instead of a stamp, and NOTHING ELSE MOVES — not the watcher's
       * job, not `handAngles`, not one line of the stylesheet. The hands change
       * their SOURCE, not their behaviour.
       *
       * `performance.now()` rather than `Date.now()` deliberately: it is
       * monotonic, so a system clock correction or a DST step cannot make the
       * hands jump backwards or spin.
       */
      phaseEpoch: 0,
      /** The lab's three non-numeric picks, re-read on the lab's event. The
       *  nine numeric dials never come through here — they are custom
       *  properties on <html> and the stylesheet reads them directly. */
      style: readFaceHandsStyle(),
      colorway: readFaceHandsColorway(),
      frozen: readFaceHandsFreeze(),
      /** How the second hand moves: escapement / tick / sweep. A CHOICE, so it
       *  arrives on the lab's event rather than as a custom property. */
      motion: readFaceHandsMotion(),
      /** The escapement's peak overshoot, in degrees. The one NUMERIC dial read
       *  here rather than by the stylesheet — the tick is arithmetic, not a
       *  transform, so no custom property could carry it. */
      overshoot: overshootDegrees(readFaceHandsLab().overshoot),
      raf: 0,
    };
  },
  computed: {
    /** The phase, as the pair whose CHANGE marks a new one. Watched below. */
    phaseKey() {
      const s = this.$store && this.$store.state;
      if (!s) return "0:0";
      const night = s.night || {};
      const grimoire = s.grimoire || {};
      return (grimoire.isNight ? "n" : "d") + ":" + (night.day || 0);
    },
  },
  watch: {
    // A NEW PHASE RESTARTS THE COUNT. Both halves matter: the day/night flag
    // catches dusk and dawn, the day number catches a second night (the flag
    // is already true when it starts).
    phaseKey() {
      this.phaseEpoch = performance.now();
      this.tick();
    },
    frozen() {
      this.tick();
    },
  },
  mounted() {
    this.phaseEpoch = performance.now();
    window.addEventListener(FACE_HANDS_EVENT, this.readLab);
    this.loop();
  },
  beforeDestroy() {
    window.removeEventListener(FACE_HANDS_EVENT, this.readLab);
    if (this.raf) cancelAnimationFrame(this.raf);
  },
  methods: {
    /** The lab changed a pick. Storage is the single copy; re-read it. */
    readLab() {
      this.style = readFaceHandsStyle();
      this.colorway = readFaceHandsColorway();
      this.frozen = readFaceHandsFreeze();
      this.motion = readFaceHandsMotion();
      this.overshoot = overshootDegrees(readFaceHandsLab().overshoot);
      // A dial may have changed while the clock is stopped, and a frozen loop
      // is not coming back round to notice.
      this.tick();
    },
    sprite(part) {
      return "url(" + handSprite(this.style, this.colorway, part) + ")";
    },
    /**
     * ONE FRAME. Writes the three angles as custom properties STRAIGHT ONTO THE
     * LAYER, deliberately bypassing Vue's reactivity.
     *
     * WHY BYPASS IT: this runs 60 times a second, and a reactive style binding
     * would put a full render + patch of four elements on every one of those
     * frames for what is three string writes. The root carries no `:style`
     * binding at all, so Vue never touches its style attribute and cannot wipe
     * what is written here.
     *
     * The stylesheet composes these with the lab's `--fh-angle` offset, so the
     * Angle scrub works whether the clock is running or frozen.
     */
    tick() {
      const el = this.$refs.layer;
      if (!el) return;
      const a = this.frozen
        ? FACE_HANDS_FROZEN
        : handAngles(
            performance.now() - this.phaseEpoch,
            this.motion,
            this.overshoot,
          );
      // NOTHING REACTIVE IS WRITTEN HERE, on purpose — see the note above. The
      // angles are not held in `data` at all: a component field nothing renders
      // from would still take Vue's reactive setter sixty times a second to
      // notify no one.
      el.style.setProperty("--fh-hour-angle", a.hour + "deg");
      el.style.setProperty("--fh-minute-angle", a.minute + "deg");
      el.style.setProperty("--fh-second-angle", a.second + "deg");
    },
    /**
     * THE FRAME LOOP, and it STOPS DEAD WHEN FROZEN — one write, then no
     * further frames until the clock is started again. A lab that is being used
     * to judge a still image should not also be burning a frame callback a
     * sixtieth of a second to redraw the same three numbers.
     *
     * requestAnimationFrame rather than an interval, for the second hand: it is
     * a continuous sweep (nothing here is rounded or snapped — see
     * faceHands.js), so it wants the display's own cadence. rAF also pauses
     * itself in a hidden tab, which an interval would not.
     */
    loop() {
      this.tick();
      if (this.frozen) {
        this.raf = 0;
        return;
      }
      this.raf = requestAnimationFrame(this.loop);
    },
  },
};
</script>

<style scoped lang="scss">
/* ── WHERE THIS LAYER SITS IN THE STACK, AND WHY ─────────────────────────────
   z-index 0, a direct child of #app, mounted BEFORE `.backdrop`.

   ── z-index -1 WAS TRIED FIRST AND IT PAINTS NOTHING AT ALL ─────────────────
   Worth writing down, because the reasoning for it is seductive and wrong.
   The argument went: #app takes `container-type: size`, size containment
   implies LAYOUT containment, layout containment forms a stacking context, and
   a negative-z child of a stacking context paints above that element's own
   background — so -1 would put the hands on the dial art and under everything
   else. Every step of that is textbook, and the result is invisible hands.

   MEASURED, not reasoned (claude_temp_test/2026-08-20-ft973-zprobe.mjs — the
   layer swept through five z-indexes, each frame diffed against the same frame
   with the layer hidden, counting pixels the layer actually changes):

       z-index  -1  ->      0 px    invisible
       z-index   0  ->  3 962 px    PAINTS, under the readout and the seats
       z-index   1  ->  7 223 px    PAINTS, over the readout
       z-index   2  ->  7 223 px    identical to 1
       z-index  18  ->  7 223 px    identical to 1

   #app does NOT form a stacking context here, whatever the containment spec
   implies. So a negative-z child escapes to the ROOT context, where it lands
   beneath three opaque backgrounds — html, body and #app all paint
   `#0b0d12` plus the dial art — and is buried. The lesson generalises: on this
   element, negative z-index is not a "behind the furniture" slot, it is a hole.

   ── TABLE ABOVE IS STALE-DATED (2026-08-20, FT-995) ─────────────────────────
   Measured before the readout (`.info`) moved to z-index 2 (FT-975 era). Re-
   measured on the current tree by the FT-993 lane: z:1 and z:2 now behave
   IDENTICALLY to z:0 against the readout, and the hands only cross it at z:3+.
   The chosen slot (0) is still correct; "1 paints over the readout" is no
   longer the live threshold. The -1-is-a-hole finding is unaffected.

   ── WHY 0 AND NOT 1 ────────────────────────────────────────────────────────
   Those two rows differ by 3 261 pixels, and every one of them is a pixel where
   a blade would be drawn ON TOP OF THE TOWN READOUT — the script lockup, the
   living/dead counts, the day number, the End-day button. THE HANDS ARE PAINT,
   NOT FURNITURE: they stand in for hands painted into the entry screen's own
   background image, so the town's working surface belongs over them. 0 is the
   slot that says so.

   WHAT COVERS THEM, top to bottom: the dev labs (60+), the vote (20), the face
   disc surfaces (19), the seats (1..N), the dial letters (1, and entry-only
   anyway), the town readout `.info` (auto, later in DOM so it takes the tie)
   and the death stains `.blood-dial` (0, likewise).

   WHAT THEY COVER: the dial art, and the blood splat `.face-splat` (-1) —
   which is the one relationship this slot gets the wrong way round. Blood
   thrown on the dial ought to sit on top of the hands, and at -1 the splat is
   in the same hole this layer just climbed out of, so it cannot. Reported
   rather than fixed: layering was declared out of scope for this lane, and
   moving the splat is a change to something that was already on the dial.

   AND THE NIGHT VEIL IS WON BY DOM ORDER, NOT BY z-index. `.backdrop` (opacity
   .5 at night) is also stack level 0, so whichever comes later in App.vue's
   template paints on top. This layer is mounted BEFORE it deliberately, so the
   veil dims the hands along with the art they lie on — the same treatment the
   entry screen's painted hands get.

   MEASURED, because an ordering claim that is merely reasoned is the kind that
   turns out backwards (claude_temp_test/2026-08-20-ft973-veilorder2.mjs). The
   veil's gradient is fully opaque and only its `opacity` hides it, so forcing
   that to 1 is a binary test — if the veil is on top, the hands are buried:

       veil off (daytime, opacity 0)     3 936 px of hand
       veil at NIGHT strength (0.5)      3 615 px
       veil forced fully OPAQUE (1.0)        0 px    <- buried

   A WARNING FOR WHOEVER MEASURES THIS NEXT: `.backdrop::after` is an ANIMATED
   CLOUD layer, invisible at its daytime opacity 0. Forcing the veil opaque also
   switches the clouds on, and their drift changes ~35 000 px between any two
   consecutive screenshots — which swamps the few thousand the hands are worth
   and makes every configuration look identical. Stop animation before
   diffing anything against this element. The first three runs of that rig
   "proved" the exact opposite of the truth.

   WHAT IT OVERLAPS, stated plainly because the centre is busy: the boss and the
   innermost part of all three blades sit BEHIND the town readout's demon head.
   The blades run to 226 face-pixels against a 238 face-pixel face, so the great
   majority of each is in clear air past it. Nothing here moves anything that
   was already on the dial. */
/* ── THE PIVOT: WHERE THE DIAL ACTUALLY IS, WHICH IS NOT WHERE #app SAYS ─────
   The hands first shipped centred on `--face-cx` / `--face-cy` and read low and
   right of the dial. The cause is not in this layer's arithmetic — it is that
   THOSE TWO PROPERTIES DO NOT POINT AT THE DIAL.

   `--face-cx/cy` describe where the ART's centre is painted: the container
   centre, plus the +7px nudge `#app`'s background-position carries. That would
   be the dial's centre only if the dial were centred IN the art, which App.vue
   states it is ("the art is now 1642x900 with the dial's centre AT the image
   centre"). MEASURED, IT IS NOT.

   HOW IT WAS MEASURED (claude_temp_test/2026-08-20-ft973-combined.mjs). The
   centre of a circle is the point from which its edge lies at a CONSTANT
   radius, so: cast rays, take the radius of strongest luminance gradient at
   each angle, and pick the centre minimising the median absolute deviation of
   those radii. Done for TWO independent features of the dial at once — the
   inner glow edge (r=196) and the outer bronze rim (r=259) — because two
   concentric edges agreeing is far stronger than one edge fitted well:

       dial centre in the art   810, 430
       the art's own centre     821, 450
       OFFSET                   -11 x, -20 y   (art pixels)
       fit cost                 7.0 here vs 24.0 at the art's centre

   Two earlier methods failed and are worth naming so they are not retried:
   thresholding for a bright rim (there is no bright ring — it is a glowing DISC
   with a soft edge on a lit facade; the two background plates landed 10.8px
   apart) and 45° rotational symmetry (the facade dominates the polar samples;
   61px apart, one answer pinned to the search boundary). Both judged the dial
   against its surroundings; this one judges it against itself.

   WHY THE ERROR LOOKED LIKE 'down and right' SPECIFICALLY: at 1280x800 one
   face-pixel is 0.889px, so the dial sits 11 x 0.889 = 9.8px left and 20 x
   0.889 = 17.8px up of where `--face-cx/cy` claim — and the +7px background
   nudge pushes the claim a further 7px right. Net: the pivot stood ~10.9px
   right and ~19.3px below the paint. That is the reported symptom, arithmetic.

   IT IS EXPRESSED IN FACE-PIXELS AND SCALED BY `--fpx`, never in CSS pixels.
   The offset is a property of the ARTWORK, so it must scale with the artwork:
   a constant pixel nudge would be correct at exactly one viewport, which is the
   definition of having fixed the symptom.

   ── THIS IS A LOCAL FIX TO A SHARED FAULT, AND THAT IS DELIBERATE ───────────
   `--face-cx/cy` are wrong for EVERYTHING registered to them, not just for the
   hands — the four face discs read them too. Correcting them centrally is the
   better fix and it is what the face lab exists for, but it would silently move
   all four discs, whose positions were dialled by eye and baked across three
   passes (FT-888 / FT-935) AGAINST the current value. That is a re-bake, not a
   side effect of a hands lane. Reported rather than done. */
#face-hands {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* the measured art offset, in face-pixels — see the block above */
  --fh-art-dx: -11;
  --fh-art-dy: -20;
  /* …plus the lab's nudge, which defaults to zero, so the lab being absent
     computes to exactly the measurement */
  --fh-cx: calc(
    var(--face-cx) + (var(--fh-art-dx) + var(--fh-centre-x, 0)) * var(--fpx)
  );
  --fh-cy: calc(
    var(--face-cy) + (var(--fh-art-dy) + var(--fh-centre-y, 0)) * var(--fpx)
  );
  /* NEVER TAKES A CLICK. The layer covers the entire face — the seats, the
     readout and the disc all sit inside its box — so this is not a nicety.
     None of the four parts turns it back on. */
  pointer-events: none;
  opacity: var(--fh-opacity, 1);
}

/* Each part is a square of SPRITE face-pixels centred on the face's own
   published centre, with the pivot at its middle.

   THE MARGINS DO THE CENTRING, not a translate(-50%, -50%) inside `transform`.
   `transform` here carries rotation and scale only, so `transform-origin:
   center` means the sprite's own pivot and nothing has to be composed around a
   translation. That pivot is (0.5, 0.5) of the sprite, which FT-968 verified
   against the bronze rim as the face's true rotation centre.

   `--face-cx` / `--face-cy` / `--fpx` are #app's own published face geometry
   (App.vue). Reading them is what makes this layer follow the art at every
   viewport, and follow the face lab's background nudges for free. */
.fh-part {
  position: absolute;
  /* the MEASURED dial centre, not `--face-cx/cy` — see the block above */
  left: var(--fh-cx);
  top: var(--fh-cy);
  /* 480 face-pixels: the span the sprites were baked to. The PNG is 960px —
     2x, so it stays crisp on a hi-DPI display at a large viewport. */
  width: calc(480 * var(--fpx));
  height: calc(480 * var(--fpx));
  margin-left: calc(-240 * var(--fpx));
  margin-top: calc(-240 * var(--fpx));
  background-repeat: no-repeat;
  background-position: center;
  /* the sprite is square and so is the box, so this is exact rather than a fit */
  background-size: 100% 100%;
  transform-origin: center;
  will-change: transform;
}

/* ROTATE THEN SCALE. CSS applies these right-to-left, so the upward-pointing
   sprite is scaled along its OWN axes first — X across the blade, Y along it —
   and the result is then rotated. Scaling after rotation would stretch the hand
   along the screen's axes instead of its own, which shears it at every angle
   that is not a multiple of 90.

   `--fh-angle` is the lab's assembly-wide offset and is added to all three, so
   the Angle scrub spins the whole arrangement rigidly whether the clock is
   running or frozen. Every var carries the identity as its fallback, so with
   the lab absent — `devLabs` off, storage cleared — this computes to exactly
   the baked art. */
.fh-hour {
  transform: rotate(calc(var(--fh-hour-angle, 0deg) + var(--fh-angle, 0deg)))
    scale(var(--fh-hour-wid, 1), var(--fh-hour-len, 1));
}
.fh-minute {
  transform: rotate(calc(var(--fh-minute-angle, 0deg) + var(--fh-angle, 0deg)))
    scale(var(--fh-minute-wid, 1), var(--fh-minute-len, 1));
}
.fh-second {
  transform: rotate(calc(var(--fh-second-angle, 0deg) + var(--fh-angle, 0deg)))
    scale(var(--fh-second-wid, 1), var(--fh-second-len, 1));
}
/* THE HUB TURNS WITH NOTHING. It is radially symmetric, so a rotation would be
   a transform that costs a composite layer and changes not one pixel. It is a
   separate sprite from the blades on purpose: the hub and the sweeping hands
   may want different stacking later. */
.fh-boss {
  transform: scale(var(--fh-boss, 1));
}
</style>
