// Golem fork (FT-949): THE DROP-OUTSIDE-TO-UNSEAT TARGET, MOVED OFF THE TRAY.
//
// This used to live entirely inside RoleTray.vue's mounted()/beforeDestroy() —
// which meant the listeners existed only while the build panel did. HostTools
// (and RoleTray inside it) unmounts the moment the host presses Start
// (App's `showHostTools` goes false), so a role dragged off a seat MID-GAME
// had a `dragstart` and nothing to catch its `drop`: silent nothing-happens
// (user report, twice).
//
// The fix is a change of OWNER, not a rewrite — every piece of the original
// logic is load-bearing (see the comments carried over below, unchanged).
// App.vue is mounted for the whole session, so it installs these document
// listeners once and they never go away. RoleTray no longer owns the target;
// it only reads whether it is armed, via `roleUnseatState`, so its own
// highlight still lights up while the tray is on screen.
//
// FT-1025: the target now catches a SPECTATOR's (plain player's) drag too —
// see onDocDrop's own doc comment for the seat-ownership boundary and why
// nothing about this ever reaches the wire.
import Vue from "vue";
// FT-1270: the own-seat rule, shared with the drop-ONTO-a-seat half of the
// same gesture (Player.placeRole). It was written out inline below until this
// lane needed the identical test in a second place — see its own note.
import { isOwnClaimedSeat } from "./roleDrag";

/** Live, read by RoleTray's template (Vue 2 reactivity via Vue.observable —
 *  the same trick golem/coinArt.js and golem/bloodScrollbar.js use for their
 *  own cross-component state). */
export const roleUnseatState = Vue.observable({ armed: false });

let installed = false;

/**
 * Is this OUR drag — a role leaving a seat? `types` is the only part of the
 * payload a drag is allowed to read before the drop, which is exactly what we
 * need: a file drag, a text selection, the Almanac's row reorder (which sets
 * nothing at all) and the tray's own `golem/role` drag all fail this test, so
 * none of them can ever clear a chair.
 */
function isSeatDrag(e) {
  const types = e.dataTransfer && e.dataTransfer.types;
  if (!types) return false;
  return Array.prototype.indexOf.call(types, "golem/from") >= 0;
}

/**
 * A surface that already owns this drop: a seat (assign / swap) or the
 * grimoire drawer (its own unassign). DOM ancestry, not coordinates — the
 * seats sit inside rotated, clipped boxes where a rect test would lie.
 */
function ownsDrop(e) {
  const el = e.target;
  return !!(el && el.closest && el.closest(".player, .role-drawer"));
}

/**
 * Install the target once for the whole session. Called from App.mounted —
 * never torn down, because App is the root component and outlives every
 * game it hosts (there is no equivalent beforeDestroy to hang a removal on).
 */
export function installRoleUnseat(store) {
  if (installed) return;
  installed = true;

  function onDocDragOver(e) {
    if (!isSeatDrag(e)) return;
    // the tray lights up for the whole gesture, including over a seat —
    // it is telling you where the role goes if you let go out here
    roleUnseatState.armed = true;
    // FT-1025: the blanket spectator refusal that used to live here is
    // GONE — a player now gets to drop too (see onDocDrop below for the
    // seat-by-seat boundary; dragover cannot read `golem/from`, only
    // `types`, so which seat this is is not knowable until the drop).
    if (ownsDrop(e)) return;
    // ONLY a drag we would actually accept makes the page a drop target
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  /**
   * The drop landed outside every seat: the chair gives its character back.
   *
   * A drag that never drops — Escape, or a release over browser chrome —
   * fires `dragend` and no `drop` at all, so it changes nothing. That is
   * why the unassign lives here and not in onDocDragEnd.
   *
   * FT-1025: A SPECTATOR (plain player) DROPS HERE TOO NOW — sweeping a
   * stale, locally-rendered token off a seat that is not theirs (the
   * haunting FT-949 didn't reach: a browser that once hosted a town, then
   * joins a LATER town as a player, can still be carrying leftover local
   * role art on seats it never had any business knowing about).
   *
   * THE BOUNDARY: a player's OWN claimed seat is refused below, same as a
   * host is never refused. Their own seat's role is live game state, dealt
   * by the host over the wire — the one piece of role data on a player's
   * client that is NOT a local leftover — so it does not get this
   * dismiss-from-view exit. Every other seat, for a plain player, only
   * ever holds locally-rendered display data (the grimoire itself is never
   * sent to a player — see socket.js's sendPlayer/sendGamestate), so
   * clearing it is always safe to do silently.
   *
   * AND IT NEVER SYNCS, for a player exactly the same way it already does
   * not sync anything the host isn't allowed to broadcast: this reuses the
   * same `players/update` mutation the host's own drag-off-to-unseat uses
   * (below), and that mutation's own dispatch (store/socket.js's
   * subscriber → `sendPlayer`) is unconditionally spectator-gated —
   * `sendPlayer` opens with `if (this._isSpectator …) return;` — so this
   * commit runs the exact same code path for a player as for the host,
   * and only the host's copy of that path is ever allowed to reach the
   * wire. No new sync guard was written for this feature; the existing
   * one already does the job.
   */
  function onDocDrop(e) {
    roleUnseatState.armed = false;
    if (!isSeatDrag(e) || ownsDrop(e)) return;
    const from = e.dataTransfer.getData("golem/from");
    if (from === "") return;
    const player = store.state.players.players[Number(from)];
    if (!player || !player.role || !player.role.id) return;
    // The seat-ownership boundary (see the doc comment above): a player's
    // own dealt seat refuses the drop. In the ordinary gesture this branch
    // is never reached — Player.vue's `draggable` gate is what actually
    // stops the drag from starting on your own seat — but the drop target
    // is a bare document listener with no view of which seat a drag came
    // from until now, so the same rule is re-checked here as the real
    // enforcement point.
    // FT-1270: the same four clauses, now read from one place
    // (golem/roleDrag's `isOwnClaimedSeat`) so this rule and the drop-onto-a-
    // seat rule cannot drift apart. Byte-for-byte the same test as before.
    if (isOwnClaimedSeat(store.state.session, player)) {
      return;
    }
    e.preventDefault();
    store.commit("players/update", {
      player,
      property: "role",
      value: {},
    });
  }

  /** Every drag ends here, dropped or cancelled — the highlight goes out
   *  and nothing else happens. */
  function onDocDragEnd() {
    roleUnseatState.armed = false;
  }

  document.addEventListener("dragover", onDocDragOver);
  document.addEventListener("drop", onDocDrop);
  document.addEventListener("dragend", onDocDragEnd);
}
