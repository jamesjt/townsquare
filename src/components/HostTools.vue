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
        <!-- FT-1225 (user): the copy-link becomes a REAL BUTTON in the Deal
             button's form — the panel's shared plate (`control-icon-btn`),
             the FA mark, and an icons-only-aware `.ra-name` label, exactly
             the dress RoleActions' Deal and the Seats row's shuffle wear.
             The bare-glyph look (FT-959's pill-match argument) stands down:
             the user pointed at this glyph and at Deal and asked for Deal's
             form.

             `.ht-head-acts` IS THE THIRD GRID CELL NOW — the button and the
             re-entry gear ride in one in-flow cluster, because a labeled
             plate no longer fits the 1.15em flank the bare glyph balanced
             (see the h3's own FT-1225 note below for how the name keeps the
             axis). The gear's markup, gate and behaviour are untouched —
             only its positioning moved from absolute-off-the-row to a place
             in this cluster. -->
        <span class="ht-head-acts">
          <button
            type="button"
            class="ht-copy-link"
            @click="copyTownLink"
            :title="linkCopied ? 'Copied!' : 'Copy the town link'"
          >
            <!-- FT-1229 rider: the label names the THING ("Town link"), and
                 the copied flash says what just happened ("Copied") — word
                 and check-glyph swap together on the same linkCopied state. -->
            <font-awesome-icon :icon="linkCopied ? 'check' : 'link'" />
            <span class="ra-name" v-if="!iconsOnly">{{
              linkCopied ? "Copied" : "Town link"
            }}</span>
          </button>
          <!-- FT-1262 (user): "put a key icon next to the town link for that
               maybe with a drop down like we just made for control settings
               to change them." "That" is the town's TWO PASSWORDS, which
               FT-1241 could only set at CLAIM time (Intro's host panel) — a
               town already running had no way to add, change or clear one.
               This is that way, and it sits beside the town link because the
               link and the door key are the same errand: what you hand
               someone so they can get in.

               THE SAME PLATE AS ITS SIBLING (`.ra-act` via control-icon-btn),
               deliberately — it is the Copy link button's twin in the same
               cluster, and a second dress here would read as a different
               KIND of control. `key` is the app's own mark for the enter
               password already (Intro's claim field wears it, FT-1241), and
               FA rather than a bone bake because it stands immediately
               beside FA's own `link` glyph: two marks from one set read as a
               pair, where a baked key beside a wireframe link reads as two
               unrelated ornaments. Registered since FT-1241 — no new icon.

               HOST-ONLY FOR FREE: a player never renders this panel. The
               button is NOT gated on holding a key, though — see the
               overlay's note. -->
          <button
            type="button"
            ref="passBtn"
            class="ht-copy-link ht-pass-btn"
            :class="{ open: passOpen }"
            :aria-expanded="String(passOpen)"
            @click="togglePassMenu"
            title="The town's passwords — the door key players give, and the host seat's own"
          >
            <!-- ICON-ONLY, and MEASURED so (rig:
                 claude_temp_test/2026-08-27-ft1262-fit.mjs). A labelled
                 "Passwords" plate makes the ornament cluster 192px wide, and
                 at that width it leaves the panel's own box on both the
                 rectangle (+8.9px) and the phone (+15.8px) — widening the
                 head does not rescue it (measured too; the label variant is
                 still outside at both). Icon-only lands the cluster at 132px
                 with 44-96px of room to spare at every width, and the town's
                 name stays exactly on the disc's axis:

                              cluster   outside panel (rect / phone)
                   labelled     192px          +8.9 / +15.8   ✗
                   icon-only    132px         -51.0 / -44.1   ✓

                 The word is not lost — it is in the tooltip, and the gear
                 sharing this cluster is already a bare mark, so a labelled
                 plate beside a bare one is the grammar the head ALREADY
                 speaks. `.ra-name` is deliberately not rendered rather than
                 hidden by CSS: the button's own `:has(.ra-name)` width rule
                 (see `.ht-copy-link`) keys off its presence, and this button
                 wants the compact 34px plate that rule is the exception to. -->
            <font-awesome-icon icon="key" />
          </button>
          <!-- FT-1202 (user): THE SETTINGS GEAR LIVES HERE NOW — "remove it
               from the main page, and in while a user is hosting a game put it
               inline with the town name." Every row behind it (Setup panel /
               Control scheme / Grimoire size) is a storyteller concern, and
               the storyteller's own panel head is where the storyteller is; the
               corner strips it used to stand in are stood down (Menu.vue). A
               player never renders this panel, so the host gate rides for free.

               ABSOLUTE AT `left: 100%`, NOT A FOURTH GRID CELL — was the
               FT-1202 placement, protecting FT-1098's fixed-em flank balance.
               FT-1225 SUPERSEDES IT: the flanks are equal `1fr` tracks now
               (see the h3 note), so the gear rides IN FLOW inside
               `.ht-head-acts` beside the Copy link button — same spot to the
               eye on the re-entry face (just off the name's right), without a
               second coordinate system.

               DIMMED TO THE PACK (FT-1202's other ask): the cog art bakes ~20%
               hotter than its bone siblings — alpha-weighted mean luminance
               175.0 against ui-chronicle 146.1 / ui-records 145.1 / ui-help
               147.2 (rig: claude_temp_test/2026-08-26-ft1202-lum.mjs) — so it
               wears brightness(0.835) at rest (146.13 / 175.0), which lands its
               mean exactly on the pack's own 146.1. CSS, not a re-bake: the
               art stays one source, and the trim is visible where it applies. -->
          <!-- FT-1209 (user): the gear is the SHORTCUT now — clicking it opens
               the setup panel's Control settings tab (and steps back to Script
               setup if that tab is already up, the closest thing a tab row has
               to "closed"). Lit while its tab is the active one, the same
               open-glow rule the strip marks wear (FT-1202). On the re-entry
               face there is no tab strip, so the gear keeps its old door there
               — the floating PrefsMenu (see togglePrefs). -->
          <!-- FT-1213 (user): "we can remove that settings icon now" — the
               BUILD face loses the gear: the Control settings tab sits in the
               strip right beside it, so the shortcut was a second door an inch
               from the first. `v-if="reentry"` rather than deletion: the
               RE-ENTRY face renders no tab strip, so there the gear stays the
               returning storyteller's ONLY door to their settings (the
               floating PrefsMenu). alignTabs already bails without a cog to
               measure, so the strip simply keeps its natural right edge. -->
          <img
            v-if="reentry"
            ref="cog"
            class="ht-cog"
            :class="{ on: prefsOpen || prefsTab }"
            :src="uiCog"
            alt="Your settings"
            title="Your settings — this browser, every town"
            @click="togglePrefs"
          />
        </span>
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

    <!-- FT-1262: THE PASSWORDS OVERLAY. Rendered here for Vue's sake and
         hoisted to <body> the moment it opens (the passOpen watcher →
         hoistPassMenu), where placePopupAt hangs it off the key button's own
         rect — FT-1265's technique and FT-1265's chrome, so the disc's foot,
         the head's grid and the panel's scroll can none of them shear it.
         OUTSIDE `.ht-head` on purpose: the head's geometry is measured (the
         disc's three flex children, the h3's three grid columns), and even
         though this is `position: fixed` from its very first paint, it has
         no business being counted among them.

         NOT GATED ON HOLDING A KEY (brief's call, and the right one): the
         host-seat ladder also admits the OWNER SESSION, whose cookie needs
         no edit key at all, so a hide-unless-keyed rule would lock signed-in
         owners out of their own locks. The server decides; a caller with no
         standing gets the route's real 403 in the row's own note, which is
         what a host who lost their key needs to be told.

         PASSWORDS ARE NEVER RENDERED BACK. The wire speaks booleans only
         (`requiresEnterPassword` / `openPasswordSet`) — there is nothing to
         render even if we wanted to — so each row states SET or NOT SET, and
         the input empties itself the moment a set succeeds. -->
    <div class="ht-pass-menu" ref="passMenu" v-if="passOpen">
      <div class="ht-pass-title">This town's passwords</div>
      <!-- The two rows are the same shape twice. Written out rather than
           v-for'd over a pair: each carries its own teaching line, its own
           mark and its own vocabulary, and a loop over two items would hide
           three differences to save six lines. -->
      <div class="ht-pass-row">
        <div class="ht-pass-head">
          <font-awesome-icon class="row-mark-fa" icon="key" />
          <span class="ht-pass-name">Door password</span>
          <span
            class="ht-pass-state"
            :class="{ set: passState.enter === true }"
            >{{
              passState.enter === null
                ? "checking…"
                : passState.enter
                ? "Set"
                : "Not set"
            }}</span
          >
        </div>
        <p class="ht-pass-teach">
          What players must type to enter this town. Without it, anyone with the
          link walks in.
        </p>
        <div class="ht-pass-do">
          <input
            v-model="passDraft.enter"
            type="password"
            spellcheck="false"
            autocomplete="new-password"
            :disabled="passBusy === 'enter'"
            :placeholder="
              passState.enter ? 'new door password' : 'door password'
            "
            @keyup.enter="savePass('enter')"
          />
          <button
            type="button"
            class="ht-pass-set"
            :disabled="passBusy === 'enter' || !passDraft.enter.trim()"
            @click="savePass('enter')"
          >
            {{ passState.enter ? "Change" : "Set" }}
          </button>
          <button
            type="button"
            class="ht-pass-clear"
            v-if="passState.enter"
            :disabled="passBusy === 'enter'"
            @click="clearPass('enter')"
          >
            Clear
          </button>
        </div>
        <p
          v-if="passNote.enter"
          class="ht-pass-note"
          :class="passNote.enter.kind"
        >
          {{ passNote.enter.text }}
        </p>
      </div>
      <div class="ht-pass-row">
        <div class="ht-pass-head">
          <font-awesome-icon class="row-mark-fa" icon="lock" />
          <span class="ht-pass-name">Host password</span>
          <span
            class="ht-pass-state"
            :class="{ set: passState.open === true }"
            >{{
              passState.open === null
                ? "checking…"
                : passState.open
                ? "Set"
                : "Not set"
            }}</span
          >
        </div>
        <p class="ht-pass-teach">
          Your way back into the host seat from another browser. Anyone who
          knows it can take the seat.
        </p>
        <div class="ht-pass-do">
          <input
            v-model="passDraft.open"
            type="password"
            spellcheck="false"
            autocomplete="new-password"
            :disabled="passBusy === 'open'"
            :placeholder="
              passState.open ? 'new host password' : 'host password'
            "
            @keyup.enter="savePass('open')"
          />
          <button
            type="button"
            class="ht-pass-set"
            :disabled="passBusy === 'open' || !passDraft.open.trim()"
            @click="savePass('open')"
          >
            {{ passState.open ? "Change" : "Set" }}
          </button>
          <button
            type="button"
            class="ht-pass-clear"
            v-if="passState.open"
            :disabled="passBusy === 'open'"
            @click="clearPass('open')"
          >
            Clear
          </button>
        </div>
        <p
          v-if="passNote.open"
          class="ht-pass-note"
          :class="passNote.open.kind"
        >
          {{ passNote.open.text }}
        </p>
      </div>
    </div>

    <!-- FT-1202: the gear's menu — Menu.vue's settings section moved out
         whole (see PrefsMenu.vue). It hoists itself to <body> and hangs off
         the gear's rect, so the host panel's scroll and sheet layouts never
         shear it; closing is its own outside-click/Escape, plus the gear's
         second click.

         FT-1209: STOOD DOWN FOR THE BUILD FACE — the three rows live on the
         Control settings tab now and the gear opens THAT (togglePrefs). This
         mount survives for ONE case: the re-entry face, which renders the
         head (and its gear) but no tab strip, so the floating menu stays the
         returning storyteller's only door to their own settings. `prefsOpen`
         can only turn true on that face. -->
    <PrefsMenu
      v-if="prefsOpen"
      :anchor="prefsAnchor"
      @close="prefsOpen = false"
    />

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
      <!-- ── FT-1168 (user): TWO TABS, UNDER THE TOWN'S NAME ─────────────────
           "Add a tabs for in setup below the town name. One for script setup
           and one for game settings."

           WHAT EACH ONE HOLDS is the user's own list, and every row below is
           MOVED, not rebuilt — same components, same handlers, same styles,
           same order within each tab:

             Script setup   chairs · script · the roles row (assigned count,
                            Deal, Shuffle, Duplicates, Retract) · the tray you
                            drag characters out of onto a chair
             Game settings  the night checklist · the day bell · the day's
                            length · the call-back voice

           WHY THE SPLIT IS THE RIGHT ONE: the left tab is what you do ONCE,
           in order, on the way to pressing Start; the right tab is what this
           TOWN is like, which you set and then rarely touch. They were
           interleaved down one column, so the panel read as ten unrelated
           rows rather than two short jobs.

           IT IS THE BAND'S FIRST CHILD, NOT THE HEAD'S. `.ht-head` is a FIXED
           slice of the disc (see the disc rules — a cap sized by `fd-caph`,
           where a second line of type is already folded away into the
           heading's tooltip), and the panel's disc arithmetic is measured for
           exactly three children: cap, band, cap. A fourth would push the band
           off centre. As the band's first row the strip sits immediately below
           the name in every layout the panel has — the disc, the rectangle and
           both phone sheets — which is where the user put it.

           NOT SHOWN ON THE RE-ENTRY FACE. That face has no setup to tab
           between: it greets a host whose game is already running, and the
           settings rows below it stay reachable (`reentry ||`) exactly as they
           were before this pass, because a storyteller mid-game still owns the
           checklist, the bell and the clock. -->
      <!-- FT-1209: the strip right-aligns OVER THE GEAR — `tabInset` is the
           measured gap between the strip's right edge and the gear's (see
           alignTabs), so the rightmost tab (Control settings) stands directly
           above the gear that opens it, one cluster in every layout. -->
      <!-- FT-1213: MOOT ON THIS FACE — the build face has no gear any more
           (it renders only on re-entry, where this strip does not), so
           alignTabs finds nothing to measure, `tabInset` stays 0, and the
           strip keeps its natural right edge. The machinery stands for the
           day a head ornament returns. -->
      <!-- ── FT-1266 (user): "those tabs aren't centered in the disc — can we
           center them?" THE STRIP STANDS DOWN FROM THE GEAR and centres on
           the disc's own axis instead.

           WHAT WAS ACTUALLY HOLDING IT: nothing. FT-1209 parked the cluster
           over the head's settings gear with a measured right inset
           (`tabInset`, written by alignTabs); FT-1225 moved that gear and
           FT-1213 took it off the build face altogether, since when alignTabs
           has had nothing to measure and `tabInset` has computed 0 at every
           size (measured at HEAD, rig
           claude_temp_test/2026-08-27-ft1266-shots.mjs: `padR 0px` on all
           six layouts). So the leaves were not aligned to anything — they
           were sitting at the strip's natural RIGHT edge, which the
           `justify-content: flex-end` below put them at, and which landed
           them off the panel's axis by a measured -23.4px to +80.3px
           depending on layout.

           THE CENTRING RULE IS THE TOWN NAME'S OWN. The strip's box is
           already centred on `.host-tools`'s box centre — the exact point
           FT-1098's three-column h3 pins the name to (measured: strip centre
           == panel axis == name centre, 0.0px apart, at every layout) — so
           the only change needed is which end of that box the cluster hugs:
           `justify-content: center` (see the `.ht-tabs` rule). No JS, no
           second measurement, and nothing new to keep in sync with the head.

           `:style="{ paddingRight: tabInset + 'px' }"` CAME OFF THIS ELEMENT.
           It was the one reader of alignTabs' measurement; a padding of 0
           is what it wrote anyway, but leaving a live binding to a stood-down
           rule invites the next pass to trust it. alignTabs itself is kept
           (see its own note) — the day a head ornament returns, the strip
           will want to know where it is. -->
      <div ref="tabs" class="ht-tabs" v-if="!reentry" role="tablist">
        <button
          v-for="t in setupTabs"
          :key="t.id"
          type="button"
          class="ht-tab"
          :class="{ on: setupTab === t.id }"
          role="tab"
          :aria-selected="String(setupTab === t.id)"
          :title="t.title"
          @click="setupTab = t.id"
        >
          <font-awesome-icon :icon="['fas', t.icon]" class="ht-tab-mark" />
          {{ t.label }}
        </button>
      </div>
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
      <!-- the SHARED script picker (user call): pick right here, with the
         script's OWN art on the trigger; the Almanac card opens the forge -->
      <!-- ── FT-1175 (user): "put the script row above the roles row." ──────
         MOVED, not rebuilt — the same row, the same handler, the same styles,
         lifted above the cast line rather than sitting under it.

         IT ALSO CLEARS THE SEATS ROW, and that is not a liberty taken: the
         Roles half and the Seats half are ONE row (FT-1090's cast line), so
         "above the roles" and "above the seats" are the same position. It is
         the better order anyway — the script decides which characters exist
         and what seat counts it plays at, which is the fact the two halves
         below both depend on. The seat-range warning still reads off the
         picked script and still sits under the row that sets the count. -->
      <div class="row" v-if="scriptTab">
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
          <span class="row-name" v-if="!iconsOnly">Script</span>
        </span>
        <ScriptPicker
          class="ht-script-picker"
          :cards="scriptCards"
          :picked-id="pickedScriptId"
          @pick="pickScript"
        />
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
      <!-- FT-1168: `scriptTab` is `!reentry && setupTab === 'script'` — the
           gate this row already had, narrowed by which tab is showing. -->
      <div class="row ht-cast" v-if="scriptTab">
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
            <!-- FT-1168 (user): "if not include the name of the settings
                 after its icon" — every mark on this panel can wear its own
                 word, and the corner cog's "Icons only" takes them all off
                 at once. The word goes INSIDE `.label`, after the mark, so
                 the pair is one flex item and the row's space-between still
                 sees one cluster on the left (the FT-959 lesson) rather than
                 a mark and a word it can push apart. -->
            <span class="label">
              <!-- FT-1337: the chair mark reads the chair lab's var(--chair)
                   as a mask now, so a lab pick repaints this row too. -->
              <span
                class="row-mark chair-mark"
                role="img"
                aria-label="Seats"
                title="Seats"
              ></span>
              <span class="row-name" v-if="!iconsOnly">Seats</span>
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
              <!-- FT-1135 (user): "there is no 'mid game shuffle' this is a
                   set up shuffle. users can be moved mid game intentionally by
                   the storyteller, and their roles, but they can't shuffle
                   them then can they?"

                   No, and they should not be able to. This is a SETUP tool.
                   Start closes the build panel, so the only way to reach this
                   button once a game is running is to reopen the build face
                   after a reload — which is not a use, it is an accident. The
                   answer to an accident is a door that is shut, not a question
                   asked at the last moment.

                   Moving a player mid-game stays available and untouched: the
                   storyteller's own Move and Swap are deliberate, aimed acts
                   on ONE seat. A shuffle cannot be aimed at all, which is
                   exactly why it belongs to setup and nowhere else. -->
              <!-- FT-1196 (user): "the first shuffle button needs a label, and
                   maybe they both need a qualifier on what they shuffle?" This
                   was the ONLY unlabeled action on the panel after FT-1175
                   labeled RoleActions' four — and it shared FA `random` with
                   the roles shuffle one row down, so the panel's two most
                   consequential randomisers were told apart by tooltip alone.
                   Now: the word says WHAT it shuffles ("Shuffle people" here,
                   "Shuffle roles" there — the user's own vocabulary, and the
                   titles' own), and the mark is ui-seat's chair over an
                   opposed pair of arrows (baked, FT-1194's recipe), so
                   icons-only mode still tells chair from coin. Same
                   icon+`.ra-name` dress as RoleActions' buttons. -->
              <button
                class="tool-btn"
                type="button"
                :disabled="players.length <= 2 || gameUnderway"
                @click="randomizeSeatings"
                :title="
                  gameUnderway
                    ? 'Shuffling seats is a setup tool — use Move or Swap to reseat someone now'
                    : 'Shuffle who sits where — the people change chair, the characters stay on theirs'
                "
              >
                <!-- <font-awesome-icon icon="random" /> — FT-1196: both shuffles wore it -->
                <img
                  class="tool-glyph"
                  :src="uiShufflePlayer"
                  alt="Shuffle people"
                />
                <span class="ra-name" v-if="!iconsOnly">Shuffle people</span>
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
              <span class="row-name" v-if="!iconsOnly">Roles</span>
            </span>
            <!-- FT-1175: the WORD folds away on the disc, the numbers never
                 do — see `.ht-role-word` in the disc rules for the
                 measurement that made it necessary and why this word is the
                 cheapest thing on the line. -->
            <span
              class="value"
              :title="`${rolesAssigned} of ${players.length} seats have a character`"
              @click="toggleModal('roleDrawer')"
            >
              {{ rolesAssigned }} / {{ players.length }}
              <span class="ht-role-word">assigned</span>
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
      <small class="hint seat-warn" v-if="scriptTab && seatWarn">
        {{ seatWarn.reason }}
        <span class="plays" v-if="seatWarn.plays">{{ seatWarn.plays }}</span>
      </small>

      <!-- (FT-1090: the ROLES ROW stood here. Its mark, its "N / M assigned"
         value and RoleActions all moved up into the cast line above — see
         the `.ht-cast-roles` half — so the two halves of one statement share
         one line instead of two. Nothing was dropped on the way.) -->

      <!-- ── FT-1175 (user): ONE SETTING, ONE ROW. "each of these can
         probably be their own row now. lots of room."

         SUPERSEDES THE PAIRING BELOW, not its reasoning. FT-1099 named two
         pairs because four settings had to share a column with the seats,
         the script, the roles row and the character tray, and a bin-pack was
         choosing the pairs badly. FT-1168 moved the tray and the cast line
         onto a different tab, so the constraint that forced any pairing at
         all is gone — and a pair only ever existed to save height that this
         tab no longer needs to save.

         FOUR LINES, in the order they were already read in: the night
         checklist (both its selects, inside its own component), the
         day-break bell, the day's length with its minutes, the call-back
         voice. `.ht-set-line` is unchanged as the wrap unit — each still
         takes its own full-width row via `flex: 1 1 100%` — so this is the
         same mechanism holding four names instead of two, not a new one.

         The old class names `ht-set-line1`/`ht-set-line2` said "first pair"
         and "second pair" and would have been lying; they are named for what
         they hold now.

         WHAT IT COSTS: the settings tab grows by two rows' worth of height.
         It has no character tray under it — that is the other tab — so the
         room comes out of slack, not out of anything.

         ── the pairing this replaces, kept for its measurements ────────────
         FT-1099 (user's own pairing, superseding FT-1098's bin-pack)
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
      <!-- FT-1168: `settingsTab` is `reentry || setupTab === 'settings'` —
           the tab when the panel is building, and unconditional on the
           re-entry face, which is exactly where this row already stood. -->
      <!-- ── FT-1266 (user): "do the same clean up we did to the control
           settings to the game settings, they are ragged." FT-1264's grid,
           applied here: `ht-game` opts this block into the same LABEL TRACK +
           CONTROL TRACK the Control tab wears (the rule is written once, for
           both — see `.ht-prefs, .ht-game` in the styles), so every control
           starts on one common x while still sizing to its own content.

           HOW RAGGED IT WAS, measured at HEAD (rig:
           claude_temp_test/2026-08-27-ft1266-shots.mjs, 1920x1080): the seven
           rows' labels all began at x710.5 — it was never the labels — and
           their controls began at NINE different x positions, 778.3 through
           931.0, a 152.7px spread, because each control was clustered against
           its own label's end by flex.

           THE COMPOUND ROWS LAND IN THE SAME TRACKS, which is the whole test
           of the shape: a row whose control side is three things (Day timer's
           select + minutes scrub + "min", Whisper marks' select + seconds
           scrub + "sec") wraps that side in ONE `.ht-set-ctl` — an inner flex
           row that is itself the control track's single grid item. So the
           compound's first control starts on exactly the x every simple row's
           select starts on, and the pieces after it read left to right as the
           sentence they always were. Night checklist is the same idea from
           the other side: its two selects are already one box
           (`.nm-controls`, inside NightModeRow), so that box becomes the
           track's item — see that component's own FT-1266 block, which is
           where the placement has to be written because a parent's scoped
           styles reach a child's root and nothing below it.

           GROUPING IS SPACING, NOT HEADERS (`ht-group-start`, FT-1264's own
           hook): a breath of air above Day bell and above Chat splits the
           seven rows into the night's checklist / the day's sounds and clock /
           what the town may say. No new words on the panel, no row moved.

           AND THE TAB IS ITS OWN SCROLLER WHERE THE BAND CANNOT HOLD IT.
           FT-1231 built that ladder for the Control tab only; this tab was
           never wired to it and has been OVERRUNNING the disc's band at HEAD
           — measured +28.1px at 1440x900 / 1600x900 / 1642x780 and +9.7px at
           1280x960 (rig: claude_temp_test/2026-08-27-ft1266-band.mjs), which
           is the last row painting through the Start button. Same ref, same
           measured class, same drip scrollbar and sunken well as the Control
           tab now (`gameOverflow`, measureTabOverflow). -->
      <div
        class="row ht-settings ht-game"
        v-if="settingsTab"
        ref="gameRows"
        :class="{ scrolls: gameOverflow }"
        v-blood-scroll
      >
        <span class="ht-set-line ht-set-line-night">
          <!-- FT-860: the night sheet's three-state switch. Its own component so
             the setting travels with the rest of the night code. -->
          <NightModeRow />
        </span>

        <!-- FT-1266: the day's group opens here — air above, no header. -->
        <span class="ht-set-line ht-set-line-bell ht-group-start">
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
              <span class="row-name" v-if="!iconsOnly">Day bell</span>
            </span>
            <OptionSelect
              name="bell-which"
              aria-label="Day-break bell"
              hoist
              :options="bellOptions"
              :value="bellChoice"
              @input="pickBellChoice"
            />
          </span>
        </span>

        <span class="ht-set-line ht-set-line-day">
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
                <span class="row-name" v-if="!iconsOnly">Day timer</span>
              </span>
              <!-- FT-1266: THE CONTROL TRACK'S ONE ITEM. The select and the
                   minutes were siblings a level apart — the select inside
                   `.tw-lead` with the label, the scrub outside it — which is
                   exactly what the grid cannot place: two things wanting one
                   cell. Wrapped together they are a single inner flex row
                   that starts on the common control x, and the sentence
                   ("hourglass — Off — 10 min") reads the same as it always
                   did. Whisper marks below carries the identical wrapper, and
                   Night checklist's `.nm-controls` is already one. -->
              <span class="ht-set-ctl">
                <!-- FT-1229: the VALUE is the stored mode now, no longer
                   derived from the minutes — "Per day" keeps a length set (the
                   coming day's) and still is not "Timed". -->
                <OptionSelect
                  name="day-length"
                  aria-label="Day length"
                  hoist
                  :options="dayLengthOptions"
                  :value="tower.dayTimerMode"
                  @input="setDayMode"
                />
                <!-- the minutes themselves — dimmed while Off, and scrubbing
                   it is itself the "on" gesture (a length you are setting is a
                   length you want). -->
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
            </span>
          </span>
        </span>

        <span class="ht-set-line ht-set-line-call">
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
              <span class="row-name" v-if="!iconsOnly">Call back</span>
            </span>
            <OptionSelect
              name="callback"
              aria-label="Call-back voice"
              hoist
              :options="callOptions"
              :value="tower.callId"
              @input="pickCall"
            />
          </span>
        </span>

        <!-- FT-1266: the talking group opens here — air above, no header.
             AND THE WHISPER-MARKS ROW MOVES OUT OF THIS LINE into its own
             `.ht-set-line-whisper` below. The two settings shared one line
             because `.ht-set-line` was the flex WRAP UNIT (FT-1099) and this
             tab's last three rows were short enough to pair; under the grid
             every `.ht-set-line` dissolves (`display: contents`) and the wrap
             unit is the grid row itself, so the shared element decided
             nothing about layout any more — it only meant the group's air
             landed on both settings at once. Same rows, same order, same
             handlers; one wrapper became two. -->
        <span class="ht-set-line ht-set-line-chat ht-group-start">
          <!-- ── FT-1206: THE CHAT LEVEL — how much talking this town allows.
             Off / No whispers / Neighbors / Anyone (golem/chat's CHAT_LEVELS;
             neighbors are the two chairs beside yours, dead or alive). The
             player↔storyteller lane stays open at EVERY level. Rides the
             tower shelf like every row beside it: per-town persisted, synced
             live, enforced at the composers and defensively on receive. -->
          <span class="tw-lead">
            <span class="label">
              <font-awesome-icon
                class="row-mark-fa"
                icon="comments"
                title="How much the town may talk"
              />
              <span class="row-name" v-if="!iconsOnly">Chat</span>
            </span>
            <OptionSelect
              name="chat-level"
              aria-label="Chat level"
              hoist
              :options="chatOptions"
              :value="tower.chatLevel"
              @input="pickChatLevel"
            />
          </span>
        </span>

        <span class="ht-set-line ht-set-line-whisper">
          <!-- FT-1206: THE WHISPER MARKS — the paper plane every browser sees
             when two players whisper (metadata only: seats, never content),
             and how long it rests by the recipient's coin. Off keeps the
             wire silent. FT-1210 (user): "whisper marks should share the
             layout and structure of the day timer" — the preset dropdown
             became the Day timer row's exact anatomy: an Off/On select plus
             the seconds on the shared NumberScrub, dimmed while Off, unit
             word trailing, all in one `.ht-set-pair`. -->
          <span
            class="ht-set-pair tw-whisper"
            title="The whisper planes — how long one rests by the recipient's coin"
          >
            <span class="tw-lead">
              <span class="label">
                <font-awesome-icon
                  class="row-mark-fa"
                  icon="paper-plane"
                  title="The whisper planes"
                />
                <span class="row-name" v-if="!iconsOnly">Whisper marks</span>
              </span>
              <!-- FT-1266: the control track's one item — the Day timer row's
                   own wrapper, for the same reason and with the same effect.
                   FT-1210 asked these two rows to share an anatomy; they now
                   share it down to which grid cell each piece lands in. -->
              <span class="ht-set-ctl">
                <!-- FT-1268 (user): "lets make all of these a checkbox
                     instead of a drop down if there is only two options."
                     Off/On is the clearest case there is — the row's own
                     noun plus a ticked box IS the sentence, and no list
                     needs opening to say it. Same option pair, same writer,
                     same values on the wire (`on`/`off` strings, which is
                     why the control is told which one means checked); only
                     the control changed. The seconds scrub beside it is
                     untouched and still reads as the same sentence. -->
                <OptionCheck
                  name="whisper-marks"
                  aria-label="Whisper marks"
                  on-value="on"
                  :options="whisperMarkModeOptions"
                  :value="tower.whisperMarkSec ? 'on' : 'off'"
                  @input="setWhisperMarkMode"
                />
                <!-- the seconds themselves — dimmed while Off, and scrubbing
                   is itself the "on" gesture, exactly as the Day timer's
                   minutes. -->
                <span
                  class="tw-daylen"
                  :class="{ idle: !tower.whisperMarkSec }"
                  title="Seconds a plane rests by the coin — drag sideways to scrub, click to type"
                >
                  <NumberScrub
                    class="tw-daylen-scrub"
                    :value="tower.whisperMarkSec || whisperSecDraft"
                    :min="whisperSecMin"
                    :max="whisperSecMax"
                    title="Seconds a plane rests by the coin — drag sideways to scrub, click to type"
                    @input="setWhisperMarkSec"
                  />
                  <span class="tw-daylen-unit">sec</span>
                </span>
              </span>
            </span>
          </span>
        </span>

        <span class="ht-set-line ht-set-line-counts">
          <!-- FT-1206: COUNT WHISPERS — the Chronicle's per-pair tally for
             the running game (who whispered whom, how many times). In the
             Chronicle, never on the clock. Each viewer's table holds what
             their own Chronicle holds: the storyteller everything, a player
             their own pairs; a finished game publishes all of it. -->
          <span class="tw-lead">
            <span class="label">
              <font-awesome-icon
                class="row-mark-fa"
                icon="chart-bar"
                title="The Chronicle's whisper tally"
              />
              <span class="row-name" v-if="!iconsOnly">Count whispers</span>
            </span>
            <!-- FT-1268: Off/On, so a checkbox (see the Whisper marks row
                 above for the user's call and what it does not change). -->
            <OptionCheck
              name="whisper-counts"
              aria-label="Count whispers"
              on-value="on"
              :options="whisperCountOptions"
              :value="tower.whisperCounts ? 'on' : 'off'"
              @input="pickWhisperCounts"
            />
          </span>
        </span>

        <span class="ht-set-line ht-set-line-traffic">
          <!-- FT-1309: WHISPER TRAFFIC — the Chronicle's per-whisper line
             ("Ana ✈ Bea", FT-1263's plane's-memory row), its own switch at
             last: the tally above counts the day, this row LISTS it, and a
             town may want one without the other. Off stops the mint on
             every client (socket.js gates chatMarkTraffic); lines already
             recorded stand. The quill is the mark — the record being
             written down, where the plane means SENT (FT-1211) and already
             fronts the Whisper marks row two lines up. -->
          <span class="tw-lead">
            <span class="label">
              <font-awesome-icon
                class="row-mark-fa"
                icon="feather-alt"
                title="The Chronicle's whisper-traffic lines"
              />
              <span class="row-name" v-if="!iconsOnly">Whisper traffic</span>
            </span>
            <!-- FT-1268: Off/On, so a checkbox (see the Whisper marks row
                 above for the user's call and what it does not change). -->
            <OptionCheck
              name="whisper-traffic"
              aria-label="Whisper traffic"
              on-value="on"
              :options="whisperTrafficOptions"
              :value="tower.whisperTraffic ? 'on' : 'off'"
              @input="pickWhisperTraffic"
            />
          </span>
        </span>

        <!-- ── FT-1315/FT-1316: THE PRESENTATION PAIR ──────────────────────
             Two vocabulary choices about how the town SHOWS what has already
             happened, on the tower shelf like every row above (per-town
             persisted, synced live). Ghost vote picks what marks a spent
             ghost vote — today's crossed cowl, or the death shroud dropping
             instead; End reveal gates the FT-1053 end-of-game ceremony so a
             storyteller can land the end quietly and stage their own. -->
        <span class="ht-set-line ht-set-line-ghostmark ht-group-start">
          <span class="tw-lead">
            <span class="label">
              <!-- FT-1321: the seat's own unspent-ghost-vote mark (the cowl,
                   FT-996's call) fronts the row that chooses what SPENDING
                   one looks like — the FA ghost stood in before the fork's
                   art carried the vocabulary itself. -->
              <img
                class="row-mark"
                :src="uiGhostCowl"
                alt="Ghost vote"
                title="What marks a spent ghost vote"
              />
              <span class="row-name" v-if="!iconsOnly">Ghost vote</span>
            </span>
            <OptionSelect
              name="ghost-spent-mark"
              aria-label="Spent ghost vote mark"
              hoist
              :options="ghostSpentOptions"
              :value="tower.ghostSpentMark"
              @input="pickGhostSpentMark"
            />
          </span>
        </span>

        <span class="ht-set-line ht-set-line-endshow">
          <span class="tw-lead">
            <span class="label">
              <!-- FT-1326a: the ceremony's own evil-wins emblem (the demon
                   team glyph the end banner paints) — the FT-1321 veil read
                   as nothing at 22px ("wtf is that?"); the tentacle had
                   already lost the same audition as a red sliver. -->
              <img
                class="row-mark"
                :src="uiEndReveal"
                alt="End reveal"
                title="The end-of-game show"
              />
              <span class="row-name" v-if="!iconsOnly">End reveal</span>
            </span>
            <!-- FT-1268: Off/On, so a checkbox (see the Whisper marks row
                 above for the user's call and what it does not change). -->
            <OptionCheck
              name="end-ceremony"
              aria-label="Play the end-of-game animation"
              on-value="on"
              :options="endCeremonyOptions"
              :value="tower.endCeremonyOn ? 'on' : 'off'"
              @input="pickEndCeremony"
            />
          </span>
        </span>

        <!-- ── FT-1314: THE AUTOMATIONS GROUP ──────────────────────────────
             One checkbox per rule the storyteller hands to the machine —
             per-town persisted on the tower shelf, synced live, ALL DEFAULT
             OFF. The vocabulary (labels, marks, the teaching titles) lives
             in golem/automations.js beside the engine that acts on it, so
             the row a storyteller reads and the rule that fires can never
             drift.
             FT-1327 (user): the rules FOLD INTO ONE ROW — the group had
             grown past a stack of inline lines (three agnostic rules plus
             one per role-declared automation in the script). Same dress as
             the Control tab's menu rows (FT-1264's `.ht-menu-sum` summary
             trigger + the FT-1265 body-hoisted `.ht-menu-list`), riding the
             SAME machinery (toggleMenuList / hoistMenuList / placeMenuList
             key it by ref name, so 'automations' is just one more key) —
             minus the drag grips (rules have no order to give) and the
             master row (there is no whole-group tower switch to put there).
             Each row keeps its FT-1321/FT-1322 mark, its teaching titles and
             its own tower write; only where the rows stand changed. -->
        <span class="ht-set-line ht-set-line-auto ht-group-start">
          <span class="tw-lead">
            <span class="label">
              <!-- FT-1326 (user): a cog reads as a SETTING, and the setting
                   menu's own leaf already wears one — this row means the
                   machine acting BY ITSELF, so it wears the wand instead. -->
              <font-awesome-icon
                class="row-mark-fa"
                icon="magic"
                title="Rules the storyteller hands to the machine"
              />
              <span class="row-name" v-if="!iconsOnly">Automations</span>
            </span>
            <button
              type="button"
              class="ht-menu-sum"
              ref="menuSum-automations"
              :class="{ open: menuListOpen === 'automations' }"
              :aria-expanded="String(menuListOpen === 'automations')"
              aria-controls="ht-menu-list-automations"
              aria-label="Automations — choose which rules fire by themselves"
              :title="
                menuListOpen === 'automations'
                  ? 'Close the rule list'
                  : 'Choose which rules fire by themselves — each rule keeps its own switch inside'
              "
              @click="toggleMenuList('automations')"
            >
              <span class="ht-menu-sum-wrap">
                <span class="ht-menu-sum-label">{{ automationSummary }}</span>
                <span class="ht-menu-sum-sizer" aria-hidden="true">{{
                  "0 of " + automationRules.length
                }}</span>
              </span>
              <font-awesome-icon icon="chevron-down" class="caret" />
            </button>
          </span>
        </span>
        <!-- the checklist — hoisted to <body> the moment it opens, exactly
             as the Control tab's lists are (the FT-1265 note above them);
             no grips, no master row (see the group note above). -->
        <div
          class="ht-menu-list"
          id="ht-menu-list-automations"
          ref="menuList-automations"
          v-if="menuListOpen === 'automations'"
          key="automations:list"
        >
          <div
            v-for="rule in automationRules"
            :key="rule.key"
            class="ht-menu-item"
          >
            <!-- FT-1321/FT-1322: every rule row wears painted art — an
                 agnostic rule the fork's own mark for its subject (noose,
                 death mark, ghost cowl), a role-declared rule the ROLE'S
                 token icon, resolved in automationRules below. -->
            <img
              class="row-mark"
              :src="rule.mark"
              :alt="rule.label"
              :title="rule.title"
            />
            <span class="row-name">{{ rule.label }}</span>
            <OptionCheck
              :name="'auto-' + rule.key"
              :aria-label="rule.label"
              on-value="on"
              :options="automationOptions(rule)"
              :value="tower[rule.key] ? 'on' : 'off'"
              @input="(v) => pickAutomation(rule.key, v)"
            />
          </div>
        </div>
      </div>

      <!-- ── FT-1209 (user): THE CONTROL SETTINGS TAB ───────────────────────
         "these options need be right above the gear. and in fact maybe we
         need to add a third tab? Script setup, game settings, and control
         settings?" — the three PERSONAL rows (Setup panel / Control scheme /
         Grimoire size), moved out of the gear's floating menu (PrefsMenu,
         FT-1202) and rendered in the Game-settings rows' own grammar: one
         `.ht-set-line` per setting, mark + name + OptionSelect. The STORAGE
         is untouched — same golem/prefs stash, same account sync; only where
         the rows render changed. `.ht-settings` is reused deliberately (the
         two blocks are mutually exclusive v-ifs) so the lines inherit the
         settings tab's own layout instead of restating it.

         FT-1231 (user): "it is still too long for the clock face — we either
         need to make it scroll like the roles or have two columns." BOTH,
         layered: the toggle rows take two columns wherever the disc's band
         affords them (see the styles), and where the tab STILL outruns the
         band it becomes its own scroller — the same measured-overflow
         contract the night checklist (NightSheet's `scrolls` well, FT-1229)
         and the character tray (RoleTray's `cut`, FT-1175) already keep:
         `v-blood-scroll` is the fork's drip scrollbar, and the `scrolls`
         class (the sunken well + the drip's lane) lands only when the rows
         genuinely overflow, measured in measurePrefsOverflow. -->
      <div
        class="row ht-settings ht-prefs"
        v-if="prefsTab"
        ref="prefsRows"
        :class="{ scrolls: prefsOverflow }"
        v-blood-scroll
      >
        <span class="ht-set-line">
          <span class="tw-lead">
            <span class="label">
              <font-awesome-icon
                class="row-mark-fa"
                icon="font"
                title="The setup panel's dress — names beside the icons, or icons alone"
              />
              <span class="row-name" v-if="!iconsOnly">Setup panel</span>
            </span>
            <OptionSelect
              name="prefs-setup-labels"
              aria-label="Setup panel labels"
              hoist
              :options="setupLabelOptions"
              :value="prefs.setupIconsOnly"
              @input="setIconsOnly"
            />
          </span>
        </span>
        <!-- FT-1213: THE CONTROL TOGGLES — the exclusive "Control scheme"
             dropdown stood down for independent switches (golem/prefs'
             CONTROL_TOGGLES; the reasoning lives on that list — seven now,
             FT-1227 having split "Click coins" in two). Same Game-settings
             row grammar as the rows around them; each ROW's
             title teaches its gesture, because half the point of listing
             every gesture is that a storyteller finds out it exists. The
             "Hover coins" row on a device with no resting pointer stays
             OPERABLE but wears the inert dress and says why — the value
             still rides the account to machines where the gesture works.
             FT-1227: a row named in TOGGLE_MARKS wears the gesture's own
             baked art (the ring's move icons, the hover's pin) instead of
             its FA stand-in. -->
        <!-- FT-1260: THE TWO MENU ROWS EXPAND. A row carrying `layoutKey`
             keeps its master On/Off and gains a chevron; open, the menu's
             own list unfolds below it — every vocabulary action (from
             golem/seatActions, so a future one appears by itself), each
             with its mark, its settings name, its own On/Off and a drag
             grip. LIST ORDER IS MENU ORDER: the ring's list reads top =
             leftmost coin (the user's mapping), the plate's top = first
             row. One list open at a time — the tab is a band, not a page.
             Drag is HTML5, armed only from the grip (mouse; a coarse
             pointer reorders nowhere yet — the toggles still work there).
             FT-1260.2: a row carrying `action` is a PICKER — the coin
             clicks assign any one action (or Off) instead of On/Off. Those
             rows take a full line (`ht-ctrl-pick`): the columns' own rule
             is that a select carrying words cannot live in a half-cell. -->
        <template v-for="t in controlToggles">
          <span
            class="ht-set-line ht-ctrl-row"
            :key="t.key"
            :class="{
              'ht-ctrl-inert': t.inert,
              'ht-ctrl-pick': !!t.action,
              'ht-group-start': t.groupStart,
            }"
            :title="t.rowTitle"
          >
            <span class="tw-lead">
              <span class="label">
                <img
                  v-if="t.mark"
                  class="row-mark"
                  :src="t.mark"
                  :alt="t.label"
                />
                <font-awesome-icon v-else class="row-mark-fa" :icon="t.icon" />
                <span class="row-name" v-if="!iconsOnly">{{ t.label }}</span>
              </span>
              <!-- FT-1264 (user): the two MENU rows carry ONE control now.
                   The FT-1260 shape was an On/Off dropdown PLUS a bare
                   chevron — two controls answering one question. The single
                   selector-styled button below wears the menu's SUMMARY as
                   its face ("7 buttons" / "5 of 7" / "Off") and opens the
                   same customization list, with the master On/Off moved
                   INSIDE the list as its top row. Esc / click-out close it
                   (see the menuListOpen watcher). A sizer span holds the
                   trigger at its widest face ("N buttons") so the summary
                   changing under a click cannot shift the layout —
                   OptionSelect's own FT-1088 rule, restated for one label. -->
              <!-- FT-1268 (user): "lets make all of these a checkbox instead
                   of a drop down if there is only two options." THE ROW'S
                   CONTROL NOW SPLITS THREE WAYS instead of two:
                     * a PICKER row (`action`) keeps the dropdown — its list
                       is the whole seat vocabulary, not two states;
                     * a MENU row (`layoutKey`) keeps the summary button
                       below, unchanged (FT-1264);
                     * every other row is a plain On/Off, which is a
                       checkbox — the row's name plus a ticked box, no list
                       to open to read a state that is already binary.
                   Same `t.options` pair, same setToggle writer, same stored
                   booleans; the option list stays authored where it was so
                   the two settings surfaces keep one vocabulary. -->
              <OptionSelect
                v-if="t.action"
                :name="'prefs-' + t.key"
                :aria-label="t.label"
                hoist
                :options="t.options"
                :value="prefs[t.key]"
                @input="setToggle(t.key, $event)"
              />
              <OptionCheck
                v-else-if="!t.layoutKey"
                :name="'prefs-' + t.key"
                :aria-label="t.label"
                :options="t.options"
                :value="prefs[t.key] !== false"
                @input="setToggle(t.key, $event)"
              />
              <button
                v-else
                type="button"
                class="ht-menu-sum"
                :ref="'menuSum-' + t.key"
                :class="{ open: menuListOpen === t.key }"
                :aria-expanded="String(menuListOpen === t.key)"
                :aria-controls="'ht-menu-list-' + t.key"
                :aria-label="
                  t.label + ' — choose and order this menu\'s buttons'
                "
                :title="
                  menuListOpen === t.key
                    ? 'Close this menu\'s button list'
                    : 'Choose and order this menu\'s buttons — On/Off lives inside'
                "
                @click="toggleMenuList(t.key)"
              >
                <span class="ht-menu-sum-wrap">
                  <span class="ht-menu-sum-label">{{ menuSummary(t) }}</span>
                  <span class="ht-menu-sum-sizer" aria-hidden="true">{{
                    "0 of " + menuSlots(t).length
                  }}</span>
                </span>
                <font-awesome-icon icon="chevron-down" class="caret" />
              </button>
            </span>
          </span>
          <!-- FT-1265 (user: "these shouldn't be an inline addition, they
               should be an overlay menu like the click cog menu is"). The
               list is an OVERLAY now — it renders here for Vue's sake, but
               the menuListOpen watcher hoists it to <body> the moment it
               opens (hoistMenuList), where placeMenuList hangs it off its
               own trigger's rect: the tab's rows never move, the disc and
               the scroll well cannot shear it, and the wheel over it
               scrolls the list. Same technique as OptionSelect's hoisted
               list (FT-1167) and golem/floatingPicker; the flat styles it
               wears on <body> live at the bottom of this file's style
               block, beside the reasoning. -->
          <div
            class="ht-menu-list"
            :id="'ht-menu-list-' + t.key"
            :ref="'menuList-' + t.key"
            v-if="t.layoutKey && menuListOpen === t.key"
            :key="t.key + ':list'"
            :class="{ 'ht-menu-off': prefs[t.key] === false }"
          >
            <!-- FT-1264: the MASTER SWITCH is the list's top row — the
                 whole-menu On/Off the row itself used to carry. Same writer
                 (setToggle → setPref), same pref key; the slot rows below
                 dim while it is Off but stay operable, the tab's own
                 inert-but-working grammar (ht-ctrl-inert). -->
            <div class="ht-menu-item ht-menu-master">
              <span class="row-name">This menu</span>
              <!-- FT-1268: this is the dropdown the user was pointing AT
                   ("lets make all of these a checkbox instead of a drop
                   down if there is only two options"). Same key, same
                   setToggle writer, same value — and the list stops being
                   a popup that opens over the popup it lives in. -->
              <OptionCheck
                :name="'prefs-' + t.key"
                :aria-label="t.label + ' on or off'"
                :options="t.options"
                :value="prefs[t.key] !== false"
                @input="setToggle(t.key, $event)"
              />
            </div>
            <div
              v-for="(s, i) in menuSlots(t)"
              :key="s.id"
              class="ht-menu-item"
              :class="menuItemClass(t, i)"
              :draggable="String(menuDragArm === t.key + ':' + i)"
              @dragstart="onMenuDragStart(t, i, $event)"
              @dragover.prevent="onMenuDragOver(t, i, $event)"
              @drop.prevent="onMenuDrop(t)"
              @dragend="onMenuDragEnd"
            >
              <span
                class="ht-menu-grip"
                title="Drag to reorder — the top of this list is the menu's first button"
                @mousedown="menuDragArm = t.key + ':' + i"
                @mouseup="menuDragArm = null"
              ></span>
              <img v-if="s.img" class="row-mark" :src="s.img" :alt="s.label" />
              <font-awesome-icon v-else class="row-mark-fa" :icon="s.icon" />
              <span class="row-name" :class="{ off: !s.on }">{{
                s.label
              }}</span>
              <!-- FT-1268: the seven per-action toggles, the other half of
                   what the user pointed at. A checkbox also frees the row
                   of a hoisted list opening from inside a hoisted list —
                   the z-index stack `.ht-menu-list` documents (55 under
                   `.gsel-menu`'s 60) exists for these and now carries only
                   the two picker rows' lists on the tab behind it. The grip
                   is untouched: drag is armed by `menuDragArm` on the
                   grip's own mousedown, so pressing the box cannot start a
                   reorder. -->
              <OptionCheck
                :name="'prefs-' + t.layoutKey + '-' + s.id"
                :aria-label="s.label"
                :options="menuOnOptions"
                :value="s.on"
                @input="setMenuOn(t, s.id, $event)"
              />
            </div>
          </div>
        </template>
        <span class="ht-set-line ht-group-start">
          <span class="tw-lead">
            <span class="label">
              <font-awesome-icon
                class="row-mark-fa"
                icon="book-open"
                title="The grimoire, the day's end and the bell — their size"
              />
              <span class="row-name" v-if="!iconsOnly">Grimoire size</span>
            </span>
            <OptionSelect
              name="prefs-grimoire-size"
              aria-label="Grimoire size"
              hoist
              :options="grimoireSizeOptions"
              :value="prefs.grimoireSize"
              @input="pickGrimoireSize"
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
        v-if="settingsTab && tower.bellId === 'custom'"
        title="Where the custom bell's sound lives — every player's browser fetches it from here"
      >
        <span class="tw-lead">
          <span class="label">
            <font-awesome-icon
              class="row-mark-fa"
              icon="link"
              title="The custom bell's source"
            />
            <span class="row-name" v-if="!iconsOnly">Bell source</span>
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
        v-if="settingsTab && tower.callId === 'custom'"
        title="Where the call-back's sound lives — every player's browser fetches it from here"
      >
        <span class="tw-lead">
          <span class="label">
            <font-awesome-icon
              class="row-mark-fa"
              icon="link"
              title="The call-back's source"
            />
            <span class="row-name" v-if="!iconsOnly">Call-back source</span>
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
      <RoleTray v-if="scriptTab" />

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
      <!-- FT-1175: the button says WHY it is greyed out, on its own face —
           see `startLabel` for the three blockers and why the words are as
           short as they are. It still says "Start game" the moment it can. -->
      <div
        class="start"
        :class="{ ready: canStart, blocked: !canStart }"
        @click="start"
        :title="startHint"
      >
        {{ startLabel }}
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
import {
  listTowns,
  editKeyFor,
  updateTown,
  // FT-1262: the head's passwords overlay — read the two locks' state
  // (townMeta's booleans) and change them (setTownPasswords).
  townMeta,
  setTownPasswords,
} from "../golem/towns";
// the heading's games-played line — the same per-town aggregate StatsOverlay
// reads, not a new count.
// FT-1236: markDevGame — either dev gesture (fake fill, shift-Start) stamps
// the running game as a TEST game the moment it happens; the end-of-game
// record then lands in the dev ledger, not the real Chronicles.
import { townStats, markDevGame } from "../golem/stats";
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
// FT-1268: …and its two-state twin. A setting that is genuinely ON or OFF
// wears this instead — same plate, same plum "on" ink, no list to open.
// Which rows converted and which kept the dropdown is written on the rows
// themselves and on the component's own header.
import OptionCheck from "./OptionCheck";
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
// FT-1317: the side-view ui-seat.png read as a letter H at small sizes —
// the Seats row wears the front-facing chair with every other live chair mark.
// FT-1337: the import stood down (commented, never deleted) — the Seats row
// is a masked span on var(--chair) now (golem/chairArt owns the art).
// import uiSeat from "../assets/ui-seat-front.svg";
import uiRole from "../assets/ui-role.png";
import uiScript from "../assets/ui-script.png";
// FT-1321: the presentation pair's marks — the seat's unspent-ghost-vote
// cowl (FT-996) for the Ghost vote row.
// FT-1326a (user, on the veil: "wtf is that?"): the End reveal row wears the
// ceremony's own EVIL-WINS emblem — the demon team glyph the FT-1053e banner
// paints — instead of ui-veil3 (a draped bridal veil that read as nothing at
// 22px). Auditioned against the townsfolk glyph (reads as "people", not "the
// show") and the ceremony tentacle (the FT-1321 loser — a red sliver at row
// size); the demon head is the one silhouette that survives 22px AND is
// already the end-of-game show's own face.
import uiGhostCowl from "../assets/ui-ghost-cowl.png";
import uiEndReveal from "../assets/blood/demon-glyph.png";
// FT-1196: the people shuffle wears its own baked mark — ui-seat's chair over
// an opposed pair of arrows (the exchange gesture, distinct from the seat
// menu's single-arrow moves) — instead of sharing FA `random` with the roles
// shuffle one row down. Same recipe and geometry family as ui-move-player.
import uiShufflePlayer from "../assets/ui-shuffle-player.png";
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
// FT-1202: the settings gear — moved here from the corner strips (Menu.vue,
// where it and its section stand down), because everything behind it is a
// storyteller concern and this panel is the storyteller's own surface.
import uiCog from "../assets/ui-cog.png";
import PrefsMenu from "./PrefsMenu";
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
  // FT-1210: the whisper-plane linger scrub's bounds — the same shape.
  WHISPER_MARK_SEC_MIN,
  WHISPER_MARK_SEC_MAX,
  previewBell,
  // FT-1045: the bell buttons preview as they pick, and Custom brings a
  // source row — a validated link, or an upload that becomes one.
  toggleBellPreview,
  // FT-1087: picking Off on the merged bell select silences a preview that is
  // still running — the pair of segments it replaced had no way to say that.
  stopBellPreview,
} from "../golem/towerBells";
// FT-1206: the chat levels and the plane's linger choices — the two new
// rows offer them; the keys ride the tower shelf like every setting here.
import { CHAT_LEVELS, WHISPER_MARK_SECS } from "../golem/chat";
// FT-1314: the Automations group's vocabulary — one row per rule, authored
// beside the engine that fires them (golem/automations.js) so the checkbox a
// storyteller reads and the behaviour it arms cannot drift apart.
// FT-1322: the role-declared rules render from the SELECTED SCRIPT's roles
// (roleAutomationRules), each row wearing its role's token art via the
// shared resolver (golem/roleIcon) — a script without the role has no row.
import { AUTOMATION_RULES, roleAutomationRules } from "../golem/automations";
import { roleIconUrl } from "../golem/roleIcon";
// FT-1051: the shared custom-audio machinery (one helper serving the bell
// AND the call-back), and the call-back's own preview.
import { probeAudioUrl, uploadAudioFile } from "../golem/customAudio";
import { toggleCallBackPreview } from "../golem/callBack";
// FT-1168: THIS BROWSER'S OWN SETTINGS — read-only here. The panel reads one
// of them (does each mark wear its name?); the corner cog is the only writer.
// Note which way this dependency points: a PERSONAL setting dresses a panel
// whose CONTENTS are the town's, and the panel never writes back.
// FT-1209: the tab's three rows need the option lists and the one writer too
// — the same imports PrefsMenu holds, reading and writing the same module.
import {
  CONTROL_SCHEMES,
  CONTROL_TOGGLES,
  GRIMOIRE_SIZES,
  SETUP_LABELS,
  PREFS_EVENT,
  prefsState,
  setPref,
} from "../golem/prefs";
// FT-1260: the seat vocabulary as orderable slots — what the two menu rows'
// expander lists render (every action, always — the teaching duty the menus'
// fixed-list rule used to carry) and what the coin-click pickers offer.
import { seatActionSlots } from "../golem/seatActions";
// FT-1227 (user): the Control rows whose marks are the app's OWN baked art
// rather than a Font Awesome stand-in — the drag rows wear the hover ring's
// move icons and the reminder row wears the nameplate hover's pin, so a row
// teaching a gesture shows the exact mark the gesture itself uses. Keyed by
// toggle key; a row not named here keeps its FA icon from CONTROL_TOGGLES.
import uiRoleMark from "../assets/ui-role.png";
import uiDeadMark from "../assets/ui-dead.png";
import uiRoleNameMark from "../assets/ui-role-name.png";
import uiMoveRole from "../assets/ui-move-role.png";
import uiMovePlayer from "../assets/ui-move-player.png";
import uiNote from "../assets/ui-note.png";

// FT-1264: where the Control tab's light groups begin — the click targets,
// the two menus, then the drags + the pin. Setup panel opens the tab and
// Grimoire size (a `ht-group-start` class straight on its row) closes it.
const GROUP_STARTS = ["ctrlClickNameAction", "ctrlHoverCoins", "ctrlDragRoles"];

const TOGGLE_MARKS = {
  // FT-1230 (user): the change-role click wears the app's own role coin,
  // not the FA masks; the kill click wears the app's own death mark.
  // (FT-1260.2 rekeyed the two click rows onto their picker prefs.)
  //
  // FT-1264 (user) RE-DEALS THE TWO CLICK ROWS' MARKS. Those marks dated
  // from when the rows MEANT their acts (change role / kill); now each row
  // is an assignable picker, so its mark must say WHERE you click, not what
  // the click used to do. "Click Cog" takes the toothed coin itself
  // (ui-role.png — the app's own glyph for the gear-toothed player coin,
  // the user's "Cog"), and "Click role name" takes ui-role-name.png, a
  // fresh bake in the same family recipe: the same coin with its nameplate
  // bar across the lower edge, knockout-separated — the name ON the coin.
  // uiDeadMark stands down from this map, kept imported as the record.
  ctrlClickNameAction: uiRoleNameMark,
  ctrlClickDeadAction: uiRoleMark,
  ctrlDragRoles: uiMoveRole,
  ctrlDragNames: uiMovePlayer,
  ctrlReminderHover: uiNote,
};

/**
 * FT-1168: THE TWO TABS. The user's own two names for them, in their order —
 * what you do on the way to Start, then what this town is like.
 */
const SETUP_TABS = [
  {
    id: "script",
    label: "Script setup",
    icon: "scroll",
    title: "The chairs, the script, the characters and who is holding them",
  },
  {
    id: "settings",
    label: "Game settings",
    icon: "cog",
    title: "This town's own rules — the night checklist, the bells, the clock",
  },
  // FT-1209 (user): the THIRD tab — the storyteller's own settings, moved in
  // from the gear's floating menu. `user-cog`, not the gear's own plain cog:
  // that glyph already names the Game settings tab one leaf over, and two
  // identical marks on one strip would make the reader tell the tabs apart
  // by words alone. The person-with-a-gear is the same meaning with the
  // "yours" said in the mark — which is exactly this tab's line.
  {
    id: "prefs",
    label: "Control settings",
    icon: "user-cog",
    title: "Your own settings — this browser, every town",
  },
];

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
    OptionCheck,
    // FT-1202: the settings gear's own menu, anchored to the head
    PrefsMenu,
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
    // FT-1209: the tab strip's alignment over the gear is a measurement (see
    // alignTabs) — taken once the DOM stands, again on resize (which is also
    // when the disc gate flips), and again when the display fonts land,
    // because the tabs' widths are type.
    this.$nextTick(this.alignTabs);
    window.addEventListener("resize", this.alignTabs);
    // FT-1231: overflow is re-asked whenever the box's height can change —
    // resize here, every re-render via updated() (which is also what covers
    // the tab switch that mounts the rows at all), and once the display
    // fonts land (same reason alignTabs waits for them: the rows' names are
    // type, and a fallback-font transient must not latch the answer).
    // FT-1266: the same three triggers now answer for BOTH settings tabs —
    // one hook, two boxes (measurePrefsOverflow), because exactly one of them
    // is ever mounted and the things that change either height are the same.
    window.addEventListener("resize", this.measurePrefsOverflow);
    this.$nextTick(this.measurePrefsOverflow);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(this.measurePrefsOverflow);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(this.alignTabs);
    }
    // FT-1213: one read — Player.vue's own idiom and the same media query,
    // so the tab's inert dress and the seat's refusal can never disagree.
    try {
      this.hasHover = window.matchMedia("(hover: hover)").matches;
    } catch (e) {
      this.hasHover = true;
    }
  },
  watch: {
    // FT-1294: a `rolesAssigned` watcher stood here, flipping the grimoire
    // face-up the moment the host's first role landed while building. There
    // is no face-down state left for it to correct — the coins are always
    // revealed — so the watcher went with it. `rolesAssigned` itself is
    // untouched; the seat counter and the deal's own gates still read it.
    // FT-1209: the gear's position is the h3's width — a rename (or the
    // rename input coming down) moves it; a tab switch re-weights a label
    // (the chosen leaf is bold). All re-measure after the DOM settles.
    townName: "queueAlignTabs",
    renaming: "queueAlignTabs",
    setupTab: "queueAlignTabs",
    reentry: "queueAlignTabs",
    // FT-1264: the menu list closes on Esc / click-out now that its trigger
    // reads as a dropdown (the two menu rows' one control) — the listeners
    // live only while a list is open, the same discipline OptionSelect keeps
    // for its own popup.
    menuListOpen(open) {
      if (open) {
        document.addEventListener("mousedown", this.onMenuDocDown);
        document.addEventListener("keydown", this.onMenuKey);
        // FT-1265: the list is a body-level overlay now (see the template
        // note) — hoist the newly rendered element and track its trigger.
        // Capture phase for scroll, because the Control tab's own well does
        // not bubble its scroll to window; re-adding the same handler on a
        // ring→plate switch is a no-op, so this arm needs no guard.
        window.addEventListener("scroll", this.trackMenuList, true);
        window.addEventListener("resize", this.trackMenuList);
        this.$nextTick(this.hoistMenuList);
      } else {
        document.removeEventListener("mousedown", this.onMenuDocDown);
        document.removeEventListener("keydown", this.onMenuKey);
        window.removeEventListener("scroll", this.trackMenuList, true);
        window.removeEventListener("resize", this.trackMenuList);
      }
    },
    // FT-1262: the head's passwords overlay keeps the SAME discipline as the
    // menu lists above — listeners only while it is open, hoisted to <body>
    // on the tick after it renders. Its trigger sits in the head rather than
    // in a scrolling tab, so the capture-phase scroll listener matters less
    // here; it is kept anyway, because the panel itself scrolls on a phone.
    passOpen(open) {
      if (open) {
        document.addEventListener("mousedown", this.onPassDocDown);
        document.addEventListener("keydown", this.onPassKey);
        window.addEventListener("scroll", this.trackPassMenu, true);
        window.addEventListener("resize", this.trackPassMenu);
        this.$nextTick(this.hoistPassMenu);
      } else {
        document.removeEventListener("mousedown", this.onPassDocDown);
        document.removeEventListener("keydown", this.onPassKey);
        window.removeEventListener("scroll", this.trackPassMenu, true);
        window.removeEventListener("resize", this.trackPassMenu);
      }
    },
  },
  data() {
    return {
      // FT-888: the composition readout's static furniture
      COMP_TEAMS,
      TEAM_LABELS,
      // FT-1168: the tabs (three since FT-1209), and which one is showing.
      // Held in `data`, not
      // in the store or a stash: it is where this storyteller is looking
      // right now, not something the town or the browser is owed on the next
      // reload — and Script setup is the honest place to open, because a
      // fresh town has chairs to fill before it has rules to set.
      setupTabs: SETUP_TABS,
      setupTab: "script",
      // FT-1209: the strip's measured right inset — how far the tabs come in
      // off the strip's right edge so the last one stands over the gear
      // (alignTabs writes it; 0 until something is measured).
      // FT-1266: NOTHING READS IT. The strip centres on the panel's axis now
      // and the template's binding came off — see alignTabs' own note for why
      // the measurement is kept rather than removed.
      tabInset: 0,
      // FT-1168: this browser's own settings, snapshotted — a plain module
      // object is not reactive; readPrefs refreshes it on PREFS_EVENT, the
      // same shape `tower` below already runs on.
      prefs: { ...prefsState },
      // FT-1213: does this device have a resting pointer? Read once in
      // mounted (a property of the machine, not the session) — Player.vue's
      // own idiom for the same fact. Dresses the "Hover coins" row inert on
      // a coarse pointer.
      hasHover: true,
      // FT-1260: the expander state — which menu row's button list is open
      // (its CONTROL_TOGGLES key), one at a time; and the drag-in-progress
      // facts. `menuDragArm` is the grip's arming latch: the row is only
      // draggable while the pointer went down on its grip, so a grab on the
      // row's own On/Off can never start a reorder.
      menuListOpen: null,
      menuDrag: null,
      menuDropAt: null,
      menuDragArm: null,
      // ── FT-1262: the head's PASSWORDS overlay ──────────────────────────
      // Until FT-1262 the two town passwords could only be set at CLAIM
      // (Intro's host panel, FT-1241) — a running town had no way to add,
      // change or clear one. This is that way: the head's key button opens
      // a hoisted overlay (the FT-1265 dress) holding one row per lock.
      passOpen: false,
      // What the SERVER says is set, never what was typed — the wire speaks
      // booleans only (`requiresEnterPassword` / `openPasswordSet`), so
      // `null` is the honest "not asked yet" and the rows say so.
      passState: { enter: null, open: null },
      // The two inputs. Cleared after a successful set: a password already
      // stored is never rendered back, so leaving the typed text sitting
      // there would be the only place in the app showing one.
      passDraft: { enter: "", open: "" },
      // Which row is mid-flight ("enter" | "open" | null) — disables that
      // row's own controls without freezing the other lock's.
      passBusy: null,
      // The last word per row: {kind: "ok"|"err", text}. The server's own
      // refusal when it refuses (golem/towns' setTownPasswords translates
      // the status), never a guess.
      passNote: { enter: null, open: null },
      // FT-1231: does the Control tab hold more rows than its box can show?
      // Only ever true on the disc, where the band is a fixed slice of the
      // circle and the tab is its own scroller — everywhere else the panel
      // scrolls and the box is content-sized. Measured, never assumed
      // (measurePrefsOverflow); drives the `scrolls` well, the same contract
      // NightSheet's rowsOverflow and RoleTray's overflowing keep.
      prefsOverflow: false,
      // FT-1266: the same question for the GAME settings tab, which was never
      // wired to the FT-1231 ladder and has been overrunning the disc's band
      // by a measured 28.1px at the pinched discs (see the tab's own template
      // note). One flag per tab rather than one shared flag: the two boxes are
      // different heights and only one is ever mounted, so a shared flag would
      // be a value that means different things depending on which tab is up.
      gameOverflow: false,
      // the picker's vault selection (officials read from the store)
      vaultPickedId: null,
      grimoireClosed,
      // FT-936: the row-mark art
      // FT-1337: uiSeat stood down with its import — the Seats row reads
      // var(--chair) as a mask now.
      uiRole,
      uiScript,
      // FT-1321: the presentation pair's marks
      uiGhostCowl,
      uiEndReveal,
      // FT-1196: the people shuffle's own mark
      uiShufflePlayer,
      // FT-1264: STOOD DOWN from TOGGLE_MARKS (the Click Cog row wears the
      // coin now, not the death mark) — held here as the record, the same
      // shelf the other row marks sit on; nothing renders it.
      uiDeadMark,
      // FT-1098: the header's own mark — the TOWN's, not the script's.
      uiTown,
      // FT-1202: the settings gear beside the name, and its menu's state —
      // open-or-not plus the gear element the menu hangs its rect off.
      uiCog,
      prefsOpen: false,
      prefsAnchor: null,
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
      // FT-1210: the Whisper marks row's same furniture — the linger scrub's
      // bounds, and what the scrub shows while Off (the last set linger, so
      // On returns to it rather than to an arbitrary number).
      whisperSecMin: WHISPER_MARK_SEC_MIN,
      whisperSecMax: WHISPER_MARK_SEC_MAX,
      whisperSecDraft: towerState.whisperMarkSec || 8,
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
    // FT-1168: ...and this browser's own settings, which dress the panel
    // without belonging to it.
    window.addEventListener(PREFS_EVENT, this.readPrefs);
  },
  beforeDestroy() {
    window.removeEventListener(TOWER_EVENT, this.readTower);
    window.removeEventListener(PREFS_EVENT, this.readPrefs);
    // FT-1264: the open menu list's Esc / click-out listeners (bound by the
    // menuListOpen watcher; a teardown mid-open must not strand them)
    document.removeEventListener("mousedown", this.onMenuDocDown);
    document.removeEventListener("keydown", this.onMenuKey);
    // FT-1265: the overlay's tracking listeners, same discipline — and the
    // hoisted list itself, which is no longer this component's DOM child, so
    // the teardown that removes the panel's own tree would strand it on
    // <body> (OptionSelect's beforeDestroy makes the same sweep).
    window.removeEventListener("scroll", this.trackMenuList, true);
    window.removeEventListener("resize", this.trackMenuList);
    const openList = this.menuListEl && this.menuListEl();
    if (openList && openList.parentElement === document.body) openList.remove();
    // FT-1262: the passwords overlay is hoisted the same way and needs the
    // same sweep — listeners, then the stranded node.
    document.removeEventListener("mousedown", this.onPassDocDown);
    document.removeEventListener("keydown", this.onPassKey);
    window.removeEventListener("scroll", this.trackPassMenu, true);
    window.removeEventListener("resize", this.trackPassMenu);
    const passEl = this.$refs.passMenu;
    if (passEl && passEl.parentElement === document.body) passEl.remove();
    // FT-1209: the strip's alignment listener (bound in mounted)
    window.removeEventListener("resize", this.alignTabs);
    // FT-1231: the settings tabs' overflow listener (bound in mounted;
    // FT-1266: it asks for both tabs now)
    window.removeEventListener("resize", this.measurePrefsOverflow);
  },
  /** FT-1231: any re-render can change a settings tab's content height (a
   *  toggle's row count never changes, but the tab mounts/unmounts and the
   *  disc gate flips the box it lives in) — re-ask after the DOM settles.
   *  Guarded write in measurePrefsOverflow, so this cannot loop.
   *  FT-1266: "a settings tab" is now either of the two. */
  updated() {
    this.measurePrefsOverflow();
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
    // ── FT-1168: the tabs (three since FT-1209), and the panel's dress ─────────────────────
    /** The build face, on Script setup. Every row that was `!reentry` is
     *  this now — the same gate, narrowed by which tab is up. */
    scriptTab() {
      return !this.reentry && this.setupTab === "script";
    },
    /** The town's own rules. `reentry ||` because the settings rows were
     *  NEVER gated on `!reentry` — a storyteller mid-game still owns the
     *  checklist, the bells and the clock, and the greeting face has always
     *  shown them. That stays exactly true. */
    settingsTab() {
      return this.reentry || this.setupTab === "settings";
    },
    /** FT-1209: the storyteller's OWN settings, as the third tab. Build face
     *  only — the re-entry face renders no tab strip, and its gear opens the
     *  floating PrefsMenu instead (see togglePrefs). */
    prefsTab() {
      return !this.reentry && this.setupTab === "prefs";
    },
    // FT-1209: the three rows' option lists — prefs.js's own vocabulary,
    // mapped the same way PrefsMenu maps it.
    setupLabelOptions() {
      return SETUP_LABELS;
    },
    /** FT-1213: STOOD DOWN — the exclusive scheme dropdown's option list.
     *  Nothing renders it; `controlToggles` below is what the tab shows. */
    controlSchemeOptions() {
      return CONTROL_SCHEMES.map((s) => ({
        value: s.id,
        label: s.label,
        title: s.title,
      }));
    },
    /**
     * FT-1213: the toggle rows, dressed for the tab. Each row carries
     * its teaching title (`rowTitle`), its two named options (a checkbox is
     * a selector that refuses to name one of its states — SETUP_LABELS'
     * own rule), and `inert` for the one gesture a coarse-pointer device
     * cannot perform: "Hover coins" has no rest-the-pointer gesture on a
     * finger. The inert row stays OPERABLE — the value follows the account
     * (FT-1202) to machines that do have a pointer — it just says so.
     * FT-1227: `mark` is the row's baked art where TOGGLE_MARKS names one.
     */
    controlToggles() {
      return CONTROL_TOGGLES.map((t) => {
        const inert = t.key === "ctrlHoverCoins" && !this.hasHover;
        let rowTitle = inert
          ? t.title +
            " — this device has no resting pointer, so the gesture " +
            "cannot fire here; the setting still follows your account"
          : t.title;
        let options;
        if (t.action) {
          // FT-1260.2: a coin-click row — the picker's face IS the
          // assignment, and the title restates it in a sentence.
          options = this.clickActionOptions;
          const cur = options.find((o) => o.value === this.prefs[t.key]);
          if (cur) rowTitle += " — set to: " + cur.label;
        } else {
          options = [
            { value: true, label: "On", title: t.title },
            { value: false, label: "Off", title: "Turn this gesture off" },
          ];
          // FT-1260: a menu whose every button is off never opens — the
          // master row is where a person would look for why, so it says.
          if (
            t.layoutKey &&
            (this.prefs[t.layoutKey] || []).every((e) => e.on === false)
          ) {
            rowTitle +=
              " — every button in this menu is off, so it will not open";
          }
        }
        return {
          ...t,
          inert,
          mark: TOGGLE_MARKS[t.key] || null,
          rowTitle,
          options,
          // FT-1264: the tab's light grouping — spacing only, no headers
          // (judged at row size: five labeled bands would out-weigh nine
          // rows). A row starting a group opens a little extra air above
          // itself in the single-column dresses; the disc's two-column
          // dress zeroes it, because there the rows pair ACROSS groups and
          // a gap on half a line would shear the pair.
          groupStart: GROUP_STARTS.includes(t.key),
        };
      });
    },
    /** FT-1260: the vocabulary's slots by id — the expander lists' art and
     *  names. Computed once; the vocabulary is a static module list. */
    seatSlotIndex() {
      const m = {};
      seatActionSlots().forEach((s) => {
        m[s.id] = s;
      });
      return m;
    },
    /** FT-1260: the expander rows' own two named options. */
    menuOnOptions() {
      return [
        { value: true, label: "On", title: "This button shows in the menu" },
        {
          value: false,
          label: "Off",
          title: "Hide this button from the menu",
        },
      ];
    },
    /** FT-1260.2: what a coin click may be assigned — Off, or any one slot
     *  of the vocabulary (the nominate/ghost-vote pair is one choice; which
     *  of the two fires follows the seat's life state, the slot's rule).
     *  FT-1346: each option carries the slot's own mark (`img`, falling back
     *  to `icon`) — OptionSelect's new optional per-option icon pathway —
     *  so this picker wears the same art the plate/ring menus draw for the
     *  same action. Off is deliberately bare: there is no mark for "nothing". */
    clickActionOptions() {
      return [
        { value: "off", label: "Off", title: "This click does nothing" },
        ...seatActionSlots().map((s) => ({
          value: s.id,
          label: s.label,
          title: "This click runs " + s.label,
          img: s.img,
          icon: s.icon,
        })),
      ];
    },
    grimoireSizeOptions() {
      return GRIMOIRE_SIZES.map((g) => ({
        value: g.id,
        label: g.label,
        title: g.title,
      }));
    },
    /** Marks alone, or marks with their names beside them (user's setting,
     *  off the corner cog). Personal, not the town's — see golem/prefs. */
    iconsOnly() {
      return this.prefs.setupIconsOnly;
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
        // FT-1229: the third answer — the length is set NIGHT BY NIGHT, on
        // the night sheet's own "Day N timer" row (which shows only here).
        {
          value: "perday",
          label: "Per day",
          title:
            "You set each coming day's length on the night sheet, night by night",
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
    /** FT-1206: the Chat row's choices — golem/chat's own table, so the
     *  select and the enforcement can never disagree about the levels. */
    chatOptions() {
      return CHAT_LEVELS.map((l) => ({
        value: l.id,
        label: l.label,
        title: l.title,
      }));
    },
    /** FT-1206: the plane's linger — Off, or seconds by the coin. STOOD
     *  DOWN by FT-1210 (the row is Off/On + a seconds scrub now, the Day
     *  timer's anatomy); left in place, never deleted — the record of what
     *  the preset dropdown offered. */
    whisperMarkOptions() {
      return WHISPER_MARK_SECS.map((s) => ({
        value: String(s),
        label: s === 0 ? "Off" : `${s}s`,
        title:
          s === 0
            ? "No planes — a whisper leaves no public trace"
            : `The plane rests by the recipient's coin for ${s} seconds`,
      }));
    },
    /** FT-1210: Off / On, the Day timer's own two-position shape — the
     *  VALUE is derived from the seconds, not stored: a linger of 0 IS Off,
     *  exactly as a day length of 0 is. */
    whisperMarkModeOptions() {
      return [
        {
          value: "off",
          label: "Off",
          title: "No planes — a whisper leaves no public trace",
        },
        {
          value: "on",
          label: "On",
          title:
            "Every whisper flies a paper plane the whole town sees — seats only, never words",
        },
      ];
    },
    /** FT-1206: the Chronicle's whisper tally, on or off. */
    whisperCountOptions() {
      return [
        {
          value: "off",
          label: "Off",
          title: "No tally — the Chronicle keeps only the whispers themselves",
        },
        {
          value: "on",
          label: "On",
          title:
            "The Chronicle shows who whispered whom this game, and how many times",
        },
      ];
    },
    /** FT-1314: the Automations group's rows — the module's own list.
     *  FT-1322: the role-agnostic rules (which carry their own painted
     *  marks), then the SELECTED SCRIPT's role-declared rules, each dressed
     *  in its role's token art — the same icon the role's coin renders,
     *  through the same resolver. A script without the role has no row;
     *  `state.roles` is replaced wholesale on a script change, so this
     *  recomputes with the selection. */
    automationRules() {
      const baseById = this.$store.getters.rolesJSONbyId;
      const roleRules = roleAutomationRules(this.$store.state.roles).map(
        (rule) => ({
          ...rule,
          mark: roleIconUrl(rule.role, baseById),
        }),
      );
      return AUTOMATION_RULES.concat(roleRules);
    },
    /** FT-1327: the folded group's one face — how many rules are armed, in
     *  menuSummary's own compact grammar ("All 6" / "3 of 6"; "0 of 6" is
     *  the everything-off default and says so). No master switch, so no
     *  "Off" face — the count IS the whole state. */
    automationSummary() {
      const rules = this.automationRules;
      const on = rules.filter((rule) => this.tower[rule.key]).length;
      return on === rules.length && on > 0
        ? "All " + on
        : on + " of " + rules.length;
    },
    /** FT-1315: what marks a spent ghost vote — the two vocabularies. */
    ghostSpentOptions() {
      return [
        {
          value: "cowl",
          label: "Ghost mark",
          title:
            "A spent vote crosses out the seat's ghost-vote mark — today's behaviour",
        },
        {
          value: "shroud",
          label: "Drop shroud",
          title:
            "A spent vote takes the death shroud OFF the seat — shrouded dead still hold their vote, bare dead have spent it",
        },
      ];
    },
    /** FT-1316: the end-of-game ceremony, on or off. */
    endCeremonyOptions() {
      return [
        {
          value: "off",
          label: "Off",
          title:
            "The end lands quietly — no animation, just the settled result, so you can stage your own reveal",
        },
        {
          value: "on",
          label: "On",
          title: "The end-of-game show plays on every screen when you call it",
        },
      ];
    },
    /** FT-1309: the Chronicle's whisper-traffic lines, on or off. */
    whisperTrafficOptions() {
      return [
        {
          value: "off",
          label: "Off",
          title:
            "No traffic lines — the Chronicle stops logging who whispered whom",
        },
        {
          value: "on",
          label: "On",
          title:
            "Every whisper writes a line in the Chronicle — who whispered whom, never what",
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
    /**
     * FT-1175 (user): "The start game button needs to tell the user why it is
     * disabled."
     *
     * THE REASON WAS ALWAYS THERE AND NOBODY COULD SEE IT. `startHint` above
     * has named the blocker since this panel was built, but it rides the
     * button's `title` and a sentence under it — and on the DESKTOP DISC that
     * sentence is folded away (see `.start-dock .hint` in the disc rules,
     * where the cap has room for the button or the pair, not both). So the
     * one layout most storytellers build in showed a greyed slab and nothing
     * else. FT-1089 is the cost of that class of silence: a refusal nobody
     * could see hid a real bug for hours.
     *
     * IT NAMES THE ACTUAL BLOCKER, in the same order and off the same three
     * conditions `canStart` tests, so the face and the tooltip can never
     * disagree about which one is biting:
     *
     *   no seats at all              -> "Add seats"
     *   a chair nobody has claimed   -> "N seats open"
     *   a seat with no character     -> "Deal roles"
     *
     * SHORT BECAUSE THE BUTTON IS A CHORD, NOT A RECTANGLE. On the disc the
     * dock is `max(150px, 0.583 * fd-rx)` and the 150px floor is set by
     * "Start game" itself fitting on one line — a wider button pushes its own
     * bottom corners out past the arc, which this file has re-measured twice
     * (see `.start-dock`). So the sentence shortens rather than the button
     * widening, and the full sentence stays one hover away in the `title`
     * and on the line below wherever that line is shown. "N seats open" is
     * the one that had to give the most: it is the same fact as "waiting on
     * N seats to be claimed", said in the width available.
     */
    startLabel() {
      if (this.canStart) return "Start game";
      if (!this.players.length) return "Add seats";
      const open = this.coreSeats.filter((p) => !p.id).length;
      if (open) return `${open} seat${open === 1 ? "" : "s"} open`;
      return "Deal roles";
    },
  },
  methods: {
    ...mapMutations(["toggleModal"]),
    // FT-888: golem/glyphs' team art, the same call TownInfo makes.
    teamGlyph,
    /** FT-1168: a personal setting changed in the corner menu — re-read the
     *  snapshot this panel's dress is drawn from. */
    readPrefs() {
      this.prefs = { ...prefsState };
    },
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
      // FT-1210: the whisper linger keeps the same promise — On returns to
      // the last seconds this town had set.
      if (this.tower.whisperMarkSec > 0) {
        this.whisperSecDraft = this.tower.whisperMarkSec;
      }
    },
    /** One choice made: validate, persist for THIS town, tell the dial. */
    setTower(key, value) {
      setTowerField(this.session.sessionId || "", key, value);
    },
    /** FT-1055: the minutes scrubbed (or typed) — a length being set is a
     *  length wanted, so scrubbing while Off also turns the countdown on.
     *  FT-1229: "on" means Timed here; a Per-day town keeps its mode (this
     *  scrub is then just the second door to the same minutes the night
     *  sheet's row owns). */
    setDayLength(n) {
      this.dayLenDraft = n;
      this.setTower("dayLengthMin", n);
      if (this.tower.dayTimerMode === "off") {
        this.setTower("dayTimerMode", "timed");
      }
    },
    /** FT-1087: Off or Timed, off the row's select. Exactly what the two
     *  segment cells wrote — 0, or the draft the scrub is showing — so the
     *  "Timed returns to the last length you set" behaviour is unchanged.
     *  FT-1229: the mode is STORED now (three answers), and the minutes ride
     *  along: Off zeroes them, Timed and Per day both restore the draft —
     *  the countdown machinery still keys off dayLengthMin alone. */
    setDayMode(v) {
      this.setTower("dayTimerMode", v);
      this.setTower("dayLengthMin", v === "off" ? 0 : this.dayLenDraft);
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
    /** FT-1206: the three chat rows — plain tower writes; the shelf persists
     *  per town, syncs live, and the composers re-read on its event. */
    pickChatLevel(id) {
      this.setTower("chatLevel", id);
    },
    /** FT-1206's preset pick — STOOD DOWN by FT-1210 (the row is the Day
     *  timer's Off/On + scrub pair now, handled by the two methods below);
     *  left in place, never deleted. */
    pickWhisperMarks(v) {
      this.setTower("whisperMarkSec", Number(v));
    },
    /** FT-1210: the seconds scrubbed (or typed) — a linger being set is a
     *  linger wanted, so scrubbing while Off also turns the planes on
     *  (setDayLength's own rule). */
    setWhisperMarkSec(n) {
      this.whisperSecDraft = n;
      this.setTower("whisperMarkSec", n);
    },
    /** FT-1210: Off or On, off the row's select — 0, or the draft the scrub
     *  is showing, so "On returns to the last linger you set" holds exactly
     *  as the Day timer's Timed does. */
    setWhisperMarkMode(v) {
      this.setTower("whisperMarkSec", v === "on" ? this.whisperSecDraft : 0);
    },
    /** FT-1309: the traffic line's switch — the counts row's own writer
     *  shape, one tower key over. */
    pickWhisperTraffic(v) {
      this.setTower("whisperTraffic", v === "on");
    },
    /** FT-1315: the spent-ghost-vote vocabulary — a plain tower write; the
     *  seats re-read on the tower's own event, this client and every synced
     *  one alike. */
    pickGhostSpentMark(v) {
      this.setTower("ghostSpentMark", v);
    },
    /** FT-1316: the end-of-game show's switch — same shape; EndCeremony's
     *  trigger reads the synced copy at the moment the end lands. */
    pickEndCeremony(v) {
      this.setTower("endCeremonyOn", v === "on");
    },
    /** FT-1314: one automation armed or stood down — a plain tower write;
     *  the shelf persists per town, syncs live, and the engine reads the
     *  module's own copy at the moment each rule is judged. */
    pickAutomation(key, v) {
      this.setTower(key, v === "on");
    },
    /** FT-1314: the two-option pair OptionCheck's contract wants, built from
     *  the rule's own authored titles. */
    automationOptions(rule) {
      return [
        { value: "off", label: "Off", title: rule.offTitle },
        { value: "on", label: "On", title: rule.onTitle },
      ];
    },
    pickWhisperCounts(v) {
      this.setTower("whisperCounts", v === "on");
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
    /** FT-1202 / FT-1209: the gear is the Control settings SHORTCUT. On the
     *  build face it drives the tab strip — open that tab, or step back to
     *  Script setup if it is already up (a tab row is never tabless, so the
     *  default tab is what "closed" means here, the same place the strip
     *  itself opens on). The RE-ENTRY face renders no strip, so the gear
     *  keeps its FT-1202 door there: the floating PrefsMenu, anchored to the
     *  gear element (which ignores mousedowns on its anchor so this toggle
     *  is the one closer, not a race with the menu's own outside-click). */
    togglePrefs(ev) {
      if (this.reentry) {
        this.prefsAnchor = ev.currentTarget;
        this.prefsOpen = !this.prefsOpen;
        return;
      }
      this.setupTab = this.setupTab === "prefs" ? "script" : "prefs";
    },
    // FT-1209: the three rows' writers — one line each into golem/prefs, the
    // same calls PrefsMenu makes (readPrefs hears the echo like every other
    // surface).
    setIconsOnly(on) {
      setPref("setupIconsOnly", on);
    },
    /** FT-1213: STOOD DOWN with its dropdown — nothing calls it. */
    pickScheme(id) {
      setPref("controlScheme", id);
    },
    /** FT-1213: the six toggles' one writer — the same setPref every other
     *  row uses, so localStorage and the account sync both hear it.
     *  (FT-1260.2: the picker rows ride the same writer — `on` is their
     *  assigned slot id, and golem/prefs sanitizes either shape.) */
    setToggle(key, on) {
      setPref(key, on);
    },
    // ── FT-1260: the menu rows' expander lists ───────────────────────────
    /** One list open at a time — the tab is a band, not a page. */
    toggleMenuList(key) {
      this.menuListOpen = this.menuListOpen === key ? null : key;
    },
    // ── FT-1265: THE LIST IS AN OVERLAY (see the template note) ──────────
    /** The open list's trigger / list elements. `$refs` inside a v-for are
     *  arrays; each key renders at most one of each. */
    menuSumEl() {
      const r = this.$refs["menuSum-" + this.menuListOpen];
      return (Array.isArray(r) ? r[0] : r) || null;
    },
    menuListEl() {
      const r = this.$refs["menuList-" + this.menuListOpen];
      return (Array.isArray(r) ? r[0] : r) || null;
    },
    /** Move the freshly rendered list to <body> and place it. Vue's own
     *  patch keeps working on the moved node (v-if teardown removes it via
     *  its live parentNode) — OptionSelect's mountMenu is the precedent. */
    hoistMenuList() {
      const list = this.menuListEl();
      if (!list) return;
      if (list.parentElement !== document.body) document.body.appendChild(list);
      this.placeMenuList();
      // its natural height isn't known until it has laid out once —
      // golem/floatingPicker's positionPopup hits the same snag, same fix
      requestAnimationFrame(this.placeMenuList);
    },
    /** Fixed to the trigger's rect, flipping up when below is short and
     *  clamped to the window — golem/floatingPicker's positionPopup math,
     *  restated here because that mixin owns a single popup per component
     *  and this panel has one list per menu row.
     *
     *  FT-1262: the MATH moved down into `placePopupAt` so the head's
     *  passwords overlay can hang off its own button by the same rules —
     *  this stays the menu rows' door to it, unchanged in behaviour. */
    placeMenuList() {
      this.placePopupAt(this.menuSumEl(), this.menuListEl());
    },
    /** FT-1262: place ANY hoisted popup against ANY trigger — FT-1265's own
     *  geometry, lifted out of `placeMenuList` verbatim (prefer-down unless
     *  the other side plainly has more room, height capped to the window's
     *  remainder, width at least the trigger's, left clamped to the
     *  viewport). Two callers now: the Control tab's menu lists and the
     *  head's passwords overlay. */
    placePopupAt(trigger, list) {
      if (!trigger || !list) return;
      const rect = trigger.getBoundingClientRect();
      const box = list.getBoundingClientRect();
      const margin = 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // prefer downward unless there plainly isn't room and the other side
      // has more — a merely tight fit should not make the list jump sides
      const openDown =
        spaceBelow >= Math.min(box.height, 220) || spaceBelow >= spaceAbove;
      const maxH = Math.max(
        120,
        (openDown ? spaceBelow : spaceAbove) - margin * 2,
      );
      const width = Math.max(
        rect.width,
        Math.min(box.width || 260, window.innerWidth - margin * 2),
      );
      const left = Math.min(
        Math.max(rect.left, margin),
        Math.max(margin, window.innerWidth - width - margin),
      );
      list.style.left = `${left}px`;
      list.style.width = `${width}px`;
      list.style.maxHeight = `${maxH}px`;
      if (openDown) {
        list.style.top = `${rect.bottom + 4}px`;
        list.style.bottom = "auto";
      } else {
        list.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        list.style.top = "auto";
      }
    },
    /** Reposition on any scroll/resize — and close if the trigger has been
     *  scrolled more than half out of view (a list left pointing at a row
     *  that has scrolled away is worse than no list). Both the visibility
     *  walk and the half-showing rule are OptionSelect's (FT-1167). */
    trackMenuList() {
      if (!this.menuListOpen) return;
      const trigger = this.menuSumEl();
      if (!trigger) return;
      if (this.popupTriggerHidden(trigger)) {
        this.menuListOpen = null;
        return;
      }
      this.placeMenuList();
    },
    // ── FT-1262: THE TOWN'S TWO LOCKS, changeable mid-game ───────────────
    /** Open/close the head's passwords overlay. Opening re-reads the two
     *  locks from the server rather than trusting anything cached: the wire
     *  speaks booleans, and they are the only truth about what is set. */
    togglePassMenu() {
      this.passOpen = !this.passOpen;
      if (!this.passOpen) return;
      this.passNote = { enter: null, open: null };
      this.passDraft = { enter: "", open: "" };
      this.refreshPassState();
    },
    /** Ask the server which locks this town wears. Best-effort, like every
     *  towns read: a failed ask leaves the rows saying "checking…" rather
     *  than claiming a state nobody confirmed. */
    async refreshPassState() {
      const id = this.session.sessionId;
      if (!id) return;
      const meta = await townMeta([id]);
      const town = meta && meta[id];
      if (!town) return;
      this.passState = {
        enter: !!town.requiresEnterPassword,
        open: !!town.openPasswordSet,
      };
    },
    /** Set one lock from its input. `which` is "enter" (the room key
     *  players give) or "open" (the host seat's own); the PUT carries ONLY
     *  that lock's field, so the other is left exactly as it stands. */
    async savePass(which) {
      if (this.passBusy) return;
      const value = (this.passDraft[which] || "").trim();
      if (!value) return;
      this.passBusy = which;
      this.$set(this.passNote, which, null);
      const field = which === "enter" ? "setEnterPassword" : "setOpenPassword";
      const r = await setTownPasswords(this.session.sessionId, {
        [field]: value,
      });
      this.applyPassResult(which, r, "Set.");
    },
    /** Clear one lock — the explicit `null` FT-1241's route reads as
     *  "remove it" (an ABSENT field means "leave it alone", so null is the
     *  only way to say this). */
    async clearPass(which) {
      if (this.passBusy) return;
      this.passBusy = which;
      this.$set(this.passNote, which, null);
      const field = which === "enter" ? "setEnterPassword" : "setOpenPassword";
      const r = await setTownPasswords(this.session.sessionId, {
        [field]: null,
      });
      this.applyPassResult(which, r, "Cleared.");
    },
    /** One landing for both writes: the new state is read back off the
     *  RESPONSE's booleans (never off what was typed), the input is emptied
     *  so no password sits on screen, and a refusal shows the server's own
     *  words. */
    applyPassResult(which, r, okText) {
      this.passBusy = null;
      if (!r.ok) {
        this.$set(this.passNote, which, { kind: "err", text: r.error });
        return;
      }
      this.passState = {
        enter: !!r.town.requiresEnterPassword,
        open: !!r.town.openPasswordSet,
      };
      this.$set(this.passDraft, which, "");
      this.$set(this.passNote, which, { kind: "ok", text: okText });
    },
    /** The overlay's own hoist/place/track — the same three moves the menu
     *  lists make (FT-1265), through the shared `placePopupAt`. */
    hoistPassMenu() {
      const el = this.$refs.passMenu;
      if (!el) return;
      if (el.parentElement !== document.body) document.body.appendChild(el);
      this.placePassMenu();
      requestAnimationFrame(this.placePassMenu);
    },
    placePassMenu() {
      this.placePopupAt(this.$refs.passBtn, this.$refs.passMenu);
    },
    trackPassMenu() {
      if (!this.passOpen) return;
      const trigger = this.$refs.passBtn;
      if (!trigger) return;
      if (this.popupTriggerHidden(trigger)) {
        this.passOpen = false;
        return;
      }
      this.placePassMenu();
    },
    /** Click-out closes — unless the click landed inside the overlay or on
     *  the button itself (whose own click is the toggle; closing here first
     *  would make it reopen). `.ht-menu-sum`'s counterpart, FT-1264. */
    onPassDocDown(e) {
      const t = e.target;
      if (t && t.closest && t.closest(".ht-pass-menu, .ht-pass-btn")) return;
      this.passOpen = false;
    },
    onPassKey(e) {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      this.passOpen = false;
    },
    /** FT-1262: has the trigger been scrolled more than half out of view?
     *  The clipping walk + half-showing rule lifted out of `trackMenuList`
     *  verbatim (originally OptionSelect's, FT-1167) so both hoisted popups
     *  close by the same rule. A popup left pointing at a row that has
     *  scrolled away is worse than no popup. */
    popupTriggerHidden(trigger) {
      const r = trigger.getBoundingClientRect();
      let top = 0;
      let left = 0;
      let right = window.innerWidth;
      let bottom = window.innerHeight;
      let el = trigger.parentElement;
      while (el && el !== document.documentElement) {
        const cs = getComputedStyle(el);
        if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
          const b = el.getBoundingClientRect();
          top = Math.max(top, b.top);
          left = Math.max(left, b.left);
          right = Math.min(right, b.right);
          bottom = Math.min(bottom, b.bottom);
        }
        el = el.parentElement;
      }
      const showingH = Math.min(r.bottom, bottom) - Math.max(r.top, top);
      const showingW = Math.min(r.right, right) - Math.max(r.left, left);
      return (
        !r.width ||
        !r.height ||
        showingH < r.height / 2 ||
        showingW < r.width / 2
      );
    },
    /** FT-1264: the one control's face — the menu in a couple of words.
     *  Master off is "Off"; otherwise how many of the vocabulary's buttons
     *  show ("All 7" when every one, "5 of 7" when fewer — "0 of 7" is the
     *  legal all-hidden state whose menu never opens, and saying it here is
     *  what makes that state findable). Deliberately COMPACT faces (not
     *  "7 buttons"): the disc's two-column dress prices every control's
     *  width straight out of the label tracks beside it, and the word
     *  "buttons" cost ~35px per column against a fact "All 7" carries
     *  whole (measured — the wide face pushed the tab into the scroll
     *  dress at every size). */
    menuSummary(t) {
      if (this.prefs[t.key] === false) return "Off";
      const slots = this.prefs[t.layoutKey] || [];
      const on = slots.filter((e) => e.on !== false).length;
      return on === slots.length ? "All " + on : on + " of " + slots.length;
    },
    /** FT-1264: click-out closes the open list — unless the click lands in
     *  the list itself or on a menu trigger (the trigger's own click is the
     *  toggle; closing here first would make it reopen). */
    onMenuDocDown(e) {
      const t = e.target;
      if (t && t.closest && t.closest(".ht-menu-list, .ht-menu-sum")) return;
      this.menuListOpen = null;
    },
    /** FT-1264: Esc closes the list — but an OptionSelect inside it (the
     *  master row's, a slot row's) handles its own Esc first and marks the
     *  event consumed; one Esc, one layer. */
    onMenuKey(e) {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      this.menuListOpen = null;
    },
    /** The rows of one menu's list: the layout pref's order, dressed with
     *  the vocabulary's own art and settings names. The pref is sanitized
     *  on every read/write (golem/prefs), so every slot is here — the
     *  filter is only armour against a half-written snapshot. */
    menuSlots(t) {
      const byId = this.seatSlotIndex;
      return (this.prefs[t.layoutKey] || [])
        .filter((e) => byId[e.id])
        .map((e) => ({ ...byId[e.id], on: e.on !== false }));
    },
    /** One row's toggle — the whole layout is rewritten (order untouched),
     *  because the pref is one value: a list, not seven booleans. */
    setMenuOn(t, id, on) {
      const layout = (this.prefs[t.layoutKey] || []).map((e) =>
        e.id === id ? { id: e.id, on: !!on } : { ...e },
      );
      setPref(t.layoutKey, layout);
    },
    /** The drag dress: the grabbed row dims, the drop slot draws a seam
     *  above the row it would land before (or below the last). */
    menuItemClass(t, i) {
      const d = this.menuDrag;
      if (!d || d.key !== t.key) return {};
      const n = (this.prefs[t.layoutKey] || []).length;
      return {
        dragging: d.from === i,
        "drop-before": this.menuDropAt === i,
        "drop-after": this.menuDropAt === n && i === n - 1,
      };
    },
    /** HTML5 drag, armed only from the grip — a grab anywhere else on the
     *  row (its switch, its name) is refused here rather than trusted not
     *  to happen. stopPropagation because the app has document-level
     *  dragstart listeners (the seat menus dismiss on any drag). */
    onMenuDragStart(t, i, e) {
      if (this.menuDragArm !== t.key + ":" + i) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      this.menuDrag = { key: t.key, from: i };
      this.menuDropAt = null;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", "ht-menu:" + t.key + ":" + i);
        } catch (err) {
          // IE's dataTransfer refuses custom payloads; the drag still works
        }
        // the whole row is the drag image, so the LINE lifts, not the grip
        const row =
          e.target && e.target.closest && e.target.closest(".ht-menu-item");
        if (row && e.dataTransfer.setDragImage) {
          e.dataTransfer.setDragImage(row, 12, row.offsetHeight / 2);
        }
      }
    },
    /** Which slot the drop would land in — above or below the hovered
     *  row's midline, exactly the seam the dress draws. */
    onMenuDragOver(t, i, e) {
      const d = this.menuDrag;
      if (!d || d.key !== t.key) return;
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      const r = e.currentTarget.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      this.menuDropAt = before ? i : i + 1;
    },
    /** Commit: the list's new order IS the menu's new order (the ring reads
     *  it left-to-right, the plate top-to-bottom — golem/prefs' note). */
    onMenuDrop(t) {
      const d = this.menuDrag;
      const to = this.menuDropAt;
      this.onMenuDragEnd();
      if (!d || d.key !== t.key || to === null) return;
      const layout = (this.prefs[t.layoutKey] || []).map((e) => ({ ...e }));
      const moved = layout.splice(d.from, 1)[0];
      if (!moved) return;
      layout.splice(to > d.from ? to - 1 : to, 0, moved);
      setPref(t.layoutKey, layout);
    },
    onMenuDragEnd() {
      this.menuDrag = null;
      this.menuDropAt = null;
      this.menuDragArm = null;
    },
    pickGrimoireSize(id) {
      setPref("grimoireSize", id);
    },
    /** FT-1209 (user): "these options need be right above the gear." The
     *  strip and the gear live in different coordinate systems — the gear
     *  hangs off the town name's h3 (content-sized and centred on the disc,
     *  full-width on the rectangle and both sheets), the strip is the band's
     *  first row — so CSS alone cannot state "the strip's right edge is the
     *  gear's". This measures the live gap between the two right edges and
     *  spends it as the strip's own padding-right, so the rightmost tab
     *  (Control settings) stands directly over the gear in every layout.
     *
     *  CLAMPED both ways: never negative (a gear right of the strip's edge —
     *  the rectangle, where it overhangs the padding — just means no inset),
     *  and never past what the tabs' own content width leaves (a short town
     *  name on the disc puts the gear near centre; the tabs stop at the
     *  strip's left edge rather than overflowing it). Re-measured on resize
     *  (which also covers the disc gate flipping), on rename (the h3's width
     *  IS the gear's position), and once the display fonts land (tab widths
     *  are type).
     *
     *  THE TARGET IS CENTRE-OVER-CENTRE — the last tab's midpoint on the
     *  gear's, not edge-on-edge: the tab is several times the gear's width,
     *  and an edge-aligned leaf reads as standing NEXT TO the gear's spot
     *  rather than over it.
     *
     *  ── FT-1266: STOOD DOWN. NOTHING READS `tabInset` ANY MORE. ──────────
     *  The gear this aligns to left the build face at FT-1213 (it renders on
     *  re-entry only, where the strip does not render at all), so the `!cog`
     *  guard below has bailed on every call since — `tabInset` has been a
     *  measured 0 at every layout, and the strip was simply parked at its own
     *  right edge by `justify-content: flex-end`, off the disc's axis. The
     *  strip centres on the panel's axis now (see the template's own FT-1266
     *  note and the `.ht-tabs` rule), which needs no measurement at all.
     *
     *  KEPT, NOT DELETED, and still wired to its resize/rename/fonts
     *  triggers: this is the only code in the fork that knows how to stand a
     *  tab strip over a head ornament, and the head has grown ornaments twice
     *  (FT-1225's copy-link plate, FT-1262's key). It writes `tabInset` into
     *  data as before; the template no longer binds it, so the write is inert
     *  until something asks for it again. */
    alignTabs() {
      const strip = this.$refs.tabs;
      const cog = this.$refs.cog;
      if (!strip || !cog) return;
      const s = strip.getBoundingClientRect();
      const g = cog.getBoundingClientRect();
      if (!s.width || !g.width) return;
      // the tabs' own natural width — content-sized leaves plus the 4px gaps
      let group = 0;
      let lastW = 0;
      const btns = strip.querySelectorAll(".ht-tab");
      btns.forEach((b) => {
        group += b.offsetWidth;
        lastW = b.offsetWidth;
      });
      group += 4 * Math.max(0, btns.length - 1);
      const maxInset = Math.max(0, s.width - group);
      const want = s.right - (g.left + g.width / 2) - lastW / 2;
      this.tabInset = Math.max(0, Math.min(Math.round(want), maxInset));
    },
    /** The watcher half of alignTabs — measure after the DOM settles. */
    queueAlignTabs() {
      this.$nextTick(this.alignTabs);
    },
    /**
     * FT-1231: does the Control tab overflow its box? scrollHeight against
     * clientHeight on the one scroll container, +1 for the sub-pixel
     * rounding browsers report on scaled boxes — NightSheet's
     * measureRowsOverflow, with one addition that component never needed:
     * the question is asked IN THE FITTED DRESS. `scrolls` changes the very
     * layout being measured (the drip's 30px lane comes back, the toggle
     * rows give up their two columns — see the disc styles), so measuring
     * the scrolled state answers "does the scrolled dress overflow?", which
     * is yes forever — a ratchet the first cut of this rig actually caught
     * (lane → narrower cells → taller wrap → still overflowing). The class
     * comes off for the read and straight back on, so the answer is always
     * "do the rows overflow the box in the two-column dress?" — one truth,
     * whichever state asks it. Guarded write so the updated() hook that
     * calls this cannot loop. Only the disc constrains the box's height
     * (the rectangle and both phone sheets scroll the whole panel), so
     * `scrolls` can only ever land there.
     */
    measurePrefsOverflow() {
      this.prefsOverflow = this.measureTabOverflow(this.$refs.prefsRows);
      // FT-1266: …and the Game settings tab, on the same trigger. One hook
      // asking both boxes rather than a second listener set: exactly one of
      // the two is ever mounted, the absent one answers false, and the
      // triggers that can change either height (resize, the disc gate
      // flipping, the tab switch, the fonts landing) are the same triggers.
      this.gameOverflow = this.measureTabOverflow(this.$refs.gameRows);
    },
    /**
     * FT-1266: the measurement itself, lifted out of measurePrefsOverflow
     * unchanged so both setup tabs can ask it. The write stays guarded — a
     * reactive setter handed the value it already holds notifies nothing, so
     * the updated() hook that calls this still cannot loop.
     */
    measureTabOverflow(el) {
      if (!el) return false;
      const had = el.classList.contains("scrolls");
      if (had) el.classList.remove("scrolls");
      const over = el.scrollHeight > el.clientHeight + 1;
      if (had) el.classList.add("scrolls");
      return over;
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
      // FT-1236: a dev fixture touched this game — whatever happens after,
      // the record it posts is a TEST game. Stamped now, at the gesture,
      // not inferred from seat names at record time.
      markDevGame(this.session.sessionId);
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
      // FT-1135 (user): the button is a SETUP tool and is now disabled once a
      // game is running, so this is the same refusal stated twice — the guard
      // is here as well because a disabled button is a courtesy and a method
      // that anything can call is not.
      if (this.gameUnderway) return;
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
        // FT-1236: the shift-Start bypass is itself a dev fixture — even
        // with every chair humanly claimed, a game started this way records
        // as a TEST game. (devFillSeats stamps too; idempotent.)
        markDevGame(this.session.sessionId);
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
        this.beginAtNight();
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
      this.beginAtNight();
    },
    /**
     * FT-1314 (user ruling — flow, not a checkbox): "START GAME" GOES
     * STRAIGHT INTO NIGHT 1. The deal and the first night are one act — the
     * real game opens with the storyteller running Night 1, and the old
     * dealt-but-daytime beat between them was a state nobody wanted to stand
     * in. Day 1 follows Night 1, exactly as End night has always delivered
     * it. The ordinary toggleNight commit is the whole move: it increments
     * the day counter to 1, broadcasts the phase, writes "Night 1 falls."
     * into the town log, and the full resync the deal schedules a tick later
     * carries isNight + nightDay to every client on top of the live frame.
     * Guarded for the (unreachable from this button) already-night case so a
     * double call could never flip the town back to day.
     */
    beginAtNight() {
      if (!this.grimoire.isNight) {
        this.$store.commit("toggleNight", true);
      }
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

  // ── FT-1168: THE TWO TABS (FT-1209: three — Control settings joined) ────────────────────────────────────────────────
  // The panel's OWN segment shape, not a new one: `control-plate` around the
  // pair and `control-cell` inside it is exactly what the night row's
  // Off/Storyteller/Everyone switch was built from (NightModeRow's `.nm-seg` /
  // `.nm-opt`, and controls.scss's own note on why the plate belongs to the
  // GROUP — "three plated buttons sitting 0px apart read as three buttons").
  // Two tabs are one control with two positions and read that way here.
  //
  // FULL WIDTH, unlike that switch, and that is the one difference: a segment
  // inside a row is one setting among several and hugs its content; this is
  // the panel's own divider and the two halves want equal weight. `flex: 1`
  // on the cells is what does it.
  //
  // ── FT-1175: THE STRIP BECOMES A FOLDER ─────────────────────────────────
  //
  // User: "can we make the script setup and game settings tabs look like they
  // encapsulate their settings a bit some how?" They read as two buttons
  // floating above a set of unrelated rows; nothing said the rows belonged to
  // the lit one.
  //
  // THE CLASSIC MOVE, AND IT IS THE RIGHT ONE HERE: a rule runs the full
  // width under the strip, and the ACTIVE tab breaks it — its own bottom edge
  // sits ON that rule, in nothing, so the tab and the rows below are one
  // continuous shape while the other tab stays a closed box behind it.
  //
  // WHY A BROKEN LINE AND NOT A DRAWN BOX. The panel lives inside the clock
  // face's disc, where the ground behind these rows is translucent glass over
  // the dial art. A filled pane with hard edges would paint a rectangle that
  // matches nothing behind it — the same argument RoleTray's own edge fade
  // makes for using a mask rather than a background wash. A hairline sits on
  // whatever ground it finds.
  //
  // NOTHING CHANGES WIDTH. Both tabs stay equal halves of the strip (the
  // rider's own check): the join is drawn with a border and a 2px negative
  // margin, so no tab needs a width of its own to claim the body below it.
  // (FT-1209 SUPERSEDES the equal halves — three leaves now, content-sized
  // and clustered at the strip's right end over the gear; see `.ht-tab`'s
  // own note. The join mechanism is unchanged.)
  //
  // THE PLATE COMES OFF THE GROUP AND GOES ONTO THE CELLS, and that is what
  // the shape costs. `control-plate` around the pair drew one box with both
  // tabs inside it — which is the segment idiom, and a segment is exactly the
  // thing the user is saying this should stop looking like. Each tab is its
  // own leaf now: top corners rounded, no bottom edge of its own.
  .ht-tabs {
    display: flex;
    align-items: flex-end;
    // FT-1209 (user): the tabs cluster at the strip's RIGHT end, over the
    // gear — the strip keeps its full width (the rule runs the whole row and
    // on under the gear's own x), and the measured `tabInset` padding (see
    // alignTabs) is what parks the last leaf directly above the gear.
    //
    // ── FT-1266 (user): "those tabs aren't centered in the disc — can we
    // center them?" `flex-end` -> `center`, and that is the whole fix.
    //
    // THE STRIP'S BOX IS ALREADY ON THE AXIS. Its bleed is symmetric at every
    // face (the `width: calc(100% + 44px)` / `margin: 0 -22px` pair here, the
    // two sheets' own 28px/24px restatements below, and the disc's plain
    // `width: 100%`), so the box centre lands exactly on `.host-tools`'s own
    // box centre — the same point FT-1098's three-column h3 pins the town's
    // NAME to. Measured at HEAD, `strip centre` against `panel axis`: 951/951
    // at 1920x1080, 711/711 at 1440x900, 631/631 at 1280x960, 640/640 at the
    // rectangle, 195/195 and 660.8/660.8 at the two sheets — 0.0px apart on
    // all six. Centring the CLUSTER inside that box therefore puts the leaves
    // on the disc's axis without measuring anything, and it is the same axis
    // the name is measured against rather than a second one that could drift.
    //
    // WHAT IT REPLACES (rig: claude_temp_test/2026-08-27-ft1266-shots.mjs) —
    // the cluster's centre against the panel's axis, before and after:
    //
    //                     before    after
    //   1920x1080          +15.3      0.0
    //   1440x900           -23.4      0.0
    //   1280x960           -10.5      0.0
    //   rect 1280x800       +7.3      0.0
    //   phone 390x844      +80.3      0.0
    //   phone 844x390      +27.6      0.0
    //
    // The strip's own painted rule (the 2px bottom edge) is untouched — it
    // still runs the full width of the box, as it has since FT-1175.
    justify-content: center;
    gap: 4px;
    // FT-1209: BELOW THE DISC the strip takes the panel's own side padding
    // too (the 25px flanks) — three word-bearing leaves are wider than the
    // rectangle's 370px of content, and every pixel is needed before the
    // first label clips. Same move .start-dock makes into the sheet's
    // padding, matched per layout below; the disc resets it (its band has
    // its own arithmetic).
    width: calc(100% + 44px);
    margin: 0 -22px 8px;
    // THE RULE THE ACTIVE TAB BREAKS. Plum, at the alpha the dropdowns'
    // popup edge already uses — quiet enough to read as a seam rather than
    // as a fifth control on a panel that has plenty.
    border-bottom: 2px solid rgba(120, 105, 135, 0.45);
  }
  // …and the sheets' own flanks are shallower (14px / 12px), so the bleed
  // matches each one rather than overrunning the screen edge. AFTER the base
  // rule on purpose: same specificity, later wins.
  @media (pointer: coarse) and (orientation: portrait) {
    .ht-tabs {
      width: calc(100% + 28px);
      margin: 0 -14px 8px;
    }
  }
  @media (pointer: coarse) and (orientation: landscape) and (max-height: 500px) {
    .ht-tabs {
      width: calc(100% + 24px);
      margin: 0 -12px 8px;
    }
  }
  .ht-tab {
    @include control-cell;
    // the cell mixin's seam belongs to a segment; these are separate leaves
    border-right: 0;
    // FT-1209: content-sized, not equal halves. FT-1175's "equal halves of
    // the strip" was the full-width strip's own arithmetic; a right-aligned
    // cluster sizes each leaf to its label (nowrap below keeps them whole),
    // and the padding is up from 6 to 8 so three short leaves still read as
    // targets rather than slivers. Not more than 8: on the disc the three
    // leaves plus the gear-centring inset (alignTabs) share ~480px, and
    // every pad pixel is an inset pixel the clamp takes away.
    flex: 0 1 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 4px 8px;
    font-size: 85%;
    white-space: nowrap;
    // the leaf: the plate's own ground and radius, top corners only, and no
    // bottom edge — the strip's rule is the bottom edge of every tab that
    // has not been chosen.
    background: rgba(0, 0, 0, 0.55);
    border: 2px solid rgba(120, 105, 135, 0.28);
    border-bottom: 0;
    border-radius: $control-radius $control-radius 0 0;
    color: rgba(255, 255, 255, 0.72);
    // FT-1175: PURPLE, NOT RED (user). This hover was `#ff8a8a`, the blood
    // ink — the last red left on the strip along with the focus ring below.
    // Red is the blood in this fork and purple is the book; the setup panel
    // is the storyteller's, so it takes the plum every other storyteller
    // control took (FT-1108's dropdowns, FT-1150's night rows).
    &:hover {
      color: #ece4f8;
      border-color: rgba(150, 130, 175, 0.55);
      background: rgba(150, 130, 175, 0.12);
    }
    // THE CHOSEN LEAF. Its ground and edge are FT-1108's own purple
    // restatement of `control-lit` — the same three values every chosen row
    // in every dropdown on this panel wears, so "this one is open" is the
    // same event in the same ink. It was `$control-on-bg`, the shared blood.
    &.on {
      background: rgba(96, 74, 128, 0.42);
      border-color: rgba(167, 143, 205, 0.85);
      color: #ece4f8;
      font-weight: bold;
      // …and this is the join: a transparent bottom edge, pulled down over
      // the strip's rule, so the line stops at this tab and the rows below
      // read as its contents.
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      &:hover {
        color: white;
        background: rgba(96, 74, 128, 0.42);
        border-color: rgba(167, 143, 205, 0.85);
        border-bottom-color: transparent;
      }
    }
    // FT-1175: and the LAST red on the strip. `control-cell`'s focus ring is
    // `$control-focus`, #a01414 — overridden here rather than in
    // controls.scss for the same reason OptionSelect overrides it in its own
    // file (FT-1108): that token is worn by every plated control in the app,
    // and this change is about the setup panel.
    &:focus-visible {
      outline-color: rgba(150, 130, 175, 0.9);
    }
    // a phone gets a real target, the same 40px the night switch's cells take
    @media (pointer: coarse) {
      min-height: 40px;
    }
  }
  .ht-tab-mark {
    width: 13px;
    height: 13px;
    opacity: 0.8;
    // FT-1209: HIDDEN below the disc — with three tabs the marks are the
    // 57px that push the labels past the rectangle's width, and the words
    // are the tabs' identity where the marks are trim. The disc, with a
    // whole band to spend, puts them back (see the gate below).
    display: none;
    // Font Awesome's own two-class width rule outranks a single class — the
    // same fight `.row-mark-fa` documents further down this file.
    &.svg-inline--fa {
      width: 13px;
      height: 13px;
    }
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
  // two flanking columns are pinned to the SAME width, so the middle column
  // is the only one free to size to its content — centring it centres the
  // town's name itself, not a lopsided box built around it.
  //
  // FT-1225: THE FLANKS ARE `1fr`, NOT THE FIXED `1.15em` FT-1098 SHIPPED.
  // The copy-link grew from a bare 15px glyph into a labeled plate
  // (`.ht-head-acts`, ~5x the icon's width), so no fixed em can hold both
  // flanks any more. Equal `1fr` tracks keep FT-1098's invariant — same-width
  // flanks, name on the axis — at ANY ornament width, provided the h3's own
  // width is definite: it is block-level (full width) on the rectangle and
  // both sheets already, and the disc gate now gives it `width: 100%` (see
  // the disc rules) instead of letting the head's flex centring shrink-wrap
  // it. The icon hugs the name's left (`justify-self: end`) and the cluster
  // hugs its right (`justify-self: start`) — which is also what FT-1095
  // asked for verbatim ("a mark immediately left of it"): the old rectangle
  // layout parked the icon at the panel's far-left edge only because the
  // fixed flank sat at the track's extreme.
  h3 {
    margin: 0;
    display: grid;
    // FT-1262: `minmax(0, 1fr)`, NOT the bare `1fr` FT-1225 shipped — this is
    // what makes the line above ("at ANY ornament width") literally true.
    //
    // A bare `1fr` track is `minmax(auto, 1fr)`, and that `auto` MINIMUM is
    // min-content: a flank whose content is wider than its fair share stops
    // being a fair share and takes what it needs, out of the other flank.
    // FT-1225's two-ornament cluster fitted, so the promise held by luck;
    // FT-1262's third (the key button) did not, and the name went off the
    // disc's axis by a measured 65.5px — the exact half-difference between
    // the forced right track and the collapsed left one:
    //
    //                    tracks (disc)              name off panel axis
    //   before FT-1262   127.0 / 79.3 / 127.0                  0.0px
    //   key btn + `1fr`   61.2 / 79.3 / 192.3                -65.5px
    //   key btn + minmax 127.0 / 79.3 / 127.0                  0.0px
    //
    //   (rig: claude_temp_test/2026-08-27-ft1262-axis.mjs, which isolates the
    //    button's own contribution by re-measuring with it display:none — the
    //    HEAD head — rather than trusting a remembered number.)
    //
    // `minmax(0, …)` floors the minimum at zero, so both flanks are exactly
    // one fr whatever they hold, and a cluster too wide for its track simply
    // OVERFLOWS it (visible, into the panel's own generous margin: the h3 is
    // 349px inside a 1009px panel on the disc) instead of shoving the name.
    // Centring the name is the invariant; the ornament's own right edge is
    // not, and when the two disagree the name wins — that is the whole point
    // of FT-1098's three-column structure.
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    justify-items: center;
    column-gap: 8px;
    cursor: default;
    // FT-1202: the row was the absolute gear's containing block; FT-1225
    // moved the gear in flow (`.ht-head-acts`), so nothing positions off
    // this any more — kept as a harmless anchor for the next head ornament.
    position: relative;

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
    // FT-1225: hug the name (the `1fr` flank is wide; centred in it the mark
    // would drift toward the panel's edge — see the h3 note).
    justify-self: end;
  }

  // FT-1225: the head's ornament cluster — the Copy link button always, the
  // settings gear on the re-entry face. One in-flow grid cell (see the h3
  // note), hugging the name's right; the 10px gap is the margin the gear
  // wore when it hung absolute off the row (FT-1202).
  .ht-head-acts {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }

  // FT-959: COPY THE TOWN LINK, next to its name. FT-1225 (user): it wears
  // the DEAL BUTTON'S FORM now — the panel's shared plate + a `.ra-name`
  // label — superseding FT-959's bare-glyph dress (which matched the session
  // pill's `.copylink`; the user pointed at this glyph and at Deal and asked
  // for Deal's form). The recipe is the Seats-row shuffle's restatement of
  // RoleActions' `.ra-act`, verbatim: `control-icon-btn` for plate, size,
  // ink, hover, focus ring and the coarse-pointer 42x40 bump (which retires
  // the invisible-fingertip-pad hack the bare glyph needed), then the
  // labelled-button width rule and the label's dress — restated here because
  // a scoped style cannot cross components, same as `.tool-btn` says below.
  // Buttons don't inherit type, so inside the PiratesBay h3 this still
  // renders in the same face and size as Deal's own label.
  .ht-copy-link {
    @include control-icon-btn;
    &:has(.ra-name) {
      width: auto;
      min-width: 34px;
      padding: 0 9px;
      gap: 6px;
      @media (pointer: coarse) {
        min-width: 42px;
      }
    }
    .ra-name {
      font-size: 80%;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
  }

  // FT-1262: the PASSWORDS button — its sibling's plate exactly (it shares
  // `.ht-copy-link`), plus the open-glow every dropdown trigger in this panel
  // wears while its popup stands (`.ht-menu-sum.open`, the gear's `.on`, the
  // strip marks' lit — one register, FT-1202). Nothing else is overridden:
  // being visibly the same control as Copy link is the point.
  .ht-pass-btn.open {
    border-color: rgba(202, 166, 98, 0.75);
    box-shadow: 0 0 6px rgba(202, 166, 98, 0.45);
  }

  // ── FT-1202: THE SETTINGS GEAR, inline with the town's name ─────────────
  // Out of the grid on purpose (see the template note): absolute at the
  // row's right end, so FT-1098's measured three-column axis is untouched.
  // `em`-sized like the town icon for the same reason it is (the head is
  // 2.25x taller on the disc than on a phone) — 0.9em keeps it below the
  // 1.15em town mark: the name's own mark outranks a control hanging off it.
  //
  // BRIGHTNESS 0.835 IS THE MEASURED TRIM, not taste: the cog's baked art
  // means (alpha-weighted) 175.0 against its bone siblings' 146.1/145.1/147.2
  // — see the template note and the rig it names. 0.835 lands it on 146.1.
  // Hover multiplies the strip marks' own 1.3 on top of the trim (1.086),
  // so a hovered gear lifts exactly as much as a hovered strip mark did.
  .ht-cog {
    // FT-1225: IN FLOW NOW — a flex child of `.ht-head-acts`, beside the
    // Copy link button, so the absolute-at-`left: 100%` placement (FT-1202,
    // written to spare FT-1098's fixed flanks a fourth cell) stands down:
    // position: absolute; left: 100%; top: 50%;
    // transform: translateY(-50%); margin-left: 10px;
    // The cluster's own gap carries the 10px; `0.9em` still reads the h3's
    // font (the span inherits it), so the gear's size is untouched.
    width: 0.9em;
    height: 0.9em;
    cursor: pointer;
    filter: drop-shadow(0 1px 2px black) brightness(0.835);

    &:hover {
      filter: drop-shadow(0 1px 2px black) brightness(1.086);
    }

    // OPEN: the strip-wide `lit` glow (Menu.vue, FT-1202 — the register the
    // user kept, taken down half a step), composed over the trim: 0.835 x
    // 1.06 = 0.885 resting-lit, 0.835 x 1.18 = 0.985 hovered-lit.
    &.on {
      filter: drop-shadow(0 1px 2px black)
        drop-shadow(0 0 5px rgba(202, 166, 98, 0.8)) brightness(0.885);
    }
    &.on:hover {
      filter: drop-shadow(0 1px 2px black)
        drop-shadow(0 0 7px rgba(226, 201, 138, 0.85)) brightness(0.985);
    }

    // the same invisible fingertip pad the copy-link wears, same reason
    @media (pointer: coarse) {
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
    // ── FT-1175 (user): "we can now give the script setup a lot of room to
    // breathe. its to compact now. put some spacing between the rows." ──────
    //
    // 34 -> 40px of floor and 8px BETWEEN rows. These rows were squeezed when
    // this panel carried everything down one column — ten of them plus a
    // character tray — and FT-1168's tab split handed half of them to the
    // other tab without either half taking the room back.
    //
    // A MARGIN, NOT A `gap` ON THE PARENT. `.ht-body` is `display: contents`
    // on three of this panel's four layouts, so it generates no box and has
    // no gap to set; the rows are the parent's children there. The margin
    // travels with the row instead, which is the one thing that is true in
    // all four.
    min-height: 40px;
    margin-bottom: 8px;
    &:last-of-type {
      margin-bottom: 0;
    }

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
    // ── FT-1175 (user): "lets remove the black background of that element,
    // the input one already has a background and the role counts don't need
    // it." ──────────────────────────────────────────────────────────────────
    //
    // THE PLATE'S REASON EXPIRED AN HOUR BEFORE THIS PASS. It was drawn when
    // the seat number was a bare digit with no box of its own — the plate was
    // the only thing making the control look like a control. FT-1170 gave the
    // scrub its own border and ground at rest, so this became a box around a
    // box, and it had also swept up the composition counts, which are a
    // readout and never wanted one.
    //
    // DECORATION OFF, LAYOUT KEPT. `control-plate` is exactly three things —
    // ground, edge, radius — and all three go. The flex, the 10px gap and the
    // `3px 10px` padding stay: they are what puts the counts beside the
    // number and off its edge, and removing a background must not move
    // anything. The one measurable consequence is the 2px edge no longer
    // being drawn, which under `border-box` gives the box back 4px of width
    // it was spending on itself.
    .ht-seat-readout {
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
      // FT-1337: the chair variant is a masked span on var(--chair) — the
      // mask on a ::before so the drop-shadow above traces the masked shape,
      // painted with the bone the baked svg carried.
      &.chair-mark::before {
        content: "";
        display: block;
        width: 100%;
        height: 100%;
        background-color: #cfc4ae;
        -webkit-mask-image: var(--chair, url("../assets/ui-seat-front.svg"));
        mask-image: var(--chair, url("../assets/ui-seat-front.svg"));
        -webkit-mask-size: contain;
        mask-size: contain;
        -webkit-mask-position: center;
        mask-position: center;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
      }
    }
    // FT-1168: THE SETTING'S NAME, beside its mark, when the corner cog's
    // "Icons only" is off. It takes the label's own quiet ink (the `.label`
    // rule above already dims the pair to 0.7) and adds only the gap and a
    // no-wrap, because a two-word name breaking over two lines would grow the
    // row's height rather than the panel's width — which is the one thing a
    // shrink-to-fit panel cannot show you is happening.
    .row-name {
      margin-left: 6px;
      white-space: nowrap;
      font-size: 90%;
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
        // FT-1196: the shuffle's baked mark, at RoleActions' own img size so
        // the two shuffles' plates match glyph-for-glyph.
        .tool-glyph {
          width: 16px;
          height: 16px;
          object-fit: contain;
        }
        // FT-1196: A LABELLED BUTTON IS NO LONGER A SQUARE — RoleActions'
        // own rule (see its FT-1175 note), restated here because a scoped
        // style cannot cross components: the mixin's fixed width becomes a
        // minimum, the box sizes to its word, and the word's `v-if`
        // (icons-only) is the single source of truth via `:has()`.
        &:has(.ra-name) {
          width: auto;
          min-width: 34px;
          padding: 0 9px;
          gap: 6px;
          @media (pointer: coarse) {
            min-width: 42px;
          }
        }
        // The word beside the mark — `.ra-name`'s dress from RoleActions,
        // restated for the same scoped-style reason.
        .ra-name {
          font-size: 80%;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }
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
  // FT-1175: `row-gap: 0` was the merge's other half — two halves sharing a
  // line must not pay a vertical gap. They are two lines on purpose now (see
  // `.ht-cast-half`), and the settings tab is four lines on purpose (see the
  // template), so both rows take the 8px the panel gives every other pair.
  .ht-cast,
  .ht-settings {
    flex-wrap: wrap;
    row-gap: 8px;
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
  //
  // ── FT-1175: EACH HALF TAKES ITS OWN LINE ───────────────────────────────
  //
  // `flex: 0 1 auto` let the two halves share a line wherever they both fit,
  // which is what FT-1090 merged them for — it was buying HEIGHT for the
  // character tray back when this panel carried the settings, the night
  // switch and the tray in one column.
  //
  // TWO THINGS EXPIRED THAT. FT-1168 moved half the panel onto a second tab,
  // and this pass puts a WORD on each of the four role buttons — so the role
  // half is now wider than the seat half was ever measured against, and at
  // every width tested it broke into three lines: seats, then the mark and
  // its count, then the four buttons stranded underneath. A row that wraps
  // three ways is not a row.
  //
  // `flex: 1 1 100%` is `.ht-set-line`'s own rule, one level over — the same
  // mechanism, so the cast lines and the settings lines hold to one rhythm
  // rather than drifting into two. The halves keep their classes, their
  // contents and their internal shape; only what they do at the row's edge
  // changed. And the row-gap the merge zeroed comes back, because two lines
  // that are deliberately two lines want the same 8px every other pair of
  // rows on this panel now has.
  .ht-cast-half {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    row-gap: 0;
    flex: 1 1 100%;
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
    // FT-1213: a control toggle whose gesture this DEVICE cannot perform
    // ("Hover coins" under a coarse pointer). The row's words dim the way
    // every unavailable control on this panel dims; the switch itself stays
    // full-strength because it still WORKS — the value follows the account
    // to a machine with a pointer (the row's title says exactly this).
    .ht-ctrl-inert .label {
      opacity: 0.55;
    }

    // ── FT-1260: the menu rows' expander ─────────────────────────────────
    // The chevron is the tab's own dropdown caret (OptionSelect's), worn as
    // a bare button beside the master switch; it flips when its list is
    // open, the caret's one grammar everywhere on this panel.
    // FT-1264: STOOD DOWN — the bare chevron and the master On/Off merged
    // into one selector-styled control (`.ht-menu-sum` below); nothing
    // renders this class any more. Kept as the record, the house rule.
    .ht-menu-exp {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 2px 4px;
      font-size: 80%;
      opacity: 0.7;
      flex-shrink: 0;
      svg {
        transition: transform 150ms ease;
      }
      &:hover {
        opacity: 1;
      }
      &.open svg {
        transform: rotate(180deg);
      }
    }
    // ── FT-1264: the menu rows' ONE control ──────────────────────────────
    // A selector-styled trigger (OptionSelect's own plate, padding, caret —
    // restated here because that component's dress is scoped) whose face is
    // the menu's summary; clicking it opens the customization list below.
    // The hidden sizer holds the trigger at its widest face ("N buttons")
    // so the summary changing under a toggle cannot shift the layout.
    .ht-menu-sum {
      @include control-plate;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 7px;
      font-family: inherit;
      font-size: 90%;
      color: white;
      text-align: left;
      cursor: pointer;
      .ht-menu-sum-wrap {
        display: grid;
        min-width: 0;
        > * {
          grid-area: 1 / 1;
        }
      }
      .ht-menu-sum-label {
        white-space: nowrap;
      }
      .ht-menu-sum-sizer {
        visibility: hidden;
        white-space: nowrap;
        pointer-events: none;
      }
      .caret {
        opacity: 0.7;
        font-size: 62%;
        flex-shrink: 0;
        transition: transform 150ms;
      }
      &:hover {
        @include control-plate-hover;
      }
      &:focus-visible {
        @include control-focus-ring;
        // the dropdowns' own plum ring (OptionSelect's FT-1108 call), not
        // the shared blood red — this control reads as one of them
        outline-color: rgba(150, 130, 175, 0.9);
      }
      &.open .caret {
        transform: rotate(180deg);
      }
      @media (pointer: coarse) {
        min-height: 40px;
      }
    }
    // FT-1265: THE LIST'S DRESS MOVED OUT of this nested block — the list is
    // a body-hoisted overlay now (the template note has the why), and a
    // nested rule's ancestor combinators stop matching the moment the
    // element leaves the panel's tree. The whole `.ht-menu-list` subtree
    // lives as FLAT scoped rules at the bottom of this style block, the same
    // move OptionSelect's `.gsel-menu` made for the same reason (FT-1167).
  }

  // ── FT-1227 → FT-1231: THE CONTROL TOGGLES IN TWO COLUMNS ───────────────
  // Nine personal rows (the FT-1227 split made seven toggles) and a
  // one-per-line list had grown taller than the disc's band wants to be.
  // THE TOGGLE ROWS ALONE take the two columns (`.ht-ctrl-row`): they are
  // the long run AND the uniform one — mark + name + On/Off. Setup panel
  // and Grimoire size keep their full lines, because their selects carry
  // WORDS ("Names and icons", "Small") and a half-cell cannot hold them —
  // measured: the first cut put all nine rows in columns and the Setup row
  // overwrote its neighbour.
  //
  // FT-1231 SUPERSEDES THE 1700px GATE. FT-1227 measured its floor against
  // one-line names ("Nameplate click", ~209px of cell) and gated on viewport
  // width; FT-1230 then renamed the rows LONGER in the user's own words
  // ("Click role name to change role"), which broke every one of those
  // numbers — one column overflowed the disc, and two one-line columns fit
  // nowhere at all. The rows' NAMES WRAP now (the license the full-line rows
  // never get), so a cell's floor is its longest half-line plus its switch,
  // not its longest sentence. There is NO viewport gate any more: the rule
  // lives inside the disc gate (see `.ht-body`'s FT-1231 block) and whether
  // the two columns actually SHOW is the same measured question as whether
  // the tab scrolls — one measurement, one class, because the fit depends
  // on band height against TYPE SIZE, and the app's type steps on viewport
  // WIDTH while the disc is usually sized by viewport HEIGHT. Measured on
  // the live build (rig: claude_temp_test/2026-08-27-ft1231-proof.mjs):
  //   1000x900 / 1280x960     19.4px type  cells 196  two columns, fits
  //   1706x960 / 1920x1080    ~23px type   cells 209-234  two columns, fits
  //   1440x900 / 1600x900 /   23px type on the SAME fpx=1 disc as 1000x900
  //     1642x780              — two-column content 283px against a 255px
  //                             box: the tab wears the scroll dress instead
  // The rectangle and both phone sheets keep the single column they have
  // always had: those faces scroll the whole panel, so height is the cheap
  // axis there.
  //
  // AND THE TAB IS ITS OWN SCROLLER WHERE IT MUST BE (the user's other
  // half: "make it scroll like the roles"). On the disc the band cannot
  // grow, so if the rows ever outrun it — icons-off at the floor disc, a
  // future eighth toggle — the box scrolls under the fork's own drip bar
  // (`v-blood-scroll`, the character tray's and the night checklist's
  // scrollbar) and wears the sunken well below, the app's measured-overflow
  // vocabulary (NightSheet `.ns-rows.scrolls`, FT-1229). The class lands
  // only when the rows genuinely overflow (measurePrefsOverflow) — a tab
  // that fits keeps the panel's own flat ground.
  // FT-1266 (user): "do the same clean up we did to the control settings to
  // the game settings, they are ragged." SO THE BLOCK BELOW NAMES BOTH TABS.
  // Everything FT-1264 wrote here is a statement about a settings TAB, not
  // about the Control tab in particular — one label track, one control track,
  // rows that dissolve into them, a control that sizes to its own content and
  // ellipsizes rather than sliding under the drip's lane — so the Game
  // settings tab opts in by carrying `ht-game` instead of restating any of
  // it. What differs between the two tabs is written under `.ht-game` after
  // this block (the compound rows' inner flex row, and the group air landing
  // on that wrapper rather than reaching the select inside it).
  .ht-prefs,
  .ht-game {
    // ── FT-1264: THE TAB IS A GRID — the ragged labels' actual fix ────────
    // The flex rows clustered each select against its own label, so nine
    // rows put nine controls at nine x positions (user: "Control settings
    // is messy — ragged labels, unnecessarily wide selectors, and it's a
    // bit cramped"). One grid with a LABEL TRACK and a CONTROL TRACK gives
    // every control the same starting x — the label column aligns, the
    // controls align, and each control still sizes to its own content
    // (`justify-self: start` refuses the track's stretch; OptionSelect's
    // FT-1088 widest-option rule is untouched, so the On/Off selects stay
    // compact and the two click pickers stay exactly as wide as the longest
    // action name).
    //
    // THE ROWS DISSOLVE INTO IT (`display: contents` on the line and its
    // lead): the DOM keeps its shape — titles, class hooks (`ht-ctrl-inert`,
    // `ht-ctrl-pick`), the v-for keys — while the label and the control
    // become the grid's own items. The expander list spans the full width,
    // the shelf it always was. `minmax(0, max-content)` on the label track
    // (not bare max-content) so a face too narrow for the longest name
    // squeezes the track and lets the name wrap instead of overflowing —
    // the phone sheets' armour, which is also why `.row-name` un-pins its
    // nowrap here.
    display: grid;
    grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
    align-items: center;
    column-gap: 14px;
    row-gap: 9px;
    > .ht-set-line,
    > .ht-set-line > .tw-lead {
      display: contents;
    }
    .label {
      grid-column: 1;
      justify-self: start;
    }
    // FT-1268: `.gcheck` joins the control track by NAME, not by inheriting
    // anything — it is a third kind of control item beside the select and
    // the menu summary, and the track's whole contract is that every one of
    // them starts on the same x. A checkbox is narrower than the select it
    // replaced (24px against 56.7-60.8px, measured), which shortens the
    // control column's own right edge without moving its LEFT one — the
    // alignment FT-1264/FT-1266 built is the start x, and that is unmoved.
    .tw-lead > .gsel,
    .tw-lead > .gcheck,
    .tw-lead > .ht-menu-sum {
      grid-column: 2;
      justify-self: start;
      // a control caught in a track narrower than its widest option
      // SHRINKS and ellipsizes its face rather than sliding under the
      // drip's lane (the scroll well is the one dress narrow enough to
      // engage this; everywhere else the track fits the option list and
      // nothing changes)
      max-width: 100%;
      min-width: 0;
    }
    ::v-deep .gsel .trigger {
      max-width: 100%;
    }
    // OptionSelect's FT-1088 sizer keeps setting the trigger's PREFERRED
    // width (max-content sizing is untouched) but must not hold the FLOOR
    // when the track is narrower — overflow:hidden zeroes a grid item's
    // automatic minimum, which is what lets the label ellipsize at all
    ::v-deep .gsel .gsel-sizer {
      overflow: hidden;
    }
    // FT-1265: STOOD DOWN — the list was this grid's full-width shelf
    // (`grid-column: 1 / -1`); as a body-hoisted overlay it is out of the
    // grid's flow entirely and the placement rule has nothing to place.
    // Kept as the record of the shelf era (FT-1260 → FT-1264).
    // > .ht-menu-list {
    //   grid-column: 1 / -1;
    // }
    .row-name {
      white-space: normal;
    }
    // the light grouping — a breath more air above each group's first row
    // (see controlToggles' groupStart note; the disc's two-column dress
    // zeroes it because rows pair across groups there)
    .ht-group-start .label,
    .ht-group-start .gsel,
    .ht-group-start .gcheck,
    .ht-group-start .ht-menu-sum {
      margin-top: 7px;
    }
    // THE DRIP'S LANE, ONLY WHERE THE DRIP CAN DRAW. `v-blood-scroll`
    // reserves a 30px gutter on every host as an inline style — right on a
    // box that scrolls, pure loss on the three faces where the panel is the
    // scroller and this box never can (the switches would sit 30px shy of
    // every other row's right edge). Same tool RoleTray's portrait rule
    // uses against the same inline style, and for the same reason:
    // `!important` because a plain inline declaration outranks every normal
    // rule in the sheet. The disc's own block re-opens the lane the moment
    // the box actually scrolls (`.scrolls`, below in the band rules).
    padding-right: 0 !important;
    // the sunken well — NightSheet's `.ns-rows.scrolls` recipe, verbatim:
    // a recessed ground, a hairline black edge, and an inset bite at the
    // two edges where the cut-off content actually is. Stated here (not in
    // the disc block) because it is the vocabulary, not the geometry — but
    // it can only ever LAND on the disc, the one face that bounds the box.
    &.scrolls {
      background: rgba(0, 0, 0, 0.35);
      border-radius: 8px;
      box-shadow:
        inset 0 9px 10px -7px rgba(0, 0, 0, 0.9),
        inset 0 -9px 10px -7px rgba(0, 0, 0, 0.9),
        inset 0 0 0 1px rgba(0, 0, 0, 0.5);
    }
  }

  // ── FT-1266: WHAT THE GAME SETTINGS TAB ADDS TO THE SHARED GRID ─────────
  //
  // THE THREE COMPOUND ROWS ARE THE WHOLE PROBLEM, and they are why simply
  // handing this tab FT-1264's rule would have moved the raggedness rather
  // than removed it. A simple row is label + select, which the shared rule
  // places in two cells and is done. Three rows here are not:
  //
  //   Night checklist   label + TWO selects (visibility, enforcement)
  //   Day timer         label + select + minutes scrub + the word "min"
  //   Whisper marks     label + select + seconds scrub + the word "sec"
  //
  // THE ANSWER IS ONE ITEM PER TRACK, ALWAYS: whatever a row's control side
  // is made of, it enters the grid as a SINGLE box, and that box is an inner
  // flex row starting on the common control x. So the compound rows' first
  // control shares an edge with every simple row's select, and the pieces
  // after it read left to right as the sentence they always were, sized to
  // themselves. `.ht-set-ctl` is that box in this file (template: the Day
  // timer and Whisper marks rows); `.nm-controls` already was one inside
  // NightModeRow, which is why that row needs no wrapper — only the
  // placement, written in that component (a parent's scoped styles reach a
  // child's ROOT and nothing below it).
  //
  // The alternative considered and rejected: `display: contents` all the way
  // down, letting the scrub become its own grid item. It auto-flows into the
  // NEXT row's label track — a scrub sitting where "Call back"'s mark
  // belongs. Two things wanting one cell is exactly what a wrapper is for.
  .ht-game {
    // the rows dissolve one level DEEPER than the Control tab's do: a
    // compound row wears `.ht-set-pair` (the FT-1055 sentence wrapper, which
    // also carries the row's title) between the line and its lead, and both
    // have to generate no box for the label and the control box to be the
    // grid's own items. The title still answers on hover — `display: contents`
    // removes the BOX, not the element, and a tooltip resolves up the DOM.
    > .ht-set-line > .ht-set-pair,
    > .ht-set-line > .ht-set-pair > .tw-lead {
      display: contents;
    }
    // …and NightModeRow's root, the one child-component element a parent's
    // scoped style can address at all. Its own block takes it from here.
    > .ht-set-line > .night-mode {
      display: contents;
    }
    // THE CONTROL TRACK'S ONE ITEM (see the block comment above).
    // `justify-self: start` refuses the track's stretch exactly as the shared
    // rule does for a lone select, so a compound row is as wide as its own
    // three pieces and no wider.
    .ht-set-ctl {
      grid-column: 2;
      justify-self: start;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      max-width: 100%;
    }
    // THE GROUP AIR LANDS ON THE WRAPPER, NOT THE SELECT INSIDE IT. The
    // shared rule above reaches `.ht-group-start .gsel`, which on a compound
    // row is the select nested inside `.ht-set-ctl` — pushing it 7px below
    // its own scrub and shearing the sentence in half. The wrapper takes the
    // margin as one object instead. (No compound row is a group's first row
    // today; this is the rule holding for the day one is.)
    .ht-group-start .ht-set-ctl {
      margin-top: 7px;
    }
    // FT-1268: the same guard for a compound row whose first control is now
    // a checkbox (Whisper marks). Its group air must land on the wrapper,
    // never on the box inside it, or the box would step 7px below its own
    // seconds scrub and shear the sentence.
    .ht-group-start .ht-set-ctl > .gsel,
    .ht-group-start .ht-set-ctl > .gcheck {
      margin-top: 0;
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
    // FT-1175: the blocked label is a fact to read, not a word to recognise,
    // and it must never take a second line — the disc sizes this button's
    // bottom corners against the arc and a second line pushes them through it
    // (see `.start-dock` in the disc rules for the two re-measurements that
    // arithmetic has already cost).
    white-space: nowrap;

    // FT-1175: A BLOCKED BUTTON IS READABLE NOW. `opacity: .4` was right when
    // the face said "Start game" whatever the state — a word you already know,
    // faded to say "not yet". It is wrong for a sentence nobody has read
    // before, which is the whole point of the change. Raised to .62, which is
    // still visibly below the ready state's 1 and still reads as unavailable
    // against every full-contrast control on the panel.
    //
    // AND THE WORDS RUN SMALLER THAN THE VERB. "Start game" is the button's
    // name; "3 seats open" is the button explaining itself. The smaller type
    // is what keeps a longer string inside the disc's 150px floor without the
    // box growing — measured against the live render, not assumed.
    &.blocked {
      opacity: 0.62;
      font-size: 100%;
      letter-spacing: 0;
    }

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
  // FT-1175: …and it moves onto the SCRUB's own edge, because the plate that
  // used to carry it is gone (see `.ht-seat-readout` above). The scrub is the
  // control the line is actually about — it is the number you drag to fix the
  // warning — so this is the cue landing closer to its cause than it did, not
  // a fallback. `.num-scrub-box` is NumberScrub's own root element, which is
  // why a scoped style here can reach it and nothing inside it.
  .ht-seat-readout.warn .num-scrub-box {
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
        // FT-1225: a DEFINITE width, so the grid's equal-`1fr` flanks can
        // keep the name on the disc's axis (see the base h3 note) — the
        // head's flex centring used to shrink-wrap the h3, which is exactly
        // the case where `1fr` tracks stop being equal.
        width: 100%;
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

      // ── FT-1175: +8px MORE, AND ONLY WHERE IT IS FREE ───────────────────
      //
      // The 26px above is the FLOOR's number: at 1642x780 the Start button's
      // bottom corners clear the disc's ellipse by +2.7px, and every pixel
      // this constant grows costs very close to a pixel of that. So it cannot
      // grow — at the floor.
      //
      // AT 1080px OF VIEWPORT HEIGHT IT IS NOT THE FLOOR AND THE MARGIN IS
      // 20.1px, measured on the live build both before this pass and after
      // it (rig: claude_temp_test/2026-08-26-ft1175-budget.mjs). 8px of that
      // is spent on the character tray and 12.4px is kept — still four times
      // the floor's own +2.7px, which is unchanged by this rule because the
      // floor is 780 tall and never enters the query.
      //
      // WHAT THE 8px BUYS, measured, 7 seats, a full 22-role script:
      //   the tray's box 193 -> 201px against 201px of content — the whole
      //   script visible with no scroll, where 193 cut the demon row.
      //
      // WHY THE TRAY NEEDS IT. The rows are being given room to breathe in
      // this same pass (the user's ask), and on the disc the band is a fixed
      // slice of the circle — so room handed to the rows comes out of the one
      // child that gives, which is the tray. This is the part of that bill
      // the button can afford to pay instead. It is gated on the SAME
      // 1080px height as the tile shrink in RoleTray, deliberately: those are
      // the two levers that decide whether a full script fits, and they
      // should turn on together rather than at two different sizes.
      @media (min-height: 1080px) {
        flex-basis: calc(var(--fd-d) - 2 * var(--fd-caph) + 34px);
      }
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
      // FT-1168: and the tab strip, for the same reason as the rows — it is
      // fixed content, and a squeezed tab strip is a control you cannot read
      // sitting above the thing it switches.
      > .ht-tabs,
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

      // ── FT-1252: THE DEAD BAND BELOW THE TRAY IS THE TRAY'S NOW ─────────
      //
      // FT-1201 made the tray's coins solve for the biggest size whose
      // wrapped rows fit the tray's box — and then handed the solver a box
      // with almost nothing spare at an ordinary script (Trouble Brewing at
      // 1920x1080: 188px of content in a 187px box, so the fit sat at its
      // 36px floor). Its return named the next lever exactly: "the band
      // handing the tray more height in HostTools.vue."
      //
      // WHERE THE HEIGHT IS, measured on the live build (rig:
      // claude_temp_test/2026-08-27-ft1252-measure.mjs): between the tray's
      // scroller and the Start button sits a 19px band that is the same 19px
      // at every disc size, because every part of it is a constant — 3px of
      // the tray's own bottom furniture (2px padding + 1px border), the 2px
      // tray margin, and the foot mixin's own 14px translate, which opens a
      // gap that takes no part in layout. Nothing lives there.
      //
      // A NEGATIVE BOTTOM MARGIN, NOT A BIGGER FLEX-BASIS, and the choice is
      // the whole point: the band's basis is a fixed slice plus a constant
      // whose every pixel pushes Start down by the same pixel (see the +26px
      // derivation above — Start's clearance at the disc's floor is +2.7px,
      // so the basis CANNOT grow). A negative margin on the band's own LAST
      // child leaves the basis — and therefore Start — byte-identical, and
      // simply lets the one child that grows (`flex: 1 1 auto`) resolve 12px
      // taller than the leftover, its bottom edge reaching 10px past the
      // band's own into the dead gap. 4px of breathing room stays above
      // Start (the same order of gap the coins' transparent corners already
      // read as).
      //
      // WHAT IT BUYS, measured before/after, 7 seats, Trouble Brewing:
      //   1920x1080  box 187 -> 199px, coins 36 -> 38px (the solver's first
      //              real step off its floor at an ordinary script)
      //   1280x960   box 67 -> 79px — coins hold the below-gate 42px floor
      //              (already LARGER than the disc-gate's 36) and the extra
      //              12px shows more of the scroll instead
      //   1642x780   box 48 -> 60px, same 42px floor, same trade
      //
      // THE CHORD IS RESPECTED, measured rather than assumed: the tray's new
      // bottom edge sits where the disc narrows, and every VISIBLE coin's
      // ink (the inscribed circle — the box corners are transparent) is
      // checked against the disc's own ellipse in the same rig, worst point
      // across all three scripts at all three sizes. The scroller clips at
      // the box's edge, so a row scrolled to the bottom is cut flat by the
      // fade, never drawn over the rim.
      > .role-tray {
        margin-bottom: -10px;
      }

      // THE ROWS WRAP RATHER THAN OVERFLOW, for the size where even the folds
      // below are not enough. The gap comes down from 14px to 8px first, which
      // is spacing rather than type.
      > .row {
        flex-wrap: wrap;
        gap: 4px 8px;
        // FT-1175: the rows breathe here too, at 4px rather than the
        // rectangle's 8. The band is a fixed slice of the circle and every
        // pixel a row keeps is a pixel the character tray does not get — so
        // the disc takes the smaller of the two spacings, the same way it
        // already takes 8px of column gap where the rectangle takes 14. The
        // budget the 4 was solved against is under `.ht-body` above.
        margin-bottom: 4px;
      }
      // …and the tab strip's own, for the same reason.
      //
      // IT ALSO COMES IN OFF THE RIM. The strip sits at the very top of the
      // band, where the chord is at its narrowest, and a full-band-width
      // strip put its top corners OUTSIDE the circle — measured at 1.2px
      // before this pass (the strip has always been a painted box) and 4.1px
      // after, because two separate leaves with their own 2px edges and a
      // gap between them are wider than one plate around both.
      //
      // 20px off the width lands it INSIDE at every disc size, measured on
      // the live build (rig: claude_temp_test/2026-08-26-ft1175-budget.mjs,
      // corner-against-the-ellipse, positive = inside):
      //
      //                     before      after
      //   1642x780 (floor)   -1.2       +3.3
      //   1000x900           -1.2       +3.3
      //   1920x1080          -1.2       +3.5
      //
      // …and it is 20px the strip does not miss: the two tabs stay exactly
      // equal halves of whatever width the strip has, so nothing about them
      // becomes different sizes.
      //
      // FT-1209 SUPERSEDES THE 20px: the strip is full-band again. The
      // corner-against-the-ellipse numbers above measured the PAINTED
      // LEAVES' top corners when the tabs spanned the strip end to end —
      // but the leaves are content-sized and clustered over the gear now
      // (alignTabs), nowhere near the strip's ends, and the only thing at
      // the ends is the 2px bottom rule, which sits ~28px LOWER than the
      // corners that measured -1.2px — well inside the circle at every disc
      // size. Meanwhile the three leaves plus the gear-centring inset need
      // every pixel the band has: the 20px was costing exactly the inset
      // that parks the last tab over the gear on shorter town names.
      > .ht-tabs {
        margin: 0 0 6px;
        width: 100%;
        align-self: center;
        // FT-1209: the disc alone keeps the tab marks — it is the one face
        // wide enough to carry mark + word on all three leaves (see the
        // base `.ht-tab-mark`'s own note for why the others fold them).
        .ht-tab-mark {
          display: inline-block;
        }
      }
      // THE WORD "assigned" FOLDS INTO THE VALUE'S TOOLTIP, the second and
      // last thing this disc takes away rather than rearranges (the claimed
      // count below is the first). It is the cheapest 62px on the Roles line
      // and it buys the most: with the four role buttons wearing words
      // (FT-1175), the half needs 527.7px of a 481px band and wraps to a
      // second line — 40px of band, straight out of the character tray.
      // Without the word it needs 456.7 and stays on one.
      //
      // The numbers themselves never fold: "3 / 7" beside the Roles mark is
      // the fact, and "assigned" is the sentence around it. A FOLD, not a
      // deletion — the value's own `title` carries the whole statement, the
      // rectangle and both phone sheets are untouched, and one deleted rule
      // brings it back.
      .ht-role-word {
        display: none;
      }

      // FT-1175: …AND THE MULTI-LINE ROWS KEEP THEIR OWN ROW-GAP THROUGH IT.
      // The rule above sets `gap` in both axes, which would flatten the cast
      // and settings lines to the disc's own 4px. They are deliberately two
      // and four lines now, so they keep the 6px this face can afford —
      // stated here rather than fought with `!important`.
      //
      // (It was 0 while FT-1090's merge existed to save every pixel of that
      // gap for the character tray; the tray got the room back another way in
      // this pass — see RoleTray's own note on giving up its padding.)
      > .row.ht-cast,
      > .row.ht-settings {
        row-gap: 4px;
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

      // ── FT-1231: THE CONTROL TAB FITS THE BAND, TWO WAYS ────────────────
      //
      // 1. THE BOX GIVES. The band's own rule two screens up is "nothing
      // shrinks except the tray" (`> .row { flex-shrink: 0 }`), and it is
      // exactly right for the build face — but on the Control tab there IS
      // no tray, and the nine personal rows were the band's only content and
      // still overflowed it: past the foot, past the rim, "too long for the
      // clock face" (the user, verbatim). So on this ONE row the band's rule
      // is overridden: the tab is the child whose height gives, and it
      // scrolls the rest — the same shock-absorber contract the tray keeps
      // on the build face (`RoleTray`'s FT-888 block), stated on the tab
      // because the tab is the tray's stand-in here.
      // `align-content: flex-start` because a flex-wrap box told to shrink
      // would otherwise SPREAD its lines over any slack height (the default
      // stretch), and a settings list floats apart exactly when it has room
      // to spare — the one state it should look calmest in.
      > .row.ht-settings.ht-prefs {
        flex-shrink: 1;
        min-height: 0;
        overflow-y: auto;
        align-content: flex-start;
        // the drip's lane comes back the moment the box actually scrolls
        // (`scrolls` is measured — see measurePrefsOverflow): 30px is
        // `v-blood-scroll`'s own LANE, the constant RoleTray's fitTile
        // already reads as "the blood-drip scrollbar reserves its 30px lane
        // AS padding". `!important` against the same inline style the base
        // rule zeroes; later in the sheet, so it wins that tie.
        //
        // AND THE WELL COMES IN OFF THE RIM. The band's +26px flex-basis
        // extension (see `.ht-body` above) runs the band's bottom PAST the
        // inscribed chord — safe under the build face, whose bottom child
        // is a tray of round coins with transparent corners, but this well
        // is a square-cornered box full of square-cornered rows, and at the
        // fpx = 1 discs that scroll (1440-1642 wide at 900/780 tall, where
        // the viewport font step outgrows the band) the bottom row's ink
        // measured 9px OUTSIDE the ellipse at the box's left corner. 18px
        // off each side brings that corner to +6px inside (measured, same
        // rig); the rows lose 36px they do not miss — full-width one-line
        // rows in this dress.
        &.scrolls {
          padding-right: 30px !important;
          margin-left: 18px;
          margin-right: 18px;
          // FT-1264: the well is the tab's NARROWEST dress — the margins
          // and the drip's lane leave ~300px of grid at the sizes that
          // scroll, which cannot host a free label track AND the widest
          // select. So the label track CAPS (fit-content: shorter names
          // still hug, longer ones wrap — height is the cheap axis in a
          // scroller) and the names take the cells' own 80% type; what
          // width remains goes to the controls, whose shrink-and-ellipsize
          // license (base block) is the last resort rather than the norm.
          grid-template-columns: fit-content(6.2em) minmax(0, 1fr);
          column-gap: 10px;
          // one type size for the WHOLE well — names and the closed
          // trigger faces both at 80% (the option lists keep their own
          // size; they open over the panel, not inside the well's width)
          .row-name {
            font-size: 80%;
            text-align: left;
            line-height: 1.25;
          }
          .ht-menu-sum,
          ::v-deep .gsel .trigger {
            font-size: 80%;
          }
        }

        // 2. THE TOGGLE ROWS TAKE TWO COLUMNS — the FT-1227 dress, re-cut
        // for the FT-1230 names (the full derivation sits on `.ht-prefs`'s
        // own block, base styles). The one new license: a toggle's NAME MAY
        // WRAP inside its cell — the mark holds the left edge, the switch
        // holds the right, and "Click role name to change role" takes two
        // quiet lines between them. That license is what makes two columns
        // possible at all after FT-1230 — one-line names want ~281px of
        // cell and fit two columns on no disc; two-line names run 196px
        // cells at the floor discs and fit (rig:
        // claude_temp_test/2026-08-27-ft1231-proof.mjs). The two full-width
        // rows (Setup panel, Grimoire size) keep their one-line names and
        // full lines, as before. Which sizes fit two columns and which wear
        // the scroll dress instead is a TYPE question, not a disc-size one
        // — the size table lives on the base `.ht-prefs` block with the
        // rest of the derivation.
        //
        // FITTED DRESS ONLY (`:not(.scrolls)`). In the scrolled state the
        // drip's lane has taken 30px of the box, and two columns of that
        // width push the long names to a THIRD line — squeezed columns
        // inside a scroller is the worst of both shapes. So the well shows
        // the rows FULL WIDTH, one per line (the base `.ht-set-line` rule
        // simply resumes), which is also the user's own either/or read back
        // as a ladder: two columns where they fit, the roles' scroll where
        // they cannot.
        &:not(.scrolls) {
          // FT-1260.2: the two PICKER rows (`ht-ctrl-pick`) keep full lines
          // — the columns' founding rule is that a select carrying WORDS
          // cannot live in a half-cell (Setup panel's own exemption), and
          // an action picker's face is words ("Nominate / Ghost vote").
          // The expander lists opt out by class list too (`ht-menu-list`
          // is not a `.ht-ctrl-row`): a full-width shelf under its row.
          //
          // FT-1264 RE-CUTS THE DRESS FOR THE GRID (the flex half-cells
          // stood down with the flex rows themselves — see `.ht-prefs`'s
          // own block). Four tracks: label / control / label / control.
          // Each label track is a `1fr` share (equal columns, names keep
          // their two-quiet-lines wrap license), each control track is
          // max-content — so within a column every switch starts on the
          // same x, the tab-wide alignment rule restated at half width.
          // The toggle rows flow into whichever half-line is free; the
          // full-line rows pin their label to track 1 (the base rule) and
          // span their control across the rest, which is also what makes
          // auto-placement break lines where a full row follows a lone
          // half-cell (Reminder pin's).
          grid-template-columns:
            minmax(0, 1fr) max-content
            minmax(0, 1fr) max-content;
          column-gap: 10px;
          row-gap: 6px;
          // EVERY label takes the cells' own 80% type here, not just the
          // half-cells' — the full-line rows share track 1 with the cells,
          // and at 90% "Click role name" outruns the ~148px the track has
          // left once the control tracks are paid (measured: it wrapped to
          // three lines and pushed the tab into the scroll dress at every
          // size). One type size is also simply how a settings table reads.
          .row-name {
            font-size: 80%;
            text-align: left;
            line-height: 1.25;
          }
          > .ht-set-line.ht-ctrl-row:not(.ht-ctrl-pick) {
            .label {
              grid-column: auto;
            }
            // FT-1268: the checkbox flows into a half-line exactly as the
            // select it replaced did — and more comfortably, since the
            // columns' founding rule is that a control carrying WORDS
            // cannot live in a half-cell, and a box carries none.
            .tw-lead > .gsel,
            .tw-lead > .gcheck,
            .tw-lead > .ht-menu-sum {
              grid-column: auto;
            }
          }
          // full-line rows: the control takes everything past the label
          // track, so its words start where every column-1 control starts
          > .ht-set-line:not(.ht-ctrl-row) .tw-lead > .gsel,
          > .ht-set-line.ht-ctrl-pick .tw-lead > .gsel {
            grid-column: 2 / -1;
          }
          // the group air comes off — these rows pair ACROSS groups, and a
          // margin on half a line would shear its partner out of true
          .ht-group-start .label,
          .ht-group-start .gsel,
          .ht-group-start .gcheck,
          .ht-group-start .ht-menu-sum {
            margin-top: 0;
          }
        }
      }

      // ── FT-1266: THE GAME SETTINGS TAB FITS THE BAND THE SAME WAY ───────
      //
      // IT NEVER DID. FT-1231 built the shock-absorber for the Control tab
      // alone, and this tab — seven rows, three of them compound — has been
      // running straight past the band's bottom into the Start button at
      // every pinched disc. Measured at HEAD, the tab's own bottom against
      // the band's (rig: claude_temp_test/2026-08-27-ft1266-band.mjs;
      // positive = overrun):
      //
      //                     band   tab wants   overrun
      //   1920x1080        364.1       287.0     -35.1   fits
      //   1000x900         300.9       260.0      -2.9   fits
      //   1280x960         319.3       287.0      +9.7   OVERRUNS
      //   1440x900         300.9       287.0     +28.1   OVERRUNS
      //   1600x900         300.9       287.0     +28.1   OVERRUNS
      //   1642x780         300.9       287.0     +28.1   OVERRUNS
      //
      // So this is the FT-1231 contract restated for the second tab, not a
      // new mechanism: the band's "nothing shrinks except the tray" rule is
      // overridden on this ONE row (there is no tray on either settings
      // tab), the box becomes its own scroller under the fork's drip bar,
      // and the sunken well lands only when the rows genuinely overflow —
      // measured in measureTabOverflow, class `scrolls`, exactly as the
      // Control tab's is.
      //
      // NO TWO-COLUMN DRESS HERE, and that is the one place the two tabs
      // deliberately differ. The Control tab's cells hold label + a switch,
      // which halves cleanly; three of these seven rows hold a select AND a
      // scrub AND a unit word, and a half-cell cannot carry that sentence —
      // the same founding rule that already keeps the Control tab's two
      // PICKER rows on full lines ("a select carrying words cannot live in a
      // half-cell"). One column, and the well where one column does not fit.
      > .row.ht-settings.ht-game {
        flex-shrink: 1;
        min-height: 0;
        overflow-y: auto;
        // a grid told to shrink must not SPREAD its rows over slack height
        // (`normal` stretches auto rows); a settings list floats apart
        // exactly when it has room to spare, the one state it should look
        // calmest in — `.ht-prefs`'s own reasoning, same words.
        align-content: start;

        &.scrolls {
          // the drip's 30px lane, and the well coming in off the rim — the
          // Control tab's numbers, unchanged: same box, same corner, same
          // ellipse (see that block for the derivation).
          padding-right: 30px !important;
          margin-left: 18px;
          margin-right: 18px;
          // the well is the narrowest dress this tab has: the margins and
          // the lane take 66px, and a compound row's control side is a
          // select plus a scrub plus a word. So the label track caps and the
          // names take the 80% type, exactly as the Control tab's well does
          // — what width is left goes to the controls.
          grid-template-columns: fit-content(6.6em) minmax(0, 1fr);
          column-gap: 10px;
          .row-name {
            font-size: 80%;
            text-align: left;
            line-height: 1.25;
          }
          ::v-deep .gsel .trigger {
            font-size: 80%;
          }
          .tw-daylen-unit {
            font-size: 70%;
          }
        }
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
      // FT-1214: THE DOCK STEPS OUT OF THE LAYOUT (`display: contents`) and
      // `.start` itself becomes the disc's foot flex item, wearing the
      // SHARED `face-disc-foot-button` mixin — the block this rule and
      // NightSheet's End night solved separately now lives in faceDisc.scss,
      // because the third foot button (End day) arrived and three copies is
      // what that file exists to end. The dock keeps its element (the phone
      // sheets' sticky footer and the hint both hang off it, other media);
      // here it simply stops generating a box, so the button lands in the
      // column exactly where the dock used to.
      //
      // The width and margin lines below are INERT on a contents box (it
      // generates no box for them to size) and stand as the record of what
      // the dock carried before the fold, per the house rule. The
      // derivations they explain (the 0.583 coefficient, the 150px label
      // floor, the FT-938 fd-rx correction) also live in the mixin's header.
      display: contents;
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
      //
      // FT-1214: those numbers ARE the mixin now — one box for the three
      // primary buttons, geometry only (Start keeps its own black/purple
      // skin). The dock is display:contents (above), so the foot translate
      // and the width floor land HERE, on the button that was always their
      // real subject. One visible change rides along, and it is the shared
      // rule's own: the width is a FLOOR (FT-1143), so a long blocked label
      // ("3 seats still open") widens the button instead of overflowing the
      // fixed dock it used to sit in.
      .start {
        @include face-disc-foot-button;
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

// ── FT-1265: THE CUSTOMIZATION LIST IS AN OVERLAY ─────────────────────────
// (user: "these shouldn't be an inline addition, they should be an overlay
// menu like the click cog menu is.") Inline, the list pushed the tab's rows
// down and clipped at the disc's foot and the scroll well's edge; open, it
// now hoists to <body> (hoistMenuList) and hangs off its own trigger's rect
// (placeMenuList — golem/floatingPicker's math), so the rows behind it never
// move and nothing shears it.
//
// FLAT RULES, deliberately: a scoped rule stamps its `[data-v-…]` on the
// LAST compound selector only, so a nested `.ht-settings .ht-menu-list`
// stopped matching the moment the element moved — written flat, the
// attribute rides each class itself and the dress follows the element onto
// <body>. `.gsel-menu` (OptionSelect, FT-1167) is the precedent, and the
// chrome below is that list's own — ground, plum edge, radius, shadow —
// because the two popups are the same object at two sizes.
.ht-menu-list {
  // fixed BEFORE it is placed, too: for the one microtask between Vue
  // rendering the element in the tab and hoistMenuList moving it, fixed
  // takes it out of flow — the rows never jump, even pre-paint.
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  // the wheel over the open list scrolls THE LIST (placeMenuList caps its
  // height to the window's room); `contain` stops the chain into the panel
  // behind it whether or not the list has anything left to scroll — the
  // same pair `.gsel-menu` wears (FT-1265).
  overflow-y: auto;
  overscroll-behavior: contain;
  background: rgba(12, 8, 16, 0.96);
  border: 2px solid rgba(120, 105, 135, 0.55);
  border-radius: 8px;
  box-shadow: 0 0 12px black;
  // above the panel (19) and the seats' plates (11); BELOW the hoisted
  // `.gsel-menu`s at 60, because the master row's and the slot rows' own
  // On/Off lists open from INSIDE this overlay and must paint over it.
  z-index: 55;
}
.ht-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 6px;
  position: relative;
  .row-name {
    flex: 1 1 auto;
    min-width: 0;
    text-align: left;
    font-size: 80%;
    white-space: nowrap;
    // an action turned off stays LISTED (the list is where the whole
    // vocabulary teaches itself now) — it just dims.
    &.off {
      opacity: 0.45;
    }
  }
  .row-mark,
  .row-mark-fa,
  .gsel,
  // FT-1268: the rows' On/Off is a checkbox now — same rule, same reason
  // (the name is the only thing in this row allowed to give up width).
  .gcheck {
    flex-shrink: 0;
  }
  // FT-1265: the marks' dress RESTATED — inline, these rows inherited it
  // from the settings block's own `.row-mark` / `.row-mark-fa` rules, whose
  // ancestor selectors the hoisted list no longer answers to. Same numbers,
  // same warm ink, same FA width fight (the two-class match — see the
  // settings block's FT-1100 note for why 18px needs it).
  .row-mark {
    width: 22px;
    height: 22px;
    object-fit: contain;
    display: block;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
    // FT-1337: the chair variant — see the settings block's twin note.
    &.chair-mark::before {
      content: "";
      display: block;
      width: 100%;
      height: 100%;
      background-color: #cfc4ae;
      -webkit-mask-image: var(--chair, url("../assets/ui-seat-front.svg"));
      mask-image: var(--chair, url("../assets/ui-seat-front.svg"));
      -webkit-mask-size: contain;
      mask-size: contain;
      -webkit-mask-position: center;
      mask-position: center;
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
    }
  }
  .row-mark-fa {
    width: 18px;
    height: 18px;
    color: rgb(154, 146, 133);
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
    &.svg-inline--fa {
      width: 18px;
      height: 18px;
    }
  }
  // FT-1326 (user): an UNCHECKED box was reading as no box at all. The cause
  // is not the hoist (scoped styles ride the element's own `[data-v-…]`
  // attribute wherever it moves, so `.gcheck`'s component styles were always
  // landing here) — it is that OptionCheck's off state is `$control-bg`
  // (black, 70%) behind a `$control-edge` (black, 2px) plate, and THIS list's
  // own ground is `rgba(12, 8, 16, 0.96)` — an opaque near-black, not a
  // blurred glass a translucent box can lighten by showing more of what is
  // behind it (PrefsMenu's own `.gcheck:not(.on)` fix leans on exactly that
  // blur, which this flat panel does not have). Every row in every list here
  // shares the same plate, so every one of them was equally invisible off —
  // Automations only made it UNMISSABLE because all six of its rows start
  // off at once, with nothing lit beside them to read as "these are boxes".
  // The fix is the plate's own HOVER dress, held at rest instead of waiting
  // for the pointer: the one ground+edge pair this file already uses to say
  // "a box is here" without saying "chosen" (that stays `.on`'s plum alone).
  .gcheck:not(.on) {
    background: $control-bg-hover;
    border-color: $control-edge-hover;
  }
  // the drag dress: the grabbed line dims in place (the browser carries
  // its image), and the drop slot draws a seam in the grimoire's own
  // purple at the edge it would land on.
  &.dragging {
    opacity: 0.4;
  }
  &.drop-before::before,
  &.drop-after::after {
    content: "";
    position: absolute;
    left: 4px;
    right: 4px;
    height: 2px;
    border-radius: 1px;
    background: $control-edge-hover;
    pointer-events: none;
  }
  &.drop-before::before {
    top: -2px;
  }
  &.drop-after::after {
    bottom: -2px;
  }
}
// the grip: the conventional 2×3 dot grid, drawn rather than fetched — the
// icon set has no grip glyph registered and one dot plus five box-shadow
// copies ARE the mark. (FT-1265: it was three cast lines, which read as a
// hamburger MENU — the user's call; dots are the drag-handle convention.)
// Same 12×11 hit box as the lines wore; the dots sit centred inside it.
.ht-menu-grip {
  flex-shrink: 0;
  position: relative;
  width: 12px;
  height: 11px;
  cursor: grab;
  &::before {
    content: "";
    position: absolute;
    // two tight columns of three: 2px dots, columns 4px apart on centre,
    // rows 3.5px — the top-left dot anchors, the shadows place the rest
    left: 3px;
    top: 1px;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    box-shadow:
      4px 0 0 rgba(255, 255, 255, 0.4),
      0 3.5px 0 rgba(255, 255, 255, 0.4),
      4px 3.5px 0 rgba(255, 255, 255, 0.4),
      0 7px 0 rgba(255, 255, 255, 0.4),
      4px 7px 0 rgba(255, 255, 255, 0.4);
  }
  &:active {
    cursor: grabbing;
  }
}
// ── FT-1264: the master row at the list's head ───────────────────────────
// No grip (the whole-menu switch has no order to drag); its words are
// indented past where a grip would sit so the action names below still
// read down one edge, and a hairline under it separates "the menu" from
// "its buttons".
.ht-menu-master {
  padding-left: 24px;
  padding-bottom: 5px;
  margin-bottom: 3px;
  border-radius: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  .row-name {
    opacity: 0.85;
  }
}
// Master Off: the slot rows dim but stay operable — the tab's own
// inert-but-working grammar (`.ht-ctrl-inert`), worn by a list.
.ht-menu-off .ht-menu-item:not(.ht-menu-master) {
  opacity: 0.45;
}

// ── FT-1262: THE PASSWORDS OVERLAY ────────────────────────────────────────
// The head's key button opens this; it hoists to <body> and hangs off that
// button (hoistPassMenu → placePopupAt). FLAT RULES for the same reason
// `.ht-menu-list` above is flat: a scoped rule stamps its `[data-v-…]` on
// the last compound selector only, so any ancestor-nested rule stops
// matching the moment the element moves to <body>.
//
// THE CHROME IS `.ht-menu-list`'s, restated rather than shared: same ground,
// same plum edge, same radius, shadow and z-55 (above the panel's 19 and the
// seats' 11). Restated because the two popups' INSIDES have nothing in
// common — that one is a drag-orderable list of switches, this is two little
// forms — and a shared base class would have to be undone in half the rules
// it set. The layer number is the part that must not drift, and it is
// commented in both places.
.ht-pass-menu {
  // fixed before it is placed, too — the one microtask between Vue rendering
  // it and hoistPassMenu moving it (see `.ht-menu-list`'s own note)
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  // a comfortable reading width, and the floor placePopupAt measures: that
  // math takes the popup's NATURAL width (`box.width`), so the min-width is
  // what stops two inputs and three buttons from being squeezed into the
  // key button's own ~110px.
  min-width: 300px;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: rgba(12, 8, 16, 0.96);
  border: 2px solid rgba(120, 105, 135, 0.55);
  border-radius: 8px;
  box-shadow: 0 0 12px black;
  z-index: 55;
  // The head this opens from is `em`-scaled and enormous on the disc (~27px)
  // — inheriting it would give the overlay giant prose. A fixed 15px base
  // keeps the two forms the same size wherever the button is pressed, which
  // is what `.gsel-menu` and `.ht-menu-list` effectively get from the tab.
  font-size: 15px;
  color: rgb(230, 225, 215);
  text-align: left;
}
.ht-pass-title {
  font-size: 80%;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  opacity: 0.6;
}
.ht-pass-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  // the two locks are separate errands — a hairline says so, the same
  // separator the menu list's master row wears
  & + & {
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }
}
.ht-pass-head {
  display: flex;
  align-items: center;
  gap: 8px;
  // the FA mark's dress, restated for the hoisted element exactly as
  // `.ht-menu-item`'s is (same numbers, same warm ink, same width fight)
  .row-mark-fa {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: rgb(154, 146, 133);
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
    &.svg-inline--fa {
      width: 16px;
      height: 16px;
    }
  }
}
.ht-pass-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 92%;
  white-space: nowrap;
}
// The state word carries the whole answer for this row, so it is the one
// thing here allowed colour: "Set" in the grimoire's own gold, "Not set" (and
// the honest "checking…") dimmed to the furniture.
.ht-pass-state {
  flex-shrink: 0;
  font-size: 78%;
  opacity: 0.5;
  &.set {
    opacity: 1;
    color: rgb(202, 166, 98);
  }
}
.ht-pass-teach {
  margin: 0;
  font-size: 76%;
  line-height: 1.35;
  opacity: 0.55;
}
.ht-pass-do {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  input {
    flex: 1 1 auto;
    min-width: 0;
    padding: 4px 7px;
    font-family: inherit;
    font-size: 85%;
    color: inherit;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(120, 105, 135, 0.5);
    border-radius: 5px;
    &:focus {
      outline: none;
      border-color: rgba(202, 166, 98, 0.8);
    }
    &:disabled {
      opacity: 0.5;
    }
  }
  button {
    flex-shrink: 0;
    padding: 4px 10px;
    font-family: inherit;
    font-size: 82%;
    color: inherit;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(120, 105, 135, 0.5);
    border-radius: 5px;
    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.16);
      border-color: rgba(202, 166, 98, 0.7);
    }
    // the keyboard's own ring — this overlay is reachable by Tab and must
    // say where the focus is (the panel's buttons all carry one)
    &:focus-visible {
      outline: 2px solid rgba(202, 166, 98, 0.9);
      outline-offset: 1px;
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
  // Clearing is the destructive half — red on hover, the same register the
  // panel's other undoing controls use, and only on hover so the row does
  // not read as an alarm at rest.
  .ht-pass-clear:hover:not(:disabled) {
    color: rgb(230, 130, 130);
    border-color: rgba(200, 90, 90, 0.7);
  }
}
.ht-pass-note {
  margin: 2px 0 0;
  font-size: 76%;
  &.ok {
    color: rgb(150, 200, 150);
  }
  // the server's own refusal, in the colour a refusal is owed
  &.err {
    color: rgb(230, 130, 130);
  }
}
</style>
