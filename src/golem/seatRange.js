/**
 * Golem fork (FT-895): THE playable-size rule for a script — how many seats
 * this script's own character pool can actually fill, and what is missing when
 * it cannot.
 *
 * WHY DERIVED, NOT AUTHORED. The obvious alternative is a `minPlayers` /
 * `maxPlayers` pair carried on the script. The standard script format has no
 * such field, and an authored bound goes stale the moment someone adds or
 * removes a character in the workbench — the pair would still be claiming
 * 5-15 for a script that lost its ninth townsfolk an edit ago. The pool IS the
 * constraint, so the pool is what gets asked.
 *
 * WHAT WAS ALREADY HERE, AND IS NOT REBUILT. `composition.js` (FT-857)
 * already answers "which sizes can this pool serve" — `servableFor` is that
 * derivation, and the workbench meter's "Plays 5-15" line has been reading it
 * ever since. Nothing below re-derives it: a second implementation of the same
 * question is exactly the disagreement `duplicates.js` was extracted to stop.
 * What is NEW here is the other half of the answer — WHICH team falls short
 * and by how many — so a warning can say what is wrong instead of only that
 * something is.
 *
 * NOTHING IN HERE GATES ANYTHING. It returns sentences; the seat control shows
 * them and still sets whatever count it was asked for. The user's call
 * (2026-08-20): "the seat control probably shouldn't enforce the number but
 * warn when it is outside of that range".
 */

import {
  SETUP_TABLE,
  countTeams,
  servableFor,
  servableText,
} from "./composition";

/** The four teams the setup table distributes, in the order it states them. */
export const TEAM_ORDER = ["townsfolk", "outsider", "minion", "demon"];

/**
 * The ends of the setup table itself, read off the table rather than typed —
 * `SETUP_TABLE` is built from game.json, so these move if that file does.
 */
const TABLE_SIZES = Object.keys(SETUP_TABLE).map(Number);
export const TABLE_MIN = Math.min(...TABLE_SIZES);
export const TABLE_MAX = Math.max(...TABLE_SIZES);

/** Count-aware lowercase nouns for the warning's prose. */
const TEAM_NOUNS = {
  townsfolk: ["townsfolk", "townsfolk"],
  outsider: ["outsider", "outsiders"],
  minion: ["minion", "minions"],
  demon: ["demon", "demons"],
};

/** "1 demon" / "3 minions" — the noun the count wants. */
export function teamNoun(team, n) {
  const pair = TEAM_NOUNS[team];
  if (!pair) return team;
  return n === 1 ? pair[0] : pair[1];
}

/** "a" / "a and b" / "a, b and c". */
function joinList(parts) {
  if (parts.length <= 1) return parts.join("");
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

/**
 * What the setup table asks for at N seats, or null off either end of it.
 * Read through composition.js, which reads game.json — no requirement numbers
 * are written down in this file.
 */
export function requirementAt(n) {
  const row = SETUP_TABLE[n];
  if (!row) return null;
  const [townsfolk, outsider, minion, demon] = row;
  return { townsfolk, outsider, minion, demon };
}

/**
 * Every way a pool falls short of seating N — `[]` when it can seat N, and
 * `[]` off the ends of the table, where there is no requirement to fall short
 * of. Each entry carries both halves of the sentence: what the table wants and
 * what the script has.
 */
export function shortfallsAt(n, counts) {
  const need = requirementAt(n);
  if (!need) return [];
  return TEAM_ORDER.filter((team) => (counts[team] || 0) < need[team]).map(
    (team) => ({ team, need: need[team], have: counts[team] || 0 }),
  );
}

/**
 * The playable shape of a role pool.
 *
 * `sizes` IS A SET, NOT A SPAN, and the distinction is load-bearing: the
 * outsider requirement is not monotonic (5 seats wants 0 outsiders, 6 wants 1,
 * 7 wants 0 again), so a pool with no outsiders at all serves 5, 7, 10 and 13
 * and none of the sizes between them. `min` and `max` are the ends of that set
 * for a headline; MEMBERSHIP is what the warning actually tests, because a
 * count can sit inside the range and still be unseatable.
 */
export function playableRange(roles) {
  const counts = countTeams(roles);
  const sizes = servableFor(counts);
  return {
    counts,
    sizes,
    min: sizes.length ? sizes[0] : null,
    max: sizes.length ? sizes[sizes.length - 1] : null,
    text: servableText(sizes),
    playable: sizes.length > 0,
  };
}

/** "9 townsfolk — this script has 7" / "1 demon — this script has none". */
function shortfallPhrase(shortfalls) {
  const needs = shortfalls.map((s) => s.need + " " + teamNoun(s.team, s.need));
  const haves = shortfalls.map((s) => (s.have === 0 ? "none" : String(s.have)));
  return joinList(needs) + " — this script has " + joinList(haves);
}

/**
 * The seat row's warning for a given CORE seat count, or null when that count
 * is fine.
 *
 * TRAVELLERS ARE NOT COUNTED, and that is why this takes a core count rather
 * than a total: travellers sit outside the composition entirely, so a full
 * 15-seat game plus five travellers is twenty chairs with nothing wrong with
 * it. The caller does the excluding — it already has to, for the composition
 * readout beside this.
 *
 * An EMPTY town returns null rather than a complaint: no seats yet is not an
 * out-of-range count, and the Start footer already says "Add seats to begin."
 * A second line saying the same thing in warning gold would read as a fault.
 *
 * Returns `{ reason, plays, range }` — `reason` names the shortfall, `plays`
 * states what this script can seat (null when nothing can), `range` is the
 * full derivation for a caller that wants the numbers rather than the prose.
 */
export function seatWarning(coreCount, roles) {
  const range = playableRange(roles);
  const n = Number(coreCount) || 0;
  const plays = range.playable ? "This script plays " + range.text + "." : null;

  if (n === 0) return null;

  // Nothing at all works — say it at the table's smallest size, which is the
  // most forgiving row there is, so the shortfall named is the fundamental
  // one (almost always a missing demon).
  if (!range.playable) {
    return {
      range,
      plays: null,
      reason:
        "This script cannot be seated at any size: " +
        TABLE_MIN +
        " seats needs " +
        shortfallPhrase(shortfallsAt(TABLE_MIN, range.counts)) +
        ".",
    };
  }

  if (range.sizes.includes(n)) return null;

  if (n < TABLE_MIN) {
    return {
      range,
      plays,
      reason: n + " seats is under the setup table's " + TABLE_MIN + ".",
    };
  }

  if (n > TABLE_MAX) {
    return {
      range,
      plays,
      reason:
        n +
        " seats is past the setup table's " +
        TABLE_MAX +
        " — travellers aside.",
    };
  }

  // Inside the table, outside this script: the pool is what is short, and the
  // shortfall is the whole point of the message.
  return {
    range,
    plays,
    reason:
      n +
      " seats needs " +
      shortfallPhrase(shortfallsAt(n, range.counts)) +
      ".",
  };
}
