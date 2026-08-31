// Golem fork: WHICH CHAIR the seat marks wear (FT-1337, user call — "make a
// chair lab to allow me to try out each of those icons instead of our current
// chair icon"). The coin lab's twin, one register down the same shelf.
//
// The choice is published as ONE CSS custom property on the document root —
// `--chair` — and every chair surface (the empty seat's resting mark, the
// claim overlay's invitation, the seat menu rows, the claimed seat's badge,
// HostTools' Seats row) wears it as a MASK painted with CSS ink. So the assets
// only need a clean alpha silhouette: stone/bone comes from each consumer's
// own `color`/`background-color`, and swapping is a repaint, no per-consumer
// color hacks.
//
// Deliberately the LEGACY lab pattern (coinArt before FT-1318 promoted it to
// a player setting): localStorage only, no pref plumbing. Promotion to the
// player settings is a later call, not this module's.
import Vue from "vue";

// the incumbent stays first and default — the lab tries chairs ON, it never
// retires one
import seatFront from "../assets/ui-seat-front.svg";
import opt1 from "../assets/chair-opt-1.png";
import opt2 from "../assets/chair-opt-2.png";
import opt3 from "../assets/chair-opt-3.png";
import opt4 from "../assets/chair-opt-4.png";

// chair-opt-1..4 are the user's four gothic cog-back drawings (chairs/ at the
// main repo root), stone-passed by claude_temp_test/2026-08-30-ft1337-stonepass.mjs:
// background lifted to transparency, white fills opaque, black linework left
// transparent, RGB baked to the resting chair's stone #9a9285 (mask consumers
// ignore it; the lab thumbnails and any <img> fallback read it).
export const CHAIRS = [
  { id: "seat-front", label: "Current", src: seatFront },
  { id: "opt1", label: "Throne cog", src: opt1 },
  { id: "opt2", label: "Wheel hub", src: opt2 },
  { id: "opt3", label: "Star tooth", src: opt3 },
  { id: "opt4", label: "Sunburst", src: opt4 },
];

// FT-1323 BAKE (2026-08-30, user call): the pick the user dialled in the lab
// is now the SHIPPED default for a fresh browser — "opt2" (Wheel hub), not
// the list's first entry. `CHAIRS[0]` stays "Current"/seat-front and stays
// FIRST in the array (the "never retires one" comment above still holds —
// list order is unrelated to which id a fresh browser lands on), so this is
// named separately rather than read off `CHAIRS[0]`.
const DEFAULT_CHAIR_ID = "opt2";

const KEY = "golem.chair";
let stored = null;
try {
  stored = localStorage.getItem(KEY);
} catch (e) {
  stored = null;
}
if (!CHAIRS.some((c) => c.id === stored)) stored = DEFAULT_CHAIR_ID;

export const chairChoice = Vue.observable({ id: stored });

/** Paint the choice onto the root so every chair surface follows it. */
export function applyChair(id) {
  const pick = CHAIRS.some((c) => c.id === id) ? id : DEFAULT_CHAIR_ID;
  chairChoice.id = pick;
  const src = CHAIRS.find((c) => c.id === pick).src;
  document.documentElement.style.setProperty("--chair", `url(${src})`);
  try {
    localStorage.setItem(KEY, pick);
  } catch (e) {
    // a browser with storage off still gets the swap for this session
  }
}

applyChair(stored);

// ── FT-1323/FT-1350 (user): THE OPACITY DIAL ────────────────────────────────
// How strongly the chair mark paints, published as a SECOND root var beside
// --chair: `--chair-opacity`, worn by every consumer of the chair mask.
// ABSOLUTE on the resting coin chair (user call 2026-08-30: 1.0 = solid —
// the old muted rest is dial 0.75, not a baked ceiling); the other surfaces
// rest at full strength already, so the dial reads the same everywhere.
// Same legacy lab pattern as the pick above: localStorage, no pref plumbing.
export const CHAIR_OPACITY_MIN = 0.2;
export const CHAIR_OPACITY_MAX = 1;

const OPACITY_KEY = "golem.chairOpacity";
let storedOp = null;
try {
  storedOp = parseFloat(localStorage.getItem(OPACITY_KEY));
} catch (e) {
  storedOp = null;
}
if (!(storedOp >= CHAIR_OPACITY_MIN && storedOp <= CHAIR_OPACITY_MAX)) {
  storedOp = 1;
}

export const chairOpacity = Vue.observable({ v: storedOp });

/** Publish the dial onto the root so every chair surface follows it. */
export function applyChairOpacity(v) {
  const n = Math.min(
    CHAIR_OPACITY_MAX,
    Math.max(CHAIR_OPACITY_MIN, parseFloat(v) || 1),
  );
  chairOpacity.v = n;
  document.documentElement.style.setProperty("--chair-opacity", String(n));
  try {
    localStorage.setItem(OPACITY_KEY, String(n));
  } catch (e) {
    // storage off: the dial still works for this session
  }
}

applyChairOpacity(storedOp);

// ── FT-1323 round 3 (user): THE TONE DIAL ───────────────────────────────────
// "chair needs to be brighter still, less stone maybe? more white? can we
// make that a slider" — one 0-1 dial from the resting stone (#9a9285) to pure
// white, published as a THIRD root var beside --chair/--chair-opacity:
// --chair-ink. Every chair-mask consumer's paint color reads
// `var(--chair-ink, <its own current color>)` — and the fallback is each
// consumer's OWN color, not one shared value, because the five surfaces
// don't all rest at the same ink today (open-mark/seat badge sit at stone
// #9a9285; the pm-mark spans and HostTools' Seats row sit at bone #cfc4ae).
//
// FT-1323 BAKE (2026-08-30, user call): "0.75 ... now published by default".
// THE UNSET-UNTIL-TOUCHED DISCIPLINE RETIRES. It existed to protect the bone
// surfaces from being flattened toward stone by a computed default nobody
// asked for — but 0.75 is no longer a guess, it is the value the user dialled
// and previewed across every surface, so publishing it uniformly on a fresh
// load is not "an untouched dial changing something", it is shipping the
// look that was actually chosen. `--chair-ink` is now ALWAYS set (see the
// unconditional `applyChairTone(storedTone)` call below); a browser with a
// stored value still gets its own, because the lab remains the override.
export const CHAIR_TONE_MIN = 0;
export const CHAIR_TONE_MAX = 1;
// The baked default (FT-1323 bake) — the stone→white mix a fresh browser
// ships with, uniform on every chair-mask surface exactly as previewed.
export const CHAIR_TONE_DEFAULT = 0.75;

const CHAIR_TONE_STONE = [0x9a, 0x92, 0x85]; // #9a9285, the dial's floor
const CHAIR_TONE_WHITE = [0xff, 0xff, 0xff]; // the dial's ceiling

function mixChairTone(t) {
  const [r, g, b] = CHAIR_TONE_STONE.map((c, i) =>
    Math.round(c + (CHAIR_TONE_WHITE[i] - c) * t),
  );
  return `rgb(${r}, ${g}, ${b})`;
}

const TONE_KEY = "golem.chairTone";
let storedToneRaw = null;
try {
  storedToneRaw = localStorage.getItem(TONE_KEY);
} catch (e) {
  storedToneRaw = null;
}
let storedTone = parseFloat(storedToneRaw);
if (!(storedTone >= CHAIR_TONE_MIN && storedTone <= CHAIR_TONE_MAX)) {
  storedTone = CHAIR_TONE_DEFAULT;
}

export const chairTone = Vue.observable({ v: storedTone });

/** Publish the tone dial onto the root — every chair-mask surface follows
 *  it. Always called (see the unconditional call below): the baked default
 *  ships uniform ink on a fresh browser now, not an unset var. */
export function applyChairTone(v) {
  const n = Math.min(CHAIR_TONE_MAX, Math.max(CHAIR_TONE_MIN, parseFloat(v)));
  const value = Number.isFinite(n) ? n : CHAIR_TONE_MIN;
  chairTone.v = value;
  document.documentElement.style.setProperty(
    "--chair-ink",
    mixChairTone(value),
  );
  try {
    localStorage.setItem(TONE_KEY, String(value));
  } catch (e) {
    // storage off: the dial still works for this session
  }
}

// ALWAYS publish now (FT-1323 bake) — a fresh browser gets CHAIR_TONE_DEFAULT
// (0.75) exactly as a stored browser gets its own remembered value; see the
// note above the constant for why the old "leave --chair-ink unset until
// touched" guard is gone.
applyChairTone(storedTone);

// ── FT-1323 round 3 (user): THE SIZE DIALS, ONE PER SURFACE ────────────────
// "the size of it as slider for each place it shows up" — the chair mark
// does not share one box across the app (26%-of-coin on the resting mark,
// 28px on the claim hint, 1.15em in the seat menu, 22px in HostTools' Seats
// row), so each surface gets its OWN multiplier var, `--chair-size-<key>`.
// 1.0 remains each consumer's OWN box, unscaled — that is the CSS-side
// fallback these vars are multiplied against (Player.vue etc.) and does not
// change here.
export const CHAIR_SIZE_MIN = 0.5;
export const CHAIR_SIZE_MAX = 2;

// The label is what the lab shows beside the slider; the key names the CSS
// var (`--chair-size-${key}`) and the localStorage slot.
export const CHAIR_SIZE_SURFACES = [
  { key: "coin", label: "Empty coin" },
  { key: "claim", label: "Claim hint" },
  { key: "menu", label: "Seat menu" },
  { key: "seatsrow", label: "Seats row" },
];

// FT-1323 BAKE (2026-08-30, user call): the per-surface sizes dialled in the
// lab, published as the SHIPPED default for a fresh browser — replacing the
// flat 1.0 every surface used to fall back to. A browser with a stored value
// for a key still gets its own (the lab remains the override, same as the
// chair pick and the tone dial above); only a never-touched key lands here.
const DEFAULT_CHAIR_SIZES = {
  coin: 2,
  claim: 2,
  menu: 1.35,
  seatsrow: 1.3,
};

const SIZE_KEY_PREFIX = "golem.chairSize.";

function readStoredSize(key) {
  let raw = null;
  try {
    raw = parseFloat(localStorage.getItem(SIZE_KEY_PREFIX + key));
  } catch (e) {
    raw = null;
  }
  return raw >= CHAIR_SIZE_MIN && raw <= CHAIR_SIZE_MAX
    ? raw
    : DEFAULT_CHAIR_SIZES[key];
}

const initialSizes = {};
CHAIR_SIZE_SURFACES.forEach((s) => {
  initialSizes[s.key] = readStoredSize(s.key);
});

export const chairSize = Vue.observable(initialSizes);

/** Publish one surface's size multiplier onto the root. */
export function applyChairSize(key, v) {
  if (!CHAIR_SIZE_SURFACES.some((s) => s.key === key)) return;
  const n = Math.min(CHAIR_SIZE_MAX, Math.max(CHAIR_SIZE_MIN, parseFloat(v)));
  const value = Number.isFinite(n) ? n : 1;
  chairSize[key] = value;
  document.documentElement.style.setProperty(
    `--chair-size-${key}`,
    String(value),
  );
  try {
    localStorage.setItem(SIZE_KEY_PREFIX + key, String(value));
  } catch (e) {
    // storage off: the dial still works for this session
  }
}

// ALWAYS published (FT-1323 bake) — a never-touched key now publishes its
// own DEFAULT_CHAIR_SIZES value rather than the flat 1.0 a consumer's own
// CSS falls back to, same as the chair pick and the tone dial above: the
// var is always set from JS, so the CSS-side `var(--chair-size-x, 1)`
// fallback is only ever read if this module fails to run at all.
CHAIR_SIZE_SURFACES.forEach((s) => applyChairSize(s.key, initialSizes[s.key]));
