// Golem fork (FT-991): THE GHOST-GLASS LAB — TEMPORARY, DELETE ME.
//
// Six scrubs and a four-way material switch for the mark that says a seat is
// DEAD. A value can be found by EYE on a real ring and then baked into
// `src/components/Player.vue`, at which point this file,
// `src/components/GhostLab.vue`, its one line in App.vue and every `var(--gg-*)`
// read in Player.vue all come out together.
//
// It is the disc lab's idiom, deliberately (`src/golem/faceDisc.js`,
// `src/golem/faceHands.js`): labels are WORDS not initials, values publish as
// custom properties on <html>, everything persists under a `golem.*` key,
// Reset is a real return, and it sits behind `devLabs` with the rest of the
// column.
//
// ── WHY THIS IS NOT A TINT DIAL ─────────────────────────────────────────────
// "Give me a lab to make the ghost cowl glass, like we did with the centre
// circle" (user). The centre circle is glass because of `backdrop-filter` —
// blur, saturation, brightness and a veil applied to whatever is BEHIND the
// plate. `ui-ghost-cowl.png` is a PAINTING: an opaque silhouette with the
// cowl's translucency baked into its own alpha. Tinting a painting cannot make
// it glass, because glass is not a colour — it is a treatment of the backdrop,
// and a painting has no backdrop to treat.
//
// So the PNG changes JOBS. In glass mode it is not drawn at all; its ALPHA
// becomes a MASK over a layer that carries the backdrop-filter, which is what
// confines the glass to the ghost's silhouette. The cowl's alpha is already a
// density field — dense at the hood, thinning to the torn hem, a void where a
// face would be — so masking with it gives the glass the same drapery the
// painting had, for free, as varying glass strength rather than varying ink.
//
// Both halves of that already exist in this fork and are composed rather than
// reinvented: `TownInfo.vue`'s alive heart is the mask-an-alpha-from-a-PNG
// idiom (`.count-icon-masked`), and `src/faceDisc.scss` is the glass
// vocabulary. This is the two of them stacked.
//
// ── THE ONE THING GLASS COSTS THAT IS NOT A DIAL ────────────────────────────
// `.shroud` carries `filter: drop-shadow(0 0 5px rgba(0,0,0,0.8))`, and an
// ancestor with a `filter` forms a BACKDROP ROOT: a `backdrop-filter` beneath
// one samples an empty group and paints NOTHING. Measured, not assumed
// (claude_temp_test/2026-08-20-ft991b-backdrop-probe.mjs — drop-shadow 0 delta,
// `filter: none` 96, and both a 2D and a perspective transform 96, so the
// ring's own rotations are harmless). Glass mode therefore switches the shroud's
// filter off, which means the ghost LOSES the dark separation the drop-shadow
// gave it. The Rim dial is what replaces it, and that is the whole reason a
// glass ghost needs an edge back.
//
// ── AND THE THING THAT MUST NOT BE LOST ─────────────────────────────────────
// This mark exists to make DEAD unmistakable across a whole ring at a glance,
// and it won its place on that measurement: 24.07 separation at 1280x800
// against the sheet ghost's 22.61, covering 22.2% of the coin (FT-990).
// GLASS IS BY NATURE LOW CONTRAST — it shows you what is already there, gently
// rearranged — so every material below is scored on the same metric and the
// numbers are in each preset's hint. A dial that cannot show you what it costs
// is a dial that will be used to make the ring worse.

/** Storage keys. New — no browser anywhere holds a value under them, so there
 *  is nothing for a first bake to apply twice. The disc lab's bump rule governs
 *  them from that first bake onward: bump whenever a NON-ZERO stored value would
 *  survive into a changed base. */
const GG_STORAGE = {
  blur: "golem.ggBlur",
  sat: "golem.ggSat",
  bright: "golem.ggBright",
  tint: "golem.ggTint",
  opacity: "golem.ggOpacity",
  rim: "golem.ggRim",
};

const MODE_STORAGE = "golem.ggMode";
const PRESET_STORAGE = "golem.ggPreset";

/** The class on <html> that turns the mark from a painting into a pane. It is a
 *  CLASS and not a custom property because what changes between the two is not
 *  a value — it is which declarations exist at all (a mask, a backdrop-filter,
 *  a flat fill instead of an image, and the shroud's own filter switched off).
 *  A class also makes "is the lab doing anything?" answerable from outside. */
export const GLASS_CLASS = "gg-glass";

/**
 * THE SIX SCRUBS. Four are the glass ones `faceDisc.js` already speaks, so the
 * two labs use one vocabulary; two are this mark's own.
 *
 * EVERY DIAL IS AN INTEGER, because NumberScrub is an integer control (it
 * rounds, and its type-in strips non-digits). Each carries its own SCALE and
 * Player.vue divides by it — thousandths for the blur, hundredths for the rest.
 * Every bound is also the CLAMP: the SCSS leans on these rather than clamping
 * again, and an illegal value does not dim the glass, it invalidates the whole
 * `backdrop-filter` and deletes it.
 *
 * ZERO IS NOT THE SHIPPED VALUE HERE, and that is the one place this lab breaks
 * the disc lab's convention. These are ABSOLUTE values, not offsets against a
 * baked material, because in the shipped state there IS no material — the mark
 * is a painting and the four glass dials describe something that does not
 * exist. So each dial names its own `ship` value instead, Reset returns to
 * those, and a dial sitting on its ship value publishes NOTHING (see
 * publishGhostGlass). That makes "reset" and "the lab was never here" the same
 * state by construction rather than by two numbers agreeing.
 */
export const GHOST_DIALS = [
  {
    key: "blur",
    label: "Blur",
    unit: "",
    ship: 0,
    // THOUSANDTHS OF THE SEAT, and it stays a fraction of the seat for the same
    // reason the disc's blur stays a fraction of the radius: the seat is sized
    // in vmin (`--seat-sz`, falling back to the 15vmin the ring's own geometry
    // uses), so a fixed pixel count would be a DIFFERENT MATERIAL at every
    // window size. At 1280x800 a seat is ~120px, so 28 is ~3.4px; at 1920x1080
    // the same 28 is ~4.5px and the ghost looks the same.
    //
    // DOWN to 0 — perfectly clear, no scatter at all. Not an absurd bound: it
    // is the far end of the whole argument, where the ghost becomes a pane of
    // window glass and you can read the role art straight through it.
    // UP to 120 — 0.120 of the seat, ~14px, which is frost. The disc lab has
    // already had "frost" rejected three times by this user; the dial reaches
    // it anyway, because a dial that can only make things better cannot show
    // you the edge.
    min: 0,
    max: 120,
    hint: "Blur of what shows through, in thousandths of the seat (0 = perfectly clear glass; 28 = about 3.4px at 1280x800)",
  },
  {
    key: "sat",
    label: "Saturate",
    unit: "",
    ship: 100,
    // HUNDREDTHS. 100 is untouched. Below 100 DRAINS the colour out of what
    // shows through, which is the cue that reads as cold glass over a warm
    // coin; above 100 lifts it, which is what the disc's material wanted over a
    // bronze dial and what this one almost certainly does not want over gold.
    // 0 is greyscale — a real target, since a colourless patch on a coloured
    // coin is one of the few things glass can do that a painting cannot.
    min: 0,
    max: 300,
    hint: "Saturation of what shows through, in hundredths (100 = untouched; 0 = drained to grey)",
  },
  {
    key: "bright",
    label: "Brightness",
    unit: "",
    ship: 100,
    // HUNDREDTHS, and THIS is the dial that decides whether a glass ghost is
    // legible at all. The coin under a dead seat is already dimmed
    // (`brightness(0.72)`, FT-974) precisely so a PALE mark can glow against
    // it; a glass ghost that merely blurs that dark coin produces a dark patch
    // on a dark coin, which is the failure FT-974 measured and fixed. Lifting
    // above 100 puts the value contrast back the way the painting had it.
    // DOWN to 20 — near-black, the far end of "calm it down".
    // UP to 250 — well past useful, so the blow-out is reachable and visible.
    min: 20,
    max: 250,
    hint: "Brightness of what shows through, in hundredths (100 = untouched; above 100 lifts the mark off the dimmed coin — the legibility dial)",
  },
  {
    key: "tint",
    label: "Tint",
    unit: "",
    ship: 0,
    // THE VEIL, in hundredths, laid inside the mask and over the filtered
    // backdrop. Its COLOUR is the preset's, not a scrub's (see GHOST_PRESETS),
    // and it defaults to the cowl's own cold (198,214,228) so that a tint is a
    // stronger dose of the tone this mark already wears rather than a new
    // colour arriving.
    // 0 is no veil at all — pure refraction, which is the honest floor.
    // 100 is fully opaque, at which point the glass has become a flat silhouette
    // in the ghost's tone and there is no backdrop left to see. Both ends are
    // reachable because the interesting settings are near neither.
    min: 0,
    max: 100,
    hint: "The veil over what shows through, in hundredths of the mark's own cold tone (0 = pure refraction; 100 = a flat silhouette)",
  },
  {
    key: "opacity",
    label: "Opacity",
    unit: "",
    ship: 100,
    // THE WHOLE MARK'S OWN OPACITY — glass, veil and rim together — in
    // hundredths. It multiplies the states the mark already has rather than
    // replacing them, so the hover PREVIEW stays half of whatever the resting
    // ghost is (`calc(... * 0.5)` in Player.vue) and the arrival still animates
    // from nothing. 100 is what ships.
    min: 0,
    max: 100,
    hint: "The whole mark's opacity, in hundredths (100 = as it ships; the hover preview stays half of whatever this is)",
  },
  {
    key: "rim",
    label: "Rim",
    unit: "",
    ship: 0,
    // THE EDGE, in hundredths, and it is not decoration — it is the replacement
    // for something glass takes away. Glass mode has to switch the shroud's
    // `drop-shadow` off (an ancestor filter forms a backdrop root and would
    // delete the glass outright — measured), and that shadow is what held the
    // opaque cowl off a pale coin rim. So a glass ghost with Rim at 0 has no
    // separation from its ground at all except whatever the tint provides.
    //
    // It paints `ui-ghost-cowl-rim.png` — the cowl's OWN outline, derived from
    // the same alpha by dilate-minus-erode, so the two can never drift — in the
    // preset's tone. It works in both materials: a rim on the opaque cowl is a
    // legitimate thing to want and costs nothing to allow.
    // 0 is what ships (the layer is there, painting nothing).
    min: 0,
    max: 100,
    hint: "Strength of the mark's own outline, in hundredths (0 = none, which is what ships; glass has no drop-shadow, so this is its only edge)",
  },
];

/**
 * THE FOUR MATERIALS — a starting point, not a mode, exactly as the disc lab's
 * four glasses are. Picking one seeds all six scrubs AND sets whether the mark
 * is a painting or a pane; every scrub stays live afterwards, and the panel
 * marks the pick "edited" the moment one leaves it.
 *
 * `mode` is the half that is not a scrub. "opaque" draws the PNG; "glass" masks
 * with it. There is no dial between those two because there is no continuum:
 * one is an image, the other is a treatment of the backdrop.
 *
 * `rgb` is the tint AND rim colour, and it is a preset's for the same reason
 * the disc's is: a material that could only move the alpha could not reproduce
 * a family that tints a different colour. It publishes as `--gg-tint-rgb`,
 * which Player.vue reads with the cowl's own cold as its fallback — so
 * "shipped" and "lab absent" are the same three numbers.
 *
 * ── EVERY MATERIAL CARRIES ITS MEASURED SCORE, AND THE PANEL SHOWS IT ────────
 * `sep` is this material's separation on the FT-990 glance metric at 1280x800,
 * on the same 12-seat ring with four dead, every case in one run
 * (claude_temp_test/2026-08-20-ft991b-glass-judge.mjs, which drives THIS lab
 * rather than a hand-written stylesheet, so the numbers describe the buttons
 * below and not an approximation of them).
 *
 * IT IS ON THE BUTTON, not only in the tooltip. A tuning instrument's job is to
 * make the cost visible WHILE the choice is being made — the difference between
 * "this looks nice" and "this looks nice and costs ten points" is the whole
 * decision, and a number nobody hovers to find is a number nobody reads.
 *
 * THE TWO REFERENCE NUMBERS BELOW ARE THE POINT OF THE WHOLE PANEL.
 * Glass is a low-contrast material by construction, and this mark's entire job
 * is to be unmistakable across a ring at a glance, so those two things are in
 * direct opposition and the panel should say so in numbers rather than in prose.
 */

/** The painted cowl — what ships, and what won the FT-990 bake-off. */
export const GHOST_BAR = 24.07;

/**
 * NO MARK AT ALL — the dimmed coin on its own, measured by running the ring with
 * the mark's Opacity at 0.
 *
 * THIS IS THE NUMBER THAT CHANGES THE ARGUMENT, and it is why it is in the panel
 * beside the bar. A dead seat already reads as dead without any ghost, because
 * FT-974 dims the whole coin (`brightness(0.72)`); the painted cowl is worth
 * +7.73 ON TOP of that. Every glass material measures BELOW this line — Glass
 * 13.97, Clear glass 14.05, Frost 14.23 — which means a glass ghost is not
 * merely a weaker mark than the cowl, it is worse than having no mark at all.
 *
 * The mechanism is exact rather than mysterious, and it is worth knowing while
 * dialling: the glass lifts what shows through (`brightness` above 100) and that
 * lift lands on the very coin the dim had darkened, so the material spends its
 * effort undoing the thing that was carrying the read. Turning the lift DOWN
 * instead of up is the counter-intuitive move this panel exists to let someone
 * discover.
 */
export const GHOST_FLOOR = 16.34;

export const GHOST_PRESETS = [
  {
    id: "opaque",
    label: "Opaque cowl",
    mode: "opaque",
    rgb: "198, 214, 228",
    sep: 24.07,
    hint: "What ships: the painted cowl, its translucency baked into the art's own alpha, held off the coin by a drop-shadow. Separation 24.07, covering 22.2% of the coin — the bar every material below is measured against",
    dials: { blur: 0, sat: 100, bright: 100, tint: 0, opacity: 100, rim: 0 },
  },
  {
    id: "glass",
    label: "Glass",
    mode: "glass",
    rgb: "198, 214, 228",
    sep: 13.97,
    hint: "The ghost as a pane: a light blur, the colour drained out of what shows through, the backdrop LIFTED off the dimmed coin, a thin cold veil and its outline back. Separation 13.97 — ten points under the cowl, and below the 16.34 a seat scores with NO mark at all",
    dials: { blur: 28, sat: 60, bright: 135, tint: 26, opacity: 100, rim: 55 },
  },
  {
    id: "clear",
    label: "Clear glass",
    mode: "glass",
    rgb: "198, 214, 228",
    sep: 14.05,
    hint: "The far end of the argument: no blur, no drain, no lift, no veil — only the outline. Separation 14.05 while covering 6.3% of the coin, which is the finding in one line: almost nothing is on screen and the score barely moves, because the dimmed coin was doing the work",
    dials: { blur: 0, sat: 100, bright: 100, tint: 0, opacity: 100, rim: 100 },
  },
  {
    id: "frost",
    label: "Frost",
    mode: "glass",
    rgb: "198, 214, 228",
    sep: 14.23,
    hint: "Heavy scatter and a strong veil, no brightness lift — the frosted-pane family the disc lab has had rejected three times. Separation 14.23. Here for the same reason it is there: a preset must be allowed to be the material it names",
    dials: { blur: 90, sat: 30, bright: 90, tint: 45, opacity: 100, rim: 30 },
  },
];

/** The custom property each dial publishes. The `-adj` tail is the disc lab's,
 *  kept so a reader moving between the two files is reading one convention —
 *  even though these carry absolute values rather than offsets. */
const GG_VAR = {
  blur: "--gg-blur-adj",
  sat: "--gg-sat-adj",
  bright: "--gg-bright-adj",
  tint: "--gg-tint-adj",
  opacity: "--gg-opacity-adj",
  rim: "--gg-rim-adj",
};

/** The colour the tint and the rim are made of — a preset's, not a scrub's. */
const RGB_VAR = "--gg-tint-rgb";

/** Player.vue's own fallback, and therefore what "the lab is absent" means. */
const SHIP_RGB = "198, 214, 228";

const clamp = (dial, v) =>
  Math.max(dial.min, Math.min(dial.max, Math.round(Number(v) || 0)));

/** The dial's record, always concrete. */
export function ghostDial(key) {
  return GHOST_DIALS.find((d) => d.key === key);
}

/** The preset's record, always concrete. */
export function ghostPreset(id) {
  return GHOST_PRESETS.find((p) => p.id === id) || GHOST_PRESETS[0];
}

/** Every dial at the value it ships at — what Reset returns to. */
export function shippedGhostGlass() {
  const dials = {};
  GHOST_DIALS.forEach((d) => (dials[d.key] = d.ship));
  return { mode: "opaque", dials, rgb: SHIP_RGB };
}

/**
 * Read the persisted state. Anything unreadable reads as SHIPPED, which is the
 * rule every lab in this fork follows: a broken storage entry must never be
 * able to bend the app.
 */
export function readGhostGlass() {
  const state = shippedGhostGlass();
  GHOST_DIALS.forEach((d) => {
    let v = d.ship;
    try {
      const raw = localStorage.getItem(GG_STORAGE[d.key]);
      if (raw !== null) v = Number(raw);
    } catch (e) {
      v = d.ship;
    }
    state.dials[d.key] = clamp(d, v);
  });
  try {
    if (localStorage.getItem(MODE_STORAGE) === "glass") state.mode = "glass";
  } catch (e) {
    state.mode = "opaque";
  }
  state.rgb = ghostPreset(readGhostPreset()).rgb;
  return state;
}

/** The persisted preset id, "opaque" for anything unrecognised. */
export function readGhostPreset() {
  let id = "";
  try {
    id = localStorage.getItem(PRESET_STORAGE) || "";
  } catch (e) {
    id = "";
  }
  return GHOST_PRESETS.some((p) => p.id === id) ? id : "opaque";
}

/**
 * Publish the whole state onto <html>, where `.shroud` — five levels down
 * inside #townsquare — inherits it.
 *
 * ON <html> AND NOWHERE ELSE, for the disc lab's stated reason: custom
 * properties inherit DOWNWARD only, and publishing on a component's own root
 * means anything outside it never sees the value. It is also what lets one
 * panel drive every dead seat in the ring at once.
 *
 * A DIAL SITTING ON ITS SHIP VALUE PUBLISHES NOTHING — the property is REMOVED,
 * not set to the shipped number. That is deliberate and it is the strongest
 * form of this lab's own invariant: after Reset, <html> carries no `--gg-*` at
 * all and no glass class, so "reset" and "this lab was never built" are the
 * same DOM rather than two states that happen to compute alike. An acceptance
 * rig can assert it by counting properties instead of comparing pixels.
 */
export function publishGhostGlass(state) {
  const root = document.documentElement;
  const style = root.style;
  GHOST_DIALS.forEach((d) => {
    const v = state.dials[d.key];
    if (v === d.ship) style.removeProperty(GG_VAR[d.key]);
    else style.setProperty(GG_VAR[d.key], String(v));
  });
  const rgb = state.rgb || SHIP_RGB;
  if (rgb === SHIP_RGB) style.removeProperty(RGB_VAR);
  else style.setProperty(RGB_VAR, rgb);
  root.classList.toggle(GLASS_CLASS, state.mode === "glass");
}

/**
 * The lab as a Vue mixin — the fork's own idiom for shared component behaviour
 * (`rightDrawer.js`, `faceDisc.js`, `faceHands.js`). One consumer today:
 * GhostLab.vue.
 */
export default {
  data() {
    return {
      ggLabOpen: false,
      // persisted, because a dialled value has to survive the reload it takes
      // to go and look at it again — the face lab's own lesson
      ggLab: readGhostGlass(),
      ggPreset: readGhostPreset(),
      ggDials: GHOST_DIALS,
      ggPresets: GHOST_PRESETS,
    };
  },
  computed: {
    /** Is the mark a pane right now, or the painting? The panel says so above
     *  the four dials that only mean something in one of those two. */
    ggIsGlass() {
      return this.ggLab.mode === "glass";
    },
    /**
     * HAS THE PICK BEEN DIALLED AWAY FROM? A material is a starting point, so
     * the six scrubs stay live after one is chosen — which means the button
     * that looks selected can stop describing what is on screen. This is the
     * panel's way of saying so without un-selecting anything.
     */
    ggPresetEdited() {
      const p = ghostPreset(this.ggPreset);
      return (
        p.mode !== this.ggLab.mode ||
        GHOST_DIALS.some((d) => this.ggLab.dials[d.key] !== p.dials[d.key])
      );
    },
  },
  mounted() {
    // A stored value has to reach the ring on load, not on first drag.
    publishGhostGlass(this.ggLab);
  },
  methods: {
    /** Clamped against the dial's OWN declared bounds rather than a second copy
     *  of the numbers, so the range documented beside a scrub is the range
     *  actually enforced. */
    setGgLab(key, n) {
      const dial = ghostDial(key);
      if (!dial) return;
      this.$set(this.ggLab.dials, key, clamp(dial, n));
      publishGhostGlass(this.ggLab);
      try {
        localStorage.setItem(GG_STORAGE[key], String(this.ggLab.dials[key]));
      } catch (e) {
        // storage off: the dial still works for this session
      }
    },
    /** Painting or pane. Persisted separately from the preset because a scrub
     *  can be dragged after a pick and the material must not silently revert. */
    setGgMode(mode) {
      this.ggLab.mode = mode === "glass" ? "glass" : "opaque";
      publishGhostGlass(this.ggLab);
      try {
        localStorage.setItem(MODE_STORAGE, this.ggLab.mode);
      } catch (e) {
        // storage off: the mode still works for this session
      }
    },
    /**
     * SEED THE SIX SCRUBS FROM A MATERIAL, set its mode, and publish its tint
     * colour. It goes through setGgLab and setGgMode like a drag would, so every
     * value takes the same clamp and the same persistence path, and nothing here
     * can produce a value a hand could not.
     */
    applyGgPreset(id) {
      const p = ghostPreset(id);
      this.ggPreset = p.id;
      this.ggLab.rgb = p.rgb;
      try {
        localStorage.setItem(PRESET_STORAGE, p.id);
      } catch (e) {
        // storage off: the pick still works for this session
      }
      this.setGgMode(p.mode);
      GHOST_DIALS.forEach((d) => this.setGgLab(d.key, p.dials[d.key]));
    },
    /** Back to the painting, every scrub on its ship value — which leaves <html>
     *  carrying no `--gg-*` property and no glass class at all. */
    resetGgLab() {
      this.applyGgPreset("opaque");
    },
  },
};
