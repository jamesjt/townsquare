// Golem fork (FT-858): THE RIGHT-HAND DRAWER RAIL.
//
// Two drawers share the right edge — the script (ScriptDrawer) and the vote
// history (VoteDrawer) — and they behave identically:
//   • drag the grip on the drawer's own LEFT edge to resize (300–900px)
//   • double-click the grip to reset to that drawer's default
//   • the width persists per browser, per drawer
//   • whichever drawer is OPEN publishes its width to `--sd-width`, so the
//     session pill steps aside by exactly that much
//
// Only one can be open at a time: the store's `toggleModal` closes every
// other modal when one opens, so a single CSS variable is enough — and the
// publish is keyed on OPEN, not on create, because both components are
// always instantiated (their v-if lives inside the transition).
//
// Usage:  mixins: [rightDrawer({ modal: "voteDrawer", storageKey: "golem.voteDrawerW", defaultWidth: 460 })]
// Gives:  this.width, this.isOpen, this.close(), this.startResize(e), this.resetWidth()

const MIN_W = 300;
const MAX_W = 900;
// the variable App.vue's session pill reads ("side drawer width" — it belongs
// to whichever right drawer is showing, not to the script drawer alone)
const WIDTH_VAR = "--sd-width";

export default function rightDrawer({
  modal,
  storageKey,
  defaultWidth = 400
}) {
  return {
    data() {
      let stored = parseInt(localStorage.getItem(storageKey), 10);
      if (!stored || stored < MIN_W || stored > MAX_W) stored = defaultWidth;
      return { width: stored };
    },
    computed: {
      /** Is THIS drawer the one showing? */
      isOpen() {
        return !!this.$store.state.modals[modal];
      }
    },
    watch: {
      width(w) {
        if (this.isOpen) this.publishWidth(w);
      },
      isOpen: {
        immediate: true,
        handler(open) {
          if (open) this.publishWidth(this.width);
        }
      }
    },
    methods: {
      publishWidth(w) {
        document.documentElement.style.setProperty(WIDTH_VAR, w + "px");
      },
      close() {
        this.$store.commit("toggleModal", modal);
      },
      startResize(e) {
        e.preventDefault();
        const grip = e.currentTarget;
        grip.setPointerCapture(e.pointerId);
        const startX = e.clientX;
        const startW = this.width;
        const onMove = ev => {
          // dragging LEFT widens — the drawer is pinned to the right edge
          const next = startW + (startX - ev.clientX);
          this.width = Math.max(MIN_W, Math.min(MAX_W, next));
        };
        const finish = () => {
          grip.removeEventListener("pointermove", onMove);
          grip.removeEventListener("pointerup", finish);
          grip.removeEventListener("pointercancel", finish);
          localStorage.setItem(storageKey, String(this.width));
        };
        grip.addEventListener("pointermove", onMove);
        grip.addEventListener("pointerup", finish);
        // A touch drag does not always end in `pointerup`. The browser can take
        // the gesture back — it decides the swipe was a scroll, or a second
        // finger arrives — and then it fires `pointercancel` and nothing else.
        // The old handler listened for `pointerup` alone, so a taken-back drag
        // left the move handler bound to the grip for the rest of the session
        // AND never wrote the new width to storage, losing the resize. (The
        // grip's `touch-action: none`, added alongside this, is what makes the
        // cancel rare; this is what makes it harmless.)
        grip.addEventListener("pointercancel", finish);
      },
      resetWidth() {
        this.width = defaultWidth;
        localStorage.setItem(storageKey, String(defaultWidth));
      }
    }
  };
}
