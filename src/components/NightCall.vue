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
       because in the stream it is an interruption rather than a section.

       ── FT-1107 (user): AND BOTH OF THOSE ROOMS WERE THE WRONG ROOM. ──

       "The interaction should happen on the clock face. not in the chat, the
       chronicle should just record what was done." A player sat as a Fortune
       Teller with the drawer shut, watched their own coin light up on the
       ring, and had nowhere to answer — because the answer was inside a
       drawer, and a drawer is somewhere you go, not somewhere you are.

       So there is a THIRD form, `face`, and it is now the only one that
       renders: the ask, on the town square itself. It is deliberately not a
       copy of the band. The band had to be self-sufficient (it stood in a
       stream of unrelated talk, so it carried a moon, a heading, its own
       frame and a privacy line); the face form stands ON the thing it is
       talking about, so it carries the words and nothing else — the SEATS
       are the control (Player.vue's night-pick overlay), and the picked
       coins are the readout. `SeatPicker` never appears here: a dropdown
       listing seat numbers, laid over a ring of those same seats, is the
       chat-shaped control this whole card was filed to get rid of.

       `action.freeText` is the exception, and stays an input, because a
       character nobody designed controls for has no seats to point at.

       One component, three dresses, ONE question — `night/myCall` — so the
       face and the seats can never disagree about whether this player is
       being asked. -->
  <div class="nc" :class="{ pinned, face }">
    <!-- ── THE FACE FORM (FT-1107) ─────────────────────────────────────── -->
    <template v-if="face">
      <span class="nf-role">{{ action.role.name }}</span>
      <span class="nf-line">{{ action.line }}</span>
      <!-- WHAT TO DO, in the imperative, naming the clock: the player has to
           learn once that the ring is the control. It counts DOWN as they
           pick, so the line is also the progress readout — one element doing
           both, because the hub has room for neither twice. -->
      <span class="nf-ask" v-if="action.slots">{{ askLine }}</span>
      <span class="nf-chosen" v-if="action.slots && chosenNames.length">
        <span class="nf-chip" v-for="(n, i) in chosenNames" :key="'c' + i">{{
          n
        }}</span>
      </span>
      <!-- The universal fallback: no seats to point at, so their own words.
           A plain `v-if`, not a `v-else-if` on the row above — `freeText` is
           by construction only ever true when there are no player slots (both
           read the same schema table, and a character absent from it has
           neither), so the chain bought nothing and would have broken the
           moment a comment or an element landed between the two. -->
      <input
        v-if="action.freeText"
        type="text"
        class="nd-free nf-free"
        placeholder="Your choice, in your own words"
        spellcheck="false"
        maxlength="280"
        :value="freeTextValue"
        @input="typeText($event.target.value)"
        @blur="flushText"
      />
      <!-- AND THE ANSWER LANDS HERE TOO. The storyteller's echo — the
           Fortune Teller's "Yes", the Empath's number, the character an
           Undertaker was shown — read where the question was asked, so
           nothing has to be opened to hear it. -->
      <span class="nf-told" v-if="answer.length">
        <span
          class="nd-told"
          v-for="(a, i) in answer"
          :key="'a' + i"
          :class="a.cls"
          >{{ a.text }}</span
        >
      </span>
    </template>
    <!-- ── THE BAND / SECTION FORM (FT-1005, FT-1101) ───────────────────── -->
    <template v-else>
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
          <span
            class="nd-told"
            :class="pingClass(row)"
            v-if="row.ping !== null"
          >
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
    </template>
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
    /** FT-1107: THE CLOCK-FACE FORM — the ask standing in the town readout,
     *  with the ring itself as its control. Wins over `pinned`. */
    face: {
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
    /**
     * FT-1107: THE SEATS THIS PLAYER HAS PICKED, as the host recorded them,
     * named. Read off `targets` (slot-aligned seat indexes) rather than the
     * projection's `targetNames` — that list is compacted with `.filter
     * (Boolean)` and so cannot say WHICH slot a name came from, and a seat
     * renamed mid-game would keep the name it wore when the row was written.
     * The ring is showing these same seats lit; this line is what makes the
     * lit coins readable at a glance without counting round the clock.
     */
    chosenNames() {
      const targets = (this.row && this.row.targets) || [];
      const out = [];
      targets.forEach((seat) => {
        if (!Number.isInteger(seat) || seat < 0) return;
        const p = this.players[seat];
        out.push((p && p.name) || "Seat " + (seat + 1));
      });
      return out;
    },
    /** How many of this player's own slots are still empty. */
    slotsLeft() {
      return Math.max(0, (this.action.slots || 0) - this.chosenNames.length);
    },
    /**
     * FT-1107: the one line that teaches the control and reports on it. It is
     * the imperative while there is picking left to do and a plain past-tense
     * statement once there is not — never a third state, because the hub is
     * two lines tall and a "done!" is a line that says nothing.
     */
    askLine() {
      const left = this.slotsLeft;
      // ONE LINE, ALWAYS. The hub's vertical budget is the gap between the
      // counts and the seat at six o'clock; a wrapped instruction pushed the
      // storyteller's answer down behind that coin (measured at 1280x900,
      // first pass). The chips below already say the choices are in, so the
      // sentence that said it too came out.
      if (!left) {
        return this.action.slots > 1
          ? "Tap a coin to change one."
          : "Tap another coin to change it.";
      }
      if (!this.chosenNames.length) {
        return this.action.slots > 1
          ? "Tap " + this.action.slots + " players on the clock."
          : "Tap a player on the clock.";
      }
      return "Tap " + left + " more.";
    },
    /**
     * FT-1107: WHAT THE STORYTELLER HAS SAID BACK, as chips — the same four
     * delivered values the band renders inline (the yes/no, a number, a
     * character, their words), assembled here instead of as four v-ifs
     * because on the face they wrap onto their own line and need to be
     * countable (`v-if="answer.length"`) before the line is drawn at all.
     *
     * The lie mark is not here, and cannot be: `projectPlayerRow` never puts
     * `isFalseInfo` on a player's copy of their own row in the first place.
     */
    answer() {
      const row = this.row;
      if (!row) return [];
      const out = [];
      if (row.ping === true) out.push({ text: "Yes", cls: "yes" });
      else if (row.ping === false) out.push({ text: "No", cls: "no" });
      if (row.number !== null && row.number !== undefined && row.number !== "")
        out.push({ text: String(row.number), cls: "" });
      if (row.characterName) out.push({ text: row.characterName, cls: "" });
      if (row.text) out.push({ text: row.text, cls: "words" });
      return out;
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

// ── FT-1107: THE FACE FORM — the ask, standing on the clock face ─────────
//
// It has NO FRAME. Every other panel in this app that carries a control also
// carries a plate to sit it on, and the reason is always the same: the panel
// is a thing laid over the town. This one is not laid over the town — it IS
// the town centre, in the hub the phase readout used to fill, and a bordered
// card there reads as a dialog someone dropped on the clock. The words float
// on the dial the way the dial's own numerals do, with a text shadow doing
// the legibility work a ground would otherwise do (the plate under it is
// hand-painted art and varies; a shadow tracks it, a fixed tint does not).
//
// WIDTH AND PLACEMENT ARE NOT HERE. TownInfo.vue owns where this stands,
// because that is a fact about the clock face, not about the ask.
.nc.face {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  text-align: center;
  color: white;
  text-shadow:
    0 0 4px black,
    0 0 10px black;
  line-height: 1.25;
}

.nf-role {
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  font-size: 118%;
  color: #f0dcae;
}

// tight on purpose — see `askLine`'s note on the hub's vertical budget
.nf-line {
  font-size: 78%;
  font-style: italic;
  opacity: 0.88;
  line-height: 1.2;
}

// the gold seam again — the ONE line on the face that is an instruction and
// not a statement, in the same gold the night's own live row wears
.nf-ask {
  font-size: 82%;
  color: #e2be62;
  font-weight: bold;
}

.nf-chosen {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  margin-top: 1px;
}

// a picked seat's NAME, dressed as the coin's own gold ring is (Player.vue's
// `.night-picked`) so the chip and the lit coin read as the same act
.nf-chip {
  font-size: 78%;
  padding: 0 7px;
  border-radius: 9px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(226, 190, 98, 0.75);
  color: #f0dcae;
}

.nf-told {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  margin-top: 2px;

  // restated rather than inherited: the band's `.nd-told` is nested inside
  // `.nd-row`, which the face form does not have
  .nd-told {
    padding: 0 10px;
    border-radius: 9px;
    font-weight: bold;
    background: rgba(0, 0, 0, 0.5);
    &.yes {
      color: #7ed67e;
    }
    &.no {
      color: #ff8a8a;
    }
    &.words {
      font-weight: normal;
      font-style: italic;
      font-size: 85%;
    }
  }
}

.nf-free {
  // THE FLEX OVERRIDE IS THE POINT OF THIS RULE. `.nd-free` above says
  // `flex: 1 1 140px`, which reads as a 140px WIDTH inside the band's row —
  // and as a 140px HEIGHT here, because the face form is a COLUMN. Left
  // alone it drew a 130px-tall box and shoved the storyteller's answer down
  // behind the seat at six o'clock (measured, first pass).
  flex: 0 0 auto;
  height: 30px;
  width: 100%;
  max-width: 230px;
  margin-top: 3px;
  text-align: center;
}
</style>
