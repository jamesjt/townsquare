// Golem fork (FT-1071): THE STATS-PLATE LAB — TEMPORARY, DELETE ME.
//
// The clock face's centre stats (TownInfo.vue's two count rows) sit on a dark
// pill — FT-998's black glass, tightened by FT-998b/FT-1020 and again by
// FT-1071, which also shrink-wrapped it to the stats themselves. The user's
// verdict on the shipped plate was LOUD — broad ground, generous padding —
// and FT-1071's baked step (tighter inset, dimmer ground) only makes today
// better: the FINAL look is found here, by eye, on the live face.
//
// The numeral lab's idiom, to the letter (`src/golem/numeralGlow.js`):
// labels are WORDS, values publish as custom properties on <html>, everything
// persists under a `golem.*` key, Reset is a real return, and the lab sits
// behind `devLabs` at the bottom of the column. When a look is found it gets
// BAKED into TownInfo.vue's `.stat-plate` fallbacks, at which point this
// file, `src/components/StatsPlateLab.vue`, their two lines in App.vue and
// the `var(--sp-*)` reads in TownInfo.vue all come out together.
//
// ── HOW THE DIALS REACH THE STYLESHEET ──────────────────────────────────────
// Pure custom properties — nothing mounted, no classes. Every `var()` read in
// TownInfo.vue carries the ship value as its fallback, so a dial sitting on
// ship publishes NOTHING: after Reset, <html> carries no `--sp-*` property at
// all and the DOM is exactly what a build without this lab produces (the veil
// lab's zero-footprint rule, kept).
//
// TWO DIALS PUBLISH MORE THAN A NUMBER:
// - Tint (0-100) walks a cool↔warm axis and publishes the ground's R, G, B
//   channels as one triplet. The axis is piecewise through the SHIPPED
//   near-black at 50, so the anchor is exact by construction: 0 is a cool
//   night-blue black, 100 a warm ember black.
// - Glass blur publishes a whole `blur(Npx)` backdrop-filter value — and at
//   0 (ship) publishes NOTHING, so no backdrop layer exists at all (the
//   brief's performance rule). While it is on, it also publishes
//   `--sp-row-filter: none`: the rows' own drop-shadow filter makes each row
//   a BACKDROP ROOT, inside which the frost could only ever sample the row's
//   own transparent box, never the face art behind it.

/** Storage keys. New — no browser holds a value under them yet. */
const SP_STORAGE = {
  alpha: "golem.spAlpha",
  tint: "golem.spTint",
  blur: "golem.spBlur",
  pad: "golem.spPad",
  radius: "golem.spRadius",
};

/**
 * THE DIALS. EVERY DIAL IS AN INTEGER (NumberScrub is an integer control):
 * Opacity in hundredths, Tint in axis steps, the rest in whole CSS pixels.
 *
 * SHIP VALUES are FT-1071's own baked quieting (inset 1px, ground
 * rgba(10, 5, 7, 0.26), radius 12px, no glass) — opening the lab changes
 * NOTHING until a dial moves.
 */
export const STATS_PLATE_DIALS = [
  {
    key: "alpha",
    group: "Ground",
    label: "Opacity",
    ship: 26,
    min: 0,
    max: 100,
    hint: "How dark the pill's ground is, in hundredths (26 = shipped; 0 = no ground at all)",
  },
  {
    key: "tint",
    group: "Ground",
    label: "Tint",
    ship: 50,
    min: 0,
    max: 100,
    hint: "The ground's colour lean — 0 = cool night-blue black, 50 = the shipped near-black, 100 = warm ember black",
  },
  {
    key: "blur",
    group: "Glass",
    label: "Blur",
    ship: 0,
    min: 0,
    max: 20,
    hint: "Real glass: how much the face art frosts behind the pill, in pixels (0 = shipped = no glass layer at all)",
  },
  {
    key: "pad",
    group: "Shape",
    label: "Padding",
    ship: 1,
    min: 0,
    max: 24,
    hint: "How far the pill reaches past the stats on every side, in pixels (1 = shipped; 0 = hugs them exactly)",
  },
  {
    key: "radius",
    group: "Shape",
    label: "Corner",
    ship: 12,
    min: 0,
    max: 24,
    hint: "The pill's corner radius, in pixels (12 = shipped, a full pill at this row height; 0 = a hard box)",
  },
];

/**
 * The tint axis — piecewise-linear through the SHIPPED ground at 50, so the
 * anchor is the exact baked colour, never a lerp's rounding of it.
 */
const TINT_COOL = [4, 8, 18]; // 0 — cool night-blue black
const TINT_SHIP = [10, 5, 7]; // 50 — the shipped near-black (TownInfo.vue)
const TINT_WARM = [30, 12, 5]; // 100 — warm ember black

/** The ground's "R, G, B" triplet for a tint dial value. */
export function tintTriplet(t) {
  const [from, to, f] =
    t <= 50
      ? [TINT_COOL, TINT_SHIP, t / 50]
      : [TINT_SHIP, TINT_WARM, (t - 50) / 50];
  return from.map((c, i) => Math.round(c + (to[i] - c) * f)).join(", ");
}

const clamp = (dial, v) =>
  Math.max(dial.min, Math.min(dial.max, Math.round(Number(v) || 0)));

/** The dial's record, always concrete. */
export function statsPlateDial(key) {
  return STATS_PLATE_DIALS.find((d) => d.key === key);
}

/** Every dial at the value it ships at — FT-1071's quieted plate. */
export function shippedStatsPlateLab() {
  const dials = {};
  STATS_PLATE_DIALS.forEach((d) => (dials[d.key] = d.ship));
  return { dials };
}

/** Read the persisted state. Anything unreadable reads as SHIPPED — a broken
 *  storage entry must never be able to bend the app. */
export function readStatsPlateLab() {
  const state = shippedStatsPlateLab();
  STATS_PLATE_DIALS.forEach((d) => {
    let v = d.ship;
    try {
      const raw = localStorage.getItem(SP_STORAGE[d.key]);
      if (raw !== null) v = Number(raw);
    } catch (e) {
      v = d.ship;
    }
    state.dials[d.key] = clamp(d, v);
  });
  return state;
}

/**
 * Publish the whole state onto <html>, where the plate — inside TownInfo's
 * tree — inherits it. A DIAL ON ITS SHIP VALUE PUBLISHES NOTHING (the
 * property is REMOVED): after Reset, <html> carries no `--sp-*` property at
 * all.
 */
export function publishStatsPlateLab(state) {
  const style = document.documentElement.style;
  const put = (name, on, value) =>
    on ? style.setProperty(name, value) : style.removeProperty(name);
  const d = state.dials;
  const off = (key) => d[key] === statsPlateDial(key).ship;
  put("--sp-alpha", !off("alpha"), String(d.alpha));
  put("--sp-ground", !off("tint"), tintTriplet(d.tint));
  // the glass pair travels together — see the header block for why the
  // rows' own filter has to stand aside while the frost is on
  put("--sp-glass", !off("blur"), "blur(" + d.blur + "px)");
  put("--sp-row-filter", !off("blur"), "none");
  put("--sp-pad", !off("pad"), String(d.pad));
  put("--sp-radius", !off("radius"), String(d.radius));
}

/**
 * The lab as a Vue mixin — the fork's idiom for shared component behaviour.
 * One consumer: StatsPlateLab.vue.
 */
export default {
  data() {
    return {
      spLabOpen: false,
      spLab: readStatsPlateLab(),
      spDials: STATS_PLATE_DIALS,
    };
  },
  mounted() {
    // a stored value has to reach the plate on load, not on first drag
    publishStatsPlateLab(this.spLab);
  },
  beforeDestroy() {
    // the lab going away restores the baked look (the veil lab's rule)
    publishStatsPlateLab(shippedStatsPlateLab());
  },
  methods: {
    /** Clamped against the dial's OWN declared bounds. */
    setSpDial(key, n) {
      const dial = statsPlateDial(key);
      if (!dial) return;
      this.$set(this.spLab.dials, key, clamp(dial, n));
      publishStatsPlateLab(this.spLab);
      try {
        localStorage.setItem(SP_STORAGE[key], String(this.spLab.dials[key]));
      } catch (e) {
        // storage off: the dial still works for this session
      }
    },
    /** Back to the shipped plate — FT-1071's numbers, every dial on its ship
     *  value — which leaves <html> carrying no `--sp-*` property. */
    resetSpLab() {
      STATS_PLATE_DIALS.forEach((d) => this.setSpDial(d.key, d.ship));
    },
  },
};
