// Golem fork (FT-888): THE FACE-DISC LAB — TEMPORARY, DELETE ME.
//
// Fourteen scrubs — EIGHT GEOMETRY, SIX MATERIAL — plus a four-way GLASS
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
// in all fourteen — so Reset is a real return and not an approximation of one.
// (ONE EXCEPTION, declared where it lives: `corner` publishes a RESOLVED
// percentage rather than an offset, because `calc(50% + 0%)` is not the string
// `50%` and an offset there would make "zero equals shipped" true in pixels and
// false in the computed value an acceptance rig reads. See the dial.)
// For the material half that invariant is the load-bearing one: the lab sits in
// the shipped bundle, so if a zero-scrub were even slightly not the shipped
// material, the lab's mere PRESENCE would have re-tuned the glass for everyone.
//
// THE GEOMETRY EIGHT ARE NOW PER SURFACE (third bake, 2026-08-19). "The disc on
// the entry screen and the disc inside a town are no longer the same shape"
// (user) — so there are two plates, each with its own eight stored values, and
// the panel shows ONE column that drives whichever plate is on screen, named at
// the top of the group. The glass is unchanged in that respect: one material,
// shared, because that is what was asked for.
//
// AND THE GLASS WENT THE OTHER WAY IN THE SAME ROUND. It carried a Night tint
// and a Lit tint, switched by `#app.night`; "remove the night tint entirely,
// night should be the same as set up" (user) collapsed the pair into a single
// Tint. So the panel gained a per-surface geometry column and LOST a per-phase
// material one, which is less symmetrical than it sounds: shape is a thing you
// judge against the surface it sits on, and the material is now simply one
// material.
//
// TWO ROUNDS HAVE NOW BEEN BAKED (both 2026-08-19):
//   1st  X -12, Y -13, R -10, W 0, Hd -16, Ft +8 — folded into faceDisc.scss's
//        base expressions, and the six storage keys below bumped to their "2"
//        set in the same commit.
//   2nd  a further X -1, Y -2 on top, so the SCSS then read -13 / -15. NO key
//        bump this time, and the reason is the first bake rather than luck:
//        after a bake the lab reads ZERO at the shipped position, so what a
//        browser holds under the fd*2 keys is "0", and folding another -1/-2
//        into the base on top of a stored zero is still just that -1/-2.
//   3rd  the two-geometry round, and the GLASS with it: entry X 2 / Y 3 / R 7 /
//        W 17 / Hd 5, town X -3 / Y -4 / R 9 / W 18 / Hd 5, and one shared
//        material dialled off the Glassmorphism preset (Blur -6, Sat -105,
//        Bright -44, Rim -100, plus that preset's WHITE tint colour).
//
//        AND THE TINT PAIR COLLAPSED INTO ONE DIAL in the same round — "remove
//        the night tint entirely, night should be the same as set up" (user) —
//        so the value baked is the one SETUP wore, which is the Lit tint -46
//        they dialled, and it resolves to NO TINT AT ALL.
//
//        EVERY KEY BUMPED — the geometry eight by changing name to their
//        per-surface pair, the tint pair by becoming one renamed key, the rest
//        of the material and the preset key by taking a "2" — because this bake
//        begins from a browser holding the dialled set, which is exactly the
//        state the rule below is about.
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
// THE MATERIAL KEYS BELOW ARE NEW, so they carry no suffix: there is no
// browser anywhere holding a value under them and therefore nothing for a first
// bake of the glass to apply twice. The bump rule above governs them from their
// FIRST bake onward, exactly as written — a key bump is owed whenever a
// non-zero stored value would survive into a changed base.
//
// THE TWO SHAPE KEYS AND THE PRESET KEY BELOW ARE NEW (FT-888 width/corner pass)
// and carry no suffix for the same reason the material seven did not: no browser
// anywhere holds a value under them, so there is nothing for a first bake to
// apply twice. The bump rule above governs them from their first bake onward.
//
// ── THIRD BAKE, AND EVERY ONE OF THEM IS BUMPED ────────────────────────────
// This is the round the rule was written for. The browser being baked FROM is
// holding the user's DIALLED set — Horizontal 2, Radius 7, Lit tint -46, Rim
// -100 and the rest — not zeros, so a non-zero stored value would survive into a
// changed base on every single dial. Bake without bumping and the entry disc
// lands another 2px right of where it was dialled, the tint dial reads -46
// against a base that is already zero (clamped back to zero, so silently doing
// nothing the user could see) and the rim does the same.
//
// THE GEOMETRY KEYS CHANGE NAME RATHER THAN GAINING A DIGIT, and that falls out
// of the split rather than being a choice: the geometry dial is now PER SURFACE,
// so `golem.fdX2` becomes `golem.fdEntryX` and `golem.fdTownX` — two keys where
// there was one, neither of which any browser has ever written. A rename is the
// strongest form of a bump.
//
// THE MATERIAL SEVEN AND THE PRESET KEY TAKE THE "2" SUFFIX, the same way the
// geometry six did at the first bake. They are one set, not two: the glass is
// shared between the plates, so there is nothing per-surface about them.
const GEO_STORAGE = {
  entry: {
    x: "golem.fdEntryX",
    y: "golem.fdEntryY",
    r: "golem.fdEntryR",
    width: "golem.fdEntryWidth",
    corner: "golem.fdEntryCorner",
    band: "golem.fdEntryBand",
    head: "golem.fdEntryHead",
    foot: "golem.fdEntryFoot"
  },
  town: {
    x: "golem.fdTownX",
    y: "golem.fdTownY",
    r: "golem.fdTownR",
    width: "golem.fdTownWidth",
    corner: "golem.fdTownCorner",
    band: "golem.fdTownBand",
    head: "golem.fdTownHead",
    foot: "golem.fdTownFoot"
  }
};

// THE TINT PAIR IS ONE KEY NOW (user, 2026-08-19: "remove the night tint
// entirely, night should be the same as set up"). `golem.fdTintDark` and
// `golem.fdTintLit` are LEFT IN PLACE in storage and never read again — the same
// treatment every superseded key in this file has had, because there is nothing
// to gain by clearing them and a cleanup pass that touches a user's localStorage
// is a worse habit than a stale key. `golem.fdTint2` has never been written by
// any browser, so the rename is its own bump.
const MAT_STORAGE = {
  blur: "golem.fdBlur2",
  sat: "golem.fdSat2",
  bright: "golem.fdBright2",
  tint: "golem.fdTint2",
  edge: "golem.fdEdge2",
  rim: "golem.fdRim2"
};

/** The glass preset the dials were last seeded from. Not a dial — see
 *  FACE_DISC_PRESETS. Bumped with the material seven: the "shipped" preset now
 *  names a different material, so a browser holding "glassmorphism" under the
 *  old key would be describing a pick it never made. */
const PRESET_STORAGE = "golem.fdPreset2";

/**
 * THE TWO PLATES — the surfaces whose geometry is now separate.
 *
 * "The disc on the entry screen and the disc inside a town are no longer the
 * same shape" (user, 2026-08-19). `faceDisc.scss` carries a geometry map per
 * surface; this is the list the LAB drives them from.
 *
 * WHICH ONE IS ON SCREEN IS A STORE QUESTION, and it has an exact answer rather
 * than a guess: App.vue's centre slot is one v-if chain, and `<Intro>` — the
 * Host and Join panels — wins it only when there is no session AND no seats.
 * The night checklist needs seats; the build panel needs a session. So the two
 * families CANNOT coexist, which is what makes "the dials move whichever surface
 * is on screen" a well-formed thing to ask for.
 */
export const FACE_DISC_SURFACES = [
  {
    id: "entry",
    label: "entry panels",
    hint: "The Host and Join panels on the front door — a lit dial, no session"
  },
  {
    id: "town",
    label: "in town",
    hint: "The night checklist and the build panel — inside a session"
  }
];

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
 *
 * ── EIGHT DIALS, TWO PLATES (2026-08-19) ────────────────────────────────────
 * This is now ONE ROW PER DIAL that edits WHICHEVER SURFACE IS ON SCREEN, with
 * its own stored value per surface — the same idea the tint pair has carried
 * since the glass-clear pass, arranged the other way round. The tint shows both
 * numbers at once and marks the live one, because a person choosing a tint is
 * choosing a PAIR and needs to see both. A person placing a plate is placing
 * THAT plate: the other one is not on screen to be judged against, so a second
 * column of eight would be eight numbers nobody can currently see the effect of.
 * So the panel shows one column and says, at the top, which plate it is moving.
 *
 * THE BOUNDS ARE UNCHANGED BY THE SPLIT, and unchanged by the bake, for the
 * reason the first bake gave: each is a DISTANCE TO DRAG, not a position. What a
 * bake moves is the origin they count from. (The material bounds below are a
 * different case — there the bounds ARE the clamp — and those did have to move.)
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
 * THE SIX MATERIAL SCRUBS — the glass, not the geometry. (Seven until the
 * third bake collapsed the Night tint / Lit tint pair into one Tint.)
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
 *
 * ── AND THE BOUNDS MOVED WITH THE THIRD BAKE, WHICH THE GEOMETRY'S DID NOT ──
 * The geometry bounds are distances to drag and survive a bake untouched. These
 * are not: for five of the seven the bound IS THE CLAMP — an opacity outside
 * 0..1, a negative blur, a saturation below its own floor — and the SCSS leans
 * on that rather than clamping again. Bake a new base under an unchanged bound
 * and the dial can publish an illegal value; a negative `blur()` does not dim
 * the glass, it invalidates the whole `backdrop-filter` and deletes it.
 *
 * SO EVERY BOUND BELOW WAS RE-DERIVED TO KEEP ITS OWN ABSOLUTE RANGE. Same
 * material reachable at each end as before the bake, counted from the new base:
 *
 *              base before -> after     range before        range after
 *   blur          0.014      0.008      0.000 .. 0.104r     -8 .. +96
 *   sat            2.05       1.00       1.00 .. 3.00        0 .. +200
 *   bright         0.78       0.34       0.30 .. 1.50       -4 .. +116
 *   tint           0.46*      0.00       0.00 .. 1.00        0 .. +100
 *     * the pair's LIT constant. The NIGHT one (0.22) and its own dial are
 *       gone entirely — one tint now, every surface, every phase.
 *   edge            85%        85%         40% .. 93%      -45 .. +8  (unmoved)
 *   rim            1.00       0.00       0.00 .. 1.00        0 .. +100
 *
 * TWO OF THEM NOW ONLY GO ONE WAY, and both are honest rather than crippled:
 * the tint and the rim are baked AT ZERO, and there is nothing below zero for
 * either to reach. Rim in particular has flipped direction — it ran downward
 * from full strength for three passes because the search was "how much less
 * painted light", and that search has now ended at none.
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
    //
    // RE-DERIVED AT THE THIRD BAKE: the base is 0.008r now, so -8 is the same
    // perfectly-clear floor and +96 the same 0.104r Acrylic frost.
    min: -8,
    max: 96,
    hint: "Blur, in thousandths of the disc radius (0 = the baked 0.008r; -8 = perfectly clear)"
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
    //
    // RE-DERIVED AT THE THIRD BAKE, and this dial is now AT ITS OWN FLOOR: the
    // user took it to -105, i.e. saturate(1.0), so the base IS the floor and the
    // range only goes up. The colour lift three passes called the glass cue is
    // no longer part of this material — what shows through is the dial's own
    // bronze, undoctored.
    min: 0,
    max: 200,
    hint: "Saturation of what shows through, in hundredths (0 = the baked 1.00 — no lift at all)"
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
    //
    // RE-DERIVED AT THE THIRD BAKE: the base is 0.34 now, so -4 is the same
    // near-black 0.30 floor and +116 the same Liquid Glass 1.50 ceiling. With
    // the lit tint baked at zero this term is the ONLY thing calming the entry
    // dial, so it is doing more work than it has in any previous pass.
    min: -4,
    max: 116,
    hint: "Brightness multiply on what shows through, in hundredths (0 = the baked 0.34)"
  },
  {
    key: "tint",
    label: "Tint",
    unit: "",
    // THE VEIL, in hundredths, on every surface and in every phase.
    //
    // ── IT WAS TWO DIALS UNTIL THE THIRD BAKE ────────────────────────────────
    // "Remove the night tint entirely. Night should be the same as set up."
    // (user, 2026-08-19.) There were a Night tint and a Lit tint, against two
    // constants the SCSS switched between on `#app.night`, with the live one
    // marked in the panel so the user could see which of the PAIR they were
    // turning. All of that is gone: one constant, one dial, no mark.
    //
    // THE ARGUMENT FOR THE PAIR WAS MEASURED AND IT WAS NOT WRONG, which is
    // worth recording rather than quietly dropping — the four discs really do
    // not stand on the same backdrop, and ground luminance under the plate runs
    // 0.029 at night against 0.098 on the lit entry dial, a three-and-a-half-fold
    // difference. It is simply no longer a difference this material answers.
    //
    // THE BAKED VALUE IS ZERO, which is what the user's Lit tint -46 resolved to
    // against its 0.46 base — no veil at all, on any surface. So the bound only
    // goes UP: 0 / +100 is exactly 0.00 .. 1.00, and the bound IS the clamp
    // because --fd-tint is an opacity.
    //
    // WHAT ZERO COSTS was measured rather than argued (the leak rig, both
    // plates) and reported instead of corrected: with the ramp off, the whole
    // job of calming what shows through falls to `brightness(0.34)`.
    min: 0,
    max: 100,
    hint: "Tint — the veil over the dial, in hundredths (0 = the baked 0.00, no veil at all)"
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
    // IT USED TO ONLY GO DOWN, from a base of 1.00, and that was honest: the six
    // rgba stops on that layer are AUTHORED at the peak the last pass chose, so
    // "more" would have meant re-authoring six literals — and opacity clamps at
    // 1 regardless. The search ran downward because the last two passes were
    // both rejected for painting TOO MUCH light.
    //
    // ── THAT SEARCH HAS ENDED, AT NONE (third bake, Rim -100) ───────────────
    // The layer is baked at opacity 0 and the dial now runs UPWARD from it,
    // 0 .. +100, reaching exactly the same full strength it always did. Zero is
    // still what ships; what ships is simply the other end now.
    //
    // AND IT MAKES NO VISIBLE DIFFERENCE AT THE SHIPPED EDGE, which is measured
    // rather than assumed — see the Edge dial above. At Edge 0 the mask does not
    // open until 1.20r, outside the circle the border-radius clips to, so this
    // layer was already painting nothing on the plate. Turning it off is exact.
    // The pair is still the only way to reach a rim light at all: bring Edge in
    // to about -24 AND raise this.
    min: 0,
    max: 100,
    hint: "Rim + specular strength, in hundredths (0 = the baked none; +100 = full strength — needs Edge about -24 to be visible at all)"
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
 * PICKING ONE SEEDS THE SIX MATERIAL SCRUBS AND NOTHING ELSE — geometry is
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
 * ── EVERY DIAL VALUE BELOW WAS RE-DERIVED AT THE THIRD BAKE ────────────────
 * A preset is a set of OFFSETS, so a bake moves what each one lands on. Left
 * alone through this bake, Glassmorphism's `blur: 36` would have meant 0.044r
 * instead of the 0.050r the family actually uses, and Liquid Glass's `rim: 0`
 * would have meant no rim light at all — the one preset whose whole point is a
 * rim. So each was recomputed as (the absolute value the family calls for) minus
 * (the new base), and the material each button produces is unchanged from
 * yesterday. That recomputation is owed at EVERY bake, and it is the second half
 * of the rule the storage keys carry the first half of.
 *
 * "SHIPPED" IS THE NEW MATERIAL, obviously but worth saying: all seven zeros,
 * and its tint colour is now WHITE, because the material this app ships was
 * dialled from the Glassmorphism preset and a preset's colour is part of what
 * was chosen. Two buttons therefore carry the same triplet and different alphas,
 * which is what they are: Shipped is that family, tuned.
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
    // WHITE now, off the third bake — see the block above. It was the grimoire's
    // cool purple-black (26, 20, 33) for three passes.
    rgb: "255, 255, 255",
    hint: "The material this app ships: blur 0.008r, no saturation lift, brightness 0.34, WHITE tint at 0.86 at night / none on a lit dial, no painted rim",
    dials: {
      blur: 0,
      sat: 0,
      bright: 0,
      tint: 0,
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
      // 0.008 + 42/1000 = 0.050r — ~10px at 1280x800, which is where the
      // trend's own recipes sit
      blur: 42,
      // saturate(180%), the pairing every "frosted nav bar" recipe carries
      sat: 80,
      // no brightness term in the family at all: 1.00
      bright: 66,
      // rgba(255,255,255,0.25), the trend's canonical wash. The family never
      // had an adaptive tint, so collapsing the pair cost this preset nothing —
      // it carried 0.25 on both phases already.
      tint: 25,
      // its edge is a 1px light border, which this material already carries in
      // its box-shadow. So the PAINTED layer stays at nothing rather than being
      // given a rim the family does not have — which is the baked state now, so
      // both of these are zero.
      edge: 0,
      rim: 0
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
      blur: 12,
      // LogRocket cranks saturation extremely hard but composites it into the
      // RIM only, never across the pane. Across the pane, then: 1.00 — which is
      // the baked base, so this is zero now rather than -105.
      sat: 0,
      // brightness(150%) — the sign flip that makes this family what it is
      bright: 116,
      // 15% — again the same on both phases before the pair collapsed
      tint: 15,
      // THE RIM LIGHT, and the only preset that asks for one. -24 is measured:
      // it puts the mask's ramp at 0.87r -> 0.99r, i.e. actually on the plate
      // (see the Edge dial's note — at 0 the ring sits at 1.20r, off it). The
      // strength has to be asked for explicitly now that the painted layer is
      // baked OFF: +100 is the full authored peak this family wants.
      edge: -24,
      rim: 100
    }
  },
  {
    id: "acrylic",
    label: "Acrylic",
    // Windows' DARK acrylic tints dark; this app's dark is the grimoire's
    rgb: "26, 20, 33",
    hint: "Windows: blur plus tint plus noise, which Microsoft's own docs call frosted glass. A scrim for transient surfaces. The noise is the one term these scrubs cannot carry",
    dials: {
      // 0.104r — which at 1280x800 IS the 22px frost this app rejected twice.
      // That is not a mistake in the preset, it is what the family is: the
      // research pass used Acrylic as its control group precisely because
      // blur-plus-tint frost is a named, intentional material.
      blur: 96,
      // no saturation lift in the recipe — the baked base, so zero
      sat: 0,
      // no brightness multiply either: 1.00
      bright: 66,
      // a SCRIM. Microsoft scopes acrylic to transient, light-dismiss surfaces
      // and its exclusion-blend layer exists to guarantee legibility of the UI
      // sitting on it — so the tint is heavy: 0.80.
      tint: 80,
      // no rim light in the family — which is the baked state, so zero
      edge: 0,
      rim: 0
    }
  }
];

/** Geometry then material, in the order they are published and reset. */
export const FACE_DISC_ALL = FACE_DISC_DIALS.concat(FACE_DISC_MATERIAL);

/**
 * THE GEOMETRY VARS ARE NAMESPACED BY SURFACE, the material ones are not — which
 * is the split, expressed in property names.
 *
 * `--fd-entry-x-adj` and `--fd-town-x-adj` are different properties, so BOTH SETS
 * ARE PUBLISHED AT ALL TIMES and the two plates cannot reach each other. The
 * alternative — one set of names, republished whenever the surface changes —
 * would have made the stylesheet depend on the lab noticing a phase change, and
 * a missed notice there is a disc silently wearing the other plate's numbers.
 * Publishing both costs eight extra custom properties on <html>.
 *
 * The tail is the same for both: the eight names below, with `corner` the
 * exception noted on its dial — it carries the RESOLVED border-radius, so at rest
 * it publishes the literal `50%` the stylesheet's own fallback already says.
 */
const GEO_VAR = {
  x: "x-adj",
  y: "y-adj",
  r: "r-adj",
  width: "width-adj",
  corner: "radius",
  band: "band-adj",
  head: "head-adj",
  foot: "foot-adj"
};

/** `--fd-entry-x-adj`, `--fd-town-radius`, and so on. */
export function faceDiscGeoVar(surface, key) {
  return "--fd-" + surface + "-" + GEO_VAR[key];
}

const MAT_VAR = {
  blur: "--fd-blur-adj",
  sat: "--fd-sat-adj",
  bright: "--fd-bright-adj",
  // THE TINT IS READ ON #app, NOT ON A DISC. It used to be the one material
  // value whose base answered to a class (`#app.night`), which is why
  // `face-disc-tint` composes it into a single `--fd-tint` every disc inherits
  // rather than each disc reading this directly. The class is gone and the
  // composition stays: one declaration, one place, every disc downstream of it.
  // Published on <html> like all the others; #app is a descendant, so it sees
  // it.
  tint: "--fd-tint-adj",
  edge: "--fd-edge-adj",
  rim: "--fd-rim-adj"
};

const clamp = (dial, v) =>
  Math.max(dial.min, Math.min(dial.max, Number(v) || 0));

/**
 * Read the persisted offsets. Anything unreadable reads as zero, which is what
 * ships — a broken storage entry must never be able to bend the app.
 *
 * THE SHAPE IS `{ geo: { entry, town }, mat }`, because that is what the storage
 * is: eight dials twice over for the two plates, seven once for the glass they
 * share.
 */
export function readFaceDiscLab() {
  const read = (dial, storageKey) => {
    let v = 0;
    try {
      v = Number(localStorage.getItem(storageKey) || 0) || 0;
    } catch (e) {
      v = 0;
    }
    return clamp(dial, v);
  };
  const geo = {};
  FACE_DISC_SURFACES.forEach(s => {
    geo[s.id] = {};
    FACE_DISC_DIALS.forEach(d => {
      geo[s.id][d.key] = read(d, GEO_STORAGE[s.id][d.key]);
    });
  });
  const mat = {};
  FACE_DISC_MATERIAL.forEach(d => {
    mat[d.key] = read(d, MAT_STORAGE[d.key]);
  });
  return { geo, mat };
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
 * reads it as `var(--fd-tint-rgb, 255, 255, 255)`, so the shipped preset and the
 * lab being absent are the same three numbers. (That fallback was the grimoire's
 * 26, 20, 33 until the third bake took the material to a white tint.)
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
 *
 * BOTH GEOMETRY SETS GO OUT EVERY TIME, not just the live surface's — see
 * GEO_VAR. The plate that is off screen reads its own properties and is
 * unaffected by the one being dialled.
 */
export function publishFaceDiscLab(state) {
  const root = document.documentElement.style;
  const write = (name, dial, v) =>
    root.setProperty(name, dial.publish ? dial.publish(v) : v + dial.unit);
  FACE_DISC_SURFACES.forEach(s => {
    FACE_DISC_DIALS.forEach(d => {
      write(faceDiscGeoVar(s.id, d.key), d, (state.geo[s.id] || {})[d.key] || 0);
    });
  });
  FACE_DISC_MATERIAL.forEach(d => {
    write(MAT_VAR[d.key], d, state.mat[d.key] || 0);
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
     * WHICH PLATE IS ON SCREEN RIGHT NOW — the reason the eight geometry dials
     * can be one column instead of two.
     *
     * THERE WAS AN `fdIsNight` BESIDE THIS until the third bake, answering the
     * same shape of question for the tint pair: which of the two veils is in
     * effect, so the panel could mark it. There is one tint now and no phase in
     * the material, so the mark had nothing left to say and both came out.
     *
     * IT IS THE SAME CONDITION APP.VUE'S OWN v-if CHAIN USES, read off the store
     * rather than off the DOM: `<Intro>` — the Host and Join panels — wins the
     * centre slot only when there is no session AND no seats. The checklist
     * needs seats and the build panel needs a session, so the two families
     * cannot both be standing, and this cannot be ambiguous.
     *
     * A missing store answers "town", which is the default the SCSS mixin takes
     * — the panel and the stylesheet agree about which one is the default even
     * when there is nothing to ask.
     */
    fdSurface() {
      const s = this.$store && this.$store.state;
      if (!s) return "town";
      const sessionless = !(s.session && s.session.sessionId);
      const seatless = !(s.players && s.players.players.length);
      return sessionless && seatless ? "entry" : "town";
    },
    /** That surface's own record, for the panel's heading. */
    fdSurfaceLabel() {
      const s = FACE_DISC_SURFACES.find(x => x.id === this.fdSurface);
      return s ? s.label : "";
    },
    /**
     * HAS THE PICK BEEN DIALLED AWAY FROM? A preset is a starting point, so the
     * six scrubs stay live after one is chosen — which means the button that
     * looks selected can stop describing what is on screen. This is the panel's
     * way of saying so without un-selecting anything.
     */
    fdPresetEdited() {
      const p = faceDiscPreset(this.fdPreset);
      return FACE_DISC_MATERIAL.some(
        d => (this.fdLab.mat[d.key] || 0) !== (p.dials[d.key] || 0)
      );
    }
  },
  mounted() {
    // A stored value has to reach the discs on load, not on first drag.
    publishFaceDiscLab(this.fdLab);
    publishFaceDiscPreset(this.fdPreset);
  },
  methods: {
    /** Is this a geometry dial (per surface) or a material one (shared)? */
    fdIsGeo(key) {
      return FACE_DISC_DIALS.some(d => d.key === key);
    },
    /**
     * THE VALUE THE PANEL SHOWS FOR A DIAL. A geometry dial answers for the
     * plate currently on screen, which is what makes one column of eight able to
     * drive two plates; a material dial has one value and answers with it.
     */
    fdValue(key, surface) {
      return this.fdIsGeo(key)
        ? this.fdLab.geo[surface || this.fdSurface][key] || 0
        : this.fdLab.mat[key] || 0;
    },
    /**
     * Clamped against each dial's OWN declared bounds rather than a second copy
     * of the numbers, so the range documented beside a scrub is the range
     * actually enforced. NumberScrub clamps its own emissions too; two
     * independently-written clamps are two things that can disagree.
     *
     * A GEOMETRY DIAL WRITES TO THE LIVE SURFACE unless one is named. `surface`
     * is there for Reset, which has to zero the plate that is NOT on screen too.
     */
    setFdLab(key, n, surface) {
      const dial = FACE_DISC_ALL.find(d => d.key === key);
      if (!dial) return;
      const v = Math.max(dial.min, Math.min(dial.max, Number(n) || 0));
      const geo = this.fdIsGeo(key);
      const surf = geo ? surface || this.fdSurface : null;
      if (geo) this.$set(this.fdLab.geo[surf], key, v);
      else this.$set(this.fdLab.mat, key, v);
      publishFaceDiscLab(this.fdLab);
      try {
        localStorage.setItem(
          geo ? GEO_STORAGE[surf][key] : MAT_STORAGE[key],
          String(v)
        );
      } catch (e) {
        // storage off: the dial still works for this session
      }
    },
    /**
     * SEED THE SIX MATERIAL SCRUBS FROM A FAMILY, and publish that family's
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
    /**
     * BOTH PLATES, not just the one on screen. Reset means "back to what
     * ships", and half a return is worse than none: leave the other surface's
     * eight sitting on a dialled value and the next time it comes up it is
     * wearing numbers nobody chose in this session.
     */
    resetFdLab() {
      FACE_DISC_SURFACES.forEach(s =>
        FACE_DISC_DIALS.forEach(d => this.setFdLab(d.key, 0, s.id))
      );
      FACE_DISC_MATERIAL.forEach(d => this.setFdLab(d.key, 0));
      this.applyFdPreset("shipped");
    }
  }
};
