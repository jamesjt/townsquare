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

const KEY = "golem.chair";
let stored = null;
try {
  stored = localStorage.getItem(KEY);
} catch (e) {
  stored = null;
}
if (!CHAIRS.some((c) => c.id === stored)) stored = CHAIRS[0].id;

export const chairChoice = Vue.observable({ id: stored });

/** Paint the choice onto the root so every chair surface follows it. */
export function applyChair(id) {
  const pick = CHAIRS.some((c) => c.id === id) ? id : CHAIRS[0].id;
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
// So THE VAR STAYS UNSET until the user actually moves the dial — publishing
// a computed default here would flatten the bone surfaces toward stone on
// every fresh load, which is exactly the "untouched dial changes something"
// bug the fallback wiring exists to avoid. Once touched (localStorage
// remembers it, same as the pick and the opacity dial), the resolved color
// applies uniformly everywhere, which is the point of a single root var.
export const CHAIR_TONE_MIN = 0;
export const CHAIR_TONE_MAX = 1;

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
const hasStoredTone = storedToneRaw !== null;
let storedTone = parseFloat(storedToneRaw);
if (!(storedTone >= CHAIR_TONE_MIN && storedTone <= CHAIR_TONE_MAX)) {
  storedTone = CHAIR_TONE_MIN;
}

export const chairTone = Vue.observable({ v: storedTone });

/** Publish the tone dial onto the root — every chair-mask surface follows
 *  it once it's set, and only once it's set (see the note above). */
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

// Only replay a PREVIOUSLY-TOUCHED tone on load — a first-ever visit leaves
// --chair-ink unset so every surface keeps its own native color.
if (hasStoredTone) applyChairTone(storedTone);

// ── FT-1323 round 3 (user): THE SIZE DIALS, ONE PER SURFACE ────────────────
// "the size of it as slider for each place it shows up" — the chair mark
// does not share one box across the app (26%-of-coin on the resting mark,
// 28px on the claim hint, 1.15em in the seat menu, 22px in HostTools' Seats
// row), so each surface gets its OWN multiplier var, `--chair-size-<key>`,
// 1.0 = today's box exactly. Same remembered-per-key localStorage pattern.
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

const SIZE_KEY_PREFIX = "golem.chairSize.";

function readStoredSize(key) {
  let raw = null;
  try {
    raw = parseFloat(localStorage.getItem(SIZE_KEY_PREFIX + key));
  } catch (e) {
    raw = null;
  }
  return raw >= CHAIR_SIZE_MIN && raw <= CHAIR_SIZE_MAX ? raw : 1;
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

// 1.0 matches every consumer's own CSS fallback, so replaying it on load —
// even the never-touched default — is the same no-op the opacity dial relies
// on (unlike the tone dial above, where the fallbacks disagree with each
// other and an eager default would actually change something).
CHAIR_SIZE_SURFACES.forEach((s) => applyChairSize(s.key, initialSizes[s.key]));
