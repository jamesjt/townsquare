<template>
  <!--
    Golem fork (FT-1384): THE NIGHT MARKS — each acting character's own dress
    on the coins while the night is asking, staged, and sealed.

    THREE STATES, one word each, decided entirely by Player.vue
    (nightMarkState) so this file is a RENDERER and never a second rules
    engine:

      invite   state 1 — the night wants a pick and this coin can take it.
               The one treatment allowed to LOOP (the breathe), because an
               invitation that stops moving stops inviting.
      staged   state 2 — the pick has settled here, still movable. The mark
               arrives in one short motion (≤1s) and then HOLDS; nothing
               loops, because a staged pick is a decision at rest.
      sealed   state 3 — the Confirm was pressed (or the storyteller's answer
               landed). The role's seal plays ONCE (≤1s) and holds until the
               storyteller re-asks. This is the receipt now — the FT-1330
               receive-only sentences stood down in its favour.

    THE ART REGISTER is the 2026-09-04 concept strips
    (claude_temp_test/2026-09-04-nightstates-shots/concept-*.png): dark
    bodies, one hot rim light, organic edges. Colours are each role's own —
    the Monk's white-gold, the Poisoner's sick green — never the team blues
    and reds (a night mark must not say what anyone IS; the FT-1150 rule).

    A ROLE WITHOUT AUTHORED ART RENDERS NOTHING — the purple ring idiom in
    Player.vue still dresses every un-authored character exactly as before
    this card. Roles land here one commit at a time (Monk first, the
    reference), so `HAS_ART` is the registry the template branches read.

    GEOMETRY: one SVG filling the coin's round box, with headroom above it
    (the viewBox starts at -20) because several marks live at the coin's
    shoulder — the Monk's halo hovers ABOVE the rim before it lands.
    pointer-events are off on everything: the mark never intercepts the tap
    it is decorating.

    FT-1386 (user-vetted): every FULL-CIRCLE mark that circles a character
    — beads, seep rings, ember ticks, the seal rings — draws OUTSIDE the
    coin's rim (r=55 on the rim's 50, spilling past the viewBox onto the
    dark cloth; overflow is visible the whole way up, nothing clips).
    Accents that sit ON the face (slashes, bubbles, drips, eyes, halos,
    pegs, tacks, seals, badges, the pentagram) stay where they are.
  -->
  <!--
    FT-1385 adds the TOLD-INFORMATION states beside the three above. The
    told roles (washerwoman, librarian, investigator, chef, empath) choose
    nothing — they are TOLD — so their grammar has two beats, not three:

      telling  the storyteller's Send landed: the information arrives in
               the role's own language. One arrival motion (≤1s), then a
               bright held pose.
      settled  the residue: effects expire, knowledge does not. The dress
               eases to a quiet dotted trace that persists all game.

    `part` says which coin this mark stands on: "target" (a coin the
    information points at — the candidate pair, the Empath's neighbours)
    or "self" (the told player's own chair, the residue's home).
  -->
  <span
    v-if="hasArt"
    class="nm"
    :class="['nm-' + state, 'nm-' + roleId, part ? 'nm-part-' + part : '']"
    aria-hidden="true"
  >
    <!-- ── MONK — THE HALO (protection descends) ─────────────────────────
         invite: a rosary-bead ring breathes on every legal coin.
         staged: the halo hovers over the picked coin, rays waking.
         sealed: the halo DROPS onto the coin and rings once like a struck
                 bell, then holds as a solid ring + a soft dome of light. -->
    <svg v-if="roleId === 'monk'" viewBox="0 -24 100 124">
      <template v-if="state === 'invite'">
        <!-- r=55: OUTSIDE the coin's rim (FT-1386, user-vetted). A ring
             that circles a character sits on the dark table cloth, not on
             the face — the old inside placement (r=38) was ducking the
             brass gear teeth at the rim, and out here there is no brass to
             vanish against. -->
        <circle class="mk-beads" cx="50" cy="50" r="55" />
      </template>
      <template v-else-if="state === 'staged'">
        <g class="mk-hover">
          <ellipse class="mk-halo" cx="50" cy="-8" rx="21" ry="6" />
          <path class="mk-ray" d="M50 -20 l0 -5" />
          <path class="mk-ray mk-ray2" d="M32 -14 l-4 -3" />
          <path class="mk-ray mk-ray3" d="M68 -14 l4 -3" />
        </g>
      </template>
      <template v-else-if="state === 'sealed'">
        <!-- the bell-flash: one expanding ring that burns out -->
        <circle class="mk-toll" cx="50" cy="50" r="55" />
        <!-- the dome of light, held -->
        <path
          class="mk-dome"
          d="M 8 50 A 42 42 0 0 1 92 50 L 86 50 A 36 36 0 0 0 14 50 Z"
        />
        <!-- the halo, landed on the rim -->
        <ellipse class="mk-halo mk-landed" cx="50" cy="2" rx="19" ry="5.5" />
        <!-- the solid ring the seal holds as — outside the rim (FT-1386) -->
        <circle class="mk-seal-ring" cx="50" cy="50" r="55" />
      </template>
    </svg>

    <!-- ── POISONER — THE SEEP (venom takes the rim) ─────────────────────
         invite: a sick-green seep ring breathes on every legal coin, one
                 bright bead slowly circling it (the state-1 loop).
         staged: venom crawls over the chosen coin's crown — an arc seeps on
                 once, three drips run down and HOLD, mid-crawl.
         sealed: the seep completes the circle in one smooth sweep and goes
                 STILL; the drips harden; the skull wisp fades in last. -->
    <svg v-else-if="roleId === 'poisoner'" viewBox="0 -24 100 124">
      <template v-if="state === 'invite'">
        <circle class="ps-seep-ring" cx="50" cy="50" r="55" />
        <circle class="ps-bead" cx="50" cy="50" r="55" pathLength="1" />
      </template>
      <template v-else-if="state === 'staged'">
        <path class="ps-arc" d="M 14 34 A 38 38 0 0 1 86 34" pathLength="1" />
        <path class="ps-drip ps-d1" d="M 30 22 q 1.5 9 0 15" pathLength="1" />
        <path class="ps-drip ps-d2" d="M 50 13 q -1 12 0.5 21" pathLength="1" />
        <path class="ps-drip ps-d3" d="M 68 20 q 1 7 -0.5 12" pathLength="1" />
        <circle class="ps-bubble ps-b1" cx="30" cy="39" r="1.8" />
        <circle class="ps-bubble ps-b2" cx="50.5" cy="36" r="2.2" />
        <circle class="ps-bubble ps-b3" cx="67.5" cy="34" r="1.6" />
      </template>
      <template v-else-if="state === 'sealed'">
        <circle class="ps-seal-ring" cx="50" cy="50" r="55" pathLength="1" />
        <path class="ps-drip ps-hard ps-d1" d="M 30 22 q 1.5 9 0 15" />
        <path class="ps-drip ps-hard ps-d2" d="M 50 13 q -1 12 0.5 21" />
        <path class="ps-drip ps-hard ps-d3" d="M 68 20 q 1 7 -0.5 12" />
        <!-- the skull wisp — dark body, hot green rim light, last to arrive -->
        <g class="ps-skull">
          <path
            d="M 50 -18 a 7.5 7 0 0 1 7.5 7 c 0 3 -1.6 4.6 -3.2 5.6
               l 0 2.6 a 1.4 1.4 0 0 1 -1.4 1.4 l -5.8 0 a 1.4 1.4 0 0 1
               -1.4 -1.4 l 0 -2.6 c -1.6 -1 -3.2 -2.6 -3.2 -5.6 a 7.5 7 0
               0 1 7.5 -7 z"
          />
          <circle class="ps-eye" cx="47" cy="-10.5" r="1.7" />
          <circle class="ps-eye" cx="53" cy="-10.5" r="1.7" />
        </g>
      </template>
    </svg>

    <!-- ── FORTUNE TELLER — THE SCRYING THREAD (two coins, one question) ──
         invite: sparkles wink in and out around every legal coin.
         staged: a starlight crescent veils each picked coin; the dotted
                 threads from her OWN coin to each pick are NightThread.vue's
                 (FT-1388 — they live between coins, not on one).
         sealed: the eye opens on the coin and stays open; the threads burn
                 solid one component over. -->
    <svg v-else-if="roleId === 'fortuneteller'" viewBox="0 -24 100 124">
      <template v-if="state === 'invite'">
        <path class="ft-spark ft-s1" :d="star(15, 26, 3.2)" />
        <path class="ft-spark ft-s2" :d="star(84, 20, 2.6)" />
        <path class="ft-spark ft-s3" :d="star(74, 82, 3)" />
        <path class="ft-spark ft-s4" :d="star(22, 76, 2.2)" />
      </template>
      <template v-else-if="state === 'staged'">
        <!-- a lune hugging the coin's upper-left rim: the outer arc rides
             the coin's own circle (r≈44 on c 50,50), the inner arc cuts
             back shallower (r=33), so the veil is thickest at its middle —
             a real crescent, not a hairline (the first draw measured
             invisible under the staged ring). -->
        <path
          class="ft-crescent"
          d="M 19 19 A 44 44 0 0 0 10 63 A 33 33 0 0 1 19 19 Z"
        />
        <path class="ft-spark ft-held ft-s1" :d="star(20, 14, 2.8)" />
        <path class="ft-spark ft-held ft-s3" :d="star(9, 68, 2.2)" />
      </template>
      <template v-else-if="state === 'sealed'">
        <g class="ft-eye">
          <path class="ft-lid" d="M 32 8 Q 50 -6 68 8 Q 50 22 32 8 Z" />
          <circle class="ft-iris" cx="50" cy="8" r="4.6" />
          <circle class="ft-pupil" cx="50" cy="8" r="2" />
        </g>
      </template>
    </svg>

    <!-- ── BUTLER — THE CORD (deference, tied off) ───────────────────────
         invite: a loose ribbon bow sways at every legal coin's shoulder.
         staged: the bow waits, loose-knotted, on the master's coin — the
                 slack cord running from the Butler's own chair is
                 NightThread.vue's half of the act.
         sealed: the cord snaps taut and the bow CINCHES shut here, with one
                 sparkle. -->
    <svg v-else-if="roleId === 'butler'" viewBox="0 -24 100 124">
      <template v-if="state === 'invite'">
        <g class="bt-bow bt-sway">
          <path
            class="bt-loop"
            d="M 78 22 C 70 10, 58 15, 65 24 C 69 29, 74 26, 78 22 Z"
          />
          <path
            class="bt-loop"
            d="M 78 22 C 86 10, 98 15, 91 24 C 87 29, 82 26, 78 22 Z"
          />
          <path class="bt-tail" d="M 76 24 q -2 8 -6 11" />
          <path class="bt-tail" d="M 80 24 q 2 8 6 11" />
          <circle class="bt-knot" cx="78" cy="22" r="2.2" />
        </g>
      </template>
      <template v-else-if="state === 'staged'">
        <g class="bt-bow bt-loose">
          <path
            class="bt-loop"
            d="M 78 22 C 70 10, 58 15, 65 24 C 69 29, 74 26, 78 22 Z"
          />
          <path
            class="bt-loop"
            d="M 78 22 C 86 10, 98 15, 91 24 C 87 29, 82 26, 78 22 Z"
          />
          <path class="bt-tail" d="M 76 24 q -2 8 -6 11" />
          <path class="bt-tail" d="M 80 24 q 2 8 6 11" />
          <circle class="bt-knot" cx="78" cy="22" r="2.2" />
        </g>
      </template>
      <template v-else-if="state === 'sealed'">
        <g class="bt-bow bt-cinched">
          <path
            class="bt-loop"
            d="M 78 22 C 72 13, 63 17, 68 24 C 71 28, 75 25, 78 22 Z"
          />
          <path
            class="bt-loop"
            d="M 78 22 C 84 13, 93 17, 88 24 C 85 28, 81 25, 78 22 Z"
          />
          <path class="bt-tail" d="M 76 24 q -1.5 6 -4.5 8" />
          <path class="bt-tail" d="M 80 24 q 1.5 6 4.5 8" />
          <circle class="bt-knot" cx="78" cy="22" r="2.4" />
        </g>
        <path class="bt-spark" :d="star(90, 10, 3.4)" />
      </template>
    </svg>

    <!-- ── IMP — THE RUNE CLAW (the kill is signed) ──────────────────────
         invite: ember ticks flicker on every live coin — the Imp's OWN coin
                 included, deliberately: that door is the starpass.
         staged: three claw slashes rake IN one after another; the rune arc
                 traces itself and stays OPEN.
         sealed: the rune SNAPS shut — full circle, the pentagram flares —
                 and embers drift up and die. -->
    <svg v-else-if="roleId === 'imp'" viewBox="0 -24 100 124">
      <template v-if="state === 'invite'">
        <path
          v-for="(t, i) in EMBER_TICKS"
          :key="'et' + i"
          class="im-tick"
          :class="'im-t' + (i % 4)"
          :d="t"
        />
      </template>
      <template v-else-if="state === 'staged'">
        <circle class="im-rune-arc" cx="50" cy="50" r="55" pathLength="1" />
        <path class="im-slash im-s1" d="M 36 18 q 4 22 -2 48" pathLength="1" />
        <path class="im-slash im-s2" d="M 52 14 q 3 24 -1 54" pathLength="1" />
        <path class="im-slash im-s3" d="M 66 18 q 2 20 -2 46" pathLength="1" />
      </template>
      <template v-else-if="state === 'sealed'">
        <circle class="im-flare" cx="50" cy="50" r="55" />
        <circle class="im-rune-ring" cx="50" cy="50" r="55" pathLength="1" />
        <path
          class="im-penta"
          d="M 50 20 L 67.6 74.3 L 21.5 40.7 L 78.5 40.7 L 32.4 74.3 Z"
        />
        <path class="im-slash im-hard im-s1" d="M 36 18 q 4 22 -2 48" />
        <path class="im-slash im-hard im-s2" d="M 52 14 q 3 24 -1 54" />
        <path class="im-slash im-hard im-s3" d="M 66 18 q 2 20 -2 46" />
        <circle class="im-ember im-e1" cx="34" cy="6" r="1.7" />
        <circle class="im-ember im-e2" cx="52" cy="0" r="2" />
        <circle class="im-ember im-e3" cx="66" cy="8" r="1.4" />
        <circle class="im-ember im-e4" cx="44" cy="-6" r="1.4" />
      </template>
    </svg>

    <!-- ── RAVENKEEPER — THE WING WREATH (the ravens choose a roost) ─────
         The dead actor's mark: this ask only exists for a seat that died
         tonight, and the machinery already knows it (deadStillWakes).
         invite: lone feathers drift and tumble slowly past the legal coins.
         staged: the feathers flutter DOWN and settle one by one on the
                 chosen rim, staggered, then rest.
         sealed: the wings FOLD shut around the coin — both sides sweep up
                 and lock — and the moon-eye glints once. -->
    <svg v-else-if="roleId === 'ravenkeeper'" viewBox="0 -24 100 124">
      <template v-if="state === 'invite'">
        <g class="rk-drift rk-f1">
          <path class="rk-feather" :d="feather(16, 18)" />
        </g>
        <g class="rk-drift rk-f2">
          <path class="rk-feather" :d="feather(84, 10)" />
        </g>
        <g class="rk-drift rk-f3">
          <path class="rk-feather" :d="feather(70, 78)" />
        </g>
      </template>
      <template v-else-if="state === 'staged'">
        <g class="rk-settle rk-f1">
          <path class="rk-feather" :d="feather(20, 26)" />
        </g>
        <g class="rk-settle rk-f2">
          <path class="rk-feather" :d="feather(80, 26)" />
        </g>
        <g class="rk-settle rk-f3">
          <path class="rk-feather" :d="feather(32, 84)" />
        </g>
        <g class="rk-settle rk-f4">
          <path class="rk-feather" :d="feather(68, 84)" />
        </g>
      </template>
      <template v-else-if="state === 'sealed'">
        <g class="rk-wing rk-wl">
          <path class="rk-pleat" d="M 46 92 Q 12 84 6 50" />
          <path class="rk-pleat" d="M 46 92 Q 18 84 14 60" />
          <path class="rk-pleat" d="M 46 92 Q 24 84 22 68" />
        </g>
        <g class="rk-wing rk-wr">
          <path class="rk-pleat" d="M 54 92 Q 88 84 94 50" />
          <path class="rk-pleat" d="M 54 92 Q 82 84 86 60" />
          <path class="rk-pleat" d="M 54 92 Q 76 84 78 68" />
        </g>
        <path
          class="rk-moon"
          d="M 50 -9 A 8.5 8.5 0 1 0 50 8 A 11 11 0 0 1 50 -9 Z"
        />
        <path class="rk-glint" :d="star(58, -6, 3.4)" />
      </template>
    </svg>

    <!-- ══ THE TOLD-INFORMATION MARKS (FT-1385) ═══════════════════════════
         Two states each (telling / settled), two parts (target / self).
         The RING is every target coin's shared grammar — solid and lit at
         the telling, dotted at rest — so "the information points HERE" is
         one shape in five inks; the role's own object (peg, page-corner,
         tack, heart, scorch) is what tells the five apart. -->

    <!-- ── WASHERWOMAN — THE LAUNDRY LINE'S PEGS ──────────────────────────
         telling: the ring strings itself round each candidate coin and a
                  clothespin drops onto the crown with a wooden click; soap
                  bubbles rise once and pop.
         settled: the ring eases to a dotted thread, the bubbles are gone,
                  the peg STAYS clamped on the rim. Self: a small peg rests
                  at the teller's own shoulder — the knowledge kept. -->
    <svg v-else-if="roleId === 'washerwoman'" viewBox="0 -24 100 124">
      <template v-if="part === 'target'">
        <circle class="ww-ring" cx="50" cy="50" r="55" pathLength="1" />
        <g class="ww-peg">
          <path
            d="M 46.5 6 L 46.5 -8 A 3.5 3.5 0 0 1 53.5 -8 L 53.5 6
               L 51.8 6 L 51.8 -2 L 48.2 -2 L 48.2 6 Z"
          />
          <circle class="ww-spring" cx="50" cy="-5" r="1.3" />
        </g>
        <template v-if="state === 'telling'">
          <circle class="ww-bubble ww-b1" cx="38" cy="14" r="2.4" />
          <circle class="ww-bubble ww-b2" cx="58" cy="9" r="1.8" />
          <circle class="ww-bubble ww-b3" cx="66" cy="18" r="1.4" />
        </template>
      </template>
      <template v-else>
        <g class="ww-peg ww-peg-self">
          <path
            d="M 46.5 6 L 46.5 -8 A 3.5 3.5 0 0 1 53.5 -8 L 53.5 6
               L 51.8 6 L 51.8 -2 L 48.2 -2 L 48.2 6 Z"
          />
          <circle class="ww-spring" cx="50" cy="-5" r="1.3" />
        </g>
      </template>
    </svg>

    <!-- ── LIBRARIAN — THE BOOKMARK'S PAGE-CORNERS ────────────────────────
         telling: the sepia ring reads itself round each candidate and a
                  page-corner folds onto the coin's shoulder — this seat is
                  a page the book has marked.
         settled: the ring rests dotted, the corner stays tucked. Self: the
                  red bookmark ribbon hangs from the teller's own rim — the
                  book closed, the place kept. (The zero-Outsiders night
                  strings no coins at all; the empty book is the centre's.)
    -->
    <svg v-else-if="roleId === 'librarian'" viewBox="0 -24 100 124">
      <template v-if="part === 'target'">
        <circle class="lb-ring" cx="50" cy="50" r="55" pathLength="1" />
        <g class="lb-corner">
          <path class="lb-fold" d="M 70 0 L 93 0 L 93 23 Z" />
          <path class="lb-crease" d="M 70 0 L 93 23" />
        </g>
      </template>
      <template v-else>
        <g class="lb-ribbon">
          <path d="M 46.5 -8 L 53.5 -8 L 53.5 16 L 50 10.5 L 46.5 16 Z" />
        </g>
      </template>
    </svg>

    <!-- ── INVESTIGATOR — THE EVIDENCE TACKS ──────────────────────────────
         telling: a tack PINS each candidate coin — one hard press — and
                  the red ring snaps round it; the string one component
                  over snaps taut in the same breath.
         settled: nothing sweetens. The ring dries to dotted, the tack
                  HOLDS. Self: the case's wax seal cools on the teller's
                  own rim — the dossier stamped, kept all game. -->
    <svg v-else-if="roleId === 'investigator'" viewBox="0 -24 100 124">
      <template v-if="part === 'target'">
        <circle class="iv-ring" cx="50" cy="50" r="55" pathLength="1" />
        <g class="iv-tack">
          <path class="iv-pin" d="M 50 -1 L 50 7" />
          <circle class="iv-head" cx="50" cy="-5" r="4.6" />
          <circle class="iv-glint" cx="48.4" cy="-6.6" r="1.2" />
        </g>
      </template>
      <template v-else>
        <g class="iv-seal">
          <path
            d="M 50 -7 c 5 -3.4 9.6 -0.6 9.9 3.4 c 0.4 4.4 -3.4 6.4 -5.4 6.9
               c 2 1.5 1 3.4 -1.2 3.2 c -2.4 -0.2 -7.6 0.6 -9.6 -1.4
               c -2.8 -2.8 -3 -7.6 -0.4 -10.1 c 2 -1.9 4.4 -2.4 6.7 -2 z"
          />
          <circle class="iv-boss" cx="50" cy="-1" r="3.4" />
        </g>
      </template>
    </svg>

    <!-- ── CHEF — THE SCORCH BADGE ────────────────────────────────────────
         The count points at nobody the Chef can see into, so the whole
         dress lives on her OWN coin (part self; toldSeats returns no
         targets) and in the centre, where the numeral takes the brand.
         telling: the scorch ring SEARS on around the pair-mark — two
                  touching coins, the thing the number counts — with ember
                  flecks lifting once.
         settled: the flames die first; the brand cools to a dotted scorch
                  and stays as the badge, permanent. -->
    <svg v-else-if="roleId === 'chef'" viewBox="0 -24 100 124">
      <g class="ch-badge">
        <circle class="ch-scorch" cx="50" cy="-4" r="12.5" pathLength="1" />
        <g class="ch-pair">
          <circle cx="45.6" cy="-4" r="4.1" />
          <circle cx="54.4" cy="-4" r="4.1" />
        </g>
      </g>
      <template v-if="state === 'telling'">
        <circle class="ch-fleck ch-f1" cx="42" cy="-14" r="1.5" />
        <circle class="ch-fleck ch-f2" cx="51" cy="-18" r="1.8" />
        <circle class="ch-fleck ch-f3" cx="59" cy="-13" r="1.2" />
      </template>
    </svg>

    <!-- ── EMPATH — THE HEART-THREADS' BEADS ──────────────────────────────
         telling: a vein pulses out to each live neighbour (NightThread's
                  half) and a heart bead lands on the neighbour's rim with
                  one heartbeat; the pink ring names the coin.
         settled: the ring rests dotted, the bead stays faint — and the
                  whole dress re-runs the same beat next night on the same
                  threads (a new row re-tells; a dead neighbour re-anchors
                  the vein and its bead by itself). Self: a small heart at
                  her own shoulder — what she knows, kept. -->
    <svg v-else-if="roleId === 'empath'" viewBox="0 -24 100 124">
      <template v-if="part === 'target'">
        <circle class="em-ring" cx="50" cy="50" r="55" pathLength="1" />
        <path
          class="em-heart"
          d="M 50 2 C 42.5 -5.5 44 -13.5 50 -9.5 C 56 -13.5 57.5 -5.5 50 2 Z"
        />
      </template>
      <template v-else>
        <path
          class="em-heart em-heart-self"
          d="M 50 2 C 42.5 -5.5 44 -13.5 50 -9.5 C 56 -13.5 57.5 -5.5 50 2 Z"
        />
      </template>
    </svg>
  </span>
</template>

<script>
// FT-1385: the told-information roles whose two-beat dress has landed —
// ONE registry for every surface (golem/toldInfo's TOLD_ART), so a coin
// mark cannot land without its thread and sentence or vice versa.
import { TOLD_ART } from "../golem/toldInfo";

/** The roles whose art has landed — grows one commit at a time (FT-1384's
 *  role-by-role order: monk, poisoner, fortuneteller, butler, imp,
 *  ravenkeeper). Everything else renders nothing and keeps the app's
 *  standing purple idiom. */
const HAS_ART = [
  "monk",
  "poisoner",
  "fortuneteller",
  "butler",
  "imp",
  "ravenkeeper",
];

/** The told states — the two-beat grammar's own words, disjoint from the
 *  choosing states above so one component can serve both without a role
 *  ever wearing the wrong scaffold. */
const TOLD_STATES = ["telling", "settled"];

/** The Imp's state-1 ember ticks — twelve short radial strokes at r≈55,
 *  just outside the coin's rim (FT-1386), precomputed once (they are the
 *  same on every coin). */
const EMBER_TICKS = (() => {
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
    const x1 = 50 + 52 * Math.cos(a);
    const y1 = 50 + 52 * Math.sin(a);
    const x2 = 50 + 58 * Math.cos(a);
    const y2 = 50 + 58 * Math.sin(a);
    ticks.push(
      `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    );
  }
  return ticks;
})();

export default {
  name: "NightMark",
  props: {
    roleId: {
      type: String,
      required: true,
    },
    /** "invite" | "staged" | "sealed" — Player.vue's nightMarkState — or a
     *  told state: "telling" | "settled" (FT-1385). */
    state: {
      type: String,
      required: true,
    },
    /** FT-1385, told states only: "target" (a coin the information points
     *  at) or "self" (the told player's own chair). Empty on the choosing
     *  states, which have no parts. */
    part: {
      type: String,
      default: "",
    },
  },
  computed: {
    hasArt() {
      if (TOLD_STATES.includes(this.state)) {
        return TOLD_ART.includes(this.roleId);
      }
      return HAS_ART.includes(this.roleId) && !!this.state;
    },
    EMBER_TICKS() {
      return EMBER_TICKS;
    },
  },
  methods: {
    /** A four-point star path at (cx, cy), radius r — the Fortune Teller's
     *  sparkles. Geometry in the template stays declarative; only the shape
     *  maths lives here. */
    star(cx, cy, r) {
      const w = r * 0.28;
      return (
        `M ${cx} ${cy - r} L ${cx + w} ${cy - w} L ${cx + r} ${cy} ` +
        `L ${cx + w} ${cy + w} L ${cx} ${cy + r} L ${cx - w} ${cy + w} ` +
        `L ${cx - r} ${cy} L ${cx - w} ${cy - w} Z`
      );
    },
    /** A slender feather at (cx, cy) — a leaf body with a spine, drifting
     *  point-down. One path so a group transform moves it whole. */
    feather(cx, cy) {
      return (
        `M ${cx} ${cy} q 3.4 -6 1.6 -14 q -5.4 6.4 -1.6 14 Z ` +
        `M ${cx} ${cy} l 1 -13`
      );
    },
  },
};
</script>

<style scoped lang="scss">
// The mark fills the night-pick box (the coin's square) and spills 24 units
// of headroom above it for shoulder-borne art. Never a control.
.nm {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;

  svg {
    position: absolute;
    left: 0;
    // 124 viewBox units on a 100-unit-wide box; the extra 24 sit above.
    top: -24%;
    width: 100%;
    height: 124%;
    overflow: visible;
  }
}

// ── THE MONK'S PALETTE ──────────────────────────────────────────────────
// White-gold — hotter and paler than the coins' brass so it reads as LIGHT
// laid on metal, with a dark under-shadow doing the edge work the way every
// bright mark on this dial does (the vote marks' halo rule).
$mk-gold: #ffe9b0;
$mk-gold-hot: #fff6dc;

// state 1 — the rosary beads. Dotted ring just outside the rim (FT-1386),
// breathing by opacity. THE ONE LOOP THIS FILE IS ALLOWED (the invite
// breathe).
.mk-beads {
  fill: none;
  stroke: $mk-gold-hot;
  stroke-width: 3.4;
  stroke-linecap: round;
  // 0.1-long dashes with round caps read as beads, not dashes
  stroke-dasharray: 0.1 6.9;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 5px rgba(255, 233, 176, 0.8));
  animation: mk-breathe 2s ease-in-out infinite alternate;
}

// a frame caught at the bottom of the cycle still reads — the
// seat-move-invite rule, kept here for every breathe that follows
@keyframes mk-breathe {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}

// state 2 — the halo hovers over the chosen coin. One settle-in (≤0.6s),
// then it HOLDS; the rays wake once with it.
.mk-halo {
  fill: none;
  stroke: $mk-gold-hot;
  stroke-width: 3;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.85))
    drop-shadow(0 0 6px rgba(255, 233, 176, 0.8));
}

.mk-hover {
  animation: mk-hover-in 0.6s ease-out both;
}

@keyframes mk-hover-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mk-ray {
  stroke: $mk-gold-hot;
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0;
  animation: mk-ray-wake 0.5s ease-out 0.35s both;
  &.mk-ray2 {
    animation-delay: 0.45s;
  }
  &.mk-ray3 {
    animation-delay: 0.55s;
  }
}

@keyframes mk-ray-wake {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.85;
  }
}

// state 3 — the seal. The halo drops the last stretch onto the rim, the
// bell-flash rings ONCE (an expanding ring that burns out), and what holds
// is a solid ring plus a soft dome of light over the coin's crown.
.mk-landed {
  animation: mk-halo-land 0.45s ease-in both;
}

@keyframes mk-halo-land {
  from {
    opacity: 0;
    transform: translateY(-14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mk-toll {
  fill: none;
  stroke: $mk-gold-hot;
  stroke-width: 3;
  transform-origin: 50px 50px;
  animation: mk-toll-once 0.8s ease-out 0.3s both;
}

@keyframes mk-toll-once {
  from {
    opacity: 0.95;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.22);
  }
}

.mk-dome {
  fill: $mk-gold;
  opacity: 0;
  animation: mk-dome-in 0.5s ease-out 0.45s both;
}

@keyframes mk-dome-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.5;
  }
}

.mk-seal-ring {
  fill: none;
  stroke: $mk-gold;
  stroke-width: 2.4;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.85))
    drop-shadow(0 0 7px rgba(255, 233, 176, 0.7));
  opacity: 0;
  animation: mk-seal-hold 0.45s ease-out 0.4s both;
}

@keyframes mk-seal-hold {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.9;
  }
}

// ── THE POISONER'S PALETTE ──────────────────────────────────────────────
// Sick toxic green — nothing else on the square speaks it (the yes-chip's
// #7ed67e is a leaf green and lives only in answer pills), so venom cannot
// be mistaken for anything benign.
$ps-green: #8fe33c;
$ps-green-hot: #c8ff6e;
$ps-dark: #24350f;

// state 1 — the seep ring breathes, and one bright bead slowly rounds it.
.ps-seep-ring {
  fill: none;
  stroke: $ps-green;
  stroke-width: 2.4;
  stroke-dasharray: 5 4;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.95))
    drop-shadow(0 0 5px rgba(143, 227, 60, 0.7));
  animation: mk-breathe 2s ease-in-out infinite alternate;
}

.ps-bead {
  fill: none;
  stroke: $ps-green-hot;
  stroke-width: 3.6;
  stroke-linecap: round;
  stroke-dasharray: 0.045 0.955;
  filter: drop-shadow(0 0 4px rgba(200, 255, 110, 0.9));
  animation: ps-round 6s linear infinite;
}

@keyframes ps-round {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -1;
  }
}

// state 2 — the crawl-on: the crown arc seeps in first, the drips run down
// after it, the bubbles surface last. Everything lands inside a second and
// HOLDS mid-crawl (the no-loop rule for a decision at rest).
.ps-arc {
  fill: none;
  stroke: $ps-green;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 6px rgba(143, 227, 60, 0.75));
  animation: ps-crawl 0.55s ease-out both;
}

.ps-drip {
  fill: none;
  stroke: $ps-green;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(143, 227, 60, 0.65));
  animation: ps-crawl 0.5s ease-in 0.35s both;
  &.ps-d2 {
    animation-delay: 0.45s;
  }
  &.ps-d3 {
    animation-delay: 0.55s;
  }
}

@keyframes ps-crawl {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.ps-bubble {
  fill: $ps-green-hot;
  opacity: 0;
  animation: ps-surface 0.35s ease-out 0.75s both;
  &.ps-b2 {
    animation-delay: 0.85s;
  }
  &.ps-b3 {
    animation-delay: 0.95s;
  }
}

@keyframes ps-surface {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 0.95;
    transform: translateY(0);
  }
}

// state 3 — the seal: one smooth sweep closes the circle and goes STILL.
// The drips arrive already hardened (brighter, no crawl); the skull wisp
// fades in last, dark-bodied with the hot rim doing the reading.
.ps-seal-ring {
  fill: none;
  stroke: $ps-green;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 8px rgba(143, 227, 60, 0.8));
  animation: ps-sweep 0.8s ease-in-out both;
}

@keyframes ps-sweep {
  from {
    stroke-dashoffset: 1;
    opacity: 0.7;
  }
  to {
    stroke-dashoffset: 0;
    opacity: 0.95;
  }
}

.ps-hard {
  stroke: $ps-green-hot;
  stroke-width: 2.8;
  animation: mk-seal-hold 0.3s ease-out 0.5s both;
}

.ps-skull {
  path {
    fill: $ps-dark;
    stroke: $ps-green-hot;
    stroke-width: 1.4;
    filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 4px rgba(200, 255, 110, 0.7));
  }
  .ps-eye {
    fill: $ps-green-hot;
  }
  opacity: 0;
  animation: ps-wisp 0.45s ease-out 0.75s both;
}

@keyframes ps-wisp {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 0.92;
    transform: translateY(0);
  }
}

// ── THE FORTUNE TELLER'S PALETTE ────────────────────────────────────────
// Starlight — the thread's own pale violet-white (NightThread.vue), so the
// coin marks and the line between them read as one act.
$ft-star: #d9ccff;
$ft-star-hot: #f4eeff;

// state 1 — sparkles wink in and out around the coin. The state-1 loop.
.ft-spark {
  fill: $ft-star-hot;
  // scale around the star's own centre, not the SVG origin — without this
  // a wink at (84,20) would slide toward the corner as it shrank
  transform-box: fill-box;
  transform-origin: center;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(217, 204, 255, 0.85));
  animation: ft-wink 2s ease-in-out infinite;
  &.ft-s2 {
    animation-delay: 0.5s;
  }
  &.ft-s3 {
    animation-delay: 1s;
  }
  &.ft-s4 {
    animation-delay: 1.5s;
  }
}

@keyframes ft-wink {
  0%,
  100% {
    opacity: 0.15;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

// staged sparkles hold still beside the crescent — no loop at rest.
.ft-spark.ft-held {
  animation: mk-seal-hold 0.4s ease-out 0.3s both;
}

// state 2 — the crescent veils the picked coin's shoulder, one settle-in.
.ft-crescent {
  fill: $ft-star;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 6px rgba(217, 204, 255, 0.8));
  animation: ft-veil 0.6s ease-out both;
}

@keyframes ft-veil {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 0.92;
    transform: translateY(0);
  }
}

// state 3 — the eye OPENS and stays open: lids part (a scaleY unfold), the
// iris arrives with them. Dark pupil, hot rim — the register's rule.
.ft-eye {
  transform-origin: 50px 8px;
  animation: ft-open 0.55s ease-out 0.2s both;

  .ft-lid {
    fill: rgba(20, 14, 40, 0.85);
    stroke: $ft-star-hot;
    stroke-width: 1.6;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 6px rgba(244, 238, 255, 0.8));
  }
  .ft-iris {
    fill: $ft-star;
  }
  .ft-pupil {
    fill: #14092c;
  }
}

@keyframes ft-open {
  from {
    opacity: 0;
    transform: scaleY(0.1);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

// ── THE BUTLER'S PALETTE ────────────────────────────────────────────────
// Champagne ribbon — NightThread's cord colours, so the bow on the coin and
// the cord reaching it read as one piece of ribbon.
$bt-cord: #e8c98f;
$bt-cord-hot: #ffe9c4;

.bt-bow {
  .bt-loop {
    fill: rgba(58, 40, 16, 0.75);
    stroke: $bt-cord;
    stroke-width: 1.8;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 4px rgba(232, 201, 143, 0.6));
  }
  .bt-tail {
    fill: none;
    stroke: $bt-cord;
    stroke-width: 1.8;
    stroke-linecap: round;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9));
  }
  .bt-knot {
    fill: $bt-cord-hot;
  }
}

// state 1 — the bow sways gently at the coin's shoulder. The state-1 loop.
.bt-sway {
  transform-origin: 78px 22px;
  animation: bt-sway 2s ease-in-out infinite alternate;
}

@keyframes bt-sway {
  from {
    transform: rotate(-7deg);
    opacity: 0.65;
  }
  to {
    transform: rotate(7deg);
    opacity: 1;
  }
}

// state 2 — the bow settles on the master, loose, and holds.
.bt-loose {
  transform-origin: 78px 22px;
  animation: bt-settle 0.6s ease-out both;
}

@keyframes bt-settle {
  from {
    opacity: 0;
    transform: translateY(-8px) rotate(-6deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
}

// state 3 — the CINCH: the bow snaps a size smaller and brightens, one
// crack, in step with the cord going taut one component over.
.bt-cinched {
  transform-origin: 78px 22px;
  animation: bt-cinch 0.4s ease-out both;

  .bt-loop {
    stroke: $bt-cord-hot;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 6px rgba(255, 233, 196, 0.85));
  }
  .bt-tail {
    stroke: $bt-cord-hot;
  }
}

@keyframes bt-cinch {
  0% {
    transform: scale(1.25);
    opacity: 0.5;
  }
  55% {
    transform: scale(0.94);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.bt-spark {
  fill: $bt-cord-hot;
  filter: drop-shadow(0 0 4px rgba(255, 233, 196, 0.9));
  opacity: 0;
  animation: ps-surface 0.35s ease-out 0.4s both;
}

// ── THE IMP'S PALETTE ───────────────────────────────────────────────────
// Ember orange — fire, not blood: crimson already means death and the
// bluffs mask on this square, and the rune is a signature, not a wound.
$im-ember: #ff9a3d;
$im-ember-hot: #ffc76e;
$im-deep: #d24a12;

// state 1 — ember ticks flicker round the rim. The state-1 loop, staggered
// four ways so the ring smoulders rather than blinking in unison.
.im-tick {
  fill: none;
  stroke: $im-ember;
  stroke-width: 2.6;
  stroke-linecap: round;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(255, 154, 61, 0.75));
  animation: im-flicker 2s ease-in-out infinite;
  &.im-t1 {
    animation-delay: 0.5s;
  }
  &.im-t2 {
    animation-delay: 1s;
  }
  &.im-t3 {
    animation-delay: 1.5s;
  }
}

@keyframes im-flicker {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}

// state 2 — the claw: three slashes rake IN one after another, and the rune
// arc traces itself but stays OPEN (the circle is the seal's to close).
.im-slash {
  fill: none;
  stroke: $im-deep;
  stroke-width: 3.4;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(255, 154, 61, 0.65));
  animation: ps-crawl 0.3s ease-in both;
  &.im-s2 {
    animation-delay: 0.18s;
  }
  &.im-s3 {
    animation-delay: 0.36s;
  }
}

.im-rune-arc {
  fill: none;
  stroke: $im-ember;
  stroke-width: 2.6;
  stroke-linecap: round;
  // 72% of the circle: an open arc, unmistakably unfinished
  stroke-dasharray: 0.72 0.28;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 5px rgba(255, 154, 61, 0.7));
  opacity: 0;
  animation: nm-arrive 0.5s ease-out 0.5s both;
}

@keyframes nm-arrive {
  from {
    opacity: 0;
  }
  to {
    opacity: 0.9;
  }
}

// state 3 — the SNAP: the circle closes in one fast sweep, the pentagram
// flares with it, one bright ring of light burns out, and the embers drift
// up and die. Then everything holds still.
.im-rune-ring {
  fill: none;
  stroke: $im-ember;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 7px rgba(255, 154, 61, 0.8));
  animation: ps-sweep 0.45s ease-in both;
}

.im-penta {
  fill: none;
  stroke: $im-ember-hot;
  stroke-width: 2;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 5px rgba(255, 199, 110, 0.8));
  opacity: 0;
  animation: nm-arrive 0.35s ease-out 0.4s both;
}

.im-flare {
  fill: none;
  stroke: $im-ember-hot;
  stroke-width: 3;
  transform-origin: 50px 50px;
  animation: mk-toll-once 0.6s ease-out 0.4s both;
}

.im-slash.im-hard {
  stroke: $im-ember;
  animation: mk-seal-hold 0.3s ease-out both;
}

.im-ember {
  fill: $im-ember-hot;
  filter: drop-shadow(0 0 3px rgba(255, 199, 110, 0.9));
  opacity: 0;
  animation: im-rise 0.8s ease-out 0.5s both;
  &.im-e2 {
    animation-delay: 0.6s;
  }
  &.im-e3 {
    animation-delay: 0.7s;
  }
  &.im-e4 {
    animation-delay: 0.8s;
  }
}

// up, and out — the embers are the one sealed element that ENDS dark,
// because an ember that holds is a lamp, not a death.
@keyframes im-rise {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-9px);
  }
}

// ── THE RAVENKEEPER'S PALETTE ───────────────────────────────────────────
// Moonlit violet — a dead seat's mark, so it is the coolest and quietest of
// the six: violet feathers, a pale moon, one glint.
$rk-violet: #a48ce0;
$rk-violet-hot: #e6dcff;

.rk-feather {
  fill: rgba(46, 32, 84, 0.8);
  stroke: $rk-violet;
  stroke-width: 1.3;
  stroke-linecap: round;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(164, 140, 224, 0.6));
}

// state 1 — lone feathers drift and tumble slowly past the coin. The
// state-1 loop, staggered so the fall never reads as one object.
.rk-drift {
  animation: rk-drift 3s ease-in-out infinite;
  &.rk-f2 {
    animation-delay: 1s;
  }
  &.rk-f3 {
    animation-delay: 2s;
  }
}

@keyframes rk-drift {
  0% {
    opacity: 0;
    transform: translateY(-8px) rotate(-8deg);
  }
  30% {
    opacity: 0.95;
  }
  70% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: translateY(10px) rotate(10deg);
  }
}

// state 2 — the feathers flutter DOWN and settle one by one on the chosen
// rim (staggered ease-out), then REST — the no-loop rule.
.rk-settle {
  animation: rk-settle 0.5s ease-out both;
  &.rk-f2 {
    animation-delay: 0.15s;
  }
  &.rk-f3 {
    animation-delay: 0.3s;
  }
  &.rk-f4 {
    animation-delay: 0.45s;
  }
}

@keyframes rk-settle {
  from {
    opacity: 0;
    transform: translateY(-12px) rotate(-14deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
}

// state 3 — the wings FOLD shut around the coin: both pleated sides sweep
// up from the foot and lock, and the moon-eye glints once above.
.rk-pleat {
  fill: none;
  stroke: $rk-violet;
  stroke-width: 2.4;
  stroke-linecap: round;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 5px rgba(164, 140, 224, 0.7));
}

.rk-wing {
  transform-origin: 50px 92px;
  animation: rk-fold 0.6s ease-out both;
}

.rk-wl {
  --rk-from: 32deg;
}
.rk-wr {
  --rk-from: -32deg;
}

@keyframes rk-fold {
  from {
    opacity: 0;
    transform: rotate(var(--rk-from, 0deg));
  }
  to {
    opacity: 0.95;
    transform: rotate(0deg);
  }
}

.rk-moon {
  fill: $rk-violet-hot;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 6px rgba(230, 220, 255, 0.8));
  opacity: 0;
  animation: nm-arrive 0.4s ease-out 0.5s both;
}

// the glint — ONCE, then it dies back to a faint watchful point.
.rk-glint {
  fill: white;
  transform-box: fill-box;
  transform-origin: center;
  filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.95));
  opacity: 0;
  animation: rk-glint 0.55s ease-out 0.7s both;
}

@keyframes rk-glint {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  40% {
    opacity: 1;
    transform: scale(1.15);
  }
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
}

// ═══ THE TOLD-INFORMATION PALETTES (FT-1385) ════════════════════════════
// Two beats each: the telling arrives once (≤1s) and holds bright; the
// settled residue is dotted, dimmer, and PERSISTS — the transition between
// the two rides plain CSS transitions on the same elements, so the ease
// from bright to quiet is a settle, not a swap.

// ── THE WASHERWOMAN'S PALETTE ───────────────────────────────────────────
// Laundry white — soap-pale, cooler than the Monk's white-gold: clean
// linen on brass, nothing else on the square speaks it.
$ww-white: #eaf2ff;
$ww-wood: #3a2c1a;
$ww-wood-lit: #c9a86e;

// the candidate ring: strings itself on at the telling (the draw-on), goes
// dotted-slack at rest. The dash pattern flip is covered by the opacity
// ease, so the settle reads as the line relaxing.
.ww-ring {
  fill: none;
  stroke: $ww-white;
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 6px rgba(234, 242, 255, 0.8));
  animation: ps-crawl 0.6s ease-out both;
  transition:
    opacity 0.7s ease,
    stroke-width 0.7s ease,
    filter 0.7s ease;
}

.nm-settled .ww-ring {
  stroke-width: 2;
  stroke-dasharray: 0.012 0.028;
  opacity: 0.72;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 3px rgba(234, 242, 255, 0.45));
  animation: none;
}

// the peg: a wooden clothespin clamped on the coin's crown — dark body,
// pale rim light (the register's rule). The telling drops it in with one
// click of overshoot; at rest it simply holds, a touch quieter.
.ww-peg {
  path {
    fill: $ww-wood;
    stroke: $ww-wood-lit;
    stroke-width: 1.4;
    stroke-linejoin: round;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 4px rgba(234, 242, 255, 0.5));
  }
  .ww-spring {
    fill: $ww-white;
  }
  animation: ww-clamp 0.5s ease-in both;
  transition: opacity 0.7s ease;
}

.nm-settled .ww-peg {
  opacity: 0.85;
  animation: none;
}

@keyframes ww-clamp {
  0% {
    opacity: 0;
    transform: translateY(-12px);
  }
  70% {
    opacity: 1;
    transform: translateY(1.5px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

// the teller's own peg — the residue's home mark, resting at the coin's
// shoulder, smaller and off-square like a peg left on the line.
.ww-peg-self {
  transform-origin: 50px 0px;
  animation: ww-clamp 0.5s ease-in both;
}

.nm-part-self.nm-washerwoman svg {
  // the whole self mark rides at the shoulder rather than the crown
  transform: translate(24%, 4%) rotate(24deg) scale(0.72);
}

// soap: three bubbles rise once and pop — telling only, gone at rest
// (the template drops them with the state, so nothing loops).
.ww-bubble {
  fill: none;
  stroke: $ww-white;
  stroke-width: 1.1;
  filter: drop-shadow(0 0 3px rgba(234, 242, 255, 0.8));
  opacity: 0;
  animation: ww-soap 0.9s ease-out 0.35s both;
  &.ww-b2 {
    animation-delay: 0.5s;
  }
  &.ww-b3 {
    animation-delay: 0.65s;
  }
}

@keyframes ww-soap {
  0% {
    opacity: 0;
    transform: translateY(5px);
  }
  35% {
    opacity: 0.95;
  }
  100% {
    opacity: 0;
    transform: translateY(-10px);
  }
}

// ── THE LIBRARIAN'S PALETTE ─────────────────────────────────────────────
// Old parchment sepia for the book's furniture, one red ribbon — the only
// red on any told dress but the Investigator's, and theirs is thread while
// this is cloth.
$lb-sepia: #e8d9a8;
$lb-page: #f3ead0;
$lb-red: #c8452f;

.lb-ring {
  fill: none;
  stroke: $lb-sepia;
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 6px rgba(232, 217, 168, 0.75));
  animation: ps-crawl 0.6s ease-out both;
  transition:
    opacity 0.7s ease,
    stroke-width 0.7s ease,
    filter 0.7s ease;
}

.nm-settled .lb-ring {
  stroke-width: 2;
  stroke-dasharray: 0.012 0.028;
  opacity: 0.7;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 3px rgba(232, 217, 168, 0.4));
  animation: none;
}

// the page-corner: a dog-ear tucked onto the coin's shoulder — the fold is
// a pale triangle, the crease its one drawn line. The telling folds it on
// (a small rotate from the fold's own corner); at rest it stays tucked.
.lb-corner {
  .lb-fold {
    fill: rgba(58, 46, 20, 0.82);
    stroke: $lb-page;
    stroke-width: 1.4;
    stroke-linejoin: round;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 4px rgba(243, 234, 208, 0.55));
  }
  .lb-crease {
    fill: none;
    stroke: $lb-page;
    stroke-width: 1;
    opacity: 0.8;
  }
  transform-origin: 93px 0px;
  animation: lb-tuck 0.55s ease-out both;
  transition: opacity 0.7s ease;
}

.nm-settled .lb-corner {
  opacity: 0.85;
  animation: none;
}

@keyframes lb-tuck {
  0% {
    opacity: 0;
    transform: rotate(-24deg);
  }
  75% {
    opacity: 1;
    transform: rotate(4deg);
  }
  100% {
    opacity: 1;
    transform: rotate(0deg);
  }
}

// the teller's own ribbon — the bookmark hanging from the rim, the place
// kept. Slides down into place once, then hangs.
.lb-ribbon {
  path {
    fill: $lb-red;
    stroke: $lb-sepia;
    stroke-width: 1.2;
    stroke-linejoin: round;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 4px rgba(200, 69, 47, 0.5));
  }
  animation: lb-hang 0.55s ease-out both;
  transition: opacity 0.7s ease;
}

.nm-settled .lb-ribbon {
  opacity: 0.85;
  animation: none;
}

@keyframes lb-hang {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.nm-part-self.nm-librarian svg {
  // the ribbon rides at the shoulder, a bookmark's own slight lean
  transform: translate(22%, 2%) rotate(14deg) scale(0.8);
}

// ── THE INVESTIGATOR'S PALETTE ──────────────────────────────────────────
// Evidence red — hot when the tack lands, dried darker at rest. Crimson
// already means death elsewhere on the square; THIS red is thread-and-wax,
// always worn with the tack or the seal, never bare on a coin.
$iv-red: #ff5a5a;
$iv-dry: #c23b3b;
$iv-dark: #3a0f0f;

.iv-ring {
  fill: none;
  stroke: $iv-red;
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 6px rgba(255, 90, 90, 0.75));
  // faster than the softer roles' read-on: evidence snaps
  animation: ps-crawl 0.4s ease-out both;
  transition:
    opacity 0.7s ease,
    stroke 0.7s ease,
    stroke-width 0.7s ease,
    filter 0.7s ease;
}

.nm-settled .iv-ring {
  stroke: $iv-dry;
  stroke-width: 2;
  stroke-dasharray: 0.012 0.028;
  opacity: 0.75;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 3px rgba(194, 59, 59, 0.45));
  animation: none;
}

// the tack: a pinhead over the coin's crown with its pin pressed into the
// rim. One HARD press at the telling (scale overshoot in, no bounce out);
// at rest it holds — tacks do not soften.
.iv-tack {
  .iv-pin {
    fill: none;
    stroke: $iv-dry;
    stroke-width: 2;
    stroke-linecap: round;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
  }
  .iv-head {
    fill: $iv-dark;
    stroke: $iv-red;
    stroke-width: 1.6;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 4px rgba(255, 90, 90, 0.65));
  }
  .iv-glint {
    fill: #ffd9d9;
    opacity: 0.9;
  }
  transform-origin: 50px 0px;
  animation: iv-press 0.4s ease-in both;
  transition: opacity 0.7s ease;
}

.nm-settled .iv-tack {
  opacity: 0.88;
  animation: none;
}

@keyframes iv-press {
  0% {
    opacity: 0;
    transform: translateY(-10px) scale(1.4);
  }
  75% {
    opacity: 1;
    transform: translateY(0.5px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// the teller's own wax seal — pressed once at the telling, cooled at rest.
// Dark wax body, hot red rim light, an embossed boss at its middle.
.iv-seal {
  path {
    fill: $iv-dark;
    stroke: $iv-red;
    stroke-width: 1.4;
    stroke-linejoin: round;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9))
      drop-shadow(0 0 4px rgba(255, 90, 90, 0.55));
  }
  .iv-boss {
    fill: none;
    stroke: $iv-red;
    stroke-width: 1.2;
    opacity: 0.85;
  }
  transform-origin: 50px -1px;
  animation: iv-press 0.45s ease-in both;
  transition: opacity 0.7s ease;
}

.nm-settled .iv-seal {
  opacity: 0.82;
  animation: none;
}

.nm-part-self.nm-investigator svg {
  // the seal rides the shoulder — a stamp on the case, not a crown
  transform: translate(23%, 3%) rotate(-12deg) scale(0.85);
}

// ── THE CHEF'S PALETTE ──────────────────────────────────────────────────
// Kitchen-fire orange — warmer and fatter than the Imp's ember (a hearth,
// not a signature), and the only told dress with no thread: the badge and
// the branded numeral are the whole act.
$ch-ember: #ffb347;
$ch-ember-hot: #ffd98a;
$ch-char: #33200a;

// the badge whole: seared on once, then held; cooled at rest.
.ch-badge {
  animation: ch-sear-in 0.45s ease-out both;
  transition: opacity 0.7s ease;
}

.nm-settled .ch-badge {
  opacity: 0.85;
  animation: none;
}

@keyframes ch-sear-in {
  from {
    opacity: 0;
    transform: scale(1.35);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

// the scorch ring — a ring of heat tracing itself at the telling, a
// dotted char mark at rest.
.ch-scorch {
  fill: none;
  stroke: $ch-ember;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 6px rgba(255, 179, 71, 0.8));
  animation: ps-crawl 0.5s ease-out both;
  transition:
    opacity 0.7s ease,
    stroke-width 0.7s ease,
    filter 0.7s ease;
}

.nm-settled .ch-scorch {
  stroke-width: 1.6;
  stroke-dasharray: 0.02 0.045;
  opacity: 0.8;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 3px rgba(255, 179, 71, 0.45));
  animation: none;
}

// the pair-mark — two touching coins, the thing the count counts: char
// bodies, hot rims, deliberately TOUCHING (side-by-side is the rule).
.ch-pair circle {
  fill: $ch-char;
  stroke: $ch-ember-hot;
  stroke-width: 1.4;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 3px rgba(255, 217, 138, 0.6));
}

.nm-settled .ch-pair circle {
  stroke: $ch-ember;
}

// ember flecks — lift once at the telling and die dark (the Imp's rule:
// an ember that holds is a lamp). The template drops them at rest.
.ch-fleck {
  fill: $ch-ember-hot;
  filter: drop-shadow(0 0 3px rgba(255, 217, 138, 0.9));
  opacity: 0;
  animation: im-rise 0.8s ease-out 0.35s both;
  &.ch-f2 {
    animation-delay: 0.45s;
  }
  &.ch-f3 {
    animation-delay: 0.55s;
  }
}

.nm-part-self.nm-chef svg {
  // the badge rests at the shoulder, a brand on the coin's crown-side
  transform: translate(24%, 6%) scale(0.9);
}

// ── THE EMPATH'S PALETTE ────────────────────────────────────────────────
// Heart pink — the veins' own ink (NightThread), the warmest colour on
// the ring and nothing else's.
$em-pink: #ff9fd0;
$em-pink-hot: #ffd2e8;
$em-dark: #401428;

.em-ring {
  fill: none;
  stroke: $em-pink;
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-dasharray: 1;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 6px rgba(255, 159, 208, 0.75));
  animation: ps-crawl 0.55s ease-out both;
  transition:
    opacity 0.7s ease,
    stroke-width 0.7s ease,
    filter 0.7s ease;
}

.nm-settled .em-ring {
  stroke-width: 2;
  stroke-dasharray: 0.012 0.028;
  opacity: 0.68;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 3px rgba(255, 159, 208, 0.4));
  animation: none;
}

// the heart bead: lands on the neighbour's rim with ONE heartbeat — two
// quick swells inside the arrival second, then rest. Dark body, hot pink
// rim light, the register's rule.
.em-heart {
  fill: $em-dark;
  stroke: $em-pink;
  stroke-width: 1.5;
  stroke-linejoin: round;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9))
    drop-shadow(0 0 4px rgba(255, 159, 208, 0.65));
  transform-origin: 50px -4px;
  animation: em-beat 0.9s ease-out both;
  transition: opacity 0.7s ease;
}

.nm-settled .em-heart {
  opacity: 0.8;
  animation: none;
}

@keyframes em-beat {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  25% {
    opacity: 1;
    transform: scale(1.22);
  }
  45% {
    transform: scale(0.96);
  }
  65% {
    transform: scale(1.12);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

// her own heart — the knowledge kept at her shoulder, beating in once with
// the same pulse and resting smaller.
.em-heart-self {
  stroke: $em-pink-hot;
}

.nm-part-self.nm-empath svg {
  transform: translate(23%, 4%) rotate(10deg) scale(0.8);
}

// The information without the travel: every mark appears at rest.
@media (prefers-reduced-motion: reduce) {
  .nm *,
  .nm svg * {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
</style>
