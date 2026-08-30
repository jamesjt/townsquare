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
      <!-- FT-1313 (user): "0 / 4" READ AS AN OBLIGATION — a score to finish.
           The count now names what a storyteller actually tracks (rows still
           OPEN, i.e. neither sent nor skipped), and the hover text says the
           rule out loud: sending them all is never required. The folds below
           carry the other half of the arithmetic (what was sent, what was
           skipped, who is dead), so nothing the old fraction said is lost. -->
      <div class="phase" v-if="roster.length">
        <span class="phase-progress" :title="progressHint"
          ><span class="pp-label">Checklist:</span>
          {{ progressWord }}</span
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
        <!-- FT-1229 (user): NIGHTS COUNT FROM 1. The store's day counter is
             born at 0 ("the town has not reached its first night") and
             toggleNight moves it to 1 on the way into the first night — but
             leftover state could stand this sheet up at 0 (a game that ended
             mid-night, then Play again's setDay(0)), and the scrub's old
             min=0 let a correcting hand LAND on 0. Both doors close: the
             value shown floors at 1 (nightNumber) and the scrub cannot go
             below 1. History never shifts — this changes what the counter
             SAYS, never any entry's id; anything already logged stays under
             the night it was logged on (the scrub's own tooltip). The model
             half is the showList watcher below. -->
        <span class="ns-day" :title="dayHint">
          <span class="pp-label">Night</span>
          <NumberScrub
            preset="night"
            :value="nightNumber"
            :min="1"
            :max="99"
            :title="dayHint"
            @input="setDay"
          />
        </span>
      </div>

      <p class="ns-empty" v-if="!roster.length">Nobody wakes tonight.</p>

      <!-- FT-1229 (user): "more clearly its own area if there is a scroll bar
           present ... sink it or elevate it". SUNK — the app's own recessed
           vocabulary (the toggle wells): a region whose contents continue
           below the surface sits below the surface. The `scrolls` class lands
           only when the rows actually overflow (measured, see
           measureRowsOverflow) — a short list that fits wears no well. -->
      <ul
        class="ns-rows"
        :class="{ scrolls: rowsOverflow }"
        ref="rows"
        v-else
        v-blood-scroll
      >
        <!-- FT-1313 (user, from a real game): THE LIST FOLDS AS IT IS WORKED.
             One loop renders three groups — a collapsed SENT-&-SKIPPED fold at
             the top (rows already handled leave the working list the moment
             their button is pressed), the live rows, and a collapsed DEAD fold
             at the bottom (seats that died keep their rows on the sheet, out
             of the way, instead of vanishing as they did since FT-874 — see
             the roster getter's own FT-1313 note). `renderList` interleaves
             two pseudo-rows (`fold: true`) among the real ones so the row
             markup below exists exactly ONCE; a fold's own row is just its
             header button. NO DENSITY SETTING, deliberately: the fold header
             stands in the list with its counts, one click from open, so
             nothing is ever hidden — a setting would be a second answer to
             the question the header already answers. -->
        <template v-for="row in renderList">
          <li
            v-if="row.fold"
            :key="row.key"
            class="ns-fold"
            :class="{ open: folds[row.id], dead: row.id === 'dead' }"
          >
            <button
              type="button"
              class="ns-fold-head"
              :title="row.hint"
              @click="toggleFold(row.id)"
            >
              <span class="ns-fold-caret">{{ folds[row.id] ? "▾" : "▸" }}</span>
              <img
                v-if="row.id === 'dead'"
                :src="uiDead"
                alt=""
                class="ns-fold-mark"
              />
              <font-awesome-icon
                v-else
                icon="check-square"
                class="ns-fold-fa"
              />
              <span class="ns-fold-label">{{ row.label }}</span>
            </button>
          </li>
          <li
            v-else
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
                // FT-1313: passed over by the storyteller's own hand — dims
                // like a done row; the Skip button stays bright (the way back)
                skipped: isSkipped(row),
                // FT-1313: a Dead-fold row — the seat no longer wakes
                deadseat: row.isDeadSeat,
                // FT-874: the guided escape from a blocked end-night press —
                // a brief highlight, not a permanent state
                flash: flashing[row.key],
              },
            ]"
          >
            <!-- (FT-874's DONE CHECKBOX stood here, spanning both lines of the
                 row in the LEFT column. FT-1173 replaces it with the SEND
                 button below — same grid area, now a fixed RIGHT-hand column —
                 because the tick's job changed: a row's controls edit a local
                 draft now, and "this row is done" and "deliver what I
                 composed" became one press. Stood down per the house rule, not
                 torn out; its styles remain below under the same name.) -->
            <span
              v-if="false"
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

            <!-- FT-1173: THE SEND BUTTON — one control, one meaning: "this row
                 is done." It spans both of the row's lines (grid-area "state",
                 now the FIXED right-hand column, so the buttons form a column
                 down rows of differing content widths).

                 WHAT A PRESS DOES depends on what is in front of it:
                 · edits staged (dirty) — commit the draft to the log, mark the
                   row done, and — where the town is asking its players
                   (mode "everyone") — the ask/answer lands on that one seat's
                   own night surface through the delivery lane the log has
                   always had. Nothing reached anybody while it was being
                   composed; the drafts live in this component's own data.
                 · nothing staged — a plain done tick (and on a done row, the
                   reopen), exactly the job the old checkbox did.
                 In storyteller-only mode there is no ask to deliver, so the
                 button honestly reads as a tick — same column, same meaning.
                 (Per FT-1107's user call the RECORD still reaches the seat's
                 own player when a row is committed in that mode — the tick is
                 about who is being ASKED, not about hiding their own log.)

                 ── FT-1272 (user): AND IT WILL NOT SEND AN EMPTY ANSWER. ──

                 A press used to deliver whatever was composed, including
                 nothing — and "nothing" reaches the player's own night surface
                 as a row with no answer on it at all, which reads to them as
                 the storyteller having answered and said nothing. The button is
                 disabled while an owed answer is missing; `sendDisabled` states
                 the predicate and `sendHint` says out loud what is missing, so
                 a greyed control never leaves the storyteller guessing.

                 ROWS THAT ARE TOLD NOTHING BACK ARE UNAFFECTED — the Monk, the
                 Poisoner, the Butler, the Imp have no answer control, so there
                 is nothing to be empty and they tick exactly as before.

                 One consequence, stated rather than discovered: with the
                 checklist set to REQUIRED (NightModeRow), End night was already
                 gated on every row being ticked, so it is now transitively
                 gated on every row being answered. That is the setting doing
                 what it says. In warn/off it stays a warning.

                 ── AND A SENT ROW STAYS SENT (FT-1272 item 6) ──

                 The button itself is never disabled on a done row: it is the
                 REOPEN, and it is the only way back into a locked row's
                 controls. See `isLocked`.

                 ── FT-1296 (user): AND IT ONLY SAYS "SEND" WHERE SOMETHING IS ──
                 ──                 ACTUALLY SENT.                            ──

                 "the imp doesn't get info from the story teller so send is the
                 wrong there. Same with poisoner and some other roles" — and the
                 other roles are the Monk and the Butler. Four rows in the
                 shipped table choose a seat and are told nothing back, so their
                 press delivers nothing and the word named an act that does not
                 happen.

                 The question is put to golem/nightInfo (`nightExchange`), which
                 reads it off the `by` every field has always carried — it is
                 `seatPickOwner`'s move a second time, not a role-name list here.
                 Three faces, and the row's OWN nature picks one:

                   TELLS    Send / Sent, the paper plane. Something composed here
                            reaches that seat.
                   RECORDS  Received, the checkbox pair. The storyteller is
                            writing down the player's own choice; the tick is the
                            acknowledgement, and nothing leaves this browser.
                   NEITHER  Done, the checkbox pair — the plain tick, identical
                            to storyteller-only mode's, because that is what it
                            is (unreachable on today's roster; see nightExchange).

                 WHY THE CHECKBOX PAIR AND NOT A NEW MARK. The plane means SENT
                 and only sent (FT-1211's ruling, still in force), so it cannot
                 go on a row that sends nothing. The bare tick is already the
                 DELIVERED row's done face, so borrowing it would put one glyph
                 on two meanings. `square`/`check-square` is the fork's own
                 existing "this is a tick, nothing travels" mark — it is what
                 THIS BUTTON already wears in storyteller-only mode — and it was
                 free in send mode. No new metaphor was needed.

                 REOPEN IS UNCHANGED ON BOTH (FT-1291): a done row of either kind
                 is never disabled, and its press is still the way back in.

                 ON THE CLASSES: `tickonly` widened from "the town is not asking
                 anybody" to its actual meaning — this press is a tick, nothing
                 travels — which is true of a RECORDS or NEITHER row in send mode
                 for exactly the same reason. `records` is new beside it. Both
                 are unstyled seams (the dress is carried by the glyph and by
                 `.sent`), kept so a later pass can separate the two ticks
                 without re-deriving which is which. -->
            <!-- FT-1313 put SKIP in this cell too, stacked under Send; FT-1329
                 (user) moved it out to the LEFT of the working line (see
                 `.ns-work` below) — Send and Skip must not stack, and the
                 state cell is Send's alone again, exactly the FT-1173
                 arrangement. The `.ns-state` wrapper stays: the done/skipped
                 fades carve it out by name. -->
            <span class="ns-state">
              <button
                type="button"
                class="ns-send"
                :class="{
                  sent: entryFor(row).done,
                  dirty: isDirty(row),
                  tickonly: !rowTells(row),
                  records: rowRecords(row),
                }"
                :disabled="sendDisabled(row)"
                :title="sendHint(row)"
                @click="sendRow(row)"
              >
                <font-awesome-icon :icon="sendIcon(row)" />
                <span class="ns-send-word">{{ sendWord(row) }}</span>
              </button>
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

              <!-- FT-1150 (user): THE ABILITY MOVED UP HERE, onto the identity
                   line, and the whole next line now belongs to the controls.
                   "maybe we put the short ability description in line, with the
                   role name and player name. then uses the whole next row for
                   the info?"

                   WHY IT IS THE ONE THAT YIELDS. The sentence is REFERENCE —
                   read once on the first row that wakes, known by the third
                   night — so it is the thing that can shrink and truncate (the
                   tooltip still carries the official wording, FT-886). The
                   answer controls are what a storyteller ACTS on, every night,
                   under time pressure, and a control that truncates is just a
                   control you cannot use. So the sentence gives up its own line
                   and the controls take it whole.

                   FT-874/882's arrangement had the two SHARING line two, which
                   is why the controls were small: on the disc's ~370px band
                   they were negotiating for roughly half of it and losing.
                   Measured before this pass at 1280x800: the answer zone got
                   188.8px of a 372px band and every information row stood 98.8px
                   tall (three lines). See the style block's own note. -->
              <span class="ns-reminder" :title="row.official">{{
                row.reminder
              }}</span>
            </div>

            <!-- THE WORKING LINE (FT-882, re-tasked FT-1150). It used to hold
                 TWO children and exist to make them negotiate one line: the
                 ability sentence and the controls sat side by side where both
                 fit and the controls dropped below where they did not.

                 There is nothing left to negotiate — the sentence moved onto
                 the identity line above, so this wrapper now holds the controls
                 alone and is simply the row's second line. It is KEPT rather
                 than folded away: it is the grid item the row's `work` area
                 names, the `.done` fade reaches through it by name, and the
                 disc's own rules hang off it. -->
            <div class="ns-work">
              <!-- FT-1313 / FT-1329: SKIP — the storyteller's explicit "not
                   this one": no send, nothing logged, the row folds into the
                   Sent-&-skipped group at the top of the list and stops
                   counting toward the open count and the End-night checks.
                   EVERY live row is skippable — skipping is the storyteller's
                   right, so there is no per-role gate — and the same button
                   un-skips (it stays bright inside the fold, the way the Send
                   button stays bright on a done row). Hidden on a DONE row (a
                   sent row's way back is the reopen, not a second control)
                   and on a Dead-fold row (nothing there is owed, so there is
                   nothing to skip). Skip marks live in this component + a
                   per-town localStorage stash, never in the log and never on
                   the wire: a skip is the storyteller declining to write, so
                   it must not create an entry — an entry is delivered to the
                   seat it names (FT-1272's empty-answer lesson).

                   FT-1329 (user): it stood STACKED UNDER SEND in the state
                   cell; it opens the working line now — the LEFT of the row,
                   before the action controls, so declining a row and doing a
                   row are two different places and Send stands alone on the
                   right. Same button, same semantics, same dress; only the
                   address changed. -->
              <button
                v-if="!row.isDeadSeat && !entryFor(row).done"
                type="button"
                class="ns-skip"
                :class="{ on: isSkipped(row) }"
                :title="skipHint(row)"
                @click="toggleSkip(row)"
              >
                <font-awesome-icon icon="forward" />
                <span class="ns-skip-word">{{
                  isSkipped(row) ? "Skipped" : "Skip"
                }}</span>
              </button>
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
                <!-- FT-1229 (user): THE ROW'S GRAMMAR SPLITS where a row holds
                     both halves of a night action. The seat pickers are the
                     PLAYER'S choice (the Fortune Teller points at two seats),
                     and the told control is what the character is TOLD back —
                     two different speakers, so two labels: "Selects:" before
                     the pickers, the role's own verb (usually "Learns:")
                     before the answer. A row with only one half keeps its one
                     label exactly as before. The labels' titles carry the
                     provenance lesson — a gold-seamed slot arrived from the
                     player's own hand (FT-1005's mark), a plain one is the
                     storyteller's entry. No new chrome; the seam was already
                     the mark.

                     ── FT-1272 (user): "Selects:" WAS WRONG, AND WRONG BY ──
                         READING THE WRONG FACT.

                     A Librarian selects nothing. A Washerwoman selects nothing.
                     An Investigator selects nothing. The STORYTELLER decides
                     which two players to point at and which character to name;
                     the player sits there with their eyes shut. FT-1229 split
                     the grammar on whether the row HAS seat slots, and the
                     checklist draws a slot for every pointing whoever makes it,
                     so every first-night info role was labelled as if the
                     player had chosen its targets.

                     The label now asks the ROLE what kind of act its seats are
                     — golem/nightInfo's `seatPickOwner`, off the `by` each
                     PLAYER field has always carried — and never the role's
                     name. See `seatsAreStorytellers` for the verb's own
                     reasoning ("Points at:" over "Shows:"). -->
                <span
                  v-if="splitLabels(row)"
                  class="ns-label ns-label-selects"
                  :class="{ 'by-storyteller': seatsAreStorytellers(row) }"
                  :title="selectsHint(row)"
                  >{{ seatVerb(row) }}</span
                >
                <span v-else-if="rowLabel(row)" class="ns-label">{{ rowLabel(row) }}</span>

                <!-- FT-1005: a slot the seat's own player filled wears the gold
                     seam (see .from-player below) — the quiet mark that says
                     "their own pick" apart from the storyteller's record. The
                     storyteller's edit clears it (setTarget). -->
                <!-- FT-1150 (user): A SEAT PICKER SHOWS EXACTLY WHAT THE PLAYER
                     WILL SEE — names, and nothing about anybody's character.
                     "they shouldn't see Fake 1 is an imp, so once the player
                     has been selected just show the player names. if it is a
                     select player, exactly as the player will see."

                     `show-role` used to be passed `isStoryteller`, which is
                     always true here (this component mounts for the storyteller
                     alone), so the trigger read "1. / Fake 1 / Imp" — the
                     seat's TRUE CHARACTER, printed inside a control whose whole
                     job is to compose WHAT THIS PLAYER IS BEING TOLD. Wrong
                     subject. It is the same call FT-986 already made about this
                     control's COLOUR: a seat picker on this sheet answers what
                     the viewer is TOLD, never what they ARE.

                     FALSE RATHER THAN REMOVED, and the prop stays bound: the
                     gate is a real prop on SeatPicker (default false) and
                     writing the decision out here is what makes it reviewable.
                     `icon-for` stays bound too — SeatPicker only ever calls it
                     behind `show-role`, so it is inert while this is false and
                     is one edit away from being live again.

                     NOT SWEPT ANYWHERE ELSE. The CHARACTER picker below keeps
                     its characters: a character IS what the Ravenkeeper and the
                     Undertaker are shown, so showing it is the same rule, not
                     an exception to it. And the storyteller's own bookkeeping
                     on this row (the truth chip, the lie mask, the grimoire
                     grant) is not a rendering of what a player receives at all,
                     so this rule does not reach it. The grimoire itself still
                     holds everything; this is one control not lying about its
                     own subject. -->
                <!-- FT-1173: every control on this line reads viewFor(row) —
                     the stored entry with this component's own uncommitted
                     draft laid over it. A player's arriving pick still shows
                     (it lands in the store), the storyteller's own edits show
                     (they land in the draft), and nothing the storyteller
                     stages leaves this browser until the row's Send. -->
                <SeatPicker
                  v-for="slot in row.slots"
                  :key="'seat' + slot"
                  class="ns-target"
                  :class="{ 'from-player': targetBy(row, slot - 1) === 'player' }"
                  :players="players"
                  :picked-seat="viewFor(row).targets[slot - 1]"
                  :show-role="false"
                  :icon-for="p => roleIconUrl(p.role)"
                  :disabled="isLocked(row)"
                  :title="targetHint(row, slot)"
                  @pick="seat => setTarget(row, slot - 1, seat)"
                />

                <!-- FT-1229: the told half's own label — see the Selects note
                     above. The role's verb where nightInfo wrote one, plain
                     "Learns:" where it did not. -->
                <span
                  v-if="splitLabels(row)"
                  class="ns-label ns-label-learns"
                  :title="learnsHint(row)"
                  >{{ rowLabel(row) || "Learns:" }}</span
                >

                <template v-for="(field, fi) in extraFieldsFor(row).fields">
                  <!-- FT-1114 (user): "the yes, no can't be a tri-state
                       toggle. it needs to be a selector drop down or the user
                       might see the state. while the storyteller is cycling the
                       info."

                       THE CYCLE WAS A LEAK. Every click of the old button wrote
                       `told.ping` straight through, and that write reaches the
                       seat it is about — so a storyteller who meant NO and
                       clicked twice showed the player YES on the way there.
                       Nothing was wrong with the value that landed; the player
                       simply saw the one before it.

                       A dropdown has no way there: the list is a local view, and
                       exactly one value is ever written — the one that was
                       chosen. Reusing the panel's own OptionSelect rather than
                       rolling a third control, so this row also inherits the
                       plum the settings dropdowns just took.

                       ── FT-1272, THE QUESTION THAT LIVES RIGHT HERE ──

                       Asked (user): should this dropdown be disabled for the
                       storyteller when night actions are set to EVERYONE — the
                       players are answering for themselves, so why is the
                       storyteller still filling it in?

                       ANSWERED: NO, AND ON PURPOSE. The storyteller stays able
                       to fill or correct any row. A player may not answer, may
                       be absent, may misclick, may hand their phone to someone
                       — and the storyteller is the authority on what was
                       actually told at the table, which is the thing this row
                       records. Taking the control away would leave the one
                       person who KNOWS the answer unable to enter it.

                       The player's own arrival is already visible without
                       disabling anything: a slot they filled themselves wears
                       the gold seam (FT-1005, `.from-player`), so the
                       storyteller can see at a glance which half of the row
                       came from the table and which is their own hand. That is
                       the honest signal — a disabled control would have said
                       "this is not yours", which is false.

                       (The SENT-row lock below is a different rule and not an
                       exception to this one: it is about an answer already
                       delivered, not about whose answer it is.) -->
                  <OptionSelect
                    v-if="kindOf(field) === 'boolean'"
                    :key="'f' + fi"
                    class="ns-told-sel"
                    :class="pingClass(row)"
                    name="ns-ping"
                    hoist
                    aria-label="What you told them"
                    :options="pingOptions"
                    :value="pingValue(row)"
                    :disabled="isLocked(row)"
                    :title="pingHint(row)"
                    @input="v => setPing(row, v)"
                  />

                  <NumberScrub
                    v-else-if="kindOf(field) === 'number'"
                    :key="'f' + fi"
                    class="ns-num"
                    preset="night"
                    :value="numberValue(row, field)"
                    :min="field.min"
                    :max="field.max"
                    :disabled="isLocked(row)"
                    :title="numberHint(field)"
                    @input="n => setNumber(row, n)"
                  />

                  <CharacterPicker
                    v-else-if="kindOf(field) === 'character'"
                    :key="'f' + fi"
                    class="ns-charpick"
                    :roles="scriptRoles"
                    :picked-id="viewFor(row).told.characterId"
                    :picked-name="viewFor(row).told.characterName"
                    :icon-for="roleIconUrl"
                    :disabled="isLocked(row)"
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
                    :disabled="isLocked(row)"
                    :value="viewFor(row).told.text"
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

                <!-- FT-1121: THE GRIMOIRE'S OWN ANSWER, beside the row.
                     Storyteller-only like everything else in this component,
                     and shown ONLY where golem/nightTruth can actually compute
                     it — an uncomputable row shows nothing at all rather than
                     an empty slot that would read as "no evil neighbours".

                     It exists so a storyteller lies ON PURPOSE. The mask a few
                     pixels to its right says WHETHER what they gave was false;
                     this says WHAT WOULD HAVE BEEN TRUE, and it is deliberately
                     the quieter of the two — sage rather than gold, because
                     gold on this row means "not true" (see .ns-lie's colour
                     note) and this is the opposite statement. The word
                     "poisoned" / "drunk" rides it when the seat is impaired, so
                     a lit mask beside it reads as correct play rather than as a
                     mistake. -->
                <span
                  v-if="truthOf(row).known"
                  class="ns-oracle"
                  :class="{ differs: verdictFor(row).differs === true }"
                  :title="truthHint(row)"
                >
                  <span class="ns-oracle-tag">truth</span>
                  <span class="ns-oracle-val">{{ truthOf(row).display }}</span>
                  <span class="ns-oracle-imp" v-if="impairedOf(row)">{{
                    impairedOf(row)
                  }}</span>
                </span>

                <span
                  v-if="extraFieldsFor(row).mayBeFalse"
                  class="ns-lie"
                  :class="{
                    on: lieOn(row),
                    byhand: viewFor(row).lieBy === 'storyteller',
                    locked: isLocked(row),
                  }"
                  :tabindex="isLocked(row) ? -1 : 0"
                  role="checkbox"
                  :aria-checked="String(lieOn(row))"
                  :aria-disabled="String(isLocked(row))"
                  :title="lieHint(row)"
                  @click="toggleLie(row)"
                  @keyup.enter="toggleLie(row)"
                  @keyup.space="toggleLie(row)"
                >
                  <font-awesome-icon icon="theater-masks" />
                </span>
              </div>

              <!-- (FT-874's ability line stood HERE, as the second child of
                   .ns-work. FT-1150 moved it up into .ns-identity — see its
                   own note there. Everything about it is unchanged: still ONE
                   line, still truncated because a storyteller is SCANNING a
                   checklist rather than reading to learn a script, still
                   showing our short `reminder` with the OFFICIAL wording on
                   the tooltip (FT-886/882). Only which line it rides moved.) -->
            </div>
          </li>
        </template>
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
      <!-- FT-1229 (user): THIS ROW IS THE "PER DAY" MODE'S OWN SURFACE, and
           it shows ONLY there. The Game settings Day timer grew a third
           answer (Off / Timed / Per day, HostTools' row); Off and Timed
           both take this row off the sheet — Off has no clock to set, and
           Timed runs every day at the one fixed length Game settings holds.
           Per day is what this row is FOR: the storyteller sets the coming
           day's minutes night by night, right before ending the night. -->
      <div
        v-if="tower.dayTimerMode === 'perday'"
        class="ns-daylen-row"
        title="How long the next day runs before the tower calls time — the bell tolls and the countdown flashes; the day itself never ends on its own"
      >
        <font-awesome-icon class="ns-daylen-mark" icon="hourglass-half" />
        <span class="ns-daylen-title">{{ dayTimerLabel }}</span>
        <!-- FT-1229: the Off/Timed segment STOOD DOWN — the MODE lives on
             Game settings' three-way select now; on a row that only exists
             in Per day mode, a second mode switch was one control too many. -->
        <span
          v-if="false"
          class="ns-daylen-seg"
          role="radiogroup"
          aria-label="Day length"
        >
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

      <!-- FT-1173: STAGED DEATHS — the storyteller's queue for the night's
           end, standing directly ABOVE the button that commits it. Picking a
           seat stages it; a living seat stages a DEATH, a dead one a REVIVE
           (the entry knows its direction from the chair's state at the
           moment it is staged). NOTHING HAPPENS at stage time — no shroud,
           no broadcast, no frame: End night is the commit, and each applied
           entry goes through the exact players/update path the direct
           shroud click takes today. Removing a chip un-stages it; a queue
           the sheet loses any other way (a reload, the mode flipped)
           persists in the log's own stash until End night or removal.

           THE PICKER SHOWS NAME + CHARACTER (show-role), and that is a
           stated decision rather than an oversight of FT-1150's names-only
           rule: that rule binds controls that COMPOSE WHAT A PLAYER IS
           TOLD, and this list is the storyteller's own bookkeeping — no
           player ever receives a rendering of it, so it shows what helps
           the storyteller pick the right chair. -->
      <!-- FT-1220: the bell at night, with the checklist out. The staged
           line (FT-1173) already stands directly above End night, so the
           bell tops the FOOT STACK instead of colliding with it: bell /
           Deaths line / End night, one centred column. Same emitted ring,
           same shared skin as the day copy below the list.

           FT-1229 (user): STOOD DOWN — "the call back bell doesn't need to
           exist at night." Nobody is summoned DURING a night; the town is
           called back when a day starts, and the DAY copy below the list
           keeps the job. The night foot stack is Deaths / End night now.
           Left mounted-but-off per the house rule, not torn out. -->
      <button
        v-if="false"
        type="button"
        class="post-bell foot-bell"
        :class="{ cooling: callBackCooling }"
        :title="bellTitle"
        :aria-label="bellTitle"
        @click="$emit('call-back')"
      >
        <!-- FT-1242: FA `bell` stood down — the fork's own baked bell
             (ui-bell.png) rings the call-back everywhere it is offered. -->
        <img class="post-bell-mark" :src="uiBell" alt="" draggable="false" />
      </button>
      <!-- FT-1229 (user): the staged line's design pass. The strip reads
           label → chips → adder now: the chips are the CONTENT (each one a
           statement — the direction mark, the name, the character, its own
           remove), so they stand next to the label that names them, and the
           ADD affordance closes the line the way "+ add" rows do everywhere
           — a dashed, quiet control that cannot be mistaken for a chip.
           With nothing staged the whole strip dims to a whisper (see
           `.ns-staged.empty`): the storyteller who wants it finds it; the
           one who doesn't is not shouted at by an empty control.

           FT-1272 (user asked whether revives are handled): THEY ARE, and
           have been since FT-1229 — staging a DEAD seat stages a revive, the
           direction is stamped at stage time, and the chip wears the sage
           heartbeat instead of the skull. What was missing was any way to
           KNOW that without trying it: the strip's label said "Deaths", so
           the entire revive half lived in a tooltip nobody hovers. The label
           names both now, which is also what makes the EMPTY state teach —
           an empty strip reading "Deaths & revives" beside a "+ Add" is the
           instruction, and needed no second sentence to carry it. -->
      <div
        class="ns-staged"
        :class="{ empty: !staged.length }"
        v-if="roster.length || staged.length"
      >
        <span
          class="ns-staged-label"
          title="Deaths (and revives) staged for this night — applied when you press End night, not before"
        >
          <!-- FT-1232 (user): the app's own death mark, not the FA skull —
               the same ui-dead the kill row and the count strip wear. -->
          <img :src="uiDead" alt="" class="ns-staged-mark" />
          Deaths &amp; revives
        </span>
        <span
          v-for="(s, i) in staged"
          :key="'staged' + s.seat + s.dir"
          class="ns-staged-chip"
          :class="s.dir"
          :title="stagedHint(s)"
        >
          <font-awesome-icon
            :icon="s.dir === 'revive' ? 'heartbeat' : 'skull'"
          />
          <span class="ns-staged-name">{{ s.name || "Open seat" }}</span>
          <small v-if="s.roleName" class="ns-staged-role">{{
            s.roleName
          }}</small>
          <button
            type="button"
            class="ns-staged-x"
            title="Un-stage — nothing happens to this seat"
            @click="unstage(i)"
          >
            ×
          </button>
        </span>
        <SeatPicker
          class="ns-staged-add"
          :players="players"
          :picked-seat="-1"
          :show-role="true"
          placeholder="+ Add"
          :icon-for="(p) => roleIconUrl(p.role)"
          title="Stage a seat — a living seat dies at End night, a dead one revives"
          @pick="stageSeat"
        />
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

    <!-- FT-1214: END DAY, IN THE DISC'S FOOT. During the day (and during a
         night whose sheet is off) the disc's foot holds THE phase button —
         Start game (building, HostTools) → this (day) → End night (night,
         the checklist's own foot button above). One primary button that
         changes its word, always in the same place, wearing the same
         geometry (the shared face-disc-foot-button mixin) and its own skin.

         DESKTOP-DISC ONLY, by CSS rather than by a second condition here:
         below the face-disc gate this button is display:none and App.vue's
         storyteller-post keeps its own End day control — the move is the
         disc's, not every layout's. Same flipPhase as everything else; the
         sun/moon marks are FT-882's own pf-* pair, standing since the
         flanking marks came off the old pill ("the marks may yet come back
         somewhere on this sheet" — they are back). -->
    <!-- FT-1220: THE SUMMONS BELL, RIGHT ABOVE THE PHASE BUTTON. "Put the
         call back button right above the end day button" — and the same foot
         holds End night when the checklist is off, so the bell rides above
         the phase button in BOTH phases rather than jumping back to the left
         column at dusk. The bell is still App.vue's: the cooldown state and
         the ring live there (one timer, whichever copy of the bell is on
         screen), this copy only wears the state and emits. Same dress too —
         `.post-bell` is App.vue's own UNSCOPED skin, reused rather than
         copied. Desktop-disc only, by CSS, exactly like `.foot-day` below;
         below the gate App.vue's left column keeps the bell it has had
         since FT-1063. -->
    <button
      v-if="!showList"
      type="button"
      class="post-bell foot-bell"
      :class="{ cooling: callBackCooling }"
      :title="bellTitle"
      :aria-label="bellTitle"
      @click="$emit('call-back')"
    >
      <!-- FT-1242: FA `bell` stood down for ui-bell.png (see above). -->
      <img class="post-bell-mark" :src="uiBell" alt="" draggable="false" />
    </button>
    <button
      v-if="!showList"
      type="button"
      class="phase-flip foot-day"
      :title="isNight ? 'End the night' : 'End the day'"
      @click="flipPhase"
    >
      <!-- FT-1242: FA `sun` stood down — the baked sun (ui-sun.png), so the
           phase flip's day face is art like its night face already was. -->
      <img v-if="!isNight" class="pf-mark pf-sun" :src="uiSun" alt="" />
      <img v-else class="pf-mark pf-moon" :src="moonMarkSrc" alt="" />
      {{ footDayLabel }}
    </button>

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
import {
  extraFields,
  renderableType,
  labelFor,
  seatPickOwner,
  // FT-1296: whether the row delivers anything to the player at all — the
  // schema question the Send button had been guessing at.
  nightExchange,
  NIGHT_EXCHANGE,
  FIELD_OWNERS,
} from "../golem/nightInfo";
// FT-986: the seat pickers' own colour reads WHAT THE VIEWER IS TOLD, never
// what they are — see believedAlignment's own header for why.
import { believedAlignment } from "../golem/belief";
// FT-1121: THE TRUTH ORACLE. Reads `player.role` — the grimoire's truth —
// which only this client holds, and is imported HERE and nowhere else on
// purpose: this component mounts for the storyteller alone (App.vue's
// !isSpectator gate, the file header above) and no store getter reads that
// module, so an oracle verdict cannot be computed anywhere a player can see.
// See nightTruth's own HOST-SIDE section.
import { lieVerdictFor, impairmentOf } from "../golem/nightTruth";
import SeatPicker from "./SeatPicker";
import CharacterPicker from "./CharacterPicker";
// FT-874: the shared drag-scrub / click-to-type number control (also used by
// HostTools' Seats row) — replaces a bare <input type="number">.
import NumberScrub from "./NumberScrub";
// FT-1114: the shared dropdown, taking the yes/no row's old cycling button —
// see that element's own note for why a cycle could not stay.
import OptionSelect from "./OptionSelect";
// FT-874: the phase button's moon mark — same two filenames TownInfo.vue and
// RoleHoverCard already import, so whatever art lands there (an art lane is
// redrawing these in place) shows up here too without a second import to
// keep in sync.
import moonFirst from "../assets/moon-first.png";
import uiDead from "../assets/ui-dead.png";
import moonOther from "../assets/moon-other.png";
// FT-1242: the fork's own bell (baked this pass) rings the call-back, and
// the baked sun gives the phase flip a day face to match its moon.
import uiBell from "../assets/ui-bell.png";
import uiSun from "../assets/ui-sun.png";
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
  components: { SeatPicker, CharacterPicker, NumberScrub, OptionSelect },
  props: {
    // FT-1220: the summons bell's cooldown — App.vue owns the timer and the
    // ring itself (callTownBack / callBackCooling); this sheet only wears
    // the state on its foot-stack bell and emits `call-back` when pressed,
    // so the disc bell and the below-the-gate column bell share ONE cooling
    // clock rather than each keeping its own.
    callBackCooling: { type: Boolean, default: false },
  },
  data() {
    return {
      // FT-1232: the staged-strip label's mark (the app's own death art).
      uiDead,
      // FT-1242: the call-back bell and the day-phase sun — baked marks.
      uiBell,
      uiSun,
      // FT-874: rows the "end night" button just pointed at because the
      // storyteller pressed it early — view state, not log state.
      flashing: {},
      // FT-1173: THE DRAFTS — what the storyteller has composed on each row
      // and not yet sent, keyed by the row's own render key. Component data,
      // deliberately: the store is watched by the socket plugin (every
      // night/write lands on the seat it names), so "nothing reaches the
      // player until Send" is enforced by WHERE the draft lives, not by a
      // flag someone could forget. Shape per key:
      //   { targets: { [slot]: { seat, name } },  — only the touched slots
      //     told: { ...only the touched told keys },
      //     lie: { isFalseInfo, lieBy } | null }  — only if the mask was taken
      // A draft dies on Send (committed) and with the component (a redraw
      // mid-composition costs the draft, never the log).
      drafts: {},
      // FT-1313: SKIPPED ROWS, keyed by the row's own render key (which
      // carries the day, so a new night starts clean by construction).
      // Component state + a per-town localStorage stash (loadSkips /
      // persistSkips), NEVER the log: a skip is the storyteller declining
      // to write, and an entry — even an empty one — is delivered to the
      // seat it names (socket.js's addEntry/patchEntry subscriptions), which
      // is exactly the "answered you with nothing" artifact FT-1272 closed.
      // The stash is what survives a reload or the sheet standing down for a
      // nomination; losing it would only stand the rows back up, never lose
      // a logged word.
      skips: {},
      // FT-1313: the two folds' open/closed state — collapsed by default,
      // every night, which is the whole point of a fold. View state only.
      folds: { handled: false, dead: false },
      // FT-1067: the day-length control's furniture — same shape as
      // HostTools' own (tower snapshot + the last-set minutes, so Timed
      // returns to it rather than an arbitrary number). No new persistence:
      // this is a read of the one towerState the panel row already owns.
      tower: { ...towerState },
      // FT-1114: the yes/no row's three positions. "" is null — nothing
      // signalled yet — and it stays first so the list reads in the order the
      // row fills: unanswered, then the two answers.
      pingOptions: [
        { value: "", label: "—", title: "Nothing signalled yet" },
        { value: "yes", label: "Yes", title: "You told them YES", cls: "ns-ping-yes" },
        { value: "no", label: "No", title: "You told them NO", cls: "ns-ping-no" },
      ],
      dayLenMin: DAY_LENGTH_MIN,
      dayLenMax: DAY_LENGTH_MAX,
      dayLenDraft: towerState.dayLengthMin || 10,
      // FT-1229: do the checklist's rows actually overflow their band right
      // now? Measured (never assumed from the count — row heights vary), and
      // it is what puts the sunken well on the scroll region. See
      // measureRowsOverflow.
      rowsOverflow: false
    };
  },
  created() {
    // FT-1067: follow the tower from wherever else it changes (the panel
    // row, the dial's own menu) — this sheet never boots it (loadTowerForTown
    // is HostTools'/FaceHands' job on their own mount; by the time a night
    // sheet can show, a build or a reload has already run one of those).
    this.readTower();
    // FT-1313: restore this town's skip marks for tonight (a reload, or the
    // sheet standing down for a nomination, must not stand skipped rows back
    // up mid-night).
    this.loadSkips();
    window.addEventListener(TOWER_EVENT, this.readTower);
    // FT-1229: the band's height moves with the window (the disc scales),
    // so overflow is re-asked on resize as well as on every re-render.
    window.addEventListener("resize", this.measureRowsOverflow);
  },
  beforeDestroy() {
    window.removeEventListener(TOWER_EVENT, this.readTower);
    window.removeEventListener("resize", this.measureRowsOverflow);
  },
  mounted() {
    this.measureRowsOverflow();
  },
  updated() {
    // Cheap (two property reads against one element) and self-stable: the
    // flag is only written when it actually changes, so the update this
    // write itself schedules measures once more and stops.
    this.measureRowsOverflow();
  },
  watch: {
    // FT-1229: THE MODEL HALF of nights-count-from-1 (the display half is
    // nightNumber). A sheet standing up at "night zero" can only mean
    // leftover state — the ordinary road in (toggleNight) already moved the
    // counter to 1 — so the counter is set straight the moment the list
    // shows, and rows the storyteller then logs land under Night 1, the
    // number the header says. Nothing already logged is touched: setDay
    // moves the COUNTER only, never an entry's id (the dayHint promise).
    showList: {
      immediate: true,
      handler(showing) {
        if (showing && this.night.day < 1) {
          this.$store.commit("night/setDay", 1);
        }
      },
    },
    // FT-1313: the night moved (End night, the day scrub, a joiner syncing)
    // — re-read the stash, which only answers for ITS day: any other night's
    // marks come back as a clean slate. Row keys carry the day too, so even
    // a stale in-memory map could never dim another night's rows; this just
    // keeps the map honest.
    "night.day"() {
      this.loadSkips();
    },
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
    /** FT-1220: the bell's two voices — App.vue's own strings, verbatim. */
    bellTitle() {
      return this.callBackCooling
        ? "Just called the town back"
        : "Call the town back — everyone hears a sound";
    },
    /** The checklist shows at night, and only when the sheet is switched on. */
    showList() {
      return this.night.mode !== "off" && this.isNight;
    },
    /**
     * FT-1229: the night number as this sheet STATES it — floored at 1, the
     * same clamp every public phase readout already wears (TownInfo,
     * FaceHands, the disc-foot button). The store's 0 means "no night yet",
     * which is a fact about the day phase and never a night's name.
     */
    nightNumber() {
      return Math.max(this.night.day, 1);
    },
    /**
     * FT-1173: is the town ASKING its players (mode "everyone")? Decides the
     * row button's face: a Send (there is an ask/answer to deliver) against a
     * plain done tick (storyteller-only — nobody is being asked, so there is
     * nothing to "send"; per FT-1107 the committed RECORD still reaches the
     * seat's own player, which is about their log, not the ask).
     */
    isSendMode() {
      return this.night.mode === "everyone";
    },
    /** FT-1173: the staged-deaths queue — the night store owns it (it must
     *  outlive this component; see night.js's staged note). */
    staged() {
      return this.night.staged || [];
    },
    /**
     * FT-1214: the disc-foot phase button's word during the day (or a night
     * whose sheet is off) — the same label App.vue's storyteller-post button
     * carries (phaseActionLabel), so the control reads identically wherever
     * a layout draws it.
     */
    footDayLabel() {
      return (
        (this.isNight ? "End night " : "End day ") + Math.max(this.night.day, 1)
      );
    },
    /** Rows carry their own render key so the note map survives re-sorts. */
    roster() {
      return this.rawRoster.map(row => ({
        ...row,
        key: entryId(this.night.day, row.seat, row.role.id)
      }));
    },
    /**
     * FT-1313: TONIGHT'S THREE GROUPS, one pass.
     *   handled — sent (done) or skipped: out of the way, top fold.
     *   live    — the working list: rows still open.
     *   dead    — the roster's isDeadSeat rows (see night.js): bottom fold.
     * Everything else on this sheet that counts rows (the header count, the
     * End-night gate, the ready state) reads THIS split, so the four can
     * never disagree about what "open" means.
     */
    partition() {
      const handled = [];
      const live = [];
      const dead = [];
      this.roster.forEach((row) => {
        if (row.isDeadSeat) dead.push(row);
        else if (this.entryFor(row).done || this.isSkipped(row))
          handled.push(row);
        else live.push(row);
      });
      return { handled, live, dead };
    },
    /**
     * FT-1313: what the <ul> actually renders — the two fold headers as
     * pseudo-rows (`fold: true`) among the real ones, each followed by its
     * rows only while open. One list so the row markup exists once.
     */
    renderList() {
      const { handled, live, dead } = this.partition;
      const out = [];
      if (handled.length) {
        out.push({
          fold: true,
          id: "handled",
          key: "fold-handled",
          label: this.handledFoldLabel,
          hint:
            "Rows already " +
            (this.isSendMode ? "sent" : "done") +
            " or skipped tonight — folded out of the working list. " +
            "Open it to reopen a sent row or bring a skipped one back.",
        });
        if (this.folds.handled) out.push(...handled);
      }
      out.push(...live);
      if (dead.length) {
        out.push({
          fold: true,
          id: "dead",
          key: "fold-dead",
          label: "Dead · " + dead.length,
          hint:
            "Seats that have died — nobody wakes them, so their rows stand " +
            "out of the way. Open the fold to read them, or to log " +
            "something anyway.",
        });
        if (this.folds.dead) out.push(...dead);
      }
      return out;
    },
    /** FT-1313: the top fold's own arithmetic — "2 sent · 1 skipped". */
    handledFoldLabel() {
      const { handled } = this.partition;
      const sent = handled.filter((r) => this.entryFor(r).done).length;
      const skipped = handled.length - sent;
      const word = this.isSendMode ? "sent" : "done";
      const bits = [];
      if (sent) bits.push(sent + " " + word);
      if (skipped) bits.push(skipped + " skipped");
      return bits.join(" · ");
    },
    /**
     * FT-1313: the header count, reworded — rows still OPEN, not a score to
     * finish. "all handled" the moment the working list empties.
     */
    progressWord() {
      const { handled, live } = this.partition;
      if (!live.length && handled.length) return "all handled";
      return live.length + " open";
    },
    /** FT-1313: ...and the rule, said out loud where the number is. */
    progressHint() {
      return (
        "Rows still open tonight. Sending every row is never required — " +
        "skip any you are not doing, or just end the night; open rows " +
        "simply stay unsent."
      );
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
     * Is this client the storyteller? Computed rather than assumed: this
     * component only ever mounts for one (App.vue's isSpectator check), so in
     * practice it is always true, and the places that read it say their own
     * condition rather than inheriting it.
     *
     * FT-1150: IT NO LONGER FEEDS THE SEAT PICKERS. `show-role` used to take
     * this value, which is what put a seat's true character on a control that
     * composes what a PLAYER is told — see that element's own note. The
     * remaining reader is `verdicts`, the truth oracle.
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
    /**
     * FT-1121: TONIGHT'S TRUTH, ROW BY ROW — keyed by the same render key the
     * rows carry. One pass over the roster rather than a call per template
     * binding (the mark, the chip and two tooltips all want the same verdict),
     * and it re-derives itself whenever the grimoire or the log moves: a seat
     * dying, the herring being dragged, a target being pointed at.
     *
     * NOT STORED, and that is the whole override story — see `lieOn` below.
     *
     * The `isStoryteller` guard is belt-and-braces, not the gate: this
     * component never mounts for a player and `roster` answers [] to one
     * anyway. It is here so that the one place in the fork that reads true
     * roles states its own condition rather than inheriting it.
     */
    verdicts() {
      const out = {};
      if (!this.isStoryteller) return out;
      const rows = this.roster;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // FT-1173: judged against the DRAFT VIEW, not the stored entry — the
        // mask has to light while the storyteller is composing the lie, not
        // only after they have sent it.
        out[row.key] = lieVerdictFor({
          players: this.players,
          row,
          entry: this.viewFor(row),
        });
      }
      return out;
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
        return (
          n +
          (n === 1 ? " row is" : " rows are") +
          " still open — send or skip each one (this town has Require checks on; Skip satisfies it)"
        );
      }
      // FT-1313 (user): THE WARN STATE STOPPED NAGGING. Its amber face stood
      // down (see warnUnchecked); what survives is one neutral sentence here
      // — a count and the rule, never a caution. Sending every row was never
      // required, and the button must not imply otherwise.
      if (
        this.isNight &&
        this.night.requireChecks === "warn" &&
        this.uncheckedRows.length
      ) {
        const n = this.uncheckedRows.length;
        return (
          "Wake the town — the log stays on Night " +
          this.night.day +
          ". " +
          n +
          (n === 1 ? " row is" : " rows are") +
          " still open; that is fine — open rows simply stay unsent."
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
     *  quiet to obvious (never blocking; a storyteller may move on early).
     *  FT-1313: "checked off" now means HANDLED — sent or skipped both count,
     *  because a skip is the storyteller's own deliberate answer to a row. */
    allChecked() {
      const { handled, live } = this.partition;
      return handled.length > 0 && live.length === 0;
    },
    /** FT-874: tonight's rows still unticked. Empty on a night nobody wakes
     *  for (roster.length === 0) — nothing to require in that case.
     *  FT-1313: "unticked" narrowed to OPEN — a skipped row was answered
     *  ("not this one") and a Dead-fold row was never owed, so neither
     *  blocks `required`, warns, nor flashes. The name stays: every caller
     *  (canFlip, flipHint, flashUnchecked) wants exactly this set. */
    uncheckedRows() {
      return this.partition.live;
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
     *
     * FT-1313 (user): STOOD DOWN TO A CONSTANT FALSE, not torn out. "End
     * night must not nag about unsent rows" — and the amber triangle + gold
     * plate this computed lit were the nag: a caution mark over a press that
     * was always legitimate. The computed keeps its name and its two
     * template callers (the icon's v-else-if, the .warn class), all inert;
     * the `warn` SETTING keeps a voice, but it is one neutral sentence on
     * the hover text now (see flipHint), a count and the rule, no alarm.
     * The original condition, for whoever stands this back up:
     *   isNight && requireChecks === "warn" && uncheckedRows.length > 0
     */
    warnUnchecked() {
      return false;
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
        //
        // FT-1121: THIS DEFAULT NEVER SURVIVED FIRST TOUCH, and finding that
        // out is part of this card. It lives only on the UNWRITTEN stand-in;
        // the moment the storyteller typed anything, night/write built a real
        // entry from makeEntry (isFalseInfo: false) and the lit mask went
        // dark. So the answer to "is the Drunk default overridable today" was
        // "it is not a default, it is a placeholder". It is a real one now:
        // `lieOn()` reads the derived verdict, whose floor IS row.isPerformance
        // (see nightTruth's lieVerdictFor), and that floor holds for the whole
        // life of the row. The line below is kept, unread, so the stand-in
        // still describes the same row the derived state draws.
        isFalseInfo: !!row.isPerformance,
        // FT-1121: nobody has taken the mask by hand — see lieOn/toggleLie.
        lieBy: "",
        done: false
      };
    },
    /**
     * FT-1173: THE ROW AS THE STORYTELLER SEES IT — the stored entry with
     * this component's own uncommitted draft laid over it. Every control on
     * a row reads this; only Send turns it into a store write.
     *
     * The layering rules mirror the send itself:
     *   · a drafted slot overrides the stored one AND drops its player mark
     *     ("" in targetsBy) — the storyteller's edit is the authority, and
     *     the gold seam must not claim a value they have retyped (the same
     *     rule setTarget has always applied at write time);
     *   · drafted told keys merge over the stored told;
     *   · a taken mask (draft.lie) overrides isFalseInfo/lieBy whole.
     * Everything untouched — a player's arriving pick, their own words —
     * reads straight from the store, so the row stays live under the
     * storyteller's hands.
     */
    viewFor(row) {
      const entry = this.entryFor(row);
      const d = this.drafts[row.key];
      if (!d) return entry;
      const view = {
        ...entry,
        told: { ...entry.told, ...(d.told || {}) },
      };
      if (d.targets && Object.keys(d.targets).length) {
        const targets = entry.targets.slice();
        const names = entry.targetNames.slice();
        const by = (entry.targetsBy || new Array(row.slots).fill("")).slice();
        while (by.length < row.slots) by.push("");
        Object.keys(d.targets).forEach((k) => {
          const i = parseInt(k, 10);
          targets[i] = d.targets[k].seat;
          names[i] = d.targets[k].name;
          by[i] = "";
        });
        view.targets = targets;
        view.targetNames = names;
        view.targetsBy = by;
      }
      if (d.lie) {
        view.isFalseInfo = d.lie.isFalseInfo;
        view.lieBy = d.lie.lieBy;
      }
      return view;
    },
    /** FT-1173: this row's draft, born on first touch. `$set` because Vue 2
     *  cannot see keys added later. */
    draftFor(row) {
      if (!this.drafts[row.key]) {
        this.$set(this.drafts, row.key, { targets: {}, told: {}, lie: null });
      }
      return this.drafts[row.key];
    },
    /** FT-1173: has this row got anything composed and unsent? */
    isDirty(row) {
      const d = this.drafts[row.key];
      if (!d) return false;
      return (
        Object.keys(d.targets || {}).length > 0 ||
        Object.keys(d.told || {}).length > 0 ||
        !!d.lie
      );
    },
    // ── FT-1313: SKIP — the storyteller's explicit "not this one" ─────────
    /** Is this row skipped? Storyteller-local view state, never the log. */
    isSkipped(row) {
      return !!this.skips[row.key];
    },
    /** Skip / un-skip one row. A draft in progress survives a skip — the
     *  fold stands the row down, it never costs a composed word. */
    toggleSkip(row) {
      if (this.skips[row.key]) this.$delete(this.skips, row.key);
      else this.$set(this.skips, row.key, true);
      this.persistSkips();
    },
    skipHint(row) {
      return this.isSkipped(row)
        ? "Skipped — click to bring this row back to the working list"
        : "Skip this one — no send, nothing logged. Skipping any row is " +
            "always yours to do; it folds away and stops counting.";
    },
    /** One of the two folds clicked open or shut. */
    toggleFold(id) {
      this.$set(this.folds, id, !this.folds[id]);
    },
    /** The per-town stash key. Skips are the storyteller's own view state,
     *  so localStorage (this browser) is exactly their scope — the same
     *  reasoning that keeps them off the wire entirely. */
    skipsStashKey() {
      return "golem_night_skips:" + (this.session.sessionId || "local");
    },
    /** Restore tonight's skip marks — a stash for another night (or none)
     *  answers a clean slate. Guarded: storage can be refused (private
     *  windows), and a skip mark is never worth an error. */
    loadSkips() {
      let map = {};
      try {
        const raw = JSON.parse(
          localStorage.getItem(this.skipsStashKey()) || "null"
        );
        if (raw && raw.day === this.night.day && Array.isArray(raw.keys)) {
          raw.keys.forEach((k) => {
            if (typeof k === "string") map[k] = true;
          });
        }
      } catch (e) {
        map = {};
      }
      this.skips = map;
    },
    persistSkips() {
      try {
        localStorage.setItem(
          this.skipsStashKey(),
          JSON.stringify({
            day: this.night.day,
            keys: Object.keys(this.skips),
          })
        );
      } catch (e) {
        // storage refused — the marks still hold for this tab's lifetime
      }
    },
    /**
     * FT-1272: THE FIELDS ON THIS ROW THAT ARE AN ANSWER SOMEBODY IS OWED.
     *
     * Not simply "the extra fields" — two of them are excluded, and both
     * exclusions are the point of the predicate rather than exceptions to it:
     *
     *   · an UNKNOWN row (`known: false` — a character golem/nightInfo has
     *     never heard of, which falls through to a bare free-text box). The
     *     schema cannot say what that row's answer is supposed to be, so it
     *     must not claim the row is unanswered. Silence, not a guess — the
     *     same fallback direction `fieldsFor` documents.
     *   · a GRIMOIRE row (the Spy, the Widow). Its answer is not a value the
     *     storyteller composes; it is a view they OPEN on that seat's client,
     *     and it is already live the moment they press Show. The free-text
     *     field those rows also carry is not rendered at all (FT-1028), so
     *     requiring it would demand something the row has no control for.
     */
    answerFields(row) {
      const { fields, known } = this.extraFieldsFor(row);
      if (!known || this.isGrimoireRow(row)) return [];
      // FT-1296: ...and a THIRD exclusion, of the same kind — a field the
      // PLAYER fills is not an answer the storyteller owes. On the shipped
      // schema this filter removes nothing (every non-seat field in the table
      // is `by:"storyteller"`; the four record-only rows have no non-seat
      // field at all, which is why FT-1272's carve-out worked), so nothing
      // changes today. It closes a hole a FORGED role can walk into: a
      // hand-authored entry may carry, say, a NUMBER the player supplies, and
      // that would have greyed the button out and asked the storyteller to
      // "choose what they learn" on a row where the answer is not theirs to
      // give. The predicate is "an owed answer", and only a storyteller field
      // can be one.
      return fields.filter((f) => f.by === FIELD_OWNERS.STORYTELLER);
    },
    /**
     * FT-1272 (user): IS THE TOLD-ANSWER FILLED IN?
     *
     * THE PREDICATE, stated once: a row is answered when EVERY answer control
     * it renders holds a value — the yes/no is Yes or No (never the "—" the
     * dropdown opens on), a count has actually been set (`told.number` starts
     * `null`; the scrub DISPLAYS its minimum, which is not the same as the
     * storyteller having chosen it), a character has been picked, and a free
     * note is not blank or whitespace.
     *
     * A row with NO answer control answers TRUE, and that is the carve-out
     * that matters: the Monk, the Poisoner, the Butler, the Imp are told
     * nothing back, so `answerFields` is empty, `every` is vacuously true, and
     * the row sends exactly as it always did. Pure-instruction rows were never
     * the target — an EMPTY answer being delivered to a player was.
     */
    isAnswered(row) {
      const told = this.viewFor(row).told;
      return this.answerFields(row).every((f) => {
        switch (this.kindOf(f)) {
          case "boolean":
            return told.ping === true || told.ping === false;
          case "number":
            return typeof told.number === "number";
          case "character":
            return !!(told.characterId || told.characterName);
          default:
            return String(told.text || "").trim() !== "";
        }
      });
    },
    /**
     * FT-1272: ...and so the Send button is disabled while an owed answer is
     * missing. A row already SENT is never disabled: on that row the button is
     * the reopen (FT-1173's own behaviour, and item 6's lock depends on it —
     * lock every control and disable the one control that unlocks them and the
     * row is bricked).
     */
    sendDisabled(row) {
      return !this.entryFor(row).done && !this.isAnswered(row);
    },
    /**
     * FT-1272 (user): A SENT ROW'S CONTROLS ARE LOCKED.
     *
     * The row's inputs compose something that HAS ALREADY BEEN DELIVERED to a
     * player. Leaving them live meant a stray scrub or a mis-click silently
     * rewriting an answer somebody was given — and worse, doing it invisibly,
     * because the write only travels on the next Send. Reopening (the same
     * button, its other job) unlocks them, which makes the edit a decision
     * rather than an accident.
     *
     * THE GRIMOIRE GRANT IS DELIBERATELY NOT LOCKED. It is not a composed
     * answer at all — it is a window standing open on a seat's client right
     * now, and a storyteller must be able to close or un-pin it after ticking
     * the row. Locking it would trap the reveal open.
     */
    isLocked(row) {
      return this.entryFor(row).done;
    },
    /**
     * FT-1173: THE SEND — the one place a row's composition becomes a store
     * write (and therefore the one moment anything about it can reach the
     * seat it names, through the delivery lane night/write has always had).
     *
     * A press with nothing staged is the old checkbox: mark done, or reopen
     * a done row. A press with a draft commits exactly the TOUCHED fields —
     * a slot the player filled and the storyteller left alone is not in the
     * patch, so the merge can never clobber what is theirs — and marks the
     * row done in the same write.
     */
    sendRow(row) {
      // FT-1272: the gate again, behind the disabled attribute. Belt and
      // braces on purpose — the button is `:disabled`, but this method is also
      // the row's only write path, and a future caller (a hotkey, a "send all"
      // sweep) must not be able to route round the predicate.
      if (this.sendDisabled(row)) return;
      const entry = this.entryFor(row);
      // FT-1313: a send outranks a skip — a row actually delivered stops
      // being "passed over", so the mark clears and the fold counts it under
      // sent, not twice.
      if (!entry.done && this.skips[row.key]) {
        this.$delete(this.skips, row.key);
        this.persistSkips();
      }
      if (!this.isDirty(row)) {
        this.write(row, { done: !entry.done });
        return;
      }
      const d = this.drafts[row.key];
      const patch = { done: true };
      if (d.targets && Object.keys(d.targets).length) {
        const targets = entry.targets.slice();
        const names = entry.targetNames.slice();
        const by = (entry.targetsBy || new Array(row.slots).fill("")).slice();
        while (by.length < row.slots) by.push("");
        Object.keys(d.targets).forEach((k) => {
          const i = parseInt(k, 10);
          targets[i] = d.targets[k].seat;
          names[i] = d.targets[k].name;
          by[i] = "";
        });
        patch.targets = targets;
        patch.targetNames = names;
        patch.targetsBy = by;
      }
      if (d.told && Object.keys(d.told).length) {
        patch.told = { ...entry.told, ...d.told };
      }
      if (d.lie) {
        patch.isFalseInfo = d.lie.isFalseInfo;
        patch.lieBy = d.lie.lieBy;
      }
      this.write(row, patch);
      this.$delete(this.drafts, row.key);
    },
    /**
     * FT-1296: WHAT THIS ROW EXCHANGES — the schema's own answer (see
     * golem/nightInfo's `nightExchange`), asked of the role the row SHOWS.
     * On a believing seat's performance row that is the character the player
     * thinks they have, which is right for exactly the reason the roster
     * getter gives: the storyteller is playing out that character's wake, so
     * it is that character's exchange that is happening.
     */
    exchangeFor(row) {
      return nightExchange(row.role.id);
    },
    /**
     * FT-1296: does pressing this row's button actually deliver something to
     * the player? Both halves matter and both are already facts the component
     * holds — the TOWN must be asking its players at all (`isSendMode`), and
     * the ROW must have something the storyteller fills. Every send-word,
     * glyph and tooltip below branches on this one predicate.
     */
    rowTells(row) {
      return this.isSendMode && this.exchangeFor(row) === NIGHT_EXCHANGE.TELLS;
    },
    /** FT-1296: ...and is it the other kind — the storyteller writing down a
     *  choice the player made, with nothing going back? (The Monk, the
     *  Butler, the Poisoner, the Imp.) */
    rowRecords(row) {
      return (
        this.isSendMode && this.exchangeFor(row) === NIGHT_EXCHANGE.RECORDS
      );
    },
    /** FT-1173: the button's glyph — a paper plane while there is an ask to
     *  deliver, the checkbox pair where it is only a tick.
     *  FT-1296: ...and "an ask to deliver" is now the ROW's question, not the
     *  town's alone — a Poisoner row in send mode delivers nothing, so it
     *  takes the checkbox pair with every other tick. The plane never appears
     *  where nothing flies (FT-1211). */
    sendIcon(row) {
      if (!this.rowTells(row)) {
        return this.entryFor(row).done && !this.isDirty(row)
          ? "check-square"
          : "square";
      }
      if (this.isDirty(row)) return "paper-plane";
      return this.entryFor(row).done ? "check" : "paper-plane";
    },
    /** FT-1173: ...and its word, so the column explains itself at a glance.
     *  FT-1296: three words now, one per kind of row. "Received" does not
     *  change on the press — the checkbox's own idiom is a fixed label beside
     *  a box that fills, and the state is already carried by the glyph, the
     *  row's done fade and the tooltip. A verb that changed tense would also
     *  have to be the storyteller's ("Receive"), which is not an instruction
     *  anyone acts on: what they are doing is acknowledging. */
    sendWord(row) {
      if (!this.isSendMode) return "Done";
      if (this.rowRecords(row)) return "Received";
      if (!this.rowTells(row)) return "Done";
      if (this.isDirty(row)) return "Send";
      return this.entryFor(row).done ? "Sent" : "Send";
    },
    sendHint(row) {
      const done = this.entryFor(row).done;
      const dirty = this.isDirty(row);
      // FT-1272: an HONEST title on a disabled button — the one thing a
      // greyed-out control must never do is leave you guessing why. It names
      // the missing half rather than saying "fill in the row": the row has
      // several controls and only one of them is the answer.
      if (this.sendDisabled(row)) {
        return (
          "Nothing to tell them yet — choose what " +
          (row.player.name || "this seat") +
          " learns before you send"
        );
      }
      // FT-1296: A ROW THAT DELIVERS NOTHING SAYS SO, in the tooltip as well
      // as in the word. The old text on these rows read "Send this to the
      // player — nothing has reached them yet", which promised a delivery
      // that never comes; and its done face read "Sent", of a thing never
      // sent. Both are replaced with what the press actually is: the
      // storyteller taking down a choice that was made at the table.
      if (this.rowRecords(row)) {
        const who = row.player.name || "this seat";
        if (done && !dirty) return "Received — click to reopen the row";
        return "Take down what " + who + " chose — nothing goes back to them";
      }
      // FT-1296: one condition where there were two. `rowTells` is false in
      // storyteller-only mode (nobody is being asked) AND on a send-mode row
      // that exchanges nothing at all — and the plain-tick wording is the
      // honest one for both, so they share the branch rather than the second
      // case falling through to a promise of delivery.
      if (!this.rowTells(row)) {
        if (dirty) return "Log what you composed and mark this row done";
        return done ? "Done — click to reopen" : "Mark this one done";
      }
      if (dirty) {
        return done
          ? "Send the changes to this player and keep the row done"
          : "Send this to the player — nothing has reached them yet";
      }
      return done
        ? "Sent — click to reopen the row"
        : "Mark this row done — nothing was composed, so nothing new is delivered";
    },
    /**
     * FT-1121: writes now also KEEP THE STORED MARK HONEST.
     *
     * The lie mark is DERIVED for display (lieOn), but it is also a stored
     * field two other surfaces read — golem/chronicle copies it onto a night
     * event and ChronicleDrawer renders it as the word "false" — and
     * golem/nightLog's entry shape depends on it ("`told` is the delivered
     * information and `isFalseInfo` marks it as a lie; the truth is
     * recoverable from the pair"). A derived-only mark would leave that stored
     * pair unrecoverable.
     *
     * So every write that is not itself about the mark stamps the verdict as
     * of the post-patch row. That lands on exactly the write that matters —
     * the storyteller setting what they told — and it never happens on a row
     * the storyteller has taken by hand (`lieBy`), which is what makes the
     * override stick through later edits.
     *
     * A grimoire change AFTER the last write (a seat dying, the herring
     * dragged elsewhere) leaves the stored value one beat behind while the
     * LIVE mask stays right, because the mask re-derives and the record does
     * not. That is the correct direction for a record of what a storyteller
     * did at the time, and the next touch of the row restamps it.
     */
    write(row, patch) {
      const next = { ...patch };
      const entry = this.entryFor(row);
      const byHand = entry.lieBy === "storyteller";
      if (!byHand && !("isFalseInfo" in next) && !("lieBy" in next)) {
        const merged = {
          ...entry,
          ...next,
          told: { ...entry.told, ...(next.told || {}) },
        };
        next.isFalseInfo = lieVerdictFor({
          players: this.players,
          row,
          entry: merged,
        }).auto;
      }
      this.$store.dispatch("night/write", { row, patch: next });
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
     *  note). Every told-writing method used to go through this; since
     *  FT-1173 the row's controls STAGE instead (stageTold below) and this
     *  is the commit path Send's write() takes via the merged patch. Kept
     *  for the stood-down cyclePing and any future immediate write. */
    writeTold(row, patch) {
      const told = this.entryFor(row).told;
      this.write(row, { told: { ...told, ...patch } });
    },
    /** FT-1173: stage one or more told fields on the row's local draft —
     *  nothing reaches the store (or the wire) until Send. */
    stageTold(row, patch) {
      const d = this.draftFor(row);
      this.$set(d, "told", { ...d.told, ...patch });
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
    /**
     * FT-1121: this row's verdict — the true answer, whether what was told
     * differs from it, and the mark's derived state. Never null: an
     * uncomputable row answers `known: false` and everything below reads that
     * as "say nothing".
     */
    verdictFor(row) {
      return (
        this.verdicts[row.key] || {
          truth: { known: false, display: "", why: "" },
          differs: null,
          auto: false,
        }
      );
    },
    /** FT-1121: the true answer for this row, or an unknown. */
    truthOf(row) {
      return this.verdictFor(row).truth;
    },
    /**
     * FT-1121: IS THE MASK LIT?
     *
     * A hand on the mask wins, always and for good — that is the whole of
     * `lieBy`. With no hand on it the mark follows the oracle: lit when what
     * was told differs from the grimoire's own answer, and lit on a
     * performance row whatever the value (see nightTruth's lieVerdictFor for
     * why those are two different claims). A row the oracle cannot compute
     * and that nobody has touched is never lit.
     */
    lieOn(row) {
      // FT-1173: the DRAFT VIEW answers — a mask taken while composing shows
      // taken, before and after Send alike.
      const entry = this.viewFor(row);
      if (entry.lieBy === "storyteller") return !!entry.isFalseInfo;
      return this.verdictFor(row).auto;
    },
    /**
     * FT-1121: clicking the mask sets it BY HAND, and a hand-set mask stops
     * following the oracle — auto-lighting must never fight a storyteller who
     * has already answered the question.
     *
     * Clicking it back to whatever the oracle says releases it to auto again
     * (`lieBy` clears), so there is a way home from an override without a
     * third control on a row that has no room for one.
     */
    toggleLie(row) {
      // FT-1272: the mask is a `<span role="checkbox">`, not a button, so
      // there is no native `disabled` to carry the sent-row lock — the guard
      // is here, and the template drops its tabindex and dims it to match.
      if (this.isLocked(row)) return;
      // FT-1173: staged, not written. The release-to-auto rule is unchanged
      // (a hand that lands where the oracle already is clears `lieBy`); it
      // just waits with everything else for Send. The mark is storyteller-
      // only data, so nothing about this ever reached a player anyway — it
      // drafts with the rest so the row commits as ONE thing.
      const next = !this.lieOn(row);
      const auto = this.verdictFor(row).auto;
      const d = this.draftFor(row);
      this.$set(d, "lie", {
        isFalseInfo: next,
        lieBy: next === auto ? "" : "storyteller",
      });
    },
    /** FT-874 (2026-08-19): the liar mark says which of its two states it is
     *  in, in words. The glyph is identical in both — brightness is the only
     *  visual difference — so the hover text carries the state as well as the
     *  action, the way every other two-state control on this row does.
     *
     *  FT-1121: ...and now says WHY it is in that state — set by hand, lit
     *  because the row is a performance, or lit because what was told differs
     *  from the grimoire. A mark that sets itself has to be able to say so. */
    lieHint(row) {
      const entry = this.viewFor(row);
      const on = this.lieOn(row);
      if (entry.lieBy === "storyteller") {
        return on
          ? "Marked FALSE by you — this stays marked whatever the grimoire says. Click to unmark."
          : "Unmarked by you — this stays unmarked whatever the grimoire says. Click to mark.";
      }
      if (!on) {
        const truth = this.truthOf(row);
        return truth.known
          ? "What you told them matches the grimoire. Click to mark it FALSE anyway."
          : "Mark what you told them FALSE (drunk, poisoned, a misread)";
      }
      const reason = row.isPerformance
        ? "they are not really the " + row.role.name
        : "it differs from the grimoire (" + this.truthOf(row).display + ")";
      return "FALSE — set on its own because " + reason + ". Click to unmark.";
    },
    /**
     * FT-1121: the word for how this seat is impaired — "poisoned", "drunk",
     * or "". It rides the true answer as a quiet note, never the mark: it is
     * the context that makes a lit mask read as "yes, correctly lying" rather
     * than as an accusation. Read off the seat's own reminder tokens, which
     * are the only place this app records the state at all.
     */
    impairedOf(row) {
      return impairmentOf(this.players[row.seat]);
    },
    /** FT-1121: what the true-answer chip explains about itself on hover —
     *  the rule that produced it, and the impairment when there is one. */
    truthHint(row) {
      const truth = this.truthOf(row);
      if (!truth.known) return "";
      const impaired = this.impairedOf(row);
      return (
        "The grimoire's own answer: " +
        truth.display +
        ". " +
        truth.why +
        (impaired
          ? " This seat is " +
            impaired +
            " — false information here is you playing correctly."
          : "")
      );
    },
    setNote(row, text) {
      // FT-1173: staged, not written — see the drafts note in data().
      this.stageTold(row, { text });
    },
    setTarget(row, slot, seat) {
      // FT-1173: staged, not written. The name is stamped ALONGSIDE the seat
      // at stage time, exactly as the write used to (seats move; a replay
      // needs the person the storyteller was pointing at tonight), and the
      // slot's player mark clears in the VIEW (viewFor) and in the eventual
      // patch (sendRow) — FT-1005's authority rule, moved to the new commit
      // point rather than dropped.
      const s = Number.isInteger(seat) ? seat : -1;
      const player = this.players[s];
      const d = this.draftFor(row);
      this.$set(d.targets, String(slot), {
        seat: s,
        name: player ? player.name : "",
      });
    },
    /** FT-1005: who filled a slot — "" (storyteller/nothing) or "player".
     *  FT-1173: read off the draft view, so the storyteller's own staging
     *  clears the gold seam the moment they retake a slot. */
    targetBy(row, i) {
      const by = this.viewFor(row).targetsBy || [];
      return by[i] || "";
    },
    /** FT-1005: the slot's hover text says whose pick it holds. */
    targetHint(row, slot) {
      const base = "Who they chose (" + slot + " of " + row.slots + ")";
      return this.targetBy(row, slot - 1) === "player"
        ? base + " — their own pick, entered by the player"
        : base;
    },
    /**
     * FT-1114: the three positions, as a list rather than a cycle. `null` is
     * carried as "" because OptionSelect's value is a string/number/boolean —
     * `pingValue` and `setPing` are the only two places that know it.
     */
    pingValue(row) {
      const p = this.viewFor(row).told.ping;
      return p === null ? "" : p ? "yes" : "no";
    },
    setPing(row, v) {
      // FT-1173: staged, not written — the dropdown already could not leak a
      // cycled value (FT-1114); now even the chosen one waits for Send.
      this.stageTold(row, { ping: v === "" ? null : v === "yes" });
    },
    /**
     * FT-1114: STOOD DOWN, not deleted (house rule). The cycle is what leaked
     * intermediate values to the seat being asked; nothing renders this now.
     * null → yes → no → null.
     */
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
      const p = this.viewFor(row).told.ping;
      return { yes: p === true, no: p === false, none: p === null };
    },
    pingHint(row) {
      const p = this.viewFor(row).told.ping;
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
      // FT-1173: staged, not written.
      this.stageTold(row, { number: n });
    },
    /** NumberScrub's `value` prop is required and must be a concrete number
     *  — never null. Before the storyteller has touched this row nothing is
     *  stored yet (`told.number` is null, the blank stand-in from
     *  entryFor()), so the scrub starts at the field's own minimum rather
     *  than showing nothing; no store write happens until it's interacted
     *  with either way. */
    numberValue(row, field) {
      const n = this.viewFor(row).told.number;
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
    /** FT-1229: does this row speak BOTH halves of the grammar — the
     *  player's seat picks AND a told-back answer? Splits the one label
     *  into Selects:/Learns: (see the template's own note). */
    splitLabels(row) {
      return row.slots > 0 && this.extraFieldsFor(row).fields.length > 0;
    },
    /**
     * FT-1272 (user, and this is a REAL BUG being fixed): WHOSE ACT ARE THE
     * SEAT SLOTS ON THIS ROW?
     *
     * FT-1229 split the row's grammar on the PRESENCE of seat slots, and read
     * every slot as a player's choice. But the checklist renders one picker
     * per pointing whoever does the pointing (nightInfo's `extraFields` note),
     * so a Librarian row read "Selects: [seat] [seat]" — and a Librarian
     * selects nothing at all. The storyteller decides which two players to
     * point at and which character to name; the player sits with their eyes
     * shut. Same for the Washerwoman and the Investigator.
     *
     * The fix reads the ROLE'S OWN NATURE out of golem/nightInfo — every
     * PLAYER field has always carried `by`, and `seatPickOwner()` is the row-
     * level question put to it — rather than testing role names here. A
     * character the schema has never heard of answers "", and keeps the
     * shipped word: nightLog derives those slots from "points to N players"
     * phrasing, which is a PLAYER pointing, so "Selects:" is the right guess
     * where there is nothing better than a guess.
     *
     * "POINTS AT:" RATHER THAN "SHOWS:". Both name the storyteller's act;
     * "Shows:" collides with what the row's OTHER half already says (the
     * Librarian is shown a character — "Learns:"), so it would put the same
     * verb on both sides of one row from two different subjects. "Points at:"
     * is also literally the instruction at a real table, and it is the very
     * phrase nightLog reads the slot count out of.
     */
    seatsAreStorytellers(row) {
      return seatPickOwner(row.role.id) === FIELD_OWNERS.STORYTELLER;
    },
    /** FT-1272: ...and the word itself. */
    seatVerb(row) {
      return this.seatsAreStorytellers(row) ? "Points at:" : "Selects:";
    },
    /** FT-1229: the Selects label teaches the provenance mark on hover.
     *  FT-1272: ...and on a storyteller-pointed row it teaches the opposite —
     *  that nobody is waiting on the player for this. */
    selectsHint(row) {
      if (this.seatsAreStorytellers(row)) {
        return (
          "Your own pointing — the players you show " +
          (row.player.name || "this seat") +
          ". They choose nothing here."
        );
      }
      const base =
        "The player's own choice — who " +
        (row.player.name || "this seat") +
        " points at.";
      return this.isSendMode
        ? base +
            " A slot with the gold seam arrived from the player's own hand;" +
            " a plain one is your entry."
        : base;
    },
    /** FT-1229: ...and the Learns label says whose voice the answer is. */
    learnsHint() {
      return (
        "What the character is told back — you compose it here" +
        (this.isSendMode ? "; nothing reaches them until Send." : ".")
      );
    },
    setCharacter(row, id, name) {
      // FT-1173: staged, not written.
      this.stageTold(row, { characterId: id, characterName: name });
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
      // FT-1173: END NIGHT IS THE COMMIT for the staged deaths — the one
      // moment intentions become shrouds. Only this path applies them; every
      // other way off the sheet leaves the queue standing (see the staged
      // note in night.js).
      if (this.isNight) this.applyStagedDeaths();
      this.$store.commit("toggleNight");
      if (this.grimoire.isNight) {
        this.$store.commit("session/setMarkedPlayer", -1);
      }
    },
    /**
     * FT-1173: a seat picked into the staged-deaths list. The DIRECTION is
     * read off the chair at this moment — living stages a death, dead stages
     * a revive — and stamped on the entry, so the chip says what will happen
     * rather than making the reader derive it at commit time.
     */
    stageSeat(seat) {
      if (!Number.isInteger(seat) || seat < 0) return;
      const player = this.players[seat];
      if (!player) return;
      this.$store.commit("night/stageDeath", {
        seat,
        playerId: player.id || "",
        name: player.name || "",
        roleName: (player.role && player.role.name) || "",
        dir: player.isDead ? "revive" : "death",
      });
    },
    /** FT-1173: remove one staged entry — it simply never happens. */
    unstage(index) {
      this.$store.commit("night/unstageDeath", index);
    },
    stagedHint(s) {
      return s.dir === "revive"
        ? s.name + " rises when the night ends — staged, nothing applied yet"
        : s.name + " dies when the night ends — staged, no shroud yet";
    },
    /**
     * FT-1173: THE COMMIT. Each staged entry goes through the exact
     * players/update path the direct shroud click takes today (Player.vue's
     * toggleStatus) — the same commits, the same wire sync, the same one-
     * click reversibility on the seat itself, which is the whole of the undo
     * the direct shroud has ever had. The seat is resolved by its durable
     * playerId first (chairs move during a night), the staged index second.
     * An entry whose seat already matches its direction (the storyteller
     * shrouded it by hand mid-night) applies as a no-op rather than a
     * double-toggle.
     */
    applyStagedDeaths() {
      const staged = this.staged;
      if (!staged.length) return;
      staged.forEach((s) => {
        let seat = -1;
        if (s.playerId) {
          seat = this.players.findIndex((p) => p.id && p.id === s.playerId);
        }
        if (seat < 0) seat = s.seat;
        const player = this.players[seat];
        if (!player) return;
        const dead = s.dir !== "revive";
        if (!!player.isDead !== dead) {
          this.$store.commit("players/update", {
            player,
            property: "isDead",
            value: dead,
          });
        }
        // toggleStatus's own two riders, mirrored: a state change clears the
        // execution mark, and a revive hands the ghost vote back.
        if (player.isMarked) {
          this.$store.commit("players/update", {
            player,
            property: "isMarked",
            value: false,
          });
        }
        if (!dead && player.isVoteless) {
          this.$store.commit("players/update", {
            player,
            property: "isVoteless",
            value: false,
          });
        }
      });
      this.$store.commit("night/clearStaged");
    },
    /**
     * FT-1229: does the checklist overflow its band? scrollHeight against
     * clientHeight on the one scroll container, +1 for the sub-pixel
     * rounding browsers report on scaled boxes. Guarded write so the
     * updated() hook that calls this cannot loop.
     */
    measureRowsOverflow() {
      const el = this.$refs.rows;
      const over = !!el && el.scrollHeight > el.clientHeight + 1;
      if (over !== this.rowsOverflow) this.rowsOverflow = over;
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
      // FT-1173: THE BAND PAYS FOR THE STAGED ROW. The staged-deaths line is
      // a standing fixture of every night now (it renders whenever the night
      // has rows), and it stands between the band and the foot button — so
      // its 30px comes out of the band's own slice, not out of the bottom
      // cap, or the End-night button would sit 30px lower than the position
      // FT-1108 solved against the arc and its corners would shear. The rows
      // scroll; the button must clear the rim; the band is the one child
      // that can pay. (30px = the line's 24px height + its 6px margin,
      // pinned below so the sum cannot drift.)
      //
      // FT-1220: + 44px MORE for the bell — the summons bell joined the
      // foot stack above the staged line (its 36px box + its 8px top gap,
      // pinned below), and the band pays for it exactly as it pays for the
      // line, for the same reason: End night must stay on the arc-cleared
      // mark.
      // FT-1229: the 44px HANDED BACK — the night bell stood down (see the
      // template; the bell is a day fixture now), so the band keeps the
      // height it was paying for it.
      > .ns-rows {
        @include face-disc-band;
        flex-basis: calc(var(--fd-d) - 2 * var(--fd-caph) - 30px);
        flex-shrink: 1;
        min-height: 0;
      }

      // FT-1220: the bell at night — the top of the FOOT STACK (bell /
      // staged Deaths line / End night, one centred column; "right above
      // the end day button" during the day, and at night the same spot
      // with the staged line keeping its own place directly above the
      // button). A pinned flex child like the staged line; the band above
      // pays its height. Skin is App.vue's unscoped `.post-bell`.
      // FT-1229: rule kept for the stood-down template copy — inert while
      // nothing renders it.
      > .post-bell.foot-bell {
        display: inline-flex;
        flex: 0 0 auto;
        margin-top: 8px;
      }

      // FT-1173: the staged row, ONE line on the disc — its height is the
      // number the band's carve-out above depends on, so it is pinned: no
      // wrap, overflowing chips scroll sideways inside the line.
      > .ns-staged {
        // the line stands in the bottom CAP, below the band's own vertical
        // range — the chord there is narrower than --fd-band (measured: the
        // second chip ran through the rim at 1280x800). 1.4rx is the chord
        // at this line's own height with margin to spare, scaling with the
        // disc the way every other chord expression in faceDisc.scss does.
        max-width: calc(1.4 * var(--fd-rx));
        flex: 0 0 24px;
        height: 24px;
        margin-top: 6px;
        flex-wrap: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
        justify-content: flex-start;
        // a native scrollbar under a 24px strip would cost the line its own
        // height — overflow stays reachable (wheel/drag), just not furnished
        scrollbar-width: none;
        &::-webkit-scrollbar {
          display: none;
        }
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
      // (FT-1214: the bare `face-disc-foot` include that stood first here is
      // carried inside `face-disc-foot-button` now, included at the bottom
      // of this block.)
      > .phase-flip.bottom {
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
        // FT-1143 (user): "that shouldn't wrap expand it to fit the text."
        // FT-1111 matched Start game's box exactly, which is right for "End
        // night 3" and one word too tight for "Finish night checks" — the
        // blocked state's own label, which is the one a storyteller reads
        // while they are stuck. So the matched width becomes a FLOOR rather
        // than the width: the two buttons still agree at their common size,
        // and the longer label takes the room it needs instead of breaking
        // across two lines inside a disc.
        //
        // FT-1214: THE THIRD FOOT BUTTON APPEARED (End day joined the foot),
        // so the copied block above did what its own comment promised and
        // moved into faceDisc.scss as `face-disc-foot-button` — the foot
        // translate, the width expression and the box/type metrics, one
        // definition for all three primary buttons. The values are byte-
        // identical to the lines that stood here; the comments above remain
        // the record of how they were solved. Colour is still NOT shared:
        // geometry travels, skin stays per-button.
        @include face-disc-foot-button;
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
      // LINE TWO NEGOTIATED, and FT-882 recorded two arrangements that failed
      // on the same 275px of line before it settled on a wrap — grid tracks
      // (`1fr auto`) rendered the sentence at zero width, and a floor under
      // the sentence (`minmax(33%, 1fr)`) squeezed a seat picker to 33px and
      // drew the pickers on top of one another.
      //
      // ── FT-1150: THE NEGOTIATION IS OVER, and this is the user's own
      // proposal, built. "maybe we put the short ability description in line,
      // with the role name and player name. then uses the whole next row for
      // the info?"
      //
      // The sentence goes UP onto the identity line and the controls take the
      // whole of line two. That is the right way round for the same reason
      // FT-882 gave for truncating the sentence at all: it is REFERENCE, read
      // once and then known, so it can be the thing that shrinks — where a
      // control that shrinks is a control you cannot use. Every wrap rule the
      // wrapper carried goes with the negotiation it was arranging.
      //
      // MEASURED, 1280x800, before -> after (the proof rig prints this table):
      //   answer zone width   188.8px -> the band, ~356px
      //   control type        12.5px  -> 15px
      //   information row     98.8px tall (three lines) -> two lines
      .ns-row {
        // FT-1173: the state column crossed to the right with the send
        // button (see the base grid's own note); on the band it runs a
        // little narrower — every wasted pixel here is band the controls
        // fought FT-1150 to win.
        grid-template-columns: 1fr 46px;
        grid-template-areas:
          "identity state"
          "work state";
        column-gap: 8px;
        padding: 6px 2px 7px;

        .ns-send {
          font-size: 13px;
          .ns-send-word {
            font-size: 9.5px;
          }
        }

        // the controls' line. `min-width: 0` is still load-bearing and it was
        // measured (2026-08-19-night-disc-overlap.mjs): without it this zone's
        // AUTOMATIC minimum is its own max-content, so a four-control row sits
        // at its full width inside a narrower band and hangs out over the rim
        // — flex-shrink never gets to run.
        .ns-work {
          min-width: 0;
        }
        // the answer WRAPS here rather than shrinking. It has a whole line
        // now, so the crowded rows (a Washerwoman's two seats, a character and
        // a mask) take a second line of their own on the narrow band instead
        // of squeezing four controls into one — which is the trade this pass
        // exists to make: the controls keep their size, and only the row that
        // needs the extra line pays for it.
        .ns-answer {
          flex-wrap: wrap;
          min-width: 0;
          gap: 4px 6px;
        }
        // a hair under the base 14px — the band is narrower, and the label is
        // the one piece of the answer line that is not itself a control
        .ns-label {
          font-size: 13.5px;
        }
        // the character icon drops 40 → 30px: it is the row's height driver
        // on line one, and the band is short enough that ten wasted pixels
        // a row costs a whole visible row. The role name comes down with it
        // (17 → 15.5px) so it still sits ABOVE the reminder rather than
        // towering over the line it shares.
        .ns-icon {
          width: 30px;
          height: 30px;
        }
        // FT-1150: the identity line is shared again — with the ability
        // sentence this time — so the name gives back the width FT-882 handed
        // it when it had the line to itself. 62% of the band still leaves
        // "Fortune Teller · Fen" whole at both proof viewports.
        .ns-identity > .ns-who {
          max-width: 62%;
        }
        .ns-who b {
          font-size: 15.5px;
        }
      }
    }

    // ── FT-1214: THE DAY (AND THE SHEET-OFF NIGHT) ON THE DISC ────────────
    // The phase button moves to the disc's foot, where Start game and End
    // night already stand — so the foot always holds THE primary button,
    // whichever word it currently wears. The sheet's day box becomes the
    // disc's own GEOMETRY with NO PLATE ($plate: false — no glass, no edge,
    // nothing painted): an invisible flex column whose ::before stands in
    // for the head and the band, so the one real child lands exactly where
    // the other two buttons land. pointer-events stays off the box (it
    // covers the whole face and must not eat the town's clicks — FT-975's
    // own lesson); only the button takes the pointer back.
    &:not(.has-list) {
      @include face-disc-frame($plate: false);
      pointer-events: none;

      // "move the end day button to where the end night button is" — the
      // user's words, taken literally: the night column reaches the flip
      // button after its band and the 34px day-length line (FT-1067's
      // standing fixture), so the day's stand-in reserves the same 34px and
      // the phase button holds ONE height across the flip (measured equal
      // in the rig; Start game stands 8px off both, a pre-existing FT-1111
      // residual this pass reports rather than moves).
      &::before {
        content: "";
        // FT-1220: minus the bell's 44px (its 36px box + the 8px gap below
        // it) — the summons bell joined this column ABOVE the button, and
        // the filler pays for it, so the phase button itself never leaves
        // the mark the measurement above was taken on.
        flex: 0 0 calc(var(--fd-d) - var(--fd-caph) + 34px - 44px);
      }

      // the retired FT-975 pill steps out of the flex flow — its box-keeping
      // job belonged to the old translateY(105px) rectangle state, and in
      // this column it would push the foot button off its mark.
      .phase.pill.retired {
        position: absolute;
      }

      // FT-1220: THE BELL, RIGHT ABOVE THE PHASE BUTTON. A plain flex child
      // of the same centred column, wearing the button's own foot translate
      // (the same --fd-foot-dy / --fd-foot-adj expression face-disc-foot
      // resolves), so the pair moves as ONE object and the 8px below the
      // bell stays 8px at every disc size and window — no absolute
      // positioning, no hand-tuned offsets. Its box height is paid by the
      // ::before filler above. The skin is App.vue's own unscoped
      // `.post-bell` dress; only placement lives here.
      > .post-bell.foot-bell {
        display: inline-flex;
        pointer-events: auto;
        flex: 0 0 auto;
        margin-bottom: 8px;
        transform: translateY(
          calc(var(--fd-foot-dy, 14px) + var(--fd-foot-adj, 0px))
        );
      }

      > .phase-flip.foot-day {
        @include face-disc-foot-button;
        display: inline-flex;
        pointer-events: auto;
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

// FT-1220: the foot-stack bell exists ONLY where the disc does — same rule,
// same reason as `.phase-flip.foot-day` below (below the face-disc gate the
// left column keeps the bell; see App.vue's `.post-bell` and its gated
// stand-down). The gated rules that turn this on live with the disc
// geometry above, one per column state. This scoped rule outweighs the
// unscoped `.post-bell` skin's display, which is the point.
.foot-bell {
  display: none;
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

  // FT-1214: the disc-foot phase button exists ONLY where the disc does —
  // below the face-disc gate it is display:none and App.vue's storyteller-
  // post column keeps the End day job it has had since FT-1063. The gated
  // rule that turns it on lives with the rest of the disc geometry above.
  &.foot-day {
    display: none;
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

// FT-1150 (user): "All storyteller controls should be purple like the player
// selector one." This segment was the last blood-red control on the sheet and
// it was red in THREE places at once — a red hover ink, `control-lit`'s blood
// ground on the chosen cell, and `control-focus-ring`'s #a01414 outline from
// the shared `control-cell` mixin.
//
// All three take FT-1108's answer, values and reasoning both: the shared
// mixins are NOT repainted (every other plated control in the app wears them
// correctly), the three values are restated locally in the settings
// dropdown's own plum, and the focus ring is overridden here because the
// shared one is the app's blood red. Same recipe as `OptionSelect`'s
// `.gsel-opt.on` and its `outline-color`, not a third one invented for this.
.ns-daylen-opt {
  @include control-cell;
  font-size: 90%;
  padding: 2px 6px;
  &:hover {
    color: $control-edge-hover;
  }
  &:focus-visible {
    outline-color: rgba(150, 130, 175, 0.9);
  }
  &.on {
    background: rgba(96, 74, 128, 0.42);
    color: #ece4f8;
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

// ── FT-1173: STAGED DEATHS — one quiet line above the button that commits
// it. Same furniture idiom as the day-length row it stands beside: dimmed at
// rest, full ink under a pointer, everything on one wrapping line so the
// disc's bottom cap pays as little as possible. The chips carry the DATA
// colours the sheet already speaks — blood for a death, sage (the truth
// chip's own green family) for a revive — while the boxes stay chrome.
.ns-staged {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px 6px;
  margin-top: 6px;
  flex-shrink: 0;
  font-size: 80%;
  opacity: 0.75;
  transition: opacity 150ms;
  &:hover,
  &:focus-within {
    opacity: 1;
  }

  // FT-1229: WITH NOTHING STAGED the strip is a whisper — a dim label and a
  // quiet dashed adder, not an empty control demanding a reading. Chips
  // arriving bring it up to the standing 0.75; the pointer still brings
  // either state to full ink.
  &.empty {
    opacity: 0.45;
  }
}

.ns-staged-label {
  font-family: PiratesBay, sans-serif;
  letter-spacing: 0.5px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.ns-staged-mark {
  width: 12px;
  height: 12px;
  color: rgb(154, 146, 133);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
}

// the adder is a SeatPicker in miniature — its trigger squeezes to the
// line's height so the row never towers over the finish button below it
// FT-1229: ...and it DRESSES as an adder now — dashed edge, no filled
// ground, the "+ Add" placeholder word (see the template) — so it reads as
// "put another chip here" instead of as a chip whose value is missing. The
// caret stays: it is still a picker once pressed.
.ns-staged-add ::v-deep .sp-trigger {
  height: 24px;
  font-size: 12px;
  padding: 0 6px;
  background: transparent;
  border-style: dashed;
  border-color: rgba(150, 130, 175, 0.45);
  .sp-name {
    opacity: 0.8;
  }
  &:hover,
  &.open {
    border-color: $control-edge-hover;
    .sp-name {
      opacity: 1;
    }
  }
  @media (pointer: coarse) {
    height: 38px;
    font-size: 14px;
  }
}

.ns-staged-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 4px 0 7px;
  border: 1px solid rgba(120, 105, 135, 0.3);
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.55);
  white-space: nowrap;
  svg {
    width: 11px;
    height: 11px;
  }
  // a staged DEATH wears the blood — it is a statement about the town, not
  // chrome, and red is what death already means on this dial
  // FT-1229: the chip's EDGE takes a wash of the same colour — at chip size
  // the 11px glyph alone was carrying the whole direction, and the edge is
  // what makes two adjacent chips read as two statements at a glance.
  &.death {
    border-color: rgba(199, 56, 56, 0.4);
  }
  &.death svg {
    color: #c73838;
  }
  // a staged REVIVE wears the truth chip's sage — the seat comes back
  &.revive {
    border-color: rgba(143, 191, 168, 0.4);
  }
  &.revive svg {
    color: #8fbfa8;
  }
  .ns-staged-name {
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: bold;
  }
  .ns-staged-role {
    opacity: 0.6;
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ns-staged-x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    font-size: 13px;
    line-height: 1;
    color: #d8cdb4;
    background: none;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    opacity: 0.55;
    &:hover,
    &:focus-visible {
      opacity: 1;
      color: $control-edge-hover;
      outline: none;
    }
  }
  @media (pointer: coarse) {
    height: 38px;
    .ns-staged-x {
      width: 26px;
      height: 26px;
      font-size: 16px;
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

  // FT-1229 (user): "more clearly its own area if there is a scroll bar
  // present ... sink it or elevate it" — SUNK, because the app's recessed
  // vocabulary already means exactly this (the toggle wells,
  // $control-toggle-well: contents continue below the surface). A soft
  // inset bite at the top and bottom edges — where the cut-off content
  // actually is — a hairline black edge, and a slightly recessed ground.
  // The class lands only when the rows genuinely overflow (measured in
  // measureRowsOverflow); a short list keeps the sheet's own flat ground.
  // The blood-drip scrollbar is untouched — it stays the region's signature.
  &.scrolls {
    background: rgba(0, 0, 0, 0.35);
    border-radius: 8px;
    box-shadow:
      inset 0 9px 10px -7px rgba(0, 0, 0, 0.9),
      inset 0 -9px 10px -7px rgba(0, 0, 0, 0.9),
      inset 0 0 0 1px rgba(0, 0, 0, 0.5);
  }
}

// FT-1313: A FOLD'S HEADER ROW — the collapsed groups' one visible piece.
// Dashed hairline in the sheet's own plum so it reads as furniture (a place
// rows went) rather than as another row; the caret carries open/shut, the
// label carries the arithmetic ("2 sent · 1 skipped", "Dead · 3").
.ns-fold {
  list-style: none;
  padding: 4px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);

  .ns-fold-head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #d8cdb4;
    opacity: 0.7;
    background: rgba(0, 0, 0, 0.3);
    border: 1px dashed rgba($grimoire-plum, 0.4);
    border-radius: 5px;
    padding: 4px 9px;
    transition:
      color 130ms,
      border-color 130ms,
      opacity 130ms;
    &:hover,
    &:focus-visible {
      opacity: 1;
      border-color: $control-edge-hover;
      color: $control-edge-hover;
      outline: none;
    }
  }
  &.open .ns-fold-head {
    opacity: 0.95;
    border-style: solid;
  }

  .ns-fold-caret {
    width: 10px;
    text-align: left;
  }
  .ns-fold-mark {
    width: 14px;
    height: 14px;
    object-fit: contain;
    filter: grayscale(0.3);
  }
  .ns-fold-fa {
    font-size: 11px;
    opacity: 0.8;
  }
  .ns-fold-label {
    flex: 1;
    text-align: left;
  }

  @media (pointer: coarse) {
    .ns-fold-head {
      min-height: 40px;
      font-size: 13px;
    }
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
  //
  // FT-1150 (user): STILL TWO LINES, AND THEY HAVE SWAPPED THEIR CARGO.
  // Line one is the identity AND the ability sentence; line two is the
  // controls, alone, across the row's whole width. The "instruct" area is
  // gone with the sentence that named it — the ability is a child of
  // .ns-identity now, not a grid item — and "work" (the wrapper that used to
  // hold both) is what column two's second line names.
  //
  // WHY. On the disc the answer zone was getting 188.8px of a 372px band
  // and 12.5px type, because it was sharing every line it stood on. It now
  // gets the band. Measured before/after in
  // claude_temp_test/2026-08-25-ft1150-nightrow-proof.mjs.
  //
  // FT-1173: THE STATE COLUMN CROSSED THE ROW. It was 34px on the LEFT (the
  // done checkbox); it is a FIXED right-hand column now, because the control
  // in it became the row's SEND — the last thing a storyteller presses on a
  // row, where the hand ends up, and a fixed width is what keeps the buttons
  // forming a straight column down rows whose content widths differ. The
  // area keeps its name ("state" still spans both lines), so everything else
  // about the grid — the full-height press target, the fade's reach — is
  // untouched by the crossing.
  grid-template-columns: minmax(150px, 1fr) 54px;
  grid-template-areas:
    "identity state"
    "work state";
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
  // FT-1173: `.ns-send` joins `.ns-check` in the carve-out — it is the
  // control that reopens a done row, so it is the one thing that must never
  // recede with the row it finished.
  // FT-1313: `.ns-state` joined the carve-out — the Send button lives inside
  // it, and Send is the done row's reopen, exactly the control that must
  // never recede. The `.skipped` fade is the same statement about a row the
  // storyteller passed over by hand — read, decided, out of the way.
  // FT-1329: Skip moved INTO `.ns-work` (the working line's left end), so the
  // `.ns-work > *` reach now excludes it by name — Skip is the skipped row's
  // way back and stays full strength, the same carve-out it had when it
  // lived inside `.ns-state`.
  &.done > *:not(.ns-check):not(.ns-send):not(.ns-state):not(.ns-work),
  &.done > .ns-work > *:not(.ns-skip),
  &.skipped > *:not(.ns-check):not(.ns-send):not(.ns-state):not(.ns-work),
  &.skipped > .ns-work > *:not(.ns-skip) {
    opacity: 0.45;
  }
  // FT-1313: a Dead-fold row — the whole row quiets, controls included:
  // nothing on it is owed, and the fold header above it already carries the
  // full-strength statement. Still fully usable (a storyteller may log a
  // dead seat's row), just not competing with the living.
  &.deadseat {
    opacity: 0.7;
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
  // (FT-1173: `.ns-check` above STOOD DOWN with its element — the template's
  // v-if="false". Its dress carried on into `.ns-send` below, which took the
  // grid area and the job.)

  // FT-1173: THE SEND BUTTON — the row's one press, in the fixed right-hand
  // column. It inherits .ns-check's whole idiom (full-height cell, plum
  // hairline, glyph-brightness states) because it IS that control with a
  // bigger meaning: glyph over word, stacked, so the column reads at a
  // glance. Colour rules unchanged from the sheet's own line: purple is
  // chrome (a thing you press); the SENT state borrows the tick's own lit
  // treatment rather than inventing a third.
  // FT-1313: THE STATE CELL GREW A SECOND CONTROL (Skip, stacked under Send),
  // so the grid area moved up one wrapper: `.ns-state` holds the cell.
  // FT-1329 (user) moved Skip out to the working line's left end — Send and
  // Skip must not stack — so the cell is Send's alone again. The wrapper
  // stays: the fades above carve it out by name, and the send still fills it.
  .ns-state {
    grid-area: state;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
  }

  .ns-send {
    flex: 1 1 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    cursor: pointer;
    font-family: inherit;
    font-size: 15px;
    color: #d8cdb4;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba($grimoire-plum, 0.3);
    border-radius: 4px;
    padding: 0;
    transition:
      color 130ms,
      border-color 130ms,
      background 130ms;
    svg {
      opacity: 0.55;
    }
    .ns-send-word {
      font-size: 10.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.7;
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
    // something is composed and unsent — the button is the row's next step,
    // and it says so the way the finish button does: lit purple, readable
    // across a scanned list rather than only under the cursor.
    &.dirty {
      color: #f4ecff;
      border-color: rgba(150, 130, 175, 0.85);
      background: rgba(120, 105, 135, 0.28);
      box-shadow: 0 0 7px rgba(120, 105, 135, 0.4);
      svg {
        opacity: 1;
      }
      .ns-send-word {
        opacity: 1;
      }
    }
    // sent (and nothing new staged): the tick's own lit dress — quiet,
    // findable, the reopen control on a row whose fade already says done.
    &.sent:not(.dirty) {
      color: rgb(120, 105, 135);
      border-color: rgba($grimoire-plum, 0.55);
      background: rgba(0, 0, 0, 0.35);
      box-shadow: none;
      svg {
        opacity: 0.95;
      }
      &:hover,
      &:focus-visible {
        color: $control-edge-hover;
      }
    }
    // FT-1272: NOTHING TO SEND YET. The app's own single "unavailable" dress
    // (controls.scss's `control-disabled`), and it goes LAST in this block so
    // it wins over `.dirty` — a row can hold a staged seat pick and still owe
    // its answer, and in that state the button must read as blocked rather
    // than as lit and ready. The `:hover` lift is cancelled with it: a
    // disabled button that still brightens under the cursor is a button that
    // looks pressable.
    &:disabled {
      @include control-disabled;
      box-shadow: none;
      &:hover,
      &:focus-visible {
        border-color: rgba($grimoire-plum, 0.3);
        background: rgba(0, 0, 0, 0.35);
        color: #d8cdb4;
        svg {
          opacity: 0.55;
        }
      }
    }
  }

  // FT-1313: SKIP — same plum-hairline family as the send (one vocabulary)
  // at a fraction of the presence: it is the "not this one" gesture, offered
  // on every live row and never competing with the row's real action. Lit
  // (`.on`) it wears the tick's own done treatment — the un-skip inside the
  // fold, the one thing on a skipped row that stays full strength.
  // FT-1329: it opens the working line now (left of the answer controls)
  // instead of stacking under Send, so it sizes to its own word — the
  // horizontal padding replaced the full-width `padding: 3px 0` it wore as
  // the state cell's lower half. Dress otherwise unchanged.
  .ns-skip {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    font-family: inherit;
    font-size: 9.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #d8cdb4;
    opacity: 0.7;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba($grimoire-plum, 0.3);
    border-radius: 4px;
    padding: 3px 8px;
    transition:
      color 130ms,
      border-color 130ms,
      background 130ms,
      opacity 130ms;
    svg {
      font-size: 9px;
      opacity: 0.55;
    }
    &:hover,
    &:focus-visible {
      opacity: 1;
      border-color: $control-edge-hover;
      background: rgba($grimoire-plum, 0.12);
      color: $control-edge-hover;
      outline: none;
      svg {
        opacity: 1;
      }
    }
    &.on {
      opacity: 1;
      color: rgb(120, 105, 135);
      border-color: rgba($grimoire-plum, 0.55);
      svg {
        opacity: 0.95;
      }
      &:hover,
      &:focus-visible {
        color: $control-edge-hover;
      }
    }
    @media (pointer: coarse) {
      min-height: 32px;
      font-size: 11px;
    }
  }

  .ns-identity {
    grid-area: identity;
    display: flex;
    // FT-1157 (user): "its weird that the player name doesn't line up with
    // the ability name and that all of them don't line up with the role
    // icon? Can we make then all line up?"
    //
    // They did not line up because this row centred BOXES. `.ns-who` is a
    // column and `.ns-reminder` a single line, so centring made their middles
    // agree and left their baselines wherever the box heights happened to put
    // them — and the three pieces are three different type sizes, which is
    // exactly the case where centring reads as misalignment.
    //
    // Baseline is the right axis for text: the role name, the seat name and
    // the ability sentence now all sit on one line, whatever size each is.
    // The order number and the icon are not text and have no baseline worth
    // sharing, so they stay centred against the line they sit beside.
    align-items: baseline;
    gap: 8px;
    min-width: 0;

    > .ns-ord,
    > .ns-icon {
      align-self: center;
    }

    // FT-1150: the ability sentence rides this line now, after the name, and
    // it is the piece that YIELDS. The name is capped at a share of the line
    // (a percentage of THIS box, so it is well defined at any band width)
    // and the sentence takes everything left over — `flex: 1 1 0` rather
    // than a content basis, so it never argues for width it has not been
    // given and never pushes the seat name off the line.
    > .ns-who {
      flex: 0 1 auto;
      max-width: 58%;
    }
    > .ns-reminder {
      flex: 1 1 0;
    }
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
    // FT-1150: THE CAP MOVED OUT TO `.ns-who`. A percentage max-width here
    // resolves against `.ns-who`, which is itself content-sized — so the name
    // could never use more than 65% of a box the name's own width had just
    // defined, and "Washerwoman" came out as "Washerwom…" on a line with
    // 200px to spare (measured at BOTH proof viewports, before this line
    // changed). The role is the one thing this list is scanned for; it must
    // not be the first thing to truncate.
    //
    // The limit is real, just stated where it is well defined:
    // `.ns-identity > .ns-who` caps the whole name block at a share of the
    // identity line, and inside it the SEAT ellipsizes first (`small`, below)
    // — a player's name is already written on their seat in the ring, a role
    // name has nowhere else to be read.
    b {
      flex-shrink: 0;
      max-width: 100%;
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
  // used to generate NO BOX at all (`display: contents`) so its two children
  // could sit in the row's own grid areas, and only the disc turned it into a
  // real flex line.
  //
  // FT-1150: it is a REAL BOX everywhere now, and it holds the controls
  // alone. The negotiation it existed to arrange is over — the sentence
  // moved up a line — so there is nothing left for `display: contents` to
  // buy, and one shape on every surface beats a wrapper that is two
  // different things depending on the window.
  .ns-work {
    grid-area: work;
    min-width: 0;
    // FT-1329: the working line is a flex row now — Skip at its left end,
    // then the answer zone taking the rest. `min-width: 0` on the answer is
    // the same load-bearing override the band variant documents: without it
    // the zone's automatic minimum is its own max-content and the wrap never
    // runs.
    display: flex;
    align-items: center;
    gap: 8px;
    > .ns-answer {
      flex: 1 1 auto;
      min-width: 0;
    }
  }

  .ns-answer {
    display: flex;
    align-items: center;
    // FT-1150: LEFT, not right. The zone used to be pinned to the row's right
    // edge because it shared a line with the identity and had to be visibly
    // separate from it. It owns the line now, so it reads down the same left
    // edge every other line of the row does.
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 6px;
  }

  // FT-874: what's being recorded, before the row's first control —
  // golem/nightInfo's per-character label
  // FT-1150: 12.5 -> 14px, one step under the controls it names.
  .ns-label {
    flex-shrink: 0;
    opacity: 0.75;
    font-size: 14px;
    white-space: nowrap;
  }

  // FT-1229: the split grammar's two labels (Selects: / Learns:) teach on
  // hover — the cursor says there is something to learn, nothing else
  // changes; they are the same quiet furniture every ns-label is.
  .ns-label-selects,
  .ns-label-learns {
    cursor: help;
  }

  // FT-1272: the template also puts `.by-storyteller` on that first label
  // where the seats are the STORYTELLER'S pointing ("Points at:" — the
  // Washerwoman, the Librarian, the Investigator). It carries NO STYLE, and
  // that is the decision rather than an omission: the WORD is the whole fix,
  // and giving the label a look of its own would invite the reading that the
  // dress means something the word does not already say. The class is a
  // reviewable hook — somewhere for a later pass to land if one is wanted.

  // ── FT-1150: THE ROW-CONTROL TYPE SIZE, said once ──────────────────────
  // Every control in the answer zone was 12.5px, which was the size that fit
  // when the zone was half a line wide. It has a whole line now, so the type
  // goes to the size these same controls ALREADY take when they have to be
  // usable under pressure: 15px — the value `.ns-free`, `.ns-told`, `.ns-lie`
  // and `.ns-label` all jump to under `@media (pointer: coarse)` further down
  // this file, and the value NumberScrub's own night preset carries there
  // too. Not a new number; the number this sheet already agreed on for "a
  // storyteller has to read this while the table waits".
  //
  // It also lands the controls level with the role name (15.5px) and above
  // the ability sentence (12.5px), which is the hierarchy this pass is for:
  // the thing you ACT on reads as loudly as the thing you are acting about,
  // and the reference text sits under both.
  //
  // The two pickers are child components, so their triggers are reached with
  // ::v-deep through the class THIS file puts on them — never by editing
  // SeatPicker, which player-facing surfaces (NightCall, NightInfoDrawer)
  // also mount and which should not inherit a storyteller row's sizing.
  .ns-target ::v-deep .sp-trigger,
  .ns-charpick ::v-deep .cp-trigger,
  .ns-told-sel ::v-deep .trigger {
    font-size: 15px;
  }
  // NumberScrub's root element IS `.num-scrub-box`, so `.ns-num` lands on the
  // same node — three classes plus this file's scope attribute, which is what
  // it takes to win against the component's own `.num-scrub-box.night`
  // (the `.phase .ns-day .num-scrub-box` rule above learned the same lesson).
  .ns-answer .ns-num {
    font-size: 15px;
    width: 56px;
  }

  // FT-874: the box styling that used to live here for .ns-num moved into
  // NumberScrub's own "night" preset (it needs a THIRD state — the resting
  // scrub label — that a plain <input> selector can't reach). This block is
  // .ns-free only now, the free-text fallback.
  // FT-1150: 12.5 -> 15px with its row-mates, and its EDGE COMES OFF THE
  // BLOOD. Resting grey #3d3d3d and a red focus ring were the last two
  // non-purple states on a control in this zone; both take `.ns-lie`'s own
  // purple pair, which is already the box beside this one on half these rows.
  // Red is the blood in this fork; the checklist is the book.
  //
  // ── AND `input.` IS LOAD-BEARING, which is a bug this card found rather
  // than a style choice. App.vue dresses every field in the app
  // (`input:not([type=checkbox]):not([type=radio]):not([type=range])`), and
  // three `:not()`s carry their argument's weight — that selector scores
  // 0-3-1 against this rule's 0-3-0, so it has been WINNING here all along.
  // Measured: this box rendered at 23.04px (`font-size: inherit` from that
  // rule, not the 12.5px written here), wore #3d3d3d rather than the edge
  // written here, and took a blood-red border and glow on focus. The `width`
  // and `height` landed, because the app-wide rule does not name them —
  // which is why it never looked broken enough to notice.
  //
  // Naming the element AND the zone takes this to 0-4-1 and wins outright
  // (`.ns-row input.ns-free` alone only TIES at 0-3-1, and a tie is decided
  // by whichever stylesheet the bundler happens to emit last — measured: the
  // tie lost). App.vue is another lane's file this week and is not touched:
  // the same split FT-1108 made when the shared focus ring was the app's
  // blood red — override where the exception lives, leave the app-wide rule
  // to the app.
  .ns-answer input.ns-free {
    height: 30px;
    font-family: inherit;
    font-size: 15px;
    color: white;
    background: rgba(0, 0, 0, 0.55);
    border: 1px solid rgba(120, 105, 135, 0.3);
    border-radius: 5px;
    padding: 0 8px;
    width: 140px;
    &:hover {
      border-color: rgba(150, 130, 175, 0.75);
    }
    // `:focus`, not `:focus-visible` — the app-wide rule's own blood glow
    // hangs off `:focus`, so that is the state that has to be answered here
    // or a focused box keeps the red halo whatever its border says.
    &:focus,
    &:focus-visible {
      outline: none;
      border-color: rgba(150, 130, 175, 0.75);
      box-shadow: 0 0 7px rgba(120, 105, 135, 0.4);
    }
    // FT-1272: the sent-row lock. Native `disabled` does the blocking (this
    // one IS an input); this is only its dress, and it cancels the hover
    // border for the same reason as its row-mates.
    &:disabled {
      @include control-disabled;
      &:hover {
        border-color: rgba(120, 105, 135, 0.3);
      }
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
  // FT-1229: + a faint gold ground — at trigger size the ring alone was
  // legible only up close, and the whole point of the mark (the user's
  // Selects/Learns pass) is that "this arrived from the player" reads at a
  // glance against the storyteller's own plain entries.
  .ns-target.from-player ::v-deep .sp-trigger {
    border-color: #b28f2f;
    box-shadow: inset 0 0 0 1px rgba(212, 175, 85, 0.55);
    background: rgba(178, 143, 47, 0.14);
  }

  .ns-player-said {
    max-width: 170px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    // FT-1150: 12 -> 13px. It is read while acting, so it comes up with the
    // controls — a step under them, because it is what somebody said rather
    // than something to press.
    font-size: 13px;
    font-style: italic;
    color: #d4af55;
  }

  // FT-1114: the yes/no control is a dropdown now (see its own note in the
  // template). Its ink rides the option classes, so the two answers still
  // read green and red on the closed trigger as well as in the open list —
  // the same idiom the enforcement row used before it joined the shared look.
  //
  // FT-1167: this block now dresses the CLOSED TRIGGER ONLY. The open list is
  // hoisted to <body> and is no longer a descendant of `.ns-told-sel`, so the
  // `.gsel-opt` half below can never match again — the same fate `.sp-list`
  // met, and it is restated in the unscoped block at the bottom of this file
  // for the same reason. Left standing rather than cut: it is the record of
  // where these two colours were declared before the list moved.
  .ns-told-sel ::v-deep {
    .gsel-label.ns-ping-yes,
    .gsel-opt.ns-ping-yes.on {
      color: #7ed67e;
    }
    .gsel-label.ns-ping-no,
    .gsel-opt.ns-ping-no.on {
      color: #ff8a8a;
    }
  }

  // FT-1114: STOOD DOWN with the button it dressed. Left in place per the
  // house rule — the record of what the row looked like as a cycle.
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
    // FT-1150: 12.5 -> 15px, and the same purple pair `.ns-free` and
    // `.ns-lie` wear at rest and under the pointer. Its LIT state stays gold
    // — see the colour note above: gold on this row is data (an open window
    // on the truth), purple is chrome (the thing you press).
    .ns-grim-show {
      height: 30px;
      font-family: inherit;
      font-size: 15px;
      color: white;
      padding: 0 8px;
      background: rgba(0, 0, 0, 0.55);
      border: 1px solid rgba(120, 105, 135, 0.3);
      border-radius: 5px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      &:hover:not(:disabled) {
        border-color: rgba(150, 130, 175, 0.75);
      }
      &:focus-visible {
        outline: none;
        border-color: rgba(150, 130, 175, 0.75);
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

  // FT-1121: THE GRIMOIRE'S OWN ANSWER. Sage, not gold and not purple, and
  // the choice follows this sheet's existing line rather than adding to it:
  // purple is CHROME (things you press), gold is WHAT IS NOT TRUE (.ns-lie,
  // .ns-truth, .ns-player-said). This is the one thing on the row that IS
  // true, so it takes neither, and it stays a shade under both so a scan
  // finds the lit mask first.
  //
  // A LABEL AND A VALUE, not a bare number: "1" alone beside a number scrub
  // showing "2" reads as a second input. The tag says which of the two is
  // being claimed.
  .ns-oracle {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    flex-shrink: 0;
    max-width: 190px;
    overflow: hidden;
    white-space: nowrap;
    // FT-1150: 12 -> 13px, with the rest of the answer line.
    font-size: 13px;
    line-height: 1;
    color: #8fbfa8;
    cursor: default;
  }
  .ns-oracle-tag {
    font-size: 10.5px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    opacity: 0.55;
  }
  .ns-oracle-val {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  // the impairment note — quieter again, and italic, because it is a fact
  // about the SEAT rather than part of the answer
  .ns-oracle-imp {
    font-size: 11.5px;
    font-style: italic;
    opacity: 0.65;
  }
  // the told answer and the truth have parted company: the mask beside this
  // is lit, and a hairline pairs the two so the eye reads them together
  // rather than hunting for the reason
  .ns-oracle.differs {
    color: #a8d6bd;
    border-left: 2px solid rgba(143, 191, 168, 0.45);
    padding-left: 6px;
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
    // FT-1121: PINNED BY HAND — this mask has stopped following the truth
    // oracle. Said with the smallest mark there is (a firmer edge) because it
    // is not a third STATE of the mark, it is a fact about why the mark is
    // where it is; the sentence rides the tooltip (lieHint).
    &.byhand {
      border-color: rgba(150, 130, 175, 0.62);
    }
    &.on.byhand {
      border-color: #b8892f;
    }
    // FT-1272: THE SENT-ROW LOCK. Last in the block so it wins over `.on` and
    // `.byhand` — a lit mask on a sent row must still read as locked, and the
    // hover lift is cancelled with it for the same reason the Send button's
    // is. The GLYPH keeps its lit colour under the dimming: the mask is the
    // record of whether that answer was a lie, and a locked row is exactly
    // where a storyteller still needs to READ it.
    &.locked {
      @include control-disabled;
      box-shadow: none;
      &:hover,
      &:focus-visible {
        border-color: rgba(120, 105, 135, 0.3);
        background: rgba(0, 0, 0, 0.55);
        svg {
          opacity: 0.42;
        }
      }
    }
    &.on.locked:hover,
    &.on.locked:focus-visible {
      color: #e0b45f;
      border-color: #8a6f2e;
      background: rgba(184, 137, 47, 0.16);
      svg {
        opacity: 1;
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
  // FT-1150: no longer a grid item — it is the last child of .ns-identity
  // (see the template), so `grid-area: instruct` went with the area name.
  // 13.5 -> 12.5px: it now shares a line with a 15.5px role name and a 13px
  // seat, and it is the reference text on that line, so it sits under both.
  .ns-reminder {
    display: block;
    min-width: 0;
    font-size: 12.5px;
    line-height: 1.32;
    opacity: 0.78;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // a finger needs a box, not a glyph — the state column stays put ("state"
  // names every stacked row below, so the check is the row's full height, an
  // even taller target than the desktop case), the rest stacks.
  // FT-1150: TWO stacked rows rather than three — the ability rides the
  // identity line here as well, wrapping under the name rather than
  // truncating, since a phone has no band to fight over.
  @media (pointer: coarse) {
    // FT-1173: the state column keeps its finger-sized width and follows the
    // send button to the ROW'S RIGHT, same as the desktop grid above.
    grid-template-columns: 1fr 58px;
    grid-template-areas:
      "identity state"
      "work state";
    row-gap: 6px;

    .ns-check {
      font-size: 18px;
    }
    .ns-send {
      font-size: 18px;
    }
    .ns-answer {
      justify-content: flex-start;
    }
    // the phone has no band to fight over — the sentence wraps onto its own
    // line under the name instead of truncating on a narrow one
    .ns-identity {
      flex-wrap: wrap;
      > .ns-who {
        max-width: 100%;
      }
      > .ns-reminder {
        flex: 1 1 100%;
        white-space: normal;
      }
    }
    // FT-874: .ns-num dropped from this list — NumberScrub's "night" preset
    // carries its own coarse-pointer sizing (44px height, 64px width, 15px
    // font — same numbers this rule used to apply) inside the component.
    .ns-label {
      font-size: 15px;
    }
    // FT-1150: `input.` on the free box here too, for the reason spelt out
    // where the desktop rule sets it — App.vue's app-wide field styling
    // outscores a bare class and was silently taking this font size.
    .ns-told,
    .ns-lie {
      height: 44px;
      font-size: 15px;
    }
    .ns-answer input.ns-free {
      height: 44px;
      font-size: 15px;
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

// ── FT-1150: AND THE CHARACTER PICKER, WHICH WAS STILL RED ─────────────────
// The user's report was about this control: "why is that red stil,, they
// should all be purple. All storyteller controls should be purple like the
// player selector one." Its list wore a #400 frame, its rows reddened under
// the pointer and its chosen row wore the blood wash — while the seat picker
// standing beside it, and the settings dropdowns above it (FT-1108), were
// already plum.
//
// It joins the SAME block rather than getting a recipe of its own, for both
// of the reasons this block exists. `.cp-list` is hoisted to `document.body`
// by the same `golem/floatingPicker` mixin that hoists `.sp-list` — the two
// pickers share that shell — so a scoped `::v-deep` could not reach it
// either. And routing it through the same three custom properties means the
// two pickers on one row cannot drift: one definition, one colour, and the
// character picker answers "who is looking" exactly as its neighbour does.
//
// `.cp-*` are CharacterPicker's own class names, used nowhere else in the app
// (checked, same as `.sp-*`), and that component is mounted by this file
// alone — so reaching them globally here is safe.
:root .cp-trigger.cp-trigger {
  border-color: var(--ns-viewer-color, #3d3d3d);
  &:hover,
  &.open {
    border-color: var(--ns-viewer-color, #400);
  }
}

:root .cp-list.cp-list {
  border-color: var(--ns-viewer-color, #400);
  .cp-row {
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

// ── FT-1167: AND THE YES/NO LIST, WHICH IS HOISTED NOW TOO ─────────────────
// The row's dropdown (OptionSelect with `hoist`) leaves the sheet the instant
// it opens, for the reason written on that prop: the checklist band
// (`ul.ns-rows`, `overflow: auto`) was shearing its bottom row off — 49px past
// the band's edge at both viewports, with the "No" option unclickable as well
// as unseen. From that moment the list is a child of <body>, exactly like the
// two pickers above, so the scoped `.ns-told-sel ::v-deep .gsel-opt…` rule
// that used to carry these two colours cannot reach it. Same colours, restated
// here — green for the yes it told them, red for the no.
//
// `.ns-ping-yes` / `.ns-ping-no` are this sheet's own option classes (they are
// declared in `pingOptions`, in this file, and appear nowhere else), so
// reaching them globally carries the same absence of collision risk `.sp-*`
// and `.cp-*` do. `:root` prefixed and the class doubled for the same
// specificity reason as every rule above it.
:root .gsel-menu .gsel-opt.ns-ping-yes.on {
  color: #7ed67e;
}
:root .gsel-menu .gsel-opt.ns-ping-no.on {
  color: #ff8a8a;
}
</style>
