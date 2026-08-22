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
import bellOneSound from "../assets/bell-tolls.mp3";
import bellTwoSound from "../assets/bell-tolls-2.mp3";
import { towerState, previewBell, stopBellPreview } from "./towerBells";

/** The spy event — the rig's proof that a sound was COMMANDED, on muted and
 *  autoplay-refused clients alike (the TOWER_BELL_EVENT idiom). detail:
 *  { beat: "toll" | "dawn-bells" | "ghost-note" | "begin" | "skip" | "settle"
 *    | "reduced", winner, ... }. */
export const END_CEREMONY_EVENT = "golem:end-ceremony";

/** The timeline, in ms from the ceremony's start. One table so the component,
 *  the sequencer and the rig all read the same clock. Total unskipped run:
 *  breath + verdict + fade ≈ 9.1s (evil) / 8.9s (good). */
export const CEREMONY_T = {
  /** phase 1 — the held breath: veil in, UI quiets, the hands wind up. */
  breath: 1600,
  /** phase 2 — the verdict dressing plays (all inner delays are CSS,
   *  relative to the verdict phase mounting). */
  verdictEvil: 6400,
  verdictGood: 6200,
  /** phase 3 — everything the ceremony painted fades; the settled end state
   *  (already rendered beneath) is what remains. */
  fade: 1100,
  /** a skip's fast fade — one click anywhere jumps here. */
  skipFade: 450,
};

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

/** GOOD: the town's own day-break bells — the storyteller's pick at the
 *  town's volume, through the tower's own play path (fallbacks included). */
function bellsGood(isMuted) {
  spy("dawn-bells");
  previewBell(towerState.bellId, towerState.bellVolume, isMuted);
}

/** One soft note as a ghost lifts — bell one, brightened and brief. */
export function ghostNote(index, isMuted) {
  spy("ghost-note", { index });
  if (isMuted) return;
  voice(bellOneSound, { volume: 0.14, rate: 1.5, stopAfter: 1600 });
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
  stopBellPreview();
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
export function beginCeremony(winner, { isMuted = false } = {}) {
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
      spinSettle();
      later(() => bellsGood(isMuted), 300);
    }
    const run =
      ceremonyState.winner === "evil"
        ? CEREMONY_T.verdictEvil
        : CEREMONY_T.verdictGood;
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
