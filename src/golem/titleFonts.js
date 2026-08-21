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
// the display letters (title, doors, Almanac A, the dial's CLOCKTOWER) PLUS
// G/F/V (FT-948): the Keys panel binds hotkeys the title/dial never needed
// a letter for, and it now reads its caps from these same sets (see
// glyphCapStyleFrom + golem/hotkeys.js) — every letter HOTKEYS binds has to
// resolve here or it falls out of the picker's family entirely.
// Trimmed 2026-08-17 (user call): the option list is Red 970000,
// Gold D7A25F and the carved Clocktower caps — the earlier families stay
// on disk (assets + design sources) but are no longer bundled or cycled.
const red97Ctx = require.context("../assets/red/970000", false, /^\.\/(B|L|O|D|H|J|A|C|K|T|W|E|R|N|S|G|F|V|o_lc|n_lc|t_lc|h_lc|e_lc)\.png$/);
const tanCtx = require.context("../assets/gold/d7a25f", false, /^\.\/(B|L|O|D|H|J|A|C|K|T|W|E|R|N|S|G|F|V|o_lc|n_lc|t_lc|h_lc|e_lc)\.png$/);
// FT-1020c: I and X join the Clocktower bundle — the dial's ring numerals
// (FaceHands.vue) are composed from I/V/X of this carved set, the same art
// the entry screen's CLOCKTOWER lettering wears.
const ctCtx = require.context("../assets/gold/clocktower", false, /^\.\/(B|L|O|D|H|J|A|C|K|T|W|E|R|N|S|G|F|V|I|X)\.png$/);

import red97Metrics from "../assets/red/970000/metrics.json";
import tanMetrics from "../assets/gold/d7a25f/metrics.json";
import ctMetrics from "../assets/gold/clocktower/metrics.json";

function buildSet(ctx, metrics) {
  const letters = {};
  ctx.keys().forEach(k => {
    const name = k.replace("./", "").replace(".png", "");
    if (metrics[name]) letters[name] = { src: ctx(k), ...metrics[name] };
  });
  return letters;
}

/** key → { label, letters } — the working trio (user call 2026-08-17) */
export const FONT_SETS = [
  { key: "red-97", label: "Red 970000", letters: buildSet(red97Ctx, red97Metrics) },
  { key: "tan", label: "Gold D7A25F", letters: buildSet(tanCtx, tanMetrics) },
  { key: "ct", label: "Clocktower", letters: buildSet(ctCtx, ctMetrics) }
];

export const fontState = Vue.observable({
  // SETTLED (user call 2026-08-18): the title and "on the" both wear Red
  // 970000 — fixed, no dial, storage ignored (their lab rows are hidden).
  key: "red-97",
  ontheKey: "red-97",
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

// stored choices may point at families that left the option list — snap
// each field back to a legal value so nothing renders off the registry
(function sanitize() {
  const keys = FONT_SETS.map(s => s.key);
  const legal = {
    key: [keys, "red-97"],
    ontheKey: [FONT_SETS.filter(s => s.letters.o_lc).map(s => s.key), "tan"],
    clockKey: [["text", ...keys], "text"],
    towerKey: [["text", ...keys], "text"],
    capKey: [["follow", ...keys], "follow"]
  };
  const storageOf = {
    key: "golem.fontSet",
    ontheKey: "golem.ontheFont",
    clockKey: "golem.clockFont",
    towerKey: "golem.towerFont",
    capKey: "golem.capFont"
  };
  for (const [field, [options, fallback]] of Object.entries(legal)) {
    if (!options.includes(fontState[field])) {
      fontState[field] = fallback;
      localStorage.setItem(storageOf[field], fallback);
    }
  }
})();

/** Generic cycler for the debug panel: field → its option list + storage. */
const FIELD_DEFS = {
  key: { storage: "golem.fontSet", options: () => FONT_SETS.map(s => s.key) },
  ontheKey: {
    storage: "golem.ontheFont",
    options: () => FONT_SETS.filter(s => s.letters && s.letters.o_lc).map(s => s.key)
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

/** Drop-caps sit AT the label letters' cap height (user calls 2026-08-17/18:
 *  0.8 still towered over the text — the ornate flourishes read bigger than
 *  the box — and 1.0 went the wrong way entirely). */
export const CAP_SHRINK = 0.85;

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

/** A single stand-alone drop-cap (a door's "H", a hotkey chip's "S") — NOT
 *  a word. glyphStyleFrom above normalizes every letter against the SET's
 *  reference letter (B), which is right for a WORD (every letter needs to
 *  share one baseline so the word reads as one font) but wrong for a lone
 *  cap: it silently assumes every capital crops to B's baseline, and it
 *  doesn't — J crops ~5% taller in red-97 and fell out of its box (FT-anon,
 *  2026-08-19). Moved here from Intro.vue's capStyle (FT-948) so the entry
 *  doors and the Keys panel — the app's other lone-drop-cap surface — share
 *  ONE normalization instead of each re-deriving it. glyphStyleFrom and its
 *  WORD callers (titleGlyphs, ontheGlyphs, the dial letters) are untouched;
 *  they depend on the shared-B-reference behaviour and would misalign if
 *  switched to this.
 *
 *  Sized at `scale*CAP_SHRINK` em of the glyph's OWN cap-height (top to its
 *  own baseline) — identical across every letter in a set — with width and
 *  descender (h − baseline) scaling at that same per-letter rate, so aspect
 *  ratio and each glyph's actual baked descent are preserved exactly as
 *  trimmed. `scale` defaults to 1.09, the door caps' size against their key
 *  font (see golem/hotkeys.js's CAP_EM comment for where that number is
 *  from). */
export function glyphCapStyleFrom(key, letter, scale = 1.09) {
  const g = glyphFrom(key, letter);
  if (!g || !g.baseline) return null;
  const emPerPx = (scale * CAP_SHRINK) / g.baseline;
  const em = px => (px * emPerPx).toFixed(3) + "em";
  return {
    width: em(g.w),
    height: em(g.h),
    verticalAlign: "-" + em(Math.max(0, g.h - g.baseline))
  };
}
