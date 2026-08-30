<template>
  <!-- FT-1341 (user correction on FT-1320): THE CHANGE LOG, as a RIGHT DRAWER
       — the exact idiom ScriptDrawer.vue set: fixed to the right edge, a
       drag-to-resize grip on its own left edge, a phone bottom-sheet with its
       grab handle, an sd-head with the close × and a titled header, and a
       scrollable body underneath. It used to be its own centred face-plate
       over the app's scrim (see the standed-down styles at the foot of this
       block); this is the same content and the same bullhorn header, just
       docked on the rail the script and vote drawers already stand on, and
       joining their exclusive-open management (store's `modals.changeLog`,
       closed by `toggleModal` the instant another modal opens) instead of
       carrying its own local open flag.

       CONTENT IS STILL DATA: golem/changelog.js holds the dated groups,
       plain language, newest first; a new entry never touches this file. -->
  <transition name="sd-slide">
    <div
      class="change-log"
      v-if="isOpen"
      :style="[{ '--sd-w': width + 'px' }, sheetStyle]"
    >
      <!-- drag the left edge to resize; the width persists per browser -->
      <div
        class="sd-grip"
        title="Drag to resize — double-click to reset"
        @pointerdown="startResize"
        @dblclick="resetWidth"
      ></div>
      <!-- PHONE ONLY: the sheet's grab handle — the close × stays the
           reliable way out (bottomSheet's own note carries the reason) -->
      <div class="gs-handle" @pointerdown="startSheetDrag"></div>
      <!-- close first, then the name — both top-LEFT, as the script drawer -->
      <div class="sd-head">
        <CloseX
          class="sd-close"
          title="Close the change log"
          @pointerup.native="sheetDismiss"
          @click.native="sheetDismiss"
        />
        <h3 class="sd-title">
          <font-awesome-icon icon="bullhorn" class="cl-mark" />
          <span>Change log</span>
        </h3>
      </div>
      <div class="cl-scroll sd-view">
        <section v-for="group in log" :key="group.date">
          <h4>{{ group.date }}</h4>
          <ul>
            <li v-for="(line, i) in group.lines" :key="i">{{ line }}</li>
          </ul>
        </section>
      </div>
    </div>
  </transition>
</template>

<script>
import { CHANGELOG } from "../golem/changelog";
import CloseX from "./CloseX";
import rightDrawer from "../golem/rightDrawer";
// the phone's drag-to-dismiss (the sheet form's gesture half)
import bottomSheet from "../golem/bottomSheet";

export default {
  name: "ChangeLog",
  components: { CloseX },
  // FT-1341: the same right-hand-rail chrome ScriptDrawer and VoteDrawer
  // carry — width, persistence, the resize grip, the close, and the
  // exclusive-open bookkeeping via the store's `modals` object.
  mixins: [
    bottomSheet,
    rightDrawer({
      modal: "changeLog",
      storageKey: "golem.changeLogW",
      // a log entry is short prose, not a table — narrower than the vote
      // drawer's 480, close to the script drawer's own 400
      defaultWidth: 400
    })
  ],
  computed: {
    log() {
      return CHANGELOG;
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
// FT-858: the drawer chrome itself is shared with the script and vote
// drawers — edit it there and every right-hand drawer moves together.
@import "../drawer.scss";

.change-log {
  @include right-drawer(#4a0d0d);
  // FT-1270's glass — the same material the script drawer wears, and the
  // one this panel already wore as a centred face-plate before this lane;
  // docking it on the rail keeps the material, not just the content.
  @include right-drawer-glass;
  @include sheet-handle;
}

@include right-drawer-slide;

.cl-mark {
  font-size: 75%;
  opacity: 0.75;
}

// the log itself scrolls inside the drawer's body; the drawer keeps its
// own height
.cl-scroll {
  overflow-y: auto;
  padding: 0 4px 0 0;
}

section {
  & + section {
    margin-top: 10px;
  }
}

// the date header — the corner menu's sub-headline register
h4 {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: normal;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  opacity: 0.45;
}

ul {
  margin: 0;
  padding: 0 0 0 16px;
  list-style: disc;
}
li {
  margin: 3px 0;
  font-size: 90%;
  line-height: 1.35;
}

// ── STOOD DOWN, FT-1341 ─────────────────────────────────────────────────
// The panel's OLD shape — a centred face-plate over the app's scrim. The
// drawer above replaces it; kept here rather than deleted (orchestrator
// call on this lane) in case a future surface wants the centred-modal
// idiom back. Nothing below is reachable: no template node carries these
// class names any more.
//
// @import "../faceDisc.scss";
//
// .changelog {
//   position: fixed;
//   top: 0;
//   left: 0;
//   right: 0;
//   bottom: 0;
//   z-index: 90;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   background: rgba(0, 0, 0, 0.5);
// }
//
// .panel {
//   max-width: 460px;
//   width: calc(100% - 40px);
//   position: relative;
//   @include face-disc-menu-plate($r: 460px, $radius: 10px);
//   overflow: hidden;
//   display: flex;
//   flex-direction: column;
//   padding: 14px 20px 16px;
//   color: #e8ddd0;
//   text-align: left;
// }
//
// h3 {
//   margin: 0 0 6px;
//   font-family: PiratesBay, sans-serif;
//   font-weight: normal;
//   letter-spacing: 1px;
//   text-align: center;
//   display: flex;
//   align-items: center;
//   justify-content: center;
//   gap: 8px;
// }
//
// .cl-close {
//   position: absolute;
//   top: 10px;
//   right: 12px;
//   width: 16px;
//   height: 16px;
// }
</style>
