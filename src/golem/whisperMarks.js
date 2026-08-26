/**
 * Golem fork (FT-1206): THE PAPER PLANE — a whisper's public trace.
 *
 * When one player whispers another, every browser in the town sees a small
 * paper airplane fly from the sender's coin to the recipient's and rest there
 * a while. The town learns THAT two seats whispered — never what was said.
 *
 * ── METADATA ONLY, ON A SEPARATE LANE ───────────────────────────────────────
 * The whisper itself still travels the relay's private three-socket lane
 * (sender, recipient, storyteller — server/chat.js) and nothing about that
 * changes. The plane is its own broadcast frame, `["whisperMark",{from,to}]`,
 * carrying two SEAT NUMBERS and nothing else — no content, no names, no
 * account ids. It rides the relay's default branch (any unrecognized type is
 * broadcast to the whole channel), so the relay is untouched — the same ride
 * the FT-1200 account offer took on the direct lane.
 *
 * The relay never echoes a broadcast to its sender, so the sending browser
 * shows its own plane locally (socket.js does both in one place, sendChat).
 *
 * ── ONE PLANE PER MESSAGE, NO BATCHING ──────────────────────────────────────
 * The user's call ("an airport is fine"): every whisper is its own plane,
 * however fast they come. WhisperPlanes.vue stacks them.
 *
 * ── OFF IS QUIET ON THE WIRE ────────────────────────────────────────────────
 * The "Whisper marks" setting (towerBells' `whisperMarkSec`, town-synced) at
 * Off suppresses the broadcast AT SEND — the wire carries nothing — and every
 * client also ignores an arriving mark defensively (a hand-written frame from
 * a console must not draw planes in a town that turned them off).
 *
 * This module is the pure half: event names, the wire-shape validator and the
 * timing table. socket.js moves the frames; WhisperPlanes.vue draws.
 */

/** A plane flew — `detail` is the validated `{from, to}`. Window-level, the
 *  TOWER_EVENT idiom: the socket speaks, whoever renders listens. */
export const WHISPER_MARK_EVENT = "golem:whisper-mark";

/** A whisper REACHED THIS BROWSER — `detail` is the store's own row. Fired by
 *  socket.js only for LIVE rows addressed to this viewer (never on catch-up,
 *  so a reload does not replay a night's worth of toasts). */
export const WHISPER_TOAST_EVENT = "golem:whisper-toast";

/** The flight itself, ms — one beat, the same for every plane. */
export const MARK_FLIGHT_MS = 900;

/** The fade at the end of the linger, ms. */
export const MARK_FADE_MS = 600;

/** How long a received-whisper toast stands once unfolded, ms. */
export const TOAST_HOLD_MS = 8000;

/** …and how long the folded plane holds before it unfolds into the note. */
export const TOAST_UNFOLD_MS = 700;

/**
 * The wire shape, refused rather than trusted: two distinct integer seats,
 * both on the ring this client is looking at. Returns the clean `{from, to}`
 * or null.
 */
export function cleanMark(params, ringSize) {
  if (!params || typeof params !== "object") return null;
  const from = params.from;
  const to = params.to;
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
  if (from === to) return null;
  if (!Number.isInteger(ringSize) || ringSize < 2) return null;
  if (from < 0 || to < 0 || from >= ringSize || to >= ringSize) return null;
  return { from, to };
}
