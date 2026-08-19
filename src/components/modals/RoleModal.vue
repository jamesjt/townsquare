<template>
  <Modal v-if="modals.role" class="role-picker" @close="close">
    <!-- FT-861: ONE grid, two questions. Without `forBelief` this is the seat's
         character, exactly as it has always been; with it, the same grid sets
         what that seat's player is TOLD they are. -->
    <h3 v-if="forBelief">What does {{ seatName }} think they are?</h3>
    <h3 v-else>
      Choose a new character for
      {{
        playerIndex >= 0 && players.length
          ? players[playerIndex].name
          : "bluffing"
      }}
    </h3>
    <p class="belief-hint" v-if="forBelief">
      They will be dealt this character and shown nothing else. Clear tells them
      the truth again.
    </p>

    <!-- Golem fork: travellers get their OWN tab instead of riding at the top
         of the same grid as the edition's characters — a traveller is not
         something you DEAL, it is something you ADD mid-game. The segment
         follows the night sheet's own three-state control (NightModeRow's
         `.nm-seg`/`.nm-opt`) rather than upstream's plain button-group; Vue 2
         scoped styles cannot reach across components (see NightModeRow's own
         note on that), so the look is restated here rather than shared.

         Hidden for a BLUFF (playerIndex < 0): a bluff is the demon's false
         information about who is IN PLAY, and a traveller can never be a
         bluff, so there is nothing to switch to. Hidden for a spectator too
         — matches the old grid's CSS, which hid every traveller coin from a
         spectator's view (they can never assign one). -->
    <div class="rm-tabs" v-if="showTabs">
      <span
        class="rm-seg"
        role="radiogroup"
        aria-label="Show characters or travellers"
      >
        <button
          type="button"
          class="rm-opt"
          :class="{ on: activeTab === 'characters' }"
          role="radio"
          :aria-checked="String(activeTab === 'characters')"
          @click="tab = 'characters'"
        >
          Characters
        </button>
        <button
          type="button"
          class="rm-opt"
          :class="{ on: activeTab === 'travelers' }"
          role="radio"
          :aria-checked="String(activeTab === 'travelers')"
          @click="tab = 'travelers'"
        >
          Travellers
        </button>
      </span>
    </div>

    <!-- The old grid's blank coin, given a real label instead of an empty
         circle at the end of a row. It stays tied to the Characters tab, the
         same scope the blank coin always had. -->
    <button
      type="button"
      class="rm-clear"
      v-if="activeTab === 'characters'"
      @click="setRole({})"
    >
      {{ clearLabel }}
    </button>

    <p
      class="rm-empty"
      v-if="activeTab === 'characters' && !characterRoles.length"
    >
      No characters in this script yet.
    </p>
    <p
      class="rm-empty"
      v-if="activeTab === 'travelers' && !travelerRoles.length"
    >
      No travellers in this game.
    </p>

    <!-- FT-858 idiom: grouped by team, alphabetical within a team, team order
         matching RoleDrawer's grimoire list (townsfolk, outsider, minion,
         demon [, traveler]) — the fork's own established way to present a
         list of roles, reused here rather than rebuilt. ONE block drives
         both tabs; `visibleTeams` / `groupedRoles` are the only things that
         change between them. -->
    <div class="rm-groups" v-blood-scroll @scroll.passive="hideCard">
      <section
        v-for="team in visibleTeams"
        :key="team"
        :class="'team-' + team"
        v-show="(groupedRoles[team] || []).length"
      >
        <h4>
          <img
            v-if="teamGlyph(team)"
            class="rm-glyph"
            :src="teamGlyph(team)"
            alt=""
          />
          {{ teamLabels[team] || team }}
        </h4>
        <ul>
          <li v-for="role in groupedRoles[team]" :key="role.id" class="rm-row">
            <button
              type="button"
              class="rm-pick"
              @click="setRole(role)"
              :aria-label="spokenRole(role)"
            >
              <span
                class="icon"
                :style="{ backgroundImage: `url(${roleIcon(role)})` }"
              ></span>
              <span class="nm">{{ role.name }}</span>
            </button>
            <!-- The coin used to carry the ability in an aria-label alone —
                 reachable by a screen reader (`.rm-pick` above still carries
                 that same reading) but invisible to anyone else. This is the
                 sighted/touch/keyboard path to the same information, via THE
                 shared ability card rather than a second box of text. -->
            <button
              type="button"
              class="rm-info"
              :aria-label="'Ability: ' + role.name"
              @click="toggleCard(role, $event)"
              @mouseenter="showCard(role, $event)"
              @mouseleave="hideCard"
            >
              <font-awesome-icon icon="question" />
            </button>
          </li>
        </ul>
      </section>
    </div>

    <RoleHoverCard
      v-if="cardRole"
      :role="cardRole"
      :anchor="cardAnchor"
      @dismiss="hideCard"
    />
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import RoleHoverCard from "../RoleHoverCard";
// FT-858: the same glyph map RoleDrawer's group headers and TownInfo's
// counts use — one definition of "the art for team X".
import { teamGlyph as teamGlyphSrc } from "../../golem/glyphs";
// FT-859: the same icon resolution the grimoire drawer's rows and the build
// panel's tray drag from — a locally baked icon first, then the bundled art,
// then the team-generic mark.
import { roleIcon as roleIconSrc } from "../../golem/roleDrag";

// RoleDrawer's own team order and English labels, restated here (Vue 2
// scoped styles cannot reach a shared component's markup — the reason this
// whole grouped-list block is written fresh instead of imported).
const TEAM_ORDER = ["townsfolk", "outsider", "minion", "demon"];
const TEAM_LABELS = {
  townsfolk: "Townsfolk",
  outsider: "Outsiders",
  minion: "Minions",
  demon: "Demons",
  traveler: "Travellers",
};

// The cursor has to rest on the ability control before its card appears —
// running down a list of thirteen rows should not strobe cards (RoleDrawer's
// own delay, restated).
const HOVER_DELAY = 170;

export default {
  components: { RoleHoverCard, Modal },
  props: {
    playerIndex: {
      type: Number,
      default: 0,
    },
    /**
     * FT-861: set the seat's BELIEVED character instead of its real one — what
     * its player is told they are. Only the seat's belief chip opens it this
     * way; every other entry point leaves it false.
     */
    forBelief: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      tab: "characters",
      teamLabels: TEAM_LABELS,
      // which role the ability card is describing, and the control it is
      // pinned to
      cardRole: null,
      cardAnchor: null,
    };
  },
  computed: {
    /** Whose belief is being set — the heading's subject. */
    seatName() {
      const player = this.players[this.playerIndex];
      return (player && player.name) || "this seat";
    },
    /**
     * Every non-traveller role this script carries. For a SEAT (playerIndex
     * >= 0) every one of them is offered, duplicates included — reassigning
     * a role already seated elsewhere has always been allowed here. For a
     * BLUFF (playerIndex < 0) anything already seated is excluded: a bluff
     * is the demon's false information about who is in play, and offering an
     * actually-seated role would be offering the truth.
     */
    characterRoles() {
      const list = [];
      this.roles.forEach((role) => {
        if (role.team === "traveler") return;
        if (
          this.playerIndex >= 0 ||
          !this.players.some((player) => player.role.id === role.id)
        ) {
          list.push(role);
        }
      });
      return list;
    },
    /**
     * Every traveller reachable from here — the script's own (mixed into the
     * grid before this pass) plus every other edition's. Always empty for a
     * BLUFF: a travelling player is never part of the demon's information,
     * so the tab that would offer them is hidden entirely (`showTabs`)
     * rather than emptied.
     */
    travelerRoles() {
      if (this.playerIndex < 0) return [];
      const list = [];
      this.roles.forEach((role) => {
        if (role.team === "traveler") list.push(role);
      });
      this.otherTravelers.forEach((role) => list.push(role));
      return list;
    },
    /**
     * The tab control itself — hidden for a bluff (nothing to switch to) and
     * for a spectator, who may assign a character but never a traveller
     * (matches the old grid's spectator CSS, which hid every traveller coin;
     * here there is simply nothing to switch to).
     */
    showTabs() {
      return this.playerIndex >= 0 && !this.session.isSpectator;
    },
    /**
     * `tab` alone can outlive its own relevance — an Escape close bypasses
     * this component's `close()`, so a "travelers" pick from a seat can still
     * be sitting in `tab` the next time this opens for a bluff. Reading
     * through this getter instead of `tab` directly means that stale value
     * never renders something the current caller cannot use.
     */
    activeTab() {
      return this.showTabs && this.tab === "travelers"
        ? "travelers"
        : "characters";
    },
    visibleTeams() {
      if (this.activeTab === "travelers") return ["traveler"];
      // TEAM_ORDER covers every official team; a custom script's role is
      // free to carry anything in its `team` field, so whatever that isn't
      // one of the four still gets a section instead of silently vanishing.
      const extra = Object.keys(this.groupedRoles)
        .filter((t) => !TEAM_ORDER.includes(t) && t !== "traveler")
        .sort();
      return TEAM_ORDER.concat(extra);
    },
    /**
     * One grouping for both tabs — `visibleTeams` above is the only thing
     * that changes between them. Alphabetical within each team.
     */
    groupedRoles() {
      const source =
        this.activeTab === "travelers"
          ? this.travelerRoles
          : this.characterRoles;
      const g = {};
      source.forEach((role) => {
        const t = role.team || "townsfolk";
        (g[t] = g[t] || []).push(role);
      });
      Object.keys(g).forEach((t) =>
        g[t].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
      );
      return g;
    },
    /** What "no character" means for whoever opened this grid. */
    clearLabel() {
      if (this.forBelief) return "Clear — show them the truth";
      return this.playerIndex < 0 ? "Clear this bluff" : "Clear this seat";
    },
    ...mapState(["modals", "roles", "session", "otherTravelers"]),
    ...mapState("players", ["players"]),
  },
  beforeDestroy() {
    clearTimeout(this.$options.cardTimer);
  },
  methods: {
    roleIcon(role) {
      return roleIconSrc(role);
    },
    teamGlyph(team) {
      return teamGlyphSrc(team);
    },
    /** What a screen reader hears — the reading the coin's own aria-label
     *  used to carry (Token.vue's `spokenRole`, RoleDrawer's own copy of the
     *  same line). */
    spokenRole(role) {
      return role.ability ? `${role.name}. ${role.ability}` : role.name;
    },
    /** Rest on the ability control and it shows what the character does.
     *  Hover only (RoleDrawer's own gate) — a touch screen has no hover to
     *  rest, which is what the tap path below is for. */
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
    /** The tap/click path — for a coarse pointer, and for a keyboard user
     *  tabbed onto the control without a screen reader (which already has
     *  the ability via `.rm-pick`'s aria-label). */
    toggleCard(role, e) {
      if (this.cardRole && this.cardRole.id === role.id) {
        this.hideCard();
        return;
      }
      clearTimeout(this.$options.cardTimer);
      this.cardAnchor = e.currentTarget;
      this.cardRole = role;
    },
    setRole(role) {
      this.hideCard();
      // FT-861: the belief branch. The clear control's `{}` has no id, and
      // that is the clear: back to believing the truth.
      if (this.forBelief) {
        if (this.session.isSpectator || this.playerIndex < 0) return;
        const player = this.players[this.playerIndex];
        if (player) {
          this.$store.commit("players/update", {
            player,
            property: "believedRole",
            value: role && role.id ? role : null,
          });
        }
        this.tab = "characters";
        this.$store.commit("toggleModal", "role");
        return;
      }
      if (this.playerIndex < 0) {
        // assign to bluff slot (index < 0)
        this.$store.commit("players/setBluff", {
          index: this.playerIndex * -1 - 1,
          role,
        });
      } else {
        if (this.session.isSpectator && role.team === "traveler") return;
        // assign to player
        const player = this.players[this.playerIndex];
        this.$store.commit("players/update", {
          player,
          property: "role",
          value: role,
        });
      }
      this.tab = "characters";
      this.$store.commit("toggleModal", "role");
    },
    close() {
      this.tab = "characters";
      this.hideCard();
      this.toggleModal("role");
    },
    ...mapMutations(["toggleModal"]),
  },
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.belief-hint {
  max-width: 46em;
  margin: -6px auto 10px;
  opacity: 0.7;
  font-size: 90%;
  line-height: 1.3;
}

// The segmented tab control, following the night sheet's own three-state
// switch (NightModeRow's `.nm-seg`/`.nm-opt`) rather than upstream's plain
// button-group. Restated locally — Vue 2 scoped styles cannot reach into a
// sibling component's own template (see NightModeRow's own note on this).
.rm-tabs {
  display: flex;
  justify-content: center;
  margin: 4px 0 10px;
}
.rm-seg {
  display: inline-flex;
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  overflow: hidden;
}
.rm-opt {
  font-family: inherit;
  font-size: 90%;
  color: white;
  padding: 5px 16px;
  background: rgba(0, 0, 0, 0.55);
  border: 0;
  border-right: 1px solid #3d3d3d;
  cursor: pointer;
  &:last-child {
    border-right: 0;
  }
  &:hover {
    color: #ff8a8a;
  }
  &:focus-visible {
    outline: 1px solid #a01414;
    outline-offset: -1px;
  }
  &.on {
    background: rgba(160, 20, 20, 0.32);
    font-weight: bold;
  }
  // a real tap target on a phone
  @media (pointer: coarse) {
    min-height: 44px;
    padding: 0 18px;
  }
}

.rm-clear {
  display: block;
  margin: 0 auto 10px;
  padding: 6px 14px;
  font-family: inherit;
  font-size: 90%;
  color: #d8cdb4;
  background: rgba(20, 16, 22, 0.9);
  border: 1px solid rgba(120, 105, 135, 0.4);
  border-radius: 5px;
  cursor: pointer;
  transition:
    color 150ms,
    border-color 150ms;
  &:hover {
    color: #fff;
    border-color: rgba(150, 130, 175, 0.75);
  }
  &:focus-visible {
    outline: 1px solid #a01414;
    outline-offset: 2px;
  }
  @media (pointer: coarse) {
    min-height: 44px;
    padding: 0 18px;
  }
}

.rm-empty {
  opacity: 0.65;
  font-size: 90%;
  margin: 20px 0;
}

// FT-858 idiom: the grimoire drawer's own grouped-list treatment (team
// heading with its glyph, then rows of icon + name) — reused rather than
// rebuilt (RoleDrawer.vue's `.rd-groups` / `.rd-token`).
.rm-groups {
  overflow-y: auto;
  max-height: 50vh;
  text-align: left;
  padding: 0 2px;

  // full-screen on a phone (see the unscoped block below) leaves a lot more
  // room than the desktop dialog's 50vh
  @media (max-width: 640px) {
    max-height: calc(100vh - 190px);
  }

  section {
    border: 1px solid #3d3d3d;
    border-radius: 4px;
    margin-bottom: 8px;

    &.team-townsfolk {
      border-color: rgba($townsfolk, 0.55);
      h4 {
        color: lighten($townsfolk, 22%);
      }
    }
    &.team-outsider {
      border-color: rgba($outsider, 0.55);
      h4 {
        color: lighten($outsider, 22%);
      }
    }
    &.team-minion {
      border-color: rgba($minion, 0.55);
      h4 {
        color: lighten($minion, 22%);
      }
    }
    &.team-demon {
      border-color: rgba($demon, 0.55);
      h4 {
        color: lighten($demon, 22%);
      }
    }
    &.team-traveler {
      border-color: rgba($traveler, 0.55);
      h4 {
        color: lighten($traveler, 22%);
      }
    }

    h4 {
      margin: 0;
      padding: 6px 10px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  // overrides Modal's own global `.modal ul { display: flex; flex-wrap:
  // wrap; ... }` grid rule — this is a stacked list, not a grid of coins
  ul {
    display: block;
    list-style: none;
    margin: 0;
    padding: 2px 6px 6px;
  }
}

.rm-glyph {
  width: 15px;
  height: 15px;
  object-fit: contain;
}

.rm-row {
  display: flex;
  align-items: stretch;
  gap: 2px;
  border-radius: 5px;
  &:hover {
    background: rgba(255, 255, 255, 0.07);
  }
}

.rm-pick {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 5px 6px;
  font-family: inherit;
  font-size: 13px;
  color: inherit;
  text-align: left;
  background: none;
  border: 0;
  border-radius: 5px;
  cursor: pointer;

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
  }
  &:focus-visible {
    outline: 1px solid #a01414;
    outline-offset: -2px;
  }
  // a real tap target on a phone — the row's own height follows
  @media (pointer: coarse) {
    min-height: 44px;
  }
}

.rm-info {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  color: rgba(255, 255, 255, 0.55);
  background: none;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  &:hover,
  &:focus-visible {
    color: #ff8a8a;
  }
  &:focus-visible {
    outline: 1px solid #a01414;
    outline-offset: -2px;
  }
  @media (pointer: coarse) {
    width: 44px;
    min-height: 44px;
  }
}
</style>

<!-- UNSCOPED: the modal shell (`.modal-backdrop` / `.modal`) is rendered by
     Modal.vue's own template, not this component's. Vue 2 scoped CSS stamps
     the scope id on the ROOT of a child component used directly in this
     file's template (`.modal-backdrop` qualifies) but not on that child's own
     descendants (`.modal`, a few levels further into Modal.vue's tree) — the
     same reason Modal.vue keeps its own `.editions.workbench` override
     unscoped, in its own stylesheet, for EditionModal's overlay. This does
     the same thing for the `role-picker` class this component passes to
     `<Modal>`. -->
<style lang="scss">
.modal-backdrop.role-picker .modal {
  width: min(560px, 92vw);
}
// FULL-SCREEN ON A PHONE: the default dialog's 96%/92% cap still frames it
// as a floating box; a grouped list of a whole script reads better as the
// screen itself.
@media (max-width: 640px) {
  .modal-backdrop.role-picker .modal {
    width: 100%;
    height: 100%;
    max-width: 100%;
    max-height: 100%;
    border-radius: 0;
  }
}
</style>
