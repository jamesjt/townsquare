<template>
  <!-- Golem fork (FT-860, reworked FT-862): THE NIGHT SHEET — the
       storyteller's ordered checklist, standing where the build panel stood.

       This component is mounted for the STORYTELLER ONLY (App.vue gates it
       on !isSpectator), and it reads the night/roster getter, which returns
       an empty list to anybody else. Both together are deliberate: the
       ordering of who wakes names the characters in play, so it is
       grimoire-grade secret in every visibility mode, including "everyone".
       A player reaches NONE of this markup by any route — verified in the
       rendered DOM, not just by this v-if (see the FT-862 report).

       FT-862 also moved "Day N / Night N" OUT of this file — it now lives in
       the town readout above the clock face (another lane), because every
       player is meant to see it. What stays here, storyteller-only: the
       progress count, and the single Day-breaks/Night-falls button. -->
  <div class="night-sheet" :class="{ 'is-night': isNight, 'has-list': showList }">
    <!-- OFF / DAYTIME: no checklist to show, so the sheet is just the one
         control that gets the storyteller INTO a night — nothing else
         belongs in a bar with one button in it. -->
    <div class="phase pill" v-if="!showList">
      <button type="button" class="phase-flip" :title="flipHint" @click="flipPhase">
        {{ flipLabel }}
      </button>
    </div>

    <!-- ── the checklist ─────────────────────────────────────────────────── -->
    <template v-if="showList">
      <div class="phase" v-if="roster.length">
        <span class="phase-progress">{{ progress.done }} / {{ progress.total }}</span>
      </div>

      <p class="ns-empty" v-if="!roster.length">Nobody wakes tonight.</p>

      <ul class="ns-rows" v-else v-blood-scroll>
        <li
          v-for="row in roster"
          :key="row.key"
          class="ns-row"
          :class="[
            'team-' + (row.role.team || 'townsfolk'),
            {
              done: entryFor(row).done,
              // FT-861: this row is a PERFORMANCE — the seat is being walked
              // through a character it only thinks it has
              performance: row.isPerformance
            }
          ]"
        >
          <!-- THE DONE STATE. A left-edge tick, not a big object: the row's
               OWN dimming (see .done above) already says "finished" at a
               glance, so the mark itself only needs to be findable, not
               loud. Blood red (#800000, user-named) once checked; the touch
               target stays 44px via padding even though the ink shrank. -->
          <span
            class="ns-check"
            :class="{ checked: entryFor(row).done }"
            :title="entryFor(row).done ? 'Done — click to reopen' : 'Mark this one done'"
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

          <!-- IDENTITY (left zone): the character, whose chair it is, and
               the instruction to read aloud — the things that carry
               MEANING, sized to be read first. -->
          <div class="ns-identity">
            <span class="ns-ord" :title="'Night order ' + row.night">{{ row.order }}</span>
            <span
              class="ns-icon"
              :style="{ backgroundImage: `url(${roleIconUrl(row.role)})` }"
            ></span>
            <span class="ns-who">
              <b>{{ row.role.name }}</b>
              <small>{{ row.player.name || "Open seat" }}</small>
              <!-- FT-861: THE OTHER CHARACTER. The row names the one that
                   ACTS in full, and the one the storyteller must not forget
                   in a line under it — because which of the two it is
                   decides whether anything actually happens. -->
              <small class="ns-truth" v-if="row.isPerformance">
                <font-awesome-icon icon="theater-masks" />
                a performance — really the {{ row.trueRole.name }}
              </small>
              <small class="ns-truth" v-else-if="row.isBelieving">
                <font-awesome-icon icon="theater-masks" />
                believes they are the {{ row.shownRole.name }}
              </small>
            </span>
          </div>

          <!-- THE ANSWER (right zone): what a storyteller records tonight.
               FT-862: this used to be a yes/no toggle on EVERY row — wrong
               for the Undertaker (a character) or the Empath (a number).
               golem/nightInfo's field table says which control belongs
               here; PLAYER-typed fields never appear a second time, they're
               already the SeatPickers to the left of this zone. -->
          <div class="ns-answer">
            <SeatPicker
              v-for="slot in row.slots"
              :key="'seat' + slot"
              class="ns-target"
              :players="players"
              :picked-seat="entryFor(row).targets[slot - 1]"
              :show-role="isStoryteller"
              :icon-for="p => roleIconUrl(p.role)"
              :title="'Who they chose (' + slot + ' of ' + row.slots + ')'"
              @pick="seat => setTarget(row, slot - 1, seat)"
            />

            <template v-for="(field, fi) in extraFieldsFor(row).fields">
              <button
                v-if="kindOf(field) === 'boolean'"
                :key="'f' + fi"
                type="button"
                class="ns-told"
                :class="pingClass(row)"
                :title="pingHint(row)"
                @click="cyclePing(row)"
              >
                {{ pingLabel(row) }}
              </button>

              <input
                v-else-if="kindOf(field) === 'number'"
                :key="'f' + fi"
                type="number"
                class="ns-num"
                :min="field.min"
                :max="field.max"
                :title="numberHint(field)"
                :value="entryFor(row).told.number"
                @input="setNumber(row, $event.target.value)"
              />

              <CharacterPicker
                v-else-if="kindOf(field) === 'character'"
                :key="'f' + fi"
                class="ns-charpick"
                :roles="scriptRoles"
                :picked-id="entryFor(row).told.characterId"
                :picked-name="entryFor(row).told.characterName"
                :icon-for="roleIconUrl"
                title="What you showed them — a character"
                @pick="c => setCharacter(row, c.id, c.name)"
              />

              <input
                v-else
                :key="'f' + fi"
                type="text"
                class="ns-free"
                placeholder="What you told them"
                spellcheck="false"
                :value="entryFor(row).told.text"
                @input="setNote(row, $event.target.value)"
              />
            </template>

            <!-- ...and whether it was a LIE — only offered where there is
                 information to have lied about (golem/nightInfo's
                 mayBeFalse). Poisoner/Monk/Butler/Imp tell nothing back, so
                 the question doesn't apply. -->
            <span
              v-if="extraFieldsFor(row).mayBeFalse"
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

            <!-- the free-text field above already IS "the exact words" —
                 offering the note pencil too would be two boxes for one
                 value -->
            <span
              v-if="!hasFreeTextField(row)"
              class="ns-note-toggle"
              :class="{ on: hasNote(row) || noteOpen[row.key] }"
              tabindex="0"
              title="Write down exactly what was said"
              @click="toggleNote(row)"
              @keyup.enter="toggleNote(row)"
            >
              <font-awesome-icon icon="pen" />
            </span>
          </div>

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

      <!-- FT-862: relocated from the top bar (user call — this button means
           "I have finished this list", so it belongs after the list, where
           the hand ends up, not above it where it invites a mis-tap before
           the night is worked through). A finished list makes it the
           obvious next step; an unfinished one keeps it quiet — never
           blocked either way, a storyteller may move the night on early. -->
      <button
        type="button"
        class="phase-flip bottom"
        :class="{ ready: allChecked }"
        :title="flipHint"
        @click="flipPhase"
      >
        <font-awesome-icon icon="check" v-if="allChecked" />
        {{ flipLabel }}
      </button>
    </template>
  </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { entryId } from "../golem/nightLog";
import { extraFields, renderableType } from "../golem/nightInfo";
import SeatPicker from "./SeatPicker";
import CharacterPicker from "./CharacterPicker";

export default {
  name: "NightSheet",
  components: { SeatPicker, CharacterPicker },
  data() {
    return {
      // which rows have their note field open (view state, not log state)
      noteOpen: {}
    };
  },
  computed: {
    ...mapState(["grimoire", "session", "night", "roles"]),
    ...mapState("players", ["players"]),
    ...mapGetters({
      rawRoster: "night/roster",
      progress: "night/progress"
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
    /**
     * The privacy gate golem/nightInfo's field table and SeatPicker both
     * need, computed here rather than assumed by either: this component
     * only ever mounts for the storyteller (App.vue's isSpectator check), so
     * in practice this is always true — but SeatPicker takes it as an
     * explicit prop rather than inferring it, and this is where that prop
     * comes from.
     */
    isStoryteller() {
      return !this.session.isSpectator;
    },
    /** The script's characters, for CharacterPicker's option list (a public
     *  fact — every player already knows the script from the Almanac). */
    scriptRoles() {
      return [...this.roles.values()];
    },
    flipLabel() {
      return this.isNight ? "Day breaks" : "Night falls";
    },
    flipHint() {
      return this.isNight
        ? "Wake the town — the log stays on Night " + this.night.day
        : "Night " + (this.night.day + 1) + " begins, and the log moves with it";
    },
    /** Every row checked off — the signal that flips the finish button from
     *  quiet to obvious (never blocking; a storyteller may move on early). */
    allChecked() {
      return this.roster.length > 0 && this.progress.done >= this.progress.total;
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
        told: { ping: null, number: null, characterId: "", characterName: "", text: "" },
        isFalseInfo: false,
        done: false
      };
    },
    write(row, patch) {
      this.$store.dispatch("night/write", { row, patch });
    },
    /** Patch `told` by merging over the row's CURRENT told, so setting one
     *  field (a number) never clobbers another already on the entry (a
     *  note). Every told-writing method below goes through this. */
    writeTold(row, patch) {
      const told = this.entryFor(row).told;
      this.write(row, { told: { ...told, ...patch } });
    },
    roleIconUrl(role) {
      if (!role) return "";
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
      this.writeTold(row, { text });
    },
    setTarget(row, slot, seat) {
      const entry = this.entryFor(row);
      const s = Number.isInteger(seat) ? seat : -1;
      const targets = entry.targets.slice();
      const names = entry.targetNames.slice();
      targets[slot] = s;
      // the name is stamped ALONGSIDE the seat because seats move: a replay
      // needs the person the storyteller was pointing at tonight
      const player = this.players[s];
      names[slot] = player ? player.name : "";
      this.write(row, { targets, targetNames: names });
    },
    /** null → yes → no → null. */
    cyclePing(row) {
      const p = this.entryFor(row).told.ping;
      const next = p === null ? true : p === true ? false : null;
      this.writeTold(row, { ping: next });
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
    setNumber(row, raw) {
      let n = parseInt(raw, 10);
      if (raw === "" || isNaN(n)) n = null;
      else n = Math.max(0, n);
      this.writeTold(row, { number: n });
    },
    numberHint(field) {
      const base = "What you showed them — a count";
      return field.min !== undefined && field.max !== undefined
        ? `${base} (${field.min}–${field.max})`
        : base;
    },
    setCharacter(row, id, name) {
      this.writeTold(row, { characterId: id, characterName: name });
    },
    /** golem/nightInfo's field list for this row, minus PLAYER fields —
     *  those are already the SeatPickers rendered just above this call. */
    extraFieldsFor(row) {
      return extraFields(row.role.id);
    },
    kindOf(field) {
      return renderableType(field.type);
    },
    hasFreeTextField(row) {
      return this.extraFieldsFor(row).fields.some(f => this.kindOf(f) === "text");
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
// ROW CONTROL HEIGHT CONTRACT: 30px desktop / 44px coarse-pointer — matched
// by hand in SeatPicker.vue and CharacterPicker.vue's own styles. A change
// to one changes all three.

// the sheet stands where the build panel stands — same plate, same rules
.night-sheet {
  position: absolute;
  z-index: 19;
  text-align: center;
  max-width: calc(100vw - 20px);
  max-height: calc(100vh - 20px);

  // DAY, or the sheet switched off: just the flip-into-night pill, clear of
  // the town-centre plate
  &:not(.has-list) {
    transform: translateY(105px);
  }

  &.has-list {
    // FT-862 (user call): "this whole thing is too wide" — a checklist is a
    // reading column, not a banner. 640px keeps two to three words of the
    // instruction line on one wrap without the row's identity and answer
    // zones flung to opposite edges of a mostly-empty plate.
    width: 100%;
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    padding: 10px 14px;
    // opaque enough to WIN — see the file's earlier history for why 0.88
    // wasn't (text from the plate behind it read straight through)
    background: rgba(0, 0, 0, 0.95);
    border: 3px solid black;
    border-radius: 10px;
    box-shadow: 0 0 10px black;
    overflow: hidden;
  }

  // PHONE: the sheet is the bottom half of the screen, the way the build
  // panel is — full width regardless of the desktop cap above (higher
  // specificity here wins over the bare `.has-list` rule).
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
      background: rgba(0, 0, 0, 0.96);
    }

    &:not(.has-list) {
      position: fixed;
      left: 6px;
      right: 6px;
      bottom: 58px;
      transform: none;
      display: flex;
      justify-content: center;
      z-index: 51;
    }
  }

  // LANDSCAPE PHONE
  @media (pointer: coarse) and (orientation: landscape) and (max-height: 500px) {
    position: fixed;
    top: 46px;
    right: 6px;
    left: auto;
    max-width: none;

    &:not(.has-list) {
      width: max(42vw, 330px);
      transform: none;
    }

    &.has-list {
      width: max(42vw, 330px);
      max-width: none;
      bottom: 50px;
      max-height: none;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.96);
    }
  }

  // A DRAWER IS OUT: the night sheet stands down, both orientations.
  @media (pointer: coarse) and (orientation: portrait) {
    #app.sheet-up & {
      display: none;
    }
  }
  @media (pointer: coarse) and (orientation: landscape) and (max-height: 500px) {
    #app.sheet-up & {
      display: none;
    }
  }
}

// ── the phase bar ───────────────────────────────────────────────────────────
// FT-862: down to a progress count (checklist showing) or nothing but the
// flip button (day/off) — "Day N/Night N" moved to the town readout, which
// every player sees; this stays storyteller-only.
.phase {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px 4px 7px;

  &.pill {
    background: rgba(0, 0, 0, 0.7);
    border: 3px solid black;
    border-radius: 10px;
    box-shadow: 0 0 10px black;
    padding: 4px 10px;
  }

  .phase-progress {
    opacity: 0.65;
    font-size: 90%;
    letter-spacing: 0.5px;
  }
}

.phase-flip {
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  font-size: 95%;
  color: white;
  padding: 5px 16px;
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

  // bottom-of-list placement: full width, so it reads as "the next step"
  // rather than a floating button
  &.bottom {
    width: 100%;
    margin-top: 8px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-shrink: 0;

    // FT-862 (user call, my read of "worth considering"): a FINISHED list
    // makes this the obvious next step — brighter, a hint of the blood-red
    // the done-state already wears, never disabled either way.
    &.ready {
      color: #ffd9d9;
      background: rgba(128, 0, 0, 0.35);
      border-color: #a01414;
      box-shadow: 0 0 10px rgba(160, 20, 20, 0.4);
      &:hover,
      &:focus-visible {
        background: rgba(160, 20, 20, 0.5);
      }
    }
  }

  @media (pointer: coarse) {
    min-height: 44px;
    padding: 0 16px;
    &.bottom {
      min-height: 48px;
    }
  }
}

// ── the checklist ───────────────────────────────────────────────────────────
.ns-empty {
  opacity: 0.6;
  margin: 10px 0 6px;
}

.ns-rows {
  overflow-y: auto;
  flex-grow: 1;
  min-height: 0;
  text-align: left;

  @media (pointer: coarse) {
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
}

.ns-row {
  display: grid;
  // state | identity | answer, instruction runs full width under both
  grid-template-columns: 26px minmax(150px, 1fr) auto;
  grid-template-areas:
    "state identity answer"
    ".     instruct instruct";
  column-gap: 10px;
  row-gap: 3px;
  align-items: center;
  padding: 7px 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  border-left: 3px solid transparent;

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

  // FT-862: shrunk (13px, low resting opacity) and recoloured blood red once
  // checked — the ink shrank, the touch target below did not
  .ns-check {
    grid-area: state;
    justify-self: center;
    cursor: pointer;
    font-size: 13px;
    opacity: 0.32;
    // The hover is BLOOD RED too (user call 2026-08-18) — green was the one
    // note on this sheet borrowed from outside the fork's palette, and a
    // green "about to mark done" next to a red "done" reads as two systems.
    &:hover,
    &:focus-visible {
      opacity: 1;
      color: #a52a2a;
      outline: none;
    }
    // BLOOD RED once checked (#800000, user-named — not in vars.scss as of
    // this fork's palette, checked 2026-08-18). Hover-after-checking stays
    // in the red family (undo it) rather than flashing back to the
    // before-checking green (do it).
    &.checked {
      opacity: 0.92;
      color: #800000;
      &:hover,
      &:focus-visible {
        color: #a52a2a;
      }
    }
  }

  .ns-identity {
    grid-area: identity;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .ns-ord {
    flex-shrink: 0;
    text-align: right;
    font-size: 11px;
    opacity: 0.5;
    width: 14px;
  }
  .ns-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    background-size: cover;
    background-position: center;
  }
  // FT-861: a PERFORMANCE row — the team stripe goes dashed, this wake
  // resolves into nothing
  &.performance {
    border-left-style: dashed;
  }
  &.performance:not(:hover) {
    background: rgba(184, 137, 47, 0.07);
  }

  .ns-who {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
    small.ns-truth {
      color: #e0b45f;
      opacity: 0.9;
      svg {
        width: 11px;
        margin-right: 3px;
      }
    }
    // FT-862: the character IS the meaning of the row — bigger, brighter
    // than everything around it except the instruction line
    b {
      font-size: 17px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    small {
      opacity: 0.68;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .ns-answer {
    grid-area: answer;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
  }

  // number field (Empath/Chef/…) — same rhythm as the other action controls
  .ns-num,
  .ns-free {
    height: 30px;
    font-family: inherit;
    font-size: 12.5px;
    color: white;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid #3d3d3d;
    border-radius: 5px;
    padding: 0 8px;
    &:focus-visible {
      outline: none;
      border-color: #a01414;
    }
  }
  .ns-num {
    width: 52px;
    text-align: center;
  }
  .ns-free {
    width: 128px;
  }

  .ns-told {
    height: 30px;
    min-width: 46px;
    font-family: inherit;
    font-size: 12.5px;
    color: white;
    padding: 0 8px;
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

  // FT-862: the lie flag and the note toggle now share the SAME box
  // treatment and height as every other action control, not bare floating
  // glyphs at a different weight
  .ns-lie,
  .ns-note-toggle {
    height: 30px;
    width: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
    opacity: 0.5;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid #3d3d3d;
    border-radius: 5px;
    &:hover,
    &:focus-visible {
      opacity: 1;
      outline: none;
    }
    &.on {
      opacity: 1;
    }
  }
  .ns-lie.on {
    color: #ffb03a;
    border-color: #7d5a10;
  }
  .ns-note-toggle.on {
    color: #ff8a8a;
    border-color: #7d0e0e;
  }

  // the reminder — FT-862: the sentence the storyteller reads aloud, now
  // sized to be readable rather than a caption
  .ns-reminder {
    grid-area: instruct;
    font-size: 13.5px;
    line-height: 1.32;
    opacity: 0.78;
  }
  .ns-note {
    grid-column: 1 / -1;
    width: 100%;
    font-size: 12px;
    margin-top: 2px;
  }

  // a finger needs a box, not a glyph — the state column stays put (its
  // 44px comes from padding on .ns-check itself, not the grid track), the
  // rest stacks
  @media (pointer: coarse) {
    grid-template-columns: 44px 1fr;
    grid-template-areas:
      "state identity"
      "state answer"
      ".     instruct";
    row-gap: 6px;

    .ns-check {
      align-self: start;
      box-sizing: content-box;
      font-size: 14px;
      width: 14px;
      height: 14px;
      padding: 15px;
      margin: -15px;
    }
    .ns-answer {
      justify-content: flex-start;
    }
    .ns-num,
    .ns-free,
    .ns-told,
    .ns-lie,
    .ns-note-toggle {
      height: 44px;
      font-size: 15px;
    }
    .ns-num {
      width: 64px;
    }
    .ns-free {
      flex: 1;
      min-width: 140px;
    }
    .ns-lie,
    .ns-note-toggle {
      width: 44px;
    }
    .ns-note {
      min-height: 44px;
      font-size: 15px;
    }
  }
}
</style>
