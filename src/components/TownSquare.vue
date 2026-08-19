<template>
  <div
    id="townsquare"
    class="square"
    :class="{
      public: grimoire.isPublic,
      spectator: session.isSpectator,
      vote: session.nomination,
      // the host is still building the town — no death affordances yet
      building:
        !!session.sessionId &&
        !session.isSpectator &&
        !session.isRolesDistributed
    }"
  >
    <!-- Golem fork (FT-848): the tower's face keeps the count. Every death
         stains the wedge of the dial that belongs to that seat, so a town
         that has lost half its players shows a visibly bloodier clock.
         Sits under the seats and their names; never takes a click. -->
    <div class="blood-dial" aria-hidden="true" v-if="deadStains.length">
      <div
        class="stain"
        v-for="stain in deadStains"
        :key="stain.key"
        :style="stain.style"
      ></div>
    </div>

    <ul class="circle" :class="['size-' + players.length]">
      <Player
        v-for="(player, index) in players"
        :key="index"
        ref="players"
        :player="player"
        @trigger="handleTrigger(index, $event)"
        :class="{
          from: Math.max(swap, move, nominate) === index,
          swap: swap > -1,
          move: move > -1,
          nominate: nominate > -1
        }"
      ></Player>
    </ul>

    <!-- Golem fork (2026-08-19, user call twice): the demon's bluffs sit
         next to the demon's OWN seat, not in a corner — they are that
         seat's three characters, not the screen's edge. `bluffAnchor`
         (measured off the demon's rendered coin — see `measureBluffAnchor`
         below) drives `left`/`top`; it stays null — and this same element
         falls back to the ORIGINAL corner position, untouched, above in
         this file's <style> block — for the one case no seat can be found:
         no demon dealt yet (an undealt town, or a script mid-build). One
         element, never deleted; only where it docks changed.

         `canSeeBluffs` (STORYTELLER ONLY, by construction — see below) is a
         v-if, not a CSS rule: a player's DOM never contains the Tokens
         inside, so there is no role name or icon to find even by
         inspecting devtools, unlike the old `#townsquare.public > .bluffs`
         CSS-only hide (still in the stylesheet, untouched, and still the
         right belt for the host's own public/mirrored screen). -->
    <div
      class="bluffs"
      v-if="players.length && canSeeBluffs"
      ref="bluffs"
      :class="{ closed: !isBluffsOpen, anchored: !!bluffAnchor }"
      :style="bluffAnchorStyle"
    >
      <h3 :style="bluffTitleStyle">
        <!-- This div only ever renders for the storyteller now (see
             canSeeBluffs), so the spectator title below can never be
             reached — kept rather than deleted, the same never-delete
             idiom Player.vue uses for showNightBadges/showSeatSplat. -->
        <span v-if="session.isSpectator">Other characters</span>
        <span v-else>Demon bluffs</span>
        <font-awesome-icon icon="times-circle" @click.stop="toggleBluffs" />
        <font-awesome-icon icon="plus-circle" @click.stop="toggleBluffs" />
      </h3>
      <ul>
        <li
          v-for="index in bluffSize"
          :key="index"
          :style="bluffCoinStyle(index - 1)"
          @click="openRoleModal(index * -1)"
        >
          <Token :role="bluffs[index - 1]"></Token>
        </li>
      </ul>
    </div>

    <div class="fabled" :class="{ closed: !isFabledOpen }" v-if="fabled.length">
      <h3>
        <span>Fabled</span>
        <font-awesome-icon icon="times-circle" @click.stop="toggleFabled" />
        <font-awesome-icon icon="plus-circle" @click.stop="toggleFabled" />
      </h3>
      <ul>
        <li
          v-for="(role, index) in fabled"
          :key="index"
          @click="removeFabled(index)"
        >
          <div
            class="night-order first"
            v-if="nightOrder.get(role).first && grimoire.isNightOrder"
          >
            <em>{{ nightOrder.get(role).first }}.</em>
            <span v-if="role.firstNightReminder">{{
              role.firstNightReminder
            }}</span>
          </div>
          <div
            class="night-order other"
            v-if="nightOrder.get(role).other && grimoire.isNightOrder"
          >
            <em>{{ nightOrder.get(role).other }}.</em>
            <span v-if="role.otherNightReminder">{{
              role.otherNightReminder
            }}</span>
          </div>
          <Token :role="role"></Token>
        </li>
      </ul>
    </div>

    <ReminderModal :player-index="selectedPlayer"></ReminderModal>
    <RoleModal
      :player-index="selectedPlayer"
      :for-belief="beliefMode"
    ></RoleModal>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import Player from "./Player";
import Token from "./Token";
import ReminderModal from "./modals/ReminderModal";
import RoleModal from "./modals/RoleModal";

// Golem fork (FT-848): the re-baked dried-blood stains, bundled once for the
// whole dial. (The older per-seat splats in ../assets/blood/splats stay in the
// tree, unreferenced.)
const stainCtx = require.context("../assets/blood/stains", false, /\.png$/);
const STAINS = stainCtx
  .keys()
  .sort()
  .map(stainCtx);

// The dial, in the background art's own pixels (see --fpx in App.vue): both
// clocktower backgrounds are trimmed to 1642x900 with the face centred
// EXACTLY at the image centre (recentred FT-anon 2026-08-19 — the originals
// were 1672x941 with the face at (851,450), +15,-20.5 off-centre, which
// .blood-dial .stain used to carry as a baked-in offset). The rose runs out
// to r~250 (see --face-r in App.vue for the measured rim radius).
//
// Stains ride the OUTER band of the face: the hub carries the town readout
// (script name, alive/dead counts), so blood is kept off it and the wedges
// still read as belonging to their seats.
const STAIN_RADIUS = 185;
// stain size = SPAN / sqrt(seats): the face's area split n ways, so a 5-seat
// town gets big stains and a 20-seat town small ones, and either town ends up
// properly drenched once everyone is dead. Capped so a small town's stains
// stay on the face instead of washing over the stonework.
const STAIN_SPAN = 470;
const STAIN_MAX = 172;

/** FNV-1a over a string — the hash the stains already use for size and lie. */
const hashString = str => {
  let h = 2166136261;
  for (let c = 0; c < str.length; c++) {
    h ^= str.charCodeAt(c);
    h = (h * 16777619) >>> 0;
  }
  return h;
};

/**
 * A SHUFFLE BAG of stain indices: all 16 are dealt before any of them repeats
 * (user call 2026-08-18 — repeats were showing on the dial).
 *
 * Hashing a seat straight into the set, the way its size and lie are hashed,
 * collides long before the set runs out: seven deaths drawing from 16 stains
 * repeat more often than not. A permutation cannot.
 *
 * Deterministic on purpose, like everything else about a stain: the order is
 * dealt from the town's OWN id, so every client derives the same bag from
 * already-synced state and nothing new goes over the wire. Two towns stain
 * differently; the same town stains identically in every browser watching it.
 *
 * Indexed by SEAT rather than by order of death, which matters: a seat's mark
 * is then fixed for the whole game, instead of changing texture under the
 * player's eyes when somebody else dies.
 */
const stainOrder = seed => {
  const bag = STAINS.map((_, i) => i);
  let s = hashString(seed) || 1;
  const next = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const swap = bag[i];
    bag[i] = bag[j];
    bag[j] = swap;
  }
  return bag;
};

export default {
  components: {
    Player,
    Token,
    RoleModal,
    ReminderModal
  },
  computed: {
    ...mapGetters({ nightOrder: "players/nightOrder" }),
    ...mapState(["grimoire", "roles", "session"]),
    ...mapState("players", ["players", "bluffs", "fabled"]),
    /**
     * Golem fork (FT-848): one stain per dead seat, laid on that seat's wedge
     * of the clock face.
     *
     * A seat's angle is the ONLY thing that places its stain: seat i sits at
     * (i+1) * 360/n clockwise from 12 o'clock, which is exactly the angle the
     * on-circle mixin rotates that seat's spoke to. Both read the same
     * players.length, so the stain stays under its seat at any town size and
     * follows the ring when seats are added, removed, moved or swapped.
     *
     * Everything else about a stain — which of the 16 it is, how big, how far
     * out, how it lies — is hashed from seat + name, so every client paints
     * the same dial from the already-synced death state with no extra sync.
     * Stains accumulate: five deaths put five separate marks on the face.
     */
    deadStains() {
      const count = this.players.length;
      if (!count) return [];
      // dealt per town, so two towns do not stain alike
      const bag = stainOrder(this.session.sessionId || "golem");
      const stains = [];
      this.players.forEach((player, i) => {
        if (!player.isDead) return;
        const angle = ((i + 1) * 360) / count;
        const key = i + "·" + player.name;
        const h = hashString(key);
        const base = Math.min(STAIN_MAX, STAIN_SPAN / Math.sqrt(count));
        const size = base * (0.88 + ((h >> 4) % 28) / 100);
        const radius = STAIN_RADIUS + (((h >> 12) % 29) - 14);
        const spin = ((h >> 18) % 51) - 25;
        stains.push({
          key,
          style: {
            backgroundImage: `url(${STAINS[bag[i % STAINS.length]]})`,
            width: `calc(${size.toFixed(1)} * var(--fpx))`,
            height: `calc(${size.toFixed(1)} * var(--fpx))`,
            // centre on the dial, swing out along the seat's own angle, then
            // let the splatter lie a little off-square
            transform:
              `translate(-50%, -50%) rotate(${angle.toFixed(2)}deg)` +
              ` translateY(calc(${(-radius).toFixed(1)} * var(--fpx)))` +
              ` rotate(${spin}deg)`
          }
        });
      });
      return stains;
    },
    /**
     * Golem fork (2026-08-19): STORYTELLER ONLY, by construction — the exact
     * guard Player.vue's `beliefChip` already established for "genuinely
     * storyteller, in the grimoire" (`session.isSpectator` catches every
     * non-host client, a seated player included — this app has no separate
     * player/spectator flag; `grimoire.isPublic` catches the host's own
     * screen while the grimoire is face-down, including a mirrored public
     * display). HostTools.vue auto-flips isPublic false the moment the host
     * deals a town (`rolesAssigned` watcher: "assigned role flips the
     * grimoire face-up"), so this is reachable exactly when it needs to be
     * and no more.
     *
     * A v-if downstream, not a CSS rule: the bluff Tokens simply never
     * render for anyone this returns false for, so there is no role name
     * or icon in that DOM to find — the leak the old CSS-only
     * `#townsquare.public > .bluffs` hide left open (still in the
     * stylesheet, untouched, and still correct belt-and-braces for the
     * host's own mirrored screen).
     */
    canSeeBluffs() {
      return !this.session.isSpectator && !this.grimoire.isPublic;
    },
    /**
     * The seat this town's bluffs belong to: the first demon seated, or -1
     * before any demon is dealt (an undealt town, or a script mid-build) —
     * `bluffAnchor` stays null in that case and the panel falls back to the
     * static corner position. A script with more than one demon (Legion)
     * still anchors to the first found; it is never wrong, only plain.
     */
    demonIndex() {
      return this.players.findIndex(
        player => player.role && player.role.team === "demon"
      );
    },
    /**
     * The demon seat's own measured width as `--seat-sz` (inherited by
     * every child below — custom properties inherit) — every anchored-state
     * size rule in this file's <style> block reads off that ONE variable,
     * so the cluster scales exactly how Player.vue's `zoom` already scaled
     * that seat (a 6-seat town's big coins down to a 15-seat town's small
     * ones) without this file re-deriving that formula. Null (no demon
     * found yet) means no inline override — the static corner CSS applies
     * untouched.
     *
     * `left`/`top` are NOT set here (2026-08-19 fix — see measureBluffAnchor):
     * the title and each coin are positioned INDEPENDENTLY (bluffTitleStyle /
     * bluffCoinStyle below), each with its own fully-computed pixel centre.
     * An earlier pass centred this whole container (h3 stacked over ul) on
     * one anchor point — but h3's own height then pushed the coin row away
     * from that point by a FIXED SCREEN-SPACE amount (h3 sits above ul in
     * normal block flow), which is only "further from the hub" for a seat
     * at the top of the ring; for other seats it silently ate back part of
     * the outward clearance and the coins drifted into the reminder band
     * (measured — see the collision table in claude_temp_test/
     * 2026-08-19-bluffs-seat.mjs before/after this fix).
     */
    bluffAnchorStyle() {
      if (!this.bluffAnchor) return null;
      return { "--seat-sz": `${this.bluffAnchor.size}px` };
    },
    /** The title pill's own centre point — a little further outward than
     *  the coin row, so it reads as sitting ABOVE the fan rather than among
     *  it. Null (no demon) leaves h3 in the static corner's normal flow. */
    bluffTitleStyle() {
      if (!this.bluffAnchor) return null;
      const { left, top } = this.bluffAnchor.title;
      return { left: `${left}px`, top: `${top}px` };
    }
  },
  data() {
    // FT-870: BLUFFS/FABLED DEFAULT CLOSED ON A PHONE. Open, the panel is a
    // stacked 3-coin column in portrait (~42vh) or a wide row in landscape —
    // taller/wider than the room a phone ever has to give it, because the
    // ring already gives up height to the checklist or a bottom sheet
    // (`#app.checklist-up` / `.sheet-up`, TownSquare's own style block below).
    // Measured 375x812: open by default, the panel rode up over three seats
    // with the checklist out (FT-870).
    //
    // Collapsing costs nothing here — `#townsquare.public > .bluffs` is
    // already invisible to everyone but the storyteller, so a phone-only
    // default only has to serve the one person who ever sees it, and the
    // existing toggle (the same +/- icon every viewport uses) reopens it in
    // one tap.
    const isPhone =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    return {
      selectedPlayer: 0,
      // FT-861: which job the role picker is doing — the seat's CHARACTER, or
      // the character it SHOWS its player. Both entry points set it, so the
      // grid never has to remember what it was opened for.
      beliefMode: false,
      bluffSize: 3,
      swap: -1,
      move: -1,
      nominate: -1,
      isBluffsOpen: !isPhone,
      isFabledOpen: !isPhone,
      // Golem fork (2026-08-19): where the bluffs cluster docks — null
      // until measureBluffAnchor finds a demon seat, meaning "use the
      // static corner CSS" (see bluffAnchorStyle / the .anchored rules).
      bluffAnchor: null
    };
  },
  watch: {
    // A demon claimed or vacated the anchor seat.
    demonIndex() {
      this.$nextTick(this.measureBluffAnchor);
    },
    // Seats added/removed resize every coin (Player.vue's `zoom`).
    "players.length"() {
      this.$nextTick(this.measureBluffAnchor);
    },
    // The zoom slider resizes every coin without resizing #townsquare
    // itself, so the ResizeObserver below never fires for it on its own.
    "grimoire.zoom"() {
      this.$nextTick(this.measureBluffAnchor);
    },
    // The grimoire just opened (or the panel just became visible) — get a
    // fresh reading rather than trusting whatever was measured while
    // hidden (a display:none/v-if'd subtree can read zero-size).
    canSeeBluffs(val) {
      if (val) this.$nextTick(this.measureBluffAnchor);
    }
  },
  mounted() {
    this.measureBluffAnchor();
    window.addEventListener("resize", this.measureBluffAnchor);
    window.addEventListener("orientationchange", this.measureBluffAnchor);
    // Catches everything a resize event misses: #townsquare's own box
    // changes size on its own (the building-tools/checklist-up/sheet-up
    // height squeezes in this file's <style> block) without the WINDOW
    // resizing at all.
    if (typeof ResizeObserver !== "undefined") {
      this._bluffRO = new ResizeObserver(() => this.measureBluffAnchor());
      this._bluffRO.observe(this.$el);
    }
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.measureBluffAnchor);
    window.removeEventListener("orientationchange", this.measureBluffAnchor);
    if (this._bluffRO) this._bluffRO.disconnect();
  },
  methods: {
    /**
     * Golem fork (2026-08-19): measures the demon's own rendered coin and
     * parks `bluffAnchor` just past its outer rim — the OUTWARD side, away
     * from the ring's centre, in the slack `.circle`'s own `--seat-reserve`
     * comment already documents (half a seat-width of overhang, provisioned
     * for exactly this kind of thing). Reminders (Player.vue's
     * `.reminder:not(.add)`) fan the OTHER way — `margin-top: 68%` of the
     * seat's own width pulls them in-and-sideways, toward the hub — so the
     * two never compete for the same band.
     *
     * A measured DOM position, not a re-derivation of the ring's own
     * rotate()/vmin math: the ring's radius, each seat's width, and even
     * which CSS is currently binding (portrait's max-height cap, a phone's
     * building-tools height squeeze) are already Player.vue's / this
     * file's own <style> block's concerns — reimplementing that geometry a
     * second time here is exactly the parallel-build MEMORY-CORE rule 2
     * warns against. Reading the box already laid out is the single source
     * of truth; Player.vue's own `cardAnchor` (the role hover card) anchors
     * off a measured DOM element the same way.
     */
    measureBluffAnchor() {
      const idx = this.demonIndex;
      const seatVm =
        idx >= 0 && this.$refs.players ? this.$refs.players[idx] : null;
      const seatLi = seatVm && seatVm.$el;
      const seatEl = seatLi && seatLi.querySelector(".player .life");
      const rootEl = this.$el;
      if (!seatLi || !seatEl || !rootEl) {
        this.bluffAnchor = null;
        return;
      }
      const seatRect = seatEl.getBoundingClientRect();
      const rootRect = rootEl.getBoundingClientRect();
      if (!seatRect.width) {
        this.bluffAnchor = null;
        return;
      }
      const seatCx = seatRect.left + seatRect.width / 2;
      const seatCy = seatRect.top + seatRect.height / 2;
      /**
       * The seat's own OUTWARD direction, read directly off its <li>'s
       * rotation — NOT re-derived from the ring's bounding box (an earlier
       * pass here used seat-centre-minus-ring-bbox-centre, and it pointed
       * the wrong way for several seats: measured, `.circle`'s box is
       * WIDER than it is tall, is not centred on the true rotation hub,
       * and the on-circle mixin's own "move reminders closer to the
       * sides" per-seat `margin-bottom` means seats are not even
       * equidistant from that hub — 96px to 126px away across one 15-seat
       * town. That surfaced as reminder collisions with no radial logic
       * to them; see claude_temp_test/2026-08-19-bluffs-seat.mjs).
       *
       * The mixin rotates each seat's <li> by `((i+1) * 360 / count)deg`
       * and the seat's own content counter-rotates to stay upright — so
       * the LI's OWN computed transform matrix is the ring's ground
       * truth for "which way is outward from this seat", independent of
       * any box geometry. `matrix(a, b, c, d, e, f)` maps local "straight
       * up" (0, -1) — the outward direction before rotation, since the
       * li's un-rotated top edge is the point farthest from the hub — to
       * screen-space (-c, -d).
       */
      let ox = 0;
      let oy = -1;
      const matrix = /matrix\(([^)]+)\)/.exec(getComputedStyle(seatLi).transform);
      if (matrix) {
        const parts = matrix[1].split(",").map(Number);
        ox = -parts[2]; // -c
        oy = -parts[3]; // -d
      }
      const odist = Math.hypot(ox, oy) || 1;
      ox /= odist;
      oy /= odist;
      // The tangent (perpendicular to outward) — the direction the 3 coins
      // fan ALONG, mirroring how Player.vue's own reminders fan sideways
      // (`--ri`/`--rn`) rather than growing further down the spoke.
      const tx = -oy;
      const ty = ox;
      const size = seatRect.width;
      const rootLeft = rootRect.left;
      const rootTop = rootRect.top;
      /**
       * How far outward each coin sits is MEASURED per slot, not a fixed
       * guess: it reads THIS seat's own reminder band (if any, in both
       * the radial AND tangential directions — see reminderBoxes below)
       * and clears it, with a margin for the coin's own half-size. A
       * single hard-coded distance from the seat's centre turned out not
       * to hold across seats OR across the three fanned slots — the
       * on-circle mixin nudges each seat's OWN coin within its <li> by a
       * different amount per seat (`.player { margin-bottom: ... }`,
       * "move reminders closer to the sides of the circle"), and a
       * reminder's own sideways fan (Player.vue's `--ri`/`--rn`) only
       * threatens the SPECIFIC fan slot it lines up with tangentially,
       * not all three (measured — see the collision table in
       * claude_temp_test/2026-08-19-bluffs-seat.mjs before this fix).
       * Reading the actual band sidesteps needing to know why it moves.
       *
       * Proof requirement #1 allows a bluff coin to sit ON the demon's own
       * seat coin (only OTHER seats' coins and ANY reminder are off
       * limits), so there is no separate "clear the coin itself" term —
       * only the reminder band, when this seat has one.
       */
      // A coin is 0.4 seat-widths square (see the CSS below) — half-width
      // 0.2, but a corner reaches its half-DIAGONAL, ~0.283, and a
      // margin pinned exactly to that touches rather than clears (measured
      // — a 0.24 margin left a 1-2px sliver overlap on a diagonal corner).
      // 0.36 clears the diagonal with real room to spare.
      const COIN_HALF = 0.36; // this cluster's own coin, in seat-widths
      const BASE_RADIAL = 0.5; // a bare coin, nothing to clear
      const SPREAD = 0.34; // tangential spacing between the 3 fan slots
      // Each reminder's own footprint, in (tangent, radial) seat-width
      // units relative to the seat's centre — computed once, reused for
      // every slot's clearance check below.
      const reminderBoxes = [];
      seatLi.querySelectorAll(".reminder:not(.add)").forEach(rEl => {
        const rRect = rEl.getBoundingClientRect();
        if (!rRect.width) return;
        let minT = Infinity;
        let maxT = -Infinity;
        let maxR = -Infinity;
        [
          [rRect.left, rRect.top],
          [rRect.right, rRect.top],
          [rRect.left, rRect.bottom],
          [rRect.right, rRect.bottom]
        ].forEach(([cx, cy]) => {
          const t = ((cx - seatCx) * tx + (cy - seatCy) * ty) / size;
          const r = ((cx - seatCx) * ox + (cy - seatCy) * oy) / size;
          minT = Math.min(minT, t);
          maxT = Math.max(maxT, t);
          maxR = Math.max(maxR, r);
        });
        reminderBoxes.push({ minT, maxT, maxR });
      });
      // This slot's own outward distance: BASE_RADIAL, or far enough to
      // clear every reminder whose tangential footprint reaches into
      // this slot's own tangential span.
      const radialFor = tangentCenter => {
        let radial = BASE_RADIAL;
        reminderBoxes.forEach(rb => {
          const overlapsTangentially =
            tangentCenter - COIN_HALF < rb.maxT && tangentCenter + COIN_HALF > rb.minT;
          if (overlapsTangentially) radial = Math.max(radial, rb.maxR + COIN_HALF);
        });
        return radial;
      };
      const point = (radial, tangent) => ({
        left: seatCx - rootLeft + ox * size * radial + tx * size * tangent,
        top: seatCy - rootTop + oy * size * radial + ty * size * tangent
      });
      this.bluffAnchor = {
        size,
        title: point(radialFor(0) + 0.46, 0),
        coins: [-1, 0, 1].map(k => point(radialFor(SPREAD * k), SPREAD * k))
      };
    },
    /** This bluff slot's own computed centre (see measureBluffAnchor) — null
     *  (no demon found) leaves the slot in the static corner's flex row. */
    bluffCoinStyle(i) {
      if (!this.bluffAnchor) return null;
      const { left, top } = this.bluffAnchor.coins[i];
      return { left: `${left}px`, top: `${top}px` };
    },
    toggleBluffs() {
      this.isBluffsOpen = !this.isBluffsOpen;
    },
    toggleFabled() {
      this.isFabledOpen = !this.isFabledOpen;
    },
    removeFabled(index) {
      if (this.session.isSpectator) return;
      this.$store.commit("players/setFabled", { index });
    },
    handleTrigger(playerIndex, [method, params]) {
      if (typeof this[method] === "function") {
        this[method](playerIndex, params);
      }
    },
    claimSeat(playerIndex) {
      if (!this.session.isSpectator) return;
      if (this.session.playerId === this.players[playerIndex].id) {
        this.$store.commit("session/claimSeat", -1);
      } else {
        this.$store.commit("session/claimSeat", playerIndex);
      }
    },
    openReminderModal(playerIndex) {
      this.selectedPlayer = playerIndex;
      this.$store.commit("toggleModal", "reminder");
    },
    openRoleModal(playerIndex) {
      const player = this.players[playerIndex];
      if (this.session.isSpectator && player && player.role.team === "traveler")
        return;
      this.beliefMode = false;
      this.selectedPlayer = playerIndex;
      this.$store.commit("toggleModal", "role");
    },
    /**
     * FT-861: the same grid, asking the other question — what does this seat's
     * player think they are?
     *
     * It reuses the role modal rather than the grimoire drawer because the
     * modal is already the SEAT's own picker: it is opened from the coin, it is
     * scoped to one chair by `playerIndex`, and it closes on the pick. The
     * drawer is a build-time tray driven by an armed-character channel
     * (`drawerPick`) whose whole meaning is "the next seat you tap gets this" —
     * borrowing it would put a second, invisible meaning on every seat tap.
     */
    openBeliefModal(playerIndex) {
      if (this.session.isSpectator) return;
      this.beliefMode = true;
      this.selectedPlayer = playerIndex;
      this.$store.commit("toggleModal", "role");
    },
    removePlayer(playerIndex) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (
        confirm(
          `Do you really want to remove ${this.players[playerIndex].name}?`
        )
      ) {
        const { nomination } = this.session;
        if (nomination) {
          if (nomination.includes(playerIndex)) {
            // abort vote if removed player is either nominator or nominee
            this.$store.commit("session/nomination");
          } else if (
            nomination[0] > playerIndex ||
            nomination[1] > playerIndex
          ) {
            // update nomination array if removed player has lower index
            this.$store.commit("session/setNomination", [
              nomination[0] > playerIndex ? nomination[0] - 1 : nomination[0],
              nomination[1] > playerIndex ? nomination[1] - 1 : nomination[1]
            ]);
          }
        }
        this.$store.commit("players/remove", playerIndex);
      }
    },
    swapPlayer(from, to) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (to === undefined) {
        this.cancel();
        this.swap = from;
      } else {
        if (this.session.nomination) {
          // update nomination if one of the involved players is swapped
          const swapTo = this.players.indexOf(to);
          const updatedNomination = this.session.nomination.map(nom => {
            if (nom === this.swap) return swapTo;
            if (nom === swapTo) return this.swap;
            return nom;
          });
          if (
            this.session.nomination[0] !== updatedNomination[0] ||
            this.session.nomination[1] !== updatedNomination[1]
          ) {
            this.$store.commit("session/setNomination", updatedNomination);
          }
        }
        this.$store.commit("players/swap", [
          this.swap,
          this.players.indexOf(to)
        ]);
        this.cancel();
      }
    },
    movePlayer(from, to) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (to === undefined) {
        this.cancel();
        this.move = from;
      } else {
        if (this.session.nomination) {
          // update nomination if it is affected by the move
          const moveTo = this.players.indexOf(to);
          const updatedNomination = this.session.nomination.map(nom => {
            if (nom === this.move) return moveTo;
            if (nom > this.move && nom <= moveTo) return nom - 1;
            if (nom < this.move && nom >= moveTo) return nom + 1;
            return nom;
          });
          if (
            this.session.nomination[0] !== updatedNomination[0] ||
            this.session.nomination[1] !== updatedNomination[1]
          ) {
            this.$store.commit("session/setNomination", updatedNomination);
          }
        }
        this.$store.commit("players/move", [
          this.move,
          this.players.indexOf(to)
        ]);
        this.cancel();
      }
    },
    nominatePlayer(from, to) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (to === undefined) {
        this.cancel();
        if (from !== this.nominate) {
          this.nominate = from;
        }
      } else {
        const nomination = [this.nominate, this.players.indexOf(to)];
        this.$store.commit("session/nomination", { nomination });
        this.cancel();
      }
    },
    cancel() {
      this.move = -1;
      this.swap = -1;
      this.nominate = -1;
    }
  }
};
</script>

<style lang="scss">
@use "sass:math";
@import "../vars.scss";

#townsquare {
  width: 100%;
  height: 100%;
  padding: 20px;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;
}

/* The other half of the portrait-phone stack (HostTools owns the first half):
   while the build panel is docked across the bottom, the square gives up the
   part of the window the panel is standing in and centres the ring in what is
   left. Centring inside a shorter box is all it takes — the ring's radius is
   already capped to the window's WIDTH, so shrinking the height here only
   moves the ring, it does not squash it. */
@media (pointer: coarse) and (orientation: portrait) {
  #app.building-tools #townsquare {
    height: 44%;
    align-self: flex-start;
  }

  /* THE SAME STACK FOR THE NIGHT CHECKLIST. The sheet is the build panel's
     size and stands in the same place, so the square owes it the same room —
     without this the ring sat under the checklist and the phase bar crossed
     four chairs (measured 375x812, 2026-08-18).

     40%, not the panel's 44%: the checklist is the taller sheet (52vh against
     the panel's 48vh), and the ring's own box is capped to the window's WIDTH
     anyway, so the extra 4% comes off the empty air above the ring rather
     than off the seats. */
  #app.checklist-up #townsquare {
    height: 40%;
    align-self: flex-start;
  }

  /* AND THE SAME STACK FOR A DRAWER (2026-08-18). On a phone the grimoire,
     the script, the vote log and the night notes are all bottom sheets too,
     standing in the same place at the same 52vh, so the square owes them the
     same room it owes the checklist.

     LAST in this block on purpose: `sheet-up` can be true at the same time as
     `building-tools` (open the grimoire while building a town), the two rules
     carry identical specificity, and the sheet must win — it is the surface
     the user just reached for, and the build panel steps aside for it
     (HostTools's own rule). Source order is the whole tie-break. */
  #app.sheet-up #townsquare {
    height: 40%;
    align-self: flex-start;
  }
}

/* The same stack, turned on its side: a landscape phone has width to spare and
   no height, so the build panel takes a column down the right and the square
   gives up that column. Only the ring's CENTRE moves — its radius comes from
   the height, which this does not touch. */
@media (pointer: coarse) and (orientation: landscape) and (max-height: 500px) {
  #app.building-tools #townsquare {
    width: 56%;
    margin-right: auto;
  }

  /* and the night sheet takes the same column the build panel takes. Turned
     on its side the checklist was 700px wide over an 812px window — it
     covered the ring outright (measured 812x375, 2026-08-18).

     Keyed on the sheet EXISTING, not on the checklist being out: a landscape
     phone is 355px of ring in a 375px window, so there is no third place for
     the day's phase pill to stand — left in the middle it sat across three
     chairs' name plates. The column is the night's, all day. */
  #app.night-sheet-up #townsquare {
    width: 56%;
    margin-right: auto;
  }

  /* A DRAWER, turned on its side. Here a drawer stays a DRAWER — a 375px-tall
     window has no room for a sheet across the bottom (52vh is 195px, and the
     ring alone is 355px across) — so the answer is the landscape answer the
     build panel already uses: the drawer takes a column, the square gives it
     up. Without this a 400px script drawer over an 812px window covered four
     chairs outright.

     Two rules because the grimoire comes from the other side: it is the
     narrower drawer (250px against the rail's 400) and it takes the LEFT, so
     the square keeps more of the window and slides the other way. */
  #app.sheet-up #townsquare {
    width: 56%;
    margin-right: auto;
  }
  #app.sheet-up.sheet-left #townsquare {
    width: 68%;
    margin-right: 0;
    margin-left: auto;
  }
}

/***** The bloody dial (FT-848) *****/
/* Under every seat (the circle's own li's carry z-index 1..n) and under the
   bluffs/fabled panels at z-index 50, so the tower stains without ever
   covering a token, a name or a click target. */
.blood-dial {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;

  .stain {
    position: absolute;
    /* the DIAL's centre — now the box's centre too (recentred art), so no
       offset is needed */
    left: 50%;
    top: 50%;
    background: center / contain no-repeat;
    /* the stone drinks it — the dial's filigree still reads underneath */
    opacity: 0.88;
    transform-origin: center center;
    animation: stain-in 420ms ease-out;
  }
}

@keyframes stain-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.88;
  }
}

/* the app's animation kill-switch */
#app.static .blood-dial .stain {
  animation: none;
}

.circle {
  padding: 0;
  width: 100%;
  height: 100%;
  list-style: none;
  margin: 0;

  /* THE RING'S RADIUS IS HALF THIS BOX'S HEIGHT — each seat is an absolutely
     positioned spoke with `height: 50%`, swung out by a rotation. Nothing in
     that geometry has ever consulted the box's WIDTH, so a window taller than
     it is wide threw the 3- and 9-o'clock seats clean off both edges: at
     375x812 six of eight seats sat outside the viewport with no way to reach
     them (measured 2026-08-18).

     Capping the HEIGHT caps the radius, which is all it takes. The reserve is
     one seat wide — a seat is a `13.5vmin`-ish disc centred ON the ring, so
     half of it hangs past the radius on each side — plus the padding. The
     widest seat (a town under 7 players) is 15.5vmin, so that is the constant
     the reserve uses: sized for the worst case, it never clips the others.

     A landscape window is already wider than it is tall, so `100vw` there is
     far larger than the natural height and this rule never binds — desktop
     and landscape geometry are untouched. */
  --seat-reserve: 15.5vmin;
  max-height: calc(100vw - var(--seat-reserve) - 20px);

  > li {
    position: absolute;
    left: 50%;
    height: 50%;
    transform-origin: 0 100%;
    pointer-events: none;

    &:hover {
      z-index: 25 !important;
    }

    > .player {
      margin-left: -50%;
      width: 100%;
      pointer-events: all;
    }
    > .reminder {
      margin-left: -25%;
      width: 50%;
      pointer-events: all;
    }
  }
}

@mixin on-circle($item-count) {
  $angle: math.div(360, $item-count);
  // Golem fork (2026-08-18, user call): seat 1 sits just RIGHT of 12
  // o'clock and the HIGHEST seat takes 12 — the whole ring shifts one slot.
  $rot: $angle;

  // rotation and tooltip placement
  @for $i from 1 through $item-count {
    $pos: $i % $item-count; // physical slot: 0 = the 12 o'clock chair
    &:nth-child(#{$i}) {
      transform: rotate($rot * 1deg);
      @if $pos <= math.div($item-count, 2) {
        // first half of players
        z-index: $item-count - $pos;
        // open menu on the left
        .player > .menu {
          left: auto;
          right: 110%;
          margin-right: 15px;
          &:before {
            border-left-color: black;
            border-right-color: transparent;
            right: auto;
            left: 100%;
          }
        }
        .fold-enter-active,
        .fold-leave-active {
          transform-origin: right center;
        }
        .fold-enter,
        .fold-leave-to {
          transform: perspective(200px) rotateY(-90deg);
        }
        // show ability tooltip on the left
        .ability {
          right: 120%;
          left: auto;
          &:before {
            border-right-color: transparent;
            border-left-color: black;
            right: auto;
            left: 100%;
          }
        }
        .pronouns {
          left: 110%;
          right: auto;
          &:before {
            border-left-color: transparent;
            border-right-color: black;
            left: auto;
            right: 100%;
          }
        }
      } @else {
        // second half of players
        z-index: $pos;
      }

      > * {
        transform: rotate($rot * -1deg);
      }

      // animation cascade
      .life,
      .token,
      .shroud,
      .night-order,
      .seat {
        animation-delay: ($i - 1) * 50ms;
        transition-delay: ($i - 1) * 50ms;
      }

      // THE MENU GROWS DOWN FROM THE TOP OF THE RING (touch only).
      //
      // It hangs from the seat's bottom edge, which is right until the rows
      // inside it are finger-sized: at 40px a row the menu is ~250px tall and
      // the chairs at the top of the ring pushed it off the top of the screen
      // (measured 812x375 — three of eight menus were clipped).
      //
      // A chair is in the TOP half when its rotation is within 90 degrees of
      // twelve o'clock, which is exactly this slot test — inclusive, so the
      // chairs ON the horizon flip too: hanging upward they had only the
      // window's top half to grow into, which is the least room of any chair.
      // Flipped, every chair has at least half the window below its anchor,
      // and the height cap in Player.vue's own short-window rule takes it
      // from there. Coarse pointers only: a desktop menu is 80px tall and has
      // never needed the flip.
      @if $pos <= math.div($item-count, 4) or
        $pos >= math.div($item-count * 3, 4)
      {
        @media (pointer: coarse) {
          .player > .menu {
            top: -5px;
            bottom: auto;
            &:before {
              top: 5px;
              bottom: auto;
            }
          }
        }
      }

      // move reminders closer to the sides of the circle
      $q: math.div($item-count, 4);
      $x: $pos;
      @if $x < $q or ($x >= math.div($item-count, 2) and $x < $q * 3) {
        .player {
          margin-bottom: -10% + 20% * (1 - math.div($x % $q, $q));
        }
      } @else {
        .player {
          margin-bottom: -10% + 20% * math.div($x % $q, $q);
        }
      }
    }
    $rot: $rot + $angle;
  }
}

@for $i from 1 through 20 {
  .circle.size-#{$i} > li {
    @include on-circle($item-count: $i);
  }
}

/***** Demon bluffs / Fabled *******/
#townsquare > .bluffs,
#townsquare > .fabled {
  position: absolute;
  &.bluffs {
    bottom: 10px;
  }
  &.fabled {
    top: 10px;
  }
  left: 10px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 10px;
  border: 3px solid black;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
  transform-origin: bottom left;
  transform: scale(1);
  opacity: 1;
  transition: all 200ms ease-in-out;
  z-index: 50;

  > svg {
    position: absolute;
    top: 10px;
    right: 10px;
    cursor: pointer;
    &:hover {
      color: red;
    }
  }
  h3 {
    margin: 5px 1vh 0;
    display: flex;
    align-items: center;
    align-content: center;
    justify-content: center;
    span {
      flex-grow: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    svg {
      cursor: pointer;
      flex-grow: 0;
      &.fa-times-circle {
        margin-left: 1vh;
      }
      &.fa-plus-circle {
        margin-left: 1vh;
        display: none;
      }
      &:hover path {
        fill: url(#demon);
        stroke-width: 30px;
        stroke: white;
      }
    }
  }
  ul {
    display: flex;
    align-items: center;
    justify-content: center;
    li {
      width: 14vh;
      height: 14vh;
      margin: 0 0.5%;
      display: inline-block;
      transition: all 250ms;
    }
  }
  &.closed {
    svg.fa-times-circle {
      display: none;
    }
    svg.fa-plus-circle {
      display: block;
    }
    ul li {
      width: 0;
      height: 0;
      .night-order {
        opacity: 0;
      }
      .token {
        border-width: 0;
      }
    }
  }
}

#townsquare.public > .bluffs {
  opacity: 0;
  transform: scale(0.1);
}

/***** Demon bluffs — anchored to the demon's own seat (2026-08-19) *****
   The corner rules above are UNTOUCHED and still fire whenever there is no
   demon to anchor to (bluffAnchor stays null — see measureBluffAnchor in
   the script block): an undealt town, or a script still being built. The
   `.anchored` class only ever lands on top of a demon seat that was
   actually measured, so the corner is the fallback, never a lost panel.

   `--seat-sz` (inherited by every descendant — custom properties inherit)
   is the demon's own coin's measured width, so every size below scales
   with the SAME number Player.vue's own `zoom` already sized that coin
   with — a 6-seat town's big coins, a 15-seat town's small ones — without
   this file re-deriving that formula.

   The CONTAINER itself carries no left/top any more: h3 and each coin are
   positioned INDEPENDENTLY, each with its own fully-computed pixel centre
   (bluffTitleStyle / bluffCoinStyle in the script block). An earlier pass
   centred the whole h3-over-ul stack on one anchor point, and h3's own
   height pushed the coin row away from that point by a fixed
   SCREEN-SPACE amount — correct only for a seat at the top of the ring;
   everywhere else it quietly ate back the outward clearance and the
   coins drifted into the reminder band (measured — see the collision
   table in claude_temp_test/2026-08-19-bluffs-seat.mjs). Positioning each
   element off the SAME seat-relative point sidesteps that entirely. */
#townsquare > .bluffs.anchored {
  bottom: auto;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  background: none;
  border: none;
  filter: none;
  transform: none;
  transform-origin: initial;
  padding: 0;
  overflow: visible;

  h3 {
    position: absolute;
    transform: translate(-50%, -50%);
    margin: 0;
    // a hard cap on the PILL itself, not just the text inside it — the
    // span's own ellipsis (the shared h3 span rule, untouched) only
    // truncates within room the flex layout actually gives it, and an
    // absolutely-positioned h3 with no positioned ancestor width has
    // nothing to constrain it: unchecked, "Demon bluffs" ran wide enough
    // to sit across the NEXT seat's own name plate (measured, desktop,
    // 8 seats, demon at index 4 — the crop in claude_temp_test/
    // 2026-08-19-bluffs-shots/desktop-8seats-demon4-crop.png).
    max-width: calc(var(--seat-sz, 15vmin) * 1.15);
    overflow: hidden;
    background: rgba(0, 0, 0, 0.62);
    border-radius: 999px;
    padding: calc(var(--seat-sz, 15vmin) * 0.05)
      calc(var(--seat-sz, 15vmin) * 0.09);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    font-size: calc(var(--seat-sz, 15vmin) * 0.078);
    white-space: nowrap;
    span {
      max-width: calc(var(--seat-sz, 15vmin) * 0.72);
    }
    svg {
      width: calc(var(--seat-sz, 15vmin) * 0.14);
      height: calc(var(--seat-sz, 15vmin) * 0.14);
    }
  }

  ul li {
    position: absolute;
    transform: translate(-50%, -50%);
    margin: 0;
  }

  // OPEN: three small coins, each independently placed (bluffCoinStyle) —
  // a held-hand-of-cards fan, not a wide row. A full-width row of three
  // half-size coins measured wider than the ring's own outward slack at a
  // 15-seat town on a phone (see the collision table in claude_temp_test/
  // 2026-08-19-bluffs-seat.mjs).
  &:not(.closed) ul li {
    width: calc(var(--seat-sz, 15vmin) * 0.4);
    height: calc(var(--seat-sz, 15vmin) * 0.4);
  }
}

.fabled ul li .token:before {
  content: " ";
  opacity: 0;
  transition: opacity 250ms;
  background-image: url("../assets/icons/x.png");
  z-index: 2;
}

/**** Night reminders ****/
.night-order {
  position: absolute;
  width: 100%;
  cursor: pointer;
  opacity: 1;
  transition: opacity 200ms;
  display: flex;
  top: 0;
  align-items: center;
  pointer-events: none;

  &:after {
    content: " ";
    display: block;
    padding-top: 100%;
  }

  #townsquare.public & {
    opacity: 0;
    pointer-events: none;
  }

  &:hover ~ .token .ability {
    opacity: 0;
  }

  span {
    display: flex;
    position: absolute;
    padding: 5px 10px 5px 30px;
    width: 350px;
    z-index: 25;
    font-size: 70%;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    border: 3px solid black;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
    text-align: left;
    align-items: center;
    opacity: 0;
    transition: opacity 200ms ease-in-out;

    &:before {
      transform: rotate(-90deg);
      transform-origin: center top;
      left: -98px;
      top: 50%;
      font-size: 100%;
      position: absolute;
      font-weight: bold;
      text-align: center;
      width: 200px;
    }

    &:after {
      content: " ";
      border: 10px solid transparent;
      width: 0;
      height: 0;
      position: absolute;
    }
  }

  &.first span {
    right: 120%;
    background: linear-gradient(
      to right,
      $townsfolk 0%,
      rgba(0, 0, 0, 0.5) 20%
    );
    &:before {
      content: "First Night";
    }
    &:after {
      border-left-color: $townsfolk;
      margin-left: 3px;
      left: 100%;
    }
  }

  &.other span {
    left: 120%;
    background: linear-gradient(to right, $demon 0%, rgba(0, 0, 0, 0.5) 20%);
    &:before {
      content: "Other Nights";
    }
    &:after {
      right: 100%;
      margin-right: 3px;
      border-right-color: $demon;
    }
  }

  em {
    font-style: normal;
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid black;
    filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.5));
    font-weight: bold;
    opacity: 1;
    pointer-events: all;
    transition: opacity 200ms;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 3;
  }

  &.first em {
    left: -10%;
    background: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, $townsfolk 100%);
  }

  &.other em {
    right: -10%;
    background: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, $demon 100%);
  }

  em:hover + span {
    opacity: 1;
  }

  // adjustment for fabled
  .fabled &.first {
    span {
      right: auto;
      left: 40px;
      &:after {
        left: auto;
        right: 100%;
        margin-left: 0;
        margin-right: 3px;
        border-left-color: transparent;
        border-right-color: $townsfolk;
      }
    }
  }
}

#townsquare:not(.spectator) .fabled ul li:hover .token:before {
  opacity: 1;
}
</style>
