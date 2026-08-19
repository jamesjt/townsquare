<template>
  <!-- Golem fork (FT-862): THE CHARACTER PICKER — for a night row whose TELLS
       is a character (the Undertaker's execution, the Ravenkeeper's reveal),
       not a player. Same trigger+popup shell as SeatPicker (golem/
       floatingPicker), and the row treatment — icon + name — is RoleDrawer's
       own (FT-858/859), not a new look.

       NO privacy gate here, unlike SeatPicker: the option list is the
       SCRIPT's characters, which every player already knows from the
       Almanac/script sheet. What's secret is which SEAT holds a role, not
       which roles exist — this picker never names a seat. -->
  <div class="char-pick" ref="wrap">
    <button
      type="button"
      class="cp-trigger"
      :class="{ open }"
      :title="title"
      @click="toggle"
    >
      <span
        v-if="pickedIcon"
        class="cp-icon"
        :style="{ backgroundImage: `url(${pickedIcon})` }"
      ></span>
      <span class="cp-name">{{ pickedLabel }}</span>
      <font-awesome-icon icon="chevron-down" class="cp-caret" />
    </button>
    <!-- our own blood-drip scrollbar, like every other scroll container in this
         app — a native bar here was an oversight, not a choice (user call
         2026-08-19) -->
    <ul class="cp-list" v-if="open" ref="popup" v-blood-scroll>
      <li
        class="cp-row cp-clear"
        :class="{ picked: !pickedId }"
        tabindex="0"
        @click="pick('', '')"
        @keydown.enter="pick('', '')"
        @keydown.space.prevent="pick('', '')"
      >
        <!-- Just a dash (user call 2026-08-19). This picker chooses a
             CHARACTER, so "Nobody" was the wrong noun — and the phrase was
             long enough to truncate in the trigger, which is how it read as
             "Nobody / uncl…". A dash in a list of names says "none" without
             claiming to be one. -->
        <span class="cp-dash">—</span>
      </li>
      <li
        v-for="r in mainRoles"
        :key="r.id"
        class="cp-row"
        :class="{ picked: pickedId === r.id }"
        tabindex="0"
        @click="pick(r.id, r.name)"
        @keydown.enter="pick(r.id, r.name)"
        @keydown.space.prevent="pick(r.id, r.name)"
      >
        <span
          class="cp-icon"
          :style="{ backgroundImage: `url(${iconFor(r)})` }"
        ></span>
        <span class="cp-name">{{ r.name }}</span>
      </li>

      <!-- TRAVELLERS LAST, AND FOLDED (user call 2026-08-19). They came first
           only because that is the order the script data happens to carry, and
           they are the rarest thing in this list — a Traveller is added
           mid-game, not told to somebody at night. Folded, they cost one row
           instead of five before every character a storyteller actually
           reaches for. -->
      <template v-if="travelerRoles.length">
        <li
          class="cp-row cp-group"
          tabindex="0"
          @click="travelersOpen = !travelersOpen"
          @keydown.enter="travelersOpen = !travelersOpen"
          @keydown.space.prevent="travelersOpen = !travelersOpen"
        >
          <font-awesome-icon
            class="cp-fold"
            icon="chevron-down"
            :class="{ open: travelersOpen }"
          />
          <span class="cp-name">Travellers</span>
          <small class="cp-count">{{ travelerRoles.length }}</small>
        </li>
        <li
          v-for="r in travelerRoles"
          v-show="travelersOpen"
          :key="r.id"
          class="cp-row cp-traveler"
          :class="{ picked: pickedId === r.id }"
          tabindex="0"
          @click="pick(r.id, r.name)"
          @keydown.enter="pick(r.id, r.name)"
          @keydown.space.prevent="pick(r.id, r.name)"
        >
          <span
            class="cp-icon"
            :style="{ backgroundImage: `url(${iconFor(r)})` }"
          ></span>
          <span class="cp-name">{{ r.name }}</span>
        </li>
      </template>
    </ul>
  </div>
</template>

<script>
import floatingPicker from "../golem/floatingPicker";

/**
 * @prop roles       the script's characters (an array — pass
 *                    [...rootState.roles.values()], not the raw Map)
 * @prop pickedId     the chosen role id, or "" for none
 * @prop pickedName   cached display name for pickedId (a role can be edited
 *                    or leave the script later; the row keeps showing what
 *                    it showed the night it was written)
 * @prop iconFor      (role) => icon url
 * @fires pick         ({ id, name })
 */
export default {
  name: "CharacterPicker",
  mixins: [floatingPicker],
  data() {
    return { travelersOpen: false };
  },
  props: {
    roles: { type: Array, required: true },
    pickedId: { type: String, default: "" },
    pickedName: { type: String, default: "" },
    iconFor: { type: Function, default: () => null },
    title: { type: String, default: "" }
  },
  computed: {
    /** Travellers are split out so they can sit at the BOTTOM, folded. */
    mainRoles() {
      return this.roles.filter(r => (r.team || "") !== "traveler");
    },
    travelerRoles() {
      return this.roles.filter(r => (r.team || "") === "traveler");
    },
    pickedRole() {
      return this.pickedId ? this.roles.find(r => r.id === this.pickedId) : null;
    },
    pickedIcon() {
      if (!this.pickedId) return null;
      return this.pickedRole ? this.iconFor(this.pickedRole) : null;
    },
    pickedLabel() {
      if (!this.pickedId) return "—";
      return (this.pickedRole && this.pickedRole.name) || this.pickedName || this.pickedId;
    }
  },
  methods: {
    pick(id, name) {
      this.closePopup();
      this.$emit("pick", { id, name });
    }
  }
};
</script>

<style scoped lang="scss">
// ROW CONTROL HEIGHT CONTRACT: 30px desktop / 44px coarse-pointer — see
// SeatPicker.vue's copy of this comment; the three files stay in step by
// hand.
.char-pick {
  position: relative;
  min-width: 0;
}

.cp-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  max-width: 130px;
  padding: 0 6px;
  font-family: inherit;
  font-size: 12.5px;
  color: white;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid #3d3d3d;
  border-radius: 5px;
  cursor: pointer;

  .cp-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    background-size: cover;
    background-position: center;
    border-radius: 2px;
  }
  .cp-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .cp-caret {
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
  &.open .cp-caret {
    transform: rotate(180deg);
  }

  @media (pointer: coarse) {
    height: 44px;
    max-width: none;
    min-width: 128px;
    font-size: 14px;
    padding: 0 10px;
    .cp-icon {
      width: 22px;
      height: 22px;
    }
  }
}

.cp-list {
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

  // the folded Travellers header — a row, but it picks nothing
  .cp-group {
    opacity: 0.65;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
    border-top: 1px solid rgba(120, 105, 135, 0.28);
    border-radius: 0;
    .cp-fold {
      width: 12px;
      flex-shrink: 0;
      opacity: 0.7;
      transition: transform 150ms;
      &.open {
        transform: rotate(180deg);
      }
    }
    .cp-count {
      margin-left: auto;
      opacity: 0.6;
    }
    &:hover {
      opacity: 1;
    }
  }

  .cp-row {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 30px;
    padding: 3px 8px;
    border-radius: 5px;
    cursor: pointer;
    outline: none;

    .cp-dash {
      width: 20px;
      flex-shrink: 0;
      text-align: right;
      opacity: 0.55;
      font-size: 12px;
    }
    .cp-icon {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      background-size: cover;
      background-position: center;
      border-radius: 3px;
    }
    .cp-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
      .cp-icon {
        width: 30px;
        height: 30px;
      }
      .cp-name {
        font-size: 14px;
      }
    }
  }
}
</style>
