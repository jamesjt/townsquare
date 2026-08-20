/**
 * Golem fork (FT-965, chat 3 of 3): THE TOWN LOG, client side.
 *
 * A TOWN IS THE CHAT ROOM. One room per town, permanent, outliving every game
 * played in it. A game is a FILTER over that log, never a boundary that resets
 * it — which is why everything below is keyed on the TOWN and the game id is
 * only ever a predicate applied to rows already in hand.
 *
 * This file owns four things and no rendering:
 *   1. the REST client for the platform's message store (FT-963)
 *   2. CATCH-UP — the paged read that fills the log up to the store's head
 *   3. MERGE — the seq-keyed union that makes "no gap, no duplicate" a
 *      structural property rather than a timing accident
 *   4. WHO MAY SEE A ROW — the client half of whisper privacy
 *
 * ── NO GAP, NO DUPLICATE ───────────────────────────────────────────────────
 * Two sources feed one log: the socket (live, from the moment the town is
 * joined) and REST (catch-up, from a cursor). They overlap on purpose, and the
 * overlap is made harmless by two rules that never bend:
 *
 *   NO DUPLICATE — `seq` is unique per town (the store allocates it under a
 *   per-town advisory lock), so the log is a MAP KEYED BY SEQ before it is an
 *   array. A row that arrives twice — once live, once in a REST page — is the
 *   same key twice and lands once. Nothing depends on arrival order, on
 *   timestamps, or on a live row being "newer" than a fetched one.
 *
 *   NO GAP — `syncedSeq` is the high-water mark below which the log is known
 *   COMPLETE AND CONTIGUOUS, and ONLY the REST loop advances it. A live row
 *   arriving with seq 57 proves nothing about 40..56, so it goes into the log
 *   and leaves the cursor alone. The fetch pages `seq > cursor` ascending
 *   until a page comes back short (short = the store is drained), and the
 *   cursor moves only by what the fetch itself returned.
 *
 * Why that covers everything, for a row R stored at time t, a socket opened at
 * T0 and a catch-up that finishes at T2 with cursor C:
 *   · t < T0  → R.seq ≤ head(T0) ≤ C, and the fetch returned every seq in
 *               (previous cursor, C] contiguously, so R is in the log.
 *   · t ≥ T0  → the socket was open, so the relay delivered R live.
 * The two cases are exhaustive and they overlap in the middle — which is the
 * case dedup exists for. A message posted DURING the catch-up is exactly that
 * middle: it arrives live AND may be returned by a later page, and lands once.
 *
 * A RECONNECT re-runs catch-up from `syncedSeq`, not from the highest seq in
 * hand — that is the whole reason the two numbers are kept apart. Re-fetching
 * rows already held costs a request and dedups away; trusting a live row's seq
 * as a contiguity mark would silently skip whatever the drop swallowed.
 *
 * ── ONE CURSOR SPACE ───────────────────────────────────────────────────────
 * Catch-up NEVER passes `game=`. A game slice keeps the town's own seqs, so a
 * filtered read returns a NON-CONTIGUOUS run of numbers — and a cursor
 * advanced over one of those would claim completeness for seqs it never saw.
 * The whole town is fetched and the game filter is applied to rows in hand
 * (`inScope` below). That is also the user's framing made literal: the filter
 * is a view, not a fetch.
 */

import { dealTimeFor } from "./stats";

const API =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3939/api/botc"
    : "/api/botc";

/** The store's own LOG_LIMIT_DEFAULT. A short page means "drained". */
const PAGE_LIMIT = 200;

/**
 * A ceiling on the catch-up loop so a store that never returns a short page
 * cannot spin forever. 50 pages = 10,000 lines, far past any real town.
 */
const MAX_PAGES = 50;

/** What this browser calls itself — written by the join panel (Intro.vue). */
const NAME_KEY = "golem.playerName";

/** The name a storyteller speaks under when they never typed one. */
export const STORYTELLER_KEY = "Storyteller";

/** One line's ceiling, matching the store's BODY_MAX. */
export const BODY_MAX = 4000;

/** The three scopes the game filter offers. */
export const SCOPES = ["game", "town", "none"];

/**
 * The relay's three refusals, said in the app's own voice. Every one of them
 * means the same thing about delivery — the store never took the line, so
 * nobody saw it — and each says which door closed.
 */
const REASONS = {
  whisper_missing_recipient:
    "That whisper had nobody to go to. Pick a seat and try again.",
  store_rejected: "The town log refused that line — nobody saw it.",
  store_unavailable: "The town log can't be reached. Nothing was sent.",
};

/** A relay `chatError` reason → what the sender is told. */
export function chatErrorText(reason) {
  return REASONS[reason] || "That line didn't send. Nobody saw it.";
}

/**
 * One page of the town's log, oldest-first, strictly after `sinceSeq`.
 * Returns `{ messages, nextSeq }` exactly as the store does.
 */
export async function fetchLog(townId, sinceSeq = 0, limit = PAGE_LIMIT) {
  const qs = new URLSearchParams({
    town: townId,
    sinceSeq: String(sinceSeq),
    limit: String(limit),
  });
  const res = await fetch(`${API}/messages?${qs}`);
  if (!res.ok) throw new Error(`chat log failed (${res.status})`);
  return res.json();
}

/** The town's current high-water seq, without pulling the log. */
export async function fetchHead(townId) {
  const res = await fetch(
    `${API}/messages/head?town=${encodeURIComponent(townId)}`,
  );
  if (!res.ok) throw new Error(`chat head failed (${res.status})`);
  const body = await res.json();
  return Number(body.headSeq) || 0;
}

/**
 * Page the town's log forward from `fromSeq` until the store is drained,
 * handing each page to `onPage` as it lands. Resolves with the new contiguity
 * cursor — the value the caller should store as `syncedSeq`, and NOTHING else
 * should ever write it.
 *
 * Pages are applied as they arrive rather than accumulated, so a long history
 * fills the surface progressively instead of after the last round trip.
 */
export async function catchUp(townId, fromSeq, onPage) {
  let cursor = Number.isFinite(fromSeq) && fromSeq > 0 ? fromSeq : 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { messages, nextSeq } = await fetchLog(townId, cursor);
    const rows = Array.isArray(messages) ? messages : [];
    if (rows.length) onPage(rows);
    const next = Number.isFinite(nextSeq) ? nextSeq : cursor;
    // A SHORT PAGE IS THE ONLY STOP CONDITION. The store returned everything
    // it had past the cursor, so the prefix up to `next` is now contiguous.
    if (rows.length < PAGE_LIMIT) return Math.max(cursor, next);
    cursor = Math.max(cursor, next);
  }
  return cursor;
}

/**
 * Fold `incoming` into `log`, keyed by `seq`, ascending.
 *
 * Returns the SAME array reference when nothing was added, so a merge that
 * changes nothing costs no re-render.
 */
export function mergeLog(log, incoming) {
  if (!incoming || !incoming.length) return log;
  // The live case: one row that already belongs at the end. By far the most
  // common merge, and it is the one that must not cost a sort.
  if (
    incoming.length === 1 &&
    (!log.length || incoming[0].seq > log[log.length - 1].seq)
  ) {
    return log.concat(incoming[0]);
  }
  const bySeq = new Map();
  log.forEach((row) => bySeq.set(row.seq, row));
  let added = 0;
  incoming.forEach((row) => {
    if (bySeq.has(row.seq)) return;
    bySeq.set(row.seq, row);
    added++;
  });
  if (!added) return log;
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

/**
 * WHO THIS BROWSER IS, for the chat log's purposes.
 *
 * Name-keyed, as decided: `senderKind` is 'name' — a claim, not a verified
 * identity — and the record keeps the distinction so an account id can take
 * the same column later. No new identity concept is minted here; this reads
 * the name the join panel already stored and the seat the session already
 * knows.
 *
 * `key` is empty when this browser has neither a name nor a named seat. The
 * composer refuses to send in that state rather than inventing a handle.
 */
export function viewerOf(state) {
  const isStoryteller = !state.session.isSpectator;
  const seat = seatOf(state);
  const seated = seat >= 0 ? state.players.players[seat] : null;
  let typed = "";
  try {
    typed = (localStorage.getItem(NAME_KEY) || "").trim();
  } catch (e) {
    // a browser with storage denied still gets to read the log
  }
  const key = isStoryteller
    ? typed || STORYTELLER_KEY
    : (seated && seated.name) || typed || "";
  return {
    key,
    kind: "name",
    seat: seated ? seat : null,
    isStoryteller,
    playerId: state.session.playerId,
  };
}

/**
 * This browser's seat, or -1. The claimed seat first, then the seat whose
 * player id matches this connection — the same pair Menu's `showNightInfo`
 * tests, so the chat and the night door can never disagree about who is sat
 * where.
 */
export function seatOf(state) {
  if (state.session.claimedSeat >= 0) return state.session.claimedSeat;
  return state.players.players.findIndex(
    (p) => p.id && p.id === state.session.playerId,
  );
}

/**
 * MAY THIS VIEWER SEE THIS ROW?
 *
 * The relay already refuses to DELIVER a whisper to a fourth socket, and that
 * is the real defence. This is the second one, and it is not redundant: the
 * catch-up read is a plain unauthenticated GET that returns every row in the
 * town, whispers included, to whoever asks. So the client is handed rows it
 * must not show, and the only question is what it does with them.
 *
 * It drops them AT INGEST — before the store, before the DOM. Filtering at
 * render would leave a whisper this viewer was never party to sitting in
 * application state, one template edit away from being visible.
 *
 * A storyteller sees every whisper, content included. That is a user call.
 */
export function canSee(row, viewer) {
  if (!row) return false;
  if (row.kind !== "whisper") return true;
  if (viewer.isStoryteller) return true;
  if (!viewer.key) return false;
  return row.senderKey === viewer.key || row.recipientKey === viewer.key;
}

/**
 * THE CURRENT GAME'S ID, derived — not stored, and not a new concept.
 *
 * The app already has exactly one durable per-game marker: the DEAL MOMENT
 * (golem/stats' `dealTime` stash), stamped when the host deals characters and
 * cleared when the game is recorded. A game id built from the town and that
 * instant is therefore stable for a game's whole life and null between games —
 * which is precisely what the store's `gameId` column means ("NULL = said
 * between games").
 *
 * HOST-ONLY at the source: only the storyteller's browser holds the stash, so
 * the id travels to players on the ordinary full gamestate sync, the same way
 * the night counter does (socket.js).
 */
export function gameIdFor(sessionId) {
  if (!sessionId) return null;
  const dealt = dealTimeFor(sessionId);
  if (!dealt) return null;
  const at = Date.parse(dealt);
  if (!Number.isFinite(at)) return null;
  return `g-${sessionId}-${at}`;
}

/**
 * The game filter, applied to a row already in hand.
 *   "town" — everything this town ever said
 *   "game" — this game's slice
 *   "none" — what was said BETWEEN games
 */
export function inScope(row, scope, gameId) {
  if (scope === "none") return !row.gameId;
  if (scope === "game") return !!gameId && row.gameId === gameId;
  return true;
}

/** HH:MM for a row's `createdAt`, or "" if it is unreadable. */
export function timeOf(row) {
  const at = Date.parse(row.createdAt);
  if (!Number.isFinite(at)) return "";
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}
