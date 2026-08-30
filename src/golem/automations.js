/**
 * Golem fork (FT-1314): THE AUTOMATIONS — the storyteller's opt-in machine.
 *
 * Blood on the Clocktower is run by a human, and this fork keeps it that way:
 * every rule below is a chore the storyteller ALREADY performs with existing
 * manual controls, done for them at the moment the game state says it is due.
 * Nothing here invents a new kind of event — an automation only ever commits
 * the same mutations the storyteller's own click would have, which is also
 * the whole undo story: the manual control that made a thing reversible
 * yesterday reverses the automation's copy of it today.
 *
 * ── THE FRAMEWORK ──────────────────────────────────────────────────────────
 * One boolean per rule on the tower shelf (golem/towerBells' DEFAULT_TOWER —
 * per-town persisted, sanitized, synced on the existing tower frames), all
 * DEFAULT OFF. The build panel's Automations group (HostTools) is the only
 * writer; this module is the only reader that ACTS. The engine's entry
 * points are called from socket.js's mutation subscriber — the one place
 * that already sees every game event on the host's client — and every one of
 * them is a no-op on a spectator, on an unarmed rule, or when the condition
 * is not met.
 *
 * Every automation that FIRES leaves a record:
 *   · PUBLIC facts (a mark, an execution, a spent ghost vote) go to the
 *     town's own log via systemMessage — a plain sentence, prefixed
 *     "Automation —", saying what was done and why.
 *   · SECRET-BEARING facts (the Scarlet Woman's new character, the starpass
 *     heir) go to the NIGHT LOG instead: a row for the affected seat, which
 *     the storyteller reads in their Chronicle and which the existing
 *     night-frame delivery hands to that one player's client — the same
 *     "was given <character>" reveal the night sheet's Send performs. A
 *     public town-log line would hand the whole town the demon's identity,
 *     which no storyteller tool may do.
 *
 * ── WHO DECIDES ────────────────────────────────────────────────────────────
 * The storyteller, still. Everything below is defaults-not-locks: the mark
 * toggle, the shroud, the ghost-vote control, the role editor and the night
 * sheet all keep working on whatever an automation wrote.
 */

import { towerState, DEFAULT_TOWER } from "./towerBells";
import { makeEntry, entryId } from "./nightLog";
import rolesJSON from "../roles.json";

/**
 * The vocabulary — one row per checkbox on the build panel's Automations
 * group. `key` is the tower field; `mark` is the fork's own painted art (the
 * same asset the rule's subject wears on the town — the noose that marks the
 * block, the shroud-skull death mark, the ghost-vote hand), replacing the
 * Font Awesome stand-ins of the first cut (FT-1321).
 *
 * FT-1322 SPLIT THIS LIST IN TWO. Only the ROLE-AGNOSTIC rules live here —
 * the ones any script plays under. A rule that exists because one character
 * exists (the Imp's starpass, the Scarlet Woman's succession, the
 * Undertaker's prefill) is declared ON THE ROLE, in roles.json, as
 * `automation: { key, hook, label, title, offTitle, onTitle }` — `key` the
 * tower field that arms it (which must exist on DEFAULT_TOWER's shelf),
 * `hook` the engine entry point the rule rides (onDeath, onNightEntry,
 * prefillUndertaker — the exported functions below), the rest the row's own
 * teaching text. The build panel renders those rows from the SELECTED
 * SCRIPT's roles (roleAutomationRules), each wearing its role's token art,
 * so a script without the Imp simply has no starpass row — the same
 * role-declares-its-rule precedent FT-1120 set with `reminders[].deal`.
 */
export const AUTOMATION_RULES = [
  {
    key: "autoMark",
    label: "Auto-mark execution",
    mark: require("../assets/ui-noose.png"),
    title: "A concluded vote moves the execution mark by itself",
    offTitle:
      "Off — the storyteller marks the block by hand, as always (undo: the vote card's own Mark/Cancel toggle)",
    onTitle:
      "A vote that passes with more votes than the standing mark takes the block; " +
      "an exact tie crosses both marks out — nobody hangs as it stands",
  },
  {
    key: "autoExecute",
    label: "End-day execution",
    mark: require("../assets/ui-dead.png"),
    title: "End day executes whoever stands marked",
    offTitle:
      "Off — ending the day executes nobody; the storyteller drops the shroud by hand",
    onTitle:
      "End day executes the marked player (no execution while the tie-cross " +
      "stands or nobody is marked). Undo: lift the shroud on the seat.",
  },
  {
    key: "autoGhostVote",
    label: "Ghost votes",
    // FT-1326b (user): the SAME cowl the Ghost vote display row wears
    // (HostTools' uiGhostCowl, FT-996's seat mark) — the cowl-hand composite
    // this row wore first read as a different vocabulary than the row one
    // group up that governs the same mark.
    mark: require("../assets/ui-ghost-cowl.png"),
    title: "A dead raised hand spends its ghost vote at the vote's close",
    offTitle:
      "Off — the storyteller spends ghost votes by hand on the seat, as always",
    onTitle:
      "A dead player's raised hand at a vote's conclusion spends their ghost " +
      "vote, pass or fail. Undo: the seat's existing hand-it-back control.",
  },
];

/** A role's automation declaration, or null — the tolerant reader (the
 *  `reminderDeal` idiom): only an object carrying a tower-known `key` counts,
 *  so a homebrew declaring a key the shelf doesn't hold renders no dead
 *  checkbox (the tower's sanitizer would drop its writes). */
export function roleAutomation(role) {
  const auto = role && role.automation;
  if (!auto || typeof auto !== "object") return null;
  if (!auto.key || !(auto.key in DEFAULT_TOWER)) return null;
  return auto;
}

/** The base library's declared rules — every role in roles.json carrying an
 *  automation. The FLAG enumeration below reads this (the session mirror
 *  carries every armable key no matter the script); the PANEL never does —
 *  it asks roleAutomationRules for the selected script's rows instead. */
const LIBRARY_ROLE_RULES = rolesJSON
  .map((role) => roleAutomation(role))
  .filter(Boolean);

/**
 * The Automations rows the SELECTED SCRIPT earns — one per role in `roles`
 * (the store's script Map) that declares an automation. Night order (the
 * role's `otherNight`) keeps the rows where the first cut pinned them:
 * Scarlet Woman (19), Imp (24), Undertaker (55).
 *
 * @param roles the store's `state.roles` Map for the selected script/edition
 * @returns rows shaped like AUTOMATION_RULES entries plus `role` (the role
 *   object, so the panel can resolve its token art) — no `mark`; the panel
 *   dresses these rows in the role's own icon.
 */
export function roleAutomationRules(roles) {
  const out = [];
  (roles || new Map()).forEach((role) => {
    const auto = roleAutomation(role);
    if (!auto) return;
    out.push({
      key: auto.key,
      label: auto.label || role.name,
      title: auto.title || "",
      offTitle: auto.offTitle || "",
      onTitle: auto.onTitle || "",
      role,
    });
  });
  return out.sort(
    (a, b) => (a.role.otherNight || 0) - (b.role.otherNight || 0),
  );
}

/** All six flags as one plain snapshot — the session-store mirror's payload
 *  (session.automations), refreshed on every TOWER_EVENT so reactive readers
 *  (the night roster's Scarlet Woman hide) follow a live toggle. Enumerates
 *  the agnostic rules plus every LIBRARY-declared key — the full shelf,
 *  regardless of script, exactly as the one flat list mirrored before. */
export function automationFlags() {
  const out = {};
  AUTOMATION_RULES.forEach(({ key }) => {
    out[key] = !!towerState[key];
  });
  LIBRARY_ROLE_RULES.forEach(({ key }) => {
    out[key] = !!towerState[key];
  });
  return out;
}

/** Is one rule armed RIGHT NOW? The engine reads the tower module directly —
 *  decisions want the current value, not a render-time snapshot. */
function armed(key) {
  return !!towerState[key];
}

/* ── THE EXECUTION RECORD ────────────────────────────────────────────────────
   The app has never recorded an execution (golem/chronicle.js says so in as
   many words: `isDead` is a boolean with nothing beside it). The Undertaker
   prefill needs one, so the automations keep their own: one entry per town —
   the LATEST execution only, because "yesterday's executed player" is the
   only question anyone asks of it. Written by the end-day auto-execute, and
   inferred from a manual day-phase death of the marked player, so the
   prefill also works for a storyteller who executes by hand. Persisted per
   town (a host reload between day and night must not lose the night's own
   prefill), the same one-key-map idiom the night log's stash uses. */

const EXEC_KEY = "golem.execution";

function readExecStash() {
  try {
    return JSON.parse(localStorage.getItem(EXEC_KEY)) || {};
  } catch (e) {
    return {};
  }
}

/** Remember THE execution of one town's day: {day, seat, name, roleId,
 *  roleName}. Later writes for the same town replace earlier ones. */
export function recordExecution(townId, rec) {
  if (!townId || !rec) return;
  const stash = readExecStash();
  stash[townId] = {
    day: rec.day || 0,
    seat: typeof rec.seat === "number" ? rec.seat : -1,
    name: rec.name || "",
    roleId: rec.roleId || "",
    roleName: rec.roleName || "",
  };
  try {
    localStorage.setItem(EXEC_KEY, JSON.stringify(stash));
  } catch (e) {
    // storage off: the prefill forgets across a reload, nothing else breaks
  }
}

/** The town's recorded execution for exactly `day`, or null. */
export function executionFor(townId, day) {
  if (!townId) return null;
  const rec = readExecStash()[townId];
  if (!rec || rec.day !== day) return null;
  return rec;
}

/* ── SMALL SHARED READS ─────────────────────────────────────────────────── */

/** Is this client the acting host of a live town? Every entry point gates on
 *  this — automations run on the storyteller's client and nowhere else. */
function hosting(store) {
  const { session } = store.state;
  return !!session.sessionId && !session.isSpectator;
}

/**
 * The recorded vote count that put `seat` on the block — the same derivation
 * Player.vue's noose tally makes: the newest vote-history entry naming that
 * seat's player as nominee. `history` is passed explicitly so the caller can
 * exclude the entry that is being judged right now. Null when nothing in the
 * record says (a hand-set mark with no vote behind it).
 */
function recordedVotesFor(store, seat, history) {
  const player = store.state.players.players[seat];
  if (!player || !player.name) return null;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].nominee === player.name) return history[i].votes.length;
  }
  return null;
}

/** A seat's display name, never empty. */
function nameAt(store, seat) {
  const p = store.state.players.players[seat];
  return (p && p.name) || `Seat ${seat + 1}`;
}

/** Living non-traveler seats — the count the Scarlet Woman's "5 or more
 *  alive" is judged against (travelers stand outside it, as they stand
 *  outside the execution majority). */
function aliveCount(store) {
  return store.state.players.players.filter(
    (p) => !p.isDead && (!p.role || p.role.team !== "traveler"),
  ).length;
}

/**
 * A NIGHT-LOG ROW WRITTEN BY THE MACHINE — the automations' secret-bearing
 * record. It is a real entry through the real mutations, so everything that
 * already reads the log (the storyteller's Chronicle, the night sheet, the
 * per-seat "night" frame the addEntry/patchEntry subscribers deliver) treats
 * it exactly like a row the storyteller wrote and SENT (`done: true` — the
 * FT-1272 sent flag, which is what makes the player's client show it as a
 * delivered answer). Undo: the sheet's existing row controls — reopen, edit,
 * or remove the entry.
 */
function addAutoNightRow(store, { seat, roleId, roleName, told }) {
  const st = store.state;
  const player = st.players.players[seat];
  if (!player) return;
  const day = st.night.day;
  const id = entryId(day, seat, roleId);
  const fullTold = {
    ping: null,
    number: null,
    characterId: told.characterId || "",
    characterName: told.characterName || "",
    text: told.text || "",
  };
  const existing = st.night.entries.find((e) => e.id === id);
  if (existing) {
    store.commit("night/patchEntry", {
      id,
      patch: { told: fullTold, done: true },
    });
    return;
  }
  store.commit(
    "night/addEntry",
    Object.assign(
      makeEntry({
        day,
        seat,
        seatName: player.name || "",
        playerId: player.id || "",
        roleId,
        roleName,
        trueRoleId: roleId,
        trueRoleName: roleName,
        shownRoleId: roleId,
        shownRoleName: roleName,
        isPerformance: false,
        order: 0,
        slots: 0,
      }),
      { told: fullTold, done: true },
    ),
  );
}

/* ── RULE 1 + RULE 3: THE VOTE CONCLUDES ────────────────────────────────────
   Called from the `session/addHistory` subscriber case, host only, after the
   guards that case already applies (a completed sweep, a record actually
   pushed). `rec` is the record just written; the live tallies
   (session.votes) are still standing — the nomination clears one commit
   later — which is what the ghost-vote rule reads. */

export function onVoteConcluded({ store, live }, rec) {
  if (!hosting(store)) return;
  const st = store.state.session;
  const players = store.state.players.players;

  // ── RULE 3: AUTO GHOST-VOTE SPEND ─────────────────────────────────────
  // A dead player's raised hand at the conclusion spends their ghost vote,
  // pass or fail. Exiles excepted: an exile vote costs no dead vote (the
  // same carve-out Vote.vue's canVote makes), so there is nothing to spend.
  // Undo: the seat's existing hand-it-back control (isVoteless off).
  if (armed("autoGhostVote") && rec.type !== "Exile") {
    players.forEach((p, i) => {
      if (!st.votes[i] || !p.isDead || p.isVoteless) return;
      store.commit("players/update", {
        player: p,
        property: "isVoteless",
        value: true,
      });
      live.systemMessage(
        `Automation — ${p.name || `Seat ${i + 1}`}'s ghost vote is spent ` +
          `(hand raised as the vote closed).`,
      );
    });
  }

  // ── RULE 1: AUTO-MARK EXECUTION ───────────────────────────────────────
  // Only a PASSED execution vote moves the block. The comparison count for
  // the standing mark is the record's own (the same derivation the noose
  // tally makes), judged against every entry BEFORE the one just written.
  if (!armed("autoMark")) return;
  if (rec.type !== "Execution") return;
  const carried = rec.majority > 0 && rec.votes.length >= rec.majority;
  if (!carried) return;
  if (!st.nomination) return;
  const nominee = st.nomination[1];
  const v = rec.votes.length;
  const tie = st.markedTie;

  if (tie) {
    if (v > tie.votes) {
      // a later, higher vote takes the mark — the crossed pair stands down
      // (setMarkedPlayer clears the tie in the same commit).
      store.commit("session/setMarkedPlayer", nominee);
      live.systemMessage(
        `Automation — ${nameAt(store, nominee)} takes the block: ` +
          `${v} votes pass the tie at ${tie.votes}.`,
      );
    } else if (v === tie.votes && !tie.seats.includes(nominee)) {
      store.commit("session/setMarkedTie", {
        seats: tie.seats.concat(nominee),
        votes: v,
      });
      live.systemMessage(
        `Automation — ${nameAt(store, nominee)} joins the tie at ${v}: ` +
          `every crossed mark stands; no one hangs as it stands.`,
      );
    }
    return;
  }

  const marked = st.markedPlayer;
  if (marked === nominee) return; // the mark stands; the tally follows the record
  if (marked >= 0) {
    // exclude the entry just pushed — it names the NOMINEE, and on a shared
    // name it must not be read as the standing mark's own count
    const prior = st.voteHistory.slice(0, -1);
    const held = recordedVotesFor(store, marked, prior);
    const c = held === null ? 0 : held;
    if (v > c) {
      store.commit("session/setMarkedPlayer", nominee);
      live.systemMessage(
        `Automation — ${nameAt(store, nominee)} takes the block: ` +
          `${v} votes pass ${nameAt(store, marked)}'s ${c}.`,
      );
    } else if (v === c) {
      // AN EXACT TIE CROSSES BOTH MARKS AND KEEPS THEM VISIBLE — tied,
      // nobody hangs as it stands, and a later higher vote can still take
      // the mark. -1 first (a -1 never clears the tie), the pair second.
      store.commit("session/setMarkedPlayer", -1);
      store.commit("session/setMarkedTie", {
        seats: [marked, nominee],
        votes: v,
      });
      live.systemMessage(
        `Automation — tied at ${v}: ${nameAt(store, marked)} and ` +
          `${nameAt(store, nominee)} both stand crossed; ` +
          `no one hangs as it stands.`,
      );
    }
    return;
  }

  // nobody marked, no tie: the passed vote takes the block outright.
  store.commit("session/setMarkedPlayer", nominee);
  live.systemMessage(
    `Automation — the vote marks ${nameAt(store, nominee)}: ` +
      `${v} votes, majority ${rec.majority}.`,
  );
}

/* ── RULE 2: END-DAY AUTO-EXECUTE ───────────────────────────────────────────
   Called from the `toggleNight` subscriber case at the moment the day ends
   (isNight just went true), BEFORE the mark is cleared by the phase's own
   housekeeping and BEFORE the tie-cross is retired with the day. The death
   goes through the ordinary players/update path — same broadcast, same
   "X dies." chronicle line, same one-click shroud undo — and the execution
   is recorded for the Undertaker's night. */

export function onDayEnds({ store, live }) {
  if (!hosting(store)) return;
  if (!armed("autoExecute")) return;
  const st = store.state;
  const dayEnded = Math.max(st.night.day - 1, 1);

  if (st.session.markedTie) {
    live.systemMessage(
      `Automation — no execution as day ${dayEnded} ends: the crossed marks ` +
        `stand tied at ${st.session.markedTie.votes}.`,
    );
    return;
  }
  const marked = st.session.markedPlayer;
  if (marked < 0) return; // nobody marked: no execution, nothing fired
  const player = st.players.players[marked];
  if (!player || player.isDead) return;

  const votes = recordedVotesFor(store, marked, st.session.voteHistory);
  recordExecution(st.session.sessionId, {
    day: dayEnded,
    seat: marked,
    name: player.name || "",
    roleId: (player.role && player.role.id) || "",
    roleName: (player.role && player.role.name) || "",
  });
  store.commit("players/update", {
    player,
    property: "isDead",
    value: true,
  });
  live.systemMessage(
    `Automation — ${nameAt(store, marked)} is executed as day ${dayEnded} ` +
      `ends${votes !== null ? ` (marked with ${votes} votes)` : ""}.`,
  );
}

/* ── RULE 6: THE UNDERTAKER'S PREFILL ───────────────────────────────────────
   Called right after onDayEnds in the same toggleNight case — the night has
   fallen, the roster is tonight's, and the execution record (including one
   rule 2 just wrote) names yesterday's hanged. The prefill is a real night
   entry through the ordinary write action, so the sheet's character picker
   opens already holding it and the storyteller changes it exactly as they
   would their own pick. A row the storyteller already gave a character
   stands untouched. */

export function prefillUndertaker({ store }) {
  if (!hosting(store)) return;
  if (!armed("autoUndertaker")) return;
  const st = store.state;
  if (!st.grimoire.isNight) return;
  const rec = executionFor(st.session.sessionId, st.night.day - 1);
  if (!rec || !rec.roleId) return;
  const roster = store.getters["night/roster"];
  roster.forEach((row) => {
    if (row.role.id !== "undertaker" || row.isDeadSeat) return;
    const id = entryId(st.night.day, row.seat, row.role.id);
    const existing = st.night.entries.find((e) => e.id === id);
    if (existing && existing.told && existing.told.characterId) return;
    const base = (existing && existing.told) || {
      ping: null,
      number: null,
      characterId: "",
      characterName: "",
      text: "",
    };
    store.dispatch("night/write", {
      row,
      patch: {
        told: {
          ...base,
          characterId: rec.roleId,
          characterName: rec.roleName,
        },
      },
    });
  });
}

/* ── RULE 4: THE SCARLET WOMAN BECOMES THE DEMON ────────────────────────────
   Called from the players/update subscriber's isDead branch — every death,
   execution and night kill alike, comes through that one commit. The swap
   rides the ordinary role edit (players/update "role"), whose sendPlayer
   answer already delivers the new character to her client privately (the
   belief frame — her coin turns) — and the night-log row is the "was given
   <character>" reveal, delivered by the same night frame the sheet's Send
   uses. Nothing goes to the public town log: the town must not learn who
   the demon is from a settings checkbox. */

export function onDeath({ store, live }, player, seat) {
  if (!hosting(store)) return;
  if (!player || !player.isDead || seat < 0) return;
  const st = store.state;

  // THE EXECUTION INFERENCE (rule 6's other feeder): the marked player dying
  // during the day IS the app's execution, however the shroud was dropped.
  if (!st.grimoire.isNight && st.session.markedPlayer === seat) {
    recordExecution(st.session.sessionId, {
      day: st.night.day,
      seat,
      name: player.name || "",
      roleId: (player.role && player.role.id) || "",
      roleName: (player.role && player.role.name) || "",
    });
  }

  if (!armed("autoScarletWoman")) return;
  if (!player.role || player.role.team !== "demon") return;
  // "5 or more alive" is judged at the moment the Demon dies — the dying
  // Demon counts among the living they leave (travelers never count).
  if (aliveCount(store) + 1 < 5) return;
  const players = st.players.players;
  const swSeat = players.findIndex(
    (p) => p.role && p.role.id === "scarletwoman" && !p.isDead,
  );
  if (swSeat < 0) return;
  const sw = players[swSeat];
  const demonRole = player.role;
  store.commit("players/update", {
    player: sw,
    property: "role",
    value: demonRole,
  });
  addAutoNightRow(store, {
    seat: swSeat,
    roleId: "scarletwoman",
    roleName: "Scarlet Woman",
    told: {
      characterId: demonRole.id,
      characterName: demonRole.name || "",
      text:
        "The Demon died with 5 or more alive — you become the " +
        (demonRole.name || "Demon") +
        ".",
    },
  });
  // `live` is read for symmetry with the other handlers; the reveal itself
  // travels on the commits above (sendPlayer + the night frame).
  void live;
}

/* ── RULE 5: THE IMP STARPASS ───────────────────────────────────────────────
   The trigger is the night LOG: the Imp's own row, SENT (`done`), with the
   Imp's own seat among its targets — however the pick arrived (the player's
   own night action or the storyteller's hand). Fired once per row. The kill
   goes through the ordinary death path, which also lets an armed Scarlet
   Woman rule catch the crown first (official precedence, for free); only
   when no demon stands afterwards does the minion pick happen. */

/** Rows this session has already starpassed on — a patched row must not
 *  re-fire when a later edit grazes it. */
const firedStarpass = new Set();

export function onNightEntry({ store, live }, entry) {
  if (!hosting(store)) return;
  if (!armed("autoStarpass")) return;
  if (!entry || entry.roleId !== "imp" || entry.isPerformance) return;
  if (entry.done !== true) return;
  if (!Array.isArray(entry.targets) || !entry.targets.includes(entry.seat))
    return;
  if (firedStarpass.has(entry.id)) return;
  const st = store.state;
  const imp = st.players.players[entry.seat];
  if (!imp || !imp.role || imp.role.id !== "imp") return;
  firedStarpass.add(entry.id);

  // the self-kill — the same shroud the storyteller would drop, so the same
  // broadcast, the same "X dies." line, and the same one-click undo.
  if (!imp.isDead) {
    store.commit("players/update", {
      player: imp,
      property: "isDead",
      value: true,
    });
  }

  // the Scarlet Woman rule may have taken the crown on that very death.
  const players = st.players.players;
  if (players.some((p) => !p.isDead && p.role && p.role.team === "demon")) {
    return;
  }

  const minions = [];
  players.forEach((p, seat) => {
    if (!p.isDead && p.role && p.role.team === "minion") {
      minions.push({ seat, name: p.name || `Seat ${seat + 1}` });
    }
  });
  if (!minions.length) return; // nobody can inherit; the storyteller decides
  if (minions.length === 1) {
    applyStarpass({ store, live }, minions[0].seat);
    return;
  }
  // MORE THAN ONE HEIR: the dying Imp's own client picks. No client on the
  // chair means no chooser — the storyteller runs it by hand, as before.
  if (!imp.id) return;
  store.commit("session/setStarpassPending", imp.id);
  live._sendDirect(imp.id, "starpass", { minions });
}

/**
 * THE CROWN LANDS. One live minion becomes the Imp: the role edit delivers
 * their new character to their client privately (sendPlayer's belief frame),
 * and the night-log row is the same "was given Imp" reveal the Scarlet
 * Woman's is. Their OLD character names the row — "Poisoner was given Imp"
 * is the sentence the record wants.
 */
export function applyStarpass({ store }, heirSeat) {
  const st = store.state;
  const heir = st.players.players[heirSeat];
  if (!heir || heir.isDead || !heir.role || heir.role.team !== "minion") {
    return false;
  }
  const impRole = st.roles.get("imp") || store.getters.rolesJSONbyId.get("imp");
  if (!impRole) return false;
  const oldRole = heir.role;
  store.commit("players/update", {
    player: heir,
    property: "role",
    value: impRole,
  });
  addAutoNightRow(store, {
    seat: heirSeat,
    roleId: oldRole.id,
    roleName: oldRole.name || "",
    told: {
      characterId: "imp",
      characterName: impRole.name || "Imp",
      text: "The Imp's kill turned inward — you inherit the Imp.",
    },
  });
  return true;
}

/**
 * The dying Imp's pick arriving at the host on the direct lane. Validated
 * against the standing offer (only the client the chooser was sent to may
 * answer) and against the seat itself (a live minion, still); anything else
 * is dropped — the storyteller's hand remains the recovery.
 */
export function onStarpassPick({ store, live }, params) {
  if (!hosting(store)) return;
  if (!params || typeof params !== "object") return;
  const pending = store.state.session.starpassPending;
  if (!pending || params.playerId !== pending) return;
  if (!Number.isInteger(params.seat)) return;
  if (applyStarpass({ store, live }, params.seat)) {
    store.commit("session/setStarpassPending", "");
  }
}

/**
 * Housekeeping when the night ends: a chooser nobody answered does not
 * outlive the night that asked it. The host clears its pending offer and
 * tells that one client to stand its chooser down.
 */
export function retireStarpassOffer({ store, live }) {
  if (!hosting(store)) return;
  const pending = store.state.session.starpassPending;
  if (!pending) return;
  live._sendDirect(pending, "starpass", null);
  store.commit("session/setStarpassPending", "");
}
