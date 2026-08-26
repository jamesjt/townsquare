<template>
  <!-- Golem fork (FT-850): the END GAME overlay — the host declares the
       winner and the finished game is recorded to the golem server. One
       question, two answers; recording is best-effort and never blocks the
       game UI (a failure costs a toast, nothing else). -->
  <div class="endgame-overlay" @click="$emit('close')">
    <div class="panel" @click.stop>
      <h3>Who won?</h3>
      <!-- FT-889 follow-up: the choices wear the fork's own team art
           (golem/glyphs, the same glyphs TownInfo's counts and the build
           panel's composition row use) instead of bare text on a flat
           colour — the icon is the point of the control, the word confirms
           it. Good stands for the townsfolk glyph, evil for the demon
           glyph, mirroring TownSquare's own "demon is the evil seat"
           convention (demonIndex). -->
      <div class="button-group">
        <div
          class="choice good"
          :class="{ disabled: busy }"
          @click="record('good')"
        >
          <img class="choice-icon" :src="goodGlyph" alt="" />
          <span class="choice-label">Good</span>
        </div>
        <div
          class="choice evil"
          :class="{ disabled: busy }"
          @click="record('evil')"
        >
          <img class="choice-icon" :src="evilGlyph" alt="" />
          <span class="choice-label">Evil</span>
        </div>
      </div>
      <div class="cancel" @click="$emit('close')">cancel</div>
    </div>
  </div>
</template>

<script>
import { recordGame, dealTimeFor, clearDealt } from "../golem/stats";
import { flashHint } from "../golem/hint";
// the fork's own team art — one definition of "the glyph for team X",
// already worn by TownInfo's counts, HostTools' composition row, RoleDrawer's
// group headers and EditionModal's team toggles/picker.
import { teamGlyph } from "../golem/glyphs";

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
      busy: false,
      // resolved once — the glyphs are static per team, not per role, so
      // there is nothing to recompute on every render (unlike roleIcon,
      // which resolves per-role art)
      goodGlyph: teamGlyph("townsfolk"),
      evilGlyph: teamGlyph("demon")
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
      const { session, edition, night } = this.$store.state;
      const players = this.$store.state.players.players;
      const seats = [];
      players.forEach((player, index) => {
        const role = player.role;
        if (!role || !role.id || !ROLE_TYPES[role.team]) return;
        const seat = {
          seatNo: index + 1,
          playerName: (player.name || `Seat ${index + 1}`).slice(0, 200),
          teamAtEnd:
            role.team === "minion" || role.team === "demon" ? "evil" : "good",
          roleIdFinal: role.id,
          roleType: ROLE_TYPES[role.team],
          survived: !player.isDead,
          // FT-1200: WHOSE game this seat was, when the claimant said so.
          // The host's ledger (session.seatAccounts, written by the private
          // "accountId" frames) is keyed by playerId; the seat's live
          // `player.id` is the claim that actually held — so a guest, an
          // empty chair, or a stale offer from a refused claim all resolve
          // to null. The server cross-checks the ids it is given and nulls
          // any it doesn't know (FT-1199), so a wrong guess cannot attach
          // a game to nobody's account.
          accountId:
            (player.id && (session.seatAccounts || {})[player.id]) || null
        };
        // FT-1163: WHEN it died rides along when we know it. Stamped at the
        // moment the shroud went down (store/deathMoment.js) because that is
        // the only moment the fact exists — by the time this roster is read it
        // knows nothing but dead-or-alive.
        //
        // Sent only for a seat that is actually dead AND carries both halves.
        // A survivor with a death moment is a contradiction the server
        // refuses, and half a moment is not a moment: a game whose seats
        // predate this stamp (a shroud placed before a reload, say) records
        // with the fields absent, which reads back as "we do not know" rather
        // than as a wrong day.
        if (
          player.isDead &&
          typeof player.deathDay === "number" &&
          (player.deathPhase === "night" || player.deathPhase === "day")
        ) {
          seat.deathDay = player.deathDay;
          seat.deathPhase = player.deathPhase;
        }
        seats.push(seat);
      });
      if (!seats.length) {
        // FT-1050: nothing to record is not a reason to leave the game
        // running forever. There is no stats POST to make (nothing to
        // post), but the town still has to come out of "running" the same
        // way a recorded end does — so this takes the SAME shared exit as
        // the success path below: emit "recorded" (App.vue's
        // onGameRecorded clears the deal stash, authors the chronicle end
        // event, and commits the endGame mutation) before "close". Only
        // the POST itself is skipped.
        flashHint("Game ended — nothing to record.");
        this.busy = false;
        this.$emit("recorded", winningTeam);
        this.$emit("close");
        return;
      }
      const payload = {
        townId: session.sessionId,
        scriptName: (edition.name || "Custom script").slice(0, 200),
        winningTeam,
        playerCount: seats.length,
        // FT-1163: HOW LONG THE GAME WAS — the single most wanted fact about a
        // finished game after the script, the winner and the seat count, and
        // the one that cannot be worked out later (started/ended timestamps
        // say how long the sitting took, not how many nights it ran).
        //
        // `night.day` is the count of nights the town reached: the first night
        // is 1, and 0 means the game ended before ever going to night. It is
        // still the finished game's own value here — the counter is reset by
        // Play again, not by the ending (see socket.js's sendChat note), and
        // this runs before the endGame commit either way.
        dayCount: night.day,
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
      } catch (e) {
        flashHint("Couldn't record — server unreachable");
      }
      this.busy = false;
      // FT-931: THE TOWN ENDS HERE, whether or not the stats POST above
      // succeeded — recording is best-effort (see the file header) and
      // ending the game must not inherit that network's fate. Moved out of
      // the try block (was inside, success-only) and now carries the
      // winner: App.vue's own listener is what actually ends the town
      // (there is nowhere else this value is kept — it is a function
      // parameter, not component state).
      this.$emit("recorded", winningTeam);
      this.$emit("close");
    }
  }
};
</script>

<style scoped lang="scss">
// the two team colours this panel wears — the same variables HostTools'
// composition row and TownInfo's counts read, not a hard-coded blue/red.
@import "../vars.scss";

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
    // 0.9, matching Intro's host/join panel (this app's other "one question,
    // a choice, a way out" dialog) rather than this file's previous 0.75
    background: rgba(0, 0, 0, 0.9);
    border: 3px solid black;
    border-radius: 10px;
    box-shadow: 0 0 10px black;

    h3 {
      margin-bottom: 8px;
    }

    .button-group {
      display: flex;
      justify-content: center;
      gap: 14px;
      margin: 4px 0 2px;
    }

    // FT-889 follow-up: a dark plate with a team-coloured edge and a glowing
    // glyph — EditionModal's wb-team-toggle shape (icon over a count, on a
    // rgba(0,0,0,0.45) plate), sized up because here the icon IS the answer,
    // not a count label beside it.
    .choice {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      min-width: 96px;
      padding: 14px 16px 10px;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      cursor: pointer;
      transition:
        background 150ms,
        border-color 150ms;

      .choice-icon {
        width: 48px;
        height: 48px;
        object-fit: contain;
      }
      // PiratesBay + letter-spacing: the primary-action label idiom (the
      // build panel's Start button, the night checklist's phase-flip button)
      .choice-label {
        font-family: PiratesBay, sans-serif;
        letter-spacing: 1px;
        font-size: 105%;
      }

      // team-coloured border + glyph glow — RoleDrawer's per-team section
      // border (rgba($color, 0.55)) and TownInfo/HostTools' glyph glow
      // (drop-shadow(0 0 4px rgba($color, 0.8))), the same recipe both
      // already use for "this readout belongs to team X".
      &.good {
        border-color: rgba($townsfolk, 0.55);
        .choice-label {
          color: $townsfolk;
        }
        .choice-icon {
          filter: drop-shadow(0 0 4px rgba($townsfolk, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
        &:hover:not(.disabled) {
          background: rgba($townsfolk, 0.18);
          border-color: rgba($townsfolk, 0.85);
        }
      }
      &.evil {
        border-color: rgba($demon, 0.55);
        .choice-label {
          color: $demon;
        }
        .choice-icon {
          filter: drop-shadow(0 0 4px rgba($demon, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
        &:hover:not(.disabled) {
          background: rgba($demon, 0.18);
          border-color: rgba($demon, 0.85);
        }
      }

      // visual-only, matching the panel's previous behaviour: the click
      // still lands, record() itself guards on busy (see the script block)
      &.disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .cancel {
      margin-top: 10px;
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
