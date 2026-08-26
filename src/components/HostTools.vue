<template>
  <!-- Golem fork: the HOST TOOLS panel — the storyteller's setup surface,
       centre-stage while the game is being built (hosting, seats exist, roles
       not yet dealt). The controls DRIVE the existing machinery (players/add,
       the edition + roles modals, distributeRoles) — this panel is doors, not
       a second implementation. -->
  <div class="host-tools">
    <!-- By this point the host has always already named the town, one menu
         back — restating "Build the town" here said nothing "Ravenswood" one
         line below didn't already say, so the name IS the heading now, and
         the old Town row folds away. Its rename affordance moved onto the
         heading first and then came off entirely — see the note on the h3.

         `.ht-head` wraps h3 rather than leaving it bare so the games-played
         line and the rename note can sit under the name without becoming a
         FOURTH flex child of `.host-tools` on the disc — the geometry below
         is measured for exactly three (cap / band / cap; see faceDisc.scss),
         and a fourth would push the band off its centre. -->
    <div class="ht-head">
      <!-- NOT RENAMEABLE FROM HERE (user call, 2026-08-19). The town is named
           in the host menu one screen earlier, and offering a second place to
           change it here made the heading look like a control rather than a
           title. The rename flow itself (startRename / commitRename / the
           input below) is left in place, unwired, for whichever surface should
           own renaming. -->
      <h3 v-if="!renaming" :title="headTitle">
        <!-- FT-1095 (user call): "the town icon joins the name" — a mark
             immediately left of it. FT-1098 (user correction): this wore the
             picked SCRIPT's own mark at first, which reads as "which edition
             is loaded" — the wrong statement for a heading that names the
             TOWN. `uiTown` is static art (see the import above), not a
             derivation off `scriptCards`/`pickedScriptId` the way
             `headerScriptIcon` was — nothing about the town's own mark
             should follow whichever script gets picked. `headerScriptIcon`
             stands down (never-delete) rather than being removed. -->
        <img class="ht-town-icon" :src="uiTown" alt="" />
        <!-- FT-1098: the name is its own grid cell now, not a bare text node
             beside the icon — see `h3`'s own grid rule below for why. -->
        <span class="ht-town-name">{{ townName }}</span>
        <!-- FT-959 (user call): copy the town's own link, right beside its
             name. The session pill (App.vue's copyPillLink) already does
             this EXACT job — same URL, same copied-tick feedback — so this
             calls the same `copySessionUrl` on Menu.vue through the same
             $parent.$refs.menu route `start()`/`pickScript()` already use
             below, rather than a second copy routine. Only the copied-flash
             TIMER is a local echo of App.vue's own (each button owns its own
             tick, same as the pill owns its). -->
        <button
          type="button"
          class="ht-copy-link"
          @click="copyTownLink"
          :title="linkCopied ? 'Copied!' : 'Copy the town link'"
        >
          <font-awesome-icon :icon="linkCopied ? 'check' : 'link'" />
        </button>
      </h3>
      <input
        v-else
        ref="rename"
        v-model="renameDraft"
        class="ht-rename-input"
        spellcheck="false"
        maxlength="200"
        @keyup.enter="commitRename"
        @keyup.esc="renaming = false"
        @blur="commitRename"
      />
      <!-- how many games this town will have seen once this one ends — the
           server's finished-game count plus the one being built right now.
           Blank (not zero) while the count is unknown: a wrong number reads
           worse than no number. -->
      <small
        v-if="!renaming && gamesLine"
        class="ht-games"
        :title="gamesHint"
        >{{ gamesLine }}</small
      >
      <small v-if="!renaming && renameNote" class="ht-rename-note">{{
        renameNote
      }}</small>
    </div>

    <!-- FT-888: THE BAND. On the desktop disc this wrapper is the ring's
         middle third — the slice between the two caps, where the rows live,
         with the title in the cap above and Start in the cap below (exactly
         the arrangement the checklist and the entry panels already use).

         EVERYWHERE ELSE IT GENERATES NO BOX AT ALL. `display: contents` means
         the rectangle and both phone sheets lay out their children in this
         wrapper's place, byte-for-byte as they did before it existed — the
         same trick the checklist's own `.ns-work` wrapper uses, for the same
         reason. A wrapper that only one layout can see costs the other three
         nothing. -->
    <div class="ht-body">
      <!-- ── FT-1032: THE GREETING LINE ─────────────────────────────────────
         The re-entry face's one statement: a game is running here, and this
         is its moment. The wording is TownInfo/FaceHands' own phase idiom
         ("Day 3" / "Night 3", same clamp), because the dial's readouts and
         this line state the same fact and may never disagree. Everything
         that belongs to setup — seats, script, roles, tray, Start — stands
         down below on `!reentry`; the night switch and the Tower rows stay,
         because a storyteller mid-game still owns the night sheet and the
         clock. -->
      <div class="ht-running" v-if="reentry">
        Game running — {{ phaseLine }}
      </div>
      <!-- ── FT-1090: THE CAST LINE ─────────────────────────────────────
         ONE row for the two questions that are the same question — how many
         are playing, and who they are (user-approved plan: "seat/team counts
         + shuffle on the left, 'N / M assigned' + the four role buttons on
         the right… they say the same kind of thing — the cast").

         TWO HALVES, EACH ITS OWN WRAP UNIT. `.ht-cast-half` is what makes the
         merge safe at every width: the row breaks BETWEEN the halves before
         it breaks inside one, so a narrow panel gets exactly the two lines it
         had before — seats above, roles below — never the shuffle stranded
         under a role button. Where they share a line the row's own
         `space-between` splits them, the same two-cluster shape FT-959 gave
         each of these rows separately.

         The seat half keeps the row's old `title` (it carries the claimed
         count, which the disc folds away — see the styles); the role half is
         a separate claim and carries none.

         `row-gap: 0` on this row (styles below) is the other half of "the
         merge never costs": a wrapped line has no `min-height` floor of its
         own, so two wrapped halves stand exactly as tall as their content and
         strictly shorter than the two 34px-floored rows they replace. -->
      <div class="row ht-cast" v-if="!reentry">
        <span class="ht-cast-half ht-cast-seats" :title="seatsHint">
          <!-- FT-959 (user call): "make it more clear that the chain is tied to
             the 7". `.ht-seat-lead` groups the mark, the scrub and its implied
             counts on the row's LEFT; `.ht-seat-trail` groups the claimed count
             and the shuffle on the RIGHT. Two clusters instead of five loose
             items means the row's own `space-between` now spends its slack in
             ONE gap, between the clusters, instead of splitting it five ways —
             which is the "excess space" the row used to read as (see the style
             block below for the measured before/after).

             THE PLATE (`.ht-seat-readout`) is what ties the number to its
             counts specifically, inside the lead cluster — not the mark, which
             stays a separate small icon the way every other row's mark does.
             A shared `control-plate` is this app's OWN vocabulary for "these
             read as one object" (see controls.scss's own reasoning on
             `.nm-seg`: "three plated buttons... read as three buttons" without
             one shared plate around them) — so wrapping the scrub and the
             composition readout in the panel's one shared plate is reusing the
             app's existing idiom, not inventing a new one. A connective glyph
             or bracket was the other option on the table; the plate was picked
             because it is already how every other "this is one control" claim
             on this panel is made. -->
          <span class="ht-seat-lead">
            <span class="label">
              <img class="row-mark" :src="uiSeat" alt="Seats" title="Seats" />
            </span>
            <span class="ht-seat-readout" :class="{ warn: !!seatWarn }">
              <!-- the number is a SCRUBBER: drag it sideways to set the count
                 (user call — the +/- pair retired). FT-874: extracted into
                 NumberScrub so the night sheet's own number fields run the SAME
                 gesture code — see that component for the full history. -->
              <span class="stepper">
                <NumberScrub
                  class="seat-scrub-ctl"
                  :value="players.length"
                  :min="0"
                  :max="20"
                  @input="setSeatCount"
                />
              </span>
              <!-- FT-888 (user call): WHAT THIS MANY SEATS MAKES — the composition
                 the seat count implies, right of the number that decides it.
                 Drag the scrub and the four counts move with it, which is the
                 whole reason it belongs on this row and not on another one.

                 It is the SAME OBJECT the town readout above the clock face
                 already renders (TownInfo's second line): the same
                 `gameJSON[nonTravelers-5]` table, the same golem/glyphs team
                 art, the same "tint the digit in the team's own colour" idiom.
                 Not a second implementation of a readout this app already has.

                 THESE ARE IMPLIED COUNTS, NOT ASSIGNED ONES, and the
                 distinction is deliberate: this row is where the seat count is
                 set, so the useful answer here is "and that means 5/0/1/1".
                 What has actually been dealt is the Roles row's job, one line
                 down. Two rows disagreeing about what "2 outsiders" means would
                 be worse than not showing it. THE SHARED PLATE does not blur
                 this: it ties the counts to the NUMBER that implies them, on
                 THIS row only, and says nothing about assignment — the Roles
                 row's own value keeps its own separate look below.

                 Below five non-travellers there is no official composition to
                 state, so nothing is stated — same gate TownInfo uses. -->
              <span class="ht-comp" v-if="composition" :title="compHint">
                <span
                  v-for="t in COMP_TEAMS"
                  :key="t"
                  class="stat"
                  :class="t"
                  :title="TEAM_LABELS[t] + ': ' + composition[t]"
                >
                  {{ composition[t] }}
                  <img class="team-glyph" :src="teamGlyph(t)" alt="" />
                </span>
              </span>
            </span>
          </span>
          <span class="ht-seat-trail">
            <!-- (the shift-click-to-fill shortcut left this line 2026-08-18 —
               shift-clicking START does the filling now, so there is one dev
               gesture instead of two. devFillSeats itself is kept below.) -->
            <small class="claimed">{{ claimedCount }} claimed</small>
            <!-- FT-847 follow-up: relocated from the retired Players toolbar tab.
               ALWAYS rendered — appearing icons shove the row (user call);
               unusable states grey out instead. -->
            <!-- (trash retired — scrub the count to 0 instead; user call) -->
            <!-- SHUFFLE SEAT ORDER. A real <button> wearing the panel's shared
               control plate (2026-08-19, user call: "and this shuffle
               button?"). It was a bare <svg> with no box at all — the only
               control on the panel with nothing under it — which is why it
               read as loose furniture beside the plated buttons one row down.
               Same 34x30 plate as RoleActions' three now, from the one
               `control-icon-btn` mixin.

               `:disabled` rather than a `.disabled` class: the plate's own
               disabled state comes with the mixin, the button stops taking
               clicks by itself, and it drops out of the tab order — which the
               old opacity-plus-pointer-events pair never did. -->
            <span class="tools">
              <!-- FT-1132 (user): this button and the role randomiser beside
                   it wear the SAME glyph and their titles read alike, so
                   there was no way to tell which one you were about to press.
                   Both titles now say which is which, in the user's own words.

                   FT-1133 (user): ...and the title said the wrong thing about
                   this one. It used to read "everyone moves chair, keeping
                   what they hold", which was an accurate description of a
                   bug: the shuffle reordered the roster and carried each
                   person's character along with them, so who held what never
                   changed. It now moves the PEOPLE and leaves every character
                   on its own chair, which is the only version of this button
                   that does anything a storyteller wants. -->
              <button
                class="tool-btn"
                type="button"
                :disabled="players.length <= 2"
                @click="randomizeSeatings"
                title="Shuffle who sits where — the people change chair, the characters stay on theirs"
              >
                <font-awesome-icon icon="random" />
              </button>
            </span>
          </span>
        </span>
        <!-- ── THE ROLE HALF (FT-1090, moved here from its own row) ──────────
           FT-854: the role DRAWER replaced the overlay.
           FT-959 (user call): "the '0/7 assigned' value should sit with its
           mark rather than adrift." The mark and the value are ONE cluster
           (`.ht-role-lead`), so RoleActions reads as its own group beside
           them. RoleActions is HELD — its internal Deal/Shuffle/Duplicates/
           Retract grouping is untouched.

           Deal / Shuffle / Dupes sit INLINE with the count on every width
           (user call 2026-08-18) — the tray below carries only characters. -->
        <span class="ht-cast-half ht-cast-roles">
          <span class="ht-role-lead">
            <span class="label">
              <img class="row-mark" :src="uiRole" alt="Roles" title="Roles" />
            </span>
            <span class="value" @click="toggleModal('roleDrawer')">
              {{ rolesAssigned }} / {{ players.length }} assigned
            </span>
          </span>
          <RoleActions />
        </span>
      </div>
      <!-- FT-895 (user call: "a script should carry a minimum and maximum number
         of players... and the seat number should respect that", then — on how
         hard — "the seat control probably shouldn't enforce the number but
         warn when it is outside of that range").

         IT WARNS, IT NEVER BLOCKS. The scrub above keeps its full 0-20 and
         still sets whatever it is dragged to; this line only says what is
         wrong with the count. That is deliberate and it is the user's call:
         a storyteller mid-setup knows things the table does not.

         WHY A LINE AND NOT A CHIP. The night row's Optional/Warn/Required
         segment is a SETTING — three states you pick between — so borrowing
         its shape here would read as another control to operate rather than
         something the panel is telling you. What is borrowed instead is its
         INK: warn gold, the colour this app already means "look at this, but
         nothing is stopping" with. The shape comes from `.hint`, the Start
         footer's own line for "here is why this looks the way it does",
         which is exactly this job one row down.

         IT NAMES THE SHORTFALL. "Too many players" would be useless; the
         setup table knows what 13 seats requires and the script's own pool
         knows what it holds, so the line says which team is short and by how
         much. The derivation is golem/seatRange — shared, so no second
         surface can disagree about what this script plays. -->
      <small class="hint seat-warn" v-if="!reentry && seatWarn">
        {{ seatWarn.reason }}
        <span class="plays" v-if="seatWarn.plays">{{ seatWarn.plays }}</span>
      </small>

      <!-- the SHARED script picker (user call): pick right here, with the
         script's OWN art on the trigger; the Almanac card opens the forge -->
      <div class="row" v-if="!reentry">
        <span class="label">
          <!-- ui-script.png is the SAME file the top strip's own script door
             wears (Menu.vue) — not a new asset. It bakes flat neutral grey
             (mean rgb ~101,101,101) where seat/role/nightcheck bake warm
             (~154,146,133), the recipe every other row mark in the app
             converges on independently. ui-script.png is used elsewhere
             (Menu.vue) so it is not re-baked; `.ht-script-mark`'s filter
             warms THIS instance only, tuned against the live render to land
             within ~2 units of the warm family's own mean RGB — see the
             sampling rig, claude_temp_test/2026-08-19-ft936-sample/. -->
          <img
            class="row-mark ht-script-mark"
            :src="uiScript"
            alt="Script"
            title="Script"
          />
        </span>
        <ScriptPicker
          class="ht-script-picker"
          :cards="scriptCards"
          :picked-id="pickedScriptId"
          @pick="pickScript"
        />
      </div>

      <!-- (FT-1090: the ROLES ROW stood here. Its mark, its "N / M assigned"
         value and RoleActions all moved up into the cast line above — see
         the `.ht-cast-roles` half — so the two halves of one statement share
         one line instead of two. Nothing was dropped on the way.) -->

      <!-- ── FT-1099 (user's own pairing, superseding FT-1098's bin-pack) ──────
         `flex-wrap` bin-packing four units greedily in DOM order (FT-1098)
         paired whichever two happened to fit a line — at the disc's 2560
         width that meant night-mode+day-length, at the floor/1920 it meant
         day-length+bell, never the storyteller's own read of "the night
         checklist goes with the day-break bell; the day's length goes with
         the call-back voice". This pass names those two pairs directly
         instead of leaving it to arithmetic: `.ht-set-line1` always holds
         NightModeRow + the day-break bell select, `.ht-set-line2` always
         holds the day-length pair + the call-back select, and each line is
         forced to its own full-width row (see `.ht-set-line`'s `flex-basis:
         100%` below) so the pairing holds at every width rather than only
         the ones where the sums happen to work out.

         Component widths are unchanged from FT-1098's own measurement (7
         seats; rig: `claude_temp_test/2026-08-23-ft1099-measure.mjs`):

           night-mode 284.8-286.8 · day-length 236.6 · bell / call-back 146.8 each

         Line 1 (night-mode + bell, ~447.6 + gap) clears 1920 (481px) and
         2560 (636.1px) on one line; only the disc FLOOR (403.4px) is
         narrower than the pair's own width, where the bell wraps beneath
         NightModeRow rather than reaching sideways for the day-length pair
         instead — see the style block for the exact rule and the measured
         proof under `claude_temp_test/2026-08-23-ft1099-shots/`. Line 2
         (day-length + call-back, ~397.4 + gap) fits one line at all three.

         NightModeRow is embedded rather than restated: the night settings and
         their wording still travel with the rest of the night code, and its
         own `.nm-hint` sentence still folds away on the disc exactly as it
         did when it was a row of its own (FT-888).

         `row-gap: 0` (styles below) still holds: two forced-full-width lines
         inside ONE wrapped `.row` cost the same as the old bin-pack's own
         wrapped lines did — no fresh row-to-row gap is paid for naming the
         pairing explicitly. -->
      <div class="row ht-settings">
        <span class="ht-set-line ht-set-line1">
          <!-- FT-860: the night sheet's three-state switch. Its own component so
             the setting travels with the rest of the night code. -->
          <NightModeRow />

          <!-- FT-1087: THE DAY-BREAK BELL IS ONE SELECT — Off / One / Two /
             Custom — where it was two segments standing side by side, an
             On/Off pair and a which-bell trio. Every state the pair could
             reach, this list reaches — Off writes `bellOn` false and leaves
             `bellId` exactly where it was, so picking a bell again returns
             the town to the one it had.

             FT-1045'S PREVIEW CONTRACT IS INTACT: picking a bell plays it here
             (local only), picking the same one again stops it — the select
             emits on a repeat pick precisely so it still can (see
             OptionSelect.vue). Picking Off also stops anything still tolling,
             which the segment never did. Custom still opens the source row
             below. -->
          <span class="tw-lead">
            <span class="label">
              <font-awesome-icon
                class="row-mark-fa"
                icon="sun"
                title="The day-break sound"
              />
            </span>
            <OptionSelect
              name="bell-which"
              aria-label="Day-break bell"
              :options="bellOptions"
              :value="bellChoice"
              @input="pickBellChoice"
            />
          </span>
        </span>

        <span class="ht-set-line ht-set-line2">
          <!-- ── FT-1055: THE DAY'S LENGTH — Off, or a minutes value on the
             shared NumberScrub (the Seats row's own gesture code). TOWN
             AUTHORITY: it rides DEFAULT_TOWER's persistence and sync like
             every field beside it. At zero the day-start bell machinery
             tolls once and every readout flashes — and NOTHING else
             happens: the day NEVER auto-ends; the storyteller keeps
             control. Mark, select and minutes read left to right as one
             sentence ("hourglass — Timed — 10 min") in one `.ht-set-pair`. -->
          <span
            class="ht-set-pair tw-day"
            title="How long a day runs before the tower calls time — the bell tolls and the countdown flashes; the day itself never ends on its own"
          >
            <span class="tw-lead">
              <span class="label">
                <!-- FT-1058c (user): the hourglass, not the sun — this row is
                     about time running, and the sun belongs to the day-break
                     sound above. -->
                <font-awesome-icon
                  class="row-mark-fa"
                  icon="hourglass-half"
                  title="The day's length"
                />
              </span>
              <OptionSelect
                name="day-length"
                aria-label="Day length"
                :options="dayLengthOptions"
                :value="tower.dayLengthMin ? 'timed' : 'off'"
                @input="setDayMode"
              />
            </span>
            <!-- the minutes themselves — dimmed while Off, and scrubbing it is
               itself the "on" gesture (a length you are setting is a length
               you want). -->
            <span
              class="tw-daylen"
              :class="{ idle: !tower.dayLengthMin }"
              title="Minutes in a day — drag sideways to scrub, click to type"
            >
              <NumberScrub
                class="tw-daylen-scrub"
                :value="tower.dayLengthMin || dayLenDraft"
                :min="dayLenMin"
                :max="dayLenMax"
                title="Minutes in a day — drag sideways to scrub, click to type"
                @input="setDayLength"
              />
              <span class="tw-daylen-unit">min</span>
            </span>
          </span>

          <!-- FT-1051: THE CALL-BACK VOICE — the same merged-select shape as
             the bell above it (two words, so it is the smaller control, but
             the SAME kind of control). -->
          <span class="tw-lead">
            <span class="label">
              <font-awesome-icon
                class="row-mark-fa"
                icon="bell"
                title="The call-back bell"
              />
            </span>
            <OptionSelect
              name="callback"
              aria-label="Call-back voice"
              :options="callOptions"
              :value="tower.callId"
              @input="pickCall"
            />
          </span>
        </span>
      </div>

      <!-- FT-1045: THE CUSTOM BELL'S SOURCE — the row only Custom shows.
         A link, or an upload that becomes one: either way what the town
         syncs is a URL in the tower config, never audio bytes. The field
         validates by actually loading the sound; a link that will not play
         wears the quiet failure state and is not kept. -->
      <div
        class="row tw-row tw-custom"
        v-if="tower.bellId === 'custom'"
        title="Where the custom bell's sound lives — every player's browser fetches it from here"
      >
        <span class="tw-lead">
          <span class="label">
            <font-awesome-icon
              class="row-mark-fa"
              icon="link"
              title="The custom bell's source"
            />
          </span>
          <input
            class="tw-url"
            type="text"
            :class="{ bad: bellUrlState === 'bad' }"
            placeholder="Link to a sound"
            :title="bellUrlHint"
            v-model="bellUrlDraft"
            @change="commitSourceUrl('bell')"
            @keyup.enter="$event.target.blur()"
          />
        </span>
        <span class="tools">
          <label
            class="tool-btn tw-upload"
            :class="{ busy: bellUploading }"
            :title="
              bellUploading
                ? 'Uploading…'
                : 'Upload a sound file instead (10MB cap)'
            "
          >
            <font-awesome-icon icon="file-upload" />
            <input
              type="file"
              accept="audio/*"
              hidden
              :disabled="bellUploading"
              @change="uploadSource('bell', $event)"
            />
          </label>
        </span>
      </div>

      <!-- FT-1051: THE CALL-BACK'S SOURCE — the row only Custom shows,
         same shape as the bell's own above it. -->
      <div
        class="row tw-row tw-custom"
        v-if="tower.callId === 'custom'"
        title="Where the call-back's sound lives — every player's browser fetches it from here"
      >
        <span class="tw-lead">
          <span class="label">
            <font-awesome-icon
              class="row-mark-fa"
              icon="link"
              title="The call-back's source"
            />
          </span>
          <input
            class="tw-url"
            type="text"
            :class="{ bad: callUrlState === 'bad' }"
            placeholder="Link to a sound"
            :title="callUrlHint"
            v-model="callUrlDraft"
            @change="commitSourceUrl('call')"
            @keyup.enter="$event.target.blur()"
          />
        </span>
        <span class="tools">
          <label
            class="tool-btn tw-upload"
            :class="{ busy: callUploading }"
            :title="
              callUploading
                ? 'Uploading…'
                : 'Upload a sound file instead (10MB cap)'
            "
          >
            <font-awesome-icon icon="file-upload" />
            <input
              type="file"
              accept="audio/*"
              hidden
              :disabled="callUploading"
              @change="uploadSource('call', $event)"
            />
          </label>
        </span>
      </div>

      <!-- FT-859: the UNSEATED TRAY — the script's characters that have no
         chair yet, dragged straight onto a seat from here. Dropping a seated
         role anywhere that is not a seat sends it back to this tray. -->
      <RoleTray v-if="!reentry" />

      <!-- FT-1032: the greeting face's quiet second door, and it must exist:
         a town whose roster did not survive the trip here cannot END its
         game (EndGameOverlay refuses with no seated roles) and has no other
         way back to the builder — without this the greeting face is a dead
         end for exactly the host it greets. In the BAND, not the dock: the
         disc folds the dock's hint lines into tooltips (see `.start-dock
         .hint` in the disc rules), and a door that vanishes on the desktop
         disc is no door. It only swaps the face — the running marker and
         the End-game door are untouched, so a game that can still be
         recorded still can be. -->
      <small
        class="hint ht-rebuild"
        v-if="reentry"
        title="Show the build panel instead — the running game is not ended by this"
        @click="$emit('rebuild')"
        >…or set up a new game</small
      >
    </div>

    <!-- Start and the line explaining why it is greyed out are ONE footer.
         On a phone the panel is a scrolling sheet, and they were the last
         things in it — the button the panel exists to reach sat below the
         fold. Grouped, the pair can ride the sheet's bottom edge (see the
         portrait rule in the styles); on a desktop the wrapper is inert. -->
    <div class="start-dock" v-if="!reentry">
      <div
        class="start"
        :class="{ ready: canStart }"
        @click="start"
        :title="startHint"
      >
        Start game
      </div>
      <small class="hint">{{ startHint }}</small>
    </div>
    <!-- FT-1032: the greeting face's one control — same dock, same button
         object (the disc's cap geometry and the phone sheets' sticky footer
         are both keyed on `.start-dock`/`.start`, reused rather than
         restated). Always `ready`: there is nothing to gate; the game is
         already running. NOT auto-dismissed (judgement call): the local
         roster may not have survived the trip here, and dropping the host
         silently into a square of empty chairs with nothing saying why is
         FT-913's dead end again — the click is the host stepping back in. -->
    <div class="start-dock" v-else>
      <!-- "Re-enter", one word by measure: the disc's bottom cap holds
           "Start game"'s width and the longer label wrapped to two lines
           there (seen live, 1545x1090) — the town's name is the heading two
           inches up, so the label does not need to restate it. -->
      <div
        class="start ready"
        :title="'Back to the town — ' + phaseLine + ' continues'"
        @click="$emit('reenter')"
      >
        Re-enter
      </div>
      <small class="hint">The game picks up where it left off.</small>
    </div>
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import { listTowns, editKeyFor, updateTown } from "../golem/towns";
// the heading's games-played line — the same per-town aggregate StatsOverlay
// reads, not a new count.
import { townStats } from "../golem/stats";
import ScriptPicker from "./ScriptPicker";
// FT-859: the unseated-role tray that lives under the Roles row.
import RoleTray from "./RoleTray";
// FT-859: the three build actions, inline in the Roles row.
import RoleActions from "./RoleActions";
// FT-860: the night sheet's Off / Storyteller / Everyone row.
import NightModeRow from "./NightModeRow";
// FT-874: the shared drag-scrub / click-to-type number control.
import NumberScrub from "./NumberScrub";
// FT-1087: the panel's shared dropdown — the script picker's own trigger
// idiom, opening a list of words instead of a grid of cards. Every
// multi-option setting on this panel wears it.
import OptionSelect from "./OptionSelect";
import editionJSON from "../editions";
import { EDITION_ICONS, edCustom, OFFICIAL_BLURBS } from "../golem/editionArt";
import { getRecents } from "../golem/scripts";
import grimoireClosed from "../assets/grimoire-cover.png";
// FT-936: the row labels wear marks instead of words (user call: "lets use
// icon for those, the chair icon for seats, Script icon for script... a
// player coin is good for the roles"). uiScript is the SAME file Menu.vue's
// top strip already wears for the script door — not a new asset; see the
// template note on `.ht-script-mark` for why this one instance carries an
// extra filter.
import uiSeat from "../assets/ui-seat.png";
import uiRole from "../assets/ui-role.png";
import uiScript from "../assets/ui-script.png";
// FT-1098 (user correction): the header wore the SCRIPT's own mark
// (headerScriptIcon, below — Trouble Brewing's blood splat and so on,
// whichever edition happened to be picked) where it should have worn the
// TOWN's. Two town-ish candidates live in this folder — `ui-town.png` (two
// plain house silhouettes, the counts row's own `COUNT_ICONS.town` art via
// golem/glyphs) and `ui-enter.png` (a clocktower + path + a walking figure,
// the re-entry face's mark). Picked ui-town: at header size (1.15em, ~26px
// on the disc per the FT-1095 note below) `ui-enter`'s clock hands and
// figure are fine enough detail to smear into noise, where `ui-town`'s two
// bold triangles and door-slits still read as "a town" — the same "reads at
// a glyph, not an illustration" bar every other row-mark on this panel
// already clears.
import uiTown from "../assets/ui-town.png";
// DEV shift-Start (2026-08-19): the same transient hint EditionModal, Menu and
// EndGameOverlay use to say something when a click can't do what it looks
// like it should — used below so a shift-click that genuinely can't proceed
// says why instead of just doing nothing.
import { flashHint } from "../golem/hint";
// FT-888: the composition readout on the Seats row. Both of these are the
// sources TownInfo's own composition line reads — the official setup table and
// the fork's team art — so the two readouts stay one object in two places.
import gameJSON from "../game";
import { teamGlyph } from "../golem/glyphs";
import { TEAM_LABELS } from "../golem/composition";
// FT-895: what THIS script can actually seat, derived from its own character
// pool. Shared with the workbench meter's "Plays 5-15" line through
// golem/composition's `servableFor`, which both of them read — the seat row
// and the meter cannot disagree about a script's range.
import { seatWarning } from "../golem/seatRange";
// FT-1020: THE TOWER — the storyteller's clockworks (display mode, tick vs
// sweep, the day-start bell). towerState is the module's single copy; the
// rows here write through setTowerField (which persists per town) and re-read
// on the tower's own event, the same one-way shape the face lab runs on.
import {
  TOWER_BELLS,
  // FT-1052: the three display layers + the derived Off row. (FT-1055: the
  // panel's display segment retired — these now serve only the stood-down
  // methods below; the live segment is Menu.vue's hourglass tab.)
  HOUR_LAYERS,
  HOUR_OFF,
  toggleHourLayer,
  hourAllOff,
  TOWER_EVENT,
  towerState,
  loadTowerForTown,
  setTowerField,
  // FT-1055: the Day length scrub's bounds.
  DAY_LENGTH_MIN,
  DAY_LENGTH_MAX,
  previewBell,
  // FT-1045: the bell buttons preview as they pick, and Custom brings a
  // source row — a validated link, or an upload that becomes one.
  toggleBellPreview,
  // FT-1087: picking Off on the merged bell select silences a preview that is
  // still running — the pair of segments it replaced had no way to say that.
  stopBellPreview,
} from "../golem/towerBells";
// FT-1051: the shared custom-audio machinery (one helper serving the bell
// AND the call-back), and the call-back's own preview.
import { probeAudioUrl, uploadAudioFile } from "../golem/customAudio";
import { toggleCallBackPreview } from "../golem/callBack";

// The four teams the setup table names, in the order every other surface in
// this app states them (the reading order of a composition, best to worst).
// Travellers are outside the table entirely — they sit beyond the base count
// and outside distribution maths — so they are not here.
const COMP_TEAMS = ["townsfolk", "outsider", "minion", "demon"];

export default {
  components: {
    ScriptPicker,
    RoleTray,
    RoleActions,
    NightModeRow,
    NumberScrub,
    OptionSelect,
  },
  // FT-1032: WHICH FACE this panel wears. False (the build face) is every
  // path that existed before; true is App's re-entry judgement — the durable
  // deal stash says a game is running in this town and the panel greets the
  // host with the day instead of the setup. App owns the flag because App
  // owns `building` and every transition that changes the answer.
  props: {
    reentry: { type: Boolean, default: false },
  },
  mounted() {
    // a fresh town opens at SEVEN chairs — the smallest non-Teensyville
    // game (5-6 is Teensyville; user call 2026-08-18). Deliberately NOT
    // gated on `reentry` (FT-1032): when the greeting face is up the local
    // roster died on the way here, and seeded chairs are what returning
    // players can claim back — an empty square offers them nothing.
    if (this.players.length === 0) this.setSeatCount(7);
  },
  watch: {
    // the HOST sees assignments as they land — while building, the first
    // assigned role flips the grimoire face-up (G still toggles freely)
    rolesAssigned(n) {
      if (n > 0 && this.grimoire.isPublic) this.$store.commit("toggleGrimoire");
    },
  },
  data() {
    return {
      // FT-888: the composition readout's static furniture
      COMP_TEAMS,
      TEAM_LABELS,
      // the picker's vault selection (officials read from the store)
      vaultPickedId: null,
      grimoireClosed,
      // FT-936: the row-mark art
      uiSeat,
      uiRole,
      uiScript,
      // FT-1098: the header's own mark — the TOWN's, not the script's.
      uiTown,
      // FT-847: owned-town rename state.
      renaming: false,
      renameDraft: "",
      townName: "",
      renameNote: "",
      // FT-959: the heading's own copy-link tick, local to this button —
      // the pill (App.vue's pillCopied) owns its own the same way.
      linkCopied: false,
      // games this town will have seen once the one being built ends
      // (finished games + this one). null while unknown — no server count
      // yet, or the fetch failed — and the template's gate is on that null,
      // not on 0: a wrong number reads worse than no number.
      gamesCount: null,
      // FT-1020: the tower rows' furniture, and a local snapshot of the
      // module's state (a plain module object is not reactive; the snapshot
      // is what Vue renders, refreshed on TOWER_EVENT by readTower).
      hourRows: [HOUR_OFF, ...HOUR_LAYERS],
      bells: TOWER_BELLS,
      tower: { ...towerState },
      // FT-1055: the Day length row's furniture — the scrub's bounds, and
      // what the scrub shows while Off (the last set length, so Timed
      // returns to it rather than to an arbitrary number).
      dayLenMin: DAY_LENGTH_MIN,
      dayLenMax: DAY_LENGTH_MAX,
      dayLenDraft: towerState.dayLengthMin || 10,
      // FT-1045: the custom bell's source row. The draft is what the field
      // shows (it may trail towerState.bellUrl while being typed); the state
      // is the quiet validation verdict ("", "checking", "bad", "ok").
      bellUrlDraft: towerState.bellUrl || "",
      bellUrlState: "",
      bellUploading: false,
      // FT-1051: the call-back's source row — same triplet, same rules.
      callUrlDraft: towerState.callUrl || "",
      callUrlState: "",
      callUploading: false,
    };
  },
  created() {
    this.loadTownName();
    this.loadGamesCount();
    // FT-1020: stand this town's remembered tower up (idempotent — FaceHands
    // does the same for a host who reloads mid-game and never passes through
    // this panel), then track its changes.
    loadTowerForTown(this.session.sessionId || "");
    this.readTower();
    window.addEventListener(TOWER_EVENT, this.readTower);
  },
  beforeDestroy() {
    window.removeEventListener(TOWER_EVENT, this.readTower);
  },
  computed: {
    // FT-1133: `chat` is here for `gameUnderway` alone — `chat.gameId` is the
    // town's current game, and the one reader in this app that answers "is a
    // game underway HERE" the same way on every client (see Player.vue's own
    // note under FT-1112 for why the two obvious alternatives are wrong).
    ...mapState(["edition", "session", "grimoire", "chat"]),
    ...mapState("players", ["players"]),
    /** FT-1133: is a game underway in this town — the same reader the seat
     *  lock uses, so the shuffle's warning and that lock can never disagree
     *  about when the game started. */
    gameUnderway() {
      return !!(this.chat && this.chat.gameId);
    },
    /** FT-847: the edit key when this hosted town is OURS (else falsy). */
    ownedKey() {
      return (
        !this.session.isSpectator &&
        this.session.sessionId &&
        editKeyFor(this.session.sessionId)
      );
    },
    claimedCount() {
      return this.players.filter((p) => p.id).length;
    },
    // ── FT-1087: the tower rows' option lists ────────────────────────────
    /** Off / Timed, the segment's own two positions and its own two
     *  tooltips. The VALUE is derived from the minutes, not stored: a day
     *  length of 0 IS Off, and always was — the segment read the same field
     *  the same way. */
    dayLengthOptions() {
      return [
        {
          value: "off",
          label: "Off",
          title: "No day length — the readout counts up and nothing tolls",
        },
        {
          value: "timed",
          label: "Timed",
          title: "The day gets a length — every readout counts down to it",
        },
      ];
    },
    /** THE MERGED BELL LIST — Off, then the bells themselves. TOWER_BELLS is
     *  still the only place the bells are named; Off is the `bellOn: false`
     *  the On/Off segment used to own, folded in at the head of the same
     *  list because it is the same question's fourth answer. */
    bellOptions() {
      return [
        {
          value: "off",
          label: "Off",
          title: "No bell — the day breaks silently",
        },
        ...this.bells.map((b) => ({
          value: b.id,
          label: b.short,
          title:
            b.label +
            " — picking it plays it for you; picking it again stops it",
        })),
      ];
    },
    /** Which option the merged list is on: Off whenever the bell is off, and
     *  the town's bell otherwise. The two fields keep their own meanings
     *  underneath — nothing about the sync or the storage changed. */
    bellChoice() {
      return this.tower.bellOn ? this.tower.bellId : "off";
    },
    /** The call-back's two voices, the segment's own wording. */
    callOptions() {
      return [
        {
          value: "default",
          label: "Default",
          title:
            "The summons that ships — picking it plays it for you; picking it again stops it",
        },
        {
          value: "custom",
          label: "Custom",
          title:
            "A sound of your own — picking it plays it for you; picking it again stops it",
        },
      ];
    },
    /** The heading's second line: finished games in this town plus the one
     *  being built now. "" (not "0 games") while gamesCount is unknown, which
     *  is the template's actual render gate. */
    gamesLine() {
      if (this.gamesCount === null) return "";
      return this.gamesCount === 1
        ? "Game 1 in this town"
        : `Game ${this.gamesCount} in this town`;
    },
    /** Spells out the count on hover, the same way seatsHint/compHint do for
     *  their own derived numbers. "" while gamesCount is unknown. */
    gamesHint() {
      if (this.gamesCount === null) return "";
      const finished = this.gamesCount - 1;
      return finished === 0
        ? "The first game in this town."
        : finished +
            (finished === 1
              ? " game finished here before this one."
              : " games finished here before this one.");
    },
    /** The heading's own tooltip: rename affordance plus — because the disc
     *  cap has no room for the games line as text (see the styles) — the
     *  same explanation `.ht-games` carries when there IS room for it. */
    headTitle() {
      const parts = [];
      if (this.ownedKey) parts.push("Rename your town");
      if (this.gamesHint) parts.push(this.gamesHint);
      return parts.length ? parts.join("\n") : null;
    },
    /** FT-1032: the greeting line's moment — TownInfo/FaceHands' own phase
     *  wording ("Day 3" / "Night 3"), Math.max clamp included: the dial's
     *  readouts and this line state the same fact and may never disagree. */
    phaseLine() {
      const night = this.grimoire.isNight;
      return (
        (night ? "Night " : "Day ") + Math.max(this.$store.state.night.day, 1)
      );
    },
    /** FT-1045: the source field's tooltip doubles as its quiet status. */
    bellUrlHint() {
      return this.sourceHint(this.bellUrlState, "bell One");
    },
    /** FT-1051: the call-back field's, same wording, its own fallback. */
    callUrlHint() {
      return this.sourceHint(this.callUrlState, "the default call");
    },
    /** Travellers sit beyond the base count and outside distribution math. */
    coreSeats() {
      return this.players.filter((p) => !p.role || p.role.team !== "traveler");
    },
    rolesAssigned() {
      return this.players.filter((p) => p.role && p.role.team).length;
    },
    /**
     * FT-888: what THIS MANY SEATS makes — the official setup table, read the
     * same way TownInfo's own composition line reads it, off the same file.
     *
     * Travellers are excluded from the lookup (the `nonTravelers` getter caps
     * at 15 for us), because they sit outside the composition. Under five
     * non-travellers the table has no row and this is null, which is the
     * template's gate: there is no official answer to state, so none is stated.
     */
    composition() {
      const n = this.$store.getters["players/nonTravelers"];
      return n >= 5 ? gameJSON[n - 5] : null;
    },
    /** The whole Seats row on hover — the claimed count included, because the
     *  disc folds the visible copy of it away for room (see the styles). */
    seatsHint() {
      const base =
        this.claimedCount +
        " of " +
        this.players.length +
        (this.players.length === 1 ? " seat" : " seats") +
        " claimed. Drag the number to change how many there are.";
      // FT-895: the range warning rides the row's tooltip as well as the line
      // under it — the same FOLD `.claimed` already makes on the disc, where
      // the band is too tight for every line to show at once. Two places, one
      // string, and the tooltip is the one that survives any layout.
      if (!this.seatWarn) return base;
      return (
        base +
        "\n\n" +
        this.seatWarn.reason +
        (this.seatWarn.plays ? " " + this.seatWarn.plays : "")
      );
    },
    /** The readout says what it IS on hover, because "5 2 3 1" beside a seat
     *  count could equally be read as what has been dealt — which is the row
     *  below's business, and the one thing this must not be mistaken for. */
    compHint() {
      return (
        "What " +
        this.$store.getters["players/nonTravelers"] +
        " seats makes — the script's composition at this size. " +
        "Roles actually assigned are on the Roles row."
      );
    },
    /**
     * FT-895: the loaded script as a LIST (state.roles is a Map, replaced
     * wholesale on every script change). Same two lines ScriptDrawer already
     * uses to read the same Map — not a new accessor.
     */
    scriptRoles() {
      const list = [];
      this.$store.state.roles.forEach((role) => list.push(role));
      return list;
    },
    /**
     * FT-895: the seat row's warning, or null when the count is fine.
     *
     * COUNTED ON `coreSeats`, NOT `players.length`, for two separate reasons.
     * Travellers sit outside the composition, so fifteen players plus five
     * travellers is twenty chairs and nothing is wrong with it. And the
     * `nonTravelers` getter — which the composition readout above uses — caps
     * itself at 15 by design, so it literally cannot report the overage this
     * line exists to name. `coreSeats` is the uncapped truth.
     */
    seatWarn() {
      return seatWarning(this.coreSeats.length, this.scriptRoles);
    },
    canRemoveSeat() {
      // The spinner never evicts: only an EMPTY seat can go.
      return this.players.some((p) => !p.id);
    },
    /** The shared picker's cards: officials, the vault shelf, the Almanac. */
    scriptCards() {
      const cards = editionJSON
        .filter((e) => e.isOfficial)
        .map((e) => ({
          id: e.id,
          name: e.name,
          icon: EDITION_ICONS[e.id] || edCustom,
          blurb: OFFICIAL_BLURBS[e.id] || "",
          source: "OFFICIAL",
        }));
      getRecents().forEach((s) => {
        cards.push({
          id: s.id,
          name: s.name || s.id,
          icon: edCustom,
          blurb: "",
          source: "Scripts",
        });
      });
      cards.push({
        id: "__almanac",
        name: "Scripts…",
        icon: edCustom,
        blurb: "Open the workbench — edit or forge a script",
        source: "",
      });
      return cards;
    },
    pickedScriptId() {
      if (this.vaultPickedId) return this.vaultPickedId;
      return this.edition.isOfficial ? this.edition.id : null;
    },
    /** FT-1095: the header's copy of the picked script's icon — found off
     *  `scriptCards` (the SAME list ScriptPicker itself renders from) keyed
     *  by the SAME `pickedScriptId` the picker's own trigger uses, so the
     *  header and the picker can never disagree about which mark is "the"
     *  script's. Falls back to the vault's plain mark for the one paint
     *  before a card list exists.
     *
     *  STOOD DOWN (FT-1098, user correction): the heading wears the town's
     *  own static mark now (`uiTown`, imported above), not this. Left in
     *  place per the house never-delete rule — the record of what "the
     *  script's icon, from the picker's own list" derives to is worth
     *  keeping even unread, and it is exactly the derivation a script-picker
     *  trigger elsewhere on this panel still wants. */
    headerScriptIcon() {
      const card = this.scriptCards.find((c) => c.id === this.pickedScriptId);
      return (card && card.icon) || edCustom;
    },
    canStart() {
      return (
        this.coreSeats.length > 0 &&
        this.coreSeats.every((p) => p.id) &&
        this.rolesAssigned >= this.players.length
      );
    },
    startHint() {
      if (!this.players.length) return "Add seats to begin.";
      if (!this.coreSeats.every((p) => p.id)) {
        const open = this.coreSeats.filter((p) => !p.id).length;
        return `Waiting on ${open} ${
          open === 1 ? "seat" : "seats"
        } to be claimed…`;
      }
      if (this.rolesAssigned < this.players.length)
        return "Assign roles (the shuffle) before starting.";
      return "Everyone seated and cast — deal the characters.";
    },
  },
  methods: {
    ...mapMutations(["toggleModal"]),
    // FT-888: golem/glyphs' team art, the same call TownInfo makes.
    teamGlyph,
    // ── FT-1020: the tower rows ──────────────────────────────────────────
    /** The tower changed — here, on the dial's anchor menu, or by a load. */
    readTower() {
      // FT-1045/FT-1051: follow an outside change of a source URL (a load,
      // another surface) unless the field holds an unsaved edit — a draft
      // only moves when it still agrees with what the module last knew.
      const bellBefore = this.tower.bellUrl;
      const callBefore = this.tower.callUrl;
      this.tower = { ...towerState };
      if (this.bellUrlDraft === (bellBefore || "") || !this.bellUrlDraft) {
        this.bellUrlDraft = this.tower.bellUrl || "";
      }
      if (this.callUrlDraft === (callBefore || "") || !this.callUrlDraft) {
        this.callUrlDraft = this.tower.callUrl || "";
      }
      // FT-1055: a set length is also the number Timed returns to after Off.
      if (this.tower.dayLengthMin > 0) {
        this.dayLenDraft = this.tower.dayLengthMin;
      }
    },
    /** One choice made: validate, persist for THIS town, tell the dial. */
    setTower(key, value) {
      setTowerField(this.session.sessionId || "", key, value);
    },
    /** FT-1055: the minutes scrubbed (or typed) — a length being set is a
     *  length wanted, so scrubbing while Off also turns the countdown on. */
    setDayLength(n) {
      this.dayLenDraft = n;
      this.setTower("dayLengthMin", n);
    },
    /** FT-1087: Off or Timed, off the row's select. Exactly what the two
     *  segment cells wrote — 0, or the draft the scrub is showing — so the
     *  "Timed returns to the last length you set" behaviour is unchanged. */
    setDayMode(v) {
      this.setTower("dayLengthMin", v === "timed" ? this.dayLenDraft : 0);
    },
    /** FT-1087: one pick off the merged bell list. Off is the On/Off
     *  segment's own write (`bellOn` false, `bellId` untouched, so the town
     *  keeps the bell it had) plus the silence a still-running preview
     *  deserves; anything else re-arms the bell and hands the id to
     *  `pickBell`, which owns the preview contract exactly as before. */
    pickBellChoice(v) {
      if (v === "off") {
        this.setTower("bellOn", false);
        stopBellPreview();
        return;
      }
      if (!this.tower.bellOn) this.setTower("bellOn", true);
      this.pickBell(v);
    },
    /** FT-1052: is a segment cell's check on? Off is DERIVED — on exactly
     *  when none of the three layers are.
     *  (FT-1055: STOOD DOWN with the panel's display segment — the live
     *  surface is Menu.vue's hourglass tab; kept per never-delete.) */
    hourChecked(id) {
      const t = this.tower;
      const flags = {
        clock: t.hourClock,
        digital: t.hourDigital,
        numerals: t.hourNumerals,
      };
      if (id === "off") return hourAllOff(flags);
      return !!flags[id];
    },
    /** One layer toggled (or Off clearing all three). This is the host's
     *  surface, so the toggle always writes the TOWN's flags.
     *  (FT-1055: STOOD DOWN — see hourChecked above.) */
    toggleHour(id) {
      toggleHourLayer(this.session, id);
    },
    /** Hear the pick before the town does. The click is itself the gesture
     *  the browser's autoplay rule wants, so this also unlocks the bell for
     *  the storyteller's own day-starts. */
    listenBell() {
      previewBell(
        this.tower.bellId,
        this.tower.bellVolume,
        this.grimoire.isMuted,
      );
    },
    /** FT-1045: picking a bell also PLAYS it, right here, local only —
     *  clicking the one still tolling stops it instead (these clips run
     *  12-17s; a second click almost always means "enough"). Custom with no
     *  source yet just opens its row — there is nothing to play. */
    pickBell(id) {
      this.setTower("bellId", id);
      if (id === "custom" && !this.tower.bellUrl) return;
      toggleBellPreview(id, this.tower.bellVolume, this.grimoire.isMuted);
    },
    /** FT-1051: picking the call-back's voice also PLAYS it, locally —
     *  the same stop-on-second-click contract the bells carry. Custom with
     *  no source yet just opens its row. */
    pickCall(id) {
      this.setTower("callId", id);
      if (id === "custom" && !this.tower.callUrl) return;
      toggleCallBackPreview(this.grimoire.isMuted);
    },
    /** The two source fields' shared tooltip wording (bellUrlHint /
     *  callUrlHint above name their own fallback). */
    sourceHint(state, fallbackName) {
      if (state === "bad")
        return `That link would not load as audio — an unplayable source is not kept (and the town would fall back to ${fallbackName})`;
      if (state === "checking") return "Checking the link…";
      return "Link to a sound file — every player's browser fetches it from here";
    },
    /** What the storyteller should hear after a source lands — the exact
     *  sound the town will get for that surface. */
    previewSource(which) {
      if (which === "bell") {
        toggleBellPreview(
          "custom",
          this.tower.bellVolume,
          this.grimoire.isMuted,
        );
      } else {
        toggleCallBackPreview(this.grimoire.isMuted);
      }
    },
    /** FT-1045/FT-1051: a link committed (change/Enter) on either source
     *  row. Validated by loading it as audio before it is kept — a link
     *  that will not play wears the quiet failure state and never reaches
     *  the town. `which` is "bell" or "call". */
    async commitSourceUrl(which) {
      const draftKey = which + "UrlDraft";
      const stateKey = which + "UrlState";
      const field = which + "Url";
      const url = this[draftKey].trim();
      if (!url) {
        this[stateKey] = "";
        this.setTower(field, "");
        return;
      }
      this[stateKey] = "checking";
      const ok = await probeAudioUrl(url);
      // a slow probe finishing after the draft moved on says nothing
      if (this[draftKey].trim() !== url) return;
      if (!ok) {
        this[stateKey] = "bad";
        return;
      }
      this[stateKey] = "ok";
      this.setTower(field, url);
      this.previewSource(which);
    },
    /** FT-1045/FT-1051: a sound file becomes a link — the platform's asset
     *  store takes the bytes and the returned URL syncs like any other. */
    async uploadSource(which, ev) {
      const file = ev.target.files && ev.target.files[0];
      ev.target.value = "";
      const busyKey = which + "Uploading";
      if (!file || this[busyKey]) return;
      this[busyKey] = true;
      try {
        const url = await uploadAudioFile(
          file,
          which === "bell" ? "botc_bell" : "botc_call",
        );
        this[which + "UrlDraft"] = url;
        this[which + "UrlState"] = "ok";
        this.setTower(which + "Url", url);
        this.previewSource(which);
      } catch (e) {
        flashHint(e.message || "The upload failed.");
      }
      this[busyKey] = false;
    },
    // ── FT-847: owned-town rename ────────────────────────────────────────
    loadTownName() {
      const id = this.session.sessionId;
      const entry = id && listTowns().find((t) => t.id === id);
      this.townName = (entry && entry.name) || id || "";
    },
    /** Best-effort, like every golem call here: an unreachable server just
     *  leaves gamesCount null and the heading's second line stays blank. */
    async loadGamesCount() {
      const id = this.session.sessionId;
      if (!id) return;
      try {
        const stats = await townStats(id);
        this.gamesCount = (stats.games || 0) + 1;
      } catch (e) {
        // no line beats a wrong line
      }
    },
    /** FT-959: copy the town link, next to its name — the pill's own
     *  copyPillLink (App.vue), reached the same way `start()`/`pickScript()`
     *  already reach Menu.vue below. Not a second copy routine: the URL is
     *  built once, in Menu's own `copySessionUrl`. */
    copyTownLink() {
      this.$parent.$refs.menu.copySessionUrl();
      this.linkCopied = true;
      setTimeout(() => {
        this.linkCopied = false;
      }, 1500);
    },
    startRename() {
      if (!this.ownedKey) return;
      this.renameDraft = this.townName;
      this.renaming = true;
      this.renameNote = "";
      this.$nextTick(() => {
        if (this.$refs.rename) this.$refs.rename.focus();
      });
    },
    async commitRename() {
      if (!this.renaming) return; // esc already cancelled; blur follows
      this.renaming = false;
      const name = this.renameDraft.trim();
      if (!name || name === this.townName) return;
      try {
        const town = await updateTown(this.session.sessionId, { name });
        this.townName = town.name;
        this.renameNote = "renamed";
      } catch (e) {
        this.renameNote = "rename failed — server unreachable?";
      }
      setTimeout(() => {
        this.renameNote = "";
      }, 3000);
    },
    addSeat() {
      if (this.players.length >= 20) return;
      this.$store.commit("players/add", `Seat ${this.players.length + 1}`);
    },
    /** Walk the roster to a target count. Shrinking only takes EMPTY
     *  chairs (claimed seats never leave this way). */
    setSeatCount(n) {
      const want = Math.max(0, Math.min(20, Math.round(n) || 0));
      let guard = 25;
      while (this.players.length < want && guard--) this.addSeat();
      while (this.players.length > want && this.canRemoveSeat && guard--)
        this.removeSeat();
    },
    removeSeat() {
      // remove the LAST empty seat; claimed chairs are a targeted act only
      for (let i = this.players.length - 1; i >= 0; i--) {
        if (!this.players[i].id) {
          this.$store.commit("players/remove", i);
          return;
        }
      }
    },
    /** DEV: shift-click the claimed count — every empty chair gets a fake
     *  player, so a full game can start solo (pair with shift-Start). */
    devFillSeats() {
      this.players.forEach((p, i) => {
        if (!p.id) {
          this.$store.commit("players/update", {
            player: p,
            property: "id",
            value: "dev-" + (i + 1),
          });
          this.$store.commit("players/update", {
            player: p,
            property: "name",
            value: "Fake " + (i + 1),
          });
        }
      });
    },
    /** DEV shift-Start's own route to the dealer — the identical tree-walk
     *  RoleActions' own `withDrawer` uses (found by component name from
     *  `$root`, since the drawer is always mounted whether its sheet is open
     *  or not — see App.vue). Reusing the WALK rather than reimplementing
     *  Deal: the only dealer is `RoleDrawer.assignRandomly`. */
    withDrawer(fn) {
      const find = (c) =>
        c.$options.name === "RoleDrawer"
          ? c
          : c.$children.reduce((a, x) => a || find(x), null);
      const drawer = find(this.$root);
      if (drawer) fn(drawer);
    },
    /** Apply a pick in place — no modal unless the Almanac card is chosen. */
    pickScript(card) {
      if (card.id === "__almanac") {
        this.toggleModal("edition");
        return;
      }
      const ed = editionJSON.find((e) => e.id === card.id);
      if (ed) {
        this.$store.commit("setEdition", ed);
        this.vaultPickedId = null;
        return;
      }
      this.vaultPickedId = card.id;
      const modal = this.$parent.$refs.edition;
      if (modal) modal.loadFromVault(card.id);
    },
    // FT-847 follow-up: relocated from the retired Players toolbar tab.
    // No confirm: shuffling seats during setup is the point of the button,
    // and it is undone by pressing it again. (user call 2026-08-18)
    //
    // FT-1133: ...and that user call is about SETUP, which is left exactly as
    // it was — confirm-free, one click, press it again to re-roll. What earns
    // a question is pressing it AFTER the deal, and only then.
    //
    // WARNED, NOT REFUSED. FT-1112 froze the seating mid-game for PLAYERS and
    // deliberately left the storyteller's own arrangement tools free; refusing
    // here would be the first time this fork takes the table away from the
    // person whose table it is. But a shuffle is indiscriminate by definition
    // — you cannot shuffle toward an outcome you wanted — so the only reason
    // to press it mid-game is that you meant the other button, and the cost of
    // that misclick is every character in the game changing hands at once.
    // A dialog turns a one-click accident into a decision, and says the one
    // consequence in the words it actually happens in. The storyteller who
    // means it still gets it, and the wire is correct when they do
    // (socket.js's reseatPlayers) — the dialog is the manners, not the rule.
    randomizeSeatings() {
      if (this.players.length <= 2) return;
      if (
        this.gameUnderway &&
        !confirm(
          "The game is underway. Shuffling now moves the players only — " +
            "every character stays on its own chair, so everyone ends up " +
            "holding whoever's character they sit down in front of. " +
            "Shuffle anyway?",
        )
      ) {
        return;
      }
      this.$store.dispatch("players/randomize");
    },
    clearAllPlayers() {
      if (!this.players.length) return;
      if (confirm("Are you sure you want to remove all players?")) {
        if (this.session.nomination) {
          this.$store.commit("session/nomination");
        }
        this.$store.commit("players/clear");
      }
    },
    start(e) {
      // DEV (user call 2026-08-18, extended 2026-08-19): shift-click START is
      // the ONE dev gesture — from an untouched town it now does the whole
      // run: fill every empty chair (devFillSeats, below), deal the script
      // into them (RoleDrawer's own assignRandomly, reached the same way
      // RoleActions reaches it — see withDrawer above; there is no second
      // dealer), then start. It used to require roles already dealt before
      // it would so much as fill a seat, which is why it looked dead from a
      // fresh town — the shift bypass was only ever waiving the CLAIM gate,
      // never the deal itself.
      //
      // Fill before deal: dealing hands roles to the chairs that exist.
      if (e && e.shiftKey) {
        if (!this.players.length) {
          flashHint("No seats to fill.");
          return;
        }
        this.devFillSeats();
        if (this.rolesAssigned < this.players.length) {
          this.withDrawer((d) => d.assignRandomly());
        }
        if (this.rolesAssigned < this.players.length) {
          // The script can't cast every seat — too few characters on a team,
          // or (above 15 non-traveler seats) more chairs than the composition
          // table even has a row for. Say so instead of a Start that looks
          // like it did nothing.
          flashHint(
            "The script can't cast every seat — add characters or remove seats.",
          );
          return;
        }
        this.$parent.$refs.menu.distributeRoles();
        return;
      }
      if (!this.canStart) {
        // The button explains itself instead of doing nothing.
        if (
          this.rolesAssigned < this.players.length &&
          this.coreSeats.every((p) => p.id)
        ) {
          this.toggleModal("roles");
        }
        return;
      }
      this.$parent.$refs.menu.distributeRoles();
    },
  },
};
</script>

<style scoped lang="scss">
// the team colours the composition readout wears
@import "../vars.scss";
// FT-888: the clock face's disc — geometry, gate and material, shared with the
// night checklist and the two entry panels.
@import "../faceDisc.scss";
// 2026-08-19: the panel's ONE control plate — the ground, edge and radius the
// script picker has always worn, now worn by every control on the panel. See
// src/controls.scss for the six near-miss treatments it replaced.
@import "../controls.scss";

.host-tools {
  position: absolute;
  // FT-888: 19, MATCHING THE NIGHT CHECKLIST. These two are the same object in
  // the same slot — the plate in the middle of the clock face — and the
  // checklist has always stood at 19 while this stood at 3. The seats' own
  // list items are 11, so the pair disagreed about the one thing they had to
  // agree on: at 1280x800 the ring is tighter than the panel is wide and the
  // seats' name plates painted straight through "Build the town" (visible in
  // the FT-888 before-shot, so this is not new). Only the plates reach that far
  // in — the coins, which are what a role is dragged onto, sit outside the
  // panel at every size.
  z-index: 19;
  text-align: center;
  padding: 15px 25px;
  // the dial behind it is busy — the panel needs to win (user call)
  background: rgba(0, 0, 0, 0.8);
  border: 3px solid black;
  border-radius: 10px;
  box-shadow: 0 0 10px black;

  // The panel is as tall as its contents and had no relationship to the
  // window, so on a landscape phone it stood 437px tall in a 375px window:
  // the heading was cut off the top and "Start game" off the bottom, with no
  // way to scroll to either (measured 812x375, 2026-08-18). Bounding it to
  // the window and letting the overflow scroll costs nothing on a screen big
  // enough to hold it, where neither cap binds.
  max-height: calc(100vh - 20px);
  // FT-888: AND A CAP OF ITS OWN, because this panel has no width — it is
  // shrink-to-fit around its widest row, and the Seats row just gained the
  // composition readout. Measured at 1280x800: that took the rectangle from
  // 415px to 506px, and the rectangle stands INSIDE the ring, where 90px of
  // extra width is 90px further under the seats. 420px is where it has always
  // sat (the character tray's own 336px plus its padding is what set it), so
  // the cap holds the footprint the ring was arranged around and the Seats row
  // takes a second line instead — see `.row`'s wrap below.
  //
  // The two phone sheets and the disc all set `max-width: none` after this, and
  // must keep doing so: on a phone the panel IS the width of the screen, and a
  // disc is the width of the face.
  max-width: min(calc(100vw - 20px), 420px);
  overflow-y: auto;
  // a phone drags the whole page when an inner list runs out of scroll
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;

  // FT-888: the band wrapper is INVISIBLE to the layout everywhere except the
  // disc — `display: contents` generates no box at all, so the rectangle and
  // both phone sheets place its children exactly where they were.
  .ht-body {
    display: contents;
  }

  // PORTRAIT PHONE: the panel stops being a plate in the middle of the ring
  // and becomes the bottom half of the screen.
  //
  // Centred, it and the ring want the same 340-odd pixels: the panel is as
  // wide as the ring is across, so on a 375px screen the seats drew straight
  // through the script picker and the character tray. Stacked, both fit — the
  // ring takes the top of the window (see TownSquare's matching rule) and this
  // takes the bottom, with its own scroll for the tray.
  @media (pointer: coarse) and (orientation: portrait) {
    position: fixed;
    left: 6px;
    right: 6px;
    // clear of the session pill, which is pinned to the bottom-right at a far
    // higher z-index — docked flush, the panel put "Start game" underneath it
    bottom: 58px;
    max-width: none;
    max-height: 48vh;
    padding: 10px 14px;
    // it is over the town now, not floating in the middle of it
    background: rgba(0, 0, 0, 0.93);
    // (the tray drops its own inner scroll here so the panel is the only
    //  scroller — that rule lives in RoleTray, which owns those styles)

    // The sheet scrolls, and the one control the whole panel exists to reach
    // was the last thing in it — so on a phone "Start game" sat below the fold
    // of a scroller with nothing to say so. Button and reason ride the bottom
    // edge instead, and the rest of the panel scrolls underneath them. The
    // reason has to come along: it is a `title` everywhere else, and a touch
    // screen cannot raise a tooltip to ask why the button is grey.
    .start-dock {
      position: sticky;
      bottom: -10px;
      z-index: 1;
      // its own ground, and OPAQUE — at the sheet's own 0.93 the character
      // icons scrolling behind it showed straight through the button. This is
      // what 0.93 black composites to over the sheet's art anyway.
      background: #0a0a0c;
      padding-bottom: 4px;
      margin: 0 -14px;
    }
    .start {
      margin-top: 6px;
    }
  }

  // LANDSCAPE PHONE: the same problem turned on its side, and the same answer.
  // Centred, the panel and the ring overlap just as badly as they do in
  // portrait — the seats drew across the script picker and the tray. Here
  // there is width to spare and no height, so the pair sit side by side: the
  // ring keeps the left of the window (TownSquare's matching rule) and the
  // panel takes a column down the right.
  @media (pointer: coarse) and (orientation: landscape) and (max-height: 500px) {
    position: fixed;
    right: 6px;
    // clear of the two pieces of chrome that share this corner and outrank it:
    // the script/vote strip above, the session pill below. Flush, the pill sat
    // on "Start game" and the strip on the heading.
    top: 46px;
    bottom: 50px;
    left: auto;
    width: 42vw;
    // the tray needs eight 34px characters to a row before it wraps
    min-width: 330px;
    max-width: none;
    max-height: none;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.93);

    .start-dock {
      position: sticky;
      // flush, not overhanging — the reason line under the button is the last
      // thing in the panel and a negative offset clipped it
      bottom: 0;
      z-index: 1;
      background: #0a0a0c;
      margin: 0 -12px;
    }
    .ht-head {
      margin-bottom: 4px;
    }
  }

  // A DRAWER IS OUT: the panel stands down (2026-08-18, both orientations).
  //
  // On a phone every drawer is a bottom sheet at 52vh and this panel is a
  // bottom sheet at 48vh — the same edge, the same half of the screen, and
  // both up at once is the whole window with no ring left. Turned on its side
  // they want the same right-hand column instead, which is the same argument.
  //
  // The DRAWER wins because the user just reached for it, and the panel comes
  // straight back when it closes: `sheet-up` is a class on #app, so this is a
  // repaint, not a state change. Nothing about the town being built is lost —
  // and the grimoire sheet does this panel's own job while it is up, so on a
  // phone the two are alternatives rather than a pair.
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

  // the heading wrapper — see the template comment for why it exists at all.
  .ht-head {
    margin-bottom: 8px;
  }

  // FT-1032: THE GREETING LINE — the re-entry face's one statement, under
  // the town's name. Brighter than the panel's 0.6 `small` idiom (this line
  // IS the face's content, not an aside), quieter than the heading; the
  // letter-spacing is `.start`'s own, so the face's statement and its button
  // read as one voice.
  .ht-running {
    margin: 2px 0 6px;
    font-size: 95%;
    letter-spacing: 1px;
    opacity: 0.85;
  }

  // FT-1032: the greeting face's second door — a clickable hint, styled as
  // the hint it is (the face must not read as two rival buttons; re-entering
  // is the act, rebuilding is the aside).
  .ht-rebuild {
    cursor: pointer;
    &:hover {
      color: red;
      opacity: 1;
    }
  }

  // FT-1098 (user correction): "the name sits left of the disc's axis". A
  // flex row's `justify-content: center` centres the WHOLE h3 BOX (icon +
  // name + button) as one unit, and — measured — that box's own centre WAS
  // exactly on the disc's (0.0px off at all four widths below). The name's
  // own text run inside it was not: the icon (`.ht-town-icon`, 1.15em, ~31px
  // on the disc) and the copy-link button (`.ht-copy-link`, font-size 55% of
  // that, ~15-17px) are not the same width, so the run sat off the box's own
  // centre by half their difference — measured onto the disc's axis as an
  // 8.1px offset, constant across every width tested (a fixed em-vs-button
  // gap, not something that grows with the panel). RIGHT of axis by the raw
  // number, not left — a bigger left-hand icon pushes the row's total width
  // out further on the left than the button balances on the right, so the
  // fixed-width run after it lands right of centre — but a few pixels either
  // way reads the same to an eye scanning a whole panel, and the fix removes
  // the offset outright rather than arguing its sign. Measured (7 seats,
  // rig: `claude_temp_test/2026-08-23-ft1098-measure{,-before-only}.mjs`,
  // `disc centre` = `.host-tools`'s own box centre, the point `--face-cx`
  // and its dial actually place):
  //
  //                        disc centre   h3 box centre   name-run centre
  //   before  rect 1280         640.0           640.0             648.1
  //   before  disc floor        812.0           812.0             820.1
  //   before  disc 1920         951.0           951.0             959.1
  //   before  disc 2560        1271.0          1271.0            1279.1
  //   after   every width tested: disc / h3 box / name-run all equal, 0.0px apart
  //
  // A THREE-COLUMN GRID fixes the axis structurally rather than by eye: the
  // two flanking columns are pinned to the SAME width (the icon's own
  // 1.15em, wide enough to hold the smaller button too), so the middle
  // column is the only one free to size to its content — centring it
  // centres the town's name itself, not a lopsided box built around it.
  h3 {
    margin: 0;
    display: grid;
    grid-template-columns: 1.15em auto 1.15em;
    align-items: center;
    justify-items: center;
    column-gap: 8px;
    cursor: default;

    // only an OWNED town can be renamed — the pencil and the pointer both
    // say so, same affordance the old Town row's `.value` wore.
    &.owned {
      cursor: pointer;
      &:hover {
        color: red;
      }
    }
  }

  // FT-1095: THE TOWN'S MARK, immediately left of its name. `em`, NOT A
  // FIXED PIXEL — the h3 this rides in front of is NOT one size: 26.96px on
  // the desktop disc (`--fpx` scaling) against 11.98px on a phone (measured,
  // both at 7 seats — `claude_temp_test/2026-08-23-ft1095-fontcheck.mjs`), a
  // 2.25x spread the header text itself already lives with. A flat 28px
  // (what the script picker's own trigger icon wears, ScriptPicker.vue's
  // `.icon`) matched the disc and swamped the phone — the name stopped
  // being the header's focus there. 1.15em keeps the SAME ratio to the name
  // at both ends instead of the same pixel count at one of them, and it is
  // close to the picker's own 30px at the disc's own size (26.96 * 1.15 =
  // 31px) — the two read as kin without literally sharing a constant.
  .ht-town-icon {
    width: 1.15em;
    height: 1.15em;
    object-fit: contain;
    flex-shrink: 0;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
  }

  // FT-959: COPY THE TOWN LINK, next to its name. Styled BARE — no
  // `control-icon-btn` plate — because the pill (App.vue) already does this
  // exact job as a plain icon with `cursor: pointer` and a red hover, no box
  // of its own (see `.copylink` there), and this is the same control in a
  // second place: matching its look is what makes the two read as "the same
  // button" rather than as two different affordances that happen to copy the
  // same thing. A plate here would also fight the heading — a heavy 34x30 box
  // beside a serif town name reads as chrome bolted onto a title, not as
  // part of it.
  .ht-copy-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 0;
    padding: 0;
    margin: 0;
    color: inherit;
    font-size: 55%;
    opacity: 0.65;
    cursor: pointer;
    transition:
      color 150ms,
      opacity 150ms;

    &:hover {
      color: red;
      opacity: 1;
    }
    &:focus-visible {
      @include control-focus-ring;
    }

    // a fingertip needs more than a bare 12px glyph — an invisible pad
    // centred on it, the same trick NumberScrub's own "seat" preset uses for
    // its drag handle on a phone, rather than growing the visible glyph.
    @media (pointer: coarse) {
      position: relative;
      &::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
      }
    }
  }

  // the games-played line and the transient rename note — both plain small
  // text under the name, matching `.row small`'s own opacity.
  .ht-games,
  .ht-rename-note {
    display: block;
    margin-top: 2px;
    opacity: 0.6;
    font-size: 80%;
  }

  // the rename box itself: `.row input`'s styling, centred instead of
  // flex-grown since it now stands alone rather than beside a label. It was
  // already the shared plate to the pixel — one of the two places that proved
  // the plate was the panel's house style rather than a new look — so it reads
  // the mixin now and nothing about it moves.
  .ht-rename-input {
    @include control-plate;
    width: 100%;
    max-width: 260px;
    text-align: center;
    color: white;
    padding: 4px 8px;
    font-size: 90%;
    outline: none;

    &:focus {
      @include control-plate-hover;
    }
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    // FT-888: a safety valve, not a layout. Every row still sits on one line
    // wherever it fits; the Seats row, now carrying the composition, takes a
    // second one at the widths where it does not — which beats the alternative
    // of running its last control out past the panel's edge.
    flex-wrap: wrap;
    gap: 14px;
    min-height: 34px;

    // FT-959: THE TWO CLUSTERS (Seats and Roles rows both use this shape —
    // see the template comments by each). `.row` keeps `space-between` from
    // above, but now splits it between exactly two flex children instead of
    // five/three, so all the freed width from the FT-936 mark shrink lands as
    // ONE gap between the clusters instead of being spread thin across every
    // pair of items. Measured, 7 seats (rig: `claude_temp_test/
    // 2026-08-20-ft959-measure.mjs`, before/after JSON alongside it):
    //
    //   scrub → composition gap (Seats)   50.8 / 35.7 / 61.6px -> 10px flat
    //   mark → value gap (Roles)          28.4 / 48.1 / 86.9px ->  8px flat
    //     (1280x800 rect / 1642x780 disc floor / 1920x1080 disc, in order)
    //
    // Both clusters stay flush to the row's own edges (space-between's own
    // job, unchanged) — what moved is how the MIDDLE reads: two tight objects
    // and a deliberate gap between them (now the row's ONE remaining slack,
    // e.g. Roles' mark+value-to-actions gap grew to 42.7 / 82.2 / 159.7px),
    // not five items adrift at whatever spacing the row's leftover width
    // happened to produce.
    .ht-seat-lead,
    .ht-role-lead {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .ht-seat-trail {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    // THE SHARED PLATE — see the template comment on `.ht-seat-readout` for
    // why a plate (this app's own "these read as one control" vocabulary,
    // `controls.scss`) rather than a connective glyph. Padding is a shade
    // tighter than the picker/rename-input's own 4px/8px: this plate holds a
    // single bold digit and a row of small stats, not a full-width control.
    .ht-seat-readout {
      @include control-plate;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 3px 10px;
    }
    // Roles' own value keeps its EXISTING look (no plate) — see the template
    // note on why the two rows differ here: the Seats plate ties a number to
    // a DERIVED readout; "0 / 7 assigned" is one fact, not two, and already
    // reads fine as plain text beside its mark, unchanged.

    // FT-936: A MARK, NOT A WORD (user call: icons instead of text labels).
    // 55px was sized for the word "Seats"/"Script"/"Roles"; a 22px mark needs
    // far less, and the freed width is pure slack for the row (never a cost —
    // every wrap threshold documented elsewhere in this file assumed the wider
    // box). Left-aligned, same edge the text always sat on.
    // FT-1100: …AND THE BOX GOES TOO. 30px was the mark era's own first cut at
    // "less than the 55px the word needed"; the marks that actually landed are
    // 22px baked art and 18px Font Awesome glyphs, so this box carried 8-12px
    // of blank on the right of EVERY row on the panel — the "huge amount of
    // padding" the storyteller could see on the settings lines (measured at the
    // disc floor: the bell's lead spent 30px of a 403.4px band on an 18px
    // glyph). `auto` hugs the mark. Nothing moves: every mark is the FIRST
    // thing in its row and they all still start on the same left edge — the box
    // only ever ended somewhere the eye could not see.
    .label {
      opacity: 0.7;
      width: auto;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    // THE MARK ITSELF. Sized and drop-shadowed like `.team-glyph` two rows
    // down — the one image already living inline in a row in this file — so
    // the new marks read as kin to it rather than inventing a second recipe.
    .row-mark {
      width: 22px;
      height: 22px;
      object-fit: contain;
      display: block;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
    }
    // THE SCRIPT MARK IS THE ONE ASSET THAT DOES NOT BAKE WARM (see the
    // template note by its <img>). ui-script.png is shared with Menu.vue's
    // top strip, so it is not re-baked; this filter warms ONLY this instance,
    // tuned against the live render (sepia/saturate/hue-rotate/contrast) to
    // land its mean opaque RGB within ~2 units of the warm family's own
    // (154, 146, 133) — close enough that the row reads as one set rather
    // than three warm marks and one cool outlier.
    .ht-script-mark {
      filter: sepia(0.5) saturate(2.5) hue-rotate(-5deg) brightness(1.9)
        contrast(0.3) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
    }

    // ── FT-1020: the tower rows ──────────────────────────────────────────
    // The two marks are Font Awesome glyphs, not baked art — there is no
    // clock or bell in the fork's own set yet (the FT-880 note on BellSlash
    // says the same). Inked in the warm family's own mean (154, 146, 133)
    // and drop-shadowed like `.row-mark`, so they stand in the same line.
    .row-mark-fa {
      width: 18px;
      height: 18px;
      color: rgb(154, 146, 133);
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
      // FT-1100: AND THE WIDTH HAS TO WIN. Font Awesome injects its own
      // stylesheet at RUNTIME, after this file's, and it carries
      // `.svg-inline--fa.fa-w-16 { width: 1em }` — two classes against this
      // rule's one, so `width: 18px` above has never applied. The glyphs were
      // painting 30px wide and 18px tall, with the ink drawn 18x18 in the
      // middle of that box (preserveAspectRatio) and 6px of nothing on each
      // side. Matching its two classes here takes the width back without an
      // `!important` and without touching the ink: the mark is exactly as big
      // as it always looked.
      &.svg-inline--fa {
        width: 18px;
        height: 18px;
      }
    }
    // mark + select as ONE cluster, so the row's space-between spends its
    // slack in a single gap — the FT-959 lesson the Seats and Roles rows
    // both already carry.
    // FT-1087 had each cluster take HALF the row (`flex: 1 1 0`) so the two
    // sounds' selects met in the middle and both ended on an edge — the
    // row's slack was spent inside the controls instead of between them.
    // FT-1088 UNDOES THAT: a select no longer grows to fill whatever it is
    // given (OptionSelect.vue), so a cluster that still claimed half the row
    // would just be dead space trailing a content-width select. `flex: 0 1
    // auto` lets each cluster size to its own mark+select instead, and the
    // ROW's own space-between goes back to spending the slack as ONE gap
    // between clusters — the day-length row (mark+select vs. minutes) and
    // the sounds row (bell cluster vs. call-back cluster) both read that way
    // now, the same shape Seats/Roles have always used.
    // FT-1100: 8px -> 6px. INSIDE a cluster is now tighter than BETWEEN
    // clusters (the row's own 8px on the disc), which is the hierarchy the
    // cluster shape was always claiming — a mark and its control are one
    // object, two clusters are two.
    .tw-lead {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 0 1 auto;
      min-width: 0;
    }
    // the panel's shared segment — NightModeRow's `.nm-seg`/`.nm-opt`
    // restated, because scoped CSS cannot reach across components and the
    // mixins in controls.scss exist precisely so the restatement is two
    // includes rather than a recipe
    // ── FT-1087: `.tw-seg` / `.tw-opt` ARE STOOD DOWN ────────────────────
    // The Day-length, bell and call-back segments are selects now (see the
    // template notes on each row), so this panel renders neither class any
    // more. LEFT IN PLACE, not removed — the house rule is never to delete on
    // the way past, and the FT-1055 display segment's own methods stand down
    // in this same file the same way. The record of what a segment was is
    // also the record of what OptionSelect's plate inherited.
    .tw-seg {
      @include control-plate;
      display: inline-flex;
      overflow: hidden;
      flex: 0 0 auto;
    }
    .tw-opt {
      @include control-cell;
      font-size: 80%;
      padding: 3px 6px;
      &:hover {
        color: #ff8a8a;
      }
      &.on {
        background: $control-on-bg;
        font-weight: bold;
      }
      @media (pointer: coarse) {
        min-height: 40px;
        padding: 0 10px;
      }
    }
    // FT-1055: the Day length's minutes — the shared NumberScrub beside its
    // unit word, dimmed while Off (the number is what Timed would return
    // to; scrubbing it is itself the "on" gesture, so it stays live).
    .tw-daylen {
      display: inline-flex;
      align-items: baseline;
      gap: 4px;
      &.idle {
        opacity: 0.45;
      }
    }
    .tw-daylen-unit {
      font-size: 75%;
      opacity: 0.7;
    }
    // the volume scrub and the listen button, together on the row's right
    .tw-bell-trail {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    // FT-1045: the custom bell's source row — the field takes the slack the
    // segments leave, wearing the same control plate the segments wear.
    .tw-custom .tw-lead {
      flex: 1 1 auto;
      min-width: 0;
    }
    .tw-url {
      @include control-plate;
      flex: 1 1 auto;
      min-width: 0;
      color: inherit;
      font-family: inherit;
      font-size: 80%;
      padding: 4px 8px;
      border: 0;
      outline: 0;
      &::placeholder {
        color: rgba(255, 255, 255, 0.35);
      }
      // the quiet failure state: the link would not load as audio
      &.bad {
        box-shadow: inset 0 0 0 1px rgba(255, 70, 70, 0.55);
        color: #ff8a8a;
      }
    }
    .tw-upload {
      cursor: pointer;
      &.busy {
        opacity: 0.4;
        pointer-events: none;
      }
    }
    .stepper {
      display: flex;
      align-items: center;
      gap: 10px;
      // FT-874: the scrub/type-in box itself (the "one footprint" rule) now
      // lives in NumberScrub.vue's own scoped style, under its "seat" preset
      // — this row just sizes and positions the component like any other
      // flex child (`.seat-scrub-ctl` below).
      .seat-scrub-ctl {
        vertical-align: middle;
      }
      .row-book {
        width: 20px;
        height: 20px;
        vertical-align: middle;
      }
      svg {
        cursor: pointer;
        &:hover {
          color: red;
        }
        &.disabled {
          opacity: 0.3;
          pointer-events: none;
        }
      }
    }
    // FT-888: WHAT THIS MANY SEATS MAKES. The same treatment TownInfo's own
    // composition line wears — team-coloured digit, the fork's team glyph, a
    // glow in the team's colour behind it — because it is the same readout in
    // a second place, not a new one.
    //
    // ONE THING IS DIFFERENT AND IT IS THE SPACING. TownInfo's stats stand on
    // the open clock face and can afford a 10px lane after every glyph; this
    // one shares a 34px row with a label, a scrub, a claimed count and a
    // shuffle, and on the disc that row is only ~345px wide. So the pairs sit
    // tight (4px inside a pair, 7px between pairs) and the glyph carries no
    // trailing margin. The TYPE is untouched — the counts read at the row's own
    // size; shrinking digits to buy room is how a readout becomes decoration.
    .ht-comp {
      display: flex;
      align-items: center;
      gap: 7px;
      flex-shrink: 0;
      // it is a consequence of the number to its left, not a control — a shade
      // back from the row's own weight, the way `small` already is here
      font-size: 92%;
      cursor: help;

      .stat {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
      }
      .team-glyph {
        // sized to the type it rides beside, so it tracks the row instead of
        // being pinned to a pixel size — TownInfo's own rule
        width: 1.05em;
        height: 1.05em;
        object-fit: contain;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.95));
      }
      .townsfolk {
        color: $townsfolk;
        .team-glyph {
          filter: drop-shadow(0 0 4px rgba($townsfolk, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
      }
      .outsider {
        color: $outsider;
        .team-glyph {
          filter: drop-shadow(0 0 4px rgba($outsider, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
      }
      .minion {
        color: $minion;
        .team-glyph {
          filter: drop-shadow(0 0 4px rgba($minion, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
      }
      .demon {
        color: $demon;
        .team-glyph {
          filter: drop-shadow(0 0 4px rgba($demon, 0.8))
            drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
        }
      }

      // a finger cannot hover a title, so on a touch screen the row gives the
      // cluster a real height rather than a 14px line of text
      @media (pointer: coarse) {
        min-height: 40px;
      }
    }

    // SHUFFLE SEAT ORDER, on the panel's shared plate. Everything this rule
    // used to do by hand — an opacity for "off", a 15px/-9px padding trick to
    // fake a fingertip target on a phone — the `control-icon-btn` mixin does
    // for every icon button on the panel at once, so this and RoleActions'
    // three cannot drift apart again.
    .tools {
      display: flex;
      align-items: center;
      gap: 10px;
      .tool-btn {
        @include control-icon-btn;
      }
    }
    .value {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      &:hover {
        color: red;
      }
      // "0 / 8 assigned" opens the grimoire drawer — a 14px-tall line of text
      // doing a button's job.
      @media (pointer: coarse) {
        min-height: 40px;
      }
    }
    small {
      opacity: 0.6;
    }
  }

  // ── FT-1090: THE TWO MERGED LINES ─────────────────────────────────────────
  //
  // The cast line (seats + roles) and the settings line (night + day length)
  // are ordinary `.row`s — everything above still applies to them — plus one
  // rule each: they wrap by HALF / by PAIR rather than by control, and a wrap
  // costs them nothing.
  //
  // WHY `row-gap: 0` IS LOAD-BEARING AND NOT COSMETIC. `.row`'s own `gap: 14px`
  // (4px 8px on the disc) applies in BOTH axes, so a wrapped row would pay
  // vertical gap that two separate rows never paid — and the whole point of
  // this pass is to hand height to the character tray. Zeroed, the wrapped form
  // is strictly cheaper than the rows it replaced, because a wrapped LINE has
  // no `min-height` of its own: the 34px floor belongs to the row, and a merged
  // row pays it once instead of twice.
  //
  // WHAT IT IS WORTH, measured (7 seats, tray full; rig:
  // `claude_temp_test/2026-08-23-ft1090-{measure,fit}.mjs`). A merged line only
  // buys the tray a whole row's height where its two parts SHARE a line, and
  // whether they do is pure arithmetic against the band's width:
  //
  //                       band   cast needs   settings needs   tray before/after
  //   1642x780 (floor)   403.4       693.6            529.4      51.4 ->  53.1
  //   1920x1080            481       693.6            529.4     106.6 -> 108.3
  //   2560x1440          636.1       693.6            529.4 ✓   217.0 -> 255.8
  //   3440x1440            828       693.6 ✓          529.4 ✓   353.7 -> 424.7
  //
  // SUPERSEDED BY FT-1098 for `.ht-settings` alone (the "cast needs"/"693.6"
  // row above is the SEATS+ROLES line, `.ht-cast`, and is UNTOUCHED by this —
  // only the "settings needs 529.4" figure describes a shape this pass
  // changed). That 529.4 was night-mode + day-length only, the shape before
  // the sounds row folded in — see the settings line's own template comment
  // for the four-unit numbers this pass measured instead, and why "the
  // day-length pair alone in an empty band" was the bug being fixed rather
  // than a width this table's old prescription (widen the band, or shrink the
  // controls) would have solved.
  .ht-cast,
  .ht-settings {
    flex-wrap: wrap;
    row-gap: 0;
    align-items: center;
  }

  // A HALF IS ONE WRAP UNIT, and that falls out of how flex sizes it rather
  // than needing to be forbidden: a half's hypothetical size is its MAX-CONTENT
  // width — what it would paint on one line, wrapping or not, the same fact
  // NightModeRow's own note records — so the row runs out of line and breaks
  // BETWEEN the halves first. A half only wraps inside itself when it alone is
  // wider than the panel, which is the PHONE, where the seat scrub, the counts,
  // the claimed line and the shuffle genuinely do not fit one line — and where
  // wrapping inside is exactly what the Seats row did before this merge.
  .ht-cast-half {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    row-gap: 0;
    flex: 0 1 auto;
    min-width: 0;
  }

  // THE SETTINGS LINE'S TWO PAIRS (FT-1099, superseding FT-1098's bin-pack —
  // see the template's own comment for why). `.ht-set-line` is the wrap unit
  // now, not the individual mark+control units it holds: `flex: 1 1 100%`
  // forces each line to its own full-width row regardless of how much slack
  // a given width leaves, so the storyteller's own pairing (night-checklist
  // + day-break bell on line one, day-length + call-back on line two) holds
  // at every size instead of only the ones a four-way bin-pack happened to
  // land that way. `.night-mode` is NightModeRow's own ROOT element, which is
  // why it can be addressed from here at all — a child component's root
  // carries the parent's scope id and nothing below it does (that
  // component's own note explains what it therefore has to restate).
  .ht-settings {
    > .ht-set-line {
      flex: 1 1 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
      row-gap: 0;
      min-width: 0;
    }
    // each line's own units — a mark+control cluster on the left, a second
    // one on the right — content-width and never stretched, the row's own
    // `space-between`-spends-the-gap-between-clusters shape (FT-959)
    // restated one level deeper.
    .night-mode,
    .ht-set-pair,
    .tw-lead {
      flex: 0 1 auto;
      min-width: 0;
    }
    // the day-length pair — hourglass, Off/Timed, and the minutes — reading
    // left to right as one sentence instead of as two halves of a
    // `space-between`
    .ht-set-pair {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      row-gap: 0;
    }
  }

  .start {
    margin-top: 10px;
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
    font-size: 120%;
    padding: 8px 20px;
    background: rgba(0, 0, 0, 0.7);
    border: 3px solid black;
    border-radius: 10px;
    opacity: 0.4;
    cursor: not-allowed;

    // FT-938 (user call: "let's make the border and text purple when it is
    // active"). Was `border-color: #400` (blood) with the default white text
    // — the button's only signal that it could be pressed was full opacity.
    // PURPLE, reusing controls.scss's own tokens rather than inventing a
    // third recipe: `$control-edge-hover` IS the grimoire's edge (this same
    // file already reads it for every plated control's hover), and #f4ecff is
    // the night checklist's own finish-button text — the app's other primary
    // button that goes purple when it's the obvious next step
    // (NightSheet.vue's `.bottom.ready`). Purple is the storyteller's chrome
    // throughout; this is that chrome on the one button here that earns it.
    &.ready {
      opacity: 1;
      cursor: pointer;
      border-color: $control-edge-hover;
      color: #f4ecff;
      &:hover {
        color: red;
      }
    }
  }

  .hint {
    display: block;
    margin-top: 6px;
    opacity: 0.6;
    font-size: 70%;
  }

  // ── THE SEAT-RANGE WARNING (FT-895) ───────────────────────────────────
  //
  // WARN GOLD, #ffd98a, IS NOT A NEW COLOUR. It is the exact ink
  // NightModeRow's enforcement segment paints its selected "Warn" cell in —
  // this app's one existing word for "look at this, but nothing is stopping
  // you", which is precisely the contract this line has. It is written as a
  // literal here for the same reason it is a literal there: controls.scss
  // carries plate/edge/on tokens and has no warn token to reuse. A shared
  // `$control-warn` is the right home for it now that a second surface wants
  // it — flagged, not taken, because that file is not this lane's to edit.
  //
  // BRIGHTER THAN `.hint`'s 0.6 (0.85). The Start footer's hint explains a
  // button you can see is greyed out; this one is the only sign that
  // anything is off at all, and a warning at 60% opacity in 70% type is a
  // warning nobody reads.
  .hint.seat-warn {
    color: #ffd98a;
    opacity: 0.85;
    max-width: 320px;
    line-height: 1.3;
    // FLUSH LEFT, in the panel's own text column — the same place and the
    // same reasoning as `.nm-hint`, the night row's hint one row down, which
    // is the nearest precedent for "a sentence explaining the row above it".
    // The Start footer's `.hint` inherits the panel's centring instead, and
    // that is right for THAT one: it sits under a centred button in a centred
    // dock. This one sits under a left-aligned row.
    text-align: left;
    // the range sits on its own line: the shortfall is what to act on, what
    // the script DOES play is the follow-up, and running them together made
    // one long sentence with two jobs.
    .plays {
      display: block;
      opacity: 0.75;
    }
  }
  // THE NUMBER THAT CAUSED IT gets the same gold on its plate's edge, so the
  // eye lands on the control the line is about rather than hunting the row.
  // Edge only — the scrub's own digits stay legible, and the plate keeps the
  // `control-plate` material every other control on this panel wears.
  .ht-seat-readout.warn {
    border-color: rgba(255, 217, 138, 0.55);
  }

  // ── THE DISC (FT-888, desktop only) ───────────────────────────────────
  //
  // The build panel joins the checklist and the two entry panels: same
  // geometry, same gate, same material, all of it from src/faceDisc.scss.
  // It is the DENSEST of the four — a town name, seats, a script, roles and
  // their three actions, the night switch, a tray of characters and Start —
  // so the arrangement matters more here than anywhere else.
  //
  // TITLE IN THE TOP CAP, START IN THE BOTTOM ONE, everything else in the
  // band. That is the same swap the other three made, and it is what buys the
  // band its width: the rows are wider than the circle's inscribed square
  // precisely because the two short things sit in the poles.
  //
  // THE BAND DOES NOT SCROLL, AND THAT IS DELIBERATE. Two of its children
  // open things OUTSIDE themselves — the script picker's grid and (on an
  // owned town) nothing else, but the grid alone is enough: it is
  // `position: absolute` and wider than the band, so a scrolling band would
  // become its clipping container and cut the picker in half. The same
  // argument is why the disc itself is `overflow: visible` here and on the
  // entry panels, where the checklist can afford `hidden`.
  //
  // SO THE TRAY ABSORBS INSTEAD. It is the one child whose height is a
  // variable — a bag of unseated characters — and it already owns a scroll
  // for exactly this (RoleTray's `.rt-rows`, 132px on the rectangle). Inside
  // the disc it takes whatever the four fixed rows leave, and scrolls the
  // rest. Nothing else changes size, and no type shrinks.
  @include face-disc-build-gate {
    @include face-disc-frame;
    // the script picker's grid opens out over the rim — see above
    overflow: visible;

    // `.ht-head`, not `h3` — see the template comment. The cap is a FIXED
    // slice of the disc (`fd-caph`), not an intrinsic height, so it is the
    // wrapper that takes the flex basis; growing content inside it does not
    // grow the cap, it bleeds down into the band instead.
    > .ht-head {
      // FT-1095 (user call): "lift the header — it sits low in the disc's
      // cap today". THIS PANEL'S OWN OVERRIDE, not a change to
      // `$face-disc-geo-town`: that map's `head-dy: -20px` is shared with
      // the night checklist and the votes disc (NightSheet.vue, Vote.vue),
      // neither of which this pass touches. `face-disc-head`'s own `$dy`
      // param exists for exactly this ("for a surface whose furniture is a
      // different size"), so this reads it directly rather than
      // `--fd-head-dy`, and `--fd-head-adj` (the lab's own per-surface
      // dial) still applies on top — the mixin adds it whichever way `$dy`
      // arrives.
      //
      // 6px further up than the shared -20px. The clearance table above
      // (FT-888, 2-geo bake) says the host panel's header can afford it —
      // it is the surface with the MOST room of the three: +29.9px inside
      // the rim at the disc's own floor (1642x780) and +61.1px at
      // 1920x1080, against the night checklist's +3.4 / +39.6 at those same
      // two sizes. A further 6px leaves it comfortably clear at both.
      @include face-disc-head($dy: calc(#{$face-disc-head-dy} - 6px));
      // the flex basis IS the cap; a margin would sit outside it and push the
      // band off centre, which is the one thing the arithmetic cannot take
      margin: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;

      h3 {
        margin: 0;
      }

      // THE GAMES LINE AND THE RENAME NOTE FOLD INTO THE HEADING'S OWN
      // TOOLTIP HERE, the same move the reason line and the claimed count
      // already make lower in this file: there is no room in a fixed cap for
      // a second line of type, so it rides the `title` instead of the page.
      .ht-games,
      .ht-rename-note {
        display: none;
      }
    }

    > .ht-body {
      @include face-disc-band;
      // THE BAND TAKES BACK THE ROOM THE BUTTON GAVE UP (2026-08-19, user
      // call: "make that button less wide and move it down, so that there is
      // more vertical room for the role selection").
      //
      // THE TWO HALVES OF THAT SENTENCE ARE ONE MOVE, and this line is it.
      // Extending the band downward pushes `.start-dock` — the next flex item
      // — down by exactly the same amount, so the button moves without a
      // second offset and `$face-disc-foot-dy` (a baked user-dialled value,
      // shared with three other surfaces) is not touched at all.
      //
      // A TRANSFORM WOULD HAVE MOVED THE BUTTON AND FREED NOTHING. The dy in
      // faceDisc.scss is a translate, and a translate takes no part in layout
      // — the band's slice is fixed at `d - 2*caph` and would have stayed
      // exactly as tall with the button sitting 20px lower. The room has to
      // come out of the flex basis or it does not exist.
      //
      // WHY 22px, AND WHY IT IS THE CEILING. The binding constraint is the
      // Start button's BOTTOM CORNERS against the arc, and the disc's floor —
      // 1642x780, where the radius is 228 — is where it binds. Measured with
      // the rim and the button's box DRAWN into the page rather than eyeballed
      // off the dial art, positive = inside the rim (rigs:
      // claude_temp_test/2026-08-19-plate-{measure,rimcheck}.mjs):
      //
      //                        1642x780   1920x1080
      //   as this lane found it   -1.6       +10.9   ← already outside at the
      //   band +22, narrow Start  +0.8       +18.9      floor before this lane
      //                                                 touched anything; and
      //                                                 faceDisc's own table
      //                                                 reads -1.6 at 1440x900,
      //                                                 which is the same 228r.
      //
      // Past +22 the button goes back outside at the floor. So the number is
      // the largest drop the narrower button pays for, and it is spent on the
      // tray rather than banked.
      //
      // WHAT IT BOUGHT, tray full, same seat count:
      //   1642x780   tray 68.9 -> 86.9px, characters showing  7 -> 13 of 22
      //   1920x1080  tray 157.1 -> 179.1px, characters showing 17 -> 21 of 22
      //
      // 10 OF THOSE 22 ARE THE DOCK'S OWN TOP MARGIN, given up below — see
      // `.start-dock`. That margin sat BETWEEN the band and the button doing
      // the job the mixin's translate already does, so taking it lets the band
      // grow 10px further without the button moving 10px further down.
      //
      // THE TRAY'S OWN BOTTOM ROW WAS THE OTHER CANDIDATE for the binding
      // constraint and turned out not to be. Role tiles are CIRCLES in a 42px
      // box, so the ink at the corner of a full row is transparent; measured
      // against the tile's own ink, the widest row still clears the rim by
      // 29.6px at the floor and 59.1px at 1920x1080.
      //
      // ── RE-MEASURED, 22px -> 26px (FT-938, user call: "a little taller… "
      // and "move the start game button down a bit more to make room") ─────
      // Re-measured against the CURRENT build rather than reusing the table
      // above — Width is baked at 18px now (it was mid-bake when +22 was
      // chosen) and the ellipse math the button's clearance actually wants is
      // in the rig below, not the circle approximation the old table used.
      //
      // THE FLOOR IS STILL THE BINDING CASE, and it is thin: at 1642x780 the
      // Start button's bottom corners clear the disc's ELLIPSE (not a circle
      // — the plate is 510x474 there, not square) by +6.5px before this
      // change. Every pixel this constant grows moves the button's bottom
      // edge down by the same pixel (the mixin's own translate is untouched;
      // the room comes out of the flex basis, same argument as the table
      // above) and costs very close to a pixel of that clearance. +4px was
      // the number that kept a real margin (+2.7px, in the same range the
      // table above already shipped at other sizes) rather than shaving it to
      // nothing:
      //
      //                    clearance (ellipse eq., +px = inside)
      //   1642x780 floor     +6.5  ->  +2.7
      //   1920x1080           — ample headroom there; not the binding case
      //
      // (Rig: claude_temp_test/2026-08-19-ft936-measure.mjs — run against a
      // built dist, not dev-server, so the hash in the proof matches.)
      flex-basis: calc(var(--fd-d) - 2 * var(--fd-caph) + 26px);
      display: flex;
      flex-direction: column;
      // without this the band's automatic minimum is its content's height and
      // the tray never gets told to shrink
      min-height: 0;
      padding: 0 6px;

      // NOTHING IN THE BAND SHRINKS EXCEPT THE TRAY, and this line is what says
      // so. As column flex items the rows default to `flex-shrink: 1`, so an
      // over-subscribed band silently squeezed each row BELOW its content —
      // measured: the Seats row held at 34px with its claimed count and shuffle
      // drawn on a second line straight through the Script row beneath it, and
      // "Night checklist" ran under its own switch. The tray is the one child
      // whose height is genuinely a variable, so it is the only one allowed to
      // give.
      > .row,
      > .night-mode,
      // FT-1032: the greeting line and the rebuild door are fixed content
      // like the rows — only the tray (absent on the re-entry face anyway)
      // is allowed to give.
      > .ht-running,
      > .ht-rebuild {
        flex-shrink: 0;
      }

      // FT-1095 (user call): "lift the rows too — tighten the gap between
      // the header and the first row". A negative top margin on the band's
      // own FIRST child (`.ht-cast` while building, `.ht-running` on
      // re-entry — the two are mutually exclusive `v-if`s, so exactly one
      // is ever first) is ordinary flex-column arithmetic, not a transform:
      // it pulls that row up, and because nothing after it holds a fixed
      // position of its own, every row below follows by the same amount —
      // the same "string and can" a negative margin always is inside a
      // column flex container.
      //
      // THE BAND'S OWN HEIGHT DOES NOT CHANGE (the flex-basis two rules up
      // is untouched), so the 14px this opens at the top is not freed from
      // nothing — it is HANDED to the bottom of the same box, where the
      // tray (`.role-tray`, RoleTray.vue's own `flex: 1 1 auto`) is the one
      // child that grows to take it. Same rule FT-1090's own band extension
      // paid out on the other edge: a pixel freed in the band is a pixel
      // the tray gets, never a gap left standing.
      > :first-child {
        margin-top: -14px;
      }

      // THE ROWS WRAP RATHER THAN OVERFLOW, for the size where even the folds
      // below are not enough. The gap comes down from 14px to 8px first, which
      // is spacing rather than type.
      > .row {
        flex-wrap: wrap;
        gap: 4px 8px;
      }

      // FT-1090: …AND THE TWO MERGED ROWS KEEP THEIR ZERO ROW-GAP THROUGH IT.
      // The rule above sets `gap` in both axes, which would hand the cast and
      // settings lines back the 4px of vertical gap the merge exists to save.
      // Restated here rather than fought with `!important`.
      > .row.ht-cast,
      > .row.ht-settings {
        row-gap: 0;
      }
      // a half closes up to the disc's own 8px like every row on the panel
      .ht-cast-half {
        gap: 8px;
      }
      // FT-1099: each settings LINE closes up the same way — the pairing
      // itself never changes, only how tight its own two clusters sit.
      .ht-set-line {
        gap: 8px;
      }

      // THE CLAIMED COUNT FOLDS INTO THE ROW'S TOOLTIP — a JUDGEMENT CALL, and
      // the one thing on this panel that the disc takes away rather than
      // rearranges, so it is stated plainly rather than buried.
      //
      // The Seats row is the crowded one: a label, the scrub, the new
      // composition readout, "N claimed" and the shuffle want 427px of a
      // 345px band at 1280x800. Something has to give, and this is the
      // cheapest thing on the line: it is 78px with its gap, it reads "0
      // claimed" for the whole of the build, and the session pill in the
      // bottom-right corner is already saying the same number out loud. Taking
      // it back keeps the Seats row on ONE line at every size the disc runs at,
      // which in turn is worth ~30px of band to the character tray — the
      // difference between a tray you can drag from at 1280x800 and one you
      // cannot.
      //
      // It is a FOLD, not a deletion: the row's own `title` carries it, the
      // rectangle and both phone sheets are untouched, and one deleted rule
      // brings it back.
      .row .claimed {
        display: none;
      }
    }

    > .start-dock {
      @include face-disc-foot;
      // NARROWER THAN THE MIXIN'S 0.95r (2026-08-19, user call). The dock IS
      // the button's width — `.start` is a block inside it — and 0.95r drew a
      // 262px slab under a two-word label at 1920x1080.
      //
      // IT IS ALSO WHAT PAYS FOR THE DROP. The binding measure on this button
      // has always been its BOTTOM CORNERS against the arc, and a narrower box
      // brings those corners in toward the vertical axis, where the circle is
      // deepest. That is the whole reason both halves of the user's sentence
      // ("less wide AND further down") can be true at once: at the disc's own
      // floor the button was already 1.6px OUTSIDE the rim before this lane
      // touched it, and it now sits 12px lower and 0.8px inside.
      //
      // THE FLOOR IS THE LABEL, not the radius: 150px holds "Start game" at
      // 100% in PiratesBay with its 14px padding and 3px border on one line.
      // Below it the label wraps, which is the one thing a primary button must
      // not do — so the width is a `max()`, not a bare fraction, and at the
      // smallest disc it is the floor that answers.
      //
      // FIXED (FT-938): this read `--fd-r`, the VERTICAL radius — faceDisc.scss
      // names the bug itself, next to `face-disc-foot`: "the read wants
      // `--fd-rx` whenever that button is next opened." It is now open.
      //
      // THE COEFFICIENT MOVED WITH IT, 0.62 -> 0.583, so the fix reads as a
      // correction rather than a resize: solved from the live numbers so
      // `0.62 * fd-r` and `0.583 * fd-rx` compute the SAME 176.4px at
      // 1920x1080, the size this file's own tables already use as their
      // benchmark. `fd-rx` is `fd-r` plus a flat 18px, not a multiple of it,
      // so the two formulas only agree exactly at that one solved size — off
      // it the delta is a few px (under 5 across the whole disc range,
      // measured), which is a correction's rounding, not a second resize. At
      // the floor the formula was never binding anyway (150px, the label's
      // own floor, beats either expression there), so nothing moves at the
      // one size this pass's clearance budget is tight.
      width: max(150px, 0.583 * var(--fd-rx));

      // NO TOP MARGIN HERE (the mixin's `margin: 10px 0 0`, overridden). It
      // was a gap between the band and the button, and the mixin's own
      // translate already opens one — so the 10px was being paid twice and the
      // band was the one paying. Given back, it is 10px of character tray.
      margin-top: 0;

      // START, AT THE DISC'S OWN BUTTON SIZE. On the rectangle this is 120%
      // type in 8px/20px padding inside a 3px border — 60.7px tall, against
      // the checklist's 42px and the entry panels' 48px. In a bottom cap that
      // is not a style choice, it is the difference between clearing the arc
      // and being sheared by it, and the three primary buttons on this face
      // should be one object anyway. The label is two short words; it is the
      // padding that comes off, not the reading size.
      .start {
        margin-top: 0;
        font-size: 100%;
        padding: 4px 14px;
      }
      // THE REASON LINE FOLDS INTO THE BUTTON'S TOOLTIP HERE, and this is a
      // fold rather than a loss: it is the same string as the button's own
      // `title`, and the disc only exists on a fine pointer, which can hover.
      // It was added for the PHONE sheet, where nothing can. Measured: with the
      // line showing, the dock stands 73.8px in a 96.8px cap and Start's bottom
      // corners cross the rim by 7.8px at 1280x800 — the cap has room for the
      // button or for the pair, not both, and the button is what the panel
      // exists to reach.
      .hint {
        display: none;
      }
    }
  }
}
</style>
