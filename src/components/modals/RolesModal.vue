<template>
  <Modal
    class="roles"
    v-if="modals.roles && nonTravelers >= 5"
    @close="toggleModal('roles')"
  >
    <h3>Select the characters for {{ nonTravelers }} players:</h3>
    <ul
      class="tokens"
      v-for="(teamRoles, team) in visibleRoleSelection"
      :key="team"
    >
      <li class="count" :class="[team]">
        {{ teamRoles.reduce((a, { selected }) => a + selected, 0) }} /
        {{ game[nonTravelers - 5][team] }}
      </li>
      <li
        v-for="role in teamRoles"
        :class="[role.team, role.selected ? 'selected' : '']"
        :key="role.id"
        @click="toggleRole(role)"
      >
        <Token :role="role" />
        <font-awesome-icon icon="exclamation-triangle" v-if="role.setup" />
        <div class="buttons" v-if="allowDup">
          <font-awesome-icon
            icon="minus-circle"
            @click.stop="nudgeRole(role, -1)"
          />
          <span>{{ role.selected > 1 ? "x" + role.selected : "" }}</span>
          <font-awesome-icon
            icon="plus-circle"
            @click.stop="nudgeRole(role, 1)"
          />
        </div>
      </li>
    </ul>
    <div class="warning" v-if="hasSelectedSetupRoles">
      <font-awesome-icon icon="exclamation-triangle" />
      <span>
        Warning: there are characters selected that modify the game setup! The
        randomizer does not account for these characters.
      </span>
    </div>
    <label class="multiple" :class="{ checked: allowDup }">
      <font-awesome-icon :icon="allowDup ? 'check-square' : 'square'" />
      <input type="checkbox" name="allow-multiple" v-model="allowDup" />
      Allow duplicate characters
    </label>
    <div class="button-group">
      <div
        class="button"
        @click="assignRoles"
        :class="{
          disabled: selectedRoles > nonTravelers || !selectedRoles
        }"
      >
        <!-- FT-1242: FA `people-arrows` stood down — assigning to seats IS
             the deal, and the deal already has its hand (ui-deal.png). -->
        <img class="rm-deal-mark" :src="uiDeal" alt="" />
        Assign {{ selectedRoles }} characters randomly
      </div>
      <div class="button" @click="selectRandomRoles">
        <font-awesome-icon icon="random" />
        Shuffle characters
      </div>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import gameJSON from "./../../game";
import Token from "./../Token";
import { mapGetters, mapMutations, mapState } from "vuex";
// FT-946: THE shared rule for "is this role already in play" — RoleDrawer's
// own build-panel list reads the same function, so this picker cannot list
// (and randomly re-deal) a role a seat already holds while Duplicates is off.
import { placedCount } from "../../golem/duplicates";
// FT-1242: the assign button wears the deal's own hand (RoleActions' mark).
import uiDeal from "../../assets/ui-deal.png";
// FT-1387: a refused Assign click speaks instead of the greyed button
// swallowing it in silence.
import { flashHint } from "../../golem/hint";

const randomElement = arr => arr[Math.floor(Math.random() * arr.length)];

export default {
  components: {
    Token,
    Modal
  },
  data: function() {
    return {
      uiDeal,
      roleSelection: {},
      game: gameJSON,
      // FT-1394: the auto-pick used to run ONCE, at page load (this component
      // mounts immediately — the v-if sits on the inner Modal). A town grown
      // from 5 to 7 afterwards kept the stale 5-role pick, which still passed
      // the assign guard (5 <= 7) and dealt 5 of 7 seats, silently short.
      // These two track WHEN the current selection was made and whether the
      // storyteller has touched it since, so opening the modal can refresh
      // the pick without stomping deliberate hand edits.
      handEdited: false,
      pickedFor: 0
    };
  },
  computed: {
    selectedRoles: function() {
      return Object.values(this.roleSelection)
        .map(roles => roles.reduce((a, { selected }) => a + selected, 0))
        .reduce((a, b) => a + b, 0);
    },
    hasSelectedSetupRoles: function() {
      return Object.values(this.roleSelection).some(roles =>
        roles.some(role => role.selected && role.setup)
      );
    },
    /**
     * FT-946: THE list this modal shows — `roleSelection` itself minus
     * whatever is already seated, unless Duplicates is on. `roleSelection`
     * stays intact underneath (so a role's `.selected` count survives a
     * Duplicates toggle instead of the whole picker rebuilding), only the
     * RENDERED list — and so what a click can reach — excludes an in-play
     * role entirely. RoleDrawer's own list only GREYS an in-play role out
     * (it doubles as a seating chart, so it keeps every row); this picker
     * exists purely to build a random pool, so there is nothing to keep an
     * already-seated role visible for.
     */
    visibleRoleSelection: function() {
      if (this.allowDup) return this.roleSelection;
      const visible = {};
      Object.keys(this.roleSelection).forEach((team) => {
        visible[team] = this.roleSelection[team].filter(
          (role) => !placedCount(role, this.players),
        );
      });
      return visible;
    },
    /** THE global Duplicates switch (store/index.js) — the same one
     *  RoleDrawer's "Dupes" checkbox and RoleActions' chip read and write,
     *  so toggling it here toggles it everywhere. Replaces this modal's own
     *  disconnected `allowMultiple` flag, which controlled the same idea
     *  (more than one of a role in the random pool) without ever agreeing
     *  with the app's one real Duplicates setting. */
    allowDup: {
      get() {
        return this.$store.state.allowDupRoles;
      },
      set(on) {
        this.$store.commit("setAllowDupRoles", on);
      }
    },
    ...mapState(["roles", "modals"]),
    ...mapState("players", ["players"]),
    ...mapGetters({ nonTravelers: "players/nonTravelers" })
  },
  methods: {
    // FT-1394: hand edits flow through these two so the modal knows the
    // storyteller has shaped the selection (a fresh auto-pick on open would
    // otherwise throw their choices away).
    toggleRole(role) {
      role.selected = role.selected ? 0 : 1;
      this.handEdited = true;
    },
    nudgeRole(role, delta) {
      role.selected += delta;
      this.handEdited = true;
    },
    selectRandomRoles() {
      this.roleSelection = {};
      this.roles.forEach(role => {
        if (!this.roleSelection[role.team]) {
          this.$set(this.roleSelection, role.team, []);
        }
        this.roleSelection[role.team].push(role);
        this.$set(role, "selected", 0);
      });
      delete this.roleSelection["traveler"];
      const playerCount = Math.max(5, this.nonTravelers);
      const composition = this.game[playerCount - 5];
      Object.keys(composition).forEach(team => {
        for (let x = 0; x < composition[team]; x++) {
          if (this.roleSelection[team]) {
            // FT-946: the default auto-pick never reaches for a role
            // already seated unless Duplicates is on — this is the pool
            // "Assign N characters randomly" draws from, so an in-play role
            // slipping in here is exactly the silent double-assign the
            // picker is supposed to forbid.
            const available = this.roleSelection[team].filter(
              (role) =>
                !role.selected &&
                (this.allowDup || !placedCount(role, this.players)),
            );
            if (available.length) {
              randomElement(available).selected = 1;
            }
          }
        }
      });
      // FT-1394: a fresh auto-pick supersedes any hand edits and is stamped
      // with the seat count it was built for.
      this.handEdited = false;
      this.pickedFor = playerCount;
    },
    assignRoles() {
      // FT-1387: the button greys but the click still lands here — refusing
      // (too many selected, or none) used to be silent. Say the counts.
      if (this.selectedRoles > this.nonTravelers || !this.selectedRoles) {
        flashHint(
          `Select ${this.nonTravelers} characters — you have ${this.selectedRoles}.`,
        );
        return;
      }
      if (this.selectedRoles <= this.nonTravelers && this.selectedRoles) {
        // generate list of selected roles and randomize it
        const roles = Object.values(this.roleSelection)
          .map(roles =>
            roles
              // duplicate roles selected more than once and filter unselected
              .reduce((a, r) => [...a, ...Array(r.selected).fill(r)], [])
          )
          // flatten into a single array
          .reduce((a, b) => [...a, ...b], [])
          .map(a => [Math.random(), a])
          .sort((a, b) => a[0] - b[0])
          .map(a => a[1]);
        this.players.forEach(player => {
          if (player.role.team !== "traveler" && roles.length) {
            const value = roles.pop();
            this.$store.commit("players/update", {
              player,
              property: "role",
              value
            });
          }
        });
        this.$store.commit("toggleModal", "roles");
      }
    },
    ...mapMutations(["toggleModal"])
  },
  mounted: function() {
    if (!Object.keys(this.roleSelection).length) {
      this.selectRandomRoles();
    }
  },
  watch: {
    roles() {
      this.selectRandomRoles();
    },
    /**
     * FT-1394: refresh the auto-pick when the modal OPENS, not just once at
     * mount — the mount-time pick froze the composition at the load-time
     * seat count (grow 5 → 7 and the stale 5-role pick still passed the
     * assign guard, dealing 7 seats only 5 roles). The pick is kept ONLY
     * when the storyteller hand-edited it AND the seat count it was built
     * for still matches; a seat-count change always re-picks, because a
     * selection sized for a different town is exactly the stale state this
     * fix exists to clear.
     */
    "modals.roles"(open) {
      if (!open) return;
      if (
        !this.handEdited ||
        this.pickedFor !== Math.max(5, this.nonTravelers)
      ) {
        this.selectRandomRoles();
      }
    },
    /**
     * FT-1394: the town can grow or shrink while the modal stands open (a
     * player joins mid-setup) — the composition target just changed, so
     * re-pick even over hand edits; the counts row is already showing the
     * new totals.
     */
    nonTravelers() {
      if (this.modals.roles) {
        this.selectRandomRoles();
      }
    },
    /**
     * FT-946: turning Duplicates OFF can leave a role selected from while it
     * was on — that selection would otherwise survive into `assignRoles`'s
     * pool even though the role is now hidden and unreachable by a click,
     * which is the same silent double-assign this whole fix exists to close.
     * Clears just that role's own count; every other selection is untouched.
     */
    allowDup(on) {
      if (on) return;
      Object.values(this.roleSelection).forEach((teamRoles) => {
        teamRoles.forEach((role) => {
          if (role.selected && placedCount(role, this.players)) {
            this.$set(role, "selected", 0);
          }
        });
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import "../../vars.scss";

/* FT-1242: the assign button's baked dealing hand, sized to its text line. */
.rm-deal-mark {
  width: 15px;
  height: 15px;
  object-fit: contain;
  vertical-align: -2px;
}

ul.tokens {
  padding-left: 5%;
  li {
    border-radius: 50%;
    width: 5vw;
    margin: 5px;
    opacity: 0.5;
    transition: all 250ms;
    &.selected {
      opacity: 1;
      .buttons {
        display: flex;
      }
      .fa-exclamation-triangle {
        display: block;
      }
    }
    &.townsfolk {
      box-shadow: 0 0 10px $townsfolk, 0 0 10px #004cff;
    }
    &.outsider {
      box-shadow: 0 0 10px $outsider, 0 0 10px $outsider;
    }
    &.minion {
      box-shadow: 0 0 10px $minion, 0 0 10px $minion;
    }
    &.demon {
      box-shadow: 0 0 10px $demon, 0 0 10px $demon;
    }
    &.traveler {
      box-shadow: 0 0 10px $traveler, 0 0 10px $traveler;
    }
    &:hover {
      transform: scale(1.2);
      z-index: 10;
    }
    .fa-exclamation-triangle {
      position: absolute;
      color: red;
      filter: drop-shadow(0 0 3px black) drop-shadow(0 0 3px black);
      top: 5px;
      right: -5px;
      font-size: 150%;
      display: none;
    }
    .buttons {
      display: none;
      position: absolute;
      top: 95%;
      text-align: center;
      width: 100%;
      z-index: 30;
      font-weight: bold;
      filter: drop-shadow(0 0 5px rgba(0, 0, 0, 1));
      span {
        flex-grow: 1;
      }
      svg {
        opacity: 0.25;
        cursor: pointer;
        &:hover {
          opacity: 1;
          color: red;
        }
      }
    }
  }
  .count {
    opacity: 1;
    position: absolute;
    left: 0;
    font-weight: bold;
    font-size: 75%;
    width: 5%;
    display: flex;
    align-items: center;
    justify-content: center;
    &:after {
      content: " ";
      display: block;
      padding-top: 100%;
    }
    &.townsfolk {
      color: $townsfolk;
    }
    &.outsider {
      color: $outsider;
    }
    &.minion {
      color: $minion;
    }
    &.demon {
      color: $demon;
    }
  }
}

.roles .modal {
  .multiple {
    display: block;
    text-align: center;
    cursor: pointer;
    &.checked,
    &:hover {
      color: red;
    }
    &.checked {
      margin-top: 10px;
    }
    svg {
      margin-right: 5px;
    }
    input {
      display: none;
    }
  }

  .warning {
    color: red;
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 10;
    svg {
      font-size: 150%;
      vertical-align: middle;
    }
    span {
      display: none;
      text-align: center;
      position: absolute;
      right: -20px;
      bottom: 30px;
      width: 420px;
      background: rgba(0, 0, 0, 0.75);
      padding: 5px;
      border-radius: 10px;
      border: 2px solid black;
    }
    &:hover span {
      display: block;
    }
  }
}
</style>
