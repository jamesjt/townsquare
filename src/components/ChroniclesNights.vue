<template>
  <!-- Golem fork (FT-1037b, user call): "all of this should be a toggle for
       events in the chronicle that shows it for the user, not its own thing."
       THE PLAYER'S OWN NIGHTS, inside Chronicles — the retired
       NightInfoDrawer's whole body (FT-860/1005), ported rather than
       rewritten, behind the stream's moon filter cell. Viewer-local by
       construction: everything here renders from night/myEntries, which
       holds THIS seat's rows and nothing else, projected with no lie mark
       and no done tick (the secrets are absent from the data, so they are
       absent from the DOM).

       The FT-1005 live "Tonight" surface — the player's own action inputs
       and the storyteller's answers as they land — moved here UNTOUCHED:
       same commits (night/playerAction), same echo round trip, same schema
       reads. Only the room it stands in changed. -->
  <div class="cn-body">
    <!-- FT-1101: the live block's CONTROLS moved out to NightCall.vue, which
         now stands in two rooms — here, where it always was, and pinned at
         the foot of the chronicles stream, because a player looking at the
         messages had no way to learn the night wanted them (the user's Imp).
         Same commits, same echo, same schema reads; only the room count
         changed. -->
    <!-- FT-1107 (user): STOOD DOWN, not deleted — the house rule. "The
         interaction should happen on the clock face. not in the chat, the
         chronicle should just record what was done."

         This was the ORIGINAL room for the night's controls (FT-1005) and
         the last one still holding a copy of them. It goes for the same
         reason the drawer's pinned band did, plus one of its own: with the
         ask standing on the town square there must be exactly ONE place to
         answer it, or a player who finds this one will wonder which of the
         two the storyteller is actually reading.

         What is left in this view is the whole point of it — the record,
         night by night, of what this seat did and was told. Tonight's own
         row is part of that record and now appears in the list below like
         every other night's (see `nights`), rather than being held out for a
         live section that no longer renders.

         The `tonight` / `tonightRow` computeds stay below, unused. -->
    <section v-if="false" class="nd-tonight">
      <h4>Tonight — Night {{ night.day }}</h4>
      <NightCall :action="tonight" :row="tonightRow" :day="night.day" />
    </section>

    <p class="nd-empty" v-if="!nights.length && !tonight">
      Nothing yet. What you learn at night will be written down here.
    </p>
    <section v-for="n in nights" :key="n.day" class="nd-night">
      <h4>Night {{ n.day }}</h4>
      <div v-for="row in n.rows" :key="row.id" class="nd-row">
        <span class="nd-role">{{ row.roleName }}</span>
        <span class="nd-chose" v-if="row.targetNames.length">
          You chose <b>{{ row.targetNames.join(" and ") }}</b>
        </span>
        <span class="nd-told" :class="pingClass(row)" v-if="row.ping !== null">
          {{ row.ping ? "Yes" : "No" }}
        </span>
        <span
          class="nd-told"
          v-if="row.number !== null && row.number !== undefined"
        >
          {{ row.number }}
        </span>
        <span class="nd-told" v-if="row.characterName">{{
          row.characterName
        }}</span>
        <span class="nd-text" v-if="row.text">{{ row.text }}</span>
      </div>
    </section>
  </div>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import NightCall from "./NightCall";
// FT-1101: "is the night asking this seat for anything tonight?" is now ONE
// definition in golem/nightLog (the FT-1005 computed, lifted out unchanged),
// because the pinned band in the stream asks the same question this view does.
import { tonightActionFor } from "../golem/nightLog";

export default {
  name: "ChroniclesNights",
  components: { NightCall },
  computed: {
    ...mapGetters({ myEntries: "night/myEntries" }),
    ...mapState(["grimoire", "night", "session"]),
    ...mapState("players", ["players"]),
    /** This client's own seat — the same "find me in the ring" lookup
     *  Vote.vue and TownSquare.vue already use. */
    me() {
      return (
        this.players.find((p) => p.id && p.id === this.session.playerId) || null
      );
    },
    /**
     * FT-1005: TONIGHT'S OWN ACTION, or null when there is none to show — no
     * night, the town not sharing (the host's live flag, never this
     * browser's own mode default), no seat, no role, a role that does not
     * wake tonight, or a dead seat whose character's trigger isn't dying
     * (wakesWhenDead — the Ravenkeeper still gets their row).
     *
     * BELIEF IS CORRECT BY CONSTRUCTION here: this client only ever holds
     * the character its player was TOLD they are (FT-1006 dealt the belief;
     * the truth never crossed the wire), so rendering from `me.role` IS
     * "the night action for what they believe they are". No Drunk handling.
     */
    tonight() {
      return tonightActionFor({
        isNight: this.grimoire.isNight,
        // the HOST's sharing verdict, never this browser's own mode default
        live: this.night.playerNight.live,
        day: this.night.day,
        me: this.me,
      });
    },
    /** Tonight's delivered row for this action, if the host has written or
     *  echoed anything yet. */
    tonightRow() {
      if (!this.tonight) return null;
      return (
        this.myEntries.find(
          (r) =>
            r.day === this.night.day &&
            (!r.roleId || r.roleId === this.tonight.role.id),
        ) || null
      );
    },
    /**
     * Their own rows, newest night first.
     *
     * FT-1107: EVERY row now, tonight's included. The exclusion that stood
     * here kept tonight's live row out of the list because the Tonight
     * section above rendered it — and that section has stood down, so
     * without this the night in progress would be the one night a player
     * could not read back. The record is complete or it is not a record.
     */
    nights() {
      const byDay = new Map();
      this.myEntries.forEach((row) => {
        if (!byDay.has(row.day)) byDay.set(row.day, []);
        byDay.get(row.day).push(row);
      });
      return [...byDay.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([day, rows]) => ({ day, rows }));
    },
  },
  methods: {
    pingClass(row) {
      return { yes: row.ping === true, no: row.ping === false };
    },
  },
  // FT-1101: the live block's own methods (slotValue / pickSeat / typeText /
  // flushText) and the free-text echo watcher went with the markup to
  // NightCall.vue — the component that now owns the controls in both rooms.
};
</script>

<style scoped lang="scss">
// The retired drawer's own furniture, carried over whole (nd-*) — the rows
// keep their look so the fold reads as a move, not a redesign.
.cn-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 4px 2px 0;
}

.nd-empty {
  opacity: 0.55;
  font-size: 90%;
  padding: 10px 4px;
}

// FT-1005: TONIGHT — the live action block. Same row furniture as the
// history below, with a gold seam on the accent edge: this is the one row
// the player is standing IN, not reading back.
//
// FT-1101: the inner rules below (.nd-live, .nd-line, .nd-input, .nd-your,
// .nd-free) now dress markup that lives in NightCall.vue, and a scoped sheet
// does not reach into a child — the values were COPIED there with the markup
// and these are inert. Left standing rather than removed: they are the
// original of what NightCall now carries, and nothing here is load-bearing.
// The `h4` rule above them is still this component's own.
.nd-tonight {
  margin-bottom: 14px;
  h4 {
    text-align: left;
    font-family: PiratesBay, sans-serif;
    font-weight: normal;
    opacity: 0.9;
    margin-bottom: 4px;
  }
  .nd-live {
    border-left-color: #b28f2f;
  }
  .nd-line {
    flex-basis: 100%;
    opacity: 0.75;
    font-style: italic;
  }
  .nd-input {
    flex-basis: 100%;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  .nd-your {
    opacity: 0.75;
    font-size: 12.5px;
    white-space: nowrap;
  }
  .nd-free {
    height: 30px;
    flex: 1 1 140px;
    min-width: 0;
    font-family: inherit;
    font-size: 12.5px;
    color: white;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid #3d3d3d;
    border-radius: 5px;
    padding: 0 8px;
    &:focus-visible {
      outline: none;
      border-color: #b28f2f;
    }
  }
  @media (pointer: coarse) {
    .nd-free {
      height: 44px;
      font-size: 14px;
    }
  }
}

.nd-night {
  margin-bottom: 12px;
  h4 {
    text-align: left;
    font-family: PiratesBay, sans-serif;
    font-weight: normal;
    opacity: 0.75;
    margin-bottom: 4px;
  }
}

.nd-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  padding: 5px 8px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid #4b3565;
  border-radius: 0 5px 5px 0;
  font-size: 90%;

  .nd-role {
    font-weight: bold;
  }
  .nd-chose {
    opacity: 0.8;
  }
  .nd-told {
    padding: 0 8px;
    border-radius: 9px;
    font-weight: bold;
    background: rgba(0, 0, 0, 0.4);
    &.yes {
      color: #7ed67e;
    }
    &.no {
      color: #ff8a8a;
    }
  }
  .nd-text {
    flex-basis: 100%;
    opacity: 0.8;
    font-style: italic;
  }
}
</style>
