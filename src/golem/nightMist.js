// Golem fork (FT-1287): THE MIST GROWS WITH THE NIGHT — and the lab that
// tunes the growth.
//
// FT-1277 gave the town mist of our own: three banks of baked fBm inside
// `#app > .backdrop`, panned on transform (see App.vue's THE MIST block for
// the tiles, the tone and why they sit where they sit). It was one look, the
// same on every night of the game.
//
// The user's ask: "how about we add more making it denser and taller each
// night?" So the mist now reads the night counter. Night 1 is EXACTLY the
// FT-1277 mist, untouched; every night after is markedly denser AND stands
// markedly taller, so a town that runs long ends with the fog up the tower
// rather than around its feet.
//
// ── THE COUNTER IS THE ONE THE TOWN ALREADY KEEPS ───────────────────────────
// `night.day` (src/store/modules/night.js) — incremented in exactly one place
// (the root `toggleNight` mutation) so every path into night moves it
// identically, broadcast on its own `nightDay` channel and carried in the
// gamestate payload, so a joiner and a spectator see the same fog the host
// does. There is no second counter here and there must not be one.
//
// ── THE CURVE ───────────────────────────────────────────────────────────────
// SATURATING, not linear. A linear ramp has to choose between being felt
// early and being sane late; a saturating one is both, because it spends most
// of its travel in the nights a game actually reaches.
//
//     g(n) = 1 - f^(n-1),  g(0) = g(1) = 0
//
// `f` is not a dial anyone can reason about, so the lab exposes REACH instead
// — how far along the growth is by NIGHT 3, in percent — and f falls out of
// it (f = sqrt(1 - reach)). At the shipped reach of 52%:
//
//     n1 0%   n2 31%   n3 52%   n4 67%   n5 77%   n6 84%
//     n7 89%  n8 92%   n10 96%  n12 98%  n→∞ 100%
//
// THE FIRST PASS WAS TOO TIMID, AND IT WAS MEASURED RATHER THAN ARGUED. At a
// reach of 45 and ceilings that stopped at the viewport's own height, the
// strip's per-band luminance
// (claude_temp_test/2026-08-27-ft1287-bands.mjs) moved +37 in the one band
// just above the rooftops and by EXACTLY ZERO above 45% of the screen, on
// every night: the mist got thicker where it already was and never climbed.
// The user's verdict on that strip was "needs much greater increase in mist
// per night, both in the amount and height", and both halves of the answer
// are below — reach 45 -> 52, and ceilings that carry the banks well past the
// screen instead of up to it.
//
// ── THE CEILING, AND WHY IT IS WHERE IT IS ──────────────────────────────────
// THREE things hold it, and only the third is a number anyone chose.
//
// 1  THE VEIL'S OWN HALF. `.backdrop` never passes opacity .5 (App.vue's
//    `#app.night > .backdrop`) and every bank is a CHILD of it, so no density
//    at any dial can put more than half a veil over the town. An opaque
//    screen is not reachable from this file — a property of the layer, not a
//    cap someone remembered to write.
//
// 2  THE MIST PAINTS BEHIND THE TOWN, NOT OVER IT. `.backdrop` renders before
//    `#townsquare`, so the seats, their name plates, the clock face, the
//    night sheet and the verdict all sit ON TOP of every bank — measured on
//    the strip, they are unchanged from night 1 to night 12. That is what
//    makes a bold ceiling safe: the fog thickens the PICTURE, and what a
//    player has to read is not in the picture.
//
// 3  READABILITY OF THE ART ITSELF, measured off the tiles rather than
//    picked. Per-row mean alpha, bottom to top
//    (claude_temp_test/2026-08-27-ft1287-tile-alpha.mjs):
//
//      mist-billow  peaks .343 a fifth of the way up, ZERO above 55%
//      mist-veil    peaks .249 halfway up, thin filament to 80%
//
//    A bank's contribution at its own densest row is
//    `.5 (the veil) x bankOpacity x tileAlpha`; the three at their ceilings
//    come to a composite around .33 where they overlap most, so the tower
//    keeps two thirds of its own value under fog that is genuinely thick and
//    still drifting past rather than sitting. The ceiling opacities are high
//    numbers because these tiles are gentle, not because the look is.
//
// WHERE THE CEILING LANDS: the curve is within 8% of it by night 8 and within
// 2% by night 12, so NIGHT 12 IS THE CEILING IN PRACTICE. Nights 13 and up
// are the same sky, deliberately — the alternative is a marathon that ends in
// a white screen.
//
// TALLER IS THE SAME LEVER AS DENSER, FOR FREE — and it is the half the first
// pass got wrong. Each tile is stretched to its bank's full height
// (`background-size: Wpx 100%`, FT-1277's note on why the falloff lives in
// the tile's alpha rather than a CSS mask), so a bank's HEIGHT is what
// decides where its plume structure stops: the billow is dense to about a
// third of its own height and gone by half. The far bank therefore has to
// stand TALLER THAN THE SCREEN for its mist to reach the tower's middle, and
// at 165% it does — the fog's dense edge climbs from 21% of the screen on
// night 1 to 40% on night 3, 52% on night 6 and 57% at the ceiling, hazing
// out around 82%. The part standing above the viewport is the tile's
// transparent top: it costs a larger layer box and not one extra painted
// pixel.
//
// ── COST ────────────────────────────────────────────────────────────────────
// Nothing new animates. The drift is the same transform pan it was, the night
// fade is the same opacity transition, and there is no per-frame JS, no
// backdrop-filter and no blend mode — the growth is a handful of custom
// properties written ONCE per night. `height` is a layout property, and it is
// deliberately NOT transitioned: it changes only on the day→night flip, at
// the instant `.backdrop` is starting from opacity 0, so the resize happens
// while the layer is invisible and costs one paint of a transparent surface.
// Opacity carries a short ease so a change made in the lab reads as a change.
//
// ── THE LAB ─────────────────────────────────────────────────────────────────
// The stats-plate lab's idiom to the letter (`src/golem/statsPlate.js`):
// integer dials, values published as custom properties, `golem.*` persistence,
// a Reset that is a real return, behind `devLabs`. Two differences, both
// forced by this being a SHIPPING curve rather than a look someone is hunting:
//
//   1  THE SHIP PATH PUBLISHES TOO. The night has to reach the CSS, so
//      App.vue calls `publishNightMist(night.day)` on every change of the
//      counter. At night 0 and night 1 that publishes NOTHING (every property
//      removed) — the DOM at night 1 is byte-identical to a build without
//      this file.
//   2  ONE WRITER, NOT TWO. The lab does not publish; it hands this module an
//      override and asks it to publish again. Both callers go through
//      `publishNightMist`, so there is no ordering contest between the lab's
//      values and the night's.
//
// THE NIGHT OVERRIDE is the dial that makes the lab worth building: set it to
// 6 and the sky is night 6's without playing four more nights to see it. 0
// means "whatever the town is actually on".

/** Storage keys. New — no browser holds a value under them yet. */
const NM_STORAGE = {
  nightOverride: "golem.nmNight",
  reach: "golem.nmReach",
  farA: "golem.nmFarA",
  farAMax: "golem.nmFarAMax",
  farH: "golem.nmFarH",
  farHMax: "golem.nmFarHMax",
  farTile: "golem.nmFarTile",
  farDur: "golem.nmFarDur",
  midA: "golem.nmMidA",
  midAMax: "golem.nmMidAMax",
  midH: "golem.nmMidH",
  midHMax: "golem.nmMidHMax",
  midTile: "golem.nmMidTile",
  midDur: "golem.nmMidDur",
  nearA: "golem.nmNearA",
  nearAMax: "golem.nmNearAMax",
  nearH: "golem.nmNearH",
  nearHMax: "golem.nmNearHMax",
  nearTile: "golem.nmNearTile",
  nearDur: "golem.nmNearDur",
};

/**
 * THE DIALS. Every dial is an integer — NumberScrub is an integer control —
 * so opacity is in hundredths and height is in whole percent of the viewport.
 *
 * SHIP VALUES: the `*A`/`*H`/`*Tile`/`*Dur` dials are FT-1277's own numbers
 * verbatim (they are night 1, which must not move), and the `*Max` dials are
 * the ceiling derived in the header block. Opening the lab changes NOTHING
 * until a dial moves.
 */
export const MIST_DIALS = [
  {
    key: "nightOverride",
    group: "Night",
    label: "Night",
    ship: 0,
    min: 0,
    max: 20,
    hint: "Pretend the town is on this night, so night 6 can be looked at without playing to it. It runs past the ceiling night (12) on purpose, so the flat top of the curve can be seen to be flat (0 = whatever night the town is actually on)",
  },
  {
    key: "reach",
    group: "Night",
    label: "Reach",
    ship: 52,
    min: 5,
    max: 95,
    hint: "How far along the growth is by NIGHT 3, in percent of the whole climb. Higher = the mist thickens faster early and flattens sooner (52 = shipped)",
  },

  {
    key: "farA",
    group: "Far bank",
    label: "Opacity",
    ship: 22,
    min: 0,
    max: 100,
    hint: "The far bank's opacity on NIGHT 1, in hundredths (22 = shipped)",
  },
  {
    key: "farAMax",
    group: "Far bank",
    label: "Max opacity",
    ship: 100,
    min: 0,
    max: 100,
    hint: "The far bank's opacity at the ceiling, in hundredths — where the curve is heading. Full, because the veil it lives inside is already only half (100 = shipped)",
  },
  {
    key: "farH",
    group: "Far bank",
    label: "Height",
    ship: 60,
    min: 5,
    max: 240,
    hint: "How tall the far bank stands on NIGHT 1, in percent of the viewport (60 = shipped, the FT-1277 mist). The tile stretches to fill it, so this raises the mist rather than revealing more of it",
  },
  {
    key: "farHMax",
    group: "Far bank",
    label: "Max height",
    ship: 165,
    min: 5,
    max: 240,
    hint: "How tall the far bank stands at the ceiling, in percent of the viewport. OVER 100 on purpose: the tile is dense only to a third of its own height, so the bank has to overshoot the screen for its mist to reach the tower's middle (165 = shipped)",
  },
  {
    key: "farTile",
    group: "Far bank",
    label: "Tile",
    ship: 1400,
    min: 400,
    max: 6000,
    hint: "The far bank's tile width in pixels — the pan travels exactly this far, so it also sets how compressed the billow reads (1400 = shipped)",
  },
  {
    key: "farDur",
    group: "Far bank",
    label: "Drift",
    ship: 460,
    min: 20,
    max: 1200,
    hint: "Seconds for the far bank to pan one whole tile. Bigger = slower (460 = shipped, the slowest of the three)",
  },

  {
    key: "midA",
    group: "Mid bank",
    label: "Opacity",
    ship: 22,
    min: 0,
    max: 100,
    hint: "The mid bank's opacity on NIGHT 1, in hundredths (22 = shipped)",
  },
  {
    key: "midAMax",
    group: "Mid bank",
    label: "Max opacity",
    ship: 96,
    min: 0,
    max: 100,
    hint: "The mid bank's opacity at the ceiling, in hundredths (96 = shipped)",
  },
  {
    key: "midH",
    group: "Mid bank",
    label: "Height",
    ship: 46,
    min: 5,
    max: 240,
    hint: "How tall the mid bank stands on NIGHT 1, in percent of the viewport (46 = shipped)",
  },
  {
    key: "midHMax",
    group: "Mid bank",
    label: "Max height",
    ship: 130,
    min: 5,
    max: 240,
    hint: "How tall the mid bank stands at the ceiling, in percent of the viewport (130 = shipped)",
  },
  {
    key: "midTile",
    group: "Mid bank",
    label: "Tile",
    ship: 2100,
    min: 400,
    max: 6000,
    hint: "The mid bank's tile width in pixels (2100 = shipped)",
  },
  {
    key: "midDur",
    group: "Mid bank",
    label: "Drift",
    ship: 320,
    min: 20,
    max: 1200,
    hint: "Seconds for the mid bank to pan one whole tile. It runs REVERSED, so the banks shear past each other instead of sliding as one sheet (320 = shipped)",
  },

  {
    key: "nearA",
    group: "Near bank",
    label: "Opacity",
    ship: 20,
    min: 0,
    max: 100,
    hint: "The near bank's opacity on NIGHT 1, in hundredths (20 = shipped)",
  },
  {
    key: "nearAMax",
    group: "Near bank",
    label: "Max opacity",
    ship: 88,
    min: 0,
    max: 100,
    hint: "The near bank's opacity at the ceiling, in hundredths — lowest of the three, because its filament reads hardest against the roofs (88 = shipped)",
  },
  {
    key: "nearH",
    group: "Near bank",
    label: "Height",
    ship: 34,
    min: 5,
    max: 240,
    hint: "How tall the near bank stands on NIGHT 1, in percent of the viewport (34 = shipped)",
  },
  {
    key: "nearHMax",
    group: "Near bank",
    label: "Max height",
    ship: 92,
    min: 5,
    max: 240,
    hint: "How tall the near bank stands at the ceiling, in percent of the viewport. Its tile carries filament to 80% of its own height, so this is the bank whose plumes reach highest (92 = shipped)",
  },
  {
    key: "nearTile",
    group: "Near bank",
    label: "Tile",
    ship: 3200,
    min: 400,
    max: 8000,
    hint: "The near bank's tile width in pixels — widest of the three, which is what makes it read as the closest (3200 = shipped)",
  },
  {
    key: "nearDur",
    group: "Near bank",
    label: "Drift",
    ship: 210,
    min: 20,
    max: 1200,
    hint: "Seconds for the near bank to pan one whole tile. Fastest of the three, because it is the closest (210 = shipped)",
  },
];

/** The three banks, and the dial keys each one reads. Paint order, far first. */
export const MIST_BANKS = [
  {
    name: "far",
    a: "farA",
    aMax: "farAMax",
    h: "farH",
    hMax: "farHMax",
    tile: "farTile",
    dur: "farDur",
  },
  {
    name: "mid",
    a: "midA",
    aMax: "midAMax",
    h: "midH",
    hMax: "midHMax",
    tile: "midTile",
    dur: "midDur",
  },
  {
    name: "near",
    a: "nearA",
    aMax: "nearAMax",
    h: "nearH",
    hMax: "nearHMax",
    tile: "nearTile",
    dur: "nearDur",
  },
];

const clamp = (dial, v) =>
  Math.max(dial.min, Math.min(dial.max, Math.round(Number(v) || 0)));

/** The dial's record, always concrete. */
export function mistDial(key) {
  return MIST_DIALS.find((d) => d.key === key);
}

/** Every dial at the value it ships at. */
export function shippedMistLab() {
  const dials = {};
  MIST_DIALS.forEach((d) => (dials[d.key] = d.ship));
  return { dials };
}

/**
 * HOW FAR ALONG THE GROWTH IS ON NIGHT `n`, as a fraction of the whole climb.
 *
 * `g(n) = 1 - f^(n-1)` with `f = sqrt(1 - reach)`, so the REACH dial reads
 * literally: "the fraction of the climb made by night 3". Nights 0 and 1 are
 * flat 0 by construction — night 1 is the FT-1277 mist and nothing may move
 * it — and a counter that has not reached its first night is night 0.
 *
 * @param n      the night number (`night.day`)
 * @param reach  the REACH dial, in percent
 */
export function mistGrowth(n, reach) {
  const night = Math.max(0, Math.floor(Number(n) || 0));
  if (night <= 1) return 0;
  const r = Math.max(0.01, Math.min(0.99, (Number(reach) || 52) / 100));
  const falloff = Math.sqrt(1 - r);
  return 1 - Math.pow(falloff, night - 1);
}

/**
 * The custom properties for a given night, or `null` on a night that has not
 * moved off the shipped mist AND has no dial off its ship value — which is
 * the "publish nothing" case, and the reason a night-1 town's DOM is
 * identical to a build without this file.
 */
export function mistVars(night, state) {
  const d = state.dials;
  const g = mistGrowth(night, d.reach);
  const untouched = MIST_DIALS.every((dial) => d[dial.key] === dial.ship);
  if (g === 0 && untouched) return null;
  const vars = {};
  MIST_BANKS.forEach((b) => {
    const a = d[b.a] + (d[b.aMax] - d[b.a]) * g;
    const h = d[b.h] + (d[b.hMax] - d[b.h]) * g;
    vars["--mist-" + b.name + "-a"] = (a / 100).toFixed(3);
    vars["--mist-" + b.name + "-h"] = h.toFixed(1) + "%";
    vars["--mist-" + b.name + "-tile"] = d[b.tile] + "px";
    vars["--mist-" + b.name + "-dur"] = d[b.dur] + "s";
  });
  return vars;
}

/** Every property this module can write, so clearing is exhaustive. */
const ALL_VARS = MIST_BANKS.reduce(
  (acc, b) =>
    acc.concat(
      ["a", "h", "tile", "dur"].map((s) => "--mist-" + b.name + "-" + s),
    ),
  [],
);

/**
 * THE LAB'S OVERRIDE — module-level, deliberately not reactive state.
 *
 * `null` while no lab is mounted, which is every build the user will ever
 * play. MistLab.vue sets it and asks for a re-publish; nothing else touches
 * it, so there is exactly one writer of the custom properties below.
 */
let override = null;

/** MistLab.vue only. `null` puts the shipped curve back. */
export function setMistOverride(state) {
  override = state;
}

/**
 * Publish the night's mist onto <html>, where `.backdrop`'s children inherit
 * it. Every `var()` read in App.vue carries the FT-1277 ship value as its
 * fallback, so a night that publishes nothing IS the FT-1277 mist.
 *
 * @param liveNight  the town's own `night.day`. The lab's night override, if
 *                   one is set, wins over it — that is the whole point of the
 *                   dial.
 */
export function publishNightMist(liveNight) {
  const state = override || shippedMistLab();
  const night =
    override && override.dials.nightOverride > 0
      ? override.dials.nightOverride
      : liveNight;
  const vars = mistVars(night, state);
  const style = document.documentElement.style;
  if (!vars) {
    ALL_VARS.forEach((name) => style.removeProperty(name));
    return;
  }
  Object.keys(vars).forEach((name) => style.setProperty(name, vars[name]));
}

/** Read the persisted lab state. Anything unreadable reads as SHIPPED — a
 *  broken storage entry must never be able to bend the town's sky. */
export function readMistLab() {
  const state = shippedMistLab();
  MIST_DIALS.forEach((d) => {
    let v = d.ship;
    try {
      const raw = localStorage.getItem(NM_STORAGE[d.key]);
      if (raw !== null) v = Number(raw);
    } catch (e) {
      v = d.ship;
    }
    state.dials[d.key] = clamp(d, v);
  });
  return state;
}

/**
 * The lab as a Vue mixin — the fork's idiom for shared component behaviour.
 * One consumer: MistLab.vue.
 */
export default {
  data() {
    return {
      nmLabOpen: false,
      nmLab: readMistLab(),
      nmDials: MIST_DIALS,
    };
  },
  computed: {
    /** The town's own counter — the same fact App.vue publishes from. */
    nmLiveNight() {
      return this.$store.state.night.day;
    },
    /** What the sky is actually showing: the override, or the town's night. */
    nmShownNight() {
      return this.nmLab.dials.nightOverride > 0
        ? this.nmLab.dials.nightOverride
        : this.nmLiveNight;
    },
    /** How far along the climb that night is, as a percentage — the lab's one
     *  readout, so the curve is legible without doing the arithmetic. */
    nmShownGrowth() {
      return Math.round(
        mistGrowth(this.nmShownNight, this.nmLab.dials.reach) * 100,
      );
    },
  },
  mounted() {
    // a stored value has to reach the sky on load, not on first drag
    setMistOverride(this.nmLab);
    publishNightMist(this.nmLiveNight);
  },
  beforeDestroy() {
    // the lab going away restores the shipped curve (the veil lab's rule)
    setMistOverride(null);
    publishNightMist(this.nmLiveNight);
  },
  methods: {
    /** Clamped against the dial's OWN declared bounds. */
    setNmDial(key, n) {
      const dial = mistDial(key);
      if (!dial) return;
      this.$set(this.nmLab.dials, key, clamp(dial, n));
      setMistOverride(this.nmLab);
      publishNightMist(this.nmLiveNight);
      try {
        localStorage.setItem(NM_STORAGE[key], String(this.nmLab.dials[key]));
      } catch (e) {
        // storage off: the dial still works for this session
      }
    },
    /** Back to the shipped curve — FT-1277's night 1 and this lane's ceiling —
     *  which leaves the document carrying no `--mist-*` property at all on a
     *  night-1 town. */
    resetNmLab() {
      MIST_DIALS.forEach((d) => this.setNmDial(d.key, d.ship));
    },
  },
};
