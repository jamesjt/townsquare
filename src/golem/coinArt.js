// Golem fork: WHICH COIN the seats wear (user call 2026-08-18 — "make a debug
// area for changing the player coins").
//
// The choice is published as CSS custom properties on the document root, so
// swapping is a repaint: Token and the seat's life face both read var(--coin)
// / var(--coin-dead) rather than importing one file. Persisted per browser.
import Vue from "vue";

const req = require.context("../assets/coins", false, /\.png$/);
const art = id => req("./" + id + ".png");

//  is where each coin's parchment ends, as a fraction of its radius —
// measured off the baked art, not guessed. The team ring rides just inside it,
// so switching coins moves the ring with them.
export const COINS = [
  { id: "coin4", label: "Coin 4", face: 0.947 },
  { id: "coin3", label: "Coin 3", face: 0.951 },
  { id: "player2", label: "Player 2", face: 0.961 },
  { id: "player1", label: "Player 1", face: 0.971 }
];

const KEY = "golem.coin";
let stored = null;
try {
  stored = localStorage.getItem(KEY);
} catch (e) {
  stored = null;
}
if (!COINS.some(c => c.id === stored)) stored = COINS[0].id;

export const coinChoice = Vue.observable({ id: stored });

/** Paint the choice onto the root so every coin surface follows it. */
export function applyCoin(id) {
  const pick = COINS.some(c => c.id === id) ? id : COINS[0].id;
  coinChoice.id = pick;
  const root = document.documentElement;
  root.style.setProperty("--coin", `url(${art(pick)})`);
  root.style.setProperty("--coin-dead", `url(${art(pick + "-dead")})`);
  // the ring: a band just inside this coin's own face edge
  const face = (COINS.find(c => c.id === pick) || {}).face || 0.95;
  const pct = f => (f * 100).toFixed(1) + "%";
  root.style.setProperty("--ring-in", pct(face - 0.075));
  root.style.setProperty("--ring-a", pct(face - 0.055));
  root.style.setProperty("--ring-b", pct(face - 0.02));
  root.style.setProperty("--ring-out", pct(face));
  try {
    localStorage.setItem(KEY, pick);
  } catch (e) {
    // a browser with storage off still gets the swap for this session
  }
}

applyCoin(stored);
