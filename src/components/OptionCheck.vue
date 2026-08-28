<template>
  <!-- Golem fork (FT-1268): THE PANEL'S CHECKBOX — every setting that is
       genuinely ON or OFF.

       WHY IT EXISTS. The user, pointing at an On/Off dropdown inside the menu
       customization overlay: "lets make all of these a checkbox instead of a
       drop down if there is only two options". A dropdown asks a question and
       makes you open a list to answer it; a boolean has no question worth
       opening — the answer is the control. Fourteen of these on the two
       settings tabs and the two overlays were spending a plate, a word, a
       caret and a click on a state a single box says at a glance.

       IT IS `OptionSelect`'S OWN OBJECT, NOT A NEW CONTROL. Same props
       (`options`, `value`, `name`, `ariaLabel`, `title`, `disabled`), same
       shared plate out of controls.scss, same plum "this is on" ink the
       dropdown's chosen row already wears (`.gsel-opt.on`, FT-1108), same
       plum focus ring (FT-1108 again — the settings family is the book's
       purple, not the blood red every other plated control answers with).
       A callsite converts by changing the tag; nothing about the value it
       writes moves.

       THE TWO-OPTION LIST IS STILL THE INPUT, deliberately. The option
       objects carry the labels and the teaching titles the selects carried,
       and this control reads the pair rather than being handed a bare
       boolean — so a row's vocabulary keeps living in one place
       (golem/prefs, HostTools' own computeds) and the two controls can be
       swapped either way without rewriting a callsite's data.

       WHICH OF THE TWO IS "ON" is named by `onValue` (default `true`),
       because the panel writes both idioms: the prefs toggles store real
       booleans, and the tower's whisper rows store the strings "on"/"off"
       (where `"off"` is perfectly truthy and no amount of coercion would
       guess right).

       WHAT IT IS NOT WORN BY. A two-option select whose options are two
       NAMED alternatives rather than a state — "Names and icons / Icons
       only", "Small / Large", "Default / Custom" — stays a select. The rule
       and its reasoning are golem/prefs' own (SETUP_LABELS, FT-1174): a
       checkbox is a selector that refuses to name one of its two states, and
       "Icons only: [ ]" makes the reader work out that the empty box means
       words are on. On/Off never has that problem, because the row's noun
       plus a ticked box IS the sentence.

       KEYBOARD. A real `<button role="checkbox">`: Space and Enter both fire
       a native button's click, so the toggle answers both without a keydown
       handler of its own, `aria-checked` carries the state, and the
       `ariaLabel` the select was named by is unchanged. -->
  <button
    type="button"
    class="gcheck"
    role="checkbox"
    :class="{ on: checked }"
    :data-gcheck="name"
    :aria-checked="String(checked)"
    :aria-label="ariaLabel"
    :title="boxTitle"
    :disabled="disabled"
    @click="toggle"
  >
    <!-- the tick only. The PLATE is the box (that is what a plate is for);
         a `check-square` glyph inside a plated control would draw a second
         box inside the first. `check` is registered in main.js' library. -->
    <font-awesome-icon icon="check" class="gcheck-tick" />
  </button>
</template>

<script>
export default {
  name: "OptionCheck",
  props: {
    /** [{ value, label, title? }] — exactly two, the same array the select
     *  took. Labels are not painted (a checkbox's label is its row's name);
     *  they are kept in the contract so a row can go back to a select, and
     *  so the pair stays authored in one place. */
    options: { type: Array, required: true },
    value: { type: [String, Number, Boolean], default: false },
    /** Which of the two option values means CHECKED. Default `true` covers
     *  every prefs toggle; the tower's whisper rows pass "on". */
    onValue: { type: [String, Number, Boolean], default: true },
    /** A stable hook for tests and rigs (`[data-gcheck="whisper-counts"]`),
     *  the same job `name` does on the select. */
    name: { type: String, default: "" },
    /** What a screen reader calls this control — the rows label themselves
     *  with a mark, so there is no visible text to be named by. */
    ariaLabel: { type: String, default: "" },
    /** Fallback tooltip when the on-option carries none of its own. */
    title: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
  },
  computed: {
    onOption() {
      return this.options.find((o) => o.value === this.onValue) || null;
    },
    offOption() {
      return this.options.find((o) => o.value !== this.onValue) || null;
    },
    checked() {
      return this.value === this.onValue;
    },
    /** THE ON OPTION'S TITLE, IN BOTH STATES — the one string that taught
     *  what the setting DOES ("Drag a character coin onto another seat…").
     *  The off titles the selects carried are all restatements of the act of
     *  picking Off ("Turn this gesture off"), which on an unticked box would
     *  read as an instruction contradicting the state it sits on. They are
     *  untouched in the option lists; they are simply not this control's
     *  face. */
    boxTitle() {
      return (this.onOption && this.onOption.title) || this.title || "";
    },
  },
  methods: {
    toggle() {
      if (this.disabled) return;
      const off = this.offOption ? this.offOption.value : !this.onValue;
      this.$emit("input", this.checked ? off : this.onValue);
    },
  },
};
</script>

<style scoped lang="scss">
// The shared control plate — the same partial the dropdown, the script
// picker and every segment on this panel read. Nothing here invents a look.
@import "../controls.scss";

.gcheck {
  @include control-plate;
  // A TOGGLE, NOT AN ACTION — controls.scss' own `$control-toggle-well`,
  // the inset recess that says "this holds a position" in SHAPE, legible to
  // an eye that never lands on the tick. RoleActions' Duplicates button is
  // the same well worn by the same kind of thing.
  //
  // THE WELL, BUT NOT THE WHOLE `control-toggle` MIXIN, and the split is
  // measured rather than tidy. That mixin also zeroes the ground, on an
  // argument that is exactly right for the control it was written for and
  // wrong for this one: an icon button OFF still has its icon, so an empty
  // ground reads as "outlined, not faded". A checkbox OFF has NO ink at
  // all, so a transparent ground leaves a black outline with the disc's
  // brown texture showing through the middle — shot at 6x
  // (claude_temp_test/2026-08-27-ft1268-shots/before2-unticked-rest.png) it
  // reads as a hole in the panel rather than as a control waiting to be
  // pressed. So the plate's own ground stays and the well goes on top: the
  // box is dark and closed whichever way it is set, and the TICK is the
  // only thing that changes.
  box-shadow: $control-toggle-well;
  color: #d8cdb4;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  // Sized to the row, not to a checkbox convention: the dropdown beside it
  // paints 4px+7px of padding around a 90% label inside a 2px edge, which
  // lands its plate at ~26px tall on this panel. The box matches that and is
  // square, so a converted row keeps its height and the column of controls
  // keeps one baseline.
  box-sizing: border-box;
  width: 24px;
  height: 24px;
  padding: 0;
  cursor: pointer;

  .gcheck-tick {
    // OFF IS AN EMPTY BOX, not a faded one — `control-toggle`'s own first
    // rule (dim means disabled and only that, because the panel's disabled
    // controls sit two rows away at opacity .4).
    opacity: 0;
    font-size: 13px;
    transition: opacity 120ms;
  }

  &:hover:not(:disabled) {
    @include control-plate-hover;
    // the well survives the hover ground — a toggle that flattened under the
    // pointer would stop reading as a toggle for exactly as long as you were
    // looking at it
    box-shadow: $control-toggle-well;
    // a ghost of the tick under the pointer on an unticked box, so the
    // gesture says what it will do before it does it
    .gcheck-tick {
      opacity: 0.35;
    }
  }

  &:focus-visible {
    @include control-focus-ring;
    // FT-1108's call, restated: the settings family answers the keyboard in
    // the grimoire's plum, not the app's blood red. Same override, same
    // value, as OptionSelect's own trigger.
    outline-color: rgba(150, 130, 175, 0.9);
    // AND IT DRAWS OUTSIDE THE BOX. The shared ring is `outline-offset: -1px`,
    // which is right on a control wide enough to have an inside — the
    // dropdown's trigger is 57-220px of plate and a ring one pixel in from
    // its edge is unmistakable. This box is 24px square behind a 2px black
    // border, so the same ring lands ON that border and a ticked box's
    // focus was indistinguishable from its plum edge (shot at 6x:
    // claude_temp_test/2026-08-27-ft1268-shots/before2-focused.png). Pushed
    // out, the ring is its own object in both states. There is room: the
    // control track's column gap is 10-14px and the row gap 6-9px, so 2px
    // of offset plus a 1px ring touches nothing.
    outline-offset: 2px;
  }

  &:disabled {
    @include control-disabled;
  }

  // ON. The dropdown's chosen row, verbatim (`.gsel-opt.on`, FT-1108) — the
  // ground, the edge and the ink of "this one is picked" as this panel
  // already says it, so ticking a box is visibly the same event as choosing
  // "On" from the list it replaces. `control-toggle`'s `.on` is the shared
  // BLOOD lit state and is deliberately overridden here for the same reason
  // OptionSelect overrides it: red is the blood in this fork, purple is the
  // book, and a settings tab belongs to the book.
  &.on {
    background: rgba(96, 74, 128, 0.42);
    border-color: rgba(167, 143, 205, 0.85);
    color: #ece4f8;
    box-shadow: $control-toggle-well;
    .gcheck-tick {
      opacity: 1;
    }
    &:hover:not(:disabled) {
      border-color: rgba(190, 168, 225, 0.95);
      .gcheck-tick {
        opacity: 1;
      }
    }
  }

  // the touch bump the dropdown's trigger already takes, at this control's
  // own square
  @media (pointer: coarse) {
    width: 32px;
    height: 32px;
    .gcheck-tick {
      font-size: 16px;
    }
  }
}
</style>
