<!--
  Golem fork: OUR coin.

  The square is a clock, so the seat is a WHEEL. The role token is drawn on
  our own cut gear (`token-golem.png`, baked by
  claude_temp_test/2026-08-18-token-coin.mjs) instead of upstream's marbled
  `token.png` — twenty-two tapered iron teeth, a gold collar, and a recessed
  parchment face — and every decoration on it is drawn by this component
  rather than pulled from upstream's leaf art.

  What the coin has to say, and how it says it:
    · the role            — the engraved icon on the parchment face
    · the role's name     — cut into the lower face on a curve
    · acts on night one   — a waxing crescent at 9 o'clock
    · acts on later nights— a waning crescent at 3 o'clock
    · how many reminders  — that many bone studs across the top of the wheel
    · changes setup       — a blood-red lozenge on the upper-right
    · which team          — a whisper of team colour in the collar

  Upstream's `token.png` and `leaf-*.png` stay in the tree, unreferenced.
-->
<template>
  <div class="token" @click="setRole" :class="[role.id]">
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

    <!-- night order, reminder count and setup, struck into the rim -->
    <svg viewBox="0 0 150 150" class="marks" v-if="hasMarks">
      <path
        v-if="role.firstNight || role.firstNightReminder"
        class="mark moon"
        :d="firstNightMoon"
      />
      <path
        v-if="role.otherNight || role.otherNightReminder"
        class="mark moon"
        :d="otherNightMoon"
      />
      <circle
        v-for="(stud, i) in reminderStuds"
        :key="'stud' + i"
        class="mark stud"
        :cx="stud.x"
        :cy="stud.y"
        r="3.2"
      />
      <path v-if="role.setup" class="mark setup" :d="setupLozenge" />
    </svg>

    <svg viewBox="0 0 150 150" class="name">
      <path :d="nameCurve" :id="curveId" fill="transparent" />
      <text
        width="150"
        x="66.6%"
        text-anchor="middle"
        class="label mozilla"
        :font-size="role.name | nameToFontSize"
      >
        <textPath :xlink:href="'#' + curveId">
          {{ role.name }}
        </textPath>
      </text>
    </svg>
    <div class="edition" :class="[`edition-${role.edition}`, role.team]"></div>
    <div class="ability" v-if="role.ability">
      {{ role.ability }}
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";

// the 150-unit space every overlay on the coin is drawn in
const CX = 75;
const CY = 75;
// where the wheel's decorations sit, measured from the middle of the coin:
// out on the collar and the tooth roots, where they read against dark iron
// and stay clear of the role art on the face
const MARK_R = 64.5;
const RAD = Math.PI / 180;

/**
 * A crescent: the lune left when a bite circle is pushed into a disc. The
 * two arcs meet at the circles' real intersection points, so the horns come
 * to a proper point instead of the blunt stubs a hand-guessed path gives.
 *
 * @param {number} deg  where on the rim the mark sits (0 = 3 o'clock)
 * @param {number} turn rotation of the mark itself — which way the horns face
 */
function crescent(deg, turn) {
  const R = 5.4; // the disc
  const r = 4.8; // the bite
  const o = 2.6; // how deep the bite goes
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

export default {
  name: "Token",
  props: {
    role: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    /**
     * How many reminder tokens this role puts on the board — the count the
     * studs across the top of the rim report.
     */
    reminderLeaves: function() {
      return (
        (this.role.reminders || []).length +
        (this.role.remindersGlobal || []).length
      );
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
    /** One stud per reminder token, centred on the top of the rim. */
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
    /** Changes the setup — a red lozenge on the upper-right rim. */
    setupLozenge: function() {
      const deg = -46;
      const x = CX + MARK_R * Math.cos(deg * RAD);
      const y = CY + MARK_R * Math.sin(deg * RAD);
      const s = 4.2;
      return (
        `M ${x.toFixed(2)} ${(y - s).toFixed(2)}` +
        ` L ${(x + s * 0.78).toFixed(2)} ${y.toFixed(2)}` +
        ` L ${x.toFixed(2)} ${(y + s).toFixed(2)}` +
        ` L ${(x - s * 0.78).toFixed(2)} ${y.toFixed(2)} Z`
      );
    },
    /**
     * The arc the name is cut along. Pulled well in from upstream's curve,
     * which assumed the art ran to the coin's edge — ours stops where the
     * gold collar starts, and descenders have to stay off it.
     */
    nameCurve: function() {
      return "M 26 81 C 26 144, 124 144, 124 81";
    },
    ...mapState(["grimoire"])
  },
  data() {
    return {};
  },
  filters: {
    /**
     * The wheel's face is smaller than upstream's full-bleed disc, so its
     * name arc is about a quarter shorter — one long/short pair of sizes
     * ran "Fortune Teller" and "Investigator" straight off the end of the
     * path, where they were simply clipped. Step it down by length instead.
     */
    nameToFontSize: name => {
      const n = (name || "").length;
      if (n <= 5) return "104%";
      if (n <= 8) return "94%";
      if (n <= 11) return "82%";
      if (n <= 14) return "72%";
      return "63%";
    }
  },
  methods: {
    setRole() {
      this.$emit("set-role");
    }
  }
};
</script>

<style scoped lang="scss">
@import "../vars.scss";

$ink: #231a10; // the name, cut into the parchment
$paper: #f3e8ce; // the halo that lifts it off the face
$bone: #efe2c0; // rim marks: bone inlaid into the brass
$blood: #970000; // our red, for the one mark that must not be missed

.token {
  border-radius: 50%;
  width: 100%;
  // OUR coin. Upstream's token.png stays in the tree, unreferenced.
  background: url("../assets/token-golem.png") center center;
  background-size: 100%;
  text-align: center;
  // The border stays — the bluffs collapse zeroes its width and the "you"
  // seat's glow animates its colour — but it goes transparent at rest: a
  // black hoop drawn round a toothed wheel closes the silhouette back into
  // a circle and throws the gear away.
  border: 3px solid transparent;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 250ms;

  &:hover .name .label {
    fill: $blood;
    @-moz-document url-prefix() {
      &.mozilla {
        stroke: none;
        filter: drop-shadow(0 1.5px 0 #{$paper})
          drop-shadow(0 -1.5px 0 #{$paper}) drop-shadow(1.5px 0 0 #{$paper})
          drop-shadow(-1.5px 0 0 #{$paper})
          drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5));
      }
    }
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

  // the engraved role art, sized to the parchment rather than the whole
  // coin — the wheel's teeth and collar are not somewhere art may climb
  .icon {
    background-size: 79%;
    background-repeat: no-repeat;
    background-position: center 20%;
    margin-top: 2%;
  }

  // A whisper of the role's team, laid into the coin's inner ring. The icon
  // and the name already say which team this is; this only tints the metal.
  // `closest-side` makes the stops read as a fraction of the coin's radius,
  // so the band lands on the gold collar at every zoom
  @mixin team-ring($color) {
    background: radial-gradient(
      circle closest-side,
      transparent 0 79.5%,
      rgba($color, 0.9) 81%,
      rgba($color, 0.9) 83.5%,
      transparent 85%
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

  // night order / reminder count / setup: bone inlaid into the dark iron,
  // which is the one treatment that reads on both the collar and the teeth
  .marks {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;

    .mark {
      stroke: rgba(14, 10, 4, 0.9);
      stroke-width: 1.3;
      paint-order: stroke;
    }
    .moon,
    .stud {
      fill: $bone;
    }
    .setup {
      fill: $blood;
      stroke: rgba(242, 224, 178, 0.9);
      stroke-width: 1.3;
    }
  }

  .name {
    width: 100%;
    height: 100%;
    font-size: 24px; // svg fonts are relative to document font size
    .label {
      fill: $ink;
      stroke: $paper;
      stroke-width: 2.5px;
      paint-order: stroke;
      // PiratesBay is what the rest of our chrome is lettered in; upstream's
      // Papyrus stays in assets/fonts, unreferenced
      font-family: "PiratesBay", Georgia, serif;
      letter-spacing: 0.5px;
      transition: fill 200ms;

      @-moz-document url-prefix() {
        &.mozilla {
          // Vue doesn't support scoped media queries, so we have to use a second css class
          stroke: none;
          text-shadow: none;
          filter: drop-shadow(0 1.5px 0 #{$paper})
            drop-shadow(0 -1.5px 0 #{$paper}) drop-shadow(1.5px 0 0 #{$paper})
            drop-shadow(-1.5px 0 0 #{$paper})
            drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5));
        }
      }
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

// A shrouded seat's coin goes cold: the same plate struck in dead metal, so
// a full grimoire reads alive-vs-dead at a glance without hunting for
// shrouds. `.player` lives in Player.vue; the coin is this component's root,
// which is what scoping keys off.
.player.dead .token {
  background-image: url("../assets/token-golem-dead.png");
}
</style>
