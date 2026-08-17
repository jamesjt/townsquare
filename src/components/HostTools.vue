<template>
  <!-- Golem fork: the HOST TOOLS panel — the storyteller's setup surface,
       centre-stage while the game is being built (hosting, seats exist, roles
       not yet dealt). The controls DRIVE the existing machinery (players/add,
       the edition + roles modals, distributeRoles) — this panel is doors, not
       a second implementation. -->
  <div class="host-tools">
    <h3>Build the town</h3>

    <div class="row">
      <span class="label">Seats</span>
      <span class="stepper">
        <font-awesome-icon
          icon="minus-circle"
          :class="{ disabled: !canRemoveSeat }"
          @click="removeSeat"
          title="Remove an empty seat (claimed seats are never removed)"
        />
        <b>{{ players.length }}</b>
        <font-awesome-icon
          icon="plus-circle"
          :class="{ disabled: players.length >= 20 }"
          @click="addSeat"
          title="Add a seat"
        />
      </span>
      <small>{{ claimedCount }} claimed</small>
    </div>

    <div class="row">
      <span class="label">Script</span>
      <span class="value" @click="toggleModal('edition')">
        {{ edition.name || "Pick a script…" }}
        <font-awesome-icon icon="theater-masks" />
      </span>
    </div>

    <div class="row">
      <span class="label">Roles</span>
      <span class="value" @click="toggleModal('roles')">
        {{ rolesAssigned }} / {{ players.length }} assigned
        <font-awesome-icon icon="dice" />
      </span>
    </div>

    <div
      class="start"
      :class="{ ready: canStart }"
      @click="start"
      :title="startHint"
    >
      <font-awesome-icon icon="broadcast-tower" />
      Start game
    </div>
    <small class="hint">{{ startHint }}</small>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";

export default {
  computed: {
    ...mapState(["edition", "session"]),
    ...mapState("players", ["players"]),
    claimedCount() {
      return this.players.filter(p => p.id).length;
    },
    /** Travellers sit beyond the base count and outside distribution math. */
    coreSeats() {
      return this.players.filter(
        p => !p.role || p.role.team !== "traveler"
      );
    },
    rolesAssigned() {
      return this.players.filter(p => p.role && p.role.team).length;
    },
    canRemoveSeat() {
      // The spinner never evicts: only an EMPTY seat can go.
      return this.players.some(p => !p.id);
    },
    canStart() {
      return (
        this.coreSeats.length > 0 &&
        this.coreSeats.every(p => p.id) &&
        this.rolesAssigned >= this.players.length
      );
    },
    startHint() {
      if (!this.players.length) return "Add seats to begin.";
      if (!this.coreSeats.every(p => p.id)) {
        const open = this.coreSeats.filter(p => !p.id).length;
        return `Waiting on ${open} ${open === 1 ? "seat" : "seats"} to be claimed…`;
      }
      if (this.rolesAssigned < this.players.length)
        return "Assign roles (the dice) before starting.";
      return "Everyone seated and cast — deal the characters.";
    }
  },
  methods: {
    ...mapMutations(["toggleModal"]),
    addSeat() {
      if (this.players.length >= 20) return;
      this.$store.commit("players/add", `Seat ${this.players.length + 1}`);
    },
    removeSeat() {
      // remove the LAST empty seat; claimed chairs are a targeted act only
      for (let i = this.players.length - 1; i >= 0; i--) {
        if (!this.players[i].id) {
          this.$store.commit("players/remove", i);
          return;
        }
      }
    },
    start() {
      if (!this.canStart) {
        // The button explains itself instead of doing nothing.
        if (this.rolesAssigned < this.players.length && this.coreSeats.every(p => p.id)) {
          this.toggleModal("roles");
        }
        return;
      }
      this.$parent.$refs.menu.distributeRoles();
    }
  }
};
</script>

<style scoped lang="scss">
.host-tools {
  position: absolute;
  z-index: 3;
  text-align: center;
  padding: 15px 25px;
  background: rgba(0, 0, 0, 0.6);
  border: 3px solid black;
  border-radius: 10px;
  box-shadow: 0 0 10px black;

  h3 {
    margin-bottom: 8px;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-height: 34px;

    .label {
      opacity: 0.7;
      width: 55px;
      text-align: left;
    }
    .stepper {
      display: flex;
      align-items: center;
      gap: 10px;
      svg {
        cursor: pointer;
        &:hover {
          color: red;
        }
        &.disabled {
          opacity: 0.3;
          pointer-events: none;
        }
      }
      b {
        min-width: 26px;
      }
    }
    .value {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      &:hover {
        color: red;
      }
    }
    small {
      opacity: 0.6;
    }
  }

  .start {
    margin-top: 10px;
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
    font-size: 120%;
    padding: 8px 20px;
    background: rgba(0, 0, 0, 0.7);
    border: 3px solid black;
    border-radius: 10px;
    opacity: 0.4;
    cursor: not-allowed;

    &.ready {
      opacity: 1;
      cursor: pointer;
      border-color: #400;
      &:hover {
        color: red;
      }
    }
  }

  .hint {
    display: block;
    margin-top: 6px;
    opacity: 0.6;
    font-size: 70%;
  }
}
</style>
