// Golem fork: the PNG-font registry + the dev font switch.
// Three letter families live in assets (the blood alphabet, the gold cut,
// the four red shades); the TITLE word, the door drop-caps and the Almanac's
// A can wear any of them. The active choice is app-wide reactive state,
// persisted per browser — the dev control is the title itself (click the
// word to cycle) plus anything else that calls setFontSet.
// Only the DISPLAY letters (B L O O2 D H J A) bundle per set — the full
// alphabets stay non-bundled archives.
import Vue from "vue";

// require.context with a tight regex bundles ONLY the matched files —
// the display letters (title, doors, Almanac A, the dial's CLOCKTOWER)
const bloodCtx = require.context("../assets/blood/alphabet", false, /^\.\/(B|L|O|O2|D|H|J|A|C|K|T|W|E|R|o_lc|n_lc|t_lc|h_lc|e_lc)\.png$/);
const goldCtx = require.context("../assets/gold/alphabet", false, /^\.\/(B|L|O|D|H|J|A|C|K|T|W|E|R|o_lc|n_lc|t_lc|h_lc|e_lc)\.png$/);
const red66Ctx = require.context("../assets/red/660000-noise50", false, /^\.\/(B|L|O|D|H|J|A|C|K|T|W|E|R|o_lc|n_lc|t_lc|h_lc|e_lc)\.png$/);
const red77Ctx = require.context("../assets/red/770001-noise50", false, /^\.\/(B|L|O|D|H|J|A|C|K|T|W|E|R|o_lc|n_lc|t_lc|h_lc|e_lc)\.png$/);
const red80Ctx = require.context("../assets/red/800000-noise50", false, /^\.\/(B|L|O|D|H|J|A|C|K|T|W|E|R|o_lc|n_lc|t_lc|h_lc|e_lc)\.png$/);
const red80cCtx = require.context("../assets/red/800000", false, /^\.\/(B|L|O|D|H|J|A|C|K|T|W|E|R|o_lc|n_lc|t_lc|h_lc|e_lc)\.png$/);
const clockCtx = require.context("../assets/gold/clockface", false, /^\.\/(B|L|O|D|H|J|A|C|K|T|W|E|R|o_lc|n_lc|t_lc|h_lc|e_lc)\.png$/);
const gold2Ctx = require.context("../assets/gold/v2", false, /^\.\/(B|L|O|D|H|J|A|C|K|T|W|E|R|o_lc|n_lc|t_lc|h_lc|e_lc)\.png$/);

import bloodMetrics from "../assets/blood/alphabet/metrics.json";
import goldMetrics from "../assets/gold/alphabet/metrics.json";
import red66Metrics from "../assets/red/660000-noise50/metrics.json";
import red77Metrics from "../assets/red/770001-noise50/metrics.json";
import red80Metrics from "../assets/red/800000-noise50/metrics.json";
import red80cMetrics from "../assets/red/800000/metrics.json";
import clockMetrics from "../assets/gold/clockface/metrics.json";
import gold2Metrics from "../assets/gold/v2/metrics.json";

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
  { key: "gold-clock", label: "Clockface gold", letters: buildSet(clockCtx, clockMetrics) },
  { key: "gold2", label: "Gold v2", letters: buildSet(gold2Ctx, gold2Metrics) },
  { key: "red-66", label: "Red 660000", letters: buildSet(red66Ctx, red66Metrics) },
  { key: "red-77", label: "Red 770001", letters: buildSet(red77Ctx, red77Metrics) },
  { key: "red-80", label: "Red 800000", letters: buildSet(red80Ctx, red80Metrics) },
  { key: "red-80c", label: "Red 800000 clean", letters: buildSet(red80cCtx, red80cMetrics) }
];

export const fontState = Vue.observable({
  // the 800000 red is the default lettering (user call 2026-08-17)
  key: localStorage.getItem("golem.fontSet") || "red-80",
  // "on the": the gold script art, or any family's lowercase letters
  ontheKey: localStorage.getItem("golem.ontheFont") || "goldart",
  // the dial's two words, each their own choice ("text" = painted spans;
  // the retired single dialKey seeds both)
  clockKey:
    localStorage.getItem("golem.clockFont") ||
    localStorage.getItem("golem.dialFont") ||
    "text",
  towerKey:
    localStorage.getItem("golem.towerFont") ||
    localStorage.getItem("golem.dialFont") ||
    "text",
  // the door/button drop-caps: "follow" mirrors the title's choice
  capKey: localStorage.getItem("golem.capFont") || "follow"
});

/** Generic cycler for the debug panel: field → its option list + storage. */
const FIELD_DEFS = {
  key: { storage: "golem.fontSet", options: () => FONT_SETS.map(s => s.key) },
  ontheKey: {
    storage: "golem.ontheFont",
    options: () =>
      ["goldart"].concat(
        FONT_SETS.filter(s => s.letters && s.letters.o_lc).map(s => s.key)
      )
  },
  clockKey: {
    storage: "golem.clockFont",
    options: () => ["text"].concat(FONT_SETS.filter(s => s.letters).map(s => s.key))
  },
  towerKey: {
    storage: "golem.towerFont",
    options: () => ["text"].concat(FONT_SETS.filter(s => s.letters).map(s => s.key))
  },
  capKey: {
    storage: "golem.capFont",
    options: () => ["follow"].concat(FONT_SETS.filter(s => s.letters).map(s => s.key))
  }
};

export function cycleField(field) {
  const def = FIELD_DEFS[field];
  const options = def.options();
  const i = options.indexOf(fontState[field]);
  const next = options[(i + 1) % options.length];
  fontState[field] = next;
  localStorage.setItem(def.storage, next);
  return labelFor(next);
}

export function labelFor(key) {
  if (key === "text") return "Painted text";
  if (key === "follow") return "Follow the title";
  if (key === "goldart") return "Gold script art";
  const s = FONT_SETS.find(x => x.key === key);
  return s ? s.label : key;
}

/** Sheet-family drop-caps render smaller than the chunky blood art — the
 *  ornate letters overpower the door labels at full size (user call). */
export const CAP_SHRINK = 0.8;

/** What the caps actually wear right now ("follow" resolves to the title). */
export function resolvedCapKey() {
  return fontState.capKey === "follow" ? fontState.key : fontState.capKey;
}

const CAP_KEYS = ["follow"].concat(
  FONT_SETS_KEYS_WITH_LETTERS()
);
function FONT_SETS_KEYS_WITH_LETTERS() {
  return FONT_SETS.filter(s => s.letters).map(s => s.key);
}
export function cycleCapFont() {
  const i = CAP_KEYS.indexOf(fontState.capKey);
  const next = CAP_KEYS[(i + 1) % CAP_KEYS.length];
  fontState.capKey = next;
  localStorage.setItem("golem.capFont", next);
  return next === "follow"
    ? { key: "follow", label: "Follow the title" }
    : FONT_SETS.find(s => s.key === next);
}

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

/** The dial cycles text + every glyph family (logo has no letters). */
const DIAL_KEYS = ["text"].concat(
  FONT_SETS.filter(s => s.letters).map(s => s.key)
);
export function cycleDialFont() {
  const i = DIAL_KEYS.indexOf(fontState.dialKey);
  const next = DIAL_KEYS[(i + 1) % DIAL_KEYS.length];
  fontState.dialKey = next;
  localStorage.setItem("golem.dialFont", next);
  return next === "text"
    ? { key: "text", label: "Painted text" }
    : FONT_SETS.find(s => s.key === next);
}

function setByKey(key) {
  return FONT_SETS.find(s => s.key === key) || FONT_SETS[0];
}

export function activeSet() {
  return setByKey(fontState.key);
}

/** A letter from a set (O2 falls back to O; null in logo mode). */
export function glyphFrom(key, letter) {
  const set = setByKey(key);
  if (!set.letters) return null;
  return set.letters[letter] || (letter === "O2" ? set.letters.O : null) || null;
}

export function glyph(letter) {
  return glyphFrom(fontState.key, letter);
}

/** em-sizing for a glyph at `scale` em cap height — normalized per set by
 *  the B's above-baseline height so every family renders the same size. */
export function glyphStyleFrom(key, letter, scale = 1) {
  const g = glyphFrom(key, letter);
  const set = setByKey(key);
  if (!g || !set.letters || !set.letters.B) return null;
  const ref = set.letters.B.baseline || set.letters.B.h;
  const em = px => ((px / ref) * scale).toFixed(3) + "em";
  return {
    width: em(g.w),
    height: em(g.h),
    verticalAlign: "-" + em(Math.max(0, g.h - g.baseline))
  };
}

export function glyphStyle(letter, scale = 1) {
  return glyphStyleFrom(fontState.key, letter, scale);
}
