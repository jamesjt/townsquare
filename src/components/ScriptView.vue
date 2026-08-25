<template>
  <!-- Golem fork (FT-857): THE script view — one component, two surfaces.
       The workbench (EditionModal) renders it with :editable="true" and owns
       every mutation; the player-facing drawer renders the same markup with
       :editable="false". A change here shows up in both places, which is the
       whole point of the extraction. -->
  <main class="wb-main script-view" :class="{ narrow }">
    <div class="wb-views">
      <span
        class="wb-tab"
        :class="{ active: view === 'team' }"
        @click="setView('team')"
        ><!-- "By type" described the SORT; this tab is the script itself,
             and its two siblings are the two night orders (user call
             2026-08-19) -->Script</span
      >
      <span
        class="wb-tab"
        :class="{ active: view === 'first' }"
        @click="setView('first')"
        ><img class="tab-moon" :src="moonFirst" alt="" />First night</span
      >
      <span
        class="wb-tab"
        :class="{ active: view === 'other' }"
        @click="setView('other')"
        ><img class="tab-moon" :src="moonOther" alt="" />Other nights</span
      >
      <!-- FT-1039: the meter shares the tab ROW (user call 2026-08-21) and
           its counts FOLLOW the tab — the whole script on Script, who wakes
           that night on the two night tabs. Icon + count per team, tinted in
           the team's color (icon REPLACES text — the word lives on the
           tooltip, and the tooltip names the night when a night tab is up). -->
      <div
        class="wb-meter"
        :class="{ nonconforming: !servableCounts.length }"
        :title="meterTitle"
      >
        <!-- our own team art for all four (golem/glyphs): the many, the
             loner, the cowl, the horned head — no Font Awesome -->
        <span
          v-for="t in meterTeams"
          :key="t"
          :class="['chip', 'team-' + t]"
          :title="chipTitle(t)"
        >
          <img class="demon-glyph" :src="teamGlyph(t)" alt="" />{{
            meterCounts[t]
          }}
        </span>
        <!-- unsaved edits: Save / Discard appear ONLY when dirty
             (user call — the actions row lost its Save button) -->
        <!-- FT-1127 (user: "seems we have two save discards? which one is
             real?"). BOTH were real — this pair and the builder header's
             labelled plate call the same two handlers, `saveToVault` and
             `discardEdits`, one through an emit and one directly. Nothing
             chose between them, so the answer to "which is real" was "both,
             identically", which is the worst answer a duplicated control can
             give.

             This one is the elder. It was added when the actions row had no
             Save button at all; FT-1043 then gave the header its standard
             Save/Discard plate and nobody retired this. The plate wins: it
             carries WORDS, it sits with the other script actions, and it is
             the same object the forge's own header wears — while this pair
             is two bare glyphs living in a row of team counts, which is a
             place for reading, not for pressing.

             Stood down rather than deleted, per the house rule; the emits and
             the styling below stay intact, so restoring it is this one
             condition. -->
        <span class="wb-dirty" v-if="false && editable && dirty">
          <font-awesome-icon
            icon="undo"
            class="discard"
            title="Discard the edits — back to the last saved state"
            @click="$emit('discard')"
          />
          <!-- discard LEFT, save RIGHT (user call). The save wears the
               quill in its inkwell — the same mark the chronicle door
               carries — because saving the script IS writing it down.
               Sized like .tab-moon beside it, never a raw <img> at its
               natural size. -->
          <img
            class="save"
            :src="quill"
            alt=""
            title="Save this script to the vault"
            @click="$emit('save')"
          />
        </span>
        <!-- the servable range rides the tooltip now (user call:
             the green sentence was noise); only the WARNING renders, and
             only beside the composition it judges (the Script tab) — a
             composition verdict next to wake counts would read as a claim
             about the night. -->
        <span class="verdict" v-if="view === 'team' && !servableCounts.length">
          <font-awesome-icon icon="exclamation-triangle" />
          outside the rules — still playable
        </span>
      </div>
    </div>
    <div class="wb-empty" v-if="!roles.length">
      <template v-if="editable"
        >An empty page. Add roles from the shelf on the left, or pick a script
        above.</template
      >
      <template v-else>This script has no roles yet.</template>
    </div>
    <!-- Night views: ONE ordered list, drag to reorder (user call).
         A drop writes real night numbers (midpoint between the new
         neighbors), so the storyteller's night sheet follows. Dragging
         a sleeper into the list starts it waking; dropping a waker on
         the Don't-wake box stops it. Read-only surfaces get the same
         list without the grips or the drop targets. -->
    <div class="wb-groups wb-night" v-blood-scroll v-else-if="view !== 'team'">
      <section>
        <h4>
          {{ view === "first" ? "Wake the first night" : "Wake on other nights" }}
          <small>({{ nightWakers.length }})</small>
        </h4>
        <ul class="wb-order" :class="{ 'read-only': !editable }">
          <li
            v-for="(role, i) in nightWakers"
            :key="role.id"
            :draggable="editable ? 'true' : 'false'"
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
            <span class="grip" v-if="editable" title="Drag to reorder">⠿</span>
            <span class="ord">{{ i + 1 }}</span>
            <span
              class="icon"
              :style="{ backgroundImage: `url(${roleIconUrl(role)})` }"
            ></span>
            <span class="wb-row-name">{{ role.name }}</span>
            <span class="wb-row-ability">{{ role.ability }}</span>
            <span class="wb-card-actions" v-if="editable">
              <font-awesome-icon
                v-if="role.isCustom"
                icon="pen"
                title="Edit this role"
                @click.stop="$emit('edit', role)"
              />
              <font-awesome-icon
                icon="times"
                title="Remove from script"
                @click.stop="$emit('remove', role.id)"
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
        v-if="editable && (nightSleepers.length || dragId)"
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
                @click.stop="$emit('edit', role)"
              />
              <font-awesome-icon
                icon="times"
                title="Remove from script"
                @click.stop="$emit('remove', role.id)"
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
          <!-- the type's own glyph, the same one the meter wears -->
          <img
            v-if="teamGlyph(group.team)"
            class="team-glyph"
            :src="teamGlyph(group.team)"
            alt=""
          />
          <font-awesome-icon
            v-else-if="teamIcon(group.team)"
            class="team-glyph-fa"
            :icon="teamIcon(group.team)"
          />
          {{ group.label }} <small>({{ group.roles.length }})</small>
          <font-awesome-icon
            class="caret"
            icon="chevron-down"
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
              <span class="night-num" v-if="view !== 'team'">
                {{ view === "first" ? role.firstNight : role.otherNight }}
              </span>
            </span>
            <span class="wb-card-ability">{{ role.ability }}</span>
            <span class="wb-card-actions" v-if="editable">
              <font-awesome-icon
                v-if="role.isCustom"
                icon="pen"
                title="Edit this role"
                @click.stop="$emit('edit', role)"
              />
              <font-awesome-icon
                icon="times"
                title="Remove from script"
                @click.stop="$emit('remove', role.id)"
              />
            </span>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<script>
import {
  TEAM_LABELS,
  normTeam,
  countTeams,
  servableFor,
  servableText
} from "../golem/composition";
// The user's demon mask + outsider face (design/red/*, cut + baked).
import demonGlyph from "../assets/blood/demon-glyph.png";
// the night tabs wear moon PHASES: a crescent for the first night, the rest
// of that moon for the other nights — together they make the full moon a
// role wearing both nights gets
import moonFirst from "../assets/moon-first.png";
import moonOther from "../assets/moon-other.png";
import moonFull from "../assets/moon-full.png";
import outsiderGlyph from "../assets/blood/outsider-glyph.png";
// the save mark: the quill in its inkwell, the same art the chronicle door
// wears — saving the script is writing it down
import quill from "../assets/ui-chronicle.png";
// One definition of "the glyph for team X" (golem/glyphs), shared with
// TownInfo, RoleDrawer and EditionModal.
import { teamGlyph as teamGlyphSrc } from "../golem/glyphs";
// FT-1039: ONE definition of "does the seat wake" (golem/nightInfo) — the
// same predicate the workbench's night chips and the hover card's chip read,
// so the meter's night counts can never disagree with either.
import { wakesOn } from "../golem/nightInfo";

export default {
  name: "ScriptView",
  props: {
    /** The script's roles — the workbench passes the live store list, the
     *  drawer passes the same thing read-only. */
    roles: {
      type: Array,
      default: () => []
    },
    /**
     * The affordance switch. TRUE gives the workbench: drag-to-reorder the
     * night order, the per-role remove/edit actions, the Don't-wake drop box
     * and the dirty Save/Discard chips. FALSE is the player's read-only
     * sheet — identical layout, none of the handles.
     */
    editable: {
      type: Boolean,
      default: false
    },
    /** Only meaningful when editable: shows the Save/Discard chips. */
    dirty: {
      type: Boolean,
      default: false
    },
    /** Which tab to open on — "team" | "first" | "other". */
    initialView: {
      type: String,
      default: "team"
    }
  },
  data() {
    return {
      demonGlyph,
      outsiderGlyph,
      quill,
      moonFirst,
      moonOther,
      moonFull,
      view: this.initialView || "team",
      // By-type group folding (click the header)
      foldedGroups: {},
      // night-order drag state
      dragId: null,
      dragOverId: null,
      dragAfter: false,
      // set by measure() — the view reflows for a narrow drawer
      narrow: false
    };
  },
  computed: {
    teamCounts() {
      return countTeams(this.roles);
    },
    /** Player counts the pool can serve under the official table. */
    servableCounts() {
      return servableFor(this.teamCounts);
    },
    /** "5–15" / "5, 7, 10–13" — collapse runs for the meter. */
    servableRange() {
      return servableText(this.servableCounts);
    },
    // ── FT-1039: the meter follows the tab ───────────────────────────────
    meterTeams() {
      return ["townsfolk", "outsider", "minion", "demon"];
    },
    /** Script tab: the whole script's counts. Night tabs: how many of each
     *  team WAKE that night (wakesOn — Demons and Minions wake night one via
     *  the group step, and these counts agree with the sidebar's night
     *  chips because both read the same predicate). */
    meterCounts() {
      if (this.view === "team") return this.teamCounts;
      const counts = { townsfolk: 0, outsider: 0, minion: 0, demon: 0 };
      this.roles.forEach((r) => {
        const team = normTeam(r.team);
        if (counts[team] === undefined) return;
        const w = wakesOn(r);
        if (this.view === "first" ? w.first : w.other) counts[team] += 1;
      });
      return counts;
    },
    /** The "Plays 5–15" reading belongs to the composition, so it rides the
     *  Script tab only; the night tabs say what their counts mean. */
    meterTitle() {
      if (this.view === "first")
        return "How many of each team wake the first night";
      if (this.view === "other")
        return "How many of each team wake on other nights";
      return this.servableCounts.length
        ? "Plays " + this.servableRange + " players"
        : "No standard player count fits this composition";
    },
    /** The by-team groups. Travellers never render here — town-side content. */
    viewGroups() {
      const roles = this.roles.filter(r => normTeam(r.team) !== "traveler");
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
      const prop = this.view === "first" ? "firstNight" : "otherNight";
      return this.roles
        .filter(r => normTeam(r.team) !== "traveler" && (r[prop] || 0) > 0)
        .sort((a, b) => a[prop] - b[prop] || a.name.localeCompare(b.name));
    },
    nightSleepers() {
      const prop = this.view === "first" ? "firstNight" : "otherNight";
      return this.roles
        .filter(r => normTeam(r.team) !== "traveler" && !(r[prop] || 0))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    /** Is the role being dragged currently a waker (in this view)? */
    draggedWakes() {
      return this.nightWakers.some(r => r.id === this.dragId);
    }
  },
  mounted() {
    this.measure();
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(() => this.measure());
      this.ro.observe(this.$el);
    }
  },
  beforeDestroy() {
    if (this.ro) this.ro.disconnect();
  },
  watch: {
    // the drawer re-points the tab while it is already open (the night icon
    // lands on First night)
    initialView(next) {
      if (next && next !== this.view) this.view = next;
    }
  },
  methods: {
    /** The type's own art — every team has ours now, defined once in
     *  golem/glyphs and shared with TownInfo, RoleDrawer and EditionModal.
     *  teamIcon below stays as the fallback for a team the map lacks. */
    teamGlyph(team) {
      return teamGlyphSrc(team);
    },
    /** FT-1039: the chip's word (tooltip) says what its number is counting —
     *  the team on the Script tab, the team's wakers on a night tab. */
    chipTitle(team) {
      const label = TEAM_LABELS[team];
      if (this.view === "first") return label + " that wake the first night";
      if (this.view === "other") return label + " that wake on other nights";
      return label;
    },
    teamIcon(team) {
      if (team === "townsfolk") return "users";
      if (team === "minion") return "mask";
      return null;
    },
    /** The view reflows below ~460px so it stays readable in a narrow drawer:
     *  one card per row, and night rows drop their ability under the name
     *  instead of clipping it. The workbench never gets that narrow, so its
     *  layout is untouched. */
    measure() {
      const w = this.$el && this.$el.clientWidth;
      if (w) this.narrow = w < 460;
    },
    setView(view) {
      this.view = view;
      this.$emit("view", view);
    },
    toggleGroupFold(label) {
      this.$set(this.foldedGroups, label, !this.foldedGroups[label]);
    },
    iconUrl(id) {
      try {
        return require("../assets/icons/" + id + ".png");
      } catch (e) {
        return require("../assets/icons/custom.png");
      }
    },
    /** The icon for any script role — official art, borrowed art, or generic. */
    roleIconUrl(role) {
      if (role.golemIconData) return role.golemIconData;
      const base = this.$store.getters.rolesJSONbyId;
      if (base.has(role.id)) return this.iconUrl(role.id);
      return this.iconUrl(role.imageAlt || "custom");
    },
    // ── FT-854: night-order drag-reorder (editable surfaces only) ────────
    onDragStart(role) {
      if (!this.editable) return;
      this.dragId = role.id;
    },
    onRowDragOver(e, role) {
      if (!this.editable) return;
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
     * back to a small offset. The write itself is the owner's job — we emit
     * set-night and the workbench commits it.
     */
    onRowDrop(target) {
      if (!this.editable) return;
      const dragged = this.roles.find(r => r.id === this.dragId);
      const after = this.dragAfter;
      this.resetDrag();
      if (!dragged || dragged.id === target.id) return;
      const prop = this.view === "first" ? "firstNight" : "otherNight";
      const list = this.nightWakers.filter(r => r.id !== dragged.id);
      let at = list.findIndex(r => r.id === target.id);
      if (at < 0) return;
      if (after) at += 1;
      const prev = at > 0 ? list[at - 1][prop] : 0;
      const next = at < list.length ? list[at][prop] : prev + 2;
      let value = (prev + next) / 2;
      if (!(value > prev && value < next)) value = prev + 0.5;
      this.$emit("set-night", { id: dragged.id, prop, value });
    },
    /** Drop a waker onto the Don't-wake box: it stops waking (0). */
    onSleeperDrop() {
      if (!this.editable) return;
      const dragged = this.roles.find(r => r.id === this.dragId);
      const wasWaking = this.draggedWakes;
      this.resetDrag();
      if (!dragged || !wasWaking) return;
      const prop = this.view === "first" ? "firstNight" : "otherNight";
      this.$emit("set-night", { id: dragged.id, prop, value: 0 });
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";
// FT-1043: $grimoire-plum for the dirty cluster — variables/mixins only,
// importing it adds no rules to this sheet.
@import "../controls.scss";

// the workbench's team palette (its map lives in EditionModal's scope)
$team-colors: (
  "townsfolk": #1f65ff,
  "outsider": #46d5ff,
  "minion": #ff6900,
  "demon": #ce0100,
  "traveler": #cc04ff
);

.wb-main {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  text-align: left;
  .wb-views {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 3px;
    margin-bottom: 6px;
    // FT-1039: the meter RIDES the tab row, right of the tabs (user call
    // 2026-08-21 — "put both of those things in the same row"; supersedes
    // the 2026-08-18 own-row call, and the counts now follow the active
    // tab, which is what makes them the tab row's business).
    .wb-meter {
      margin-left: auto;
    }
    // in the app's idiom (user call): dark plates, blood on the active,
    // and the TITLE's lettering (PiratesBay — what "Almanac" wears)
    .wb-tab {
      display: inline-flex;
      align-items: center;
      // Narrow enough that all three sit on ONE line in the drawer (user call
      // 2026-08-18 — they were wrapping, and a wrapped tab strip reads as two
      // groups rather than one choice). The ink shrinks, not the target: the
      // padding was doing nothing a smaller tracking and a tighter gap could
      // not do, and the label never breaks mid-word now.
      gap: 5px;
      cursor: pointer;
      padding: 3px 9px;
      font-size: 88%;
      letter-spacing: 0.5px;
      white-space: nowrap;
      border-radius: 5px;
      background: rgba(0, 0, 0, 0.55);
      border: 1px solid #3d3d3d;
      font-family: PiratesBay, sans-serif;
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
    // unsaved-edit controls: visible only while dirty. FT-1043: the frame is
    // $grimoire-plum — the standardized Save/Discard purple the forge's and
    // the builder's plates wear; saving is constructive, not blood.
    .wb-dirty {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-left: 10px;
      padding: 2px 10px;
      border: 1px solid $grimoire-plum;
      border-radius: 10px;
      svg {
        cursor: pointer;
        width: 14px;
        height: 14px;
      }
      // the quill is ART, not a glyph — it carries its own box the way
      // .tab-moon above does, so it never renders at natural size and
      // shoves the meter row out of line
      img.save {
        cursor: pointer;
        width: 16px;
        height: 16px;
        object-fit: contain;
        display: block;
        opacity: 0.9;
        transition:
          opacity 150ms,
          filter 150ms;
        &:hover {
          opacity: 1;
          filter: brightness(1.25);
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
  .tab-moon {
    width: 15px;
    height: 15px;
    object-fit: contain;
    opacity: 0.9;
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
    // By-type group folding: the header is the control
    h4.wb-fold {
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
  }
  .wb-cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 8px 14px;
    align-items: stretch;
  }
  // The reference layout: a LARGE icon on the left, a small bold name, the
  // ability as the body. No team accent on the card — the group box says it.
  // The card NAME wears its team colour (user call 2026-08-19). On a card the
  // name is the thing you scan for, and the icon beside it is already large
  // enough to carry its own team ring — so here the colour belongs on the
  // lettering, which is the opposite of the night-order ROW above, where the
  // name is small and the icon is the only mark with room to say it.
  @each $team, $color in $team-colors {
    section.team-#{$team} .wb-card-name {
      color: $color;
    }
  }
  section.team-demon .wb-card-name {
    color: lighten(#ce0100, 14%);
  }

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
      // 82 -> 76%: the ability is a reference line a storyteller SCANS, not
      // prose they read, and the cards fit meaningfully more of the script on
      // screen at the smaller size. Tightening the line-height with it would
      // have saved as much again and cost more legibility, so that stays.
      font-size: 76%;
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
      // The character art is NOT centred in its own file: measured across six
      // icons, the glyph's visual middle sits at 41.5% of the file height,
      // because the art is drawn to leave room for the name curving along the
      // bottom of a coin. In a round chip with no name, `cover` therefore hangs
      // the glyph high (user call 2026-08-19). Scaling past the box and lifting
      // the window re-centres it and fills the chip, which the untouched art
      // never did.
      .icon {
        width: 34px;
        height: 34px;
        background-size: 130%;
        background-repeat: no-repeat;
        background-position: center 13%;
        flex-shrink: 0;
      }
      .wb-row-name {
        font-weight: bold;
        // bigger type, and the name column only as wide as the longest name
        // actually needs — 170px left a corridor of dead space before the
        // ability (user call 2026-08-18)
        font-size: 16px;
        width: 124px;
        flex-shrink: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      // The ability WRAPS (user call 2026-08-19). Truncating it with an
      // ellipsis hid the half of the sentence that says what the character
      // actually does, on the one screen a storyteller reads to learn a
      // script — the row is allowed to be two lines.
      .wb-row-ability {
        flex-grow: 1;
        min-width: 0;
        font-size: 15px;
        opacity: 0.85;
        white-space: normal;
        overflow: visible;
        line-height: 1.3;
      }
      // The TEAM reads off the icon, not off the lettering (user call
      // 2026-08-19): a coloured mark is a stronger signal than coloured text,
      // and tinting the name fought its own legibility on parchment.
      @each $team, $color in $team-colors {
        &.team-#{$team} .icon {
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba($color, 0.85), 0 0 6px rgba($color, 0.4);
        }
      }
      .wb-row-name {
        color: inherit;
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
    // the read-only sheet keeps the layout, drops the grab affordance
    &.read-only li {
      cursor: default;
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

// the type's glyph, leading its group header
.wb-fold {
  .team-glyph {
    width: 16px;
    height: 16px;
    object-fit: contain;
    vertical-align: -2px;
  }
  .team-glyph-fa {
    width: 15px;
    opacity: 0.9;
  }
}

// NARROW (a drawer dragged in): one card per row, and the night list stacks
// its ability under the name instead of clipping it to an ellipsis. The
// workbench never reaches this width, so its layout is unchanged.
.wb-main.narrow {
  .wb-views {
    flex-wrap: wrap;
    row-gap: 4px;
  }
  .wb-cards {
    grid-template-columns: 1fr;
  }
  .wb-card {
    grid-template-columns: 44px minmax(0, 1fr);
    .icon {
      width: 44px;
      height: 44px;
    }
  }
  .wb-night .wb-order li {
    flex-wrap: wrap;
    .wb-row-name {
      width: auto;
      flex: 1 1 auto;
    }
    .wb-row-ability {
      flex: 1 1 100%;
      white-space: normal;
      overflow: visible;
      padding-left: 46px;
    }
  }
}
</style>
