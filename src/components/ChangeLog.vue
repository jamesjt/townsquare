<template>
  <!-- FT-1320: THE CHANGE LOG'S READING PANEL — opened from the golem
       mark's menu (AccountMenu.vue). A centered face-plate over the app's
       0.5 scrim, which is the dress this app's reading surfaces already
       wear (AccountDoor, the guide): a scrim says "a door is open", the
       glass plate holds the words, a click anywhere off the plate — or
       Escape, or the X — closes it.

       CONTENT IS DATA: golem/changelog.js holds the dated groups, plain
       language, newest first; this panel renders whatever stands there, so
       a new entry never touches this file. Dates are quiet group headers
       (the corner menu's sub-headline register), lines are unnumbered rows
       — a log to skim, not a table to operate. -->
  <div class="changelog" @click="$emit('close')">
    <div class="panel" @click.stop>
      <h3>
        <font-awesome-icon icon="scroll" class="cl-mark" />
        Change log
      </h3>
      <CloseX
        class="cl-close"
        title="Close the change log"
        @click.native="$emit('close')"
      />
      <div class="cl-scroll">
        <section v-for="group in log" :key="group.date">
          <h4>{{ group.date }}</h4>
          <ul>
            <li v-for="(line, i) in group.lines" :key="i">{{ line }}</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { CHANGELOG } from "../golem/changelog";
import CloseX from "./CloseX";

export default {
  name: "ChangeLog",
  components: { CloseX },
  computed: {
    log() {
      return CHANGELOG;
    },
  },
  mounted() {
    document.addEventListener("keydown", this.onKey);
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this.onKey);
  },
  methods: {
    onKey(e) {
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return;
      this.$emit("close");
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
// the glass — the same material AccountDoor's panel and the corner menus wear
@import "../faceDisc.scss";

.changelog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  // the guide's own scrim weight — AccountDoor's note carries the reason
  background: rgba(0, 0, 0, 0.5);
}

.panel {
  max-width: 460px;
  width: calc(100% - 40px);
  position: relative;
  @include face-disc-menu-plate($r: 460px, $radius: 10px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 14px 20px 16px;
  color: #e8ddd0;
  // the app's chrome centres text wholesale — a log is READ, so it ranges
  // left like any page of prose
  text-align: left;
}

h3 {
  margin: 0 0 6px;
  font-family: PiratesBay, sans-serif;
  font-weight: normal;
  letter-spacing: 1px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.cl-mark {
  font-size: 75%;
  opacity: 0.75;
}

// the shared X owns its glyph; the call site owns its box (CloseX's rule)
.cl-close {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 16px;
  height: 16px;
}

// the log itself scrolls; the plate keeps its size on any screen
.cl-scroll {
  overflow-y: auto;
  max-height: min(60vh, 520px);
  padding-right: 6px;
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
</style>
