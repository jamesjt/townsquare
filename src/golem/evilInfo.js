/**
 * Golem fork (FT-1393): EVIL KNOWS EVIL ON GAME START — and the Lunatic is
 * fed the same dish, faked.
 *
 * On the first night the storyteller shows the demon who the minions are and
 * shows each minion the other minions and the demon. That is not a note the
 * storyteller writes — it is information the RULES oblige them to hand out
 * the moment the roles land, exactly like the demon's bluffs (dealLies.js)
 * and the red herring (dealReminders.js). So the deal builds it.
 *
 * TWO HALVES, DELIBERATELY SEPARATE:
 *
 *   THE TABLE  `buildEvilInfoTable()` — one row per seat, host-side truth
 *              about WHAT each seat is due to learn about the evil team.
 *              Rows for real evil seats derive from TRUTH (the demon's row
 *              lists the minions; each minion's row lists the other minions
 *              and the demon). The Lunatic's row is FICTION, pre-seeded from
 *              their believed-demon state. This is the surface a later
 *              storyteller editor will read and rewrite.
 *
 *   THE TOKENS `evilInfoAdditions()` — the table's delivered rows become
 *              reminder tokens on the receiving chairs, through the SAME
 *              pipe truth and fiction alike: a fake minion token on the
 *              Lunatic's chair is indistinguishable from a real one on the
 *              demon's, because it is the same object.
 *
 * WHO RECEIVES IS KEYED OFF THE BELIEVED TEAM, never the true one — that is
 * the whole trick, and it covers every warping character with one rule:
 *
 *   LUNATIC     true good, believes demon  → RECEIVES, and receives fiction
 *               (fake minions; the real ones are never shown).
 *   MARIONETTE  true minion, believes townsfolk → receives NOTHING (their
 *               row is empty), while still APPEARING in the demon's row —
 *               row content is truth-derived, row receipt is belief-keyed.
 *   DRUNK       true good, believes townsfolk → nothing, appears nowhere.
 *
 * THE LUNATIC'S FICTION DEFAULT: as many fake minions as the town has real
 * ones, drawn from the script's minions NOT in play — so the dish is the
 * right size and can never accidentally serve the truth. A script with no
 * spare minions serves a shorter (possibly empty) plate; the storyteller's
 * own hand-placed tokens remain one click away, exactly as before. This is
 * a DEFAULT, not a lock — the tokens are ordinary reminder tokens the
 * storyteller edits or clears like any other.
 *
 * DELIVERY IS A STATE, NOT AN EVENT. Every row carries `delivery`, default
 * DELIVERED (tokens land at the deal). HELD exists for the Poppy-Grower
 * class of scripts — a held row builds its content but places no tokens —
 * and nothing sets it tonight; the automation that will is a later card.
 *
 * PRIVACY IS NOT THIS FILE'S PROBLEM, like the two choosers before it.
 * Reminders are grimoire furniture: socket.js's `sendPlayer` refuses to
 * broadcast them, and the one door out (a granted grimoire window,
 * `sendGrimoire`) already cuts the dealt mark off the wire. The spy/grimoire
 * surfaces show what the storyteller sees, which is the existing
 * reminder-token model, unchanged.
 *
 * PURE, AND IT TAKES THE ROSTER RATHER THAN THE STORE — the same shape
 * chooseLies() and chooseDealtReminders() have, for the same reason. The
 * store action that consumes it (players/dealReminders) commits what comes
 * back and nothing else.
 */
import { beliefOf } from "./belief";
import { shuffled } from "./dealLies";
import { DEALT_MARK } from "./dealReminders";

/** A row's delivery state. DELIVERED rows place their tokens at the deal;
 *  HELD rows keep their content off the table until released (the
 *  Poppy-Grower class — nothing sets it tonight, the state exists so the
 *  table's shape does not change when that card lands). */
export const DELIVERY_DELIVERED = "delivered";
export const DELIVERY_HELD = "held";

/**
 * The reminder token a role becomes — on a chair, or as a tile in the
 * picker's role-icon groups (ReminderModal). Deliberately the same object
 * `mapReminder`/`dealtToken` build, with the role's own NAME as the text:
 * a "Poisoner" token reads Poisoner whoever placed it.
 */
export const roleToken = (role) => ({
  role: role.id,
  image: role.image,
  imageAlt: role.imageAlt,
  name: role.name,
});

/** The same token, wearing the deal's mark — so the next deal's strip
 *  (dealReminders.js) clears it and draws afresh, and a granted grimoire
 *  window cannot tell it from a hand-placed one (the mark is cut off the
 *  wire). */
const dealtRoleToken = (role) => ({
  ...roleToken(role),
  [DEALT_MARK]: true,
});

/** Every minion character this script carries that is NOT on a chair —
 *  the Lunatic's fiction pool. Truth can never leak through it: an in-play
 *  minion is excluded by construction. */
const spareMinions = (roles, inPlay) => {
  const pool = [];
  if (!roles || typeof roles.forEach !== "function") return pool;
  roles.forEach((role) => {
    if (role && role.id && role.team === "minion" && !inPlay.has(role.id)) {
      pool.push(role);
    }
  });
  return pool;
};

/**
 * FT-1396: the chairs the Lunatic's fake minions are pinned to. On the first
 * night the storyteller doesn't hand the Lunatic a list of names — they POINT
 * AT PLAYERS. So the fiction needs chairs as much as it needs characters, and
 * the pool is every chair the fiction may safely point at: a TRUE-good,
 * non-traveler seat that is not the receiver's own. A real evil chair is
 * excluded by construction — a fake minion pinned to the real Poisoner would
 * be the fiction accidentally serving the truth, the one thing it must never
 * do. Shuffled, one chair per fake minion; a town with fewer good chairs than
 * fakes pins what it can (`seats` may run shorter than `roles`, and the badge
 * delivery pairs them index by index).
 */
const fictionSeats = (players, receiver, count) => {
  const pool = [];
  players.forEach((player, index) => {
    if (index === receiver) return;
    const team = (player && player.role && player.role.team) || "";
    if (team === "townsfolk" || team === "outsider") pool.push(index);
  });
  return shuffled(pool).slice(0, count);
};

/**
 * Build the believed-team table: one row per seat, in seat order.
 *
 * @param players the seating, in order — each seat's `role` is its TRUTH,
 *   its `believedRole` (when set) the lie it was dealt (dealLies commits
 *   beliefs BEFORE the reminders deal runs, so the Lunatic's is already on
 *   the seat here).
 * @param roles the current script's roles (the store's `roles` Map) — only
 *   the Lunatic's fiction draws on it.
 * @returns {{index:number, roles:object[], seats:number[], fiction:boolean,
 *   delivery:string}[]}
 *   `roles` is what this seat is due to learn (role objects, seat order for
 *   truth rows, shuffled for fiction); `seats` (FT-1396) is WHERE each of
 *   them sits, paired one to one with `roles` — read off the table for truth
 *   rows, chosen by `fictionSeats` for the Lunatic's; `fiction` marks a row
 *   the storyteller authored (or this default authored for them) rather than
 *   one derived from truth. Every seat gets a row — an empty one IS the
 *   information that this seat learns nothing.
 */
export function buildEvilInfoTable({ players = [], roles } = {}) {
  const inPlay = new Set();
  players.forEach((player) => {
    if (player && player.role && player.role.id) inPlay.add(player.role.id);
  });
  // TRUTH SIDE — who actually sits on the evil team, in seat order, WITH
  // their chairs (FT-1396: the seat badges need the chair beside the role).
  // The Marionette is a true minion and belongs in the demon's row whatever
  // their own seat believes.
  const trueMinions = [];
  const trueDemons = [];
  players.forEach((player, index) => {
    const team = (player && player.role && player.role.team) || "";
    if (team === "minion") trueMinions.push({ index, role: player.role });
    if (team === "demon") trueDemons.push({ index, role: player.role });
  });

  return players.map((player, index) => {
    const truth = (player && player.role) || {};
    const believed = beliefOf(player);
    const believedTeam = believed.team || "";
    const row = {
      index,
      roles: [],
      seats: [],
      fiction: false,
      delivery: DELIVERY_DELIVERED,
    };
    if (believedTeam === "demon") {
      if (truth.team === "demon") {
        // A real demon learns the real minions — and their chairs.
        row.roles = trueMinions.map((m) => m.role);
        row.seats = trueMinions.map((m) => m.index);
      } else {
        // The Lunatic: same dish, faked — see the header for the default,
        // and fictionSeats for the chairs the fakes are pinned to.
        row.fiction = true;
        row.roles = shuffled(spareMinions(roles, inPlay)).slice(
          0,
          trueMinions.length,
        );
        row.seats = fictionSeats(players, index, row.roles.length);
      }
    } else if (believedTeam === "minion") {
      if (truth.team === "minion") {
        // A real minion learns the other minions and the demon. Excluded by
        // SEAT, not object identity (FT-1396): two chairs holding the same
        // minion character share one role object from the roles Map, and
        // the old identity filter silently dropped both from each other's
        // rows.
        const others = trueMinions
          .filter((m) => m.index !== index)
          .concat(trueDemons);
        row.roles = others.map((m) => m.role);
        row.seats = others.map((m) => m.index);
      } else {
        // A good seat told it is a minion (no standard character does this,
        // but belief.js supports "anything a storyteller invents"): the row
        // exists and is theirs to author — an empty default never leaks.
        row.fiction = true;
      }
    }
    // Every other believed team — good seats, the Marionette, open chairs —
    // keeps the empty row built above: they learn nothing.
    return row;
  });
}

/**
 * The table's delivered rows as reminder-token additions, one entry per
 * seat that receives anything: `{ index, tokens }`. Held and empty rows
 * place nothing.
 */
export function evilInfoAdditions(table) {
  const additions = [];
  (table || []).forEach((row) => {
    if (!row || row.delivery !== DELIVERY_DELIVERED) return;
    if (!Array.isArray(row.roles) || !row.roles.length) return;
    additions.push({
      index: row.index,
      tokens: row.roles.map(dealtRoleToken),
    });
  });
  return additions;
}

/**
 * FT-1396: the table's delivered rows as SEAT BADGES — what each receiving
 * seat's own view paints on its teammates' chairs. One entry per seat that
 * receives anything: `{ index, badges }`, where `badges` is `{ index, team }`
 * per teammate chair — the TEAM glyph, never the role, because the badge is
 * "this chair is on my team", not a second grimoire.
 *
 * `team` is read off the row's own roles ("demon" or, for everything else,
 * "minion" — a fiction row's fakes are minions by construction), so the
 * Lunatic's fake badges are built from the same pairs their tokens are:
 * truth and fiction through one pipe, indistinguishable on arrival.
 *
 * A pair missing its chair (a starved fiction — see fictionSeats) is
 * skipped, and a row can never badge its OWN receiver: rows never name
 * their receiver, and this asserts it anyway rather than trusting it.
 */
export function evilInfoBadges(table) {
  const perSeat = [];
  (table || []).forEach((row) => {
    if (!row || row.delivery !== DELIVERY_DELIVERED) return;
    if (!Array.isArray(row.roles) || !row.roles.length) return;
    const badges = [];
    row.roles.forEach((role, i) => {
      const seat = Array.isArray(row.seats) ? row.seats[i] : undefined;
      if (typeof seat !== "number" || seat < 0 || seat === row.index) return;
      badges.push({
        index: seat,
        team: role && role.team === "demon" ? "demon" : "minion",
      });
    });
    if (badges.length) perSeat.push({ index: row.index, badges });
  });
  return perSeat;
}
