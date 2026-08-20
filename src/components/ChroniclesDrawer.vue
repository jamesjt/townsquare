<template>
  <!-- Golem fork (FT-1010): CHRONICLES — the town's whole story as ONE
       surface (user decision, 2026-08-20). Three surfaces merged here:

         · the town CHAT (FT-965's ChatDrawer) — the talk and the composer
         · the CHRONICLE (FT-886's ChronicleDrawer) — the game's events,
           which are now ROWS in the same persistent log the talk lives in
           (host-authored system rows wearing golem/chronicles' EV1 envelope)
         · the TOWN RECORDS (FT-850's StatsOverlay) — the finished-games
           aggregates, standing over the stream as its summary band

       ONE STREAM, CHAPTERED PER GAME. The log is the town's permanent room
       (a game is a filter over it, never a boundary that resets it), so the
       stream arrives already ordered by the store's own seq: each game is a
       consecutive run of rows sharing a gameId, rendered as a COLLAPSIBLE
       section, with the between-games talk standing between the sections.
       Oldest at the top, newest in view on open — the way the chat log has
       always read.

       TRANSPARENCY: a FINISHED game is fully public, whispers included
       (user decision — it overruled a saw-it-live-only rule). What this
       component renders was already decided at ingest (chatIngest + canSee):
       live-game whispers reach only their three parties; finished-game
       whispers reach everyone. Nothing here re-litigates that. -->
  <transition name="sd-slide">
    <div
      class="chronicles-drawer"
      v-if="isOpen"
      :style="[{ '--sd-w': width + 'px' }, sheetStyle]"
    >
      <!-- drag the left edge to resize; the width persists per browser -->
      <div
        class="sd-grip"
        title="Drag to resize — double-click to reset"
        @pointerdown="startResize"
        @dblclick="resetWidth"
      ></div>
      <!-- PHONE ONLY: the sheet's grab handle (the × stays the reliable exit) -->
      <div class="gs-handle" @pointerdown="startSheetDrag"></div>
      <div class="sd-head">
        <CloseX
          class="sd-close"
          title="Close the chronicles"
          @pointerup.native="sheetDismiss"
          @click.native="sheetDismiss"
        />
        <h3 class="sd-title">
          <img class="sd-mark" :src="quill" alt="" />
          <span>Chronicles</span>
        </h3>
      </div>

      <div class="sd-view cr-view">
        <!-- ── THE SUMMARY BAND — the town records, standing over the story.
             One line always; the tables unfold on a click. Best-effort like
             every records read: unreachable is an honest line, never a
             broken band. -->
        <div
          class="cr-records"
          :class="{ open: recordsOpen }"
          role="button"
          :title="
            recordsOpen ? 'Fold the records away' : 'Unfold the town records'
          "
          @click="recordsOpen = !recordsOpen"
        >
          <p class="cr-records-line">
            <template v-if="records.loading">Consulting the archives…</template>
            <template v-else-if="records.error"
              >Records unavailable — server unreachable</template
            >
            <template v-else-if="!records.stats || !records.stats.games"
              >No games recorded yet</template
            >
            <template v-else>
              <b>{{ records.stats.games }}</b>
              {{ records.stats.games === 1 ? "game" : "games" }} · Good
              {{ records.stats.byTeam.good }} · Evil
              {{ records.stats.byTeam.evil }}
              <font-awesome-icon class="cr-records-chev" icon="chevron-down" />
            </template>
          </p>
          <template v-if="recordsOpen && records.stats && records.stats.games">
            <table
              v-if="records.stats.byScript && records.stats.byScript.length"
              @click.stop
            >
              <thead>
                <tr>
                  <th>Script</th>
                  <th>Games</th>
                  <th>Good wins</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in records.stats.byScript" :key="row.scriptName">
                  <td>{{ row.scriptName }}</td>
                  <td>{{ row.games }}</td>
                  <td>{{ row.goodWins }}</td>
                </tr>
              </tbody>
            </table>
            <table v-if="topPlayers.length" @click.stop>
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

        <!-- ── THE FILTERS: what kind of line, and which game. Two rows of
             the same plated-segment idiom the night sheet uses. -->
        <div class="cr-filter" role="group" aria-label="Which lines to show">
          <button
            v-for="f in filterCells"
            :key="f.id"
            class="cr-cell"
            :class="{ on: filter === f.id }"
            :title="f.title"
            @click="filter = f.id"
          >
            {{ f.label }}
          </button>
        </div>
        <div class="cr-games" role="group" aria-label="Which game to show">
          <button
            class="cr-chip"
            :class="{ on: gamePick === null }"
            title="The whole story — every game and everything between"
            @click="pickGame(null)"
          >
            Everything
          </button>
          <button
            v-for="g in games"
            :key="g.gameId"
            class="cr-chip"
            :class="{ on: gamePick === g.gameId }"
            :title="'Only game ' + g.ordinal"
            @click="pickGame(g.gameId)"
          >
            {{ gameLabel(g) }}
          </button>
          <button
            class="cr-chip"
            :class="{ on: gamePick === 'between' }"
            title="Only what was said outside a game"
            @click="pickGame('between')"
          >
            Between games
          </button>
        </div>

        <!-- ── THE STREAM ──────────────────────────────────────────────── -->
        <div class="cr-log" ref="log" v-blood-scroll @scroll="onScroll">
          <template v-for="section in sections">
            <!-- A GAME is a chapter: a header that says which, folding the
                 run beneath it. The game being played right now says so. -->
            <section
              v-if="section.gameId"
              :key="section.key"
              class="cr-game"
              :class="{ now: isLive(section) }"
            >
              <h4
                role="button"
                :title="
                  isExpanded(section)
                    ? 'Fold this game away'
                    : 'Unfold this game'
                "
                @click="toggleSection(section)"
              >
                <font-awesome-icon
                  class="cr-chev"
                  :class="{ open: isExpanded(section) }"
                  icon="chevron-down"
                />
                {{ sectionLabel(section) }}
                <span class="cr-now" v-if="isLive(section)">now</span>
                <span class="cr-count">{{ section.rows.length }}</span>
              </h4>
              <ol class="cr-rows" v-if="isExpanded(section)">
                <li
                  v-for="row in section.rows"
                  :key="row.seq"
                  class="cr-row"
                  :class="rowClass(row)"
                >
                  <ChroniclesRow :row="row" :viewer="viewer" />
                </li>
              </ol>
            </section>
            <!-- BETWEEN GAMES: no chapter, no fold — the town talking on its
                 own time, standing between the games it talked around. -->
            <ol v-else :key="section.key" class="cr-rows cr-between">
              <li
                v-for="row in section.rows"
                :key="row.seq"
                class="cr-row"
                :class="rowClass(row)"
              >
                <ChroniclesRow :row="row" :viewer="viewer" />
              </li>
            </ol>
          </template>
          <p class="cr-empty" v-if="!sections.length">{{ emptyText }}</p>
        </div>

        <!-- ── THE COMPOSER — lifted whole from the chat drawer: chips for
             who this goes to (Room resting, whisper armed in purple), the
             entry, and the refusal line when the store never took it. -->
        <div class="cr-compose">
          <div class="cr-targets">
            <button
              class="cr-target"
              :class="{ on: !target }"
              title="Say this to the whole town"
              @click="pick(null)"
            >
              Room
            </button>
            <button
              v-for="t in whisperTargets"
              :key="t.id"
              class="cr-target is-whisper"
              :class="{ on: target && target.id === t.id }"
              :title="'Whisper ' + t.label"
              @click="pick(t)"
            >
              {{ t.label }}
            </button>
          </div>
          <div class="cr-entry">
            <input
              ref="entry"
              v-model="draft"
              class="cr-input"
              type="text"
              :maxlength="bodyMax"
              :placeholder="placeholder"
              :disabled="!canTalk"
              spellcheck="false"
              @keyup.enter="send"
            />
            <button
              class="cr-send"
              :disabled="!canTalk || !draft.trim()"
              title="Send"
              @click="send"
            >
              <font-awesome-icon icon="hand-point-right" />
            </button>
          </div>
          <p class="cr-error" v-if="error">{{ error }}</p>
          <p class="cr-note" v-else-if="!canTalk">{{ mutedText }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapState } from "vuex";
import CloseX from "./CloseX";
import ChroniclesRow from "./ChroniclesRow";
import rightDrawer from "../golem/rightDrawer";
import bottomSheet from "../golem/bottomSheet";
import {
  BODY_MAX,
  seatOf,
  STORYTELLER_KEY,
  viewerOf,
} from "../golem/chat";
import {
  dayOf,
  gamesOf,
  inFilter,
  sectionize,
} from "../golem/chronicles";
import { townStats } from "../golem/stats";
// the strip's own quill — the mark that opens this drawer leads its title
import quill from "../assets/ui-chronicle.png";

export default {
  name: "ChroniclesDrawer",
  components: { CloseX, ChroniclesRow },
  mixins: [
    bottomSheet,
    rightDrawer({
      modal: "chroniclesDrawer",
      storageKey: "golem.chroniclesDrawerW",
      // the chat drawer's 440 plus room for the chapter chrome
      defaultWidth: 460,
    }),
  ],
  data() {
    return {
      quill,
      bodyMax: BODY_MAX,
      draft: "",
      /** null = the room; otherwise the whisper target chip that is armed. */
      target: null,
      /** Is the log scrolled to the bottom? Decides whether it follows. */
      stuck: true,
      /** "all" | "talk" | "events" — what kind of line the stream shows. */
      filter: "all",
      /** null = everything; "between" = between games; else one gameId. */
      gamePick: null,
      /** Per-section fold overrides, keyed by section key. Untouched
       *  sections answer by default: the live/newest game open, the rest
       *  folded. */
      folds: {},
      /** The records band — the town's finished-games aggregates. */
      records: { loading: true, error: false, stats: null },
      recordsOpen: false,
    };
  },
  computed: {
    ...mapState(["chat", "grimoire", "session", "night"]),
    ...mapState("players", ["players"]),
    error() {
      return this.chat.error;
    },
    /** WHO THIS BROWSER IS — name-keyed, read from what it already knows. */
    viewer() {
      return viewerOf(this.$store.state);
    },
    /**
     * The identity the log in the store was FILTERED FOR (see ChatDrawer's
     * original note): rows are dropped at ingest, so an identity change
     * means the held log is wrong and must be re-read from zero.
     */
    viewerKey() {
      return `${this.viewer.isStoryteller ? "st" : "pl"}:${this.viewer.key}`;
    },
    canTalk() {
      return !!this.viewer.key && !!this.session.sessionId;
    },
    /** The stream, narrowed to the kind and the game being looked at. */
    visible() {
      return this.chat.log.filter((row) => {
        if (!inFilter(row, this.filter)) return false;
        if (this.gamePick === "between") return !row.gameId;
        if (this.gamePick) return row.gameId === this.gamePick;
        return true;
      });
    },
    /** The chapters — consecutive runs of one gameId, in story order. */
    sections() {
      return sectionize(this.visible);
    },
    /** Every game the LOG knows, newest first, for the picker. Derived from
     *  the unfiltered log so the picker never loses a game to the filter. */
    games() {
      return gamesOf(this.chat.log);
    },
    filterCells() {
      return [
        { id: "all", label: "All", title: "Talk and events together" },
        { id: "talk", label: "Talk", title: "Only what people said" },
        {
          id: "events",
          label: "Events",
          title: "Only what happened — deals, phases, deaths, votes, endings",
        },
      ];
    },
    /** Who can be whispered — ChatDrawer's rule, verbatim. */
    whisperTargets() {
      const out = [];
      if (this.session.isSpectator) {
        out.push({
          id: "host",
          label: "Storyteller",
          key: STORYTELLER_KEY,
          seat: null,
        });
      }
      const mySeat = seatOf(this.$store.state);
      this.players.forEach((player, seat) => {
        if (!player.id) return;
        if (player.id === this.session.playerId) return;
        if (seat === mySeat) return;
        out.push({
          id: player.id,
          label: player.name || `Seat ${seat + 1}`,
          key: player.name || `Seat ${seat + 1}`,
          seat,
        });
      });
      return out;
    },
    topPlayers() {
      const players = (this.records.stats && this.records.stats.players) || [];
      return [...players]
        .sort((a, b) => b.games - a.games || b.wins - a.wins)
        .slice(0, 10);
    },
    placeholder() {
      if (!this.canTalk) return "";
      return this.target ? `Whisper ${this.target.label}…` : "Say something…";
    },
    mutedText() {
      if (!this.session.sessionId) return "Join a town to talk in it.";
      return "Take a seat, or set a name, and you can talk.";
    },
    emptyText() {
      if (this.chat.syncing) return "Reading the town's story…";
      if (this.filter === "events") return "Nothing has happened yet.";
      if (this.gamePick === "between") return "Nothing said between games yet.";
      if (this.gamePick) return "Nothing recorded in that game.";
      return "Nobody has said anything in this town yet.";
    },
  },
  watch: {
    isOpen(open) {
      if (!open) return;
      // Catch up from the contiguity cursor (safe to overlap — the action
      // refuses re-entry and every row dedups by seq), and re-read the
      // records: a game may have finished since last look.
      this.$store.dispatch("chatCatchUp");
      this.loadRecords();
      this.stuck = true;
      this.$nextTick(this.toBottom);
    },
    viewerKey() {
      this.$store.commit("chatReset");
      this.$store.dispatch("chatCatchUp");
    },
    visible() {
      if (this.stuck) this.$nextTick(this.toBottom);
    },
    /** A target who left the town cannot be whispered; fall back to the room. */
    whisperTargets(list) {
      if (!this.target) return;
      if (!list.some((t) => t.id === this.target.id)) this.target = null;
    },
  },
  methods: {
    loadRecords() {
      const town = this.session.sessionId;
      if (!town) {
        this.records = { loading: false, error: false, stats: null };
        return;
      }
      this.records = { loading: true, error: false, stats: null };
      townStats(town)
        .then((stats) => {
          this.records = { loading: false, error: false, stats };
        })
        .catch(() => {
          this.records = { loading: false, error: true, stats: null };
        });
    },
    /** Picking a game is a view change AND an unfold — the point of picking
     *  one is to read it. */
    pickGame(pick) {
      this.gamePick = pick;
      if (pick && pick !== "between") {
        this.$set(this.folds, pick, true);
      }
      this.stuck = true;
      this.$nextTick(this.toBottom);
    },
    isLive(section) {
      return !!this.chat.gameId && section.gameId === this.chat.gameId;
    },
    /** Folded or not: the user's own toggle wins; otherwise the live game
     *  and the newest chapter stand open and finished ones stand folded. */
    isExpanded(section) {
      if (section.key in this.folds) return this.folds[section.key];
      if (this.isLive(section)) return true;
      const last = [...this.sections]
        .reverse()
        .find((candidate) => candidate.gameId);
      return !!last && last.key === section.key;
    },
    toggleSection(section) {
      this.$set(this.folds, section.key, !this.isExpanded(section));
    },
    sectionLabel(section) {
      const first = section.rows[0];
      const day = first ? dayOf(first.createdAt) : "";
      return `Game ${section.ordinal}${day ? " · " + day : ""}`;
    },
    gameLabel(game) {
      const live = !!this.chat.gameId && game.gameId === this.chat.gameId;
      if (live) return "This game";
      const day = dayOf(game.startedAt);
      return `Game ${game.ordinal}${day ? " · " + day : ""}`;
    },
    rowClass(row) {
      return [
        "is-" + row.kind,
        { mine: row.kind !== "system" && row.senderKey === this.viewer.key },
      ];
    },
    pick(t) {
      this.target = t;
      this.$store.commit("chatError", "");
      this.$nextTick(() => {
        if (this.$refs.entry) this.$refs.entry.focus();
      });
    },
    onScroll() {
      const el = this.$refs.log;
      if (!el) return;
      this.stuck = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    },
    toBottom() {
      const el = this.$refs.log;
      if (el) el.scrollTop = el.scrollHeight;
    },
    /**
     * SEND — ChatDrawer's contract, verbatim: nothing is appended locally,
     * the line reaches the log when the relay echoes the row the STORE
     * accepted, and a refusal lands under the composer.
     */
    send() {
      const body = this.draft.trim();
      if (!body || !this.canTalk) return;
      const t = this.target;
      this.$store.commit("chatSay", {
        to: t ? t.id : "",
        kind: t ? "whisper" : "say",
        gameId: this.chat.gameId,
        senderKey: this.viewer.key,
        senderKind: this.viewer.kind,
        senderSeat: this.viewer.seat,
        recipientKey: t ? t.key : null,
        recipientSeat: t ? t.seat : null,
        body,
        phase: this.grimoire.isNight ? "night" : "day",
        dayNumber: this.night.day,
      });
      this.draft = "";
      this.stuck = true;
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
@import "../drawer.scss";
@import "../controls.scss";

.chronicles-drawer {
  // the right-hand rail's blood seam, as every drawer on it
  @include right-drawer(#4a0d0d);
  @include sheet-handle;
}

.cr-view {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 6px;
}

// ── THE RECORDS BAND ───────────────────────────────────────────────────────
.cr-records {
  @include control-plate;
  flex: none;
  padding: 4px 8px;
  cursor: pointer;
  max-height: 40vh;
  overflow-y: auto;
}
.cr-records-line {
  margin: 0;
  font-size: 12px;
  text-align: center;
  opacity: 0.8;
  b {
    color: #c00;
  }
}
.cr-records-chev {
  margin-left: 6px;
  font-size: 9px;
  opacity: 0.6;
  transition: transform 150ms;
}
.cr-records.open .cr-records-chev {
  transform: rotate(180deg);
}
.cr-records table {
  margin: 6px auto 4px;
  border-collapse: collapse;
  font-size: 11px;
  cursor: default;
  th {
    opacity: 0.6;
    font-weight: normal;
    text-align: left;
    padding: 1px 10px 1px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }
  td {
    text-align: left;
    padding: 2px 10px 2px 0;
  }
  th:not(:first-child),
  td:not(:first-child) {
    text-align: right;
    padding-right: 0;
    padding-left: 10px;
  }
}

// ── THE FILTERS ────────────────────────────────────────────────────────────
.cr-filter {
  @include control-plate;
  display: flex;
  flex: none;
  overflow: hidden;
}
.cr-cell {
  @include control-cell;
  flex: 1 1 0;
  padding: 4px 6px;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  &.on {
    @include control-lit;
  }
}
.cr-games {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  flex: none;
}
.cr-chip {
  @include control-plate;
  font-family: inherit;
  padding: 2px 8px;
  font-size: 11px;
  color: #d8cdb4;
  cursor: pointer;
  transition:
    color 150ms,
    border-color 150ms,
    background 150ms;
  &:hover {
    color: #fff;
    @include control-plate-hover;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
  &.on {
    @include control-lit;
  }
}

// ── THE STREAM ─────────────────────────────────────────────────────────────
.cr-log {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 4px 2px 0;
  font-size: 14px;
  line-height: 1.45;
}

.cr-rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

// A GAME CHAPTER — the chronicle's engraved heading, now over a fold.
.cr-game {
  margin: 6px 0;
  h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
    font-family: PiratesBay, sans-serif;
    font-weight: normal;
    font-size: 15px;
    opacity: 0.8;
    margin: 0 0 3px;
    cursor: pointer;
    user-select: none;
    &:hover {
      opacity: 1;
    }
    // the rule that runs off the heading to the drawer's edge
    &:after {
      content: "";
      flex: 1;
      height: 1px;
      background: linear-gradient(
        to right,
        rgba(216, 205, 180, 0.35),
        rgba(216, 205, 180, 0)
      );
    }
  }
  &.now h4 {
    opacity: 1;
  }
}
.cr-chev {
  font-size: 10px;
  opacity: 0.55;
  transform: rotate(-90deg);
  transition: transform 150ms;
  &.open {
    transform: none;
  }
}
.cr-now {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(216, 205, 180, 0.16);
  opacity: 0.85;
}
.cr-count {
  font-size: 10px;
  opacity: 0.45;
  font-variant-numeric: tabular-nums;
}

// a game's rows sit under their heading, on the chapter's own hairline
.cr-game .cr-rows {
  padding-left: 6px;
  border-left: 1px solid rgba(216, 205, 180, 0.14);
}

.cr-row {
  display: block;
  padding: 3px 6px;
  border-radius: 4px;
  color: #e8e2d4;
  word-break: break-word;
  & + .cr-row {
    margin-top: 1px;
  }
}

// YOUR OWN LINE — the chat drawer's hairline, unchanged.
.cr-row.mine {
  box-shadow: inset 2px 0 0 rgba(150, 130, 175, 0.55);
}

// A WHISPER IS VISIBLY NOT ROOM TALK — recessed purple, both ends named.
.cr-row.is-whisper {
  background: rgba(32, 24, 38, 0.85);
  box-shadow: inset 0 0 0 1px rgba(150, 130, 175, 0.28);
  color: #ddd3ea;
  &.mine {
    box-shadow:
      inset 0 0 0 1px rgba(150, 130, 175, 0.28),
      inset 2px 0 0 rgba(150, 130, 175, 0.75);
  }
}

.cr-empty {
  flex: none;
  margin: 10px 4px;
  font-size: 13px;
  opacity: 0.55;
  text-align: center;
}

// ── THE COMPOSER ───────────────────────────────────────────────────────────
// No pill reserve here: chroniclesDrawer is listed in App.vue's
// rightDrawerOpen, so the session pill steps aside the way it does for every
// other drawer — the one-line fix ChatDrawer's lane was barred from making.
.cr-compose {
  flex: none;
  border-top: 1px solid rgba(216, 205, 180, 0.14);
  padding-top: 6px;
}

.cr-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 5px;
}
.cr-target {
  @include control-plate;
  font-family: inherit;
  padding: 2px 8px;
  font-size: 12px;
  color: #d8cdb4;
  cursor: pointer;
  transition:
    color 150ms,
    border-color 150ms,
    background 150ms;
  &:hover {
    color: #fff;
    @include control-plate-hover;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
  &.on {
    @include control-lit;
  }
  // an armed whisper goes purple — blood is "chosen" everywhere else
  &.is-whisper.on {
    background: rgba(60, 44, 78, 0.95);
    border-color: rgba(150, 130, 175, 0.75);
    color: #efe6ff;
  }
}

.cr-entry {
  display: flex;
  gap: 6px;
  align-items: stretch;
}
.cr-input {
  @include control-plate;
  flex: 1 1 auto;
  min-width: 0;
  padding: 5px 9px;
  font-size: 14px;
  font-family: inherit;
  color: white;
  &:focus {
    outline: none;
    border-color: $control-focus;
  }
  &:disabled {
    @include control-disabled;
  }
}
.cr-send {
  @include control-icon-btn(38px, 30px, 44px, 40px);
  flex: none;
}

.cr-error {
  margin: 6px 2px 0;
  font-size: 12px;
  color: #ff7070;
}
.cr-note {
  margin: 6px 2px 0;
  font-size: 12px;
  opacity: 0.55;
}

@include right-drawer-slide;
</style>
