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
           (user call — the +/- pair retired) -->
      <span class="stepper">
        <b
          class="seat-scrub"
          title="Drag sideways to set seats (0–20)"
          @pointerdown="scrubSeats"
          >{{ players.length }}</b
        >
      </span>
      <small>{{ claimedCount }} claimed</small>
      <!-- FT-847 follow-up: relocated from the retired Players toolbar tab.
           ALWAYS rendered — appearing icons shove the row (user call);
           unusable states grey out instead. -->
      <span class="tools">
        <font-awesome-icon
          icon="random"
          :class="{ disabled: players.length <= 2 }"
          @click="randomizeSeatings"
          title="Shuffle seat order"
        />
        <font-awesome-icon
          icon="trash-alt"
          :class="{ disabled: !players.length }"
          @click="clearAllPlayers"
          title="Remove all seats"
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

    <div class="row">
      <span class="label">Roles</span>
      <span class="value" @click="toggleModal('roles')">
        {{ rolesAssigned }} / {{ players.length }} assigned
        <font-awesome-icon icon="random" />
      </span>
    </div>

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
</template>

<script>
import { mapMutations, mapState } from "vuex";
import { listTowns, editKeyFor, updateTown } from "../golem/towns";
import ScriptPicker from "./ScriptPicker";
import editionJSON from "../editions";
import { EDITION_ICONS, edCustom, OFFICIAL_BLURBS } from "../golem/editionArt";
import { getRecents } from "../golem/scripts";

export default {
  components: { ScriptPicker },
  data() {
    return {
      // the picker's vault selection (officials read from the store)
      vaultPickedId: null,
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
    ...mapState(["edition", "session"]),
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
          source: "Almanac"
        });
      });
      cards.push({
        id: "__almanac",
        name: "Almanac…",
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
    /** Drag the number sideways — one seat per 9px. Shrinking only takes
     *  EMPTY chairs (claimed seats never leave via the scrub). */
    scrubSeats(e) {
      e.preventDefault();
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startN = this.players.length;
      const onMove = ev => {
        const want = Math.max(
          0,
          Math.min(20, startN + Math.round((ev.clientX - startX) / 9))
        );
        let guard = 25;
        while (this.players.length < want && guard--) this.addSeat();
        while (
          this.players.length > want &&
          this.canRemoveSeat &&
          guard--
        )
          this.removeSeat();
      };
      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
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
    randomizeSeatings() {
      if (this.players.length <= 2) return;
      if (confirm("Are you sure you want to randomize seatings?")) {
        this.$store.dispatch("players/randomize");
      }
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
    start() {
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
.host-tools {
  position: absolute;
  z-index: 3;
  text-align: center;
  padding: 15px 25px;
  background: rgba(0, 0, 0, 0.6);
  border: 3px solid black;
  border-radius: 10px;
  box-shadow: 0 0 10px black;

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
      b {
        min-width: 26px;
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
