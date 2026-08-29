<template>
  <!-- FT-1319: THE PLAYER SETTINGS MENU — the first genuinely player-facing
       settings surface, which is exactly the day FT-1198 named when the cog
       left the strip ("if prefs ever grow a genuinely player-facing row, the
       gear can return for players then"). It opens from the top strip's own
       cog (Menu.vue's player strip) for EVERY viewer — a player's rows are
       personal prefs; the storyteller additionally gets the vote timer row,
       one more reader of the state the Vote card already scrubs.

       PLATE, HOIST AND WATCHERS ARE PrefsMenu.vue's OWN, deliberately: same
       face-disc-menu-plate glass, same body-hoist (the strip's .menu is
       overflow: hidden — a plate anchored in flow would be sheared), same
       mousedown-not-click outside close, same z-index 76 (above the strip's
       #controls at 75, below the hoisted dropdown lists Menu.vue's unscoped
       rule pins at 80 — "Reminder pin" is on that rule's label list). The
       one geometric difference: this menu hangs from a mark at the TOP of
       the screen, so it always drops DOWNWARD — PrefsMenu's room-above dance
       has no ceiling to solve here.

       STRUCTURED IN SECTIONS from day one — sub-headline groups, the corner
       menu's own register — and FT-1318 filled the Appearance section with
       the coin-art picker its placeholder row was holding open. -->
  <div class="player-settings" :style="posStyle">
    <ul class="ps-plate">
      <li class="headline headline-plain">
        <img class="hl-mark" :src="uiCog" alt="" />
        Player settings
        <img class="hl-mark" :src="uiCog" alt="" />
      </li>

      <!-- ── Seat ── the pin's resting visibility (FT-1319's own row) ── -->
      <li class="sub-headline">Seat</li>
      <li
        class="setting-row"
        :class="{ 'ps-inert': !hasHover }"
        :title="pinRowTitle"
      >
        <span class="setting-name">Reminder pin</span>
        <OptionSelect
          name="ps-pin-visibility"
          aria-label="Reminder pin"
          hoist
          :options="pinOptions"
          :value="prefs.pinVisibility"
          @input="setPinVisibility"
        />
      </li>

      <!-- ── Timer ── the storyteller's vote seconds, restated here ──
           ONE MORE READER OF THE SAME STATE, not a new mechanism: the
           NumberScrub below is the Vote card's time-per-player control
           verbatim (same value read, same setVotingSeconds delta into
           session/setVotingSpeed, same 0.5s grain), so the two surfaces can
           never disagree about what the timer is. Players do not get the
           row at all — the vote seconds are the host's synced state, and a
           control a player cannot write is a lie in a settings menu. -->
      <template v-if="!session.isSpectator">
        <li class="sub-headline">Timer</li>
        <li
          class="setting-row"
          title="Time per player during a vote — seconds each seat gets before the sweep moves on (the same control the vote card carries)"
        >
          <span class="setting-name">Vote timer</span>
          <span class="ps-timing">
            <NumberScrub
              class="ps-scrub"
              :value="votingSeconds"
              :min="0.5"
              :max="30"
              :step="0.5"
              aria-label="Vote timer, seconds per player"
              title="Time per player, in seconds — drag sideways to scrub, click to type"
              @input="setVotingSeconds"
            />
            <span class="ps-unit">s</span>
          </span>
        </li>
      </template>

      <!-- ── Appearance ── FT-1318: the coin dress, the lab's own looks ──
           THE LOOKS THEMSELVES, NOT THEIR NAMES: each button is its coin at
           thumb size (the same require.context the dev coin lab reads), the
           pick wearing a lit ring. A LOCAL choice — setPref("coinArt") lands
           in golem/prefs, whose PREFS_EVENT listener repaints var(--coin) on
           this browser's root, so every coin instance here (seats, reminder
           tokens, bluffs) re-dresses and nobody else's view moves. -->
      <li class="sub-headline">Appearance</li>
      <li
        class="setting-row ps-coins"
        title="Which coin your town wears — every coin on YOUR screen (seats, reminder tokens, bluffs) repaints; nobody else's view changes"
      >
        <span class="setting-name">Coin art</span>
        <span class="ps-coin-row" role="radiogroup" aria-label="Coin art">
          <button
            v-for="c in coinOptions"
            :key="c.id"
            type="button"
            class="ps-coin"
            :class="{ on: prefs.coinArt === c.id }"
            :title="c.label"
            :aria-pressed="prefs.coinArt === c.id ? 'true' : 'false'"
            @click="setCoinArt(c.id)"
          >
            <img :src="coinThumb(c.id)" :alt="c.label" />
          </button>
        </span>
      </li>
    </ul>
  </div>
</template>

<script>
// The prefs stash and the pin vocabulary — the same one module every
// settings surface reads and writes (golem/prefs' one-stash rule).
import {
  PIN_VISIBILITY,
  PREFS_EVENT,
  prefsState,
  setPref,
} from "../golem/prefs";
// FT-1318: the coin looks the Appearance row offers — the same vocabulary
// golem/prefs sanitizes the pref against and the dev coin lab shows. The
// thumbnails read the coin PNGs directly; the pick itself rides setPref.
import { COINS } from "../golem/coinArt";
import OptionSelect from "./OptionSelect";
// The vote card's own number control — the timer row is that control's
// second mount, not a sibling implementation.
import NumberScrub from "./NumberScrub";
import uiCog from "../assets/ui-cog.png";

// the coin thumbnails — App.vue's coin lab reads the same directory the
// same way, so the row shows exactly the art the choice will paint
const coinThumbs = require.context("../assets/coins", false, /\.png$/);

export default {
  name: "PlayerSettings",
  components: { OptionSelect, NumberScrub },
  props: {
    /** The strip cog this menu hangs from — an element, so the plate can
     *  follow its rect across resizes instead of guessing (PrefsMenu's own
     *  anchor contract). */
    anchor: { default: null },
  },
  data() {
    return {
      uiCog,
      prefs: { ...prefsState },
      // Does this device have a resting pointer? The pin's whole gesture
      // lives on hover-capable screens (coarse pointers retired the disc for
      // the seat menu's row) — the row dims there, PrefsMenu's own idiom.
      hasHover: true,
      // fixed-position coordinates, refreshed by place()
      top: 0,
      left: 0,
    };
  },
  computed: {
    session() {
      return this.$store.state.session;
    },
    pinOptions() {
      return PIN_VISIBILITY;
    },
    /** FT-1318: the Appearance row's looks — the vocabulary itself. */
    coinOptions() {
      return COINS;
    },
    pinRowTitle() {
      return this.hasHover
        ? "The add-reminder pin beside each name plate — standing always, " +
            "or only while the plate is hovered"
        : "This device has no resting pointer, so the pin lives in the " +
            "seat's own menu here; the setting still follows your account";
    },
    /** The Vote card's own read: the store keeps milliseconds, the scrub
     *  speaks whole (and half) seconds. */
    votingSeconds() {
      return this.session.votingSpeed / 1000;
    },
    posStyle() {
      return { top: this.top + "px", left: this.left + "px" };
    },
  },
  mounted() {
    try {
      this.hasHover = window.matchMedia("(hover: hover)").matches;
    } catch (e) {
      this.hasHover = true;
    }
    // Hoist: the strip's .menu is overflow: hidden and #controls is a
    // corner-pinned box — PrefsMenu's own note; Vue tears the node down by
    // its actual parentNode, so moving it does not strand it.
    document.body.appendChild(this.$el);
    this.$nextTick(this.place);
    window.addEventListener("resize", this.place);
    window.addEventListener("scroll", this.place, true);
    // mousedown, not click — the click that OPENS this plate would reach a
    // document `click` listener as it finishes bubbling and shut it in the
    // same gesture (Menu.vue's watchOutside carries the full reasoning).
    document.addEventListener("mousedown", this.onDocDown);
    document.addEventListener("keydown", this.onDocKey);
    window.addEventListener(PREFS_EVENT, this.readPrefs);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.place);
    window.removeEventListener("scroll", this.place, true);
    document.removeEventListener("mousedown", this.onDocDown);
    document.removeEventListener("keydown", this.onDocKey);
    window.removeEventListener(PREFS_EVENT, this.readPrefs);
    if (this.$el && this.$el.parentElement === document.body) {
      this.$el.remove();
    }
  },
  methods: {
    /** Under the cog, centred on it, clamped to the viewport — the plate
     *  hangs from the top strip, so downward is the only direction with
     *  room (PrefsMenu's own fallback drop, promoted to the rule). */
    place() {
      const a = this.anchor;
      if (!a || !a.getBoundingClientRect) return;
      const r = a.getBoundingClientRect();
      const w = this.$el ? this.$el.offsetWidth : 0;
      const vw = window.innerWidth;
      this.left = Math.round(
        Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8),
      );
      this.top = Math.round(r.bottom + 8);
    },
    /** Outside = not this plate, not the cog (its own click is the toggle),
     *  and not a dropdown list this plate hoisted to <body>. */
    onDocDown(e) {
      const t = e.target;
      if (!t || typeof t.closest !== "function") return;
      if (this.$el.contains(t)) return;
      if (this.anchor && this.anchor.contains && this.anchor.contains(t)) {
        return;
      }
      if (t.closest(".gsel-menu")) return;
      this.$emit("close");
    },
    /** Escape closes — unless an open dropdown already answered it
     *  (OptionSelect's Escape calls preventDefault). */
    onDocKey(e) {
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return;
      this.$emit("close");
    },
    readPrefs() {
      this.prefs = { ...prefsState };
    },
    setPinVisibility(v) {
      setPref("pinVisibility", v);
    },
    // ── FT-1318: the coin picker ─────────────────────────────────────────
    /** The look's own art, at thumb size — never a name where the thing
     *  itself can stand. */
    coinThumb(id) {
      return coinThumbs("./" + id + ".png");
    },
    /** One write: golem/prefs sanitizes, persists, syncs the account bag,
     *  and its own PREFS_EVENT listener repaints every coin surface. */
    setCoinArt(id) {
      setPref("coinArt", id);
    },
    // ── the timer row: Vote.vue's own two methods, verbatim ─────────────
    setVotingSpeed(diff) {
      const speed = Math.round(this.session.votingSpeed + diff);
      if (speed > 0) {
        this.$store.commit("session/setVotingSpeed", speed);
      }
    },
    setVotingSeconds(seconds) {
      this.setVotingSpeed(seconds * 1000 - this.session.votingSpeed);
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
// the glass the corner menu's sections wear — same plate, same radius
@import "../faceDisc.scss";
// $control-toggle-well — the app's one recessed-control shadow
@import "../controls.scss";

.player-settings {
  position: fixed;
  z-index: 76;
  width: max-content;
  text-align: left;
}

.ps-plate {
  // `position: relative` is load-bearing: the plate's two layers are
  // `absolute; inset: 0` and need this box as their host (PrefsMenu's
  // pm-plate carries the same note).
  position: relative;
  @include face-disc-menu-plate($radius: 10px);
  list-style-type: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  padding: 0;

  li {
    padding: 2px 5px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 30px;
    background: transparent;
  }

  // the corner menu's plain headline (FT-1044b's `headline-plain` register)
  .headline {
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
    padding: 0 10px;
    text-align: center;
    justify-content: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.5);
  }
  img.hl-mark {
    width: 13px;
    height: 13px;
    object-fit: contain;
    opacity: 0.75;
  }

  // the corner menu's group label — small, dim, uppercase (Menu.vue's own)
  .sub-headline {
    justify-content: flex-start;
    min-height: 0;
    padding: 6px 10px 1px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    opacity: 0.45;
    cursor: default;
  }

  // FT-1174's row shape: name left, control right, no red hover lie
  .setting-row {
    cursor: default;
    gap: 14px;
    padding: 4px 10px;
    .setting-name {
      white-space: nowrap;
    }
  }

  // a row whose gesture this device cannot perform — the words dim, the
  // control stays live (the value still follows the account; the row's
  // title says so). PrefsMenu's pm-inert, same register.
  .ps-inert .setting-name {
    opacity: 0.55;
  }

  // FT-1318: the coin picker — a row of the looks themselves. The resting
  // coins sit dim and brighten on hover; the pick stands at full strength
  // inside a lit ring. NO overflow/clip on the buttons: the coins are
  // toothed wheels and carry their own edge (Token.vue's rule) — the ring
  // is a box-shadow, which clips nothing.
  .ps-coin-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ps-coin {
    width: 34px;
    height: 34px;
    padding: 2px;
    background: transparent;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    opacity: 0.55;
    transition:
      opacity 150ms,
      box-shadow 150ms;
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    &:hover {
      opacity: 0.85;
    }
    &.on {
      opacity: 1;
      box-shadow: 0 0 0 2px rgba(246, 232, 200, 0.65);
    }
  }

  // the timer row's scrub + unit, the Vote card's vo-timing pair at row scale
  .ps-timing {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ps-unit {
    opacity: 0.7;
  }

  // FT-1198's sunken trigger, verbatim — the shared control-plate is
  // invisible against the glass, so the well recipe rides along with the
  // section wherever it opens (PrefsMenu carries the same correction).
  .setting-row ::v-deep .trigger {
    background: rgba(0, 0, 0, 0.42);
    border: 1px solid rgba(120, 105, 135, 0.35);
    box-shadow: $control-toggle-well;
  }
}
</style>
