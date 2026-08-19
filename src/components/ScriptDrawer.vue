<template>
  <!-- Golem fork (FT-857): the PLAYER's script drawer — one surface for what
       used to be two overlays (Character Reference + Night Order). It slides
       in from the RIGHT so it never fights the grimoire drawer on the left,
       and its body is THE workbench view (ScriptView), read-only. Change the
       workbench and this changes with it. -->
  <transition name="sd-slide">
    <div
      class="script-drawer"
      v-if="isOpen"
      :style="[{ '--sd-w': width + 'px' }, sheetStyle]"
    >
      <!-- drag the left edge to resize; the width persists per browser and
           the view inside reflows once it gets narrow (user call) -->
      <div
        class="sd-grip"
        title="Drag to resize — double-click to reset"
        @pointerdown="startResize"
        @dblclick="resetWidth"
      ></div>
      <!-- PHONE ONLY: the sheet's grab handle. Pull it down to dismiss — the
           close × below stays the reliable way out. -->
      <div class="gs-handle" @pointerdown="startSheetDrag"></div>
      <!-- close first, then the name — both top-LEFT (user call) -->
      <div class="sd-head">
        <font-awesome-icon
          icon="times"
          class="sd-close"
          title="Close the script"
          @pointerup="sheetDismiss"
          @click="sheetDismiss"
        />
        <h3 class="sd-title">
          <img class="sd-mark" :src="editionIcon" alt="" />
          <span>{{ edition.name || "Custom Script" }}</span>
        </h3>
      </div>
      <ScriptView
        class="sd-view"
        :roles="scriptRoles"
        :editable="false"
        :initial-view="scriptDrawerView"
      />
    </div>
  </transition>
</template>

<script>
import { mapState } from "vuex";
import ScriptView from "./ScriptView";
import rightDrawer from "../golem/rightDrawer";
// the phone's drag-to-dismiss (the sheet form's gesture half)
import bottomSheet from "../golem/bottomSheet";
import { EDITION_ICONS, edCustom } from "../golem/editionArt";

export default {
  name: "ScriptDrawer",
  components: { ScriptView },
  // FT-858: the right-hand rail — width, persistence, the resize grip, the
  // close, and publishing `--sd-width` while open. Shared with VoteDrawer.
  mixins: [
    bottomSheet,
    rightDrawer({
      modal: "scriptDrawer",
      storageKey: "golem.scriptDrawerW",
      // A narrower default than the first cut (user call) — the reference
      // reads fine at this width now that the view reflows, and it leaves the
      // town square visible beside it.
      defaultWidth: 400
    })
  ],
  computed: {
    ...mapState(["roles", "modals", "edition", "scriptDrawerView"]),
    /** The script's own art, the same map the pickers use. */
    editionIcon() {
      return EDITION_ICONS[this.edition.id] || this.edition.logo || edCustom;
    },
    /** The current script as a list (state.roles is replaced wholesale). */
    scriptRoles() {
      const list = [];
      this.roles.forEach(role => list.push(role));
      return list;
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
// FT-858: the drawer chrome itself is shared with VoteDrawer — edit it there
// and both right-hand drawers move together.
@import "../drawer.scss";

.script-drawer {
  @include right-drawer(#4a0d0d);
  // the phone sheet's grab handle (drawer.scss owns its look; it is
  // display:none anywhere the drawer is not a sheet)
  @include sheet-handle;
}

@include right-drawer-slide;
</style>
