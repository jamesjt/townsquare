<template>
  <!-- Golem fork (FT-850): the END GAME overlay — the host declares the
       winner and the finished game is recorded to the golem server. One
       question, two answers; recording is best-effort and never blocks the
       game UI (a failure costs a toast, nothing else). -->
  <div class="endgame-overlay" @click="$emit('close')">
    <div class="panel" @click.stop>
      <h3>Who won?</h3>
      <div class="button-group">
        <div
          class="button townsfolk"
          :class="{ disabled: busy }"
          @click="record('good')"
        >
          Good
        </div>
        <div
          class="button demon"
          :class="{ disabled: busy }"
          @click="record('evil')"
        >
          Evil
        </div>
      </div>
      <div class="cancel" @click="$emit('close')">cancel</div>
    </div>
  </div>
</template>

<script>
import { recordGame, dealTimeFor, clearDealt } from "../golem/stats";
import { flashHint } from "../golem/hint";

/** The five role classes the stats server records. The app spells the
 *  travelling folk "traveler"; the BotC taxonomy (and the server enum)
 *  spells it "traveller" — map on the way out. */
const ROLE_TYPES = {
  townsfolk: "townsfolk",
  outsider: "outsider",
  minion: "minion",
  demon: "demon",
  traveler: "traveller"
};

export default {
  data() {
    return {
      busy: false
    };
  },
  mounted() {
    document.addEventListener("keyup", this.onKeyup);
  },
  destroyed() {
    document.removeEventListener("keyup", this.onKeyup);
  },
  methods: {
    onKeyup(e) {
      if (e.key === "Escape") this.$emit("close");
    },
    /**
     * Assemble the flat game record from the grimoire and POST it.
     * Seats with no role are empty chairs and stay off the record. Alignment
     * at end derives from the role's class (townsfolk/outsider → good,
     * minion/demon → evil); the app does not model traveller alignment
     * anywhere, so travellers record as good — the storyteller's grimoire
     * has no evil-traveller marker to read.
     */
    async record(winningTeam) {
      if (this.busy) return;
      this.busy = true;
      const { session, edition } = this.$store.state;
      const players = this.$store.state.players.players;
      const seats = [];
      players.forEach((player, index) => {
        const role = player.role;
        if (!role || !role.id || !ROLE_TYPES[role.team]) return;
        seats.push({
          seatNo: index + 1,
          playerName: (player.name || `Seat ${index + 1}`).slice(0, 200),
          teamAtEnd:
            role.team === "minion" || role.team === "demon" ? "evil" : "good",
          roleIdFinal: role.id,
          roleType: ROLE_TYPES[role.team],
          survived: !player.isDead
        });
      });
      if (!seats.length) {
        flashHint("Nothing to record — no seated roles.");
        this.busy = false;
        this.$emit("close");
        return;
      }
      const payload = {
        townId: session.sessionId,
        scriptName: (edition.name || "Custom script").slice(0, 200),
        winningTeam,
        playerCount: seats.length,
        seats
      };
      // The vault id rides along only when the table is actually playing a
      // vault script (the EditionModal holds the loaded id; an official
      // edition means any stale vault id is not what's being played).
      const editionModal = this.$parent.$refs.edition;
      if (edition.id === "custom" && editionModal && editionModal.vaultSourceId) {
        payload.scriptId = editionModal.vaultSourceId;
      }
      const storyteller = localStorage.getItem("golem.playerName");
      if (storyteller) payload.storytellerName = storyteller.slice(0, 200);
      const startedAt = dealTimeFor(session.sessionId);
      if (startedAt) payload.startedAt = startedAt;
      try {
        await recordGame(payload);
        clearDealt(session.sessionId);
        flashHint(
          `Game recorded — ${winningTeam === "good" ? "Good" : "Evil"} wins`
        );
        this.$emit("recorded");
      } catch (e) {
        flashHint("Couldn't record — server unreachable");
      }
      this.busy = false;
      this.$emit("close");
    }
  }
};
</script>

<style scoped lang="scss">
.endgame-overlay {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);

  .panel {
    text-align: center;
    padding: 15px 30px;
    background: rgba(0, 0, 0, 0.75);
    border: 3px solid black;
    border-radius: 10px;
    box-shadow: 0 0 10px black;

    h3 {
      margin-bottom: 8px;
    }

    .button {
      min-width: 90px;
    }

    .cancel {
      margin-top: 6px;
      opacity: 0.6;
      font-size: 80%;
      cursor: pointer;
      &:hover {
        color: red;
        opacity: 1;
      }
    }
  }
}
</style>
