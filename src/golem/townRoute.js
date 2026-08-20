/**
 * Golem fork (FT-889) — the address bar tells the truth about where you are.
 *
 * One town, one URL. Being in town `x` means the address bar reads `/x` (any
 * query string kept); a BARE url means the entry screen, always. That makes
 * the URL the only thing that says which town you are in — nothing restores
 * you into your last town behind your back, and Back leaves the town.
 *
 * ROLE never comes from the URL. A link is an invitation, not a promotion:
 * whether `/x` seats you as the storyteller is decided by what THIS browser
 * holds — the town's edit key, or a shelf entry saying it hosted `x`. So a
 * host who reloads their own town stays host, and the same link handed to a
 * friend still joins them as a player.
 *
 * Every address-bar write in the app goes through syncAddressBar, called from
 * the ONE mutation every entry path funnels into (session/setSessionId, in
 * store/socket.js). The mode around it says how history should move:
 *   push    — a session began or ended, so Back should traverse it (default)
 *   replace — boot canonicalising the URL it was handed (adds no entry)
 *   silent  — the browser already moved (popstate); write nothing back
 */
import { editKeyFor, listTowns, normalizeTownId } from "./towns";

/**
 * Who this browser is in a given town: "host" | "player".
 * The shelf is the record — an edit key (an owned town) or a remembered
 * hosting visit. Falls back to the last-session stash, which still names the
 * town after a shelf entry has rotated off (see towns.js MAX).
 */
export function resolveTownRole(id) {
  const clean = normalizeTownId(id);
  if (!clean) return "player";
  if (editKeyFor(clean)) return "host";
  if (listTowns("host").some(town => town.id === clean)) return "host";
  return storedRoleFor(clean) || "player";
}

/**
 * The role recorded in the `session` stash ([isSpectator, id], written by
 * persistence.js), but only when it speaks about THIS town. Corroboration
 * only — the shelf above answers first.
 */
export function storedRoleFor(id) {
  const clean = normalizeTownId(id);
  try {
    const stash = JSON.parse(localStorage.getItem("session"));
    if (!Array.isArray(stash)) return null;
    if (normalizeTownId(stash[1]) !== clean) return null;
    return stash[0] ? "player" : "host";
  } catch (e) {
    return null; // unreadable stash — the shelf already had its say
  }
}

/** The address a town should live at: `/<town>` (or `/`), query string kept. */
export function townHref(id) {
  const clean = normalizeTownId(id);
  return (clean ? "/" + clean : "/") + window.location.search;
}

let historyMode = "push";

/** Run `fn` with a different history mode; restores the previous one after. */
export function withHistory(mode, fn) {
  const previous = historyMode;
  historyMode = mode;
  try {
    fn();
  } finally {
    historyMode = previous;
  }
}

/** True while a popstate is being applied — the guard the listener and the
 *  subscriber share, so neither writes history the other is reading. */
export function isReplayingHistory() {
  return historyMode === "silent";
}

/**
 * Point the address bar at `id` ("" = the entry screen). Note there is no
 * hash in anything this writes: a legacy `#town` link leaves as `/town`, and
 * leaving a town drops the hash instead of the old `location.hash = ""`.
 */
export function syncAddressBar(id) {
  if (historyMode === "silent") return; // the browser already moved us
  const href = townHref(id);
  const now =
    window.location.pathname + window.location.search + window.location.hash;
  if (now === href) return; // already true — say nothing, add no entry
  if (historyMode === "replace") {
    window.history.replaceState(null, "", href);
  } else {
    window.history.pushState(null, "", href);
  }
}

/**
 * Enter a town, role resolved locally. Spectator is committed BEFORE the
 * session id on purpose: the socket plugin connects on setSessionId and reads
 * the flag as it opens (LiveSession.connect), so a late commit would join the
 * relay under the wrong role.
 */
export function enterTown(store, id) {
  const clean = normalizeTownId(id);
  if (!clean) return;
  const role = resolveTownRole(clean);
  store.commit("session/clearVoteHistory");
  store.commit("session/setSpectator", role === "player");
  if (role === "player") store.commit("toggleGrimoire", false);
  store.commit("session/setSessionId", clean);
}

/**
 * Leave the current town for the entry screen. THE one way out — the leave
 * pill, a Back press, and a relay that closed the session all call here.
 *
 * Leaving takes the town off the screen, so the local mirror — seats, bluffs,
 * fabled, any live nomination — goes with it. Clearing the session id ALONE is
 * not leaving: seats on their own render the sessionless in-person square, so
 * a half-leave strands you in the last game's town with no way out. That was a
 * live bug on the relay's own close path, which cleared the id and nothing
 * else (FT-890 collapsed the duplicated sequences here to close it).
 */
export function leaveTown(store) {
  store.commit("session/setSpectator", false);
  store.commit("session/setSessionId", "");
  store.commit("session/nomination");
  store.commit("players/setBluff");
  store.commit("players/setFabled", { fabled: [] });
  store.commit("players/clear");
}
