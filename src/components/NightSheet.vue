<template>
  <!-- Golem fork (FT-860): THE NIGHT SHEET — the storyteller's ordered
       checklist, standing where the build panel stood.

       This component is mounted for the STORYTELLER ONLY (App.vue gates it on
       !isSpectator), and it reads the night/roster getter, which returns an
       empty list to anybody else. Both together are deliberate: the ordering
       of who wakes names the characters in play, so it is grimoire-grade
       secret in every visibility mode, including "everyone".

       The phase bar renders even with the sheet switched off — swapping day
       and night is the storyteller's control whatever they think of the log. -->
  <div class="night-sheet" :class="{ 'is-night': isNight, 'has-list': showList }">
    <!-- ── the phase bar: which night it is, and the button that moves it ── -->
    <div class="phase">
      <span class="phase-now">
        <img v-if="isNight" class="phase-mark" :src="moonMark" alt="" />
        <font-awesome-icon v-else icon="sun" class="phase-sun" />
        {{ phaseLabel }}
      </span>
      <button
        type="button"
        class="phase-flip"
        :title="flipHint"
        @click="flipPhase"
      >
        {{ isNight ? "Day breaks" : "Night falls" }}
      </button>
      <span class="phase-progress" v-if="showList && roster.length">
        {{ progress.done }} / {{ progress.total }}
      </span>
    </div>

    <!-- ── the checklist ─────────────────────────────────────────────────── -->
    <template v-if="showList">
      <p class="ns-empty" v-if="!roster.length">
        Nobody wakes tonight.
      </p>
      <ul class="ns-rows" v-else v-blood-scroll>
        <li
          v-for="row in roster"
          :key="row.key"
          class="ns-row"
          :class="['team-' + (row.role.team || 'townsfolk'), { done: entryFor(row).done }]"
        >
          <span
            class="ns-check"
            :title="entryFor(row).done ? 'Not done yet' : 'Mark this one done'"
            tabindex="0"
            role="checkbox"
            :aria-checked="String(entryFor(row).done)"
            @click="toggleDone(row)"
            @keyup.enter="toggleDone(row)"
            @keyup.space="toggleDone(row)"
          >
            <font-awesome-icon
              :icon="entryFor(row).done ? 'check-square' : 'square'"
            />
          </span>
          <span class="ns-ord" :title="'Night order ' + row.night">{{
            row.order
          }}</span>
          <span
            class="ns-icon"
            :style="{ backgroundImage: `url(${roleIconUrl(row.role)})` }"
          ></span>
          <span class="ns-who">
            <b>{{ row.role.name }}</b>
            <small>{{ row.player.name || "Open seat" }}</small>
          </span>

          <span class="ns-acts">
            <!-- the TARGETS, sized to the role (see golem/nightLog) -->
            <select
              v-for="slot in row.slots"
              :key="slot"
              class="ns-target"
              :title="'Who they chose (' + slot + ' of ' + row.slots + ')'"
              :value="entryFor(row).targets[slot - 1]"
              @change="setTarget(row, slot - 1, $event.target.value)"
            >
              <option :value="-1">—</option>
              <option
                v-for="(p, i) in players"
                :key="i"
                :value="i"
                >{{ i + 1 }}. {{ p.name || "Open" }}</option
              >
            </select>

            <!-- WHAT THEY WERE TOLD — three states, because "nothing was
                 signalled" and "I told them no" are different facts and a
                 checkbox cannot hold both. -->
            <button
              type="button"
              class="ns-told"
              :class="pingClass(row)"
              :title="pingHint(row)"
              @click="cyclePing(row)"
            >
              {{ pingLabel(row) }}
            </button>

            <!-- ...and whether that was a LIE. The pair is the whole point of
                 the log: told + false-info recovers the truth, where storing
                 the truth alone could never recover what the player heard. -->
            <span
              class="ns-lie"
              :class="{ on: entryFor(row).isFalseInfo }"
              tabindex="0"
              role="checkbox"
              :aria-checked="String(entryFor(row).isFalseInfo)"
              title="The information given was FALSE (drunk, poisoned, a misread)"
              @click="toggleLie(row)"
              @keyup.enter="toggleLie(row)"
            >
              <font-awesome-icon icon="exclamation-triangle" />
            </span>

            <span
              class="ns-note-toggle"
              :class="{ on: hasNote(row) || noteOpen[row.key] }"
              tabindex="0"
              title="Write down exactly what was said"
              @click="toggleNote(row)"
              @keyup.enter="toggleNote(row)"
            >
              <font-awesome-icon icon="pen" />
            </span>
          </span>

          <span class="ns-reminder">{{ row.reminder }}</span>

          <input
            v-if="noteOpen[row.key]"
            class="ns-note"
            type="text"
            :value="entryFor(row).told.text"
            placeholder="What you told them — the words, not the truth"
            spellcheck="false"
            @input="setNote(row, $event.target.value)"
          />
        </li>
      </ul>
    </template>
  </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { entryId } from "../golem/nightLog";
// the night marks the script drawer's tabs already wear
import moonFirst from "../assets/moon-first.png";
import moonOther from "../assets/moon-other.png";

export default {
  name: "NightSheet",
  data() {
    return {
      moonFirst,
      moonOther,
      // which rows have their note field open (view state, not log state)
      noteOpen: {}
    };
  },
  computed: {
    ...mapState(["grimoire", "session", "night"]),
    ...mapState("players", ["players"]),
    ...mapGetters({
      rawRoster: "night/roster",
      progress: "night/progress",
      isFirstNight: "night/isFirstNight"
    }),
    isNight() {
      return this.grimoire.isNight;
    },
    /** The checklist shows at night, and only when the sheet is switched on. */
    showList() {
      return this.night.mode !== "off" && this.isNight;
    },
    /** Rows carry their own render key so the note map survives re-sorts. */
    roster() {
      return this.rawRoster.map(row => ({
        ...row,
        key: entryId(this.night.day, row.seat, row.role.id)
      }));
    },
    /** Every stored entry for tonight, by id. */
    entriesById() {
      const map = {};
      this.night.entries.forEach(e => {
        map[e.id] = e;
      });
      return map;
    },
    moonMark() {
      return this.isFirstNight ? this.moonFirst : this.moonOther;
    },
    phaseLabel() {
      if (!this.night.day) return "Before the first night";
      return (this.isNight ? "Night " : "Day ") + this.night.day;
    },
    flipHint() {
      return this.isNight
        ? "Wake the town — the log stays on Night " + this.night.day
        : "Night " + (this.night.day + 1) + " begins, and the log moves with it";
    }
  },
  methods: {
    /**
     * The row's stored entry, or a blank stand-in that is NOT stored. A row is
     * born on its first write (the night/write action), so the log never fills
     * with rows the storyteller walked past without recording.
     */
    entryFor(row) {
      const stored = this.entriesById[row.key];
      if (stored) return stored;
      return {
        targets: new Array(row.slots).fill(-1),
        targetNames: new Array(row.slots).fill(""),
        told: { ping: null, text: "" },
        isFalseInfo: false,
        done: false
      };
    },
    write(row, patch) {
      this.$store.dispatch("night/write", { row, patch });
    },
    roleIconUrl(role) {
      if (role.golemIconData) return role.golemIconData;
      const base = this.$store.getters.rolesJSONbyId;
      const id = base.has(role.id) ? role.id : role.imageAlt || "custom";
      try {
        return require("../assets/icons/" + id + ".png");
      } catch (e) {
        return require("../assets/icons/custom.png");
      }
    },
    toggleDone(row) {
      this.write(row, { done: !this.entryFor(row).done });
    },
    toggleLie(row) {
      this.write(row, { isFalseInfo: !this.entryFor(row).isFalseInfo });
    },
    toggleNote(row) {
      this.$set(this.noteOpen, row.key, !this.noteOpen[row.key]);
    },
    hasNote(row) {
      return !!this.entryFor(row).told.text;
    },
    setNote(row, text) {
      const told = this.entryFor(row).told;
      this.write(row, { told: { ping: told.ping, text } });
    },
    setTarget(row, slot, value) {
      const entry = this.entryFor(row);
      const seat = parseInt(value, 10);
      const targets = entry.targets.slice();
      const names = entry.targetNames.slice();
      targets[slot] = isNaN(seat) ? -1 : seat;
      const player = this.players[targets[slot]];
      // the name is stamped ALONGSIDE the seat because seats move: a replay
      // needs the person the storyteller was pointing at tonight
      names[slot] = player ? player.name : "";
      this.write(row, { targets, targetNames: names });
    },
    /** null → yes → no → null. */
    cyclePing(row) {
      const told = this.entryFor(row).told;
      const next = told.ping === null ? true : told.ping === true ? false : null;
      this.write(row, { told: { ping: next, text: told.text } });
    },
    pingLabel(row) {
      const p = this.entryFor(row).told.ping;
      return p === null ? "—" : p ? "Yes" : "No";
    },
    pingClass(row) {
      const p = this.entryFor(row).told.ping;
      return { yes: p === true, no: p === false, none: p === null };
    },
    pingHint(row) {
      const p = this.entryFor(row).told.ping;
      if (p === null) return "Nothing signalled yet — click to log what you told them";
      return p
        ? "You told them YES. Click for no."
        : "You told them NO. Click to clear.";
    },
    /**
     * Swap the phase. The day counter moves inside the root toggleNight
     * mutation, so this button and the S hotkey stay in step by construction.
     * Clearing the block on nightfall mirrors Menu.toggleNight.
     */
    flipPhase() {
      this.$store.commit("toggleNight");
      if (this.grimoire.isNight) {
        this.$store.commit("session/setMarkedPlayer", -1);
      }
    }
  }
};
</script>

<style scoped lang="scss">
// the sheet stands where the build panel stands — same plate, same rules
.night-sheet {
  position: absolute;

  // ABOVE THE SEATS. The build panel gets away with z-index 3 because at
  // 363px it nests inside the ring's hole and never meets a chair. The
  // checklist needs ~700px to hold a role, a seat, two target pickers and a
  // reminder, so it crosses the ring — and the seats carry z-index 1…N (the
  // 12 o'clock chair takes the seat count itself), which drew their name
  // plates straight over the sheet's rows.
  //
  // 19 clears every chair at rest and still sits UNDER the right-hand drawers
  // at 20, which is the order that matters: opening the grimoire or the script
  // must cover the sheet, not slide under it. A HOVERED seat still lifts to 25
  // and wins, which is fine — that is a deliberate reach for a chair.
  z-index: 19;
  text-align: center;
  max-width: calc(100vw - 20px);
  max-height: calc(100vh - 20px);

  // DAY, or the sheet switched off: the bar alone, a small pill that drops
  // clear of the town-centre plate instead of sitting on it
  &:not(.has-list) {
    transform: translateY(105px);
  }

  &.has-list {
    width: 700px;
    display: flex;
    flex-direction: column;
    padding: 12px 16px;
    // opaque enough to WIN. At 0.88 the clock face, the script's logo and
    // TownInfo's counts read straight through the rows — "Night phase" landed
    // across the Fortune Teller's line. The sheet is a plate on the table, not
    // a pane of glass.
    background: rgba(0, 0, 0, 0.95);
    border: 3px solid black;
    border-radius: 10px;
    box-shadow: 0 0 10px black;
    overflow: hidden;
  }

  // PHONE: the sheet is the bottom half of the screen, the way the build
  // panel is — the ring keeps the top (TownSquare's own rule).
  @media (pointer: coarse) and (orientation: portrait) {
    &.has-list {
      position: fixed;
      left: 6px;
      right: 6px;
      bottom: 58px;
      width: auto;
      max-width: none;
      max-height: 52vh;
      padding: 8px 10px;
      background: rgba(0, 0, 0, 0.94);
    }
  }
}

// ── the phase bar ───────────────────────────────────────────────────────────
.phase {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 5px 12px;
  background: rgba(0, 0, 0, 0.7);
  border: 3px solid black;
  border-radius: 10px;
  box-shadow: 0 0 10px black;
  white-space: nowrap;

  .has-list & {
    margin: -4px -4px 8px;
    box-shadow: none;
    border-color: #2a2a2a;
  }

  .phase-now {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
  }
  .phase-mark {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }
  .phase-sun {
    width: 16px;
    color: #d8b45a;
  }
  .phase-flip {
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
    font-size: 95%;
    color: white;
    padding: 3px 14px;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #3d3d3d;
    border-radius: 6px;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      border-color: #a01414;
      color: #ff8a8a;
      outline: none;
    }
    @media (pointer: coarse) {
      min-height: 40px;
      padding: 0 16px;
    }
  }
  .phase-progress {
    opacity: 0.6;
    font-size: 85%;
  }
}

// ── the checklist ───────────────────────────────────────────────────────────
.ns-empty {
  opacity: 0.6;
  margin: 14px 0 6px;
}

.ns-rows {
  overflow-y: auto;
  flex-grow: 1;
  min-height: 0;
  text-align: left;
}

.ns-row {
  display: grid;
  // check | order | icon | who | actions
  grid-template-columns: 22px 22px 34px minmax(88px, 1fr) auto;
  align-items: center;
  gap: 4px 8px;
  padding: 4px 4px 5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  border-left: 3px solid transparent;

  // the team's own colour on the row's edge, the palette the workbench uses
  &.team-townsfolk {
    border-left-color: #1f65ff;
  }
  &.team-outsider {
    border-left-color: #46d5ff;
  }
  &.team-minion {
    border-left-color: #ff6900;
  }
  &.team-demon {
    border-left-color: #ce0100;
  }
  &.team-traveler {
    border-left-color: #cc04ff;
  }

  &.done {
    opacity: 0.45;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .ns-check {
    cursor: pointer;
    opacity: 0.75;
    &:hover,
    &:focus-visible {
      opacity: 1;
      color: #7ed67e;
      outline: none;
    }
  }
  .ns-ord {
    text-align: right;
    font-size: 13px;
    opacity: 0.55;
  }
  .ns-icon {
    width: 34px;
    height: 34px;
    background-size: cover;
    background-position: center;
  }
  .ns-who {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
    min-width: 0;
    b {
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    small {
      opacity: 0.6;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .ns-acts {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ns-target {
    max-width: 118px;
    font-size: 12px;
    padding: 2px 4px;
  }
  .ns-told {
    min-width: 46px;
    font-family: inherit;
    font-size: 12px;
    color: white;
    padding: 3px 6px;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid #3d3d3d;
    border-radius: 5px;
    cursor: pointer;
    &:focus-visible {
      outline: none;
      border-color: #a01414;
    }
    &.yes {
      color: #7ed67e;
      border-color: #2f6b2f;
    }
    &.no {
      color: #ff8a8a;
      border-color: #7d0e0e;
    }
    &.none {
      opacity: 0.55;
    }
  }
  .ns-lie,
  .ns-note-toggle {
    cursor: pointer;
    opacity: 0.28;
    width: 15px;
    &:hover,
    &:focus-visible {
      opacity: 0.85;
      outline: none;
    }
    &.on {
      opacity: 1;
    }
  }
  .ns-lie.on {
    color: #ffb03a;
  }
  .ns-note-toggle.on {
    color: #ff8a8a;
  }

  // the reminder runs the full width under the row, dim and small
  .ns-reminder {
    grid-column: 4 / -1;
    font-size: 12px;
    opacity: 0.5;
    line-height: 1.25;
  }
  .ns-note {
    grid-column: 3 / -1;
    width: 100%;
    font-size: 12px;
  }

  // a finger needs a box, not a glyph
  @media (pointer: coarse) {
    grid-template-columns: 34px 20px 30px minmax(70px, 1fr);
    .ns-check,
    .ns-lie,
    .ns-note-toggle {
      box-sizing: content-box;
      padding: 9px;
      margin: -9px;
    }
    .ns-acts {
      grid-column: 1 / -1;
      flex-wrap: wrap;
      padding-left: 34px;
    }
    .ns-reminder {
      grid-column: 1 / -1;
      padding-left: 34px;
    }
    .ns-told {
      min-height: 36px;
    }
  }
}
</style>
