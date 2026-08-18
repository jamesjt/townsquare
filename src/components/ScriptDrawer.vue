<template>
  <!-- Golem fork (FT-857): the PLAYER's script drawer — one surface for what
       used to be two overlays (Character Reference + Night Order). It slides
       in from the RIGHT so it never fights the grimoire drawer on the left,
       and its body is THE workbench view (ScriptView), read-only. Change the
       workbench and this changes with it. -->
  <transition name="sd-slide">
    <div class="script-drawer" v-if="modals.scriptDrawer">
      <div class="sd-head">
        <h3 class="sd-title">{{ edition.name || "Custom Script" }}</h3>
        <font-awesome-icon
          icon="times"
          class="sd-close"
          title="Close the script"
          @click="toggleModal('scriptDrawer')"
        />
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

export default {
  name: "ScriptDrawer",
  components: { ScriptView },
  computed: {
    ...mapState(["roles", "modals", "edition", "scriptDrawerView"]),
    /** The current script as a list (state.roles is replaced wholesale). */
    scriptRoles() {
      const list = [];
      this.roles.forEach(role => list.push(role));
      return list;
    }
  },
  methods: {
    ...mapMutations(["toggleModal"])
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
  width: min(560px, 94vw);
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: rgba(8, 8, 10, 0.96);
  border-left: 1px solid #4a0d0d;
  box-shadow: -6px 0 30px rgba(0, 0, 0, 0.6);
  // the player strip floats top-right at z-index 75 — the drawer's chrome
  // starts BELOW it so the title and the × are never under its icons (and
  // the script icon keeps working as the toggle that closes this)
  padding: 46px 12px 12px;
  text-align: left;

  .sd-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    .sd-title {
      margin: 0;
      flex-grow: 1;
      min-width: 0;
      font-family: PiratesBay, sans-serif;
      font-weight: normal;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sd-close {
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
