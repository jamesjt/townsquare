<template>
  <!-- Golem fork (FT-860): a PLAYER'S OWN night information — the only night
       surface anyone but the storyteller ever gets, and only while the town's
       night setting is "Everyone".

       Everything rendered here comes from the night/myEntries getter, which
       returns rows for THIS viewer's seat and projects them to a shape that
       has no `isFalseInfo` (the storyteller's mark that the information was a
       lie) and no `done`. The secrets are absent from the data, so they are
       absent from the DOM — not present and hidden. -->
  <transition name="sd-slide">
    <div class="night-drawer" v-if="isOpen" :style="{ width: width + 'px' }">
      <div
        class="sd-grip"
        title="Drag to resize — double-click to reset"
        @pointerdown="startResize"
        @dblclick="resetWidth"
      ></div>
      <div class="sd-head">
        <font-awesome-icon
          icon="times"
          class="sd-close"
          title="Close your night notes"
          @click="close"
        />
        <h3 class="sd-title">
          <img class="sd-mark" :src="moon" alt="" />
          <span>Your nights</span>
        </h3>
      </div>

      <div class="sd-view nd-body" v-blood-scroll>
        <p class="nd-empty" v-if="!nights.length">
          Nothing yet. What you learn at night will be written down here.
        </p>
        <section v-for="n in nights" :key="n.day" class="nd-night">
          <h4>Night {{ n.day }}</h4>
          <div v-for="row in n.rows" :key="row.id" class="nd-row">
            <span class="nd-role">{{ row.roleName }}</span>
            <span class="nd-chose" v-if="row.targetNames.length">
              You chose <b>{{ row.targetNames.join(" and ") }}</b>
            </span>
            <span class="nd-told" :class="pingClass(row)" v-if="row.ping !== null">
              {{ row.ping ? "Yes" : "No" }}
            </span>
            <span class="nd-text" v-if="row.text">{{ row.text }}</span>
          </div>
        </section>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapGetters } from "vuex";
import rightDrawer from "../golem/rightDrawer";
import moon from "../assets/moon-other.png";

export default {
  name: "NightInfoDrawer",
  mixins: [
    rightDrawer({
      modal: "nightDrawer",
      storageKey: "golem.nightDrawerW",
      defaultWidth: 380
    })
  ],
  data() {
    return { moon };
  },
  computed: {
    ...mapGetters({ myEntries: "night/myEntries" }),
    /** Their own rows, newest night first. */
    nights() {
      const byDay = new Map();
      this.myEntries.forEach(row => {
        if (!byDay.has(row.day)) byDay.set(row.day, []);
        byDay.get(row.day).push(row);
      });
      return [...byDay.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([day, rows]) => ({ day, rows }));
    }
  },
  methods: {
    pingClass(row) {
      return { yes: row.ping === true, no: row.ping === false };
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
@import "../drawer.scss";

.night-drawer {
  @include right-drawer(#2b2350);
}

.nd-body {
  overflow-y: auto;
}

.nd-empty {
  opacity: 0.55;
  font-size: 90%;
  padding: 10px 4px;
}

.nd-night {
  margin-bottom: 12px;
  h4 {
    text-align: left;
    font-family: PiratesBay, sans-serif;
    font-weight: normal;
    opacity: 0.75;
    margin-bottom: 4px;
  }
}

.nd-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  padding: 5px 8px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid #4b3565;
  border-radius: 0 5px 5px 0;
  font-size: 90%;

  .nd-role {
    font-weight: bold;
  }
  .nd-chose {
    opacity: 0.8;
  }
  .nd-told {
    padding: 0 8px;
    border-radius: 9px;
    font-weight: bold;
    background: rgba(0, 0, 0, 0.4);
    &.yes {
      color: #7ed67e;
    }
    &.no {
      color: #ff8a8a;
    }
  }
  .nd-text {
    flex-basis: 100%;
    opacity: 0.8;
    font-style: italic;
  }
}
</style>
