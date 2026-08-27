/**
 * Golem fork (FT-1237): THE LABS SWITCH — a LOCAL, per-browser override of
 * the platform's `labs` flag, so the gated surfaces (the guide's lanterns
 * today, whatever joins them) can be flipped for testing without the /admin
 * console.
 *
 * THE MODEL. Three states, one stored value:
 *   - unset (nothing in localStorage): `session.labs` follows the account —
 *     whatever the boot fetch of /api/flags/self said, exactly as before.
 *   - "on" / "off": the local word wins over the server's, in BOTH
 *     directions — off silences a flag the server turned on, too.
 * Clicking the hidden corner (LabsSwitch.vue) CYCLES unset → on → off →
 * unset, so "follow the server again" is always one more click, never a
 * devtools trip.
 *
 * ONE FIELD FOR EVERY READER. The effective verdict is still committed to
 * `session/setLabs` — the same store field every gated surface already
 * watches (HotkeyHelp's v-if, the lanterns, FT-1236's toggle when it lands)
 * — so nothing downstream knows this switch exists. The SERVER's own verdict
 * is remembered here, module-scope, purely so clearing the override can fall
 * back to it without refetching.
 *
 * The stored value is mirrored in a module `let` so a localStorage that
 * throws (private mode) still leaves a working toggle for the page's life.
 */

const KEY = "golem.labsOverride"; // "on" | "off"; absent = follow the account

/** The account's own verdict, as initFlags last heard it. */
let serverLabs = false;

/** The override, read once at load and kept live by cycleLabs below. */
let override = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
})();

/** Commit the effective verdict — the one field every reader watches. */
const apply = (store) => {
  store.commit("session/setLabs", override ? override === "on" : serverLabs);
};

/**
 * initFlags' landing spot (golem/account.js): the server's verdict arrives
 * here instead of going straight to the store, so a standing override keeps
 * winning across the boot fetch resolving.
 */
export function setServerLabs(store, verdict) {
  serverLabs = !!verdict;
  apply(store);
}

/**
 * Boot (LabsSwitch.vue's created): make a stored override count even before
 * — or entirely without — the platform answering the flags fetch.
 */
export function applyLabsOverride(store) {
  apply(store);
}

/**
 * One click of the hidden corner: unset → on → off → unset. Returns the new
 * override ("on" | "off" | null) so the caller can say it out loud.
 */
export function cycleLabs(store) {
  override = override === null ? "on" : override === "on" ? "off" : null;
  try {
    if (override) localStorage.setItem(KEY, override);
    else localStorage.removeItem(KEY);
  } catch {
    // private mode — the in-memory mirror still carries this page's session
  }
  apply(store);
  return override;
}
