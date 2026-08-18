<template>
  <!--
    Golem fork (FT-858): THE role hover card — one component, used by every
    surface that wants to say "here is this character" under the cursor
    (user-directed: change it once, all of them change).

    Consumers today:
      · the Almanac workbench's role shelf   (EditionModal)
      · the seat / bluff / fabled coin       (Token → the square + the pickers)
      · the grimoire drawer's role rows      (RoleDrawer)

    It parks itself on document.body and speaks viewport coordinates, so no
    ancestor's transform, overflow or stacking context can clip it — the seats
    in the square are rotated inside a clipped circle, and the shelf lives in a
    scrolling column.
  -->
  <div
    class="role-hover-card"
    :class="'team-' + teamKey"
    :style="style"
    ref="card"
  >
    <span
      class="icon"
      :style="{ backgroundImage: `url(${iconSrc})` }"
      v-if="iconSrc"
    ></span>
    <span class="txt">
      <b>{{ role.name }}</b>
      <span class="ability" v-if="abilityText">{{ abilityText }}</span>
      <!-- the role's tags as chips (team rides the border, so it stays off
           the chips) -->
      <span class="tip-chips" v-if="shownChips.length">
        <span class="tip-chip" v-for="c in shownChips" :key="c">{{ c }}</span>
      </span>
    </span>
  </div>
</template>

<script>
import { mapState } from "vuex";
import editionJSON from "../editions.json";
import rolesJSON from "../roles.json";

// Which official roles came from where — the same labels the workbench's tag
// filter uses, so a chip reads identically on both surfaces.
const EDITION_LABELS = {
  tb: "Trouble Brewing",
  bmr: "Bad Moon Rising",
  snv: "Sects & Violets"
};
const LUF_ROLES = new Set(
  (editionJSON.find(e => e.id === "luf") || { roles: [] }).roles
);
const OFFICIAL_IDS = new Set(rolesJSON.map(r => r.id));
const TEAMS = [
  "townsfolk",
  "outsider",
  "minion",
  "demon",
  "traveler",
  "fabled"
];
// how far the card sits off whatever it is describing
const GAP = 12;

export default {
  name: "RoleHoverCard",
  props: {
    /** Anything role-shaped: a store role, a roles.json row, or the
     *  workbench's shelf entry (which carries its own `iconUrl`). */
    role: { type: Object, required: true },
    /** The element the card describes. Measured fresh at position time, so a
     *  seat that has moved since the hover began still anchors correctly. */
    anchor: { default: null },
    /** Explicit chip labels. `null` (the default) derives them from the role;
     *  pass `[]` for a card with no chips at all. */
    chips: { type: Array, default: null },
    /** Shown when the role carries no ability text of its own. */
    fallbackAbility: { type: String, default: "" },
    /** `side` puts the card beside the anchor (the shelf, the drawer, a seat);
     *  it falls back to above/below when neither side has room. */
    placement: { type: String, default: "side" }
  },
  data() {
    return {
      // parked off-screen until the first measurement lands
      style: { top: "-9999px", left: "-9999px" }
    };
  },
  computed: {
    ...mapState(["grimoire"]),
    teamKey() {
      const t = (this.role.team || "").toLowerCase();
      return TEAMS.includes(t) ? t : "townsfolk";
    },
    abilityText() {
      return this.role.ability || this.fallbackAbility;
    },
    /**
     * The role's engraving. Shelf entries hand us a resolved `iconUrl`; store
     * roles carry `id` / `imageAlt` / a custom `image` (only honoured when the
     * grimoire opted into remote art, matching Token).
     */
    iconSrc() {
      const r = this.role;
      if (r.iconUrl) return r.iconUrl;
      if (r.golemIconData) return r.golemIconData;
      const optIn = this.grimoire && this.grimoire.isImageOptIn;
      if (r.image && (optIn || r.image.startsWith("data:"))) return r.image;
      const id = r.imageAlt || r.id;
      if (id) {
        try {
          return require("../assets/icons/" + id + ".png");
        } catch (e) {
          // falls through to the generic mark
        }
      }
      try {
        return require("../assets/icons/custom.png");
      } catch (e) {
        return "";
      }
    },
    shownChips() {
      return this.chips === null ? this.derivedChips : this.chips;
    },
    /**
     * What is provable about the role from the role alone: where it came
     * from, when it wakes, whether it bends setup. Never claims a fact the
     * role does not carry — a custom role with no night fields gets no night
     * chip rather than a wrong "Never wakes".
     */
    derivedChips() {
      const r = this.role;
      const out = [];
      if (EDITION_LABELS[r.edition]) out.push(EDITION_LABELS[r.edition]);
      else if (LUF_ROLES.has(r.id)) out.push("Laissez un Faire");
      else if (OFFICIAL_IDS.has(r.id)) out.push("Experimental");
      const first = r.firstNight > 0 || !!r.firstNightReminder;
      const other = r.otherNight > 0 || !!r.otherNightReminder;
      const knowsNights =
        "firstNight" in r ||
        "otherNight" in r ||
        "firstNightReminder" in r ||
        "otherNightReminder" in r;
      if (first) out.push("Wakes first night");
      if (other) out.push("Wakes other nights");
      if (!first && !other && knowsNights) out.push("Never wakes");
      if (r.setup) out.push("Affects setup");
      return out;
    }
  },
  mounted() {
    this.hoist();
    this.place();
    // a scroll or a resize moves whatever we are pinned to; the card cannot
    // hide itself (the consumer owns the v-if), so it asks
    window.addEventListener("scroll", this.onDismiss, true);
    window.addEventListener("resize", this.onDismiss);
  },
  beforeDestroy() {
    window.removeEventListener("scroll", this.onDismiss, true);
    window.removeEventListener("resize", this.onDismiss);
    // We took the element out of our own subtree, so we have to put it away
    // ourselves: when a CONSUMER is torn down whole — a seat removed from the
    // square while its card is up — the framework removes the seat's node and
    // never touches the card, which would sit on the body for the rest of the
    // session. (Vue guards its own later removal on the node still having a
    // parent, so doing it here is safe.)
    const el = this.$el;
    if (el && el.parentElement === document.body)
      document.body.removeChild(el);
  },
  watch: {
    anchor() {
      this.place();
    },
    role() {
      this.place();
    }
  },
  methods: {
    onDismiss() {
      this.$emit("dismiss");
    },
    /**
     * The card is `position: fixed`, and a transformed ancestor re-roots what
     * "fixed" means — the seats in the square sit inside rotated, clipped
     * boxes. Parked on the body it always speaks the viewport.
     */
    hoist() {
      const el = this.$el;
      if (el && el.parentElement !== document.body)
        document.body.appendChild(el);
    },
    /** The anchor's live box, whether we were handed an element or a rect. */
    anchorRect() {
      const a = this.anchor;
      if (!a) return null;
      if (typeof a.getBoundingClientRect === "function")
        return a.getBoundingClientRect();
      return a;
    },
    /**
     * Beside the anchor by preference (right, then left), vertically centred
     * on it and clamped into the viewport; above or below when neither side
     * has room. Measured twice — once now, once after the browser has laid
     * the card out — because a box measured at its off-screen park position
     * reports a stale width, and a right-edge clamp then turns that into a
     * squeezed column pinned to the wrong side of the screen.
     */
    place() {
      const el = this.$el;
      const rect = this.anchorRect();
      if (!el || !rect) return;
      this.hoist();
      const run = () => {
        const m = 8;
        const box = el.getBoundingClientRect();
        const w = box.width;
        const h = box.height;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const clamp = (v, max) => Math.min(Math.max(v, m), Math.max(m, max));
        let left;
        let top;
        const fitsRight = rect.right + GAP + w <= vw - m;
        const fitsLeft = rect.left - GAP - w >= m;
        if (this.placement === "side" && (fitsRight || fitsLeft)) {
          left = fitsRight ? rect.right + GAP : rect.left - GAP - w;
          top = clamp(rect.top + rect.height / 2 - h / 2, vh - h - m);
        } else {
          // stacked: centred on the anchor, above it when there is room
          left = clamp(rect.left + rect.width / 2 - w / 2, vw - w - m);
          top =
            rect.top - GAP - h >= m
              ? rect.top - GAP - h
              : clamp(rect.bottom + GAP, vh - h - m);
        }
        this.style = { top: `${Math.round(top)}px`, left: `${Math.round(left)}px` };
      };
      run();
      requestAnimationFrame(run);
    }
  }
};
</script>

<style scoped lang="scss">
// Kept local per component (the workbench and the drawer each hold their own
// copy of this map).
$team-colors: (
  "townsfolk": #1f65ff,
  "outsider": #46d5ff,
  "minion": #ff6900,
  "demon": #ce0100,
  "traveler": #cc04ff,
  "fabled": #ffe91f
);

// TOP-LEVEL, never nested under a consumer's selector: the card is reparented
// to document.body, so a descendant rule would leave it unstyled the moment
// it moved.
.role-hover-card {
  position: fixed;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  // sized by its own text, never by whatever space is left where it parks
  width: max-content;
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
  // above the square, the drawers and the modals alike
  z-index: 200;
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
  .tip-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 5px;
  }
  .tip-chip {
    font-size: 10px;
    padding: 1px 7px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 8px;
    opacity: 0.8;
    white-space: nowrap;
  }
}

// a narrow window has no room for the full-fat card
@media (max-width: 640px) {
  .role-hover-card {
    max-width: 90vw;
    gap: 10px;
    padding: 10px 14px;
    .icon {
      width: 54px;
      height: 54px;
    }
    .txt b {
      font-size: 17px;
    }
    .txt .ability {
      font-size: 15px;
    }
  }
}
</style>
