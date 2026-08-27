/**
 * Golem fork: the towns shelf — which live-game channels this browser has
 * hosted or joined, remembered locally (the same pattern as the script
 * recents). A "town" is just a relay channel name with a memory attached.
 *
 * FT-847 — OWNED towns: same anonymous-key model as the script vault. A claim
 * (POST) returns the town's edit key exactly once; holding it means rename /
 * attach-script update in place (PUT). The key lives only here, on the shelf:
 * {id, name?, editKey?, role, at}. Every server call is best-effort — the
 * plain hosting flow never blocks on the API being reachable.
 */

const API =
  process.env.NODE_ENV === "development"
    ? "/api/botc/towns" // the dev server proxies /api (vue.config.js, FT-1010)
    : "/api/botc/towns";

const KEY = "golem.towns";
const MAX = 12;

/** All remembered towns, newest first; filter by role ("host" | "player").
 *  Entries with no id are dropped defensively — a shelf written by a much
 *  older build should never be able to poison position 0 with junk. */
export function listTowns(role = null) {
  try {
    const all = (JSON.parse(localStorage.getItem(KEY)) || []).filter(
      town => town && town.id
    );
    return role ? all.filter(town => town.role === role) : all;
  } catch (e) {
    return [];
  }
}

/**
 * Record a visit (any entry path: panel, hash link, toolbar). Upserts: a
 * later visit never loses a stored edit key or cached display name, and the
 * role only upgrades (player → host), mirroring the script shelf's semantics.
 * `extra` may carry {editKey, name} from a claim or a server meta refresh.
 */
export function rememberTown(id, role, extra = {}) {
  const clean = normalizeTownId(id);
  if (!clean) return;
  const rank = { player: 0, host: 1 };
  const all = listTowns();
  const prior = all.find(town => town.id === clean) || {};
  const towns = all.filter(town => town.id !== clean);
  towns.unshift({
    ...prior,
    id: clean,
    role: (rank[role] || 0) >= (rank[prior.role] || 0) ? role : prior.role,
    editKey: extra.editKey || prior.editKey,
    name: extra.name || prior.name,
    at: Date.now()
  });
  // Trim to MAX, but an OWNED entry is never rotated off — losing the key
  // would orphan the town forever.
  const kept = towns
    .slice(0, MAX)
    .concat(towns.slice(MAX).filter(town => town.editKey));
  localStorage.setItem(KEY, JSON.stringify(kept));
}

/** The stored edit key for a town id, if this browser holds one. */
export function editKeyFor(id) {
  const entry = listTowns().find(town => town.id === normalizeTownId(id));
  return (entry && entry.editKey) || null;
}

/** Forget a shelf entry (client-side only — the server row is untouched).
 *  Forgetting an OWNED entry discards its locally-held edit key for good. */
export function removeTown(id) {
  const clean = normalizeTownId(id);
  const towns = listTowns().filter(town => town.id !== clean);
  localStorage.setItem(KEY, JSON.stringify(towns));
}

/**
 * Claim a town id (POST). On success the shelf entry gains the edit key —
 * its single appearance — and the display name.
 * → { town } | { taken: true }; throws only on network/server failure.
 *
 * FT-1241: `extra` may carry the two OPTIONAL passwords the claim can set —
 * {openPassword, enterPassword} — travelling in the POST body only, never a
 * URL. A signed-in claimer needs neither: the platform records their ACCOUNT
 * as the town's owner (cookies ride same-origin), and their session alone
 * re-opens the host seat later.
 */
export async function claimTown(id, name, scriptId, extra = {}) {
  const body = { id: normalizeTownId(id), name };
  if (scriptId) body.scriptId = scriptId;
  if (extra.openPassword) body.openPassword = extra.openPassword;
  if (extra.enterPassword) body.enterPassword = extra.enterPassword;
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (res.status === 409) return { taken: true };
  if (!res.ok) throw new Error(`claim failed (${res.status})`);
  // NOTE: towns responses are FLAT (unlike the scripts API's {script} wrap).
  const town = await res.json();
  rememberTown(town.id, "host", { editKey: town.editKey, name: town.name });
  return { town };
}

/**
 * Keyed save on an owned town (PUT): {name?, scriptId?} — scriptId null
 * detaches. Uses the shelf's stored key; refreshes the cached name.
 */
export async function updateTown(id, patch) {
  const clean = normalizeTownId(id);
  const key = editKeyFor(clean);
  if (!key) throw new Error("no edit key held for " + clean);
  const res = await fetch(`${API}/${clean}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-botc-edit-key": key },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error(`town save failed (${res.status})`);
  const town = await res.json(); // flat, like all towns responses
  rememberTown(town.id, "host", { name: town.name });
  return town;
}

/**
 * Batch public meta for shelf ids (≤30; unknown ids silently absent).
 * → { id: {id, name, scriptId, version, ...} }. Also refreshes the shelf's
 * cached display names in place — without reordering it.
 */
export function townMeta(ids) {
  const clean = [...new Set(ids.map(normalizeTownId).filter(Boolean))].slice(
    0,
    30
  );
  if (!clean.length) return Promise.resolve({});
  return fetch(API + "?ids=" + encodeURIComponent(clean.join(",")))
    .then(res => (res.ok ? res.json() : { towns: [] }))
    .then(({ towns }) => {
      const meta = {};
      (towns || []).forEach(town => {
        meta[town.id] = town;
      });
      cacheTownNames(meta);
      return meta;
    })
    .catch(() => ({}));
}

/** Quiet name refresh: update shelf names from meta, keep order + timestamps. */
function cacheTownNames(meta) {
  const towns = listTowns();
  let changed = false;
  towns.forEach(town => {
    const m = meta[town.id];
    if (m && m.name && m.name !== town.name) {
      town.name = m.name;
      changed = true;
    }
  });
  if (changed) localStorage.setItem(KEY, JSON.stringify(towns));
}

/** Ask the relay which towns are awake. → { id: { players, host } } */
export function townStatuses(ids) {
  if (!ids.length) return Promise.resolve({});
  return fetch("/ws/status?towns=" + encodeURIComponent(ids.join(",")))
    .then(res => (res.ok ? res.json() : {}))
    .catch(() => ({}));
}

/**
 * 2026-08-19 — IS THE TOWN OPEN? A town is open when a STORYTELLER is
 * connected to it. `players` alone is not enough: a spectator arriving at a
 * host-less channel asks "host" for the gamestate, nobody answers, and they
 * sit in an empty square that never fills.
 *
 * IT FAILS OPEN, ALWAYS. Every way the answer can go wrong — relay
 * unreachable, non-ok response, malformed body, no response at all — resolves
 * true and lets the player through exactly as they went through before this
 * check existed. A false "not open" caused by a network hiccup locks someone
 * out of a working town, which is worse than the empty square this gate
 * exists to prevent. The timeout race is part of that promise and not an
 * optimisation: fetch carries no deadline of its own, so a hung relay would
 * otherwise leave a player in front of a screen that never resolves.
 */
const OPEN_CHECK_TIMEOUT = 2500;

export function townIsOpen(id) {
  const clean = normalizeTownId(id);
  if (!clean) return Promise.resolve(true);
  const asked = townStatuses([clean]).then(statuses => {
    const status = statuses[clean];
    // The relay answers for EVERY town it is asked about, awake or asleep —
    // so a MISSING entry means the answer failed, not that the town is shut.
    return !status || !!status.host;
  });
  const deadline = new Promise(resolve =>
    setTimeout(() => resolve(true), OPEN_CHECK_TIMEOUT)
  );
  return Promise.race([asked, deadline]).catch(() => true);
}

/**
 * ── FT-1241: town ownership + the two optional passwords ────────────────────
 *
 * A town claimed while signed in BELONGS to that account; re-opening its host
 * seat later needs only the session. Two optional passwords cover everyone
 * else: the OPEN password takes the host seat of a town you do not own, and
 * the ENTER password is the room key players must give to join. Both live
 * hashed on the platform and travel only in POST bodies — an invite link
 * never carries a secret.
 *
 * EVERY check here FAILS OPEN, the same promise townIsOpen makes: the towns
 * API being unreachable never locks anyone out of a working relay session.
 * That is also the honest enforcement boundary — the relay itself does not
 * (yet) ask, so these gates guard the app's flows, not the wire.
 */

/**
 * May this browser take the HOST seat of `id`? Sends what it holds: the
 * session cookie rides by itself, a held edit key rides as the header, and
 * `openPassword` (when given) rides in the body.
 * → { ok: true } | { ok: false, error, owned, openPasswordSet }.
 * 404 (a never-claimed id) and every failure resolve ok — fail open.
 */
export async function openTown(id, openPassword) {
  const clean = normalizeTownId(id);
  const key = editKeyFor(clean);
  try {
    const res = await fetch(`${API}/${clean}/open`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { "x-botc-edit-key": key } : {}),
      },
      body: JSON.stringify(openPassword ? { openPassword } : {}),
    });
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: body.error || "host_locked",
        owned: !!body.owned,
        openPasswordSet: !!body.openPasswordSet,
      };
    }
    return { ok: true }; // 204 yes; 404/5xx/anything else fails open
  } catch (e) {
    return { ok: true }; // unreachable — fail open, the recorded boundary
  }
}

/** Does the town ask players for a password? Best-effort meta read;
 *  unknown town / unreachable API → false (fail open). */
async function townNeedsEnterPass(id) {
  try {
    const res = await fetch(`${API}/${normalizeTownId(id)}`);
    if (!res.ok) return false;
    const meta = await res.json();
    return !!meta.requiresEnterPassword;
  } catch (e) {
    return false;
  }
}

/**
 * Offer `pass` (possibly none) at the town's door.
 * → { ok: true } | { ok: false, error: "password_required" | "wrong_password" }.
 * Anything but a 403 lets the player through — fail open.
 */
async function verifyEnterPass(id, pass) {
  try {
    const res = await fetch(`${API}/${normalizeTownId(id)}/enter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pass ? { enterPassword: pass } : {}),
    });
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error || "wrong_password" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: true };
  }
}

/**
 * Remembered ENTER passwords, per town, in this browser — the same
 * convenience the shelf's edit keys already are: give the room key once,
 * walk back in on later visits. A room key shared with a whole table is a
 * courtesy lock, not an account credential, so localStorage is its measure.
 * A remembered pass the server refuses (it was changed) is forgotten and the
 * player is simply asked again.
 */
const ENTER_PASS_KEY = "golem.townEnterPasses";

function rememberedEnterPass(id) {
  try {
    const all = JSON.parse(localStorage.getItem(ENTER_PASS_KEY)) || {};
    return all[normalizeTownId(id)] || null;
  } catch (e) {
    return null;
  }
}

function rememberEnterPass(id, pass) {
  try {
    const all = JSON.parse(localStorage.getItem(ENTER_PASS_KEY)) || {};
    all[normalizeTownId(id)] = pass;
    localStorage.setItem(ENTER_PASS_KEY, JSON.stringify(all));
  } catch (e) {
    // remembering is a bonus, never a blocker
  }
}

function forgetEnterPass(id) {
  try {
    const all = JSON.parse(localStorage.getItem(ENTER_PASS_KEY)) || {};
    delete all[normalizeTownId(id)];
    localStorage.setItem(ENTER_PASS_KEY, JSON.stringify(all));
  } catch (e) {
    // nothing stored, nothing to forget
  }
}

/**
 * The town whose door is asking for a password ("" = none) + the last
 * refusal. Reactive the same way townGate is: a plain module object Intro
 * holds in `data`, written from any entry path — the Join panel and the
 * invite-link boot alike.
 */
export const enterKeyGate = { town: "", error: "" };

/** The continuation the gate holds while it asks — runs on the right pass. */
let enterKeyProceed = null;

/**
 * The player typed a password at the gate's panel. Right → remembered for
 * this browser, gate closed, entry continues (straight in, or on to the
 * waiting screen if the town isn't open yet). Wrong → the gate stays up with
 * the server's honest refusal. → resolves true when they were let through.
 */
export async function offerEnterPass(pass) {
  const clean = enterKeyGate.town;
  if (!clean) return false;
  const verdict = await verifyEnterPass(clean, pass);
  if (!verdict.ok) {
    enterKeyGate.error = verdict.error;
    return false;
  }
  rememberEnterPass(clean, pass);
  const proceed = enterKeyProceed;
  stopEnterPassGate();
  if (proceed) proceed();
  return true;
}

/** Leave the password gate — the player went back to the entry screen. */
export function stopEnterPassGate() {
  enterKeyGate.town = "";
  enterKeyGate.error = "";
  enterKeyProceed = null;
}

/**
 * The room-key gate a player entry passes first: no password needed (or a
 * remembered one still fits) → true, proceed. Otherwise the gate panel takes
 * over and this resolves false — `proceed` runs later, from offerEnterPass.
 */
async function gateOnEnterPass(clean, proceed) {
  if (!(await townNeedsEnterPass(clean))) return true;
  const held = rememberedEnterPass(clean);
  if (held) {
    const verdict = await verifyEnterPass(clean, held);
    if (verdict.ok) return true;
    forgetEnterPass(clean); // the key was changed — ask honestly
  }
  enterKeyGate.town = clean;
  enterKeyGate.error = "";
  enterKeyProceed = proceed;
  return false;
}

/**
 * The town this browser is waiting to see opened ("" = none), and when the
 * wait began. A plain module object rather than store state because it is
 * WRITTEN from the socket plugin's boot parse — which runs before any
 * component exists — and READ by Intro, which makes it reactive simply by
 * holding it in `data` (the same way it already holds titleFonts' fontState).
 */
export const townGate = { town: "", since: 0 };

// How often the wait re-asks. Three seconds is fast enough that "you go in
// the moment they open it" is true to a player's eye; after two minutes it
// drops to the shelf's own ten-second cadence, since by then nobody is about
// to arrive in the next breath. IT NEVER GIVES UP: the player chose to wait,
// the screen says so and offers the way out, and timing them out would dump
// them back at the doors without being asked.
const WAIT_POLL = 3000;
const WAIT_SLOW_POLL = 10000;
const WAIT_SLOW_AFTER = 2 * 60 * 1000;

let waitTimer = null;

/** Watch `id` until a storyteller opens it, then hand it to `onOpen`. */
export function waitForTown(id, onOpen) {
  const clean = normalizeTownId(id);
  if (!clean) return;
  stopWaitingForTown();
  townGate.town = clean;
  townGate.since = Date.now();
  const tick = () => {
    // A player who stopped waiting — or who got in by some other path — must
    // never be dragged into a town by a check that was already in flight.
    if (townGate.town !== clean) return;
    townIsOpen(clean).then(open => {
      if (townGate.town !== clean) return;
      if (open) {
        stopWaitingForTown();
        onOpen(clean);
        return;
      }
      waitTimer = setTimeout(
        tick,
        Date.now() - townGate.since > WAIT_SLOW_AFTER
          ? WAIT_SLOW_POLL
          : WAIT_POLL
      );
    });
  };
  waitTimer = setTimeout(tick, WAIT_POLL);
}

/** Stop watching — the player left the waiting screen, or has been let in. */
export function stopWaitingForTown() {
  clearTimeout(waitTimer);
  waitTimer = null;
  townGate.town = "";
  townGate.since = 0;
}

/**
 * THE ONE GATE every PLAYER entry path calls. FT-1241 made it two doors, in
 * order: the room key first (a town with an enter password ASKS — the gate
 * panel takes over until the right password is given), then the open check
 * (a town with no storyteller is waited for). Both fail open on any API
 * trouble. Resolves true if they went straight in, false if a gate panel or
 * the wait now owns the entry — `enter(id)` still runs the moment both doors
 * pass, however long that takes.
 *
 * A HOST NEVER COMES THROUGH HERE — each caller checks its own role first,
 * because opening a town is precisely the moment when no host is connected to
 * it, and gating that would lock a storyteller out of their own game. (The
 * check lives in the callers rather than here so this module never has to
 * import townRoute, which imports this one.)
 */
export function enterWhenOpen(id, enter) {
  const clean = normalizeTownId(id);
  return gateOnEnterPass(clean, () => proceedWhenOpen(clean, enter)).then(
    (passed) => {
      if (!passed) return false; // the gate panel took the entry over
      return proceedWhenOpen(clean, enter);
    },
  );
}

/** The pre-FT-1241 body of enterWhenOpen: enter now, or wait for the host. */
function proceedWhenOpen(clean, enter) {
  return townIsOpen(clean).then(open => {
    if (open) {
      enter(clean);
      return true;
    }
    waitForTown(clean, enter);
    return false;
  });
}

/** The relay lowercases channel names on arrival — mirror that here so the
 *  shelf, the status API and the socket all speak of the same town. The
 *  24-char cap matches the session store's sanitizer AND the server's town-id
 *  rule (/^[a-z0-9_-]{1,24}$/) — one id, never forked between surfaces. */
export function normalizeTownId(id) {
  return String(id || "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/g, "");
}

// Static app routes a clean /<town> link must never shadow.
const RESERVED_PATHS = new Set([
  "api",
  "ws",
  "js",
  "css",
  "img",
  "fonts",
  "media",
  "static",
  "index.html"
]);

/**
 * A town id from a clean invite path (/<town>), or "" if the current path
 * isn't one — a single segment matching the town alphabet, not a reserved
 * app route. Boot parsing accepts this alongside the legacy #<town> hash.
 */
export function sessionIdFromPath(pathname) {
  const segment = String(pathname || "").replace(/^\/+|\/+$/g, "");
  if (!segment || segment.includes("/")) return "";
  if (!/^[a-z0-9_-]{1,24}$/i.test(segment)) return "";
  if (RESERVED_PATHS.has(segment.toLocaleLowerCase())) return "";
  return segment;
}

// A readable, flavorful default the host can still edit.
const PLACES = [
  "ravenswood",
  "hallowmere",
  "gallowsgate",
  "thornbury",
  "ashcombe",
  "blackpond",
  "mirefen",
  "crowmarket",
  "dunhollow",
  "candlewick",
  "bellchapel",
  "gravesend",
  "mothhaven",
  "ironvale",
  "nightbell",
  "wolfsden",
  "graymoor",
  "duskwood",
  "cinderfall",
  "wraithmoor",
  "hollowmere",
  "blackfen",
  "ashgrove",
  "crowsfoot",
  "ebonvale",
  "foxglove",
  "greymarsh",
  "hangmoor",
  "ironthorn",
  "mourncreek",
  "nettlewick",
  "oldgrave",
  "pinehollow",
  "quietfen",
  "rookwood",
  "shadowmere",
  "stonecairn",
  "thistlewood",
  "tombury",
  "vulturewatch",
  "westfen",
  "witchmoor",
  "yewbrook",
  "bramblegate",
  "coldharbor",
  "deadfall",
  "elmshadow",
  "foggate"
];

// Mood/adjective words for the fallback `adjective-place` compound, used only
// when bare place names keep colliding (see mintAvailableTownId below).
const MOODS = [
  "silent",
  "hollow",
  "ashen",
  "veiled",
  "gloomy",
  "withered",
  "forsaken",
  "moonlit",
  "ghostly",
  "crimson",
  "weeping",
  "restless",
  "forgotten",
  "brittle",
  "shadowed",
  "drowned"
];

function pickPlace() {
  return PLACES[Math.floor(Math.random() * PLACES.length)];
}

function pickMood() {
  return MOODS[Math.floor(Math.random() * MOODS.length)];
}

/** A readable default town id — a bare place name, no digits, unchecked. */
export function mintTownId() {
  return pickPlace();
}

/**
 * Best-effort availability check for a candidate id: unclaimed (404 from the
 * towns API) AND not currently awake (0 players via townStatuses). Any
 * network failure resolves true — an unreachable API never blocks minting,
 * it just skips the check and hands back the candidate unverified.
 */
async function isAvailable(id) {
  let res;
  try {
    res = await fetch(`${API}/${id}`);
  } catch (e) {
    return true; // API unreachable — best effort, proceed unchecked
  }
  if (res.status !== 404) return false; // claimed
  const statuses = await townStatuses([id]).catch(() => ({}));
  const s = statuses[id];
  return !s || !s.players;
}

const MINT_ATTEMPTS = 5;

/**
 * Mint a town id, availability-checked best-effort: bare place names first
 * (a few attempts), falling back to `adjective-place` compounds if the plain
 * names keep colliding. Never blocks — an unreachable API returns the first
 * candidate unchecked (isAvailable resolves true immediately).
 */
export async function mintAvailableTownId() {
  let candidate = pickPlace();
  for (let i = 0; i < MINT_ATTEMPTS; i++) {
    if (await isAvailable(candidate)) return candidate;
    candidate = pickPlace();
  }
  for (let i = 0; i < MINT_ATTEMPTS; i++) {
    const compound = pickMood() + "-" + pickPlace();
    if (await isAvailable(compound)) return compound;
    candidate = compound;
  }
  return candidate; // exhausted attempts — hand back the last try
}
