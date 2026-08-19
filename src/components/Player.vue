<template>
  <li :style="zoom">
    <div
      ref="player"
      class="player"
      @dragover.prevent
      @drop="onRoleDrop"
      @mouseenter="showCard"
      @mouseleave="hideCard"
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
      <div class="shroud" @click="onLifeClick"></div>
      <div class="life" @click="onLifeClick">
        <!-- the seat's Roman numeral rides the parchment until a role
             lands on the chair (user call) -->
        <span class="seat-numeral" v-if="!player.role || !player.role.id">{{
          seatNumeral
        }}</span>
      </div>

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
      <Token
        :role="player.role"
        :hover-card="false"
        :belief="beliefChip"
        :draggable="String(!!player.role.id && !session.isSpectator)"
        @dragstart.native="onRoleDragStart"
        @set-role="$emit('trigger', ['openRoleModal'])"
        @set-belief="$emit('trigger', ['openBeliefModal'])"
      />

      <!-- FT-858: the seat's read is THE role hover card — the same component
           the Almanac workbench's shelf and the grimoire drawer use
           (user-directed: one component, every surface). The seat owns the
           hover rather than the coin, because the shroud and the life token
           sit over the coin's top half and would swallow it there. -->
      <RoleHoverCard
        v-if="cardAnchor"
        :role="player.role"
        :anchor="cardAnchor"
        @dismiss="hideCard"
      />

      <!-- Overlay icons -->
      <div class="overlay">
        <font-awesome-icon
          icon="hand-paper"
          class="vote"
          title="Hand UP"
          @click="vote()"
        />
        <font-awesome-icon
          icon="times"
          class="vote"
          title="Hand DOWN"
          @click="vote()"
        />
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

      <!-- Ghost vote icon -->
      <font-awesome-icon
        icon="vote-yea"
        class="has-vote"
        v-if="player.isDead && !player.isVoteless"
        @click="updatePlayer('isVoteless', true)"
        title="Ghost vote"
      />

      <!-- On block icon -->
      <div class="marked">
        <font-awesome-icon icon="skull" />
      </div>
      <div
        class="name"
        @click="isMenuOpen = !isMenuOpen"
        :class="{ active: isMenuOpen }"
      >
        <!-- an unclaimed chair says so instead of a fake name (user call) -->
        <span>{{ player.id ? player.name : "Open" }}</span>
        <font-awesome-icon icon="venus-mars" v-if="player.pronouns" />
        <div class="pronouns" v-if="player.pronouns">
          <span>{{ player.pronouns }}</span>
        </div>
      </div>

      <transition name="fold">
        <ul class="menu" v-if="isMenuOpen">
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
    <!-- `--rn` so the add disc can sit one slot past the last placed
         reminder (see the `.reminder.add` rule) -->
    <div
      class="reminder add"
      :style="{ '--rn': player.reminders ? player.reminders.length : 0 }"
      @click="$emit('trigger', ['openReminderModal'])"
    >
      <span class="icon"></span>
    </div>
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
import { mapGetters, mapState } from "vuex";

// how long the cursor has to rest on a seat before its card appears — enough
// that sweeping across the square does not strobe cards
const HOVER_DELAY = 170;

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
      return isBelieving(this.player) ? this.player.believedRole : null;
    },
    /** This chair's character is the one currently in hand. */
    roleArmed() {
      return (
        !!this.$store.state.drawerPick &&
        this.$store.state.drawerPickFrom === this.index
      );
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
    }
  },
  data() {
    return {
      isMenuOpen: false,
      // Golem fork: the name to apply once a one-tap claim lands.
      pendingName: null,
      // Golem fork: first claim on this browser asks the name in place.
      askName: false,
      claimName: "",
      isSwap: false,
      // FT-858: the coin the seat's hover card is pinned to; null when
      // nothing is showing
      cardAnchor: null
    };
  },
  beforeDestroy() {
    clearTimeout(this.$options.cardTimer);
  },
  watch: {
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
    }
  },
  methods: {
    /**
     * FT-858: rest on a seat and it tells you what its character does.
     *
     * The whole seat is the target, not just the coin — the shroud covers the
     * coin's top half and the life token covers all of it, and a card you can
     * only raise from the lower half of a chair is worse than none.
     *
     * It reads what the SQUARE already shows: in the player-facing view the
     * coins are turned away, so nothing but a traveler (whose character is
     * public knowledge) has a card to raise.
     */
    showCard(e) {
      const role = this.player.role;
      if (!role || !role.id) return;
      if (this.grimoire.isPublic && role.team !== "traveler") return;
      if (!window.matchMedia("(hover: hover)").matches) return;
      const seat = e.currentTarget;
      clearTimeout(this.$options.cardTimer);
      this.$options.cardTimer = setTimeout(() => {
        // pinned to the COIN, so the card sits level with the character it
        // describes rather than with the name plate under it
        this.cardAnchor = seat.querySelector(".token") || seat;
      }, HOVER_DELAY);
    },
    hideCard() {
      clearTimeout(this.$options.cardTimer);
      this.cardAnchor = null;
    },
    changePronouns() {
      if (this.session.isSpectator && this.player.id !== this.session.playerId)
        return;
      const pronouns = prompt("Player pronouns", this.player.pronouns);
      //Only update pronouns if not null (prompt was not cancelled)
      if (pronouns !== null) {
        this.updatePlayer("pronouns", pronouns, true);
      }
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
      const name = prompt("Player name", this.player.name) || this.player.name;
      this.updatePlayer("name", name, true);
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
  &:hover {
    opacity: 1;
    color: red;
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
    &:active {
      background: rgba(0, 0, 0, 0.6);
      color: red;
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
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.8));

    &:before {
      content: " ";
      background: url("../assets/shroud.png") center -10px no-repeat;
      background-size: auto 110%;
      position: absolute;
      margin-left: -50%;
      width: 100%;
      height: 100%;
      left: 50%;
      top: -30%;
      opacity: 0;
      transform: perspective(400px) scale(1.5);
      transform-origin: top center;
      transition: all 200ms;
      pointer-events: none;
    }

    #townsquare.spectator & {
      pointer-events: none;
    }

    // the shroud previews on hover — but NOT while the town is still being
    // built (user call 2026-08-18): nothing can die yet, and the banner
    // flashing over every seat while assigning roles reads as an error
    #townsquare:not(.spectator):not(.building) &:hover:before {
      opacity: 0.5;
      top: -10px;
      transform: scale(1);
    }
  }

  &.dead .shroud:before {
    opacity: 1;
    top: 0;
    transform: perspective(400px) scale(1);
  }

  #townsquare:not(.spectator) &.dead .shroud:hover:before {
    opacity: 1;
  }
}

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

/****** Session seat glow *****/
@mixin glow($name, $color) {
  @keyframes #{$name}-glow {
    0% {
      box-shadow: 0 0 rgba($color, 1);
      border-color: $color;
    }
    50% {
      border-color: black;
    }
    100% {
      box-shadow: 0 0 20px 16px transparent;
      border-color: $color;
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
  // Golem fork: our parchment reminder disc (upstream reminder.png untouched)
  background: url("../assets/reminder-golem.png") center center;
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
    opacity: 0;
    top: 30px;
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

.circle li:hover .reminder.add {
  opacity: 1;
  top: 0;
}
.circle li:hover .reminder.add:before {
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

  /* AND IT COMES WITH THEM. When placed reminders moved to the seat's outer
     rim (below), the add disc was left on its old anchor — `top: 30px` down
     the spoke — so it drifted away from the seat it belongs to and sat on its
     own out in the ring. That is the "note button in the wrong place".
     It takes the same radius as a placed reminder and lands one slot past the
     last one, so it never covers a reminder and never moves the ones already
     there (giving it a slot INSIDE the fan would re-centre the whole group
     every time a hover revealed it). */
  position: absolute;
  top: 0;
  left: 0;
  margin-top: 68%;
  margin-left: calc(-25% + (var(--rn, 0) - (var(--rn, 1) - 1) / 2) * 60%);
  z-index: 3;
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

#townsquare.public .reminder {
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
