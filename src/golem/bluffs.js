/**
 * Golem fork (2026-08-19): WHO HOLDS THE DEMON'S BLUFFS.
 *
 * Three characters not in play, which the demon may claim. Until now they were
 * a storyteller-only panel and never crossed the socket at all; they now reach
 * the one seat that is entitled to them — and the Lunatic's seat, which must be
 * entitled to exactly the same thing for the character to work.
 *
 * ONE TEST, BOTH SIDES OF THE WIRE. `believesDemon` reads `beliefOf(player)`,
 * so it answers the same question from either end without a branch:
 *
 *   on the STORYTELLER's client   `player.role` is the truth and
 *                                 `player.believedRole` the lie, so the real
 *                                 demon (no belief → role) and the Lunatic
 *                                 (belief → a demon) both return true.
 *   on a PLAYER's client          nobody's belief is ever sent; what arrives is
 *                                 `role = beliefOf(seat).id` (socket.js's
 *                                 distributeRoles), so a Lunatic's own client
 *                                 literally HOLDS a demon in its seat. The same
 *                                 line returns true for the same reason.
 *
 * That identity is the whole safety argument for the Lunatic: their client runs
 * the same code over the same data as the real demon's, so there is no timing,
 * no wording and no shape for them to notice. A second code path that only
 * fires for the Lunatic would be a tell by construction — the thing we are
 * trying not to build.
 */
import { beliefOf } from "./belief";

/** How many bluffs a demon is given. */
export const BLUFF_COUNT = 3;

/**
 * Does this seat's PLAYER believe they are the demon? True for the real demon
 * and for the Lunatic; false for a Marionette (who believes a good character),
 * and false for a demon whose storyteller has told them they are something
 * else — in every case, "what this chair thinks it is".
 */
export function believesDemon(player) {
  if (!player) return false;
  const role = beliefOf(player);
  return !!role && role.team === "demon";
}

/**
 * The seat THIS client holds, or -1. The seat's own `id` is the identity the
 * rest of the app already uses for "you" (Player.vue's `you` class), so this
 * asks the same question the same way rather than trusting `claimedSeat`,
 * which is a local optimistic value the storyteller has not confirmed yet.
 */
export function ownSeatIndex(players, session) {
  if (!players || !session || !session.playerId) return -1;
  return players.findIndex((p) => p.id && p.id === session.playerId);
}

/**
 * The seat the cluster hangs off: the first seat whose CHARACTER is a demon,
 * or -1 when none is dealt yet (an undealt town, a script mid-build).
 *
 * Note which field this reads — `role`, the character ON the chair, not the
 * belief. On the STORYTELLER's client that is the real demon. On a demon's or
 * a Lunatic's own client it is their own chair, because it is the only chair
 * with a character on it at all; every other seat arrives blank. One line,
 * both meanings, no branch.
 */
export function demonSeatIndex(players) {
  if (!players) return -1;
  return players.findIndex((p) => p.role && p.role.team === "demon");
}

/**
 * May this client see the three bluffs?
 *
 *   STORYTELLER — yes. The bluffs are their own working note.
 *   A PLAYER    — only if their OWN chair believes it is the demon.
 *
 * THE TWO BRANCHES ANSWER DIFFERENT QUESTIONS, and that is the whole of this
 * function: `!session.isSpectator` asks "is this the storyteller", and the
 * player branch asks "does this seat believe it is the demon". Neither has
 * ever leaned on the other, and the player branch below is untouched.
 *
 * FT-1294: the storyteller branch used to read `return !grimoire.isPublic` —
 * "yes, unless the grimoire is face down", the mirrored-display case. The
 * face-down state is retired (see store/index.js), so what is left is the
 * question that branch was really asking all along: are you the storyteller.
 * The player branch never consulted the flag, so nothing there widened — a
 * player still reaches this only through their own chair's belief.
 *
 * @param state the root store state
 */
export function canSeeBluffs(state) {
  if (!state) return false;
  const { session } = state;
  if (!session.isSpectator) return true;
  const players = state.players.players;
  const seat = ownSeatIndex(players, session);
  return seat >= 0 && believesDemon(players[seat]);
}
