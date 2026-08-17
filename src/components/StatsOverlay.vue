<template>
  <!-- Golem fork (FT-850): TOWN RECORDS — the recorded-games ledger for the
       current town, with a toggle out to every town on the platform. Read-only
       and best-effort: an unreachable server is an honest one-liner, never a
       broken overlay. -->
  <div class="stats-overlay" @click="$emit('close')">
    <div class="panel" @click.stop>
      <h3>Town records</h3>
      <div class="scope">
        <span :class="{ active: scope === 'town' }" @click="setScope('town')">
          {{ townId }}
        </span>
        <span
          :class="{ active: scope === 'platform' }"
          @click="setScope('platform')"
        >
          All towns
        </span>
      </div>

      <div class="state" v-if="loading">Consulting the archives…</div>
      <div class="state" v-else-if="error">
        Records unavailable — server unreachable
      </div>
      <div class="state" v-else-if="!stats || !stats.games">
        No games recorded yet
      </div>

      <template v-else>
        <div class="summary">
          <b>{{ stats.games }}</b>
          {{ stats.games === 1 ? "game" : "games" }} · Good
          {{ stats.byTeam.good }} · Evil {{ stats.byTeam.evil }}
        </div>
        <table v-if="stats.byScript && stats.byScript.length">
          <thead>
            <tr>
              <th>Script</th>
              <th>Games</th>
              <th>Good wins</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in stats.byScript" :key="row.scriptName">
              <td>{{ row.scriptName }}</td>
              <td>{{ row.games }}</td>
              <td>{{ row.goodWins }}</td>
            </tr>
          </tbody>
        </table>
        <table v-if="topPlayers.length">
          <thead>
            <tr>
              <th>Player</th>
              <th>Games</th>
              <th>Wins</th>
              <th>Survived</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in topPlayers" :key="row.playerName">
              <td>{{ row.playerName }}</td>
              <td>{{ row.games }}</td>
              <td>{{ row.wins }}</td>
              <td>{{ row.survivals }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>
  </div>
</template>

<script>
import { townStats, platformStats } from "../golem/stats";

const TOP_PLAYERS = 10;

export default {
  props: {
    townId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      scope: "town",
      loading: true,
      error: false,
      stats: null
    };
  },
  computed: {
    /** The table shows the town's regulars, not everyone who ever sat down. */
    topPlayers() {
      const players = (this.stats && this.stats.players) || [];
      return [...players]
        .sort((a, b) => b.games - a.games || b.wins - a.wins)
        .slice(0, TOP_PLAYERS);
    }
  },
  created() {
    this.load();
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
    setScope(scope) {
      if (this.scope === scope) return;
      this.scope = scope;
      this.load();
    },
    load() {
      this.loading = true;
      this.error = false;
      this.stats = null;
      const request =
        this.scope === "town" ? townStats(this.townId) : platformStats();
      request
        .then(stats => {
          this.stats = stats;
          this.loading = false;
        })
        .catch(() => {
          this.error = true;
          this.loading = false;
        });
    }
  }
};
</script>

<style scoped lang="scss">
.stats-overlay {
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
    padding: 15px 25px;
    max-height: 80%;
    max-width: 80%;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.75);
    border: 3px solid black;
    border-radius: 10px;
    box-shadow: 0 0 10px black;

    h3 {
      margin-bottom: 8px;
    }
  }

  .scope {
    display: flex;
    justify-content: center;
    gap: 14px;
    margin-bottom: 10px;
    font-size: 90%;

    span {
      cursor: pointer;
      opacity: 0.5;
      padding-bottom: 2px;

      &:hover {
        color: red;
        opacity: 1;
      }
      &.active {
        opacity: 1;
        border-bottom: 2px solid #c00;
      }
    }
  }

  .state {
    opacity: 0.7;
    padding: 10px 0;
  }

  .summary {
    margin-bottom: 8px;

    b {
      color: #c00;
    }
  }

  table {
    margin: 0 auto 10px;
    border-collapse: collapse;
    font-size: 85%;

    th {
      opacity: 0.6;
      font-weight: normal;
      text-align: left;
      padding: 2px 12px 2px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
    td {
      text-align: left;
      padding: 3px 12px 3px 0;
    }
    th:not(:first-child),
    td:not(:first-child) {
      text-align: right;
      padding-right: 0;
      padding-left: 12px;
    }
  }
}
</style>
