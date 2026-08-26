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
    icon: () => "mask",
    label: () => "Change role",
    hint: () => "Pick the character sitting on this chair",
    guard: () => null,
    act: "openRoleModal",
  },
  {
    id: "move-player",
    slot: 3,
    icon: () => "redo-alt",
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
    icon: () => "people-arrows",
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
    icon: () => "hand-point-right",
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
