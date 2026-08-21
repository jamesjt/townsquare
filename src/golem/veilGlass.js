// Golem fork (FT-1004): THE VEIL LAB — TEMPORARY, DELETE ME.
//
// "Give me a lab for the dead veil. Let me choose between the two veil pngs
// in the botc folder, and then give me controls to make them glassy. full
// controls from the glass bench html we looked at before" (user).
//
// The ghost lab's idiom, deliberately (`src/golem/ghostGlass.js`): labels are
// WORDS, values publish as custom properties on <html>, everything persists
// under a `golem.*` key, Reset is a real return, and the lab sits behind
// `devLabs` with the rest of the column. When a look is found by eye it gets
// BAKED into `src/components/Player.vue`, at which point this file,
// `src/components/VeilLab.vue`, their two lines in App.vue and every
// `var(--vl-*)` read in Player.vue all come out together.
//
// ── WHAT THE BENCH PROVED, AND WHAT THIS LAB BORROWS ────────────────────────
// The glass bench (design source: the botc folder's glass-bench.html) put
// three glass techniques over a resolution chart. Its four dials are this
// lab's four: Frost (plain backdrop blur), Refraction (an SVG
// feDisplacementMap bending what shows through), Aberration (the R and B
// channels displaced a little more and a little less than G, then screened
// back together — the prismatic fringe real glass has), and Edge band (how
// wide the displacement map's active rim is; the map's interior is neutral
// gray, which displaces nothing).
//
// Its Sample 02 recipe is the refraction technique used here, verbatim in
// spirit: a displacement map drawn on a 2D canvas (X gradient black→red,
// difference-composited Y gradient black→blue, a blurred neutral interior),
// fed to an inline SVG filter through feImage, applied to the veil via
// `backdrop-filter: url(#vl-glass)`. The map is a CANVAS and not an SVG data
// URI because feImage rasterises SVG URIs as images and silently drops
// blend modes — canvas composite ops are real API calls (the bench's own
// finding, kept).
//
// ── CHROMIUM ONLY, AND HONEST ABOUT IT ──────────────────────────────────────
// `backdrop-filter: url()` paints in Chromium and nowhere else, and
// CSS.supports() lies about it (engines parse what they never paint) — so
// brand detection is the honest test, exactly as the bench does it. Elsewhere
// the refraction dials go inert and the veil keeps its plain Frost blur:
// the same fallback the bench shows, which is the same fallback a real user
// would see.
//
// ── WHAT RIDES THE MASK ─────────────────────────────────────────────────────
// The shipped veil's whole trick (FT-997b) is that the silk PNG is ALSO its
// own mask, confining the backdrop blur to the fabric's silhouette. The
// refraction filter rides that same confinement: the mask declarations never
// change, only the `backdrop-filter` value swaps from `blur()` to
// `url(#vl-glass) blur()` (Player.vue’s `html.veil-glass` rule). And the
// one thing that would kill it all — an ancestor `filter`, which forms a
// backdrop root (measured, FT-997) — this lab never adds.

/** Storage keys. New — no browser holds a value under them yet. */
const VL_STORAGE = {
  silk: "golem.vlSilk",
  frost: "golem.vlFrost",
  refract: "golem.vlRefract",
  aber: "golem.vlAber",
  band: "golem.vlBand",
  shiftX: "golem.vlShiftX",
  shiftY: "golem.vlShiftY",
  size: "golem.vlSize",
  opacity: "golem.vlOpacity",
};

/** The classes that swap the veil art to a NON-DEFAULT silk. Classes and not
 *  properties because what changes is which url() declarations exist — and
 *  the compiled asset URLs live in the stylesheet, where webpack can hash
 *  them. FT-1015 re-derived the map when Silk three became the ship: the
 *  DEFAULT silk carries no class (that is the zero-footprint rule), so one
 *  and two are the classed alternates now and "vl-silk-three" is retired. */
export const SILK_CLASS_ONE = "vl-silk-one";
export const SILK_CLASS = "vl-silk-two";

/** The class that swaps the veil's backdrop-filter from `blur()` to the SVG
 *  refraction filter. SINCE FT-1015 THIS IS THE SHIP'S OWN CLASS, not the
 *  lab's: the shipped Refraction is 33, so `bootVeilGlass` below sets it at
 *  app boot on every Chromium engine, labs or no labs. It is named OUTSIDE
 *  the lab's vl-* namespace for exactly that reason — "no vl-* classes with
 *  the labs off" stays true while the baked look keeps its bend. The lab
 *  still toggles it (Refraction dialled to 0 removes it, restoring the
 *  plain blur); non-Chromium engines never get it, and ship the plain
 *  blur(10.3px) fallback — THE SHIPPED LOOK FORKS BY ENGINE, exactly as the
 *  glass bench itself does. */
export const REFRACT_CLASS = "veil-glass";

/**
 * THE DIALS. Frost and Opacity publish as custom properties (CSS consumes
 * them); Refraction, Aberration and Edge band live in the SVG filter's own
 * attributes and the displacement map, which only JS can write.
 *
 * EVERY DIAL IS AN INTEGER (NumberScrub is an integer control). Frost carries
 * a x10 scale — tenths of a pixel — because the shipped blur is 1.5px and an
 * integer-pixel dial could never rest on the shipped look.
 *
 * SHIP VALUES ARE THE SHIPPED VEIL — since FT-1015 that is the USER'S TUNED
 * LOOK, found in this lab and baked: Silk three, Frost 103 (= 10.3px),
 * Refraction 33, Aberration 40, Edge band 60, Shift down 7, Size 144,
 * Transparency 75. Opening the lab changes NOTHING until a dial moves, and a
 * dial sitting on its ship value publishes NOTHING — after Reset, <html>
 * carries no `--vl-*` property and no vl-* class at all, so "reset" and
 * "this lab was never built" are the same DOM. (The baked look itself lives
 * in Player.vue's stylesheet numbers and the boot-mounted filter below, not
 * in published vars.)
 */
export const VEIL_DIALS = [
  {
    key: "frost",
    label: "Frost",
    ship: 103,
    // TENTHS OF A PIXEL. 103 is the shipped blur(10.3px) — the user's tuned
    // look (FT-1015; the original ship was a tiny 1.5px).
    // UP to 240 (24px) — the bench's own ceiling, well into frost, reachable
    // because a dial that can only make things better cannot show the edge.
    min: 0,
    max: 240,
    hint: "Blur of what shows through, in tenths of a pixel (103 = the shipped 10.3px; 0 = clear silk; 240 = the bench's full frost)",
  },
  {
    key: "refract",
    label: "Refraction",
    ship: 33,
    // The feDisplacementMap scale, in the bench's own units and range. 33 is
    // shipped (FT-1015) — the veil's backdrop bends at the edge band, which
    // is what makes glass read as glass; 0 turns the filter off entirely and
    // leaves the plain blur.
    min: 0,
    max: 140,
    hint: "How far the silk bends what shows through, in the bench's displacement units (33 = shipped; 0 = plain blur; Chromium only — elsewhere the veil always keeps its plain blur)",
  },
  {
    key: "aber",
    label: "Aberration",
    ship: 40,
    // Percent split between the channels: R displaces at Refraction x(1+a),
    // B at x(1-a). Nothing without Refraction — it multiplies the scale.
    // 40 — the ceiling — is shipped (FT-1015).
    min: 0,
    max: 40,
    hint: "Prismatic fringe: the red and blue channels displaced a touch more and less than green, in hundredths of the Refraction (does nothing while Refraction is 0)",
  },
  {
    key: "band",
    label: "Edge band",
    ship: 60,
    // The width of the displacement map's active rim, in map pixels. The
    // map's interior is neutral gray (displaces nothing), so this is "how
    // deep into the silk the bending reaches". 60 — the ceiling — is shipped
    // (FT-1015): at seat scale that swallows the interior, so the whole
    // silk bends.
    min: 10,
    max: 60,
    hint: "Width of the bending rim in the displacement map, in pixels (the interior stays optically flat; does nothing while Refraction is 0)",
  },
  // ── POSITION AND SIZE (FT-1004b, user: "we need a transparency and
  // position options on the dev control for the veil") ──────────────────────
  // The veil's geometry speaks PERCENT OF THE SHROUD BOX (`left: 50%`,
  // `top: -6%`, `height: 106%` in Player.vue), not the face lab's --fpx — so
  // these dials are hundredths of that box: one unit is 1% of the veil box's
  // own dimension, and the veil holds its seat at every window size the same
  // way the shipped numbers do. NEGATIVE RANGES are the disc lab's precedent
  // (faceDisc.js): drag and arrow keys reach them; the type-in strips a
  // minus, a known family limitation.
  {
    key: "shiftX",
    label: "Shift across",
    ship: 0,
    min: -50,
    max: 50,
    hint: "Slide the veil sideways, in hundredths of the veil box (0 = shipped; positive is right)",
  },
  {
    key: "shiftY",
    label: "Shift down",
    ship: 7,
    // Applied to the arrival's start AND its resting -6% together, so the
    // 200ms drop always glides the same distance wherever the veil settles.
    min: -50,
    max: 50,
    hint: "Slide the veil down the coin, in hundredths of the veil box (7 = shipped; positive is down — the arrival still drops the same distance)",
  },
  {
    key: "size",
    label: "Size",
    ship: 144,
    // A transform scale about `top center` (the veil's own transform-origin),
    // so growing seats the silk deeper onto the coin instead of lifting it.
    // It scales art and mask TOGETHER — they are the same image, and the
    // glass stays confined to the silhouette at every size. The two silks
    // need it: they were baked to the same height but not the same width
    // (480 vs 577), so they sit differently at 100.
    min: 50,
    max: 200,
    hint: "Scale of the whole veil about its top centre, in hundredths (144 = shipped; art and mask scale together, so the glass keeps its silhouette)",
  },
  {
    key: "opacity",
    label: "Transparency",
    ship: 75,
    // The whole veil's resting strength, in hundredths, multiplying the
    // states the veil already has — the hover preview stays half of whatever
    // this is (Player.vue's `calc(... * 0.5)`). Labelled "Transparency"
    // because that is the word the user asks for it by (FT-1004b); the key,
    // storage entry and custom property keep their original names so a
    // stored value survives the relabel.
    min: 0,
    max: 100,
    hint: "How strongly the veil shows at rest, in hundredths (75 = as it ships, 0 = gone; the hover preview stays half of whatever this is)",
  },
];

/** The silks — the veil PICK. All baked the same way (trim threshold 8,
 *  height 512, the fork's own sharp) so they compare fairly. */
export const VEIL_SILKS = [
  {
    id: "one",
    label: "Silk one",
    hint: "The first silk (design/viel.png, baked to ui-veil.png) — the loose drape; the original ship before FT-1015",
  },
  {
    id: "two",
    label: "Silk two",
    hint: "The second silk (design/veil2.png, baked to ui-veil2.png) — the twisted ring",
  },
  {
    id: "three",
    label: "Silk three",
    hint: "The shipped veil since FT-1015 (design/veil3.png, baked to ui-veil3.png) — the 2026-08-20 evening drop, tuned and baked",
  },
];

/** The custom property each CSS-read dial publishes. The `-adj` tail is the
 *  lab family's convention. */
const VL_VAR = {
  frost: "--vl-frost-adj",
  shiftX: "--vl-shift-x-adj",
  shiftY: "--vl-shift-y-adj",
  size: "--vl-size-adj",
  opacity: "--vl-opacity-adj",
};

/** Brand detection, the bench's own: `backdrop-filter: url()` is
 *  Chromium-only and CSS.supports() reports true in engines that parse it
 *  but never paint it. */
export const CAN_REFRACT = (function () {
  if (typeof navigator === "undefined") return false;
  const uad = navigator.userAgentData;
  if (uad && Array.isArray(uad.brands))
    return uad.brands.some((b) =>
      /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand),
    );
  const ua = navigator.userAgent || "";
  return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/OPR\//.test(ua);
})();

const clamp = (dial, v) =>
  Math.max(dial.min, Math.min(dial.max, Math.round(Number(v) || 0)));

/** The dial's record, always concrete. */
export function veilDial(key) {
  return VEIL_DIALS.find((d) => d.key === key);
}

/** Every dial at the value it ships at, on the shipped silk. */
export function shippedVeilLab() {
  const dials = {};
  VEIL_DIALS.forEach((d) => (dials[d.key] = d.ship));
  return { silk: "three", dials };
}

/** Read the persisted state. Anything unreadable reads as SHIPPED — a broken
 *  storage entry must never be able to bend the app. */
export function readVeilLab() {
  const state = shippedVeilLab();
  VEIL_DIALS.forEach((d) => {
    let v = d.ship;
    try {
      const raw = localStorage.getItem(VL_STORAGE[d.key]);
      if (raw !== null) v = Number(raw);
    } catch (e) {
      v = d.ship;
    }
    state.dials[d.key] = clamp(d, v);
  });
  try {
    // FT-1014b: list-driven, so a third silk survives a reload too.
    const savedSilk = localStorage.getItem(VL_STORAGE.silk);
    if (VEIL_SILKS.some((s) => s.id === savedSilk)) state.silk = savedSilk;
  } catch (e) {
    state.silk = "three";
  }
  return state;
}

/* ── THE SVG REFRACTION FILTER — the bench's Sample 02, mounted on demand ── */

const FILTER_ID = "vl-glass";
const SVG_NS = "http://www.w3.org/2000/svg";

let filterSvg = null;
let feImage = null;
let feR = null;
let feG = null;
let feB = null;
let mapW = 0;
let mapH = 0;

/**
 * The displacement map, the bench's buildMap: an X gradient black→red and a
 * difference-composited Y gradient black→blue give every pixel its own
 * (R = x, B = y) address; a blurred NEUTRAL GRAY interior (128 displaces
 * nothing) confines the bending to an edge band `band` wide. Drawn at the
 * veil box's own pixel size so the map never stretches.
 */
function buildMap(w, h, band) {
  const m = document.createElement("canvas");
  m.width = w;
  m.height = h;
  const g = m.getContext("2d");

  const gx = g.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, "#000000");
  gx.addColorStop(1, "#FF0000");
  g.fillStyle = gx;
  g.fillRect(0, 0, w, h);

  g.globalCompositeOperation = "difference";
  const gy = g.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, "#000000");
  gy.addColorStop(1, "#0000FF");
  g.fillStyle = gy;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "source-over";

  // The veil's box is small (a seat's top half, ~80px tall at 1280x800), so a
  // wide band can swallow the whole interior — at that point the map is all
  // rim and the interior fill is SKIPPED rather than drawn with a negative
  // size (a degenerate arcTo path draws garbage, not nothing).
  const inset = Math.max(6, band * 0.72);
  const iw = w - inset * 2;
  const ih = h - inset * 2;
  if (iw > 4 && ih > 4) {
    g.filter = "blur(" + Math.max(4, band * 0.44).toFixed(1) + "px)";
    g.fillStyle = "rgb(128,128,128)";
    const r = Math.min(Math.max(6, 30 - inset * 0.6), iw / 2, ih / 2);
    g.beginPath();
    g.moveTo(inset + r, inset);
    g.arcTo(w - inset, inset, w - inset, h - inset, r);
    g.arcTo(w - inset, h - inset, inset, h - inset, r);
    g.arcTo(inset, h - inset, inset, inset, r);
    g.arcTo(inset, inset, w - inset, inset, r);
    g.closePath();
    g.fill();
    g.filter = "none";
  }

  return m.toDataURL();
}

/** The veil pseudo's own pixel box: the shroud's width, 106% of its height
 *  (Player.vue's `:before` geometry). Every seat in the ring is the same
 *  size, so one measurement serves the one shared filter. */
function measureVeilBox() {
  const el = document.querySelector(".circle .player .shroud");
  if (el && el.offsetWidth > 0)
    return {
      w: Math.round(el.offsetWidth),
      h: Math.round(el.offsetHeight * 1.06),
    };
  return { w: 192, h: 92 };
}

/**
 * Mount the filter once. The bench's chain, kept whole: feImage carries the
 * map; three feDisplacementMaps read (R,B) as (x,y) at per-channel scales;
 * three feColorMatrixes isolate one channel each; two screen feBlends knit
 * them back into one image. sRGB interpolation is mandatory — linearRGB
 * re-maps neutral gray and injects a phantom displacement everywhere.
 */
function mountVeilFilter() {
  if (filterSvg) return;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;pointer-events:none";

  const f = document.createElementNS(SVG_NS, "filter");
  f.setAttribute("id", FILTER_ID);
  f.setAttribute("x", "0");
  f.setAttribute("y", "0");
  f.setAttribute("width", "100%");
  f.setAttribute("height", "100%");
  f.setAttribute("color-interpolation-filters", "sRGB");

  feImage = document.createElementNS(SVG_NS, "feImage");
  feImage.setAttribute("x", "0");
  feImage.setAttribute("y", "0");
  feImage.setAttribute("preserveAspectRatio", "none");
  feImage.setAttribute("result", "map");
  f.appendChild(feImage);

  const mk = (ch, res, matrix) => {
    const d = document.createElementNS(SVG_NS, "feDisplacementMap");
    d.setAttribute("in", "SourceGraphic");
    d.setAttribute("in2", "map");
    d.setAttribute("xChannelSelector", "R");
    d.setAttribute("yChannelSelector", "B");
    d.setAttribute("result", ch);
    f.appendChild(d);
    const c = document.createElementNS(SVG_NS, "feColorMatrix");
    c.setAttribute("in", ch);
    c.setAttribute("type", "matrix");
    c.setAttribute("values", matrix);
    c.setAttribute("result", res);
    f.appendChild(c);
    return d;
  };
  feR = mk("dR", "cR", "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0");
  feG = mk("dG", "cG", "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0");
  feB = mk("dB", "cB", "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0");

  const b1 = document.createElementNS(SVG_NS, "feBlend");
  b1.setAttribute("in", "cR");
  b1.setAttribute("in2", "cG");
  b1.setAttribute("mode", "screen");
  b1.setAttribute("result", "rg");
  f.appendChild(b1);
  const b2 = document.createElementNS(SVG_NS, "feBlend");
  b2.setAttribute("in", "rg");
  b2.setAttribute("in2", "cB");
  b2.setAttribute("mode", "screen");
  f.appendChild(b2);

  svg.appendChild(f);
  document.body.appendChild(svg);
  filterSvg = svg;
}

/** Write the current Refraction / Aberration / Edge band into the mounted
 *  filter: rebuild the map at the veil's measured size, split the scales. */
function updateVeilFilter(dials) {
  if (!filterSvg) return;
  lastFilterDials = dials;
  const box = measureVeilBox();
  mapW = box.w;
  mapH = box.h;
  feImage.setAttribute("width", String(mapW));
  feImage.setAttribute("height", String(mapH));
  const href = buildMap(mapW, mapH, dials.band);
  feImage.setAttribute("href", href);
  feImage.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", href);
  const s = dials.refract;
  const a = dials.aber / 100;
  feR.setAttribute("scale", (s * (1 + a)).toFixed(2));
  feG.setAttribute("scale", s.toFixed(2));
  feB.setAttribute("scale", (s * (1 - a)).toFixed(2));
}

/** The dials the filter was last driven with — what a re-measure (window
 *  resize, or the first seat appearing) re-applies. */
let lastFilterDials = null;

/**
 * FT-1015 — THE SHIP BOOTS ITS OWN GLASS. The baked look refracts
 * (Refraction 33), so the displacement filter can no longer be the lab's
 * private rig: it mounts at app boot for EVERYONE on a Chromium engine, and
 * the ship's `veil-glass` class points the veil's backdrop-filter at it.
 * Non-Chromium engines never enter here and keep the stylesheet's plain
 * blur(10.3px) — the shipped look forks by engine, exactly as the glass
 * bench itself does.
 *
 * The map is drawn at the seat's measured pixel size, and at boot no seat
 * exists yet — a MutationObserver waits for the first shroud, re-measures
 * once, and stops looking. After that only a window resize changes a seat
 * (they are vmin-sized), so a debounced resize listener re-measures with
 * whatever dials last drove the filter (the ship's, or the lab's if one is
 * publishing).
 */
export function bootVeilGlass() {
  if (typeof document === "undefined" || !CAN_REFRACT) return;
  mountVeilFilter();
  updateVeilFilter(shippedVeilLab().dials);
  document.documentElement.classList.add(REFRACT_CLASS);
  const seen = () => !!document.querySelector(".circle .player .shroud");
  if (!seen()) {
    const mo = new MutationObserver(() => {
      if (!seen()) return;
      mo.disconnect();
      if (lastFilterDials) updateVeilFilter(lastFilterDials);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  let t = null;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (lastFilterDials) updateVeilFilter(lastFilterDials);
    }, 150);
  });
}

/** Take the filter (and the class that points at it) back out — the veil
 *  must never be left aimed at a url() that no longer resolves. FT-1015:
 *  RETIRED from the lab's teardown path — the filter is the ship's now, so
 *  the lab going away restores the baked look instead (see beforeDestroy).
 *  Kept for completeness; calling it strips the shipped glass. */
export function teardownVeilFilter() {
  document.documentElement.classList.remove(REFRACT_CLASS);
  if (filterSvg && filterSvg.parentNode)
    filterSvg.parentNode.removeChild(filterSvg);
  filterSvg = null;
  feImage = feR = feG = feB = null;
}

/**
 * Publish the whole state onto <html>, where the veil — deep inside
 * #townsquare — inherits it. A DIAL ON ITS SHIP VALUE PUBLISHES NOTHING (the
 * property is REMOVED), and the shipped silk carries no class: after Reset,
 * <html> is exactly the DOM a build without this lab produces.
 */
export function publishVeilLab(state) {
  const root = document.documentElement;
  const style = root.style;
  VEIL_DIALS.forEach((d) => {
    if (!VL_VAR[d.key]) return;
    const v = state.dials[d.key];
    if (v === d.ship) style.removeProperty(VL_VAR[d.key]);
    else style.setProperty(VL_VAR[d.key], String(v));
  });
  root.classList.toggle(SILK_CLASS_ONE, state.silk === "one");
  root.classList.toggle(SILK_CLASS, state.silk === "two");

  const refracting = CAN_REFRACT && state.dials.refract > 0;
  if (refracting) {
    mountVeilFilter();
    updateVeilFilter(state.dials);
  }
  root.classList.toggle(REFRACT_CLASS, refracting);
}

/**
 * The lab as a Vue mixin — the fork's idiom for shared component behaviour.
 * One consumer: VeilLab.vue.
 */
export default {
  data() {
    return {
      vlLabOpen: false,
      vlLab: readVeilLab(),
      vlDials: VEIL_DIALS,
      vlSilks: VEIL_SILKS,
      vlCanRefract: CAN_REFRACT,
    };
  },
  mounted() {
    // a stored value has to reach the ring on load, not on first drag
    publishVeilLab(this.vlLab);
    // the filter's map is drawn at the seat's own pixel size, and the seat
    // resizes with the window — re-measure, debounced
    this.vlResize = () => {
      clearTimeout(this.vlResizeTimer);
      this.vlResizeTimer = setTimeout(() => publishVeilLab(this.vlLab), 150);
    };
    window.addEventListener("resize", this.vlResize);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.vlResize);
    clearTimeout(this.vlResizeTimer);
    // FT-1015: the filter is the SHIP's — the lab going away restores the
    // baked look rather than tearing the glass out from under everyone.
    publishVeilLab(shippedVeilLab());
  },
  methods: {
    /** Clamped against the dial's OWN declared bounds. */
    setVlDial(key, n) {
      const dial = veilDial(key);
      if (!dial) return;
      this.$set(this.vlLab.dials, key, clamp(dial, n));
      publishVeilLab(this.vlLab);
      try {
        localStorage.setItem(VL_STORAGE[key], String(this.vlLab.dials[key]));
      } catch (e) {
        // storage off: the dial still works for this session
      }
    },
    /** The veil PICK — which of the silks the veil is made of. */
    setVlSilk(id) {
      // FT-1014b: validate against the LIST — the hardcoded pair silently
      // coerced Silk three to Silk one (user: "clicking silk 3 just goes
      // to silk 1?").
      this.vlLab.silk = VEIL_SILKS.some((s) => s.id === id) ? id : "three";
      publishVeilLab(this.vlLab);
      try {
        localStorage.setItem(VL_STORAGE.silk, this.vlLab.silk);
      } catch (e) {
        // storage off: the pick still works for this session
      }
    },
    /** Back to the shipped veil — the FT-1015 baked look: Silk three, every
     *  dial on its ship value — which leaves <html> carrying no `--vl-*`
     *  property and no vl-* class (the ship's own veil-glass class stays,
     *  because the baked look refracts). */
    resetVlLab() {
      this.setVlSilk("three");
      VEIL_DIALS.forEach((d) => this.setVlDial(d.key, d.ship));
    },
  },
};
