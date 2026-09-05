/**
 * Golem fork (FT-1398): THE NIGHT LAB — preview any role's night art in-app,
 * no game required.
 *
 * WHAT THIS IS. A client-local preview room: eight fake seats are seeded into
 * the REAL players store, the viewer is seated as one of them, and every
 * night state is driven through the SAME store commits the live flow makes —
 * `night/stagePick` when a coin is tapped (the real Player.vue handler, not a
 * copy), `night/playerAction` + `night/confirmStage` for the seal (NightCall
 * .confirm's own pair), `night/setPlayerNight` for the storyteller's frames
 * (fabricated to exactly the shape the socket layer would commit on arrival —
 * built with golem/nightLog's own makeEntry, so the wire shape and the lab
 * shape cannot drift). There is no parallel render mode anywhere: the ring,
 * the face, the threads and the marks are the production components reading
 * the production getters.
 *
 * ── STRICTLY LOCAL — the belt AND the braces ─────────────────────────────
 *
 * THE BELT: the lab only opens while this client is NOT in a town
 * (`session.sessionId` empty — `canEnter`). The socket only ever connects on
 * `session/setSessionId` (socket.js's subscriber), the lab never commits it,
 * and every LiveSession sender no-ops with no socket (`_send` requires an
 * OPEN socket). A client that has never connected physically cannot leak.
 * The menu row that opens the lab is DISABLED in a live town rather than
 * exiting the session first — the safer of the two shapes: no destructive
 * side effect can hide inside a preview button.
 *
 * THE BRACES: the mutation audit, the FT-1173 staged-deaths precedent
 * (absence from socket.js's subscription table IS the privacy mechanism).
 * Every mutation the lab commits, against that table:
 *
 *   NOT IN THE TABLE (nothing would send even in a live town):
 *     night/setPlayerNight · night/settleTold · night/stagePick ·
 *     night/confirmStage · night/resetStage · session/setSpectator ·
 *     session/setPlayerId
 *   IN THE TABLE, and what its sender does disconnected:
 *     players/set|add|update → sendGamestate/sendPlayer — spectator-guarded
 *       AND `_send` is a no-op with no socket;
 *     session/claimSeat → claimSeat() — `_send`, no socket, no-op;
 *     toggleNight → setIsNight (spectator-guarded) + systemMessage
 *       (storyteller-only) + automations (host-only, and every automation
 *       flag defaults false; flags are only ever set by a relay frame);
 *     night/setDay|setMode|setLog|addEntry|patchEntry|removeEntry →
 *       sendNightRows — host-guarded on the LIVESESSION's own `_isSpectator`,
 *       which starts true and is only refreshed by connect(); `_send` no-op
 *       regardless;
 *     night/playerAction → sendNightAction — `_sendDirect` → `_send`, no
 *       socket, no-op.
 *
 * ── EXIT CLEANLINESS (the FT-1389 class) ─────────────────────────────────
 *
 * Entering snapshots every store slice the lab touches AND the raw
 * localStorage keys the persistence plugin writes on the lab's commits
 * (players, playerId, the night-log stash…). Exiting restores the slices
 * through ordinary commits — spectator is restored LAST so the persistence
 * plugin's host-only writers stay off throughout — and then writes the raw
 * localStorage values back byte-for-byte, so even the intermediate saves the
 * plugin made during the lab leave no trace. The told stamps are swept by
 * re-delivering every row the lab ever committed as unsent (the same reopen
 * sweep a real retraction rides) before the pre-entry playerNight frame is
 * restored.
 *
 * ── TRUTH OVER FLATTERY ──────────────────────────────────────────────────
 *
 * A role with no bespoke dress shows its real fallback (the plain invite
 * ring) — that IS what a player of that role sees tonight, and the lab's
 * job is to say so. The FT-1397 family tier plugs in with zero lab changes.
 */
import Vue from "vue";
import rolesJSON from "../roles.json";
import editionJSON from "../editions.json";
import { makeEntry, entryId, targetCount } from "./nightLog";
import { TOLD_ROLES } from "./toldInfo";
import { fieldsFor, playerSlots, FIELD_TYPES, FIELD_OWNERS } from "./nightInfo";

/** The fake town: eight varied names, the viewer's chair, a bystander's. */
export const LAB_SEATS = [
  "Maeve",
  "Bram",
  "Odette",
  "Silas",
  "Petra",
  "Ines",
  "Corwin",
  "Talia",
];
export const ACTOR_SEAT = 0;
export const BYSTANDER_SEAT = 4;
const LAB_IDS = LAB_SEATS.map(
  (n, i) => "nightlab-" + i + "-" + n.toLowerCase(),
);

/** The raw keys the persistence plugin can write while the lab runs — all
 *  snapshotted at entry and restored byte-for-byte at exit. */
const LS_KEYS = [
  "players",
  "playerId",
  "session",
  "bluffs",
  "fabled",
  "gameEnded",
  "golem.nightLog",
  "golem.nightMode",
  "golem.nightRequireChecks",
];

/** The two grammars (FT-1384 choosers, FT-1385 told roles), one state id per
 *  beat. RECEIVE is the chooser grammar minus the picks — a role that acts
 *  without pointing (free-text, or receive-only with no slots). */
const CHOOSER_GRAMMAR = ["invite", "staged", "sealed", "st-sent", "reopened"];
const TOLD_GRAMMAR = ["before", "telling", "settled", "residue"];
const RECEIVE_GRAMMAR = ["invite", "st-sent", "reopened"];

export const STATE_LABELS = {
  invite: "Invitation",
  staged: "Staged",
  sealed: "Sealed",
  "st-sent": "ST sent",
  reopened: "Reopened",
  before: "Before",
  telling: "Telling",
  settled: "Settled",
  residue: "Residue",
};

export const PERSPECTIVES = [
  { id: "acting", label: "The player" },
  { id: "bystander", label: "A bystander" },
  { id: "storyteller", label: "The storyteller" },
];

/** The lab's one piece of reactive state — the strip renders from this. */
export const nightLab = Vue.observable({
  open: false,
  roleId: "",
  stateId: "",
  perspective: "acting",
});

/** Entry snapshot + the ids of every host frame the lab ever fabricated
 *  (the exit sweep re-delivers each as unsent to clear its told stamp). */
let snap = null;
const labRowIds = new Set();

const roleById = new Map(rolesJSON.map((r) => [r.id, r]));

/** Does this character act at night at all — the picker's population rule. */
const actsAtNight = (r) => r.firstNight > 0 || r.otherNight > 0;

/**
 * The role picker's groups: every edition that has night-acting characters,
 * then the travellers (any edition) who wake. Group names come from
 * editions.json where the id is known there.
 */
export function roleGroups() {
  const names = new Map(editionJSON.map((e) => [e.id, e.name]));
  const groups = [];
  const seen = new Set();
  editionJSON.forEach((ed) => {
    const roles = rolesJSON.filter(
      (r) => r.edition === ed.id && actsAtNight(r) && r.team !== "traveler",
    );
    if (!roles.length) return;
    roles.forEach((r) => seen.add(r.id));
    groups.push({ id: ed.id, name: names.get(ed.id) || ed.id, roles });
  });
  const rest = rolesJSON.filter(
    (r) => actsAtNight(r) && r.team !== "traveler" && !seen.has(r.id),
  );
  if (rest.length)
    groups.push({ id: "other", name: "Other scripts", roles: rest });
  const travellers = rolesJSON.filter(
    (r) => r.team === "traveler" && actsAtNight(r),
  );
  if (travellers.length) {
    groups.push({ id: "travellers", name: "Travellers", roles: travellers });
  }
  return groups;
}

/** Which grammar a role speaks. */
export function grammarOf(roleId) {
  if (TOLD_ROLES[roleId]) return TOLD_GRAMMAR;
  return playerSlots(roleId) > 0 ? CHOOSER_GRAMMAR : RECEIVE_GRAMMAR;
}

/** The lab may only open while this client is not in a town — the belt. */
export function canEnter(store) {
  return !store.state.session.sessionId && !nightLab.open;
}

/** The night this role is previewed on: its first night where it has one,
 *  otherwise a later night (the Monk's, the Imp's). */
function labDayOf(role) {
  return role && role.firstNight > 0 ? 1 : 2;
}

const actor = (store) => store.state.players.players[ACTOR_SEAT];

/** Night on/off through the ONE mutation every real path uses; the day is
 *  re-asserted after (toggleNight's own increment is the live game's rule,
 *  not the lab's). */
function ensureNight(store, on, role) {
  if (store.state.grimoire.isNight !== !!on) {
    store.commit("toggleNight", !!on);
  }
  if (on) {
    const day = labDayOf(role || roleById.get(nightLab.roleId));
    if (store.state.night.day !== day) store.commit("night/setDay", day);
  }
}

/** Canned picks for a chooser driven from the stepper (a tap on the ring is
 *  the first-class way in — this is only the default when none was staged).
 *  Seats chosen away from the actor so the strings read across the ring. */
function cannedPicks(slots) {
  return [3, 6, 5].slice(0, slots);
}

/** The canned storyteller answer for a chooser's ST-sent frame — one value
 *  per storyteller field the role's own schema declares, in the shape the
 *  night sheet itself would record. */
function cannedAnswer(roleId) {
  const { fields, known } = fieldsFor(roleId);
  const told = {};
  if (!known) return told;
  fields.forEach((f) => {
    if (f.by !== FIELD_OWNERS.STORYTELLER) return;
    if (f.type === FIELD_TYPES.BOOLEAN) told.ping = true;
    else if (f.type === FIELD_TYPES.NUMBER) told.number = 1;
    else if (f.type === FIELD_TYPES.CHARACTER) {
      told.characterId = "poisoner";
      told.characterName = "Poisoner";
    }
  });
  return told;
}

/** The canned telling for a told-information role (FT-1385's five). */
function cannedTelling(roleId) {
  const spec = TOLD_ROLES[roleId];
  if (!spec) return { targets: [], told: {} };
  if (spec.kind === "pair") {
    const name =
      spec.group === "Townsfolk"
        ? { characterId: "chef", characterName: "Chef" }
        : spec.group === "Outsider"
        ? { characterId: "butler", characterName: "Butler" }
        : { characterId: "poisoner", characterName: "Poisoner" };
    return { targets: [3, 6], told: name };
  }
  return { targets: [], told: { number: 1 } };
}

/**
 * Fabricate the host frame for the actor's row — the exact store shape the
 * socket layer's "night" frame handler commits (night/setPlayerNight
 * re-projects through projectPlayerRow on the way in, so committing the full
 * entry here IS the delivered shape). Built with makeEntry so every key the
 * live row carries exists here too.
 */
function hostFrame(store, { targets = [], told = {}, done = true } = {}) {
  const role = roleById.get(nightLab.roleId);
  const day = labDayOf(role);
  const seats = store.state.players.players;
  const first = day <= 1;
  const slots = Math.max(targetCount(role, first), targets.length);
  const e = makeEntry({
    day,
    seat: ACTOR_SEAT,
    seatName: LAB_SEATS[ACTOR_SEAT],
    playerId: LAB_IDS[ACTOR_SEAT],
    roleId: role.id,
    roleName: role.name,
    trueRoleId: role.id,
    trueRoleName: role.name,
    shownRoleId: role.id,
    shownRoleName: role.name,
    isPerformance: false,
    order: 1,
    slots,
  });
  targets.forEach((t, i) => {
    e.targets[i] = t;
    e.targetNames[i] = (seats[t] && seats[t].name) || "";
    e.targetsBy[i] = "player";
  });
  e.told = { ...e.told, ...told };
  e.done = !!done;
  labRowIds.add(e.id);
  return e;
}

/** Deliver one host frame (or none) to this client — the socket's commit. */
function deliver(store, rows) {
  store.commit("night/setPlayerNight", { live: true, rows });
}

/** Make sure the actor has a complete STAGED pick (the ring's own commits —
 *  a coin already tapped by hand is kept; empty slots take canned seats). */
function ensureStaged(store) {
  const slots = playerSlots(nightLab.roleId);
  if (!slots) return [];
  const staged = store.getters["night/myStagedTargets"];
  const wanted = cannedPicks(slots);
  const have = new Set(staged.filter((t) => Number.isInteger(t) && t >= 0));
  let need = slots - have.size;
  for (const seat of wanted) {
    if (need <= 0) break;
    if (have.has(seat)) continue;
    store.commit("night/stagePick", {
      day: store.state.night.day,
      roleId: nightLab.roleId,
      slots,
      seat,
    });
    have.add(seat);
    need--;
  }
  return store.getters["night/myStagedTargets"];
}

/**
 * The storyteller's own ledger, kept true to the current state while the
 * storyteller perspective is up — written through night/write (the sheet's
 * one write path) so the roster row and the entry match the live app's.
 */
function syncEntries(store) {
  if (nightLab.perspective !== "storyteller") return;
  const role = roleById.get(nightLab.roleId);
  if (!role) return;
  const day = store.state.night.day;
  const id = entryId(day, ACTOR_SEAT, role.id);
  const state = nightLab.stateId;
  // states where the host has heard nothing: no row at all
  const silent = state === "invite" || state === "staged" || state === "before";
  if (silent) {
    if (store.state.night.entries.some((e) => e.id === id)) {
      store.commit("night/removeEntry", id);
    }
    return;
  }
  const row = store.getters["night/roster"].find(
    (r) => r.seat === ACTOR_SEAT && r.role.id === role.id,
  );
  if (!row) return;
  const seats = store.state.players.players;
  let patch;
  if (TOLD_ROLES[role.id]) {
    const { targets, told } = cannedTelling(role.id);
    patch = {
      targets: targets.slice(),
      targetNames: targets.map((t) => (seats[t] && seats[t].name) || ""),
      targetsBy: targets.map(() => ""),
      told: {
        ping: null,
        number: null,
        characterId: "",
        characterName: "",
        text: "",
        ...told,
      },
      done: true,
    };
  } else {
    const staged = store.getters["night/myStagedTargets"];
    const picks = staged.length ? staged : cannedPicks(playerSlots(role.id));
    patch = {
      targets: picks.slice(),
      targetNames: picks.map((t) =>
        t >= 0 ? (seats[t] && seats[t].name) || "" : "",
      ),
      targetsBy: picks.map((t) => (t >= 0 ? "player" : "")),
      told: {
        ping: null,
        number: null,
        characterId: "",
        characterName: "",
        text: "",
        ...(state === "st-sent" ? cannedAnswer(role.id) : {}),
      },
      done:
        state === "st-sent" ||
        state === "telling" ||
        state === "settled" ||
        state === "residue",
    };
  }
  store.dispatch("night/write", { row, patch });
  labRowIds.add(id);
}

/**
 * Drive the town to one state of the current role's grammar — the same
 * commits the live flow makes, in the live flow's order. Stepping BACKWARD
 * retracts the later beats the way the live flow retracts them (the unsent
 * re-delivery — the reopen sweep — is the one wire shape a retraction has).
 *
 * In the bystander and storyteller perspectives only the phase (and the
 * storyteller's ledger) is kept true — the actor-side commits are the acting
 * seat's own and re-run whole when that chair is retaken (setPerspective).
 */
export function applyState(store, stateId) {
  if (!nightLab.open) return;
  const role = roleById.get(nightLab.roleId);
  if (!role) return;
  nightLab.stateId = stateId;
  if (nightLab.perspective !== "acting") {
    ensureNight(store, stateId !== "residue", role);
    syncEntries(store);
    return;
  }
  switch (stateId) {
    // ── the chooser grammar (FT-1384) ────────────────────────────────────
    case "invite":
      ensureNight(store, true, role);
      sweepLabRows(store);
      store.commit("night/resetStage");
      break;
    case "staged":
      ensureNight(store, true, role);
      sweepLabRows(store);
      // a seal left standing by a backward step: the sweep only unseals
      // where a SENT row was retracted, so clear the rest by hand
      if (store.getters["night/myConfirmed"]) {
        store.commit("night/resetStage");
      }
      ensureStaged(store);
      break;
    case "sealed": {
      ensureNight(store, true, role);
      sweepLabRows(store);
      const staged = ensureStaged(store);
      // NightCall.confirm's own two commits, same order: the wire event,
      // then the local seal.
      store.commit("night/playerAction", {
        roleId: role.id,
        targets: staged.slice(0, playerSlots(role.id)),
      });
      store.commit("night/confirmStage");
      break;
    }
    case "st-sent": {
      ensureNight(store, true, role);
      const slots = playerSlots(role.id);
      let picks = [];
      if (slots) {
        picks = ensureStaged(store);
        if (!store.getters["night/myConfirmed"]) {
          store.commit("night/playerAction", {
            roleId: role.id,
            targets: picks.slice(0, slots),
          });
          store.commit("night/confirmStage");
        }
      }
      deliver(store, [
        hostFrame(store, {
          targets: picks.filter((t) => Number.isInteger(t) && t >= 0),
          told: cannedAnswer(role.id),
          done: true,
        }),
      ]);
      break;
    }
    case "reopened": {
      ensureNight(store, true, role);
      // the Send button's other job: the same row arrives unsent (targets
      // kept, exactly as a real reopen keeps them), and the reopen sweep
      // (night/setPlayerNight) unseals the stage.
      const staged = store.getters["night/myStagedTargets"];
      deliver(store, [
        hostFrame(store, {
          targets: staged.filter((t) => Number.isInteger(t) && t >= 0),
          told: {},
          done: false,
        }),
      ]);
      // reached without a send standing (a sideways jump): the sweep had no
      // sent row to watch, so the unseal is finished by hand
      if (store.getters["night/myConfirmed"]) {
        store.commit("night/resetStage");
      }
      break;
    }
    // ── the told grammar (FT-1385) ───────────────────────────────────────
    case "before":
      ensureNight(store, true, role);
      sweepLabRows(store);
      break;
    case "telling": {
      ensureNight(store, true, role);
      // sweep first: a settled mark from an earlier step would otherwise
      // dress the fresh arrival in the residue pose
      sweepLabRows(store);
      const { targets, told } = cannedTelling(role.id);
      deliver(store, [hostFrame(store, { targets, told, done: true })]);
      break;
    }
    case "settled": {
      ensureNight(store, true, role);
      if (!store.getters["night/myTold"]) {
        const { targets, told } = cannedTelling(role.id);
        deliver(store, [hostFrame(store, { targets, told, done: true })]);
      }
      // the socket plugin's own settle commit, fired by hand instead of by
      // its TOLD_HOLD_MS timer — the lab holds states still.
      const told = store.getters["night/myTold"];
      if (told) store.commit("night/settleTold", told.rowId);
      break;
    }
    case "residue": {
      if (!store.getters["night/myTold"]) {
        ensureNight(store, true, role);
        const { targets, told } = cannedTelling(role.id);
        deliver(store, [hostFrame(store, { targets, told, done: true })]);
      }
      const told = store.getters["night/myTold"];
      if (told && told.phase !== "settled") {
        store.commit("night/settleTold", told.rowId);
      }
      ensureNight(store, false, role);
      break;
    }
  }
  syncEntries(store);
}

/** Pick a role: clear the last role's night, dress the actor's seat, land on
 *  the grammar's first state. */
export function setRole(store, roleId) {
  if (!nightLab.open || !roleById.has(roleId)) return;
  const role = roleById.get(roleId);
  // retract whatever the last role delivered (unsent stubs ride the reopen
  // sweep, clearing any told stamps), then start clean — the storyteller's
  // ledger rows the lab wrote go with it
  sweepLabRows(store);
  labRowIds.forEach((id) => {
    if (store.state.night.entries.some((e) => e.id === id)) {
      store.commit("night/removeEntry", id);
    }
  });
  labRowIds.clear();
  store.commit("night/resetStage");
  nightLab.roleId = roleId;
  store.commit("players/update", {
    player: actor(store),
    property: "role",
    value: role,
  });
  applyState(store, grammarOf(roleId)[0]);
}

/** Every row the lab ever delivered, re-delivered unsent — the reopen sweep
 *  clears their stamps/settled marks — then an empty frame. */
function sweepLabRows(store) {
  if (labRowIds.size) {
    deliver(
      store,
      [...labRowIds].map((id) => ({ id, sent: false })),
    );
  }
  deliver(store, []);
}

/** Swap whose eyes the town is seen through. */
export function setPerspective(store, p) {
  if (!nightLab.open || nightLab.perspective === p) return;
  nightLab.perspective = p;
  if (p === "storyteller") {
    store.commit("session/claimSeat", -1);
    store.commit("session/setSpectator", false);
    syncEntries(store);
    return;
  }
  store.commit("session/setSpectator", true);
  const seat = p === "bystander" ? BYSTANDER_SEAT : ACTOR_SEAT;
  store.commit("session/setPlayerId", LAB_IDS[seat]);
  store.commit("session/claimSeat", seat);
  if (p === "bystander") {
    // a bystander's client holds NO rows — that is the FT-1384/1385 privacy
    // fact this perspective exists to show. (Stamps survive in the client's
    // own bookkeeping, so stepping back re-renders the same phase.)
    deliver(store, []);
  } else {
    // back in the actor's chair: re-deliver the current state's frames
    applyState(store, nightLab.stateId);
  }
}

/** Re-fire the current state's arrival: step back one beat, then forward. */
export function replay(store) {
  if (!nightLab.open) return;
  const g = grammarOf(nightLab.roleId);
  const i = g.indexOf(nightLab.stateId);
  const current = nightLab.stateId;
  applyState(store, g[Math.max(0, i - 1)]);
  Vue.nextTick(() => {
    setTimeout(() => {
      if (nightLab.open) applyState(store, current);
    }, 80);
  });
}

/**
 * ENTER. Snapshot everything the lab will touch, seed the fake town, seat
 * the viewer, fall into night. Returns false (and does nothing) in a town.
 */
export function enter(store, roleId = "monk") {
  if (!canEnter(store)) return false;
  const s = store.state;
  snap = {
    ls: LS_KEYS.map((k) => [k, localStorage.getItem(k)]),
    players: s.players.players,
    isSpectator: s.session.isSpectator,
    playerId: s.session.playerId,
    claimedSeat: s.session.claimedSeat,
    isNight: s.grimoire.isNight,
    night: {
      day: s.night.day,
      mode: s.night.mode,
      entries: s.night.entries,
      staged: s.night.staged,
      staging: { ...s.night.staging, targets: [...s.night.staging.targets] },
      playerNight: {
        live: s.night.playerNight.live,
        rows: [...s.night.playerNight.rows],
      },
    },
  };
  labRowIds.clear();
  // spectator FIRST: with it on, the persistence plugin's host-only writers
  // (night mode / checklist) stay off for the whole visit
  store.commit("session/setSpectator", true);
  store.commit("night/setMode", "everyone");
  store.commit("players/set", []);
  LAB_SEATS.forEach((name) => store.commit("players/add", name));
  store.state.players.players.forEach((p, i) => {
    store.commit("players/update", {
      player: p,
      property: "id",
      value: LAB_IDS[i],
    });
  });
  store.commit("session/setPlayerId", LAB_IDS[ACTOR_SEAT]);
  store.commit("session/claimSeat", ACTOR_SEAT);
  nightLab.open = true;
  nightLab.perspective = "acting";
  setRole(store, roleById.has(roleId) ? roleId : "monk");
  return true;
}

/**
 * EXIT. Restore the store through ordinary commits (spectator restored LAST,
 * so the host-only persistence writers stay off until the store is already
 * back), then put every raw localStorage key back byte-for-byte.
 */
export function exit(store) {
  if (!nightLab.open || !snap) return;
  // 1. the told bookkeeping: every lab row re-arrives unsent — the reopen
  //    sweep clears its stamp — then the pre-entry frame is restored whole
  sweepLabRows(store);
  store.commit("night/setPlayerNight", {
    live: snap.night.playerNight.live,
    rows: snap.night.playerNight.rows,
  });
  // 2. phase before log: toggleNight's own day increment is then overwritten
  //    by the restored counter
  if (store.state.grimoire.isNight !== snap.isNight) {
    store.commit("toggleNight", snap.isNight);
  }
  store.commit("night/setLog", {
    day: snap.night.day,
    entries: snap.night.entries,
    staged: snap.night.staged,
  });
  store.commit("night/setMode", snap.night.mode);
  store.commit("night/resetStage");
  // 3. the town itself — the original player objects, untouched by the lab
  //    (every lab mutation ran against the fake seats)
  store.commit("players/set", snap.players);
  store.commit("session/claimSeat", snap.claimedSeat);
  store.commit("session/setPlayerId", snap.playerId);
  store.commit("session/setSpectator", snap.isSpectator);
  // 4. byte-exact storage: undo every intermediate write the persistence
  //    plugin made while the lab ran
  snap.ls.forEach(([k, v]) => {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  });
  nightLab.open = false;
  nightLab.roleId = "";
  nightLab.stateId = "";
  nightLab.perspective = "acting";
  labRowIds.clear();
  snap = null;
}
