<template>
  <!-- ── THE FACE-DISC LAB (Fd) — TEMPORARY, DELETE ME ──────────────────────
       Six scrubs that nudge the geometry of every menu on the clock face at
       once — the night checklist, the Host and Join entry panels, the build
       panel. See `src/golem/faceDisc.js` for what each dial does and why its
       bounds are where they are, and `src/faceDisc.scss` for the values they
       offset. All three come out together.

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
      title="Face disc lab — position, disc size, band width, header and button offsets (every menu on the clock face)"
      :aria-expanded="String(fdLabOpen)"
      @click="fdLabOpen = !fdLabOpen"
    >
      Fd
    </button>
    <div class="fl-rows" v-if="fdLabOpen">
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
      <button type="button" class="fl-reset" @click="resetFdLab">Reset</button>
    </div>
  </div>
</template>

<script>
import faceDiscLab from "../golem/faceDisc";
import NumberScrub from "./NumberScrub";

export default {
  name: "FaceDiscLab",
  components: { NumberScrub },
  mixins: [faceDiscLab]
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
