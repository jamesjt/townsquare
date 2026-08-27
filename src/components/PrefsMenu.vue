<template>
  <!-- FT-1209 (user): LARGELY STOOD DOWN — the three rows live on the host
       panel's own THIRD TAB now ("Control settings", HostTools' SETUP_TABS),
       and the gear beside the town name opens that tab, not this plate. This
       component keeps ONE live mount: the RE-ENTRY face (HostTools with
       `reentry` — a game runs, the head and its gear render, the tab strip
       does not), where it remains the returning storyteller's only door to
       these settings. FT-1208's above-the-disc placement logic below rides
       on for that one face rather than retiring: the menu it positions still
       opens there. Everything else in this file is unchanged, per the house
       rule — the build face simply never sets `prefsOpen` any more. -->
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
      <!-- FT-1213: the exclusive "Control scheme" dropdown stood down for
           the six independent CONTROL_TOGGLES (golem/prefs carries the
           reasoning). This plate is the RE-ENTRY face's only settings door,
           so it shows the same six rows the build face's Control settings
           tab shows — same keys, same writer, same teaching titles. The
           hoisted lists' z-index rule lives in Menu.vue's unscoped block,
           extended with these rows' aria-labels. -->
      <li
        class="setting-row"
        v-for="t in controlToggles"
        :key="t.key"
        :class="{ 'pm-inert': t.inert }"
        :title="t.rowTitle"
      >
        <span class="setting-name">{{ t.label }}</span>
        <OptionSelect
          :name="'prefs-' + t.key"
          :aria-label="t.label"
          hoist
          :options="t.options"
          :value="prefs[t.key] !== false"
          @input="setToggle(t.key, $event)"
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
  CONTROL_TOGGLES,
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
      // FT-1213: does this device have a resting pointer? Read in mounted —
      // Player.vue's idiom; dresses the "Hover coins" row inert on touch.
      hasHover: true,
      // fixed-position coordinates, refreshed by place()
      top: 0,
      left: 0,
    };
  },
  computed: {
    setupLabelOptions() {
      return SETUP_LABELS;
    },
    /** FT-1213: STOOD DOWN with its dropdown — nothing renders it. */
    controlSchemeOptions() {
      return CONTROL_SCHEMES.map((s) => ({
        value: s.id,
        label: s.label,
        title: s.title,
      }));
    },
    /** FT-1213: the six toggle rows — the same dress HostTools'
     *  controlToggles builds, restated here because the two surfaces are
     *  deliberately independent components (the FT-1180 rule). */
    controlToggles() {
      return CONTROL_TOGGLES.map((t) => {
        const inert = t.key === "ctrlHoverCoins" && !this.hasHover;
        return {
          ...t,
          inert,
          rowTitle: inert
            ? t.title +
              " — this device has no resting pointer, so the gesture " +
              "cannot fire here; the setting still follows your account"
            : t.title,
          options: [
            { value: true, label: "On", title: t.title },
            { value: false, label: "Off", title: "Turn this gesture off" },
          ],
        };
      });
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
    // FT-1213: one read — a property of the machine, not the session.
    try {
      this.hasHover = window.matchMedia("(hover: hover)").matches;
    } catch (e) {
      this.hasHover = true;
    }
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
    /** Stand the plate ABOVE the panel when there is room, else under the
     *  gear as before. FT-1208 (user): "can we make the bottom of this menu
     *  start at the top of the face plate? at least if there is room." —
     *  opening downward covered the disc the host is working on.
     *
     *  THE DISC'S TOP IS MEASURED, NOT DERIVED: the gear's own ancestor
     *  `.host-tools` IS the face plate under the build gate (faceDisc.scss's
     *  face-disc-frame makes that element the disc — width --fd-dx, height
     *  --fd-d), so its live rect's top is the edge the user pointed at, in
     *  every layout, with no art constants restated. In the rectangle and
     *  sheet layouts the same read gives the panel's top, which is the same
     *  promise ("don't cover the panel") kept on those shapes.
     *
     *  ROOM means the menu's natural height + the 8px breathing gap fits
     *  between the disc's top and the window's top-chrome floor — the
     *  corner strip (#controls, Menu.vue) lives up there, so when it
     *  horizontally overlaps where this plate would stand, the ceiling is
     *  the strip's bottom, not the window edge (z-index alone would paint
     *  this plate OVER the strip at 76 vs 75, which is hiding chrome, not
     *  clearing it). No room → the pre-FT-1208 downward placement,
     *  unchanged. Re-measured on every open/resize/scroll, same as the
     *  horizontal clamp always was. */
    place() {
      const a = this.anchor;
      if (!a || !a.getBoundingClientRect) return;
      const r = a.getBoundingClientRect();
      const w = this.$el ? this.$el.offsetWidth : 0;
      const h = this.$el ? this.$el.offsetHeight : 0;
      const vw = window.innerWidth;
      const gap = 8;
      const left = Math.round(
        Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8),
      );
      this.left = left;

      const panel = a.closest ? a.closest(".host-tools") : null;
      const discTop = panel ? panel.getBoundingClientRect().top : null;
      if (discTop !== null && h > 0) {
        // the ceiling: viewport margin, pushed down under the corner strip
        // when the strip stands over this plate's horizontal span
        let ceiling = 8;
        const strip = document.getElementById("controls");
        if (strip) {
          const s = strip.getBoundingClientRect();
          if (s.height > 0 && s.left < left + w && s.right > left) {
            ceiling = Math.max(ceiling, s.bottom + 4);
          }
        }
        const top = discTop - gap - h;
        if (top >= ceiling) {
          this.top = Math.round(top);
          return;
        }
      }
      // no room above (or no panel to measure) — the original downward drop
      this.top = Math.round(r.bottom + 8);
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
    /** FT-1213: STOOD DOWN with its dropdown — nothing calls it. */
    pickScheme(id) {
      setPref("controlScheme", id);
    },
    /** FT-1213: the six toggles' one writer — same call as every row. */
    setToggle(key, on) {
      setPref(key, on);
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

  // FT-1213: a toggle whose gesture this device cannot perform ("Hover
  // coins" under a coarse pointer) — the words dim, the switch stays live
  // (the value still follows the account; the row's title says so).
  .pm-inert .setting-name {
    opacity: 0.55;
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
