<template>
  <!-- Golem fork (FT-860): the night sheet's three-state switch, a row in the
       build panel. Its own component rather than more markup inside HostTools
       so the setting and its wording live with the rest of the night code.

       The switch and its one-line explanation are SIBLINGS, not two lines of
       one wrapping row. The build panel has no width of its own — it is
       shrink-to-fit around its widest row — and a wrapping flex row still
       reports its max-content width as if every item sat on ONE line, so the
       hint kept dragging the panel wider (measured +236px even after the text
       was shortened). Out of the flex flow it contributes only its own capped
       width, and the panel is untouched.

       Styling is all local: a child component's ROOT element carries the
       parent's scope id under Vue 2 scoped CSS, but its descendants do not, so
       the build panel's `.row` rules would not have reached inside here. -->
  <div class="night-mode">
    <div class="nm-row">
      <!-- "Night" alone did not say what the switch DOES (user call
           2026-08-18). It names the thing it turns on — the checklist and its
           log — rather than describing itself as a control. -->
      <span class="label">Night checklist</span>
      <span class="nm-seg" role="radiogroup" aria-label="Night sheet visibility">
        <button
          v-for="m in modes"
          :key="m"
          type="button"
          class="nm-opt"
          :class="{ on: mode === m }"
          role="radio"
          :aria-checked="String(mode === m)"
          :title="titles[m]"
          @click="pick(m)"
        >
          {{ labels[m] }}
        </button>
      </span>
    </div>
    <small class="nm-hint">{{ hints[mode] }}</small>

    <!-- FT-874: gates the checklist's "end night" button until every row is
         ticked — ON by default, so this is where a storyteller who wants the
         old always-open button turns it off. A plain checkbox, not a segment
         like the switch above: it is one binary setting, not three modes. -->
    <label class="nm-require" title="Block ending the night until every row is checked off">
      <input
        type="checkbox"
        :checked="requireChecks"
        @change="toggleRequireChecks($event.target.checked)"
      />
      <span class="label">Require checks</span>
    </label>
  </div>
</template>

<script>
import { mapState } from "vuex";
import {
  MODES,
  MODE_LABELS,
  MODE_HINTS,
  MODE_TITLES
} from "../golem/nightLog";

export default {
  name: "NightModeRow",
  data() {
    return {
      modes: MODES,
      labels: MODE_LABELS,
      hints: MODE_HINTS,
      titles: MODE_TITLES
    };
  },
  computed: {
    ...mapState("night", ["mode", "requireChecks"])
  },
  methods: {
    pick(mode) {
      this.$store.commit("night/setMode", mode);
    },
    toggleRequireChecks(checked) {
      this.$store.commit("night/setRequireChecks", checked);
    }
  }
};
</script>

<style scoped lang="scss">
.night-mode {
  // the build panel's own row shape, restated here — see the template note on
  // why the parent's `.row` rules cannot reach inside this component
  .nm-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-height: 34px;
  }

  // Wider than the panel's other labels (55px) because this one is two words.
  // Nothing misaligns: every label is left-aligned at the same edge, and this
  // row's control is pushed to the right edge by the row itself, not by where
  // the label ends.
  .label {
    opacity: 0.7;
    width: 96px;
    text-align: left;
    white-space: nowrap;
  }

  .nm-seg {
    display: inline-flex;
    border: 1px solid #3d3d3d;
    border-radius: 6px;
    overflow: hidden;
  }

  .nm-opt {
    font-family: inherit;
    font-size: 80%;
    color: white;
    padding: 3px 9px;
    background: rgba(0, 0, 0, 0.55);
    border: 0;
    border-right: 1px solid #3d3d3d;
    cursor: pointer;
    &:last-child {
      border-right: 0;
    }
    &:hover {
      color: #ff8a8a;
    }
    &:focus-visible {
      outline: 1px solid #a01414;
      outline-offset: -1px;
    }
    &.on {
      background: rgba(160, 20, 20, 0.32);
      font-weight: bold;
    }
    // the three words are a 22px-tall target on a phone
    @media (pointer: coarse) {
      min-height: 40px;
      padding: 0 12px;
    }
  }

  // The explanation of the CURRENT choice. The max-width is load-bearing, not
  // decoration: it is what bounds this line's contribution to the shrink-to-fit
  // panel's width (an uncapped sentence took the panel from 363px to 1001px).
  .nm-hint {
    display: block;
    max-width: 240px;
    text-align: left;
    opacity: 0.55;
    font-size: 70%;
    line-height: 1.25;
    // tracks the label column above it
    padding-left: 96px;
    margin-top: -2px;
  }

  // FT-874: the "Require checks" toggle — a plain checkbox, not the switch's
  // segmented-button idiom (one binary setting, not three modes to pick
  // between). Sits under the hint, left-aligned to the same 96px label
  // column the rest of this component tracks.
  .nm-require {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding-left: 96px;
    cursor: pointer;
    width: fit-content;

    input {
      margin: 0;
      cursor: pointer;
      // a real tap target on a phone, without inflating the visible box
      @media (pointer: coarse) {
        width: 22px;
        height: 22px;
      }
    }
    .label {
      opacity: 0.85;
      width: auto;
    }
    &:hover .label {
      color: #ff8a8a;
    }
  }
}
</style>
