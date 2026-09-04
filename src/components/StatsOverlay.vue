<template>
  <!-- Golem fork (FT-1146): THE RECORDS PAGE — what has happened across every
       town, on its own full-width surface.

       THIS FILE IS THE OLD TOWN-RECORDS OVERLAY, GROWN UP. It was a centred
       panel with a "this town / All towns" toggle, reached from the strip's
       quill; FT-1010 folded that door into the Chronicles drawer and the panel
       has been mounted-but-unreachable ever since (nothing has emitted
       `records` since — see Menu.vue's note). Rather than stand a SECOND stats
       surface beside an orphaned one — which is exactly how the drawer came to
       be carrying a whole-platform scope inside one game's chat — the orphan
       IS the page, and the drawer's platform scope stands down into it.

       PLATFORM SCOPE ONLY. The per-town record lives in the Chronicles drawer,
       where a town's own story already is. This surface never narrows to one
       town; `townId` only marks which row of the ledger is the town you are
       standing in.

       END-OF-GAME AND SETUP FACTS ONLY (user's own words): who won, on which
       script, how many sat down, how long it ran, the roster and the two board
       portraits. Messages and events do not follow a game across towns and are
       not offered here. -->
  <!-- FT-1188 (user call: "make the chronicle and overlay similar to the
       scripts"): THE CHRONICLE IS A MEMBER OF THE SCRIPTS WORKBENCH'S FAMILY.
       It was a flat opaque page that took the whole window and shared no
       chrome with anything else in the app; the bench (EditionModal.vue) had
       already settled this app's idiom for a surface too big to be a dialog —
       a real modal over the town, the clock face still showing behind it, a
       corner close mark, a centred drop-cap title alone on its line, controls
       under it, and the content in framed panels.

       IT IS THE SAME SHELL, not a copy of it: the 94vw/92vh sizing lives on
       one selector shared with the bench (Modal.vue), and the head, title and
       panel material come from `surface.scss`, lifted out of the bench for
       this. A working surface and a reading surface, same frame.

       THE TOWN SHOWS THROUGH NOW, which the old opaque page existed to
       prevent — a ring of role coins with the clock face reading through it.
       That was never this page's problem to solve: ChroniclesPortrait paints
       its own opaque plate under every ring for exactly this reason, so the
       boards stand on their own darkness whatever is behind the shell. -->
  <Modal class="records" @close="$emit('close')">
    <div class="records-page">
      <!-- FT-1162 (user call): the surface is THE CHRONICLE, and its title is
           CENTRED and wears the entry doors' own treatment — PiratesBay for
           the word plus the blood drop-cap the Host / Join / Scripts doors put
           on theirs, through KeyCap, the app's one drop-cap component. The cap
           is the letter of its hotkey, exactly as the doors' caps are, so the
           title says how to reach it.

           FT-1188: it is the bench's `almanac-title` now — the same class, the
           same element, the same shared declarations — so "Chronicle" and
           "Scripts" are one treatment rather than two that happen to look
           alike. The head is the bench's two-row head: the title alone on row
           one (the shell's close × is the only other thing at that height),
           and row two a 1fr/auto/1fr grid where the subtitle holds the true
           centre and Back keeps the far left on its own. FT-1162's call — "the
           back button should be on the far left, not on the right" — is
           unchanged and now costs nothing to hold, because the close × has
           left this header entirely for the shell's corner. -->
      <header class="rp-head">
        <div class="rp-row1">
          <!-- "C" + "hronicle" is ONE WORD split across two nodes, flush
               together — the entry doors' idiom and RoleDrawer's "G"+"rimoire"
               after it, not a badge beside a title. The newline before the tag
               is a whitespace-only node and Vue's `condense` drops it, so the
               cap and its word stay joined. -->
          <h3 class="almanac-title"><KeyCap letter="C" />hronicles</h3>
        </div>
        <div class="rp-row2">
          <!-- FT-1244 (the FT-1242 sweep's standard): `arrow-left` STAYS —
               a directional arrow in a text back-link is control furniture,
               the same verdict the sweep passed on every chevron, and the
               app owns no arrow mark of its own to say it better. -->
          <button class="rp-back" v-if="pick" @click="closePick">
            <font-awesome-icon icon="arrow-left" /> The Chronicles
          </button>
          <p class="rp-sub" :class="{ dev: testView }">
            <template v-if="pick">one game's record</template>
            <template v-else-if="testView"
              >the dev ledger — test games only</template
            >
            <!-- (FT-1304: the "towns you have sat in" branch retired with the
                 mineView toggle — narrowing by town is the towns FILTER now,
                 and the headline band carries the honest scope line.) -->
            <template v-else>every town on the platform</template>
          </p>
          <!-- FT-1236: THE DEV LEDGER'S DOOR — labs only — moved INTO the
               landing view's filter bar (FT-1301): the page speaks one filter
               grammar now, and which ledger is a filter like any other. The
               subtitle above still names the dev view; the switch itself is
               the flask in the bar. -->
          <!-- FT-1188: THE PAGE'S OWN CLOSE MARK, stood down rather than
               removed (house rule). The shell paints the × now — the shared
               CloseX at the size and corner every modal in the app puts it,
               which is the whole point of joining the family. -->
          <CloseX
            class="rp-close"
            v-if="false"
            @click.native="$emit('close')"
          />
        </div>
      </header>

      <!-- ── ONE GAME'S RECORD ────────────────────────────────────────────
           Opened from a ledger row (or handed in by the Chronicles drawer's
           boards link). Self-sufficient: the record is fetched by id, so it
           renders whether or not the ledger behind it holds that game. -->
      <div class="rp-body" v-blood-scroll v-if="pick">
        <p class="rp-state" v-if="pick.loading">Consulting the archives…</p>
        <p class="rp-state" v-else-if="!pick.game">
          That record could not be read.
        </p>
        <template v-else>
          <p class="rp-gamehead">
            <!-- FT-1162 (user call): "the script should use the icon of the
                 script not just its name." The mark comes from `scriptArtFor`
                 (golem/editionArt), which reads the only script handle a record
                 actually carries — its display NAME — back to an edition id and
                 so to the same art every script picker in the app shows. A name
                 it cannot place (a custom script, a script since renamed) gets
                 the stock custom mark; the art is only ever an addition, the
                 NAME is what identifies the script and it always prints. -->
            <span class="rp-gscript"
              ><img class="rp-gicon" :src="scriptArt(pick.game)" alt="" />{{
                pick.game.scriptName
              }}</span
            >
            <span class="rp-win" :class="pick.game.winningTeam">{{
              pick.game.winningTeam === "good" ? "Good wins" : "Evil wins"
            }}</span>
            <span class="rp-gmeta">{{ pick.game.townId }}</span>
            <span class="rp-gmeta">{{
              whenLabel(pick.game.startedAt || pick.game.endedAt)
            }}</span>
            <span class="rp-gmeta">{{ pick.game.playerCount }} seats</span>
            <!-- FT-1162 (user call): "the most important info besides the script
                 name, who won, and number of seats is number of days." IT IS NOT
                 RECORDED YET — a game row carries `startedAt` and `endedAt` and
                 nothing about its length in days, so every game recorded before
                 the capture lands has no answer. When there is no answer this
                 renders NOTHING: no zero, no dash, no "unknown". A day count is
                 a fact about how the game went and inventing one would be worse
                 than the gap. -->
            <span class="rp-gmeta" v-if="dayLabel(pick.game)">{{
              dayLabel(pick.game)
            }}</span>
            <span class="rp-gmeta">{{ lengthLabel(lengthOf(pick.game)) }}</span>
          </p>

          <!-- THE BOARDS AT THEIR TRUE SIZE. This is the whole reason the page
               exists as a page: a 230px thumbnail in a 460px drawer cannot show
               a 15-seat ring, and the portrait already has a large variant
               (ChroniclesPortrait's `large` — 68px coins, 16px names) that had
               nowhere wide enough to stand. Here it does. -->
          <p class="rp-state" v-if="boards.loading">Fetching the boards…</p>
          <div
            class="rp-boards"
            v-else-if="boards.start || boards.day1 || boards.end"
          >
            <!-- Each ring gets its OWN block box. ChroniclesPortrait's root is a
                 `display: contents` wrapper, so the figure itself is the layout
                 box and a parent's scoped CSS cannot reach it — the box around
                 it is how this page decides that two rings wrap onto separate
                 rows rather than shrinking to share one. -->
            <div class="rp-board" v-if="boards.start">
              <ChroniclesPortrait
                :board="boards.start"
                label="The game begins"
                large
              />
            </div>
            <div class="rp-board" v-if="boards.day1">
              <ChroniclesPortrait :board="boards.day1" label="Day 1" large />
            </div>
            <div class="rp-board" v-if="boards.end">
              <ChroniclesPortrait :board="boards.end" label="The end" large />
            </div>
          </div>
          <p class="rp-state" v-else>No boards were kept for this game.</p>

          <!-- FT-1188: the roster stands in a framed panel, the same material
               every band on the landing view wears. The BOARDS above it do
               not — a frame there would take 32px off the ring width the
               large portrait was measured at, and each ring already paints
               its own opaque plate, which is the frame it needs. -->
          <div class="rp-panel rp-rosterwrap" v-if="pick.game.seats">
            <table class="rp-table rp-roster">
              <thead>
                <tr>
                  <th>Seat</th>
                  <th>Player</th>
                  <th>Role</th>
                  <!-- FT-1304: "Type", matching the Roles table's rename. -->
                  <th>Type</th>
                  <th>Side</th>
                  <th>Fate</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="seat in pick.game.seats" :key="seat.seatNo">
                  <td>{{ seat.seatNo }}</td>
                  <td>{{ seat.playerName }}</td>
                  <td>{{ roleNameOf(seat.roleIdFinal) }}</td>
                  <td>{{ seat.roleType }}</td>
                  <td :class="seat.teamAtEnd">{{ seat.teamAtEnd }}</td>
                  <td :class="seat.survived ? 'lived' : 'died'">
                    {{ seat.survived ? "lived" : "died" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <!-- ── THE LANDING VIEW ─────────────────────────────────────────────── -->
      <!-- FT-1301 (user's design, superseding FT-1298's chip-tab views): THE
           PAGE IS ONE FILTERED QUESTION. The filter bar defines a SET of
           games; every figure below — the totals band, the role table, the
           games list — is computed CLIENT-SIDE over that one set, from the
           per-game fact rows `/games/facts` serves. The precomputed breakdown
           endpoints stay on the server, but this page no longer renders from
           them: two sources meant two totals that could disagree.

           "Roles together" RETIRED as a section with the same stroke — it was
           exactly a conjunction of role includes (a script include + two role
           includes = the old pair row, with the WHOLE page recomputed for it).

           NO SMALL-SAMPLE MARKS (user call): the thin-mark/legend treatment
           left this page entirely. The "no data" discipline stays — a game
           with no recorded nights contributes nothing to a length figure, and
           an empty sample prints "no data", never a 0. -->
      <div class="rp-body" v-blood-scroll v-else>
        <!-- THE FILTER BAR — the Golem editor's own toolbar idiom, worn in
             this page's dress: a compact dark bar of icon buttons, grouped by
             a thin divider, a toggled button filled — in this page's amber,
             not the editor's blue. Each filter icon opens a popover with a
             tri-state entries (off → include → exclude), searched from the
             bar's own input (FT-1304); the dev-ledger flask (FT-1236, labs
             only) rides the bar, and FT-1299's My-towns scope toggle became
             the TOWNS filter (FT-1304, signed-in only) — one filter grammar,
             not three generations of controls. -->
        <div
          class="rp-toolbar"
          ref="toolbar"
          role="toolbar"
          aria-label="Filter the record"
        >
          <!-- FT-1308 (user call): THE DIMENSIONS STAND IN ONE ENCLOSURE —
               the editor toolbar's grouped-segment look, worn gothic. A
               passive funnel glyph fronts the cluster as its label (armed +
               counted when ANY dimension filters, never clickable), and each
               dimension button keeps its own popover, armed state and badge,
               now wearing a small caret that says "I open". -->
          <div class="rp-toolcluster">
            <span
              class="rp-tool rp-tool-funnel"
              :class="{ armed: funnelCount > 0 }"
              title="Filters"
            >
              <font-awesome-icon icon="filter" />
              <i class="rp-toolbadge" v-if="funnelCount">{{ funnelCount }}</i>
            </span>
            <button
              class="rp-tool rp-tool-dim"
              :class="{
                open: openFilter === 'scripts',
                armed: filterCount('scripts') > 0,
              }"
              title="Script — include or exclude scripts"
              @click="togglePop('scripts')"
            >
              <font-awesome-icon icon="scroll" />
              <font-awesome-icon class="rp-tool-caret" icon="chevron-down" />
              <i class="rp-toolbadge" v-if="filterCount('scripts')">{{
                filterCount("scripts")
              }}</i>
            </button>
            <button
              class="rp-tool rp-tool-dim"
              :class="{
                open: openFilter === 'roles',
                armed: filterCount('roles') > 0,
              }"
              title="Roles — games must (or must not) have them in play"
              @click="togglePop('roles')"
            >
              <font-awesome-icon icon="theater-masks" />
              <font-awesome-icon class="rp-tool-caret" icon="chevron-down" />
              <i class="rp-toolbadge" v-if="filterCount('roles')">{{
                filterCount("roles")
              }}</i>
            </button>
            <button
              class="rp-tool rp-tool-dim"
              :class="{ open: openFilter === 'players', armed: playersActive }"
              title="Players — bound the seats at the table"
              @click="togglePop('players')"
            >
              <font-awesome-icon icon="user-friends" />
              <font-awesome-icon class="rp-tool-caret" icon="chevron-down" />
              <i class="rp-toolbadge" v-if="playersActive">1</i>
            </button>
            <!-- FT-1304: THE TOWNS FILTER (user call), wearing the home mark
                 the retired My-towns toggle wore — narrowing by town is a
                 tri-state filter like scripts now, not a page-wide scope
                 flip. The entries are the towns THIS viewer has sat in (one
                 scope=mine facts read, cached per page open — loadMyTowns).
                 FT-1371 (user, 2026-09-04): the signed-in gate came OFF the
                 button — it hid so well it read as missing to its own
                 designer. Everyone sees the button; signed out, the popover
                 explains itself (the rp-state below). -->
            <button
              class="rp-tool rp-tool-dim"
              :class="{
                open: openFilter === 'towns',
                armed: filterCount('towns') > 0,
              }"
              title="Towns — include or exclude the towns you have sat in"
              @click="togglePop('towns')"
            >
              <font-awesome-icon icon="home" />
              <font-awesome-icon class="rp-tool-caret" icon="chevron-down" />
              <i class="rp-toolbadge" v-if="filterCount('towns')">{{
                filterCount("towns")
              }}</i>
            </button>
          </div>
          <!-- FT-1308 (user call): THE SEARCH IS ALWAYS ON THE BAR and is the
               PRIMARY way to filter — the omnibar. It grew out of FT-1304's
               popover-bound list search: typing now opens SUGGESTIONS grouped
               by dimension, each row wearing the entry's own catalog art and
               its faceted count, so picking here IS picking in a popover.
               Enter takes the lit row (an include); Alt+Enter, Alt+click or
               the row's − add an EXCLUDE instead; ↑↓ walk; Esc clears. After
               a pick the input empties and keeps focus so the next term can
               follow. A NUMBER offers the seat bounds (at least / exactly /
               at most). The popovers stay the browse surface; this is the
               speed one. -->
          <span class="rp-omniwrap">
            <input
              class="rp-toolsearch"
              ref="search"
              type="search"
              placeholder="Filter by script, role, town, seats…"
              autocomplete="off"
              v-model="filterSearch"
              @focus="onSearchFocus"
              @keydown="onOmniKeydown"
            />
            <div class="rp-pop rp-omni" v-if="omniShown">
              <template v-for="group in omniGroups">
                <p class="rp-pop-group" :key="'og-' + group.label">
                  {{ group.label }}
                </p>
                <button
                  v-for="entry in group.entries"
                  :key="entry.key"
                  class="rp-omni-row"
                  :class="{ lit: entry.flat === omniIndex }"
                  :title="
                    entry.kind === 'players'
                      ? 'Bound the seats at the table'
                      : 'Add as a filter — Alt adds it as an exclude'
                  "
                  @mousemove="omniIndex = entry.flat"
                  @click="pickSuggestion(entry, $event.altKey)"
                >
                  <img
                    class="rp-pop-icon"
                    v-if="entry.icon"
                    :src="entry.icon"
                    alt=""
                  />
                  <span class="rp-omni-fa" v-else-if="entry.fa"
                    ><font-awesome-icon :icon="entry.fa"
                  /></span>
                  <span class="rp-pop-name">{{ entry.label }}</span>
                  <i class="rp-chip-n">{{ entry.count }}</i>
                  <span
                    class="rp-omni-minus"
                    v-if="entry.kind !== 'players'"
                    title="Exclude it instead (Alt+Enter)"
                    @click.stop="pickSuggestion(entry, true)"
                    >−</span
                  >
                </button>
              </template>
              <p class="rp-pop-note" v-if="!omniFlat.length">
                Nothing matches "{{ filterSearch.trim() }}".
              </p>
              <p class="rp-pop-note" v-else>
                Enter adds the lit row · Alt (or −) excludes · ↑↓ walk
              </p>
            </div>
          </span>
          <template v-if="session.labs">
            <span class="rp-tooldiv"></span>
            <div class="rp-toolgroup">
              <button
                class="rp-tool rp-tool-dev"
                :class="{ armed: testView }"
                :title="
                  testView
                    ? 'Showing test games (dev fixtures). Click for the real Chronicles.'
                    : 'Show test games — the dev ledger'
                "
                @click="toggleTestView"
              >
                <font-awesome-icon icon="flask" />
              </button>
            </div>
          </template>
          <button
            class="rp-toolclear"
            v-if="anyFilterActive"
            title="Clear every filter"
            @click="clearFilters"
          >
            <font-awesome-icon icon="times-circle" /> Clear filters
          </button>

          <!-- THE POPOVERS. One at a time, under the bar; a click anywhere
               outside the bar closes them (document listener, mounted). -->
          <div class="rp-pop" v-if="listPopOpen">
            <!-- (FT-1304: the per-popover search input stood down — the one
                 search on the bar filters whichever of these lists is open.) -->
            <!-- FT-1371: a signed-out viewer sees the button too — the
                 popover carries the explanation instead of the button
                 vanishing. All towns is the resting truth either way. -->
            <p
              class="rp-state"
              v-if="openFilter === 'towns' && !session.account"
            >
              All towns. Sign in to filter by the towns you have sat in.
            </p>
            <p
              class="rp-state"
              v-else-if="openFilter === 'towns' && myTowns.loading"
            >
              Reading your towns…
            </p>
            <!-- FT-1305: scripts and roles list a CATALOG now (below), so
                 their list is never empty — the "Nothing to filter yet."
                 state is towns-only, honestly. (FT-1308: the search left
                 the popovers, so "Nothing matches." left with it.) -->
            <p class="rp-state" v-else-if="!popChoices.length">
              Nothing to filter yet.
            </p>
            <div class="rp-pop-list" v-else>
              <!-- TRI-STATE: off → include (the game must have it) → exclude
                   (the game must not) → off. Include semantics differ BY
                   DIMENSION, deliberately: role includes are an AND — every
                   included role must be in play together — while script
                   includes are an OR, because scripts are practically
                   exclusive per game and demanding two at once would define
                   an empty set. The popover's own note states which.

                   FT-1305 (user escalation — the popovers enumerated fact
                   STRINGS, so a ledger of two scripts offered two entries and
                   a rig name sat beside Trouble Brewing as an equal): the
                   entries are the app's own CATALOGS now — the script-pick
                   dropdown's cards for scripts, the role registry for roles,
                   each wearing the same art those surfaces wear — grouped
                   (roles, by team) and appended-to (a fact string no catalog
                   knows still lists, so data never becomes unfilterable). -->
              <template v-for="group in popGroups">
                <p
                  class="rp-pop-group"
                  v-if="group.label"
                  :key="'grp-' + group.label"
                >
                  {{ group.label }}
                </p>
                <button
                  v-for="entry in group.entries"
                  :key="entry.id"
                  class="rp-pop-entry"
                  :class="stateOf(openFilter, entry.id)"
                  title="Click cycles: off → must have it → must not"
                  @click="cycleFilter(openFilter, entry.id)"
                >
                  <span class="rp-pop-mark">{{
                    markOf(openFilter, entry.id)
                  }}</span>
                  <img
                    class="rp-pop-icon"
                    v-if="entry.icon"
                    :src="entry.icon"
                    alt=""
                  />
                  <span class="rp-pop-name">{{ entry.label }}</span>
                  <i class="rp-chip-n">{{ entry.count }}</i>
                </button>
              </template>
            </div>
            <p class="rp-pop-note" v-if="openFilter === 'roles'">
              Included roles must ALL be in play; excluded roles must not be.
            </p>
            <!-- FT-1371 rider (user): the towns hint stood down — it doubled
                 the signed-out state line, and the include/exclude mechanics
                 read the same as scripts', which the entries teach by use.
                 (The branch is gone from the chain, so the scripts note below
                 names its own condition instead of riding v-else.)
            <p class="rp-pop-note" v-else-if="openFilter === 'towns'">
              The towns you have sat in. Included towns widen the set (a game is
              in one town); excluded towns drop out.
            </p> -->
            <p class="rp-pop-note" v-if="openFilter === 'scripts'">
              Included scripts widen the set (a game is of one script); excluded
              scripts drop out.
            </p>
          </div>
          <!-- FT-1308 (user call): the two number boxes became a SEAT-COUNT
               HISTOGRAM — bars are games per seat count over the set the
               OTHER filters keep (the popovers' own faceted discipline), so
               the graph shows what a bound would actually catch. Click one
               bar = exactly that count (click it again = off); drag across
               bars = that span; the dual-handle rail beneath drags either
               bound, and a handle parked at its rail's end leaves that side
               OPEN — both parked is no bound at all, exactly what the empty
               boxes used to mean. The selected span tints the include green
               and out-of-range bars dim, the readback chip's own grammar. -->
          <div class="rp-pop rp-pop-players" v-if="openFilter === 'players'">
            <p class="rp-state" v-if="!seatHistogram.bars.length">
              No games to graph.
            </p>
            <div class="rp-hist" v-else>
              <div class="rp-hist-bars">
                <div
                  class="rp-hist-col"
                  v-for="bar in seatHistogram.bars"
                  :key="bar.seats"
                  :class="barClass(bar.seats)"
                  :title="
                    bar.count +
                    (bar.count === 1 ? ' game of ' : ' games of ') +
                    bar.seats +
                    ' seats'
                  "
                  @mousedown.prevent="onBarDown(bar.seats)"
                  @mouseenter="onBarEnter(bar.seats)"
                >
                  <span class="rp-hist-n" v-if="bar.count">{{
                    bar.count
                  }}</span>
                  <div
                    class="rp-hist-bar"
                    :style="{ height: barHeight(bar.count) }"
                  ></div>
                  <span class="rp-hist-x">{{ bar.seats }}</span>
                </div>
              </div>
              <div
                class="rp-hist-track"
                ref="histTrack"
                v-if="seatHistogram.bars.length > 1"
                :style="histTrackStyle"
              >
                <div class="rp-hist-fill" :style="histFillStyle"></div>
                <button
                  class="rp-hist-handle"
                  :style="{ left: handleLeft('min') }"
                  title="Lower bound — drag; park at the left end for no bound"
                  @mousedown.prevent="onHandleDown('min')"
                  @keydown="onHandleKey('min', $event)"
                ></button>
                <button
                  class="rp-hist-handle"
                  :style="{ left: handleLeft('max') }"
                  title="Upper bound — drag; park at the right end for no bound"
                  @mousedown.prevent="onHandleDown('max')"
                  @keydown="onHandleKey('max', $event)"
                ></button>
              </div>
              <p class="rp-pop-note">
                Games per seat count, under the other filters. Click a bar for
                exactly that count, drag across bars for a span; a handle
                parked at its end leaves that side open.
              </p>
            </div>
          </div>
        </div>

        <!-- FT-1305: THE FILTER READBACK — the active question restated in
             plain words under the bar, one chip per active entry, each with
             its own ×. The chips wear the popover entries' own palette
             (green = must have, amber + strike = must not), so the bar, the
             popovers and the readback speak one grammar; clearing the last
             chip leaves the page exactly where Clear filters would. -->
        <div class="rp-readback" v-if="anyFilterActive">
          <span
            v-for="chip in filterChips"
            :key="chip.key"
            class="rp-fchip"
            :class="chip.state"
          >
            <span class="rp-fchip-mark" v-if="chip.mark">{{ chip.mark }}</span>
            <span class="rp-fchip-name">{{ chip.label }}</span>
            <button
              class="rp-fchip-x"
              :title="'Clear: ' + chip.label"
              @click="clearChip(chip)"
            >
              <font-awesome-icon icon="times" />
            </button>
          </span>
        </div>

        <!-- ── THE TOTALS BAND — always on top, computed over the set ──────
             FT-1164's discipline unchanged: every percentage carries its
             count, and the last figure is the sample every length figure is
             taken over. FT-1297's Ran statistics stand HERE now, promoted
             from the retired scripts table to the headline band. -->
        <section class="rp-band">
          <!-- FT-1304 (user call): "Data from all towns" — and with a towns
               filter active the count keeps it honest (see bandTitle). -->
          <h3>{{ bandTitle }}</h3>
          <p class="rp-state" v-if="facts.loading">Consulting the archives…</p>
          <p class="rp-state" v-else-if="facts.error">
            Chronicles unavailable — server unreachable
          </p>
          <p class="rp-state" v-else-if="!facts.games.length">
            No games recorded yet
          </p>
          <template v-else>
            <p class="rp-scope" v-if="anyFilterActive">
              {{ filteredGames.length }} of {{ facts.games.length }}
              {{ facts.games.length === 1 ? "game" : "games" }} match the
              filters.
            </p>
            <p class="rp-state" v-if="!filteredGames.length">
              No recorded game matches the filters.
            </p>
            <ul class="rp-figures" v-else>
              <li>
                <b>{{ totals.games }}</b
                ><span>{{ totals.games === 1 ? "game" : "games" }}</span>
              </li>
              <li class="good">
                <b>{{ totals.wins.good }}</b
                ><span>good wins · {{ pct(totals.winRate.good) }}</span>
              </li>
              <li class="evil">
                <b>{{ totals.wins.evil }}</b
                ><span>evil wins · {{ pct(totals.winRate.evil) }}</span>
              </li>
              <li :class="{ faint: !totals.nights.n }">
                <b>{{ num(totals.nights.median) }}</b
                ><span>nights · median</span>
              </li>
              <li :class="{ faint: !totals.nights.n }">
                <b>{{ num(totals.nights.mean) }}</b
                ><span>nights · mean</span>
              </li>
              <li
                :class="{
                  faint:
                    !totals.nights.n ||
                    !totals.nights.mode ||
                    totals.nights.mode.tied,
                }"
              >
                <b>{{ nightsModeFigure }}</b
                ><span>nights · mode</span>
              </li>
              <li>
                <b>{{ num(totals.players.median) }}</b
                ><span>players · median</span>
              </li>
              <li>
                <b>{{ num(totals.players.mean) }}</b
                ><span>players · mean</span>
              </li>
              <li :class="{ faint: !totals.nights.n }">
                <b>{{ totals.nights.n }}</b
                ><span>of {{ totals.games }} recorded their length</span>
              </li>
            </ul>
          </template>
        </section>

        <!-- ── THE ROLE TABLE — over the set (FT-1301) ─────────────────────
             STACKED under the totals with the games list, not behind a
             section toggle: two computed tables is not the old endless
             scroll of five precomputed ones, and hiding the set's own rows
             behind a switch would un-answer the question the reader just
             asked with the filters. (The your-call slot, exercised: stacked.)

             WIN RATE stays the plainest thing here: a role belongs to a
             team; the role won when its team won. With no script filter
             active the rows mix scripts — under this model the SET is the
             context a figure means anything in, and narrowing to one script
             is one click on the bar above. The Columns switch survives from
             FT-1297, on the columns this table still has. -->
        <section
          class="rp-band"
          v-if="!facts.loading && !facts.error && filteredGames.length"
        >
          <div class="rp-tablehead">
            <h3>Roles</h3>
            <button
              class="rp-colbtn"
              :class="{ on: colsOpen.roles }"
              title="Choose which columns the table shows"
              @click="colsOpen.roles = !colsOpen.roles"
            >
              Columns
            </button>
          </div>
          <p class="rp-scope">
            Over the filtered set: how often each role was in play, how often
            its team won, and how many of its seats died.
          </p>
          <div class="rp-chips rp-colchips" v-if="colsOpen.roles">
            <button
              v-for="col in roleColumns"
              :key="col.key"
              class="rp-chip"
              :class="{ on: colOn('roles', col.key) }"
              :title="col.title"
              @click="toggleCol('roles', col.key)"
            >
              {{ col.label }}
            </button>
          </div>
          <div class="rp-scroll">
            <table class="rp-table rp-roles">
              <thead>
                <tr>
                  <th>Role</th>
                  <!-- FT-1304 (user call): the column says "Type" now; the
                       KEY stays `kind` so every browser's saved column
                       choice keeps meaning what it meant. -->
                  <th class="rp-word" v-if="colOn('roles', 'kind')">Type</th>
                  <th
                    class="rp-word"
                    v-if="colOn('roles', 'script')"
                    title="Scripts the filtered set saw this role in"
                  >
                    Script
                  </th>
                  <th
                    v-if="colOn('roles', 'in')"
                    title="Games this role was in play"
                  >
                    In
                  </th>
                  <th
                    v-if="colOn('roles', 'share')"
                    title="Share of the filtered set's games"
                  >
                    Share
                  </th>
                  <th v-if="colOn('roles', 'won')">Won</th>
                  <th v-if="colOn('roles', 'winRate')">Win rate</th>
                  <th
                    v-if="colOn('roles', 'died')"
                    title="Seats that did not survive"
                  >
                    Died
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="role in roleRows" :key="role.roleId">
                  <td>{{ roleNameOf(role.roleId) }}</td>
                  <td class="dim rp-word" v-if="colOn('roles', 'kind')">
                    {{ role.roleType }}
                  </td>
                  <td class="dim rp-word" v-if="colOn('roles', 'script')">
                    {{ role.scripts }}
                  </td>
                  <td v-if="colOn('roles', 'in')">{{ role.games }}</td>
                  <td class="dim" v-if="colOn('roles', 'share')">
                    {{ pct(role.share) }}
                  </td>
                  <td v-if="colOn('roles', 'won')">{{ role.wins }}</td>
                  <td v-if="colOn('roles', 'winRate')">
                    {{ pct(role.winRate) }}
                  </td>
                  <td
                    v-if="colOn('roles', 'died')"
                    :class="{ dim: !role.died }"
                  >
                    {{ role.died }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="rp-columns" v-if="false">
            <!-- FT-1161 (user): "the players section of this is bad, we
                 shouldn't be publically displaying player info. Users should
                 get access to the player info of towns they have been in,
                 but not all across the entire platform."

                 Right, and it is the one thing on this page that names a
                 PERSON. Every other figure here is about games, scripts and
                 roles — facts about the play. A leaderboard of who won what,
                 visible to anyone who opens the site, is a different kind of
                 thing entirely, and it went out the moment it was named.

                 Stood down rather than removed: the same table, scoped to the
                 towns a viewer has actually been in, is a surface the user
                 does want — so the markup and its `topPlayers` computed stay
                 here waiting for that scope rather than being rebuilt later
                 from memory. -->
            <div class="rp-col" v-if="false && topPlayers.length">
              <h4>Players</h4>
              <table class="rp-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Games</th>
                    <th>Wins</th>
                    <th title="Games survived to the end">Lived</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in topPlayers" :key="row.playerName">
                    <td>{{ row.playerName }}</td>
                    <td>{{ row.games }}</td>
                    <td>{{ row.wins }}</td>
                    <td>{{ row.survivals }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- ── THE GAMES — the set itself (FT-1301) ────────────────────────
             The ledger's rows ARE the filtered set now, computed from the
             same facts every figure above is: one source, one claim. A row
             still opens that game's record, exactly as the old ledger's rows
             did. Very large sets cap what is RENDERED (never what is
             counted) and the scope line says so. -->
        <section
          class="rp-band"
          v-if="!facts.loading && !facts.error && filteredGames.length"
        >
          <div class="rp-tablehead">
            <h3>The games</h3>
            <button
              class="rp-colbtn"
              :class="{ on: colsOpen.games }"
              title="Choose which columns the table shows"
              @click="colsOpen.games = !colsOpen.games"
            >
              Columns
            </button>
          </div>
          <p class="rp-scope">{{ gamesClaim }}</p>
          <div class="rp-chips rp-colchips" v-if="colsOpen.games">
            <button
              v-for="col in gameColumns"
              :key="col.key"
              class="rp-chip"
              :class="{ on: colOn('games', col.key) }"
              :title="col.title"
              @click="toggleCol('games', col.key)"
            >
              {{ col.label }}
            </button>
          </div>
          <table class="rp-table rp-ledger">
            <thead>
              <tr>
                <th>Ended</th>
                <th v-if="colOn('games', 'town')">Town</th>
                <th v-if="colOn('games', 'script')">Script</th>
                <th v-if="colOn('games', 'seats')">Seats</th>
                <th
                  v-if="colOn('games', 'nights')"
                  title="Nights the town reached — blank when the game did not record it"
                >
                  Nights
                </th>
                <th
                  v-if="colOn('games', 'ran')"
                  title="Wall-clock length, when the record carries a start"
                >
                  Ran
                </th>
                <th v-if="colOn('games', 'winner')">Winner</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="game in listGames"
                :key="game.id"
                class="jump"
                :class="{ here: game.townId === townId }"
                :data-record-row="game.id"
                title="Open this game's record"
                @click="openPick(game.id)"
              >
                <td>{{ whenLabel(game.endedAt) }}</td>
                <td v-if="colOn('games', 'town')">{{ game.townId }}</td>
                <td v-if="colOn('games', 'script')">{{ game.scriptName }}</td>
                <td v-if="colOn('games', 'seats')">{{ game.playerCount }}</td>
                <td
                  v-if="colOn('games', 'nights')"
                  :class="{ dim: game.dayCount === null }"
                >
                  {{ game.dayCount === null ? "—" : game.dayCount }}
                </td>
                <td v-if="colOn('games', 'ran')">
                  {{ lengthLabel(lengthOf(game)) }}
                </td>
                <td
                  v-if="colOn('games', 'winner')"
                  class="rp-win"
                  :class="game.winningTeam"
                >
                  {{ game.winningTeam === "good" ? "Good" : "Evil" }}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  </Modal>
</template>

<script>
import { mapState } from "vuex";
// FT-1188: THE SHELL. The Chronicle stands in the app's own modal now, the
// same one the Scripts workbench stands in — the close mark, the veil over the
// town and the plate all come from it rather than being painted here.
import Modal from "./modals/Modal";
// The header's own × — STOOD DOWN in the template (FT-1188), still registered,
// because the mark is the one this page would paint if it ever left the shell.
import CloseX from "./CloseX";
import ChroniclesPortrait from "./ChroniclesPortrait";
// FT-1162: the app's one drop-cap component — the same one the entry doors
// and the grimoire drawer's own title render theirs through, so this C and
// the Keys panel's C are pixel-identical and move together if the font
// picker ever changes families.
import KeyCap from "./KeyCap";
// (FT-1301: ThinMark LEFT THIS PAGE — the user retired the small-sample
// mark/legend treatment here. Page-level only: the shared component file
// stands untouched for any surface that still wants it.)
import { scriptArtFor, EDITION_ICONS, edCustom } from "../golem/editionArt";
// FT-1305: the filter popovers list the app's own CATALOGS, not the fact
// strings — the same editions list + art the script-pick dropdown shows, the
// gold logo its "All of Blood on the Clocktower" card wears, and the role
// registry's token icons via the one shared icon resolver.
import editionJSON from "../editions.json";
import goldLogo from "../assets/gold/botc-logo-icon.png";
import { roleIconUrl } from "../golem/roleIcon";
import { platformStats, gameFacts, gameRecord } from "../golem/stats";
import { catchUp } from "../golem/chat";
import { boardsOf, logGameIdOf } from "../golem/chronicles";
import {
  knownTownIds,
  crossTownGames,
  lengthOf,
  whenLabel,
  lengthLabel,
} from "../golem/records";

const TOP_PLAYERS = 15;

/**
 * FT-1305: THE SCRIPT CATALOG — the same list the script-pick dropdown shows
 * (EditionModal's wbScriptCards, minus the vault shelf, which is per-browser
 * and not a fact about recorded games). A record stores its script as a
 * display NAME (see schema notes in golem/editionArt), so the catalog is
 * keyed by name too. "All of Blood on the Clocktower" STAYS: it is not a
 * meta-entry here — playing the gold script records that exact string as the
 * game's scriptName, so it is a real, filterable script identity with its own
 * games. Names the catalog does not know (custom/imported scripts) are
 * APPENDED from the facts wearing the stock custom mark — the same mark the
 * record header gives them via scriptArtFor — so no game is ever unfilterable.
 */
const SCRIPT_CATALOG = [
  ...editionJSON.map((e) => ({
    name: e.name,
    icon: EDITION_ICONS[e.id] || edCustom,
  })),
  { name: "All of Blood on the Clocktower", icon: goldLogo },
];

/**
 * FT-1305: the role popover's grouping — the sheet order every BotC surface
 * uses (roles.json's own `team`). A fact role the registry does not know
 * (a custom role) lands in the trailing Custom group.
 */
const ROLE_TEAMS = [
  { id: "townsfolk", label: "Townsfolk" },
  { id: "outsider", label: "Outsiders" },
  { id: "minion", label: "Minions" },
  { id: "demon", label: "Demons" },
  { id: "traveler", label: "Travellers" },
];

/**
 * FT-1297's column switches, surviving FT-1301 on the tables that remain.
 * The first column of each (the role's name; the game's Ended instant) is
 * deliberately not here: a table of unlabelled rows is not a view anyone
 * asked for. Each entry's title is the header's own sentence.
 */
const ROLE_COLUMNS = [
  // FT-1304: the LABEL says "Type" (user call); the KEY stays `kind` so the
  // persisted column-switch stash (COLS_KEY) keeps meaning what it meant.
  { key: "kind", label: "Type" },
  {
    key: "script",
    label: "Script",
    title: "Scripts the filtered set saw this role in",
  },
  { key: "in", label: "In", title: "Games this role was in play" },
  { key: "share", label: "Share", title: "Share of the filtered set's games" },
  { key: "won", label: "Won" },
  { key: "winRate", label: "Win rate" },
  { key: "died", label: "Died", title: "Seats that did not survive" },
];
const GAME_COLUMNS = [
  { key: "town", label: "Town" },
  { key: "script", label: "Script" },
  { key: "seats", label: "Seats" },
  { key: "nights", label: "Nights", title: "Nights the town reached" },
  { key: "ran", label: "Ran", title: "Wall-clock length" },
  { key: "winner", label: "Winner" },
];

// The page's persisted preference — which columns. Best-effort localStorage
// like every stash in this fork: a browser that refuses it simply gets the
// defaults every visit. (FT-1298's view key retired with the chip tabs;
// junk or stale keys in the stash are filtered on restore.)
const COLS_KEY = "golem.records.cols";

/**
 * FT-1301: how many game ROWS the ledger renders. A cap on what is PAINTED,
 * never on what is counted — every figure above the list is over the whole
 * set; this only keeps a thousand-row set from stalling the page, and the
 * scope line says when it bites.
 */
const LIST_MAX = 200;

/**
 * FT-1308: how many suggestions the omnibar offers PER DIMENSION GROUP. Five
 * keeps three groups on screen at once; the popovers hold the full catalogs
 * for anything a fragment cannot reach.
 */
const OMNI_MAX = 5;

/**
 * FT-1301: THE FILTER STATE'S URL GRAMMAR — the page's question is a link.
 *
 *   ?chronicle=1        the records page is open (App.vue re-opens it on boot)
 *   ?fs=+Name / -Name   a script include / exclude (repeatable)
 *   ?fr=+id / -id       a role include / exclude (repeatable)
 *   ?ft=+id / -id       a town include / exclude (repeatable — FT-1304)
 *   ?fp=min-max         the players bound; either side may be empty
 *
 * URL, not localStorage, deliberately: a filtered view is a question worth
 * bookmarking and handing to someone else, and the column switches above are
 * the only thing here that is a personal preference.
 */
const URL_OPEN = "chronicle";
const URL_SCRIPT = "fs";
const URL_ROLE = "fr";
const URL_TOWN = "ft";
const URL_PLAYERS = "fp";

/** Interpolated median over a numeric list, 1 decimal, or null when empty. */
function medianOf(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const exact =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(exact * 10) / 10;
}

/** Mean over a numeric list, 1 decimal, or null when empty. */
function meanOf(values) {
  if (!values.length) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/**
 * The mode over a numeric list — {value, count, tied} or null when empty.
 * A TIED mode is flagged, never silently picked: with the top count shared,
 * naming one value would invent a typical figure out of an arbitrary choice
 * (the same discipline the retired server tables kept).
 */
function modeOf(values) {
  if (!values.length) return null;
  const counts = new Map();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best = null;
  let bestCount = 0;
  let tied = false;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  });
  return { value: best, count: bestCount, tied };
}

/** A share as a percentage, 1 decimal — null when the denominator is empty
 *  (null is never zero on this page; pct() prints it as "—"). */
function rateOf(part, whole) {
  if (!whole) return null;
  return Math.round((part / whole) * 1000) / 10;
}

export default {
  name: "StatsOverlay",
  components: { Modal, CloseX, ChroniclesPortrait, KeyCap },
  props: {
    /** The town this browser is standing in, or "" on the entry screen.
     *  It NARROWS NOTHING — the page is platform-scoped by definition; it
     *  only marks that town's rows in the ledger. */
    townId: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      /* FT-1146: `scope` ("town" | "platform") STOOD DOWN, not removed. This
       * surface answers one question — every town together — and the per-town
       * ledger it used to toggle to now lives in the Chronicles drawer, where
       * a town's own story is. The field stays so the shape of what this
       * panel used to be is still readable here. */
      scope: "platform",
      /** Kept null forever — only the stood-down players table's computed
       *  reads it (FT-1161; see loadStoodDownPlayers). The page's own
       *  figures come from `facts` now. */
      stats: null,
      /**
       * FT-1301: THE FACT ROWS — every game in the asked-for view, seats as
       * role facts, one read. Everything the landing renders is computed
       * from these; `loading`/`error` are the whole landing's states because
       * there is only one read to fail now.
       */
      facts: { loading: true, error: false, games: [] },
      /** The facts read's out-of-order guard: each loadFacts claims the next
       *  number, and an answer only lands while its number is still current —
       *  so a slow boot read cannot overwrite the flask's faster one (the
       *  retired combination question's own `seq` discipline, kept). */
      factsSeq: 0,
      /**
       * FT-1301: THE FILTERS — the page's question. Scripts and roles are
       * tri-state (an id lives in `include`, in `exclude`, or in neither);
       * players is a min/max bound, either side open. The state mirrors to
       * the URL on every change (see writeFiltersToUrl) so the question is
       * a bookmarkable link; it deliberately does NOT clear when the ledger
       * or towns scope flips — the question survives, asked of the new view.
       */
      filters: {
        scripts: { include: [], exclude: [] },
        roles: { include: [], exclude: [] },
        // FT-1304: towns are a tri-state dimension like scripts (include =
        // OR, a game is in exactly one town; exclude = NOT). The ENTRIES
        // offered are only the towns the signed-in viewer has sat in
        // (myTowns below), but the predicate applies to whatever the URL
        // hands in — a shared link filters the same set for every reader.
        towns: { include: [], exclude: [] },
        players: { min: null, max: null },
      },
      /**
       * FT-1304: THE VIEWER'S OWN TOWNS — the towns popover's entry list,
       * read once per page open (and re-read when the ledger flips): one
       * `scope=mine` facts read, reduced to distinct town ids. This is the
       * only survivor of FT-1299's scope=mine read — the page-wide My-towns
       * TOGGLE it served retired in favour of this filter.
       */
      myTowns: { loading: false, loaded: false, ids: [] },
      /** Which filter popover is open ('scripts' | 'roles' | 'players'), or
       *  null. A gesture, not a preference — never persisted. */
      openFilter: null,
      /**
       * FT-1308: THE OMNIBAR'S TEXT. FT-1304 had this filtering whichever
       * popover list was open; the search is permanent and primary now, and
       * this is its query — the suggestions (see `omni`) are computed from
       * it, and the popover lists browse their FULL catalogs unfiltered.
       */
      filterSearch: "",
      /** Esc closed the suggestions without leaving the input — typing again
       *  (or refocusing) reopens them. A gesture, never persisted. */
      omniDismissed: false,
      /** The lit suggestion (an index into omniFlat); Enter takes it. */
      omniIndex: 0,
      /** One Escape does ONE thing: when the omnibar's keydown consumed it
       *  (clearing the query), this swallows the document keyup so the page
       *  itself does not also step back. */
      escSwallow: false,
      /**
       * FT-1308: the histogram's live gesture — {type: 'bars'|'min'|'max',
       * anchor, preview:{min,max}} while a bar-drag or a handle-drag is under
       * way, null at rest. The bars tint from the PREVIEW during the drag and
       * the filter commits once, on release.
       */
      histDrag: null,
      /**
       * FT-1236: WHICH LEDGER the page is reading. False (always, for
       * everyone without labs) = real games — the Chronicles. True (labs
       * only, via the header toggle) = the DEV LEDGER: games played with
       * fake players / shift-click starts, `?test=only` on every read.
       * Never mixed — the server keeps the two ledgers disjoint.
       */
      testView: false,
      /* (FT-1304: `mineView` — FT-1299's page-wide My-towns toggle —
       * RETIRED, user call: narrowing by town is the towns FILTER now, one
       * grammar with scripts and roles. Its `scope=mine` read survives only
       * as `myTowns`'s source, above. It never had a URL token, so no param
       * maps forward.) */
      /**
       * FT-1297: the HIDDEN columns, per table — hidden rather than shown so
       * a column added later defaults to visible instead of vanishing for
       * every browser that ever saved a choice. Persisted (COLS_KEY).
       * FT-1301: the tables are `roles` and `games` now; a stash still
       * carrying the retired scripts table's keys is filtered on restore.
       */
      colsHidden: { roles: [], games: [] },
      /** Whether each table's column chips are unfolded. Not persisted — an
       *  open control is a gesture, not a preference. */
      colsOpen: { roles: false, games: false },
      /** The opened record: {id, loading, game} or null for the landing. */
      pick: null,
      /** That record's board portraits, read out of its town's log. */
      boards: { loading: false, start: null, day1: null, end: null },
    };
  },
  computed: {
    // FT-1236: `session` rides along for `session.labs` — the platform flag
    // that gates the dev-ledger toggle (FT-1226's fetch, no new mechanism).
    ...mapState(["recordsPick", "session"]),
    /** The table shows the platform's regulars, not everyone who ever sat. */
    topPlayers() {
      const players = (this.stats && this.stats.players) || [];
      return [...players]
        .sort((a, b) => b.games - a.games || b.wins - a.wins)
        .slice(0, TOP_PLAYERS);
    },
    /** FT-1297/FT-1301: the two remaining tables' toggleable columns. */
    roleColumns() {
      return ROLE_COLUMNS;
    },
    gameColumns() {
      return GAME_COLUMNS;
    },
    /**
     * FT-1301: THE SET — the games the filters keep, in the server's own
     * newest-first order. Every figure on the landing is computed over this
     * one array; nothing below can disagree with anything above it.
     */
    filteredGames() {
      return this.facts.games.filter((game) => this.inSet(game, null));
    },
    /**
     * The headline figures, over the set. Nights statistics are over the
     * games that RECORDED a length — a null dayCount contributes nothing
     * (FT-1163's rule), and an empty sample is null, which prints as "—",
     * never as 0. Players statistics are over every game in the set, since
     * every record carries its seat count.
     */
    totals() {
      const games = this.filteredGames;
      const good = games.filter((g) => g.winningTeam === "good").length;
      const nights = games
        .map((g) => g.dayCount)
        .filter((n) => typeof n === "number" && Number.isFinite(n));
      const seats = games
        .map((g) => g.playerCount)
        .filter((n) => Number.isFinite(n));
      return {
        games: games.length,
        wins: { good, evil: games.length - good },
        winRate: {
          good: rateOf(good, games.length),
          evil: rateOf(games.length - good, games.length),
        },
        nights: {
          n: nights.length,
          median: medianOf(nights),
          mean: meanOf(nights),
          mode: modeOf(nights),
        },
        players: { median: medianOf(seats), mean: meanOf(seats) },
      };
    },
    /** The nights mode for print: "3 ×2", "tied", or "—" on an empty sample
     *  — the retired Ran·mode column's own idiom, kept. */
    nightsModeFigure() {
      const mode = this.totals.nights.mode;
      if (!mode) return "—";
      if (mode.tied) return "tied";
      return mode.value + " ×" + mode.count;
    },
    /**
     * The per-role table, over the set. The server tables' own rules kept:
     * `games` counts DISTINCT games (a role recorded twice in one game
     * counts once), a role WON a game when a seat holding it ended on the
     * winning team (a game with the role on both sides counts once, for the
     * side that won), and `died` counts SEATS that did not survive.
     */
    roleRows() {
      const rows = new Map();
      this.filteredGames.forEach((game) => {
        const inGame = new Map();
        (game.seats || []).forEach((seat) => {
          const at = inGame.get(seat.roleId) || {
            type: seat.roleType,
            won: false,
            died: 0,
          };
          if (seat.teamAtEnd === game.winningTeam) at.won = true;
          if (!seat.survived) at.died += 1;
          inGame.set(seat.roleId, at);
        });
        inGame.forEach((at, roleId) => {
          const row = rows.get(roleId) || {
            roleId,
            roleType: at.type,
            games: 0,
            wins: 0,
            died: 0,
            // FT-1304: the scripts the set saw this role in — usually one,
            // a comma-joined few when the filters mix scripts.
            scriptSet: new Set(),
          };
          row.games += 1;
          if (at.won) row.wins += 1;
          row.died += at.died;
          row.scriptSet.add(game.scriptName);
          rows.set(roleId, row);
        });
      });
      const total = this.filteredGames.length;
      return [...rows.values()]
        .map((row) => ({
          ...row,
          share: rateOf(row.games, total),
          winRate: rateOf(row.wins, row.games),
          scripts: [...row.scriptSet].sort().join(", "),
        }))
        .sort((a, b) => b.games - a.games || (a.roleId < b.roleId ? -1 : 1));
    },
    /** The rows the ledger paints — the set, capped at LIST_MAX (a paint
     *  cap; the counting is always over the whole set). */
    listGames() {
      return this.filteredGames.slice(0, LIST_MAX);
    },
    /** The games table's honesty line — what it shows, and when the paint
     *  cap bit. */
    gamesClaim() {
      const n = this.filteredGames.length;
      if (n > LIST_MAX) {
        return (
          "The filtered set, newest first — showing the newest " +
          LIST_MAX +
          " of " +
          n +
          ". A row opens that game's record."
        );
      }
      return "The filtered set, newest first. A row opens that game's record.";
    },
    /**
     * FT-1301/FT-1305: the script popover's entries. The LIST is the app's
     * own script catalog (SCRIPT_CATALOG — the script-pick dropdown's cards,
     * art included), in the picker's own order, every entry always offered;
     * fact names no catalog knows (custom/imported scripts, and any name a
     * shared URL's filter hands in) are APPENDED after it wearing the stock
     * custom mark, so no game is ever unfilterable. The COUNT beside each is
     * FACETED: over the games the OTHER filters keep (this dimension's own
     * filter skipped), so the number is what picking the entry would give
     * you — 0 included, honestly.
     */
    scriptChoices() {
      const counts = new Map();
      this.facts.games.forEach((game) => {
        if (!counts.has(game.scriptName)) counts.set(game.scriptName, 0);
        if (!this.inSet(game, "scripts")) return;
        counts.set(game.scriptName, counts.get(game.scriptName) + 1);
      });
      const entries = [];
      const seen = new Set();
      SCRIPT_CATALOG.forEach((c) => {
        seen.add(c.name);
        entries.push({
          id: c.name,
          label: c.name,
          icon: c.icon,
          count: counts.get(c.name) || 0,
        });
      });
      // the facts' own strangers, then any name only the URL's filter knows
      const extras = new Set([
        ...counts.keys(),
        ...this.filters.scripts.include,
        ...this.filters.scripts.exclude,
      ]);
      [...extras]
        .filter((name) => !seen.has(name))
        .sort()
        .forEach((name) =>
          entries.push({
            id: name,
            label: name,
            icon: edCustom,
            count: counts.get(name) || 0,
          }),
        );
      // (FT-1308: no search narrowing here any more — the popover browses
      // the whole catalog; the omnibar's suggestions do the matching.)
      return entries;
    },
    /**
     * FT-1305: the roles popover's GROUPS — the full role registry (the same
     * source the night sheet and every token draw from), grouped by team in
     * sheet order, each entry wearing its token icon via the shared resolver.
     * Fact roles the registry lacks (custom roles), plus any id only the
     * URL's filter names, land in a trailing Custom group. Counts are the
     * faceted DISTINCT-games counts (see scriptChoices); zero-count roles
     * list, honestly. Search matches name or id.
     */
    roleGroups() {
      const counts = new Map();
      this.facts.games.forEach((game) => {
        const counted = this.inSet(game, "roles");
        this.gameRoleIds(game).forEach((id) => {
          if (!counts.has(id)) counts.set(id, 0);
          if (counted) counts.set(id, counts.get(id) + 1);
        });
      });
      const base = this.$store.getters.rolesJSONbyId;
      const entryOf = (id, role) => ({
        id,
        label: (role && role.name) || this.roleNameOf(id),
        icon: roleIconUrl(role || { id }, base),
        count: counts.get(id) || 0,
      });
      const groups = ROLE_TEAMS.map((t) => ({ label: t.label, entries: [] }));
      const byTeam = new Map(ROLE_TEAMS.map((t, i) => [t.id, groups[i]]));
      const custom = { label: "Custom", entries: [] };
      const seen = new Set();
      base.forEach((role) => {
        seen.add(role.id);
        (byTeam.get(role.team) || custom).entries.push(entryOf(role.id, role));
      });
      const extras = new Set([
        ...counts.keys(),
        ...this.filters.roles.include,
        ...this.filters.roles.exclude,
      ]);
      [...extras]
        .filter((id) => !seen.has(id))
        .forEach((id) => custom.entries.push(entryOf(id, null)));
      groups.push(custom);
      // (FT-1308: the search left this list — see scriptChoices' note.)
      return groups
        .map((g) => {
          g.entries.sort((a, b) => a.label.localeCompare(b.label));
          return g;
        })
        .filter((g) => g.entries.length);
    },
    /**
     * FT-1304: the towns popover's entries — the towns the signed-in viewer
     * has sat in (myTowns), never the whole view's towns: the filter offers
     * YOUR towns, exactly the scope the retired toggle offered. Counts are
     * faceted like the other dimensions — over the games the OTHER filters
     * keep — so an entry's number is what picking it would give you.
     */
    townChoices() {
      const counts = new Map();
      this.myTowns.ids.forEach((id) => counts.set(id, 0));
      this.facts.games.forEach((game) => {
        if (!counts.has(game.townId)) return;
        if (!this.inSet(game, "towns")) return;
        counts.set(game.townId, counts.get(game.townId) + 1);
      });
      // (FT-1308: the search left this list — see scriptChoices' note.)
      return [...counts.entries()]
        .map(([id, count]) => ({ id, label: id, count }))
        .sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1));
    },
    /** The open popover's flat entry list — scripts, roles or towns (players
     *  has no list). Roles flatten their groups; this is the emptiness check
     *  and the shared shape for anything that wants "every entry". */
    popChoices() {
      if (this.openFilter === "scripts") return this.scriptChoices;
      if (this.openFilter === "towns") return this.townChoices;
      return this.roleGroups.reduce((all, g) => all.concat(g.entries), []);
    },
    /** FT-1305: the open popover's GROUPED entries — roles carry real team
     *  groups; scripts and towns are one unlabelled group. */
    popGroups() {
      if (this.openFilter === "roles") return this.roleGroups;
      return [{ label: "", entries: this.popChoices }];
    },
    /**
     * FT-1305: THE READBACK CHIPS — every active filter entry, restated in
     * plain words, in the order the URL grammar writes them. Roles print
     * their display name (never the raw id); the players bound is one chip
     * for whatever sides it has.
     */
    filterChips() {
      const chips = [];
      const push = (dim, state, id, label) =>
        chips.push({
          key: dim + ":" + state + ":" + id,
          dim,
          state,
          id,
          label,
          mark: state === "in" ? "+" : "−",
        });
      ["scripts", "roles", "towns"].forEach((dim) => {
        const labelOf =
          dim === "roles" ? (id) => this.roleNameOf(id) : (id) => id;
        this.filters[dim].include.forEach((id) =>
          push(dim, "in", id, labelOf(id)),
        );
        this.filters[dim].exclude.forEach((id) =>
          push(dim, "out", id, labelOf(id)),
        );
      });
      const { min, max } = this.filters.players;
      if (min !== null || max !== null) {
        const label =
          min !== null && max !== null
            ? min + "–" + max + " seats"
            : min !== null
            ? min + "+ seats"
            : "up to " + max + " seats";
        chips.push({
          key: "players",
          dim: "players",
          state: "in",
          id: null,
          label,
          mark: "",
        });
      }
      return chips;
    },
    /** Is a LIST popover open? Gates the bar's search input and the shared
     *  list popover (the players popover is a pair of bounds, no list). */
    listPopOpen() {
      return (
        this.openFilter === "scripts" ||
        this.openFilter === "roles" ||
        this.openFilter === "towns"
      );
    },
    /**
     * FT-1304: the headline band's honest scope line. "Data from all towns"
     * until a towns filter narrows it; then the count of towns the set is
     * actually drawn from.
     */
    bandTitle() {
      const inc = this.filters.towns.include.length;
      const exc = this.filters.towns.exclude.length;
      if (inc) return "Data from " + inc + (inc === 1 ? " town" : " towns");
      if (exc) {
        return "Data from all but " + exc + (exc === 1 ? " town" : " towns");
      }
      return "Data from all towns";
    },
    /** Is the players bound doing anything? (Its icon's armed state.) */
    playersActive() {
      return (
        this.filters.players.min !== null || this.filters.players.max !== null
      );
    },
    /** Any filter at all — the clear-all button's cue. */
    anyFilterActive() {
      return (
        this.filterCount("scripts") > 0 ||
        this.filterCount("roles") > 0 ||
        this.filterCount("towns") > 0 ||
        this.playersActive
      );
    },
    /** FT-1308: the funnel glyph's badge — every active entry, every
     *  dimension, one count for the cluster it fronts. */
    funnelCount() {
      return (
        this.filterCount("scripts") +
        this.filterCount("roles") +
        this.filterCount("towns") +
        (this.playersActive ? 1 : 0)
      );
    },
    /**
     * FT-1308: THE SUGGESTIONS — the omnibar's answer to its query, grouped
     * by dimension (Scripts / Roles / Towns), each entry the popovers' own
     * {id, label, icon, count} shape so a pick here is exactly a pick there.
     *
     * RANKING (the your-call slot, exercised): within a group, best PREFIX
     * first — exact name (0), name-start (1), word-start (2), substring (3),
     * id-only (4) — ties broken by faceted count (descending: the likelier
     * pick first), then name. Five per group (OMNI_MAX). Entries already
     * filtered on are OMITTED — they are chips already, and re-offering them
     * here would make Enter a no-op tease.
     *
     * A NUMBER asks about seats instead: one Players group with the three
     * bounds (at least / exactly / at most), each carrying the faceted count
     * of games it would keep.
     */
    omni() {
      const groups = [];
      const flat = [];
      const q = this.filterSearch.trim();
      if (!q) return { groups, flat };
      if (/^\d+$/.test(q)) {
        const n = parseInt(q, 10);
        if (Number.isFinite(n) && n > 0 && n <= 99) {
          const faceted = this.facts.games.filter((g) =>
            this.inSet(g, "players"),
          );
          const bound = (op, label, keep) => ({
            kind: "players",
            op,
            n,
            label,
            fa: "user-friends",
            icon: null,
            key: "pl-" + op,
            count: faceted.filter(keep).length,
            flat: -1,
          });
          groups.push({
            label: "Players",
            entries: [
              bound(
                "min",
                "At least " + n + " seats",
                (g) => g.playerCount >= n,
              ),
              bound("exact", "Exactly " + n + " seats", (g) => {
                return g.playerCount === n;
              }),
              bound("max", "At most " + n + " seats", (g) => {
                return g.playerCount <= n;
              }),
            ],
          });
        }
      } else {
        const ql = q.toLowerCase();
        const scoreOf = (label, id) => {
          const l = label.toLowerCase();
          if (l === ql) return 0;
          if (l.indexOf(ql) === 0) return 1;
          if (l.split(/[\s'&-]+/).some((w) => w.indexOf(ql) === 0)) return 2;
          if (l.indexOf(ql) >= 0) return 3;
          if (id && String(id).toLowerCase().indexOf(ql) >= 0) return 4;
          return -1;
        };
        const build = (dim, label, source, fa) => {
          const matched = [];
          source.forEach((e) => {
            if (this.stateOf(dim, e.id) !== "") return; // already a chip
            const score = scoreOf(e.label, e.id);
            if (score < 0) return;
            matched.push({
              kind: "dim",
              dim,
              id: e.id,
              label: e.label,
              icon: e.icon || null,
              fa: e.icon ? null : fa,
              count: e.count,
              key: dim + "-" + e.id,
              score,
              flat: -1,
            });
          });
          matched.sort(
            (a, b) =>
              a.score - b.score ||
              b.count - a.count ||
              a.label.localeCompare(b.label),
          );
          if (matched.length) {
            groups.push({ label, entries: matched.slice(0, OMNI_MAX) });
          }
        };
        build("scripts", "Scripts", this.scriptChoices, null);
        build(
          "roles",
          "Roles",
          this.roleGroups.reduce((all, g) => all.concat(g.entries), []),
          null,
        );
        if (this.session.account) {
          build("towns", "Towns", this.townChoices, "home");
        }
      }
      groups.forEach((g) =>
        g.entries.forEach((e) => {
          e.flat = flat.length;
          flat.push(e);
        }),
      );
      return { groups, flat };
    },
    omniGroups() {
      return this.omni.groups;
    },
    /** The suggestions as one list — what ↑↓ walk and Enter takes from. */
    omniFlat() {
      return this.omni.flat;
    },
    /** Is the suggestion dropdown on screen? Text present and not Esc'd. */
    omniShown() {
      return !!this.filterSearch.trim() && !this.omniDismissed;
    },
    /**
     * FT-1308: THE SEAT HISTOGRAM's model — games per seat count over the
     * set the OTHER filters keep (the faceted-count discipline: the graph
     * shows what a players bound would actually catch). The domain runs
     * CONTINUOUSLY from the lowest observed count to the highest — a seat
     * count nobody played renders as an empty column, never silently
     * skipped, so the axis cannot lie about the spacing.
     */
    seatHistogram() {
      const counts = new Map();
      this.facts.games.forEach((game) => {
        if (!Number.isFinite(game.playerCount)) return;
        if (!this.inSet(game, "players")) return;
        counts.set(
          game.playerCount,
          (counts.get(game.playerCount) || 0) + 1,
        );
      });
      if (!counts.size) return { bars: [], lo: 0, hi: 0, max: 0 };
      const seats = [...counts.keys()];
      const lo = Math.min(...seats);
      const hi = Math.max(...seats);
      const bars = [];
      let max = 0;
      for (let s = lo; s <= hi; s += 1) {
        const count = counts.get(s) || 0;
        if (count > max) max = count;
        bars.push({ seats: s, count });
      }
      return { bars, lo, hi, max };
    },
    /** The range the histogram paints — the drag's preview while one is
     *  under way, the committed filter otherwise. */
    histRange() {
      return this.histDrag ? this.histDrag.preview : this.filters.players;
    },
    /** Is any seat bound live (committed or previewed)? Off = every bar
     *  neutral; on = the span green, the rest dim. */
    histActive() {
      return this.histRange.min !== null || this.histRange.max !== null;
    },
    /** The rail's selected stretch, between the handles. */
    histFillStyle() {
      if (!this.histActive) return { display: "none" };
      const { lo, hi } = this.seatHistogram;
      const r = this.histRange;
      const a = this.histPct(r.min === null ? lo : r.min);
      const b = this.histPct(r.max === null ? hi : r.max);
      return { left: a + "%", width: Math.max(0, b - a) + "%" };
    },
    /** Half a column's inset each side, so the rail's 0%–100% runs under
     *  the bar CENTRES and a handle stands under its own bar. */
    histTrackStyle() {
      const n = this.seatHistogram.bars.length || 1;
      const inset = 50 / n + "%";
      return { marginLeft: inset, marginRight: inset };
    },
  },
  watch: {
    /** Typing re-arms the suggestions, re-lights the top row, and (signed
     *  in) warms the towns list so town suggestions can answer; a non-empty
     *  keystroke also closes any browse popover — the two surfaces never
     *  stand open together. */
    filterSearch() {
      this.omniDismissed = false;
      this.omniIndex = 0;
      if (this.filterSearch.trim()) {
        this.openFilter = null;
        if (this.session.account) this.loadMyTowns();
      }
    },
  },
  created() {
    // FT-1297: the persisted column choices, before the first render — a
    // flash of the default columns would read as the page forgetting.
    this.restorePrefs();
    // FT-1301: a bookmarked question — the URL's filter params, restored
    // before the first read so the first paint is already the asked view;
    // then the URL is re-stamped so an open page always carries its flag.
    this.readFiltersFromUrl();
    this.writeFiltersToUrl();
    this.loadFacts();
    // FT-1146: the Chronicles drawer's boards line hands a game in — the page
    // opens straight onto that record rather than its landing view.
    if (this.recordsPick) {
      this.openPick(this.recordsPick);
      this.$store.commit("setRecordsPick", null);
    }
  },
  mounted() {
    document.addEventListener("keyup", this.onKeyup);
    // FT-1301: a click anywhere outside the filter bar closes its popover.
    // Capture phase, so a click that a child swallows still counts as "away".
    document.addEventListener("mousedown", this.onAwayClick, true);
  },
  destroyed() {
    document.removeEventListener("keyup", this.onKeyup);
    document.removeEventListener("mousedown", this.onAwayClick, true);
    // FT-1308: a histogram drag's document listeners, if the page closes
    // mid-gesture (they are otherwise removed on the gesture's own mouseup).
    document.removeEventListener("mousemove", this.onHandleMove);
    document.removeEventListener("mouseup", this.onHistUp);
    // FT-1301: a closed page stops claiming the URL — its flag and filter
    // params leave with it, so a copied link only ever says what is on
    // screen. (replaceState: closing the page is not a history event.)
    this.clearUrlFilters();
  },
  methods: {
    lengthOf,
    whenLabel,
    lengthLabel,
    /** FT-1162: the script's own mark, from the only handle a record carries
     *  (its display name). Always a bundled image — see scriptArtFor. */
    scriptArt(game) {
      return scriptArtFor(game && game.scriptName);
    },
    /**
     * FT-1162: how many DAYS the game ran, or null when the record does not
     * say — which today is every record, because nothing captures it yet.
     * Null means the caller renders nothing at all: a missing day count is a
     * gap in the record, and a "0" or a "—" would read as a fact about the
     * game rather than a fact about the ledger.
     */
    dayLabel(game) {
      const days = game && game.dayCount;
      if (typeof days !== "number" || !Number.isFinite(days) || days <= 0) {
        return null;
      }
      return days === 1 ? "1 day" : days + " days";
    },
    /** Escape steps BACK one level — out of the omnibar's suggestions
     *  (FT-1308, swallowed at the input's own keydown), out of an open
     *  popover, out of a record to the landing, out of the landing to
     *  wherever the reader came from. A single key that closed the whole
     *  page from inside a record would throw away the click that opened
     *  it. */
    onKeyup(e) {
      if (e.key !== "Escape") return;
      if (this.escSwallow) {
        this.escSwallow = false;
        return;
      }
      if (this.openFilter) {
        this.openFilter = null;
        return;
      }
      if (this.pick) this.closePick();
      else this.$emit("close");
    },
    /**
     * FT-1301: ONE read for the whole landing view — the fact rows. One read
     * means one loading state, one failure, and one total that every figure
     * on the page is computed from; the old breakdown/ledger pair could
     * disagree with each other and now has nothing to disagree about. (The
     * server aggregates stay; this page just no longer renders from them.)
     */
    loadFacts() {
      const seq = this.factsSeq + 1;
      this.factsSeq = seq;
      this.facts = { loading: true, error: false, games: [] };
      // (FT-1304: no `mine` scope here any more — the page always reads the
      // whole view; narrowing by town happens client-side, as a filter.)
      gameFacts(this.testView)
        .then((games) => {
          if (this.factsSeq !== seq) return;
          this.facts = { loading: false, error: false, games };
        })
        .catch(() => {
          if (this.factsSeq !== seq) return;
          this.facts = { loading: false, error: true, games: [] };
        });
    },
    /**
     * FT-1236: flip between the Chronicles and the dev ledger (labs only —
     * the toggle that calls this does not render otherwise). A DIFFERENT
     * LEDGER IS A DIFFERENT PAGE: the open record, the combination question
     * and every table are about the other ledger's games, so nothing is
     * carried across — everything re-asks with the new view.
     */
    toggleTestView() {
      this.testView = !this.testView;
      // FT-1304: the viewer's town list is per-ledger too — the dev ledger's
      // fixture towns and the real Chronicles' towns are different worlds.
      this.myTowns = { loading: false, loaded: false, ids: [] };
      this.reask();
      if (this.openFilter === "towns") this.loadMyTowns();
    },
    /* (FT-1304: `setMineView` retired with the toggle it served — see the
     * `mineView` note in data(). The towns FILTER is the narrowing now.) */
    /**
     * FT-1236/FT-1299: a DIFFERENT LEDGER IS A DIFFERENT PAGE — shared by the
     * dev-ledger toggle and the towns filter. The open record and every
     * figure are about the other view's games, so the read re-asks under the
     * new view. FT-1301 amends one thing: the FILTERS survive the flip —
     * they are the page's question and live in the URL, and the same
     * question asked of a different ledger is exactly what the flip means.
     */
    reask() {
      this.pick = null;
      this.boards = { loading: false, start: null, day1: null, end: null };
      this.loadFacts();
    },
    // ── FT-1301: the filter grammar ─────────────────────────────────────────
    /** Open one filter's popover (closing any other); a second click closes. */
    togglePop(id) {
      this.openFilter = this.openFilter === id ? null : id;
      // FT-1308: opening a browse popover stands the suggestions down (the
      // query keeps; typing again brings them back) — the two surfaces never
      // stand open together. FT-1304's search-focus went with the coupling.
      if (this.openFilter) this.omniDismissed = true;
      // FT-1304: the towns list is fetched on first need, cached per page
      // open.
      if (this.openFilter === "towns") this.loadMyTowns();
    },
    /** FT-1308: clicking into the search is choosing the speed surface —
     *  any browse popover closes, and a dismissed dropdown re-arms. */
    onSearchFocus() {
      this.openFilter = null;
      this.omniDismissed = false;
    },
    /**
     * FT-1308: the omnibar's keyboard — ↑↓ walk the flat suggestion list,
     * Enter takes the lit row (Alt+Enter as an exclude), Escape clears the
     * query and closes the dropdown (swallowing the page's own Escape step
     * via escSwallow — one press, one action).
     */
    onOmniKeydown(e) {
      if (e.key === "Escape") {
        if (this.omniShown || this.filterSearch) {
          this.filterSearch = "";
          this.omniDismissed = true;
          this.escSwallow = true;
        }
        return;
      }
      if (!this.omniShown || !this.omniFlat.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.omniIndex = (this.omniIndex + 1) % this.omniFlat.length;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.omniIndex =
          (this.omniIndex + this.omniFlat.length - 1) % this.omniFlat.length;
      } else if (e.key === "Enter") {
        e.preventDefault();
        const at = Math.min(this.omniIndex, this.omniFlat.length - 1);
        this.pickSuggestion(this.omniFlat[at], e.altKey);
      }
    },
    /**
     * FT-1308: take one suggestion. A dimension row lands the entry in
     * exactly one list — include normally, exclude on the Alt path (the −
     * affordance, Alt+click, Alt+Enter). A players row sets the bound it
     * names, dropping a bound the pick would contradict (at least 9 with
     * "at most 7" standing would define an empty set — the pick wins).
     * Then the input CLEARS AND KEEPS FOCUS, so the next term can follow
     * without a click.
     */
    pickSuggestion(entry, exclude) {
      if (!entry) return;
      if (entry.kind === "players") {
        const p = this.filters.players;
        if (entry.op === "exact") {
          p.min = entry.n;
          p.max = entry.n;
        } else if (entry.op === "min") {
          p.min = entry.n;
          if (p.max !== null && p.max < entry.n) p.max = null;
        } else {
          p.max = entry.n;
          if (p.min !== null && p.min > entry.n) p.min = null;
        }
      } else {
        const f = this.filters[entry.dim];
        [f.include, f.exclude].forEach((list) => {
          const at = list.indexOf(entry.id);
          if (at >= 0) list.splice(at, 1);
        });
        (exclude ? f.exclude : f.include).push(entry.id);
      }
      this.writeFiltersToUrl();
      this.filterSearch = "";
      this.omniIndex = 0;
      this.$nextTick(() => {
        if (this.$refs.search) this.$refs.search.focus();
      });
    },
    /**
     * FT-1304: the towns the signed-in viewer has sat in — ONE scope=mine
     * facts read per page open (per ledger — see toggleTestView), reduced to
     * distinct town ids. A failed read leaves `loaded` false so the next
     * open of the popover simply retries.
     */
    loadMyTowns() {
      if (this.myTowns.loading || this.myTowns.loaded) return;
      if (!this.session.account) return;
      this.myTowns = { loading: true, loaded: false, ids: [] };
      gameFacts(this.testView, true)
        .then((games) => {
          const ids = [...new Set(games.map((g) => g.townId))].sort();
          this.myTowns = { loading: false, loaded: true, ids };
        })
        .catch(() => {
          this.myTowns = { loading: false, loaded: false, ids: [] };
        });
    },
    /** A click outside the filter bar closes whatever popover is open — and
     *  (FT-1308) stands the suggestion dropdown down the same way. */
    onAwayClick(e) {
      if (!this.openFilter && !this.omniShown) return;
      const bar = this.$refs.toolbar;
      if (bar && bar.contains(e.target)) return;
      this.openFilter = null;
      this.omniDismissed = true;
    },
    /** An entry's tri-state: "in" (include), "out" (exclude), or "". */
    stateOf(dim, id) {
      if (this.filters[dim].include.indexOf(id) >= 0) return "in";
      if (this.filters[dim].exclude.indexOf(id) >= 0) return "out";
      return "";
    },
    /** The entry's printed mark for that state. */
    markOf(dim, id) {
      const state = this.stateOf(dim, id);
      return state === "in" ? "+" : state === "out" ? "−" : "";
    },
    /** Click cycles: off → include → exclude → off. */
    cycleFilter(dim, id) {
      const f = this.filters[dim];
      const inAt = f.include.indexOf(id);
      const outAt = f.exclude.indexOf(id);
      if (inAt < 0 && outAt < 0) f.include.push(id);
      else if (inAt >= 0) {
        f.include.splice(inAt, 1);
        f.exclude.push(id);
      } else {
        f.exclude.splice(outAt, 1);
      }
      this.writeFiltersToUrl();
    },
    /** How many entries a dimension's filter names — its icon's badge. */
    filterCount(dim) {
      const f = this.filters[dim];
      return f.include.length + f.exclude.length;
    },
    /** One bound of the players filter; empty (or junk) clears that side.
     *  (FT-1308: STOOD DOWN with the number boxes it read — the histogram's
     *  bars, handles and the omnibar's number suggestions set the bounds
     *  now. Kept, house rule, as the working input-parsing version.) */
    setPlayersBound(side, event) {
      const n = parseInt(event.target.value, 10);
      this.filters.players[side] = Number.isFinite(n) && n > 0 ? n : null;
      this.writeFiltersToUrl();
    },
    // ── FT-1308: the seat histogram's gestures ──────────────────────────────
    /** A bar's paint: "sel" inside the live range, "off" outside it, bare
     *  when no bound is live at all. */
    barClass(seats) {
      if (!this.histActive) return "";
      const { min, max } = this.histRange;
      const inRange =
        (min === null || seats >= min) && (max === null || seats <= max);
      return inRange ? "sel" : "off";
    },
    /** A bar's height, scaled to the tallest count. Zero games is zero
     *  height (the axis label still stands); anything counted keeps at
     *  least a readable stub. */
    barHeight(count) {
      if (!count) return "0px";
      const max = this.seatHistogram.max || 1;
      return Math.max(4, Math.round((count / max) * 64)) + "px";
    },
    /** A seat count's place on the rail, percent across the domain. */
    histPct(seats) {
      const { lo, hi } = this.seatHistogram;
      if (hi <= lo) return 50;
      const s = Math.max(lo, Math.min(hi, seats));
      return ((s - lo) / (hi - lo)) * 100;
    },
    /** Where a handle stands: its bound's own bar centre, or parked at the
     *  rail's end when that side is open. */
    handleLeft(side) {
      const { lo, hi } = this.seatHistogram;
      const r = this.histRange;
      const seats =
        side === "min"
          ? r.min === null
            ? lo
            : r.min
          : r.max === null
            ? hi
            : r.max;
      return this.histPct(seats) + "%";
    },
    /** Press on a bar: begin a bar-drag whose span is that bar alone —
     *  released in place it is a click (exactly N), swept across bars it
     *  is a span. */
    onBarDown(seats) {
      this.histDrag = {
        type: "bars",
        anchor: seats,
        preview: { min: seats, max: seats },
      };
      document.addEventListener("mouseup", this.onHistUp);
    },
    /** Sweep across a bar mid-drag: the span runs anchor→here, either way. */
    onBarEnter(seats) {
      if (!this.histDrag || this.histDrag.type !== "bars") return;
      const a = this.histDrag.anchor;
      this.histDrag = {
        ...this.histDrag,
        preview: { min: Math.min(a, seats), max: Math.max(a, seats) },
      };
    },
    /** Press on a rail handle: begin dragging that bound. */
    onHandleDown(side) {
      this.histDrag = { type: side, preview: { ...this.filters.players } };
      document.addEventListener("mousemove", this.onHandleMove);
      document.addEventListener("mouseup", this.onHistUp);
    },
    /** Drag a handle along the rail: the nearest seat count takes the
     *  bound; the rail's outer 2% is the PARK — that side goes open. A
     *  bound never crosses its partner; it stops against it. */
    onHandleMove(e) {
      if (!this.histDrag || this.histDrag.type === "bars") return;
      const track = this.$refs.histTrack;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      if (!rect.width) return;
      const { lo, hi } = this.seatHistogram;
      const f = (e.clientX - rect.left) / rect.width;
      const seats = Math.round(Math.max(0, Math.min(1, f)) * (hi - lo)) + lo;
      const side = this.histDrag.type;
      const preview = { ...this.histDrag.preview };
      if (side === "min") {
        if (f <= 0.02) preview.min = null;
        else {
          preview.min =
            preview.max === null ? seats : Math.min(seats, preview.max);
        }
      } else if (f >= 0.98) preview.max = null;
      else {
        preview.max =
          preview.min === null ? seats : Math.max(seats, preview.min);
      }
      this.histDrag = { ...this.histDrag, preview };
    },
    /** Release: commit the preview ONCE. A plain click on the bar that is
     *  already the exact bound toggles the bound off — the tri-state
     *  entries' own second-click instinct. */
    onHistUp() {
      document.removeEventListener("mousemove", this.onHandleMove);
      document.removeEventListener("mouseup", this.onHistUp);
      const drag = this.histDrag;
      this.histDrag = null;
      if (!drag) return;
      const { min, max } = drag.preview;
      const p = this.filters.players;
      if (drag.type === "bars" && min === max && p.min === min && p.max === max) {
        p.min = null;
        p.max = null;
      } else {
        p.min = min;
        p.max = max;
      }
      this.writeFiltersToUrl();
    },
    /** ←/→ on a focused handle nudge its bound one seat; stepping past the
     *  rail's end parks it open, the drag's own grammar. */
    onHandleKey(side, e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const { lo, hi } = this.seatHistogram;
      const delta = e.key === "ArrowRight" ? 1 : -1;
      const p = this.filters.players;
      if (side === "min") {
        const cur = p.min === null ? lo - 1 : p.min;
        const next = cur + delta;
        p.min =
          next < lo ? null : Math.min(next, p.max === null ? hi : p.max);
      } else {
        const cur = p.max === null ? hi + 1 : p.max;
        const next = cur + delta;
        p.max =
          next > hi ? null : Math.max(next, p.min === null ? lo : p.min);
      }
      this.writeFiltersToUrl();
    },
    /** FT-1305: one readback chip's ×. Clearing the last chip leaves the
     *  page exactly where Clear filters would — same state, same URL. */
    clearChip(chip) {
      if (chip.dim === "players") {
        this.filters.players.min = null;
        this.filters.players.max = null;
      } else {
        const list =
          this.filters[chip.dim][chip.state === "in" ? "include" : "exclude"];
        const at = list.indexOf(chip.id);
        if (at >= 0) list.splice(at, 1);
      }
      this.writeFiltersToUrl();
    },
    /** The one-click way back to the unfiltered page. */
    clearFilters() {
      this.filters.scripts.include.splice(0);
      this.filters.scripts.exclude.splice(0);
      this.filters.roles.include.splice(0);
      this.filters.roles.exclude.splice(0);
      this.filters.towns.include.splice(0);
      this.filters.towns.exclude.splice(0);
      this.filters.players.min = null;
      this.filters.players.max = null;
      this.writeFiltersToUrl();
    },
    /** The distinct roles a game's board held. */
    gameRoleIds(game) {
      return new Set((game.seats || []).map((seat) => seat.roleId));
    },
    /**
     * Does a game pass the filters? `skip` names ONE dimension to ignore —
     * how the popovers compute their faceted counts (an entry's count is
     * over the games the OTHER filters keep).
     *
     * The include semantics differ BY DIMENSION, deliberately:
     *   - script includes are an OR — a game is of exactly one script, so
     *     multiple includes widen across scripts (an AND would define an
     *     empty set);
     *   - role includes are an AND — every included role must have been in
     *     play together (the retired "Roles together" question, absorbed);
     *   - town includes are an OR (FT-1304) — a game is in exactly one town,
     *     the scripts rule again;
     *   - every exclude is a NOT, all dimensions.
     */
    inSet(game, skip) {
      const f = this.filters;
      if (skip !== "towns") {
        if (
          f.towns.include.length &&
          f.towns.include.indexOf(game.townId) < 0
        ) {
          return false;
        }
        if (f.towns.exclude.indexOf(game.townId) >= 0) return false;
      }
      if (skip !== "scripts") {
        if (
          f.scripts.include.length &&
          f.scripts.include.indexOf(game.scriptName) < 0
        ) {
          return false;
        }
        if (f.scripts.exclude.indexOf(game.scriptName) >= 0) return false;
      }
      if (
        skip !== "roles" &&
        (f.roles.include.length || f.roles.exclude.length)
      ) {
        const roles = this.gameRoleIds(game);
        for (const id of f.roles.include) if (!roles.has(id)) return false;
        for (const id of f.roles.exclude) if (roles.has(id)) return false;
      }
      if (skip !== "players") {
        const { min, max } = f.players;
        if (min !== null && game.playerCount < min) return false;
        if (max !== null && game.playerCount > max) return false;
      }
      return true;
    },
    /** The URL's filter params → state (see the grammar by URL_OPEN). */
    readFiltersFromUrl() {
      const qs = new URLSearchParams(window.location.search);
      const read = (key, into) => {
        qs.getAll(key).forEach((raw) => {
          if (!raw || raw.length < 2) return;
          const id = raw.slice(1);
          if (raw[0] === "+") into.include.push(id);
          else if (raw[0] === "-") into.exclude.push(id);
        });
      };
      read(URL_SCRIPT, this.filters.scripts);
      read(URL_ROLE, this.filters.roles);
      read(URL_TOWN, this.filters.towns);
      const fp = qs.get(URL_PLAYERS);
      if (fp) {
        const dash = fp.indexOf("-");
        const min = parseInt(fp.slice(0, dash), 10);
        const max = parseInt(fp.slice(dash + 1), 10);
        if (Number.isFinite(min) && min > 0) this.filters.players.min = min;
        if (Number.isFinite(max) && max > 0) this.filters.players.max = max;
      }
    },
    /** State → the URL, replaceState (a filter tweak is not a history hop). */
    writeFiltersToUrl() {
      const qs = new URLSearchParams(window.location.search);
      [URL_SCRIPT, URL_ROLE, URL_TOWN, URL_PLAYERS].forEach((k) =>
        qs.delete(k),
      );
      qs.set(URL_OPEN, "1");
      this.filters.scripts.include.forEach((id) =>
        qs.append(URL_SCRIPT, "+" + id),
      );
      this.filters.scripts.exclude.forEach((id) =>
        qs.append(URL_SCRIPT, "-" + id),
      );
      this.filters.roles.include.forEach((id) => qs.append(URL_ROLE, "+" + id));
      this.filters.roles.exclude.forEach((id) => qs.append(URL_ROLE, "-" + id));
      this.filters.towns.include.forEach((id) => qs.append(URL_TOWN, "+" + id));
      this.filters.towns.exclude.forEach((id) => qs.append(URL_TOWN, "-" + id));
      const { min, max } = this.filters.players;
      if (min !== null || max !== null) {
        qs.set(
          URL_PLAYERS,
          (min === null ? "" : min) + "-" + (max === null ? "" : max),
        );
      }
      this.replaceQuery(qs);
    },
    /** Strip every param this page owns — the closed page's URL honesty. */
    clearUrlFilters() {
      const qs = new URLSearchParams(window.location.search);
      [URL_OPEN, URL_SCRIPT, URL_ROLE, URL_TOWN, URL_PLAYERS].forEach((k) =>
        qs.delete(k),
      );
      this.replaceQuery(qs);
    },
    replaceQuery(qs) {
      const q = qs.toString();
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (q ? "?" + q : "") + window.location.hash,
      );
    },
    /** FT-1297: is a table's column visible? Hidden is the stored fact. */
    colOn(table, key) {
      return this.colsHidden[table].indexOf(key) < 0;
    },
    /** FT-1297: show/hide one column, and remember the choice. */
    toggleCol(table, key) {
      const hidden = this.colsHidden[table];
      const at = hidden.indexOf(key);
      if (at >= 0) hidden.splice(at, 1);
      else hidden.push(key);
      try {
        localStorage.setItem(COLS_KEY, JSON.stringify(this.colsHidden));
      } catch (e) {
        // storage refused — the choice lives for this visit only
      }
    },
    /**
     * The persisted column choices, defensively read: only known tables and
     * known column keys survive — junk in storage (or a stash from the
     * retired scripts table, or a retired key like the death scales) must
     * never be able to hide a column no chip can bring back.
     */
    restorePrefs() {
      try {
        const raw = JSON.parse(localStorage.getItem(COLS_KEY)) || {};
        const legal = {
          roles: ROLE_COLUMNS.map((c) => c.key),
          games: GAME_COLUMNS.map((c) => c.key),
        };
        ["roles", "games"].forEach((table) => {
          if (!Array.isArray(raw[table])) return;
          this.colsHidden[table] = raw[table].filter(
            (key) => legal[table].indexOf(key) >= 0,
          );
        });
      } catch (e) {
        // no storage or junk — defaults stand
      }
    },
    /**
     * THE STOOD-DOWN PLAYERS TABLE'S READ, kept beside its markup.
     *
     * Not called. FT-1161 took the platform-wide players table off this page
     * because it named people, and FT-1164 took the `players` rows off the
     * platform endpoint itself — hiding a list in a client is not privacy
     * while the endpoint still publishes it, so the field is now absent from
     * what `platformStats()` returns and this would fetch nothing to show.
     *
     * It stays because the scoped version of that table is a surface the user
     * does want ("users should get access to the player info of towns they
     * have been in"), and when it returns it will call `townStats(id)` —
     * per town, where names belong — not this. Kept, like the markup, so the
     * shape is here rather than rebuilt later from memory.
     */
    loadStoodDownPlayers() {
      return platformStats();
    },
    /**
     * FT-1164: a percentage for print — "64.3%", or "—" when there is no rate
     * to print at all.
     *
     * NULL IS NOT ZERO here either. The server sends null for a rate whose
     * denominator was empty, and rendering that as "0%" would turn "no games
     * to judge by" into "it never wins", which is the exact class of lie this
     * whole surface is built to avoid.
     */
    pct(value) {
      if (typeof value !== "number" || !Number.isFinite(value)) return "—";
      return value + "%";
    },
    /** A median or mean for print, or "—" when the sample was empty. */
    num(value) {
      if (typeof value !== "number" || !Number.isFinite(value)) return "—";
      return String(value);
    },
    /* (FT-1301: the retired sections' print helpers — nights, ranModeLabel,
     * playersLabel, modeLabel — and the combination methods left with the
     * markup they served; the "Roles together" question is a role-include
     * conjunction on the filter bar now, and the length statistics print
     * from `totals`/`nightsModeFigure`. The separate ledger read went the
     * same way: the games list IS the filtered set.) */
    /**
     * THE VIEWER'S OWN CROSS-TOWN LEDGER, stood down.
     *
     * Not called. This is what `loadLedger` did before FT-1155 made the town
     * optional: fan the per-town read out over the towns on this browser's
     * shelf and merge them. The platform read replaced it here — but the
     * shelf itself is exactly the scope the per-town player figures are
     * coming back under ("the towns they have been in"), and this is the only
     * code that knows how to merge and sort across them. Kept, per the house
     * never-delete rule, so that surface starts from the working version
     * rather than a remembered one.
     */
    loadViewerTownLedger() {
      return crossTownGames(knownTownIds());
    },
    openPick(id) {
      if (!id) return;
      this.pick = { id, loading: true, game: null };
      this.boards = { loading: true, start: null, day1: null, end: null };
      gameRecord(id)
        .then((game) => {
          if (!this.pick || this.pick.id !== id) return;
          this.pick = { id, loading: false, game };
          this.loadBoards(game);
        })
        .catch(() => {
          if (!this.pick || this.pick.id !== id) return;
          this.pick = { id, loading: false, game: null };
          this.boards = { loading: false, start: null, day1: null, end: null };
        });
    },
    closePick() {
      this.pick = null;
      this.boards = { loading: false, start: null, day1: null, end: null };
    },
    /**
     * A game's two portraits. They are NOT part of the games record — they
     * are `board` event rows in the town's own message log (golem/chronicles),
     * and the bridge between the two sides is the deal instant: the log's
     * game id is `g-<town>-<ms>` and the record's `startedAt` IS that instant.
     * A record with no start has no bridge and therefore no boards, honestly.
     */
    loadBoards(game) {
      const logGameId = logGameIdOf(game.townId, game.startedAt);
      if (!logGameId) {
        this.boards = { loading: false, start: null, day1: null, end: null };
        return;
      }
      const rows = [];
      catchUp(game.townId, 0, (page) => rows.push(...page))
        .then(() => {
          if (!this.pick || !this.pick.game || this.pick.game.id !== game.id) {
            return;
          }
          this.boards = { loading: false, ...boardsOf(rows, logGameId) };
        })
        .catch(() => {
          this.boards = { loading: false, start: null, day1: null, end: null };
        });
    },
    /** A role id's display name — the loaded edition first, the full official
     *  library second, the raw id when neither knows it (a custom role). */
    roleNameOf(id) {
      if (!id) return "—";
      const role =
        this.$store.state.roles.get(id) ||
        this.$store.getters.rolesJSONbyId.get(id);
      return (role && role.name) || id;
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
@import "../controls.scss";
// FT-1188: the big surface's shared chrome — the head rows, the title and the
// panel material, all lifted out of the Scripts workbench so both surfaces
// read one definition. Variables and mixins only; importing adds no rules.
@import "../surface.scss";
// FT-1370 (user: "the style of this whole Chronicle needs an overhaul… the
// biggest doesn't-fit is the sections, borders, and dropdowns"): the page
// joins the tower's own material world. The bands wear the app's one glass
// (face-disc-menu-plate — the plate AccountDoor, the corner menus and the
// hotkeys panel float on), and every line on the page that was a generic
// bone/white hairline speaks the settings rail's plum instead
// (rgba(120,105,135,·) — HostTools' tab-strip seam and leaf edges, FT-1108's
// dropdown family). Mixins only; importing adds no rules.
@import "../faceDisc.scss";

// THE PAGE, INSIDE THE SHELL.
//
// It used to paint its own: `position: fixed; inset: 0; z-index: 90;
// background: #0a0706` — a full-window opaque page that owed nothing to any
// other surface in the app. FT-1188 handed all four of those to Modal (the
// veil, the plate, the stacking, the close mark), which is what makes this the
// same object as the Scripts workbench rather than a lookalike.
//
// THE OPACITY WENT WITH THEM, on purpose. The note that used to stand here
// said the page had to be opaque because "the clock face reading through a
// ring of role coins" is unreadable — true, and already solved one level down:
// ChroniclesPortrait paints an opaque plate under every ring for exactly that
// reason. The page never needed to be opaque; the RINGS did, and they are.
.records-page {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  color: #d8cdb4;
  text-align: left;
}

// FT-1188: THE BENCH'S TWO-ROW HEAD (surface.scss) — title alone on row one,
// controls on row two. FT-1162's requirement survives intact and is now
// cheaper to hold: the title centres against the SHELL rather than against
// whatever happens to be beside it, and Back keeps the far left on its own
// because the close × has left this header for the shell's corner.
.rp-head {
  @include surface-head;
  // FT-1370: the head's rule was the page's first generic hairline (the
  // bench's white 0.15). It speaks the settings rail's plum seam now — the
  // exact value HostTools rules its tab strip with. (The bench keeps its
  // own; unifying the family is a follow-up call, not this pass's.)
  border-bottom-color: rgba(120, 105, 135, 0.45);
}
.rp-row1 {
  @include surface-head-title-row;
}
// THE TITLE, the bench's own — same class, same mixin, same computed size.
// Scoped styles do not travel between components, so this include is what
// makes "the same treatment" true rather than merely claimed: `.almanac-title`
// in EditionModal's sheet cannot reach this element, and a copy of its
// declarations here is exactly the fourth copy this work exists to prevent.
.almanac-title {
  @include surface-title;
}
.rp-row2 {
  @include surface-head-control-row;
  min-height: 24px;
}

// The subtitle holds the true centre column, under the word it belongs to.
.rp-sub {
  grid-column: 2;
  margin: 0;
  opacity: 0.55;
  font-size: 14px;
  text-align: center;
}

// FT-1162: the FAR LEFT of the head, on its own, where nothing else lives —
// "step back one level" no longer shares a corner with "leave the page".
.rp-back {
  grid-column: 1;
  justify-self: start;
  @include control-plate;
  font-family: inherit;
  font-size: 13px;
  color: #d8cdb4;
  padding: 4px 12px;
  cursor: pointer;

  &:hover {
    color: #fff;
    @include control-plate-hover;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
}

// (FT-1301: `.rp-devtoggle` left with its button — the dev-ledger door is
// the flask in the filter bar now, styled with the rest of the tools.)

// ...and the subtitle wears the same amber while the dev ledger is open —
// the page-level "you are not reading the real Chronicles" marking.
.rp-sub.dev {
  color: #e6c56b;
  opacity: 0.85;
}

// STOOD DOWN with the mark it sized (FT-1188) — the shell's × is 30px in the
// plate's own corner, and this page no longer paints one.
.rp-close {
  grid-column: 3;
  justify-self: end;
  width: 22px;
  height: 22px;
  flex: 0 0 auto;
}

// The scroller. Its side padding is DELIBERATELY THIN — the shell already pads
// 20px either side, and every px here comes off the width the board rings get
// in a record.
.rp-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 4px 24px;
}

// ── A BAND IS A PANEL ───────────────────────────────────────────────────────
// FT-1188: each band stands in its own frame, the way the bench's content
// does, instead of being separated from its neighbour by a hairline. The frame
// carries its own ground as well as its edge — the shell alone leaves enough
// of the town reading through to sit inside a column of 12px figures (see
// surface.scss). The town still shows between the panels, which is the point.
.rp-band,
.rp-panel {
  // FT-1370 (the user's first-named misfit): the bands stop wearing
  // surface-panel's white hairline on flat black and wear the tower's own
  // panel material — face-disc-menu-plate, the SAME glass the account door,
  // the corner menus, the hotkeys panel and the seat plate float on. $r/
  // $radius are AccountDoor's own pair (360px/10px — the door is the glass
  // at reading-surface size). The mixin's layers are absolutely positioned,
  // so the band must be its own positioning box.
  // @include surface-panel;  // stood down (FT-1370), not removed
  position: relative;
  @include face-disc-menu-plate($r: 360px, $radius: 10px);
  padding: 14px 16px 16px; // surface-panel's own default, kept
}
.rp-band + .rp-band,
.rp-panel {
  margin-top: 16px;
}

// The app's global type centres headings; a page of left-aligned tables wants
// its band titles standing at the same left edge as the columns under them.
// (FT-1301: the Roles/Games bands put their h3 inside `.rp-tablehead`, so the
// selector reaches both seats.)
.rp-band > h3,
.rp-band .rp-tablehead > h3 {
  font-family: PiratesBay, sans-serif;
  font-size: 22px;
  margin: 0 0 4px;
  opacity: 0.9;
  text-align: left;
  // FT-1370: the corner menus' own headline tracking (AccountMenu's
  // PiratesBay headline, letter-spacing 1px) — the display face at the
  // app's own rhythm, not just its family.
  letter-spacing: 1px;
}
// FT-1370: each band's header is RULED OFF from its content in the settings
// rail's plum seam — the line HostTools draws under its tab strip — so a
// band reads as the tower's panel (header, seam, body), not as a caption
// floating over a table.
.rp-band > h3,
.rp-band > .rp-tablehead {
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(120, 105, 135, 0.45);
  margin-bottom: 10px;
}

h4 {
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.5;
  margin: 0 0 6px;
  font-weight: normal;
  text-align: left;
}

.rp-scope,
.rp-state {
  margin: 0 0 10px;
  opacity: 0.55;
  // FT-1370: up a step with the tables — 13px utilitarian sans was part of
  // the "doesn't fit" (the fork reads large everywhere else).
  // font-size: 13px;  // stood down (FT-1370)
  font-size: 14px;
}

// (FT-1301: `.rp-legend` left with the thin-mark legends — the user retired
// the small-sample treatment from this page; "no data" cells carry the whole
// missing-sample discipline now.)

// A cell whose value is absent, or zero in the "nothing happened" sense. Dim
// rather than hidden: the row still has to line up with its neighbours, and a
// blank cell reads as a rendering fault where a faint one reads as an empty
// count.
.dim {
  opacity: 0.4;
}

// The share riding beside the count it is a share OF. Small and unemphatic on
// purpose — the count is the fact and the percentage is the reading.
.rp-pct {
  font-style: normal;
  font-size: 11px;
  opacity: 0.6;
  margin-left: 4px;
}

// A headline figure with nothing behind it — "0 of 104 recorded their length"
// is worth printing and not worth shouting.
.rp-figures li.faint b {
  opacity: 0.45;
}

// THE HEADLINE NUMBERS — the one thing a reader should be able to take in
// without reading anything.
//
// ── FT-1188: WHAT THIS ROW ACTUALLY WAS ─────────────────────────────────────
// The user's screenshot caught it as a wash of blue with the writing barely
// readable against it, and that is exactly what it was — not a background, but
// the TEXT. Two of the five items carry `.good` / `.evil`, and those classes
// are declared bare further down this sheet for the TABLE CELLS that need
// them (`<td class="good">`). On a `<li>` they set the whole item's colour, so
// the label under the number inherited the team colour and was then halved in
// opacity. MEASURED against the page's own ground: "GOOD WINS · 63.3%" came
// out at 2.77:1 and "EVIL WINS · 36.7%" at 1.91:1 — the two least legible
// strings on a page whose whole subject they are, both under even the 3:1
// large-text floor. The big numeral, which the team colour was FOR, was the
// one part of each item that was already fine (8.34:1 and 4.57:1).
//
// So: the numeral keeps its colour, and the label is put back on the page's
// own ink explicitly, where no `.good`/`.evil` can reach it. All three labels
// now measure 4.99:1, because all three are now the same ink. The row also
// stands in a frame, like every other block on the surface — a headline band
// with nothing around it read as text that had drifted to the top.
.rp-figures {
  // FT-1370: with the band itself now glass, a second surface-panel inside
  // it would be a plate on a plate. The figures stand on an INNER ground
  // instead — the corner menu's own headline ground (AccountMenu's
  // rgba(0,0,0,.5)) inside a plum hairline (HostTools' 1px
  // rgba(120,105,135,.5), the build panel's inner-edge weight).
  // @include surface-panel(12px 16px 14px);  // stood down (FT-1370)
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(120, 105, 135, 0.5);
  border-radius: 8px;
  padding: 12px 16px 14px;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 10px 34px;
  margin: 12px 0 18px;
  // EXPLICIT, because the shell brought company: `.modal ul` (Modal.vue)
  // centres, middle-aligns and sets line-height on every list inside a modal,
  // and this row is a list inside a modal now. Only the properties declared
  // here outrank it.
  justify-content: flex-start;
  align-items: stretch;
  align-content: flex-start;
  line-height: 1.1;

  li {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }
  b {
    font-family: PiratesBay, sans-serif;
    font-size: 40px;
    font-weight: normal;
    font-variant-numeric: tabular-nums;
  }
  span {
    // THE LABEL IS PAGE INK, never the team colour — see the note above.
    color: #d8cdb4;
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.6;
  }
  .good b {
    color: #6fa8ff;
  }
  .evil b {
    color: #d24a3a;
  }
}

// The width the page bought: two tables standing beside each other instead of
// stacked down a 460px drawer.
.rp-columns {
  display: flex;
  flex-wrap: wrap;
  gap: 34px;
  align-items: flex-start;
}
// Wide, but not ARBITRARILY wide: on a 1920 window an uncapped column puts
// "Trouble Brewing" and its count 600px apart, which is harder to read than
// the drawer was. The width buys two tables side by side, not stretched ones.
.rp-col {
  flex: 1 1 320px;
  min-width: 0;
  max-width: 620px;
  overflow-x: auto;
}
// FT-1164: the scripts table grew from four columns to six and needs the
// room. Still capped — the width buys columns, never stretched ones.
// FT-1297: nine columns now (Ran split three ways, Players added) — the cap
// grows with them, and the column switch is the reader's own remedy when a
// window cannot hold all nine.
.rp-col-wide {
  flex-basis: 560px;
  max-width: 980px;
}

// ── FT-1301: THE FILTER BAR ─────────────────────────────────────────────────
// The Golem editor's canvas-toolbar idiom, ported VISUALLY (this is the
// vendor app, so the look travels, not the code): a compact dark bar of icon
// buttons, grouped by a thin divider, a toggled button FILLED — in this
// page's amber, not the editor's blue. It replaced FT-1299's scope chips and
// FT-1298's view chips: one filter grammar for the whole page.
.rp-toolbar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  padding: 4px;
  margin: 0 0 14px;
  // FT-1370: the bar joins the control-plate grammar — the script picker's
  // own three values (controls.scss), the same plate the search input and
  // the chips beside it already wear, instead of a bone hairline on its own
  // loose brown.
  // border: 1px solid rgba(216, 205, 180, 0.25);  // stood down (FT-1370)
  // background: rgba(10, 7, 6, 0.82);             // stood down (FT-1370)
  border: $control-edge-width solid $control-edge;
  border-radius: $control-radius;
  background: $control-bg;
}
.rp-toolgroup {
  display: flex;
  gap: 2px;
}
.rp-tooldiv {
  width: 1px;
  align-self: stretch;
  margin: 2px 4px;
  // FT-1370: the divider speaks plum (the rail's seam), not bone.
  // background: rgba(216, 205, 180, 0.2);  // stood down (FT-1370)
  background: rgba(120, 105, 135, 0.45);
}
.rp-tool {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: none;
  color: #d8cdb4;
  opacity: 0.8;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    opacity: 1;
    // FT-1370: the pointer acknowledgement goes purple — the setup panel's
    // own tab-hover pair (HostTools .ht-tab, FT-1175 "purple not red"),
    // instead of a bone wash.
    // color: #fff; background: rgba(216, 205, 180, 0.12);  // stood down
    color: #ece4f8;
    background: rgba(150, 130, 175, 0.12);
  }
  &:focus-visible {
    @include control-focus-ring;
    // FT-1108's own dropdown-family override, worn here for the same
    // reason: these buttons OPEN lists, and the shared red ring reads as
    // blood on a control that speaks plum.
    outline-color: rgba(150, 130, 175, 0.9);
  }
  // its popover is open under it — the chosen state every open dropdown on
  // the setup panel wears (FT-1108's purple restatement of control-lit),
  // not a slightly-stronger hover wash.
  &.open {
    opacity: 1;
    // color: #fff; background: rgba(216, 205, 180, 0.18);  // stood down
    color: #ece4f8;
    background: rgba(96, 74, 128, 0.42);
    border-color: rgba(167, 143, 205, 0.85);
  }
  // an ACTIVE filter is FILLED — the editor toolbar's toggled state
  &.armed {
    opacity: 1;
    color: #fff;
    background: rgba(232, 178, 58, 0.25);
    border-color: rgba(232, 178, 58, 0.55);
  }
  // the dev ledger keeps ITS amber — the page-wide "not the real
  // Chronicles" colour the subtitle already speaks (.rp-sub.dev)
  &.rp-tool-dev.armed {
    color: #e6c56b;
    background: rgba(230, 197, 107, 0.18);
    border-color: rgba(230, 197, 107, 0.55);
  }
}
// FT-1308: THE CLUSTER — the four dimension buttons in ONE enclosure, the
// editor toolbar's grouped-segment look in this page's dress: a rounded
// inner plate whose first segment is the funnel, the group's passive label.
.rp-toolcluster {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  // FT-1370: the enclosure's edge is the settings rail's plum (HostTools'
  // 1px rgba(120,105,135,.5) inner edges), its ground the bench's quiet
  // inner black — not a bone wash.
  // border: 1px solid rgba(216, 205, 180, 0.22);  // stood down (FT-1370)
  // background: rgba(216, 205, 180, 0.05);        // stood down (FT-1370)
  border: 1px solid rgba(120, 105, 135, 0.5);
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.3);
}
// the funnel: a GLYPH, not a button — always plated so it reads as the
// cluster's identity, amber-armed (with the total count riding its corner)
// the moment any dimension filters. No hover states: it does nothing.
.rp-tool-funnel {
  cursor: default;
  opacity: 0.85;
  // FT-1370: the cap's plate is the tab leaves' own ground (HostTools'
  // rgba(0,0,0,.55)) behind the rail plum — the FT-1369 cap geometry kept,
  // its bone tints re-inked.
  // background: rgba(216, 205, 180, 0.1);      // stood down (FT-1370)
  // border-color: rgba(216, 205, 180, 0.18);   // stood down (FT-1370)
  background: rgba(0, 0, 0, 0.55);
  border-color: rgba(120, 105, 135, 0.5);
  font-size: 12px;
  width: 26px;
  // User call 2026-09-04: the funnel FILLS the cluster — no margin inside
  // its parent, bleeding over the enclosure's own 2px padding on its three
  // outer sides so it reads as the cap that encapsulates the buttons, not
  // as one more sibling. Outer corners hug the cluster's 5px radius; the
  // inner edge is flat with its own seam against the first button.
  align-self: stretch;
  height: auto;
  margin: -2px 1px -2px -2px;
  border-radius: 4px 0 0 4px;
  // FT-1370: the seam against the first button is the rail plum too.
  // border-right: 1px solid rgba(216, 205, 180, 0.18);  // stood down
  border-right: 1px solid rgba(120, 105, 135, 0.5);

  // it does nothing, so hovering changes nothing — the .rp-tool hover
  // treatment is a button's promise and this glyph must not make it.
  &:hover {
    opacity: 0.85;
    color: #d8cdb4;
    // background: rgba(216, 205, 180, 0.1);  // stood down (FT-1370)
    background: rgba(0, 0, 0, 0.55);
  }
  &.armed,
  &.armed:hover {
    opacity: 1;
    color: #fff;
    background: rgba(232, 178, 58, 0.25);
    border-color: rgba(232, 178, 58, 0.55);
  }
}
// a dimension button wears a small caret — "I open" — beside its mark.
.rp-tool-dim {
  width: auto;
  padding: 0 5px 0 6px;
  gap: 3px;
}
.rp-tool-caret {
  font-size: 8px;
  opacity: 0.45;
}
// the count of active entries, riding the icon's corner
.rp-toolbadge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: #e8b23a;
  color: #1a1512;
  font-style: normal;
  font-size: 10px;
  line-height: 14px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
// FT-1304 (user call): THE SEARCH RIDES THE BAR — one input beside the icons.
// FT-1308 (user call): PERMANENT AND PRIMARY now — it no longer filters an
// open popover's list; it is the omnibar, and its dropdown below is the fast
// way to every filter. The plate treatment is FT-1304's, widened for the
// promotion.
.rp-omniwrap {
  position: relative;
  display: inline-flex;
}
.rp-toolsearch {
  @include control-plate;
  // wide enough for its own placeholder — a promoted control that truncates
  // its one sentence reads as a squeezed afterthought.
  width: 340px;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 13px;
  color: #d8cdb4;
  padding: 4px 10px;
  margin: 0 2px;

  &:focus-visible {
    @include control-focus-ring;
    // (FT-1370 note: no plum override here — App.vue's app-wide field rule
    // gives every focused input the blood border + glow, and a plum outline
    // over that would be two voices on one edge. Fields keep the blood.)
  }
  &::placeholder {
    color: rgba(216, 205, 180, 0.4);
  }
}
// FT-1308: THE SUGGESTIONS — the omnibar's dropdown, anchored under its own
// input (the .rp-pop base supplies the plate; the wrap supplies the anchor).
// Rows are the popover entries' shape wearing a keyboard: the LIT row is
// what Enter takes, and the − at its edge is the exclude door.
// (doubled selector on purpose: the shared .rp-pop plate is declared LATER
// in this sheet, and the omni's own anchor must win that source-order tie.)
.rp-pop.rp-omni {
  top: calc(100% + 9px);
  left: -2px;
  width: 320px;
  max-height: 380px;
  overflow-y: auto;
}
.rp-omni-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  border-radius: 4px;
  background: none;
  color: #d8cdb4;
  font-family: inherit;
  font-size: 13px;
  padding: 3px 8px;
  cursor: pointer;

  .rp-pop-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  // the lit row is the keyboard's cursor AND the hover state — one look,
  // whichever hand is driving.
  &.lit,
  &:hover {
    // FT-1370: the row under the cursor speaks the dropdowns' plum
    // (OptionSelect's .gsel-opt.active pair), not a bone wash.
    // color: #fff; background: rgba(216, 205, 180, 0.12);  // stood down
    color: #ece4f8;
    border-color: rgba(150, 130, 175, 0.55);
    background: rgba(150, 130, 175, 0.12);
  }
  &:focus-visible {
    @include control-focus-ring;
    outline-color: rgba(150, 130, 175, 0.9); // FT-1370: dropdown family
  }
  .rp-omni-minus {
    visibility: hidden;
  }
  &.lit .rp-omni-minus,
  &:hover .rp-omni-minus {
    visibility: visible;
  }
}
// a suggestion with no catalog art (towns, the players bounds) wears its
// dimension's own toolbar mark instead, at the icon's seat and size.
.rp-omni-fa {
  flex: 0 0 auto;
  width: 20px;
  text-align: center;
  font-size: 12px;
  opacity: 0.7;
}
// the exclude door: rides the row's edge, amber like every "must not".
.rp-omni-minus {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid rgba(232, 178, 58, 0.55);
  border-radius: 4px;
  color: #e8b23a;
  font-size: 13px;
  line-height: 1;

  &:hover {
    background: rgba(232, 178, 58, 0.25);
    color: #fff;
  }
}
.rp-toolclear {
  @include control-plate;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 6px;
  padding: 3px 10px;
  font-family: inherit;
  font-size: 12px;
  color: #d8cdb4;
  cursor: pointer;

  &:hover {
    color: #fff;
    @include control-plate-hover;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
}

// ── FT-1305: THE FILTER READBACK ────────────────────────────────────────────
// The active question in plain words, chip per entry, under the bar. The
// chips wear the popover entries' own tri-state palette — green filled for
// "must have it", amber + struck for "must not" — so the readback and the
// popovers are visibly the same grammar. The players bound rides as a green
// chip too: a bound is a requirement.
.rp-readback {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: -6px 0 14px;
}
.rp-fchip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 2px 2px 10px;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 12px;

  &.in {
    background: rgba(94, 179, 110, 0.22);
    border-color: rgba(94, 179, 110, 0.55);
    color: #fff;
  }
  &.out {
    background: rgba(232, 178, 58, 0.22);
    border-color: rgba(232, 178, 58, 0.55);
    color: #fff;

    .rp-fchip-name {
      text-decoration: line-through;
      opacity: 0.8;
    }
  }
}
.rp-fchip-mark {
  opacity: 0.9;
}
.rp-fchip-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: none;
  color: inherit;
  font-size: 10px;
  cursor: pointer;
  opacity: 0.6;

  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.35);
  }
  &:focus-visible {
    @include control-focus-ring;
  }
}

// THE POPOVER — under the bar, left-aligned with it. Anchoring to the bar
// rather than the button keeps it stable while a click re-sorts the list.
.rp-pop {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 5;
  min-width: 280px;
  max-width: 380px;
  padding: 10px;
  // FT-1370 (the user's second-named misfit): every popover this page opens
  // wears the settings dropdowns' own popup chrome — OptionSelect's
  // .gsel-menu, FT-1108's "red is the blood, purple is the book" dress —
  // instead of a plain dark box with a bone hairline. Ground, plum edge,
  // radius and shadow are that menu's four values, verbatim.
  // border: 1px solid rgba(216, 205, 180, 0.3);      // stood down (FT-1370)
  // border-radius: 6px;                              // stood down (FT-1370)
  // background: #14100d;                             // stood down (FT-1370)
  // box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);       // stood down (FT-1370)
  border: 2px solid rgba(120, 105, 135, 0.55);
  border-radius: 8px;
  background: rgba(12, 8, 16, 0.96);
  box-shadow: 0 0 12px black;
}
// (FT-1304: `.rp-pop-search` left with the in-popover input — the search
// lives on the bar now, as `.rp-toolsearch` above.)
.rp-pop-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 300px;
  overflow-y: auto;
}
// A TRI-STATE ENTRY: bare (off), filled GREEN with a + (include), amber and
// struck with a − (exclude). FT-1304 (user call): include = green, exclude =
// yellow — "must have it" reads as a go, and the amber that used to mean
// include now marks what is barred. The toolbar's own armed amber and the
// dev flask's amber are untouched; this is the entries' palette only.
// FT-1305: a group header inside the list — the roles popover's team bands.
.rp-pop-group {
  margin: 8px 0 2px;
  padding: 0 8px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.45;

  &:first-child {
    margin-top: 0;
  }
}
.rp-pop-entry {
  display: flex;
  // FT-1305: center, not baseline — every entry carries its catalog art now
  // (script card art / role token), and a 20px image on a text baseline
  // hangs the row.
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  border-radius: 4px;
  background: none;
  color: #d8cdb4;
  font-family: inherit;
  font-size: 13px;
  padding: 3px 8px;
  cursor: pointer;

  &:hover {
    // FT-1370: the dropdowns' own hover (OptionSelect's .gsel-opt.active),
    // not a bone wash — the green/amber tri-states below stay untouched.
    // color: #fff; background: rgba(216, 205, 180, 0.1);  // stood down
    color: #ece4f8;
    border-color: rgba(150, 130, 175, 0.55);
    background: rgba(150, 130, 175, 0.12);
  }
  &:focus-visible {
    @include control-focus-ring;
    outline-color: rgba(150, 130, 175, 0.9); // FT-1370: dropdown family
  }
  .rp-pop-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &.in {
    background: rgba(94, 179, 110, 0.22);
    border-color: rgba(94, 179, 110, 0.55);
    color: #fff;
  }
  &.out {
    background: rgba(232, 178, 58, 0.22);
    border-color: rgba(232, 178, 58, 0.55);

    .rp-pop-name {
      text-decoration: line-through;
      opacity: 0.8;
    }
  }
}
.rp-pop-mark {
  flex: 0 0 auto;
  width: 10px;
  text-align: center;
  opacity: 0.9;
}
// FT-1305: the entry's catalog art — the script card's icon or the role's
// token, the same images those surfaces bundle. `contain`, because edition
// art is not square and must not be stretched to pretend it is.
.rp-pop-icon {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  object-fit: contain;
}
.rp-pop-note {
  margin: 8px 0 0;
  font-size: 11px;
  opacity: 0.45;
}
.rp-pop-players {
  // FT-1308: the histogram wants the popover's full width, and a little
  // more of it than a pair of number boxes did.
  width: 360px;

  // (FT-1308: the label/input pair below dressed the two number boxes the
  // histogram replaced — STOOD DOWN with setPlayersBound, kept as the
  // working plate treatment if a typed bound ever returns.)
  label {
    display: flex;
    flex-direction: column;
    gap: 4px;

    span {
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.5;
    }
    input {
      @include control-plate;
      width: 80px;
      font-family: inherit;
      font-size: 14px;
      color: #d8cdb4;
      padding: 4px 8px;

      &:focus-visible {
        @include control-focus-ring;
      }
    }
  }
}

// ── FT-1308: THE SEAT HISTOGRAM ─────────────────────────────────────────────
// Games per seat count over the otherwise-filtered set; the selected span
// wears the include GREEN (the tri-state entries' own "must have" colour),
// out-of-range bars dim, and the dual-handle rail beneath drags the bounds.
.rp-hist-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  // the tallest bar (64px) + its hover count + the hanging axis labels —
  // no dead headroom above the data.
  height: 82px;
  // FT-1370: the baseline the bars stand on is a rail-plum rule now; the
  // bars themselves keep their bone — they are data marks, not chrome.
  // border-bottom: 1px solid rgba(216, 205, 180, 0.25);  // stood down
  border-bottom: 1px solid rgba(120, 105, 135, 0.45);
}
.rp-hist-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  padding: 0 1px;
  cursor: pointer;
  user-select: none;

  .rp-hist-n {
    font-size: 9px;
    opacity: 0;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  &:hover .rp-hist-n {
    opacity: 0.75;
  }
  .rp-hist-bar {
    width: 100%;
    border-radius: 2px 2px 0 0;
    background: rgba(216, 205, 180, 0.45);
  }
  &:hover .rp-hist-bar {
    background: rgba(216, 205, 180, 0.65);
  }
  &.sel .rp-hist-bar {
    background: rgba(94, 179, 110, 0.75);
  }
  &.sel:hover .rp-hist-bar {
    background: rgba(94, 179, 110, 0.95);
  }
  &.off .rp-hist-bar {
    background: rgba(216, 205, 180, 0.14);
  }
  &.off:hover .rp-hist-bar {
    background: rgba(216, 205, 180, 0.3);
  }
}
// the axis label hangs BELOW the baseline the bars stand on
.rp-hist-x {
  font-size: 10px;
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  margin-bottom: -17px;
  padding-top: 3px;

  .rp-hist-col.sel & {
    opacity: 0.9;
    color: #b7e0bf;
  }
  .rp-hist-col.off & {
    opacity: 0.3;
  }
}
// THE RAIL — a dual-handle range under the bars, its 0%–100% inset half a
// column each side (inline style) so every stop lands under a bar's centre.
.rp-hist-track {
  position: relative;
  height: 16px;
  margin-top: 22px;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 7px;
    height: 2px;
    border-radius: 1px;
    // FT-1370: the rail's resting track, plum like every idle line here.
    // background: rgba(216, 205, 180, 0.25);  // stood down (FT-1370)
    background: rgba(120, 105, 135, 0.45);
  }
}
.rp-hist-fill {
  position: absolute;
  top: 7px;
  height: 2px;
  background: rgba(94, 179, 110, 0.8);
}
.rp-hist-handle {
  position: absolute;
  top: 1px;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  padding: 0;
  border: 1px solid rgba(94, 179, 110, 0.9);
  border-radius: 50%;
  background: #16211a;
  cursor: ew-resize;

  &:hover {
    background: rgba(94, 179, 110, 0.5);
  }
  &:focus-visible {
    @include control-focus-ring;
  }
}

// ── FT-1297: THE COLUMN SWITCH ──────────────────────────────────────────────
// A small "Columns" plate by the table's head; open, it unfolds a chip per
// column — the combination picker's own idiom, reused rather than invented
// twice. Amber while open, like every armed control on this page.
.rp-tablehead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;

  > h4,
  > .rp-scope {
    margin-bottom: 6px;
  }
}
.rp-colbtn {
  @include control-plate;
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #d8cdb4;
  padding: 2px 10px;
  cursor: pointer;
  opacity: 0.75;
  flex: 0 0 auto;

  &:hover {
    color: #fff;
    opacity: 1;
    @include control-plate-hover;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
  &.on {
    color: #e8b23a;
    border-color: rgba(232, 178, 58, 0.55);
    opacity: 1;
  }
}
// Doubled selector on purpose: `.rp-chips` sets its own margin later in this
// sheet, and the column chips need to win that tie without `!important`.
.rp-chips.rp-colchips {
  margin-bottom: 12px;
}

// A wide table must not force the whole page sideways — its own box scrolls
// instead, so a narrow window loses the far columns rather than the layout.
.rp-scroll {
  overflow-x: auto;
  max-width: 100%;
}

// FT-1301: ONE roles table over the set, not one per script — seven columns
// now that the death scales left with the per-script view, so it caps the
// way the ledger does instead of demanding a minimum.
.rp-roles {
  // FT-1304: the Script column joined (words, sometimes a comma-joined few),
  // so the cap grows with it — the width buys the column, never stretch.
  max-width: 920px;

  // Role, Type and Script read as words; everything after them is a number
  // and lines up on the right, which the base table already does. The word
  // columns are addressed BY CLASS, not by position — FT-1297 made the
  // columns hideable, and with one hidden an nth-child(2) rule would
  // left-align whichever number inherited its seat.
  th.rp-word,
  td.rp-word {
    text-align: left;
    padding-left: 0;
    padding-right: 14px;
  }
}

// (FT-1301: the `.rp-combo*` styles left with the "Roles together" section —
// the question is a role-include conjunction on the filter bar now.)

// CHIP ROWS — the column switches' unfolded chips (FT-1297's control,
// surviving on the tables that remain).
.rp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.rp-chip {
  @include control-plate;
  font-family: inherit;
  font-size: 13px;
  color: #d8cdb4;
  padding: 3px 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;

  &:hover:not(:disabled) {
    color: #fff;
    @include control-plate-hover;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
  // A chosen role is FILLED, not merely outlined — the set has to be readable
  // from across the page, and a border-weight change is not.
  &.on {
    background: rgba(232, 178, 58, 0.22);
    border-color: rgba(232, 178, 58, 0.55);
    color: #fff;
  }
  // At the ceiling, the unchosen chips say so by going quiet rather than by
  // failing on click.
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
}

// How many games an entry was in — the reason to pick it or not (the filter
// popovers' counts ride this too).
.rp-chip-n {
  font-style: normal;
  font-size: 11px;
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
}

.rp-table {
  border-collapse: collapse;
  width: 100%;
  // FT-1370 (light touch, the user's LAST priority): type up a step toward
  // the app's scale (the fork reads large everywhere else), rules onto the
  // plum family. Ink hierarchy stays opacity-on-bone, as it was.
  // font-size: 14px;  // stood down (FT-1370)
  font-size: 15px;

  th {
    opacity: 0.5;
    font-weight: normal;
    text-align: left;
    padding: 3px 14px 5px 0;
    // the header rule is the rail's own seam
    // border-bottom: 1px solid rgba(216, 205, 180, 0.2);  // stood down
    border-bottom: 1px solid rgba(120, 105, 135, 0.45);
    white-space: nowrap;
  }
  td {
    text-align: left;
    padding: 4px 14px 4px 0;
    font-variant-numeric: tabular-nums;
  }
  tbody tr + tr td {
    // the row seam keeps the rail's hue at whisper weight (alpha tuned
    // down from the leaf edge's .28 — 200 rows of .28 would stripe).
    // border-top: 1px solid rgba(216, 205, 180, 0.08);  // stood down
    border-top: 1px solid rgba(120, 105, 135, 0.16);
  }
  th:not(:first-child),
  td:not(:first-child) {
    text-align: right;
    padding-right: 0;
    padding-left: 14px;
  }
}

.rp-ledger {
  max-width: 1180px;

  th:nth-child(2),
  th:nth-child(3),
  td:nth-child(2),
  td:nth-child(3) {
    text-align: left;
    padding-left: 0;
    padding-right: 14px;
  }

  tbody tr.jump {
    cursor: pointer;
    &:hover td {
      // FT-1370: a row that opens something acknowledges the pointer in
      // the same plum every option row now does.
      // background: rgba(216, 205, 180, 0.09); color: #fff;  // stood down
      background: rgba(150, 130, 175, 0.12);
      color: #ece4f8;
    }
  }
  // the town you are standing in, marked in its own ledger
  tbody tr.here td:nth-child(2) {
    color: #e8b23a;
  }
}

.rp-roster {
  // FT-1188: the gap to the boards above belongs to the PANEL around it now
  // (`.rp-rosterwrap`), not to the table inside it.
  margin-top: 0;
  max-width: 780px;

  th:nth-child(2),
  th:nth-child(3),
  th:nth-child(4),
  td:nth-child(2),
  td:nth-child(3),
  td:nth-child(4) {
    text-align: left;
    padding-left: 0;
    padding-right: 14px;
  }
}

.good {
  color: #6fa8ff;
}
.evil {
  color: #d24a3a;
}
.lived {
  color: #8fbf7a;
}
.died {
  opacity: 0.5;
  text-decoration: line-through;
}

.rp-win {
  &.good {
    color: #6fa8ff;
  }
  &.evil {
    color: #d24a3a;
  }
}

// FT-1188: the record's own header line stands in a frame, the same material
// the landing's bands wear — which script, who won, and the four facts about
// the game, read as one block rather than as loose text above the boards.
.rp-gamehead {
  // FT-1370: the record's header block wears the same glass the landing's
  // bands do now (see .rp-band above).
  // @include surface-panel(10px 16px 12px);  // stood down (FT-1370)
  position: relative;
  @include face-disc-menu-plate($r: 360px, $radius: 10px);
  padding: 10px 16px 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 18px;
  margin: 0 0 16px;
}
.rp-gscript {
  font-family: PiratesBay, sans-serif;
  font-size: 24px;
  // FT-1162: the mark rides WITH the name as one object, so the pair wraps
  // together and the icon can never be orphaned onto its own line.
  display: inline-flex;
  align-items: center;
  gap: 8px;

  // Sized in `em` off the script name beside it — the same way HostTools
  // sizes its own town-script mark — so the mark tracks the name if this
  // heading is ever resized. `contain` because the edition art is not square
  // and must not be stretched to pretend it is.
  .rp-gicon {
    width: 1.4em;
    height: 1.4em;
    object-fit: contain;
    flex: 0 0 auto;
  }
}
.rp-gmeta {
  font-size: 13px;
  opacity: 0.55;
}

// TWO RINGS, SIDE BY SIDE, AT THE PORTRAIT'S OWN LARGE SIZE. `.cp-large`
// caps itself at min(640px, 86vw); the gap and the wrap are all this needs to
// add. On a narrow window they stack rather than shrink — a shrunk ring is
// the drawer's problem all over again.
.rp-boards {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}
.rp-board {
  flex: 1 1 420px;
  min-width: 0;
  max-width: 640px;
}

@media (max-width: 700px) {
  // FT-1188: the shell owns the side padding now (Modal drops to 10px there),
  // so the page only tightens what is still its own — the scroller's ends and
  // the size of the headline numerals.
  .rp-body {
    padding: 12px 2px 20px;
  }
  .rp-band,
  .rp-panel,
  .rp-figures {
    padding-left: 10px;
    padding-right: 10px;
  }
  .rp-figures b {
    font-size: 30px;
  }
}
</style>
