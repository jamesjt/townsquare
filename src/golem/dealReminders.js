/**
 * Golem fork (FT-1117): THE DEAL PLACES THE REMINDERS IT IS TOLD TO PLACE.
 *
 * A reminder token has always been a STICKER: the storyteller opens the picker,
 * finds "Red herring", and drops it on a seat by hand, every single game. But
 * that particular sticker is not a note the storyteller writes — it is a
 * DECISION the game requires them to make at deal time, exactly like the
 * demon's bluffs and the Drunk's belief (golem/dealLies.js, FT-1084). Anything
 * the rules oblige you to choose the moment the roles land belongs to the deal.
 *
 * THIS FILE DOES NOT KNOW WHAT A FORTUNE TELLER IS, and that is the point.
 * The red herring is not special-cased anywhere in the code; the Fortune Teller
 * DECLARES it, in `src/roles.json`, and this module reads the declaration:
 *
 *     "reminders": [
 *       { "name": "Red herring", "deal": { "seats": 1, "eligible": "good", "self": "allow" } }
 *     ]
 *
 * THE SHAPE ANSWERS EXACTLY THREE QUESTIONS, because three is what an authored
 * rule of this kind has to answer and a fourth would be invented:
 *
 *   name       WHICH reminder — the same token the picker would have offered,
 *              so a dealt one and a hand-placed one are the same object.
 *   deal.seats HOW MANY seats get it. Default 1. Distinct seats; if the town
 *              cannot supply that many eligible chairs it places what it can.
 *   deal.eligible  WHICH seats may receive it: "good", "evil", "any" (default),
 *              or a literal team — "townsfolk" / "outsider" / "minion" /
 *              "demon". Travellers are never eligible (added mid-game, and
 *              their alignment is not in the character data at all) and an
 *              empty chair is never eligible.
 *   deal.self  Whether the SEAT HOLDING THE ROLE counts as a candidate:
 *              "allow" (default), "exclude", "only".
 *
 * THE RED HERRING'S OWN ANSWER IS `1 / good / allow`, and the `allow` is the
 * interesting third of it: the real game lets the Fortune Teller be their own
 * red herring, so the seat that owns the rule stays in its own draw. A rule
 * that must not land on its owner writes `"self": "exclude"`; a marker that
 * belongs on its owner's chair writes `"self": "only"`.
 *
 * A PLAIN STRING IS STILL A PLAIN STRING. Every other role in roles.json,
 * every custom role the Forge has ever saved, and every library role writes
 * `reminders: ["Poisoned", "Drunk"]` — those keep working untouched and mean
 * "no deal rule, offer it in the picker like always". `reminderName()` below
 * is the one reader both shapes go through; there is no migration and no
 * second field to keep in sync with the first.
 *
 * ONLY `reminders` CARRIES RULES, not `remindersGlobal`. A global reminder is
 * offered whether or not its role is in play, so "the role's own seat" — half
 * of `self` — has no referent. When one needs dealing, that is a deliberate
 * second decision, not a line to add here quietly.
 *
 * PURE, AND IT TAKES THE ROSTER RATHER THAN THE STORE — the same shape
 * chooseLies() has, for the same reason: the whole decision is one function
 * that can be reasoned about without a session, a socket or a Vue instance.
 * The store action that consumes it (players/dealReminders) does nothing but
 * commit what comes back.
 *
 * PRIVACY IS NOT THIS FILE'S PROBLEM, AND UNLIKE THE LIES IT NEVER WAS.
 * Reminders are grimoire furniture: socket.js's `sendPlayer` still refuses to
 * broadcast the `reminders` property, and the gamestate blob still carries
 * only name/id/isDead/isVoteless/pronouns/roleId. Choosing a placement earlier
 * does not move that line; it only means the storyteller's own grimoire
 * already has the token on it.
 *
 * FT-1295 AMENDS ONE HALF OF THAT. A token now has exactly one way to leave
 * the host's screen: a GRANTED GRIMOIRE WINDOW, direct to the one seat the
 * storyteller opened it for (socket.js's `sendGrimoire`, which now sends
 * `{ seats: [{index, roleId, reminders}], bluffs }`). That is a storyteller
 * deliberately showing one person their grimoire, and a grimoire without its
 * tokens is a role list — the user's report. Nothing broadcasts, no other
 * frame carries a token, and the recipient's own chair is skipped entirely so
 * a seat can never read its own "Drunk" or "Poisoned" off its own grant.
 *
 * A DEALT TOKEN DOES NOT TRAVEL AS A DEALT ONE. `DEALT_MARK` below is host
 * bookkeeping — which tokens a re-deal may draw again — and it is cut off the
 * wire (socket.js's `_reminderForWire`), so a granted seat cannot tell a token
 * the rules placed from one the storyteller decided on.
 */

// Fisher-Yates, borrowed rather than re-derived — the deal's other chooser
// already explains why the `sort(() => Math.random() - 0.5)` this fork uses
// for reordering seats is not good enough where the FIRST element off the
// list is the whole draw.
import { shuffled } from "./dealLies";

/** The mark a dealt token wears. A re-deal clears every token carrying it and
 *  draws afresh, which is what stops last game's herring sitting beside this
 *  game's. A token the storyteller placed BY HAND has no mark and survives
 *  every deal — their note, their call. */
export const DEALT_MARK = "dealt";

const GOOD_TEAMS = ["townsfolk", "outsider"];
const EVIL_TEAMS = ["minion", "demon"];

/** A reminder entry's display name, whichever shape it was authored in. THE
 *  reader for both shapes — anything that renders, searches or joins a role's
 *  reminders goes through this or through `reminderNames`. */
export const reminderName = (entry) =>
  typeof entry === "string" ? entry : (entry && entry.name) || "";

/** A whole `role.reminders` array as plain names — for the surfaces that only
 *  ever wanted the text (the Forge's comma-joined field, the shelf search). */
export const reminderNames = (list) =>
  Array.isArray(list) ? list.map(reminderName) : [];

/** The deal rule an entry declares, or null for the plain-string majority. */
export const reminderDeal = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  const deal = entry.deal;
  if (!deal || typeof deal !== "object") return null;
  return deal;
};

/** Does this chair qualify for `eligible`? An empty chair and a traveller
 *  never do — see the header. */
const isEligible = (player, eligible) => {
  const team = (player && player.role && player.role.team) || "";
  if (!team || team === "traveler") return false;
  if (!eligible || eligible === "any") return true;
  if (eligible === "good") return GOOD_TEAMS.indexOf(team) >= 0;
  if (eligible === "evil") return EVIL_TEAMS.indexOf(team) >= 0;
  return team === eligible;
};

/** The token a dealt reminder becomes — deliberately the SAME object
 *  ReminderModal's `mapReminder` builds, plus the mark. If these two drift, a
 *  dealt herring and a hand-placed one stop rendering the same way, and the
 *  seat's template (which resolves art from `image`/`imageAlt`/`role`) is the
 *  thing that breaks. */
const dealtToken = (role, name) => ({
  role: role.id,
  image: role.image,
  imageAlt: role.imageAlt,
  name,
  [DEALT_MARK]: true,
});

/** Which chairs this rule may draw from, in seat order. */
const candidates = (players, ownerIndex, deal) => {
  const self = deal.self || "allow";
  const out = [];
  players.forEach((player, index) => {
    if (index === ownerIndex && self === "exclude") return;
    if (index !== ownerIndex && self === "only") return;
    if (!isEligible(player, deal.eligible)) return;
    out.push(index);
  });
  return out;
};

/**
 * Place every auto-dealt reminder this town's characters declare.
 *
 * @param players the seating, in order — each seat's `role` is the resolved
 *   character object (it carries its own `reminders`, so no roles Map is
 *   needed: the declaration travels with the character that made it).
 * @returns {{index: number, reminders: object[]}[]} the new reminder list for
 *   each seat whose list CHANGES, and only those. Every previously dealt token
 *   is stripped first, so a re-deal replaces rather than accumulates and a
 *   character that left the town takes its marker with it.
 */
export function chooseDealtReminders({ players = [] } = {}) {
  // Strip first, place second. A rule can hand a token to any chair, so a
  // seat's final list is not knowable until every rule has drawn.
  const next = players.map((player) =>
    ((player && player.reminders) || []).filter((r) => !r || !r[DEALT_MARK]),
  );

  players.forEach((player, ownerIndex) => {
    const role = (player && player.role) || {};
    if (!role.id || !Array.isArray(role.reminders)) return;
    role.reminders.forEach((entry) => {
      const deal = reminderDeal(entry);
      if (!deal) return;
      const name = reminderName(entry);
      if (!name) return;
      const seats = Math.max(1, Math.floor(Number(deal.seats) || 1));
      const drawn = shuffled(candidates(players, ownerIndex, deal)).slice(
        0,
        seats,
      );
      drawn.forEach((index) => next[index].push(dealtToken(role, name)));
    });
  });

  const changes = [];
  next.forEach((reminders, index) => {
    const before = ((players[index] && players[index].reminders) || []).slice();
    const same =
      before.length === reminders.length &&
      before.every((r, i) => r === reminders[i]);
    if (!same) changes.push({ index, reminders });
  });
  return changes;
}
