<template>
  <div id="vote">
    <!-- FT-1075: `vo-live` marks the hands for exactly as long as the sweep
         runs — it is the class the gate block's z-order reads to decide who
         stands in front, the hands (sweeping) or the card (standing). -->
    <div class="arrows" :class="{ 'vo-live': isDocked }">
      <span class="nominee" :style="nomineeStyle"></span>
      <span class="nominator" :style="nominatorStyle"></span>
    </div>
    <!-- Golem fork (FT-976): THE NOMINATION OVERLAY, in the app's own chrome.
         Three things were wrong with the old one, and only one of them was
         cosmetic.

         1. THE FINISH CONTROL LIED. It read "Close" in `demon` red, and in
            this fork red means LIT — `control-lit`, a control that is ON. So
            the one button that COMMITS the nomination to the vote log was
            dressed as the one that throws it away. See `finishLabel` below:
            it now says which of the two things it is about to do, because it
            genuinely does both depending on state.
         2. THE COUNT WAS THE HARDEST THING ON SCREEN TO READ. White and
            saturated blue type sat straight on the painted rose window at
            1.14:1 measured contrast — a mid-tone ochre behind a mid-luminance
            blue. The black text-shadow it wore does nothing against a ground
            that is already dark-ish. It now has a ground of its own and is
            the headline it always should have been.
         3. FOUR CONTROLS WERE TWO. "Mark for execution" + "Clear mark" is one
            piece of state, and so is Hand DOWN / Hand UP. This app already
            has the shapes for both — `control-toggle` and the
            plate+`control-cell` segment — and `NumberScrub` for the timing.

         THE GROUND, IN TWO REGISTERS (FT-1024, user call — superseding
         FT-976's "a scrim, not the face disc"): on desktop the overlay now
         STANDS ON THE FACE DISC, the same plate the night checklist and the
         host panel wear (src/faceDisc.scss — geometry, gate, material).
         Below the gate — every phone, every small window — the scrim below
         remains the ground exactly as FT-976 built it: the plate's own
         ground colour taken to near-opaque at the centre and faded to
         nothing at the rim, an edgeless ground for a circle's middle. The
         disc is a desktop dress; the re-grounding moves NO control.

         FT-1074 — THE CARD LEARNS ITS PLACE. Two passes in one:
         (a) HIERARCHY. The nomination line is small at the top, the tally is
             the hero with "majority N" as its quiet subline, and the buttons
             wear three distinct weights: ONE primary Start (the old
             "Countdown" and "Start" pair folded — see countdown() below),
             the execution mark with its noose, and a small quiet Cancel.
             "Time per player" collapsed from a labeled row to a tiny scrub
             sitting beside the primary button.
         (b) THE DOCK. Once the vote runs — the hands sweeping — the card
             SHRINKS AND SLIDES to the bottom of the circle as a compact
             strip (tally + the controls legal mid-vote), so the hands sweep
             over an open face with no text under the pivot. Transform and
             opacity only, `mode="out-in"`: the card shrinks away downward,
             the strip rises into its dock. When the sweep ends (or Reset is
             pressed) the same motion runs in reverse. -->
    <audio src="../assets/sounds/countdown.mp3" preload="auto"></audio>
    <transition name="vo-dock" mode="out-in">
      <div class="overlay" v-if="!isDocked" key="card">
        <p class="vo-nomination">
          <em class="blue">{{ nominator.name }}</em> nominated
          <em>{{ nominee.name }}</em>
        </p>

        <!-- THE HEADLINE. The running count against the majority is the live
             state of the nomination and the thing the whole room is watching,
             so it is the biggest thing here rather than one more line of body
             text. `is-majority` lights it with `control-lit`'s own colours the
             moment the count reaches the bar — the same "this is ON" language
             every other lit control in the app speaks. -->
        <div class="vo-tally" :class="{ 'is-majority': hasMajority }">
          <div class="vo-count" data-tally>
            <span class="vo-now">{{ voters.length }}</span>
            <span class="vo-slash">/</span>
            <span class="vo-need">{{ majority }}</span>
          </div>
          <div class="vo-caption">majority {{ majority }}</div>
        </div>

        <template v-if="!session.isSpectator">
          <div class="vo-controls vo-start-row">
            <!-- Primary while starting is the decisive act; once a completed
                 sweep is waiting to be recorded, "Record vote" below takes
                 the emphasis and this demotes to a plain plate — never two
                 primaries on one card. -->
            <button
              class="vo-btn vo-start"
              :class="{ 'is-primary': !willRecord }"
              @click="countdown"
            >
              {{ session.lockedVote ? "Restart the vote" : "Start the vote" }}
            </button>
            <!-- The app's own number control, the one the seat count and the
                 night sheet's numbers already use — same gesture (drag
                 sideways, or click to type). It hands back WHOLE SECONDS and
                 `setVotingSeconds` turns that into the delta the original
                 stepper fed `setVotingSpeed`, so the store keeps its
                 milliseconds and the sweep reads exactly what it always did. -->
            <span
              class="vo-timing"
              v-if="session.lockedVote < 1"
              title="Time per player — seconds each seat gets before the sweep moves on"
            >
              <NumberScrub
                class="vo-scrub"
                :value="votingSeconds"
                :min="1"
                :max="30"
                aria-label="Time per player, in seconds"
                title="Time per player, in seconds — drag sideways to scrub, click to type"
                @input="setVotingSeconds"
              />
              <span class="vo-unit">s</span>
            </span>
          </div>

          <!-- ONE control for one piece of state. `control-toggle` is this
               app's shape for a control that HOLDS a position (the build
               panel's Duplicates wears it) — hollow and full-contrast when
               off, lit when on, sunken in both so the shape alone says
               "toggle" before the colour does. The noose is the seat
               grammar's own mark for "to be executed" (ui-noose.png).

               FT-1083 (user: there is no way to call an execution off). The
               undo was ALREADY here — a second press of this toggle runs
               `removeMarked` — and that is exactly the complaint: it was
               invisible. A toggle tells you what it HOLDS; it does not tell
               you what pressing it DOES, and "call off the hanging" is not a
               thing a storyteller should have to discover.

               So the label follows the state, the way `finishLabel` above
               already does on this same card and for the same reason: the
               control says which of two genuinely different things the next
               press performs. Marked, it reads "Cancel execution" and its
               noose is struck through; unmarked, "Mark for execution" and the
               noose is whole. Still ONE control — FT-976 folded the original
               "Mark" / "Clear mark" pair into this toggle precisely because
               two buttons for one boolean left the dead one looking broken,
               and a second "cancel" button sitting greyed out whenever nobody
               is marked would rebuild that mistake. `aria-pressed` continues
               to carry the held position for a screen reader. -->
          <div class="vo-controls" v-if="!isExile">
            <button
              class="vo-btn vo-mark"
              :class="{ on: isMarked }"
              :aria-pressed="String(isMarked)"
              :title="markTitle"
              @click="toggleMarked"
            >
              <span
                class="vo-noose"
                :class="{ 'is-struck': isMarked }"
                aria-hidden="true"
              ></span>
              {{ markLabel }}
            </button>
          </div>

          <div class="vo-controls">
            <button
              class="vo-btn vo-finish"
              :class="{ 'is-primary': willRecord }"
              :title="finishTitle"
              @click="finish"
            >
              {{ finishLabel }}
            </button>
          </div>
        </template>

        <template v-else-if="canVote">
          <div class="vo-row">
            <span class="vo-label"
              >{{ session.votingSpeed / 1000 }} seconds between votes</span
            >
          </div>
          <!-- My own hand is ONE piece of state with two positions, so it is one
               segmented control — the plate on the group, `control-cell` on the
               cells, lit on the one that is true — exactly the night-mode
               switch's shape. Two separate pills, one of them greyed, made the
               greyed one look broken rather than unselected. -->
          <div class="vo-hands" role="group" aria-label="Your vote">
            <button
              class="vo-hand"
              :class="{ on: !currentVote }"
              :aria-pressed="String(!currentVote)"
              @click="vote(false)"
            >
              Hand DOWN
            </button>
            <button
              class="vo-hand"
              :class="{ on: !!currentVote }"
              :aria-pressed="String(!!currentVote)"
              @click="vote(true)"
            >
              Hand UP
            </button>
          </div>
        </template>

        <p class="vo-hint" v-else-if="!player">
          Please claim a seat to vote.
        </p>
      </div>

      <!-- THE DOCKED STRIP (FT-1074) — the card's mid-vote form. Tally big,
           plus only what is legal while the hands sweep: Pause/Resume and
           Reset for the storyteller, my own hand for a seated player. It
           stands on a plain control plate rather than the disc or the scrim —
           a strip at the rim wants an edge, not a halo. -->
      <div class="overlay vo-docked" v-else key="strip">
        <div class="vo-tally" :class="{ 'is-majority': hasMajority }">
          <div class="vo-count" data-tally>
            <span class="vo-now">{{ voters.length }}</span>
            <span class="vo-slash">/</span>
            <span class="vo-need">{{ majority }}</span>
          </div>
        </div>
        <template v-if="!session.isSpectator">
          <button
            class="vo-btn"
            :class="{ disabled: !session.lockedVote }"
            @click="pause"
          >
            {{ voteTimer ? "Pause" : "Resume" }}
          </button>
          <button class="vo-btn" @click="stop">Reset</button>
        </template>
        <div
          class="vo-hands"
          role="group"
          aria-label="Your vote"
          v-else-if="canVote"
        >
          <button
            class="vo-hand"
            :class="{ on: !currentVote }"
            :aria-pressed="String(!currentVote)"
            @click="vote(false)"
          >
            Hand DOWN
          </button>
          <button
            class="vo-hand"
            :class="{ on: !!currentVote }"
            :aria-pressed="String(!!currentVote)"
            @click="vote(true)"
          >
            Hand UP
          </button>
        </div>
      </div>
    </transition>
    <!-- THE COUNTDOWN, IN THE TOWER'S OWN NUMERALS (FT-1083, user call).
         Upstream counted in big saturated blue-then-red arabic digits that
         belonged to no other surface in this fork, and drew them BEHIND the
         clock hands. Both are answered here.

         THE NUMERALS. Three beats, three roman numerals — III, II, I — in
         the dial's own lettering: Times bold with FaceHands' `.tw-numeral`
         dressing (the FT-1064 bake, still reading its `--ng-*` dials so the
         ring and the countdown can never drift apart). They are NOT the
         ring's ink, though: the twelve numerals are near-black paint on the
         face and these are lit ember-gold, because the eye has to tell "this
         is the countdown" from "this is the clock" instantly, at a glance,
         with both on screen at once. Separation is by DARK, per FT-1031's
         finding — a warm glyph on a warm lit face needs a black halo, not a
         pale one; the ember breath is the last layer, wide and faint.

         GO KEEPS ITS BEAT and its heat — same material, the blood ink this
         app already spends on the decisive act, and the only beat that grows
         on the way out rather than settling.

         THE ORDER — the user's explicit ask, "the numbers should be above
         the hands". `.countdown` takes `z-index: 3`, which clears BOTH the
         overlay's 1 and `.arrows.vo-live`'s 2 (the FT-1075 gate rule below).
         It disturbs nothing that rule governs: the countdown exists for
         exactly the three seconds `isVoteInProgress && !lockedVote` is true —
         after Start, before the first hand locks — the card is already docked
         at the rim by then, and this layer takes no clicks. -->
    <transition name="blur">
      <div
        class="countdown"
        v-if="session.isVoteInProgress && !session.lockedVote"
      >
        <span class="vo-beat">III</span>
        <span class="vo-beat">II</span>
        <span class="vo-beat">I</span>
        <span class="vo-beat vo-beat-go">GO</span>
        <audio
          :autoplay="!grimoire.isMuted"
          src="../assets/sounds/countdown.mp3"
          :muted="grimoire.isMuted"
        ></audio>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import NumberScrub from "./NumberScrub";

export default {
  components: { NumberScrub },
  computed: {
    ...mapState("players", ["players"]),
    ...mapState(["session", "grimoire"]),
    ...mapGetters({ alive: "players/alive" }),
    /** A traveler is EXILED, not executed — no execution mark, and the
     *  majority is counted off the whole table rather than the living. Both
     *  rules were already here, inline and stated twice; this names them
     *  once. */
    isExile: function() {
      return this.nominee.role.team === "traveler";
    },
    /** FT-1074: the card docks — shrinks to the strip at the bottom of the
     *  circle — for exactly as long as the sweep runs. `setVoteInProgress`
     *  is flipped on by countdown()/start() and off by stop(), by the sweep
     *  completing, and (for everyone) by the relay's own sync, so the strip
     *  returns to the full card the moment the hands stand still. */
    isDocked: function () {
      return this.session.isVoteInProgress;
    },
    /** The bar this nomination has to clear. Same arithmetic the vote log
     *  itself uses when it records the result (session/addHistory), so the
     *  number on screen and the number in the history can never disagree. */
    majority: function() {
      return Math.ceil((this.isExile ? this.players.length : this.alive) / 2);
    },
    hasMajority: function() {
      return this.voters.length >= this.majority;
    },
    /**
     * WHAT THE FINISH CONTROL IS ABOUT TO DO — and it is genuinely two
     * different things, which is why the old single word for it was unsafe in
     * both directions.
     *
     * `finish()` always clears the nomination, but the history entry is
     * written by `session/addHistory`, which returns early unless the sweep
     * ran all the way round:
     *
     *     if (!state.nomination || state.lockedVote <= players.length) return;
     *
     * So on a COMPLETED vote the control records the result; on an unstarted
     * or half-swept one it silently discards the nomination and records
     * nothing. "Close" could be read either way, and was wrong either way —
     * a storyteller expecting a discard got a permanent log entry, and one
     * expecting a record got nothing. The label follows the state instead.
     */
    willRecord: function() {
      return this.session.lockedVote > this.players.length;
    },
    finishLabel: function() {
      return this.willRecord ? "Record vote" : "Cancel nomination";
    },
    finishTitle: function() {
      return this.willRecord
        ? "Write this result to the vote history and end the nomination"
        : "End the nomination without recording it — the vote did not finish";
    },
    isMarked: function() {
      return this.session.markedPlayer === this.session.nomination[1];
    },
    /** FT-1083: what the next press of the mark toggle will DO — the same
     *  label-follows-state rule `finishLabel` above states at length, applied
     *  to the other control on this card that performs two different acts
     *  from one button. */
    markLabel: function () {
      return this.isMarked ? "Cancel execution" : "Mark for execution";
    },
    markTitle: function () {
      return this.isMarked
        ? "Call it off — clear this seat's execution mark"
        : "Mark this seat to be executed at the end of the day";
    },
    /** The scrub's unit is whole seconds; the store's is milliseconds and
     *  stays that way (the sweep's own setInterval reads it directly). A
     *  value inherited from elsewhere that is not a whole second still shows
     *  itself truthfully here rather than being rounded behind the
     *  storyteller's back. */
    votingSeconds: function() {
      return this.session.votingSpeed / 1000;
    },
    nominator: function() {
      return this.players[this.session.nomination[0]];
    },
    /**
     * OFF BY ONE SEAT until 2026-08-20 (user report, with the right diagnosis:
     * "possibly because we moved the 1 position to be where it is on a clock
     * instead of at the 12 position").
     *
     * The ring puts seat `i` at `((i + 1) * 360) / count` — see TownSquare's
     * own placement — so seat 0 sits ONE STEP PAST twelve o'clock, the way a
     * clock's 1 does. These arrows were computing `(i / count) * 360`, which
     * is the same ring MINUS that step, so every arrow pointed at the seat
     * before its target. It was invisible while both were wrong together and
     * became visible the moment anyone checked one against a real seat.
     *
     * `+ 1` here rather than a shared helper: the ring's own placement is CSS
     * in the on-circle mixin and this is an inline transform, so there is no
     * single expression the two could share without inventing one. The two
     * sites are named in each other's comments instead.
     */
    nominatorStyle: function() {
      const players = this.players.length;
      const nomination = this.session.nomination[0];
      return {
        transform: `rotate(${Math.round(((nomination + 1) / players) * 360)}deg)`,
        transitionDuration: this.session.votingSpeed - 100 + "ms"
      };
    },
    nominee: function() {
      return this.players[this.session.nomination[1]];
    },
    nomineeStyle: function() {
      const players = this.players.length;
      const nomination = this.session.nomination[1];
      const lock = this.session.lockedVote;
      // `+ 1` for the ring's own offset (see nominatorStyle above); `lock` is
      // how far the vote has swept past the nominee, and is unrelated.
      const rotation =
        (360 * (nomination + 1 + Math.min(lock, players))) / players;
      return {
        transform: `rotate(${Math.round(rotation)}deg)`,
        transitionDuration: this.session.votingSpeed - 100 + "ms"
      };
    },
    player: function() {
      return this.players.find(p => p.id === this.session.playerId);
    },
    currentVote: function() {
      const index = this.players.findIndex(p => p.id === this.session.playerId);
      return index >= 0 ? !!this.session.votes[index] : undefined;
    },
    canVote: function() {
      if (!this.player) return false;
      if (this.player.isVoteless && this.nominee.role.team !== "traveler")
        return false;
      const session = this.session;
      const players = this.players.length;
      const index = this.players.indexOf(this.player);
      const indexAdjusted =
        (index - 1 + players - session.nomination[1]) % players;
      return indexAdjusted >= session.lockedVote - 1;
    },
    voters: function() {
      const nomination = this.session.nomination[1];
      const voters = Array(this.players.length)
        .fill("")
        .map((x, index) =>
          this.session.votes[index] ? this.players[index].name : ""
        );
      const reorder = [
        ...voters.slice(nomination + 1),
        ...voters.slice(0, nomination + 1)
      ];
      return (this.session.lockedVote
        ? reorder.slice(0, this.session.lockedVote - 1)
        : reorder
      ).filter(n => !!n);
    }
  },
  data() {
    return {
      voteTimer: null
    };
  },
  methods: {
    /** THE ONE START (FT-1074). The card used to carry two pre-vote buttons —
     *  "Countdown" (this method: 3-2-1-GO, then the sweep) and "Start" (the
     *  sweep immediately, no countdown). One primary control starts a vote
     *  now, and it is THIS flow, because the countdown is the version the
     *  room can follow — every player gets the same three seconds of warning
     *  before the first hand locks. start() below is unchanged and is now
     *  reached only as this countdown's own completion. */
    countdown() {
      this.$store.commit("session/lockVote", 0);
      this.$store.commit("session/setVoteInProgress", true);
      this.voteTimer = setInterval(() => {
        this.start();
      }, 4000);
    },
    start() {
      this.$store.commit("session/lockVote", 1);
      this.$store.commit("session/setVoteInProgress", true);
      clearInterval(this.voteTimer);
      this.voteTimer = setInterval(() => {
        this.$store.commit("session/lockVote");
        if (this.session.lockedVote > this.players.length) {
          clearInterval(this.voteTimer);
          this.$store.commit("session/setVoteInProgress", false);
        }
      }, this.session.votingSpeed);
    },
    pause() {
      if (this.voteTimer) {
        clearInterval(this.voteTimer);
        this.voteTimer = null;
      } else {
        this.voteTimer = setInterval(() => {
          this.$store.commit("session/lockVote");
          if (this.session.lockedVote > this.players.length) {
            clearInterval(this.voteTimer);
            this.$store.commit("session/setVoteInProgress", false);
          }
        }, this.session.votingSpeed);
      }
    },
    stop() {
      clearInterval(this.voteTimer);
      this.voteTimer = null;
      this.$store.commit("session/setVoteInProgress", false);
      this.$store.commit("session/lockVote", 0);
    },
    finish() {
      clearInterval(this.voteTimer);
      this.$store.commit("session/addHistory", this.players);
      this.$store.commit("session/nomination");
    },
    vote(vote) {
      if (!this.canVote) return false;
      const index = this.players.findIndex(p => p.id === this.session.playerId);
      if (index >= 0 && !!this.session.votes[index] !== vote) {
        this.$store.commit("session/voteSync", [index, vote]);
      }
    },
    setVotingSpeed(diff) {
      const speed = Math.round(this.session.votingSpeed + diff);
      if (speed > 0) {
        this.$store.commit("session/setVotingSpeed", speed);
      }
    },
    /** The scrub hands back whole seconds; this turns that into the DELTA the
     *  original +/- stepper fed `setVotingSpeed`, so the store still receives
     *  milliseconds through the identical `speed > 0` guard rather than a
     *  second, parallel bounds check that could drift from it. */
    setVotingSeconds(seconds) {
      this.setVotingSpeed(seconds * 1000 - this.session.votingSpeed);
    },
    setMarked() {
      this.$store.commit("session/setMarkedPlayer", this.session.nomination[1]);
    },
    removeMarked() {
      this.$store.commit("session/setMarkedPlayer", -1);
    },
    /** One control, one piece of state — it calls the same two mutations the
     *  two buttons called, so nothing downstream can tell the difference. */
    toggleMarked() {
      if (this.isMarked) {
        this.removeMarked();
      } else {
        this.setMarked();
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "../vars.scss";
@import "../controls.scss";
@import "../faceDisc.scss";

#vote {
  position: absolute;
  width: 20%;
  z-index: 20;
  // FT-1074: how far below the ring's centre the docked strip sits. #vote is
  // flex-centred on #app with no insets, so its box centre IS the viewport
  // centre (the disc-frame comment below walks through why); 50vh is then the
  // circle's southern rim and the em term backs the strip off it far enough
  // to clear the bottom seats' tokens. Read by the strip's own transform AND
  // by both dock transitions, so the three always agree on where "docked" is.
  --vo-dock-y: calc(50vh - 8.5em);
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;
  background: url("../assets/demon-head.png") center center no-repeat;
  background-size: auto 75%;
  text-align: center;

  &:after {
    content: " ";
    padding-bottom: 100%;
    display: block;
  }

  em {
    color: $demon;
    font-style: normal;
    font-weight: bold;
    &.blue {
      color: $townsfolk;
    }
  }

  // ── NO LONGER REACHED, AND LEFT IN PLACE ──────────────────────────────────
  // Both of these styled markup this component no longer renders, and neither
  // is deleted here: the two rules below are the last description anyone wrote
  // of how those controls were meant to size, and they cost nothing sitting
  // here inert. Whoever removes them should do it deliberately.
  //
  //   `.mark .button` sized the "Mark for execution" / "Clear mark" PAIR. That
  //   pair is now the single `.vo-mark` toggle.
  //
  //   `svg` styled the font-awesome minus-circle/plus-circle that stepped the
  //   voting speed, including the coarse-pointer padding that stopped them
  //   drawing at 10x10px on a phone. That stepper is now NumberScrub, whose
  //   own touch target comes with it.
  .mark .button {
    font-size: 75%;
    margin: 0;
  }

  svg {
    cursor: pointer;
    &:hover path {
      fill: url(#demon);
      stroke-width: 30px;
      stroke: white;
    }
    @media (pointer: coarse) {
      box-sizing: content-box;
      padding: 13px;
      margin: -11px -4px;
    }
  }
}

// ── THE OVERLAY, AND ITS GROUND ─────────────────────────────────────────────
// The scrim. A radial fade rather than a bordered box, for the reason in the
// template comment: this sits in the middle of a circle. It is the plate's own
// ground colour ($control-bg is rgba(0,0,0,.7)) pushed to near-opaque where
// the type actually is, then let go entirely by the rim, so there is no edge
// anywhere for the eye to catch on.
//
// THE SCRIM MUST OUTRANK THE CLOCK HANDS — BELOW THE GATE. `.arrows` are
// absolutely positioned siblings at z-index auto, and they run at 150% height
// — the tips point out at the nominator's and nominee's seats, which is the
// whole job, but the SHAFTS cross the middle of the overlay, and a scarlet
// hand drawn straight through the count is exactly as unreadable as the ochre
// was. So `.overlay` takes a stacking context of its own ABOVE them
// (`z-index: 1`), and the scrim's `z-index: -1` is then scoped inside that
// context: it paints under every glyph here but over both hands.
//
// ON THE DISC THE ORDER REVERSES — DURING THE SWEEP (FT-1024b, user call:
// "the nomination hands should be on top"; FT-1075, user call, scoping it:
// "the buttons are still behind the clock hands"). Under the gate the ground
// is the plate's glass, not the scrim, and a hand dimmed to a third of its
// brightness by the plate's brightness(0.34) stopped doing its one job —
// saying WHO, visibly. So inside the gate block below, `.arrows.vo-live`
// takes `z-index: 2` and rides above the plate and its type both — but ONLY
// while the vote runs (`vo-live` is bound to `isDocked`): a standing hand
// lying across the Start button serves nobody, so the pre-vote card outranks
// the hands in both registers. The hands are `pointer-events: none`, so
// nothing under them ever loses a click. Below the gate this paragraph's
// original order stands untouched at all times.
.overlay {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45em;
  padding: 1em 1.6em 1.15em;
  // wide enough that the nomination line and the widest control do not force
  // the scrim into a letterbox; the ring is 20% of the viewport and the
  // overlay has always been allowed to overhang it.
  width: 15em;

  &:before {
    content: "";
    position: absolute;
    // A CONSTANT halo, not a proportional one. As a percentage this shrank
    // with the box, and a player's overlay is barely half the height of the
    // storyteller's — the fade reached the type before it reached zero.
    inset: -1.7em -2.6em;
    z-index: -1;
    background: radial-gradient(
      ellipse at 50% 50%,
      rgba(0, 0, 0, 0.94) 0%,
      rgba(0, 0, 0, 0.92) 40%,
      rgba(0, 0, 0, 0.82) 60%,
      rgba(0, 0, 0, 0.5) 78%,
      rgba(0, 0, 0, 0) 100%
    );
    pointer-events: none;
  }
}

// ── THE DISC (FT-1024, user call — reversing FT-976's "not the face disc") ──
// On desktop the overlay stands ON the plate the night checklist and the host
// panel wear: same geometry, same gate, same material, all of it from
// src/faceDisc.scss. Below the gate nothing in this block applies and the
// scrim above is the ground, untouched — the disc is a desktop dress.
//
// WHY THE FRAME'S PERCENTAGES ARE HONEST FROM INSIDE #vote — because they are
// not resolved against #app here, and it matters. face-disc-frame positions
// with `--face-cx` = calc(50% + 7px + …), and that 50% resolves against the
// overlay's CONTAINING BLOCK, which is #vote (`position: absolute` above),
// not #app the way it is for NightSheet and HostTools. It still lands to the
// pixel, and not by luck: #vote is an absolutely-positioned flex child of
// #app with no insets, so its static position CENTRES its box on #app's
// centre in both axes — 50% of #vote's box IS #app's 50% — and every other
// term in the frame's expressions (the +7px, the geometry map's offsets, the
// lab's adjusts) is an absolute length, indifferent to the base. If #vote
// ever takes an inset or leaves #app's flex centring, this equality breaks
// and the disc drifts off the dial; the sweep rig for this lane
// (claude_temp_test/2026-08-21-ft1024-*) is what would catch it.
//
// THE SCRIM STANDS DOWN INSIDE THE GATE without a single property of its own
// being touched: face-disc-plate's ground layer redeclares every property the
// scrim's ::before sets (content, position, inset, z-index, background,
// pointer-events), and this block compiles after the base rule, so the
// plate's declarations win here and only here.
@include face-disc-gate {
  // FT-1074: `:not(.vo-docked)` — the disc is the FULL card's dress only. The
  // docked strip keeps its own plain plate in both registers; a face disc
  // shrunk to a strip at the rim would be neither a disc nor a strip.
  .overlay:not(.vo-docked) {
    @include face-disc-frame;
    // The frame is already a centring flex column; this overlay's furniture
    // is a compact cluster, not a header/band/foot spread, so it gathers at
    // the plate's centre instead of being distributed into the caps — every
    // control keeps its order and its logic. Re-grounding, not redesign.
    justify-content: center;

    // The card's dock travel, restated ON TOP of the frame's own centring
    // translate — the frame positions with `transform: translate(-50%,-50%)`,
    // and a transition class that replaced it would teleport the card to the
    // box's corner before animating. Same destination as the base rule below,
    // same var, one extra leading term.
    &.vo-dock-enter,
    &.vo-dock-enter-from,
    &.vo-dock-leave-to {
      opacity: 0;
      transform: translate(-50%, -50%) translateY(calc(var(--vo-dock-y) * 0.55))
        scale(0.6);
    }
  }

  // FT-1024b (user call): the pointer hands ride ABOVE the glass. The plate's
  // brightness(0.34) took the hands down to a third of their paint, and a
  // pointer that has to be looked for is not pointing. z-index 2 clears the
  // overlay's own 1, so the hands paint over the plate AND its type — ruled,
  // not drifted into; the full stacking story (and why the order is the
  // opposite below the gate) is the scrim block's own comment above.
  //
  // FT-1075 (user call: "the buttons are still behind the clock hands")
  // SCOPES that ruling to the sweep. `.vo-live` is bound to `isDocked` — true
  // for exactly as long as the vote runs. While the hands SWEEP, FT-1024b
  // stands whole: the card is the docked strip at the rim, the face is open,
  // and a hand saying WHO votes now must not be dimmed by anything. While the
  // hands STAND — the full card up, Start not yet pressed — they are only
  // marking two seats, their tips do that job outside the plate's footprint,
  // and a shaft lying across the Start button was costing a click's clarity
  // to decorate a control. So at rest the selector no longer matches, the
  // hands fall back to z-index auto, and the overlay's own 1 (the base-rule
  // order below the gate, unchanged since FT-976) puts the card in front.
  .arrows.vo-live {
    z-index: 2;
  }
}

// WHO NOMINATED WHOM — secondary now. It was the same weight as the count.
.vo-nomination {
  margin: 0;
  font-size: 0.62em;
  line-height: 1.35;
  color: #e7dfcd;
  // the names keep their team colours, which are mid-luminance hues that were
  // unreadable on ochre and are fine on the scrim
  text-shadow: 0 1px 2px #000;
}

// ── THE HEADLINE ────────────────────────────────────────────────────────────
.vo-tally {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;

  .vo-count {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.1em;
    font-weight: bold;
  }
  // FT-1074: the tally is the HERO now — the count grew half again and the
  // shouting "VOTES IN FAVOR · MAJORITY IS 5" caption retired into the quiet
  // "majority 5" subline the template renders.
  .vo-now {
    font-size: 3.1em;
    color: #f7f0e1;
  }
  .vo-slash {
    font-size: 1.5em;
    color: rgba(216, 205, 180, 0.45);
  }
  .vo-need {
    font-size: 1.7em;
    color: #d8cdb4;
  }
  .vo-caption {
    margin-top: 0.3em;
    font-size: 0.5em;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #c8bda6;
  }

  // MAJORITY REACHED. `control-lit`'s own colours — the same blood this app
  // lights every chosen control with — so the moment the bar is cleared
  // speaks the language the rest of the UI already speaks.
  //
  // THE NUMBERS LIGHT; THE CAPTION DOES NOT. `$control-on-edge` is a mid
  // rose that measures about 4:1 on this scrim, under the 4.5:1 that type
  // this small wants, and the caption is a fixed label rather than a piece
  // of state — lighting it dimmed the one line that has to stay readable in
  // order to explain the one that just changed.
  &.is-majority {
    .vo-now {
      color: $control-on-color;
      text-shadow: 0 0 18px rgba(190, 90, 90, 0.55);
    }
    .vo-need {
      color: $control-on-edge;
    }
  }
}

// ── ROWS AND CONTROLS ───────────────────────────────────────────────────────
.vo-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
  font-size: 0.62em;
  color: #cfc4ad;
}
.vo-label {
  white-space: nowrap;
}
// NumberScrub's resting label is a bare bold digit in both presets; "seat" is
// the one that inherits its size, which is what an em-scaled overlay wants.
.vo-scrub {
  color: #f7f0e1;
  &:hover {
    color: #fff;
  }
}

// FT-1074: "Time per player 4 seconds" collapsed from its own labeled row to
// this — the scrub and a lowercase unit, sitting beside the primary button.
// The full name lives in the cluster's and the scrub's titles.
.vo-timing {
  display: inline-flex;
  align-items: baseline;
  font-size: 0.62em;
  color: #cfc4ad;
  .vo-unit {
    margin-left: 0.12em;
  }
}
// The scrub stays BESIDE the primary in both registers — on the narrow scrim
// card the default wrap dropped it underneath, which un-collapsed the row the
// pass had just collapsed. The pair overhangs the 15em column by a few px at
// worst, well inside the scrim's own halo.
.vo-controls.vo-start-row {
  flex-wrap: nowrap;
}

.vo-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4em;
  flex-wrap: wrap;
}

// A PLATED TEXT BUTTON — the ground, edge, radius and purple pointer
// acknowledgement every other control in this app wears (src/controls.scss).
// The pill with its radial gradients and its red hover was the last of the
// upstream chrome on this surface.
.vo-btn {
  @include control-plate;
  font-family: inherit;
  font-size: 0.6em;
  font-weight: bold;
  padding: 0.5em 1em;
  color: #d8cdb4;
  cursor: pointer;
  white-space: nowrap;
  transition: color 150ms, border-color 150ms, background 150ms;

  // FT-1083: `:not(.on)` — a LIT control keeps its lit dress under the
  // cursor. Measured while proving this lane: `.vo-btn:hover:not(.disabled)`
  // outranks `.vo-mark.on` on specificity, so pressing the execution mark
  // repainted it straight back to the plate it already wore — and since your
  // pointer is by definition still on the button you just pressed, the lit
  // state was invisible at the exact moment it was earned. That is half of
  // why the mark read as having no undo: it did not visibly read as having a
  // DO either. `.on` appears on no other `.vo-btn`, so nothing else moves.
  &:hover:not(.disabled):not(.on) {
    color: #fff;
    @include control-plate-hover;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
  &.disabled {
    @include control-disabled;
  }
  @media (pointer: coarse) {
    min-height: 40px;
    padding: 0.5em 1.1em;
  }
}

// The execution mark — one control holding one position, wearing the seat
// grammar's own noose (ui-noose.png, the same art the seat and the chronicle
// strip use for "to be executed").
// FT-1082b (user): the mark button WEARS ITS HOVER AT REST — the purple
// plate that used to appear only under the cursor is now its resting dress,
// so the decisive act reads as decisive before you reach for it.
.vo-mark {
  @include control-toggle;
  background: $control-bg-hover;
  border-color: $control-edge-hover;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 0.45em;

  // The lit control still answers the pointer — it just answers in its own
  // colour rather than reverting to the unlit plate: the same blood, one step
  // brighter. (`control-lit`'s ground and edge, lifted.)
  &.on:hover {
    background: rgba(178, 26, 26, 0.46);
    border-color: #d97e7e;
    color: #fff;
  }
}
.vo-noose {
  flex: none;
  position: relative;
  width: 1.6em;
  height: 1.6em;
  background: url("../assets/ui-noose.png") center center / contain no-repeat;
  filter: drop-shadow(0 1px 1px #000);

  // FT-1083: STRUCK THROUGH while a seat is marked — the mark's own art
  // cancelled, which is the universal reading of a bar drawn across a sign
  // and needs no legend. It is the lit control's own rose ($control-on-color,
  // what the button's type is wearing at that moment) over a black keyline,
  // so the bar reads on the noose's pale rope AND on the dark ground behind
  // it. Drawn on the icon, not the label: the word already changed.
  &.is-struck:after {
    content: "";
    position: absolute;
    left: -0.06em;
    right: -0.06em;
    top: 50%;
    height: 0.13em;
    transform: translateY(-50%) rotate(-32deg);
    border-radius: 0.07em;
    background: $control-on-color;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.8),
      0 0 4px rgba(0, 0, 0, 0.7);
  }
}

// THE PRIMARY WEIGHT (FT-1074: shared by "Start the vote" and "Record vote",
// never both at once — the template demotes Start while a completed sweep
// waits). Emphatic, and never blood, because blood is `control-lit` here and
// this control is not a thing that is switched on. The emphasis is the
// plate's own parchment ink promoted to the edge, so it is the brightest
// object on the surface without introducing a colour.
.vo-btn.is-primary {
  background: rgba(60, 50, 32, 0.88);
  border-color: rgba(216, 205, 180, 0.8);
  color: #fdf6e6;
  box-shadow: 0 0 14px rgba(216, 205, 180, 0.16);
  font-size: 0.68em;
  padding: 0.55em 1.3em;

  &:hover:not(.disabled) {
    background: rgba(84, 70, 43, 0.94);
    border-color: #efe3c6;
    color: #fff;
  }
}

// THE QUIET WEIGHT. "Cancel nomination" is the walk-away — small, dim, still
// a plated control (it keeps hover, focus and its title), just last in the
// room's attention. When the same button is about to WRITE the result it is
// `.is-primary` above and none of this applies.
.vo-finish:not(.is-primary) {
  font-size: 0.5em;
  color: #b3a88f;
  background: rgba(0, 0, 0, 0.35);
  border-color: rgba(216, 205, 180, 0.22);
}

// ── A PLAYER'S OWN HAND ─────────────────────────────────────────────────────
// One state, two positions: the plate on the group, cells inside it, lit on
// whichever is true. Same shape as the night-mode switch.
.vo-hands {
  @include control-plate;
  display: inline-flex;
  overflow: hidden;
}
.vo-hand {
  @include control-cell;
  font-size: 0.6em;
  font-weight: bold;
  padding: 0.5em 1.1em;
  white-space: nowrap;
  transition: color 150ms, background 150ms;

  &:hover:not(.on) {
    background: $control-bg-hover;
    color: #fff;
  }
  &.on {
    background: $control-on-bg;
    color: $control-on-color;
  }
  @media (pointer: coarse) {
    min-height: 40px;
  }
}

.vo-hint {
  margin: 0;
  font-size: 0.6em;
  color: #cfc4ad;
}

// ── THE DOCKED STRIP (FT-1074) ──────────────────────────────────────────────
// The card's mid-vote form: while the hands sweep, the face stays open and
// this compact strip sits at the bottom of the circle (--vo-dock-y, declared
// on #vote). It comes AFTER the .overlay base rule so its declarations win:
// the scrim's ::before stands down (`content: none`), the column becomes a
// row, and the ground is a plain control plate — the app's engraved-plate
// idiom at strip size, in both registers (the disc gate above never matches
// it: `:not(.vo-docked)`).
.vo-docked {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) translateY(var(--vo-dock-y));
  width: auto;
  flex-direction: row;
  gap: 0.7em;
  // FT-1082b (user): the docked strip is LOUDER — the purple plate the mark
  // button wears, a heavier ground and a lit edge, so a strip at the rim
  // still reads as the town's live tally.
  padding: 0.55em 1.1em;
  @include control-plate;
  background: $control-bg-hover;
  border-color: $control-edge-hover;
  box-shadow: 0 0 14px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(150, 130, 175, 0.35);

  &:before {
    content: none;
  }

  // Tally still first, still big — for the strip. One line, no subline.
  .vo-tally {
    flex-direction: row;
    align-items: baseline;
    gap: 0.12em;
    .vo-now {
      font-size: 1.7em;
    }
    .vo-slash {
      font-size: 1em;
    }
    .vo-need {
      font-size: 1.1em;
    }
  }
}

// ── THE DOCK TRANSITION ─────────────────────────────────────────────────────
// Transform and opacity only, `mode="out-in"`: the full card shrinks away
// DOWNWARD — toward the dock, so the two legs read as one journey — then the
// strip rises the last inch into place. The desktop card's leg is restated
// inside the disc gate above, where the frame's own centring translate has to
// stay in the chain.
.vo-dock-enter-active,
.vo-dock-leave-active {
  transition:
    transform 240ms ease,
    opacity 240ms ease;
}
.overlay:not(.vo-docked) {
  &.vo-dock-enter,
  &.vo-dock-enter-from,
  &.vo-dock-leave-to {
    opacity: 0;
    transform: translateY(calc(var(--vo-dock-y) * 0.55)) scale(0.6);
  }
}
.vo-docked {
  &.vo-dock-enter,
  &.vo-dock-enter-from,
  &.vo-dock-leave-to {
    opacity: 0;
    transform: translate(-50%, -50%) translateY(calc(var(--vo-dock-y) + 1.2em))
      scale(0.92);
  }
}
@media (prefers-reduced-motion: reduce) {
  .vo-dock-enter-active,
  .vo-dock-leave-active {
    transition: none;
  }
}

@keyframes arrow-cw {
  0% {
    opacity: 0;
    transform: rotate(-180deg);
  }
  100% {
    opacity: 1;
    transform: rotate(0deg);
  }
}

@keyframes arrow-ccw {
  0% {
    opacity: 0;
    transform: rotate(180deg);
  }
  100% {
    opacity: 1;
    transform: rotate(0deg);
  }
}

.arrows {
  position: absolute;
  display: flex;
  height: 150%;
  width: 25%;
  pointer-events: none;
  span {
    position: absolute;
    width: 100%;
    height: 100%;
    transition: transform 2.9s ease-in-out;
  }
  span:before {
    content: " ";
    width: 100%;
    height: 100%;
    display: block;
    background-size: auto 100%;
    background-repeat: no-repeat;
    background-position: center center;
    position: absolute;
    filter: drop-shadow(0px 0px 3px #000);
  }
  // FT-1075: the hands are OURS now — crafted SVGs in the fork's own painted
  // language (the manicule precedent), replacing upstream's filigree PNGs
  // (clock-small/clock-big, retired in place). Same canvas, same pivot row,
  // same reach — each file's header states the mounting contract — so the
  // sweep math above and every rule in this block are untouched: assets
  // swapped, geometry kept. Blue ($townsfolk) marks the nominator, red
  // ($demon) the nominee, the pair drawn to the tower's own gothic dial
  // silhouettes — spearhead, tapered pierced shaft, turned boss, spade tail.
  .nominator:before {
    background-image: url("../assets/vote-hand-nominator.svg");
    animation: arrow-ccw 1s ease-out;
  }
  .nominee:before {
    background-image: url("../assets/vote-hand-nominee.svg");
    animation: arrow-cw 1s ease-out;
  }
}

// ── THE UPSTREAM DIGIT ART — NO LONGER REACHED, AND LEFT IN PLACE ───────────
// FT-1083 retired these: the two keyframes below and the four `.countdown
// span` rules at the foot of this file dressed upstream's arabic 3-2-1-GO —
// 8em bold in the inherited body face, blurred in from 1.5x and colour-shifted
// to $townsfolk (or $demon for GO) at the 90% mark. The markup now renders
// `.vo-beat` spans and the `.countdown .vo-beat` block that follows overrides
// every property these set, so nothing here paints. Kept per the house
// never-delete rule; they are the last description of the look this replaced,
// and whoever removes them should do it deliberately.
@keyframes countdown {
  0% {
    transform: scale(1.5);
    opacity: 0;
    filter: blur(20px);
  }
  10% {
    opacity: 1;
  }
  50% {
    transform: scale(1);
    filter: blur(0);
  }
  90% {
    color: $townsfolk;
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes countdown-go {
  0% {
    transform: scale(1.5);
    opacity: 0;
    filter: blur(20px);
  }
  10% {
    opacity: 1;
  }
  50% {
    transform: scale(1);
    filter: blur(0);
  }
  90% {
    color: $demon;
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.countdown {
  display: flex;
  position: absolute;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  // FT-1083 (user: "the numbers should be above the hands"). The three
  // siblings under #vote paint in a ruled order, not a drifted one: the card
  // is 1, the sweeping hands are 2 (`.arrows.vo-live`, inside the face-disc
  // gate above — FT-1024b put them over the plate, FT-1075 scoped that to the
  // sweep), and the countdown is 3, over both, in both registers. It cannot
  // reach across FT-1075's ruling because it does not coexist with either
  // state it governs: `isVoteInProgress && !lockedVote` is true only for the
  // three seconds between Start and the first locked hand — the card has
  // already docked to the rim, the sweep has not begun — and this layer takes
  // no clicks (`pointer-events: none` above), so nothing beneath it ever
  // loses one.
  z-index: 3;
  audio {
    height: 0;
    width: 0;
    visibility: hidden;
  }
  span {
    position: absolute;
    font-size: 8em;
    font-weight: bold;
    opacity: 0;
  }
  span:nth-child(1) {
    animation: countdown 1100ms normal forwards;
  }
  span:nth-child(2) {
    animation: countdown 1100ms normal forwards 1000ms;
  }
  span:nth-child(3) {
    animation: countdown 1100ms normal forwards 2000ms;
  }
  span:nth-child(4) {
    animation: countdown-go 1100ms normal forwards 3000ms;
  }
}

// ── THE COUNTDOWN, IN OUR NUMERALS (FT-1083) ────────────────────────────────
// Written AFTER the block above so its declarations win — the same ordering
// the docked strip uses to stand down the card's scrim. `.countdown .vo-beat`
// is (0,2,0) against the retired `.countdown span`'s (0,1,1), and the
// per-beat `.vo-beat:nth-child(n)` is (0,3,0) against (0,2,1), so every
// property upstream set is overridden rather than merely added to.
//
// THE MATERIAL is FaceHands' `.tw-numeral`, quoted rather than re-invented:
// Times bold, sized in FACE-PIXELS (--fpx, published on #app) because this
// stands on the painted dial and has to hold its proportion of the face at
// every window size, and the same shadow stack — including the live `--ng-*`
// reads, so a turn of the numeral-glow lab moves the ring and the countdown
// together and they can never drift into two dressings.
//
// WHAT IS DELIBERATELY DIFFERENT IS THE INK. The twelve ring numerals are
// near-black paint (#0a0502); these are lit ember-gold. That is the whole
// point of the pass — with both on the face at once the eye must separate
// "this is the countdown" from "this is the clock" with no thought at all,
// and hue does that faster than size. The radii are scaled with the glyph
// (~3.5x the ring's 34fpx), since a 3-face-pixel breath that reads as a halo
// on a small numeral is invisible on a large one.
//
// AND IT SEPARATES WITH DARK. FT-1031's finding on the carved glyphs governs
// here too: a warm letter on a warm lit face wants a black halo, never a pale
// one, or it hazes into the paint. The dark drop and the tight black keyline
// do the cutting-out; the ember breath is last, wide and faint, and is glow
// rather than legibility.
$vo-beat-size: 118; // the beat's cap size in face-pixels — judged on the face
.countdown .vo-beat {
  position: absolute;
  font-family: "Times New Roman", Times, serif;
  font-weight: bold;
  font-size: calc(#{$vo-beat-size} * var(--fpx));
  line-height: 1;
  letter-spacing: calc(4 * var(--fpx));
  // letter-spacing adds a trailing gap after the LAST glyph, which widens the
  // box and so shifts "III" a couple of face-pixels left of the pivot; the
  // negative margin takes that gap back out of the box's own width.
  margin-right: calc(-4 * var(--fpx));
  color: #ffc25a;
  opacity: 0;
  // FaceHands' `.tw-numeral` stack, radii scaled to this glyph, then the
  // three layers this size actually needs. First shot of the pass wore the
  // ring's own radii and read FLAT on the lit centre of the face: a 5fpx dark
  // halo that cuts a 34fpx numeral out cleanly is invisible around a 118fpx
  // one. So the dark goes in three steps — a hard contour hugging the
  // letterform, a tight halo, then a mid-range wash that takes the ochre down
  // for a glyph's width all around — and only then the two ember layers,
  // which are heat, not legibility. Warm-on-warm always separates with dark.
  text-shadow:
    0 calc(3 * var(--fpx)) calc(3 * var(--fpx))
      rgba(255, 250, 235, calc(var(--ng-under, 16) / 100)),
    0 calc(-3 * var(--fpx)) calc(3 * var(--fpx))
      rgba(10, 5, 2, calc(var(--ng-top, 0) / 100)),
    0 calc(7 * var(--fpx)) calc(var(--ng-drop-blur, 1) * 4 * var(--fpx))
      rgba(0, 0, 0, calc(var(--ng-drop, 40) / 100)),
    0 0 calc(2 * var(--fpx)) rgba(8, 4, 1, 0.95),
    0 0 calc(5 * var(--fpx)) rgba(8, 4, 1, 0.9),
    0 0 calc(10 * var(--fpx)) rgba(20, 8, 2, 0.62),
    0 0 calc(28 * var(--fpx)) rgba(255, 170, 60, 0.72),
    0 0 calc(62 * var(--fpx)) rgba(255, 108, 16, 0.5);
}

// GO is the release, not a count: hot ember rather than the counts' gold, and
// the only beat that GROWS on the way out instead of settling. Ember, not the
// pale salmon the first shot produced — a light red on a lit ochre face reads
// as washed-out gold, which is the one thing this beat must not read as.
.countdown .vo-beat-go {
  color: #ff6a3c;
  text-shadow:
    0 calc(3 * var(--fpx)) calc(3 * var(--fpx))
      rgba(255, 236, 226, calc(var(--ng-under, 16) / 100)),
    0 calc(7 * var(--fpx)) calc(var(--ng-drop-blur, 1) * 4 * var(--fpx))
      rgba(0, 0, 0, calc(var(--ng-drop, 40) / 100)),
    0 0 calc(2 * var(--fpx)) rgba(8, 2, 1, 0.95),
    0 0 calc(5 * var(--fpx)) rgba(8, 2, 1, 0.9),
    0 0 calc(10 * var(--fpx)) rgba(22, 4, 2, 0.64),
    0 0 calc(30 * var(--fpx)) rgba(240, 70, 32, 0.72),
    0 0 calc(66 * var(--fpx)) rgba(190, 18, 8, 0.55);
}

// TRANSFORM AND OPACITY ONLY — no blur filter, no animated colour, the
// discipline the dock transition above already keeps. A beat lands slightly
// over its size and settles, holds, then lets go a hair smaller: the same
// shape as a struck bell.
@keyframes vo-beat {
  0% {
    opacity: 0;
    transform: scale(1.34);
  }
  14% {
    opacity: 1;
    transform: scale(1.04);
  }
  30% {
    transform: scale(1);
  }
  72% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.93);
  }
}

@keyframes vo-beat-go {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }
  16% {
    opacity: 1;
    transform: scale(1.08);
  }
  34% {
    transform: scale(1);
  }
  68% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.45);
  }
}

// The cadence is untouched — 1100ms a beat, one second apart, GO on the
// third — because countdown() upstairs waits exactly 4000ms before starting
// the sweep and the audio track is cut to the same bar.
.countdown .vo-beat:nth-child(1) {
  animation: vo-beat 1100ms normal forwards;
}
.countdown .vo-beat:nth-child(2) {
  animation: vo-beat 1100ms normal forwards 1000ms;
}
.countdown .vo-beat:nth-child(3) {
  animation: vo-beat 1100ms normal forwards 2000ms;
}
.countdown .vo-beat:nth-child(4) {
  animation: vo-beat-go 1100ms normal forwards 3000ms;
}

// Reduced motion keeps the COUNT — it is information, not decoration — and
// drops the scale, so each numeral simply appears and goes.
@media (prefers-reduced-motion: reduce) {
  @keyframes vo-beat {
    0%,
    100% {
      opacity: 0;
    }
    10%,
    80% {
      opacity: 1;
    }
  }
  @keyframes vo-beat-go {
    0%,
    100% {
      opacity: 0;
    }
    10%,
    80% {
      opacity: 1;
    }
  }
}
</style>
