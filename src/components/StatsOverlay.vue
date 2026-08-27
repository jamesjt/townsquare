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
          <button class="rp-back" v-if="pick" @click="closePick">
            <font-awesome-icon icon="arrow-left" /> The Chronicles
          </button>
          <p class="rp-sub" :class="{ dev: testView }">
            <template v-if="pick">one game's record</template>
            <template v-else-if="testView"
              >the dev ledger — test games only</template
            >
            <template v-else>every town on the platform</template>
          </p>
          <!-- FT-1236: THE DEV LEDGER'S DOOR — labs only (session.labs, the
               platform's own flag, fetched at boot; FT-1226's gate, reused
               rather than a second mechanism). Real games are the page's
               only truth for everyone else; with labs on, this one switch
               re-asks every read on the page with `test=only` — the games
               played with fake players / shift-click starts, which the
               ordinary Chronicles never shows. Hidden inside a record: the
               ledger question belongs to the landing view. -->
          <button
            class="rp-devtoggle"
            :class="{ on: testView }"
            v-if="!pick && session.labs"
            :title="
              testView
                ? 'Showing test games (dev fixtures). Click for the real Chronicles.'
                : 'Show test games — the dev ledger'
            "
            @click="toggleTestView"
          >
            Test games{{ testView ? " ✓" : "" }}
          </button>
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
                  <th>Kind</th>
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
      <div class="rp-body" v-blood-scroll v-else>
        <section class="rp-band">
          <h3>Every town together</h3>
          <p class="rp-state" v-if="loading">Consulting the archives…</p>
          <p class="rp-state" v-else-if="error">
            Chronicles unavailable — server unreachable
          </p>
          <p class="rp-state" v-else-if="!stats || !stats.games">
            No games recorded yet
          </p>
          <template v-else>
            <!-- FT-1164: EVERY PERCENTAGE CARRIES ITS COUNT. The big number is
                 always the raw one and the share rides in the label beneath it,
                 because a bare "64%" invites a confidence the sample may not
                 support and the count is what tells you whether it does. The
                 last figure is the sample itself: how many of these games
                 recorded how long they ran, which is the denominator every
                 length and death figure further down is taken over. -->
            <ul class="rp-figures">
              <li>
                <b>{{ stats.games }}</b
                ><span>{{ stats.games === 1 ? "game" : "games" }}</span>
              </li>
              <li class="good">
                <b>{{ stats.wins.good }}</b
                ><span>good wins · {{ pct(stats.winRate.good) }}</span>
              </li>
              <li class="evil">
                <b>{{ stats.wins.evil }}</b
                ><span>evil wins · {{ pct(stats.winRate.evil) }}</span>
              </li>
              <li>
                <b>{{ stats.scriptsTotal }}</b
                ><span>{{
                  stats.scriptsTotal === 1 ? "script" : "scripts"
                }}</span>
              </li>
              <li :class="{ faint: !stats.gamesTimed }">
                <b>{{ stats.gamesTimed }}</b
                ><span>of {{ stats.games }} recorded their length</span>
              </li>
            </ul>
            <div class="rp-columns">
              <!-- FT-1164: the script table grew from four columns to seven.
                   Each rate cell prints "63 · 64%" — the count first, because
                   that is the fact, and the share second, because that is the
                   reading of it. A script under the thin line wears the mark
                   defined in the legend below the table. "Ran" is the median
                   number of nights, over the games that recorded one; when none
                   did it reads "no data", never a zero. -->
              <div class="rp-col rp-col-wide" v-if="stats.scripts.length">
                <h4>Scripts</h4>
                <table class="rp-table">
                  <thead>
                    <tr>
                      <th>Script</th>
                      <th>Games</th>
                      <th title="Share of every recorded game">Share</th>
                      <th>Good</th>
                      <th>Evil</th>
                      <th title="Median nights the town reached">Ran</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in stats.scripts" :key="row.scriptName">
                      <td>
                        {{ row.scriptName
                        }}<ThinMark v-if="row.thin" :n="row.games" />
                      </td>
                      <td>{{ row.games }}</td>
                      <td class="dim">{{ pct(row.share) }}</td>
                      <td class="good">
                        {{ row.wins.good }}
                        <i class="rp-pct">{{ pct(row.winRate.good) }}</i>
                      </td>
                      <td class="evil">
                        {{ row.wins.evil }}
                        <i class="rp-pct">{{ pct(row.winRate.evil) }}</i>
                      </td>
                      <td :class="{ dim: !row.length.n }">
                        {{ nights(row.length) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p class="rp-legend">
                  <ThinMark :n="threshold" bare /> fewer than {{ threshold }}
                  games — the share is real, the rate is not yet worth reading.
                </p>
              </div>
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
          </template>
        </section>

        <!-- ── ROLES, WITHIN THEIR SCRIPT ───────────────────────────────────
             A role only means anything inside the script it was played on: the
             Imp's win rate on Trouble Brewing and on a homebrew that also
             contains it are two different facts about two different games, and
             averaging them would be a third fact that is true of neither. So
             there is one table per script and no platform-wide role table at all.

             WIN RATE IS THE PLAINEST THING HERE. A role belongs to a team; the
             role won when its team won. There is no special case — what the
             Recluse registers as, what the Drunk believes, are facts about what
             some other player was told, not about who won — so the page carries
             no explanation for it and none is needed.

             DEATH DAY IS THE MOST FRAGILE. Night and day are separate columns
             because within one numbered cycle the town runs night N and then
             day N: a night-2 kill and a day-2 execution share a number and are
             not the same moment, and a median over the two mixed would claim
             they were. Both columns show their own count, so a median over one
             death is visibly a median over one death. -->
        <section
          class="rp-band"
          v-if="!loading && !error && stats && stats.games"
        >
          <h3>Roles</h3>
          <p class="rp-scope">
            Per script: how often each role was in play, how often its team won,
            and when it died. Death figures are taken only over the deaths whose
            moment was recorded — the count beside each is that sample, and
            {{ stats.gamesTimed }} of {{ stats.games }} games recorded it.
          </p>
          <div
            class="rp-rolescript"
            v-for="script in scriptsWithRoles"
            :key="script.scriptName"
          >
            <h4>
              {{ script.scriptName }} · {{ script.games }}
              {{ script.games === 1 ? "game" : "games" }}
            </h4>
            <div class="rp-scroll">
              <table class="rp-table rp-roles">
                <thead>
                  <tr>
                    <th rowspan="2">Role</th>
                    <th rowspan="2">Kind</th>
                    <th rowspan="2" title="Games this role was in play">In</th>
                    <th rowspan="2" title="Share of this script's games">
                      Share
                    </th>
                    <th rowspan="2">Won</th>
                    <th rowspan="2">Win rate</th>
                    <th rowspan="2" title="Seats that did not survive">Died</th>
                    <th colspan="3" class="rp-group">Died at night</th>
                    <th colspan="3" class="rp-group">Died by day</th>
                    <th rowspan="2" title="The most common recorded moment">
                      Most common
                    </th>
                  </tr>
                  <tr>
                    <th class="rp-sub-th" title="Deaths with a recorded moment">
                      n
                    </th>
                    <th class="rp-sub-th">median</th>
                    <th class="rp-sub-th">mean</th>
                    <th class="rp-sub-th" title="Deaths with a recorded moment">
                      n
                    </th>
                    <th class="rp-sub-th">median</th>
                    <th class="rp-sub-th">mean</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="role in script.roles" :key="role.roleId">
                    <td>{{ roleNameOf(role.roleId) }}</td>
                    <td class="dim">{{ role.roleType }}</td>
                    <td>{{ role.games }}</td>
                    <td class="dim">{{ pct(role.share) }}</td>
                    <td>{{ role.wins }}</td>
                    <td>
                      {{ pct(role.winRate)
                      }}<ThinMark v-if="role.thin" :n="role.games" />
                    </td>
                    <td :class="{ dim: !role.deaths.died }">
                      {{ role.deaths.died }}
                    </td>
                    <td :class="{ dim: !role.deaths.night.n }">
                      {{ role.deaths.night.n }}
                    </td>
                    <td>{{ num(role.deaths.night.median) }}</td>
                    <td>{{ num(role.deaths.night.mean) }}</td>
                    <td :class="{ dim: !role.deaths.day.n }">
                      {{ role.deaths.day.n }}
                    </td>
                    <td>{{ num(role.deaths.day.median) }}</td>
                    <td>{{ num(role.deaths.day.mean) }}</td>
                    <!-- A TIED MODE IS NOT A FACT and is not printed as one. With
                         four deaths spread over four moments every one of them is
                         modal; naming one would invent a typical death out of an
                         arbitrary pick. When the server says the top count was
                         shared, this says "tied" and stops. -->
                    <td :class="{ dim: !role.deaths.mode }">
                      {{ modeLabel(role.deaths.mode) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="rp-legend">
              <ThinMark :n="threshold" bare /> fewer than {{ threshold }} games
              — the rate is not yet worth reading.
              <template v-if="!script.gamesTimed">
                No game on this script recorded how long it ran, so every death
                figure above reads as no data rather than as a zero.
              </template>
            </p>
          </div>
        </section>

        <!-- ── ROLES TOGETHER ───────────────────────────────────────────────
             The user's own example: "Trouble Brewing: Fortune Teller, Raven
             Keeper. And get number of games with both relative to the total for
             the script, and wins and % wins of games with both."

             A QUESTION ASKED, not a table read. Twenty-two roles is 231 pairs and
             1,540 triples; the combination worth an answer is the one just
             picked, so the page asks the server each time rather than the server
             precomputing an archive nobody reads.

             ALL of the picked roles, not any — a game counts only if it contained
             every one of them. -->
        <section
          class="rp-band"
          v-if="!loading && !error && stats && stats.games"
        >
          <h3>Roles together</h3>
          <p class="rp-scope">
            Pick a script and the roles that must all have been in play. The
            answer is over the games that contained every one of them.
          </p>

          <div class="rp-combo">
            <label class="rp-combo-script">
              <span>Script</span>
              <select v-model="combo.scriptName" @change="onComboScript">
                <option
                  v-for="script in scriptsWithRoles"
                  :key="script.scriptName"
                  :value="script.scriptName"
                >
                  {{ script.scriptName }} ({{ script.games }})
                </option>
              </select>
            </label>

            <p class="rp-state" v-if="!comboRoleChoices.length">
              No roles have been recorded on this script yet.
            </p>
            <div class="rp-chips" v-else>
              <button
                v-for="role in comboRoleChoices"
                :key="role.roleId"
                class="rp-chip"
                :class="{ on: combo.roleIds.indexOf(role.roleId) >= 0 }"
                :disabled="
                  combo.roleIds.length >= maxComboRoles &&
                  combo.roleIds.indexOf(role.roleId) < 0
                "
                @click="toggleComboRole(role.roleId)"
              >
                {{ roleNameOf(role.roleId) }}
                <i class="rp-chip-n">{{ role.games }}</i>
              </button>
            </div>

            <p class="rp-state" v-if="!combo.roleIds.length">
              Pick at least one role.
            </p>
            <p class="rp-state" v-else-if="combo.loading">
              Counting the games…
            </p>
            <p class="rp-state" v-else-if="combo.error">
              That query could not be run.
            </p>
            <div class="rp-combo-out" v-else-if="combo.result">
              <ul class="rp-figures">
                <li>
                  <b>{{ combo.result.games }}</b
                  ><span>
                    of {{ combo.result.scriptGames }} games ·
                    {{ pct(combo.result.share) }}
                  </span>
                </li>
                <li class="good">
                  <b>{{ combo.result.wins.good }}</b
                  ><span>good wins · {{ pct(combo.result.winRate.good) }}</span>
                </li>
                <li class="evil">
                  <b>{{ combo.result.wins.evil }}</b
                  ><span>evil wins · {{ pct(combo.result.winRate.evil) }}</span>
                </li>
              </ul>
              <p class="rp-legend" v-if="combo.result.games === 0">
                No recorded game on this script had all of them in play at once.
              </p>
              <p class="rp-legend" v-else-if="combo.result.thin">
                <ThinMark :n="combo.result.games" bare />
                {{ combo.result.games }} games is under the {{ threshold }}-game
                line. The count is a fact; the win split off it is not yet a
                pattern.
              </p>
            </div>
          </div>
        </section>

        <!-- THE PER-GAME LEDGER. It used to be its own band with its own,
           SMALLER claim: the numbers above were every game in the store, while
           these rows were only the games from the towns THIS BROWSER had been
           in — because the games list was a per-town endpoint and nothing
           enumerated the towns that exist.

           FT-1155 made the town optional, so the two claims are finally the
           same claim: these rows are the newest games on the platform, in one
           read, and the scope line below says the one true thing rather than
           apologising for a shortfall. The ceiling is the API's own (50), so
           this is the newest page of the archive, not the whole of it. -->
        <section class="rp-band">
          <h3>The games</h3>
          <p class="rp-scope">{{ ledgerScope }}</p>
          <p class="rp-state" v-if="ledger.loading">Reading the ledgers…</p>
          <p class="rp-state" v-else-if="!ledger.games.length">
            No games have been recorded yet.
          </p>
          <template v-else>
            <table class="rp-table rp-ledger">
              <thead>
                <tr>
                  <th>Ended</th>
                  <th>Town</th>
                  <th>Script</th>
                  <th>Seats</th>
                  <th>Ran</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="game in ledger.games"
                  :key="game.id"
                  class="jump"
                  :class="{ here: game.townId === townId }"
                  :data-record-row="game.id"
                  title="Open this game's record"
                  @click="openPick(game.id)"
                >
                  <td>{{ whenLabel(game.endedAt) }}</td>
                  <td>{{ game.townId }}</td>
                  <td>{{ game.scriptName }}</td>
                  <td>{{ game.playerCount }}</td>
                  <td>{{ lengthLabel(lengthOf(game)) }}</td>
                  <td class="rp-win" :class="game.winningTeam">
                    {{ game.winningTeam === "good" ? "Good" : "Evil" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
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
// FT-1164: the one glyph that says "too few games for this rate to mean
// anything" — see the component for why marking beats hiding.
import ThinMark from "./ThinMark";
import { scriptArtFor } from "../golem/editionArt";
import {
  platformStats,
  platformBreakdown,
  roleCombination,
  gameRecord,
} from "../golem/stats";
import { catchUp } from "../golem/chat";
import { boardsOf, logGameIdOf } from "../golem/chronicles";
import {
  knownTownIds,
  crossTownGames,
  platformGames,
  ledgerSummary,
  lengthOf,
  whenLabel,
  lengthLabel,
} from "../golem/records";

const TOP_PLAYERS = 15;

export default {
  name: "StatsOverlay",
  components: { Modal, CloseX, ChroniclesPortrait, KeyCap, ThinMark },
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
      loading: true,
      error: false,
      stats: null,
      /** The merged per-game ledger — see golem/records for what it can and
       *  cannot cover. */
      ledger: { loading: true, games: [], summary: null },
      /**
       * FT-1164: THE ROLE-COMBINATION QUESTION and its answer.
       *
       * `scriptName` and `roleIds` are the question; `result` is whatever the
       * server last answered. The answer is fetched on every change rather
       * than behind a Run button — the question is one cheap query and a
       * button between a reader and a number they can already see the inputs
       * of is a step with nothing in it.
       *
       * `seq` discards a slow answer that arrives after a faster later one:
       * clicking three roles quickly fires three queries and only the last
       * one is still the question being asked.
       */
      combo: {
        scriptName: "",
        roleIds: [],
        seq: 0,
        loading: false,
        error: false,
        result: null,
      },
      /**
       * FT-1236: WHICH LEDGER the page is reading. False (always, for
       * everyone without labs) = real games — the Chronicles. True (labs
       * only, via the header toggle) = the DEV LEDGER: games played with
       * fake players / shift-click starts, `?test=only` on every read.
       * Never mixed — the server keeps the two ledgers disjoint.
       */
      testView: false,
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
    goodShare() {
      if (!this.stats || !this.stats.games) return 0;
      return Math.round(this.stats.winRate.good || 0);
    },
    /**
     * FT-1164: the small-sample line, READ FROM THE RESPONSE rather than kept
     * here. The server computes every `thin` flag against its own threshold;
     * a second copy of the number in this file could only ever drift out of
     * agreement with the flags it is supposed to explain.
     */
    threshold() {
      return (this.stats && this.stats.about.smallSampleThreshold) || 20;
    },
    /** Scripts that actually have role rows — a script with none has an empty
     *  table to offer and is left out of the roles band entirely. */
    scriptsWithRoles() {
      const scripts = (this.stats && this.stats.scripts) || [];
      return scripts.filter((script) => script.roles && script.roles.length);
    },
    /** The picked script's roles, most-played first (the server's own order). */
    comboRoleChoices() {
      const script = this.scriptsWithRoles.find(
        (s) => s.scriptName === this.combo.scriptName,
      );
      return (script && script.roles) || [];
    },
    /** The server's ceiling on one combination, mirrored so the chips can
     *  disable rather than let a click become a 400. */
    maxComboRoles() {
      return 8;
    },
    /** The ledger's honest one-liner: how much it covers, and how typical a
     *  game in it looks. FT-1155: "the towns this browser has been in" is gone
     *  from it, because the read behind it is no longer that. */
    ledgerScope() {
      const s = this.ledger.summary;
      if (!s || !s.games) {
        return "The newest recorded games, across every town.";
      }
      const parts = [
        "The newest " + s.games + (s.games === 1 ? " game" : " games"),
        "across " + s.towns + (s.towns === 1 ? " town" : " towns"),
      ];
      const typical = [];
      if (s.seats !== null) typical.push(s.seats + " seats");
      if (s.minutes !== null) typical.push(lengthLabel(s.minutes));
      return (
        parts.join(" ") +
        (typical.length ? " · typically " + typical.join(", ") : "") +
        "."
      );
    },
  },
  created() {
    this.load();
    this.loadLedger();
    // FT-1146: the Chronicles drawer's boards line hands a game in — the page
    // opens straight onto that record rather than its landing view.
    if (this.recordsPick) {
      this.openPick(this.recordsPick);
      this.$store.commit("setRecordsPick", null);
    }
  },
  mounted() {
    document.addEventListener("keyup", this.onKeyup);
  },
  destroyed() {
    document.removeEventListener("keyup", this.onKeyup);
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
    /** Escape steps BACK one level — out of a record to the landing, out of
     *  the landing to wherever the reader came from. A single key that closed
     *  the whole page from inside a record would throw away the click that
     *  opened it. */
    onKeyup(e) {
      if (e.key !== "Escape") return;
      if (this.pick) this.closePick();
      else this.$emit("close");
    },
    /**
     * FT-1164: ONE read for the whole landing view. `platformBreakdown()`
     * carries everything `platformStats()` did — total games, the good/evil
     * split, the per-script table — and the three things it did not: each
     * script's share and length, the per-role figures within a script, and
     * the definitions those numbers were computed under. Two reads would have
     * meant two totals on one page that could disagree with each other.
     */
    load() {
      this.loading = true;
      this.error = false;
      this.stats = null;
      platformBreakdown(this.testView)
        .then((stats) => {
          this.stats = stats;
          this.loading = false;
          this.primeCombination();
        })
        .catch(() => {
          this.error = true;
          this.loading = false;
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
      this.pick = null;
      this.boards = { loading: false, start: null, day1: null, end: null };
      // seq survives the reset so a stale in-flight answer still discards.
      this.combo = {
        scriptName: "",
        roleIds: [],
        seq: this.combo.seq,
        loading: false,
        error: false,
        result: null,
      };
      this.load();
      this.loadLedger();
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
    /** A script's typical length: the median nights, over the games that
     *  recorded one. "no data" when none did — never a zero. */
    nights(length) {
      if (!length || !length.n || typeof length.median !== "number") {
        return "no data";
      }
      const nights = length.median;
      return nights + (nights === 1 ? " night" : " nights");
    },
    /**
     * The most common recorded death moment, in words.
     *
     * A TIE IS NOT REPORTED AS A MOMENT. When several moments share the top
     * count — the normal case over a handful of deaths — naming one of them
     * would invent a typical death out of an arbitrary pick, so this says
     * "tied" and stops. The medians beside it are the figures to read.
     */
    modeLabel(mode) {
      if (!mode) return "—";
      if (mode.tied) return "tied";
      return mode.phase + " " + mode.day + " ×" + mode.count;
    },
    /** Open the combination question on the busiest script — the one most
     *  likely to have an answer worth reading. */
    primeCombination() {
      if (this.combo.scriptName) return;
      const first = this.scriptsWithRoles[0];
      if (!first) return;
      this.combo.scriptName = first.scriptName;
      this.combo.roleIds = [];
      this.combo.result = null;
    },
    /** A different script is a different set of roles — the old picks cannot
     *  survive it, and an answer about them would be about a question nobody
     *  is asking any more. */
    onComboScript() {
      this.combo.roleIds = [];
      this.combo.result = null;
      this.combo.error = false;
    },
    toggleComboRole(roleId) {
      const at = this.combo.roleIds.indexOf(roleId);
      if (at >= 0) this.combo.roleIds.splice(at, 1);
      else if (this.combo.roleIds.length < this.maxComboRoles) {
        this.combo.roleIds.push(roleId);
      }
      this.runCombination();
    },
    /**
     * Ask the question. `seq` is the guard against out-of-order answers: each
     * call claims the next number and an answer is only accepted while its
     * number is still the current one, so a slow reply for two roles cannot
     * overwrite a fast reply for three.
     */
    runCombination() {
      const script = this.combo.scriptName;
      const roles = [...this.combo.roleIds];
      if (!script || !roles.length) {
        this.combo.result = null;
        this.combo.loading = false;
        this.combo.error = false;
        return;
      }
      const seq = this.combo.seq + 1;
      this.combo.seq = seq;
      this.combo.loading = true;
      this.combo.error = false;
      roleCombination(script, roles, this.testView)
        .then((result) => {
          if (this.combo.seq !== seq) return;
          this.combo.result = result;
          this.combo.loading = false;
        })
        .catch(() => {
          if (this.combo.seq !== seq) return;
          this.combo.error = true;
          this.combo.loading = false;
        });
    },
    /**
     * The ledger is its own read and its own failure: the aggregates above
     * must still render when this one misses.
     *
     * FT-1155: ONE call now. It used to be `crossTownGames(knownTownIds())` —
     * a fan-out over the towns this browser had visited, because the games
     * list required a town and nothing enumerated the towns that exist. The
     * town is optional now, so the ledger is the platform's rather than the
     * viewer's, and the fan-out it replaces stays in golem/records for the
     * per-town surfaces that will want it.
     */
    loadLedger() {
      this.ledger = { loading: true, games: [], summary: null };
      platformGames(undefined, this.testView)
        .then((games) => {
          this.ledger = {
            loading: false,
            games,
            summary: ledgerSummary(games),
          };
        })
        .catch(() => {
          this.ledger = { loading: false, games: [], summary: null };
        });
    },
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

// FT-1236: the dev ledger's door — labs only, far right of the head, wearing
// the same control plate as Back on the far left. Amber when the page is
// standing in the test ledger, so the state is visible from across the room
// (the subtitle names it too — see .rp-sub.dev).
.rp-devtoggle {
  grid-column: 3;
  justify-self: end;
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
  &.on {
    color: #e6c56b;
    border-color: rgba(230, 197, 107, 0.55);
  }
}

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
  @include surface-panel;
}
.rp-band + .rp-band,
.rp-panel {
  margin-top: 16px;
}

// The app's global type centres headings; a page of left-aligned tables wants
// its band titles standing at the same left edge as the columns under them.
.rp-band > h3 {
  font-family: PiratesBay, sans-serif;
  font-size: 22px;
  margin: 0 0 4px;
  opacity: 0.9;
  text-align: left;
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
  font-size: 13px;
}

// FT-1164: what a mark on a table MEANS, printed under the table it marks
// rather than once at the foot of the page. A legend a reader has to go
// looking for is a legend that does not get read, and the thin mark is the
// one glyph here whose whole job is to be understood on sight.
.rp-legend {
  margin: 8px 0 0;
  opacity: 0.45;
  font-size: 12px;
  max-width: 720px;
}

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
  @include surface-panel(12px 16px 14px);
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
.rp-col-wide {
  flex-basis: 560px;
  max-width: 820px;
}

// FT-1164: the roles table is WIDE — fourteen columns, six of them the two
// death scales — and it must not force the whole page sideways. Its own box
// scrolls instead, so a narrow window loses the far columns rather than the
// layout.
.rp-scroll {
  overflow-x: auto;
  max-width: 100%;
}

// One block per script. The heading names the script and its game count,
// because every number under it is a share or a rate against that count.
.rp-rolescript + .rp-rolescript {
  margin-top: 26px;
}
.rp-rolescript > h4 {
  margin-top: 0;
}

.rp-roles {
  min-width: 860px;

  // The two grouped headers ("Died at night", "Died by day") sit over three
  // columns each and are CENTRED over them — left-aligned they would read as
  // labels for their first column alone.
  .rp-group {
    text-align: center;
    padding-left: 14px;
    padding-right: 14px;
    border-bottom: none;
    font-size: 12px;
    letter-spacing: 0.04em;
  }
  .rp-sub-th {
    font-size: 11px;
    opacity: 0.4;
    letter-spacing: 0.04em;
  }
  // Role and Kind read as words; everything after them is a number and lines
  // up on the right, which the base table already does.
  th:nth-child(2),
  td:nth-child(2) {
    text-align: left;
    padding-left: 0;
    padding-right: 14px;
  }
}

// THE COMBINATION QUESTION. A script, a set of roles, an answer — laid out
// down the page in that reading order rather than across it, because the
// answer is what the reader came for and it belongs at the end of the
// sentence they just built.
.rp-combo {
  max-width: 900px;
}

.rp-combo-script {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;

  span {
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.5;
  }

  select {
    @include control-plate;
    font-family: inherit;
    font-size: 14px;
    color: #d8cdb4;
    padding: 4px 10px;
    cursor: pointer;

    &:focus-visible {
      @include control-focus-ring;
    }
    // The native menu draws on the OS surface, not the page's — without this
    // the options are dark text on a dark plate in every browser that honours
    // the control's own colour.
    option {
      background: #1a1512;
      color: #d8cdb4;
    }
  }
}

// THE ROLES, AS CHIPS. Not a multi-select: picking three roles out of
// twenty-two is a set-building action, and a set the reader can see all of at
// once is the difference between "which did I choose" and reading it off.
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

// How many games that role was in — the reason to pick it or not.
.rp-chip-n {
  font-style: normal;
  font-size: 11px;
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
}

.rp-combo-out .rp-figures {
  margin-top: 0;
  margin-bottom: 8px;
}

.rp-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 14px;

  th {
    opacity: 0.5;
    font-weight: normal;
    text-align: left;
    padding: 3px 14px 5px 0;
    border-bottom: 1px solid rgba(216, 205, 180, 0.2);
    white-space: nowrap;
  }
  td {
    text-align: left;
    padding: 4px 14px 4px 0;
    font-variant-numeric: tabular-nums;
  }
  tbody tr + tr td {
    border-top: 1px solid rgba(216, 205, 180, 0.08);
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
      background: rgba(216, 205, 180, 0.09);
      color: #fff;
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
  @include surface-panel(10px 16px 12px);
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
