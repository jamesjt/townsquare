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
    <section v-if="tonight" class="nd-tonight">
      <h4>Tonight — Night {{ night.day }}</h4>
      <div class="nd-row nd-live">
        <span class="nd-role">{{ tonight.role.name }}</span>
        <span class="nd-line">{{ tonight.line }}</span>
        <!-- their OWN choices — only the fields the schema says the player
             fills (playerSlots); the storyteller's pointings never render
             an input here -->
        <div class="nd-input" v-if="tonight.slots">
          <span class="nd-your">{{
            tonight.slots > 1 ? "Your choices:" : "Your choice:"
          }}</span>
          <SeatPicker
            v-for="slot in tonight.slots"
            :key="'t' + slot"
            class="nd-pick"
            :players="players"
            :picked-seat="slotValue(slot - 1)"
            :title="
              'Your own pick (' +
              slot +
              ' of ' +
              tonight.slots +
              ') — the storyteller sees it as yours'
            "
            @pick="(seat) => pickSeat(slot - 1, seat)"
          />
        </div>
        <!-- the universal fallback where no control was ever designed for
             this character: their choice in their own words -->
        <div class="nd-input" v-else-if="tonight.freeText">
          <input
            type="text"
            class="nd-free"
            placeholder="Your choice, in your own words"
            spellcheck="false"
            maxlength="280"
            :value="freeTextValue"
            @input="typeText($event.target.value)"
            @blur="flushText"
          />
        </div>
        <!-- what the storyteller has answered so far — everything on the
             row except whether it was a lie, live as they fill it -->
        <template v-if="tonightRow">
          <span
            class="nd-told"
            :class="pingClass(tonightRow)"
            v-if="tonightRow.ping !== null"
          >
            {{ tonightRow.ping ? "Yes" : "No" }}
          </span>
          <span
            class="nd-told"
            v-if="tonightRow.number !== null && tonightRow.number !== undefined"
          >
            {{ tonightRow.number }}
          </span>
          <span class="nd-told" v-if="tonightRow.characterName">{{
            tonightRow.characterName
          }}</span>
          <span class="nd-text" v-if="tonightRow.text">{{
            tonightRow.text
          }}</span>
        </template>
      </div>
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
import SeatPicker from "./SeatPicker";
// FT-1005: the same schema the storyteller's checklist reads — the player's
// own row renders from the identical entry, minus the lie mark (which never
// reaches this client at all).
import {
  playerSlots,
  fieldsFor,
  lineFor,
  deadStillWakes,
} from "../golem/nightInfo";
import { reminderFor } from "../golem/nightLog";

export default {
  name: "ChroniclesNights",
  components: { SeatPicker },
  data() {
    return {
      // FT-1005: the free-text draft — local while typing (the input cannot
      // ride the wire round trip per keystroke), sent debounced and on blur.
      // null = not dirty, show what the host holds.
      textDraft: null,
    };
  },
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
      if (!this.grimoire.isNight) return null;
      if (!this.night.playerNight.live) return null;
      const me = this.me;
      const role = me && me.role && me.role.id ? me.role : null;
      if (!role) return null;
      const first = this.night.day <= 1;
      if (!(role[first ? "firstNight" : "otherNight"] > 0)) return null;
      if (me.isDead && !deadStillWakes(role, null)) return null;
      const slots = playerSlots(role.id);
      const { known } = fieldsFor(role.id);
      return {
        role,
        slots,
        // the same two texts the checklist row shows: our line where one is
        // written, the shipped reminder where none is
        line: lineFor(role.id, first) || reminderFor(role, first),
        // the universal fallback: a character nobody designed controls for
        // states their choice in words — never a picker whose slots would
        // mean something else
        freeText: !known,
      };
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
    /** The free box shows the local draft while typing, the host's echo
     *  otherwise. */
    freeTextValue() {
      if (this.textDraft !== null) return this.textDraft;
      return this.tonightRow ? this.tonightRow.playerText : "";
    },
    /** Their own rows, newest night first — minus tonight's live row, which
     *  renders in the Tonight section above rather than twice. */
    nights() {
      const liveId = this.tonightRow ? this.tonightRow.id : null;
      const byDay = new Map();
      this.myEntries.forEach((row) => {
        if (liveId && row.id === liveId) return;
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
    /**
     * FT-1005: the picker shows what the HOST recorded — the echo, never
     * local optimism. A pick answers back in one round trip (the host
     * re-sends this seat's rows on every action frame, applied or refused),
     * so the control settles on the truth even when a storyteller-entered
     * value stood and the pick was refused.
     */
    slotValue(i) {
      const row = this.tonightRow;
      if (row && Number.isInteger(row.targets[i])) return row.targets[i];
      return -1;
    },
    /** One pick, up the wire. The commit is the event (the callBack idiom);
     *  socket.js sends it direct to the host and stamps our playerId. */
    pickSeat(i, seat) {
      if (!this.tonight) return;
      const targets = new Array(this.tonight.slots).fill(null);
      targets[i] = Number.isInteger(seat) ? seat : -1;
      this.$store.commit("night/playerAction", {
        roleId: this.tonight.role.id,
        targets,
      });
    },
    typeText(value) {
      this.textDraft = value;
      clearTimeout(this._textTimer);
      this._textTimer = setTimeout(this.flushText, 400);
    },
    flushText() {
      clearTimeout(this._textTimer);
      if (this.textDraft === null || !this.tonight) return;
      this.$store.commit("night/playerAction", {
        roleId: this.tonight.role.id,
        text: this.textDraft,
      });
      // the draft stays on screen until the host's echo carries the same
      // words back — see the watcher below
    },
  },
  watch: {
    /** FT-1005: hand the free box back to the echo once it caught up. */
    tonightRow(row) {
      if (
        this.textDraft !== null &&
        row &&
        (row.playerText || "") === this.textDraft.slice(0, 280)
      ) {
        this.textDraft = null;
      }
    },
  },
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
