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
