<template>
  <!-- Golem fork (FT-874): THE NUMBER SCRUB — one control for "drag sideways
       to change a bounded integer, click to type it instead." Extracted from
       HostTools' own Seats control (tuned across several corrections) so the
       build panel and the night sheet's per-character number fields (Empath,
       Chef, Clockmaker, …) run the SAME gesture code — "exact same code so
       if we change it one place both get it" (user's standing rule) — rather
       than two implementations that drift apart.

       SHARED FOOTPRINT (a correction in its own right, carried over
       verbatim): the resting label and the type-in input occupy the SAME
       box — same width/height/padding/border — so clicking in only makes
       the field VISIBLE; nothing in the row shifts. v-if/v-else sit at the
       template ROOT (no wrapping element) so each caller can size that one
       box by putting a class on the component tag: Vue 2 merges a parent's
       scoped attribute onto whichever branch is the child's actual root
       node, so ordinary parent-scoped CSS still reaches it.

       `preset` picks a LOOK, not a different mechanism:
         "seat"  — the build panel's original — a bare bold digit, no box
                   until you click in, and a phone gets an INVISIBLE touch
                   pad (44x44, centred) rather than a resized visible box
                   (the visible box is shared with the type-in field and
                   cannot grow without breaking that contract).
         "night" — a night-sheet row control — always boxed, like its
                   SeatPicker/CharacterPicker/boolean-toggle row-mates, and
                   on a phone the box itself grows to 44px tall, because
                   every other control in that row does the same (the row's
                   OWN contract, restated in NightSheet.vue). -->
  <input
    v-if="editing"
    ref="input"
    class="num-scrub-box num-scrub-input"
    :class="preset"
    type="text"
    inputmode="numeric"
    v-model="editVal"
    @input="editVal = editVal.replace(/\D/g, '')"
    @keyup.enter="commit"
    @keyup.esc="editing = false"
    @blur="commit"
  />
  <b
    v-else
    class="num-scrub-box num-scrub-label"
    :class="[preset, { disabled }]"
    :title="title"
    :tabindex="disabled ? -1 : 0"
    role="spinbutton"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="value"
    :aria-disabled="String(disabled)"
    @pointerdown="scrub"
    @keydown.enter.prevent="openEdit"
    @keydown.space.prevent="openEdit"
    @keydown.left.prevent="step(-1)"
    @keydown.right.prevent="step(1)"
    >{{ value }}</b
  >
</template>

<script>
/**
 * @prop value    the current integer — always concrete, never null. A caller
 *                with an "unanswered" state (the night sheet, before the
 *                storyteller has touched the row) passes its own fallback —
 *                see NightSheet's numberValue().
 * @prop min/max  the scrub's bounds, inclusive.
 * @prop title    hover hint on the resting (non-editing) label.
 * @prop preset   "seat" (default, the build panel's look) or "night" (a
 *                night-sheet row control's look) — see template comment.
 * @fires input   (n: number) — every scrub step past the slop, on a typed
 *                commit, and on an arrow-key nudge. Wire it exactly like
 *                v-model (the prop/event pair IS Vue 2's default one).
 */
export default {
  name: "NumberScrub",
  props: {
    value: { type: Number, required: true },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 99 },
    title: { type: String, default: "Drag sideways to scrub — click to type" },
    preset: { type: String, default: "seat" }, // "seat" | "night"
    // FT-1272: LOCKED — the night sheet freezes a row's controls once it has
    // been sent. Unlike the two pickers this control's resting state is a
    // `<b>`, not a button, so there is no native `disabled` to ride: every
    // entry point (the drag, the click-to-type, the arrow-key nudge) returns
    // early instead, and the element leaves the tab order.
    disabled: { type: Boolean, default: false }
  },
  data() {
    return {
      editing: false,
      editVal: ""
    };
  },
  methods: {
    clamp(n) {
      const r = Math.round(n);
      const safe = Number.isNaN(r) ? this.min : r;
      return Math.max(this.min, Math.min(this.max, safe));
    },
    openEdit() {
      if (this.disabled) return;
      this.editVal = String(this.value);
      this.editing = true;
      this.$nextTick(() => {
        const inp = this.$refs.input;
        if (inp) {
          inp.focus();
          inp.select();
        }
      });
    },
    /** Keyboard nudge — additive: the original scrub had no keyboard path at
     *  all (a `<b>` reachable only by pointer). Arrow keys step by 1 without
     *  touching any of the pointer/drag behaviour above. */
    step(delta) {
      if (this.disabled) return;
      this.$emit("input", this.clamp(this.value + delta));
    },
    /** Drag the number sideways — one step per 9px. A plain CLICK (no drag)
     *  opens type-in editing instead (user call, HostTools' own history). */
    scrub(e) {
      if (this.disabled) return;
      e.preventDefault();
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const startN = this.value;
      // A finger never lands and lifts on the same pixel — a coarse pointer
      // gets a finger-sized slop instead of a mouse's 3px (HostTools' own
      // fix, carried over verbatim).
      const slop = e.pointerType === "touch" ? 10 : 3;
      // The scrub also starts counting from where the slop was CROSSED, not
      // from where the pointer went down — otherwise widening the slop would
      // make every drag jump by the slop's own width the moment it began.
      let originX = e.clientX;
      let scrubbing = false;
      const onMove = ev => {
        if (!scrubbing) {
          if (Math.abs(ev.clientX - originX) < slop) return;
          scrubbing = true;
          originX = ev.clientX;
          return;
        }
        this.$emit(
          "input",
          this.clamp(startN + Math.round((ev.clientX - originX) / 9))
        );
      };
      const unbind = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", unbind);
      };
      const onUp = () => {
        unbind();
        if (scrubbing) return;
        this.openEdit();
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      // The browser can take a gesture away mid-drag — a pan it decided to
      // own, a second finger, the app going to the background. That fires
      // `pointercancel` and never `pointerup`, so without this the move
      // handler stayed bound to the element for the rest of the session.
      el.addEventListener("pointercancel", unbind);
    },
    commit() {
      if (!this.editing) return;
      this.editing = false;
      this.$emit("input", this.clamp(parseInt(this.editVal, 10)));
    }
  }
};
</script>

<style scoped lang="scss">
// FT-1272: read-only import, for `control-disabled` alone.
@import "../controls.scss";

// FT-1272: the locked dress, controls.scss's own — see SeatPicker's note.
.num-scrub-label.disabled {
  @include control-disabled;
}

// the label and the type-in input share ONE footprint — same box, same
// padding, same border width — so clicking in only makes the field VISIBLE;
// nothing moves. (FT-847-era fix; carried over verbatim into this extract.)
.num-scrub-box {
  box-sizing: border-box;
  display: inline-block;
  margin: 0;
  text-align: center;
  vertical-align: middle;
  font-weight: bold;
  font-family: inherit;
  border-radius: 4px;

  &.seat {
    width: 2.8em;
    height: 1.5em;
    line-height: 1.5em;
    padding: 0 2px;
    font-size: inherit;
  }
  &.night {
    height: 30px;
    width: 52px;
    line-height: 28px;
    padding: 0 8px;
    font-size: 12.5px;
    border-radius: 5px;
    @media (pointer: coarse) {
      height: 44px;
      width: 64px;
      line-height: 42px;
      font-size: 15px;
    }
  }
}

.num-scrub-label {
  // FT-1170 (user): "Lets make number inputs like those more clearly an
  // input, including for number of chairs" — then, on being offered a
  // stepper: "no stepper is bad. just the border people can learn the number
  // scrub part."
  //
  // So the RESTING state wears the box it always had when you clicked into
  // it. It was a bare number on the background, indistinguishable from the
  // label beside it, and the only hint that it could be changed was the
  // cursor — which nobody sees until they are already over it, i.e. after
  // they have guessed. The border is the affordance; the drag is the thing
  // you learn once and then know, which is the user's own call and the
  // reason there are no arrows here.
  //
  // Same values the type-in field carries below, so the resting box and the
  // editing box are the same object rather than two that resemble each
  // other, and the only thing that changes on click is the caret.
  border: 1px solid rgba(120, 105, 135, 0.3);
  background: rgba(0, 0, 0, 0.25);
  cursor: ew-resize;
  user-select: none;
  touch-action: none;

  &:focus-visible {
    outline: none;
    border-color: #a01414;
  }

  &.seat {
    // The label is not a button but a DRAG handle — the hardest kind of
    // control to catch on a phone. The box cannot simply grow (it shares a
    // footprint with the type-in field), so the hit area grows instead, as
    // an invisible pad centred on the digits.
    @media (pointer: coarse) {
      position: relative;
      &:after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 44px;
        height: 44px;
      }
    }
  }
  &.night {
    color: white;
    // FT-1150 (user: all the storyteller's controls purple): the shared focus
    // border above is the app's blood #a01414, which is right on the build
    // panel's seat scrub and wrong on a night-checklist row, where every
    // neighbouring control is now plum. Overridden for the NIGHT preset only
    // — the same split FT-1108 made on the dropdown's focus ring rather than
    // repainting a token every other control wears correctly.
    &:focus-visible {
      border-color: rgba(150, 130, 175, 0.75);
    }
  }
}

.num-scrub-input {
  outline: none;

  &.seat {
    border-color: #400;
    background: rgba(0, 0, 0, 0.6);
    color: inherit;
  }
  // (The night preset's own colours moved OUT of this nesting — see the
  // rule below and the specificity note that goes with it.)
  &.night {
    color: white;
    background: rgba(0, 0, 0, 0.55);
  }
}

// FT-1150: THE NIGHT ROW'S TYPE-IN BOX, and the selector is the whole point.
//
// The night preset takes the same purple pair its row-mates on the checklist
// (.ns-free, .ns-lie, .ns-grim-show) now wear at rest and focused. The `seat`
// preset above is untouched — that one lives on the build panel, where blood
// is still the language.
//
// WRITTEN FLAT, WITH THE ELEMENT NAMED, because the nested version could not
// win and neither could the original. App.vue dresses every field in the app
// with `input:not([type=checkbox]):not([type=radio]):not([type=range])` —
// three :not()s carry their arguments' weight, so that selector scores 0-3-1
// against a nested `.num-scrub-input.night`'s 0-3-0. Measured: a focused
// night scrub came back with a #a01414 border and a blood glow whatever this
// file said. Naming the element and both classes takes it to 0-4-1 and wins.
//
// (It is flat rather than nested for a second, duller reason worth writing
// down: `input#{&}.night` inside the block above compiles to
// `.num-scrub-input input...` — Sass does not treat an INTERPOLATED `&` as
// the parent placeholder, so it prepends the parent as a descendant and the
// rule matches an input inside an input. Also measured, also red.)
//
// App.vue itself is not touched: it is right for every other field in the app.
input.num-scrub-box.num-scrub-input.night {
  border: 1px solid rgba(120, 105, 135, 0.3);
  &:focus,
  &:focus-visible {
    border-color: rgba(150, 130, 175, 0.75);
    box-shadow: 0 0 7px rgba(120, 105, 135, 0.4);
  }
}
</style>
