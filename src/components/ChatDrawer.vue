<template>
  <!-- Golem fork (FT-965): THE TOWN CHAT — the fifth drawer on the right-hand
       rail, and the only one that is not scoped to the game being played.

       A TOWN IS THE CHAT ROOM: one permanent room per town, outliving every
       game played in it, with system lines sitting in the same stream as
       people talking. The game is a FILTER over that log (the three-way switch
       below), never a boundary that resets it.

       WHY ITS OWN DRAWER rather than a tab beside the chronicle. The chronicle
       is a DERIVED, read-only view of the game in progress — golem/chronicle
       reassembles it from the night log, the vote history and the seats every
       time it renders, and it has no state of its own. This is the opposite on
       all three counts: it is fed by the wire, it outlives the game, and it
       takes input. Filing a permanent room as a tab inside a per-game view
       would put the log inside the very boundary it is supposed to cross. So
       the chat bubble in the strip — which was already drawn as a chat bubble —
       opens chat, and the chronicle keeps its own door beside it.

       WHERE IT IS MOUNTED, and why it is not in the tree that opens it: Menu
       owns the door, but Menu's root `#controls` is `z-index: 75` and therefore
       a STACKING CONTEXT — a drawer rendered inside it paints at the strip's
       level, over the very mark that opens it. So Menu mounts this component
       into its own element on the BODY (see Menu's `mounted`), which puts it on
       the same rail as the other four drawers with the same z-index meaning the
       same thing. Re-parenting the element after the fact was tried and does
       not hold: Vue puts it back on Menu's next re-render. -->
  <transition name="sd-slide">
    <div
      class="chat-drawer"
      :class="{ 'pill-below': !!session.sessionId }"
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
          title="Close the town chat"
          @pointerup.native="sheetDismiss"
          @click.native="sheetDismiss"
        />
        <h3 class="sd-title">
          <img class="sd-mark" :src="bubble" alt="" />
          <span>Town chat</span>
        </h3>
      </div>

      <div class="sd-view ct-view">
        <!-- THE GAME FILTER — the user's framing made into a control. One
             plated group, three positions (controls.scss's own idiom), not
             three buttons that happen to touch. "This game" is unavailable
             between games, when there is no game to mean. -->
        <div class="ct-scope" role="group" aria-label="Which messages to show">
          <button
            v-for="s in scopeCells"
            :key="s.id"
            class="ct-scope-cell"
            :class="{ on: scope === s.id }"
            :disabled="s.disabled"
            :title="s.title"
            @click="setScope(s.id)"
          >
            {{ s.label }}
          </button>
        </div>

        <ol class="ct-log" ref="log" v-blood-scroll @scroll="onScroll">
          <li
            v-for="row in visible"
            :key="row.seq"
            class="ct-row"
            :class="['is-' + row.kind, { mine: isMine(row) }]"
          >
            <span class="ct-time">{{ time(row) }}</span>
            <!-- A SYSTEM LINE IS NOT A PERSON TALKING, and is drawn so: no
                 name, no colon, its own muted italic and a marker in place of
                 a speaker. -->
            <template v-if="row.kind === 'system'">
              <span class="ct-sys-mark" aria-hidden="true">◆</span>
              <span class="ct-body ct-sys">{{ row.body }}</span>
            </template>
            <!-- A WHISPER NAMES BOTH ENDS. A storyteller reads pairs they
                 were not part of, so "who this was between" is the thing
                 that has to be legible, not just who spoke. -->
            <template v-else-if="row.kind === 'whisper'">
              <font-awesome-icon class="ct-whisper-mark" icon="user-secret" />
              <span class="ct-pair"
                >{{ nameFor(row.senderKey) }} →
                {{ nameFor(row.recipientKey) }}</span
              >
              <span class="ct-body">{{ row.body }}</span>
            </template>
            <template v-else>
              <span class="ct-who">{{ nameFor(row.senderKey) }}</span>
              <span class="ct-body">{{ row.body }}</span>
            </template>
          </li>
        </ol>

        <p class="ct-empty" v-if="!visible.length">{{ emptyText }}</p>

        <div class="ct-compose">
          <!-- WHO THIS LINE GOES TO. Chips rather than a dropdown: the app
               has no select idiom, a menu hides the current answer behind a
               press, and "am I about to whisper?" is the one thing that must
               never be a surprise. Room is first and is the resting state. -->
          <div class="ct-targets">
            <button
              class="ct-target"
              :class="{ on: !target }"
              title="Say this to the whole town"
              @click="pick(null)"
            >
              Room
            </button>
            <button
              v-for="t in whisperTargets"
              :key="t.id"
              class="ct-target is-whisper"
              :class="{ on: target && target.id === t.id }"
              :title="'Whisper ' + t.label"
              @click="pick(t)"
            >
              {{ t.label }}
            </button>
          </div>
          <div class="ct-entry">
            <input
              ref="entry"
              v-model="draft"
              class="ct-input"
              type="text"
              :maxlength="bodyMax"
              :placeholder="placeholder"
              :disabled="!canTalk"
              spellcheck="false"
              @keyup.enter="send"
            />
            <button
              class="ct-send"
              :disabled="!canTalk || !draft.trim()"
              title="Send"
              @click="send"
            >
              <font-awesome-icon icon="hand-point-right" />
            </button>
          </div>
          <!-- THE SENDER IS TOLD. A relay refusal means the store never took
               the line and nobody saw it; silently dropping it would leave
               the sender believing they had spoken. -->
          <p class="ct-error" v-if="error">{{ error }}</p>
          <p class="ct-note" v-else-if="!canTalk">{{ mutedText }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapState } from "vuex";
import CloseX from "./CloseX";
import rightDrawer from "../golem/rightDrawer";
import bottomSheet from "../golem/bottomSheet";
import {
  BODY_MAX,
  inScope,
  seatOf,
  STORYTELLER_KEY,
  timeOf,
  viewerOf,
} from "../golem/chat";
// the strip's own bubble — the mark that opens this drawer leads its title
import bubble from "../assets/ui-chat.png";

export default {
  name: "ChatDrawer",
  components: { CloseX },
  mixins: [
    bottomSheet,
    rightDrawer({
      modal: "chatDrawer",
      storageKey: "golem.chatDrawerW",
      // wider than the script's default: a line of talk plus a name plus a
      // clock reads as a wrapped paragraph much under 420
      defaultWidth: 440,
    }),
  ],
  data() {
    return {
      bubble,
      bodyMax: BODY_MAX,
      draft: "",
      /** null = the room; otherwise the whisper target chip that is armed. */
      target: null,
      /** Is the log scrolled to the bottom? Decides whether it follows. */
      stuck: true,
    };
  },
  computed: {
    ...mapState(["chat", "grimoire", "session", "night"]),
    ...mapState("players", ["players"]),
    scope() {
      return this.chat.scope;
    },
    error() {
      return this.chat.error;
    },
    /** WHO THIS BROWSER IS — name-keyed, read from what it already knows. */
    viewer() {
      return viewerOf(this.$store.state);
    },
    /**
     * The identity the log in the store was FILTERED FOR. Rows are dropped on
     * the way in, so when this changes — a seat claimed, a name typed, the
     * storyteller's chair changing hands — the rows already dropped can never
     * be re-offered by a cursor that has moved past them. The watcher below
     * throws the log away and reads it again under the identity now in force.
     */
    viewerKey() {
      return `${this.viewer.isStoryteller ? "st" : "pl"}:${this.viewer.key}`;
    },
    canTalk() {
      return !!this.viewer.key && !!this.session.sessionId;
    },
    /** The log, narrowed to the scope being looked at. */
    visible() {
      return this.chat.log.filter((row) =>
        inScope(row, this.scope, this.chat.gameId),
      );
    },
    scopeCells() {
      return [
        {
          id: "game",
          label: "This game",
          disabled: !this.chat.gameId,
          title: this.chat.gameId
            ? "Only what was said during the game being played"
            : "No game is being played right now",
        },
        {
          id: "town",
          label: "Whole town",
          disabled: false,
          title: "Everything this town has ever said",
        },
        {
          id: "none",
          label: "Between games",
          disabled: false,
          title: "Only what was said outside a game",
        },
      ];
    },
    /**
     * Who can be whispered: every OTHER chair with a live connection behind
     * it, plus the storyteller when this browser is not them. A chair with no
     * `id` has nobody in it — a whisper there would be stored and read by
     * nobody, so it is not offered.
     */
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
    placeholder() {
      if (!this.canTalk) return "";
      return this.target ? `Whisper ${this.target.label}…` : "Say something…";
    },
    mutedText() {
      if (!this.session.sessionId) return "Join a town to talk in it.";
      return "Take a seat, or set a name, and you can talk.";
    },
    emptyText() {
      if (this.chat.syncing) return "Reading the town log…";
      if (this.scope === "game") return "Nothing said in this game yet.";
      if (this.scope === "none") return "Nothing said between games yet.";
      return "Nobody has said anything in this town yet.";
    },
  },
  watch: {
    isOpen(open) {
      if (!open) return;
      // Catch up from the contiguity cursor. Overlapping calls are refused by
      // the action itself and every row is deduped by seq, so opening the
      // drawer while the socket's own catch-up is still running is harmless.
      this.$store.dispatch("chatCatchUp");
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
    setScope(id) {
      this.$store.commit("chatSetScope", id);
      this.stuck = true;
      this.$nextTick(this.toBottom);
    },
    pick(t) {
      this.target = t;
      this.$store.commit("chatError", "");
      this.$nextTick(() => {
        if (this.$refs.entry) this.$refs.entry.focus();
      });
    },
    time(row) {
      return timeOf(row);
    },
    /** A row this browser sent — worth a mark, so your own line is findable. */
    isMine(row) {
      return row.kind !== "system" && row.senderKey === this.viewer.key;
    },
    /** "you" for this browser's own key, so a whisper pair reads naturally. */
    nameFor(key) {
      if (!key) return "someone";
      return key === this.viewer.key ? "you" : key;
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
     * SEND. Nothing is appended locally — the line reaches the log when the
     * relay echoes back the row the STORE accepted, so what is on screen is
     * only ever what was recorded. A refusal arrives as `chatError` and is
     * shown under the composer.
     *
     * `to` is ROUTING (the recipient's raw connection id) and is separate from
     * `recipientKey`/`recipientSeat`, which are the stored row's identity.
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

.chat-drawer {
  // the right-hand rail's blood seam, as the script, vote and night drawers
  @include right-drawer(#4a0d0d);
  @include sheet-handle;
}

.ct-view {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 6px;
}

// ── THE GAME FILTER ────────────────────────────────────────────────────────
// One plated group, three cells — controls.scss's own segment idiom, so this
// switch is the same object as the night sheet's and the build panel's.
.ct-scope {
  @include control-plate;
  display: flex;
  flex: none;
  overflow: hidden;
}
.ct-scope-cell {
  @include control-cell;
  flex: 1 1 0;
  padding: 4px 6px;
  font-size: 12px;
  line-height: 1.5;
  white-space: nowrap;
  &.on {
    @include control-lit;
  }
  &:disabled {
    @include control-disabled;
  }
}

// ── THE LOG ────────────────────────────────────────────────────────────────
.ct-log {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 2px 4px 2px 0;
  font-size: 14px;
  line-height: 1.45;
}

.ct-row {
  display: block;
  padding: 3px 6px;
  border-radius: 4px;
  color: #e8e2d4;
  word-break: break-word;
  & + .ct-row {
    margin-top: 1px;
  }
}

.ct-time {
  display: inline-block;
  min-width: 38px;
  margin-right: 4px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.45;
}

.ct-who {
  font-family: PiratesBay, sans-serif;
  color: #d8cdb4;
  margin-right: 6px;
  &:after {
    content: ":";
    opacity: 0.5;
  }
}

.ct-body {
  white-space: pre-wrap;
}

// YOUR OWN LINE. A hairline down the left, not a colour — the log already
// spends colour on what a line IS (room / whisper / system), and a fourth
// meaning on the same channel would collide with all three.
.ct-row.mine {
  box-shadow: inset 2px 0 0 rgba(150, 130, 175, 0.55);
}

// A WHISPER IS VISIBLY NOT ROOM TALK: its own recessed ground, the
// storyteller's purple, and both ends of the pair named up front.
.ct-row.is-whisper {
  background: rgba(32, 24, 38, 0.85);
  box-shadow: inset 0 0 0 1px rgba(150, 130, 175, 0.28);
  color: #ddd3ea;
  &.mine {
    box-shadow:
      inset 0 0 0 1px rgba(150, 130, 175, 0.28),
      inset 2px 0 0 rgba(150, 130, 175, 0.75);
  }
}
.ct-whisper-mark {
  margin-right: 5px;
  font-size: 11px;
  color: rgba(180, 160, 205, 0.9);
}
.ct-pair {
  margin-right: 6px;
  font-size: 12px;
  letter-spacing: 0.3px;
  color: rgba(200, 185, 220, 0.95);
  &:after {
    content: ":";
    opacity: 0.5;
  }
}

// A SYSTEM LINE IS NOT A PERSON. No name, no plate, italic, centred weight —
// it reads as the log speaking rather than someone in it.
.ct-row.is-system {
  color: #b9b1a2;
  font-style: italic;
}
.ct-sys-mark {
  margin-right: 6px;
  font-size: 9px;
  vertical-align: 1px;
  color: rgba(190, 90, 90, 0.75);
}
.ct-sys {
  font-family: PiratesBay, sans-serif;
  letter-spacing: 0.3px;
}

.ct-empty {
  flex: none;
  margin: 10px 4px;
  font-size: 13px;
  opacity: 0.55;
  text-align: center;
}

// ── THE COMPOSER ───────────────────────────────────────────────────────────
.ct-compose {
  flex: none;
  border-top: 1px solid rgba(216, 205, 180, 0.14);
  padding-top: 6px;
}

// THE SESSION PILL STANDS IN FRONT OF THE COMPOSER, and this drawer cannot
// move it.
//
// The pill (App.vue's `#session-pill`) dodges an open right-hand drawer by the
// drawer's own published width — but only for a drawer NAMED in App's
// `rightDrawerOpen`, which lists the four that existed before this one and says
// in as many words that a new drawer is added there "and nowhere else". This
// lane does not edit App.vue, and duplicating the dodge here is exactly the
// drift that instruction exists to prevent — so the drawer yields instead of
// competing: it keeps its own bottom clear by the pill's height, so the entry
// row is never underneath it.
//
// The ONE-LINE FIX belongs in App.vue (`|| this.modals.chatDrawer` in
// `rightDrawerOpen`), after which the pill steps aside like it does for the
// other four and this rule can go. Kept to a bottom RESERVE on purpose — no
// width, no position, nothing that has to be kept in step with the pill if it
// ever changes shape.
//
// It applies on the phone too. The sheet form does not escape this: the pill's
// step UP onto a sheet's top edge is gated on the same App-side flag, so on a
// phone the pill lands on the composer exactly as it does on the desktop.
// Measured, not guessed: the pill stands 10px off the bottom edge and is 38px
// tall with a mouse, 58px with a finger (its rows carry a 40px minimum tap
// height on a coarse pointer). The reserve clears the taller of the two on each.
.chat-drawer.pill-below .ct-compose {
  padding-bottom: 52px;
  @media (pointer: coarse) {
    padding-bottom: 72px;
  }
}

.ct-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 5px;
}
.ct-target {
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
  // an armed WHISPER goes purple rather than blood: blood is "chosen" all over
  // this app, and purple is what a whisper is drawn in three lines above
  &.is-whisper.on {
    background: rgba(60, 44, 78, 0.95);
    border-color: rgba(150, 130, 175, 0.75);
    color: #efe6ff;
  }
}

.ct-entry {
  display: flex;
  gap: 6px;
  align-items: stretch;
}
.ct-input {
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
.ct-send {
  @include control-icon-btn(38px, 30px, 44px, 40px);
  flex: none;
}

.ct-error {
  margin: 6px 2px 0;
  font-size: 12px;
  color: #ff7070;
}
.ct-note {
  margin: 6px 2px 0;
  font-size: 12px;
  opacity: 0.55;
}

@include right-drawer-slide;
</style>
