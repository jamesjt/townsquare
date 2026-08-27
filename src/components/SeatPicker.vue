<template>
  <!-- Golem fork (FT-862): THE SEAT PICKER — who a night-row target slot
       points at. A native <select> can't carry an icon per option and reads
       unstyled inside the sheet's dark chrome (user report: a plain
       blue-highlight browser list). Follows ScriptPicker.vue verbatim:
       trigger + popup, click-out and Escape close, keyboard-operable rows
       (golem/floatingPicker owns that shell).

       PRIVACY IS AN EXPLICIT PROP, never assumed. `show-role` must be passed
       true by the caller for the role name + icon to appear at all — off,
       a row is seat number and name, exactly what a player is allowed to
       know about a seat. NightSheet passes it from `!session.isSpectator`,
       but the gate lives HERE too: a future reuse of this component that
       forgets to check who's viewing still can't leak a role, because the
       default is false. -->
  <div class="seat-pick" ref="wrap">
    <button
      type="button"
      class="sp-trigger"
      :class="{ open }"
      :title="title"
      @click="toggle"
    >
      <span class="sp-seat" v-if="pickedSeat >= 0">{{ pickedSeat + 1 }}.</span>
      <span
        v-if="pickedIcon"
        class="sp-icon"
        :style="{ backgroundImage: `url(${pickedIcon})` }"
      ></span>
      <span class="sp-text">
        <span class="sp-name">{{ pickedLabel }}</span>
        <span class="sp-role" v-if="pickedRoleName">{{ pickedRoleName }}</span>
      </span>
      <font-awesome-icon icon="chevron-down" class="sp-caret" />
    </button>
    <ul class="sp-list" v-if="open" ref="popup">
      <li
        class="sp-row sp-clear"
        :class="{ picked: pickedSeat === -1 }"
        tabindex="0"
        @click="pick(-1)"
        @keydown.enter="pick(-1)"
        @keydown.space.prevent="pick(-1)"
      >
        <span class="sp-dash">—</span>
        <span class="sp-text"><span class="sp-name">Nobody</span></span>
      </li>
      <li
        v-for="(p, i) in players"
        :key="i"
        class="sp-row"
        :class="{ picked: pickedSeat === i }"
        tabindex="0"
        @click="pick(i)"
        @keydown.enter="pick(i)"
        @keydown.space.prevent="pick(i)"
      >
        <span class="sp-num">{{ i + 1 }}.</span>
        <span
          v-if="showRole && p.role && p.role.id"
          class="sp-icon"
          :style="{ backgroundImage: `url(${iconFor(p)})` }"
        ></span>
        <span class="sp-text">
          <span class="sp-name">{{ p.name || "Open seat" }}</span>
          <span class="sp-role" v-if="showRole && p.role && p.role.name">{{
            p.role.name
          }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<script>
import floatingPicker from "../golem/floatingPicker";

/**
 * @prop players    seats in ring order — the same `players` array every
 *                   surface reads off players/players
 * @prop pickedSeat  the chosen seat index, or -1 for none
 * @prop showRole    STORYTELLER GATE (see template comment) — default false
 * @prop iconFor     (player) => icon url, only ever called when showRole is
 *                   true; the caller owns icon resolution (NightSheet's own
 *                   roleIconUrl) rather than this component reaching into
 *                   the store itself
 * @fires pick       (seatIndex: number) — -1 clears the slot
 */
export default {
  name: "SeatPicker",
  mixins: [floatingPicker],
  props: {
    players: { type: Array, required: true },
    pickedSeat: { type: Number, default: -1 },
    showRole: { type: Boolean, default: false },
    iconFor: { type: Function, default: () => null },
    title: { type: String, default: "" },
    // FT-1229: what the empty trigger SAYS. "—" (the default) reads as "no
    // pick"; a caller whose empty state means "add one" (the night sheet's
    // staged-deaths adder) passes its own word instead.
    placeholder: { type: String, default: "—" }
  },
  computed: {
    pickedPlayer() {
      return this.pickedSeat >= 0 ? this.players[this.pickedSeat] : null;
    },
    pickedIcon() {
      const p = this.pickedPlayer;
      if (!this.showRole || !p || !p.role || !p.role.id) return null;
      return this.iconFor(p) || null;
    },
    pickedRoleName() {
      const p = this.pickedPlayer;
      return this.showRole && p && p.role && p.role.name ? p.role.name : "";
    },
    pickedLabel() {
      if (!this.pickedPlayer) return this.placeholder;
      return this.pickedPlayer.name || "Open seat";
    }
  },
  methods: {
    pick(seat) {
      this.closePopup();
      this.$emit("pick", seat);
    }
  }
};
</script>

<style scoped lang="scss">
// ROW CONTROL HEIGHT CONTRACT: 30px desktop / 44px coarse-pointer — kept in
// step by hand across NightSheet.vue, SeatPicker.vue and CharacterPicker.vue.
// A change to one changes all three.
.seat-pick {
  position: relative;
  min-width: 0;
}

.sp-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  // FT-882: a <button> sizes to its CONTENT, not to its box, even as a
  // block-level flex container — so when .seat-pick (which carries
  // `min-width: 0` precisely so it CAN be squeezed) shrank to 33px inside a
  // narrow row, this trigger stayed at its full 104px and drew straight over
  // the picker next to it. Measured in the night sheet's disc layout at
  // 1280×800; the same overflow was latent anywhere this control is put
  // under pressure. `width: 100%` makes it follow its parent, and the name
  // and role lines inside already ellipsize.
  //
  // At rest nothing moves: .seat-pick is a content-sized flex item, so 100%
  // of it IS the content width.
  width: 100%;
  max-width: 150px;
  padding: 0 6px;
  font-family: inherit;
  font-size: 12.5px;
  color: white;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid #3d3d3d;
  border-radius: 5px;
  cursor: pointer;

  .sp-seat {
    opacity: 0.6;
    flex-shrink: 0;
  }
  .sp-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    background-size: cover;
    background-position: center;
    border-radius: 2px;
  }
  .sp-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.05;
    min-width: 0;
    .sp-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    .sp-role {
      font-size: 84%;
      opacity: 0.6;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
  }
  .sp-caret {
    margin-left: auto;
    flex-shrink: 0;
    opacity: 0.6;
    font-size: 70%;
    transition: transform 150ms;
  }
  &:hover,
  &.open {
    border-color: #400;
  }
  &.open .sp-caret {
    transform: rotate(180deg);
  }

  @media (pointer: coarse) {
    height: 44px;
    max-width: none;
    min-width: 128px;
    font-size: 14px;
    padding: 0 10px;
    .sp-icon {
      width: 22px;
      height: 22px;
    }
  }
}

.sp-list {
  position: fixed;
  overflow-y: auto;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: rgba(10, 4, 4, 0.97);
  border: 2px solid #400;
  border-radius: 8px;
  box-shadow: 0 0 12px black;
  z-index: 60;

  .sp-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 30px;
    padding: 3px 8px;
    border-radius: 5px;
    cursor: pointer;
    outline: none;

    .sp-num,
    .sp-dash {
      width: 20px;
      flex-shrink: 0;
      text-align: right;
      opacity: 0.55;
      font-size: 12px;
    }
    .sp-icon {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      background-size: cover;
      background-position: center;
      border-radius: 3px;
    }
    .sp-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.15;
      .sp-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sp-role {
        font-size: 82%;
        opacity: 0.65;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    &:hover,
    &:focus {
      background: rgba(255, 0, 0, 0.1);
    }
    &.picked {
      background: rgba(160, 20, 20, 0.22);
      box-shadow: inset 0 0 0 1px #a01414;
    }

    @media (pointer: coarse) {
      min-height: 44px;
      .sp-icon {
        width: 30px;
        height: 30px;
      }
      .sp-name {
        font-size: 14px;
      }
    }
  }
}
</style>
