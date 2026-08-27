<template>
  <!-- ── THE GHOST-GLASS LAB (Gh) — TEMPORARY, DELETE ME ────────────────────
       Six scrubs and a four-way material switch for the mark that says a seat
       is DEAD. See `src/golem/ghostGlass.js` for what each dial does and why
       its bounds are where they are, and Player.vue's `.shroud` block for the
       construction they drive. All three come out together.

       TWO GROUPS, LABELLED, the disc lab's shape: Material (which of the four
       families, and whether the mark is a painting or a pane) and Dials. Six
       unlabelled scrubs in one column read as one list of six rather than as a
       tool with a switch on top.

       THE FOUR GLASS DIALS ONLY MEAN SOMETHING IN ONE OF THE TWO MATERIALS, so
       the panel says which is live and dims the rows that are not. Blur,
       Saturate, Brightness and Tint all describe a treatment of the BACKDROP,
       and an opaque painting has no backdrop to treat — leaving them looking
       live while they do nothing is the exact failure the disc lab's "now" mark
       was added to prevent. Opacity and Rim work in both and are never dimmed.

       THE LABELS ARE WORDS. "We don't need to abbreviate things, just tell me
       what they are" (user, 2026-08-19) — so Bl/St/Br/Tn/Op/Rm are spelled out
       and the label column is the disc lab's 78px, which already holds
       "Brightness".

       WHAT EVERY MATERIAL COSTS IS IN ITS OWN HINT, as a measured separation
       score against the shipped cowl's 24.07. Glass is by nature a low-contrast
       material and this mark's entire job is to be unmistakable across a ring at
       a glance; a lab that let someone dial that away without showing them the
       number would be a worse tool than no lab.

       THE FIFTH DOOR in App.vue's dev column (drip 8px, coin 96px, face 140px,
       disc 184px, hands 228px, this 272px), wearing the same shell so they read
       as one toolkit and not as six inventions.

       BEHIND `devLabs`, like the rest of the column. The disc lab was hidden on
       a direct user call after a visible dev toggle landed on real controls;
       this one starts hidden rather than earning it the same way.

       The toggle is a real <button>, not a <div> — it costs nothing and it is
       the difference between a control reachable by keyboard and one that is
       not. -->
  <div id="ghost-lab" :class="{ open: ggLabOpen }">
    <button
      type="button"
      class="gg-toggle"
      title="Ghost lab — the dead seat's mark: four materials (opaque cowl, glass, clear glass, frost) then blur, saturation, brightness, tint, opacity and rim"
      :aria-expanded="String(ggLabOpen)"
      @click="ggLabOpen = !ggLabOpen"
    >
      Ghost lab
    </button>
    <div class="fl-rows" v-if="ggLabOpen">
      <!-- THE MATERIAL GROUP. A click seeds the six scrubs below, sets whether
           the mark is a painting or a pane, and publishes that family's tint
           colour. The selected one stays marked after the scrubs are dragged —
           it is where this material STARTED, which is the honest thing for it
           to say — and picks up an "edited" mark so the mark cannot lie. -->
      <div class="fl-head">
        Material
        <span class="fl-phase">{{ ggIsGlass ? "a pane" : "a painting" }}</span>
        <span
          class="fl-live"
          title="Glass masks the cowl's alpha over a backdrop-filter; opaque draws the cowl as an image. The four glass dials only mean something in the first"
          >now</span
        >
      </div>
      <!-- EVERY MATERIAL WEARS ITS MEASURED SCORE, on the button rather than in
           the tooltip. This mark's whole job is to be unmistakable across a ring
           at a glance, and glass is a low-contrast material by construction — so
           the two are in direct opposition and the panel has to say so at the
           moment the choice is being made. A number nobody hovers to find is a
           number nobody reads.

           THE SCORE IS TINTED BY WHERE IT SITS relative to the two reference
           numbers below: at or above the painted cowl it reads calm, below the
           no-mark-at-all line it reads as a warning. That is the only colour in
           this panel that carries meaning rather than structure. -->
      <div class="fl-presets">
        <button
          type="button"
          v-for="p in ggPresets"
          :key="p.id"
          class="fl-preset"
          :class="{ on: ggPreset === p.id }"
          :title="p.hint"
          @click="applyGgPreset(p.id)"
        >
          <span class="fl-preset-name">{{ p.label }}</span>
          <span class="fl-sep" :class="ggSepClass(p.sep)">{{
            p.sep.toFixed(2)
          }}</span>
        </button>
      </div>
      <!-- THE TWO REFERENCE NUMBERS. The bar is what the painted cowl scores;
           the floor is what a seat scores with NO mark on it at all, which is
           not zero because the coin is already dimmed. Every glass material
           lands under that floor — the panel's single most useful fact, and the
           reason it is printed rather than left in a commit message. -->
      <div class="fl-scale">
        <span
          class="fl-scale-row"
          title="The painted cowl that ships — the FT-990 bake-off winner, measured on a 12-seat ring with four dead at 1280x800"
          ><b>{{ ggBar.toFixed(2) }}</b> the painted cowl</span
        >
        <span
          class="fl-scale-row"
          title="The same ring with the mark's Opacity at 0. A dead seat still reads as dead without any ghost, because the coin itself is dimmed to 0.72 — so this, not zero, is the line a mark has to beat"
          ><b>{{ ggFloor.toFixed(2) }}</b> no mark at all</span
        >
      </div>
      <!-- A PRESET IS A STARTING POINT, so the button keeps saying where the
           material came FROM once a scrub has moved — and the score on it stops
           describing what is on screen the moment that happens. This line is
           what stops both from reading as a lie. -->
      <div class="fl-edited" v-if="ggPresetEdited">
        edited from {{ ggPresetLabel }} — its score no longer applies
      </div>
      <div class="fl-head">Dials</div>
      <!-- A DIMMED ROW IS STILL A LIVE ROW: dragging Blur while the mark is a
           painting stores the value and it takes effect the moment the material
           becomes a pane. The dimming says "this is not doing anything right
           now", which is true, rather than disabling a control whose value is
           still worth choosing. -->
      <div
        class="fl-row"
        v-for="d in ggDials"
        :key="d.key"
        :class="{ inert: !ggIsGlass && ggGlassOnly(d.key) }"
      >
        <span class="fl-label" :title="ggHint(d)">{{ d.label }}</span>
        <NumberScrub
          :value="ggLab.dials[d.key]"
          :min="d.min"
          :max="d.max"
          :title="ggHint(d)"
          @input="setGgLab(d.key, $event)"
        />
      </div>
      <button
        type="button"
        class="fl-reset"
        title="Back to the painted cowl with every scrub on the value it ships at — which leaves the document carrying no ghost-lab property at all"
        @click="resetGgLab"
      >
        Reset
      </button>
    </div>
  </div>
</template>

<script>
import ghostGlassLab, {
  ghostPreset,
  GHOST_BAR,
  GHOST_FLOOR,
} from "../golem/ghostGlass";
import NumberScrub from "./NumberScrub";

/** The four that describe a treatment of the BACKDROP, and therefore do nothing
 *  while the mark is an image. Opacity and Rim are not among them. */
const GLASS_ONLY = ["blur", "sat", "bright", "tint"];

export default {
  name: "GhostLab",
  components: { NumberScrub },
  mixins: [ghostGlassLab],
  computed: {
    /** The name of the family the scrubs were last seeded from — presentation
     *  only; the mixin owns which one that is. */
    ggPresetLabel() {
      return ghostPreset(this.ggPreset).label;
    },
    /** The painted cowl's own score — the bar. */
    ggBar() {
      return GHOST_BAR;
    },
    /** What a dead seat scores with NO mark at all. Not zero: the coin is
     *  already dimmed, so this is the line a mark actually has to beat. */
    ggFloor() {
      return GHOST_FLOOR;
    },
  },
  methods: {
    ggGlassOnly(key) {
      return GLASS_ONLY.indexOf(key) !== -1;
    },
    /** Where this material's score sits against the two reference numbers —
     *  the panel's one meaningful use of colour. `under` is the one that
     *  matters: a material below the floor is worse than drawing nothing. */
    ggSepClass(sep) {
      if (sep >= GHOST_BAR) return "good";
      if (sep < GHOST_FLOOR) return "under";
      return "";
    },
    /** The dial's own hint, with a note appended when it is currently inert —
     *  so the reason a scrub does nothing is on the scrub rather than only in
     *  the heading above it. */
    ggHint(d) {
      return this.ggGlassOnly(d.key) && !this.ggIsGlass
        ? d.hint + " — inert while the mark is a painting; pick Glass above"
        : d.hint;
    },
  },
};
</script>

<style scoped lang="scss">
// TEMPORARY, DELETE ME — see the template. The shell is FaceDiscLab's, class
// names and all, so the column reads as one toolkit; only the id and the
// toggle's letter differ.
#ghost-lab {
  position: fixed;
  top: 158px; // FT-1258: the labs rail ladder (22px full-name chips, 24px apart)
  left: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  font-size: 13px;

  // NOT ON A PHONE. The ring is a rectangle there and this column lands on top
  // of the grimoire thumbnail while opening onto a mark nobody is judging.
  @media (pointer: coarse) {
    display: none;
  }

  .gg-toggle {
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
  &.open .gg-toggle {
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
    max-height: calc(100vh - 290px);
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
  // a dial that is stored but not currently doing anything. Half-lit rather
  // than disabled: the value is still worth choosing, it just is not in effect.
  .fl-row.inert {
    opacity: 0.4;
  }
  .fl-label {
    width: 78px;
    white-space: nowrap;
    opacity: 0.7;
    cursor: help;
  }
  // ONE COLUMN, not a 2x2 grid: "Opaque cowl" and "Clear glass" are long
  // enough that a grid would put them back into abbreviations, which is the one
  // thing this panel family has been told not to do.
  .fl-presets {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  // THE NAME AND ITS SCORE, pushed to opposite ends — so the four numbers form
  // a straight column the eye can compare down, which a number trailing each
  // name at its own length would not.
  .fl-preset-name {
    flex: 1;
  }
  .fl-sep {
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
    // the panel's only meaningful colour. Default is the dim bone every quiet
    // label here wears; `good` lifts to the bright bone; `under` takes the
    // app's own warning red (controls.scss: "a red (#ff8a8a) that it means"),
    // because a material scoring below the no-mark line is worse than drawing
    // nothing at all and that should be visible without reading a tooltip.
    color: #9a8fb0;
    &.good {
      color: #d8cdb4;
      opacity: 1;
    }
    &.under {
      color: #ff8a8a;
      opacity: 1;
    }
  }
  // the two reference numbers the scores are read against
  .fl-scale {
    display: flex;
    flex-direction: column;
    gap: 1px;
    font-size: 9px;
    letter-spacing: 0.03em;
    color: #8f82a6;
    padding: 3px 6px 0;
    cursor: help;
    b {
      color: #cdc2e2;
      font-weight: normal;
      font-variant-numeric: tabular-nums;
      margin-right: 5px;
    }
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
      // the score has to stay readable on the plum, and the warning has to stay
      // a warning: both go dark rather than being dropped, because the selected
      // material is exactly the one whose cost the user is looking at
      .fl-sep {
        color: #2b2340;
        opacity: 0.95;
        &.good {
          color: #1c1728;
        }
        &.under {
          color: #6d1414;
          opacity: 1;
        }
      }
    }
  }
  .fl-edited {
    font-size: 9px;
    letter-spacing: 0.04em;
    color: #8f82a6;
    margin-top: -2px;
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
