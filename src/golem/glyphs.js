/**
 * Golem fork: ONE source of truth for the fork's own icon art, so "the glyph
 * for team X" is defined once instead of copied into every surface that shows
 * a team (it was three copies before this, and each had drifted onto a
 * different Font Awesome fallback).
 *
 * Two families, deliberately different, because they mean different things:
 *
 *  - TEAM_GLYPHS — flat team colour, negative space instead of line work,
 *    96px tall. demon/outsider are the user's own cut art; townsfolk, minion
 *    and traveller were baked to sit beside them without looking like a
 *    different set (claude_temp_test/2026-08-18-count-icons-bake.mjs).
 *  - COUNT_ICONS — the chrome treatment the player strip and the moons wear:
 *    bone tone, one light origin, film grain, no traced outline.
 *
 * Consumers: TownInfo (the town square's counts), ScriptView (the workbench
 * composition meter), RoleDrawer (group headers), EditionModal (team toggles
 * and the role form's team picker).
 */
import demonGlyph from "../assets/blood/demon-glyph.png";
import minionGlyph from "../assets/blood/minion-glyph.png";
import outsiderGlyph from "../assets/blood/outsider-glyph.png";
import townsfolkGlyph from "../assets/blood/townsfolk-glyph.png";
import travelerGlyph from "../assets/blood/traveler-glyph.png";

import aliveIcon from "../assets/ui-alive.png";
import deadIcon from "../assets/ui-dead.png";
import nightIcon from "../assets/ui-night.png";
import townIcon from "../assets/ui-town.png";
import votesIcon from "../assets/ui-votes.png";

/** The glyph for each team. Both spellings of traveller answer. */
export const TEAM_GLYPHS = {
  townsfolk: townsfolkGlyph,
  outsider: outsiderGlyph,
  minion: minionGlyph,
  demon: demonGlyph,
  traveler: travelerGlyph,
  traveller: travelerGlyph
};

/**
 * @param {string} team one of townsfolk / outsider / minion / demon / traveller
 * @returns {string|null} the image src, or null so a caller can fall back
 */
export const teamGlyph = team => TEAM_GLYPHS[team] || null;

/**
 * The town square's counts. `votes` and `night` reuse the player strip's own
 * art rather than baking a second gallows and a second moon — in this fork a
 * gallows already means "the vote", and the vote count is how many hands
 * could send someone to it.
 */
export const COUNT_ICONS = {
  town: townIcon,
  alive: aliveIcon,
  dead: deadIcon,
  votes: votesIcon,
  night: nightIcon
};

export default { TEAM_GLYPHS, teamGlyph, COUNT_ICONS };
