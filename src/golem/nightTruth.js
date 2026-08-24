/**
 * Golem fork (FT-1121): THE TRUTH ORACLE — what the grimoire ACTUALLY says.
 *
 * The night sheet has always recorded WHAT WAS TOLD and carried a hand-set
 * mark saying whether it was a lie (golem/nightLog's cardinal rule: "an entry
 * records what was told, not what was true"). This file supplies the other
 * half of that pair for the handful of characters whose answer is a FACT
 * ABOUT THE TABLE rather than a storyteller's ruling — so the mark can set
 * itself, and so the storyteller can see the true answer beside the row and
 * lie ON PURPOSE rather than by accident.
 *
 * ── HOST-SIDE, ABSOLUTELY ────────────────────────────────────────────────
 *
 * Every function here reads `player.role` — the TRUE character — which only
 * the storyteller's own client holds. Nothing in this file may be evaluated
 * on a player's client, and the fork's containment is structural rather than
 * a promise: the ONE importer is NightSheet.vue, which App.vue mounts behind
 * `!isSpectator` and whose roster getter returns [] to anybody else. No store
 * getter reads this file, so no player-visible surface can reach it by
 * accident; a verdict is computed inside a storyteller-only component and
 * dies there. The player's wire shape (nightLog's projectPlayerRow) is a
 * WHITELIST, so no oracle output has a key it could ride out on even if one
 * were written onto an entry.
 *
 * ── PURE, AND IT TAKES THE ROSTER RATHER THAN THE STORE ──────────────────
 *
 * Same shape golem/dealLies and golem/dealReminders have, for the same
 * reason: the whole question is a function of the seating plus one row, and
 * it should be answerable without a session, a socket or a Vue instance —
 * which is also what makes it directly exercisable by a rig.
 *
 * ── "CANNOT BE COMPUTED" IS A FIRST-CLASS ANSWER ─────────────────────────
 *
 * Most characters' night answers are not facts. The Undertaker's is a fact
 * the APP does not hold (see the refusals below). Every rule that is not
 * certain of its own answer returns `{ known: false }` with the reason, and a
 * row whose truth is unknown NEVER lights the mark and NEVER shows a chip.
 * A wrong oracle is worse than no oracle: it would teach a storyteller to
 * trust a mark that is sometimes lying about lying.
 *
 * ── WHAT IS COVERED, AND WHY EACH ONE QUALIFIES ──────────────────────────
 *
 *   fortuneteller  Yes if either chosen seat is a Demon OR holds the marker
 *                  this character's own rules deal out (the red herring,
 *                  FT-1117). Both halves are read off the grimoire.
 *   empath         The two nearest LIVING neighbours' alignments.
 *   chef           Pairs of adjacent evil seats around the whole circle.
 *   washerwoman    Whether the pair the storyteller pointed at HONESTLY
 *   librarian      contains a seat of the character they showed. There is no
 *   investigator   single "true answer" for these — many honest pairs exist —
 *                  so the oracle answers with what the two pointed-at seats
 *                  REALLY are, which is the fact the storyteller wants in
 *                  front of them, and tests the shown character against it.
 *   ravenkeeper    The true character of the seat they chose.
 *
 * ── WHAT IS DELIBERATELY REFUSED, WITH THE ARGUMENT ──────────────────────
 *
 *   undertaker     THE APP DOES NOT RECORD AN EXECUTION. The closest thing
 *                  it holds is `session.markedPlayer` — a MARK, not a death
 *                  (golem/chronicle.js says so outright: "Saying 'executed'
 *                  here would be inventing an event nothing anywhere writes")
 *                  — and that mark is CLEARED the moment the night begins
 *                  (NightSheet.flipPhase / Menu.toggleNight both commit
 *                  `setMarkedPlayer, -1` on nightfall). So by the time the
 *                  Undertaker's row exists, the one field that could have
 *                  named today's executed seat is already -1. Guessing "the
 *                  most recently dead seat" would be wrong on every night
 *                  the Demon also killed. The rule is certain; the input is
 *                  absent, and absent is an honest answer.
 *   everything     Not because their rules are unknown, but because their
 *   else           answers are storyteller RULINGS (the Sailor's choice, the
 *                  Snake Charmer's swap), depend on facts the app never
 *                  stores (the Juggler's day guesses, the Mathematician's
 *                  broken abilities, the Clockmaker's Minion distance is a
 *                  fact but its jinxes and travellers are not), or are
 *                  simply not written yet. An unlisted character — including
 *                  every forged one — answers `known: false`, the same safe
 *                  fallback golem/nightInfo's own table takes.
 *
 * ── THE THREE THINGS THAT MAKE AN ALIGNMENT ANSWER REFUSE ────────────────
 *
 * The Empath and the Chef are the only rules that read the whole town's
 * alignments, and all three refusals below are about not being wrong:
 *
 *   an UNDEALT town      a seat with no role at all has no alignment, and a
 *                        count taken over a half-dealt grimoire is noise.
 *   a seated TRAVELLER   a traveller's alignment is chosen at the table and
 *                        is not in the character data AT ALL (the same fact
 *                        golem/dealReminders states when it refuses to deal
 *                        a marker to one). A Chef count that silently read
 *                        every traveller as good would be wrong exactly when
 *                        an evil traveller sat between two Minions.
 *   a TWO-SEAT Empath    with only one other player alive, the same seat is
 *                        both neighbours, and whether that counts once or
 *                        twice is a table ruling rather than arithmetic.
 *
 * ── REGISTERS-AS IS NOT MODELLED HERE, BECAUSE IT IS NOT MODELLED AT ALL ─
 *
 * A Recluse may register as a Minion and a Spy as a Townsfolk, at the
 * storyteller's call, per look. golem/belief.js's header already names that
 * as a THIRD axis the fork has not built ("it is per-ability, per-look, and
 * the storyteller decides it at the moment of the look rather than storing it
 * on the seat"). So this oracle reads the literal grimoire: an Investigator
 * shown a Recluse as the Baron gets a lit mark, because relative to the
 * grimoire the information IS false. That reading is defensible on its own
 * terms — and where the storyteller means it as a legal registration rather
 * than a lie, the hand-set override (NightSheet's `lieBy`) takes the mark
 * back off and keeps it off. When registers-as gets its own field, this file
 * reads it and the special case disappears.
 */

// FT-1117's reader for both authored shapes of a reminder entry. READ-ONLY
// use: the herring's placement is that module's business, and finding it on a
// seat afterwards is this one's.
import { reminderNames } from "./dealReminders";

/**
 * The evil half of the good/evil split — the SAME derivation EndGameOverlay
 * and golem/belief.js's believedAlignment already make (minion/demon → evil,
 * everything else → good), rather than a third copy that could drift. The
 * difference is which role it is asked about: belief.js reads what a seat is
 * TOLD, and this file reads what it IS.
 */
export const EVIL_TEAMS = ["minion", "demon"];

/**
 * WHAT A REMINDER TOKEN SAYS ABOUT A SEAT BEING IMPAIRED.
 *
 * A name test, and it is worth being honest about why. Poisoning and
 * ability-drunkenness are recorded in exactly one place in this app — a
 * reminder token the storyteller drops on a chair — and a token carries a
 * name and an owning role, not a structured "this impairs" flag. Every
 * shipped token that means it is one of six strings ("Poisoned", "Drunk",
 * "Drunk 1/2/3", "Everyone drunk"), so two patterns cover the shipped set
 * and any custom script that names its token the obvious way.
 *
 * The declarative alternative — a flag on the reminder entry, the way
 * FT-1117 gave the herring its `deal` rule — is the right long answer and is
 * a roles.json pass touching a hundred characters, not a line here. What this
 * feeds is a QUIET NOTE beside the true answer, never the mark itself: a
 * missed match costs the storyteller a word of context, never a wrong
 * verdict.
 */
export const IMPAIRING_REMINDERS = [
  { re: /poison/i, word: "poisoned" },
  { re: /drunk/i, word: "drunk" },
];

/** The shape every rule returns. `why` explains a verdict AND a refusal. */
const unknown = (why) => ({
  known: false,
  kind: "",
  value: null,
  display: "",
  why,
});
const answer = (kind, value, display, why) => ({
  known: true,
  kind,
  value,
  display,
  why,
});

/** A seat's TRUE role object, never its belief. `{}` for an undealt chair. */
const trueRoleOf = (player) => (player && player.role) || {};

/** Is this seat's true character on the evil team? */
export function isEvilSeat(player) {
  return EVIL_TEAMS.indexOf(trueRoleOf(player).team) >= 0;
}

/** Is this seat's true character a Demon? */
export function isDemonSeat(player) {
  return trueRoleOf(player).team === "demon";
}

/**
 * Does this seat hold one of `role`'s OWN marker tokens? The Fortune Teller's
 * red herring is the one that matters today, and this deliberately does not
 * know that: it asks whether the chair carries a reminder belonging to the
 * acting character (ReminderModal's `mapReminder` and FT-1117's `dealtToken`
 * build the SAME object, `{ role: id, name }`, so a dealt herring and a
 * hand-placed one both answer here).
 */
export function holdsOwnMarker(player, role) {
  if (!player || !role || !role.id) return false;
  const names = reminderNames(role.reminders);
  if (!names.length) return false;
  return ((player && player.reminders) || []).some(
    (r) => r && r.role === role.id && names.indexOf(r.name) >= 0,
  );
}

/**
 * The word for how this seat is impaired — "poisoned", "drunk", or "" — read
 * off its reminder tokens. Advisory context beside the true answer, never an
 * input to the verdict; see IMPAIRING_REMINDERS for why it is a name test.
 */
export function impairmentOf(player) {
  const tokens = (player && player.reminders) || [];
  for (const { re, word } of IMPAIRING_REMINDERS) {
    if (tokens.some((r) => r && re.test(String(r.name || "")))) return word;
  }
  return "";
}

/**
 * Can the town's ALIGNMENTS be counted at all? See the three refusals in the
 * header. Returns "" when they can, and the reason when they cannot.
 */
function alignmentRefusal(players) {
  const seats = players || [];
  if (!seats.length) return "The town has no seats yet.";
  for (const p of seats) {
    const role = trueRoleOf(p);
    if (!role.id) return "The town is not fully dealt.";
    if (role.team === "traveler")
      return "A traveller is seated, and a traveller's alignment is not in the character data.";
  }
  return "";
}

/** The nearest LIVING seat from `seat` in direction `step`, or -1. */
function nearestLiving(players, seat, step) {
  const n = (players || []).length;
  for (let i = 1; i < n; i++) {
    const index = (((seat + step * i) % n) + n) % n;
    if (!players[index].isDead) return index;
  }
  return -1;
}

/** The seats a row has pointed at, as a plain array of indexes. */
function targetsOf(entry) {
  return Array.isArray(entry && entry.targets) ? entry.targets : [];
}

/** What was signalled on a row, whichever shape the entry is in. */
function toldOf(entry) {
  return (entry && entry.told) || {};
}

/**
 * The pointed-at pair rule, shared by the Washerwoman, the Librarian and the
 * Investigator. `label` names the class the character's ability text talks
 * about and rides the explanation only — the TRUTH TEST is character
 * identity, never team: "one of these two is the Chef" is a true statement
 * whatever team the Chef is on, and a storyteller showing a Minion character
 * on a Washerwoman row is breaking a rule, not telling a lie. The mark means
 * false, not illegal.
 */
const pairRule = (label) => (ctx) => {
  const picks = targetsOf(ctx.entry).slice(0, 2);
  if (picks.length < 2 || picks.some((s) => !(s >= 0)))
    return unknown("Point at both seats first.");
  const seats = picks.map((s) => ctx.players[s]);
  if (seats.some((p) => !trueRoleOf(p).id))
    return unknown("One of the pointed-at seats has no character yet.");
  const roles = seats.map(trueRoleOf);
  return answer(
    "pair",
    roles.map((r) => r.id),
    roles.map((r) => r.name || r.id).join(" / "),
    "What the two seats you pointed at really are — an honest " +
      label +
      " read names one of them.",
  );
};

/**
 * THE RULES, keyed by role id — the same id every other night surface keys
 * on. Each takes `{ players, seat, role, entry }` and answers or refuses.
 */
export const TRUTH_RULES = {
  fortuneteller(ctx) {
    const picks = targetsOf(ctx.entry).slice(0, 2);
    if (picks.length < 2 || picks.some((s) => !(s >= 0)))
      return unknown("Point at both seats first.");
    const seats = picks.map((s) => ctx.players[s]);
    if (seats.some((p) => !trueRoleOf(p).id))
      return unknown("One of the pointed-at seats has no character yet.");
    const demon = seats.find(isDemonSeat);
    const herring = seats.find((p) => holdsOwnMarker(p, ctx.role));
    const value = !!(demon || herring);
    const why = demon
      ? "One of them is the Demon."
      : herring
      ? "One of them holds your red herring."
      : "Neither is the Demon, and neither holds your red herring.";
    return answer("boolean", value, value ? "Yes" : "No", why);
  },

  empath(ctx) {
    const refusal = alignmentRefusal(ctx.players);
    if (refusal) return unknown(refusal);
    const left = nearestLiving(ctx.players, ctx.seat, -1);
    const right = nearestLiving(ctx.players, ctx.seat, 1);
    if (left < 0 || right < 0) return unknown("Nobody else is alive.");
    if (left === right)
      return unknown(
        "Only one other player is alive — whether that seat counts as both neighbours is a ruling, not arithmetic.",
      );
    const evil = [left, right].filter((s) => isEvilSeat(ctx.players[s]));
    return answer(
      "number",
      evil.length,
      String(evil.length),
      "Their living neighbours are seats " +
        (left + 1) +
        " and " +
        (right + 1) +
        ".",
    );
  },

  chef(ctx) {
    const refusal = alignmentRefusal(ctx.players);
    if (refusal) return unknown(refusal);
    const n = ctx.players.length;
    if (n < 3) return unknown("Too few seats to sit in a circle.");
    let pairs = 0;
    for (let i = 0; i < n; i++) {
      if (isEvilSeat(ctx.players[i]) && isEvilSeat(ctx.players[(i + 1) % n]))
        pairs++;
    }
    return answer(
      "number",
      pairs,
      String(pairs),
      "Pairs of evil players sitting next to each other, around the whole circle.",
    );
  },

  washerwoman: pairRule("Townsfolk"),
  librarian: pairRule("Outsider"),
  investigator: pairRule("Minion"),

  ravenkeeper(ctx) {
    const picks = targetsOf(ctx.entry);
    const seat = picks.length ? picks[0] : -1;
    if (!(seat >= 0)) return unknown("They have not chosen a seat yet.");
    const role = trueRoleOf(ctx.players[seat]);
    if (!role.id) return unknown("That seat has no character yet.");
    return answer(
      "character",
      { id: role.id, name: role.name || role.id },
      role.name || role.id,
      "The true character of the seat they chose.",
    );
  },
};

/**
 * THE TRUE ANSWER for one night row, or a refusal.
 *
 * @param players the seating in order, each seat's TRUE role resolved
 * @param row     one roster row (seat, role — the character THIS row is about,
 *                which on a performance is the one the seat only thinks it has)
 * @param entry   the row's night-log entry, for what has been pointed at
 * @returns {{known, kind, value, display, why}}
 *
 * A PERFORMANCE ROW IS ANSWERED, not skipped, and that is the point of it: a
 * Drunk who believes they are the Empath still has real neighbours, so "the
 * number a sober Empath in that chair would learn" is exactly the fact the
 * storyteller needs in order to hand over a different one deliberately.
 */
export function trueAnswer({ players, row, entry } = {}) {
  const role = (row && row.role) || {};
  const rule = TRUTH_RULES[role.id];
  if (!rule)
    return unknown("Nothing here can compute this character's answer.");
  if (!Array.isArray(players) || !players.length)
    return unknown("The town has no seats yet.");
  try {
    return rule({ players, seat: row.seat, role, entry: entry || {} });
  } catch (e) {
    // a rule that throws is a rule that does not know — never a broken sheet
    return unknown("The answer could not be worked out.");
  }
}

/**
 * Does what the storyteller SIGNALLED differ from the truth?
 *
 *   true   they told them something other than the true answer
 *   false  they told them the true answer
 *   null   NOTHING TO COMPARE — the truth is unknown, or nothing has been
 *          signalled yet. Null is never a lie: an empty row is not a liar.
 */
export function differsFromTruth(truth, told) {
  if (!truth || !truth.known) return null;
  const t = told || {};
  switch (truth.kind) {
    case "boolean":
      if (t.ping !== true && t.ping !== false) return null;
      return t.ping !== truth.value;
    case "number":
      if (t.number === null || t.number === undefined || t.number === "")
        return null;
      return Number(t.number) !== truth.value;
    case "character":
      if (!t.characterId) return null;
      return t.characterId !== truth.value.id;
    case "pair":
      // an honest read names ONE of the two seats pointed at
      if (!t.characterId) return null;
      return truth.value.indexOf(t.characterId) < 0;
    default:
      return null;
  }
}

/**
 * THE WHOLE VERDICT FOR ONE ROW — the truth, whether the told answer differs
 * from it, and what the lie mark shows when the storyteller has not set it by
 * hand.
 *
 * ── THE DRUNK / POISONED DECISION, WHICH IS THE JUDGEMENT CALL OF FT-1121 ─
 *
 * A drunk or poisoned seat is SUPPOSED to be given false information, and the
 * question is whether the mark should light when the storyteller does exactly
 * that. It should, and the fork had already decided so before this file
 * existed: FT-1034 made a Drunk's row start with the mark LIT, and the mark's
 * own hover text reads "Mark what you told them FALSE (drunk, poisoned, a
 * misread)" — it NAMES those two states as its subject. The mark has never
 * been an error signal. It is the storyteller's record of whether what they
 * said was true, and golem/nightLog's entry shape says why that record has to
 * be right: "`told` is the delivered information and `isFalseInfo` marks it as
 * a lie; the truth is recoverable from the pair." A poisoned Empath handed a
 * wrong number, with the mark left dark, makes that pair unrecoverable.
 *
 * So the rule is CONTENT, not correctness — with one floor and one addition:
 *
 *   THE FLOOR: a PERFORMANCE row is false whatever the value. A Drunk being
 *   walked through the Empath is not an Empath, so any number given as one is
 *   a fiction even on the night it happens to match. This preserves FT-1034's
 *   lit-by-default exactly, and it is a different claim from the poisoned
 *   case: there the CHARACTER is false, here only the value might be.
 *
 *   THE ADDITION: an impaired seat's row shows the word "poisoned" / "drunk"
 *   beside the true answer (see impairmentOf). That is what stops a lit mark
 *   reading as an accusation — the storyteller sees "the truth is 1, this
 *   seat is poisoned, you said 2" and reads their own correct play back.
 *
 * The rejected alternative was to SUPPRESS auto-lighting on impaired rows.
 * It fails three ways: it contradicts the Drunk default already shipped; it
 * makes the mark mean two different things depending on which seat it is on;
 * and it puts a false record into the chronicle (ChronicleDrawer renders that
 * mark as the word "false") on precisely the nights the lie mattered most.
 *
 * @returns {{truth, differs, auto}} `auto` is the mark's derived state — what
 *   it shows when nothing has taken it by hand.
 */
export function lieVerdictFor({ players, row, entry } = {}) {
  const truth = trueAnswer({ players, row, entry });
  const differs = differsFromTruth(truth, toldOf(entry));
  return {
    truth,
    differs,
    auto: !!(row && row.isPerformance) || differs === true,
  };
}
