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
        !session.isRolesDistributed,
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

    <!-- Golem fork (FT-936): the CENTRE-FACE SPLAT -- one mark for the game
         itself, dealt when roles go out. Negative z-index (own rule below,
         not .blood-dial's) so it sits behind TownInfo's whole hub (a
         SIBLING component, not a descendant -- see the file header on
         faceSplat below for why plain z-index:0 was not enough) as well as
         under every seat. Decoration only: aria-hidden, no pointer-events. -->
    <div
      class="face-splat"
      aria-hidden="true"
      v-if="faceSplat"
      :key="faceSplat.file"
      :style="faceSplatStyle"
    ></div>

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
          nominate: nominate > -1,
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
    <!-- Golem fork (2026-08-19, user call): gated on a DEMON SEATED, not just
         a dealt town. Un-gated, the no-demon case fell to the static corner
         CSS below (bluffAnchor null) — a floating "Demon bluffs" box with
         three empty coins, bottom-left, sitting on top of the grimoire
         drawer with nothing in it to show. RoleDrawer.vue now carries its
         own "Demon bluffs" section pinned to the drawer floor for exactly
         this no-demon case (`canSetBluffs`, same `players/setBluff` data —
         see the comment there), so nothing is lost by this panel staying
         out of the DOM: v-if, not a CSS hide, so a spectator's devtools
         still find nothing here either. The corner CSS/fallback branch
         itself is untouched — a demon seated but not yet measured (the
         gap before measureBluffAnchor's nextTick fires) still needs it. -->
    <div
      class="bluffs"
      v-if="players.length && canSeeBluffs && demonIndex > -1 && isBluffsOpen"
      ref="bluffs"
      :class="{ anchored: !!bluffAnchor, own: isOwnBluffs }"
      :style="bluffAnchorStyle"
    >
      <!-- THE HEADING IS THE CORNER FALLBACK'S ONLY (2026-08-19, user call).
           The anchored cluster's "Demon bluffs ✕" pill is retired: its ✕ is a
           mark in the menu strip now, and a wide floating label beside three
           coins was the one part of the cluster that needed a search of its
           own to place. The no-demon corner panel is a real panel and keeps
           its real heading — hence v-if, not a deletion.

           The spectator title has a reader again: a demon or a Lunatic on
           their own client IS `session.isSpectator`, and "Other characters"
           is what those three are to them. -->
      <h3 v-if="!bluffAnchor" :style="bluffTitleStyle">
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
          @click="openBluffModal(index - 1)"
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
// Golem fork (2026-08-19): who holds the demon's bluffs — the storyteller, the
// demon, and the Lunatic. One rule, shared with the menu's toggle and the
// socket's sender so the three can never disagree.
import { canSeeBluffs, demonSeatIndex } from "../golem/bluffs";
// Golem fork (FT-936): the centre-face splat -- the game-start mark, its
// per-file size table, and the hash/RNG both it and this file's own
// stainOrder() share (moved here from a local copy -- MEMORY-CORE rule 2).
import { hashString, seededRandoms, pickFaceSplat } from "../golem/faceSplat";

// Golem fork (FT-848): the re-baked dried-blood stains, bundled once for the
// whole dial. (The older per-seat splats in ../assets/blood/splats are now
// the centre-face splat's own art -- see golem/faceSplat.js -- rather than
// unreferenced.)
const stainCtx = require.context("../assets/blood/stains", false, /\.png$/);
const STAINS = stainCtx.keys().sort().map(stainCtx);

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
const stainOrder = (seed) => {
  const bag = STAINS.map((_, i) => i);
  const next = seededRandoms(seed);
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
    ReminderModal,
  },
  computed: {
    ...mapGetters({ nightOrder: "players/nightOrder" }),
    // Golem fork (FT-936): "edition" and "night" added for the centre-face
    // splat's seed (faceSplatLive below) -- the script and the day counter,
    // alongside session/players this file already reads.
    ...mapState(["grimoire", "roles", "session", "edition", "night"]),
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
              ` rotate(${spin}deg)`,
          },
        });
      });
      return stains;
    },
    /**
     * Golem fork (2026-08-19): THE STORYTELLER, THE DEMON, AND THE LUNATIC —
     * and nobody else. The rule itself lives in golem/bluffs.js because the
     * menu's toggle icon and the socket's sender have to agree with this
     * exactly; three copies of a privacy test is three places for them to
     * drift apart.
     *
     * A v-if downstream, not a CSS rule: the bluff Tokens simply never render
     * for anyone this returns false for, so an ordinary player's DOM contains
     * no role name and no icon to find even in devtools — the leak the old
     * CSS-only `#townsquare.public > .bluffs` hide left open.
     */
    canSeeBluffs() {
      return canSeeBluffs(this.$store.state);
    },
    /**
     * Is this client's cluster its OWN (the demon's / the Lunatic's) rather
     * than the storyteller's? Only used to spare it the public-view hide
     * below: `grimoire.isPublic` starts TRUE and only the HOST ever flips it,
     * so a player's copy is true forever and the old rule would blank the one
     * cluster that is supposed to be theirs.
     */
    isOwnBluffs() {
      return this.session.isSpectator;
    },
    /**
     * The seat this town's bluffs belong to: the first demon seated, or -1
     * before any demon is dealt (an undealt town, or a script mid-build) —
     * `bluffAnchor` stays null in that case and the panel falls back to the
     * static corner position. A script with more than one demon (Legion)
     * still anchors to the first found; it is never wrong, only plain.
     *
     * Shared with the menu strip's toggle (golem/bluffs) so the mark and the
     * cluster appear and disappear together.
     */
    demonIndex() {
      return demonSeatIndex(this.players);
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
    /**
     * The title pill's own centre point. Always null in the anchored state
     * since the pill was RETIRED (2026-08-19, user call): the show/hide
     * control it carried is one mark in the menu strip now (Menu.vue's
     * `uiBluffs`), and a floating "Demon bluffs ✕" label beside three coins
     * that already read as coins was the only thing in the cluster wide
     * enough to need a search of its own. The corner fallback — the no-demon
     * case, which is a real panel with a real heading — keeps its h3 and gets
     * null here, which is what it had before.
     */
    bluffTitleStyle() {
      if (!this.bluffAnchor || !this.bluffAnchor.title) return null;
      const { left, top } = this.bluffAnchor.title;
      return { left: `${left}px`, top: `${top}px` };
    },
    /** The show/hide state, held in the store so the menu strip's mark and
     *  this cluster are the same switch, and so it survives a reload. */
    isBluffsOpen() {
      return this.grimoire.isBluffsOpen;
    },
    /**
     * Golem fork (FT-936): is a game actually live right now, for EVERY
     * client type -- host, seated player, true spectator alike? The one
     * thing every one of them can read identically off already-synced
     * state: "does any seat hold a role". `session.isRolesDistributed` (the
     * flag TownSquare's own `building` class above reads) cannot serve this
     * -- it is set directly by whoever presses Start and never rebroadcast,
     * so it is true for the storyteller and permanently false for every
     * player and spectator (confirmed against store/socket.js: no incoming
     * message ever commits session/distributeRoles). This mirrors App.vue's
     * own townCast/townUncast test, which already relies on the same fact
     * for the same reason.
     */
    townLive() {
      return this.players.some((p) => p.role && p.role.id);
    },
    /**
     * The centre-face splat's seed, computed LIVE off currently-synced
     * state -- town, script, roster (names + count only, not isDead: that
     * changes as players die mid-game and would drag the splat along with
     * it) and the night counter. This is never rendered directly (see
     * faceSplat below, which reads the FROZEN copy) -- it exists so
     * `created()` and the store subscription both have one formula to
     * snapshot from, rather than two.
     *
     * Role identities cannot be part of this: FT-861 / the 2026-08-19
     * bluffs hardening made them private per-seat, sent by direct message
     * only (store/socket.js distributeRoles/_updatePlayer) -- an ordinary
     * player's own store never holds anyone's role but their own, so a hash
     * over "who has which character" would not agree between two clients
     * watching the SAME game. Town + script + roster + night is the largest
     * fact set that is both synced and identical for everyone in the game
     * right now, which is what "two clients, one splat" needs.
     */
    faceSplatLive() {
      const roster = this.players.map((p) => p.name || "").join("|");
      return [
        this.session.sessionId || "golem",
        (this.edition && this.edition.id) || "",
        roster,
        this.night.day,
      ].join("::");
    },
    /**
     * The splat itself, from the FROZEN seed (faceSplatSeed, a data field --
     * see created() below for how it gets set and stays set for the rest of
     * the game). Frozen rather than reading faceSplatLive live because
     * night.day changes every night -- a splat that re-rolled with it would
     * look like a bug ("why did the mark change") instead of the one-time
     * "the game began" mark the ask was for.
     */
    faceSplat() {
      if (!this.townLive || !this.faceSplatSeed) return null;
      return pickFaceSplat(this.faceSplatSeed);
    },
    faceSplatStyle() {
      if (!this.faceSplat) return null;
      const { url, boxPx, spin } = this.faceSplat;
      return {
        backgroundImage: `url(${url})`,
        width: `calc(${boxPx} * var(--fpx))`,
        height: `calc(${boxPx} * var(--fpx))`,
        transform: `translate(-50%, -50%) rotate(${spin}deg)`,
      };
    },
  },
  data() {
    // FT-870: FABLED DEFAULTS CLOSED ON A PHONE. Open, that panel is a stacked
    // 3-coin column in portrait (~42vh) or a wide row in landscape — taller
    // and wider than the room a phone ever has to give it, because the ring
    // already gives up height to the checklist or a bottom sheet
    // (`#app.checklist-up` / `.sheet-up`, this file's own style block below).
    //
    // BLUFFS NO LONGER SHARE THAT DEFAULT (2026-08-19, user call): the anchored
    // cluster is three 0.4-seat-width coins pinned against the demon's own
    // coin, not a panel that can ride over three seats, so the reason for the
    // phone default is gone. It defaults to SHOWN on every viewport and the
    // state lives in the store (`grimoire.isBluffsOpen`, persisted).
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
      isFabledOpen: !isPhone,
      // Golem fork (2026-08-19): where the bluffs cluster docks — null
      // until measureBluffAnchor finds a demon seat, meaning "use the
      // static corner CSS" (see bluffAnchorStyle / the .anchored rules).
      bluffAnchor: null,
      // Golem fork (FT-936): the centre-face splat's FROZEN seed for this
      // client's view of the current game — null until created() or the
      // subscribe below sets it. See faceSplat/faceSplatLive above.
      faceSplatSeed: null,
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
    },
  },
  /**
   * Golem fork (FT-936): freezes faceSplatSeed the moment THIS client
   * learns the game is live, and re-freezes it on every later deal — so the
   * splat is stable within a game (see faceSplat's own comment) but still
   * rolls fresh for a second game in the same town, in the same tab.
   *
   * Vuex's store.subscribe fires on every COMMIT, unconditionally — unlike
   * a Vue `watch`, which only fires when the resulting VALUE changes and is
   * batched to nextTick. That distinction matters here: HostTools' re-deal
   * clears every seat's role and reassigns in the same synchronous tick
   * (see App.vue's own comment on `building`), so a `watch` on "does any
   * seat have a role" would see it go true → true across a whole re-deal
   * and never fire again. Subscribing to the mutation itself sidesteps that
   * entirely.
   *
   * Two signals, because no single one reaches every client type:
   *   - session/distributeRoles (truthy payload) — committed ONLY by
   *     Menu.vue's Start button, and ONLY on the host's own store (confirmed
   *     against store/socket.js: nothing ever replays this mutation on a
   *     receiving client). Unambiguous, and fires fresh on every Start.
   *   - players/update, property "role", targeting THIS client's own seat —
   *     what a seated player actually receives instead (FT-861's private,
   *     direct-message deal). This also fires on a LATER single-seat
   *     correction (the storyteller quietly re-casting one chair mid-game),
   *     which would re-roll the splat for that one player — a rare,
   *     cosmetic false positive, traded deliberately against the
   *     alternative: freezing only once would leave a player who stays in
   *     the same tab across two games stuck showing game one's mark.
   *
   * A TRUE SPECTATOR (no claimed seat) gets neither signal — they receive
   * no per-seat message at all. The fallback below covers them for the
   * common case (watching from before Start, or joining while the CURRENT
   * game is live); a spectator who stays in one tab across two full games
   * shares the same known gap as the single-tab-player case above.
   *
   * A GENERATION NUMBER rides along with every freeze (`_faceSplatGen`, a
   * plain instance field — not reactive `data`, like `_bluffRO` above,
   * since only the composed faceSplatSeed needs to trigger a re-render).
   * faceSplatLive alone is not enough: a re-deal with the SAME roster and
   * the SAME script, before night.day has moved (the most direct "second
   * game, same town" case there is), reads back byte-identical — the
   * generation number is what actually changes on every deal, guaranteed,
   * independent of whether anything else about the town happened to.
   * Robust for anyone connected for the whole sequence of deals (the
   * ordinary case — everyone joins while the town is being built, then the
   * game starts); a client that only connects mid-sequence starts its own
   * count from zero, the same documented gap as above.
   */
  created() {
    this._faceSplatGen = 0;
    const freeze = () => {
      this._faceSplatGen++;
      this.faceSplatSeed = this.faceSplatLive + "::" + this._faceSplatGen;
    };
    this._faceSplatUnsub = this.$store.subscribe(({ type, payload }) => {
      if (type === "session/distributeRoles" && payload) {
        freeze();
        return;
      }
      if (
        type === "players/update" &&
        payload &&
        payload.property === "role" &&
        payload.player &&
        payload.player.id &&
        payload.player.id === this.session.playerId
      ) {
        freeze();
      }
    });
    // A client that MOUNTS onto an already-running game (a reload, or a
    // true spectator with no seat to be told anything on) has no event
    // left to catch — best-effort snapshot of the current state instead.
    if (this.townLive) freeze();
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
    if (this._faceSplatUnsub) this._faceSplatUnsub();
  },
  methods: {
    /**
     * Golem fork (2026-08-19): measures the demon's own rendered coin and lays
     * the three bluffs AGAINST it — the first coin's rim a few pixels clear of
     * the demon's rim, the other two continuing along the same ray, confined
     * to ONE side (screen-left or screen-right, chosen by `side` below).
     *
     * The acceptance for this is a RIM GAP IN PIXELS, not a distance bound: a
     * bound of "within N seat-widths of the seat's centre" is satisfied by a
     * cluster that reads as belonging to nothing, which is how two earlier
     * passes shipped green and wrong. See the block on `bisect` below for the
     * measured cause and claude_temp_test/2026-08-19-bluffs3-gap.mjs for the
     * before/after tables.
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
      const seatRadiusPx = Math.min(seatRect.width, seatRect.height) / 2;
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
      const matrix = /matrix\(([^)]+)\)/.exec(
        getComputedStyle(seatLi).transform,
      );
      if (matrix) {
        const parts = matrix[1].split(",").map(Number);
        ox = -parts[2]; // -c
        oy = -parts[3]; // -d
      }
      const odist = Math.hypot(ox, oy) || 1;
      ox /= odist;
      oy /= odist;
      /**
       * (2026-08-19, user call #3): ONE SIDE OF THE SEAT, in screen space —
       * not a fan spread symmetrically along the outward spoke. At the top
       * of the ring the spoke points straight up, so a fan spread left AND
       * right from it put half the coins to the left of the seat and half
       * to the right — squarely across the seat's own centreline, which is
       * where its name plate sits regardless of which way the spoke points
       * (measured, screenshot: Imp at 12 o'clock, bluffs spilling across
       * its own plate — see claude_temp_test/2026-08-19-bluffs-side.mjs's
       * before-sweep for the reproduced overlap). A cluster confined to one
       * side never crosses that centreline, so it never crosses the plate
       * either.
       *
       * `ox` — already the outward unit vector's screen-x component,
       * computed above off the seat's own rotation matrix rather than any
       * bounding box (see the block comment just above) — already answers
       * "which side": positive means the seat sits right-of-hub, negative
       * left-of-hub. At 12 and 6 o'clock ox≈0, and the `> 0.05` threshold
       * resolves that to -1 (screen-left) — exactly the user's "top or
       * bottom → left" rule fires for free, with no separate case needed
       * for those two seats.
       */
      const side = ox > 0.05 ? 1 : -1;
      const size = seatRect.width;
      const rootLeft = rootRect.left;
      const rootTop = rootRect.top;
      /**
       * THE ROW'S DIRECTION (2026-08-19, user call #3 — the third attempt at
       * this, and the one that fixes the actual cause).
       *
       * WHAT WAS WRONG. The previous pass moved the row's base point 0.9
       * seat-widths OUTWARD along the spoke and THEN stepped 0.7 seat-widths
       * SIDEWAYS from there. Those two are perpendicular everywhere except 3
       * and 9 o'clock, so they added in quadrature: the first coin landed
       * ~1.14 seat-widths from the seat centre on a diagonal, when "touching"
       * is 0.7 along a single ray. Measured on the shipped build: a desktop
       * 6-seat town (124px coins) put the NEAREST bluff coin's rim 105px clear
       * of the demon's own rim — most of a coin's width of empty space — while
       * the sweep's "within 3 seat-widths of centre" bound read 2.21 and
       * passed. The collision search never ran (pushPx was 0 in every one of
       * those rows); the base geometry alone did it. A distance bound was the
       * wrong acceptance, so the acceptance is now an ADJACENCY: the gap
       * between the two rims, in pixels (see claude_temp_test/
       * 2026-08-19-bluffs3-gap.mjs, before/after tables).
       *
       * WHAT IT IS NOW. One ray, from the demon's own coin centre. The first
       * slot sits at `seatRadius + coinRadius + TOUCH`, so its rim clears the
       * demon's rim by TOUCH and nothing else — touching distance by
       * construction rather than by budget. The other two continue along the
       * same ray.
       *
       * WHICH RAY. The bisector of two directions the seat already knows: the
       * screen side the (unchanged, correct) side rule picked, and the seat's
       * own outward spoke.
       *
       *   3 / 9 o'clock  outward IS the side, so the bisector is the side —
       *                  a plain horizontal row, exactly as before.
       *   12 / 6 o'clock outward is vertical and the side is horizontal, so
       *                  the row leaves at 45° into the ring's own open
       *                  exterior. This matters: a purely horizontal row at
       *                  the top of a 15-seat ring runs ALONG the ring, and
       *                  measured, its third coin lands inside the next seat's
       *                  own coin — which is exactly what used to send the
       *                  collision search walking, and walking is what
       *                  detached the cluster.
       *
       * So the side rule is untouched and the crowded cases stop being
       * crowded, without the standoff that caused the detachment.
       */
      const bisect = (sx, sy) => {
        const bx = side + sx;
        const by = sy;
        const len = Math.hypot(bx, by);
        // Degenerate only when the two directions oppose exactly (an inward
        // bisector at 3/9 o'clock) — fall back to the pure side, which is
        // where that case was heading anyway.
        if (len < 1e-3) return { x: side, y: 0 };
        return { x: bx / len, y: by / len };
      };
      const dirOut = bisect(ox, oy);
      // A bluff coin is 0.4 seat-widths square (see the CSS below) — half 0.2.
      const COIN_HALF = 0.2;
      const coinHalfPx = size * COIN_HALF;
      /**
       * The one number that says "against the coin, not near it": how much
       * daylight is left between the demon's rim and the first bluff's rim.
       * Proportional so it reads the same at a 6-seat town's 124px coins
       * (~6px) and a 15-seat phone's 45px ones (~2px) — a fixed pixel value
       * would be invisible on one and a gutter on the other.
       */
      const TOUCH = size * 0.05;
      const SPREAD = 0.34; // spacing between the 3 row slots, unchanged
      const offsets = [0, 1, 2].map(
        (k) => seatRadiusPx + coinHalfPx + TOUCH + size * SPREAD * k,
      );
      const EDGE_PAD = 2;
      const inViewport = (box) =>
        box[0] >= EDGE_PAD &&
        box[1] >= EDGE_PAD &&
        box[2] <= window.innerWidth - EDGE_PAD &&
        box[3] <= window.innerHeight - EDGE_PAD;
      /**
       * Every box this cluster must clear, in screen pixels: every seat's own
       * name plate (the demon's own included), every OTHER seat's life coin
       * (the demon's own is exempt — the cluster is allowed to sit on it), and
       * every reminder on the board. Measured rather than assumed, the same
       * "read the box already laid out" idiom the rest of this method uses.
       */
      const collisionRects = [];
      rootEl.querySelectorAll(".player > .name").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width) collisionRects.push(r);
      });
      rootEl.querySelectorAll(".player .life").forEach((el) => {
        if (el === seatEl) return; // the demon's own coin — may be covered
        const r = el.getBoundingClientRect();
        if (r.width) collisionRects.push(r);
      });
      rootEl.querySelectorAll(".reminder:not(.add)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width) collisionRects.push(r);
      });
      const MARGIN_PX = 3;
      const clears = (box) =>
        collisionRects.every(
          (r) =>
            box[0] >= r.right + MARGIN_PX ||
            box[2] <= r.left - MARGIN_PX ||
            box[1] >= r.bottom + MARGIN_PX ||
            box[3] <= r.top - MARGIN_PX,
        );
      const rowBoxes = (dir, dx, dy) =>
        offsets.map((off) => {
          const cx = seatCx + dir.x * off + dx;
          const cy = seatCy + dir.y * off + dy;
          return [
            cx - coinHalfPx,
            cy - coinHalfPx,
            cx + coinHalfPx,
            cy + coinHalfPx,
          ];
        });
      /**
       * THE SEARCH CANNOT DETACH THE CLUSTER. This is the second half of the
       * fix, and it is a constraint rather than a heuristic.
       *
       * The old search pushed the whole row along one axis until everything
       * cleared, bounded at FOUR seat-widths — so "walk away until the problem
       * is gone" was a legal answer, and in a crowded ring it was the answer it
       * found. It cannot be reached from here. There are exactly two freedoms,
       * and they are not equal:
       *
       *   (a) WHICH RAY the row leaves the coin on. This is FREE: every ray
       *       starts the first slot at the same distance from the same centre,
       *       so rotating the cluster around the demon's coin changes the rim
       *       gap by exactly nothing. The rays are tried in order of how far
       *       they have turned from the ideal (`dirOut`), and the sweep is
       *       confined to the side the side rule picked — `v.x * side >= 0`, so
       *       a left-hand demon's cluster can tip up, down, or anywhere
       *       between, but can never cross to the right.
       *   (b) A TRANSLATION perpendicular to the chosen ray. This one COSTS
       *       adjacency, so it is only reached after every ray has failed, and
       *       it is capped at MAX_NUDGE = 0.25 seat-widths (~31px at a 6-seat
       *       town's 124px coins, ~11px at a 15-seat phone's 45px ones).
       *
       * The worst displacement this can produce is therefore a quarter of a
       * coin, and it is tried smallest-first. If nothing clears even then, the
       * row takes the ideal position and OVERLAPS whatever is in the way — the
       * user's own instruction, and the right one: a cluster sitting on a name
       * plate still reads as the demon's, and a cluster in the corner does not.
       */
      const MAX_NUDGE = size * 0.25;
      const NUDGE_STEP = Math.max(2, size * 0.04);
      // 24 steps of 3.75° to either side of the ideal ray = a quarter turn each
      // way. Paired so the pair nearest the ideal is tried first, and within a
      // pair the more OUTWARD of the two goes first — the ring's exterior is
      // where the open space is, so an equal-cost tie is broken away from the
      // crowd.
      const RAY_STEPS = 24;
      const RAY_STEP_RAD = Math.PI / 48;
      const baseAngle = Math.atan2(dirOut.y, dirOut.x);
      const rays = [];
      const pushRay = (angle) => {
        const v = { x: Math.cos(angle), y: Math.sin(angle) };
        // never cross to the other side of the seat — the side rule is not
        // something this search is allowed to trade away
        if (v.x * side < -0.001) return;
        rays.push(v);
      };
      pushRay(baseAngle);
      for (let step = 1; step <= RAY_STEPS; step++) {
        const delta = step * RAY_STEP_RAD;
        const plus = { a: baseAngle + delta, out: 0 };
        const minus = { a: baseAngle - delta, out: 0 };
        plus.out = Math.cos(plus.a) * ox + Math.sin(plus.a) * oy;
        minus.out = Math.cos(minus.a) * ox + Math.sin(minus.a) * oy;
        const pair = plus.out >= minus.out ? [plus, minus] : [minus, plus];
        pushRay(pair[0].a);
        pushRay(pair[1].a);
      }
      let chosen = null;
      let onscreenOnly = null;
      for (let n = 0; n <= MAX_NUDGE + 0.001 && !chosen; n += NUDGE_STEP) {
        for (let d = 0; d < rays.length && !chosen; d++) {
          const dir = rays[d];
          // the ray's own perpendicular — the only direction a nudge may move
          const px = -dir.y;
          const py = dir.x;
          const signs = n === 0 ? [0] : [1, -1];
          for (let s = 0; s < signs.length; s++) {
            const dx = px * signs[s] * n;
            const dy = py * signs[s] * n;
            const boxes = rowBoxes(dir, dx, dy);
            if (!boxes.every(inViewport)) continue;
            if (!onscreenOnly) onscreenOnly = { dir, dx, dy };
            if (boxes.every(clears)) {
              chosen = { dir, dx, dy };
              break;
            }
          }
        }
      }
      // Nothing cleared: prefer the closest candidate that at least fits the
      // screen, and failing that the ideal ray, overlapping and all.
      if (!chosen) chosen = onscreenOnly || { dir: dirOut, dx: 0, dy: 0 };
      let boxes = rowBoxes(chosen.dir, chosen.dx, chosen.dy);
      /**
       * The last-resort on-screen fix is a UNIFORM translation of the whole
       * row by the least amount that brings its bounding box inside the
       * viewport — never a per-coin clamp, which would collapse the row into a
       * stack against the edge and lose the one thing (its shape) that says
       * these three belong together.
       */
      const bbox = boxes.reduce(
        (a, b) => [
          Math.min(a[0], b[0]),
          Math.min(a[1], b[1]),
          Math.max(a[2], b[2]),
          Math.max(a[3], b[3]),
        ],
        [Infinity, Infinity, -Infinity, -Infinity],
      );
      let fixX = 0;
      let fixY = 0;
      if (bbox[0] < EDGE_PAD) fixX = EDGE_PAD - bbox[0];
      else if (bbox[2] > window.innerWidth - EDGE_PAD)
        fixX = window.innerWidth - EDGE_PAD - bbox[2];
      if (bbox[1] < EDGE_PAD) fixY = EDGE_PAD - bbox[1];
      else if (bbox[3] > window.innerHeight - EDGE_PAD)
        fixY = window.innerHeight - EDGE_PAD - bbox[3];
      if (fixX || fixY)
        boxes = rowBoxes(chosen.dir, chosen.dx + fixX, chosen.dy + fixY);
      const coins = boxes.map((b) => ({
        left: (b[0] + b[2]) / 2 - rootLeft,
        top: (b[1] + b[3]) / 2 - rootTop,
      }));
      this.bluffAnchor = {
        size,
        title: null,
        coins,
      };
    },
    /** This bluff slot's own computed centre (see measureBluffAnchor) — null
     *  (no demon found) leaves the slot in the static corner's flex row. */
    bluffCoinStyle(i) {
      if (!this.bluffAnchor) return null;
      const { left, top } = this.bluffAnchor.coins[i];
      return { left: `${left}px`, top: `${top}px` };
    },
    /**
     * Open the bluff picker — THE STORYTELLER'S ONLY. The demon and the
     * Lunatic can now see these three coins, and a coin that opens a picker is
     * a coin that looks settable; the modal's own bluff branch has no
     * spectator guard on it (RoleModal, `playerIndex < 0`), so a tap there
     * would rewrite the demon's own copy locally and then be silently
     * overwritten by the next thing the storyteller sends. Refusing the open
     * is the smaller, clearer no.
     */
    openBluffModal(slot) {
      if (this.session.isSpectator) return;
      this.openRoleModal((slot + 1) * -1);
    },
    toggleBluffs() {
      this.$store.commit("toggleBluffsOpen");
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
          `Do you really want to remove ${this.players[playerIndex].name}?`,
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
              nomination[1] > playerIndex ? nomination[1] - 1 : nomination[1],
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
          const updatedNomination = this.session.nomination.map((nom) => {
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
          this.players.indexOf(to),
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
          const updatedNomination = this.session.nomination.map((nom) => {
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
          this.players.indexOf(to),
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
    },
  },
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

/***** The centre-face splat (FT-936) *****
   A SEPARATE element from .blood-dial above, and a separate (negative)
   z-index, on purpose: TownInfo (the town readout) is a SIBLING of
   #townsquare under #app, not a descendant of it, and #townsquare itself
   sets no z-index -- so a positive or zero z-index here stacks only among
   #townsquare's OWN children (behind the seats, as .blood-dial wants) and
   still paints on top of TownInfo, because #townsquare comes later in the
   template than TownInfo (App.vue) and z-index:auto/0 elements paint in
   document order. #app DOES establish a stacking context (container-type:
   size, App.vue), and neither #townsquare nor TownInfo's own .info sets a
   z-index or any other stacking-context trigger — so a NEGATIVE z-index
   here escapes #townsquare's own local order and is compared directly
   against TownInfo inside #app's single stacking context instead, landing
   behind it. Verified against the built app, not just reasoned about — see
   claude_temp_test/2026-08-19-splat-proof/screens/.
   left/top read --face-cx/--face-cy (App.vue) rather than plain 50%/50%
   (unlike .stain above) — the file's own comment on those variables asks
   anything centred on the dial to read them, and this mark is large enough
   for the ~7px bake to be worth the precision. */
.face-splat {
  position: absolute;
  left: var(--face-cx);
  top: var(--face-cy);
  z-index: -1;
  pointer-events: none;
  background: center / contain no-repeat;
  transform-origin: center center;
  /* matches stain-in's own end state (0.88) exactly -- fill-mode is none,
     so once the animation ends this base value takes back over, and a
     mismatched number here would show as a one-frame opacity "pop". */
  opacity: 0.88;
  animation: stain-in 420ms ease-out;
}

#app.static .face-splat {
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
      @if $pos <=
        math.div($item-count, 4) or
        $pos >=
        math.div($item-count * 3, 4)
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

/* The host's own mirrored/face-down grimoire. `:not(.own)` (2026-08-19): a
   demon's or Lunatic's own cluster carries `.own`, and their client's
   `isPublic` is true FOREVER — it starts true and only the HOST ever flips it
   (HostTools, on the deal) — so an unscoped rule blanked the one cluster that
   is supposed to be theirs. The storyteller's own copy can never reach this
   rule anyway now (canSeeBluffs already refuses while isPublic), which makes
   this exactly what it was: belt on top of braces. */
#townsquare.public > .bluffs:not(.own) {
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
