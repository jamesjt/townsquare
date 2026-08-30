<template>
  <!-- FT-1319: THE PLAYER SETTINGS MENU — the first genuinely player-facing
       settings surface, which is exactly the day FT-1198 named when the cog
       left the strip ("if prefs ever grow a genuinely player-facing row, the
       gear can return for players then"). It opens from the top strip's own
       cog (Menu.vue's player strip) for EVERY viewer — a player's rows are
       personal prefs. (FT-1331/FT-1333: the storyteller-only "Vote timer"
       row that briefly lived here went home to the vote card — FT-1325's
       misread of "move the timer options"; the timer menu the user meant,
       the hour display's Off / Hands / Digital / Numerals, is the Timer
       section below now, moved whole from the toolbar hourglass.)

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
      <!-- FT-1328: the coin numeral toggle — genuinely on/off, so it wears
           OptionCheck (FT-1268's rule) rather than a two-row select. Hiding
           it hides the Roman numeral everywhere a coin draws one (the empty
           seat's and any seated coin's); the resting chair FT-1328 centred
           on an empty coin then stands alone. -->
      <li
        class="setting-row"
        title="The Roman numeral every coin wears — turn it off to leave the resting chair alone on an empty seat"
      >
        <!-- (User rename, 2026-08-29: the visible label is "Cog Numerals" —
             label text only; the pref key stays coinNumerals.) -->
        <span class="setting-name">Cog Numerals</span>
        <OptionCheck
          name="ps-coin-numerals"
          aria-label="Cog Numerals"
          :options="numeralOptions"
          :value="prefs.coinNumerals"
          @input="setCoinNumerals"
        />
      </li>

      <!-- ── Timer ── FT-1333: the hour display's own menu, re-homed ──
           (FT-1331/user correction: the "Vote timer" scrub that stood here
           was FT-1325's misread — the vote timer is a storyteller control
           and went home to the vote card. THIS is the timer menu the user
           meant: the toolbar hourglass's four rows, Off / Hands / Digital /
           Numerals, moved here whole — same rows, same wiring, the FT-1052
           toggles with Off as the DERIVED all-clear — and the hourglass
           itself stands down in the strip (Menu.vue). The host-vs-player
           split rides along untouched: a storyteller's pick sets the TOWN's
           display, a player's sets their own screen —
           towerBells.toggleHourLayer owns that split, not this menu.) -->
      <li class="sub-headline">Timer</li>
      <li
        v-for="m in hourRows"
        :key="m.id"
        class="ps-hour-row"
        :title="m.hint"
        @click="pickHourMode(m.id)"
      >
        {{ m.label }}
        <em>
          <font-awesome-icon
            :icon="['fas', hourChecked(m.id) ? 'check-square' : 'square']"
          />
        </em>
      </li>

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
// FT-1328: the coin-numeral row's control — a genuine on/off, OptionCheck's
// own idiom (FT-1268), not a select.
import OptionCheck from "./OptionCheck";
// (FT-1333: the NumberScrub import left with the "Vote timer" row — that
// scrub went home to the vote card, FT-1331. Kept out rather than stood
// down: a registered-but-unrendered component trips vue/no-unused-components.)
// FT-1333: the Timer section's furniture — the toolbar hourglass menu's own
// rows and wiring (Menu.vue's tower tab, now standing down), whole.
import {
  HOUR_LAYERS,
  HOUR_OFF,
  TOWER_EVENT,
  toggleHourLayer,
  effectiveHourFlags,
  hourAllOff,
} from "../golem/towerBells";
import uiCog from "../assets/ui-cog.png";

// the coin thumbnails — App.vue's coin lab reads the same directory the
// same way, so the row shows exactly the art the choice will paint
const coinThumbs = require.context("../assets/coins", false, /\.png$/);

export default {
  name: "PlayerSettings",
  components: { OptionSelect, OptionCheck },
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
      // FT-1333: the Timer section's rows and this screen's current flags —
      // Menu.vue's tower-tab furniture verbatim (the Off row ahead of the
      // three layer toggles; a plain module object is not reactive, so
      // readTowerMode refreshes the snapshot on TOWER_EVENT).
      hourRows: [HOUR_OFF, ...HOUR_LAYERS],
      towerHour: effectiveHourFlags(this.$store.state.session),
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
    /** FT-1328: the coin-numeral row's option pair — On/Off, the same shape
     *  PrefsMenu's control toggles build for OptionCheck. */
    numeralOptions() {
      return [
        {
          value: true,
          label: "On",
          title: "Every coin wears its Roman numeral",
        },
        {
          value: false,
          label: "Off",
          title: "Hide the Roman numeral on every coin",
        },
      ];
    },
    pinRowTitle() {
      return this.hasHover
        ? "The add-reminder pin beside each name plate — standing always, " +
            "or only while the plate is hovered"
        : "This device has no resting pointer, so the pin lives in the " +
            "seat's own menu here; the setting still follows your account";
    },
    /** STOOD DOWN (FT-1333) — the "Vote timer" row's read; the scrub went
     *  home to the vote card (FT-1331, user correction). Kept per the house
     *  never-delete rule, with its two writers below. */
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
    // FT-1333: the tower moved (any surface) — re-read the Timer checks.
    window.addEventListener(TOWER_EVENT, this.readTowerMode);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.place);
    window.removeEventListener("scroll", this.place, true);
    document.removeEventListener("mousedown", this.onDocDown);
    document.removeEventListener("keydown", this.onDocKey);
    window.removeEventListener(PREFS_EVENT, this.readPrefs);
    window.removeEventListener(TOWER_EVENT, this.readTowerMode);
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
    /** FT-1328: one write, golem/prefs' usual round trip (sanitize, persist,
     *  sync, PREFS_EVENT repaint — Player.vue's showSeatNumeral reads it). */
    setCoinNumerals(on) {
      setPref("coinNumerals", on);
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
    // ── FT-1333: the Timer section — Menu.vue's tower-tab methods, whole ─
    /** The tower moved (any surface) — re-read which layers this screen
     *  shows (session passed so a storyteller's checks track the TOWN's
     *  flags, never a stale player-era override — FT-1020c). */
    readTowerMode() {
      this.towerHour = effectiveHourFlags(this.session);
    },
    /** FT-1052: is this row's check on? Off is DERIVED — checked exactly
     *  when none of the three layers are. */
    hourChecked(id) {
      if (id === "off") return hourAllOff(this.towerHour);
      return !!this.towerHour[id];
    },
    /** One layer toggled (or Off clearing all three). towerBells owns the
     *  host-vs-player split. */
    pickHourMode(id) {
      toggleHourLayer(this.session, id);
    },
    // ── STOOD DOWN (FT-1333) — the "Vote timer" row's two writers ────────
    // FT-1331 (user correction) sent the vote-timer scrub home to the vote
    // card; these were its wiring here and nothing renders them now. Kept
    // per the house never-delete rule; whoever removes them should do so
    // deliberately.
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

  // ── NO LONGER REACHED, AND LEFT IN PLACE (FT-1333) ─────────────────────
  // These dressed the "Vote timer" row's scrub + unit; that scrub went home
  // to the vote card (FT-1331, user correction) and nothing here renders
  // them. Kept per the house never-delete rule.
  .ps-timing {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ps-unit {
    opacity: 0.7;
  }

  // FT-1333: the Timer section's four rows — clickable, unlike the
  // setting-rows around them (they ARE the control: click toggles, the
  // check answers), so they carry a pointer and the plate hover the app's
  // glass menus use. The check keeps Menu.vue's word-left / mark-right
  // shape inside this menu's own row box.
  .ps-hour-row {
    cursor: pointer;
    padding: 2px 10px;
    &:hover {
      background: rgba(167, 143, 205, 0.18);
    }
    em {
      font-style: normal;
      opacity: 0.9;
    }
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
