/**
 * Golem fork (FT-1180): THE THINGS YOU CAN DO TO A SEAT — the list itself,
 * once, for every surface that offers it.
 *
 * WHY THIS FILE EXISTS. FT-1169 built ONE component and opened it from two
 * gestures. The user's verdict was that this made both of them bad ("you
 * reused the elements for both the nameplate click and the hover coin which
 * made them both bad"), and they are right: the two schemes want opposite
 * shapes — a ring of little coins hung on the player's own rim, and a glassy
 * plate laid ON the coin. What the two actually share is not a box, it is a
 * VOCABULARY. So the vocabulary moves here and each scheme draws it its own
 * way.
 *
 * A `variant` prop on one component would have been the same mistake wearing
 * a flag, so there isn't one: `SeatRing.vue` and `SeatMenu.vue` know nothing
 * about each other, and neither of them knows what an action MEANS. They are
 * handed a list and they draw it.
 *
 * ── EVERY ACTION, EVERY TIME ────────────────────────────────────────────────
 * The user's last line was the important one: "also neither of them have all
 * of the needed buttons?" FT-1169 made a row's guard decide whether the row
 * EXISTED, so an open chair offered three entries and a dealt one six, and
 * nothing on screen ever admitted that the other three were a thing this app
 * can do. A menu that changes shape every time teaches nobody what it can do.
 *
 * So the list is FIXED. `guard` no longer decides absence — it decides
 * DISABLED, and it returns the REASON as a string, which the surface shows on
 * hover. A disabled row with a reason teaches on the first look; a missing
 * row teaches nothing, ever.
 *
 * ── WHAT IS KEPT FROM FT-1169, BECAUSE IT WAS RIGHT ─────────────────────────
 * Every entry carries the SAME condition as the direct mark it duplicates —
 * `kill` is the shroud's own toggle, `role` the coin's own set-role, the two
 * moves are the drags' own destinations, `nominate` the accusing mark's own
 * call, `ghost-vote` the cowl's own toggle. Two answers to "may this happen
 * now" is how a menu and a mark drift apart. The only thing that changed is
 * what a failing condition COSTS the row.
 *
 * ── THE ONE SLOT THAT HOLDS TWO ACTIONS ─────────────────────────────────────
 * `nominate` and `ghost-vote` share position five, and that is the user's own
 * rider from FT-1169 rather than a saving: they are the same question at two
 * moments — a living seat can point at somebody, a dead one can only spend
 * the vote it has left — and the coin already shares one corner between the
 * accusing hand and the ghost-vote cowl for exactly that reason. Which of the
 * two is present is decided by `slot`, not by a guard, so the list is six
 * long on every seat in the town.
 */

/**
 * ── FT-1194: THE APP'S OWN ART ON THE ROWS ─────────────────────────────────
 * Four entries now carry an `img` — a baked painted mark — instead of a Font
 * Awesome glyph, because the app already SAYS these things in its own art and
 * an icon teaches fastest by recognition:
 *
 *   role         ui-role.png — the toothed coin, the exact mark HostTools'
 *                "Roles" row already wears for "a character on a coin"
 *   move-player  ui-move-player.png — ui-seat's own chair + a bold arrow,
 *                baked to the row-mark family's recipe (this PERSON changes
 *                chairs)
 *   move-role    ui-move-role.png — ui-role's own toothed coin + the same
 *                arrow (this CHARACTER changes owners). Plain coin = change
 *                role; coin with the arrow = the coin goes elsewhere.
 *   nominate     ui-nominate-hand.png — the accusing hand the coin's own
 *                nominate mark wears (FT-1069d)
 *
 * The arrow is ONE bold arrow, not an opposed pair — both were baked and
 * judged at 18px (the plate row's icon box), where the pair's second head
 * dissolves into the shaft under it. The exchange nuance stays in the label
 * and hint; the icon's job is "this thing goes elsewhere".
 *
 * `img` is declared HERE, once, exactly like `icon` — both surfaces (the
 * plate's rows, the ring's little coins) render whichever the entry carries,
 * so changing an entry's art changes both schemes in one line. The old
 * `icon` names stay on the entries as the stood-down record (and they remain
 * registered in main.js); a resolved entry with an `img` is drawn from the
 * img and the icon is ignored.
 *
 * The imports are webpack asset resolutions, same as every component's — this
 * file stays free of stores, components and the DOM.
 */
import uiRole from "../assets/ui-role.png";
import uiMovePlayer from "../assets/ui-move-player.png";
import uiMoveRole from "../assets/ui-move-role.png";
import uiNominateHand from "../assets/ui-nominate-hand.png";

/**
 * The seat facts every guard reads. Player.vue builds one of these
 * (`seatActionContext`) and hands it in; nothing here touches a store, a
 * component or the DOM, which is what makes the list testable from a probe
 * and readable in one screen.
 *
 * @typedef {Object} SeatFacts
 * @property {boolean} isDead        the shroud is on
 * @property {boolean} isVoteless    a ghost that has spent its one vote
 * @property {boolean} hasPlayer     somebody has claimed this chair
 * @property {boolean} hasRole       a character is sitting on it
 * @property {boolean} roleArmed     that character is currently in hand
 * @property {boolean} lockedVote    a vote is running and locked
 * @property {boolean} nomination    a nomination is already up
 * @property {boolean} grimoireHidden `grimoire.isPublic` — the coins are face
 *                                    down, i.e. the room is looking at this
 * @property {?string} whisperRefusal FT-1206: why this seat cannot be
 *                                    whispered right now, or null when it can.
 *                                    COMPUTED BY THE SEAT (Player.vue, from
 *                                    golem/chat's whisperRefusal — the chat
 *                                    level, the viewer, the ring) because the
 *                                    rule is the chat's, not the seat's; this
 *                                    file only carries the answer, exactly as
 *                                    every other guard carries a store fact.
 */

/**
 * THE SIX, in the order they are drawn — the user's own order, from their
 * original spec: "Kill / Change role / Move player / Move role / Player
 * nominates / Add reminder".
 *
 * Each entry is:
 *   id      stable, and what the surface emits back
 *   slot    which of the six positions it occupies (two entries share five)
 *   only    an entry that is only present in one state of its slot
 *   icon    Font Awesome name, all six registered in main.js
 *   label   what the CLICK does, not what the state is — so "Revive" on a
 *           dead seat and "Put character back" on an armed one, exactly as
 *           FT-1169 wrote them
 *   hint    what the row does, for the surface's tooltip when it is ENABLED
 *   guard   null when the act may happen, otherwise the reason it may not.
 *           That reason IS the disabled tooltip.
 *   armed   the act is currently running and clicking again undoes it
 *   act     the seat method to run. A NAME rather than a closure: the seat
 *           owns its own methods, and a string keeps this file free of any
 *           opinion about how a component is put together.
 */
const ENTRIES = [
  {
    id: "kill",
    slot: 1,
    icon: (f) => (f.isDead ? "heartbeat" : "skull"),
    label: (f) => (f.isDead ? "Revive" : "Kill"),
    hint: (f) =>
      f.isDead
        ? "Bring this player back to life"
        : "Kill this player — the shroud goes on",
    // Never refused. A storyteller may kill an open chair (the chair is what
    // dies in this app, not the person), and reviving is the same toggle.
    guard: () => null,
    act: "toggleStatus",
  },
  {
    id: "role",
    slot: 2,
    // FT-1194: the mask glyph stood down for the app's own coin mark — the
    // thing this row changes is what sits on the coin, and ui-role.png is
    // already that word elsewhere (HostTools' "Roles" row).
    icon: () => "mask",
    img: () => uiRole,
    label: () => "Change role",
    hint: () => "Pick the character sitting on this chair",
    guard: () => null,
    act: "openRoleModal",
  },
  {
    id: "move-player",
    slot: 3,
    // FT-1194: redo-alt (a refresh arrow) stood down — it said "again", not
    // "elsewhere". The chair with the arrow is this PERSON changing chairs.
    icon: () => "redo-alt",
    img: () => uiMovePlayer,
    label: () => "Move player",
    hint: () => "Pick this player up — then pick the chair they move to",
    /**
     * TWO REASONS, and the ORDER matters: an open chair is the permanent
     * fact and a locked vote is the passing one, so the permanent one is
     * reported first. A storyteller reading "Not while a vote is locked" on
     * an empty chair would wait for the vote and find the row still dead.
     */
    guard: (f) => {
      if (!f.hasPlayer)
        return "This chair is open — there is no player to move";
      if (f.lockedVote) return "Not while a vote is locked";
      return null;
    },
    act: "movePlayer",
  },
  {
    id: "move-role",
    slot: 4,
    // FT-1194: people-arrows stood down — two PEOPLE trading is the other
    // row's meaning. The toothed coin with the arrow is this CHARACTER
    // changing owners; the plain coin one row up is changing what it is.
    icon: () => "people-arrows",
    img: () => uiMoveRole,
    label: (f) => (f.roleArmed ? "Put character back" : "Move role"),
    hint: () =>
      "Pick this chair's character up — then tap another seat to trade them over",
    guard: (f) =>
      f.hasRole ? null : "This chair has no character on it to move",
    armed: (f) => !!f.roleArmed,
    act: "armCharacter",
  },
  {
    id: "nominate",
    slot: 5,
    only: (f) => !f.isDead,
    // FT-1194: the stock pointing glyph stood down for the app's own hand —
    // the same accusing manicule the coin's nominate mark wears (FT-1069d).
    icon: () => "hand-point-right",
    img: () => uiNominateHand,
    label: () => "Player nominates",
    hint: () => "This player nominates — then pick who they point at",
    guard: (f) => (f.nomination ? "A nomination is already running" : null),
    act: "nominatePlayer",
  },
  {
    id: "ghost-vote",
    slot: 5,
    only: (f) => f.isDead,
    icon: () => "vote-yea",
    label: (f) => (f.isVoteless ? "Give ghost vote back" : "Use ghost vote"),
    hint: (f) =>
      f.isVoteless
        ? "This ghost's vote is spent — hand it back"
        : "Spend this ghost's one vote",
    guard: () => null,
    act: "toggleGhostVote",
  },
  {
    id: "reminder",
    slot: 6,
    icon: () => "plus",
    label: () => "Add reminder",
    hint: () => "Put a reminder token on this seat",
    /**
     * THE ROW THE USER FOUND MISSING. FT-1169 gated it on
     * `!grimoire.isPublic` and let the guard delete it, so with the coins
     * face down — which is what "Play again" leaves behind (store/index.js's
     * `clearEnded`) and what the G key does — the seat's menu quietly lost an
     * entry and never said why. The gate itself is right and is kept: a
     * reminder token is the storyteller's own writing and the public view is
     * the room's. It just says so now instead of vanishing.
     */
    guard: (f) =>
      f.grimoireHidden
        ? "Not while the grimoire is hidden — the room can see this seat"
        : null,
    act: "openReminderModal",
  },
  {
    /**
     * FT-1206: THE SEVENTH SLOT — whisper this seat. The same whisper the
     * Chronicle's composer sends (one send path, golem/chat's whisperFrame);
     * what this row opens is the inline input (SeatWhisper.vue), drawn by
     * each scheme in its own shape. The guard's reasons are the chat level's
     * own words ("Chat is off", "Whispers are off", "Only your neighbors"),
     * precomputed by the seat — see SeatFacts. The row keeps the fixed-list
     * rule: refused is drawn, never absent.
     */
    id: "whisper",
    slot: 7,
    icon: () => "paper-plane",
    label: () => "Whisper",
    hint: () => "Send this player a private message",
    guard: (f) => f.whisperRefusal || null,
    act: "openSeatWhisper",
  },
];

/**
 * The six actions for one seat, resolved against its facts.
 *
 * @param {SeatFacts} facts
 * @returns {Array<{id, icon, label, title, disabled, reason, armed, act}>}
 */
export function seatActions(facts) {
  const f = facts || {};
  return ENTRIES.filter((e) => !e.only || e.only(f)).map((e) => {
    const reason = e.guard(f);
    const label = e.label(f);
    return {
      id: e.id,
      icon: e.icon(f),
      // FT-1194: the app's own art, when the entry carries any — the surface
      // draws `img` when it is non-empty and falls back to the FA `icon`
      // name, so one field here feeds both the plate and the ring.
      img: e.img ? e.img(f) : "",
      label,
      // ONE TOOLTIP FIELD, and which sentence is in it is the whole point of
      // this rework: enabled says what the row does, disabled says why it
      // cannot. The label rides along in the disabled case because a ring's
      // little coin carries no words of its own — that surface's only way of
      // naming an entry is this string.
      title: reason ? `${label} — ${reason}` : e.hint(f),
      disabled: !!reason,
      reason: reason || "",
      armed: e.armed ? e.armed(f) : false,
      act: e.act,
    };
  });
}

/** The whole vocabulary, in order, ignoring any seat — for a surface that
 *  wants to size itself to the widest label it will ever have to draw rather
 *  than to the one it happens to be showing. */
export function seatActionLabels() {
  return ENTRIES.map((e) =>
    e.label({ isDead: false, isVoteless: false, roleArmed: false }),
  );
}
