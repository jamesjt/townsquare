"use strict";

// Golem fork (FT-964, chat 2 of 3): the relay's ONLY connection to the
// platform's chat store. Storage is the platform's job (FT-963) — this file
// exists so the relay can hand a message to it and get back the row the
// platform actually recorded, id/seq/createdAt included. The relay never
// mints those itself.
//
// PLATFORM_URL is read from the environment, never hardcoded — the relay and
// the platform are separate processes (and in production, separate hosts).
// The localhost fallback exists only so a bare `node index.js` works in dev
// against a platform running on its own default port (server/framework.ts).
const PLATFORM_URL = (
  process.env.PLATFORM_URL || "http://127.0.0.1:3939"
).replace(/\/+$/, "");

// CONFIRMED against the store as built (FT-963). This began as an assumption —
// `/api/botc/chat` — flagged by the lane that wrote this file, because the two
// halves were built in parallel against a shared row contract that named the
// COLUMNS and not the URL. The store landed on `/messages`, after the table it
// writes (`botc_messages`), which is the better name: the row is the thing, and
// "chat" is one of several things that will read it.
//
//   POST {PLATFORM_URL}/api/botc/messages
//   body  = the message contract minus id/seq/createdAt: townId, gameId, kind,
//           senderKey, senderKind, senderSeat, recipientKey, recipientSeat,
//           body, phase, dayNumber.
//   2xx   = the full stored row (id/seq/createdAt included), returned flat, so
//           the relay echoes exactly what the store recorded.
//
// The store also exposes POST /api/botc/messages/batch (≤100, one transaction,
// contiguous seqs) — worth reaching for if this ever buffers a flush, since a
// batch takes the per-town lock once and cannot be split by another writer's
// line landing in the middle.
const CHAT_ENDPOINT = `${PLATFORM_URL}/api/botc/messages`;

// Bounded so a slow/wedged platform can't hold a relay message handler open
// indefinitely — the relay has its own spam/liveness timers running.
const STORE_TIMEOUT_MS = 5000;

/**
 * POST a chat message to the platform store.
 *
 * Resolves with the stored row (id/seq/createdAt included) on a 2xx
 * response. Rejects on anything else — a network failure/timeout rejects
 * with `err.code === "network"`, a non-2xx response rejects with
 * `err.code === "rejected"`. Callers MUST NOT broadcast the message on
 * rejection: a message the store never accepted must not appear in the room
 * as though it were recorded.
 *
 * @param {object} message the row minus id/seq/createdAt
 * @returns {Promise<object>} the stored row
 */
async function postChatMessage(message) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STORE_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
      signal: controller.signal,
    });
  } catch (e) {
    const err = new Error(`chat store unreachable: ${e.message}`);
    err.code = "network";
    throw err;
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch (e) {
      // best-effort only — the status code is the part that matters
    }
    const err = new Error(
      `chat store rejected message: ${res.status} ${detail}`,
    );
    err.code = "rejected";
    throw err;
  }
  return res.json();
}

module.exports = { postChatMessage, CHAT_ENDPOINT };
