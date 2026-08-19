<template>
  <!-- Golem fork (FT-860): the night sheet's three-state switch, a row in the
       build panel. Its own component rather than more markup inside HostTools
       so the setting and its wording live with the rest of the night code.

       The switch and its one-line explanation are SIBLINGS, not two lines of
       one wrapping row. The build panel has no width of its own — it is
       shrink-to-fit around its widest row — and a wrapping flex row still
       reports its max-content width as if every item sat on ONE line, so the
       hint kept dragging the panel wider (measured +236px even after the text
       was shortened). Out of the flex flow it contributes only its own capped
       width, and the panel is untouched.

       Styling is all local: a child component's ROOT element carries the
       parent's scope id under Vue 2 scoped CSS, but its descendants do not, so
       the build panel's `.row` rules would not have reached inside here. -->
  <div class="night-mode">
    <div class="nm-row">
      <!-- "Night" alone did not say what the switch DOES (user call
           2026-08-18). It names the thing it turns on — the checklist and its
           log — rather than describing itself as a control. -->
      <span class="label">Night checklist</span>
      <span class="nm-controls">
        <span class="nm-seg" role="radiogroup" aria-label="Night sheet visibility">
          <button
            v-for="m in modes"
            :key="m"
            type="button"
            class="nm-opt"
            :class="{ on: mode === m }"
            role="radio"
            :aria-checked="String(mode === m)"
            :title="titles[m]"
            @click="pick(m)"
          >
            {{ labels[m] }}
          </button>
        </span>

        <!-- FT-874, tri-state 2026-08-19 (user call): HOW HARD THE CHECKLIST
             IS ENFORCED — Optional / Warn / Required. It was a labelled
             checkbox on a line of its own beneath the hint; folding it onto
             this row as a one-word chip takes a whole line out of the
             densest panel in the app, which matters most on the disc, where
             the band is tight and every line comes out of the character
             tray.

             A CHIP THAT CYCLES rather than a second three-button segment:
             two segments side by side on one row would read as one six-way
             control, and this setting has an obvious resting order (ask
             nothing → say something → refuse) that a single tap can walk.
             Its own word IS its state, so nothing else on the row has to
             carry a label for it. -->
        <button
          type="button"
          class="nm-chip"
          :class="'chk-' + requireChecks"
          :title="checkTitles[requireChecks]"
          :aria-label="'Checklist enforcement: ' + checkLabels[requireChecks]"
          @click="cycleChecks"
        >
          {{ checkLabels[requireChecks] }}
        </button>
      </span>
    </div>
    <small class="nm-hint">{{ hints[mode] }}</small>
  </div>
</template>

<script>
import { mapState } from "vuex";
import {
  MODES,
  MODE_LABELS,
  MODE_HINTS,
  MODE_TITLES,
  CHECK_MODES,
  CHECK_LABELS,
  CHECK_TITLES
} from "../golem/nightLog";

export default {
  name: "NightModeRow",
  data() {
    return {
      modes: MODES,
      labels: MODE_LABELS,
      hints: MODE_HINTS,
      titles: MODE_TITLES,
      checkLabels: CHECK_LABELS,
      checkTitles: CHECK_TITLES
    };
  },
  computed: {
    ...mapState("night", ["mode", "requireChecks"])
  },
  methods: {
    pick(mode) {
      this.$store.commit("night/setMode", mode);
    },
    /** Walk the chip: Optional → Warn → Required → Optional. Wraps, because
     *  a three-state control a tap can only walk forwards is one the user
     *  can always get back to — there is no dead end to undo. */
    cycleChecks() {
      const i = CHECK_MODES.indexOf(this.requireChecks);
      this.$store.commit(
        "night/setRequireChecks",
        CHECK_MODES[(i + 1) % CHECK_MODES.length]
      );
    }
  }
};
</script>

<style scoped lang="scss">
@import "../faceDisc.scss";

.night-mode {
  // FT-888: THE EXPLANATION FOLDS INSIDE THE BUILD PANEL'S DISC.
  //
  // This block WAS three stacked things — the switch, a sentence explaining
  // the chosen mode, and the Require-checks box — standing 112.6px tall. On
  // the disc that was 46% of a 245px band, taken from the character tray,
  // which is the one thing on that panel a host actually drags.
  //
  // The box is now a chip ON the switch's own row (2026-08-19), so the block
  // is two things, and the sentence is still the part that folds. Folding it
  // costs nothing: each of the three mode buttons already carries the same
  // wording as its own `title` (see `titles` / MODE_TITLES), and the disc
  // only exists on a fine pointer, which can hover. Both CONTROLS stay — a
  // control is not an explanation.
  //
  // Written here rather than in HostTools because `.nm-hint` is this
  // component's own element: a parent's scoped styles reach a child's ROOT and
  // nothing below it.
  @include face-disc-build-gate {
    .host-tools & .nm-hint {
      display: none;
    }
  }

  // the build panel's own row shape, restated here — see the template note on
  // why the parent's `.row` rules cannot reach inside this component
  .nm-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    min-height: 34px;
  }

  // WIDTH IS THE WHOLE STORY ON THIS ROW, so the measurements are written
  // down. The build panel is capped at 420px (HostTools' own `max-width`),
  // which leaves this row 364px; the disc's band gives it 359px at the
  // smallest size the disc gate allows (1642x900), 437px at 1920x1080 and
  // 592px at 2560x1440. The content: the label paints 136px, the switch
  // 191px, and the chip 80px at its longest word ("Required").
  //
  //   disc 1920+   136 + 10 + 191 + 8 + 80 = 425 ≤ 437   ONE LINE
  //   disc 1642    slack after the switch is 22px         chip wraps
  //   rect 1280    slack after the switch is 27px         chip wraps
  //
  // So the chip rides the row wherever there is room and drops onto a second,
  // right-aligned line where there is not. The wrap is the point, not a
  // fallback: at 420px this row genuinely cannot hold a fifteen-character
  // label, a three-word switch and a word chip at once, and the alternative
  // to wrapping is the label painting straight through the switch — which is
  // exactly what it did before this rule went in (shot:
  // chip-required-1280x800-rect-panel, first run).
  //
  // What the change is worth, measured before/after at the same seat count:
  //   1920x1080 disc   night block 74.3 → 34.0px, character tray +40.2px
  //   2560x1440 disc   night block 74.3 → 34.0px, character tray +40.3px
  //   1642x900 disc    night block 74.3 → 67.0px, character tray  +7.2px
  //   1280x800 rect    night block 92.4 → 85.2px, panel width unchanged

  // `width: auto`, NOT the 96px this label used to claim. The box was a
  // fiction — the text paints 136px and simply overflowed it, which is
  // harmless under space-between (the switch is pinned to the far edge) and
  // is a collision the moment anything sits next to the switch. Alignment is
  // unaffected: every label on the panel is left-aligned at the same edge,
  // and none of them depends on where its neighbour's text ends.
  .label {
    opacity: 0.7;
    text-align: left;
    white-space: nowrap;
    flex: 0 0 auto;
  }

  // The switch and its enforcement chip, as ONE right-hand group — so the
  // row's space-between still pins the label left and the controls right,
  // rather than stranding the switch in the middle of the row.
  .nm-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 5px 8px;
    min-width: 0;
  }

  .nm-seg {
    display: inline-flex;
    border: 1px solid #3d3d3d;
    border-radius: 6px;
    overflow: hidden;
    flex: 0 0 auto;
  }

  .nm-opt {
    font-family: inherit;
    font-size: 80%;
    color: white;
    // 9px → 4px, which is the 30px that lets the switch and the chip share
    // the disc's band on one line (see the width note above). Pure padding:
    // no word on the switch got shorter, nothing else on the panel is
    // measured against this cell, and the coarse-pointer rule at the foot of
    // this block replaces the padding outright on a phone.
    padding: 3px 4px;
    background: rgba(0, 0, 0, 0.55);
    border: 0;
    border-right: 1px solid #3d3d3d;
    cursor: pointer;
    &:last-child {
      border-right: 0;
    }
    &:hover {
      color: #ff8a8a;
    }
    &:focus-visible {
      outline: 1px solid #a01414;
      outline-offset: -1px;
    }
    &.on {
      background: rgba(160, 20, 20, 0.32);
      font-weight: bold;
    }
    // the three words are a 22px-tall target on a phone
    @media (pointer: coarse) {
      min-height: 40px;
      padding: 0 12px;
    }
  }

  // The explanation of the CURRENT choice. The max-width is load-bearing, not
  // decoration: it is what bounds this line's contribution to the shrink-to-fit
  // panel's width (an uncapped sentence took the panel from 363px to 1001px).
  .nm-hint {
    display: block;
    max-width: 240px;
    text-align: left;
    opacity: 0.55;
    font-size: 70%;
    line-height: 1.25;
    // tracks the label column above it
    padding-left: 96px;
    margin-top: -2px;
  }

  // THE ENFORCEMENT CHIP — Optional / Warn / Required, cycled by tapping.
  //
  // Deliberately NOT the segment's shape: the two controls sit 8px apart on
  // one row, and a second bordered three-cell strip beside the first would
  // read as one six-way switch. A chip is a single rounded token wearing one
  // word, which is what it is.
  //
  // Its three states are told apart by COLOUR as well as by the word, and the
  // colours are the ones this fork already assigns those meanings: muted
  // parchment for "nothing is being asked", the sheet's own gold (#d8b45a,
  // the sun mark on the phase bar) for a warning, blood red — the switch's
  // own `.on` accent, three lines up — for a hard stop.
  .nm-chip {
    font-family: inherit;
    font-size: 80%;
    padding: 3px 7px;
    border-radius: 999px;
    flex: 0 0 auto;
    border: 1px solid #3d3d3d;
    background: rgba(0, 0, 0, 0.55);
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    white-space: nowrap;
    transition:
      color 150ms,
      border-color 150ms,
      background 150ms;

    &:hover {
      color: #ff8a8a;
    }
    &:focus-visible {
      outline: 1px solid #a01414;
      outline-offset: -1px;
    }

    // OPTIONAL: dim, unbordered-looking, the resting "this is off" state
    &.chk-off {
      opacity: 0.7;
    }
    // WARN: the sheet's gold
    &.chk-warn {
      color: #f0d9a0;
      border-color: rgba(216, 180, 90, 0.75);
      background: rgba(216, 180, 90, 0.16);
    }
    // REQUIRED: the blood accent the mode switch's own selected cell wears
    &.chk-required {
      color: #ffd9d9;
      border-color: rgba(190, 90, 90, 0.8);
      background: rgba(160, 20, 20, 0.32);
      font-weight: bold;
    }

    // one word is a 22px-tall target on a phone — matched to .nm-opt beside it
    @media (pointer: coarse) {
      min-height: 40px;
      padding: 0 14px;
    }
  }
}
</style>
