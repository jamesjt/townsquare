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
  <div
    class="night-sheet"
    :class="{
      'is-night': isNight,
      'has-list': showList,
      // FT-986: THE NIGHT SELECTORS' OWN COLOUR — see viewerAlignment below.
      // Computed key rather than three literal booleans so a fourth state
      // never has to touch this line again.
      ['viewer-' + viewerAlignment]: !!viewerAlignment
    }"
  >
    <!-- FT-975 (2026-08-20): OFF/DAYTIME PILL RETIRED. The sun/moon + day
         count readout above the clock face (TownInfo.vue's `.info-phase`)
         IS this button now — for the storyteller it is a live control
         wired to THIS component's own flipPhase() (App.vue's endPhase()
         calls it through the same $refs.nightSheet path the E hotkey has
         always used); for anyone else it stays the plain label it already
         was. FT-882's flanking sun/moon marks came off this button for
         exactly the reason they are back on TownInfo's copy: one pair, one
         place, not two competing for the same job.

         LEFT MOUNTED, MERELY INVISIBLE — not torn out (see `.retired`
         below). This pill, unchanged, is what has always given
         `.night-sheet` its box during the day. flipLabel/canFlip/flipPhase
         are all still exercised here, untouched — nothing about ending a
         phase moved out of this component, only where the button is drawn. -->
    <div class="phase pill retired" v-if="!showList">
      <button
        type="button"
        class="phase-flip"
        :class="{ blocked: !canFlip }"
        :title="flipHint"
        tabindex="-1"
        @click="flipPhase"
      >
        {{ flipLabel }}
      </button>
    </div>

    <!-- ── the checklist ─────────────────────────────────────────────────── -->
    <template v-if="showList">
      <!-- FT-874: labelled — a bare "0 / 4" floated with no context once the
           phase word itself moved to the public readout (FT-862).
           FT-882: "Night Checklist:" lost its first word, because the day
           control that landed beside it says "Night" already and the pair
           was saying it twice on one line. The context FT-874 added is
           intact — it just stopped being said twice. -->
      <div class="phase" v-if="roster.length">
        <span class="phase-progress"
          ><span class="pp-label">Checklist:</span>
          {{ progress.done }} / {{ progress.total }}</span
        >
        <!-- FT-882: THE DAY IS EDITABLE, and this is the whole of the undo
             the phase button does not have. A mis-tapped flip, a night
             counted twice, a game resumed on the wrong number — all of them
             are the same mistake, and all of them are fixed by saying which
             night it actually is.

             It is a NumberScrub, the control the build panel's seat count
             and this sheet's own number answers already use, rather than a
             bare input — one piece of furniture, three places.

             Storyteller-only, like everything else in this component. It
             travels: see setDay() below. -->
        <span class="ns-day" :title="dayHint">
          <span class="pp-label">Night</span>
          <NumberScrub
            preset="night"
            :value="night.day"
            :min="0"
            :max="99"
            :title="dayHint"
            @input="setDay"
          />
        </span>
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
              :style="{ backgroundImage: `url(${roleIconUrl(row.isPerformance ? row.trueRole : row.role)})` }"
            ></span>
            <span class="ns-who">
              <!-- FT-1034 (user call): a performance row leads with the TRUTH
                   — the Drunk's own icon and name, then who they believe
                   they are, then the seat. The masks line below folds away
                   for these rows (its fact lives in the name now). -->
              <span class="ns-name-line" v-if="row.isPerformance">
                <b>{{ row.trueRole.name }}</b>
                <span class="ns-sep">·</span>
                <small>{{ row.role.name }}</small>
                <span class="ns-sep">·</span>
                <small>{{ row.player.name || "Open seat" }}</small>
              </span>
              <span class="ns-name-line" v-else>
                <b>{{ row.role.name }}</b>
                <span class="ns-sep">·</span>
                <small>{{ row.player.name || "Open seat" }}</small>
              </span>
              <!-- FT-861: THE OTHER CHARACTER. The row names the one that
                   ACTS in full, and the one the storyteller must not forget
                   — because which of the two it is decides whether anything
                   actually happens. -->
              <!-- FT-1034: the performance masks line folded into the name above -->
              <small class="ns-truth" v-if="row.isBelieving">
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

              <!-- FT-1005: a slot the seat's own player filled wears the gold
                   seam (see .from-player below) — the quiet mark that says
                   "their own pick" apart from the storyteller's record. The
                   storyteller's edit clears it (setTarget). -->
              <SeatPicker
                v-for="slot in row.slots"
                :key="'seat' + slot"
                class="ns-target"
                :class="{ 'from-player': targetBy(row, slot - 1) === 'player' }"
                :players="players"
                :picked-seat="entryFor(row).targets[slot - 1]"
                :show-role="isStoryteller"
                :icon-for="p => roleIconUrl(p.role)"
                :title="targetHint(row, slot)"
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

                <!-- FT-1003: the granted grimoire — the row whose information
                     IS the whole town (the Spy, the Widow; golem/nightInfo's
                     GRIMOIRE field, never a role-name list here). Show opens
                     the reveal on that ONE seat's client; the pin keeps it
                     open past the night's end and across their reconnect.
                     Disabled while the seat is unclaimed — there is no client
                     to show it to. -->
                <span
                  v-else-if="kindOf(field) === 'grimoire'"
                  :key="'f' + fi"
                  class="ns-grim"
                >
                  <button
                    type="button"
                    class="ns-grim-show"
                    :class="{ on: !!grantFor(row) }"
                    :disabled="!row.player.id"
                    :title="grimHint(row)"
                    @click="toggleGrimoireShown(row)"
                  >
                    <font-awesome-icon icon="eye" />
                    {{ grantFor(row) ? "Shown" : "Show" }}
                  </button>
                  <button
                    v-if="grantFor(row)"
                    type="button"
                    class="ns-grim-pin"
                    :class="{ on: grantFor(row).pinned }"
                    :title="pinHint(row)"
                    @click="pinGrimoireShown(row)"
                  >
                    <font-awesome-icon icon="thumbtack" />
                  </button>
                </span>

                <!-- FT-1028 (user call): "we can get rid of that for spy" —
                     a row that already carries the GRIMOIRE field (the Spy,
                     the Widow) has nothing left for a free-text note to say:
                     the grimoire itself IS the answer. `told.text` stays in
                     the stored shape untouched (the ledger's write path is
                     unchanged); this only stops the box from rendering on
                     exactly those rows. Every other role's fallback note
                     still renders as before. -->
                <input
                  v-else-if="!isGrimoireRow(row)"
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
                   the question doesn't apply.

                   FT-874 (2026-08-19, user call): THE LIAR MARK. It was a
                   square checkbox, which says "a setting" where the row means
                   "what you told them was not true". It is now the MASK — and
                   the mask is not invented for it: this component already
                   wears `theater-masks` on .ns-truth, a dozen lines up, for a
                   seat being walked through a character it only thinks it has.
                   Same glyph, same idea, same colour: what is shown is not
                   what is true.

                   The glyph no longer CHANGES between states (a mask is a
                   mask), so brightness carries the state on its own — see
                   .ns-lie: dim parchment in a pressable box when off, lit gold
                   when on. Exactly two states, no third. -->
              <!-- FT-1005: THE PLAYER'S OWN WORDS — their free-text choice,
                   arrived over the wire (entry.playerText). Rendered in the
                   same gold as the player-filled slots, quoted so it reads as
                   speech rather than as the storyteller's own note (which
                   stays told.text, in the free box). Never editable here —
                   it is theirs. -->
              <span
                v-if="entryFor(row).playerText"
                class="ns-player-said"
                :title="'Entered by the player: ' + entryFor(row).playerText"
              >
                &ldquo;{{ entryFor(row).playerText }}&rdquo;
              </span>

              <span
                v-if="extraFieldsFor(row).mayBeFalse"
                class="ns-lie"
                :class="{ on: entryFor(row).isFalseInfo }"
                tabindex="0"
                role="checkbox"
                :aria-checked="String(entryFor(row).isFalseInfo)"
                :title="lieHint(row)"
                @click="toggleLie(row)"
                @keyup.enter="toggleLie(row)"
                @keyup.space="toggleLie(row)"
              >
                <font-awesome-icon icon="theater-masks" />
              </span>
            </div>

            <!-- FT-874: ONE line, truncated — a storyteller is SCANNING a
                 checklist here (compare ScriptView, where the ability wraps
                 in full: there the storyteller is READING to learn a script,
                 a different job).
                 FT-886/882: the row now SHOWS our own short line and the
                 tooltip carries the OFFICIAL wording. Binding both to
                 `reminder` made the hover a copy of the line already on
                 screen and put the shipped text out of reach from the row —
                 `official` is the field that lane left here for it. -->
            <span class="ns-reminder" :title="row.official">{{ row.reminder }}</span>
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
      <!-- The WARN state's pre-press half rides this same button: the mark
           slot the finished tick already owns takes a warning triangle
           instead, and the plate goes gold. Chosen over a line above the
           button because on the disc this button IS the bottom cap and the
           rows are the band — there is no spare line there to put a sentence
           on, and the sentence would have cost the tray height the chip on
           the build panel just gave back. The count rides the tooltip
           (flipHint). -->
      <!-- FT-1105 (user): the timer sits ABOVE the flip button now — the
           storyteller sets the coming day's clock, then ends the night.
           Its label names the day it will govern ("Day 3 timer").
      -->
      <!-- FT-1067 (user): "below end night button... a button to change the
           timer for how long the day will start at for a countdown" — the
           storyteller sets the NEXT day's length right here, mid-checklist,
           without leaving the sheet for the Tower panel. It reads and writes
           the SAME synced tower field the panel row does (golem/towerBells.js
           via setTower/readTower above) — one source of truth, two doors:
           changing it here changes the panel row's own live value too.

           Kept quiet on purpose (a side control, not the main action): the
           row dims to match the checklist's own muted furniture (`.ns-day`'s
           idiom) and only comes to full ink under the pointer/keyboard. -->
      <div
        class="ns-daylen-row"
        title="How long the next day runs before the tower calls time — the bell tolls and the countdown flashes; the day itself never ends on its own"
      >
        <font-awesome-icon class="ns-daylen-mark" icon="hourglass-half" />
        <span class="ns-daylen-title">{{ dayTimerLabel }}</span>
        <span class="ns-daylen-seg" role="radiogroup" aria-label="Day length">
          <button
            type="button"
            class="ns-daylen-opt"
            role="radio"
            :aria-checked="String(!tower.dayLengthMin)"
            :class="{ on: !tower.dayLengthMin }"
            title="No day length — the readout counts up and nothing tolls"
            @click="setTower('dayLengthMin', 0)"
          >
            Off
          </button>
          <button
            type="button"
            class="ns-daylen-opt"
            role="radio"
            :aria-checked="String(!!tower.dayLengthMin)"
            :class="{ on: !!tower.dayLengthMin }"
            title="The day gets a length — every readout counts down to it"
            @click="setTower('dayLengthMin', dayLenDraft)"
          >
            Timed
          </button>
        </span>
        <span
          class="ns-daylen-min"
          :class="{ idle: !tower.dayLengthMin }"
          title="Minutes in the next day — drag sideways to scrub, click to type"
        >
          <NumberScrub
            class="ns-daylen-scrub"
            :value="tower.dayLengthMin || dayLenDraft"
            :min="dayLenMin"
            :max="dayLenMax"
            title="Minutes in the next day — drag sideways to scrub, click to type"
            @input="setDayLength"
          />
          <span class="ns-daylen-unit">min</span>
        </span>
      </div>

      <button
        type="button"
        class="phase-flip bottom"
        :class="{ ready: allChecked, blocked: !canFlip, warn: warnUnchecked }"
        :title="flipHint"
        @click="flipPhase"
      >
        <font-awesome-icon icon="check" v-if="allChecked" />
        <font-awesome-icon
          icon="exclamation-triangle"
          v-else-if="warnUnchecked"
        />
        {{ flipLabel }}
      </button>

    </template>

    <!-- (THE DISC'S SIZE LAB used to stand here, as `#night-lab`. It moved to
         App.vue — `src/components/FaceDiscLab.vue`, the "Fd" door — in FT-888,
         because its dials now drive EVERY menu on the clock face rather than
         this one, and because a lab that only exists at night, on a
         storyteller's screen, with the checklist open, could not be found
         during the day.

         Its going also fixed this sheet. The lab was portalled into
         document.body on mount to escape the sheet's transform, but Vue went
         on using that element as the insert-before reference for the sheet's
         own children — and Vue's `insert` silently does nothing when the
         reference has been reparented. So the rows and the End-night button
         were built and never inserted, and the disc rendered as a header over
         an empty circle.) -->
  </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { entryId } from "../golem/nightLog";
import { extraFields, renderableType, labelFor } from "../golem/nightInfo";
// FT-986: the seat pickers' own colour reads WHAT THE VIEWER IS TOLD, never
// what they are — see believedAlignment's own header for why.
import { believedAlignment } from "../golem/belief";
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
// FT-1067 (user): the day this night ends into gets its own control here,
// below the flip button — the SAME synced tower field the Tower panel's row
// (HostTools.vue) writes. towerState is the single copy (a plain module
// object, not reactive on its own); both surfaces keep a local snapshot and
// refresh it on TOWER_EVENT, the one-way pattern HostTools already runs.
// Nothing here re-derives or re-persists — setTowerField and the scrub's
// bounds are the panel row's own functions, imported, not restated.
import {
  DAY_LENGTH_MIN,
  DAY_LENGTH_MAX,
  TOWER_EVENT,
  towerState,
  setTowerField,
} from "../golem/towerBells";

export default {
  name: "NightSheet",
  components: { SeatPicker, CharacterPicker, NumberScrub },
  data() {
    return {
      // FT-874: rows the "end night" button just pointed at because the
      // storyteller pressed it early — view state, not log state.
      flashing: {},
      // FT-1067: the day-length control's furniture — same shape as
      // HostTools' own (tower snapshot + the last-set minutes, so Timed
      // returns to it rather than an arbitrary number). No new persistence:
      // this is a read of the one towerState the panel row already owns.
      tower: { ...towerState },
      dayLenMin: DAY_LENGTH_MIN,
      dayLenMax: DAY_LENGTH_MAX,
      dayLenDraft: towerState.dayLengthMin || 10
    };
  },
  created() {
    // FT-1067: follow the tower from wherever else it changes (the panel
    // row, the dial's own menu) — this sheet never boots it (loadTowerForTown
    // is HostTools'/FaceHands' job on their own mount; by the time a night
    // sheet can show, a build or a reload has already run one of those).
    this.readTower();
    window.addEventListener(TOWER_EVENT, this.readTower);
  },
  beforeDestroy() {
    window.removeEventListener(TOWER_EVENT, this.readTower);
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
    /**
     * FT-986: THIS CLIENT'S OWN SEAT, when the viewer is a player rather
     * than the storyteller — the same `players.find(p => p.id ===
     * session.playerId)` lookup Vote.vue/Player.vue/TownSquare.vue already
     * use to find "me" among the ring. Null for the storyteller, who has
     * no seat of their own.
     */
    viewerPlayer() {
      if (this.isStoryteller) return null;
      return this.players.find(p => p.id === this.session.playerId) || null;
    },
    /**
     * FT-986: THE NIGHT SELECTORS' COLOUR SOURCE — 'storyteller' | 'good' |
     * 'evil' | null, from WHO IS LOOKING at THIS client, never a fixed
     * palette. Drives the `.viewer-*` root class below, which the style
     * block turns into a CSS custom property the seat pickers' border and
     * highlight read (see `::v-deep .sp-*`).
     *
     * THE LEAK RULE (FT-868 / golem/belief.js): a player's own colour comes
     * from `believedAlignment()`, which reads `believedRole` before `role`
     * — the Drunk, the Lunatic, anyone poisoned into a false belief gets
     * the colour OF THE LIE, never the truth. A selector that answered with
     * the true team would out the deception through the chrome itself,
     * which is the same class of bug as a whisper reaching a fourth
     * socket. NULL is a real answer, not a bug — an open seat or an
     * undistributed game has no belief to read, and a neutral (unstyled)
     * selector is correct there rather than a guess.
     *
     * PER-VIEWER BY CONSTRUCTION: this reads only THIS client's own Vuex
     * store (`session`/`players`, both local to the tab), so the
     * storyteller's screen and a player's screen can never influence one
     * another's colour.
     *
     * IN PRACTICE this only ever returns 'storyteller' today — this
     * component mounts for the storyteller alone (App.vue's `!isSpectator`
     * gate; see the file header), so a real player never reaches this
     * template to exercise the good/evil branches against. They are
     * written anyway: the derivation has to be correct BEFORE a selector
     * like this is ever put in front of a player, not after.
     */
    viewerAlignment() {
      if (this.isStoryteller) return "storyteller";
      return believedAlignment(this.viewerPlayer);
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
    /** FT-1105 (user): the timer names the day it governs — the night sets
     *  the clock for the day it is about to become. Same counter the phase
     *  readout uses (night.day, floored at 1); during a night the coming
     *  day is that number, so no arithmetic is needed here. */
    dayTimerLabel() {
      return "Day " + Math.max(this.night.day, 1) + " timer";
    },
    flipLabel() {
      // FT-1002 (user call): while required rows still block the flip, the
      // button says what actually finishes the night — the CHECKS — instead
      // of naming an end it will refuse. The label becomes "End night" the
      // moment the last required row is ticked.
      if (this.isNight && !this.canFlip) return "Finish night checks";
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
      // WARN: same count, opposite promise — the press works.
      if (this.warnUnchecked) {
        const n = this.uncheckedRows.length;
        return (
          n +
          (n === 1 ? " row is" : " rows are") +
          " still unchecked — ending the night anyway is allowed"
        );
      }
      return this.isNight
        ? "Wake the town — the log stays on Night " + this.night.day
        : "Night " + (this.night.day + 1) + " begins, and the log moves with it";
    },
    /**
     * FT-882: what the day scrub explains about itself on hover. It says the
     * consequence, not the mechanic — moving the counter re-keys tonight's
     * rows (an entry's id is day+seat+role), so what was logged under the old
     * number stays logged under it and tonight starts clean. That is the
     * behaviour a storyteller correcting a mis-tapped flip actually wants,
     * and it is not guessable, so the control says it.
     */
    dayHint() {
      return (
        "Which night this is — drag to scrub, click to type. " +
        "Anything already logged stays under the night it was logged on."
      );
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
     * roster starts unchecked by definition.
     *
     * Ending a night is blocked ONLY in the `required` state (NightModeRow's
     * chip). `warn` deliberately returns true: it is the state that lets the
     * night end while saying so — see warnUnchecked.
     */
    canFlip() {
      if (!this.isNight) return true;
      return (
        this.night.requireChecks !== "required" ||
        this.uncheckedRows.length === 0
      );
    },
    /**
     * The WARN state, live: the night may end, and something would be left
     * behind if it did. Drives the button's own amber mark — the pre-press
     * half of the warning, which costs no layout at all because it rides the
     * slot the finished-list tick already occupies.
     */
    warnUnchecked() {
      return (
        this.isNight &&
        this.night.requireChecks === "warn" &&
        this.uncheckedRows.length > 0
      );
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
        // FT-1005: who filled each slot ("" = storyteller/nothing, "player" =
        // the seat's own player) and the player's own words — see makeEntry.
        targetsBy: new Array(row.slots).fill(""),
        playerText: "",
        told: { ping: null, number: null, characterId: "", characterName: "", text: "" },
        // FT-1034 (user call): the Drunk's information is a lie by default —
        // a performance row starts with the marker lit.
        isFalseInfo: !!row.isPerformance,
        done: false
      };
    },
    write(row, patch) {
      this.$store.dispatch("night/write", { row, patch });
    },
    /**
     * FT-882: the day counter, moved by hand.
     *
     * It is a MUTATION, not local state, for the same reason the phase flip
     * is: every client shows "Night N" in the town readout above the clock
     * face, and each one derives that number from its own toggleNight. A
     * host correcting the number here has to reach them or the town is
     * reading a different night than the log is writing. socket.js carries
     * it on the same gamestate the phase rides (see its `nightDay` field).
     */
    setDay(day) {
      this.$store.commit("night/setDay", day);
    },
    // ── FT-1067: the day-length control — HostTools' tw-row methods,
    // restated for this surface, not duplicated logic. All three touch
    // nothing but towerState (via setTowerField) and this component's own
    // display snapshot.
    /** The tower changed — here or on the panel row. */
    readTower() {
      this.tower = { ...towerState };
      if (this.tower.dayLengthMin > 0) {
        this.dayLenDraft = this.tower.dayLengthMin;
      }
    },
    /** One field written for THIS town — the panel row's own call. */
    setTower(key, value) {
      setTowerField(this.session.sessionId || "", key, value);
    },
    /** The minutes scrubbed (or typed) — scrubbing while Off also turns the
     *  countdown on, same as the panel row. */
    setDayLength(n) {
      this.dayLenDraft = n;
      this.setTower("dayLengthMin", n);
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
    /** FT-874 (2026-08-19): the liar mark says which of its two states it is
     *  in, in words. The glyph is identical in both — brightness is the only
     *  visual difference — so the hover text carries the state as well as the
     *  action, the way every other two-state control on this row does. */
    lieHint(row) {
      return this.entryFor(row).isFalseInfo
        ? "Marked FALSE — what you told them was a lie. Click to unmark."
        : "Mark what you told them FALSE (drunk, poisoned, a misread)";
    },
    setNote(row, text) {
      this.writeTold(row, { text });
    },
    setTarget(row, slot, seat) {
      const entry = this.entryFor(row);
      const s = Number.isInteger(seat) ? seat : -1;
      const targets = entry.targets.slice();
      const names = entry.targetNames.slice();
      // FT-1005: the storyteller's own edit clears the slot's player mark —
      // their record is the authority, and the gold seam must not claim a
      // value the player no longer owns.
      const by = (entry.targetsBy || new Array(row.slots).fill("")).slice();
      while (by.length <= slot) by.push("");
      targets[slot] = s;
      by[slot] = "";
      // the name is stamped ALONGSIDE the seat because seats move: a replay
      // needs the person the storyteller was pointing at tonight
      const player = this.players[s];
      names[slot] = player ? player.name : "";
      this.write(row, { targets, targetNames: names, targetsBy: by });
    },
    /** FT-1005: who filled a slot — "" (storyteller/nothing) or "player". */
    targetBy(row, i) {
      const by = this.entryFor(row).targetsBy || [];
      return by[i] || "";
    },
    /** FT-1005: the slot's hover text says whose pick it holds. */
    targetHint(row, slot) {
      const base = "Who they chose (" + slot + " of " + row.slots + ")";
      return this.targetBy(row, slot - 1) === "player"
        ? base + " — their own pick, entered by the player"
        : base;
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
    /** FT-1028: does this row carry a GRIMOIRE field (the Spy, the Widow)?
     *  Gates the free-text note out of those rows only — see the template's
     *  ns-free comment. */
    isGrimoireRow(row) {
      return this.extraFieldsFor(row).fields.some(f => this.kindOf(f) === "grimoire");
    },
    /**
     * FT-1003: the ledger entry for this row's seat — { pinned } while their
     * grimoire window is open, undefined otherwise. Keyed by the seat's
     * connection playerId (the routing key the direct channel splits on),
     * so the grant follows the player, not the chair.
     */
    grantFor(row) {
      const id = row.player.id;
      return id ? this.session.grimoireGrants[id] : undefined;
    },
    /** FT-1003: open / close this seat's grimoire window. The commit is the
     *  ledger write; the socket plugin observes it and delivers. */
    toggleGrimoireShown(row) {
      const id = row.player.id;
      if (!id) return;
      this.$store.commit("session/setGrimoireGrant", {
        playerId: id,
        granted: !this.grantFor(row),
        pinned: false
      });
    },
    /** FT-1003: keep the window open past night's end + their reconnect. */
    pinGrimoireShown(row) {
      const id = row.player.id;
      const grant = this.grantFor(row);
      if (!id || !grant) return;
      this.$store.commit("session/setGrimoireGrant", {
        playerId: id,
        granted: true,
        pinned: !grant.pinned
      });
    },
    grimHint(row) {
      if (!row.player.id) {
        return "No one is seated here — there is no client to show the grimoire to";
      }
      const grant = this.grantFor(row);
      if (!grant) {
        return "Show this player the grimoire — every seat's true character, on their screen only";
      }
      return grant.pinned
        ? "They see the grimoire (kept open). Click to take it away."
        : "They see the grimoire. Click to take it away — or it closes when the night ends.";
    },
    pinHint(row) {
      const grant = this.grantFor(row);
      return grant && grant.pinned
        ? "Kept open — survives the night's end and their reconnect. Click to unpin."
        : "Keep it open past the night's end (the Spy sees it for as long as they want)";
    },
    /**
     * Swap the phase. The day counter moves inside the root toggleNight
     * mutation, so this button and the S hotkey stay in step by construction.
     * Clearing the block on nightfall mirrors Menu.toggleNight.
     *
     * FT-874: BLOCKED (canFlip false — the `required` state only) is not a
     * dead click — the button stays a real, clickable <button> (never the
     * native `disabled` attribute, which would swallow the click entirely)
     * and a press instead points at what's missing. The escape from a wrong
     * checklist is still exactly one tap PER ROW (tick it and move on) —
     * never a "check all", which would teach a hurried storyteller to tick
     * without reading and defeat the point of the list.
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
// FT-888: the clock face's disc — geometry, gate and material, shared with the
// entry panels and the build panel.
@import "../faceDisc.scss";
// FT-986: $grimoire-plum (the checks/border deepening below) and
// $control-edge-hover (the storyteller's own purple — see the
// .viewer-storyteller rule) both live here. Read-only: this partial carries
// no bare selectors of its own, only variables and mixins, the same way six
// other components already import it.
@import "../controls.scss";

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

  // FT-986: THE NIGHT SELECTORS' OWN COLOUR lives in a SECOND, UNSCOPED
  // `<style>` block at the bottom of this file, not here. THE REASON IS A
  // REAL DOM FACT, found by measuring rather than assumed: SeatPicker's own
  // popup (`.sp-list`) is hoisted to `document.body` the moment it opens
  // (`golem/floatingPicker.js`'s `positionPopup()` — a different lane's
  // file, needed so the popup can escape this sheet's own scrolling list).
  // Once open it is no longer a DOM descendant of `.night-sheet` at all —
  // not visually, ACTUALLY, in the tree — so neither a `::v-deep` descendant
  // selector nor an inherited custom property declared here could ever
  // reach it (confirmed the hard way: a first pass that declared
  // `--ns-viewer-color` on `&.viewer-*` right here coloured the TRIGGER
  // correctly and left the OPEN POPUP's border and picked-row highlight
  // exactly as blood-red as before — see the bottom of the file for the fix
  // and the "why unscoped" note that goes with it).
  // DAY, or the sheet switched off: just the flip-into-night pill, clear of
  // the town-centre plate.
  //
  // FT-975: `pointer-events: none` ADDED here. The pill inside is retired
  // (visibility:hidden, its own pointer-events:none — see `.phase.pill
  // .retired` below). So nothing in this state still
  // needs to receive the pointer — but `.night-sheet` itself is z-index 19,
  // stacked above TownInfo's `.info` (z-index 2), and its OWN box sits
  // exactly where the retired pill used to (same size, same centring) —
  // without this, that empty-but-still-hit-testable box silently ate every
  // click meant for TownInfo's relocated button underneath it (found via
  // elementFromPoint(): a real click at the button's own on-screen centre
  // resolved to `.night-sheet`, not the button — the pill's own visibility
  // :hidden/pointer-events:none fix was necessary but not sufficient).
  &:not(.has-list) {
    transform: translateY(105px);
    pointer-events: none;
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

  // ── THE DISC (FT-882; shared in FT-888, desktop only) ─────────────────
  //
  // The checklist stops being a rectangle floating over the dial and becomes
  // a PLATE LAID ON IT. Everything the shape IS — the radius off --face-r,
  // the cap fraction, the band chord and its floor, the desktop gate, the
  // material — now lives in src/faceDisc.scss, because three other menus on
  // this face are the same object and each used to carry its own copy of
  // these numbers. What stays HERE is only what is this sheet's own: which
  // element is the header, which is the band, and what the rows do once the
  // column narrows.
  @include face-disc-gate {
    &.has-list {
      @include face-disc-frame;

      // THE HEADER — the progress count and the night scrub, in the top cap.
      // The 2px bottom padding buys back most of what the arc check costs by
      // sitting the row lower; `align-items: flex-end` is what puts it at the
      // BOTTOM of the cap, which is the placement the 1.3r width was measured
      // against.
      > .phase {
        @include face-disc-head;
        align-items: flex-end;
        padding: 0 0 2px;
      }

      // THE BAND — the checklist itself. The drip runs down the band's own
      // inside edge (the directive reserves its 30px lane in the host's
      // padding), so it lands well inside the circle rather than on the rim.
      > .ns-rows {
        @include face-disc-band;
      }

      // NOBODY WAKES TONIGHT. There is no header on this night (the progress
      // count is `v-if="roster.length"`), so this message has to reserve the
      // top cap itself — measured: left to grow into the space the header
      // would have held, it pushed the End-night button onto the disc's bottom
      // edge and both their corners were sheared by the arc
      // (2026-08-19-night-disc-empty.mjs, first run). Same band, same caps,
      // whether the night has rows or a sentence.
      > .ns-empty {
        @include face-disc-band($width: null);
        margin: var(--fd-caph) 0 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      // THE PRIMARY BUTTON — End night, in the bottom cap.
      > .phase-flip.bottom {
        @include face-disc-foot;
        // FT-1108 (user): "end night button doesn't need to be that wide it
        // should fit within the disc". The mixin sizes the foot button to
        // 0.95 of the disc's HORIZONTAL RADIUS — but the button sits near the
        // bottom of the circle, where the chord is far shorter than the
        // radius, so a button that fits by that rule still hangs out over
        // both curves. It has two words on it and needs none of that width:
        // it sizes to its own label now, with the old width kept as the
        // ceiling so it can never grow back past the disc.
        // ONE OBJECT WITH START GAME (user: "night end can share the
        // position and size of start game?"). Every value below is HostTools'
        // `.start-dock` / `.start` restated — the same width expression, the
        // same zeroed top margin, the same type size, padding, border weight
        // and radius. Both buttons ride the same `face-disc-foot` translate
        // already, so matching the box is what makes them land in the same
        // place at the same size: the storyteller sees ONE primary button in
        // the disc's foot that changes its word, not two buttons that
        // resemble each other.
        //
        // The width expression is HostTools' own, comments and all: a floor
        // of 150px because below it the label wraps, and 0.583 of the disc's
        // HORIZONTAL radius above it. Its bottom corners are the binding
        // measure against the arc, and that pair of numbers is what was
        // solved to clear it. Copied rather than shared because the two
        // components cannot reach each other's scoped CSS; if a third foot
        // button ever appears, this belongs in faceDisc.scss.
        //
        // COLOUR IS NOT COPIED. End night keeps its own purple plate — the
        // shared thing here is the geometry, not the skin.
        width: max(150px, 0.583 * var(--fd-rx));
        margin-top: 0;
        font-size: 100%;
        padding: 4px 14px;
        border-width: 3px;
        border-radius: 10px;
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

    // FT-975: retired — see the template comment above `.phase.pill`.
    // Invisible, not gone: keeping the box (rather than display:none or
    // dropping the v-if) is what keeps `.night-sheet`'s day box the size
    // it has always been. visibility:hidden also
    // takes it out of the tab order and off screen readers on its own —
    // tabindex="-1" in the template is belt-and-suspenders documentation
    // of that, not load-bearing.
    &.retired {
      visibility: hidden;
      pointer-events: none;
    }
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

  // FT-882: the editable night counter, beside the progress it belongs to.
  // A shade more present than the count next to it — that is a readout, this
  // is a control, and the difference should be visible before it is hovered.
  .ns-day {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 14px;
    font-size: 90%;
    letter-spacing: 0.5px;
    .pp-label {
      opacity: 0.65;
    }
  }

  // The scrub's row-control width (52px) centres a single digit far enough
  // from the word beside it that "Night      1" read as two separate things
  // rather than one label (shot: final-1280x800). Narrowed for THIS use only
  // — a row control still gets the shared 52px, because there it sits in a
  // line of same-width boxes. Two digits still fit at 34px.
  //
  // Nested under `.phase` on purpose, and NOT written out as
  // `.phase .ns-day …` here — that compiles to `.phase .phase .ns-day …`,
  // which matches nothing (found by measuring: the box stayed 52px). The
  // one inherited `.phase` is what puts this ahead of NumberScrub's own
  // `.num-scrub-box.night`, which is otherwise an exact specificity tie
  // decided by whichever stylesheet happens to be emitted last.
  .ns-day .num-scrub-box {
    width: 34px;
    padding: 0 4px;
    @media (pointer: coarse) {
      width: 46px;
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
  transition:
    color 150ms,
    border-color 150ms,
    background 150ms;
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

    // WARN: the press WORKS, and the button says it is going to cost
    // something. Gold, not the blocked state's grey-out — the same gold the
    // chip that set this state wears on the build panel, so the two ends of
    // one setting look like one setting. Mutually exclusive with .ready in
    // practice (a finished list has nothing to warn about) and with .blocked
    // by construction (warn never blocks).
    &.warn {
      color: #f0d9a0;
      background: rgba(216, 180, 90, 0.16);
      border-color: rgba(216, 180, 90, 0.7);
      &:hover,
      &:focus-visible {
        background: rgba(216, 180, 90, 0.28);
        border-color: rgba(216, 180, 90, 0.9);
        color: #fff3d8;
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

// FT-1067: THE DAY-LENGTH ROW — one line, under the flip button, quiet by
// construction. Same three-piece shape as the Tower panel's own tw-row
// (mark, Off|Timed segment, minutes scrub) at a smaller scale — this is a
// side control on a checklist, not a panel row of its own.
.ns-daylen-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 6px;
  flex-shrink: 0;
  font-size: 80%;
  // quiet until it matters: dimmed at rest, like the progress readout
  // above (.phase-progress), full ink once the pointer or keyboard is on it
  opacity: 0.6;
  transition: opacity 150ms;
  &:hover,
  &:focus-within {
    opacity: 1;
  }
}

.ns-daylen-title {
  font-family: PiratesBay, sans-serif;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.ns-daylen-mark {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  color: rgb(154, 146, 133);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
}

.ns-daylen-seg {
  @include control-plate;
  display: inline-flex;
  overflow: hidden;
  flex: 0 0 auto;
}

.ns-daylen-opt {
  @include control-cell;
  font-size: 90%;
  padding: 2px 6px;
  &:hover {
    color: #ff8a8a;
  }
  &.on {
    background: $control-on-bg;
    font-weight: bold;
  }
  @media (pointer: coarse) {
    min-height: 36px;
    padding: 0 10px;
  }
}

// the minutes scrub, dimmed further while Off (the number is what Timed
// would return to; scrubbing it is itself the "on" gesture — the panel
// row's own rule, restated).
.ns-daylen-min {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  &.idle {
    opacity: 0.55;
  }
  .num-scrub-box {
    width: 30px;
    padding: 0 3px;
    @media (pointer: coarse) {
      width: 42px;
    }
  }
}

.ns-daylen-unit {
  font-size: 85%;
  opacity: 0.7;
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
    // FT-986 (user call): DEEPER — $grimoire-plum on the BORDER only. THE
    // GLYPH ITSELF DOES NOT MOVE, and that is a measured call, not a
    // half-finished one — see claude_temp_test/2026-08-20-ft986-proof.mjs.
    //
    // A checkbox is a harder case than FT-981's plus buttons: "check-square"
    // is a thin outline plus a diagonal stroke, not a thick 15px fill, and
    // this sheet's ground runs near-black (measured ~rgb(10,8,8) behind this
    // exact control, both in the rectangle form and under the desktop
    // disc's tinted glass). Sampling the RENDERED ink (not the CSS literal —
    // the glyph sits at svg opacity .95, so what a reader sees is already a
    // composite over that ground):
    //
    //   rgb(120,105,135) [shipped, unmoved]   -> 3.62 : 1
    //   $grimoire-plum #4b3565 [tried first]  -> 1.80 : 1
    //
    // Full plum roughly HALVES the tick's own contrast and lands well under
    // the 3:1 WCAG guideline for a graphical object — the outcome the brief
    // asked to watch for and split on rather than ship. So the split: the
    // BORDER (below, and on `.checked` further down) goes to full plum,
    // because it is a 1px outline that has never been the only thing saying
    // "checked" — the icon SHAPE already does (empty square vs filled
    // check-square), independent of colour — and its own contrast was low
    // before this pass too (1.91:1 unchanged to 1.3:1, both already under
    // 3:1, both already secondary to the shape). The TICK stays the shipped
    // tone, because it is the one channel with a real contrast budget to
    // protect.
    border: 1px solid rgba($grimoire-plum, 0.3);
    border-radius: 4px;
    svg {
      opacity: 0.34;
    }
    &:hover,
    &:focus-visible {
      border-color: $control-edge-hover;
      background: rgba($grimoire-plum, 0.12);
      color: $control-edge-hover;
      outline: none;
      svg {
        opacity: 1;
      }
    }
    &.checked {
      color: rgb(120, 105, 135);
      border-color: rgba($grimoire-plum, 0.55);
      svg {
        opacity: 0.95;
      }
      // hover-after-ticking stays in the purple family (undo it) rather
      // than reading as a different control
      &:hover,
      &:focus-visible {
        color: $control-edge-hover;
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

  // FT-1005: THE GOLD SEAM — the quiet convention for "the player entered
  // this themselves". Two wearers, one colour: a seat-picker slot the
  // player's own frame filled (an inset gold ring on the trigger), and the
  // player's own typed words (a gold quoted line). Gold rather than a glyph
  // because the answer zone is already glyph-dense, and because gold is
  // already this sheet's colour for "this came from the other side of the
  // table" (.ns-lie lit, .ns-grim-show open). The storyteller's own edit
  // clears the ring (setTarget empties the slot's mark).
  .ns-target.from-player ::v-deep .sp-trigger {
    border-color: #b28f2f;
    box-shadow: inset 0 0 0 1px rgba(212, 175, 85, 0.55);
  }

  .ns-player-said {
    max-width: 170px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-style: italic;
    color: #d4af55;
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

  // FT-1003: the granted-grimoire pair — Show wears .ns-told's box (it is a
  // pressable control like every other in the answer zone); lit state goes
  // gold, because an open window on the truth is the same KIND of statement
  // as the mask (data, not chrome — see .ns-lie's colour note below). The
  // pin only exists while the window is open and borrows .ns-lie's square.
  .ns-grim {
    display: inline-flex;
    gap: 4px;
    flex-shrink: 0;
    .ns-grim-show {
      height: 30px;
      font-family: inherit;
      font-size: 12.5px;
      color: white;
      padding: 0 8px;
      background: rgba(0, 0, 0, 0.55);
      border: 1px solid #3d3d3d;
      border-radius: 5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      &:focus-visible {
        outline: none;
        border-color: #a01414;
      }
      &:disabled {
        opacity: 0.4;
        cursor: default;
      }
      &.on {
        color: #e0b45f;
        border-color: #8a6f2e;
        background: rgba(184, 137, 47, 0.16);
        box-shadow: 0 0 7px rgba(184, 137, 47, 0.4);
      }
    }
    .ns-grim-pin {
      height: 30px;
      width: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #d8cdb4;
      background: rgba(0, 0, 0, 0.55);
      border: 1px solid rgba(120, 105, 135, 0.3);
      border-radius: 5px;
      svg {
        opacity: 0.42;
      }
      &:hover,
      &:focus-visible {
        border-color: rgba(150, 130, 175, 0.75);
        outline: none;
        svg {
          opacity: 0.92;
        }
      }
      &.on {
        color: #e0b45f;
        border-color: #8a6f2e;
        background: rgba(184, 137, 47, 0.16);
        svg {
          opacity: 1;
        }
      }
    }
  }

  // FT-862: the lie flag shares the same box treatment and height as every
  // other action control, not a bare floating glyph at a different weight.
  // FT-874: the note-toggle this was paired with is gone — the verb plus
  // the picker now says what was recorded.
  //
  // FT-874 (2026-08-19, user call): A LIAR, ON OR OFF. The square checkbox
  // became the MASK — the glyph .ns-truth already wears on this same row for
  // "what is shown is not what is true".
  //
  // THE COLOUR STAYS GOLD, and this is the decision the surface was waiting
  // on: the gold flag was the last non-purple thing on a sheet whose chrome
  // all went purple in FT-882. It stays gold because purple and gold here are
  // not competing accents, they are two different KINDS of statement, and this
  // sheet already draws that line explicitly (see the team-colour block
  // above): purple is CHROME — the tick, its outline, the finish button, the
  // things you can PRESS — and gold on this row is what is NOT TRUE.
  // .ns-truth's mask is #e0b45f; this is the same glyph carrying the same
  // meaning a few pixels away from it, and painting one purple while the other
  // stayed gold is what would actually read as a leftover.
  //
  // So the BOX is chrome and the MARK is data. The box takes the purple
  // hairline .ns-check wears, because "you can press this" is what the box
  // says and the box is the part that is always visible. The mask inside it
  // goes gold only when lit.
  //
  // TWO STATES AND NO THIRD. The glyph is identical in both, so brightness
  // does all the work and the two are kept far apart on purpose: a dim
  // parchment mask against a lit gold one with a glow. Hover is not a state —
  // it lifts the OFF mark to legible and brightens the ON one, and neither
  // reads as set.
  //
  // THE DIMMING IS ON THE GLYPH, NOT ON THE BOX, and that is .ns-check's
  // lesson applied rather than re-learned: an opacity on the span takes the
  // border down with it (0.3 × 0.42 ≈ 0.13 alpha — measured at 6× before this
  // was moved, and the edge had all but vanished), and the border's whole job
  // is to say "press here" while the mark is quiet.
  .ns-lie {
    height: 30px;
    width: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;
    color: #d8cdb4;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(120, 105, 135, 0.3);
    border-radius: 5px;
    transition:
      color 130ms,
      border-color 130ms,
      background 130ms,
      box-shadow 130ms;
    svg {
      opacity: 0.42;
      transition: opacity 130ms;
    }
    &:hover,
    &:focus-visible {
      border-color: rgba(150, 130, 175, 0.75);
      background: rgba(120, 105, 135, 0.12);
      outline: none;
      svg {
        opacity: 0.92;
      }
    }
    &.on {
      // #e0b45f — .ns-truth's own gold, not a second one. (The phase sun and
      // the votes count sit a shade under it at #d8b45a; the mask matches the
      // mask.)
      color: #e0b45f;
      border-color: #8a6f2e;
      background: rgba(184, 137, 47, 0.16);
      // a state change with no shape change needs the glow to be readable
      // across a scanned list rather than only under the cursor
      box-shadow: 0 0 7px rgba(184, 137, 47, 0.4);
      svg {
        opacity: 1;
      }
      &:hover,
      &:focus-visible {
        // brighter, still gold — hovering a set mark offers to UNSET it, not
        // to become a different control
        color: #f3d189;
        border-color: #b8892f;
        background: rgba(184, 137, 47, 0.24);
      }
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

<!--
  FT-986: THE NIGHT SELECTORS' OWN COLOUR — deliberately UNSCOPED, and the
  whole rest of this comment is why.

  golem/floatingPicker.js's positionPopup() (a different lane's file, unread
  further than this) hoists SeatPicker's own popup (`.sp-list`) to
  `document.body` the instant it opens, so it can escape this sheet's own
  scrolling `.ns-rows` list. From that moment it is not a DOM descendant of
  `.night-sheet` — genuinely, in the tree, not just visually — so no amount
  of `::v-deep` in the SCOPED block above could ever reach it, and neither
  could a custom property declared there: inheritance follows the real DOM
  parent chain, and `.night-sheet` is no longer in it. (Found the hard way —
  see the note left in its place above.) The TRIGGER button is not hoisted
  and is styled from the scoped block same as any other child; only the
  OPEN POPUP needed this.

  `:root:has(...)` is what lets a genuinely global block still answer
  "who is looking" correctly: it reads the SAME `.viewer-storyteller` /
  `.viewer-good` / `.viewer-evil` class the template already puts on
  `.night-sheet` off `viewerAlignment` (see the component's computed) — so
  there is exactly ONE place that decides the colour; this block only
  relays it to `:root` so a hoisted child can inherit it too. Where
  `:has()` goes unsupported, the selector simply never matches and every
  `var()` below falls back to SeatPicker's ORIGINAL blood-red — the same
  neutral-on-unknown behaviour a null `viewerAlignment` already gets, never
  a broken render.

  `.sp-list` / `.sp-row` are SeatPicker's own class names and are not used
  anywhere else in this app (checked), so reaching them globally here
  carries no real collision risk.
-->
<style lang="scss">
@import "../vars.scss";
@import "../controls.scss";

// $control-edge-hover, not $grimoire-plum, for the storyteller: that is the
// token controls.scss itself names "the storyteller's own colour throughout
// the app" — $grimoire-plum is this file's OTHER purple (see .ns-check in
// the scoped block above), and using it here too would make one sheet speak
// two purples for two different jobs. $townsfolk/$demon are the same reds
// and blues every team colour on this sheet already reads off vars.scss's
// $ns-team-colors map, so a good or evil viewer's own colour agrees with
// the colour their OWN character's name would wear in this same list.
//
// rgba(<token>, a) on a token that already carries its own alpha
// ($control-edge-hover is rgba(150,130,175,.75)) REPLACES that alpha rather
// than compounding it — Sass's own rgba() behaviour — so the wash tones are
// derived from the same three tokens, never a fourth literal.
:root:has(.night-sheet.viewer-storyteller) {
  --ns-viewer-color: #{$control-edge-hover};
  --ns-viewer-wash: #{rgba($control-edge-hover, 0.22)};
  --ns-viewer-hover-wash: #{rgba($control-edge-hover, 0.12)};
}
:root:has(.night-sheet.viewer-good) {
  --ns-viewer-color: #{$townsfolk};
  --ns-viewer-wash: #{rgba($townsfolk, 0.22)};
  --ns-viewer-hover-wash: #{rgba($townsfolk, 0.12)};
}
:root:has(.night-sheet.viewer-evil) {
  --ns-viewer-color: #{$demon};
  --ns-viewer-wash: #{rgba($demon, 0.22)};
  --ns-viewer-hover-wash: #{rgba($demon, 0.12)};
}

// `:root` PREFIXED, AND THE CLASS DOUBLED, ON EVERY RULE BELOW — a plain
// `.sp-trigger { border-color: var(...) }` LOST outright to SeatPicker's own
// scoped `.sp-trigger[data-v-xxxxx]{border:1px solid #3d3d3d}` (found the
// same way as the hoisting bug: measured, not assumed — a run where
// `--ns-viewer-color` was proven set correctly on `:root` and the trigger's
// own border still came back `#400`). A component's own `[data-v-xxxxx]`
// attribute selector is worth one specificity point; `:root` plus a doubled
// class buys three, which wins outright rather than gambling on which of
// two build outputs happens to be emitted later in the bundle.
:root .sp-trigger.sp-trigger {
  border-color: var(--ns-viewer-color, #3d3d3d);
  &:hover,
  &.open {
    border-color: var(--ns-viewer-color, #400);
  }
}

// THE OPEN POPUP — the reason this whole block exists.
:root .sp-list.sp-list {
  border-color: var(--ns-viewer-color, #400);
  .sp-row {
    &:hover,
    &:focus {
      background: var(--ns-viewer-hover-wash, rgba(255, 0, 0, 0.1));
    }
    &.picked {
      background: var(--ns-viewer-wash, rgba(160, 20, 20, 0.22));
      box-shadow: inset 0 0 0 1px var(--ns-viewer-color, #a01414);
    }
  }
}
</style>
