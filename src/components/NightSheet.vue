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
      <!-- FT-882 (user call): the flanking sun/moon marks came OFF this
           button. The sun and the moon belong to the phase readout above the
           clock face, which every player sees; a second pair down here was
           the control competing with the readout for the same job. The
           title still carries the atmosphere the marks were carrying, at no
           cost — see flipHint. -->
      <button
        type="button"
        class="phase-flip"
        :class="{ blocked: !canFlip }"
        :title="flipHint"
        @click="flipPhase"
      >
        {{ flipLabel }}
      </button>
    </div>

    <!-- ── the checklist ─────────────────────────────────────────────────── -->
    <template v-if="showList">
      <!-- FT-874: labelled — a bare "0 / 4" floated with no context once the
           phase word itself moved to the public readout (FT-862). -->
      <div class="phase" v-if="roster.length">
        <span class="phase-progress"
          ><span class="pp-label">Night Checklist:</span>
          {{ progress.done }} / {{ progress.total }}</span
        >
      </div>

      <p class="ns-empty" v-if="!roster.length">Nobody wakes tonight.</p>

      <ul class="ns-rows" v-else v-blood-scroll>
        <li
          v-for="row in roster"
          :key="row.key"
          class="ns-row"
          :data-row-key="row.key"
          :class="[
            'team-' + (row.role.team || 'townsfolk'),
            {
              done: entryFor(row).done,
              // FT-861: this row is a PERFORMANCE — the seat is being walked
              // through a character it only thinks it has
              performance: row.isPerformance,
              // FT-874: the guided escape from a blocked end-night press —
              // a brief highlight, not a permanent state
              flash: flashing[row.key]
            }
          ]"
        >
          <!-- THE DONE STATE. FT-874: ONE control, spanning BOTH lines of
               the row (grid-area "state" now names both rows in column 1,
               see the style block) — not a small glyph beside the identity
               line, so the click/tap target is the row's own full height.
               The row's own dimming (see .done below) already says
               "finished" at a glance, so the mark itself only needs to be
               findable, not loud. Blood red (#800000, user-named) once
               checked. -->
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

          <!-- IDENTITY (top-left): order, icon, "Role · Player" on ONE line
               (FT-874 — was two stacked lines) plus the performance/belief
               line when there is one. -->
          <div class="ns-identity">
            <span class="ns-ord" :title="'Night order ' + row.night">{{ row.order }}</span>
            <span
              class="ns-icon"
              :style="{ backgroundImage: `url(${roleIconUrl(row.role)})` }"
            ></span>
            <span class="ns-who">
              <span class="ns-name-line">
                <b>{{ row.role.name }}</b>
                <span class="ns-sep">·</span>
                <small>{{ row.player.name || "Open seat" }}</small>
              </span>
              <!-- FT-861: THE OTHER CHARACTER. The row names the one that
                   ACTS in full, and the one the storyteller must not forget
                   — because which of the two it is decides whether anything
                   actually happens. -->
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

          <!-- THE WORKING LINE (FT-882). A wrapper that is INVISIBLE to the
               layout everywhere it has always worked: `display: contents`
               makes it generate no box at all, so on the 640px rectangle and
               on both phone layouts the two children below sit in the row's
               grid areas exactly as they did before this pass.

               It exists for the DISC, where the band is ~275px of line and
               the two children have to negotiate: the ability sentence and
               the controls share one line where they both fit, and the
               controls drop to a line of their own where they do not. Grid
               cannot do that — it has no wrap — and a fixed three-line row
               would charge every row for the two or three that need it. -->
          <div class="ns-work">
          <!-- THE ANSWER (right zone): what a storyteller records tonight.
               FT-862: this used to be a yes/no toggle on EVERY row — wrong
               for the Undertaker (a character) or the Empath (a number).
               golem/nightInfo's field table says which control belongs
               here; PLAYER-typed fields never appear a second time, they're
               already the SeatPickers to the left of this zone. -->
          <div class="ns-answer">
            <!-- FT-874: what's being recorded, stated rather than implied by
                 the ability text — golem/nightInfo's per-character label,
                 immediately before this row's first control. -->
            <span v-if="rowLabel(row)" class="ns-label">{{ rowLabel(row) }}</span>

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

              <NumberScrub
                v-else-if="kindOf(field) === 'number'"
                :key="'f' + fi"
                class="ns-num"
                preset="night"
                :value="numberValue(row, field)"
                :min="field.min"
                :max="field.max"
                :title="numberHint(field)"
                @input="n => setNumber(row, n)"
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
                 the question doesn't apply. FT-874: a CHECKBOX, not a
                 warning triangle — reads gold (#d8b45a, this fork's own —
                 the phase sun, the votes count) when set, not a fifth
                 invented accent. -->
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
              <font-awesome-icon
                :icon="entryFor(row).isFalseInfo ? 'check-square' : 'square'"
              />
            </span>
          </div>

          <!-- FT-874: ONE line, truncated — a storyteller is SCANNING a
               checklist here (compare ScriptView, where the ability wraps
               in full: there the storyteller is READING to learn a script,
               a different job). The title carries what the ellipsis cuts,
               so nothing said is lost, only hidden until asked for. -->
          <span class="ns-reminder" :title="row.reminder">{{ row.reminder }}</span>
          </div>
        </li>
      </ul>

      <!-- FT-862: relocated from the top bar (user call — this button means
           "I have finished this list", so it belongs after the list, where
           the hand ends up, not above it where it invites a mis-tap before
           the night is worked through). A finished list makes it the
           obvious next step; an unfinished one keeps it quiet — never
           blocked either way, a storyteller may move the night on early. -->
      <!-- FT-882: marks off here too (see the day pill above). The finished
           tick STAYS — it is not a flanking ornament, it is the only mark
           that says "the list is complete", and it rides the ready plate. -->
      <button
        type="button"
        class="phase-flip bottom"
        :class="{ ready: allChecked, blocked: !canFlip }"
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
import { extraFields, renderableType, labelFor } from "../golem/nightInfo";
import SeatPicker from "./SeatPicker";
import CharacterPicker from "./CharacterPicker";
// FT-874: the shared drag-scrub / click-to-type number control (also used by
// HostTools' Seats row) — replaces a bare <input type="number">.
import NumberScrub from "./NumberScrub";
// FT-874: the phase button's moon mark — same two filenames TownInfo.vue and
// RoleHoverCard already import, so whatever art lands there (an art lane is
// redrawing these in place) shows up here too without a second import to
// keep in sync.
import moonFirst from "../assets/moon-first.png";
import moonOther from "../assets/moon-other.png";

export default {
  name: "NightSheet",
  components: { SeatPicker, CharacterPicker, NumberScrub },
  data() {
    return {
      // FT-874: rows the "end night" button just pointed at because the
      // storyteller pressed it early — view state, not log state.
      flashing: {}
    };
  },
  computed: {
    ...mapState(["grimoire", "session", "night", "roles"]),
    ...mapState("players", ["players"]),
    ...mapGetters({
      rawRoster: "night/roster",
      progress: "night/progress"
    }),
    ...mapGetters("night", ["isFirstNight"]),
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
    /**
     * FT-874: the button names the ACTION ("End night" / "End day"), not the
     * world's own result ("Night falls" read as a status, not a control) —
     * user call. The atmosphere the old pair carried stays on the marks and
     * the title (flipHint below), which cost nothing to keep.
     */
    flipLabel() {
      return this.isNight ? "End night" : "End day";
    },
    /** The phase the flip is heading INTO — what the sun/moon mark shows,
     *  the opposite of the CURRENT phase (ending a night heads into day). */
    nextIsNight() {
      return !this.isNight;
    },
    moonMarkSrc() {
      return this.isFirstNight ? moonFirst : moonOther;
    },
    flipHint() {
      // FT-874: a BLOCKED button explains itself on hover rather than being
      // silently inert — see canFlip/uncheckedRows.
      if (!this.canFlip) {
        const n = this.uncheckedRows.length;
        return n + (n === 1 ? " row still unchecked" : " rows still unchecked");
      }
      return this.isNight
        ? "Wake the town — the log stays on Night " + this.night.day
        : "Night " + (this.night.day + 1) + " begins, and the log moves with it";
    },
    /** Every row checked off — the signal that flips the finish button from
     *  quiet to obvious (never blocking; a storyteller may move on early). */
    allChecked() {
      return this.roster.length > 0 && this.progress.done >= this.progress.total;
    },
    /** FT-874: tonight's rows still unticked. Empty on a night nobody wakes
     *  for (roster.length === 0) — nothing to require in that case. */
    uncheckedRows() {
      return this.roster.filter(row => !this.entryFor(row).done);
    },
    /**
     * Can the phase button actually flip right now? Starting a night (day →
     * night) is NEVER gated — the setting is "require the checklist before
     * the night can END", not before it begins, and a fresh night's own
     * roster starts unchecked by definition. Ending a night is gated only
     * when the town's "Require checks" setting (NightModeRow) is on AND
     * something is still unticked.
     */
    canFlip() {
      if (!this.isNight) return true;
      return !this.night.requireChecks || this.uncheckedRows.length === 0;
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
    /** NumberScrub always emits a clamped integer, never a raw string or an
     *  empty value — the parsing this used to do lived in the old bare
     *  <input type="number">'s @input handler and moved into the shared
     *  component's own clamp(). */
    setNumber(row, n) {
      this.writeTold(row, { number: n });
    },
    /** NumberScrub's `value` prop is required and must be a concrete number
     *  — never null. Before the storyteller has touched this row nothing is
     *  stored yet (`told.number` is null, the blank stand-in from
     *  entryFor()), so the scrub starts at the field's own minimum rather
     *  than showing nothing; no store write happens until it's interacted
     *  with either way. */
    numberValue(row, field) {
      const n = this.entryFor(row).told.number;
      return n === null || n === undefined ? field.min || 0 : n;
    },
    numberHint(field) {
      const base = "What you showed them — a count";
      return field.min !== undefined && field.max !== undefined
        ? `${base} (${field.min}–${field.max})`
        : base;
    },
    /** golem/nightInfo's per-character label — see that file for the rules
     *  (present only where a character actually records something; never
     *  guessed for an unlisted role). */
    rowLabel(row) {
      return labelFor(row.role.id);
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
    /**
     * Swap the phase. The day counter moves inside the root toggleNight
     * mutation, so this button and the S hotkey stay in step by construction.
     * Clearing the block on nightfall mirrors Menu.toggleNight.
     *
     * FT-874: BLOCKED (canFlip false) is not a dead click — the button stays
     * a real, clickable <button> (never the native `disabled` attribute,
     * which would swallow the click entirely) and a press instead points at
     * what's missing. The escape from a wrong checklist is still exactly one
     * tap PER ROW (tick it and move on) — never a "check all", which would
     * teach a hurried storyteller to tick without reading and defeat the
     * point of the list.
     */
    flipPhase() {
      if (!this.canFlip) {
        this.flashUnchecked();
        return;
      }
      this.$store.commit("toggleNight");
      if (this.grimoire.isNight) {
        this.$store.commit("session/setMarkedPlayer", -1);
      }
    },
    /** Scroll the first unticked row into view and flash every unticked row
     *  briefly — the guided escape for a blocked "end night" press. */
    flashUnchecked() {
      const rows = this.uncheckedRows;
      if (!rows.length) return;
      this.$nextTick(() => {
        const first = this.$el.querySelector(
          '[data-row-key="' + rows[0].key + '"]'
        );
        if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      rows.forEach(r => this.$set(this.flashing, r.key, true));
      clearTimeout(this._flashTimer);
      this._flashTimer = setTimeout(() => {
        rows.forEach(r => this.$set(this.flashing, r.key, false));
      }, 900);
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

// ROW CONTROL HEIGHT CONTRACT: 30px desktop / 44px coarse-pointer — matched
// by hand in SeatPicker.vue and CharacterPicker.vue's own styles. A change
// to one changes all three.

// FT-882: the checklist's character names take their TEAM's colour — the
// same move the script view's card names made earlier today. Built from
// vars.scss's own team variables rather than a third literal copy of the
// hexes (ScriptView and EditionModal each carry one); this map points at the
// source. `fabled` is included where ScriptView omits it: a Fabled can hold
// a night order, and an uncoloured name in a list where every other name is
// coloured reads as a bug rather than as a category.
$ns-team-colors: (
  "townsfolk": $townsfolk,
  "outsider": $outsider,
  "minion": $minion,
  "demon": $demon,
  "traveler": $traveler,
  "fabled": $fabled
);

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

  // ── THE DISC (FT-882, desktop only) ───────────────────────────────────
  //
  // The checklist stops being a rectangle floating over the dial and becomes
  // a PLATE LAID ON IT: same centre, same radius, border-radius 50%.
  //
  // This is only buildable because the art was recentred (FT-anon,
  // 2026-08-19): App.vue publishes --face-cx / --face-cy / --face-r, so the
  // disc is placed and sized from the face's own published geometry and NOT
  // from a hand-tuned offset. Those three are the single source of truth —
  // if the disc ever sits off the dial, the numbers there are what to fix.
  //
  // THE SHAPE COSTS WIDTH, AND THE ROWS GET THE MIDDLE OF IT.
  // A circle's usable line width changes row by row — nothing at the poles,
  // everything at the equator — and this list is scanned under time pressure
  // with a full sentence on every row. So the DISC IS THE FRAME and the rows
  // live in the rectangle inscribed in it, dead centre. What the poles get
  // instead is the two things short enough to want them: the progress count
  // at the top, the End-night button at the bottom.
  //
  // THE BAND MATH, once, here:
  //   cap  t  = --ns-cap × diameter, the height surrendered at EACH pole
  //   half-height  b = r − t          (the list band is centred, so both
  //                                    poles must give up the same t — the
  //                                    NARROWER cap is what binds the width)
  //   half-width   a = √(r² − b²) = √(2rt − t²)
  // --ns-hw is a/r, kept in sync BY HAND against --ns-cap: CSS sqrt() is too
  // new to lean on in a fork that has to run in whatever a storyteller has
  // open. cap .18 → hw .768 | .21 → .8146 | .25 → .866 | .28 → .898.
  //
  // Widening the band (a bigger cap) buys line width and spends visible
  // rows; .21 is the measured settlement — see the FT-882 report for the
  // widths this lands at on each viewport.
  //
  // The floor: below ~1000×700 the face itself is small enough that the
  // inscribed band stops being a readable column, so a small desktop window
  // keeps the 640px rectangle above rather than getting an unreadable disc.
  @media (pointer: fine) and (min-width: 1000px) and (min-height: 700px) {
    &.has-list {
      --ns-r: calc(var(--face-r, 238) * var(--fpx, 1px));
      --ns-d: calc(2 * var(--ns-r));
      --ns-cap: 0.21;
      --ns-hw: 0.8146;
      --ns-band: calc(2 * var(--ns-hw) * var(--ns-r));
      --ns-caph: calc(var(--ns-cap) * var(--ns-d));

      position: absolute;
      left: var(--face-cx, 50%);
      top: var(--face-cy, 50%);
      transform: translate(-50%, -50%);
      width: var(--ns-d);
      height: var(--ns-d);
      // THE DISC IS THE FACE. The window caps on the base rule would square
      // this off into an oval the moment a viewport got tight — and an oval
      // no longer registers to the dial, which is the whole point. A freak
      // aspect ratio crops the face; the disc crops with it.
      max-width: none;
      max-height: none;
      border-radius: 50%;
      border: none;
      padding: 0;
      align-items: center;

      // THE MATERIAL: a plate laid on the dial, not a hole cut in it. Dark
      // (every colour on these rows — the text, the purple ticks, the gold
      // lie flag — is built for a dark ground) and thinnest at the middle,
      // so the dial's rose still reads faintly under the list instead of
      // being blotted out.
      //
      // WHAT SHOWS THROUGH, AND WHAT MUST NOT. Under this disc sits the
      // hub — and the hub carries the town readout: script name in display
      // type, the alive/vote counts at 40px, the edition mark. At 0.78 and
      // again at 0.88 those read straight through the middle three rows
      // (shots: cap021-1280x800, passes 1 and 2) — the same failure the
      // rectangle's own history records at 0.88 over the build plate.
      //
      // Raising the alpha until they vanish also takes the rose with them,
      // and the rose showing through is the point of laying a disc on a
      // dial. So the blur does the separating instead: `backdrop-filter`
      // smears everything behind into a wash, which destroys TEXT (fine
      // strokes, and text is the thing that must not read) while leaving
      // the rose's broad shapes and colour perfectly legible as a ground.
      // Alpha then only has to knock the wash back, not erase it.
      backdrop-filter: blur(7px) brightness(0.5) saturate(0.85);
      //
      // THE COLOUR IS THE GRIMOIRE'S, not parchment's (FT-882, decided with
      // the tick going purple in the same pass): rgba(20, 16, 22) is the
      // ground RoleDrawer's own controls sit on, a cool purple-black — the
      // book's paper. A warm brown plate here would have read as a third
      // material on a surface that already has the bronze dial under it and
      // the purple book on it.
      background: radial-gradient(
        circle at 50% 44%,
        rgba(30, 24, 34, 0.82) 0%,
        rgba(22, 17, 25, 0.88) 52%,
        rgba(14, 10, 16, 0.93) 86%,
        rgba(9, 6, 10, 0.95) 100%
      );
      // TWO threads, and they say different things. The inner hairline is
      // the grimoire's purple — this sheet's own edge. Outside it, one
      // bronze thread seats the disc ON the dial's painted rim rather than
      // letting it hover as a separate object.
      box-shadow:
        inset 0 0 0 1px rgba(120, 105, 135, 0.38),
        inset 0 0 34px rgba(0, 0, 0, 0.8),
        0 0 0 1px rgba(150, 120, 60, 0.22),
        0 0 26px rgba(0, 0, 0, 0.75);

      // ── the three bands, exact: cap + (d − 2cap) + cap = d ──────────────
      // The list band MUST come out centred — an off-centre band is bound by
      // whichever pole it sits closer to, and its far corners then poke out
      // through the circle (where `overflow: hidden` quietly shears them).
      // So every basis below is stated, and none of them flex.
      > .phase {
        flex: 0 0 var(--ns-caph);
        width: var(--ns-band);
        align-items: flex-end;
        padding: 0 0 8px;
      }

      > .ns-rows {
        flex: 0 0 calc(var(--ns-d) - 2 * var(--ns-caph));
        width: var(--ns-band);
        // the drip runs down the band's own inside edge (the directive
        // reserves its 30px lane in the host's padding), so it lands well
        // inside the circle rather than on the rim
      }

      // nobody wakes tonight: no header band to sit under, so this one
      // centres itself in whatever the button leaves
      > .ns-empty {
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
      }

      // The button rides the TOP of the bottom cap, where the circle is
      // still wide. NEVER full-bleed (its rectangle setting): at this height
      // the band's own width would run its bottom corners straight through
      // the rim, where `overflow: hidden` shears them off. 0.95r is measured
      // to clear the arc at the button's BOTTOM edge — the binding one — at
      // every cap in the swept range, with room for a longer label.
      > .phase-flip.bottom {
        flex: 0 0 auto;
        width: calc(0.95 * var(--ns-r));
        margin: 10px 0 0;
      }

      // ── THE ROW, IN A NARROWER COLUMN ──────────────────────────────────
      // The band is ~345–465px against the rectangle's 640, and the row's
      // job does not change: TWO lines, and the character has to be
      // readable on the first one.
      //
      // WHAT WAS MEASURED, 1280×800, before any of this (FT-882):
      //   · on the rectangle's settings the answer zone WRAPPED on 8 of 9
      //     rows and the rows stood 103–139px tall — barely two visible.
      //   · stopping the wrap fixed the height (every row 65px) and moved
      //     the damage onto the name: with identity and answer sharing line
      //     one, "Washerwoman · Player 2" came out as "W…". The player's
      //     name did not render at all.
      //   · giving identity the room it needs on a shared line (~215px)
      //     leaves ~56px for a label and three controls. Also unusable.
      //
      // So the two lines SWAP what they carry. Line one is the identity,
      // full width, unshared: the character reads in full, which is the
      // thing a storyteller is scanning for. Line two carries the ability
      // sentence AND the controls, side by side — the sentence already
      // truncates by design (FT-874: this is a scanning surface, and the
      // title attribute carries what the ellipsis cuts), where a control
      // that truncates is just a control you cannot use.
      //
      // Total ink is unchanged; only which line each zone sits on moves.
      // LINE TWO NEGOTIATES. Two earlier arrangements were measured and both
      // failed on the same 275px of line:
      //   · sentence and controls as two GRID tracks (`1fr auto`) — grid
      //     hands an `auto` track its full max-content before a `1fr` track
      //     gets anything, so the two-picker rows took their 189px and the
      //     sentence rendered at zero width. It did not truncate; it
      //     vanished. (shot: pass2-1280x800)
      //   · the same two tracks with a floor under the sentence
      //     (`minmax(33%, 1fr)`) — now the controls take the squeeze, and a
      //     seat picker squeezed to 33px shows a seat number and nothing
      //     else. Worse: SeatPicker's trigger is a <button>, which sizes to
      //     its content rather than to its shrunk parent, so the pickers
      //     drew ON TOP of one another. (shot: pass3-1280x800, measured in
      //     2026-08-19-night-disc-overlap.mjs)
      //
      // So they WRAP instead. The sentence and the controls sit on one line
      // wherever both fit, and the controls take a line of their own where
      // they do not — which at 1280×800 is the four-control rows only, and
      // at 1920×1080 is none of them. A fixed three-line row would have
      // charged every row on every screen for the two that need it.
      .ns-row {
        grid-template-columns: 28px 1fr;
        grid-template-areas:
          "state identity"
          "state work";
        column-gap: 8px;
        padding: 6px 2px 7px;

        .ns-work {
          grid-area: work;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 8px;
          min-width: 0;
        }
        // the sentence leads and takes the slack; 130px is the basis the
        // wrap decision is made against, not a floor it is held to
        .ns-reminder {
          order: 0;
          flex: 1 1 130px;
        }
        // …the controls follow it, hard right, on whichever line they end up
        // on. The WRAP absorbs a crowded row first; only once they have a
        // whole line to themselves and still do not fit does the shrink
        // start, and then it lands on the pickers, which ellipsize their
        // player and role lines and keep the two things that identify a
        // choice — the seat number and the character icon.
        // `min-width: 0` is load-bearing, and it was measured: without it
        // this zone's AUTOMATIC minimum is its own max-content, so a
        // four-control row sat at its full 335px inside a 275px line and
        // simply hung out over the rim — flex-shrink never got to run
        // (2026-08-19-night-disc-overlap.mjs, before/after).
        .ns-answer {
          order: 1;
          flex: 0 1 auto;
          flex-wrap: nowrap;
          min-width: 0;
          margin-left: auto;
          gap: 5px;
        }
        .ns-label {
          font-size: 11.5px;
        }
        // the character icon drops 40 → 30px: it is the row's height driver
        // on line one, and the band is short enough that ten wasted pixels
        // a row costs a whole visible row. The role name comes down with it
        // (17 → 15.5px) so it still sits ABOVE the reminder's 13.5px rather
        // than towering over a line it now shares the row with. That is the
        // only type on this sheet that moves.
        .ns-icon {
          width: 30px;
          height: 30px;
        }
        .ns-who b {
          font-size: 15.5px;
          // with the whole line to itself the name no longer has to yield
          // most of its width to a neighbouring control zone
          max-width: 72%;
        }
      }
    }
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

    // FT-874: the count used to float with no context once "Day N/Night N"
    // moved out (FT-862 above) — this names what it's counting. Not its own
    // opacity: the parent's 0.65 already mutes both label and count evenly.
    .pp-label {
      margin-right: 4px;
    }
  }
}

.phase-flip {
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  font-size: 95%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  // FT-882 (user call): GRIMOIRE PURPLE, replacing FT-874's gold-tinted
  // plate. The whole checklist's accent moved to purple in this pass (see
  // .ns-check) — red is the blood, purple is the book — and a lone gold
  // button under a purple-ticked list read as the leftover of another
  // system. Ground, edge and label are RoleDrawer's own three tones.
  color: #d8cdb4;
  padding: 5px 16px;
  background: rgba(20, 16, 22, 0.9);
  border: 1px solid rgba(120, 105, 135, 0.4);
  border-radius: 6px;
  cursor: pointer;
  transition: color 150ms, border-color 150ms, background 150ms;
  &:hover,
  &:focus-visible {
    background: rgba(32, 24, 38, 0.95);
    border-color: rgba(150, 130, 175, 0.75);
    color: #fff;
    outline: none;
  }

  // FT-882: the flanking sun/moon marks came off the button (see the
  // template). These rules are left standing rather than torn out — the
  // marks may yet come back somewhere on this sheet, and the plumbing they
  // read (moonMarkSrc / isFirstNight) is still here for that. Right now
  // they style nothing.
  .pf-mark {
    flex-shrink: 0;
  }
  .pf-sun {
    width: 14px;
    height: 14px;
    color: #d8b45a;
  }
  .pf-moon {
    width: 16px;
    height: 16px;
    object-fit: contain;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
  }

  // FT-874: BLOCKED — "Require checks" is on and something is still
  // unticked. Reads as disabled but ISN'T: the click still lands (see
  // flipPhase/flashUnchecked) rather than the native `disabled` attribute,
  // which would swallow it and turn the press into a dead click.
  &.blocked {
    cursor: not-allowed;
    opacity: 0.55;
    &:hover,
    &:focus-visible {
      background: rgba(20, 16, 22, 0.9);
      border-color: rgba(120, 105, 135, 0.4);
      color: #d8cdb4;
    }
  }

  // bottom-of-list placement: full width, so it reads as "the next step"
  // rather than a floating button
  &.bottom {
    width: 100%;
    margin-top: 8px;
    padding: 8px 16px;
    flex-shrink: 0;

    // FT-862 (user call, my read of "worth considering"): a FINISHED list
    // makes this the obvious next step — brighter, wearing the same accent
    // the done-state already wears, never disabled either way. Mutually
    // exclusive with .blocked in practice (a finished list is never gated).
    //
    // FT-882: that accent is now the grimoire's purple, so this is too. It
    // is the ONLY signal the list is complete, so the two states are kept
    // far apart on purpose — a near-black plate with a faint edge at rest,
    // a lit purple plate with a glow and a tick when finished.
    &.ready {
      color: #f4ecff;
      background: rgba(120, 105, 135, 0.42);
      border-color: rgba(150, 130, 175, 0.85);
      box-shadow: 0 0 10px rgba(120, 105, 135, 0.45);
      &:hover,
      &:focus-visible {
        background: rgba(150, 130, 175, 0.55);
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
  // FT-874: the row redesign, user-specified — TWO lines: identity+answer,
  // then the ability. "state" (the check) names BOTH rows of column 1, which
  // is what makes it ONE control spanning the row's full height rather than
  // a small glyph beside the identity line — CSS grid stretches an item
  // across every row its area name appears in, by construction, no explicit
  // row-span needed. The team-coloured left border is retired (user call):
  // the icon alone carries the team now.
  grid-template-columns: 34px minmax(150px, 1fr) auto;
  grid-template-areas:
    "state identity answer"
    "state instruct instruct";
  column-gap: 10px;
  row-gap: 3px;
  align-items: center;
  padding: 7px 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);

  // FT-874: the TICK stays full-strength on a done row — it is the evidence
  // the row IS done and the control that undoes it, so it is the one thing
  // that should never recede. Everything else has already been read and
  // acted on and can dim. Opacity on the ROW would dim the tick too — a
  // child's own opacity cannot escape an ancestor's (the composited result
  // is bounded by the ancestor's alpha regardless), which is exactly the bug
  // this replaces — so the fade targets every child EXCEPT the check.
  //
  // FT-882: the fade reaches PAST .ns-work to its two children, and never
  // lands on .ns-work itself. Two reasons, one for each mode it runs in:
  // where the wrapper is `display: contents` it generates no box, so an
  // opacity on it would silently do nothing and a done row would stop
  // dimming its sentence and controls; where it IS a box (the disc), it
  // would dim them a second time on top of their own 0.45.
  &.done > *:not(.ns-check):not(.ns-work),
  &.done > .ns-work > * {
    opacity: 0.45;
  }
  // FT-874: a row the "end night" button just pointed at — a brief pulse,
  // not a permanent state (JS clears `flashing` on a timer).
  &.flash {
    animation: ns-row-flash 900ms ease;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  // FT-874: enlarged from a small glyph beside the identity line into ONE
  // control filling the row's full two-line height (grid-area "state" spans
  // both rows; this element stretches to fill that whole cell by CSS grid's
  // own default — no explicit sizing needed, `align-self: stretch` just
  // keeps the row's own `align-items: center` from overriding it back to
  // glyph-sized).
  //
  // FT-882 (user call): GRIMOIRE PURPLE, not blood red. Red means BLOOD in
  // this app — deaths, the stains on the dial, the drip on every scrollbar —
  // and the night checklist is not blood, it is the storyteller's private
  // book. So the tick wears the book's colour: rgba(120, 105, 135) resting
  // and rgba(150, 130, 175) lit, the exact two tones RoleDrawer's own
  // controls already use. No new purple was invented for this.
  .ns-check {
    grid-area: state;
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 15px;
    // FT-882: THE BOX HAS AN EDGE NOW, ticked or not. Unticked it was a flat
    // grey glyph with nothing around it — nothing said "press here". The
    // outline is the same purple at low alpha.
    //
    // The dimming moved OFF this element and ONTO the glyph: an opacity on
    // the span would take the outline down with it, and the outline's whole
    // job is to be visible while the glyph is not.
    border: 1px solid rgba(120, 105, 135, 0.3);
    border-radius: 4px;
    svg {
      opacity: 0.34;
    }
    &:hover,
    &:focus-visible {
      border-color: rgba(150, 130, 175, 0.75);
      background: rgba(120, 105, 135, 0.12);
      color: rgb(150, 130, 175);
      outline: none;
      svg {
        opacity: 1;
      }
    }
    &.checked {
      color: rgb(120, 105, 135);
      border-color: rgba(120, 105, 135, 0.55);
      svg {
        opacity: 0.95;
      }
      // hover-after-ticking stays in the purple family (undo it) rather
      // than reading as a different control
      &:hover,
      &:focus-visible {
        color: rgb(150, 130, 175);
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
  // FT-861: a PERFORMANCE row — this wake resolves into nothing. The dashed
  // team-stripe cue retired with the border itself (FT-874); the tint below
  // is now the row's only "something's different here" signal.
  &.performance:not(:hover) {
    background: rgba(184, 137, 47, 0.07);
  }

  // FT-882: THE NAME WEARS ITS TEAM. Only the name — the seat after it stays
  // muted, because colouring both makes the row loud and the character is
  // the thing being scanned for. This is the row's one piece of colour-as-
  // data; everything else on the surface (the tick, its outline, the finish
  // button) is the grimoire's purple, which is chrome. They do not compete:
  // one says WHAT this is, the other says what you can PRESS.
  @each $team, $color in $ns-team-colors {
    &.team-#{$team} .ns-who b {
      color: $color;
    }
  }
  // the demon's #ce0100 is too dark to hold against this ground — the same
  // 14% lift ScriptView gives it, for the same reason
  &.team-demon .ns-who b {
    color: lighten($demon, 14%);
  }

  .ns-who {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
    // FT-874: "Role · Player" on ONE line (was stacked) — the row is two
    // lines total now, not three-to-four, so identity gave up a line too.
    .ns-name-line {
      display: flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
    }
    .ns-sep {
      flex-shrink: 0;
      opacity: 0.4;
    }
    small.ns-truth {
      color: #e0b45f;
      opacity: 0.9;
      svg {
        width: 11px;
        margin-right: 3px;
      }
    }
    // FT-862: the character IS the meaning of the row — bigger, brighter
    // than everything around it except the instruction line. Shrinks before
    // the player name does (FT-874): a role has nowhere else to be read, a
    // player's name is already on their seat.
    b {
      flex-shrink: 0;
      max-width: 65%;
      font-size: 17px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    small {
      min-width: 0;
      opacity: 0.68;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  // FT-882: the wrapper around the ability sentence and the controls. It
  // generates NO BOX here — its two children go straight into the row's own
  // grid areas, so the rectangle and both phone layouts are byte-for-byte
  // what they were. Only the disc turns it into a real flex line.
  .ns-work {
    display: contents;
  }

  .ns-answer {
    grid-area: answer;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 6px;
  }

  // FT-874: what's being recorded, before the row's first control —
  // golem/nightInfo's per-character label
  .ns-label {
    flex-shrink: 0;
    opacity: 0.75;
    font-size: 12.5px;
    white-space: nowrap;
  }

  // FT-874: the box styling that used to live here for .ns-num moved into
  // NumberScrub's own "night" preset (it needs a THIRD state — the resting
  // scrub label — that a plain <input> selector can't reach). This block is
  // .ns-free only now, the free-text fallback.
  .ns-free {
    height: 30px;
    font-family: inherit;
    font-size: 12.5px;
    color: white;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid #3d3d3d;
    border-radius: 5px;
    padding: 0 8px;
    width: 128px;
    &:focus-visible {
      outline: none;
      border-color: #a01414;
    }
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

  // FT-862: the lie flag shares the same box treatment and height as every
  // other action control, not a bare floating glyph at a different weight.
  // FT-874: the note-toggle this was paired with is gone — the verb plus
  // the picker now says what was recorded — and the flag itself became a
  // checkbox (square/check-square, matching .ns-check's own pair) instead of
  // a warning triangle.
  .ns-lie {
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
      // FT-874 (user call): this fork's own gold — #d8b45a, the phase sun
      // and the votes count — rather than a fifth invented accent colour.
      color: #d8b45a;
      border-color: #8a6f2e;
    }
  }

  // the reminder — FT-862: the sentence the storyteller reads aloud, sized
  // to be readable rather than a caption. FT-874: ONE line now, truncated —
  // a checklist is for SCANNING, not reading (compare ScriptView, which
  // wraps the same text in full because there the job is learning a
  // script). `min-width: 0` overrides grid's own default item minimum,
  // which otherwise refuses to shrink below content size and silently
  // defeats the ellipsis.
  .ns-reminder {
    grid-area: instruct;
    display: block;
    min-width: 0;
    font-size: 13.5px;
    line-height: 1.32;
    opacity: 0.78;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // a finger needs a box, not a glyph — the state column stays put (it is
  // now the full height of ALL THREE stacked rows below, "state" naming
  // every one of them — an even taller target than the two-row desktop
  // case), the rest stacks
  @media (pointer: coarse) {
    grid-template-columns: 48px 1fr;
    grid-template-areas:
      "state identity"
      "state answer"
      "state instruct";
    row-gap: 6px;

    .ns-check {
      font-size: 18px;
    }
    .ns-answer {
      justify-content: flex-start;
    }
    // FT-874: .ns-num dropped from this list — NumberScrub's "night" preset
    // carries its own coarse-pointer sizing (44px height, 64px width, 15px
    // font — same numbers this rule used to apply) inside the component.
    .ns-label {
      font-size: 15px;
    }
    .ns-free,
    .ns-told,
    .ns-lie {
      height: 44px;
      font-size: 15px;
    }
    .ns-free {
      flex: 1;
      min-width: 140px;
    }
    .ns-lie {
      width: 44px;
    }
  }
}

// FT-874: the guided escape's brief highlight — see .ns-row.flash above and
// flashUnchecked() in the script block. A pulse, not a state: it always ends
// back at transparent, matching whatever the row's own rules (hover, .done)
// were already drawing under it.
@keyframes ns-row-flash {
  0%,
  100% {
    background: transparent;
  }
  25%,
  65% {
    background: rgba(160, 20, 20, 0.35);
  }
}
</style>
