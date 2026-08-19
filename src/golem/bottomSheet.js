// Golem fork (2026-08-18): DRAG-TO-DISMISS for the phone's bottom sheets.
//
// On a portrait phone every drawer stands on the bottom edge as a sheet (the
// chrome is drawer.scss's `bottom-sheet` mixin). This is the gesture half:
// pull the handle down and the sheet follows the finger; let go past a third
// of its height — or with a downward flick, however short — and it closes.
// Anything else springs it back.
//
// IT IS NEVER THE ONLY WAY OUT. Every sheet also carries a close ×, and the
// grimoire keeps its tab besides. A touch drag is arbitrated by the browser
// and can be taken back mid-gesture — the resize grip learned that the hard
// way (see rightDrawer's pointercancel handling) — and a sheet whose only
// exit is a gesture the browser can confiscate is a trap.
//
// The host component must supply `close()`. rightDrawer's mixin already does;
// RoleDrawer declares its own.
//
// Usage:  mixins: [bottomSheet]
//         <div class="gs-handle" @pointerdown="startSheetDrag"></div>
//         :style="[{ '--sd-w': width + 'px' }, sheetStyle]"

// the same condition drawer.scss keys the sheet form on, in the one language
// that can ask about it from script
const PHONE_SHEET = "(pointer: coarse) and (orientation: portrait)";
// past this share of the sheet's own height, letting go dismisses
const DISMISS_RATIO = 0.33;
// …or a downward flick this fast, at any distance
const FLICK_PX_PER_MS = 0.5;

export default {
  data() {
    return { sheetDragY: 0, sheetDragging: false };
  },
  computed: {
    /**
     * The sheet's live offset while a finger is pulling it. `null` at rest, so
     * on desktop — and on a phone until someone touches the handle — this
     * contributes no inline style at all.
     */
    sheetStyle() {
      if (!this.sheetDragging && !this.sheetDragY) return null;
      return {
        transform: `translateY(${this.sheetDragY}px)`,
        // follow the finger exactly; the CSS transition is for the release
        transition: this.sheetDragging ? "none" : null
      };
    }
  },
  methods: {
    /**
     * THE SHEET'S DISMISS — and why it is not just `@click`.
     *
     * A click is not something a touch screen sends. It is something the
     * BROWSER synthesises after a touch, and it withholds it whenever its own
     * gesture arbitration decides the touch might have been the start of
     * something else. Measured on these sheets with synthesised touch: about
     * one tap in twenty landed `pointerdown` AND `pointerup` squarely on the
     * ×, produced no click at all, and left the sheet sitting there — the tap
     * simply did nothing.
     *
     * That is the same class of failure that made drag-to-dismiss untrustworthy
     * on its own, and it would be worse here: the × is the control the drag is
     * allowed to be unreliable BECAUSE of. So a finger dismisses on
     * `pointerup`, which the browser does not get to withhold.
     *
     * A MOUSE is excluded by name and keeps the click path exactly as it was,
     * so nothing about desktop changes. The guard window stops the two paths
     * both firing when the browser does deliver the click.
     */
    sheetDismiss(e) {
      if (e && e.type === "pointerup" && e.pointerType === "mouse") return;
      const now = performance.now();
      if (now - (this.$options.dismissedAt || 0) < 700) return;
      this.$options.dismissedAt = now;
      this.close();
    },
    startSheetDrag(e) {
      // desktop has no sheet to pull — the handle is display:none there, but
      // an orientation flip mid-session can leave a stale pointer, so ask
      if (!window.matchMedia(PHONE_SHEET).matches) return;
      e.preventDefault();
      const handle = e.currentTarget;
      const height = this.$el.getBoundingClientRect().height;
      const startY = e.clientY;
      const startT = performance.now();
      let lastY = startY;
      let lastT = startT;
      handle.setPointerCapture(e.pointerId);
      this.sheetDragging = true;

      const onMove = ev => {
        // DOWNWARD ONLY. Dragging up must not lift the sheet off the bottom
        // edge and open a gap under it.
        this.sheetDragY = Math.max(0, ev.clientY - startY);
        lastY = ev.clientY;
        lastT = performance.now();
      };
      const finish = taken => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", release);
        handle.removeEventListener("pointercancel", cancel);
        this.sheetDragging = false;
        const dt = Math.max(1, lastT - startT);
        const flicked = (lastY - startY) / dt > FLICK_PX_PER_MS;
        const far = this.sheetDragY > height * DISMISS_RATIO;
        if (!taken && (far || flicked)) this.close();
        // reset either way: closed, this leaves the sheet at rest for its next
        // opening; kept, this is the spring back
        this.sheetDragY = 0;
      };
      const release = () => finish(false);
      // A gesture the browser CONFISCATES fires pointercancel and nothing
      // else. Treating that as "released where you were" would dismiss a sheet
      // the user never let go of, so a taken gesture always springs back.
      const cancel = () => finish(true);

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", release);
      handle.addEventListener("pointercancel", cancel);
    }
  }
};
