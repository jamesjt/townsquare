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
  <!-- ── FT-1113 (user): THE ASK TAKES THE MIDDLE ─────────────────────────

       "Move the ask to the middle and let the counts yield while you're
       being asked. Make the answer the loudest thing on the face. But keep
       the name chips. make them blue though."

       FT-1107 hung this form BELOW the counts — deliberately, so nothing
       above it moved at dusk. The cost was that the one thing the player
       must ACT on sat underneath a stack of storyteller bookkeeping, at the
       narrowest part of the disc. It stands in the dial's own centre now
       (TownInfo owns the move; see `.info-night` there), and the two things
       that changed HERE are hierarchy, not position:

         `told`   once the storyteller's answer has landed, the instruction
                  that got the player this far steps back — it is spent, and
                  the answer is the whole point of the turn.
         the chips wear the townsfolk blue instead of the coin's gold. -->
  <div class="nc" :class="{ pinned, face, told: face && answer.length > 0 }">
    <!-- ── THE FACE FORM (FT-1107) ─────────────────────────────────────── -->
    <template v-if="face">
      <!-- FT-1272 (user): THE HEADER LEADS WITH THE CHARACTER, then names it
           in the character's OWN TEAM COLOUR.
             · the icon, because a player who has been handed a character they
               have never played reads the picture faster than the word, and
               the ring below is already all pictures — the header was the one
               place on this face that was text alone.
             · the team, because "am I good or evil" is the second thing after
               "who am I", and the face had been saying it in the same gold
               every other line wears. See `.nf-role`'s note below for why the
               colour is the raw token rather than a wash. -->
      <span class="nf-role" :class="'team-' + teamOf">
        <span
          class="nf-role-icon"
          :style="{ backgroundImage: `url(${iconUrl})` }"
        ></span>
        {{ action.role.name }}
      </span>
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
import { roleIconUrl } from "../golem/roleIcon";

/** FT-1272: the teams this face has a colour for (see `.nf-role`'s SCSS map —
 *  the two must stay in step, and they are both built off vars.scss's tokens).
 *  Anything else floors to townsfolk rather than rendering an unstyled name. */
const TEAMS = [
  "townsfolk",
  "outsider",
  "minion",
  "demon",
  "traveler",
  "fabled",
];

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
    /** FT-1272: the header's icon — golem/roleIcon owns the three-source
     *  lookup (forged artwork, the shipped PNG, a borrowed one). */
    iconUrl() {
      return roleIconUrl(this.action.role, this.$store.getters.rolesJSONbyId);
    },
    /** FT-1272: the character's team, floored to one this face has a colour
     *  for. A traveller or a fabled reaching this ask keeps its own token
     *  (both are in the map below); anything else reads as townsfolk rather
     *  than as an unstyled name. */
    teamOf() {
      const t = (this.action.role && this.action.role.team) || "";
      return TEAMS.includes(t) ? t : "townsfolk";
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
      // FT-1272 (user): "select" rather than "tap" — the app is played on
      // a mouse as often as a finger, and select names the act either way.
      // FT-1272 (user, second pass): and the thing you select is a COG. That
      // is the user's word for a player's own piece on the ring, so it is the
      // word the ask uses. The COINS this file still names in its comments are
      // the same objects seen from the art's side; the instruction is the one
      // place a player has to recognise what is being pointed at, so it takes
      // the vocabulary they speak.
      if (!left) {
        return this.action.slots > 1
          ? "Select a cog to change one."
          : "Select another cog to change it.";
      }
      if (!this.chosenNames.length) {
        return this.action.slots > 1
          ? "Select " + this.action.slots + " players on the clock."
          : "Select a player on the clock.";
      }
      return "Select " + left + " more.";
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
// FT-1113: the team palette, for the chips' blue — `$townsfolk` is the ONE
// blue this fork has and it is already on this very panel (TownInfo's
// townsfolk count and glyph wear it), so the chips take it rather than
// inventing a second one.
//
// FT-1272: ...and the same palette now dresses the header's NAME by team. The
// map is built FROM those variables rather than restating their hexes — this
// file is the third to want a team map (RoleHoverCard and the workbench each
// hold their own, both with the values typed out by hand), and a copy that
// reads the tokens cannot drift from them.
@import "../vars.scss";

$team-colors: (
  "townsfolk": $townsfolk,
  "outsider": $outsider,
  "minion": $minion,
  "demon": $demon,
  "traveler": $traveler,
  "fabled": $fabled,
);

// ── FT-1272: THE FACE'S PURPLE ───────────────────────────────────────────
//
// #a78fcd is the fork's PICK INK — the colour that already means "this is the
// one you are choosing" wherever a choice is being made on the square: the
// night-pick overlay on a cog (Player.vue's `.night-pick`, which is the very
// control this face's instruction is telling the player to use), the seat
// ring's focused edge (SeatRing's `--fd-edge-color`), and a whisper's picked
// seat (SeatWhisper). It is not a new value and it is not the plum control
// edge — the plum dresses SURFACES (a dropdown's rim, a well), and this is
// INK on a dial.
//
// It is one colour for both the instruction and the chosen-name chips on
// purpose: those two lines are the two halves of one sentence — what to do,
// and what has been done — and the face reads as one voice when they match.
$face-pick: #a78fcd;

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
// It had NO FRAME, and the reasoning ran: every other panel in this app that
// carries a control also carries a plate, because a panel is a thing laid
// OVER the town — and this one is not laid over the town, it IS the town
// centre, so a bordered card there would read as a dialog dropped on the
// clock. The words floated on the dial the way the dial's own numerals do,
// with a text shadow doing the legibility work a ground would otherwise do.
//
// ── FT-1125 (user): AND IT HAS ONE NOW, BECAUSE THE PLATE IS NOT A CARD ──
//
// "visually it still doesn't show the disc for the player? only the
// storyteller?" The premise above was right about BORDERED CARDS and wrong
// about this face: the storyteller's checklist stands in this exact spot on a
// FACE DISC — a plate laid ON the dial, same centre, same border-radius as
// the art it sits on (src/faceDisc.scss) — which is the opposite object from
// a card floating over it. The player got nothing behind their ask, which is
// the asymmetry the user was pointing at.
//
// THE TEXT SHADOW STAYS. It is no longer the only thing doing the work, but
// the plate is glass rather than a fill (its own tint is zero — see that
// file's tint block), so the hand-painted art still varies underneath and a
// shadow still tracks it where a fixed ground would not.
//
// WIDTH, PLACEMENT AND NOW THE PLATE ARE NOT HERE. TownInfo.vue owns all
// three, because they are facts about the clock face, not about the ask.
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

// ── FT-1272: THE HEADER WEARS THE CHARACTER, AND ITS TEAM ────────────────
//
// It was #f0dcae — the parchment gold every other line on this face carries —
// so the one element that could have told a player which side they are on was
// saying nothing the neighbouring lines were not already saying.
//
// THE TREATMENT IS FT-1167'S, NOT A NEW ONE. That card had the same argument
// and settled it with measurements: the RAW team token as ink, and a dark halo
// under it doing the legibility work, rather than `mix(white, $color, 32%)` —
// because a wash pulls six hues a third of the way toward each other and
// telling a Minion from a Demon at a glance is the entire point of the colour.
// Measured against this face's effective ground (the halo's black, since the
// face disc's own tint is zero and the hand-painted dial varies underneath):
//
//   fabled     #ffe91f   16.35:1
//   outsider   #46d5ff   12.22:1
//   minion     #ff6900    7.27:1
//   traveler   #cc04ff    4.86:1
//   townsfolk  #1f65ff    4.36:1
//   demon      #ce0100    3.63:1   ← the floor
//
// AND THE SIZE MOVED WITH IT, for the same reason FT-1167 went 17 -> 19px on
// its own compact card. WCAG's 3:1 bar is for LARGE text, which starts at
// 18.66px bold; at 118% of this face's ambient type the name landed just
// under, which would have put the demon's #ce0100 against the 4.5:1 bar it
// does not clear. 132% carries it over the line on the disc, and the name was
// already the header — being a little louder costs the composition nothing.
//
// The halo is BLACK rather than each team's own colour: the answer chips below
// use a coloured halo to say "bright" (see `.nf-told`), and the header is not
// competing with them — it is being read.
.nf-role {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  font-size: 132%;
  color: #f0dcae;

  @each $team, $color in $team-colors {
    &.team-#{$team} {
      color: $color;
      text-shadow:
        0 1px 2px rgba(0, 0, 0, 0.95),
        0 0 6px rgba(0, 0, 0, 0.85);
    }
  }
}

// sized to the NAME'S OWN LINE (1em of the header's type, not a fixed pixel
// count) so the two stay proportioned when the disc scales the face's ambient
// size — the same reason nothing else in this block is in px.
.nf-role-icon {
  flex: 0 0 auto;
  width: 1.5em;
  height: 1.5em;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  // the art is painted on parchment and goes soft over a dark dial; the same
  // drop shadow the header's own type wears holds its edge
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
}

// tight on purpose — see `askLine`'s note on the hub's vertical budget
.nf-line {
  font-size: 78%;
  font-style: italic;
  opacity: 0.88;
  line-height: 1.2;
}

// THE INSTRUCTION LINE — the ONE line on the face that is an imperative and
// not a statement.
//
// IT WAS THE GOLD SEAM (#e2be62, the colour the night's own live row wears in
// the band form). FT-1272 (user) moves it to the pick ink, and the reason is
// that gold on this face had stopped meaning anything in particular: the role
// name was gold, the chips were gold before FT-1113, the seam is gold, the
// dial's own numerals are gold. Purple is the colour a player is already being
// asked to LOOK FOR — the cog they are about to select lights in exactly this
// hue — so the sentence telling them to select one now matches the thing it
// is pointing at.
//
// Measured on the halo's black ground (11.78:1 for the old gold, and 82% of
// the face's ambient type is ordinary-size text answering to 4.5:1):
//
//   #a78fcd   7.45:1   ← comfortably over, dimmer than the gold but not close
//
// It stays BOLD while there is picking left to do; `.told` below stands it
// down to normal weight once the answer has landed, unchanged.
.nf-ask {
  font-size: 82%;
  color: $face-pick;
  font-weight: bold;
}

// ── FT-1113: THE HIERARCHY INVERTS ONCE THE ANSWER LANDS ─────────────────
//
// Reading order and visual order stop agreeing here, on purpose. The role,
// the ability line and the instruction come FIRST because that is the order
// a player needs them in — who am I, what do I do, do it — and each one is
// spent the moment it has been read. The answer comes LAST in the markup and
// is the entire point of the turn, so once it exists the three lines above it
// stand back and let it be the loudest thing on the dial.
//
// The character's NAME does not dim: it is the only line that says whose
// answer this is, and an unlabelled "Yes" glowing on a clock face is a riddle.
// The two that do dim are both instructions, and an instruction that has
// already been followed is the cheapest ink on the face.
.nc.face.told {
  .nf-line {
    opacity: 0.55;
  }
  .nf-ask {
    opacity: 0.6;
    font-weight: normal;
  }
}

.nf-chosen {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  margin-top: 1px;
}

// a picked seat's NAME.
//
// IT USED TO BE GOLD, dressed as the coin's own lit ring is (Player.vue's
// `.night-picked`) so the chip and the lit coin read as the same act. FT-1113
// (user: "keep the name chips. make them blue though") takes the blue, and
// the pairing with the coin is what it costs — written down rather than left
// to be rediscovered as a bug. What it buys is separation: the instruction
// above these is gold, the answer below them is green or red, and a third
// gold thing between two loud ones was the one row on the face with no colour
// of its own.
//
// THE BLUE WAS `$townsfolk` (#1f65ff, src/vars.scss) — the fork's only blue,
// and one already on this panel: TownInfo's own townsfolk count and glyph
// wear it, four lines under where these chips now stand.
//
// ── FT-1272 (user): AND THE BLUE HAD TO GO, FOR A REASON FT-1113 COULD ──
//    NOT HAVE SEEN COMING.
//
// $townsfolk is a TEAM colour, and as of this same pass the header directly
// above these chips is painted in the character's own team colour. A townsfolk
// blue on the chips under a blue name would have read as "these seats are
// townsfolk" — which is the one thing a night pick must never say. It is the
// exact leak the seat pickers were scrubbed of in FT-1150: a control that
// composes what somebody is TOLD may not render what anybody IS.
//
// So the chips take the pick ink instead. That also restores the pairing
// FT-1113 knowingly spent: the cog lights purple when it is picked (Player's
// `.night-pick`), and now the chip naming that cog is the same colour — chip
// and lit cog read as one act again, and this time without a team's hue
// anywhere near a seat.
//
// The NAME stays white rather than taking the purple as ink, unchanged from
// FT-1113's reasoning: a seat's name at 78% type is the one thing on this row
// that has to be READ rather than recognised, so the ring and the wash carry
// the colour and the letters stay at full contrast.
.nf-chip {
  font-size: 78%;
  padding: 0 7px;
  border-radius: 9px;
  background: rgba($face-pick, 0.28);
  border: 1px solid rgba($face-pick, 0.95);
  color: #fff;
}

// ── FT-1113: THE ANSWER IS THE LOUDEST THING ON THE FACE ─────────────────
//
// It was 90%-ish bold text in a small dark pill under the chips, and it is
// the whole reason the player was asked anything: the Fortune Teller's "Yes",
// the Empath's number, the character an Undertaker was shown. It is now the
// biggest and brightest element in the composition — bigger than the role
// name (118%), which was the previous top of the type scale.
//
// PIRATESBAY, because this app's display face is what it already reaches for
// when an element is meant to be READ FROM ACROSS THE TABLE (the role name
// right above it, the Start and End-night buttons, the winner banner). A
// 230% Roboto Condensed is merely large; the display face is the app saying
// "this one".
//
// THE COLOUR LANGUAGE IS UNTOUCHED — #7ed67e for yes and #ff8a8a for no are
// the exact hexes the band form has carried since FT-1005, and they stay to
// the byte. What is added is a HALO in each answer's own colour, which is how
// everything else on this dial (the count glyphs, the team digits) says
// "bright" against hand-painted art that varies underneath.
.nf-told {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  gap: 4px 8px;
  margin-top: 4px;

  // restated rather than inherited: the band's `.nd-told` is nested inside
  // `.nd-row`, which the face form does not have
  .nd-told {
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
    font-size: 230%;
    line-height: 1.1;
    padding: 0 12px;
    border-radius: 10px;
    font-weight: bold;
    color: #fff;
    background: rgba(0, 0, 0, 0.42);
    text-shadow:
      0 0 5px black,
      0 0 12px black;
    &.yes {
      color: #7ed67e;
      text-shadow:
        0 0 5px black,
        0 0 14px rgba(126, 214, 126, 0.75);
    }
    &.no {
      color: #ff8a8a;
      text-shadow:
        0 0 5px black,
        0 0 14px rgba(255, 138, 138, 0.75);
    }
    // THE ONE ANSWER THAT DOES NOT GROW. A character's own free words are a
    // sentence, not a token — set at 230% display type it wraps to three
    // lines and pushes itself off the dial. It keeps the old pill, one step
    // up in size, and the loudness rule is answered by the fact that nothing
    // else on the face is a sentence either.
    &.words {
      font-family: inherit;
      letter-spacing: normal;
      font-size: 95%;
      font-weight: normal;
      font-style: italic;
      padding: 0 10px;
      text-shadow:
        0 0 4px black,
        0 0 10px black;
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
