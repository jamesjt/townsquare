<template>
  <transition name="rd-slide">
    <div
      class="role-drawer"
      v-if="modals.roleDrawer"
      @dragover.prevent
      @drop="onDrawerDrop"
    >
      <!-- the how-to rides the title as a tooltip; the actions sit at the top
           where they are reachable without scrolling (user call 2026-08-18) -->
      <h3
        class="rd-title"
        title="Drag a role onto a seat — or click one, then click a seat. Drag a seated role back here to unassign it."
      >
        Grimoire
      </h3>
      <div class="rd-acts">
        <button
          class="rd-act"
          @click="assignRandomly"
          title="Fill every roleless seat by the script's composition"
        >
          <font-awesome-icon icon="people-arrows" />
          Assign {{ openSeats }}
        </button>
        <button
          class="rd-act"
          :disabled="seatedCount < 2"
          @click="shuffleSeated"
          title="Reshuffle the seated roles among their chairs"
        >
          <font-awesome-icon icon="random" />
          Shuffle
        </button>
        <label
          class="rd-dup"
          :class="{ on: allowDup }"
          title="Let one role sit in more than one chair"
          @click="allowDup = !allowDup"
        >
          <font-awesome-icon :icon="allowDup ? 'check-square' : 'square'" />
          Dupes
        </label>
      </div>
      <div class="rd-groups" v-blood-scroll>
        <section
          v-for="team in teams"
          :key="team"
          :class="'team-' + (team === 'traveler' ? 'traveler' : team)"
          v-show="grouped[team] && grouped[team].length"
        >
          <h4 @click="fold(team)">
            <img
              v-if="teamGlyph(team)"
              class="team-glyph"
              :src="teamGlyph(team)"
              alt=""
            />
            <font-awesome-icon
              v-else-if="teamIcon(team)"
              class="team-glyph-fa"
              :icon="teamIcon(team)"
            />
            {{ labels[team] }}
            <small>{{ placedInTeam(team) }} / {{ comp[team] || "–" }}</small>
            <font-awesome-icon
              class="caret"
              icon="chevron-down"
              :class="{ open: !folded[team] }"
            />
          </h4>
          <ul v-show="!folded[team]">
            <li
              v-for="role in grouped[team]"
              :key="role.id"
              class="rd-token"
              :class="{
                placed: placedCount(role) > 0 && !allowDup,
                picked: drawerPick && drawerPick.id === role.id
              }"
              :draggable="String(allowDup || !placedCount(role))"
              @dragstart="dragRole(role, $event)"
              @click="clickRole(role)"
              :title="role.ability"
            >
              <span
                class="icon"
                :style="{ backgroundImage: `url(${roleIcon(role)})` }"
              ></span>
              <span class="nm">{{ role.name }}</span>
              <span class="who" v-if="seatedNames(role)">· {{ seatedNames(role) }}</span>
              <span class="cnt" v-if="placedCount(role) > 1"
                >x{{ placedCount(role) }}</span
              >
            </li>
          </ul>
        </section>
      </div>
    </div>
  </transition>
</template>

<script>
import gameJSON from "../game";
import demonGlyph from "../assets/blood/demon-glyph.png";
import outsiderGlyph from "../assets/blood/outsider-glyph.png";
import { mapMutations, mapState } from "vuex";

const randomElement = arr => arr[Math.floor(Math.random() * arr.length)];

export default {
  name: "RoleDrawer",
  data() {
    return {
      teams: ["townsfolk", "outsider", "minion", "demon", "traveler"],
      labels: {
        townsfolk: "Townsfolk",
        outsider: "Outsiders",
        minion: "Minions",
        demon: "Demons",
        traveler: "Travellers"
      },
      folded: { traveler: true },
      allowDup: false
    };
  },
  computed: {
    ...mapState(["roles", "modals", "otherTravelers"]),
    ...mapState("players", ["players"]),
    drawerPick() {
      return this.$store.state.drawerPick;
    },
    grouped() {
      const g = {};
      this.roles.forEach(role => {
        const t = role.team || "townsfolk";
        (g[t] = g[t] || []).push(role);
      });
      return g;
    },
    nonTravelerSeats() {
      return this.players.filter(p => p.role.team !== "traveler");
    },
    comp() {
      const n = Math.max(5, Math.min(15, this.nonTravelerSeats.length));
      return gameJSON[n - 5] || {};
    },
    openSeats() {
      return this.nonTravelerSeats.filter(p => !p.role.id).length;
    },
    seatedCount() {
      return this.players.filter(p => p.role.id).length;
    }
  },
  methods: {
    ...mapMutations(["toggleModal", "setDrawerPick"]),
    fold(team) {
      this.$set(this.folded, team, !this.folded[team]);
    },
    roleIcon(role) {
      if (role.golemIconData) return role.golemIconData;
      try {
        return require("../assets/icons/" + role.id + ".png");
      } catch (e) {
        return require("../assets/icons/" + (role.imageAlt || "custom") + ".png");
      }
    },
    teamGlyph(team) {
      if (team === "outsider") return outsiderGlyph;
      if (team === "demon") return demonGlyph;
      return null;
    },
    teamIcon(team) {
      if (team === "townsfolk") return "users";
      if (team === "minion") return "mask";
      if (team === "traveler") return "suitcase";
      return null;
    },
    /** Who is playing this role right now — the drawer reads as a seating
     *  chart once the town is built. */
    seatedNames(role) {
      return this.players
        .filter(p => p.role.id === role.id)
        .map(p => p.name || "Open")
        .join(", ");
    },
    placedCount(role) {
      return this.players.filter(p => p.role.id === role.id).length;
    },
    placedInTeam(team) {
      return this.players.filter(p => p.role.team === team).length;
    },
    dragRole(role, e) {
      e.dataTransfer.setData("golem/role", role.id);
      e.dataTransfer.effectAllowed = "copy";
      // drag the ROLE, not the row: the ghost is the icon alone, at the size
      // it lands on the seat (user call 2026-08-18)
      const ghost = new Image();
      ghost.src = this.roleIcon(role);
      ghost.style.cssText =
        "position:fixed;top:-1000px;left:-1000px;width:84px;height:84px;";
      document.body.appendChild(ghost);
      this._ghost = ghost;
      try {
        e.dataTransfer.setDragImage(ghost, 42, 42);
      } catch (err) {
        // older engines keep the default row ghost — harmless
      }
      setTimeout(() => {
        if (this._ghost) {
          this._ghost.remove();
          this._ghost = null;
        }
      }, 0);
    },
    clickRole(role) {
      if (!this.allowDup && this.placedCount(role)) return;
      const cur = this.drawerPick;
      this.setDrawerPick(cur && cur.id === role.id ? null : role);
    },
    /** A seat's role dragged INTO the drawer unassigns it. */
    onDrawerDrop(e) {
      const from = e.dataTransfer.getData("golem/from");
      if (from === "") return;
      const player = this.players[Number(from)];
      if (!player) return;
      this.$store.commit("players/update", {
        player,
        property: "role",
        value: {}
      });
    },
    /** Fill every roleless non-traveler seat honouring the composition. */
    assignRandomly() {
      const need = { ...this.comp };
      // subtract what's already seated
      this.players.forEach(p => {
        if (p.role.id && need[p.role.team] > 0) need[p.role.team]--;
      });
      const pool = [];
      Object.keys(need).forEach(team => {
        const options = (this.grouped[team] || []).filter(
          r => this.allowDup || !this.placedCount(r)
        );
        const local = options.slice();
        for (let i = 0; i < need[team]; i++) {
          if (!local.length) break;
          const pick = randomElement(local);
          pool.push(pick);
          if (!this.allowDup) local.splice(local.indexOf(pick), 1);
        }
      });
      // shuffle the pool
      pool.sort(() => Math.random() - 0.5);
      this.players.forEach(p => {
        if (!p.role.id && p.role.team !== "traveler" && pool.length) {
          this.$store.commit("players/update", {
            player: p,
            property: "role",
            value: pool.pop()
          });
        }
      });
    },
    /** Reshuffle the SEATED roles among their own chairs. */
    shuffleSeated() {
      const seats = this.players.filter(p => p.role.id);
      if (seats.length < 2) return;
      const roles = seats.map(p => p.role).sort(() => Math.random() - 0.5);
      seats.forEach((p, i) => {
        this.$store.commit("players/update", {
          player: p,
          property: "role",
          value: roles[i]
        });
      });
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

// the workbench's team palette (its map lives in EditionModal's scope)
$team-colors: (
  "townsfolk": #1f65ff,
  "outsider": #46d5ff,
  "minion": #ff6900,
  "demon": #ce0100,
  "traveler": #cc04ff
);

.role-drawer {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 250px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: rgba(8, 8, 10, 0.96);
  // the drawer IS the grimoire — plum, matching its cover (user call)
  border-right: 1px solid #4b3565;
  box-shadow: 6px 0 30px rgba(0, 0, 0, 0.6);
  padding: 10px 0 8px;

  .rd-title {
    margin: 0 12px 2px;
    font-family: PiratesBay, sans-serif;
    font-weight: normal;
    text-align: center;
  }
  // the two build actions, in OUR flat idiom — dark plate, hairline, no
  // upstream gradient pill (user call 2026-08-18)
  .rd-acts {
    display: flex;
    gap: 6px;
    margin: 4px 10px 8px;

    .rd-dup {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 8px;
      font-size: 12px;
      color: rgba(216, 205, 180, 0.75);
      background: rgba(20, 16, 22, 0.9);
      border: 1px solid rgba(120, 105, 135, 0.4);
      border-radius: 5px;
      cursor: pointer;
      user-select: none;
      &.on {
        color: #ffd9d9;
        border-color: rgba(190, 90, 90, 0.8);
      }
    }
    .rd-act {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 5px 8px;
      font-family: inherit;
      font-size: 12px;
      color: #d8cdb4;
      background: rgba(20, 16, 22, 0.9);
      border: 1px solid rgba(120, 105, 135, 0.4);
      border-radius: 5px;
      cursor: pointer;
      transition: color 150ms, border-color 150ms, background 150ms;

      &:hover:not(:disabled) {
        color: #fff;
        background: rgba(32, 24, 38, 0.95);
        border-color: rgba(150, 130, 175, 0.75);
      }
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }
  .team-glyph {
    width: 15px;
    height: 15px;
    object-fit: contain;
  }
  .team-glyph-fa {
    width: 14px;
    opacity: 0.9;
  }
  .rd-groups {
    flex: 1;
    overflow-y: auto;
    padding: 0 6px 0 10px;
    section {
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      margin-bottom: 8px;
      @each $team, $color in $team-colors {
        &.team-#{$team} {
          border-color: rgba($color, 0.55);
          h4 {
            color: lighten($color, 22%);
          }
        }
      }
      h4 {
        margin: 0;
        padding: 5px 8px;
        font-size: 13px;
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 6px;
        small {
          opacity: 0.7;
          font-weight: normal;
        }
        .caret {
          margin-left: auto;
          font-size: 0.7em;
          opacity: 0.6;
          transform: rotate(-90deg);
          transition: transform 160ms ease;
          &.open {
            transform: rotate(0);
          }
        }
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 2px 4px 6px;
      }
    }
    .rd-token {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 2px 4px;
      border-radius: 5px;
      cursor: grab;
      font-size: 13px;
      .icon {
        width: 26px;
        height: 26px;
        flex: none;
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
      }
      .nm {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex-shrink: 0;
      }
      // who is sitting in it — the drawer doubles as a seating chart
      .who {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
        opacity: 0.72;
      }
      .cnt {
        margin-left: auto;
        font-size: 11px;
        opacity: 0.7;
      }
      &:hover {
        background: rgba(255, 255, 255, 0.07);
      }
      &.placed {
        opacity: 0.32;
        cursor: default;
      }
      &.picked {
        outline: 1px solid #a01414;
        background: rgba(160, 20, 20, 0.16);
      }
    }
  }
}

.rd-slide-enter-active,
.rd-slide-leave-active {
  transition: transform 220ms ease;
}
.rd-slide-enter,
.rd-slide-leave-to {
  transform: translateX(-100%);
}
</style>
