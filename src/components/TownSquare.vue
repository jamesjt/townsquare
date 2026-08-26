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
    <!-- FT-1000 (user layering call): the per-seat dial stains moved to
         App.vue, joining the FT-993 centre splat before <FaceHands> -- blood
         sits between the dial art and the hands, and nothing inside
         #townsquare can paint behind #face-hands (measured; see the FT-993
         comment below). -->

    <!-- FT-993 (user correction): the centre-face splat used to render HERE,
         but no integer z-index can put a descendant of #townsquare behind
         #face-hands while #townsquare itself must stay above it (the ring
         and readout have to sit over the hands) -- and the splat's own
         negative slot was a proven hole (buried under #app's own opaque
         background, 0px painted, measured the same way FaceHands.vue
         measures its own). The element, its CSS and its computed pair moved
         to App.vue, mounted immediately before <FaceHands>, so DOM order
         (not a losing z-index tie) puts the hands on top of the blood. See
         App.vue for the live version; townLive/faceSplatLive below still
         live here -- created()'s freeze subscription still needs them. -->

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
           The anchored cluster's "Demon bluffs ✕" pill is retired: its ✕
           lived in the menu strip from 2026-08-19 to FT-958, and now rides
           the cluster itself (`.bluffs-toggle` below, outside this v-if so
           it survives `isBluffsOpen` going false — see that element's own
           comment for why). The no-demon corner panel is a real panel and
           keeps its real heading — hence v-if, not a deletion.

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

    <!-- THE BLUFFS SHOW/HIDE MASK (FT-958) — moved off the toolbar strip
         (Menu.vue's `uiBluffs`, 2026-08-19 to FT-958) onto the cluster it
         belongs to: a BRIDGE overlapping the demon's own coin rim, at the
         seat's own vertical centre, on the column's side — not a label
         riding above it (`bluffAnchor.toggle`, computed alongside the three
         coins in measureBluffAnchor — see that method's own comment for the
         geometry). Same door, same switch: `toggleBluffs` below is the
         unchanged `toggleBluffsOpen` commit Menu.vue's mark used to
         drive — moving its home does not re-implement it.

         DELIBERATELY A SIBLING of `.bluffs` above, not a child of it: that
         div's own v-if includes `isBluffsOpen`, so nesting the mask inside
         would make it vanish exactly when its job is to reopen the cluster.
         Its own v-if drops only `isBluffsOpen` from that same condition —
         present for anyone who can see the cluster at all, open or shut,
         matching Menu.vue's retired `canSeeBluffs` computed exactly. -->
    <img
      v-if="players.length && canSeeBluffs && demonIndex > -1"
      class="bluffs-toggle"
      :class="{ anchored: !!bluffAnchor, off: !isBluffsOpen }"
      :src="uiBluffs"
      :style="bluffToggleStyle"
      :title="
        isBluffsOpen ? 'Hide the demon\'s bluffs' : 'Show the demon\'s bluffs'
      "
      @click.stop="toggleBluffs"
    />

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
// demon, and the Lunatic. One rule, shared with the socket's sender (and, up
// to FT-958, the menu strip's own toggle — that mark now lives here, see
// `.bluffs-toggle` below) so nobody can disagree about who sees what.
import { canSeeBluffs, demonSeatIndex } from "../golem/bluffs";
// FT-958: the show/hide mask itself — moved out of Menu.vue's toolbar strip
// onto the cluster it controls, and baked in the demon's own red (user call):
// this control belongs to the demon's cluster, and every other team-coloured
// mark in the app takes its colour from `$demon` (#ce0100 — src/vars.scss,
// confirmed unanimous with Gradients.vue/RoleDrawer.vue/RoleHoverCard.vue/
// RoleTray.vue/ScriptView.vue/TownInfo.vue's own `.stat.demon`, no
// disagreement to resolve). ui-bluffs-demon.png is a MULTIPLY-BLEND bake of
// the original grey/stone ui-bluffs.png against solid #ce0100 (preserves the
// stone grain/shading — a flat CSS hue-rotate on a near-zero-saturation grey
// measured muddy: [239,108,115] vs the target, see claude_temp_test/
// 2026-08-20-ft958-recolor-test.mjs), then a brightness(1.65) pass to
// restore the source's own luminance level. Measured mean opaque RGB
// [205,1,0] against the target [206,1,0] — within 1 unit (claude_temp_test/
// 2026-08-20-ft958-bake-red.mjs). ui-bluffs.png (the grey original) stays in
// the tree, unreferenced — same "bake stays, original untouched" idiom as
// ui-records.png/life.png elsewhere in this fork.
import uiBluffs from "../assets/ui-bluffs-demon.png";
// Golem fork (FT-936): the hash/RNG this file's own stainOrder() shares with
// the centre-face splat picker (moved here from a local copy -- MEMORY-CORE
// rule 2). `pickFaceSplat` itself moved out with the splat's rendering --
// FT-993, App.vue now owns picking and drawing the mark.
// FT-1000: hashString/seededRandoms now imported by App.vue, where the
// stain math lives.

// FT-1000: the stains bundle, sizing constants and shuffle bag moved to
// App.vue with the .blood-dial element itself.

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
    // FT-1000: deadStains moved to App.vue with its element.
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
    /**
     * FT-958: the show/hide mask's own pixel centre, bridging the demon's
     * coin rim at `bluffAnchor.toggle` (see measureBluffAnchor). Null when
     * unanchored — the mask's own CSS carries a static fallback position for
     * that case (`.bluffs-toggle`'s un-classed rule below), the same
     * "static corner, measured position once anchored" split every other
     * piece of this cluster already uses. `--seat-sz` sizes the mask
     * against the SAME coin it now sits on (this element is a sibling of
     * `.bluffs`, not a descendant, so it needs its own copy of the variable
     * rather than inheriting `.bluffs`'s).
     */
    bluffToggleStyle() {
      if (!this.bluffAnchor || !this.bluffAnchor.toggle) return null;
      const { left, top } = this.bluffAnchor.toggle;
      return {
        left: `${left}px`,
        top: `${top}px`,
        "--seat-sz": `${this.bluffAnchor.size}px`,
      };
    },
    /** The show/hide state, held in the store so the mask (now riding the
     *  cluster itself, not the menu strip — FT-958) and this cluster are the
     *  same switch, and so it survives a reload. */
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
    // faceSplat / faceSplatStyle (the FROZEN-seed pick and its render style)
    // moved to App.vue with the element itself -- FT-993. This computed
    // block used to be their only reader; townLive/faceSplatLive above are
    // still read by created()'s freeze subscription below and stay put.
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
      // FT-958: the show/hide mask's own art — moved here from Menu.vue's
      // toolbar strip, riding the cluster it controls.
      uiBluffs,
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
   * Golem fork (FT-936, freeze moved to the store FT-991): freezes
   * grimoire.faceSplatSeed the moment THIS client learns the game is live,
   * and re-freezes it on every later deal — so the splat is stable within a
   * game (see faceSplat's own comment) but still rolls fresh for a second
   * game in the same town, in the same tab.
   *
   * The freeze COMMITS to the store rather than setting local data, because
   * TownInfo.vue reads it too now (FT-991: its `.info` background carries
   * the splat, replacing the demon-head knocker at that element's own
   * z-index, in front of the clock face and behind the badge/counts/phase
   * button it always sat behind). TownSquare is the right component to own
   * the ONE subscriber that does the freezing — it is ALWAYS mounted for
   * the whole session (line ~313, no v-if), unlike TownInfo, which
   * unmounts and remounts around every nomination (App.vue swaps it for
   * Vote.vue). A subscriber living on TownInfo would miss every mutation
   * that fires while a vote has it unmounted, and would re-run its
   * best-effort "already live" fallback on every remount, re-rolling the
   * mark after each vote — visibly wrong ("why did the mark change").
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
      this.$store.commit(
        "setFaceSplatSeed",
        this.faceSplatLive + "::" + this._faceSplatGen,
      );
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
     * Golem fork (2026-08-19, FT-939 — the user's second ask for this, "sigh"):
     * measures the demon's own rendered coin and stacks the three bluffs in a
     * VERTICAL COLUMN beside it — not a diagonal fan. The previous pass placed
     * the row along the bisector of the seat's outward spoke and its screen
     * side, which is only horizontal at 3 and 9 o'clock; everywhere else
     * (12 and 6 o'clock most visibly) that bisector is a 45° diagonal. This
     * pass drops the bisector entirely: the column's x is fixed (touching the
     * seat's rim, on the side `side` below picks) and its three y's are the
     * seat's own vertical centre plus/minus one step — vertical BY
     * CONSTRUCTION, at every clock position, not as an outcome of a search.
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
       *
       * FT-939: this vector now drives ONLY `side` below — it no longer
       * feeds the row's own direction (that direction is fixed vertical),
       * so the cluster's PLACEMENT still tracks the ring's own rotation
       * (still correctly measured in screen space, still never confused by
       * a rotated/clipped seat box) while its ARRANGEMENT no longer does.
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
       * (2026-08-19, user call #3, UNCHANGED by FT-939): ONE SIDE OF THE
       * SEAT, in screen space. `ox` — the outward unit vector's screen-x
       * component, computed above off the seat's own rotation matrix rather
       * than any bounding box — already answers "which side": positive means
       * the seat sits right-of-hub, negative left-of-hub. At 12 and 6
       * o'clock ox≈0, and the `> 0.05` threshold resolves that to -1
       * (screen-left) — the "top or bottom → left" rule fires for free, with
       * no separate case needed for those two seats.
       */
      const side = ox > 0.05 ? 1 : -1;
      const size = seatRect.width;
      const rootLeft = rootRect.left;
      const rootTop = rootRect.top;
      // A bluff coin is 0.4 seat-widths square (see the CSS below) — half 0.2.
      const COIN_HALF = 0.2;
      const coinHalfPx = size * COIN_HALF;
      /**
       * The one number that says "against the coin, not near it": how much
       * daylight is left between the demon's rim and the column's near edge.
       * Proportional so it reads the same at a 6-seat town's 124px coins
       * (~6px) and a 15-seat phone's 45px ones (~2px) — a fixed pixel value
       * would be invisible on one and a gutter on the other.
       */
      const TOUCH = size * 0.05;
      const SPREAD = 0.34; // vertical spacing between the 3 coins, unchanged
      /**
       * THE COLUMN (FT-939). One x, fixed by `side` — never re-derived per
       * coin, so the three centres line up on screen by construction, not by
       * a search that happens to succeed. Three y's, evenly spaced around the
       * seat's own vertical centre — so "vertical, evenly spaced" is true
       * before any collision handling runs, at every clock position.
       */
      const axisX = seatCx + side * (seatRadiusPx + coinHalfPx + TOUCH);
      const rowYs = [-1, 0, 1].map((k) => seatCy + k * size * SPREAD);
      const EDGE_PAD = 2;
      const inViewport = (box) =>
        box[0] >= EDGE_PAD &&
        box[1] >= EDGE_PAD &&
        box[2] <= window.innerWidth - EDGE_PAD &&
        box[3] <= window.innerHeight - EDGE_PAD;
      /**
       * Every box this cluster must clear, in screen pixels: every seat's own
       * name plate (the demon's own EXEMPT — FT-958, see below), every OTHER
       * seat's life coin (the demon's own is exempt — the cluster is allowed
       * to sit on it), and every reminder on the board. Measured rather than
       * assumed, the same "read the box already laid out" idiom the rest of
       * this method uses.
       */
      const collisionRects = [];
      /**
       * FT-958: the demon's OWN name plate is exempt, same reasoning as its
       * own coin two loops down — the cluster belongs to that seat. Measured
       * (claude_temp_test/2026-08-20-ft958-collision-probe.mjs): the plate is
       * WIDER than the coin above it (a name can run longer than a coin is
       * wide) and sits directly below-left of it, so the bottom bluff's ideal
       * box (dxOut 0, the intended ~TOUCH gap) clipped the plate's corner by
       * under 3px — enough to fail `clears()` and rigid-push the WHOLE column
       * outward by two more nudge steps, reading as a visible gutter instead
       * of "nearly touching" (the bug this fixes). Un-exempted, this is the
       * one collision box guaranteed to sit close to the column at every
       * clock position, because it is anchored to the same seat the column
       * is — every other seat's plate is exactly one seat-spacing further
       * away and was never the trigger.
       */
      rootEl.querySelectorAll(".player > .name").forEach((el) => {
        if (el.closest("li") === seatLi) return;
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
      // dxOut >= 0: further from the seat along `side`. dy: the whole column
      // slid up or down. Both translate all three coins RIGIDLY (same dx,
      // same dy for every coin), so however the search resolves, the column
      // that results is exactly as vertical and evenly spaced as the ideal
      // one — there is no per-coin freedom left to break that.
      const columnBoxes = (dxOut, dy) =>
        rowYs.map((y) => {
          const cx = axisX + side * dxOut;
          const cy = y + dy;
          return [
            cx - coinHalfPx,
            cy - coinHalfPx,
            cx + coinHalfPx,
            cy + coinHalfPx,
          ];
        });
      /**
       * THE SEARCH CANNOT TILT THE CLUSTER (FT-939's replacement for the old
       * ray sweep). There is no angle left to try — the column's axis is
       * fixed — so the only two freedoms are both plain translations:
       *   (a) push further from the seat, along `side` (dxOut, outward only)
       *   (b) slide the whole column up or down (dy, either sign)
       * dy is tried first and smallest-first (closest to the seat's own
       * centre is the least surprising place for its bluffs to sit), then
       * dxOut grows the same way. If nothing clears, the ideal column is kept
       * and allowed to overlap — the user's own instruction from the FT-891
       * pass: a cluster sitting on a name plate still reads as the demon's,
       * one exiled to a corner does not.
       */
      const MAX_NUDGE = size * 0.5;
      const NUDGE_STEP = Math.max(2, size * 0.04);
      const dySteps = [0];
      for (let k = 1; k * NUDGE_STEP <= MAX_NUDGE + 0.001; k++) {
        dySteps.push(k * NUDGE_STEP, -k * NUDGE_STEP);
      }
      const dxSteps = [0];
      for (let k = 1; k * NUDGE_STEP <= MAX_NUDGE + 0.001; k++) {
        dxSteps.push(k * NUDGE_STEP);
      }
      let chosen = null;
      let onscreenOnly = null;
      for (let i = 0; i < dySteps.length && !chosen; i++) {
        for (let j = 0; j < dxSteps.length && !chosen; j++) {
          const dy = dySteps[i];
          const dxOut = dxSteps[j];
          const boxes = columnBoxes(dxOut, dy);
          if (!boxes.every(inViewport)) continue;
          if (!onscreenOnly) onscreenOnly = { dxOut, dy };
          if (boxes.every(clears)) chosen = { dxOut, dy };
        }
      }
      if (!chosen) chosen = onscreenOnly || { dxOut: 0, dy: 0 };
      let boxes = columnBoxes(chosen.dxOut, chosen.dy);
      /**
       * The last-resort on-screen fix is a UNIFORM translation of the whole
       * column by the least amount that brings its bounding box inside the
       * viewport — never a per-coin clamp, which would collapse the column
       * into a stack against the edge and lose the one thing (its shape)
       * that says these three belong together. A uniform shift keeps every
       * x equal and every y-gap even, same as the search above.
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
      if (fixX || fixY) {
        // fixX is a screen-space shift; columnBoxes' dxOut moves along
        // `side`, so convert back through the same sign.
        boxes = columnBoxes(chosen.dxOut + fixX * side, chosen.dy + fixY);
      }
      const coins = boxes.map((b) => ({
        left: (b[0] + b[2]) / 2 - rootLeft,
        top: (b[1] + b[3]) / 2 - rootTop,
      }));
      /**
       * FT-958 REPOSITION (coordinator ask, same session): no longer a label
       * riding above the column — a BRIDGE, overlapping the demon's own
       * coin RIM at the seat's own vertical centre (`seatCy`, the same
       * centre `rowYs` is spaced around), on the `side` the column is on.
       *
       * Anchored off the RAW seat geometry (`seatCx`/`seatCy`/
       * `seatRadiusPx`, computed at the top of this method, well before the
       * collision search) rather than the post-search `boxes` — same
       * reasoning as the earlier placement: kept OUT of `clears()`, so
       * nothing about the mask can move a coin, and the coin's own true
       * centre never shifts regardless of what the search does to the
       * column, so anchoring off it (not off the search's output) is the
       * more stable reference for a mark whose whole job is to sit ON that
       * coin.
       *
       * `rimX`: exactly on the coin's own rim, along the column's axis —
       * the ask was "far enough toward the coin that it overlaps the rim
       * rather than floating in the gap", and the rim is that boundary.
       * Centring the mask there puts most of its own footprint ON the coin
       * (its half-width reaches further inward, over the coin's face, than
       * outward past the rim), with just enough reach past the rim to lap
       * onto the column's near coin — TOUCH (5% of a seat-width, the gap
       * the earlier fix closed) is smaller than the mask's own half-width,
       * so it always bridges the gap rather than floating inside it.
       *
       * `--seat-sz`-SCALED again (not the flat 24px the above-the-column
       * placement used): that flat size was sized against a fixed ~20px
       * top-of-viewport reserve that only bound the 12-o'clock case: at the
       * seat's own vertical centre the mask is nowhere near a viewport edge
       * for any clock position (measured — see the screenshots this pass
       * produced), so the constraint that justified a flat size is gone.
       * Scaling with the coin it now sits on is what makes it read as
       * PART of that coin rather than a stray badge that happens to be
       * nearby.
       */
      const TOGGLE_HALF = size * 0.11;
      const rimX = seatCx + side * seatRadiusPx;
      let toggleCx = rimX;
      let toggleCy = seatCy;
      if (toggleCy - TOGGLE_HALF < EDGE_PAD) toggleCy = EDGE_PAD + TOGGLE_HALF;
      else if (toggleCy + TOGGLE_HALF > window.innerHeight - EDGE_PAD)
        toggleCy = window.innerHeight - EDGE_PAD - TOGGLE_HALF;
      if (toggleCx - TOGGLE_HALF < EDGE_PAD) toggleCx = EDGE_PAD + TOGGLE_HALF;
      else if (toggleCx + TOGGLE_HALF > window.innerWidth - EDGE_PAD)
        toggleCx = window.innerWidth - EDGE_PAD - TOGGLE_HALF;
      const toggle = {
        left: toggleCx - rootLeft,
        top: toggleCy - rootTop,
      };
      this.bluffAnchor = {
        size,
        title: null,
        coins,
        toggle,
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
    /**
     * FT-966: the swap itself, split out of swapPlayer's "target picked"
     * branch so a drag can land here directly, with both indices already in
     * hand, instead of going through the menu's arm-this-seat / click-that-
     * seat two-step. Same store commit, same nomination bookkeeping, either
     * way in.
     */
    doSwap(fromIndex, toIndex) {
      if (this.session.nomination) {
        // update nomination if one of the involved players is swapped
        const updatedNomination = this.session.nomination.map((nom) => {
          if (nom === fromIndex) return toIndex;
          if (nom === toIndex) return fromIndex;
          return nom;
        });
        if (
          this.session.nomination[0] !== updatedNomination[0] ||
          this.session.nomination[1] !== updatedNomination[1]
        ) {
          this.$store.commit("session/setNomination", updatedNomination);
        }
      }
      this.$store.commit("players/swap", [fromIndex, toIndex]);
    },
    /** FT-966: movePlayer's own "target picked" branch, split out the same
     *  way doSwap is — see doSwap for why.
     *
     *  IT EXCHANGES THE TWO SEATS; it does not reorder the table (user call
     *  2026-08-20: "just exchange the two seats"). `players/move` is a SPLICE
     *  — move someone to a non-adjacent empty seat and every seat in between
     *  shifts by one, which is what a seating chart does and NOT what this
     *  gesture looks like it does. The drag made that visible: a two-step menu
     *  was rare enough to hide it, a drag is not.
     *
     *  The call site changed rather than the mutation. `players/move` is
     *  relayed over the socket and persisted, so it is a named primitive whose
     *  meaning other code reads — and it keeps that meaning, unused here.
     *  Because the menu's own "Move player" row shares this method, both
     *  surfaces changed together, which is the point.
     *
     *  The nomination bookkeeping below is the SPLICE's — indices between the
     *  two seats shifted, so nominations pointing at them had to follow. An
     *  exchange moves exactly two seats, so only those two need remapping,
     *  which is what doSwap already does. */
    doMove(fromIndex, toIndex) {
      if (this.session.nomination) {
        const updatedNomination = this.session.nomination.map((nom) => {
          if (nom === fromIndex) return toIndex;
          if (nom === toIndex) return fromIndex;
          return nom;
        });
        if (
          this.session.nomination[0] !== updatedNomination[0] ||
          this.session.nomination[1] !== updatedNomination[1]
        ) {
          this.$store.commit("session/setNomination", updatedNomination);
        }
      }
      this.$store.commit("players/swap", [fromIndex, toIndex]);
    },
    swapPlayer(from, to) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (to === undefined) {
        this.cancel();
        this.swap = from;
      } else {
        this.doSwap(this.swap, this.players.indexOf(to));
        this.cancel();
      }
    },
    movePlayer(from, to) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (to === undefined) {
        this.cancel();
        this.move = from;
      } else {
        this.doMove(this.move, this.players.indexOf(to));
        this.cancel();
      }
    },
    /**
     * FT-966: the name-plate drag's own landing — one call, both indices
     * already known, occupancy alone deciding swap vs move. `toIndex` is
     * this seat's own index (TownSquare bound it per-instance in the
     * template below); `fromIndex` is what the plate carried in
     * `golem/player-from`. Routes to the exact same doSwap/doMove the
     * menu's two-step "Swap seats"/"Move player" rows land on above.
     */
    dragPlayer(toIndex, fromIndex) {
      if (this.session.isSpectator || this.session.lockedVote) return;
      if (fromIndex === toIndex || !this.players[fromIndex]) return;
      if (this.players[toIndex] && this.players[toIndex].id) {
        this.doSwap(fromIndex, toIndex);
      } else {
        this.doMove(fromIndex, toIndex);
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
/* FT-1000: .blood-dial CSS moved to App.vue with its element. @keyframes
   stain-in below STAYS -- it is unscoped and .face-splat (App.vue) and the
   relocated stains both ride it. */

@keyframes stain-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.88;
  }
}

/* the app's animation kill-switch */

/* The centre-face splat (FT-936; visible mark FT-991; relocated FT-993).
   `.face-splat`'s markup, computed pair and CSS rule now live in App.vue,
   mounted directly before <FaceHands> -- neither #townsquare nor #app forms
   its own stacking context, so nothing nested in here can out-z-index
   #face-hands without either falling into the negative-z hole (measured
   0px painted, same hole FaceHands.vue's own probe found) or winning a
   DOM-order tie it should lose (measured: at equal z-index the splat, being
   later in the document, painted OVER the hand it crossed). Moving the
   element earlier in the document, not tuning its z-index, is what actually
   fixes that -- see App.vue for the current version and its own comment. */

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

/***** The bluffs show/hide mask (FT-958, repositioned same session) *****
   Off the toolbar strip, onto the cluster it controls. Two positions, same
   split as `.bluffs` itself above: a STATIC fallback (no demon to anchor
   to — bluffAnchor null, matching the corner panel's own untouched fallback)
   and an ANCHORED one riding the demon's own coin rim via inline left/top
   from `bluffToggleStyle` (bluffAnchor.toggle, computed in
   measureBluffAnchor — the seat's own vertical centre, on the column's
   side, overlapping the coin's rim rather than floating above the column).
   The mask itself never enters the coins' own collision search — see that
   computation's own comment for why. */
#townsquare > .bluffs-toggle {
  position: absolute;
  z-index: 51;
  // static fallback: near the corner panel's own top edge (that panel sits
  // `bottom: 10px; left: 10px` above), so the switch sits where its own
  // panel appears rather than a spot unrelated to it.
  bottom: 168px;
  left: 14px;
  width: 26px;
  height: 26px;
  cursor: pointer;
  // A drop-shadow ALONE (the mask's original treatment, sized for sitting on
  // the dark background between seats) measured fine on the stone rim but
  // thin against the coin's own busy gold/bronze face once this mark moved
  // onto it — a soft dark halo (an extra drop-shadow pass, larger blur, no
  // offset) reads as an outline around the mask's own silhouette without
  // squaring it off the way a CSS `border` would. See the comment on
  // `&.anchored` below for the measurement that motivated this.
  filter: drop-shadow(0 1px 2px black) drop-shadow(0 0 3px rgba(0, 0, 0, 0.9));
  transition:
    opacity 200ms ease-in-out,
    filter 200ms ease-in-out;

  &:hover {
    filter: drop-shadow(0 1px 2px black) drop-shadow(0 0 3px rgba(0, 0, 0, 0.9))
      brightness(1.15);
  }

  // NO DIM WHEN OFF (user call 2026-08-20: "that needs to be less hidden when
  // not active — in fact you can probably just leave it always fully red").
  //
  // It arrived carrying the toolbar's own dim-and-desaturate step-back
  // (opacity 0.34 + grayscale, from Menu.vue's retired `.player-strip
  // img.off`), which worked where it came from: that strip is a ROW of marks
  // where the dim one reads against its lit neighbours. Out here the mask
  // stands alone, half of it over dark background, with nothing to be dim
  // relative to — so "off" just read as "barely there", and the control that
  // is the ONLY way back to the bluffs is the last one that should be hard to
  // find. The reposition lane measured and flagged exactly this.
  //
  // THE STATE IS STILL LEGIBLE, and better than the dim ever said it: the
  // three coins are either beside the seat or they are not. The toggle does
  // not have to report a state that the thing it toggles is already showing
  // in full. Its `title` still names the action either way.
  //
  // The `.off` class stays bound in the template — it is what a future
  // treatment would hang on, and removing the hook to remove the styling
  // would be a bigger change than the user asked for.

  // `--seat-sz`-SCALED again (the flat 24px the above-the-column placement
  // used was sized against a fixed top-of-viewport reserve that no longer
  // applies at the seat's own vertical centre — see measureBluffAnchor's
  // own comment). Measured on the coin's gold/bronze face at a 121.5px
  // coin (claude_temp_test/2026-08-20-ft958-shots/ — the reposition pass):
  // the red silhouette's own mean opaque RGB is unchanged by what is
  // UNDER it (a PNG's own pixels don't pick up the background), so the
  // question was legibility, not colour drift, and the halo above answers
  // that at the size the coin's own detail competes with it.
  &.anchored {
    bottom: auto;
    transform: translate(-50%, -50%);
    width: calc(var(--seat-sz, 15vmin) * 0.22);
    height: calc(var(--seat-sz, 15vmin) * 0.22);
  }
}

/***** A DRAWER IS OUT — the demon's bluffs stand down (FT-1141) *****
   The paint order is fixed at its cause (drawer.scss's `right-drawer` now
   sits at 55, above everything the square paints — see that comment), so
   nothing of this cluster can land ON a drawer any more. This rule is the
   second half of the same call, and it is about the ANCHOR rather than the
   stacking: these three coins and their mask are pinned to the DEMON'S OWN
   SEAT, and a full-height drawer covers a third of the ring. Left merely
   behind it, the cluster is furniture in a room the storyteller is not
   looking at — sliced in half wherever the drawer's edge happens to cross
   its column, and half-clickable on whichever side pokes out.

   `#app.drawer-out` is App.vue's `anyDrawerOpen` — the ONE computed that
   knows which drawers count (`rightDrawerOpen` plus the grimoire), the one
   its own comment says to extend and nowhere else. Adding a drawer there
   still adds it here for free.

   THE GRIMOIRE IS DELIBERATELY IN THAT SET. It is the one drawer that
   carries its OWN "Demon bluffs" section (RoleDrawer.vue's `.rd-bluffs`,
   gated on `canSetBluffs` — `!isSpectator`, so EVERY storyteller has it, not
   just the no-demon case this square's cluster hands off for). With the
   grimoire open the bluffs are already on screen, in the drawer; standing
   this copy down removes a duplicate rather than a control.

   OPACITY, NOT `display: none` AND NOT A `v-if`:
     - the cluster keeps its box, so `measureBluffAnchor`'s geometry (and the
       ResizeObserver watching it) survives a drawer opening and closing with
       nothing to re-measure — closing the drawer puts everything back on the
       same pixel it left;
     - `pointer-events: none` is what actually makes it unreachable, so a
       faded coin cannot be clicked through a drawer sitting over it;
     - the cluster's own `v-if` stays the PRIVACY belt it was built as
       (`canSeeBluffs` — no role name in a player's DOM at all). This is a
       layout call on top of that, never a substitute for it.

   The mask is covered by the same rule ON PURPOSE, and only while a drawer
   is out. It is a SIBLING of the cluster precisely so it survives
   `isBluffsOpen` going false — that is untouched: shut the drawer and the
   mask is back in its old state, still the way to re-open hidden bluffs. */
#app.drawer-out #townsquare > .bluffs,
#app.drawer-out #townsquare > .bluffs-toggle {
  opacity: 0;
  pointer-events: none;
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
