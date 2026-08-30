<template>
  <!-- ── THE NUMERAL-GLOW LAB (Ng) — TEMPORARY, DELETE ME ───────────────────
       The clock ring's dressing: the four text-shadow layers the twelve
       numerals wear (FT-1046b), each on its own dials — strength for all
       four, softness/size where the layer has a radius worth moving. See
       `src/golem/numeralGlow.js` for what each dial does and why its bounds
       are where they are, and FaceHands.vue's `.tw-numeral` for the
       text-shadow they drive. All three come out together once a look is
       baked.

       FOUR GROUPS, LABELLED — one per shadow layer, in paint order. THE INK
       ITSELF HAS NO DIAL: the font and the near-black are settled (FT-1033,
       the user's own call); only the dressing tunes.

       DEFAULT STATE IS THE SHIPPED DRESSING — FT-1046b's numbers — so
       opening the lab changes nothing until a dial moves. The dials only
       mean anything while the ring is showing: the Tower tab's hourglass
       menu, "Show numerals".

       THE EIGHTH DOOR in App.vue's dev column (drip 8px, coin 96px, face
       140px, disc 184px, hands 228px, ghost 272px, veil 316px, this 360px),
       wearing the same shell so the column reads as one toolkit.

       BEHIND `devLabs`, like the rest of the column, for the ghost lab's
       stated reason. The toggle is a real <button> — reachable by keyboard. -->
  <div id="numeral-lab" :class="{ open: ngLabOpen }">
    <button
      type="button"
      class="ng-toggle"
      title="Numeral-glow lab — the clock ring's dressing: the four shadow layers under the twelve numerals (under-light, dark drop, close halo, wide breath), each on its own strength and size dials. Needs the ring showing: hourglass menu, Show numerals"
      :aria-expanded="String(ngLabOpen)"
      @click="ngLabOpen = !ngLabOpen"
    >
      Numeral-glow lab
    </button>
    <div class="fl-rows" v-if="ngLabOpen">
      <!-- one group per shadow layer, in the order they paint — so the
           column reads top-to-bottom as the text-shadow reads -->
      <template v-for="group in ngGroups">
        <div class="fl-head" :key="group + '-head'">{{ group }}</div>
        <div class="fl-row" v-for="d in ngGroupDials(group)" :key="d.key">
          <span class="fl-label" :title="d.hint">{{ d.label }}</span>
          <NumberScrub
            :value="ngLab.dials[d.key]"
            :min="d.min"
            :max="d.max"
            :title="d.hint"
            @input="setNgDial(d.key, $event)"
          />
        </div>
      </template>
      <div class="fl-note">
        the ink itself is settled — these dials move only the glow under it.
        Ring off? Hourglass menu → Show numerals
      </div>
      <button
        type="button"
        class="fl-reset"
        title="Back to the shipped dressing — the FT-1046b numbers: under-light 50, dark drop 55 at softness 3, close halo 60 at size 4, wide breath 35 at size 12 — which leaves the document carrying no numeral-lab property at all"
        @click="resetNgLab"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script>
import numeralGlowLab from "../golem/numeralGlow";
import NumberScrub from "./NumberScrub";

export default {
  name: "NumeralGlowLab",
  components: { NumberScrub },
  mixins: [numeralGlowLab],
  computed: {
    /** The group heads, in dial order, each once. */
    ngGroups() {
      const seen = [];
      this.ngDials.forEach((d) => {
        if (seen.indexOf(d.group) === -1) seen.push(d.group);
      });
      return seen;
    },
  },
  methods: {
    ngGroupDials(group) {
      return this.ngDials.filter((d) => d.group === group);
    },
  },
};
</script>

<style scoped lang="scss">
// TEMPORARY, DELETE ME — see the template. The shell is the veil lab's,
// class names and all, so the column reads as one toolkit; only the id, the
// toggle's letters and the ladder position differ.
#numeral-lab {
  position: fixed;
  top: 230px; // FT-1258 ladder (22px chips, 24px apart); FT-1337: down one for the chair lab
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

  .ng-toggle {
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
  &.open .ng-toggle {
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
    max-height: calc(100vh - 378px);
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
