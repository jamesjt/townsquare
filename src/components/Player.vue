<template>
  <li :style="zoom" :class="{ 'name-hover': nameHover }">
    <div
      ref="player"
      class="player"
      @dragover.prevent
      @drop="onRoleDrop($event); onPlayerDrop($event)"
      :class="[
        {
          dead: player.isDead,
          marked: session.markedPlayer === index,
          'no-vote': player.isVoteless,
          you: session.sessionId && player.id && player.id === session.playerId,
          'vote-yes': session.votes[index],
          'vote-lock': voteLocked,
          // the coin's toothed edge does not fill its circle, so whatever
          // sits under it shows through the gaps — the seat tells its own
          // CSS when a coin is covering the life disc
          'has-role': !!player.role.id,
          // this chair's character is in hand, waiting for the chair it goes
          // to — the seat's own version of the tray tile's `picked` mark
          'role-armed': roleArmed,
          // FT-861: this seat does not know what it is. The storyteller's
          // scan mark — see the amber name plate at the bottom of this file.
          believing: !!beliefChip
        },
        player.role.team
      ]"
    >
      <!-- Golem fork (FT-848): the blood a death leaves has MOVED to the
           clock face — TownSquare's .blood-dial stains the dead seat's own
           wedge of the dial, so the tower gets bloodier as the town dies
           instead of the splatter hiding behind a coin (user call
           2026-08-18). Markup and splatStyle stay behind showSeatSplat
           rather than being deleted, the same way the night badges did. -->
      <div
        class="blood-splat"
        v-if="showSeatSplat && player.isDead"
        :style="splatStyle"
      ></div>
      <!-- the shroud covers the coin's top half, so "tap a seat" has to mean
           the whole seat: with a character in hand this lands it here, and
           with nothing in hand it is the death toggle it has always been -->
      <!-- FT-990: and because it covers the coin's top half, it is also one of
           the three boxes that have to carry the coin's hover — see showCard's
           own note. The ghost's art is `pointer-events: none`, so hovering the
           GHOST is hovering this div. -->
      <!-- FT-1022: and because it SITS ABOVE `.token` in stacking order without
           being its ancestor, it is also where a role-coin drag silently died.
           HTML5 drag-start is not a click: the browser's native search for a
           draggable source starts at the exact element the pointer went down
           on and walks up THAT element's own ancestors — it never crosses to
           a sibling. A drag begun anywhere in the shroud's box (the coin's top
           ~61%, the single biggest and most natural place to grab a coin) hit
           `.shroud`, found no draggable ancestor short of `.player`, and quit
           before `.token`'s own `draggable`/`dragstart` ever saw it — while a
           grab on the coin's exposed bottom third worked fine. The belief chip
           (FT-1006/1021) was the suspect, but it is a DESCENDANT of `.token`,
           not a sibling — a drag started on it walks up through `.token` and
           finds the coin's own `draggable` just fine (verified: dragging a
           dealt seat's coin from directly on its chip swaps the seat exactly
           like grabbing the bare coin does). The shroud's own click stays
           untouched — a plain click still ends as a click, same as the coin's
           own `@click="setRole"` living beside its `draggable` today. -->
      <div
        class="shroud"
        :draggable="String(!!player.role.id && !session.isSpectator)"
        @dragstart="onRoleDragStart"
        @click="onLifeClick"
        @mouseenter="showCard"
        @mouseleave="hideCardSoon"
      ></div>
      <!-- FT-985: the seat's Roman numeral USED TO LIVE IN HERE, and that is
           why it only ever appeared with the grimoire hidden. The life token
           and the role coin are the two faces of one flip: `.life` is turned
           away (`rotateY(180deg)` + `backface-visibility: hidden`) whenever
           the grimoire is revealed, so everything inside it went with it.
           The numeral is now `.player`'s own child, below the coin — see
           `showSeatNumeral`. -->
      <!-- FT-990: the second of the coin's three boxes. In the storyteller's
           grimoire this face is turned away and takes no pointer at all; in
           the PUBLIC view it is the coin the room is looking at, and it is
           what a traveler's card has to be raised from. showCard's public-view
           guard is what keeps every other seat silent there. -->
      <div
        class="life"
        @click="onLifeClick"
        @mouseenter="showCard"
        @mouseleave="hideCardSoon"
      ></div>

      <!-- The seat's night-order badges are RETIRED (user call 2026-08-18):
           the storyteller's night checklist replaces them. Markup and styles
           stay in the file behind showNightBadges rather than being deleted,
           so the old read is one flag away while the checklist is built. -->
      <div
        class="night-order first"
        v-if="showNightBadges && nightOrder.get(player).first"
      >
        <em>{{ nightOrder.get(player).first }}.</em>
        <span v-if="player.role.firstNightReminder">{{
          player.role.firstNightReminder
        }}</span>
      </div>
      <div
        class="night-order other"
        v-if="showNightBadges && nightOrder.get(player).other"
      >
        <em>{{ nightOrder.get(player).other }}.</em>
        <span v-if="player.role.otherNightReminder">{{
          player.role.otherNightReminder
        }}</span>
      </div>

      <!-- FT-854: a seated role DRAGS — to another chair (swap) or into
           the drawer (unassign) -->
      <!-- FT-990: `hover-card` STAYS FALSE. The coin component has its own
           working hover card, and turning it on here would have been the
           one-word version of this change — but that card carries no
           public-view guard (Token.vue has no reason to know about
           `grimoire.isPublic`), so a player's own client would raise a card
           for every seat in the room. The seat keeps ONE card, with one
           guard and one anchor; the coin just becomes a third way to ask
           for it. -->
      <Token
        :role="player.role"
        :hover-card="false"
        :belief="beliefChip"
        :draggable="String(!!player.role.id && !session.isSpectator)"
        @dragstart.native="onRoleDragStart"
        @mouseenter.native="showCard"
        @mouseleave.native="hideCardSoon"
        @set-role="$emit('trigger', ['openRoleModal'])"
        @set-belief="$emit('trigger', ['openBeliefModal'])"
      />

      <!-- FT-858: the seat's read is THE role hover card — the same component
           the Almanac workbench's shelf and the grimoire drawer use
           (user-directed: one component, every surface).
           FT-990 amends the old note here, which said the seat owned the hover
           "rather than the coin, because the shroud and the life token sit over
           the coin's top half and would swallow it there". That is still TRUE
           and is no longer a REASON: the three boxes that cover the coin now
           each carry the hover themselves, so being swallowed by one of them is
           the same as being caught by the coin. What the plate keeps is the
           card's preferred SIDE — see cardPrefer. -->
      <RoleHoverCard
        v-if="cardAnchor"
        :role="player.role"
        :anchor="cardAnchor"
        :prefer="cardPrefer"
        @dismiss="hideCard"
      />

      <!-- FT-985 — THE SEAT'S ROMAN NUMERAL (user call: "have them appear if
           the grimoire is revealed and there is no role token on the seat").
           It sits AFTER the coin on purpose: same-z-index siblings paint in
           DOM order, and the numeral has to land on top of the coin that is
           actually facing the viewer. Never inside `.life` again — that face
           is turned away in exactly the state this mark is now for. -->
      <span class="seat-numeral" v-if="showSeatNumeral">{{ seatNumeral }}</span>

      <!-- Overlay icons -->
      <div class="overlay">
        <!-- FT-974b: the two answers to a nomination. The Font Awesome glyph
             pair (a red `hand-paper` and a blue `times`) is RETIRED in favour
             of our own painted pair — both icons stay registered in main.js
             and the markup stays here behind `showGlyphVotes`, the same way
             `showBallotVote` and `showNightBadges` do.
             They are replaced TOGETHER on purpose: they are one pair
             answering one question, and repainting only the X would leave a
             painted mark beside a vector one. -->
        <font-awesome-icon
          icon="hand-paper"
          class="vote"
          title="Hand UP"
          @click="vote()"
          v-if="showGlyphVotes"
        />
        <font-awesome-icon
          icon="times"
          class="vote"
          title="Hand DOWN"
          @click="vote()"
          v-if="showGlyphVotes"
        />
        <div
          class="vote-mark yes"
          title="Hand UP"
          @click="vote()"
          v-if="!showGlyphVotes"
        ></div>
        <div
          class="vote-mark no"
          title="Hand DOWN"
          @click="vote()"
          v-if="!showGlyphVotes"
        ></div>
        <font-awesome-icon
          icon="times-circle"
          class="cancel"
          title="Cancel"
          @click="cancel()"
        />
        <font-awesome-icon
          icon="exchange-alt"
          class="swap"
          @click="swapPlayer(player)"
          title="Swap seats with this player"
        />
        <font-awesome-icon
          icon="redo-alt"
          class="move"
          @click="movePlayer(player)"
          title="Move player to this seat"
        />
        <font-awesome-icon
          icon="hand-point-right"
          class="nominate"
          @click="nominatePlayer(player)"
          title="Nominate this player"
        />
      </div>

      <!-- Golem fork: ONE-TAP CLAIM — a seatless spectator sees an empty seat
           as claimable directly; no hidden name-menu required. -->
      <div
        class="claim-overlay"
        :class="{ asking: askName }"
        v-if="canOneTapClaim"
        @click="oneTapClaim"
        title="Take this seat"
      >
        <template v-if="!askName">
          <font-awesome-icon icon="chair" />
          <span>Claim</span>
        </template>
        <!-- First claim on this browser: ask the name in place, no dialog. -->
        <template v-else>
          <input
            ref="nameInput"
            v-model="claimName"
            placeholder="Your name"
            spellcheck="false"
            @click.stop
            @keyup.enter.stop="submitClaimName"
          />
          <span class="go" @click.stop="submitClaimName">
            <font-awesome-icon icon="check" />
          </span>
        </template>
      </div>

      <!-- Claimed seat icon -->
      <font-awesome-icon
        icon="chair"
        v-if="player.id && session.sessionId"
        class="seat"
        :class="{ highlight: session.isRolesDistributed }"
      />

      <!-- Ghost vote icon.
           FT-974: the ballot box is RETIRED in favour of our own mark — a
           raised spectral hand: the app's existing vote word is `hand-paper`,
           and this is that hand with a ghost's hem for a wrist. One
           silhouette carrying both meanings, because the mark renders at
           ~30px and a 30px box cannot hold two objects (measured: the
           earlier "small ghost + raised arm" read as a lump, and a five
           fingered hand read as a comb).
           FT-991: redrawn as `ui-ghost-vote-cowl.png` so it is the same hand
           that drew the seat's cowl — the scalloped hem became a TORN one and
           the two eyes in the palm came out, which are the two conventions
           FT-990 named as the cartoon. Nine candidates, judged at true size on
           a real seat; see the `.ghost-vote` rule for the table and for why the
           highest-scoring one was not taken.
           Font Awesome's `vote-yea` stays registered in main.js and the
           markup stays here behind `showBallotVote`, the same way this file
           already keeps `showNightBadges` and `showSeatSplat` — the old read
           is one flag away. -->
      <font-awesome-icon
        icon="vote-yea"
        class="has-vote"
        v-if="showBallotVote && player.isDead && !player.isVoteless"
        @click="updatePlayer('isVoteless', true)"
        title="Ghost vote"
      />
      <div
        class="has-vote ghost-vote"
        v-if="!showBallotVote && player.isDead && !player.isVoteless"
        @click="updatePlayer('isVoteless', true)"
        title="Ghost vote"
      ></div>

      <!-- On block icon -->
      <div class="marked">
        <font-awesome-icon icon="skull" />
      </div>

      <!-- FT-923: THE BRIDGE. The plate and the add-reminder disc below are a
           real gap apart (`GAP` in measureAddAnchor) — a straight-line cursor
           move from one to the other crosses that gap's dead ground, where
           `nameHover` (set by `.name`'s own mouseenter/mouseleave) is false
           and the disc's opacity gate has already dropped it, so the disc is
           gone before the cursor arrives. This div is invisible and occupies
           exactly that ground (`addBridgeStyle`, computed from the same
           `addAnchor` the disc itself is placed from), so there is no dead
           ground to cross — not a delay that papers over one. It renders
           BEFORE `.name` and the disc in this file on purpose: same-z-index
           siblings paint in DOM order, this has no z-index of its own to win
           with, and the couple of pixels it overlaps into each neighbour
           (guarding subpixel rounding between three independently-measured
           boxes) must still belong to THEM for clicks and hover, not to a
           blank bridge. `addAnchor` null (pre-first-measurement) hides it the
           same way it already hides the disc. -->
      <div
        class="name-bridge"
        v-if="addAnchor"
        :style="addBridgeStyle"
        @mouseenter="nameHover = true"
        @mouseleave="nameHover = false"
      ></div>

      <!-- FT-966: THE PLATE DRAGS TOO — the seat-to-seat move/swap the menu's
           two-step "Move player"/"Swap seats" rows already do, on a second
           channel a pointer can reach in one gesture. Occupancy alone picks
           the outcome, exactly the way dragging a CHARACTER onto a chair
           already works (empty chair: placed; occupied chair: traded) —
           see onPlayerDrop below and TownSquare's dragPlayer. Draggable only
           for a claimed seat (an "Open" plate has no player to carry) and
           never for a spectator, mirroring Token's own draggable gate. -->
      <div
        class="name"
        @click="isMenuOpen = !isMenuOpen"
        @mouseenter="showCard($event); nameHover = true"
        @mouseleave="hideCardSoon(); nameHover = false"
        :class="{ active: isMenuOpen }"
        :draggable="String(!!player.id && !session.isSpectator)"
        @dragstart="onPlayerDragStart"
      >
        <!-- an unclaimed chair says so instead of a fake name (user call) -->
        <span>{{ player.id ? player.name : "Open" }}</span>
        <font-awesome-icon icon="venus-mars" v-if="player.pronouns" />
        <div class="pronouns" v-if="player.pronouns">
          <span>{{ player.pronouns }}</span>
        </div>
      </div>

      <!-- FT-911 (fourth raising, fixed wrong twice — this is the disc that
           opens `addReminder()`/`openReminderModal`, not the ability card
           and not the role hover card, which is what the two failed
           attempts moved instead): THE ADD-REMINDER DISC LIVES BESIDE THE
           PLATE NOW, not on the coin. It moved from being `<li>`'s OWN
           direct-child sibling (where the ring's `margin-top: 68%` parked
           it on the coin's rim — see the CSS below for that history) to
           HERE, a sibling of `.name` inside `.player`, because `.player`
           already carries its own counter-rotation (the on-circle mixin's
           `> * { rotate($rot * -1deg) }`) which composes with the seat's
           own rotation to a PURE TRANSLATION for everything inside it — no
           residual rotation, no residual scale. A plain measured
           top/left/size therefore lands exactly where it reads on screen,
           the same free ride `.name` itself already gets; done as `<li>`'s
           own direct sibling, this disc would need to solve that a second
           time for its own, different pivot. `addAnchor` (measured in
           `measureAddAnchor`) carries the plate's own height and which side
           of the plate this seat's outward vector puts it on; it stays
           null — hiding the disc, same as the opacity-gated default already
           did — for the one render before the first measurement lands. -->
      <!-- FT-923: the disc also keeps `nameHover` alive on its own hover —
           necessary once the cursor actually reaches it (the bridge above
           only covers the ground BETWEEN the plate and here), but not
           sufficient by itself, since it does nothing about the gap the
           cursor crosses getting here. `mouseleave` still clears the flag,
           so the disc still hides once the cursor leaves the whole plate +
           bridge + disc region out the far side. -->
      <div
        class="reminder add"
        :style="addAnchorStyle"
        @click="$emit('trigger', ['openReminderModal'])"
        @mouseenter="nameHover = true"
        @mouseleave="nameHover = false"
      >
        <span class="icon"></span>
      </div>

      <transition name="fold">
        <ul class="menu" v-if="isMenuOpen">
          <!-- THE SEAT'S OWN EDIT FIELD, never prompt(). A browser dialog is
               silently auto-dismissed in dialog-less contexts (driven panes,
               embeds) and returns empty, which made every dialog-backed
               control in this app read as dead (FT-852 on Leave, the script
               editor's save, the custom reminder note). The claim overlay a
               few marks up already asks in place for exactly this reason;
               this is the same answer for a seat already taken.

               It renders ONLY while an edit is open, and the two callers
               (changeName / changePronouns) have no row in this menu today —
               so nothing here appears that did not appear before. If either
               row comes back, it works instead of doing nothing. -->
          <li class="seat-edit" v-if="edit" @click.stop>
            <input
              ref="editInput"
              v-model="edit.value"
              :placeholder="edit.field === 'name' ? 'Player name' : 'Pronouns'"
              spellcheck="false"
              maxlength="60"
              @keyup.enter.stop="commitEdit"
              @keyup.esc.stop="cancelEdit"
            />
            <font-awesome-icon
              icon="check"
              class="se-go"
              title="Save"
              @click="commitEdit"
            />
            <font-awesome-icon
              icon="times"
              class="se-no"
              title="Cancel"
              @click="cancelEdit"
            />
          </li>
          <!-- Golem fork (2026-08-18, user call): Pronouns, Rename and
               Remove left the menu — players name themselves on claiming,
               the seat scrub removes chairs. Methods kept. -->
          <!-- THE PLUS, OFF THE RING (touch).
               Every seat carried its own add-reminder disc, revealed on
               hover — which on a coarse pointer meant permanently visible.
               The discs hang INWARD along each seat's spoke, so eight of
               them landed on top of each other in the middle of the clock
               face, over whatever was standing there (measured 375x812: 8 of
               8 on the hub, 24px across, one of them unreachable behind
               another). The seat already opens a menu on tap; the plus is a
               row in it, at the size a row gets. It is not gated on being the
               storyteller — the disc never was — but it follows the same
               public-view rule the reminders themselves follow. -->
          <li class="rem-act" v-if="!grimoire.isPublic" @click="addReminder()">
            <font-awesome-icon icon="plus" />
            Add reminder
          </li>
          <template v-if="!session.isSpectator">
            <!-- THE CHARACTER'S OWN TWO GESTURES.
                 Moving a character between chairs and taking one off a chair
                 were drag-only, and HTML5 drag fires nothing under a finger —
                 so on a phone neither existed. Both are the seat's, not the
                 player's, which is why they sit above the player rows and
                 carry the coin's language ("character", not "player").
                 Move arms this chair's character on the same channel the tray
                 and the grimoire use; the next seat you tap trades with it. -->
            <template v-if="player.role.id">
              <li
                class="char-act"
                :class="{ on: roleArmed }"
                title="Pick this character up — then tap another seat to trade them over"
                @click="armCharacter()"
              >
                <font-awesome-icon icon="people-arrows" />
                {{ roleArmed ? "Put character back" : "Move character" }}
              </li>
              <li
                class="char-act"
                title="Take this character off the chair; it returns to the tray"
                @click="clearCharacter()"
              >
                <font-awesome-icon icon="undo" />
                Remove character
              </li>
              <!-- FT-1006: THE BELIEF DOORWAY. The chip on the coin edits a
                   belief once one exists, but it cannot SET the first one —
                   this row is where "is the Drunk, thinks they are X" starts.
                   Gated by the character's own schema (BELIEVES_OTHER in
                   golem/nightInfo — the Drunk, the Lunatic, the Marionette),
                   never a name test here; it also stays for any seat already
                   carrying a belief, so an invented one can still be changed
                   or cleared after the character underneath moves. -->
              <li
                class="char-act"
                v-if="canSetBelief"
                title="Set the character this seat's player is TOLD they are — they are dealt that and shown nothing else"
                @click="setBelief()"
              >
                <font-awesome-icon icon="theater-masks" />
                {{
                  beliefChip
                    ? "Change what they think they are"
                    : "What do they think they are?"
                }}
              </li>
            </template>
            <li @click="movePlayer()" :class="{ disabled: session.lockedVote }">
              <font-awesome-icon icon="redo-alt" />
              Move player
            </li>
            <li @click="swapPlayer()" :class="{ disabled: session.lockedVote }">
              <font-awesome-icon icon="exchange-alt" />
              Swap seats
            </li>
            <li
              @click="updatePlayer('id', '', true)"
              v-if="player.id && session.sessionId"
            >
              <font-awesome-icon icon="chair" />
              Empty seat
            </li>
            <template v-if="!session.nomination">
              <li @click="nominatePlayer()">
                <font-awesome-icon icon="hand-point-right" />
                Nomination
              </li>
            </template>
          </template>
          <li
            @click="claimSeat"
            v-if="session.isSpectator"
            :class="{ disabled: player.id && player.id !== session.playerId }"
          >
            <font-awesome-icon icon="chair" />
            <template v-if="!player.id">
              Claim seat
            </template>
            <template v-else-if="player.id === session.playerId">
              Vacate seat
            </template>
            <template v-else> Seat occupied</template>
          </li>
        </ul>
      </transition>
    </div>

    <template v-if="player.reminders">
      <!-- FT-869: `--ri`/`--rn` are this reminder's index and this seat's
           total reminder count — the CSS fan below reads them to spread
           reminders left/right of the seat instead of stacking them toward
           the ring's centre (see the `.reminder:not(.add)` rule). -->
      <div
        class="reminder"
        :key="reminder.role + ' ' + reminder.name"
        v-for="(reminder, ri) in player.reminders"
        :class="[reminder.role]"
        :style="{ '--ri': ri, '--rn': player.reminders.length }"
        @click="removeReminder(reminder)"
      >
        <span
          class="icon"
          :style="{
            backgroundImage: `url(${
              reminder.image && grimoire.isImageOptIn
                ? reminder.image
                : require('../assets/icons/' +
                    (reminder.imageAlt || reminder.role) +
                    '.png')
            })`
          }"
        ></span>
        <span class="text">{{ reminder.name }}</span>
      </div>
    </template>
    <!-- (the reminder HOVER TARGET is retired — an invisible box in the
         middle of the ring that swallowed drags and hovers meant for the
         town centre. Reminders are reached from the seat itself; its styles
         stay below, unused. user call 2026-08-18) -->
  </li>
</template>

<script>
import Token from "./Token";
// FT-858: THE role hover card, shared with the Almanac workbench's shelf, the
// grimoire drawer and every other coin.
import RoleHoverCard from "./RoleHoverCard";
// FT-861: is this seat living a lie, and what does it think it is?
import { isBelieving } from "../golem/belief";
// FT-1006: which CHARACTERS come with a lie attached (the Drunk, the
// Lunatic…) — the schema gate for the seat menu's belief doorway below.
import { believesOther } from "../golem/nightInfo";
import { mapGetters, mapState } from "vuex";

// how long the cursor has to rest on a seat before its card appears — enough
// that sweeping across the square does not strobe cards
const HOVER_DELAY = 170;
// FT-990: how long a card survives after the cursor leaves a target. The seat
// has three of them (coin, shroud, plate) with real ground between the coin and
// the plate, and a straight move across that ground must not drop the card and
// raise it again. Deliberately shorter than HOVER_DELAY: a real exit is still
// gone before any other seat could acquire, so two cards can never overlap.
const HOVER_GRACE = 120;

// Golem fork (FT-848): the cut blood decals, bundled once for all seats.
const splatCtx = require.context("../assets/blood/splats", false, /\.png$/);
const SPLATS = splatCtx
  .keys()
  .sort()
  .map(splatCtx);

export default {
  components: {
    RoleHoverCard,
    Token
  },
  props: {
    player: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState("players", ["players"]),
    ...mapState(["grimoire", "session"]),
    ...mapGetters({ nightOrder: "players/nightOrder" }),
    /** Retired with the night checklist (user call 2026-08-18) — flip to
     *  `this.grimoire.isNightOrder` to bring the seat badges back. */
    showNightBadges() {
      return false;
    },
    /** Retired 2026-08-18 (user call): a death's blood belongs on the CLOCK
     *  FACE, not behind the seat's coin. TownSquare's .blood-dial owns it
     *  now — flip this to `true` to bring the behind-the-coin splatter back. */
    showSeatSplat() {
      return false;
    },
    /** FT-974: Font Awesome's `vote-yea` ballot box, retired in favour of our
     *  own ghost-hand mark — flip this to `true` to bring the ballot box back.
     *  The icon stays registered in main.js either way. */
    showBallotVote() {
      return false;
    },
    /** FT-974b: the Font Awesome vote pair (red `hand-paper` / blue `times`),
     *  retired in favour of our own painted pair — flip this to `true` to
     *  bring the glyphs back. Both icons stay registered in main.js. */
    showGlyphVotes() {
      return false;
    },
    index: function() {
      return this.players.indexOf(this.player);
    },
    /**
     * FT-861: the chip on this seat's coin — the character its player was TOLD
     * they are, and null on the overwhelming majority of chairs.
     *
     * STORYTELLER, IN THE GRIMOIRE, ONLY. A player's own client is never sent
     * anybody's belief (see socket.js), so this is belt-and-braces there — but
     * the public grimoire is a real surface the whole room looks at, and a mark
     * saying "this seat does not know what it is" belongs on neither.
     */
    beliefChip() {
      if (this.session.isSpectator) return null;
      if (this.grimoire.isPublic) return null;
      if (isBelieving(this.player)) return this.player.believedRole;
      // FT-1021 (user call): a believing-class seat ALWAYS wears the chip —
      // before a belief is set it stands as the "?" placeholder, which is
      // also the doorway to setting one. "Sometimes there" was the unset
      // Drunk showing nothing.
      if (this.player.role && believesOther(this.player.role))
        return { placeholder: true };
      return null;
    },
    /**
     * FT-1006: does this seat's menu carry the belief doorway? Two ways in,
     * and they are different questions: the character DEMANDS a lie (schema —
     * a freshly seated Drunk has no belief yet and needs one), or a lie is
     * already on the seat (so it can be changed or cleared even after the
     * character underneath was swapped away). Same two guards as the chip:
     * never for a player, never on the public grimoire.
     */
    canSetBelief() {
      if (this.session.isSpectator) return false;
      if (this.grimoire.isPublic) return false;
      return believesOther(this.player.role) || isBelieving(this.player);
    },
    /** This chair's character is the one currently in hand. */
    roleArmed() {
      return (
        !!this.$store.state.drawerPick &&
        this.$store.state.drawerPickFrom === this.index
      );
    },
    /**
     * FT-985: WHEN THE CHAIR NUMBERS ITSELF — the storyteller's grimoire is
     * revealed AND no character is sitting there.
     *
     * `grimoire.isPublic` is the app's "coins are face down" switch (see
     * `#townsquare.public` below and the store's own note on it), so revealed
     * is `!isPublic` — the state in which the role coin faces the viewer and
     * an empty chair is a blank coin with nothing to say. That blank is what
     * the numeral is for.
     *
     * It is therefore a STORYTELLER-SIDE mark now: a player's client is held
     * at `isPublic: true`, so the ring a player sees carries no numerals at
     * all. That is the ask, and it is the read the numeral was always giving
     * the storyteller — it simply used to give it on the wrong face.
     */
    /**
     * ALWAYS, unless a character is sitting on the chair (user's cleaner rule,
     * 2026-08-20: "always show the numerals unless there is a role token on
     * them — reveal or hide just hides the role tokens").
     *
     * The reveal state is deliberately NOT part of this. Revealing and hiding
     * is about the ROLE TOKENS; the numeral is the chair's own name and does
     * not come and go with them. The earlier pass tied it to the reveal, which
     * meant a player — whose view is always hidden — lost seat numbers
     * entirely, and with them table talk like "four nominates nine".
     */
    showSeatNumeral() {
      return !(this.player.role && this.player.role.id);
    },
    seatNumeral() {
      // IIII, not IV — the clockmaker's convention (user-confirmed)
      const romans = [
        "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X",
        "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"
      ];
      return romans[this.index] || String(this.index + 1);
    },
    /**
     * Golem fork (FT-848): which splatter a death leaves, and how it lies.
     * Hashed from seat + name so every client derives the SAME splatter from
     * the already-synced death state — no extra messages.
     */
    splatStyle: function() {
      if (!this.player.isDead) return null;
      const key = this.index + "·" + this.player.name;
      let h = 2166136261;
      for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = (h * 16777619) >>> 0;
      }
      const pick = h % SPLATS.length;
      const rot = ((h >> 4) % 61) - 30;
      const scale = 1.15 + ((h >> 10) % 30) / 100;
      const dx = ((h >> 15) % 21) - 10;
      const dy = ((h >> 20) % 21) - 10;
      return {
        backgroundImage: `url(${SPLATS[pick]})`,
        transform: `translate(${dx}%, ${dy}%) rotate(${rot}deg) scale(${scale})`
      };
    },
    // Golem fork: a seatless spectator looking at an unclaimed seat.
    canOneTapClaim: function() {
      return (
        !!this.session.sessionId &&
        this.session.isSpectator &&
        !this.player.id &&
        !this.players.some(p => p.id === this.session.playerId)
      );
    },
    voteLocked: function() {
      const session = this.session;
      const players = this.players.length;
      if (!session.nomination) return false;
      const indexAdjusted =
        (this.index - 1 + players - session.nomination[1]) % players;
      return indexAdjusted < session.lockedVote - 1;
    },
    zoom: function() {
      // A seat is sized off the window's SHORTER side, which is exactly what
      // `vmin` means. It used to read `window.innerWidth > window.innerHeight`
      // and pick vh or vw by hand — but a computed property only re-runs when
      // one of its reactive deps changes, and the window's size is not one.
      // Rotating a phone therefore left every seat sized in the old
      // orientation's unit until something else happened to touch the roster
      // (13.5vw of a 375px-wide portrait window is 51px; the same expression
      // after a rotation to 812px wide is 110px). `vmin` is resolved by the
      // browser on every reflow, so the staleness cannot happen.
      const unit = "vmin";
      // Smaller across the board (user call 2026-08-18) — the coins were
      // crowding the dial; the ring reads better with air between the seats
      // and the clock face behind them.
      if (this.players.length < 7) {
        return { width: 15.5 + this.grimoire.zoom + unit };
      } else if (this.players.length <= 10) {
        return { width: 13.5 + this.grimoire.zoom + unit };
      } else if (this.players.length <= 15) {
        return { width: 12 + this.grimoire.zoom + unit };
      } else {
        return { width: 10.5 + this.grimoire.zoom + unit };
      }
    },
    /** FT-911: the add-reminder disc's own inline style — null (no override,
     *  the base CSS's opacity gate keeps it invisible either way) until
     *  `measureAddAnchor` has something to report. */
    addAnchorStyle() {
      if (!this.addAnchor) return null;
      const { size, top, left } = this.addAnchor;
      return {
        // border-box, not the base `.reminder` rule's content-box: `size` is
        // `.name`'s own getBoundingClientRect().height, which (like every
        // element under the app's global border-box reset) already includes
        // its border — matching box-sizing here is what makes the disc's
        // rendered height equal the plate's rendered height, border and all,
        // rather than the plate's height plus this disc's own 2x3px border.
        boxSizing: "border-box",
        width: `${size}px`,
        height: `${size}px`,
        top: `${top}px`,
        left: `${left}px`,
        margin: 0,
        padding: 0
      };
    },
    /** FT-923: the bridge's own inline style — the strip of ground between
     *  the plate's edge and the disc's near edge, at the plate's own height.
     *  Rebuilt from `addAnchor` rather than re-measuring: `addAnchor.left`
     *  already encodes which edge the disc's near side sits on (`left - gap`
     *  when the disc docks right of the plate, `left + size` when it docks
     *  left — see measureAddAnchor), so the plate's own edge is recovered by
     *  undoing that arithmetic rather than re-reading the DOM a second time.
     *  `OVERLAP` extends the strip 1px into both neighbours: three boxes
     *  (the real plate, the real disc, this style-only bridge) are each laid
     *  out from the same numbers but can each round to a different physical
     *  pixel, and a 1px overlap is cheaper than chasing that rounding exactly. */
    addBridgeStyle() {
      if (!this.addAnchor) return null;
      const { side, size, top, left, gap } = this.addAnchor;
      const OVERLAP = 1;
      const bridgeLeft = (side > 0 ? left - gap : left + size) - OVERLAP;
      return {
        position: "absolute",
        boxSizing: "border-box",
        width: `${gap + OVERLAP * 2}px`,
        height: `${size + OVERLAP * 2}px`,
        top: `${top - OVERLAP}px`,
        left: `${bridgeLeft}px`,
        margin: 0,
        padding: 0
      };
    }
  },
  data() {
    return {
      isMenuOpen: false,
      // the plate is hovered — reveals the add-reminder disc (see the
      // .name-hover rule; the disc is the plate's sibling, so CSS alone
      // cannot reach it)
      nameHover: false,
      // Golem fork: the name to apply once a one-tap claim lands.
      pendingName: null,
      // Golem fork: first claim on this browser asks the name in place.
      askName: false,
      claimName: "",
      // The seat menu's in-place edit: null, or { field, value }. Opened by
      // changeName / changePronouns, which used to open a browser dialog.
      edit: null,
      isSwap: false,
      // FT-858: the coin the seat's hover card is pinned to; null when
      // nothing is showing
      cardAnchor: null,
      // FT-990: which side the card tries first — "right" when the name plate
      // raised it, "auto" (lean outward, away from the ring's middle) when the
      // coin did. See showCard.
      cardPrefer: "right",
      // FT-911: the add-reminder disc's own dock — { side, size, top, left },
      // all measured off the rendered name plate. Null until mounted (or
      // if the plate can't be found), which the disc's CSS reads the same
      // way cardAnchor's absence already does: nothing to show yet.
      addAnchor: null
    };
  },
  mounted() {
    this.measureAddAnchor();
    window.addEventListener("resize", this.measureAddAnchor);
    window.addEventListener("orientationchange", this.measureAddAnchor);
    // Catches what a resize event misses: this seat's own box can change
    // size without the WINDOW resizing (the zoom slider, a seat count
    // change reflowing every coin — see TownSquare.vue's measureBluffAnchor,
    // which documents the identical gap for the demon's bluffs).
    if (typeof ResizeObserver !== "undefined") {
      this._addRO = new ResizeObserver(() => this.measureAddAnchor());
      this._addRO.observe(this.$el);
    }
  },
  beforeDestroy() {
    clearTimeout(this.$options.cardTimer);
    clearTimeout(this.$options.hideTimer);
    window.removeEventListener("resize", this.measureAddAnchor);
    window.removeEventListener("orientationchange", this.measureAddAnchor);
    if (this._addRO) this._addRO.disconnect();
  },
  watch: {
    // Closing the seat menu — by tapping the plate again, or by any row that
    // closes it — abandons a half-typed edit rather than leaving it armed to
    // reappear on the next open.
    isMenuOpen(open) {
      if (!open) this.edit = null;
    },
    // Golem fork: the host confirming our claim sets player.id to our own id —
    // that is the moment the pending name becomes this seat's name.
    "player.id"(id) {
      if (id === this.session.playerId && this.pendingName) {
        this.$store.commit("players/update", {
          player: this.player,
          property: "name",
          value: this.pendingName
        });
        this.pendingName = null;
      }
    },
    // The zoom slider and a seat count change both resize every coin (and
    // therefore, indirectly, nothing about the plate's OWN font-driven
    // height — but a seat count change can also re-seat this <li> at a new
    // clock position, which changes `side`).
    "grimoire.zoom"() {
      this.$nextTick(this.measureAddAnchor);
    },
    "players.length"() {
      this.$nextTick(this.measureAddAnchor);
    }
  },
  methods: {
    /**
     * FT-858: rest on a seat and it tells you what its character does.
     * FT-990: THE COIN ASKS TOO (user call: "at some point we lost the hover on
     * a player coin to see the role info box — bring it back").
     *
     * WHAT ACTUALLY COVERS THE COIN, which is what decides where these
     * handlers have to live. Measured, not assumed — the seat paints four
     * boxes over the same square and only some of them take a pointer:
     *
     *   .shroud   the coin's top 45% of the SEAT (~61% of the coin), z-index 2,
     *             a live click target (the death toggle). The ghost's art is
     *             this div's `:before` and is `pointer-events: none`, so
     *             hovering the ghost IS hovering this div.
     *   .life     the whole coin square. Turned away (`rotateY(180deg)` +
     *             `backface-visibility: hidden`) in the storyteller's grimoire,
     *             which takes it out of hit-testing entirely; face-on and
     *             frontmost in the public view.
     *   .token    the coin itself. Frontmost in the grimoire below the shroud —
     *             so on its own it would have answered for the coin's bottom
     *             third and nothing else.
     *   .overlay / .marked / .seat-numeral   all `pointer-events: none`.
     *
     * So the coin is not ONE box, and binding to `<Token>` alone would have
     * given a hover that works on the bottom of a coin and dies on the top —
     * which is the shape of the original complaint, not its fix. All three
     * boxes carry it; together they are the coin, whichever face is showing.
     *
     * The two refusals below are kept exactly as they were. The public-view one
     * is a LEAK GUARD, not a nicety: a player's own client renders every seat,
     * and the coins being turned away is the only thing standing between them
     * and the whole grimoire. A traveler is the one character whose role is
     * public knowledge, so it is the one exception.
     */
    showCard(e) {
      const role = this.player.role;
      if (!role || !role.id) return;
      if (this.grimoire.isPublic && role.team !== "traveler") return;
      if (!window.matchMedia("(hover: hover)").matches) return;
      const fromPlate =
        !!e.currentTarget && e.currentTarget.classList.contains("name");
      // WHERE THE CARD PARKS, and why the two sides differ.
      //
      // The PLATE keeps what FT-858 gave it (user call 2026-08-19): it sits
      // below the ring with no neighbour to lie across, so a fixed side reads
      // better than one that flips with the seat's clock position.
      //
      // The COIN asks to lean OUTWARD instead — it is IN the ring, and a fixed
      // side would lay the card across the seats next door.
      //
      // MEASURED, and it does not currently change anything: the card is up to
      // 460px wide and the ring's outer edge is close to the window edge, so
      // "outward" does not FIT at either 1280x800 or 1920x1080 and the card's
      // own placement falls back to whichever side has room — inward, both
      // sides of the ring, for either preference. It is kept because it is the
      // correct request for a coin in a ring (it is what RoleHoverCard's own
      // note recommends for one), and it starts mattering the moment the card
      // is narrower or the window wider. It is not doing work today.
      //
      // Either way the card is anchored to the COIN element rather than to
      // whichever of the three boxes caught the pointer: the shroud is a squat
      // 45% banner and a card centred on it rides high off its own seat.
      const anchor = fromPlate
        ? e.currentTarget
        : this.$el.querySelector(".token") || e.currentTarget;
      const prefer = fromPlate ? "right" : "auto";
      // a pending hide is abandoned — this is what makes the gap between the
      // coin and the plate crossable (see hideCardSoon)
      clearTimeout(this.$options.hideTimer);
      clearTimeout(this.$options.cardTimer);
      // ALREADY UP: re-anchor now, with no second wait. The delay exists to
      // stop a sweep across the square strobing cards ON; once this seat's card
      // is showing, moving between its own coin and its own plate is one
      // continuous read and a re-acquisition delay there would show as the card
      // blinking out and back.
      if (this.cardAnchor) {
        this.cardAnchor = anchor;
        this.cardPrefer = prefer;
        return;
      }
      this.$options.cardTimer = setTimeout(() => {
        this.cardAnchor = anchor;
        this.cardPrefer = prefer;
      }, HOVER_DELAY);
    },
    /**
     * FT-990: leaving a hover target only ARMS the hide.
     *
     * The coin and the plate are separate boxes with real ground between them
     * (the plate is nudged down 5px), so a straight cursor move from one to the
     * other leaves both — and an immediate hide there drops the card and the
     * next handler raises it again, which is the flicker. The grace is shorter
     * than the acquire delay, so it never keeps a card alive across a genuine
     * exit; `showCard` cancels it, so it costs nothing on a real crossing.
     *
     * This is the same problem FT-923 solved for the add-reminder disc with an
     * invisible bridge element. A timer is the right answer HERE because there
     * are three separate targets on two different faces of the seat, so the
     * ground to be bridged is not one measurable strip.
     */
    hideCardSoon() {
      clearTimeout(this.$options.cardTimer);
      clearTimeout(this.$options.hideTimer);
      this.$options.hideTimer = setTimeout(() => {
        this.cardAnchor = null;
      }, HOVER_GRACE);
    },
    /** Immediate — the card's own `dismiss` (a scroll, a resize, a DRAG
     *  starting) wants to be out of the way this frame, not in 120ms. */
    hideCard() {
      clearTimeout(this.$options.cardTimer);
      clearTimeout(this.$options.hideTimer);
      this.cardAnchor = null;
    },
    /**
     * FT-911: where the add-reminder disc docks — beside this seat's own
     * name plate, not parked on the coin.
     *
     * SIDE is read off THIS seat's own <li> (`this.$el` — Player.vue's
     * template root IS the seat's <li>), the same way TownSquare.vue's
     * measureBluffAnchor answered the identical question for the demon's
     * bluffs: the ring's on-circle mixin rotates each seat's <li> by CSS
     * transform, so the li's OWN computed matrix is the ground truth for
     * "which way is outward from this seat" — not a second derivation off
     * bounding boxes, which gets several seats backwards (see
     * measureBluffAnchor's own comment for the measured case).
     * `matrix(a, b, c, d, e, f)` maps local "straight up" (0, -1) — outward,
     * before rotation — to screen-space (-c, -d). `ox > 0.05` means this
     * seat sits right-of-hub; at 12 and 6 o'clock ox≈0 and the threshold
     * resolves that to left, which is exactly the "12 or 6 → left" rule
     * with no separate case needed.
     *
     * SIZE is the plate's own rendered height, MEASURED rather than
     * approximated in vmin/%: the plate's height comes from font metrics
     * and padding, not the seat's own width, so no percentage of the seat
     * tracks it.
     *
     * Both are read off `.name`'s real box, relative to `.player`'s: this
     * disc is `.name`'s sibling inside `.player` now (see the template),
     * not `<li>`'s own direct-child sibling, specifically so a plain
     * top/left measured against `.player` lands correctly — `.player`'s own
     * counter-rotation (the on-circle mixin's `> * { rotate($rot * -1deg) }`)
     * composes with the seat's rotation to a pure translation for
     * everything inside it, the same free ride `.name` itself already gets.
     */
    measureAddAnchor() {
      const playerEl = this.$el.querySelector(".player");
      // `:scope >` — a PLAIN `.name` descendant selector also matches
      // Token.vue's `<svg class="name">` (the role's name arc, a grandchild
      // of `.player` via `.token`), which sits earlier in the DOM than the
      // seat's own plate and so wins a plain querySelector — measured
      // wrong: the coin-sized SVG's own height, not the plate's. The plate
      // is `.player`'s own direct child; the SVG is not.
      const nameEl = playerEl && playerEl.querySelector(":scope > .name");
      if (!playerEl || !nameEl) {
        this.addAnchor = null;
        return;
      }
      const nameRect = nameEl.getBoundingClientRect();
      const playerRect = playerEl.getBoundingClientRect();
      if (!nameRect.height) {
        this.addAnchor = null;
        return;
      }
      let ox = 0;
      const matrix = /matrix\(([^)]+)\)/.exec(
        getComputedStyle(this.$el).transform
      );
      if (matrix) {
        const parts = matrix[1].split(",").map(Number);
        ox = -parts[2]; // -c
      }
      const side = ox > 0.05 ? 1 : -1;
      const size = nameRect.height;
      const GAP = 6; // matches TownSquare.vue's own MARGIN_PX clearance
      const top = nameRect.top - playerRect.top;
      const left =
        side > 0
          ? nameRect.right - playerRect.left + GAP
          : nameRect.left - playerRect.left - GAP - size;
      // `gap` rides along on the anchor so `addBridgeStyle` (FT-923) can
      // rebuild the plate-to-disc span without a second, driftable copy of
      // this constant.
      this.addAnchor = { side, size, top, left, gap: GAP };
    },
    changePronouns() {
      if (this.session.isSpectator && this.player.id !== this.session.playerId)
        return;
      this.openEdit("pronouns", this.player.pronouns);
    },
    /**
     * Open the seat menu's own field on one of the seat's text properties.
     * The menu is the seat's panel already, so the edit happens where the
     * control that asked for it lives — no dialog, and nothing to be
     * auto-dismissed.
     */
    openEdit(field, value) {
      this.edit = { field, value: value || "" };
      this.isMenuOpen = true;
      this.$nextTick(() => {
        const el = this.$refs.editInput;
        if (el) {
          el.focus();
          el.select();
        }
      });
    },
    /** Cancel changes nothing — the seat keeps what it had. */
    cancelEdit() {
      this.edit = null;
    },
    commitEdit() {
      if (!this.edit) return;
      const { field } = this.edit;
      const value = this.edit.value.trim();
      this.edit = null;
      // A blank NAME keeps the old one (an unnamed chair is unreadable);
      // blank PRONOUNS are a real answer and clear the field — the same two
      // behaviours the dialogs had.
      if (field === "name" && !value) {
        this.isMenuOpen = false;
        return;
      }
      this.updatePlayer(field, value, true);
    },
    // ── FT-854: the role drawer's seat-side wiring ───────────────────────
    /**
     * Tapping a seat with a character in hand LANDS it (else the usual
     * alive/dead toggle).
     *
     * Where the character came from decides what landing means, exactly as it
     * does for a drag: off a list it is placed here; off another CHAIR the two
     * chairs trade, so a tap-swap and a drag-swap leave the town in the same
     * state. Tapping the chair it came from is the cancel.
     */
    onLifeClick() {
      const { drawerPick: pick, drawerPickFrom: from } = this.$store.state;
      if (pick && !this.session.isSpectator) {
        if (from === this.index) {
          this.$store.commit("setDrawerPick", null);
          return;
        }
        if (typeof from === "number") this.swapRolesWith(from);
        else this.placeRole(pick);
        this.$store.commit("setDrawerPick", null);
        return;
      }
      this.toggleStatus();
    },
    /** FT-1006: open the belief picker for this seat — the same modal the
     *  coin's chip opens, reachable before any chip exists. */
    setBelief() {
      this.isMenuOpen = false;
      this.$emit("trigger", ["openBeliefModal"]);
    },
    /** The ring's add-reminder disc, as a menu row (see the template note). */
    addReminder() {
      this.isMenuOpen = false;
      this.$emit("trigger", ["openReminderModal"]);
    },
    /** Pick this chair's character up, on the same channel the tray and the
     *  grimoire drawer arm from — so every surface that already watches
     *  `drawerPick` (the hint lines, the armed card) reacts unchanged. */
    armCharacter() {
      this.isMenuOpen = false;
      if (this.session.isSpectator || !this.player.role.id) return;
      if (this.roleArmed) {
        this.$store.commit("setDrawerPick", null);
        return;
      }
      this.$store.commit("setDrawerPick", this.player.role);
      this.$store.commit("setDrawerPickFrom", this.index);
    },
    /** Take the character off this chair — the tap twin of dragging a seated
     *  role out of the square, and it lands in the same place: the tray. */
    clearCharacter() {
      this.isMenuOpen = false;
      if (this.session.isSpectator || !this.player.role.id) return;
      if (this.roleArmed) this.$store.commit("setDrawerPick", null);
      this.$store.commit("players/update", {
        player: this.player,
        property: "role",
        value: {}
      });
    },
    onRoleDragStart(e) {
      e.dataTransfer.setData("golem/from", String(this.index));
      e.dataTransfer.effectAllowed = "move";
    },
    /**
     * FT-966: the name plate's own drag-start. A DISTINCT dataTransfer type
     * (`golem/player-from`, never `golem/from`) is the whole safety property
     * here — `golem/from` is what `golem/roleUnseat.js`'s document-level
     * listener watches for to clear a chair's CHARACTER on a drop outside
     * every seat. A player move dropped on empty ground must do nothing,
     * not blank the origin chair's role, and the way that is guaranteed is
     * that roleUnseat's `isSeatDrag` never sees this type in `types` at all
     * — not a flag it has to check and skip.
     */
    onPlayerDragStart(e) {
      if (this.session.isSpectator || !this.player.id) return;
      e.dataTransfer.setData("golem/player-from", String(this.index));
      e.dataTransfer.effectAllowed = "move";
    },
    /** A drop on this seat: a drawer role assigns; another seat's role
     *  SWAPS chairs with ours. */
    /** Put a role in THIS chair. With duplicates off (the default) a role
     *  lives in one chair only, so placing it anywhere else MOVES it — the
     *  rule holds for every path (drag, click, assign, shuffle) instead of
     *  each one policing itself. */
    placeRole(role) {
      if (!role || !role.id) return;
      if (!this.$store.state.allowDupRoles) {
        this.players.forEach(p => {
          if (p !== this.player && p.role && p.role.id === role.id) {
            this.$store.commit("players/update", {
              player: p,
              property: "role",
              value: {}
            });
          }
        });
      }
      this.$store.commit("players/update", {
        player: this.player,
        property: "role",
        value: role
      });
    },
    onRoleDrop(e) {
      if (this.session.isSpectator) return;
      const roleId = e.dataTransfer.getData("golem/role");
      const from = e.dataTransfer.getData("golem/from");
      if (roleId) {
        // state.roles is a Map keyed by role id — .find() is an array method
        // and threw here, so every drawer drop silently did nothing
        const role = this.$store.state.roles.get(roleId);
        if (role) this.placeRole(role);
        return;
      }
      if (from !== "" && Number(from) !== this.index) {
        this.swapRolesWith(Number(from));
      }
    },
    /**
     * FT-966: a name plate landed on THIS chair. `golem/player-from` is
     * read only — never `golem/from`, which is the character drag's own
     * type (see onPlayerDragStart) — so a role drop and a player drop can
     * never be mistaken for each other even though they share this same
     * `.player` div as a target.
     *
     * This only carries the origin index up to TownSquare: it does not
     * decide move vs swap itself. `dragPlayer` (TownSquare.vue) does, off
     * the same `players/swap` and `players/move` primitives — and the same
     * nomination bookkeeping — the menu's "Move player"/"Swap seats" rows
     * already land on, one call instead of the menu's arm-then-click pair.
     */
    onPlayerDrop(e) {
      if (this.session.isSpectator) return;
      const from = e.dataTransfer.getData("golem/player-from");
      if (from === "") return;
      const fromIndex = Number(from);
      if (fromIndex === this.index) return;
      this.$emit("trigger", ["dragPlayer", fromIndex]);
    },
    /**
     * Trade characters with another chair — ONE definition, used by the drag
     * that drops here and by the tap that lands a seat-armed character. An
     * empty source chair simply means this one is emptied, which is what
     * makes "move into an open seat" and "swap two seats" the same gesture.
     */
    swapRolesWith(fromIndex) {
      if (fromIndex === this.index) return;
      const other = this.players[fromIndex];
      if (!other) return;
      const mine = this.player.role;
      this.$store.commit("players/update", {
        player: this.player,
        property: "role",
        value: other.role
      });
      this.$store.commit("players/update", {
        player: other,
        property: "role",
        value: mine && mine.id ? mine : {}
      });
    },
    toggleStatus() {
      if (this.grimoire.isPublic) {
        if (!this.player.isDead) {
          this.updatePlayer("isDead", true);
          if (this.player.isMarked) {
            this.updatePlayer("isMarked", false);
          }
        } else if (this.player.isVoteless) {
          this.updatePlayer("isVoteless", false);
          this.updatePlayer("isDead", false);
        } else {
          this.updatePlayer("isVoteless", true);
        }
      } else {
        this.updatePlayer("isDead", !this.player.isDead);
        if (this.player.isMarked) {
          this.updatePlayer("isMarked", false);
        }
        if (this.player.isVoteless) {
          this.updatePlayer("isVoteless", false);
        }
      }
    },
    changeName() {
      if (this.session.isSpectator) return;
      this.openEdit("name", this.player.name);
    },
    removeReminder(reminder) {
      const reminders = [...this.player.reminders];
      reminders.splice(this.player.reminders.indexOf(reminder), 1);
      this.updatePlayer("reminders", reminders, true);
    },
    updatePlayer(property, value, closeMenu = false) {
      if (
        this.session.isSpectator &&
        property !== "reminders" &&
        property !== "pronouns"
      )
        return;
      this.$store.commit("players/update", {
        player: this.player,
        property,
        value
      });
      if (closeMenu) {
        this.isMenuOpen = false;
      }
    },
    removePlayer() {
      this.isMenuOpen = false;
      this.$emit("trigger", ["removePlayer"]);
    },
    swapPlayer(player) {
      this.isMenuOpen = false;
      this.$emit("trigger", ["swapPlayer", player]);
    },
    movePlayer(player) {
      this.isMenuOpen = false;
      this.$emit("trigger", ["movePlayer", player]);
    },
    nominatePlayer(player) {
      this.isMenuOpen = false;
      this.$emit("trigger", ["nominatePlayer", player]);
    },
    cancel() {
      this.$emit("trigger", ["cancel"]);
    },
    claimSeat() {
      this.isMenuOpen = false;
      this.$emit("trigger", ["claimSeat"]);
    },
    /**
     * Golem fork: claim in one tap — ask the player's name first (remembered
     * per browser), claim the seat, and name it once the claim lands (the
     * watcher below fires when the host confirms).
     */
    oneTapClaim() {
      if (this.askName) {
        // A stray click on the overlay while typing just refocuses the field.
        const input = this.$refs.nameInput;
        if (input) input.focus();
        return;
      }
      const remembered = (
        localStorage.getItem("golem.playerName") || ""
      ).trim();
      if (!remembered) {
        // No name on this browser yet — ask in place, then claim.
        this.askName = true;
        this.claimName = "";
        this.$nextTick(() => {
          const input = this.$refs.nameInput;
          if (input) input.focus();
        });
        return;
      }
      this.pendingName = remembered;
      this.$emit("trigger", ["claimSeat"]);
    },
    submitClaimName() {
      const name = this.claimName.trim();
      if (!name) return;
      localStorage.setItem("golem.playerName", name);
      this.pendingName = name;
      this.askName = false;
      this.$emit("trigger", ["claimSeat"]);
    },
    /**
     * Allow the ST to override a locked vote.
     */
    vote() {
      if (this.session.isSpectator) return;
      if (!this.voteLocked) return;
      this.$store.commit("session/voteSync", [
        this.index,
        !this.session.votes[this.index]
      ]);
    }
  }
};
</script>

<style lang="scss">
/* Golem fork (FT-848): the blood a death leaves on the tower behind the seat.
   First child of .player so it paints under the shroud, life token and role
   token; never intercepts clicks. */
.player .blood-splat {
  position: absolute;
  top: -18%;
  left: -18%;
  width: 136%;
  height: 136%;
  background: center / contain no-repeat;
  pointer-events: none;
  opacity: 0.85;
  animation: splat-in 300ms ease-out;
}
@keyframes splat-in {
  from {
    opacity: 0;
    filter: brightness(1.6) saturate(1.4);
  }
  to {
    opacity: 0.85;
    filter: none;
  }
}
/* the app's animation kill-switch */
#app.static .player .blood-splat {
  animation: none;
}

/* THE CHAIR WHOSE CHARACTER IS IN HAND.
   The tray rings its picked tile in red; a chair says the same thing the same
   way, so "this one is in hand, waiting for a chair" reads identically
   wherever the character was picked up. */
.player.role-armed {
  .life,
  .token {
    filter: drop-shadow(0 0 7px rgba(255, 80, 80, 0.95));
  }
  > .name {
    border-color: #a01414;
    color: #ff8a8a;
  }
}

/* Golem fork: the one-tap claim overlay on an empty seat. */
.player .claim-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  color: white;
  text-shadow: 0 0 4px black;
  opacity: 0;
  transition: opacity 200ms;
  svg {
    height: 28px;
    width: auto;
  }
  span {
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
  }
  /* BONE, NOT RED (user call 2026-08-20: "we want that to be whiteish like
     the gallows token"). Red on a chair nobody is sitting in was saying
     something the app now means elsewhere — `control-lit` is blood, the demon
     is blood, and the bluffs mask is blood. An empty chair is not lit, not
     evil and not a warning; it is furniture waiting for someone.
     `#d8cdb4` is the ink `control-icon-btn` already wears, which is the same
     warm bone the top strip's own marks are baked to — so the invitation to
     sit reads as part of the same set as the doors above it.
     THE HOVER STILL ANSWERS: the overlay goes from invisible to visible,
     which is a far louder acknowledgement than a colour change, and it was
     always doing that work. The red was a second signal on top of it. */
  &:hover {
    opacity: 1;
    color: #d8cdb4;
  }
  /* While asking the name, the overlay must not fade away under the cursor. */
  &.asking {
    opacity: 1;
    cursor: default;
  }
  input {
    width: 80%;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border: 2px solid black;
    border-radius: 6px;
    padding: 3px 6px;
    font-size: 80%;
    text-align: center;
    outline: none;
    &:focus {
      border-color: #400;
    }
  }
  .go {
    cursor: pointer;
    &:hover {
      color: red;
    }
  }
}

/* THE CLAIM PROMPT IS THE PLAYER'S WHOLE JOB ON A PHONE, and it was invisible
   there. The overlay sits at `opacity: 0` and is revealed by `:hover`, a state
   a touch screen never enters — so an empty chair offered no sign that tapping
   it would take the seat. (It still WORKED: a transparent overlay takes clicks
   perfectly well. Nothing said so.)

   On a hoverless pointer it simply shows, dimmed enough that eight of them
   around the ring do not shout over the town, and it keeps the same tap.
   `:active` gives the press its own feedback in place of the hover it cannot
   have. */
@media (hover: none) {
  .player .claim-overlay {
    opacity: 1;
    background: rgba(0, 0, 0, 0.42);
    /* the touch twin of the hover above — a press cannot use the reveal as
       its feedback, because on a hoverless pointer the overlay is already
       showing, so this one keeps a real change: the ground darkens and the
       ink brightens toward white, staying inside the same bone family. */
    &:active {
      background: rgba(0, 0, 0, 0.6);
      color: #f6dfbd;
    }
  }
}

@import "../vars.scss";

.fold-enter-active,
.fold-leave-active {
  transition: transform 250ms ease-in-out;
  transform-origin: left center;
  transform: perspective(200px);
}
.fold-enter,
.fold-leave-to {
  transform: perspective(200px) rotateY(90deg);
}

/***** Player token *****/
.circle .player {
  margin-bottom: 10px;

  &:before {
    content: " ";
    display: block;
    padding-top: 100%;
  }

  .shroud {
    top: 0;
    left: 0;
    position: absolute;
    width: 100%;
    height: 45%;
    cursor: pointer;
    transform: rotateX(0deg);
    transform-origin: top center;
    transition: transform 200ms ease-in-out;
    z-index: 2;

    // FT-997 (user call: "we need a glassy silk looking veil that goes over
    // a player token when they are dead. we already have a color change on
    // the token that is significant, we don't also need to have a big ghost
    // over their token. So it should be a cool additional add but it does
    // not need to be the primary way to indicate someone is dead").
    //
    // THE COWL GOES. FT-974/990/991 progressively refined a FIGURE painted
    // over the coin — a sheet ghost, then a hooded cowl, then that cowl
    // rendered as glass — each judged on the same "does it read as dead"
    // glance metric. This call rejects the premise, not the execution: the
    // coin already says dead on its own (the colour swap two rules above,
    // and Token.vue's cold-metal swap), so this mark's job shrinks from
    // "read as dead" to "read as an extra". `ui-ghost.png`, `ui-ghost-
    // cowl.png` and `ui-ghost-cowl-rim.png` are not orphaned by this — the
    // cowl PNGs still paint the ghost-VOTE mark (`.has-vote.ghost-vote`
    // below) and the FT-991 glass lab's preview (`html.gg-glass`, further
    // down this file) — this rule alone stops drawing a figure with them.
    //
    // NO PNG for the veil itself, on purpose: a second silhouette here,
    // glassy or not, is still a figure, and the ask was for fabric, not a
    // shape. The drape is a soft `radial-gradient` MASK instead — one
    // ellipse, feathered at the edge, so the veil has no hard outline to
    // read as a cutout. `:before` is the pane (a cool, barely-there wash
    // plus a sliver of real `backdrop-filter` blur, so the coin under it
    // actually softens); `:after` is the sheen, a single diagonal highlight
    // standing in for the fold of light silk always catches. Both share the
    // mask below so they can never drift apart.
    //
    // `.shroud`'s old `drop-shadow` goes with the cowl: it existed to hold
    // an OPAQUE figure off the coin's pale rim, and an ancestor `filter` is
    // a backdrop-filter killer (measured for the glass lab —
    // claude_temp_test/2026-08-20-ft991b-backdrop-probe.mjs), so it was the
    // one thing standing between this veil and real glass by default.
    //
    // GEOMETRY is UNCHANGED from the cowl's own box (`top`/`height` below,
    // and the `.dead`/hover rules past the end of this block) — the click
    // target, the resting position and the FT-991 lab all key off those
    // same numbers, and none of them needed to move for a mask-shaped veil
    // to read as draped over the coin's upper face.
    &:before,
    &:after {
      content: " ";
      position: absolute;
      margin-left: -50%;
      width: 100%;
      height: 106%;
      // FT-1004b: the veil lab's position and size ride the SHIPPED numbers
      // as offsets — the geometry here speaks percent of the shroud box, so
      // the dials do too (one unit = 1% of the box). With the lab absent
      // every var falls back to its ship value. FT-1015 BAKED THE USER'S
      // TUNED LOOK: the fallbacks ARE the ship now (Shift down 7, Size 144,
      // Frost 103, Transparency 75 below), so a fresh browser wears the
      // tuned veil and the lab's dials rest on these same numbers. Size
      // scales art and mask together (they are the same image) about the
      // existing `top center` origin, and the arrival keeps its own 1.15
      // settle on top of it.
      left: calc(50% + var(--vl-shift-x-adj, 0) * 1%);
      top: calc(-20% + var(--vl-shift-y-adj, 7) * 1%);
      opacity: 0;
      transform: perspective(400px)
        scale(calc(var(--vl-size-adj, 144) / 100 * 1.15));
      transform-origin: top center;
      transition: all 200ms;
      pointer-events: none;
      // FT-997b (user call: "the shroud doesn't read right — try the png
      // called veil in the botc folder"): the gradient drape's ellipse mask
      // is gone — the veil is ART now (design/viel.png, baked to
      // ui-veil.png), and its own alpha is the silhouette.
    }

    // THE PANE — a cool, translucent wash (silk, not sheet-white) plus a
    // sliver of real glass. CENTRED ON THE SAME POINT AS THE MASK ABOVE, and
    // that centring is load-bearing, not cosmetic: a first cut used a
    // diagonal `linear-gradient` here, whose brightest stops sat near the
    // BOX's corners — exactly where the ellipse mask fades to nothing, so
    // the one wash and its own mask were cancelling each other out (measured
    // dead-on-screen at up to 2.5x the alpha below: claude_temp_test/2026-
    // 08-20-ft997-tune.cjs). A radial wash sharing the mask's centre instead
    // puts its own brightest ring INSIDE the visible ellipse. The blur stays
    // tiny on purpose: at seat scale a strong blur would smear the role art
    // into mush, so this only softens it, the way a fine weave would.
    &:before {
      // the silk itself — the user's art. The SAME image is also the mask,
      // which does two jobs: it confines the backdrop blur to the veil's
      // silhouette (a bare backdrop-filter fills the whole box), and the
      // alpha-on-alpha multiply densifies the sheer fabric just enough to
      // read over a bright coin without any added wash.
      // FT-1015: SILK THREE is the shipped art now — the user tuned the
      // look in the veil lab and called it ("let's do this for the veil").
      // ui-veil.png and ui-veil2.png remain the lab's classed alternates in
      // the hook block below.
      background: url("../assets/ui-veil3.png") center top / contain no-repeat;
      -webkit-mask: url("../assets/ui-veil3.png") center top / contain no-repeat;
      mask: url("../assets/ui-veil3.png") center top / contain no-repeat;
      // FT-1004/1015: the Frost dial's fallback IS the ship — 103 tenths =
      // the baked blur(10.3px). On a Chromium engine the boot-set
      // `html.veil-glass` rule below REPLACES this backdrop-filter with the
      // displacement filter (same blur kept in the chain); everywhere else
      // THIS is the shipped look — the ship forks by engine, as the glass
      // bench itself does.
      backdrop-filter: blur(calc(var(--vl-frost-adj, 103) * 0.1px))
        saturate(94%);
      -webkit-backdrop-filter: blur(calc(var(--vl-frost-adj, 103) * 0.1px))
        saturate(94%);
    }

    // THE SHEEN — one diagonal band of light, standing in for the fold silk
    // always catches. `screen` lets it brighten whatever colour is under it
    // instead of painting a flat white stripe over the coin. Its stops don't
    // need the pane's re-centring: a diagonal line through the box's own
    // middle (45%-53%) already crosses the mask's visible ellipse dead on.
    &:after {
      // FT-997b: the painted sheen retired with the gradient veil — the art
      // carries its own folds and light. The pseudo stays (the .dead/hover
      // rules below still address it) but paints nothing.
      content: none;
    }

    #townsquare.spectator & {
      pointer-events: none;
    }

    // the veil previews on hover — but NOT while the town is still being
    // built (user call 2026-08-18): nothing can die yet, and the mark
    // flashing over every seat while assigning roles reads as an error.
    // The preview is HALF of whatever the resting veil is, so the Opacity
    // dial still moves the preview WITH the veil. FT-1004: that dial is the
    // VEIL lab's now (`--vl-opacity-adj`, src/golem/veilGlass.js) — the
    // veil's controls moved out of the ghost lab with the cowl's retirement.
    #townsquare:not(.spectator):not(.building) &:hover:before {
      opacity: calc(var(--vl-opacity-adj, 75) / 100 * 0.5);
      // matches the `.dead` rule below — one number, where the veil settles
      top: calc(-6% + var(--vl-shift-y-adj, 7) * 1%);
      transform: scale(calc(var(--vl-size-adj, 144) / 100));
    }
    #townsquare:not(.spectator):not(.building) &:hover:after {
      opacity: calc(var(--vl-opacity-adj, 75) / 100 * 0.5);
      top: calc(-6% + var(--vl-shift-y-adj, 7) * 1%);
      transform: scale(calc(var(--vl-size-adj, 144) / 100));
    }
  }

  // The arrival is kept: the veil drops from `top: -20%` to its resting
  // `-6%` and settles out of a slight `scale(1.15)` over the same 200ms the
  // cowl (and the cloth before it) arrived in — cloth drifting down and
  // cinching flat is more of a piece with silk than the old figure's
  // bigger, further fall was.
  &.dead .shroud:before,
  &.dead .shroud:after {
    top: calc(-6% + var(--vl-shift-y-adj, 7) * 1%);
    transform: perspective(400px) scale(calc(var(--vl-size-adj, 144) / 100));
  }
  // the pane's own resting strength — still the Opacity dial's home, but the
  // wash itself is what keeps this subtle now, not this number
  &.dead .shroud:before {
    opacity: calc(var(--vl-opacity-adj, 75) / 100);
  }
  // FT-997: the sheen is no longer gated behind the old cowl-outline's Rim
  // dial (that dial answered "how strong is the outline", and this mark no
  // longer has one) — its strength lives in its own gradient stops now, so
  // it takes the same Opacity dial as the pane and nothing else.
  &.dead .shroud:after {
    opacity: calc(var(--vl-opacity-adj, 75) / 100);
  }

  #townsquare:not(.spectator) &.dead .shroud:hover:before {
    opacity: calc(var(--vl-opacity-adj, 75) / 100);
  }
  #townsquare:not(.spectator) &.dead .shroud:hover:after {
    opacity: calc(var(--vl-opacity-adj, 75) / 100);
  }
}

/* ── FT-991 — THE GHOST AS GLASS ──────────────────────────────────────────────
 *
 * User: "can you give me a lab to make the ghost cowl glass, like we did with
 * the centre circle?"
 *
 * THE PNG CHANGES JOBS, and that is the whole idea. Glass in this app means
 * `backdrop-filter` — blur, saturation, brightness and a veil applied to
 * whatever is BEHIND an element (`src/faceDisc.scss`). `ui-ghost-cowl.png` is a
 * PAINTING, and a painting has no behind, so no amount of tinting it can make it
 * glass. Here the cowl is not drawn at all: its ALPHA becomes a MASK over a
 * layer carrying the backdrop-filter, which is what confines the glass to the
 * ghost's silhouette.
 *
 * That composes two things this fork already has rather than inventing a third:
 * TownInfo.vue's alive heart is the mask-a-PNG's-alpha idiom, and faceDisc.scss
 * is the glass vocabulary.
 *
 * AND THE DRAPERY SURVIVES THE SWAP, which is the happy part. The cowl's alpha
 * is already a density field — dense at the hood, thinning down the robe to a
 * torn hem, a void where a face would be — so masking with it gives the pane the
 * same folds the painting had, as varying GLASS STRENGTH instead of varying ink.
 * What does NOT survive is the art's baked film grain and its exact tone: a mask
 * discards colour. The Tint dial is what puts the tone back, in the mark's own
 * cold (198,214,228), which is why that is the fallback triplet here.
 *
 * `filter: none` IS LOAD-BEARING, not tidying. An ancestor with a `filter` forms
 * a BACKDROP ROOT and a `backdrop-filter` beneath one samples an empty group and
 * paints NOTHING — measured, not assumed (claude_temp_test/2026-08-20-ft991b-
 * backdrop-probe.mjs). `.shroud`'s drop-shadow is exactly that ancestor. So
 * glass costs the mark its dark separation from the coin, and the Rim dial
 * exists to hand it an edge back.
 *
 * THE CLASS, NOT A CUSTOM PROPERTY, because what changes between the two
 * materials is not a value — it is which declarations exist at all. It also
 * makes "is the lab doing anything?" answerable from outside the stylesheet, and
 * with it absent this whole block is inert: the shipped mark is the painting
 * above, untouched.
 *
 * TEMPORARY, DELETE ME — this block, `src/golem/ghostGlass.js`,
 * `src/components/GhostLab.vue` and its one line in App.vue all come out
 * together once a material is chosen and baked. */
html.gg-glass .circle .player .shroud {
  filter: none;

  &:before {
    // the painting goes; a flat veil in the mark's own tone takes its place,
    // and the mask is what gives that veil the ghost's shape
    background: rgba(
      var(--gg-tint-rgb, 198, 214, 228),
      calc(var(--gg-tint-adj, 0) / 100)
    );
    -webkit-mask: url("../assets/ui-ghost-cowl.png") center top / auto 100%
      no-repeat;
    mask: url("../assets/ui-ghost-cowl.png") center top / auto 100% no-repeat;

    // THE BLUR IS A FRACTION OF THE SEAT, never a pixel count — `--seat-sz` is
    // the app's own name for that length and 15vmin is the ring's own geometry,
    // so one setting is one material at every window size. `max(0px, ...)` is
    // belt and braces: an invalid filter term does not weaken the glass, it
    // invalidates the WHOLE backdrop-filter and deletes it.
    backdrop-filter: blur(
        max(0px, calc(var(--seat-sz, 15vmin) * var(--gg-blur-adj, 0) / 1000))
      )
      saturate(calc(var(--gg-sat-adj, 100) / 100))
      brightness(calc(var(--gg-bright-adj, 100) / 100));
    -webkit-backdrop-filter: blur(
        max(0px, calc(var(--seat-sz, 15vmin) * var(--gg-blur-adj, 0) / 1000))
      )
      saturate(calc(var(--gg-sat-adj, 100) / 100))
      brightness(calc(var(--gg-bright-adj, 100) / 100));
  }
}

/* ── FT-1004 — THE VEIL LAB'S TWO HOOKS ──────────────────────────────────────
 *
 * User: "give me a lab for the dead veil. Let me choose between the two veil
 * pngs in the botc folder, and then give me controls to make them glassy.
 * full controls from the glass bench html we looked at before."
 *
 * The lab itself is `src/components/VeilLab.vue` + `src/golem/veilGlass.js`
 * (behind `devLabs`); its Frost and Opacity dials ride the `--vl-*` fallbacks
 * woven into the shipped veil rules above. These two rules are the parts that
 * are not a value but a different set of declarations, so they hang off
 * classes the lab toggles on <html> — with the lab absent both classes are
 * absent and this whole block is inert.
 *
 * THE SILK PICK. The second painting (design/veil2.png, baked to ui-veil2.png
 * the same way ui-veil.png was: trim, height 512, the fork's own sharp) swaps
 * in as BOTH the art and the mask, because that pairing is the shipped veil's
 * whole construction — the image confines its own backdrop effects.
 *
 * THE REFRACTION. `backdrop-filter` swaps from `blur()` to the bench's SVG
 * displacement filter (`#vl-glass`, mounted by veilGlass.js) with the blur
 * kept in the chain — the mask stays exactly as shipped, so the bending is
 * confined to the silk's silhouette the same way the blur is. Chromium-only
 * (`backdrop-filter: url()` paints nowhere else); the lab never sets the
 * class elsewhere, leaving those engines the plain-Frost veil above — the
 * same fallback the bench shows. And the one thing that would kill it — an
 * ancestor `filter` forms a backdrop root (measured, FT-997) — stays absent.
 *
 * FT-1015 — A LOOK WAS CHOSEN AND BAKED. Silk three and the tuned numbers
 * moved into the shipped rules above; what remains here is (a) the lab's two
 * classed ALTERNATE silks (the default silk carries no class — one and two
 * are the classed ones now, "vl-silk-three" is retired), and (b) the
 * `veil-glass` rule, which is the SHIP'S: the baked look refracts, so
 * `bootVeilGlass()` (veilGlass.js, called from App.vue's mounted) sets the
 * class at boot on every Chromium engine — labs or no labs — and the lab
 * merely re-uses it (Refraction dialled to 0 removes it). Non-Chromium
 * engines never get the class and ship the plain blur above. */
html.vl-silk-one .circle .player .shroud:before {
  background: url("../assets/ui-veil.png") center top / contain no-repeat;
  -webkit-mask: url("../assets/ui-veil.png") center top / contain no-repeat;
  mask: url("../assets/ui-veil.png") center top / contain no-repeat;
}
html.vl-silk-two .circle .player .shroud:before {
  background: url("../assets/ui-veil2.png") center top / contain no-repeat;
  -webkit-mask: url("../assets/ui-veil2.png") center top / contain no-repeat;
  mask: url("../assets/ui-veil2.png") center top / contain no-repeat;
}
html.veil-glass .circle .player .shroud:before {
  backdrop-filter: url(#vl-glass) blur(calc(var(--vl-frost-adj, 103) * 0.1px))
    saturate(94%);
  -webkit-backdrop-filter: url(#vl-glass)
    blur(calc(var(--vl-frost-adj, 103) * 0.1px)) saturate(94%);
}

/* FT-997c (user call 2026-08-20: "you added a dark color to dead coins...
 * they are already silver we don't need to also make them darker"): the
 * FT-974 dead-coin dim (`brightness(0.72)` on `.circle .player.dead .token`)
 * is retired. It existed to give the retired pale ghost a darker ground to
 * glow against; the ghost is gone (FT-997) and the coin's cold-metal swap
 * (Token.vue) already says dead on its own. The veil above is judged over
 * the coin at full brightness now. */

/****** Life token *******/
.player {
  z-index: 2;
  .life {
    // no circular clip — see Token.vue: border-radius: 50% cut off every
    // tooth that crossed the inscribed circle, which is the "clipping" the
    // user saw. The coin art carries its own edge.
    width: 100%;
    // Golem fork (2026-08-18): our OWN seat token — a disc of the
    // clocktower's gold filigree (life-golem.png; upstream's life.png
    // stays in the tree untouched)
    // The token's two faces are now the SAME COIN (user call 2026-08-18):
    // the public face is the blank coin, the storyteller face is the coin
    // with the role on it. Identical silhouettes mean nothing can peek out
    // from behind the other. life-golem.png stays in the tree, unreferenced.
    // no-repeat — the shorthand resets background-repeat, and a TILED coin put
    // the next tile's top edge just under this one: that is the "melting" rim,
    // the stray red nub and the thing peeking from behind the disc, all one
    // bug (user diagnosis 2026-08-18). The shadow follows the art's alpha for
    // the same reason the coin's does — a box-shadow draws a circle.
    background: url("../assets/token-golem.png") center center / contain
      no-repeat;
    border: 3px solid transparent;
    filter: drop-shadow(0 0 7px rgba(0, 0, 0, 0.55));
    cursor: pointer;
    transition: transform 200ms ease-in-out;
    transform: perspective(400px) rotateY(180deg);
    backface-visibility: hidden;
    position: absolute;
    left: 0;
    top: 0;
    // Both faces are the SAME COIN now, so there is no mismatched silhouette
    // to hide — the earlier 92% tuck (which shrank this disc so its ring
    // stopped showing through the coin's teeth) is retired. The ring goes
    // with it: the coin art carries its own edge.
    border-color: transparent;
    box-shadow: none;

    &:before {
      content: " ";
      display: block;
      padding-top: 100%;
    }

    // FT-985: superseded by `.player > .seat-numeral` below — the numeral is
    // no longer a child of the life token (this face is turned away in the
    // one state the numeral is now for). The rule stays in the tree
    // unreferenced, the way upstream's token.png and the retired `.ability`
    // box do.
    .seat-numeral {
      position: absolute;
      left: 0;
      // The coin art's face sits a touch high inside its own square (measured
      // on coin_4: the opaque box centres 4px above the image centre at 512,
      // ~0.8%), so the numeral follows the FACE rather than the element box —
      // which is why it read as off-centre (user report 2026-08-18).
      top: -0.8%;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      font-family: "PiratesBay", Georgia, serif;
      font-size: 2.2em;
      color: #14100a;
      text-shadow: 0 1px 1px rgba(255, 250, 235, 0.45);
      pointer-events: none;
      user-select: none;
    }
  }

  // FT-985 — THE SEAT'S ROMAN NUMERAL, on the face that is actually showing.
  // `.player`'s own child now, not the life token's, so it rides whichever
  // coin is turned toward the viewer instead of flipping away with one of
  // them. `showSeatNumeral` is what decides it appears at all; the geometry
  // is unchanged from the rule above — the same square box over the same
  // coin, with the same 0.8% lift onto the art's true centre.
  > .seat-numeral {
    position: absolute;
    left: 0;
    top: -0.8%;
    width: 100%;
    // SQUARE, like the coin it sits on — NOT `height: 100%`. `.player` is
    // taller than it is wide (the coin plus the name plate below it), so a
    // full-height box centred the numeral on the whole SEAT and dropped it
    // off the coin's face: measured 108x147 where the coin is 108x108. The
    // life token and the role coin get their own square from a padding-top
    // trick; this gets it from the aspect ratio directly.
    aspect-ratio: 1;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    font-family: "PiratesBay", Georgia, serif;
    font-size: 2.2em;
    color: #14100a;
    text-shadow: 0 1px 1px rgba(255, 250, 235, 0.45);
    pointer-events: none;
    user-select: none;
  }

  &.dead {
    &.no-vote .life:after {
      display: none;
    }

    .life {
      // Golem fork: our shroud disc (upstream death.png stays untouched)
      // the dead plate is the same coin, drained and cooled
      background-image: var(--coin-dead, url("../assets/token-golem-dead.png"));

      &:after {
        content: " ";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        background: url("../assets/vote-golem.png") center center no-repeat;
        background-size: 50%;
        height: 100%;
        pointer-events: none;
      }
    }
  }

  &.traveler .life {
    filter: grayscale(100%);
  }
}

#townsquare.public .player {
  .shroud {
    transform: perspective(400px) rotateX(90deg);
    pointer-events: none;
  }

  .life {
    transform: perspective(400px) rotateY(0deg);
  }

  &.traveler:not(.dead) .token {
    transform: perspective(400px) scale(0.8);
    pointer-events: none;
    transition-delay: 0s;
  }

  &.traveler.dead .token {
    transition-delay: 0s;
  }
}

/***** Role token ******/
.player .token {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  transition: transform 200ms ease-in-out;
  transform: perspective(400px) rotateY(0deg);
  backface-visibility: hidden;
}

#townsquare.public .circle .token {
  transform: perspective(400px) rotateY(-180deg);
}

/****** Player choice icons *******/
.player .overlay {
  width: 100%;
  position: absolute;
  pointer-events: none;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &:after {
    content: " ";
    display: block;
    padding-top: 100%;
  }
}
.player .overlay svg {
  position: absolute;
  filter: drop-shadow(0 0 3px black);
  z-index: 2;
  cursor: pointer;
  &.swap,
  &.move,
  &.nominate,
  &.vote,
  &.cancel {
    width: 50%;
    height: 60%;
    opacity: 0;
    pointer-events: none;
    transition: all 250ms;
    transform: scale(0.2);
    * {
      stroke-width: 10px;
      stroke: white;
      fill: url(#default);
    }
    &:hover *,
    &.fa-hand-paper * {
      fill: url(#demon);
    }
    &.fa-times * {
      fill: url(#townsfolk);
    }
  }
}

/* FT-974b — THE PAINTED VOTE PAIR.
 *
 * The X is `src/assets/icons/x.png` — the same painted mark every close
 * control in the app wears — recoloured black. The hand beside it is baked
 * from that same X's own brush texture, so the two are one material.
 *
 * BLACK, not purple: purple is the storyteller's colour here, and a player's
 * vote is not the storyteller's.
 *
 * The pair is replaced together because it IS a pair — two answers to one
 * question — and a painted X beside a vector hand mismatches worse than
 * leaving both alone would have.
 *
 * Neither mark carries a drawn outline. x.png HAS one (a cream edge, measured
 * at 5,084 px against 34,345 px of body), but at the 48x58 these render at it
 * is already lost to the downsample, so giving the hand a crisp ring made the
 * pair mismatch. Both are bare ink; the drop-shadows below do that job.
 *
 * ONE BLACK, ONE BONE — and that split is measured, not taste. Painting BOTH
 * marks black cost the yes-vs-no read across a ring: on the same 12x12 glance
 * metric the ghost was judged with, a yes-seat separated from a no-seat by
 * 14.0 with the old saturated pair and by only 8.1 with two black marks,
 * because the two answers then differed in silhouette alone and silhouette is
 * the first thing a glance discards. Opposite VALUES restore the polarity
 * that red-vs-blue was providing, without reaching for a team colour — which
 * is the whole reason red and blue had to go: $demon and $townsfolk are worn
 * by the coins these marks sit on, so the old pair read as team marking. The
 * bone end is x.png's own outline cream, and the hand carries x.png's own
 * brush texture, so the two are still one material. */
.player .overlay .vote-mark {
  position: absolute;
  z-index: 2;
  cursor: pointer;
  width: 50%;
  height: 60%;
  opacity: 0;
  pointer-events: none;
  transition: all 250ms;
  transform: scale(0.2);
  background-position: center center;
  background-repeat: no-repeat;
  background-size: contain;

  // each mark is thrown against its own opposite, so neither can sink into
  // the coin: a pale halo behind the black X, a dark one behind the bone hand
  &.yes {
    background-image: url("../assets/ui-vote-yes.png");
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.95));
  }

  &.no {
    background-image: url("../assets/ui-vote-no.png");
    filter: drop-shadow(0 0 4px rgba(250, 245, 235, 0.9));
  }

  &.yes:hover {
    filter: drop-shadow(0 0 7px rgba(0, 0, 0, 1));
  }

  &.no:hover {
    filter: drop-shadow(0 0 7px rgba(255, 252, 245, 1));
  }
}

// other player voted yes, but is not locked yet
#townsquare.vote .player.vote-yes .overlay .vote-mark.yes {
  opacity: 0.5;
  transform: scale(1);
}

// you voted yes | a locked vote yes | a locked vote no
#townsquare.vote .player.you.vote-yes .overlay .vote-mark.yes,
#townsquare.vote .player.vote-lock.vote-yes .overlay .vote-mark.yes,
#townsquare.vote .player.vote-lock:not(.vote-yes) .overlay .vote-mark.no {
  opacity: 1;
  transform: scale(1);
}

// a locked vote can be clicked on by the ST
#townsquare.vote:not(.spectator) .player.vote-lock .overlay .vote-mark {
  pointer-events: all;
}

// other player voted yes, but is not locked yet
#townsquare.vote .player.vote-yes .overlay svg.vote.fa-hand-paper {
  opacity: 0.5;
  transform: scale(1);
}

// you voted yes | a locked vote yes | a locked vote no
#townsquare.vote .player.you.vote-yes .overlay svg.vote.fa-hand-paper,
#townsquare.vote .player.vote-lock.vote-yes .overlay svg.vote.fa-hand-paper,
#townsquare.vote .player.vote-lock:not(.vote-yes) .overlay svg.vote.fa-times {
  opacity: 1;
  transform: scale(1);
}

// a locked vote can be clicked on by the ST
#townsquare.vote:not(.spectator) .player.vote-lock .overlay svg.vote {
  pointer-events: all;
}

li.from:not(.nominate) .player .overlay svg.cancel {
  opacity: 1;
  transform: scale(1);
  pointer-events: all;
}

li.swap:not(.from) .player .overlay svg.swap,
li.nominate .player .overlay svg.nominate,
li.move:not(.from) .player .overlay svg.move {
  opacity: 1;
  transform: scale(1);
  pointer-events: all;
}

/****** Vote icon ********/
.player .has-vote {
  color: #fff;
  filter: drop-shadow(0 0 3px black);
  transition: opacity 250ms;
  z-index: 2;

  #townsquare.public & {
    opacity: 0;
    pointer-events: none;
  }
}

.has-vote {
  position: absolute;
  margin-top: -15%;
  right: 2px;
}

/* FT-974 — the ghost's own vote, in place of the ballot box.
 *
 * PALETTE: the mark is baked in the seat ghost's exact tone, (198,214,228) —
 * the two are the same spirit, so they are the same material. The ballot box
 * was pure white, and white is this app's UI-CHROME voice (the on-block skull,
 * the name plates, the overlay hands); a white mark on a coin reads as a
 * button somebody stuck on the seat rather than as something belonging to the
 * dead player. Cold and slightly blue reads as MATERIAL.
 *
 * SIZE: 30px rather than the ballot box's 23. The hand's fingers and the two
 * eyes in its palm both survive at 30 and start to mush below it — measured on
 * a nearest-neighbour contact strip at true size, which is also where the
 * five-fingered version was caught reading as a comb.
 *
 * The dark drop-shadow is inherited from `.has-vote` above and is load-bearing
 * here: it is what keeps a pale mark off a pale coin rim.
 *
 * ── FT-991: THE MARK IS REDRAWN IN THE COWL'S IDIOM ─────────────────────────
 * FT-990 replaced the seat ghost with a hooded cowl and left this mark behind,
 * so the two marks on one dead seat were being drawn by two different hands.
 *
 * WHAT WAS ACTUALLY ORPHANED, precisely — it is not that the mark was old, it is
 * that it carried the two specific conventions FT-990 named as the cartoon and
 * removed: a SCALLOPED hem (three identical lobes, which is the Pac-Man tail)
 * and TWO HOLLOW EYES in the palm (a face, where the cowl's whole argument is
 * that a ghost's face should be an ABSENCE). `ui-ghost-vote-cowl.png` swaps
 * exactly those two — a TORN hem, right-to-left and uneven, from the cowl's own
 * bake; and no face at all — and changes nothing else, because everything else
 * about this mark was measured and won.
 *
 * WHICH IS THE WHOLE CONSTRAINT, restated: at 30px a mark gets ONE SILHOUETTE.
 * Three earlier attempts died on it (a raised arm read as a lump, five fingers
 * as a comb, a held token as a speech bubble), so three fingers and a thumb with
 * gaps wide enough to survive the downsample is not a style choice — it is the
 * only shape that has ever worked here.
 *
 * NINE CANDIDATES, JUDGED AT TRUE SIZE ON A REAL SEAT (rigs:
 * claude_temp_test/2026-08-20-ft991b-vote-bake.mjs and -vote-judge.mjs), scored
 * on whether a dead seat still holding a vote reads apart from one that has
 * spent it, six dead seats, three of each:
 *
 *                        sep    vs shipped
 *   shipped ............ 8.43 ...  0.00
 *   THIS (a4) .......... 8.55 ... +0.12
 *   the hooded figure
 *     raising a hand ... 11.55 .. +3.12
 *   the void-hand ...... 8.85 ... +0.42
 *   the same hand with
 *     drapery folds .... 8.33 ... -0.10
 *
 * THE HIGHEST SCORE WAS NOT TAKEN, and for FT-990's own reason — that lane
 * refused the death's-head on exactly this trade. The hooded figure wins by MASS
 * (56.7% ink against this one's 37.9%), and at the real 30px its hood's void
 * resolves into a single round eye: a face, which is the one convention this
 * whole restyle exists to remove. Numbers won, eyes lost.
 *
 * THE TWO REJECTED VARIANTS OF THIS DRAWING are worth recording because both
 * failures are about downsampling rather than taste. Drapery folds down the palm
 * brought the COMB back — three dark vertical strokes read as a continuation of
 * the gaps between the fingers, so the mark grew six fingers. And a VOID in the
 * palm reads as a hole: the cowl's void works because it sits where a FACE would
 * be, in a HEAD, and what carries over from the cowl is the FACELESSNESS, not
 * the void itself.
 *
 * PALETTE UNCHANGED at (198,214,228), and the reasoning is kept rather than
 * re-derived — see above. `ui-ghost-vote.png` stays in the tree, unreferenced,
 * the way `ui-ghost.png`, `shroud.png` and `token.png` already do. */
/* FT-996 (user call, 2026-08-20): the mark IS the cowl now — "move the cowl
 * to be the indicator for the ghost vote." The dead seat itself is moving to a
 * glass veil (FT-997), which frees the cowl to mean exactly one thing: an
 * unspent ghost vote. `ui-ghost-vote-cowl.png` (the hand) joins the unreferenced
 * retirees below. */
.player .has-vote.ghost-vote {
  width: 30px;
  height: 30px;
  background: url("../assets/ui-ghost-cowl.png") center center / contain
    no-repeat;
  cursor: pointer;
}

/****** Session seat glow *****/
// WHICH SEAT IS YOURS — a soft breath of light around your own coin.
//
// TWO USER CALLS, 2026-08-20. It used to animate `border-color` as well as a
// shadow, and the border it lit was a SQUARE: the token is a square box
// carrying round coin art, so a hard edge on that box draws a rectangle around
// a circle. "A hard border should never be a part of the pulse sequence — just
// do a very soft shadow pulse."
//
// So the border is out of the sequence entirely and only the shadow breathes,
// between a close halo and a wide one. A box-shadow follows its element's own
// border-radius, so rounding the box is what makes the light circular — the
// art inside is already round, so nothing of it is clipped by the change.
//
// It BREATHES rather than pulsing out and vanishing: the old keyframes ended
// at `transparent`, which reads as a repeating ping. A seat marker should say
// "this one is yours" continuously, not announce itself every five seconds.
// NO `border-radius` HERE, and the reason is written a file away: Token.vue's
// own comment records that `border-radius: 50%` CUT EVERY TOOTH crossing the
// inscribed circle, reported by the user on 2026-08-18 as "the coins look
// clipped". I reintroduced exactly that bug rounding this box for the halo,
// and the user reported it again the same way. The art carries its own edge.
//
// `filter: drop-shadow` instead of `box-shadow`, which is the better answer
// anyway: a box-shadow traces the ELEMENT'S BOX, so making it round needed the
// clip that broke the coin. A drop-shadow traces the ART'S OWN ALPHA — so the
// light follows the toothed wheel exactly, teeth and all, and no shape has to
// be imposed on the box at all.
@mixin glow($name, $color) {
  @keyframes #{$name}-glow {
    0%,
    100% {
      filter: drop-shadow(0 0 4px rgba($color, 0.55));
    }
    50% {
      filter: drop-shadow(0 0 11px rgba($color, 0.95));
    }
  }

  .player.you.#{$name} .token {
    animation: #{$name}-glow 5s ease-in-out infinite;
  }
}

@include glow("townsfolk", $townsfolk);
@include glow("outsider", $outsider);
@include glow("demon", $demon);
@include glow("minion", $minion);
@include glow("traveler", $traveler);

// the fallback for a seat with no team yet. NO `border-radius` here either —
// this is the rule that was still clipping the teeth after the mixin above
// dropped its own.
.player.you .token {
  animation: townsfolk-glow 5s ease-in-out infinite;
}

/****** Marked icon ******/
.player .marked {
  position: absolute;
  width: 100%;
  top: 0;
  filter: drop-shadow(0px 0px 6px black);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 250ms;
  opacity: 0;
  &:before {
    content: " ";
    padding-top: 100%;
    display: block;
  }
  svg {
    height: 60%;
    width: 60%;
    position: absolute;
    stroke: white;
    stroke-width: 15px;
    path {
      fill: white;
    }
  }
}
.player.marked .marked {
  opacity: 0.5;
}

/****** Seat icon ********/
.player .seat {
  position: absolute;
  left: 2px;
  margin-top: -15%;
  color: #fff;
  filter: drop-shadow(0 0 3px black);
  cursor: default;
  z-index: 2;
  &.highlight {
    animation-iteration-count: 1;
    animation: redToWhite 1s normal forwards;
  }
}

// highlight animation
@keyframes redToWhite {
  from {
    color: $demon;
  }
  to {
    color: white;
  }
}

.player.you .seat {
  color: $townsfolk;
}

/***** Player name *****/
.player > .name {
  right: 10%;
  display: flex;
  justify-content: center;
  font-size: 120%;
  line-height: 120%;
  cursor: pointer;
  white-space: nowrap;
  width: 120%;
  background: rgba(0, 0, 0, 0.5);
  border: 3px solid black;
  border-radius: 10px;
  top: 5px;
  box-shadow: 0 0 5px black;
  padding: 0 4px;

  /* The name plate is the seat MENU — move player, swap seats, empty the
     chair, nominate, claim — and it draws about 21px tall: fine to read, thin
     to hit. It grows, but only so far: the ring is tight on a phone and a
     plate tall enough for a 44px rule would collide with its neighbours'. */
  @media (pointer: coarse) {
    padding: 5px 4px;
  }

  svg {
    top: 3px;
    margin-right: 2px;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    flex-grow: 1;
  }

  #townsquare:not(.spectator) &:hover,
  &.active {
    color: red;
  }

  &:hover .pronouns {
    opacity: 1;
    color: white;
  }

  .pronouns {
    display: flex;
    position: absolute;
    right: 110%;
    max-width: 250px;
    z-index: 25;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    border: 3px solid black;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
    align-items: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity 200ms ease-in-out;
    padding: 0 4px;
    bottom: -3px;

    &:before {
      content: " ";
      border: 10px solid transparent;
      width: 0;
      height: 0;
      border-left-color: black;
      position: absolute;
      margin-left: 2px;
      left: 100%;
    }
  }
}

.player.dead > .name {
  opacity: 0.5;
}

/***** Player menu *****/
.player > .menu {
  position: absolute;
  left: 110%;
  bottom: -5px;
  text-align: left;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 5px;
  border-radius: 10px;
  border: 3px solid #000;
  margin-left: 15px;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);

  &:before {
    content: " ";
    width: 0;
    height: 0;
    position: absolute;
    border: 10px solid transparent;
    border-right-color: black;
    right: 100%;
    bottom: 5px;
    margin-right: 2px;
  }

  li:hover {
    color: red;
  }

  /* The add-reminder row stands in for the ring's plus disc, which only ever
     goes missing on a coarse pointer. A mouse still has the disc on the seat,
     so this row would be a second way to the same modal and a fifth line in
     every desktop menu — the ring there is untouched, and so is this. */
  li.rem-act {
    display: none;
    @media (pointer: coarse) {
      display: flex;
    }
  }

  /* the in-place edit row — the field this seat's rename/pronouns ask in,
     in place of the browser dialog they used to open */
  li.seat-edit {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: default;
    &:hover {
      color: white;
    }

    input {
      flex: 1;
      min-width: 0;
      width: 7em;
      color: white;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid #3d3d3d;
      border-radius: 4px;
      padding: 1px 6px;
      font-size: inherit;
      font-family: inherit;
      &:focus {
        outline: none;
        border-color: #a01414;
      }
    }

    .se-go,
    .se-no {
      cursor: pointer;
      opacity: 0.75;
      &:hover {
        opacity: 1;
        color: red;
      }
    }
  }

  /* the character's two entries read as one pair, above the player's */
  li.char-act {
    &.on {
      color: #ff8a8a;
    }
    & + li:not(.char-act) {
      border-top: 1px solid rgba(255, 255, 255, 0.14);
      margin-top: 3px;
      padding-top: 3px;
    }
  }

  li.disabled {
    cursor: not-allowed;
    opacity: 0.5;
    &:hover {
      color: white;
    }
  }

  /* A MENU ROW WAS 14px TALL on a phone (measured 375x812) — the thinnest
     target in the app, and it holds the seat's whole vocabulary. 40px is the
     size the fork's other coarse-pointer controls take (the phase button, the
     build actions), so the rows match them rather than inventing a third. */
  @media (pointer: coarse) {
    padding: 4px 8px;
    // A quarter-transparent plate was fine over four thin rows; at six
    // finger-sized ones it stands across the clock face and the filigree read
    // straight through the words. Opaque enough to be a plate.
    background: rgba(0, 0, 0, 0.92);
    li {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 40px;
    }
  }

  /* A LANDSCAPE PHONE is 375px tall and the menu wants 257 of them, so a
     chair near the horizon could not hold it whichever way it hung. Half the
     window is the room every chair is guaranteed (TownSquare flips the top
     half's menus to open downward for exactly this); the menu takes that and
     scrolls for the rest. Portrait never reaches the cap. */
  @media (pointer: coarse) and (max-height: 500px) {
    max-height: 45vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  svg {
    margin-right: 2px;
  }
}

/***** Ability text *****/
#townsquare.public .circle .ability {
  display: none;
}
.circle .player .shroud:hover ~ .token .ability,
.circle .player .token:hover .ability {
  opacity: 1;
}

/**** Night reminders ****/
.player .night-order {
  z-index: 3;
}

.player.dead .night-order em {
  color: #ddd;
  background: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, gray 100%);
}

/***** Reminder token *****/
.circle .reminder {
  // FT-940 (user call: "for these can we use the player coin as the
  // background as well?"): the reminder wears the SAME ground the character
  // coin wears — Token.vue's `.token` reads `var(--coin, url(token-golem.png))`,
  // painted onto the document root by golem/coinArt.js's applyCoin() (so
  // picking a different coin in the debug picker repaints every reminder
  // too, not just the seats); this is that property, not a second file that
  // merely looks similar. reminder-golem.png stays in the tree, unreferenced,
  // the same way every retired coin asset already does.
  background: var(--coin, url("../assets/token-golem.png")) center center;
  background-size: 100%;
  width: 50%;
  height: 0;
  padding-bottom: 50%;
  box-sizing: content-box;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 5px 0 0 -25%;
  border-radius: 50%;
  border: 3px solid black;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  transition: all 200ms;
  cursor: pointer;

  .text {
    line-height: 90%;
    color: black;
    font-size: 50%;
    font-weight: bold;
    text-align: center;
    margin-top: 50%;
    height: 100%;
    width: 100%;
    position: absolute;
    top: 15%;
    text-shadow: 0 1px 1px #f6dfbd, 0 -1px 1px #f6dfbd, 1px 0 1px #f6dfbd,
      -1px 0 1px #f6dfbd;
  }

  .icon,
  &:after {
    content: " ";
    position: absolute;
    top: 0;
    width: 90%;
    height: 90%;
    background-size: 100%;
    background-position: center 0;
    background-repeat: no-repeat;
    background-image: url("../assets/icons/plus.png");
    transition: opacity 200ms;
  }

  &:after {
    background-image: url("../assets/icons/x.png");
    opacity: 0;
    top: 5%;
  }

  &.add {
    // FT-911: no default `top` here any more — the disc's actual position
    // (beside the name plate) is measured per-seat in JS (measureAddAnchor)
    // and applied as an inline style; opacity alone keeps it hidden until
    // that lands and until a name-plate hover reveals it.
    opacity: 0;
    &:after {
      display: none;
    }
    .icon {
      top: 5%;
    }
  }

  &.custom {
    .icon {
      display: none;
    }
    .text {
      font-size: 70%;
      word-break: break-word;
      margin-top: 0;
      display: flex;
      align-items: center;
      align-content: center;
      justify-content: center;
      border-radius: 50%;
      top: 0;
    }
  }

  &:hover:before {
    opacity: 0;
  }
  &:hover:after {
    opacity: 1;
  }
}

.circle .reminderHoverTarget {
  opacity: 0;
  width: calc(50% + 8px);
  padding-top: calc(50% + 38px);
  margin-top: calc(-25% - 33px);
  margin-left: calc(-25% - 1px);
  border-radius: 0 0 999px 999px;
  pointer-events: auto;
  transform: none !important;
  z-index: -1;
}

/* THE NAME PLATE REVEALS IT, not the coin (user call 2026-08-19, raised three
   times — the card moved to the plate and this did not, which is the same
   mistake made twice on two different elements).

   The division is the one already drawn for the ability card: the COIN is what
   a storyteller does things to — drags onto, clicks, shrouds — and anything
   that appears under the cursor there is in the way of all of it. The PLATE is
   the part of a seat you only ever read, so it is where a seat's affordances
   answer from.

   Driven by a class rather than `:hover`, because the plate lives inside
   `.player` while the disc, until FT-911, was `.player`'s SIBLING — a hover
   selector could not reach across that, and `:has()` would leave the
   behaviour resting on a selector this fork does not use anywhere else.
   FT-911 moved the disc to be `.name`'s own sibling instead (see the
   template and measureAddAnchor), but this stays class-driven rather than
   switching to `:hover` — `.name`'s own hover already drives `nameHover`
   for the ability card (showCard/hideCard) via JS, and a second, divergent
   reveal mechanism for one sibling would be its own source of drift. */
.circle li.name-hover .reminder.add {
  opacity: 1;
}
.circle li.name-hover .reminder.add:before {
  opacity: 1;
}

/* ── REMINDERS ON A COARSE POINTER ──────────────────────────────────────────
   `.reminder.add` (the hover-revealed plus disc) is untouched below — this
   section is about the ADD affordance only. Placed reminders (the tokens a
   player actually puts on a seat) moved to their own section further down
   (FT-869) after this coarse-only fix turned out not to be the fix at all:
   it only ever touched the plus discs, and the pile the user kept reporting
   was the PLACED tokens, which this pointer-gated rule never reached. */

/* THE PLUS LEAVES THE RING. `(hover: none)` in media.scss pinned all eight
   of them open — the only alternative that stylesheet had, since a hover
   reveal is unreachable with a finger. The seat menu carries it now
   (`.rem-act`), so nothing is lost and the hub clears. The id keeps this
   above media.scss's own `.circle li .reminder.add`. */
#townsquare .circle li .reminder.add {
  @media (pointer: coarse) {
    display: none;
  }

  /* FT-911: BESIDE THE PLATE, not on the ring. The old anchor here —
     `margin-top: 68%; margin-left: calc(...)` — drifted the disc down onto
     the coin's own rim, the "note button in the wrong place" the user kept
     re-raising (fourth time, two of the earlier fixes moved a different
     element entirely). `position: absolute` is still needed here (the base
     `.circle .reminder` rule doesn't set it), but top/left/width/height are
     no longer percentage-of-seat math — they come from `measureAddAnchor`'s
     inline style (see the template's `addAnchorStyle` binding), sized to
     the plate's own rendered height and docked left or right of it by the
     seat's own outward vector. */
  position: absolute;
  z-index: 3;
}

/* FT-923: the bridge is hidden wherever the disc it serves is hidden — a
   coarse pointer never hovers anything, so there is no dead-ground bug to
   bridge there, and it would otherwise sit as a dead, invisible tap target
   in the gap the disc no longer occupies. (Its own `position: absolute` and
   geometry come from `addBridgeStyle`, the same inline-style pattern the
   disc above already uses — nothing else here needs setting.) */
#townsquare .circle li .name-bridge {
  @media (pointer: coarse) {
    display: none;
  }
}

/* ── PLACED REMINDERS FAN FROM THEIR OWN SEAT (FT-869) ──────────────────────
   A reminder used to render as a normal-flow sibling stacked BELOW the seat
   token inside the seat's own `li` — and that `li` IS the spoke from the
   seat to the ring's centre (TownSquare.vue's on-circle mixin: the li's
   height is the ring's radius, `transform-origin: 0 100%` pins its bottom to
   the hub). "Below the seat" is therefore "toward the hub" by construction,
   on EVERY pointer — the coarse-only fix above only ever caught the plus
   discs; the tokens people actually place were still walking to the centre
   (measured 1440x900, mouse: six placed chips already sitting on the hub —
   a bigger screen just gave them further to fall before it showed).

   The fix pins a reminder's radius to roughly where its own seat already
   sits — hugging the coin's own lower rim — and fans left/right instead of
   growing down. Sideways is the direction this ring actually has room in:
   neighbouring seats sit 60-235px apart centre-to-centre across 8-15 seats
   at 375-1280px wide (FT-869 rig), while the room PAST a seat's own rim is
   as little as 20px on desktop — too tight to grow a stack outward instead,
   which is why this pins the radius rather than pushing further out.

   Every offset is a PERCENT OF THE SEAT'S OWN WIDTH, via `margin`, not
   `top`/`left`. `top`/`left` percentages on an absolutely-positioned element
   resolve against the containing block's HEIGHT for `top` — here the li's
   height, which is the ring's RADIUS and swings wildly by seat count.
   Margin percentages resolve against the containing block's WIDTH on every
   side, `margin-top` included — the li's width is the SEAT's own width, so
   this scales with the coin regardless of how many seats are in the ring.

   `--ri` (this reminder's index) and `--rn` (this seat's reminder count)
   come from the template's `v-for`. A lone reminder (`--rn: 1`) still
   centres under the seat exactly as before — the fan only opens for two or
   more, so the common case looks unchanged. */
#townsquare .circle li .reminder:not(.add) {
  position: absolute;
  top: 0;
  left: 0;
  margin-top: 68%;
  margin-left: calc(-25% + (var(--ri, 0) - (var(--rn, 1) - 1) / 2) * 60%);
  // `.player` carries `z-index: 2` and (being `position: relative` with a
  // set z-index) opens its own stacking context — sibling elements at the
  // default `z-index: auto` lose to it outright, which is why the badge sat
  // BEHIND the seat's own name plate once it moved up to hug the coin
  // (measured 375x812: almost every badge fully hidden under the "Open" /
  // name pill). A badge overlapping its own seat is expected; hidden by it
  // is not.
  z-index: 3;

  @media (pointer: coarse) {
    /* two-thirds size, unchanged from the earlier touch fix — the fan
       tightens FURTHER to match (measured: 375x812/12 seats is the tightest
       ring the FT-869 rig covers, seats only 60px apart centre-to-centre;
       42% spacing grazed the next seat's own token 8 times there, 26%
       still grazed it by 1-2px vertically 4 times). 20% spacing plus a
       shallower tuck (66% vs 74%) clears every graze with room to spare. */
    width: 34%;
    padding-bottom: 34%;
    border-width: 2px;
    margin-top: 66%;
    margin-left: calc(-17% + (var(--ri, 0) - (var(--rn, 1) - 1) / 2) * 20%);
    .text {
      font-size: 38%;
      top: 10%;
    }
  }
}

// FT-944: scoped to `.circle` — the seat ring — not every `.reminder`
// anywhere under #townsquare. This file's style block is unscoped, and
// ReminderModal's own tiles (`ul.reminders > li.reminder`) render as
// TownSquare's sibling, inside #townsquare but outside `.circle` — so the
// bare selector this replaced also caught the picker itself, making the
// whole token list (custom note included) invisible and unclickable
// whenever the grimoire went public. The seat reminders this rule is FOR —
// placed tokens and the add-disc — are `.circle .reminder` already (see the
// FT-869/FT-911 rules above), so this narrowing changes nothing for them.
#townsquare.public .circle .reminder {
  opacity: 0;
  pointer-events: none;
}

// Night order is STORYTELLER information — the numbers say who wakes and in
// what order, and the badge text names the character outright ("The Imp
// points to a player"). The public grimoire and any spectator's own view
// must never carry it. (user report 2026-08-18: it was showing to players —
// the fork hid .ability and .reminder here but never covered this.)
#townsquare.public .night-order,
#townsquare.spectator .night-order {
  display: none;
}

/* FT-861: THE SCAN MARK. A seat that does not know what it is wears a warm
   collar on its name plate — enough to find at a glance while sweeping the
   ring, quiet enough that a town with three of them does not shout. The chip
   on the coin says WHAT they believe; this says only WHO. The `believing`
   class is already storyteller-and-grimoire-only (see beliefChip), so no
   `.public` / `.spectator` guard is needed here — but the coin's chip flips
   away with the coin in the public view for the same reason. */
.player.believing > .name {
  border-color: #b8892f;
  box-shadow: 0 0 6px rgba(184, 137, 47, 0.55);
}
</style>
