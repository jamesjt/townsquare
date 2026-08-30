<template>
  <!-- ── THE CLOCK-HANDS LAB (Fh) ───────────────────────────────────────────
       Nine scrubs, a four-way style switch, a two-way colourway switch and a
       Freeze, all of which drive the hands on the town's dial. See
       `src/golem/faceHands.js` for what each dial does and why its bounds are
       where they are, and `src/components/FaceHands.vue` for the layer they
       move.

       THE FIFTH DOOR in App.vue's dev column (drip 8px, coin 96px, face 140px,
       disc 184px, this 228px), wearing the same shell as the other four so they
       read as one toolkit rather than five inventions.

       BEHIND `devLabs`, like the rest of the column. The disc lab was hidden on
       the user's call precisely because a visible dev toggle was landing on top
       of real controls, and a sixth visible door would be the same mistake
       again.

       FOUR GROUPS, LABELLED — Art (which hands), Hands (the three blades),
       Centre (the hub and the whole layer's opacity) and Motion. Eleven
       unlabelled controls in one column read as one list of eleven rather than
       as four tools; the headings cost four lines and are the difference. Same
       reasoning, same shell, as the disc lab's Geometry / Glass split.

       THE LABELS ARE WORDS, not initials — "we don't need to abbreviate
       things, just tell me what they are" (user, 2026-08-19), the standing call
       the disc lab's label column was widened for. "Minute length" is the
       widest of them, which is what sets the label column below.

       EVERY SCRUB IS AN OFFSET against the baked sprite, so zero IS what ships
       in all nine and Reset is a real return — not an approximation of one.
       That invariant is load-bearing rather than tidy: this panel sits in the
       shipped bundle, so if a zero-scrub were even slightly not the baked art,
       the lab's mere PRESENCE would have re-tuned the hands for everyone.

       The toggle is a real <button>, not a <div> — it costs nothing and it is
       the difference between a control reachable by keyboard and one that is
       not. -->
  <div id="face-hands-lab" :class="{ open: fhLabOpen }">
    <button
      type="button"
      class="fh-toggle"
      title="Clock hands lab — style and colourway, each hand's length and width, the centre boss, opacity, and an angle scrub that spins the whole assembly so the art can be judged at rest"
      :aria-expanded="String(fhLabOpen)"
      @click="fhLabOpen = !fhLabOpen"
    >
      Clock-hands lab
    </button>
    <div class="fl-rows" v-if="fhLabOpen">
      <!-- ── ART: WHICH HANDS ARE ON THE DIAL ─────────────────────────────
           All four styles ship as sprites so this switch can reach them. A
           switch that could only reach the pick we already made cannot show
           you what the others are — the same argument the disc lab's glass
           presets make. The shipped pick is marked so the panel always says
           where home is. -->
      <div class="fl-head">
        Art
        <span class="fl-phase">{{ fhStyleLabel }}</span>
      </div>
      <div class="fl-presets">
        <button
          type="button"
          v-for="s in fhStyles"
          :key="s.id"
          class="fl-preset"
          :class="{ on: fhStyle === s.id }"
          :title="s.hint"
          @click="setFhStyle(s.id)"
        >
          {{ s.label
          }}<span class="fl-ships" v-if="s.id === 'cathedral'">ships</span>
        </button>
      </div>
      <!-- DARK SHIPS. Gilt solves the on-spoke read for every style and
           weakens it everywhere else — gold on a gold dial — so it is an
           option here and never the default. -->
      <div class="fl-presets fl-row-pair">
        <button
          type="button"
          v-for="c in fhColorways"
          :key="c.id"
          class="fl-preset"
          :class="{ on: fhColorway === c.id }"
          :title="c.hint"
          @click="setFhColorway(c.id)"
        >
          {{ c.label }}
        </button>
      </div>

      <!-- ── THE THREE BLADES ─────────────────────────────────────────────
           Length in face-pixels (the face's own radius is 238, so the numbers
           are directly comparable to it); width in percent, because a blade is
           1.3–14 face-pixels wide and NumberScrub is an integer control — an
           integer px dial would jump the second hand 3 → 4 with nothing
           reachable between. -->
      <!-- ── ALIGNMENT ────────────────────────────────────────────────────
           Where the pivot sits, in face-pixels off the MEASURED dial centre.
           Zero is the measurement (art offset -11, -20; see FaceHands.vue),
           not the app's `--face-cx/cy`, which point at the ART's centre and
           are ~11 x 20 face-pixels off the paint. These exist so the
           measurement can be checked by eye rather than merely trusted. -->
      <div class="fl-head">Alignment</div>
      <div class="fl-row" v-for="d in fhAlignDials" :key="d.key">
        <span class="fl-label" :title="d.hint">{{ d.label }}</span>
        <NumberScrub
          :value="fhLab[d.key]"
          :min="d.min"
          :max="d.max"
          :title="d.hint"
          @input="setFhLab(d.key, $event)"
        />
      </div>

      <div class="fl-head">Hands</div>
      <div class="fl-row" v-for="d in fhHandDials" :key="d.key">
        <span class="fl-label" :title="d.hint">{{ d.label }}</span>
        <NumberScrub
          :value="fhLab[d.key]"
          :min="d.min"
          :max="d.max"
          :title="d.hint"
          @input="setFhLab(d.key, $event)"
        />
      </div>

      <div class="fl-head">Centre</div>
      <div class="fl-row" v-for="d in fhCentreDials" :key="d.key">
        <span class="fl-label" :title="d.hint">{{ d.label }}</span>
        <NumberScrub
          :value="fhLab[d.key]"
          :min="d.min"
          :max="d.max"
          :title="d.hint"
          @input="setFhLab(d.key, $event)"
        />
      </div>

      <!-- ── MOTION: JUDGE THE ART AT REST ────────────────────────────────
           Freeze stops the clock and stands the three hands in the FT-968
           contact sheet's own spread — the arrangement every candidate style
           was judged at — so the pick can be checked against the same picture
           that made it.

           Angle then spins that whole assembly rigidly. The face has EIGHT
           spokes, so they fall every 45°: 0 lies along one, 22 sits mid-gap.
           That sweep is the question the hands were chosen on — does a blade
           lying on a painted spoke still read — and this is the control that
           asks it without waiting for the clock to get there. -->
      <div class="fl-head">
        Motion
        <span class="fl-phase">{{ fhMotionLabel }}</span>
      </div>
      <!-- HOW THE SECOND HAND MOVES. It STEPS once a second — quantised from
           elapsed time, so it cannot drift — and the escapement adds the
           overshoot-and-settle a real movement has. Sweep is the continuous
           glide this replaced, kept so the two can be compared. The hour and
           minute hands always creep, whichever is picked: a stepping minute
           hand looks broken. -->
      <div class="fl-presets">
        <button
          type="button"
          v-for="m in fhMotions"
          :key="m.id"
          class="fl-preset"
          :class="{ on: fhMotion === m.id }"
          :title="m.hint"
          @click="setFhMotion(m.id)"
        >
          {{ m.label
          }}<span class="fl-ships" v-if="m.id === 'escapement'">ships</span>
        </button>
      </div>
      <div class="fl-presets">
        <button
          type="button"
          class="fl-preset"
          :class="{ on: fhFreeze }"
          title="Stop the clock and stand the hands in the spread the four candidate styles were judged at — then use Angle to sweep the assembly across the dial's spokes"
          @click="setFhFreeze(!fhFreeze)"
        >
          {{ fhFreeze ? "Frozen" : "Running" }}
        </button>
      </div>
      <div class="fl-row" v-for="d in fhMotionDials" :key="d.key">
        <span class="fl-label" :title="d.hint">{{ d.label }}</span>
        <NumberScrub
          :value="fhLab[d.key]"
          :min="d.min"
          :max="d.max"
          :title="d.hint"
          @input="setFhLab(d.key, $event)"
        />
      </div>

      <button
        type="button"
        class="fl-reset"
        title="Every scrub back to zero, both switches back to the shipped pick, and the clock running — which is exactly the baked art"
        @click="resetFhLab"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script>
import faceHandsLab, {
  FACE_HANDS_STYLES,
  FACE_HANDS_MOTIONS,
} from "../golem/faceHands";
import NumberScrub from "./NumberScrub";

/** Which dials belong under which heading. Named here rather than sliced by
 *  index so that adding a dial to faceHands.js cannot silently land it in the
 *  wrong group. */
const HAND_KEYS = [
  "hourLength",
  "hourWidth",
  "minuteLength",
  "minuteWidth",
  "secondLength",
  "secondWidth",
];
const ALIGN_KEYS = ["centreX", "centreY"];
const CENTRE_KEYS = ["boss", "opacity"];
const MOTION_KEYS = ["angle", "overshoot"];

export default {
  name: "FaceHandsLab",
  components: { NumberScrub },
  mixins: [faceHandsLab],
  computed: {
    fhAlignDials() {
      return this.fhDials.filter((d) => ALIGN_KEYS.indexOf(d.key) > -1);
    },
    /** The name of the second hand's motion — presentation only; the mixin owns
     *  which one that is. */
    fhMotionLabel() {
      const m = FACE_HANDS_MOTIONS.find((x) => x.id === this.fhMotion);
      return m ? m.label.toLowerCase() : "";
    },
    fhHandDials() {
      return this.fhDials.filter((d) => HAND_KEYS.indexOf(d.key) > -1);
    },
    fhCentreDials() {
      return this.fhDials.filter((d) => CENTRE_KEYS.indexOf(d.key) > -1);
    },
    fhMotionDials() {
      return this.fhDials.filter((d) => MOTION_KEYS.indexOf(d.key) > -1);
    },
    /** The name of the style on the dial — presentation only; the mixin owns
     *  which one that is. */
    fhStyleLabel() {
      const s = FACE_HANDS_STYLES.find((x) => x.id === this.fhStyle);
      return s ? s.label.toLowerCase() : "";
    },
  },
};
</script>

<style scoped lang="scss">
// The fifth door in the dev column — the disc lab's shell, unchanged, so the
// two panels read as one toolkit.
#face-hands-lab {
  position: fixed;
  top: 158px; // FT-1258 ladder (22px chips, 24px apart); FT-1337: down one for the chair lab
  left: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  font-size: 13px;

  // NOT ON A PHONE. The same call the disc lab makes: the door would land on
  // top of the grimoire thumbnail, and a lab is a desktop tool.
  @media (pointer: coarse) {
    display: none;
  }

  .fh-toggle {
    width: 132px;
    height: 22px;
    line-height: 20px;
    padding: 0 10px;
    box-sizing: border-box;
    text-align: left;
    white-space: nowrap;
    font-family: inherit;
    font-size: 12px;
    color: #d8cdb4;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #3d3d3d;
    border-left: none;
    border-radius: 0 6px 6px 0;
    cursor: pointer;
    opacity: 0.45;
    &:hover,
    &:focus-visible {
      opacity: 1;
      border-color: rgba(150, 130, 175, 0.75);
      outline: none;
    }
  }
  &.open .fh-toggle {
    opacity: 1;
    border-color: rgba(150, 130, 175, 0.75);
  }

  .fl-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: rgba(8, 6, 10, 0.92);
    border: 1px solid rgba(120, 105, 135, 0.45);
    border-left: none;
    border-radius: 0 8px 8px 0;
    // nine rows, four headings and seven buttons is taller than the shortest
    // window this runs at leaves below 228px, so the column scrolls rather than
    // running off the bottom of the screen
    max-height: calc(100vh - 244px);
    overflow-y: auto;
  }
  // the group headings — Art / Hands / Centre / Motion. Small, quiet and ruled,
  // so they read as dividers rather than as four more controls.
  .fl-head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 10px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #b6a8c8;
    opacity: 0.85;
    padding-bottom: 3px;
    border-bottom: 1px solid rgba(120, 105, 135, 0.28);
    &:not(:first-child) {
      margin-top: 4px;
    }
  }
  // which style is on the dial, beside the Art heading
  .fl-phase {
    font-size: 9px;
    letter-spacing: 0.04em;
    text-transform: none;
    color: #8f82a6;
  }
  .fl-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #d8cdb4;
  }
  // THE LABEL COLUMN HOLDS WORDS. 86px is "Minute length" with a little air,
  // measured rather than guessed, and it is FIXED so the scrubs stay in one
  // vertical line: a ragged column of drag handles is harder to hit than a
  // straight one. `nowrap` because a wrapped label would take its row's height
  // with it and break that line a second way.
  .fl-label {
    width: 86px;
    white-space: nowrap;
    opacity: 0.7;
    cursor: help;
  }
  // the switches — one column, because "Cathedral" and "Skeletal" are long
  // enough that a 2x2 grid would need abbreviating and this pass is about
  // spelling things out
  .fl-presets {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  // …except the colourway pair, which is two short words and fits side by side
  .fl-row-pair {
    flex-direction: row;
    .fl-preset {
      flex: 1;
      text-align: center;
    }
  }
  .fl-preset {
    display: flex;
    align-items: baseline;
    gap: 5px;
    font-family: inherit;
    font-size: 11px;
    text-align: left;
    color: #cdc2e2;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    padding: 2px 6px;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      border-color: rgba(150, 130, 175, 0.75);
      outline: none;
    }
    // the pick reads as pressed, in the same plum the disc lab uses, so the
    // column has one accent colour rather than two
    &.on {
      color: #0d0a12;
      background: #b9a6e0;
      border-color: #b9a6e0;
    }
  }
  // WHERE HOME IS. The style switch can reach three styles this app did not
  // choose, so the one it did is marked — otherwise a browser holding a dialled
  // pick gives no clue which of the four Reset will return to.
  .fl-ships {
    font-size: 8px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.65;
  }
  .fl-reset {
    font-family: inherit;
    font-size: 11px;
    color: #d8cdb4;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    padding: 2px 6px;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      border-color: rgba(150, 130, 175, 0.75);
      outline: none;
    }
  }
  // the scrub's "seat" preset inherits its colour, which reads on a disc and
  // disappears against this panel's own ground
  .num-scrub-box {
    color: #d8cdb4;
  }
}
</style>
