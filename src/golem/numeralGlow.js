// Golem fork (FT-1049): THE NUMERAL-GLOW LAB — TEMPORARY, DELETE ME.
//
// The twelve ring numerals (FaceHands.vue's `.tw-numeral`) wear a four-layer
// text-shadow — FT-1046b's dressing: a crisp pale under-light, a dark drop, a
// close warm halo and a wide warm breath. The user's verdict on it: TOO MUCH
// GLOW — and rather than a fifth blind taste swing (1029 → 1031 → 1033 →
// 1044 → 1046b were the first four), this lab puts the dressing on dials so
// the look is found BY EYE, in place, on the live clock face.
//
// The veil lab's idiom, deliberately (`src/golem/veilGlass.js`): labels are
// WORDS, values publish as custom properties on <html>, everything persists
// under a `golem.*` key, Reset is a real return, and the lab sits behind
// `devLabs` at the bottom of the column. When a look is found by eye it gets
// BAKED into FaceHands.vue's `.tw-numeral` text-shadow numbers, at which
// point this file, `src/components/NumeralGlowLab.vue`, their two lines in
// App.vue and the `var(--ng-*)` reads in FaceHands.vue all come out together.
//
// WHAT STAYS OUT: THE INK. The font (Times bold at 34 face-pixels) and the
// near-black #0a0502 are SETTLED — FT-1033 was the user's own call ("the
// clock tower text is working fine, make the numerals look like that") and
// only the dressing has moved since. No dial here touches either.
//
// ── HOW THE DIALS REACH THE STYLESHEET ──────────────────────────────────────
// Pure custom properties — no filter, no classes, nothing mounted. Each of
// the four shadow layers keeps its geometry and its warm tint; the dials ride
// its ALPHA (0–100, divided by 100 in CSS) and, where the brief asks, its
// BLUR RADIUS (whole face-pixels — the `--fpx` unit the whole dial speaks).
// Every `var()` read in FaceHands.vue carries the ship value as its fallback,
// so a dial sitting on ship publishes NOTHING: after Reset, <html> carries no
// `--ng-*` property at all and the DOM is exactly what a build without this
// lab produces (the veil lab's zero-footprint rule, kept).

/** Storage keys. New — no browser holds a value under them yet. */
const NG_STORAGE = {
  under: "golem.ngUnder",
  drop: "golem.ngDrop",
  dropBlur: "golem.ngDropBlur",
  halo: "golem.ngHalo",
  haloSize: "golem.ngHaloSize",
  breath: "golem.ngBreath",
  breathSize: "golem.ngBreathSize",
};

/** The custom property each dial publishes. The `--ng-*` names are read by
 *  FaceHands.vue's `.tw-numeral` text-shadow and nowhere else. */
const NG_VAR = {
  under: "--ng-under",
  drop: "--ng-drop",
  dropBlur: "--ng-drop-blur",
  halo: "--ng-halo",
  haloSize: "--ng-halo-size",
  breath: "--ng-breath",
  breathSize: "--ng-breath-size",
};

/**
 * THE DIALS, grouped as the four shadow layers the user is judging. EVERY
 * DIAL IS AN INTEGER (NumberScrub is an integer control): strengths are
 * hundredths of full opacity, sizes are whole face-pixels of blur.
 *
 * SHIP VALUES ARE THE FT-1046b DRESSING — the current baked text-shadow:
 * under-light rgba(255,250,235,.5) at 1fpx blur, dark drop rgba(0,0,0,.55)
 * at 3fpx, close halo rgba(255,246,220,.6) at 4fpx, wide breath
 * rgba(255,240,200,.35) at 12fpx. Opening the lab changes NOTHING until a
 * dial moves.
 */
export const NUMERAL_DIALS = [
  {
    key: "under",
    group: "Under-light",
    label: "Strength",
    ship: 50,
    min: 0,
    max: 100,
    hint: "The crisp pale line under each stroke — the seat numerals' engraved trick — in hundredths (50 = shipped; 0 = none)",
  },
  {
    key: "drop",
    group: "Dark drop",
    label: "Strength",
    ship: 55,
    min: 0,
    max: 100,
    hint: "The dark shadow dropped below the ink — what cuts it out of the lit face — in hundredths (55 = shipped; 0 = none)",
  },
  {
    key: "dropBlur",
    group: "Dark drop",
    label: "Softness",
    ship: 3,
    min: 0,
    max: 8,
    hint: "How soft the dark drop's edge is, in face-pixels of blur (3 = shipped; 0 = a hard-edged copy)",
  },
  {
    key: "halo",
    group: "Close halo",
    label: "Strength",
    ship: 60,
    min: 0,
    max: 100,
    hint: "The warm glow hugging the strokes, in hundredths (60 = shipped; 0 = none)",
  },
  {
    key: "haloSize",
    group: "Close halo",
    label: "Size",
    ship: 4,
    min: 0,
    max: 10,
    hint: "How far the close halo reaches, in face-pixels of blur (4 = shipped; 0 = off regardless of strength)",
  },
  {
    key: "breath",
    group: "Wide breath",
    label: "Strength",
    ship: 35,
    min: 0,
    max: 100,
    hint: "The wide faint warmth around the whole numeral, in hundredths (35 = shipped; 0 = none)",
  },
  {
    key: "breathSize",
    group: "Wide breath",
    label: "Size",
    ship: 12,
    min: 0,
    max: 24,
    hint: "How far the breath spreads, in face-pixels of blur (12 = shipped; 0 = off regardless of strength)",
  },
];

const clamp = (dial, v) =>
  Math.max(dial.min, Math.min(dial.max, Math.round(Number(v) || 0)));

/** The dial's record, always concrete. */
export function numeralDial(key) {
  return NUMERAL_DIALS.find((d) => d.key === key);
}

/** Every dial at the value it ships at — the FT-1046b dressing. */
export function shippedNumeralLab() {
  const dials = {};
  NUMERAL_DIALS.forEach((d) => (dials[d.key] = d.ship));
  return { dials };
}

/** Read the persisted state. Anything unreadable reads as SHIPPED — a broken
 *  storage entry must never be able to bend the app. */
export function readNumeralLab() {
  const state = shippedNumeralLab();
  NUMERAL_DIALS.forEach((d) => {
    let v = d.ship;
    try {
      const raw = localStorage.getItem(NG_STORAGE[d.key]);
      if (raw !== null) v = Number(raw);
    } catch (e) {
      v = d.ship;
    }
    state.dials[d.key] = clamp(d, v);
  });
  return state;
}

/**
 * Publish the whole state onto <html>, where the numerals — deep inside the
 * face-hands layer — inherit it. A DIAL ON ITS SHIP VALUE PUBLISHES NOTHING
 * (the property is REMOVED): after Reset, <html> carries no `--ng-*`
 * property at all.
 */
export function publishNumeralLab(state) {
  const style = document.documentElement.style;
  NUMERAL_DIALS.forEach((d) => {
    const v = state.dials[d.key];
    if (v === d.ship) style.removeProperty(NG_VAR[d.key]);
    else style.setProperty(NG_VAR[d.key], String(v));
  });
}

/**
 * The lab as a Vue mixin — the fork's idiom for shared component behaviour.
 * One consumer: NumeralGlowLab.vue.
 */
export default {
  data() {
    return {
      ngLabOpen: false,
      ngLab: readNumeralLab(),
      ngDials: NUMERAL_DIALS,
    };
  },
  mounted() {
    // a stored value has to reach the ring on load, not on first drag
    publishNumeralLab(this.ngLab);
  },
  beforeDestroy() {
    // the lab going away restores the baked look (the veil lab's rule)
    publishNumeralLab(shippedNumeralLab());
  },
  methods: {
    /** Clamped against the dial's OWN declared bounds. */
    setNgDial(key, n) {
      const dial = numeralDial(key);
      if (!dial) return;
      this.$set(this.ngLab.dials, key, clamp(dial, n));
      publishNumeralLab(this.ngLab);
      try {
        localStorage.setItem(NG_STORAGE[key], String(this.ngLab.dials[key]));
      } catch (e) {
        // storage off: the dial still works for this session
      }
    },
    /** Back to the shipped dressing — FT-1046b's numbers, every dial on its
     *  ship value — which leaves <html> carrying no `--ng-*` property. */
    resetNgLab() {
      NUMERAL_DIALS.forEach((d) => this.setNgDial(d.key, d.ship));
    },
  },
};
