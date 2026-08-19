<template>
  <Modal v-if="modals.role && availableRoles.length" @close="close">
    <!-- FT-861: ONE grid, two questions. Without `forBelief` this is the seat's
         character, exactly as it has always been; with it, the same grid sets
         what that seat's player is TOLD they are. -->
    <h3 v-if="forBelief">
      What does {{ seatName }} think they are?
    </h3>
    <h3 v-else>
      Choose a new character for
      {{
        playerIndex >= 0 && players.length
          ? players[playerIndex].name
          : "bluffing"
      }}
    </h3>
    <p class="belief-hint" v-if="forBelief">
      They will be dealt this character and shown nothing else. The blank coin
      at the end tells them the truth again.
    </p>
    <ul class="tokens" v-if="tab === 'editionRoles' || !otherTravelers.size">
      <li
        v-for="role in availableRoles"
        :class="[role.team]"
        :key="role.id"
        @click="setRole(role)"
      >
        <Token :role="role" />
      </li>
    </ul>
    <ul class="tokens" v-if="tab === 'otherTravelers' && otherTravelers.size">
      <li
        v-for="role in otherTravelers.values()"
        :class="[role.team]"
        :key="role.id"
        @click="setRole(role)"
      >
        <Token :role="role" />
      </li>
    </ul>
    <div
      class="button-group"
      v-if="playerIndex >= 0 && otherTravelers.size && !session.isSpectator"
    >
      <span
        class="button"
        :class="{ townsfolk: tab === 'editionRoles' }"
        @click="tab = 'editionRoles'"
        >Edition Roles</span
      >
      <span
        class="button"
        :class="{ townsfolk: tab === 'otherTravelers' }"
        @click="tab = 'otherTravelers'"
        >Other Travelers</span
      >
    </div>
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import Token from "../Token";

export default {
  components: { Token, Modal },
  props: {
    playerIndex: {
      type: Number,
      default: 0
    },
    /**
     * FT-861: set the seat's BELIEVED character instead of its real one — what
     * its player is told they are. Only the seat's belief chip opens it this
     * way; every other entry point leaves it false.
     */
    forBelief: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    /** Whose belief is being set — the heading's subject. */
    seatName() {
      const player = this.players[this.playerIndex];
      return (player && player.name) || "this seat";
    },
    availableRoles() {
      const availableRoles = [];
      const players = this.$store.state.players.players;
      this.$store.state.roles.forEach(role => {
        // don't show bluff roles that are already assigned to players
        if (
          this.playerIndex >= 0 ||
          (this.playerIndex < 0 &&
            !players.some(player => player.role.id === role.id))
        ) {
          availableRoles.push(role);
        }
      });
      availableRoles.push({});
      return availableRoles;
    },
    ...mapState(["modals", "roles", "session"]),
    ...mapState("players", ["players"]),
    ...mapState(["otherTravelers"])
  },
  data() {
    return {
      tab: "editionRoles"
    };
  },
  methods: {
    setRole(role) {
      // FT-861: the belief branch. The blank coin the grid always appends has
      // no id, and that is the clear: back to believing the truth.
      if (this.forBelief) {
        if (this.session.isSpectator || this.playerIndex < 0) return;
        const player = this.$store.state.players.players[this.playerIndex];
        if (player) {
          this.$store.commit("players/update", {
            player,
            property: "believedRole",
            value: role && role.id ? role : null
          });
        }
        this.tab = "editionRoles";
        this.$store.commit("toggleModal", "role");
        return;
      }
      if (this.playerIndex < 0) {
        // assign to bluff slot (index < 0)
        this.$store.commit("players/setBluff", {
          index: this.playerIndex * -1 - 1,
          role
        });
      } else {
        if (this.session.isSpectator && role.team === "traveler") return;
        // assign to player
        const player = this.$store.state.players.players[this.playerIndex];
        this.$store.commit("players/update", {
          player,
          property: "role",
          value: role
        });
      }
      this.tab = "editionRoles";
      this.$store.commit("toggleModal", "role");
    },
    close() {
      this.tab = "editionRoles";
      this.toggleModal("role");
    },
    ...mapMutations(["toggleModal"])
  }
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

/* FT-861: the one line that says what this grid is doing when it is asking
   about a belief rather than a character. */
.belief-hint {
  max-width: 46em;
  margin: -6px auto 10px;
  opacity: 0.7;
  font-size: 90%;
  line-height: 1.3;
}

ul.tokens li {
  border-radius: 50%;
  // Sized in `vw` alone, a character in this grid drew at 115px on a desktop
  // and 22px on a phone — a third of a fingertip, in a grid of thirty of them,
  // for the one control that assigns a character to a seat. The floor only
  // ever binds below ~730px wide, so the desktop grid is untouched.
  width: max(6vw, 44px);
  margin: 1%;
  transition: transform 500ms ease;

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
}

#townsquare.spectator ul.tokens li.traveler {
  display: none;
}
</style>
