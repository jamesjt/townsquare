<template>
  <!-- Golem fork (FT-1010): ONE LINE of the chronicles stream.

       Three shapes, decided by the stored row itself:
         · a SAY — a person talking: name, colon, line (the chat idiom)
         · a WHISPER — both ends named up front, purple, recessed
         · a SYSTEM row — the town's own news. If its body wears the EV1
           envelope (golem/chronicles) it renders as a TYPED event with its
           own mark; a plain body (every pre-FT-1010 row) renders as the
           muted line it always was (upright since FT-1024).

       FT-1019: a NOMINATION row is the head of the GALLOWS THREAD — its
       tally chip is the expand handle, and the strand it unfolds holds the
       voter roster (a spent ghost vote wears the cowl) and the arc that
       followed: the mark, a lifted mark, the death. Rows written before the
       roster existed have no handle and render tally-only.

       This component renders what it is handed and decides nothing about
       who may see it — that was settled at ingest (chatIngest + canSee). -->
  <span class="crr">
    <!-- FT-1018 (user call): the moment that matters is the GAME's — which
         day, night or daylight — not the wall clock. The clock is still
         recorded on every row and lives here in the hover. Between-games
         rows have no game moment, so they keep the clock.
         FT-1018b (user): it stands at the row's FAR RIGHT, spelled out
         ("Day 3" / "Night 1"), and the row text grew a size. -->
    <span class="crr-line">
      <!-- ── AN EVENT / SYSTEM LINE ───────────────────────────────────── -->
      <template v-if="row.kind === 'system'">
        <span class="crr-ev-mark" :class="evClass" aria-hidden="true">
          <!-- FT-1024: marked-for-execution wears the fork's own noose art —
               an <img>, the same idiom the drawer's filter cells and
               TownInfo's votes-to-execute count wear — never the FA skull,
               which is death's mark and must not promise one. -->
          <!-- FT-1032 (user call): night falls under the full moon, day
               breaks under the sun. -->
          <img
            v-if="isPhaseNight"
            class="crr-moon"
            :src="moonFull"
            alt=""
          />
          <font-awesome-icon v-else-if="isPhaseDay" icon="sun" class="crr-sun" />
          <img v-else-if="isNoosed" class="crr-noose" :src="noose" alt="" />
          <font-awesome-icon v-else-if="evIcon" :icon="evIcon" />
          <template v-else>◆</template>
        </span>
        <span class="crr-body crr-sys" :class="evClass">{{ text }}</span>
        <!-- FT-1032: how long the phase this row CLOSED ran — hidden when
             the timer is Off -->
        <span class="crr-ran" v-if="ranLabel">{{ ranLabel }}</span>
        <!-- a concluded vote carries its tally beside the sentence; with a
             roster aboard (FT-1019) the chip is the thread's expand handle -->
        <span
          class="crr-tally"
          v-if="event && event.t === 'nomination'"
          :class="{ carried: event.carried, handle: hasRoster, open }"
          :role="hasRoster ? 'button' : null"
          :title="
            hasRoster
              ? open
                ? 'Fold the gallows thread away'
                : 'Who raised hands, and what followed'
              : null
          "
          @click="hasRoster && (open = !open)"
        >
          {{ event.votes }} <font-awesome-icon icon="hand-paper" /> of
          {{ event.majority }}
          <font-awesome-icon
            v-if="hasRoster"
            class="crr-tally-chev"
            icon="chevron-down"
          />
        </span>
      </template>

      <!-- ── A WHISPER — both ends of the pair named up front ─────────── -->
      <template v-else-if="row.kind === 'whisper'">
        <font-awesome-icon class="crr-whisper-mark" icon="user-secret" />
        <span class="crr-pair"
          >{{ nameFor(row.senderKey) }} → {{ nameFor(row.recipientKey) }}</span
        >
        <span class="crr-body">{{ row.body }}</span>
      </template>

      <!-- ── A PERSON TALKING ─────────────────────────────────────────── -->
      <template v-else>
        <span class="crr-who">{{ nameFor(row.senderKey) }}</span>
        <span class="crr-body">{{ row.body }}</span>
      </template>
      <span class="crr-time" :title="time">{{ moment }}</span>
    </span>

    <!-- ── THE GALLOWS THREAD (FT-1019) — the strand under a nomination:
         who raised hands (a dead voter's spent ghost vote wears the cowl),
         then the beats that were actually recorded after it. Nothing here
         is inferred: every beat is a row the host's client wrote, and a
         majority with no mark row shows exactly that. -->
    <span class="crr-thread" v-if="open">
      <span class="crr-voters">
        <span class="crr-thread-label">Hands</span>
        <template v-if="event.voters.length">
          <span
            v-for="(name, i) in event.voters"
            :key="i + ':' + name"
            class="crr-voter"
            :class="{ ghost: isGhost(name) }"
          >
            <img
              v-if="isGhost(name)"
              class="crr-cowl"
              :src="cowl"
              alt=""
              title="A ghost vote, spent"
            />{{ name || "an unnamed seat" }}
          </span>
        </template>
        <span v-else class="crr-none">nobody</span>
      </span>
      <span class="crr-beat" v-if="thread.mark">
        <!-- FT-1024: the mark beat wears the noose here too — same honesty
             as the head row's mark: marked is not dead. -->
        <img class="crr-beat-mark crr-noose" :src="noose" alt="" />
        {{ beatText(thread.mark) }}
      </span>
      <span class="crr-beat" v-if="thread.unmark">
        <font-awesome-icon class="crr-beat-mark ev-unmark" icon="heartbeat" />
        {{ beatText(thread.unmark) }}
      </span>
      <span class="crr-beat" v-if="thread.death">
        <font-awesome-icon class="crr-beat-mark ev-death" icon="skull" />
        {{ beatText(thread.death) }}
      </span>
      <span class="crr-beat crr-none" v-if="!thread.mark && !thread.death">
        No mark followed.
      </span>
    </span>
  </span>
</template>

<script>
import { timeOf } from "../golem/chat";
import { decodeEvent, eventTextOf, gallowsThreadOf } from "../golem/chronicles";
// FT-1019: the ghost-vote cowl — the same hand that drew the seat's own mark
// (Player.vue wears this art on a spent ghost vote's token).
import cowl from "../assets/ui-ghost-vote-cowl.png";
// FT-1024: the fork's own noose — the marked-for-execution mark, the same art
// TownInfo's votes-to-execute count wears (its source SVG sits beside it).
import noose from "../assets/ui-noose.png";
// FT-1032: the phase marks' art and the timer-off gate
import moonFull from "../assets/moon-full.png";
import { effectiveHourMode } from "../golem/towerBells";

/** Event type → the registered FA icon that marks it. Only icons main.js
 *  already registers — this file adds none. */
const EV_ICONS = {
  start: "flag-checkered",
  end: "flag-checkered",
  phase: null, // the moon/sun pair reads better as color than as glyphs here
  death: "skull",
  revive: "heartbeat",
  // FT-1024 (user call): a nomination is a pointed finger, not a ballot.
  nomination: "hand-point-right",
  // FT-1024: execution wears the noose <img> (see the template), never the
  // skull — the skull is death's, and a mark is not a death.
  execution: null,
  unmark: "heartbeat",
};

export default {
  name: "ChroniclesRow",
  props: {
    row: { type: Object, required: true },
    // FT-1032: seconds the phase this row closed ran for (null = unknown)
    ran: { type: Number, default: null },
    viewer: { type: Object, required: true },
    /** The row's own SECTION (FT-1019) — the run the gallows thread walks
     *  forward through. Optional: without it a nomination still renders,
     *  it just has no beats to unfold beyond its own roster. */
    rows: { type: Array, default: null },
  },
  data() {
    return { cowl, noose, open: false };
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
      return (this.row.phase === "night" ? "Night " : "Day ") + d;
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
    isPhaseNight() {
      return !!this.event && this.event.t === "phase" && this.row.phase === "night";
    },
    isPhaseDay() {
      return !!this.event && this.event.t === "phase" && this.row.phase !== "night";
    },
    ranLabel() {
      if (this.ran == null || !this.event || this.event.t !== "phase") return "";
      if (effectiveHourMode(this.$store.state.session) === "off") return "";
      const m = Math.floor(this.ran / 60);
      const s = this.ran % 60;
      return m ? m + "m " + String(s).padStart(2, "0") + "s" : s + "s";
    },
    moonFull() {
      return moonFull;
    },
    evIcon() {
      return this.event ? EV_ICONS[this.event.t] || null : null;
    },
    /** FT-1024: does this row's mark wear the noose art? Only the
     *  marked-for-execution event does. */
    isNoosed() {
      return !!this.event && this.event.t === "execution";
    },
    /** FT-1019: does this nomination carry a roster? Old rows do not, and
     *  render tally-only — the chip is a handle only when there is a thread
     *  to open. */
    hasRoster() {
      return (
        !!this.event &&
        this.event.t === "nomination" &&
        Array.isArray(this.event.voters)
      );
    },
    /** The beats after the nomination — computed only while the strand is
     *  open (the template is the only reader). */
    thread() {
      return gallowsThreadOf(this.rows || [], this.row);
    },
  },
  methods: {
    /** "you" for this browser's own key, so a whisper pair reads naturally. */
    nameFor(key) {
      if (!key) return "someone";
      return key === this.viewer.key ? "you" : key;
    },
    isGhost(name) {
      return (
        Array.isArray(this.event.ghosts) && this.event.ghosts.includes(name)
      );
    },
    beatText(row) {
      return eventTextOf(row);
    },
  },
};
</script>

<style scoped lang="scss">
.crr {
  display: block;
}

.crr-line {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.crr-moon {
  width: 14px;
  height: 14px;
  object-fit: contain;
}
.crr-sun {
  color: #e8c15a;
}
.crr-ran {
  margin-left: 6px;
  font-size: 11px;
  opacity: 0.5;
  white-space: nowrap;
}

.crr-time {
  margin-left: 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  opacity: 0.5;
  white-space: nowrap;
  align-self: center;
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
  flex: 1;
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
// the serif lettering, a mark in the speaker's place, and the mark's COLOR
// says what kind of news it is. UPRIGHT since FT-1024 (user call): the serif
// family and the muted ink already set system text apart from talk; the
// italic on top of them was a third differentiator doing no work.
.crr-sys {
  font-family: PiratesBay, sans-serif;
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
  // FT-1024 (user call): a death's mark is news in the row's own bone ink,
  // not blood — the sentence already says what happened.
  &.ev-death {
    color: #d8cdb4;
  }
  // execution's mark is the noose <img> now (FT-1024); this ink survives only
  // as the fallback for a row whose art failed to load.
  &.ev-execution {
    color: rgba(220, 120, 120, 0.95);
  }
  &.ev-revive,
  &.ev-unmark {
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
  // (the `font-style: normal` that stood here is the family default since
  // FT-1024 made every system line upright)
  color: #d8cdb4;
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
  // FT-1019: a chip with a roster aboard is the thread's handle
  &.handle {
    cursor: pointer;
    &:hover {
      background: rgba(0, 0, 0, 0.6);
      box-shadow: inset 0 0 0 1px rgba(216, 205, 180, 0.35);
    }
  }
}
.crr-tally-chev {
  margin-left: 4px;
  font-size: 9px;
  opacity: 0.6;
  transition: transform 150ms;
  .crr-tally.open & {
    transform: rotate(180deg);
  }
}

// ── THE GALLOWS THREAD (FT-1019) ───────────────────────────────────────────
// The strand hangs under its nomination on the same hairline idiom a game's
// rows hang under their chapter — indented, quiet, foldable from the chip.
.crr-thread {
  display: block;
  margin: 3px 0 2px 20px;
  padding: 3px 0 3px 8px;
  border-left: 1px solid rgba(216, 205, 180, 0.22);
  font-size: 13px;
}

.crr-voters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px 6px;
}
.crr-thread-label {
  font-family: PiratesBay, sans-serif;
  font-size: 12px;
  letter-spacing: 0.06em;
  opacity: 0.55;
  margin-right: 2px;
}
.crr-voter {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  box-shadow: inset 0 0 0 1px rgba(216, 205, 180, 0.16);
  color: #e0d8c6;
  &.ghost {
    color: #cfd6e2;
    box-shadow: inset 0 0 0 1px rgba(160, 175, 205, 0.3);
  }
}
.crr-cowl {
  height: 13px;
  display: block;
}

.crr-beat {
  display: block;
  margin-top: 3px;
  font-family: PiratesBay, sans-serif;
  // upright since FT-1024, with the system lines above — same reasoning
  letter-spacing: 0.3px;
  color: #cdc4b2;
}
.crr-beat-mark {
  min-width: 14px;
  margin-right: 4px;
  font-size: 10px;
  text-align: center;
  // FT-1024: the death beat's skull in bone ink, not blood (the mark beat
  // wears the noose <img> and takes no color at all)
  &.ev-death {
    color: #d8cdb4;
  }
  &.ev-unmark {
    color: rgba(126, 214, 126, 0.85);
  }
}

// FT-1024: the noose art, sized to stand where a 10px FA glyph stood — the
// cowl beside it in the thread is 13px, and matching it keeps the two pieces
// of hand-drawn art on one visual rank.
.crr-noose {
  height: 13px;
  vertical-align: -2px;
}
.crr-none {
  opacity: 0.55;
}
</style>
