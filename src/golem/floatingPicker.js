/**
 * Golem fork (FT-862): THE FLOATING PICKER MIXIN — the trigger+popup shell
 * SeatPicker and CharacterPicker both stand on, factored out of
 * ScriptPicker.vue's own card-tip technique (FT-854) so it is written once.
 *
 * Neither picker can render its popup as a plain absolutely-positioned
 * child: both live inside NightSheet's `.ns-rows`, which SCROLLS — an
 * absolute child scrolls and clips with the list around it. ScriptPicker's
 * card-tip solved exactly this by hoisting to <body> and measuring the
 * trigger's rect in JS; this mixin is that technique, generalised to flip
 * both AXES (ScriptPicker's tip only ever flips vertically) because a picker
 * opened from a row docked at the screen's bottom edge — the phone night
 * sheet — has nowhere below it to open into at all.
 *
 * A HOST COMPONENT using this mixin must:
 *   - leave `open` out of its own data (this mixin owns it)
 *   - put `ref="wrap"` on the element that wraps the trigger, and
 *     `ref="popup"` on the popup's root element
 *   - call `this.pick(value)`-style methods that end by calling
 *     `this.closePopup()` before emitting
 */
export default {
  data() {
    return { open: false };
  },
  beforeDestroy() {
    this.closePopup();
  },
  methods: {
    toggle() {
      this.open ? this.closePopup() : this.openPopup();
    },
    openPopup() {
      this.open = true;
      document.addEventListener("mousedown", this.__onDocDown);
      document.addEventListener("keydown", this.__onDocKey);
      this.$nextTick(() => this.positionPopup());
    },
    closePopup() {
      this.open = false;
      document.removeEventListener("mousedown", this.__onDocDown);
      document.removeEventListener("keydown", this.__onDocKey);
    },
    __onDocDown(e) {
      const wrap = this.$refs.wrap;
      const popup = this.$refs.popup;
      const inWrap = wrap && wrap.contains(e.target);
      const inPopup = popup && popup.contains(e.target);
      if (!inWrap && !inPopup) this.closePopup();
    },
    __onDocKey(e) {
      if (e.key === "Escape") this.closePopup();
    },
    /**
     * Hoist the popup to <body> (fixed positioning needs a transform-free
     * ancestor — the night sheet's own docked/fixed wrappers would otherwise
     * re-root it) and place it against the trigger, flipping to whichever
     * side has more room on EACH axis independently.
     */
    positionPopup() {
      const trigger = this.$refs.wrap;
      const popup = this.$refs.popup;
      if (!trigger || !popup) return;
      if (popup.parentElement !== document.body) document.body.appendChild(popup);
      const margin = 8;
      const place = () => {
        const rect = trigger.getBoundingClientRect();
        const box = popup.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        // open downward unless there plainly isn't room and the other side
        // has more — a popup that's merely tight still prefers its natural
        // side so it doesn't visually "jump" for a few missing pixels
        const openDown = spaceBelow >= Math.min(box.height, 260) || spaceBelow >= spaceAbove;
        const maxH = Math.max(120, (openDown ? spaceBelow : spaceAbove) - margin * 2);
        const width = Math.max(rect.width, Math.min(box.width || 220, window.innerWidth - margin * 2));
        const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin);
        popup.style.position = "fixed";
        popup.style.left = `${left}px`;
        popup.style.width = `${width}px`;
        popup.style.maxHeight = `${maxH}px`;
        if (openDown) {
          popup.style.top = `${rect.bottom + 4}px`;
          popup.style.bottom = "auto";
        } else {
          popup.style.bottom = `${window.innerHeight - rect.top + 4}px`;
          popup.style.top = "auto";
        }
      };
      place();
      // the popup's natural height isn't known until it has laid out once —
      // ScriptPicker's positionTip hits the same snag, same two-pass fix
      requestAnimationFrame(place);
    }
  }
};
