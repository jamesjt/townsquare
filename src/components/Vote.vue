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
    <!-- FT-1311 (real-game note: "the countdown is too quiet"): the clip is
         now countdown-loud.mp3 — the same take normalized from a measured
         max of -14.7dB up to -1.1dB (claude_temp_test/2026-08-29-ft1311-*).
         The element was already playing at volume 1.0, the browser's own
         ceiling, so the only lever left was the asset itself; the bells go
         through towerBells' volume dial (element.volume = percent/100),
         which can only ever make a sound QUIETER than its file. The quiet
         original stays in assets, stood down.

         FT-1377 (real-game report: "the countdown sound keeps playing"):
         this preloader is now the ONE element that plays. The countdown
         block below used to carry its own `:autoplay` twin, which replayed
         on every remount of that block — and the block remounts on every
         return to `lockedVote 0` while a vote is in progress, whether or
         not a new countdown genuinely started. Playback is explicit now:
         playCountdownOnce() below fires on the RISING EDGE of the
         countdown phase (isCountdownPhase, false → true), so one vote
         start is one play — a deliberate "Restart the vote" is a new
         edge and rightly replays; a remount alone no longer can. -->
    <audio
      ref="countdownAudio"
      src="../assets/sounds/countdown-loud.mp3"
      preload="auto"
    ></audio>
    <!-- FT-1324 (user correction, reverting FT-1311 item 3): that pass put
         a seated player's Hand UP / Hand DOWN pair in one fixed strip at the
         dock slot for both phases — the WRONG location. Restored to where
         it lived before 74e121b: the pair rides the vo-dock transition with
         everything else, in the card while the nomination is open and in
         the docked strip while the vote runs. That does mean it can jump
         between the two the way it did pre-1311 — the card and the strip
         are different containers by construction, so there is no "old
         location" that is also jump-free. What FT-1311 item 3 fixed WITHIN
         each location stays: once the sweep passes my seat (or I never had
         a vote to raise) the pair freezes in place — dimmed, `is-locked`
         below — instead of vanishing and reflowing.

         FT-1377 OVERRULES the jump (user call, from live games): on a
         PLAYER client the pair must sit mid-face and never move from where
         it starts. The mechanism is one flag, not new markup: isDocked is
         storyteller-only now, so for a player this transition simply never
         fires — the card (and the pair on it) stands at the face centre
         through nomination, countdown, sweep and lock, and the docked
         strip below is the storyteller's alone. -->
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
            <!-- FT-1331 (user correction, reverting FT-1325): the vote
                 timer is a STORYTELLER control and its home is THIS card —
                 FT-1325 read "move the timer options to settings" as this
                 scrub, but the user meant the toolbar Timer menu's display
                 options (FT-1333 moves those). Restored verbatim from
                 7200a49's removal: the app's own number control, whole and
                 half seconds (FT-1311 item 5), handing setVotingSeconds the
                 delta that keeps the store in milliseconds. The pace the
                 room is about to live under is readable right here, beside
                 the button that starts it. -->
            <span
              class="vo-timing"
              v-if="session.lockedVote < 1"
              title="Time per player — seconds each seat gets before the sweep moves on"
            >
              <NumberScrub
                class="vo-scrub"
                :value="votingSeconds"
                :min="0.5"
                :max="30"
                :step="0.5"
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

        <template v-else-if="player">
          <div class="vo-row">
            <span class="vo-label"
              >{{ session.votingSpeed / 1000 }} seconds between votes</span
            >
          </div>
          <!-- My own hand is ONE piece of state with two positions, so it is one
               segmented control — the plate on the group, `control-cell` on the
               cells, lit on the one that is true — exactly the night-mode
               switch's shape. Two separate pills, one of them greyed, made the
               greyed one look broken rather than unselected.

               FT-1324: unlike the pre-1311 original, this does not vanish
               once the sweep passes my seat — that freeze-in-place behavior
               (`is-locked`) is the one FT-1311 item 3 piece kept through the
               location revert. -->
          <div
            class="vo-hands"
            :class="{ 'is-locked': !canVote }"
            role="group"
            aria-label="Your vote"
            :title="
              canVote
                ? ''
                : 'Your vote is locked in — the sweep has passed your seat'
            "
          >
            <button
              class="vo-hand"
              :class="{ on: !currentVote }"
              :aria-pressed="String(!currentVote)"
              :aria-disabled="String(!canVote)"
              @click="vote(false)"
            >
              <!-- User call 2026-08-28: ONE glyph for the pair — only Hand UP
                   wears its palm; this cell is words alone. (ui-hand-down.svg
                   stays in assets, stood down.) -->
              Hand DOWN
            </button>
            <button
              class="vo-hand"
              :class="{ on: !!currentVote }"
              :aria-pressed="String(!!currentVote)"
              :aria-disabled="String(!canVote)"
              @click="vote(true)"
            >
              <!-- User call 2026-08-28 (v5): the SAME painted manicule the
                   nominate mark wears (ui-nominate-hand.png), turned upright
                   by CSS — not a silhouette of it. -->
              <span class="vo-hand-ic vo-hand-nom" aria-hidden="true"></span>
              Hand UP
            </button>
          </div>
        </template>

        <p class="vo-hint" v-else>
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
          :class="{ 'is-locked': !canVote }"
          role="group"
          aria-label="Your vote"
          v-else-if="player"
          :title="
            canVote
              ? ''
              : 'Your vote is locked in — the sweep has passed your seat'
          "
        >
          <button
            class="vo-hand"
            :class="{ on: !currentVote }"
            :aria-pressed="String(!currentVote)"
            :aria-disabled="String(!canVote)"
            @click="vote(false)"
          >
            Hand DOWN
          </button>
          <button
            class="vo-hand"
            :class="{ on: !!currentVote }"
            :aria-pressed="String(!!currentVote)"
            :aria-disabled="String(!canVote)"
            @click="vote(true)"
          >
            <span class="vo-hand-ic vo-hand-nom" aria-hidden="true"></span>
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
        <!-- FT-1377: STOOD DOWN — this was the autoplay-on-mount element,
             and autoplay-on-mount is the replay bug: any remount of this
             block replayed the clip. The preloader element at the top of
             the template plays instead, once per countdown edge
             (playCountdownOnce). Kept per the house never-delete rule. -->
        <audio
          v-if="false"
          src="../assets/sounds/countdown-loud.mp3"
          :muted="grimoire.isMuted"
        ></audio>
      </div>
    </transition>
    <!-- FT-1331 — THE SWEEP GETS A CLOCK OF ITS OWN. Until now the numerals
         above played only in the gap between Start and the first locked hand;
         once the sweep ran, nothing on the face said a clock was running at
         all, and the pace itself lived only in a settings menu. This is the
         countdown CONTINUED, one seat at a time: while the hands sweep, the
         current seat's remaining seconds stand at the pivot in the same
         lettering, ink and halo as the III-II-I beats (quoted at just over
         half their size — persistent for the whole sweep, so it must not
         shout the way a three-second overture may), restarting from the full
         pace as each hand locks. A glance at the disc reads "the clock is
         running" from the tick and "how long a seat gets" from the number it
         restarts at — the lane's own bar, on both views: the tick is driven
         off the synced lock counter + votingSpeed (see syncSweepClock), so a
         player's browser keeps its own time between the relay's locks and no
         new wire state is needed. Same z-order ruling as the beats (z 3,
         over the sweeping hands — FT-1083's "numbers above the hands" — and
         it takes no clicks); when the host pauses, the locks stop coming,
         the seat's clock runs out and the numeral stands down — a stopped
         clock showing nothing is the truthful face of a paused vote. -->
    <transition name="blur">
      <div class="vo-sweep-clock" v-if="isSweeping">
        <span class="vo-sweep-beat" :key="sweepBeatKey">{{
          sweepNumeral
        }}</span>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
// FT-1331: back with the restored timer control — the same scrub the seat
// count and the night sheet's numbers use (removed by 7200a49/FT-1325,
// which the user has since corrected: the timer belongs on this card).
import NumberScrub from "./NumberScrub";

/** FT-1331: the sweep clock counts in the dial's own numerals, like the
 *  III-II-I beats. The timer setting runs 0.5–30s (PlayerSettings' scrub),
 *  so tens are enough. */
const ROMAN = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];
function romanize(n) {
  let out = "";
  let left = Math.max(0, Math.round(n));
  ROMAN.forEach(([v, glyph]) => {
    while (left >= v) {
      out += glyph;
      left -= v;
    }
  });
  return out;
}

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
     *  returns to the full card the moment the hands stand still.
     *
     *  FT-1377 (user call, overruling FT-1324's restore): the dock is the
     *  STORYTELLER'S alone now. A seated player's card — and the Hand
     *  UP / Hand DOWN pair on it — holds the centre of the face for the
     *  whole vote: nomination open, countdown, sweeping, locked. On a
     *  player client this is simply never true, so the card never leaves,
     *  nothing remounts, and the pair cannot move from where it starts.
     *  (FT-1324 accepted the card↔strip jump as the price of the pair
     *  living in both containers; the user has since ruled the pair's
     *  position outranks the dock.) `vo-live` rides this same flag, so on
     *  a player client the sweeping hands stay UNDER the standing card —
     *  a scarlet shaft through the tally was the exact unreadability
     *  FT-976 fixed; the tips still reach the seats unobscured. */
    isDocked: function () {
      return this.session.isVoteInProgress && !this.session.isSpectator;
    },
    /** FT-1331 (restored from 7200a49's removal): the scrub's read — the
     *  store keeps milliseconds, the control speaks whole and half seconds. */
    votingSeconds: function () {
      return this.session.votingSpeed / 1000;
    },
    /** FT-1331: is the per-seat clock on the face right now — the sweep is
     *  running (a hand has locked, the vote is live) and the current seat's
     *  seconds have not run out. The remaining-seconds guard is what stands
     *  the clock down on a pause: the locks stop arriving, the seat's time
     *  runs out, and a vote with no clock running shows no clock. */
    isSweeping: function () {
      return (
        this.session.isVoteInProgress &&
        this.session.lockedVote >= 1 &&
        this.sweepRemaining > 0
      );
    },
    /** FT-1377: the three seconds the III-II-I beats (and their sound) own —
     *  after Start, before the first hand locks. The WATCHER on this is the
     *  countdown clip's one trigger: it plays on the rising edge and only
     *  there, so remounts of the beat block can never replay it. */
    isCountdownPhase: function () {
      return this.session.isVoteInProgress && !this.session.lockedVote;
    },
    sweepNumeral: function () {
      return romanize(this.sweepRemaining);
    },
    /** Each tick recreates the span (the :key), so its settle animation
     *  restarts — the tick IS the "clock is running" signal. */
    sweepBeatKey: function () {
      return this.session.lockedVote + ":" + this.sweepRemaining;
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
      voteTimer: null,
      /** FT-1331: the sweep clock's own three — seconds left for the seat
       *  under the sweep, the wall-clock moment they run out, and the
       *  100ms reader that keeps the first honest against the second. */
      sweepRemaining: 0,
      sweepDeadline: 0,
      sweepTick: null,
    };
  },
  /**
   * FT-1331: the clock keys off the SYNCED facts — every browser sees
   * lockedVote move (the host commits it, the relay carries it), so host
   * and player clocks restart together without any new wire state.
   */
  watch: {
    "session.lockedVote": "syncSweepClock",
    "session.isVoteInProgress": "syncSweepClock",
    // FT-1377: the countdown clip's one trigger — see isCountdownPhase.
    isCountdownPhase: "playCountdownOnce"
  },
  beforeDestroy() {
    clearInterval(this.sweepTick);
    // FT-1377: the vote timer must not outlive the component. A nomination
    // can close under a live interval (a nominated seat removed mid-vote
    // aborts the nomination from TownSquare, unmounting this component),
    // and an interval left running here keeps committing lock/progress
    // state against a vote that no longer exists.
    clearInterval(this.voteTimer);
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
      // FT-1377 — THE REMOUNT CULPRIT, found by rig (claude_temp_test/
      // 2026-09-04-ft1377-audio-diagnose.log, phase 9): this method used to
      // assign voteTimer WITHOUT clearing what it held, so a second press
      // before the countdown ended (the button stays clickable for the
      // ~240ms dock transition) ORPHANED the pending 4s interval. The
      // orphan then called start() every 4 seconds forever: the sweep
      // reset to seat 1 on each firing, isVoteInProgress was re-asserted
      // even after the nomination closed, and every recovery press
      // remounted the old autoplay block — "the countdown sound keeps
      // playing". One clearInterval makes a double press idempotent.
      clearInterval(this.voteTimer);
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
        // FT-1331: Resume gives the current seat a fresh window (the
        // interval above restarts from zero), so the host's face clock
        // restarts with it. Host-only by nature — a player's clock waits
        // for the next synced lock, exactly as it does through the pause.
        this.syncSweepClock();
      }
    },
    /**
     * FT-1331: (RE)START THE SEAT CLOCK — called by the watchers whenever
     * the synced sweep state moves. A deadline + a 100ms reader rather than
     * a 1s stepper, so a half-second pace (the scrub allows 2.5s) and a
     * late-joining spectator's first observed lock both land on honest
     * whole-second ceilings; the reader stands itself down at zero.
     */
    syncSweepClock() {
      clearInterval(this.sweepTick);
      this.sweepTick = null;
      const s = this.session;
      const sweeping =
        s.isVoteInProgress &&
        s.lockedVote >= 1 &&
        s.lockedVote <= this.players.length;
      if (!sweeping) {
        this.sweepRemaining = 0;
        return;
      }
      this.sweepDeadline = Date.now() + s.votingSpeed;
      this.readSweepClock();
      this.sweepTick = setInterval(this.readSweepClock, 100);
    },
    /**
     * FT-1377: ONE vote start, ONE play. Fired by the isCountdownPhase
     * watcher on its rising edge only — the moment Start (or a deliberate
     * Restart) takes the vote to `in progress, nothing locked`. The clip
     * plays from its top on the always-mounted preloader element, so a
     * remount of the beat block — the old `:autoplay` trigger — plays
     * nothing. Mute is honored at the moment of the edge, the same gate
     * the old `:autoplay="!grimoire.isMuted"` binding applied.
     */
    playCountdownOnce(entering) {
      if (!entering || this.grimoire.isMuted) return;
      const el = this.$refs.countdownAudio;
      if (!el) return;
      el.currentTime = 0;
      const p = el.play();
      // Autoplay policy can refuse (a player who has never touched the
      // page); a refused play must not become an unhandled rejection.
      if (p && p.catch) p.catch(() => {});
    },
    readSweepClock() {
      const left = Math.ceil((this.sweepDeadline - Date.now()) / 1000);
      this.sweepRemaining = Math.max(left, 0);
      if (left <= 0) {
        clearInterval(this.sweepTick);
        this.sweepTick = null;
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
    /** FT-1331 (restored with the scrub): whole/half seconds in, the same
     *  millisecond delta the original stepper fed the store. */
    setVotingSpeed(diff) {
      const speed = Math.round(this.session.votingSpeed + diff);
      if (speed > 0) {
        this.$store.commit("session/setVotingSpeed", speed);
      }
    },
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
// FT-1331: BACK IN SERVICE — FT-1325 stood these two down when it removed
// the card's scrub; the user corrected that call (the vote timer is a
// storyteller control and lives on this card), so the scrub and its dress
// are restored together.
.vo-scrub {
  color: #f7f0e1;
  &:hover {
    color: #fff;
  }
}
.vo-timing {
  display: inline-flex;
  align-items: baseline;
  font-size: 0.62em;
  color: #cfc4ad;
  .vo-unit {
    margin-left: 0.12em;
  }
}
// The scrub stays BESIDE the primary in both registers (load-bearing again —
// FT-1331 restored the scrub to this row).
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
// FT-1311 item 2 tunes the pair, small: the resting cells calm down to the
// app's parchment ink (control-cell's plain white was the loudest thing on
// the strip at rest), the glyph dims with its cell and wakes with it, and
// the lit cell earns a real edge — a sunken well plus a purple keyline — so
// "which way is my hand" reads from silhouette + ground, not hue alone.
// Hand DOWN stays words alone (user call 2026-08-28: ONE glyph for the pair).
.vo-hand {
  @include control-cell;
  font-size: 0.6em;
  font-weight: bold;
  padding: 0.5em 1.1em;
  min-height: 2.9em;
  white-space: nowrap;
  transition: color 150ms, background 150ms, box-shadow 150ms;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  color: #cfc4ad;

  /* The Hand UP glyph is the nominate manicule's own painted art
     (ui-nominate-hand.png), rotated upright — the art points right in
     file. Art, not a tinted mask, so it looks exactly like the coin's. */
  .vo-hand-ic {
    width: 1.4em;
    height: 1.4em;
    flex: 0 0 auto;
    opacity: 0.75;
    transition: opacity 150ms;
  }
  .vo-hand-nom {
    background: url("../assets/ui-nominate-hand.png") center / contain
      no-repeat;
    /* the art points LEFT in file — +90 stands it up */
    transform: rotate(90deg);
  }

  &:hover:not(.on) {
    background: $control-bg-hover;
    color: #fff;
    .vo-hand-ic {
      opacity: 1;
    }
  }
  &.on {
    /* User call 2026-08-28: the lit cell wears the pick purple (the claim
       ask's #a78fcd family) instead of the control-on ink. */
    background: rgba(167, 143, 205, 0.28);
    color: #e8dcfb;
    box-shadow:
      inset 0 0 0 1px rgba(167, 143, 205, 0.55),
      inset 0 2px 6px rgba(0, 0, 0, 0.5);
    .vo-hand-ic {
      opacity: 1;
    }
  }
  @media (pointer: coarse) {
    min-height: 40px;
  }
}

// FT-1311 item 3: once the sweep has passed my seat (or I have no vote to
// raise) the pair FREEZES instead of vanishing — the lit cell keeps saying
// which way my hand stands, the dead cell drops back, and nothing reflows.
// vote() already refuses the click (canVote guards it); this makes the
// refusal visible.
.vo-hands.is-locked {
  pointer-events: none;
  .vo-hand:not(.on) {
    color: rgba(216, 205, 180, 0.35);
    .vo-hand-ic {
      opacity: 0.3;
    }
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

// ── NO LONGER REACHED, AND LEFT IN PLACE (FT-1324) ──────────────────────────
// FT-1311 item 3 pulled the player's Hand UP / Hand DOWN pair out of the
// vo-dock transition into one fixed strip at the dock slot, styled below.
// The user called that the wrong location: FT-1324 restored the pair to
// where it lived before 74e121b, split across the card and the docked strip
// (both above, `.vo-hands`/`.vo-hand`). This markup is no longer rendered —
// kept per the house never-delete rule; whoever removes it should do so
// deliberately.
.vo-player {
  flex-direction: column;
  gap: 0.35em;

  .vo-nomination {
    white-space: nowrap;
  }
  .vo-pace {
    color: #cfc4ad;
    font-weight: normal;
    // the gap before the middot lives here, not in template whitespace —
    // vue-loader's condense mode eats an inter-element newline outright
    // (measured: "Eve· 3s" with no space).
    margin-left: 0.35em;
  }
}
.vo-player-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8em;
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

// ── THE SWEEP CLOCK (FT-1331) ───────────────────────────────────────────────
// The countdown continued, one seat at a time — the template note carries the
// why. Same material as the beats (.tw-numeral quoted through the block
// above: Times bold in face-pixels, ember-gold, dark-then-ember halo) at just
// over HALF their size: the beats are a three-second overture and may fill
// the face; this stands for the whole sweep and must read at a glance without
// shouting over the hands. The shadow stack is the beats' recipe with every
// radius scaled to the glyph — FT-1083's finding scales both ways: the dark
// contour that cuts a 118fpx numeral out is oversized on a 64fpx one.
// 76, up from a first-shot 64: at 64 the numeral read but did not CARRY —
// the lane's bar is a glance from across the ring, and the extra step keeps
// it well under the beats' 118 overture size.
$vo-sweep-size: 76; // face-pixels — judged against the 118fpx beats
.vo-sweep-clock {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  // The beats' own ruling (the .countdown z note above): over the card's 1
  // and the sweeping hands' 2, in both registers — the user's "numbers above
  // the hands" — and it takes no clicks.
  z-index: 3;
}
.vo-sweep-beat {
  font-family: "Times New Roman", Times, serif;
  font-weight: bold;
  font-size: calc(#{$vo-sweep-size} * var(--fpx));
  line-height: 1;
  letter-spacing: calc(2 * var(--fpx));
  margin-right: calc(-2 * var(--fpx));
  color: #ffc25a;
  text-shadow:
    0 calc(2 * var(--fpx)) calc(2 * var(--fpx))
      rgba(255, 250, 235, calc(var(--ng-under, 16) / 100)),
    0 calc(-2 * var(--fpx)) calc(2 * var(--fpx))
      rgba(10, 5, 2, calc(var(--ng-top, 0) / 100)),
    0 calc(4 * var(--fpx)) calc(var(--ng-drop-blur, 1) * 3 * var(--fpx))
      rgba(0, 0, 0, calc(var(--ng-drop, 40) / 100)),
    0 0 calc(1.5 * var(--fpx)) rgba(8, 4, 1, 0.95),
    0 0 calc(3 * var(--fpx)) rgba(8, 4, 1, 0.9),
    0 0 calc(6 * var(--fpx)) rgba(20, 8, 2, 0.62),
    0 0 calc(16 * var(--fpx)) rgba(255, 170, 60, 0.66),
    0 0 calc(36 * var(--fpx)) rgba(255, 108, 16, 0.45);
  // Each tick recreates the span (the template :key), so this runs once per
  // second: a small land-and-settle, the beats' own shape without their
  // full-face travel. The restart IS the "clock is running" signal.
  animation: vo-sweep-tick 260ms ease-out;
}
@keyframes vo-sweep-tick {
  0% {
    opacity: 0.3;
    transform: scale(1.14);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
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
