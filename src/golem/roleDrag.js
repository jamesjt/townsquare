/**
 * Golem fork (FT-859): THE ROLE DRAG — one definition of "pick a character up
 * and carry it to a chair", shared by every surface that offers the gesture.
 *
 * Consumers today:
 *   · the grimoire drawer's role rows   (RoleDrawer)
 *   · the build panel's unseated tray   (RoleTray)
 *   · a SEATED coin, dragged off its chair (Player) — FT-1090
 *
 * The seat is the other half of the contract: Player.onRoleDrop reads
 * `golem/role`, looks the id up in the store and runs it through placeRole,
 * which owns the one-chair-per-role rule. Nothing here bypasses that.
 */

/**
 * FT-1090: THE GHOST STAGE — a hidden corner of the document where the drag
 * images live, laid out and decoded, BEFORE any drag begins.
 *
 * WHY IT HAD TO EXIST (this is the bug the lane was opened for, and it hit
 * every surface, not just the seat coin). The old code built its ghost inside
 * `dragstart`:
 *
 *     const img = new Image();
 *     img.src = roleIcon(role);        // ← a network/cache fetch STARTS here
 *     document.body.appendChild(img);
 *     e.dataTransfer.setDragImage(img, 42, 42);
 *
 * `setDragImage` snapshots the element on the spot. An `<img>` whose `src`
 * was assigned microseconds earlier has `complete === false` and
 * `naturalWidth === 0` — there is no bitmap to snapshot yet — so the browser
 * silently kept its own default ghost and the icon never followed the
 * pointer. Nothing throws; the call just does nothing. That is why the tray
 * looked broken too, not only the seat.
 *
 * THE FIX IS TO MOVE THE DECODE OFF THE DRAG'S CRITICAL PATH. Every surface
 * that PAINTS a role icon calls `roleIcon()` to do it, so `roleIcon()` is
 * also where the ghost gets warmed: the moment a character is drawn anywhere
 * (tray tile, drawer row, seat coin), its 84px ghost is built, attached to
 * this stage and left there, decoded and laid out. By the time a pointer goes
 * down on it — a whole render later, at the very least — `complete` is true
 * and `setDragImage` has a real bitmap to take.
 *
 * THE STAGE IS OFF-VIEWPORT, NOT HIDDEN. `display: none` / `visibility:
 * hidden` / a detached element all make `setDragImage` a no-op again; a
 * rendered element parked at -10000px does not. It takes no pointer events
 * and no layout room (`width: 0; height: 0`), so it cannot touch the page.
 */
const GHOST_PX = 84;
let stage = null;

const ghostStage = () => {
  if (stage && stage.isConnected) return stage;
  if (typeof document === "undefined") return null;
  stage = document.createElement("div");
  stage.setAttribute("data-golem-drag-ghosts", "");
  stage.style.cssText =
    "position:fixed;top:-10000px;left:-10000px;width:0;height:0;" +
    "overflow:visible;pointer-events:none;";
  document.body.appendChild(stage);
  return stage;
};

// src -> the decoded <img> standing on the stage. Keyed by the resolved icon
// URL rather than by role id, so two roles sharing art share one ghost.
const ghosts = new Map();
// A script is ~25 characters and the drawer holds the whole edition; the cap
// is a courtesy against a long session opening many scripts, not a live
// constraint. Oldest first, which is Map's own iteration order.
const GHOST_CAP = 96;

/**
 * Build (or fetch) the ghost for an icon URL and leave it warming on the
 * stage. Returns the element — `complete`/`naturalWidth` say whether it is
 * ready; callers must not assume it is.
 */
const warmIcon = (src) => {
  if (!src) return null;
  const found = ghosts.get(src);
  if (found) return found;
  const host = ghostStage();
  if (!host) return null;
  const img = new Image();
  img.alt = "";
  img.decoding = "sync";
  img.width = GHOST_PX;
  img.height = GHOST_PX;
  img.style.cssText = `width:${GHOST_PX}px;height:${GHOST_PX}px;`;
  img.src = src;
  host.appendChild(img);
  ghosts.set(src, img);
  if (ghosts.size > GHOST_CAP) {
    const oldest = ghosts.keys().next().value;
    const dead = ghosts.get(oldest);
    if (dead && dead.parentNode) dead.parentNode.removeChild(dead);
    ghosts.delete(oldest);
  }
  return img;
};

/** The bare resolution, with no warming — see `roleIcon` for the public one. */
const iconSrc = (role) => {
  if (!role) return "";
  if (role.golemIconData) return role.golemIconData;
  try {
    return require("../assets/icons/" + role.id + ".png");
  } catch (e) {
    return require("../assets/icons/" + (role.imageAlt || "custom") + ".png");
  }
};

/**
 * The engraving a role wears: a locally baked icon first (custom roles carry
 * one as a data URL), then the bundled art for its id, then the team-generic
 * mark. Mirrors Token / RoleHoverCard's resolution.
 *
 * FT-1090: asking for the art is also what warms its drag ghost (see the
 * stage note above). Every surface that paints a role already calls this, so
 * no consumer had to learn a second step.
 */
export const roleIcon = (role) => {
  const src = iconSrc(role);
  warmIcon(src);
  return src;
};

/**
 * FT-1090: warm a role's ghost WITHOUT painting it through this module. The
 * seat coin is the one surface that resolves its own art (Token.vue owns that
 * markup), so Player calls this as its role changes and the coin's drag gets
 * the same ready-made ghost every other surface gets.
 */
export const warmRoleIcon = (role) => {
  if (!role || !role.id) return;
  warmIcon(iconSrc(role));
};

/**
 * Hang the role's icon on the pointer for this drag. Shared by every surface
 * that offers the gesture — the payload each one writes is its own business
 * (`golem/role` from a tray, `golem/from` from a seat), the ghost is not.
 *
 * A ghost that is not decoded yet is NOT passed to `setDragImage`: handing it
 * an empty image is exactly the silent no-op this lane came to fix, and the
 * browser's own default ghost is a better answer than nothing. Warming it
 * here means the next drag of that character has one.
 */
export const setRoleDragImage = (role, e) => setDragImageSrc(iconSrc(role), e);

/**
 * FT-1117: the same ghost, for a surface that resolves its OWN art rather than
 * a role's — a REMINDER token, whose face is `assets/icons/{imageAlt||role}.png`
 * (or the role's own image under the grimoire's opt-in) and is therefore
 * already a URL by the time the drag starts.
 *
 * This is the whole of `setRoleDragImage` with the role lookup lifted out, and
 * `setRoleDragImage` now calls it — one definition of "warm it, refuse it if it
 * is not decoded, hand it to setDragImage centred". Rolling a second copy for
 * the reminder is exactly how the cold-cache no-op FT-1090 paid for comes back.
 */
export const setDragImageSrc = (src, e) => {
  if (!src || !e || !e.dataTransfer) return false;
  const img = warmIcon(src);
  if (!img || !img.complete || !img.naturalWidth) return false;
  try {
    e.dataTransfer.setDragImage(img, GHOST_PX / 2, GHOST_PX / 2);
    return true;
  } catch (err) {
    // older engines keep the default ghost — harmless
    return false;
  }
};

/** FT-1117: warm an arbitrary icon URL's ghost off the drag's critical path —
 *  the reminder's counterpart to `warmRoleIcon`. Called as a seat paints its
 *  tokens, so the first drag of one already has a decoded bitmap. */
export const warmIconSrc = (src) => {
  if (src) warmIcon(src);
};

/**
 * Start a drag that a SEAT will accept as an assignment. The pointer carries
 * the role's icon alone, at the size it lands on the chair — not a screenshot
 * of whichever row or tile it was picked up from.
 */
export const startRoleDrag = (role, e) => {
  if (!role || !role.id) return;
  e.dataTransfer.setData("golem/role", role.id);
  e.dataTransfer.effectAllowed = "copy";
  setRoleDragImage(role, e);
};

/**
 * FT-1090: the SEAT's own half of the gesture (user: "same when I drag a role
 * off a player coin"). A seated coin dragged to another chair swaps, and
 * dropped anywhere else it goes back to the tray — both of which are decided
 * by the `golem/from` payload, NOT by the ghost, so this writes exactly what
 * Player.onRoleDragStart always wrote and only adds the icon.
 *
 * `golem/from` is load-bearing beyond this call: roleUnseat.js's document
 * listener watches for that type in `dataTransfer.types` to arm the
 * unseat-on-drop-outside path, and Player.onRoleDrop reads it to decide a
 * swap. Neither the type nor the "move" effect may drift.
 */
export const startSeatRoleDrag = (role, index, e) => {
  e.dataTransfer.setData("golem/from", String(index));
  e.dataTransfer.effectAllowed = "move";
  setRoleDragImage(role, e);
};
