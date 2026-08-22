/**
 * Golem fork (FT-1051): CUSTOM AUDIO — the machinery a storyteller-supplied
 * sound needs, shared by everything that offers one.
 *
 * FT-1045 built this for the day-start bell; FT-1051 gives the call-back the
 * same treatment, and the shared half lives here so it is one helper serving
 * both rather than a copy: the URL sanitizer (what may ride the sync at
 * all), the probe (does this link actually hold playable audio), the upload
 * (a file becomes a platform-served URL), and the one-element-per-URL slot
 * (autoplay credit belongs to an element — see golem/callBack.js's header
 * for the full FT-880 reasoning — so a custom source keeps ONE element until
 * its URL changes, and only a NEW link earns a new element).
 *
 * What does NOT live here: cooldowns, volume, fallback choices, sync — those
 * are each consumer's own policy (towerBells.js for the bells, callBack.js
 * for the summons).
 */

/**
 * A link, or nothing. Only http(s) and same-origin paths pass — a
 * javascript: or data: URL arriving off the wire dies here (data: is also
 * barred by size: audio data-URLs would ride every sync).
 */
export function sanitizeAudioUrl(value) {
  if (typeof value !== "string") return "";
  const s = value.trim().slice(0, 1024);
  if (!s) return "";
  return /^https?:\/\//i.test(s) || s.charAt(0) === "/" ? s : "";
}

/**
 * Does this link actually hold audio the browser can play? Loads it into a
 * throwaway element (no sound) and answers within 10 seconds. The source
 * rows' quiet failure state shows on false.
 */
export function probeAudioUrl(url) {
  return new Promise((resolve) => {
    const clean = sanitizeAudioUrl(url);
    if (!clean) return resolve(false);
    let a;
    try {
      a = new Audio();
    } catch (e) {
      return resolve(false);
    }
    let done = false;
    const settle = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      a.oncanplay = null;
      a.onerror = null;
      resolve(ok);
    };
    const timer = setTimeout(() => settle(false), 10 * 1000);
    a.oncanplay = () => settle(true);
    a.onerror = () => settle(false);
    a.preload = "auto";
    a.src = clean;
    a.load();
  });
}

/**
 * Push a sound file to the platform's asset store and return the
 * same-origin URL it will be served from — POST /api/assets/upload, the
 * multipart endpoint every experience shares (10MB cap, audio validated by
 * magic bytes server-side). "unlisted" because the URL is handed out by the
 * town's own sync, not by a gallery. Throws a message fit for a quiet
 * failure state; the platform requires a login for uploads in every
 * environment, so 401 gets the honest wording.
 *
 * @param file the picked File
 * @param kind the asset kind tag ("botc_bell", "botc_call", …)
 */
export async function uploadAudioFile(file, kind) {
  const body = new FormData();
  body.append("file", file, file.name || "sound");
  body.append("kind", kind);
  body.append("visibility", "unlisted");
  const res = await fetch("/api/assets/upload", { method: "POST", body });
  if (res.status === 401)
    throw new Error(
      "Uploading needs a golem-studios.com login — a link works without one",
    );
  if (res.status === 413) throw new Error("Too big — 10MB is the cap");
  if (res.status === 415) throw new Error("That file is not audio");
  if (!res.ok) throw new Error(`The upload failed (${res.status})`);
  const data = await res.json();
  const url = data && data.asset && data.asset.url;
  if (!url) throw new Error("The upload came back without an address");
  return url;
}

/**
 * ONE element per custom URL — replaced only when the URL itself changes
 * (real rot or a real re-pick; the page's unlocked autoplay state carries
 * over). `get(url)` hands back the element for that source; `stop()`
 * silences whatever the slot currently holds.
 */
export function makeCustomSlot() {
  let el = null;
  let src = "";
  return {
    get(url) {
      if (!el || src !== url) {
        el = new Audio(url);
        el.preload = "auto";
        src = url;
      }
      return el;
    },
    /** The element currently held, or null — for "is it this one playing". */
    current() {
      return el;
    },
    stop() {
      if (!el || el.paused) return;
      el.pause();
      try {
        el.currentTime = 0;
      } catch (e) {
        // never loaded; nothing to rewind
      }
    },
  };
}
