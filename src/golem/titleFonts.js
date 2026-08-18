// Golem fork: the PNG-font registry + the dev font switch.
// Three letter families live in assets (the blood alphabet, the gold cut,
// the four red shades); the TITLE word, the door drop-caps and the Almanac's
// A can wear any of them. The active choice is app-wide reactive state,
// persisted per browser — the dev control is the title itself (click the
// word to cycle) plus anything else that calls setFontSet.
// Only the DISPLAY letters (B L O O2 D H J A) bundle per set — the full
// alphabets stay non-bundled archives.
import Vue from "vue";

// require.context with a tight regex bundles ONLY the matched files
const bloodCtx = require.context("../assets/blood/alphabet", false, /^\.\/(B|L|O|O2|D|H|J|A)\.png$/);
const goldCtx = require.context("../assets/gold/alphabet", false, /^\.\/(B|L|O|D|H|J|A)\.png$/);
const red66Ctx = require.context("../assets/red/660000-noise50", false, /^\.\/(B|L|O|D|H|J|A)\.png$/);
const red77Ctx = require.context("../assets/red/770001-noise50", false, /^\.\/(B|L|O|D|H|J|A)\.png$/);
const red80Ctx = require.context("../assets/red/800000-noise50", false, /^\.\/(B|L|O|D|H|J|A)\.png$/);
const red80cCtx = require.context("../assets/red/800000", false, /^\.\/(B|L|O|D|H|J|A)\.png$/);

import bloodMetrics from "../assets/blood/alphabet/metrics.json";
import goldMetrics from "../assets/gold/alphabet/metrics.json";
import red66Metrics from "../assets/red/660000-noise50/metrics.json";
import red77Metrics from "../assets/red/770001-noise50/metrics.json";
import red80Metrics from "../assets/red/800000-noise50/metrics.json";
import red80cMetrics from "../assets/red/800000/metrics.json";

function buildSet(ctx, metrics) {
  const letters = {};
  ctx.keys().forEach(k => {
    const name = k.replace("./", "").replace(".png", "");
    if (metrics[name]) letters[name] = { src: ctx(k), ...metrics[name] };
  });
  return letters;
}

/** key → { label, letters } ("logo" is special: the gold logo art, no glyphs) */
export const FONT_SETS = [
  { key: "blood", label: "Blood alphabet", letters: buildSet(bloodCtx, bloodMetrics) },
  { key: "logo", label: "Gold logo art", letters: null },
  { key: "gold", label: "Gold letters", letters: buildSet(goldCtx, goldMetrics) },
  { key: "red-66", label: "Red 660000", letters: buildSet(red66Ctx, red66Metrics) },
  { key: "red-77", label: "Red 770001", letters: buildSet(red77Ctx, red77Metrics) },
  { key: "red-80", label: "Red 800000", letters: buildSet(red80Ctx, red80Metrics) },
  { key: "red-80c", label: "Red 800000 clean", letters: buildSet(red80cCtx, red80cMetrics) }
];

export const fontState = Vue.observable({
  key: localStorage.getItem("golem.fontSet") || "blood"
});

export function setFontSet(key) {
  fontState.key = key;
  localStorage.setItem("golem.fontSet", key);
}

export function cycleFontSet() {
  const i = FONT_SETS.findIndex(s => s.key === fontState.key);
  const next = FONT_SETS[(i + 1) % FONT_SETS.length];
  setFontSet(next.key);
  return next;
}

export function activeSet() {
  return FONT_SETS.find(s => s.key === fontState.key) || FONT_SETS[0];
}

/** A letter from the active set (O2 falls back to O; null in logo mode). */
export function glyph(letter) {
  const set = activeSet();
  if (!set.letters) return null;
  return set.letters[letter] || (letter === "O2" ? set.letters.O : null) || null;
}

/** em-sizing for a glyph at `scale` em cap height — normalized per set by
 *  the B's above-baseline height so every family renders the same size. */
export function glyphStyle(letter, scale = 1) {
  const g = glyph(letter);
  const set = activeSet();
  if (!g || !set.letters || !set.letters.B) return null;
  const ref = set.letters.B.baseline || set.letters.B.h;
  const em = px => ((px / ref) * scale).toFixed(3) + "em";
  return {
    width: em(g.w),
    height: em(g.h),
    verticalAlign: "-" + em(Math.max(0, g.h - g.baseline))
  };
}
