/**
 * Golem fork (FT-936): the CENTRE-FACE SPLAT.
 *
 * One blood mark, dealt once per game, sitting dead centre on the clock
 * face -- behind the town readout, the seats, everything (TownSquare.vue
 * lays it at negative z-index, under TownInfo's own hub). "A game beginning
 * should mark the clock" -- the ask this exists for.
 *
 * ART: src/assets/blood/splats/, not src/assets/blood/stains/ -- the dried,
 * muted set TownSquare.vue's own per-seat dead-stain dial already wears
 * (.blood-dial). The splats are vivid, saturated red: a FRESH mark for a
 * fresh game, visually distinct from the dried stains that accumulate as
 * seats die later in the same game. Wearing the stains' own look here would
 * read as "another death", not "the game began".
 *
 * SEED: the town id, the script, the roster and the night counter -- never
 * a per-client dice roll. Two clients in the SAME game must see the SAME
 * splat (the storyteller and every player), so this has to be a
 * deterministic hash over facts every client already has synced -- the same
 * trick TownSquare.vue's own dead-seat stainOrder() uses for its per-town
 * shuffle bag (hashString / seededRandoms below are shared with it). See
 * TownSquare.vue's faceSplatLive/faceSplatSeed for what actually goes into
 * the hash and why role identities themselves cannot be part of it (they
 * are private per-seat, FT-861 / the 2026-08-19 bluffs hardening -- a
 * normal player's client never learns anyone's role but their own).
 */

const splatCtx = require.context("../assets/blood/splats", false, /\.png$/);
const SPLAT_FILES = splatCtx.keys().sort();
const SPLAT_URL = {};
SPLAT_FILES.forEach((key) => {
  const file = key.replace("./", "");
  SPLAT_URL[file] = splatCtx(key);
});

/**
 * USER CALL (2026-08-19): "this one is... problematic, let's not use it."
 * blood-16.png -- a heavy, blocky mass at the top with five or six long,
 * straight drips running parallel beneath it. The file stays on disk (never
 * delete art without permission -- MEMORY-CORE rule 1); it is just never
 * dealt from here.
 */
const EXCLUDED = new Set(["blood-16.png"]);

const POOL = Object.keys(SPLAT_URL)
  .filter((file) => !EXCLUDED.has(file))
  .sort();

/**
 * SIZE, per file -- measured, not eyeballed. The 16 files are not drawn at
 * one scale: some fill their canvas, some are a stray mark in a mostly
 * empty one. Rendered at one common box they read as sixteen different
 * scales, not one motif.
 *
 * Normalised on INK AREA (alpha > 16/255 pixel count, taken as an
 * equivalent radius via sqrt(area/pi)) -- not the alpha bounding box. Bbox
 * is wrong on its own for this art: blood-12.png (a thin diagonal spatter)
 * has an ABOVE-median box but a BELOW-median ink count, so normalising by
 * bbox SHRINKS it (0.924x) -- exactly backwards, since it is the thin,
 * far-reaching ones that need protecting from shrinking, not the ones
 * getting it. Ink-area correctly GROWS it instead (1.123x). Full 16-row
 * table, method and a side-by-side contact sheet of all 16 at these numbers:
 * claude_temp_test/2026-08-19-splat-measure/ (measure.html, contact-sheet.html).
 *
 * TARGET_INK_R = 42 face-px -- the common on-screen ink-radius every file
 * is scaled to. Picked so the sparsest file (blood-13.png, whose bbox is
 * 6.25x its own ink-radius) still lands ~0.55 * --face-r from centre after
 * scaling -- clear of the outer dead-stain band (r=185, 0.78 * --face-r)
 * and nowhere near the rim. The densest file (blood-09.png) reaches ~0.31
 * of --face-r -- still a real mark, not a dot.
 *
 * Each value is the side, in face-px, of the square box that file's PNG
 * should render into (background-size: contain keeps its own aspect ratio
 * inside that box) -- box = 42 * max(naturalW, naturalH) / inkRadius.
 * Hand-tunable: change a number here to re-scale one file without touching
 * the art. Adding a new file to the splats/ folder means re-running the
 * measurement rig and adding its row here -- there is no runtime
 * measurement, on purpose (16 PNGs decoded on every boot is not a cost this
 * decoration is worth).
 */
export const SPLAT_BOX_PX = {
  "blood-01.png": 147.3,
  "blood-02.png": 148.8,
  "blood-03.png": 122.2,
  "blood-04.png": 174.4,
  "blood-05.png": 201.3,
  "blood-06.png": 188.4,
  "blood-07.png": 176.7,
  "blood-08.png": 131.8,
  "blood-09.png": 127.2,
  "blood-10.png": 143.5,
  "blood-11.png": 120.3,
  "blood-12.png": 213.6,
  "blood-13.png": 223.2,
  "blood-14.png": 153.4,
  "blood-15.png": 222.8,
  "blood-16.png": 174.9, // excluded from POOL above -- kept for completeness
};

/** FNV-1a over a string -- unchanged from the hash TownSquare.vue's stain
 *  shuffle bag has always used; moved here so both features share one
 *  implementation (MEMORY-CORE rule 2: reuse before rebuild). */
export const hashString = (str) => {
  let h = 2166136261;
  for (let c = 0; c < str.length; c++) {
    h ^= str.charCodeAt(c);
    h = (h * 16777619) >>> 0;
  }
  return h;
};

/** A small xorshift PRNG seeded from hashString's output -- the same
 *  generator TownSquare.vue's stainOrder() has always used, factored out
 *  here so this module's pick and that shuffle share one implementation. */
export const seededRandoms = (seed) => {
  let s = hashString(seed) || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
};

/**
 * Pick this game's splat, deterministically, from a seed string every
 * client in the game computes identically (see TownSquare.vue's
 * faceSplatLive/faceSplatSeed). Returns null only if the pool is somehow
 * empty (never in practice -- 15 of the 16 files are always in POOL).
 */
export function pickFaceSplat(seed) {
  if (!POOL.length) return null;
  const next = seededRandoms(seed);
  const file = POOL[Math.floor(next() * POOL.length) % POOL.length];
  // A little rotation so two different seeds landing on the same image
  // still read as two different marks. Position stays dead centre (the
  // ask was "right in the middle") -- only the spatter's own angle varies.
  const spin = Math.floor(next() * 360);
  return {
    file,
    url: SPLAT_URL[file],
    boxPx: SPLAT_BOX_PX[file] || 150,
    spin,
  };
}
