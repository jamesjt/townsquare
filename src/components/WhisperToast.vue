<template>
  <!--
    Golem fork (FT-1206): THE UNFOLDED WHISPER — a whisper that reaches YOU
    lands as a toast: the paper airplane holds a beat, then unfolds into a
    small crumpled note carrying the sender's name and the message (clipped to
    its head — the Chronicle holds the whole line). Clicking a note opens the
    Chronicle, where the whisper is the newest thing in the stream. Several
    arriving together stack; each dismisses itself after a read's worth of
    time.

    FED BY THE SOCKET, NOT THE LOG: socket.js raises WHISPER_TOAST_EVENT only
    for a LIVE row addressed to this viewer (never on catch-up), so a reload
    cannot replay a night's worth of toasts — see _notifyWhisper.

    THE ART STAYS IN THE FORK'S REGISTER: the plane is WhisperPlanes' own
    glyph, the note is bone-warm paper with the grimoire's dark ink, and the
    unfold is a simple two-state swap (plane → note), CSS-eased, deliberately
    not over-animated. `prefers-reduced-motion` skips the fold entirely and
    shows the note.
  -->
  <div class="whisper-toasts">
    <transition-group name="wt" tag="div" class="wt-stack">
      <button
        v-for="t in toasts"
        :key="t.id"
        type="button"
        class="wt-toast"
        :class="{ open: t.unfolded }"
        :title="'Open the Chronicle at this whisper'"
        @click="open(t)"
      >
        <span class="wt-plane" v-if="!t.unfolded">
          <svg viewBox="0 0 24 24">
            <path class="wp-body" d="M22.8 2.2 1.6 10.9l6 2.5L22.8 2.2Z" />
            <path
              class="wp-body"
              d="M22.8 2.2 9.2 14.8l.3 6.4 3-4.4 5.6-2.2 4.7-12.4Z"
            />
            <path class="wp-fold" d="M9.2 14.8 22.8 2.2 12.2 16.4l-3-1.6Z" />
          </svg>
        </span>
        <span class="wt-note" v-else>
          <span class="wt-from">{{ t.from }} whispers</span>
          <span class="wt-body">{{ t.head }}</span>
        </span>
      </button>
    </transition-group>
  </div>
</template>

<script>
import {
  WHISPER_TOAST_EVENT,
  TOAST_HOLD_MS,
  TOAST_UNFOLD_MS,
} from "../golem/whisperMarks";

/** How much of a long whisper the note shows — the Chronicle has the rest. */
const HEAD_MAX = 140;

export default {
  data() {
    return { toasts: [], nextId: 1 };
  },
  mounted() {
    window.addEventListener(WHISPER_TOAST_EVENT, this.onWhisper);
  },
  beforeDestroy() {
    window.removeEventListener(WHISPER_TOAST_EVENT, this.onWhisper);
    this.toasts.forEach((t) => t.timers.forEach(clearTimeout));
  },
  methods: {
    onWhisper(e) {
      const row = e && e.detail;
      if (!row || !row.body) return;
      let reduced = false;
      try {
        reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (err) {
        reduced = false;
      }
      const id = this.nextId++;
      const body = String(row.body);
      const toast = {
        id,
        from: row.senderKey || "Someone",
        head: body.length > HEAD_MAX ? body.slice(0, HEAD_MAX) + "…" : body,
        unfolded: reduced,
        timers: [],
      };
      this.toasts.push(toast);
      if (!reduced) {
        toast.timers.push(
          setTimeout(() => {
            toast.unfolded = true;
          }, TOAST_UNFOLD_MS),
        );
      }
      toast.timers.push(
        setTimeout(
          () => this.dismiss(id),
          TOAST_HOLD_MS + (reduced ? 0 : TOAST_UNFOLD_MS),
        ),
      );
    },
    dismiss(id) {
      const t = this.toasts.find((q) => q.id === id);
      if (t) t.timers.forEach(clearTimeout);
      this.toasts = this.toasts.filter((q) => q.id !== id);
    },
    /** The note is a doorway: the Chronicle opens (if it is not already up)
     *  with its stream stuck to the newest line — which this whisper is. */
    open(t) {
      this.dismiss(t.id);
      if (!this.$store.state.modals.chroniclesDrawer) {
        this.$store.commit("toggleModal", "chroniclesDrawer");
      }
    },
  },
};
</script>

<style lang="scss">
.whisper-toasts {
  position: fixed;
  top: 64px;
  right: 18px;
  /* over the drawers (55) and the player strip (75), under the menu plates
     (201) — a note about a message should never cover a control being
     operated */
  z-index: 120;
  pointer-events: none;
}

.wt-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.wt-toast {
  pointer-events: auto;
  display: block;
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  /* the unfold: the box eases between its two states' sizes */
  transition: transform 240ms ease;

  &:hover {
    transform: translateX(-2px);
  }
}

/* state one: the folded plane, just landed */
.wt-plane {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;

  svg {
    width: 30px;
    height: 30px;
    overflow: visible;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.7));
    /* a small settle, so the landing reads as an arrival */
    animation: wt-land 240ms ease-out;
  }

  .wp-body {
    fill: #e6dcc4;
  }
  .wp-fold {
    fill: #b8ac8e;
  }
}

/* state two: the crumpled note it unfolds into — bone paper, dark ink,
   hung a degree off square the way a pinned scrap sits */
.wt-note {
  display: block;
  max-width: 260px;
  padding: 8px 12px;
  border-radius: 3px 7px 4px 6px;
  transform: rotate(-1.2deg);
  background: radial-gradient(
      ellipse at 30% 20%,
      rgba(255, 252, 240, 0.5) 0%,
      rgba(255, 252, 240, 0) 55%
    ),
    radial-gradient(
      ellipse at 75% 80%,
      rgba(120, 105, 75, 0.22) 0%,
      rgba(120, 105, 75, 0) 60%
    ),
    #e6dcc4;
  border: 1px solid #b8ac8e;
  box-shadow:
    inset 0 0 14px rgba(120, 105, 75, 0.28),
    0 3px 9px rgba(0, 0, 0, 0.6);
  color: #241a2e;
  animation: wt-unfold 260ms ease-out;
}

.wt-from {
  display: block;
  font-size: 11px;
  font-weight: bold;
  letter-spacing: 0.04em;
  color: #5c4a6e;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wt-body {
  display: block;
  font-size: 13px;
  line-height: 1.35;
  word-break: break-word;
}

@keyframes wt-land {
  from {
    transform: translate(14px, -10px) rotate(24deg) scale(0.7);
    opacity: 0;
  }
}

/* the unfold — the note opens out of the plane's own footprint */
@keyframes wt-unfold {
  from {
    transform: rotate(-1.2deg) scale(0.35, 0.15);
    opacity: 0.4;
  }
  60% {
    transform: rotate(-1.2deg) scale(1.04, 0.7);
  }
}

/* the stack's own enter/leave */
.wt-enter {
  opacity: 0;
}
.wt-leave-to {
  opacity: 0;
  transform: translateX(12px);
}
.wt-enter-active,
.wt-leave-active,
.wt-move {
  transition:
    opacity 240ms ease,
    transform 240ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .wt-plane svg,
  .wt-note {
    animation: none;
  }
  .wt-enter-active,
  .wt-leave-active,
  .wt-move,
  .wt-toast {
    transition: none;
  }
}
</style>
