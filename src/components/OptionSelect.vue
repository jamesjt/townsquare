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
    <!-- FT-1167: `hoist` moves this list to <body> the moment it opens — see
         the prop's own note below for why one caller needs it. -->
    <div
      class="gsel-menu"
      :class="{ hoisted: hoist }"
      role="listbox"
      :id="listId"
      :aria-label="ariaLabel"
      v-if="open"
      ref="menu"
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
    /** FT-1167 (user: "the yes, no for story teller is getting clipped").
     *
     *  THE LIST LEAVES THE SHEET. Measured, not assumed
     *  (claude_temp_test/2026-08-25-ft1167-clipprobe.mjs): with the yes/no
     *  dropdown open on a night-checklist row, the ONE ancestor that shears it
     *  is `ul.ns-rows` — the checklist's own scrolling band, `overflow: auto`
     *  on both axes — and the list's bottom row hung 49px past it at both
     *  1920x1080 and 1280x800. The disc around it (`.night-sheet`, `overflow:
     *  hidden`, `border-radius: 50%`) does NOT clip it: every side of the menu
     *  measured comfortably inside that box. Nor was it merely a visual crop —
     *  `elementFromPoint` at the "No" row's own centre came back as furniture
     *  BELOW the sheet, so the last option was unclickable as well as unseen.
     *
     *  The band has to scroll (it is the checklist), so there is no
     *  containment to fix; the popup has to leave. That is exactly what the
     *  two pickers standing on the SAME row already do — SeatPicker and
     *  CharacterPicker hoist their lists to `document.body` via
     *  `golem/floatingPicker`, for this precise container — so this is the
     *  sheet's existing answer, worn by a third control, rather than a new
     *  technique.
     *
     *  OFF BY DEFAULT, opted into per caller. FT-1265 widened the roster:
     *  the setup panel scrolls in every dress (its body is `overflow-y:
     *  auto`, and the Control tab adds its own scroll well), so every
     *  HostTools instance hoists now — the Click-role-name picker's 8-row
     *  list was shearing at the tab's edge exactly the way the checklist's
     *  did. PrefsMenu's rows came aboard with FT-1213. The default stays
     *  off for the callers that style their options through `::v-deep`
     *  (NightModeRow), which a hoisted list is by definition out of reach
     *  of.
     *
     *  A HOISTED LIST TRACKS ITS TRIGGER (`placeMenu` on scroll-capture and
     *  resize) and CLOSES when the trigger is scrolled more than half out of
     *  view — a list left pointing at a row that has scrolled away is a worse
     *  bug than the clipping it was fixing. */
    hoist: { type: Boolean, default: false },
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
    // a hoisted list is no longer this component's DOM child, so the teardown
    // that removes the component's own tree would leave it stranded on <body>
    const menu = this.$refs.menu;
    if (menu && menu.parentElement === document.body) menu.remove();
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
      if (this.hoist) this.$nextTick(this.mountMenu);
    },
    close() {
      this.open = false;
      this.stopWatching();
    },
    stopWatching() {
      document.removeEventListener("mousedown", this.onDocDown);
      // capture phase: a scroll inside `.ns-rows` does not bubble to window,
      // and that band is the very thing this list had to escape
      window.removeEventListener("scroll", this.onTrack, true);
      window.removeEventListener("resize", this.onTrack);
    },
    onDocDown(e) {
      const root = this.$refs.root;
      const menu = this.$refs.menu;
      // the hoisted list is NOT inside `root` any more, so a mousedown on one
      // of its own options would otherwise read as a click-out and close the
      // list before the option's click could land
      if (root && root.contains(e.target)) return;
      if (menu && menu.contains(e.target)) return;
      this.close();
    },

    // ── FT-1167: THE HOISTED LIST (see the `hoist` prop's note) ────────────
    /** Move the list to <body> and start tracking the trigger. */
    mountMenu() {
      const menu = this.$refs.menu;
      if (!menu) return;
      if (menu.parentElement !== document.body) document.body.appendChild(menu);
      window.addEventListener("scroll", this.onTrack, true);
      window.addEventListener("resize", this.onTrack);
      this.placeMenu();
      // the list's natural height isn't known until it has laid out once —
      // `golem/floatingPicker`'s positionPopup hits the same snag, same fix
      requestAnimationFrame(this.placeMenu);
    },
    /** Reposition, or close if the trigger has been scrolled out from under
     *  it. Half the trigger still showing counts as still there. */
    onTrack() {
      if (!this.open) return;
      if (!this.triggerVisible()) {
        this.close();
        return;
      }
      this.placeMenu();
    },
    triggerVisible() {
      const root = this.$refs.root;
      if (!root) return false;
      const r = root.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      // the window, narrowed by every clipping ancestor — the same walk the
      // diagnosis rig made, run live
      let top = 0;
      let left = 0;
      let right = window.innerWidth;
      let bottom = window.innerHeight;
      let el = root.parentElement;
      while (el && el !== document.documentElement) {
        const cs = getComputedStyle(el);
        if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
          const b = el.getBoundingClientRect();
          top = Math.max(top, b.top);
          left = Math.max(left, b.left);
          right = Math.min(right, b.right);
          bottom = Math.min(bottom, b.bottom);
        }
        el = el.parentElement;
      }
      const showingH = Math.min(r.bottom, bottom) - Math.max(r.top, top);
      const showingW = Math.min(r.right, right) - Math.max(r.left, left);
      return showingH >= r.height / 2 && showingW >= r.width / 2;
    },
    /** Fixed to the trigger's own rect, flipping up when there is no room
     *  below — the shape `positionPopup` already draws for the two pickers on
     *  the same row, with the width pinned to the trigger so the list still
     *  reads as that control's own. */
    placeMenu() {
      const root = this.$refs.root;
      const menu = this.$refs.menu;
      if (!root || !menu) return;
      const rect = root.getBoundingClientRect();
      const box = menu.getBoundingClientRect();
      const margin = 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // prefer downward unless there plainly isn't room and the other side has
      // more — a merely tight fit should not make the list jump sides
      const openDown =
        spaceBelow >= Math.min(box.height, 160) || spaceBelow >= spaceAbove;
      const maxH = Math.max(
        96,
        (openDown ? spaceBelow : spaceAbove) - margin * 2,
      );
      const width = Math.max(
        rect.width,
        Math.min(box.width || rect.width, window.innerWidth - margin * 2),
      );
      const left = Math.min(
        Math.max(rect.left, margin),
        Math.max(margin, window.innerWidth - width - margin),
      );
      menu.style.left = `${left}px`;
      menu.style.width = `${width}px`;
      menu.style.maxHeight = `${maxH}px`;
      if (openDown) {
        menu.style.top = `${rect.bottom + 4}px`;
        menu.style.bottom = "auto";
      } else {
        menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        menu.style.top = "auto";
      }
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
    // FT-1100: THE CHROME COMES DOWN, THE WORDS DO NOT. A closed trigger spent
    // 45.6px on everything that is not its label — 4px of border, 20px of side
    // padding, an 8px gap and a 13.6px caret — and the settings line carries
    // THREE of them, so a third of the disc's 403.4px band was going on box
    // rather than on words. 8 -> 6 here and 10 -> 7 below, with the caret a
    // size smaller (see `.caret`), gives back ~10px per control. The label
    // itself is untouched: FT-1088's size-to-the-widest-option rule still
    // holds, so no option can be clipped by this.
    gap: 6px;
    // no more `width: 100%` — the trigger sizes to its content
    // (`.gsel-label-wrap` below) rather than to a parent that no longer hands
    // it the row's full slack.
    padding: 4px 7px;
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
      // FT-1100: 75% -> 62%. The caret is a hint that the control opens, not a
      // second thing to read; at 75% it painted 13.6px wide beside a 90% label.
      font-size: 62%;
      flex-shrink: 0;
      transition: transform 150ms;
    }
    &:hover:not(:disabled) {
      @include control-plate-hover;
    }
    &:focus-visible {
      @include control-focus-ring;
      // FT-1108 (user: purple not red, same shared styling on all of
      // them). The shared ring is the app's blood red and it fires the
      // whole time the list is open, so every open dropdown wore a red
      // outline. Overridden HERE rather than in controls.scss: that token
      // is worn by every plated control in the app, and this change is
      // about the dropdowns.
      outline-color: rgba(150, 130, 175, 0.9);
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
}

// The list. The script picker's own popup chrome (ground, blood edge,
// radius, shadow, z-index) — it hangs from the trigger's own width rather
// than the picker's centred sheet, because a word does not need 560px.
//
// FT-1167: IT IS A TOP-LEVEL RULE NOW, not a `.gsel` descendant. When `hoist`
// is set the menu is moved to <body> (see the prop's note in the script block)
// and `.gsel` stops being its DOM ancestor — and a SCOPED rule only carries
// its `[data-v-…]` attribute on the LAST compound selector, so
// `.gsel .gsel-menu[data-v-…]` would have stopped matching the moment it
// moved. Written flat, the attribute rides `.gsel-menu` itself and the rule
// follows the element wherever it goes. `.sp-list` (SeatPicker) is written
// flat for exactly this reason and was the precedent.
.gsel-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  min-width: max-content;
  max-height: 48vh;
  overflow-y: auto;
  // FT-1265: the wheel over an open list belongs to the LIST. Without this,
  // a wheel turn that runs past the list's own scroll (or lands on a list
  // short enough to have none) chains to the scroller behind it — the
  // Control tab's well, the panel — and the page moves under an open popup.
  // `contain` cuts the chain at this box on both counts: an overflow:auto
  // element is a scroll container even when its content fits, so the chain
  // stops here whether or not there is anything to scroll. The panel's own
  // body wears the same rule for the same reason (HostTools, FT-1160-era).
  overscroll-behavior: contain;
  padding: 4px;
  // FT-1108 (user): ground and edge come off the blood accent and onto
  // the grimoire's plum — the edge this panel's own buttons already
  // wear. Red is the blood in this fork; purple is the book, and a list
  // of settings belongs to the book.
  background: rgba(12, 8, 16, 0.96);
  border: 2px solid rgba(120, 105, 135, 0.55);
  border-radius: 8px;
  box-shadow: 0 0 12px black;
  z-index: 20;

  // FT-1167: HOISTED, the list is a child of <body> and its own rect is set in
  // JS (`placeMenu`), so it needs the fixed positioning that rect is expressed
  // in and a z-index that stands above the sheet it just left. Both values are
  // `.sp-list`'s — the seat picker on the very same row is the same object in
  // the same place, and there is no reason for two hoisted lists on one row to
  // sit on different layers. `right: auto` because the flat rule above pins
  // both edges for the ordinary in-flow case, and a hoisted list is placed by
  // `left` + `width` instead.
  &.hoisted {
    position: fixed;
    right: auto;
    z-index: 60;
  }

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
      // FT-1108: the row under the pointer, in plum rather than blood
      border-color: rgba(150, 130, 175, 0.55);
      background: rgba(150, 130, 175, 0.12);
    }
    // the chosen one, in the panel's own "this is on" ink
    // `control-lit` is the app's shared ON state and it is RED — right
    // everywhere else, wrong here now the whole control reads plum. The
    // three values are restated in purple rather than the shared mixin
    // being repainted under every other control wearing it. (FT-1108.)
    &.on {
      background: rgba(96, 74, 128, 0.42);
      border-color: rgba(167, 143, 205, 0.85);
      color: #ece4f8;
      font-weight: bold;
    }
    @media (pointer: coarse) {
      min-height: 40px;
      display: flex;
      align-items: center;
    }
  }
}
</style>
