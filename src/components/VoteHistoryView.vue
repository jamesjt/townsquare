<template>
  <!-- Golem fork (FT-858): THE vote-history view — one component, two
       surfaces. The drawer (VoteDrawer) renders it as its body; the old
       overlay (VoteHistoryModal) renders the same markup inside a Modal.
       A change here shows up in both places, which is the whole point of
       the extraction. -->
  <div class="vote-history-view" :class="{ narrow }">
    <div class="vh-options">
      <!-- the storyteller's controls: who may read the log, and the wipe -->
      <template v-if="!session.isSpectator">
        <span class="vh-option" @click="setRecordVoteHistory">
          <font-awesome-icon
            :icon="[
              'fas',
              session.isVoteHistoryAllowed ? 'check-square' : 'square'
            ]"
          />
          Accessible to players
        </span>
        <span class="vh-option" @click="clearVoteHistory">
          <font-awesome-icon icon="trash-alt" />
          Clear for everyone
        </span>
      </template>
      <!-- a player only ever clears their own copy (this was the modal's
           floating trash icon; in a shared body it belongs on the row) -->
      <span class="vh-option" v-else @click="clearVoteHistory">
        <font-awesome-icon icon="trash-alt" />
        Clear
      </span>
    </div>
    <div class="vh-empty" v-if="!session.voteHistory.length">
      No nominations yet.
    </div>
    <div class="vh-scroll" v-blood-scroll v-else>
      <table class="vh-table">
        <thead>
          <tr>
            <td>Time</td>
            <td>Nominator</td>
            <td>Nominee</td>
            <td>Type</td>
            <td>Votes</td>
            <td>Majority</td>
            <td>
              <font-awesome-icon icon="user-friends" />
              Voters
            </td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(vote, index) in session.voteHistory" :key="index">
            <td class="vh-time">{{ clock(vote.timestamp) }}</td>
            <td class="vh-nominator" data-label="Nominator">
              {{ vote.nominator }}
            </td>
            <td class="vh-nominee" data-label="Nominee">{{ vote.nominee }}</td>
            <td class="vh-type">{{ vote.type }}</td>
            <td class="vh-votes" data-label="Votes">
              <!-- FT-1242: FA `hand-paper` stood down — the raised hand a
                   cast vote wears on a seat (ui-vote-yes.png). -->
              {{ vote.votes.length }}
              <img class="vh-hand" :src="uiVoteYes" alt="votes" />
            </td>
            <td class="vh-majority" data-label="Majority">
              {{ vote.majority }}
              <font-awesome-icon
                :icon="[
                  'fas',
                  vote.votes.length >= vote.majority ? 'check-square' : 'square'
                ]"
              />
            </td>
            <td class="vh-voters" data-label="Voters">
              {{ vote.votes.join(", ") }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
// FT-1242: the votes column's raised hand — the seat's own cast-vote art.
import uiVoteYes from "../assets/ui-vote-yes.png";

export default {
  name: "VoteHistoryView",
  computed: {
    ...mapState(["session"])
  },
  data() {
    return {
      uiVoteYes,
      // set by measure() — the seven-column table becomes a stack of cards
      // once the surface is too narrow to hold it (a 300px drawer)
      narrow: false
    };
  },
  mounted() {
    this.measure();
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(() => this.measure());
      this.ro.observe(this.$el);
    }
  },
  beforeDestroy() {
    if (this.ro) this.ro.disconnect();
  },
  methods: {
    /**
     * The view reflows below ~780px: the header row leaves and each vote
     * becomes a card — time and type on one line, nominator → nominee on the
     * next, the tallies under that, the voters wrapping across the bottom.
     *
     * The threshold is high because seven columns need real room: measured in
     * the drawer, anything under ~780 strangles the Voters column down to its
     * longest word and every name takes its own line. So the drawer is cards
     * unless it is dragged out very wide; a desktop modal keeps the table.
     */
    measure() {
      const w = this.$el && this.$el.clientWidth;
      if (w) this.narrow = w < 780;
    },
    /** HH:MM. A synced entry arrives as an ISO string, not a Date. */
    clock(timestamp) {
      const t = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(t.getTime())) return "";
      return (
        t
          .getHours()
          .toString()
          .padStart(2, "0") +
        ":" +
        t
          .getMinutes()
          .toString()
          .padStart(2, "0")
      );
    },
    clearVoteHistory() {
      this.$store.commit("session/clearVoteHistory");
    },
    setRecordVoteHistory() {
      this.$store.commit(
        "session/setVoteHistoryAllowed",
        !this.session.isVoteHistoryAllowed
      );
    }
  }
};
</script>

<style lang="scss" scoped>
@import "../vars.scss";

.vote-history-view {
  display: flex;
  flex-direction: column;
  min-height: 0;
  text-align: left;
}

.vh-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 4px 20px;
  margin-bottom: 6px;
}

.vh-option {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: white;
  text-decoration: none;
  cursor: pointer;
  &:hover {
    color: red;
  }
}

.vh-empty {
  color: rgba(255, 255, 255, 0.6);
  padding: 30px 10px;
  text-align: center;
}

.vh-scroll {
  overflow-y: auto;
  flex-grow: 1;
  min-height: 0;
}

.vh-table {
  border-spacing: 10px 0;
  margin-left: auto;
  margin-right: auto;
}

thead td {
  font-weight: bold;
  border-bottom: 1px solid white;
  text-align: center;
  padding: 0 3px;
}

tbody {
  .vh-nominator {
    color: $townsfolk;
  }
  .vh-nominee {
    color: $demon;
  }
  .vh-votes,
  .vh-majority {
    text-align: center;
  }

  /* FT-1242: the votes column's baked hand, inline with its number. */
  .vh-hand {
    width: 12px;
    height: 12px;
    object-fit: contain;
    vertical-align: -1px;
  }
}

// NARROW (the drawer dragged in, or a phone): the table stops being a table.
// Each vote is a card — the header row is redundant once every cell carries
// its own label, and the voters list gets a full line to wrap in instead of
// clipping. Two zero-height flex breaks (::before / ::after, ordered between
// the cells) split the card into its three lines.
.vote-history-view.narrow {
  .vh-table {
    display: block;
    width: 100%;
    border-spacing: 0;
  }
  thead {
    display: none;
  }
  tbody {
    display: block;
  }
  tbody tr {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 8px;
    margin-bottom: 6px;
    padding: 5px 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    &::before,
    &::after {
      content: "";
      flex-basis: 100%;
      height: 0;
    }
    &::before {
      order: 15;
    }
    &::after {
      order: 25;
    }
  }
  tbody td {
    display: block;
    padding: 0;
    text-align: left;
    min-width: 0;
  }
  // line 1 — when, and what kind
  .vh-time {
    order: 10;
    font-size: 12px;
    opacity: 0.7;
  }
  .vh-type {
    order: 11;
    margin-left: auto;
    font-size: 12px;
    opacity: 0.8;
  }
  // line 2 — who put up whom
  .vh-nominator {
    order: 20;
    font-weight: bold;
  }
  .vh-nominee {
    order: 21;
    font-weight: bold;
    &::before {
      content: "→ ";
      color: rgba(255, 255, 255, 0.5);
      font-weight: normal;
    }
  }
  // line 3 — the tally
  .vh-votes {
    order: 30;
  }
  .vh-majority {
    order: 31;
  }
  // line 4 — everyone who put a hand up, wrapping
  .vh-voters {
    order: 40;
    flex-basis: 100%;
    white-space: normal;
    line-height: 1.3;
    font-size: 13px;
    opacity: 0.85;
  }
  td[data-label]:not(.vh-nominator):not(.vh-nominee)::before {
    content: attr(data-label) " ";
    font-size: 11px;
    opacity: 0.55;
  }
}
</style>
