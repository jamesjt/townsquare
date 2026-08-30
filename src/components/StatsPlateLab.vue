<template>
  <!-- ── THE STATS-PLATE LAB (Sp) — TEMPORARY, DELETE ME ────────────────────
       The dark pill under the clock face's centre stats (TownInfo.vue's two
       count rows), on dials: the ground's opacity and colour lean, real
       backdrop glass, and the pill's own shape. See `src/golem/statsPlate.js`
       for what each dial does and why its bounds are where they are, and
       TownInfo.vue's `.stat-plate` for the CSS they drive. All three come
       out together once a look is baked.

       DEFAULT STATE IS THE SHIPPED PLATE — FT-1071's quieted numbers — so
       opening the lab changes nothing until a dial moves. The plate only
       shows while TownInfo is up (it stands aside during a vote, and under
       an open face disc).

       THE NINTH DOOR in App.vue's dev column (drip 8px, coin 96px, face
       140px, disc 184px, hands 228px, ghost 272px, veil 316px, numerals
       360px, this 404px), wearing the same shell so the column reads as one
       toolkit.

       BEHIND `devLabs`, like the rest of the column, for the ghost lab's
       stated reason. The toggle is a real <button> — reachable by keyboard. -->
  <div id="stats-plate-lab" :class="{ open: spLabOpen }">
    <button
      type="button"
      class="sp-toggle"
      title="Stats-plate lab — the dark pill under the clock face's centre stats: ground opacity and tint, real backdrop glass, padding and corner radius"
      :aria-expanded="String(spLabOpen)"
      @click="spLabOpen = !spLabOpen"
    >
      Stats-plate lab
    </button>
    <div class="fl-rows" v-if="spLabOpen">
      <!-- one group per concern — ground, glass, shape — in paint order -->
      <template v-for="group in spGroups">
        <div class="fl-head" :key="group + '-head'">{{ group }}</div>
        <div class="fl-row" v-for="d in spGroupDials(group)" :key="d.key">
          <span class="fl-label" :title="d.hint">{{ d.label }}</span>
          <NumberScrub
            :value="spLab.dials[d.key]"
            :min="d.min"
            :max="d.max"
            :title="d.hint"
            @input="setSpDial(d.key, $event)"
          />
        </div>
      </template>
      <div class="fl-note">
        the stats keep their own colours — these dials move only the pill under
        them. Glass on trades the rows' faint drop-shadow for the frost
      </div>
      <button
        type="button"
        class="fl-reset"
        title="Back to the shipped plate — the FT-1071 numbers: opacity 26, tint 50, glass 0, padding 1, corner 12 — which leaves the document carrying no stats-plate property at all"
        @click="resetSpLab"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script>
import statsPlateLab from "../golem/statsPlate";
import NumberScrub from "./NumberScrub";

export default {
  name: "StatsPlateLab",
  components: { NumberScrub },
  mixins: [statsPlateLab],
  computed: {
    /** The group heads, in dial order, each once. */
    spGroups() {
      const seen = [];
      this.spDials.forEach((d) => {
        if (seen.indexOf(d.group) === -1) seen.push(d.group);
      });
      return seen;
    },
  },
  methods: {
    spGroupDials(group) {
      return this.spDials.filter((d) => d.group === group);
    },
  },
};
</script>

<style scoped lang="scss">
// TEMPORARY, DELETE ME — see the template. The shell is the veil lab's,
// class names and all, so the column reads as one toolkit; only the id, the
// toggle's letters and the ladder position differ.
#stats-plate-lab {
  position: fixed;
  top: 254px; // FT-1258 ladder (22px chips, 24px apart); FT-1337: down one for the chair lab
  left: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  font-size: 13px;

  // NOT ON A PHONE, for the column's shared reason: the ring is a rectangle
  // there and the toggle lands on real controls.
  @media (pointer: coarse) {
    display: none;
  }

  .sp-toggle {
    width: 132px;
    height: 22px;
    line-height: 20px;
    padding: 0 10px;
    box-sizing: border-box;
    text-align: left;
    white-space: nowrap;
    font-family: inherit;
    font-size: 12px;
    color: #d8cdb4;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #3d3d3d;
    border-left: none;
    border-radius: 0 6px 6px 0;
    cursor: pointer;
    opacity: 0.45;
    &:hover,
    &:focus-visible {
      opacity: 1;
      border-color: rgba(150, 130, 175, 0.75);
      outline: none;
    }
  }
  &.open .sp-toggle {
    opacity: 1;
    border-color: rgba(150, 130, 175, 0.75);
  }

  .fl-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: rgba(8, 6, 10, 0.92);
    border: 1px solid rgba(120, 105, 135, 0.45);
    border-left: none;
    border-radius: 0 8px 8px 0;
    max-height: calc(100vh - 422px);
    overflow-y: auto;
  }
  .fl-head {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 10px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #b6a8c8;
    opacity: 0.85;
    padding-bottom: 3px;
    border-bottom: 1px solid rgba(120, 105, 135, 0.28);
    &:not(:first-child) {
      margin-top: 4px;
    }
  }
  .fl-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #d8cdb4;
  }
  .fl-label {
    width: 78px;
    white-space: nowrap;
    opacity: 0.7;
    cursor: help;
  }
  // the one honest gate, printed rather than left to be discovered
  .fl-note {
    max-width: 168px;
    font-size: 9px;
    letter-spacing: 0.03em;
    line-height: 1.5;
    color: #8f82a6;
    padding: 0 2px;
  }
  .fl-reset {
    font-family: inherit;
    font-size: 11px;
    color: #d8cdb4;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    padding: 2px 6px;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      border-color: rgba(150, 130, 175, 0.75);
      outline: none;
    }
  }
  // the scrub's "seat" preset inherits its colour, which reads on a coin and
  // disappears against this panel's own ground
  .num-scrub-box {
    color: #d8cdb4;
  }
}
</style>
