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
      <!-- the composition meter rides the tab line; icon + count per
           team, tinted in the team's color (icon REPLACES text —
           the word lives on the tooltip) -->
      <div
        class="wb-meter"
        :class="{ nonconforming: !servableCounts.length }"
        :title="
          servableCounts.length
            ? 'Plays ' + servableRange + ' players'
            : 'No standard player count fits this composition'
        "
      >
        <!-- our own team art for all four now (golem/glyphs): the many,
             the loner, the cowl, the horned head — no Font Awesome -->
        <span class="chip team-townsfolk" title="Townsfolk">
          <img class="demon-glyph" :src="teamGlyph('townsfolk')" alt="" />{{
            teamCounts.townsfolk
          }}
        </span>
        <span class="chip team-outsider" title="Outsiders">
          <img class="demon-glyph" :src="teamGlyph('outsider')" alt="" />{{
            teamCounts.outsider
          }}
        </span>
        <span class="chip team-minion" title="Minions">
          <img class="demon-glyph" :src="teamGlyph('minion')" alt="" />{{
            teamCounts.minion
          }}
        </span>
        <span class="chip team-demon" title="Demons">
          <img class="demon-glyph" :src="teamGlyph('demon')" alt="" />
          {{ teamCounts.demon }}
        </span>
        <!-- unsaved edits: Save / Discard appear ONLY when dirty
             (user call — the actions row lost its Save button) -->
        <span class="wb-dirty" v-if="editable && dirty">
          <font-awesome-icon
            icon="check"
            class="save"
            title="Save this script to the vault"
            @click="$emit('save')"
          />
          <font-awesome-icon
            icon="undo"
            class="discard"
            title="Discard the edits — back to the last saved state"
            @click="$emit('discard')"
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
// One definition of "the glyph for team X" (golem/glyphs), shared with
// TownInfo, RoleDrawer and EditionModal.
import { teamGlyph as teamGlyphSrc } from "../golem/glyphs";

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
    // the composition meter gets its OWN row, centred above the list
    // (user call 2026-08-18 — right-aligned on the tab line it read as a
    // stray cluster in the corner)
    .wb-meter {
      flex: 1 1 100%;
      justify-content: center;
      padding: 2px 0 0;
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
