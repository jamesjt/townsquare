<template>
  <!-- ── THE MIST LAB (Mi) ───────────────────────────────────────────────────
       The night mist's growth curve on dials: how far the climb gets by night
       3, and each of the three banks' night-1 look, its ceiling, its tile and
       its drift. See `src/golem/nightMist.js` for the curve, where the
       ceiling came from and why nothing new animates, and App.vue's THE MIST
       block for the CSS these drive.

       THE NIGHT DIAL IS THE POINT. Set it to 6 and the sky is night 6's,
       without playing four more nights to see it. The readout under the Night
       group says which night is being shown and how far along the climb that
       is, so the curve is legible without doing the arithmetic.

       DEFAULT STATE IS THE SHIPPED CURVE, so opening the lab changes nothing
       until a dial moves — and on a night-1 town the shipped curve publishes
       no custom property at all.

       UNLIKE THE REST OF THE COLUMN, THIS ONE'S SUBJECT SHIPS. The curve is
       not a look being hunted before a bake; it is live behaviour. What comes
       out when the lab is done is the lab, not the mist.

       THE TENTH RUNG of App.vue's labs rail, which runs 24px apart from the
       Labs door at 8px: coin 38, drip 62, face 86, disc 110, hands 134, ghost
       158, veil 182, numerals 206, stats-plate 230, THIS 254 — and the font
       lab, which keeps the foot, moves down to 278 to make room. Same shell as
       the rest, so the column reads as one toolkit.

       BEHIND `devLabs`, like the rest of the column. The toggle is a real
       <button> — reachable by keyboard. -->
  <div id="mist-lab" :class="{ open: nmLabOpen }">
    <button
      type="button"
      class="mi-toggle"
      title="Mist lab — the night mist's growth: the curve's reach, and each bank's night-1 look, ceiling, tile and drift. Includes a night override, so any night can be looked at without playing to it"
      :aria-expanded="String(nmLabOpen)"
      @click="nmLabOpen = !nmLabOpen"
    >
      Mist lab
    </button>
    <div class="fl-rows" v-if="nmLabOpen">
      <!-- one group per concern — the curve, then the three banks in paint
           order, far to near -->
      <template v-for="group in nmGroups">
        <div class="fl-head" :key="group + '-head'">{{ group }}</div>
        <div class="fl-row" v-for="d in nmGroupDials(group)" :key="d.key">
          <span class="fl-label" :title="d.hint">{{ d.label }}</span>
          <NumberScrub
            :value="nmLab.dials[d.key]"
            :min="d.min"
            :max="d.max"
            :title="d.hint"
            @input="setNmDial(d.key, $event)"
          />
        </div>
        <!-- the one readout: which night the sky is showing, and how far
             along the climb it is -->
        <div class="fl-read" v-if="group === 'Night'" :key="group + '-read'">
          showing
          <b>{{
            nmShownNight === 0 ? "no night yet" : "night " + nmShownNight
          }}</b>
          <template v-if="nmLab.dials.nightOverride > 0">
            (town is on {{ nmLiveNight === 0 ? "none" : nmLiveNight }})
          </template>
          — <b>{{ nmShownGrowth }}%</b> of the climb
        </div>
      </template>
      <div class="fl-note">
        night 1 is the shipped mist and does not move. the veil itself never
        passes half opacity, so no dial here can close the town off
      </div>
      <button
        type="button"
        class="fl-reset"
        title="Back to the shipped curve — reach 52, the FT-1277 mist on night 1, and this lane's ceiling — which leaves a night-1 town carrying no mist property at all"
        @click="resetNmLab"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script>
import mistLab from "../golem/nightMist";
import NumberScrub from "./NumberScrub";

export default {
  name: "MistLab",
  components: { NumberScrub },
  mixins: [mistLab],
  computed: {
    /** The group heads, in dial order, each once. */
    nmGroups() {
      const seen = [];
      this.nmDials.forEach((d) => {
        if (seen.indexOf(d.group) === -1) seen.push(d.group);
      });
      return seen;
    },
  },
  methods: {
    nmGroupDials(group) {
      return this.nmDials.filter((d) => d.group === group);
    },
  },
};
</script>

<style scoped lang="scss">
// The shell is the stats-plate lab's, class names and all, so the column
// reads as one toolkit; only the id, the toggle's letters and the ladder
// position differ.
#mist-lab {
  position: fixed;
  top: 254px; // FT-1258: the labs rail ladder (22px full-name chips, 24px apart)
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

  .mi-toggle {
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
  &.open .mi-toggle {
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
    // twenty dials in four groups: taller than the column's other panels, so
    // it scrolls against the viewport rather than running off it
    max-height: calc(100vh - 270px);
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
  // the curve, in words — which night is on screen and how far up the climb
  .fl-read {
    max-width: 168px;
    font-size: 9px;
    letter-spacing: 0.03em;
    line-height: 1.6;
    color: #a99bc0;
    padding: 1px 2px 0;
    b {
      color: #d8cdb4;
      font-weight: 600;
    }
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
