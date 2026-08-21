<template>
  <!-- Golem fork (FT-1010): ONE LINE of the chronicles stream.

       Three shapes, decided by the stored row itself:
         · a SAY — a person talking: name, colon, line (the chat idiom)
         · a WHISPER — both ends named up front, purple, recessed
         · a SYSTEM row — the town's own news. If its body wears the EV1
           envelope (golem/chronicles) it renders as a TYPED event with its
           own mark; a plain body (every pre-FT-1010 row) renders as the
           muted italic line it always was.

       This component renders what it is handed and decides nothing about
       who may see it — that was settled at ingest (chatIngest + canSee). -->
  <span class="crr">
    <!-- FT-1018 (user call): the moment that matters is the GAME's — which
         day, night or daylight — not the wall clock. The clock is still
         recorded on every row and lives here in the hover. Between-games
         rows have no game moment, so they keep the clock. -->
    <span class="crr-time" :title="time">{{ moment }}</span>

    <!-- ── AN EVENT / SYSTEM LINE ─────────────────────────────────────── -->
    <template v-if="row.kind === 'system'">
      <span class="crr-ev-mark" :class="evClass" aria-hidden="true">
        <font-awesome-icon v-if="evIcon" :icon="evIcon" />
        <template v-else>◆</template>
      </span>
      <span class="crr-body crr-sys" :class="evClass">{{ text }}</span>
      <!-- a concluded vote carries its tally beside the sentence -->
      <span
        class="crr-tally"
        v-if="event && event.t === 'nomination'"
        :class="{ carried: event.carried }"
      >
        {{ event.votes }} <font-awesome-icon icon="hand-paper" /> of
        {{ event.majority }}
      </span>
    </template>

    <!-- ── A WHISPER — both ends of the pair named up front ───────────── -->
    <template v-else-if="row.kind === 'whisper'">
      <font-awesome-icon class="crr-whisper-mark" icon="user-secret" />
      <span class="crr-pair"
        >{{ nameFor(row.senderKey) }} → {{ nameFor(row.recipientKey) }}</span
      >
      <span class="crr-body">{{ row.body }}</span>
    </template>

    <!-- ── A PERSON TALKING ───────────────────────────────────────────── -->
    <template v-else>
      <span class="crr-who">{{ nameFor(row.senderKey) }}</span>
      <span class="crr-body">{{ row.body }}</span>
    </template>
  </span>
</template>

<script>
import { timeOf } from "../golem/chat";
import { decodeEvent, eventTextOf } from "../golem/chronicles";

/** Event type → the registered FA icon that marks it. Only icons main.js
 *  already registers — this file adds none. */
const EV_ICONS = {
  start: "flag-checkered",
  end: "flag-checkered",
  phase: null, // the moon/sun pair reads better as color than as glyphs here
  death: "skull",
  revive: "heartbeat",
  nomination: "vote-yea",
  execution: "skull",
};

export default {
  name: "ChroniclesRow",
  props: {
    row: { type: Object, required: true },
    viewer: { type: Object, required: true },
  },
  computed: {
    time() {
      return timeOf(this.row);
    },
    /** "N2" / "D3" — the in-game moment; the wall clock only when the row
     *  lives between games. */
    moment() {
      if (!this.row.gameId || !this.row.phase) return this.time;
      const d = this.row.dayNumber == null ? "" : this.row.dayNumber;
      return (this.row.phase === "night" ? "N" : "D") + d;
    },
    event() {
      return this.row.kind === "system" ? decodeEvent(this.row.body) : null;
    },
    text() {
      return eventTextOf(this.row);
    },
    evClass() {
      return this.event ? "ev-" + this.event.t : "ev-plain";
    },
    evIcon() {
      return this.event ? EV_ICONS[this.event.t] || null : null;
    },
  },
  methods: {
    /** "you" for this browser's own key, so a whisper pair reads naturally. */
    nameFor(key) {
      if (!key) return "someone";
      return key === this.viewer.key ? "you" : key;
    },
  },
};
</script>

<style scoped lang="scss">
.crr-time {
  display: inline-block;
  min-width: 38px;
  margin-right: 4px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.45;
}

.crr-who {
  font-family: PiratesBay, sans-serif;
  color: #d8cdb4;
  margin-right: 6px;
  &:after {
    content: ":";
    opacity: 0.5;
  }
}

.crr-body {
  white-space: pre-wrap;
}

.crr-whisper-mark {
  margin-right: 5px;
  font-size: 11px;
  color: rgba(180, 160, 205, 0.9);
}
.crr-pair {
  margin-right: 6px;
  font-size: 12px;
  letter-spacing: 0.3px;
  color: rgba(200, 185, 220, 0.95);
  &:after {
    content: ":";
    opacity: 0.5;
  }
}

// ── THE TOWN'S OWN LINES ───────────────────────────────────────────────────
// The chat idiom held: an event is not a person, so no name and no colon —
// italic smallcaps-ish lettering, a mark in the speaker's place, and the
// mark's COLOR says what kind of news it is.
.crr-sys {
  font-family: PiratesBay, sans-serif;
  font-style: italic;
  letter-spacing: 0.3px;
  color: #b9b1a2;
}

.crr-ev-mark {
  display: inline-block;
  min-width: 14px;
  margin-right: 5px;
  font-size: 10px;
  text-align: center;
  color: rgba(190, 90, 90, 0.75);
  &.ev-death,
  &.ev-execution {
    color: rgba(220, 120, 120, 0.95);
  }
  &.ev-revive {
    color: rgba(126, 214, 126, 0.85);
  }
  &.ev-nomination {
    color: rgba(216, 205, 180, 0.8);
  }
  &.ev-start,
  &.ev-end {
    color: rgba(216, 205, 180, 0.95);
  }
  &.ev-phase {
    color: rgba(143, 143, 216, 0.9);
  }
}

// the news that changes the town's state stands a shade brighter
.crr-sys.ev-death,
.crr-sys.ev-execution {
  color: #d8b9b1;
}
.crr-sys.ev-start,
.crr-sys.ev-end {
  color: #d8cdb4;
  font-style: normal;
}

.crr-tally {
  margin-left: 6px;
  padding: 0 8px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  &.carried {
    color: #ffb4b4;
  }
}
</style>
