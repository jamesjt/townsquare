<template>
  <!-- Golem fork (FT-859): the UNSEATED TRAY — every character the script
       carries that has no chair yet, as rows of small icons under the build
       panel's "Roles x / y assigned" line. Drag one onto a seat to cast it;
       drag a seated one anywhere that is NOT a seat and it comes back here.

       The tray never assigns anything itself: a drag hands the seat the same
       `golem/role` payload the grimoire drawer sends, so Player.placeRole
       stays the single owner of the one-chair-per-role rule. -->
  <div class="role-tray" :class="{ armed: dropArmed }" v-if="roles.size">
    <RoleHoverCard
      v-if="cardRole"
      :role="cardRole"
      :anchor="cardAnchor"
      @dismiss="hideCard"
    />
    <!-- the same three build actions the grimoire drawer carries, as icons
         with their own tooltips (user call 2026-08-18) -->
    <!-- (the three build actions moved INLINE into the Roles row —
         RoleActions.vue — so the tray carries only characters.) -->
    <div class="rt-rows" v-if="unseated.length" @scroll.passive="hideCard">
      <div class="rt-row" v-for="row in unseatedByTeam" :key="row.team">
      <span
        v-for="role in row.roles"
        :key="role.id"
        class="rt-icon"
        :class="['team-' + role.team, { picked: isPicked(role) }]"
        :style="{ backgroundImage: `url(${icon(role)})` }"
        draggable="true"
        role="button"
        tabindex="0"
        :aria-label="spokenRole(role)"
        @dragstart="onDragStart(role, $event)"
        @click="pick(role)"
        @keydown.enter.prevent="pick(role)"
        @keydown.space.prevent="pick(role)"
        @focus="showCard(role, $event, true)"
        @blur="hideCard"
        @mouseenter="showCard(role, $event)"
        @mouseleave="hideCard"
      ></span>
      </div>
    </div>
    <!-- THE TAP PATH, SAID OUT LOUD. Dragging a character onto a chair is the
         gesture this tray was built around, and HTML5 drag-and-drop does not
         exist on a touch screen — no `dragstart` ever fires (verified on an
         emulated phone, 2026-08-18). The click-to-arm path has always been
         here and always worked; nothing on screen mentioned it, so on a phone
         the tray read as broken rather than as a different gesture.

         The line only appears where the drag is genuinely unavailable, and it
         changes to name the armed character so the second half of the gesture
         is as clear as the first. -->
    <div class="rt-hint" :class="{ armed: !!drawerPick }" v-if="unseated.length">
      <template v-if="drawerPick">
        <font-awesome-icon icon="hand-point-right" />
        {{ drawerPick.name }} — now tap a seat
      </template>
      <template v-else>Tap a character, then tap a seat</template>
    </div>
    <div class="rt-done" v-else-if="dropArmed">
      <font-awesome-icon icon="undo" />
      release to unseat
    </div>
    <div class="rt-done" v-else>
      <font-awesome-icon icon="check" />
      every character seated
    </div>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import RoleHoverCard from "./RoleHoverCard";
import { roleIcon, startRoleDrag } from "../golem/roleDrag";
import dealGlyph from "../assets/ui-deal.png";

// the reading order of the tray: the composition top to bottom, so the rows
// group themselves without any headings eating the panel's height
const TEAM_ORDER = ["townsfolk", "outsider", "minion", "demon"];
// the cursor has to rest on an icon before its card appears — running the
// tray should not strobe cards (the drawer's own delay)
const HOVER_DELAY = 170;

export default {
  name: "RoleTray",
  components: { RoleHoverCard },
  data() {
    return {
      dealGlyph,
      // which role the hover card is describing, and the tile it is pinned to
      cardRole: null,
      cardAnchor: null,
      // a role is being dragged OFF a seat right now — the tray says so
      dropArmed: false
    };
  },
  computed: {
    ...mapState(["roles", "session"]),
    /** the tray reads as the composition does: one row per type */
    unseatedByTeam() {
      return TEAM_ORDER.map(team => ({
        team,
        roles: this.unseated.filter(r => r.team === team)
      })).filter(row => row.roles.length);
    },
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
    ...mapState("players", ["players"]),
    drawerPick() {
      return this.$store.state.drawerPick;
    },
    /**
     * The script's characters with no chair.
     *
     * TRAVELLERS ARE NOT HERE. They sit outside the composition everywhere
     * else in this codebase (gameJSON counts only the four core teams;
     * coreSeats and nonTravelerSeats both filter them out) and they join a
     * town mid-game by the storyteller's fiat, not while it is being built.
     * A tray that listed them could never empty, which would make "what is
     * left to cast" a lie.
     */
    unseated() {
      const seated = new Set(
        this.players.map(p => p.role && p.role.id).filter(Boolean)
      );
      return [...this.roles.values()]
        .filter(r => TEAM_ORDER.includes(r.team) && !seated.has(r.id))
        .sort((a, b) => TEAM_ORDER.indexOf(a.team) - TEAM_ORDER.indexOf(b.team));
    }
  },
  mounted() {
    // The unassign target is the WHOLE PAGE minus the surfaces that own a drop
    // of their own — and it exists only while this tray does, i.e. only while
    // the host is building the town.
    document.addEventListener("dragover", this.onDocDragOver);
    document.addEventListener("drop", this.onDocDrop);
    document.addEventListener("dragend", this.onDocDragEnd);
  },
  beforeDestroy() {
    document.removeEventListener("dragover", this.onDocDragOver);
    document.removeEventListener("drop", this.onDocDrop);
    document.removeEventListener("dragend", this.onDocDragEnd);
    clearTimeout(this.$options.cardTimer);
  },
  methods: {
    /** Deal and Shuffle are the grimoire drawer's own actions — the tray asks
     *  IT to run them, so there is one implementation of each. */
    withDrawer(fn) {
      let node = this.$root;
      const find = c =>
        c.$options.name === "RoleDrawer"
          ? c
          : c.$children.reduce((a, x) => a || find(x), null);
      const drawer = find(node);
      if (drawer) fn(drawer);
      else this.$store.commit("toggleModal", "roleDrawer");
    },
    deal() {
      this.withDrawer(d => d.assignRandomly());
    },
    shuffle() {
      this.withDrawer(d => d.shuffleSeated());
    },
    ...mapMutations(["setDrawerPick"]),
    icon(role) {
      return roleIcon(role);
    },
    /** What a screen reader hears from a tile that carries no text. */
    spokenRole(role) {
      return role.ability ? `${role.name}. ${role.ability}` : role.name;
    },
    isPicked(role) {
      return !!this.drawerPick && this.drawerPick.id === role.id;
    },
    /** Click (or Enter/Space) arms the role for the seat you click next —
     *  the drawer's own pick channel, so the keyboard reaches the tray too. */
    pick(role) {
      this.setDrawerPick(this.isPicked(role) ? null : role);
    },
    /**
     * `immediate` means NO DELAY (the keyboard lands on a tile and wants its
     * card at once), not "ignore the pointer". It used to skip the hover
     * check as well — and a touch TAP focuses a tile, so on a phone the tray
     * raised a card of its own on top of App's armed card, and left it up
     * after the character was disarmed (blur never came). On a hoverless
     * pointer the armed card is the one that speaks.
     */
    showCard(role, e, immediate) {
      if (!window.matchMedia("(hover: hover)").matches) return;
      const el = e.currentTarget;
      clearTimeout(this.$options.cardTimer);
      this.$options.cardTimer = setTimeout(
        () => {
          this.cardAnchor = el;
          this.cardRole = role;
        },
        immediate ? 0 : HOVER_DELAY
      );
    },
    hideCard() {
      clearTimeout(this.$options.cardTimer);
      this.cardRole = null;
      this.cardAnchor = null;
    },
    onDragStart(role, e) {
      this.hideCard();
      startRoleDrag(role, e);
    },
    // ── the drop-outside-to-unseat target ────────────────────────────────
    /**
     * Is this OUR drag — a role leaving a seat? `types` is the only part of
     * the payload a drag is allowed to read before the drop, which is exactly
     * what we need: a file drag, a text selection, the Almanac's row reorder
     * (which sets nothing at all) and the tray's own `golem/role` drag all
     * fail this test, so none of them can ever clear a chair.
     */
    isSeatDrag(e) {
      const types = e.dataTransfer && e.dataTransfer.types;
      if (!types) return false;
      return Array.prototype.indexOf.call(types, "golem/from") >= 0;
    },
    /**
     * A surface that already owns this drop: a seat (assign / swap) or the
     * grimoire drawer (its own unassign). DOM ancestry, not coordinates — the
     * seats sit inside rotated, clipped boxes where a rect test would lie.
     */
    ownsDrop(e) {
      const el = e.target;
      return !!(el && el.closest && el.closest(".player, .role-drawer"));
    },
    onDocDragOver(e) {
      if (!this.isSeatDrag(e)) return;
      // the tray lights up for the whole gesture, including over a seat —
      // it is telling you where the role goes if you let go out here
      this.dropArmed = true;
      if (this.session.isSpectator || this.ownsDrop(e)) return;
      // ONLY a drag we would actually accept makes the page a drop target
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    /**
     * The drop landed outside every seat: the chair gives its character back.
     *
     * A drag that never drops — Escape, or a release over browser chrome —
     * fires `dragend` and no `drop` at all, so it changes nothing. That is
     * why the unassign lives here and not in onDocDragEnd.
     */
    onDocDrop(e) {
      this.dropArmed = false;
      if (this.session.isSpectator) return;
      if (!this.isSeatDrag(e) || this.ownsDrop(e)) return;
      const from = e.dataTransfer.getData("golem/from");
      if (from === "") return;
      const player = this.players[Number(from)];
      if (!player || !player.role || !player.role.id) return;
      e.preventDefault();
      this.$store.commit("players/update", {
        player,
        property: "role",
        value: {}
      });
    },
    /** Every drag ends here, dropped or cancelled — the highlight goes out
     *  and nothing else happens. */
    onDocDragEnd() {
      this.dropArmed = false;
    }
  }
};
</script>

<style scoped lang="scss">
// the workbench's team palette (each surface holds its own copy)
$team-colors: (
  "townsfolk": #1f65ff,
  "outsider": #46d5ff,
  "minion": #ff6900,
  "demon": #ce0100
);

// FT-888: THE TRAY IS THE BUILD PANEL'S SHOCK ABSORBER on the clock-face disc.
//
// The disc's band is a fixed slice of the circle — the four rows above this
// tray are fixed heights, and the band cannot scroll (the script picker opens a
// popup out of it, and a scrolling band would clip it). So the one child whose
// height is genuinely a variable takes whatever is left and scrolls the rest,
// which is the job this tray's own `.rt-rows` scroller already does at 132px on
// the rectangle. Here it is told the height instead of guessing it.
//
// Written in THIS file rather than HostTools' because `.rt-rows` is this
// component's own element: a parent's scoped styles reach a child's ROOT (which
// is why `.role-tray` is stylable from there) but nothing inside it.
@import "../faceDisc.scss";

.role-tray {
  @include face-disc-build-gate {
    .host-tools & {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;

      .rt-rows {
        flex: 1 1 auto;
        min-height: 0;
        max-height: none;
      }
    }
  }

  margin: 2px 0 4px;
  padding: 5px 4px;
  // the border is always there so arming only repaints it — nothing moves
  border: 1px dashed transparent;
  border-radius: 7px;
  transition: border-color 160ms, background 160ms;

  &.armed {
    border-color: rgba(190, 90, 90, 0.75);
    background: rgba(160, 20, 20, 0.12);
  }

  .rt-acts {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 6px;
  }
  .rt-act {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 24px;
    padding: 0;
    // Deal, Shuffle and Dupes are 26x24 plates sitting 6px apart — three of
    // the most consequential controls in the build, at a third of the area a
    // fingertip needs. A coarse pointer gets a proper plate; the glyphs inside
    // are unchanged, so the row still reads as three small marks.
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
      width: 15px;
      height: 15px;
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
  .rt-rows {
    display: flex;
    flex-direction: column;
    gap: 3px;
    max-height: 132px;
    overflow-y: auto;

    // ONE scroll, not two. The 132px window is right on a desktop, where the
    // build panel itself never scrolls. On a portrait phone the panel is a
    // docked sheet that scrolls already, and a scroller inside a scroller just
    // hides the demons behind a second gesture with nothing to announce it.
    // The sheet is the scroller there.
    @media (pointer: coarse) and (orientation: portrait) {
      max-height: none;
      overflow-y: visible;
    }
  }
  .rt-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 3px;
  }
  .rt-icons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
    // a 25-role custom script wraps into rows and then scrolls, rather than
    // growing the panel into a wall (three rows showing, the fourth peeking)
    max-height: 132px;
    overflow-y: auto;
    // the tray sets the panel's width instead of inheriting whatever the
    // longest row happens to be — 8 tiles to a row
    width: 336px;
    max-width: 100%;
  }

  .rt-icon {
    // 34px read as a smudge at arm's length and was under a fingertip on a
    // phone, where this is a primary drag/tap target (user call 2026-08-18).
    // A 13-townsfolk row costs the shrink-to-fit panel about 100px of width
    // for the change; on a phone the row wraps as it already did.
    width: 42px;
    height: 42px;
    flex: none;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    border: 1px solid transparent;
    border-radius: 50%;
    cursor: grab;
    transition: transform 120ms, filter 120ms;

    @each $team, $color in $team-colors {
      &.team-#{$team} {
        // the team reads off the ring, so the tray shows at a glance what is
        // still owed to each part of the composition
        border-color: rgba($color, 0.55);
      }
    }

    &:hover,
    &:focus {
      outline: none;
      transform: scale(1.12);
      filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.9));
    }
    &:focus {
      border-color: #d8cdb4;
    }
    &.picked {
      border-color: #ff5a5a;
      background-color: rgba(160, 20, 20, 0.25);
      transform: scale(1.12);
    }
    &:active {
      cursor: grabbing;
    }
  }

  .rt-done {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 3px 0;
    font-size: 70%;
    opacity: 0.55;
  }

  // The tap-path line is for pointers that cannot drag. A mouse has the drag
  // and does not need to be told about a second way in.
  .rt-hint {
    display: none;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 4px 0 1px;
    font-size: 70%;
    opacity: 0.5;
  }
  @media (hover: none) {
    .rt-hint {
      display: flex;
    }
    // the armed character's own line brightens — it is an instruction now,
    // not a caption
    .rt-hint.armed {
      opacity: 0.85;
      color: #ffbdbd;
    }
    // `cursor: grab` is a promise a touch screen cannot keep
    .rt-icon {
      cursor: pointer;
    }
  }
}
</style>
