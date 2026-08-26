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
      title="Shuffle the roles among the seats — nobody moves chair, the characters do"
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

         DUPLICATES IS A TOGGLE; DEAL AND SHUFFLE ARE ACTIONS (2026-08-19,
         user call: "that isn't an action button, it is a toggle state
         button"). The old off-state dimmed the icon the same way a
         `:disabled` control dims — which is exactly the confusion: dim reads
         as "you can't press this," not "this is off and you can." `.on` is
         still `control-lit`, the accent RoleTray's and RoleDrawer's own
         toggles already wear; `control-toggle` (src/controls.scss) is what
         now separates the two families — a hollow, full-contrast plate off,
         filled on, both sunken against Deal and Shuffle's flat boxes.

         The tooltip names the state and what pressing does, per the
         enforcement chip's own model (NightModeRow's `.nm-chip`), not just
         what the setting means. -->
    <button
      class="ra-act ra-dup"
      :class="{ on: allowDup }"
      :aria-pressed="String(allowDup)"
      :title="dupTitle"
      @click.stop="allowDup = !allowDup"
    >
      <font-awesome-icon icon="copy" />
    </button>
    <!-- RETRACT ALL ROLES (FT-943): the inverse of Deal — every seat's
         role goes back to the tray. `undo` rather than a new glyph: RoleTray
         already wears it for the single-seat version of this exact move
         ("release to unseat"), so the row and the tray agree on what
         "putting a role back" looks like without a new icon.

         AN ACTION, NOT A TOGGLE — flat plate like Deal/Shuffle, no
         `control-toggle` well, because there is no persistent "on" state to
         show.

         ONE CLICK (user call 2026-08-19: "that shouldn't require two
         clicks"). It shipped with a two-click arm borrowed from the session
         pill's Leave — but Leave ends your involvement in the town and this
         only puts the roles back in the tray, where they are all still
         sitting and can be dealt again in one press. The guard was priced
         for a loss that isn't there. -->
    <button
      class="ra-act"
      :disabled="seatedCount === 0"
      title="Retract all roles — every seat's role returns to the tray"
      @click.stop="retract"
    >
      <font-awesome-icon icon="undo" />
    </button>
  </span>
</template>

<script>
import { mapState } from "vuex";
import dealGlyph from "../assets/ui-deal.png";

export default {
  name: "RoleActions",
  data() {
    return {
      dealGlyph
    };
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
    },
    /** Names the state, then what pressing does — the enforcement chip's own
     *  tooltip model, not a description of what the setting is for. */
    dupTitle() {
      return this.allowDup
        ? "Duplicates on — a role can sit in more than one chair. Click to limit each role to one."
        : "Duplicates off — each role fills one chair. Click to allow a role in more than one.";
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
    },
    /** Every seat's role goes back to the tray, on one click. No native
     *  confirm() in the path either — this app has had confirm()/prompt()
     *  silently auto-dismissed under Playwright and embeds, and a dialog
     *  nobody sees answers itself. */
    retract() {
      this.$store.dispatch("players/clearRoles");
    }
  }
};
</script>

<style scoped lang="scss">
// THE SHARED CONTROL PLATE (2026-08-19, user call: "standardize the look
// between the choose-a-script selector and those other buttons").
//
// These three used to wear a plate of their own invention — a purple-black
// ground behind a light-lilac hairline at 5px — which was close to the script
// picker's black-edged plate one row above without being it. Same family now:
// same ground, same 2px black edge, same 6px radius, from src/controls.scss.
// The 34x30 box and the coarse-pointer bump travel WITH the plate now (the
// `control-icon-btn` mixin), because the Seats row's shuffle is the same object
// and the two sizes were going to drift apart otherwise.
@import "../controls.scss";

.role-acts {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 10px;

  .ra-act {
    // Deal, Shuffle and Dupes are three of the most consequential controls in
    // the build, and at 34x30 they are well under a fingertip — the mixin's
    // coarse-pointer bump takes them to 42x40. The glyphs inside are
    // unchanged, so the row still reads as three small marks.
    //
    // The mobile pass wrote that rule against the tray's `.rt-act`; the
    // buttons then moved into this row (FT-859) and the rule did not travel
    // with them — the tray's copy is still there, styling nothing.
    @include control-icon-btn;
    img {
      width: 16px;
      height: 16px;
      object-fit: contain;
    }
    &.on {
      @include control-lit;
    }
  }

  // Dupes is the only TOGGLE in this row — Deal and Shuffle have no off to be
  // mistaken for. `control-toggle` (src/controls.scss) carries both cues: a
  // hollow, full-contrast plate off instead of a dimmed one (dim used to
  // read as `:disabled`, which the seat shuffle one row over actually is
  // under 3 seats), and a sunken box in both states against Deal and
  // Shuffle's flat ones. Declared after `control-icon-btn` above so its
  // transparent background and inset well win over the plate's own.
  .ra-act.ra-dup {
    @include control-toggle;
  }
}
</style>
