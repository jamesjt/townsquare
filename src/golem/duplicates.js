/**
 * Golem fork (FT-946): THE rule for "is this character already in play" —
 * shared by every surface that lists a script's characters for a storyteller
 * to hand out, so "Duplicates" means the same thing everywhere it appears.
 *
 * `allowDupRoles` (store/index.js) is already the ONE global switch — Player's
 * own `placeRole`, RoleActions' chip, RoleDrawer's and RoleTray's checkboxes
 * all read it straight off `$store.state.allowDupRoles`, so that half needs no
 * wrapper here. What WAS duplicated is the other half of the pair: "how many
 * seats currently hold this role" — RoleDrawer had its own `placedCount`
 * method and the "Select the characters" picker (RolesModal) had none at all,
 * which is how it could list — and silently re-deal — a role already seated
 * while Duplicates was off.
 */

/** How many seats currently hold this role. */
export function placedCount(role, players) {
  if (!role || !players) return 0;
  return players.filter((p) => p.role && p.role.id === role.id).length;
}

/** Is this role already in play, blocked from being picked again? */
export function isBlockedByDupes(role, players, allowDup) {
  return !allowDup && placedCount(role, players) > 0;
}
