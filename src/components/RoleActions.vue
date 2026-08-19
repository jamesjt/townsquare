<template>
  <!-- Golem fork (FT-859): the three build actions — Deal, Shuffle, Dupes.
       They live INLINE in the build panel's Roles row (user call 2026-08-18);
       the tray below carries only the characters. They are not a second
       implementation: Deal and Shuffle ask the grimoire drawer to run ITS
       methods, and Dupes is the shared store flag. -->
  <span class="role-acts">
    <button
      class="ra-act"
      title="Deal the remaining valid roles out to the open seats"
      @click.stop="deal"
    >
      <img :src="dealGlyph" alt="Deal" />
    </button>
    <button
      class="ra-act"
      :disabled="seatedCount < 2"
      title="Randomize the selected roles among the seats"
      @click.stop="shuffle"
    >
      <font-awesome-icon icon="random" />
    </button>
    <button
      class="ra-act"
      :class="{ on: allowDup }"
      title="Let one role sit in more than one chair"
      @click.stop="allowDup = !allowDup"
    >
      <font-awesome-icon :icon="allowDup ? 'check-square' : 'square'" />
    </button>
  </span>
</template>

<script>
import { mapState } from "vuex";
import dealGlyph from "../assets/ui-deal.png";

export default {
  name: "RoleActions",
  data() {
    return { dealGlyph };
  },
  computed: {
    ...mapState("players", ["players"]),
    seatedCount() {
      return this.players.filter(p => p.role && p.role.id).length;
    },
    allowDup: {
      get() {
        return this.$store.state.allowDupRoles;
      },
      set(on) {
        this.$store.commit("setAllowDupRoles", on);
      }
    }
  },
  methods: {
    /** Deal and Shuffle are the grimoire drawer's own methods — asked for by
     *  name so there is exactly one of each in the app. */
    withDrawer(fn) {
      const find = c =>
        c.$options.name === "RoleDrawer"
          ? c
          : c.$children.reduce((a, x) => a || find(x), null);
      const drawer = find(this.$root);
      if (drawer) fn(drawer);
      else this.$store.commit("toggleModal", "roleDrawer");
    },
    deal() {
      this.withDrawer(d => d.assignRandomly());
    },
    shuffle() {
      this.withDrawer(d => d.shuffleSeated());
    }
  }
};
</script>

<style scoped lang="scss">
.role-acts {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 10px;

  .ra-act {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 30px;
    padding: 0;
    color: #d8cdb4;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    cursor: pointer;
    img {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
    &:hover:not(:disabled) {
      color: #fff;
      border-color: rgba(150, 130, 175, 0.75);
    }
    &.on {
      color: #ffd9d9;
      border-color: rgba(190, 90, 90, 0.8);
    }
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}
</style>
