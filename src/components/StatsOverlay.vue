<template>
  <!-- Golem fork (FT-1146): THE RECORDS PAGE — what has happened across every
       town, on its own full-width surface.

       THIS FILE IS THE OLD TOWN-RECORDS OVERLAY, GROWN UP. It was a centred
       panel with a "this town / All towns" toggle, reached from the strip's
       quill; FT-1010 folded that door into the Chronicles drawer and the panel
       has been mounted-but-unreachable ever since (nothing has emitted
       `records` since — see Menu.vue's note). Rather than stand a SECOND stats
       surface beside an orphaned one — which is exactly how the drawer came to
       be carrying a whole-platform scope inside one game's chat — the orphan
       IS the page, and the drawer's platform scope stands down into it.

       PLATFORM SCOPE ONLY. The per-town record lives in the Chronicles drawer,
       where a town's own story already is. This surface never narrows to one
       town; `townId` only marks which row of the ledger is the town you are
       standing in.

       END-OF-GAME AND SETUP FACTS ONLY (user's own words): who won, on which
       script, how many sat down, how long it ran, the roster and the two board
       portraits. Messages and events do not follow a game across towns and are
       not offered here. -->
  <div class="records-page">
    <!-- FT-1162 (user call): the surface is THE CHRONICLE, and its title is
         CENTRED and wears the entry doors' own treatment — PiratesBay for the
         word (which this h2 already used) plus the blood drop-cap the Host /
         Join / Scripts doors put on theirs, through KeyCap, the app's one
         drop-cap component. The cap is the letter of its hotkey, exactly as
         the doors' caps are, so the title says how to reach it.

         The head is a THREE-COLUMN GRID, not a flex row, so the title sits on
         the PAGE's centre line and stays there whether or not the back button
         is standing. Back holds the left column on its own (user call: "the
         back button should be on the far left, not on the right" — it shared
         the right corner with the close ×, which put "step back one level"
         and "leave the page entirely" side by side); the close × holds the
         right. -->
    <header class="rp-head">
      <button class="rp-back" v-if="pick" @click="closePick">
        <font-awesome-icon icon="arrow-left" /> The Chronicle
      </button>
      <div class="rp-title">
        <!-- "C" + "hronicle" is ONE WORD split across two nodes, flush
             together — the entry doors' idiom and RoleDrawer's "G"+"rimoire"
             after it, not a badge beside a title. The newline before the span
             is a whitespace-only node and Vue's `condense` drops it, so the
             cap and its word stay joined. -->
        <h2>
          <span class="rp-cap"><KeyCap letter="C" /></span>hronicle
        </h2>
        <p class="rp-sub">
          <template v-if="pick">one game's record</template>
          <template v-else>every town on the platform</template>
        </p>
      </div>
      <CloseX class="rp-close" @click.native="$emit('close')" />
    </header>

    <!-- ── ONE GAME'S RECORD ────────────────────────────────────────────
         Opened from a ledger row (or handed in by the Chronicles drawer's
         boards link). Self-sufficient: the record is fetched by id, so it
         renders whether or not the ledger behind it holds that game. -->
    <div class="rp-body" v-blood-scroll v-if="pick">
      <p class="rp-state" v-if="pick.loading">Consulting the archives…</p>
      <p class="rp-state" v-else-if="!pick.game">
        That record could not be read.
      </p>
      <template v-else>
        <p class="rp-gamehead">
          <!-- FT-1162 (user call): "the script should use the icon of the
               script not just its name." The mark comes from `scriptArtFor`
               (golem/editionArt), which reads the only script handle a record
               actually carries — its display NAME — back to an edition id and
               so to the same art every script picker in the app shows. A name
               it cannot place (a custom script, a script since renamed) gets
               the stock custom mark; the art is only ever an addition, the
               NAME is what identifies the script and it always prints. -->
          <span class="rp-gscript"
            ><img class="rp-gicon" :src="scriptArt(pick.game)" alt="" />{{
              pick.game.scriptName
            }}</span
          >
          <span class="rp-win" :class="pick.game.winningTeam">{{
            pick.game.winningTeam === "good" ? "Good wins" : "Evil wins"
          }}</span>
          <span class="rp-gmeta">{{ pick.game.townId }}</span>
          <span class="rp-gmeta">{{
            whenLabel(pick.game.startedAt || pick.game.endedAt)
          }}</span>
          <span class="rp-gmeta">{{ pick.game.playerCount }} seats</span>
          <!-- FT-1162 (user call): "the most important info besides the script
               name, who won, and number of seats is number of days." IT IS NOT
               RECORDED YET — a game row carries `startedAt` and `endedAt` and
               nothing about its length in days, so every game recorded before
               the capture lands has no answer. When there is no answer this
               renders NOTHING: no zero, no dash, no "unknown". A day count is
               a fact about how the game went and inventing one would be worse
               than the gap. -->
          <span class="rp-gmeta" v-if="dayLabel(pick.game)">{{
            dayLabel(pick.game)
          }}</span>
          <span class="rp-gmeta">{{ lengthLabel(lengthOf(pick.game)) }}</span>
        </p>

        <!-- THE BOARDS AT THEIR TRUE SIZE. This is the whole reason the page
             exists as a page: a 230px thumbnail in a 460px drawer cannot show
             a 15-seat ring, and the portrait already has a large variant
             (ChroniclesPortrait's `large` — 68px coins, 16px names) that had
             nowhere wide enough to stand. Here it does. -->
        <p class="rp-state" v-if="boards.loading">Fetching the boards…</p>
        <div
          class="rp-boards"
          v-else-if="boards.start || boards.day1 || boards.end"
        >
          <!-- Each ring gets its OWN block box. ChroniclesPortrait's root is a
               `display: contents` wrapper, so the figure itself is the layout
               box and a parent's scoped CSS cannot reach it — the box around
               it is how this page decides that two rings wrap onto separate
               rows rather than shrinking to share one. -->
          <div class="rp-board" v-if="boards.start">
            <ChroniclesPortrait
              :board="boards.start"
              label="The game begins"
              large
            />
          </div>
          <div class="rp-board" v-if="boards.day1">
            <ChroniclesPortrait :board="boards.day1" label="Day 1" large />
          </div>
          <div class="rp-board" v-if="boards.end">
            <ChroniclesPortrait :board="boards.end" label="The end" large />
          </div>
        </div>
        <p class="rp-state" v-else>No boards were kept for this game.</p>

        <table class="rp-table rp-roster" v-if="pick.game.seats">
          <thead>
            <tr>
              <th>Seat</th>
              <th>Player</th>
              <th>Role</th>
              <th>Kind</th>
              <th>Side</th>
              <th>Fate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="seat in pick.game.seats" :key="seat.seatNo">
              <td>{{ seat.seatNo }}</td>
              <td>{{ seat.playerName }}</td>
              <td>{{ roleNameOf(seat.roleIdFinal) }}</td>
              <td>{{ seat.roleType }}</td>
              <td :class="seat.teamAtEnd">{{ seat.teamAtEnd }}</td>
              <td :class="seat.survived ? 'lived' : 'died'">
                {{ seat.survived ? "lived" : "died" }}
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>

    <!-- ── THE LANDING VIEW ─────────────────────────────────────────────── -->
    <div class="rp-body" v-blood-scroll v-else>
      <section class="rp-band">
        <h3>Every town together</h3>
        <p class="rp-state" v-if="loading">Consulting the archives…</p>
        <p class="rp-state" v-else-if="error">
          Chronicle unavailable — server unreachable
        </p>
        <p class="rp-state" v-else-if="!stats || !stats.games">
          No games recorded yet
        </p>
        <template v-else>
          <ul class="rp-figures">
            <li>
              <b>{{ stats.games }}</b
              ><span>{{ stats.games === 1 ? "game" : "games" }}</span>
            </li>
            <li class="good">
              <b>{{ stats.byTeam.good }}</b
              ><span>good wins</span>
            </li>
            <li class="evil">
              <b>{{ stats.byTeam.evil }}</b
              ><span>evil wins</span>
            </li>
            <li>
              <b>{{ goodShare }}%</b><span>good win rate</span>
            </li>
          </ul>
          <div class="rp-columns">
            <div class="rp-col" v-if="stats.byScript && stats.byScript.length">
              <h4>Scripts</h4>
              <table class="rp-table">
                <thead>
                  <tr>
                    <th>Script</th>
                    <th>Games</th>
                    <th>Good</th>
                    <th>Evil</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in stats.byScript" :key="row.scriptName">
                    <td>{{ row.scriptName }}</td>
                    <td>{{ row.games }}</td>
                    <td class="good">{{ row.goodWins }}</td>
                    <td class="evil">{{ row.games - row.goodWins }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- FT-1161 (user): "the players section of this is bad, we
                 shouldn't be publically displaying player info. Users should
                 get access to the player info of towns they have been in,
                 but not all across the entire platform."

                 Right, and it is the one thing on this page that names a
                 PERSON. Every other figure here is about games, scripts and
                 roles — facts about the play. A leaderboard of who won what,
                 visible to anyone who opens the site, is a different kind of
                 thing entirely, and it went out the moment it was named.

                 Stood down rather than removed: the same table, scoped to the
                 towns a viewer has actually been in, is a surface the user
                 does want — so the markup and its `topPlayers` computed stay
                 here waiting for that scope rather than being rebuilt later
                 from memory. -->
            <div class="rp-col" v-if="false && topPlayers.length">
              <h4>Players</h4>
              <table class="rp-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Games</th>
                    <th>Wins</th>
                    <th title="Games survived to the end">Lived</th>
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
            </div>
          </div>
        </template>
      </section>

      <!-- THE PER-GAME LEDGER. Deliberately its own band with its own scope
           line: the numbers above are every game in the store, these rows are
           every game from the towns THIS BROWSER has been in — because the
           games list is a per-town endpoint and no endpoint lists the towns
           that exist (golem/records' own note). The two claims are different
           and the page says so rather than letting the heading imply one. -->
      <section class="rp-band">
        <h3>The games</h3>
        <p class="rp-scope">{{ ledgerScope }}</p>
        <p class="rp-state" v-if="ledger.loading">Reading the ledgers…</p>
        <p class="rp-state" v-else-if="!ledger.games.length">
          No recorded games in the towns this browser has been in.
        </p>
        <template v-else>
          <table class="rp-table rp-ledger">
            <thead>
              <tr>
                <th>Ended</th>
                <th>Town</th>
                <th>Script</th>
                <th>Seats</th>
                <th>Ran</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="game in ledger.games"
                :key="game.id"
                class="jump"
                :class="{ here: game.townId === townId }"
                :data-record-row="game.id"
                title="Open this game's record"
                @click="openPick(game.id)"
              >
                <td>{{ whenLabel(game.endedAt) }}</td>
                <td>{{ game.townId }}</td>
                <td>{{ game.scriptName }}</td>
                <td>{{ game.playerCount }}</td>
                <td>{{ lengthLabel(lengthOf(game)) }}</td>
                <td class="rp-win" :class="game.winningTeam">
                  {{ game.winningTeam === "good" ? "Good" : "Evil" }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </section>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import CloseX from "./CloseX";
import ChroniclesPortrait from "./ChroniclesPortrait";
// FT-1162: the app's one drop-cap component — the same one the entry doors
// and the grimoire drawer's own title render theirs through, so this C and
// the Keys panel's C are pixel-identical and move together if the font
// picker ever changes families.
import KeyCap from "./KeyCap";
import { scriptArtFor } from "../golem/editionArt";
import { platformStats, gameRecord } from "../golem/stats";
import { catchUp } from "../golem/chat";
import { boardsOf, logGameIdOf } from "../golem/chronicles";
import {
  knownTownIds,
  crossTownGames,
  ledgerSummary,
  lengthOf,
  whenLabel,
  lengthLabel,
} from "../golem/records";

const TOP_PLAYERS = 15;

export default {
  name: "StatsOverlay",
  components: { CloseX, ChroniclesPortrait, KeyCap },
  props: {
    /** The town this browser is standing in, or "" on the entry screen.
     *  It NARROWS NOTHING — the page is platform-scoped by definition; it
     *  only marks that town's rows in the ledger. */
    townId: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      /* FT-1146: `scope` ("town" | "platform") STOOD DOWN, not removed. This
       * surface answers one question — every town together — and the per-town
       * ledger it used to toggle to now lives in the Chronicles drawer, where
       * a town's own story is. The field stays so the shape of what this
       * panel used to be is still readable here. */
      scope: "platform",
      loading: true,
      error: false,
      stats: null,
      /** The merged per-game ledger — see golem/records for what it can and
       *  cannot cover. */
      ledger: { loading: true, games: [], summary: null },
      /** The opened record: {id, loading, game} or null for the landing. */
      pick: null,
      /** That record's board portraits, read out of its town's log. */
      boards: { loading: false, start: null, day1: null, end: null },
    };
  },
  computed: {
    ...mapState(["recordsPick"]),
    /** The table shows the platform's regulars, not everyone who ever sat. */
    topPlayers() {
      const players = (this.stats && this.stats.players) || [];
      return [...players]
        .sort((a, b) => b.games - a.games || b.wins - a.wins)
        .slice(0, TOP_PLAYERS);
    },
    goodShare() {
      if (!this.stats || !this.stats.games) return 0;
      return Math.round((this.stats.byTeam.good / this.stats.games) * 100);
    },
    /** The ledger's honest one-liner: how much it covers, and how typical a
     *  game in it looks. */
    ledgerScope() {
      const s = this.ledger.summary;
      if (!s || !s.games) {
        return "Every game from the towns this browser has been in.";
      }
      const parts = [
        s.games + (s.games === 1 ? " game" : " games"),
        "across " + s.towns + (s.towns === 1 ? " town" : " towns"),
        "this browser has been in",
      ];
      const typical = [];
      if (s.seats !== null) typical.push(s.seats + " seats");
      if (s.minutes !== null) typical.push(lengthLabel(s.minutes));
      return (
        parts.join(" ") +
        (typical.length ? " · typically " + typical.join(", ") : "") +
        "."
      );
    },
  },
  created() {
    this.load();
    this.loadLedger();
    // FT-1146: the Chronicles drawer's boards line hands a game in — the page
    // opens straight onto that record rather than its landing view.
    if (this.recordsPick) {
      this.openPick(this.recordsPick);
      this.$store.commit("setRecordsPick", null);
    }
  },
  mounted() {
    document.addEventListener("keyup", this.onKeyup);
  },
  destroyed() {
    document.removeEventListener("keyup", this.onKeyup);
  },
  methods: {
    lengthOf,
    whenLabel,
    lengthLabel,
    /** FT-1162: the script's own mark, from the only handle a record carries
     *  (its display name). Always a bundled image — see scriptArtFor. */
    scriptArt(game) {
      return scriptArtFor(game && game.scriptName);
    },
    /**
     * FT-1162: how many DAYS the game ran, or null when the record does not
     * say — which today is every record, because nothing captures it yet.
     * Null means the caller renders nothing at all: a missing day count is a
     * gap in the record, and a "0" or a "—" would read as a fact about the
     * game rather than a fact about the ledger.
     */
    dayLabel(game) {
      const days = game && game.dayCount;
      if (typeof days !== "number" || !Number.isFinite(days) || days <= 0) {
        return null;
      }
      return days === 1 ? "1 day" : days + " days";
    },
    /** Escape steps BACK one level — out of a record to the landing, out of
     *  the landing to wherever the reader came from. A single key that closed
     *  the whole page from inside a record would throw away the click that
     *  opened it. */
    onKeyup(e) {
      if (e.key !== "Escape") return;
      if (this.pick) this.closePick();
      else this.$emit("close");
    },
    load() {
      this.loading = true;
      this.error = false;
      this.stats = null;
      platformStats()
        .then((stats) => {
          this.stats = stats;
          this.loading = false;
        })
        .catch(() => {
          this.error = true;
          this.loading = false;
        });
    },
    /** The ledger is its own read and its own failure: the aggregates above
     *  must still render when every town read misses. */
    loadLedger() {
      this.ledger = { loading: true, games: [], summary: null };
      crossTownGames(knownTownIds())
        .then((games) => {
          this.ledger = {
            loading: false,
            games,
            summary: ledgerSummary(games),
          };
        })
        .catch(() => {
          this.ledger = { loading: false, games: [], summary: null };
        });
    },
    openPick(id) {
      if (!id) return;
      this.pick = { id, loading: true, game: null };
      this.boards = { loading: true, start: null, day1: null, end: null };
      gameRecord(id)
        .then((game) => {
          if (!this.pick || this.pick.id !== id) return;
          this.pick = { id, loading: false, game };
          this.loadBoards(game);
        })
        .catch(() => {
          if (!this.pick || this.pick.id !== id) return;
          this.pick = { id, loading: false, game: null };
          this.boards = { loading: false, start: null, day1: null, end: null };
        });
    },
    closePick() {
      this.pick = null;
      this.boards = { loading: false, start: null, day1: null, end: null };
    },
    /**
     * A game's two portraits. They are NOT part of the games record — they
     * are `board` event rows in the town's own message log (golem/chronicles),
     * and the bridge between the two sides is the deal instant: the log's
     * game id is `g-<town>-<ms>` and the record's `startedAt` IS that instant.
     * A record with no start has no bridge and therefore no boards, honestly.
     */
    loadBoards(game) {
      const logGameId = logGameIdOf(game.townId, game.startedAt);
      if (!logGameId) {
        this.boards = { loading: false, start: null, day1: null, end: null };
        return;
      }
      const rows = [];
      catchUp(game.townId, 0, (page) => rows.push(...page))
        .then(() => {
          if (!this.pick || !this.pick.game || this.pick.game.id !== game.id) {
            return;
          }
          this.boards = { loading: false, ...boardsOf(rows, logGameId) };
        })
        .catch(() => {
          this.boards = { loading: false, start: null, day1: null, end: null };
        });
    },
    /** A role id's display name — the loaded edition first, the full official
     *  library second, the raw id when neither knows it (a custom role). */
    roleNameOf(id) {
      if (!id) return "—";
      const role =
        this.$store.state.roles.get(id) ||
        this.$store.getters.rolesJSONbyId.get(id);
      return (role && role.name) || id;
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
@import "../controls.scss";

// THE PAGE. Not a dialog on top of the town — a surface that takes the whole
// window, because the thing it exists to show (two 15-seat board rings side by
// side) does not fit in anything smaller. Ranked above the drawers (55) and
// the portrait lightbox's own veil (91) is above this, as it should be.
.records-page {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  // OPAQUE, unlike every overlay in this app. Those are panels raised OVER the
  // town and want it visible behind them; this is a page you go to, and the
  // clock face reading through a ring of role coins was the drawer's own
  // problem (ChroniclesPortrait's opaque plate exists for the same reason).
  background: #0a0706;
  color: #d8cdb4;
  text-align: left;
}

// FT-1162: THREE COLUMNS, not a flex row. The two flanks are equal `1fr`, so
// the middle column — the title — lands on the PAGE's centre line and holds
// it whether or not the back button is standing (it is `v-if="pick"`). A flex
// row could only centre the title against whatever happened to be beside it,
// which is exactly the drift that made "centred" mean two different positions
// on the landing and inside a record.
.rp-head {
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  padding: 14px 22px;
  border-bottom: 1px solid rgba(216, 205, 180, 0.18);
  background: rgba(0, 0, 0, 0.4);
}

// The title STACKS over its subtitle rather than sitting beside it. Side by
// side, the pair is what centres and the WORD lands ~80px left of the page's
// centre line — which is not what "centre the title" means to anyone looking
// at it. Stacked, the word itself is on the centre line and the subtitle sits
// under it, centred too.
.rp-title {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;

  h2 {
    // The ENTRY DOORS' face. PiratesBay was already the h2's font — what the
    // doors have that this did not is the blood drop-cap, which KeyCap brings
    // (Bloody, blood red, black-outlined, per-letter baseline).
    font-family: PiratesBay, sans-serif;
    font-size: 30px;
    line-height: 1;
    margin: 0;
    white-space: nowrap;

    // The same 2px optical nudge the doors give their own drop-cap
    // (Intro.vue's `.doors .key`) and RoleDrawer's `.rd-cap` after it, and
    // nothing more — KeyCap's `.key` already carries everything else. This
    // only keeps "hronicle" from crowding the C.
    .rp-cap {
      margin-right: 2px;
    }
  }
}

.rp-sub {
  margin: 0;
  opacity: 0.55;
  font-size: 14px;
}

// FT-1162: the FAR LEFT of the head, on its own, where nothing else lives —
// "step back one level" no longer shares a corner with "leave the page".
.rp-back {
  grid-column: 1;
  justify-self: start;
  @include control-plate;
  font-family: inherit;
  font-size: 13px;
  color: #d8cdb4;
  padding: 4px 12px;
  cursor: pointer;

  &:hover {
    color: #fff;
    @include control-plate-hover;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
}

.rp-close {
  grid-column: 3;
  justify-self: end;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
}

.rp-body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 18px 22px 40px;
}

.rp-band + .rp-band {
  margin-top: 34px;
  padding-top: 22px;
  border-top: 1px solid rgba(216, 205, 180, 0.14);
}

// The app's global type centres headings; a page of left-aligned tables wants
// its band titles standing at the same left edge as the columns under them.
.rp-band > h3 {
  font-family: PiratesBay, sans-serif;
  font-size: 22px;
  margin: 0 0 4px;
  opacity: 0.9;
  text-align: left;
}

h4 {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.5;
  margin: 0 0 6px;
  font-weight: normal;
  text-align: left;
}

.rp-scope,
.rp-state {
  margin: 0 0 10px;
  opacity: 0.55;
  font-size: 13px;
}

// THE HEADLINE NUMBERS — the one thing a reader should be able to take in
// without reading anything.
.rp-figures {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 34px;
  margin: 12px 0 22px;
  padding: 0;

  li {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }
  b {
    font-family: PiratesBay, sans-serif;
    font-size: 40px;
    font-weight: normal;
    font-variant-numeric: tabular-nums;
  }
  span {
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.5;
  }
  .good b {
    color: #6fa8ff;
  }
  .evil b {
    color: #d24a3a;
  }
}

// The width the page bought: two tables standing beside each other instead of
// stacked down a 460px drawer.
.rp-columns {
  display: flex;
  flex-wrap: wrap;
  gap: 34px;
  align-items: flex-start;
}
// Wide, but not ARBITRARILY wide: on a 1920 window an uncapped column puts
// "Trouble Brewing" and its count 600px apart, which is harder to read than
// the drawer was. The width buys two tables side by side, not stretched ones.
.rp-col {
  flex: 1 1 320px;
  min-width: 0;
  max-width: 620px;
  overflow-x: auto;
}

.rp-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 14px;

  th {
    opacity: 0.5;
    font-weight: normal;
    text-align: left;
    padding: 3px 14px 5px 0;
    border-bottom: 1px solid rgba(216, 205, 180, 0.2);
    white-space: nowrap;
  }
  td {
    text-align: left;
    padding: 4px 14px 4px 0;
    font-variant-numeric: tabular-nums;
  }
  tbody tr + tr td {
    border-top: 1px solid rgba(216, 205, 180, 0.08);
  }
  th:not(:first-child),
  td:not(:first-child) {
    text-align: right;
    padding-right: 0;
    padding-left: 14px;
  }
}

.rp-ledger {
  max-width: 1180px;

  th:nth-child(2),
  th:nth-child(3),
  td:nth-child(2),
  td:nth-child(3) {
    text-align: left;
    padding-left: 0;
    padding-right: 14px;
  }

  tbody tr.jump {
    cursor: pointer;
    &:hover td {
      background: rgba(216, 205, 180, 0.09);
      color: #fff;
    }
  }
  // the town you are standing in, marked in its own ledger
  tbody tr.here td:nth-child(2) {
    color: #e8b23a;
  }
}

.rp-roster {
  margin-top: 26px;
  max-width: 780px;

  th:nth-child(2),
  th:nth-child(3),
  th:nth-child(4),
  td:nth-child(2),
  td:nth-child(3),
  td:nth-child(4) {
    text-align: left;
    padding-left: 0;
    padding-right: 14px;
  }
}

.good {
  color: #6fa8ff;
}
.evil {
  color: #d24a3a;
}
.lived {
  color: #8fbf7a;
}
.died {
  opacity: 0.5;
  text-decoration: line-through;
}

.rp-win {
  &.good {
    color: #6fa8ff;
  }
  &.evil {
    color: #d24a3a;
  }
}

.rp-gamehead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 18px;
  margin: 0 0 18px;
}
.rp-gscript {
  font-family: PiratesBay, sans-serif;
  font-size: 24px;
  // FT-1162: the mark rides WITH the name as one object, so the pair wraps
  // together and the icon can never be orphaned onto its own line.
  display: inline-flex;
  align-items: center;
  gap: 8px;

  // Sized in `em` off the script name beside it — the same way HostTools
  // sizes its own town-script mark — so the mark tracks the name if this
  // heading is ever resized. `contain` because the edition art is not square
  // and must not be stretched to pretend it is.
  .rp-gicon {
    width: 1.4em;
    height: 1.4em;
    object-fit: contain;
    flex: 0 0 auto;
  }
}
.rp-gmeta {
  font-size: 13px;
  opacity: 0.55;
}

// TWO RINGS, SIDE BY SIDE, AT THE PORTRAIT'S OWN LARGE SIZE. `.cp-large`
// caps itself at min(640px, 86vw); the gap and the wrap are all this needs to
// add. On a narrow window they stack rather than shrink — a shrunk ring is
// the drawer's problem all over again.
.rp-boards {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}
.rp-board {
  flex: 1 1 420px;
  min-width: 0;
  max-width: 640px;
}

@media (max-width: 700px) {
  .rp-head {
    padding: 10px 14px;
  }
  .rp-body {
    padding: 14px 14px 30px;
  }
  .rp-figures b {
    font-size: 30px;
  }
}
</style>
