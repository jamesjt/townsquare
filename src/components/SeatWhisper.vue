<template>
  <!--
    Golem fork (FT-1206): THE SEAT'S OWN WHISPER — one inline input, every
    scheme.

    All three control schemes end their whisper gesture here: the nameplate
    plate's "Whisper" row swaps the glass to this box, the hover ring's coin
    opens it anchored on the same seat, and the click scheme's plate-side disc
    opens it too. ONE component on purpose — the user's spec says the input is
    built once and reused — so the three gestures can never drift into three
    composers.

    IT IS THE PLATE'S OWN GLASS, laid ON the coin exactly where SeatMenu's
    plate sits ("stays on the glass"): same material (face-disc-menu-plate),
    same portal (the root stays in the seat, only the box travels to the
    body — SeatMenu's template records why both halves are load-bearing), same
    centred placement, same dismissal grammar (Escape, outside mousedown,
    scroll/resize). What it holds is a caption naming who this goes to, the
    entry, and a send.

    WHAT IT SENDS IS NOT ITS BUSINESS. Enter/send emits the text; the seat
    (Player.vue) builds the frame with golem/chat's whisperFrame and commits
    the same chatSay mutation the Chronicle's composer rides — one send path,
    one privacy contract, and the plane + toast fall out of the same funnel.
  -->
  <div class="seat-whisper-portal">
    <div
      class="seat-whisper"
      :style="style"
      ref="box"
      @mouseenter="$emit('hold')"
      @mouseleave="$emit('release')"
    >
      <span class="sw-to">
        <font-awesome-icon icon="paper-plane" />
        Whisper {{ name }}
      </span>
      <div class="sw-entry">
        <input
          ref="entry"
          v-model="draft"
          class="sw-input"
          type="text"
          :maxlength="bodyMax"
          :placeholder="'To ' + name + '…'"
          spellcheck="false"
          @keyup.enter="send"
        />
        <button
          type="button"
          class="sw-send"
          :disabled="!draft.trim()"
          title="Send"
          @click="send"
        >
          <font-awesome-icon icon="paper-plane" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { BODY_MAX } from "../golem/chat";

/** Never nearer the window's edge than this — SeatMenu's own margin. */
const MARGIN = 8;

export default {
  props: {
    /** The coin this box covers — the seat's own `.player .token`. */
    anchor: { default: null },
    /** Who the whisper goes to, for the caption and the placeholder. */
    name: { type: String, default: "" },
    /** The seat's own `<li>` — a press inside it is not a press outside,
     *  SeatMenu's contract verbatim. */
    owner: { default: null },
  },
  data() {
    return {
      draft: "",
      style: { top: "-9999px", left: "-9999px" },
      bodyMax: BODY_MAX,
    };
  },
  mounted() {
    this.hoist();
    this.place();
    this.$nextTick(() => {
      if (this.$refs.entry) this.$refs.entry.focus();
    });
    // NOT the plate's take-it-down pair: a menu dropped by a scroll costs a
    // re-open, a composer dropped by one costs a HALF-TYPED MESSAGE — and an
    // incidental scroll (focus settling, a trackpad graze) was measured doing
    // exactly that. The box follows its coin instead; only a real departure
    // (Escape, a press outside, a drag starting) puts it away.
    window.addEventListener("scroll", this.onMoved, true);
    window.addEventListener("resize", this.onMoved);
    document.addEventListener("dragstart", this.onDismiss, true);
    // MOUSEDOWN, never click — FT-1174's trap, recorded in SeatMenu: a click
    // listener registered while the opening click is still bubbling receives
    // that very click and shuts the box in the gesture that opened it.
    document.addEventListener("mousedown", this.onOutsideDown);
    document.addEventListener("keydown", this.onKey);
  },
  beforeDestroy() {
    window.removeEventListener("scroll", this.onMoved, true);
    window.removeEventListener("resize", this.onMoved);
    document.removeEventListener("dragstart", this.onDismiss, true);
    document.removeEventListener("mousedown", this.onOutsideDown);
    document.removeEventListener("keydown", this.onKey);
    // we moved the box, so we put it away — Vue only removes the root, which
    // never left the seat
    const el = this.$refs.box;
    if (el && el.parentElement === document.body) document.body.removeChild(el);
  },
  watch: {
    anchor() {
      this.place();
    },
  },
  methods: {
    send() {
      const body = this.draft.trim();
      if (!body) return;
      this.draft = "";
      this.$emit("send", body);
    },
    onDismiss() {
      this.$emit("dismiss");
    },
    /** The view moved under the box — follow the coin (see the mounted note
     *  for why this is not the menus' dismiss). */
    onMoved() {
      this.place();
    },
    onOutsideDown(e) {
      const t = e.target;
      if (!t || typeof t.closest !== "function") return;
      const box = this.$refs.box;
      if (box && box.contains(t)) return;
      if (this.owner && this.owner.contains(t)) return;
      this.$emit("dismiss");
    },
    /** Escape restores whatever opened this (the seat decides what that
     *  means — the plate scheme brings its menu back). `defaultPrevented`
     *  guards against a nearer surface having already spent the key. */
    onKey(e) {
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return;
      this.$emit("dismiss");
    },
    hoist() {
      const el = this.$refs.box;
      if (el && el.parentElement !== document.body)
        document.body.appendChild(el);
    },
    /** ON THE COIN, clamped to the window — SeatMenu's own two-pass centring
     *  (a box measured at its off-screen park reports a stale size). */
    place() {
      const el = this.$refs.box;
      const a = this.anchor;
      if (!el || !a || typeof a.getBoundingClientRect !== "function") return;
      const run = () => {
        const rect = a.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        const w = box.width;
        const h = box.height;
        if (!w || !h) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const clamp = (v, lo, hi) =>
          Math.min(Math.max(v, lo), Math.max(lo, hi));
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        this.style = {
          left: `${Math.round(clamp(cx - w / 2, MARGIN, vw - w - MARGIN))}px`,
          top: `${Math.round(clamp(cy - h / 2, MARGIN, vh - h - MARGIN))}px`,
        };
      };
      run();
      requestAnimationFrame(run);
    },
  },
};
</script>

<style lang="scss">
@import "../vars.scss";
@import "../faceDisc.scss";

/* NOT SCOPED — the box is re-parented to document.body; the class is
   namespaced instead. RoleHoverCard and SeatMenu both record this call. */

.seat-whisper-portal {
  display: none;
}

.seat-whisper {
  position: fixed;
  /* level with the seat plate and the hover ring — if any two coincide, this
     is the one being typed into */
  z-index: 201;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  min-width: 220px;
  color: white;
  font-size: 14px;
  text-align: left;
  /* the plate's own glass — no third recipe */
  @include face-disc-menu-plate;
}

.sw-to {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: bold;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  svg {
    width: 14px;
    flex: 0 0 14px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
  }
}

.sw-entry {
  display: flex;
  gap: 6px;
}

.sw-input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 5px 8px;
  border-radius: 8px;
  border: 1px solid #4b3565;
  background: rgba(8, 5, 12, 0.72);
  color: #fff;
  font-size: 14px;
  line-height: 1.3;
  outline: none;

  &:focus {
    border-color: #a78fcd;
    box-shadow: 0 0 6px rgba(167, 143, 205, 0.4);
  }

  &::placeholder {
    color: rgba(214, 200, 246, 0.55);
  }
}

.sw-send {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  border-radius: 8px;
  border: 1px solid #4b3565;
  background: rgba(58, 44, 74, 0.85);
  color: #f4eeff;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: #a78fcd;
    color: #fff;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

@media (pointer: coarse) {
  .seat-whisper {
    min-width: 250px;
  }
  .sw-input {
    font-size: 16px;
    padding: 8px 10px;
  }
  .sw-send {
    width: 40px;
  }
}
</style>
