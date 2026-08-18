<template>
  <!-- Golem fork (FT-857): the PLAYER's script drawer — one surface for what
       used to be two overlays (Character Reference + Night Order). It slides
       in from the RIGHT so it never fights the grimoire drawer on the left,
       and its body is THE workbench view (ScriptView), read-only. Change the
       workbench and this changes with it. -->
  <transition name="sd-slide">
    <div
      class="script-drawer"
      v-if="modals.scriptDrawer"
      :style="{ width: width + 'px' }"
    >
      <!-- drag the left edge to resize; the width persists per browser and
           the view inside reflows once it gets narrow (user call) -->
      <div
        class="sd-grip"
        title="Drag to resize — double-click to reset"
        @pointerdown="startResize"
        @dblclick="resetWidth"
      ></div>
      <!-- close first, then the name — both top-LEFT (user call) -->
      <div class="sd-head">
        <font-awesome-icon
          icon="times"
          class="sd-close"
          title="Close the script"
          @click="toggleModal('scriptDrawer')"
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
import { mapMutations, mapState } from "vuex";
import ScriptView from "./ScriptView";
import { EDITION_ICONS, edCustom } from "../golem/editionArt";

// A narrower default than the first cut (user call) — the reference reads
// fine at this width now that the view reflows, and it leaves the town
// square visible beside it.
const DEFAULT_W = 400;
const MIN_W = 300;
const MAX_W = 900;

export default {
  name: "ScriptDrawer",
  components: { ScriptView },
  data() {
    let stored = parseInt(localStorage.getItem("golem.scriptDrawerW"), 10);
    if (!stored || stored < MIN_W || stored > MAX_W) stored = DEFAULT_W;
    return { width: stored };
  },
  watch: {
    // the session pill steps aside by exactly this much
    width: {
      immediate: true,
      handler(w) {
        document.documentElement.style.setProperty("--sd-width", w + "px");
      }
    }
  },
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
  },
  methods: {
    ...mapMutations(["toggleModal"]),
    startResize(e) {
      e.preventDefault();
      const grip = e.currentTarget;
      grip.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startW = this.width;
      const onMove = ev => {
        // dragging LEFT widens — the drawer is pinned to the right edge
        const next = startW + (startX - ev.clientX);
        this.width = Math.max(MIN_W, Math.min(MAX_W, next));
      };
      const onUp = () => {
        grip.removeEventListener("pointermove", onMove);
        grip.removeEventListener("pointerup", onUp);
        localStorage.setItem("golem.scriptDrawerW", String(this.width));
      };
      grip.addEventListener("pointermove", onMove);
      grip.addEventListener("pointerup", onUp);
    },
    resetWidth() {
      this.width = DEFAULT_W;
      localStorage.setItem("golem.scriptDrawerW", String(DEFAULT_W));
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

.script-drawer {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  max-width: 94vw;
  z-index: 20;

  // the resize grip: a thin strip on the drawer's own left edge
  .sd-grip {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 7px;
    cursor: ew-resize;
    background: transparent;
    transition: background 150ms;
    &:hover,
    &:active {
      background: rgba(150, 130, 175, 0.45);
    }
  }
  display: flex;
  flex-direction: column;
  background: rgba(8, 8, 10, 0.96);
  border-left: 1px solid #4a0d0d;
  box-shadow: -6px 0 30px rgba(0, 0, 0, 0.6);
  // the head sits ON the player strip's line (user call) — the strip floats
  // top-right at z-index 75, but the centred title clears it horizontally, so
  // only the drawer's own top padding had to come back up
  padding: 8px 12px 12px;
  text-align: left;

  .sd-head {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    margin-bottom: 6px;
    .sd-title {
      margin: 0;
      // the player strip floats over the drawer's top-right corner; the title
      // stays centred but is capped so it can never reach it
      max-width: calc(100% - 176px);
      font-size: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: PiratesBay, sans-serif;
      font-weight: normal;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      .sd-mark {
        width: 22px;
        height: 22px;
        object-fit: contain;
        flex-shrink: 0;
      }
    }
    .sd-close {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      cursor: pointer;
      opacity: 0.7;
      &:hover {
        opacity: 1;
        color: red;
      }
    }
  }
  // the shared view fills what is left of the drawer
  .sd-view {
    flex-grow: 1;
    min-height: 0;
  }
}

.sd-slide-enter-active,
.sd-slide-leave-active {
  transition: transform 220ms ease;
}
.sd-slide-enter,
.sd-slide-leave-to {
  transform: translateX(100%);
}
</style>
