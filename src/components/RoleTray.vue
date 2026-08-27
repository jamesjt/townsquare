<template>
  <!-- Golem fork (FT-859): the UNSEATED TRAY — every character the script
       carries that has no chair yet, as rows of small icons under the build
       panel's "Roles x / y assigned" line. Drag one onto a seat to cast it;
       drag a seated one anywhere that is NOT a seat and it comes back here.

       The tray never assigns anything itself: a drag hands the seat the same
       `golem/role` payload the grimoire drawer sends, so Player.placeRole
       stays the single owner of the one-chair-per-role rule. -->
  <!-- FT-1201: `--rt-tile` is the fitted coin size (see fitTile) — unset
       everywhere the CSS's own fixed sizes are the right answer. -->
  <div
    class="role-tray"
    :class="{ armed: dropArmed }"
    :style="trayStyle"
    v-if="roles.size"
  >
    <RoleHoverCard
      v-if="cardRole"
      :role="cardRole"
      :anchor="cardAnchor"
      @dismiss="hideCard"
    />
    <!-- the same three build actions the grimoire drawer carries, as icons
         with their own tooltips (user call 2026-08-18) -->
    <!-- (the three build actions moved INLINE into the Roles row —
         RoleActions.vue — so the tray carries only characters.) -->
    <!-- THE TRAY'S SCROLLBAR IS THE APP'S OWN (2026-08-19, user call: "if it
         does have a scroll bar, use our blood drip one"). `v-blood-scroll` is
         the fork's overlay scrollbar directive — registered globally in
         main.js, already worn by the grimoire drawer, the night checklist, the
         chronicle, the workbench and five more. Nothing is reimplemented here;
         the tray simply joins the list. -->
    <!-- FT-1175: `cut` says THERE IS MORE BELOW, and it is measured rather
         than assumed — see `.rt-rows.cut` in the styles for what the fixed
         viewport gate it replaces got wrong. -->
    <div
      class="rt-rows"
      :class="{ cut: overflowing }"
      ref="rows"
      v-if="unseated.length"
      v-blood-scroll
      @scroll.passive="hideCard"
    >
      <div class="rt-row" v-for="row in unseatedByTeam" :key="row.team">
        <!-- FT-1175 (user): "Allow clicking to select roles that will
             automatically be dealt a toggle state of on or off."

             A TILE IS A TOGGLE NOW, AND `aria-pressed` SAYS SO. Lit (the
             resting state of every character) means "Deal may pick this";
             unlit means the storyteller has set it aside and Deal skips it.
             The state itself lives in the store (`dealExcluded`) because Deal
             runs in the grimoire drawer, not here. -->
        <span
          v-for="role in row.roles"
          :key="role.id"
          class="rt-icon"
          :class="[
            'team-' + role.team,
            {
              picked: isPicked(role),
              on: !isExcluded(role),
              off: isExcluded(role),
            },
          ]"
          :style="{ backgroundImage: `url(${icon(role)})` }"
          draggable="true"
          role="button"
          tabindex="0"
          :aria-pressed="String(!isExcluded(role))"
          :aria-label="spokenRole(role)"
          :title="tileTitle(role)"
          @dragstart="onDragStart(role, $event)"
          @click="tap(role)"
          @keydown.enter.prevent="pick(role)"
          @keydown.space.prevent="toggleDeal(role)"
          @focus="showCard(role, $event, true)"
          @blur="hideCard"
          @mouseenter="showCard(role, $event)"
          @mouseleave="hideCard"
        ></span>
      </div>
    </div>
    <!-- THE TAP PATH, SAID OUT LOUD. Dragging a character onto a chair is the
         gesture this tray was built around, and HTML5 drag-and-drop does not
         exist on a touch screen — no `dragstart` ever fires (verified on an
         emulated phone, 2026-08-18). The click-to-arm path has always been
         here and always worked; nothing on screen mentioned it, so on a phone
         the tray read as broken rather than as a different gesture.

         The line only appears where the drag is genuinely unavailable, and it
         changes to name the armed character so the second half of the gesture
         is as clear as the first. -->
    <div class="rt-hint" :class="{ armed: !!drawerPick }" v-if="unseated.length">
      <template v-if="drawerPick">
        <font-awesome-icon icon="hand-point-right" />
        {{ drawerPick.name }} — now tap a seat
      </template>
      <template v-else>Tap a character, then tap a seat</template>
    </div>
    <div class="rt-done" v-else-if="dropArmed">
      <font-awesome-icon icon="undo" />
      release to unseat
    </div>
    <div class="rt-done" v-else>
      <font-awesome-icon icon="check" />
      every character seated
    </div>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import RoleHoverCard from "./RoleHoverCard";
import { roleIcon, startRoleDrag } from "../golem/roleDrag";
// FT-949: the drop-outside-to-unseat target itself now lives in App.vue (via
// golem/roleUnseat) so it works for the whole session, not just while this
// tray is mounted. The tray only reads whether it is armed, to keep its own
// highlight.
import { roleUnseatState } from "../golem/roleUnseat";
import dealGlyph from "../assets/ui-deal.png";

// the reading order of the tray: the composition top to bottom, so the rows
// group themselves without any headings eating the panel's height
const TEAM_ORDER = ["townsfolk", "outsider", "minion", "demon"];
// the cursor has to rest on an icon before its card appears — running the
// tray should not strobe cards (the drawer's own delay)
const HOVER_DELAY = 170;

// ── FT-1201: THE COIN SIZE FITS THE ROOM (see fitTile) ──────────────────────
// The FLOOR is today's CSS size, so the fit only ever GROWS the coins — a
// script too big for the box at today's size keeps today's size and scrolls
// under the fade, exactly as before. The gate string is $rt-disc-closes-gate's
// JS twin (the styles below): above it the disc's own tile is 36px, below it
// the base 42px. Keep the three numbers in step with the SCSS variables.
const RT_TILE_FLOOR_GATE = "(min-height: 1080px)";
const RT_TILE_FLOOR_ABOVE_GATE = 36; // $rt-tile-disc
const RT_TILE_FLOOR_BELOW_GATE = 42; // $rt-tile
// The CEILING is taste, not fit: past ~64px a four-coin tray reads as a rack
// of grimoire tokens, not a tray of characters, and the hover lift (1.12)
// starts crowding the rows above.
const RT_TILE_MAX = 64;

export default {
  name: "RoleTray",
  components: { RoleHoverCard },
  data() {
    return {
      dealGlyph,
      // which role the hover card is describing, and the tile it is pinned to
      cardRole: null,
      cardAnchor: null,
      // FT-1175: is there more tray than box? Measured off the scroller, not
      // inferred from the viewport — see `.rt-rows.cut`.
      overflowing: false,
      // FT-1201: the fitted coin size in px, 0 = "the CSS's fixed sizes
      // apply" (every layout that is not the disc band). See fitTile.
      tile: 0
    };
  },
  computed: {
    ...mapState(["roles", "dealExcluded"]),
    /** FT-1201: the fitted size rides a CSS custom property so the styles
     *  below stay the single owner of everything else about a tile. */
    trayStyle() {
      return this.tile ? { "--rt-tile": this.tile + "px" } : null;
    },
    // FT-949: a role is being dragged OFF a seat right now — the tray says
    // so, reading the state the always-mounted target (golem/roleUnseat)
    // maintains rather than owning a drag listener of its own.
    dropArmed() {
      return roleUnseatState.armed;
    },
    /** the tray reads as the composition does: one row per type */
    unseatedByTeam() {
      return TEAM_ORDER.map(team => ({
        team,
        roles: this.unseated.filter(r => r.team === team)
      })).filter(row => row.roles.length);
    },
    seatedCount() {
      return this.players.filter(p => p.role && p.role.id).length;
    },
    allowDup: {
      get() {
        return this.$store.state.allowDupRoles;
      },
      set(on) {
        this.$store.commit("setAllowDupRoles", on);
      }
    },
    ...mapState("players", ["players"]),
    drawerPick() {
      return this.$store.state.drawerPick;
    },
    /**
     * The script's characters with no chair.
     *
     * TRAVELLERS ARE NOT HERE. They sit outside the composition everywhere
     * else in this codebase (gameJSON counts only the four core teams;
     * coreSeats and nonTravelerSeats both filter them out) and they join a
     * town mid-game by the storyteller's fiat, not while it is being built.
     * A tray that listed them could never empty, which would make "what is
     * left to cast" a lie.
     */
    unseated() {
      const seated = new Set(
        this.players.map(p => p.role && p.role.id).filter(Boolean)
      );
      return [...this.roles.values()]
        .filter(r => TEAM_ORDER.includes(r.team) && !seated.has(r.id))
        .sort((a, b) => TEAM_ORDER.indexOf(a.team) - TEAM_ORDER.indexOf(b.team));
    }
  },
  mounted() {
    this.remeasure();
    window.addEventListener("resize", this.remeasure);
  },
  updated() {
    this.remeasure();
  },
  beforeDestroy() {
    clearTimeout(this.$options.cardTimer);
    window.removeEventListener("resize", this.remeasure);
  },
  methods: {
    /**
     * FT-1175: does the tray have more in it than it can show?
     *
     * ASKED OF THE BOX, NOT OF THE WINDOW. The fade this drives used to be
     * gated on `min-height: 1080px` — a viewport size that, when FT-955 wrote
     * it, was exactly where a 36px tile made a full script fit. Two passes
     * have moved that line since (the rows above the tray have their own
     * room now), and a fixed number cannot follow it: at 1080 the fade was
     * off while a 20-seat town's tray was cut 70px short, which is the one
     * state the fade exists for.
     *
     * `updated` plus a resize listener covers every way the answer changes —
     * the roster, the script, the window — and the read is two integer
     * properties on an element that is already laid out, so it costs a
     * comparison, not a reflow.
     */
    measureCut() {
      const el = this.$refs.rows;
      const cut = !!el && el.scrollHeight > el.clientHeight + 1;
      if (cut !== this.overflowing) this.overflowing = cut;
    },
    /** FT-1201: both reads, one handler — the size question first (it moves
     *  the layout the cut question is asked of; a changed `tile` re-renders,
     *  and the second pass through `updated` re-asks measureCut of the fitted
     *  layout). */
    remeasure() {
      this.fitTile();
      this.measureCut();
    },
    /**
     * FT-1201 (user: "there is more vertical space now — can we make the
     * icons scale to use the available space?"): THE COIN SIZE IS SOLVED,
     * NOT FIXED, where the box's height is a given.
     *
     * WHY THIS IS JS AND NOT CSS. The coin size decides how many coins fit a
     * line, which decides how many lines there are, which decides what size
     * fits the height — the row count and the tile size are circular, and
     * CSS can only read one side of the loop (no container-height unit knows
     * how many lines a `flex-wrap` will produce). So the loop is closed here:
     * walk the sizes from the ceiling down and take the first whose wrapped
     * line count fits the box. ~30 candidate sizes over 4 team counts —
     * arithmetic on numbers already read, no layout thrash.
     *
     * WHERE IT RUNS: only where `.rt-rows` is TOLD its height and scrolls
     * the rest — the disc band's shock-absorber mode (`flex: 1 1 auto`,
     * `max-height: none`, `overflow-y: auto`; see the FT-888 block in the
     * styles). The rectangle (max-height cap) and the portrait phone
     * (overflow visible — the sheet is the scroller) both size the box FROM
     * the coins, so fitting the coins to the box there would chase its own
     * tail; they keep the CSS's fixed sizes (`tile` stays 0).
     *
     * THE MODEL, against the styles below: a coin's box is the tile size
     * itself — the app's box-sizing is border-box, so the 1px team ring is
     * INSIDE the width (verified off the live layout: an 11-coin line spans
     * 416px = 11 x 36 + 10 x 2, not 11 x 38) — and 2px of gap between coins
     * and between lines (.rt-row's wrap gap and .rt-rows' row gap are both
     * 2px, so every adjacent pair of lines is 2px apart whichever kind of
     * break sits between them).
     */
    fitTile() {
      const el = this.$refs.rows;
      let next = 0;
      if (el) {
        const cs = getComputedStyle(el);
        if (cs.maxHeight === "none" && cs.overflowY === "auto") {
          // content box: clientWidth/Height include padding, and the
          // blood-drip scrollbar reserves its 30px lane AS padding
          const w =
            el.clientWidth -
            parseFloat(cs.paddingLeft) -
            parseFloat(cs.paddingRight);
          const h =
            el.clientHeight -
            parseFloat(cs.paddingTop) -
            parseFloat(cs.paddingBottom);
          const counts = this.unseatedByTeam.map((r) => r.roles.length);
          const floor = window.matchMedia(RT_TILE_FLOOR_GATE).matches
            ? RT_TILE_FLOOR_ABOVE_GATE
            : RT_TILE_FLOOR_BELOW_GATE;
          next = floor;
          for (let t = RT_TILE_MAX; t > floor; t--) {
            const perLine = Math.max(1, Math.floor((w + 2) / (t + 2)));
            let lines = 0;
            for (const c of counts) lines += Math.ceil(c / perLine);
            if (lines * t + (lines - 1) * 2 <= h) {
              next = t;
              break;
            }
          }
        }
      }
      if (next !== this.tile) this.tile = next;
    },
    /** Deal and Shuffle are the grimoire drawer's own actions — the tray asks
     *  IT to run them, so there is one implementation of each. */
    withDrawer(fn) {
      let node = this.$root;
      const find = c =>
        c.$options.name === "RoleDrawer"
          ? c
          : c.$children.reduce((a, x) => a || find(x), null);
      const drawer = find(node);
      if (drawer) fn(drawer);
      else this.$store.commit("toggleModal", "roleDrawer");
    },
    deal() {
      this.withDrawer(d => d.assignRandomly());
    },
    shuffle() {
      this.withDrawer(d => d.shuffleSeated());
    },
    ...mapMutations(["setDrawerPick"]),
    icon(role) {
      return roleIcon(role);
    },
    /** What a screen reader hears from a tile that carries no text. */
    spokenRole(role) {
      return role.ability ? `${role.name}. ${role.ability}` : role.name;
    },
    isPicked(role) {
      return !!this.drawerPick && this.drawerPick.id === role.id;
    },
    /** FT-1175: set aside — Deal will skip this character. */
    isExcluded(role) {
      return this.dealExcluded.includes(role.id);
    },
    /** Enter (and, on a hoverless pointer, a tap) arms the role for the seat
     *  you click next — the drawer's own pick channel, so the keyboard
     *  reaches the tray too. UNCHANGED by FT-1175; what changed is which
     *  gestures reach it (see `tap`). */
    pick(role) {
      this.setDrawerPick(this.isPicked(role) ? null : role);
    },
    /** FT-1175: in the deal, or set aside. */
    toggleDeal(role) {
      this.$store.commit("toggleDealExcluded", role.id);
    },
    /**
     * FT-1175: WHAT A CLICK ON A TILE MEANS, AND WHY IT DEPENDS ON THE
     * POINTER.
     *
     * Before this change a click ARMED the character for the next seat you
     * clicked — the tap path, the second half of which the hint line below
     * spells out. That path is the ONLY way to seat a character on a touch
     * screen: HTML5 drag-and-drop does not fire there at all (recorded on the
     * hint's own comment, verified on an emulated phone). So a touch tap
     * keeps doing exactly what it did, and the tray on a phone is unchanged
     * by this pass.
     *
     * On a pointer that CAN drag, the drag is the seating gesture and always
     * has been — arming was an unadvertised second way in, which is why the
     * hint line never appeared there. That click is the one this feature
     * takes, and the keyboard keeps both: Enter arms (the accessible seating
     * path, untouched), Space toggles.
     */
    tap(role) {
      if (!window.matchMedia("(hover: hover)").matches) return this.pick(role);
      this.toggleDeal(role);
    },
    /** The tile says which state it is in and what pressing it does — the
     *  enforcement chip's own tooltip model, the one this fork uses for
     *  every toggle. */
    tileTitle(role) {
      const set = this.isExcluded(role);
      return `${role.name} — ${
        set
          ? "set aside; Deal will skip it. Click to put it back in the deal."
          : "in the deal. Click to set it aside."
      }`;
    },
    /**
     * `immediate` means NO DELAY (the keyboard lands on a tile and wants its
     * card at once), not "ignore the pointer". It used to skip the hover
     * check as well — and a touch TAP focuses a tile, so on a phone the tray
     * raised a card of its own on top of App's armed card, and left it up
     * after the character was disarmed (blur never came). On a hoverless
     * pointer the armed card is the one that speaks.
     */
    showCard(role, e, immediate) {
      if (!window.matchMedia("(hover: hover)").matches) return;
      const el = e.currentTarget;
      clearTimeout(this.$options.cardTimer);
      this.$options.cardTimer = setTimeout(
        () => {
          this.cardAnchor = el;
          this.cardRole = role;
        },
        immediate ? 0 : HOVER_DELAY
      );
    },
    hideCard() {
      clearTimeout(this.$options.cardTimer);
      this.cardRole = null;
      this.cardAnchor = null;
    },
    onDragStart(role, e) {
      this.hideCard();
      startRoleDrag(role, e);
    }
  }
};
</script>

<style scoped lang="scss">
// the workbench's team palette (each surface holds its own copy)
$team-colors: (
  "townsfolk": #1f65ff,
  "outsider": #46d5ff,
  "minion": #ff6900,
  "demon": #ce0100
);

// THE TILE, AND THE LIFT THAT CENTRES THE ART IN IT (2026-08-19). The two are
// written together because the second is a fraction of the first: the art is
// painted at the tile's own size (`contain`, square file, square box), so the
// only way to move it is a length, and that length has to be re-derived if the
// tile ever changes size. See `.rt-icon` for the measurement behind 8%.
//
//   50% (the tile's middle) - 42% (the glyph's middle in the file) = 8%
$rt-tile: 42px;
$rt-art-lift: $rt-tile * 0.08;

// FT-955 ("make that a little taller, it is cutting it off before Start"):
// THE DISC'S OWN, SMALLER TILE — CONDITIONAL, not a blanket disc-wide swap.
// The first pass shrank every disc viewport to 35px and was corrected: that
// costs legibility (35px is one pixel above this file's own recorded "smudge
// at arm's length" line at 34px) at BOTH disc viewports, but only pays off at
// one of them. A tray that closes does not need the same medicine as one that
// cannot.
//
// TWO OTHER LEVERS WERE MEASURED FIRST AND BOTH CAME BACK EMPTY (unchanged
// from the first pass, re-confirmed, not re-litigated):
//   Start narrower: already AT its label floor at the disc's own floor
//     viewport (1642x780) — 143px holds "Start game" on one line, shipped is
//     150px. Buys 0.82px of clearance, worth under 1px of tray height.
//   Tray wider: 13 townsfolk need a ~582px column to drop from two lines to
//     one; the band's chord is 401-479px across the whole disc range. A width
//     lever only reshuffles the 8/5 split, never the row COUNT.
//
// SO THE TILE IS THE ONLY LEVER WITH ANYTHING IN IT, because the tray's
// content height is exactly 5 x tile + 4 x 3px gaps (2 townsfolk lines +
// outsider + minion + demon) at every width in range — shrinking the tile is
// the only thing that shrinks that constant.
//
// WHERE IT ACTUALLY CLOSES — measured, not assumed, because the coordinator
// asked "height is the likelier axis, but measure": the tray's own box
// (`.rt-rows` clientHeight, independent of tile size) was swept across the
// disc-build-gate's practical range (rig:
// claude_temp_test/2026-08-19-ft955-threshold{,2,3}.mjs). It tracks VIEWPORT
// HEIGHT almost exactly and is close to width-independent from 1440px to
// 1920px wide:
//
//   height   900   980  1000  1020  1040  1060  1075  1078  1080
//   box      138   163   169   175   181   187   192   193   194
//
// Content at 36px tiles is 5*36+12 = 192px — the EXACT box value at 1075px of
// viewport height, holding from 1440 to 1920 wide. 1920x1080 (194px of box)
// clears it by 2px; 1642x780 (the disc's own floor, 138px of box) is 54px
// short and no tile size in a legible range reaches that far (34px — already
// on record elsewhere in this file as a smudge — only needs 182px of content,
// still 44px more than the floor's box).
//
// THE GATE IS `min-height: 1080px`, 5px above the measured 1075px crossover.
// That margin is spent on the GATE'S OWN correctness (real browser chrome,
// sub-pixel layout, the next reader's viewport not landing on the exact
// measured pixel) — not on tile legibility, which is the coordinator's actual
// point: every pixel of TILE margin costs sharpness for nothing, but a pixel
// of GATE margin costs nothing at all, because the branch it protects against
// (a viewport one px below the true crossover) would only be one clipped
// corner on one tile, not a redrawn button. 1080 is also the recognisable,
// universal round number for "a viewport this tall" — easier for the next
// reader to reason about than 1075.
//
// VERIFIED AGAINST A REAL BUILD, not inferred from the box sweep alone (the
// coordinator's ask): claude_temp_test/2026-08-19-ft955-shots/after2-*.json
// confirms 1920x1080 actually renders all 22 at 36px, not just that the sums
// allow it.
$rt-tile-disc: 36px;
$rt-tile-disc-lift: $rt-tile-disc * 0.08;
// The viewport height above which the tile shrink actually closes the tray —
// named so the two rules that read it (the tile swap and the fade cancel,
// both below) cannot drift apart into two different numbers.
$rt-disc-closes-gate: "(min-height: 1080px)";

// FT-888: THE TRAY IS THE BUILD PANEL'S SHOCK ABSORBER on the clock-face disc.
//
// The disc's band is a fixed slice of the circle — the four rows above this
// tray are fixed heights, and the band cannot scroll (the script picker opens a
// popup out of it, and a scrolling band would clip it). So the one child whose
// height is genuinely a variable takes whatever is left and scrolls the rest,
// which is the job this tray's own `.rt-rows` scroller already does at 132px on
// the rectangle. Here it is told the height instead of guessing it.
//
// Written in THIS file rather than HostTools' because `.rt-rows` is this
// component's own element: a parent's scoped styles reach a child's ROOT (which
// is why `.role-tray` is stylable from there) but nothing inside it.
@import "../faceDisc.scss";

.role-tray {
  @include face-disc-build-gate {
    .host-tools & {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      // NO SIDE PADDING ON THE DISC (2026-08-19). The blood-drip scrollbar
      // reserves a 30px lane inside `.rt-rows`, and a tile is 42px on a 45px
      // pitch — so at 1920x1080 the lane cost the widest row its ninth tile by
      // FIVE pixels (row 402px, content column 397px). These 8px of padding
      // are the cheapest 8px on the panel: nothing sits in them, the armed
      // state's dashed border is drawn on the tray's own edge either way, and
      // handing them back puts the ninth tile in every row.
      //
      //   1920x1080  8 tiles a row -> 9, and the row still clears the rim by
      //              59.1px (the tile is a circle, so the measure is its own
      //              ink — the corner of its square box is transparent).
      padding-left: 0;
      padding-right: 0;

      .rt-rows {
        flex: 1 1 auto;
        min-height: 0;
        max-height: none;

        // FT-955: THE EDGE FADE — the honest answer below the closes-gate
        // (see the variable block above), where the tray keeps the legible
        // 42px tile and genuinely cannot show a full script without
        // scrolling. A hard clip at the box's edge reads as "the end of the
        // list"; a fade reads as "there is more" — the coordinator's own
        // words for what the flat cut was missing.
        //
        // PURE CSS, NO OVERFLOW CHECK NEEDED: every viewport in this branch
        // (below the closes-gate) overflows by construction — content is
        // 222px at 42px tiles, and the box never exceeds ~193px down here
        // (see the sweep table above) — so the fade never has to ask whether
        // there is more, only draw it.
        //
        // A MASK, not a background wash: the material behind this tray is
        // the disc's own translucent glass over the dial art, not a flat
        // colour, so a background gradient would paint a rectangle that does
        // not match whatever happens to be behind it. Fading the CONTENT to
        // transparent instead lets the real backdrop show through, whatever
        // it is.
        //
        // 32px, MEASURED BY EYE AGAINST THE REAL MATERIAL, not assumed: a
        // first pass at 20px only reached the bottom THIRD of the tray's
        // last visible row (13.6px of a 42px tile, most of it still at
        // 70%+ opacity) and read as nothing at a glance — confirmed by
        // screenshot, not just by the math. 32px softens that whole row
        // visibly (checked against 45px and 60px too: those read as the
        // row disappearing rather than trailing off — more than the cue
        // needs). A MASK costs no layout at all: it is painted on the box
        // that already exists, so nothing here moves a row or changes
        // `clientHeight`.
        // ── FT-1175: IT IS DRAWN WHEN THERE IS SOMETHING TO DRAW IT FOR ──
        //
        // The fade used to be unconditional in this branch and switched OFF
        // above `$rt-disc-closes-gate`, on the reasoning quoted above — "every
        // viewport in this branch overflows by construction". That was true of
        // the panel FT-955 measured. It is not a property of the tray: the
        // rows ABOVE it have taken room in two passes since (FT-1168 tabs,
        // FT-1175 spacing and labels), and a 20-seat town at 1920x1080 was
        // being cut 70px short with the fade switched off — the exact state
        // the fade exists for, on the exact viewport the gate exempted.
        //
        // So the question is asked of the BOX now (RoleTray's `measureCut`,
        // `scrollHeight > clientHeight`) and the answer is a class. The gate
        // stays where it belongs — deciding the TILE SIZE below, which is a
        // real property of the viewport — and stops deciding a fact about
        // content it cannot see.
        //
        // Everything about the fade ITSELF is unchanged: same 32px, same
        // measured-by-eye reasoning, same mask rather than a background wash.
        &.cut {
          mask-image: linear-gradient(
            to bottom,
            #000 calc(100% - 32px),
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to bottom,
            #000 calc(100% - 32px),
            transparent 100%
          );

          // ── FT-1252: THE CUT TRAY COMES IN OFF THE RIM ──────────────────
          //
          // The band hands the tray the dead 12px above the Start button now
          // (HostTools' `> .role-tray` rule — the derivation lives there), so
          // the box's bottom rows sit where the disc has narrowed. A tray
          // that FITS is safe there by construction: its bottom row is the
          // demon line, one or two centred coins, nowhere near the chord. A
          // tray that SCROLLS is not — a full-width townsfolk line can be
          // scrolled to the box's bottom edge, and its corner coins' ink
          // crossed the ellipse, measured before this rule, worst visible
          // ink point against the disc's own ellipse (rig:
          // claude_temp_test/2026-08-27-ft1252-measure.mjs; + = inside):
          //
          //                          uninset      at 20px
          //   1920x1080, 139 roles     -3.2        (re-measured below)
          //   1280x960,  139 roles    -10.1   ← and -5.8 BEFORE the band
          //                                    extension: the poke predates
          //                                    this lane; the inset ends it
          //
          // So the inset rides the CUT state — the same measured class that
          // owns the fade — and only on the disc, where there is a rim to
          // respect. 20px covers the worst measured need (~18px at 1280x960
          // for +3px of clearance) with a rounding margin. FT-1231's control
          // tab made the identical move for the identical reason (its well
          // wears 18px; its box stops higher, so it needs less).
          //
          // WHAT IT COSTS A CUT TRAY: nothing it misses. fitTile reads the
          // narrowed clientWidth, so the solve stays honest; Trouble Brewing
          // below the disc-closes gate wraps 13 townsfolk into the same two
          // lines at 8 per line instead of 9, and a 139-role script that
          // already scrolled simply scrolls a little further. A tray that
          // fits never wears this rule, so the fitted sizes above are
          // untouched.
          margin-left: 20px;
          margin-right: 20px;
        }
      }

      // FT-955: THE DISC'S OWN TILE SIZE, ONLY WHERE IT ACTUALLY CLOSES THE
      // GAP — see the variable block above for the measured crossover. Below
      // `$rt-disc-closes-gate` the tray keeps the rectangle's own 42px tile
      // (`.rt-icon`'s base rule, unaffected) and the fade above carries the
      // honesty instead. `.host-tools .role-tray .rt-icon` (three classes)
      // is still more specific than the base rule's two, so this wins
      // regardless of source order once the media query is satisfied.
      // FT-1201: this rule now reads `--rt-tile` too — with the fitted size
      // active it must not fight the base rule (it out-specifies it), and
      // when the script is small the fit lands ABOVE 36px on exactly the
      // viewports this gate matches. The 36px stays as the fallback (and as
      // fitTile's own floor above the gate), so the no-fit behaviour is
      // byte-for-byte what FT-955 measured.
      @media #{$rt-disc-closes-gate} {
        .rt-icon {
          width: var(--rt-tile, #{$rt-tile-disc});
          height: var(--rt-tile, #{$rt-tile-disc});
          background-position: center
            calc(var(--rt-tile, #{$rt-tile-disc}) * 0.08);
        }
      }
    }
  }

  // FT-1175 (user: "get rid a bunch of the extra space, so they don't flow
  // outside of the disc"). THE TRAY GIVES UP ITS OWN FURNITURE FIRST, before
  // anything is asked of the tiles: 6px of vertical margin and 10px of
  // vertical padding were 16px of blank wrapped round a box whose whole
  // content is a grid of circles, and the rows above it are being GIVEN room
  // in the same pass — so every pixel the tray hands back is a pixel that
  // room costs the band nothing.
  //
  // THE SIDE PADDING GOES TOO, everywhere, not only on the disc. The disc
  // gave its 8px back in 2026-08-19 for a measured reason (the ninth tile in
  // a row); the same 8px on the rectangle buys the same thing there, and a
  // tray that is 4px narrower than its own box is a tray whose rows wrap one
  // tile earlier for no visible return.
  //
  // 2px of vertical padding stays, and it is not decoration: the unseat
  // target's dashed border (`.armed`) is drawn on this box's own edge, and at
  // zero it would be drawn straight through the top row of tiles.
  margin: 0 0 2px;
  padding: 2px 0;
  // the border is always there so arming only repaints it — nothing moves
  border: 1px dashed transparent;
  border-radius: 7px;
  transition: border-color 160ms, background 160ms;

  &.armed {
    border-color: rgba(190, 90, 90, 0.75);
    background: rgba(160, 20, 20, 0.12);
  }

  .rt-acts {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin-bottom: 6px;
  }
  .rt-act {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 24px;
    padding: 0;
    // Deal, Shuffle and Dupes are 26x24 plates sitting 6px apart — three of
    // the most consequential controls in the build, at a third of the area a
    // fingertip needs. A coarse pointer gets a proper plate; the glyphs inside
    // are unchanged, so the row still reads as three small marks.
    @media (pointer: coarse) {
      width: 42px;
      height: 40px;
    }
    color: #d8cdb4;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    cursor: pointer;
    img {
      width: 15px;
      height: 15px;
      object-fit: contain;
    }
    &:hover:not(:disabled) {
      color: #fff;
      border-color: rgba(150, 130, 175, 0.75);
    }
    &.on {
      color: #ffd9d9;
      border-color: rgba(190, 90, 90, 0.8);
    }
    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
  .rt-rows {
    display: flex;
    flex-direction: column;
    // FT-1175: 3px -> 2px between the team rows. Four gaps on a full script,
    // so it is 4px of band handed to the tiles themselves; the rows are
    // already separated by being different teams of art, not by the gap.
    gap: 2px;
    // FT-953 (user: "can we make that a little taller, it is cutting it off
    // before Start when it could show all of the icons"). 132px was cutting a
    // full 22-role script (13 townsfolk / 4 outsider / 4 minion / 1 demon —
    // every official base script) off at 17 of 22, on the RECTANGLE layout
    // only: the disc's own copy of this rule is overridden to `none` above
    // (`.host-tools & .rt-rows`) and sized by HostTools' band instead, which
    // is not this file's constraint to move — its own room is already spent
    // down to a 2.7px clearance against the arc at its floor (1642x780; see
    // HostTools.vue's `.ht-body` comment).
    //
    // THE RECTANGLE HAD ROOM THE 132px NEVER SPENT. Measured at 1280x800 with
    // a full 22-role script loaded and nothing dealt (rig:
    // claude_temp_test/2026-08-19-ft953-measure.mjs): the tray's own content
    // needs 222px (5 tile-rows — townsfolk wraps to 2 at this width — plus
    // gaps), while `.host-tools` itself sat at 528px of its own 780px cap
    // (`calc(100vh - 20px)`) — 252px of slack it was never touching. 230px
    // (a few px over the measured 222, for rounding) shows the whole standard
    // script with zero scrolling and still leaves the panel at ~618px, well
    // inside its own cap.
    //
    // A BIGGER CUSTOM SCRIPT STILL SCROLLS, on purpose: the cap is raised
    // to fit the standard composition, not removed. A 25-role homebrew script
    // still wraps into more rows than fit and scrolls here rather than
    // growing the panel into a wall — the original reasoning below is
    // otherwise unchanged.
    max-height: 230px;
    overflow-y: auto;

    // ONE scroll, not two. This window is right on a desktop, where the
    // build panel itself does not need its own scroll at this height. On a
    // portrait phone the panel is a docked sheet that scrolls already, and a
    // scroller inside a scroller just hides the demons behind a second
    // gesture with nothing to announce it. The sheet is the scroller there.
    @media (pointer: coarse) and (orientation: portrait) {
      max-height: none;
      overflow-y: visible;

      // AND THE DRIP'S LANE COMES BACK OFF HERE, because there is no drip.
      // `v-blood-scroll` reserves a 30px gutter on every host it binds to, as
      // an inline style — which is right everywhere the bar can draw, and pure
      // loss on the one surface where this scroller is switched off. These
      // rows are CENTRED, so an unused right gutter does not read as a margin;
      // it reads as the whole tray sitting 15px off-centre.
      //
      // `!important` is the tool because the directive writes a plain inline
      // `padding-right`, and a plain inline declaration outranks every normal
      // rule in the sheet. Nothing else in this file needs it.
      padding-right: 0 !important;
    }
  }
  .rt-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    // FT-1175: 3px -> 2px, the same trade as `.rt-rows` above and worth more
    // here — a townsfolk row runs 8-13 tiles wide, so the pitch drops from
    // 45px to 44px and a row that was one tile short of fitting can find it.
    gap: 2px;
  }
  .rt-icons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
    // a 25-role custom script wraps into rows and then scrolls, rather than
    // growing the panel into a wall (three rows showing, the fourth peeking)
    max-height: 132px;
    overflow-y: auto;
    // the tray sets the panel's width instead of inheriting whatever the
    // longest row happens to be — 8 tiles to a row
    width: 336px;
    max-width: 100%;
  }

  .rt-icon {
    // 34px read as a smudge at arm's length and was under a fingertip on a
    // phone, where this is a primary drag/tap target (user call 2026-08-18).
    // A 13-townsfolk row costs the shrink-to-fit panel about 100px of width
    // for the change; on a phone the row wraps as it already did.
    //
    // FT-1201: `--rt-tile` is the FITTED size (fitTile in the script — set
    // only in the disc band, where the box height is a given and the coins
    // grow to spend it). Everywhere it is unset, these fall back to exactly
    // the fixed sizes that were written here, so nothing off the disc moves.
    width: var(--rt-tile, #{$rt-tile});
    height: var(--rt-tile, #{$rt-tile});
    flex: none;
    background-size: contain;
    // THE GLYPH, NOT THE FILE, IS WHAT GETS CENTRED (2026-08-19, user call —
    // asked for a second time: "why are those icons still not in the middle of
    // the circle?"). `center` centres the IMAGE, and the character art is not
    // centred inside its own image: the official token art reserves the bottom
    // of the file for the name curving round the coin, so the drawn glyph sits
    // high in a square file. Measured off the alpha channel of all 180 icons in
    // src/assets/icons (rig: claude_temp_test/2026-08-19-dealchip-art-measure
    // .mjs), the glyph's bounding-box middle sits at a median 42.4% of the file
    // height — 41.5% across the base-3 scripts alone — against 50.2% across,
    // which is why this is a one-axis correction.
    //
    // A LENGTH, NOT A PERCENTAGE, and that is forced rather than chosen: under
    // `contain` a square file in a square box paints at exactly the box's size,
    // so the positioning slack is zero and EVERY percentage resolves to the
    // same place. (This is why the workbench row — ScriptView's `.icon` — has
    // to scale its art to 130% before `center 13%` can move anything. That
    // route is wrong here: the widest glyph in the set spans 87.6% of its file,
    // so scaling past ~114% starts shearing characters off the sides of a tile
    // that is the thing you drag onto a chair.)
    // FT-1201: the 8% lift is re-derived from the LIVE size, not the fixed
    // one — see the $rt-art-lift block up top for why the lift is a fraction
    // of the tile ("that length has to be re-derived if the tile ever
    // changes size"; now it changes at runtime, so the derivation moved into
    // the calc). $rt-art-lift itself keeps the record of the measurement.
    background-position: center calc(var(--rt-tile, #{$rt-tile}) * 0.08);
    background-repeat: no-repeat;
    border: 1px solid transparent;
    border-radius: 50%;
    cursor: grab;
    transition: transform 120ms, filter 120ms;

    @each $team, $color in $team-colors {
      &.team-#{$team} {
        // the team reads off the ring, so the tray shows at a glance what is
        // still owed to each part of the composition
        border-color: rgba($color, 0.55);
      }
    }

    // ── FT-1201: THE CLICK NO LONGER GROWS THE COIN ───────────────────────
    //
    // `:focus` used to share this rule (scale AND drop-shadow) plus a
    // border-color of its own below. These tiles are `tabindex="0"`, so a
    // CLICK parks focus on the coin — and the focus scale then held it at
    // 1.12 until blur. The toggle read as "the coin grew" instead of "the
    // coin flipped" (user: "clicking one of those grows it which is awkward
    // — just make it toggle the state").
    //
    // Hover keeps the lift — it is transient and ends when the cursor
    // leaves. Focus is split off below: the KEYBOARD still gets a visible,
    // non-growing mark (`:focus-visible`, which a mouse click never
    // matches), and a mouse-parked focus gets nothing, so a click is purely
    // the on/off repaint.
    &:hover {
      outline: none;
      transform: scale(1.12);
      filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.9));
    }
    &:focus {
      outline: none;
    }
    // The keyboard's mark is a RING, not a size: box-shadow so it survives
    // the `.on`/`.off` border repaints (both out-specify a bare border here),
    // in the same bone ink the old focus border used.
    &:focus-visible {
      border-color: #d8cdb4;
      box-shadow: 0 0 0 2px rgba(216, 205, 180, 0.5);
    }

    // ── FT-1175: IN THE DEAL, OR SET ASIDE ────────────────────────────────
    //
    // A tile is a toggle now (user: "clicking to select roles that will
    // automatically be dealt, a toggle state of on or off"), and ON — the
    // resting state of every character — wears the plum: ground AND edge, as
    // asked.
    //
    // THE THREE VALUES ARE NOT NEW. They are FT-1108's own purple restatement
    // of `control-lit`, worn by every chosen row in every dropdown on the
    // setup panel, so a lit tile and a chosen setting are the same event in
    // the same ink. No third purple was invented for this.
    //
    // WHAT THE PURPLE EDGE COSTS, AND WHY IT IS AFFORDABLE. The tile's border
    // has carried the TEAM colour since the tray was built ("the team reads
    // off the ring"), and a lit tile now overrides it. That is paid for
    // twice over: the tray is laid out ONE ROW PER TEAM (`unseatedByTeam`),
    // so the grouping already says which team a tile belongs to without the
    // ring saying it again — and the ring comes straight back the moment a
    // character is set aside, which is exactly when a storyteller is asking
    // "what have I taken out of which team".
    &.on {
      background-color: rgba(96, 74, 128, 0.42);
      border-color: rgba(167, 143, 205, 0.85);
    }
    // SET ASIDE. Not dimmed the way a disabled control is — this tile is
    // still fully pressable and still fully draggable onto a chair, and
    // `control-disabled`'s fade would say otherwise. Greyed and hollow: the
    // art loses its colour (the one cue that survives at 36px), the team
    // ring comes back on a dashed edge, and the ground goes empty.
    &.off {
      background-color: transparent;
      border-style: dashed;
      filter: grayscale(0.85) brightness(0.62);
    }
    // FT-1201: `:focus` -> `:focus-visible` here too, or a clicked-off coin
    // would keep the hover glow after the pointer left (focus stays parked).
    &.off:hover,
    &.off:focus-visible {
      filter: grayscale(0.85) brightness(0.62)
        drop-shadow(0 0 4px rgba(0, 0, 0, 0.9));
    }

    // ARMED FOR THE NEXT SEAT — the tap path's own momentary state, and a
    // different KIND of thing from the two above: it lasts until the next
    // seat is tapped, where in/out of the deal is a standing decision. It
    // took the plum with everything else (user: purple, not red) but keeps a
    // shape of its own — a bright rim and a glow, not a ground — so the two
    // cannot be confused on a tray where every other tile is already purple.
    &.picked {
      border-color: #ece4f8;
      box-shadow: 0 0 7px 1px rgba(167, 143, 205, 0.95);
      transform: scale(1.12);
    }
    &:active {
      cursor: grabbing;
    }
  }

  .rt-done {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 3px 0;
    font-size: 70%;
    opacity: 0.55;
  }

  // The tap-path line is for pointers that cannot drag. A mouse has the drag
  // and does not need to be told about a second way in.
  .rt-hint {
    display: none;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 4px 0 1px;
    font-size: 70%;
    opacity: 0.5;
  }
  @media (hover: none) {
    .rt-hint {
      display: flex;
    }
    // the armed character's own line brightens — it is an instruction now,
    // not a caption
    .rt-hint.armed {
      opacity: 0.85;
      color: #ffbdbd;
    }
    // `cursor: grab` is a promise a touch screen cannot keep
    .rt-icon {
      cursor: pointer;
    }
  }
}
</style>
