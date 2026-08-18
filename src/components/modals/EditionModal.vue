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
          <ScriptPicker
            class="wb-script-picker"
            :cards="wbScriptCards"
            :picked-id="wbPickedId"
            @pick="onScriptPick"
          />
          <!-- ONE plus (user call): everything script-creation lives in the
               New-script overlay it opens — name, icon, and a paste/upload
               seed. -->
          <div class="wb-actions">
            <div class="button wb-plus" title="New script" @click="newScript">
              <font-awesome-icon icon="plus-circle" />
            </div>
          </div>
        </div>
      </div>

      <div class="wb-body">
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
                { on: teamState[t.team] === 1, exc: teamState[t.team] === -1 }
              ]"
              :title="teamTitle(t)"
              @click="toggleTeam(t.team)"
            >
              <img
                v-if="t.team === 'demon'"
                class="demon-glyph"
                :src="demonGlyph"
                alt=""
              />
              <img
                v-else-if="t.team === 'outsider'"
                class="demon-glyph"
                :src="outsiderGlyph"
                alt=""
              />
              <font-awesome-icon v-else :icon="t.icon" />
              <span class="cnt">{{ t.count }}</span>
            </button>
            <div class="button wb-plus" title="New role" @click="openRoleForm()">
              <font-awesome-icon icon="plus-circle" />
            </div>
          </div>
          <!-- FT-855 r2: the FILTER BOX — its header row is the collapsible's
               header (Filter · search · chevron far right). Typing opens the
               box and narrows the facet values; groups open independently,
               chevrons on their right. -->
          <div class="wb-filterbox" :class="{ open: filterOpen }">
            <div class="fb-head" @click="filterOpen = !filterOpen">
              <input
                v-model="roleQuery"
                class="wb-search"
                placeholder="Search every role…"
                @click.stop
                @input="onSearchInput"
                @keyup.enter="searchRoles"
              />
              <span class="fb-title">Filter</span>
              <font-awesome-icon
                icon="chevron-down"
                class="caret"
                :class="{ open: filterOpen }"
              />
            </div>
            <div class="fb-body" v-if="filterOpen" v-blood-scroll>
              <div
                class="facet-group"
                v-for="facet in facetList"
                :key="facet.key"
                v-show="!searchActive || facetTagsFiltered(facet).length"
              >
                <h5
                  class="facet-head"
                  :class="{ open: facetShowing(facet) }"
                  @click="toggleFacetOpen(facet.key)"
                >
                  <span class="fh-label">
                    {{ facet.label }}
                    <em v-if="pillCountIn(facet.key)">{{ pillCountIn(facet.key) }}</em>
                  </span>
                  <font-awesome-icon icon="chevron-down" class="caret" />
                </h5>
                <template v-if="facetShowing(facet)">
                  <div
                    class="facet-val"
                    v-for="tag in facetTagsFiltered(facet)"
                    :key="tag.id"
                    :class="{ zero: countFor(tag) === 0, active: !!pillFor(tag.id) }"
                    @click="togglePillValue(tag)"
                  >
                    <span class="vlabel">
                      {{ tag.label }}
                      <em v-if="pillFor(tag.id)">{{
                        pillFor(tag.id).not ? "hidden" : "shown"
                      }}</em>
                    </span>
                    <span class="vcount">{{ countFor(tag) }}</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <div class="wb-pill-row">
            <span
              class="wb-pill"
              v-for="pill in pills"
              :key="pill.id"
              :class="{ negative: pill.not }"
            >
              <span class="facet">{{ pillFacetLabel(pill) }}</span>
              <span
                class="verb"
                title="Click to flip between is / is not"
                @click="flipPill(pill)"
              >{{ pill.not ? "is not" : "is" }}</span>
              <span class="val">{{ pillValueLabel(pill) }}</span>
              <span class="x" title="Remove this filter" @click="removePill(pill)"
                >×</span
              >
            </span>
            <span class="wb-clearall" v-if="pills.length" @click="pills = []"
              >Clear</span
            >
            <span class="wb-results">{{ filteredCount }} of {{ totalCount }}</span>
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
                <small v-if="entry.isLib">{{ entry.mine ? "yours" : "library" }}</small>
                <span class="wb-in" v-if="entry.inScript">✓</span>
              </li>
            </template>
          </ul>
        </aside>

        <main class="wb-main">
          <div class="wb-views">
            <span
              class="wb-tab"
              :class="{ active: wbView === 'team' }"
              @click="wbView = 'team'"
            >By type</span>
            <span
              class="wb-tab"
              :class="{ active: wbView === 'first' }"
              @click="wbView = 'first'"
            >First night</span>
            <span
              class="wb-tab"
              :class="{ active: wbView === 'other' }"
              @click="wbView = 'other'"
            >Other nights</span>
            <!-- the composition meter rides the tab line; icon + count per
                 team, tinted in the team's color (icon REPLACES text —
                 the word lives on the tooltip) -->
            <div
              class="wb-meter"
              :class="{ nonconforming: !servableCounts.length }"
              :title="
                servableCounts.length
                  ? 'Plays ' + servableText + ' players'
                  : 'No standard player count fits this composition'
              "
            >
              <!-- clear team glyphs (the good/evil token art read as
                   thumbs up/down at this size — user call): the town, the
                   loner, the masks, the skull -->
              <span class="chip team-townsfolk" title="Townsfolk">
                <font-awesome-icon icon="users" />{{ teamCounts.townsfolk }}
              </span>
              <span class="chip team-outsider" title="Outsiders">
                <img class="demon-glyph" :src="outsiderGlyph" alt="" />{{
                  teamCounts.outsider
                }}
              </span>
              <span class="chip team-minion" title="Minions">
                <font-awesome-icon icon="mask" />{{ teamCounts.minion }}
              </span>
              <span class="chip team-demon" title="Demons">
                <img class="demon-glyph" :src="demonGlyph" alt="" />
                {{ teamCounts.demon }}
              </span>
              <!-- unsaved edits: Save / Discard appear ONLY when dirty
                   (user call — the actions row lost its Save button) -->
              <span class="wb-dirty" v-if="scriptDirty">
                <font-awesome-icon
                  icon="check"
                  class="save"
                  title="Save this script to the vault"
                  @click="saveToVault"
                />
                <font-awesome-icon
                  icon="undo"
                  class="discard"
                  title="Discard the edits — back to the last saved state"
                  @click="discardEdits"
                />
              </span>
              <!-- the servable range rides the tooltip now (user call:
                   the green sentence was noise); only the WARNING renders -->
              <span class="verdict" v-if="!servableCounts.length">
                <font-awesome-icon icon="exclamation-triangle" />
                outside the rules — still playable
              </span>
            </div>
          </div>
          <div class="wb-empty" v-if="!scriptRoles.length">
            An empty page. Add roles from the shelf on the left, or pick a
            script above.
          </div>
          <!-- Night views: ONE ordered list, drag to reorder (user call).
               A drop writes real night numbers (midpoint between the new
               neighbors), so the storyteller's night sheet follows. Dragging
               a sleeper into the list starts it waking; dropping a waker on
               the Don't-wake box stops it. -->
          <div class="wb-groups wb-night" v-blood-scroll v-else-if="wbView !== 'team'">
            <section>
              <h4>
                {{ wbView === "first" ? "Wake the first night" : "Wake on other nights" }}
                <small>({{ nightWakers.length }})</small>
              </h4>
              <ul class="wb-order">
                <li
                  v-for="(role, i) in nightWakers"
                  :key="role.id"
                  draggable="true"
                  :class="[
                    'team-' + role.team,
                    {
                      dragging: dragId === role.id,
                      'over-before': dragOverId === role.id && !dragAfter,
                      'over-after': dragOverId === role.id && dragAfter
                    }
                  ]"
                  @dragstart="onDragStart(role)"
                  @dragover.prevent="onRowDragOver($event, role)"
                  @drop.prevent="onRowDrop(role)"
                  @dragend="resetDrag"
                >
                  <span class="grip" title="Drag to reorder">⠿</span>
                  <span class="ord">{{ i + 1 }}</span>
                  <span
                    class="icon"
                    :style="{ backgroundImage: `url(${roleIconUrl(role)})` }"
                  ></span>
                  <span class="wb-row-name">{{ role.name }}</span>
                  <span class="wb-row-ability">{{ role.ability }}</span>
                  <span class="wb-card-actions">
                    <font-awesome-icon
                      v-if="role.isCustom"
                      icon="pen"
                      title="Edit this role"
                      @click.stop="openRoleForm(role)"
                    />
                    <font-awesome-icon
                      icon="times"
                      title="Remove from script"
                      @click.stop="removeRole(role.id)"
                    />
                  </span>
                </li>
              </ul>
            </section>
            <section
              class="dim wb-sleepers"
              :class="{ 'drop-target': dragId && draggedWakes }"
              @dragover.prevent
              @drop.prevent="onSleeperDrop"
              v-if="nightSleepers.length || dragId"
            >
              <h4>
                Don't wake <small>({{ nightSleepers.length }})</small>
                <small class="hint-drop" v-if="dragId && draggedWakes">
                  — drop here to stop waking
                </small>
              </h4>
              <ul class="wb-order">
                <li
                  v-for="role in nightSleepers"
                  :key="role.id"
                  draggable="true"
                  :class="['team-' + role.team, { dragging: dragId === role.id }]"
                  @dragstart="onDragStart(role)"
                  @dragend="resetDrag"
                >
                  <span class="grip" title="Drag into the list above to wake">⠿</span>
                  <span class="ord">—</span>
                  <span
                    class="icon"
                    :style="{ backgroundImage: `url(${roleIconUrl(role)})` }"
                  ></span>
                  <span class="wb-row-name">{{ role.name }}</span>
                  <span class="wb-row-ability">{{ role.ability }}</span>
                  <span class="wb-card-actions">
                    <font-awesome-icon
                      v-if="role.isCustom"
                      icon="pen"
                      title="Edit this role"
                      @click.stop="openRoleForm(role)"
                    />
                    <font-awesome-icon
                      icon="times"
                      title="Remove from script"
                      @click.stop="removeRole(role.id)"
                    />
                  </span>
                </li>
              </ul>
            </section>
          </div>
          <div class="wb-groups" v-blood-scroll v-else>
            <section
              v-for="group in viewGroups"
              :key="group.label"
              :class="[group.team ? 'team-' + group.team : '', { dim: group.dim }]"
            >
              <!-- click a type header to fold its box (user call) -->
              <h4 class="wb-fold" @click="toggleGroupFold(group.label)">
                {{ group.label }} <small>({{ group.roles.length }})</small>
                <font-awesome-icon
                  class="caret"
                  :icon="foldedGroups[group.label] ? 'chevron-down' : 'chevron-down'"
                  :class="{ open: !foldedGroups[group.label] }"
                />
              </h4>
              <ul class="wb-cards" v-show="!foldedGroups[group.label]">
                <li
                  v-for="role in group.roles"
                  :key="role.id"
                  class="wb-card"
                  :class="'team-' + role.team"
                >
                  <span
                    class="icon"
                    :style="{ backgroundImage: `url(${roleIconUrl(role)})` }"
                  ></span>
                  <span class="wb-card-head">
                    <span class="wb-card-name">{{ role.name }}</span>
                    <span class="night-num" v-if="wbView !== 'team'">
                      {{ wbView === "first" ? role.firstNight : role.otherNight }}
                    </span>
                  </span>
                  <span class="wb-card-ability">{{ role.ability }}</span>
                  <span class="wb-card-actions">
                    <font-awesome-icon
                      v-if="role.isCustom"
                      icon="pen"
                      title="Edit this role"
                      @click.stop="openRoleForm(role)"
                    />
                    <font-awesome-icon
                      icon="times"
                      title="Remove from script"
                      @click.stop="removeRole(role.id)"
                    />
                  </span>
                </li>
              </ul>
            </section>
          </div>
        </main>
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
            v-for="t in ['townsfolk', 'outsider', 'minion', 'demon', 'traveller']"
            :key="t"
            type="button"
            class="team-btn"
            :class="[
              'team-' + (t === 'traveller' ? 'traveler' : t),
              { on: roleForm.roleType === t }
            ]"
            @click="roleForm.roleType = t"
          >
            <img
              v-if="t === 'demon'"
              class="demon-glyph"
              :src="demonGlyph"
              alt=""
            />
            <img
              v-else-if="t === 'outsider'"
              class="demon-glyph"
              :src="outsiderGlyph"
              alt=""
            />
            <font-awesome-icon
              v-else
              :icon="
                t === 'townsfolk' ? 'users' : t === 'minion' ? 'mask' : 'walking'
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
        <div class="wakes-block">
          <span class="wakes-title">Wakes:</span>
          <label class="wake-opt" :class="{ on: wakesFirstNight }">
            <input type="checkbox" v-model="wakesFirstNight" />
            <span class="wake-box"></span> First Night
          </label>
          <label class="wake-opt" :class="{ on: wakesOtherNights }">
            <input type="checkbox" v-model="wakesOtherNights" />
            <span class="wake-box"></span> Other Nights
          </label>
        </div>
        <div class="row">
          <input
            v-model="roleForm.reminders"
            class="wide"
            placeholder="Reminder tokens, comma-separated"
          />
        </div>
        <div class="row">
          <label>
            <input type="checkbox" v-model="roleForm.setup" />
            affects setup
          </label>
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
            <small class="ns-note">The icon is optional — it marks the script wherever scripts are picked.</small>
            <!-- FT-856: an upload arrives twice — inked to the official
                 look, and untouched. The pick is one click. -->
            <div class="ns-style-toggle" v-if="newScriptForm.iconStyled">
              <span
                :class="{ on: newScriptForm.icon === newScriptForm.iconStyled }"
                @click="newScriptForm.icon = newScriptForm.iconStyled"
                >Inked</span
              >
              <span
                :class="{ on: newScriptForm.icon === newScriptForm.iconOriginal }"
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
              placeholder='Paste a script JSON, a share link, or a URL — or leave empty for a blank page'
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

      <!-- the shelf's hover card: icon + bold name + ability (the almanac
           read), replacing the native title tooltip -->
      <div
        class="wb-role-tip"
        v-if="roleTip"
        :class="'team-' + roleTip.team"
        :style="roleTipStyle"
      >
        <span
          class="icon"
          :style="{ backgroundImage: `url(${roleTip.iconUrl || iconUrl('custom')})` }"
        ></span>
        <span class="txt">
          <b>{{ roleTip.name }}</b>
          <span class="ability">{{
            roleTip.ability || "A library role — its ability arrives when added."
          }}</span>
        </span>
      </div>

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
import {
  EDITION_ICONS,
  edCustom,
  OFFICIAL_BLURBS
} from "../../golem/editionArt";
// FT-856: uploads take the official engraving look (ink/tint/parchment).
import { stylizeIcon } from "../../golem/iconStyle";
import * as iconLib from "../../golem/iconLibrary";
// The all-of-BOTC card wears the creative director's gold logo.
import goldLogo from "../../assets/gold/botc-logo-icon.png";
// The user's demon mask + outsider face (design/red/*, cut + baked).
import demonGlyph from "../../assets/blood/demon-glyph.png";
import outsiderGlyph from "../../assets/blood/outsider-glyph.png";
// The app-wide PNG-font choice — the Almanac's A wears the caps' font.
import {
  fontState,
  glyphFrom,
  glyphStyleFrom,
  resolvedCapKey,
  CAP_SHRINK
} from "../../golem/titleFonts";

// Golem fork (FT-854): the official setup table — players: [townsfolk,
// outsiders, minions, demons]. The meter measures a script's POOL against it:
// a count is servable when the pool covers each column. Purely informational.
const SETUP_TABLE = {
  5: [3, 0, 1, 1],
  6: [3, 1, 1, 1],
  7: [5, 0, 1, 1],
  8: [5, 1, 1, 1],
  9: [5, 2, 1, 1],
  10: [7, 0, 2, 1],
  11: [7, 1, 2, 1],
  12: [7, 2, 2, 1],
  13: [9, 0, 3, 1],
  14: [9, 1, 3, 1],
  15: [9, 2, 3, 1]
};
const TEAM_ORDER = ["townsfolk", "outsider", "minion", "demon", "traveler"];
// FT-854: the shelf's tri-state tag filter. Every tag cycles
// neutral → include → exclude. Includes OR within a group and AND across
// groups; an exclude always wins. Library roles carry no night/setup data,
// so they only match tags we can actually prove.
const LUF_ROLES = new Set(
  (editionJSON.find(e => e.id === "luf") || { roles: [] }).roles
);
const TAG_GROUPS = [
  {
    key: "team",
    label: "Team",
    tags: [
      { id: "team:townsfolk", label: "Townsfolk" },
      { id: "team:outsider", label: "Outsiders" },
      { id: "team:minion", label: "Minions" },
      { id: "team:demon", label: "Demons" }
    ]
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
      { id: "src:lib", label: "Community" }
    ]
  },
  {
    key: "night",
    label: "Night",
    tags: [
      { id: "night:first", label: "Wakes first night" },
      { id: "night:other", label: "Wakes other nights" },
      { id: "night:never", label: "Never wakes" }
    ]
  },
  {
    key: "flags",
    label: "Special",
    tags: [
      { id: "flag:setup", label: "Affects setup" },
      { id: "flag:inscript", label: "In this script" }
    ]
  }
];

// The import box's ghost text and its copyable template — the same object,
// so the syntax the ghost shows is exactly the syntax the parser accepts.
const ROLE_TEMPLATE = {
  name: "Role Name",
  team: "townsfolk | outsider | minion | demon",
  ability: "What the role does.",
  firstNight: 0,
  otherNight: 0,
  reminders: [],
  setup: false
};
const TEAM_LABELS = {
  townsfolk: "Townsfolk",
  outsider: "Outsiders",
  minion: "Minions",
  demon: "Demons",
  traveler: "Travellers"
};
// roles.json spells it "traveler"; the server's roleType vocabulary spells it
// "traveller". Normalize to the app side everywhere the two meet.
const normTeam = t => (t || "").replace("traveller", "traveler");

export default {
  components: {
    Modal,
    ScriptPicker
  },
  data: function() {
    return {
      editions: editionJSON,
      // the workbench is the modal's only page now; the flag stays because
      // ensureOpen (and old muscle memory in methods) still sets it
      isCustom: true,
      bloodA,
      demonGlyph,
      outsiderGlyph,
      fontStateRef: fontState,
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
      // Golem fork (FT-854): the workbench — active view, sidebar team filter,
      // the import-role paste row, and the non-conforming marks by script id
      // (derived from the setup table; informational only, never a gate).
      wbView: "team",
      wbTeam: "",
      // the shelf's hover card
      roleTip: null,
      roleTipStyle: { top: "-9999px", left: "-9999px" },
      // night-order drag state
      dragId: null,
      dragOverId: null,
      dragAfter: false,
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
      // the forge's paste-to-fill box
      roleJsonText: "",
      // FT-856 slice B: the icon tabs — official borrow vs the new-icon
      // library (game-icons.net curation, lazy chunk).
      iconTab: "library",
      // By-type group folding (click the header)
      foldedGroups: {},
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
      filterOpen: false,
      // which facet groups are unfolded in the menu (Source starts open)
      facetOpen: {},
      ncMap: JSON.parse(localStorage.getItem("golem.scriptNC") || "{}"),
      officials: [
        ["trouble-brewing", "Trouble Brewing"],
        ["bad-moon-rising", "Bad Moon Rising"],
        ["sects-and-violets", "Sects & Violets"]
      ],
      vaultSourceId: null,
      scripts: [
        [
          "Deadly Penance Day",
          "https://gist.githubusercontent.com/bra1n/0337cc44c6fd2c44f7589256ed5486d2/raw/16be38fa3c01aaf49827303ac80577bdb52c0b25/penanceday.json"
        ],
        [
          "Catfishing 11.1",
          "https://gist.githubusercontent.com/bra1n/8a5ec41a7bbf945f6b7dfc1cef72b569/raw/a312ab93c2f302e0ef83c8b65a4e8e82760fda3a/catfishing.json"
        ],
        [
          "On Thin Ice (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/8dacd9f2abc6f428331ea1213ab153f5/raw/0cacbcaf8ed9bddae0cca25a9ada97e9958d868b/on-thin-ice.json"
        ],
        [
          "Race To The Bottom (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/63e1354cb3dc9d4032bcd0623dc48888/raw/5acb0eedcc0a67a64a99c7e0e6271de0b7b2e1b2/race-to-the-bottom.json"
        ],
        [
          "Frankenstein's Mayor by Ted (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/32c52b422cc01b934a4291eeb81dbcee/raw/5bf770693bbf7aff5e86601c82ca4af3222f4ba6/Frankensteins_Mayor_by_Ted.json"
        ],
        [
          "Vigormortis High School (Teensyville)",
          "https://gist.githubusercontent.com/bra1n/1f65bd4a999524719d5dabe98c3c2d27/raw/22bbec6bf56a51a7459e5ae41ed47e41971c5445/VigormortisHighSchool.json"
        ]
      ]
    };
  },
  computed: {
    ...mapState(["modals"]),
    // Golem fork (FT-851): the current script's custom roles (editable rows).
    // state.roles is REPLACED wholesale on every setCustomRoles, so this
    // recomputes despite being a Map.
    editionCustomRoles() {
      const list = [];
      this.$store.state.roles.forEach(role => {
        if (role.isCustom) list.push(role);
      });
      return list;
    },
    // The icon picker's grid: official roles, name-filtered.
    iconMatches() {
      const q = this.iconSearch.trim().toLowerCase();
      if (!q) return rolesJSON;
      return rolesJSON.filter(role => role.name.toLowerCase().includes(q));
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
        e =>
          (!this.ilTheme || e.t === this.ilTheme) &&
          (!q || e.n.includes(q))
      );
    },
    /** Cap the rendered grid — 1.3k canvases in one paint is a hitch. */
    ilShown() {
      return this.ilFiltered.slice(0, 160);
    },
    ilOverflow() {
      return Math.max(0, this.ilFiltered.length - 160);
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
      return this.roleShelf.filter(entry =>
        (entry.name || "").toLowerCase().includes(q)
      );
    },
    // ── Golem fork (FT-854): the workbench ───────────────────────────────
    myScripts() {
      return this.recents.filter(e => e.editKey);
    },
    viewedScripts() {
      return this.recents.filter(e => !e.editKey);
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
      this.editions.forEach(e => {
        cards.push({
          id: e.id,
          name: e.name,
          icon: EDITION_ICONS[e.id] || edCustom,
          blurb: OFFICIAL_BLURBS[e.id] || "",
          source: "OFFICIAL"
        });
      });
      // every official character on one script, behind the gold logo
      cards.push({
        id: "__all",
        name: "All of Blood on the Clocktower",
        icon: goldLogo,
        blurb: "Every official character — the whole book on one script.",
        source: "OFFICIAL"
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
        source
      });
      this.myScripts.forEach(e => cards.push(vaultCard(e, "yours")));
      this.viewedScripts.forEach(e => cards.push(vaultCard(e, "viewed")));
      return cards;
    },
    /** The current script as a list (state.roles is replaced wholesale). */
    scriptRoles() {
      const list = [];
      this.$store.state.roles.forEach(role => list.push(role));
      return list;
    },
    teamCounts() {
      const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0, traveler: 0 };
      this.scriptRoles.forEach(role => {
        const team = normTeam(role.team);
        if (counts[team] !== undefined) counts[team] += 1;
      });
      return counts;
    },
    /** Player counts the pool can serve under the official table. */
    servableCounts() {
      const c = this.teamCounts;
      return Object.keys(SETUP_TABLE)
        .map(Number)
        .filter(n => {
          const [t, o, m, d] = SETUP_TABLE[n];
          return (
            c.townsfolk >= t && c.outsider >= o && c.minion >= m && c.demon >= d
          );
        });
    },
    /** "5–15" / "5, 7, 10–13" — collapse runs for the meter. */
    servableText() {
      const runs = [];
      this.servableCounts.forEach(n => {
        const last = runs[runs.length - 1];
        if (last && n === last[1] + 1) last[1] = n;
        else runs.push([n, n]);
      });
      return runs
        .map(([a, b]) => (a === b ? String(a) : a + "–" + b))
        .join(", ");
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
        demon: "" // bespoke horned-head SVG (DEMON_PATH)
      };
      return ["townsfolk", "outsider", "minion", "demon"].map(team => ({
        team,
        label: TEAM_LABELS[team],
        icon: icons[team],
        count: this.allShelfEntries.filter(
          e =>
            e.team === team &&
            this.matchesSearch(e) &&
            this.matchesPills(e, null)
        ).length
      }));
    },
    facetList() {
      return TAG_GROUPS.filter(g => g.key !== "team");
    },
    filteredCount() {
      return this.sidebarRoles.length;
    },
    searchActive() {
      return !!this.roleQuery.trim();
    },
    totalCount() {
      return this.allShelfEntries.length;
    },
    /** Every shelf entry, UNFILTERED — the base set filters and counts read. */
    allShelfEntries() {
      const inScriptIds = new Set(this.scriptRoles.map(r => r.id));
      const inScriptLibIds = new Set(
        this.scriptRoles.map(r => r.golemRoleId).filter(Boolean)
      );
      const entries = [];
      rolesJSON.forEach(role => {
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
          // the tag filter's raw material
          edition: role.edition,
          firstNight: role.firstNight,
          otherNight: role.otherNight,
          setup: !!role.setup
        });
      });
      const seen = new Set();
      this.roleShelf.forEach(entry => {
        seen.add(entry.id);
        if (normTeam(entry.role) === "traveler") return;
        entries.push({
          key: "lib-" + entry.id,
          libId: entry.id,
          name: entry.name,
          team: normTeam(entry.role),
          isLib: true,
          mine: !!entry.editKey,
          inScript: inScriptLibIds.has(entry.id)
        });
      });
      this.roleResults.forEach(row => {
        if (seen.has(row.id)) return;
        if (normTeam(row.roleType) === "traveler") return;
        entries.push({
          key: "browse-" + row.id,
          libId: row.id,
          name: row.name,
          team: normTeam(row.roleType),
          isLib: true,
          mine: false,
          inScript: inScriptLibIds.has(row.id)
        });
      });
      return entries;
    },
    /** The shelf, filtered by search + team row + pills, sorted team/name.
     *  (roles.json arrives grouped by edition — "weirdly sorted".) */
    sidebarRoles() {
      const teamRank = t => {
        const i = TEAM_ORDER.indexOf(t);
        return i < 0 ? TEAM_ORDER.length : i;
      };
      return this.allShelfEntries
        .filter(
          e =>
            this.matchesSearch(e) &&
            this.matchesTeams(e) &&
            this.matchesPills(e, null)
        )
        .sort(
          (a, b) =>
            teamRank(a.team) - teamRank(b.team) ||
            (a.name || "").localeCompare(b.name || "")
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
      }
    },
    wakesOtherNights: {
      get() {
        return !!this.roleForm && this.roleForm.otherNight > 0;
      },
      set(v) {
        if (!this.roleForm) return;
        this.roleForm.otherNight = v ? this.roleForm.otherNight || 100 : 0;
      }
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
            style: glyphStyleFrom(key, "S", CAP_SHRINK)
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
        r: this.collapseScript()
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
      return rolesJSON.filter(role => role.name.toLowerCase().includes(q));
    },
    nsIconStyle() {
      const f = this.newScriptForm;
      if (!f || !f.icon) return {};
      return { backgroundImage: `url(${this.scriptLogoSrc(f.icon)})` };
    },
    /** The shelf grouped by team, headers included (user call). */
    sidebarGroups() {
      return ["townsfolk", "outsider", "minion", "demon"]
        .map(team => ({
          team,
          label: TEAM_LABELS[team],
          roles: this.sidebarRoles.filter(r => r.team === team)
        }))
        .filter(g => g.roles.length);
    },
    /** The by-team groups. Travellers never render here — town-side content. */
    viewGroups() {
      const roles = this.scriptRoles.filter(
        r => normTeam(r.team) !== "traveler"
      );
      return ["townsfolk", "outsider", "minion", "demon"]
        .map(team => ({
          label: TEAM_LABELS[team],
          team,
          roles: roles
            .filter(r => normTeam(r.team) === team)
            .sort((a, b) => a.name.localeCompare(b.name))
        }))
        .filter(g => g.roles.length);
    },
    /** The active night view's ordered wakers (drag-reorderable). */
    nightWakers() {
      const prop = this.wbView === "first" ? "firstNight" : "otherNight";
      return this.scriptRoles
        .filter(r => normTeam(r.team) !== "traveler" && (r[prop] || 0) > 0)
        .sort((a, b) => a[prop] - b[prop] || a.name.localeCompare(b.name));
    },
    nightSleepers() {
      const prop = this.wbView === "first" ? "firstNight" : "otherNight";
      return this.scriptRoles
        .filter(r => normTeam(r.team) !== "traveler" && !(r[prop] || 0))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    /** Is the role being dragged currently a waker (in this view)? */
    draggedWakes() {
      return this.nightWakers.some(r => r.id === this.dragId);
    }
  },
  // Golem fork: a ?script=<id> share link auto-loads its script on arrival.
  // The QUERY string is used (not the hash) because the hash is the live
  // session's join token upstream — the two must coexist on one URL.
  created() {
    const id = new URLSearchParams(window.location.search).get("script");
    if (id) this.loadFromVault(id);
    this.setBaseline();
  },
  watch: {
    // FT-856: a team switch re-prints the baked library icon in the new tint
    "roleForm.roleType"() {
      this.rebakeForTeam();
    }
  },
  methods: {
    // ── Golem fork: the script vault ─────────────────────────────────────
    async loadFromVault(id, attach = true) {
      try {
        const script = await vault.loadScript(id);
        // roles verbatim; carry the vault name in as _meta so the script's
        // name survives the round trip and seeds the save prompt later.
        const roles = Array.isArray(script.roles) ? script.roles.slice() : [];
        if (!roles.some(r => r && r.id === "_meta")) {
          roles.unshift({ id: "_meta", name: script.name, author: script.author });
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
        .then(town => flashHint(`Script saved to ${town.name || town.id}`))
        .catch(() => {});
    },
    promptVaultLoad() {
      const ref = prompt("Paste a script link (or its id)");
      const id = vault.parseScriptRef(ref);
      if (id) this.loadFromVault(id);
      else if (ref) alert("That does not look like a script link.");
    },
    async saveToVault() {
      // The CURRENT custom script = what the store holds. Plain base-role
      // entries collapse back to id references; custom roles ship whole.
      const custom = this.$store.state.roles;
      if (this.$store.state.edition.id !== "custom" || !custom.size) {
        alert("Load or build a custom script first — the vault stores custom scripts.");
        return;
      }
      const meta = this.$store.state.edition;
      const name = prompt("Script name", meta.name || "My script");
      if (!name) return;
      // A role whose id exists upstream collapses back to an id reference
      // (the Script Tool convention) — kept as a bare string when it carries
      // no night-order override; a custom role ships whole, minus the
      // store's derived display fields.
      const roles = this.collapseScript().map(entry =>
        Object.keys(entry).length === 1 && entry.id !== undefined
          ? entry.id
          : entry
      );
      // FT-854: the script's icon travels in _meta (script-tool convention),
      // so it survives the save/load round trip.
      if (this.$store.state.edition.logo) {
        roles.unshift({
          id: "_meta",
          name,
          author: meta.author,
          logo: this.$store.state.edition.logo
        });
      }
      try {
        const { script, created, forked } = await vault.saveScript({
          name,
          author: meta.author,
          roles,
          sourceId: this.vaultSourceId
        });
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
        alert("Save failed: " + e.message);
      }
    },
    async copyLinks() {
      try {
        await navigator.clipboard.writeText(vault.exportLinks());
        alert("Your script links (edit keys included) are on the clipboard — paste them somewhere safe.");
      } catch (e) {
        alert(vault.exportLinks());
      }
    },
    // ── Golem fork (FT-851): the custom-role library ─────────────────────
    /** Open the form — blank, or seeded from an existing edition role. */
    openRoleForm(role) {
      this.roleError = "";
      this.iconSearch = "";
      // the library tab is the default view — have its chunk ready
      this.openIconLibrary();
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
          // the app-side id to replace in the script (a fork mints a new
          // library id, so the library id alone can't find the old row)
          appId: role.id
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
          appId: null
        };
      }
    },
    closeRoleForm() {
      this.roleForm = null;
      this.roleError = "";
    },
    /** Click an icon to select it; click again to clear (icon is optional). */
    toggleGroupFold(label) {
      this.$set(this.foldedGroups, label, !this.foldedGroups[label]);
    },
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
              size: 96
            })
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
        seed: f.iconSeed || 0
      });
    },
    async rerollIcon() {
      const f = this.roleForm;
      if (!f || !f.iconRef || !this.$options.ilList) return;
      const entry = iconLib.findIcon(this.$options.ilList, f.iconRef);
      if (!entry) return;
      f.iconSeed = 1 + Math.floor(Math.random() * 1e6);
      f.iconData = await iconLib.bakeIcon(entry, f.roleType, {
        seed: f.iconSeed
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
        seed: f.iconSeed || 0
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
      const reminders = f.reminders
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      // honest inline validation, mirroring the server's bounds
      const nightsOk = [f.firstNight, f.otherNight].every(
        n => Number.isInteger(n) && n >= 0 && n <= 200
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
                  : reminders.some(r => r.length > 40)
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
          authorName: f.authorName.trim() || undefined
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
        this.insertRoleIntoEdition(appRole, f.appId);
        flashHint(
          forked
            ? "Forked into your own copy — script updated"
            : created
              ? "Saved to the role library — added to this script"
              : "Updated — script refreshed"
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
          t => this.teamState[t] === 1
        );
        const type = inc.length === 1 ? inc[0] : "";
        const rows = await roleLib.browseRoles({
          q: this.roleQuery.trim(),
          type,
          limit: 20
        });
        const shelfIds = new Set(this.roleShelf.map(e => e.id));
        this.roleResults = rows.filter(r => !shelfIds.has(r.id));
      } catch (e) {
        this.roleError = "Browse failed: " + e.message;
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
        r =>
          (replaceAppId && r.id === replaceAppId) ||
          (appRole.golemRoleId && r.golemRoleId === appRole.golemRoleId) ||
          r.id === appRole.id
      );
      if (at > -1) list.splice(at, 1, appRole);
      else list.push(appRole);
      this.$store.commit("setCustomRoles", list);
      if (this.$store.state.edition.id !== "custom") {
        const meta = this.$store.state.edition;
        this.$store.commit("setEdition", {
          id: "custom",
          name: meta.name || "Custom script"
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
      this.$store.state.roles.forEach(role => {
        if (excludeAppId && role.id === excludeAppId) return;
        const b = base.get(role.id);
        if (b) {
          const ref = { id: role.id };
          if (role.firstNight !== b.firstNight) ref.firstNight = role.firstNight;
          if (role.otherNight !== b.otherNight) ref.otherNight = role.otherNight;
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
          .filter(r =>
            ["townsfolk", "outsider", "minion", "demon"].includes(
              normTeam(r.team)
            )
          )
          .map(r => ({ id: r.id }));
        this.$store.commit("setCustomRoles", all);
        this.$store.commit("setEdition", {
          id: "custom",
          name: "All of Blood on the Clocktower",
          logo: "__gold"
        });
        this.vaultSourceId = null;
        this.ensureOpen();
        this.setBaseline();
        return;
      }
      const edition = editionJSON.find(e => e.id === card.id);
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
        logo: f.icon || undefined
      });
      this.newScriptForm = null;
      this.nsJsonText = "";
      this.ensureOpen();
      this.setBaseline();
      flashHint(
        seed
          ? `${f.name.trim()} — seeded and ready`
          : `${f.name.trim()} — a blank page. Add roles from the shelf`
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
        const edition = editionJSON.find(x => x.id === b.e);
        if (edition) this.$store.commit("setEdition", edition);
      } else {
        this.$store.commit("setCustomRoles", b.r);
        this.$store.commit("setEdition", {
          id: "custom",
          name: b.n,
          logo: b.l || undefined
        });
      }
      this.ensureOpen();
      flashHint("Edits discarded");
    },
    /** The shelf hover card — fixed-positioned to the row's right, clamped
     *  to the viewport (the ScriptPicker tip idiom). Hover only. */
    showRoleTip(e, entry) {
      if (!window.matchMedia("(hover: hover)").matches) return;
      const rect = e.currentTarget.getBoundingClientRect();
      this.roleTip = entry;
      this.$nextTick(() => {
        const tip = this.$el.querySelector(".wb-role-tip");
        if (!tip) return;
        const margin = 8;
        let left = rect.right + 10;
        let top = rect.top + rect.height / 2 - tip.offsetHeight / 2;
        top = Math.min(
          Math.max(top, margin),
          window.innerHeight - tip.offsetHeight - margin
        );
        if (left + tip.offsetWidth > window.innerWidth - margin)
          left = rect.left - tip.offsetWidth - 10;
        this.roleTipStyle = { top: `${top}px`, left: `${left}px` };
      });
    },
    hideRoleTip() {
      this.roleTip = null;
      this.roleTipStyle = { top: "-9999px", left: "-9999px" };
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
        const role = this.scriptRoles.find(r => r.golemRoleId === entry.libId);
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
          name: meta.name || "Custom script"
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
          this.roleError = `No official role called ${JSON.stringify(parsed)} — paste a role object for customs.`;
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
        normTeam(parsed.team || parsed.roleType || "townsfolk")
      );
      if (parsed.ability) f.ability = String(parsed.ability).slice(0, 600);
      f.firstNight = Math.abs(parsed.firstNight || 0);
      f.otherNight = Math.abs(parsed.otherNight || 0);
      f.reminders = (parsed.reminders || []).join(", ");
      f.setup = !!parsed.setup;
      this.roleJsonText = "";
    },
    // ── FT-854: night-order drag-reorder ─────────────────────────────────
    onDragStart(role) {
      this.dragId = role.id;
    },
    onRowDragOver(e, role) {
      if (!this.dragId || role.id === this.dragId) return;
      this.dragOverId = role.id;
      this.dragAfter = e.offsetY > e.currentTarget.offsetHeight / 2;
    },
    resetDrag() {
      this.dragId = null;
      this.dragOverId = null;
      this.dragAfter = false;
    },
    /**
     * Drop on a waker row: the dragged role takes the midpoint of its new
     * neighbors' night numbers — everything else (including the night
     * sheet's fixed minion/demon-info anchors) keeps its place. Ties fall
     * back to a small offset.
     */
    onRowDrop(target) {
      const dragged = this.scriptRoles.find(r => r.id === this.dragId);
      const after = this.dragAfter;
      this.resetDrag();
      if (!dragged || dragged.id === target.id) return;
      const prop = this.wbView === "first" ? "firstNight" : "otherNight";
      const list = this.nightWakers.filter(r => r.id !== dragged.id);
      let at = list.findIndex(r => r.id === target.id);
      if (at < 0) return;
      if (after) at += 1;
      const prev = at > 0 ? list[at - 1][prop] : 0;
      const next = at < list.length ? list[at][prop] : prev + 2;
      let value = (prev + next) / 2;
      if (!(value > prev && value < next)) value = prev + 0.5;
      this.setNight(dragged.id, prop, value);
    },
    /** Drop a waker onto the Don't-wake box: it stops waking (0). */
    onSleeperDrop() {
      const dragged = this.scriptRoles.find(r => r.id === this.dragId);
      const wasWaking = this.draggedWakes;
      this.resetDrag();
      if (!dragged || !wasWaking) return;
      const prop = this.wbView === "first" ? "firstNight" : "otherNight";
      this.setNight(dragged.id, prop, 0);
    },
    /** Write one role's night number through the collapse (persists on the
     *  script entry — official refs carry it as an override). */
    setNight(appId, prop, value) {
      const list = this.collapseScript();
      const entry = list.find(r => r.id === appId);
      if (!entry) return;
      entry[prop] = value;
      this.$store.commit("setCustomRoles", list);
      if (this.$store.state.edition.id !== "custom") {
        const meta = this.$store.state.edition;
        this.$store.commit("setEdition", {
          id: "custom",
          name: meta.name || "Custom script"
        });
      }
      this.ensureOpen();
    },
    // ── FT-854: the tri-state tag filter ─────────────────────────────────
    /** Everything provable about a shelf entry, as tag ids. */
    entryTags(entry) {
      const tags = new Set(["team:" + entry.team]);
      if (entry.isLib) {
        tags.add(entry.mine ? "src:mine" : "src:lib");
      } else {
        if (["tb", "bmr", "snv"].includes(entry.edition))
          tags.add("src:" + entry.edition);
        else if (LUF_ROLES.has(entry.id)) tags.add("src:luf");
        else tags.add("src:exp");
        if (entry.firstNight > 0) tags.add("night:first");
        if (entry.otherNight > 0) tags.add("night:other");
        if (!(entry.firstNight > 0) && !(entry.otherNight > 0))
          tags.add("night:never");
        if (entry.setup) tags.add("flag:setup");
      }
      if (entry.inScript) tags.add("flag:inscript");
      return tags;
    },
    // ── FT-855: matchers ─────────────────────────────────────────────────
    matchesSearch(entry) {
      const q = this.roleQuery.trim().toLowerCase();
      return !q || (entry.name || "").toLowerCase().includes(q);
    },
    matchesTeams(entry) {
      if (this.teamState[entry.team] === -1) return false;
      const inc = Object.keys(this.teamState).filter(
        t => this.teamState[t] === 1
      );
      return !inc.length || inc.includes(entry.team);
    },
    /** Pills: includes OR within a facet, AND across facets; every is-not
     *  pill excludes. excludeFacet skips one facet's pills (its own counts). */
    matchesPills(entry, excludeFacet) {
      const active = this.pills.filter(p => p.facet !== excludeFacet);
      if (!active.length) return true;
      const tags = this.entryTags(entry);
      if (active.some(p => p.not && tags.has(p.id))) return false;
      const facets = [...new Set(active.filter(p => !p.not).map(p => p.facet))];
      return facets.every(f =>
        active.some(p => !p.not && p.facet === f && tags.has(p.id))
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
      if (teams.every(t => next[t] === -1)) this.teamState = {};
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
    /** Typing opens the filter box, narrows its facet values, and (debounced)
     *  asks the community library too — the Browse button retired. */
    onSearchInput() {
      if (this.roleQuery.trim()) this.filterOpen = true;
      clearTimeout(this.__searchDebounce);
      this.__searchDebounce = setTimeout(() => {
        if (this.roleQuery.trim()) this.searchRoles();
        else this.roleResults = [];
      }, 400);
    },
    facetTagsFiltered(facet) {
      const q = this.roleQuery.trim().toLowerCase();
      if (!q) return facet.tags;
      return facet.tags.filter(t => t.label.toLowerCase().includes(q));
    },
    /** A group shows its values when opened — or while a search matches. */
    facetShowing(facet) {
      return (
        this.facetOpen[facet.key] ||
        (this.searchActive && this.facetTagsFiltered(facet).length > 0)
      );
    },
    pillFor(id) {
      return this.pills.find(p => p.id === id) || null;
    },
    /** Menu click: no pill → add (shown); pill exists → remove (a toggle). */
    togglePillValue(tag) {
      const existing = this.pillFor(tag.id);
      if (existing) this.pills = this.pills.filter(p => p !== existing);
      else
        this.pills = [
          ...this.pills,
          { id: tag.id, facet: this.facetKeyOf(tag.id), not: false }
        ];
    },
    flipPill(pill) {
      pill.not = !pill.not;
    },
    removePill(pill) {
      this.pills = this.pills.filter(p => p !== pill);
    },
    /** Groups open independently (user call — the accordion retired). */
    toggleFacetOpen(key) {
      this.$set(this.facetOpen, key, !this.facetOpen[key]);
    },
    pillCountIn(key) {
      return this.pills.filter(p => p.facet === key).length;
    },
    facetKeyOf(id) {
      const g = TAG_GROUPS.find(g => g.tags.some(t => t.id === id));
      return g ? g.key : "";
    },
    pillFacetLabel(pill) {
      const g = TAG_GROUPS.find(g => g.key === pill.facet);
      return g ? g.label : "";
    },
    pillValueLabel(pill) {
      for (const g of TAG_GROUPS)
        for (const t of g.tags) if (t.id === pill.id) return t.label;
      return pill.id;
    },
    /** Live count for a facet value: everything EXCEPT its own facet's pills
     *  applies (standard faceted counting — your own picks never zero your
     *  siblings). */
    countFor(tag) {
      const facet = this.facetKeyOf(tag.id);
      return this.allShelfEntries.filter(
        e =>
          this.matchesSearch(e) &&
          this.matchesTeams(e) &&
          this.matchesPills(e, facet) &&
          this.entryTags(e).has(tag.id)
      ).length;
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
    /** The icon for any script role — official art, borrowed art, or generic. */
    roleIconUrl(role) {
      if (role.golemIconData) return role.golemIconData;
      const base = this.$store.getters.rolesJSONbyId;
      if (base.has(role.id)) return this.iconUrl(role.id);
      return this.iconUrl(role.imageAlt || "custom");
    },
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
      const url = prompt("Enter URL to a custom-script.json file");
      if (url) {
        this.handleURL(url);
      }
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
      roles = roles.map(role => typeof role === "string" ? { id: role } : role);
      const metaIndex = roles.findIndex(({ id }) => id === "_meta");
      let meta = {};
      if (metaIndex > -1) {
        meta = roles.splice(metaIndex, 1).pop();
      }
      this.$store.commit("setCustomRoles", roles);
      this.$store.commit(
        "setEdition",
        Object.assign({}, meta, { id: "custom" })
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
    ...mapMutations(["toggleModal", "setEdition"])
  }
};
</script>

<style scoped lang="scss">
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
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000,
    1px 1px 0 #000, 0 0 5px rgba(0, 0, 0, 0.75);
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
  "traveler": #cc04ff
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
// By-type group folding: the header is the control
.wb-groups h4.wb-fold {
  cursor: pointer;
  user-select: none;
  .caret {
    margin-left: 8px;
    font-size: 0.7em;
    opacity: 0.6;
    transition: transform 160ms ease;
    transform: rotate(-90deg);
    &.open {
      transform: rotate(0);
    }
  }
  &:hover .caret {
    opacity: 1;
  }
}

// Wakes: its own block — title line, one themed checkbox row per night
.role-form .wakes-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 6px 0;
  .wakes-title {
    font-weight: bold;
  }
  .wake-opt {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 4px 12px;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid #3d3d3d;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    font-size: 13px;
    input {
      display: none;
    }
    .wake-box {
      width: 14px;
      height: 14px;
      border: 1px solid #666;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.5);
      position: relative;
    }
    &:hover {
      border-color: #666;
    }
    &.on {
      border-color: #a01414;
      background: rgba(160, 20, 20, 0.14);
      color: white;
      .wake-box {
        border-color: #a01414;
        background: #7d0e0e;
      }
      .wake-box::after {
        content: "";
        position: absolute;
        left: 4px;
        top: 1px;
        width: 4px;
        height: 8px;
        border: solid #ffd9d9;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
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
      width: 15px;
      height: 15px;
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

  // The + buttons: square, icon-only, blood on hover.
  .wb-plus {
    padding: 3px 9px !important;
    svg {
      width: 15px;
      height: 15px;
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
        grid-column: 3;
        justify-self: end;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
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

  .wb-meter {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    // icon + count, tinted per team; the word rides the tooltip
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 8px 1px 4px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
      font-weight: bold;
      svg {
        width: 15px;
        height: 15px;
      }
      .demon-glyph {
        width: 17px;
        height: 17px;
        object-fit: contain;
      }
      // the PROPER team colors (user call on the blue); demon's dark red
      // alone gets a small lift for dark-ground legibility
      &.team-townsfolk {
        color: #1f65ff;
      }
      &.team-outsider {
        color: #46d5ff;
      }
      &.team-minion {
        color: #ff6900;
      }
      &.team-demon {
        color: lighten(#ce0100, 14%);
      }
    }
    .verdict {
      margin-left: 8px;
      color: #7ed67e;
    }
    &.nonconforming .verdict {
      color: #ff8a8a;
    }
    // unsaved-edit controls: visible only while dirty
    .wb-dirty {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-left: 10px;
      padding: 2px 10px;
      border: 1px solid #7d0e0e;
      border-radius: 10px;
      svg {
        cursor: pointer;
        width: 14px;
        height: 14px;
      }
      .save {
        color: #7ed67e;
        &:hover {
          filter: brightness(1.4);
        }
      }
      .discard {
        color: #ff8a8a;
        &:hover {
          color: red;
        }
      }
    }
  }

  .wb-body {
    display: flex;
    flex-grow: 1;
    min-height: 0;
    gap: 14px;
    padding-top: 8px;
  }

  .wb-sidebar {
    width: 270px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    // FT-855 r2: the filter box — header row = Filter · search · chevron
    .wb-filterbox {
      border: 1px solid #3d3d3d;
      border-radius: 6px;
      margin-bottom: 7px;
      &.open {
        border-color: #7d0e0e;
      }
      .fb-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        cursor: pointer;
        .fb-title {
          font-size: 13px;
          opacity: 0.85;
          flex-shrink: 0;
        }
        .wb-search {
          flex-grow: 1;
          width: auto;
          margin: 0;
        }
        .caret {
          flex-shrink: 0;
          font-size: 10px;
          opacity: 0.7;
          transition: transform 150ms;
          &.open {
            transform: rotate(180deg);
          }
        }
      }
      .fb-body {
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding: 2px 8px 8px;
        max-height: 300px;
        overflow-y: auto;
      }
    }
    .wb-search {
      width: 100%;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      border: 1px solid #666;
      border-radius: 4px;
      padding: 4px 8px;
      font-family: inherit;
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
    // FT-855: structured pills — the single truth of active filters.
    .wb-pill-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 5px;
      margin-bottom: 6px;
      font-size: 13px;
      .wb-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 1px 8px;
        border-radius: 999px;
        background: rgba(160, 20, 20, 0.22);
        border: 1px solid #7d0e0e;
        .facet {
          opacity: 0.65;
        }
        .verb {
          cursor: pointer;
          font-weight: bold;
          text-decoration: underline dotted;
          &:hover {
            color: #ff8a8a;
          }
        }
        .val {
          font-weight: bold;
        }
        .x {
          cursor: pointer;
          margin-left: 2px;
          opacity: 0.7;
          &:hover {
            color: red;
            opacity: 1;
          }
        }
        &.negative {
          background: rgba(0, 0, 0, 0.55);
          .verb {
            color: #ff8a8a;
          }
          .val {
            text-decoration: line-through;
            opacity: 0.85;
          }
        }
      }
      .wb-addfilter {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 1px 10px;
        border-radius: 999px;
        border: 1px dashed #555;
        cursor: pointer;
        opacity: 0.85;
        svg {
          width: 11px;
        }
        &:hover,
        &.open {
          border-color: #a01414;
          color: #ff8a8a;
        }
      }
      .wb-clearall {
        cursor: pointer;
        color: #ff8a8a;
        font-size: 12px;
        &:hover {
          color: red;
        }
      }
      .wb-results {
        margin-left: auto;
        font-size: 12px;
        opacity: 0.6;
      }
    }
    // FT-855 r2: facet groups inside the filter box.
    .wb-filterbox .fb-body {
      .facet-group h5.facet-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin: 5px 0 2px;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        opacity: 0.65;
        cursor: pointer;
        // chevron on the RIGHT (user call)
        .caret {
          font-size: 9px;
          transform: rotate(-90deg);
          transition: transform 150ms;
        }
        &.open .caret {
          transform: rotate(0deg);
        }
        em {
          font-style: normal;
          color: #ff8a8a;
          letter-spacing: 0;
        }
        &:hover {
          opacity: 1;
        }
      }
      .facet-val {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 8px;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        &:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        &.zero {
          opacity: 0.35;
        }
        &.active {
          background: rgba(160, 20, 20, 0.2);
        }
        .vlabel em {
          font-style: normal;
          font-size: 11px;
          color: #ff8a8a;
          margin-left: 4px;
        }
        .vcount {
          opacity: 0.55;
          font-size: 12px;
        }
      }
    }
    .wb-all-roles {
      flex-grow: 1;
      overflow-y: auto;
      display: block;
      min-height: 0;
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

  .wb-main {
    flex-grow: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    .wb-views {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 3px;
      margin-bottom: 6px;
      // the meter rides the tab line, right-aligned
      .wb-meter {
        margin-left: auto;
        padding-right: 4px;
      }
      // in the app's idiom (user call): dark plates, blood on the active,
      // and the TITLE's lettering (PiratesBay — what "Almanac" wears)
      .wb-tab {
        cursor: pointer;
        padding: 3px 16px;
        border-radius: 5px;
        background: rgba(0, 0, 0, 0.55);
        border: 1px solid #3d3d3d;
        font-family: PiratesBay, sans-serif;
        letter-spacing: 1px;
        &:hover {
          border-color: #7d0e0e;
          color: #ff8a8a;
        }
        &.active {
          background: rgba(160, 20, 20, 0.28);
          border-color: #a01414;
          font-weight: bold;
          text-shadow: 0 0 6px rgba(255, 60, 60, 0.5);
        }
      }
    }
    .wb-empty {
      color: rgba(255, 255, 255, 0.6);
      padding: 40px;
      text-align: center;
      font-size: 110%;
    }
    .wb-groups {
      overflow-y: auto;
      flex-grow: 1;
      min-height: 0;
      // Each group is a BOX in its team's color (user-directed, from the
      // official almanac reference) — night-view groups keep a neutral frame.
      section {
        margin-bottom: 12px;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 4px;
        padding: 8px 12px 10px;
        @each $team, $color in $team-colors {
          &.team-#{$team} {
            border-color: $color;
          }
        }
        &.dim {
          opacity: 0.55;
        }
        h4 {
          margin: 0 0 8px;
          small {
            font-weight: normal;
            opacity: 0.6;
          }
        }
      }
    }
    .wb-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 8px 14px;
      align-items: stretch;
    }
    // The reference layout: a LARGE icon on the left, a small bold name, the
    // ability as the body. No team accent on the card — the group box says it.
    .wb-card {
      position: relative;
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr);
      grid-template-rows: auto 1fr;
      column-gap: 10px;
      padding: 4px 26px 4px 6px;
      .icon {
        grid-row: 1 / span 2;
        width: 64px;
        height: 64px;
        background-size: cover;
        background-position: center;
      }
      .wb-card-head {
        display: flex;
        align-items: baseline;
        gap: 8px;
        font-weight: bold;
        font-size: 92%;
        .night-num {
          font-weight: normal;
          opacity: 0.7;
          font-size: 85%;
        }
      }
      .wb-card-ability {
        grid-column: 2;
        font-size: 82%;
        opacity: 0.85;
        line-height: 1.3;
      }
      // pinned to the card's TOP RIGHT; shows only while hovering the ROLE,
      // and the × itself reddens on its own hover (user call 2026-08-17)
      .wb-card-actions {
        position: absolute;
        top: 4px;
        right: 6px;
        display: flex;
        gap: 8px;
        opacity: 0;
        transition: opacity 0.15s;
        svg {
          cursor: pointer;
          width: 12px;
          &:hover {
            color: red;
          }
        }
      }
      &:hover .wb-card-actions {
        opacity: 1;
      }
    }
  }

  // FT-854: the night views — one ordered list, drag to reorder.
  .wb-night {
    .wb-order {
      display: block;
      li {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 3px 8px;
        border-radius: 4px;
        border-top: 2px solid transparent;
        border-bottom: 2px solid transparent;
        cursor: grab;
        &:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        &.dragging {
          opacity: 0.35;
        }
        &.over-before {
          border-top-color: #a01414;
        }
        &.over-after {
          border-bottom-color: #a01414;
        }
        .grip {
          opacity: 0.4;
          font-size: 14px;
          cursor: grab;
        }
        .ord {
          width: 26px;
          text-align: right;
          font-size: 13px;
          opacity: 0.6;
          flex-shrink: 0;
        }
        .icon {
          width: 34px;
          height: 34px;
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
        }
        .wb-row-name {
          font-weight: bold;
          font-size: 14px;
          width: 170px;
          flex-shrink: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .wb-row-ability {
          flex-grow: 1;
          min-width: 0;
          font-size: 13px;
          opacity: 0.8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .wb-card-actions {
          display: flex;
          gap: 8px;
          opacity: 0;
          svg {
            cursor: pointer;
            width: 12px;
            &:hover {
              color: red;
            }
          }
        }
        &:hover .wb-card-actions {
          opacity: 1;
        }
      }
    }
    .wb-sleepers {
      &.drop-target {
        border-color: #a01414;
        border-style: dashed;
      }
      .hint-drop {
        color: #ff8a8a;
        font-weight: normal;
      }
      .wb-order li {
        cursor: grab;
      }
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
      transition: border-color 150ms, background-color 150ms;
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

  // the shelf's hover card — icon left, bold name, ability body; the
  // border wears the role's team color (user call)
  // 1.5x (user call): bigger art, bigger type, wider card
  .wb-role-tip {
    position: fixed;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    max-width: 460px;
    padding: 14px 20px;
    @each $team, $color in $team-colors {
      &.team-#{$team} {
        border-color: rgba($color, 0.75);
      }
    }
    background: rgba(10, 4, 4, 0.97);
    border: 2px solid #400;
    border-radius: 10px;
    box-shadow: 0 0 14px black;
    z-index: 60;
    pointer-events: none;
    text-align: left;
    .icon {
      width: 78px;
      height: 78px;
      flex-shrink: 0;
      background-size: cover;
      background-position: center;
    }
    .txt {
      display: flex;
      flex-direction: column;
      gap: 5px;
      b {
        font-size: 22px;
      }
      .ability {
        font-size: 19px;
        line-height: 1.35;
        opacity: 0.9;
      }
    }
  }

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
