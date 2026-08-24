<template>
  <!-- Golem fork (FT-1101): THE NIGHT ASKING THIS SEAT FOR SOMETHING.

       FT-1005 built this surface and ChroniclesNights owned it, inside the
       moon filter of the chronicles drawer. The user's report from a live
       8-seat game — "the Imp isn't given an option to kill someone" — was
       never that the controls were wrong: they were behind a filter cell the
       player had no reason to press, in a drawer whose default view is the
       message stream, with nothing anywhere saying the night wanted them.

       So the surface came out into its own component and now stands in TWO
       rooms with one definition: the nights view, where it always was, and
       PINNED at the foot of the chronicles stream, where a player already is.
       Same commits (night/playerAction), same echo round trip, same schema
       reads — only the number of rooms changed.

       `pinned` is the band form: it names the night and wears its own frame,
       because in the stream it is an interruption rather than a section. -->
  <div class="nc" :class="{ pinned }">
    <span class="nc-head" v-if="pinned">
      <img class="nc-moon" :src="moonFull" alt="" />
      Night {{ day }} — the night is asking you
    </span>
    <div class="nd-row nd-live">
      <span class="nd-role">{{ action.role.name }}</span>
      <span class="nd-line">{{ action.line }}</span>
      <!-- their OWN choices — only the fields the schema says the player
           fills (playerSlots); the storyteller's pointings never render an
           input here -->
      <div class="nd-input" v-if="action.slots">
        <span class="nd-your">{{
          action.slots > 1 ? "Your choices:" : "Your choice:"
        }}</span>
        <SeatPicker
          v-for="slot in action.slots"
          :key="'t' + slot"
          class="nd-pick"
          :players="players"
          :picked-seat="slotValue(slot - 1)"
          :title="
            'Your own pick (' +
            slot +
            ' of ' +
            action.slots +
            ') — the storyteller sees it as yours'
          "
          @pick="(seat) => pickSeat(slot - 1, seat)"
        />
      </div>
      <!-- the universal fallback where no control was ever designed for this
           character: their choice in their own words -->
      <div class="nd-input" v-else-if="action.freeText">
        <input
          type="text"
          class="nd-free"
          placeholder="Your choice, in your own words"
          spellcheck="false"
          maxlength="280"
          :value="freeTextValue"
          @input="typeText($event.target.value)"
          @blur="flushText"
        />
      </div>
      <!-- what the storyteller has answered so far — everything on the row
           except whether it was a lie, live as they fill it -->
      <template v-if="row">
        <span class="nd-told" :class="pingClass(row)" v-if="row.ping !== null">
          {{ row.ping ? "Yes" : "No" }}
        </span>
        <span
          class="nd-told"
          v-if="row.number !== null && row.number !== undefined"
        >
          {{ row.number }}
        </span>
        <span class="nd-told" v-if="row.characterName">{{
          row.characterName
        }}</span>
        <span class="nd-text" v-if="row.text">{{ row.text }}</span>
      </template>
    </div>
    <span class="nc-privacy" v-if="pinned"
      >Only you and the storyteller see this.</span
    >
  </div>
</template>

<script>
import { mapState } from "vuex";
import SeatPicker from "./SeatPicker";
import moonFull from "../assets/moon-full.png";

export default {
  name: "NightCall",
  components: { SeatPicker },
  props: {
    /** tonightActionFor()'s answer — never null; the parent gates on it. */
    action: {
      type: Object,
      required: true,
    },
    /** This seat's delivered row for tonight, or null before the host has
     *  echoed anything. The echo is the truth; nothing here is optimistic. */
    row: {
      type: Object,
      default: null,
    },
    /** Which night, for the band's own heading. */
    day: {
      type: Number,
      default: 0,
    },
    /** The pinned band form (the stream's foot) rather than the section form
     *  (the nights view). */
    pinned: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      // FT-1005: the free-text draft — local while typing (the input cannot
      // ride the wire round trip per keystroke), sent debounced and on blur.
      // null = not dirty, show what the host holds.
      textDraft: null,
    };
  },
  computed: {
    ...mapState("players", ["players"]),
    moonFull() {
      return moonFull;
    },
    /** The free box shows the local draft while typing, the host's echo
     *  otherwise. */
    freeTextValue() {
      if (this.textDraft !== null) return this.textDraft;
      return this.row ? this.row.playerText : "";
    },
  },
  methods: {
    pingClass(row) {
      return { yes: row.ping === true, no: row.ping === false };
    },
    /**
     * FT-1005: the picker shows what the HOST recorded — the echo, never
     * local optimism. A pick answers back in one round trip (the host
     * re-sends this seat's rows on every action frame, applied or refused),
     * so the control settles on the truth even when a storyteller-entered
     * value stood and the pick was refused.
     */
    slotValue(i) {
      const row = this.row;
      if (row && Number.isInteger(row.targets[i])) return row.targets[i];
      return -1;
    },
    /** One pick, up the wire. The commit is the event (the callBack idiom);
     *  socket.js sends it direct to the host and stamps our playerId. */
    pickSeat(i, seat) {
      const targets = new Array(this.action.slots).fill(null);
      targets[i] = Number.isInteger(seat) ? seat : -1;
      this.$store.commit("night/playerAction", {
        roleId: this.action.role.id,
        targets,
      });
    },
    typeText(value) {
      this.textDraft = value;
      clearTimeout(this._textTimer);
      this._textTimer = setTimeout(this.flushText, 400);
    },
    flushText() {
      clearTimeout(this._textTimer);
      if (this.textDraft === null) return;
      this.$store.commit("night/playerAction", {
        roleId: this.action.role.id,
        text: this.textDraft,
      });
      // the draft stays on screen until the host's echo carries the same
      // words back — see the watcher below
    },
  },
  watch: {
    /** FT-1005: hand the free box back to the echo once it caught up. */
    row(row) {
      if (
        this.textDraft !== null &&
        row &&
        (row.playerText || "") === this.textDraft.slice(0, 280)
      ) {
        this.textDraft = null;
      }
    },
  },
  beforeDestroy() {
    clearTimeout(this._textTimer);
  },
};
</script>

<style scoped lang="scss">
// FT-1101: the FT-1005 nights-view furniture (.nd-row + the .nd-tonight
// overrides), moved here WHOLE with the markup it dresses. Scoped styles do
// not reach into a child component, so the look had to travel with the
// controls or the fold would have read as a redesign; the values below are
// ChroniclesNights's own, unchanged.
.nd-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  padding: 5px 8px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid #4b3565;
  border-radius: 0 5px 5px 0;
  font-size: 90%;

  .nd-role {
    font-weight: bold;
  }
  .nd-told {
    padding: 0 8px;
    border-radius: 9px;
    font-weight: bold;
    background: rgba(0, 0, 0, 0.4);
    &.yes {
      color: #7ed67e;
    }
    &.no {
      color: #ff8a8a;
    }
  }
  .nd-text {
    flex-basis: 100%;
    opacity: 0.8;
    font-style: italic;
  }
}

// the gold seam: this is the one row the player is standing IN, not reading
// back
.nd-live {
  border-left-color: #b28f2f;
}

.nd-line {
  flex-basis: 100%;
  opacity: 0.75;
  font-style: italic;
}

.nd-input {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.nd-your {
  opacity: 0.75;
  font-size: 12.5px;
  white-space: nowrap;
}

.nd-free {
  height: 30px;
  flex: 1 1 140px;
  min-width: 0;
  font-family: inherit;
  font-size: 12.5px;
  color: white;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid #3d3d3d;
  border-radius: 5px;
  padding: 0 8px;
  &:focus-visible {
    outline: none;
    border-color: #b28f2f;
  }
}

@media (pointer: coarse) {
  .nd-free {
    height: 44px;
    font-size: 14px;
  }
}

// ── THE PINNED BAND — the stream's foot, where the player already is ──────
.nc.pinned {
  border: 1px solid rgba(178, 143, 47, 0.55);
  border-radius: 6px;
  background: rgba(24, 15, 34, 0.72);
  padding: 5px 7px 4px;
  margin: 4px 0 2px;
  flex: 0 0 auto;

  .nd-row {
    margin-bottom: 0;
  }
}

.nc-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.8;
  margin-bottom: 3px;
}

.nc-moon {
  width: 14px;
  height: 14px;
}

.nc-privacy {
  display: block;
  font-size: 11px;
  opacity: 0.55;
  padding: 3px 4px 0;
}
</style>
