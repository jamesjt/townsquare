/**
 * Golem fork (FT-1084): THE DEAL CHOOSES THE LIES.
 *
 * Two things a storyteller used to fill in by hand after every deal, and both
 * are the same shape of decision — "a character from this script that is NOT
 * sitting on a chair":
 *
 *   THE DEMON'S BLUFFS   three good characters not in play, which the demon
 *                        may claim (players.bluffs).
 *   A SEAT'S BELIEF      what a Drunk / Lunatic / Marionette is TOLD they are
 *                        (player.believedRole — see golem/belief.js).
 *
 * Delivery for both was already proven (FT-1073): a bluff set here reaches the
 * demon, a belief set here reaches its own seat as that seat's character. What
 * never happened was the CHOOSING — an unset demon opened three blank coins and
 * every Drunk wore the "?" placeholder until somebody clicked it.
 *
 * ONE POOL, DRAWN ONCE. Bluffs and beliefs are picked in the same pass off the
 * same not-in-play pool, and nothing is drawn twice. That is not tidiness: a
 * Drunk who thinks they are the Empath will CLAIM Empath, so a demon bluffing
 * Empath is two players claiming one character out of the storyteller's own
 * defaults — the exact collision a storyteller filling these by hand avoids
 * without thinking about it. Beliefs are drawn FIRST because their pool is the
 * narrower one (one team, fixed by the character's own ability text), and the
 * bluffs take what is left.
 *
 * PURE, AND IT TAKES THE ROSTER RATHER THAN THE STORE, so the whole decision is
 * one function that can be reasoned about (and later tested) without a session,
 * a socket or a Vue instance. The store action that consumes it —
 * players/dealLies — does nothing but commit what comes back.
 *
 * PRIVACY IS NOT THIS FILE'S PROBLEM AND THAT IS DELIBERATE. It returns
 * storyteller-side data into storyteller-side state; every existing guard on
 * the way out (socket.js's `sendPlayer` routing `believedRole` to `_sendBelief`,
 * `sendBluffs` addressing only seats that `believesDemon`) is untouched and
 * still the only thing that decides who learns what. Choosing earlier does not
 * move that line — it only means the fields are already filled when the deal
 * crosses it.
 */
import { BLUFF_COUNT } from "./bluffs";
import { BELIEVES_OTHER, believesOther } from "./nightInfo";

/**
 * The teams a demon may be handed as a bluff: the classic three are good
 * characters — the demon claims to be one of them, and claiming a minion or a
 * second demon is not a claim anybody makes. Travellers are excluded by
 * `scriptRoles` below for the same reason RoleModal hides the traveller tab
 * for a bluff: a traveller is added mid-game, never dealt.
 */
export const BLUFF_TEAMS = ["townsfolk", "outsider"];

/** The team a believing character is told they belong to, per BELIEVES_OTHER's
 *  own `pool` — the Drunk a Townsfolk, the Lunatic a Demon. Falls back to
 *  townsfolk for a character added to that table without one. */
function poolTeam(role) {
  const entry = (role && BELIEVES_OTHER[role.id]) || {};
  return entry.pool || "townsfolk";
}

/** Fisher-Yates. The `sort(() => Math.random() - 0.5)` this fork uses elsewhere
 *  is a biased shuffle; it does not matter for reordering seats, and it does
 *  matter here, where the FIRST element off the list is the whole draw.
 *
 *  FT-1117: exported, because the deal's OTHER chooser (golem/dealReminders.js,
 *  which picks the red herring's seat) draws the same way for the same reason. */
export function shuffled(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

/** Every character this script can hand out — the store's `roles` Map, minus
 *  travellers (never dealt, never bluffed, never believed). */
function scriptRoles(roles) {
  const list = [];
  if (!roles || typeof roles.forEach !== "function") return list;
  roles.forEach((role) => {
    if (role && role.id && role.team !== "traveler") list.push(role);
  });
  return list;
}

/**
 * Pick the demon's three bluffs and every believing seat's believed character.
 *
 * @param players the seating, in order — each seat's `role` is its TRUTH
 * @param roles the current script's roles (the store's `roles` Map)
 * @returns {{bluffs: object[], beliefs: {index: number, role: (object|null)}[]}}
 *   `bluffs` is always exactly BLUFF_COUNT long, an empty `{}` standing for a
 *   slot the script could not fill — so a caller writing all three clears
 *   whatever a previous deal left behind rather than leaving a stale character
 *   in slot three. `beliefs` names only the seats whose belief must CHANGE,
 *   `role: null` meaning "clear it" (a seat that no longer holds a believing
 *   character, or one the script has nothing legal left for).
 */
export function chooseLies({ players = [], roles, keepBluffs = null } = {}) {
  const pool = scriptRoles(roles);
  const inPlay = new Set();
  players.forEach((player) => {
    if (player && player.role && player.role.id) inPlay.add(player.role.id);
  });
  // Drawn once across both halves — see the file header on why the Drunk's
  // belief and the demon's bluffs must not name the same character.
  const taken = new Set();
  // FT-1383 (user, audited 2026-09-04): STAGED BLUFFS SURVIVE THE START.
  // `keepBluffs` is the storyteller's already-chosen set (the Start path
  // passes it; the drawer's deliberate re-deal does not) — a filled slot is
  // KEPT unless the deal just put that character into play, and its id
  // seeds `taken` so neither the belief half nor a refilled slot can
  // duplicate it. Before this, Start re-rolled all three over whatever the
  // storyteller had staged (players/dealLies via Menu.distributeRoles —
  // the audit's rig watched soldier/mayor/saint become a fresh draw).
  const kept = Array.isArray(keepBluffs) ? keepBluffs : [];
  kept.forEach((b) => {
    if (b && b.id && !inPlay.has(b.id)) taken.add(b.id);
  });
  const free = (team) =>
    shuffled(
      pool.filter(
        (role) =>
          role.team === team && !inPlay.has(role.id) && !taken.has(role.id),
      ),
    );

  const beliefs = [];
  players.forEach((player, index) => {
    const truth = (player && player.role) || {};
    if (!truth.id) return;
    if (!believesOther(truth)) {
      // A chair that used to lie and no longer does. Re-dealing moves
      // characters between chairs without touching this field, so without
      // this the last game's Drunk keeps wearing last game's belief while
      // holding the Empath for real.
      if (player.believedRole) beliefs.push({ index, role: null });
      return;
    }
    const team = poolTeam(truth);
    let pick = free(team)[0];
    if (!pick) {
      // NOTHING SPARE ON THAT TEAM — and for the Lunatic that is the normal
      // case, not the edge one: most scripts carry exactly one Demon and it is
      // dealt, so "a Demon not in play" does not exist. The Lunatic is then
      // told they are the Imp that is actually in play, which is the classic
      // play anyway (two players hearing the same character is the point of
      // the character). Falling back by TEAM rather than by role id keeps that
      // out of a name test — the Drunk simply never reaches this line on a
      // script with a spare Townsfolk.
      pick = shuffled(
        pool.filter(
          (role) =>
            role.team === team && role.id !== truth.id && !taken.has(role.id),
        ),
      )[0];
    }
    if (!pick) {
      // The script has no character of that team to offer at all. Leave the
      // seat with its "?" placeholder — the storyteller's own pick is still
      // one click away, exactly as before this feature existed.
      if (player.believedRole) beliefs.push({ index, role: null });
      return;
    }
    taken.add(pick.id);
    beliefs.push({ index, role: pick });
  });

  const spare = shuffled(
    pool.filter(
      (role) =>
        BLUFF_TEAMS.indexOf(role.team) >= 0 &&
        !inPlay.has(role.id) &&
        !taken.has(role.id),
    ),
  );
  const bluffs = [];
  for (let i = 0; i < BLUFF_COUNT; i++) {
    // FT-1383: a staged slot stands unless the deal made it illegal (the
    // character is in play now); only empty/illegal slots draw fresh.
    const held = kept[i];
    if (held && held.id && !inPlay.has(held.id)) {
      bluffs.push(held);
      continue;
    }
    const pick = spare.shift();
    if (pick) taken.add(pick.id);
    bluffs.push(pick || {});
  }

  return { bluffs, beliefs };
}
