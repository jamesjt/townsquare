<template>
  <!-- Golem fork (FT-1037): A BOARD PORTRAIT — one game's ring at one moment
       (Day 1 breaking, or the end), rendered from the DATA SNAPSHOT a host-
       authored `board` row carries (golem/chronicles: seats in ring order —
       name, role id, alive/dead, traveler). Not a playable board and not a
       screenshot: a compact ring of role coins with names, the same way the
       town square arranges its seats, small enough to stand in a stats page.

       Everything here is already public by construction — a board row is only
       ever posted at game end, when the reveal has shown every role anyway
       (see App.vue's onGameRecorded / socket.js's day-1 stash note). -->
  <figure class="cp">
    <div class="cp-ring">
      <div class="cp-center">
        <span class="cp-label">{{ label }}</span>
        <span class="cp-alive">{{ aliveLine }}</span>
      </div>
      <div
        v-for="(seat, i) in board.seats"
        :key="i + ':' + seat.name"
        class="cp-seat"
        :class="{ dead: seat.dead, traveler: seat.traveler }"
        :style="seatStyle(i)"
        :title="seatTitle(seat)"
      >
        <span
          class="cp-coin"
          :style="{ backgroundImage: `url(${iconOf(seat)})` }"
        ></span>
        <span class="cp-name">{{ seat.name }}</span>
      </div>
    </div>
  </figure>
</template>

<script>
export default {
  name: "ChroniclesPortrait",
  props: {
    /** The decoded board EVENT: { moment, seats: [{name, role, dead,
     *  traveler}] } — golem/chronicles' `boardsOf` hands these out. */
    board: { type: Object, required: true },
    /** What this moment is called under the ring ("Day 1" / "The end"). */
    label: { type: String, required: true },
  },
  computed: {
    aliveLine() {
      const alive = this.board.seats.filter((s) => !s.dead).length;
      return `${alive} of ${this.board.seats.length} alive`;
    },
  },
  methods: {
    /** Seat i's spot on the ring — top seat first, clockwise, the same
     *  arrangement the town square deals its chairs in. */
    seatStyle(i) {
      const n = this.board.seats.length || 1;
      const angle = -Math.PI / 2 + (i / n) * 2 * Math.PI;
      return {
        left: 50 + 41 * Math.cos(angle) + "%",
        top: 50 + 41 * Math.sin(angle) + "%",
      };
    },
    /** The bundled coin art for a role id — Token.vue's fallback idiom:
     *  unknown/custom roles wear the generic engraving. */
    iconOf(seat) {
      try {
        return require("../assets/icons/" + (seat.role || "custom") + ".png");
      } catch (e) {
        return require("../assets/icons/custom.png");
      }
    },
    seatTitle(seat) {
      const role = this.$store.getters.rolesJSONbyId.get(seat.role);
      const roleName =
        (this.$store.state.roles.get(seat.role) || role || {}).name ||
        seat.role ||
        "no role";
      return (
        seat.name +
        " — " +
        roleName +
        (seat.traveler ? " (traveler)" : "") +
        (seat.dead ? ", dead" : "")
      );
    },
  },
};
</script>

<style scoped lang="scss">
.cp {
  margin: 0;
  flex: 1 1 0;
  min-width: 0;
  max-width: 230px;
}

.cp {
  // an OPAQUE ground: the drawer's backdrop is translucent and the town
  // square's own bright tokens (the bluffs cluster especially) bled through
  // the ring and drowned its seats — a portrait stands on its own dark plate.
  background: rgba(14, 9, 7, 0.94);
  border-radius: 8px;
  padding: 6px;
}

.cp-ring {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
}

.cp-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  pointer-events: none;
  text-align: center;
}
.cp-label {
  font-family: PiratesBay, sans-serif;
  font-size: 15px;
  color: #d8cdb4;
  opacity: 0.85;
}
.cp-alive {
  font-size: 10px;
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
}

.cp-seat {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 52px;
  cursor: default;
  // a dead seat keeps its place on the ring, drained of colour — the two
  // portraits reading visibly different is the whole point of the pair
  &.dead {
    .cp-coin {
      filter: grayscale(1);
      opacity: 0.45;
    }
    .cp-name {
      opacity: 0.45;
      text-decoration: line-through;
    }
  }
  &.traveler .cp-coin {
    box-shadow: inset 0 0 0 1px rgba(150, 130, 175, 0.9);
  }
}

.cp-coin {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45) center / 85% no-repeat;
  box-shadow: inset 0 0 0 1px rgba(216, 205, 180, 0.3);
}

.cp-name {
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 9px;
  line-height: 1.3;
  color: #e0d8c6;
}
</style>
