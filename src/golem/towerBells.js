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
 *  the full-length originals live in design/bells/). */
export const TOWER_BELLS = [
  { id: "one", label: "Bell one", short: "One", src: bellOneSound },
  { id: "two", label: "Bell two", short: "Two", src: bellTwoSound },
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

/** THE elements — one per bell, forever (credit belongs to the element). */
function element(bellId) {
  const bell = TOWER_BELLS.find((b) => b.id === bellId) || TOWER_BELLS[0];
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
  const token = ++opToken;
  a.muted = false;
  a.volume = Math.max(BELL_VOLUME_MIN, Math.min(BELL_VOLUME_MAX, volume)) / 100;
  try {
    a.currentTime = 0;
  } catch (e) {
    // an element that has never loaded throws on seek; play() will start it
  }
  const p = a.play();
  if (!p || !p.then) {
    towerBellState.blocked = false;
    return Promise.resolve(true);
  }
  return p
    .then(() => {
      unlocked = true;
      towerBellState.blocked = false;
      stopListening();
      return true;
    })
    .catch(() => {
      if (opToken !== token) return false;
      towerBellState.blocked = true;
      return false;
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
