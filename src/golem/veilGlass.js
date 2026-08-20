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
// `url(#vl-glass) blur()` (Player.vue's `html.vl-refract` rule). And the
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

/** The class that swaps the veil art to the second silk. A CLASS and not a
 *  property because what changes is which url() declarations exist — and the
 *  compiled asset URLs live in the stylesheet, where webpack can hash them. */
export const SILK_CLASS = "vl-silk-two";

/** The class that swaps the veil's backdrop-filter from `blur()` to the SVG
 *  refraction filter. Only ever set on a Chromium engine, and only while
 *  Refraction is above zero — at zero the shipped blur IS the correct look,
 *  not a special case of the filter. */
export const REFRACT_CLASS = "vl-refract";

/**
 * THE DIALS. Frost and Opacity publish as custom properties (CSS consumes
 * them); Refraction, Aberration and Edge band live in the SVG filter's own
 * attributes and the displacement map, which only JS can write.
 *
 * EVERY DIAL IS AN INTEGER (NumberScrub is an integer control). Frost carries
 * a x10 scale — tenths of a pixel — because the shipped blur is 1.5px and an
 * integer-pixel dial could never rest on the shipped look.
 *
 * SHIP VALUES ARE THE SHIPPED VEIL: Silk one, Frost 15 (= 1.5px), Refraction
 * 0, Aberration 0, Opacity 100. Opening the lab changes NOTHING until a dial
 * moves, and a dial sitting on its ship value publishes NOTHING — after
 * Reset, <html> carries no `--vl-*` property and no vl-* class at all, so
 * "reset" and "this lab was never built" are the same DOM.
 */
export const VEIL_DIALS = [
  {
    key: "frost",
    label: "Frost",
    ship: 15,
    // TENTHS OF A PIXEL. 15 is the shipped blur(1.5px) — deliberately tiny,
    // because at seat scale a strong blur smears the role art into mush.
    // UP to 240 (24px) — the bench's own ceiling, well into frost, reachable
    // because a dial that can only make things better cannot show the edge.
    min: 0,
    max: 240,
    hint: "Blur of what shows through, in tenths of a pixel (15 = the shipped 1.5px; 0 = clear silk; 240 = the bench's full frost)",
  },
  {
    key: "refract",
    label: "Refraction",
    ship: 0,
    // The feDisplacementMap scale, in the bench's own units and range. 0 is
    // shipped — no filter at all, plain blur. Above 0 the veil's backdrop
    // bends at the edge band, which is what makes glass read as glass.
    min: 0,
    max: 140,
    hint: "How far the silk bends what shows through, in the bench's displacement units (0 = the shipped plain blur; Chromium only — elsewhere this is inert and the veil keeps its blur)",
  },
  {
    key: "aber",
    label: "Aberration",
    ship: 0,
    // Percent split between the channels: R displaces at Refraction x(1+a),
    // B at x(1-a). Nothing without Refraction — it multiplies the scale.
    min: 0,
    max: 40,
    hint: "Prismatic fringe: the red and blue channels displaced a touch more and less than green, in hundredths of the Refraction (does nothing while Refraction is 0)",
  },
  {
    key: "band",
    label: "Edge band",
    ship: 30,
    // The width of the displacement map's active rim, in map pixels. The
    // map's interior is neutral gray (displaces nothing), so this is "how
    // deep into the silk the bending reaches".
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
    ship: 0,
    // Applied to the arrival's start AND its resting -6% together, so the
    // 200ms drop always glides the same distance wherever the veil settles.
    min: -50,
    max: 50,
    hint: "Slide the veil down the coin, in hundredths of the veil box (0 = shipped; positive is down — the arrival still drops the same distance)",
  },
  {
    key: "size",
    label: "Size",
    ship: 100,
    // A transform scale about `top center` (the veil's own transform-origin),
    // so growing seats the silk deeper onto the coin instead of lifting it.
    // It scales art and mask TOGETHER — they are the same image, and the
    // glass stays confined to the silhouette at every size. The two silks
    // need it: they were baked to the same height but not the same width
    // (480 vs 577), so they sit differently at 100.
    min: 50,
    max: 200,
    hint: "Scale of the whole veil about its top centre, in hundredths (100 = shipped; art and mask scale together, so the glass keeps its silhouette)",
  },
  {
    key: "opacity",
    label: "Transparency",
    ship: 100,
    // The whole veil's resting strength, in hundredths, multiplying the
    // states the veil already has — the hover preview stays half of whatever
    // this is (Player.vue's `calc(... * 0.5)`). Labelled "Transparency"
    // because that is the word the user asks for it by (FT-1004b); the key,
    // storage entry and custom property keep their original names so a
    // stored value survives the relabel.
    min: 0,
    max: 100,
    hint: "How strongly the veil shows at rest, in hundredths (100 = as it ships, 0 = gone; the hover preview stays half of whatever this is)",
  },
];

/** The two silks — the veil PICK. Both baked the same way (trim threshold 8,
 *  height 512, the fork's own sharp) so they compare fairly. */
export const VEIL_SILKS = [
  {
    id: "one",
    label: "Silk one",
    hint: "The shipped veil (design/viel.png, baked to ui-veil.png) — the loose drape",
  },
  {
    id: "two",
    label: "Silk two",
    hint: "The second silk (design/veil2.png, baked to ui-veil2.png) — the twisted ring",
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
  return { silk: "one", dials };
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
    if (localStorage.getItem(VL_STORAGE.silk) === "two") state.silk = "two";
  } catch (e) {
    state.silk = "one";
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

/** Take the filter (and the class that points at it) back out — the veil
 *  must never be left aimed at a url() that no longer resolves. */
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
    teardownVeilFilter();
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
    /** The veil PICK — which of the two silks the veil is made of. */
    setVlSilk(id) {
      this.vlLab.silk = id === "two" ? "two" : "one";
      publishVeilLab(this.vlLab);
      try {
        localStorage.setItem(VL_STORAGE.silk, this.vlLab.silk);
      } catch (e) {
        // storage off: the pick still works for this session
      }
    },
    /** Back to the shipped veil: Silk one, every dial on its ship value —
     *  which leaves <html> carrying no `--vl-*` property and no vl-* class. */
    resetVlLab() {
      this.setVlSilk("one");
      VEIL_DIALS.forEach((d) => this.setVlDial(d.key, d.ship));
    },
  },
};
