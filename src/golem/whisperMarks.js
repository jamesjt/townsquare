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

/**
 * FT-1263: THE PLANE'S MEMORY — a whisper's traffic as a Chronicle row.
 *
 * The plane is gone in seconds; the Chronicle keeps the day scannable. Each
 * whisper reads in the stream as "Ana ✈ Bea" — WHO whispered WHOM, WHEN,
 * never what — and the row derives from what each viewer ALREADY receives,
 * so nothing new crosses the wire:
 *
 *   · the three PARTIES (sender, recipient, storyteller) hold the whisper
 *     row itself in their log — that row, names and content, IS their
 *     record of the traffic. No second row stands beside it.
 *   · a BYSTANDER holds nothing — their row is the plane's memory: when a
 *     validated `whisperMark` lands (marks on, so they saw the plane fly),
 *     the store keeps a LOCAL row of this kind (chatMarkTraffic). Client
 *     ephemera, never a log row: it has no seq of its own, never crossed
 *     the wire as a row, and a reload forgets it — exactly as honest as
 *     the plane it remembers.
 *
 * Marks Off is quiet on the wire (above), so Off also means no rows — the
 * same fact, enforced structurally. The "Count whispers" setting gates the
 * RENDER besides (ChroniclesDrawer's trafficRows): both settings say "the
 * town may know whispering happened", and the row obeys the pair of them.
 * A finished game publishes its real whisper rows to everyone (chat.js's
 * canSee), so the drawer shows a game's traffic rows only while that game
 * is live — the published rows supersede the memory, and nothing is said
 * twice. Structurally so: the game boundary re-reads the log (socket.js's
 * chatSetGameId subscriber → chatReset), and the reset forgets the marks
 * in the same breath it forgets the log. Between-games whispers never
 * publish, so their memory rows stand — until the next game boundary or a
 * reload, which is as long as any plane's memory lives.
 */
export const TRAFFIC_KIND = "whisper-traffic";

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
