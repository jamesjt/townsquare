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
            v-if="isPhaseNight || hasNights"
            class="crr-moon"
            :src="moonFull"
            alt=""
          />
          <!-- FT-1242: FA `sun` stood down — day breaks under the fork's own
               baked sun (ui-sun.png), so the phase pair is art on both
               sides of the sky instead of art at night, stock glyph by day. -->
          <img
            v-else-if="isPhaseDay"
            class="crr-sun crr-sun-img"
            :src="uiSun"
            alt=""
          />
          <img v-else-if="isNoosed" class="crr-noose" :src="noose" alt="" />
          <!-- FT-1037 (user call): a game beginning wears the SAME mark the
               entry panel's join button wears — the figure on the road into
               town. The end keeps the checkered flag: an ending is a finish
               line, and the pair reads as arrival/finish rather than one
               glyph doing both. -->
          <img v-else-if="isStart" class="crr-enter" :src="uiEnter" alt="" />
          <!-- FT-1242: rows whose meaning already owns baked art wear it —
               death/revive (ui-dead/ui-alive, the kill row's pair) and the
               nomination's accusing manicule. EV_ICONS keeps the FA names
               as the stood-down record and the fallback for the rest. -->
          <img
            v-else-if="evImg"
            class="crr-ev-img"
            :class="evClass"
            :src="evImg"
            alt=""
          />
          <font-awesome-icon v-else-if="evIcon" :icon="evIcon" />
          <template v-else>◆</template>
        </span>
        <span class="crr-body crr-sys" :class="evClass">{{ text }}</span>
        <!-- FT-1032: how long the phase this row CLOSED ran — hidden when
             the timer is Off -->
        <span class="crr-ran" v-if="ranLabel">{{ ranLabel }}</span>
        <!-- FT-1036: the tally moved to its own line below the sentence -->
      </template>

      <!-- ── A WHISPER — both ends of the pair named up front ─────────── -->
      <template v-else-if="row.kind === 'whisper'">
        <!-- FT-1281 (user call): FA `user-secret` STOOD DOWN — a fedora and a
             trench coat read "spy", and a whisper is not espionage. The row
             wears the fork's own baked mark instead (ui-whisper.png; its
             source and the reasoning sit beside it in src/assets). The
             vocabulary FT-1211 settled is untouched: the plane still means
             SENT (the traffic row below keeps it), comment-dots still opens
             a message, and the talk filter's speech bubble stays talk's. -->
        <img class="crr-whisper-mark" :src="uiWhisper" alt="" />
        <span class="crr-pair"
          >{{ nameFor(row.senderKey) }} → {{ nameFor(row.recipientKey) }}</span
        >
        <span class="crr-body">{{ row.body }}</span>
      </template>

      <!-- ── WHISPER TRAFFIC (FT-1263) — a plane's memory: who whispered
           whom, never what. A bystander's row, local ephemera (see
           golem/whisperMarks): dim and small, traffic rather than talk.
           The mark between the names is the PLANE — the log of a sent
           thing wears the plane (FT-1211's ruling), as the whisper-count
           band already does. -->
      <template v-else-if="isTraffic">
        <span class="crr-traffic">
          {{ nameFor(row.senderKey) }}
          <font-awesome-icon
            class="crr-traffic-plane"
            icon="paper-plane"
            title="whispered — you saw the plane; what it carried stays theirs"
          />
          {{ nameFor(row.recipientKey) }}
        </span>
      </template>

      <!-- ── A PERSON TALKING ─────────────────────────────────────────── -->
      <template v-else>
        <span class="crr-who">{{ nameFor(row.senderKey) }}</span>
        <span class="crr-body">{{ row.body }}</span>
      </template>
      <span class="crr-time" :title="time">{{ moment }}</span>
    </span>
    <span
      class="crr-tally-line"
      v-if="row.kind === 'system' && event && event.t === 'nomination'"
    >
      <!-- FT-1036 (user call): the vote tally stands on its own line at the
     message's foot; with a roster aboard it is still the thread's
     expand handle. -->
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
        <!-- FT-1242: FA `hand-paper` stood down — the raised hand a cast vote
             actually wears on a seat (ui-vote-yes.png) counts the tally. -->
        {{ event.votes }}
        <img class="crr-hand" :src="uiVoteYes" alt="votes" /> of
        {{ event.majority }}
        <font-awesome-icon
          v-if="hasRoster"
          class="crr-tally-chev"
          icon="chevron-down"
        />
      </span>
    </span>

    <!-- ── A BOARD PORTRAIT (FT-1037) — a board row carries the ring as
         data, and the log shows it as the mini board it describes, right
         where it was posted. -->
    <span class="crr-board" v-if="hasBoard">
      <ChroniclesPortrait :board="event" :label="boardLabel" />
    </span>

    <!-- ── A NIGHT'S ACTIONS (FT-1101) — one block per night, each line
         naming who acted, as what, what they chose and what they were given.
         While the game runs this row is SYNTHETIC and reaches only the seat
         whose actions they were and the storyteller (`private`); at game end
         the host publishes the real row and the night joins the finished
         record everyone can read. -->
    <span class="crr-nights" v-if="hasNights">
      <span class="crr-nights-lines">
        <!-- FT-1274: ONE SENTENCE, WALKED AS TOKENS. Every word here comes
             out of `line.tokens`, which golem/nightLog built once for both
             readers — so the storyteller's copy and the player's copy of the
             same action are the same words in the same order, and the flat
             `line.text` beside them is that same array joined. Nothing on
             this row decides wording; it only decides dress.

             FT-1274 (user): the privacy footnote came OFF the row and is the
             row's HOVER now — one line per action, carrying the seat's name
             where the reader is entitled to it (the storyteller; a player's
             copy has no seatName to carry, structurally). -->
        <span
          class="crr-nights-line"
          v-for="(line, i) in nightLines"
          :key="i"
          :title="hoverFor(line)"
        >
          <img
            class="crr-nights-icon"
            v-if="roleIconFor(line)"
            :src="roleIconFor(line)"
            alt=""
          />
          <template v-for="(tok, j) in line.tokens">
            <span
              :key="i + ':' + j"
              class="crr-nights-tok"
              :class="tokClass(tok, line)"
              >{{ tok.w }}</span
            >
          </template>
        </span>
      </span>
      <!-- FT-1274 (user: "the privacy footnote comes out of the row"): STOOD
           DOWN, not deleted — the house rule. `privacy` is still the SENTENCE
           rather than a flag (the storyteller and the seat are both entitled
           readers of this block and the two are owed different words) and it
           is still carried on the event; it is read by `hoverFor` above and
           printed nowhere. A published row carries none. -->
      <span class="crr-nights-privacy" v-if="false">{{ event.privacy }}</span>
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
      <!-- FT-1242: FA `heartbeat`/`skull` stood down — the beats wear the
           kill row's own pair (ui-alive/ui-dead), one death vocabulary. -->
      <span class="crr-beat" v-if="thread.unmark">
        <img class="crr-beat-mark crr-beat-img" :src="uiAlive" alt="" />
        {{ beatText(thread.unmark) }}
      </span>
      <span class="crr-beat" v-if="thread.death">
        <img class="crr-beat-mark crr-beat-img" :src="uiDead" alt="" />
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
// FT-1263: the traffic row's kind — a bystander's memory of a plane.
import { TRAFFIC_KIND } from "../golem/whisperMarks";
// FT-1037: a board row's real face — the mini ring its data describes.
import ChroniclesPortrait from "./ChroniclesPortrait";
// FT-1019: the ghost-vote cowl — the same hand that drew the seat's own mark
// (Player.vue wears this art on a spent ghost vote's token).
import cowl from "../assets/ui-ghost-vote-cowl.png";
// FT-1024: the fork's own noose — the marked-for-execution mark, the same art
// TownInfo's votes-to-execute count wears (its source SVG sits beside it).
import noose from "../assets/ui-noose.png";
// FT-1032: the phase marks' art and the timer-off gate
import moonFull from "../assets/moon-full.png";
// FT-1037 (user call): the game-start mark IS the join button's mark — the
// figure on the road into town (Intro.vue's enter art, reused as-is).
import uiEnter from "../assets/ui-enter.png";
// FT-1242: the rows whose meanings already own baked art wear it — death and
// revive wear the kill row's own pair (ui-alive/ui-dead, golem/seatActions),
// the nomination wears the accusing manicule, and day breaks under the baked
// sun (ui-sun.png, baked this pass — its night partner was already an <img>).
import uiAlive from "../assets/ui-alive.png";
import uiDead from "../assets/ui-dead.png";
import uiNominateHand from "../assets/ui-nominate-hand.png";
import uiSun from "../assets/ui-sun.png";
// FT-1242: the tally's hand is the raised hand a cast vote wears on a seat.
import uiVoteYes from "../assets/ui-vote-yes.png";
// FT-1281: the whisper row's own mark, baked for this fork (see the .svg
// beside it) — it replaced FA's `user-secret`, which read "spy".
import uiWhisper from "../assets/ui-whisper.png";
// FT-1274: the night sentence leads with the character's own icon — the same
// helper NightSheet's checklist rows and the clock face's night ask read, so
// one character has one face on every surface.
import { roleIconUrl } from "../golem/roleIcon";
import { effectiveHourFlags, hourAllOff } from "../golem/towerBells";

/** Event type → the registered FA icon that marks it. Only icons main.js
 *  already registers — this file adds none. FT-1242: rows named in EV_IMGS
 *  below wear baked art instead; the FA names here are the stood-down record
 *  and the fallback should an image ever fail to resolve. */
const EV_ICONS = {
  // FT-1037 (user call): start wears the join button's own road-into-town
  // art (the <img> branch in the template), not an FA glyph.
  start: null,
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
  // FT-1037: the session boundary and the board rows keep the plain mark —
  // the open line is quiet news, and a board row's real face is its portrait.
  open: null,
  board: null,
  // FT-1101: a night block wears the full moon, like the night falling above
  // it — the <img> branch in the template, not an FA glyph.
  nights: null,
};

/** FT-1242: event type → the fork's own baked mark. Checked before EV_ICONS
 *  in the template; a type absent here falls through to the FA record. */
const EV_IMGS = {
  death: uiDead,
  revive: uiAlive,
  unmark: uiAlive,
  nomination: uiNominateHand,
};

export default {
  name: "ChroniclesRow",
  components: { ChroniclesPortrait },
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
    return {
      cowl,
      noose,
      uiEnter,
      uiAlive,
      uiDead,
      uiSun,
      uiVoteYes,
      uiWhisper,
      open: false,
    };
  },
  computed: {
    time() {
      return timeOf(this.row);
    },
    /**
     * "Night 2" / "Day 3" — the in-game moment; the wall clock only when the
     * row has none.
     *
     * FT-1140: ASK THE FIELDS THAT CARRY THE MOMENT. This used to gate on
     * `gameId`, which does not know when a row happened — it names WHICH
     * RECORDED GAME a row belongs to, and it is minted from the deal stash,
     * so it exists only if somebody pressed Deal. A storyteller running the
     * town without dealing (roles set by hand, an in-person game tracked on
     * the grimoire) produced rows carrying a perfectly good `phase` and
     * `dayNumber` — "Night 1 falls." itself among them — and every one of
     * them was shown as a wall clock, because no id had been minted.
     *
     * The moment is `phase` + `dayNumber`, and a day that has BEGUN: the
     * counter sits at 0 until the first night falls, and there is no Day 0 to
     * name. So a row from before the first night, or from between two games
     * (`sendChat` stamps no day once a game has ended), keeps the clock —
     * which is the correct and only true answer for a row that happened
     * outside a game's own time, not a fallback standing in for one.
     */
    moment() {
      const day = this.row.dayNumber;
      if (!this.row.phase || !(day >= 1)) return this.time;
      return (this.row.phase === "night" ? "Night " : "Day ") + day;
    },
    event() {
      return this.row.kind === "system" ? decodeEvent(this.row.body) : null;
    },
    /** FT-1263: a whisper-traffic row — metadata only, rendered dim. */
    isTraffic() {
      return this.row.kind === TRAFFIC_KIND;
    },
    text() {
      return eventTextOf(this.row);
    },
    evClass() {
      return this.event ? "ev-" + this.event.t : "ev-plain";
    },
    isPhaseNight() {
      return (
        !!this.event && this.event.t === "phase" && this.row.phase === "night"
      );
    },
    isPhaseDay() {
      return (
        !!this.event && this.event.t === "phase" && this.row.phase !== "night"
      );
    },
    ranLabel() {
      if (this.ran == null || !this.event || this.event.t !== "phase")
        return "";
      // FT-1052: "the timer is off" is now derived — no layer showing.
      if (hourAllOff(effectiveHourFlags(this.$store.state.session))) return "";
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
    /** FT-1242: the row's baked mark, where its meaning owns one. */
    evImg() {
      return this.event ? EV_IMGS[this.event.t] || null : null;
    },
    /** FT-1024: does this row's mark wear the noose art? Only the
     *  marked-for-execution event does. */
    isNoosed() {
      return !!this.event && this.event.t === "execution";
    },
    /** FT-1037: the game-start row, wearing the join button's road art. */
    isStart() {
      return !!this.event && this.event.t === "start";
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
    /** FT-1101: is this a night-block row with actions actually aboard? An
     *  empty block never renders — nightBlocksOf drops a night nobody did
     *  anything in, and a row that arrived empty says nothing worth a line. */
    hasNights() {
      return this.nightLines.length > 0;
    },
    /**
     * FT-1274: the lines of a night block that this build can actually SAY.
     *
     * A line is the token list golem/nightLog built for it, so a row whose
     * lines carry no tokens is one a DIFFERENT build wrote — a published
     * night sitting in the town's log from before the sentence had this
     * shape. Those are skipped rather than half-rendered: the night's own
     * "Night 2 — 4 actions." row still stands in the stream above them, so
     * the record does not go quiet, and no line is drawn from parts this
     * renderer no longer knows how to word.
     */
    nightLines() {
      if (!this.event || this.event.t !== "nights") return [];
      if (!Array.isArray(this.event.lines)) return [];
      return this.event.lines.filter(
        (line) => line && Array.isArray(line.tokens) && line.tokens.length > 0,
      );
    },
    /** FT-1037: is this a board row with a ring actually aboard? */
    hasBoard() {
      return (
        !!this.event &&
        this.event.t === "board" &&
        Array.isArray(this.event.seats) &&
        this.event.seats.length > 0
      );
    },
    /** What the portrait's moment is called under its ring. FT-1057:
     *  `start` is the opening board; `day1` is the legacy moment older
     *  logs hold; anything else is the end. */
    boardLabel() {
      if (this.event.moment === "start") return "The game begins";
      if (this.event.moment === "day1") return "Day 1";
      return "The end";
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
    /**
     * FT-1274: THE CHARACTER A NIGHT LINE IS ABOUT, resolved at RENDER time
     * from the id the line carries — never stamped into the stored row.
     *
     * That is deliberate and it is what keeps a live block and a published one
     * dressed identically: the same lookup runs for both, so a night read
     * during the game and the same night read out of the finished record wear
     * the same icon and the same team colour. Stamping the team into the event
     * would have given a published row whatever the script said at publish
     * time and a live row whatever it says now — two answers to one question.
     *
     * The script's own table first (a homebrew or forged character is only
     * ever there), then the base edition, then a bare id so the icon helper's
     * own custom.png fallback can do its job.
     */
    roleOf(line) {
      const id = line && line.roleId;
      if (!id) return null;
      const state = this.$store.state;
      const base = this.$store.getters.rolesJSONbyId;
      return (
        (state.roles && state.roles.get(id)) || base.get(id) || { id, team: "" }
      );
    },
    /** FT-1274: the icon that leads the sentence — NightSheet's own approach,
     *  through the shared helper (golem/roleIcon), so the chronicle and the
     *  checklist can never show a character two different faces. */
    roleIconFor(line) {
      const role = this.roleOf(line);
      return role ? roleIconUrl(role, this.$store.getters.rolesJSONbyId) : "";
    },
    /**
     * FT-1274: one token's dress. The kinds that carry meaning get a class;
     * the connectives get the muted one.
     *
     * The ROLE token also takes its team, which is the only class on this row
     * computed from anything but the token itself.
     */
    tokClass(tok, line) {
      if (tok.k !== "role") return "tok-" + tok.k;
      const role = this.roleOf(line);
      return ["tok-role", "team-" + ((role && role.team) || "townsfolk")];
    },
    /**
     * FT-1274: the row's HOVER — where the privacy footnote went.
     *
     * Two facts, and the second one is only ever present for a reader who
     * already holds it: `line.who` is the seat's name, and a PLAYER's copy of
     * a row has none at all (projectPlayerRow does not carry seatName, so
     * chronicleLineOf reads "" — structurally, not by a test here). So this
     * cannot show a player a seat they could not already see, and it gives the
     * storyteller back the one thing the role-first sentence stopped printing.
     */
    hoverFor(line) {
      const privacy = this.event && this.event.privacy;
      const who = line && line.who;
      if (who && privacy) return who + " — " + privacy;
      return who || privacy || "";
    },
    beatText(row) {
      return eventTextOf(row);
    },
  },
};
</script>

<style scoped lang="scss">
// FT-1274: the team tokens, for the night sentence's role name.
@import "../vars.scss";

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
// FT-1242: the baked event marks — the moon's rank (14px) for the sun and
// the row marks, the noose's rank (13px) for the fold-out beats, and the
// tally's little raised hand inline with its numbers.
.crr-sun-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
}
.crr-ev-img {
  width: 13px;
  height: 13px;
  object-fit: contain;
  vertical-align: -2px;
  /* the nominate manicule is the dark purple cut and vanishes at 13px on
     this ground without the same lift the seat surfaces give it */
  &.ev-nomination {
    filter: brightness(2.1) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.9));
  }
}
img.crr-beat-mark {
  width: 12px;
  height: 12px;
  object-fit: contain;
  vertical-align: -2px;
}
.crr-hand {
  width: 11px;
  height: 11px;
  object-fit: contain;
  vertical-align: -1px;
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

// FT-1281: the whisper mark is ART now, not a glyph — the `crr-ev-img` shape
// (13px, contain), with the spacing and the colour ROLE the FA icon held. The
// colour is baked INTO the file rather than set here, because an <img> takes
// no `color`: the mark is baked in the whisper palette's own lilac instead of
// the family's bone, so the row's one violet accent stays violet. `color`
// stays as the record of the tone that was asked for, and as the ink for the
// alt text should the image ever fail to resolve.
.crr-whisper-mark {
  margin-right: 5px;
  font-size: 11px;
  color: rgba(180, 160, 205, 0.9);
  flex: none;
  width: 13px;
  height: 13px;
  object-fit: contain;
  align-self: center;
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

// FT-1263: whisper traffic — the whisper palette turned well down. A row
// that is deliberately quieter than every kind of talk around it: the eye
// scanning the day catches the rhythm of the planes without reading them
// as lines anyone said.
.crr-traffic {
  font-size: 12px;
  letter-spacing: 0.3px;
  color: rgba(180, 160, 205, 0.55);
}
.crr-traffic-plane {
  font-size: 10px;
  margin: 0 3px;
  opacity: 0.8;
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

.crr-tally-line {
  display: block;
  margin: 2px 0 0 22px;
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

// FT-1037: the game-start mark — the join button's road-into-town art, sized
// to the same rank as the noose and the cowl (the hand-drawn 13px set).
.crr-enter {
  height: 13px;
  vertical-align: -2px;
}

.crr-none {
  opacity: 0.55;
}

// FT-1037: a board row's portrait, standing under its line
.crr-board {
  display: flex;
  justify-content: center;
  margin: 4px 0 2px;
}

// FT-1101: THE NIGHT'S BLOCK — one indented strand under the night's own
// sentence, the gallows thread's shape (a rail on the left, lines stacked
// against it) because it is the same kind of thing: what followed the row
// above it.
//
// ── FT-1274: AND IT IS A PLATE NOW ─────────────────────────────────────────
// The user's ask was "put these lines in the glass maybe? or make them stand
// out?", and the "or" is the judgement. THE ANSWER IS NOT THE GLASS, for two
// reasons and one of them is what the material MEANS on this fork:
//
//   · `face-disc-menu-plate` is the FLOATING-SURFACE material here — the
//     account door, the hotkey panel, the top-right menus, the role picker.
//     Every one of them sits ABOVE the page. A chronicle row is IN the page,
//     and dressing it in the glass would say "this is a popup", which is the
//     wrong sentence about the one row that is the game's own record.
//   · it is a `backdrop-filter` per element, and this element repeats down a
//     scrolling log — one compositing pass per night, per game, forever. The
//     brief's own qualifier is "calm enough to repeat down a long log", and a
//     stack of blurred panes is not calm at any count.
//
// So it is an INSCRIBED plate rather than a floating one: the glass's own
// tint family (`--fd-tint-rgb`'s 26,20,33) and its bevel — a lit hairline at
// the top, a hairline rim, a shadow beneath — with no blur behind it. That
// reads as something CUT INTO the stream rather than laid over it, which is
// exactly what "the record speaking" is next to a line somebody said (bare)
// and a line the town announced (a mark and serif ink, no ground).
.crr-nights {
  display: block;
  // FT-1284 (user): “make the night actions full width of the chat, or
  // nearly — it should have much less margin on its left and right, padding
  // left and right of it needed.” The 18px indent was the plate apologising
  // for itself; the record is not a reply to the line above it. It now begins
  // where every other row begins and spends the reclaimed space INSIDE,
  // where the sentence can use it — which is also what stops long lines
  // (the Ravenkeeper’s) from wrapping so early.
  margin: 3px 0 5px 0;
  padding: 5px 13px 6px 12px;
  border-radius: 9px;
  // FT-1152 (user): "Night info should have the left border as storyteller
  // purple not gold". The night block is the storyteller's own record — the
  // one thing on this row that only they and the acting seat can read until
  // the game ends — so it wears the book's colour, the same plum every other
  // storyteller control took today. Gold is the checklist's tick, not the
  // record's edge. FT-1274 keeps the rail exactly as it was; the plate grew
  // around it.
  //
  // FT-1284 (user): “remove the left thick border and never add one again.”
  // A STANDING RULE, not a one-off: no surface in this app wears a thick
  // coloured rail down its left edge. This plate already says what it is by
  // being a plate — the inscribed ground, the bevel, the rim — and the rail
  // was a second, louder answer to a question the plate had already answered.
  // The bevel below is untouched; only the rail goes. (Same call the user
  // made on own-whisper rows, FT-1279, and on own talk lines, FT-1023.)
  //   border-left: 2px solid rgba(167, 143, 205, 0.55);
  background: linear-gradient(
    to bottom,
    rgba(41, 33, 52, 0.66),
    rgba(20, 16, 26, 0.74)
  );
  box-shadow:
    inset 0 1px 0 rgba(216, 205, 180, 0.1),
    inset 0 0 0 1px rgba(216, 205, 180, 0.06),
    0 1px 2px rgba(0, 0, 0, 0.45);
  // FT-1274 (user): "use the font from the events, not the night actions tab".
  // The events' face is PiratesBay at 0.3px tracking (`.crr-sys` above) and
  // this block inherited the drawer's body font instead — the one visible
  // difference between the town's own lines and the town's own record. Set on
  // the plate so every token inside it takes it, the answer's YES included:
  // PiratesBay IS the display face the join and host doors wear, so the user's
  // "YES in the display face" costs nothing extra once the block is in it, and
  // the word stands out on CAPS and colour rather than on a second family.
  font-family: PiratesBay, sans-serif;
  letter-spacing: 0.3px;
}

.crr-nights-lines {
  display: block;
}

// A BLOCK WITH A HANGING INDENT, not a flex row — measured (the first cut of
// this was `flex-wrap: wrap` and the Ravenkeeper's line, the one long enough
// to wrap, restarted hard against the plate's left edge under its own icon,
// so a wrapped sentence read as two sentences). The overhang is exactly the
// icon's own width plus its gap, so the first line begins where the icon does
// and every wrapped line begins where the WORDS do.
.crr-nights-line {
  display: block;
  padding: 2px 0 2px 21px;
  text-indent: -21px;
  font-size: 95%;
  line-height: 1.5;
}

// FT-1274: the icon leads the sentence — the checklist's own approach
// (roleIconUrl). A rank above the hand-drawn 13px marks this row's other art
// wears (the noose, the cowl, the road into town), because those are one
// glyph each and a character icon is a whole small picture.
.crr-nights-icon {
  width: 17px;
  height: 17px;
  object-fit: contain;
  vertical-align: -4px;
  margin-right: 4px;
  text-indent: 0;
}

// ── THE SENTENCE'S TOKENS ──────────────────────────────────────────────────
// Muted by default: the connective words ("and") and the clause verbs
// ("chose", "said", "was given") are grammar, not information. Everything the
// reader is actually scanning for lifts out of them.
.crr-nights-tok {
  color: #cdc4b2;
  // the word gap, set here rather than by whitespace in the markup: the
  // token list is a `v-for` with no text nodes between its spans, which is
  // also what makes `tokens.map(w).join(" ")` and the DOM the same sentence
  margin-right: 4px;
}
.tok-join,
.tok-lead {
  opacity: 0.6;
}

// THE ROLE NAME WEARS ITS TEAM (user call). FT-1167's ruling is the precedent
// — raw tokens, legibility bought with a HALO rather than with hue, because a
// wash toward white pulls six hues a third of the way toward each other and
// the whole point of the colour is telling a Minion from a Demon at a glance.
//
// BUT ITS MEASUREMENT DOES NOT CARRY, and the honest thing is to say why.
// FT-1167 measured a 22px BOLD name, which is LARGE TEXT by WCAG's own
// definition (>= 18.66px bold) and answers to 3:1. This name is ~13px bold —
// SMALL text, 4.5:1 — and against this plate's ground (rgb(24,19,30)) three
// of the six raw tokens fail it:
//
//              raw     +14%
//   fabled     14.71   15.56
//   outsider   10.62   12.85
//   minion      6.32    8.27
//   traveler    4.37 ✗  5.62
//   townsfolk   3.79 ✗  6.41
//   demon       3.15 ✗  4.69
//
// So every token takes the SAME +14% lightness lift the demon already takes
// on two other surfaces (NightSheet's checklist, ScriptView's cards), which
// clears 4.5:1 for all six. A uniform HSL lightness shift is not the wash
// FT-1167 rejected: it moves every hue by the same amount and so preserves
// the separation between them, which is the property that mattered.
// FT-1284 (user): “that text is hard to read, maybe because it is bold?”
// THEY WERE RIGHT, AND THE CAUSE IS THE FACE. PiratesBay ships as ONE file
// with no bold cut (App.vue’s @font-face declares a single src and no
// font-weight), so every `bold` in this block was SYNTHETIC — the browser
// smearing the outline sideways. At ~13px on a dark plate that reads as a
// blur, not as weight. So the bold comes off every token here and the
// emphasis rides what actually survives at this size: ink, colour, and for
// the answer its capitals and tracking. Nothing about the measured contrast
// changes — 13px is small text at 4.5:1 whether it is bold or not.
.tok-role {
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 6px rgba(0, 0, 0, 0.8);
  &.team-townsfolk {
    color: lighten($townsfolk, 14%);
  }
  &.team-outsider {
    color: lighten($outsider, 14%);
  }
  &.team-minion {
    color: lighten($minion, 14%);
  }
  &.team-demon {
    color: lighten($demon, 14%);
  }
  &.team-traveler {
    color: lighten($traveler, 14%);
  }
  &.team-fabled {
    color: lighten($fabled, 14%);
  }
}

// the seats a row picked — the other thing the eye hunts for
.tok-name {
  // a shade brighter than the bold it replaces, so the seats keep the same
  // rank in the sentence without the smear (FT-1284)
  color: #f0e6cf;
}

// ── THE ANSWER (user call) ─────────────────────────────────────────────────
// YES SHOUTS AND no DOES NOT, and the asymmetry is the whole design: these
// two words are not a matched pair of pills, they are a loud answer and a
// quiet one. This replaces the green/red pair the retired nights view used —
// green/red said "good news / bad news", which a night answer never means.
.tok-yes {
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: #f4ead2;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 8px rgba(0, 0, 0, 0.7);
}
// the town's own blue, lifted by the same 14% the role names take and for the
// same measured reason ($townsfolk raw is 3.79:1 here — under the small-text
// bar; lifted it is 6.41:1)
.tok-no {
  color: lighten($townsfolk, 14%);
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 6px rgba(0, 0, 0, 0.8);
}

// THE ANSWERS THAT ARE NOT YES/NO read in the same grammar and the same rank:
// an Empath's number, an Undertaker's character, a storyteller's free note.
// One dress for "what you were given", whatever kind of thing it was.
.tok-number,
.tok-character {
  color: #f0e6cf;
}
.tok-note {
  color: #ddd2ba;
}

// the player's OWN words, quoted — the one token that is somebody talking, so
// it is the one token that leans
.tok-said {
  font-style: italic;
  color: #cfc6b4;
}

// FT-1274: STOOD DOWN with the markup above (`v-if="false"`) — the privacy
// sentence is the row's hover now, not printed text. The rule stays so the
// span can be put back without re-deriving it.
.crr-nights-privacy {
  display: block;
  font-size: 85%;
  opacity: 0.5;
  padding-top: 2px;
}
</style>
