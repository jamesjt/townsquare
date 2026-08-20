// Golem fork (FT-888): THE FACE-DISC LAB — TEMPORARY, DELETE ME.
//
// Fifteen scrubs — EIGHT GEOMETRY, SEVEN MATERIAL — plus a four-way GLASS
// PRESET switch, all of which nudge EVERY menu on the
// clock face at once: the night checklist, the Host and Join entry panels, the
// build panel. A value can be found by EYE and then baked into
// `src/faceDisc.scss`, at which point this file,
// `src/components/FaceDiscLab.vue`, its one line in App.vue and every
// `var(--fd-*-adj)` read in the partial all come out together.
//
// THE MATERIAL HALF IS NEWER (FT-912 follow-on) and it exists for the same
// reason the geometry half does: the glass was tuned across four passes by
// rebuilding the app between each one, and a material is a thing you find by
// eye, on the real disc, over the real dial. Same idiom throughout — every
// scrub is an OFFSET against what ships, so zero IS the shipped material and
// Reset is a real return.
//
// WHY IT LIVES HERE and not inside a component. It started inside NightSheet,
// which meant two things that were both wrong:
//   · its dials moved ONE of the four discs, so the other three drifted;
//   · it only existed at night, on a storyteller's screen, with the checklist
//     open — so it could not be found during the day at all (user report).
// The disc is a thing this app HAS, so its lab belongs to the app.
//
// EVERY SCRUB IS AN OFFSET, never a replacement — zero is exactly what ships,
// in all fifteen — so Reset is a real return and not an approximation of one.
// (ONE EXCEPTION, declared where it lives: `corner` publishes a RESOLVED
// percentage rather than an offset, because `calc(50% + 0%)` is not the string
// `50%` and an offset there would make "zero equals shipped" true in pixels and
// false in the computed value an acceptance rig reads. See the dial.)
// For the material half that invariant is the load-bearing one: the lab sits in
// the shipped bundle, so if a zero-scrub were even slightly not the shipped
// material, the lab's mere PRESENCE would have re-tuned the glass for everyone.
//
// TWO ROUNDS HAVE NOW BEEN BAKED (both 2026-08-19):
//   1st  X -12, Y -13, R -10, W 0, Hd -16, Ft +8 — folded into faceDisc.scss's
//        base expressions, and the six storage keys below bumped to their "2"
//        set in the same commit.
//   2nd  a further X -1, Y -2 on top, so the SCSS now reads -13 / -15. NO key
//        bump this time, and the reason is the first bake rather than luck:
//        after a bake the lab reads ZERO at the shipped position, so what a
//        browser holds under the fd*2 keys is "0", and folding another -1/-2
//        into the base on top of a stored zero is still just that -1/-2.
//
// SO THE RULE IS NOT "bump the keys every bake" — it is BUMP THEM WHENEVER A
// NON-ZERO STORED VALUE WOULD SURVIVE INTO A CHANGED BASE. That is the state a
// bake ENDS, not the state it begins in. Get it backwards and the first bake
// after a dialling session silently applies itself twice, which looks like the
// app being wrong rather than the storage being stale.
//
// The invariant at the top survived both rounds and is checked rather than
// asserted (claude_temp_test/2026-08-19-discglass-accept.mjs, five claims):
// zero computes identically to the lab's properties being absent altogether, a
// stored zero lands where a virgin browser lands, the pre-bake keys are still
// dead, Reset returns to the BAKED position, and the disc's measured centre
// matches the arithmetic the CSS claims.
//
// THE VALUES ARE PUBLISHED ON <html>, not on any one surface's element. That is
// what makes one lab drive four discs: custom properties inherit DOWN, and the
// four discs have no common ancestor closer than the document. It is also the
// mechanism App.vue's own face lab already uses for --bg-off-x/y.
//
// DESKTOP DISC ONLY. Every value is read inside the disc's own media query
// (see `face-disc-gate` in faceDisc.scss); a phone's rectangle has no disc, no
// caps and no band and never sees them. Publishing them anyway costs nothing:
// `var(--x, 0px)` against `--x: 0px` computes identically.
//
// NOTE, carried from the face lab: NumberScrub's type-in strips non-digits, so
// a NEGATIVE offset can be DRAGGED but not typed. Left as it is rather than
// forking a shared control for a tool that is coming out again.

// The storage keys carry an "fd" prefix rather than the old "golem.nsR" set,
// and deliberately: those held a value calibrated against ONE disc, and a
// browser holding a dialled -20 would now apply it to four. Same idea as
// App.vue's own "2"-suffixed bgOff keys, for the same reason.
//
// AND NOW A "2" ON ALL SIX, FOR THE SAME REASON AGAIN. The dialled set
// (X -12, Y -13, R -10, W 0, Hd -16, Ft +8) was BAKED into faceDisc.scss's base
// expressions — so a browser that still held those numbers under the old keys
// would read them back on load and apply the whole set a SECOND time, landing
// the disc 24px left of where it was dialled with the header 32px up. Bumping
// the key is what makes the bake a bake: every browser starts from zero, and
// zero is now the baked position. This is not a nicety, it is the one step that
// separates "shipped the value" from "shipped it twice".
//
// The old keys are LEFT IN PLACE in storage, unread — there is nothing to gain
// by clearing them and a cleanup pass that touches a user's localStorage is a
// worse habit than a stale key.
//
// THE SEVEN MATERIAL KEYS BELOW ARE NEW, so they carry no suffix: there is no
// browser anywhere holding a value under them and therefore nothing for a first
// bake of the glass to apply twice. The bump rule above governs them from their
// FIRST bake onward, exactly as written — a key bump is owed whenever a
// non-zero stored value would survive into a changed base.
//
// THE TWO SHAPE KEYS AND THE PRESET KEY BELOW ARE NEW (FT-888 width/corner pass)
// and carry no suffix for the same reason the material seven did not: no browser
// anywhere holds a value under them, so there is nothing for a first bake to
// apply twice. The bump rule above governs them from their first bake onward.
const STORAGE = {
  x: "golem.fdX2",
  y: "golem.fdY2",
  r: "golem.fdR2",
  width: "golem.fdWidth",
  corner: "golem.fdCorner",
  band: "golem.fdBand2",
  head: "golem.fdHead2",
  foot: "golem.fdFoot2",
  blur: "golem.fdBlur",
  sat: "golem.fdSat",
  bright: "golem.fdBright",
  tintDark: "golem.fdTintDark",
  tintLit: "golem.fdTintLit",
  edge: "golem.fdEdge",
  rim: "golem.fdRim"
};

/** The glass preset the dials were last seeded from. Not a dial — see
 *  FACE_DISC_PRESETS. */
const PRESET_STORAGE = "golem.fdPreset";

/**
 * THE EIGHT SCRUBS, and the reasoning behind every bound. All measured at
 * 1280x800 — the TIGHTEST viewport the disc runs at, since its gate floors at
 * 1000x780 — so a bound that holds there holds everywhere the disc appears.
 *
 * SINCE THE BAKE the disc is 10px smaller than every number written below was
 * measured against: at 1280x800 the face now gives r = 201.5px (was 211.6),
 * band 328.4px wide by 233.8px tall (was 344.7 x 245.4), each cap 84.6px (was
 * 88.9). The bounds are LEFT WHERE THEY ARE — each one is a distance to drag,
 * not a position, and every one of them still reaches its own failure and stops
 * short of anything worse. What the bake changes is the ORIGIN they count from,
 * and that origin is now the user's dialled set rather than the pre-lab one.
 *
 * THE CAPS ARE WHAT BUY THE BAND ITS WIDTH, so the band width is the thing that
 * must not be strangled, and it is guarded in TWO places, because Radius, Width
 * and Text band are now THREE scrubs against one quantity and their bounds
 * compound:
 *   · here, per scrub, so none alone does anything silly;
 *   · and in faceDisc.scss, as a `max()` FLOOR on the computed band
 *     ($face-disc-band-floor, 265px) — the only bound that holds whatever the
 *     three do BETWEEN them.
 *
 * Header and Footer cannot touch the band at all — they are transforms, and a
 * transform takes no part in layout — so those two are bounded by the RIM
 * instead, at values read off the sweep rather than reasoned about.
 *
 * THE LABELS ARE WORDS, not initials ("we don't need to abbreviate things, just
 * tell me what they are", user, 2026-08-19). The hints are unchanged; the label
 * column in FaceDiscLab.vue widened to hold them.
 */
export const FACE_DISC_DIALS = [
  {
    key: "x",
    label: "Horizontal",
    // a length, published as px (see publishFaceDiscLab)
    unit: "px",
    // WHERE THE DISC SITS, not how big it is — the first two dials, in the same
    // order and the same idiom as App.vue's face lab (X, Y, then size), so the
    // two panels read as one toolkit.
    //
    // RANGE, and why 60. The disc's radius IS the face's radius, so the moment
    // this is non-zero the plate overhangs one side of the painted rim and
    // falls short on the other — there is no "safe" range, only a useful one.
    // At the tightest viewport the disc runs at, r is 211.6px, so 60px is 28%
    // of the radius: far enough past plainly-wrong that the failure is
    // reachable and visible, which is what a dial for finding a value by eye is
    // for (the same argument that puts Hd and Ft one notch past their edges).
    // It also matches R's own +60, so no dial in this panel out-ranges another.
    min: -60,
    max: 60,
    hint: "Disc centre right (positive) or left, from the clock face's centre"
  },
  {
    key: "y",
    label: "Vertical",
    // a length, published as px (see publishFaceDiscLab)
    unit: "px",
    min: -60,
    max: 60,
    hint: "Disc centre down (positive) or up, from the clock face's centre"
  },
  {
    key: "r",
    label: "Radius",
    // a length, published as px (see publishFaceDiscLab)
    unit: "px",
    // DOWN to -40: r = 172, band 280px — still a readable column, and about
    // where the checklist rectangle's own reading width starts. Below that it
    // strangles (-80 would leave 214px of line for a row carrying a label, two
    // seat pickers and a sentence).
    // UP to +60: past the painted rim the disc stops being a plate laid ON the
    // dial and becomes one covering it — a different design, but watching that
    // happen is the point of having a lab.
    min: -40,
    max: 60,
    hint: "Disc radius, offset from the clock face (0 = the face itself)"
  },
  {
    key: "width",
    label: "Width",
    // a length, published as px (see publishFaceDiscLab)
    unit: "px",
    // THE DISC NEED NOT BE A CIRCLE. "Can we make the circle not exactly a
    // circle as one of the options so I can better match it to the art" (user,
    // 2026-08-19). This is the SECOND RADIUS: it offsets the HORIZONTAL one
    // only, so the plate becomes an ellipse (or, with Corner, a rounded
    // rectangle) while Radius keeps governing the vertical.
    //
    // IT IS A HALF-WIDTH, per side, not a total. Every other length in this
    // file is a radius (0.95r for the button, 1.3r for the header, hw x r for
    // the band), so a dial that meant "total width" would be the only one
    // counting doubles. +20 makes the disc 40px wider and keeps it centred.
    //
    // ITS BOUNDS ARE RADIUS'S BOUNDS, and deliberately: it acts on the band
    // through the SAME expression (the band is 2 x hw x the horizontal radius),
    // so the value at which it strangles a readable column is the value at
    // which Radius does. -40 / +60.
    //
    // WHAT IT COSTS, measured rather than reasoned (rig:
    // claude_temp_test/2026-08-19-glass3-clearance.mjs). Because the caps are a
    // fraction of the VERTICAL diameter, the band's half-height over the
    // vertical radius is a constant 0.58 whatever this dial does — so the
    // half-chord is exactly hw x (horizontal radius) and every piece of
    // furniture in the disc is a multiple of that same horizontal radius.
    // Clearance therefore scales LINEARLY with it: at Width +40 the header and
    // the button have proportionally more room than at 0, at -40 proportionally
    // less, and nothing crosses the rim that did not already.
    min: -40,
    max: 60,
    hint: "Disc half-width, offset from the radius (0 = exactly a circle; +20 = 40px wider)"
  },
  {
    key: "corner",
    label: "Corner",
    // a percentage, and this dial publishes a RESOLVED VALUE rather than an
    // offset — the one exception to this file's own rule, declared here.
    unit: "%",
    // WHY AN EXCEPTION. Every other scrub lands as `calc(<shipped> + <adj>)`,
    // and at zero that computes what the literal computed. `border-radius` is
    // the one place that is not enough: a browser reports `calc(50% + 0%)` as
    // exactly that string, not as `50%`, so an offset here would make "zero
    // equals shipped" true in pixels and FALSE in the computed value — and the
    // computed value is what the acceptance rig reads. Publishing the resolved
    // percentage keeps both true: at 0 the lab publishes the literal `50%`,
    // which is the string the stylesheet's own fallback carries.
    //
    // IT ONLY GOES DOWN, and that is honest rather than a limitation: 50% IS
    // the full ellipse, and a browser clamps any radius pair that would overlap,
    // so there is nothing above it to reach. -50 is a hard rectangle, -25 a
    // rounded one.
    min: -50,
    max: 0,
    hint: "Corner rounding, in points off 50% (0 = the full ellipse; -50 = a hard rectangle)",
    // The published value, not the offset. 0 -> "50%".
    publish: v => 50 + v + "%"
  },
  {
    key: "band",
    label: "Text band",
    // a length, published as px (see publishFaceDiscLab)
    unit: "px",
    // The band is ALREADY the maximal chord the circle allows at cap 0.21:
    // half-height 122.7, half-width 172.4, and 172.4^2 + 122.7^2 is exactly r^2.
    // So the FIRST positive pixel is outside the circle, and on a surface that
    // clips (the checklist) `overflow: hidden` shears the band's four corners,
    // which shows as clipped row rules on the top and bottom rows. +30 is
    // roughly where that reads at 1280x800, and it is allowed because the corner
    // region carries no text and a wider line may still be the better trade.
    // -80 goes as narrow as the FLOOR permits and no further; the floor, not
    // this number, is what actually stops the strangling.
    min: -80,
    max: 30,
    hint: "Text band width, offset from the chord the caps allow (0 = as built)"
  },
  {
    key: "head",
    label: "Header",
    // a length, published as px (see publishFaceDiscLab)
    unit: "px",
    // NEGATIVE IS UP. The header rides the bottom of the top cap and moves by
    // transform, so the band never shifts and the content width is untouched
    // whatever this does — only the rim binds it. SWEPT at 1280x800 (the binding
    // viewport), clearance from the rim measured at the header content's worst
    // corner, on top of the then-current -9px bake: 0 -> 10.5px, -4 -> 7.3,
    // -8 -> 4.0, -12 -> 0.7, -16 -> -2.7. So -16 was deliberately ONE NOTCH PAST
    // the edge: the failure is reachable and visible rather than theoretical,
    // which is what a dial meant for finding a value by eye is for.
    //
    // AND -16 IS THE VALUE THAT WAS THEN BAKED (faceDisc.scss's -25px is
    // -9 + -16). The sweep above therefore describes where this dial STARTS
    // from now: zero is the -2.7 row, and the re-sweep at the baked geometry
    // reads -10.9 at this viewport because R -10 brought the rim in as well.
    // The range is unchanged — a dial that can only make things better is a
    // dial that cannot show you the edge.
    // DOWN to +24: further and it laps the band's first row.
    min: -16,
    max: 24,
    hint: "Header up (negative) or down, from where it now sits in the top cap"
  },
  {
    key: "foot",
    label: "Footer",
    // a length, published as px (see publishFaceDiscLab)
    unit: "px",
    // POSITIVE IS DOWN, toward the bottom pole, where the arc closes on a button
    // that is 0.95r wide. Same sweep, same viewport, on top of the then-current
    // +6px bake: -10 -> 11.2px, 0 -> 4.9, +4 -> 1.3, +8 -> -2.2. +8 was again
    // one notch past the edge; +4 was the last safe value.
    //
    // AND +8 IS THE VALUE THAT WAS THEN BAKED (faceDisc.scss's +14px is 6 + 8),
    // so this dial's zero is now the -2.2 row of that sweep — -4.9 at the baked
    // radius. Reading the sweep backwards from here: about -8 on this dial puts
    // the End-night button back inside the rim at 1280x800, which is the number
    // to reach for if that corner is ever called wrong.
    // -24 lifts it back up toward the band.
    min: -24,
    max: 8,
    hint: "Primary button down (positive) or up, from where it now sits"
  }
];

/**
 * THE SEVEN MATERIAL SCRUBS — the glass, not the geometry.
 *
 * WHY THESE SEVEN AND NOT EVERY NUMBER IN THE FILE. `faceDisc.scss`'s material
 * block holds three filter terms, two tint constants, six box-shadow layers,
 * four gradient stops on the ground, two gradients on the edge and a mask. Most
 * of those are AUTHORED SHAPE — the bevel's two crescents, the conic specular's
 * angular stops, the grimoire's plum hairline — and a scrub through them is not
 * a tune, it is a redraw. The seven below are the ones that govern the LOOK as
 * one continuous quantity, i.e. the ones a person turns and watches.
 *
 * EVERY DIAL IS AN INTEGER, because NumberScrub is an integer control (it
 * rounds, and its type-in strips non-digits). So each carries its own SCALE and
 * the SCSS divides by it — thousandths for the blur, hundredths for everything
 * else. Zero is the shipped value in all seven, exactly as with the geometry
 * six; the bounds below are what keep every derived value legal (no negative
 * blur, no negative saturation, no tint outside 0..1), so the SCSS needs no
 * clamps of its own beyond one belt-and-braces `max(0px, …)` on the blur.
 *
 * THE UNITS ARE UNITLESS. These publish bare numbers, not lengths — a filter
 * term and an opacity take a <number>, and the mask's two stops take a
 * percentage the SCSS builds itself (`calc(85% + var(--fd-edge-adj) * 1%)`).
 * That is what `unit` on each dial is for.
 */
export const FACE_DISC_MATERIAL = [
  {
    key: "blur",
    label: "Blur",
    unit: "",
    // THOUSANDTHS OF THE RADIUS, and it stays a fraction of the radius — that
    // is the whole point of the term. Everything behind the plate scales with
    // the face (--fpx is cqw/cqh-based), so a fixed pixel count would be a
    // DIFFERENT MATERIAL at every window size; one setting here is one material
    // everywhere. Shipped 0.014r (~2.8px at 1280x800, ~3.9px at 1920x1080).
    //
    // DOWN to -14: exactly 0.000r — clear glass, no scatter at all. That is a
    // real target rather than an absurd bound: the user rejected the material
    // twice with the word "frost", and frost IS blur, so the dial has to be
    // able to reach the far end of that argument.
    // UP to +90: 0.104r, which is exactly the 22px frost that was rejected
    // twice at 1280x800.
    //
    // THAT CEILING USED TO BE +31 (0.045r) AND IT MOVED, for a reason that is
    // not a softening. The old bound existed so that nobody could DRAG their way
    // back into a material this app has already called wrong three times. The
    // preset switch below changes the question: Acrylic IS that frost — the
    // research pass's own control group, the material Microsoft's docs call
    // frosted glass — and a preset that silently clamped its own recipe to
    // something prettier would be the one thing this exercise must not do. A
    // dial that can only reach the materials we already like cannot show you
    // what the others are.
    min: -14,
    max: 90,
    hint: "Blur, in thousandths of the disc radius (0 = the shipped 0.014r; -14 = perfectly clear)"
  },
  {
    key: "sat",
    label: "Saturate",
    unit: "",
    // HUNDREDTHS, against a shipped 2.05. Saturation is the glass cue this
    // material runs on: the dial under the plate is mid-bronze COLOUR, and
    // lifting the colour is what stops a low-blur pane reading as smoked
    // perspex.
    // DOWN to -105: saturate(1.0) — no lift at all, the honest floor. Below 1
    // is DESATURATION, which is a different material (a grey pane over a bronze
    // dial) rather than a weaker version of this one.
    // UP to +95: saturate(3.0), where the dial's bronze goes frankly orange.
    min: -105,
    max: 95,
    hint: "Saturation of what shows through, in hundredths (0 = the shipped 2.05)"
  },
  {
    key: "bright",
    label: "Brightness",
    unit: "",
    // HUNDREDTHS, against a shipped 0.78. THE ADAPTIVE TERM: a multiply takes
    // the LIT dial (entry panels, a day build panel) down hard and the
    // night-dimmed one barely at all, which is what one material over two very
    // different grounds needs and what a flat alpha cannot do.
    // DOWN to -48: 0.30, near-black — the far end of "calm it down".
    // UP to +72: 1.50, which is Liquid Glass's own `brightness(150%)` (the
    // LogRocket build's number, the only completely specified one on the open
    // web). It used to stop at +52 (1.30); the preset switch below is what moved
    // it, on the same principle as the blur ceiling — a preset must be allowed
    // to be the material it names.
    //
    // Above 1 is BRIGHTENING, and the range has to reach there
    // because the research pass recommended exactly that (1.06) and the
    // measurement rejected it: brightening is the right sign over a dark
    // backdrop and the wrong one over a lit one, and it lands white row text at
    // 4.07 : 1 on the entry panel. Being able to SEE that failure is the point,
    // and the Liquid Glass preset is that failure at full strength.
    min: -48,
    max: 72,
    hint: "Brightness multiply on what shows through, in hundredths (0 = the shipped 0.78)"
  },
  {
    key: "tintDark",
    label: "Night tint",
    unit: "",
    // THE TINT OVER A DARK DIAL — the night checklist. HUNDREDTHS against a
    // shipped 0.22.
    //
    // WHY THIS IS TWO DIALS AND NOT ONE. The tint is already two numbers in the
    // SCSS ($face-disc-tint-dark / -lit, switched by `#app.night`) because the
    // four discs do not stand on the same backdrop: measured ground luminance
    // under the plate is 0.029 at night and 0.098 on the lit entry dial, a
    // three-and-a-half-fold difference. One dial that silently edited "whichever
    // is on screen" would make the SAME scrub mean two different things
    // depending on the phase, and would give the user no way to see the pair
    // they are actually choosing. Two dials, both always visible, with the LIVE
    // one marked in the panel (FaceDiscLab.vue reads the same `isNight` the
    // class does) — so the one being turned is never in doubt.
    //
    // The bounds ARE the clamp: --fd-tint is an opacity, so it must stay inside
    // 0..1, and -22 / +78 is exactly 0.00 .. 1.00 from a base of 0.22.
    min: -22,
    max: 78,
    hint: "NIGHT tint — the veil over a dark dial, in hundredths (0 = the shipped 0.22)"
  },
  {
    key: "tintLit",
    label: "Lit tint",
    unit: "",
    // THE TINT OVER A LIT DIAL — the entry panels and a daytime build panel.
    // HUNDREDTHS against a shipped 0.46, and the bounds are again the clamp:
    // -46 / +54 is 0.00 .. 1.00.
    //
    // THIS IS THE HARDER OF THE TWO and the reason it cannot simply follow the
    // night value down. The entry panels' backdrop CANNOT be cleaned: the ten
    // CLOCKTOWER letters are App.vue's own DOM and the dial's hand is PAINTED
    // INTO the background art. The night checklist's backdrop can be — the town
    // readout stands down under a disc (FT-912) — which is what let its tint
    // fall to 0.22 while this one stayed at 0.46.
    min: -46,
    max: 54,
    hint: "LIT tint — the veil over a lit dial (entry / day), in hundredths (0 = the shipped 0.46)"
  },
  {
    key: "edge",
    label: "Edge",
    unit: "",
    // WHERE THE EDGE MASK OPENS, in percentage points, against a shipped 85%.
    //
    // ── A MEASURED CORRECTION, AND IT IS A BIG ONE ────────────────────────────
    // "85%" IS NOT 85% OF THE RADIUS. A radial gradient's colour-stop
    // percentages are fractions of the gradient RAY, and the default ending
    // shape is `farthest-corner` — on a square box that is 1.414r. So the
    // shipped mask opens at 1.202r and is fully opaque at 1.322r: the ENTIRE
    // painted-edge layer sits outside the circle the border-radius clips to, and
    // on the shipped disc it paints nothing at all.
    //
    // Measured directly rather than argued (rig:
    // claude_temp_test/2026-08-19-glass3-mask-probe.mjs — the same mask on a
    // plain white square over black, read as a radial profile): fully masked out
    // to 1.19r, first light at 1.20r, fully open by 1.34r.
    //
    // NOTHING WAS CHANGED ABOUT IT HERE, and that is deliberate: fixing the
    // geometry would alter the shipped material, which is the one thing this lab
    // may never do. It is written down so the next reader does not spend a pass
    // tuning a layer that is off the plate. The number that brings the ring INTO
    // the disc is about -24 on this dial (ramp 0.87r -> 0.99r), which is what
    // the Liquid Glass preset uses to get the rim light its recipe calls for.
    // The SCSS names this one itself: "85% is the number to reach for first if
    // this is ever re-tuned: it is the boundary between 'a rim' and 'a glare',
    // and the two rejected passes both sat inside it." So it earns a dial.
    //
    // IT SLIDES THE WHOLE RING, both mask stops together (85% and 93.5%), so
    // the ramp keeps its thickness and only its POSITION moves. Widening the
    // ramp instead would be a second, different knob and the file's own comment
    // is about position.
    // DOWN to -45: opens at 40%, painted light across three quarters of the
    // pane's area — which is precisely the broad soft highlight of a MATT
    // surface, the thing "the glare didn't help" was pointing at. Reachable on
    // purpose: a dial that can only make things better cannot show you the edge.
    // UP to +8: opens at 93%, a hairline; past that the outer stop passes the
    // rim and there is no ring left to see.
    min: -45,
    max: 8,
    hint: "Where the rim light starts, in points off the shipped 85% — which is 85% of the corner ray, i.e. 1.20r, off the plate (negative brings it in; about -24 lands it on the rim)"
  },
  {
    key: "rim",
    label: "Rim",
    unit: "",
    // HOW STRONG THE PAINTED EDGE IS — the refraction band and both specular
    // streaks at once, as the ::after layer's own opacity, in hundredths
    // against a shipped 1.00.
    //
    // IT ONLY GOES DOWN, and that is honest rather than a limitation: the six
    // rgba stops on that layer are AUTHORED at the peak the last pass chose, so
    // "more" would mean re-authoring six literals, not turning a knob — and
    // opacity clamps at 1 regardless. The search this dial is for runs
    // downward: the last two passes were both rejected for painting TOO MUCH
    // light, so the question in front of it is how much of the rim the material
    // actually wants.
    // DOWN to -100: the edge gone entirely — the plate as filter and tint alone.
    min: -100,
    max: 0,
    hint: "Rim + specular strength, in hundredths (0 = the shipped full strength; -100 = no painted edge)"
  }
];

/**
 * THE FOUR GLASSES — a starting point, not a mode.
 *
 * "There were 3 types of glass in the glass bench html, let me swap between
 * them" (user, 2026-08-19). The three are real families with real, differing
 * recipes, and they are written up in
 * mind/episteme/research/2026-08-19/css-glass-material.md. Our own shipped
 * material is the fourth, so the switch always contains a way home.
 *
 * PICKING ONE SEEDS THE SEVEN MATERIAL SCRUBS AND NOTHING ELSE — geometry is
 * untouched — and every scrub stays live afterwards. That is what makes this a
 * starting point: a preset is where a search begins, and the panel marks the
 * pick as "edited" the moment a dial leaves it.
 *
 * THEY ARE BUILT HONESTLY, INCLUDING THE ONES THAT LOOK WRONG HERE. The
 * research's central finding is that the light-tint-and-brighten recipe is the
 * right sign over a DARK backdrop and the wrong one over a LIT one — so Liquid
 * Glass over the entry panels is expected to look bad, and it does. That is the
 * information the switch exists to carry. Quietly correcting a preset to
 * flatter it would delete the only thing it has to say.
 *
 * THE TINT COLOUR IS PART OF A PRESET, and it is the one thing here that is not
 * a scrub. It has to be: glassmorphism and Liquid Glass are LIGHT tints (white
 * at 25% and 15%) and this app's is a dark grimoire purple-black, so a preset
 * that could only move the alpha would be reproducing neither. It publishes as
 * `--fd-tint-rgb`, which `faceDisc.scss` reads with the shipped triplet as its
 * own fallback — so "shipped" and "lab absent" are the same three numbers.
 *
 * WHAT NO PRESET CAN CARRY, named rather than dropped: Acrylic's NOISE layer.
 * Microsoft's recipe is blur -> exclusion blend -> tint -> noise, and the seven
 * scrubs have no noise term. Acrylic below is therefore Acrylic's blur and
 * Acrylic's tint without its grain. Liquid Glass's REFRACTION is missing for a
 * harder reason, measured in the research: `backdrop-filter: url(#svg)` is
 * Chromium-only and cannot be reached from a stylesheet at all.
 */
export const FACE_DISC_PRESETS = [
  {
    id: "shipped",
    label: "Shipped",
    // the grimoire's cool purple-black — RoleDrawer's own ground
    rgb: "26, 20, 33",
    hint: "The material this app ships: blur 0.014r, saturate 2.05, brightness 0.78, dark tint 0.22 at night / 0.46 lit",
    dials: {
      blur: 0,
      sat: 0,
      bright: 0,
      tintDark: 0,
      tintLit: 0,
      edge: 0,
      rim: 0
    }
  },
  {
    id: "glassmorphism",
    label: "Glassmorphism",
    // the trend's canonical tint is white — rgba(255,255,255,0.25)
    rgb: "255, 255, 255",
    hint: "2020–2023: blur plus opacity and nothing else — frost by construction. blur 0.050r (~10px here), saturate 1.8, no brightness knock, white tint at 25%, no painted rim",
    dials: {
      // 0.014 + 36/1000 = 0.050r — ~10px at 1280x800, which is where the
      // trend's own recipes sit
      blur: 36,
      // saturate(180%), the pairing every "frosted nav bar" recipe carries
      sat: -25,
      // no brightness term in the family at all: 1.00
      bright: 22,
      // one alpha, both phases — the family has no adaptive tint
      tintDark: 3,
      tintLit: -21,
      // its edge is a 1px light border, which this material already carries in
      // its box-shadow. So the PAINTED layer goes to nothing rather than being
      // given a rim the family does not have.
      edge: 0,
      rim: -100
    }
  },
  {
    id: "liquid",
    label: "Liquid Glass",
    // Apple's is an adaptive LIGHT tint; LogRocket's build states it as
    // hsl(0 100% 100% / 15%)
    rgb: "255, 255, 255",
    hint: "Apple, 2025: low blur, a BRIGHTENED backdrop and a light 15% tint — character from refraction, not scatter. Expected to look wrong over the lit entry dial, which is the point",
    dials: {
      // their blur(4px), read against this disc's radius at 1280x800
      // (4 / 201.5 = 0.020r) so it stays one material at every window size
      blur: 6,
      // LogRocket cranks saturation extremely hard but composites it into the
      // RIM only, never across the pane. Across the pane, then: 1.00.
      sat: -105,
      // brightness(150%) — the sign flip that makes this family what it is
      bright: 72,
      // 15%, both phases
      tintDark: -7,
      tintLit: -31,
      // THE RIM LIGHT, and the only preset that asks for one. -24 is measured:
      // it puts the mask's ramp at 0.87r -> 0.99r, i.e. actually on the plate
      // (see the Edge dial's note — at 0 the ring sits at 1.20r, off it).
      edge: -24,
      rim: 0
    }
  },
  {
    id: "acrylic",
    label: "Acrylic",
    // Windows' DARK acrylic tints dark; this app's dark is the grimoire's
    rgb: "26, 20, 33",
    hint: "Windows: blur plus tint plus noise, which Microsoft's own docs call frosted glass. A scrim for transient surfaces. The noise is the one term these seven scrubs cannot carry",
    dials: {
      // 0.104r — which at 1280x800 IS the 22px frost this app rejected twice.
      // That is not a mistake in the preset, it is what the family is: the
      // research pass used Acrylic as its control group precisely because
      // blur-plus-tint frost is a named, intentional material.
      blur: 90,
      // no saturation lift in the recipe
      sat: -105,
      // no brightness multiply either: 1.00
      bright: 22,
      // a SCRIM. Microsoft scopes acrylic to transient, light-dismiss surfaces
      // and its exclusion-blend layer exists to guarantee legibility of the UI
      // sitting on it — so the tint is heavy, 0.80 on both phases.
      tintDark: 58,
      tintLit: 34,
      // no rim light in the family
      edge: 0,
      rim: -100
    }
  }
];

/** Geometry then material, in the order they are published and reset. */
export const FACE_DISC_ALL = FACE_DISC_DIALS.concat(FACE_DISC_MATERIAL);

const CSS_VAR = {
  x: "--fd-x-adj",
  y: "--fd-y-adj",
  r: "--fd-r-adj",
  // THE TWO SHAPE VARS. `--fd-width-adj` is an offset like every other length;
  // `--fd-radius` is the exception noted on the dial — it carries the resolved
  // border-radius, so at rest it publishes the literal `50%` the stylesheet's
  // own fallback already says.
  width: "--fd-width-adj",
  corner: "--fd-radius",
  band: "--fd-band-adj",
  head: "--fd-head-adj",
  foot: "--fd-foot-adj",
  blur: "--fd-blur-adj",
  sat: "--fd-sat-adj",
  bright: "--fd-bright-adj",
  // THE TINT PAIR IS READ ON #app, NOT ON A DISC — it is the one material value
  // whose base answers to a class (`#app.night`), so `face-disc-tint` in
  // faceDisc.scss composes these two into the single `--fd-tint` every disc
  // inherits. Published on <html> like all the others; #app is a descendant, so
  // it sees them.
  tintDark: "--fd-tint-dark-adj",
  tintLit: "--fd-tint-lit-adj",
  edge: "--fd-edge-adj",
  rim: "--fd-rim-adj"
};

/** Read the persisted offsets. Anything unreadable reads as zero, which is what
 *  ships — a broken storage entry must never be able to bend the app. */
export function readFaceDiscLab() {
  const out = {};
  FACE_DISC_ALL.forEach(d => {
    let v = 0;
    try {
      v = Number(localStorage.getItem(STORAGE[d.key]) || 0) || 0;
    } catch (e) {
      v = 0;
    }
    out[d.key] = Math.max(d.min, Math.min(d.max, v));
  });
  return out;
}

/** The persisted preset id. Anything unrecognised reads as "shipped", which is
 *  the same rule the dials follow: a broken storage entry must never be able to
 *  bend the app. */
export function readFaceDiscPreset() {
  let id = "";
  try {
    id = localStorage.getItem(PRESET_STORAGE) || "";
  } catch (e) {
    id = "";
  }
  return FACE_DISC_PRESETS.some(p => p.id === id) ? id : "shipped";
}

/** The preset's own record, always concrete. */
export function faceDiscPreset(id) {
  return FACE_DISC_PRESETS.find(p => p.id === id) || FACE_DISC_PRESETS[0];
}

/**
 * The TINT COLOUR, which is a preset's and not a scrub's — see
 * FACE_DISC_PRESETS. Published on <html> beside the dials; `faceDisc.scss`
 * reads it as `var(--fd-tint-rgb, 26, 20, 33)`, so the shipped preset and the
 * lab being absent are the same three numbers.
 */
export function publishFaceDiscPreset(id) {
  document.documentElement.style.setProperty(
    "--fd-tint-rgb",
    faceDiscPreset(id).rgb
  );
}

/**
 * Publish the whole set onto <html>, where all four discs — and #app, which
 * carries the tint pair — inherit it.
 *
 * ON <html> AND NOWHERE ELSE. Custom properties inherit DOWNWARD only, and the
 * four discs have no common ancestor closer than the document; publish on #app
 * instead and anything outside it (and `html, body`, which is what paints
 * outside a game) never sees them. That is the trap the first face lab fell
 * into, where the dials appeared to do nothing at all.
 *
 * The `unit` comes off the dial: geometry publishes lengths ("12px"), material
 * publishes bare numbers ("12"), because a filter term, an opacity and a
 * percentage-point offset are all <number> at the point the SCSS reads them.
 * A dial carrying its own `publish` writes a RESOLVED value instead — one does
 * (`corner`), for the reason written beside it.
 */
export function publishFaceDiscLab(state) {
  const root = document.documentElement.style;
  FACE_DISC_ALL.forEach(d => {
    const v = state[d.key] || 0;
    root.setProperty(CSS_VAR[d.key], d.publish ? d.publish(v) : v + d.unit);
  });
}

/**
 * The lab as a Vue mixin — the fork's own idiom for shared component behaviour
 * (`rightDrawer.js`, `bottomSheet.js`). One consumer today: FaceDiscLab.vue.
 */
export default {
  data() {
    return {
      fdLabOpen: false,
      // persisted, because a dialled value has to survive the reload it takes to
      // go and look at it again — the face lab's own lesson
      fdLab: readFaceDiscLab(),
      fdPreset: readFaceDiscPreset(),
      fdDials: FACE_DISC_DIALS,
      fdMaterial: FACE_DISC_MATERIAL,
      fdPresets: FACE_DISC_PRESETS
    };
  },
  computed: {
    /**
     * WHICH TINT IS LIVE RIGHT NOW. The two tint dials are both always on
     * screen, so the panel marks the one currently in effect rather than
     * leaving the user to work out which of the pair they just turned. Read off
     * the SAME store flag App.vue binds the `night` class from, so the mark
     * cannot disagree with the class the SCSS switches on.
     */
    fdIsNight() {
      return !!(
        this.$store &&
        this.$store.state.grimoire &&
        this.$store.state.grimoire.isNight
      );
    },
    /**
     * HAS THE PICK BEEN DIALLED AWAY FROM? A preset is a starting point, so the
     * seven scrubs stay live after one is chosen — which means the button that
     * looks selected can stop describing what is on screen. This is the panel's
     * way of saying so without un-selecting anything.
     */
    fdPresetEdited() {
      const p = faceDiscPreset(this.fdPreset);
      return FACE_DISC_MATERIAL.some(
        d => (this.fdLab[d.key] || 0) !== (p.dials[d.key] || 0)
      );
    }
  },
  mounted() {
    // A stored value has to reach the discs on load, not on first drag.
    publishFaceDiscLab(this.fdLab);
    publishFaceDiscPreset(this.fdPreset);
  },
  methods: {
    /**
     * Clamped against each dial's OWN declared bounds rather than a second copy
     * of the numbers, so the range documented beside a scrub is the range
     * actually enforced. NumberScrub clamps its own emissions too; two
     * independently-written clamps are two things that can disagree.
     */
    setFdLab(key, n) {
      const dial = FACE_DISC_ALL.find(d => d.key === key);
      if (!dial) return;
      const v = Math.max(dial.min, Math.min(dial.max, Number(n) || 0));
      this.$set(this.fdLab, key, v);
      publishFaceDiscLab(this.fdLab);
      try {
        localStorage.setItem(STORAGE[key], String(v));
      } catch (e) {
        // storage off: the dial still works for this session
      }
    },
    /**
     * SEED THE SEVEN MATERIAL SCRUBS FROM A FAMILY, and publish that family's
     * tint colour. Geometry is not touched — the two questions are separate,
     * and a person hunting a material has usually just finished placing the
     * plate.
     *
     * It goes through setFdLab like a drag would, so every value takes the same
     * clamp and the same persistence path. Nothing here can produce a value a
     * hand could not: the two ceilings that a preset needed (blur, brightness)
     * were RAISED on the dials rather than bypassed here, so the panel never
     * shows a number outside its own range.
     */
    applyFdPreset(id) {
      const p = faceDiscPreset(id);
      this.fdPreset = p.id;
      try {
        localStorage.setItem(PRESET_STORAGE, p.id);
      } catch (e) {
        // storage off: the pick still works for this session
      }
      publishFaceDiscPreset(p.id);
      FACE_DISC_MATERIAL.forEach(d => this.setFdLab(d.key, p.dials[d.key] || 0));
    },
    resetFdLab() {
      FACE_DISC_ALL.forEach(d => this.setFdLab(d.key, 0));
      this.applyFdPreset("shipped");
    }
  }
};
