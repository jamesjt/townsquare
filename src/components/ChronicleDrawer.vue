<template>
  <!-- Golem fork (FT-886): THE CHRONICLE — a door onto THIS game's timeline.
       The hourglass beside it opens the ledger of games already finished; this
       is the one surface for what has happened in the game being played, which
       until now was scattered across the night log, the vote history and the
       seats themselves.

       It assembles, it does not record. Everything rendered here comes from
       golem/chronicle, which is handed the night rows the VIEWER may read —
       the night/visibleEntries getter — plus the vote history and the seats.
       A storyteller's log reaches this component; a player's does not, because
       the getter returns them nothing (in "storyteller" mode) or only their own
       field-projected rows (in "everyone"). The secrets are absent from the
       data before this file sees it, so they are absent from the DOM rather
       than present and hidden — which is the way the night order leaked once
       and the reason this drawer reads a getter instead of state.entries.

       OLDEST FIRST, scrolled to the newest on open. The vote history is a
       ledger and reads newest-anywhere; a chronicle is a story and reads
       forward. It is also what CHAT would need: every message surface ever
       built runs oldest-at-the-top with the newest in view, so the one
       ordering decision here is made in the direction that will not have to be
       undone. -->
  <transition name="sd-slide">
    <div
      class="chronicle-drawer"
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
        <!-- FT-951: THE close mark, shared with every close control in the
             app (src/components/CloseX.vue) — this rule keeps both
             @pointerup and @click bound directly to it (the phone's
             pointer-driven dismiss and the desktop click), same as before. -->
        <CloseX
          class="sd-close"
          title="Close the chronicle"
          @pointerup.native="sheetDismiss"
          @click.native="sheetDismiss"
        />
        <h3 class="sd-title">
          <img class="sd-mark" :src="quill" alt="" />
          <span>Chronicle</span>
        </h3>
      </div>

      <!-- THE role hover card, the same component the seats, the grimoire rows
           and the workbench shelf use. It is armed only where a row carries a
           role ID — which is a storyteller's row and never a player's, since
           night/myEntries projects the character's NAME and no id to look it
           up with. A player therefore gets no card at all here. -->
      <RoleHoverCard
        v-if="cardRole"
        :role="cardRole"
        :anchor="cardAnchor"
        @dismiss="hideCard"
      />

      <div
        class="sd-view ch-body"
        ref="scroll"
        v-blood-scroll
        @scroll.passive="hideCard"
      >
        <p class="ch-empty" v-if="isEmpty">
          Nothing has happened yet. Nights, nominations and the dead are written
          down here as the game goes.
        </p>

        <section
          v-for="chapter in chronicle.chapters"
          :key="chapter.key"
          class="ch-chapter"
          :class="{ 'is-night': chapter.phase === 'night', now: chapter.isNow }"
        >
          <h4>
            <span class="ch-mark" aria-hidden="true"></span>
            {{ chapter.label }}
            <span class="ch-now" v-if="chapter.isNow">now</span>
          </h4>
          <p class="ch-note" v-if="chapter.note">{{ chapter.note }}</p>
          <p class="ch-quiet" v-if="!chapter.events.length">
            Nothing recorded yet.
          </p>

          <div
            v-for="event in chapter.events"
            :key="event.id"
            class="ch-row"
            :class="[
              'kind-' + event.kind,
              event.roleId ? 'team-' + teamOf(event.roleId) : '',
            ]"
          >
            <!-- ── A NIGHT ─────────────────────────────────────────────── -->
            <template v-if="event.kind === 'night'">
              <span class="ch-when" v-if="event.at">{{ clock(event.at) }}</span>
              <span
                class="ch-role"
                :tabindex="event.roleId ? 0 : -1"
                @mouseenter="showCard(event, $event)"
                @mouseleave="hideCard"
                >{{ event.roleName }}</span
              >
              <!-- whose chair. A storyteller's row says; a player's own row
                   has no seat name to say and does not need one. -->
              <span class="ch-seat" v-if="event.seatName">{{
                event.seatName
              }}</span>
              <!-- FT-861's two characters: only ever on a storyteller's row,
                   because a player's projection carries no true role at all -->
              <span
                class="ch-true"
                v-if="event.trueRoleName"
                title="What the seat really is"
                >really {{ event.trueRoleName }}</span
              >
              <span class="ch-chose" v-if="event.targetNames.length">
                chose <b>{{ event.targetNames.join(" and ") }}</b>
              </span>
              <span
                class="ch-told"
                :class="{
                  yes: event.told.ping === true,
                  no: event.told.ping === false,
                }"
                v-if="event.told.ping !== null"
                >{{ event.told.ping ? "Yes" : "No" }}</span
              >
              <span class="ch-told" v-if="event.told.number !== null">{{
                event.told.number
              }}</span>
              <span class="ch-told" v-if="event.told.characterName">{{
                event.told.characterName
              }}</span>
              <!-- the storyteller's private mark that what was said was a lie.
                   The key does not exist on a player's projected row, so this
                   branch has nothing to render there. -->
              <span
                class="ch-false"
                v-if="event.isFalseInfo"
                title="The information given was false"
                >false</span
              >
              <span class="ch-text" v-if="event.told.text">{{
                event.told.text
              }}</span>
              <span
                class="ch-quiet-inline"
                v-if="!event.hasTold && !event.targetNames.length"
                >woke</span
              >
            </template>

            <!-- ── A NOMINATION ────────────────────────────────────────── -->
            <template v-else-if="event.kind === 'nomination'">
              <span class="ch-when" v-if="event.at">{{ clock(event.at) }}</span>
              <span class="ch-nominator">{{ event.nominator }}</span>
              <span class="ch-nominee">{{ event.nominee }}</span>
              <span class="ch-type">{{ event.type }}</span>
              <span class="ch-tally">
                {{ event.votes.length }}
                <font-awesome-icon icon="hand-paper" />
                of {{ event.majority }}
              </span>
              <!-- What the record supports, and nothing more. A nomination
                   reaching majority is not a death: the storyteller decides,
                   and nothing anywhere writes down what they decided. -->
              <span
                class="ch-outcome"
                :class="{ carried: event.reachedMajority }"
                >{{
                  event.reachedMajority ? "majority reached" : "no majority"
                }}</span
              >
              <span class="ch-voters" v-if="event.votes.length">{{
                event.votes.join(", ")
              }}</span>
            </template>
          </div>
        </section>

        <!-- ── THE DEAD ───────────────────────────────────────────────────
             A roll, not a run of events, because the app records THAT a seat
             died and never WHEN: `isDead` is a boolean with no time beside it
             and nothing writes one. Putting these on the timeline would mean
             inventing the moment. Names only — the shroud is public at the
             table, the character under it is not. -->
        <section class="ch-chapter ch-dead" v-if="chronicle.dead.length">
          <h4>
            <span class="ch-mark" aria-hidden="true"></span>
            The dead
          </h4>
          <p class="ch-note">The app records that they died, not when.</p>
          <div
            v-for="soul in chronicle.dead"
            :key="'dead' + soul.seat"
            class="ch-row kind-death"
          >
            <span class="ch-seatno">{{ soul.seat + 1 }}</span>
            <span class="ch-name">{{ soul.name }}</span>
            <span class="ch-voteless" v-if="soul.isVoteless"
              >ghost vote spent</span
            >
          </div>
        </section>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import RoleHoverCard from "./RoleHoverCard";
import CloseX from "./CloseX";
import rightDrawer from "../golem/rightDrawer";
// the phone's drag-to-dismiss (the sheet form's gesture half)
import bottomSheet from "../golem/bottomSheet";
import { buildChronicle } from "../golem/chronicle";
// the strip's own quill — the mark that opens this drawer leads its title
import quill from "../assets/ui-chronicle.png";

// the same rest-before-it-appears the grimoire rows use
const HOVER_DELAY = 260;

export default {
  name: "ChronicleDrawer",
  components: { RoleHoverCard, CloseX },
  mixins: [
    bottomSheet,
    rightDrawer({
      modal: "chronicleDrawer",
      storageKey: "golem.chronicleDrawerW",
      // between the script's 400 and the vote log's 480: the rows are one
      // line each until a long voter list wraps
      defaultWidth: 440,
    }),
  ],
  data() {
    return { quill, cardRole: null, cardAnchor: null };
  },
  computed: {
    ...mapState(["session", "grimoire", "night"]),
    ...mapState("players", ["players"]),
    // The night rows THIS VIEWER may read. Never state.entries — see the
    // night module's own note on why that distinction is the whole feature.
    ...mapGetters({ visibleEntries: "night/visibleEntries" }),
    chronicle() {
      return buildChronicle({
        entries: this.visibleEntries,
        voteHistory: this.session.voteHistory,
        players: this.players,
        day: this.night.day,
        isNight: this.grimoire.isNight,
      });
    },
    isEmpty() {
      return !this.chronicle.count && !this.chronicle.dead.length;
    },
  },
  watch: {
    // Land on the newest, the way every message surface does — and the way a
    // reader of a forward-ordered log wants to arrive.
    isOpen(open) {
      if (open) this.$nextTick(this.toEnd);
    },
    "chronicle.count"() {
      if (this.isOpen) this.$nextTick(this.toEnd);
    },
  },
  methods: {
    toEnd() {
      const el = this.$refs.scroll;
      if (el) el.scrollTop = el.scrollHeight;
    },
    /** HH:MM. Every event that has a time has it in ms by the time it is here. */
    clock(at) {
      const t = new Date(at);
      if (isNaN(t.getTime())) return "";
      return (
        t.getHours().toString().padStart(2, "0") +
        ":" +
        t.getMinutes().toString().padStart(2, "0")
      );
    },
    /** A role object for a row that carries an id — the same lookup the socket
     *  uses. Only a storyteller's rows carry one. */
    roleOf(id) {
      if (!id) return null;
      return (
        this.$store.state.roles.get(id) ||
        this.$store.getters.rolesJSONbyId.get(id) ||
        null
      );
    },
    teamOf(id) {
      const role = this.roleOf(id);
      return (role && role.team) || "townsfolk";
    },
    /** Rest on a character and the card tells you what it does. */
    showCard(event, e) {
      if (!event.roleId) return;
      if (!window.matchMedia("(hover: hover)").matches) return;
      const role = this.roleOf(event.roleId);
      if (!role) return;
      const el = e.currentTarget;
      clearTimeout(this.$options.cardTimer);
      this.$options.cardTimer = setTimeout(() => {
        this.cardAnchor = el;
        this.cardRole = role;
      }, HOVER_DELAY);
    },
    hideCard() {
      clearTimeout(this.$options.cardTimer);
      this.cardRole = null;
      this.cardAnchor = null;
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
@import "../drawer.scss";

.chronicle-drawer {
  @include right-drawer(#4a0d0d);
  @include sheet-handle;
}

@include right-drawer-slide;

.ch-body {
  overflow-y: auto;
  font-size: 90%;
}

.ch-empty {
  opacity: 0.55;
  padding: 20px 4px;
  line-height: 1.4;
}

// ── A CHAPTER ──────────────────────────────────────────────────────────────
.ch-chapter {
  margin-bottom: 14px;

  h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
    font-family: PiratesBay, sans-serif;
    font-weight: normal;
    font-size: 15px;
    opacity: 0.8;
    margin-bottom: 5px;
    // the rule that runs off the heading to the drawer's edge — the same
    // engraved-page feel the night sheet's sections have
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

  // the small lozenge before the heading: a moon for a night, a sun for a day
  .ch-mark {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #d8cdb4;
    flex-shrink: 0;
    opacity: 0.7;
  }
  &.is-night .ch-mark {
    background: #8f8fd8;
    box-shadow: inset -3px 0 0 rgba(0, 0, 0, 0.65);
  }

  &.now h4 {
    opacity: 1;
  }
  .ch-now {
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 8px;
    background: rgba(216, 205, 180, 0.16);
    opacity: 0.85;
  }
}

.ch-note,
.ch-quiet {
  opacity: 0.5;
  font-size: 88%;
  font-style: italic;
  line-height: 1.35;
  margin: 0 0 5px 16px;
}

// ── A ROW ──────────────────────────────────────────────────────────────────
.ch-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 7px;
  padding: 4px 8px;
  margin-bottom: 3px;
  background: rgba(255, 255, 255, 0.05);
  border-left: 3px solid rgba(216, 205, 180, 0.3);
  border-radius: 0 5px 5px 0;
  line-height: 1.35;
}

.ch-when {
  font-size: 11px;
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
}

// the character. Team-tinted where the row knows its role (a storyteller's);
// plain where it does not (a player reading their own notes).
.ch-role {
  font-weight: bold;
}
.team-townsfolk .ch-role {
  color: $townsfolk;
}
.team-outsider .ch-role {
  color: $outsider;
}
.team-minion .ch-role {
  color: $minion;
}
.team-demon .ch-role {
  color: $demon;
}
.team-traveler .ch-role {
  color: $traveler;
}
.team-fabled .ch-role {
  color: $fabled;
}

.ch-seat {
  opacity: 0.85;
  &:before {
    content: "(";
    opacity: 0.5;
  }
  &:after {
    content: ")";
    opacity: 0.5;
  }
}

.ch-true {
  font-size: 11px;
  opacity: 0.6;
  font-style: italic;
}

.ch-chose {
  opacity: 0.85;
}

.ch-told {
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

.ch-false {
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 8px;
  color: #ffb4b4;
  background: rgba(128, 0, 0, 0.55);
}

.ch-text {
  flex-basis: 100%;
  opacity: 0.8;
  font-style: italic;
}

.ch-quiet-inline {
  opacity: 0.45;
  font-style: italic;
}

// ── A NOMINATION ───────────────────────────────────────────────────────────
.kind-nomination {
  border-left-color: rgba(206, 1, 0, 0.6);

  .ch-nominator {
    font-weight: bold;
    color: $townsfolk;
  }
  .ch-nominee {
    font-weight: bold;
    color: $demon;
    &:before {
      content: "→ ";
      color: rgba(255, 255, 255, 0.5);
      font-weight: normal;
    }
  }
  .ch-type {
    font-size: 11px;
    opacity: 0.65;
  }
  .ch-tally {
    margin-left: auto;
    white-space: nowrap;
  }
  .ch-outcome {
    flex-basis: 100%;
    font-size: 11px;
    opacity: 0.6;
    &.carried {
      opacity: 0.95;
      color: #ffb4b4;
    }
  }
  .ch-voters {
    flex-basis: 100%;
    font-size: 12px;
    opacity: 0.7;
    line-height: 1.3;
  }
}

// ── THE DEAD ───────────────────────────────────────────────────────────────
.kind-death {
  border-left-color: rgba(216, 205, 180, 0.5);

  .ch-seatno {
    min-width: 18px;
    font-size: 11px;
    opacity: 0.5;
    font-variant-numeric: tabular-nums;
  }
  .ch-name {
    font-weight: bold;
  }
  .ch-voteless {
    font-size: 11px;
    opacity: 0.55;
    font-style: italic;
  }
}
</style>
