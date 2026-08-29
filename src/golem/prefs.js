/**
 * Golem fork (FT-1168): THIS PERSON'S OWN SETTINGS.
 *
 * THE LINE THIS FILE EXISTS TO DRAW. The app now has two settings surfaces and
 * they must never grow into each other:
 *
 *   PERSONAL (here)      belongs to the human at this browser and follows them
 *                        into every town — how the setup panel is dressed, how
 *                        they operate a coin, how big the storyteller's post
 *                        stands. Nothing here is ever synced TO A TOWN, and
 *                        nothing here is ever keyed by town. (FT-1202 amended
 *                        the first half of the old "never synced" claim: a
 *                        SIGNED-IN person's prefs now follow their ACCOUNT
 *                        through the platform's per-user ui-state bag — see
 *                        THE ACCOUNT SYNC below. The line this header draws —
 *                        personal vs the town's — is untouched: the sync is
 *                        to the person, which is the claim, done properly.)
 *
 *   THIS TOWN'S RULES    the build panel's "Game settings" tab — the night
 *                        checklist, the day bell, the day's length, the
 *                        call-back voice. Those are facts about a PLACE, they
 *                        ride the town's own per-town stash (golem/towerBells'
 *                        `golem.tower.<town>`, golem/nightLog's own map), and
 *                        the host syncs several of them to the table.
 *
 * The test for a new setting: would a storyteller expect it to follow them to
 * a different town? Then it is personal and it belongs here. Would they expect
 * a co-host of THIS town to see the same value? Then it is the town's and it
 * does not.
 *
 * WHY A MODULE OBJECT AND NOT STORE STATE. Same reasoning golem/towerBells
 * gives for `towerState`: this is read by surfaces that mount before any store
 * subscription would fire, it never crosses the wire, and it is not game state
 * — so it stays a plain module object with an event, and each component holds
 * its own reactive snapshot refreshed on PREFS_EVENT. One stash, one writer,
 * no second copy that can disagree.
 */

// FT-1260: the per-menu layouts are keyed by the seat vocabulary's own slots
// — the settings list, the sanitizer and both menus all derive from
// golem/seatActions, so a future action needs no change here. One-way
// dependency: seatActions imports assets only, never this module.
import { seatActionSlots } from "./seatActions";

// FT-1318: the coin-art vocabulary and its painter — the `coinArt` pref
// below is the REMEMBERED choice; golem/coinArt owns the looks (COINS), the
// repaint (applyCoin → var(--coin) on the root) and its own legacy
// "golem.coin" stash, which loadPrefs migrates from. One-way dependency:
// coinArt imports Vue only, never this module.
import { COINS, coinChoice, applyCoin } from "./coinArt";

const KEY = "golem.prefs";

/** Fired on every write, so every surface showing a pref can re-read it. */
export const PREFS_EVENT = "golem:prefs";

/**
 * THE CONTROL SCHEMES — how a storyteller operates a seat.
 *
 * FT-1168 BUILDS THE SETTING, NOT THE BEHAVIOURS. The three schemes themselves
 * are FT-1169's work; what lives here is the remembered choice, so that lane
 * has one place to read and never has to invent its own stash. Until it lands,
 * picking a scheme changes what this module reports and nothing else — which
 * is why the menu's own rows say what they do rather than implying a change
 * the app cannot yet make.
 *
 * ── FT-1213 STANDS THE EXCLUSIVE SCHEME DOWN ───────────────────────────────
 * The user's verdict on living with all three: none of them actually CONFLICT
 * — a click on a coin, a rest on a coin and a click on the plate are three
 * different gestures on three different targets — so one exclusive choice was
 * withholding two working controls to protect nothing. The dropdown becomes
 * CONTROL_TOGGLES below: six independent switches, three for the old schemes
 * and three for gestures that were never conditional at all (the two drags
 * and the hover add-reminder disc), because a switch with a teaching tooltip
 * is also how a gesture gets DISCOVERED. This list and its stored
 * `controlScheme` key stay in place, stood down: the key is read exactly once
 * per stash, to migrate the person's old choice onto the toggles (see
 * migrateSchemeStash / pullAccountPrefs), and Menu.vue's stood-down settings
 * section still imports the vocabulary.
 */
export const CONTROL_SCHEMES = [
  {
    id: "click",
    label: "Click coins",
    title: "Click a coin to open its actions — the way the app works today",
  },
  {
    id: "hover",
    label: "Hover coins",
    title: "A coin's actions appear when the pointer rests on it",
  },
  {
    id: "nameplate",
    label: "Nameplate click",
    title: "Click a seat's name plate rather than its coin",
  },
];

/**
 * FT-1213: THE CONTROL TOGGLES — every seat gesture, its own switch.
 *
 * SEVEN ROWS, ONE GRAMMAR (six until FT-1227 split "Click coins" in two).
 * The first four are the old schemes as independent switches; the last
 * three gate gestures that were unconditional until now.
 * Each row's `title` TEACHES its gesture — discoverability is half the point
 * of the list (the user found the drags by accident; nobody should have to).
 * The `icon` is the row's font-awesome mark in the Control settings tab.
 *
 * `key` is the stored pref key AND the account wire key's tail
 * (`ui.botc.prefs.<key>`), one per row, so each toggle rides the FT-1202
 * account sync exactly the way every other pref does.
 */
export const CONTROL_TOGGLES = [
  // ── FT-1227 SPLITS "Click coins" IN TWO ──────────────────────────────────
  // The user: "click role name to change role. click other areas of coin to
  // toggle dead or not." One switch was gating two different acts on two
  // different targets — the FT-1213 argument for unbundling the schemes,
  // applied one level deeper. The old `ctrlClickCoins` key STANDS DOWN the
  // way `controlScheme` did: read once per stash/bag to migrate its value
  // onto BOTH halves (on = both on), never consulted by a live gesture.
  //
  // ── FT-1260.2: THE TWO CLICKS BECOME ACTION PICKERS ──────────────────────
  // The user's rider: each coin click chooses ANY single action from the
  // vocabulary, or Off — "Click role name: [Change role ▾]". So the FT-1227
  // booleans stand down exactly the way `ctrlClickCoins` did (kept in
  // DEFAULT_PREFS, read once per stash/bag to migrate: true → the click's
  // standing act, false → "off"; never consulted by a live gesture), and
  // these two rows carry `action: true` — the Control tab offers the
  // vocabulary instead of On/Off. The FT-1230 labels shorten to the
  // gesture alone ("Click role name") because the ACT is the picker's face
  // now, not the row's name. Values are vocabulary SLOT ids ("nominate"
  // names the nominate/ghost-vote pair — which fires depends on the seat's
  // life state, the slot's own rule) or "off".
  {
    key: "ctrlClickNameAction",
    // FT-1230 (user) named the row; FT-1260.2 trims it to the gesture (the
    // assignment is the control's own face). FT-1264: the mark says the
    // TARGET now — the name on the coin (ui-role-name.png, HostTools'
    // TOGGLE_MARKS; the FA name stands down as the record).
    label: "Click role name",
    icon: "theater-masks",
    title: "What a click on the character's name on a coin's lower edge does",
    action: true,
  },
  {
    key: "ctrlClickDeadAction",
    // FT-1230 (user): "click Cog to kill" — their word for the gear-toothed
    // player coin; FT-1260.2 trims the label to the gesture. FT-1264: the
    // mark says the TARGET now — the toothed coin itself (ui-role.png via
    // HostTools' TOGGLE_MARKS; the death mark stood down with the kill
    // meaning).
    label: "Click Cog",
    icon: "skull",
    title: "What a click on a coin anywhere outside its name does",
    action: true,
  },
  {
    key: "ctrlHoverCoins",
    // FT-1230 (user): their wording.
    label: "Hover Player Cog Menu",
    icon: "hand-pointer",
    title:
      "Rest the pointer on a coin and a ring of small action coins opens " +
      "around it",
    // FT-1260: this row expands — the menu's actions as a reorderable
    // on/off list, stored under this layout pref. Top of the list is the
    // ring's LEFTMOST coin (the user's own mapping).
    layoutKey: "ctrlRingLayout",
  },
  {
    key: "ctrlNameplateClick",
    // FT-1230 (user): their wording.
    label: "Player name click menu",
    icon: "address-card",
    title:
      "Click a seat's name plate and a plate of its actions opens on the coin",
    // FT-1260: same expander; top of the list is the plate's FIRST row.
    layoutKey: "ctrlPlateLayout",
  },
  {
    key: "ctrlDragRoles",
    label: "Drag roles",
    // FT-1227: the FA mark stands down — the Control tab paints the hover
    // ring's own baked art over this row (ui-move-role.png, HostTools'
    // TOGGLE_MARKS), so the row teaching the gesture wears the gesture's
    // own icon. `icon` stays as the fallback for a surface with no art map.
    icon: "exchange-alt",
    title:
      "Drag a character coin onto another seat to swap the two characters, " +
      "or off the circle to unseat it",
  },
  {
    key: "ctrlDragNames",
    label: "Drag names",
    // FT-1227: stands down for ui-move-player.png — same note as Drag roles.
    icon: "people-arrows",
    title:
      "Drag a seat's name plate onto another seat to move or swap the two " +
      "players",
  },
  {
    // FT-1227 (user): the row must SAY it is the pin on the nameplate hover
    // — "Reminder button" named a control nobody could place. The FA
    // plus-circle stands down for the pin the hover actually shows
    // (ui-note.png, HostTools' TOGGLE_MARKS).
    key: "ctrlReminderHover",
    label: "Reminder pin",
    icon: "plus-circle",
    title: "The pin on a name plate's hover that adds a reminder",
  },
];

/** The live toggle keys alone — the migration's "has this stash been
 *  converted?" probe and the sanitize switch's membership test. (FT-1227:
 *  the stood-down `ctrlClickCoins` is deliberately NOT here any more — its
 *  own migration probes for it by name.) */
const CONTROL_TOGGLE_KEYS = CONTROL_TOGGLES.map((t) => t.key);

/**
 * FT-1213: the old exclusive choice, said as toggles. The chosen scheme's
 * switch comes on and the other two come OFF — a person who picked
 * "Nameplate click" to stop stray coin clicks killing people must not get
 * those clicks back as a migration gift. The three formerly-unconditional
 * gestures are not named here because migration leaves them at their default
 * (ON — they were unconditional, so ON is what the person had).
 */
function schemeToggles(scheme) {
  return {
    // FT-1227: the "click" scheme was both coin-click acts at once, so it
    // lands on both halves of the split. (FT-1260.2: these two are stood
    // down in turn — the picker migration below each conversion reads them
    // AFTER this mapping lands, so a controlScheme-era stash chains
    // scheme → booleans → pickers in one load.)
    ctrlClickName: scheme === "click",
    ctrlClickDead: scheme === "click",
    ctrlHoverCoins: scheme === "hover",
    ctrlNameplateClick: scheme === "nameplate",
  };
}

/**
 * THE STORYTELLER'S POST, at two sizes.
 *
 * "Grimoire size" is the user's own name for it and it names all three things
 * at once: the book, the End-day button below it and the summons bell above it
 * are ONE column (App.vue's `.storyteller-post`, FT-1063 — "all controls for
 * the storyteller in one place"). They were built as one object and they scale
 * as one; a size control that grew the book and left the bell behind would be
 * taking that column apart again.
 *
 * SMALL IS TODAY, to the pixel. Large multiplies the column; nothing else on
 * the screen moves, and nothing about the game changes.
 */
export const GRIMOIRE_SIZES = [
  {
    id: "small",
    label: "Small",
    title: "The grimoire, the day's end and the bell at their standing size",
  },
  {
    id: "large",
    label: "Large",
    title: "The same three, half again as big — easier to hit, harder to miss",
  },
];

/**
 * THE SETUP PANEL'S DRESS — the two states `setupIconsOnly` names, said out
 * loud (FT-1174).
 *
 * WHY A TWO-OPTION LIST AND NOT A CHECKBOX. The user's ask was that every
 * setting in the corner menu carry "a selector next to them for their options"
 * — and a checkbox is a selector that refuses to name one of its two states.
 * "Icons only: [ ]" makes the reader work out that the empty box means words
 * are ON, which is the one thing a settings menu must never ask of somebody
 * (see the menu's own note on why its labels never hide). Naming both states
 * also lets the ROW carry the noun ("Setup panel") and the CONTROL carry the
 * answer, which is the shape the other two settings already have.
 *
 * The stored value is untouched: still the boolean `setupIconsOnly`, still
 * read the same way by the panel. Only the way it is ASKED changed.
 */
// FT-1209 (user rider): "these should say icons not marks" — the DISPLAY
// strings say icons now. The stored value and its key are untouched (they are
// saved state; renaming them would orphan every stash already written).
export const SETUP_LABELS = [
  {
    value: false,
    label: "Names and icons",
    title: "Every setting on the setup panel says its name beside its icon",
  },
  {
    value: true,
    label: "Icons only",
    title:
      "The setup panel shows its icons alone, with no names beside them — for a storyteller who has learned them",
  },
];

/**
 * FT-1319: THE ADD-REMINDER PIN'S RESTING VISIBILITY — a player-facing pref,
 * the first row of the player settings menu (PlayerSettings.vue).
 *
 * The pin (the note disc beside the name plate) used to exist only on the
 * plate's hover. "Always" is the DEFAULT now: the disc stands at rest in a
 * quiet stone register and brightens on hover, so the affordance is
 * discoverable without a hover hunt. "On hover" is the pre-FT-1319
 * behaviour, kept for anyone who finds the resting discs busy.
 *
 * Both states named out loud, per the SETUP_LABELS rule above: a checkbox
 * would make the reader work out what the empty box means. This is a
 * personal setting by the header's own test — a viewer would expect it to
 * follow them to a different town — so it lives here and rides the FT-1202
 * account sync like every other key.
 */
export const PIN_VISIBILITY = [
  {
    value: "always",
    label: "Always",
    title:
      "The add-reminder pin rests visible beside every name plate, " +
      "quiet until you hover it",
  },
  {
    value: "hover",
    label: "On hover",
    title: "The pin appears only while the pointer rests on a name plate",
  },
];

// ---------------------------------------------------------------------------
// FT-1260: THE PER-MENU LAYOUTS — which seat actions each menu offers, and in
// what order. The user: "make them open as drop down with a toggle for each
// button that is there … and make them drag reorderable".
//
// SHAPE: an ordered array of `{ id, on }`, one element per vocabulary SLOT
// (golem/seatActions' seatActionSlots — the nominate/ghost-vote pair is one
// slot, so it is one orderable element). Array order IS the menu's order:
//   ctrlRingLayout   top of the list = the hover ring's LEFTMOST coin
//   ctrlPlateLayout  top of the list = the plate menu's FIRST row
// `on: false` hides that slot from its menu (FT-1260's amendment to the
// FT-1194 fixed-list rule — the note lives on seatActions' header).
//
// SANITIZED AGAINST THE VOCABULARY every read/write: unknown ids are
// dropped, duplicates collapsed, and any slot the stored array is missing is
// APPENDED (on) in that menu's default order — so a future eighth action
// surfaces instead of vanishing because an old stash predates it. A bare
// string element is accepted as `{ id, on: true }`.
// ---------------------------------------------------------------------------

/** The vocabulary's slot ids, in vocabulary order — resolved once; the
 *  vocabulary is a static module list. */
const SEAT_SLOT_IDS = seatActionSlots().map((s) => s.id);

/**
 * The ring's default order — FT-1219's user-verbatim arrangement ("going
 * left to right: Move role, change role, pin, kill, nominate, whisper, move
 * player"), which lived as SeatRing's hardcoded ORDER array until FT-1260
 * made order a pref; that array's job moves here as the DEFAULT. Stated as
 * slots, so nominate names the nominate/ghost-vote pair.
 */
const RING_DEFAULT_ORDER = [
  "move-role",
  "role",
  "reminder",
  "kill",
  "nominate",
  "whisper",
  "move-player",
];

/** A full everything-on layout: the named ids first (unknown names dropped),
 *  then whatever vocabulary slots the list left out, in vocabulary order. */
function defaultLayout(order) {
  const named = order.filter((id) => SEAT_SLOT_IDS.includes(id));
  const rest = SEAT_SLOT_IDS.filter((id) => !named.includes(id));
  return named.concat(rest).map((id) => ({ id, on: true }));
}

/** The layout prefs' half of `sanitize` — see the block note above. */
function sanitizeLayout(value, fallback) {
  const out = [];
  const seen = new Set();
  (Array.isArray(value) ? value : []).forEach((v) => {
    const id = v && typeof v === "object" ? v.id : v;
    if (!SEAT_SLOT_IDS.includes(id) || seen.has(id)) return;
    seen.add(id);
    out.push({ id, on: !(v && typeof v === "object" && v.on === false) });
  });
  fallback.forEach((d) => {
    if (!seen.has(d.id)) out.push({ id: d.id, on: true });
  });
  return out;
}

/** The two layout keys — loadPrefs re-copies these so prefsState never
 *  shares an array object with DEFAULT_PREFS. */
const LAYOUT_KEYS = ["ctrlRingLayout", "ctrlPlateLayout"];

/**
 * ICONS ONLY defaults OFF — the setup panel says the NAME of each setting
 * beside its mark until someone turns the words off.
 *
 * The user's own reason for the setting decides its default: "users already
 * know what the icons do and want a cleaner UI". That is an opt-in for a
 * storyteller who has learned the panel, not the starting condition of one who
 * has not — a fresh browser gets the words, and the person who no longer needs
 * them takes them away. The panel's icons-only dress is exactly what it has
 * looked like until now, so nothing is lost by making it the ASKED-FOR state
 * rather than the assumed one.
 */
export const DEFAULT_PREFS = {
  setupIconsOnly: false,
  // FT-1213: stood down — read once per stash to migrate onto the toggles
  // below, kept so an old stash (and Menu.vue's stood-down section) still
  // means something. Never consulted by any live gesture.
  controlScheme: "click",
  grimoireSize: "small",
  // FT-1213: every gesture ON is the INTERIM default — the user explicitly
  // deferred the defaults conversation ("we can talk about defaults after"),
  // and all-on is the only starting set that hides nothing while it waits.
  // FT-1227: `ctrlClickCoins` stands down like `controlScheme` above — kept
  // in the stash and the account bag so an old value still means something,
  // read once per stash/bag to migrate onto its two halves, never consulted
  // by a live gesture.
  // FT-1260.2: `ctrlClickName` / `ctrlClickDead` join it — read once per
  // stash/bag to migrate onto the two picker keys below, never consulted
  // by a live gesture.
  ctrlClickCoins: true,
  ctrlClickName: true,
  ctrlClickDead: true,
  // FT-1260.2: the coin clicks' ASSIGNED ACTIONS — a vocabulary slot id or
  // "off". The defaults are today's behaviour: the name click changes the
  // role, the cog click kills.
  ctrlClickNameAction: "role",
  ctrlClickDeadAction: "kill",
  ctrlHoverCoins: true,
  ctrlNameplateClick: true,
  ctrlDragRoles: true,
  ctrlDragNames: true,
  ctrlReminderHover: true,
  // FT-1319: the pin rests VISIBLE by default — see PIN_VISIBILITY above.
  pinVisibility: "always",
  // FT-1318: WHICH COIN this viewer's town wears — the coin lab's looks
  // (golem/coinArt's COINS), offered as thumbnails in the player settings'
  // Appearance section. LOCAL DRESS: the choice repaints every
  // var(--coin) surface on THIS browser — seat coins, life faces, reminder
  // tokens, bluff coins, the belief chips — and nobody else's view. The
  // default is the app's standing look, COINS[0].
  coinArt: COINS[0].id,
  // FT-1260: the per-menu layouts — everything on, at each menu's standing
  // order (the plate's is the vocabulary's own; the ring's is FT-1219's).
  ctrlRingLayout: defaultLayout(RING_DEFAULT_ORDER),
  ctrlPlateLayout: defaultLayout(SEAT_SLOT_IDS),
};

/** The live copy every surface reads. */
export const prefsState = { ...DEFAULT_PREFS };

/** Clamp one field to something this app can actually mean — a hand-edited or
 *  half-written stash must never bend a surface into a state it cannot paint. */
function sanitize(key, value) {
  switch (key) {
    case "setupIconsOnly":
      return !!value;
    case "controlScheme":
      return CONTROL_SCHEMES.some((s) => s.id === value)
        ? value
        : DEFAULT_PREFS.controlScheme;
    case "grimoireSize":
      return GRIMOIRE_SIZES.some((s) => s.id === value)
        ? value
        : DEFAULT_PREFS.grimoireSize;
    // FT-1227: the stood-down key is no longer a CONTROL_TOGGLES row, but an
    // old stash/bag still carries it and the migrations still read it.
    // FT-1260.2: the split's two booleans join it, for the same reason.
    case "ctrlClickCoins":
    case "ctrlClickName":
    case "ctrlClickDead":
      return !!value;
    // FT-1260.2: a coin click's assignment — a vocabulary slot id, or "off".
    case "ctrlClickNameAction":
    case "ctrlClickDeadAction":
      return value === "off" || SEAT_SLOT_IDS.includes(value)
        ? value
        : DEFAULT_PREFS[key];
    // FT-1319: the pin's resting visibility — one of the two named states.
    case "pinVisibility":
      return PIN_VISIBILITY.some((o) => o.value === value)
        ? value
        : DEFAULT_PREFS.pinVisibility;
    // FT-1318: the coin dress — one of the lab's own looks, or the default.
    case "coinArt":
      return COINS.some((c) => c.id === value) ? value : DEFAULT_PREFS.coinArt;
    // FT-1260: the per-menu layouts — vocabulary-checked, missing slots
    // appended in that menu's default order. Always returns a NEW array.
    case "ctrlRingLayout":
    case "ctrlPlateLayout":
      return sanitizeLayout(value, DEFAULT_PREFS[key]);
    default:
      // FT-1213: the control toggles are all plain booleans
      if (CONTROL_TOGGLE_KEYS.includes(key)) return !!value;
      return undefined;
  }
}

function notifyPrefs() {
  try {
    window.dispatchEvent(new CustomEvent(PREFS_EVENT));
  } catch (e) {
    // no CustomEvent (or no window): the choice still lands on next reload
  }
}

/** The one localStorage write, shared by the local setter and the account
 *  pull — signed in or out, this browser's stash always holds the latest. */
function persistLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefsState));
  } catch (e) {
    // storage off: the choice still works for this session
  }
}

// ---------------------------------------------------------------------------
// FT-1202: THE ACCOUNT SYNC — "it should save per user and remember the
// settings between logins/locally."
//
// The platform's per-user ui-state bag (GET/PATCH /api/me/ui-state — the
// shared contract in shared/protocols/ui-state.ts) is EXACTLY this: a flat
// key→JSON bag on the account, last-write-wins, namespaced under "ui." at the
// route boundary. Our keys are `ui.botc.prefs.<name>` — one wire key per
// DEFAULT_PREFS field — pulled with the prefix filter so this app never sees
// the editor's own keys.
//
// THE CONTRACT, in the ui-state file's own degradation terms:
//   signed out    localStorage only, exactly as before this pass.
//   sign-in       the account bag is the source of truth: keys the server
//                 holds are applied over local (server wins); keys it lacks
//                 are SEEDED from local in one PATCH, so a first sign-in
//                 carries this browser's setup up rather than losing it.
//   signed in     every setPref writes BOTH — local first (the warm cache),
//                 then a best-effort PATCH of the one changed key.
//   sign-out      back to local, which was kept warm all along. Never wiped.
//
// Every request is best-effort and SILENT (the bag's own rule: this must
// never block a render or surface an error) — the worst outcome is a pref
// that doesn't follow you to the next machine.
//
// WHY A STORE SUBSCRIPTION AND NOT POLLING: who-is-signed-in is one fact and
// it lives in session.account, written only by golem/account.js's four entry
// points (boot /me, login, signup, logout) — all of which land as ONE
// mutation, "session/setAccount". Hooking that transition is the whole
// listener. main.js binds this BEFORE initAccount fires, so the boot answer
// is caught like any later login.
// ---------------------------------------------------------------------------

const ACCOUNT_PREFIX = "ui.botc.prefs.";
const UI_STATE_API = "/api/me/ui-state";

/** The account whose bag we mirror right now, or null signed out. */
let syncedAccountId = null;
/** Monotonic pull ticket — a stale response (signed out, or a different
 *  account signed in, while the fetch was in flight) must land nowhere. */
let pullSeq = 0;

/** Watch the session's account fact and mirror the transitions. */
export function bindPrefsAccount(store) {
  const onAccount = (account) => {
    const id = account && account.id;
    if (!id) {
      // sign-out: back to local (kept warm by persistLocal all along).
      // pullSeq bumps so an in-flight pull for the old account lands nowhere.
      syncedAccountId = null;
      pullSeq++;
      return;
    }
    if (id === syncedAccountId) return;
    syncedAccountId = id;
    pullAccountPrefs(id);
  };
  store.subscribe((mutation) => {
    if (mutation.type === "session/setAccount") onAccount(mutation.payload);
  });
  // the store is created signed-out and account.js's boot /me lands as the
  // same mutation — but if a caller ever binds late, honour what's there.
  onAccount(store.state.session.account);
}

/** Sign-in: pull the account's prefs (server wins), seed what it lacks. */
async function pullAccountPrefs(id) {
  const seq = ++pullSeq;
  let bag = null;
  try {
    const res = await fetch(
      `${UI_STATE_API}?prefix=${encodeURIComponent(ACCOUNT_PREFIX)}`,
    );
    if (!res.ok) return;
    const body = await res.json();
    bag = (body && body.state) || {};
  } catch (e) {
    return; // unreachable platform: local carries on, silently
  }
  // the world moved while we fetched — a different account, or signed out
  if (seq !== pullSeq || syncedAccountId !== id) return;
  let changed = false;
  const seed = {};
  Object.keys(DEFAULT_PREFS).forEach((key) => {
    const wireKey = ACCOUNT_PREFIX + key;
    if (wireKey in bag) {
      // SERVER WINS where both exist — the account's value is the one that
      // followed the person here.
      const clean = sanitize(key, bag[wireKey]);
      // FT-1260: the layout prefs are arrays, and sanitize always builds a
      // fresh one — compare by content or every pull would count as a
      // change and re-persist an identical stash.
      const differs =
        typeof clean === "object" && clean !== null
          ? JSON.stringify(clean) !== JSON.stringify(prefsState[key])
          : clean !== prefsState[key];
      if (differs) {
        prefsState[key] = clean;
        changed = true;
      }
    } else {
      // FIRST SIGN-IN (for this key): this browser's value seeds the bag,
      // so nobody's setup is lost to an empty account.
      seed[wireKey] = prefsState[key];
    }
  });
  // FT-1213: AN ACCOUNT BAG FROM BEFORE THE TOGGLES — it remembers the old
  // exclusive scheme and holds none of the six toggle keys. The person's
  // choice followed their ACCOUNT here, so it must win over this browser's
  // defaults the same way any other server value does: map it onto the
  // toggle set and let those mapped values REPLACE the local ones the loop
  // above queued for seeding. (A bag that already holds any toggle key is
  // post-conversion and is left entirely alone.)
  const oldWireKey = ACCOUNT_PREFIX + "controlScheme";
  if (
    oldWireKey in bag &&
    !CONTROL_TOGGLE_KEYS.some((key) => ACCOUNT_PREFIX + key in bag)
  ) {
    const mapped = schemeToggles(sanitize("controlScheme", bag[oldWireKey]));
    Object.keys(mapped).forEach((key) => {
      if (prefsState[key] !== mapped[key]) {
        prefsState[key] = mapped[key];
        changed = true;
      }
      seed[ACCOUNT_PREFIX + key] = mapped[key];
    });
  }
  // FT-1227: A BAG FROM BEFORE THE SPLIT — it remembers `ctrlClickCoins` and
  // holds neither half. Same rule as the scheme conversion above: the
  // account's remembered switch maps onto BOTH new keys, replaces whatever
  // the loop queued for seeding, and the PATCH carries the converted pair
  // up so the bag is post-conversion from here on.
  const coinsWireKey = ACCOUNT_PREFIX + "ctrlClickCoins";
  if (
    coinsWireKey in bag &&
    !(ACCOUNT_PREFIX + "ctrlClickName" in bag) &&
    !(ACCOUNT_PREFIX + "ctrlClickDead" in bag)
  ) {
    const on = sanitize("ctrlClickCoins", bag[coinsWireKey]);
    ["ctrlClickName", "ctrlClickDead"].forEach((key) => {
      if (prefsState[key] !== on) {
        prefsState[key] = on;
        changed = true;
      }
      seed[ACCOUNT_PREFIX + key] = on;
    });
  }
  // FT-1260.2: A BAG FROM BEFORE THE PICKERS — a click switch in some
  // generation's shape (the booleans landed via the main loop; a scheme or
  // one-switch bag landed via the two conversions above) and neither picker
  // wire key. Same rule as loadPrefs' own conversion: the mapping reads the
  // POST-conversion prefsState booleans, replaces whatever the main loop
  // queued for seeding, and the PATCH carries the mapped pair up so the bag
  // is post-conversion from here on.
  const nameActWire = ACCOUNT_PREFIX + "ctrlClickNameAction";
  const deadActWire = ACCOUNT_PREFIX + "ctrlClickDeadAction";
  if (
    !(nameActWire in bag) &&
    !(deadActWire in bag) &&
    (ACCOUNT_PREFIX + "ctrlClickName" in bag ||
      ACCOUNT_PREFIX + "ctrlClickDead" in bag ||
      coinsWireKey in bag ||
      oldWireKey in bag)
  ) {
    const mappedActs = {
      ctrlClickNameAction: prefsState.ctrlClickName
        ? DEFAULT_PREFS.ctrlClickNameAction
        : "off",
      ctrlClickDeadAction: prefsState.ctrlClickDead
        ? DEFAULT_PREFS.ctrlClickDeadAction
        : "off",
    };
    Object.keys(mappedActs).forEach((key) => {
      if (prefsState[key] !== mappedActs[key]) {
        prefsState[key] = mappedActs[key];
        changed = true;
      }
      seed[ACCOUNT_PREFIX + key] = mappedActs[key];
    });
  }
  if (changed) {
    persistLocal();
    notifyPrefs();
  }
  if (Object.keys(seed).length) patchAccountPrefs(seed);
}

/** One best-effort PATCH — shallow merge on the server, per the contract. */
function patchAccountPrefs(state) {
  try {
    fetch(UI_STATE_API, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    }).catch(() => {
      // the bag's degradation contract: never block, never surface
    });
  } catch (e) {
    // no fetch at all (tests): local already has it
  }
}

/** Read the stash over the defaults. Safe to call more than once. */
export function loadPrefs() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY));
  } catch (e) {
    raw = null;
  }
  Object.assign(prefsState, DEFAULT_PREFS);
  // FT-1260: the layout defaults are arrays — re-copy them so the live state
  // never shares an array object with DEFAULT_PREFS (a later in-place edit
  // anywhere must not be able to rewrite the defaults).
  LAYOUT_KEYS.forEach((k) => {
    prefsState[k] = DEFAULT_PREFS[k].map((e) => ({ ...e }));
  });
  if (raw && typeof raw === "object") {
    Object.keys(DEFAULT_PREFS).forEach((key) => {
      if (key in raw) prefsState[key] = sanitize(key, raw[key]);
    });
    // FT-1213: A STASH FROM BEFORE THE TOGGLES — it carries the old exclusive
    // `controlScheme` and none of the six toggle keys. The remembered choice
    // maps onto the matching toggle set (the chosen scheme on, the other two
    // off; the three formerly-unconditional gestures stay at their ON
    // default), and the result is persisted at once so the conversion runs
    // exactly one time per stash.
    if (
      "controlScheme" in raw &&
      !CONTROL_TOGGLE_KEYS.some((key) => key in raw)
    ) {
      Object.assign(prefsState, schemeToggles(prefsState.controlScheme));
      persistLocal();
    }
    // FT-1227: A STASH FROM BEFORE THE SPLIT — it carries `ctrlClickCoins`
    // and neither of its two halves. The one remembered switch maps onto
    // BOTH new keys (on = both on, off = both off) and is persisted at
    // once, so the conversion runs exactly one time per stash. Runs AFTER
    // the scheme conversion above so that on the (unlikely) stash carrying
    // both old keys, the more specific one wins.
    if (
      "ctrlClickCoins" in raw &&
      !("ctrlClickName" in raw) &&
      !("ctrlClickDead" in raw)
    ) {
      const on = sanitize("ctrlClickCoins", raw.ctrlClickCoins);
      prefsState.ctrlClickName = on;
      prefsState.ctrlClickDead = on;
      persistLocal();
    }
    // FT-1260.2: A STASH FROM BEFORE THE PICKERS — it carries a click
    // switch in SOME generation's shape (the FT-1227 booleans, the FT-1213
    // one-switch, or the original exclusive scheme) and neither picker key.
    // The migrations above have already folded whichever it was onto
    // prefsState's booleans, so the mapping reads THOSE, not raw: on = the
    // click's standing act (the picker's own default), off = "off". Runs
    // after both conversions above by design, persisted at once so it runs
    // exactly one time per stash.
    if (
      !("ctrlClickNameAction" in raw) &&
      !("ctrlClickDeadAction" in raw) &&
      ("ctrlClickName" in raw ||
        "ctrlClickDead" in raw ||
        "ctrlClickCoins" in raw ||
        "controlScheme" in raw)
    ) {
      prefsState.ctrlClickNameAction = prefsState.ctrlClickName
        ? DEFAULT_PREFS.ctrlClickNameAction
        : "off";
      prefsState.ctrlClickDeadAction = prefsState.ctrlClickDead
        ? DEFAULT_PREFS.ctrlClickDeadAction
        : "off";
      persistLocal();
    }
  }
  // FT-1318: A STASH FROM BEFORE THE COIN PREF — the coin lab persisted its
  // pick under coinArt's own "golem.coin" key, which that module has already
  // read and sanitized by the time this runs (coinChoice.id IS that value).
  // A stash without the key seeds from it, so a browser that chose a coin in
  // the lab keeps its look; persisted at once, the conversions' own rule.
  // (Runs outside the raw check on purpose: a browser with a lab pick and no
  // stash at all deserves the same seeding.)
  if (!(raw && "coinArt" in raw) && prefsState.coinArt !== coinChoice.id) {
    prefsState.coinArt = sanitize("coinArt", coinChoice.id);
    persistLocal();
  }
  return prefsState;
}

/** One write: validate, remember for this BROWSER — and, signed in, for
 *  this PERSON (FT-1202: the same value rides up to the account's ui-state
 *  bag, best-effort, so it is waiting on their next machine). */
export function setPref(key, value) {
  const clean = sanitize(key, value);
  if (clean === undefined) return;
  prefsState[key] = clean;
  persistLocal();
  notifyPrefs();
  if (syncedAccountId) patchAccountPrefs({ [ACCOUNT_PREFIX + key]: clean });
}

// Read once at import. There is no town to wait for and no socket to hear from
// — a personal setting is knowable the moment the page has a localStorage.
loadPrefs();

// FT-1318: the coin pref PAINTS. Repaint on every landing — this load, a
// setPref from any surface, an account pull — through the same event every
// prefs surface already listens on, so no landing path needs its own call.
// applyCoin sanitizes again and keeps the lab's "golem.coin" key warm, so
// the dev coin lab's highlight and this pref never disagree at rest.
try {
  window.addEventListener(PREFS_EVENT, () => applyCoin(prefsState.coinArt));
} catch (e) {
  // no window (tests): the pref still holds; there is nothing to paint
}
applyCoin(prefsState.coinArt);
