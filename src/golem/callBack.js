/**
 * Golem fork (FT-880): CALL THE TOWN BACK — the sound half of the storyteller's
 * summons, and the half that can fail without anybody finding out.
 *
 * A browser refuses to let a page make a noise until somebody has interacted
 * with that page. Every player in a town HAS interacted — they followed a link
 * in, they claimed a chair — but the day is long and interaction credit is not
 * forever: a tab left untouched through twenty minutes of private conversation,
 * or one restored by a reload, can hold none at all. play() then rejects, and a
 * rejected promise nobody is awaiting is the quietest failure there is. The
 * storyteller believes they called the town back; one player simply never hears
 * it and gets blamed for wandering off.
 *
 * So this module is not "play a file". It is three things:
 *
 *  1. ONE ELEMENT, FOREVER. Autoplay credit is earned by an audio element, not
 *     by the page, so a fresh `new Audio()` per summons would throw the credit
 *     away every time and be refused on a tab that had already earned it. Every
 *     call-back this app ever plays goes through `element()` below.
 *  2. THE FIRST GESTURE IS SPENT ON THE UNLOCK. The moment the player touches
 *     anything at all we run a silent play()/pause() on that element — before
 *     there is anything to hear, so it costs nothing and buys everything. The
 *     listeners take themselves off once it works.
 *  3. A REFUSAL IS SAID OUT LOUD. When a play is refused anyway, `state.blocked`
 *     goes true and App.vue stands a notice up until the player taps it — the
 *     tap is itself a gesture, so it both explains the silence and ends it.
 *     Failing loudly is the entire point of the module.
 *
 * `state` is a plain object on purpose: App.vue drops it into data(), which is
 * how Vue 2 makes it reactive, and that is the same trick golem/titleFonts.js
 * and golem/iconStyle.js use for their own live panels.
 */
import callBackSound from "../assets/call-back.mp3";
// FT-1051: the summons can wear a storyteller-supplied voice. The CHOICE
// (callId/callUrl) lives on towerState — the town's synced, per-town-
// persisted sound config, the same shelf the day-start bell's custom source
// rides — and the element machinery is golem/customAudio's shared slot.
import { towerState } from "./towerBells";
import { makeCustomSlot } from "./customAudio";

/**
 * The nervous double-press guard. The clip is ~10s and there is only ever one
 * element, so a second press RESTARTS it rather than layering a second copy
 * over the first — overlap is impossible by construction. What this stops is
 * the restart itself: a summons chopped off at half a second and begun again
 * sounds like a fault, not like a bell.
 *
 * Five seconds: long enough to swallow a twitchy double-tap, short enough that
 * a storyteller whose first call went unheard is not left waiting on the UI.
 */
export const CALL_BACK_COOLDOWN = 5000;

/**
 * Live, and read by App.vue's template — see the note above about data().
 * `blocked` = the browser refused a play and the player has not cleared it.
 */
export const callBackState = { blocked: false };

/**
 * What counts as "the player is here". `keydown` earns its place because this
 * app is driven by single-letter hotkeys — on a desktop that may genuinely be
 * the first thing a player does.
 */
const GESTURES = ["pointerdown", "touchend", "keydown"];

let el = null;
let unlocked = false;
let listening = false;

/**
 * WHO OWNS THE ELEMENT RIGHT NOW. There is only one audio element (see above),
 * so the silent unlock and a real summons can be in flight over the same object
 * at the same time — and they routinely are, because the tap that unlocks a
 * blocked player is usually the very tap asking to hear the sound.
 *
 * Without this the two collide in the worst way: the unlock's tidy-up pauses
 * and re-mutes the element a beat after the real play started, killing it and
 * rejecting its promise with an AbortError, which reads exactly like a refusal.
 * The player's notice would come back and the sound would stop dead — the
 * silent failure this whole module exists to prevent, caused by the fix for it.
 *
 * Every operation takes a token. A later one outranks an earlier one: the
 * unlock declines to clean up if it no longer holds the element, and a play
 * that was superseded declines to report itself as refused.
 */
let opToken = 0;

/** FT-1051: the custom voice's one-element-per-URL slot — replaced only when
 *  the URL itself changes (the page's unlocked autoplay state carries over). */
const customCall = makeCustomSlot();

/** THE DEFAULT element. Created once; never replaced, or the credit goes
 *  with it. */
function defaultElement() {
  if (!el) {
    el = new Audio(callBackSound);
    el.preload = "auto";
  }
  return el;
}

/** THE element for the town's CURRENT choice — the default clip, or the
 *  custom voice when one is set (FT-1051). Custom with no URL resolves to
 *  the default, so no caller can ever hold a source-less summons. */
function element() {
  if (towerState.callId === "custom" && towerState.callUrl) {
    return customCall.get(towerState.callUrl);
  }
  return defaultElement();
}

/**
 * Spend a gesture on the unlock: a muted play, immediately paused and rewound.
 * Muted because this runs on an ordinary click somewhere else in the app — the
 * player has not asked to hear anything yet, and hearing the call-back fire
 * because you opened the grimoire would be worse than the silence it prevents.
 */
function unlock() {
  const a = element();
  const token = ++opToken;
  a.muted = true;
  const p = a.play();
  function settle(ok) {
    // Only tidy up if nothing else has claimed the element since — otherwise
    // this pause would be cutting off a real summons. See opToken.
    if (opToken === token) {
      a.pause();
      try {
        a.currentTime = 0;
      } catch (e) {
        // never loaded; nothing to rewind
      }
      a.muted = false;
    }
    if (!ok) return;
    unlocked = true;
    callBackState.blocked = false;
    stopListening();
  }
  if (p && p.then) {
    p.then(() => settle(true)).catch(() => settle(false));
  } else {
    // very old browsers hand back nothing; assume it worked and let a real
    // refusal be caught by playCallBack's own catch
    settle(true);
  }
}

function onGesture() {
  if (unlocked) return stopListening();
  unlock();
}

function stopListening() {
  if (!listening) return;
  listening = false;
  for (const evt of GESTURES) {
    window.removeEventListener(evt, onGesture, true);
  }
}

/**
 * Start watching for the first real gesture. Called once from App.mounted.
 *
 * Capture phase, on window: a click that some component swallows with
 * stopPropagation is still a gesture as far as the browser is concerned, and
 * missing it would leave a player who HAS been clicking around marked as
 * blocked.
 */
export function armCallBackAudio() {
  if (listening || unlocked) return;
  listening = true;
  for (const evt of GESTURES) {
    window.addEventListener(evt, onGesture, true);
  }
}

/**
 * Play the summons.
 *
 * @param isMuted the viewer's own Mute Sounds setting. Respected: a player who
 *   muted the app did so deliberately, usually because they are somewhere they
 *   cannot make noise, and a summons is not a reason to override that. A muted
 *   player is NOT marked blocked — nothing is broken, they turned it off.
 * @returns {Promise<boolean>} true when it actually played
 */
export function playCallBack(isMuted) {
  if (isMuted) return Promise.resolve(false);
  const a = element();
  return ringCall(a).then((status) => {
    // FT-1051: the custom SOURCE died — the summons falls back to the clip
    // that ships, so a rotted link never buys the town a silent call (its
    // whole job is being heard). Only on source failure: a policy refusal
    // would refuse the default identically, and a superseded play was
    // replaced, not broken.
    if (status === "failed" && a !== defaultElement()) {
      return ringCall(defaultElement()).then((second) => second === "ok");
    }
    return status === "ok";
  });
}

/**
 * One element commanded to play. Resolves "ok", "blocked" (a policy refusal
 * — recorded, the notice's trigger), "failed" (the SOURCE would not load or
 * decode — FT-1051's fallback reason), or "stale" (superseded by a later
 * operation; see opToken — neither refused nor fallen back on).
 */
function ringCall(a) {
  // A real summons outranks any silent unlock still in flight — it takes the
  // element, and undoes the mute that unlock may have just put on it. Without
  // this the confirming sound plays perfectly and inaudibly.
  const token = ++opToken;
  a.muted = false;
  // rewind rather than stack: one element per source means a second press
  // replaces the first play instead of doubling it
  try {
    a.currentTime = 0;
  } catch (e) {
    // an element that has never loaded throws on seek; play() will start it
  }
  let p;
  try {
    p = a.play();
  } catch (e) {
    return Promise.resolve("failed");
  }
  if (!p || !p.then) {
    callBackState.blocked = false;
    return Promise.resolve("ok");
  }
  return p
    .then(() => {
      unlocked = true;
      callBackState.blocked = false;
      stopListening();
      return "ok";
    })
    .catch((err) => {
      // A play that something else has already superseded was ABORTED, not
      // refused — reporting it as refused would stand the notice back up in
      // front of a player whose sound is working.
      if (opToken !== token) return "stale";
      const name = (err && err.name) || "";
      if (name === "NotSupportedError" || name === "AbortError") {
        return "failed";
      }
      // THE FAILURE THIS MODULE EXISTS FOR. Nothing is thrown, nothing is
      // logged anywhere a player would look — so it is written down here, and
      // App.vue turns it into something they can see and act on.
      callBackState.blocked = true;
      return "blocked";
    });
}

/** Is the build panel auditioning the summons right now? A FLAG, not just
 *  `!a.paused` — the first preview click is usually also the page's first
 *  gesture, so the silent unlock's muted play is IN FLIGHT on this very
 *  element when the toggle reads it, and paused-alone would misread that as
 *  "already sounding" and stop a preview that never started (the same trap
 *  the bell row's previewingId guards; caught by the FT-1051 rig). */
let callPreviewing = false;

/**
 * FT-1051: the build panel's source buttons preview the summons — clicking
 * plays the CURRENT choice locally, clicking again while it still sounds
 * STOPS it (the same stop-over-restart call the bell row made: the second
 * click almost always means "enough"). Local-only; nothing travels.
 */
export function toggleCallBackPreview(isMuted) {
  const a = element();
  if (callPreviewing && !a.paused && !a.ended) {
    stopCallBackPreview();
    return Promise.resolve(false);
  }
  stopCallBackPreview();
  callPreviewing = true;
  return playCallBack(isMuted);
}

/** Both possible voices silenced — the default's element and the custom slot. */
export function stopCallBackPreview() {
  callPreviewing = false;
  const d = defaultElement();
  if (!d.paused) {
    d.pause();
    try {
      d.currentTime = 0;
    } catch (e) {
      // never loaded; nothing to rewind
    }
  }
  customCall.stop();
}

/**
 * The notice's own tap. Called from a click handler, so the gesture is live in
 * this very call stack and the play is allowed — which is why this plays the
 * sound FOR REAL rather than silently: the player asked why they heard nothing,
 * and the honest answer is to let them hear it.
 */
export function enableCallBackSound(isMuted) {
  unlocked = true;
  stopListening();
  return playCallBack(isMuted);
}
