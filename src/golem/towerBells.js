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
// FT-1051: the shared custom-audio machinery (sanitizer + one-element-per-URL
// slot) — one helper serving the bell and the call-back, not a copy.
import { sanitizeAudioUrl, makeCustomSlot } from "./customAudio";

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
 * FT-1052 (user): the hour display is THREE INDEPENDENT LAYERS, not a radio
 * — hands, digital readout, and the numeral ring each toggle on their own,
 * any combination legal. "Off" is DERIVED: checked exactly when none of the
 * three are on, and clicking it turns all three off. The Timer menu and the
 * build panel's segment both read this one table; both surfaces render
 * HOUR_OFF ahead of it.
 *
 * Labels are the user's (the FT-1052 rider): the analog hands toggle reads
 * "Hands" — clearer for what it toggles than "Clock" — and the ring is plain
 * "Numerals", matching its siblings. Internal ids keep the original names
 * (clock/digital/numerals) so storage, sync and the flag keys stay put.
 */
export const HOUR_LAYERS = [
  {
    id: "clock",
    label: "Hands",
    hint: "The analog hands, as the tower ships",
  },
  {
    id: "digital",
    label: "Digital",
    hint: "A small readout of the game's moment — which day or night, and how long it has run",
  },
  {
    id: "numerals",
    label: "Numerals",
    hint: "The dial's twelve numerals standing on their tick rays",
  },
];

/** The derived all-off row both surfaces put ahead of the three layers. */
export const HOUR_OFF = {
  id: "off",
  label: "Off",
  hint: "Nothing — the bare dial",
};

/** id → the towerState key carrying that layer's flag. */
const HOUR_FLAG_KEYS = {
  clock: "hourClock",
  digital: "hourDigital",
  numerals: "hourNumerals",
};

/**
 * FT-1052's mechanical migration: the retired four-value enum, restated as
 * flags. Old "numerals" meant hands + numerals (the enum conflated them);
 * unknown values fall back to the shipped default. Used for a legacy stored
 * town, a legacy synced host, and a legacy viewer override alike.
 */
function legacyHourFlags(mode) {
  switch (mode) {
    case "off":
      return { hourClock: false, hourDigital: false, hourNumerals: false };
    case "clock":
      return { hourClock: true, hourDigital: false, hourNumerals: false };
    case "digital":
      return { hourClock: false, hourDigital: true, hourNumerals: false };
    case "numerals":
      return { hourClock: true, hourDigital: false, hourNumerals: true };
    default:
      return null;
  }
}

/** What ships. `minuteTick` true is the FT-1020 change itself — the hands
 *  step now; Sweep on the build panel is the old glide, kept reachable. */
export const DEFAULT_TOWER = {
  // FT-1052: the three hour-display layers, each its own flag (the old
  // four-value `hourMode` enum retired; legacyHourFlags migrates it).
  hourClock: true,
  hourDigital: false,
  hourNumerals: false,
  minuteTick: true,
  bellOn: true,
  bellId: "one",
  bellVolume: 80,
  // FT-1045: the custom bell's source — "" until the storyteller sets one.
  // A key of DEFAULT_TOWER, so it persists per town and rides the sync with
  // no further plumbing (both walk these keys).
  bellUrl: "",
  // FT-1051: the CALL-BACK's voice, riding the same shelf — "default" is the
  // FT-880 clip that ships, "custom" plays callUrl. The keys live here (not
  // in callBack.js) because this object IS the town's synced, per-town-
  // persisted sound config; callBack.js reads them at play time.
  callId: "default",
  callUrl: "",
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
    case "hourClock":
    case "hourDigital":
    case "hourNumerals":
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
    // FT-1045/FT-1051: a link, or nothing — the shared sanitizer (see
    // golem/customAudio.js: http(s)/same-origin only, javascript: and data:
    // URLs die here; data: is also barred by size, it would ride every sync).
    case "bellUrl":
    case "callUrl":
      return sanitizeAudioUrl(value);
    case "callId":
      return value === "custom" ? "custom" : "default";
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
    // FT-1052: a town stored under the retired enum migrates mechanically.
    if (!("hourClock" in raw) && "hourMode" in raw) {
      Object.assign(raw, legacyHourFlags(raw.hourMode) || {});
    }
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

/** What rides the full gamestate sync — the whole tower, every field. */
export function towerSyncPayload() {
  return { ...towerState };
}

/** A synced tower arriving on a player's client. Every field is sanitized —
 *  the wire is just another storage this module refuses to trust. */
export function applyTowerSync(data) {
  if (!data || typeof data !== "object") return;
  // FT-1052: an older host still syncing the retired enum is migrated the
  // same way a legacy stored town is.
  if (!("hourClock" in data) && "hourMode" in data) {
    data = { ...data, ...(legacyHourFlags(data.hourMode) || {}) };
  }
  Object.keys(DEFAULT_TOWER).forEach((key) => {
    if (key in data) towerState[key] = sanitize(key, data[key]);
  });
  notifyTower();
}

/**
 * The viewer's own display pick — FT-1052: a {clock, digital, numerals}
 * flag set, or null to follow the town. A legacy stored enum string (the
 * pre-1052 model) migrates on read. Persisted per browser, not per town —
 * it is about this screen, not that place.
 */
function readViewerHour() {
  try {
    const raw = localStorage.getItem(VIEWER_STORAGE);
    if (!raw) return null;
    if (raw.charAt(0) === "{") {
      const o = JSON.parse(raw);
      return {
        clock: !!o.clock,
        digital: !!o.digital,
        numerals: !!o.numerals,
      };
    }
    const legacy = legacyHourFlags(raw);
    return legacy
      ? {
          clock: legacy.hourClock,
          digital: legacy.hourDigital,
          numerals: legacy.hourNumerals,
        }
      : null;
  } catch (e) {
    return null;
  }
}

let viewerHour = readViewerHour();

/** The town's three layer flags, as one {clock, digital, numerals} object. */
function townHourFlags() {
  return {
    clock: towerState.hourClock,
    digital: towerState.hourDigital,
    numerals: towerState.hourNumerals,
  };
}

/**
 * The layers THIS screen shows, as {clock, digital, numerals}.
 *
 * A PLAYER's screen: their own flag set when they have made one, the town's
 * otherwise. A STORYTELLER's screen: the town's, always — their pick IS the
 * town's, made through the same menu.
 *
 * THE SESSION PARAMETER IS THE FT-1020c FIX, carried over from the enum
 * days: the viewer override is stored per BROWSER, and a browser that ever
 * picked as a player must not shadow the host's fresh town pick on the
 * host's own screen — whoever's pick would WRITE the town's flags reads the
 * town's flags back.
 */
export function effectiveHourFlags(session) {
  if (session && !session.isSpectator) return townHourFlags();
  return viewerHour ? { ...viewerHour } : townHourFlags();
}

/** Convenience for the surfaces that only care whether ANYTHING shows —
 *  "Off is the derived state" made code. */
export function hourAllOff(flags) {
  return !flags.clock && !flags.digital && !flags.numerals;
}

/**
 * FT-1052: one layer toggled from the hourglass menu or the build panel's
 * segment — `id` is a HOUR_LAYERS id, or "off" to clear all three (the
 * derived Off row's click). The STORYTELLER's toggle writes the town's
 * flags (persisted per town, ridden out on the live tower frame and the
 * full sync); a PLAYER's flips their own screen's override, starting from
 * whatever their screen currently shows. One function so every surface
 * carries the same split.
 */
export function toggleHourLayer(session, id) {
  if (session && !session.isSpectator) {
    const townId = session.sessionId || "";
    if (id === "off") {
      Object.keys(HOUR_FLAG_KEYS).forEach((layer) =>
        setTowerField(townId, HOUR_FLAG_KEYS[layer], false),
      );
      return;
    }
    const key = HOUR_FLAG_KEYS[id];
    if (!key) return;
    setTowerField(townId, key, !towerState[key]);
    return;
  }
  const now = effectiveHourFlags(session);
  if (id !== "off" && !(id in now)) return;
  const next =
    id === "off"
      ? { clock: false, digital: false, numerals: false }
      : { ...now, [id]: !now[id] };
  viewerHour = next;
  try {
    localStorage.setItem(VIEWER_STORAGE, JSON.stringify(next));
  } catch (e) {
    // storage off: the pick still works for this session
  }
  notifyTower();
}

/* ── THE BELL ITSELF — the FT-880 mechanics, applied to two clips ──────────── */

const GESTURES = ["pointerdown", "touchend", "keydown"];

const els = {};
let unlocked = false;
let listening = false;
let opToken = 0;
let lastRangAt = 0;
/** FT-1045 (impl moved to golem/customAudio.js for FT-1051): the custom
 *  bell's one-element-per-URL slot — a NEW link earns a new element (the
 *  page's unlocked autoplay state carries over). */
const customBell = makeCustomSlot();

/** THE elements — one per bell, forever (credit belongs to the element).
 *  CUSTOM (FT-1045) resolves through towerState.bellUrl; custom with no URL
 *  set resolves to bell one, so no caller can ever hold a source-less bell. */
function element(bellId) {
  const bell = TOWER_BELLS.find((b) => b.id === bellId) || TOWER_BELLS[0];
  if (bell.id === "custom") {
    const url = towerState.bellUrl;
    if (!url) return element(TOWER_BELLS[0].id);
    return customBell.get(url);
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
    if (
      status === "failed" &&
      bellId === "custom" &&
      a === customBell.current()
    ) {
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
  customBell.stop();
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

// FT-1051: probeBellUrl / uploadBellFile MOVED to golem/customAudio.js as
// probeAudioUrl / uploadAudioFile — one helper serving the bell AND the
// call-back, not a copy. HostTools imports them from there now.
