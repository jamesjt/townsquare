<template>
  <!-- ── THE VEIL LAB (Vl) — TEMPORARY, DELETE ME ───────────────────────────
       The dead seat's silk: a two-way pick between the two veil paintings,
       then the glass bench's four dials (Frost, Refraction, Aberration, Edge
       band) plus the veil's own Opacity. See `src/golem/veilGlass.js` for what
       each dial does and why its bounds are where they are, and Player.vue's
       `.shroud` veil block (FT-997/997b/1004) for the construction they
       drive. All three come out together once a look is baked.

       TWO GROUPS, LABELLED, the ghost lab's shape: Silk (which painting the
       veil is made of) and Dials.

       DEFAULT STATE IS THE SHIPPED VEIL — Silk one, Frost 15 (= the shipped
       1.5px), Refraction 0, Aberration 0, Opacity 100 — so opening the lab
       changes nothing until a dial moves.

       REFRACTION IS CHROMIUM-ONLY (`backdrop-filter: url()` paints nowhere
       else), detected by brand the way the bench does it. Elsewhere the three
       refraction rows go inert and a note says so: the plain-Frost veil those
       browsers keep IS the fallback their users would see.

       THE SEVENTH DOOR in App.vue's dev column (drip 8px, coin 96px, face
       140px, disc 184px, hands 228px, ghost 272px, this 316px), wearing the
       same shell so the column reads as one toolkit.

       BEHIND `devLabs`, like the rest of the column, for the ghost lab's
       stated reason. The toggle is a real <button> — reachable by keyboard. -->
  <div id="veil-lab" :class="{ open: vlLabOpen }">
    <button
      type="button"
      class="vl-toggle"
      title="Veil lab — the dead seat's silk: pick of the two veil paintings, then Frost, Refraction, Aberration, Edge band (the glass bench's dials), Shift across, Shift down, Size and Transparency"
      :aria-expanded="String(vlLabOpen)"
      @click="vlLabOpen = !vlLabOpen"
    >
      Vl
    </button>
    <div class="fl-rows" v-if="vlLabOpen">
      <!-- THE SILK GROUP — the veil PICK. Both paintings were baked the same
           way (trim, height 512) so they compare fairly; the pick swaps both
           the art AND the mask, because in this veil they are the same image. -->
      <div class="fl-head">
        Silk
        <span
          class="fl-live"
          title="The painting is also its own mask — picking a silk swaps the art and the silhouette the glass is confined to, together"
          >now</span
        >
      </div>
      <div class="fl-presets">
        <button
          type="button"
          v-for="s in vlSilks"
          :key="s.id"
          class="fl-preset"
          :class="{ on: vlLab.silk === s.id }"
          :title="s.hint"
          @click="setVlSilk(s.id)"
        >
          <span class="fl-preset-name">{{ s.label }}</span>
        </button>
      </div>
      <div class="fl-head">Dials</div>
      <!-- A DIMMED ROW IS STILL A LIVE ROW: dragging Aberration while
           Refraction sits at 0 stores the value and it takes effect the moment
           Refraction moves. The dimming says "not doing anything right now",
           which is true, rather than disabling a control whose value is still
           worth choosing. On a non-Chromium engine the three refraction rows
           are inert for a harder reason, and the note below says it. -->
      <div
        class="fl-row"
        v-for="d in vlDials"
        :key="d.key"
        :class="{ inert: vlInert(d.key) }"
      >
        <span class="fl-label" :title="vlHint(d)">{{ d.label }}</span>
        <NumberScrub
          :value="vlLab.dials[d.key]"
          :min="d.min"
          :max="d.max"
          :title="vlHint(d)"
          @input="setVlDial(d.key, $event)"
        />
      </div>
      <div class="fl-note" v-if="!vlCanRefract">
        not a Chromium engine — refraction cannot paint here, so the veil keeps
        its plain Frost blur (the same fallback a user in this browser would
        see)
      </div>
      <button
        type="button"
        class="fl-reset"
        title="Back to the shipped veil: Silk one, Frost 15 (1.5px), no refraction, full opacity — which leaves the document carrying no veil-lab property at all"
        @click="resetVlLab"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script>
import veilGlassLab from "../golem/veilGlass";
import NumberScrub from "./NumberScrub";

/** The rows that only mean something while the veil is refracting. Frost and
 *  Opacity are never among them — they work in every engine and every mode. */
const REFRACT_ONLY = ["aber", "band"];

export default {
  name: "VeilLab",
  components: { NumberScrub },
  mixins: [veilGlassLab],
  methods: {
    /** Inert = stored but not currently doing anything: the refraction rows
     *  on a non-Chromium engine, and the two scale/map rows while Refraction
     *  itself sits at 0. */
    vlInert(key) {
      if (!this.vlCanRefract)
        return key === "refract" || REFRACT_ONLY.indexOf(key) !== -1;
      return REFRACT_ONLY.indexOf(key) !== -1 && this.vlLab.dials.refract === 0;
    },
    /** The dial's own hint, with the reason it is inert appended — so the
     *  explanation is on the scrub, not only in a comment. */
    vlHint(d) {
      if (!this.vlInert(d.key)) return d.hint;
      return !this.vlCanRefract
        ? d.hint + " — inert: refraction needs a Chromium engine"
        : d.hint + " — inert while Refraction is 0";
    },
  },
};
</script>

<style scoped lang="scss">
// TEMPORARY, DELETE ME — see the template. The shell is the ghost lab's,
// class names and all, so the column reads as one toolkit; only the id, the
// toggle's letter and the ladder position differ.
#veil-lab {
  position: fixed;
  top: 316px;
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

  .vl-toggle {
    width: 30px;
    height: 26px;
    line-height: 24px;
    padding: 0;
    text-align: center;
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
  &.open .vl-toggle {
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
    max-height: calc(100vh - 334px);
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
  // a dial that is stored but not currently doing anything — half-lit rather
  // than disabled: the value is still worth choosing
  .fl-row.inert {
    opacity: 0.4;
  }
  .fl-label {
    width: 78px;
    white-space: nowrap;
    opacity: 0.7;
    cursor: help;
  }
  .fl-presets {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .fl-preset-name {
    flex: 1;
  }
  .fl-preset {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-family: inherit;
    font-size: 11px;
    text-align: left;
    color: #cdc2e2;
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
    &.on {
      color: #0d0a12;
      background: #b9a6e0;
      border-color: #b9a6e0;
    }
  }
  // the one honest limitation, printed rather than left to be discovered
  .fl-note {
    max-width: 168px;
    font-size: 9px;
    letter-spacing: 0.03em;
    line-height: 1.5;
    color: #8f82a6;
    padding: 0 2px;
  }
  .fl-live {
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #0d0a12;
    background: #b9a6e0;
    border-radius: 3px;
    padding: 1px 4px;
    cursor: help;
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
