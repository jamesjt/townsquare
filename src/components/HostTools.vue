<template>
  <!-- Golem fork: the HOST TOOLS panel — the storyteller's setup surface,
       centre-stage while the game is being built (hosting, seats exist, roles
       not yet dealt). The controls DRIVE the existing machinery (players/add,
       the edition + roles modals, distributeRoles) — this panel is doors, not
       a second implementation. -->
  <div class="host-tools">
    <!-- By this point the host has always already named the town, one menu
         back — restating "Build the town" here said nothing "Ravenswood" one
         line below didn't already say, so the name IS the heading now, and
         the old Town row folds away. Its rename affordance moved onto the
         heading first and then came off entirely — see the note on the h3.

         `.ht-head` wraps h3 rather than leaving it bare so the games-played
         line and the rename note can sit under the name without becoming a
         FOURTH flex child of `.host-tools` on the disc — the geometry below
         is measured for exactly three (cap / band / cap; see faceDisc.scss),
         and a fourth would push the band off its centre. -->
    <div class="ht-head">
      <!-- NOT RENAMEABLE FROM HERE (user call, 2026-08-19). The town is named
           in the host menu one screen earlier, and offering a second place to
           change it here made the heading look like a control rather than a
           title. The rename flow itself (startRename / commitRename / the
           input below) is left in place, unwired, for whichever surface should
           own renaming. -->
      <h3 v-if="!renaming" :title="headTitle">
        {{ townName }}
        <!-- FT-959 (user call): copy the town's own link, right beside its
             name. The session pill (App.vue's copyPillLink) already does
             this EXACT job — same URL, same copied-tick feedback — so this
             calls the same `copySessionUrl` on Menu.vue through the same
             $parent.$refs.menu route `start()`/`pickScript()` already use
             below, rather than a second copy routine. Only the copied-flash
             TIMER is a local echo of App.vue's own (each button owns its own
             tick, same as the pill owns its). -->
        <button
          type="button"
          class="ht-copy-link"
          @click="copyTownLink"
          :title="linkCopied ? 'Copied!' : 'Copy the town link'"
        >
          <font-awesome-icon :icon="linkCopied ? 'check' : 'link'" />
        </button>
      </h3>
      <input
        v-else
        ref="rename"
        v-model="renameDraft"
        class="ht-rename-input"
        spellcheck="false"
        maxlength="200"
        @keyup.enter="commitRename"
        @keyup.esc="renaming = false"
        @blur="commitRename"
      />
      <!-- how many games this town will have seen once this one ends — the
           server's finished-game count plus the one being built right now.
           Blank (not zero) while the count is unknown: a wrong number reads
           worse than no number. -->
      <small v-if="!renaming && gamesLine" class="ht-games" :title="gamesHint">{{
        gamesLine
      }}</small>
      <small v-if="!renaming && renameNote" class="ht-rename-note">{{
        renameNote
      }}</small>
    </div>

    <!-- FT-888: THE BAND. On the desktop disc this wrapper is the ring's
         middle third — the slice between the two caps, where the rows live,
         with the title in the cap above and Start in the cap below (exactly
         the arrangement the checklist and the entry panels already use).

         EVERYWHERE ELSE IT GENERATES NO BOX AT ALL. `display: contents` means
         the rectangle and both phone sheets lay out their children in this
         wrapper's place, byte-for-byte as they did before it existed — the
         same trick the checklist's own `.ns-work` wrapper uses, for the same
         reason. A wrapper that only one layout can see costs the other three
         nothing. -->
    <div class="ht-body">
    <!-- the row carries the claimed count as a `title` as well as on the line,
         because the disc folds the visible copy away for room (see the styles)
         and the number must stay reachable there -->
    <div class="row" :title="seatsHint">
      <!-- FT-959 (user call): "make it more clear that the chain is tied to
           the 7". `.ht-seat-lead` groups the mark, the scrub and its implied
           counts on the row's LEFT; `.ht-seat-trail` groups the claimed count
           and the shuffle on the RIGHT. Two clusters instead of five loose
           items means the row's own `space-between` now spends its slack in
           ONE gap, between the clusters, instead of splitting it five ways —
           which is the "excess space" the row used to read as (see the style
           block below for the measured before/after).

           THE PLATE (`.ht-seat-readout`) is what ties the number to its
           counts specifically, inside the lead cluster — not the mark, which
           stays a separate small icon the way every other row's mark does.
           A shared `control-plate` is this app's OWN vocabulary for "these
           read as one object" (see controls.scss's own reasoning on
           `.nm-seg`: "three plated buttons... read as three buttons" without
           one shared plate around them) — so wrapping the scrub and the
           composition readout in the panel's one shared plate is reusing the
           app's existing idiom, not inventing a new one. A connective glyph
           or bracket was the other option on the table; the plate was picked
           because it is already how every other "this is one control" claim
           on this panel is made. -->
      <span class="ht-seat-lead">
        <span class="label">
          <img class="row-mark" :src="uiSeat" alt="Seats" title="Seats" />
        </span>
        <span class="ht-seat-readout">
          <!-- the number is a SCRUBBER: drag it sideways to set the count
               (user call — the +/- pair retired). FT-874: extracted into
               NumberScrub so the night sheet's own number fields run the SAME
               gesture code — see that component for the full history. -->
          <span class="stepper">
            <NumberScrub
              class="seat-scrub-ctl"
              :value="players.length"
              :min="0"
              :max="20"
              @input="setSeatCount"
            />
          </span>
          <!-- FT-888 (user call): WHAT THIS MANY SEATS MAKES — the composition
               the seat count implies, right of the number that decides it.
               Drag the scrub and the four counts move with it, which is the
               whole reason it belongs on this row and not on another one.

               It is the SAME OBJECT the town readout above the clock face
               already renders (TownInfo's second line): the same
               `gameJSON[nonTravelers-5]` table, the same golem/glyphs team
               art, the same "tint the digit in the team's own colour" idiom.
               Not a second implementation of a readout this app already has.

               THESE ARE IMPLIED COUNTS, NOT ASSIGNED ONES, and the
               distinction is deliberate: this row is where the seat count is
               set, so the useful answer here is "and that means 5/0/1/1".
               What has actually been dealt is the Roles row's job, one line
               down. Two rows disagreeing about what "2 outsiders" means would
               be worse than not showing it. THE SHARED PLATE does not blur
               this: it ties the counts to the NUMBER that implies them, on
               THIS row only, and says nothing about assignment — the Roles
               row's own value keeps its own separate look below.

               Below five non-travellers there is no official composition to
               state, so nothing is stated — same gate TownInfo uses. -->
          <span class="ht-comp" v-if="composition" :title="compHint">
            <span
              v-for="t in COMP_TEAMS"
              :key="t"
              class="stat"
              :class="t"
              :title="TEAM_LABELS[t] + ': ' + composition[t]"
            >
              {{ composition[t] }}
              <img class="team-glyph" :src="teamGlyph(t)" alt="" />
            </span>
          </span>
        </span>
      </span>
      <span class="ht-seat-trail">
        <!-- (the shift-click-to-fill shortcut left this line 2026-08-18 —
             shift-clicking START does the filling now, so there is one dev
             gesture instead of two. devFillSeats itself is kept below.) -->
        <small class="claimed">{{ claimedCount }} claimed</small>
        <!-- FT-847 follow-up: relocated from the retired Players toolbar tab.
             ALWAYS rendered — appearing icons shove the row (user call);
             unusable states grey out instead. -->
        <!-- (trash retired — scrub the count to 0 instead; user call) -->
        <!-- SHUFFLE SEAT ORDER. A real <button> wearing the panel's shared
             control plate (2026-08-19, user call: "and this shuffle
             button?"). It was a bare <svg> with no box at all — the only
             control on the panel with nothing under it — which is why it
             read as loose furniture beside the plated buttons one row down.
             Same 34x30 plate as RoleActions' three now, from the one
             `control-icon-btn` mixin.

             `:disabled` rather than a `.disabled` class: the plate's own
             disabled state comes with the mixin, the button stops taking
             clicks by itself, and it drops out of the tab order — which the
             old opacity-plus-pointer-events pair never did. -->
        <span class="tools">
          <button
            class="tool-btn"
            type="button"
            :disabled="players.length <= 2"
            @click="randomizeSeatings"
            title="Shuffle seat order"
          >
            <font-awesome-icon icon="random" />
          </button>
        </span>
      </span>
    </div>

    <!-- the SHARED script picker (user call): pick right here, with the
         script's OWN art on the trigger; the Almanac card opens the forge -->
    <div class="row">
      <span class="label">
        <!-- ui-script.png is the SAME file the top strip's own script door
             wears (Menu.vue) — not a new asset. It bakes flat neutral grey
             (mean rgb ~101,101,101) where seat/role/nightcheck bake warm
             (~154,146,133), the recipe every other row mark in the app
             converges on independently. ui-script.png is used elsewhere
             (Menu.vue) so it is not re-baked; `.ht-script-mark`'s filter
             warms THIS instance only, tuned against the live render to land
             within ~2 units of the warm family's own mean RGB — see the
             sampling rig, claude_temp_test/2026-08-19-ft936-sample/. -->
        <img
          class="row-mark ht-script-mark"
          :src="uiScript"
          alt="Script"
          title="Script"
        />
      </span>
      <ScriptPicker
        class="ht-script-picker"
        :cards="scriptCards"
        :picked-id="pickedScriptId"
        @pick="pickScript"
      />
    </div>

    <!-- FT-854: the role DRAWER replaced the overlay -->
    <!-- FT-959 (user call): "the '0/7 assigned' value should sit with its
         mark rather than adrift." Same fix as the Seats row above: the mark
         and the value become ONE cluster (`.ht-role-lead`), so the row's
         `space-between` has exactly two things to split — this cluster and
         RoleActions' own `.role-acts` group — instead of stranding the value
         in the middle of the row's full slack. RoleActions is HELD (its
         internal Deal/Shuffle/Duplicates/Retract grouping is untouched); it
         already reads as one family via its own shared plate and 6px gap —
         what it lacked was room of its own to read as a group IN, which
         merging the leading pair now gives it. -->
    <div class="row">
      <span class="ht-role-lead">
        <span class="label">
          <img class="row-mark" :src="uiRole" alt="Roles" title="Roles" />
        </span>
        <span class="value" @click="toggleModal('roleDrawer')">
          {{ rolesAssigned }} / {{ players.length }} assigned
        </span>
      </span>
      <!-- Deal / Shuffle / Dupes sit INLINE with the count on every width
           (user call 2026-08-18) — the tray below carries only characters -->
      <RoleActions />
    </div>

    <!-- FT-860: the night sheet's three-state switch. Its own component so
         the setting travels with the rest of the night code. -->
    <NightModeRow />

    <!-- FT-859: the UNSEATED TRAY — the script's characters that have no
         chair yet, dragged straight onto a seat from here. Dropping a seated
         role anywhere that is not a seat sends it back to this tray. -->
    <RoleTray />
    </div>

    <!-- Start and the line explaining why it is greyed out are ONE footer.
         On a phone the panel is a scrolling sheet, and they were the last
         things in it — the button the panel exists to reach sat below the
         fold. Grouped, the pair can ride the sheet's bottom edge (see the
         portrait rule in the styles); on a desktop the wrapper is inert. -->
    <div class="start-dock">
      <div
        class="start"
        :class="{ ready: canStart }"
        @click="start"
        :title="startHint"
      >
        Start game
      </div>
      <small class="hint">{{ startHint }}</small>
    </div>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import { listTowns, editKeyFor, updateTown } from "../golem/towns";
// the heading's games-played line — the same per-town aggregate StatsOverlay
// reads, not a new count.
import { townStats } from "../golem/stats";
import ScriptPicker from "./ScriptPicker";
// FT-859: the unseated-role tray that lives under the Roles row.
import RoleTray from "./RoleTray";
// FT-859: the three build actions, inline in the Roles row.
import RoleActions from "./RoleActions";
// FT-860: the night sheet's Off / Storyteller / Everyone row.
import NightModeRow from "./NightModeRow";
// FT-874: the shared drag-scrub / click-to-type number control.
import NumberScrub from "./NumberScrub";
import editionJSON from "../editions";
import { EDITION_ICONS, edCustom, OFFICIAL_BLURBS } from "../golem/editionArt";
import { getRecents } from "../golem/scripts";
import grimoireClosed from "../assets/grimoire-cover.png";
// FT-936: the row labels wear marks instead of words (user call: "lets use
// icon for those, the chair icon for seats, Script icon for script... a
// player coin is good for the roles"). uiScript is the SAME file Menu.vue's
// top strip already wears for the script door — not a new asset; see the
// template note on `.ht-script-mark` for why this one instance carries an
// extra filter.
import uiSeat from "../assets/ui-seat.png";
import uiRole from "../assets/ui-role.png";
import uiScript from "../assets/ui-script.png";
// DEV shift-Start (2026-08-19): the same transient hint EditionModal, Menu and
// EndGameOverlay use to say something when a click can't do what it looks
// like it should — used below so a shift-click that genuinely can't proceed
// says why instead of just doing nothing.
import { flashHint } from "../golem/hint";
// FT-888: the composition readout on the Seats row. Both of these are the
// sources TownInfo's own composition line reads — the official setup table and
// the fork's team art — so the two readouts stay one object in two places.
import gameJSON from "../game";
import { teamGlyph } from "../golem/glyphs";
import { TEAM_LABELS } from "../golem/composition";

// The four teams the setup table names, in the order every other surface in
// this app states them (the reading order of a composition, best to worst).
// Travellers are outside the table entirely — they sit beyond the base count
// and outside distribution maths — so they are not here.
const COMP_TEAMS = ["townsfolk", "outsider", "minion", "demon"];

export default {
  components: { ScriptPicker, RoleTray, RoleActions, NightModeRow, NumberScrub },
  mounted() {
    // a fresh town opens at SEVEN chairs — the smallest non-Teensyville
    // game (5-6 is Teensyville; user call 2026-08-18)
    if (this.players.length === 0) this.setSeatCount(7);
  },
  watch: {
    // the HOST sees assignments as they land — while building, the first
    // assigned role flips the grimoire face-up (G still toggles freely)
    rolesAssigned(n) {
      if (n > 0 && this.grimoire.isPublic)
        this.$store.commit("toggleGrimoire");
    }
  },
  data() {
    return {
      // FT-888: the composition readout's static furniture
      COMP_TEAMS,
      TEAM_LABELS,
      // the picker's vault selection (officials read from the store)
      vaultPickedId: null,
      grimoireClosed,
      // FT-936: the row-mark art
      uiSeat,
      uiRole,
      uiScript,
      // FT-847: owned-town rename state.
      renaming: false,
      renameDraft: "",
      townName: "",
      renameNote: "",
      // FT-959: the heading's own copy-link tick, local to this button —
      // the pill (App.vue's pillCopied) owns its own the same way.
      linkCopied: false,
      // games this town will have seen once the one being built ends
      // (finished games + this one). null while unknown — no server count
      // yet, or the fetch failed — and the template's gate is on that null,
      // not on 0: a wrong number reads worse than no number.
      gamesCount: null
    };
  },
  created() {
    this.loadTownName();
    this.loadGamesCount();
  },
  computed: {
    ...mapState(["edition", "session", "grimoire"]),
    ...mapState("players", ["players"]),
    /** FT-847: the edit key when this hosted town is OURS (else falsy). */
    ownedKey() {
      return (
        !this.session.isSpectator &&
        this.session.sessionId &&
        editKeyFor(this.session.sessionId)
      );
    },
    claimedCount() {
      return this.players.filter(p => p.id).length;
    },
    /** The heading's second line: finished games in this town plus the one
     *  being built now. "" (not "0 games") while gamesCount is unknown, which
     *  is the template's actual render gate. */
    gamesLine() {
      if (this.gamesCount === null) return "";
      return this.gamesCount === 1
        ? "Game 1 in this town"
        : `Game ${this.gamesCount} in this town`;
    },
    /** Spells out the count on hover, the same way seatsHint/compHint do for
     *  their own derived numbers. "" while gamesCount is unknown. */
    gamesHint() {
      if (this.gamesCount === null) return "";
      const finished = this.gamesCount - 1;
      return finished === 0
        ? "The first game in this town."
        : finished + (finished === 1 ? " game finished here before this one." : " games finished here before this one.");
    },
    /** The heading's own tooltip: rename affordance plus — because the disc
     *  cap has no room for the games line as text (see the styles) — the
     *  same explanation `.ht-games` carries when there IS room for it. */
    headTitle() {
      const parts = [];
      if (this.ownedKey) parts.push("Rename your town");
      if (this.gamesHint) parts.push(this.gamesHint);
      return parts.length ? parts.join("\n") : null;
    },
    /** Travellers sit beyond the base count and outside distribution math. */
    coreSeats() {
      return this.players.filter(
        p => !p.role || p.role.team !== "traveler"
      );
    },
    rolesAssigned() {
      return this.players.filter(p => p.role && p.role.team).length;
    },
    /**
     * FT-888: what THIS MANY SEATS makes — the official setup table, read the
     * same way TownInfo's own composition line reads it, off the same file.
     *
     * Travellers are excluded from the lookup (the `nonTravelers` getter caps
     * at 15 for us), because they sit outside the composition. Under five
     * non-travellers the table has no row and this is null, which is the
     * template's gate: there is no official answer to state, so none is stated.
     */
    composition() {
      const n = this.$store.getters["players/nonTravelers"];
      return n >= 5 ? gameJSON[n - 5] : null;
    },
    /** The whole Seats row on hover — the claimed count included, because the
     *  disc folds the visible copy of it away for room (see the styles). */
    seatsHint() {
      return (
        this.claimedCount +
        " of " +
        this.players.length +
        (this.players.length === 1 ? " seat" : " seats") +
        " claimed. Drag the number to change how many there are."
      );
    },
    /** The readout says what it IS on hover, because "5 2 3 1" beside a seat
     *  count could equally be read as what has been dealt — which is the row
     *  below's business, and the one thing this must not be mistaken for. */
    compHint() {
      return (
        "What " +
        this.$store.getters["players/nonTravelers"] +
        " seats makes — the script's composition at this size. " +
        "Roles actually assigned are on the Roles row."
      );
    },
    canRemoveSeat() {
      // The spinner never evicts: only an EMPTY seat can go.
      return this.players.some(p => !p.id);
    },
    /** The shared picker's cards: officials, the vault shelf, the Almanac. */
    scriptCards() {
      const cards = editionJSON
        .filter(e => e.isOfficial)
        .map(e => ({
          id: e.id,
          name: e.name,
          icon: EDITION_ICONS[e.id] || edCustom,
          blurb: OFFICIAL_BLURBS[e.id] || "",
          source: "OFFICIAL"
        }));
      getRecents().forEach(s => {
        cards.push({
          id: s.id,
          name: s.name || s.id,
          icon: edCustom,
          blurb: "",
          source: "Scripts"
        });
      });
      cards.push({
        id: "__almanac",
        name: "Scripts…",
        icon: edCustom,
        blurb: "Open the workbench — edit or forge a script",
        source: ""
      });
      return cards;
    },
    pickedScriptId() {
      if (this.vaultPickedId) return this.vaultPickedId;
      return this.edition.isOfficial ? this.edition.id : null;
    },
    canStart() {
      return (
        this.coreSeats.length > 0 &&
        this.coreSeats.every(p => p.id) &&
        this.rolesAssigned >= this.players.length
      );
    },
    startHint() {
      if (!this.players.length) return "Add seats to begin.";
      if (!this.coreSeats.every(p => p.id)) {
        const open = this.coreSeats.filter(p => !p.id).length;
        return `Waiting on ${open} ${open === 1 ? "seat" : "seats"} to be claimed…`;
      }
      if (this.rolesAssigned < this.players.length)
        return "Assign roles (the shuffle) before starting.";
      return "Everyone seated and cast — deal the characters.";
    }
  },
  methods: {
    ...mapMutations(["toggleModal"]),
    // FT-888: golem/glyphs' team art, the same call TownInfo makes.
    teamGlyph,
    // ── FT-847: owned-town rename ────────────────────────────────────────
    loadTownName() {
      const id = this.session.sessionId;
      const entry = id && listTowns().find(t => t.id === id);
      this.townName = (entry && entry.name) || id || "";
    },
    /** Best-effort, like every golem call here: an unreachable server just
     *  leaves gamesCount null and the heading's second line stays blank. */
    async loadGamesCount() {
      const id = this.session.sessionId;
      if (!id) return;
      try {
        const stats = await townStats(id);
        this.gamesCount = (stats.games || 0) + 1;
      } catch (e) {
        // no line beats a wrong line
      }
    },
    /** FT-959: copy the town link, next to its name — the pill's own
     *  copyPillLink (App.vue), reached the same way `start()`/`pickScript()`
     *  already reach Menu.vue below. Not a second copy routine: the URL is
     *  built once, in Menu's own `copySessionUrl`. */
    copyTownLink() {
      this.$parent.$refs.menu.copySessionUrl();
      this.linkCopied = true;
      setTimeout(() => {
        this.linkCopied = false;
      }, 1500);
    },
    startRename() {
      if (!this.ownedKey) return;
      this.renameDraft = this.townName;
      this.renaming = true;
      this.renameNote = "";
      this.$nextTick(() => {
        if (this.$refs.rename) this.$refs.rename.focus();
      });
    },
    async commitRename() {
      if (!this.renaming) return; // esc already cancelled; blur follows
      this.renaming = false;
      const name = this.renameDraft.trim();
      if (!name || name === this.townName) return;
      try {
        const town = await updateTown(this.session.sessionId, { name });
        this.townName = town.name;
        this.renameNote = "renamed";
      } catch (e) {
        this.renameNote = "rename failed — server unreachable?";
      }
      setTimeout(() => {
        this.renameNote = "";
      }, 3000);
    },
    addSeat() {
      if (this.players.length >= 20) return;
      this.$store.commit("players/add", `Seat ${this.players.length + 1}`);
    },
    /** Walk the roster to a target count. Shrinking only takes EMPTY
     *  chairs (claimed seats never leave this way). */
    setSeatCount(n) {
      const want = Math.max(0, Math.min(20, Math.round(n) || 0));
      let guard = 25;
      while (this.players.length < want && guard--) this.addSeat();
      while (this.players.length > want && this.canRemoveSeat && guard--)
        this.removeSeat();
    },
    removeSeat() {
      // remove the LAST empty seat; claimed chairs are a targeted act only
      for (let i = this.players.length - 1; i >= 0; i--) {
        if (!this.players[i].id) {
          this.$store.commit("players/remove", i);
          return;
        }
      }
    },
    /** DEV: shift-click the claimed count — every empty chair gets a fake
     *  player, so a full game can start solo (pair with shift-Start). */
    devFillSeats() {
      this.players.forEach((p, i) => {
        if (!p.id) {
          this.$store.commit("players/update", {
            player: p,
            property: "id",
            value: "dev-" + (i + 1)
          });
          this.$store.commit("players/update", {
            player: p,
            property: "name",
            value: "Fake " + (i + 1)
          });
        }
      });
    },
    /** DEV shift-Start's own route to the dealer — the identical tree-walk
     *  RoleActions' own `withDrawer` uses (found by component name from
     *  `$root`, since the drawer is always mounted whether its sheet is open
     *  or not — see App.vue). Reusing the WALK rather than reimplementing
     *  Deal: the only dealer is `RoleDrawer.assignRandomly`. */
    withDrawer(fn) {
      const find = c =>
        c.$options.name === "RoleDrawer"
          ? c
          : c.$children.reduce((a, x) => a || find(x), null);
      const drawer = find(this.$root);
      if (drawer) fn(drawer);
    },
    /** Apply a pick in place — no modal unless the Almanac card is chosen. */
    pickScript(card) {
      if (card.id === "__almanac") {
        this.toggleModal("edition");
        return;
      }
      const ed = editionJSON.find(e => e.id === card.id);
      if (ed) {
        this.$store.commit("setEdition", ed);
        this.vaultPickedId = null;
        return;
      }
      this.vaultPickedId = card.id;
      const modal = this.$parent.$refs.edition;
      if (modal) modal.loadFromVault(card.id);
    },
    // FT-847 follow-up: relocated from the retired Players toolbar tab.
    // No confirm: shuffling seats during setup is the point of the button,
    // and it is undone by pressing it again. (user call 2026-08-18)
    randomizeSeatings() {
      if (this.players.length <= 2) return;
      this.$store.dispatch("players/randomize");
    },
    clearAllPlayers() {
      if (!this.players.length) return;
      if (confirm("Are you sure you want to remove all players?")) {
        if (this.session.nomination) {
          this.$store.commit("session/nomination");
        }
        this.$store.commit("players/clear");
      }
    },
    start(e) {
      // DEV (user call 2026-08-18, extended 2026-08-19): shift-click START is
      // the ONE dev gesture — from an untouched town it now does the whole
      // run: fill every empty chair (devFillSeats, below), deal the script
      // into them (RoleDrawer's own assignRandomly, reached the same way
      // RoleActions reaches it — see withDrawer above; there is no second
      // dealer), then start. It used to require roles already dealt before
      // it would so much as fill a seat, which is why it looked dead from a
      // fresh town — the shift bypass was only ever waiving the CLAIM gate,
      // never the deal itself.
      //
      // Fill before deal: dealing hands roles to the chairs that exist.
      if (e && e.shiftKey) {
        if (!this.players.length) {
          flashHint("No seats to fill.");
          return;
        }
        this.devFillSeats();
        if (this.rolesAssigned < this.players.length) {
          this.withDrawer(d => d.assignRandomly());
        }
        if (this.rolesAssigned < this.players.length) {
          // The script can't cast every seat — too few characters on a team,
          // or (above 15 non-traveler seats) more chairs than the composition
          // table even has a row for. Say so instead of a Start that looks
          // like it did nothing.
          flashHint("The script can't cast every seat — add characters or remove seats.");
          return;
        }
        this.$parent.$refs.menu.distributeRoles();
        return;
      }
      if (!this.canStart) {
        // The button explains itself instead of doing nothing.
        if (this.rolesAssigned < this.players.length && this.coreSeats.every(p => p.id)) {
          this.toggleModal("roles");
        }
        return;
      }
      this.$parent.$refs.menu.distributeRoles();
    }
  }
};
</script>

<style scoped lang="scss">
// the team colours the composition readout wears
@import "../vars.scss";
// FT-888: the clock face's disc — geometry, gate and material, shared with the
// night checklist and the two entry panels.
@import "../faceDisc.scss";
// 2026-08-19: the panel's ONE control plate — the ground, edge and radius the
// script picker has always worn, now worn by every control on the panel. See
// src/controls.scss for the six near-miss treatments it replaced.
@import "../controls.scss";

.host-tools {
  position: absolute;
  // FT-888: 19, MATCHING THE NIGHT CHECKLIST. These two are the same object in
  // the same slot — the plate in the middle of the clock face — and the
  // checklist has always stood at 19 while this stood at 3. The seats' own
  // list items are 11, so the pair disagreed about the one thing they had to
  // agree on: at 1280x800 the ring is tighter than the panel is wide and the
  // seats' name plates painted straight through "Build the town" (visible in
  // the FT-888 before-shot, so this is not new). Only the plates reach that far
  // in — the coins, which are what a role is dragged onto, sit outside the
  // panel at every size.
  z-index: 19;
  text-align: center;
  padding: 15px 25px;
  // the dial behind it is busy — the panel needs to win (user call)
  background: rgba(0, 0, 0, 0.8);
  border: 3px solid black;
  border-radius: 10px;
  box-shadow: 0 0 10px black;

  // The panel is as tall as its contents and had no relationship to the
  // window, so on a landscape phone it stood 437px tall in a 375px window:
  // the heading was cut off the top and "Start game" off the bottom, with no
  // way to scroll to either (measured 812x375, 2026-08-18). Bounding it to
  // the window and letting the overflow scroll costs nothing on a screen big
  // enough to hold it, where neither cap binds.
  max-height: calc(100vh - 20px);
  // FT-888: AND A CAP OF ITS OWN, because this panel has no width — it is
  // shrink-to-fit around its widest row, and the Seats row just gained the
  // composition readout. Measured at 1280x800: that took the rectangle from
  // 415px to 506px, and the rectangle stands INSIDE the ring, where 90px of
  // extra width is 90px further under the seats. 420px is where it has always
  // sat (the character tray's own 336px plus its padding is what set it), so
  // the cap holds the footprint the ring was arranged around and the Seats row
  // takes a second line instead — see `.row`'s wrap below.
  //
  // The two phone sheets and the disc all set `max-width: none` after this, and
  // must keep doing so: on a phone the panel IS the width of the screen, and a
  // disc is the width of the face.
  max-width: min(calc(100vw - 20px), 420px);
  overflow-y: auto;
  // a phone drags the whole page when an inner list runs out of scroll
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  // FT-888: the band wrapper is INVISIBLE to the layout everywhere except the
  // disc — `display: contents` generates no box at all, so the rectangle and
  // both phone sheets place its children exactly where they were.
  .ht-body {
    display: contents;
  }


  // PORTRAIT PHONE: the panel stops being a plate in the middle of the ring
  // and becomes the bottom half of the screen.
  //
  // Centred, it and the ring want the same 340-odd pixels: the panel is as
  // wide as the ring is across, so on a 375px screen the seats drew straight
  // through the script picker and the character tray. Stacked, both fit — the
  // ring takes the top of the window (see TownSquare's matching rule) and this
  // takes the bottom, with its own scroll for the tray.
  @media (pointer: coarse) and (orientation: portrait) {
    position: fixed;
    left: 6px;
    right: 6px;
    // clear of the session pill, which is pinned to the bottom-right at a far
    // higher z-index — docked flush, the panel put "Start game" underneath it
    bottom: 58px;
    max-width: none;
    max-height: 48vh;
    padding: 10px 14px;
    // it is over the town now, not floating in the middle of it
    background: rgba(0, 0, 0, 0.93);
    // (the tray drops its own inner scroll here so the panel is the only
    //  scroller — that rule lives in RoleTray, which owns those styles)

    // The sheet scrolls, and the one control the whole panel exists to reach
    // was the last thing in it — so on a phone "Start game" sat below the fold
    // of a scroller with nothing to say so. Button and reason ride the bottom
    // edge instead, and the rest of the panel scrolls underneath them. The
    // reason has to come along: it is a `title` everywhere else, and a touch
    // screen cannot raise a tooltip to ask why the button is grey.
    .start-dock {
      position: sticky;
      bottom: -10px;
      z-index: 1;
      // its own ground, and OPAQUE — at the sheet's own 0.93 the character
      // icons scrolling behind it showed straight through the button. This is
      // what 0.93 black composites to over the sheet's art anyway.
      background: #0a0a0c;
      padding-bottom: 4px;
      margin: 0 -14px;
    }
    .start {
      margin-top: 6px;
    }
  }

  // LANDSCAPE PHONE: the same problem turned on its side, and the same answer.
  // Centred, the panel and the ring overlap just as badly as they do in
  // portrait — the seats drew across the script picker and the tray. Here
  // there is width to spare and no height, so the pair sit side by side: the
  // ring keeps the left of the window (TownSquare's matching rule) and the
  // panel takes a column down the right.
  @media (pointer: coarse) and (orientation: landscape) and (max-height: 500px) {
    position: fixed;
    right: 6px;
    // clear of the two pieces of chrome that share this corner and outrank it:
    // the script/vote strip above, the session pill below. Flush, the pill sat
    // on "Start game" and the strip on the heading.
    top: 46px;
    bottom: 50px;
    left: auto;
    width: 42vw;
    // the tray needs eight 34px characters to a row before it wraps
    min-width: 330px;
    max-width: none;
    max-height: none;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.93);

    .start-dock {
      position: sticky;
      // flush, not overhanging — the reason line under the button is the last
      // thing in the panel and a negative offset clipped it
      bottom: 0;
      z-index: 1;
      background: #0a0a0c;
      margin: 0 -12px;
    }
    .ht-head {
      margin-bottom: 4px;
    }
  }

  // A DRAWER IS OUT: the panel stands down (2026-08-18, both orientations).
  //
  // On a phone every drawer is a bottom sheet at 52vh and this panel is a
  // bottom sheet at 48vh — the same edge, the same half of the screen, and
  // both up at once is the whole window with no ring left. Turned on its side
  // they want the same right-hand column instead, which is the same argument.
  //
  // The DRAWER wins because the user just reached for it, and the panel comes
  // straight back when it closes: `sheet-up` is a class on #app, so this is a
  // repaint, not a state change. Nothing about the town being built is lost —
  // and the grimoire sheet does this panel's own job while it is up, so on a
  // phone the two are alternatives rather than a pair.
  @media (pointer: coarse) and (orientation: portrait) {
    #app.sheet-up & {
      display: none;
    }
  }
  @media (pointer: coarse) and (orientation: landscape) and (max-height: 500px) {
    #app.sheet-up & {
      display: none;
    }
  }

  // the heading wrapper — see the template comment for why it exists at all.
  .ht-head {
    margin-bottom: 8px;
  }

  h3 {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: default;

    // only an OWNED town can be renamed — the pencil and the pointer both
    // say so, same affordance the old Town row's `.value` wore.
    &.owned {
      cursor: pointer;
      &:hover {
        color: red;
      }
    }
  }

  // FT-959: COPY THE TOWN LINK, next to its name. Styled BARE — no
  // `control-icon-btn` plate — because the pill (App.vue) already does this
  // exact job as a plain icon with `cursor: pointer` and a red hover, no box
  // of its own (see `.copylink` there), and this is the same control in a
  // second place: matching its look is what makes the two read as "the same
  // button" rather than as two different affordances that happen to copy the
  // same thing. A plate here would also fight the heading — a heavy 34x30 box
  // beside a serif town name reads as chrome bolted onto a title, not as
  // part of it.
  .ht-copy-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 0;
    padding: 0;
    margin: 0;
    color: inherit;
    font-size: 55%;
    opacity: 0.65;
    cursor: pointer;
    transition: color 150ms, opacity 150ms;

    &:hover {
      color: red;
      opacity: 1;
    }
    &:focus-visible {
      @include control-focus-ring;
    }

    // a fingertip needs more than a bare 12px glyph — an invisible pad
    // centred on it, the same trick NumberScrub's own "seat" preset uses for
    // its drag handle on a phone, rather than growing the visible glyph.
    @media (pointer: coarse) {
      position: relative;
      &::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
      }
    }
  }

  // the games-played line and the transient rename note — both plain small
  // text under the name, matching `.row small`'s own opacity.
  .ht-games,
  .ht-rename-note {
    display: block;
    margin-top: 2px;
    opacity: 0.6;
    font-size: 80%;
  }

  // the rename box itself: `.row input`'s styling, centred instead of
  // flex-grown since it now stands alone rather than beside a label. It was
  // already the shared plate to the pixel — one of the two places that proved
  // the plate was the panel's house style rather than a new look — so it reads
  // the mixin now and nothing about it moves.
  .ht-rename-input {
    @include control-plate;
    width: 100%;
    max-width: 260px;
    text-align: center;
    color: white;
    padding: 4px 8px;
    font-size: 90%;
    outline: none;

    &:focus {
      @include control-plate-hover;
    }
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    // FT-888: a safety valve, not a layout. Every row still sits on one line
    // wherever it fits; the Seats row, now carrying the composition, takes a
    // second one at the widths where it does not — which beats the alternative
    // of running its last control out past the panel's edge.
    flex-wrap: wrap;
    gap: 14px;
    min-height: 34px;

    // FT-959: THE TWO CLUSTERS (Seats and Roles rows both use this shape —
    // see the template comments by each). `.row` keeps `space-between` from
    // above, but now splits it between exactly two flex children instead of
    // five/three, so all the freed width from the FT-936 mark shrink lands as
    // ONE gap between the clusters instead of being spread thin across every
    // pair of items. Measured, 7 seats (rig: `claude_temp_test/
    // 2026-08-20-ft959-measure.mjs`, before/after JSON alongside it):
    //
    //   scrub → composition gap (Seats)   50.8 / 35.7 / 61.6px -> 10px flat
    //   mark → value gap (Roles)          28.4 / 48.1 / 86.9px ->  8px flat
    //     (1280x800 rect / 1642x780 disc floor / 1920x1080 disc, in order)
    //
    // Both clusters stay flush to the row's own edges (space-between's own
    // job, unchanged) — what moved is how the MIDDLE reads: two tight objects
    // and a deliberate gap between them (now the row's ONE remaining slack,
    // e.g. Roles' mark+value-to-actions gap grew to 42.7 / 82.2 / 159.7px),
    // not five items adrift at whatever spacing the row's leftover width
    // happened to produce.
    .ht-seat-lead,
    .ht-role-lead {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .ht-seat-trail {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    // THE SHARED PLATE — see the template comment on `.ht-seat-readout` for
    // why a plate (this app's own "these read as one control" vocabulary,
    // `controls.scss`) rather than a connective glyph. Padding is a shade
    // tighter than the picker/rename-input's own 4px/8px: this plate holds a
    // single bold digit and a row of small stats, not a full-width control.
    .ht-seat-readout {
      @include control-plate;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 3px 10px;
    }
    // Roles' own value keeps its EXISTING look (no plate) — see the template
    // note on why the two rows differ here: the Seats plate ties a number to
    // a DERIVED readout; "0 / 7 assigned" is one fact, not two, and already
    // reads fine as plain text beside its mark, unchanged.

    // FT-936: A MARK, NOT A WORD (user call: icons instead of text labels).
    // 55px was sized for the word "Seats"/"Script"/"Roles"; a 22px mark needs
    // far less, and the freed width is pure slack for the row (never a cost —
    // every wrap threshold documented elsewhere in this file assumed the wider
    // box). Left-aligned, same edge the text always sat on.
    .label {
      opacity: 0.7;
      width: 30px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    // THE MARK ITSELF. Sized and drop-shadowed like `.team-glyph` two rows
    // down — the one image already living inline in a row in this file — so
    // the new marks read as kin to it rather than inventing a second recipe.
    .row-mark {
      width: 22px;
      height: 22px;
      object-fit: contain;
      display: block;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
    }
    // THE SCRIPT MARK IS THE ONE ASSET THAT DOES NOT BAKE WARM (see the
    // template note by its <img>). ui-script.png is shared with Menu.vue's
    // top strip, so it is not re-baked; this filter warms ONLY this instance,
    // tuned against the live render (sepia/saturate/hue-rotate/contrast) to
    // land its mean opaque RGB within ~2 units of the warm family's own
    // (154, 146, 133) — close enough that the row reads as one set rather
    // than three warm marks and one cool outlier.
    .ht-script-mark {
      filter: sepia(0.5) saturate(2.5) hue-rotate(-5deg) brightness(1.9)
        contrast(0.3) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
    }
    .stepper {
      display: flex;
      align-items: center;
      gap: 10px;
      // FT-874: the scrub/type-in box itself (the "one footprint" rule) now
      // lives in NumberScrub.vue's own scoped style, under its "seat" preset
      // — this row just sizes and positions the component like any other
      // flex child (`.seat-scrub-ctl` below).
      .seat-scrub-ctl {
        vertical-align: middle;
      }
      .row-book {
        width: 20px;
        height: 20px;
        vertical-align: middle;
      }
      svg {
        cursor: pointer;
        &:hover {
          color: red;
        }
        &.disabled {
          opacity: 0.3;
          pointer-events: none;
        }
      }
    }
    // FT-888: WHAT THIS MANY SEATS MAKES. The same treatment TownInfo's own
    // composition line wears — team-coloured digit, the fork's team glyph, a
    // glow in the team's colour behind it — because it is the same readout in
    // a second place, not a new one.
    //
    // ONE THING IS DIFFERENT AND IT IS THE SPACING. TownInfo's stats stand on
    // the open clock face and can afford a 10px lane after every glyph; this
    // one shares a 34px row with a label, a scrub, a claimed count and a
    // shuffle, and on the disc that row is only ~345px wide. So the pairs sit
    // tight (4px inside a pair, 7px between pairs) and the glyph carries no
    // trailing margin. The TYPE is untouched — the counts read at the row's own
    // size; shrinking digits to buy room is how a readout becomes decoration.
    .ht-comp {
      display: flex;
      align-items: center;
      gap: 7px;
      flex-shrink: 0;
      // it is a consequence of the number to its left, not a control — a shade
      // back from the row's own weight, the way `small` already is here
      font-size: 92%;
      cursor: help;

      .stat {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .team-glyph {
        // sized to the type it rides beside, so it tracks the row instead of
        // being pinned to a pixel size — TownInfo's own rule
        width: 1.05em;
        height: 1.05em;
        object-fit: contain;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.95));
      }
      .townsfolk {
        color: $townsfolk;
        .team-glyph {
          filter: drop-shadow(0 0 4px rgba($townsfolk, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
      }
      .outsider {
        color: $outsider;
        .team-glyph {
          filter: drop-shadow(0 0 4px rgba($outsider, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
      }
      .minion {
        color: $minion;
        .team-glyph {
          filter: drop-shadow(0 0 4px rgba($minion, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
      }
      .demon {
        color: $demon;
        .team-glyph {
          filter: drop-shadow(0 0 4px rgba($demon, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
      }

      // a finger cannot hover a title, so on a touch screen the row gives the
      // cluster a real height rather than a 14px line of text
      @media (pointer: coarse) {
        min-height: 40px;
      }
    }

    // SHUFFLE SEAT ORDER, on the panel's shared plate. Everything this rule
    // used to do by hand — an opacity for "off", a 15px/-9px padding trick to
    // fake a fingertip target on a phone — the `control-icon-btn` mixin does
    // for every icon button on the panel at once, so this and RoleActions'
    // three cannot drift apart again.
    .tools {
      display: flex;
      align-items: center;
      gap: 10px;
      .tool-btn {
        @include control-icon-btn;
      }
    }
    .value {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      &:hover {
        color: red;
      }
      // "0 / 8 assigned" opens the grimoire drawer — a 14px-tall line of text
      // doing a button's job.
      @media (pointer: coarse) {
        min-height: 40px;
      }
    }
    small {
      opacity: 0.6;
    }
  }

  .start {
    margin-top: 10px;
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
    font-size: 120%;
    padding: 8px 20px;
    background: rgba(0, 0, 0, 0.7);
    border: 3px solid black;
    border-radius: 10px;
    opacity: 0.4;
    cursor: not-allowed;

    // FT-938 (user call: "let's make the border and text purple when it is
    // active"). Was `border-color: #400` (blood) with the default white text
    // — the button's only signal that it could be pressed was full opacity.
    // PURPLE, reusing controls.scss's own tokens rather than inventing a
    // third recipe: `$control-edge-hover` IS the grimoire's edge (this same
    // file already reads it for every plated control's hover), and #f4ecff is
    // the night checklist's own finish-button text — the app's other primary
    // button that goes purple when it's the obvious next step
    // (NightSheet.vue's `.bottom.ready`). Purple is the storyteller's chrome
    // throughout; this is that chrome on the one button here that earns it.
    &.ready {
      opacity: 1;
      cursor: pointer;
      border-color: $control-edge-hover;
      color: #f4ecff;
      &:hover {
        color: red;
      }
    }
  }

  .hint {
    display: block;
    margin-top: 6px;
    opacity: 0.6;
    font-size: 70%;
  }

  // ── THE DISC (FT-888, desktop only) ───────────────────────────────────
  //
  // The build panel joins the checklist and the two entry panels: same
  // geometry, same gate, same material, all of it from src/faceDisc.scss.
  // It is the DENSEST of the four — a town name, seats, a script, roles and
  // their three actions, the night switch, a tray of characters and Start —
  // so the arrangement matters more here than anywhere else.
  //
  // TITLE IN THE TOP CAP, START IN THE BOTTOM ONE, everything else in the
  // band. That is the same swap the other three made, and it is what buys the
  // band its width: the rows are wider than the circle's inscribed square
  // precisely because the two short things sit in the poles.
  //
  // THE BAND DOES NOT SCROLL, AND THAT IS DELIBERATE. Two of its children
  // open things OUTSIDE themselves — the script picker's grid and (on an
  // owned town) nothing else, but the grid alone is enough: it is
  // `position: absolute` and wider than the band, so a scrolling band would
  // become its clipping container and cut the picker in half. The same
  // argument is why the disc itself is `overflow: visible` here and on the
  // entry panels, where the checklist can afford `hidden`.
  //
  // SO THE TRAY ABSORBS INSTEAD. It is the one child whose height is a
  // variable — a bag of unseated characters — and it already owns a scroll
  // for exactly this (RoleTray's `.rt-rows`, 132px on the rectangle). Inside
  // the disc it takes whatever the four fixed rows leave, and scrolls the
  // rest. Nothing else changes size, and no type shrinks.
  @include face-disc-build-gate {
    @include face-disc-frame;
    // the script picker's grid opens out over the rim — see above
    overflow: visible;

    // `.ht-head`, not `h3` — see the template comment. The cap is a FIXED
    // slice of the disc (`fd-caph`), not an intrinsic height, so it is the
    // wrapper that takes the flex basis; growing content inside it does not
    // grow the cap, it bleeds down into the band instead.
    > .ht-head {
      @include face-disc-head;
      // the flex basis IS the cap; a margin would sit outside it and push the
      // band off centre, which is the one thing the arithmetic cannot take
      margin: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;

      h3 {
        margin: 0;
      }

      // THE GAMES LINE AND THE RENAME NOTE FOLD INTO THE HEADING'S OWN
      // TOOLTIP HERE, the same move the reason line and the claimed count
      // already make lower in this file: there is no room in a fixed cap for
      // a second line of type, so it rides the `title` instead of the page.
      .ht-games,
      .ht-rename-note {
        display: none;
      }
    }

    > .ht-body {
      @include face-disc-band;
      // THE BAND TAKES BACK THE ROOM THE BUTTON GAVE UP (2026-08-19, user
      // call: "make that button less wide and move it down, so that there is
      // more vertical room for the role selection").
      //
      // THE TWO HALVES OF THAT SENTENCE ARE ONE MOVE, and this line is it.
      // Extending the band downward pushes `.start-dock` — the next flex item
      // — down by exactly the same amount, so the button moves without a
      // second offset and `$face-disc-foot-dy` (a baked user-dialled value,
      // shared with three other surfaces) is not touched at all.
      //
      // A TRANSFORM WOULD HAVE MOVED THE BUTTON AND FREED NOTHING. The dy in
      // faceDisc.scss is a translate, and a translate takes no part in layout
      // — the band's slice is fixed at `d - 2*caph` and would have stayed
      // exactly as tall with the button sitting 20px lower. The room has to
      // come out of the flex basis or it does not exist.
      //
      // WHY 22px, AND WHY IT IS THE CEILING. The binding constraint is the
      // Start button's BOTTOM CORNERS against the arc, and the disc's floor —
      // 1642x780, where the radius is 228 — is where it binds. Measured with
      // the rim and the button's box DRAWN into the page rather than eyeballed
      // off the dial art, positive = inside the rim (rigs:
      // claude_temp_test/2026-08-19-plate-{measure,rimcheck}.mjs):
      //
      //                        1642x780   1920x1080
      //   as this lane found it   -1.6       +10.9   ← already outside at the
      //   band +22, narrow Start  +0.8       +18.9      floor before this lane
      //                                                 touched anything; and
      //                                                 faceDisc's own table
      //                                                 reads -1.6 at 1440x900,
      //                                                 which is the same 228r.
      //
      // Past +22 the button goes back outside at the floor. So the number is
      // the largest drop the narrower button pays for, and it is spent on the
      // tray rather than banked.
      //
      // WHAT IT BOUGHT, tray full, same seat count:
      //   1642x780   tray 68.9 -> 86.9px, characters showing  7 -> 13 of 22
      //   1920x1080  tray 157.1 -> 179.1px, characters showing 17 -> 21 of 22
      //
      // 10 OF THOSE 22 ARE THE DOCK'S OWN TOP MARGIN, given up below — see
      // `.start-dock`. That margin sat BETWEEN the band and the button doing
      // the job the mixin's translate already does, so taking it lets the band
      // grow 10px further without the button moving 10px further down.
      //
      // THE TRAY'S OWN BOTTOM ROW WAS THE OTHER CANDIDATE for the binding
      // constraint and turned out not to be. Role tiles are CIRCLES in a 42px
      // box, so the ink at the corner of a full row is transparent; measured
      // against the tile's own ink, the widest row still clears the rim by
      // 29.6px at the floor and 59.1px at 1920x1080.
      //
      // ── RE-MEASURED, 22px -> 26px (FT-938, user call: "a little taller… "
      // and "move the start game button down a bit more to make room") ─────
      // Re-measured against the CURRENT build rather than reusing the table
      // above — Width is baked at 18px now (it was mid-bake when +22 was
      // chosen) and the ellipse math the button's clearance actually wants is
      // in the rig below, not the circle approximation the old table used.
      //
      // THE FLOOR IS STILL THE BINDING CASE, and it is thin: at 1642x780 the
      // Start button's bottom corners clear the disc's ELLIPSE (not a circle
      // — the plate is 510x474 there, not square) by +6.5px before this
      // change. Every pixel this constant grows moves the button's bottom
      // edge down by the same pixel (the mixin's own translate is untouched;
      // the room comes out of the flex basis, same argument as the table
      // above) and costs very close to a pixel of that clearance. +4px was
      // the number that kept a real margin (+2.7px, in the same range the
      // table above already shipped at other sizes) rather than shaving it to
      // nothing:
      //
      //                    clearance (ellipse eq., +px = inside)
      //   1642x780 floor     +6.5  ->  +2.7
      //   1920x1080           — ample headroom there; not the binding case
      //
      // (Rig: claude_temp_test/2026-08-19-ft936-measure.mjs — run against a
      // built dist, not dev-server, so the hash in the proof matches.)
      flex-basis: calc(var(--fd-d) - 2 * var(--fd-caph) + 26px);
      display: flex;
      flex-direction: column;
      // without this the band's automatic minimum is its content's height and
      // the tray never gets told to shrink
      min-height: 0;
      padding: 0 6px;

      // NOTHING IN THE BAND SHRINKS EXCEPT THE TRAY, and this line is what says
      // so. As column flex items the rows default to `flex-shrink: 1`, so an
      // over-subscribed band silently squeezed each row BELOW its content —
      // measured: the Seats row held at 34px with its claimed count and shuffle
      // drawn on a second line straight through the Script row beneath it, and
      // "Night checklist" ran under its own switch. The tray is the one child
      // whose height is genuinely a variable, so it is the only one allowed to
      // give.
      > .row,
      > .night-mode {
        flex-shrink: 0;
      }

      // THE ROWS WRAP RATHER THAN OVERFLOW, for the size where even the folds
      // below are not enough. The gap comes down from 14px to 8px first, which
      // is spacing rather than type.
      > .row {
        flex-wrap: wrap;
        gap: 4px 8px;
      }

      // THE CLAIMED COUNT FOLDS INTO THE ROW'S TOOLTIP — a JUDGEMENT CALL, and
      // the one thing on this panel that the disc takes away rather than
      // rearranges, so it is stated plainly rather than buried.
      //
      // The Seats row is the crowded one: a label, the scrub, the new
      // composition readout, "N claimed" and the shuffle want 427px of a
      // 345px band at 1280x800. Something has to give, and this is the
      // cheapest thing on the line: it is 78px with its gap, it reads "0
      // claimed" for the whole of the build, and the session pill in the
      // bottom-right corner is already saying the same number out loud. Taking
      // it back keeps the Seats row on ONE line at every size the disc runs at,
      // which in turn is worth ~30px of band to the character tray — the
      // difference between a tray you can drag from at 1280x800 and one you
      // cannot.
      //
      // It is a FOLD, not a deletion: the row's own `title` carries it, the
      // rectangle and both phone sheets are untouched, and one deleted rule
      // brings it back.
      .row .claimed {
        display: none;
      }
    }

    > .start-dock {
      @include face-disc-foot;
      // NARROWER THAN THE MIXIN'S 0.95r (2026-08-19, user call). The dock IS
      // the button's width — `.start` is a block inside it — and 0.95r drew a
      // 262px slab under a two-word label at 1920x1080.
      //
      // IT IS ALSO WHAT PAYS FOR THE DROP. The binding measure on this button
      // has always been its BOTTOM CORNERS against the arc, and a narrower box
      // brings those corners in toward the vertical axis, where the circle is
      // deepest. That is the whole reason both halves of the user's sentence
      // ("less wide AND further down") can be true at once: at the disc's own
      // floor the button was already 1.6px OUTSIDE the rim before this lane
      // touched it, and it now sits 12px lower and 0.8px inside.
      //
      // THE FLOOR IS THE LABEL, not the radius: 150px holds "Start game" at
      // 100% in PiratesBay with its 14px padding and 3px border on one line.
      // Below it the label wraps, which is the one thing a primary button must
      // not do — so the width is a `max()`, not a bare fraction, and at the
      // smallest disc it is the floor that answers.
      //
      // FIXED (FT-938): this read `--fd-r`, the VERTICAL radius — faceDisc.scss
      // names the bug itself, next to `face-disc-foot`: "the read wants
      // `--fd-rx` whenever that button is next opened." It is now open.
      //
      // THE COEFFICIENT MOVED WITH IT, 0.62 -> 0.583, so the fix reads as a
      // correction rather than a resize: solved from the live numbers so
      // `0.62 * fd-r` and `0.583 * fd-rx` compute the SAME 176.4px at
      // 1920x1080, the size this file's own tables already use as their
      // benchmark. `fd-rx` is `fd-r` plus a flat 18px, not a multiple of it,
      // so the two formulas only agree exactly at that one solved size — off
      // it the delta is a few px (under 5 across the whole disc range,
      // measured), which is a correction's rounding, not a second resize. At
      // the floor the formula was never binding anyway (150px, the label's
      // own floor, beats either expression there), so nothing moves at the
      // one size this pass's clearance budget is tight.
      width: max(150px, 0.583 * var(--fd-rx));

      // NO TOP MARGIN HERE (the mixin's `margin: 10px 0 0`, overridden). It
      // was a gap between the band and the button, and the mixin's own
      // translate already opens one — so the 10px was being paid twice and the
      // band was the one paying. Given back, it is 10px of character tray.
      margin-top: 0;

      // START, AT THE DISC'S OWN BUTTON SIZE. On the rectangle this is 120%
      // type in 8px/20px padding inside a 3px border — 60.7px tall, against
      // the checklist's 42px and the entry panels' 48px. In a bottom cap that
      // is not a style choice, it is the difference between clearing the arc
      // and being sheared by it, and the three primary buttons on this face
      // should be one object anyway. The label is two short words; it is the
      // padding that comes off, not the reading size.
      .start {
        margin-top: 0;
        font-size: 100%;
        padding: 4px 14px;
      }
      // THE REASON LINE FOLDS INTO THE BUTTON'S TOOLTIP HERE, and this is a
      // fold rather than a loss: it is the same string as the button's own
      // `title`, and the disc only exists on a fine pointer, which can hover.
      // It was added for the PHONE sheet, where nothing can. Measured: with the
      // line showing, the dock stands 73.8px in a 96.8px cap and Start's bottom
      // corners cross the rim by 7.8px at 1280x800 — the cap has room for the
      // button or for the pair, not both, and the button is what the panel
      // exists to reach.
      .hint {
        display: none;
      }
    }
  }
}
</style>
