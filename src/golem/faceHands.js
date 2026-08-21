// Golem fork (FT-973): THE CLOCK HANDS, and their lab.
//
// The town square is played on a blank dial — `#app.in-game` paints
// `background-clocktower-blank-centered.png`, the plate with no hands on it,
// while the entry screen keeps the art's own PAINTED hands. This module is what
// puts moving hands back on the town's plate: the sprite table, the tuning
// dials, and the arithmetic that turns elapsed time into three angles.
//
// ── WHAT DRIVES THE HANDS TODAY, AND WHERE THAT INPUT LIVES ──────────────────
// ONE FUNCTION: `handAngles(elapsedMs)`, below. It is the only place that turns
// time into rotation, and it takes a single number — how long the current phase
// has been running.
//
// THE APP RECORDS NO PHASE-START TIMESTAMP. Checked rather than assumed:
// `toggleNight` (src/store/index.js) flips `grimoire.isNight` and increments
// `night.day`, and stores no time; the chronicle's entries carry `day` and
// `phase` but no wall clock. So FaceHands.vue OBSERVES the flip instead — it
// stamps an epoch at mount and re-stamps it whenever the phase or the day
// number changes. That is the brief's page-load fallback, improved by the one
// thing the client genuinely knows.
//
// WHEN THE REAL PHASE LOG LANDS, ONE ASSIGNMENT CHANGES — the epoch in
// FaceHands.vue — and nothing here moves at all. The hands change their SOURCE,
// not their behaviour.
//
// ── THE DIAL HAS EIGHT SPOKES, NOT TWELVE ────────────────────────────────────
// Carried from the FT-968 art lane and load-bearing for anyone tuning this: the
// painted face cannot ever be a literal readable clock. Hand position here is
// CONTINUOUS and atmospheric — nothing snaps to a spoke, nothing claims to
// point at an hour. `handAngles` is deliberately free of any rounding for that
// reason: a snapped minute hand would be asserting a precision the art cannot
// carry.
//
// ── THE STYLE THAT SHIPS ─────────────────────────────────────────────────────
// Heavy cathedral-clock, DARK — broad tapered blade, bulbous counterweight
// tail, near-black. The FT-968 lane baked four styles against the real face and
// found it the only one that survives a hand lying along a painted spoke
// unaided; the thin ones nearly vanish there. It also matches the near-black
// ironwork painted into the entry screen's own background.
//
// The GILT colourway fixes that on-spoke problem for every style but weakens
// the read everywhere else — gold on gold. It is an option in the lab, never
// the default.
//
// All four styles ship as sprites so the lab's style switch can reach them. A
// switch that could only reach the pick we already made cannot show you what
// the others are — the same argument faceDisc.js makes for its glass presets.
//
// THE SPRITES ARE BAKED, NOT DRAWN HERE:
//   claude_temp_test/2026-08-20-ft973-bake-hands.mjs
// which is their reproducible origin. Re-run it to regenerate; do not hand-edit
// the PNGs. Each is 960px spanning 480 face-pixels (2x, for hi-DPI), with the
// pivot at its exact centre — (0.5, 0.5), which FT-968 verified against the
// bronze rim as the face's true rotation centre. That is what lets the CSS
// rotate with a plain `transform: rotate()` and a default transform-origin.

/** The face-pixel span of one sprite. The PNG is 2x this; see the bake script. */
export const HAND_SPRITE_FACE = 480;

/**
 * THE BAKED BLADE LENGTHS, in face-pixels, exactly as the bake script drew
 * them. The length dials below are OFFSETS against these, and the component
 * turns (baked + offset) / baked into a scale — so a dial reading zero is
 * literally the sprite as baked.
 *
 * For scale: `--face-r` is 238, so the second hand at 226 very nearly reaches
 * the painted rim and the hour hand at 120 sits just past halfway.
 */
export const HAND_BAKED_LEN = { hour: 120, minute: 202, second: 226 };

/** The four styles, in the order the FT-968 lane ranked them. */
export const FACE_HANDS_STYLES = [
  {
    id: "cathedral",
    label: "Cathedral",
    hint: "Heavy cathedral-clock — broad tapered blade, bulbous counterweight tail. THE SHIPPED PICK: the only one of the four that survives a hand lying along a painted spoke",
  },
  {
    id: "gothic",
    label: "Gothic",
    hint: "Wrought-iron gothic — spade tip, pierced shaft. Reads well in a gap, thins out badly on a spoke",
  },
  {
    id: "breguet",
    label: "Breguet",
    hint: "Fine Breguet — a pierced moon near the tip. The most delicate of the four, and the first to vanish against the painted dial",
  },
  {
    id: "skeletal",
    label: "Skeletal",
    hint: "Bone-thin, pierced twice. Nearly invisible on a spoke at any viewport — kept so the lab can show you why the heavy blade won",
  },
];

/** Two colourways. Dark ships; see the header for why gilt does not. */
export const FACE_HANDS_COLORWAYS = [
  {
    id: "dark",
    label: "Dark",
    hint: "Near-black iron — matches the ironwork painted into the entry screen's background. THE SHIPPED PICK",
  },
  {
    id: "gilt",
    label: "Gilt",
    hint: "Old gold. Solves the on-spoke read for every style and weakens it everywhere else — gold on a gold dial",
  },
];

/**
 * THE NINE SCRUBS. Every one is an OFFSET against what the sprite was baked
 * with, so ZERO IS EXACTLY WHAT SHIPS in all nine and Reset is a real return —
 * the invariant faceDisc.js runs on, and it matters here for the same reason:
 * this lab sits in the shipped bundle, so if a zero-scrub were even slightly
 * not the baked art, the lab's mere PRESENCE would have re-tuned the hands for
 * everyone.
 *
 * LENGTHS ARE IN FACE-PIXELS and widths in PERCENTAGE POINTS, and that split is
 * forced rather than chosen. NumberScrub is an INTEGER control (it rounds, and
 * its type-in strips non-digits). A blade is 120–226 face-px long, so integer
 * face-pixels are a fine gradation; a blade is 1.3–14 face-px WIDE, where an
 * integer px dial would jump the second hand from 3 to 4 — a 30% step, with no
 * value reachable between. Percent gives that dial somewhere to stand.
 *
 * THE LABELS ARE WORDS, not initials — "we don't need to abbreviate things,
 * just tell me what they are" (user, 2026-08-19), the same standing call the
 * disc lab's label column was widened for.
 */
export const FACE_HANDS_DIALS = [
  {
    key: "centreX",
    label: "Centre across",
    unit: "",
    // ── THE PIVOT, NUDGEABLE ─────────────────────────────────────────────────
    // An OFFSET on top of the measured art constant (FACE_HANDS_ART_DX/DY, in
    // FaceHands.vue's stylesheet), in face-pixels, so zero is the measurement.
    // It exists for the same reason the face lab does: a centre is ultimately
    // judged by eye against paint, and the measurement should be checkable
    // rather than merely trusted.
    // +-40 face-px is twice the error that was actually found, which is enough
    // to reach plainly-wrong in both directions and see it.
    min: -40,
    max: 40,
    hint: "Pivot right (positive) or left, in face-pixels off the MEASURED dial centre (0 = the measurement)",
  },
  {
    key: "centreY",
    label: "Centre down",
    unit: "",
    min: -40,
    max: 40,
    hint: "Pivot down (positive) or up, in face-pixels off the MEASURED dial centre (0 = the measurement)",
  },
  {
    key: "hourLength",
    label: "Hour length",
    unit: "",
    // DOWN to -70: a 50px stub, barely off the boss. UP to +118: exactly 238,
    // the painted rim — an hour hand as long as the face is the far end of
    // plainly-wrong, and reaching it is what a dial for judging by eye is for.
    min: -70,
    max: 118,
    hint: "Hour hand length, in face-pixels off the baked 120 (the face's own radius is 238)",
  },
  {
    key: "hourWidth",
    label: "Hour width",
    unit: "",
    // percentage points. -70 is a third of the baked blade — where the heavy
    // style stops being heavy, which is the comparison the lab exists to make.
    // +150 is two and a half times, frankly clumsy, and visibly so.
    min: -70,
    max: 150,
    hint: "Hour hand width, in percent off the baked blade (0 = as baked)",
  },
  {
    key: "minuteLength",
    label: "Minute length",
    unit: "",
    // UP to +36 = 238, the rim again. DOWN to -120 puts it inside the hour hand,
    // which is wrong in an interesting way and worth being able to see.
    min: -120,
    max: 36,
    hint: "Minute hand length, in face-pixels off the baked 202 (the face's own radius is 238)",
  },
  {
    key: "minuteWidth",
    label: "Minute width",
    unit: "",
    min: -70,
    max: 150,
    hint: "Minute hand width, in percent off the baked blade (0 = as baked)",
  },
  {
    key: "secondLength",
    label: "Second length",
    unit: "",
    // The second hand is baked at 226, twelve face-pixels short of the rim, so
    // it only has +12 of honest headroom before it starts crossing the painted
    // bronze. Given +12 exactly, and no more.
    min: -140,
    max: 12,
    hint: "Second hand length, in face-pixels off the baked 226 — +12 is exactly the painted rim at 238",
  },
  {
    key: "secondWidth",
    label: "Second width",
    unit: "",
    // A HIGHER CEILING THAN THE OTHER TWO, and it is the one width that needs
    // it: the second hand is baked at 3.4 face-px, so +150 is still only 8.5 —
    // thinner than the hour hand's baked 14. +300 is where it reads as a third
    // heavy blade, which is a real design question rather than an absurd one.
    min: -70,
    max: 300,
    hint: "Second hand width, in percent off the baked blade — the thinnest of the three, so this one reaches further",
  },
  {
    key: "boss",
    label: "Boss size",
    unit: "",
    // THE HUB. Baked at r=17 face-px for the cathedral style, which is a little
    // wider than the hour hand's blade so the three hands appear to enter it.
    // -80 is very nearly gone; +200 is a cover plate over the middle of the
    // dial, which is exactly the thing to reach for if the hands' meeting point
    // ever reads as messy.
    min: -80,
    max: 200,
    hint: "Centre boss size, in percent off the baked hub (0 = as baked)",
  },
  {
    key: "opacity",
    label: "Opacity",
    unit: "",
    // HUNDREDTHS, against a shipped 1.00 — so the bound IS the clamp and the
    // stylesheet needs none of its own. It only goes down: there is nothing
    // above fully opaque to reach.
    //
    // -100 is INVISIBLE, and deliberately reachable: "are the hands helping?"
    // is a question best answered by turning them off while looking at the
    // dial, not by rebuilding without them.
    min: -100,
    max: 0,
    hint: "Hand opacity, in hundredths off solid (0 = fully opaque; -100 = invisible)",
  },
  {
    key: "angle",
    label: "Angle",
    unit: "deg",
    // ── THE SCRUB THAT LETS THE ART BE JUDGED AT REST ────────────────────────
    // It rotates the WHOLE ASSEMBLY rigidly — all three hands and their
    // relative arrangement together — rather than driving one hand.
    //
    // WHY RIGIDLY, AND NOT ONE HAND AT A TIME. The question this dial exists to
    // answer is the FT-968 lane's own: does a hand lying along a painted spoke
    // still read? The face has eight spokes, so that question is asked by
    // sweeping the assembly across spokes and gaps — 0 is on a spoke, 22.5 is
    // mid-gap — and watching all three hands cross them together. Three
    // separate angle dials would answer a different, easier question and would
    // also let the hands be dialled into a heap on top of each other.
    //
    // IT IS LIVE WHETHER OR NOT THE CLOCK IS FROZEN: added to every hand's
    // angle always. Frozen it spins a still assembly; running it is a phase
    // offset on a moving one.
    min: 0,
    max: 359,
    hint: "Rotate the whole assembly, in degrees — the dial's eight spokes fall every 45°, so 0 lies along one and 22 sits mid-gap",
  },
  {
    key: "overshoot",
    label: "Overshoot",
    unit: "",
    // TENTHS OF A DEGREE, against the shipped 1.2° peak (see overshootDegrees).
    // Tenths because NumberScrub is an integer control and a whole degree is a
    // sixth of the whole step — far too coarse for a dial whose entire subject
    // is a hair of movement.
    // DOWN to -12: exactly 0.0°, which IS the clean step — so this scrub can
    // reach the neighbouring look without touching the motion switch, and the
    // two agree at that point rather than being two separate claims.
    // UP to +28: 4.0°, two thirds of a step — a hand visibly bouncing.
    // Reachable on purpose: a dial that can only be subtle cannot show you why
    // subtle was chosen.
    min: -12,
    max: 28,
    hint: "How far the tick overshoots before settling, in tenths of a degree (0 = the shipped 1.2°; -12 = none, i.e. a clean step)",
  },
];

/**
 * Storage keys. ALL NEW — no browser anywhere holds a value under any of them,
 * so none carries a suffix. faceDisc.js's bump rule governs them from their
 * first bake onward: bump whenever a non-zero stored value would survive into a
 * changed base.
 */
const DIAL_STORAGE = {
  centreX: "golem.fhCentreX",
  centreY: "golem.fhCentreY",
  overshoot: "golem.fhOvershoot",
  hourLength: "golem.fhHourLength",
  hourWidth: "golem.fhHourWidth",
  minuteLength: "golem.fhMinuteLength",
  minuteWidth: "golem.fhMinuteWidth",
  secondLength: "golem.fhSecondLength",
  secondWidth: "golem.fhSecondWidth",
  boss: "golem.fhBoss",
  opacity: "golem.fhOpacity",
  angle: "golem.fhAngle",
};

const STYLE_STORAGE = "golem.fhStyle";
const COLORWAY_STORAGE = "golem.fhColorway";
const FREEZE_STORAGE = "golem.fhFreeze";
const MOTION_STORAGE = "golem.fhMotion";

/**
 * THE REFERENCE ARRANGEMENT the Angle scrub spins when the clock is FROZEN.
 *
 * These three numbers are the FT-968 contact sheet's own spread — the "time"
 * every candidate style was baked and judged at — so a frozen lab reproduces
 * the picture that chose the shipped style, and a later eye can check the call
 * against the same arrangement rather than a new one.
 *
 * They are a SPREAD, not a time: no real clock face puts its hands here. That
 * is the point. Three hands bunched at a plausible time hide each other, and
 * the thing being judged is each blade against the paint behind it.
 */
export const FACE_HANDS_FROZEN = { hour: 250, minute: 48, second: 165 };

/** One second of dial. Sixty steps to the turn. */
export const SECOND_STEP_DEG = 6;

/** One minute of dial — the minute hand's own step when the tower ticks. */
export const MINUTE_STEP_DEG = 6;

/**
 * ── ONE GAME DAY OF DIAL (FT-1020) ───────────────────────────────────────────
 * The hour hand no longer measures hours: it counts the GAME'S OWN DAYS, one
 * step at each day-start, and ignores the wall clock entirely. The step is an
 * hour position — 30°, a full circle in twelve days — because the dial's tick
 * rays (where the numerals stand, see FaceHands.vue) fall every 30°, so day N
 * points at numeral N. Games run three to five days; the hand will not lap.
 *
 * This does NOT break the eight-spokes no-snapping doctrine above: that rule
 * forbids asserting a precision the art cannot carry, and "which day is it" is
 * a count, not a clock reading — the phase readout states the same number in
 * words an inch away.
 */
export const DAY_STEP_DEG = 30;

/**
 * ── THE ESCAPEMENT: A TICK WITH A LITTLE LIFE IN IT ─────────────────────────
 *
 * A hard jump is honest and dead. A real escapement releases the wheel, the
 * hand arrives with momentum, overshoots a hair, and settles back. This is that
 * settle, as a damped sine added to the stepped angle.
 *
 * THE BUDGET IS THE HARD PART. At one step per second the hand must be
 * completely still well before the next step, or the tick reads as a wobble
 * rather than a mechanism. SETTLE_MS is 140 — a seventh of the gap — and the
 * offset is hard-zeroed past it, so "still" is exact rather than asymptotic.
 *
 * `ESC_NORM` makes the dial mean what it says: without it the peak of a damped
 * sine is some fraction of its amplitude coefficient, so a "1.2°" setting would
 * overshoot by 0.6° and the number in the lab would be a lie. The first maximum
 * of sin(2π·cycles·p) lands at p = 1/(4·cycles); normalising by the decay there
 * makes the coefficient equal the ACTUAL peak, in degrees.
 */
const ESC_SETTLE_MS = 140;
const ESC_DECAY = 3.5;
const ESC_CYCLES = 1.25;
const ESC_PEAK_P = 1 / (4 * ESC_CYCLES);
const ESC_NORM = Math.exp(ESC_DECAY * ESC_PEAK_P);

/** The shipped overshoot, in degrees of dial — a fifth of a step. */
export const ESCAPEMENT_PEAK_DEG = 1.2;
/** Same number in the tenths the lab's integer scrub speaks. */
export const ESCAPEMENT_PEAK_TENTHS = 12;

/** The lab's Overshoot scrub is an offset in TENTHS of a degree; this is the
 *  one place that becomes degrees, so the dial and the motion cannot disagree. */
export function overshootDegrees(dialValue) {
  return (ESCAPEMENT_PEAK_TENTHS + (Number(dialValue) || 0)) / 10;
}

/**
 * Degrees to ADD to the stepped angle, `tMs` into the current second. Zero
 * before the step and zero again from ESC_SETTLE_MS onward.
 */
function escapementOffset(tMs, peakDeg) {
  if (!(peakDeg > 0) || tMs < 0 || tMs >= ESC_SETTLE_MS) return 0;
  const p = tMs / ESC_SETTLE_MS;
  return (
    peakDeg *
    ESC_NORM *
    Math.exp(-ESC_DECAY * p) *
    Math.sin(2 * Math.PI * ESC_CYCLES * p)
  );
}

/**
 * HOW THE SECOND HAND MOVES — three looks, so the lab can compare them.
 * `escapement` ships; see the component for the judgement that put it there.
 */
export const FACE_HANDS_MOTIONS = [
  {
    id: "escapement",
    label: "Escapement",
    hint: "Steps once a second, then overshoots a hair and settles — a real movement's tick. THE SHIPPED PICK",
  },
  {
    id: "tick",
    label: "Clean step",
    hint: "Steps once a second and stops dead. Honest, and a little lifeless",
  },
  {
    id: "sweep",
    label: "Sweep",
    hint: "Continuous glide, no step at all — a quartz sweep hand. The look this replaced",
  },
];

const DEFAULT_MOTION = "escapement";

/**
 * ── THE ONE PLACE TIME BECOMES ROTATION ──────────────────────────────────────
 *
 * Takes how long the current phase has been running and returns three angles in
 * degrees, clockwise from twelve. Change the SOURCE of `elapsedMs` — a real
 * phase log, a server clock, a replay's scrub — and every behaviour below is
 * unchanged. That is the whole reason this is a function of one number.
 *
 * IT IS A REAL CLOCK'S GEARING, on elapsed time rather than time of day: the
 * second hand sweeps a full turn a minute, the minute hand a full turn an
 * hour. The HOUR hand left that gearing in FT-1020 — it counts game days now
 * (see DAY_STEP_DEG above): pass `opts.day` and it stands at day × 30°,
 * ignoring elapsed time entirely. Omit it and the old twelve-hour creep
 * remains, for any caller with no game to count.
 *
 * THE TOWER TICKS NOW (FT-1020). `opts.minuteTick` quantises the minute hand
 * to whole minutes; the short snap between positions is the stylesheet's
 * (FaceHands.vue carries a transition on exactly the two stepping hands), so
 * this function stays a pure position — time in, angles out, nothing animated
 * here. Without the flag the minute hand creeps as it always did (the build
 * panel's Sweep).
 *
 * MINUTE AND HOUR ANGLES ARE DELIBERATELY UNBOUNDED — no `% 360`. A CSS
 * transition animates between the two numbers it is given, so 354°→0° would
 * play as a fast backwards lap; 354°→360° steps forward like every other
 * tick. rotate() is periodic, so the unbounded number paints identically.
 *
 * NOTHING SNAPS TO A SPOKE. The second step is one second of time, the minute
 * step one minute of it, the day step a count the readout states in words —
 * see the header for the eight-spokes doctrine this keeps faith with.
 */
export function handAngles(
  elapsedMs,
  motion = DEFAULT_MOTION,
  overshootDeg = ESCAPEMENT_PEAK_DEG,
  opts = {},
) {
  const ms = Math.max(0, Number(elapsedMs) || 0);
  const seconds = ms / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;

  // ── THE SECOND HAND STEPS; THE OTHER TWO CREEP ───────────────────────────
  // A stepping MINUTE hand would look broken, and a real mechanical movement's
  // minute hand does creep between its marks — so only the second hand is
  // quantised. See the header for why nothing here may snap to a SPOKE: the
  // step is one second of time, never one eighth of the dial.
  let second;
  if (motion === "sweep") {
    second = (seconds % 60) * 6;
  } else {
    // FLOOR THE ELAPSED SECONDS — the position is a pure function of the time,
    // so it is right whenever a frame happens to run. A `setInterval(…, 1000)`
    // would accumulate its own lateness and walk away from the wall clock; this
    // cannot, because nothing is accumulated. A dropped frame corrects itself
    // on the next one rather than costing a step forever.
    const whole = Math.floor(seconds);
    second = ((whole % 60) * SECOND_STEP_DEG) % 360;
    if (motion === "escapement") {
      second += escapementOffset(ms - whole * 1000, overshootDeg);
    }
  }
  // THE MINUTE HAND: whole-minute steps when the tower ticks (floored from
  // elapsed time, the same drift-proof arithmetic as the second hand's step),
  // the old creep otherwise. Unbounded either way — see the note above.
  const minute = opts.minuteTick
    ? Math.floor(minutes) * MINUTE_STEP_DEG
    : minutes * MINUTE_STEP_DEG;
  // THE HOUR HAND: the game's day counter when a day is given (FT-1020),
  // the legacy twelve-hour creep when none is.
  const hour =
    typeof opts.day === "number"
      ? Math.max(0, opts.day) * DAY_STEP_DEG
      : (hours % 12) * 30;
  return { second, minute, hour };
}

const clamp = (dial, v) =>
  Math.max(dial.min, Math.min(dial.max, Number(v) || 0));

/**
 * Read the persisted offsets. Anything unreadable reads as ZERO, which is what
 * ships — a broken storage entry must never be able to bend the app.
 */
export function readFaceHandsLab() {
  const out = {};
  FACE_HANDS_DIALS.forEach((d) => {
    let v = 0;
    try {
      v = Number(localStorage.getItem(DIAL_STORAGE[d.key]) || 0) || 0;
    } catch (e) {
      v = 0;
    }
    out[d.key] = clamp(d, v);
  });
  return out;
}

/** The persisted style. Anything unrecognised reads as the shipped pick. */
export function readFaceHandsStyle() {
  let id = "";
  try {
    id = localStorage.getItem(STYLE_STORAGE) || "";
  } catch (e) {
    id = "";
  }
  return FACE_HANDS_STYLES.some((s) => s.id === id) ? id : "cathedral";
}

/** The persisted colourway. Anything unrecognised reads as the shipped pick. */
export function readFaceHandsColorway() {
  let id = "";
  try {
    id = localStorage.getItem(COLORWAY_STORAGE) || "";
  } catch (e) {
    id = "";
  }
  return FACE_HANDS_COLORWAYS.some((c) => c.id === id) ? id : "dark";
}

/** The persisted second-hand motion. Anything unrecognised reads as the
 *  shipped pick, the same rule every other stored choice here follows. */
export function readFaceHandsMotion() {
  let id = "";
  try {
    id = localStorage.getItem(MOTION_STORAGE) || "";
  } catch (e) {
    id = "";
  }
  return FACE_HANDS_MOTIONS.some((m) => m.id === id) ? id : DEFAULT_MOTION;
}

/** The persisted freeze. Off unless storage says exactly "1". */
export function readFaceHandsFreeze() {
  try {
    return localStorage.getItem(FREEZE_STORAGE) === "1";
  } catch (e) {
    return false;
  }
}

/**
 * ── HOW THE LAB REACHES THE HANDS, FOR THE THREE THINGS CSS CANNOT CARRY ─────
 *
 * The NINE numeric dials need no channel at all: they are published as custom
 * properties on <html> and the hands' stylesheet reads them, which is the whole
 * reason that pattern was chosen (see publishFaceHandsLab). The lab and the
 * hands never have to hold the same state.
 *
 * STYLE, COLOURWAY AND FREEZE ARE NOT VALUES, THEY ARE CHOICES — two pick an
 * image and one stops a clock, and neither is a thing a stylesheet can act on.
 * They travel by this event instead: the lab writes storage and fires, the
 * hands re-read. Same one-way direction as the custom properties, so there is
 * still no shared state to disagree — storage is the single copy, and both
 * sides read it rather than passing it.
 *
 * WHY NOT A SHARED MIXIN INSTANCE: a Vue 2 mixin gives every consuming
 * component its OWN `data`, so FaceHandsLab and FaceHands would hold two
 * independent copies and the panel would appear to do nothing. That is the bug
 * this event exists to make impossible.
 */
export const FACE_HANDS_EVENT = "golem:face-hands";

function notifyFaceHands() {
  try {
    window.dispatchEvent(new CustomEvent(FACE_HANDS_EVENT));
  } catch (e) {
    // no CustomEvent (or no window): the pick still lands on the next reload
  }
}

/**
 * ── THE SPRITE TABLE ─────────────────────────────────────────────────────────
 * A static map rather than a built path, because webpack has to SEE each
 * filename to emit the asset. `require("../assets/clock-hand-" + style + …)`
 * would compile to a context module over the whole directory — every png in
 * src/assets pulled into the graph, including the two 2MB backgrounds.
 *
 * Four styles x two colourways x four parts. The parts are separate files, and
 * the BOSS deliberately so: the hub and the sweeping blades may need different
 * stacking later, so they are different layers from the start.
 */
const SPRITES = {
  cathedral: {
    dark: {
      hour: require("../assets/clock-hand-cathedral-dark-hour.png"),
      minute: require("../assets/clock-hand-cathedral-dark-minute.png"),
      second: require("../assets/clock-hand-cathedral-dark-second.png"),
      boss: require("../assets/clock-hand-cathedral-dark-boss.png"),
    },
    gilt: {
      hour: require("../assets/clock-hand-cathedral-gilt-hour.png"),
      minute: require("../assets/clock-hand-cathedral-gilt-minute.png"),
      second: require("../assets/clock-hand-cathedral-gilt-second.png"),
      boss: require("../assets/clock-hand-cathedral-gilt-boss.png"),
    },
  },
  gothic: {
    dark: {
      hour: require("../assets/clock-hand-gothic-dark-hour.png"),
      minute: require("../assets/clock-hand-gothic-dark-minute.png"),
      second: require("../assets/clock-hand-gothic-dark-second.png"),
      boss: require("../assets/clock-hand-gothic-dark-boss.png"),
    },
    gilt: {
      hour: require("../assets/clock-hand-gothic-gilt-hour.png"),
      minute: require("../assets/clock-hand-gothic-gilt-minute.png"),
      second: require("../assets/clock-hand-gothic-gilt-second.png"),
      boss: require("../assets/clock-hand-gothic-gilt-boss.png"),
    },
  },
  breguet: {
    dark: {
      hour: require("../assets/clock-hand-breguet-dark-hour.png"),
      minute: require("../assets/clock-hand-breguet-dark-minute.png"),
      second: require("../assets/clock-hand-breguet-dark-second.png"),
      boss: require("../assets/clock-hand-breguet-dark-boss.png"),
    },
    gilt: {
      hour: require("../assets/clock-hand-breguet-gilt-hour.png"),
      minute: require("../assets/clock-hand-breguet-gilt-minute.png"),
      second: require("../assets/clock-hand-breguet-gilt-second.png"),
      boss: require("../assets/clock-hand-breguet-gilt-boss.png"),
    },
  },
  skeletal: {
    dark: {
      hour: require("../assets/clock-hand-skeletal-dark-hour.png"),
      minute: require("../assets/clock-hand-skeletal-dark-minute.png"),
      second: require("../assets/clock-hand-skeletal-dark-second.png"),
      boss: require("../assets/clock-hand-skeletal-dark-boss.png"),
    },
    gilt: {
      hour: require("../assets/clock-hand-skeletal-gilt-hour.png"),
      minute: require("../assets/clock-hand-skeletal-gilt-minute.png"),
      second: require("../assets/clock-hand-skeletal-gilt-second.png"),
      boss: require("../assets/clock-hand-skeletal-gilt-boss.png"),
    },
  },
};

/** One sprite's URL, always concrete — an unknown style or colourway falls back
 *  to the shipped pick rather than to a broken image. */
export function handSprite(style, colorway, part) {
  const byStyle = SPRITES[style] || SPRITES.cathedral;
  const byColor = byStyle[colorway] || byStyle.dark;
  return byColor[part];
}

/**
 * ── WHAT GOES ON <html>, AND WHY THERE ───────────────────────────────────────
 * Custom properties inherit DOWNWARD only. The hands layer, the lab panel and
 * anything a later pass lays over the face have no common ancestor closer than
 * the document — and publishing on #app instead is the exact trap the first
 * face lab fell into, where the dials appeared to do nothing at all.
 *
 * WHAT IS PUBLISHED IS ALREADY-RESOLVED SCALE, not the dial's raw offset. The
 * dial speaks face-pixels and percent because those are what a person can
 * judge; the stylesheet wants a multiplier. Doing that conversion here keeps
 * the arithmetic in one place and out of nine calc() expressions — and it is
 * what makes the zero-equals-baked invariant CHECKABLE: at zero every one of
 * these publishes exactly "1".
 */
export function publishFaceHandsLab(state) {
  const root = document.documentElement.style;
  const len = (part, key) =>
    (HAND_BAKED_LEN[part] + (state[key] || 0)) / HAND_BAKED_LEN[part];
  const pct = (key) => (100 + (state[key] || 0)) / 100;

  root.setProperty("--fh-hour-len", String(len("hour", "hourLength")));
  root.setProperty("--fh-hour-wid", String(pct("hourWidth")));
  root.setProperty("--fh-minute-len", String(len("minute", "minuteLength")));
  root.setProperty("--fh-minute-wid", String(pct("minuteWidth")));
  root.setProperty("--fh-second-len", String(len("second", "secondLength")));
  root.setProperty("--fh-second-wid", String(pct("secondWidth")));
  root.setProperty("--fh-boss", String(pct("boss")));
  // an opacity, so the dial's own bound is the clamp
  root.setProperty("--fh-opacity", String((100 + (state.opacity || 0)) / 100));
  // a length in degrees, because it is composed into a rotate()
  root.setProperty("--fh-angle", (state.angle || 0) + "deg");
  // BARE FACE-PIXEL COUNTS, not lengths: the stylesheet multiplies them by
  // --fpx itself, so one dialled value means the same distance on the dial at
  // every viewport. They are ADDED to the measured art constant, so zero is the
  // measurement and the lab being absent computes identically.
  root.setProperty("--fh-centre-x", String(state.centreX || 0));
  root.setProperty("--fh-centre-y", String(state.centreY || 0));
  // NOT PUBLISHED: `overshoot`. The tick is computed in JS (handAngles), not by
  // the stylesheet, so that dial reaches the hands through the change event
  // with the style/colourway/freeze picks rather than as a custom property.
}

/**
 * The lab as a Vue mixin — this fork's idiom for shared component behaviour
 * (`rightDrawer.js`, `bottomSheet.js`, `faceDisc.js`). Two consumers:
 * FaceHandsLab.vue owns the panel, FaceHands.vue reads the same state to pick
 * its sprites and decide whether the clock is running.
 */
export default {
  data() {
    return {
      fhLabOpen: false,
      // persisted, because a dialled value has to survive the reload it takes
      // to go and look at it again — the face lab's own lesson
      fhLab: readFaceHandsLab(),
      fhStyle: readFaceHandsStyle(),
      fhColorway: readFaceHandsColorway(),
      fhFreeze: readFaceHandsFreeze(),
      fhMotion: readFaceHandsMotion(),
      fhMotions: FACE_HANDS_MOTIONS,
      fhDials: FACE_HANDS_DIALS,
      fhStyles: FACE_HANDS_STYLES,
      fhColorways: FACE_HANDS_COLORWAYS,
    };
  },
  mounted() {
    // A stored value has to reach the hands on load, not on first drag.
    publishFaceHandsLab(this.fhLab);
  },
  methods: {
    /**
     * Clamped against each dial's OWN declared bounds rather than a second copy
     * of the numbers, so the range documented beside a scrub is the range
     * actually enforced. NumberScrub clamps its own emissions too; two
     * independently-written clamps are two things that can disagree.
     */
    setFhLab(key, n) {
      const dial = FACE_HANDS_DIALS.find((d) => d.key === key);
      if (!dial) return;
      const v = Math.max(dial.min, Math.min(dial.max, Number(n) || 0));
      this.$set(this.fhLab, key, v);
      publishFaceHandsLab(this.fhLab);
      try {
        localStorage.setItem(DIAL_STORAGE[key], String(v));
      } catch (e) {
        // storage off: the dial still works for this session
      }
      // ONE DIAL IS READ IN JS RATHER THAN BY THE STYLESHEET — `overshoot`,
      // because the tick is arithmetic and not a transform. Firing on every
      // dial rather than just that one keeps this method honest: there is no
      // list here to fall out of step with the component's.
      notifyFaceHands();
    },
    setFhStyle(id) {
      if (!FACE_HANDS_STYLES.some((s) => s.id === id)) return;
      this.fhStyle = id;
      try {
        localStorage.setItem(STYLE_STORAGE, id);
      } catch (e) {
        // storage off: the pick still works for this session
      }
      notifyFaceHands();
    },
    setFhColorway(id) {
      if (!FACE_HANDS_COLORWAYS.some((c) => c.id === id)) return;
      this.fhColorway = id;
      try {
        localStorage.setItem(COLORWAY_STORAGE, id);
      } catch (e) {
        // storage off: the pick still works for this session
      }
      notifyFaceHands();
    },
    setFhMotion(id) {
      if (!FACE_HANDS_MOTIONS.some((m) => m.id === id)) return;
      this.fhMotion = id;
      try {
        localStorage.setItem(MOTION_STORAGE, id);
      } catch (e) {
        // storage off: the pick still works for this session
      }
      notifyFaceHands();
    },
    /**
     * STOP THE CLOCK. Frozen, the three hands take FACE_HANDS_FROZEN's spread
     * and the Angle scrub spins that assembly — which is how the art gets
     * judged at rest instead of waited for.
     */
    setFhFreeze(on) {
      this.fhFreeze = !!on;
      try {
        localStorage.setItem(FREEZE_STORAGE, on ? "1" : "0");
      } catch (e) {
        // storage off: the pick still works for this session
      }
      notifyFaceHands();
    },
    /** Every scrub to zero and both switches back to the shipped pick — which
     *  is exactly the baked art, running. */
    resetFhLab() {
      FACE_HANDS_DIALS.forEach((d) => this.setFhLab(d.key, 0));
      this.setFhStyle("cathedral");
      this.setFhColorway("dark");
      this.setFhMotion(DEFAULT_MOTION);
      this.setFhFreeze(false);
    },
  },
};
