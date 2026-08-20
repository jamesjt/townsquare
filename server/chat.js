"use strict";

// Golem fork (FT-964, chat 2 of 3): the three chat deliveries over the
// existing per-town channel — a room message to everyone, a whisper to
// exactly three sockets, and a system message to everyone. The relay holds
// no history and mints nothing; it is a courier between a sender socket, the
// platform's chat store (FT-963, the message-row contract), and whichever
// sockets are allowed to see the result.
//
// WRITE PATH (decided for this lane): the RELAY forwards to the platform and
// echoes the stored row back to the room. The client does not write directly
// to the platform and have the relay fan out on trust, because that would
// let a client-picked id/seq (or a message the store later rejects) reach
// other players' logs before — or instead of — the platform's own accept.
// Concretely: nothing is ever broadcast until `postChatMessage` resolves: a
// rejected or unreachable store produces a `chatError` back to the SENDER
// ONLY, never a broadcast, so a message the store never accepted can never
// appear in anyone's log as though it were recorded.
//
// WIRE SHAPE, client -> relay:
//   ["chat", { to, kind, gameId, senderKey, senderKind, senderSeat,
//              recipientKey, recipientSeat, body, phase, dayNumber }]
//
// `to` is the RAW CONNECTION playerId (exactly what `ws.playerId` already
// carries elsewhere in this file — "host", or the per-browser session id the
// URL was opened with) of the single whisper recipient. It is ROUTING only,
// and deliberately distinct from `recipientKey`/`recipientSeat` (the STORED
// row's identity fields, e.g. a display name or seat number) — the same
// separation the existing "direct" case already draws between a connection's
// `client.playerId` and the content addressed to it. Required (non-empty)
// when `kind === "whisper"`; ignored otherwise.
//
// `townId` is NEVER read from the client payload — it is always `ws.channel`,
// the same authority every other case in this file already trusts. A client
// cannot write into a town it is not connected to.
//
// WIRE SHAPE, relay -> client (broadcast): ["chat", storedRow], where
// `storedRow` is exactly what the platform returned — id/seq/createdAt
// included. On failure the SENDER (and only the sender) instead receives
// ["chatError", { reason }], reason one of "whisper_missing_recipient",
// "store_rejected", "store_unavailable".
const { postChatMessage } = require("./chatStore");

const KINDS = new Set(["say", "whisper", "system"]);

function sendChatError(ws, reason, WebSocket) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(["chatError", { reason }]));
  }
}

/**
 * Handle one `["chat", payload]` frame from `ws`. Never throws — failures are
 * reported to the sender via `chatError` and logged; the returned promise
 * always resolves.
 *
 * @param {WebSocket} ws the sender's socket (already admitted: ws.channel /
 *   ws.playerId are set)
 * @param {string} data the raw frame, e.g. '["chat",{"kind":"say",...}]'
 * @param {{channels: object, WebSocket: object, metrics: object}} ctx
 */
async function handleChatFrame(ws, data, { channels, WebSocket, metrics }) {
  let frame;
  try {
    frame = JSON.parse(data);
  } catch (e) {
    console.log(
      new Date(),
      ws.channel,
      ws.playerId,
      "chat: invalid JSON",
      e.message,
    );
    return;
  }
  const payload = (Array.isArray(frame) && frame[1]) || {};
  const kind = payload.kind;
  if (!KINDS.has(kind)) {
    console.log(
      new Date(),
      ws.channel,
      ws.playerId,
      "chat: unknown kind",
      kind,
    );
    return;
  }

  // System messages are generated game-state announcements, not freeform
  // player text — the same one-way, host-only trust boundary the "callback"
  // case above already enforces, for the same reason: the relay is the only
  // participant that can actually tell who a frame came from.
  if (kind === "system" && ws.playerId !== "host") {
    console.log(
      new Date(),
      ws.channel,
      ws.playerId,
      "chat: system message refused (not host)",
    );
    return;
  }

  const roster = channels[ws.channel] || [];

  let recipientSocket = null;
  if (kind === "whisper") {
    if (!payload.to) {
      console.log(
        new Date(),
        ws.channel,
        ws.playerId,
        "chat: whisper missing recipient",
      );
      sendChatError(ws, "whisper_missing_recipient", WebSocket);
      return;
    }
    recipientSocket =
      roster.find(
        (client) =>
          client.playerId === payload.to &&
          client.readyState === WebSocket.OPEN,
      ) || null;
    // A recipient who has since disconnected still gets the message stored
    // below (so a reconnect / the log surface sees it) — there is just
    // nobody live to route it to right now. Not an error.
  }

  const hostSocket =
    ws.playerId === "host"
      ? ws
      : roster.find(
          (client) =>
            client.playerId === "host" && client.readyState === WebSocket.OPEN,
        ) || null;

  const message = {
    townId: ws.channel,
    gameId: payload.gameId ?? null,
    kind,
    senderKey: payload.senderKey ?? null,
    senderKind:
      kind === "system"
        ? "system"
        : payload.senderKind === "account"
        ? "account"
        : "name",
    senderSeat: payload.senderSeat ?? null,
    recipientKey: kind === "whisper" ? payload.recipientKey ?? null : null,
    recipientSeat: kind === "whisper" ? payload.recipientSeat ?? null : null,
    body: typeof payload.body === "string" ? payload.body : "",
    phase: payload.phase === "night" ? "night" : "day",
    dayNumber: payload.dayNumber ?? null,
  };

  let stored;
  try {
    stored = await postChatMessage(message);
  } catch (e) {
    console.log(
      new Date(),
      ws.channel,
      ws.playerId,
      "chat: store failed —",
      e.message,
    );
    sendChatError(
      ws,
      e.code === "rejected" ? "store_rejected" : "store_unavailable",
      WebSocket,
    );
    return;
  }

  const out = JSON.stringify(["chat", stored]);

  if (kind === "whisper") {
    // Golem fork: the allow-list is built FIRST, as a set of sockets, and the
    // send loop below sends to nothing but membership in it. A whisper
    // reaching a fourth socket is a game-ruining leak, not a cosmetic one —
    // routing is not computed ad hoc per client, it is one list, checked
    // once, sender + recipient + storyteller and nothing else.
    const targets = new Set([ws]);
    if (recipientSocket) targets.add(recipientSocket);
    if (hostSocket) targets.add(hostSocket);
    roster.forEach((client) => {
      if (targets.has(client) && client.readyState === WebSocket.OPEN) {
        client.send(out);
        metrics.messages_outgoing.inc();
      }
    });
  } else {
    // "say" and "system" both go to the whole channel.
    roster.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(out);
        metrics.messages_outgoing.inc();
      }
    });
  }
}

module.exports = { handleChatFrame };
