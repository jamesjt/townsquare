// Golem fork (FT-888): THE FACE-DISC LAB — TEMPORARY, DELETE ME.
//
// Six scrubs that nudge the geometry of EVERY menu on the clock face — the
// night checklist, the Host and Join entry panels, the build panel — so a value
// can be found by EYE and then baked into `src/faceDisc.scss`, at which point
// this file, `src/components/FaceDiscLab.vue`, its one line in App.vue and the
// six `var(--fd-*-adj)` reads in the partial all come out together.
//
// WHY IT LIVES HERE and not inside a component. It started inside NightSheet,
// which meant two things that were both wrong:
//   · its dials moved ONE of the four discs, so the other three drifted;
//   · it only existed at night, on a storyteller's screen, with the checklist
//     open — so it could not be found during the day at all (user report).
// The disc is a thing this app HAS, so its lab belongs to the app.
//
// EVERY SCRUB IS AN OFFSET, never a replacement — zero is exactly what ships,
// in all six — so Reset is a real return and not an approximation of one.
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
const STORAGE = {
  x: "golem.fdX",
  y: "golem.fdY",
  r: "golem.fdR",
  band: "golem.fdBand",
  head: "golem.fdHead",
  foot: "golem.fdFoot"
};

/**
 * THE SIX SCRUBS, and the reasoning behind every bound. All measured at
 * 1280x800 — the TIGHTEST viewport the disc runs at, since its gate floors at
 * 1000x780 — so a bound that holds there holds everywhere the disc appears. At
 * that size the face gives r = 211.6px: band 344.7px wide, 245.4px tall, each
 * cap 88.9px.
 *
 * THE CAPS ARE WHAT BUY THE BAND ITS WIDTH, so the band width is the thing that
 * must not be strangled, and it is guarded in TWO places, because R and W are
 * two scrubs against one quantity and their bounds compound:
 *   · here, per scrub, so neither alone does anything silly;
 *   · and in faceDisc.scss, as a `max()` FLOOR on the computed band
 *     ($face-disc-band-floor, 265px) — the only bound that holds whatever the
 *     two do BETWEEN them.
 *
 * Hd and Ft cannot touch the band at all — they are transforms, and a transform
 * takes no part in layout — so those two are bounded by the RIM instead, at
 * values read off the sweep rather than reasoned about.
 */
export const FACE_DISC_DIALS = [
  {
    key: "x",
    label: "X",
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
    label: "Y",
    min: -60,
    max: 60,
    hint: "Disc centre down (positive) or up, from the clock face's centre"
  },
  {
    key: "r",
    label: "R",
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
    key: "band",
    label: "W",
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
    label: "Hd",
    // NEGATIVE IS UP. The header rides the bottom of the top cap and moves by
    // transform, so the band never shifts and the content width is untouched
    // whatever this does — only the rim binds it. SWEPT at 1280x800 (the binding
    // viewport), clearance from the rim measured at the header content's worst
    // corner, on top of the -9px bake: 0 -> 10.5px, -4 -> 7.3, -8 -> 4.0,
    // -12 -> 0.7, -16 -> -2.7. So -16 is deliberately ONE NOTCH PAST the edge:
    // the failure is reachable and visible rather than theoretical, which is
    // what a dial meant for finding a value by eye is for.
    // DOWN to +24: further and it laps the band's first row.
    min: -16,
    max: 24,
    hint: "Header up (negative) or down, from where it now sits in the top cap"
  },
  {
    key: "foot",
    label: "Ft",
    // POSITIVE IS DOWN, toward the bottom pole, where the arc closes on a button
    // that is 0.95r wide. Same sweep, same viewport, on top of the +6px bake:
    // -10 -> 11.2px, 0 -> 4.9, +4 -> 1.3, +8 -> -2.2. +8 is again one notch past
    // the edge; +4 is the last safe value. -24 lifts it back up toward the band.
    min: -24,
    max: 8,
    hint: "Primary button down (positive) or up, from where it now sits"
  }
];

const CSS_VAR = {
  x: "--fd-x-adj",
  y: "--fd-y-adj",
  r: "--fd-r-adj",
  band: "--fd-band-adj",
  head: "--fd-head-adj",
  foot: "--fd-foot-adj"
};

/** Read the persisted offsets. Anything unreadable reads as zero, which is what
 *  ships — a broken storage entry must never be able to bend the app. */
export function readFaceDiscLab() {
  const out = {};
  FACE_DISC_DIALS.forEach(d => {
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

/** Publish the whole set onto <html>, where all four discs inherit it. */
export function publishFaceDiscLab(state) {
  const root = document.documentElement.style;
  FACE_DISC_DIALS.forEach(d => {
    root.setProperty(CSS_VAR[d.key], (state[d.key] || 0) + "px");
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
      fdDials: FACE_DISC_DIALS
    };
  },
  mounted() {
    // A stored value has to reach the discs on load, not on first drag.
    publishFaceDiscLab(this.fdLab);
  },
  methods: {
    /**
     * Clamped against each dial's OWN declared bounds rather than a second copy
     * of the numbers, so the range documented beside a scrub is the range
     * actually enforced. NumberScrub clamps its own emissions too; two
     * independently-written clamps are two things that can disagree.
     */
    setFdLab(key, px) {
      const dial = FACE_DISC_DIALS.find(d => d.key === key);
      if (!dial) return;
      const v = Math.max(dial.min, Math.min(dial.max, Number(px) || 0));
      this.$set(this.fdLab, key, v);
      publishFaceDiscLab(this.fdLab);
      try {
        localStorage.setItem(STORAGE[key], String(v));
      } catch (e) {
        // storage off: the dial still works for this session
      }
    },
    resetFdLab() {
      FACE_DISC_DIALS.forEach(d => this.setFdLab(d.key, 0));
    }
  }
};
