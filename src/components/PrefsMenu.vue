<template>
  <!-- FT-1202 (user): THE SETTINGS MENU, MOVED OUT WHOLE. "right now all it
       is is host control settings lets remove it from the main page, and in
       while a user is hosting a game put it inline with the town name."

       This is Menu.vue's cog section — the same headline, the same three
       NAME + DROPDOWN rows (FT-1174's shape), the same glass plate (FT-1193's
       face-disc-menu-plate) — lifted into its own component so it can open
       from the gear's new home, the host panel's head (HostTools' `.ht-cog`),
       instead of the corner strip the cog left. Menu.vue's copy stands down
       in place rather than being deleted, per the house rule.

       BODY-HOISTED, THE WHOLE PANEL. The host panel is `overflow-y: auto` in
       its rectangle layout and a scrolling bottom sheet on both phone
       orientations — a plate anchored in flow would be sheared or would grow
       the scroller (the same containment problem FT-1167 hit on the night
       sheet's lists, answered the same way: OptionSelect's own hoist is the
       precedent this copies). The root moves to <body> on mount, tracks the
       gear's rect, and comes back out on destroy.

       Z-INDEX 76: above the corner strip's `#controls` (75) and the host
       panel (19), BELOW the hoisted dropdown lists (Menu.vue's unscoped rule
       pins these three lists' `.gsel-menu.hoisted` at 80 by aria-label — the
       same aria-labels this copy uses, deliberately, so the lists it opens
       paint over it) and below the ask panel (120). -->
  <div class="prefs-menu" :style="posStyle">
    <ul class="pm-plate">
      <li class="headline headline-plain">
        <font-awesome-icon :icon="['fas', 'cog']" class="hl-cog" />
        Your settings
        <font-awesome-icon :icon="['fas', 'cog']" class="hl-cog" />
      </li>
      <li class="setting-row">
        <span class="setting-name">Setup panel</span>
        <OptionSelect
          name="prefs-setup-labels"
          aria-label="Setup panel labels"
          hoist
          :options="setupLabelOptions"
          :value="prefs.setupIconsOnly"
          @input="setIconsOnly"
        />
      </li>
      <li class="setting-row">
        <span class="setting-name">Control scheme</span>
        <OptionSelect
          name="prefs-control-scheme"
          aria-label="Control scheme"
          hoist
          :options="controlSchemeOptions"
          :value="prefs.controlScheme"
          @input="pickScheme"
        />
      </li>
      <li class="setting-row">
        <span class="setting-name">Grimoire size</span>
        <OptionSelect
          name="prefs-grimoire-size"
          aria-label="Grimoire size"
          hoist
          :options="grimoireSizeOptions"
          :value="prefs.grimoireSize"
          @input="pickGrimoireSize"
        />
      </li>
    </ul>
  </div>
</template>

<script>
// The prefs stash and its vocabulary — the same imports Menu.vue's stood-down
// copy of this section holds, reading and writing the same one module.
import {
  CONTROL_SCHEMES,
  GRIMOIRE_SIZES,
  SETUP_LABELS,
  PREFS_EVENT,
  prefsState,
  setPref,
} from "../golem/prefs";
import OptionSelect from "./OptionSelect";

export default {
  name: "PrefsMenu",
  components: { OptionSelect },
  props: {
    /** The gear this menu hangs from — an element, so the panel can follow
     *  its rect across the host panel's four layouts instead of guessing. */
    anchor: { default: null },
  },
  data() {
    return {
      prefs: { ...prefsState },
      // fixed-position coordinates, refreshed by place()
      top: 0,
      left: 0,
    };
  },
  computed: {
    setupLabelOptions() {
      return SETUP_LABELS;
    },
    controlSchemeOptions() {
      return CONTROL_SCHEMES.map((s) => ({
        value: s.id,
        label: s.label,
        title: s.title,
      }));
    },
    grimoireSizeOptions() {
      return GRIMOIRE_SIZES.map((g) => ({
        value: g.id,
        label: g.label,
        title: g.title,
      }));
    },
    posStyle() {
      return { top: this.top + "px", left: this.left + "px" };
    },
  },
  mounted() {
    // Hoist: see the template note. Vue tears the node down by its actual
    // parentNode, so moving it does not strand it (OptionSelect's own hoist
    // relies on the same fact for its list).
    document.body.appendChild(this.$el);
    this.$nextTick(this.place);
    window.addEventListener("resize", this.place);
    // capture: the host panel's rectangle layout scrolls, and a scroll
    // anywhere between the gear and the viewport moves the anchor
    window.addEventListener("scroll", this.place, true);
    // mousedown, not click — the click that OPENS this panel would reach a
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
    // a body-hoisted node is outside the parent Vue removes from — take it
    // out ourselves (idempotent if Vue already did)
    if (this.$el && this.$el.parentElement === document.body) {
      this.$el.remove();
    }
  },
  methods: {
    /** Stand the plate under the gear, centred on it, clamped to the
     *  viewport with the same 8px margin OptionSelect's hoisted list keeps. */
    place() {
      const a = this.anchor;
      if (!a || !a.getBoundingClientRect) return;
      const r = a.getBoundingClientRect();
      const w = this.$el ? this.$el.offsetWidth : 0;
      const vw = window.innerWidth;
      this.top = Math.round(r.bottom + 8);
      this.left = Math.round(
        Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8),
      );
    },
    /** Outside = not this plate, not the gear (its own click is the toggle),
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
     *  (OptionSelect's Escape calls preventDefault; Menu.vue's onOutsideKey
     *  documents why the flag, not the DOM, is the reliable test). */
    onDocKey(e) {
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return;
      this.$emit("close");
    },
    readPrefs() {
      this.prefs = { ...prefsState };
    },
    setIconsOnly(on) {
      setPref("setupIconsOnly", on);
    },
    pickScheme(id) {
      setPref("controlScheme", id);
    },
    pickGrimoireSize(id) {
      setPref("grimoireSize", id);
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

.prefs-menu {
  position: fixed;
  z-index: 76;
  width: max-content;
  text-align: left;
}

.pm-plate {
  // `position: relative` is load-bearing: the plate's two layers are
  // `absolute; inset: 0` and need this box as their host (Menu.vue's
  // section-plate carries the same note).
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
  .hl-cog {
    font-size: 75%;
    opacity: 0.75;
  }

  // FT-1174's row shape: name left, dropdown right, no red hover lie
  .setting-row {
    cursor: default;
    gap: 14px;
    padding: 4px 10px;
    .setting-name {
      white-space: nowrap;
    }
  }

  // FT-1198's sunken trigger, verbatim — the shared control-plate is
  // invisible against the glass, so the well recipe rides along with the
  // section wherever it opens.
  .setting-row ::v-deep .trigger {
    background: rgba(0, 0, 0, 0.42);
    border: 1px solid rgba(120, 105, 135, 0.35);
    box-shadow: $control-toggle-well;
  }
}
</style>
