/**
 * Golem fork (FT-1013) — "Take over hosting here."
 *
 * A second host arriving at a live channel is refused by the relay — rightly,
 * because newest-wins would let anyone holding the invite link evict a
 * storyteller mid-game. But the town's OWNER refused by their own other window
 * (a ghost tab, a browser that moved rooms) used to hit a dead end. This
 * module is the way through: the browser that holds the town's edit key
 * (the FT-847 shelf) may prove it and take the channel.
 *
 * THE SHAPE, end to end:
 *   1. The relay refuses the duplicate host; socket.js's close handler asks
 *      this module first (offerHostTakeover) before running the normal leave.
 *   2. Eligibility is possession of the edit key, nothing else — the same
 *      definition of ownership every keyed town route uses. No key, no offer.
 *   3. It is an OFFER, never automatic: the owner clicking their own invite
 *      link in a second tab mid-game must not silently tear down the window
 *      that is actually running the town. A small bar says what happened and
 *      holds the choice; declining (or ignoring it for 20s) runs exactly the
 *      leave the refusal would have run anyway.
 *   4. Accepting arms a ONE-SHOT credential and reconnects through the normal
 *      LiveSession path; takeoverSuffix hands the key to the socket URL once
 *      (`?takeover=<key>`) and forgets it, so no later reconnect ever
 *      re-presents it.
 *   5. The relay verifies the key against the platform's stored hash and
 *      closes the incumbent with a reasoned code-1000 close — which that
 *      window's client (FT-1011) reads as "leave", not "reconnect".
 *
 * A rejected credential (stale shelf key, unclaimed town) comes back as the
 * same duplicate-host refusal; the RETRY_COOLDOWN below keeps that from
 * looping the offer, and the second refusal falls through to the normal leave.
 */
import { editKeyFor, normalizeTownId } from "./towns";
import { leaveTown } from "./townRoute";
import { flashHint } from "./hint";

/** The relay's duplicate-host refusal, matched by its one stable phrase. */
const REFUSAL_RE = /already has a host/i;

const OFFER_ID = "golem-host-takeover";
/** An unanswered offer runs the normal leave — the town square behind it is
 *  disconnected and stale, and nobody should sit in front of that for long. */
const OFFER_TIMEOUT = 20000;
/** After an attempt, a repeat refusal (stale key) falls through to the normal
 *  leave instead of re-offering forever. */
const RETRY_COOLDOWN = 30000;

/** The one-shot armed credential: { channel, key } while a takeover reconnect
 *  is in flight, null otherwise. */
let armed = null;

/** Per-channel timestamp of the last takeover attempt (the loop guard). */
const attemptedAt = {};

/**
 * The socket-URL suffix for the connection being opened right now:
 * "?takeover=<key>" exactly once, for exactly the armed channel's host
 * connection — the empty string in every other case, which keeps every
 * ordinary connect byte-identical to today's.
 *
 * Consuming on read is the point: the credential rides one reconnect and is
 * gone, so an unrelated later reconnect (a network blip an hour on) can never
 * silently evict another window again.
 */
export function takeoverSuffix(channel, isSpectator) {
  if (isSpectator || !armed) return "";
  if (armed.channel !== normalizeTownId(channel)) return "";
  const { key } = armed;
  armed = null;
  return "?takeover=" + encodeURIComponent(key);
}

/**
 * Asked by socket.js's close handler on every reasoned relay close, BEFORE
 * the normal leave. Returns true when this module has taken ownership of the
 * close (the offer is up, and both outcomes — accept and decline — are
 * handled here); false means "not my case, run the leave as ever": not a
 * duplicate-host refusal, a spectator, no edit key held, or a just-failed
 * attempt (the cooldown).
 *
 * @param reason  the relay's close reason
 * @param channel the town the refused connection was for
 * @param session the LiveSession that owns the closed socket — reconnect runs
 *                through it so the takeover connection is wired like any other
 */
export function offerHostTakeover(reason, channel, session) {
  if (!REFUSAL_RE.test(reason || "")) return false;
  if (session._isSpectator) return false;
  const clean = normalizeTownId(channel);
  if (!clean) return false;
  const key = editKeyFor(clean);
  if (!key) return false;
  if (Date.now() - (attemptedAt[clean] || 0) < RETRY_COOLDOWN) return false;
  // An offer is already up (a second refusal racing in) — it owns the close.
  if (document.getElementById(OFFER_ID)) return true;

  const bar = document.createElement("div");
  bar.id = OFFER_ID;
  bar.style.cssText = [
    "position:fixed",
    "bottom:26px",
    "left:50%",
    "transform:translateX(-50%)",
    "background:rgba(0,0,0,0.9)",
    "color:#fff",
    "padding:12px 18px",
    "border:2px solid #400",
    "border-radius:8px",
    "box-shadow:0 0 8px black",
    "z-index:100",
    "font-size:14px",
    "text-align:center",
    "max-width:90vw",
  ].join(";");

  const text = document.createElement("div");
  text.textContent =
    "This town already has a host in another window. " +
    "You own this town — take over hosting here?";
  bar.appendChild(text);

  const row = document.createElement("div");
  row.style.cssText =
    "margin-top:8px;display:flex;gap:10px;justify-content:center";

  const buttonCss = [
    "font:inherit",
    "color:#fff",
    "background:#400",
    "border:1px solid #700",
    "border-radius:6px",
    "padding:5px 14px",
    "cursor:pointer",
  ].join(";");

  let timer = null;
  const cleanup = () => {
    clearTimeout(timer);
    bar.remove();
  };
  // Declining — by button or by silence — is exactly the leave the refusal
  // would have run without this module (socket.js's own else-branch pair).
  const decline = () => {
    cleanup();
    leaveTown(session._store);
    flashHint(reason);
  };

  const accept = document.createElement("button");
  accept.textContent = "Take over hosting";
  accept.style.cssText = buttonCss;
  accept.onclick = () => {
    cleanup();
    attemptedAt[clean] = Date.now();
    armed = { channel: clean, key };
    flashHint("Taking over hosting as this town's owner…");
    session.connect(clean);
  };
  row.appendChild(accept);

  const dismiss = document.createElement("button");
  dismiss.textContent = "Leave";
  dismiss.style.cssText = buttonCss;
  dismiss.onclick = decline;
  row.appendChild(dismiss);

  bar.appendChild(row);
  document.body.appendChild(bar);
  timer = setTimeout(decline, OFFER_TIMEOUT);
  return true;
}
