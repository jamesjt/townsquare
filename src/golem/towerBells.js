/**
 * Golem fork (FT-1020): THE TOWER — its bell, and the choices that shape it.
 *
 * The clock face the town plays on is a tower's dial, and this module is the
 * tower's own state: how the hour is displayed, whether the hands tick or
 * sweep, and the bell that tolls when a day begins. The HANDS themselves stay
 * in faceHands.js — this file owns the town-level CHOICES and the AUDIO.
 *
 * ── WHO DECIDES WHAT ─────────────────────────────────────────────────────────
 * The STORYTELLER owns the town's tower: the Tower rows on the build panel
 * (HostTools.vue) write `towerState`, it is persisted per town (below), and it
 * rides the full gamestate sync every joining or reconnecting client already
 * receives — never a new frame kind (socket.js sends `towerSyncPayload()`,
 * applies `applyTowerSync()`).
 *
 * A PLAYER may still choose their own hour DISPLAY — the anchor numeral on the
 * dial (FaceHands.vue) opens the same four modes. That pick is local to the
 * browser and wins over the town's synced default on that screen only; the
 * bell is the town's and has no per-player half beyond the existing Mute
 * Sounds setting, which is always respected.
 *
 * ── PERSISTENCE: PER TOWN, LOCALLY ───────────────────────────────────────────
 * The storyteller's tower is stored under `golem.tower.<townId>` — one entry
 * per town, so Ravenswood's bell does not follow you to Gallowsgate. The
 * owned-town server row (FT-847) carries only {name, scriptId} today, so the
 * server has no shelf for this yet; when it grows one, `loadTowerForTown` /
 * `saveTowerForTown` are the two functions that change and nothing else moves.
 *
 * ── THE AUDIO IS THE FT-880 IDIOM ────────────────────────────────────────────
 * callBack.js's hard-won rules apply unchanged: ONE element per sound forever
 * (autoplay credit belongs to the element, not the page), the first gesture is
 * spent on a silent unlock, and a refusal is recorded rather than swallowed.
 * See that module's header for the full reasoning; this one repeats the
 * mechanics, not the essay.
 */

import bellOneSound from "../assets/bell-tolls.mp3";
import bellTwoSound from "../assets/bell-tolls-2.mp3";

/** The two bells the user cut for the tower (FT-979 trimmed and faded them;
 *  the full-length originals live in design/bells/), plus CUSTOM (FT-1045):
 *  a storyteller-supplied sound, addressed by URL. Custom has no `src` of its
 *  own — its source is `towerState.bellUrl`, synced with the rest of the
 *  tower so every player's client can reach the same sound. */
export const TOWER_BELLS = [
  { id: "one", label: "Bell one", short: "One", src: bellOneSound },
  // FT-1048 (user): bell two's clip runs to its literal last sample (the
  // FT-979 analysis), so it ends on a cliff — fadeTail eases its final
  // seconds at runtime instead of re-cutting the asset.
  { id: "two", label: "Bell two", short: "Two", src: bellTwoSound, fadeTail: 3 },
  { id: "custom", label: "A sound of your own", short: "Custom", src: "" },
];

/**
 * The four ways the tower can show the hour — the anchor numeral's menu and
 * the build panel's segment both read this one table.
 */
export const HOUR_MODES = [
  {
    id: "off",
    label: "Off",
    hint: "No hands, no numerals — the bare dial. The anchor numeral stays, or there would be no way back",
  },
  {
    id: "clock",
    label: "Clock",
    hint: "The analog hands, as the tower ships",
  },
  {
    id: "digital",
    label: "Digital",
    hint: "A small readout of the game's moment — which day or night, and how long it has run — in the hands' place",
  },
  {
    id: "numerals",
    label: "Show numerals",
    // the build panel's segment cell — "Show numerals" is menu wording, and
    // four cells wide the row has no room for a sentence
    short: "Numerals",
    hint: "The hands, with the dial's twelve numerals standing on their tick rays",
  },
];

const HOUR_MODE_IDS = HOUR_MODES.map((m) => m.id);

/** What ships. `minuteTick` true is the FT-1020 change itself — the hands
 *  step now; Sweep on the build panel is the old glide, kept reachable. */
export const DEFAULT_TOWER = {
  hourMode: "clock",
  minuteTick: true,
  bellOn: true,
  bellId: "one",
  bellVolume: 80,
  // FT-1045: the custom bell's source — "" until the storyteller sets one.
  // A key of DEFAULT_TOWER, so it persists per town and rides the sync with
  // no further plumbing (both walk these keys).
  bellUrl: "",
};

/** The volume dial's bounds, in percent — 0 is silent, 100 is the clip as cut. */
export const BELL_VOLUME_MIN = 0;
export const BELL_VOLUME_MAX = 100;

/**
 * Two day-flips inside this window ring ONCE. A genuine dawn is minutes from
 * the next; only a mis-click's immediate undo/redo (or a resync race) can
 * arrive faster, and neither of those is a second morning.
 */
export const BELL_COOLDOWN_MS = 4000;

/** The tower changed — FaceHands and the build panel re-read. Same one-way
 *  storage-is-the-single-copy idiom as FACE_HANDS_EVENT (faceHands.js). */
export const TOWER_EVENT = "golem:tower";

/**
 * Fired at the moment a bell is COMMANDED (after the on/off and cooldown
 * gates, before the browser answers). Carries {bellId, volume, muted} in
 * `detail`. This is the proof rig's spy — audio "worked" must be assertable
 * by event, not by ear — and a future surface that wants to flash the dial
 * on a toll can ride it too.
 */
export const TOWER_BELL_EVENT = "golem:tower-bell";

/**
 * THE TOWN'S TOWER as this client currently knows it. On the storyteller's
 * browser this is their own (per-town persisted) choice; on a player's it is
 * whatever the host's last full sync said. Read through the exports below,
 * written only by setTowerField / applyTowerSync / loadTowerForTown.
 */
export const towerState = { ...DEFAULT_TOWER };

const TOWN_STORAGE_PREFIX = "golem.tower.";
const VIEWER_STORAGE = "golem.towerHourMode";

/** A refused bell, said out loud — the FT-880 rule. Surfaced nowhere yet
 *  (the call-back's notice is App.vue's, out of this lane); recorded so a
 *  later pass can stand the same notice up without re-plumbing. */
export const towerBellState = { blocked: false };

function notifyTower() {
  try {
    window.dispatchEvent(new CustomEvent(TOWER_EVENT));
  } catch (e) {
    // no CustomEvent (or no window): the choice still lands on next reload
  }
}

/** Clamp + validate one field against the tables above — a broken storage
 *  entry or a malformed sync must never bend the tower. */
function sanitize(key, value) {
  switch (key) {
    case "hourMode":
      return HOUR_MODE_IDS.indexOf(value) > -1 ? value : DEFAULT_TOWER.hourMode;
    case "minuteTick":
    case "bellOn":
      return !!value;
    case "bellId":
      return TOWER_BELLS.some((b) => b.id === value)
        ? value
        : DEFAULT_TOWER.bellId;
    case "bellVolume": {
      const n = Math.round(Number(value));
      if (!isFinite(n)) return DEFAULT_TOWER.bellVolume;
      return Math.max(BELL_VOLUME_MIN, Math.min(BELL_VOLUME_MAX, n));
    }
    case "bellUrl": {
      // FT-1045: a link, or nothing. Only http(s) and same-origin paths pass
      // — a javascript: or data: URL arriving off the wire dies here (data:
      // is also barred by size: audio data-URLs would ride every sync).
      if (typeof value !== "string") return DEFAULT_TOWER.bellUrl;
      const s = value.trim().slice(0, 1024);
      if (!s) return "";
      return /^https?:\/\//i.test(s) || s.charAt(0) === "/"
        ? s
        : DEFAULT_TOWER.bellUrl;
    }
    default:
      return undefined;
  }
}

/** The stored tower for a town, merged over the defaults. */
function readTowerForTown(townId) {
  const out = { ...DEFAULT_TOWER };
  if (!townId) return out;
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(TOWN_STORAGE_PREFIX + townId));
  } catch (e) {
    raw = null;
  }
  if (raw && typeof raw === "object") {
    Object.keys(DEFAULT_TOWER).forEach((key) => {
      if (key in raw) out[key] = sanitize(key, raw[key]);
    });
  }
  return out;
}

/**
 * The STORYTELLER's boot: stand this town's remembered tower up. Called from
 * both surfaces that can be the first to need it — HostTools (building) and
 * FaceHands (a host reloading mid-game) — and idempotent, so the order they
 * mount in never matters.
 */
export function loadTowerForTown(townId) {
  Object.assign(towerState, readTowerForTown(townId));
  notifyTower();
}

function saveTowerForTown(townId) {
  if (!townId) return;
  try {
    localStorage.setItem(
      TOWN_STORAGE_PREFIX + townId,
      JSON.stringify(towerState),
    );
  } catch (e) {
    // storage off: the choice still works for this session
  }
}

/** One host-side write: validate, remember for this town, tell the surfaces. */
export function setTowerField(townId, key, value) {
  const clean = sanitize(key, value);
  if (clean === undefined) return;
  towerState[key] = clean;
  saveTowerForTown(townId);
  notifyTower();
}

/** What rides the full gamestate sync — the whole tower, it is five fields. */
export function towerSyncPayload() {
  return { ...towerState };
}

/** A synced tower arriving on a player's client. Every field is sanitized —
 *  the wire is just another storage this module refuses to trust. */
export function applyTowerSync(data) {
  if (!data || typeof data !== "object") return;
  Object.keys(DEFAULT_TOWER).forEach((key) => {
    if (key in data) towerState[key] = sanitize(key, data[key]);
  });
  notifyTower();
}

/** The viewer's own display pick ("" = follow the town). */
function readViewerHourMode() {
  try {
    const id = localStorage.getItem(VIEWER_STORAGE) || "";
    return HOUR_MODE_IDS.indexOf(id) > -1 ? id : "";
  } catch (e) {
    return "";
  }
}

let viewerHourMode = readViewerHourMode();

/** A player's local pick from the dial's anchor menu. Persisted per browser,
 *  not per town — it is about this screen, not that place. */
export function setViewerHourMode(id) {
  viewerHourMode = HOUR_MODE_IDS.indexOf(id) > -1 ? id : "";
  try {
    localStorage.setItem(VIEWER_STORAGE, viewerHourMode);
  } catch (e) {
    // storage off: the pick still works for this session
  }
  notifyTower();
}

/**
 * The mode THIS screen shows.
 *
 * A PLAYER's screen: their own pick when they have made one, the town's
 * otherwise. A STORYTELLER's screen: the town's mode, always — their pick IS
 * the town's, made through the same menu.
 *
 * THE SESSION PARAMETER IS THE FT-1020c FIX. The viewer override is stored
 * per BROWSER (see setViewerHourMode), and a browser that ever picked a mode
 * as a player — the same person joining their own town from a second tab is
 * enough — carried that pick forever. Unparametrised, this function let that
 * stale override shadow the host's fresh town pick on the host's own screen:
 * the storyteller clicked Off, `towerState.hourMode` and the per-town storage
 * both said off, and the hands stayed up because `viewerHourMode` still said
 * clock. The split mirrors chooseHourMode's exactly: whoever's pick would
 * WRITE the town's mode reads the town's mode back.
 */
export function effectiveHourMode(session) {
  if (session && !session.isSpectator) return towerState.hourMode;
  return viewerHourMode || towerState.hourMode;
}

/**
 * One of the four modes picked from the hourglass menu (FT-1020b — the
 * strip's Tower tab in Menu.vue; it stood on the dial as the XII anchor for
 * one revision). The STORYTELLER's pick is the town's — persisted per town
 * and ridden out on the next full sync, the same write the build panel's
 * segment makes; a PLAYER's is their own screen's override. One function so
 * every surface that offers the menu carries the same split.
 */
export function chooseHourMode(session, id) {
  if (session && !session.isSpectator) {
    setTowerField(session.sessionId || "", "hourMode", id);
  } else {
    setViewerHourMode(id);
  }
}

/* ── THE BELL ITSELF — the FT-880 mechanics, applied to two clips ──────────── */

const GESTURES = ["pointerdown", "touchend", "keydown"];

const els = {};
let unlocked = false;
let listening = false;
let opToken = 0;
let lastRangAt = 0;
/** FT-1045: which URL els.custom was built for — the one exception to
 *  "one element forever": a NEW custom link earns a new element (the old
 *  one's autoplay credit transfers with the page's unlocked state). */
let customSrc = "";

/** THE elements — one per bell, forever (credit belongs to the element).
 *  CUSTOM (FT-1045) resolves through towerState.bellUrl; custom with no URL
 *  set resolves to bell one, so no caller can ever hold a source-less bell. */
function element(bellId) {
  const bell = TOWER_BELLS.find((b) => b.id === bellId) || TOWER_BELLS[0];
  if (bell.id === "custom") {
    const url = towerState.bellUrl;
    if (!url) return element(TOWER_BELLS[0].id);
    if (!els.custom || customSrc !== url) {
      els.custom = new Audio(url);
      els.custom.preload = "auto";
      customSrc = url;
    }
    return els.custom;
  }
  if (!els[bell.id]) {
    els[bell.id] = new Audio(bell.src);
    els[bell.id].preload = "auto";
  }
  return els[bell.id];
}

/** Spend a gesture on a muted play()/pause() of the CHOSEN bell — the same
 *  silent unlock callBack.js runs, minus its essay. */
function unlock() {
  const a = element(towerState.bellId);
  const token = ++opToken;
  a.muted = true;
  const p = a.play();
  function settle(ok) {
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
    towerBellState.blocked = false;
    stopListening();
  }
  if (p && p.then) {
    p.then(() => settle(true)).catch(() => settle(false));
  } else {
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

/** Start watching for the first gesture. Called from FaceHands' mount —
 *  every client in a town stands the dial up, so every client arms. */
export function armTowerAudio() {
  if (listening || unlocked) return;
  listening = true;
  for (const evt of GESTURES) {
    window.addEventListener(evt, onGesture, true);
  }
}

/**
 * One element commanded to play, volume applied. Resolves "ok", "blocked"
 * (a policy refusal — the FT-880 record), or "failed" (the SOURCE would not
 * load or decode — a rotted link, a 404, a page that is not audio). The
 * split exists for FT-1045's fallback: a policy refusal would refuse any
 * bell, but a dead source deserves a second try on a bell that ships.
 */
// FT-1048: a runtime fade for clips that end on a cliff — as the clip enters
// its last `tailSeconds`, the element's volume ramps linearly to zero, and
// re-arming (any later ring) restores it. timeupdate's ~4Hz steps are enough
// here: the tail rides audio that is already decaying.
function armFadeTail(a, baseVolume, tailSeconds) {
  if (a.golemFadeHandler) {
    a.removeEventListener("timeupdate", a.golemFadeHandler);
    a.golemFadeHandler = null;
  }
  if (!tailSeconds) return;
  const handler = () => {
    const d = a.duration;
    if (!d || !isFinite(d)) return;
    const left = d - a.currentTime;
    if (left <= tailSeconds) {
      a.volume = Math.max(0, baseVolume * (left / tailSeconds));
    } else if (a.volume !== baseVolume) {
      a.volume = baseVolume;
    }
  };
  a.golemFadeHandler = handler;
  a.addEventListener("timeupdate", handler);
}

function ringElement(a, volume, fadeTail) {
  const token = ++opToken;
  a.muted = false;
  a.volume = Math.max(BELL_VOLUME_MIN, Math.min(BELL_VOLUME_MAX, volume)) / 100;
  armFadeTail(a, a.volume, fadeTail);
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
    towerBellState.blocked = false;
    return Promise.resolve("ok");
  }
  return p
    .then(() => {
      unlocked = true;
      towerBellState.blocked = false;
      stopListening();
      return "ok";
    })
    .catch((err) => {
      if (opToken !== token) return "failed";
      const name = (err && err.name) || "";
      if (name === "NotSupportedError" || name === "AbortError") {
        return "failed";
      }
      towerBellState.blocked = true;
      return "blocked";
    });
}

/** One real play of one bell, volume applied, refusal recorded. */
function play(bellId, volume, isMuted) {
  try {
    window.dispatchEvent(
      new CustomEvent(TOWER_BELL_EVENT, {
        detail: { bellId, volume, muted: !!isMuted },
      }),
    );
  } catch (e) {
    // no CustomEvent: the bell still rings, only the spy goes unheard
  }
  if (isMuted) return Promise.resolve(false);
  const a = element(bellId);
  const def = TOWER_BELLS.find((b) => b.id === bellId);
  return ringElement(a, volume, def && def.fadeTail).then((status) => {
    // FT-1045: the custom SOURCE died — fall back to bell one, so a rotted
    // link never buys the town a silent day. Only on source failure (see
    // ringElement); and only when custom actually resolved to its own
    // element (custom with no URL already resolved to bell one above).
    if (status === "failed" && bellId === "custom" && a === els.custom) {
      return ringElement(element(TOWER_BELLS[0].id), volume).then(
        (second) => second === "ok",
      );
    }
    return status === "ok";
  });
}

/**
 * DAY BREAKS — the town's bell. Called by FaceHands on every client (host and
 * player alike) when the phase turns night→day; each screen rings its own
 * bell, so no wire traffic exists beyond the phase flip that already syncs.
 *
 * @param isMuted the viewer's Mute Sounds setting — a muted player chose
 *   silence and the bell respects it (the spy event still fires, so a rig can
 *   prove the CALL happened on a muted client too).
 */
export function ringDayStart(isMuted) {
  if (!towerState.bellOn) return Promise.resolve(false);
  const now = Date.now();
  if (now - lastRangAt < BELL_COOLDOWN_MS) return Promise.resolve(false);
  lastRangAt = now;
  return play(towerState.bellId, towerState.bellVolume, isMuted);
}

/**
 * The build panel's listen button — hear the pick before the town does.
 * A direct gesture, so no cooldown: a storyteller comparing the two bells
 * back-to-back is exactly the use this exists for.
 */
export function previewBell(bellId, volume, isMuted) {
  return play(bellId, volume, isMuted);
}

/** Which bell the build panel is currently auditioning (its id), or "". */
let previewingId = "";

/** Every bell element silenced — one bell at a time is the row's rule. */
export function stopBellPreview() {
  previewingId = "";
  Object.keys(els).forEach((id) => {
    const a = els[id];
    if (!a || a.paused) return;
    a.pause();
    try {
      a.currentTime = 0;
    } catch (e) {
      // never loaded; nothing to rewind
    }
  });
}

/**
 * FT-1045: the bell buttons themselves preview. Clicking a bell plays it at
 * the row's volume; clicking the SAME bell while it still tolls STOPS it —
 * stop over restart, because these clips run 12-17 seconds and the second
 * click almost always means "enough". A different bell mid-toll switches to
 * it. Local-only, like every preview: play() never touches the wire.
 */
export function toggleBellPreview(bellId, volume, isMuted) {
  const a = element(bellId);
  if (previewingId === bellId && !a.paused && !a.ended) {
    stopBellPreview();
    return Promise.resolve(false);
  }
  stopBellPreview();
  previewingId = bellId;
  return play(bellId, volume, isMuted);
}

/**
 * FT-1045: does this link actually hold audio the browser can play? Loads
 * it into a throwaway element (metadata only reaches the network, no sound)
 * and answers within 10 seconds. The row's URL field shows its quiet
 * failure state on false.
 */
export function probeBellUrl(url) {
  return new Promise((resolve) => {
    const clean = sanitize("bellUrl", url);
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
 * FT-1045: push a sound file to the platform's asset store and return the
 * same-origin URL it will be served from — POST /api/assets/upload, the
 * multipart endpoint every experience shares (10MB cap, audio validated by
 * magic bytes server-side). "unlisted" because the URL is handed out by the
 * tower sync, not by a gallery. Throws a message fit for the row's quiet
 * failure state; the platform requires a login for uploads in every
 * environment, so 401 gets the honest wording.
 */
export async function uploadBellFile(file) {
  const body = new FormData();
  body.append("file", file, file.name || "bell");
  body.append("kind", "botc_bell");
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
