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
           log — rather than describing itself as a control.
           FT-936 (user call): a mark instead of the word — a full moon with
           the check knocked out to transparency, baked to the same warm
           recipe as the Seats/Roles marks (mean rgb ~154,146,133; see
           HostTools.vue's `.row-mark` for the family this joins). -->
      <span class="label">
        <img
          class="row-mark"
          :src="uiNightcheck"
          alt="Night checklist"
          title="Night checklist"
        />
      </span>
      <!-- FT-1087: THE TWO SEGMENTS BECAME TWO SELECTS, side by side, each
           taking half the row's slack — see OptionSelect.vue for why the whole
           panel changed shape. This row is the clearest case for it: the two
           segments together painted 385px into a 364-403px row, so the
           enforcement one WRAPPED to a second line at every width but the
           widest disc (the measurements are in the style block below, kept
           because they are what the wrap was). Two selects share one line at
           every width there has ever been a measurement for.

           THEY STAY SIDE BY SIDE rather than taking a row each: both settings
           are the night checklist's — who sees it, and how hard it is enforced
           — and neither has a word long enough to want the full width. -->
      <span class="nm-controls">
        <OptionSelect
          name="night-visibility"
          aria-label="Night sheet visibility"
          :options="visibilityOptions"
          :value="mode"
          @input="pick"
        />

        <!-- FT-874 tri-state (2026-08-19), FT-959 segmented (2026-08-20, user
             call: "turn the optional/required/warn option into a 3 part
             toggle like the off storyteller and everyone"). HOW HARD THE
             CHECKLIST IS ENFORCED — Optional / Warn / Required — now reads
             the SAME idiom as the mode switch to its left: one plate, three
             cells, the chosen one lit. It replaces the single word that used
             to cycle through the three on repeated clicks — every state is
             reachable in one press now, the same as the switch beside it.

             THE STATE STILL LIVES IN THE INK, not the box (2026-08-19 call,
             carried over): the plate the cell sits in is the group's shared
             one, same as every `.nm-opt` in this row; Warn's gold and
             Required's red are the word's own colour, layered on top of the
             ordinary "chosen" tint every segment in this app already wears —
             see the style block below for why that stays true even now that
             three options are visible at once instead of one. -->
        <OptionSelect
          class="nm-sel-checks"
          name="night-checks"
          aria-label="Night checklist enforcement"
          :options="checkOptions"
          :value="requireChecks"
          @input="pickCheck"
        />
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
// FT-936: the row label's mark — a full moon, the check knocked out to
// transparency.
import uiNightcheck from "../assets/ui-nightcheck.png";
// FT-1087: the panel's shared dropdown — the script picker's own trigger,
// opening a list of words instead of a grid of cards.
import OptionSelect from "./OptionSelect";

export default {
  name: "NightModeRow",
  components: { OptionSelect },
  data() {
    return {
      modes: MODES,
      labels: MODE_LABELS,
      hints: MODE_HINTS,
      titles: MODE_TITLES,
      // FT-959: the enforcement segment's own three positions — CHECK_MODES
      // is unchanged, only the CONTROL reading it changed shape (a segment
      // now, a cycling chip before).
      checkModes: CHECK_MODES,
      checkLabels: CHECK_LABELS,
      checkTitles: CHECK_TITLES,
      uiNightcheck
    };
  },
  computed: {
    ...mapState("night", ["mode", "requireChecks"]),
    /** FT-1087: the same three positions the switch always had, as the
     *  shared select's option list — labels and tooltips unchanged, read
     *  from nightLog as before. */
    visibilityOptions() {
      return this.modes.map((m) => ({
        value: m,
        label: this.labels[m],
        title: this.titles[m],
      }));
    },
    /** The enforcement list. `cls` carries Warn's gold and Required's red
     *  through to BOTH the option and the closed trigger — a colour that
     *  only survived while the list was open would say less than the
     *  segment did. */
    checkOptions() {
      return this.checkModes.map((c) => ({
        value: c,
        label: this.checkLabels[c],
        title: this.checkTitles[c],
        cls: "chk-" + c,
      }));
    },
  },
  methods: {
    pick(mode) {
      this.$store.commit("night/setMode", mode);
    },
    /** FT-959: the enforcement segment's own click handler — direct
     *  selection, the same shape `pick` above already gives the mode switch.
     *  Replaces `cycleChecks` (Optional → Warn → Required → Optional on
     *  repeated taps), which the chip needed and a segment does not: every
     *  state is one press away now. */
    pickCheck(mode) {
      this.$store.commit("night/setRequireChecks", mode);
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
    // FT-1100: 10px -> 6px, matching HostTools' own `.tw-lead` — this gap is
    // the one BETWEEN the mark and the controls it labels, which is inside a
    // cluster, not between two.
    gap: 6px;
    min-height: 34px;

    // ON THE DISC THE PANEL'S ROWS ALL CLOSE UP TO 8px (HostTools' own
    // `> .row { gap: 4px 8px }`) and this row did not, because it is a child
    // component and that rule cannot reach inside it. 10px against 8px is not
    // a look, it is a row out of step with the three above it — and here it
    // also bought the two pixels the plates cost.
    @include face-disc-build-gate {
      .host-tools & {
        // FT-1100: the column gap follows `.tw-lead` to 6px here too; the 4px
        // row gap is untouched.
        gap: 4px 6px;
      }
    }
  }

  // WIDTH IS THE WHOLE STORY ON THIS ROW, so the measurements are written
  // down. The build panel is capped at 420px (HostTools' own `max-width`),
  // which leaves this row 364px; the disc's band gives it 403px at its own
  // floor (1642x780) and 481px at 1920x1080 (mark-era numbers, measured —
  // `claude_temp_test/2026-08-19-ft936-measure.mjs`/`2026-08-20-ft959-
  // measure.mjs`). The content: the mark 22px, the mode switch 193px, and —
  // FT-959 — the enforcement SEGMENT 192px (it replaced an 82px cycling
  // chip; the width this row has to find room for roughly doubled).
  //
  //   disc 1920+  22 + 8 + 193 + 8 + 192 = 423 ≤ 481   ONE LINE (unchanged)
  //   disc 1642   423 > 403                             enforcement wraps
  //   rect 1280   22 + 10 + 193 + 8 + 192 = 425 > 364    enforcement wraps
  //
  // SAME MECHANISM AS THE CHIP'S OWN FALLBACK, not a new one: `.nm-controls`
  // already had `flex-wrap: wrap`, so the enforcement segment simply drops to
  // its own right-aligned second line at the two sizes where it does not fit
  // beside the switch — exactly what the 82px chip already did at those same
  // two sizes (see the row's own height double from 34px to 71px in
  // isolation; the row NEVER exceeds the panel's own right edge at any of the
  // three required widths — measured, not assumed:
  // `claude_temp_test/2026-08-20-ft959-interact.mjs`, every
  // `seg*OverflowsPanel` reading negative). A fallback to the OLD single
  // cycling chip at the narrowest widths was the other option on the table
  // (see the lane's report) and was not needed: wrapped alone, "Optional /
  // Warn / Required" is still 192px sitting inside a 364-403px row — never
  // cramped, never clipped, just on its own line under the switch, the same
  // shape both screenshotted sizes already show clearly.
  //
  // What the FT-936 mark pass was worth, measured before/after at the same
  // seat count (unchanged by this lane, restated for context):
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
  //
  // FT-936: THE LABEL IS A MARK NOW, not the 136px-painting word this whole
  // block above measures against. `flex: 0 0 auto` still holds — a 22px mark
  // sizes to itself the same way the text did — and every number in the
  // comment above is now a conservative OVER-estimate of what this row
  // spends: less width in, more slack for the switch and the chip to share.
  .label {
    opacity: 0.7;
    text-align: left;
    white-space: nowrap;
    flex: 0 0 auto;
  }
  // THE MARK ITSELF — HostTools.vue's own `.row-mark` recipe, restated here
  // because a parent's scoped styles reach a child's ROOT and nothing inside
  // it (see the template note on why `.nm-row` is restated too).
  .row-mark {
    width: 22px;
    height: 22px;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
  }

  // The mode switch and the enforcement select, as ONE right-hand group — the
  // row's space-between pins the label left and this group right.
  // FT-1088: NEITHER SELECT GROWS ANY MORE (OptionSelect.vue's own change —
  // a one-word trigger no longer eats a row's slack to look four times its
  // own width). That drops this group's width from the segments' 385px
  // (measured below) to two content-sized triggers — "Everyone"/"Required"
  // are the widest options either list holds, maybe 90-110px apiece — which
  // clears even the narrowest 364px row with room to spare, so the group
  // never needs its own second line any more. `min-width: 0` stays as the
  // narrow-width backstop; `flex-wrap` on the group is dead weight now (its
  // job was the width fight this comment used to document) but is left in
  // place rather than trimmed on the way past.
  .nm-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 1 auto;
    flex-wrap: wrap;
    min-width: 0;
  }

  // WARN'S GOLD AND REQUIRED'S RED, on the shared select. `::v-deep` because
  // the ink belongs to THIS row's setting, not to the panel's dropdown — a
  // colour that means "enforcement" has no business being defined inside a
  // control that also carries bells and day lengths. Same values the segment
  // wore (see the `.nm-seg-checks` note below), now on the closed trigger's
  // label as well as on the open list's chosen row, so the state is readable
  // without opening anything.
  .nm-sel-checks ::v-deep {
    .gsel-label.chk-warn {
      color: #ffd98a;
    }
    .gsel-label.chk-required {
      color: #ff6b6b;
    }
    .gsel-opt.chk-warn.on {
      color: #ffd98a;
    }
    .gsel-opt.chk-required.on {
      color: #ff6b6b;
    }
  }

  // ── FT-1087: THE SEGMENT RULES BELOW ARE STOOD DOWN ──────────────────────
  // Both settings on this row are selects now (see the template note), so
  // nothing in this component renders `.nm-seg` / `.nm-opt` / `.nm-seg-checks`
  // any more. They are LEFT IN PLACE, not removed: this fork's house rule is
  // never to delete on the way past, and the FT-1055 display segment's own
  // methods stand down in HostTools the same way. What they say about the
  // plate, the seam and the ink is also the record of what the select
  // inherited — the enforcement colours a few rules up are these, moved.
  //
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

  // THE ENFORCEMENT SEGMENT (FT-959, 2026-08-20, user call: "turn the
  // optional/required/warn option into a 3 part toggle like the off
  // storyteller and everyone"). Optional / Warn / Required, in the SAME
  // shape as the mode switch to its left: `.nm-seg` gives it the identical
  // plate, `.nm-opt` gives every cell the identical seam and the identical
  // red-tinted `.on` for "this is the chosen one" — nothing below
  // reimplements either. `.nm-seg-checks` only exists to scope what follows.
  //
  // THE STATE IS STILL IN THE INK, not a second box (2026-08-19 call,
  // CARRIED OVER rather than dropped when the cycling chip became a
  // segment): Warn's gold and Required's red are the SELECTED cell's own
  // text colour, layered on top of the ordinary `.on` tint every segment in
  // this app already wears when one of its options is chosen. That is a
  // change from the chip's own version of this idea — the chip had only ONE
  // word visible at a time and used the colour to say what THAT word was;
  // a segment shows all three words always, so the colour's job narrows to
  // "which one is picked", the same job `.nm-opt.on` already does for the
  // mode switch one row up. Off/Optional needed no colour of its own for
  // exactly that reason: unlike the chip (which dimmed its ink to read as
  // "nothing is happening" against three OTHER possible words all sharing
  // one slot), a segment's un-selected cells already say "not chosen" by not
  // being lit — Optional selected is not an alarming state, so it takes the
  // segment family's plain "on" look and nothing more, same as Off/
  // Storyteller/Everyone do one row up.
  .nm-seg-checks .nm-opt {
    &.chk-warn.on {
      color: #ffd98a;
    }
    &.chk-required.on {
      color: #ff6b6b;
    }
  }
}
</style>
