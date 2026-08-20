<template>
  <!-- ── THE FACE-DISC LAB (Fd) — TEMPORARY, DELETE ME ──────────────────────
       Thirteen scrubs that nudge every menu on the clock face at once — the
       night checklist, the Host and Join entry panels, the build panel. See
       `src/golem/faceDisc.js` for what each dial does and why its bounds are
       where they are, and `src/faceDisc.scss` for the values they offset. All
       three come out together.

       TWO GROUPS, LABELLED. Geometry (where the plate sits and how big it is)
       and Glass (what the plate is made of) are different questions, and ten
       unlabelled scrubs in one column read as one list of ten rather than as
       two tools. The headings cost four lines and are the difference.

       THE TINT IS TWO DIALS, and the live one is marked. The glass carries two
       tint values because the four discs do not stand on the same backdrop —
       a dark night dial and a lit entry dial, measured three-and-a-half-fold
       apart — so `Tn` and `Tl` are separate scrubs against separate bases.
       Both are always on screen; the one currently in effect wears a "now"
       mark, read off the same `isNight` App.vue binds the `night` class from.
       One dial that silently edited whichever was live would make the same
       scrub mean two different things depending on the phase, and would hide
       from the user that they are choosing a PAIR.

       THE FOURTH DOOR in App.vue's dev column (drip 8px, coin 96px, face
       140px, this 184px), wearing the same shell so they read as one toolkit
       and not as four inventions.

       IT LIVES IN APP.VUE, and that is the whole point of this component: the
       lab used to be written inside NightSheet, where it dialled one disc and
       only existed at night with the checklist open — the user went looking
       for it during the day and there was nothing there. It also needed a
       portal into document.body to escape the sheet's transform, and that
       portal broke the checklist outright: Vue kept using the moved element as
       the insert-before reference for the sheet's own children, and Vue's
       `insert` silently no-ops when the reference has been reparented, so the
       rows and the End-night button were created and never inserted. Standing
       here, a plain child of #app, the lab needs no portal and takes nothing
       with it.

       The toggle is a real <button>, not the column's usual <div> — it costs
       nothing and it is the difference between a control reachable by keyboard
       and one that is not. -->
  <div id="face-disc-lab" :class="{ open: fdLabOpen }">
    <button
      type="button"
      class="fd-toggle"
      title="Face disc lab — geometry (position, size, band, header, button) and glass (blur, saturation, brightness, tint, edge) for every menu on the clock face"
      :aria-expanded="String(fdLabOpen)"
      @click="fdLabOpen = !fdLabOpen"
    >
      Fd
    </button>
    <div class="fl-rows" v-if="fdLabOpen">
      <div class="fl-head">Geometry</div>
      <div class="fl-row" v-for="d in fdDials" :key="d.key">
        <span class="fl-label" :title="d.hint">{{ d.label }}</span>
        <NumberScrub
          :value="fdLab[d.key]"
          :min="d.min"
          :max="d.max"
          :title="d.hint"
          @input="setFdLab(d.key, $event)"
        />
      </div>
      <div class="fl-head">
        Glass
        <span class="fl-phase">{{ fdIsNight ? "night dial" : "lit dial" }}</span>
      </div>
      <div
        class="fl-row"
        v-for="d in fdMaterial"
        :key="d.key"
        :class="{ live: fdLive(d.key) }"
      >
        <span class="fl-label" :title="d.hint">{{ d.label }}</span>
        <NumberScrub
          :value="fdLab[d.key]"
          :min="d.min"
          :max="d.max"
          :title="d.hint"
          @input="setFdLab(d.key, $event)"
        />
        <span
          class="fl-live"
          v-if="fdLive(d.key)"
          title="This is the tint in effect right now — the other one governs the other phase"
          >now</span
        >
      </div>
      <button
        type="button"
        class="fl-reset"
        title="Every scrub back to zero — geometry and glass — which is exactly the shipped disc"
        @click="resetFdLab"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script>
import faceDiscLab from "../golem/faceDisc";
import NumberScrub from "./NumberScrub";

export default {
  name: "FaceDiscLab",
  components: { NumberScrub },
  mixins: [faceDiscLab],
  methods: {
    /**
     * Is this row the tint currently in effect? Presentation only — the mixin
     * owns `fdIsNight`; this is the panel deciding what to mark with it. Every
     * non-tint row answers false, which is the honest answer: the other five
     * glass dials are one value each and are always live.
     */
    fdLive(key) {
      if (key === "tintDark") return this.fdIsNight;
      if (key === "tintLit") return !this.fdIsNight;
      return false;
    }
  }
};
</script>

<style scoped lang="scss">
// TEMPORARY, DELETE ME — see the template.
#face-disc-lab {
  position: fixed;
  top: 184px;
  left: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  font-size: 13px;

  // NOT ON A PHONE. Every value this dials is read inside the desktop disc's
  // own media query, so here the door opens onto nothing — and it lands on top
  // of the grimoire thumbnail while doing it.
  @media (pointer: coarse) {
    display: none;
  }

  .fd-toggle {
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
  &.open .fd-toggle {
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
    // thirteen rows and two headings is taller than the shortest window the
    // disc runs at leaves below 184px, so the column scrolls rather than
    // running off the bottom of the screen
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }
  // the group headings — Geometry / Glass. Small, quiet, and ruled, so they
  // read as dividers rather than as two more controls.
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
  // which phase the app is in, beside the Glass heading — the tint pair's
  // context, so "now" below has something to mean
  .fl-phase {
    font-size: 9px;
    letter-spacing: 0.04em;
    text-transform: none;
    color: #8f82a6;
  }
  .fl-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #d8cdb4;
  }
  .fl-label {
    width: 18px;
    opacity: 0.7;
    cursor: help;
  }
  // the live tint's row: the label comes up out of its resting dimness, and a
  // small mark says which of the pair is the one on screen
  .fl-row.live .fl-label {
    opacity: 1;
    color: #e6dcff;
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
  // the scrub's "seat" preset inherits its colour, which reads on a disc and
  // disappears against this panel's own ground
  .num-scrub-box {
    color: #d8cdb4;
  }
}
</style>
