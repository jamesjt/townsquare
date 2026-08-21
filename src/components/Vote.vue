<template>
  <div id="vote">
    <div class="arrows">
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
         disc is a desktop dress; the re-grounding moves NO control. -->
    <div class="overlay">
      <audio src="../assets/sounds/countdown.mp3" preload="auto"></audio>

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
        <div class="vo-caption">
          {{ voters.length === 1 ? "vote" : "votes" }} in favor &middot;
          majority is {{ majority }}
        </div>
      </div>

      <template v-if="!session.isSpectator">
        <div
          class="vo-row"
          v-if="!session.isVoteInProgress && session.lockedVote < 1"
        >
          <span class="vo-label">Time per player</span>
          <!-- The app's own number control, the one the seat count and the
               night sheet's numbers already use — same gesture (drag
               sideways, or click to type) in one implementation instead of a
               second pair of +/- steppers. It hands back WHOLE SECONDS and
               `setVotingSeconds` turns that into the delta the original
               stepper fed `setVotingSpeed`, so the store keeps its
               milliseconds and the sweep reads exactly what it always did. -->
          <NumberScrub
            class="vo-scrub"
            :value="votingSeconds"
            :min="1"
            :max="30"
            title="Drag sideways to scrub — click to type"
            @input="setVotingSeconds"
          />
          <span class="vo-label">seconds</span>
        </div>

        <div class="vo-controls">
          <button
            class="vo-btn"
            v-if="!session.isVoteInProgress"
            @click="countdown"
          >
            Countdown
          </button>
          <button class="vo-btn" v-if="!session.isVoteInProgress" @click="start">
            {{ session.lockedVote ? "Restart" : "Start" }}
          </button>
          <template v-else>
            <button
              class="vo-btn"
              :class="{ disabled: !session.lockedVote }"
              @click="pause"
            >
              {{ voteTimer ? "Pause" : "Resume" }}
            </button>
            <button class="vo-btn" @click="stop">Reset</button>
          </template>
        </div>

        <!-- ONE control for one piece of state. `control-toggle` is this
             app's shape for a control that HOLDS a position (the build
             panel's Duplicates wears it) — hollow and full-contrast when
             off, lit when on, sunken in both so the shape alone says
             "toggle" before the colour does. -->
        <div class="vo-controls" v-if="!isExile">
          <button
            class="vo-btn vo-mark"
            :class="{ on: isMarked }"
            :aria-pressed="String(isMarked)"
            @click="toggleMarked"
          >
            Mark for execution
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
        <div class="vo-row" v-if="!session.isVoteInProgress">
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
    <transition name="blur">
      <div
        class="countdown"
        v-if="session.isVoteInProgress && !session.lockedVote"
      >
        <span>3</span>
        <span>2</span>
        <span>1</span>
        <span>GO</span>
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
// ON THE DISC THE ORDER REVERSES (FT-1024b, user call: "the nomination hands
// should be on top"). Under the gate the ground is the plate's glass, not the
// scrim, and a hand dimmed to a third of its brightness by the plate's
// brightness(0.34) stopped doing its one job — saying WHO, visibly. So inside
// the gate block below, `.arrows` takes `z-index: 2` and rides above the
// plate and its type both; the hands are `pointer-events: none`, so nothing
// under them loses a click. Below the gate this paragraph's original order
// stands untouched.
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
  .overlay {
    @include face-disc-frame;
    // The frame is already a centring flex column; this overlay's furniture
    // is a compact cluster, not a header/band/foot spread, so it gathers at
    // the plate's centre instead of being distributed into the caps — every
    // control keeps its order and its logic. Re-grounding, not redesign.
    justify-content: center;
  }

  // FT-1024b (user call): the pointer hands ride ABOVE the glass. The plate's
  // brightness(0.34) took the hands down to a third of their paint, and a
  // pointer that has to be looked for is not pointing. z-index 2 clears the
  // overlay's own 1, so the hands paint over the plate AND its type — ruled,
  // not drifted into; the full stacking story (and why the order is the
  // opposite below the gate) is the scrim block's own comment above.
  .arrows {
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
  .vo-now {
    font-size: 2.1em;
    color: #f7f0e1;
  }
  .vo-slash {
    font-size: 1.1em;
    color: rgba(216, 205, 180, 0.45);
  }
  .vo-need {
    font-size: 1.25em;
    color: #d8cdb4;
  }
  .vo-caption {
    margin-top: 0.35em;
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

  &:hover:not(.disabled) {
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

// The execution mark — one control holding one position.
.vo-mark {
  @include control-toggle;
}

// THE FINISH CONTROL. Emphatic when it will WRITE the result, plain when it
// will only discard the nomination — and never blood, because blood is
// `control-lit` here and this control is not a thing that is switched on. The
// emphasis is the plate's own parchment ink promoted to the edge, so it is the
// brightest object on the surface without introducing a colour.
.vo-finish.is-primary {
  background: rgba(60, 50, 32, 0.88);
  border-color: rgba(216, 205, 180, 0.8);
  color: #fdf6e6;
  box-shadow: 0 0 14px rgba(216, 205, 180, 0.16);

  &:hover:not(.disabled) {
    background: rgba(84, 70, 43, 0.94);
    border-color: #efe3c6;
    color: #fff;
  }
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
  .nominator:before {
    background-image: url("../assets/clock-small.png");
    animation: arrow-ccw 1s ease-out;
  }
  .nominee:before {
    background-image: url("../assets/clock-big.png");
    animation: arrow-cw 1s ease-out;
  }
}

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
</style>
