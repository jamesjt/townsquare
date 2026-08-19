<template>
  <!-- Golem fork: the HOST TOOLS panel — the storyteller's setup surface,
       centre-stage while the game is being built (hosting, seats exist, roles
       not yet dealt). The controls DRIVE the existing machinery (players/add,
       the edition + roles modals, distributeRoles) — this panel is doors, not
       a second implementation. -->
  <div class="host-tools">
    <h3>Build the town</h3>

    <!-- FT-847: an OWNED town (this browser holds its edit key) can be
         renamed in place — the new name lands on the server and the shelf. -->
    <div class="row" v-if="ownedKey">
      <span class="label">Town</span>
      <span
        class="value"
        v-if="!renaming"
        @click="startRename"
        title="Rename your town"
      >
        {{ townName }}
        <font-awesome-icon icon="pen" />
      </span>
      <input
        v-else
        ref="rename"
        v-model="renameDraft"
        spellcheck="false"
        maxlength="200"
        @keyup.enter="commitRename"
        @keyup.esc="renaming = false"
        @blur="commitRename"
      />
      <small v-if="renameNote">{{ renameNote }}</small>
    </div>

    <div class="row">
      <span class="label">Seats</span>
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
      <!-- (the shift-click-to-fill shortcut left this line 2026-08-18 —
           shift-clicking START does the filling now, so there is one dev
           gesture instead of two. devFillSeats itself is kept below.) -->
      <small>{{ claimedCount }} claimed</small>
      <!-- FT-847 follow-up: relocated from the retired Players toolbar tab.
           ALWAYS rendered — appearing icons shove the row (user call);
           unusable states grey out instead. -->
      <!-- (trash retired — scrub the count to 0 instead; user call) -->
      <span class="tools">
        <font-awesome-icon
          icon="random"
          :class="{ disabled: players.length <= 2 }"
          @click="randomizeSeatings"
          title="Shuffle seat order"
        />
      </span>
    </div>

    <!-- the SHARED script picker (user call): pick right here, with the
         script's OWN art on the trigger; the Almanac card opens the forge -->
    <div class="row">
      <span class="label">Script</span>
      <ScriptPicker
        class="ht-script-picker"
        :cards="scriptCards"
        :picked-id="pickedScriptId"
        @pick="pickScript"
      />
    </div>

    <!-- FT-854: the role DRAWER replaced the overlay -->
    <div class="row">
      <span class="label">Roles</span>
      <span class="value" @click="toggleModal('roleDrawer')">
        {{ rolesAssigned }} / {{ players.length }} assigned
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
      // the picker's vault selection (officials read from the store)
      vaultPickedId: null,
      grimoireClosed,
      // FT-847: owned-town rename state.
      renaming: false,
      renameDraft: "",
      townName: "",
      renameNote: ""
    };
  },
  created() {
    this.loadTownName();
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
    /** Travellers sit beyond the base count and outside distribution math. */
    coreSeats() {
      return this.players.filter(
        p => !p.role || p.role.team !== "traveler"
      );
    },
    rolesAssigned() {
      return this.players.filter(p => p.role && p.role.team).length;
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
    // ── FT-847: owned-town rename ────────────────────────────────────────
    loadTownName() {
      const id = this.session.sessionId;
      const entry = id && listTowns().find(t => t.id === id);
      this.townName = (entry && entry.name) || id || "";
    },
    startRename() {
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
      // DEV (user call 2026-08-18): shift-click START is now the ONE dev
      // gesture — it fills every empty chair with a fake player and then
      // starts. Roles must still be assigned; only the claim gate is waived,
      // and only because the fill has just satisfied it.
      const devForce =
        e &&
        e.shiftKey &&
        this.players.length > 0 &&
        this.rolesAssigned >= this.players.length;
      if (devForce) this.devFillSeats();
      if (!this.canStart && !devForce) {
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
.host-tools {
  position: absolute;
  z-index: 3;
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
  max-width: calc(100vw - 20px);
  overflow-y: auto;
  // a phone drags the whole page when an inner list runs out of scroll
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

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
    h3 {
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

  h3 {
    margin-bottom: 8px;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-height: 34px;

    .label {
      opacity: 0.7;
      width: 55px;
      text-align: left;
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
    .tools {
      display: flex;
      align-items: center;
      gap: 10px;
      svg {
        cursor: pointer;
        opacity: 0.7;
        &:hover {
          color: red;
          opacity: 1;
        }
        &.disabled {
          opacity: 0.3;
          pointer-events: none;
        }
        // Shuffle seat order drew at 10x10px on a phone — an icon scaled by
        // the row's font size, with nothing else to give it a box. Padding
        // grows the target without touching the mark.
        @media (pointer: coarse) {
          box-sizing: content-box;
          padding: 15px;
          margin: -9px;
        }
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

    // FT-847: the owned-town rename field.
    input {
      flex-grow: 1;
      min-width: 0;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: 2px solid black;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 90%;
      outline: none;

      &:focus {
        border-color: #400;
      }
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

    &.ready {
      opacity: 1;
      cursor: pointer;
      border-color: #400;
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
}
</style>
