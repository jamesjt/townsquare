/**
 * Golem fork (FT-861): THE BELIEVED ROLE — pure helpers for the one axis a
 * seat carries besides its truth.
 *
 * A seat has TWO facts about its character, and they are not the same fact:
 *
 *   WHAT IT IS      `player.role`          — the grimoire's truth. What
 *                                            actually resolves: a real Imp's
 *                                            kill happens.
 *   WHAT IT IS TOLD `player.believedRole`  — the character this seat's player
 *                                            was handed. Null means "they were
 *                                            told the truth", which is the
 *                                            overwhelming majority of seats.
 *
 * ONE nullable field covers every character who does not know what they are:
 * the Drunk (an Outsider who thinks they are a Townsfolk), the Lunatic (thinks
 * they are the Demon), the Marionette (thinks they are a good character) — and
 * anything a storyteller invents on the night. There is deliberately no
 * `isDrunk` boolean: a boolean would need a second one for the Lunatic, a
 * third for the Marionette, and none of them could say WHAT the player thinks
 * they are, which is the only thing the app has to deliver.
 *
 * THERE IS A THIRD AXIS AND THIS IS NOT IT.
 *   REGISTERS-AS — how a character appears to OTHER players' abilities (the
 *   Recluse registering as evil, the Spy as good) — is a different question
 *   with a different shape: it is per-ability, per-look, and the storyteller
 *   decides it at the moment of the look rather than storing it on the seat.
 *   Nothing here is named `appearsAs` / `seenAs` for exactly that reason; when
 *   registers-as is built it gets its own field and does not borrow this one.
 */

/**
 * The role this seat's PLAYER thinks they have — their belief when one is set,
 * the truth otherwise. Every surface that speaks to a player reads this and
 * never `player.role`.
 *
 * @param player a seated player
 * @returns {object} a role object (possibly the empty `{}` of an open chair)
 */
export function beliefOf(player) {
  if (!player) return {};
  const believed = player.believedRole;
  if (believed && believed.id) return believed;
  return player.role || {};
}

/**
 * Is this seat living a lie? True only when a belief is set AND differs from
 * the truth — setting the belief to the seat's own character is the same as
 * setting none, and must not light up the storyteller's scan marks.
 *
 * @param player a seated player
 * @returns {boolean}
 */
export function isBelieving(player) {
  if (!player) return false;
  const believed = player.believedRole;
  const truth = player.role || {};
  return !!(believed && believed.id && believed.id !== truth.id);
}
