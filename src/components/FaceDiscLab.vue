<template>
  <!-- ── THE FACE-DISC LAB (Fd) — TEMPORARY, DELETE ME ──────────────────────
       Fourteen scrubs and a four-way glass preset switch, all of which nudge
       every menu on the clock face at once — the
       night checklist, the Host and Join entry panels, the build panel. See
       `src/golem/faceDisc.js` for what each dial does and why its bounds are
       where they are, and `src/faceDisc.scss` for the values they offset. All
       three come out together.

       TWO GROUPS, LABELLED. Geometry (where the plate sits and how big it is)
       and Glass (what the plate is made of) are different questions, and ten
       unlabelled scrubs in one column read as one list of ten rather than as
       two tools. The headings cost four lines and are the difference.

       AND GEOMETRY NOW MEANS TWO PLATES (2026-08-19). The entry panels and the
       town surfaces are different shapes, each with its own eight stored
       values. The panel still shows EIGHT ROWS, not sixteen, and they drive
       whichever plate is on screen — the heading names it and wears a plum
       "now" mark.

       WHY NOT SIXTEEN ROWS. A plate is placed one at a time, by eye, against the
       thing it is sitting on. The other plate is not on screen to be judged, so
       a second column of eight would be eight numbers whose effect nobody can
       currently see — and the shape of the panel would be saying the two are
       decided together, which is exactly what they are not.

       THE LABELS ARE WORDS. "We don't need to abbreviate things, just tell me
       what they are" (user, 2026-08-19) — so Bl/St/Br/Tn/Tl/Ed/Rm and the
       geometry initials are all spelled out, and the label column widened from
       18px to hold them. The hover hints are unchanged: a word says WHICH dial,
       the hint still says what it costs. The panel is 172px wide with the words
       in, against a disc whose left rim is 425px in at the tightest viewport it
       runs at, so it still never covers the thing it is tuning.

       THE PRESET SWITCH heads the Glass group: four families, one click each,
       seeding the glass scrubs (never the geometry). It is a starting
       point rather than a mode — the scrubs stay live, and the panel marks the
       pick "edited" the moment one leaves it.

       THE TINT IS ONE DIAL (2026-08-19). It was two — a Night tint and a Lit
       tint against separate bases, with the live one wearing a "now" mark —
       because the four discs do not stand on the same backdrop and the two
       grounds measured three-and-a-half-fold apart. "Remove the night tint
       entirely, night should be the same as set up" (user) ended that: one
       value, every surface, every phase, and the Glass heading's phase chip and
       the tint row's mark both came out with it.

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
      title="Face disc lab — geometry (position, size, width, corner, band, header, footer) and glass (four presets, then blur, saturation, brightness, tint, edge, rim) for every menu on the clock face"
      :aria-expanded="String(fdLabOpen)"
      @click="fdLabOpen = !fdLabOpen"
    >
      Fd
    </button>
    <div class="fl-rows" v-if="fdLabOpen">
      <!-- THE GEOMETRY GROUP DRIVES ONE PLATE — the one on screen — and says
           which, in the heading, with a plum mark. The two plates are different
           shapes now, and a column of eight that did not say which it was
           moving would be eight numbers meaning whichever thing the user
           happened to be looking at. -->
      <div class="fl-head">
        Geometry
        <span class="fl-phase">{{ fdSurfaceLabel }}</span>
        <span
          class="fl-live"
          title="These eight dials move the plate on screen right now — the other plate keeps its own eight"
          >now</span
        >
      </div>
      <div class="fl-row" v-for="d in fdDials" :key="d.key">
        <span class="fl-label" :title="d.hint">{{ d.label }}</span>
        <NumberScrub
          :value="fdValue(d.key)"
          :min="d.min"
          :max="d.max"
          :title="d.hint"
          @input="setFdLab(d.key, $event)"
        />
      </div>
      <!-- NO PHASE CHIP HERE ANY MORE. This heading used to say "night dial" or
           "lit dial", because the tint was a PAIR and the panel had to say which
           of the two the user was turning. One tint now, on every surface and in
           every phase, so there is nothing for the chip to disambiguate. -->
      <div class="fl-head">Glass</div>
      <!-- THE FOUR FAMILIES. A click seeds the glass scrubs below and publishes
           that family's tint colour; nothing above the heading moves. The
           selected one stays marked after the scrubs are dragged — it is where
           this material STARTED, which is the honest thing for it to say — and
           picks up an "edited" mark so the mark cannot lie. -->
      <div class="fl-presets">
        <button
          type="button"
          v-for="p in fdPresets"
          :key="p.id"
          class="fl-preset"
          :class="{ on: fdPreset === p.id }"
          :title="p.hint"
          @click="applyFdPreset(p.id)"
        >
          {{ p.label }}
        </button>
      </div>
      <div class="fl-edited" v-if="fdPresetEdited">
        edited from {{ fdPresetLabel }}
      </div>
      <!-- EVERY GLASS ROW IS ALWAYS LIVE. The tint pair used to make one of
           these rows conditional — marked "now" while the other governed the
           other phase — and with a single tint there is no such row left. -->
      <div class="fl-row" v-for="d in fdMaterial" :key="d.key">
        <span class="fl-label" :title="d.hint">{{ d.label }}</span>
        <NumberScrub
          :value="fdValue(d.key)"
          :min="d.min"
          :max="d.max"
          :title="d.hint"
          @input="setFdLab(d.key, $event)"
        />
      </div>
      <button
        type="button"
        class="fl-reset"
        title="Every scrub back to zero — BOTH plates' geometry and the shared glass — which is exactly the shipped discs"
        @click="resetFdLab"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script>
import faceDiscLab, { faceDiscPreset } from "../golem/faceDisc";
import NumberScrub from "./NumberScrub";

export default {
  name: "FaceDiscLab",
  components: { NumberScrub },
  mixins: [faceDiscLab],
  computed: {
    /** The name of the family the glass scrubs were last seeded from —
     *  presentation only; the mixin owns which one that is. */
    fdPresetLabel() {
      return faceDiscPreset(this.fdPreset).label;
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
    // fourteen rows, two headings and a four-way switch is taller than the
    // shortest window the disc runs at leaves below 184px, so the column
    // scrolls rather than running off the bottom of the screen
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
  // THE LABEL COLUMN HOLDS WORDS NOW, not initials — 18px was exactly two
  // characters. 78px is the widest of them ("Brightness") with a little air,
  // measured rather than guessed, and it is a FIXED width so the scrubs stay in
  // one vertical line: a ragged column of drag handles is harder to hit than a
  // straight one. `nowrap` because a wrapped label would take its row's height
  // with it and break that line a second way.
  .fl-label {
    width: 78px;
    white-space: nowrap;
    opacity: 0.7;
    cursor: help;
  }
  // ── THE FOUR GLASS FAMILIES ─────────────────────────────────────────────
  // One column, not a 2x2 grid: "Glassmorphism" is thirteen characters and the
  // whole point of this pass is that things are spelled out. Four rows of 15px
  // is a cheaper price than an abbreviation.
  .fl-presets {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .fl-preset {
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
    // the pick reads as pressed, in the same plum the live-tint mark uses, so
    // the panel has one accent colour rather than two
    &.on {
      color: #0d0a12;
      background: #b9a6e0;
      border-color: #b9a6e0;
    }
  }
  // A PRESET IS A STARTING POINT, so the selected button keeps saying where the
  // material came FROM even once a scrub has moved. This line is what stops
  // that from reading as a lie.
  .fl-edited {
    font-size: 9px;
    letter-spacing: 0.04em;
    color: #8f82a6;
    margin-top: -2px;
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
