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
// THE SHARED CONTROL PLATE (2026-08-19, user call). The switch used to wear a
// 1px #3d3d3d edge with its cells carrying their own rgba(0,0,0,.55) ground,
// and the chip a third variant of the same idea. Both read off src/controls.scss
// now — see the two blocks below for what each kept.
@import "../controls.scss";

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

    // ON THE DISC THE PANEL'S ROWS ALL CLOSE UP TO 8px (HostTools' own
    // `> .row { gap: 4px 8px }`) and this row did not, because it is a child
    // component and that rule cannot reach inside it. 10px against 8px is not
    // a look, it is a row out of step with the three above it — and here it
    // also bought the two pixels the plates cost.
    @include face-disc-build-gate {
      .host-tools & {
        gap: 4px 8px;
      }
    }
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

  // THE SWITCH IS ONE CONTROL WITH THREE POSITIONS, and that is the whole
  // reason the plate goes HERE and not on the cells. Off / Storyteller /
  // Everyone must read as a single object a finger slides along; three plated
  // buttons sitting 0px apart read as three buttons.
  //
  // This rule already half-said that — it owned the border and the radius —
  // while `.nm-opt` below carried its own rgba(0,0,0,.55) ground, so the group
  // was an outline drawn around three separate grounds. The plate is the
  // group's now; the cells inside it are transparent, and `overflow: hidden`
  // is what crops their square corners to the plate's 6px.
  .nm-seg {
    @include control-plate;
    display: inline-flex;
    overflow: hidden;
    flex: 0 0 auto;
  }

  // A CELL, not a button: a seam on its right, a lit state, no box. The seam
  // stays #3d3d3d rather than taking the plate's black — a black hairline
  // inside a black-edged group reads as a gap between two plates rather than
  // as a division inside one.
  .nm-opt {
    @include control-cell;
    font-size: 80%;
    // 9px → 4px, which is the 30px that lets the switch and the chip share
    // the disc's band on one line (see the width note above). Pure padding:
    // no word on the switch got shorter, nothing else on the panel is
    // measured against this cell, and the coarse-pointer rule at the foot of
    // this block replaces the padding outright on a phone.
    padding: 3px 4px;
    &:hover {
      color: #ff8a8a;
    }
    &.on {
      background: $control-on-bg;
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
    // FLUSH WITH THE PANEL'S TEXT COLUMN (2026-08-19). This used to be
    // `padding-left: 96px`, commented "tracks the label column above it" — and
    // it tracked nothing: the panel's label column is 55px wide (HostTools'
    // `.row .label`), this row's own label paints 136px, and 96 is neither. It
    // is the last surviving reference to the 96px label box that came off this
    // component in the FT-888 pass (see the `.label` note above, which records
    // that box as a fiction). At 0 the sentence starts on the same left edge as
    // every label on the panel, which is the column it was always meant to sit
    // in.
    padding-left: 0;
    margin-top: -2px;
  }

  // THE ENFORCEMENT CHIP — Optional / Warn / Required, cycled by tapping.
  //
  // THE PLATE IS THE PANEL'S, UNMODIFIED, AND THE STATE IS IN THE INK
  // (2026-08-19, user call: "that doesn't match in styling ie needs to").
  //
  // It used to keep a coloured BOX — a gold-tinted ground behind a gold edge
  // for Warn, `control-lit`'s red ground and red edge for Required — while
  // every other control on the panel wore rgba(0,0,0,.7) behind 2px of black.
  // That is the one difference the eye reads first: sitting in a row of
  // matched plates, a tinted plate does not read as "this control is set to
  // Required", it reads as a control made of a different material. Three
  // meanings still have to be told apart at a glance, so the colour did not go
  // — it MOVED, off the box and onto the word, where it says the same thing
  // without breaking the family.
  //
  // WHAT CARRIES THE DISTINCTION NOW, in the order the eye takes it:
  //   1. THE WORD ITSELF. Optional / Warn / Required is the whole state, in
  //      language, at the same size as the switch's own cells.
  //   2. THE INK. Parchment-grey for "nothing is being asked", the sheet's own
  //      gold (#d8b45a family, the sun mark on the phase bar) for a warning,
  //      the fork's blood red for a hard stop. Both coloured states are taken
  //      UP in brightness from their old values (#f0d9a0 -> #ffd98a,
  //      #ffd9d9 -> #ff6b6b) because ink on a near-black plate has to work
  //      harder than ink on a tinted one, and because gold and red sitting on
  //      the same ground need more hue separation than they did when the
  //      grounds were also doing the telling.
  //   3. WEIGHT AND AN INSET RULE. Type weight alone was too close between the
  //      two lit states at 80% (checked side by side at 1280x800 and
  //      1920x1080), so the two enforcing states also carry a 2px bar down
  //      their leading edge in their own colour — an INSET shadow, so it sits
  //      inside the plate's black border rather than replacing it, and the box
  //      measured from outside is byte-for-byte the switch's.
  //
  // THE EDGE STAYS BLACK IN ALL THREE STATES. That is the whole point of the
  // change, and it is also why the accent had to be an inset rather than a
  // border-colour: `border-color` is the one property that would put this
  // control back outside the family.
  .nm-chip {
    @include control-plate;
    font-family: inherit;
    font-size: 80%;
    padding: 3px 7px;
    flex: 0 0 auto;
    color: rgba(255, 255, 255, 0.55);
    cursor: pointer;
    white-space: nowrap;
    transition:
      color 150ms,
      border-color 150ms,
      box-shadow 150ms;

    &:hover {
      color: #ff8a8a;
      @include control-plate-hover;
    }
    &:focus-visible {
      @include control-focus-ring;
    }

    // OPTIONAL: the bare plate. THE DIM IS ON THE INK, not on the box — this
    // was `opacity: .7`, which faded the plate's own black edge and ground
    // along with the word and left the chip a visibly lighter box than the
    // switch touching it. The tone is the resting parchment RoleActions'
    // duplicates toggle already wears when it is off, so "off" looks the same
    // on both controls in the panel.
    &.chk-off {
      color: rgba(216, 205, 180, 0.62);
    }
    // WARN: the sheet's gold, in the ink and in the leading bar
    &.chk-warn {
      color: #ffd98a;
      box-shadow: inset 2px 0 0 rgba(216, 180, 90, 0.9);
    }
    // REQUIRED: the fork's blood red, and the only state that also takes
    // weight — three signals for the state that refuses to let the night move
    // on, one for the state that only grumbles.
    &.chk-required {
      color: #ff6b6b;
      box-shadow: inset 2px 0 0 rgba(190, 40, 40, 0.95);
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
