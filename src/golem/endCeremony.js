/**
 * Golem fork (FT-1053): THE END-GAME CEREMONY — one sequencer, two dressings.
 *
 * When the town ends (the host's winner pick, arriving on every client as the
 * `endGame` commit — the host's own in App.vue, a player's off the gamestate
 * sync), the end is played as a SHOW before the settled state stands: a held
 * breath (the veil deepens, the clock hands spin wildly), the verdict (the
 * face shatters into a dark hole and tentacles rise for an evil win; dawn
 * breaks and the dead's ghosts ascend for a good win), then the settle —
 * which is EXACTLY the end state today's flow already reaches (TownInfo's
 * result pill, the grimoire reveal). Pure presentation: nothing in here
 * commits a mutation, touches the wire, or changes what a reload would show.
 *
 * WHO OWNS WHAT: this module owns the STATE MACHINE (phase + winner, as a
 * Vue.observable every consumer renders from), the TIMERS, the HANDS (the
 * spin rides the existing `--fh-angle` offset FaceHands' stylesheet already
 * composes into all three blades — no second rotation machinery), and the
 * SOUND (the tower's own bell clips, re-voiced). EndCeremony.vue owns the
 * visuals (veil, crack, shards, tentacles, rays, ghosts); App.vue's root
 * class binding carries the phase onto `#app` so seat-level CSS can dress
 * the ring.
 *
 * THE TRIGGER lives in EndCeremony.vue (a watch on session.isEnded), ARMED
 * only after this client has actually seen a live game (chat.gameId set with
 * the town not ended) — so a reload of an already-ended town, or a spectator
 * joining one, restores straight to the settled state and never replays the
 * show. An unmount mid-show (reload) leaves the settled state standing for
 * the same reason: the ceremony paints OVER the end state, it never delays
 * or replaces it.
 */
import Vue from "vue";
// the tower's own clips, re-voiced for the ceremony — no new audio assets.
// A DEDICATED element per voice, never the tower's own (mutating the shared
// bell elements' playbackRate would sour every later day-break).
import bellTwoSound from "../assets/bell-tolls-2.mp3";
// FT-1053c: ONE strike with its decay, cut from the tower's own source wav
// (design/bells/belltolls.wav) by claude_temp_test/2026-08-22-ft1053c-cut-
// toll.mjs — the shipped clips carry two strikes, and the good verdict rings
// once per ray. SINGLE_TOLL_SEC below is the cut's measured length; the ray
// animation is timed to it.
import singleTollSound from "../assets/bell-toll-single.mp3";

/** The spy event — the rig's proof that a sound was COMMANDED, on muted and
 *  autoplay-refused clients alike (the TOWER_BELL_EVENT idiom). detail:
 *  { beat: "toll" | "ray-toll" | "begin" | "skip" | "settle" | "reduced",
 *    winner, ... }. */
export const END_CEREMONY_EVENT = "golem:end-ceremony";

/** The timeline, in ms from the ceremony's start. One table so the component,
 *  the sequencer and the rig all read the same clock. Total unskipped run:
 *  breath + verdict + fade ≈ 9.1s (evil) / 8.9s (good). */
export const CEREMONY_T = {
  /** phase 1 — the held breath: veil in, UI quiets, the hands wind up. */
  breath: 1600,
  /** phase 2 — the verdict dressing plays (all inner delays are CSS,
   *  relative to the verdict phase mounting). Evil's is a FLOOR now: the
   *  procession (FT-1053b) stretches it with the size of the evil team —
   *  see evilProcession below. */
  verdictEvil: 6400,
  verdictGood: 6200,
  /** phase 3 — everything the ceremony painted fades; the settled end state
   *  (already rendered beneath) is what remains. */
  fade: 1100,
  /** a skip's fast fade — one click anywhere jumps here. */
  skipFade: 450,
};

/** The single toll's measured length (the FT-1053c cut: strike + decay,
 *  3.98s) — the good verdict's ray animation spans exactly this, so one
 *  bell ring IS one ray. */
export const SINGLE_TOLL_SEC = 3.98;

/**
 * FT-1053b: THE EVIL PROCESSION's clock. Every evil seat rises centre one at
 * a time (dead minions, living minions, the demon last), so the verdict
 * stretches with the team — but politely: the stagger shrinks as the team
 * grows, and verdictEvil above stays the floor. All numbers in seconds;
 * verdictMs is what the sequencer holds the verdict phase open for.
 */
export function evilProcession(count) {
  const n = Math.max(0, count);
  const start = 3.2; // after the shatter has opened the hole
  const entry = 2.2; // one figure's rise + hold + settle-aside
  const stagger = n > 1 ? Math.min(1.4, Math.max(0.75, 3 / (n - 1))) : 0;
  const total = n ? start + (n - 1) * stagger + entry : 0;
  return {
    start,
    stagger,
    entry,
    verdictMs: Math.max(
      CEREMONY_T.verdictEvil,
      Math.round((total + 0.7) * 1000),
    ),
  };
}

/**
 * FT-1053c: THE GOOD VERDICT's clock. One ray per good seat — alive first,
 * then the dead (whose rays hand off into their ghosts' ascent) — one toll
 * per ray, the ray's whole animation as long as the toll. The cadence
 * shrinks for big casts; overlapping the tail of toll N with ray N+1 is how
 * real bells behave. rayLand is when the beam reaches the seat (the reveal
 * moment), a fixed fraction of the toll-long sweep.
 */
export function goodSequence(count, anyDeadGood) {
  const n = Math.max(0, count);
  const start = 1.9; // after the dawn line has drawn itself
  const rayDur = SINGLE_TOLL_SEC;
  const rayLand = 1.2; // scaleY reaches the seat ~30% into the toll
  const ghostLag = 1.5; // strike, a beat, then the soul lifts
  const cadence = n > 1 ? Math.min(1.8, Math.max(1.1, 4.8 / (n - 1))) : 0;
  const lastRay = n ? start + (n - 1) * cadence : 0;
  const tail = anyDeadGood ? ghostLag + 2.9 : rayDur + 0.3;
  return {
    start,
    cadence,
    rayDur,
    rayLand,
    ghostLag,
    verdictMs: Math.max(
      CEREMONY_T.verdictGood,
      Math.round((lastRay + tail) * 1000),
    ),
  };
}

/**
 * The one piece of shared state. `phase` walks idle → breath → verdict →
 * fade → idle; `winner` is "good"/"evil" while the show runs. `holdHands` is
 * FaceHands' pause line: while true its tick() writes nothing, so the blades
 * stand exactly where the spin left them ("the hands stop dead").
 */
export const ceremonyState = Vue.observable({
  phase: "idle",
  winner: "",
  holdHands: false,
});

const spy = (beat, extra) => {
  try {
    window.dispatchEvent(
      new CustomEvent(END_CEREMONY_EVENT, {
        detail: { beat, winner: ceremonyState.winner, ...extra },
      }),
    );
  } catch (e) {
    // no CustomEvent — the show still plays, only the rig goes unsighted
  }
};

// ── the sequencer's private clockwork ────────────────────────────────────────
let timers = [];
let spinRaf = 0;
let ceremonyAudio = []; // every element this show started, stopped on settle
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const clearTimers = () => {
  timers.forEach(clearTimeout);
  timers = [];
};

/** The hands layer, if it stands (a client may show numerals only, or no
 *  dial at all — the ceremony survives its absence). */
const handsEl = () => document.getElementById("face-hands");

/**
 * THE SPIN — "time unravels". Driven through the machinery the hands already
 * have: `--fh-angle` is the lab's assembly-wide offset, composed into all
 * three blades by FaceHands' own stylesheet, so writing it spins the whole
 * arrangement rigidly with zero new rotation code. `ec-spin` kills the
 * stepped hands' snap transitions for the duration (a transition chasing a
 * per-frame value smears the blade — FaceHands' own Sweep-mode lesson).
 *
 * The curve is an ease-in wind-up: slow first turn, frantic by the breath's
 * end (~2.8 revolutions). Evil freezes it mid-flight (holdHands + the offset
 * left standing); good eases it home to a whole turn so the blades land back
 * on the true time.
 */
function spinStart() {
  const el = handsEl();
  if (!el) return;
  el.classList.add("ec-spin");
  const t0 = performance.now();
  const T = CEREMONY_T.breath;
  const step = () => {
    const t = Math.min(1, (performance.now() - t0) / T);
    const angle = 1000 * Math.pow(t, 2.6);
    el.style.setProperty("--fh-angle", angle.toFixed(1) + "deg");
    if (t < 1 && ceremonyState.phase === "breath") {
      spinRaf = requestAnimationFrame(step);
    } else {
      spinRaf = 0;
    }
  };
  spinRaf = requestAnimationFrame(step);
}

/** GOOD's landing: ease the offset from wherever the spin stands to the next
 *  whole turn, then hand the property back to the lab's own value. */
function spinSettle() {
  const el = handsEl();
  if (!el) return;
  const from = parseFloat(el.style.getPropertyValue("--fh-angle")) || 0;
  const to = Math.ceil(from / 360) * 360;
  const t0 = performance.now();
  const T = 900;
  const step = () => {
    const t = Math.min(1, (performance.now() - t0) / T);
    const eased = 1 - Math.pow(1 - t, 3);
    const angle = from + (to - from) * eased;
    if (t < 1) {
      el.style.setProperty("--fh-angle", angle.toFixed(1) + "deg");
      spinRaf = requestAnimationFrame(step);
    } else {
      spinRaf = 0;
      spinRelease();
    }
  };
  spinRaf = requestAnimationFrame(step);
}

/** Hands back to their own life: offset off while the snap transitions are
 *  still dead, THEN the class — so the return is a cut, not a 340ms rewind. */
function spinRelease() {
  const el = handsEl();
  if (spinRaf) cancelAnimationFrame(spinRaf);
  spinRaf = 0;
  ceremonyState.holdHands = false;
  if (!el) return;
  el.style.removeProperty("--fh-angle");
  requestAnimationFrame(() => {
    const e = handsEl();
    if (e) e.classList.remove("ec-spin");
  });
}

// ── the two voices ───────────────────────────────────────────────────────────

/** A ceremony-owned element: plays best-effort (an autoplay refusal costs
 *  the sound, never the show), registered for the settle's silence. */
function voice(src, { volume = 0.6, rate = 1, sour = false, stopAfter = 0 }) {
  const a = new Audio(src);
  a.preload = "auto";
  a.volume = Math.max(0, Math.min(1, volume));
  if (rate !== 1) {
    // preservesPitch OFF is what makes a slowed bell SOUR — deeper, wrong,
    // final — rather than merely slow. Both spellings for older WebKit.
    if (sour) {
      try {
        a.preservesPitch = false;
        a.webkitPreservesPitch = false;
      } catch (e) {
        // pitch preservation not settable — the slow toll still lands
      }
    }
    a.playbackRate = rate;
  }
  ceremonyAudio.push(a);
  const p = a.play();
  if (p && p.catch) p.catch(() => {});
  if (stopAfter) {
    // a short fade instead of a cliff — these clips run 12-17s
    later(() => {
      const fade = setInterval(() => {
        a.volume = Math.max(0, a.volume - 0.08);
        if (a.volume <= 0) {
          clearInterval(fade);
          a.pause();
        }
      }, 60);
      timers.push(fade);
    }, stopAfter);
  }
  return a;
}

/** EVIL: ONE low toll, then silence. Bell two slowed to 0.55 with pitch
 *  unpreserved — the sourer of the two clips at that rate — cut short. */
function tollEvil(isMuted) {
  spy("toll");
  if (isMuted) return;
  voice(bellTwoSound, {
    volume: 0.55,
    rate: 0.55,
    sour: true,
    stopAfter: 4200,
  });
}

/**
 * GOOD (FT-1053c): one toll per ray — the single-strike cut, played as each
 * beam leaves the dawn point, its decay spanning the beam's whole animation.
 * (This REPLACED the FT-1053 dawn-bells + per-ghost notes: the user's own
 * redesign — "play it once per light ray".) EndCeremony.vue schedules the
 * calls, because the ray delays are its geometry's to own.
 */
export function rayToll(index, isMuted) {
  spy("ray-toll", { index });
  if (isMuted) return;
  voice(singleTollSound, { volume: 0.5 });
}

/** Every voice this show started, silenced — the settle's and the skip's. */
function hushAll() {
  ceremonyAudio.forEach((a) => {
    try {
      a.pause();
    } catch (e) {
      // an element that never loaded has nothing to stop
    }
  });
  ceremonyAudio = [];
}

// ── the sequencer ────────────────────────────────────────────────────────────

/** Motion-reduced respect: the app's own kill-switch or the OS setting means
 *  no show at all — the settled state is already what renders. */
export function ceremonyAllowed(store) {
  if (store && store.state.grimoire.isStatic) return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return false;
    }
  } catch (e) {
    // no matchMedia — an old engine, let it play
  }
  return true;
}

/**
 * BEGIN. Called once per end by EndCeremony.vue's armed watcher, on every
 * client. Idempotent against a double fire (a show already running keeps
 * running).
 */
export function beginCeremony(
  winner,
  { isMuted = false, evilCount = 1, goodCount = 0, anyDeadGood = false } = {},
) {
  if (ceremonyState.phase !== "idle") return;
  ceremonyState.winner = winner === "evil" ? "evil" : "good";
  ceremonyState.phase = "breath";
  spy("begin");
  spinStart();
  later(() => {
    if (ceremonyState.phase !== "breath") return;
    ceremonyState.phase = "verdict";
    if (ceremonyState.winner === "evil") {
      // the hands stop DEAD mid-spin: the offset stands, tick() writes stop
      if (spinRaf) cancelAnimationFrame(spinRaf);
      spinRaf = 0;
      ceremonyState.holdHands = true;
      // the toll waits for the crack to land and the face to let go
      later(() => tollEvil(isMuted), 900);
    } else {
      // FT-1053c: no verdict-wide bells any more — each ray brings its own
      // toll (rayToll above, scheduled by the component with its beams)
      spinSettle();
    }
    // the verdict phase holds open for as long as ITS cast needs — the evil
    // procession and the good ray-walk both stretch with the team, floored
    // at the FT-1053 envelope (CEREMONY_T)
    const run =
      ceremonyState.winner === "evil"
        ? evilProcession(evilCount).verdictMs
        : goodSequence(goodCount, anyDeadGood).verdictMs;
    later(() => settle(CEREMONY_T.fade), run);
  }, CEREMONY_T.breath);
}

/** The last phase: everything the ceremony painted fades over `fadeMs`, the
 *  hands return to their own time, the voices hush, and idle follows. */
function settle(fadeMs) {
  if (ceremonyState.phase === "idle" || ceremonyState.phase === "fade") return;
  ceremonyState.phase = "fade";
  spy("settle");
  hushAll();
  spinRelease();
  later(() => {
    ceremonyState.phase = "idle";
    ceremonyState.winner = "";
  }, fadeMs);
}

/** ONE CLICK ANYWHERE — straight to the settled state, fast fade. */
export function skipCeremony() {
  if (ceremonyState.phase === "idle") return;
  spy("skip");
  clearTimers();
  settle(CEREMONY_T.skipFade);
}

/** Unmount mid-show (a reload, leaving the town): everything off, no fade —
 *  the settled state is what the next mount renders on its own. */
export function stopCeremony() {
  clearTimers();
  hushAll();
  spinRelease();
  ceremonyState.phase = "idle";
  ceremonyState.winner = "";
}
