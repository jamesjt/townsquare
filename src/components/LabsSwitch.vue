<template>
  <!--
    Golem fork (FT-1237): THE HIDDEN LABS SWITCH — an invisible hotspot in
    the window's bottom-left corner that cycles a local override of the
    platform's `labs` flag: follow the account → on → off → follow the
    account. The model, the storage and the store plumbing live in
    golem/labsSwitch.js; this file is only the corner and the whisper of
    acknowledgement.

    HIDDEN MEANS HIDDEN: no paint, no cursor change, no title, no tab stop
    (a div, not a button — on purpose; a focusable invisible control would
    be a keyboard trap wearing a blindfold), aria-hidden so a screen reader
    never trips over a dev switch. The ONLY visible trace is the moment of
    the click: a brief note naming the new state, wearing the whisper
    toast's own paper (`.wt-note` — WhisperToast.vue's styles are global,
    so the chrome is reused, not copied).

    Z-ORDER: 15 — under the demon-bluffs cluster (20) and the storyteller's
    post (21), which both live near this corner in-game. The bluffs box sits
    10px in from the edge, so the corner's outermost strip always reaches
    the hotspot; on the entry screen the corner is clear outright.
  -->
  <div class="labs-switch" aria-hidden="true">
    <div class="ls-hotspot" @click="cycle"></div>
    <!-- ONE note, un-keyed on purpose: a rapid re-click swaps its TEXT in
         place (instant, no restart flash) instead of cross-fading two
         overlapping copies of the same paper. -->
    <transition name="ls">
      <span class="wt-note ls-note" v-if="notice">{{ notice }}</span>
    </transition>
  </div>
</template>

<script>
import { applyLabsOverride, cycleLabs } from "../golem/labsSwitch";

/** How long the acknowledgement note stays up. */
const NOTICE_MS = 1800;

export default {
  data() {
    return { notice: "", timer: null };
  },
  created() {
    // a stored override counts from the first paint, even if the platform
    // never answers the boot flags fetch
    applyLabsOverride(this.$store);
  },
  beforeDestroy() {
    clearTimeout(this.timer);
  },
  methods: {
    cycle() {
      const next = cycleLabs(this.$store);
      this.notice =
        next === "on"
          ? "Labs on (local)"
          : next === "off"
          ? "Labs off (local)"
          : "Labs follows the account";
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.notice = "";
      }, NOTICE_MS);
    },
  },
};
</script>

<style lang="scss">
.labs-switch {
  position: fixed;
  bottom: 0;
  left: 0;
  /* FT-1243 (user report): at 15 the modal backdrop (Chronicles etc.)
     covered the corner, so a click there CLOSED the modal instead of
     toggling Labs — which read as "the labs button isn't working". A dev
     switch may stand over everything; the backdrop loses 28px of corner,
     which click-to-close never needed. 15 stood down for the record. */
  z-index: 95;

  .ls-hotspot {
    width: 28px;
    height: 28px;
    /* invisible, and it stays invisible on interaction too */
    background: transparent;
    cursor: default;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  /* the acknowledgement: the whisper toast's paper (.wt-note, global from
     WhisperToast.vue), repositioned to rise out of this corner */
  .ls-note {
    position: absolute;
    bottom: 34px;
    left: 8px;
    white-space: nowrap;
    max-width: none;
    animation: none; /* not an unfold — it is not a whisper arriving */
    pointer-events: none;
  }
}

.ls-enter,
.ls-leave-to {
  opacity: 0;
  transform: rotate(-1.2deg) translateY(4px);
}
.ls-enter-active,
.ls-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .ls-enter-active,
  .ls-leave-active {
    transition: none;
  }
}
</style>
