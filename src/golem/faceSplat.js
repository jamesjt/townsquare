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
 *
 * WHAT MAKES A BAD FACE SPLAT, generalised from that one call (FT-1145, when
 * packs 2 and 3 tripled the set to 48 and brought shapes pack 1 did not have):
 *
 *   1. THE MARK DEPENDS ON GRAVITY. Long straight drips running parallel out
 *      of a mass only read as blood when "down" is down. This element is
 *      centred on a clock face and SPUN by a random angle (see the spin below),
 *      so a drip-run arrives at 143 degrees as often as upright, where it stops
 *      being a drip and becomes a smear. Every other shape in this art -- a
 *      splat, a starburst, a slash -- is rotation-free and survives the spin.
 *   2. THERE IS NO ONE MARK. A scatter of unconnected droplets has no centre,
 *      and the centre is precisely where this element lives: the town readout
 *      sits on the hub, and a splat with a hollow middle disappears under it.
 *
 * Judged on both, with two measured arms behind the eye (rig:
 * claude_temp_test/2026-08-25-ft1145-core.mjs) -- `coreShare`, the largest
 * connected ink component's share of total ink, and `centreFill`, the share
 * inside the inner third. Pack 1's kept files run coreShare 0.62-0.99.
 *
 * The four excluded, and why:
 *   blood-17 -- a vertical bead-chain drip ending in a pool. Rule 1, and it
 *               fails rule 2 too (coreShare 0.44, the lowest of all 48).
 *   blood-29 -- a scatter of separate droplets, no dominant mark
 *               (coreShare 0.57, under pack 1's floor of 0.62). Rule 2.
 *   blood-33 -- four parallel drips off a bulb row, plus a stray droplet
 *               cluster. Rule 1.
 *   blood-46 -- seven long parallel drips hanging from bulbs: blood-16's twin,
 *               and the clearest case in either new pack. Rule 1. Note its
 *               coreShare is a healthy 0.94 -- the drips connect to the mass,
 *               so no number catches this one. The SHAPE rule has to.
 *
 * Deliberately NOT excluded, though they measure oddly: blood-30 and blood-39
 * (single long clean slashes -- thin, but pack 1 already ships blood-12/13/15
 * on the same read) and blood-45 (a real starburst wearing far-flung
 * satellites, coreShare 0.84 -- pack 1's blood-15 has 161 satellite pieces).
 */
const EXCLUDED = new Set([
  "blood-16.png",
  "blood-17.png",
  "blood-29.png",
  "blood-33.png",
  "blood-46.png",
]);

const POOL = Object.keys(SPLAT_URL)
  .filter((file) => !EXCLUDED.has(file))
  .sort();

/**
 * SIZE, per file -- measured, not eyeballed. The files are not drawn at
 * one scale: some fill their canvas, some are a stray mark in a mostly
 * empty one. Rendered at one common box they read as forty-eight different
 * scales, not one motif.
 *
 * Normalised on INK AREA (alpha > 16/255 pixel count, taken as an
 * equivalent radius via sqrt(area/pi)) -- not the alpha bounding box. Bbox
 * is wrong on its own for this art: blood-12.png (a thin diagonal spatter)
 * has an ABOVE-median box but a BELOW-median ink count, so normalising by
 * bbox SHRINKS it (0.924x) -- exactly backwards, since it is the thin,
 * far-reaching ones that need protecting from shrinking, not the ones
 * getting it. Ink-area correctly GROWS it instead (1.123x). Full table,
 * method and a side-by-side contact sheet at these numbers:
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
 * measurement, on purpose (48 PNGs decoded on every boot is not a cost this
 * decoration is worth).
 *
 * FT-1145 added rows 17-48 (packs 2 and 3) with that same formula, re-run
 * unchanged: claude_temp_test/2026-08-25-ft1145-measure.mjs re-derives rows
 * 1-16 first and diffs them against the numbers already committed here --
 * all sixteen reproduce to the decimal, which is what says the new 32 were
 * measured the same way and not merely near it. The number that matters
 * afterwards is REACH: the furthest ink pixel from centre, carried through
 * the file's own scale. Every file DEALT from POOL reaches 56-144 face-px,
 * against a dead-stain band at 185 and a rim at --face-r = 238 -- so the
 * widest new splat still stops well short of the band, let alone the rim.
 * (Pack 1 alone ran 67-123; the new spread widens the envelope without
 * leaving the face.)
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
  "blood-17.png": 340.6, // excluded from POOL above -- kept for completeness
  "blood-18.png": 162.0,
  "blood-19.png": 130.2,
  "blood-20.png": 213.6,
  "blood-21.png": 226.2,
  "blood-22.png": 210.5,
  "blood-23.png": 173.6,
  "blood-24.png": 115.1,
  "blood-25.png": 122.1,
  "blood-26.png": 133.3,
  "blood-27.png": 106.4,
  "blood-28.png": 117.5,
  "blood-29.png": 193.5, // excluded from POOL above -- kept for completeness
  "blood-30.png": 250.6,
  "blood-31.png": 126.8,
  "blood-32.png": 169.0,
  "blood-33.png": 326.3, // excluded from POOL above -- kept for completeness
  "blood-34.png": 162.7,
  "blood-35.png": 142.4,
  "blood-36.png": 201.3,
  "blood-37.png": 175.4,
  "blood-38.png": 122.8,
  "blood-39.png": 249.6,
  "blood-40.png": 141.8,
  "blood-41.png": 170.2,
  "blood-42.png": 201.5,
  "blood-43.png": 119.8,
  "blood-44.png": 127.6,
  "blood-45.png": 272.4,
  "blood-46.png": 180.1, // excluded from POOL above -- kept for completeness
  "blood-47.png": 173.5,
  "blood-48.png": 140.6,
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
 * empty (never in practice -- 43 of the 48 files are always in POOL).
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
