<template>
  <!-- Golem fork (FT-1087): THE PANEL'S DROPDOWN — one control, every
       multi-option setting on the build panel.

       WHY IT EXISTS. The setup panel used to state every setting as a
       SEGMENT: all options visible, side by side, in a plate the width of
       its own words. Five of those on a 403px band meant a ragged right
       edge with dead space beside the short ones, two rows wrapping onto a
       second line, and nothing lining up (user, on the panel: "we have
       blank horizontal space here right now, and we have chips to toggle
       between instead of a selector, that are taking up a bunch of space").

       IT IS THE SCRIPT PICKER'S OWN TRIGGER, not a new control. That picker
       (ScriptPicker.vue) has always been this panel's dropdown idiom — the
       shared control plate, the current choice on the face, a caret that
       flips when it opens, Escape and click-out to close. What it opens is
       a card GRID, because a script has artwork; a setting has a word, so
       this one opens a plain list. Everything above the popup is the same
       object, deliberately: the panel now has ONE way of saying "pick one
       of these", worn by six controls instead of two shapes worn by seven.

       KEYBOARD (the APG select-only combobox). Focus never leaves the
       trigger: the list is addressed with `aria-activedescendant`, so
       Arrow/Home/End move the active option, Enter or Space takes it,
       Escape closes and Tab leaves — and a screen reader hears one
       combobox with a listbox popup, not a div wearing a role.

       RE-PICKING THE CURRENT VALUE STILL EMITS. The bell rows depend on it:
       choosing the bell that is already chosen is how you stop the preview
       it started (HostTools' pickBell / pickCall own that contract). A
       control that swallowed the repeat would silently break it. -->
  <div class="gsel" :class="{ open, disabled }" :data-gsel="name" ref="root">
    <button
      type="button"
      class="trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-controls="listId"
      :aria-expanded="String(open)"
      :aria-activedescendant="open ? optId(activeIndex) : false"
      :aria-label="ariaLabel"
      :title="triggerTitle"
      :disabled="disabled"
      @click="toggle"
      @keydown="onKey"
    >
      <!-- FT-1088: THE WIDTH IS FIXED TO THE WIDEST OPTION, not the current one.
           `.gsel-label-wrap` stacks the real label under one hidden sizer span
           PER OPTION (below) on the same CSS grid cell — `grid-area: 1 / 1`
           overlaps them, and an `auto` grid track sizes to the largest of
           everything it holds, visible or not (`visibility: hidden` still
           counts; only `display: none` would not). That makes the trigger's
           width the max-content width across the WHOLE option list, always,
           so it cannot drift when the value changes and cannot go stale when
           the option list does either — there is no "longest so far" to
           recompute, because every option is always in the stack. -->
      <span class="gsel-label-wrap">
        <span class="gsel-label" :class="current ? current.cls : ''">{{
          currentLabel
        }}</span>
        <span
          v-for="o in options"
          :key="'sizer-' + String(o.value)"
          class="gsel-sizer"
          aria-hidden="true"
          >{{ o.label }}</span
        >
      </span>
      <font-awesome-icon icon="chevron-down" class="caret" />
    </button>
    <div
      class="gsel-menu"
      role="listbox"
      :id="listId"
      :aria-label="ariaLabel"
      v-if="open"
    >
      <div
        v-for="(o, i) in options"
        :key="String(o.value)"
        class="gsel-opt"
        :class="[o.cls, { on: o.value === value, active: i === activeIndex }]"
        role="option"
        :id="optId(i)"
        :aria-selected="String(o.value === value)"
        :title="o.title || ''"
        @mousedown.prevent
        @click="choose(o)"
        @mousemove="activeIndex = i"
      >
        {{ o.label }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "OptionSelect",
  props: {
    /** [{ value, label, title?, cls? }] — `cls` rides both the option and the
     *  closed trigger, which is how the enforcement row keeps Warn's gold and
     *  Required's red on the face of the control as well as in its list. */
    options: { type: Array, required: true },
    value: { type: [String, Number, Boolean], default: "" },
    /** A stable hook for tests and rigs (`[data-gsel="bell-which"]`), and
     *  nothing else — never rendered. */
    name: { type: String, default: "" },
    /** What a screen reader calls this control. Required in practice: the
     *  rows label themselves with a mark, so there is no visible text for
     *  the trigger to be named by. */
    ariaLabel: { type: String, default: "" },
    /** The row's own explanation, shown on the closed trigger when the
     *  chosen option has no title of its own. */
    title: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
  },
  data() {
    return {
      open: false,
      // which option the keyboard is on while the list is open — seeded from
      // the current value each time it opens, so Arrow starts where you are
      activeIndex: 0,
    };
  },
  computed: {
    current() {
      return this.options.find((o) => o.value === this.value) || null;
    },
    currentLabel() {
      return this.current ? this.current.label : this.options[0]?.label || "";
    },
    /** The closed control says what the chosen option says — the segment's
     *  per-cell tooltips are not lost when the cells fold into a list. */
    triggerTitle() {
      return (this.current && this.current.title) || this.title || "";
    },
    listId() {
      return `gsel-list-${this._uid}`;
    },
  },
  beforeDestroy() {
    this.stopWatching();
  },
  methods: {
    optId(i) {
      return `gsel-opt-${this._uid}-${i}`;
    },
    toggle() {
      this.open ? this.close() : this.doOpen();
    },
    doOpen() {
      if (this.disabled) return;
      const i = this.options.findIndex((o) => o.value === this.value);
      this.activeIndex = i < 0 ? 0 : i;
      this.open = true;
      document.addEventListener("mousedown", this.onDocDown);
    },
    close() {
      this.open = false;
      this.stopWatching();
    },
    stopWatching() {
      document.removeEventListener("mousedown", this.onDocDown);
    },
    onDocDown(e) {
      const root = this.$refs.root;
      if (root && !root.contains(e.target)) this.close();
    },
    choose(o) {
      this.close();
      // deliberately NOT gated on a change — see the template note on the
      // bell rows' stop-on-second-pick contract
      this.$emit("input", o.value);
    },
    /** The APG select-only combobox keys, all on the trigger — focus never
     *  moves into the list, so nothing has to be handed back on close. */
    onKey(e) {
      const last = this.options.length - 1;
      const key = e.key;
      if (!this.open) {
        if (
          key === "ArrowDown" ||
          key === "ArrowUp" ||
          key === "Enter" ||
          key === " " ||
          key === "Home" ||
          key === "End"
        ) {
          e.preventDefault();
          this.doOpen();
          if (key === "Home") this.activeIndex = 0;
          if (key === "End") this.activeIndex = last;
        }
        return;
      }
      switch (key) {
        case "ArrowDown":
          e.preventDefault();
          this.activeIndex = Math.min(last, this.activeIndex + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          this.activeIndex = Math.max(0, this.activeIndex - 1);
          break;
        case "Home":
          e.preventDefault();
          this.activeIndex = 0;
          break;
        case "End":
          e.preventDefault();
          this.activeIndex = last;
          break;
        case "Enter":
        case " ":
          // preventDefault also stops the button's own synthesised click,
          // which would otherwise re-toggle the list a beat later
          e.preventDefault();
          this.choose(this.options[this.activeIndex]);
          break;
        case "Escape":
          e.preventDefault();
          this.close();
          break;
        case "Tab":
          this.close();
          break;
      }
    },
  },
};
</script>

<style scoped lang="scss">
// The shared control plate — the same partial the script picker's trigger and
// every segment on this panel read. Nothing here invents a look.
@import "../controls.scss";

.gsel {
  position: relative;
  // FT-1088 (user call: "much wider than their contents... less wide and
  // fewer rows"). `flex: 1 1 auto` WAS the point of the control — filling a
  // row's slack so a column of rows shared one right edge instead of a
  // segment's own word-width. It also meant a one-word trigger ("Off") ate
  // however much slack its row happened to have, which read as an oversized
  // box around three letters. The row now does the "share one edge" job
  // itself (HostTools/NightModeRow cluster the mark with the select and let
  // the ROW's own space-between find the edge), so the control goes back to
  // sizing itself — `flex: 0 1 auto` is grow:0 (no more eating slack) with
  // shrink:1 kept, so a genuinely tight width can still compress it rather
  // than overflow.
  flex: 0 1 auto;
  min-width: 0;

  .trigger {
    @include control-plate;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    // no more `width: 100%` — the trigger sizes to its content
    // (`.gsel-label-wrap` below) rather than to a parent that no longer hands
    // it the row's full slack.
    padding: 4px 10px;
    font-family: inherit;
    font-size: 90%;
    color: white;
    text-align: left;
    cursor: pointer;

    // THE SIZER STACK (see the template note by `.gsel-label-wrap`): an
    // `auto` grid track sizes to the largest thing it holds, and every
    // option's label is stacked in it — visible one on top, the rest
    // `visibility: hidden` underneath — so the column is always exactly as
    // wide as the widest option, never wider, never the current pick's own
    // (possibly shorter) width.
    .gsel-label-wrap {
      position: relative;
      display: grid;
      min-width: 0;
      > * {
        grid-area: 1 / 1;
      }
    }
    .gsel-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .gsel-sizer {
      visibility: hidden;
      white-space: nowrap;
      pointer-events: none;
    }
    .caret {
      opacity: 0.7;
      font-size: 75%;
      flex-shrink: 0;
      transition: transform 150ms;
    }
    &:hover:not(:disabled) {
      @include control-plate-hover;
    }
    &:focus-visible {
      @include control-focus-ring;
    }
    &:disabled {
      @include control-disabled;
    }
    @media (pointer: coarse) {
      min-height: 40px;
    }
  }
  &.open .trigger .caret {
    transform: rotate(180deg);
  }

  // The list. The script picker's own popup chrome (ground, blood edge,
  // radius, shadow, z-index) — it hangs from the trigger's own width rather
  // than the picker's centred sheet, because a word does not need 560px.
  .gsel-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    min-width: max-content;
    max-height: 48vh;
    overflow-y: auto;
    padding: 4px;
    background: rgba(10, 4, 4, 0.95);
    border: 2px solid #400;
    border-radius: 8px;
    box-shadow: 0 0 12px black;
    z-index: 20;

    .gsel-opt {
      padding: 5px 8px;
      border: 1px solid transparent;
      border-radius: 4px;
      font-size: 85%;
      white-space: nowrap;
      // the panel centres its text; a list of choices reads down a left edge,
      // and the closed trigger above it already does
      text-align: left;
      cursor: pointer;

      // hover AND keyboard-active are the same state on this control — the
      // pointer moves `activeIndex`, so there is only ever one highlighted row
      &.active {
        border-color: #630;
        background: rgba(255, 0, 0, 0.08);
      }
      // the chosen one, in the panel's own "this is on" ink
      &.on {
        @include control-lit;
        font-weight: bold;
      }
      @media (pointer: coarse) {
        min-height: 40px;
        display: flex;
        align-items: center;
      }
    }
  }
}
</style>
