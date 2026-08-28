<template>
  <!-- Golem fork (FT-1010): CHRONICLES — the town's whole story as ONE
       surface (user decision, 2026-08-20). Three surfaces merged here:

         · the town CHAT (FT-965's ChatDrawer) — the talk and the composer
         · the CHRONICLE (FT-886's ChronicleDrawer) — the game's events,
           which are now ROWS in the same persistent log the talk lives in
           (host-authored system rows wearing golem/chronicles' EV1 envelope)
         · the TOWN RECORDS (FT-850's StatsOverlay) — the finished-games
           aggregates, standing over the stream as its summary band

       ONE STREAM, CHAPTERED PER GAME. The log is the town's permanent room
       (a game is a filter over it, never a boundary that resets it), so the
       stream arrives already ordered by the store's own seq: each game is a
       consecutive run of rows sharing a gameId, rendered as a COLLAPSIBLE
       section, with the between-games talk standing between the sections.
       Oldest at the top, newest in view on open — the way the chat log has
       always read.

       TRANSPARENCY: a FINISHED game is fully public, whispers included
       (user decision — it overruled a saw-it-live-only rule). What this
       component renders was already decided at ingest (chatIngest + canSee):
       live-game whispers reach only their three parties; finished-game
       whispers reach everyone. Nothing here re-litigates that. -->
  <transition name="sd-slide">
    <div
      class="chronicles-drawer"
      v-if="isOpen"
      :style="[{ '--sd-w': width + 'px' }, sheetStyle]"
    >
      <!-- drag the left edge to resize; the width persists per browser -->
      <div
        class="sd-grip"
        title="Drag to resize — double-click to reset"
        @pointerdown="startResize"
        @dblclick="resetWidth"
      ></div>
      <!-- PHONE ONLY: the sheet's grab handle (the × stays the reliable exit) -->
      <div class="gs-handle" @pointerdown="startSheetDrag"></div>
      <div class="sd-head">
        <CloseX
          class="sd-close"
          title="Close the chronicle"
          @pointerup.native="sheetDismiss"
          @click.native="sheetDismiss"
        />
        <h3 class="sd-title">
          <img class="sd-mark" :src="quill" alt="" />
          <span>Chronicle</span>
        </h3>
      </div>

      <!-- FT-1273 (user): "put the current vs history on a row below the
           chronicle" — the two READING MODES stood beside the title since
           FT-1037; on its own row the pair reads as a chooser rather than
           head furniture, and it sits directly above the filter row it
           belongs with. Current is the town since it was opened this time;
           History is the reading room. -->
      <div class="cr-mode-row">
        <div class="cr-mode" role="group" aria-label="Current or history">
          <button
            class="cr-mode-btn"
            :class="{ on: mode === 'current' }"
            title="The town since it opened this time"
            @click="setMode('current')"
          >
            Current
          </button>
          <button
            class="cr-mode-btn"
            :class="{ on: mode === 'history' }"
            title="Past games — stats and messages"
            @click="setMode('history')"
          >
            History
          </button>
        </div>
      </div>

      <div class="sd-view cr-view">
        <!-- ── THE SUMMARY BAND — the town records, standing over the story.
             One line always; the ledger unfolds on a click. FT-1019: the
             unfolded band leads with PER-GAME ROWS — when it began, on which
             script, who won — and a recorded game the log also holds is a
             DOOR: clicking its row does exactly what its game chip does and
             jumps the stream to that chapter. "All towns" (StatsOverlay's
             old platform scope) returns here as the band's own toggle.
             Best-effort like every records read: unreachable is an honest
             line, never a broken band.
             FT-1037: the band lives in HISTORY now — it is the reading
             room's summary, and Current keeps only the live stream. -->
        <div
          class="cr-records"
          :class="{ open: recordsOpen }"
          v-if="mode === 'history'"
        >
          <p
            class="cr-records-line"
            role="button"
            :title="
              recordsOpen ? 'Fold the records away' : 'Unfold the town records'
            "
            @click="recordsOpen = !recordsOpen"
          >
            <template v-if="records.loading">Consulting the archives…</template>
            <template v-else-if="records.error"
              >Records unavailable — server unreachable</template
            >
            <template v-else-if="!records.stats || !records.stats.games"
              >No games recorded yet</template
            >
            <template v-else>
              <b>{{ records.stats.games }}</b>
              {{ records.stats.games === 1 ? "game" : "games" }} · Good
              {{ records.stats.byTeam.good }} · Evil
              {{ records.stats.byTeam.evil }}
            </template>
            <font-awesome-icon class="cr-records-chev" icon="chevron-down" />
          </p>
          <template v-if="recordsOpen">
            <!-- FT-1146 (user: "All towns shouldn't exist within a game"):
                 THE SCOPE CONTROL STANDS DOWN. A whole-platform view had no
                 business living inside one game's drawer — this surface is
                 THIS town's story, and every town together is now its own
                 page (StatsOverlay.vue, reached from the entry screen's
                 Records door). Stood down by a dead condition per the house
                 never-delete rule; `recordsScope` and `setRecordsScope` stay
                 below, unreachable, and `loadRecords` reads the town branch
                 forever. -->
            <div
              class="cr-scope"
              role="group"
              aria-label="Records scope"
              v-if="false"
            >
              <button
                class="cr-scope-btn"
                :class="{ on: recordsScope === 'town' }"
                title="This town's ledger"
                @click="setRecordsScope('town')"
              >
                This town
              </button>
              <button
                class="cr-scope-btn"
                :class="{ on: recordsScope === 'platform' }"
                title="Every town on the platform, together"
                @click="setRecordsScope('platform')"
              >
                All towns
              </button>
            </div>
            <!-- FT-1159 (user call, 2026-08-25): "that still doesn't need to
                 exist... the way to access chronicles for everyone should be
                 only from the main screen." The cross-town page is a thing you
                 come to the SITE to look at, not a door you find mid-game
                 inside one town's own story. STOOD DOWN, not removed (house
                 rule): the markup and its handler stay in the tree.

                 The scope buttons above are untouched — "This town / All
                 towns" still switches what the summary NUMBERS count, which is
                 a reading of this band, not a way out of the drawer.

                 The per-game "The boards, full size →" line further down is a
                 different thing and STAYS: it opens onto ONE game's record —
                 the game the reader already has open — never the landing view,
                 and it is the only way to see a recorded game's boards at all
                 since FT-1146 stood the in-drawer thumbnails down in its
                 favour. -->
            <p class="cr-allrecords" v-if="false" @click="openRecords(null)">
              Every town's records →
            </p>
            <!-- THE LEDGER: this town's games, newest first. FT-1066 (user
                 redesign): every row is an ACCORDION door now — a click
                 unfolds that game's own page directly beneath the row
                 (Stats|Messages, the exact body History always rendered,
                 just moved here rather than steered by a dropdown further
                 down). One row open at a time; opening another folds the
                 first, same click folds an open one back away. -->
            <ol
              class="cr-recgames"
              v-if="recordsScope === 'town' && records.games.length"
            >
              <template v-for="g in records.games">
                <li
                  :key="g.id"
                  class="jump"
                  :class="{ open: isLedgerOpen(g) }"
                  :data-ledger-row="g.id"
                  :title="
                    isLedgerOpen(g)
                      ? 'Fold this game away'
                      : 'Open this game\'s page'
                  "
                  @click="toggleLedger(g)"
                >
                  <span class="rg-when">{{ recordLabel(g) }}</span>
                  <span class="rg-script">{{ g.scriptName }}</span>
                  <span class="rg-winner" :class="g.winningTeam">{{
                    g.winningTeam === "good" ? "Good" : "Evil"
                  }}</span>
                  <font-awesome-icon
                    class="rg-chev"
                    :class="{ open: isLedgerOpen(g) }"
                    icon="chevron-down"
                  />
                </li>
                <!-- THE UNFOLDED GAME — inline, directly under its own row. -->
                <li
                  v-if="isLedgerOpen(g)"
                  :key="g.id + ':body'"
                  class="cr-recbody"
                >
                  <div
                    class="cr-filter cr-tabs"
                    role="group"
                    aria-label="Stats or messages"
                  >
                    <button
                      class="cr-cell"
                      :class="{ on: historyTab === 'stats' }"
                      title="The game's record — script, winner, roster, portraits"
                      @click="historyTab = 'stats'"
                    >
                      Stats
                    </button>
                    <button
                      class="cr-cell"
                      :class="{ on: historyTab === 'messages' }"
                      title="The game's chapter — what was said and what happened"
                      @click="historyTab = 'messages'"
                    >
                      Messages
                    </button>
                  </div>

                  <!-- ── STATS ─────────────────────────────────────────────
                       FT-1060 (user, on a Role cell): the roster's Role
                       column reads through the icon, not the name — the
                       same THE role hover card (FT-858) every other
                       role-bearing surface in the app shares. -->
                  <div
                    class="cr-log cr-hbody"
                    v-blood-scroll
                    @scroll.passive="hideRosterCard"
                    v-if="historyTab === 'stats'"
                  >
                    <p class="cr-hhead">
                      <span class="cr-hscript">{{ pickedScript }}</span>
                      <span
                        class="rg-winner"
                        :class="pickedWinner"
                        v-if="pickedWinner"
                        >{{
                          pickedWinner === "good" ? "Good wins" : "Evil wins"
                        }}</span
                      >
                      <span class="cr-hwhen">{{
                        historyWhen(pickedGame)
                      }}</span>
                    </p>

                    <!-- THE BOARD PORTRAITS: the ring as the game began
                         (FT-1057 — the board as dealt; "Day 1" is the
                         legacy moment older games hold) and as it ended.
                         Games from before the portraits existed show stats
                         only. -->
                    <!-- FT-1146: A RECORDED GAME'S BOARDS ARE A LINK NOW.
                         A 15-seat ring rendered 230px wide inside a 460px
                         drawer is not a board, it is a smudge — and the
                         drawer has no width to give it. The rings live on
                         the Records page at their full size (68px coins,
                         16px names) and this is the door to them. The
                         thumbnails stand down rather than being removed,
                         and they still render for a game the log holds but
                         the records API never got: there is no page row to
                         send those to. -->
                    <p
                      class="cr-boardlink"
                      v-if="
                        pickedGame &&
                        pickedGame.record &&
                        (pickedBoards.start ||
                          pickedBoards.day1 ||
                          pickedBoards.end)
                      "
                      @click="openRecords(pickedGame.record.id)"
                    >
                      The boards, full size →
                    </p>
                    <div
                      class="cr-portraits"
                      v-if="
                        (!pickedGame || !pickedGame.record) &&
                        (pickedBoards.start ||
                          pickedBoards.day1 ||
                          pickedBoards.end)
                      "
                    >
                      <ChroniclesPortrait
                        v-if="pickedBoards.start"
                        :board="pickedBoards.start"
                        label="The game begins"
                      />
                      <ChroniclesPortrait
                        v-if="pickedBoards.day1"
                        :board="pickedBoards.day1"
                        label="Day 1"
                      />
                      <ChroniclesPortrait
                        v-if="pickedBoards.end"
                        :board="pickedBoards.end"
                        label="The end"
                      />
                    </div>

                    <p
                      class="cr-hnote"
                      v-if="pickedDetail && pickedDetail.loading"
                    >
                      Consulting the archives…
                    </p>
                    <table class="cr-roster" v-if="pickedRoster.length">
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Role</th>
                          <th>Fate</th>
                          <th
                            title="This player's games in this town's records"
                          >
                            Games
                          </th>
                          <th>Wins</th>
                          <th title="Games survived to the end">Lived</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in pickedRoster" :key="row.key">
                          <td class="cr-rname">{{ row.name }}</td>
                          <td class="cr-rrole">
                            <span
                              v-if="row.role"
                              class="cr-role-icon"
                              :style="{
                                backgroundImage: `url(${roleIcon(row.role)})`,
                              }"
                              role="img"
                              :aria-label="row.roleName"
                              @mouseenter="showRosterCard(row.role, $event)"
                              @mouseleave="hideRosterCard"
                            ></span>
                            <span v-else class="cr-role-none" aria-hidden="true"
                              >—</span
                            >
                          </td>
                          <td :class="row.survived ? 'lived' : 'died'">
                            {{ row.survived ? "lived" : "died" }}
                          </td>
                          <td>{{ row.games }}</td>
                          <td>{{ row.wins }}</td>
                          <td>{{ row.survivals }}</td>
                        </tr>
                      </tbody>
                    </table>
                    <p
                      class="cr-empty"
                      v-else-if="!pickedDetail || !pickedDetail.loading"
                    >
                      No roster survives for this game.
                    </p>
                  </div>

                  <!-- ── MESSAGES ──────────────────────────────────────── -->
                  <template v-if="historyTab === 'messages'">
                    <div
                      class="cr-filter"
                      role="group"
                      aria-label="Which lines to show"
                    >
                      <button
                        v-for="f in historyCells"
                        :key="f.id"
                        class="cr-cell"
                        :class="{ on: historyFilter === f.id }"
                        :title="f.title"
                        @click="historyFilter = f.id"
                      >
                        <img
                          v-if="f.icon"
                          class="cr-cell-icon"
                          :src="f.icon"
                          alt=""
                        />
                        <template v-else>{{ f.label }}</template>
                      </button>
                    </div>
                    <div class="cr-log cr-hbody" v-blood-scroll>
                      <ol class="cr-rows" v-if="pickedVisibleRows.length">
                        <li
                          v-for="row in pickedVisibleRows"
                          :key="row.seq"
                          class="cr-row"
                          :class="rowClass(row)"
                        >
                          <ChroniclesRow
                            :row="row"
                            :ran="
                              pickedRan[row.id] != null
                                ? pickedRan[row.id]
                                : null
                            "
                            :viewer="viewer"
                            :rows="pickedRows"
                          />
                        </li>
                      </ol>
                      <p class="cr-empty" v-else>
                        {{
                          pickedRows.length
                            ? "Nothing of that kind in this game."
                            : "Recorded before the log kept games — no messages."
                        }}
                      </p>
                    </div>
                  </template>
                </li>
              </template>
            </ol>
            <template v-if="records.stats && records.stats.games">
              <table
                v-if="
                  recordsScope === 'platform' &&
                  records.stats.byScript &&
                  records.stats.byScript.length
                "
              >
                <thead>
                  <tr>
                    <th>Script</th>
                    <th>Games</th>
                    <th>Good wins</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in records.stats.byScript"
                    :key="row.scriptName"
                  >
                    <td>{{ row.scriptName }}</td>
                    <td>{{ row.games }}</td>
                    <td>{{ row.goodWins }}</td>
                  </tr>
                </tbody>
              </table>
              <table v-if="topPlayers.length">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Games</th>
                    <th>Wins</th>
                    <th>Survived</th>
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
            </template>
          </template>
        </div>

        <!-- ── THE FILTERS: what kind of line. One row of the plated-segment
             idiom the night sheet uses. FT-1037: the per-game chips are gone
             — History's ledger accordion is where a single game is read now
             (FT-1066), and Current is always the whole stream since the
             town opened. -->
        <div
          class="cr-filter"
          role="group"
          aria-label="Which lines to show"
          v-if="mode === 'current'"
        >
          <button
            v-for="f in filterCells"
            :key="f.id"
            class="cr-cell"
            :class="{ on: filter === f.id }"
            :title="f.title"
            @click="filter = f.id"
          >
            <img v-if="f.icon" class="cr-cell-icon" :src="f.icon" alt="" />
            <template v-else>{{ f.label }}</template>
          </button>
        </div>

        <!-- ── THE LIVE TALLY LIST's controls (FT-1019) — the two the retired
             vote-history drawer carried, rehomed inside the gallows view.
             They govern the SESSION's live list only (the pill's count, and
             whether a spectator's client records into it at all); the
             permanent log above is the full-transparency record and neither
             control touches a single row of it. -->
        <div
          class="cr-live"
          v-if="
            mode === 'current' && filter === 'gallows' && !session.isSpectator
          "
        >
          <span
            class="cr-live-opt"
            title="Whether players' clients keep the live tally list at all"
            @click="toggleLiveAllowed"
          >
            <font-awesome-icon
              :icon="[
                'fas',
                session.isVoteHistoryAllowed ? 'check-square' : 'square',
              ]"
            />
            Live list open to players
          </span>
          <!-- FT-1047 (user): the "Clear the live list" control retired —
               the chronicle keeps every action; nobody needed a broadcast
               wipe of the session mirror. clearLive() stays below, unwired. -->
        </div>

        <!-- ── YOUR NIGHTS (FT-1037b, user call) — the retired night
             drawer's whole surface, behind the moon cell: viewer-local
             night learnings plus the FT-1005 live Tonight inputs, in the
             stream's place while the cell is lit.

             FT-1274: STOOD DOWN, not deleted — the house rule. This was the
             SECOND RENDERER of the night, and having two is the literal bug
             the user reported: this surface said "Fortune Teller / You chose
             Fake 3 and Fake 6" while the stream's own night block said "You
             (Fortune Teller) chose Fake 3 and Fake 6" about the same event.
             One sentence, built once (golem/nightLog's chronicleLineOf) and
             rendered in one place (ChroniclesRow), leaves this room with
             nothing to show that the stream does not now show better —
             including, at last, to the storyteller, who never had this door
             at all. The moon cell now narrows the stream instead; the
             component, its import and its registration all stand. -->
        <ChroniclesNights v-if="false" />

        <!-- ── THE STREAM (Current) ────────────────────────────────────── -->
        <div
          class="cr-log"
          ref="log"
          v-blood-scroll
          @scroll="onScroll"
          v-if="mode === 'current'"
        >
          <template v-for="section in sections">
            <!-- A GAME is a chapter: a header that says which, folding the
                 run beneath it. The game being played right now says so. -->
            <section
              v-if="section.gameId"
              :key="section.key"
              class="cr-game"
              :class="{ now: isLive(section) }"
            >
              <h4
                role="button"
                :title="
                  isExpanded(section)
                    ? 'Fold this game away'
                    : 'Unfold this game'
                "
                @click="toggleSection(section)"
              >
                {{ sectionLabel(section) }}
                <span class="cr-now" v-if="isLive(section)">now</span>
                <span class="cr-count">{{ section.rows.length }}</span>
                <!-- FT-1030 (user call): chevrons go on the right -->
                <font-awesome-icon
                  class="cr-chev"
                  :class="{ open: isExpanded(section) }"
                  icon="chevron-down"
                />
              </h4>
              <ol class="cr-rows" v-if="isExpanded(section)">
                <li
                  v-for="row in section.rows"
                  :key="row.seq"
                  class="cr-row"
                  :class="rowClass(row)"
                >
                  <!-- FT-1019: the thread walks the game's UNFILTERED run —
                       under the gallows filter the section itself has no
                       death or phase rows to find its beats (or its day
                       boundary) in. -->
                  <ChroniclesRow
                    :row="row"
                    :ran="ranOf(section, row)"
                    :viewer="viewer"
                    :rows="threadSource[section.gameId] || section.rows"
                  />
                </li>
              </ol>
            </section>
            <!-- BETWEEN GAMES: no chapter, no fold — the town talking on its
                 own time, standing between the games it talked around. -->
            <ol v-else :key="section.key" class="cr-rows cr-between">
              <li
                v-for="row in section.rows"
                :key="row.seq"
                class="cr-row"
                :class="rowClass(row)"
              >
                <ChroniclesRow :row="row" :viewer="viewer" />
              </li>
            </ol>
          </template>
          <p class="cr-empty" v-if="!sections.length">{{ emptyText }}</p>
        </div>

        <!-- ── THE NIGHT'S CALL (FT-1101) — pinned between the stream and
             the composer, on EVERY filter, whenever the night is asking
             this seat for something.

             The user's report from a live 8-seat game was "the Imp isn't
             given an option to kill someone". The controls were real and
             correct; they stood behind the moon filter cell, in a drawer
             whose default view is the message stream, with nothing anywhere
             saying the night wanted them. So the call now stands where the
             player already is — at the foot of the messages, above the box
             they type into, unmissable and un-scrollable-away. -->
        <!-- FT-1107 (user): STOOD DOWN, not deleted — the house rule.
             "oh seems you're only putting it in the chronicle... The
             interaction should happen on the clock face. not in the chat,
             the chronicle should just record what was done."

             The band above was right that the player needed to be told the
             night wanted them and wrong about where. The ask now stands on
             the town square itself — TownInfo's hub words it, the coins take
             the pick (Player.vue's night-pick overlay) — so this room goes
             back to being what its name says: the RECORD. The per-night
             chronicle block (nightBlockRows, below) is untouched and keeps
             doing exactly that.

             The markup, the `pinned` dress in NightCall.vue and the
             nightCall/nightCallRow computeds below all stay where they are. -->
        <NightCall
          v-if="false"
          pinned
          :action="nightCall"
          :row="nightCallRow"
          :day="night.day"
        />

        <!-- ── THE COMPOSER — lifted whole from the chat drawer: chips for
             who this goes to (Room resting, whisper armed in purple), the
             entry, and the refusal line when the store never took it.
             Current only — History is a reading room, nobody talks into
             a finished game. -->
        <!-- FT-1206: THE WHISPER TALLY — who↔whom, how many, for the running
             game, when the town's "Count whispers" setting is on. In the
             CHRONICLE and never on the clock (the user's call). What each
             viewer's table holds is what their log holds: the storyteller
             everything, a player their own pairs — see whisperPairCounts. -->
        <div
          class="cr-whisper-counts"
          v-if="mode === 'current' && whisperPairCounts.length"
          title="Whispers this game — who whispered whom, and how many times. You see the pairs your own Chronicle knows about; the storyteller sees them all, and a finished game publishes everything."
        >
          <font-awesome-icon class="cr-wc-mark" icon="paper-plane" />
          <span
            class="cr-wc-pair"
            v-for="p in whisperPairCounts"
            :key="p.a + '|' + p.b"
          >
            {{ p.a }} ↔ {{ p.b }}
            <b>×{{ p.n }}</b>
          </span>
        </div>

        <div class="cr-compose" v-if="mode === 'current'">
          <div class="cr-targets">
            <button
              class="cr-target"
              :class="{ on: !target, refused: !!sayRefusalText }"
              :title="sayRefusalText || 'Say this to the whole town'"
              @click="pick(null)"
            >
              <!-- FT-1158 (user): "instead of room lets make that say town?"
                   The chip's own tooltip already said "the whole town" — the
                   word on it was the odd one out. This app has towns, not
                   rooms, everywhere else: the pill says Playing in <town>,
                   the records page counts towns, the summons calls the town
                   back. (ChatDrawer.vue carries the same chip and is
                   unmounted; left alone rather than edited blind.) -->
              Town
            </button>
            <!-- FT-1206: a chip the chat level refuses stays DRAWN (the
                 fixed-list rule — the town can always see what whispering
                 would be), dimmed, the reason on its tooltip, and pick()
                 will not arm it. The Storyteller chip never refuses. -->
            <button
              v-for="t in whisperTargets"
              :key="t.id"
              class="cr-target is-whisper"
              :class="{
                on: target && target.id === t.id,
                refused: !!t.refusal,
              }"
              :title="
                t.refusal
                  ? 'Whisper ' + t.label + ' — ' + t.refusal
                  : 'Whisper ' + t.label
              "
              @click="pick(t)"
            >
              {{ t.label }}
            </button>
          </div>
          <div class="cr-entry">
            <input
              ref="entry"
              v-model="draft"
              class="cr-input"
              type="text"
              :maxlength="bodyMax"
              :placeholder="placeholder"
              :disabled="!canTalk"
              spellcheck="false"
              @keyup.enter="send"
            />
            <button
              class="cr-send"
              :disabled="!canTalk || !draft.trim()"
              title="Send"
              @click="send"
            >
              <!-- FT-1242: the pointing hand stood down — that manicule is
                   the nominate mark here. Send wears the plane (FT-1211). -->
              <font-awesome-icon icon="paper-plane" />
            </button>
          </div>
          <p class="cr-error" v-if="error">{{ error }}</p>
          <p class="cr-note" v-else-if="!canTalk">{{ mutedText }}</p>
        </div>

        <!-- ── HISTORY — the reading room. FT-1066 (user redesign): the
             per-game dropdown + always-there Stats|Messages panel this block
             used to hold RETIRED — each game's page now unfolds inline
             under its own row in the records ledger above (see cr-recgames'
             accordion body). What's left here stands apart from any one
             row: the roster hover card (anchored wherever the open row's
             card lives) and the "nothing yet" fallback. -->
        <template v-if="mode === 'history'">
          <!-- FT-1060 (user, on a Role cell): the roster's Role column reads
               through the icon, not the name — the same THE role hover card
               (FT-858) every other role-bearing surface in the app shares,
               so a rest on the icon says what the sidebar's own rows say. -->
          <RoleHoverCard
            v-if="rosterCardRole"
            :role="rosterCardRole"
            :anchor="rosterCardAnchor"
            @dismiss="hideRosterCard"
          />

          <p class="cr-empty" v-if="!historyGames.length">
            No finished games yet — History fills in as games end.
          </p>
        </template>
      </div>
    </div>
  </transition>
</template>

<script>
import { mapGetters, mapState } from "vuex";
import CloseX from "./CloseX";
import ChroniclesRow from "./ChroniclesRow";
import rightDrawer from "../golem/rightDrawer";
import bottomSheet from "../golem/bottomSheet";
import {
  BODY_MAX,
  seatOf,
  STORYTELLER_KEY,
  viewerOf,
  // FT-1206: the chat level's two composer gates (the room, the chips), the
  // shared frame builders (one send path with the seat schemes), and the
  // per-pair whisper tally the counts band renders.
  sayRefusal,
  whisperRefusal,
  whisperFrame,
  sayFrame,
  whisperCountsFor,
} from "../golem/chat";
// FT-1206: the chat level and the counts toggle ride the tower shelf — the
// usual snapshot, refreshed on TOWER_EVENT.
import { TOWER_EVENT, towerState } from "../golem/towerBells";
import {
  startLabelOf,
  gamesOf,
  inFilter,
  sectionize,
  logGameIdOf,
  phaseDurations,
  // FT-1037: Current's anchor, and the stats page's readings
  openAnchorSeq,
  boardsOf,
  winnerOf,
  // FT-1057: the host's early view of the opening board — read from the
  // host-local stash (never the wire), shown as a synthetic stream row
  decodeEvent,
  encodeEvent,
  peekOpeningBoard,
} from "../golem/chronicles";
// FT-1037: the stats tab's board portraits — the ring a board row carries.
import ChroniclesPortrait from "./ChroniclesPortrait";
// FT-1060: THE role hover card (FT-858) — the roster's Role column reads
// through it, same as the grimoire drawer's role rows and every other
// role-bearing surface. roleIcon is the one "what art does this role wear"
// definition (golem/roleDrag), shared with RoleDrawer and RoleTray.
import RoleHoverCard from "./RoleHoverCard";
import { roleIcon as roleIconSrc } from "../golem/roleDrag";
// FT-1037b (user call): the retired night drawer's surface, now the moon
// cell's view — viewer-local night learnings + the live Tonight inputs.
import ChroniclesNights from "./ChroniclesNights";
// FT-1101: the night's own two halves in this drawer — the CALL (the pinned
// band at the stream's foot, so a player reading the messages cannot miss
// that the night wants them) and the BLOCK (a night's actions as one
// synthetic stream row, private to its owner until the game ends).
import NightCall from "./NightCall";
// FT-1107: `tonightActionFor` is no longer imported here — not retired, MOVED
// BEHIND A GETTER. The function is untouched in golem/nightLog and is still
// the one definition of "is the night asking this seat"; it is just called in
// one place now (night/myCall) because the clock face needs the same answer
// in two components at once. This file reads that getter instead.
import { nightBlocksOf, nightBlockText } from "../golem/nightLog";
import uiNight from "../assets/ui-night.png";
// FT-1019: the filter cells wear the doors' own icons — the gallows keeps
// the retired vote-history door's art, talk keeps the chat door's.
import uiVotes from "../assets/ui-votes.png";
import uiChat from "../assets/ui-chat.png";
// FT-1136: events has no door to borrow from, so it got its own mark — a
// clock, because everything that cell holds (deals, phases, deaths,
// endings) is the game itself advancing. Source + reasoning in
// src/assets/ui-events.svg.
import uiEvents from "../assets/ui-events.png";
import {
  townStats,
  platformStats,
  townGames,
  gameRecord,
} from "../golem/stats";
// the strip's own quill — the mark that opens this drawer leads its title
import quill from "../assets/ui-chronicle.png";

// FT-1060: RoleDrawer's own rest-before-you-raise-it delay, so the roster's
// card behaves like every other hover card in the app.
const ROSTER_HOVER_DELAY = 170;

export default {
  name: "ChroniclesDrawer",
  components: {
    CloseX,
    ChroniclesRow,
    ChroniclesPortrait,
    ChroniclesNights,
    NightCall,
    RoleHoverCard,
  },
  mixins: [
    bottomSheet,
    rightDrawer({
      modal: "chroniclesDrawer",
      storageKey: "golem.chroniclesDrawerW",
      // the chat drawer's 440 plus room for the chapter chrome
      defaultWidth: 460,
    }),
  ],
  data() {
    return {
      quill,
      bodyMax: BODY_MAX,
      draft: "",
      /** null = the room; otherwise the whisper target chip that is armed. */
      target: null,
      /** FT-1206: the town's chat level + counts toggle, snapshotted off the
       *  tower shelf (refreshed on TOWER_EVENT, the FaceHands idiom). */
      chatLevel: towerState.chatLevel,
      countsOn: !!towerState.whisperCounts,
      /** Is the log scrolled to the bottom? Decides whether it follows. */
      stuck: true,
      /** FT-1037: "current" — the stream since the town opened this time —
       *  or "history", the per-game reading room. */
      mode: "current",
      /** FT-1066: the ledger row currently unfolded (a historyGames entry
       *  key, null = every row folded — an accordion starts closed), and
       *  which of its two pages is open inside that row's body. */
      historyPick: null,
      historyTab: "stats",
      /** The messages page's own kind filter — separate from Current's so
       *  the V hotkey (which arms the live gallows) never re-aims History. */
      historyFilter: "all",
      /** Fetched full records (roster included), keyed by record id —
       *  {loading, game}. */
      details: {},
      /** Per-section fold overrides, keyed by section key. Untouched
       *  sections answer by default: the live/newest game open, the rest
       *  folded. */
      folds: {},
      /** The records band — aggregates + the per-game ledger (FT-1019). */
      records: { loading: true, error: false, stats: null, games: [] },
      recordsOpen: false,
      /** "town" | "platform" — which ledger the band reads (FT-1019; the
       *  platform scope is StatsOverlay's old "All towns", rehomed). */
      recordsScope: "town",
      /** FT-1060: the roster's role hover card — which role and which icon
       *  it is anchored to, RoleDrawer's own pair of fields. */
      rosterCardRole: null,
      rosterCardAnchor: null,
    };
  },
  mounted() {
    // FT-1206: the chat level and the counts toggle are town rules — the
    // storyteller can turn them mid-session and this composer must hear it.
    window.addEventListener(TOWER_EVENT, this.readChatRules);
  },
  beforeDestroy() {
    window.removeEventListener(TOWER_EVENT, this.readChatRules);
  },
  computed: {
    ...mapState(["chat", "grimoire", "session", "night"]),
    // FT-1101: this viewer's OWN night rows — the getter that has always
    // scoped a player to their own seat (night/myEntries). The stream's
    // night blocks read it, so no wider source is ever in reach here.
    ...mapGetters({ myEntries: "night/myEntries" }),
    ...mapState("players", ["players"]),
    /** FT-1019: what kind of line the stream shows — one of golem/
     *  chronicles' FILTERS, held in the ROOT STORE so the V hotkey can arm
     *  "gallows" before this drawer exists (App.vue's keyup). */
    filter: {
      get() {
        return this.$store.state.chroniclesFilter;
      },
      set(f) {
        this.$store.commit("setChroniclesFilter", f);
      },
    },
    /** FT-1019: each game's UNFILTERED run, for the gallows thread to walk —
     *  the view filter must not blind a nomination to its own outcome. */
    threadSource() {
      const runs = {};
      this.chat.log.forEach((row) => {
        if (!row.gameId) return;
        (runs[row.gameId] = runs[row.gameId] || []).push(row);
      });
      return runs;
    },
    error() {
      return this.chat.error;
    },
    /** WHO THIS BROWSER IS — name-keyed, read from what it already knows. */
    viewer() {
      return viewerOf(this.$store.state);
    },
    /**
     * The identity the log in the store was FILTERED FOR (see ChatDrawer's
     * original note): rows are dropped at ingest, so an identity change
     * means the held log is wrong and must be re-read from zero.
     */
    viewerKey() {
      return `${this.viewer.isStoryteller ? "st" : "pl"}:${this.viewer.key}`;
    },
    canTalk() {
      return !!this.viewer.key && !!this.session.sessionId;
    },
    /** FT-1037: CURRENT'S ANCHOR — the seq of the last "The town opens."
     *  row. Derived from the log itself, so host, players and a mid-game
     *  reload all cut the stream at the same place. 0 = no open row ever
     *  (a pre-FT-1037 town): the whole log stands as Current. */
    anchorSeq() {
      return openAnchorSeq(this.chat.log);
    },
    /**
     * FT-1057 (user report): THE STORYTELLER'S EARLY VIEW — the opening
     * board as a synthetic stream row, host only, rendered straight from
     * the host-local stash socket.js wrote at the deal. It is NOT a log
     * row: nothing of it ever crossed the wire, so a player's client has
     * nothing to render even in principle. It sits just after the live
     * game's "A game begins." row (seq +0.5 keeps every real key intact)
     * and disappears when the end publishes the real row for everyone.
     */
    openingRow() {
      if (this.session.isSpectator) return null;
      const gameId = this.chat.gameId;
      if (!gameId) return null;
      const seats = peekOpeningBoard(gameId);
      if (!seats) return null;
      const startRow = this.chat.log.find((row) => {
        if (row.gameId !== gameId || row.kind !== "system") return false;
        const ev = decodeEvent(row.body);
        return !!ev && ev.t === "start";
      });
      if (!startRow) return null;
      return {
        id: "opening:" + gameId,
        seq: startRow.seq + 0.5,
        kind: "system",
        gameId,
        senderKey: "system",
        senderKind: "system",
        createdAt: startRow.createdAt,
        phase: startRow.phase,
        dayNumber: startRow.dayNumber,
        body: encodeEvent({
          t: "board",
          moment: "start",
          seats,
          text: "The game begins — the dealt board, your eyes only until the end.",
        }),
      };
    },
    /** The Current stream: everything since the town opened this time,
     *  narrowed to the kind of line being looked at. FT-1057 (user report):
     *  a FINISHED game's rows never stand here — Current is the live town
     *  only, and History is where finished games are read. The host's
     *  opening-board row (above) rides in beside the live game's start. */
    visible() {
      const anchor = this.anchorSeq;
      const live = this.chat.gameId;
      const rows = this.chat.log.filter((row) => {
        if (anchor && row.seq < anchor) return false;
        if (row.gameId && row.gameId !== live) return false;
        return inFilter(row, this.filter);
      });
      // FT-1057's opening board and FT-1101's night blocks are both SYNTHETIC
      // — rows this client computes from what it alone holds, spliced into
      // the stream at the seq they belong to. Neither ever crossed the wire.
      // FT-1263's traffic rows are the third of the kind.
      const synthetic = this.openingRow ? [this.openingRow] : [];
      synthetic.push(...this.nightBlockRows);
      synthetic.push(...this.trafficRows);
      synthetic.forEach((extra) => {
        if (!inFilter(extra, this.filter)) return;
        const at = rows.findIndex((row) => row.seq > extra.seq);
        if (at < 0) rows.push(extra);
        else rows.splice(at, 0, extra);
      });
      return rows;
    },
    /** The chapters — consecutive runs of one gameId, in story order. */
    sections() {
      return sectionize(this.visible);
    },
    /** Every game the LOG knows, newest first, for the picker. Derived from
     *  the unfiltered log so the picker never loses a game to the filter. */
    games() {
      return gamesOf(this.chat.log);
    },
    /**
     * FT-1037: HISTORY'S GAMES, newest first — the recorded games and the
     * log's own chapters merged on the deal instant both sides carry
     * (logGameIdOf), so one game is one entry however many surfaces know
     * it. The LIVE game is Current's and never listed here.
     */
    historyGames() {
      const town = this.session.sessionId;
      const known = new Set(this.games.map((g) => g.gameId));
      const claimed = new Set();
      const entries = [];
      this.records.games.forEach((g) => {
        const gid = logGameIdOf(town, g.startedAt);
        const logGameId = gid && known.has(gid) ? gid : null;
        if (logGameId) claimed.add(logGameId);
        entries.push({
          key: "rec:" + g.id,
          record: g,
          logGameId,
          at: g.startedAt || g.endedAt,
        });
      });
      this.games.forEach((g) => {
        if (g.gameId === this.chat.gameId) return;
        if (claimed.has(g.gameId)) return;
        entries.push({
          key: "log:" + g.gameId,
          record: null,
          logGameId: g.gameId,
          at: g.startedAt,
        });
      });
      return entries.sort(
        (a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0),
      );
    },
    /** The picked entry, or null. */
    pickedGame() {
      return this.historyGames.find((e) => e.key === this.historyPick) || null;
    },
    /** The picked game's whole chapter — unfiltered, for the thread walk,
     *  the durations and the portraits. Empty for a record-only game. */
    pickedRows() {
      const g = this.pickedGame;
      if (!g || !g.logGameId) return [];
      return this.threadSource[g.logGameId] || [];
    },
    pickedVisibleRows() {
      return this.pickedRows.filter((row) => inFilter(row, this.historyFilter));
    },
    /** FT-1032's phase clocks, for the picked chapter's rows. */
    pickedRan() {
      return phaseDurations(this.pickedRows);
    },
    /** The board portraits the log holds for this game, or nulls. */
    pickedBoards() {
      const g = this.pickedGame;
      if (!g || !g.logGameId) return { start: null, day1: null, end: null };
      return boardsOf(this.pickedRows, g.logGameId);
    },
    /** Winner: the record's word first, else the chapter's own end row. */
    pickedWinner() {
      const g = this.pickedGame;
      if (!g) return null;
      if (g.record) return g.record.winningTeam;
      return winnerOf(this.pickedRows, g.logGameId);
    },
    pickedScript() {
      const g = this.pickedGame;
      return (g && g.record && g.record.scriptName) || "Unrecorded game";
    },
    /** The fetched full record (roster aboard), or null while absent. */
    pickedDetail() {
      const g = this.pickedGame;
      return (g && g.record && this.details[g.record.id]) || null;
    },
    /**
     * THE ROSTER — the record's seats when the archive answers (role, fate),
     * the end portrait's ring as the fallback, each name joined to its own
     * town-wide line (games / wins / survived) from the aggregates the band
     * already read.
     */
    pickedRoster() {
      const aggr = new Map(
        ((this.records.stats && this.records.stats.players) || []).map((p) => [
          p.playerName,
          p,
        ]),
      );
      const rowFor = (name, roleId, survived, i) => {
        const a = aggr.get(name);
        // FT-1060: the cell wants the ROLE (for its icon and the hover
        // card), the name text stays for the icon's alt/aria and for an
        // unknown id's fallback.
        const role = this.roleOf(roleId);
        return {
          key: i + ":" + name,
          name,
          role,
          roleName: (role && role.name) || roleId || "—",
          survived,
          games: a ? a.games : "—",
          wins: a ? a.wins : "—",
          survivals: a ? a.survivals : "—",
        };
      };
      const detail = this.pickedDetail;
      const seats = (detail && detail.game && detail.game.seats) || [];
      if (seats.length) {
        return seats.map((s, i) =>
          rowFor(s.playerName, s.roleIdFinal, s.survived, i),
        );
      }
      const boards = this.pickedBoards;
      const ring =
        (boards.end && boards.end.seats) ||
        (boards.start && boards.start.seats) ||
        (boards.day1 && boards.day1.seats) ||
        [];
      return ring.map((s, i) => rowFor(s.name, s.role, !s.dead, i));
    },
    filterCells() {
      const cells = [
        { id: "all", label: "All", title: "Talk and events together" },
        { id: "talk", icon: uiChat, title: "Only what people said" },
        {
          id: "gallows",
          icon: uiVotes,
          title: "The gallows — nominations, votes, executions",
        },
        {
          id: "events",
          icon: uiEvents,
          title:
            "Everything else that happened — deals, phases, deaths, endings",
        },
      ];
      // FT-1136: "all" stays a WORD on purpose. A word among icons is what
      // marks the row's default — the reset you fall back to — so it is not
      // an oversight waiting to be tidied up.
      // FT-1037b (user call): the retired night drawer is a cell here now,
      // wearing the moon door's own art. Same gate the door had (FT-860):
      // the town shares night info with everyone, and this viewer holds a
      // chair — its content is that seat's own rows and nothing else.
      // FT-1274 (user: "the storyteller has no night-actions filter"): the
      // cell is a FIFTH CELL FOR EVERYONE now, not a player-only door.
      //
      // THE CALL, and why. The alternative was an ST-only cell, and it is the
      // wrong one for the same reason the two-sentence bug this pass fixes was
      // wrong: it puts the storyteller and a player on different furniture
      // looking at the same record. After this pass a night row is an ordinary
      // stream row worded identically for both, so the cell that narrows the
      // stream to those rows is the same object for both, and there is nothing
      // left to make reader-specific. A player sees only their OWN night rows
      // under it — which is honest, because those are the only ones their
      // client has ever held — and gains nothing they did not already have.
      //
      // The GATE is the honest version of the same thought: the cell appears
      // when this reader is holding night rows at all. That subsumes every
      // clause the old player-only gate spelled out (no seat, nothing
      // delivered, the town not sharing) without asking any of them, because
      // each one already ends in an empty set of rows.
      if (this.canSeeNights) {
        cells.push({
          id: "nights",
          icon: uiNight,
          title: this.session.isSpectator
            ? "Your nights — what you were told, yours alone until the game ends"
            : "The night's record — every seat's action, yours alone until the game ends",
        });
      }
      return cells;
    },
    /**
     * FT-1037b: the moon cell's gate — the retired strip door's
     * `showNightInfo` rule.
     *
     * FT-1101 CORRECTED THE AUTHORITY IT ASKS, which is the literal reason
     * the user's Imp had no kill option. The old test was
     * `this.night.mode !== "everyone"`, and on a PLAYER's client
     * `night.mode` is that browser's OWN saved setting (persistence.js reads
     * golem.nightMode at boot, before any town is known) — not the town's.
     * So a player whose browser had ever saved "storyteller" or "off" — one
     * evening spent hosting is enough — lost the entire night surface in
     * every town they joined afterwards, silently and permanently, while the
     * host was sharing normally. Measured both ways in a real hosted game:
     * host "everyone" + a saved "storyteller" hid the cell; host
     * "storyteller" + the default showed it.
     *
     * `playerNight.live` is the HOST's own verdict, delivered per seat with
     * the rows (socket.js sendNightRows), which is the only authority that
     * was ever meant to answer this.
     *
     * FT-1107 rider (user): "if it is set to storyteller only for night
     * actions the user doesn't see the action menu at night, but they still
     * see the log if the story teller fills it in." So `live` — which is the
     * town's ASK verdict — stopped being the right test the moment the ask
     * moved off this drawer entirely. This cell is the RECORD, and a player
     * in a Storyteller-only town has one as soon as their storyteller writes
     * a row for them. The real fix is host-side (sendNightRows now shares a
     * seat's rows in every mode but "off"); this reads whether any arrived.
     */
    /**
     * FT-1274: ...AND THE GATE IS NOW "AM I HOLDING ANY NIGHT ROWS?", asked of
     * every reader with the same question.
     *
     * The whole rule above survives inside it rather than being thrown away.
     * A player with no seat holds no rows; a player whose storyteller has
     * written nothing for them holds no rows; a town in "off" produces none.
     * Every clause the old gate tested for ends in the same empty set, so
     * testing the set tests all of them — and it is the only phrasing that
     * ALSO answers the question for the storyteller, who was refused outright
     * by the first line of the old rule and is the reason this changed.
     *
     * It reads the synthetic blocks first (the live game — each reader's own),
     * then falls back to a published night row in the log, so the cell does
     * not vanish at the moment the host publishes the finished record and the
     * synthetic copies stand down.
     *
     * The old rule's whole note is kept below it, unindented, because the
     * measurement in it (FT-1101's `night.mode` bug) is the reason this
     * function is careful and would be lost with the code it explains.
     */
    canSeeNights() {
      if (this.nightBlockRows.length) return true;
      return this.chat.log.some((row) => {
        if (row.kind !== "system") return false;
        const ev = decodeEvent(row.body);
        return !!ev && ev.t === "nights";
      });
    },
    /* FT-1274: THE OLD GATE, stood down rather than deleted (the house rule),
       and kept because its note above is the record of a measured bug:

         canSeeNights() {
           if (!this.session.isSpectator) return false;   // ← the ST, refused
           const { live, rows } = this.night.playerNight;
           if (!live && !rows.length) return false;
           return seatOf(this.$store.state) >= 0;
         }

       `seatOf` is still imported and still used elsewhere in this file. */
    /**
     * FT-1101: IS THE NIGHT ASKING THIS SEAT FOR SOMETHING RIGHT NOW?
     * The nights view's own question (ChroniclesNights), asked here so the
     * pinned band can stand at the foot of the stream — one definition in
     * golem/nightLog so the two rooms cannot disagree.
     *
     * FT-1107: …and the ONE definition moved again, from the helper into the
     * store (`night/myCall`), because the clock face asks the same question
     * from two components at once — the hub that words the ask and every
     * seat that can take the pick. What is left here is the drawer's own
     * qualifier (History is a reading room, so never in it) on top of that
     * one answer. The band this fed has stood down; see the template.
     */
    nightCall() {
      if (this.mode !== "current") return null;
      return this.$store.getters["night/myCall"];
    },
    /** This seat's delivered row for tonight's call, or null before the host
     *  has echoed anything. The echo is the truth; nothing is optimistic. */
    nightCallRow() {
      if (!this.nightCall) return null;
      return this.$store.getters["night/myCallRow"];
    },
    /**
     * FT-1101: THE NIGHT AS STREAM ROWS — one synthetic block per night,
     * built from data this client ALREADY HOLDS and nobody else's.
     *
     *   the storyteller  night.entries — their own log, host-local, never
     *                    broadcast (FT-860)
     *   a player         night/myEntries — their own seat's rows, delivered
     *                    per seat on the direct lane and projected on the way
     *                    in (FT-1005)
     *
     * PRIVACY IS STRUCTURAL, not a filter: nothing new goes on the wire, so
     * there is no frame carrying another seat's night content for anyone to
     * receive. It is FT-1057's opening-board pattern exactly — a row that is
     * not a log row until the end publishes it.
     *
     * Silent once the game has ENDED: App.vue's onGameRecorded posts the real
     * rows then, public like the rest of the finished record, and a synthetic
     * copy standing beside a published one would say the night twice.
     */
    nightBlockRows() {
      if (this.mode !== "current") return [];
      if (this.session.isEnded) return [];
      const gameId = this.chat.gameId;
      if (!gameId) return [];
      const own = this.session.isSpectator;
      // FT-1107 rider: TWO GATES, ONE PER READER, and neither is the one that
      // used to stand here.
      //
      // The storyteller reads their OWN log, so their own "off" is the right
      // question to ask them. A PLAYER's `night.mode` is their own browser's
      // saved setting and says nothing whatsoever about the town they joined
      // (the FT-1101 bug in canSeeNights above, one room over) — an evening
      // spent hosting with the sheet off would have silently emptied their
      // chronicle in every town afterwards.
      //
      // And a player's own gate is no longer `live`: the town's visibility
      // setting governs the ASK, not the RECORD, so a seat in a
      // Storyteller-only town reads whatever their storyteller entered for
      // them. There is nothing left to test — an empty `myEntries` is
      // already the answer, in every mode, for every reason.
      if (!own && this.night.mode === "off") return [];
      const blocks = nightBlocksOf(own ? this.myEntries : this.night.entries, {
        own,
      });
      if (!blocks.length) return [];
      // WHERE A NIGHT'S BLOCK STANDS: immediately after that night's own
      // "Night N falls." row, so the actions sit inside the night they
      // happened in. +0.6 keeps every real seq intact and clears the opening
      // board's +0.5 (a different anchor row, but the margin is free).
      const anchors = new Map();
      this.chat.log.forEach((row) => {
        if (row.gameId !== gameId || row.kind !== "system") return;
        const ev = decodeEvent(row.body);
        if (ev && ev.t === "phase" && ev.night) anchors.set(ev.day, row);
      });
      const out = [];
      blocks.forEach((block) => {
        const anchor = anchors.get(block.day);
        if (!anchor) return;
        out.push({
          id: "nights:" + gameId + ":" + block.day,
          seq: anchor.seq + 0.6,
          kind: "system",
          gameId,
          senderKey: "system",
          senderKind: "system",
          createdAt: anchor.createdAt,
          phase: "night",
          dayNumber: block.day,
          body: encodeEvent({
            t: "nights",
            day: block.day,
            lines: block.lines,
            // WHO ELSE is entitled to this block, said to the reader in
            // front of it — the seat and the storyteller are both entitled
            // and neither sentence fits the other.
            privacy: own
              ? "Only you and the storyteller see this, until the game ends."
              : "Only you and each player's own seat see these, until the game ends.",
            text: nightBlockText(block.day, block.lines),
          }),
        });
      });
      return out;
    },
    /** History's Messages page filters LOG rows only — the nights view is
     *  Current's (a live, viewer-local surface, not a game's chapter). */
    historyCells() {
      return this.filterCells.filter((f) => f.id !== "nights");
    },
    /** Who can be whispered — ChatDrawer's rule, verbatim.
     *
     *  FT-1206 adds the chat level: every chip now carries `refusal` — null,
     *  or why it cannot be armed right now, in the level's own words. The
     *  LIST does not shrink (a chip you cannot pick is drawn refused, the
     *  fixed-list rule) and the Storyteller chip never refuses: that lane
     *  stays open at every level, Off included. */
    whisperTargets() {
      const out = [];
      const state = this.$store.state;
      const viewer = this.viewer;
      if (this.session.isSpectator) {
        out.push({
          id: "host",
          label: "Storyteller",
          key: STORYTELLER_KEY,
          seat: null,
          refusal: null,
        });
      }
      const mySeat = seatOf(state);
      this.players.forEach((player, seat) => {
        if (!player.id) return;
        if (player.id === this.session.playerId) return;
        if (seat === mySeat) return;
        out.push({
          id: player.id,
          label: player.name || `Seat ${seat + 1}`,
          key: player.name || `Seat ${seat + 1}`,
          seat,
          refusal: whisperRefusal(
            this.chatLevel,
            viewer,
            seat,
            mySeat,
            this.players.length,
          ),
        });
      });
      return out;
    },
    /** FT-1206: may this viewer talk to the ROOM — null, or the reason not
     *  ("Chat is off…"). The storyteller is never refused. */
    sayRefusalText() {
      return sayRefusal(this.chatLevel, this.viewer);
    },
    /**
     * FT-1206: THE COUNTS BAND — per-pair whisper tallies for the running
     * game, when the town's "Count whispers" toggle is on. Derived from the
     * rows THIS viewer holds, which is the entire visibility model: the
     * storyteller's log holds every whisper (full table, live); a player's
     * holds only their own (their pairs only — the Chronicle never told them
     * another pair's whisper even EXISTED live, and the counts keep that
     * promise); at game end the publish hands everyone every row and the
     * finished game's whispers are readable in History outright.
     */
    whisperPairCounts() {
      if (!this.countsOn || this.mode !== "current") return [];
      return whisperCountsFor(this.chat.log, this.chat.gameId);
    },
    /**
     * FT-1263: WHISPER TRAFFIC A BYSTANDER SAW FLY — "Ana ✈ Bea" as dim
     * stream rows, the plane's memory (store's chat.marks; only a viewer who
     * was NOT a party holds any, and only when the marks were on to fly).
     * Two gates besides:
     *
     *   countsOn — the town's "Count whispers" setting says whether whisper
     *   METADATA reads in the Chronicle, and this is metadata; the tally
     *   band above obeys the same switch and the two must not disagree.
     *
     *   the live game only — a FINISHED game publishes its real whisper
     *   rows to everyone (canSee), and the memory standing beside the
     *   published row would say every whisper twice. Current's own gameId
     *   rule enforces it; between-games marks (gameId null) stand, because
     *   no publish ever supersedes them.
     */
    trafficRows() {
      if (!this.countsOn || this.mode !== "current") return [];
      const anchor = this.anchorSeq;
      const live = this.chat.gameId;
      return this.chat.marks.filter((row) => {
        if (anchor && row.seq < anchor) return false;
        return !row.gameId || row.gameId === live;
      });
    },
    topPlayers() {
      const players = (this.records.stats && this.records.stats.players) || [];
      return [...players]
        .sort((a, b) => b.games - a.games || b.wins - a.wins)
        .slice(0, 10);
    },
    placeholder() {
      if (!this.canTalk) return "";
      return this.target ? `Whisper ${this.target.label}…` : "Say something…";
    },
    mutedText() {
      if (!this.session.sessionId) return "Join a town to talk in it.";
      return "Take a seat, or set a name, and you can talk.";
    },
    emptyText() {
      if (this.chat.syncing) return "Reading the town's story…";
      if (this.filter === "events") return "Nothing has happened yet.";
      // FT-1274: the moon cell narrows the stream now, so it has an empty
      // state like every other cell — and it is owed the two readers' own
      // words, because "nothing yet" means different things to them.
      if (this.filter === "nights") {
        return this.session.isSpectator
          ? "Nothing yet. What you learn at night will be written down here."
          : "No night actions recorded yet.";
      }
      return "Nothing said since the town opened.";
    },
  },
  watch: {
    isOpen(open) {
      if (!open) return;
      // Catch up from the contiguity cursor (safe to overlap — the action
      // refuses re-entry and every row dedups by seq), and re-read the
      // records: a game may have finished since last look.
      this.$store.dispatch("chatCatchUp");
      this.loadRecords();
      this.stuck = true;
      this.$nextTick(this.toBottom);
    },
    viewerKey() {
      this.$store.commit("chatReset");
      this.$store.dispatch("chatCatchUp");
    },
    visible() {
      if (this.stuck) this.$nextTick(this.toBottom);
    },
    /** A target who left the town cannot be whispered; fall back to the room.
     *  FT-1206: and one the chat level has since refused disarms the same way
     *  (the chip stays drawn, refused — only the ARMED state falls back). */
    whisperTargets(list) {
      if (!this.target) return;
      const t = list.find((q) => q.id === this.target.id);
      if (!t || t.refusal) this.target = null;
    },
    /** FT-1066: no more forced default (an accordion starts closed) — this
     *  only folds an open row if its game disappears from under it, e.g. a
     *  resync while it stood unfolded. */
    historyGames(list) {
      if (this.historyPick && !list.some((e) => e.key === this.historyPick)) {
        this.historyPick = null;
      }
    },
    /** FT-1037b: the moon cell's gate can close under an armed nights
     *  filter (the town stops sharing, the seat is lost) — fall back to the
     *  whole stream rather than an empty surface. */
    canSeeNights(can) {
      if (!can && this.filter === "nights") this.filter = "all";
    },
    /** A recorded pick fetches its roster (once — details caches by id). */
    historyPick() {
      const g = this.pickedGame;
      if (g && g.record) this.loadDetail(g.record);
    },
  },
  methods: {
    loadRecords() {
      const town = this.session.sessionId;
      if (!town) {
        this.records = { loading: false, error: false, stats: null, games: [] };
        return;
      }
      this.records = { loading: true, error: false, stats: null, games: [] };
      // Town scope reads the aggregates AND the per-game ledger together;
      // platform scope is aggregates only (a per-game list across every town
      // is not a surface this band offers). Best-effort as one unit — a half
      // answer renders as the honest error line, not a half band.
      const reads =
        this.recordsScope === "platform"
          ? [platformStats(), Promise.resolve([])]
          : [townStats(town), townGames(town)];
      Promise.all(reads)
        .then(([stats, games]) => {
          this.records = { loading: false, error: false, stats, games };
        })
        .catch(() => {
          this.records = {
            loading: false,
            error: true,
            stats: null,
            games: [],
          };
        });
    },
    setRecordsScope(scope) {
      if (this.recordsScope === scope) return;
      this.recordsScope = scope;
      this.loadRecords();
    },
    /**
     * FT-1146: leave for the RECORDS PAGE — every town together, on a surface
     * with room for the boards. `id` names a game to open onto, or null for
     * its landing view. The pick is committed FIRST: `toggleModal` closes this
     * drawer, so by the time the page mounts this component is gone and could
     * not hand it anything.
     */
    openRecords(id) {
      this.$store.commit("setRecordsPick", id || null);
      this.$store.commit("toggleModal", "records");
    },
    /** FT-1037: the reading mode flips. Entering History re-reads the
     *  records (a game may have finished since last look); returning to
     *  Current re-sticks the stream to its newest line. */
    setMode(mode) {
      if (this.mode === mode) return;
      this.mode = mode;
      if (mode === "history") {
        // FT-1066: no more auto-pick of the newest game — the accordion
        // opens closed; a click on a ledger row is what unfolds one.
        this.loadRecords();
      } else {
        this.stuck = true;
        this.$nextTick(this.toBottom);
      }
    },
    /** FT-1066: whether a ledger row's own game is the one unfolded. */
    isLedgerOpen(g) {
      const p = this.pickedGame;
      return !!p && !!p.record && p.record.id === g.id;
    },
    /** A ledger row toggles its own accordion body — open if folded, folded
     *  if already open. Picking a different row simply re-points
     *  historyPick, which folds whichever row held it before (only one
     *  entry can ever match). */
    toggleLedger(g) {
      const entry = this.historyGames.find(
        (e) => e.record && e.record.id === g.id,
      );
      if (!entry) return;
      if (this.historyPick === entry.key) {
        this.historyPick = null;
        return;
      }
      this.historyPick = entry.key;
      this.historyTab = "stats";
      this.$nextTick(() => this.scrollLedgerIntoView(g.id));
    },
    /** Scrolls a just-opened row into view — a no-op if it's already
     *  visible, since scrollIntoView's "nearest" only moves what it must. */
    scrollLedgerIntoView(id) {
      const el = this.$el.querySelector(`[data-ledger-row="${id}"]`);
      if (el) el.scrollIntoView({ block: "nearest" });
    },
    /** FT-1066: superseded by toggleLedger — the ledger no longer drives a
     *  separate dropdown, so this has no caller. Left in place rather than
     *  removed (never-delete). */
    pickFromLedger(g) {
      const entry = this.historyGames.find(
        (e) => e.record && e.record.id === g.id,
      );
      if (!entry) return;
      this.historyPick = entry.key;
      this.historyTab = "stats";
    },
    /** FT-1066: the retired dropdown's line for a game — no longer called
     *  now that the ledger's own rows are the only picker. Left in place
     *  rather than removed (never-delete). */
    historyLabel(g) {
      const when = startLabelOf(g.at) || "—";
      return when + " — " + (g.record ? g.record.scriptName : "unrecorded");
    },
    historyWhen(g) {
      return startLabelOf(g.at) || "—";
    },
    /** One full record, fetched once and kept — best-effort like every
     *  records read: a miss renders the portraits/fallbacks, never an
     *  error page. */
    loadDetail(record) {
      if (!record || this.details[record.id]) return;
      this.$set(this.details, record.id, { loading: true, game: null });
      gameRecord(record.id)
        .then((game) => {
          this.$set(this.details, record.id, { loading: false, game });
        })
        .catch(() => {
          this.$set(this.details, record.id, { loading: false, game: null });
        });
    },
    /** A role id's role object — the loaded edition first, the full
     *  official library second, null when neither knows it (the roster row
     *  falls back to the raw id as its name, and a dash for its icon). */
    roleOf(id) {
      if (!id) return null;
      return (
        this.$store.state.roles.get(id) ||
        this.$store.getters.rolesJSONbyId.get(id) ||
        null
      );
    },
    /** The roster's own engraving — golem/roleDrag's one definition, shared
     *  with the grimoire drawer and the build panel's tray. */
    roleIcon(role) {
      return roleIconSrc(role);
    },
    /** FT-1060: rest on a roster icon and the hover card says what it is —
     *  RoleDrawer's showCard, verbatim, scoped to this table. */
    showRosterCard(role, e) {
      if (!role) return;
      if (!window.matchMedia("(hover: hover)").matches) return;
      const el = e.currentTarget;
      clearTimeout(this.$options.rosterCardTimer);
      this.$options.rosterCardTimer = setTimeout(() => {
        this.rosterCardAnchor = el;
        this.rosterCardRole = role;
      }, ROSTER_HOVER_DELAY);
    },
    hideRosterCard() {
      clearTimeout(this.$options.rosterCardTimer);
      this.rosterCardRole = null;
      this.rosterCardAnchor = null;
    },
    recordLabel(g) {
      return startLabelOf(g.startedAt || g.endedAt) || "—";
    },
    /** FT-1019: the live tally list's two controls (see the template note —
     *  session list only; the permanent log is untouched by both). */
    toggleLiveAllowed() {
      this.$store.commit(
        "session/setVoteHistoryAllowed",
        !this.session.isVoteHistoryAllowed,
      );
    },
    clearLive() {
      this.$store.commit("session/clearVoteHistory");
    },
    isLive(section) {
      return !!this.chat.gameId && section.gameId === this.chat.gameId;
    },
    /** Folded or not: the user's own toggle wins; otherwise the live game
     *  and the newest chapter stand open and finished ones stand folded. */
    isExpanded(section) {
      if (section.key in this.folds) return this.folds[section.key];
      if (this.isLive(section)) return true;
      const last = [...this.sections]
        .reverse()
        .find((candidate) => candidate.gameId);
      return !!last && last.key === section.key;
    },
    toggleSection(section) {
      this.$set(this.folds, section.key, !this.isExpanded(section));
    },
    /** FT-1032: seconds each phase ran, keyed by the closing row id. */
    ranOf(section, row) {
      if (!this._ranCache) this._ranCache = new WeakMap();
      let map = this._ranCache.get(section.rows);
      if (!map) {
        map = phaseDurations(section.rows);
        this._ranCache.set(section.rows, map);
      }
      return map[row.id] != null ? map[row.id] : null;
    },
    sectionLabel(section) {
      // FT-1020 (user): the label IS the start moment, not an ordinal.
      const first = section.rows[0];
      const when = first ? startLabelOf(first.createdAt) : "";
      return when || `Game ${section.ordinal}`;
    },
    rowClass(row) {
      return [
        "is-" + row.kind,
        { mine: row.kind !== "system" && row.senderKey === this.viewer.key },
      ];
    },
    pick(t) {
      // FT-1206: a refused chip does not arm — its tooltip carries the why.
      if (t && t.refusal) return;
      this.target = t;
      this.$store.commit("chatError", "");
      this.$nextTick(() => {
        if (this.$refs.entry) this.$refs.entry.focus();
      });
    },
    /** FT-1206: the tower snapshot — TOWER_EVENT's reader. */
    readChatRules() {
      this.chatLevel = towerState.chatLevel;
      this.countsOn = !!towerState.whisperCounts;
    },
    onScroll() {
      const el = this.$refs.log;
      if (!el) return;
      this.stuck = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    },
    toBottom() {
      const el = this.$refs.log;
      if (el) el.scrollTop = el.scrollHeight;
    },
    /**
     * SEND — ChatDrawer's contract, verbatim: nothing is appended locally,
     * the line reaches the log when the relay echoes the row the STORE
     * accepted, and a refusal lands under the composer.
     */
    send() {
      const body = this.draft.trim();
      if (!body || !this.canTalk) return;
      const t = this.target;
      // FT-1206: the chat level's last word before the wire — the chips and
      // the Town button already refuse to ARM what the level forbids; this
      // catches a level that changed under a composed line, and says why
      // where the composer's refusals are said.
      const why = t ? t.refusal : this.sayRefusalText;
      if (why) {
        this.$store.commit("chatError", why);
        return;
      }
      // FT-1206: the frames are golem/chat's own builders now — the same
      // whisperFrame the seat schemes send through, so the drawer and the
      // seats can never drift apart on what a whisper IS.
      const state = this.$store.state;
      this.$store.commit(
        "chatSay",
        t ? whisperFrame(state, t, body) : sayFrame(state, body),
      );
      this.draft = "";
      this.stuck = true;
    },
  },
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
@import "../drawer.scss";
@import "../controls.scss";

.chronicles-drawer {
  // the right-hand rail's blood seam, as every drawer on it
  @include right-drawer(#4a0d0d);
  @include sheet-handle;
  // FT-1037: above the square's bluffs/fabled panels (z 50, which float OVER
  // the mixin's z 20 and were sitting on the stats portraits), still under
  // the player strip (75) and the session pill (80). Scoped here rather than
  // in the shared mixin — the other drawers' stacking is not this lane's.
  //
  // FT-1141 STOOD THIS DOWN: it is now a no-op restating the family value.
  // The script drawer turned out to have the identical defect and no patch of
  // its own, so this line's 55 was promoted into `right-drawer` itself and
  // every drawer inherits it. Kept, not deleted — it is the record of where
  // the number came from, and it agrees with the mixin exactly, so it can
  // never disagree with it.
  z-index: 55;
}

.cr-view {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 6px;
}

// ── THE MODE TOGGLE (FT-1037) — Current | History, beside the title ────────
// FT-1273: its own row under the title, and a quarter larger. The old
// `margin-left: 12px` was the gap to the title beside it — retired with
// that placement.
.cr-mode-row {
  display: flex;
  flex: none;
  padding: 0 0 6px;
}
.cr-mode {
  @include control-plate;
  display: flex;
  overflow: hidden;
}
.cr-mode-btn {
  @include control-cell;
  // FT-1273 (user): "about 25% bigger" — 12 -> 15px, padding to match.
  padding: 4px 15px;
  font-size: 15px;
  line-height: 1.5;
  white-space: nowrap;
  &.on {
    @include control-lit;
  }
}

// ── THE RECORDS BAND ───────────────────────────────────────────────────────
// FT-1019 (user, twice): the band stopped being 11px table scraps. The
// summary line reads at the stream's own size, the ledger rows wear the
// chapter headings' lettering, and the tables sit two sizes up.
.cr-records {
  @include control-plate;
  flex: none;
  padding: 5px 10px;
  max-height: 45vh;
  overflow-y: auto;
}
.cr-records-line {
  margin: 0;
  font-size: 14px;
  text-align: center;
  opacity: 0.85;
  cursor: pointer;
  user-select: none;
  &:hover {
    opacity: 1;
  }
  b {
    color: #c00;
    font-size: 16px;
  }
}
.cr-records-chev {
  margin-left: 7px;
  font-size: 10px;
  opacity: 0.6;
  transition: transform 150ms;
}
.cr-records.open .cr-records-chev {
  transform: rotate(180deg);
}

// which ledger — this town, or every town together
.cr-scope {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin: 7px 0 4px;
}
.cr-scope-btn {
  @include control-plate;
  font-family: inherit;
  padding: 2px 10px;
  font-size: 12px;
  color: #d8cdb4;
  cursor: pointer;
  transition:
    color 150ms,
    border-color 150ms,
    background 150ms;
  &:hover {
    color: #fff;
    @include control-plate-hover;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
  &.on {
    @include control-lit;
  }
}

// THE LEDGER — one row per recorded game: began, script, winner. A row the
// log also holds is a DOOR into its chapter and lights like one.
.cr-recgames {
  list-style: none;
  margin: 4px 0 6px;
  padding: 0;
  li {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 14px;
    & + li {
      border-top: 1px solid rgba(216, 205, 180, 0.1);
    }
    &.jump {
      cursor: pointer;
      &:hover {
        background: rgba(216, 205, 180, 0.08);
        .rg-when {
          color: #fff;
        }
      }
      // FT-1066: the row holding the open accordion body stays lit, not
      // just on hover — it's the one thing on screen right now.
      &.open {
        background: rgba(216, 205, 180, 0.1);
        .rg-when {
          color: #fff;
        }
      }
    }
    // FT-1137 (user: "why is the history faded? it needs to have full
    // brightness"). This rule dims a ledger ROW that cannot be opened — a
    // reasonable thing to say about a row. But the unfolded game page is
    // also an `li` in this list and also carries no `.jump`, so it inherited
    // the dimming meant for its neighbours: the whole record a user had just
    // asked to see rendered at 60%. The exclusion is by the body's own class
    // rather than by adding `.jump` to it, because the body genuinely is not
    // clickable — the bug was the selector's reach, not the body's nature.
    &:not(.jump):not(.cr-recbody) {
      opacity: 0.6;
      cursor: default;
    }
  }
  // the accordion body is a BLOCK, not another row — override the generic
  // `li` flex layout above via the extra class's higher specificity.
  .cr-recbody {
    display: block;
    cursor: default;
    padding: 8px 2px 4px;
  }
}
// FT-1066: the ledger row's own fold/unfold chevron — same idiom as the
// game chapters' (.cr-chev) and the records line's (.cr-records-chev).
.rg-chev {
  margin-left: auto;
  font-size: 10px;
  opacity: 0.55;
  transform: rotate(-90deg);
  transition: transform 150ms;
  &.open {
    transform: none;
  }
}
.rg-when {
  font-family: PiratesBay, sans-serif;
  font-size: 15px;
  color: #d8cdb4;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.rg-script {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.9;
}
.rg-winner {
  font-family: PiratesBay, sans-serif;
  font-size: 15px;
  white-space: nowrap;
  &.good {
    color: $townsfolk;
  }
  &.evil {
    color: $demon;
  }
}

.cr-records table {
  margin: 6px auto 4px;
  border-collapse: collapse;
  font-size: 13px;
  cursor: default;
  th {
    opacity: 0.6;
    font-weight: normal;
    text-align: left;
    padding: 2px 12px 2px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }
  td {
    text-align: left;
    padding: 3px 12px 3px 0;
  }
  th:not(:first-child),
  td:not(:first-child) {
    text-align: right;
    padding-right: 0;
    padding-left: 12px;
  }
}

// ── THE LIVE TALLY LIST's controls (gallows view, host only) ───────────────
.cr-live {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 18px;
  flex: none;
  font-size: 12px;
}
.cr-live-opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  opacity: 0.75;
  cursor: pointer;
  user-select: none;
  &:hover {
    opacity: 1;
    color: #ff9a9a;
  }
}

// ── THE FILTERS ────────────────────────────────────────────────────────────
.cr-filter {
  @include control-plate;
  display: flex;
  flex: none;
  overflow: hidden;
}
.cr-cell-icon {
  // FT-1273 (user): the filter row a quarter larger too — 16 -> 20px.
  height: 20px;
  display: block;
  margin: 0 auto;
  opacity: 0.85;
}

.cr-cell {
  @include control-cell;
  flex: 1 1 0;
  // FT-1273: 12 -> 15px with the padding stepped to match.
  padding: 5px 8px;
  font-size: 15px;
  line-height: 1.5;
  white-space: nowrap;
  &.on {
    @include control-lit;
  }
}
// ── HISTORY (FT-1037) — the reading room ───────────────────────────────────
.cr-hpick {
  flex: none;
}
.cr-select {
  @include control-plate;
  width: 100%;
  padding: 4px 8px;
  font-family: inherit;
  font-size: 13px;
  color: #d8cdb4;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: $control-focus;
  }
  option {
    background: #1a1210;
    color: #d8cdb4;
  }
}

.cr-hbody {
  padding-right: 4px;
}

.cr-hhead {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 2px 2px 6px;
}
.cr-hscript {
  font-family: PiratesBay, sans-serif;
  font-size: 17px;
  color: #d8cdb4;
}
.cr-hwhen {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.cr-hnote {
  margin: 6px 2px;
  font-size: 12px;
  opacity: 0.55;
  text-align: center;
}

// the two portraits stand side by side; a lone one stands centred
.cr-portraits {
  display: flex;
  // FT-1057b (user): the opening and final boards STACK — side by side they
  // fought for the drawer's width and the labels collided with the seats.
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 2px 0 8px;
}

// FT-1146: the two doors OUT of the drawer and onto the Records page — the
// band's "every town" line, and a game's own "the boards, full size". Quiet
// links, not buttons: the drawer's subject is this town, and these say where
// the wider thing lives without competing with it.
.cr-allrecords,
.cr-boardlink {
  margin: 6px 0;
  font-size: 13px;
  color: #d8cdb4;
  opacity: 0.6;
  cursor: pointer;
  transition:
    opacity 150ms,
    color 150ms;

  &:hover {
    opacity: 1;
    color: #fff;
  }
}
.cr-allrecords {
  text-align: center;
}

// the roster — the records band's table lettering, one size up
.cr-roster {
  width: 100%;
  margin: 2px 0 6px;
  border-collapse: collapse;
  font-size: 13px;
  cursor: default;
  th {
    opacity: 0.6;
    font-weight: normal;
    text-align: left;
    padding: 2px 10px 2px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }
  td {
    text-align: left;
    padding: 3px 10px 3px 0;
  }
  th:nth-child(n + 4),
  td:nth-child(n + 4) {
    text-align: right;
    padding-right: 0;
    padding-left: 10px;
  }
  .cr-rname {
    font-family: PiratesBay, sans-serif;
    color: #d8cdb4;
  }
  // FT-1060: the Role cell is the icon now — RoleDrawer's own 26px, the
  // sidebar's own size, so the roster and the drawer's rows read as one
  // idiom. The hover card carries the name; nothing here needs to.
  .cr-rrole {
    vertical-align: middle;
  }
  .cr-role-icon {
    display: block;
    width: 26px;
    height: 26px;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    cursor: default;
  }
  .cr-role-none {
    opacity: 0.4;
  }
  .lived {
    color: rgba(126, 214, 126, 0.85);
  }
  .died {
    opacity: 0.6;
  }
}

// ── THE STREAM ─────────────────────────────────────────────────────────────
.cr-log {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 4px 2px 0;
  font-size: 14px;
  line-height: 1.45;
}

.cr-rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

// A GAME CHAPTER — the chronicle's engraved heading, now over a fold.
.cr-game {
  margin: 6px 0;
  h4 {
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
    font-family: PiratesBay, sans-serif;
    font-weight: normal;
    font-size: 15px;
    opacity: 0.8;
    margin: 0 0 3px;
    cursor: pointer;
    user-select: none;
    &:hover {
      opacity: 1;
    }
    // the rule that runs off the heading to the drawer's edge
    &:after {
      content: "";
      flex: 1;
      height: 1px;
      background: linear-gradient(
        to right,
        rgba(216, 205, 180, 0.35),
        rgba(216, 205, 180, 0)
      );
    }
  }
  &.now h4 {
    opacity: 1;
  }
}
.cr-chev {
  // FT-1030: rides the row's right edge
  margin-left: auto;
  font-size: 10px;
  opacity: 0.55;
  transform: rotate(-90deg);
  transition: transform 150ms;
  &.open {
    transform: none;
  }
}
.cr-now {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 8px;
  background: rgba(216, 205, 180, 0.16);
  opacity: 0.85;
}
.cr-count {
  font-size: 10px;
  opacity: 0.45;
  font-variant-numeric: tabular-nums;
}

// FT-1036 (user: "waste of space"): the chapter hairline and its indent are
// gone — the fold chevron already says what nests where. Chat rows LIFT a
// touch instead (below) so talk and system separate without a gutter.
.cr-game .cr-rows {
  padding-left: 0;
}

// FT-1036: TALK stands a step off the black (a faint lifted plate); system
// lines stay flat on the ground — the user's own read: sinking is spent,
// so raise the voices instead.
.cr-row.is-say,
.cr-row.is-whisper {
  background: rgba(216, 205, 180, 0.06);
}

.cr-row {
  display: block;
  // FT-1018b, then FT-1020 ("bigger still"): the log reads two sizes up now.
  font-size: 16px;
  padding: 3px 6px;
  border-radius: 4px;
  color: #e8e2d4;
  word-break: break-word;
  & + .cr-row {
    margin-top: 1px;
  }
}

// FT-1023 (user call): the own-line purple hairline is GONE — "you" in the
// name slot already says whose line it is. (Whispers below keep their own
// mine mark; that one distinguishes sender from recipient in a pair.)

// FT-1263: WHISPER TRAFFIC lies flat and slim — no talk plate, no recess:
// a bystander's thin memory of a plane, between the lines people said.
.cr-row.is-whisper-traffic {
  padding-top: 1px;
  padding-bottom: 1px;
}

// A WHISPER IS VISIBLY NOT ROOM TALK — recessed purple, both ends named.
.cr-row.is-whisper {
  background: rgba(32, 24, 38, 0.85);
  box-shadow: inset 0 0 0 1px rgba(150, 130, 175, 0.28);
  color: #ddd3ea;
  // FT-1278 (user): the own-whisper left bar is GONE. "you" in the pair
  // already says which end of it you were; the bar was a second answer to
  // a question nobody asked. (Same call as FT-1023 on own talk lines.)
}

.cr-empty {
  flex: none;
  margin: 10px 4px;
  font-size: 13px;
  opacity: 0.55;
  text-align: center;
}

// ── THE COMPOSER ───────────────────────────────────────────────────────────
// No pill reserve here: chroniclesDrawer is listed in App.vue's
// rightDrawerOpen, so the session pill steps aside the way it does for every
// other drawer — the one-line fix ChatDrawer's lane was barred from making.
.cr-compose {
  flex: none;
  border-top: 1px solid rgba(216, 205, 180, 0.14);
  padding-top: 6px;
}

.cr-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 5px;
}
.cr-target {
  @include control-plate;
  font-family: inherit;
  padding: 2px 8px;
  font-size: 12px;
  color: #d8cdb4;
  cursor: pointer;
  transition:
    color 150ms,
    border-color 150ms,
    background 150ms;
  &:hover {
    color: #fff;
    @include control-plate-hover;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
  &.on {
    @include control-lit;
  }
  // an armed whisper goes purple — blood is "chosen" everywhere else
  &.is-whisper.on {
    background: rgba(60, 44, 78, 0.95);
    border-color: rgba(150, 130, 175, 0.75);
    color: #efe6ff;
  }
  // FT-1206: refused by the chat level — drawn, dim, the reason on the
  // tooltip; pick() swallows the click. The seat surfaces' own grammar.
  &.refused {
    cursor: not-allowed;
    opacity: 0.45;
    &:hover {
      color: #d8cdb4;
    }
  }
}

// ── FT-1206: THE WHISPER TALLY — a thin band over the composer ─────────────
.cr-whisper-counts {
  @include control-plate;
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  padding: 4px 10px;
  font-size: 12px;
  color: #d8cdb4;
}
.cr-wc-mark {
  width: 11px;
  flex: 0 0 11px;
  opacity: 0.75;
}
.cr-wc-pair {
  white-space: nowrap;
  b {
    color: #efe6ff;
  }
}

.cr-entry {
  display: flex;
  gap: 6px;
  align-items: stretch;
}
.cr-input {
  @include control-plate;
  flex: 1 1 auto;
  min-width: 0;
  padding: 5px 9px;
  font-size: 14px;
  font-family: inherit;
  color: white;
  &:focus {
    outline: none;
    border-color: $control-focus;
  }
  &:disabled {
    @include control-disabled;
  }
}
.cr-send {
  @include control-icon-btn(38px, 30px, 44px, 40px);
  flex: none;
}

.cr-error {
  margin: 6px 2px 0;
  font-size: 12px;
  color: #ff7070;
}
.cr-note {
  margin: 6px 2px 0;
  font-size: 12px;
  opacity: 0.55;
}

@include right-drawer-slide;
</style>
