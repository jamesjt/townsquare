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

/**
 * FT-986: THE ALIGNMENT A PLAYER CURRENTLY BELIEVES THEY HOLD — 'good' or
 * 'evil' — for any surface that wants to colour itself by "which side is
 * this seat's player on" WITHOUT asking the seat's true role. Built off
 * `beliefOf()`, so it inherits the same rule: a Lunatic (true team
 * outsider/good, believed role a Demon) reads back 'evil' here, because
 * that is the side its player has been shown, and a border or highlight
 * that answered with the truth would out the deception through the
 * interface instead of the storyteller's mouth.
 *
 * The good/evil split itself is not invented for this: it mirrors
 * EndGameOverlay.vue's own derivation (minion/demon → evil, everything
 * else → good — travelers and fabled are not modelled as an alignment
 * there either, and this follows suit rather than making a second call).
 *
 * @param player a seated player, or null/undefined for "no seat"
 * @returns {"good"|"evil"|null} null when there is no role to read yet —
 *   an open chair, or a game that has not distributed roles. A caller
 *   should treat null as "say nothing", never guess a colour.
 */
export function believedAlignment(player) {
  const role = beliefOf(player);
  if (!role || !role.id) return null;
  return role.team === "minion" || role.team === "demon" ? "evil" : "good";
}
