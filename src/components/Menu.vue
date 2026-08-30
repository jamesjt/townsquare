<template>
  <div id="controls">
    <!-- Golem fork: the session badge + vote-history count moved to the
         BOTTOM-RIGHT session pill (App.vue) — up here they sat ON TOP of the
         standing toolbar and stole its clicks. -->
    <!-- Golem fork: the gear is gone — the tab row IS the menu, always
         visible. Clicking a tab opens its section; clicking the open tab
         collapses back to the bare toolbar. -->
    <div
      class="menu open"
      :class="{
        collapsed: tab === null,
        'strip-width': tab === 'tower',
        'auto-width': tab === 'settings',
      }"
    >
      <!-- FT-1198 (user): "I didn't mean all of this being glass. Just the
           part where below the player strip... make it more of a controls
           header?" — FT-1193 laid the glass plate on the whole ul, strip and
           section together, because that ul WAS one bordered object. It is
           TWO lists now: this one is the CONTROLS HEADER — the standing row
           of marks, on its own slim dark bar — and the ul after it is the
           SECTION, which alone wears the glass. Every `.menu ul` style still
           reaches both; only the material split. -->
      <ul class="strip-bar">
        <!-- Golem fork (2026-08-18, user call): the grimoire/help tabs left;
             the strip is the PLAYER surface now — script, vote history,
             night order — in our engraved art. Menu sections stay in-tree. -->
        <li class="tabs player-strip" :class="tab" v-if="inGame">
          <!-- FT-857: script + night open the SAME drawer, on their own tab.
               (The old reference / night-order overlays stay in-tree.) -->
          <!-- FT-1202 (user): "either have all of them glow or none of them
               (I like the glow)" — the settings cog was the ONLY mark that lit
               while its surface was open, which made the others read as doors
               with no lit state. Every mark in this strip now carries `lit`
               while the thing it opens is up, in one shared rule (see the
               style block) — the cog's old gold glow, generalized and taken
               down half a step to the register the user asked for. -->
          <img
            :src="uiScript"
            :class="{ lit: modals.scriptDrawer }"
            title="The script (reference sheet)"
            @click="openScriptDrawer('team')"
          />
          <!-- (FT-858's gallows door stood here until FT-1019: the vote
               history lives inside the Chronicles now — its rows in the
               permanent stream, behind the quill below, and V lands there
               with the gallows filter already on. The noose art lives on as
               that filter's own cell; ui-votes.png stays in the tree.) -->
          <!-- (the moon retired 2026-08-18 as a NIGHT-ORDER door, then
               served FT-860 as the night-notes door until FT-1037b — "all
               of this should be a toggle for events in the chronicle", user
               call. The art lives on as that toggle's own filter cell in
               the chronicles; ui-night.png stays in the tree.) -->
          <!-- THE DEMON'S BLUFFS mark lived here (2026-08-19 to FT-958) and now
               rides the bluffs cluster itself, above its top coin — TownSquare.vue's
               `.bluffs-toggle`, driving the SAME `toggleBluffsOpen` commit this
               strip used to. Taken out of the toolbar entirely (user call,
               FT-958): one door to the switch, not two. -->
          <!-- FT-1010: CHRONICLES — ONE door onto the town's whole story
               (user decision, 2026-08-20): the chat log, the game events and
               the town records, merged into one surface behind the quill and
               inkwell — the written ledger's own mark. Three doors became
               this one: the records door (this same quill, which used to
               raise StatsOverlay), the chat bubble and the chronicle's
               book-with-a-skull are gone from the strip; their components
               are retired by unmounting and their files stay in the tree.
               The records aggregates live on as the surface's summary band. -->
          <img
            :src="uiQuill"
            :class="{ lit: modals.chroniclesDrawer }"
            title="Chronicles — the town's whole story"
            @click="toggleModal('chroniclesDrawer')"
          />
          <!-- FT-1020b: THE TOWER'S HOURGLASS — the hour display's menu
               (Off / Hands / Digital / Numerals — FT-1052 toggles), a tab section like
               the sections below it: click opens, click again closes. The
               art is ui-records.png, the old town-records door's hourglass,
               freed when the quill took Chronicles (FT-1010) — and the
               control the user's first ask meant all along: the
               voice-transcribed "hour class" was this HOURGLASS, not the
               XII that briefly anchored the menu on the dial (FaceHands.vue,
               retired). The storyteller's pick sets the TOWN's display; a
               player's sets their own screen (towerBells.toggleHourLayer). -->
          <!-- FT-1333: THE HOURGLASS STANDS DOWN — its four rows moved into
               the Player settings menu's own Timer section
               (PlayerSettings.vue), where the user asked the timer options
               to live. The mark is unmounted (v-if="false"), not deleted,
               and its tower-tab section below stands down with it — the
               same house rule the retired cog section follows. -->
          <img
            v-if="false"
            :src="uiHourglass"
            :class="{ lit: tab === 'tower' }"
            title="The tower — how the dial shows the hour"
            @click="setTab('tower')"
          />
          <!-- (FT-1010: the chat bubble and the chronicle's book-with-a-skull
               stood here, FT-965/FT-886 — both merged into the Chronicles
               quill above. ui-chat.png stays in the tree.) -->
          <!-- FT-880: CALL THE TOWN BACK stood here (the strip is never
               hidden by a drawer, which is why it lived in this row).
               FT-1051 (user): it moved to the info column, ABOVE the script
               name — TownInfo.vue's .info-call — where it reads as the
               table's own control rather than one mark among ten. The
               reasoning that put it here (visible mid-day, nothing open, no
               confirm) moved with it and still holds there. -->

          <!-- FT-880: THE KEYS. Every one of this app's hotkeys has been
               undiscoverable since upstream — no screen mentions them. This is
               the door onto the list, and it is last in the row on purpose:
               it is the one mark here that is never part of running a game,
               so it sits where the eye stops rather than where it starts. -->
          <!-- FT-1197 (user): "lets make that a better icon than a ?" — the
               stock Font Awesome question glyph was the last unbaked mark in
               a row of house art (the cog was the previous one, FT-1174, and
               the reasoning there carries verbatim: a flat vector beside
               baked bone reads as a different MATERIAL, not a different
               door). It is a LANTERN now — a guide's light, ui-help.png in
               the same 128px bone-and-grain family — because the panel
               behind it grew from a key list into the whole usability guide
               (see HotkeyHelp.vue), and the door should promise the guide,
               not a question. The glyph is stood down below, not deleted. -->
          <!-- FT-1202: the guide's open state lives in App.vue
               (hotkeyHelpOpen — this strip only emits), so the lit fact
               arrives as a prop rather than a second flag that could drift. -->
          <!-- FT-1226 (user): "hide it for now unless labs is on, its not
               good enough." The lantern stands behind the platform's `labs`
               flag (session.labs, fetched at boot from /api/flags/self) —
               hidden for everyone until the guide earns its place, visible
               to the tester cohort the flag's exception list names. Stood
               down, not deleted; the same gate covers the entry strip's
               lantern below and the panel itself (App.vue). -->
          <img
            v-if="session.labs"
            :src="uiHelp"
            :class="{ lit: guideOpen }"
            alt="The guide"
            title="The guide — how this table works"
            @click="$emit('hotkeys')"
          />
          <font-awesome-icon
            v-if="false"
            icon="question"
            title="Keys"
            @click="$emit('hotkeys')"
          />
          <!-- THE DOOR OUT OF A TOWNLESS TABLE (2026-08-19, user stranded
               twice).

               A table can hold seats with NO session behind them — the roster
               persists to this browser independently of the town, so a bare URL
               boots the square with everybody still sitting in it. FT-889 made
               a bare URL mean the entry screen; it does not, while a roster
               survives, because the entry screen's own test also demands an
               empty table (App.vue's `Intro` v-else-if).

               In that state there was no way back at all: the session pill —
               which carries the app's Leave door — renders only `v-if
               ="session.sessionId"`, and the entry screen will not take the
               centre while seats exist. Menu's own clearPlayers() has been
               unreachable since the tab row retired (nothing calls setTab, so
               no section ever renders).

               HERE, in the strip, for the reason the summons two marks up gives
               and this needs even more: it is the one piece of chrome that is
               never hidden by a drawer or a phone's orientation. A door out
               behind a closed drawer is not a door out.

               SESSIONLESS ONLY. Inside a real town the pill's Leave is the
               door and this would be a second one saying the same thing.

               TWO-CLICK ARM, no confirm(). This is the control that unsticks a
               stuck user, and a native dialog is silently auto-dismissed in
               driven and embedded contexts — which is what made Leave read as
               dead (FT-852), what would have swallowed the deal (2026-08-18),
               and the worst thing that could happen to this button. The arm is
               the pill's, and it says what the second click does out loud
               through the app's own transient hint, since a lone mark in an
               icon strip has no room to wear "Sure?". -->
          <font-awesome-icon
            v-if="!session.sessionId && players.length"
            class="clear-table"
            :class="{ armed: clearArmed }"
            icon="door-open"
            :title="
              clearArmed
                ? 'Click again to clear the table'
                : 'Clear the table and go back'
            "
            @click="clearTable"
          />
          <!-- FT-1168: YOUR OWN SETTINGS, and the house's mark. See the
               `settings-marks` note on the entry strip below — the pair is
               identical in both rows on purpose, because a personal setting
               is personal on every screen this app has. -->
          <!-- FT-1174: the cog is BAKED ART now, not a Font Awesome glyph —
               see the entry strip's copy of this row for the whole reason. -->
          <!-- FT-1198 (user): "the settings for that are all right now
               related to hosting, can we make the only show up for hosts?" —
               every row behind this cog (Setup panel / Control scheme /
               Grimoire size) is a storyteller concern, so the DOOR is
               storyteller-only too: a gear that opens an empty plate for a
               player is worse than no gear. `!session.isSpectator` is the
               session's own host fact — the same gate Add Fabled below and
               every other storyteller-only control in this app reads — never
               a browser pref (this repo has been burned gating on the wrong
               party's value). If prefs ever grow a genuinely player-facing
               row, the gear can return for players then. -->
          <!-- FT-1202 (user): "right now all it is is host control settings
               lets remove it from the main page, and in while a user is
               hosting a game put it inline with the town name." The cog LEFT
               this strip — its one home is the host panel's own head now
               (HostTools.vue's `.ht-cog`, beside the town's name), because
               every row behind it is a storyteller concern and the
               storyteller's panel is where those live. Stood down, not
               deleted; the section it opened moved out whole (PrefsMenu.vue). -->
          <img
            v-if="false"
            class="settings-cog"
            :class="{ on: tab === 'settings' }"
            :src="uiCog"
            alt="Your settings"
            title="Your settings — this browser, every town"
            @click="setTab('settings')"
          />
          <!-- FT-1319: THE COG RETURNS, FOR EVERYONE — which is exactly the
               condition FT-1198 set when it left ("if prefs ever grow a
               genuinely player-facing row, the gear can return for players
               then"): the player settings menu's rows are the viewer's own
               (the reminder pin's resting visibility; the vote timer for a
               storyteller; FT-1318's coin art next). NOT the stood-down
               settings-cog above — that one opened the HOST prefs section
               and stays stood down; this one opens PlayerSettings.vue. -->
          <img
            :class="{ lit: playerSettingsOpen }"
            :src="uiCog"
            alt="Player settings"
            title="Player settings — yours, on every screen"
            @click="togglePlayerSettings"
          />
          <!-- FT-1200: the mark is THE ACCOUNT DOOR now — see the entry
               strip's note. (FT-1204 took the signed-in ring off; FT-1202's
               `lit` is a different fact — the door's own panel standing open,
               the same open-state glow every mark in this strip now wears.)
               FT-1320: the mark drops its own MENU now (AccountMenu.vue) —
               the account act that applies plus the change log; the account
               door the bare click used to open is the menu's Sign in row. -->
          <img
            class="golem-mark"
            :class="{
              'signed-in': !!session.account,
              lit: accountMenuOpen || accountOpen,
            }"
            :src="uiGolem"
            alt="Golem"
            :title="
              session.account
                ? `Golem — signed in as ${
                    session.account.name || session.account.email
                  }`
                : 'Golem — sign in, change log'
            "
            @click="toggleAccountMenu"
          />
        </li>

        <!-- FT-1159 (user call, 2026-08-25): THE ENTRY SCREEN'S RECORDS MARK —
             "maybe we put it in the top right as the chronicles button as
             well." The records door left Intro's door stack (see the note
             there): Host, Join and Scripts are the things a person is choosing
             between when they arrive, and the cross-town records are not one
             of them — they are a thing you come to the site to look at.

             THIS IS THE SAME STRIP, GATED THE OTHER WAY. `!inGame` is exactly
             Intro's own render test (`!session.sessionId && !players.length`),
             so this row and the one above are never up together, and a second
             kind of corner button never gets built: the same `#controls`
             corner, the same `li.tabs.player-strip` plate, the same 26px art,
             the same hover and the same coarse-pointer tap box, all inherited
             rather than restated.

             THE QUILL, not the hourglass. `ui-records.png` is the old
             town-records door's hourglass, and FT-1020b put it back in service
             as the tower's hour-display menu — a mark that opens the timer
             in-game cannot also mean "records" one screen earlier.
             `ui-chronicle.png`, the quill and inkwell, is the app's mark for
             the written ledger and is the button the user pointed at. -->
        <li class="tabs player-strip entry-strip" v-if="!inGame">
          <!-- FT-1202: `lit` while the surface each mark opens is up — the
               same one-glow-rule the in-game strip wears (see the note there). -->
          <img
            :src="uiQuill"
            :class="{ lit: modals.records }"
            title="Chronicle — every town's games (C)"
            @click="openRecords"
          />
          <!-- FT-1197: THE GUIDE, on the entry screen too. The old "?" was
               in-game chrome only, which meant the one person the guide's
               "Getting in" chapter is written for — somebody standing at the
               doors with no town yet — had no door to it at all (the panel
               itself opens on that very chapter for them; see
               HotkeyHelp.vue's created()). Same mark, same emit, and the
               same App.vue listener answers both strips. -->
          <!-- FT-1226: behind `labs`, same as the in-game lantern above. -->
          <img
            v-if="session.labs"
            :src="uiHelp"
            :class="{ lit: guideOpen }"
            alt="The guide"
            title="The guide — how this table works"
            @click="$emit('hotkeys')"
          />
          <!-- ── FT-1168 (user): TWO MARKS IN THE CORNER ──────────────────
               "add two things to the top right menu. A settings icon, and
               the golem favicon."

               THE COG IS A DOOR, ONTO PERSONAL SETTINGS. Not the town's:
               everything behind it belongs to the human at this browser and
               follows them into every town they visit (see golem/prefs.js for
               the line between the two surfaces, and the build panel's Game
               settings tab for the other side of it). It is in BOTH strips —
               this one and the in-game one above — because that is the whole
               claim: a personal setting is not something you go into a town
               to change.

               THE GOLEM MARK IS A MARK, NOT A DOOR. It is the platform's own
               favicon (src/assets/golem-mark.png, the 180px cut of
               client/public/brand/apple-touch-icon.png — the same golem head
               the site's tab wears, taken at that size because the 32px and
               64px cuts smear at the strip's 26px on a 2x screen). This fork
               is served from its OWN subdomain (deploy/Caddyfile.botc-snippet
               — botc.<site> beside the main site), so a click could only mean
               "leave for the main site", which nobody asked for and which
               would be a door out of a running game sitting one pixel from
               the Chronicle. It carries a title and nothing else until
               somebody says where it should go.

               FT-1200: SOMEBODY SAID. The user made the mark the login
               door — it opens the account panel (AccountDoor.vue) rather
               than leaving the site, which dissolves the old objection: the
               door leads to the platform's account, not away from the game.
               The signed-in ring and the click live on both strips' copies
               of the img below. -->
          <!-- ── FT-1174 (user): THE COG WEARS THE HOUSE FINISH ─────────────
               "apply the texture to the settings button that we did to the
               other buttons that go up there."

               FT-1168 stood a bare Font Awesome glyph in a row of BAKED marks
               — ui-script, ui-chronicle, ui-records — every one of which
               carries the same finish: bone #cfc4ae, one light origin at the
               upper left, film grain, 128px square. A flat vector beside them
               does not read as a different door, it reads as a different
               MATERIAL, and the eye sorts the strip into "our marks, and that
               one".

               So the cog is `ui-cog.png` now, baked by the FT-998 noose script
               (the same one FT-1136 used for ui-events) from `ui-cog.svg`,
               both shipped in src/assets/. Being an `<img>` it inherits
               `.player-strip img` — the same 26px box, drop shadow, hover lift
               and coarse-pointer tap box the art beside it already has — so
               the row is now four marks of one family rather than three and a
               glyph. Its OPEN state moves from a colour to a gold glow for the
               same reason (an image has no `color`); see the style block.

               THE GOLEM MARK IS DELIBERATELY LEFT ALONE. It is the platform's
               own brand art — the same golem head the site's tab wears — and
               it is the one thing in this strip that is NOT one of our marks.
               Baking it into the bone family would make the house's signature
               look like a fifth door, which is the opposite of what it is
               here (it does not even take a click; see the note above). -->
          <!-- FT-1198: host-gated exactly like the in-game copy above (see
               the note there). On the entry screen the gate is open in
               practice — leaving a town clears the spectator flag
               (townRoute's leaveTown), so the person at the doors always
               sees the gear — but the two strips must read the same fact. -->
          <!-- FT-1202 (user): the cog left the entry screen entirely — "right
               now all it is is host control settings lets remove it from the
               main page". Its one home is the host panel's head
               (HostTools.vue's `.ht-cog`). Stood down, not deleted. -->
          <img
            v-if="false"
            class="settings-cog"
            :class="{ on: tab === 'settings' }"
            :src="uiCog"
            alt="Your settings"
            title="Your settings — this browser, every town"
            @click="setTab('settings')"
          />
          <!-- FT-1200: the mark is THE ACCOUNT DOOR now — see the entry
               strip's note. (FT-1204 took the signed-in ring off; FT-1202's
               `lit` is a different fact — the door's own panel standing open,
               the same open-state glow every mark in this strip now wears.)
               FT-1320: the same menu as the in-game copy — one mark, one
               dropdown, both strips. -->
          <img
            class="golem-mark"
            :class="{
              'signed-in': !!session.account,
              lit: accountMenuOpen || accountOpen,
            }"
            :src="uiGolem"
            alt="Golem"
            :title="
              session.account
                ? `Golem — signed in as ${
                    session.account.name || session.account.email
                  }`
                : 'Golem — sign in, change log'
            "
            @click="toggleAccountMenu"
          />
        </li>
      </ul>

      <!-- FT-1198: THE SECTION, and only the section, is glass. It renders
           only while a tab is open (`sectionOpen` — which also stands the
           settings section down for a spectator, see the computed), so a
           closed menu is the bare header with no empty plate under it. -->
      <ul class="section-plate" v-if="sectionOpen">
        <!-- FT-1020b: the hourglass's own section — the four hour displays,
             the current one checked. Rows keep the menu's own shape (word
             left, mark right, the Night-order row's check idiom) and stay
             open on a pick so the check is seen to move. -->
        <!-- FT-1333: UNREACHABLE NOW, kept whole — the hourglass mark that
             set `tab === 'tower'` is unmounted above and these four rows
             moved to PlayerSettings.vue's Timer section (same rows, same
             towerBells wiring). This copy stands down with its mark rather
             than being deleted, per the house rule — exactly the retired
             cog section's precedent below. -->
        <template v-if="tab === 'tower'">
          <!-- FT-1020c: the visible word is "Timer" (user call) — the tower
               naming stays internal (tab id, towerBells.js, the strip art). -->
          <!-- FT-1044b (user): no team red/blue on this headline — the word
               flanked by two small clocks on the menu's plain dark ground. -->
          <li class="headline headline-plain">
            <font-awesome-icon :icon="['fas', 'clock']" class="hl-clock" />
            Timer
            <font-awesome-icon :icon="['fas', 'clock']" class="hl-clock" />
          </li>
          <!-- FT-1052: independent toggles, not a radio — Hands, Digital and
               Numerals each on/off in any combination; Off is the DERIVED
               row, checked exactly when none of the three are, and clicking
               it clears them all. -->
          <li
            v-for="m in hourRows"
            :key="m.id"
            :title="m.hint"
            @click="pickHourMode(m.id)"
          >
            {{ m.label }}
            <em>
              <font-awesome-icon
                :icon="['fas', hourChecked(m.id) ? 'check-square' : 'square']"
              />
            </em>
          </li>
          <!-- FT-1055: TICK vs SWEEP re-homed here from the build panel —
               the minute hand's motion is personal taste, per person exactly
               like the display toggles above (a storyteller's pick is the
               town's default, a player's is their own screen's override —
               towerBells.setMinuteTick carries the same split). One small
               two-option row, radio-shaped. -->
          <!-- FT-1061b (user): "remove the tick vs sweep option, only have
               tick" — the row is unmounted; effectiveMinuteTick answers
               tick unconditionally now. Markup kept per the house rule. -->
          <li
            v-if="false"
            class="tw-tick-row"
            title="How the minute hand moves — this screen's own pick"
          >
            <span
              class="tw-tick-opt"
              role="radio"
              :aria-checked="String(menuTick)"
              :class="{ on: menuTick }"
              title="The minute hand steps once a minute, arriving with a short snap"
              @click.stop="pickTick(true)"
              >Tick</span
            >
            <span
              class="tw-tick-opt"
              role="radio"
              :aria-checked="String(!menuTick)"
              :class="{ on: !menuTick }"
              title="The minute hand creeps continuously — the pre-tower glide"
              @click.stop="pickTick(false)"
              >Sweep</span
            >
          </li>
        </template>

        <!-- ── FT-1168: THE PERSONAL SETTINGS ────────────────────────────
             The cog's own section, built out of this menu's existing
             furniture and nothing new: a plain headline (the Timer tab's
             `headline-plain`, flanked by its own mark), then rows in the
             menu's one row shape — word on the left, state on the right,
             the check idiom Night order and the Timer's layers already use.

             THREE SETTINGS, THREE GROUPS, because they are three unrelated
             questions and a flat list of six rows would read as one. The
             small dim group labels are the app's own `label` treatment (see
             the ask panel's, and the build panel's row labels).

             THE WORDS STAY HERE, ALWAYS — icons-only does not reach into
             this menu, and that is a deliberate call, not an oversight. A
             settings menu is where somebody goes precisely because they do
             not remember; stripping its labels would turn the one surface
             that explains the app into the one that needs explaining. What
             the user asked for was a cleaner SETUP PANEL — a surface used
             constantly, whose marks are learned by the tenth game — and
             that is exactly where the setting is applied. -->
        <!-- FT-1202: UNREACHABLE NOW, kept whole. The cog that set
             `tab === 'settings'` left both strips for the host panel's head,
             and the section it opened moved out with it as its own component
             (PrefsMenu.vue — the same headline, rows and glass, anchored to
             the gear's new home). This copy stands down with the cog rather
             than being deleted, per the house rule. -->
        <template v-if="tab === 'settings'">
          <li class="headline headline-plain">
            <!-- FT-1242: FA `cog` stood down — the app's own gear
                 (ui-cog.png, the host panel's settings mark) flanks the
                 word, the same way the strip says "settings" everywhere. -->
            <img class="hl-clock hl-mark" :src="uiCog" alt="" />
            Your settings
            <img class="hl-clock hl-mark" :src="uiCog" alt="" />
          </li>
          <!-- ── FT-1174 (user): ONE ROW PER SETTING, ITS OPTIONS BESIDE IT ─
               "Those should just have a selector next to them for their
               options not checkboxes beneath them."

               FT-1168 spent a ROW PER OPTION: a dim group label, then one
               checkbox line for each thing you could pick. Six lines and three
               labels to say three answers, and the check idiom it borrowed
               belongs to the rows it came from (Night order, the Timer's
               layers) which are genuinely independent toggles — several can be
               on at once. These are not: a control scheme is one of three, a
               grimoire size is one of two. A column of checkboxes says the
               wrong thing about them before it is even read.

               THE CONTROL IS THE APP'S OWN. `OptionSelect` is the dropdown the
               setup panel and the night sheet already wear — the shared plate,
               the widest-option sizing, the plum list, the APG combobox keys.
               Nothing new is invented here; the setting is simply asked with
               the control the app already asks settings with.

               HOISTED, every one of them. `.menu ul` is `overflow: hidden`
               (it is what clips the sections as they open), so a list drawn in
               flow would be shorn off at the menu's own edge — the same
               containment problem FT-1167 hit on the night sheet, answered by
               the same prop it added for it.

               THE OLD ROWS ARE STOOD DOWN, NOT DELETED — `v-if="false"`
               immediately below, methods and all, per the house rule. -->
          <li class="setting-row">
            <span class="setting-name">Setup panel</span>
            <OptionSelect
              name="prefs-setup-labels"
              aria-label="Setup panel labels"
              hoist
              :options="setupLabelOptions"
              :value="prefs.setupIconsOnly"
              @input="setIconsOnly"
            />
          </li>
          <li class="setting-row">
            <span class="setting-name">Control scheme</span>
            <OptionSelect
              name="prefs-control-scheme"
              aria-label="Control scheme"
              hoist
              :options="controlSchemeOptions"
              :value="prefs.controlScheme"
              @input="pickScheme"
            />
          </li>
          <li class="setting-row">
            <span class="setting-name">Grimoire size</span>
            <OptionSelect
              name="prefs-grimoire-size"
              aria-label="Grimoire size"
              hoist
              :options="grimoireSizeOptions"
              :value="prefs.grimoireSize"
              @input="pickGrimoireSize"
            />
          </li>
          <!-- FT-1174: FT-1168's checkbox rows, stood down. Kept whole (the
               group labels and all six lines) so the shape they had is still
               readable beside the shape that replaced them. -->
          <template v-if="false">
            <li class="sub-headline">Setup</li>
            <li
              title="Show the setup panel's settings as marks alone, with no names beside them"
              @click="toggleIconsOnly"
            >
              Icons only
              <em>
                <font-awesome-icon
                  :icon="[
                    'fas',
                    prefs.setupIconsOnly ? 'check-square' : 'square',
                  ]"
                />
              </em>
            </li>
            <li class="sub-headline">Control scheme</li>
            <li
              v-for="s in controlSchemes"
              :key="s.id"
              :title="s.title"
              @click="pickScheme(s.id)"
            >
              {{ s.label }}
              <em>
                <font-awesome-icon
                  :icon="[
                    'fas',
                    prefs.controlScheme === s.id ? 'check-square' : 'square',
                  ]"
                />
              </em>
            </li>
            <li class="sub-headline">Grimoire size</li>
            <li
              v-for="g in grimoireSizes"
              :key="g.id"
              :title="g.title"
              @click="pickGrimoireSize(g.id)"
            >
              {{ g.label }}
              <em>
                <font-awesome-icon
                  :icon="[
                    'fas',
                    prefs.grimoireSize === g.id ? 'check-square' : 'square',
                  ]"
                />
              </em>
            </li>
          </template>
        </template>

        <template v-if="tab === 'grimoire'">
          <!-- Grimoire -->
          <li class="headline">Grimoire</li>
          <!-- FT-1207 stood the Hide/Show item down beside the R key; FT-1294
               (user grant) removes it, with the face-down state it drove. The
               grimoire is always revealed and there is nothing here to flip. -->
          <!-- Golem fork (2026-08-18, user call): Switch to Night, Select
               Edition, Show Custom Images and Disable Animations left the
               menu — redundant beside the workbench/host tools (the S and E
               hotkeys still answer). Methods untouched. -->
          <li v-if="!session.isSpectator" @click="toggleModal('fabled')">
            Add Fabled
            <em><font-awesome-icon icon="dragon" /></em>
          </li>
          <li @click="toggleNightOrder" v-if="players.length">
            Night order
            <em>
              <font-awesome-icon
                :icon="[
                  'fas',
                  grimoire.isNightOrder ? 'check-square' : 'square',
                ]"
              />
            </em>
          </li>
          <li v-if="players.length">
            Zoom
            <em>
              <font-awesome-icon
                @click="setZoom(grimoire.zoom - 1)"
                icon="search-minus"
              />
              {{ Math.round(100 + grimoire.zoom * 10) }}%
              <font-awesome-icon
                @click="setZoom(grimoire.zoom + 1)"
                icon="search-plus"
              />
            </em>
          </li>
          <li @click="toggleMuted">
            Mute Sounds
            <em
              ><font-awesome-icon
                :icon="['fas', grimoire.isMuted ? 'volume-mute' : 'volume-up']"
            /></em>
          </li>
        </template>

        <!-- Golem fork (FT-852): the Characters tab retired — Choose & Assign
             and Remove all live in the host tools; Select Edition and Add
             Fabled relocated into the Grimoire section below so no host
             capability is lost. Methods untouched. -->

        <template v-if="tab === 'help'">
          <!-- Help -->
          <li class="headline">Help</li>
          <!-- FT-857: both entries open the one script drawer, on their tab -->
          <li @click="openScriptDrawer('team')">
            Reference Sheet
            <!-- FT-880: S is the script key now, but for a HOST it opens the
                 editor, not this sheet — so this entry claims no letter
                 rather than promising one that does something else. The
                 strip's scroll mark is its other door. -->
          </li>
          <li @click="openScriptDrawer('first')">
            Night Order Sheet
            <em><KeyCap letter="F" /></em>
          </li>
          <li @click="openScriptDrawer('other')">
            Other Nights
            <em><KeyCap letter="N" /></em>
          </li>
          <li @click="$emit('hotkeys')">
            All keys
            <em><font-awesome-icon icon="question" /></em>
          </li>
          <li @click="toggleModal('gameState')">
            Game State JSON
            <em><font-awesome-icon icon="file-code" /></em>
          </li>
          <!-- Golem fork: the upstream Discord + source-code items are removed
               from the menu. Source availability (GPL) is carried by our public
               fork, credited on the intro screen. -->
        </template>
      </ul>
    </div>

    <!-- THE MENU'S ONE ASK — an inline panel, never prompt()/confirm().
         Every dialog in this file was silently auto-dismissed in dialog-less
         contexts (driven browser panes, embeds, some webviews): a prompt came
         back empty and a confirm came back false, so the caller's own guard
         returned and the control did nothing, with nothing said. That is what
         killed Leave (FT-852), the script editor's save, and the custom
         reminder note.

         WHY A PANEL AND NOT THE PILL'S TWO-CLICK ARM: an arm needs a control
         standing on screen to click a second time. Every door left in this
         file is opened by a KEY (A adds a player, J leaves a town) or is not
         rendered at all — there is nothing to click twice. The arm stays where
         it belongs, on the strip's own door out (`clearTable`, above) and on
         the pill's Leave.

         The destructive ones still ASK: `confirm` mode names what is about to
         happen and takes a second, deliberate press. Cancel is always there,
         and Escape closes it. -->
    <div class="ask-panel" v-if="ask" @click.stop>
      <h3>{{ ask.title }}</h3>
      <p class="ask-note" v-if="ask.note">{{ ask.note }}</p>
      <template v-if="ask.mode === 'input'">
        <label>{{ ask.label }}</label>
        <input
          ref="askInput"
          v-model="ask.value"
          :placeholder="ask.placeholder"
          spellcheck="false"
          @keyup.enter="askOk"
          @keyup.esc="askCancel"
        />
      </template>
      <div class="ask-error" v-if="askError">{{ askError }}</div>
      <div class="ask-acts">
        <div class="button" @click="askCancel">
          <font-awesome-icon icon="times" /> Cancel
        </div>
        <div
          class="button ask-go"
          :class="{ danger: ask.danger }"
          @click="askOk"
        >
          <font-awesome-icon
            :icon="ask.danger ? 'exclamation-triangle' : 'check'"
          />
          {{ ask.okText }}
        </div>
      </div>
    </div>

    <!-- (FT-1010: the town chat's drawer used to be mounted from here onto
         its own body element, because this lane's predecessor was barred from
         App.vue. Chronicles is mounted by App.vue beside the other drawers,
         so that workaround is retired with the ChatDrawer it carried.) -->

    <!-- FT-1200: the account door — the golem mark's panel. The panel is its
         own component (sign-in/sign-up/who-am-I all live there); this menu
         only owns the toggle, exactly like the marks beside it own theirs. -->
    <AccountDoor v-if="accountOpen" @close="accountOpen = false" />

    <!-- FT-1319: THE PLAYER SETTINGS MENU — the strip cog's plate, every
         viewer's own rows (the pin's resting visibility; the vote timer for
         the storyteller; FT-1318's appearance ground). It hoists itself to
         <body> and hangs off the cog it was opened from, PrefsMenu's own
         arrangement — see the component. -->
    <!-- EACH HOISTED PLATE LIVES IN ITS OWN STABLE SLOT DIV, and that is
         load-bearing, not tidiness: these components move their root to
         <body> on mount, so as bare siblings a patch that closes one and
         opens another in the same flush hands Vue an insertBefore reference
         node that is no longer in this parent — a NotFoundError that aborts
         the whole patch (measured: the change log simply never opened while
         the account menu was up). The slot divs never move, so every
         sibling insertion references a real child of this element; the
         hoisting then happens strictly inside each slot. -->
    <div class="hoist-slot">
      <PlayerSettings
        v-if="playerSettingsOpen"
        :anchor="playerSettingsAnchor"
        @close="playerSettingsOpen = false"
      />
    </div>

    <!-- FT-1320: THE GOLEM MARK'S MENU — sign in / sign out (riding the
         account door and golem/account's own logout), the change log, and
         room for the rows that come next. Same hoisted-plate idiom as the
         settings menu above; the mark's old direct-open of the account
         door lives on as this menu's "Sign in" row. -->
    <div class="hoist-slot">
      <AccountMenu
        v-if="accountMenuOpen"
        :anchor="accountMenuAnchor"
        @close="accountMenuOpen = false"
        @account="accountOpen = true"
        @changelog="toggleModal('changeLog')"
      />
    </div>

    <!-- FT-1341: the change log is a right drawer now, on the same rail as
         the script and vote drawers — always mounted, its own `isOpen`
         (store's `modals.changeLog`) decides whether it shows. Data in
         golem/changelog.js, dress in the component. -->
    <ChangeLog />
  </div>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import uiScript from "../assets/ui-script.png";
// (uiVotes left with the gallows door, FT-1019 — the noose art now serves the
// chronicles gallows filter cell instead; the file stays in the tree.)
// the Chronicles quill — the file is still named for its first home
// (ui-chronicle.png) but the drawing on it, a quill in an inkwell, is the one
// door onto the town's whole story now (FT-1010). ui-chat.png stays in the
// tree unused.
import uiQuill from "../assets/ui-chronicle.png";
// FT-1020b: the hourglass — the old town-records door art, back in service
// as the tower's hour-display menu (see the strip's template note).
import uiHourglass from "../assets/ui-records.png";
// FT-1168: the platform's own favicon, standing in the corner as a mark —
// see the entry strip's note for which cut this is and why it does not click.
import uiGolem from "../assets/golem-mark.png";
// FT-1174: the settings cog, baked into the strip's own bone-and-grain family
// (src/assets/ui-cog.svg is its source; see the entry strip's note).
import uiCog from "../assets/ui-cog.png";
// FT-1197: the guide's lantern — the last Font Awesome glyph in the strip,
// baked into the same family (src/assets/ui-help.svg is its source).
import uiHelp from "../assets/ui-help.png";
// FT-1168: THIS PERSON'S SETTINGS — a browser's own, never a town's. The
// module owns the stash, the clamping and the event; this menu is the only
// surface that WRITES them, and each of the three has its own reader
// elsewhere (the build panel's marks, FT-1169's schemes, App's post column).
import {
  CONTROL_SCHEMES,
  GRIMOIRE_SIZES,
  // FT-1174: the two states `setupIconsOnly` names, said out loud — a
  // selector has to have something to put on its face.
  SETUP_LABELS,
  PREFS_EVENT,
  prefsState,
  setPref,
} from "../golem/prefs";
// ...and the menu it opens: the three display layers (FT-1052 — independent
// toggles, Off derived), the split between a storyteller's town-wide pick
// and a player's own-screen one, and the event that says the tower changed
// (another surface, or a host sync, moved it).
import {
  HOUR_LAYERS,
  HOUR_OFF,
  TOWER_EVENT,
  toggleHourLayer,
  effectiveHourFlags,
  hourAllOff,
  // FT-1055: Tick/Sweep re-homed here from the build panel — personal taste,
  // carried by the same host-writes-town / player-overrides-own-screen split.
  effectiveMinuteTick,
  setMinuteTick,
} from "../golem/towerBells";
// (FT-880's town summons lived in this strip; FT-1051 moved the trigger —
// and its playCallBack/CALL_BACK_COOLDOWN imports — to TownInfo.vue.)
// FT-890: leaving a town is one call, not a commit sequence copied per caller.
import { leaveTown, resolveTownRole } from "../golem/townRoute";
// 2026-08-19: joining a town nobody has opened yet is a wait, not an entry —
// the same gate the Join panel and an invite link answer to.
import { enterWhenOpen, normalizeTownId } from "../golem/towns";
import { flashHint } from "../golem/hint";
// FT-880: the index page's key lettering, shared so the menu's badges and the
// key list print a key the same way.
import KeyCap from "./KeyCap";
// FT-1200: the account door the golem mark opens — sign-in, sign-up and
// who-am-I all live in the panel; this menu only mounts and toggles it.
import AccountDoor from "./AccountDoor";
// FT-1319: the player settings menu — the strip cog's own plate.
import PlayerSettings from "./PlayerSettings";
// FT-1320: the golem mark's menu and the change log it opens.
import AccountMenu from "./AccountMenu";
import ChangeLog from "./ChangeLog";
// FT-1174: the app's own dropdown — the setup panel's and the night sheet's,
// worn here so the corner menu asks a multi-option setting the same way every
// other surface does. Used as-is; nothing about the control changed for this.
import OptionSelect from "./OptionSelect";
export default {
  components: {
    KeyCap,
    OptionSelect,
    AccountDoor,
    PlayerSettings,
    AccountMenu,
    ChangeLog,
  },
  props: {
    // FT-1202: the guide panel's open fact — it lives in App.vue
    // (hotkeyHelpOpen; this strip only emits the open), and the lantern's
    // lit state must follow the panel, not the click. A prop, not a second
    // flag here that could drift from the one that actually renders it.
    guideOpen: { type: Boolean, default: false },
  },
  computed: {
    // ── FT-1174: the three settings, in the dropdown's own shape ──────────
    // `{ id, label, title }` is what prefs.js has always published and what
    // every other reader of those lists expects; `{ value, label, title }` is
    // what OptionSelect takes. Mapped here rather than renaming the field in
    // prefs.js, so the stash's vocabulary is untouched by a control choice.
    setupLabelOptions() {
      return SETUP_LABELS;
    },
    controlSchemeOptions() {
      return CONTROL_SCHEMES.map((s) => ({
        value: s.id,
        label: s.label,
        title: s.title,
      }));
    },
    grimoireSizeOptions() {
      return GRIMOIRE_SIZES.map((g) => ({
        value: g.id,
        label: g.label,
        title: g.title,
      }));
    },
    ...mapState([
      "grimoire",
      "session",
      "edition",
      "modals",
      "scriptDrawerView",
      "night",
    ]),
    ...mapState("players", ["players"]),
    // (FT-860's `showNightInfo` gate moved with its door — it lives on as
    // the chronicles' `canSeeNights`, FT-1037b.)
    // the player strip is IN-GAME chrome — on the intro there is no script,
    // no votes and no night to look at (user call, 2026-08-18)
    inGame() {
      return !!this.session.sessionId || this.players.length > 0;
    },
    /** FT-1198: is a section showing? One test for the glass plate's own
     *  render, so a closed menu never draws an empty plate — and the
     *  settings section answers to the host gate as well as to its tab:
     *  the cog is already hidden from spectators, but a section left open
     *  while its owner BECOMES a spectator (joining a town mid-look) must
     *  fold rather than stand as bare glass. */
    sectionOpen() {
      if (this.tab === null) return false;
      if (this.tab === "settings" && this.session.isSpectator) return false;
      return true;
    },
  },
  data() {
    return {
      uiScript,
      uiQuill,
      // FT-1020b/FT-1052: the hourglass tab's furniture — the Off row ahead
      // of the three layer toggles, and a snapshot of the flags this screen
      // currently shows (a plain module object is not reactive;
      // readTowerMode refreshes it on TOWER_EVENT).
      uiHourglass,
      // FT-1168: the corner's house mark, and the cog's own section — the
      // two option lists plus a snapshot of the saved prefs (a plain module
      // object is not reactive; readPrefs refreshes it on PREFS_EVENT, the
      // same shape `towerHour` above already runs on).
      uiGolem,
      // FT-1174: the strip's cog, now one of the baked marks beside it
      uiCog,
      // FT-1197: the guide's lantern, ditto
      uiHelp,
      controlSchemes: CONTROL_SCHEMES,
      grimoireSizes: GRIMOIRE_SIZES,
      prefs: { ...prefsState },
      hourRows: [HOUR_OFF, ...HOUR_LAYERS],
      towerHour: effectiveHourFlags(this.$store.state.session),
      // FT-1055: the minute hand's motion on THIS screen — refreshed with
      // the flags above on TOWER_EVENT.
      menuTick: effectiveMinuteTick(this.$store.state.session),
      // (FT-880's callBackCooling/-Timer pair moved to TownInfo.vue with
      // the summons trigger, FT-1051.)
      // The townless table's door out — held here rather than in the store:
      // it is about this one button's feel, not about the town's state.
      clearArmed: false,
      // FT-1200: the account door (AccountDoor.vue) — open or not. Panel
      // state only; who is signed in lives in the store (session.account).
      accountOpen: false,
      clearTimer: null,
      // FT-1319: the player settings menu — open or not, and the strip cog
      // it hangs from (the element, PrefsMenu's own anchor contract).
      playerSettingsOpen: false,
      playerSettingsAnchor: null,
      // FT-1320: the golem mark's menu — same pair, same contract. One pair
      // serves both strips: the anchor is whichever mark was clicked.
      accountMenuOpen: false,
      accountMenuAnchor: null,
      // FT-1341: stood down, not deleted — the change log moved onto the
      // right-hand rail and reads its own open state from the store
      // (`modals.changeLog` via ChangeLog.vue's rightDrawer mixin), the way
      // the script and vote drawers already do. Nothing reads this flag now.
      changelogOpen: false,
      // The inline ask panel (see its markup for why it exists): null, or
      // { mode, title, note, label, value, placeholder, okText, danger,
      //   allowEmpty, onOk }.
      ask: null,
      askError: "",
      // Golem fork: null = collapsed to the bare toolbar (the default).
      tab: null,
    };
  },
  // (FT-1010: FT-965's body-mounted ChatDrawer stood itself up here — a
  // workaround for that lane being barred from App.vue, where the other
  // drawers mount. Chronicles mounts from App.vue like the rest, so the
  // workaround retired with the drawer it carried.)
  mounted() {
    // FT-1020b: the tower can change from three places — this tab, the build
    // panel's segment, a host's sync arriving — and the check here must
    // follow all of them.
    window.addEventListener(TOWER_EVENT, this.readTowerMode);
    // FT-1168: the same one-way shape for the personal prefs — this menu
    // writes them, and every surface (including this one) re-reads on the
    // event rather than holding a second copy that could drift.
    window.addEventListener(PREFS_EVENT, this.readPrefs);
  },
  beforeDestroy() {
    window.removeEventListener(TOWER_EVENT, this.readTowerMode);
    window.removeEventListener(PREFS_EVENT, this.readPrefs);
    // FT-1174: a section open at teardown leaves two document listeners behind
    // it; the `tab` watcher only fires on a CHANGE, and being unmounted is not
    // one. Idempotent, so calling it with nothing watching is free.
    this.unwatchOutside();
    clearTimeout(this.clearTimer);
  },
  watch: {
    // The intro screen's "Menu" button flips the store flag the old gear used;
    // honour it by expanding the first section.
    "grimoire.isMenuOpen"(open) {
      if (open && this.tab === null) this.tab = "grimoire";
    },
    /**
     * FT-1174 (user): "clicking outside of a settings, or timer menu when it
     * is open should close it."
     *
     * ONE PLACE, NOT ONE PER MENU. `tab` is the single fact "a section of this
     * strip is showing" — every section, the two the user named and the three
     * they did not, and any future one the moment it is added. Written into
     * `setTab` or into the cog's own handler this would be a behaviour the
     * next section silently lacked; written here it is a property of the strip
     * itself. (Behaviour only — nothing about what a section IS changes.)
     */
    tab(now, before) {
      if (now && !before) this.watchOutside();
      if (!now && before) this.unwatchOutside();
    },
  },
  methods: {
    /** FT-1159: the entry screen's corner mark → the Records page, on its
     *  landing view. No pick: from the entry screen there is no game in hand
     *  to open onto, only "every town on the platform" — the same two commits
     *  Intro's retired Records door made. */
    openRecords() {
      this.$store.commit("setRecordsPick", null);
      this.$store.commit("toggleModal", "records");
    },
    // Click the open tab → collapse to the toolbar; click another → switch.
    setTab(name) {
      this.tab = this.tab === name ? null : name;
    },
    /** FT-1319: the strip cog's own toggle — the anchor is the clicked
     *  element (HostTools' togglePrefs idiom), so the plate hangs from the
     *  mark that opened it without a ref that could go stale. */
    togglePlayerSettings(ev) {
      if (!this.playerSettingsOpen) {
        this.playerSettingsAnchor = ev.currentTarget;
      }
      this.playerSettingsOpen = !this.playerSettingsOpen;
    },
    /** FT-1320: the golem mark's toggle — one handler for both strips; the
     *  anchor is whichever mark was clicked. */
    toggleAccountMenu(ev) {
      if (!this.accountMenuOpen) {
        this.accountMenuAnchor = ev.currentTarget;
      }
      this.accountMenuOpen = !this.accountMenuOpen;
    },
    // ── FT-1174: A SECTION CLOSES WHEN YOU LOOK AWAY ─────────────────────
    /**
     * MOUSEDOWN, NOT CLICK, and this is the whole reason the pair exists.
     * The gesture that OPENS a section is a `click` on its mark, and a
     * document-level `click` listener registered while handling that click
     * still receives the very same event as it finishes bubbling — the menu
     * would shut in the same gesture that opened it. `mousedown` has already
     * been and gone by then, so the listener's first event is the NEXT press.
     * OptionSelect's own `onDocDown` is registered for exactly this reason and
     * is the precedent.
     *
     * Escape rides along on the same switch: same door, one line, and a
     * keyboard user should not have to find the mark again to close it.
     */
    watchOutside() {
      document.addEventListener("mousedown", this.onOutsideDown);
      document.addEventListener("keydown", this.onOutsideKey);
    },
    unwatchOutside() {
      document.removeEventListener("mousedown", this.onOutsideDown);
      document.removeEventListener("keydown", this.onOutsideKey);
    },
    /**
     * Outside = not in this strip, and not in a popup this strip opened.
     *
     * THE SECOND TEST IS THE ONE THAT MATTERS. A dropdown inside the settings
     * section HOISTS its list to `<body>` (OptionSelect's `hoist`, and the
     * same for `golem/floatingPicker`'s `.sp-list` / `.cp-list` elsewhere in
     * this app), so the list is NOT a descendant of `#controls` and a plain
     * containment check would close the whole section the instant somebody
     * reached for one of its own options. The three hoisted popup classes this
     * app has are named here rather than a general "is it floating" guess.
     *
     * IT NEVER EATS THE CLICK. No preventDefault, no stopPropagation, and
     * nothing is moved out from under the pointer — the section is in the
     * corner, so the seat or the door being clicked is still there when the
     * mouseup lands. Closing and doing the thing are not alternatives.
     */
    onOutsideDown(e) {
      const t = e.target;
      if (!t || typeof t.closest !== "function") return;
      if (this.$el.contains(t)) return;
      if (t.closest(".gsel-menu, .sp-list, .cp-list")) return;
      this.tab = null;
    },
    /**
     * Escape closes the section — unless something nearer owns the key. An
     * open dropdown answers Escape on its own trigger and the inline ask is
     * modal, and closing the section out from under either would take away
     * the very thing the key was pressed at.
     *
     * `defaultPrevented` IS THE TEST, not "is a list in the DOM". The first
     * version of this asked the document whether a `.gsel-menu` was still
     * standing, and it was wrong: a microtask checkpoint runs between one
     * listener and the next, so Vue has already flushed the list out of the
     * DOM by the time this handler sees the same keypress — the section
     * closed along with the dropdown every time. Measured, not reasoned
     * around. What survives the flush is the flag the nearer handler set:
     * OptionSelect's Escape calls `preventDefault`, so a prevented Escape is
     * one somebody closer has already answered.
     */
    onOutsideKey(e) {
      if (e.key !== "Escape") return;
      if (e.defaultPrevented) return;
      if (this.ask) return;
      this.tab = null;
    },
    // ── FT-1020b: the hourglass tab ──────────────────────────────────────
    /** The tower moved (any surface) — re-read which layers this screen
     *  shows (session passed so a storyteller's checks track the TOWN's
     *  flags, never a stale player-era override — FT-1020c). */
    readTowerMode() {
      this.towerHour = effectiveHourFlags(this.session);
      this.menuTick = effectiveMinuteTick(this.session);
    },
    /** FT-1055: one Tick/Sweep pick — towerBells owns the host-vs-player
     *  split, exactly as pickHourMode below. */
    pickTick(tick) {
      setMinuteTick(this.session, tick);
    },
    /** FT-1052: is this row's check on? Off is DERIVED — checked exactly
     *  when none of the three layers are. */
    hourChecked(id) {
      if (id === "off") return hourAllOff(this.towerHour);
      return !!this.towerHour[id];
    },
    /** One layer toggled (or Off clearing all three). towerBells owns the
     *  host-vs-player split. */
    pickHourMode(id) {
      toggleHourLayer(this.session, id);
    },
    // ── FT-1168: the cog's section ───────────────────────────────────────
    /** A pref changed anywhere — re-read the snapshot this menu renders. */
    readPrefs() {
      this.prefs = { ...prefsState };
    },
    // FT-1174: the selector hands back the state it wants, rather than the
    // row asking for the opposite of the one it has. (toggleIconsOnly below
    // is the stood-down rows' own writer and stays with them.)
    setIconsOnly(on) {
      setPref("setupIconsOnly", on);
    },
    toggleIconsOnly() {
      setPref("setupIconsOnly", !this.prefs.setupIconsOnly);
    },
    /** FT-1168 persists the CHOICE; FT-1169 builds what the three schemes
     *  actually do. Picking one today changes what golem/prefs reports and
     *  nothing on the board — deliberately, so that lane has one stash to
     *  read instead of inventing a second. */
    pickScheme(id) {
      setPref("controlScheme", id);
    },
    /** Small or large for the storyteller's post — the grimoire book, the
     *  End-day button under it and the summons bell above it, which are one
     *  column and scale as one (App.vue's `.storyteller-post`). */
    pickGrimoireSize(id) {
      setPref("grimoireSize", id);
    },
    /**
     * FT-857: the strip's script + night icons open ONE drawer on their own
     * tab. Clicking the icon whose tab is already showing closes it, so each
     * icon still feels like a toggle.
     */
    openScriptDrawer(view) {
      if (this.modals.scriptDrawer && this.scriptDrawerView === view) {
        this.toggleModal("scriptDrawer");
        return;
      }
      this.$store.commit("setScriptDrawerView", view);
      if (!this.modals.scriptDrawer) this.toggleModal("scriptDrawer");
    },
    // (FT-880's callTownBack moved to TownInfo.vue with its trigger,
    // FT-1051 — one owner for the button and the press.)
    // ── the inline ask ───────────────────────────────────────────────────
    /**
     * Open the panel. `onOk` receives the trimmed text in "input" mode and
     * nothing in "confirm" mode; Cancel and Escape both close without calling
     * it, so cancelling is always possible and always visible.
     */
    openAsk(opts) {
      this.askError = "";
      this.ask = {
        mode: "input",
        title: "",
        note: "",
        label: "",
        value: "",
        placeholder: "",
        okText: "OK",
        danger: false,
        allowEmpty: false,
        onOk: () => {},
        ...opts,
      };
      if (this.ask.mode !== "input") return;
      this.$nextTick(() => {
        const el = this.$refs.askInput;
        if (el) {
          el.focus();
          el.select();
        }
      });
    },
    askCancel() {
      this.ask = null;
      this.askError = "";
    },
    askOk() {
      const a = this.ask;
      if (!a) return;
      if (a.mode === "input") {
        const value = (a.value || "").trim();
        // Empty is a no-op for most asks, and a REAL ANSWER for the ones that
        // clear a setting (the background). Saying so beats closing silently —
        // a silent close is the failure this panel replaces.
        if (!value && !a.allowEmpty) {
          this.askError = "Type something first, or cancel.";
          return;
        }
        this.ask = null;
        this.askError = "";
        a.onOk(value);
        return;
      }
      this.ask = null;
      this.askError = "";
      a.onOk();
    },
    setBackground() {
      this.openAsk({
        title: "Custom background",
        note: "Leave it empty to go back to the default background.",
        label: "Image URL",
        value: this.grimoire.background || "",
        placeholder: "https://…",
        okText: "Apply",
        allowEmpty: true,
        onOk: (background) => this.$store.commit("setBackground", background),
      });
    },
    hostSession() {
      if (this.session.sessionId) return;
      this.openAsk({
        title: "Open a town",
        label: "Channel number / name",
        value: String(Math.round(Math.random() * 10000)),
        okText: "Open",
        onOk: (sessionId) => {
          this.$store.commit("session/clearVoteHistory");
          this.$store.commit("session/setSpectator", false);
          this.$store.commit("session/setSessionId", sessionId);
          this.copySessionUrl();
        },
      });
    },
    copySessionUrl() {
      const link = window.location.origin + "/" + this.session.sessionId;
      navigator.clipboard.writeText(link);
    },
    /**
     * Deal the assigned characters out to the seated players. No confirm:
     * starting the game IS the intent, and a native dialog is worse than
     * redundant here — driven and embedded contexts auto-dismiss it, which
     * returns false and silently swallows the deal (the same trap FT-852
     * hit on Leave). (user call 2026-08-18)
     */
    distributeRoles() {
      if (this.session.isSpectator) return;
      // FT-1084: THE DEAL WRITES THE LIES TOO — the demon's three bluffs
      // and every believing seat's believed character, chosen here from the
      // characters this script is not using. It runs BEFORE the mutation
      // below and that ordering is the whole delivery story: the socket
      // plugin's handlers for both fields stay silent until roles are
      // distributed, so nothing leaves early and the deal one line later
      // carries the finished set down the private paths it already had.
      // Defaults only — the storyteller changes either afterwards exactly
      // as before, and the next deal rolls a fresh set.
      this.$store.dispatch("players/dealLies");
      // FT-1117: ...and every reminder a seated character declares as
      // auto-dealt — the Fortune Teller's red herring lands on a good seat
      // here instead of being hunted down in the picker after every deal.
      // Grimoire-only: `reminders` never leaves this browser (socket.js's
      // sendPlayer drops the property), so the ordering note above does not
      // apply to it — there is no wire path to be early or late for.
      this.$store.dispatch("players/dealReminders");
      this.$store.commit("session/distributeRoles", true);
      // FT-999 revealed the grimoire here, because dealing is the moment the
      // storyteller starts running the town and face-down coins were one more
      // key press every single game. FT-1294: they rest revealed always now,
      // so the deal has nothing to reveal.
      setTimeout(
        (() => {
          this.$store.commit("session/distributeRoles", false);
        }).bind(this),
        2000,
      );
    },
    imageOptIn() {
      // Turning it OFF is not a risk and never asked; turning it ON still
      // asks, because the warning is the whole point of the question.
      if (this.grimoire.isImageOptIn) return this.toggleImageOptIn();
      this.openAsk({
        mode: "confirm",
        title: "Allow custom images?",
        note: "A malicious script file author might track your IP address this way.",
        okText: "Allow images",
        danger: true,
        onOk: () => this.toggleImageOptIn(),
      });
    },
    joinSession() {
      if (this.session.sessionId) return this.leaveSession();
      this.openAsk({
        title: "Join a town",
        label: "Channel number / name",
        placeholder: "a name, a number, or an invite link",
        okText: "Join",
        onOk: (entered) => this.enterSession(entered),
      });
    },
    /**
     * The join itself, given what was typed. Split out of joinSession so the
     * asking and the entering are separable — the panel hands this the text
     * once the second press lands.
     */
    enterSession(typed) {
      let sessionId = typed;
      if (sessionId.match(/^https?:\/\//i)) {
        const hashAt = sessionId.indexOf("#");
        sessionId =
          hashAt >= 0
            ? sessionId.slice(hashAt + 1)
            : sessionId.replace(/^https?:\/\/[^/]+\/?/i, "").split(/[/?]/)[0];
      }
      if (sessionId) {
        const enter = () => {
          this.$store.commit("session/clearVoteHistory");
          this.$store.commit("session/setSpectator", true);
          // FT-1294: the joiner's own `toggleGrimoire(false)` went with the
          // face-down state — see golem/townRoute, the other entry path.
          this.$store.commit("session/setSessionId", sessionId);
        };
        // 2026-08-19: THE SAME GATE the Join panel and an invite link answer
        // to — a town no storyteller has opened is waited for, not entered.
        // A host is never gated: opening a town is exactly the moment nobody
        // is connected to it.
        if (resolveTownRole(sessionId) === "host") return enter();
        enterWhenOpen(sessionId, enter).then((entered) => {
          // This door can be reached with seats already on the table, where
          // the entry screen — and so the waiting panel — is not rendered.
          // The transient notice is the only surface guaranteed to be here.
          if (entered) return;
          const town = normalizeTownId(sessionId);
          flashHint(`${town} isn't open yet — waiting for its storyteller.`);
        });
      }
    },
    // FT-852: `confirmed === true` (the pill's own two-click arm) leaves
    // straight away — the arm WAS the asking. Every other caller gets the
    // inline panel; there is no native confirm() left here, because a driven
    // or embedded context auto-dismissed it and deadened the caller.
    leaveSession(confirmed) {
      if (confirmed === true) return this.doLeaveTown();
      this.openAsk({
        mode: "confirm",
        title: "Leave the active live game?",
        note: "The town keeps running. You can come back to it by name.",
        okText: "Leave",
        danger: true,
        onOk: () => this.doLeaveTown(),
      });
    },
    doLeaveTown() {
      // Golem fork: ONE way out of a town, shared with a Back press and
      // with a relay-initiated close — leaveTown owns what leaving has to
      // take with it (seats, bluffs, fabled, any live nomination), because
      // clearing the session id alone leaves the sessionless in-person
      // square standing. An owned town re-loads its saved script when
      // re-hosted.
      leaveTown(this.$store);
    },
    addPlayer() {
      if (this.session.isSpectator) return;
      if (this.players.length >= 20) return;
      this.openAsk({
        title: "Add a player",
        label: "Player name",
        okText: "Add",
        onOk: (name) => this.$store.commit("players/add", name),
      });
    },
    randomizeSeatings() {
      if (this.session.isSpectator) return;
      this.openAsk({
        mode: "confirm",
        title: "Randomize the seating?",
        note: "Everyone at the table moves to a new chair.",
        okText: "Randomize",
        danger: true,
        onOk: () => this.$store.dispatch("players/randomize"),
      });
    },
    /**
     * THE TOWNLESS TABLE'S DOOR — arm on the first click, clear on the second.
     * See the strip's own note for why it is there and why there is no dialog
     * in it.
     *
     * It calls leaveTown, not players/clear, because a table standing with no
     * town behind it is a HALF-LEFT town, and leaving is what has to finish:
     * the bluffs, the fabled and any live nomination are the same local mirror
     * the seats are, and clearing the roster alone would leave them standing on
     * the entry screen. leaveTown is the app's one way out and already owns
     * that list — the pill's Leave, a Back press and a relay-initiated close
     * all end there too (golem/townRoute).
     *
     * NO SPECTATOR GUARD, deliberately, unlike clearPlayers below. With no
     * session there is no storyteller and no player, only a browser holding
     * seats — and a stale spectator flag turning the one unsticking control
     * into a no-op is precisely the failure this exists to end.
     */
    clearTable() {
      if (!this.clearArmed) {
        this.clearArmed = true;
        flashHint("Click the door again to clear the table and go back.");
        this.clearTimer = setTimeout(() => {
          this.clearArmed = false;
        }, 3000);
        return;
      }
      clearTimeout(this.clearTimer);
      this.clearArmed = false;
      leaveTown(this.$store);
    },
    // `confirmed === true` skips the asking, exactly as leaveSession above
    // does and for the same reason — a caller that has already armed (the
    // pill's two-click door) has asked once and must not ask twice. Anything
    // else gets the inline panel. (Unreachable from the UI today: the menu
    // section it belonged to has no tab left to open it.)
    clearPlayers(confirmed) {
      if (this.session.isSpectator) return;
      if (confirmed === true) return this.doClearPlayers();
      this.openAsk({
        mode: "confirm",
        title: "Remove all players?",
        note: "Every chair is emptied. This cannot be undone.",
        okText: "Remove all",
        danger: true,
        onOk: () => this.doClearPlayers(),
      });
    },
    doClearPlayers() {
      // abort vote if in progress
      if (this.session.nomination) {
        this.$store.commit("session/nomination");
      }
      // FT-1311 (the stuck noose): the mark is a seat index into the roster
      // this next commit empties — left standing, it re-hanged whichever
      // future chair inherited the number the moment enough seats were
      // added again. An empty town has no one on the block.
      if (this.session.markedPlayer !== -1) {
        this.$store.commit("session/setMarkedPlayer", -1);
      }
      this.$store.commit("players/clear");
    },
    clearRoles(confirmed) {
      if (confirmed === true) {
        return this.$store.dispatch("players/clearRoles");
      }
      this.openAsk({
        mode: "confirm",
        title: "Remove all player roles?",
        note: "The chairs stay; every character on them is taken off.",
        okText: "Remove roles",
        danger: true,
        onOk: () => this.$store.dispatch("players/clearRoles"),
      });
    },
    toggleNight() {
      this.$store.commit("toggleNight");
      if (this.grimoire.isNight) {
        this.$store.commit("session/setMarkedPlayer", -1);
      }
    },
    ...mapMutations([
      "toggleMenu",
      "toggleImageOptIn",
      "toggleMuted",
      "toggleNightOrder",
      "toggleStatic",
      "setZoom",
      "toggleModal",
    ]),
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
// FT-1193: the glass this menu is made of — `face-disc-menu-plate`, the same
// material the seat's plate, the centre disc and the entry panels wear.
@import "../faceDisc.scss";
// FT-1198: the sunken well the settings selectors sit in — `$control-toggle-
// well` is the app's one "recessed control" shadow (controls.scss; RoleActions'
// Dupes toggle wears it). Variables and mixins only, nothing emitted.
@import "../controls.scss";

// success animation
@keyframes greenToWhite {
  from {
    color: green;
  }
  to {
    color: white;
  }
}

// Controls
#controls {
  position: absolute;
  right: 3px;
  top: 3px;
  text-align: right;
  padding-right: 50px;
  z-index: 75;

  svg {
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 1));
    &.success {
      animation: greenToWhite 1s normal forwards;
      animation-iteration-count: 1;
    }
  }

  > span {
    display: inline-block;
    cursor: pointer;
    z-index: 5;
    margin-top: 7px;
    margin-left: 10px;
  }

  span.nomlog-summary {
    color: $townsfolk;
  }

  span.session {
    color: $demon;
    &.spectator {
      color: $townsfolk;
    }
    &.reconnecting {
      animation: blink 1s infinite;
    }
  }
}

@keyframes blink {
  50% {
    opacity: 0.5;
    color: gray;
  }
}

.menu {
  // Golem fork: no gear, no fold-away rotation — the tab row is a standing
  // toolbar; only the SECTION below it comes and goes.
  width: 220px;
  position: absolute;
  right: 0;
  top: 0;

  // collapsed = the strip alone: hug the icons instead of stretching them
  // across a 220px section width (user call — the gaps read as dead space)
  &.collapsed {
    width: auto;
  }

  // FT-1044b (user): opening the Timer must not widen the box — the section
  // keeps the strip's own width instead of the 220px section default.
  &.strip-width {
    width: auto;
  }

  // FT-1174: the settings section is a column of NAME + DROPDOWN rows, and the
  // dropdowns size themselves to their widest option (OptionSelect's sizer
  // stack). 220px cannot hold "Control scheme" beside "Nameplate click", and
  // `ul` is `overflow: hidden`, so the shortfall would be a silent crop rather
  // than a visible one. Shrink-to-fit instead: the rows say how wide the panel
  // is. Safe now that the strip is right-justified below — a wider section
  // grows LEFTWARDS from a pinned right edge and the marks do not move.
  &.auto-width {
    width: auto;
  }

  a {
    color: white;
    text-decoration: none;
    &:hover {
      color: red;
    }
  }

  ul {
    display: flex;
    list-style-type: none;
    padding: 0;
    margin: 0;
    flex-direction: column;
    overflow: hidden;

    // ── FT-1193 → FT-1198: THE GLASS, NOW ON THE SECTION ALONE ───────────
    // FT-1193 laid `face-disc-menu-plate` on this whole ul — strip and open
    // section in one plate, because they were one bordered object. FT-1198
    // (user): "I didn't mean all of this being glass. Just the part where
    // below the player strip... make it more of a controls header?" — so the
    // one ul is two now, and the material follows the split:
    //
    //   ul.strip-bar       the CONTROLS HEADER. Not glass: a slim dark bar
    //                      in the app's own hairline treatment (the
    //                      NumberScrub resting field's plum-on-near-black,
    //                      FT-1170), so the standing marks read as chrome
    //                      and the thing that opens under them reads as a
    //                      surface.
    //   ul.section-plate   the SECTION — the settings rows, the timer rows,
    //                      grimoire, help — and the only thing on the glass.
    //
    // THE NOTCH IS RETIRED WITH THE SPLIT. `10px 0 10px 10px` squared the
    // top-right corner because the strip ran up to the window's own corner
    // as part of the plate; a detached plate standing 4px below a header has
    // no corner to meet, so it rounds all four and the header does the same.
    //
    // `position: relative` on the section IS LOAD-BEARING. The plate's two
    // layers are `absolute; inset: 0`; without a positioned host they would
    // resolve against `.menu` and tint the header too — the exact look this
    // split exists to end.
    &.strip-bar {
      // the marks' hover glow (drop-shadow filters) must not be sheared by
      // the bar — only the SECTION needs the clip, for its opening rows
      overflow: visible;
      background: rgba(12, 8, 16, 0.55);
      border: 1px solid rgba(120, 105, 135, 0.3);
      border-radius: 10px;
      box-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
    }
    &.section-plate {
      position: relative;
      margin-top: 4px;
      @include face-disc-menu-plate($radius: 10px);
    }
    // STOOD DOWN, FT-1193 — the plate brings its own edge (a plum hairline
    // inside a bronze thread) and its own outer shadow.
    //   box-shadow: 0 0 10px black;
    //   border: 3px solid black;
    //   border-radius: 10px 0 10px 10px;
    // Golem fork: collapsed = the toolbar alone, corners fully rounded.

    li {
      padding: 2px 5px;
      color: white;
      text-align: left;
      // STOOD DOWN, FT-1193: `background: rgba(0, 0, 0, 0.7)`. Every row
      // carried its own opaque-ish ground, and a plate under thirty of them is
      // a plate nobody can see — the glass would have been a rim around a
      // black box. The darkness the words need is the plate's tint ramp now,
      // declared once for the whole surface instead of once per row.
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 30px;

      &.tabs {
        display: flex;
        padding: 0;
        svg {
          flex-grow: 1;
          flex-shrink: 0;
          height: 35px;
          border-bottom: 3px solid black;
          border-right: 3px solid black;
          padding: 5px 0;
          cursor: pointer;
          transition: color 250ms;
          &:hover {
            color: red;
          }
          &:last-child {
            border-right: 0;
          }
        }
        &.grimoire .fa-book-open,
        &.players .fa-users,
        &.characters .fa-theater-masks,
        &.help .fa-question {
          background: linear-gradient(
            to bottom,
            $townsfolk 0%,
            rgba(0, 0, 0, 0.5) 100%
          );
        }
      }

      &:not(.headline):not(.tabs):hover {
        cursor: pointer;
        color: red;
      }

      em {
        flex-grow: 0;
        font-style: normal;
        margin-left: 10px;
        font-size: 80%;
      }
    }

    .headline {
      font-family: PiratesBay, sans-serif;
      letter-spacing: 1px;
      padding: 0 10px;
      text-align: center;
      justify-content: center;
      background: linear-gradient(
        to right,
        $townsfolk 0%,
        rgba(0, 0, 0, 0.5) 20%,
        rgba(0, 0, 0, 0.5) 80%,
        $demon 100%
      );

      // FT-1044b (user): the Timer headline sheds the team gradient — plain
      // dark ground, the word flanked by two small clocks.
      &.headline-plain {
        background: rgba(0, 0, 0, 0.5);
        gap: 8px;
      }
      .hl-clock {
        font-size: 75%;
        opacity: 0.75;
      }
      /* FT-1242: the settings headline's flanking gears are the baked art
         now — img needs its box stated where FA rode font-size. */
      img.hl-mark {
        width: 13px;
        height: 13px;
        object-fit: contain;
      }
    }

    // FT-1168: A GROUP LABEL inside the cog's section — the three settings
    // are three unrelated questions and want naming apart. Not a `.headline`:
    // that is the SECTION's own title (one per tab, gradient or plain), and a
    // second one three rows down would read as a second tab having opened.
    // This is the app's small dim `label` treatment instead — the ask panel's
    // and the build panel's rows wear the same one.
    li.sub-headline {
      justify-content: flex-start;
      min-height: 0;
      padding: 6px 10px 1px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.45;
      cursor: default;
    }

    // FT-1055: the Tick/Sweep pair — one small row, two words, the active
    // one wearing the tower menu's own gold (FaceHands' .tw-mode.on idiom).
    li.tw-tick-row {
      justify-content: center;
      gap: 10px;
    }
    .tw-tick-opt {
      padding: 1px 10px;
      border: 1px solid transparent;
      border-radius: 4px;
      font-size: 90%;
      &:hover {
        color: red;
      }
      &.on {
        color: #0d0a12;
        background: #caa662;
        border-color: #caa662;
        &:hover {
          color: #0d0a12;
        }
      }
    }
  }
}
/* FT-1174 (user): "The icons at the top jump when the menu opens, stop them
   from doing that by justifying them on the right side even when the settings
   is open."

   THE ROW WAS CENTRED IN A BOX THAT CHANGES WIDTH. `.menu` is pinned by its
   RIGHT edge (`right: 0`) and its width depends on what is open — `auto` when
   collapsed, `auto` for the Timer, `auto` for the settings section, 220px for
   the rest — so every open widens the strip leftwards, and a centred row put
   half of that new width in front of the marks. Measured before the fix, the
   settings section moved the whole icon row 50.4px left; the mark that had
   just been clicked slid out from under the pointer that clicked it.

   `flex-end` pins the row to the edge the box itself is pinned to, so the
   marks stand still and the section grows behind them. When the menu is
   collapsed the box hugs the row and flex-end is indistinguishable from the
   centre it replaces — which is the point: one rule, both states, no jump. */
.menu ul li.player-strip {
  justify-content: flex-end;
  gap: 10px;
  padding: 3px 10px;
  min-height: 0;
}
.player-strip img {
  width: 26px;
  height: 26px;
  cursor: pointer;
  filter: drop-shadow(0 1px 2px black);
}
/* THE STRIP IS ONE SET, not a row of PNGs with some icons after it.
   Two of the marks are our engraved art and two are Font Awesome, and the
   glyphs arrive already carrying `.tabs svg` from further up this file — 35px
   tall, 5px of vertical padding, black borders down two sides. That is the OLD
   tab treatment, and it out-specifies a plain `.player-strip svg`: measured,
   it stood the two new marks 26x35 beside the art's 26x26, and on a phone gave
   them a 29x48 tap box against the art's 42x42.

   Hence `li.tabs.player-strip` — the same row the old rule matches, named
   precisely enough to outrank it rather than tie with it on source order.
   Same 26px box, same shadow, same hover, so the eye reads four marks of one
   family and a finger finds four boxes of one size. */
.menu ul li.tabs.player-strip svg {
  width: 26px;
  height: 26px;
  flex-grow: 0;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  cursor: pointer;
  color: #e8e2d4;
  filter: drop-shadow(0 1px 2px black);
  transition:
    color 200ms,
    filter 200ms;
}
.menu ul li.tabs.player-strip svg:hover {
  color: #fff;
  filter: drop-shadow(0 1px 2px black) brightness(1.3);
}
/* Just-pressed: the bell steps back and stops taking clicks for the cooldown,
   so a second press has something to say no with that the storyteller can
   see. It does not vanish — a control that disappears under your finger reads
   as a fault, not as a wait. */
.menu ul li.tabs.player-strip svg.call-back.cooling {
  color: #7a736a;
  cursor: default;
  pointer-events: none;
}
/* ARMED — the townless table's door, waiting for its second click. It goes the
   pill Leave's red rather than dimming like the cooling bell: the bell is
   saying "not yet", this is saying "again and it happens", and those must not
   look alike. Same box, same row — only the colour moves, so the strip still
   reads as one set. */
.menu ul li.tabs.player-strip svg.clear-table.armed {
  color: #d33;
  filter: drop-shadow(0 1px 2px black) brightness(1.25);
}
/* The scroll and the gallows are the only two doors a PLAYER has in a running
   game — the script and the vote history — and they were 26px marks with no
   box around them. The art keeps its size; the box a finger has to find grows
   under it. */
@media (pointer: coarse) {
  .menu ul li.player-strip {
    gap: 4px;
    padding: 0 4px;
  }
  .player-strip img,
  .menu ul li.tabs.player-strip svg {
    box-sizing: content-box;
    padding: 8px;
  }
}
.player-strip img:hover {
  filter: drop-shadow(0 1px 2px black) brightness(1.3);
}
/* FT-1168: THE COG IS OPEN — the tower menu's own gold (`.tw-tick-opt.on`),
   not a new colour. The strip has never marked which section is showing,
   which was fine while the only one was the Timer's four rows; a settings
   menu is somewhere you leave open while you look at what it changed, and a
   door with no lit state means hunting for the one that is.

   FT-1174: the cog is baked art now, and an image has no `color` to set. The
   lit state says the SAME THING in the only language a bitmap speaks — the
   same gold, laid on as a glow around the mark rather than poured into it,
   over the drop shadow every mark in this strip already wears. The rule below
   is kept as it was rather than deleted: it is the record of what the glyph
   wore, and it costs nothing while nothing matches it. */
.menu ul li.tabs.player-strip svg.settings-cog.on {
  color: #caa662;
}
.menu ul li.tabs.player-strip svg.settings-cog.on:hover {
  color: #e2c98a;
}
/* FT-1202 (user): "either have all of them glow or none of them (I like the
   glow), but also bring the settings menu into the same slightly less bright
   style." The cog's open-state gold — the two rules stood down just below —
   was the only lit state in the strip; it is EVERY mark's now, one rule, the
   `lit` class each mark carries while the surface it opens is up (the script
   drawer, the chronicles, the tower section, the guide, the account panel —
   and the gear's own menu in its new home, HostTools' head, which wears this
   same recipe). Taken down half a step on the way, per the ask: the halo
   0.95→0.8, the lift 1.1→1.06 (hover 1.22→1.18), so an open door reads as
   lit, not lamped.

   THE GOLEM-MARK TERMS are specificity, not decoration: FT-1204's
   `.golem-mark.signed-in` rule (four simple selectors) out-ranks a plain
   `.player-strip img.lit` (three), so a signed-in mark with its panel open
   would have stayed flat — measured on the first draft of this rule. */
.player-strip img.lit,
.player-strip img.golem-mark.signed-in.lit {
  filter: drop-shadow(0 1px 2px black)
    drop-shadow(0 0 5px rgba(202, 166, 98, 0.8)) brightness(1.06);
}
.player-strip img.lit:hover,
.player-strip img.golem-mark.signed-in.lit:hover {
  filter: drop-shadow(0 1px 2px black)
    drop-shadow(0 0 7px rgba(226, 201, 138, 0.85)) brightness(1.18);
}
/* FT-1202: stood down with the strip's cog (its one home is HostTools' head
   now) — superseded by the strip-wide `lit` rule above. Kept as the record
   of the register the glow had before it was taken down half a step. */
.player-strip img.settings-cog.on,
.player-strip img.settings-cog.on:hover {
  filter: drop-shadow(0 1px 2px black)
    drop-shadow(0 0 5px rgba(202, 166, 98, 0.95)) brightness(1.1);
}
.player-strip img.settings-cog.on:hover {
  filter: drop-shadow(0 1px 2px black)
    drop-shadow(0 0 7px rgba(226, 201, 138, 1)) brightness(1.22);
}
/* FT-1200: THE HOUSE MARK IS THE ACCOUNT DOOR NOW. It spent FT-1168..1197
   as the one mark in the strip that took no clicks ("a mark, not a door" —
   the old rule here shed the pointer and the hover lift); the user made it
   the login door, so it takes the strip's own pointer and hover back.

   SIGNED IN, IT WEARS A QUIET GOLD RING — the settings cog's open-state
   idiom (a glow, because an image has no `color`), turned down: the cog's
   glow says "this door is open", this one says "you're in" and has to say
   it all session without shouting. At 26px a soft 3px halo reads as a rim
   light rather than a lamp; hover brightens it the way every mark here
   brightens. */
.player-strip img.golem-mark:hover {
  filter: drop-shadow(0 1px 2px black) brightness(1.25);
}
/* FT-1204 (user): "no glow on the golem mark if a user is logged in or
   not." The gold ring stood down the day it shipped � the mark rests like
   its siblings in both states; who-you-are lives one click away in the
   panel. The .signed-in class stays on the element (the panel keys off the
   same fact) � only the paint is gone. */
.player-strip img.golem-mark.signed-in {
  filter: drop-shadow(0 1px 2px black);
}
.player-strip img.golem-mark.signed-in:hover {
  filter: drop-shadow(0 1px 2px black) brightness(1.25);
}

/* FT-1174: A SETTING'S ROW — its name on the left, its answer on the right.
   The row itself is no longer a button: the dropdown beside it is, so the
   row sheds the pointer and the red hover that every CLICKABLE line in this
   menu wears (`li:not(.headline):not(.tabs):hover`). A whole line going red
   under the pointer while only one end of it does anything is the same lie a
   checkbox with no named states tells. `gap` keeps the two ends apart when
   the panel is narrow enough for `space-between` to run out of slack. */
.menu ul li.setting-row {
  cursor: default;
  gap: 14px;
  padding: 4px 10px;
}
/* `:not(.headline):not(.tabs)` is carried over from the rule this overrides,
   not decoration: that rule is written with both, so a plain
   `.menu ul li.setting-row:hover` LOSES to it on specificity and the row went
   red anyway (measured — the first render of this section did exactly that). */
.menu ul li.setting-row:not(.headline):not(.tabs):hover {
  color: white;
  cursor: default;
}
.menu ul li.setting-row .setting-name {
  white-space: nowrap;
}
/* FT-1198 (user): "the selectors need to obviously be interactable, the soft
   black doesn't pop at all on the purple background, maybe we make it sunken
   selectors?" — the trigger's shared `control-plate` (soft black behind a
   black edge) was invisible against the glass plate's plum tint. SUNKEN now:
   a recessed ground darker than the plate, the app's one inset-well shadow
   ($control-toggle-well — RoleActions' Dupes toggle wears the same), and the
   NumberScrub resting field's plum hairline (FT-1170) instead of 2px of
   black-on-dark. Three existing recipes, no fourth invented.

   `::v-deep` because the trigger is OptionSelect's own DOM and a scoped rule
   stops at the child's root — NightSheet's `.ns-told-sel ::v-deep .trigger`
   is the precedent. Scoped to `.setting-row`, so the setup panel's and the
   night sheet's copies of the control keep their own plate.

   HOVER SURVIVES ON PURPOSE: OptionSelect's own `:hover` (plum edge, lifted
   ground) out-specifies this rule's colors but never sets `box-shadow`, so
   a hovered well brightens WITHOUT un-sinking — pressed-into-the-glass in
   both states, which is the affordance asked for. */
.menu ul li.setting-row ::v-deep .trigger {
  background: rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(120, 105, 135, 0.35);
  box-shadow: $control-toggle-well;
}

/* THE INLINE ASK. It is a child of the strip in the DOM but it belongs to the
   middle of the screen, where the browser dialog it replaces used to stand —
   the strip is pinned to a 3px corner and anything laid out inside it would
   read as a tooltip on a toolbar rather than as a question. Above the modal
   layer (z-index 100), since a question can be asked from inside one. */
.ask-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 120;
  width: min(420px, 92vw);
  text-align: left;
  background: rgba(0, 0, 0, 0.92);
  border: 3px solid #000;
  border-radius: 10px;
  box-shadow: 0 0 20px 2px #000;
  padding: 16px 20px;
  font-size: 16px;
  cursor: default;

  h3 {
    margin: 0 0 8px;
    font-size: 22px;
  }

  .ask-note {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.45;
    opacity: 0.7;
  }

  label {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    opacity: 0.6;
    margin-bottom: 4px;
  }

  input {
    width: 100%;
    font-size: 17px;
    padding: 7px 12px;
    margin: 0;
    color: white;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #3d3d3d;
    border-radius: 5px;
    &:focus {
      outline: none;
      border-color: #a01414;
    }
  }

  .ask-error {
    margin: 8px 0 0;
    font-size: 13px;
    color: #ff7070;
  }

  .ask-acts {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 14px;

    /* Our buttons, not upstream's shiny pills: small, flat, dark, hairline. */
    .button {
      margin: 0;
      padding: 2px 9px;
      border: 1px solid #3d3d3d;
      border-radius: 5px;
      background: rgba(0, 0, 0, 0.65);
      box-shadow: none;
      font-weight: normal;
      font-size: 13px;
      line-height: 1.6;
      cursor: pointer;
      &:hover {
        border-color: #a01414;
        color: #ff7070;
      }
    }

    /* the irreversible ones wear the blood before they are pressed, not
       after — the same signal the pill's armed Leave gives */
    .ask-go.danger {
      border-color: #a01414;
      color: #ff9a9a;
      &:hover {
        background: rgba(160, 20, 20, 0.4);
        color: white;
      }
    }
  }
}
</style>

<!-- FT-1174: NOT SCOPED, and only these three lists.

     The settings rows' dropdowns are HOISTED — OptionSelect moves an open list
     to <body> so this menu's `overflow: hidden` cannot shear it (see the rows'
     own note). Once it is on <body> it is no longer inside `#controls`, and
     `#controls` sits at `z-index: 75` in the ROOT stacking context — `#app`
     takes `container-type: size` but does not form a stacking context, which
     App.vue's own note on the face splat established and which is exactly the
     fact that bites here. A hoisted list carries `z-index: 60` (`.gsel-menu
     .hoisted`), so the strip and the settings rows painted OVER the list they
     had just opened: measured, the "Grimoire size" trigger stood in front of
     the control-scheme list's first option, which made that option unreadable
     and unclickable.

     80 clears 75. Reached by the list's own `aria-label`, which is on the
     hoisted element itself, so this raises THESE THREE lists and touches no
     other caller of the control — the night sheet's hoisted list, which shares
     the 60, is deliberately left where it is. Scoping would defeat the whole
     point: a scoped rule stamps its `[data-v-…]` on the last compound selector
     and the list no longer carries this component's attribute once it moves.

     `:root` + THE DOUBLED CLASS is not a flourish, it is the arithmetic. The
     rule being overridden is `.gsel-menu.hoisted` inside OptionSelect's SCOPED
     block, which compiles with a `[data-v-…]` attribute welded on — three
     class-weight terms. A plain `.gsel-menu[aria-label=…]` is two and loses;
     measured, the first render of this fix left the list at z-index 60 and
     `elementFromPoint` on its top option still came back as the settings row
     in front of it. NightSheet's `:root .sp-list.sp-list` is the same trick
     against the same problem and is the precedent for writing it this way. -->
<style lang="scss">
/* FT-1319/FT-1320: the hoist slots are pure anchors for Vue's patcher (see
   the template note) — they must never take part in #controls' own layout. */
#controls .hoist-slot {
  display: none;
}

:root .gsel-menu.gsel-menu.hoisted {
  &[aria-label="Setup panel labels"],
  &[aria-label="Control scheme"],
  /* FT-1213: the six control toggles that replaced the scheme dropdown —
     PrefsMenu's re-entry plate (z 76) opens their hoisted lists, so they
     need the same lift over it the original three rows did. The stood-down
     "Control scheme" label stays listed, per the house rule. */
  &[aria-label="Click coins"],
  &[aria-label="Hover coins"],
  &[aria-label="Nameplate click"],
  &[aria-label="Drag roles"],
  &[aria-label="Drag names"],
  &[aria-label="Reminder button"],
  &[aria-label="Grimoire size"],
  /* FT-1319: the player settings plate (z 76) opens this hoisted list —
     the same lift over its own opener the rows above needed. */
  &[aria-label="Reminder pin"] {
    z-index: 80;
  }
}
</style>
