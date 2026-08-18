// Golem fork (FT-856 slice B): the NEW-icon library — ~1.3k curated
// game-icons.net silhouettes (CC BY 3.0, github.com/game-icons/icons),
// lazy-loaded as their own chunk when the forge's library tab opens.
// The browser shows raw silhouettes; a PICK renders the glyph with tones
// (gradient fill + ink edge) and runs the FT-856 engraving pass in the
// team's tint. One bake per role; the source ref rides along so a later
// team switch re-bakes.
import { stylizeIcon } from "./iconStyle";

export const THEMES = [
  "creatures",
  "death",
  "magic",
  "objects",
  "places",
  "people",
  "celestial"
];

let LIST = null;
export async function loadIcons() {
  if (!LIST) {
    const mod = await import(
      /* webpackChunkName: "icon-library" */ "./iconLibrary.json"
    );
    // frozen: 1.3k entries never need Vue reactivity
    LIST = Object.freeze(mod.default || mod);
  }
  return LIST;
}

export function findIcon(list, name) {
  return list.find(e => e.n === name) || null;
}

/** Raw silhouette (parchment-white on transparent) for the browser grid. */
export function silhouette(entry, size = 56) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  g.scale(size / 512, size / 512);
  g.fillStyle = "#e8e4da";
  for (const d of entry.d) g.fill(new Path2D(d));
  return c.toDataURL("image/png");
}

/** Render for the stylizer — a flat mid-tone fill; the SDF engraver owns
 *  ALL form now (relief light, contour, hatching), so the glyph goes in
 *  clean and the pipeline does the painting. */
export function shadedRender(entry, size = 256) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  g.scale(size / 512, size / 512);
  g.fillStyle = "rgb(178, 178, 178)";
  for (const d of entry.d) g.fill(new Path2D(d));
  return c.toDataURL("image/png");
}

/** Good and evil are the two official looks; travellers ride sepia. */
export function tintForTeam(roleType) {
  if (roleType === "minion" || roleType === "demon") return "evil";
  if (roleType === "traveller") return "neutral";
  return "good";
}

export function bakeIcon(entry, roleType, { seed = 0, size = 128 } = {}) {
  return stylizeIcon(shadedRender(entry), {
    tint: tintForTeam(roleType),
    size,
    seed
  });
}
