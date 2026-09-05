/**
 * Golem fork (FT-1385): THE TOLD-INFORMATION ROLES — the first-night five
 * (and the Empath's every night) whose action is not a choice but a
 * DELIVERY: the storyteller composes the information and sends it, and the
 * player only receives. FT-1384 dressed the CHOOSING roles (invite → staged
 * → sealed); these roles choose nothing, so their grammar has exactly two
 * beats:
 *
 *   TELLING  the storyteller's Send lands. The information arrives in the
 *            role's own visual language — the candidate coins the sentence
 *            points at light up (the audit's proven gap: targets were
 *            delivered but no coin ever acknowledged them), the number or
 *            character arrives dressed, and the sentence says what it means.
 *            One arrival animation (≤1s), then a held bright pose.
 *
 *   RESIDUE  effects expire, knowledge does not. After a short read window
 *            the telling settles into a quiet persistent trace — dotted
 *            rings, a slack line, dried ink — that SURVIVES THE NIGHT'S END
 *            and stays readable all game (the Empath's threads re-anchor and
 *            re-run each night; everyone else's marks simply hold).
 *
 * No Confirm and no staging for these five: there is nothing to confirm.
 * The FT-1384 receipt-sentence stand-down carries over — the dress IS the
 * receipt.
 *
 * WHO SEES ANY OF THIS: the told player alone. Everything below reads that
 * client's OWN delivered rows (night/playerNight) — a bystander's client
 * never holds them, so there is nothing here to hide from anyone.
 */

/**
 * The five, and the shape of what each is told:
 *   pair        two candidate seats + a character — "one of these two is it"
 *               (the Librarian adds the zero-Outsiders night: no seats, no
 *               character, an empty book).
 *   count       a bare number about the whole table (the Chef's pairs).
 *   neighbours  a number about the seat's own two living neighbours (the
 *               Empath) — the acknowledged coins are COMPUTED, not delivered.
 */
export const TOLD_ROLES = {
  washerwoman: { kind: "pair", group: "Townsfolk" },
  librarian: { kind: "pair", group: "Outsider", zero: true },
  investigator: { kind: "pair", group: "Minion" },
  chef: { kind: "count" },
  empath: { kind: "neighbours" },
};

/**
 * The told roles whose DRESS has landed — grows one commit at a time
 * (washerwoman first, the reference), the FT-1384 HAS_ART idiom one card
 * over. The store's myTold getter answers for all five regardless (it is
 * data, not art); this list is what the SURFACES read, so an undressed
 * role renders exactly as it did before this card.
 */
export const TOLD_ART = ["washerwoman"];

/**
 * How long the bright telling pose holds before easing into the residue.
 * Long enough to read a sentence and glance at two coins; short enough that
 * the settled dress (the pose that persists all game) is what a night mostly
 * looks like. One number so the coins, the threads and the centre sentence
 * all settle on the same beat.
 */
export const TOLD_HOLD_MS = 7000;

/** Is this row a telling — a TOLD role's own row, sent? */
export function isToldRow(row) {
  return !!(row && row.sent && row.roleId && TOLD_ROLES[row.roleId]);
}

/** The delivered candidate seats, cleaned: real seat indexes only. */
export function toldTargets(row) {
  if (!row || !Array.isArray(row.targets)) return [];
  return row.targets.filter((t) => Number.isInteger(t) && t >= 0);
}

/**
 * The Empath's two LIVING neighbours — the nearest live seat walking each
 * way round the ring from `seat`. Recomputed live off the players array, so
 * a neighbour's death re-anchors the threads by itself (the board card's
 * rule). Returns 0, 1 or 2 distinct seats and never `seat` itself.
 */
export function liveNeighbours(players, seat) {
  const n = Array.isArray(players) ? players.length : 0;
  if (n < 2 || !Number.isInteger(seat) || seat < 0 || seat >= n) return [];
  const alive = (i) => players[i] && !players[i].isDead;
  const found = [];
  for (const step of [1, -1]) {
    for (let d = 1; d < n; d++) {
      const i = (seat + step * d + n * d) % n;
      if (i === seat) break;
      if (alive(i)) {
        found.push(i);
        break;
      }
    }
  }
  return found[0] === found[1] ? found.slice(0, 1) : found;
}

/**
 * The seats a telling ACKNOWLEDGES — the coins that take the role's mark.
 * Pair roles: the delivered candidates. The Empath: her live neighbours,
 * computed fresh. The Chef: nobody (the count is about seats she cannot
 * see into).
 */
export function toldSeats(told, players) {
  if (!told) return [];
  const spec = TOLD_ROLES[told.roleId];
  if (!spec) return [];
  if (spec.kind === "pair") return told.targets;
  if (spec.kind === "neighbours") return liveNeighbours(players, told.seat);
  return [];
}

/**
 * THE SENTENCE — the telling's own words in the centre, and the smaller
 * line the residue keeps. `names` are the acknowledged seats' display
 * names, in target order.
 */
export function toldSentence(told, names, settled) {
  const spec = told && TOLD_ROLES[told.roleId];
  if (!spec) return "";
  if (spec.kind === "pair") {
    // the zero night (Librarian): nothing delivered means nobody is it
    if (!told.targets.length && !told.characterName) {
      return settled
        ? "no " + spec.group + "s in play"
        : "there are no " + spec.group + "s in play";
    }
    const who = told.characterName || "the " + spec.group;
    if (!settled) return "one of these two is the " + who;
    const pair = names.filter(Boolean).join(" & ");
    return pair ? "one of " + pair + " — the " + who : "the " + who;
  }
  const n = Number.isInteger(told.number) ? told.number : Number(told.number);
  if (!Number.isFinite(n)) return "";
  if (spec.kind === "count") {
    if (settled) {
      if (!n) return "no evil pairs · tonight";
      return n + " evil pair" + (n > 1 ? "s" : "") + " · side-by-side";
    }
    if (!n) return "no pairs of evil sit together";
    if (n === 1) return "1 pair of evil sits side-by-side";
    return n + " pairs of evil sit side-by-side";
  }
  // neighbours — the Empath
  if (settled) {
    if (!n) return "no evil neighbours · tonight";
    return n + " evil neighbour" + (n > 1 ? "s" : "") + " · tonight";
  }
  if (!n) return "neither of your two neighbours is evil";
  if (n === 1) return "1 of your two neighbours is evil";
  return "both of your neighbours are evil";
}
