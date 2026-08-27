/**
 * Golem fork (FT-1146): THE RECORDS PAGE's own reading — what has happened
 * across every town, assembled from the games API.
 *
 * ── WHY THIS FILE EXISTS, AND WHAT IT CANNOT DO ────────────────────────────
 * The platform aggregates are ONE call: `platformStats()` counts every game in
 * the store, unfiltered, and hands back the totals, the per-script table and
 * the player table. That half of the page is genuinely platform-wide and needs
 * nothing from here.
 *
 * The PER-GAME LEDGER used to be the half the server could not answer.
 * `GET /games` REQUIRED a `town` query parameter — a missing one was a 400,
 * `missing_town` — and nothing enumerates the towns that exist, so "every
 * game, newest first, across the platform" was a question the API could not be
 * asked. This file answered it anyway by fanning the per-town read out over
 * the towns THIS BROWSER had visited, and the page said so on screen: an
 * honest label on a ledger that was not the platform's.
 *
 * FT-1155 made the town optional, so the fan-out collapsed to one fetch, which
 * is `platformGames()` below. The ledger is now genuinely every recorded game.
 *
 * `knownTownIds` and `crossTownGames` STAY. They are the same shelf read a
 * viewer's own towns will want when the per-town figures come back (the
 * players table FT-1161 stood down is scoped to exactly those towns), and the
 * fan-out is the only code that knows how to merge and sort across towns.
 *
 * Best-effort throughout, per town: an unreachable or empty town contributes
 * nothing and never fails the page (`allSettled`, not `all`) — the same
 * contract every golem read in this fork keeps.
 */

import { listTowns } from "./towns";
import { allGames, townGames } from "./stats";

/** How many games one town contributes. The API's own ceiling is 50. */
const PER_TOWN = 50;

/** How many rows the merged ledger holds — a page, not an archive. */
const LEDGER_MAX = 200;

/** The town ids this browser knows, newest visit first. */
export function knownTownIds() {
  return listTowns()
    .map((town) => town && town.id)
    .filter(Boolean);
}

/**
 * Every recorded game from every town in `ids`, newest first, each row
 * carrying its own `townId` (the DTO already does). Towns that answer with an
 * error or nothing simply do not appear.
 */
export async function crossTownGames(ids) {
  const settled = await Promise.allSettled(
    (ids || []).map((id) => townGames(id, PER_TOWN)),
  );
  const games = [];
  settled.forEach((result) => {
    if (result.status !== "fulfilled" || !Array.isArray(result.value)) return;
    result.value.forEach((game) => {
      if (game && game.id) games.push(game);
    });
  });
  // The API sorts within a town; the merge has to sort across them. `endedAt`
  // is the only instant every record carries (`startedAt` is optional).
  games.sort((a, b) => whenOf(b) - whenOf(a));
  return games.slice(0, LEDGER_MAX);
}

/**
 * FT-1155: EVERY recorded game, newest first, in ONE call. The server sorts
 * and caps; nothing here has to merge or re-sort, because there is only one
 * list. The ceiling is the API's own (50), so this is the newest page of the
 * archive rather than the whole of it — which is what a page wants.
 */
export async function platformGames(limit = PER_TOWN, test = false) {
  // FT-1236: `test` asks for the dev ledger (`?test=only`) — the Chronicles'
  // labs-gated test view. Default stays the real archive.
  const games = await allGames(limit, test);
  return games.filter((game) => game && game.id);
}

/** A game's place on the clock — when it ended, or 0 when unreadable. */
function whenOf(game) {
  return Date.parse((game && game.endedAt) || "") || 0;
}

/**
 * How long a game RAN, in whole minutes, or null when it cannot be known —
 * `startedAt` is optional (a game never dealt through this client carries
 * none), and a record with no start has no length, not a length of zero.
 */
export function lengthOf(game) {
  if (!game || !game.startedAt || !game.endedAt) return null;
  const from = Date.parse(game.startedAt);
  const to = Date.parse(game.endedAt);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
  return Math.round((to - from) / 60000);
}

/**
 * The ledger's own summary — games, how many towns they came from, and the
 * TYPICAL game (median, not mean: a forgotten town left open overnight would
 * drag an average into fiction). Length is counted over the games that carry
 * one; `timed` says how many that was, so the line can stay honest.
 */
export function ledgerSummary(games) {
  const rows = games || [];
  const towns = new Set();
  const seats = [];
  const minutes = [];
  rows.forEach((game) => {
    if (game.townId) towns.add(game.townId);
    if (Number.isFinite(game.playerCount)) seats.push(game.playerCount);
    const ran = lengthOf(game);
    if (ran !== null) minutes.push(ran);
  });
  return {
    games: rows.length,
    towns: towns.size,
    seats: median(seats),
    minutes: median(minutes),
    timed: minutes.length,
  };
}

/** The middle value of a numeric list, or null when the list is empty. */
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "23 Aug · 21:15" for a record's instant, or "—" when it is unreadable. */
export function whenLabel(iso) {
  const at = Date.parse(iso || "");
  if (!Number.isFinite(at)) return "—";
  const d = new Date(at);
  return (
    d.getDate() +
    " " +
    MONTHS[d.getMonth()] +
    " · " +
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0")
  );
}

/**
 * Minutes as a table cell: "—", "<1m", "48m", "2h 05m".
 *
 * Zero is its own word. A game recorded within the same minute it was dealt
 * really did run for less than a minute, but a cell reading "0m" reads as a
 * clock that failed rather than a game that was quick — and the dev store is
 * full of them.
 */
export function lengthLabel(minutes) {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 1) return "<1m";
  if (minutes < 60) return minutes + "m";
  const h = Math.floor(minutes / 60);
  return h + "h " + String(minutes % 60).padStart(2, "0") + "m";
}
