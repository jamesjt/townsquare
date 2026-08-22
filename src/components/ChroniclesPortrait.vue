<template>
  <!-- Golem fork (FT-1037): A BOARD PORTRAIT — one game's ring at one moment
       (Day 1 breaking, or the end), rendered from the DATA SNAPSHOT a host-
       authored `board` row carries (golem/chronicles: seats in ring order —
       name, role id, alive/dead, traveler). Not a playable board and not a
       screenshot: a compact ring of role coins with names, the same way the
       town square arranges its seats, small enough to stand in a stats page.

       PRIVACY: a board row is only ever POSTED at game end, when the reveal
       has shown every role anyway (App.vue's onGameRecorded). The one other
       ring this renders is FT-1057's opening board on the HOST's own screen
       mid-game — a synthetic row built from the host-local stash, never a
       wire row (ChroniclesDrawer's openingRow), so nothing secret rides
       through here that the viewer does not already hold. -->
  <!-- FT-1056: a `display: contents` wrapper — Vue 2 needs one root node,
       but this root must never become a flex item in the drawer's
       `.cr-portraits` row in `.cp`'s place, so it renders as if absent and
       `.cp` (the figure) stays the actual flex child, unchanged. -->
  <div class="cp-root">
    <figure
      class="cp"
      :class="{ 'cp-large': large }"
      :tabindex="large ? null : 0"
      :role="large ? null : 'button'"
      :title="large ? null : 'View larger'"
      @click="large ? null : open()"
      @keyup.enter="large ? null : open()"
      @keyup.space.prevent="large ? null : open()"
    >
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

    <!-- THE LIGHTBOX — a thumbnail portrait (never a large one; `large`
         instances render no trigger of their own) opens the same ring again
         at overlay scale, over the app's own dark-veil idiom
         (StatsOverlay.vue's). Click anywhere on the veil, including the
         enlarged portrait itself, closes it — there is no inner content to
         protect from the click. -->
    <div v-if="isOpen" class="cp-veil" @click="close">
      <ChroniclesPortrait :board="board" :label="label" large />
    </div>
  </div>
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
    /** FT-1056: the size/variant — false renders the clickable thumbnail
     *  (the default, everywhere the portrait already appeared), true renders
     *  the lightbox's overlay-scale ring with no click-to-open of its own. */
    large: { type: Boolean, default: false },
  },
  data() {
    return { isOpen: false };
  },
  beforeDestroy() {
    // in case the drawer closes (unmounting this portrait) while the
    // lightbox sits open — the listener must not outlive the component
    if (this.isOpen) document.removeEventListener("keyup", this.onKeyup);
  },
  computed: {
    aliveLine() {
      const alive = this.board.seats.filter((s) => !s.dead).length;
      return `${alive} of ${this.board.seats.length} alive`;
    },
  },
  methods: {
    /** FT-1056: open the lightbox (thumbnail instances only — a `large`
     *  instance never calls this, it has no trigger). */
    open() {
      this.isOpen = true;
      document.addEventListener("keyup", this.onKeyup);
    },
    close() {
      this.isOpen = false;
      document.removeEventListener("keyup", this.onKeyup);
    },
    onKeyup(e) {
      if (e.key === "Escape") this.close();
    },
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
// FT-1056: the thumbnail's rank in `.cp-root` (`display: contents` — see the
// template comment; the wrapper takes no layout box of its own).
.cp-root {
  display: contents;
}

.cp {
  margin: 0;
  flex: 1 1 0;
  min-width: 0;
  // FT-1056: every px size below reads off these — `.cp-large` (the lightbox
  // instance) only has to redeclare the variables, not the rules.
  --cp-max: 230px;
  --cp-pad: 6px;
  --cp-coin: 30px;
  --cp-seat-w: 52px;
  --cp-name-fs: 9px;
  --cp-label-fs: 15px;
  --cp-alive-fs: 10px;
  max-width: var(--cp-max);
}

.cp {
  // an OPAQUE ground: the drawer's backdrop is translucent and the town
  // square's own bright tokens (the bluffs cluster especially) bled through
  // the ring and drowned its seats — a portrait stands on its own dark plate.
  background: rgba(14, 9, 7, 0.94);
  border-radius: 8px;
  padding: var(--cp-pad);
  // FT-1056: the thumbnail is the click-to-enlarge trigger; the veil's own
  // `large` instance overrides both back off below.
  cursor: pointer;
  transition: box-shadow 120ms;
  &:hover,
  &:focus-visible {
    box-shadow: 0 0 0 1px rgba(216, 205, 180, 0.4);
  }
}

// FT-1056: the lightbox's own ring — bigger throughout, and not itself a
// click target (it renders with no trigger; see the `large` prop).
.cp-large {
  --cp-max: min(640px, 86vw);
  --cp-pad: 16px;
  --cp-coin: 68px;
  --cp-seat-w: 108px;
  --cp-name-fs: 16px;
  --cp-label-fs: 30px;
  --cp-alive-fs: 16px;
  cursor: default;
  &:hover,
  &:focus-visible {
    box-shadow: none;
  }
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
  font-size: var(--cp-label-fs);
  color: #d8cdb4;
  opacity: 0.85;
}
.cp-alive {
  font-size: var(--cp-alive-fs);
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
}

.cp-seat {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: var(--cp-seat-w);
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
  width: var(--cp-coin);
  height: var(--cp-coin);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45) center / 85% no-repeat;
  box-shadow: inset 0 0 0 1px rgba(216, 205, 180, 0.3);
}

.cp-name {
  max-width: var(--cp-seat-w);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--cp-name-fs);
  line-height: 1.3;
  color: #e0d8c6;
}

// FT-1056: THE LIGHTBOX VEIL — the same dark-veil idiom StatsOverlay.vue
// wears (fixed, full-screen, centered, translucent black), ranked above the
// Chronicles drawer (z-index 55).
.cp-veil {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 91;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}
</style>
