<!--
  Golem fork: OUR coin.

  The square is a clock, so the seat is a WHEEL. The role token is drawn on
  our own cut gear (`token-golem.png`, baked by
  claude_temp_test/2026-08-18-token-coin.mjs) instead of upstream's marbled
  `token.png` — a finely milled iron rim, a tarnished collar, and a recessed
  parchment face, all of it worn and lit from one origin — and every
  decoration on it is drawn by this component rather than pulled from
  upstream's leaf art.

  What the coin has to say, and how it says it:
    · the role            — the engraved icon, centred on the face
    · the role's name     — cut along the bottom arc, centred on it
    · acts on night one   — a waxing crescent at 9 o'clock
    · acts on later nights— a waning crescent at 3 o'clock
    · how many reminders  — that many bone studs across the top of the wheel
    · changes setup       — a red stone set in bone, upper right
    · which team          — a whisper of team colour in the collar

  Nothing on the coin wears a traced outline of constant width: the marks are
  seated with shadow and the name is cut into the parchment with a lit lower
  lip, because a uniform stroke is what made the first passes read as vector
  art next to the painted role icons.

  Upstream's `token.png` and `leaf-*.png` stay in the tree, unreferenced.
-->
<template>
  <div
    class="token"
    @click="setRole"
    :class="[role.id]"
    :aria-label="spokenRole"
    @mouseenter="showCard"
    @mouseleave="hideCard"
  >
    <span class="rim" :class="role.team"></span>
    <span
      class="icon"
      v-if="role.id"
      :style="{
        backgroundImage: `url(${
          role.image &&
          (grimoire.isImageOptIn || role.image.startsWith('data:'))
            ? role.image
            : require('../assets/icons/' + (role.imageAlt || role.id) + '.png')
        })`
      }"
    ></span>

    <!-- night order, reminder count and setup, set into the wheel -->
    <svg viewBox="0 0 150 150" class="marks" v-if="hasMarks">
      <!-- ONE phase at top centre says when this character wakes (user call
           2026-08-18): a crescent for the first night, the rest of that moon
           for later nights, the full moon for both. It takes the spot the
           reminder studs held — the studs' computed stays below, unused. -->
      <image
        v-if="nightPhase"
        class="mark phase"
        :href="nightPhase"
        :x="PHASE_X"
        :y="PHASE_Y"
        :width="PHASE_W"
        :height="PHASE_W"
      />
      <template v-if="role.setup">
        <path class="mark setting" :d="setupLozenge.bezel" />
        <path class="mark stone" :d="setupLozenge.stone" />
      </template>
    </svg>

    <svg viewBox="0 0 150 150" class="name">
      <path :d="nameCurve" :id="curveId" fill="transparent" />
      <text
        width="150"
        text-anchor="middle"
        class="label mozilla"
        :font-size="role.name | nameToFontSize"
      ><!-- startOffset centres the name on the ARC. Upstream anchored with
             x="66.6%" — 100 user units, half of their much deeper curve but
             two thirds along ours, so short names sat off to one side and
             long ones ran off the end and were clipped. --><textPath
          :xlink:href="'#' + curveId"
          startOffset="50%"
        >{{ role.name }}</textPath></text>
    </svg>
    <div class="edition" :class="[`edition-${role.edition}`, role.team]"></div>

    <!-- FT-861: THE BELIEF CHIP — what this seat's player was TOLD they are,
         pinned to the coin's bottom edge (the moon took the top). The truth
         stays the whole coin; the lie is a chip on its rim, which is the right
         proportion: the storyteller reads the character that resolves first and
         the performance second. Only a SEAT passes `belief`; the bluffs, the
         fabled and both pickers never do, so nothing else grows one. -->
    <button
      v-if="belief && belief.id"
      type="button"
      class="belief-chip"
      :class="belief.team"
      :title="`Believes they are the ${belief.name} — click to change what they were told`"
      :aria-label="`Believes they are the ${belief.name}`"
      @click.stop="$emit('set-belief')"
    >
      <span
        class="belief-icon"
        :style="{ backgroundImage: `url(${beliefIcon})` }"
      ></span>
    </button>

    <!-- FT-858: the coin's read is THE role hover card — the same component
         the Almanac workbench's shelf hovers (user-directed: one component,
         both surfaces). It supersedes the flat `.ability` box that used to
         hang off the coin at `left: 120%`, which the square's rotated seats
         clipped and the picker grids overlapped. -->
    <RoleHoverCard
      v-if="cardAnchor"
      :role="role"
      :anchor="cardAnchor"
      @dismiss="hideCard"
    />
  </div>
</template>

<script>
import { mapState } from "vuex";
// FT-858: THE role hover card, shared with the Almanac workbench's shelf and
// the grimoire drawer.
import RoleHoverCard from "./RoleHoverCard";
import moonFirst from "../assets/moon-first.png";
import moonOther from "../assets/moon-other.png";
import moonFull from "../assets/moon-full.png";

// how long the cursor has to rest on a coin before its card appears —
// enough that sweeping across the square does not strobe cards
const HOVER_DELAY = 170;

// the 150-unit space every overlay on the coin is drawn in
const CX = 75;
const CY = 75;
// Where the wheel's decorations sit, measured from the middle of the coin.
// The coin is the USER'S OWN art (design drop, keyed + measured by
// claude_temp_test/2026-08-18-player-coin.mjs). Its metal ring is thin — the
// parchment runs out to 0.955 of the radius and the teeth take the rest — so
// the marks sit just INSIDE the gold hairline rather than in the ring, which
// is where they fit and where upstream's leaves read from.
const MARK_R = 67.5;
// the phase mark, centred on the top of the wheel just inside the hairline.
// 15 read as a smudge at seat sizes (user report 2026-08-18) -- 21 is the
// biggest step that still clears the parchment edge at this anchor; PHASE_X/
// PHASE_Y grow around the same MARK_R centre, so raising this one constant
// is the whole resize.
const PHASE_W = 21;
const PHASE_X = (CX - PHASE_W / 2).toFixed(2);
const PHASE_Y = (CY - MARK_R - PHASE_W / 2 + 2).toFixed(2);
const RAD = Math.PI / 180;

/**
 * A crescent: the lune left when a bite circle is pushed into a disc. The
 * two arcs meet at the circles' real intersection points, so the horns come
 * to a proper point instead of the blunt stubs a hand-guessed path gives.
 *
 * @param {number} deg  where on the wheel the mark sits (0 = 3 o'clock)
 * @param {number} turn rotation of the mark itself — which way the horns face
 */
function crescent(deg, turn) {
  const R = 5; // the disc
  const r = 4.5; // the bite
  const o = 2.4; // how deep the bite goes
  const ix = (o * o + R * R - r * r) / (2 * o);
  const iy = Math.sqrt(Math.max(0, R * R - ix * ix));
  const cx = CX + MARK_R * Math.cos(deg * RAD);
  const cy = CY + MARK_R * Math.sin(deg * RAD);
  const c = Math.cos(turn * RAD);
  const s = Math.sin(turn * RAD);
  const at = (px, py) =>
    `${(cx + px * c - py * s).toFixed(2)} ${(cy + px * s + py * c).toFixed(2)}`;
  // outer arc the long way round the disc, then back along the bite
  return (
    `M ${at(ix, -iy)} A ${R} ${R} 0 1 0 ${at(ix, iy)}` +
    ` A ${r} ${r} 0 0 1 ${at(ix, -iy)} Z`
  );
}

/** a diamond of half-height `s` about (x, y) */
function lozenge(x, y, s) {
  return (
    `M ${x.toFixed(2)} ${(y - s).toFixed(2)}` +
    ` L ${(x + s * 0.78).toFixed(2)} ${y.toFixed(2)}` +
    ` L ${x.toFixed(2)} ${(y + s).toFixed(2)}` +
    ` L ${(x - s * 0.78).toFixed(2)} ${y.toFixed(2)} Z`
  );
}

export default {
  name: "Token",
  components: { RoleHoverCard },
  props: {
    role: {
      type: Object,
      default: () => ({})
    },
    /**
     * Whether the coin raises its own hover card. True everywhere the coin is
     * the whole target — the bluffs, the fabled, both role pickers. A SEAT
     * turns it off: the shroud and the life token cover the coin's top half,
     * so the seat owns the hover for its whole box instead (Player.vue).
     */
    hoverCard: {
      type: Boolean,
      default: true
    },
    /**
     * FT-861: the character this seat's player was TOLD they are, when it is
     * not the one on the coin. Null on every coin that is not a storyteller's
     * seat — see Player.vue, which is the only caller that passes it and which
     * gates it on being the storyteller's own grimoire view.
     */
    belief: {
      type: Object,
      default: null
    }
  },
  computed: {
    /**
     * When this character wakes, as one moon: a crescent for the first night,
     * the rest of that moon for later nights, the full moon for both. (user
     * call 2026-08-18 — it took the reminder studs' place at top centre.)
     */
    nightPhase: function() {
      const first = !!(this.role.firstNight || this.role.firstNightReminder);
      const other = !!(this.role.otherNight || this.role.otherNightReminder);
      if (first && other) return moonFull;
      if (first) return moonFirst;
      if (other) return moonOther;
      return null;
    },
    /**
     * How many reminder tokens this role puts on the board — the count the
     * studs across the top of the wheel report.
     */
    reminderLeaves: function() {
      return (
        (this.role.reminders || []).length +
        (this.role.remindersGlobal || []).length
      );
    },
    /**
     * What a screen reader hears. The hover card is a pointer affordance, and
     * the ability text it carries used to be real text on the coin — this is
     * where that reading goes instead, so nothing is lost off the mouse path.
     */
    spokenRole: function() {
      if (!this.role || !this.role.name) return null;
      return this.role.ability
        ? `${this.role.name}. ${this.role.ability}`
        : this.role.name;
    },
    /** Every instance needs its own curve id, or they all share the first. */
    curveId: function() {
      return `coin-curve-${this._uid}`;
    },
    hasMarks: function() {
      return !!(
        this.role.firstNight ||
        this.role.firstNightReminder ||
        this.role.otherNight ||
        this.role.otherNightReminder ||
        this.role.setup ||
        this.reminderLeaves
      );
    },
    /** Acts on the first night — a waxing crescent at 9 o'clock. */
    firstNightMoon: function() {
      return crescent(180, 0);
    },
    /** Acts on later nights — the same moon, waning, at 3 o'clock. */
    otherNightMoon: function() {
      return crescent(0, 180);
    },
    /** One stud per reminder token, centred on the top of the wheel. */
    reminderStuds: function() {
      const n = Math.min(5, this.reminderLeaves);
      const studs = [];
      for (let i = 0; i < n; i++) {
        const deg = -90 + (i - (n - 1) / 2) * 10;
        studs.push({
          x: (CX + MARK_R * Math.cos(deg * RAD)).toFixed(2),
          y: (CY + MARK_R * Math.sin(deg * RAD)).toFixed(2)
        });
      }
      return studs;
    },
    /**
     * Changes the setup — a red stone set in a bone bezel, upper right. Two
     * shapes rather than a stroked one: the bezel IS the outline, and it
     * varies the way a setting does instead of tracing at a fixed width.
     */
    setupLozenge: function() {
      const deg = -46;
      const x = CX + MARK_R * Math.cos(deg * RAD);
      const y = CY + MARK_R * Math.sin(deg * RAD);
      return { bezel: lozenge(x, y, 4.6), stone: lozenge(x, y + 0.2, 2.7) };
    },
    /**
     * The arc the name is cut along, symmetric about the coin's vertical
     * axis so a 50% startOffset lands exactly on bottom-centre. Descenders
     * reach about 60 units from the middle; the parchment ends at 63.6.
     */
    nameCurve: function() {
      // FT-861: with a belief chip pinned to the bottom edge the name rises
      // out of its way. The truth's name stays whole and legible — that is the
      // one thing on this coin that is not tradeable for the chip.
      if (this.belief && this.belief.id) {
        return "M 25 70 C 25 130, 125 130, 125 70";
      }
      return "M 25 81 C 25 147, 125 147, 125 81";
    },
    /**
     * FT-861: the believed character's engraved art, for the chip. Bundled
     * icons only (a chip is 30px — a remote image would be a smudge and would
     * need the opt-in), falling back the way the night sheet's rows do.
     */
    beliefIcon: function() {
      const role = this.belief;
      if (!role || !role.id) return "";
      if (role.golemIconData) return role.golemIconData;
      try {
        return require("../assets/icons/" + (role.imageAlt || role.id) + ".png");
      } catch (e) {
        return require("../assets/icons/custom.png");
      }
    },
    ...mapState(["grimoire"])
  },
  data() {
    return {
      // the coin element the hover card is pinned to, once the cursor has
      // rested on it; null while nothing is showing
      cardAnchor: null,
      // the phase mark's geometry, exposed for the template
      PHASE_W,
      PHASE_X,
      PHASE_Y
    };
  },
  beforeDestroy() {
    clearTimeout(this.$options.cardTimer);
  },
  filters: {
    /**
     * The wheel's face is smaller than upstream's full-bleed disc, so its
     * name arc is shorter and one long/short pair of sizes no longer covers
     * the range. Calibrated against measured glyph widths on 154 units of
     * arc: the longest name in any script ("Devil's Advocate") still lands
     * inside it.
     */
    nameToFontSize: name => {
      const n = (name || "").length;
      if (n <= 5) return "104%";
      if (n <= 8) return "96%";
      if (n <= 11) return "86%";
      if (n <= 14) return "74%";
      if (n <= 17) return "64%";
      return "56%";
    }
  },
  methods: {
    setRole() {
      this.$emit("set-role");
    },
    /**
     * Rest the cursor on a coin and it tells you what the character does.
     * An empty chair has nothing to say, and a touch screen has no hover to
     * rest — a tap there still opens the role picker, as it always did.
     */
    showCard(e) {
      if (!this.hoverCard) return;
      if (!this.role || !this.role.id) return;
      if (!window.matchMedia("(hover: hover)").matches) return;
      const el = e.currentTarget;
      clearTimeout(this.$options.cardTimer);
      this.$options.cardTimer = setTimeout(() => {
        this.cardAnchor = el;
      }, HOVER_DELAY);
    },
    hideCard() {
      clearTimeout(this.$options.cardTimer);
      this.cardAnchor = null;
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

$ink: #241a10; // the name, cut into the parchment
$lip: rgba(246, 232, 200, 0.72); // the lit lower edge of that cut
$bone: #ded0ac; // rim marks: bone set into the iron
$blood: #970000; // our red, for the one mark that must not be missed

.token {
  width: 100%;
  // OUR coin. Upstream's token.png stays in the tree, unreferenced.
  // no-repeat: the shorthand resets background-repeat, and a tiled coin put
  // the NEXT tile's top edge just below this one — the "melting" rim, the
  // stray red nub and the thing peeking from behind the disc were all one
  // bug (user diagnosis 2026-08-18)
  background: var(--coin, url("../assets/token-golem.png")) center center /
      contain no-repeat;
  text-align: center;
  // NO circular clip: the coin is a TOOTHED wheel, and border-radius: 50%
  // cut every tooth that crossed the inscribed circle (user report
  // 2026-08-18 — the coins looked clipped). The art carries its own edge.
  // The border stays — the bluffs collapse zeroes its width and the "you"
  // seat's glow animates its colour — but it goes transparent at rest: a
  // black hoop drawn round a toothed wheel closes the silhouette back into
  // a circle and throws the gear away.
  border: 3px solid transparent;
  // A box-shadow follows the BOX (a circle, here) and so drew a dark ring
  // that showed past the coin's teeth — the "something peeking from behind
  // the disc" (user report 2026-08-18). drop-shadow follows the art's own
  // alpha, teeth included.
  filter: drop-shadow(0 0 7px rgba(0, 0, 0, 0.55));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 250ms;

  &:hover .name .label {
    fill: $blood;
  }

  // the fabled remove-X rides `:before` from TownSquare.vue, so its box has
  // to keep upstream's full-bleed geometry
  &:before {
    background-size: 100%;
    background-repeat: no-repeat;
    background-position: center 30%;
    position: absolute;
    width: 100%;
    height: 100%;
    margin-top: 3%;
  }

  span {
    position: absolute;
    width: 100%;
    height: 100%;
    background-size: 100%;
    pointer-events: none;
  }

  // The engraved role art. The box is the whole coin, so `center` is the
  // coin's true centre on both axes — the art is placed purely by
  // background-size/position and carries no margin to drift on.
  //   width  = 76% of the coin, so it is centred exactly, with the same
  //            12% of coin either side before the parchment ends at 15.2%
  //   height = the same 76%, dropped 40% of the way through the 24% of
  //            slack, which lands its centre at 47.6% — a deliberate 2.4%
  //            lift to make room for the name on the bottom arc
  .icon {
    // Bigger, and sitting nearer the middle of the face (user call
    // 2026-08-18). 76% at 40% left the character small and riding high, with
    // dead parchment under it. The name curves along an arc that starts at
    // y=81 of 150 and bottoms around y=130, so the icon cannot simply centre
    // at 50% without its lower edge crossing the lettering — 45% is the
    // furthest down it goes while the art still clears the name.
    background-size: 86%;
    background-repeat: no-repeat;
    background-position: center 45%;
  }

  // `closest-side` makes the stops read as a fraction of the coin's radius,
  // so the band lands on the collar at every zoom
  @mixin team-ring($color) {
    background: radial-gradient(
      circle closest-side,
      transparent 0 var(--ring-in, 87.5%),
      rgba($color, 0.55) var(--ring-a, 89%),
      rgba($color, 0.55) var(--ring-b, 92%),
      transparent var(--ring-out, 93.5%)
    );
  }

  .rim {
    border-radius: 50%;
    background-size: 100% 100%;
    mix-blend-mode: soft-light;

    &.townsfolk {
      @include team-ring($townsfolk);
    }
    &.outsider {
      @include team-ring($outsider);
    }
    &.minion {
      @include team-ring($minion);
    }
    &.demon {
      @include team-ring($demon);
    }
    &.traveler {
      @include team-ring($traveler);
    }
  }

  // night order / reminder count / setup. No stroke: on dark iron the bone
  // has all the contrast it needs, and a shadow seats it the way a real
  // inlay sits in its recess.
  .marks {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    filter: drop-shadow(0.4px 0.9px 0.7px rgba(0, 0, 0, 0.85));

    .moon,
    .stud,
    .setting {
      fill: $bone;
    }
    .stone {
      fill: $blood;
    }

    // the moon PNG bakes its own halo, but on dark iron it still wants a
    // second lift: a warm glow stacked outside the parent's dark contact
    // shadow above, the same two-tier trick the name halo below uses.
    .mark.phase {
      filter: drop-shadow(0 0 2.6px rgba(250, 240, 210, 0.85))
        drop-shadow(0 0 1.2px rgba(250, 240, 210, 0.9));
    }
  }

  .name {
    width: 100%;
    height: 100%;
    font-size: 24px; // svg fonts are relative to document font size
    .label {
      fill: $ink;
      // Cut, not stickered. Stacked blurred blooms give a halo that follows
      // the glyph and fades — legible on the aged face without the 2.5px
      // paint-order outline the earlier passes wore, which was a traced ring
      // of constant width and the loudest "vector" tell on the coin. The
      // last shadow is the lit lower lip of the cut.
      // The halo is BACK (user call 2026-08-18): it went when the coin was
      // pale, and the darker coin art needs it again for the name to read.
      filter: drop-shadow(0 0 1.6px rgba(250, 240, 214, 0.95))
        drop-shadow(0 0 0.9px rgba(250, 240, 214, 0.95))
        drop-shadow(0 0 0.6px rgba(250, 240, 214, 0.8))
        drop-shadow(0 0.9px 0 #{$lip});
      // PiratesBay is what the rest of our chrome is lettered in; upstream's
      // Papyrus stays in assets/fonts, unreferenced
      font-family: "PiratesBay", Georgia, serif;
      letter-spacing: 0.5px;
      transition: fill 200ms;
    }
  }

  .edition {
    position: absolute;
    right: 0;
    bottom: 5px;
    width: 30px;
    height: 30px;
    background-size: 100%;
    display: none;
  }

  // FT-861: THE BELIEF CHIP. A smaller coin struck in the same metal, set into
  // the wheel's bottom edge — half on the rim, half proud of it, so it reads as
  // pinned TO the coin rather than as part of the face. The team's colour is a
  // hairline on its collar, the same whisper the big coin's rim carries.
  .belief-chip {
    position: absolute;
    left: 50%;
    bottom: -6%;
    transform: translateX(-50%);
    width: 26%;
    height: 26%;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--coin, url("../assets/token-golem.png")) center center /
      cover no-repeat;
    box-shadow: 0 0 0 1.5px rgba(20, 14, 8, 0.9),
      0 2px 4px rgba(0, 0, 0, 0.65);
    cursor: pointer;
    // the coin's own click opens the character picker; the chip's opens the
    // BELIEF picker, so it must never reach the coin underneath
    pointer-events: auto;
    z-index: 4;
    transition: transform 150ms ease-out, box-shadow 150ms ease-out;

    &:hover,
    &:focus-visible {
      outline: none;
      transform: translateX(-50%) scale(1.12);
      box-shadow: 0 0 0 1.5px #{$blood}, 0 2px 6px rgba(0, 0, 0, 0.75);
    }

    // the collar's whisper of team colour, drawn as a ring on the chip's edge
    @mixin chip-collar($color) {
      &:after {
        border-color: rgba($color, 0.85);
      }
    }
    &:after {
      content: " ";
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      border: 1.5px solid rgba(222, 208, 172, 0.7);
      border-radius: 50%;
      pointer-events: none;
    }
    &.townsfolk {
      @include chip-collar($townsfolk);
    }
    &.outsider {
      @include chip-collar($outsider);
    }
    &.minion {
      @include chip-collar($minion);
    }
    &.demon {
      @include chip-collar($demon);
    }
    &.traveler {
      @include chip-collar($traveler);
    }

    // `.token span` makes every span in here a full-bleed 100% layer; the icon
    // wants the same box but its own fit, so it restates it rather than
    // inheriting a size meant for the coin's face.
    // The chip is a third of the coin across, so its art gets nearly the whole
    // face — at 78% the engraving read as a smudge. It also carries the big
    // coin's own lift off centre, so the two read as the same object struck at
    // two sizes.
    .belief-icon {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-position: center 47%;
      background-repeat: no-repeat;
      background-size: 88%;
      pointer-events: none;
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
    }
  }

  // FT-858: superseded by RoleHoverCard, which the coin now renders instead.
  // The rule stays in the tree unreferenced, the way upstream's token.png and
  // leaf art do — nothing here was worth throwing away, it just could not
  // survive being pinned inside a rotated, clipped seat.
  .ability {
    display: flex;
    position: absolute;
    padding: 5px 10px;
    left: 120%;
    width: 250px;
    z-index: 25;
    font-size: 80%;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    border: 3px solid black;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
    text-align: left;
    justify-items: center;
    align-content: center;
    align-items: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity 200ms ease-in-out;

    &:before {
      content: " ";
      border: 10px solid transparent;
      width: 0;
      height: 0;
      border-right-color: black;
      position: absolute;
      margin-right: 2px;
      right: 100%;
    }
  }

  &:hover .ability {
    opacity: 1;
  }
}

// A shrouded seat's coin goes cold: the same wheel struck in dead metal, so
// a full grimoire reads alive-vs-dead at a glance without hunting for
// shrouds. `.player` lives in Player.vue; the coin is this component's root,
// which is what scoping keys off.
.player.dead .token {
  background-image: var(--coin-dead, url("../assets/token-golem-dead.png"));
}
</style>
