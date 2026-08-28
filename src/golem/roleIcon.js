/**
 * Golem fork (FT-1272): A CHARACTER'S OWN ICON, from wherever it came from.
 *
 * Three surfaces had already written this same eight lines by hand —
 * NightSheet's checklist rows, ScriptView's cards, and (before FT-857 moved
 * it) EditionModal — and FT-1272 wanted a fourth: the night ask standing on
 * the clock face, whose header now leads with the role's icon. A fourth copy
 * is the point at which "everyone writes it" becomes "nobody owns it", so the
 * definition lands here, in the same `golem/` shelf every other cross-surface
 * fact lives on (belief, glyphs, nightInfo).
 *
 * THE THREE SOURCES, in the order they are asked:
 *   1. `role.golemIconData` — a forged character carries its own artwork
 *      inline (a data URI), and that always wins: it IS the character.
 *   2. the shipped PNG for this role id, when the base edition knows the id.
 *   3. `role.imageAlt` — a homebrew role naming a shipped icon to borrow.
 *   ...and `custom.png` when none of that resolves, so a caller never has to
 *   handle an empty string mid-render.
 *
 * `require` rather than `import`: the icon set is resolved by NAME at runtime
 * from a value the caller supplies, which is exactly the case a static import
 * cannot express. webpack turns the expression into its own context module
 * over the icons folder — the same mechanism the hand-written copies used.
 *
 * @param role      the role object (needs `id`; may carry golemIconData/imageAlt)
 * @param baseById  the store's `rolesJSONbyId` getter — a Map of the base
 *                  edition's roles. Passed IN rather than reached for: this
 *                  file is a plain module and does not import the store.
 * @returns a URL string, always — never "" for a role that exists.
 */
export function roleIconUrl(role, baseById) {
  if (!role) return "";
  if (role.golemIconData) return role.golemIconData;
  const known = baseById && baseById.has && baseById.has(role.id);
  const id = known ? role.id : role.imageAlt || "custom";
  try {
    return require("../assets/icons/" + id + ".png");
  } catch (e) {
    return require("../assets/icons/custom.png");
  }
}
