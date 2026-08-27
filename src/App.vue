<template>
  <div
    id="app"
    @keyup="keyup"
    tabindex="-1"
    :class="{
      night: grimoire.isNight,
      static: grimoire.isStatic,
      booting: !booted,
      'in-game': inGame,
      // FT-1168 (user): GRIMOIRE SIZE — a PERSONAL setting off the corner
      // cog, not a town's. It scales the storyteller's post, which is the
      // grimoire book, the End-day button below it and the summons bell
      // above it: one column since FT-1063, so one size for all three. The
      // class rides #app because `.storyteller-post` is `position: fixed`
      // and has no styling ancestor of its own to hang a modifier on.
      'grimoire-lg': prefs.grimoireSize === 'large',
      // The build panel and the ring are both centred, which is fine on a
      // screen wide enough for the panel to nest inside the ring and impossible
      // on a portrait phone, where they are the same size. The phone layout
      // stacks them instead — and needs to know, exactly, when the panel is up.
      // (`#townsquare.building` is a near-miss: it stays true for a re-hosted
      // town that is already cast, when this panel is NOT showing.)
      'building-tools': showHostTools,
      // The night sheet's twin of the same problem: on a phone the CHECKLIST
      // is a sheet the size of the build panel, and the ring has to give it
      // the room. Only the checklist — the day's phase pill is small enough
      // to live inside the ring, and shrinking the square for it would move
      // the town twice a day for nothing.
      'checklist-up': showNightChecklist,
      // Turned on its side a phone has no spare room at all — the ring is
      // 355px of a 375px window — so the night column is permanent there
      // rather than appearing at dusk. Measured: with the sheet's day PILL
      // left in the middle, it covered three chairs' name plates.
      'night-sheet-up': showNightSheet,
      // A DRAWER IS OUT. On a phone every drawer is a bottom sheet, and the
      // bottom edge is the one piece of a phone every docked surface wants:
      // the build panel and the night checklist are standing there already.
      // The sheet wins it — the user reached for it — and this class is what
      // moves the other three out of its way: the square shrinks (TownSquare),
      // the build panel and the night sheet stand down (their own rules), and
      // the session pill steps up onto the sheet's top edge (below).
      'sheet-up': anyDrawerOpen,
      // FT-1141: THE SAME CONDITION, WORN UNDER AN HONEST NAME. `sheet-up` is
      // read only by phone-sheet rules, and the demon's bluff cluster has to
      // stand down on every viewport — so this is the desktop-and-phone alias,
      // bound to the SAME `anyDrawerOpen` computed rather than to a second
      // predicate. There is still exactly one place that knows which drawers
      // count (`rightDrawerOpen` below, plus the grimoire); nothing here can
      // drift out of step with it. Consumed by TownSquare.vue's stand-down.
      'drawer-out': anyDrawerOpen,
      // …and WHICH edge it came from, which only matters turned on its side:
      // there a drawer stays a drawer (a 375px-tall window has no room for a
      // sheet) and the square gives up the column it is standing in.
      'sheet-left': modals.roleDrawer,
      // A FACE DISC IS STANDING OVER THE HUB — see the computed. The town
      // readout answers to this and to nothing else (TownInfo.vue).
      'face-disc-open': faceDiscOpen,
      // FT-1053: THE END-GAME CEREMONY's phase, worn on the root so the
      // seat-level dressing (EndCeremony.vue's unscoped rules) can reach the
      // ring — held breath / verdict / fade, plus which team the show is for.
      'ec-active': ceremony.phase !== 'idle',
      'ec-breath': ceremony.phase === 'breath',
      'ec-verdict': ceremony.phase === 'verdict',
      'ec-fade': ceremony.phase === 'fade',
      'ec-good': ceremony.phase !== 'idle' && ceremony.winner === 'good',
      'ec-evil': ceremony.phase !== 'idle' && ceremony.winner === 'evil',
    }"
    :style="{
      backgroundImage: grimoire.background
        ? `url('${grimoire.background}')`
        : '',
      // FT-881 follow-up: the clock face's art measures about 4px left of the
      // window centre — inside the noise of a hand-painted rim, so it is dialled
      // rather than re-trimmed. These shift the PAINT, not its scale: `cover`
      // still covers, which a smaller background-size would not.
      '--bg-off-x': bgOffX + 'px',
      '--bg-off-y': bgOffY + 'px',
      // H: added to cover's own height, so + zooms in and − zooms out. Past
      // the point where cover stops covering, the edges show — which is the
      // trade, made visible rather than argued about.
      '--bg-h': bgH + 'px',
    }"
  >
    <video
      id="background"
      v-if="grimoire.background && grimoire.background.match(/\.(mp4|webm)$/i)"
      :src="grimoire.background"
      autoplay
      loop
    ></video>
    <!-- Golem fork (FT-973): THE MOVING HANDS on the town's dial.

         ONLY IN A TOWN, and that is the whole reason for the `v-if`. The two
         plates are different art: the entry screen wears
         `background-clocktower-centered.png`, which has HANDS PAINTED INTO IT,
         while `#app.in-game` swaps to the blank plate that has none. So these
         belong to exactly the half of the app the painted ones are absent from
         — mount them on the entry screen too and there would be two sets of
         hands on one dial.

         It is the mirror image of the letters below, which run `v-if="!inGame"`
         for the same reason from the other side.

         IT STANDS BEFORE THE BACKDROP, AND THAT POSITION IS LOAD-BEARING.
         `.backdrop` is the veil that dims the whole dial at night, and it sits
         at the same stack level as this layer — so DOM ORDER is the only thing
         that decides which of the two is on top. Before it, the hands darken
         WITH the art they lie on, exactly as the entry screen's PAINTED hands
         do. After it, they would keep their daylight value over a dimmed face
         and read as a bright object floating off the dial.

         The z-index itself, and the measurement behind it, are in the
         component's own stylesheet. -->
    <!-- FT-1000 (user layering call: "background, blood splatters, clock
         hands, script image, game stats"): the per-seat dial stains, moved
         from TownSquare.vue for exactly the FT-993 reason below -- inside
         #townsquare they could only ever paint OVER the hands. Mounted
         before the splat and the hands; anchored on the same dial-centre
         vars the splat uses, stains keep their seat-spoke transforms
         verbatim. -->
    <div class="blood-dial" aria-hidden="true" v-if="deadStains.length">
      <div
        class="stain"
        v-for="stain in deadStains"
        :key="stain.key"
        :style="stain.style"
      ></div>
    </div>
    <!-- FT-993 (user correction): the centre-face splat, relocated here from
         TownSquare.vue. It MUST render before <FaceHands> in the document --
         neither #app nor #townsquare forms a stacking context (measured,
         see FaceHands.vue's own z-probe comment), so a splat nested inside
         #townsquare can never sit behind these hands: #townsquare itself has
         to stay above the hands (the ring and readout do), and a negative
         z-index here is a hole, not a slot (0px painted, same measurement).
         Mounted earlier at the SAME z-index (0, its stylesheet below) is what
         makes the hands win the paint order without an integer contest --
         first in the document loses ties, and that is the point.

         `faceSplat`/`faceSplatStyle` below are the same seed-read TownInfo.vue
         and TownSquare.vue already do (grimoire.faceSplatSeed, frozen once by
         TownSquare's created() on session/distributeRoles or this client's own
         seat receiving a role) -- reading it fresh here rather than passing it
         down keeps this working the same way across App.vue's own lifetime,
         no prop plumbing needed. -->
    <div
      class="face-splat"
      aria-hidden="true"
      v-if="faceSplat"
      :key="faceSplat.file"
      :style="faceSplatStyle"
    ></div>
    <FaceHands v-if="inGame" />
    <div class="backdrop"></div>
    <!-- Golem fork (FT-852): the dial's CLOCKTOWER letters are static DOM
         now, not baked into the art — positions are plain numbers in
         image-pixels (see --fpx below), adjustable in devtools and scaling
         with the clock face at every viewport. -->
    <!-- the dial's two words each wear their own font (the Aa panel,
         top-left, is the control) -->
    <div class="dial-letters" aria-hidden="true" v-if="!inGame">
      <span
        v-for="d in dialLetters"
        :key="d.cls + wordKey(d)"
        :class="['dl', d.cls]"
      >
        <img
          v-if="wordKey(d) !== 'text' && dialGlyph(d)"
          :src="dialGlyph(d).src"
          :style="dialStyle(d)"
          :alt="d.letter"
        />
        <template v-else>{{ d.letter }}</template>
      </span>
    </div>
    <!-- the COIN LAB (Co): swap the seats' coin art live (user call
         2026-08-18). The choice rides CSS variables, so it is a repaint. -->
    <div id="coin-lab" :class="{ open: coinLabOpen }" v-if="devLabs">
      <div
        class="fd-toggle"
        title="Coin lab"
        @click="coinLabOpen = !coinLabOpen"
      >
        Co
      </div>
      <div class="co-rows" v-if="coinLabOpen">
        <button
          v-for="c in coinOptions"
          :key="c.id"
          class="co-pick"
          :class="{ on: coinPick.id === c.id }"
          @click="pickCoin(c.id)"
        >
          <img :src="coinThumb(c.id)" alt="" />
          {{ c.label }}
        </button>
      </div>
    </div>
    <!-- the FONT LAB: the dev dropdown that owns every lettering choice -->
    <!-- the DRIP LAB (Dr): the user's own dials for the blood scrollbar -->
    <div id="drip-lab" :class="{ open: drOpen }" v-if="devLabs">
      <div class="fd-toggle" title="Drip lab" @click="drOpen = !drOpen">Dr</div>
      <div class="dr-rows" v-if="drOpen">
        <div class="dr-row" v-for="d in drDials" :key="d.key">
          <span class="dr-label">{{ d.label }}</span>
          <input
            type="range"
            :min="d.min"
            :max="d.max"
            :step="d.step"
            v-model.number="dripRef[d.key]"
            @input="saveDrip"
          />
          <span class="dr-val">{{ dripRef[d.key] }}</span>
        </div>
        <button class="dr-reset" @click="resetDrip">Reset</button>
      </div>
    </div>
    <!-- THE FACE LAB (Fa): two scrubs that shift the background's paint so the
         clock face can be dialled onto the window's centre line by eye.
         TEMPORARY BY DESIGN — the measured residual is ~4px, which is inside
         the noise of a hand-painted rim, so the right answer is whatever looks
         right rather than whatever a rig computes. Once a value is settled it
         gets baked into the stylesheet and this comes out.

         Visible without `devLabs` on purpose: the other labs are hidden (user
         call), and this one is only useful while someone is looking at it.

         NOTE on the scrub: its type-in strips non-digits, so a NEGATIVE offset
         can be dragged but not typed. Left as-is rather than forking the shared
         control for a dev tool that is coming out again. -->
    <div id="face-lab" :class="{ open: faceLabOpen }" v-if="devLabs">
      <div
        class="fd-toggle"
        title="Face lab"
        @click="faceLabOpen = !faceLabOpen"
      >
        Fa
      </div>
      <div class="fa-rows" v-if="faceLabOpen">
        <div class="fa-row">
          <span class="fa-label">X</span>
          <NumberScrub
            :value="bgOffX"
            :min="-40"
            :max="40"
            @input="setBgOff('x', $event)"
          />
        </div>
        <div class="fa-row">
          <span class="fa-label">Y</span>
          <NumberScrub
            :value="bgOffY"
            :min="-40"
            :max="40"
            @input="setBgOff('y', $event)"
          />
        </div>
        <!-- H is the size, and it needs a wider range than the two nudges: it
             is how far the art zooms past (or short of) covering the window. -->
        <div class="fa-row">
          <span class="fa-label">H</span>
          <NumberScrub
            :value="bgH"
            :min="-200"
            :max="400"
            @input="setBgOff('h', $event)"
          />
        </div>
        <button
          class="fa-reset"
          @click="setBgOff('x', 0), setBgOff('y', 0), setBgOff('h', 0)"
        >
          Reset
        </button>
      </div>
    </div>
    <!-- THE FACE-DISC LAB (Fd) — TEMPORARY, DELETE ME. One notch below the face
         lab, in the same column. It dials the geometry of EVERY menu on the
         clock face at once — the night checklist, the Host and Join entry
         panels, the build panel — which is why it stands here rather than
         inside any one of them: it used to live in NightSheet, where it moved
         one disc of four and could not be found during the day at all.

         HIDDEN 2026-08-20 (user call: "we can hide that for now"). It rode
         `devLabs`-free on the reasoning that it is only useful while someone is
         looking at a disc — but the discs are baked now (FT-935), so the lab has
         done its job and its toggle was landing on top of the grimoire's list.
         Behind `devLabs` with the font lab, not deleted: the dials are how the
         next disc gets set by eye. -->
    <FaceDiscLab v-if="devLabs" />
    <!-- THE CLOCK-HANDS LAB (Fh) — one notch below the disc lab, same column,
         same shell. Style and colourway, each blade's length and width, the
         centre boss, opacity, and an angle scrub that spins the whole assembly
         so the art can be judged at rest instead of waited for.

         BEHIND `devLabs` FROM THE START. The disc lab above was hidden on the
         user's call because a visible dev toggle was landing on top of real
         controls; a new one shipping visible would be that same mistake made
         again on purpose. -->
    <FaceHandsLab v-if="devLabs" />
    <!-- THE GHOST LAB (Gh) — one notch below the hands lab, same column, same
         shell. The dead seat's mark: four materials (the painted cowl that
         ships, glass, clear glass, frost) and then blur, saturation,
         brightness, tint, opacity and rim.

         WHY A LAB AND NOT A TINT. Glass in this app means `backdrop-filter`,
         which treats what is BEHIND an element — and `ui-ghost-cowl.png` is a
         painting, which has no behind. So glass mode stops drawing the PNG and
         uses its ALPHA AS A MASK over a backdrop-filtered layer instead. That
         is two idioms this fork already has, composed: TownInfo's masked heart
         and faceDisc's glass. See `src/golem/ghostGlass.js`.

         BEHIND `devLabs` FROM THE START, for the hands lab's stated reason. -->
    <GhostLab v-if="devLabs" />
    <!-- THE VEIL LAB (Vl) — one notch below the ghost lab, same column, same
         shell. The dead seat's silk: the pick of the two veil paintings, then
         the glass bench's dials (Frost, Refraction, Aberration, Edge band)
         plus Opacity. See src/golem/veilGlass.js. Behind `devLabs` from the
         start, for the column's shared reason. -->
    <VeilLab v-if="devLabs" />
    <!-- THE NUMERAL-GLOW LAB (Ng) — one notch below the veil lab, same
         column, same shell. The clock ring's dressing: the four shadow
         layers under the twelve numerals (under-light, dark drop, close
         halo, wide breath), strength and size dials each. See
         src/golem/numeralGlow.js. Behind `devLabs` from the start, for the
         column's shared reason. -->
    <NumeralGlowLab v-if="devLabs" />
    <!-- THE STATS-PLATE LAB (Sp) — one notch below the numeral lab, same
         column, same shell. The dark pill under the clock face's centre
         stats: ground opacity and tint, real backdrop glass, padding and
         corner radius. See src/golem/statsPlate.js. Behind `devLabs` from
         the start, for the column's shared reason. -->
    <StatsPlateLab v-if="devLabs" />
    <!-- dev labs hidden for now (user call 2026-08-18) — flip devLabs -->
    <div id="font-debug" :class="{ open: fontDebugOpen }" v-if="devLabs">
      <div
        class="fd-toggle"
        title="Font lab"
        @click="fontDebugOpen = !fontDebugOpen"
      >
        Aa
      </div>
      <div class="fd-rows" v-if="fontDebugOpen">
        <div class="fd-row" v-for="row in fdRows" :key="row.field">
          <span class="fd-label">{{ row.label }}</span>
          <button class="fd-cycle" @click="fdCycle(row.field)">
            {{ fdLabel(row.field) }}
          </button>
        </div>
      </div>
      <div
        class="fd-toggle ik-toggle"
        title="Engraver lab"
        @click="toggleIkLab"
      >
        Ik
      </div>
      <div class="ik-panel" v-if="ikOpen">
        <div class="ik-previews">
          <div class="ik-pair" v-for="p in ikPreviews" :key="p.key">
            <img :src="p.ours" alt="" />
            <img :src="p.official" alt="" />
            <span>{{ p.key }}</span>
          </div>
        </div>
        <div class="ik-row" v-for="d in ikDials" :key="d.key">
          <span class="ik-label">{{ d.label }}</span>
          <input
            type="range"
            :min="d.min"
            :max="d.max"
            :step="d.step"
            v-model.number="engraverRef[d.key]"
            @change="onIkDial"
          />
          <span class="ik-val">{{ engraverRef[d.key] }}</span>
        </div>
        <div class="ik-acts">
          <button @click="ikReroll">Re-roll</button>
          <button @click="ikReset">Reset</button>
        </div>
      </div>
    </div>
    <transition name="blur">
      <!-- Golem fork: while the host is BUILDING (hosting, roles undealt) the
           town centre is the tools panel — from zero seats up. TownInfo
           returns once the game starts; Intro ONLY when sessionless (FT-852:
           a player in a session always sees the live town square — seats
           appear as the host adds them; no waiting screen). -->
      <!-- FT-1032: `reentry` — the host walked back INTO a town whose deal
           stash says a game is running (the durable dealAt marker survived;
           the local roster mirror did not). The panel greets them with the
           day instead of the setup; its Re-enter button is what stands the
           panel down. -->
      <HostTools
        v-if="showHostTools && !session.nomination"
        :reentry="reentry"
        @reenter="reenterTown"
        @rebuild="rebuildTown"
      ></HostTools>
      <Intro
        ref="intro"
        v-else-if="!session.sessionId && !players.length"
      ></Intro>
      <TownInfo
        v-else-if="!session.nomination"
        @end-phase="endPhase"
      ></TownInfo>
      <Vote v-if="session.nomination"></Vote>
    </transition>
    <!-- FT-860: THE NIGHT SHEET — the storyteller's checklist, standing in the
         town centre once the build panel steps aside. It sits outside the
         transition because its phase bar is wanted during the DAY too, when
         TownInfo owns the slot; the sheet drops clear of the plate there.

         STORYTELLER ONLY, in every visibility mode. A spectator's component
         tree never contains it, so the night order — which names the
         characters in play — is not in their page to be revealed by a missing
         style rule. -->
    <!-- ref'd so the E key can flip the phase through the sheet's OWN button
         method (flipPhase) rather than committing the phase mutation itself.
         That method carries the "require the checklist before the night can
         end" gate, and anything added to it later — a confirmation, say —
         covers the key at the same moment it covers the button, because they
         are one function and not two. -->
    <NightSheet ref="nightSheet" v-if="showNightSheet" />
    <!-- THE ARMED CHARACTER'S CARD (touch).
         Every hover card in the app declines to appear without a mouse, which
         is right — and left a touch storyteller with nowhere to read what a
         character DOES outside the script drawer. The tap-to-place selection
         is already the app's "this character, right now": while one is armed,
         it explains itself.

         ONE instance, here, rather than a copy in each arming surface: the
         tray and the grimoire drawer both write the same `drawerPick`, and a
         later surface that writes it inherits this for free. It is THE shared
         card (RoleHoverCard), pinned to whichever tile is showing as picked,
         and it never takes a tap — the card is pointer-events: none. -->
    <RoleHoverCard
      v-if="armedRole && armedAnchor"
      :role="armedRole"
      :anchor="armedAnchor"
      :pinned="armedPinned"
      @dismiss="armedAnchor = null"
    />
    <TownSquare></TownSquare>
    <!-- The strip's records mark asks for the overlay App already owns, rather
         than keeping a second flag of its own that could disagree with the
         pill's door. Its key list is the same arrangement. -->
    <!-- FT-1202: the strip's lantern glows while the guide is up — the open
         fact lives here (hotkeyHelpOpen), so it rides down as a prop. -->
    <Menu
      ref="menu"
      :guide-open="hotkeyHelpOpen"
      @records="statsOpen = true"
      @hotkeys="hotkeyHelpOpen = true"
    ></Menu>
    <!-- FT-880: the key list. The app has had hotkeys since upstream and has
         never told anyone; this is the first surface that does. -->
    <HotkeyHelp v-if="hotkeyHelpOpen" @close="hotkeyHelpOpen = false" />
    <!-- FT-847: ref'd so Intro can auto-load an owned town's saved script
         through the same vault path as a ?script= link. -->
    <EditionModal ref="edition" />
    <!-- FT-854: the role DRAWER + its grimoire tab (host, town on table) -->
    <RoleDrawer />
    <!-- FT-1063 (user, "all controls for the storyteller in one place"):
         THE STORYTELLER'S POST — every storyteller-only control at the
         grimoire's own door, one vertical column: the summons bell above
         the book, the book itself, the day's end below. The bell was
         FT-1051's clock-face control (TownInfo.vue's `.info-call`, born
         FT-880); the phase chip was FT-975's merged readout/button
         (TownInfo.vue's `.info-phase`). Both moved here whole — same click
         handlers, same cooling guard, same is-live gating, same dress —
         only the address changed. TownInfo.vue's own copies stand down,
         v-if="false", per the house never-delete rule; their script logic
         stays there too, now dead, rather than deleted.

         ONE v-if for the whole column (host + town on table) rather than
         three separate ones — the bell and the phase chip were already
         storyteller-only, so nesting them under the tab's own gate adds no
         new restriction, just removes two copies of the same condition. -->
    <div
      class="storyteller-post"
      v-if="!session.isSpectator && players.length"
      :class="{ open: modals.roleDrawer }"
    >
      <!-- FT-880/FT-1051/FT-1063: CALL THE TOWN BACK — icon only (FT-1061),
           `aria-label` standing in for the vanished visible label. No
           confirm and no arm-then-press: nothing to undo, and a summons
           that takes two clicks arrives after the conversation it meant to
           interrupt. -->
      <button
        type="button"
        class="post-bell"
        :class="{ cooling: callBackCooling }"
        :title="
          callBackCooling
            ? 'Just called the town back'
            : 'Call the town back — everyone hears a sound'
        "
        :aria-label="
          callBackCooling
            ? 'Just called the town back'
            : 'Call the town back — everyone hears a sound'
        "
        @click="callTownBack"
      >
        <font-awesome-icon icon="bell" class="post-bell-mark" />
      </button>
      <div
        class="drawer-tab"
        :title="modals.roleDrawer ? 'Close the grimoire' : 'Open the grimoire'"
        @click="$store.commit('toggleModal', 'roleDrawer')"
      >
        <!-- OUR grimoire art (engraver-baked library books), not FA -->
        <img
          class="tab-book"
          :src="modals.roleDrawer ? grimoireOpen : grimoireClosed"
          alt="Grimoire"
        />
      </div>
      <!-- FT-975/FT-1063: the end-phase control. A real <button> —
           "End day 3" / "End night 3" — when the checklist isn't up
           (isPhaseLive); a plain <span>, same plate, when NightSheet's own
           checklist card already carries its own gated "End night" button
           (this steps back rather than doubling that control). Player-
           facing copy retired entirely, not relocated — see TownInfo.vue's
           own stood-down block for that half of the move. -->
      <component
        :is="isPhaseLive ? 'button' : 'span'"
        :type="isPhaseLive ? 'button' : null"
        class="post-phase"
        :class="{ 'is-live': isPhaseLive }"
        :title="
          isPhaseLive
            ? grimoire.isNight
              ? 'End the night'
              : 'End the day'
            : null
        "
        @click="onPhaseClick"
      >
        <font-awesome-icon
          v-if="!grimoire.isNight"
          icon="sun"
          class="post-phase-sun"
        />
        <img v-else class="post-phase-mark" :src="moonMark" alt="" />
        {{ isPhaseLive ? phaseActionLabel : phaseLabel }}
      </component>
    </div>
    <!-- FT-857: the PLAYER's script drawer (right side) — the reference sheet
         and the night order in one, sharing the workbench's ScriptView. It is
         what the strip's script/night icons open now; the two overlays below
         stay mounted but nothing routes to them. -->
    <ScriptDrawer />
    <!-- (FT-858's vote-history drawer stood here until FT-1019: the gallows
         lives in the Chronicles now — the permanent log's nomination rows,
         each unfolding its own voter roster and arc — so VoteDrawer is
         RETIRED BY UNMOUNTING, the same way the chat and chronicle drawers
         went. Its file, VoteHistoryView and the old overlay stay in the
         tree; the live tally list's two host controls rehomed into the
         chronicles' gallows view.) -->
    <!-- (FT-860's night-notes drawer stood here until FT-1037b — "all of
         this should be a toggle for events in the chronicle", user call.
         RETIRED BY UNMOUNTING like the chat and chronicle drawers; its file
         stays in the tree. The whole surface — night history AND the
         FT-1005 live Tonight inputs — lives on as the chronicles' moon
         filter cell, ChroniclesNights.vue.) -->
    <!-- FT-1010: CHRONICLES — the town's whole story: talk, whispers and game
         events in one stream, chaptered per game, with the town records as
         its summary band. Mounted for everyone; what differs by viewer is
         which rows the store let in (chatIngest + canSee), never the
         component. It replaced the ChronicleDrawer that stood here and the
         ChatDrawer Menu mounted on the body — retired by unmounting. -->
    <ChroniclesDrawer />
    <!-- FT-1206: the received-whisper toast — the plane that unfolds into a
         crumpled note when a whisper reaches THIS viewer. App-level, beside
         the drawer it opens onto; fed by the socket's live lane only, so a
         reload never replays a night of toasts. -->
    <WhisperToast />
    <FabledModal />
    <RolesModal />
    <ReferenceModal />
    <NightOrderModal />
    <VoteHistoryModal />
    <GameStateModal />
    <Gradients />
    <!-- The game is The Pandemonium Institute's; their store is one click from
         our front door. It lives HERE, not in Intro — inside the intro's own
         layer the town square painted over it and it took no click. -->
    <a
      class="support-creators"
      v-if="!session.sessionId && !players.length"
      href="https://bloodontheclocktower.com/pages/our-store"
      target="_blank"
      rel="noopener noreferrer"
      title="Blood on the Clocktower is by The Pandemonium Institute — visit their store"
      ><img class="tpi-mark" :src="tpiLogo" alt="" />Support The Pandemonium
      Institute</a
    >
    <!-- Golem fork: the version corner is the SESSION PILL — which room you
         are in, who is with you, the vote-history count, and the door out.
         Nothing renders when there is no session. -->
    <div
      id="session-pill"
      v-if="session.sessionId"
      :class="{ 'drawer-open': rightDrawerOpen }"
    >
      <!-- (broadcast icon retired — user call 2026-08-17) -->
      <span
        class="who"
        :class="{ reconnecting: session.isReconnecting }"
        :title="session.ping ? session.ping + 'ms latency' : ''"
      >
        <!-- FT-1034 (user call): the host's word wears the storyteller's
             purple. -->
        <template v-if="session.isSpectator">Playing in&nbsp;</template>
        <em v-else class="hosting-word">Hosting</em>
        <!-- FT-1105 (user): the TOWN NAME wears the purple for a player;
             the count beside it stands down to plain ink. -->
        <b class="town-word">{{ session.sessionId }}</b>
        <!-- FT-1106 (user): a PLAYER's pill names the seat they are sitting
             in, not how many chairs are full — the count is a storyteller's
             number, and a player already sees the table. The host's pill keeps
             the count, which is the one it was built for. -->
        <span class="player-count" v-if="session.isSpectator && ownName">
          · as {{ ownName }}
        </span>
        <span class="player-count" v-else-if="!session.isSpectator">
          · {{ session.playerCount }}
          {{ session.playerCount === 1 ? "player" : "players" }}
        </span>
      </span>
      <!-- FT-1019: the count opens the CHRONICLES on its gallows view — the
           vote-history drawer it used to raise is retired. -->
      <span
        class="nomlog"
        v-if="session.voteHistory.length"
        @click="openGallows"
        :title="session.voteHistory.length + ' recent nominations'"
      >
        <font-awesome-icon icon="book-dead" /> {{ session.voteHistory.length }}
      </span>
      <!-- TOWN RECORDS is reached from the top strip's own door (Menu.vue),
           and only from there. The pill used to carry a second door to the
           same overlay — retired 2026-08-19 (user: "we can remove that button
           it is redundant now"). The strip's note records why the door moved
           there in the first place, and it is the same reason this one had to
           go rather than the other: the pill hides itself when a drawer is out
           or on a phone in landscape, so a door here is conditionally
           invisible. `statsOpen` stays — the strip's @records still raises
           it. -->
      <!-- FT-850: once the host has dealt characters, the game can END here —
           pick the winner, the record lands on the golem server. Gated on the
           stashed deal moment (upstream's isRolesDistributed is a 2s pulse,
           not a durable flag). -->
      <span
        class="endgame"
        v-if="!session.isSpectator && dealAt && !session.isEnded"
        @click="endGameOpen = true"
        title="End the game and record who won"
      >
        <font-awesome-icon icon="flag-checkered" /> End game
      </span>
      <!-- FT-931: PLAY AGAIN — the same table, a new game. Host-only, and
           only once the town has actually ended (session.isEnded, set by
           EndGameOverlay's own winner pick — see onGameRecorded below and
           the store's endGame/clearEnded, which the grimoire reveal rides
           too). Purple on hover rather than the pill's usual red: this is a
           fresh start, not a warning. -->
      <span
        class="play-again"
        v-if="!session.isSpectator && session.isEnded"
        @click="playAgain"
        title="Clear the roles and start a new game with the same table"
      >
        <font-awesome-icon icon="redo" /> Play again
      </span>
      <!-- FT-847 follow-up: the toolbar's "Copy player link" retired with the
           broadcast-tower tab — it wasn't otherwise covered, so it relocates
           here rather than dropping. -->
      <span
        class="copylink"
        @click="copyPillLink"
        :title="pillCopied ? 'Copied!' : 'Copy the player link'"
      >
        <font-awesome-icon :icon="pillCopied ? 'check' : 'link'" />
      </span>
      <!-- FT-852: two-click arm instead of a native confirm() — browser
           dialogs are silently auto-dismissed in dialog-less contexts
           (driven browser panes, embeds), which made this control read as
           dead. First click arms for 3s, second click leaves. -->
      <!-- the door out wears a DOOR, not an X (user call 2026-08-17) -->
      <span
        class="leave"
        :class="{ armed: leaveArmed }"
        @click="pillLeave"
        :title="leaveArmed ? 'Click again to confirm' : 'Leave this town'"
      >
        <font-awesome-icon icon="door-open" />
        {{ leaveArmed ? "Sure?" : "Leave" }}
      </span>
    </div>
    <!-- FT-880: THE REFUSED PLAYER'S NOTICE.
         A browser will not let a page make a noise until somebody has
         interacted with it, and a tab left untouched through a long day of
         private conversation may hold no interaction credit at all. When a
         call-back is refused, the player gets total silence and no error
         anybody is watching — the storyteller believes the town was called and
         one player is simply never told.
         So the refusal is said OUT LOUD, and it persists: this stays up until
         it is tapped, because the whole problem is that nobody is looking at
         the moment it happens. Tapping it IS the missing gesture, so the fix
         and the explanation are the same action — and it plays the sound then
         and there, so the player hears the thing they were told they could
         not hear. -->
    <!-- `pointerdown`, not `click`, and for a real reason: the same tap is ALSO
         the gesture the module has been waiting for, and its silent unlock
         clears `blocked` the moment that resolves — which can pull this
         element out of the DOM between pointerup and click, swallowing the
         confirming sound. Both handlers run inside the one pointerdown
         dispatch, so binding here makes the confirmation certain instead of a
         race the player would experience as "it just disappeared". -->
    <div
      class="callback-blocked"
      v-if="session.sessionId && callBack.blocked"
      @pointerdown="allowCallBackSound"
      title="Tap to allow the call-back sound"
    >
      <font-awesome-icon icon="bell-slash" />
      <span
        >You won't hear the storyteller call the town back.
        <b>Tap here once.</b></span
      >
    </div>
    <!-- FT-1053: THE END-GAME CEREMONY — mounted for the whole game (its
         armed watch has to SEE the live game to distinguish a real ending
         from a reload of an already-ended town), renders nothing until the
         end broadcast lands. Before EndGameOverlay so the host's own picker
         (z 90) stays above the show it starts. -->
    <EndCeremony v-if="inGame" />
    <!-- FT-850: game recording + town records (see the components). -->
    <EndGameOverlay
      v-if="endGameOpen"
      @close="endGameOpen = false"
      @recorded="onGameRecorded"
    />
    <!-- FT-1146: THE RECORDS PAGE — every town's end-of-game record, on its
         own full-window surface. It is raised by the `records` MODAL now, not
         by `statsOpen` (stood down below), because it is reached from three
         places that cannot see this component's data: the entry screen's own
         door, the Chronicles drawer's boards line, and the strip. Mounted
         outside every session test on purpose — the whole point of the page is
         that it is not a thing you can only reach from inside a game. -->
    <StatsOverlay
      v-if="modals.records"
      :town-id="session.sessionId"
      @close="$store.commit('toggleModal', 'records')"
    />
  </div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { version } from "../package.json";
// FT-993: the centre-face splat's own picker, moved here with the element --
// see the template's own comment on <FaceHands> for why.
import { pickFaceSplat, hashString, seededRandoms } from "./golem/faceSplat";
// FT-1000: moved from TownSquare.vue with the .blood-dial element.
// Golem fork (FT-848): the re-baked dried-blood stains, bundled once for the
// whole dial. (The older per-seat splats in ../assets/blood/splats are now
// the centre-face splat's own art -- see golem/faceSplat.js -- rather than
// unreferenced.)
const stainCtx = require.context("./assets/blood/stains", false, /\.png$/);
const STAINS = stainCtx.keys().sort().map(stainCtx);

// The dial, in the background art's own pixels (see --fpx in App.vue): both
// clocktower backgrounds are trimmed to 1642x900 with the face centred
// EXACTLY at the image centre (recentred FT-anon 2026-08-19 — the originals
// were 1672x941 with the face at (851,450), +15,-20.5 off-centre, which
// .blood-dial .stain used to carry as a baked-in offset). The rose runs out
// to r~250 (see --face-r in App.vue for the measured rim radius).
//
// Stains ride the OUTER band of the face: the hub carries the town readout
// (script name, alive/dead counts), so blood is kept off it and the wedges
// still read as belonging to their seats.
const STAIN_RADIUS = 185;
// stain size = SPAN / sqrt(seats): the face's area split n ways, so a 5-seat
// town gets big stains and a 20-seat town small ones, and either town ends up
// properly drenched once everyone is dead. Capped so a small town's stains
// stay on the face instead of washing over the stonework.
const STAIN_SPAN = 470;
const STAIN_MAX = 172;

/**
 * A SHUFFLE BAG of stain indices: every stain in the folder is dealt before
 * any of them repeats (user call 2026-08-18 — repeats were showing on the
 * dial). The bag is built from STAINS.length, never from a written-down
 * count, so dropping art into src/assets/blood/stains/ grows it with no code
 * change — FT-1145 tripled the set from 16 to 48 and nothing here moved.
 *
 * Hashing a seat straight into the set, the way its size and lie are hashed,
 * collides long before the set runs out: seven deaths drawing from 16 stains
 * repeat more often than not. A permutation cannot. (At 48 the bag is now
 * larger than any legal town, so a seat's stain is unique outright.)
 *
 * Deterministic on purpose, like everything else about a stain: the order is
 * dealt from the town's OWN id, so every client derives the same bag from
 * already-synced state and nothing new goes over the wire. Two towns stain
 * differently; the same town stains identically in every browser watching it.
 *
 * Indexed by SEAT rather than by order of death, which matters: a seat's mark
 * is then fixed for the whole game, instead of changing texture under the
 * player's eyes when somebody else dies.
 */
const stainOrder = (seed) => {
  const bag = STAINS.map((_, i) => i);
  const next = seededRandoms(seed);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const swap = bag[i];
    bag[i] = bag[j];
    bag[j] = swap;
  }
  return bag;
};

import TownSquare from "./components/TownSquare";
import TownInfo from "./components/TownInfo";
import HostTools from "./components/HostTools";
import Menu from "./components/Menu";
import RolesModal from "./components/modals/RolesModal";
import EditionModal from "./components/modals/EditionModal";
import RoleDrawer from "./components/RoleDrawer";
// THE shared role card — App raises it for the ARMED character on a touch
// screen, where no hover can raise it from a tile.
import RoleHoverCard from "./components/RoleHoverCard";
// FT-857: the player-facing script drawer (reference sheet + night order in
// one), sharing the workbench's ScriptView.
import ScriptDrawer from "./components/ScriptDrawer";
// (FT-858's VoteDrawer import left with its mount — FT-1019; file stays.)
// FT-860: the storyteller's night checklist. (The player's own night notes
// drawer retired by unmounting — FT-1037b folded it into the chronicles.)
import NightSheet from "./components/NightSheet";
// FT-1010: CHRONICLES — the town's whole story as one surface (chat + game
// events + records merged; user decision 2026-08-20). It replaced the
// ChronicleDrawer mounted here and the ChatDrawer Menu used to stand on the
// body — both RETIRED BY UNMOUNTING; their files stay in the tree.
import ChroniclesDrawer from "./components/ChroniclesDrawer";
// FT-1206: the received-whisper toast (the plane unfolding into the note).
import WhisperToast from "./components/WhisperToast";
// FT-1010: the game-end event the winner pick writes into the town's log.
// FT-1037/FT-1057: plus the two BOARD PORTRAITS posted beside it — the
// opening ring (stashed by socket.js at the deal; broadcasting it live would
// leak the grimoire) and the final ring, read from the seats as they stand.
import { encodeEvent, takeOpeningBoard, boardRingOf } from "./golem/chronicles";
// FT-1101: the night log as chronicle lines — the storyteller's own entries,
// grouped one block per night, published into the town's log when the game
// ends (see onGameRecorded).
import { nightBlocksOf, nightBlockText } from "./golem/nightLog";
// FT-888: the face-disc lab — TEMPORARY, and it comes out with src/faceDisc.scss's
// four `--fd-*-adj` reads and src/golem/faceDisc.js.
import FaceDiscLab from "./components/FaceDiscLab";
// FT-973: the moving hands on the town's blank dial, and the lab that tunes
// them. The layer ships; the lab is behind `devLabs` with the rest of the
// column. See src/golem/faceHands.js for what drives the hands.
import FaceHands from "./components/FaceHands";
import FaceHandsLab from "./components/FaceHandsLab";
// FT-991: the ghost lab — TEMPORARY, and it comes out with Player.vue's
// `html.gg-glass` block and src/golem/ghostGlass.js.
import GhostLab from "./components/GhostLab";
// FT-1004: the veil lab — TEMPORARY, and it comes out with Player.vue's
// `html.vl-*` hooks and src/golem/veilGlass.js.
import VeilLab from "./components/VeilLab";
// FT-1049: the numeral-glow lab — TEMPORARY, and it comes out with
// FaceHands.vue's `var(--ng-*)` reads and src/golem/numeralGlow.js.
import NumeralGlowLab from "./components/NumeralGlowLab";
// FT-1071: the stats-plate lab — TEMPORARY, and it comes out with
// TownInfo.vue's `var(--sp-*)` reads and src/golem/statsPlate.js.
import StatsPlateLab from "./components/StatsPlateLab";
// FT-1015: the baked veil refracts, so its displacement filter mounts at boot
import { bootVeilGlass } from "./golem/veilGlass";
import {
  dripKnobs,
  saveDripKnobs,
  resetDripKnobs,
} from "./golem/bloodScrollbar";
import grimoireClosed from "./assets/grimoire-cover.png";
import grimoireOpen from "./assets/grimoire-open.png";
// FT-1063: the phase chip's own sun/moon marks — TownInfo.vue's imports,
// duplicated here rather than re-exported, since the chip itself moved into
// this file's own storyteller-post column (see .storyteller-post below).
// Same filenames TownInfo.vue reads, so whatever art lands there shows up
// here too without a second import to keep in sync.
import moonFirst from "./assets/moon-first.png";
import moonOther from "./assets/moon-other.png";
// The Pandemonium Institute's own mark, worn by the footer credit that links
// to their store — their game, their branding, unaltered.
import tpiLogo from "./assets/tpi-logo.png";
import { COINS, coinChoice, applyCoin } from "./golem/coinArt";
// FT-949: the drop-outside-to-unseat target, installed once here so it works
// for the whole session — see the module for why it moved out of RoleTray.
import { installRoleUnseat } from "./golem/roleUnseat";
// FT-1168: this browser's own settings. Only one of the three is painted from
// this file — grimoire size, which scales the storyteller's post below — but
// the root class binding is where it has to land, so the snapshot lives here.
import { PREFS_EVENT, prefsState } from "./golem/prefs";
const coinThumbs = require.context("./assets/coins", false, /.png$/);
import Intro from "./components/Intro";
import ReferenceModal from "./components/modals/ReferenceModal";
import Vote from "./components/Vote";
import Gradients from "./components/Gradients";
import NightOrderModal from "./components/modals/NightOrderModal";
import FabledModal from "@/components/modals/FabledModal";
import VoteHistoryModal from "@/components/modals/VoteHistoryModal";
import GameStateModal from "@/components/modals/GameStateModal";
import EndGameOverlay from "./components/EndGameOverlay";
// FT-1053: the end-game ceremony — the component owns the trigger and the
// dressing; the observable is what the root class binding above reads.
import EndCeremony from "./components/EndCeremony";
import { ceremonyState } from "./golem/endCeremony";
import StatsOverlay from "./components/StatsOverlay";
import NumberScrub from "./components/NumberScrub";
// FT-880: the key list — the first surface in the app that says the hotkeys
// exist. Its contents come from golem/hotkeys, the same table keyup reads.
import HotkeyHelp from "./components/HotkeyHelp";
// FT-1032: clearDealt joins the pair — the deal stash must die with the game
// (End game / Play again), or a re-entered town greets its host as "running"
// forever. EndGameOverlay's own clear only runs when the record POST lands.
import { markDealt, dealTimeFor, clearDealt } from "./golem/stats";
// FT-1059: clearPhaseStart joins Play again's day-counter reset — the phase
// clock's own wall-clock stamp is the OTHER piece of session state that
// outlives the game it was timing (see towerBells.js's header on the fix).
import { clearPhaseStart } from "./golem/towerBells";
// FT-880: the town summons. App owns only the two ends a player sees — the
// gesture that buys autoplay credit, and the notice when it was not enough.
import {
  armCallBackAudio,
  callBackState,
  enableCallBackSound,
  // FT-1063: the bell itself moved here from TownInfo.vue, into the
  // storyteller-post column beside the grimoire tab — same click, same
  // cooling guard, same sound.
  playCallBack,
  CALL_BACK_COOLDOWN,
} from "./golem/callBack";
// the FONT LAB: per-element lettering choices (title, on-the, the dial's
// two words, the drop-caps)
import {
  fontState,
  glyphFrom,
  glyphStyleFrom,
  cycleField,
  labelFor,
} from "./golem/titleFonts";
// the ENGRAVER LAB (Ik): the icon stylizer's dials, dragged live against
// official reference icons (the library chunk loads on first open)
import {
  engraver,
  ENGRAVER_DIALS,
  saveEngraver,
  resetEngraver,
} from "./golem/iconStyle";
import ikRefGood from "./assets/icons/ravenkeeper.png";
import ikRefEvil from "./assets/icons/imp.png";

export default {
  components: {
    NumberScrub,
    RoleHoverCard,
    EndCeremony,
    EndGameOverlay,
    StatsOverlay,
    HotkeyHelp,
    GameStateModal,
    VoteHistoryModal,
    FabledModal,
    NightOrderModal,
    Vote,
    ReferenceModal,
    Intro,
    TownInfo,
    HostTools,
    TownSquare,
    Menu,
    EditionModal,
    RolesModal,
    RoleDrawer,
    ScriptDrawer,
    NightSheet,
    ChroniclesDrawer,
    WhisperToast,
    FaceDiscLab,
    FaceHands,
    FaceHandsLab,
    GhostLab,
    VeilLab,
    NumeralGlowLab,
    StatsPlateLab,
    Gradients,
  },
  computed: {
    ...mapState(["grimoire", "session", "modals", "scriptDrawerView", "night"]),
    ...mapState("players", ["players"]),
    ...mapGetters("night", ["isFirstNight"]),
    /**
     * FT-1063: the end-phase control's own logic, moved here from
     * TownInfo.vue (isPhaseLive/phaseActionLabel/phaseLabel/moonMark) along
     * with its markup — the clock face's below-the-VI slot is empty for
     * every seat now (TownInfo.vue's own copy stands down, v-if="false",
     * per the house never-delete rule). Same four computed properties,
     * same reads, no rule changed — only where it renders.
     */
    isPhaseLive() {
      return (
        !this.session.isSpectator &&
        !(this.night.mode !== "off" && this.grimoire.isNight)
      );
    },
    phaseActionLabel() {
      return (
        (this.grimoire.isNight ? "End night " : "End day ") +
        Math.max(this.night.day, 1)
      );
    },
    phaseLabel() {
      return (
        (this.grimoire.isNight ? "Night " : "Day ") +
        Math.max(this.night.day, 1)
      );
    },
    moonMark() {
      return this.isFirstNight ? moonFirst : moonOther;
    },
    /**
     * FT-1106: the name on the chair THIS client is sitting in, or "" when it
     * holds none yet. Matched on the seat's own `id` against `playerId` — the
     * same identity Player.vue's `you` class uses, rather than the optimistic
     * local `claimedSeat` the storyteller has not confirmed.
     */
    ownName() {
      const id = this.session.playerId;
      if (!id) return "";
      const seat = this.players.find((p) => p.id && p.id === id);
      return (seat && seat.name) || "";
    },
    // in a session (or with a town on the table): the dial letters leave
    // and the handless clock art takes the wall (user call 2026-08-18)
    inGame() {
      return !!this.session.sessionId || this.players.length > 0;
    },
    /**
     * Golem fork (FT-848): one stain per dead seat, laid on that seat's wedge
     * of the clock face.
     *
     * A seat's angle is the ONLY thing that places its stain: seat i sits at
     * (i+1) * 360/n clockwise from 12 o'clock, which is exactly the angle the
     * on-circle mixin rotates that seat's spoke to. Both read the same
     * players.length, so the stain stays under its seat at any town size and
     * follows the ring when seats are added, removed, moved or swapped.
     *
     * Everything else about a stain — which of the 48 it is, how big, how far
     * out, how it lies — is hashed from seat + name, so every client paints
     * the same dial from the already-synced death state with no extra sync.
     * Stains accumulate: five deaths put five separate marks on the face.
     */
    deadStains() {
      const count = this.players.length;
      if (!count) return [];
      // dealt per town, so two towns do not stain alike
      const bag = stainOrder(this.session.sessionId || "golem");
      const stains = [];
      this.players.forEach((player, i) => {
        if (!player.isDead) return;
        const angle = ((i + 1) * 360) / count;
        const key = i + "·" + player.name;
        const h = hashString(key);
        const base = Math.min(STAIN_MAX, STAIN_SPAN / Math.sqrt(count));
        const size = base * (0.88 + ((h >> 4) % 28) / 100);
        const radius = STAIN_RADIUS + (((h >> 12) % 29) - 14);
        const spin = ((h >> 18) % 51) - 25;
        stains.push({
          key,
          style: {
            backgroundImage: `url(${STAINS[bag[i % STAINS.length]]})`,
            width: `calc(${size.toFixed(1)} * var(--fpx))`,
            height: `calc(${size.toFixed(1)} * var(--fpx))`,
            // centre on the dial, swing out along the seat's own angle, then
            // let the splatter lie a little off-square
            transform:
              `translate(-50%, -50%) rotate(${angle.toFixed(2)}deg)` +
              ` translateY(calc(${(-radius).toFixed(1)} * var(--fpx)))` +
              ` rotate(${spin}deg)`,
          },
        });
      });
      return stains;
    },
    /**
     * FT-993: the centre-face splat, relocated from TownSquare.vue -- see
     * this file's own template comment on <FaceHands> for the stacking
     * reason. Reads the FROZEN seed only (grimoire.faceSplatSeed), the same
     * check TownInfo.vue already ships with -- TownSquare.vue's own retired
     * copy additionally gated on `townLive` (some seat holding a role), which
     * is redundant here: the seed is never set except by the freeze in
     * TownSquare's created(), which itself only fires once a role has gone
     * out. One condition, not two, for the same result.
     */
    faceSplat() {
      if (!this.grimoire.faceSplatSeed) return null;
      return pickFaceSplat(this.grimoire.faceSplatSeed);
    },
    /** Same recipe TownSquare.vue's retired copy used: a square box sized in
     *  face-pixels, centred and spun on itself. See golem/faceSplat.js for
     *  what `spin` and `boxPx` are. */
    faceSplatStyle() {
      if (!this.faceSplat) return null;
      const { url, boxPx, spin } = this.faceSplat;
      return {
        backgroundImage: `url(${url})`,
        width: `calc(${boxPx} * var(--fpx))`,
        height: `calc(${boxPx} * var(--fpx))`,
        transform: `translate(-50%, -50%) rotate(${spin}deg)`,
      };
    },
    // FT-858: ANY right-hand drawer being open is what the session pill
    // dodges — it follows `--sd-width`, which whichever drawer is showing
    // publishes. Adding a third drawer means adding it here, nowhere else.
    rightDrawerOpen() {
      return (
        this.modals.scriptDrawer ||
        this.modals.voteDrawer ||
        // (nightDrawer left this list with FT-1037b — the flag stays in the
        // store, unrouted, the same way the chronicle drawer's did.)
        // FT-1010: chronicles took the chronicle drawer's place on the rail
        // (the old flag stays in the store, unrouted). Listing it here is
        // also what finally lets the pill step aside for the composer — the
        // dodge ChatDrawer could never have because its lane was barred from
        // this file (see its old pill-reserve note).
        this.modals.chroniclesDrawer
      );
    },
    /**
     * ANY drawer at all, the grimoire on the left included. On a phone all
     * four are the same object — a sheet on the bottom edge — so the layout
     * around them answers to one flag rather than to a side.
     *
     * Only one can ever be true: the store's `toggleModal` closes every other
     * modal when one opens.
     */
    anyDrawerOpen() {
      return !!(this.modals.roleDrawer || this.rightDrawerOpen);
    },
    /**
     * FT-860: the night sheet stands once the town is built and the build
     * panel steps aside — and ONLY for the storyteller. A nomination takes the
     * centre back (Vote owns it), and a town with no seats has no night.
     */
    showNightSheet() {
      if (this.session.isSpectator) return false;
      if (this.session.nomination) return false;
      // FT-931: THE PHASE CONTROLS GO once the town has ended — there is no
      // next day. This is the checklist's own standing sheet, so hiding it
      // here also takes showNightChecklist (below) with it; the E hotkey's
      // own fallback path is guarded separately, in keyup.
      if (this.session.isEnded) return false;
      if (!this.players.length) return false;
      return !this.showHostTools;
    },
    /**
     * The sheet with its CHECKLIST out — the same condition NightSheet's own
     * `has-list` uses, hoisted to the root so the square can step aside for
     * it on a phone. Kept in step with NightSheet.showList by construction:
     * both read night.mode and grimoire.isNight, and the component only
     * exists when showNightSheet is true.
     */
    /** The tap-to-place selection — the character the next seat tap casts. */
    armedRole() {
      return this.$store.state.drawerPick;
    },
    showNightChecklist() {
      return (
        this.showNightSheet &&
        this.night.mode !== "off" &&
        this.grimoire.isNight
      );
    },
    /**
     * FT-912: A FACE DISC IS STANDING ON THE CLOCK FACE.
     *
     * One flag, published as `#app.face-disc-open`, and the thing that reads it
     * is the town readout: TownInfo fades out while a disc is over it. That is
     * what let the disc's material stop being frost — the plate was spending
     * blur and a 78%-opaque wash to hide a readout that did not have to be
     * there at all (src/faceDisc.scss, fourth pass).
     *
     * IT IS BUILT FROM SIGNALS THAT ALREADY EXIST rather than from new state:
     * both terms are computeds this component already had. What is new is the
     * NAME — "a disc is standing" is the condition the material depends on, and
     * `checklist-up` (the phone-layout twin of the first term, just above) is
     * not it: that class is about the square giving a docked sheet room, and
     * tying a legibility guarantee to a layout flag would mean a later change
     * to the phone layout silently changing the glass.
     *
     * WHY THERE IS NO TERM FOR THE ENTRY PANELS, though they are two of the
     * four disc surfaces. They cannot coexist with the readout: App's centre
     * slot is one v-if chain, so `<Intro>` winning it means `<TownInfo>` does
     * not render at all. Same for the build panel, whose term IS here — kept
     * because the flag should mean what its name says whatever renders under
     * it, not because anything leaks there today. Checked in the DOM rather
     * than deduced: claude_temp_test/2026-08-19-glassclear-under.mjs lists
     * every element painted behind each of the four discs, and `ul.info`
     * appears under the checklist alone.
     *
     * IT IS NOT GATED ON THE DISC'S MEDIA QUERY, and must not be: below that
     * gate these menus are rectangles that do not cover the hub, and standing
     * the readout down there would hide it for nothing. The gate belongs to the
     * rule that reads this flag (TownInfo wraps it in `face-disc-gate`), so the
     * flag stays a plain statement about what is showing.
     */
    faceDiscOpen() {
      return this.showNightChecklist || this.showHostTools;
    },
    /** The town has chairs and every one of them holds a character. */
    townCast() {
      return (
        this.players.length > 0 &&
        this.players.every((p) => p.role && p.role.id)
      );
    },
    /** NO chair holds a character — the town has been emptied out. Stricter
     *  than `!townCast` on purpose; see `building` below for why the two
     *  conditions are not the same question. */
    townUncast() {
      return !this.players.some((p) => p.role && p.role.id);
    },
    // Golem fork: the building phase = hosting live, characters not yet dealt.
    // The deal moment is the DURABLE `dealAt` stash, not session
    // .isRolesDistributed — upstream sets that flag for two seconds and then
    // clears it, so gating on it brought the build panel back mid-game a
    // couple of seconds after Start (user report 2026-08-18).
    //
    // THE PANEL IS DISMISSED BY AN EVENT, NOT BY A CONDITION (2026-08-19, user
    // report: "deal shouldn't auto start the game wtf"). This used to return
    // `!dealAt || !townCast` — a live expression — and DEAL casts every open
    // chair, so in a town carrying a `dealAt` from an earlier game the panel
    // vanished the instant Deal ran. Nothing had started; the builder simply
    // stopped rendering, which reads as the game beginning. Filling seats from
    // inside the panel is not the same event as starting the game, so the
    // answer is a latch (`building`, maintained just below) rather than a
    // sharper condition: Start closes it, and nothing a build control does can.
    showHostTools() {
      if (!this.session.sessionId || this.session.isSpectator) return false;
      if (this.session.isRolesDistributed) return false;
      return this.building;
    },
  },
  // Golem fork: THE BOOT GATE — the ordering the user asked for, literally:
  // background first, fonts second, content third. The UI stays hidden (dark
  // ground only) until the background art AND the display fonts are ready,
  // then fades in whole. A 4s cap means a slow network degrades to the old
  // progressive load rather than an indefinite blank.
  // FT-850: hosting or joining a (different) session re-reads that session's
  // stashed deal moment and drops any overlay left open from the last one.
  watch: {
    /**
     * Arming a character raises its card; disarming puts it away.
     *
     * The anchor is looked up rather than passed because the tile lives in
     * whichever surface did the arming — the build panel's tray or the
     * grimoire drawer — and both already mark it `.picked`. A tile that is
     * not on screen (the drawer closed behind a pick) simply yields no
     * anchor, and the card stays down rather than pointing at nothing.
     */
    armedRole: {
      handler(role) {
        this.armedAnchor = null;
        if (!role) return;
        if (window.matchMedia("(hover: hover)").matches) return;
        // Turned on its side there is nowhere to place into — see the card's
        // `pinned` prop. Read once, here, because a rotation drops the card
        // anyway (the card asks to be dismissed on resize).
        this.armedPinned = window.matchMedia(
          "(orientation: landscape) and (max-height: 500px)",
        ).matches;
        this.$nextTick(() => {
          if (this.$store.state.drawerPick !== role) return;
          this.armedAnchor = document.querySelector(
            ".rt-icon.picked, .rd-token.picked",
          );
        });
      },
    },
    /**
     * THE ONE LIVE WAY BACK INTO THE BUILDER, and it is deliberately the
     * STRICT condition rather than the entry one.
     *
     * Entry asks "is every chair cast?" — a half-built town is being built.
     * Once the panel is down, that question is the wrong one: a storyteller
     * clearing ONE seat's character mid-game would answer it, and the builder
     * would land back on top of a live town. "No chair holds a character at
     * all" cannot be reached by editing a game in progress — only by emptying
     * the town (scrub the seats to zero and back, or clear the roster), which
     * IS the host saying they are starting over.
     *
     * Deal cannot trip it either, and not only because it ends with the chairs
     * full: its re-deal path clears every seat first, and that clear and the
     * fresh deal happen in one tick, so this computed is only ever read after
     * both (Vue batches watcher callbacks to nextTick).
     */
    townUncast(uncast) {
      if (uncast) {
        this.building = true;
        // FT-1032: emptying the town is the host's own act, mid-session —
        // they are starting over and get the BUILD face, whatever the deal
        // stash still says. (This cannot misfire on the re-entry path: there
        // the roster is empty from the first tick, so townUncast never
        // CHANGES and this watcher never runs.)
        this.reentry = false;
      }
    },
    "session.sessionId"(sessionId) {
      this.dealAt = dealTimeFor(sessionId);
      // A DIFFERENT TOWN IS A FRESH JUDGEMENT. `dealAt` has just been re-read
      // for this session, so the same test `created` runs applies again.
      this.building = !this.dealAt || !this.townCast;
      // FT-1032: same re-entry judgement `created` makes, for the SPA entry
      // paths (the entry screen's shelf, a Forward hop) — see created().
      this.reentry =
        this.building && !!this.dealAt && !this.$store.state.session.isEnded;
      this.endGameOpen = false;
      this.statsOpen = false;
      this.hotkeyHelpOpen = false;
      clearTimeout(this.leaveTimer);
      this.leaveArmed = false;
    },
  },
  /**
   * IS THIS TOWN BEING BUILT? Asked ONCE, here, on the state the app boots
   * with — persistence has already restored the session, the roster and the
   * roles by the time a root component is created, which is the same
   * assumption `data`'s own `dealAt` line makes.
   *
   * The test is the one this fork has always used, unchanged: a town that
   * remembers no deal is being built, and so is a town whose chairs are not
   * all cast, whatever it remembers (a re-hosted town used to show the live
   * square with nobody in it and no way back to setup — FT-913's report).
   * What changed in 2026-08-19 is only WHEN it is asked. As a live expression
   * it also answered "the host just pressed Deal", and dismissed the builder
   * for it.
   */
  created() {
    this.building = !this.dealAt || !this.townCast;
    // FT-1032: a boot that raises the panel OVER a running game (the deal
    // stash survived the reload; the roster mirror did not) is a re-entry,
    // not a build — the panel wears its greeting face. An ENDED town is not
    // running: its restore (persistence's gameEnded stash) keeps the build
    // face, exactly as before.
    this.reentry =
      this.building && !!this.dealAt && !this.$store.state.session.isEnded;
  },
  mounted() {
    // the face lab's persisted dials, published to <html> — see applyBgOff
    this.applyBgOff();
    // FT-1015: the shipped veil is bent glass — mount its filter for everyone
    // (Chromium-gated inside; elsewhere the veil ships its plain blur)
    bootVeilGlass();
    // FT-880: start watching for the first gesture, so the call-back's audio
    // element has earned its autoplay credit long before there is a summons to
    // play. Costs nothing until something is clicked; see golem/callBack.js.
    armCallBackAudio();
    // FT-949: the seat-unassign drop target — for the whole session, not just
    // while the build panel is up. See golem/roleUnseat.js.
    installRoleUnseat(this.$store);
    // FT-1168: follow this browser's own settings (grimoire size is the one
    // this file paints). The corner cog writes; everyone re-reads on the
    // event — the same one-way shape the tower's own surfaces run on.
    window.addEventListener(PREFS_EVENT, this.readPrefs);
    // (The legacy webkit blood scrollbar — the --sb-trail writer and its
    // droplet spawner — was KILLED 2026-08-17 by user order. The only blood
    // scrollbar is the v-blood-scroll overlay directive.)
    // FT-850: the DEAL MOMENT — the host committing session/distributeRoles
    // with a truthy payload is the instant the characters go out. Stash it
    // (the recorded game's startedAt) and mirror it reactively so the pill
    // grows its End-game door; localStorage alone wouldn't re-render.
    this.$store.subscribe(({ type, payload }) => {
      if (
        type === "session/distributeRoles" &&
        payload &&
        !this.session.isSpectator
      ) {
        markDealt(this.session.sessionId);
        this.dealAt = dealTimeFor(this.session.sessionId);
        // ...and THE ONE THING THAT CLOSES THE BUILDER. Start is the event;
        // see `showHostTools`. It stays closed when upstream clears
        // isRolesDistributed two seconds later, because this flag is what the
        // panel reads now and nothing re-opens it on its own.
        this.building = false;
        // FT-1032: a fresh deal is a fresh game — no greeting face pending.
        this.reentry = false;
      }
    });
    const bg = new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = require("./assets/background-clocktower-centered.png");
    });
    const fonts = Promise.all([
      document.fonts.load("1em PiratesBay"),
      document.fonts.load("1em Bloody"),
      document.fonts.ready,
    ]).catch(() => {});
    const cap = new Promise((resolve) => setTimeout(resolve, 4000));
    Promise.race([Promise.all([bg, fonts]), cap]).then(() => {
      this.booted = true;
    });
  },
  // FT-1063: the bell's cooling timer (callTownBack below) outlives a
  // component instance only if nothing clears it — same teardown
  // TownInfo.vue's own retired copy carried.
  beforeDestroy() {
    clearTimeout(this.callBackTimer);
    window.removeEventListener(PREFS_EVENT, this.readPrefs);
  },
  data() {
    return {
      booted: false,
      version,
      pillCopied: false,
      // the tile the armed character's card is pinned to (null = no card)
      armedAnchor: null,
      armedPinned: false,
      // FT-850: game recording + stats state. dealAt mirrors the stashed
      // deal moment for the current session (null = no game underway) — a
      // reload mid-game re-reads it here (persistence has already restored
      // the session by the time the root component's data runs).
      endGameOpen: false,
      // FT-1146: `statsOpen` STOOD DOWN, not removed. It raised the old
      // town-records overlay; that overlay is the Records page now and it is
      // raised by the `records` modal instead (see the template), so this flag
      // no longer reaches anything. Menu's `@records` emit — which has been
      // unfired since FT-1010 moved the strip's quill to Chronicles — still
      // writes it, harmlessly.
      statsOpen: false,
      // FT-1053: the ceremony's observable — held in data so the root class
      // binding above re-renders on its phase walks. The module owns it.
      ceremony: ceremonyState,
      // FT-1168: this browser's own settings, mirrored here for the same
      // reason `ceremony` is — the root class binding has to re-render when
      // one changes. golem/prefs owns the stash; the corner cog is the only
      // writer; readPrefs (mounted) keeps this copy honest.
      prefs: { ...prefsState },
      // FT-880: the key list's own flag (the strip's question mark opens it)
      hotkeyHelpOpen: false,
      dealAt: dealTimeFor(this.$store.state.session.sessionId),
      // THE BUILD LATCH — is the build panel the thing in the middle of the
      // town? Decided once on entry (`created`, and again on a session
      // change), closed by Start, and re-opened only by the town being
      // emptied out. It is data rather than a computed precisely so that
      // casting chairs — which is what the panel is FOR — cannot dismiss it.
      // Real value assigned in `created`; `false` here only so the flag
      // exists before the guard in `showHostTools` can read it.
      building: false,
      // FT-1032: WHICH FACE the build panel wears. True only when an ENTRY
      // moment (boot, or hopping into a town from the entry screen) finds the
      // durable deal stash saying a game is running while the local roster
      // does not hold it — the host is walking back into a live game, and the
      // panel should greet them with the day, not the setup. Mid-session
      // paths that raise `building` (emptying the town, Play again) are the
      // host STARTING OVER and set this false: they get the build face.
      reentry: false,
      // FT-852: the pill Leave's two-click arm.
      leaveArmed: false,
      leaveTimer: null,
      // FT-880: the audio module's live flag. Vue 2 makes an object reactive
      // by walking it when it lands in data(), which is how the module stays a
      // plain module and the notice above still repaints — the same trick
      // fontState (below) uses.
      callBack: callBackState,
      // FT-1063: the bell's own nervous-double-press guard, moved here with
      // its button — about this one control's feel, not town state (see
      // callTownBack below; TownInfo.vue's own copy is now dead, its block
      // stood down).
      callBackCooling: false,
      callBackTimer: null,
      // the app-wide PNG-font state + the font lab panel
      fontState,
      fontDebugOpen: false,
      // dev labs visibility. FT-1007 (user: "how do I turn the dev labs
      // on?"): it was a hardcoded false — flipping it meant editing source,
      // which shut the user out of their own labs on the live site. Now a
      // doorway: `?labs=1` in the URL turns the column on (`?labs=0` off),
      // and the choice persists per browser so the param is needed once.
      devLabs: (() => {
        const q = new URLSearchParams(window.location.search).get("labs");
        if (q !== null)
          localStorage.setItem("golem.devLabs", q === "1" ? "true" : "false");
        return localStorage.getItem("golem.devLabs") === "true";
      })(),
      // FT-881 follow-up: the face-lab scrubs, persisted so a dialled value
      // survives the reload it takes to look at it again.
      // Storage keys carry a "2" since the +7px was BAKED: a browser holding the
      // old bgOffX=7 would otherwise add it twice and land on 14.
      faceLabOpen: false,
      bgOffX: Number(localStorage.getItem("golem.bgOffX2") || 0),
      bgOffY: Number(localStorage.getItem("golem.bgOffY2") || 0),
      bgH: Number(localStorage.getItem("golem.bgOffH2") || 0),
      grimoireClosed,
      grimoireOpen,
      tpiLogo,
      coinLabOpen: false,
      coinOptions: COINS,
      coinPick: coinChoice,
      // the drip lab
      drOpen: false,
      dripRef: dripKnobs,
      drDials: [
        { key: "w", label: "Bulb width", min: 8, max: 34, step: 1 },
        { key: "h", label: "Bulb height", min: 20, max: 130, step: 2 },
        { key: "trailW", label: "Trail width", min: 2, max: 16, step: 1 },
        { key: "overlap", label: "Overlap", min: 0, max: 48, step: 2 },
        { key: "dx", label: "X offset", min: -20, max: 20, step: 1 },
        { key: "dy", label: "Y offset", min: -30, max: 30, step: 1 },
        { key: "bx", label: "Bulb X", min: -12, max: 12, step: 1 },
      ],
      // the engraver lab
      engraverRef: engraver,
      ikDials: ENGRAVER_DIALS,
      ikOpen: false,
      ikSeed: 0,
      ikPreviews: [],
      // Blood + On-the rows retired 2026-08-18 (settled on Red 970000)
      fdRows: [
        { field: "clockKey", label: "Clock" },
        { field: "towerKey", label: "Tower" },
        { field: "capKey", label: "Hotkey letters" },
      ],
      dialLetters: [
        { cls: "dl-c1", letter: "C", word: "clock" },
        { cls: "dl-l", letter: "L", word: "clock" },
        { cls: "dl-o1", letter: "O", word: "clock" },
        { cls: "dl-c2", letter: "C", word: "clock" },
        { cls: "dl-k", letter: "K", word: "clock" },
        { cls: "dl-t", letter: "T", word: "tower" },
        { cls: "dl-o2", letter: "O", word: "tower" },
        { cls: "dl-w", letter: "W", word: "tower" },
        { cls: "dl-e", letter: "E", word: "tower" },
        { cls: "dl-r", letter: "R", word: "tower" },
      ],
    };
  },
  methods: {
    /** FT-1168: a personal setting changed (the corner cog is the only
     *  writer) — re-read the snapshot the root class binding renders. */
    readPrefs() {
      this.prefs = { ...prefsState };
    },
    /** Face lab: shift the background PAINT and remember it. */
    setBgOff(axis, px) {
      // H ranges wider than the two nudges: X/Y move the paint a few pixels,
      // H changes how far the art overshoots the window.
      const lo = axis === "h" ? -200 : -40;
      const hi = axis === "h" ? 400 : 40;
      const v = Math.max(lo, Math.min(hi, Number(px) || 0));
      if (axis === "x") this.bgOffX = v;
      else if (axis === "y") this.bgOffY = v;
      else this.bgH = v;
      this.applyBgOff();
      try {
        localStorage.setItem(
          "golem.bgOff" + axis.toUpperCase() + "2",
          String(v),
        );
      } catch (e) {
        // storage off: the dial still works for this session
      }
    },
    /**
     * The dials live on <html>, not on #app.
     *
     * The background outside a game is painted by the `html, body` rule, and a
     * custom property set on #app cannot reach it — variables inherit DOWN.
     * Published here they reach both that rule and #app.in-game's own plate,
     * which is the whole point: one set of dials, both backgrounds.
     */
    applyBgOff() {
      const r = document.documentElement.style;
      r.setProperty("--bg-off-x", this.bgOffX + "px");
      r.setProperty("--bg-off-y", this.bgOffY + "px");
      r.setProperty("--bg-h", this.bgH + "px");
    },
    /** the coin lab: swap every seat's coin art, and remember it */
    pickCoin(id) {
      applyCoin(id);
    },
    coinThumb(id) {
      return coinThumbs("./" + id + ".png");
    },
    // FT-852: arm on the first click, leave on the second — no native
    // confirm() anywhere in the pill (see the template note).
    // ── the drip lab ────────────────────────────────────────────────────
    saveDrip() {
      saveDripKnobs();
    },
    resetDrip() {
      resetDripKnobs();
    },
    // ── the engraver lab ────────────────────────────────────────────────
    async toggleIkLab() {
      this.ikOpen = !this.ikOpen;
      if (this.ikOpen) this.ikBake();
    },
    async ikBake() {
      const lib = await import("./golem/iconLibrary");
      const list = await lib.loadIcons();
      const pairs = [
        { key: "raven / good", n: "raven", team: "townsfolk", ref: ikRefGood },
        { key: "imp / evil", n: "imp-laugh", team: "demon", ref: ikRefEvil },
      ];
      const done = [];
      for (const p of pairs) {
        const entry = lib.findIcon(list, p.n);
        if (!entry) continue;
        done.push({
          key: p.key,
          official: p.ref,
          ours: await lib.bakeIcon(entry, p.team, {
            seed: this.ikSeed,
            size: 128,
          }),
        });
      }
      this.ikPreviews = done;
    },
    onIkDial() {
      saveEngraver();
      clearTimeout(this.__ikTimer);
      this.__ikTimer = setTimeout(() => this.ikBake(), 250);
    },
    ikReroll() {
      this.ikSeed = 1 + Math.floor(Math.random() * 1e6);
      this.ikBake();
    },
    ikReset() {
      resetEngraver();
      this.ikBake();
    },
    // ── the font lab ─────────────────────────────────────────────────────
    fdCycle(field) {
      cycleField(field);
    },
    fdLabel(field) {
      return labelFor(this.fontState[field]);
    },
    wordKey(d) {
      return d.word === "clock"
        ? this.fontState.clockKey
        : this.fontState.towerKey;
    },
    dialGlyph(d) {
      return glyphFrom(this.wordKey(d), d.letter);
    },
    dialStyle(d) {
      return glyphStyleFrom(this.wordKey(d), d.letter, 1);
    },
    /**
     * FT-880: the notice's tap. This runs inside a real click handler, so the
     * gesture the browser was holding out for is live in this very call stack
     * and the play is allowed — which is why it plays for real rather than
     * silently. The player asked why they heard nothing; the honest answer is
     * to let them hear it.
     */
    allowCallBackSound() {
      enableCallBackSound(this.grimoire.isMuted);
    },
    pillLeave() {
      if (!this.leaveArmed) {
        this.leaveArmed = true;
        this.leaveTimer = setTimeout(() => {
          this.leaveArmed = false;
        }, 3000);
        return;
      }
      clearTimeout(this.leaveTimer);
      this.leaveArmed = false;
      this.$refs.menu.leaveSession(true);
    },
    copyPillLink() {
      this.$refs.menu.copySessionUrl();
      this.pillCopied = true;
      setTimeout(() => {
        this.pillCopied = false;
      }, 1500);
    },
    /**
     * FT-931: THE TOWN ENDS. EndGameOverlay's own winner pick — recording to
     * the stats server is best-effort there and does not gate this; the
     * commit is the SAME root mutation a spectator's client applies when
     * this arrives over the wire (store/index.js's endGame — it forces the
     * grimoire reveal in the same commit, and socket.js's subscriber sends
     * the full resync that carries the reveal's role data to everyone
     * already connected).
     */
    onGameRecorded(winningTeam) {
      this.dealAt = null;
      // FT-1032: the STASH dies with the game too, unconditionally.
      // EndGameOverlay's own clearDealt only runs when the record POST
      // lands; a failed record used to leave the marker standing, and a
      // later re-entry would have greeted the host with a game that ended.
      // Idempotent beside the overlay's clear.
      clearDealt(this.session.sessionId);
      // ...and a panel still wearing the greeting face falls back to the
      // build face: there is no running game to greet anyone with now.
      this.reentry = false;
      // FT-1010: THE END IS THE TOWN'S OWN NEWS, written into the town's log
      // BEFORE the endGame commit below. Order matters: that commit's resync
      // re-derives the live game id — null now, the deal stash was cleared
      // when the record landed — and this row must land INSIDE the game it
      // ends, so it is sent while chat.gameId still names it. Authored here,
      // not in the mutation subscriber, because `endGame` is also committed
      // on boot-restore of an ended town and on every spectator's receipt of
      // the resync; THIS handler runs only on the host's actual winner pick.
      const winner = winningTeam === "evil" ? "evil" : "good";
      // FT-1037: THE BOARD PORTRAITS, posted first so the chapter still
      // closes on the winner's sentence. Data snapshots, not pixels: the
      // ring in seat order — name, role, alive/dead, traveler — rendered
      // back into a mini board by the chronicles' stats tab. FT-1057: the
      // opening capture is now shot at the DEAL (socket.js) and held on the
      // host — this is its publish moment, the reveal having made every
      // role public. It may be absent (a pre-FT-1057 game, storage denied);
      // the end portrait is shot here, while the roles still stand (Play
      // again clears them later). This handler also runs on FT-1050's
      // nothing-to-record end, so a game with no stats POST still publishes
      // its stashed opening board.
      const gameChat = {
        kind: "system",
        gameId: this.$store.state.chat.gameId,
        senderKey: "system",
        senderKind: "system",
        phase: this.$store.state.grimoire.isNight ? "night" : "day",
        dayNumber: this.$store.state.night.day,
      };
      // FT-1101: THE NIGHTS GO PUBLIC — one row per night, posted first so
      // they stand before the boards and the winner's sentence, in the order
      // the nights were played.
      //
      // This is the FT-1057 shape exactly: private while the game runs (each
      // client renders its own synthetic block from data only it holds — the
      // storyteller from this very log, a player from their own delivered
      // rows), published here, where the reveal has already made the whole
      // grimoire public. User's call: "when the game ends it becomes visible
      // to everyone, like the rest of the finished game's record."
      //
      // The lie mark never rides along — chronicleLineOf does not carry it.
      // What a seat was TOLD is the record; whether the storyteller knew it
      // was false stays theirs.
      nightBlocksOf(this.$store.state.night.entries).forEach((block) => {
        this.$store.commit("chatSay", {
          ...gameChat,
          phase: "night",
          dayNumber: block.day,
          body: encodeEvent({
            t: "nights",
            day: block.day,
            lines: block.lines,
            text: nightBlockText(block.day, block.lines),
          }),
        });
      });
      const openingRing = takeOpeningBoard(gameChat.gameId);
      if (openingRing) {
        this.$store.commit("chatSay", {
          ...gameChat,
          body: encodeEvent({
            t: "board",
            moment: "start",
            seats: openingRing,
            text: "The game begins — the board as dealt.",
          }),
        });
      }
      const endRing = boardRingOf(this.$store.state.players.players);
      if (endRing.length) {
        this.$store.commit("chatSay", {
          ...gameChat,
          body: encodeEvent({
            t: "board",
            moment: "end",
            seats: endRing,
            text: "The final board.",
          }),
        });
      }
      this.$store.commit("chatSay", {
        kind: "system",
        gameId: this.$store.state.chat.gameId,
        senderKey: "system",
        senderKind: "system",
        body: encodeEvent({
          t: "end",
          winner,
          text: `The game ends — ${winner === "good" ? "Good" : "Evil"} wins.`,
        }),
        phase: this.$store.state.grimoire.isNight ? "night" : "day",
        dayNumber: this.$store.state.night.day,
      });
      this.$store.commit("endGame", winningTeam);
    },
    /**
     * FT-931: PLAY AGAIN — the same table, a new game. Un-ends the town
     * (which also un-forces the grimoire reveal — store/index.js's
     * clearEnded), then clears every seat's role through the SAME action
     * the menu's own "Clear roles" already uses: seats and people stay,
     * roles do not. Host-only; the pill only ever shows this button to the
     * host.
     */
    /**
     * The same table, a new game. It clears the roles and returns to setup —
     * and RESETS THE DAY COUNTER, which it did not (user report 2026-08-20:
     * a fresh game in the same town opened on "End day 24"). The counter is
     * session state that outlived the game it was counting, so every later
     * game in a town inherited the last one's tally.
     */
    playAgain() {
      this.$store.commit("clearEnded");
      this.$store.dispatch("players/clearRoles");
      // The counter lives in the NIGHT module (`night.day`), which is what
      // `toggleNight` bumps — not in session, where the ended flag sits.
      this.$store.commit("night/setDay", 0);
      // FT-1059: the phase clock's own wall-clock stamp is session state
      // too, keyed on (town, phaseKey) — and the fresh game's first phase
      // lands on the exact same key ("d:0") the last game's did. Left
      // alone, FaceHands' remount would read the OLD game's stamp back and
      // open the new Day 1 already however many minutes stale — reported
      // as a fresh game showing "197:42". Clearing it here is what makes
      // the next mount take its fallback: stamp now, a genuinely new start.
      clearPhaseStart(this.session.sessionId);
      this.dealAt = null;
      // FT-1032: Play again means the LAST game is over for good — the deal
      // stash goes with it (belt beside onGameRecorded's clear, and the
      // backstop for any older stale entry), so this fresh build can never
      // be mistaken for a running game by a later re-entry.
      clearDealt(this.session.sessionId);
      this.building = true;
      this.reentry = false;
    },
    /**
     * FT-1032: the greeting face's one control — the host has seen the day
     * and steps back into the live town. The panel stands down; nothing
     * about the game changes.
     */
    reenterTown() {
      this.building = false;
      this.reentry = false;
    },
    /**
     * FT-1032: the greeting face's second door — swap to the BUILD face.
     * Only the face changes: the deal stash and the End-game door stand, so
     * a game that can still be recorded still can be. This door exists
     * because a re-entered town whose roster died cannot End its game
     * (nothing to record) and has no other way back to the builder.
     */
    rebuildTown() {
      this.reentry = false;
    },
    /**
     * FT-857: open the one script drawer on a named tab (the same behaviour
     * the player strip's icons use — the tab already showing closes it).
     */
    openScriptDrawer(view) {
      if (this.modals.scriptDrawer && this.scriptDrawerView === view) {
        this.$store.commit("toggleModal", "scriptDrawer");
        return;
      }
      this.$store.commit("setScriptDrawerView", view);
      if (!this.modals.scriptDrawer) {
        this.$store.commit("toggleModal", "scriptDrawer");
      }
    },
    /**
     * FT-1019: open the chronicles ON THE GALLOWS — filter armed first, so
     * the drawer wakes already showing the nomination rows. The pill's
     * count and the V key both land here.
     */
    openGallows() {
      this.$store.commit("setChroniclesFilter", "gallows");
      if (!this.modals.chroniclesDrawer) {
        this.$store.commit("toggleModal", "chroniclesDrawer");
      }
    },
    /**
     * FT-975: END THE PHASE — the one dispatch path, whether it fires from
     * a keypress or from a click. TownInfo's merged phase readout/button
     * emits `end-phase` on a click (only the storyteller's live copy ever
     * does — see TownInfo's isPhaseLive); the `e` hotkey below calls this
     * same method. Both funnel through the identical ref path this app has
     * always used — this.$refs.nightSheet.flipPhase() — so flipPhase's own
     * gating (the checklist requirement, the warn bookkeeping) is asked
     * exactly once per press, never duplicated into a second copy.
     *
     * The isEnded/isSpectator guards mirror the `e` case's own (isHost,
     * !isEnded) — kept here too, not only in TownInfo's isPhaseLive, so a
     * stray click during a state transition can't slip through.
     */
    endPhase() {
      if (!this.session.sessionId || this.session.isSpectator) return;
      if (this.session.isEnded) return;
      if (this.$refs.nightSheet) this.$refs.nightSheet.flipPhase();
      else if (this.$refs.menu) this.$refs.menu.toggleNight();
    },
    /**
     * FT-1063: the phase chip's own click, now living in this file's
     * storyteller-post column instead of TownInfo.vue. A player's copy is a
     * <span>, not a <button> (see the template's `component :is`), so this
     * only ever fires from a real click on the storyteller's live copy —
     * the isPhaseLive guard here is a cheap backstop, not the thing doing
     * the work; endPhase() above is the one dispatch path, unchanged.
     */
    onPhaseClick() {
      if (this.isPhaseLive) this.endPhase();
    },
    /**
     * FT-880/FT-1051 (moved here by FT-1063): ring the town. Same two
     * things happening as TownInfo.vue's retired copy — the mutation that
     * travels (socket.js owns the storyteller-only guard on it) and the
     * local play, because the relay never echoes a message back to whoever
     * sent it.
     */
    callTownBack() {
      if (this.session.isSpectator) return;
      if (this.callBackCooling) return;
      this.callBackCooling = true;
      this.callBackTimer = setTimeout(() => {
        this.callBackCooling = false;
      }, CALL_BACK_COOLDOWN);
      this.$store.commit("session/callBack");
      playCallBack(this.grimoire.isMuted);
    },
    /**
     * FT-880: THE KEY TABLE — remapped whole (user's map). The letters and
     * what they mean are published in golem/hotkeys.js, which is what the help
     * panel prints, so the map cannot be changed here without the app's own
     * documentation of it changing too.
     *
     * What moved, and why the old letters could not simply stay:
     *  - G was the seat COINS (upstream's toggleGrimoire / isPublic), which is
     *    not what the grimoire tab does. G is the drawer now, and the coins —
     *    which are not being dropped, only rehomed — take R, freed below.
     *  - E was the edition picker; it is the phase flip now (the day's most
     *    used action deserves the letter that names it). The edition moved to
     *    D, still reachable and still host-only.
     *  - S was the night toggle in a town and the Scripts door outside one; it
     *    is THE SCRIPT key in both places now, and reads the viewer's role to
     *    decide which script surface that means.
     *  - R was the script drawer and N was the first night: R goes to the
     *    coins, and the night orders become F (first) and N (others).
     */
    keyup({ key, ctrlKey, metaKey, target }) {
      if (ctrlKey || metaKey) return;
      // Golem fork: keys typed into a field are typing, not hotkeys.
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const inSession = !!this.session.sessionId;
      const isHost = inSession && !this.session.isSpectator;
      switch (key.toLocaleLowerCase()) {
        case "g":
          // the GRIMOIRE DRAWER — the same toggle the drawer's own tab fires,
          // and gated the same way the tab is (a host, with a town on the
          // table); the tab is not rendered otherwise and nor is this.
          if (!isHost || !this.players.length) return;
          this.$store.commit("toggleModal", "roleDrawer");
          break;
        case "r":
          // FT-1207 (user): "disable that for now, always have it revealed."
          // The face-down flip is stood down — the grimoire rests revealed
          // and R does nothing. The old branch, for the day it returns:
          //   if (!isHost) return;
          //   this.$store.commit("toggleGrimoire");
          break;
        case "e":
          // END THE DAY / END THE NIGHT — see endPhase() above, which this
          // and TownInfo's own merged readout/button (FT-975) both call.
          // Deliberately routed through the night sheet's own button
          // method, never the phase mutation directly — see the ref on
          // <NightSheet>. When the sheet is not standing (a nomination owns
          // the centre, or the town has no seats) there is no checklist to
          // answer to, and endPhase() falls back to the plain flip the menu
          // has always used. FT-931: the phase controls go once the town
          // has ended — endPhase() guards that itself.
          this.endPhase();
          break;
        case "s":
          // THE SCRIPT, in whichever sense applies to you: a storyteller (or
          // anyone standing on the index page with no town) gets the EDITOR;
          // a player in a town gets the script sheet to read.
          if (!inSession || isHost) {
            if (this.$refs.intro) this.$refs.intro.openCreate();
            else this.$store.commit("toggleModal", "edition");
            break;
          }
          this.openScriptDrawer("team");
          break;
        case "f":
          this.openScriptDrawer("first");
          break;
        case "n":
          this.openScriptDrawer("other");
          break;
        // (d and a RETIRED 2026-08-20, user call — see golem/hotkeys.js for
        // why each was redundant. `toggleModal("edition")` and
        // `menu.addPlayer()` both survive; it is only the KEYS that went, so
        // the script editor and the menu's own Add player are untouched.)
        case "h":
          // Golem fork: sessionless routes to the SAME panel the Host door
          // opens (Intro.openHost) — the legacy prompt() path only remains
          // reachable in-session, where it's already a no-op (guarded).
          if (inSession) this.$refs.menu.hostSession();
          else if (this.$refs.intro) this.$refs.intro.openHost();
          break;
        case "j":
          // Golem fork: sessionless → Intro.openJoin (the Join door's own
          // panel). In-session, unchanged — joinSession() drives the leave
          // flow there.
          if (inSession) this.$refs.menu.joinSession();
          else if (this.$refs.intro) this.$refs.intro.openJoin();
          break;
        case "c":
          // FT-1162: C READS BY WHERE YOU ARE STANDING, the same way S already
          // does. Off any town — the entry screen, where the corner quill
          // lives — it opens THE CHRONICLE, the cross-town page; the page's
          // own title wears a C drop-cap saying so. In a town it is unchanged:
          // the storyteller's Characters picker, which has held this letter
          // since FT-880 and is published as "Characters" in the key table.
          //
          // Deliberately NOT dual-purpose inside a town. The Chronicle is a
          // place you LEAVE the town for, and a letter that means two things
          // at once mid-game is the collision worth avoiding, not the feature.
          if (!inSession) {
            this.$store.commit("setRecordsPick", null);
            this.$store.commit("toggleModal", "records");
            break;
          }
          if (!isHost) return;
          this.$store.commit("toggleModal", "roles");
          break;
        case "v":
          // FT-1019: V opens the CHRONICLES with the gallows filter armed —
          // the nomination log's rows in the permanent stream (the
          // vote-history drawer it used to open is retired). Pressed while
          // the drawer already shows the gallows, it closes; pressed while
          // the drawer shows another filter, it re-aims it.
          if (!inSession) return;
          if (
            this.modals.chroniclesDrawer &&
            this.$store.state.chroniclesFilter === "gallows"
          ) {
            this.$store.commit("toggleModal", "chroniclesDrawer");
          } else {
            this.openGallows();
          }
          break;
        // FT-1019: the chronicles' own filter keys, live only while the
        // drawer is out (the field guard above already keeps typing safe).
        // Digits, because every free letter near the map is spoken for.
        case "1":
        case "2":
        case "3":
        case "4": {
          if (!this.modals.chroniclesDrawer) return;
          const filters = ["all", "talk", "gallows", "events"];
          this.$store.commit("setChroniclesFilter", filters[Number(key) - 1]);
          break;
        }
        case "escape":
          this.hotkeyHelpOpen = false;
          this.$store.commit("toggleModal");
      }
    },
  },
};
</script>

<style lang="scss">
@import "vars";
// FT-912: the face disc's material reads `--fd-tint` off
// #app — see
// `face-disc-tint` below and the light block at the top of faceDisc.scss.
// This import emits nothing on its own (that file is variables and mixins).
@import "faceDisc";
// FT-931: for $control-edge-hover — the Play again pill button's hover
// colour (the storyteller's own purple, not the pill's usual red). Emits
// nothing on its own (variables + mixins only).
@import "controls";

@font-face {
  font-family: "Papyrus";
  src: url("assets/fonts/papyrus.eot"); /* IE9*/
  src:
    url("assets/fonts/papyrus.eot?#iefix") format("embedded-opentype"),
    /* IE6-IE8 */ url("assets/fonts/papyrus.woff2") format("woff2"),
    /* chrome firefox */ url("assets/fonts/papyrus.woff") format("woff"),
    /* chrome firefox */ url("assets/fonts/papyrus.ttf") format("truetype"),
    /* chrome firefox opera Safari, Android, iOS 4.2+*/
      url("assets/fonts/papyrus.svg#PapyrusW01") format("svg"); /* iOS 4.1- */
}

@font-face {
  font-family: PiratesBay;
  src: url("assets/fonts/piratesbay.ttf");
  font-display: swap;
}

// Golem fork: input fields APP-WIDE wear the game's chrome — dark plate,
// hairline border, blood-red focus glow, parchment-italic ghost text
// (user call 2026-08-17: the default fields didn't match the game).
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
textarea,
select {
  background: rgba(0, 0, 0, 0.55);
  color: #eee;
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  padding: 4px 8px;
  font-family: inherit;
  font-size: inherit;
  &:focus {
    outline: none;
    border-color: #a01414;
    box-shadow: 0 0 7px rgba(160, 20, 20, 0.4);
  }
  &::placeholder {
    color: rgba(232, 220, 194, 0.4);
    font-style: italic;
  }
}

// The legacy webkit BLOOD scrollbar was killed 2026-08-17 (user order:
// never use it again) — the v-blood-scroll overlay directive is the only
// blood bar. Native bars everywhere else stay quiet, thin, and dark.
* {
  scrollbar-width: thin;
  scrollbar-color: #2a2a2a #000;
}
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: #000;
}
::-webkit-scrollbar-thumb {
  background: #2a2a2a;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3a3a3a;
}

// The blood-drip OVERLAY scrollbar (v-blood-scroll): the native bar hides,
// the drop art takes over. The track is click-transparent; only the drop
// itself drags.
.blooddrip-host {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
.blooddrip-track {
  position: absolute;
  width: 20px;
  pointer-events: none;
  z-index: 6;
  .blooddrip-trail {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 7px;
    height: 0;
    overflow: hidden;
    // natural-scale texture ANCHORED AT THE DROP: growth reveals more run
    // instead of stretching it (the stretch read as mucus, not blood); the
    // baked strip alternates flipped/jittered segments, so its repeat has
    // no visible period
    background-repeat: repeat-y;
    background-position: center bottom;
    background-size: 100% auto;
    opacity: 0.9;
  }
  .blooddrip-drop {
    position: absolute;
    top: 0;
    left: 50%;
    margin-left: -7.5px;
    pointer-events: auto;
    cursor: grab;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.6));
    // a touch of liquid lag — the drop eases after the content
    transition: transform 120ms ease-out;
    &:active {
      cursor: grabbing;
      transition: none;
    }
  }
}

::-webkit-scrollbar-corner {
  background: #000;
}

html,
body {
  font-size: 1.2em;
  line-height: 1.4;
  // Golem fork: our clocktower art is the shipped default (upstream's
  // background.jpg stays in the tree untouched).
  // The dark ground paints FIRST — while the 2.3MB art is still downloading,
  // the page reads as night instead of flashing white behind the intro.
  // The face lab's dials reach HERE too. This rule paints the background
  // everywhere outside a game — the intro, the lobby, the waiting screen — and
  // it is what a user is looking at most of the time, so a lab that only moved
  // `#app.in-game` appeared to do nothing at all.
  background: #0b0d12 url("assets/background-clocktower-centered.png");
  // THE BAKED OFFSET: +7px. The clock face measured about 4px left of the
  // window centre, and 7 is where it looked right when dialled by eye — the
  // art's own rim is not a perfect circle, so the eye is the better instrument
  // here (FT-881). The lab's variables still ADD to this, so the dial reads 0
  // at the shipped value.
  background-position: calc(50% + 7px + var(--bg-off-x, 0px))
    calc(50% + var(--bg-off-y, 0px));
  background-size: auto calc(max(100vh, 100vw / 1.8244) + var(--bg-h, 0px));
  color: white;
  height: 100%;
  font-family: "Roboto Condensed", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

@import "media";

* {
  box-sizing: border-box;
  position: relative;
}

a {
  color: $townsfolk;
  &:hover {
    color: $demon;
  }
}

h1,
h2,
h3,
h4,
h5 {
  margin: 0;
  text-align: center;
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  font-weight: normal;
}

ul {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

#app {
  height: 100%;

  // FT-912: THE FACE DISC'S TINT, published here because it
  // answers to a class that lives on this element — `#app.night`. The two values and the whole
  // argument for why one alpha cannot serve both a lit dial and a dark one are
  // in src/faceDisc.scss; this is only where they are hung, so that every disc
  // inherits them and nothing has to be told which surface it is.
  @include face-disc-tint;

  // THE PHONE SHEET'S HEIGHT — one number, three readers: the sheets
  // themselves (drawer.scss reads it as `var(--sheet-h)`), the session pill's
  // step up (below), and — by hand, because a flex box wants a percentage of
  // its own — the town square's matching give in TownSquare. Change it here
  // and the pill follows it exactly.
  --sheet-h: 52vh;

  // Golem fork: the boot gate — children stay invisible until the background
  // art and display fonts are ready, then fade in together. Until then the
  // dark body ground is all that shows.
  > * {
    transition: opacity 400ms ease-in;
  }
  &.booting > * {
    opacity: 0 !important;
  }

  // FT-881 follow-up: the paint is NUDGED by the face lab's scrubs.
  // X/Y move it; H grows or shrinks it. All three default to 0, so an
  // untouched app paints exactly as it did.
  // THE BAKED OFFSET: +7px. The clock face measured about 4px left of the
  // window centre, and 7 is where it looked right when dialled by eye — the
  // art's own rim is not a perfect circle, so the eye is the better instrument
  // here (FT-881). The lab's variables still ADD to this, so the dial reads 0
  // at the shipped value.
  background-position: calc(50% + 7px + var(--bg-off-x, 0px))
    calc(50% + var(--bg-off-y, 0px));
  // `cover` written out longhand, because a keyword has no arithmetic and H
  // needs some. Cover's HEIGHT for this art is whichever is larger: the
  // window's own height, or the height the image must reach for its width to
  // span the window — that second term is 100vw / 1.8244, the aspect of the
  // 1642x900 recentred background. `auto` then takes the width from it, so
  // the image never distorts, only zooms.
  //
  // Adding to that height zooms IN and stays covered. Subtracting zooms out,
  // and past zero-cover the edges stop being covered — that is the letterbox
  // seam, and the scrub is how you find where it starts rather than being
  // told about it.
  background-size: auto calc(max(100vh, 100vw / 1.8244) + var(--bg-h, 0px));
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;

  // disable all animations
  &.static *,
  &.static *:after,
  &.static *:before {
    transition: none !important;
    animation: none !important;
  }
}

// FT-1034: purple is the storyteller's color app-wide (the checklist accent).
#session-pill .hosting-word {
  font-style: normal;
  color: rgb(167, 143, 205);
  /* The template's newline between "Hosting" and the town name is condensed
     away by the compiler, so the gap has to be drawn here. */
  margin-right: 0.35em;
}

#session-pill {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 80;
  // the right drawer would bury the Leave door — the pill steps aside for it
  // instead of hiding under it (user call 2026-08-18). On a phone the step is
  // UP rather than sideways (see the sheet rule below), so both edges move.
  transition:
    right 220ms ease,
    bottom 220ms ease;
  &.drawer-open {
    // follows the drawer's own (resizable) width
    right: calc(var(--sd-width, 400px) + 10px);
  }
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  border: 3px solid black;
  border-radius: 10px;
  box-shadow: 0 0 10px black;
  font-size: 80%;

  b {
    color: #c00;
  }
  .who.reconnecting {
    animation: blink 1s infinite;
  }
  .nomlog,
  .stats,
  .endgame,
  .copylink,
  .leave,
  .play-again {
    cursor: pointer;
    &:hover {
      color: red;
    }
  }
  // FT-852: the armed Leave reads as the question it is.
  .leave.armed {
    color: red;
  }
  // FT-931: PLAY AGAIN is a fresh start, not a warning — purple on hover
  // (the storyteller's own colour throughout the app, $control-edge-hover
  // from controls.scss) rather than the pill's usual red, which every
  // other control here wears because it names something ending or leaving.
  .play-again:hover {
    color: $control-edge-hover;
  }
  // FT-1058 (user): the purple family widens — Play again and the player
  // count wear it at rest, and Copy link's hover joins it (red stays only
  // on the ending/leaving controls).
  .play-again {
    color: rgb(167, 143, 205);
  }
  // FT-1105 (user): a PLAYER pill puts the purple on the TOWN NAME and
  // leaves the count in plain ink. The host keeps their purple on the word
  // Hosting, so on both pills the colour marks the same thing: whose town.
  .town-word {
    color: rgb(167, 143, 205);
  }
  .player-count {
    color: #e8ddd0;
  }
  .copylink:hover {
    color: $control-edge-hover;
  }

  // THE PILL IS SIZED BY TYPE, and the type shrinks twice on the way down to a
  // phone — `html` drops to 0.8em under 576px and the pill takes 80% of that.
  // Its controls are bare glyphs with no box of their own, so they inherited
  // the shrink and ended up 8x11px: Town records, Copy link and Leave, all
  // under a tenth of the area a fingertip covers (measured 375x812).
  //
  // Where there is no mouse, the controls take a real plate. The pill's
  // wording is untouched — this is the tap area, not a redesign.
  @media (pointer: coarse) {
    gap: 4px;
    padding: 6px 8px;
    .nomlog,
    .stats,
    .endgame,
    .copylink,
    .leave,
    .play-again {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      min-width: 40px;
      min-height: 40px;
      padding: 0 8px;
      border-radius: 8px;
      &:active {
        background: rgba(255, 255, 255, 0.12);
      }
    }
  }
}

// THE PILL AND THE SHEET. On desktop the pill dodges SIDEWAYS by the open
// drawer's own width, which is the right answer for a drawer down the right
// edge and the wrong one for a sheet across the bottom: `--sd-width` is 400px
// on a 375px window, so the sideways dodge threw the pill off the left of the
// screen — and a sheet standing on the bottom edge would have buried it there
// anyway. It steps UP onto the sheet's top edge instead, where the town square
// has already given up the room (the ring stops at 40% of the window; the
// sheet starts at 48%; the pill's band is what is left between them).
//
// Up rather than hidden: Leave, End game and Town records all live in the pill
// and all of them stay one tap away with a sheet out.
@media (pointer: coarse) and (orientation: portrait) {
  #app.sheet-up #session-pill {
    right: 10px;
    bottom: calc(var(--sheet-h) + 8px);
  }
}

// TURNED ON ITS SIDE the pill has nowhere to stand at all, so it stands down.
//
// A landscape phone with a drawer out is 812px holding a 400px drawer and a
// 355px ring, and the square has already shifted to clear the drawer. There is
// no band left: measured at 812x375, the sideways dodge put the pill across
// THREE chairs with the script drawer out and two with the grimoire, and the
// pill outranks a seat (z-index 80 against a chair's 1..N), so those chairs
// stopped taking taps as well as stopped being readable.
//
// Hidden, not moved, because every candidate position is on top of something
// that matters more. It is one tap back: closing the drawer returns it, and
// Leave, End game and Town records come with it.
@media (pointer: coarse) and (orientation: landscape) and (max-height: 500px) {
  #app.sheet-up #session-pill {
    display: none;
  }
}

// FT-880: the refused player's notice. Bottom-LEFT: the pill owns bottom-right
// and the menu owns top-right, so this is the one free corner in a running
// town — and it has to be somewhere permanent, because a notice that shares a
// corner with something else is a notice that gets covered exactly when it
// matters.
//
// It is styled as a thing to press, not as a warning to endure: the whole
// message is the tap target, because the fix is one tap and burying it behind
// a small × or a separate button would be the second silent failure.
.callback-blocked {
  position: fixed;
  left: 10px;
  bottom: 10px;
  z-index: 85;
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: 300px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.82);
  border: 2px solid #6b1414;
  border-radius: 10px;
  box-shadow: 0 0 10px black;
  color: #e8ddd0;
  font-size: 13px;
  line-height: 1.35;
  cursor: pointer;
  transition:
    border-color 200ms,
    background 200ms;

  svg {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    color: #c33;
  }
  b {
    color: #fff;
    white-space: nowrap;
  }
  &:hover {
    background: rgba(12, 6, 6, 0.95);
    border-color: #a01414;
  }
  // Where there is no mouse the notice is the tap target, so it gets a real
  // one — and a phone is exactly where a tab sits untouched long enough to
  // lose its autoplay credit in the first place.
  //
  // It also has to STAND ON the pill rather than beside it. On a desktop the
  // two share the bottom edge happily (300px on the left, the pill far away on
  // the right); at 375px wide there is no "beside" — measured, the full-width
  // notice lay straight across the pill, burying Leave and the records door
  // behind an element that takes every tap. So on a phone it goes up by the
  // pill's own height instead.
  @media (pointer: coarse) {
    // measured at 375x812: the pill stands 58px tall there (its controls are
    // given a 40px minimum for fingertips, plus padding and its 3px border).
    // 20px of air on top of that so they read as two things, not one.
    --pill-clearance: 78px;
    left: 10px;
    right: 10px;
    max-width: none;
    min-height: 44px;
    bottom: var(--pill-clearance);
  }
}

// …and both of them step up onto a bottom sheet's top edge together, keeping
// the same gap. Unlike the pill this NEVER stands down: the pill's controls
// are all one tap away again by closing the drawer, and this is the only thing
// telling a player their sound is broken.
@media (pointer: coarse) and (orientation: portrait) {
  #app.sheet-up .callback-blocked {
    bottom: calc(var(--sheet-h) + 8px + var(--pill-clearance));
  }
}

@keyframes blink {
  50% {
    opacity: 0.3;
  }
}

.blur-enter-active,
.blur-leave-active {
  transition: all 250ms;
  filter: blur(0);
}
.blur-enter,
.blur-leave-to {
  opacity: 0;
  filter: blur(20px);
}

// Buttons
.button-group {
  display: flex;
  align-items: center;
  justify-content: center;
  align-content: center;
  .button {
    margin: 5px 0;
    border-radius: 0;
    &:first-child {
      border-top-left-radius: 15px;
      border-bottom-left-radius: 15px;
    }
    &:last-child {
      border-top-right-radius: 15px;
      border-bottom-right-radius: 15px;
    }
  }
}
.button {
  padding: 0;
  // THE SHARED BUTTON CHROME, and its height is nothing but line-height times
  // a font size that shrinks twice on the way down to a phone: the vote
  // controls (Countdown / Start / Close, Mark for execution) and the role
  // picker's team tabs all drew about 19px tall. Vertical padding rather than
  // a min-height, because the pill's width is built from inline `:before` and
  // `:after` spacers that flex centring would throw away.
  @media (pointer: coarse) {
    padding: 11px 0;
  }
  border: solid 0.125em transparent;
  border-radius: 15px;
  box-shadow:
    inset 0 1px 1px #9c9c9c,
    0 0 10px #000;
  background:
    radial-gradient(at 0 -15%, rgba(#fff, 0.07) 70%, rgba(#fff, 0) 71%) 0 0/ 80%
      90% no-repeat content-box,
    linear-gradient(#4e4e4e, #040404) content-box,
    linear-gradient(#292929, #010101) border-box;
  color: white;
  font-weight: bold;
  text-shadow: 1px 1px rgba(0, 0, 0, 0.5);
  line-height: 170%;
  margin: 5px auto;
  cursor: pointer;
  transition: all 200ms;
  white-space: nowrap;
  &:hover {
    color: red;
  }
  &.disabled {
    color: gray;
    cursor: default;
    opacity: 0.75;
  }
  &:before,
  &:after {
    content: " ";
    display: inline-block;
    width: 10px;
    height: 10px;
  }
  &.townsfolk {
    background:
      radial-gradient(
          at 0 -15%,
          rgba(255, 255, 255, 0.07) 70%,
          rgba(255, 255, 255, 0) 71%
        )
        0 0/80% 90% no-repeat content-box,
      linear-gradient(#0031ad, rgba(5, 0, 0, 0.22)) content-box,
      linear-gradient(#292929, #001142) border-box;
    box-shadow:
      inset 0 1px 1px #002c9c,
      0 0 10px #000;
    &:hover:not(.disabled) {
      color: #008cf7;
    }
  }
  &.demon {
    background:
      radial-gradient(
          at 0 -15%,
          rgba(255, 255, 255, 0.07) 70%,
          rgba(255, 255, 255, 0) 71%
        )
        0 0/80% 90% no-repeat content-box,
      linear-gradient(#ad0000, rgba(5, 0, 0, 0.22)) content-box,
      linear-gradient(#292929, #420000) border-box;
    box-shadow:
      inset 0 1px 1px #9c0000,
      0 0 10px #000;
  }
}

/* video background */
video#background {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Golem fork (FT-852, recentred FT-anon 2026-08-19): one face-pixel — the
   unit the background's cover fit actually draws at. The art was 1672×941
   with the dial centred at image (851,450) — +15,-20.5 off the image's own
   centre, which every anchor below had to carry as a baked-in offset.
   background-clocktower(-blank)-centered.png trims that away: 30px off the
   left, 41px off the bottom (measured, see the trim script), so the art is
   now 1642×900 with the dial's centre AT the image centre. Every
   dial-anchored element now positions as a plain offset from 50%/50% — no
   folded-in offset anywhere. Adjust letters by editing the plain numbers
   below (they are image pixels, face-relative). */
#app {
  /* container units so the face math reads the SAME box the background
     paints in — mobile browser bars make vh lie; cqh doesn't. */
  container-type: size;
  --fpx: max(0.0609cqw, 0.11111cqh);
  /* the door stack's unit: face-proportional but CAPPED so the cover-fit
     zoom on portrait phones can't balloon the buttons. */
  --dfpx: min(var(--fpx), 0.145vmin);
  /* THE FACE, published for whoever lays the next thing over it (e.g. a
     night sheet): centre is now just the container centre — no offset — and
     the radius is in face-px (multiply by --fpx for a length). Measured off
     the trimmed art's outer bronze rim, ray-cast at 5° steps averaged
     across both background images: ~230-249px depending on angle (the rim
     isn't a perfect circle — it's painted), 238 is the mean. */
  // THE FACE CENTRE FOLLOWS THE PAINT. When the +7px offset was baked into the
  // background rules it was not carried here, so everything registered to the
  // face — the night checklist's disc, the entry panels — sat 7px left of the
  // face it was supposed to be centred on. Caught by the checklist lane, whose
  // disc geometry is measured against these to a hundredth of a pixel and so
  // noticed immediately. One expression, so a future change to the offset moves
  // the art and everything on it together.
  --face-cx: calc(50% + 7px + var(--bg-off-x, 0px));
  --face-cy: calc(50% + var(--bg-off-y, 0px));
  --face-r: 238;
}

/* The centre-face splat (FT-936; visible mark FT-991; relocated here FT-993
   from TownSquare.vue -- see the template's own comment on <FaceHands>).

   z-index 0, NOT -1. Negative is a hole here for the identical reason it is
   one for #face-hands (FaceHands.vue's own comment, measured the same way):
   #app takes `container-type: size` but does not actually form a stacking
   context, so a negative-z descendant escapes past it, past body, past html,
   and is buried under their own opaque backgrounds -- 0px painted, measured
   with this element the same way that file measured its own.

   0 is also not a coin-flip against #face-hands (also z:0): stacking ties at
   equal z-index resolve by DOCUMENT ORDER, later wins, and this element is
   mounted immediately BEFORE <FaceHands> for exactly that reason -- measured
   directly (claude_temp_test/2026-08-20-ft993-diag2.mjs, pixel-diffing a
   frozen hand pose against the splat's own footprint): at the old in-
   TownSquare position, later in the document than the hands, the splat won
   every pixel where the two geometrically overlapped. Moved here, earlier,
   the hands win instead -- the blood stays on the dial, the hands sweep
   across it.

   left/top read --face-cx/--face-cy just above, same as when this lived in
   TownSquare.vue -- both #app and the old #townsquare parent share the same
   box at every measured viewport (0,0 origin, full width/height), so the
   move carries no positional shift; verified against #face-hands's own
   dial-centred parts rather than assumed. */
.face-splat {
  position: absolute;
  left: var(--face-cx);
  top: var(--face-cy);
  z-index: 0;
  pointer-events: none;
  background: center / contain no-repeat;
  transform-origin: center center;
  /* matches stain-in's own end state (0.88) exactly -- fill-mode is none, so
     once the animation ends this base value takes back over, and a
     mismatched number here would show as a one-frame opacity "pop". The
     keyframe itself is TownSquare.vue's own (unscoped, so still global). */
  opacity: 0.88;
  animation: stain-in 420ms ease-out;
}

#app.static .face-splat {
  animation: none;
}

/* FT-1000: the dial stains, anchored on the same centre vars as the splat.
   The container is a POINT at the dial centre; each stain sits at 0,0 and
   its own translate(-50%,-50%) spoke transform (unchanged from TownSquare)
   swings it out -- identical math, new stacking home. */
.blood-dial {
  position: absolute;
  left: var(--face-cx);
  top: var(--face-cy);
  z-index: 0;
  pointer-events: none;

  .stain {
    position: absolute;
    left: 0;
    top: 0;
    background: center / contain no-repeat;
    /* the stone drinks it -- the dial filigree still reads underneath */
    opacity: 0.88;
    transform-origin: center center;
    animation: stain-in 420ms ease-out;
  }
}

#app.static .blood-dial .stain {
  animation: none;
}
// the DRIP LAB — top-left, the user's own scrollbar dials
// The FACE LAB — same shell as the coin and drip labs, one notch below them,
// so the three read as one column of dev doors rather than three inventions.
#face-lab {
  position: fixed;
  top: 140px;
  left: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;

  .fa-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: rgba(8, 6, 10, 0.92);
    border: 1px solid rgba(120, 105, 135, 0.45);
    border-left: none;
    border-radius: 0 8px 8px 0;
  }
  .fa-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #d8cdb4;
  }
  .fa-label {
    width: 12px;
    opacity: 0.7;
  }
  .fa-reset {
    font-family: inherit;
    font-size: 11px;
    color: #d8cdb4;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    padding: 2px 6px;
    cursor: pointer;
  }
}

#coin-lab {
  position: fixed;
  top: 96px;
  left: 0;
  z-index: 60;
  display: flex;
  align-items: flex-start;

  .co-rows {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    background: rgba(8, 6, 10, 0.92);
    border: 1px solid rgba(120, 105, 135, 0.45);
    border-left: none;
    border-radius: 0 8px 8px 0;
  }
  .co-pick {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 3px 8px 3px 3px;
    font-family: inherit;
    font-size: 12px;
    color: #d8cdb4;
    background: rgba(20, 16, 22, 0.9);
    border: 1px solid rgba(120, 105, 135, 0.4);
    border-radius: 5px;
    cursor: pointer;
    img {
      width: 26px;
      height: 26px;
      object-fit: contain;
    }
    &.on {
      color: #fff;
      border-color: rgba(200, 170, 90, 0.9);
    }
  }
}

#drip-lab {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 96;
  font-size: 13px;
  .fd-toggle {
    width: 30px;
    height: 26px;
    line-height: 26px;
    text-align: center;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #3d3d3d;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0.45;
    &:hover {
      opacity: 1;
      border-color: #a01414;
    }
  }
  &.open .fd-toggle {
    opacity: 1;
    border-color: #a01414;
  }
  .dr-rows {
    margin-top: 4px;
    background: rgba(8, 8, 12, 0.96);
    border: 1px solid #400;
    border-radius: 6px;
    padding: 8px;
    width: 240px;
    .dr-row {
      display: flex;
      align-items: center;
      gap: 6px;
      .dr-label {
        width: 78px;
        opacity: 0.75;
        font-size: 12px;
      }
      input[type="range"] {
        flex: 1;
        accent-color: #a01414;
      }
      .dr-val {
        width: 28px;
        text-align: right;
        font-size: 11px;
        opacity: 0.7;
      }
    }
    .dr-reset {
      margin-top: 6px;
      width: 100%;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      padding: 2px 0;
      cursor: pointer;
      font-family: inherit;
      &:hover {
        border-color: #a01414;
      }
    }
  }
}

// the grimoire drawer's tab — rides the left edge, above the drawer
// the Pandemonium Institute credit — a quiet footer button, muted until hovered
.support-creators {
  position: fixed;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 10px;
  text-decoration: none;
  white-space: nowrap;
  color: rgba(210, 198, 174, 0.62);
  font-size: 12px;
  letter-spacing: 0.4px;
  background: rgba(6, 5, 6, 0.6);
  border: 1px solid rgba(120, 105, 135, 0.35);
  border-radius: 6px;
  z-index: 80;
  transition:
    color 200ms,
    border-color 200ms,
    background 200ms;

  // their own mark, leading the credit — unaltered, just sized and calmed
  .tpi-mark {
    width: 20px;
    height: 21px;
    object-fit: contain;
    opacity: 0.85;
  }
  &:hover {
    color: #efe6d2;
    background: rgba(10, 8, 12, 0.9);
    border-color: rgba(150, 130, 175, 0.7);
    .tpi-mark {
      opacity: 1;
    }
  }
}

// FT-1063: THE STORYTELLER'S POST. This selector carries what `.drawer-tab`
// alone used to (position: fixed, the left-edge pin, the open/close slide,
// the phone media query) — `.drawer-tab` below is now a plain flex child,
// its own box unchanged (still the plum-framed 40x96 book), stacked between
// the bell above it and the phase chip below by this wrapper's flex column,
// not by its own positioning.
.storyteller-post {
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 21;
  display: flex;
  flex-direction: column;
  // FT-1063b/c (user, twice): EVERYTHING in the post sits flush with the
  // screen's left edge — the bell included (the centred float was my call
  // and was corrected).
  align-items: flex-start;
  gap: 8px;
  transition: left 220ms ease;

  // FT-1063d (user): the BOOK is what centres on the page — with the bell
  // and chip in the flex flow, the column's midpoint drifted off the book.
  // The two satellites leave the flow and hang off the book's box instead,
  // so the container (and its 50% anchor) is exactly the book.
  .post-bell {
    position: absolute;
    left: 0;
    bottom: calc(100% + 8px);
  }
  .post-phase {
    position: absolute;
    left: 0;
    top: calc(100% + 8px);
  }

  &.open {
    left: 250px;
  }

  // The post is pinned to the middle of the left edge, which on a portrait
  // phone is exactly where the docked build sheet's first row now starts — it
  // sat on top of the "Seats" label. It moves up into the square, where there
  // is nothing behind it. (Carried verbatim from `.drawer-tab`'s own
  // pre-FT-1063 rule — the book's own reason for being here, unchanged.)
  @media (pointer: coarse) and (orientation: portrait) {
    top: 26%;

    // …and it stays put when the grimoire opens. The 250px step is the width
    // of the DRAWER it is stepping clear of; on a phone the grimoire is a
    // full-width sheet across the bottom, so there is no width to step by and
    // nothing to step clear of — the sheet rises past the post, half a screen
    // below it. Left at 250px the post walked off a 375px screen and the one
    // control that shuts the grimoire went with it.
    &.open {
      left: 0;
    }
  }
}

.drawer-tab {
  padding: 3px;
  background: rgba(8, 8, 10, 0.92);
  // the tab frames the grimoire cover — it takes the BOOK's plum, not the
  // blood red the rest of the chrome uses (user call 2026-08-18)
  border: 1px solid #4b3565;
  border-left: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  .tab-book {
    // the cover at its own proportions (80x96 asset), barely framed
    width: 40px;
    height: 48px;
    display: block;
    filter: drop-shadow(0 1px 3px black);
  }
  &:hover .tab-book {
    filter: drop-shadow(0 1px 3px black) brightness(1.25);
  }
}

// FT-1063: the summons bell, riding above the book in the storyteller's
// post — the SAME round icon-plate dress TownInfo.vue's `.call-now` wore
// (ground/edge/hover/cooling recipe), sized down from its old 46px (a lone
// control in a quarter of the dial) to 36px so it reads as the book's own
// family member, not a second focal point competing with it.
.post-bell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: PiratesBay, sans-serif;
  color: #d8cdb4;
  border: 1px solid rgba(120, 105, 135, 0.4);
  border-radius: 50%;
  background: rgba(20, 16, 22, 0.9);
  width: 36px;
  height: 36px;
  padding: 0;
  cursor: pointer;
  transition:
    background 150ms,
    border-color 150ms,
    color 150ms;

  &:hover,
  &:focus-visible {
    background: rgba(32, 24, 38, 0.95);
    border-color: rgba(150, 130, 175, 0.75);
    color: #fff;
    outline: none;
  }
  // "not yet" — the cooling swallow dims like it always did
  &.cooling {
    color: #7a736a;
    cursor: default;
    pointer-events: none;
  }
}
.post-bell-mark {
  width: 20px;
  height: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.95));
}

// FT-1063: the end-phase chip, riding below the book — the SAME
// engraved-plate dress TownInfo.vue's `.phase-now` wore (ground, edge,
// radius, the sun/moon marks), scaled down from its dial-quadrant size (22px
// type, 16-side padding) to fit a narrow left-edge column without reaching
// past it at common viewports.
.post-phase {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: PiratesBay, sans-serif;
  letter-spacing: 0.5px;
  font-size: 13px;
  color: #d8cdb4;
  text-shadow:
    0 2px 1px black,
    0 -2px 1px black,
    2px 0 1px black,
    -2px 0 1px black;
  border: 1px solid rgba(120, 105, 135, 0.4);
  // FT-1063b (user): flush against the screen edge — no left border, no
  // left radii; the chip grows out of the edge like the book's tab does.
  border-left: none;
  border-radius: 0 6px 6px 0;
  background: rgba(20, 16, 22, 0.9);
  padding: 4px 8px;
  white-space: nowrap;
  cursor: default;
  transition:
    background 150ms,
    border-color 150ms,
    color 150ms;

  // the only thing isPhaseLive changes on the plate: a pointer and the
  // hover/focus purple this app's controls answer to everywhere, rather
  // than the OFF-state the checklist-up copy just sits at
  &.is-live {
    cursor: pointer;
    &:hover,
    &:focus-visible {
      background: rgba(32, 24, 38, 0.95);
      border-color: rgba(150, 130, 175, 0.75);
      color: #fff;
      outline: none;
    }
  }
}
.post-phase-mark {
  width: 14px;
  height: 14px;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.95));
}
.post-phase-sun {
  width: 13px;
  height: 13px;
  color: #d8b45a;
}

// FT-1214: THE END-DAY BUTTON MOVED TO THE DISC'S FOOT — where the disc
// exists. Under the face-disc gate the clock face's foot always holds THE
// phase button (Start game → End day → End night, one geometry via
// faceDisc.scss's face-disc-foot-button; NightSheet draws the day copy), so
// the left column's LIVE copy stands down there — display:none, in place,
// never unmounted. The non-live copy (the plain "Night N" readout while the
// checklist carries its own End night button) keeps standing: it is a
// readout, not the button, and the column still wants the phase word at
// night. BELOW the gate nothing changes — phones and small windows have no
// disc foot to move to, and this column keeps the job FT-1063 gave it.
@include face-disc-gate {
  .storyteller-post .post-phase.is-live {
    display: none;
  }
}

// ── FT-1168 (user): GRIMOIRE SIZE — LARGE ────────────────────────────────
// "Grimoire Size: Small, large (this affects the storytellers grimoire size,
// the end day and bell button size)". All three of those are this one column
// (FT-1063 put them there), so this is one modifier, not three settings.
//
// SMALL IS UNTOUCHED. Every value above stands exactly as it did — a browser
// that never opens the cog cannot tell this landed. Everything below is the
// same numbers at 1.5x, written out rather than run through a transform:
// `scale()` would blur the book's raster cover and the FA glyphs, and — worse
// — a scaled element keeps its ORIGINAL box for layout, so the bell and the
// chip (which hang off the book's box with `calc(100% + 8px)`) would have
// grown into each other while the gaps stayed where the small sizes put them.
//
// The gaps grow with the rest, so the column reads as the same object at a
// different size rather than as three controls that drifted apart.
#app.grimoire-lg {
  .storyteller-post {
    gap: 12px;

    // FT-1190: THE COLUMN'S WIDTH LIVES HERE, ON THE COLUMN. It was written
    // one level up, at the top of this `#app.grimoire-lg` block, where
    // `width: var(--sp-w)` did not size the storyteller's column at all — it
    // sized `#app`, collapsing the whole application box to 150px hard
    // against the left edge for everyone whose grimoire size is "large".
    //
    // The clock face did not follow it, and that is what made the failure
    // look like a mystery rather than a typo: the art is painted from
    // `100vw`/`100vh` and `--fpx` reads container units that resolve against
    // the viewport, so the background and the letters stayed full-window
    // while everything anchored to #app's own box — the entry doors, the
    // Host/Join panels, the whole intro layer — laid out inside a 150px
    // ribbon on the left. Reported as "the UI is shifted far to the left in
    // preview", and only in SOME browsers, because the grimoire size is a
    // per-profile preference: a browser that never chose "large" was fine.
    //
    // `--sp-w` stays a variable declared on the column, so `.drawer-tab` and
    // `.post-phase` below still inherit it — they are both inside this
    // element (the bell and the phase button hang off the book's box by
    // absolute positioning, but they are still its descendants).
    --sp-w: 150px;
    width: var(--sp-w);

    .post-bell {
      bottom: calc(100% + 12px);
    }
    .post-phase {
      top: calc(100% + 12px);
    }
  }

  // FT-1179 (user): "lets make the grimoire even bigger if large is
  // selected" — "as wide as the end day button while maintaining aspect
  // ratio".
  //
  // The button cannot set the book's width by layout: it is ABSOLUTE, hanging
  // off the book's box, and that is deliberate — FT-1063d took the two
  // satellites out of the flow precisely so the column's midpoint is the book
  // and not the average of three things. So the relationship is inverted
  // instead: the COLUMN gets one width, and the book and the button each take
  // all of it. They are then equal by construction rather than by a number
  // typed twice, and the book holds 5:6 through `aspect-ratio` rather than a
  // second height that would have to be edited whenever the width is.
  //
  // 150px is a chosen width, not a measured one — the button's own natural
  // width varies with its label ("End day 2" against "End night 12"), so
  // there is no single number to match. Stating it once and having both obey
  // it is the honest version of "as wide as the button".
  //
  // FT-1190: the two declarations that used to sit HERE — `--sp-w: 150px` and
  // `width: var(--sp-w)` — have moved into the `.storyteller-post` block
  // above, which is the column this paragraph is describing. At this level
  // they were setting the width of #app. The reasoning above is unchanged and
  // still governs; only the element it lands on is corrected.

  .drawer-tab {
    padding: 5px;
    border-radius: 0 12px 12px 0;
    width: 100%;
    box-sizing: border-box;
    .tab-book {
      width: 100%;
      height: auto;
      aspect-ratio: 5 / 6;
    }
  }

  // FT-1176 (user): "make the grimoire and end day button bigger if their
  // size is set to large but not the bell". The bell is a summons, not a
  // reading surface — it is pressed once a day and never read, so it gains
  // nothing from the extra size the book and the phase button do. Left at its
  // shipped size; the two rules below stand down rather than being deleted,
  // per the house rule, and the record of what large used to do to it stays.
  .post-bell--retired-ft1176 {
    width: 54px;
    height: 54px;
  }
  .post-bell-mark--retired-ft1176 {
    width: 30px;
    height: 30px;
  }

  // FT-1176 (user): "make the end day button the same size as the start game
  // button as far as font size if big and the button around it scale
  // accordingly."
  //
  // Start game is 120% of its panel's type in 8px/20px of padding inside a 3px
  // border (HostTools' `.start`). This is not a percentage of the same parent,
  // so the size is stated in px at the value that percentage resolves to on
  // the panel — and the padding and border come with it, because "the same
  // size as far as font size, and the button scales accordingly" is a button
  // matched in its whole box rather than in one property.
  .post-phase {
    font-size: 21.6px;
    gap: 8px;
    padding: 8px 20px;
    border-width: 3px;
    border-radius: 0 10px 10px 0;
    // FT-1179: the same width the book takes, so the pair reads as one
    // column. `min-width` rather than `width` — a longer label may need more
    // room and a clipped button would be a worse failure than a slightly
    // uneven edge.
    min-width: var(--sp-w);
    box-sizing: border-box;
    justify-content: center;
  }
  .post-phase-mark {
    width: 21px;
    height: 21px;
  }
  .post-phase-sun {
    width: 20px;
    height: 20px;
  }
}

// in a game the hands leave the face — #app paints the handless art over
// the body's default (the class rides #app, not body)
#app.in-game {
  // Same dials, the other plate — the blank dial the town is played on.
  background: #0b0d12 url("assets/background-clocktower-blank-centered.png");
  // THE BAKED OFFSET: +7px. The clock face measured about 4px left of the
  // window centre, and 7 is where it looked right when dialled by eye — the
  // art's own rim is not a perfect circle, so the eye is the better instrument
  // here (FT-881). The lab's variables still ADD to this, so the dial reads 0
  // at the shipped value.
  background-position: calc(50% + 7px + var(--bg-off-x, 0px))
    calc(50% + var(--bg-off-y, 0px));
  background-size: auto calc(max(100vh, 100vw / 1.8244) + var(--bg-h, 0px));
}

#app > .dial-letters {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  font-family: "Times New Roman", Times, serif;
  font-weight: bold;
  font-size: calc(82 * var(--fpx));
  color: #0a0502;
  text-shadow: 0 calc(2 * var(--fpx)) calc(3 * var(--fpx)) rgba(0, 0, 0, 0.55);
  .dl {
    position: absolute;
    transform: translate(-50%, -50%);
    line-height: 1;
    /* only the letters themselves take the font-cycling click */
    pointer-events: auto;
    cursor: pointer;
    img {
      /* glyph mode: no painted-text shadow double-up */
      filter: drop-shadow(
        0 calc(2 * var(--fpx)) calc(3 * var(--fpx)) rgba(0, 0, 0, 0.45)
      );
    }
  }
  /* hour positions on the measured tick rays (image px from the face's own
     centre — recentred art, no more baked-in +15,-20.5).

     FT-1190: THE CENTRE IS `--face-cx`/`--face-cy`, NOT A BARE 50%. Those are
     published a few rules up as `calc(50% + 7px + var(--bg-off-x, 0px))` —
     the paint's own horizontal shift (FT-881's baked 7px, plus whatever the
     face lab's scrub holds for this browser profile). Written as 50% these
     ten letters were laid on a centre the art does not use, so the whole ring
     sat 7px left of the dial it is engraved on — invisible against a 1920px
     window, a fifth of a letter's width in a small pane, and further adrift
     for anyone with a lab scrub saved. They now share one centre with the
     paint, the door stack and every face disc. */
  .dl-c1 {
    left: calc(var(--face-cx) + 81.9 * var(--fpx));
    top: calc(var(--face-cy) + -152.1 * var(--fpx));
  }
  .dl-l {
    left: calc(var(--face-cx) + 148.3 * var(--fpx));
    top: calc(var(--face-cy) + -96.9 * var(--fpx));
  }
  .dl-o1 {
    left: calc(var(--face-cx) + 162.5 * var(--fpx));
    top: calc(var(--face-cy) + -13.5 * var(--fpx));
  }
  .dl-c2 {
    left: calc(var(--face-cx) + 141.1 * var(--fpx));
    top: calc(var(--face-cy) + 68 * var(--fpx));
  }
  .dl-k {
    left: calc(var(--face-cx) + 90 * var(--fpx));
    top: calc(var(--face-cy) + 129.5 * var(--fpx));
  }
  .dl-t {
    left: calc(var(--face-cx) + -100.4 * var(--fpx));
    top: calc(var(--face-cy) + 132.2 * var(--fpx));
  }
  .dl-o2 {
    left: calc(var(--face-cx) + -154.5 * var(--fpx));
    top: calc(var(--face-cy) + 67.9 * var(--fpx));
  }
  .dl-w {
    left: calc(var(--face-cx) + -177.5 * var(--fpx));
    top: calc(var(--face-cy) + -13 * var(--fpx));
  }
  .dl-e {
    left: calc(var(--face-cx) + -156.5 * var(--fpx));
    top: calc(var(--face-cy) + -96.7 * var(--fpx));
  }
  .dl-r {
    left: calc(var(--face-cx) + -97.5 * var(--fpx));
    top: calc(var(--face-cy) + -156.1 * var(--fpx));
  }
}

/* Golem fork: the FONT LAB — the top-left dev dropdown owning every
   lettering choice. Deliberately plain: it is a debug tool. */
#font-debug {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 96;
  font-size: 13px;
  .ik-toggle {
    margin-top: 4px;
  }
  .ik-panel {
    margin-top: 4px;
    background: rgba(8, 8, 12, 0.96);
    border: 1px solid #400;
    border-radius: 6px;
    padding: 8px;
    width: 300px;
    .ik-previews {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-bottom: 6px;
      .ik-pair {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        img {
          width: 96px;
          height: 96px;
        }
        span {
          font-size: 11px;
          opacity: 0.6;
        }
      }
    }
    .ik-row {
      display: flex;
      align-items: center;
      gap: 6px;
      .ik-label {
        width: 74px;
        opacity: 0.75;
        font-size: 12px;
      }
      input[type="range"] {
        flex: 1;
        accent-color: #a01414;
      }
      .ik-val {
        width: 34px;
        text-align: right;
        font-size: 11px;
        opacity: 0.7;
      }
    }
    .ik-acts {
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-top: 6px;
      button {
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: 1px solid #3d3d3d;
        border-radius: 6px;
        padding: 2px 12px;
        cursor: pointer;
        font-family: inherit;
        &:hover {
          border-color: #a01414;
        }
      }
    }
  }
  .fd-toggle {
    width: 30px;
    height: 26px;
    line-height: 26px;
    text-align: center;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #3d3d3d;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0.45;
    &:hover {
      opacity: 1;
      border-color: #a01414;
    }
  }
  &.open .fd-toggle {
    opacity: 1;
    border-color: #a01414;
  }
  .fd-rows {
    margin-top: 4px;
    background: rgba(8, 8, 12, 0.96);
    border: 1px solid #400;
    border-radius: 6px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    .fd-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      .fd-label {
        opacity: 0.75;
      }
      .fd-cycle {
        font-family: inherit;
        font-size: 12px;
        color: white;
        background: rgba(0, 0, 0, 0.55);
        border: 1px solid #3d3d3d;
        border-radius: 5px;
        padding: 1px 8px;
        cursor: pointer;
        min-width: 130px;
        text-align: center;
        &:hover {
          border-color: #a01414;
          color: #ff8a8a;
        }
      }
    }
  }
}

/* Night phase backdrop */
#app > .backdrop {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  pointer-events: none;
  background: black;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 1) 0%,
    rgba(1, 22, 46, 1) 50%,
    rgba(0, 39, 70, 1) 100%
  );
  opacity: 0;
  transition: opacity 1s ease-in-out;
  &:after {
    content: " ";
    display: block;
    width: 100%;
    padding-right: 2000px;
    height: 100%;
    background: url("assets/clouds.png") repeat;
    background-size: 2000px auto;
    animation: move-background 120s linear infinite;
    opacity: 0.3;
  }
}

@keyframes move-background {
  from {
    transform: translate3d(-2000px, 0px, 0px);
  }
  to {
    transform: translate3d(0px, 0px, 0px);
  }
}

#app.night > .backdrop {
  opacity: 0.5;
}
</style>
