<template>
  <transition name="rd-slide">
    <div
      class="role-drawer"
      v-if="modals.roleDrawer"
      :style="sheetStyle"
      @dragover.prevent
      @drop="onDrawerDrop"
    >
      <!-- PHONE ONLY: on a phone this drawer is a bottom sheet (drawer.scss's
           `bottom-sheet`), and a sheet needs a handle to pull down and a × to
           tap. Both are display:none on desktop, where the left-edge tab has
           always been the way in and out — nothing there changes. -->
      <div class="gs-handle" @pointerdown="startSheetDrag"></div>
      <!-- FT-951: THE close mark, shared with every close control in the app
           (src/components/CloseX.vue) — keeps both @pointerup and @click
           bound directly to it (the phone's pointer-driven dismiss and the
           desktop click), same as before. -->
      <CloseX
        class="rd-close"
        title="Close the grimoire"
        @pointerup.native="sheetDismiss"
        @click.native="sheetDismiss"
      />
      <!-- the how-to rides the title as a tooltip; the actions sit at the top
           where they are reachable without scrolling (user call 2026-08-18) -->
      <h3
        class="rd-title"
        title="Drag a role onto a seat — or click one, then click a seat. Drag a seated role back here to unassign it."
      >
        Grimoire
      </h3>
      <!-- The `title` above is the ONLY place the click-then-click path is
           written down, and a touch screen has no way to raise a tooltip. It
           is also the only path that works there — HTML5 drag-and-drop fires
           nothing at all under a finger. So on a hoverless pointer the same
           sentence becomes a visible line, naming the armed role once there
           is one. -->
      <div class="rd-hint" :class="{ armed: !!drawerPick }">
        <template v-if="drawerPick">
          <font-awesome-icon icon="hand-point-right" />
          {{ drawerPick.name }} — now tap a seat
        </template>
        <template v-else>Tap a character, then tap a seat</template>
      </div>
      <div class="rd-acts">
        <button
          class="rd-act"
          @click="assignRandomly"
          title="Deal the remaining valid roles out to the open seats"
        >
          <img class="act-glyph" :src="dealGlyph" alt="" />
          Deal {{ openSeats }}
        </button>
        <button
          class="rd-act"
          :disabled="seatedCount < 2"
          @click="shuffleSeated"
          title="Randomize the selected roles among the seats"
        >
          <font-awesome-icon icon="random" />
          Shuffle
        </button>
        <label
          class="rd-dup"
          :class="{ on: allowDup }"
          title="Let one role sit in more than one chair"
          @click="allowDup = !allowDup"
        >
          <font-awesome-icon :icon="allowDup ? 'check-square' : 'square'" />
          Dupes
        </label>
      </div>
      <!-- FT-858: the drawer's rows read through THE role hover card — the
           same component the Almanac workbench's shelf and the seats use
           (user-directed: one component, every surface). It replaces the
           browser's own `title` box, which arrived late, wrapped badly and
           carried the ability alone. -->
      <RoleHoverCard
        v-if="cardRole"
        :role="cardRole"
        :anchor="cardAnchor"
        @dismiss="hideCard"
      />
      <div class="rd-groups" v-blood-scroll @scroll.passive="hideCard">
        <section
          v-for="team in teams"
          :key="team"
          :class="'team-' + (team === 'traveler' ? 'traveler' : team)"
          v-show="grouped[team] && grouped[team].length"
        >
          <h4 @click="fold(team)">
            <img
              v-if="teamGlyph(team)"
              class="team-glyph"
              :src="teamGlyph(team)"
              alt=""
            />
            <font-awesome-icon
              v-else-if="teamIcon(team)"
              class="team-glyph-fa"
              :icon="teamIcon(team)"
            />
            {{ labels[team] }}
            <small>{{ placedInTeam(team) }} / {{ comp[team] || "–" }}</small>
            <font-awesome-icon
              class="caret"
              icon="chevron-down"
              :class="{ open: !folded[team] }"
            />
          </h4>
          <ul v-show="!folded[team]">
            <li
              v-for="role in grouped[team]"
              :key="role.id"
              class="rd-token"
              :class="{
                placed: placedCount(role) > 0 && !allowDup,
                picked: drawerPick && drawerPick.id === role.id
              }"
              :draggable="String(allowDup || !placedCount(role))"
              @dragstart="dragRole(role, $event)"
              @click="clickRole(role)"
              @mouseenter="showCard(role, $event)"
              @mouseleave="hideCard"
              :aria-label="spokenRole(role)"
            >
              <span
                class="icon"
                :style="{ backgroundImage: `url(${roleIcon(role)})` }"
              ></span>
              <span class="nm">{{ role.name }}</span>
              <span class="who" v-if="seatedNames(role)">· {{ seatedNames(role) }}</span>
              <span class="cnt" v-if="placedCount(role) > 1"
                >x{{ placedCount(role) }}</span
              >
            </li>
          </ul>
        </section>
      </div>

      <!-- ── THE DEMON BLUFFS, pinned to the drawer's floor ────────────────
           A SECOND WINDOW ONTO ONE SET OF DATA (user call 2026-08-19), never
           a second copy of it: every slot here commits `players/setBluff`,
           the same mutation the clock face's own cluster commits, so the two
           surfaces cannot drift apart.

           WHY a second window. The face cluster docks to the DEMON'S OWN SEAT
           (TownSquare's `measureBluffAnchor`), so a town with no demon dealt
           has nowhere to reach the bluffs from — and that is the whole build
           phase, which is exactly when a storyteller picks them. This section
           needs no demon and no dealt town.

           OUTSIDE `.rd-groups` on purpose: the character list above goes on
           scrolling and the three slots stay on the floor, always reachable.

           The gate is the SPECTATOR half of the face cluster's own
           `canSeeBluffs` (see `canSetBluffs` below for why only that half).
           A v-if rather than a CSS hide, for the same reason TownSquare
           gives: a spectator's DOM then holds no bluff name or icon to find
           by inspecting it. -->
      <section class="rd-bluffs" v-if="canSetBluffs">
        <h4
          title="Drag a character into a slot — or tap a character, then tap a slot. Drag a bluff back into the list to clear it."
        >
          <img
            v-if="teamGlyph('demon')"
            class="team-glyph"
            :src="teamGlyph('demon')"
            alt=""
          />
          Demon bluffs
          <small>{{ bluffsSet }} / {{ bluffSize }}</small>
        </h4>
        <ul>
          <li
            v-for="i in bluffSize"
            :key="i"
            class="rd-bluff"
            :class="{ armed: !!drawerPick, filled: !!bluffRole(i - 1) }"
            :draggable="String(!!bluffRole(i - 1))"
            :aria-label="spokenBluff(i - 1)"
            @dragstart="dragBluff(i - 1, $event)"
            @dragover.prevent
            @drop="onBluffDrop(i - 1, $event)"
            @click="tapBluff(i - 1)"
          >
            <Token :role="bluffs[i - 1]" />
          </li>
        </ul>
      </section>
    </div>
  </transition>
</template>

<script>
import gameJSON from "../game";
import dealGlyph from "../assets/ui-deal.png";
import { mapMutations, mapState } from "vuex";
// One definition of "the glyph for team X" (golem/glyphs), shared with
// TownInfo, ScriptView and EditionModal — it used to be a copy per surface.
import { teamGlyph as teamGlyphSrc } from "../golem/glyphs";
// FT-858: THE role hover card, shared with the Almanac workbench's shelf and
// the seats in the square.
import RoleHoverCard from "./RoleHoverCard";
import CloseX from "./CloseX";
// THE coin — the same component the clock face's own bluff cluster renders in
// each of its three slots (TownSquare's `<Token :role="bluffs[i]">`). An empty
// slot is that coin with no role: blank parchment, which is what the face
// cluster shows for an unset bluff too.
import Token from "./Token";
// FT-859: the drag itself is shared with the build panel's unseated tray —
// one gesture, one definition (see golem/roleDrag).
import { roleIcon as roleIconSrc, startRoleDrag } from "../golem/roleDrag";
// the phone's drag-to-dismiss — the same gesture the right-hand rail's three
// sheets take, so all four dismiss identically
import bottomSheet from "../golem/bottomSheet";
// FT-946: "how many seats hold this role" — shared with the "Select the
// characters" picker (RolesModal) so the two surfaces can never disagree on
// what is already in play.
import { placedCount as sharedPlacedCount } from "../golem/duplicates";

const randomElement = arr => arr[Math.floor(Math.random() * arr.length)];
// the cursor has to rest on a row before its card appears — running the list
// should not strobe cards
const HOVER_DELAY = 170;

export default {
  name: "RoleDrawer",
  components: { RoleHoverCard, Token, CloseX },
  mixins: [bottomSheet],
  data() {
    return {
      // which role the hover card is describing, and the row it is pinned to
      cardRole: null,
      cardAnchor: null,
      // how many bluffs a demon carries — TownSquare's own `bluffSize`, so the
      // two windows onto this data agree on how many slots there are
      bluffSize: 3,
      teams: ["townsfolk", "outsider", "minion", "demon", "traveler"],
      labels: {
        townsfolk: "Townsfolk",
        outsider: "Outsiders",
        minion: "Minions",
        demon: "Demons",
        traveler: "Travellers"
      },
      folded: { traveler: true },
      // the grimoire is waiting behind the character picker it opened — see
      // `tapBluff` / the `modals.role` watcher below
      reopenAfterPicker: false,
      dealGlyph
    };
  },
  watch: {
    /**
     * The picker this section opened has closed — put the grimoire back.
     *
     * `toggleModal` shuts every OTHER modal when it opens one, and the
     * grimoire is a modal flag (`modals.roleDrawer`), so opening the
     * character picker from a slot closes the drawer underneath it. Left
     * alone, choosing a bluff would cost the storyteller the surface they
     * chose it from. This component survives that — the `v-if` is on its own
     * root element, not on the component — so it can simply ask for itself
     * back once the picker is gone.
     */
    "modals.role"(open) {
      if (open || !this.reopenAfterPicker) return;
      this.reopenAfterPicker = false;
      this.toggleModal("roleDrawer");
    },
  },
  computed: {
    ...mapState(["roles", "modals", "otherTravelers", "session"]),
    ...mapState("players", ["players", "bluffs"]),
    /**
     * May this client set a bluff at all — the clock face's own `canSeeBluffs`
     * SPECTATOR gate, restated: `session.isSpectator` catches every non-host
     * client, a seated player included (this app has no separate
     * player/spectator flag). It is the same test the grimoire tab itself
     * carries (App.vue's `.drawer-tab`), so this drawer was never a
     * spectator's surface to begin with.
     *
     * The face cluster's OTHER half — `!grimoire.isPublic` — deliberately
     * does not carry over. `isPublic` starts TRUE and stays true until the
     * host deals a town (HostTools flips it on `rolesAssigned`), so the
     * cluster is dark for the whole BUILD phase — which is precisely when a
     * storyteller picks bluffs, and precisely the gap this section exists to
     * fill. The public-display worry it guards against cannot reach here
     * anyway: this drawer already prints who is playing what next to every
     * row (`seatedNames`), so it is a face-up surface by construction and a
     * host mirroring a face-down grimoire has it shut.
     */
    canSetBluffs() {
      return !this.session.isSpectator;
    },
    /** How many of the three the storyteller has actually chosen. */
    bluffsSet() {
      return this.bluffs.filter((role) => role && role.id).length;
    },
    allowDup: {
      get() {
        return this.$store.state.allowDupRoles;
      },
      set(on) {
        this.$store.commit("setAllowDupRoles", on);
      }
    },
    drawerPick() {
      return this.$store.state.drawerPick;
    },
    grouped() {
      const g = {};
      this.roles.forEach(role => {
        const t = role.team || "townsfolk";
        (g[t] = g[t] || []).push(role);
      });
      return g;
    },
    nonTravelerSeats() {
      return this.players.filter(p => p.role.team !== "traveler");
    },
    comp() {
      const n = Math.max(5, Math.min(15, this.nonTravelerSeats.length));
      return gameJSON[n - 5] || {};
    },
    openSeats() {
      return this.nonTravelerSeats.filter(p => !p.role.id).length;
    },
    seatedCount() {
      return this.players.filter(p => p.role.id).length;
    }
  },
  beforeDestroy() {
    clearTimeout(this.$options.cardTimer);
  },
  methods: {
    ...mapMutations(["toggleModal", "setDrawerPick"]),
    /** Shut the grimoire — what the sheet's × and its pull-down both call.
     *  (The left-edge tab commits the same mutation; this is the drawer's own
     *  handle on it, which golem/bottomSheet requires by contract.) */
    close() {
      this.toggleModal("roleDrawer");
    },
    /** What a screen reader hears — the reading the row's `title` used to
     *  carry, now that the hover card has taken over the pointer path. */
    spokenRole(role) {
      return role.ability ? `${role.name}. ${role.ability}` : role.name;
    },
    /** Rest on a row and the card tells you what the character does. */
    showCard(role, e) {
      if (!window.matchMedia("(hover: hover)").matches) return;
      const el = e.currentTarget;
      clearTimeout(this.$options.cardTimer);
      this.$options.cardTimer = setTimeout(() => {
        this.cardAnchor = el;
        this.cardRole = role;
      }, HOVER_DELAY);
    },
    hideCard() {
      clearTimeout(this.$options.cardTimer);
      this.cardRole = null;
      this.cardAnchor = null;
    },
    fold(team) {
      this.$set(this.folded, team, !this.folded[team]);
    },
    roleIcon(role) {
      return roleIconSrc(role);
    },
    /** Every team now has our own art — golem/glyphs is the one definition,
     *  shared with the town square's counts, the script workbench's meter and
     *  the edition modal's team toggles. teamIcon below stays as the fallback
     *  for a team the map does not know. */
    teamGlyph(team) {
      return teamGlyphSrc(team);
    },
    teamIcon(team) {
      if (team === "townsfolk") return "users";
      if (team === "minion") return "mask";
      if (team === "traveler") return "suitcase";
      return null;
    },
    /** Who is playing this role right now — the drawer reads as a seating
     *  chart once the town is built. */
    seatedNames(role) {
      return this.players
        .filter(p => p.role.id === role.id)
        .map(p => p.name || "Open")
        .join(", ");
    },
    // FT-946: the shared definition (golem/duplicates) — the picker
    // (RolesModal) reads the same function so the two lists can never
    // disagree on what is already seated.
    placedCount(role) {
      return sharedPlacedCount(role, this.players);
    },
    placedInTeam(team) {
      return this.players.filter(p => p.role.team === team).length;
    },
    dragRole(role, e) {
      // drag the ROLE, not the row: the ghost is the icon alone, at the size
      // it lands on the seat (user call 2026-08-18). FT-859 moved the gesture
      // into golem/roleDrag so the build panel's tray drags identically.
      this.hideCard();
      startRoleDrag(role, e);
    },
    clickRole(role) {
      if (!this.allowDup && this.placedCount(role)) return;
      const cur = this.drawerPick;
      this.setDrawerPick(cur && cur.id === role.id ? null : role);
    },
    /** A seat's role dragged INTO the drawer unassigns it — and, since
     *  2026-08-19, a BLUFF dragged into it clears that slot. One idiom:
     *  wherever a character came from, dropping it back on the list is how
     *  you take it away. */
    onDrawerDrop(e) {
      const bluff = e.dataTransfer.getData("golem/bluff");
      if (bluff !== "") {
        this.setBluffRole(Number(bluff), {});
        return;
      }
      const from = e.dataTransfer.getData("golem/from");
      if (from === "") return;
      const player = this.players[Number(from)];
      if (!player) return;
      this.$store.commit("players/update", {
        player,
        property: "role",
        value: {}
      });
    },
    // ── The demon bluffs, from the drawer's floor ─────────────────────────
    /** What is in a slot, or null. */
    bluffRole(index) {
      const role = this.bluffs[index];
      return role && role.id ? role : null;
    },
    /** What a screen reader hears from a slot that carries no text. */
    spokenBluff(index) {
      const role = this.bluffRole(index);
      const n = index + 1;
      if (!role) return `Demon bluff ${n}, empty`;
      return role.ability
        ? `Demon bluff ${n}: ${role.name}. ${role.ability}`
        : `Demon bluff ${n}: ${role.name}`;
    },
    /**
     * THE one write. Everything this section does ends here, and it commits
     * exactly what the clock face's cluster commits.
     *
     * The padding loop is not defensive noise: `players/setBluff` sets its
     * slot with `splice(index, 1, role)`, and splice CLAMPS its start to the
     * array's length — so slot 3 of an empty `bluffs` array lands in slot 1
     * instead, silently. (The face cluster has the same shape; it is simply
     * always entered slot-by-slot from a modal, so the gap rarely opens.)
     * Filling the gap with empty coins first keeps the index honest.
     */
    setBluffRole(index, role) {
      for (let i = this.bluffs.length; i < index; i++) {
        this.$store.commit("players/setBluff", { index: i, role: {} });
      }
      this.$store.commit("players/setBluff", { index, role: role || {} });
    },
    /**
     * The tap path. HTML5 drag-and-drop fires nothing under a finger, so a
     * slot has to accept an armed character the way a SEAT does
     * (Player.onLifeClick): land it, then put the hand down.
     *
     * With nothing armed a slot opens the character picker for itself — the
     * SAME picker the face cluster's coins open, asked for through the square
     * rather than mounted a second time here (see `withSquare`).
     */
    tapBluff(index) {
      if (!this.canSetBluffs) return;
      const pick = this.drawerPick;
      if (pick) {
        this.setBluffRole(index, pick);
        this.setDrawerPick(null);
        return;
      }
      // TownSquare reads a bluff as a NEGATIVE seat: its own coins call
      // openRoleModal(index * -1) for index 1..3, and RoleModal turns that
      // back into a slot with `playerIndex * -1 - 1`.
      this.reopenAfterPicker = true;
      this.withSquare((square) => square.openRoleModal(-1 - index));
      // nothing answered — do not sit waiting for a picker that never opened
      if (!this.modals.role) this.reopenAfterPicker = false;
    },
    /**
     * Ask the town square to open the role picker.
     *
     * The app has exactly ONE RoleModal, mounted by TownSquare and driven by
     * its own `selectedPlayer`; `modals.role` is a single global flag, so a
     * second instance mounted here would open at the same instant and stack
     * two dialogs on one backdrop. Asking the square to do its own job is the
     * same walk RoleTray and RoleActions already use to reach THIS drawer's
     * Deal and Shuffle — found by the square's own element id, since
     * TownSquare declares no component name.
     */
    withSquare(fn) {
      const find = (c) =>
        c.$el &&
        c.$el.id === "townsquare" &&
        typeof c.openRoleModal === "function"
          ? c
          : c.$children.reduce((a, x) => a || find(x), null);
      const square = find(this.$root);
      if (square) fn(square);
    },
    /** Pick a bluff up. It carries the ordinary role payload (so the ghost is
     *  the icon alone, as everywhere else) PLUS the slot it came from, which
     *  is what lets a drop on the list clear it and a drop on another slot
     *  trade with it. */
    dragBluff(index, e) {
      const role = this.bluffRole(index);
      if (!role || !this.canSetBluffs) {
        e.preventDefault();
        return;
      }
      this.hideCard();
      startRoleDrag(role, e);
      e.dataTransfer.setData("golem/bluff", String(index));
    },
    /**
     * A drop on a slot: a character from the list (or the tray) BECOMES this
     * bluff; another slot's bluff TRADES with it, so neither is lost.
     *
     * Anything else — a seated role, carrying `golem/from` — is left to
     * bubble to `onDrawerDrop`, because dropping a seat's character anywhere
     * in this drawer means the one thing it has always meant: unassign it.
     */
    onBluffDrop(index, e) {
      if (!this.canSetBluffs) return;
      const from = e.dataTransfer.getData("golem/bluff");
      if (from !== "") {
        e.stopPropagation();
        const source = Number(from);
        if (source === index) return;
        const mine = this.bluffs[index] || {};
        this.setBluffRole(index, this.bluffs[source] || {});
        this.setBluffRole(source, mine);
        return;
      }
      const roleId = e.dataTransfer.getData("golem/role");
      if (!roleId) return;
      e.stopPropagation();
      // state.roles is a Map keyed by role id — the same lookup the seat's
      // own drop does (Player.onRoleDrop)
      const role = this.roles.get(roleId);
      if (role) this.setBluffRole(index, role);
    },
    /** Fill every roleless non-traveler seat honouring the composition. */
    assignRandomly() {
      // A full town RE-DEALS (user call 2026-08-18): with no open chair left,
      // Deal would otherwise be a no-op. Clear every seat first so the whole
      // script is back in the pool, then deal the composition fresh.
      if (!this.openSeats && this.seatedCount) {
        this.players.forEach(p => {
          if (p.role && p.role.id) {
            this.$store.commit("players/update", {
              player: p,
              property: "role",
              value: {}
            });
          }
        });
      }
      const need = { ...this.comp };
      // subtract what's already seated
      this.players.forEach(p => {
        if (p.role.id && need[p.role.team] > 0) need[p.role.team]--;
      });
      const pool = [];
      Object.keys(need).forEach(team => {
        const options = (this.grouped[team] || []).filter(
          r => this.allowDup || !this.placedCount(r)
        );
        const local = options.slice();
        for (let i = 0; i < need[team]; i++) {
          if (!local.length) break;
          const pick = randomElement(local);
          pool.push(pick);
          if (!this.allowDup) local.splice(local.indexOf(pick), 1);
        }
      });
      // shuffle the pool
      pool.sort(() => Math.random() - 0.5);
      this.players.forEach(p => {
        if (!p.role.id && p.role.team !== "traveler" && pool.length) {
          this.$store.commit("players/update", {
            player: p,
            property: "role",
            value: pool.pop()
          });
        }
      });
    },
    /** Reshuffle the SEATED roles among their own chairs. */
    shuffleSeated() {
      const seats = this.players.filter(p => p.role.id);
      if (seats.length < 2) return;
      const roles = seats.map(p => p.role).sort(() => Math.random() - 0.5);
      seats.forEach((p, i) => {
        this.$store.commit("players/update", {
          player: p,
          property: "role",
          value: roles[i]
        });
      });
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
// The grimoire keeps its OWN chrome on desktop (plum, left edge, its own tab)
// — this import is for the phone's shared bottom-sheet form and grab handle,
// so the left drawer and the right-hand rail's three become the same object
// on a phone rather than two lookalikes.
@import "../drawer.scss";

// the workbench's team palette (its map lives in EditionModal's scope)
$team-colors: (
  "townsfolk": #1f65ff,
  "outsider": #46d5ff,
  "minion": #ff6900,
  "demon": #ce0100,
  "traveler": #cc04ff
);

.role-drawer {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 250px;
  // THE GRIMOIRE SITS ABOVE THE TOWN (user call 2026-08-20: "the grimoire
  // should sit above everything else in order"). It shared the drawer family's
  // z-index of 20 and was therefore UNDER most of the square's own furniture —
  // seats and coins at 25, the script picker at 30, the bluff cluster at 50/51,
  // the top strip at 75 — so things kept landing on top of the storyteller's
  // own book while it was open.
  //
  // 80 clears every one of those and stops short of the two layers that must
  // stay above it: the hotkey panel at 90 and the modal shell at 100. A modal
  // opening BEHIND the grimoire would be the same defect in the other
  // direction, so "everything else" means the town, not the dialogs.
  z-index: 80;
  display: flex;
  flex-direction: column;
  background: rgba(8, 8, 10, 0.96);
  // the drawer IS the grimoire — plum, matching its cover (user call)
  border-right: 1px solid #4b3565;
  box-shadow: 6px 0 30px rgba(0, 0, 0, 0.6);
  padding: 10px 0 8px;

  // the phone sheet's grab handle — display:none anywhere it is a side drawer
  @include sheet-handle;

  // The sheet's dismiss. The grimoire is the one drawer with no × of its own:
  // on desktop the left-edge tab opens and shuts it and that is enough. A
  // full-width sheet has no tab beside it to aim at, and a sheet whose only
  // exit is a gesture is a trap — so on a phone it gets a real one.
  .rd-close {
    display: none;
  }

  // PHONE: the grimoire stops being a column down the left and becomes the
  // bottom half of the screen — the same shape the build panel, the night
  // checklist and the right-hand rail's drawers all take here. The ring keeps
  // the top (TownSquare's `#app.sheet-up` rule is the other half of this
  // stack), which matters more for this drawer than for any other: tap a
  // character, then tap a seat is THE way to cast on a touch screen, and the
  // seats have to be on screen for the second half of it.
  @media #{$phone-sheet} {
    @include bottom-sheet(#4b3565);

    .rd-close {
      display: block;
      position: absolute;
      top: 6px;
      right: 8px;
      z-index: 1;
      box-sizing: content-box;
      width: 20px;
      height: 20px;
      padding: 12px;
      opacity: 0.9;
      cursor: pointer;
    }
    .rd-title {
      font-size: 17px;
    }
    .rd-groups {
      // the sheet has its own edge padding now
      padding: 0 4px;
    }
    // …and the bluffs line up with it, the way they line up with the
    // scroller's padding on the desktop drawer
    .rd-bluffs {
      margin: 8px 4px 0;
    }
  }

  .rd-title {
    margin: 0 12px 2px;
    font-family: PiratesBay, sans-serif;
    font-weight: normal;
    text-align: center;
  }
  // shown only where the drag is unavailable and the tooltip unreachable
  .rd-hint {
    display: none;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 0 10px;
    font-size: 11px;
    opacity: 0.5;
    text-align: center;
    &.armed {
      opacity: 0.9;
      color: #ffbdbd;
    }
  }
  @media (hover: none) {
    .rd-hint {
      display: flex;
    }
    // a finger cannot grab, and the rows are the tap-to-arm target
    .rd-token {
      cursor: pointer;
      // 30px rows in a list of forty characters: comfortable to read, easy to
      // miss. The row keeps its type size and gains the height a thumb needs.
      padding: 7px 4px;
    }
  }
  // the two build actions, in OUR flat idiom — dark plate, hairline, no
  // upstream gradient pill (user call 2026-08-18)
  .rd-acts {
    display: flex;
    gap: 6px;
    margin: 4px 10px 8px;

    .rd-dup {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 5px 8px;
      font-size: 12px;
      color: rgba(216, 205, 180, 0.75);
      background: rgba(20, 16, 22, 0.9);
      border: 1px solid rgba(120, 105, 135, 0.4);
      border-radius: 5px;
      cursor: pointer;
      user-select: none;
      &.on {
        color: #ffd9d9;
        border-color: rgba(190, 90, 90, 0.8);
      }
    }
    .act-glyph {
      width: 15px;
      height: 15px;
      object-fit: contain;
    }
    .rd-act {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 5px 8px;
      font-family: inherit;
      font-size: 12px;
      color: #d8cdb4;
      background: rgba(20, 16, 22, 0.9);
      border: 1px solid rgba(120, 105, 135, 0.4);
      border-radius: 5px;
      cursor: pointer;
      transition: color 150ms, border-color 150ms, background 150ms;

      &:hover:not(:disabled) {
        color: #fff;
        background: rgba(32, 24, 38, 0.95);
        border-color: rgba(150, 130, 175, 0.75);
      }
      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }
  .team-glyph {
    width: 15px;
    height: 15px;
    object-fit: contain;
  }
  .team-glyph-fa {
    width: 14px;
    opacity: 0.9;
  }
  .rd-groups {
    flex: 1;
    overflow-y: auto;
    padding: 0 6px 0 10px;
    section {
      border: 1px solid #3d3d3d;
      border-radius: 4px;
      margin-bottom: 8px;
      @each $team, $color in $team-colors {
        &.team-#{$team} {
          border-color: rgba($color, 0.55);
          h4 {
            color: lighten($color, 22%);
          }
        }
      }
      h4 {
        margin: 0;
        padding: 5px 8px;
        font-size: 13px;
        cursor: pointer;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 6px;
        small {
          opacity: 0.7;
          font-weight: normal;
        }
        .caret {
          margin-left: auto;
          font-size: 0.7em;
          opacity: 0.6;
          transform: rotate(-90deg);
          transition: transform 160ms ease;
          &.open {
            transform: rotate(0);
          }
        }
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 2px 4px 6px;
      }
    }
    .rd-token {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 2px 4px;
      border-radius: 5px;
      cursor: grab;
      font-size: 13px;
      .icon {
        width: 26px;
        height: 26px;
        flex: none;
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
      }
      .nm {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex-shrink: 0;
      }
      // who is sitting in it — the drawer doubles as a seating chart
      .who {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 11px;
        opacity: 0.72;
      }
      .cnt {
        margin-left: auto;
        font-size: 11px;
        opacity: 0.7;
      }
      &:hover {
        background: rgba(255, 255, 255, 0.07);
      }
      &.placed {
        opacity: 0.32;
        cursor: default;
      }
      &.picked {
        outline: 1px solid #a01414;
        background: rgba(160, 20, 20, 0.16);
      }
    }
  }

  // ── THE DEMON BLUFFS, on the drawer's floor ──────────────────────────
  // Nothing new is invented here. It is one of `.rd-groups`'s own team
  // sections — the same hairline box, the same 4px corner, the same h4 at
  // 13px with its glyph and its `small` count — lifted out of the scroller
  // and stood on the floor, wearing the demon's colour because that is
  // whose characters these are. Its margins are `.rd-groups`'s own padding
  // (`0 6px 0 10px`) so the box lines up with the sections above it, and
  // the 8px gap is those sections' own `margin-bottom`.
  //
  // `flex: none` is the whole of "pinned": `.rd-groups` is `flex: 1` with
  // its own scroll, so a fixed-size sibling after it takes the floor and
  // the list gives up the height.
  .rd-bluffs {
    flex: none;
    margin: 8px 6px 0 10px;
    border: 1px solid rgba($demon, 0.55);
    border-radius: 4px;

    h4 {
      margin: 0;
      padding: 5px 8px;
      font-size: 13px;
      color: lighten($demon, 22%);
      display: flex;
      align-items: center;
      gap: 6px;
      small {
        margin-left: auto;
        opacity: 0.7;
        font-weight: normal;
      }
    }

    ul {
      display: flex;
      // the drawer's own action-row gap
      gap: 6px;
      list-style: none;
      // capped at the drawer's OWN desktop width (250px, above): on a phone
      // the sheet is full-bleed and three coins across 375px would eat a
      // third of the sheet's height, so the row keeps the size it has on
      // the desktop drawer instead of growing with the screen
      max-width: 250px;
      margin: 0 auto;
      padding: 2px 4px 6px;
    }

    // A slot is THE coin (Token), sized by the row: three equal columns, and
    // the coin squares itself off its own width — the same way the clock
    // face's cluster leaves the li to say how big a bluff is.
    .rd-bluff {
      flex: 1 1 0;
      min-width: 0;
      border-radius: 5px;
      cursor: pointer;
      &.filled {
        cursor: grab;
      }
      &:hover {
        background: rgba(255, 255, 255, 0.07);
      }
      // a character is in hand — every slot is somewhere it can land, in the
      // drawer's own picked colours
      &.armed {
        outline: 1px solid #a01414;
        background: rgba(160, 20, 20, 0.16);
      }
    }
  }
}

.rd-slide-enter-active,
.rd-slide-leave-active {
  transition: transform 220ms ease;
}
.rd-slide-enter,
.rd-slide-leave-to {
  transform: translateX(-100%);
}

// on a phone it rises from the bottom, because that is the edge it stands on
@media #{$phone-sheet} {
  .rd-slide-enter,
  .rd-slide-leave-to {
    transform: translateY(100%);
  }
}
</style>
