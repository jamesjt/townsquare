<template>
  <!-- Golem fork (FT-858): the VOTE HISTORY drawer — the nomination log as a
       drawer instead of an overlay, on the same right-hand rail as the
       script. Its body is THE vote-history view (VoteHistoryView), the same
       component the old overlay renders, so the two can never drift. -->
  <transition name="sd-slide">
    <div
      class="vote-drawer"
      v-if="isOpen"
      :style="[{ '--sd-w': width + 'px' }, sheetStyle]"
    >
      <!-- drag the left edge to resize; the width persists per browser and
           the view inside reflows once it gets narrow -->
      <div
        class="sd-grip"
        title="Drag to resize — double-click to reset"
        @pointerdown="startResize"
        @dblclick="resetWidth"
      ></div>
      <!-- PHONE ONLY: the sheet's grab handle (the × stays the reliable exit) -->
      <div class="gs-handle" @pointerdown="startSheetDrag"></div>
      <!-- close first, then the name — both top-LEFT, as the script drawer -->
      <div class="sd-head">
        <!-- FT-951: THE close mark, shared with every close control in the
             app (src/components/CloseX.vue) — this rule keeps both
             @pointerup and @click bound directly to it (the phone's
             pointer-driven dismiss and the desktop click), same as before. -->
        <CloseX
          class="sd-close"
          title="Close the vote history"
          @pointerup.native="sheetDismiss"
          @click.native="sheetDismiss"
        />
        <h3 class="sd-title">
          <img class="sd-mark" :src="gallows" alt="" />
          <span>Vote history</span>
        </h3>
      </div>
      <VoteHistoryView class="sd-view" />
    </div>
  </transition>
</template>

<script>
import VoteHistoryView from "./VoteHistoryView";
import CloseX from "./CloseX";
import rightDrawer from "../golem/rightDrawer";
// the phone's drag-to-dismiss (the sheet form's gesture half)
import bottomSheet from "../golem/bottomSheet";
// the strip's own gallows — the mark that opens this drawer leads its title
import gallows from "../assets/ui-votes.png";

export default {
  name: "VoteDrawer",
  components: { VoteHistoryView, CloseX },
  mixins: [
    bottomSheet,
    rightDrawer({
      modal: "voteDrawer",
      storageKey: "golem.voteDrawerW",
      // wider than the script's default: the log reads as a table until ~460
      defaultWidth: 480
    })
  ],
  data() {
    return { gallows };
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
@import "../drawer.scss";

.vote-drawer {
  @include right-drawer(#4a0d0d);
  @include sheet-handle;
}

@include right-drawer-slide;
</style>
