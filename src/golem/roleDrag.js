/**
 * Golem fork (FT-859): THE ROLE DRAG — one definition of "pick a character up
 * and carry it to a chair", shared by every surface that offers the gesture.
 *
 * Consumers today:
 *   · the grimoire drawer's role rows   (RoleDrawer)
 *   · the build panel's unseated tray   (RoleTray)
 *
 * The seat is the other half of the contract: Player.onRoleDrop reads
 * `golem/role`, looks the id up in the store and runs it through placeRole,
 * which owns the one-chair-per-role rule. Nothing here bypasses that.
 */

/**
 * The engraving a role wears: a locally baked icon first (custom roles carry
 * one as a data URL), then the bundled art for its id, then the team-generic
 * mark. Mirrors Token / RoleHoverCard's resolution.
 */
export const roleIcon = role => {
  if (!role) return "";
  if (role.golemIconData) return role.golemIconData;
  try {
    return require("../assets/icons/" + role.id + ".png");
  } catch (e) {
    return require("../assets/icons/" + (role.imageAlt || "custom") + ".png");
  }
};

// The ghost is alive for exactly one turn of the event loop: the browser
// snapshots it inside setDragImage and never reads the element again.
let ghost = null;

/**
 * Start a drag that a SEAT will accept as an assignment. The pointer carries
 * the role's icon alone, at the size it lands on the chair — not a screenshot
 * of whichever row or tile it was picked up from.
 */
export const startRoleDrag = (role, e) => {
  if (!role || !role.id) return;
  e.dataTransfer.setData("golem/role", role.id);
  e.dataTransfer.effectAllowed = "copy";
  const img = new Image();
  img.src = roleIcon(role);
  img.style.cssText =
    "position:fixed;top:-1000px;left:-1000px;width:84px;height:84px;";
  document.body.appendChild(img);
  ghost = img;
  try {
    e.dataTransfer.setDragImage(img, 42, 42);
  } catch (err) {
    // older engines keep the default ghost — harmless
  }
  setTimeout(() => {
    if (ghost) {
      ghost.remove();
      ghost = null;
    }
  }, 0);
};
