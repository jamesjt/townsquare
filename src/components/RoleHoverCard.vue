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
    :class="['team-' + teamKey, { pinned }]"
    :style="style"
    ref="card"
  >
    <span
      class="icon"
      :style="{ backgroundImage: `url(${iconSrc})` }"
      v-if="iconSrc"
    ></span>
    <span class="txt">
      <!-- FT-1171 (user): "lets make role names the color of their team and
           after it put a · [role type icon] [role type]". The card already
           knew the team — it wore it on the BORDER, which is a colour you
           read only by comparison, and only if two cards are open at once.
           Saying it costs one line and answers the question the border was
           gesturing at. The name takes the team's own ink, then the glyph and
           the word, so a reader gets the fact three ways: colour for the
           glance, mark for the scan, word for certainty. -->
      <b class="rhc-name">{{ role.name }}</b>
      <span class="rhc-team">
        <span class="rhc-dot">·</span>
        <img class="rhc-team-mark" v-if="teamMark" :src="teamMark" alt="" />{{
          teamLabel
        }}
      </span>
      <span class="ability" v-if="abilityText">{{ abilityText }}</span>
      <!-- the role's tags as chips (team rides the border, so it stays off
           the chips) -->
      <span class="tip-chips" v-if="shownChips.length">
        <span class="tip-chip" v-for="c in shownChips" :key="c.label">
          <img class="chip-mark" v-if="c.icon" :src="c.icon" alt="" />{{ c.label }}
        </span>
      </span>
    </span>
  </div>
</template>

<script>
import { mapState } from "vuex";
import editionJSON from "../editions.json";
import rolesJSON from "../roles.json";
import { EDITION_ICONS, edCustom } from "../golem/editionArt";
// FT-1171: one definition of "the glyph for team X", shared with TownInfo,
// ScriptView, RoleDrawer and EditionModal rather than copied per surface.
import { teamGlyph } from "../golem/glyphs";

/** FT-1171: the retired script chip's switch. A named constant rather than a
 *  literal `false`, so the branch below stays readable code the linter does
 *  not flag as a constant condition — and so restoring it is one word. */
const SHOW_SCRIPT_CHIP = false;

/** FT-1171: the five teams in a reader's words. */
const TEAM_LABELS = {
  townsfolk: "Townsfolk",
  outsider: "Outsider",
  minion: "Minion",
  demon: "Demon",
  traveler: "Traveller"
};
// FT-887: when a character wakes is decided in ONE place, so the chip on this
// card and the coin's moon and the workbench's night filter cannot disagree —
// see golem/nightInfo's wakesOn().
import { wakesOn } from "../golem/nightInfo";
import moonFirst from "../assets/moon-first.png";
import moonOther from "../assets/moon-other.png";
import moonFull from "../assets/moon-full.png";
import setupGlyph from "../assets/blood/demon-glyph.png";

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
    placement: { type: String, default: "side" },
    /**
     * Hand the placement to CSS instead of measuring.
     *
     * A LANDSCAPE PHONE has no free space to place into: the ring fills the
     * left of the window and the panel column the right, so every answer the
     * measured placement can give lands on a chair (measured 812x375: the
     * armed card covered five seats). Pinned, the card stands in the same
     * right-hand column the build panel and the night sheet already use, and
     * the CSS rule at the bottom of this file owns its box.
     */
    pinned: { type: Boolean, default: false },
    /**
     * Which side to try FIRST when placing beside the anchor.
     *
     * "auto" leans away from the middle of the window, which is right for a
     * coin in the ring — the card lands in the empty margin instead of across
     * the neighbouring seats. A seat's NAME PLATE wants "right" instead (user
     * call 2026-08-19): it sits below the ring rather than in it, so there is
     * no neighbour to lie across, and a consistent side is easier to read than
     * one that flips depending on where the chair happens to sit.
     *
     * Either way the fallback is the other side, and then above/below — a
     * preference, never a promise to place off-screen.
     */
    prefer: { type: String, default: "auto" }
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
    /** FT-1171: the team's own mark, from the one definition every other
     *  surface reads (TownInfo's counts, the build panel's composition row,
     *  RoleDrawer's group headers). */
    teamMark() {
      return teamGlyph(this.teamKey);
    },
    /** FT-1171: the team in words. The app spells the travelling folk
     *  "traveler" in its data and "Traveller" to a reader — the same split
     *  EndGameOverlay already maps on the way out to the stats server. */
    teamLabel() {
      return TEAM_LABELS[this.teamKey] || "";
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
      if (this.chips === null) return this.derivedChips;
      // consumers may pass plain strings; the card draws {label, icon}
      return this.chips.map(c =>
        typeof c === "string" ? { label: c, icon: null } : c
      );
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
      const chip = (label, icon) => out.push({ label, icon: icon || null });
      // FT-1171 (user): "lets remove the script tag from the hover". Which
      // script a character came from is a fact about the LIBRARY, not about
      // the character in front of you — and while you are playing, every
      // character on the table is from the script you are playing, so the
      // chip said the same thing on every card. Stood down rather than
      // deleted, per the house rule: the derivation and its three branches
      // stay here, behind a dead condition, along with everything they know
      // about editions.
      if (SHOW_SCRIPT_CHIP) {
        if (EDITION_LABELS[r.edition])
          chip(EDITION_LABELS[r.edition], EDITION_ICONS[r.edition] || edCustom);
        else if (LUF_ROLES.has(r.id))
          chip("Laissez un Faire", EDITION_ICONS.luf || edCustom);
        else if (OFFICIAL_IDS.has(r.id)) chip("Experimental", edCustom);
      }
      const { first, other, known } = wakesOn(r);
      if (first && other) chip("Wakes every night", moonFull);
      else if (first) chip("Wakes first night", moonFirst);
      else if (other) chip("Wakes other nights", moonOther);
      else if (known) chip("Never wakes");
      if (r.setup) chip("Affects setup", setupGlyph);
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
    // A drag is a different intent from a read: the card would sit under the
    // cursor over the very seats the storyteller is dragging onto. It gets
    // out of the way the moment a drag starts (user call 2026-08-18).
    document.addEventListener("dragstart", this.onDismiss, true);
  },
  beforeDestroy() {
    window.removeEventListener("scroll", this.onDismiss, true);
    window.removeEventListener("resize", this.onDismiss);
    document.removeEventListener("dragstart", this.onDismiss, true);
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
      if (!el) return;
      // pinned: the stylesheet owns the box; drop the off-screen park style
      if (this.pinned) {
        this.hoist();
        this.style = {};
        return;
      }
      const rect = this.anchorRect();
      if (!rect) return;
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
        // An anchor in the MIDDLE of the screen (the host panel's role tray,
        // the town centre) is surrounded by things the card would cover — the
        // ring of seats and the tray itself. Push the card right out to the
        // side with more room instead of parking it against the anchor.
        // (user call 2026-08-18: the note got in the way of dragging.)
        const cx = rect.left + rect.width / 2;
        if (this.placement === "side" && (fitsRight || fitsLeft)) {
          // Lean OUTWARD — away from the middle of the window, which is where
          // the ring of seats lives. A seat on the right of the ring gets its
          // card to the right, so the card sits in the empty margin instead of
          // lying across its neighbours.
          //
          // This replaces a rule that flung the card to the far EDGE of the
          // screen whenever the anchor was anywhere near the middle (added
          // 2026-08-18 because the card was getting in the way of dragging).
          // It did clear the ring, and it also detached the card from the thing
          // it describes — the user's report was tooltips appearing
          // "incredibly far away from the hover target". Adjacent-but-outward
          // clears the seats without breaking that tie.
          const useRight =
            this.prefer === "right"
              ? fitsRight
              : this.prefer === "left"
              ? !fitsLeft
              : cx >= vw / 2
              ? fitsRight
              : !fitsLeft;
          left = useRight ? rect.right + GAP : rect.left - GAP - w;
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
      // FT-1171 (user): the NAME takes the team's ink too. The border already
      // carried it, but a border colour is read by comparison — you need a
      // second card open to know what it means. On the name it is a fact you
      // can read from one card. Not the raw token: these run from #1f65ff to
      // #ce0100 and the darkest of them is unreadable as type on this ground,
      // so each is lightened toward its own hue rather than any of them being
      // nudged toward a shared safe grey, which would cost the distinction
      // the colour exists for.
      .rhc-name {
        color: mix(white, $color, 32%);
      }
    }
  }

  // FT-1171: the team, in a mark and a word, after the name. Quiet — the name
  // is the heading and this is its qualifier, so it takes the ability line's
  // size and sits at the name's baseline rather than starting a line of its
  // own.
  .rhc-team {
    display: inline;
    margin-left: 7px;
    font-size: 13px;
    font-weight: normal;
    opacity: 0.72;
    white-space: nowrap;
  }
  .rhc-dot {
    margin-right: 6px;
    opacity: 0.55;
  }
  .rhc-team-mark {
    width: 14px;
    height: 14px;
    object-fit: contain;
    vertical-align: -2px;
    margin-right: 5px;
  }
  background: rgba(10, 4, 4, 0.97);
  border: 2px solid #400;
  border-radius: 10px;
  box-shadow: 0 0 14px black;
  // above the square, the drawers and the modals alike
  z-index: 200;
  pointer-events: none;
  text-align: left;

  // The engraving is the card's one picture and it was reading small in a lot
  // of empty space (user call 2026-08-19). Two causes, both fixed here: the box
  // was 78px in a card two text lines tall, and it sat at the TOP of the row
  // rather than against the middle of the text it belongs to. The source art
  // carries its own transparent margin, so the box is also scaled past 100% to
  // eat some of that padding — the glyph grows without the card growing.
  .icon {
    width: 96px;
    height: 96px;
    flex-shrink: 0;
    align-self: center;
    background-size: 118%;
    background-repeat: no-repeat;
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
  .chip-mark {
    width: 12px;
    height: 12px;
    object-fit: contain;
    margin-right: 5px;
    vertical-align: -2px;
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

// PINNED (see the `pinned` prop): the same right-hand column the build panel
// and the night sheet stand in on a landscape phone, so the card never lands
// on the ring. Top-level, like everything else in this file — the card lives
// on document.body.
@media (pointer: coarse) and (orientation: landscape) and (max-height: 500px) {
  .role-hover-card.pinned {
    top: 46px;
    right: 6px;
    left: auto;
    width: max(42vw, 330px);
    max-width: none;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
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

// a narrow window has no room for the full-fat card
@media (max-width: 640px) {
  .role-hover-card {
    max-width: 90vw;
    gap: 10px;
    padding: 10px 14px;
    .icon {
      width: 68px;
      height: 68px;
      align-self: center;
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
