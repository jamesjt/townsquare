<template>
  <Modal
    class="editions workbench"
    v-if="modals.edition"
    @close="toggleModal('edition')"
  >
    <!-- Golem fork (FT-854): the Almanac WORKBENCH — the full script-editing
         surface, and the modal's ONLY page (upstream's edition-tile screen
         retired 2026-08-17, user call: the picker carries the same art).
         Top: script selector + actions + the composition meter. Left: every
         role (officials + your library) with search and tag filters. Main:
         the current script in three views. The meter INFORMS, never blocks —
         non-conforming scripts save, share and play. -->
    <div class="custom workbench">
      <div class="wb-top">
        <!-- Row 1: the title, CENTERED on its own line (only the shell's
             close × shares it). Row 2: THE shared ScriptPicker (identical
             component to the host panel's) + the action buttons. The
             composition meter lives down beside the view tabs. -->
        <div class="wb-row1">
          <h3 class="almanac-title">
            <img
              :src="almanacCap.src"
              :class="almanacCap.cls"
              :style="almanacCap.style"
              alt="S"
            />cripts
          </h3>
        </div>
        <div class="wb-row2">
          <!-- `manage` (FT-970) turns on the per-card shelf-remove ×. Only the
               bench asks for it: the host panel and the intro pass nothing and
               get the picker exactly as it always was. -->
          <ScriptPicker
            class="wb-script-picker"
            :cards="wbScriptCards"
            :picked-id="wbPickedId"
            manage
            @pick="onScriptPick"
            @forget="forgetScript"
          />
          <!-- ONE plus (user call): everything script-creation lives in the
               New-script overlay it opens — name, icon, and a paste/upload
               seed. It is an authoring surface like the rest of the bench, so
               a small screen does not offer it. -->
          <div class="wb-actions" v-if="!smallScreen">
            <div class="button wb-plus" title="New script" @click="newScript">
              <font-awesome-icon icon="plus" />
            </div>
            <!-- DELETE FOR EVERYONE (FT-970) lives HERE, off the card, on
                 purpose. It acts on the ONE script currently loaded — the one
                 whose contents are on screen to be looked at before it goes —
                 and it appears only when this browser holds that script's edit
                 key, because without the key the server refuses anyway.
                 The card's × is the casual, local, reversible-by-relinking
                 one; this is the one that reaches everybody you shared with,
                 so it is a deliberate trip to the toolbar and a named panel. -->
            <div
              class="button wb-destroy"
              v-if="canDestroyLoaded"
              title="Delete this script for everyone"
              @click="askDestroy"
            >
              <font-awesome-icon icon="trash-alt" />
            </div>
          </div>
        </div>
      </div>

      <!-- SMALL SCREEN: the bench steps aside and says so.
           The picker above it stays live — WHICH script is loaded is the one
           thing worth reading here, and switching scripts is a single tap on
           a component the host panel already ships to phones. Everything
           below the picker (the 270px role rail, the three script views, the
           drag that moves a character up the night order) needs a desk. -->
      <div class="wb-small" v-if="smallScreen">
        <h4 class="ws-lead">The Almanac wants a desk</h4>
        <p class="ws-body">
          Two columns, a rail of every character, and a drag to move one up the
          night order. None of that fits in a hand — and the drag does not exist
          on a touch screen at all.
        </p>
        <div class="ws-loaded">
          <img class="ws-mark" :src="loadedCard.icon" alt="" />
          <span class="ws-name">{{ loadedCard.name }}</span>
        </div>
        <div class="ws-counts">
          <span
            class="ws-count"
            v-for="t in smallCounts"
            :key="t.team"
            :class="'team-' + t.team"
            :title="t.label"
          >
            <img v-if="teamGlyph(t.team)" :src="teamGlyph(t.team)" alt="" />
            <font-awesome-icon v-else :icon="t.icon" />
            {{ t.count }}
          </span>
        </div>
        <p class="ws-serves" v-if="servableText">Plays {{ servableText }}</p>
        <p class="ws-note">
          Pick a script above and it loads for the table as it always did. To
          read what a character does, open the script drawer.
        </p>
        <button type="button" class="ws-close" @click="toggleModal('edition')">
          Close
        </button>
      </div>

      <div class="wb-body" v-else>
        <aside class="wb-sidebar">
          <!-- team toggles are TRI-STATE on click (show only → hide → off);
               the + at the end forges a new role -->
          <div class="wb-team-row">
            <button
              v-for="t in teamRow"
              :key="t.team"
              class="wb-team-toggle"
              :class="[
                'team-' + t.team,
                { on: teamState[t.team] === 1, exc: teamState[t.team] === -1 },
              ]"
              :title="teamTitle(t)"
              @click="toggleTeam(t.team)"
            >
              <!-- our own team art for every team (golem/glyphs); t.icon
                   stays as the fallback for a team the map lacks -->
              <img
                v-if="teamGlyph(t.team)"
                class="demon-glyph"
                :src="teamGlyph(t.team)"
                alt=""
              />
              <font-awesome-icon v-else :icon="t.icon" />
              <span class="cnt">{{ t.count }}</span>
            </button>
            <div
              class="button wb-plus"
              title="New role"
              @click="openRoleForm()"
            >
              <font-awesome-icon icon="plus" />
            </div>
          </div>
          <!-- FT-1039: the FOLD DISSOLVED. The facets stand in the open as
               chip rows below — the plated idiom the Chronicles filters and
               the team row above already speak — and the result tally rides
               INSIDE the search field, where feedback on the search belongs.
               The pill row went with the fold: a lit chip IS the active
               filter, and every chip cycles the team row's own tri-state
               (neutral → shown → hidden). -->
          <div class="wb-searchwrap">
            <input
              ref="searchInput"
              v-model="roleQuery"
              class="wb-search"
              placeholder="Search name or ability…"
              title="Press / to jump here"
              @input="onSearchInput"
              @keyup.enter="searchRoles"
              @keydown.esc.stop="clearSearch"
            />
            <span class="ws-tally" aria-live="polite"
              >{{ filteredCount }} of {{ totalCount }}</span
            >
            <button
              type="button"
              class="ws-clear"
              v-if="roleQuery"
              title="Clear the search"
              @click="clearSearch"
            >
              ×
            </button>
          </div>
          <!-- SOURCE — naturally multi (a script borrows from several).
               Edition marks where an edition has one, words where not. -->
          <div class="wb-chips" role="group" aria-label="Source">
            <button
              v-for="tag in sourceTags"
              :key="tag.id"
              type="button"
              class="wb-chip"
              :class="chipClass(tag)"
              :title="chipTitle(tag)"
              :aria-pressed="chipState(tag.id) === 1 ? 'true' : 'false'"
              @click="cycleChip(tag)"
            >
              <img
                v-if="editionMark(tag.id)"
                class="mark"
                :src="editionMark(tag.id)"
                alt=""
              />
              <span v-else class="word">{{ chipWord(tag) }}</span>
              <span class="cnt">{{ countFor(tag) }}</span>
            </button>
          </div>
          <!-- NIGHT — a lens, one at a time; click the lit one to clear it.
               The two wakes wear the night tabs' own moon phases. -->
          <div class="wb-seg" role="group" aria-label="Night">
            <button
              v-for="tag in nightTags"
              :key="tag.id"
              type="button"
              class="wb-cell"
              :class="{
                on: chipState(tag.id) === 1,
                zero: countFor(tag) === 0,
              }"
              :title="chipTitle(tag)"
              :aria-pressed="chipState(tag.id) === 1 ? 'true' : 'false'"
              @click="toggleLens(tag)"
            >
              <img
                v-if="nightMark(tag.id)"
                class="moon"
                :src="nightMark(tag.id)"
                alt=""
              />
              <span class="word">{{ chipWord(tag) }}</span>
              <span class="cnt">{{ countFor(tag) }}</span>
            </button>
          </div>
          <!-- SPECIAL — independent flags, tri-state like the sources
               ("hidden" on In-this-script answers "what could I add?"). -->
          <div class="wb-seg" role="group" aria-label="Special">
            <button
              v-for="tag in flagTags"
              :key="tag.id"
              type="button"
              class="wb-cell"
              :class="chipClass(tag)"
              :title="chipTitle(tag)"
              :aria-pressed="chipState(tag.id) === 1 ? 'true' : 'false'"
              @click="cycleChip(tag)"
            >
              <span class="word">{{ chipWord(tag) }}</span>
              <span class="cnt">{{ countFor(tag) }}</span>
            </button>
          </div>
          <!-- grouped by team (user call), sticky group headers -->
          <ul class="wb-all-roles" v-blood-scroll @scroll.passive="hideRoleTip">
            <template v-for="group in sidebarGroups">
              <li class="wb-shelf-head" :key="'head-' + group.team">
                {{ group.label }} <small>({{ group.roles.length }})</small>
              </li>
              <li
                v-for="entry in group.roles"
                :key="entry.key"
                :class="['team-' + entry.team, { inscript: entry.inScript }]"
                @click="toggleRole(entry)"
                @mouseenter="showRoleTip($event, entry)"
                @mouseleave="hideRoleTip"
              >
                <span
                  class="icon"
                  v-if="entry.iconUrl"
                  :style="{ backgroundImage: `url(${entry.iconUrl})` }"
                ></span>
                <span class="wb-role-name">{{ entry.name }}</span>
                <small v-if="entry.isLib">{{
                  entry.mine ? "yours" : "library"
                }}</small>
                <span class="wb-in" v-if="entry.inScript">✓</span>
              </li>
            </template>
            <!-- FT-981: NOTHING MATCHED SAYS SO. The rail used to go silently
                 blank — the meter read "0 of 139" in small text off to the
                 side and the list itself was an empty box, which reads as a
                 component that broke rather than a search that found nothing.
                 It also names the way OUT, and the way out differs: a query
                 you can clear, filters you can drop, or both at once. -->
            <li class="wb-none" v-if="!sidebarGroups.length" :key="'none'">
              <p class="wn-lead">
                No character matches<template v-if="searchActive">
                  “{{ roleQuery.trim() }}”</template
                ><template v-if="searchActive && filtersActive"> with</template
                ><template v-if="filtersActive">
                  the filters you have set</template
                >.
              </p>
              <div class="wn-outs">
                <button
                  type="button"
                  class="wn-out"
                  v-if="searchActive"
                  @click="clearSearch"
                >
                  Clear the search
                </button>
                <button
                  type="button"
                  class="wn-out"
                  v-if="filtersActive"
                  @click="clearFilters"
                >
                  Clear the filters
                </button>
              </div>
              <p class="wn-aside" v-if="browseDown">
                The shared role library is not answering, so this searched the
                official characters and your own shelf only.
              </p>
            </li>
          </ul>
        </aside>

        <!-- FT-857: THE script view — the same component the player-facing
             ScriptDrawer renders. Editable here (drag the night order, remove
             / edit a role, the dirty Save-Discard chips); read-only there. -->
        <ScriptView
          :roles="scriptRoles"
          :editable="true"
          :dirty="scriptDirty"
          :initial-view="wbView"
          @view="wbView = $event"
          @set-night="onSetNight"
          @remove="removeRole"
          @edit="openRoleForm"
          @save="saveToVault"
          @discard="discardEdits"
        />
      </div>

      <!-- Golem fork (FT-851): the custom-role library — author a role once,
           save it to the library, and drop it into the current script as a
           full snapshot (the script carries the whole role). Fork-on-edit
           like scripts: saving someone else's role forks your own copy.
           FT-854: the forge floats over the workbench as an overlay. -->
      <div class="role-form" v-if="roleForm" v-blood-scroll>
        <div class="button-group forge-acts">
          <div class="button" title="Save role" @click="saveRoleForm">
            <font-awesome-icon icon="feather-alt" /> Save
          </div>
          <div class="button" title="Discard" @click="closeRoleForm">
            <font-awesome-icon icon="times" /> Discard
          </div>
        </div>
        <h3 class="almanac-title forge-title">
          <img
            v-if="forgeCap"
            :src="forgeCap.src"
            class="font-cap"
            :style="forgeCap.style"
            alt="N"
          />{{ forgeCap ? "ew Role" : "New Role" }}
        </h3>
        <!-- paste a role JSON (or an official id) to fill the form; the
             ghost text IS the accepted syntax, Template copies it -->
        <div class="row">
          <input
            v-model="roleForm.name"
            placeholder="Role name"
            maxlength="40"
          />
        </div>
        <div class="row team-pick">
          <button
            v-for="t in [
              'townsfolk',
              'outsider',
              'minion',
              'demon',
              'traveller',
            ]"
            :key="t"
            type="button"
            class="team-btn"
            :class="[
              'team-' + (t === 'traveller' ? 'traveler' : t),
              { on: roleForm.roleType === t },
            ]"
            @click="roleForm.roleType = t"
          >
            <!-- our own team art for every team (golem/glyphs); the Font
                 Awesome branch stays as the fallback for an unknown team -->
            <img
              v-if="teamGlyph(t)"
              class="demon-glyph"
              :src="teamGlyph(t)"
              alt=""
            />
            <font-awesome-icon
              v-else
              :icon="
                t === 'townsfolk'
                  ? 'users'
                  : t === 'minion'
                  ? 'mask'
                  : 'walking'
              "
            />
            {{ t }}
          </button>
        </div>
        <div class="row">
          <textarea
            v-model="roleForm.ability"
            placeholder="Ability text"
            maxlength="600"
            rows="3"
          ></textarea>
        </div>
        <!-- FT-1040: the forge speaks chips — the FT-1039 idiom, one plate,
             lit states; the two wakes wear the night tabs' own moon phases. -->
        <div class="wakes-block">
          <span class="wakes-title">Wakes:</span>
          <div class="forge-seg" role="group" aria-label="Wakes">
            <button
              type="button"
              class="forge-cell"
              :class="{ on: wakesFirstNight }"
              :aria-pressed="wakesFirstNight ? 'true' : 'false'"
              title="Wakes on the first night"
              @click="wakesFirstNight = !wakesFirstNight"
            >
              <img class="moon" :src="moonFirstArt" alt="" /> First Night
            </button>
            <button
              type="button"
              class="forge-cell"
              :class="{ on: wakesOtherNights }"
              :aria-pressed="wakesOtherNights ? 'true' : 'false'"
              title="Wakes on every night after the first"
              @click="wakesOtherNights = !wakesOtherNights"
            >
              <img class="moon" :src="moonOtherArt" alt="" /> Other Nights
            </button>
          </div>
          <button
            type="button"
            class="forge-chip"
            :class="{ on: roleForm.setup }"
            :aria-pressed="roleForm.setup ? 'true' : 'false'"
            title="This character changes the game's setup"
            @click="roleForm.setup = !roleForm.setup"
          >
            Affects setup
          </button>
        </div>
        <!-- FT-1040: THE NIGHT ACTION COMPOSER — only a character that wakes
             composes one. Six shapes, each a one-to-one dressing of a night
             schema field (golem/nightInfo NIGHT_SHAPES); the composed entry
             rides the forged role and registers at script load, so its
             checklist row, player prompt and chronicle presence are native. -->
        <div class="night-composer" v-if="wakesFirstNight || wakesOtherNights">
          <span class="nc-title">At night, this character…</span>
          <div class="nc-shapes" role="group" aria-label="Night action">
            <button
              v-for="s in nightShapes"
              :key="s.id"
              type="button"
              class="forge-chip"
              :class="{ on: roleForm.nightShape === s.id }"
              :title="
                s.hint +
                (roleForm.nightShape === s.id ? ' (click to clear)' : '')
              "
              :aria-pressed="roleForm.nightShape === s.id ? 'true' : 'false'"
              @click="pickNightShape(s.id)"
            >
              {{ s.label }}
            </button>
          </div>
          <div class="nc-dials" v-if="roleForm.nightShape === 'players'">
            <NumberScrub
              class="nc-count"
              preset="night"
              :value="roleForm.nightCount"
              :min="1"
              :max="3"
              title="How many players — drag to scrub, click to type"
              @input="(n) => (roleForm.nightCount = n)"
            />
            <!-- the FILLER — real only here: a PLAYER field is the one kind
                 the player-side machinery renders an input for (FT-1005) -->
            <div class="forge-seg nc-by" role="group" aria-label="Who picks">
              <button
                type="button"
                class="forge-cell"
                :class="{ on: roleForm.nightBy === 'player' }"
                title="The seat's own player makes this choice at night"
                @click="roleForm.nightBy = 'player'"
              >
                The player picks
              </button>
              <button
                type="button"
                class="forge-cell"
                :class="{ on: roleForm.nightBy === 'storyteller' }"
                title="You point for them — information you give"
                @click="roleForm.nightBy = 'storyteller'"
              >
                You point for them
              </button>
            </div>
          </div>
          <div class="row" v-if="roleForm.nightShape">
            <input
              v-model="roleForm.nightPrompt"
              class="wide"
              maxlength="200"
              placeholder="Prompt line — what the night row says"
            />
          </div>
        </div>
        <!-- reminder tokens as REAL PILLS — type + Enter mints one, click one
             to remove it; the stored shape stays the comma-joined string -->
        <div class="row rem-row">
          <span class="rem-pills">
            <button
              v-for="(r, i) in reminderPills"
              :key="'rem' + i"
              type="button"
              class="rem-pill"
              :title="'Remove “' + r + '”'"
              @click="removeReminderPill(i)"
            >
              {{ r }} <span class="rem-x">×</span>
            </button>
            <input
              v-model="reminderDraft"
              class="rem-input"
              maxlength="40"
              placeholder="Reminder token — Enter adds"
              @keydown.enter.prevent="addReminderPill"
              @blur="addReminderPill"
            />
          </span>
        </div>
        <div class="row">
          <input
            v-model="roleForm.authorName"
            placeholder="Author"
            maxlength="200"
          />
        </div>
        <div class="icon-picker">
          <div class="ip-tabs">
            <span
              class="wb-tab"
              :class="{ active: iconTab === 'library' }"
              @click="openIconLibrary"
              >Icon library</span
            >
            <span
              class="wb-tab"
              :class="{ active: iconTab === 'official' }"
              @click="iconTab = 'official'"
              >Official art</span
            >
            <span class="ip-current" v-if="roleForm.iconData">
              <img :src="roleForm.iconData" alt="" />
              <span
                class="ip-reroll"
                title="Re-roll the texture — same art, fresh grain"
                @click="rerollIcon"
                ><font-awesome-icon icon="redo-alt"
              /></span>
            </span>
          </div>
          <template v-if="iconTab === 'official'">
            <input
              v-model="iconSearch"
              placeholder="Icon: search official roles (optional)…"
            />
            <div class="icon-grid">
              <div
                class="icon-cell"
                v-for="official in iconMatches"
                :key="official.id"
                :class="{ selected: roleForm.icon === official.id }"
                @click="pickIcon(official.id)"
              >
                <span
                  class="icon"
                  :style="{ backgroundImage: `url(${iconUrl(official.id)})` }"
                ></span>
                <span class="label">{{ official.name }}</span>
              </div>
            </div>
          </template>
          <div v-else class="icon-lib">
            <div class="il-head">
              <input
                v-model="ilSearch"
                placeholder="Search the icon library…"
              />
              <span
                v-for="t in ilThemes"
                :key="t"
                class="il-chip"
                :class="{ on: ilTheme === t }"
                @click="ilTheme = ilTheme === t ? '' : t"
                >{{ t }}</span
              >
            </div>
            <div class="il-preview">
              <img v-if="ilPreviewSrc" :src="ilPreviewSrc" alt="" />
              <span v-else class="il-empty">hover an icon to preview it</span>
              <span class="label">{{ ilPreviewLabel }}</span>
            </div>
            <div class="icon-grid il-grid" v-if="ilLoaded">
              <div
                class="icon-cell"
                v-for="e in ilShown"
                :key="e.n"
                :class="{ selected: roleForm.iconRef === e.n }"
                :title="e.n.replace(/-/g, ' ')"
                @mouseenter="ilHover(e)"
                @mouseleave="ilHoverClear"
                @click="pickLibraryIcon(e)"
              >
                <img class="il-thumb" :src="ilThumb(e)" alt="" />
                <span class="label">{{ e.n.replace(/-/g, " ") }}</span>
              </div>
              <div class="il-more" v-if="ilOverflow > 0">
                +{{ ilOverflow }} more — refine the search
              </div>
            </div>
            <div class="il-loading" v-else>Loading the library…</div>
          </div>
        </div>
        <div class="role-error" v-if="roleError">{{ roleError }}</div>
        <div class="row wb-forge-paste">
          <textarea
            v-model="roleJsonText"
            rows="2"
            :placeholder="roleTemplateJson"
          ></textarea>
          <div class="paste-acts">
            <div class="button" @click="fillForgeFromJson">
              <font-awesome-icon icon="file-code" /> Fill from JSON
            </div>
          </div>
        </div>
      </div>
      <!-- FT-854 r9: the New-script overlay, rebuilt. Name required. The
           icon WELL takes an upload or a dropped image (downscaled to 128px,
           stored as a data URL in _meta.logo), or a pick from the official
           art below — which got a real browser instead of a letterbox. -->
      <div class="role-form ns-form" v-if="newScriptForm" v-blood-scroll>
        <h3>New script</h3>
        <div class="ns-head">
          <div
            class="ns-drop"
            :class="{ has: !!newScriptForm.icon, dragover: nsDragOver }"
            :style="nsIconStyle"
            title="Script icon — drop an image, click to upload, or pick from the art below"
            @click="$refs.nsUpload.click()"
            @dragover.prevent="nsDragOver = true"
            @dragleave="nsDragOver = false"
            @drop.prevent="onNsDrop"
          >
            <span class="hint" v-if="!newScriptForm.icon"
              >drop an image<br />or click to upload</span
            >
            <span
              class="ns-clear"
              v-if="newScriptForm.icon"
              title="Remove the icon"
              @click.stop="newScriptForm.icon = ''"
              >×</span
            >
          </div>
          <div class="ns-fields">
            <label>Name</label>
            <input
              ref="nsName"
              class="ns-name"
              v-model="newScriptForm.name"
              placeholder=""
              maxlength="60"
              @keyup.enter="createNewScript"
            />
            <small class="ns-note"
              >The icon is optional — it marks the script wherever scripts are
              picked.</small
            >
            <!-- FT-856: an upload arrives twice — inked to the official
                 look, and untouched. The pick is one click. -->
            <div class="ns-style-toggle" v-if="newScriptForm.iconStyled">
              <span
                :class="{ on: newScriptForm.icon === newScriptForm.iconStyled }"
                @click="newScriptForm.icon = newScriptForm.iconStyled"
                >Inked</span
              >
              <span
                :class="{
                  on: newScriptForm.icon === newScriptForm.iconOriginal,
                }"
                @click="newScriptForm.icon = newScriptForm.iconOriginal"
                >Original</span
              >
            </div>
          </div>
        </div>
        <input
          type="file"
          ref="nsUpload"
          accept="image/*"
          class="ns-upload"
          @change="onNsUpload"
        />
        <!-- the seed: paste a script JSON, a share link, or a URL — or
             upload a file. Empty = a blank page. -->
        <div class="ns-start">
          <label>Begin with <small>(optional)</small></label>
          <div class="ns-start-row">
            <textarea
              v-model="nsJsonText"
              rows="2"
              placeholder="Paste a script JSON, a share link, or a URL — or leave empty for a blank page"
            ></textarea>
            <div class="button" @click="openUpload">
              <font-awesome-icon icon="file-upload" /> Upload
            </div>
          </div>
        </div>
        <div class="ns-browse">
          <input
            v-model="nsIconSearch"
            class="ns-search"
            placeholder="…or search the official art"
          />
          <div class="icon-grid ns-grid">
            <div
              class="icon-cell"
              v-for="official in nsIconMatches"
              :key="'ns-' + official.id"
              :class="{ selected: newScriptForm.icon === official.id }"
              @click="
                newScriptForm.icon =
                  newScriptForm.icon === official.id ? '' : official.id
              "
            >
              <span
                class="icon"
                :style="{ backgroundImage: `url(${iconUrl(official.id)})` }"
              ></span>
              <span class="label">{{ official.name }}</span>
            </div>
          </div>
        </div>
        <div class="role-error" v-if="nsError">{{ nsError }}</div>
        <div class="ns-acts">
          <small class="ns-export" v-if="recents.length" @click="copyLinks">
            Export my script links
          </small>
          <div class="button" @click="newScriptForm = null">
            <font-awesome-icon icon="times" /> Cancel
          </div>
          <div class="button ns-create" @click="createNewScript">
            <font-awesome-icon icon="plus-circle" /> Create
          </div>
        </div>
      </div>

      <!-- NAME YOUR COPY. Saving a script this browser holds no edit key for
           makes a FORK, and a fork used to inherit the original's name in
           silence — which is how a shelf ends up with three scripts wearing
           the same name and no way to tell them apart. The save stops here
           instead and asks.

           An INLINE panel, never prompt(): a browser dialog is silently
           auto-dismissed in dialog-less contexts (driven panes, embeds) —
           Menu.leaveSession records that exact bug — and a dismissed prompt
           returned empty, so Save simply did nothing and looked broken.

           Cancel abandons the SAVE, not the work: the edits stay on the
           bench, still unsaved, and Save can be pressed again. -->
      <div class="role-form fork-form" v-if="forkForm">
        <h3>{{ forkForm.forking ? "Name your copy" : "Name this script" }}</h3>
        <p class="fk-note" v-if="forkForm.forking">
          <strong>{{ forkForm.original }}</strong> is not yours to change —
          saving makes your own copy of it, and the copy needs a name of its
          own. The original is left exactly as it is.
        </p>
        <label>Name</label>
        <input
          ref="forkName"
          class="fk-name"
          v-model="forkForm.name"
          maxlength="60"
          @keyup.enter="confirmFork"
        />
        <div class="role-error" v-if="forkError">
          {{ forkError }}
          <span class="fk-fix" v-if="forkSuggestion" @click="useForkSuggestion"
            >use “{{ forkSuggestion }}”</span
          >
        </div>
        <div class="fk-acts">
          <div class="button" @click="cancelFork">
            <font-awesome-icon icon="times" /> Cancel
          </div>
          <div class="button fk-go" @click="confirmFork">
            <font-awesome-icon :icon="forkForm.forking ? 'copy' : 'check'" />
            {{ forkForm.forking ? "Fork" : "Save" }}
          </div>
        </div>
      </div>

      <!-- ASK FOR A LINK HERE, never prompt(). Same reason the fork panel
           above gives, and the same shape: a browser dialog is silently
           auto-dismissed in dialog-less contexts, so the caller read an empty
           string and did nothing at all.
           Its two callers (promptVaultLoad / promptURL) have no door in the
           workbench today — the vault shelf and the upload button replaced
           them — so this panel adds no control that was not already there. -->
      <div class="role-form fork-form" v-if="askForm">
        <h3>{{ askForm.title }}</h3>
        <label>{{ askForm.label }}</label>
        <input
          ref="askInput"
          class="fk-name"
          v-model="askForm.value"
          :placeholder="askForm.placeholder"
          spellcheck="false"
          @keyup.enter="confirmAsk"
          @keyup.esc="cancelAsk"
        />
        <div class="role-error" v-if="askError">{{ askError }}</div>
        <div class="fk-acts">
          <div class="button" @click="cancelAsk">
            <font-awesome-icon icon="times" /> Cancel
          </div>
          <div class="button fk-go" @click="confirmAsk">
            <font-awesome-icon icon="check" /> {{ askForm.okText }}
          </div>
        </div>
      </div>

      <!-- DELETE FOR EVERYONE — the confirm (FT-970). Same inline-panel shape
           as the two above and for the same reason: a native confirm() comes
           back false unseen in a driven pane or an embed, and a destructive
           control that silently does nothing is worse than no control.

           This one wears BLOOD where the fork panel wears purple. The fork
           panel is constructive — it makes a thing. This ends one, for people
           who are not in the room. The note names both halves of the cost:
           the link dies for everyone, and the copy on this browser goes too.

           Cancel abandons the delete, not the work; the script stays loaded
           and unchanged either way. -->
      <div class="role-form fork-form destroy-form" v-if="destroyForm">
        <h3>Delete “{{ destroyForm.name }}” for everyone?</h3>
        <p class="fk-note">
          This removes the script from the server. The share link stops working
          for everyone you sent it to, and it leaves this browser as well. It
          cannot be undone. Copies anyone forked from it keep working — they
          just stop crediting this one as their source.
        </p>
        <div class="role-error" v-if="destroyError">{{ destroyError }}</div>
        <div class="fk-acts">
          <div class="button" @click="cancelDestroy">
            <font-awesome-icon icon="times" /> Cancel
          </div>
          <div class="button fk-go destroy-go" @click="confirmDestroy">
            <font-awesome-icon icon="exclamation-triangle" />
            Delete for everyone
          </div>
        </div>
      </div>

      <!-- the shelf's hover card: icon + bold name + ability (the almanac
           read), replacing the native title tooltip. FT-858: it IS
           RoleHoverCard now — the same component the seats and the grimoire
           drawer hover (user-directed: one component, every surface). The
           shelf hands it the tag-filter chips, since library entries carry
           facts the role object alone cannot prove. -->
      <RoleHoverCard
        v-if="roleTip"
        :role="roleTip"
        :chips="roleTipChips"
        :anchor="roleTipAnchor"
        fallback-ability="A library role — its ability arrives when added."
        @dismiss="hideRoleTip"
      />

      <div class="role-error wb-error" v-if="roleError">{{ roleError }}</div>

      <input
        type="file"
        ref="upload"
        accept="application/json"
        @change="handleUpload"
      />
    </div>
  </Modal>
</template>

<script>
import editionJSON from "../../editions";
import rolesJSON from "../../roles.json";
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import * as vault from "../../golem/scripts";
import * as roleLib from "../../golem/roles";
import * as towns from "../../golem/towns";
import { flashHint } from "../../golem/hint";
import bloodA from "../../assets/blood/blood-A.png";
// FT-854: THE shared script picker + its art — the same component the host
// panel renders (user-directed: one component, both surfaces).
import ScriptPicker from "../ScriptPicker";
// FT-858: THE role hover card — the shelf's card, now shared with the seats
// and the grimoire drawer (user-directed: one component, every surface).
import RoleHoverCard from "../RoleHoverCard";
// FT-857: THE shared script view — the workbench's main pane IS the player
// drawer's body (user-directed: one component, both surfaces).
import ScriptView from "../ScriptView";
// FT-857: the composition maths moved beside it, so the meter counts the same
// way wherever it renders.
import { countTeams, servableFor, servableText } from "../../golem/composition";
import {
  EDITION_ICONS,
  edCustom,
  OFFICIAL_BLURBS,
} from "../../golem/editionArt";
// FT-856: uploads take the official engraving look (ink/tint/parchment).
import { stylizeIcon } from "../../golem/iconStyle";
import * as iconLib from "../../golem/iconLibrary";
// The all-of-BOTC card wears the creative director's gold logo.
import goldLogo from "../../assets/gold/botc-logo-icon.png";
// The user's demon mask + outsider face (design/red/*, cut + baked).
import demonGlyph from "../../assets/blood/demon-glyph.png";
import outsiderGlyph from "../../assets/blood/outsider-glyph.png";
// One definition of "the glyph for team X" (golem/glyphs), shared with
// TownInfo, ScriptView and RoleDrawer.
import { teamGlyph } from "../../golem/glyphs";
// FT-1039: the source chips wear the edition marks already imported above
// (EDITION_ICONS), and the night lens wears the night tabs' own moon phases.
import moonFirst from "../../assets/moon-first.png";
import moonOther from "../../assets/moon-other.png";
// FT-887: the shelf's night filter labels read "Wakes first night" — the same
// claim the hover card's chip makes, so it comes from the same function.
// FT-1040: plus the forge's night action composer — the six-shape palette and
// the compose/decompose pair that turn its dials into a schema entry riding
// the forged role (role.golemNight) and back.
import {
  wakesOn,
  NIGHT_SHAPES,
  composeAuthoredNight,
  decomposeAuthoredNight,
} from "../../golem/nightInfo";
// FT-1040: the players shape's 1–3 count wears the night sheet's own scrub.
import NumberScrub from "../NumberScrub";
// The app-wide PNG-font choice — the Almanac's A wears the caps' font.
import {
  fontState,
  glyphFrom,
  glyphStyleFrom,
  resolvedCapKey,
  CAP_SHRINK,
} from "../../golem/titleFonts";

// Golem fork (FT-854): the official setup table — players: [townsfolk,
// outsiders, minions, demons]. The meter measures a script's POOL against it:
// a count is servable when the pool covers each column. Purely informational.
// FT-857: the table + its maths live in golem/composition.js now, shared with
// the player-facing drawer's copy of the same meter.
const TEAM_ORDER = ["townsfolk", "outsider", "minion", "demon", "traveler"];
// FT-854: the shelf's tri-state tag filter. Every tag cycles
// neutral → include → exclude. Includes OR within a group and AND across
// groups; an exclude always wins. Library roles carry no night/setup data,
// so they only match tags we can actually prove.
const LUF_ROLES = new Set(
  (editionJSON.find((e) => e.id === "luf") || { roles: [] }).roles,
);
const TAG_GROUPS = [
  {
    key: "team",
    label: "Team",
    tags: [
      { id: "team:townsfolk", label: "Townsfolk" },
      { id: "team:outsider", label: "Outsiders" },
      { id: "team:minion", label: "Minions" },
      { id: "team:demon", label: "Demons" },
    ],
  },
  {
    key: "source",
    label: "Source",
    tags: [
      { id: "src:tb", label: "Trouble Brewing" },
      { id: "src:bmr", label: "Bad Moon Rising" },
      { id: "src:snv", label: "Sects & Violets" },
      { id: "src:luf", label: "Laissez un Faire" },
      { id: "src:exp", label: "Experimental" },
      { id: "src:mine", label: "Your library" },
      { id: "src:lib", label: "Community" },
    ],
  },
  {
    key: "night",
    label: "Night",
    tags: [
      { id: "night:first", label: "Wakes first night" },
      { id: "night:other", label: "Wakes other nights" },
      { id: "night:never", label: "Never wakes" },
    ],
  },
  {
    key: "flags",
    label: "Special",
    tags: [
      { id: "flag:setup", label: "Affects setup" },
      { id: "flag:inscript", label: "In this script" },
    ],
  },
];
// FT-1039: what a chip WEARS — a 270px rail cannot spell "Trouble Brewing"
// seven times, so editions wear their marks (EDITION_ICONS above), the rest
// wear one short word, and every chip's full label rides its tooltip.
const CHIP_WORDS = {
  "src:exp": "Exp",
  "src:mine": "Yours",
  "src:lib": "Shared",
  "night:first": "First",
  "night:other": "Other",
  "night:never": "Never",
  "flag:setup": "Setup",
  "flag:inscript": "In script",
};

// The import box's ghost text and its copyable template — the same object,
// so the syntax the ghost shows is exactly the syntax the parser accepts.
const ROLE_TEMPLATE = {
  name: "Role Name",
  team: "townsfolk | outsider | minion | demon",
  ability: "What the role does.",
  firstNight: 0,
  otherNight: 0,
  reminders: [],
  setup: false,
};
const TEAM_LABELS = {
  townsfolk: "Townsfolk",
  outsider: "Outsiders",
  minion: "Minions",
  demon: "Demons",
  traveler: "Travellers",
};
// roles.json spells it "traveler"; the server's roleType vocabulary spells it
// "traveller". Normalize to the app side everywhere the two meet.
const normTeam = (t) => (t || "").replace("traveller", "traveler");

/**
 * FT-981: ONE spelling of a searchable string, for the query and for the text
 * it is matched against.
 *
 * The bench used to compare the raw query to the raw name with `includes`, and
 * that failed on the two things every real character name carries: an
 * apostrophe and a hyphen. Measured on the shipped build — `devils advocate`
 * returned NOTHING while `devil's advocate` returned the Devil's Advocate, and
 * `pit hag` returned nothing while `pit-hag` returned the Pit-Hag. Nobody types
 * the punctuation, so the two best-known Minions in the game were unreachable
 * by the search box.
 *
 * THE APOSTROPHE AND THE HYPHEN FOLD DIFFERENTLY, and the difference is the
 * whole point. The first pass folded both to a space and the probe caught it
 * STILL failing on the name it was written to fix:
 *
 *   - An APOSTROPHE drops to NOTHING, so `Devil's` becomes `devils` — which
 *     is what a person types. Folding it to a space yields the tokens `devil`
 *     and `s`, and the query `devils` matches neither.
 *   - EVERY OTHER separator folds to a SPACE, so `Pit-Hag` becomes `pit` plus
 *     `hag`, reachable from `pit hag`, `pit-hag` or `hag pit`.
 *
 * Diacritics fold too — the library is author-supplied and will carry them.
 * The curly apostrophe is listed beside the straight one because that is the
 * one roles.json actually uses.
 */
const normalizeSearch = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * WHEN THE WORKBENCH STEPS ASIDE.
 *
 * Measured against the real layout, not guessed (sweep, 2026-08-18): the body
 * is a fixed 270px role rail plus the script column, and the column measures
 * 334px at a 700px window, 298 at 640, 147 at 480 and 85 at 414 — a role card
 * stops being a card somewhere just under 700, and by 480 the ability text is
 * three words to a line. Below that the tabs run off the modal's right edge.
 *
 * The second clause is the LANDSCAPE PHONE: 812x375 has all the width and none
 * of the height, and the gesture the bench is built around — dragging a role
 * up the night order — is HTML5 drag-and-drop, which does not fire on a touch
 * screen at all. `pointer: coarse` keeps a short desktop window out of it.
 */
const SMALL_BENCH =
  "(max-width: 699px), (pointer: coarse) and (max-height: 519px)";

export default {
  components: {
    Modal,
    NumberScrub,
    RoleHoverCard,
    ScriptPicker,
    ScriptView,
  },
  data: function () {
    return {
      editions: editionJSON,
      // the workbench is the modal's only page now; the flag stays because
      // ensureOpen (and old muscle memory in methods) still sets it
      isCustom: true,
      bloodA,
      demonGlyph,
      outsiderGlyph,
      fontStateRef: fontState,
      // Is the window too small to hold the bench? (see SMALL_BENCH). Live —
      // a rotation or a desktop resize flips it either way.
      smallScreen: false,
      // Golem fork: the vault shelf + which vault script is currently loaded
      // (the fork/update decision key on save).
      recents: vault.getRecents(),
      // Golem fork (FT-851): the custom-role library state — the form (null
      // when closed), the library id being edited (fork/update decision), the
      // icon-picker filter, browse query/filter/results, the roles shelf.
      roleForm: null,
      editingLibId: null,
      iconSearch: "",
      roleQuery: "",
      roleTypeFilter: "",
      roleResults: [],
      roleShelf: roleLib.getRecents(),
      roleError: "",
      // FT-1040: the forge's chips and composer — the wakes chips wear the
      // night tabs' moons; the palette is the schema's own six shapes; the
      // reminder pill being typed lives outside roleForm (it is not a token
      // until Enter mints it).
      moonFirstArt: moonFirst,
      moonOtherArt: moonOther,
      nightShapes: NIGHT_SHAPES,
      reminderDraft: "",
      // FT-981: the last library browse failed. Not an error banner (see
      // searchRoles) — just enough for the empty state to say why the
      // haystack is smaller than the author expects.
      browseDown: false,
      // Golem fork (FT-854): the workbench — active view, sidebar team filter,
      // the import-role paste row, and the non-conforming marks by script id
      // (derived from the setup table; informational only, never a gate).
      wbView: "team",
      wbTeam: "",
      // the shelf's hover card — the entry it describes, and the row it is
      // pinned to (RoleHoverCard measures and places itself)
      roleTip: null,
      roleTipAnchor: null,
      // FT-857: the night-order drag state + the by-type fold state moved
      // into ScriptView with the markup they drive.
      // FT-855 polish: the bespoke demon glyph — horns, head, hollow eyes
      // (no FA solid reads "demon"; drawn to match the solid-icon weight).
      DEMON_PATH:
        "M178 112 C 210 98 302 98 334 112 C 338 148 346 164 368 176 L 352 200 C 342 220 338 232 336 252 C 328 310 298 348 256 368 C 214 348 184 310 176 252 C 174 232 170 220 160 200 L 144 176 C 166 164 174 148 178 112 Z " +
        "M182 114 C 170 64 198 30 244 24 C 232 54 230 80 236 102 C 216 104 198 108 182 114 Z " +
        "M330 114 C 342 64 314 30 268 24 C 280 54 282 80 276 102 C 296 104 314 108 330 114 Z " +
        "M186 200 C 202 176 240 182 254 204 C 236 220 202 216 186 200 Z " +
        "M326 200 C 310 176 272 182 258 204 C 276 220 310 216 326 200 Z " +
        "M162 366 C 172 442 258 482 348 458 C 380 448 402 432 414 410 L 388 396 C 376 414 352 428 322 434 C 254 446 192 416 180 362 Z " +
        "M396 366 L 448 362 L 428 418 Z",
      // dirty tracking: the last loaded/saved state, serialized
      scriptBaseline: null,
      // the New-script overlay
      newScriptForm: null,
      nsIconSearch: "",
      nsError: "",
      nsDragOver: false,
      nsJsonText: "",
      // the "name your copy" panel — non-null while a save is waiting on a
      // name. { forking, original, name }
      forkForm: null,
      forkError: "",
      // a free name offered next to a clash, one click to take it
      forkSuggestion: "",
      // the workbench's own inline ask — { title, label, placeholder, value,
      // okText, onOk }; null when nothing is being asked.
      askForm: null,
      askError: "",
      // FT-970: the delete-for-everyone confirm — { id, name }, null when
      // nothing is being asked. Separate from askForm on purpose: that one is
      // an input panel with a purple go-button, this one is a blood-red
      // question with no field to fill in.
      destroyForm: null,
      destroyError: "",
      // the forge's paste-to-fill box
      roleJsonText: "",
      // FT-856 slice B: the icon tabs — official borrow vs the new-icon
      // library (game-icons.net curation, lazy chunk).
      iconTab: "library",
      ilSearch: "",
      ilTheme: "",
      ilLoaded: false,
      ilTick: 0,
      ilHoverBaked: "",
      ilHoverName: "",
      // FT-855: tri-state team toggles (1 show-only, -1 hide, absent off)
      // + structured filter pills [{ id: 'src:tb', not: false }].
      teamState: {},
      pills: [],
      ncMap: JSON.parse(localStorage.getItem("golem.scriptNC") || "{}"),
      officials: [
        ["trouble-brewing", "Trouble Brewing"],
        ["bad-moon-rising", "Bad Moon Rising"],
        ["sects-and-violets", "Sects & Violets"],
      ],
      vaultSourceId: null,
      scripts: [
        [
          "Deadly Penance Day",
          "https://gist.githubusercontent.com/bra1n/0337cc44c6fd2c44f7589256ed5486d2/raw/16be38fa3c01aaf49827303ac80577bdb52c0b25/penanceday.json",
        ],
        [
          "Catfishing 11.1",
          "https://gist.githubusercontent.com/bra1n/8a5ec41a7bbf945f6b7dfc1cef72b569/raw/a312ab93c2f302e0ef83c8b65a4e8e82760fda3a/catfishing.json",
        ],
        [
          "On Thin Ice (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/8dacd9f2abc6f428331ea1213ab153f5/raw/0cacbcaf8ed9bddae0cca25a9ada97e9958d868b/on-thin-ice.json",
        ],
        [
          "Race To The Bottom (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/63e1354cb3dc9d4032bcd0623dc48888/raw/5acb0eedcc0a67a64a99c7e0e6271de0b7b2e1b2/race-to-the-bottom.json",
        ],
        [
          "Frankenstein's Mayor by Ted (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/32c52b422cc01b934a4291eeb81dbcee/raw/5bf770693bbf7aff5e86601c82ca4af3222f4ba6/Frankensteins_Mayor_by_Ted.json",
        ],
        [
          "Vigormortis High School (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/1f65bd4a999524719d5dabe98c3c2d27/raw/22bbec6bf56a51a7459e5ae41ed47e41971c5445/VigormortisHighSchool.json",
        ],
      ],
    };
  },
  computed: {
    ...mapState(["modals"]),
    // Golem fork (FT-851): the current script's custom roles (editable rows).
    // state.roles is REPLACED wholesale on every setCustomRoles, so this
    // recomputes despite being a Map.
    editionCustomRoles() {
      const list = [];
      this.$store.state.roles.forEach((role) => {
        if (role.isCustom) list.push(role);
      });
      return list;
    },
    // The icon picker's grid: official roles, name-filtered.
    iconMatches() {
      const q = this.iconSearch.trim().toLowerCase();
      if (!q) return rolesJSON;
      return rolesJSON.filter((role) => role.name.toLowerCase().includes(q));
    },
    // The shelf, narrowed by the browse query so search reads as one list.
    ilThemes() {
      return iconLib.THEMES;
    },
    ilFiltered() {
      if (!this.ilLoaded) return [];
      const list = this.$options.ilList || [];
      const q = this.ilSearch.trim().toLowerCase();
      return list.filter(
        (e) =>
          (!this.ilTheme || e.t === this.ilTheme) && (!q || e.n.includes(q)),
      );
    },
    /** Cap the rendered grid — 1.3k canvases in one paint is a hitch. */
    ilShown() {
      return this.ilFiltered.slice(0, 160);
    },
    ilOverflow() {
      return Math.max(0, this.ilFiltered.length - 160);
    },
    /** The hovered role's tags, as readable chip labels (team rides the
     *  card border already, so it stays off the chips). */
    roleTipChips() {
      if (!this.roleTip) return [];
      return [...this.entryTags(this.roleTip)]
        .filter((id) => !id.startsWith("team:"))
        .map((id) => this.pillValueLabel({ id }));
    },
    ilPreviewSrc() {
      return (
        this.ilHoverBaked || (this.roleForm && this.roleForm.iconData) || ""
      );
    },
    ilPreviewLabel() {
      if (this.ilHoverName) return this.ilHoverName;
      const f = this.roleForm;
      return f && f.iconRef ? f.iconRef.replace(/-/g, " ") : "";
    },
    /** Would the next save FORK? A script loaded from the vault that this
     *  browser holds no edit key for cannot be updated in place — saving it
     *  makes a copy, and a copy has to be named before it is made. */
    willFork() {
      return !!this.vaultSourceId && !vault.editKeyFor(this.vaultSourceId);
    },
    /** FT-970: can the loaded script be destroyed for everyone? Only with its
     *  edit key — without one the server refuses, so offering the button would
     *  be offering a guaranteed error. `recents` is in the expression so the
     *  button disappears the moment the key is forgotten. */
    canDestroyLoaded() {
      if (!this.vaultSourceId) return false;
      return this.recents.some(
        (e) => e.id === this.vaultSourceId && !!e.editKey,
      );
    },
    /** The forge header's drop-cap N, in the caps' font (Almanac-style). */
    forgeCap() {
      const key = resolvedCapKey();
      const g = glyphFrom(key, "N");
      if (!g) return null;
      return { src: g.src, style: glyphStyleFrom(key, "N", CAP_SHRINK) };
    },
    roleShelfFiltered() {
      const q = this.roleQuery.trim().toLowerCase();
      if (!q) return this.roleShelf;
      return this.roleShelf.filter((entry) =>
        (entry.name || "").toLowerCase().includes(q),
      );
    },
    // ── Golem fork (FT-854): the workbench ───────────────────────────────
    myScripts() {
      return this.recents.filter((e) => e.editKey);
    },
    viewedScripts() {
      return this.recents.filter((e) => !e.editKey);
    },
    /** What the picker should show as current. */
    wbPickedId() {
      const edition = this.$store.state.edition;
      if (edition && edition.id !== "custom") return edition.id;
      if (edition && edition.logo === "__gold") return "__all";
      return this.vaultSourceId || "";
    },
    /** The picker's cards: officials, then your scripts, then viewed ones.
     *  Non-conforming scripts wear the warning right in their name. */
    wbScriptCards() {
      const cards = [];
      this.editions.forEach((e) => {
        cards.push({
          id: e.id,
          name: e.name,
          icon: EDITION_ICONS[e.id] || edCustom,
          blurb: OFFICIAL_BLURBS[e.id] || "",
          source: "OFFICIAL",
        });
      });
      // every official character on one script, behind the gold logo
      cards.push({
        id: "__all",
        name: "All of Blood on the Clocktower",
        icon: goldLogo,
        blurb: "Every official character — the whole book on one script.",
        source: "OFFICIAL",
      });
      const vaultCard = (entry, source) => ({
        id: entry.id,
        name: (this.ncMap[entry.id] ? "⚠ " : "") + (entry.name || entry.id),
        // the loaded script's own icon shows once known (edition.logo —
        // saved scripts carry it in _meta; role id or uploaded data URL)
        icon:
          entry.id === this.vaultSourceId && this.$store.state.edition.logo
            ? this.scriptLogoSrc(this.$store.state.edition.logo)
            : edCustom,
        blurb: this.ncMap[entry.id]
          ? "Outside the rules — still playable."
          : "",
        source,
        // FT-970: every SHELF card can be forgotten — that is a local edit and
        // it is the answer to a grid full of test clutter. The officials above
        // are not on the shelf and carry no flag, so they cannot be.
        forgettable: true,
        // ...and whether this browser holds the key, which is the whole
        // difference between "you lose your copy of the link" and "you lose
        // the only way you will ever edit this again".
        owned: !!entry.editKey,
      });
      this.myScripts.forEach((e) => cards.push(vaultCard(e, "yours")));
      this.viewedScripts.forEach((e) => cards.push(vaultCard(e, "viewed")));
      return cards;
    },
    /** The picker's own card for what is loaded — the small-screen note's
     *  whole read. A vault script that is not in the recents shelf still has
     *  a name on the edition, so the fallback is never a blank plate. */
    loadedCard() {
      const id = this.wbPickedId;
      const card = this.wbScriptCards.find((c) => c.id === id);
      if (card) return card;
      const edition = this.$store.state.edition || {};
      return { id: "", name: edition.name || "Custom script", icon: edCustom };
    },
    /** The four core teams with their counts, for the small-screen note. */
    smallCounts() {
      const icons = {
        townsfolk: "users",
        outsider: "walking",
        minion: "mask",
        demon: "user-secret",
      };
      return ["townsfolk", "outsider", "minion", "demon"].map((team) => ({
        team,
        label: TEAM_LABELS[team],
        icon: icons[team],
        count: this.teamCounts[team],
      }));
    },
    /** The current script as a list (state.roles is replaced wholesale). */
    scriptRoles() {
      const list = [];
      this.$store.state.roles.forEach((role) => list.push(role));
      return list;
    },
    // FT-857: the meter itself renders inside ScriptView; what stays here is
    // the same maths, from the same module, for the non-conforming MARK the
    // vault selector badges with.
    teamCounts() {
      return countTeams(this.scriptRoles);
    },
    /** Player counts the pool can serve under the official table. */
    servableCounts() {
      return servableFor(this.teamCounts);
    },
    /** "5–15" / "5, 7, 10–13" — collapse runs for the meter. */
    servableText() {
      return servableText(this.servableCounts);
    },
    // Travellers left the script surface (user call 2026-08-17): a script is
    // the town's regular menu; travellers join IN the town — the seat's role
    // picker already lists every traveller, in-script or not (otherTravelers).
    /** FT-855: the team toggle row — icon, live count (self-excluded, the
     *  faceted-search convention: a facet's own selection never zeroes its
     *  siblings). */
    teamRow() {
      const icons = {
        townsfolk: "users",
        outsider: "walking",
        minion: "mask",
        demon: "", // bespoke horned-head SVG (DEMON_PATH)
      };
      // FT-981: ONE pass, tallying by team — this was four passes over every
      // entry, one per team button, each re-running the same two matchers on
      // the same rows. Same numbers, a quarter of the work, on a computed that
      // re-runs on every keystroke.
      const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
      this.allShelfEntries.forEach((e) => {
        if (counts[e.team] === undefined) return;
        if (!this.matchesSearch(e)) return;
        if (!this.matchesPills(e, null)) return;
        counts[e.team]++;
      });
      return ["townsfolk", "outsider", "minion", "demon"].map((team) => ({
        team,
        label: TEAM_LABELS[team],
        icon: icons[team],
        count: counts[team],
      }));
    },
    // FT-1039: the three always-visible chip rows (the fold retired).
    sourceTags() {
      return TAG_GROUPS.find((g) => g.key === "source").tags;
    },
    nightTags() {
      return TAG_GROUPS.find((g) => g.key === "night").tags;
    },
    flagTags() {
      return TAG_GROUPS.find((g) => g.key === "flags").tags;
    },
    filteredCount() {
      return this.sidebarRoles.length;
    },
    searchActive() {
      return !!this.roleQuery.trim();
    },
    /** FT-981: the query, normalized and split, ONCE per change — not once
     *  per entry per matcher call. */
    searchTokens() {
      const q = normalizeSearch(this.roleQuery);
      return q ? q.split(" ") : [];
    },
    /**
     * FT-981: EVERY facet value's live count, tallied in one pass per FACET
     * instead of one pass per VALUE.
     *
     * `countFor` used to walk all 139 entries for each value on screen, and
     * with twelve values open that is twelve full passes running the same
     * three matchers over the same rows on every keystroke. Only the
     * `matchesPills` exclusion differs between values of the same facet — and
     * that is constant WITHIN a facet — so one pass per facet gives identical
     * numbers.
     *
     * Standard faceted counting is preserved exactly: a facet's own pills are
     * excluded from its own counts, so choosing one value never zeroes its
     * siblings.
     */
    facetCounts() {
      const out = {};
      TAG_GROUPS.forEach((group) => {
        if (group.key === "team") return;
        this.allShelfEntries.forEach((e) => {
          if (!this.matchesSearch(e)) return;
          if (!this.matchesTeams(e)) return;
          if (!this.matchesPills(e, group.key)) return;
          const tags = this.entryTags(e);
          group.tags.forEach((t) => {
            if (tags.has(t.id)) out[t.id] = (out[t.id] || 0) + 1;
          });
        });
      });
      return out;
    },
    /** FT-981: is anything OTHER than the search narrowing the rail? The
     *  empty state needs to name the right way out, and "clear the search"
     *  is useless advice when it was a team toggle that emptied the list. */
    filtersActive() {
      return (
        !!this.pills.length ||
        Object.keys(this.teamState).some((t) => this.teamState[t])
      );
    },
    totalCount() {
      return this.allShelfEntries.length;
    },
    /** Every shelf entry, UNFILTERED — the base set filters and counts read. */
    allShelfEntries() {
      const inScriptIds = new Set(this.scriptRoles.map((r) => r.id));
      const inScriptLibIds = new Set(
        this.scriptRoles.map((r) => r.golemRoleId).filter(Boolean),
      );
      const entries = [];
      rolesJSON.forEach((role) => {
        if (normTeam(role.team) === "traveler") return; // town-side, not script
        entries.push({
          key: "off-" + role.id,
          id: role.id,
          name: role.name,
          team: normTeam(role.team),
          ability: role.ability,
          iconUrl: this.iconUrl(role.id),
          official: true,
          inScript: inScriptIds.has(role.id),
          // FT-1039: the search reads the reminder tokens too — "poisoned"
          // finds every role that leaves that marker on a seat.
          reminders: role.reminders,
          // the tag filter's raw material
          edition: role.edition,
          firstNight: role.firstNight,
          otherNight: role.otherNight,
          setup: !!role.setup,
        });
      });
      const seen = new Set();
      this.roleShelf.forEach((entry) => {
        seen.add(entry.id);
        if (normTeam(entry.role) === "traveler") return;
        entries.push({
          key: "lib-" + entry.id,
          libId: entry.id,
          name: entry.name,
          team: normTeam(entry.role),
          // The recents shelf stores {id, name, editKey, role, lastSeen} and
          // no ability text, so a library role the author has only VIEWED is
          // reachable by name alone. Browse rows below do carry it. Passed
          // through rather than assumed absent, so a shelf entry that grows an
          // ability later starts matching without another change here.
          ability: entry.ability || "",
          isLib: true,
          mine: !!entry.editKey,
          inScript: inScriptLibIds.has(entry.id),
        });
      });
      this.roleResults.forEach((row) => {
        if (seen.has(row.id)) return;
        if (normTeam(row.roleType) === "traveler") return;
        entries.push({
          key: "browse-" + row.id,
          libId: row.id,
          name: row.name,
          team: normTeam(row.roleType),
          ability: row.ability || "",
          isLib: true,
          mine: false,
          inScript: inScriptLibIds.has(row.id),
        });
      });
      // FT-981: the searchable text and the tag set, built ONCE per entry here
      // rather than per keystroke in the matchers.
      //
      // Measured on the shipped build: one keystroke ran `matchesSearch` 278
      // times — every one of them re-lowercasing the same query and the same
      // name — and `countFor` rebuilt an entry's tag Set once per facet value
      // on screen. Both are pure functions of the entry, so they belong with
      // the entry. `entryTags` stays the single definition of the tag
      // vocabulary and simply reads this cache when it is present.
      entries.forEach((e) => {
        e.searchName = normalizeSearch(e.name);
        e.search =
          e.searchName +
          " " +
          normalizeSearch(
            (e.ability || "") + " " + (e.reminders || []).join(" "),
          );
        e.tags = this.entryTags(e);
      });
      return entries;
    },
    /** The shelf, filtered by search + team row + pills, sorted team/name.
     *  (roles.json arrives grouped by edition — "weirdly sorted".) */
    sidebarRoles() {
      const teamRank = (t) => {
        const i = TEAM_ORDER.indexOf(t);
        return i < 0 ? TEAM_ORDER.length : i;
      };
      return this.allShelfEntries
        .filter(
          (e) =>
            this.matchesSearch(e) &&
            this.matchesTeams(e) &&
            this.matchesPills(e, null),
        )
        .sort(
          (a, b) =>
            teamRank(a.team) - teamRank(b.team) ||
            // FT-981: THE THING YOU NAMED COMES FIRST. Now that a search reads
            // ability text, an alphabetical list buries the obvious answer:
            // searching "poison" put the Boffin above the POISONER, because B
            // sorts before P and the Boffin's ability happens to say poison.
            // A name hit outranks an ability-only hit inside each team group;
            // with no query both sides are 0 and the order is unchanged.
            this.nameHitRank(b) - this.nameHitRank(a) ||
            (a.name || "").localeCompare(b.name || ""),
        );
    },
    roleTemplateJson() {
      return JSON.stringify(ROLE_TEMPLATE);
    },
    /** The forge asks WHETHER a role wakes; WHERE it wakes is the script's
     *  night order (drag in the night views — the official model too:
     *  _meta.firstNight/otherNight arrays). A fresh wake lands at the end
     *  (100); pasted official numbers pass through untouched. */
    wakesFirstNight: {
      get() {
        return !!this.roleForm && this.roleForm.firstNight > 0;
      },
      set(v) {
        if (!this.roleForm) return;
        this.roleForm.firstNight = v ? this.roleForm.firstNight || 100 : 0;
      },
    },
    /** FT-1040: the pill view of the stored comma-joined reminder string. */
    reminderPills() {
      if (!this.roleForm) return [];
      return this.roleForm.reminders
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    },
    wakesOtherNights: {
      get() {
        return !!this.roleForm && this.roleForm.otherNight > 0;
      },
      set(v) {
        if (!this.roleForm) return;
        this.roleForm.otherNight = v ? this.roleForm.otherNight || 100 : 0;
      },
    },
    /** The Almanac's drop-cap wears the caps' font (right-click a door to
     *  cycle); blood keeps the pixel-tuned baked class. */
    almanacCap() {
      const key = resolvedCapKey();
      if (key !== "blood" && key !== "logo") {
        const g = glyphFrom(key, "S");
        if (g)
          return {
            src: g.src,
            cls: "font-cap",
            style: glyphStyleFrom(key, "S", CAP_SHRINK),
          };
      }
      return { src: this.bloodA, cls: "blood-cap-a", style: null };
    },
    /** The script's editable surface, serialized — dirty = differs from the
     *  baseline taken at load/save/new. */
    currentScriptSnapshot() {
      const e = this.$store.state.edition;
      return JSON.stringify({
        e: e.id,
        n: e.name || "",
        l: e.logo || "",
        r: this.collapseScript(),
      });
    },
    scriptDirty() {
      return (
        this.scriptBaseline !== null &&
        this.scriptBaseline !== this.currentScriptSnapshot
      );
    },
    nsIconMatches() {
      const q = this.nsIconSearch.trim().toLowerCase();
      if (!q) return rolesJSON;
      return rolesJSON.filter((role) => role.name.toLowerCase().includes(q));
    },
    nsIconStyle() {
      const f = this.newScriptForm;
      if (!f || !f.icon) return {};
      return { backgroundImage: `url(${this.scriptLogoSrc(f.icon)})` };
    },
    /** The shelf grouped by team, headers included (user call). */
    sidebarGroups() {
      return ["townsfolk", "outsider", "minion", "demon"]
        .map((team) => ({
          team,
          label: TEAM_LABELS[team],
          roles: this.sidebarRoles.filter((r) => r.team === team),
        }))
        .filter((g) => g.roles.length);
    },
    // FT-857: the by-team groups, the night wakers/sleepers and the drag
    // bookkeeping moved into ScriptView — the component that renders them.
  },
  // Golem fork: a ?script=<id> share link auto-loads its script on arrival.
  // The QUERY string is used (not the hash) because the hash is the live
  // session's join token upstream — the two must coexist on one URL.
  created() {
    const id = new URLSearchParams(window.location.search).get("script");
    if (id) this.loadFromVault(id);
    this.setBaseline();
  },
  mounted() {
    // The bench asks the window whether it has room, and keeps asking: a
    // phone rotated into landscape, or a desktop window dragged narrow, has
    // to flip live rather than at the next reload.
    const mq = window.matchMedia(SMALL_BENCH);
    const onChange = (e) => {
      this.smallScreen = e.matches;
    };
    this.smallScreen = mq.matches;
    // Safari before 14 has only the deprecated listener API.
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    this.$options.benchMQ = mq;
    this.$options.benchOnChange = onChange;
    // FT-1039: `/` jumps to the search — the app's hotkey guard idiom
    // (App.vue keyup): keys typed into a field are typing, not hotkeys. The
    // overlays (forge, new-script, fork/ask/destroy panels) also swallow it —
    // focusing a field UNDER an overlay would type into the dark.
    const onSlash = (e) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (!this.modals.edition || this.smallScreen) return;
      if (
        this.roleForm ||
        this.newScriptForm ||
        this.forkForm ||
        this.askForm ||
        this.destroyForm
      )
        return;
      const el = this.$refs.searchInput;
      if (!el) return;
      e.preventDefault();
      el.focus();
      el.select();
    };
    window.addEventListener("keydown", onSlash);
    this.$options.benchOnSlash = onSlash;
  },
  beforeDestroy() {
    if (this.$options.benchOnSlash)
      window.removeEventListener("keydown", this.$options.benchOnSlash);
    const mq = this.$options.benchMQ;
    if (!mq) return;
    if (mq.removeEventListener)
      mq.removeEventListener("change", this.$options.benchOnChange);
    else mq.removeListener(this.$options.benchOnChange);
  },
  watch: {
    // FT-856: a team switch re-prints the baked library icon in the new tint
    "roleForm.roleType"() {
      this.rebakeForTeam();
    },
  },
  methods: {
    /** The team's own art, one definition for the whole app (golem/glyphs). */
    teamGlyph,
    // ── Golem fork: the script vault ─────────────────────────────────────
    async loadFromVault(id, attach = true) {
      try {
        const script = await vault.loadScript(id);
        // roles verbatim; carry the vault name in as _meta so the script's
        // name survives the round trip and seeds the save prompt later.
        const roles = Array.isArray(script.roles) ? script.roles.slice() : [];
        if (!roles.some((r) => r && r.id === "_meta")) {
          roles.unshift({
            id: "_meta",
            name: script.name,
            author: script.author,
          });
        }
        this.parseRoles(roles);
        this.vaultSourceId = script.id;
        this.recents = vault.getRecents();
        this.markNC(script.id);
        this.setBaseline();
        // FT-847: the host of an OWNED town picked a vault script → save it
        // to the town (skipped when the town itself supplied the script).
        if (attach) this.maybeAttachToTown(script.id);
      } catch (e) {
        alert("Could not load that script: " + e.message);
      }
    },
    /**
     * FT-847: attach the loaded script to the current town — only when this
     * browser HOSTS the session AND holds the town's edit key. Spectators are
     * never prompted; failures are silent (best-effort, like all town calls).
     */
    maybeAttachToTown(scriptId) {
      const { session } = this.$store.state;
      if (session.isSpectator || !session.sessionId) return;
      if (!towns.editKeyFor(session.sessionId)) return;
      towns
        .updateTown(session.sessionId, { scriptId })
        .then((town) => flashHint(`Script saved to ${town.name || town.id}`))
        .catch(() => {});
    },
    /** Open the workbench's inline ask (see its markup for why it exists). */
    openAsk(opts) {
      this.askError = "";
      this.askForm = { placeholder: "", value: "", okText: "OK", ...opts };
      this.$nextTick(() => {
        const el = this.$refs.askInput;
        if (el) {
          el.focus();
          el.select();
        }
      });
    },
    cancelAsk() {
      this.askForm = null;
      this.askError = "";
    },
    confirmAsk() {
      const f = this.askForm;
      if (!f) return;
      const value = (f.value || "").trim();
      if (!value) {
        this.askError = "Paste it in first, or cancel.";
        return;
      }
      // The handler may keep the panel open to show its own complaint — it
      // gets the last word by returning a string.
      const problem = f.onOk(value);
      if (problem) {
        this.askError = problem;
        return;
      }
      this.askForm = null;
      this.askError = "";
    },
    // ── FT-970: the two removals ─────────────────────────────────────────
    /**
     * FORGET — the picker's card ×. Local only: the entry leaves this
     * browser's shelf and the script stays on the server untouched, which is
     * what clears a grid full of test clutter without reaching anybody else.
     *
     * The picker already made the user click twice, so there is no second ask
     * here. The loaded script is deliberately NOT unloaded if it is the one
     * forgotten — the work on the bench is not the shelf's to throw away. It
     * does become fork-on-save, since the key went with the entry, and
     * `willFork` already tells the save path exactly that.
     */
    forgetScript(card) {
      vault.forget(card.id);
      this.recents = vault.getRecents();
    },
    /** Open the delete-for-everyone confirm for the LOADED script. */
    askDestroy() {
      if (!this.canDestroyLoaded) return;
      const entry = this.recents.find((e) => e.id === this.vaultSourceId);
      this.destroyError = "";
      this.destroyForm = {
        id: this.vaultSourceId,
        name:
          (entry && entry.name) ||
          (this.$store.state.edition || {}).name ||
          "this script",
      };
    },
    cancelDestroy() {
      this.destroyForm = null;
      this.destroyError = "";
    },
    /**
     * Destroy it. The server is the one that decides — this browser sends the
     * key it holds and a 403 means the key is no longer good, which is worth
     * saying rather than swallowing.
     *
     * On success the script is gone everywhere, so the bench stops claiming it
     * came from the vault: `vaultSourceId` clears, and the next save creates a
     * new script rather than trying to update a row that is not there.
     */
    async confirmDestroy() {
      const f = this.destroyForm;
      if (!f) return;
      this.destroyError = "";
      try {
        await vault.deleteScript(f.id);
      } catch (e) {
        this.destroyError =
          e && e.code === "not-yours"
            ? "This browser no longer holds the key for that script."
            : `Could not delete it — ${e.message}`;
        return;
      }
      this.recents = vault.getRecents();
      if (this.vaultSourceId === f.id) this.vaultSourceId = null;
      this.destroyForm = null;
    },
    promptVaultLoad() {
      this.openAsk({
        title: "Load a script",
        label: "Script link or id",
        placeholder: "https://… or an id",
        okText: "Load",
        onOk: (ref) => {
          const id = vault.parseScriptRef(ref);
          if (!id) return "That does not look like a script link.";
          this.loadFromVault(id);
        },
      });
    },
    /**
     * The dirty control's Save. An update in place goes straight through on
     * the name the script already carries; a FORK stops and asks for a name
     * first (see the fork panel's markup for why it is a panel and not a
     * prompt). `willFork` is knowable up front: no edit key for the source
     * means the save can only become a copy.
     */
    saveToVault() {
      const custom = this.$store.state.roles;
      if (this.$store.state.edition.id !== "custom" || !custom.size) {
        alert(
          "Load or build a custom script first — the vault stores custom scripts.",
        );
        return;
      }
      const name = (this.$store.state.edition.name || "").trim();
      if (this.willFork || !name) return this.openForkForm();
      return this.commitSave(name);
    },
    /** Open the name panel, pre-filled: a fork gets a FREE derived name (so
     *  confirming without typing can never re-use the original's), a nameless
     *  script gets its own blank. The field opens focused and selected. */
    openForkForm(forcing) {
      const original = (this.$store.state.edition.name || "").trim();
      // `forcing` is the stale-key case: the browser still holds a key, so
      // willFork reads false, but the server has already refused it.
      const forking = forcing === true || this.willFork;
      this.forkError = "";
      this.forkSuggestion = "";
      this.forkForm = {
        forking,
        original,
        name: forking ? this.suggestForkName(original) : original,
      };
      this.$nextTick(() => {
        const el = this.$refs.forkName;
        if (el) {
          el.focus();
          el.select();
        }
      });
    },
    /** "<name> (fork)", bumped past anything already on this browser's shelf
     *  — (fork 2), (fork 3) — so the panel never opens on a taken name.
     *  Forking a fork re-uses the stem rather than stacking suffixes. */
    suggestForkName(original) {
      const base =
        (original || "").replace(/\s*\(fork(?:\s+\d+)?\)\s*$/i, "").trim() ||
        "My script";
      let candidate = `${base} (fork)`;
      let n = 2;
      while (this.nameTaken(candidate)) candidate = `${base} (fork ${n++})`;
      return candidate;
    },
    /** Is that name already on the shelf? The script being saved in place
     *  does not clash with itself. */
    nameTaken(name) {
      const want = name.trim().toLowerCase();
      return this.recents.some(
        (e) =>
          e.id !== this.vaultSourceId &&
          (e.name || "").trim().toLowerCase() === want,
      );
    },
    /** Confirm the panel. The name must be there, must not be the original's,
     *  and must not be one already on the shelf — a clash offers a free name
     *  rather than dead-ending. */
    confirmFork() {
      const f = this.forkForm;
      if (!f) return;
      const name = (f.name || "").trim();
      this.forkSuggestion = "";
      if (!name) {
        this.forkError = f.forking
          ? "Your copy needs a name."
          : "A script needs a name.";
        return;
      }
      if (
        f.forking &&
        name.toLowerCase() === (f.original || "").toLowerCase()
      ) {
        this.forkError =
          "That is the original's name — your copy needs its own.";
        this.forkSuggestion = this.suggestForkName(f.original);
        return;
      }
      if (this.nameTaken(name)) {
        this.forkError = `You already have a script called “${name}”.`;
        this.forkSuggestion = this.suggestForkName(name);
        return;
      }
      this.forkError = "";
      this.forkForm = null;
      return this.commitSave(name, { forceFork: f.forking });
    },
    useForkSuggestion() {
      if (!this.forkForm || !this.forkSuggestion) return;
      this.forkForm.name = this.forkSuggestion;
      this.forkSuggestion = "";
      this.forkError = "";
    },
    /** Cancel abandons the SAVE, not the edits — the bench stays dirty. */
    cancelFork() {
      this.forkForm = null;
      this.forkError = "";
      this.forkSuggestion = "";
    },
    async commitSave(name, { forceFork = false } = {}) {
      // The CURRENT custom script = what the store holds. Plain base-role
      // entries collapse back to id references; custom roles ship whole.
      const meta = this.$store.state.edition;
      // A role whose id exists upstream collapses back to an id reference
      // (the Script Tool convention) — kept as a bare string when it carries
      // no night-order override; a custom role ships whole, minus the
      // store's derived display fields.
      const roles = this.collapseScript().map((entry) =>
        Object.keys(entry).length === 1 && entry.id !== undefined
          ? entry.id
          : entry,
      );
      // FT-854: the script's icon travels in _meta (script-tool convention),
      // so it survives the save/load round trip.
      if (this.$store.state.edition.logo) {
        roles.unshift({
          id: "_meta",
          name,
          author: meta.author,
          logo: this.$store.state.edition.logo,
        });
      }
      try {
        const { script, created, forked } = await vault.saveScript({
          name,
          author: meta.author,
          roles,
          sourceId: this.vaultSourceId,
          forceFork,
        });
        // the confirmed name belongs to the script on the bench now, so the
        // title, the picker and the next save all read the copy, not the
        // original. setEdition closes the modal (upstream's flow ended
        // there) — ensureOpen puts it back, as everywhere else here.
        if (name !== meta.name) {
          this.$store.commit("setEdition", { ...meta, id: "custom", name });
          this.ensureOpen();
        }
        this.vaultSourceId = script.id;
        this.recents = vault.getRecents();
        // FT-854: stamp (or clear) the non-conforming mark — a marker, not a
        // gate; the save above already succeeded whatever the composition.
        this.markNC(script.id);
        this.setBaseline();
        // FT-847: a save/fork lands a (possibly new) script id — keep the
        // owned town pointing at what its host actually plays.
        this.maybeAttachToTown(script.id);
        const link = vault.shareLink(script.id);
        const what = forked
          ? "Forked into your own copy"
          : created
          ? "Saved"
          : "Updated";
        try {
          await navigator.clipboard.writeText(link);
          alert(`${what}. Share link copied:\n${link}`);
        } catch (e) {
          alert(`${what}. Share link:\n${link}`);
        }
      } catch (e) {
        // the stored key was revoked or wrong: the save can only be a fork
        // now, so come back round through the panel for a name.
        if (e && e.code === "fork-required") {
          this.forkForm = null;
          this.openForkForm(true);
          return;
        }
        alert("Save failed: " + e.message);
      }
    },
    async copyLinks() {
      try {
        await navigator.clipboard.writeText(vault.exportLinks());
        alert(
          "Your script links (edit keys included) are on the clipboard — paste them somewhere safe.",
        );
      } catch (e) {
        alert(vault.exportLinks());
      }
    },
    // ── Golem fork (FT-851): the custom-role library ─────────────────────
    /** Open the form — blank, or seeded from an existing edition role. */
    openRoleForm(role) {
      this.roleError = "";
      this.iconSearch = "";
      this.reminderDraft = "";
      // the library tab is the default view — have its chunk ready
      this.openIconLibrary();
      // FT-1040: reopen the composer where it was left — the stored entry
      // back to its dials; anything that isn't one of the six shapes (or no
      // entry at all) starts the composer blank.
      const dials = (role && decomposeAuthoredNight(role.golemNight)) || {};
      const night = {
        nightShape: dials.shape || "",
        nightCount: dials.count || 1,
        nightBy: dials.by || "player",
        nightPrompt: dials.prompt || "",
      };
      if (role) {
        this.editingLibId = role.golemRoleId || null;
        this.roleForm = {
          name: role.name,
          roleType: roleLib.roleTypeFromTeam(role.team),
          ability: role.ability,
          firstNight: role.firstNight || 0,
          otherNight: role.otherNight || 0,
          reminders: (role.reminders || []).join(", "),
          setup: !!role.setup,
          authorName: localStorage.getItem("golem.playerName") || "",
          icon: role.golemIcon || "",
          iconData: role.golemIconData || "",
          iconRef: role.golemIconRef || "",
          iconSeed: role.golemIconSeed || 0,
          ...night,
          // the app-side id to replace in the script (a fork mints a new
          // library id, so the library id alone can't find the old row)
          appId: role.id,
        };
      } else {
        this.editingLibId = null;
        this.roleForm = {
          name: "",
          roleType: "townsfolk",
          ability: "",
          firstNight: 0,
          otherNight: 0,
          reminders: "",
          setup: false,
          authorName: localStorage.getItem("golem.playerName") || "",
          icon: "",
          iconData: "",
          iconRef: "",
          iconSeed: 0,
          ...night,
          appId: null,
        };
      }
    },
    /** FT-1040: pick a night action shape — clicking the lit one clears it
     *  (a composed action is optional; none means the fallback free box). */
    pickNightShape(id) {
      this.roleForm.nightShape = this.roleForm.nightShape === id ? "" : id;
    },
    /** FT-1040: the reminder pills — a live view over the stored
     *  comma-joined string, which stays the storage shape. */
    addReminderPill() {
      const token = this.reminderDraft.trim().replace(/,/g, "");
      if (!token) return;
      const list = this.reminderPills.concat(token);
      this.roleForm.reminders = list.join(", ");
      this.reminderDraft = "";
    },
    removeReminderPill(i) {
      const list = this.reminderPills.slice();
      list.splice(i, 1);
      this.roleForm.reminders = list.join(", ");
    },
    closeRoleForm() {
      this.roleForm = null;
      this.roleError = "";
    },
    /** Click an icon to select it; click again to clear (icon is optional). */
    pickIcon(id) {
      this.roleForm.icon = this.roleForm.icon === id ? "" : id;
      // an official borrow replaces any baked library pick
      if (this.roleForm.icon) {
        this.roleForm.iconData = "";
        this.roleForm.iconRef = "";
      }
    },
    // ── FT-856 slice B: the new-icon library ─────────────────────────────
    async openIconLibrary() {
      this.iconTab = "library";
      if (this.ilLoaded) return;
      this.$options.ilList = await iconLib.loadIcons();
      this.$options.ilThumbs = new Map();
      this.$options.ilBakes = new Map();
      this.ilLoaded = true;
    },
    /** Thumbnails render once each into a non-reactive cache. */
    ilThumb(entry) {
      const cache = this.$options.ilThumbs;
      if (!cache.has(entry.n)) cache.set(entry.n, iconLib.silhouette(entry));
      return cache.get(entry.n);
    },
    ilHover(entry) {
      clearTimeout(this.$options.ilHoverTimer);
      this.$options.ilHoverTimer = setTimeout(async () => {
        const tintKey = entry.n + "|" + this.roleForm.roleType;
        const cache = this.$options.ilBakes;
        if (!cache.has(tintKey)) {
          cache.set(
            tintKey,
            await iconLib.bakeIcon(entry, this.roleForm.roleType, {
              size: 96,
            }),
          );
        }
        this.ilHoverBaked = cache.get(tintKey);
        this.ilHoverName = entry.n.replace(/-/g, " ");
      }, 120);
    },
    /** Leaving a cell only cancels a PENDING bake — the shown preview is
     *  sticky (last hover, else the current pick) so the slot never
     *  collapses and the layout never jumps. */
    ilHoverClear() {
      clearTimeout(this.$options.ilHoverTimer);
    },
    /** A pick bakes in the CURRENT team's tint; the ref rides the role so a
     *  later team switch re-bakes (rule: one stored bake, source kept). */
    async pickLibraryIcon(entry) {
      const f = this.roleForm;
      if (f.iconRef === entry.n) {
        f.iconRef = "";
        f.iconData = "";
        return;
      }
      f.iconRef = entry.n;
      f.icon = "";
      f.iconData = await iconLib.bakeIcon(entry, f.roleType, {
        seed: f.iconSeed || 0,
      });
    },
    async rerollIcon() {
      const f = this.roleForm;
      if (!f || !f.iconRef || !this.$options.ilList) return;
      const entry = iconLib.findIcon(this.$options.ilList, f.iconRef);
      if (!entry) return;
      f.iconSeed = 1 + Math.floor(Math.random() * 1e6);
      f.iconData = await iconLib.bakeIcon(entry, f.roleType, {
        seed: f.iconSeed,
      });
    },
    /** Team changed — re-print the bake in the new tint. */
    async rebakeForTeam() {
      const f = this.roleForm;
      if (!f || !f.iconRef) return;
      if (!this.$options.ilList)
        this.$options.ilList = await iconLib.loadIcons();
      const entry = iconLib.findIcon(this.$options.ilList, f.iconRef);
      if (!entry) return;
      f.iconData = await iconLib.bakeIcon(entry, f.roleType, {
        seed: f.iconSeed || 0,
      });
    },
    /** The bundled icon URL for an official role id. */
    iconUrl(id) {
      try {
        return require("../../assets/icons/" + id + ".png");
      } catch (e) {
        return require("../../assets/icons/custom.png");
      }
    },
    /** Save to the library (create/update/fork), then into the script. */
    async saveRoleForm() {
      const f = this.roleForm;
      // a token still sitting in the pill input counts — Enter was implied
      this.addReminderPill();
      const reminders = f.reminders
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      // honest inline validation, mirroring the server's bounds
      const nightsOk = [f.firstNight, f.otherNight].every(
        (n) => Number.isInteger(n) && n >= 0 && n <= 200,
      );
      const problem = !f.name.trim()
        ? "A role needs a name."
        : f.name.trim().length > 40
        ? "Name is limited to 40 characters."
        : !f.ability.trim()
        ? "A role needs an ability."
        : f.ability.trim().length > 600
        ? "Ability is limited to 600 characters."
        : !nightsOk
        ? "Night positions are whole numbers 0–200."
        : reminders.length > 20
        ? "At most 20 reminder tokens."
        : reminders.some((r) => r.length > 40)
        ? "Reminder tokens are limited to 40 characters."
        : "";
      if (problem) {
        this.roleError = problem;
        return;
      }
      try {
        const { role, created, forked } = await roleLib.saveRole({
          sourceId: this.editingLibId,
          name: f.name.trim(),
          roleType: f.roleType,
          ability: f.ability.trim(),
          icon: f.icon || "",
          firstNight: f.firstNight,
          otherNight: f.otherNight,
          reminders,
          setup: f.setup,
          authorName: f.authorName.trim() || undefined,
        });
        this.roleShelf = roleLib.getRecents();
        const appRole = roleLib.toAppRole(role);
        // FT-856: a baked icon rides the APP role (script snapshots carry
        // it); the server library keeps only official borrow ids.
        if (f.iconData) {
          appRole.golemIconData = f.iconData;
          appRole.golemIconRef = f.iconRef || "";
          appRole.golemIconSeed = f.iconSeed || 0;
          appRole.image = f.iconData;
        }
        // FT-1040: the composed night action rides the APP role, snapshot
        // semantics like the baked icon — the script carries it whole, the
        // library row does not. Only a WAKING character keeps one; no shape
        // picked means no composed action, and the role stays an ordinary
        // unlisted one (the free-text fallback).
        if ((f.firstNight > 0 || f.otherNight > 0) && f.nightShape) {
          const wakes = [];
          if (f.firstNight > 0) wakes.push("first");
          if (f.otherNight > 0) wakes.push("other");
          appRole.golemNight = composeAuthoredNight({
            shape: f.nightShape,
            count: f.nightCount,
            by: f.nightBy,
            prompt: f.nightPrompt,
            wakes,
          });
        }
        this.insertRoleIntoEdition(appRole, f.appId);
        flashHint(
          forked
            ? "Forked into your own copy — script updated"
            : created
            ? "Saved to the role library — added to this script"
            : "Updated — script refreshed",
        );
        this.closeRoleForm();
      } catch (e) {
        this.roleError = "Save failed: " + e.message;
      }
    },
    /** Click a shelf/browse row: fetch the role and add it to the script. */
    async addLibraryRole(id) {
      this.roleError = "";
      try {
        const role = await roleLib.loadRole(id);
        this.roleShelf = roleLib.getRecents();
        this.insertRoleIntoEdition(roleLib.toAppRole(role), null);
        flashHint(`${role.name} added to this script`);
      } catch (e) {
        this.roleError = e.message;
      }
    },
    /** Browse the library (shelf rows are listed separately, so dedupe). */
    async searchRoles() {
      this.roleError = "";
      try {
        // FT-855: a single shown-only team narrows the library browse too.
        const inc = Object.keys(this.teamState).filter(
          (t) => this.teamState[t] === 1,
        );
        const type = inc.length === 1 ? inc[0] : "";
        const rows = await roleLib.browseRoles({
          q: this.roleQuery.trim(),
          type,
          limit: 20,
        });
        const shelfIds = new Set(this.roleShelf.map((e) => e.id));
        this.roleResults = rows.filter((r) => !shelfIds.has(r.id));
        this.browseDown = false;
      } catch (e) {
        // FT-981: a failed library browse is NOT an error banner.
        //
        // This runs on a 400ms debounce behind every keystroke, and it used to
        // set `roleError` — which paints large red text across the script
        // view. So with the library unreachable, typing anything at all
        // stamped "Browse failed" over the author's script, once per pause,
        // while the local search underneath was working perfectly.
        //
        // The browse SUPPLEMENTS a search over the official roles and the
        // local shelf; losing it narrows the haystack, it does not break the
        // box. Recorded quietly so the empty state can mention it if the
        // author ends up with nothing, and left out of the way otherwise.
        this.browseDown = true;
        this.roleResults = [];
      }
    },
    /**
     * Insert (or replace) a role in the CURRENT script — snapshot semantics,
     * saveToVault's collapse: official ids as {id} refs, custom roles whole
     * (minus the store's derived display field). An official edition growing
     * a custom role becomes a custom script.
     */
    insertRoleIntoEdition(appRole, replaceAppId) {
      const list = this.collapseScript();
      const at = list.findIndex(
        (r) =>
          (replaceAppId && r.id === replaceAppId) ||
          (appRole.golemRoleId && r.golemRoleId === appRole.golemRoleId) ||
          r.id === appRole.id,
      );
      if (at > -1) list.splice(at, 1, appRole);
      else list.push(appRole);
      this.$store.commit("setCustomRoles", list);
      if (this.$store.state.edition.id !== "custom") {
        const meta = this.$store.state.edition;
        this.$store.commit("setEdition", {
          id: "custom",
          name: meta.name || "Custom script",
        });
      }
    },
    // ── Golem fork (FT-854): the workbench ───────────────────────────────
    /**
     * The current script, collapsed to its storable form: official roles as
     * {id} refs — CARRYING night-order overrides when they differ from the
     * base — custom roles whole minus the derived display field. One helper,
     * used by every mutation and by the vault save.
     */
    collapseScript(excludeAppId) {
      const base = this.$store.getters.rolesJSONbyId;
      const list = [];
      this.$store.state.roles.forEach((role) => {
        if (excludeAppId && role.id === excludeAppId) return;
        const b = base.get(role.id);
        if (b) {
          const ref = { id: role.id };
          if (role.firstNight !== b.firstNight)
            ref.firstNight = role.firstNight;
          if (role.otherNight !== b.otherNight)
            ref.otherNight = role.otherNight;
          list.push(ref);
        } else {
          const rest = { ...role };
          delete rest.imageAlt;
          // image is re-derived from golemIconData on load — one copy only
          if (rest.golemIconData) delete rest.image;
          list.push(rest);
        }
      });
      return list;
    },
    /**
     * setEdition (and friends) close the modal as a side effect — upstream's
     * flow ended there. The workbench keeps working, so re-open in place.
     */
    ensureOpen() {
      if (!this.$store.state.modals.edition)
        this.$store.commit("toggleModal", "edition");
      this.isCustom = true;
    },
    onScriptPick(card) {
      if (card.id === "__all") {
        // the whole book: every playable official (travellers stay town-side)
        const all = rolesJSON
          .filter((r) =>
            ["townsfolk", "outsider", "minion", "demon"].includes(
              normTeam(r.team),
            ),
          )
          .map((r) => ({ id: r.id }));
        this.$store.commit("setCustomRoles", all);
        this.$store.commit("setEdition", {
          id: "custom",
          name: "All of Blood on the Clocktower",
          logo: "__gold",
        });
        this.vaultSourceId = null;
        this.ensureOpen();
        this.setBaseline();
        return;
      }
      const edition = editionJSON.find((e) => e.id === card.id);
      if (edition) {
        this.$store.commit("setEdition", edition);
        this.vaultSourceId = null;
        this.ensureOpen();
        this.setBaseline();
      } else {
        this.loadFromVault(card.id).then(() => this.ensureOpen());
      }
    },
    /** New script: the overlay asks for a name (required) + icon (optional). */
    newScript() {
      this.nsError = "";
      this.nsIconSearch = "";
      this.newScriptForm = { name: "", icon: "" };
      this.$nextTick(() => this.$refs.nsName && this.$refs.nsName.focus());
    },
    async createNewScript() {
      const f = this.newScriptForm;
      if (!f) return;
      if (!f.name.trim()) {
        this.nsError = "A script needs a name.";
        return;
      }
      this.nsError = "";
      // the seed: script JSON, a share link, or a URL — empty = blank page
      const seed = (this.nsJsonText || "").trim();
      try {
        if (seed) {
          const linkId = vault.parseScriptRef(seed);
          if (linkId) {
            await this.loadFromVault(linkId); // keeps lineage: saving forks
          } else if (/^https?:\/\//i.test(seed)) {
            const res = await fetch(seed);
            this.parseRoles(await res.json());
            this.vaultSourceId = null;
          } else {
            this.parseRoles(JSON.parse(seed));
            this.vaultSourceId = null;
          }
        } else {
          this.$store.commit("setCustomRoles", []);
          this.vaultSourceId = null;
        }
      } catch (e) {
        this.nsError = "Couldn't read that seed: " + e.message;
        return;
      }
      this.$store.commit("setEdition", {
        id: "custom",
        name: f.name.trim(),
        // the icon rides the edition and persists through _meta on save
        logo: f.icon || undefined,
      });
      this.newScriptForm = null;
      this.nsJsonText = "";
      this.ensureOpen();
      this.setBaseline();
      flashHint(
        seed
          ? `${f.name.trim()} — seeded and ready`
          : `${f.name.trim()} — a blank page. Add roles from the shelf`,
      );
    },
    // ── dirty tracking (Save/Discard live in the meter, only when dirty) ─
    setBaseline() {
      this.scriptBaseline = this.currentScriptSnapshot;
    },
    /** Back to the last loaded/saved state. */
    discardEdits() {
      if (!this.scriptBaseline) return;
      const b = JSON.parse(this.scriptBaseline);
      if (b.e !== "custom") {
        const edition = editionJSON.find((x) => x.id === b.e);
        if (edition) this.$store.commit("setEdition", edition);
      } else {
        this.$store.commit("setCustomRoles", b.r);
        this.$store.commit("setEdition", {
          id: "custom",
          name: b.n,
          logo: b.l || undefined,
        });
      }
      this.ensureOpen();
      flashHint("Edits discarded");
    },
    /** The shelf hover card — RoleHoverCard pins itself beside the row and
     *  clamps to the viewport; all the shelf owns is which row. Hover only. */
    showRoleTip(e, entry) {
      if (!window.matchMedia("(hover: hover)").matches) return;
      this.roleTipAnchor = e.currentTarget;
      this.roleTip = entry;
    },
    hideRoleTip() {
      this.roleTip = null;
      this.roleTipAnchor = null;
    },
    /** Sidebar click: in the script → out; not in it → in. */
    async toggleRole(entry) {
      this.roleError = "";
      if (entry.official) {
        if (entry.inScript) this.removeRole(entry.id);
        else {
          this.insertRoleIntoEdition({ id: entry.id }, null);
          this.ensureOpen();
        }
        return;
      }
      // library entries: the script carries snapshots keyed by golemRoleId
      if (entry.inScript) {
        const role = this.scriptRoles.find(
          (r) => r.golemRoleId === entry.libId,
        );
        if (role) this.removeRole(role.id);
      } else {
        await this.addLibraryRole(entry.libId);
        this.ensureOpen();
      }
    },
    /** Remove one role from the current script (never blocks on composition). */
    removeRole(appId) {
      const list = this.collapseScript(appId);
      this.$store.commit("setCustomRoles", list);
      if (this.$store.state.edition.id !== "custom") {
        const meta = this.$store.state.edition;
        this.$store.commit("setEdition", {
          id: "custom",
          name: meta.name || "Custom script",
        });
      }
      this.ensureOpen();
    },
    /** Paste an official id or a Script-Tool role object → the forge fills
     *  itself; the user reviews, then saves as usual. */
    fillForgeFromJson() {
      this.roleError = "";
      const txt = (this.roleJsonText || "").trim();
      if (!txt) return;
      let parsed;
      try {
        parsed = JSON.parse(txt);
      } catch (e) {
        // a bare official id without quotes is a kindness worth extending
        parsed = txt;
      }
      if (Array.isArray(parsed)) parsed = parsed[0];
      const base = this.$store.getters.rolesJSONbyId;
      if (typeof parsed === "string") {
        const id = parsed.toLowerCase().replace(/[^a-z0-9]/g, "");
        const official = base.get(id);
        if (!official) {
          this.roleError = `No official role called ${JSON.stringify(
            parsed,
          )} — paste a role object for customs.`;
          return;
        }
        this.openRoleForm(official);
        return;
      }
      if (!parsed || typeof parsed !== "object") {
        this.roleError = "Paste one role as JSON.";
        return;
      }
      const f = this.roleForm;
      if (parsed.name) f.name = String(parsed.name).slice(0, 40);
      f.roleType = roleLib.roleTypeFromTeam(
        normTeam(parsed.team || parsed.roleType || "townsfolk"),
      );
      if (parsed.ability) f.ability = String(parsed.ability).slice(0, 600);
      f.firstNight = Math.abs(parsed.firstNight || 0);
      f.otherNight = Math.abs(parsed.otherNight || 0);
      f.reminders = (parsed.reminders || []).join(", ");
      f.setup = !!parsed.setup;
      this.roleJsonText = "";
    },
    // ── FT-857: the night-order drag lives in ScriptView; the WRITE stays
    //    here, where the store is owned. The view emits set-night with the
    //    already-computed midpoint (or 0 for "stops waking").
    onSetNight({ id, prop, value }) {
      this.setNight(id, prop, value);
    },
    /** Write one role's night number through the collapse (persists on the
     *  script entry — official refs carry it as an override). */
    setNight(appId, prop, value) {
      const list = this.collapseScript();
      const entry = list.find((r) => r.id === appId);
      if (!entry) return;
      entry[prop] = value;
      this.$store.commit("setCustomRoles", list);
      if (this.$store.state.edition.id !== "custom") {
        const meta = this.$store.state.edition;
        this.$store.commit("setEdition", {
          id: "custom",
          name: meta.name || "Custom script",
        });
      }
      this.ensureOpen();
    },
    // ── FT-854: the tri-state tag filter ─────────────────────────────────
    /** Everything provable about a shelf entry, as tag ids.
     *  FT-981: `allShelfEntries` calls this once per entry and keeps the
     *  result on `entry.tags`; every later caller reads that cache. */
    entryTags(entry) {
      if (entry.tags) return entry.tags;
      const tags = new Set(["team:" + entry.team]);
      if (entry.isLib) {
        tags.add(entry.mine ? "src:mine" : "src:lib");
      } else {
        if (["tb", "bmr", "snv"].includes(entry.edition))
          tags.add("src:" + entry.edition);
        else if (LUF_ROLES.has(entry.id)) tags.add("src:luf");
        else tags.add("src:exp");
        // FT-887: one definition of "wakes" (golem/nightInfo), so filtering
        // the shelf by "Wakes first night" returns exactly the characters
        // whose hover card carries that chip — Demons and Minions included,
        // whose night-one wake is the group step and not their own number.
        // Still exhaustive: every entry lands in exactly one of the three.
        const wakes = wakesOn(entry);
        if (wakes.first) tags.add("night:first");
        if (wakes.other) tags.add("night:other");
        if (!wakes.first && !wakes.other) tags.add("night:never");
        if (entry.setup) tags.add("flag:setup");
      }
      if (entry.inScript) tags.add("flag:inscript");
      return tags;
    },
    // ── FT-855: matchers ─────────────────────────────────────────────────
    /**
     * FT-981: NAME **AND** ABILITY, every token, in any order.
     *
     * It used to be `name.includes(query)` — one raw substring against one
     * field — and that is not how an author looks for a character. They think
     * in EFFECTS: "who poisons?", "who dies tonight?", "what nominates?".
     * Measured on the shipped build, `poison` returned the Poisoner and
     * nothing else — not Pukka, not the Vigormortis — `drunk` returned only
     * the Drunk, and `nominate` and `dies tonight` returned nothing at all.
     *
     * Tokens are ANDed, so word order stops mattering (`advocate devil` finds
     * the Devil's Advocate) and a two-word query can straddle the two fields
     * (`demon poison` finds the ability that does both). Both sides run
     * through `normalizeSearch`, which is what makes `devils advocate` and
     * `pit hag` findable.
     */
    matchesSearch(entry) {
      const tokens = this.searchTokens;
      if (!tokens.length) return true;
      const hay = entry.search || normalizeSearch(entry.name);
      return tokens.every((t) => hay.includes(t));
    },
    /** FT-981: 1 when every query token is in the NAME, 0 otherwise — the
     *  sort's "you probably meant this one" tier. 0 for everything when no
     *  query is set, which leaves the resting order alphabetical. */
    nameHitRank(entry) {
      const tokens = this.searchTokens;
      if (!tokens.length) return 0;
      const name = entry.searchName || normalizeSearch(entry.name);
      return tokens.every((t) => name.includes(t)) ? 1 : 0;
    },
    matchesTeams(entry) {
      if (this.teamState[entry.team] === -1) return false;
      const inc = Object.keys(this.teamState).filter(
        (t) => this.teamState[t] === 1,
      );
      return !inc.length || inc.includes(entry.team);
    },
    /** Pills: includes OR within a facet, AND across facets; every is-not
     *  pill excludes. excludeFacet skips one facet's pills (its own counts). */
    matchesPills(entry, excludeFacet) {
      const active = this.pills.filter((p) => p.facet !== excludeFacet);
      if (!active.length) return true;
      const tags = this.entryTags(entry);
      if (active.some((p) => p.not && tags.has(p.id))) return false;
      const facets = [
        ...new Set(active.filter((p) => !p.not).map((p) => p.facet)),
      ];
      return facets.every((f) =>
        active.some((p) => !p.not && p.facet === f && tags.has(p.id)),
      );
    },
    // ── FT-855: controls ─────────────────────────────────────────────────
    /** show only → hide → off, on the button itself (user call). Hiding
     *  ALL four teams is a dead end that reads as "no filter, no roles" —
     *  it auto-resets to neutral (everything shows). */
    toggleTeam(team) {
      const next = { ...this.teamState };
      if (next[team] === 1) next[team] = -1;
      else if (next[team] === -1) delete next[team];
      else next[team] = 1;
      const teams = ["townsfolk", "outsider", "minion", "demon"];
      if (teams.every((t) => next[t] === -1)) this.teamState = {};
      else this.teamState = next;
    },
    teamTitle(t) {
      const s = this.teamState[t.team];
      return (
        t.label +
        (s === 1
          ? " — showing only (click to hide)"
          : s === -1
          ? " — hidden (click to reset)"
          : " — click to show only")
      );
    },
    /**
     * Typing (debounced) asks the community library too — the Browse button
     * retired. (FT-1039: the filter box this used to be careful not to
     * auto-open dissolved into the always-visible chip rows.)
     */
    onSearchInput() {
      clearTimeout(this.__searchDebounce);
      this.__searchDebounce = setTimeout(() => {
        if (this.roleQuery.trim()) this.searchRoles();
        else this.roleResults = [];
      }, 400);
    },
    /** FT-981: the empty state's two ways out, each undoing only its own
     *  half — clearing a search must not silently drop the author's filters. */
    clearSearch() {
      this.roleQuery = "";
      this.roleResults = [];
      clearTimeout(this.__searchDebounce);
    },
    clearFilters() {
      this.pills = [];
      this.teamState = {};
    },
    pillFor(id) {
      return this.pills.find((p) => p.id === id) || null;
    },
    // ── FT-1039: the chip rows (pills stay the single truth underneath) ──
    /** 1 shown, -1 hidden, 0 neutral — the states the team row taught. */
    chipState(id) {
      const p = this.pillFor(id);
      return p ? (p.not ? -1 : 1) : 0;
    },
    chipClass(tag) {
      const s = this.chipState(tag.id);
      return {
        on: s === 1,
        exc: s === -1,
        zero: !s && this.countFor(tag) === 0,
      };
    },
    /** The FULL label lives here — the chip face wears a mark or one word. */
    chipTitle(tag) {
      const s = this.chipState(tag.id);
      return (
        tag.label +
        (s === 1
          ? " — showing only (click to hide)"
          : s === -1
          ? " — hidden (click to reset)"
          : "")
      );
    },
    chipWord(tag) {
      return CHIP_WORDS[tag.id] || tag.label;
    },
    /** An edition's mark, for the chips of the editions that have one. */
    editionMark(id) {
      return EDITION_ICONS[id.replace("src:", "")] || "";
    },
    nightMark(id) {
      if (id === "night:first") return moonFirst;
      if (id === "night:other") return moonOther;
      return "";
    },
    /** Multi-select rows cycle neutral → shown → hidden → neutral. */
    cycleChip(tag) {
      const existing = this.pillFor(tag.id);
      if (!existing)
        this.pills = [
          ...this.pills,
          { id: tag.id, facet: this.facetKeyOf(tag.id), not: false },
        ];
      else if (!existing.not)
        this.pills = this.pills.map((p) =>
          p === existing ? { ...p, not: true } : p,
        );
      else this.pills = this.pills.filter((p) => p !== existing);
    },
    /** The night row is a LENS — one at a time, click the lit one to clear. */
    toggleLens(tag) {
      const had = this.pillFor(tag.id);
      const rest = this.pills.filter((p) => p.facet !== "night");
      this.pills = had
        ? rest
        : [...rest, { id: tag.id, facet: "night", not: false }];
    },
    facetKeyOf(id) {
      const g = TAG_GROUPS.find((g) => g.tags.some((t) => t.id === id));
      return g ? g.key : "";
    },
    pillValueLabel(pill) {
      for (const g of TAG_GROUPS)
        for (const t of g.tags) if (t.id === pill.id) return t.label;
      return pill.id;
    },
    /** Live count for a facet value — read from the single-pass tally. */
    countFor(tag) {
      return this.facetCounts[tag.id] || 0;
    },
    /** A script logo: official role id, uploaded data URL, or the gold mark. */
    scriptLogoSrc(logo) {
      if (logo === "__gold") return goldLogo;
      return logo && logo.startsWith("data:") ? logo : this.iconUrl(logo);
    },
    onNsUpload(e) {
      const file = e.target.files && e.target.files[0];
      if (file) this.nsIntakeFile(file);
      e.target.value = "";
    },
    onNsDrop(e) {
      this.nsDragOver = false;
      const file =
        e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) this.nsIntakeFile(file);
    },
    /** Downscale any dropped/uploaded image into a 128px data URL — small
     *  enough to travel inside the script's _meta — and run the FT-856
     *  stylizer over it. Inked is the default; Original stays a click away. */
    nsIntakeFile(file) {
      if (!/^image\//.test(file.type)) {
        this.nsError = "That file isn't an image.";
        return;
      }
      this.nsError = "";
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = async () => {
          const SIZE = 128;
          const canvas = document.createElement("canvas");
          canvas.width = SIZE;
          canvas.height = SIZE;
          const g = canvas.getContext("2d");
          const scale = Math.min(SIZE / img.width, SIZE / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          g.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
          if (!this.newScriptForm) return;
          const original = canvas.toDataURL("image/png");
          this.$set(this.newScriptForm, "iconOriginal", original);
          let styled = "";
          try {
            // stylize from the FULL-RES source, not the 128 downscale
            styled = await stylizeIcon(reader.result, { tint: "neutral" });
          } catch (e) {
            styled = "";
          }
          this.$set(this.newScriptForm, "iconStyled", styled);
          this.$set(this.newScriptForm, "icon", styled || original);
        };
        img.onerror = () => (this.nsError = "Could not read that image.");
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    },
    /** Put the fillable role template on the clipboard. */
    async copyRoleTemplate() {
      const text = JSON.stringify(ROLE_TEMPLATE, null, 2);
      try {
        await navigator.clipboard.writeText(text);
        flashHint("Role template copied — fill it in and paste it back");
      } catch (e) {
        this.roleJsonText = text;
        flashHint("Clipboard blocked — template dropped into the box instead");
      }
    },
    // FT-857: roleIconUrl moved into ScriptView with the cards it paints.
    /**
     * Mark (or clear) a vault script's non-conforming flag — DERIVED from the
     * meter at load/save time, stored so the selector can badge without
     * fetching. Marking is the whole enforcement: play proceeds regardless.
     */
    markNC(scriptId) {
      if (!scriptId) return;
      const nc = !this.servableCounts.length;
      const map = { ...this.ncMap };
      if (nc) map[scriptId] = true;
      else delete map[scriptId];
      this.ncMap = map;
      localStorage.setItem("golem.scriptNC", JSON.stringify(map));
    },
    // ── upstream methods ─────────────────────────────────────────────────
    openUpload() {
      this.$refs.upload.click();
    },
    handleUpload() {
      const file = this.$refs.upload.files[0];
      if (file && file.size) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          // inside the New-script overlay the upload SEEDS the paste box
          // (Create applies it); elsewhere it loads directly, as ever
          if (this.newScriptForm) {
            this.nsJsonText = String(reader.result);
          } else {
            try {
              this.parseRoles(JSON.parse(reader.result));
            } catch (e) {
              alert("Error reading custom script: " + e.message);
            }
          }
          this.$refs.upload.value = "";
        });
        reader.readAsText(file);
      }
    },
    promptURL() {
      this.openAsk({
        title: "Load a script from the web",
        label: "URL to a custom-script.json file",
        placeholder: "https://…/custom-script.json",
        okText: "Load",
        onOk: (url) => {
          this.handleURL(url);
        },
      });
    },
    async handleURL(url) {
      const res = await fetch(url);
      if (res && res.json) {
        try {
          const script = await res.json();
          this.parseRoles(script);
        } catch (e) {
          alert("Error loading custom script: " + e.message);
        }
      }
    },
    async readFromClipboard() {
      const text = await navigator.clipboard.readText();
      try {
        const roles = JSON.parse(text);
        this.parseRoles(roles);
      } catch (e) {
        alert("Error reading custom script: " + e.message);
      }
    },
    parseRoles(roles) {
      if (!roles || !roles.length) return;
      // captured BEFORE the commits below auto-close the modal — a silent
      // ?script= arrival (modal never open) must stay silent
      const wasOpen = this.$store.state.modals.edition;
      roles = roles.map((role) =>
        typeof role === "string" ? { id: role } : role,
      );
      const metaIndex = roles.findIndex(({ id }) => id === "_meta");
      let meta = {};
      if (metaIndex > -1) {
        meta = roles.splice(metaIndex, 1).pop();
      }
      this.$store.commit("setCustomRoles", roles);
      this.$store.commit(
        "setEdition",
        Object.assign({}, meta, { id: "custom" }),
      );
      // check for fabled and set those too, if present
      if (roles.some((role) => this.$store.state.fabled.has(role.id || role))) {
        const fabled = [];
        roles.forEach((role) => {
          if (this.$store.state.fabled.has(role.id || role)) {
            fabled.push(this.$store.state.fabled.get(role.id || role));
          }
        });
        this.$store.commit("players/setFabled", { fabled });
      }
      // Golem fork (FT-854): loading a script LANDS IN the workbench (the
      // setEdition side effect above closed the modal; upstream also bounced
      // back to the tiles). A silent ?script= auto-load — modal never open —
      // stays silent. A parsed load is pristine until edited.
      if (wasOpen) this.ensureOpen();
      this.setBaseline();
    },
    ...mapMutations(["toggleModal", "setEdition"]),
  },
};
</script>

<style scoped lang="scss">
// FT-981: the shared control tokens, for $grimoire-plum — the grimoire cover's
// own darkest purple, worn here by the bench's two + buttons. Variables and
// mixins only, so importing it adds no rules to this sheet.
@import "../../controls.scss";
// Golem fork: the title's blood drop-cap — em sizes baked from the asset
// metrics, same conversion as the Intro doors.
.almanac-title {
  font-size: 140%;
  .blood-cap-a {
    width: 0.805em;
    height: 0.927em;
    vertical-align: -0.124em;
  }
}

ul.editions .edition {
  font-family: PiratesBay, sans-serif;
  letter-spacing: 1px;
  text-align: center;
  padding-top: 15%;
  background-position: center center;
  background-size: 100% auto;
  background-repeat: no-repeat;
  width: 30%;
  margin: 5px;
  font-size: 120%;
  text-shadow:
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000,
    0 0 5px rgba(0, 0, 0, 0.75);
  cursor: pointer;
  &:hover {
    color: red;
  }
}

.custom {
  text-align: center;
  input[type="file"] {
    display: none;
  }
  .scripts {
    list-style-type: disc;
    font-size: 120%;
    cursor: pointer;
    display: block;
    width: 50%;
    text-align: left;
    margin: 10px auto;
    li:hover {
      color: red;
    }
  }
}

// Golem fork (FT-851): the custom-role form + library browser.
.role-form,
.role-library {
  input:not([type="checkbox"]),
  select,
  textarea {
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: 1px solid #666;
    border-radius: 4px;
    padding: 4px 6px;
    margin: 3px;
    font-size: 14px;
    font-family: inherit;
  }
  .row {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
  }
  textarea,
  input.wide {
    width: 70%;
  }
  input[type="number"] {
    width: 60px;
  }
}
.role-form .nights small {
  opacity: 0.6;
  margin-left: 6px;
}
.icon-picker {
  margin: 5px auto;
  .icon-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    max-height: 150px;
    overflow-y: auto;
    margin: 5px auto;
    width: 90%;
    border: 1px solid #444;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.3);
  }
  .icon-cell {
    width: 72px;
    padding: 4px 0;
    cursor: pointer;
    border-radius: 6px;
    .icon {
      display: block;
      width: 40px;
      height: 40px;
      margin: 0 auto;
      background-size: cover;
      background-position: center;
    }
    .label {
      display: block;
      font-size: 10px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 3px;
    }
    &:hover {
      background: rgba(255, 0, 0, 0.25);
    }
    &.selected {
      outline: 2px solid red;
    }
  }
}
.role-error {
  color: #ff6b6b;
  margin: 5px;
  font-weight: bold;
}

// ── Golem fork (FT-854): the workbench ─────────────────────────────────
$team-colors: (
  "townsfolk": #1f65ff,
  "outsider": #46d5ff,
  "minion": #ff6900,
  "demon": #ce0100,
  "traveler": #cc04ff,
);

// FT-856 slice B: the icon tabs + library browser
.role-form .icon-picker {
  .ip-tabs {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 4px;
    .wb-tab {
      padding: 3px 12px;
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.75);
      font-size: 13px;
      &.active {
        border-color: #a01414;
        background: rgba(160, 20, 20, 0.14);
        color: white;
      }
    }
    .ip-current {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      img {
        width: 34px;
        height: 34px;
      }
      .ip-reroll {
        cursor: pointer;
        opacity: 0.7;
        font-size: 12px;
        &:hover {
          opacity: 1;
          color: #ff6b6b;
        }
      }
    }
  }
  .il-head {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
    input {
      width: 180px;
    }
  }
  .il-chip {
    padding: 2px 9px;
    border: 1px solid #3d3d3d;
    border-radius: 10px;
    font-size: 12px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7);
    &.on {
      border-color: #a01414;
      background: rgba(160, 20, 20, 0.14);
      color: white;
    }
  }
  .il-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 4px 0;
    // the slot NEVER collapses — a hover swap repaints in place
    height: 68px;
    img {
      width: 64px;
      height: 64px;
    }
    .label {
      font-size: 13px;
      text-transform: capitalize;
      opacity: 0.85;
    }
    .il-empty {
      font-size: 12px;
      opacity: 0.45;
      font-style: italic;
    }
  }
  .il-grid {
    .il-thumb {
      width: 40px;
      height: 40px;
      opacity: 0.9;
    }
    .icon-cell.selected {
      outline: 1px solid #a01414;
      background: rgba(160, 20, 20, 0.14);
    }
    .il-more {
      width: 100%;
      padding: 6px;
      font-size: 12px;
      opacity: 0.6;
    }
  }
  .il-loading {
    padding: 12px;
    opacity: 0.7;
  }
}

// FT-1040: the forge speaks chips — the FT-1039 idiom (one plate for grouped
// cells, standalone chips beside it, the shared lit state), scoped to the
// forge overlay. The checkboxes these replace were retired by the same pass.
.role-form .wakes-block {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 7px;
  margin: 6px 0;
  .wakes-title {
    font-weight: bold;
  }
}
// one plate, cells inside — the workbench night lens's own construction
.role-form .forge-seg {
  display: inline-flex;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  overflow: hidden;
  .forge-cell {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 11px;
    background: transparent;
    border: 0;
    border-right: 1px solid $control-divider;
    color: rgba(255, 255, 255, 0.75);
    font-family: inherit;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    &:last-child {
      border-right: 0;
    }
    .moon {
      width: 14px;
      height: 14px;
      object-fit: contain;
      opacity: 0.9;
    }
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    &:focus-visible {
      @include control-focus-ring;
    }
    &.on {
      background: $control-on-bg;
      color: $control-on-color;
    }
  }
}
// a standalone chip — the workbench facet chip's plate and lit state
.role-form .forge-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid #3d3d3d;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.75);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  &:hover {
    border-color: #666;
  }
  &:focus-visible {
    @include control-focus-ring;
  }
  &.on {
    border-color: $control-on-edge;
    background: $control-on-bg;
    color: $control-on-color;
  }
}
// FT-1040: the night action composer — visible only while a wakes chip is lit
.role-form .night-composer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 2px 0 8px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid #2c2c2c;
  border-radius: 8px;
  .nc-title {
    font-size: 13px;
    opacity: 0.8;
  }
  .nc-shapes {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
  }
  .nc-dials {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .row {
    width: 100%;
    margin: 0;
  }
}
// FT-1040: reminder tokens as pills — type + Enter mints one, click removes
.role-form .rem-row .rem-pills {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  width: 100%;
  .rem-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 9px;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid #3d3d3d;
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.85);
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
    .rem-x {
      opacity: 0.6;
    }
    &:hover {
      border-color: #a01414;
      .rem-x {
        color: #ff8a8a;
        opacity: 1;
      }
    }
    &:focus-visible {
      @include control-focus-ring;
    }
  }
  .rem-input {
    flex: 1;
    min-width: 150px;
  }
}
// the forge's team choice wears the workbench toggle look, not a native select
.role-form .team-pick {
  gap: 6px;
  .team-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid #3d3d3d;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    text-transform: capitalize;
    svg {
      width: 14px;
      height: 14px;
    }
    .demon-glyph {
      // width AND height so every button matches — object-fit keeps the wide
      // townsfolk art (160×96) letterboxed instead of squeezed square (the
      // count-icon idiom; user report, FT-1040 rider)
      width: 15px;
      height: 15px;
      object-fit: contain;
    }
    &:not(.on) .demon-glyph {
      filter: grayscale(1) brightness(1.35);
      opacity: 0.75;
    }
    &:hover {
      border-color: #666;
    }
    @each $team, $color in $team-colors {
      &.team-#{$team}.on {
        border-color: $color;
        background: rgba($color, 0.16);
        color: lighten($color, 22%);
      }
    }
  }
}

.custom.workbench {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  text-align: left;

  // The + buttons: square, icon-only, the book's purple on hover.
  // `.button.wb-plus`, not `.wb-plus`: the workbench's own `.button:hover`
  // (further down this sheet) paints every button #ff7070, and at equal
  // specificity the later rule won — which is why the plus kept flashing red
  // on hover whatever its own rule said. Three classes beats two.
  .button.wb-plus {
    // FT-981 (user call): THE GRIMOIRE'S DARKEST PLUM, glyph and edge both.
    //
    // It rested on rgb(120, 105, 135) — RoleDrawer's lighter control purple —
    // over the shared button's grey #3d3d3d edge, which read as a grey box
    // with a lavender plus in it rather than as one purple control. Taking
    // $grimoire-plum for BOTH is what makes it one object, and it is the exact
    // value the grimoire drawer's cover edge wears.
    //
    // Measured at the size it actually renders (26x26, 15px glyph) on the
    // near-black this bench composites, rgb(1,1,1): the plum ink is 1.98:1,
    // under WCAG's 3:1 for a graphical object. Kept anyway, with eyes open —
    // see $grimoire-plum's own note. The plus is a thick, unmistakable shape,
    // the matching edge doubles the cue, and hover goes to 6.07:1, so the
    // control announces itself the moment it is approached. In the team row it
    // sits beside four grey-edged toggles and is the only purple thing there,
    // which is the reading that matters: the one ACTION among the filters.
    padding: 0 !important;
    width: 26px;
    height: 26px;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    color: $grimoire-plum;
    border-color: $grimoire-plum;
    svg {
      width: 15px;
      height: 15px;
      display: block;
      margin: 0;
    }
    // the edge follows the glyph — the shared button hover reddens it too
    &:hover {
      color: rgb(150, 130, 175);
      border-color: rgba(150, 130, 175, 0.85);
    }
  }
  // FT-970: delete-for-everyone, sitting beside the plus in the same 26px
  // square. It is the ONE control on this bench that wears blood at rest:
  // the plus makes a script, this ends one for everybody who has the link,
  // and the pair must not read as two shades of the same act. Three classes
  // for the same specificity reason the plus documents above.
  .button.wb-destroy {
    padding: 0 !important;
    width: 26px;
    height: 26px;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    color: rgba(200, 70, 70, 0.75);
    svg {
      width: 14px;
      height: 14px;
      display: block;
      margin: 0;
    }
    &:hover {
      color: #ff7070;
      border-color: #a01414;
      background: rgba(160, 20, 20, 0.28);
    }
  }
  .ns-start {
    margin-bottom: 10px;
    label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.6;
      margin-bottom: 4px;
    }
    .ns-start-row {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      textarea {
        flex-grow: 1;
        margin: 0;
        width: auto;
      }
      .button {
        flex-shrink: 0;
      }
    }
  }
  .ns-export {
    margin-right: auto;
    align-self: center;
    font-size: 12px;
    opacity: 0.7;
    cursor: pointer;
    text-decoration: underline dotted;
    &:hover {
      color: #ff8a8a;
      opacity: 1;
    }
  }
  .wb-forge-paste {
    flex-direction: column;
    gap: 4px;
    textarea {
      width: 90% !important;
    }
    .paste-acts {
      display: flex;
      gap: 6px;
      justify-content: center;
    }
  }

  // Our buttons, not upstream's shiny pills: small, flat, dark, hairline.
  // Pixel-sized — the app's base font is viewport-huge, so percentages lie.
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
    &:before,
    &:after {
      content: none;
    }
    &:hover {
      border-color: #a01414;
      color: #ff7070;
    }
  }

  .wb-top {
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    // The title, centered, alone on its line (the shell's close × is the
    // only other thing at this height).
    .wb-row1 {
      display: flex;
      justify-content: center;
      .almanac-title {
        margin: 0;
      }
    }
    // the picker sits CENTERED under the title (user call); the actions
    // keep the right flank — a 1fr/auto/1fr grid holds the center true
    .wb-row2 {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 6px 10px;
      .wb-script-picker {
        grid-column: 2;
        width: 300px;
      }
      .wb-actions {
        // hug the selector, not the far edge (user call)
        grid-column: 3;
        justify-self: start;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        gap: 4px;
      }
    }
  }

  .wb-import-role {
    width: 100%;
    display: flex;
    gap: 8px;
    align-items: flex-start;
    textarea {
      flex-grow: 1;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: 1px solid #666;
      border-radius: 4px;
      padding: 4px 6px;
      font-family: inherit;
    }
    .button {
      margin: 0;
      flex-shrink: 0;
    }
  }

  .wb-body {
    display: flex;
    flex-grow: 1;
    min-height: 0;
    gap: 14px;
    padding-top: 8px;
  }

  // ── the small-screen stand-in (see SMALL_BENCH in the script) ───────────
  // Not a stripped-down bench: a short note, the loaded script, and a way
  // out. The picker above it is still live, which is the whole reason this
  // is a note inside the modal rather than a modal that refuses to open.
  .wb-small {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    padding: 18px 6px 8px;
    text-align: center;

    // a landscape phone gives the modal 345px; the note tightens to fit it
    // rather than leaning on the slot's scroll for its own Close button
    @media (max-height: 519px) {
      gap: 5px;
      padding: 6px 6px 4px;
      .ws-body {
        font-size: 82%;
      }
      .ws-note {
        display: none;
      }
    }

    .ws-lead {
      font-family: PiratesBay, sans-serif;
      letter-spacing: 1px;
      font-size: 118%;
      margin: 0;
      color: #d8cdb4;
    }
    .ws-body,
    .ws-note {
      margin: 0;
      max-width: 34em;
      font-size: 88%;
      line-height: 1.45;
      opacity: 0.72;
    }
    .ws-note {
      font-size: 82%;
      opacity: 0.55;
    }

    .ws-loaded {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      margin-top: 4px;
      .ws-mark {
        width: 34px;
        height: 34px;
        object-fit: contain;
      }
      .ws-name {
        font-family: PiratesBay, sans-serif;
        letter-spacing: 1px;
        font-size: 108%;
      }
    }

    .ws-counts {
      display: flex;
      gap: 10px;
    }
    .ws-count {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 92%;
      opacity: 0.85;
      img,
      svg {
        width: 16px;
        height: 16px;
        object-fit: contain;
      }
      @each $team, $color in $team-colors {
        &.team-#{$team} {
          color: $color;
        }
      }
    }
    .ws-serves {
      margin: 0;
      font-size: 84%;
      opacity: 0.6;
    }

    // The shell's × is a 30px glyph in the corner — fine for a cursor, thin
    // for a thumb. The note carries its own way out at full tap size.
    .ws-close {
      margin-top: 6px;
      min-height: 44px;
      padding: 0 26px;
      font-family: PiratesBay, sans-serif;
      letter-spacing: 1px;
      font-size: 100%;
      color: white;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid #3d3d3d;
      border-radius: 7px;
      cursor: pointer;
      &:hover,
      &:focus-visible {
        outline: none;
        border-color: #a01414;
        color: #ff8a8a;
      }
    }
  }

  .wb-sidebar {
    width: 270px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    // FT-1039: the search field — the tally rides inside it (feedback on
    // the search), the ✕ beside the tally when there is anything to clear.
    .wb-searchwrap {
      display: flex;
      flex: none; // the role LIST is the shrink region, never the controls
      align-items: center;
      gap: 4px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #666;
      border-radius: 4px;
      padding: 0 6px;
      margin-bottom: 6px;
      &:focus-within {
        border-color: $control-focus;
      }
      .wb-search {
        flex: 1 1 auto;
        min-width: 0;
        background: transparent;
        border: 0;
        color: white;
        padding: 4px 0;
        font-family: inherit;
        &:focus {
          outline: none;
        }
      }
      .ws-tally {
        flex-shrink: 0;
        font-size: 11px;
        opacity: 0.55;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      .ws-clear {
        flex-shrink: 0;
        background: none;
        border: 0;
        color: rgba(255, 255, 255, 0.6);
        font-size: 15px;
        line-height: 1;
        padding: 0 2px;
        cursor: pointer;
        &:hover {
          color: #ff8a8a;
        }
        &:focus-visible {
          @include control-focus-ring;
        }
      }
    }
    // FT-1039: the facet CHIP ROWS — the fold dissolved; the facets stand in
    // the open and answer in the states the team row taught: lit when shown,
    // dimmed behind a blood hairline when hidden, greyed at zero.
    .wb-chips {
      display: flex;
      flex: none;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 5px;
    }
    .wb-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.75);
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
      .mark {
        width: 15px;
        height: 15px;
        object-fit: contain;
      }
      &:hover {
        border-color: #666;
      }
      &:focus-visible {
        @include control-focus-ring;
      }
      &.on {
        border-color: $control-on-edge;
      }
      &.exc {
        border-color: #7d0e0e;
      }
    }
    // one plate, cells inside — the night lens and the special flags
    .wb-seg {
      display: flex;
      flex: none;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 5px;
      .wb-cell {
        flex: 1 1 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 3px 4px;
        background: transparent;
        border: 0;
        border-right: 1px solid $control-divider;
        color: rgba(255, 255, 255, 0.75);
        font-family: inherit;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
        &:last-child {
          border-right: 0;
        }
        .moon {
          width: 13px;
          height: 13px;
          object-fit: contain;
          opacity: 0.9;
        }
        &:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        &:focus-visible {
          @include control-focus-ring;
        }
      }
    }
    // the shared states — a chip and a cell answer alike
    .wb-chip,
    .wb-cell {
      .cnt {
        font-size: 11px;
        opacity: 0.7;
      }
      &.on {
        background: $control-on-bg;
        color: $control-on-color;
        .cnt {
          opacity: 1;
          font-weight: bold;
        }
      }
      &.exc {
        opacity: 0.45;
        .cnt {
          text-decoration: line-through;
        }
      }
      &.zero {
        opacity: 0.35;
      }
    }
    // FT-855: the team icon row — on/off toggles with live counts.
    .wb-team-row {
      display: flex;
      gap: 5px;
      margin: 7px 0 5px;
      .wb-team-toggle {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        padding: 5px 0 3px;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid #3d3d3d;
        border-radius: 6px;
        color: rgba(255, 255, 255, 0.75);
        cursor: pointer;
        font-family: inherit;
        svg {
          width: 16px;
          height: 16px;
        }
        .demon-glyph {
          width: 17px;
          height: 17px;
          // the wide townsfolk art keeps its ratio (FT-1040 rider) — the
          // same fix RoleDrawer's copy of this rule already carries
          object-fit: contain;
        }
        // img glyphs can't inherit the grey text color — grey them by hand
        // whenever the team isn't the active "show only" pick
        &:not(.on) .demon-glyph {
          filter: grayscale(1) brightness(1.35);
          opacity: 0.75;
        }
        .cnt {
          font-size: 12px;
          opacity: 0.7;
        }
        &:hover {
          border-color: #666;
        }
        @each $team, $color in $team-colors {
          &.team-#{$team}.on {
            border-color: $color;
            background: rgba($color, 0.16);
            color: lighten($color, 22%);
            .cnt {
              opacity: 1;
              font-weight: bold;
            }
          }
        }
        // hidden: dimmed behind a blood hairline, count struck through
        &.exc {
          border-color: #7d0e0e;
          opacity: 0.45;
          .cnt {
            text-decoration: line-through;
          }
        }
      }
    }
    .wb-all-roles {
      flex-grow: 1;
      overflow-y: auto;
      display: block;
      min-height: 0;
      // FT-1039: the modal's upstream flex rules leave align-content:center
      // on this ul, and block layout HONORS align-content now (Chrome 123+)
      // — a short filtered list was floating vertically centered in the rail.
      align-content: start;
      // FT-981: the nothing-matched panel. Written BEFORE the generic `li`
      // below so the row rules that follow (flex, pointer, the team stripe)
      // still win where they should — this one opts out of all three: it is
      // not a role, not clickable, and belongs to no team.
      li.wb-none {
        display: block;
        cursor: default;
        border-left: none;
        border-radius: 0;
        padding: 14px 10px;
        text-align: center;
        &:hover {
          background: none;
        }
        .wn-lead {
          margin: 0;
          font-size: 13px;
          line-height: 1.45;
          opacity: 0.75;
        }
        .wn-outs {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px;
          margin-top: 10px;
        }
        .wn-out {
          font-family: inherit;
          font-size: 12px;
          padding: 3px 10px;
          color: #d8cdb4;
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid $grimoire-plum;
          border-radius: 4px;
          cursor: pointer;
          &:hover {
            color: #fff;
            border-color: $control-edge-hover;
            background: $control-bg-hover;
          }
        }
        .wn-aside {
          margin: 10px 0 0;
          font-size: 11px;
          line-height: 1.4;
          opacity: 0.5;
        }
      }
      li.wb-shelf-head {
        position: sticky;
        top: 0;
        z-index: 2;
        background: rgba(8, 8, 12, 0.95);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        opacity: 0.75;
        padding: 4px 6px 2px;
        cursor: default;
        border-left: none;
        border-radius: 0;
        &:hover {
          background: rgba(8, 8, 12, 0.95);
        }
        small {
          opacity: 0.6;
          letter-spacing: 0;
        }
      }
      li {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 6px;
        cursor: pointer;
        // square left corner, thin team stripe (user call)
        border-radius: 0 4px 4px 0;
        border-left: 2px solid transparent;
        @each $team, $color in $team-colors {
          &.team-#{$team} {
            border-left-color: rgba($color, 0.65);
          }
        }
        &:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .icon {
          width: 26px;
          height: 26px;
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
        }
        .wb-role-name {
          flex-grow: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        small {
          color: rgba(255, 255, 255, 0.45);
        }
        .wb-in {
          color: #7ed67e;
          font-weight: bold;
        }
      }
    }
    .button-group {
      margin-top: 6px;
    }
  }

  // The forge floats over the workbench instead of replacing it — wearing
  // the WORKBENCH's chrome (dark, blood hairline), not upstream's white box.
  .role-form {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    background: rgba(8, 8, 10, 0.97);
    border: 1px solid #4a0d0d;
    border-radius: 10px;
    padding: 14px 18px 18px;
    z-index: 30;
    width: min(680px, 92%);
    max-height: 88%;
    overflow-y: auto;
    text-align: center;
    box-shadow: 0 10px 50px #000;
    .forge-title {
      margin: 0 0 8px;
      font-size: 26px;
    }
    // Save/Discard ride the top right, staying put while the form scrolls
    .forge-acts {
      position: sticky;
      top: 0;
      z-index: 6;
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      height: 0;
      margin: 0;
      overflow: visible;
      .button {
        margin: 0;
      }
    }
  }

  // the "name your copy" panel — one field, so it stays narrow and reads as
  // a question rather than a form.
  .fork-form {
    width: min(460px, 92%);
    text-align: left;
    h3 {
      margin: 0 0 8px;
      font-size: 22px;
    }
    .fk-note {
      margin: 0 0 12px;
      font-size: 13px;
      line-height: 1.45;
      opacity: 0.7;
      strong {
        opacity: 1;
      }
    }
    label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.6;
      margin-bottom: 4px;
    }
    .fk-name {
      width: 100%;
      font-size: 17px;
      padding: 7px 12px;
      margin: 0;
    }
    .role-error {
      margin: 8px 0 0;
      font-size: 13px;
    }
    .fk-fix {
      display: inline-block;
      margin-left: 6px;
      font-weight: normal;
      color: rgb(150, 130, 175);
      text-decoration: underline;
      cursor: pointer;
      &:hover {
        color: #fff;
      }
    }
    .fk-acts {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 14px;
      .button {
        margin: 0;
      }
      // the fork itself wears the book's purple, not the blood
      .fk-go {
        border-color: rgba(150, 130, 175, 0.85);
        background: rgba(120, 105, 135, 0.42);
        &:hover {
          background: rgba(150, 130, 175, 0.55);
          color: white;
        }
      }
      // ...and the delete wears the blood, overriding it (FT-970). The purple
      // means "this makes something"; nothing on this bench should be able to
      // destroy a script for other people while wearing the constructive
      // colour. Same shape, opposite signal — Menu's own danger button is the
      // reference, down to the #a01414 edge.
      .fk-go.destroy-go {
        border-color: #a01414;
        background: rgba(160, 20, 20, 0.32);
        color: #ff9a9a;
        &:hover {
          background: rgba(160, 20, 20, 0.55);
          color: white;
        }
      }
    }
  }

  // FT-970: the delete confirm's own heading goes blood, so the panel is
  // recognisable as the dangerous one before any of its words are read.
  .destroy-form h3 {
    color: #ff9a9a;
  }

  // FT-854 r9: the New-script overlay, rebuilt around the icon WELL.
  .ns-form {
    width: min(760px, 94%);
    text-align: left;
    display: flex;
    flex-direction: column;
    h3 {
      text-align: center;
      margin: 0 0 12px;
    }
    .ns-head {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }
    .ns-drop {
      position: relative;
      width: 104px;
      height: 104px;
      flex-shrink: 0;
      border: 2px dashed #555;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      background-origin: content-box;
      padding: 6px;
      transition:
        border-color 150ms,
        background-color 150ms;
      .hint {
        font-size: 12px;
        opacity: 0.55;
        text-align: center;
        line-height: 1.4;
      }
      .ns-clear {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 20px;
        height: 20px;
        line-height: 18px;
        text-align: center;
        border-radius: 50%;
        background: #000;
        border: 1px solid #7d0e0e;
        color: #d42020;
        font-weight: bold;
        &:hover {
          color: red;
          border-color: red;
        }
      }
      &.has {
        border-style: solid;
        border-color: #7d0e0e;
      }
      &.dragover,
      &:hover {
        border-color: #d42020;
        background-color: rgba(160, 20, 20, 0.12);
      }
    }
    .ns-fields {
      flex-grow: 1;
      label {
        display: block;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        opacity: 0.6;
        margin-bottom: 4px;
      }
      .ns-name {
        width: 100%;
        font-size: 17px;
        padding: 7px 12px;
        margin: 0;
      }
      .ns-note {
        display: block;
        margin-top: 6px;
        font-size: 12px;
        opacity: 0.55;
      }
      .ns-style-toggle {
        display: inline-flex;
        margin-top: 8px;
        border: 1px solid #3d3d3d;
        border-radius: 6px;
        overflow: hidden;
        font-size: 13px;
        span {
          padding: 2px 12px;
          cursor: pointer;
          &.on {
            background: rgba(160, 20, 20, 0.45);
            font-weight: bold;
          }
          &:not(.on):hover {
            background: rgba(255, 255, 255, 0.08);
          }
        }
      }
    }
    .ns-upload {
      display: none;
    }
    .ns-browse {
      .ns-search {
        width: 100%;
        margin: 0 0 6px;
      }
      .ns-grid {
        max-height: 300px;
        width: 100%;
        margin: 0;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
        .icon-cell {
          width: auto;
          .icon {
            width: 48px;
            height: 48px;
          }
        }
      }
    }
    .ns-acts {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
      .ns-create {
        border-color: #a01414;
        background: rgba(160, 20, 20, 0.35);
        &:hover {
          background: rgba(160, 20, 20, 0.55);
          color: white;
        }
      }
    }
  }

  // FT-858: the shelf's hover card — icon left, bold name, ability body,
  // team-coloured border — moved WHOLESALE into RoleHoverCard.vue, which the
  // seats and the grimoire drawer now render too. Its rule had to leave this
  // block as well as this file: the card parks itself on document.body, and a
  // rule nested under a consumer's root selector stops matching the moment it
  // does (the ScriptPicker tooltip's bug, verbatim).

  .wb-error {
    position: absolute;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    padding: 4px 14px;
    border-radius: 6px;
    z-index: 40;
  }
}
</style>
