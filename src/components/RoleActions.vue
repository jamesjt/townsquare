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
    <!-- DUPES. The mark is `copy` — two of the same sheet, one behind the
         other, which is the thing this setting allows: one character sitting
         in more than one chair. It replaced a tickbox glyph
         (check-square/square) that said only "a setting, on or off" and never
         said WHICH setting — the button's whole job on a row of three marks.
         `copy` is already in main.js's registry, so nothing new is
         registered for it; `clone` (the other candidate) is not, and
         registering it would mean editing a file this lane does not hold.

         The STATE is the button's own lit/dim, not a tick inside the mark:
         `.on` is the accent RoleTray's and RoleDrawer's own toggles already
         wear (#ffd9d9 on a red edge), and off is the muted plate the two
         action buttons beside it wear at rest, taken down a further step
         because those two have no off-state to be confused with. -->
    <button
      class="ra-act ra-dup"
      :class="{ on: allowDup }"
      :aria-pressed="String(allowDup)"
      title="Let one role sit in more than one chair"
      @click.stop="allowDup = !allowDup"
    >
      <font-awesome-icon icon="copy" />
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
    // Deal, Shuffle and Dupes are three of the most consequential controls in
    // the build, and at 34x30 they are well under a fingertip. A coarse
    // pointer gets a proper plate; the glyphs inside are unchanged, so the row
    // still reads as three small marks.
    //
    // The mobile pass wrote this rule against the tray's `.rt-act`; the
    // buttons then moved into this row (FT-859) and the rule did not travel
    // with them — the tray's copy is still there, styling nothing.
    @media (pointer: coarse) {
      width: 42px;
      height: 40px;
    }
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

  // Dupes is the only TOGGLE in this row, so its off state has to look off —
  // Deal and Shuffle have no off to be mistaken for. The dim is RoleDrawer's
  // own `.rd-dup` resting tone (rgba(216,205,180,.75) — the same control,
  // in the drawer), not a new treatment: lit is `.on` above, unchanged.
  .ra-act.ra-dup:not(.on) {
    color: rgba(216, 205, 180, 0.62);
    &:hover {
      color: #fff;
    }
  }
}
</style>
