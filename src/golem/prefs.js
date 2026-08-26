/**
 * Golem fork (FT-1168): THIS PERSON'S OWN SETTINGS.
 *
 * THE LINE THIS FILE EXISTS TO DRAW. The app now has two settings surfaces and
 * they must never grow into each other:
 *
 *   PERSONAL (here)      belongs to the human at this browser and follows them
 *                        into every town — how the setup panel is dressed, how
 *                        they operate a coin, how big the storyteller's post
 *                        stands. Nothing here is ever synced, and nothing here
 *                        is ever keyed by town.
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
export const SETUP_LABELS = [
  {
    value: false,
    label: "Names and marks",
    title: "Every setting on the setup panel says its name beside its mark",
  },
  {
    value: true,
    label: "Marks only",
    title:
      "The setup panel shows its marks alone, with no names beside them — for a storyteller who has learned them",
  },
];

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
  controlScheme: "click",
  grimoireSize: "small",
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
    default:
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

/** Read the stash over the defaults. Safe to call more than once. */
export function loadPrefs() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(KEY));
  } catch (e) {
    raw = null;
  }
  Object.assign(prefsState, DEFAULT_PREFS);
  if (raw && typeof raw === "object") {
    Object.keys(DEFAULT_PREFS).forEach((key) => {
      if (key in raw) prefsState[key] = sanitize(key, raw[key]);
    });
  }
  return prefsState;
}

/** One write: validate, remember for this BROWSER, tell the surfaces. */
export function setPref(key, value) {
  const clean = sanitize(key, value);
  if (clean === undefined) return;
  prefsState[key] = clean;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefsState));
  } catch (e) {
    // storage off: the choice still works for this session
  }
  notifyPrefs();
}

// Read once at import. There is no town to wait for and no socket to hear from
// — a personal setting is knowable the moment the page has a localStorage.
loadPrefs();
