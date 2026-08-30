<template>
  <li :style="zoom" :class="{ 'name-hover': nameHover }">
    <div
      ref="player"
      class="player"
      @dragover.prevent
      @drop="onRoleDrop($event); onPlayerDrop($event); onReminderDrop($event)"
      :class="[
        {
          dead: player.isDead,
          marked: session.markedPlayer === index,
          // FT-1314: this seat stands in the auto-mark tie-cross — both (or
          // all) tied chairs keep their noose VISIBLE and struck through:
          // tied, nobody hangs as it stands, a higher vote can still take
          // the mark.
          tied: isTieMarked,
          'no-vote': player.isVoteless,
          // FT-1315: the spent vote DROPS the veil when the town's tower
          // says so (ghostSpentMark 'shroud') — see shroudLifted.
          'shroud-lifted': shroudLifted,
          you: session.sessionId && player.id && player.id === session.playerId,
          'vote-yes': session.votes[index],
          'vote-lock': voteLocked,
          // the coin's toothed edge does not fill its circle, so whatever
          // sits under it shows through the gaps — the seat tells its own
          // CSS when a coin is covering the life disc
          'has-role': !!player.role.id,
          // this chair's character is in hand, waiting for the chair it goes
          // to — the seat's own version of the tray tile's `picked` mark
          'role-armed': roleArmed,
          // FT-1194: …and every OTHER chair is where it could land, so those
          // coins say 'click me' — a calm purple breath (see the style block).
          // Clears itself: drawerPick is nulled on landing and on cancel.
          'move-invite': moveInvite,
          // FT-861: this seat does not know what it is. The storyteller's
          // scan mark — see the amber name plate at the bottom of this file.
          believing: !!beliefChip,
          // FT-1107: the night is asking this client to point at players, and
          // this coin is one of the ones it can point at / has been pointed
          // at. Worn on the seat rather than only on the overlay so the coin
          // itself can answer (the gold ring below is `.player.night-chosen`,
          // not a border on a transparent disc laid over it — a ring drawn on
          // the overlay would sit at the disc's own square edge, not the
          // coin's).
          'night-target': nightPickable,
          'night-chosen': nightSlot >= 0,
          // FT-1291: ...and the storyteller has sent their answer, so the
          // ring is a READOUT now and not a control. The two classes above
          // both stay: a chosen coin must go on wearing its ring after the
          // send, because those picks are what the answer was about and
          // taking the marks away at the moment the answer arrives would
          // leave the player unable to see what they had chosen.
          'night-sent': nightPickLocked
        },
        player.role.team
      ]"
    >
      <!-- Golem fork (FT-848): the blood a death leaves has MOVED to the
           clock face — TownSquare's .blood-dial stains the dead seat's own
           wedge of the dial, so the tower gets bloodier as the town dies
           instead of the splatter hiding behind a coin (user call
           2026-08-18). Markup and splatStyle stay behind showSeatSplat
           rather than being deleted, the same way the night badges did. -->
      <div
        class="blood-splat"
        v-if="showSeatSplat && player.isDead"
        :style="splatStyle"
      ></div>
      <!-- the shroud covers the coin's top half, so "tap a seat" has to mean
           the whole seat: with a character in hand this lands it here, and
           with nothing in hand it is the death toggle it has always been -->
      <!-- FT-990: and because it covers the coin's top half, it is also one of
           the three boxes that have to carry the coin's hover — see showCard's
           own note. The ghost's art is `pointer-events: none`, so hovering the
           GHOST is hovering this div. -->
      <!-- FT-1022: and because it SITS ABOVE `.token` in stacking order without
           being its ancestor, it is also where a role-coin drag silently died.
           HTML5 drag-start is not a click: the browser's native search for a
           draggable source starts at the exact element the pointer went down
           on and walks up THAT element's own ancestors — it never crosses to
           a sibling. A drag begun anywhere in the shroud's box (the coin's top
           ~61%, the single biggest and most natural place to grab a coin) hit
           `.shroud`, found no draggable ancestor short of `.player`, and quit
           before `.token`'s own `draggable`/`dragstart` ever saw it — while a
           grab on the coin's exposed bottom third worked fine. The belief chip
           (FT-1006/1021) was the suspect, but it is a DESCENDANT of `.token`,
           not a sibling — a drag started on it walks up through `.token` and
           finds the coin's own `draggable` just fine (verified: dragging a
           dealt seat's coin from directly on its chip swaps the seat exactly
           like grabbing the bare coin does). The shroud's own click stays
           untouched — a plain click still ends as a click, same as the coin's
           own `@click="setRole"` living beside its `draggable` today. -->
      <!-- FT-1025: a SPECTATOR (plain player) may now start this same drag —
           but only off a seat that is not their own. Their own claimed
           seat's role is live game state, dealt by the host; every OTHER
           seat's role data on a player's client is a local-only display
           value (see roleUnseat.js's onDocDrop for the rest of the
           boundary). `isOwnSeat` is the one case a spectator is still
           refused; the host's `!session.isSpectator` branch is untouched. -->
      <!-- FT-1213: the three role-drag handles read `canDragCoin` now — the
           identical expression they each restated, with the "Drag roles"
           toggle folded in at the one place all four surfaces share. -->
      <div
        class="shroud"
        :draggable="String(canDragCoin)"
        @dragstart="onRoleDragStart"
        @click="onLifeClick"
        @mouseenter="onCoinEnter"
        @mouseleave="onCoinLeave"
      ></div>
      <!-- FT-985: the seat's Roman numeral USED TO LIVE IN HERE, and that is
           why it only ever appeared with the grimoire hidden. The life token
           and the role coin are the two faces of one flip: `.life` is turned
           away (`rotateY(180deg)` + `backface-visibility: hidden`) whenever
           the grimoire is revealed, so everything inside it went with it.
           The numeral is now `.player`'s own child, below the coin — see
           `showSeatNumeral`. -->
      <!-- FT-990: the second of the coin's three boxes — the blank face. It
           is turned away and takes no pointer at all, and since FT-1294 (the
           face-down grimoire's retirement) there is no view that turns it
           back: the coins always show their characters. The box stays because
           it is half of the coin's flip geometry and the dead-coin art hangs
           on it; see the `.life` rules in the style block. -->
      <div
        class="life"
        @click="onLifeClick"
        @mouseenter="onCoinEnter"
        @mouseleave="onCoinLeave"
      ></div>

      <!-- The seat's night-order badges are RETIRED (user call 2026-08-18):
           the storyteller's night checklist replaces them. Markup and styles
           stay in the file behind showNightBadges rather than being deleted,
           so the old read is one flag away while the checklist is built. -->
      <div
        class="night-order first"
        v-if="showNightBadges && nightOrder.get(player).first"
      >
        <em>{{ nightOrder.get(player).first }}.</em>
        <span v-if="player.role.firstNightReminder">{{
          player.role.firstNightReminder
        }}</span>
      </div>
      <div
        class="night-order other"
        v-if="showNightBadges && nightOrder.get(player).other"
      >
        <em>{{ nightOrder.get(player).other }}.</em>
        <span v-if="player.role.otherNightReminder">{{
          player.role.otherNightReminder
        }}</span>
      </div>

      <!-- FT-854: a seated role DRAGS — to another chair (swap) or into
           the drawer (unassign) -->
      <!-- FT-990: `hover-card` STAYS FALSE. The coin component has its own
           working hover card, and turning it on here would have been the
           one-word version of this change — but the seat's card is the one
           with the anchor logic, the traveler rule and the plate/coin lean
           (see showCard below), and two cards on one seat is two answers to
           the same hover. The seat keeps ONE card, with one anchor; the coin
           just becomes a third way to ask for it. -->
      <!-- FT-1080: `belief` IS NO LONGER PASSED, and that is the whole fix —
           see the belief dock below. Token.vue still takes the prop and still
           carries the chip's markup, computed and styles; nothing there was
           thrown away, it simply has no consumer while the chip is docked at
           seat level. -->
      <Token
        :role="player.role"
        :hover-card="false"
        :draggable="String(canDragCoin)"
        @dragstart.native="onRoleDragStart"
        @mouseenter.native="onCoinEnter"
        @mouseleave.native="onCoinLeave"
        @set-role="onCoinSetRole"
      />

      <!-- FT-1080 — THE BELIEF CHIP'S DOCK, and why the chip had to leave the
           coin (user: "it kind of does already, but only if my mouse comes in
           from the left side — so the hover state for the drunk is overriding
           the hover of their belief?").
           MEASURED, not argued (claude_temp_test/2026-08-23-ft1080-probe.mjs).
           `elementFromPoint` over five points of the chip's own rect, before:

             seat            centre  north   east            west
             #0 chip-right   shroud  shroud  belief-chip     shroud
             #3 chip-left    shroud  shroud  shroud          belief-chip

           Only the sliver hanging clear of the coin answered — which is
           exactly "it works from one side". The cause is stacking, not
           geometry: `.player .token` carries `transform: perspective(400px)
           rotateY(0deg)` (and Token's own `filter: drop-shadow`), each of
           which opens a STACKING CONTEXT, so the chip's `z-index: 4` is spent
           inside the coin and can never out-rank `.shroud` — a SIBLING of the
           coin, `z-index: 2`, and a live pointer target across the coin's top
           45%. No z-index inside `.token` can reach past it.

           Raising `.token` instead would have put the coin's art over the
           shroud's veil (the veil is `.shroud`'s own `:before`/`:after`, so it
           rides whatever the shroud rides), which is why the chip moves rather
           than the coin.

           THE DOCK reproduces `.token`'s PADDING BOX exactly — inset by the
           coin's own 3px transparent border, square — so every percentage in
           the chip's geometry means what it meant inside the coin, and the
           chip lands pixel-identically. It takes no pointer itself; the chip
           does.

           `z-index: 2` + sitting after `<Token>` in the DOM is deliberate: it
           clears `.shroud`/`.life`/`.token` (which come earlier) and still
           loses to `.overlay` and the nominate mark (same z, later in the
           DOM), which is precisely where the chip already stood.

           The `draggable` pair is not decoration: FT-1022 recorded that a
           coin-drag begun ON the chip worked because the chip was a DESCENDANT
           of `.token` and the browser's search for a drag source walks up its
           own ancestors only. A sibling has to carry its own — the same pair
           `.shroud` carries, for the same reason. -->
      <div class="belief-dock" v-if="beliefChip">
        <button
          v-if="beliefChip.id || beliefChip.placeholder"
          type="button"
          class="belief-chip"
          :class="[
            beliefChip.team,
            nominateMarkMirrored ? 'chip-left' : 'chip-right'
          ]"
          :title="
            beliefChip.placeholder
              ? 'This character believes it is something else — click to set what they were told'
              : `Believes they are the ${beliefChip.name} — click to change what they were told`
          "
          :aria-label="
            beliefChip.placeholder
              ? 'Set what they believe they are'
              : `Believes they are the ${beliefChip.name}`
          "
          :draggable="String(canDragCoin)"
          @dragstart="onRoleDragStart"
          @click.stop="
            hideCard();
            $emit('trigger', ['openBeliefModal']);
          "
          @mouseenter="showBeliefCard"
          @mouseleave="hideBeliefCard"
        >
          <span
            class="belief-icon"
            :class="{ unset: beliefChip.placeholder }"
            :style="
              beliefChip.placeholder
                ? null
                : { backgroundImage: `url(${beliefIcon})` }
            "
            >{{ beliefChip.placeholder ? "?" : "" }}</span
          >
        </button>
      </div>

      <!-- FT-858: the seat's read is THE role hover card — the same component
           the Almanac workbench's shelf and the grimoire drawer use
           (user-directed: one component, every surface).
           FT-990 amends the old note here, which said the seat owned the hover
           "rather than the coin, because the shroud and the life token sit over
           the coin's top half and would swallow it there". That is still TRUE
           and is no longer a REASON: the three boxes that cover the coin now
           each carry the hover themselves, so being swallowed by one of them is
           the same as being caught by the coin. What the plate keeps is the
           card's preferred SIDE — see cardPrefer. -->
      <!-- FT-1069 rider: the belief chip is a fourth way to ask for the card,
           and the one way that asks about the LIE — resting on the chip reads
           the BELIEVED role (beliefCardRole), every other doorway reads the
           truth. Same single card either way. -->
      <RoleHoverCard
        v-if="cardAnchor"
        :role="beliefCardRole || player.role"
        :anchor="cardAnchor"
        :prefer="cardPrefer"
        @dismiss="hideCard"
      />

      <!-- FT-1180 — THE SEAT'S ACTIONS, TWO PRESENTATIONS.
           FT-1169 built ONE menu and opened it from both non-click schemes.
           The user's verdict: "you reused the elements for both the nameplate
           click and the hover coin which made them both bad." So there are
           two components now and they share exactly one thing — the list of
           acts, in golem/seatActions. Neither knows the other exists, and
           there is deliberately no `variant` prop.

             SeatRing   the HOVER scheme. Little coins hung on the player's
                        own rim, gears touching, the way the reminder tokens
                        sit (FT-1167's geometry, in screen space).
             SeatMenu   the NAMEPLATE scheme. A glassy plate laid ON the coin
                        — the user: "it shouldn't be to the side."

           Both are bound here, inside `.player`, purely so the seat owns
           their lifetime — what actually PAINTS is moved onto document.body
           when it mounts, because a fixed-position box inside one of these
           rotated, clipped seats is re-rooted to the seat's own transform and
           every viewport number it computes would be a lie. Same move
           RoleHoverCard directly above makes, for the same reason; both do it
           through a PORTAL (the root stays here, only the plate/ring travels)
           because moving the root itself broke Vue's sibling patching on this
           very seat — the crash and its measurement are written up in
           SeatMenu's own template note.

           `owner` is this seat's <li>: a press on the plate or the coin that
           opened the menu is not a press OUTSIDE it, and neither is a grab on
           one of the drag handles the user insisted stay live in every
           scheme. -->
      <SeatRing
        v-if="seatMenuAnchor && seatMenuMode === 'ring'"
        :anchor="seatMenuAnchor"
        :outward="seatMenuOutward"
        :entries="seatMenuEntries"
        :nominate-mirrored="nominateMarkMirrored"
        :owner="$el"
        @pick="runSeatAction"
        @dismiss="closeSeatMenu"
        @hold="onSeatMenuEnter"
        @release="onSeatMenuLeave"
      />
      <SeatMenu
        v-if="seatMenuAnchor && seatMenuMode === 'plate'"
        :anchor="seatMenuAnchor"
        :outward="seatMenuOutward"
        :nominate-mirrored="nominateMarkMirrored"
        :entries="seatMenuEntries"
        :owner="$el"
        :drag-live="canDragCoin || canDragPlayer"
        @pick="runSeatAction"
        @dismiss="closeSeatMenu"
        @seat-drag="onPlateSeatDrag"
        @hold="onSeatMenuEnter"
        @release="onSeatMenuLeave"
      />

      <!-- FT-1206: THE SEAT'S WHISPER BOX — one inline input, whichever of
           the three schemes opened it (the plate's Whisper row, the ring's
           coin, the click scheme's plate-side disc). Bound here for the same
           lifetime reason as the two menus above; it travels to the body
           through the same portal move. On the plate scheme, dismissing it
           brings the plate back — the input IS the plate's swapped content,
           per the user's spec. -->
      <SeatWhisper
        v-if="whisperAnchor"
        :anchor="whisperAnchor"
        :name="player.name || 'this player'"
        :owner="$el"
        @send="sendSeatWhisper"
        @dismiss="closeSeatWhisper"
      />

      <!-- FT-985 — THE SEAT'S ROMAN NUMERAL (user call: "have them appear if
           the grimoire is revealed and there is no role token on the seat").
           It sits AFTER the coin on purpose: same-z-index siblings paint in
           DOM order, and the numeral has to land on top of the coin that is
           actually facing the viewer. Never inside `.life` again — that face
           is turned away in exactly the state this mark is now for. -->
      <!-- FT-1317: the numeral's SPAN moved a few siblings down, below the
           claim overlay — same z, same paint, but now inside the overlay's
           `:hover ~` reach so it can step aside while the claim invitation
           is up (on seat IIII the invitation's chair interleaved with the
           numeral's four strokes and read as a letter salad). -->

      <!-- Overlay icons -->
      <div class="overlay">
        <!-- FT-974b: the two answers to a nomination. The Font Awesome glyph
             pair (a red `hand-paper` and a blue `times`) is RETIRED in favour
             of our own painted pair — both icons stay registered in main.js
             and the markup stays here behind `showGlyphVotes`, the same way
             `showBallotVote` and `showNightBadges` do.
             They are replaced TOGETHER on purpose: they are one pair
             answering one question, and repainting only the X would leave a
             painted mark beside a vector one. -->
        <font-awesome-icon
          icon="hand-paper"
          class="vote"
          title="Hand UP"
          @click="vote()"
          v-if="showGlyphVotes"
        />
        <font-awesome-icon
          icon="times"
          class="vote"
          title="Hand DOWN"
          @click="vote()"
          v-if="showGlyphVotes"
        />
        <!-- User call 2026-08-28: a MINIATURE GLASS DISC — the face disc's
             own material at coin size — grounds the vote mark, so the mark
             never fights the coin's art for contrast. Revealed by the same
             states that reveal a mark (CSS below). -->
        <div class="vote-glass" aria-hidden="true" v-if="!showGlyphVotes"></div>
        <div
          class="vote-mark yes"
          title="Hand UP"
          :style="{ '--vote-aim': voteAimDeg + 'deg' }"
          @click="vote()"
          v-if="!showGlyphVotes"
        ></div>
        <div
          class="vote-mark no"
          title="Hand DOWN"
          @click="vote()"
          v-if="!showGlyphVotes"
        ></div>
        <font-awesome-icon
          icon="times-circle"
          class="cancel"
          title="Cancel"
          @click="cancel()"
        />
        <font-awesome-icon
          icon="exchange-alt"
          class="swap"
          @click="swapPlayer(player)"
          title="Swap seats with this player"
        />
        <font-awesome-icon
          icon="redo-alt"
          class="move"
          @click="movePlayer(player)"
          title="Move player to this seat"
        />
        <!-- FT-1069: the target pick wears the NOOSE, not the hand — picking
             who stands trial is a gallows act, and the hand moved to the
             nominate mark (the cowl slot) where "this player points" lives.
             The FA glyph stays registered in main.js and its markup stays
             here behind `showGlyphNominate`, the same way `showGlyphVotes`
             keeps the old vote pair. -->
        <font-awesome-icon
          icon="hand-point-right"
          class="nominate"
          @click="nominatePlayer(player)"
          title="Nominate this player"
          v-if="showGlyphNominate"
        />
        <div
          class="nominate-target"
          title="Nominate this player"
          @click="nominatePlayer(player)"
          v-if="!showGlyphNominate"
        ></div>
      </div>

      <!-- Golem fork: ONE-TAP CLAIM — a spectator sees an empty seat as
           claimable directly; no hidden name-menu required.
           FT-1070: a SEATED player sees it too, as MOVE — the same claim ride
           end to end (oneTapClaim → TownSquare.claimSeat → the socket's
           claim → the host's _updateSeat), whose host side has always freed
           the claimant's previous chair when confirming the new one. Only
           the gate was still insisting on seatlessness; canOneTapClaim
           dropped that clause, and the overlay just says which of the two
           acts this click is. -->
      <div
        class="claim-overlay"
        :class="{ asking: askName }"
        v-if="canOneTapClaim"
        @click="oneTapClaim"
        :title="
          isSeatedElsewhere
            ? 'Move to this seat — your old chair is freed'
            : 'Take this seat'
        "
      >
        <template v-if="!askName">
          <!-- FT-1242: FA `chair` stood down — the seat vocabulary's own
               chair (ui-seat-front.svg since FT-1317, HostTools' Seats row)
               says it instead. FT-1337: a masked SPAN reading the chair
               lab's var(--chair), not a baked img. -->
          <span class="pm-mark chair-mark" aria-hidden="true"></span>
          <span>{{ isSeatedElsewhere ? "Move" : "Claim" }}</span>
        </template>
        <!-- First claim on this browser: ask the name in place, no dialog. -->
        <template v-else>
          <!-- FT-1342 (user): no ghost text — the box asks plainly and the
               aria-label keeps the field named for screen readers. -->
          <input
            ref="nameInput"
            v-model="claimName"
            aria-label="Your name"
            spellcheck="false"
            @click.stop
            @keyup.enter.stop="submitClaimName"
          />
          <span class="go" @click.stop="submitClaimName">
            <font-awesome-icon icon="check" />
          </span>
        </template>
      </div>

      <!-- FT-1317: AN EMPTY SEAT SAYS SO AT REST. Until now emptiness was a
           bare coin + the "Open" plate, and the chair invitation only
           appeared on hover — from across the table an open seat looked like
           any undealt one. This is the chair mark resting quietly ON the
           empty coin, always: the claimed seat's own badge language (the
           same art, the same FT-1283 stone ink and quiet), sat low on the
           coin's face because the seat's Roman numeral owns the centre of
           every roleless coin. It takes no pointer — every click falls
           through to whatever owns the coin today — and it MUST sit AFTER
           `.claim-overlay` in the DOM: the overlay's `:hover ~` reach is how
           the resting chair steps aside while the big claim invitation (its
           own chair + word) is up. Gated like the claimed badge (a live
           session) so a local grimoire under construction is not wallpapered
           with chairs. -->
      <div
        class="open-mark"
        v-if="!player.id && session.sessionId"
        aria-hidden="true"
      ></div>

      <!-- FT-985's numeral (see its note beside the coin) — parked HERE since
           FT-1317 so `.claim-overlay:hover ~` can reach it. -->
      <span class="seat-numeral" v-if="showSeatNumeral">{{ seatNumeral }}</span>

      <!-- ── FT-1107 (user): THE NIGHT'S OWN CLICK ON THIS COIN ───────────
           "The interaction should happen on the clock face."

           While the night is asking THIS client to choose players, every
           coin on the ring becomes a target and this is the thing that takes
           the tap. It is the `.claim-overlay` idiom directly above, for the
           same reason that one exists: a seat is a stack of live boxes (the
           shroud, the life token, the chair, the accusing hand, the coin
           itself), and the only way to be certain a night pick cannot fire
           one of them by accident is for the pick to physically cover them
           all. A whole-coin disc at a higher z-index than any of them means
           a tap at night reaches exactly one handler — this one — and there
           is no ordering question to get wrong later.

           That is also why it is not a modifier on `onLifeClick`: the
           accusing hand and the vote buttons are SIBLINGS of the shroud, not
           inside it, so a guard added there would have left them live.

           It renders only while the night is actually asking (`nightPickable`
           — false for the storyteller, false for a seat that does not wake
           tonight, false in a town that is not sharing the night, false for
           a character whose answer is words rather than seats), so outside
           that moment the seat behaves exactly as it always has.

           A tap on an UNCLAIMED chair is a night pick and not a seat claim
           for as long as it is up. That is the right way round: a player who
           is mid-answer is far likelier to be pointing at an empty chair's
           character than to be changing seats at three in the morning, and
           the claim is one click away again the moment the ask closes. -->
      <!-- FT-1291: the overlay STAYS UP on a sent row rather than being
           v-if'd away, and that is a deliberate choice about what the ring is
           for. Dropping it would hand the seat's ordinary handlers back at the
           worst possible moment — the tap that was meant to change a pick
           would land on a nomination or a vote instead — and it would take the
           chosen marks down with it (`nightSlot` reads -1 without it). So it
           stands, inert: it still covers the seat, it still shows what was
           chosen, and it no longer answers. -->
      <div
        class="night-pick"
        :class="{ picked: nightSlot >= 0, locked: nightPickLocked }"
        v-if="nightPickable"
        :title="nightPickTitle"
        @click.stop="nightPick"
      >
        <span class="np-mark" v-if="nightPickMark">{{ nightPickMark }}</span>
      </div>

      <!-- Claimed seat icon.
           FT-1070: the chair ANSWERS now — the seat menu's retirement
           (FT-1068) orphaned "Empty seat" and "Vacate seat", and both were
           chair acts, so the chair icon is where they live:
             · the HOST clicks any claimed chair → the seat empties, the
               person stays in the town as a spectator (the menu row's exact
               call — updatePlayer('id', '', true) — and its exact guard:
               a claimed seat in a live session, storyteller side)
             · a seated PLAYER clicks their OWN chair → they stand up
               (TownSquare.claimSeat sees its own seat and vacates — the
               menu's "Vacate seat" toggle, verbatim)
             · anyone else's chair stays furniture — no handler fires
               (chairAct gates cursor and title the same way). -->
      <!-- FT-1073c (user): the chair and the accusing hand can't share a
           side — the chair takes the OPPOSITE of the hand's pointing side
           (hand left → chair right, and vice versa; pure geometry, so it
           holds even while the hand itself is hidden). -->
      <!-- FT-1244: FA `chair` stood down here too — the badge wears the
           app's own chair (ui-seat-front.svg since FT-1317) as a CSS mask,
           painting
           `currentColor` through the art's alpha, so every colour state
           this badge has (resting white, `.you` blue, the red-to-white
           claim animation, the actor hover ink) keeps riding `color`
           exactly as it did on the font glyph. The FA name stays
           registered in main.js. -->
      <!-- FT-1271 (user): `chair-right` now does TWO jobs — it has always
           picked the corner opposite the hand, and it now also FLIPS the art
           so the chair FACES THE CLOCK, the same point-at-the-face rule the
           nominate hand obeys. No new binding was needed: the class already
           carried exactly the fact the flip wants (`!nominateMarkMirrored` =
           this seat is on the ring's right half, so the clock's centre is to
           its left). Which way the art is drawn, and why the transform lands
           on the pseudo rather than the span, are in the `.player .seat` rule.
           The badge is also quieter at rest there — same rule. -->
      <span
        v-if="player.id && session.sessionId"
        class="seat"
        :class="{
          highlight: session.isRolesDistributed,
          actor: chairAct,
          'chair-right': !nominateMarkMirrored,
        }"
        :title="chairTitle"
        @click="chairClick"
      ></span>

      <!-- Ghost vote icon.
           FT-974: the ballot box is RETIRED in favour of our own mark — a
           raised spectral hand: the app's existing vote word is `hand-paper`,
           and this is that hand with a ghost's hem for a wrist. One
           silhouette carrying both meanings, because the mark renders at
           ~30px and a 30px box cannot hold two objects (measured: the
           earlier "small ghost + raised arm" read as a lump, and a five
           fingered hand read as a comb).
           FT-991: redrawn as `ui-ghost-vote-cowl.png` so it is the same hand
           that drew the seat's cowl — the scalloped hem became a TORN one and
           the two eyes in the palm came out, which are the two conventions
           FT-990 named as the cartoon. Nine candidates, judged at true size on
           a real seat; see the `.ghost-vote` rule for the table and for why the
           highest-scoring one was not taken.
           Font Awesome's `vote-yea` stays registered in main.js and the
           markup stays here behind `showBallotVote`, the same way this file
           already keeps `showNightBadges` and `showSeatSplat` — the old read
           is one flag away. -->
      <font-awesome-icon
        icon="vote-yea"
        class="has-vote"
        v-if="showBallotVote && player.isDead && !player.isVoteless"
        @click="updatePlayer('isVoteless', true)"
        title="Ghost vote"
      />
      <!-- FT-1046 (user): spending the ghost vote no longer vanishes the
           cowl — it crosses out and fades, and a click toggles the state
           back, so a misclick is one click to undo. -->
      <!-- FT-1249 (user): "make it so it just sits where the nomination hand
           is if the player is dead" — the cowl takes the hand's own corner,
           riding the same side fact (points-right mirrors with the seat),
           instead of always-right. Dead players don't nominate, so the two
           marks never want the corner at once (the vocabulary's own rule). -->
      <!-- FT-1315: in the tower's "shroud" vocabulary the SPENT state is the
           veil dropping (shroudLifted on the seat root), so the crossed cowl
           stands down — two marks for one fact would say it twice. The
           UNSPENT cowl stays in both modes (it is the mark of the vote in
           hand, and its click is still how the host spends it); giving a
           spent vote back keeps its door through the seat menu's own
           ghost-vote row. -->
      <div
        class="has-vote ghost-vote"
        :class="{
          spent: player.isVoteless,
          'points-right': nominateMarkMirrored,
        }"
        v-if="!showBallotVote && player.isDead && !shroudLifted"
        @click="updatePlayer('isVoteless', !player.isVoteless)"
        :title="player.isVoteless ? 'Ghost vote spent' : 'Ghost vote'"
      >
        <!-- FT-1046c (user): the spent mark is the app's own X. -->
        <font-awesome-icon
          v-if="player.isVoteless"
          icon="times"
          class="spent-x"
        />
      </div>

      <!-- FT-1068: THE NOMINATE MARK — the cowl slot's LIVING occupant.
           The seat menu is retired (see the flag below); its "Nomination"
           row survives as this mark, worn exactly where the dead wear the
           ghost-vote cowl — that corner is free on a living seat, and
           ghosts cannot nominate anyway (user call). Storyteller only,
           like the row it replaces, and gone while a nomination is already
           running (the row's own v-if). Clicking it is the row's exact
           act — `nominatePlayer()` with no target, which arms THIS seat as
           the NOMINATOR on TownSquare's channel; the big overlay icon on
           the seat they point at finishes the nomination, and the armed
           seat's own X cancels, both untouched. NOT hidden on the public
           grimoire the way the cowl is: the day phase is exactly when the
           storyteller nominates, and the menu row never hid there.
           FT-1069 (user): this mark is the HAND now, not the noose — the
           hand is the app's "points at someone" word and the noose is the
           gallows' word: it moved to the target pick and the
           marked-for-execution seat, where the gallows actually is. One
           hand = pointing, one noose = hanging.
           FT-1069d (user): and it is the user's OWN hand now — a real
           accusing pointing-hand silhouette they supplied, run through the
           same stylize/bake treatment an uploaded custom icon gets
           (`stylizeIcon(src, { tint: "neutral" })`, see
           claude_temp_test/2026-08-22-ft1069d-bake-hand.mjs for the exact
           port), replacing the earlier geometric manicule. ui-nominate-hand.svg
           stays on disk (never-delete) but is retired; the mark now reads
           ui-nominate-hand.png. The art always points at the clock face:
           the inner `.nominate-mark-art` element carries the image and the
           mirror (the outer div — box, halo, hit target — never moves). -->
      <!-- FT-1073b (user): the mark sits on the SIDE it points FROM — a
           left-pointing hand on the coin's left, a right-pointing one on
           the right (the outer box carries the side; the inner art the
           flip). -->
      <div
        class="nominate-mark"
        :class="{ 'points-right': nominateMarkMirrored }"
        v-if="!player.isDead && !session.isSpectator && !session.nomination"
        @click="nominatePlayer()"
        title="This player nominates — then pick who they point at"
      >
        <i
          class="nominate-mark-art"
          :class="{ mirrored: nominateMarkMirrored }"
        ></i>
      </div>

      <!-- FT-1271: THE WHISPER MARK — the same corner, for the other viewer.
           The hand above is the storyteller's; this is the player's, and it
           rides the identical geometry and the identical `points-right`
           mirroring so the two read as siblings on the same slot rather than
           as two marks that happen to be near each other. Its click is the
           click scheme's disc's own handler (`onWhisperDiscClick` — open,
           toggle shut, and re-check the refusal), so the seat still has ONE
           whisper path: `openSeatWhisper` → SeatWhisper.vue → the Chronicle's
           own `whisperFrame`/`chatSay` funnel (FT-1206's one-send-path rule).
           `stacked` steps it clear of the ghost-vote cowl on a dead seat —
           see whisperMarkStacked. -->
      <div
        class="whisper-mark"
        :class="{
          'points-right': nominateMarkMirrored,
          stacked: whisperMarkStacked,
        }"
        v-if="whisperMarkShown"
        @click="onWhisperDiscClick"
        :title="whisperDiscTitle"
      >
        <font-awesome-icon icon="comment-dots" />
      </div>

      <!-- On block icon.
           FT-1069 (user): "if they are actually marked for execution the
           noose should be the indicator, not that skull, and in the middle
           of the noose it should say how many votes they got." The skull
           stays behind `showSkullMarked` the way every retired glyph here
           does; the tally comes from markedVotes below and simply stays
           off the art when no count is known. -->
      <!-- FT-1314: `.is-struck` — the tie-cross. The same noose, cancelled
           by a bar (the vote card's own is-struck grammar): this chair tied
           the block at the tally shown, and nobody hangs as it stands. -->
      <div class="marked">
        <font-awesome-icon icon="skull" v-if="showSkullMarked" />
        <div
          class="marked-noose"
          :class="{ 'is-struck': isTieMarked }"
          v-if="!showSkullMarked"
        >
          <span class="tally" v-if="markedVotes !== null">{{
            markedVotes
          }}</span>
        </div>
      </div>

      <!-- FT-1075 rider: WHO STANDS WHERE, worn on the coins. For as long as
           a nomination runs — opened to resolved or cancelled — the two
           involved seats wear their role ON THE COIN, on every client, host
           and player alike: who accuses whom is public. The accuser's coin
           carries the accuse hand (the user's own art, the same bitmap as
           the per-seat nominate mark, mirrored by side so it points at the
           clock face), the accused's coin the noose — the app's one word
           for "pointing" and its one word for "the block", at coin scale.
           The accused seat that is ALREADY marked for execution keeps the
           tally noose above instead of wearing a second one — see voteRole
           below. Same anatomy as `.marked`: full-seat box, centered art,
           dark halo, pointer-events none. -->
      <div class="vote-role" v-if="voteRole">
        <i
          v-if="voteRole === 'accuser'"
          class="vote-role-art vote-role-hand"
          :class="{ mirrored: nominateMarkMirrored }"
        ></i>
        <i v-else class="vote-role-art vote-role-noose"></i>
      </div>

      <!-- FT-923: THE BRIDGE. The plate and the add-reminder disc below are a
           real gap apart (`GAP` in measureAddAnchor) — a straight-line cursor
           move from one to the other crosses that gap's dead ground, where
           `nameHover` (set by `.name`'s own mouseenter/mouseleave) is false
           and the disc's opacity gate has already dropped it, so the disc is
           gone before the cursor arrives. This div is invisible and occupies
           exactly that ground (`addBridgeStyle`, computed from the same
           `addAnchor` the disc itself is placed from), so there is no dead
           ground to cross — not a delay that papers over one. It renders
           BEFORE `.name` and the disc in this file on purpose: same-z-index
           siblings paint in DOM order, this has no z-index of its own to win
           with, and the couple of pixels it overlaps into each neighbour
           (guarding subpixel rounding between three independently-measured
           boxes) must still belong to THEM for clicks and hover, not to a
           blank bridge. `addAnchor` null (pre-first-measurement) hides it the
           same way it already hides the disc. -->
      <div
        class="name-bridge"
        v-if="addAnchor"
        :style="addBridgeStyle"
        @mouseenter="nameHover = true"
        @mouseleave="nameHover = false"
      ></div>

      <!-- FT-966: THE PLATE DRAGS TOO — the seat-to-seat move/swap the menu's
           two-step "Move player"/"Swap seats" rows already do, on a second
           channel a pointer can reach in one gesture. Occupancy alone picks
           the outcome, exactly the way dragging a CHARACTER onto a chair
           already works (empty chair: placed; occupied chair: traded) —
           see onPlayerDrop below and TownSquare's dragPlayer. Draggable only
           for a claimed seat (an "Open" plate has no player to carry) and
           never for a spectator, mirroring Token's own draggable gate. -->
      <!-- FT-1026 (user call, 2026-08-21): the plate no longer raises the role
           card — the hover belongs to the COIN alone. Retires the FT-858
           plate-park (2026-08-19); showCard's fromPlate branch stays for the
           day it is wanted back. -->
      <!-- FT-1169: the plate's click is routed by the control scheme now —
           see onPlateClick. The plate's HOVER is untouched in all three
           schemes (it reveals the add-reminder disc, and the user's own spec
           says the nameplate hover keeps doing what it does today). -->
      <!-- FT-1213: the plate's drag reads `canDragPlayer` (which now carries
           the "Drag names" toggle), and the mousedown/dragstart pair below is
           the click-vs-drag arbiter — the reminder token's own idiom (see
           onPlateClick). -->
      <div
        class="name"
        @click="onPlateClick"
        @mousedown="plateDragged = false"
        @mouseenter="nameHover = true"
        @mouseleave="nameHover = false"
        :class="{ active: isMenuOpen || !!seatMenuAnchor, renaming }"
        :draggable="String(canDragPlayer)"
        @dragstart="onPlayerDragStart"
      >
        <!-- an unclaimed chair says so instead of a fake name (user call) -->
        <span>{{ player.id ? player.name : "Open" }}</span>
        <font-awesome-icon icon="venus-mars" v-if="player.pronouns" />
        <div class="pronouns" v-if="player.pronouns">
          <span>{{ player.pronouns }}</span>
        </div>

        <!-- FT-1319: RENAME FROM YOUR OWN PLATE. A seated player clicking
             their OWN name plate opens this in-place ask (onPlateClick's
             first branch); every other viewer's plate click is untouched —
             the storyteller's plate menu, a spectator's inert click on
             someone else's chair. It wears the claim ask's own dress — the
             purple-outlined box, `.claim-overlay.asking`'s input inks —
             and it lives INSIDE `.name` on purpose: the plate's rendered
             box is the one place that is, by definition, "on the plate" in
             every seat's rotated frame (the claim overlay solves the same
             placement by restating the plate's geometry from the seat's
             own child list; from in here nothing needs restating). Commit
             rides the claim flow's one send path: the players/update name
             commit, which socket.js's sendPlayerName already guards to
             your own seat and puts on the wire — plus the same
             `golem.playerName` stash submitClaimName writes, so the next
             claim offers the new name too. -->
        <div class="rename-ask" v-if="renaming" @click.stop>
          <!-- FT-1342 (user): no ghost text (it read under the typed name);
               the aria-label keeps the field named for screen readers. -->
          <input
            ref="renameInput"
            v-model="renameValue"
            aria-label="Your name"
            spellcheck="false"
            maxlength="60"
            @click.stop
            @keyup.enter.stop="commitRename"
            @keyup.esc.stop="cancelRename"
          />
          <span class="go" @click.stop="commitRename">
            <font-awesome-icon icon="check" />
          </span>
        </div>
      </div>

      <!-- FT-911 (fourth raising, fixed wrong twice — this is the disc that
           opens `addReminder()`/`openReminderModal`, not the ability card
           and not the role hover card, which is what the two failed
           attempts moved instead): THE ADD-REMINDER DISC LIVES BESIDE THE
           PLATE NOW, not on the coin. It moved from being `<li>`'s OWN
           direct-child sibling (where the ring's `margin-top: 68%` parked
           it on the coin's rim — see the CSS below for that history) to
           HERE, a sibling of `.name` inside `.player`, because `.player`
           already carries its own counter-rotation (the on-circle mixin's
           `> * { rotate($rot * -1deg) }`) which composes with the seat's
           own rotation to a PURE TRANSLATION for everything inside it — no
           residual rotation, no residual scale. A plain measured
           top/left/size therefore lands exactly where it reads on screen,
           the same free ride `.name` itself already gets; done as `<li>`'s
           own direct sibling, this disc would need to solve that a second
           time for its own, different pivot. `addAnchor` (measured in
           `measureAddAnchor`) carries the plate's own height and which side
           of the plate this seat's outward vector puts it on; it stays
           null — hiding the disc, same as the opacity-gated default already
           did — for the one render before the first measurement lands. -->
      <!-- FT-923: the disc also keeps `nameHover` alive on its own hover —
           necessary once the cursor actually reaches it (the bridge above
           only covers the ground BETWEEN the plate and here), but not
           sufficient by itself, since it does nothing about the gap the
           cursor crosses getting here. `mouseleave` still clears the flag,
           so the disc still hides once the cursor leaves the whole plate +
           bridge + disc region out the far side. -->
      <!-- FT-1213: the disc answers the "Reminder button" toggle — the first
           of the formerly-unconditional gestures to become switchable. Only
           the HOVER disc is gated; the menu row / ring coin "Add reminder"
           doorways stand regardless, so the act itself is never lost. The
           whisper disc beside it measures off the PLATE (addAnchor), not off
           this element, so it keeps its dock when this one is off. -->
      <!-- FT-1319: the pin steps OUT of hover — `pin-rest` (the default;
           see the computed) stands the disc up at rest in a quiet stone
           register, brightening on the plate's hover exactly as the hidden
           state used to reveal. The "On hover" setting (PlayerSettings.vue)
           drops the class and the FT-923 reveal below is once again the
           only way the disc shows. -->
      <div
        v-if="ctrlReminderHover"
        class="reminder add"
        :class="{ 'pin-rest': pinResting }"
        :style="addAnchorStyle"
        @click="$emit('trigger', ['openReminderModal'])"
        @mouseenter="nameHover = true"
        @mouseleave="nameHover = false"
      >
        <span class="icon"></span>
      </div>

      <!-- FT-1206: THE WHISPER DISC — the click scheme's seat-whisper
           doorway, docked beside the add-reminder disc on the plate's own
           hover surface (the user: "an icon left of the custom note on
           hover nameplate"). Its own class, NOT `.reminder`: the reminders
           are the storyteller's own writing and used to go dark when the
           coins faced the room, while whispering is the one seat act a PLAYER
           owns and had to survive exactly the view the players live in.
           (FT-1294 retired that rule with the face-down state; the separate
           class stays — the two discs are different acts.) Same measured
           geometry as the add disc, one
           disc further out (whisperDiscStyle). Refused states stay drawn,
           dim, with the reason on the tooltip — the fixed-list rule. -->
      <!-- FT-1206: the corridor-keeper — renders BEFORE the disc so the
           disc's own pixels stay the disc's (same paint-order note as the
           FT-923 bridge above). -->
      <div
        class="whisper-bridge"
        v-if="whisperDiscShown"
        :style="whisperBridgeStyle"
        @mouseenter="nameHover = true"
        @mouseleave="nameHover = false"
      ></div>
      <div
        class="whisper-disc"
        v-if="whisperDiscShown"
        :style="whisperDiscStyle"
        :class="{ refused: !!whisperRefusalText }"
        :title="whisperDiscTitle"
        @click="onWhisperDiscClick"
        @mouseenter="nameHover = true"
        @mouseleave="nameHover = false"
      >
        <!-- FT-1211: comment-dots, with the vocabulary's Whisper row — this
             disc OPENS a message; the plane means one was SENT. -->
        <font-awesome-icon icon="comment-dots" />
      </div>

      <!-- FT-1068: THE SEAT MENU IS RETIRED (user call: "can we finally
           get rid of it?"). Its rows' jobs had been leaving one by one for
           direct affordances — the plate drag (move/swap), the one-tap
           claim, the coin's belief chip, the tray drags — and the last one
           standing, "Nomination", is now the nominate hand in the cowl's slot
           above. Markup and methods stay behind `showSeatMenu`, the same
           way this file keeps `showNightBadges`, `showSeatSplat` and
           `showBallotVote` — the whole menu is one flag away. -->
      <transition name="fold">
        <ul class="menu" v-if="showSeatMenu && isMenuOpen">
          <!-- THE SEAT'S OWN EDIT FIELD, never prompt(). A browser dialog is
               silently auto-dismissed in dialog-less contexts (driven panes,
               embeds) and returns empty, which made every dialog-backed
               control in this app read as dead (FT-852 on Leave, the script
               editor's save, the custom reminder note). The claim overlay a
               few marks up already asks in place for exactly this reason;
               this is the same answer for a seat already taken.

               It renders ONLY while an edit is open, and the two callers
               (changeName / changePronouns) have no row in this menu today —
               so nothing here appears that did not appear before. If either
               row comes back, it works instead of doing nothing. -->
          <li class="seat-edit" v-if="edit" @click.stop>
            <input
              ref="editInput"
              v-model="edit.value"
              :placeholder="edit.field === 'name' ? 'Player name' : 'Pronouns'"
              spellcheck="false"
              maxlength="60"
              @keyup.enter.stop="commitEdit"
              @keyup.esc.stop="cancelEdit"
            />
            <font-awesome-icon
              icon="check"
              class="se-go"
              title="Save"
              @click="commitEdit"
            />
            <font-awesome-icon
              icon="times"
              class="se-no"
              title="Cancel"
              @click="cancelEdit"
            />
          </li>
          <!-- Golem fork (2026-08-18, user call): Pronouns, Rename and
               Remove left the menu — players name themselves on claiming,
               the seat scrub removes chairs. Methods kept. -->
          <!-- THE PLUS, OFF THE RING (touch).
               Every seat carried its own add-reminder disc, revealed on
               hover — which on a coarse pointer meant permanently visible.
               The discs hang INWARD along each seat's spoke, so eight of
               them landed on top of each other in the middle of the clock
               face, over whatever was standing there (measured 375x812: 8 of
               8 on the hub, 24px across, one of them unreachable behind
               another). The seat already opens a menu on tap; the plus is a
               row in it, at the size a row gets. It is not gated on being the
               storyteller — the disc never was. (FT-1294: it used to carry
               the face-down grimoire's guard as well, which on every client a
               person could actually sit at was already open — a player's
               coins were face up and the host had no way left to turn them
               over. The state is retired and so is the guard.) -->
          <!-- FT-1242: FA `plus` stood down — the note sheet (ui-note.png) is
               what this row puts on the seat, same mark the plate row wears. -->
          <li class="rem-act" @click="addReminder()">
            <img class="pm-mark" :src="uiNote" alt="" draggable="false" />
            Add reminder
          </li>
          <template v-if="!session.isSpectator">
            <!-- THE CHARACTER'S OWN TWO GESTURES.
                 Moving a character between chairs and taking one off a chair
                 were drag-only, and HTML5 drag fires nothing under a finger —
                 so on a phone neither existed. Both are the seat's, not the
                 player's, which is why they sit above the player rows and
                 carry the coin's language ("character", not "player").
                 Move arms this chair's character on the same channel the tray
                 and the grimoire use; the next seat you tap trades with it. -->
            <template v-if="player.role.id">
              <li
                class="char-act"
                :class="{ on: roleArmed }"
                title="Pick this character up — then tap another seat to trade them over"
                @click="armCharacter()"
              >
                <!-- FT-1242: FA `people-arrows` stood down — the same act on
                     the seat plate wears ui-move-role.png (seatActions'
                     move-role row), so this row says it with the same art. -->
                <img
                  class="pm-mark"
                  :src="uiMoveRole"
                  alt=""
                  draggable="false"
                />
                {{ roleArmed ? "Put character back" : "Move character" }}
              </li>
              <li
                class="char-act"
                title="Take this character off the chair; it returns to the tray"
                @click="clearCharacter()"
              >
                <font-awesome-icon icon="undo" />
                Remove character
              </li>
              <!-- FT-1006: THE BELIEF DOORWAY. The chip on the coin edits a
                   belief once one exists, but it cannot SET the first one —
                   this row is where "is the Drunk, thinks they are X" starts.
                   Gated by the character's own schema (BELIEVES_OTHER in
                   golem/nightInfo — the Drunk, the Lunatic, the Marionette),
                   never a name test here; it also stays for any seat already
                   carrying a belief, so an invented one can still be changed
                   or cleared after the character underneath moves. -->
              <li
                class="char-act"
                v-if="canSetBelief"
                title="Set the character this seat's player is TOLD they are — they are dealt that and shown nothing else"
                @click="setBelief()"
              >
                <font-awesome-icon icon="theater-masks" />
                {{
                  beliefChip
                    ? "Change what they think they are"
                    : "What do they think they are?"
                }}
              </li>
            </template>
            <li @click="movePlayer()" :class="{ disabled: session.lockedVote }">
              <!-- FT-1242: FA `redo-alt` stood down — ui-move-player.png, the
                   plate row's own chair-with-arrow (seatActions move-player). -->
              <img
                class="pm-mark"
                :src="uiMovePlayer"
                alt=""
                draggable="false"
              />
              Move player
            </li>
            <li @click="swapPlayer()" :class="{ disabled: session.lockedVote }">
              <font-awesome-icon icon="exchange-alt" />
              Swap seats
            </li>
            <li
              @click="updatePlayer('id', '', true)"
              v-if="player.id && session.sessionId"
            >
              <!-- FT-1242: FA `chair` stood down for the app's own chair mark
                   (uiSeat — ui-seat-front.svg since FT-1317) here and on
                   the claim rows below — one chair mark everywhere.
                   FT-1337: worn as var(--chair) via the chair lab. -->
              <span class="pm-mark chair-mark" aria-hidden="true"></span>
              Empty seat
            </li>
            <template v-if="!session.nomination">
              <li @click="nominatePlayer()">
                <!-- FT-1242: FA `hand-point-right` stood down — the app's own
                     accusing manicule (ui-nominate-hand.png), same as the
                     plate row and the coin's nominate mark. -->
                <img
                  class="pm-mark"
                  :src="uiNominateHand"
                  alt=""
                  draggable="false"
                />
                Nomination
              </li>
            </template>
          </template>
          <!-- FT-1112: the row disappears on ANOTHER chair once this client
               holds a seat and the game is underway — the same rule the
               one-tap overlay obeys, and the host enforces. The player's OWN
               row (Vacate) stays: standing up is always allowed. -->
          <li
            @click="claimSeat"
            v-if="session.isSpectator && !(seatMoveLocked && !isOwnSeat)"
            :class="{ disabled: player.id && player.id !== session.playerId }"
          >
            <!-- FT-1242: FA `chair` stood down for the chair mark (see above).
                 FT-1337: worn as var(--chair) via the chair lab. -->
            <span class="pm-mark chair-mark" aria-hidden="true"></span>
            <template v-if="!player.id">
              Claim seat
            </template>
            <template v-else-if="player.id === session.playerId">
              Vacate seat
            </template>
            <template v-else> Seat occupied</template>
          </li>
        </ul>
      </transition>
    </div>

    <template v-if="player.reminders">
      <!-- FT-869: `--ri`/`--rn` are this reminder's index and this seat's
           total reminder count — the CSS fan below reads them to spread
           reminders left/right of the seat instead of stacking them toward
           the ring's centre (see the `.reminder:not(.add)` rule).

           FT-1167: `reminderStyle` still carries those two properties (the CSS
           rule is the fallback for the first frame, before anything has been
           measured) and adds the MEASURED placement on top — see
           `measureReminderAnchor` for why a percentage of the seat cannot get
           this right.

           FT-1117: and a token now MOVES. The storyteller picks it up and
           carries it to another chair — the deal places the red herring, and
           the storyteller is the one who decides it belongs somewhere else.
           Only the storyteller: `draggable` is off for a spectator, and
           onReminderDrop bails for one as well, so a player cannot lift a
           token off the grimoire even with a hand-built drag.

           THE MOUSEDOWN IS NOT DECORATION. `.reminder`'s click REMOVES the
           token, so a click arriving at the end of a drag deletes the very
           thing that was just carried across the ring. `@mousedown` opens a
           fresh gesture (it always fires before `dragstart`), `@dragstart`
           marks that this gesture became a drag, and the click handler
           swallows exactly the click that follows one. No timer, no guessing
           at how long a drag's trailing click takes to arrive. -->
      <div
        class="reminder"
        :key="reminder.role + ' ' + reminder.name"
        v-for="(reminder, ri) in player.reminders"
        :class="[reminder.role]"
        :style="reminderStyle(ri)"
        :draggable="String(!session.isSpectator)"
        @mousedown="reminderDragged = false"
        @dragstart="onReminderDragStart(ri, $event)"
        @click="removeReminder(reminder)"
      >
        <span
          class="icon"
          :style="{ backgroundImage: `url(${reminderIcon(reminder)})` }"
        ></span>
        <span class="text">{{ reminder.name }}</span>
      </div>
    </template>
    <!-- (the reminder HOVER TARGET is retired — an invisible box in the
         middle of the ring that swallowed drags and hovers meant for the
         town centre. Reminders are reached from the seat itself; its styles
         stay below, unused. user call 2026-08-18) -->
  </li>
</template>

<script>
import Token from "./Token";
// FT-858: THE role hover card, shared with the Almanac workbench's shelf, the
// grimoire drawer and every other coin.
import RoleHoverCard from "./RoleHoverCard";
// FT-861: is this seat living a lie, and what does it think it is?
import { isBelieving } from "../golem/belief";
// FT-1006: which CHARACTERS come with a lie attached (the Drunk, the
// Lunatic…) — the schema gate for the seat menu's belief doorway below.
import { believesOther } from "../golem/nightInfo";
// FT-1090: the seat coin drags with the character's own face under the
// pointer, the same ghost the tray and the drawer hang there. `warmRoleIcon`
// is the seat's half of the deal — Token.vue resolves the coin's art itself,
// so nothing else on this seat would have warmed the ghost in time.
import {
  startSeatRoleDrag,
  warmRoleIcon,
  // FT-1117: a reminder token drags too, on the same pre-warmed ghost stage
  setDragImageSrc,
  warmIconSrc,
  // FT-1270: "is this the viewer's own claimed chair" — the one rule that
  // bounds what a plain player may write on a coin, shared with the unseat
  // half of the same gesture (golem/roleUnseat)
  isOwnClaimedSeat,
} from "../golem/roleDrag";
// FT-1169: the seat's actions as one menu — the object BOTH the nameplate
// click and the coin hover open. See SeatMenu.vue for why it is one component
// and not two, and for where it places itself.
// FT-1180 CORRECTS THAT: it is two components, because the user's two gestures
// want two shapes ("you reused the elements for both the nameplate click and
// the hover coin which made them both bad"). SeatMenu is now the glassy plate
// laid ON the coin — the nameplate click's answer — and SeatRing is the hover
// coin's, a ring of little coins hung on the player's own rim. The only thing
// they share is golem/seatActions, which is the LIST and not the box.
import SeatMenu from "./SeatMenu";
import SeatRing from "./SeatRing";
// FT-1206: the seat's own whisper — the ONE inline input all three schemes
// end their whisper gesture in (the plate's row, the ring's coin, the click
// scheme's plate-side disc). See SeatWhisper.vue for the shape.
import SeatWhisper from "./SeatWhisper";
// FT-1206: the whisper is the Chronicle composer's own whisper — same frame
// builder, same chatSay funnel — and the chat level's refusals are the chat's
// own words, precomputed here for the vocabulary's guard.
import {
  seatOf,
  viewerOf,
  whisperFrame,
  whisperRefusal,
  // FT-1315: the one whisper-metadata gate — the corner mark hides with the
  // Chronicle's tally and traffic lines when the town's level allows no
  // player↔player whispers at all.
  whispersQuiet,
} from "../golem/chat";
// FT-1206: the chat level is a town rule on the tower shelf; this seat holds
// the usual snapshot, refreshed on TOWER_EVENT (the FaceHands idiom).
import { TOWER_EVENT, towerState } from "../golem/towerBells";
// FT-1180: the six things a storyteller can do to a seat — every one of them
// present on every seat, with the guards deciding DISABLED rather than absent.
// FT-1271: …and the one guard the seat's own writer re-asks — "may this viewer
// change the character on this coin" — so the menus' disabled row and the
// click's refusal are one expression rather than two that drift.
import {
  seatActions,
  SEAT_SLOT_BY_ID,
  roleChangeRefusal,
} from "../golem/seatActions";
// FT-1242: the seat menu's rows say their meanings with the app's own marks —
// the same art the plate/ring rows (golem/seatActions) already wear for the
// same acts, plus the chair for the seat rows. The FA names they replace
// (chair, plus, people-arrows, redo-alt, hand-point-right) stay registered in
// main.js and stand down in place in the template.
// FT-1317: ui-seat.png (a side-view chair) read as a letter H at claim size;
// every live chair mark now wears the front-facing ui-seat-front.svg. The png
// stays on disk (and inside the baked move/shuffle marks it was drawn into).
// FT-1337: the import stood down (commented, never deleted — the applyCoin
// precedent): every chair mark reads var(--chair) via golem/chairArt now,
// and ui-seat-front.svg lives on as that vocabulary's default.
// import uiSeat from "../assets/ui-seat-front.svg";
import uiNote from "../assets/ui-note.png";
import uiMoveRole from "../assets/ui-move-role.png";
import uiMovePlayer from "../assets/ui-move-player.png";
import uiNominateHand from "../assets/ui-nominate-hand.png";
// FT-1169: THE CONTROL SCHEME — this browser's own answer to "how do I work a
// seat". FT-1168 built the setting and deliberately left it inert; this is the
// lane that reads it. One stash, one writer (golem/prefs), and the snapshot
// idiom every other consumer of it uses (App.vue, Menu.vue, NightModeRow):
// prefsState is a plain module object, so each component holds its own
// reactive copy refreshed on PREFS_EVENT.
import { PREFS_EVENT, prefsState } from "../golem/prefs";
// FT-1169: the plate in the middle of the clock, which the seat menu has to
// clear for exactly the reason the reminder fan does. FT-1167 measured it as a
// private method here; it moved to a module so the menu can read the same one.
import { centrePlateRect as readCentrePlateRect } from "../golem/clockFace";
import { mapGetters, mapState } from "vuex";

// how long the cursor has to rest on a seat before its card appears — enough
// that sweeping across the square does not strobe cards
const HOVER_DELAY = 170;
// FT-1194 (user: "make the hover coins hover much more responsive") — the
// RING opens on its own, much shorter rest. The card's 170ms guards against a
// wall of text strobing across a sweep; the ring is six small coins that cost
// nothing to glance past, and the scheme was chosen BECAUSE the menu is the
// point, so it answers at the speed of intent. 60ms still swallows a straight
// sweep across the square (a pointer crossing a coin at speed is gone in
// ~40ms) without making a genuine rest wait. 60 -> 30 (FT-1203, the user's
// second "even faster"): a straight sweep still clears a coin in ~40ms of
// travel, but half of that lands inside the delay -- 30 keeps the guard while
// answering a genuine rest within a couple of frames.
const RING_DELAY = 30;
// FT-990: how long a card survives after the cursor leaves a target. The seat
// has three of them (coin, shroud, plate) with real ground between the coin and
// the plate, and a straight move across that ground must not drop the card and
// raise it again. Deliberately shorter than HOVER_DELAY: a real exit is still
// gone before any other seat could acquire, so two cards can never overlap.
const HOVER_GRACE = 120;

// Golem fork (FT-848): the cut blood decals, bundled once for all seats.
const splatCtx = require.context("../assets/blood/splats", false, /\.png$/);
const SPLATS = splatCtx
  .keys()
  .sort()
  .map(splatCtx);

export default {
  components: {
    RoleHoverCard,
    SeatMenu,
    SeatRing,
    SeatWhisper,
    Token
  },
  props: {
    player: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState("players", ["players"]),
    // FT-1112: `chat` joins them for one field — `chat.gameId`, the town's
    // current game as the storyteller named it (see gameUnderway below).
    ...mapState(["grimoire", "session", "chat"]),
    ...mapGetters({ nightOrder: "players/nightOrder" }),
    // FT-1107: THE NIGHT'S ASK, AND WHAT THIS CLIENT HAS ANSWERED SO FAR.
    // Both are store getters, shared verbatim with the clock-face panel that
    // words the ask (TownInfo -> NightCall) — a seat and the hub cannot
    // disagree about whether the night wants something, because neither of
    // them decides it.
    ...mapGetters({
      nightCall: "night/myCall",
      nightTargets: "night/myCallTargets",
      // FT-1291: has the storyteller sent this seat's answer? The getter is
      // the shared definition (night/myCallSent) so the coins and the words on
      // the face cannot disagree about whether tonight's choice is still open.
      nightSent: "night/myCallSent",
    }),
    /** Retired with the night checklist (user call 2026-08-18) — flip to
     *  `this.grimoire.isNightOrder` to bring the seat badges back. */
    showNightBadges() {
      return false;
    },
    /** Retired 2026-08-18 (user call): a death's blood belongs on the CLOCK
     *  FACE, not behind the seat's coin. TownSquare's .blood-dial owns it
     *  now — flip this to `true` to bring the behind-the-coin splatter back. */
    showSeatSplat() {
      return false;
    },
    /** FT-974: Font Awesome's `vote-yea` ballot box, retired in favour of our
     *  own ghost-hand mark — flip this to `true` to bring the ballot box back.
     *  The icon stays registered in main.js either way. */
    showBallotVote() {
      return false;
    },
    /** FT-974b: the Font Awesome vote pair (red `hand-paper` / blue `times`),
     *  retired in favour of our own painted pair — flip this to `true` to
     *  bring the glyphs back. Both icons stay registered in main.js. */
    showGlyphVotes() {
      return false;
    },
    /** FT-1069: the overlay's white `hand-point-right` target pick, retired
     *  in favour of the painted noose — the gallows picks who stands trial.
     *  Flip to `true` to bring the glyph back; it stays in main.js. */
    showGlyphNominate() {
      return false;
    },
    /** FT-1069: the white skull "marked for execution" glyph, retired in
     *  favour of the noose wearing the vote tally — flip to `true` to bring
     *  the skull back. The icon stays registered in main.js. */
    showSkullMarked() {
      return false;
    },
    /**
     * FT-1069: how many votes put this seat on the block — the number in the
     * noose's loop. Null (no number shown) when this seat is not the marked
     * one or no tally is known.
     *
     * TWO SOURCES, one per moment. While the nomination that marked them is
     * still open, `session.votes` is the live count and the loop counts up
     * as hands lock. After it closes the live array is cleared by the
     * `nomination` mutation, so the count comes from the chronicle's own
     * record — the newest `voteHistory` entry naming this seat as nominee
     * (`addHistory` stores names, not indices; a name collision would read
     * the other seat's tally, which is the record's own ambiguity, not a new
     * one). A spectator whose vote history is switched off simply wears the
     * noose alone.
     */
    /**
     * FT-1314: is this seat one of the tie-cross's chairs? The pair (or
     * more) stands with markedPlayer -1 — tied at the same recorded count,
     * every listed seat wearing the struck noose until a higher vote or the
     * storyteller's own hand takes the block for real.
     */
    isTieMarked() {
      const tie = this.session.markedTie;
      return !!(tie && tie.seats && tie.seats.includes(this.index));
    },
    markedVotes() {
      const session = this.session;
      // FT-1314: a tied chair's tally is the tie's own count — the number
      // both marks stand crossed at.
      if (this.isTieMarked) return session.markedTie.votes;
      if (session.markedPlayer !== this.index) return null;
      if (session.nomination && session.nomination[1] === this.index) {
        return session.votes.filter(Boolean).length;
      }
      const name = this.player.name;
      for (let i = session.voteHistory.length - 1; i >= 0; i--) {
        const entry = session.voteHistory[i];
        if (entry.nominee === name) return entry.votes.length;
      }
      return null;
    },
    /**
     * FT-1075 rider: this seat's part in the running nomination, or null.
     * `session.nomination` is [nominator, nominee] as seat indices, set when
     * the nomination opens and cleared when it resolves or is cancelled —
     * so the mark's whole lifetime is exactly the array's, on every client
     * (the relay syncs the same state to all of them).
     *
     * The one carve-out: an accused seat that is ALSO the marked-for-
     * execution seat already wears the tally noose (`.marked` above, same
     * spot, same art) — returning null here rather than stacking a second
     * noose on the first.
     */
    voteRole() {
      const nomination = this.session.nomination;
      if (!nomination) return null;
      if (nomination[0] === this.index) return "accuser";
      if (nomination[1] === this.index) {
        return this.session.markedPlayer === this.index ? null : "accused";
      }
      return null;
    },
    /** FT-1068: the per-seat context menu, retired (user call). Every job
     *  it still carried lives in a direct affordance now — the nominate
     *  row became the noose mark in the cowl's slot — and the rows with no
     *  other home are named in the FT-1068 hand-off. Flip to `true` to
     *  bring the whole menu back, plate-toggle and all. */
    showSeatMenu() {
      return false;
    },
    // ── FT-1169: THE THREE CONTROL SCHEMES ───────────────────────────────
    /**
     * WHICH SCHEME THIS SEAT IS ACTUALLY RUNNING — not simply what the
     * setting says.
     *
     * TWO THINGS OVERRIDE THE STORED CHOICE, both of them because the scheme
     * would otherwise be a dead end:
     *
     *   · A SPECTATOR is always on "click". The schemes are how a STORYTELLER
     *     works a seat (golem/prefs says so in as many words), and every row
     *     the menu offers is refused for a spectator by the guard that
     *     already stands in front of it — `updatePlayer` bails on anything but
     *     reminders and pronouns, movePlayer/swapPlayer/nominatePlayer bail on
     *     `isSpectator`. A player who picked "Hover coin" out of curiosity
     *     would otherwise get a plate of rows that do nothing, standing over
     *     the coin they are trying to claim.
     *
     *   · "HOVER" FALLS BACK TO "NAMEPLATE" ON A TOUCH SCREEN. There is no
     *     rest-the-pointer gesture on a finger, so hover is not a scheme
     *     there — it is the absence of one. Falling back to the nameplate
     *     keeps every row reachable rather than stranding a phone on a
     *     control it cannot perform. Same `(hover: hover)` test showCard
     *     already runs before raising a card.
     *
     * ── FT-1213 SUPERSEDES THE EXCLUSIVE SCHEME ────────────────────────────
     * The user's call: none of the three schemes conflict — three gestures,
     * three targets — so the one-of-three dropdown became six independent
     * toggles (golem/prefs' CONTROL_TOGGLES). The computeds below are the
     * per-gesture answers every call site now reads; each keeps exactly the
     * override the paragraph above argued for its scheme:
     *
     *   · A SPECTATOR still gets the click behaviours and nothing else —
     *     the ring and the plate are storyteller menus, and every row in
     *     them is refused for a player by the store call behind it.
     *   · HOVER ON A TOUCH SCREEN is simply OFF (there is no rest-the-
     *     pointer gesture to enable); no fallback is needed any more,
     *     because the nameplate toggle stands on its own and defaults on.
     *   · THE DRAGS AND THE ADD-REMINDER DISC ignore the toggles for a
     *     spectator: FT-1025 deliberately granted spectators the role drag
     *     (their own gate, `!isOwnSeat`, is inside canDragCoin) and the plate
     *     drag already refuses them. A spectator also has no Control
     *     settings tab, so a toggle turned off in some earlier hosting
     *     session must not strand them.
     */
    /**
     * FT-1227 (user) SPLITS THE COIN CLICK IN TWO: "click role name to
     * change role. click other areas of coin to toggle dead or not." The
     * role NAME is the token's own exposed lower arc (`.token`'s click —
     * the shroud covers the coin's top ~61%, so the name arc is what a
     * click on `.token` itself reaches); the REST of the coin is the shroud
     * and the public life face. One switch each, so turning off stray-click
     * deaths no longer costs the role picker. The spectator override is the
     * old computed's, kept on both halves.
     */
    /**
     * FT-1260.2 REPLACES THE BOOLEANS WITH ASSIGNMENTS: each click carries
     * a vocabulary SLOT id (or "off") now — the Control tab's picker rows
     * write them, golem/prefs migrated the FT-1227 booleans onto them
     * (true → the click's standing act, false → "off"). The spectator
     * override keeps its FT-1227 meaning by pinning the STANDING act: a
     * spectator's coin clicks are their own claim-and-flip affordances and
     * were never the storyteller's to reassign.
     */
    ctrlClickNameAction() {
      if (this.session.isSpectator) return "role";
      return this.prefs.ctrlClickNameAction || "off";
    },
    ctrlClickDeadAction() {
      if (this.session.isSpectator) return "kill";
      return this.prefs.ctrlClickDeadAction || "off";
    },
    /** FT-1227: the old one-switch computed STANDS DOWN as a stored pref —
     *  it now answers "is any coin click live", which is what its one
     *  remaining reader (whisperDiscShown, the click scheme's whisper disc)
     *  was actually asking. (FT-1260.2: "live" now means "assigned to
     *  anything at all".) */
    ctrlClickCoins() {
      return (
        this.ctrlClickNameAction !== "off" || this.ctrlClickDeadAction !== "off"
      );
    },
    ctrlHoverCoins() {
      if (this.session.isSpectator) return false;
      if (!this.hasHover) return false;
      return this.prefs.ctrlHoverCoins !== false;
    },
    ctrlNameplateClick() {
      if (this.session.isSpectator) return false;
      return this.prefs.ctrlNameplateClick !== false;
    },
    ctrlDragRoles() {
      if (this.session.isSpectator) return true;
      return this.prefs.ctrlDragRoles !== false;
    },
    ctrlDragNames() {
      return this.prefs.ctrlDragNames !== false;
    },
    ctrlReminderHover() {
      if (this.session.isSpectator) return true;
      return this.prefs.ctrlReminderHover !== false;
    },
    /**
     * FT-1319: the add-reminder pin RESTS VISIBLE unless this viewer set it
     * back to "On hover" (the player settings menu's own row — the pre-1319
     * behaviour). Gated on `addAnchor` because the resting dress replaces
     * the opacity gate that used to hide the disc before its first
     * measurement landed — an unmeasured disc has no dock to stand at, so
     * it stays hidden exactly as it always did for that one render.
     */
    pinResting() {
      return this.prefs.pinVisibility !== "hover" && !!this.addAnchor;
    },
    /**
     * THE ROWS THIS SEAT OFFERS, and what each one is conditional on.
     *
     * THE MENU READS THE SEAT; it is not a fixed list with a special case
     * bolted on for the one entry the user happened to name. Every row below
     * carries the SAME guard the direct affordance it replaces already
     * carried — that is the whole design rule here, because two different
     * answers to "may this happen now" is how a menu and a mark drift apart.
     *
     *   Kill / Revive        always. The label flips on `isDead`; the act is
     *                        `toggleStatus`, the shroud's own click, verbatim.
     *   Change role          always — the coin's own `set-role`.
     *   Move player          the chair is CLAIMED (an "Open" plate has no
     *                        player to carry), and greyed while a vote is
     *                        locked, which is the retired row's own gate.
     *   Move role            the chair HAS a character. Label flips on armed,
     *                        so the row that picks a character up is also the
     *                        row that puts it back — `armCharacter` was
     *                        already a toggle.
     *   Player nominates     a LIVING seat, and no nomination already
     *                        running. Both come straight off the nominate
     *                        mark's own `v-if`.
     *   Ghost vote           a DEAD seat — and it takes the nominate row's
     *                        slot rather than sitting beside it, because the
     *                        two are the same question at two moments: a
     *                        living seat can point at somebody, a dead one
     *                        can only spend the vote it has left. (User's
     *                        rider, and the seat already wears exactly this
     *                        swap: the ghost-vote cowl and the nominate hand
     *                        share one corner of the coin for the same
     *                        reason.) The label says what the CLICK does, not
     *                        what the state is, so it reads like every other
     *                        row here.
     *   Add reminder         not on the PUBLIC grimoire — the retired row's
     *                        own gate, and the one the reminders themselves
     *                        already follow.
     *
     * ── FT-1180 SUPERSEDES THE PARAGRAPHS ABOVE ────────────────────────────
     * Every guard listed there is still the guard, and every one of them
     * still comes off the direct mark it duplicates — that rule was right and
     * is kept. What changed is what a failing guard COSTS the row.
     *
     * The user: "also neither of them have all of the needed buttons?" A
     * guard that decides ABSENCE gives an open chair three entries and a
     * dealt one six, and nothing on screen ever admits the other three are a
     * thing this app can do. So the list is FIXED at six now, the guards
     * decide DISABLED, and each carries the reason it is refused into its own
     * tooltip. The list itself lives in `golem/seatActions` — one place, two
     * surfaces (the plate and the ring), neither of which knows what an
     * action means.
     *
     * A SPECTATOR still gets nothing, and that is not a guard, it is the
     * whole menu: every row is refused for a player by the store call behind
     * it, so a plate of six dead rows would stand over the coin they are
     * trying to claim. The scheme itself falls back to "click" for them
     * (see `controlScheme`), so this list is never asked for.
     */
    seatMenuEntries() {
      if (this.session.isSpectator) return [];
      return seatActions(this.seatActionContext);
    },
    /**
     * FT-1180: the seat facts every action's guard reads, as one plain
     * object. It is built HERE rather than inside golem/seatActions because
     * these are the seat's own facts — and it is a computed rather than an
     * argument built at call time so the two surfaces re-render when one of
     * them changes under an open menu (a seat that dies while its plate is up
     * must repaint "Kill" as "Revive").
     */
    seatActionContext() {
      return {
        isDead: !!this.player.isDead,
        isVoteless: !!this.player.isVoteless,
        hasPlayer: !!this.player.id,
        hasRole: !!this.player.role.id,
        roleArmed: !!this.roleArmed,
        lockedVote: !!this.session.lockedVote,
        nomination: !!this.session.nomination,
        // FT-1294: `grimoireHidden` was reported here for the reminder row's
        // guard. The face-down state is retired; the row is unconditional.
        // FT-1206: why this seat cannot be whispered, or null — the chat
        // level's own answer, computed once here for every surface.
        whisperRefusal: this.whisperRefusalText,
        // FT-1332: the noose row's two facts — is THIS seat the marked one
        // (session.markedPlayer, the exact index the vote overlay's own
        // toggle writes), and is it a traveler (exiled, never executed —
        // the overlay's isExile rule, restated as a seat fact).
        isMarked: this.session.markedPlayer === this.index,
        isTraveler: this.player.role.team === "traveler",
        // FT-1271: the two facts the own-coin rule reads, and they travel as a
        // pair because the rule is about PLAYERS — the storyteller keeps every
        // power on every seat. `isStoryteller` is the same sense golem/chat's
        // `viewerOf` gives the word (`!isSpectator`).
        isOwnSeat: this.isOwnSeat,
        isStoryteller: !this.session.isSpectator,
      };
    },
    /** FT-1206: which chair this seat is — the roster's own index, the same
     *  number the chat rows carry as senderSeat/recipientSeat. */
    seatIndex() {
      return this.players.indexOf(this.player);
    },
    /**
     * User call 2026-08-28: a raised hand POINTS AT THE NOMINATED. The chord
     * from this seat to the nominee's, in screen space, gives the hand's
     * rotation (the art points up at 0). The seat's inner content is a pure
     * translation of the screen frame (the FT-911 note), so a plain CSS
     * rotate lands true. No nomination, or the nominee's own chair, stays
     * upright.
     *
     * FT-1311 — OFF BY ONE SEAT, the same slip the overlay's own arrows had
     * (Vote.vue's nominatorStyle, fixed 2026-08-20): the ring's on-circle
     * mixin rotates seat `i` by `((i + 1) * 360) / count` — seat 0 stands
     * one step PAST twelve o'clock, the way a clock's 1 does — and this
     * computed placed both endpoints at `i * 360 / count`. Rotating BOTH
     * ends of a chord by the same slot rotates the CHORD by that slot (it
     * does not cancel), so every hand pointed one seat's width
     * counter-clockwise of the accused. The `+ 1` matches the mixin; the
     * FT-1311 rig measures the rendered hand against the chord between the
     * two seats' real DOM boxes, so the convention is checked against the
     * ring itself, not against this comment.
     *
     * (Applied only on lock now — the CSS keeps the hand upright until this
     * seat's vote locks; see the vote-mark rules in the style block.)
     */
    voteAimDeg() {
      const nomination = this.session.nomination;
      if (!nomination) return 0;
      const n = this.players.length;
      const me = this.seatIndex;
      const target = nomination[1];
      if (!n || target == null || target < 0 || target === me) return 0;
      const a = ((me + 1) / n) * 2 * Math.PI;
      const b = ((target + 1) / n) * 2 * Math.PI;
      const dx = Math.sin(b) - Math.sin(a);
      const dy = -Math.cos(b) - -Math.cos(a);
      return Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
    },
    /**
     * FT-1206: MAY THIS VIEWER WHISPER THIS SEAT — null, or the reason not,
     * in the chat level's own words. The permanent facts come first (an open
     * chair, your own chair), the level's refusals after — the same
     * permanent-before-passing order move-player's guard documents.
     */
    whisperRefusalText() {
      if (!this.player.id) {
        return "This chair is open — there is nobody to whisper";
      }
      const state = this.$store.state;
      if (this.player.id === this.session.playerId) {
        return "That's you";
      }
      const viewer = viewerOf(state);
      if (!viewer.key) {
        return "Take a seat, or set a name, and you can whisper";
      }
      return whisperRefusal(
        this.chatLevel,
        viewer,
        this.seatIndex,
        seatOf(state),
        this.players.length,
      );
    },
    /**
     * FT-1206: THE CLICK SCHEME'S WHISPER DISC — the icon beside the
     * add-reminder disc on the nameplate hover, the third of the three seat
     * whisper doorways (the plate's row and the ring's coin are the other
     * two). Click scheme only: the other two schemes carry the action in
     * their own menus, and two doorways on one seat would be the FT-1169
     * mistake again. It keeps the fixed-list philosophy — refused is drawn
     * dim with the reason on its tooltip, never absent — with ONE absence:
     * your own seat and an open chair get no disc at all, because "whisper
     * yourself" and "whisper nobody" are meaningless for every viewer at
     * every level.
     */
    whisperDiscShown() {
      // User call 2026-08-28: for a PLAYER this disc is the doorway the
      // FT-1271 whisper mark replaced — the mark sits in the seat's own
      // vocabulary corner (the nominate slot), so the hover disc showing
      // beside the plate too was two doorways on one seat (the FT-1169
      // mistake). The disc is the STORYTELLER's now; a player's seat speaks
      // through the mark alone.
      return !!(
        !this.session.isSpectator &&
        this.ctrlClickCoins &&
        this.addAnchor &&
        this.player.id &&
        this.player.id !== this.session.playerId
      );
    },
    /** The disc sits OUTWARD of the add disc — the same measured anchor,
     *  stepped one disc further from the plate on the seat's own side. */
    whisperDiscStyle() {
      if (!this.addAnchor) return null;
      const { side, size, top, left, gap } = this.addAnchor;
      const step = side > 0 ? size + gap : -(size + gap);
      return {
        boxSizing: "border-box",
        width: `${size}px`,
        height: `${size}px`,
        top: `${top}px`,
        left: `${left + step}px`,
        margin: 0,
        padding: 0,
      };
    },
    whisperDiscTitle() {
      const label = `Whisper ${this.player.name || "this player"}`;
      const why = this.whisperRefusalText;
      return why ? `${label} — ${why}` : label;
    },
    /**
     * FT-1271: THE WHISPER MARK — the nominate corner, filled in for a PLAYER.
     *
     * That corner is the vocabulary's one shared slot and its occupant has
     * always been decided by seat state: a living seat wears the accusing hand,
     * a dead one the ghost-vote cowl. The hand is STORYTELLER-ONLY (its own
     * `v-if` carries `!session.isSpectator`, and nominating is a power a player
     * does not have), so for every player the corner on a living seat is simply
     * empty. This mark is what belongs there: whispering is the one seat act a
     * PLAYER owns, and it now sits in the seat's own vocabulary corner rather
     * than only on the nameplate's hover.
     *
     * ONE GATE, AND IT IS NOT A NEW ONE. `whisperRefusalText` is already the
     * chat's whole answer for this seat — golem/chat's `whisperRefusal` (the
     * level: Off / No whispers / Neighbors / Anyone) plus the seat's two
     * permanent facts (an open chair, your own chair) and the viewer's own
     * identity. Nothing about the level is re-derived here; the mark simply
     * renders when that answer is null.
     *
     * REFUSED IS ABSENT HERE, deliberately breaking the fixed-list rule the
     * MENUS keep — and it is the user's own call for this mark. A menu row has
     * a place to say why; a bare mark on a coin does not, and twenty dim marks
     * ringing the dial saying "not your neighbour" would be noise on every seat
     * in the town. The settings row and the menus already teach why whispering
     * may be off.
     */
    whisperMarkShown() {
      // FT-1315: the level pair (Off / No whispers) is named through the
      // shared gate rather than only falling out of the refusal text — the
      // corner mark, the Chronicle's tally and its traffic lines are ONE
      // family and hide off ONE helper (golem/chat's whispersQuiet).
      if (whispersQuiet(this.chatLevel)) return false;
      return !!(this.session.isSpectator && !this.whisperRefusalText);
    },
    /**
     * FT-1271: does the cowl already have the corner? A DEAD seat is still
     * whisperable — golem/chat says so in as many words ("a dead neighbor is
     * still a neighbor") — but its corner is taken by the ghost-vote cowl, and
     * a player's view is exactly the view that cowl is visible in.
     * So on a dead seat the mark steps DOWN the same corner column instead of
     * landing on top of the cowl. The living case is untouched: the mark sits
     * precisely where the hand does on the storyteller's own screen.
     */
    whisperMarkStacked() {
      // FT-1315: a spent seat in the "shroud" vocabulary has no cowl in the
      // corner (shroudLifted below), so the mark takes the corner itself.
      return !!this.player.isDead && !this.shroudLifted;
    },
    /**
     * FT-1315: THE SPENT VOTE DROPS THE SHROUD — the host's other vocabulary.
     * With the tower's `ghostSpentMark` at "shroud", a dead seat that has
     * spent its ghost vote takes the veil OFF instead of wearing the crossed
     * cowl: shrouded dead = vote in hand, bare dead = vote spent (the coin's
     * own cold-metal swap still says dead either way). True only in that
     * mode — the shipped "cowl" mode changes nothing.
     */
    shroudLifted() {
      return (
        this.ghostSpentMark === "shroud" &&
        !!this.player.isDead &&
        !!this.player.isVoteless
      );
    },
    /**
     * FT-1206: THE WHISPER DISC'S OWN BRIDGE — FT-923's lesson, paid again by
     * this lane's rig: the cursor's path from the plate to the whisper disc
     * crosses the ADD DISC'S footprint, and wherever that disc takes no
     * pointer the hover dropped mid-corridor and the whisper disc hid before
     * the cursor reached it — measured, not guessed: the proof rig's click
     * timed out on exactly this. (FT-1294: the rule that made the add disc
     * pointer-dead was the face-down grimoire's, now retired. The bridge
     * stays — it is the corridor's own geometry, and the gaps either side of
     * the disc were always part of what it covers.)
     * One invisible strip covers the whole corridor (both gaps plus the add
     * disc between them); the same x-arithmetic works on both sides because
     * `addAnchor.left` is the add disc's own left on either.
     */
    whisperBridgeStyle() {
      if (!this.addAnchor) return null;
      const { size, top, left, gap } = this.addAnchor;
      const OVERLAP = 1;
      return {
        position: "absolute",
        boxSizing: "border-box",
        left: `${left - gap - OVERLAP}px`,
        top: `${top - OVERLAP}px`,
        width: `${size + gap * 2 + OVERLAP * 2}px`,
        height: `${size + OVERLAP * 2}px`,
        margin: 0,
        padding: 0,
      };
    },
    /**
     * FT-1180: may this seat's coin be dragged right now? The same three-part
     * gate `<Token>`'s own `draggable` binding carries, pulled out because
     * the glass plate lies OVER the coin and has to carry the identical
     * answer — the plate hands the gesture on rather than eating it (see
     * SeatMenu's own note), and two copies of "may this drag" is how the
     * plate and the coin would come to disagree.
     */
    canDragCoin() {
      // FT-1213: the "Drag roles" toggle joins the gate — for the
      // STORYTELLER only. A spectator keeps FT-1025's own grant and its own
      // refusal (their claimed seat), untouched by a setting they cannot see.
      return !!(
        this.player.role.id &&
        (this.session.isSpectator ? !this.isOwnSeat : this.ctrlDragRoles)
      );
    },
    /** FT-1180: …and the name plate's own drag (the seat-to-seat move/swap),
     *  the same gate `.name`'s `draggable` binding carries. The plate covers
     *  this handle too on a six-row menu, so it is the FALLBACK the glass
     *  hands on when there is no character to carry. */
    canDragPlayer() {
      // FT-1213: gated by the "Drag names" toggle (spectators were already
      // refused, so the toggle only ever speaks for the storyteller).
      return !!(
        this.player.id &&
        !this.session.isSpectator &&
        this.ctrlDragNames
      );
    },
    /**
     * ── SUPERSEDED (FT-1180): the CONDITIONAL list ─────────────────────────
     * FT-1169's own body, kept whole rather than deleted. Nothing calls it;
     * `seatMenuEntries` above is what runs. It is here because the guards it
     * carries are still exactly the right guards — only their consequence
     * changed — and because the day a surface genuinely wants a short list
     * (a coarse-pointer sheet, say) this is the shape it would want.
     */
    seatMenuEntriesConditional() {
      if (this.session.isSpectator) return [];
      const out = [];
      const dead = !!this.player.isDead;
      out.push({
        id: "kill",
        icon: dead ? "heartbeat" : "skull",
        label: dead ? "Revive" : "Kill",
        title: dead
          ? "Bring this player back to life"
          : "Kill this player — the shroud goes on",
      });
      out.push({
        id: "role",
        icon: "mask",
        label: "Change role",
        title: "Pick the character sitting on this chair",
      });
      if (this.player.id) {
        out.push({
          id: "move-player",
          icon: "redo-alt",
          label: "Move player",
          title: this.session.lockedVote
            ? "Not while a vote is locked"
            : "Pick this player up — then pick the chair they move to",
          disabled: !!this.session.lockedVote,
        });
      }
      if (this.player.role.id) {
        out.push({
          id: "move-role",
          icon: "people-arrows",
          label: this.roleArmed ? "Put character back" : "Move role",
          title:
            "Pick this chair's character up — then tap another seat to trade them over",
          on: this.roleArmed,
        });
      }
      if (dead) {
        out.push({
          id: "ghost-vote",
          icon: "vote-yea",
          label: this.player.isVoteless
            ? "Give ghost vote back"
            : "Use ghost vote",
          title: this.player.isVoteless
            ? "This ghost's vote is spent — hand it back"
            : "Spend this ghost's one vote",
        });
      } else if (!this.session.nomination) {
        out.push({
          id: "nominate",
          icon: "hand-point-right",
          label: "Player nominates",
          title: "This player nominates — then pick who they point at",
        });
      }
      // FT-1294: unconditional. This used to sit behind the face-down
      // grimoire, which is retired — see the seat menu's own row above and
      // golem/seatActions' reminder guard.
      out.push({
        id: "reminder",
        icon: "plus",
        label: "Add reminder",
        title: "Put a reminder token on this seat",
      });
      return out;
    },
    index: function() {
      return this.players.indexOf(this.player);
    },
    /**
     * FT-1069d (user): the nominate hand must always point TOWARD the clock
     * face, not off the ring into empty margin. The art's native direction
     * is LEFT (see ui-nominate-hand.png's header), so this flags seats that
     * need a mirror (`scaleX(-1)`, applied to the art only — the mark's box
     * and halo stay put, per the user's own instruction).
     *
     * The seat's clock angle comes straight out of TownSquare's own
     * `on-circle` mixin (TownSquare.vue): seat `$i` (1-based DOM position,
     * i.e. `this.index + 1`) sits at `$rot = $i * (360 / playerCount)`
     * degrees, rotated CLOCKWISE from 12 o'clock — that mixin comment is
     * where "seat 1 sits just right of 12, the highest seat takes 12"
     * comes from, and this computed reads the identical formula rather
     * than re-deriving it.
     *
     * From that angle, standard clock trig gives the seat's x-offset from
     * the circle's centre as `sin(angle)`: positive = right half (points
     * LEFT, native, no mirror), negative = left half (points RIGHT,
     * mirrored). The user's rule folds 12 and 6 o'clock (`sin` = 0, exactly
     * on the vertical midline) into the mirrored group explicitly, so
     * those two are checked first rather than left to a `sin <= 0` alone —
     * floating point could otherwise land either side of zero.
     */
    nominateMarkMirrored() {
      const n = this.players.length;
      if (!n) return false;
      const angle = (360 / n) * (this.index + 1);
      const theta = ((angle % 360) + 360) % 360;
      const EPS = 1e-6;
      if (
        Math.abs(theta) < EPS ||
        Math.abs(theta - 180) < EPS ||
        Math.abs(theta - 360) < EPS
      )
        return true; // 12 o'clock or 6 o'clock — mirror, per the user's rule
      return Math.sin((theta * Math.PI) / 180) < 0; // left half of the ring
    },
    /**
     * FT-1025: is this the seat I (a player) have claimed? Same three-part
     * identity test the "you" class above already runs, pulled out as its
     * own computed because the drag-off-to-dismiss gate (the `.shroud` and
     * `<Token>` draggable bindings below) needs it independent of that
     * class binding.
     */
    isOwnSeat: function() {
      return !!(
        this.session.sessionId &&
        this.player.id &&
        this.player.id === this.session.playerId
      );
    },
    /**
     * FT-861: the chip on this seat's coin — the character its player was TOLD
     * they are, and null on the overwhelming majority of chairs.
     *
     * STORYTELLER ONLY. A player's own client is never sent anybody's belief
     * (see socket.js), so the spectator refusal below is belt-and-braces —
     * and it STAYS, because it is the one asking the question that matters:
     * is this viewer entitled to the grimoire's own marks.
     *
     * FT-1294: a second refusal stood beside it for the face-down grimoire —
     * the streaming case, where the whole room is looking at the host's
     * screen. That state is retired, so the question it asked no longer
     * exists. Nothing widened: the storyteller-only test is untouched, and it
     * is the test that was ever keeping this off a player's ring.
     */
    beliefChip() {
      if (this.session.isSpectator) return null;
      if (isBelieving(this.player)) return this.player.believedRole;
      // FT-1021 (user call): a believing-class seat ALWAYS wears the chip —
      // before a belief is set it stands as the "?" placeholder, which is
      // also the doorway to setting one. "Sometimes there" was the unset
      // Drunk showing nothing.
      if (this.player.role && believesOther(this.player.role))
        return { placeholder: true };
      return null;
    },
    /**
     * FT-1080: the believed character's engraved art, for the chip the seat
     * now docks itself. Bundled icons only (a chip renders at ~50px — a remote
     * image would be a smudge and would need the opt-in), falling back the way
     * the night sheet's rows do. Same body as Token.vue's own `beliefIcon`,
     * which stays where it is against the day the coin carries a chip again.
     */
    beliefIcon() {
      const role = this.beliefChip;
      if (!role || !role.id) return "";
      if (role.golemIconData) return role.golemIconData;
      // the static `../assets/icons/` prefix is what webpack builds its
      // require context from — only the leaf may be dynamic
      const file = (role.imageAlt || role.id) + ".png";
      try {
        return require("../assets/icons/" + file);
      } catch (e) {
        return require("../assets/icons/custom.png");
      }
    },
    /**
     * FT-1006: does this seat's menu carry the belief doorway? Two ways in,
     * and they are different questions: the character DEMANDS a lie (schema —
     * a freshly seated Drunk has no belief yet and needs one), or a lie is
     * already on the seat (so it can be changed or cleared even after the
     * character underneath was swapped away). Same guard as the chip above,
     * and for the same reason: never for a player. (FT-1294: the chip's
     * second guard, the face-down grimoire, is retired here too.)
     */
    canSetBelief() {
      if (this.session.isSpectator) return false;
      return believesOther(this.player.role) || isBelieving(this.player);
    },
    /** This chair's character is the one currently in hand. */
    roleArmed() {
      return (
        !!this.$store.state.drawerPick &&
        this.$store.state.drawerPickFrom === this.index
      );
    },
    /**
     * FT-1194: A CHARACTER IS IN HAND AND THIS CHAIR COULD RECEIVE IT — the
     * destination side of the armed move, whichever surface armed it (the
     * seat menu's "Move role", the tray's picked tile, the drawer: they all
     * speak through `drawerPick`, so every one of them invites the same way).
     * The one chair excluded is the origin, which is already wearing the red
     * "in hand" glow — an invitation to put the character back where it is
     * would be noise. Never for a spectator: landing is refused for them
     * (onLifeClick's own guard), and an invitation to a refused act is a lie.
     *
     * "Move player" has the same armed state and gets the same invitation,
     * but that one lives in CSS alone (`li.move`/`li.swap` — TownSquare
     * already binds the fact onto every seat's <li> for exactly the duration
     * of the pick), so there is no second computed for it to drift from.
     */
    moveInvite() {
      return (
        !this.session.isSpectator &&
        !!this.$store.state.drawerPick &&
        this.$store.state.drawerPickFrom !== this.index
      );
    },
    /**
     * WHEN THE CHAIR NUMBERS ITSELF — ALWAYS, unless a character is sitting on
     * it (user's rule, 2026-08-20: "always show the numerals unless there is a
     * role token on them — reveal or hide just hides the role tokens").
     *
     * The numeral is the CHAIR'S OWN NAME, on both sides of the table: it is
     * what "four nominates nine" means, so a player needs it as much as the
     * storyteller does. FT-985 first tied it to the grimoire's reveal state,
     * which cost a player their seat numbers entirely; the user's rule above
     * untied it. FT-1294 has since retired that state altogether, so this
     * reads what it always should have — is anybody sitting here.
     *
     * FT-1328: gated on the viewer's own `coinNumerals` pref too — a LOCAL
     * on/off (golem/prefs, PlayerSettings.vue's Seat section) that hides the
     * numeral on every coin it would otherwise draw, empty or seated, so a
     * viewer who turns it off sees the empty coin's centred resting chair
     * stand alone.
     */
    showSeatNumeral() {
      return (
        this.prefs.coinNumerals !== false &&
        !(this.player.role && this.player.role.id)
      );
    },
    seatNumeral() {
      // IIII, not IV — the clockmaker's convention (user-confirmed)
      const romans = [
        "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X",
        "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"
      ];
      return romans[this.index] || String(this.index + 1);
    },
    /**
     * Golem fork (FT-848): which splatter a death leaves, and how it lies.
     * Hashed from seat + name so every client derives the SAME splatter from
     * the already-synced death state — no extra messages.
     */
    splatStyle: function() {
      if (!this.player.isDead) return null;
      const key = this.index + "·" + this.player.name;
      let h = 2166136261;
      for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = (h * 16777619) >>> 0;
      }
      const pick = h % SPLATS.length;
      const rot = ((h >> 4) % 61) - 30;
      const scale = 1.15 + ((h >> 10) % 30) / 100;
      const dx = ((h >> 15) % 21) - 10;
      const dy = ((h >> 20) % 21) - 10;
      return {
        backgroundImage: `url(${SPLATS[pick]})`,
        transform: `translate(${dx}%, ${dy}%) rotate(${rot}deg) scale(${scale})`
      };
    },
    // Golem fork: a spectator looking at an unclaimed seat. FT-1070 dropped
    // the "and seatless" clause: a SEATED player claiming an empty chair is
    // the MOVE motion — the host's _updateSeat has always vacated the
    // claimant's old seat on confirming the new one, so the whole difference
    // was this gate (and the overlay's label, which now says "Move").
    canOneTapClaim: function() {
      return (
        !!this.session.sessionId &&
        this.session.isSpectator &&
        !this.player.id &&
        !this.seatMoveLocked
      );
    },
    /** FT-1070: this client already holds SOME chair — the reader that turns
     *  an empty seat's overlay from Claim into Move. */
    isSeatedElsewhere: function() {
      return this.players.some(p => p.id === this.session.playerId);
    },
    /**
     * FT-1112: IS A GAME UNDERWAY IN THIS TOWN — asked of the TOWN, not of
     * this browser.
     *
     * `chat.gameId` is the town's current game, named by the storyteller and
     * carried to every client on the ordinary full sync (socket.js's
     * `sendGamestate`, FT-965). It is derived from the host's deal stash, so
     * it appears the moment characters are dealt, is the same string on every
     * client in the room, survives a reload on either side, and goes null
     * again when the game is recorded or the host plays again.
     *
     * The two things it is deliberately NOT:
     *   · `session.isRolesDistributed` — a two-second animation pulse on the
     *     storyteller's client alone, never rebroadcast. It is false here for
     *     the entire game.
     *   · `dealTimeFor(sessionId)` — the host's own localStorage. A player's
     *     browser has never written it, so it is always null on the client
     *     this gate has to work on.
     * Both are readings of the wrong party's state, which is precisely the
     * class of bug this fork has already been bitten by twice.
     */
    gameUnderway() {
      return !!(this.chat && this.chat.gameId);
    },
    /**
     * FT-1112: this client holds a chair and the game has started, so moving
     * to another one is not on offer. The host refuses the claim outright
     * (socket.js's `_updateSeat`); this is the surface half of the same rule
     * — a button that exists and then does nothing is worse than no button.
     *
     * A SEATLESS client is never locked: taking a free chair mid-game is how
     * a dropped player rejoins, and the host allows it for the same reason.
     */
    seatMoveLocked() {
      return this.gameUnderway && this.isSeatedElsewhere;
    },
    /** FT-1070: is this chair icon an actor for THIS client — the host's
     *  eject on any claimed seat, or a player's stand-up on their own. */
    chairAct: function() {
      if (!this.player.id || !this.session.sessionId) return false;
      return !this.session.isSpectator || this.isOwnSeat;
    },
    chairTitle: function() {
      if (!this.chairAct) return "";
      return this.session.isSpectator
        ? "Stand up — you leave this seat but stay in the town"
        : "Empty this seat — they stay in the town";
    },
    /**
     * FT-1107: IS THIS SEAT A COIN THE NIGHT WANTS TAPPED RIGHT NOW?
     *
     * True on EVERY seat while this client is being asked for player picks —
     * including their own chair and including the dead. Which targets a
     * character may legally take is a storyteller's adjudication, not a
     * client's: the Imp may star-pass onto itself, a Fortune Teller may ask
     * about themselves, and half the interesting rulings in this game are
     * about a pick someone thought was illegal. The host's merge is the
     * authority (night/applyPlayerAction), and a refused pick simply never
     * comes back lit.
     *
     * `slots` is the gate rather than the call itself: a character whose
     * choice is words (`freeText`) has nothing to point at, and its player
     * must not be given a ring of live coins that record nothing.
     */
    nightPickable() {
      const call = this.nightCall;
      return !!(call && call.slots > 0);
    },
    /**
     * FT-1291: THE ASK IS OVER — the storyteller has sent their answer, so a
     * coin is a record of what was chosen and no longer an offer to choose.
     *
     * Not folded into `nightPickable`, on purpose. That predicate answers "is
     * the night asking this client to point at players", and everything it
     * gates is still wanted here: the overlay must go on covering the seat (or
     * a tap meant for a pick lands on a nomination), and `nightSlot` — and so
     * the chosen ring and the slot numeral — reads off it. What changes at the
     * send is whether the overlay ANSWERS, which is one class and one guard.
     */
    nightPickLocked() {
      return this.nightPickable && this.nightSent;
    },
    /** The slot this seat is sitting in, or -1. The HOST's record, never a
     *  local guess — an unanswered or refused tap leaves the coin dark. */
    nightSlot() {
      if (!this.nightPickable) return -1;
      return this.nightTargets.indexOf(this.index);
    },
    /** FT-1107: the order mark a picked coin wears — "1"/"2" while the
     *  character has more than one choice to make, and nothing at all when it
     *  has one, where a numeral would be answering a question nobody asked. */
    nightPickMark() {
      if (this.nightSlot < 0) return "";
      const call = this.nightCall;
      return call && call.slots > 1 ? String(this.nightSlot + 1) : "";
    },
    nightPickTitle() {
      if (!this.nightPickable) return "";
      const who = this.player.name || "seat " + (this.index + 1);
      // FT-1291: the hover says WHY on a sent row. Same sentence NightCall
      // puts on the face, so a player who hunts for the reason on the coin
      // they just tried to tap finds the words they already read in the
      // middle of the dial rather than a second, differently-worded one.
      if (this.nightPickLocked) {
        // FT-1330: a receive-only role's coin hover says the same received
        // sentence NightCall puts on the face — one wording, both places.
        const call = this.nightCall;
        if (call && call.receiveOnly) {
          if (this.nightSlot < 0) return "Storyteller received your choice.";
          const deed = call.received ? " " + call.received : "";
          return "Storyteller received your choice — " + who + deed + ".";
        }
        const stands = "The storyteller has answered — your choice stands";
        if (this.nightSlot < 0) return stands;
        return "You chose " + who + " — " + stands;
      }
      return this.nightSlot >= 0
        ? "You chose " + who + " — tap again to take it back"
        : "Choose " + who;
    },
    voteLocked: function() {
      const session = this.session;
      const players = this.players.length;
      if (!session.nomination) return false;
      const indexAdjusted =
        (this.index - 1 + players - session.nomination[1]) % players;
      return indexAdjusted < session.lockedVote - 1;
    },
    zoom: function() {
      // A seat is sized off the window's SHORTER side, which is exactly what
      // `vmin` means. It used to read `window.innerWidth > window.innerHeight`
      // and pick vh or vw by hand — but a computed property only re-runs when
      // one of its reactive deps changes, and the window's size is not one.
      // Rotating a phone therefore left every seat sized in the old
      // orientation's unit until something else happened to touch the roster
      // (13.5vw of a 375px-wide portrait window is 51px; the same expression
      // after a rotation to 812px wide is 110px). `vmin` is resolved by the
      // browser on every reflow, so the staleness cannot happen.
      const unit = "vmin";
      // Smaller across the board (user call 2026-08-18) — the coins were
      // crowding the dial; the ring reads better with air between the seats
      // and the clock face behind them.
      if (this.players.length < 7) {
        return { width: 15.5 + this.grimoire.zoom + unit };
      } else if (this.players.length <= 10) {
        return { width: 13.5 + this.grimoire.zoom + unit };
      } else if (this.players.length <= 15) {
        return { width: 12 + this.grimoire.zoom + unit };
      } else {
        return { width: 10.5 + this.grimoire.zoom + unit };
      }
    },
    /** FT-911: the add-reminder disc's own inline style — null (no override,
     *  the base CSS's opacity gate keeps it invisible either way) until
     *  `measureAddAnchor` has something to report. */
    addAnchorStyle() {
      if (!this.addAnchor) return null;
      const { size, top, left } = this.addAnchor;
      return {
        // border-box, not the base `.reminder` rule's content-box: `size` is
        // `.name`'s own getBoundingClientRect().height, which (like every
        // element under the app's global border-box reset) already includes
        // its border — matching box-sizing here is what makes the disc's
        // rendered height equal the plate's rendered height, border and all,
        // rather than the plate's height plus this disc's own 2x3px border.
        boxSizing: "border-box",
        width: `${size}px`,
        height: `${size}px`,
        top: `${top}px`,
        left: `${left}px`,
        margin: 0,
        padding: 0
      };
    },
    /** FT-923: the bridge's own inline style — the strip of ground between
     *  the plate's edge and the disc's near edge, at the plate's own height.
     *  Rebuilt from `addAnchor` rather than re-measuring: `addAnchor.left`
     *  already encodes which edge the disc's near side sits on (`left - gap`
     *  when the disc docks right of the plate, `left + size` when it docks
     *  left — see measureAddAnchor), so the plate's own edge is recovered by
     *  undoing that arithmetic rather than re-reading the DOM a second time.
     *  `OVERLAP` extends the strip 1px into both neighbours: three boxes
     *  (the real plate, the real disc, this style-only bridge) are each laid
     *  out from the same numbers but can each round to a different physical
     *  pixel, and a 1px overlap is cheaper than chasing that rounding exactly. */
    addBridgeStyle() {
      if (!this.addAnchor) return null;
      const { side, size, top, left, gap } = this.addAnchor;
      const OVERLAP = 1;
      const bridgeLeft = (side > 0 ? left - gap : left + size) - OVERLAP;
      return {
        position: "absolute",
        boxSizing: "border-box",
        width: `${gap + OVERLAP * 2}px`,
        height: `${size + OVERLAP * 2}px`,
        top: `${top - OVERLAP}px`,
        left: `${bridgeLeft}px`,
        margin: 0,
        padding: 0
      };
    }
  },
  data() {
    return {
      isMenuOpen: false,
      // the plate is hovered — reveals the add-reminder disc (see the
      // .name-hover rule; the disc is the plate's sibling, so CSS alone
      // cannot reach it)
      nameHover: false,
      // Golem fork: the name to apply once a one-tap claim lands.
      pendingName: null,
      // Golem fork: first claim on this browser asks the name in place.
      askName: false,
      claimName: "",
      // The seat menu's in-place edit: null, or { field, value }. Opened by
      // changeName / changePronouns, which used to open a browser dialog.
      edit: null,
      // FT-1319: the own-plate rename ask is up (seated player viewer only —
      // see onPlateClick), and the name being typed into it.
      renaming: false,
      renameValue: "",
      isSwap: false,
      // FT-858: the coin the seat's hover card is pinned to; null when
      // nothing is showing
      cardAnchor: null,
      // FT-1069 rider: the card reads THIS role instead of the seat's truth
      // while the belief chip is the hover target; null everywhere else
      beliefCardRole: null,
      // FT-990: which side the card tries first — "right" when the name plate
      // raised it, "auto" (lean outward, away from the ring's middle) when the
      // coin did. See showCard.
      cardPrefer: "right",
      // FT-911: the add-reminder disc's own dock — { side, size, top, left },
      // all measured off the rendered name plate. Null until mounted (or
      // if the plate can't be found), which the disc's CSS reads the same
      // way cardAnchor's absence already does: nothing to show yet.
      addAnchor: null,
      // FT-1167: the measured coin-relative placement the reminder fan hangs
      // off (see measureReminderAnchor). Null until the first measurement, and
      // the FT-869 stylesheet rule draws that frame.
      reminderAnchor: null,
      // FT-1117: this gesture on a reminder became a DRAG, so the click that
      // may follow it is the drag's own tail and must not remove the token.
      // Cleared by the next mousedown on a reminder — see the template note.
      reminderDragged: false,
      // FT-1213: the same fact for the NAME PLATE — this gesture on `.name`
      // passed the browser's drag threshold and became a seat drag, so its
      // trailing click must not open the plate menu (see onPlateClick).
      plateDragged: false,
      // FT-1169: this browser's own settings, snapshot-and-refresh (see the
      // import note). `controlScheme` is read here; FT-1328 adds
      // `coinNumerals` (showSeatNumeral below).
      prefs: { ...prefsState },
      // FT-1169: does this device HAVE a resting pointer? Read once — it is a
      // property of the machine, not of the session — and used to fall the
      // hover scheme back to the nameplate on a touch screen.
      hasHover: true,
      // FT-1169: the seat menu is up, and the coin it is pinned to. The
      // element rather than a flag alone: SeatMenu measures the anchor fresh
      // at placement time, the same contract RoleHoverCard's `anchor` keeps.
      seatMenuAnchor: null,
      // FT-1169: this seat's outward direction in screen space, handed to the
      // menu so it can lean away from the middle of the clock. Read off the
      // seat's own transform matrix at open time — see seatOutwardVector.
      seatMenuOutward: { x: 0, y: -1 },
      // FT-1180: WHICH PRESENTATION is up — "plate" (the nameplate click's
      // glassy plate on the coin) or "ring" (the hover coin's ring of little
      // coins). It is stored at OPEN time rather than read from
      // `controlScheme` at render time so that a setting changed under an
      // open menu cannot morph one surface into the other mid-gesture; the
      // scheme watcher closes the menu instead (see readPrefs).
      seatMenuMode: "plate",
      // FT-1206: the inline whisper box is up, pinned to this coin — the
      // element, same contract as seatMenuAnchor.
      whisperAnchor: null,
      // FT-1206: the whisper box was opened FROM the nameplate plate, so
      // Esc/click-out restores that menu rather than just closing (the
      // user's spec: the plate's content swaps to the input and back).
      whisperFromPlate: false,
      // FT-1206: the town's chat level, snapshotted — a town rule off the
      // tower shelf, refreshed on TOWER_EVENT like every tower reader.
      chatLevel: towerState.chatLevel,
      // FT-1315: what marks a SPENT ghost vote on this town's seats — "cowl"
      // (today's crossed mark) or "shroud" (the veil drops instead). Same
      // shelf, same snapshot idiom, same TOWER_EVENT reader as chatLevel.
      ghostSpentMark: towerState.ghostSpentMark,
      // FT-1242: the menu rows' own marks — see the import note.
      // FT-1337: uiSeat stood down with its import — the chair rows are
      // masked spans on var(--chair) now.
      uiNote,
      uiMoveRole,
      uiMovePlayer,
      uiNominateHand,
    };
  },
  mounted() {
    this.remeasureSeat();
    // FT-1169: the control scheme can change while a town is open (the corner
    // menu sets it), and every seat has to hear it.
    window.addEventListener(PREFS_EVENT, this.readPrefs);
    // FT-1206: …and the chat level too — a whisper row's guard changes with
    // it, under an open menu included.
    window.addEventListener(TOWER_EVENT, this.readChatLevel);
    try {
      this.hasHover = window.matchMedia("(hover: hover)").matches;
    } catch (e) {
      // no matchMedia: assume a pointer, which is the desktop this app is for
      this.hasHover = true;
    }
    window.addEventListener("resize", this.remeasureSeat);
    window.addEventListener("orientationchange", this.remeasureSeat);
    // Catches what a resize event misses: this seat's own box can change
    // size without the WINDOW resizing (the zoom slider, a seat count
    // change reflowing every coin — see TownSquare.vue's measureBluffAnchor,
    // which documents the identical gap for the demon's bluffs).
    if (typeof ResizeObserver !== "undefined") {
      this._addRO = new ResizeObserver(() => this.remeasureSeat());
      this._addRO.observe(this.$el);
    }
  },
  beforeDestroy() {
    clearTimeout(this.$options.cardTimer);
    clearTimeout(this.$options.hideTimer);
    // FT-1169: the hover scheme's own open/close timers ride the same options
    // bag the card's do, so they are cleared in the same breath.
    clearTimeout(this.$options.menuTimer);
    clearTimeout(this.$options.menuHideTimer);
    window.removeEventListener(PREFS_EVENT, this.readPrefs);
    window.removeEventListener(TOWER_EVENT, this.readChatLevel);
    window.removeEventListener("resize", this.remeasureSeat);
    window.removeEventListener("orientationchange", this.remeasureSeat);
    if (this._addRO) this._addRO.disconnect();
  },
  watch: {
    // Closing the seat menu — by tapping the plate again, or by any row that
    // closes it — abandons a half-typed edit rather than leaving it armed to
    // reappear on the next open.
    isMenuOpen(open) {
      if (!open) this.edit = null;
    },
    // Golem fork: the host confirming our claim sets player.id to our own id —
    // that is the moment the pending name becomes this seat's name.
    "player.id"(id) {
      if (id === this.session.playerId && this.pendingName) {
        this.$store.commit("players/update", {
          player: this.player,
          property: "name",
          value: this.pendingName
        });
        this.pendingName = null;
      }
      // FT-1319: a rename ask open on a chair that stops being yours (swept,
      // emptied by the host, stood up) folds rather than committing onto a
      // seat that no longer belongs to this viewer — commitRename re-checks
      // isOwnSeat for the race the watcher cannot see.
      if (this.renaming && id !== this.session.playerId) {
        this.renaming = false;
      }
    },
    // The zoom slider and a seat count change both resize every coin (and
    // therefore, indirectly, nothing about the plate's OWN font-driven
    // height — but a seat count change can also re-seat this <li> at a new
    // clock position, which changes `side`).
    "grimoire.zoom"() {
      this.$nextTick(this.remeasureSeat);
    },
    "players.length"() {
      this.$nextTick(this.remeasureSeat);
    },
    // FT-1167: a token arriving on a seat that had none is the one case with
    // nothing rendered to measure from — the anchor is read off a real
    // reminder box, so the first one has to land before it can be placed.
    // Measured on the very next tick, which is before the browser paints, so
    // there is no visible settle.
    "player.reminders": {
      deep: true,
      handler() {
        this.$nextTick(this.measureReminderAnchor);
      },
    },
    // FT-1167: the checklist disc IS the plate the fan has to clear, and it
    // only exists at night — so the swing has to be re-solved the moment the
    // night opens or closes.
    "grimoire.isNight"() {
      this.$nextTick(this.measureReminderAnchor);
    },
    // FT-1090: the drag ghost is built from a DECODED image or it is not built
    // at all (see roleDrag.js's stage note — an undecoded one makes
    // `setDragImage` a silent no-op, which is the bug this lane fixed). Every
    // other surface warms its ghost by asking roleDrag for the art it paints;
    // the seat coin asks Token.vue instead, so it warms explicitly here — on
    // mount and on every re-cast, long before a pointer can go down on it.
    "player.role.id": {
      immediate: true,
      handler() {
        warmRoleIcon(this.player.role);
      }
    }
  },
  methods: {
    /** FT-1167: both of this seat's measured anchors answer to the same
     *  events — a window resize, an orientation change, the zoom slider, a
     *  seat count change, and the seat's own box changing size under the
     *  ResizeObserver. One handler so a listener added is a listener removed. */
    remeasureSeat() {
      this.measureAddAnchor();
      this.measureReminderAnchor();
    },
    // ── FT-1169: THE THREE CONTROL SCHEMES, wired ────────────────────────
    /** golem/prefs is a plain module object; this is the refresh half of the
     *  snapshot idiom every other consumer of it uses. */
    readPrefs() {
      this.prefs = { ...prefsState };
      // the scheme just changed under an open menu — a menu opened by a
      // gesture that no longer exists is a menu nothing will close
      if (this.seatMenuAnchor) this.closeSeatMenu();
      // FT-1206: same fate for the whisper box, same reason — and without
      // the restore, since the plate that would come back is the old
      // scheme's too
      if (this.whisperAnchor) {
        this.whisperFromPlate = false;
        this.whisperAnchor = null;
      }
    },
    /**
     * FT-1169: THE COIN'S HOVER, routed by scheme.
     *
     * The coin is three boxes (the shroud, the life token, the coin itself —
     * see showCard's own note for why, measured), and all three already
     * carried the role card's hover. They now carry ONE handler that decides
     * which of the two things a rest on the coin means, so there is a single
     * place where the answer lives rather than three bindings to keep in
     * step.
     *
     * THE CARD AND THE MENU CANNOT BOTH HAVE IT. They are two plates that
     * open off the same coin, on the same gesture, leaning the same way
     * (outward — the only direction that clears the disc), so "show both" is
     * not a design, it is two boxes on top of each other. In the hover scheme
     * the MENU wins the coin, because opening the menu is the entire reason
     * somebody picked that scheme; the card is what yields. It is not gone
     * from the seat — the belief chip still raises it (showBeliefCard,
     * untouched), and both of the other two schemes leave the coin's card
     * exactly as it is today.
     */
    onCoinEnter(e) {
      // FT-1213: "hover coins" is its own toggle now; the menu still wins
      // the coin over the role card whenever it is on (the rule below).
      if (!this.ctrlHoverCoins) {
        this.showCard(e);
        return;
      }
      // the card must not be left standing under a menu that is about to
      // open where it is
      this.hideCard();
      clearTimeout(this.$options.menuHideTimer);
      clearTimeout(this.$options.menuTimer);
      if (this.seatMenuAnchor) return;
      if (!this.canOpenSeatMenu()) return;
      // a much shorter rest than the card's (FT-1194) — sweeping across the
      // square still doesn't strobe rings open, but a genuine stop answers
      // near-instantly; see RING_DELAY's own note.
      this.$options.menuTimer = setTimeout(() => {
        this.openSeatMenu("ring");
      }, RING_DELAY);
    },
    /**
     * Leaving a coin only ARMS the close, and the menu itself cancels it —
     * see onSeatMenuEnter. Without that pair the menu would vanish in the gap
     * between the coin's rim and its own first row, which is the one gesture
     * a hover menu absolutely has to survive.
     *
     * The grace is the card's own HOVER_GRACE, and it is shorter than the
     * open delay, so a genuine exit is closed long before any neighbouring
     * seat could acquire.
     */
    onCoinLeave() {
      if (!this.ctrlHoverCoins) {
        this.hideCardSoon();
        return;
      }
      clearTimeout(this.$options.menuTimer);
      this.closeSeatMenuSoon();
    },
    /** The pointer reached the plate — this is not leaving. */
    onSeatMenuEnter() {
      clearTimeout(this.$options.menuHideTimer);
    },
    /** …and leaving the plate is, in the hover scheme. In the nameplate
     *  scheme the menu was opened by a CLICK and stays until it is dismissed,
     *  which is what a clicked menu means everywhere else in this app. */
    onSeatMenuLeave() {
      // FT-1213: the open MODE decides, not the scheme setting — a ring was
      // opened by a hover and follows the pointer out; a plate was opened by
      // a click and stays until dismissed, whatever else is toggled on.
      if (this.seatMenuMode !== "ring") return;
      this.closeSeatMenuSoon();
    },
    /**
     * FT-1169: the name plate's click, routed by scheme.
     *
     * The retired FT-1068 menu's own toggle is kept behind `showSeatMenu`
     * exactly as it was — this adds a branch in front of it rather than
     * taking it over.
     */
    onPlateClick() {
      // FT-1213 PAIR RULE — nameplate click vs the name drag. Both live on
      // `.name` now (independent toggles), and this app has measured proof
      // that a completed drag can deliver a trailing click (the reminder
      // token's own `reminderDragged` note). The browser's native drag
      // threshold decides which gesture this was: a press that never moved
      // far enough stays a click and opens the plate; one that passed the
      // threshold fired `dragstart` (onPlayerDragStart marks it) and its
      // trailing click, if any, must not ALSO open the plate over the seat
      // that was just moved. Cleared by the next mousedown on the plate —
      // same lifecycle as the reminder's flag.
      if (this.plateDragged) return;
      // FT-1319: a seated PLAYER's own plate is their rename field. First,
      // deliberately: a spectator's plate click has always been inert
      // (seatMenuEntries is empty for them, so the branch below refuses),
      // and the storyteller never enters this branch (not a spectator), so
      // their plate menu is untouched.
      if (this.session.isSpectator && this.isOwnSeat) {
        this.openRename();
        return;
      }
      if (this.ctrlNameplateClick) {
        if (this.seatMenuAnchor) this.closeSeatMenu();
        else if (this.canOpenSeatMenu()) this.openSeatMenu("plate");
        return;
      }
      if (this.showSeatMenu) this.isMenuOpen = !this.isMenuOpen;
    },
    /**
     * MAY A MENU OPEN RIGHT NOW.
     *
     * Two refusals, and the second is the one worth stating.
     *
     *   · no rows to show — an empty plate is not a menu
     *   · A TWO-STEP ACT IS ALREADY RUNNING. "Move player", "Swap seats" and
     *     "Player nominates" all arm this seat and then wait for the
     *     storyteller to pick a TARGET on another seat; while that is up,
     *     every seat on the ring is wearing a big overlay icon that finishes
     *     the act. A menu opening on the seat being pointed AT would stand
     *     between the storyteller and the only control that completes the
     *     thing they just started.
     *
     *     It is read off the seat's own rendered classes because that is
     *     where the fact is: TownSquare binds `move`/`swap`/`nominate` onto
     *     every seat's `<li>` for exactly the duration of the pick (see its
     *     `<Player>` binding). Asking the DOM keeps this lane out of the
     *     store, which another lane holds, and there is no second copy of the
     *     state to fall out of step with.
     */
    canOpenSeatMenu() {
      if (!this.seatMenuEntries.length) return false;
      const cl = this.$el && this.$el.classList;
      if (
        cl &&
        (cl.contains("move") || cl.contains("swap") || cl.contains("nominate"))
      )
        return false;
      return true;
    },
    /**
     * FT-1180: `mode` picks the PRESENTATION — "ring" for the hover coin's
     * ring of little coins, "plate" for the nameplate click's glassy plate.
     * It is the caller's word rather than a re-read of `controlScheme`
     * because the two gestures are what differ, and a third caller (a hotkey,
     * a coarse-pointer long press) should be able to ask for either without
     * having to pretend to be a scheme.
     */
    openSeatMenu(mode) {
      const coin = this.$el.querySelector(".player .token");
      if (!coin) return;
      // the role card and the menu never stand together — see onCoinEnter
      this.hideCard();
      this.seatMenuMode = mode === "ring" ? "ring" : "plate";
      this.seatMenuOutward = this.seatOutwardVector();
      this.seatMenuAnchor = coin;
    },
    closeSeatMenu() {
      clearTimeout(this.$options.menuTimer);
      clearTimeout(this.$options.menuHideTimer);
      this.seatMenuAnchor = null;
    },
    closeSeatMenuSoon() {
      clearTimeout(this.$options.menuHideTimer);
      this.$options.menuHideTimer = setTimeout(() => {
        this.seatMenuAnchor = null;
      }, HOVER_GRACE);
    },
    /**
     * THIS SEAT'S OUTWARD DIRECTION in screen space, unit length — the vector
     * `seatOutwardSide` already reduces to a left/right answer, kept whole
     * because the menu has to lean UP off a 12 o'clock chair and DOWN off a 6
     * o'clock one, which a side cannot say.
     *
     * Same reading measureAddAnchor documents at length: the ring's
     * `on-circle` mixin rotates each seat's `<li>` by a CSS transform, so the
     * li's own computed matrix is the ground truth for "which way is outward"
     * — not a second derivation off bounding boxes, which that note records
     * getting several seats backwards. `matrix(a, b, c, d, e, f)` maps local
     * "straight up" (0, -1) to screen (-c, -d).
     */
    seatOutwardVector() {
      const matrix = /matrix\(([^)]+)\)/.exec(
        getComputedStyle(this.$el).transform
      );
      if (!matrix) return { x: 0, y: -1 };
      const parts = matrix[1].split(",").map(Number);
      const x = -parts[2];
      const y = -parts[3];
      const len = Math.sqrt(x * x + y * y) || 1;
      return { x: x / len, y: y / len };
    },
    /**
     * FT-1169: one row picked.
     *
     * EVERY BRANCH REACHES FOR A THING THAT ALREADY EXISTS. Kill is the
     * shroud's own toggle, Change role is the coin's own `set-role`, the two
     * moves are the drags' own destinations, the nomination is the accusing
     * mark's own call and the ghost vote is the cowl's own toggle. Nothing
     * here invents state, which is why a row and the mark it duplicates can
     * never disagree.
     *
     * The menu closes FIRST in every case: three of these rows open a modal
     * or arm a ring-wide pick, and a plate left standing over the coin would
     * be in the way of both.
     */
    runSeatAction(id) {
      // FT-1180: the entry names its own method, so this is a LOOKUP rather
      // than a switch. Which method an action runs is a fact about the
      // action, and it now lives beside that action's label, icon and guard
      // in golem/seatActions instead of in a second list here that had to be
      // kept in step by hand.
      const entry = this.seatMenuEntries.find((e) => e.id === id);
      if (!entry) return;
      // THE GUARD IS CHECKED AGAIN HERE, and not out of caution: a disabled
      // row is now DRAWN rather than absent, so "the row cannot be clicked"
      // is a property of two surfaces' event handlers rather than of the
      // list. One of them will eventually forget.
      if (entry.disabled) return;
      // The menu closes FIRST in every case: three of these acts open a modal
      // or arm a ring-wide pick, and a plate left standing over the coin
      // would be in the way of both.
      this.closeSeatMenu();
      const run = this[entry.act];
      if (typeof run === "function") run.call(this);
    },
    /**
     * FT-1332: THE MENU'S OWN NOOSE — toggle this seat's execution mark.
     * Exactly the vote overlay's pair of writes (Vote.vue's setMarked /
     * removeMarked): one mutation, `session/setMarkedPlayer`, which FT-1311
     * made seat-surgery-proof and which broadcasts, writes the chronicle
     * line and clears a standing tie on its own. Marked here → clear it;
     * anything else (including another seat marked) → the mark comes to
     * this seat, the mutation's own move-the-mark semantics.
     */
    toggleExecutionMark() {
      const on = this.session.markedPlayer === this.index;
      this.$store.commit("session/setMarkedPlayer", on ? -1 : this.index);
    },
    /** FT-1206: the chat level snapshot — TOWER_EVENT's reader.
     *  FT-1315: the spent-ghost-vote vocabulary rides the same read — one
     *  listener per seat, both tower facts this seat renders from. */
    readChatLevel() {
      this.chatLevel = towerState.chatLevel;
      this.ghostSpentMark = towerState.ghostSpentMark;
    },
    /**
     * FT-1206: OPEN THE INLINE WHISPER on this seat's coin. Reached from all
     * three schemes — the plate's row and the ring's coin land here through
     * runSeatAction (the entry's own `act`), the click scheme's disc calls it
     * directly. The plate case remembers where it came from: Esc/click-out
     * swaps the glass back to the menu, the user's own spec.
     */
    openSeatWhisper() {
      const coin = this.$el.querySelector(".player .token");
      if (!coin) return;
      // FT-1213: the MODE alone says where the box came from — "plate" is
      // only ever set by the nameplate click's own open path.
      this.whisperFromPlate = this.seatMenuMode === "plate";
      this.hideCard();
      this.whisperAnchor = coin;
    },
    /** Esc/click-out: the plate scheme gets its menu back; everywhere else
     *  the box simply goes. */
    closeSeatWhisper() {
      const restore = this.whisperFromPlate;
      this.whisperFromPlate = false;
      this.whisperAnchor = null;
      if (restore && this.canOpenSeatMenu()) this.openSeatMenu("plate");
    },
    /**
     * FT-1206: SEND — the Chronicle composer's own whisper, from the seat.
     * One frame builder (golem/chat's whisperFrame), one funnel (the chatSay
     * mutation → socket.sendChat), so the store round trip, the privacy
     * lane, the plane and the recipient's toast all come for free. The guard
     * is re-checked at the send: the level can change while the box stands,
     * and a refusal lands where the Chronicle's own refusals land
     * (chatError, under its composer).
     */
    sendSeatWhisper(body) {
      this.whisperFromPlate = false;
      this.whisperAnchor = null;
      const why = this.whisperRefusalText;
      if (why) {
        this.$store.commit("chatError", why);
        return;
      }
      const seat = this.seatIndex;
      const target = {
        id: this.player.id,
        key: this.player.name || `Seat ${seat + 1}`,
        seat,
      };
      this.$store.commit(
        "chatSay",
        whisperFrame(this.$store.state, target, body),
      );
    },
    /** The click scheme's disc — a refused disc teaches from its tooltip and
     *  swallows the click, the fixed-list rule's own behaviour. */
    onWhisperDiscClick() {
      if (this.whisperRefusalText) return;
      if (this.whisperAnchor) {
        this.closeSeatWhisper();
        return;
      }
      this.openSeatWhisper();
    },
    /**
     * FT-1180: A GRAB ON THE GLASS PLATE IS A GRAB ON WHAT IS UNDER IT.
     *
     * The plate lies on the coin (the user: "it shouldn't be to the side"),
     * and a six-row plate reaches over the name plate as well — so both of
     * this seat's drag handles are under it while it is up. The user's rule
     * that the drags stay live in every scheme is kept by handing the gesture
     * on rather than by moving the plate off them.
     *
     * THE ROLE DRAG WINS WHEN THERE IS ONE, because the coin is the handle
     * the plate is actually centred on, and carrying a character to another
     * chair is the act that grab means everywhere else in this app. A chair
     * with nobody's character on it has no such gesture, and there the plate
     * carries the name plate's own move/swap instead — the same fallback
     * order the two handles have when nothing is covering them.
     */
    onPlateSeatDrag(e) {
      if (this.canDragCoin) {
        this.onRoleDragStart(e);
        return;
      }
      if (this.canDragPlayer) this.onPlayerDragStart(e);
    },
    /** FT-1180: the coin's own set-role, as a named method — the seat menu
     *  reaches acts by name now (see `runSeatAction`), and an act that was
     *  only ever an inline `$emit` had no name to reach. Same emit the coin's
     *  own click makes. */
    openRoleModal() {
      // FT-1271: THE SEAT'S OWN WRITER ASKS THE VOCABULARY'S OWN QUESTION.
      //
      // Every seat-originated way of repainting this coin ends here — the
      // plate row's act, the ring coin's act, the assigned coin click
      // (runSeatClickAction → runSeatAction) and the player's direct coin
      // click below — so this is the one place the own-coin rule has to hold
      // for the seat, and it holds it with the SAME function the `role`
      // entry's guard calls. The menus' disabled row and this refusal can
      // therefore never disagree; what the row adds is the sentence, which a
      // click has nowhere to put (runSeatClickAction's own note).
      //
      // NOT A DOUBLE GUARD, and the distinction matters for whoever adds the
      // next path: this covers gestures that start ON THE SEAT. A drag that
      // starts somewhere else and lands on a chair — the script drawer's
      // characters, say — never comes through this component, and must ask
      // roleChangeRefusal at its own writer (TownSquare's openRoleModal /
      // placeRole are where those land).
      if (roleChangeRefusal(this.seatActionContext)) return;
      this.$emit("trigger", ["openRoleModal"]);
    },
    /** FT-1180: likewise the add-reminder disc's own emit. */
    openReminderModal() {
      this.$emit("trigger", ["openReminderModal"]);
    },
    /** FT-1180: the ghost-vote cowl's own toggle, named. */
    toggleGhostVote() {
      this.updatePlayer("isVoteless", !this.player.isVoteless);
    },
    /**
     * FT-858: rest on a seat and it tells you what its character does.
     * FT-990: THE COIN ASKS TOO (user call: "at some point we lost the hover on
     * a player coin to see the role info box — bring it back").
     *
     * WHAT ACTUALLY COVERS THE COIN, which is what decides where these
     * handlers have to live. Measured, not assumed — the seat paints four
     * boxes over the same square and only some of them take a pointer:
     *
     *   .shroud   the coin's top 45% of the SEAT (~61% of the coin), z-index 2,
     *             a live click target (the death toggle). The ghost's art is
     *             this div's `:before` and is `pointer-events: none`, so
     *             hovering the ghost IS hovering this div.
     *   .life     the whole coin square. Turned away (`rotateY(180deg)` +
     *             `backface-visibility: hidden`), which takes it out of
     *             hit-testing entirely.
     *   .token    the coin itself. Frontmost below the shroud — so on its own
     *             it would have answered for the coin's bottom third and
     *             nothing else.
     *   .overlay / .marked / .seat-numeral   all `pointer-events: none`.
     *
     * So the coin is not ONE box, and binding to `<Token>` alone would have
     * given a hover that works on the bottom of a coin and dies on the top —
     * which is the shape of the original complaint, not its fix. All three
     * boxes carry it; together they are the coin.
     *
     * FT-1294: A REFUSAL CAME OUT OF THIS METHOD, and it is worth being exact
     * about what it was, because its own comment called it a leak guard.
     *
     *   if (this.grimoire.isPublic && role.team !== "traveler") return;
     *
     * What actually keeps the grimoire off a player's screen is the WIRE: a
     * role reaches only the socket holding that chair (socket.js), so every
     * other seat in a player's roster carries `role: {}` and is refused one
     * line above this, by `if (!role || !role.id) return`. The face-down flag
     * was a SECOND line in front of that one — and in this fork it had not
     * fired for a player in a long time, because a player's coins were face
     * UP (their entry path committed it, so they could see their own). The
     * comment described upstream's arrangement, not ours. Retiring it takes
     * nothing away from the guard that is doing the work.
     */
    showCard(e) {
      const role = this.player.role;
      if (!role || !role.id) return;
      if (!window.matchMedia("(hover: hover)").matches) return;
      const fromPlate =
        !!e.currentTarget && e.currentTarget.classList.contains("name");
      // WHERE THE CARD PARKS, and why the two sides differ.
      //
      // The PLATE keeps what FT-858 gave it (user call 2026-08-19): it sits
      // below the ring with no neighbour to lie across, so a fixed side reads
      // better than one that flips with the seat's clock position.
      //
      // The COIN asks to lean OUTWARD instead — it is IN the ring, and a fixed
      // side would lay the card across the seats next door.
      //
      // FT-1167 rider (user): "think we can always have role hovers show on the
      // outside of the coin, left if left side right if right if there is room
      // for them there?" It used to ask for "auto", which leans away from the
      // middle of the WINDOW. That is nearly the ring's own outward direction
      // and not quite: the ring is centred on `#townsquare`, not on the window,
      // and for the 12 and 6 o'clock chairs the window's centre line falls
      // straight through the coin, so those two seats' cards flipped sides on a
      // pixel. `seatOutwardSide` asks the SEAT instead — its own rotation, the
      // same reading `measureAddAnchor` and the reminder fan already take — so
      // the answer is the ring's geometry rather than a proxy for it.
      //
      // Either way the card is anchored to the COIN element rather than to
      // whichever of the three boxes caught the pointer: the shroud is a squat
      // 45% banner and a card centred on it rides high off its own seat.
      const anchor = fromPlate
        ? e.currentTarget
        : this.$el.querySelector(".token") || e.currentTarget;
      const prefer = fromPlate ? "right" : this.seatOutwardSide();
      // a pending hide is abandoned — this is what makes the gap between the
      // coin and the plate crossable (see hideCardSoon)
      clearTimeout(this.$options.hideTimer);
      clearTimeout(this.$options.cardTimer);
      // FT-1069 rider: every doorway but the belief chip reads the truth
      this.beliefCardRole = null;
      // ALREADY UP: re-anchor now, with no second wait. The delay exists to
      // stop a sweep across the square strobing cards ON; once this seat's card
      // is showing, moving between its own coin and its own plate is one
      // continuous read and a re-acquisition delay there would show as the card
      // blinking out and back.
      if (this.cardAnchor) {
        this.cardAnchor = anchor;
        this.cardPrefer = prefer;
        return;
      }
      this.$options.cardTimer = setTimeout(() => {
        this.cardAnchor = anchor;
        this.cardPrefer = prefer;
      }, HOVER_DELAY);
    },
    /**
     * FT-990: leaving a hover target only ARMS the hide.
     *
     * The coin and the plate are separate boxes with real ground between them
     * (the plate is nudged down 5px), so a straight cursor move from one to the
     * other leaves both — and an immediate hide there drops the card and the
     * next handler raises it again, which is the flicker. The grace is shorter
     * than the acquire delay, so it never keeps a card alive across a genuine
     * exit; `showCard` cancels it, so it costs nothing on a real crossing.
     *
     * This is the same problem FT-923 solved for the add-reminder disc with an
     * invisible bridge element. A timer is the right answer HERE because there
     * are three separate targets on two different faces of the seat, so the
     * ground to be bridged is not one measurable strip.
     */
    hideCardSoon() {
      clearTimeout(this.$options.cardTimer);
      clearTimeout(this.$options.hideTimer);
      this.$options.hideTimer = setTimeout(() => {
        this.cardAnchor = null;
      }, HOVER_GRACE);
    },
    /** Immediate — the card's own `dismiss` (a scroll, a resize, a DRAG
     *  starting) wants to be out of the way this frame, not in 120ms. */
    hideCard() {
      clearTimeout(this.$options.cardTimer);
      clearTimeout(this.$options.hideTimer);
      this.cardAnchor = null;
      this.beliefCardRole = null;
    },
    /**
     * FT-1069 rider (user): resting on the belief chip raises THE role hover
     * card for the BELIEVED role — the same single-card contract every other
     * surface keeps (FT-1060 wired the chronicle roster the same way: a
     * 170ms rest — HOVER_DELAY here is that same number — behind a
     * `(hover: hover)` gate, so a touch scroll never strobes cards).
     *
     * The "?" placeholder chip has no believed role yet, so it shows no card
     * (first guard). Clicking the chip still opens the belief modal —
     * untouched, this is hover only.
     *
     * Same body as showCard past its guards, minus the plate branch: the
     * chip is a coin-rim element, so the card leans outward like the coin's
     * own.
     *
     * FT-1080 amends what this note used to say. The chip WAS inside `.token`,
     * so crossing chip→coin re-fired no mouseenter and hideBeliefCard alone
     * had to hand the card back. The chip is now a SIBLING of the coin (see
     * the belief dock in the template), so that crossing does fire the coin's
     * own `showCard` — which clears `beliefCardRole` and re-anchors by itself.
     * hideBeliefCard still hands back, and now also arms the same soft hide
     * every other hover box arms, because leaving the seat FROM the chip no
     * longer passes through the coin's mouseleave.
     */
    showBeliefCard(e) {
      const role = this.player.believedRole;
      if (!role || !role.id) return;
      if (!window.matchMedia("(hover: hover)").matches) return;
      const anchor = e.currentTarget;
      clearTimeout(this.$options.hideTimer);
      clearTimeout(this.$options.cardTimer);
      if (this.cardAnchor) {
        this.beliefCardRole = role;
        this.cardAnchor = anchor;
        this.cardPrefer = "auto";
        return;
      }
      this.$options.cardTimer = setTimeout(() => {
        this.beliefCardRole = role;
        this.cardAnchor = anchor;
        this.cardPrefer = "auto";
      }, HOVER_DELAY);
    },
    /**
     * Leaving the chip hands the card back to the seat's TRUTH, anchored on
     * the coin.
     *
     * FT-1080: and arms the same soft hide the coin and the plate arm. The
     * chip used to sit inside `.token`, so any exit from it also crossed the
     * coin's own mouseleave and that timer got set for free; docked beside the
     * coin it does not, and an exit straight off the chip's outward half would
     * otherwise leave the truth card up with nothing left to take it down.
     * `showCard` cancels the timer the instant the cursor lands on the coin,
     * so the chip→coin crossing costs nothing (that is the same grace the
     * coin↔plate gap already rides — see hideCardSoon).
     */
    hideBeliefCard() {
      this.beliefCardRole = null;
      if (this.cardAnchor) {
        this.cardAnchor = this.$el.querySelector(".token") || this.cardAnchor;
        this.cardPrefer = "auto";
        this.hideCardSoon();
      } else {
        // nothing up yet — a pending belief card must not pop after the
        // cursor has already moved on
        clearTimeout(this.$options.cardTimer);
      }
    },
    /**
     * FT-911: where the add-reminder disc docks — beside this seat's own
     * name plate, not parked on the coin.
     *
     * SIDE is read off THIS seat's own <li> (`this.$el` — Player.vue's
     * template root IS the seat's <li>), the same way TownSquare.vue's
     * measureBluffAnchor answered the identical question for the demon's
     * bluffs: the ring's on-circle mixin rotates each seat's <li> by CSS
     * transform, so the li's OWN computed matrix is the ground truth for
     * "which way is outward from this seat" — not a second derivation off
     * bounding boxes, which gets several seats backwards (see
     * measureBluffAnchor's own comment for the measured case).
     * `matrix(a, b, c, d, e, f)` maps local "straight up" (0, -1) — outward,
     * before rotation — to screen-space (-c, -d). `ox > 0.05` means this
     * seat sits right-of-hub; at 12 and 6 o'clock ox≈0 and the threshold
     * resolves that to left, which is exactly the "12 or 6 → left" rule
     * with no separate case needed.
     *
     * SIZE is the plate's own rendered height, MEASURED rather than
     * approximated in vmin/%: the plate's height comes from font metrics
     * and padding, not the seat's own width, so no percentage of the seat
     * tracks it.
     *
     * Both are read off `.name`'s real box, relative to `.player`'s: this
     * disc is `.name`'s sibling inside `.player` now (see the template),
     * not `<li>`'s own direct-child sibling, specifically so a plain
     * top/left measured against `.player` lands correctly — `.player`'s own
     * counter-rotation (the on-circle mixin's `> * { rotate($rot * -1deg) }`)
     * composes with the seat's rotation to a pure translation for
     * everything inside it, the same free ride `.name` itself already gets.
     */
    measureAddAnchor() {
      const playerEl = this.$el.querySelector(".player");
      // `:scope >` — a PLAIN `.name` descendant selector also matches
      // Token.vue's `<svg class="name">` (the role's name arc, a grandchild
      // of `.player` via `.token`), which sits earlier in the DOM than the
      // seat's own plate and so wins a plain querySelector — measured
      // wrong: the coin-sized SVG's own height, not the plate's. The plate
      // is `.player`'s own direct child; the SVG is not.
      const nameEl = playerEl && playerEl.querySelector(":scope > .name");
      if (!playerEl || !nameEl) {
        this.addAnchor = null;
        return;
      }
      const nameRect = nameEl.getBoundingClientRect();
      const playerRect = playerEl.getBoundingClientRect();
      if (!nameRect.height) {
        this.addAnchor = null;
        return;
      }
      let ox = 0;
      const matrix = /matrix\(([^)]+)\)/.exec(
        getComputedStyle(this.$el).transform
      );
      if (matrix) {
        const parts = matrix[1].split(",").map(Number);
        ox = -parts[2]; // -c
      }
      const side = ox > 0.05 ? 1 : -1;
      const size = nameRect.height;
      const GAP = 6; // matches TownSquare.vue's own MARGIN_PX clearance
      const top = nameRect.top - playerRect.top;
      const left =
        side > 0
          ? nameRect.right - playerRect.left + GAP
          : nameRect.left - playerRect.left - GAP - size;
      // `gap` rides along on the anchor so `addBridgeStyle` (FT-923) can
      // rebuild the plate-to-disc span without a second, driftable copy of
      // this constant.
      this.addAnchor = { side, size, top, left, gap: GAP };
    },

    /**
     * FT-1167 (user): "the reminder tokens need to be toward the clock face
     * with minimal overlay with the player coin, basically only their gears
     * should be touching."
     *
     * WHERE THEY WERE. FT-869 pinned a reminder at `margin-top: 68%` of the
     * seat's own width — a percentage of the seat, resolved in the <li>'s own
     * pre-rotation frame. Measured on a live 8-seat ring at 1920x1080
     * (claude_temp_test/2026-08-25-ft1167-reminders.mjs): the token's rim was
     * 43px to 82px INSIDE the coin's rim, i.e. the token sat squarely on the
     * character art, which is the report.
     *
     * WHY NO PERCENTAGE CAN FIX IT. The seat's `.player` is TALLER than it is
     * wide (the coin, plus the name plate under it) and it counter-rotates
     * about its OWN centre — the on-circle mixin's `> * { rotate($rot * -1deg)
     * }`. The coin is not at that centre, so as the seat travels round the
     * clock the coin ORBITS the player's centre while a reminder, being nearly
     * square, spins in place. The gap between them therefore swings by roughly
     * the name plate's own height at every seat count: measured across one
     * 8-seat ring the coin-to-token distance ran 26.7px to 65.8px — a 39px
     * spread on a 146px coin, and the plate is about 39px tall. TownSquare.vue
     * met the same wobble from the other side and wrote it down there: "seats
     * are not even equidistant from that hub — 96px to 126px away across one
     * 15-seat town". A single constant can put the WORST seat on the rim, but
     * only by leaving the best one floating 40px clear.
     *
     * SO IT IS MEASURED, the same answer FT-911 gave for the plus disc one
     * method up. Everything below is in the <li>'s own untransformed frame,
     * which is the frame `top`/`left` are resolved in:
     *
     *   · a rendered reminder's centre is read straight off `offsetLeft`/
     *     `offsetTop` — those ignore transforms, so they ARE local
     *   · the coin's centre is that point plus the screen-space vector to the
     *     coin, rotated back by the seat's own angle. `matrix(a, b, c, d, …)`
     *     is a=cos, b=sin, so R(-angle)·(x, y) = (a·x + b·y, -b·x + a·y). The
     *     <li>'s origin never enters it: it cancels in the difference.
     *   · INWARD is local +y by construction — the <li> is the spoke, its
     *     bottom pinned to the hub (`transform-origin: 0 100%`), so "down the
     *     li" is "toward the clock face" at every clock position. That part of
     *     FT-869's reasoning was right and is unchanged.
     *
     * The radius is then the only number that matters: coin radius + token
     * radius + a hair, which is two rims kissing — "only their gears touching",
     * literally. The fan stays a straight line across the seat, exactly as
     * FT-869 drew it; only its distance from the coin changes.
     */
    measureReminderAnchor() {
      const li = this.$el;
      const rem = li.querySelector(".reminder:not(.add)");
      const token = li.querySelector(".player .token");
      if (!rem || !token) {
        this.reminderAnchor = null;
        return;
      }
      const w = rem.offsetWidth;
      const h = rem.offsetHeight;
      const tb = token.getBoundingClientRect();
      const rb = rem.getBoundingClientRect();
      if (!w || !h || !tb.width) {
        this.reminderAnchor = null;
        return;
      }
      let a = 1;
      let b = 0;
      const matrix = /matrix\(([^)]+)\)/.exec(getComputedStyle(li).transform);
      if (matrix) {
        const parts = matrix[1].split(",").map(Number);
        a = parts[0]; // cos
        b = parts[1]; // sin
      }
      const dx = tb.left + tb.width / 2 - (rb.left + rb.width / 2);
      const dy = tb.top + tb.height / 2 - (rb.top + rb.height / 2);
      const cx = rem.offsetLeft + w / 2 + (a * dx + b * dy);
      const cy = rem.offsetTop + h / 2 + (-b * dx + a * dy);
      const coinR = Math.min(tb.width, tb.height) / 2;
      // A HAIR, PROPORTIONAL — kept for the PLATE clearance test only
      // (reminderSwing's `tokenR + pad`); since FT-1219 it no longer opens
      // the coin-to-token gap.
      const pad = coinR * 0.04;
      /**
       * THE FAN'S STEP, in the two ratios the stylesheet has always drawn.
       * Desktop spaced tokens 60% of a seat apart while sizing them 50% of a
       * seat — 1.2 token-widths, a tenth of a token of daylight between
       * neighbours. A coarse pointer packed them tighter on purpose (20%
       * spacing at 34% size — 0.59, deliberately overlapping) because a
       * 12-seat phone ring has seats only 60px apart. Read off the MEASURED
       * token width, so each mode keeps the fan it was tuned with.
       */
      const coarse =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      /**
       * FT-1219 (user, with shot: "the reminder tokens should also touch
       * gears with the player coin, bring it a bit closer"). rim + rim + pad
       * LOOKED like a clear gap, because both rims are measured too fat:
       *
       *   · `coinR` comes off `.token`'s border box, and `.token` carries a
       *     3px TRANSPARENT border (the "you" glow / bluff collapse animate
       *     it) — the gear art's tips end 3px inside the measured rim.
       *   · `h` is the reminder's offsetHeight, which includes its own 3px
       *     BLACK border each side — a hoop that reads as background, not
       *     token, on the dark felt.
       *
       * So tips-to-tips daylight was really 6px + pad ≈ 8-9px on a desktop
       * ring. Subtract both borders (−6) and then a 2%-of-coin hair MORE, so
       * the tooth tips overlap by ~1px on a roomy ring (~0.6px on a crowded
       * one) — teeth ~6% of the art radius deep (measured off token-golem.png:
       * valleys at 236/256 of the rim), so a 1px negative gap is tips
       * MESHING, art never crossing art. `pad` still guards the name plate
       * (reminderSwing); it just no longer holds the fan off the coin.
       */
      const radius = coinR + h / 2 - 6 - coinR * 0.02;
      const step = w * (coarse ? 0.59 : 1.2);
      /**
       * THE FAN IS AN ARC, NOT A LINE (FT-1167). FT-869 spread the tokens
       * along the seat's own horizontal, which put the middle one on the coin's
       * rim and the outer ones progressively further off it — with the fan now
       * SITTING on that rim, a straight line would mean only the middle token
       * actually touched gears. Every token rides the same circle instead, so
       * "only their gears are touching" is true of all of them, and a fan pulls
       * its ends tangentially IN rather than out: `radius·sin(i·spread)` is
       * always less than `i·step`, which is the difference between clearing a
       * neighbouring seat's tokens and not on a crowded ring.
       *
       * `spread` is the same spacing the line used, expressed as the angle that
       * walks it round the circle. Capped at 55 degrees a step so a seat with
       * many tokens fans rather than wraps.
       */
      const ideal = Math.min(step / radius, (55 * Math.PI) / 180);
      /**
       * FT-1183: THE FAN MAY HAVE TO PACK TIGHTER TO GET OUT FROM UNDER THE
       * NAME PLATE — and there is exactly one floor on how tight.
       *
       * The plate joined the list of things the fan clears (reminderSwing
       * below), and at a 12 o'clock chair the plate sits in the ONE direction
       * the fan wants: straight inward is straight down the screen there, and
       * down the screen is where the plate hangs. Measured on an 8-seat ring
       * at 1280x800: coin radius 54, token radius 30, so the fan rides at
       * radius 86 — while escaping the plate SIDEWAYS needs the token's centre
       * 94.8px off the seat's axis (the plate is 120% of the seat wide, the
       * token 50%). 86 < 94.8: no rotation reaches past the plate's ends, and
       * the only way out is ABOVE its top edge, which is 70.2 degrees round.
       * Three tokens at the desktop step (48.1 degrees each) need the fan's
       * middle at 118.3 degrees to put all three there — past the 100 degree
       * sweep, and far enough round that the outermost token points away from
       * the clock face, which is the one thing the user asked for by name.
       *
       * So the step itself becomes a candidate, not a constant. NEVER TIGHTER
       * THAN THE TOUCH FAN ALREADY SHIPS (0.59 token-widths, deliberately
       * overlapping — see the step note above): a packing this app already
       * puts in front of people on a phone is a packing it can fall back to on
       * a crowded desktop chair. On a coarse pointer the fan is already at
       * that floor, so there is nothing to give and nothing is taken.
       */
      const floor = Math.min(ideal, (w * 0.59) / radius);
      const spreads = [ideal, ideal * 0.8, ideal * 0.6, floor].filter(
        (s, i, all) => s >= floor - 1e-9 && all.indexOf(s) === i,
      );
      const fan = this.reminderSwing({
        a,
        b,
        radius,
        spreads,
        pad,
        tokenR: h / 2,
        coinScreenX: tb.left + tb.width / 2,
        coinScreenY: tb.top + tb.height / 2,
      });
      this.reminderAnchor = {
        cx,
        cy,
        w,
        h,
        radius,
        spread: fan.spread,
        swing: fan.swing,
      };
    },

    /**
     * FT-1167: THE PLATE IN THE MIDDLE GETS A VOTE.
     *
     * Straight inward is the right answer until the ring is small enough that
     * inward means UNDER the checklist disc. Measured on the same rig: with
     * the night sheet up, a 5-seat ring at 1920x1080 put the token's near edge
     * 69px inside the disc's rim — most of the token swallowed — where the old
     * placement, sitting on the coin, cleared it by 1px. The disc is opaque and
     * stacks above the ring (z-index 19 against the seat's 3), so that is not a
     * near miss, it is the token gone.
     *
     * SO THE FAN SLIDES ROUND THE COIN'S OWN RIM. The token stays exactly as
     * tangent as it was — the radius never changes, which is the user's actual
     * rule ("only their gears should be touching") — and the whole fan rotates
     * rigidly about the coin's centre until it clears the plate. Rigid, so
     * whatever angle it lands on, the fan is as evenly spaced as the ideal one:
     * the same freedom-removing trick TownSquare.vue's bluff column uses, and
     * for the same reason.
     *
     * Beside the coin is the worst it can get: at 90 degrees the token sits at
     * the coin's own distance from the hub, and the coin is on the ring, so it
     * clears whatever the coin clears. If nothing in the sweep clears (a
     * viewport where the plate has eaten the ring outright), straight inward is
     * kept — a token overlapping a plate still reads as that seat's; one flung
     * to a corner does not, which is the call the FT-891 pass already made for
     * the bluffs.
     *
     * ── FT-1183: AND THE SEAT'S OWN NAME PLATE GETS A VOTE TOO ────────────
     *
     * FT-1167 moved the fan INWARD so the tokens touch the coin's gears
     * instead of its art, which is what the user asked for — and inward is
     * where the seat's own name plate hangs. Two things were measured against
     * (the coin's rim, the disc in the middle) and the plate was not one of
     * them. On an 8-seat ring at 1280x800, day, one token a seat: the token
     * landed dead centre on the plates of five chairs in eight, its centre
     * INSIDE the plate's box, i.e. the plate covered by a token from edge to
     * edge on those chairs. `elementFromPoint` at the plate's own middle came
     * back as `.reminder`, so the plate answered no pointer at all.
     *
     * IT WAS COSMETIC UNTIL FT-1180. The plate is one of the three control
     * schemes now ("Nameplate click"), so a storyteller who picks that scheme
     * and then puts a reminder on a chair — which is most chairs in a real
     * game — cannot work that chair with the mouse.
     *
     * The plate is measured, never assumed: `seatPlateRect` reads `.name`'s
     * real box, and `:scope >` there matters for the reason measureAddAnchor
     * writes out (Token's own `svg.name` is a nearer match to a plain
     * selector). The box is treated as its RECTANGLE though it draws as a
     * pill — the four corners it does not paint are a couple of pixels of
     * pessimism, and pessimism about a click target is free.
     *
     * WHY THE STEP IS A CANDIDATE NOW, not a constant: at a chair near 12
     * o'clock the plate sits square in the only direction the fan wants, and
     * no rotation at the ideal step gets three tokens clear of it. The full
     * arithmetic is on measureReminderAnchor, beside the floor it may not
     * pack past.
     */
    reminderSwing(g) {
      const disc = this.centrePlateRect();
      const plate = this.seatPlateRect();
      const n = Math.max(1, (this.player.reminders || []).length);
      const clears = (phi, spread) => {
        for (let i = 0; i < n; i++) {
          const t = phi + (i - (n - 1) / 2) * spread;
          const fx = g.radius * Math.sin(t);
          const fy = g.radius * Math.cos(t);
          // … and carried into screen space by the seat's own rotation, which
          // is where both boxes were measured
          const sx = g.coinScreenX + (g.a * fx - g.b * fy);
          const sy = g.coinScreenY + (g.b * fx + g.a * fy);
          if (disc) {
            const dx = sx - disc.cx;
            const dy = sy - disc.cy;
            const d = Math.hypot(dx, dy) || 1;
            // the ellipse's own radius along this bearing
            const rim = 1 / Math.hypot(dx / d / disc.rx, dy / d / disc.ry);
            if (d - g.tokenR < rim) return false;
          }
          if (plate) {
            // circle against rectangle: the nearest point ON the plate to this
            // token's centre, and whether the token's own rim reaches it
            const qx = Math.max(plate.left, Math.min(sx, plate.right));
            const qy = Math.max(plate.top, Math.min(sy, plate.bottom));
            if (Math.hypot(sx - qx, sy - qy) < g.tokenR + g.pad) return false;
          }
        }
        return true;
      };
      // 5 degrees at a time, one side preferred over the other so that every
      // seat on the ring swings the SAME way round its own coin — a ring where
      // half the tokens sat clockwise and half anticlockwise would read as a
      // fault rather than a rule. (The plate is a SCREEN-space object and the
      // fan a seat-local one, so the chair's own clock position decides which
      // way is away from it; the preference still holds wherever both sides
      // are open, which is every chair the disc alone used to move.)
      //
      // THE WIDEST STEP THAT CAN BE MADE TO WORK WINS, and only then the
      // smallest angle: the spacing is what FT-1167 tuned by eye, so it is
      // spent last and a chair with room keeps exactly the fan it has today.
      const STEP = Math.PI / 36;
      for (const spread of g.spreads) {
        if (clears(0, spread)) return { swing: 0, spread };
        for (let k = 1; k <= 20; k++) {
          if (clears(k * STEP, spread)) return { swing: k * STEP, spread };
          if (clears(-k * STEP, spread)) return { swing: -k * STEP, spread };
        }
      }
      return { swing: 0, spread: g.spreads[0] };
    },

    /**
     * FT-1183: this seat's own name plate, in screen pixels — the third thing
     * the reminder fan has to clear.
     *
     * `:scope >` is not decoration, and measureAddAnchor already paid for the
     * lesson: a plain `.name` descendant also matches Token.vue's `<svg
     * class="name">` (the role's name arc), which sits earlier in the DOM and
     * so wins a plain querySelector — a coin-sized box where a plate-sized one
     * was wanted. The plate is `.player`'s own direct child; the arc is not.
     *
     * MEASURED, NOT NOMINAL, because the plate has states: an unclaimed chair
     * says "Open", a claimed one carries a name that can run long, and a
     * coarse pointer pads it taller. (Its WIDTH turns out not to move — the
     * stylesheet pins it at 120% of the seat and a long name ellipses inside
     * that — but reading the box costs nothing and does not depend on that
     * staying true.)
     */
    seatPlateRect() {
      const playerEl = this.$el.querySelector(".player");
      const el = playerEl && playerEl.querySelector(":scope > .name");
      if (!el) return null;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return null;
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    },

    /**
     * FT-1167 rider: WHICH WAY IS AWAY FROM THE CLOCK FACE, for this chair.
     *
     * Read off the seat's own rotation matrix, never re-derived from a bounding
     * box — the reasoning is written out in full in TownSquare.vue's bluff
     * anchor and holds here too: `.circle`'s box is wider than it is tall, is
     * not centred on the true rotation hub, and the on-circle mixin's per-seat
     * nudge means seats are not even equidistant from it. The <li>'s matrix is
     * the ground truth. `matrix(a, b, c, d, …)` maps the seat's local "straight
     * up" — outward, since the un-rotated <li>'s top edge is the point farthest
     * from the hub — to screen (-c, -d), so `-c` is how far outward points to
     * the right of the screen.
     *
     * THE 12 AND 6 O'CLOCK CHAIRS GET LEFT. Outward there is straight up or
     * straight down: there is no side, so the threshold resolves both to left
     * and they stay there. Consistent beats correct-by-a-pixel — it is the
     * argument RoleHoverCard's own `prefer` note already makes for the name
     * plate, and it is the rule `measureAddAnchor` picked for the plus disc on
     * the same two chairs, so the card and the disc agree.
     *
     * A PREFERENCE, NOT A PROMISE. The card tries this side first and falls
     * back to the other, then to above/below, when the window edge leaves no
     * room — RoleHoverCard.place owns that and is untouched.
     */
    seatOutwardSide() {
      let ox = 0;
      const matrix = /matrix\(([^)]+)\)/.exec(
        getComputedStyle(this.$el).transform,
      );
      if (matrix) {
        const parts = matrix[1].split(",").map(Number);
        ox = -parts[2]; // -c
      }
      return ox > 0.05 ? "right" : "left";
    },
    /** FT-1167: the round plate at the ring's centre, in screen pixels — the
     *  night checklist when it is up, the town readout otherwise. Both are
     *  centred on the dial and both are drawn as a disc on desktop
     *  (`face-disc-frame`), so one ellipse describes either.
     *
     *  FT-1169: THE BODY MOVED TO golem/clockFace, unchanged line for line.
     *  The seat menu has to clear the same plate for the same reason the
     *  reminder fan does, and two copies of "where is the disc" is the drift
     *  this file keeps writing notes about. The method keeps its name and its
     *  callers, and is now one line long. */
    centrePlateRect() {
      return readCentrePlateRect();
    },

    /**
     * FT-1167: the placement `measureReminderAnchor` solved, per token.
     * `--ri`/`--rn` ride along unchanged so the FT-869 stylesheet rule still
     * draws the first frame (and any browser where the measurement bails).
     */
    reminderStyle(ri) {
      const style = { "--ri": ri, "--rn": this.player.reminders.length };
      const anchor = this.reminderAnchor;
      if (!anchor) return style;
      const n = this.player.reminders.length;
      // this token's own place on the arc: the fan's spread, plus whatever
      // swing the plate in the middle forced on the whole fan (reminderSwing).
      // Angle 0 is straight inward — down the seat's own spoke.
      const t = anchor.swing + (ri - (n - 1) / 2) * anchor.spread;
      const x = anchor.cx + anchor.radius * Math.sin(t);
      const y = anchor.cy + anchor.radius * Math.cos(t);
      style.left = `${x - anchor.w / 2}px`;
      style.top = `${y - anchor.h / 2}px`;
      // the stylesheet does its own offsetting in margins; the measured
      // placement is absolute, so they would otherwise be applied twice
      style.margin = "0";
      return style;
    },
    changePronouns() {
      if (this.session.isSpectator && this.player.id !== this.session.playerId)
        return;
      this.openEdit("pronouns", this.player.pronouns);
    },
    /**
     * Open the seat menu's own field on one of the seat's text properties.
     * The menu is the seat's panel already, so the edit happens where the
     * control that asked for it lives — no dialog, and nothing to be
     * auto-dismissed.
     */
    openEdit(field, value) {
      this.edit = { field, value: value || "" };
      this.isMenuOpen = true;
      this.$nextTick(() => {
        const el = this.$refs.editInput;
        if (el) {
          el.focus();
          el.select();
        }
      });
    },
    /** Cancel changes nothing — the seat keeps what it had. */
    cancelEdit() {
      this.edit = null;
    },
    commitEdit() {
      if (!this.edit) return;
      const { field } = this.edit;
      const value = this.edit.value.trim();
      this.edit = null;
      // A blank NAME keeps the old one (an unnamed chair is unreadable);
      // blank PRONOUNS are a real answer and clear the field — the same two
      // behaviours the dialogs had.
      if (field === "name" && !value) {
        this.isMenuOpen = false;
        return;
      }
      this.updatePlayer(field, value, true);
    },
    // ── FT-854: the role drawer's seat-side wiring ───────────────────────
    /**
     * Tapping a seat with a character in hand LANDS it (else the usual
     * alive/dead toggle).
     *
     * Where the character came from decides what landing means, exactly as it
     * does for a drag: off a list it is placed here; off another CHAIR the two
     * chairs trade, so a tap-swap and a drag-swap leave the town in the same
     * state. Tapping the chair it came from is the cancel.
     *
     * FT-1169 — THE DEATH TOGGLE STANDS DOWN IN THE OTHER TWO SCHEMES, and
     * the character landing does NOT.
     *
     * The user described the coin's two click halves under "Click coins" and
     * nowhere else, and both of those acts — kill, and role select — are rows
     * in the menu the other two schemes open. Three schemes that are
     * alternatives; not one scheme plus two that also have a menu. Somebody
     * who picks "Nameplate click" is very often picking it BECAUSE a stray
     * click on a coin keeps killing people, so leaving that click live would
     * hand them the setting and not the thing they wanted from it.
     *
     * The landing branch above is untouched in every scheme, deliberately: it
     * is not one of the coin's two halves, it is how a character IN HAND
     * reaches a chair. Standing it down would break picking a character up in
     * one scheme and putting it down in another, which is the same gesture.
     */
    onLifeClick() {
      const { drawerPick: pick, drawerPickFrom: from } = this.$store.state;
      if (pick && !this.session.isSpectator) {
        if (from === this.index) {
          this.$store.commit("setDrawerPick", null);
          return;
        }
        if (typeof from === "number") this.swapRolesWith(from);
        else this.placeRole(pick);
        this.$store.commit("setDrawerPick", null);
        return;
      }
      // FT-1227: the death toggle is the "Click coin" half of the split.
      // FT-1260.2: the half is an ASSIGNMENT now — whatever action the
      // storyteller picked for this click, run through the vocabulary's own
      // guarded runner (a spectator keeps the direct toggle: their store
      // call is its own refusal, and seatMenuEntries is empty for them).
      if (this.session.isSpectator) {
        this.toggleStatus();
        return;
      }
      this.runSeatClickAction(this.ctrlClickDeadAction);
    },
    /**
     * FT-1169: the coin's BOTTOM half — role select — by the same rule as the
     * top half above. `Token` still emits `set-role` in every scheme; the
     * seat decides whether that click is this scheme's job or the menu's.
     * FT-1227: gated by its OWN half of the split now ("Click role name").
     */
    onCoinSetRole() {
      // FT-1260.2: an assignment now, same shape as onLifeClick's — the
      // spectator keeps the direct role modal (claiming a seat's character
      // is their own affordance and the guarded runner has no entries for
      // them).
      // FT-1271: the spectator branch goes through the seat's NAMED writer now
      // rather than emitting past it. The emit and the method are the same one
      // line, but only the method carries the own-coin refusal — and this
      // branch is precisely the path a player takes to their own coin, so it
      // is the path that had to stop asking a second way.
      if (this.session.isSpectator) {
        this.openRoleModal();
        return;
      }
      this.runSeatClickAction(this.ctrlClickNameAction);
    },
    /**
     * FT-1260.2: A COIN CLICK RUNS ITS ASSIGNED ACTION — through the exact
     * runner the two menus use (`runSeatAction`), so the assignment obeys
     * the vocabulary's own guard: an act that is illegal right now refuses
     * (silently here — the click has no row to carry the reason; the menus'
     * rows still teach it) instead of firing. The assignment names a SLOT,
     * and the shared slot resolves per seat state: "nominate" runs
     * nominate on a living seat and ghost-vote on a dead one, exactly as
     * the menus' fifth position does.
     */
    runSeatClickAction(slotId) {
      if (!slotId || slotId === "off") return;
      const entry = this.seatMenuEntries.find(
        (e) => (SEAT_SLOT_BY_ID[e.id] || e.id) === slotId,
      );
      if (!entry) return;
      this.runSeatAction(entry.id);
    },
    /**
     * FT-1107: TAP A COIN, CHOOSE A PLAYER — the night's own click.
     *
     * ONE CLICK PER SLOT, and the same coin again gives it back. Which slot a
     * tap lands in is read off the HOST's record, so the holes matter: the
     * first empty slot takes it, which keeps a storyteller-entered pick in
     * place (their entry stands — night/applyPlayerAction's ownership rule)
     * and fills the player's own around it. With every slot full a tap
     * REPLACES the last one rather than doing nothing — a Fortune Teller who
     * picked wrong on their second choice should be able to fix it by
     * pointing somewhere else, not by first un-picking.
     *
     * NOTHING IS OPTIMISTIC. This commits and stops; the coin lights when the
     * host's echo comes back saying it did. That is what makes a refusal
     * (a slot the storyteller owns) read correctly instead of lighting a coin
     * that was never recorded.
     *
     * `targets` is slot-aligned with `null` for "leave alone" — the wire
     * shape FT-1005 defined, unchanged, so the host merge is untouched.
     */
    nightPick() {
      const call = this.nightCall;
      if (!call || !call.slots) return;
      // FT-1291: a sent row does not take picks. The host refuses it too
      // (night/applyPlayerAction) and that is the authority — this is here so
      // the tap dies where the player made it rather than travelling to be
      // turned down, and so the overlay's inertness is a fact about the
      // handler and not only about a CSS class somebody could later change.
      if (this.nightPickLocked) return;
      const cur = this.nightTargets;
      const targets = new Array(call.slots).fill(null);
      const at = cur.indexOf(this.index);
      if (at >= 0) {
        targets[at] = -1;
      } else {
        let slot = -1;
        for (let i = 0; i < call.slots; i++) {
          if (!Number.isInteger(cur[i]) || cur[i] < 0) {
            slot = i;
            break;
          }
        }
        targets[slot < 0 ? call.slots - 1 : slot] = this.index;
      }
      this.$store.commit("night/playerAction", {
        roleId: call.role.id,
        targets,
      });
    },
    /** FT-1006: open the belief picker for this seat — the same modal the
     *  coin's chip opens, reachable before any chip exists. */
    setBelief() {
      this.isMenuOpen = false;
      this.$emit("trigger", ["openBeliefModal"]);
    },
    /** The ring's add-reminder disc, as a menu row (see the template note). */
    addReminder() {
      this.isMenuOpen = false;
      this.$emit("trigger", ["openReminderModal"]);
    },
    /** Pick this chair's character up, on the same channel the tray and the
     *  grimoire drawer arm from — so every surface that already watches
     *  `drawerPick` (the hint lines, the armed card) reacts unchanged. */
    armCharacter() {
      this.isMenuOpen = false;
      if (this.session.isSpectator || !this.player.role.id) return;
      if (this.roleArmed) {
        this.$store.commit("setDrawerPick", null);
        return;
      }
      this.$store.commit("setDrawerPick", this.player.role);
      this.$store.commit("setDrawerPickFrom", this.index);
    },
    /** Take the character off this chair — the tap twin of dragging a seated
     *  role out of the square, and it lands in the same place: the tray. */
    clearCharacter() {
      this.isMenuOpen = false;
      if (this.session.isSpectator || !this.player.role.id) return;
      if (this.roleArmed) this.$store.commit("setDrawerPick", null);
      this.$store.commit("players/update", {
        player: this.player,
        property: "role",
        value: {}
      });
    },
    /**
     * FT-1090 (user: "same when I drag a role off a player coin"): the seat's
     * drag now carries the character's face under the pointer, like the tray's
     * and the drawer's always meant to.
     *
     * THE PAYLOAD IS UNCHANGED AND THAT IS DELIBERATE. `golem/from` with the
     * seat index, `effectAllowed = "move"` — the exact two lines that stood
     * here — because roleUnseat.js's document listener arms on that TYPE being
     * present in `dataTransfer.types` and Player.onRoleDrop reads that value to
     * decide a swap. The ghost is added beside them, never in place of them;
     * `startSeatRoleDrag` writes them itself so the seat and the tray share one
     * definition of the ghost rather than two copies of it.
     */
    onRoleDragStart(e) {
      // FT-1213: belt for the "Drag roles" toggle — the draggable bindings
      // already carry canDragCoin, so a refused drag never normally starts;
      // this catches any path that reaches here with the toggle off.
      if (!this.canDragCoin) {
        if (e && e.preventDefault) e.preventDefault();
        return;
      }
      startSeatRoleDrag(this.player.role, this.index, e);
    },
    /**
     * FT-966: the name plate's own drag-start. A DISTINCT dataTransfer type
     * (`golem/player-from`, never `golem/from`) is the whole safety property
     * here — `golem/from` is what `golem/roleUnseat.js`'s document-level
     * listener watches for to clear a chair's CHARACTER on a drop outside
     * every seat. A player move dropped on empty ground must do nothing,
     * not blank the origin chair's role, and the way that is guaranteed is
     * that roleUnseat's `isSeatDrag` never sees this type in `types` at all
     * — not a flag it has to check and skip.
     */
    onPlayerDragStart(e) {
      // FT-1213: canDragPlayer is the one gate (it now carries the "Drag
      // names" toggle too); a refused gesture must not begin a payload-less
      // native drag.
      if (!this.canDragPlayer) {
        if (e && e.preventDefault) e.preventDefault();
        return;
      }
      // FT-1213 pair rule: passing the drag threshold makes this gesture a
      // drag — onPlateClick refuses its trailing click (see the note there).
      this.plateDragged = true;
      e.dataTransfer.setData("golem/player-from", String(this.index));
      e.dataTransfer.effectAllowed = "move";
    },
    /** A drop on this seat: a drawer role assigns; another seat's role
     *  SWAPS chairs with ours. */
    /** Put a role in THIS chair. With duplicates off (the default) a role
     *  lives in one chair only, so placing it anywhere else MOVES it — the
     *  rule holds for every path (drag, click, assign, shuffle) instead of
     *  each one policing itself. */
    placeRole(role) {
      if (!role || !role.id) return;
      // FT-1270: A PLAYER MAY NOT RELABEL THEIR OWN COIN. This is THE writer
      // every path into "put a character on this chair" runs through, which is
      // why the rule sits here and not at each caller — a drag, a tap that
      // lands an armed character, and anything added later all obey it from
      // one line. The rule itself and the reasoning behind it are
      // `isOwnClaimedSeat`'s (golem/roleDrag), shared with the unseat half of
      // the same gesture.
      if (isOwnClaimedSeat(this.session, this.player)) return;
      if (!this.$store.state.allowDupRoles) {
        this.players.forEach(p => {
          // …AND NOT SIDEWAYS EITHER. With duplicates off this sweep clears
          // the role off whatever chair already had it, and for a player that
          // chair can be their OWN — so dropping their real character onto a
          // neighbour would have wiped their own coin by the back door. Same
          // rule, same one line, applied to the seat being cleared.
          if (isOwnClaimedSeat(this.session, p)) return;
          if (p !== this.player && p.role && p.role.id === role.id) {
            this.$store.commit("players/update", {
              player: p,
              property: "role",
              value: {}
            });
          }
        });
      }
      this.$store.commit("players/update", {
        player: this.player,
        property: "role",
        value: role
      });
    },
    /**
     * A drop on this seat: a role from a LIST assigns, another seat's role
     * SWAPS chairs with ours.
     *
     * ── FT-1270: THE LIST DROP IS THE PLAYER'S TOO NOW ──────────────────
     * "Let non-hosts drag roles from the script to seats as well. Doing this
     * for a non-host just is like what they do when they click a coin to bring
     * up that menu to take their guesses." (user.)
     *
     * That last sentence is the specification, and it is already true of the
     * code: a plain player clicking a coin gets the character grid straight
     * (Player.onCoinSetRole → RoleModal), picks a character, and that pick
     * commits the very same `players/update` role write this branch does. It
     * never reaches another client, because `sendPlayer` — the one dispatcher
     * for that mutation — opens with `if (this._isSpectator …) return;`
     * (store/socket.js). So a player's grimoire is already a private notebook,
     * and this only adds a second way to write in it.
     *
     * NOTHING NEW GOES ON THE WIRE. No guard was added for the sync, for the
     * same reason FT-1025's drop-outside-to-unseat added none: the existing
     * spectator gate on the dispatcher already does the job, and a second
     * guard would be a second thing to keep true.
     *
     * THE SWAP BRANCH BELOW STAYS THE STORYTELLER'S. Trading two chairs'
     * characters is a grimoire edit that reads and writes seats the dragger
     * does not own; the list drop writes ONE seat, the one they dropped on.
     * A player's own seat refuses either way — placeRole enforces that.
     */
    onRoleDrop(e) {
      const roleId = e.dataTransfer.getData("golem/role");
      const from = e.dataTransfer.getData("golem/from");
      if (roleId) {
        // state.roles is a Map keyed by role id — .find() is an array method
        // and threw here, so every drawer drop silently did nothing
        const role = this.$store.state.roles.get(roleId);
        if (role) this.placeRole(role);
        return;
      }
      // FT-1270: the swap keeps the gate the whole handler used to carry.
      if (this.session.isSpectator) return;
      if (from !== "" && Number(from) !== this.index) {
        this.swapRolesWith(Number(from));
      }
    },
    /**
     * FT-966: a name plate landed on THIS chair. `golem/player-from` is
     * read only — never `golem/from`, which is the character drag's own
     * type (see onPlayerDragStart) — so a role drop and a player drop can
     * never be mistaken for each other even though they share this same
     * `.player` div as a target.
     *
     * This only carries the origin index up to TownSquare: it does not
     * decide move vs swap itself. `dragPlayer` (TownSquare.vue) does, off
     * the same `players/swap` and `players/move` primitives — and the same
     * nomination bookkeeping — the menu's "Move player"/"Swap seats" rows
     * already land on, one call instead of the menu's arm-then-click pair.
     */
    onPlayerDrop(e) {
      if (this.session.isSpectator) return;
      const from = e.dataTransfer.getData("golem/player-from");
      if (from === "") return;
      const fromIndex = Number(from);
      if (fromIndex === this.index) return;
      this.$emit("trigger", ["dragPlayer", fromIndex]);
    },
    /**
     * Trade characters with another chair — ONE definition, used by the drag
     * that drops here and by the tap that lands a seat-armed character. An
     * empty source chair simply means this one is emptied, which is what
     * makes "move into an open seat" and "swap two seats" the same gesture.
     */
    swapRolesWith(fromIndex) {
      if (fromIndex === this.index) return;
      const other = this.players[fromIndex];
      if (!other) return;
      const mine = this.player.role;
      this.$store.commit("players/update", {
        player: this.player,
        property: "role",
        value: other.role
      });
      this.$store.commit("players/update", {
        player: other,
        property: "role",
        value: mine && mine.id ? mine : {}
      });
    },
    /**
     * FT-1227 (user): DEATH IS BINARY. Upstream's public-view click cycle —
     * alive → dead → dead-with-spent-ghost-vote → alive — carried the ghost
     * vote as a THIRD STOP on this toggle, and that stop is retired: a
     * click kills or revives, nothing else, in every view. The ghost vote
     * itself is untouched — the cowl's own click and toggleGhostVote (the
     * seat menu's row) still spend and return it. The old public branch
     * stands down in the comment below rather than being deleted, per the
     * house rule:
     *
     *   if (this.grimoire.isPublic) {
     *     if (!this.player.isDead) {
     *       this.updatePlayer("isDead", true);
     *       if (this.player.isMarked) this.updatePlayer("isMarked", false);
     *     } else if (this.player.isVoteless) {
     *       this.updatePlayer("isVoteless", false);
     *       this.updatePlayer("isDead", false);
     *     } else {
     *       this.updatePlayer("isVoteless", true); // ← the third stop
     *     }
     *   }
     *
     * FT-1294 rider: that branch's condition names `grimoire.isPublic`, the
     * face-down grimoire, which is now retired throughout (store/index.js).
     * The snippet is left exactly as FT-1227 stood it down — it is a record
     * of upstream's behaviour, not code waiting to be switched back on — but
     * anyone reviving it needs a new question to hang it from. There is no
     * public view any more.
     */
    toggleStatus() {
      this.updatePlayer("isDead", !this.player.isDead);
      if (this.player.isMarked) {
        this.updatePlayer("isMarked", false);
      }
      if (this.player.isVoteless) {
        this.updatePlayer("isVoteless", false);
      }
    },
    changeName() {
      if (this.session.isSpectator) return;
      this.openEdit("name", this.player.name);
    },
    // ── FT-1319: rename from your own plate ─────────────────────────────
    /** Open the in-place ask over the plate, prefilled with the seat's
     *  current name — the seat-edit input's own focus-and-select gesture. */
    openRename() {
      if (this.renaming) {
        const el = this.$refs.renameInput;
        if (el) el.focus();
        return;
      }
      this.renaming = true;
      this.renameValue = this.player.name || "";
      this.$nextTick(() => {
        const el = this.$refs.renameInput;
        if (el) {
          el.focus();
          el.select();
        }
      });
    },
    cancelRename() {
      this.renaming = false;
    },
    /** Commit = the claim flow's own two writes: the remembered-name stash
     *  (`golem.playerName`, submitClaimName's key — so the next claim on
     *  this browser offers the new name) and the players/update name commit
     *  that socket.js's sendPlayerName carries to the table. A blank keeps
     *  the old name, the same rule commitEdit states: an unnamed chair is
     *  unreadable. Committed directly rather than through updatePlayer —
     *  that method refuses "name" for a spectator wholesale, while the wire
     *  guard for THIS write (own seat only) lives in sendPlayerName, the
     *  same split the pendingName watcher above already relies on. */
    commitRename() {
      if (!this.renaming) return;
      const value = this.renameValue.trim();
      this.renaming = false;
      if (!value || !this.isOwnSeat) return;
      try {
        localStorage.setItem("golem.playerName", value);
      } catch (e) {
        // storage off: the rename still lands on the seat
      }
      this.$store.commit("players/update", {
        player: this.player,
        property: "name",
        value,
      });
    },
    removeReminder(reminder) {
      // FT-1117: the click at the end of a drag is the drag's tail, not a
      // request to bin the token that was just carried here. The flag is left
      // standing rather than cleared — the next mousedown on a reminder opens
      // the next gesture and clears it, so a plain click is never swallowed.
      if (this.reminderDragged) return;
      const reminders = [...this.player.reminders];
      reminders.splice(this.player.reminders.indexOf(reminder), 1);
      this.updatePlayer("reminders", reminders, true);
    },
    /**
     * FT-1117: the face a reminder token wears — the role's own art under the
     * grimoire's image opt-in, otherwise the bundled icon for `imageAlt` (a
     * custom note's "custom", the good/evil markers' own) falling back to the
     * role id. Lifted out of the template because the DRAG needs the identical
     * URL: the ghost under the pointer has to be the token that was picked up,
     * and two copies of this expression would eventually disagree.
     */
    reminderIcon(reminder) {
      const src =
        reminder.image && this.grimoire.isImageOptIn
          ? reminder.image
          : require("../assets/icons/" +
              (reminder.imageAlt || reminder.role) +
              ".png");
      // ASKING FOR THE ART IS ALSO WHAT WARMS ITS DRAG GHOST — roleIcon()'s own
      // arrangement, for roleIcon()'s own reason: `setDragImage` snapshots on
      // the spot, and an <img> whose src was assigned microseconds earlier has
      // no bitmap to snapshot, so the browser silently keeps its default ghost
      // (roleDrag.js's stage note is the full autopsy). A token is painted a
      // render before it can be grabbed, so by the time a pointer goes down on
      // it the ghost is decoded and standing by.
      warmIconSrc(src);
      return src;
    },
    /**
     * FT-1117: pick a reminder token up off this chair.
     *
     * `golem/reminder-from` + `golem/reminder-at` — a DISTINCT pair, never
     * `golem/from`, for the reason FT-966 wrote down when the name plate got
     * its own type: `golem/from` is what golem/roleUnseat.js's document
     * listener watches to CLEAR a chair's character on a drop outside the ring.
     * A reminder dropped on empty ground must do nothing at all, and the way
     * that is guaranteed is that roleUnseat never sees our type in `types` —
     * not a flag it has to check and skip.
     *
     * The index rides along because a seat can hold two tokens with the same
     * name; the drop lifts the one that was actually grabbed, not the first
     * match by name.
     */
    onReminderDragStart(ri, e) {
      if (this.session.isSpectator) return;
      this.reminderDragged = true;
      e.dataTransfer.setData("golem/reminder-from", String(this.index));
      e.dataTransfer.setData("golem/reminder-at", String(ri));
      e.dataTransfer.effectAllowed = "move";
      setDragImageSrc(this.reminderIcon(this.player.reminders[ri]), e);
    },
    /**
     * FT-1117: a reminder token landed on THIS chair. Reads only its own
     * dataTransfer types, so it shares the seat's `@drop` with the character
     * drag and the name-plate drag without any of the three being able to
     * mistake another's payload for its own.
     */
    onReminderDrop(e) {
      if (this.session.isSpectator) return;
      const from = e.dataTransfer.getData("golem/reminder-from");
      if (from === "") return;
      const fromIndex = Number(from);
      if (fromIndex === this.index) return;
      const at = Number(e.dataTransfer.getData("golem/reminder-at"));
      const source = this.players[fromIndex];
      if (!source || !source.reminders) return;
      const token = source.reminders[at];
      if (!token) return;
      const left = [...source.reminders];
      left.splice(at, 1);
      this.$store.commit("players/update", {
        player: source,
        property: "reminders",
        value: left,
      });
      this.$store.commit("players/update", {
        player: this.player,
        property: "reminders",
        value: [...this.player.reminders, token],
      });
    },
    updatePlayer(property, value, closeMenu = false) {
      if (
        this.session.isSpectator &&
        property !== "reminders" &&
        property !== "pronouns"
      )
        return;
      this.$store.commit("players/update", {
        player: this.player,
        property,
        value
      });
      if (closeMenu) {
        this.isMenuOpen = false;
      }
    },
    removePlayer() {
      this.isMenuOpen = false;
      this.$emit("trigger", ["removePlayer"]);
    },
    swapPlayer(player) {
      this.isMenuOpen = false;
      this.$emit("trigger", ["swapPlayer", player]);
    },
    movePlayer(player) {
      this.isMenuOpen = false;
      this.$emit("trigger", ["movePlayer", player]);
    },
    nominatePlayer(player) {
      this.isMenuOpen = false;
      this.$emit("trigger", ["nominatePlayer", player]);
    },
    cancel() {
      this.$emit("trigger", ["cancel"]);
    },
    claimSeat() {
      this.isMenuOpen = false;
      this.$emit("trigger", ["claimSeat"]);
    },
    /**
     * FT-1070: the chair icon's one click, split by who is clicking (see the
     * markup note). The host's branch is the menu's "Empty seat" row
     * verbatim; the player's branch rides claimSeat, whose TownSquare half
     * sees "own seat" and vacates — the menu's "Vacate seat" toggle. A
     * spectator on someone ELSE'S chair falls through both guards and the
     * click is furniture.
     */
    chairClick() {
      if (!this.chairAct) return;
      if (!this.session.isSpectator) {
        this.updatePlayer("id", "", true);
      } else if (this.isOwnSeat) {
        this.claimSeat();
      }
    },
    /**
     * Golem fork: claim in one tap — ask the player's name first (remembered
     * per browser), claim the seat, and name it once the claim lands (the
     * watcher below fires when the host confirms).
     */
    oneTapClaim() {
      if (this.askName) {
        // A stray click on the overlay while typing just refocuses the field.
        const input = this.$refs.nameInput;
        if (input) input.focus();
        return;
      }
      const remembered = (
        localStorage.getItem("golem.playerName") || ""
      ).trim();
      if (!remembered) {
        // No name on this browser yet — ask in place, then claim.
        // FT-1200: a signed-in account's name is the DEFAULT, not a cage —
        // it prefills the ask (typing over it still wins, and the override
        // is what gets remembered), so an account holder's first claim on a
        // fresh browser is one Enter rather than a retype.
        this.askName = true;
        this.claimName = (
          (this.$store.state.session.account || {}).name || ""
        ).trim();
        this.$nextTick(() => {
          const input = this.$refs.nameInput;
          if (input) input.focus();
        });
        return;
      }
      this.pendingName = remembered;
      this.$emit("trigger", ["claimSeat"]);
    },
    submitClaimName() {
      const name = this.claimName.trim();
      if (!name) return;
      localStorage.setItem("golem.playerName", name);
      this.pendingName = name;
      this.askName = false;
      this.$emit("trigger", ["claimSeat"]);
    },
    /**
     * Allow the ST to override a locked vote.
     */
    vote() {
      if (this.session.isSpectator) return;
      if (!this.voteLocked) return;
      this.$store.commit("session/voteSync", [
        this.index,
        !this.session.votes[this.index]
      ]);
    }
  }
};
</script>

<style lang="scss">
/* Golem fork (FT-848): the blood a death leaves on the tower behind the seat.
   First child of .player so it paints under the shroud, life token and role
   token; never intercepts clicks. */
.player .blood-splat {
  position: absolute;
  top: -18%;
  left: -18%;
  width: 136%;
  height: 136%;
  background: center / contain no-repeat;
  pointer-events: none;
  opacity: 0.85;
  animation: splat-in 300ms ease-out;
}
@keyframes splat-in {
  from {
    opacity: 0;
    filter: brightness(1.6) saturate(1.4);
  }
  to {
    opacity: 0.85;
    filter: none;
  }
}
/* the app's animation kill-switch */
#app.static .player .blood-splat {
  animation: none;
}

/* THE CHAIR WHOSE CHARACTER IS IN HAND.
   The tray rings its picked tile in red; a chair says the same thing the same
   way, so "this one is in hand, waiting for a chair" reads identically
   wherever the character was picked up. */
.player.role-armed {
  .life,
  .token,
  /* FT-1080: the chip used to sit inside `.token` and so shared this glow's
     silhouette for free; docked beside the coin it has to be named. */
  > .belief-dock {
    filter: drop-shadow(0 0 7px rgba(255, 80, 80, 0.95));
  }
  > .name {
    border-color: #a01414;
    color: #ff8a8a;
  }
}

/* ── FT-1194: THE DESTINATIONS ANSWER THE ARMED MOVE ─────────────────────
   User: "when move role is active can we have a call to action on the coins
   for moving it to them, a suggestion that the user needs to click."

   With a character in hand (`.move-invite`, the drawerPick channel) or a
   player picked up (`li.move` / `li.swap` — TownSquare's own two-step marks,
   the same gesture on the other object), every coin that can receive the
   click BREATHES: a slow purple glow that swells and settles. The pieces are
   all borrowed, none invented —

     · the drop-shadow-on-the-coin mechanism is `.role-armed`'s and
       `.night-chosen`'s: a glow that tracks the coin's own toothed
       silhouette, not a circle drawn near it
     · the ink is #a78fcd, the fork's own "this is the one you pick" purple
       (OptionSelect's chosen border, FT-1107's night ring) — red stays the
       SOURCE's colour, so the two sides of one move never wear the same word
     · the breath (2s, ease-in-out, alternate) is what makes it a suggestion
       rather than a state: the armed glow HOLDS, the invitation MOVES,
       calmly

   It clears itself on every exit: drawerPick is nulled on landing and on
   cancel (armCharacter's toggle, onLifeClick's landing branch), and
   TownSquare's cancel() drops move/swap — the class goes, the animation with
   it. The origin chair is excluded on both channels (moveInvite skips it;
   `:not(.from)` below), because it is already wearing the red "in hand" glow. */
@keyframes seat-move-invite {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

/* A RING, NOT A BLOOM — the first cut breathed a purple drop-shadow on the
   coin's own silhouette (role-armed's mechanism in night-pick's ink) and it
   measured invisible: a translucent lavender bloom around a BRIGHT GOLD rim
   over dark stone loses on both sides, and the armed/cleared zooms could not
   be told apart. The night pick already solved "this coin is clickable" on
   this exact art: a drawn purple RING over the coin's square (its box, not
   its teeth — .token deliberately has no border-radius, the wheel is
   unclipped, so the ring needs its own round box the way .night-pick has
   one). This is that ring on a pseudo-element, with a soft halo behind it,
   breathing by OPACITY between clearly-lit and full — a frame caught at the
   bottom of the cycle still reads. pointer-events stays off: the invitation
   never intercepts the very click it is asking for. */
.player.move-invite::after,
li.move:not(.from) .player::after,
li.swap:not(.from) .player::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  pointer-events: none;
  /* above the coin's boxes (2) and the seat marks (3), under the claim
     overlay (10) and the night pick (12) */
  z-index: 5;
  box-shadow:
    inset 0 0 0 3px rgba(167, 143, 205, 0.9),
    0 0 16px 3px rgba(167, 143, 205, 0.55);
  animation: seat-move-invite 1.6s ease-in-out infinite alternate;
}

/* still an invitation without the motion — the ring simply holds */
@media (prefers-reduced-motion: reduce) {
  .player.move-invite::after,
  li.move:not(.from) .player::after,
  li.swap:not(.from) .player::after {
    animation: none;
  }
}

/* ── FT-1107: THE NIGHT'S PICK, WORN ON THE COIN ─────────────────────────
   Two marks, and they are deliberately different in kind.

   OFFERED (`.night-target`) is a hover state and almost nothing else. Every
   coin on the ring is a target while the ask is up, so anything permanent
   here would light the whole clock at once and say nothing — the instruction
   on the face already says "tap a player". What a mouse needs is to know the
   coin under it is live, and that is the ring below.

   CHOSEN (`.night-chosen`) is permanent, and it is PURPLE.

   IT WAS GOLD (the #b28f2f/#e2be62 seam the night's own live row and the face
   panel's chips wear) until FT-1167 — user: "for the player select things like
   the fortune teller lets make the selection rings not gold, maybe make them
   purple instead? they need to stand out more."

   GOLD HAD RUN OUT OF ROOM on this surface. The seat's name plate accent, the
   scan collar, the night sheet's truth chips and its `.ns-player-said` line
   are all warm gold already, and the clock face itself is a gold-lit dial — a
   gold ring on a gold coin on a gold face is the one combination that cannot
   shout. Purple is the storyteller's own colour everywhere else in the fork
   (controls.scss's `$control-edge-hover`, the grimoire's plum, every dropdown
   since FT-1108) and it is unused on the seat, so it lands on empty ground:
   the seat's other marks are a red glow (a character in hand), a blue glow
   (you), a grey shroud (dead), a white noose (on the block) and the hand art
   (nominating). None of them is purple, and none of them is near it.

   #a78fcd IS NOT A NEW COLOUR. It is the border OptionSelect paints on the
   option that is CHOSEN (`.gsel-opt.on`, FT-1108) — the brightest purple the
   fork already owns, and already the one that means "this is the one picked".
   A picked coin says the same word in the same ink.

   Still not red: red is blood, the demon, the bluffs mask and `control-lit` in
   this app, and a Fortune Teller pointing at a friend is none of those. */
.player.night-target > .night-pick {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  /* SQUARE, NOT THE WHOLE SEAT. `.player` is taller than it is wide — the
     name plate hangs below the coin — so a 100%-height box with a 50% radius
     is an ELLIPSE laid over the coin AND the plate under it. Measured on the
     first pass and visibly wrong: the ring cut through "Open" on two seats.
     The coin is the square at the top of the seat (`.token` / `.life` are
     both `width: 100%` and square), so this is too. */
  aspect-ratio: 1 / 1;
  /* above every live box on the seat — the shroud (2), the coin (2), the
     chair and hand marks (3), the claim overlay (10). See the markup note:
     covering them is how a night pick is kept from firing a nomination or a
     vote, rather than by a guard in each of their handlers. */
  z-index: 12;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 0 rgba(167, 143, 205, 0);
  transition:
    box-shadow 150ms,
    background 150ms;

  &:hover {
    background: rgba(167, 143, 205, 0.14);
    box-shadow: inset 0 0 0 3px rgba(167, 143, 205, 0.85);
  }
}

/* THE CHOSEN COIN. The ring is drawn on the SEAT, not on the overlay above
   it, because the overlay is a square box with a radius and the coin is the
   round thing the eye is actually reading — a glow that tracks the coin's own
   silhouette is the difference between "this coin is picked" and "a circle
   has been drawn near this coin". */
.player.night-chosen {
  /* the two faces of the coin, and only those — the shroud is a rectangle
     covering the coin's top 45% and glowing it draws a box, not a coin */
  > .token,
  > .life {
    /* 6px -> 9px with the colour change. "They need to stand out more" is the
       actual ask, and a ring alone is a 3px line on a busy gear rim; the halo
       is what carries at a glance across a 20-seat ring, where a coin is 84px
       wide. The two together are what separate CHOSEN from merely HOVERED. */
    filter: drop-shadow(0 0 9px rgba(167, 143, 205, 0.95));
  }
  > .night-pick {
    /* 3px -> 4px: the hover ring is 3px, so a chosen coin that also drew 3px
       said the same thing twice. Thicker, opaque, and haloed is chosen;
       thinner and translucent is offered. */
    box-shadow: inset 0 0 0 4px #a78fcd;
    background: rgba(167, 143, 205, 0.14);
  }
}

/* ── FT-1291: THE RING AFTER THE ANSWER ────────────────────────────────────

   The storyteller has sent, so the ring stops being a control and becomes a
   record. Two things change and nothing else does:

     · THE OFFER GOES. The hover ring and its wash are the coin saying "you may
       pick me", and that is now false on every coin — so the hover rule is
       cancelled outright and the cursor stops being a pointer. A control that
       still lights under the mouse but refuses the click is worse than a dead
       one: it says the tap will work and then eats it.
     · THE CHOSEN COINS STAY EXACTLY AS THEY WERE. Full ring, full halo, full
       slot numeral. They are the picks the storyteller's answer was computed
       from, and they are the only place the player can still read what they
       chose — fading them at the moment the answer lands would take the
       question away along with the ability to change it.

   `pointer-events` is deliberately NOT dropped: the overlay has a second job
   (it covers the seat, which is what keeps a stray night tap off the vote
   buttons and the nomination hand — see the markup note), and letting clicks
   fall through would hand those back at the one moment a player is most
   likely to be tapping coins. It stays in the way and says nothing. */
.player.night-sent > .night-pick {
  cursor: default;

  &:hover {
    background: none;
    box-shadow: inset 0 0 0 0 rgba(167, 143, 205, 0);
  }
}

.player.night-sent.night-chosen > .night-pick,
.player.night-sent.night-chosen > .night-pick:hover {
  box-shadow: inset 0 0 0 4px #a78fcd;
  background: rgba(167, 143, 205, 0.14);
}

/* the slot number, and ONLY when the character has more than one choice to
   make (nightPickMark) — a lone "1" on a Monk's single pick is a numeral
   answering a question nobody asked */
.player .night-pick .np-mark {
  position: absolute;
  top: 4%;
  right: 4%;
  min-width: 1.35em;
  height: 1.35em;
  padding: 0 0.2em;
  border-radius: 1em;
  /* FT-1167: the slot number takes the ring's own colour, so "1" and "2" read
     as parts of the same mark rather than a gold badge stuck to a purple ring.
     The ink under it is the near-black plum the dropdowns sit on, not the old
     warm near-black — 11.9:1 against #a78fcd, so a numeral at 75% of a seat
     coin's font size is still solid at 20 seats. */
  background: #a78fcd;
  color: #160f22;
  font-family: PiratesBay, sans-serif;
  font-size: 75%;
  line-height: 1.35em;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

/* A touch screen never enters :hover, so the offer has to show itself —
   dimly, because the whole ring is offered at once. The same trade the claim
   overlay makes just below. */
@media (hover: none) {
  .player.night-target > .night-pick {
    box-shadow: inset 0 0 0 2px rgba(167, 143, 205, 0.4);
    &:active {
      background: rgba(167, 143, 205, 0.22);
    }
  }
  .player.night-chosen > .night-pick {
    box-shadow: inset 0 0 0 4px #a78fcd;
  }
  /* FT-1291: on a touch screen the OFFER is the faint standing ring, since
     there is no hover to reveal one — so on a sent row that ring is what has
     to go, and the press-flash with it. An unchosen coin goes bare; a chosen
     one keeps its mark, exactly as on a pointer. */
  .player.night-sent > .night-pick {
    box-shadow: inset 0 0 0 0 rgba(167, 143, 205, 0);
    &:active {
      background: none;
    }
  }
  .player.night-sent.night-chosen > .night-pick {
    box-shadow: inset 0 0 0 4px #a78fcd;
  }
}

/* Golem fork: the one-tap claim overlay on an empty seat. */
.player .claim-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  color: white;
  text-shadow: 0 0 4px black;
  opacity: 0;
  transition: opacity 200ms;
  svg {
    height: 28px;
    width: auto;
  }
  /* FT-1242: the claim invitation's chair is the baked one now — same box
     the FA chair took, brightened toward the overlay's bone ink. */
  img.pm-mark {
    height: 28px;
    width: auto;
    object-fit: contain;
    filter: brightness(1.35) drop-shadow(0 0 4px black);
  }
  /* FT-1337: the chair is a masked SPAN now, reading the chair lab's
     var(--chair). Same box, same bone ink the baked art carried (#cfc4ae),
     same brighten. The mask rides a ::before — filters apply BEFORE masks on
     one element, so the drop-shadow must sit on the parent to trace the
     already-masked chair (the seat badge's own FT-1244 reasoning). */
  span.pm-mark.chair-mark {
    /* FT-1323 round 3: the lab's per-surface size dial — "Claim hint",
       1.0 = this same 28px box. */
    width: calc(28px * var(--chair-size-claim, 1));
    height: calc(28px * var(--chair-size-claim, 1));
    filter: brightness(1.35) drop-shadow(0 0 4px black);
    &::before {
      content: "";
      display: block;
      width: 100%;
      height: 100%;
      /* FT-1323 round 3: the lab's tone dial, unset until touched so this
         keeps its own bone ink (#cfc4ae) on a fresh session. */
      background-color: var(--chair-ink, #cfc4ae);
      /* FT-1323/FT-1350: the chair lab's opacity dial (1 = today's look). */
      opacity: var(--chair-opacity, 1);
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
  span {
    font-family: PiratesBay, sans-serif;
    letter-spacing: 1px;
  }
  /* BONE, NOT RED (user call 2026-08-20: "we want that to be whiteish like
     the gallows token"). Red on a chair nobody is sitting in was saying
     something the app now means elsewhere — `control-lit` is blood, the demon
     is blood, and the bluffs mask is blood. An empty chair is not lit, not
     evil and not a warning; it is furniture waiting for someone.
     `#d8cdb4` is the ink `control-icon-btn` already wears, which is the same
     warm bone the top strip's own marks are baked to — so the invitation to
     sit reads as part of the same set as the doors above it.
     THE HOVER STILL ANSWERS: the overlay goes from invisible to visible,
     which is a far louder acknowledgement than a colour change, and it was
     always doing that work. The red was a second signal on top of it. */
  &:hover {
    opacity: 1;
    color: #d8cdb4;
  }
  /* While asking the name, the overlay must not fade away under the cursor.
     User call 2026-08-28: the ask sits ON THE NAMEPLATE, not over the coin —
     it borrows `.player > .name`'s own geometry (top/right/width below are
     that rule's values verbatim) so the box lands exactly where the plate
     draws, and it wears the fork's pick purple (#a78fcd, the gsel/breath
     ink) instead of red — an invitation to type, not a warning. */
  &.asking {
    opacity: 1;
    cursor: default;
    top: 5px;
    right: 10%;
    left: auto;
    width: 120%;
    height: auto;
    flex-direction: row;
    border-radius: 10px;
    background: none;
  }
  input {
    width: 80%;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border: 2px solid #a78fcd;
    border-radius: 6px;
    padding: 3px 6px;
    font-size: 80%;
    text-align: center;
    outline: none;
    &:focus {
      border-color: #c9b3ef;
    }
  }
  /* FT-1342 (user: the focus must be the app's purple, not red). The
     app-wide input chrome (App.vue, 2026-08-17 — hairline border, BLOOD-RED
     focus glow) compiles later in the bundle AND outranks the bare `input`
     above, so this box was resting grey and focusing red; the purple up
     there had stopped landing. The #townsquare hop outweighs that chrome
     decisively and restates the ask's own inks — the selected controls'
     #a78fcd resting, #c9b3ef focused — with the focus halo gone purple too
     (SeatWhisper's own recipe, same 0.4). */
  #townsquare & input {
    border: 2px solid #a78fcd;
    box-shadow: none;
    &:focus {
      border-color: #c9b3ef;
      box-shadow: 0 0 7px rgba(167, 143, 205, 0.4);
    }
  }
  .go {
    cursor: pointer;
    &:hover {
      color: #a78fcd;
    }
  }
}

/* FT-1317: THE RESTING CHAIR ON AN EMPTY COIN — see the template note. It is
   the claimed seat's badge recipe verbatim (mask painted with currentColor,
   FT-1283's stone ink and quiet, the parent's drop-shadow tracing the masked
   shape). No pointer, no states — it is furniture, not a control; the claim
   overlay above it is the control.

   FT-1328 (user override): CENTRED, not low. FT-1317 sat the chair low
   because the Roman numeral owned the coin's centre; the user has since
   asked for the chair in the middle regardless of the numeral. When the
   numeral is also up (FT-1328's `coinNumerals` pref, on by default) it steps
   to the upper spot above the centred chair instead — see
   `.open-mark ~ .seat-numeral` below — and with the pref off the chair
   simply stands alone. */
.player .open-mark {
  position: absolute;
  left: 0;
  /* THE BOX IS THE COIN'S OWN SQUARE — the numeral's aspect-ratio trick,
     for the numeral's reason: `.player` is taller than it is wide (coin +
     name plate), so a percentage of ITS height lands things off the coin's
     face (the first render sat the chair astride the toothed rim). */
  top: -0.8%;
  width: 100%;
  aspect-ratio: 1;
  z-index: 2;
  pointer-events: none;
  /* FT-1323 round 3: the chair lab's tone dial (chairArt.js) — unset until
     touched, so a fresh session still paints the resting stone below. */
  color: var(--chair-ink, #9a9285);
  /* User call 2026-08-30 ("still too dark even with 100% opacity"): the dial
     is ABSOLUTE on the resting chair — 1.0 paints it solid; the old muted
     rest is dial 0.75, not a baked ceiling the slider could never clear. */
  opacity: var(--chair-opacity, 1);
  filter: drop-shadow(0 0 3px black);
  transition: opacity 200ms;
  &::before {
    content: "";
    display: block;
    width: 100%;
    height: 100%;
    background-color: currentColor;
    /* FT-1337: the art comes from the chair lab's root var now (chairArt.js
       paints it at startup); the incumbent stays as the fallback. */
    -webkit-mask-image: var(--chair, url("../assets/ui-seat-front.svg"));
    mask-image: var(--chair, url("../assets/ui-seat-front.svg"));
    /* `auto 26%` = the chair stands 26% of the coin tall (≈ the 28px the
       claim invitation's own chair gets), width from the art's ratio.
       FT-1323 round 3: scaled by the lab's per-surface size dial, 1.0 =
       this same 26%. */
    -webkit-mask-size: auto calc(26% * var(--chair-size-coin, 1));
    mask-size: auto calc(26% * var(--chair-size-coin, 1));
    /* FT-1328: MIDDLE of the coin's face (was `center 78%`, low). */
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }
}
/* While the big claim invitation (its own chair + word) is up, the resting
   chair steps aside — two chairs on one coin is a stutter — and so does the
   Roman numeral: its dark strokes sat under the invitation's chair and
   interleaved with it (seat IIII read as a letter salad). Both spans sit
   after the overlay in the DOM precisely so this reach works. */
.player .claim-overlay:hover ~ .open-mark,
.player .claim-overlay:hover ~ .seat-numeral {
  opacity: 0;
}
/* On a hoverless pointer the claim overlay is ALWAYS showing (see the
   hover:none block below), so wherever it renders the resting chair yields
   full-time; seats with no overlay (the storyteller's view) keep it. */
@media (hover: none) {
  .player .claim-overlay ~ .open-mark,
  .player .claim-overlay ~ .seat-numeral {
    opacity: 0;
  }
}
/* FT-1328: THE CHAIR AND THE NUMERAL SHARE AN EMPTY COIN. The chair now
   sits in the middle (see .open-mark above) — where the numeral used to
   stand alone — so when both are up the numeral steps to the upper spot
   where it can breathe, instead of overlapping the chair's back. `.open-mark`
   only renders on an unclaimed seat (its own v-if), so this reach never
   touches a SEATED coin's numeral: that one stays centred exactly as
   before, because there is no chair under it to share room with. Higher
   specificity than `.player > .seat-numeral` above (three classes vs two),
   so it wins without needing source order. */
/* FT-1334 (user correction on FT-1328): NEUTRALIZED — the centred chair was
   asked for; moving the numeral was not. The three declarations below stood
   the numeral up at the coin's shoulder and shrank it; with them inert the
   numeral renders exactly as it did before bd4ac26, centred at its full
   size, and the accepted cost is that chair and numeral now overlap on an
   empty coin (the user's explicit call: "ship it exactly so"). Declarations
   commented out rather than the rule deleted, per the house rule. */
.player .open-mark ~ .seat-numeral {
  /* align-items: flex-start; */
  /* padding-top: 6%; */
  /* font-size: 1.5em; */
}

/* FT-1319: THE RENAME ASK — the claim ask's own dress, ON the plate.
   It is `.name`'s own child (see the template note: the plate's rendered
   box is the one place that is "on the plate" in every seat's rotated
   frame), centred over the plate and allowed to stand a little taller than
   it. The input is `.claim-overlay.asking`'s purple-outlined box, same
   inks (#a78fcd resting, #c9b3ef focused): an invitation to type, not a
   warning. Its own class rather than a reuse of `.claim-overlay` because
   that overlay renders only on an UNCLAIMED chair and carries a whole-coin
   claim click this box must not. */
/* FT-1342 (user: "messy" — text under the typed name): while the rename ask
   is up, the plate's OWN rendered name (and pronouns) showed through beneath
   the input — two names in one small box. The plate text steps aside for the
   ask (hidden, not removed — the ask sits inside `.name`, so everything else
   in the plate goes quiet) and returns the moment the ask closes. */
.player > .name.renaming > span,
.player > .name.renaming > svg,
.player > .name.renaming > .pronouns {
  visibility: hidden;
}
.player > .name .rename-ask {
  position: absolute;
  left: -4px;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: white;
  text-shadow: 0 0 4px black;
  input {
    width: 80%;
    min-width: 0;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    border: 2px solid #a78fcd;
    border-radius: 6px;
    padding: 3px 6px;
    font-size: 80%;
    text-align: center;
    outline: none;
    &:focus {
      border-color: #c9b3ef;
    }
  }
  /* FT-1342: the same #townsquare hop as the claim ask above — the app-wide
     chrome was turning this box grey-then-red too; the rename keeps the
     selected controls' purple, halo included. */
  #townsquare & input {
    border: 2px solid #a78fcd;
    box-shadow: none;
    &:focus {
      border-color: #c9b3ef;
      box-shadow: 0 0 7px rgba(167, 143, 205, 0.4);
    }
  }
  .go {
    cursor: pointer;
    &:hover {
      color: #a78fcd;
    }
  }
}

/* THE CLAIM PROMPT IS THE PLAYER'S WHOLE JOB ON A PHONE, and it was invisible
   there. The overlay sits at `opacity: 0` and is revealed by `:hover`, a state
   a touch screen never enters — so an empty chair offered no sign that tapping
   it would take the seat. (It still WORKED: a transparent overlay takes clicks
   perfectly well. Nothing said so.)

   On a hoverless pointer it simply shows, dimmed enough that eight of them
   around the ring do not shout over the town, and it keeps the same tap.
   `:active` gives the press its own feedback in place of the hover it cannot
   have. */
@media (hover: none) {
  .player .claim-overlay {
    opacity: 1;
    background: rgba(0, 0, 0, 0.42);
    /* the touch twin of the hover above — a press cannot use the reveal as
       its feedback, because on a hoverless pointer the overlay is already
       showing, so this one keeps a real change: the ground darkens and the
       ink brightens toward white, staying inside the same bone family. */
    &:active {
      background: rgba(0, 0, 0, 0.6);
      color: #f6dfbd;
    }
  }
}

@import "../vars.scss";
@import "../faceDisc.scss";

.fold-enter-active,
.fold-leave-active {
  transition: transform 250ms ease-in-out;
  transform-origin: left center;
  transform: perspective(200px);
}
.fold-enter,
.fold-leave-to {
  transform: perspective(200px) rotateY(90deg);
}

/***** Player token *****/
.circle .player {
  margin-bottom: 10px;

  &:before {
    content: " ";
    display: block;
    padding-top: 100%;
  }

  .shroud {
    top: 0;
    left: 0;
    position: absolute;
    width: 100%;
    height: 45%;
    cursor: pointer;
    transform: rotateX(0deg);
    transform-origin: top center;
    transition: transform 200ms ease-in-out;
    z-index: 2;

    // FT-997 (user call: "we need a glassy silk looking veil that goes over
    // a player token when they are dead. we already have a color change on
    // the token that is significant, we don't also need to have a big ghost
    // over their token. So it should be a cool additional add but it does
    // not need to be the primary way to indicate someone is dead").
    //
    // THE COWL GOES. FT-974/990/991 progressively refined a FIGURE painted
    // over the coin — a sheet ghost, then a hooded cowl, then that cowl
    // rendered as glass — each judged on the same "does it read as dead"
    // glance metric. This call rejects the premise, not the execution: the
    // coin already says dead on its own (the colour swap two rules above,
    // and Token.vue's cold-metal swap), so this mark's job shrinks from
    // "read as dead" to "read as an extra". `ui-ghost.png`, `ui-ghost-
    // cowl.png` and `ui-ghost-cowl-rim.png` are not orphaned by this — the
    // cowl PNGs still paint the ghost-VOTE mark (`.has-vote.ghost-vote`
    // below) and the FT-991 glass lab's preview (`html.gg-glass`, further
    // down this file) — this rule alone stops drawing a figure with them.
    //
    // NO PNG for the veil itself, on purpose: a second silhouette here,
    // glassy or not, is still a figure, and the ask was for fabric, not a
    // shape. The drape is a soft `radial-gradient` MASK instead — one
    // ellipse, feathered at the edge, so the veil has no hard outline to
    // read as a cutout. `:before` is the pane (a cool, barely-there wash
    // plus a sliver of real `backdrop-filter` blur, so the coin under it
    // actually softens); `:after` is the sheen, a single diagonal highlight
    // standing in for the fold of light silk always catches. Both share the
    // mask below so they can never drift apart.
    //
    // `.shroud`'s old `drop-shadow` goes with the cowl: it existed to hold
    // an OPAQUE figure off the coin's pale rim, and an ancestor `filter` is
    // a backdrop-filter killer (measured for the glass lab —
    // claude_temp_test/2026-08-20-ft991b-backdrop-probe.mjs), so it was the
    // one thing standing between this veil and real glass by default.
    //
    // GEOMETRY is UNCHANGED from the cowl's own box (`top`/`height` below,
    // and the `.dead`/hover rules past the end of this block) — the click
    // target, the resting position and the FT-991 lab all key off those
    // same numbers, and none of them needed to move for a mask-shaped veil
    // to read as draped over the coin's upper face.
    &:before,
    &:after {
      content: " ";
      position: absolute;
      margin-left: -50%;
      width: 100%;
      height: 106%;
      // FT-1004b: the veil lab's position and size ride the SHIPPED numbers
      // as offsets — the geometry here speaks percent of the shroud box, so
      // the dials do too (one unit = 1% of the box). With the lab absent
      // every var falls back to its ship value. FT-1015 BAKED THE USER'S
      // TUNED LOOK: the fallbacks ARE the ship now (Shift down 7, Size 144,
      // Frost 103, Transparency 75 below), so a fresh browser wears the
      // tuned veil and the lab's dials rest on these same numbers. Size
      // scales art and mask together (they are the same image) about the
      // existing `top center` origin, and the arrival keeps its own 1.15
      // settle on top of it.
      left: calc(50% + var(--vl-shift-x-adj, 0) * 1%);
      top: calc(-20% + var(--vl-shift-y-adj, 7) * 1%);
      opacity: 0;
      transform: perspective(400px)
        scale(calc(var(--vl-size-adj, 144) / 100 * 1.15));
      transform-origin: top center;
      transition: all 200ms;
      pointer-events: none;
      // FT-997b (user call: "the shroud doesn't read right — try the png
      // called veil in the botc folder"): the gradient drape's ellipse mask
      // is gone — the veil is ART now (design/viel.png, baked to
      // ui-veil.png), and its own alpha is the silhouette.
    }

    // THE PANE — a cool, translucent wash (silk, not sheet-white) plus a
    // sliver of real glass. CENTRED ON THE SAME POINT AS THE MASK ABOVE, and
    // that centring is load-bearing, not cosmetic: a first cut used a
    // diagonal `linear-gradient` here, whose brightest stops sat near the
    // BOX's corners — exactly where the ellipse mask fades to nothing, so
    // the one wash and its own mask were cancelling each other out (measured
    // dead-on-screen at up to 2.5x the alpha below: claude_temp_test/2026-
    // 08-20-ft997-tune.cjs). A radial wash sharing the mask's centre instead
    // puts its own brightest ring INSIDE the visible ellipse. The blur stays
    // tiny on purpose: at seat scale a strong blur would smear the role art
    // into mush, so this only softens it, the way a fine weave would.
    &:before {
      // the silk itself — the user's art. The SAME image is also the mask,
      // which does two jobs: it confines the backdrop blur to the veil's
      // silhouette (a bare backdrop-filter fills the whole box), and the
      // alpha-on-alpha multiply densifies the sheer fabric just enough to
      // read over a bright coin without any added wash.
      // FT-1015: SILK THREE is the shipped art now — the user tuned the
      // look in the veil lab and called it ("let's do this for the veil").
      // ui-veil.png and ui-veil2.png remain the lab's classed alternates in
      // the hook block below.
      background: url("../assets/ui-veil3.png") center top / contain no-repeat;
      -webkit-mask: url("../assets/ui-veil3.png") center top / contain no-repeat;
      mask: url("../assets/ui-veil3.png") center top / contain no-repeat;
      // FT-1004/1015: the Frost dial's fallback IS the ship — 103 tenths =
      // the baked blur(10.3px). On a Chromium engine the boot-set
      // `html.veil-glass` rule below REPLACES this backdrop-filter with the
      // displacement filter (same blur kept in the chain); everywhere else
      // THIS is the shipped look — the ship forks by engine, as the glass
      // bench itself does.
      backdrop-filter: blur(calc(var(--vl-frost-adj, 103) * 0.1px))
        saturate(94%);
      -webkit-backdrop-filter: blur(calc(var(--vl-frost-adj, 103) * 0.1px))
        saturate(94%);
    }

    // THE SHEEN — one diagonal band of light, standing in for the fold silk
    // always catches. `screen` lets it brighten whatever colour is under it
    // instead of painting a flat white stripe over the coin. Its stops don't
    // need the pane's re-centring: a diagonal line through the box's own
    // middle (45%-53%) already crosses the mask's visible ellipse dead on.
    &:after {
      // FT-997b: the painted sheen retired with the gradient veil — the art
      // carries its own folds and light. The pseudo stays (the .dead/hover
      // rules below still address it) but paints nothing.
      content: none;
    }

    #townsquare.spectator & {
      pointer-events: none;
    }

    // the veil previews on hover — but NOT while the town is still being
    // built (user call 2026-08-18): nothing can die yet, and the mark
    // flashing over every seat while assigning roles reads as an error.
    // The preview is HALF of whatever the resting veil is, so the Opacity
    // dial still moves the preview WITH the veil. FT-1004: that dial is the
    // VEIL lab's now (`--vl-opacity-adj`, src/golem/veilGlass.js) — the
    // veil's controls moved out of the ghost lab with the cowl's retirement.
    #townsquare:not(.spectator):not(.building) &:hover:before {
      opacity: calc(var(--vl-opacity-adj, 75) / 100 * 0.5);
      // matches the `.dead` rule below — one number, where the veil settles
      top: calc(-6% + var(--vl-shift-y-adj, 7) * 1%);
      transform: scale(calc(var(--vl-size-adj, 144) / 100));
    }
    #townsquare:not(.spectator):not(.building) &:hover:after {
      opacity: calc(var(--vl-opacity-adj, 75) / 100 * 0.5);
      top: calc(-6% + var(--vl-shift-y-adj, 7) * 1%);
      transform: scale(calc(var(--vl-size-adj, 144) / 100));
    }
  }

  // The arrival is kept: the veil drops from `top: -20%` to its resting
  // `-6%` and settles out of a slight `scale(1.15)` over the same 200ms the
  // cowl (and the cloth before it) arrived in — cloth drifting down and
  // cinching flat is more of a piece with silk than the old figure's
  // bigger, further fall was.
  &.dead .shroud:before,
  &.dead .shroud:after {
    top: calc(-6% + var(--vl-shift-y-adj, 7) * 1%);
    transform: perspective(400px) scale(calc(var(--vl-size-adj, 144) / 100));
  }
  // the pane's own resting strength — still the Opacity dial's home, but the
  // wash itself is what keeps this subtle now, not this number
  &.dead .shroud:before {
    opacity: calc(var(--vl-opacity-adj, 75) / 100);
  }
  // FT-997: the sheen is no longer gated behind the old cowl-outline's Rim
  // dial (that dial answered "how strong is the outline", and this mark no
  // longer has one) — its strength lives in its own gradient stops now, so
  // it takes the same Opacity dial as the pane and nothing else.
  &.dead .shroud:after {
    opacity: calc(var(--vl-opacity-adj, 75) / 100);
  }

  #townsquare:not(.spectator) &.dead .shroud:hover:before {
    opacity: calc(var(--vl-opacity-adj, 75) / 100);
  }
  #townsquare:not(.spectator) &.dead .shroud:hover:after {
    opacity: calc(var(--vl-opacity-adj, 75) / 100);
  }

  // FT-1315: THE SPENT VOTE DROPS THE SHROUD. In the tower's "shroud"
  // vocabulary (`.shroud-lifted`, computed on the seat root) a dead seat
  // that has spent its ghost vote takes the veil clean off — the bare dead
  // coin IS the spent mark. The `.shroud` box itself stays (it is still the
  // death toggle's click target); only the veil's paint goes, hover included
  // — the id-weighted hover rules above would otherwise out-rank a plain
  // class override, so the pair is restated at their own specificity.
  &.dead.shroud-lifted .shroud:before,
  &.dead.shroud-lifted .shroud:after {
    opacity: 0;
  }
  #townsquare:not(.spectator) &.dead.shroud-lifted .shroud:hover:before,
  #townsquare:not(.spectator) &.dead.shroud-lifted .shroud:hover:after {
    opacity: 0;
  }
}

/* ── FT-991 — THE GHOST AS GLASS ──────────────────────────────────────────────
 *
 * User: "can you give me a lab to make the ghost cowl glass, like we did with
 * the centre circle?"
 *
 * THE PNG CHANGES JOBS, and that is the whole idea. Glass in this app means
 * `backdrop-filter` — blur, saturation, brightness and a veil applied to
 * whatever is BEHIND an element (`src/faceDisc.scss`). `ui-ghost-cowl.png` is a
 * PAINTING, and a painting has no behind, so no amount of tinting it can make it
 * glass. Here the cowl is not drawn at all: its ALPHA becomes a MASK over a
 * layer carrying the backdrop-filter, which is what confines the glass to the
 * ghost's silhouette.
 *
 * That composes two things this fork already has rather than inventing a third:
 * TownInfo.vue's alive heart is the mask-a-PNG's-alpha idiom, and faceDisc.scss
 * is the glass vocabulary.
 *
 * AND THE DRAPERY SURVIVES THE SWAP, which is the happy part. The cowl's alpha
 * is already a density field — dense at the hood, thinning down the robe to a
 * torn hem, a void where a face would be — so masking with it gives the pane the
 * same folds the painting had, as varying GLASS STRENGTH instead of varying ink.
 * What does NOT survive is the art's baked film grain and its exact tone: a mask
 * discards colour. The Tint dial is what puts the tone back, in the mark's own
 * cold (198,214,228), which is why that is the fallback triplet here.
 *
 * `filter: none` IS LOAD-BEARING, not tidying. An ancestor with a `filter` forms
 * a BACKDROP ROOT and a `backdrop-filter` beneath one samples an empty group and
 * paints NOTHING — measured, not assumed (claude_temp_test/2026-08-20-ft991b-
 * backdrop-probe.mjs). `.shroud`'s drop-shadow is exactly that ancestor. So
 * glass costs the mark its dark separation from the coin, and the Rim dial
 * exists to hand it an edge back.
 *
 * THE CLASS, NOT A CUSTOM PROPERTY, because what changes between the two
 * materials is not a value — it is which declarations exist at all. It also
 * makes "is the lab doing anything?" answerable from outside the stylesheet, and
 * with it absent this whole block is inert: the shipped mark is the painting
 * above, untouched.
 *
 * TEMPORARY, DELETE ME — this block, `src/golem/ghostGlass.js`,
 * `src/components/GhostLab.vue` and its one line in App.vue all come out
 * together once a material is chosen and baked. */
html.gg-glass .circle .player .shroud {
  filter: none;

  &:before {
    // the painting goes; a flat veil in the mark's own tone takes its place,
    // and the mask is what gives that veil the ghost's shape
    background: rgba(
      var(--gg-tint-rgb, 198, 214, 228),
      calc(var(--gg-tint-adj, 0) / 100)
    );
    -webkit-mask: url("../assets/ui-ghost-cowl.png") center top / auto 100%
      no-repeat;
    mask: url("../assets/ui-ghost-cowl.png") center top / auto 100% no-repeat;

    // THE BLUR IS A FRACTION OF THE SEAT, never a pixel count — `--seat-sz` is
    // the app's own name for that length and 15vmin is the ring's own geometry,
    // so one setting is one material at every window size. `max(0px, ...)` is
    // belt and braces: an invalid filter term does not weaken the glass, it
    // invalidates the WHOLE backdrop-filter and deletes it.
    backdrop-filter: blur(
        max(0px, calc(var(--seat-sz, 15vmin) * var(--gg-blur-adj, 0) / 1000))
      )
      saturate(calc(var(--gg-sat-adj, 100) / 100))
      brightness(calc(var(--gg-bright-adj, 100) / 100));
    -webkit-backdrop-filter: blur(
        max(0px, calc(var(--seat-sz, 15vmin) * var(--gg-blur-adj, 0) / 1000))
      )
      saturate(calc(var(--gg-sat-adj, 100) / 100))
      brightness(calc(var(--gg-bright-adj, 100) / 100));
  }
}

/* ── FT-1004 — THE VEIL LAB'S TWO HOOKS ──────────────────────────────────────
 *
 * User: "give me a lab for the dead veil. Let me choose between the two veil
 * pngs in the botc folder, and then give me controls to make them glassy.
 * full controls from the glass bench html we looked at before."
 *
 * The lab itself is `src/components/VeilLab.vue` + `src/golem/veilGlass.js`
 * (behind `devLabs`); its Frost and Opacity dials ride the `--vl-*` fallbacks
 * woven into the shipped veil rules above. These two rules are the parts that
 * are not a value but a different set of declarations, so they hang off
 * classes the lab toggles on <html> — with the lab absent both classes are
 * absent and this whole block is inert.
 *
 * THE SILK PICK. The second painting (design/veil2.png, baked to ui-veil2.png
 * the same way ui-veil.png was: trim, height 512, the fork's own sharp) swaps
 * in as BOTH the art and the mask, because that pairing is the shipped veil's
 * whole construction — the image confines its own backdrop effects.
 *
 * THE REFRACTION. `backdrop-filter` swaps from `blur()` to the bench's SVG
 * displacement filter (`#vl-glass`, mounted by veilGlass.js) with the blur
 * kept in the chain — the mask stays exactly as shipped, so the bending is
 * confined to the silk's silhouette the same way the blur is. Chromium-only
 * (`backdrop-filter: url()` paints nowhere else); the lab never sets the
 * class elsewhere, leaving those engines the plain-Frost veil above — the
 * same fallback the bench shows. And the one thing that would kill it — an
 * ancestor `filter` forms a backdrop root (measured, FT-997) — stays absent.
 *
 * FT-1015 — A LOOK WAS CHOSEN AND BAKED. Silk three and the tuned numbers
 * moved into the shipped rules above; what remains here is (a) the lab's two
 * classed ALTERNATE silks (the default silk carries no class — one and two
 * are the classed ones now, "vl-silk-three" is retired), and (b) the
 * `veil-glass` rule, which is the SHIP'S: the baked look refracts, so
 * `bootVeilGlass()` (veilGlass.js, called from App.vue's mounted) sets the
 * class at boot on every Chromium engine — labs or no labs — and the lab
 * merely re-uses it (Refraction dialled to 0 removes it). Non-Chromium
 * engines never get the class and ship the plain blur above. */
html.vl-silk-one .circle .player .shroud:before {
  background: url("../assets/ui-veil.png") center top / contain no-repeat;
  -webkit-mask: url("../assets/ui-veil.png") center top / contain no-repeat;
  mask: url("../assets/ui-veil.png") center top / contain no-repeat;
}
html.vl-silk-two .circle .player .shroud:before {
  background: url("../assets/ui-veil2.png") center top / contain no-repeat;
  -webkit-mask: url("../assets/ui-veil2.png") center top / contain no-repeat;
  mask: url("../assets/ui-veil2.png") center top / contain no-repeat;
}
html.veil-glass .circle .player .shroud:before {
  backdrop-filter: url(#vl-glass) blur(calc(var(--vl-frost-adj, 103) * 0.1px))
    saturate(94%);
  -webkit-backdrop-filter: url(#vl-glass)
    blur(calc(var(--vl-frost-adj, 103) * 0.1px)) saturate(94%);
}

/* FT-997c (user call 2026-08-20: "you added a dark color to dead coins...
 * they are already silver we don't need to also make them darker"): the
 * FT-974 dead-coin dim (`brightness(0.72)` on `.circle .player.dead .token`)
 * is retired. It existed to give the retired pale ghost a darker ground to
 * glow against; the ghost is gone (FT-997) and the coin's cold-metal swap
 * (Token.vue) already says dead on its own. The veil above is judged over
 * the coin at full brightness now. */

/****** Life token *******/
.player {
  z-index: 2;
  .life {
    // no circular clip — see Token.vue: border-radius: 50% cut off every
    // tooth that crossed the inscribed circle, which is the "clipping" the
    // user saw. The coin art carries its own edge.
    width: 100%;
    // Golem fork (2026-08-18): our OWN seat token — a disc of the
    // clocktower's gold filigree (life-golem.png; upstream's life.png
    // stays in the tree untouched)
    // The token's two faces are now the SAME COIN (user call 2026-08-18):
    // the public face is the blank coin, the storyteller face is the coin
    // with the role on it. Identical silhouettes mean nothing can peek out
    // from behind the other. life-golem.png stays in the tree, unreferenced.
    // no-repeat — the shorthand resets background-repeat, and a TILED coin put
    // the next tile's top edge just under this one: that is the "melting" rim,
    // the stray red nub and the thing peeking from behind the disc, all one
    // bug (user diagnosis 2026-08-18). The shadow follows the art's alpha for
    // the same reason the coin's does — a box-shadow draws a circle.
    //
    // FT-1224 — THE THIRD "cut teeth", and this one was never CSS. This rule
    // was the ONE coin face still hardcoding token-golem.png, and that BAKE
    // is itself edge-cropped: the coin_4 art was scaled past the 512 canvas,
    // shaving the side teeth flat IN THE BITMAP (measured: 98/105px of
    // flush-opaque run down the left/right edges, 19px across the top —
    // vs 48/51/0 for coins/coin4.png, the art every OTHER coin face shows
    // via the coin lab's --coin). No border-radius/overflow/clip anywhere on
    // the chain (probed live, FT-1224); the clip rode in with the art.
    // So: read --coin like Token.vue and the dead face below already do.
    // GUARD for the next editor: toothed coin art tolerates NO box shape on
    // its container (no border-radius, no overflow:hidden — glow via
    // drop-shadow only, see Token.vue) AND no bake that runs the art off its
    // own canvas. If teeth look cut and the CSS chain is clean, measure the
    // bitmap's edge alpha before touching any rule.
    background: var(--coin, url("../assets/token-golem.png")) center center /
      contain no-repeat;
    border: 3px solid transparent;
    filter: drop-shadow(0 0 7px rgba(0, 0, 0, 0.55));
    cursor: pointer;
    transition: transform 200ms ease-in-out;
    transform: perspective(400px) rotateY(180deg);
    backface-visibility: hidden;
    position: absolute;
    left: 0;
    top: 0;
    // Both faces are the SAME COIN now, so there is no mismatched silhouette
    // to hide — the earlier 92% tuck (which shrank this disc so its ring
    // stopped showing through the coin's teeth) is retired. The ring goes
    // with it: the coin art carries its own edge.
    border-color: transparent;
    box-shadow: none;

    &:before {
      content: " ";
      display: block;
      padding-top: 100%;
    }

    // FT-985: superseded by `.player > .seat-numeral` below — the numeral is
    // no longer a child of the life token (this face is turned away in the
    // one state the numeral is now for). The rule stays in the tree
    // unreferenced, the way upstream's token.png and the retired `.ability`
    // box do.
    .seat-numeral {
      position: absolute;
      left: 0;
      // The coin art's face sits a touch high inside its own square (measured
      // on coin_4: the opaque box centres 4px above the image centre at 512,
      // ~0.8%), so the numeral follows the FACE rather than the element box —
      // which is why it read as off-centre (user report 2026-08-18).
      top: -0.8%;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      font-family: "PiratesBay", Georgia, serif;
      font-size: 2.2em;
      color: #14100a;
      text-shadow: 0 1px 1px rgba(255, 250, 235, 0.45);
      pointer-events: none;
      user-select: none;
    }
  }

  // FT-985 — THE SEAT'S ROMAN NUMERAL, on the face that is actually showing.
  // `.player`'s own child now, not the life token's, so it rides whichever
  // coin is turned toward the viewer instead of flipping away with one of
  // them. `showSeatNumeral` is what decides it appears at all; the geometry
  // is unchanged from the rule above — the same square box over the same
  // coin, with the same 0.8% lift onto the art's true centre.
  > .seat-numeral {
    position: absolute;
    left: 0;
    top: -0.8%;
    width: 100%;
    // SQUARE, like the coin it sits on — NOT `height: 100%`. `.player` is
    // taller than it is wide (the coin plus the name plate below it), so a
    // full-height box centred the numeral on the whole SEAT and dropped it
    // off the coin's face: measured 108x147 where the coin is 108x108. The
    // life token and the role coin get their own square from a padding-top
    // trick; this gets it from the aspect ratio directly.
    aspect-ratio: 1;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    font-family: "PiratesBay", Georgia, serif;
    font-size: 2.2em;
    color: #14100a;
    text-shadow: 0 1px 1px rgba(255, 250, 235, 0.45);
    pointer-events: none;
    user-select: none;
    /* FT-1317: the numeral steps aside while the claim invitation is up —
       see the .open-mark rules; this is just the fade. */
    transition: opacity 200ms;
  }

  &.dead {
    &.no-vote .life:after {
      display: none;
    }

    .life {
      // Golem fork: our shroud disc (upstream death.png stays untouched)
      // the dead plate is the same coin, drained and cooled
      background-image: var(--coin-dead, url("../assets/token-golem-dead.png"));

      &:after {
        content: " ";
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        background: url("../assets/vote-golem.png") center center no-repeat;
        background-size: 50%;
        height: 100%;
        pointer-events: none;
      }
    }
  }

  &.traveler .life {
    filter: grayscale(100%);
  }
}

/* FT-1294: THE FLIP ITSELF STOOD HERE. `#townsquare.public .player` swung the
   blank face forward — shroud folded away, `.life` turned to the viewer, the
   traveler's coin shrunk behind it — and `#townsquare.public .circle .token`
   below turned the character's face out of sight. That is the face-down
   grimoire, in three rules. It is retired (see store/index.js): the coins show
   their characters, on every client, always, and the base rules a few lines up
   are now the only faces there are. */

/***** Role token ******/
.player .token {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  transition: transform 200ms ease-in-out;
  transform: perspective(400px) rotateY(0deg);
  backface-visibility: hidden;
}

/****** FT-1080 — THE BELIEF DOCK AND THE CHIP IT HOLDS ******/
/* The chip's LOOK is unchanged from FT-861/1021/1079b and the rules below are
 * that look, moved out of Token.vue's `.token { .belief-chip }` nesting so a
 * chip standing beside the coin still wears it. Token.vue's own copy is
 * `scoped`, so it could not have reached this markup — and it is kept there,
 * untouched, for the day the coin carries its own chip again.
 *
 * WHY IT LIVES OUT HERE AT ALL is in the template's own note: `.token` opens a
 * stacking context, so nothing inside it can out-rank `.shroud`, and the chip
 * spent its `z-index: 4` on a context that could not reach the pointer.
 *
 * ONE THING DOES CHANGE, and it is the price of the fix: on a DEAD seat the
 * chip now stands proud of the veil instead of under it. That is the right way
 * round — the veil says "this seat is dead", the chip says "this seat does not
 * know what it is", and the second is a storyteller's mark, not part of the
 * coin's death. It is also unavoidable: an element the veil paints over is an
 * element the veil's own div can take the pointer from. */

/* the coin's own transparent 3px border is what the 6px/3px inset is: the dock
 * is `.token`'s PADDING box, which is the box every percentage below was
 * written against. */
.player > .belief-dock {
  position: absolute;
  left: 3px;
  top: 3px;
  width: calc(100% - 6px);
  aspect-ratio: 1;
  /* the dock is a frame of reference, never a target — only the chip takes
     the pointer */
  pointer-events: none;
  z-index: 2;
}

/* Token.vue keeps this red as `$blood`; vars.scss does not carry it, so the
 * one rule that needs it names it here. */
$belief-blood: #970000;

/* FT-861: THE BELIEF CHIP. A smaller coin struck in the same metal, set into
 * the wheel's edge — half on the rim, half proud of it, so it reads as pinned
 * TO the coin rather than as part of the face. The team's colour is a hairline
 * on its collar, the same whisper the big coin's rim carries. */
.player > .belief-dock > .belief-chip {
  position: absolute;
  /* FT-1021: ~50% bigger than the bluff minis, overlapping the coin.
     FT-1079b (user): the chip hangs HALF OFF THE COIN'S SIDE — centred it
     covered the art and the name. The side is the seat's own place on the ring
     (12, 6 and the left arc hang LEFT; every other seat hangs RIGHT), so the
     chip always leans toward the board's outside. */
  bottom: 30%;
  width: 44%;
  height: 44%;
  &.chip-left {
    left: -12%;
  }
  &.chip-right {
    right: -12%;
  }
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--coin, url("../assets/token-golem.png")) center center /
    cover no-repeat;
  box-shadow:
    0 0 0 2px rgba(20, 14, 8, 0.95),
    0 3px 7px rgba(0, 0, 0, 0.8);
  cursor: pointer;
  /* the dock is see-through to the pointer; the chip is not */
  pointer-events: auto;
  transition:
    transform 150ms ease-out,
    box-shadow 150ms ease-out;

  &:hover,
  &:focus-visible {
    outline: none;
    transform: scale(1.12);
    box-shadow:
      0 0 0 1.5px #{$belief-blood},
      0 2px 6px rgba(0, 0, 0, 0.75);
  }

  /* the collar's whisper of team colour, drawn as a ring on the chip's edge */
  @mixin chip-collar($color) {
    &:after {
      border-color: rgba($color, 0.85);
    }
  }
  &:after {
    content: " ";
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    border: 2px solid rgba(222, 208, 172, 0.85);
    border-radius: 50%;
    pointer-events: none;
  }
  &.townsfolk {
    @include chip-collar($townsfolk);
  }
  &.outsider {
    @include chip-collar($outsider);
  }
  &.minion {
    @include chip-collar($minion);
  }
  &.demon {
    @include chip-collar($demon);
  }
  &.traveler {
    @include chip-collar($traveler);
  }

  /* The chip is under half the coin across, so its art gets nearly the whole
     face — at 78% the engraving read as a smudge. It also carries the big
     coin's own lift off centre, so the two read as the same object struck at
     two sizes. Inside `.token` this layer used to inherit its box from
     `.token span`; it restated every one of those declarations even then, so
     it needs nothing from the coin here. */
  .belief-icon.unset {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: PiratesBay, sans-serif;
    font-size: 120%;
    color: #d8cdb4;
    text-shadow: 0 1px 2px black;
  }

  .belief-icon {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-position: center 47%;
    background-repeat: no-repeat;
    background-size: 88%;
    pointer-events: none;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
  }
}

/****** Player choice icons *******/
.player .overlay {
  width: 100%;
  position: absolute;
  pointer-events: none;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &:after {
    content: " ";
    display: block;
    padding-top: 100%;
  }
}
.player .overlay svg {
  position: absolute;
  filter: drop-shadow(0 0 3px black);
  z-index: 2;
  cursor: pointer;
  &.swap,
  &.move,
  &.nominate,
  &.vote,
  &.cancel {
    width: 50%;
    height: 60%;
    opacity: 0;
    pointer-events: none;
    transition: all 250ms;
    transform: scale(0.2);
    * {
      stroke-width: 10px;
      stroke: white;
      fill: url(#default);
    }
    &:hover *,
    &.fa-hand-paper * {
      fill: url(#demon);
    }
    &.fa-times * {
      fill: url(#townsfolk);
    }
  }
}

/* FT-974b — THE PAINTED VOTE PAIR.
 *
 * The X is `src/assets/icons/x.png` — the same painted mark every close
 * control in the app wears — recoloured black. The hand beside it is baked
 * from that same X's own brush texture, so the two are one material.
 *
 * BLACK, not purple: purple is the storyteller's colour here, and a player's
 * vote is not the storyteller's.
 *
 * The pair is replaced together because it IS a pair — two answers to one
 * question — and a painted X beside a vector hand mismatches worse than
 * leaving both alone would have.
 *
 * Neither mark carries a drawn outline. x.png HAS one (a cream edge, measured
 * at 5,084 px against 34,345 px of body), but at the 48x58 these render at it
 * is already lost to the downsample, so giving the hand a crisp ring made the
 * pair mismatch. Both are bare ink; the drop-shadows below do that job.
 *
 * ONE BLACK, ONE BONE — and that split is measured, not taste. Painting BOTH
 * marks black cost the yes-vs-no read across a ring: on the same 12x12 glance
 * metric the ghost was judged with, a yes-seat separated from a no-seat by
 * 14.0 with the old saturated pair and by only 8.1 with two black marks,
 * because the two answers then differed in silhouette alone and silhouette is
 * the first thing a glance discards. Opposite VALUES restore the polarity
 * that red-vs-blue was providing, without reaching for a team colour — which
 * is the whole reason red and blue had to go: $demon and $townsfolk are worn
 * by the coins these marks sit on, so the old pair read as team marking. The
 * bone end is x.png's own outline cream, and the hand carries x.png's own
 * brush texture, so the two are still one material. */
/* The miniature glass disc under the vote marks (user call 2026-08-28) —
   face-disc-menu-plate is the app's one glass definition (AccountDoor and the
   Chronicle float on the same material); round, coin-sized, below the marks
   (their z is 2), revealed by exactly the states that reveal a mark. */
.player .overlay .vote-glass {
  position: absolute;
  z-index: 1;
  width: 92%;
  height: 92%;
  left: 4%;
  top: 4%;
  border-radius: 50%;
  @include face-disc-menu-plate($r: 60px, $radius: 50%);
  opacity: 0;
  transform: scale(0.2);
  pointer-events: none;
  transition: all 250ms;
}
#townsquare.vote .player.vote-yes .overlay .vote-glass,
#townsquare.vote .player.vote-lock .overlay .vote-glass {
  opacity: 1;
  transform: scale(1);
}

.player .overlay .vote-mark {
  position: absolute;
  z-index: 2;
  cursor: pointer;
  width: 50%;
  height: 60%;
  opacity: 0;
  pointer-events: none;
  transition: all 250ms;
  /* --vote-aim (user call 2026-08-28): the yes-hand rotates to point at the
     nominated seat — set inline per seat; the X never sets it, so var() falls
     back to upright. --vote-base is the art's own file orientation. Both
     ride INSIDE the same transform as the scale states so the reveal
     animation keeps working.

     FT-1311 (user amendment): the aim is GATED ON THE LOCK now. A raised
     hand stands STRAIGHT UP while votes are being raised — a ring of hands
     leaning at nine different angles read as noise, and worse, as
     information nobody had committed to. Only when the sweep locks this
     seat's vote (`.vote-lock`) does the hand turn to point at the accused:
     the pointing is the RECORD, not the raising. So the resting, raised and
     your-own states below rotate by the base alone, and only the locked
     rule composes the aim on top — the 250ms transform transition turns the
     hand from upright to pointing at the moment the lock lands. */
  transform: scale(0.2) rotate(var(--vote-base, 0deg));
  background-position: center center;
  background-repeat: no-repeat;
  background-size: contain;

  // User call 2026-08-28 (v5 — "the SAME hand as the nomination"): the
  // raised hand is ui-nominate-hand.png ITSELF — the painted accusing
  // manicule the corner mark and the seat menu already wear — not a
  // silhouette of it (the .svg twin is the retired geometric draft and is
  // what earned the "ugly" verdict). The art points RIGHT in file, so the
  // yes-mark carries --vote-base: -90deg; the aim var composes on top, so
  // at rest it points up and during a nomination it points at the accused.
  // The X keeps its own baked art; the vote-glass grounds both.
  &.yes {
    /* The painted manicule points LEFT in file (its own markup note: "the
       art always points at the clock face", mirrored per side) — so +90
       turns it upright, not -90 (the first cut assumed right and shipped
       it upside-down). */
    --vote-base: 90deg;
    background-image: url("../assets/ui-nominate-hand.png");
    /* FT-1311 item 4: THE VOTE HAND IS NOT THE ACCUSING HAND, at a glance.
       Same painted manicule (the user's v5 call stands — one family), three
       deliberate distinctions: (1) it rides the glass disc, which the
       nominate corner mark never wears; (2) it stands upright until the
       lock, where the accuser's hand always points; (3) THE INK — this one
       is washed toward chalk (saturation halved, lifted a step) so it reads
       as "a hand raised", pale against the accuser's full-blood paint. A
       filter rather than a second bake: the art stays one file, and the
       wash is honest about being the same hand. */
    filter: saturate(0.45) brightness(1.25)
      drop-shadow(0 0 4px rgba(0, 0, 0, 0.95));
  }

  &.no {
    background-image: url("../assets/ui-vote-no.png");
    filter: drop-shadow(0 0 4px rgba(250, 245, 235, 0.9));
  }

  &.yes:hover {
    filter: saturate(0.45) brightness(1.25)
      drop-shadow(0 0 7px rgba(0, 0, 0, 1));
  }

  &.no:hover {
    filter: drop-shadow(0 0 7px rgba(255, 252, 245, 1));
  }
}

// other player voted yes, but is not locked yet — upright (FT-1311: the aim
// waits for the lock; see the --vote-aim note above)
#townsquare.vote .player.vote-yes .overlay .vote-mark.yes {
  opacity: 0.5;
  transform: scale(1) rotate(var(--vote-base, 0deg));
}

// you voted yes (not locked yet) — full ink, still upright
#townsquare.vote .player.you.vote-yes .overlay .vote-mark.yes {
  opacity: 1;
  transform: scale(1) rotate(var(--vote-base, 0deg));
}

// LOCKED — the sweep has recorded this seat. A locked YES turns to point at
// the accused (the one place --vote-aim participates); a locked NO is the X,
// which never aims. This rule sits AFTER the `.you` rule above on purpose:
// your own locked yes matches both at equal specificity, and the lock wins.
#townsquare.vote .player.vote-lock.vote-yes .overlay .vote-mark.yes {
  opacity: 1;
  transform: scale(1)
    rotate(calc(var(--vote-base, 0deg) + var(--vote-aim, 0deg)));
}
#townsquare.vote .player.vote-lock:not(.vote-yes) .overlay .vote-mark.no {
  opacity: 1;
  transform: scale(1) rotate(var(--vote-base, 0deg));
}

// a locked vote can be clicked on by the ST
#townsquare.vote:not(.spectator) .player.vote-lock .overlay .vote-mark {
  pointer-events: all;
}

// other player voted yes, but is not locked yet
#townsquare.vote .player.vote-yes .overlay svg.vote.fa-hand-paper {
  opacity: 0.5;
  transform: scale(1);
}

// you voted yes | a locked vote yes | a locked vote no
#townsquare.vote .player.you.vote-yes .overlay svg.vote.fa-hand-paper,
#townsquare.vote .player.vote-lock.vote-yes .overlay svg.vote.fa-hand-paper,
#townsquare.vote .player.vote-lock:not(.vote-yes) .overlay svg.vote.fa-times {
  opacity: 1;
  transform: scale(1);
}

// a locked vote can be clicked on by the ST
#townsquare.vote:not(.spectator) .player.vote-lock .overlay svg.vote {
  pointer-events: all;
}

li.from:not(.nominate) .player .overlay svg.cancel {
  opacity: 1;
  transform: scale(1);
  pointer-events: all;
}

li.swap:not(.from) .player .overlay svg.swap,
li.nominate .player .overlay svg.nominate,
li.move:not(.from) .player .overlay svg.move {
  opacity: 1;
  transform: scale(1);
  pointer-events: all;
}

/* FT-1069 — THE TARGET PICK IS THE NOOSE. With a nominator armed, every seat
 * offers this instead of the white pointing hand: choosing who stands trial
 * is a gallows act, and the hand moved to the nominate mark where "points at"
 * lives. Same box, same scale-in, same activation gate as the svg it
 * replaces (`li.nominate` above keeps its svg rule for the flagged-off
 * glyph); the paired dark halo is the vote-mark's own — a pale mark needs it
 * to stay off a pale coin rim, and the hover deepens it the way the painted
 * vote pair's hovers do. */
.player .overlay .nominate-target {
  position: absolute;
  z-index: 2;
  cursor: pointer;
  width: 50%;
  height: 60%;
  opacity: 0;
  pointer-events: none;
  transition: all 250ms;
  transform: scale(0.2);
  background: url("../assets/ui-noose.png") center center / contain no-repeat;
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.95));

  &:hover {
    filter: drop-shadow(0 0 7px rgba(0, 0, 0, 1));
  }
}

li.nominate .player .overlay .nominate-target {
  opacity: 1;
  transform: scale(1);
  pointer-events: all;
}

/****** Vote icon ********/
.player .has-vote {
  color: #fff;
  filter: drop-shadow(0 0 3px black);
  transition: opacity 250ms;
  z-index: 2;

  /* FT-1294: a `#townsquare.public &` hide stood here, taking the vote mark
     off the seats while the coins were face down. That state is retired. */
}

.has-vote {
  position: absolute;
  margin-top: -15%;
  right: 2px;
}

/* FT-974 — the ghost's own vote, in place of the ballot box.
 *
 * PALETTE: the mark is baked in the seat ghost's exact tone, (198,214,228) —
 * the two are the same spirit, so they are the same material. The ballot box
 * was pure white, and white is this app's UI-CHROME voice (the on-block skull,
 * the name plates, the overlay hands); a white mark on a coin reads as a
 * button somebody stuck on the seat rather than as something belonging to the
 * dead player. Cold and slightly blue reads as MATERIAL.
 *
 * SIZE: 30px rather than the ballot box's 23. The hand's fingers and the two
 * eyes in its palm both survive at 30 and start to mush below it — measured on
 * a nearest-neighbour contact strip at true size, which is also where the
 * five-fingered version was caught reading as a comb.
 *
 * The dark drop-shadow is inherited from `.has-vote` above and is load-bearing
 * here: it is what keeps a pale mark off a pale coin rim.
 *
 * ── FT-991: THE MARK IS REDRAWN IN THE COWL'S IDIOM ─────────────────────────
 * FT-990 replaced the seat ghost with a hooded cowl and left this mark behind,
 * so the two marks on one dead seat were being drawn by two different hands.
 *
 * WHAT WAS ACTUALLY ORPHANED, precisely — it is not that the mark was old, it is
 * that it carried the two specific conventions FT-990 named as the cartoon and
 * removed: a SCALLOPED hem (three identical lobes, which is the Pac-Man tail)
 * and TWO HOLLOW EYES in the palm (a face, where the cowl's whole argument is
 * that a ghost's face should be an ABSENCE). `ui-ghost-vote-cowl.png` swaps
 * exactly those two — a TORN hem, right-to-left and uneven, from the cowl's own
 * bake; and no face at all — and changes nothing else, because everything else
 * about this mark was measured and won.
 *
 * WHICH IS THE WHOLE CONSTRAINT, restated: at 30px a mark gets ONE SILHOUETTE.
 * Three earlier attempts died on it (a raised arm read as a lump, five fingers
 * as a comb, a held token as a speech bubble), so three fingers and a thumb with
 * gaps wide enough to survive the downsample is not a style choice — it is the
 * only shape that has ever worked here.
 *
 * NINE CANDIDATES, JUDGED AT TRUE SIZE ON A REAL SEAT (rigs:
 * claude_temp_test/2026-08-20-ft991b-vote-bake.mjs and -vote-judge.mjs), scored
 * on whether a dead seat still holding a vote reads apart from one that has
 * spent it, six dead seats, three of each:
 *
 *                        sep    vs shipped
 *   shipped ............ 8.43 ...  0.00
 *   THIS (a4) .......... 8.55 ... +0.12
 *   the hooded figure
 *     raising a hand ... 11.55 .. +3.12
 *   the void-hand ...... 8.85 ... +0.42
 *   the same hand with
 *     drapery folds .... 8.33 ... -0.10
 *
 * THE HIGHEST SCORE WAS NOT TAKEN, and for FT-990's own reason — that lane
 * refused the death's-head on exactly this trade. The hooded figure wins by MASS
 * (56.7% ink against this one's 37.9%), and at the real 30px its hood's void
 * resolves into a single round eye: a face, which is the one convention this
 * whole restyle exists to remove. Numbers won, eyes lost.
 *
 * THE TWO REJECTED VARIANTS OF THIS DRAWING are worth recording because both
 * failures are about downsampling rather than taste. Drapery folds down the palm
 * brought the COMB back — three dark vertical strokes read as a continuation of
 * the gaps between the fingers, so the mark grew six fingers. And a VOID in the
 * palm reads as a hole: the cowl's void works because it sits where a FACE would
 * be, in a HEAD, and what carries over from the cowl is the FACELESSNESS, not
 * the void itself.
 *
 * PALETTE UNCHANGED at (198,214,228), and the reasoning is kept rather than
 * re-derived — see above. `ui-ghost-vote.png` stays in the tree, unreferenced,
 * the way `ui-ghost.png`, `shroud.png` and `token.png` already do. */
/* FT-996 (user call, 2026-08-20): the mark IS the cowl now — "move the cowl
 * to be the indicator for the ghost vote." The dead seat itself is moving to a
 * glass veil (FT-997), which frees the cowl to mean exactly one thing: an
 * unspent ghost vote. `ui-ghost-vote-cowl.png` (the hand) joins the unreferenced
 * retirees below. */
.player .has-vote.ghost-vote {
  /* FT-1249: the hand's own corner rule (FT-1073b), verbatim — native side
     left, the mirrored seat keeps the right. The base .has-vote right-anchor
     (the ballot box's) no longer reaches this mark. */
  left: 2px;
  right: auto;
  &.points-right {
    left: auto;
    right: 2px;
  }
  width: 30px;
  height: 30px;
  background: url("../assets/ui-ghost-cowl.png") center center / contain
    no-repeat;
  cursor: pointer;

  // FT-1046: the SPENT state — the cowl stays on the seat, faded, one click
  // from coming back. FT-1046c (user): the mark over it is the app's own X
  // (the workbench-close red), not a drawn strike.
  &.spent {
    opacity: 0.5;
    filter: grayscale(0.6) drop-shadow(0 0 3px black);
  }

  .spent-x {
    position: absolute;
    inset: 0;
    width: 70%;
    height: 70%;
    margin: auto;
    color: rgb(163, 30, 30);
    filter: drop-shadow(0 0 2px black);
  }
}

/* FT-1068 — THE NOMINATE MARK: the cowl slot's living occupant. Same box,
 * same corner, same numbers as `.has-vote` + `.ghost-vote` above, so the two
 * swap cleanly by life state and the slot never moves. Muted at rest — up to
 * twenty of these ring the dial and must not shout — and full strength under
 * the cursor; the dark halo is the same load-bearing drop-shadow that keeps
 * every pale mark off a pale coin rim. Deliberately NOT `.has-vote`: that
 * family goes `opacity: 0` on the public grimoire, and the day phase is
 * exactly when the storyteller needs this.
 *
 * FT-1069 — the mark is the HAND (user: "the nominate icon shouldn't be the
 * noose, it should be the hand"). This button says "this player POINTS at
 * someone", and pointing is the hand's job everywhere in this app; the noose
 * is the gallows' word and now marks the other end of the act — the target
 * pick and the on-the-block seat.
 *
 * FT-1069d — the hand is now the USER'S OWN ART, baked. ui-nominate-hand.svg
 * (a crafted manicule) is retired for ui-nominate-hand.png: the user's
 * supplied pointing-hand silhouette, background-trimmed and run through
 * `stylizeIcon(src, { tint: "neutral" })` — the exact same treatment the
 * app gives an uploaded custom icon (EditionModal.vue's upload handler) —
 * so the mark wears the family's painted/grained material instead of a
 * flat single tone. The box stays THIS div's job (position, size, the
 * load-bearing dark halo, muted-at-rest / full-strength-on-hover) — the
 * bitmap and its point-at-the-face MIRROR live on the `.nominate-mark-art`
 * child below, so the outer hit target and halo never move when the art
 * flips. */
.player .nominate-mark {
  position: absolute;
  margin-top: -15%;
  /* FT-1073b: the box rides the side the hand points FROM — left-pointing
     (native) sits left; the mirrored right-pointer keeps the right. */
  left: 2px;
  &.points-right {
    left: auto;
    right: 2px;
  }
  /* FT-1073b (user: "a bit less subtle"): the mark grows and stands
     brighter at rest — 30px/0.35 read as a smudge on the ring. */
  width: 36px;
  height: 36px;
  cursor: pointer;
  z-index: 2;
  opacity: 0.62;
  filter: drop-shadow(0 0 3px black);
  transition: opacity 250ms;

  &:hover {
    opacity: 1;
  }
}

/* FT-1069d — the art layer, separated from `.nominate-mark` above purely so
 * the point-at-the-face mirror (`scaleX(-1)`, applied by Player.vue's
 * `nominateMarkMirrored` computed) only ever flips the bitmap, never the
 * box/halo it sits inside. The art's native direction is LEFT (the user's
 * supplied hand points left); seats on the ring's right half keep that
 * (native, no class); seats on the left half plus the 12 and 6 o'clock
 * seats get `.mirrored`. */
.player .nominate-mark-art {
  position: absolute;
  inset: 0;
  background: url("../assets/ui-nominate-hand.png") center center / contain
    no-repeat;

  &.mirrored {
    transform: scaleX(-1);
  }
}

/* FT-1271 — THE WHISPER MARK: the nominate corner's PLAYER-side occupant.
 * Deliberately the hand's own numbers (`margin-top: -15%`, the 2px side
 * anchor, the same `points-right` flip, the same muted-at-rest / bright-under-
 * the-cursor opacity and the same load-bearing dark halo) — the two marks are
 * one slot worn by two viewers, and a second set of numbers is how they would
 * come to sit differently on the same coin.
 *
 * NOT `.has-vote`, for the reason FT-1206's whisper disc gives: `.has-vote`
 * goes dark and pointer-dead on the public grimoire, and whispering is the one
 * seat act a player owns — it must survive every view they live in.
 *
 * The glyph is comment-dots, the seat vocabulary's own Whisper mark (FT-1211),
 * so the corner, the plate row, the ring coin and the nameplate disc all open
 * a message with the same word. It is a FONT glyph rather than a baked bitmap
 * like its sibling, so the box sizes the icon rather than a background.
 *
 * `.stacked` is the dead seat: the cowl holds the corner, so the mark drops one
 * cowl-height (30px) plus a hair of air below it, keeping the column.
 */
.player .whisper-mark {
  position: absolute;
  margin-top: -15%;
  left: 2px;
  &.points-right {
    left: auto;
    right: 2px;
  }
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* FT-1285 (user): “whisper icon needs the same treatment as the chair.”
   * The chair badge’s finding applies here unchanged — white ink beside a
   * lit name plate reads as a lit object no matter how far the opacity comes
   * down, so the quiet has to live in the INK. #9a9285 is the strip marks’
   * own average tone (see `.player .seat`, FT-1283), which is what makes
   * these two marks read as the same furniture rather than two brightnesses.
   *
   * This one keeps its hover, and gains the ink half of it: the chair had to
   * go without because its claim animation’s `forwards` fill outranks a
   * plain hover declaration. Nothing animates this mark, so it can brighten
   * the way the strip marks do — to the app’s bone, the same colour the
   * chair’s own actor hover uses. */
  color: #9a9285;
  font-size: 22px;
  cursor: pointer;
  z-index: 2;
  opacity: 0.75;
  filter: drop-shadow(0 0 3px black);
  transition:
    opacity 250ms,
    color 250ms;

  &:hover {
    color: #d8cdb4;
    opacity: 1;
  }

  &.stacked {
    margin-top: calc(-15% + 34px);
  }
}

/****** Session seat glow *****/
// WHICH SEAT IS YOURS — a soft breath of light around your own coin.
//
// TWO USER CALLS, 2026-08-20. It used to animate `border-color` as well as a
// shadow, and the border it lit was a SQUARE: the token is a square box
// carrying round coin art, so a hard edge on that box draws a rectangle around
// a circle. "A hard border should never be a part of the pulse sequence — just
// do a very soft shadow pulse."
//
// So the border is out of the sequence entirely and only the shadow breathes,
// between a close halo and a wide one. A box-shadow follows its element's own
// border-radius, so rounding the box is what makes the light circular — the
// art inside is already round, so nothing of it is clipped by the change.
//
// It BREATHES rather than pulsing out and vanishing: the old keyframes ended
// at `transparent`, which reads as a repeating ping. A seat marker should say
// "this one is yours" continuously, not announce itself every five seconds.
// NO `border-radius` HERE, and the reason is written a file away: Token.vue's
// own comment records that `border-radius: 50%` CUT EVERY TOOTH crossing the
// inscribed circle, reported by the user on 2026-08-18 as "the coins look
// clipped". I reintroduced exactly that bug rounding this box for the halo,
// and the user reported it again the same way. The art carries its own edge.
//
// `filter: drop-shadow` instead of `box-shadow`, which is the better answer
// anyway: a box-shadow traces the ELEMENT'S BOX, so making it round needed the
// clip that broke the coin. A drop-shadow traces the ART'S OWN ALPHA — so the
// light follows the toothed wheel exactly, teeth and all, and no shape has to
// be imposed on the box at all.
@mixin glow($name, $color) {
  @keyframes #{$name}-glow {
    0%,
    100% {
      filter: drop-shadow(0 0 4px rgba($color, 0.55));
    }
    50% {
      filter: drop-shadow(0 0 11px rgba($color, 0.95));
    }
  }

  // FT-1080: `> .belief-dock` rides along because the chip used to sit inside
  // `.token` and shared this glow's silhouette; docked beside the coin it has
  // to be named to keep the same look.
  .player.you.#{$name} .token,
  .player.you.#{$name} > .belief-dock {
    animation: #{$name}-glow 5s ease-in-out infinite;
  }
}

@include glow("townsfolk", $townsfolk);
@include glow("outsider", $outsider);
@include glow("demon", $demon);
@include glow("minion", $minion);
@include glow("traveler", $traveler);

// the fallback for a seat with no team yet. NO `border-radius` here either —
// this is the rule that was still clipping the teeth after the mixin above
// dropped its own.
.player.you .token,
.player.you > .belief-dock {
  animation: townsfolk-glow 5s ease-in-out infinite;
}

/****** Marked icon ******/
/* FT-1069 — ON THE BLOCK WEARS THE NOOSE, with the vote tally in its loop
 * (user: "in the middle of the noose it should say how many votes they
 * got"). The skull's rules stay for the flagged-off glyph.
 *
 * THE TALLY SITS IN THE LOOP, NOT THE CENTER OF THE BOX: ui-noose's loop is
 * a circle centered at (256, 352) of a 512 viewBox — x 50%, y 68.75% of the
 * art — with an inner hole 34% of the art wide (see ui-noose.svg's
 * geometry). The plate is a dark disc filling that hole, so the number reads
 * against its own ground instead of against whatever coin art the hole
 * happens to frame.
 *
 * OPACITY 0.85, not the skull's 0.5: the skull was a pure silhouette and
 * could afford to whisper; a number half-dissolved into a coin face cannot
 * be read at seat size, and the count is the point of the mark. */
.player .marked {
  position: absolute;
  width: 100%;
  top: 0;
  filter: drop-shadow(0px 0px 6px black);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 250ms;
  opacity: 0;
  &:before {
    content: " ";
    padding-top: 100%;
    display: block;
  }
  svg {
    height: 60%;
    width: 60%;
    position: absolute;
    stroke: white;
    stroke-width: 15px;
    path {
      fill: white;
    }
  }
  .marked-noose {
    position: absolute;
    width: 60%;
    height: 60%;
    /* Stone pass (user call 2026-08-28): same silhouette, same material as
       the strip marks — the PNG becomes a mask painted FT-1283's ink. */
    background-color: #9a9285;
    mask: url("../assets/ui-noose.png") center / contain no-repeat;
    -webkit-mask: url("../assets/ui-noose.png") center / contain no-repeat;
  }
  .tally {
    position: absolute;
    left: 50%;
    top: 68.75%;
    transform: translate(-50%, -50%);
    min-width: 22px;
    height: 22px;
    line-height: 22px;
    padding: 0 4px;
    box-sizing: border-box;
    border-radius: 11px;
    background: rgba(0, 0, 0, 0.65);
    color: white;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
  }
}
.player.marked .marked {
  opacity: 0.85;
}
/* FT-1314: a tie-crossed chair keeps its noose visible too — same weight as
 * a real mark, because the pair standing crossed IS the state being shown. */
.player.tied .marked {
  opacity: 0.85;
}
/* FT-1314: the cancelling bar — the vote card's own `is-struck` grammar
 * (Vote.vue's noose), redrawn at seat size: the blood bar over a dark
 * keyline, so it reads on the rope and on the coin behind it alike. Drawn
 * on `.marked` (the full-seat box), NOT on `.marked-noose` — that element
 * is a masked silhouette, and a pseudo-element inside it would be clipped
 * to the rope's own pixels. Sized against the noose's 60% footprint. */
.player.tied .marked:after {
  content: "";
  position: absolute;
  left: 18%;
  right: 18%;
  top: 50%;
  height: 5%;
  transform: translateY(-50%) rotate(-32deg);
  border-radius: 4px;
  background: $demon;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.8),
    0 0 4px rgba(0, 0, 0, 0.7);
}

/* FT-1075 rider — the running nomination worn on the two coins involved.
 * `.marked`'s anatomy exactly (that mark is this one's precedent): a full-
 * seat box squared by its own padding, art centered by flex, the same
 * load-bearing dark halo, pointer-events none so no click under it is lost.
 * The art sits at 62% of the coin — big enough to read as "this seat is the
 * accuser / this seat is on the block" at seat size, small enough that whose
 * coin it is stays legible around it. No opacity gate: unlike `.marked`
 * (whose visibility is a class toggle), this box only exists while
 * `voteRole` says the seat is involved, so it simply renders at strength. */
.player .vote-role {
  position: absolute;
  width: 100%;
  top: 0;
  filter: drop-shadow(0px 0px 6px black);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &:before {
    content: " ";
    padding-top: 100%;
    display: block;
  }

  .vote-role-art {
    position: absolute;
    width: 62%;
    height: 62%;
    opacity: 0.85;
  }
  /* the accuse hand — the user's own art, the nominate mark's exact bitmap;
   * same native-left direction, same point-at-the-face mirror rule */
  .vote-role-hand {
    background: url("../assets/ui-nominate-hand.png") center center / contain
      no-repeat;

    &.mirrored {
      transform: scaleX(-1);
    }
  }
  .vote-role-noose {
    background: url("../assets/ui-noose.png") center center / contain no-repeat;
  }
}

/****** Seat icon ********/
.player .seat {
  position: absolute;
  left: 2px;
  /* FT-1073c: opposite the hand — see the template note.
   * FT-1271 (user): "lets make the chair also face the clock so right side
   * coins need to flip it". The chair now obeys the same point-at-the-face
   * rule the nominate hand and the accuser's coin mark already obey, and it
   * needs no new fact to do it: `chair-right` is bound to
   * `!nominateMarkMirrored`, which IS "this seat is on the ring's right half".
   *
   * WHICH WAY IS NATIVE. ui-seat.png was a side-view chair with its back on
   * the left and its seat running right — it faced RIGHT, the opposite native
   * direction to the hand's. So the flip landed on the opposite group: a
   * right-half seat (centre of the clock is to its LEFT) is the one that must
   * mirror, and a left-half seat keeps the art as drawn. One class, already
   * bound, already on the right seats.
   *
   * FT-1317: the art is FRONT-FACING now (ui-seat-front.svg — the side view
   * read as a letter H at small sizes) and symmetric, so the scaleX flip is
   * a visual no-op. It stays because `chair-right` still does its FIRST job
   * — picking the corner opposite the hand — and because the flip costs
   * nothing and would matter again the day the art grows a facing.
   *
   * THE TRANSFORM GOES ON THE ::before, not here, and the reason is the same
   * one FT-1244 gives for putting the mask there: filters apply BEFORE
   * transforms on a single element, so flipping the span would hand the
   * drop-shadow an unflipped shape to trace. Flipping the pseudo lets the
   * parent's filter see the already-mirrored chair. */
  &.chair-right {
    left: auto;
    right: 2px;
    &::before {
      transform: scaleX(-1);
    }
  }
  margin-top: -15%;
  /* FT-1283 (user): “the chairs still need to be more subtle, maybe give
   * them the same treatment as most of these icons got?” — the strip's
   * marks are baked stone-grey art, and their quiet lives in the ART, not in
   * a filter. This badge is a MASK painted with `currentColor`, and that ink
   * was pure white, so no amount of opacity could stop it reading as a lit
   * white shape rather than a piece of the app's furniture.
   *
   * The ink is the fix: #9a9285 is the strip marks' own average tone (the
   * measured mean of ui-chat.png's opaque pixels, rgb 154/146/133), so the
   * chair is now made of the same material as every mark beside it. The
   * opacity goes UP as the ink comes down — stone at 0.75 sits quieter than
   * white at 0.55 while keeping enough body to read as a shape at all.
   *
   * Every ink state still rides `color` untouched: `.player.you`'s townsfolk
   * blue, `.actor`'s bone hover (which now genuinely BRIGHTENS, the same
   * gesture the strip marks make), and the claim flash's red.
   *
   * FT-1323 round 3: the RESTING ink alone reads the lab's tone dial — the
   * `.you`/`.actor`/flash states below keep their own semantic colors
   * untouched, since those are identity/action signals, not the stone-vs-
   * white texture the dial governs. */
  color: var(--chair-ink, #9a9285);
  /* FT-1271 (user): "and lets make it more subtle" — the badge read as bright
   * white beside the name plate. The quiet is spent on OPACITY rather than on
   * the ink, deliberately: every ink state this badge has is load-bearing and
   * still has to be told apart — `.player.you`'s townsfolk blue, `.actor`'s
   * bone hover, and the claim flash's own red. Dimming the whole element keeps
   * all three exactly as they were, one step back. 0.55 is a touch below the
   * nominate mark's 0.62 because this badge is a solid shape sitting right
   * beside the lit name plate, where the hand sits alone on a coin rim.
   *
   * No hover brighten, and that is a decision rather than an omission: the
   * claim flash below runs `forwards`, and an animation's fill outranks a
   * plain `:hover` declaration — an opacity hover would work on a chair that
   * had never flashed and silently do nothing on every seat in a dealt town.
   * One behaviour on every seat beats two. */
  opacity: 0.75;
  filter: drop-shadow(0 0 3px black);
  cursor: default;
  z-index: 2;
  /* FT-1244: the badge is the chair art worn as a mask (ui-seat-front.svg
   * since FT-1317) — the ::before paints
   * `background-color: currentColor` THROUGH the art's alpha, so the states
   * below (and `.player.you .seat`) keep setting `color` and the chair
   * changes colour, animation included. The mask lives on the pseudo, not
   * the span, because filters apply BEFORE masks on one element — the
   * drop-shadow above needs to see the already-masked chair shape, which it
   * does from the parent. Box matches the FA glyph it replaces (1em tall). */
  width: 1em;
  height: 1em;
  &::before {
    content: "";
    display: block;
    width: 100%;
    height: 100%;
    background-color: currentColor;
    /* FT-1323/FT-1350: the chair lab's opacity dial (1 = today's look). */
    opacity: var(--chair-opacity, 1);
    /* FT-1337: the chair lab's root var, incumbent as fallback. */
    -webkit-mask-image: var(--chair, url("../assets/ui-seat-front.svg"));
    mask-image: var(--chair, url("../assets/ui-seat-front.svg"));
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }
  &.highlight {
    animation-iteration-count: 1;
    animation: redToWhite 1s normal forwards;
  }
  /* FT-1070: when the chair is an actor (host eject / own stand-up) it says
   * so under the cursor — the claim overlay's own bone ink, the app's
   * "chair as furniture you may act on" voice, not a second color. */
  &.actor {
    cursor: pointer;
    transition: color 200ms;
    &:hover {
      color: #d8cdb4;
    }
  }
}

// highlight animation
// FT-1271: the flash keeps its full strength and SETTLES INTO the badge's new
// resting quiet — the claim is an event and still reads as one, and because
// the animation's `forwards` fill holds its last frame, that last frame has to
// BE the resting value or every dealt town would sit at a different opacity
// from an undealt one. The ink half of the flash is untouched.
@keyframes redToWhite {
  from {
    color: $demon;
    opacity: 1;
  }
  to {
    /* FT-1283: the flash still settles INTO the resting state, which is now
     * stone rather than white — `forwards` holds this last frame, so it has
     * to BE the resting pair or a dealt town would sit brighter than an
     * undealt one. */
    color: #9a9285;
    opacity: 0.75;
  }
}

.player.you .seat {
  color: $townsfolk;
}

/***** Player name *****/
.player > .name {
  right: 10%;
  display: flex;
  justify-content: center;
  font-size: 120%;
  line-height: 120%;
  cursor: pointer;
  white-space: nowrap;
  width: 120%;
  background: rgba(0, 0, 0, 0.5);
  border: 3px solid black;
  border-radius: 10px;
  top: 5px;
  box-shadow: 0 0 5px black;
  padding: 0 4px;

  /* The name plate is the seat MENU — move player, swap seats, empty the
     chair, nominate, claim — and it draws about 21px tall: fine to read, thin
     to hit. It grows, but only so far: the ring is tight on a phone and a
     plate tall enough for a 44px rule would collide with its neighbours'. */
  @media (pointer: coarse) {
    padding: 5px 4px;
  }

  svg {
    top: 3px;
    margin-right: 2px;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    flex-grow: 1;
  }

  #townsquare:not(.spectator) &:hover,
  &.active {
    color: red;
  }

  &:hover .pronouns {
    opacity: 1;
    color: white;
  }

  .pronouns {
    display: flex;
    position: absolute;
    right: 110%;
    max-width: 250px;
    z-index: 25;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    border: 3px solid black;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
    align-items: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity 200ms ease-in-out;
    padding: 0 4px;
    bottom: -3px;

    &:before {
      content: " ";
      border: 10px solid transparent;
      width: 0;
      height: 0;
      border-left-color: black;
      position: absolute;
      margin-left: 2px;
      left: 100%;
    }
  }
}

.player.dead > .name {
  opacity: 0.5;
}

/***** Player menu *****/
.player > .menu {
  position: absolute;
  left: 110%;
  bottom: -5px;
  text-align: left;
  white-space: nowrap;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 5px;
  border-radius: 10px;
  border: 3px solid #000;
  margin-left: 15px;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);

  &:before {
    content: " ";
    width: 0;
    height: 0;
    position: absolute;
    border: 10px solid transparent;
    border-right-color: black;
    right: 100%;
    bottom: 5px;
    margin-right: 2px;
  }

  li:hover {
    color: red;
  }

  /* The add-reminder row stands in for the ring's plus disc, which only ever
     goes missing on a coarse pointer. A mouse still has the disc on the seat,
     so this row would be a second way to the same modal and a fifth line in
     every desktop menu — the ring there is untouched, and so is this. */
  li.rem-act {
    display: none;
    @media (pointer: coarse) {
      display: flex;
    }
  }

  /* the in-place edit row — the field this seat's rename/pronouns ask in,
     in place of the browser dialog they used to open */
  li.seat-edit {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: default;
    &:hover {
      color: white;
    }

    input {
      flex: 1;
      min-width: 0;
      width: 7em;
      color: white;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid #3d3d3d;
      border-radius: 4px;
      padding: 1px 6px;
      font-size: inherit;
      font-family: inherit;
      &:focus {
        outline: none;
        border-color: #a01414;
      }
    }

    .se-go,
    .se-no {
      cursor: pointer;
      opacity: 0.75;
      &:hover {
        opacity: 1;
        color: red;
      }
    }
  }

  /* the character's two entries read as one pair, above the player's */
  li.char-act {
    &.on {
      color: #ff8a8a;
    }
    & + li:not(.char-act) {
      border-top: 1px solid rgba(255, 255, 255, 0.14);
      margin-top: 3px;
      padding-top: 3px;
    }
  }

  li.disabled {
    cursor: not-allowed;
    opacity: 0.5;
    &:hover {
      color: white;
    }
  }

  /* A MENU ROW WAS 14px TALL on a phone (measured 375x812) — the thinnest
     target in the app, and it holds the seat's whole vocabulary. 40px is the
     size the fork's other coarse-pointer controls take (the phase button, the
     build actions), so the rows match them rather than inventing a third. */
  @media (pointer: coarse) {
    padding: 4px 8px;
    // A quarter-transparent plate was fine over four thin rows; at six
    // finger-sized ones it stands across the clock face and the filigree read
    // straight through the words. Opaque enough to be a plate.
    background: rgba(0, 0, 0, 0.92);
    li {
      display: flex;
      align-items: center;
      gap: 6px;
      min-height: 40px;
    }
  }

  /* A LANDSCAPE PHONE is 375px tall and the menu wants 257 of them, so a
     chair near the horizon could not hold it whichever way it hung. Half the
     window is the room every chair is guaranteed (TownSquare flips the top
     half's menus to open downward for exactly this); the menu takes that and
     scrolls for the rest. Portrait never reaches the cap. */
  @media (pointer: coarse) and (max-height: 500px) {
    max-height: 45vh;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  svg {
    margin-right: 2px;
  }

  /* FT-1242: the rows' baked marks — sized to sit where the FA glyphs sat,
     lifted the same way SeatMenu's .sm-img is (the menu grounds match). */
  img.pm-mark {
    width: 1.15em;
    height: 1.15em;
    object-fit: contain;
    vertical-align: -0.2em;
    margin-right: 2px;
    filter: brightness(1.3) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
  }
  /* FT-1337: the chair rows wear the lab's var(--chair) as a masked span —
     same box and inks as the img rule above; mask on the ::before so the
     drop-shadow traces the masked shape (FT-1244 reasoning). */
  span.pm-mark.chair-mark {
    display: inline-block;
    /* FT-1323 round 3: the lab's "Seat menu" size dial, 1.0 = this same
       1.15em box. */
    width: calc(1.15em * var(--chair-size-menu, 1));
    height: calc(1.15em * var(--chair-size-menu, 1));
    vertical-align: -0.2em;
    margin-right: 2px;
    filter: brightness(1.3) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
    &::before {
      content: "";
      display: block;
      width: 100%;
      height: 100%;
      /* FT-1323 round 3: the lab's tone dial, unset until touched so this
         keeps its own bone ink (#cfc4ae) on a fresh session. */
      background-color: var(--chair-ink, #cfc4ae);
      /* FT-1323/FT-1350: the chair lab's opacity dial (1 = today's look). */
      opacity: var(--chair-opacity, 1);
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
}

/***** Ability text *****/
/* FT-1294: `#townsquare.public .circle .ability { display: none }` stood here.
   The ability text is the character's own, so it can only ever appear on a
   coin whose character this client actually holds — the face-down state was
   never what kept it off a player's ring, and it is retired. */
.circle .player .shroud:hover ~ .token .ability,
.circle .player .token:hover .ability {
  opacity: 1;
}

/**** Night reminders ****/
.player .night-order {
  z-index: 3;
}

.player.dead .night-order em {
  color: #ddd;
  background: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, gray 100%);
}

/***** Reminder token *****/
.circle .reminder {
  // FT-940 (user call: "for these can we use the player coin as the
  // background as well?"): the reminder wears the SAME ground the character
  // coin wears — Token.vue's `.token` reads `var(--coin, url(token-golem.png))`,
  // painted onto the document root by golem/coinArt.js's applyCoin() (so
  // picking a different coin in the debug picker repaints every reminder
  // too, not just the seats); this is that property, not a second file that
  // merely looks similar. reminder-golem.png stays in the tree, unreferenced,
  // the same way every retired coin asset already does.
  background: var(--coin, url("../assets/token-golem.png")) center center;
  background-size: 100%;
  width: 50%;
  height: 0;
  padding-bottom: 50%;
  box-sizing: content-box;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 5px 0 0 -25%;
  border-radius: 50%;
  border: 3px solid black;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  transition: all 200ms;
  cursor: pointer;
  // FT-1117: a token is dragged from chair to chair now, and a mousedown that
  // starts by selecting its label is a mousedown the drag has to fight for.
  // Nothing here was ever meant to be selectable text.
  user-select: none;
  -webkit-user-select: none;

  .text {
    line-height: 90%;
    color: black;
    font-size: 50%;
    font-weight: bold;
    text-align: center;
    margin-top: 50%;
    height: 100%;
    width: 100%;
    position: absolute;
    top: 15%;
    /* FT-1183: THE LABEL IS NOT A HIT TARGET, and it was never meant to be
       one. This box is a full token-DIAMETER square pushed down by 65% of a
       diameter (`top: 15%` + `margin-top: 50%`), so two thirds of it hangs
       BELOW the token it labels, invisible and — until this line — live:
       measured with the fan already clearing the plate geometrically,
       `elementFromPoint` at plate and coin points still came back as
       `span.text` 234 times across 5/8/12/20 seats in both viewports, on this
       seat's own plate and on neighbouring coins alike. Same shape of bug as
       the hidden plus disc FT-1180 stood down, and the same one-line answer:
       the token itself carries the click, the drag and the hover, so nothing
       is lost by the label declining to. The token's own box is a circle
       (`border-radius: 50%`), which is exactly the ground it should claim. */
    pointer-events: none;
    text-shadow: 0 1px 1px #f6dfbd, 0 -1px 1px #f6dfbd, 1px 0 1px #f6dfbd,
      -1px 0 1px #f6dfbd;
  }

  .icon,
  &:after {
    content: " ";
    position: absolute;
    top: 0;
    width: 90%;
    height: 90%;
    background-size: 100%;
    background-position: center 0;
    background-repeat: no-repeat;
    /* User mandate 2026-08-30 (FT-1338 correction): the upstream sticker
       PLUS never stands for a reminder again — the bone note sheet is the
       base face (placed reminders paint their own art inline over it). */
    background-image: url("../assets/ui-note.png");
    transition: opacity 200ms;
  }

  &:after {
    background-image: url("../assets/icons/x.png");
    opacity: 0;
    top: 5%;
  }

  &.add {
    // FT-911: no default `top` here any more — the disc's actual position
    // (beside the name plate) is measured per-seat in JS (measureAddAnchor)
    // and applied as an inline style; opacity alone keeps it hidden until
    // that lands and until a name-plate hover reveals it.
    opacity: 0;
    // FT-1180: …AND OPACITY ALONE WAS NOT ENOUGH. An invisible box still
    // takes the pointer, and this one is a full seat-width disc parked beside
    // a name plate — on a crowded ring it lands on the NEXT SEAT'S COIN.
    // Measured on a 20-seat town at 1280x800: `elementFromPoint` at the dead
    // centre of seats 3 and 17's coins came back as a neighbour's hidden plus
    // disc, so those two coins answered no pointer at all. It cost the hover
    // scheme its ring on two chairs in twenty, and it has been costing the
    // role hover card the same two chairs since FT-911. The revealed state
    // hands it back, just below.
    pointer-events: none;
    &:after {
      display: none;
    }
    .icon {
      top: 5%;
      /* FT-1212 (user: "instead of a plus lets do a note icon, and use that
         for the hover reminder as well"): the stock sticker plus stands down
         for ui-note.png — the same note sheet the seat vocabulary's "Add
         reminder" row now wears (golem/seatActions), so the two surfaces
         that mean "put a note on this seat" carry one mark. The base
         `.icon` rule above wears the note sheet too since the 2026-08-30
         user mandate (plus.png never faces a reminder); placed reminders
         paint their own art inline over it either way.

         FT-1219 (user, with shot: "give the pin icon the same treatment as
         the other icons… maybe make it slightly tinted purple? so it doesn't
         look so out of place on the player coin"): the BONE pin sat flat and
         pale on the bronze — every other mark that lives on a coin ground
         (the role glyphs, upstream's sticker plus) is a painted object:
         saturated colour, a dark keyline closing the silhouette, gloss.
         ui-note-coin.png is the SAME pin geometry (baked from ui-note.png's
         own alpha, so the FT-1217 silhouette cannot drift) dressed that way,
         in the fork's pick-ink purple (#a78fcd as the mid tone). Two assets
         on purpose: the plate rows are a bone-mark FAMILY on dark plum
         ground — a lone glossy purple row mark would break that family, so
         the seat menu's "Add reminder" row keeps the bone sheet and only
         the coin surfaces wear this. The drop-shadow stays for footing —
         the keyline is baked, the shadow seats it on the metal. */
      background-image: url("../assets/ui-note-coin.png");
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.85));
    }
  }

  &.custom {
    .icon {
      display: none;
    }
    .text {
      font-size: 70%;
      word-break: break-word;
      margin-top: 0;
      display: flex;
      align-items: center;
      align-content: center;
      justify-content: center;
      border-radius: 50%;
      top: 0;
    }
  }

  &:hover:before {
    opacity: 0;
  }
  &:hover:after {
    opacity: 1;
  }
}

.circle .reminderHoverTarget {
  opacity: 0;
  width: calc(50% + 8px);
  padding-top: calc(50% + 38px);
  margin-top: calc(-25% - 33px);
  margin-left: calc(-25% - 1px);
  border-radius: 0 0 999px 999px;
  pointer-events: auto;
  transform: none !important;
  z-index: -1;
}

/* THE NAME PLATE REVEALS IT, not the coin (user call 2026-08-19, raised three
   times — the card moved to the plate and this did not, which is the same
   mistake made twice on two different elements).

   The division is the one already drawn for the ability card: the COIN is what
   a storyteller does things to — drags onto, clicks, shrouds — and anything
   that appears under the cursor there is in the way of all of it. The PLATE is
   the part of a seat you only ever read, so it is where a seat's affordances
   answer from.

   Driven by a class rather than `:hover`, because the plate lives inside
   `.player` while the disc, until FT-911, was `.player`'s SIBLING — a hover
   selector could not reach across that, and `:has()` would leave the
   behaviour resting on a selector this fork does not use anywhere else.
   FT-911 moved the disc to be `.name`'s own sibling instead (see the
   template and measureAddAnchor), but this stays class-driven rather than
   switching to `:hover` — `.name`'s own hover already drives `nameHover`
   for the ability card (showCard/hideCard) via JS, and a second, divergent
   reveal mechanism for one sibling would be its own source of drift. */
.circle li.name-hover .reminder.add {
  opacity: 1;
  // FT-1180: the disc is visible again, so it takes its own clicks and its
  // own hover again (the pair that keeps `nameHover` alive once the cursor
  // has crossed the bridge onto it). See the `pointer-events: none` above for
  // what the hidden state was doing to its neighbours.
  pointer-events: auto;
}
.circle li.name-hover .reminder.add:before {
  opacity: 1;
}

/* ── FT-1206: THE WHISPER DISC — the click scheme's seat whisper ─────────────
   Beside the add-reminder disc on the plate's hover surface, one disc further
   out (whisperDiscStyle steps the same measured anchor). Deliberately NOT a
   `.reminder`: the reminders go dark when the grimoire faces the room, and
   whispering is the one seat act a PLAYER owns — see the template note. The
   face is the seat-ring little coin's own recipe (SeatRing's sr-coin: dark
   ground, plum edge, bronze thread), so the town's two smallest round
   controls read as one family. */
#townsquare .circle li .whisper-disc {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  color: #f4eeff;
  background: radial-gradient(
    circle at 50% 34%,
    rgba(58, 44, 74, 0.97) 0%,
    rgba(24, 18, 32, 0.97) 72%,
    rgba(12, 9, 16, 0.98) 100%
  );
  border: 2px solid #4b3565;
  box-shadow:
    inset 0 1px 2px rgba(250, 246, 255, 0.28),
    inset 0 -2px 3px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(150, 120, 60, 0.3),
    0 2px 6px rgba(0, 0, 0, 0.66);
  /* hidden until the plate's hover reveals it — the add disc's own gate,
     pointer-events included (an invisible disc must not eat a neighbour's
     clicks; FT-1180 measured what that costs) */
  opacity: 0;
  pointer-events: none;
  transition:
    color 90ms ease,
    border-color 90ms ease;

  svg {
    width: 45%;
    height: 45%;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.8));
  }

  &:hover {
    color: #fff;
    border-color: #a78fcd;
  }

  /* refused, not absent — dim, reason on the tooltip, click swallowed */
  &.refused {
    cursor: not-allowed;
    opacity: 0.42;
    &:hover {
      color: #f4eeff;
      border-color: #4b3565;
    }
  }
}
/* the id rides the reveal too — the base rule above carries #townsquare, and
   a reveal without it loses the specificity race and never fires (measured:
   the rig's disc stayed at opacity 0 with .name-hover ON the li) */
#townsquare .circle li.name-hover .whisper-disc {
  opacity: 1;
  pointer-events: auto;
  /* the refused disc is revealed too — dimmer, so the two states read */
  &.refused {
    opacity: 0.42;
  }
}
/* a finger never hovers: pinned open, the add disc's own answer in
   media.scss for the same gesture gap */
@media (hover: none) {
  #townsquare .circle li .whisper-disc {
    opacity: 1;
    pointer-events: auto;
  }
}

/* the whisper disc's corridor-keeper — invisible, no z-index of its own, so
   the two discs (z 3) keep every pixel they paint; a coarse pointer never
   hovers, so there is no corridor to keep there (the name-bridge's own rule) */
#townsquare .circle li .whisper-bridge {
  @media (pointer: coarse) {
    display: none;
  }
}

/* ── REMINDERS ON A COARSE POINTER ──────────────────────────────────────────
   `.reminder.add` (the hover-revealed plus disc) is untouched below — this
   section is about the ADD affordance only. Placed reminders (the tokens a
   player actually puts on a seat) moved to their own section further down
   (FT-869) after this coarse-only fix turned out not to be the fix at all:
   it only ever touched the plus discs, and the pile the user kept reporting
   was the PLACED tokens, which this pointer-gated rule never reached. */

/* THE PLUS LEAVES THE RING. `(hover: none)` in media.scss pinned all eight
   of them open — the only alternative that stylesheet had, since a hover
   reveal is unreachable with a finger. The seat menu carries it now
   (`.rem-act`), so nothing is lost and the hub clears. The id keeps this
   above media.scss's own `.circle li .reminder.add`. */
#townsquare .circle li .reminder.add {
  @media (pointer: coarse) {
    display: none;
  }

  /* FT-911: BESIDE THE PLATE, not on the ring. The old anchor here —
     `margin-top: 68%; margin-left: calc(...)` — drifted the disc down onto
     the coin's own rim, the "note button in the wrong place" the user kept
     re-raising (fourth time, two of the earlier fixes moved a different
     element entirely). `position: absolute` is still needed here (the base
     `.circle .reminder` rule doesn't set it), but top/left/width/height are
     no longer percentage-of-seat math — they come from `measureAddAnchor`'s
     inline style (see the template's `addAnchorStyle` binding), sized to
     the plate's own rendered height and docked left or right of it by the
     seat's own outward vector. */
  position: absolute;
  z-index: 3;
}

/* ── FT-1319: THE PIN AT REST ────────────────────────────────────────────────
   `pin-rest` (the "Always" setting — the default) stands the disc up without
   waiting for the plate's hover. The resting register is the FT-1283 stone
   treatment said for a painted disc: the chair badge got quiet by trading its
   white ink for the strip marks' own stone (#9a9285), and this disc is baked
   art rather than a mask, so the same quiet is spent as desaturation +
   opacity — the glossy purple pin greys toward the furniture around it and
   keeps just enough body to read as a dock. The plate's hover (the FT-923
   `li.name-hover` reveal, which also covers the disc's own hover via its
   mouseenter pair) brings the full paint back — the same brighten-on-hover
   gesture the strip marks and the chair badge make.

   The id-weighted selector is deliberate: the resting state has to outrank
   both the base `.add` (opacity 0, pointer-events none) and the unhovered
   frame of `.circle li.name-hover .reminder.add`, so the hover pair below
   restates the lit values at the same weight. Coarse pointers are untouched
   — the `display: none` above already retired the disc there (the seat
   menu's row carries the act), and "always" must not resurrect the FT-1180
   hub pile-up this rule exists to prevent. */
#townsquare .circle li .reminder.add.pin-rest {
  opacity: 0.55;
  pointer-events: auto;
  filter: grayscale(0.65) brightness(0.9);
  transition:
    opacity 200ms,
    filter 200ms;
}
#townsquare .circle li.name-hover .reminder.add.pin-rest,
#townsquare .circle li .reminder.add.pin-rest:hover {
  opacity: 1;
  filter: none;
}

/* FT-923: the bridge is hidden wherever the disc it serves is hidden — a
   coarse pointer never hovers anything, so there is no dead-ground bug to
   bridge there, and it would otherwise sit as a dead, invisible tap target
   in the gap the disc no longer occupies. (Its own `position: absolute` and
   geometry come from `addBridgeStyle`, the same inline-style pattern the
   disc above already uses — nothing else here needs setting.) */
#townsquare .circle li .name-bridge {
  @media (pointer: coarse) {
    display: none;
  }
}

/* ── PLACED REMINDERS FAN FROM THEIR OWN SEAT (FT-869) ──────────────────────
   A reminder used to render as a normal-flow sibling stacked BELOW the seat
   token inside the seat's own `li` — and that `li` IS the spoke from the
   seat to the ring's centre (TownSquare.vue's on-circle mixin: the li's
   height is the ring's radius, `transform-origin: 0 100%` pins its bottom to
   the hub). "Below the seat" is therefore "toward the hub" by construction,
   on EVERY pointer — the coarse-only fix above only ever caught the plus
   discs; the tokens people actually place were still walking to the centre
   (measured 1440x900, mouse: six placed chips already sitting on the hub —
   a bigger screen just gave them further to fall before it showed).

   The fix pins a reminder's radius to roughly where its own seat already
   sits — hugging the coin's own lower rim — and fans left/right instead of
   growing down. Sideways is the direction this ring actually has room in:
   neighbouring seats sit 60-235px apart centre-to-centre across 8-15 seats
   at 375-1280px wide (FT-869 rig), while the room PAST a seat's own rim is
   as little as 20px on desktop — too tight to grow a stack outward instead,
   which is why this pins the radius rather than pushing further out.

   Every offset is a PERCENT OF THE SEAT'S OWN WIDTH, via `margin`, not
   `top`/`left`. `top`/`left` percentages on an absolutely-positioned element
   resolve against the containing block's HEIGHT for `top` — here the li's
   height, which is the ring's RADIUS and swings wildly by seat count.
   Margin percentages resolve against the containing block's WIDTH on every
   side, `margin-top` included — the li's width is the SEAT's own width, so
   this scales with the coin regardless of how many seats are in the ring.

   `--ri` (this reminder's index) and `--rn` (this seat's reminder count)
   come from the template's `v-for`. A lone reminder (`--rn: 1`) still
   centres under the seat exactly as before — the fan only opens for two or
   more, so the common case looks unchanged.

   FT-1167: THE MARGINS BELOW ARE THE FALLBACK NOW, not the placement. A
   percentage of the seat cannot hold a constant distance from the coin — the
   coin orbits the player's own centre as the seat travels round the clock (the
   full derivation, with the measured 39px swing, is on `measureReminderAnchor`
   in the script block), so the real `top`/`left` are measured per seat and
   arrive as an inline style that outranks everything here. What stays load
   bearing in this rule is the rest of it: `position: absolute`, the size, the
   z-index that keeps a token off the back of its own name plate, and the whole
   coarse-pointer block. The margins draw the first frame and any browser where
   the measurement bails. */
#townsquare .circle li .reminder:not(.add) {
  position: absolute;
  top: 0;
  left: 0;
  margin-top: 68%;
  margin-left: calc(-25% + (var(--ri, 0) - (var(--rn, 1) - 1) / 2) * 60%);
  // `.player` carries `z-index: 2` and (being `position: relative` with a
  // set z-index) opens its own stacking context — sibling elements at the
  // default `z-index: auto` lose to it outright, which is why the badge sat
  // BEHIND the seat's own name plate once it moved up to hug the coin
  // (measured 375x812: almost every badge fully hidden under the "Open" /
  // name pill). A badge overlapping its own seat is expected; hidden by it
  // is not.
  z-index: 3;

  @media (pointer: coarse) {
    /* two-thirds size, unchanged from the earlier touch fix — the fan
       tightens FURTHER to match (measured: 375x812/12 seats is the tightest
       ring the FT-869 rig covers, seats only 60px apart centre-to-centre;
       42% spacing grazed the next seat's own token 8 times there, 26%
       still grazed it by 1-2px vertically 4 times). 20% spacing plus a
       shallower tuck (66% vs 74%) clears every graze with room to spare. */
    width: 34%;
    padding-bottom: 34%;
    border-width: 2px;
    margin-top: 66%;
    margin-left: calc(-17% + (var(--ri, 0) - (var(--rn, 1) - 1) / 2) * 20%);
    .text {
      font-size: 38%;
      top: 10%;
    }
  }
}

// FT-1294: `#townsquare.public .circle .reminder` stood here, fading the seat
// reminders away while the coins were face down (FT-944 had narrowed it to
// `.circle` so it stopped catching ReminderModal's own picker tiles). The
// face-down state is retired — see store/index.js — so there is no state left
// for that rule to key off.
//
// FT-1295: and the second half of that note has changed. A player's ring used
// to carry only the tokens that client placed itself, because reminders never
// crossed the wire at all. They cross exactly one now: a seat the storyteller
// GRANTED THE GRIMOIRE to receives the town's tokens in its own direct frame
// (store/socket.js's sendGrimoire), where they land on the same `reminders`
// field and are painted by the same template above. Nothing else changed —
// there is still no broadcast, still nothing on their own chair, and the
// tokens are theirs to move or bin once they hold them.

// Night order is STORYTELLER information — the numbers say who wakes and in
// what order, and the badge text names the character outright ("The Imp
// points to a player"). A spectator's own view must never carry it. (user
// report 2026-08-18: it was showing to players — the fork hid .ability and
// .reminder but never covered this.)
//
// FT-1294: `#townsquare.public .night-order` was the first half of this rule
// and went with the face-down state. The `.spectator` half is the one that
// was ever keeping this off a player's screen, and it STAYS — it asks the
// real question, which is who is looking, not which way the coins face.
#townsquare.spectator .night-order {
  display: none;
}

/* FT-861: THE SCAN MARK. A seat that does not know what it is wears a warm
   collar on its name plate — enough to find at a glance while sweeping the
   ring, quiet enough that a town with three of them does not shout. The chip
   on the coin says WHAT they believe; this says only WHO. The `believing`
   class is already storyteller-only (see beliefChip), so no `.spectator`
   guard is needed here. */
/* FT-1076 (user): the scan mark RETIRES — the belief CHIP on the coin
   already says a seat is living a lie, and louder; a second signal on the
   plate was redundant. Rule kept, unmatched, per never-delete. */
.player.believing-retired > .name {
  border-color: #b8892f;
  box-shadow: 0 0 6px rgba(184, 137, 47, 0.55);
}
</style>
