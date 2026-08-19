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
          title="Deal the remaining valid roles out to the open seats"
        >
          <img class="act-glyph" :src="dealGlyph" alt="" />
          Deal {{ openSeats }}
        </button>
        <button
          class="rd-act"
          :disabled="seatedCount < 2"
          @click="shuffleSeated"
          title="Randomize the selected roles among the seats"
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
      <!-- FT-858: the drawer's rows read through THE role hover card — the
           same component the Almanac workbench's shelf and the seats use
           (user-directed: one component, every surface). It replaces the
           browser's own `title` box, which arrived late, wrapped badly and
           carried the ability alone. -->
      <RoleHoverCard
        v-if="cardRole"
        :role="cardRole"
        :anchor="cardAnchor"
        @dismiss="hideCard"
      />
      <div class="rd-groups" v-blood-scroll @scroll.passive="hideCard">
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
              @mouseenter="showCard(role, $event)"
              @mouseleave="hideCard"
              :aria-label="spokenRole(role)"
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
import dealGlyph from "../assets/ui-deal.png";
import { mapMutations, mapState } from "vuex";
// One definition of "the glyph for team X" (golem/glyphs), shared with
// TownInfo, ScriptView and EditionModal — it used to be a copy per surface.
import { teamGlyph as teamGlyphSrc } from "../golem/glyphs";
// FT-858: THE role hover card, shared with the Almanac workbench's shelf and
// the seats in the square.
import RoleHoverCard from "./RoleHoverCard";
// FT-859: the drag itself is shared with the build panel's unseated tray —
// one gesture, one definition (see golem/roleDrag).
import { roleIcon as roleIconSrc, startRoleDrag } from "../golem/roleDrag";

const randomElement = arr => arr[Math.floor(Math.random() * arr.length)];
// the cursor has to rest on a row before its card appears — running the list
// should not strobe cards
const HOVER_DELAY = 170;

export default {
  name: "RoleDrawer",
  components: { RoleHoverCard },
  data() {
    return {
      // which role the hover card is describing, and the row it is pinned to
      cardRole: null,
      cardAnchor: null,
      teams: ["townsfolk", "outsider", "minion", "demon", "traveler"],
      labels: {
        townsfolk: "Townsfolk",
        outsider: "Outsiders",
        minion: "Minions",
        demon: "Demons",
        traveler: "Travellers"
      },
      folded: { traveler: true },
      dealGlyph
    };
  },
  computed: {
    ...mapState(["roles", "modals", "otherTravelers"]),
    ...mapState("players", ["players"]),
    allowDup: {
      get() {
        return this.$store.state.allowDupRoles;
      },
      set(on) {
        this.$store.commit("setAllowDupRoles", on);
      }
    },
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
  beforeDestroy() {
    clearTimeout(this.$options.cardTimer);
  },
  methods: {
    ...mapMutations(["toggleModal", "setDrawerPick"]),
    /** What a screen reader hears — the reading the row's `title` used to
     *  carry, now that the hover card has taken over the pointer path. */
    spokenRole(role) {
      return role.ability ? `${role.name}. ${role.ability}` : role.name;
    },
    /** Rest on a row and the card tells you what the character does. */
    showCard(role, e) {
      if (!window.matchMedia("(hover: hover)").matches) return;
      const el = e.currentTarget;
      clearTimeout(this.$options.cardTimer);
      this.$options.cardTimer = setTimeout(() => {
        this.cardAnchor = el;
        this.cardRole = role;
      }, HOVER_DELAY);
    },
    hideCard() {
      clearTimeout(this.$options.cardTimer);
      this.cardRole = null;
      this.cardAnchor = null;
    },
    fold(team) {
      this.$set(this.folded, team, !this.folded[team]);
    },
    roleIcon(role) {
      return roleIconSrc(role);
    },
    /** Every team now has our own art — golem/glyphs is the one definition,
     *  shared with the town square's counts, the script workbench's meter and
     *  the edition modal's team toggles. teamIcon below stays as the fallback
     *  for a team the map does not know. */
    teamGlyph(team) {
      return teamGlyphSrc(team);
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
      // drag the ROLE, not the row: the ghost is the icon alone, at the size
      // it lands on the seat (user call 2026-08-18). FT-859 moved the gesture
      // into golem/roleDrag so the build panel's tray drags identically.
      this.hideCard();
      startRoleDrag(role, e);
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
    .act-glyph {
      width: 15px;
      height: 15px;
      object-fit: contain;
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
      border-radius: 4px;
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
