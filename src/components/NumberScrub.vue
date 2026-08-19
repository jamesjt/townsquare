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
    :class="preset"
    :title="title"
    tabindex="0"
    role="spinbutton"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="value"
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
    preset: { type: String, default: "seat" } // "seat" | "night"
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
      this.$emit("input", this.clamp(this.value + delta));
    },
    /** Drag the number sideways — one step per 9px. A plain CLICK (no drag)
     *  opens type-in editing instead (user call, HostTools' own history). */
    scrub(e) {
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
  border: 1px solid transparent;
  background: transparent;
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
  }
}

.num-scrub-input {
  outline: none;

  &.seat {
    border-color: #400;
    background: rgba(0, 0, 0, 0.6);
    color: inherit;
  }
  &.night {
    color: white;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid #3d3d3d;
    &:focus-visible {
      border-color: #a01414;
    }
  }
}
</style>
