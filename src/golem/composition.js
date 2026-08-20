/**
 * Golem fork (FT-857): the script COMPOSITION maths, shared by every surface
 * that reads a script's shape — the workbench's meter (EditionModal) and the
 * player-facing script drawer both count the same way, from one source.
 *
 * The meter INFORMS, never blocks: a non-conforming script still saves,
 * shares and plays. Nothing in here gates anything.
 */

/**
 * The official setup table — players: [townsfolk, outsiders, minions, demons].
 *
 * READ OFF game.json, not typed out (FT-895). This was a literal copy of that
 * file's eleven rows, which meant the same eleven numbers lived in two places
 * and only one of them was the source: game.json is what TownInfo and the
 * build panel's own composition readout already index directly, so a change
 * there would have moved those two readouts and left this table — and every
 * "Plays 5-15" line reading it — quietly stating the old shape.
 *
 * game.json's first row is the FIVE-player game, so its index is `n - 5`;
 * inverting that is the whole of the transform below.
 */
import gameJSON from "../game";

export const SETUP_TABLE = gameJSON.reduce((table, row, i) => {
  table[i + 5] = [row.townsfolk, row.outsider, row.minion, row.demon];
  return table;
}, {});

export const TEAM_LABELS = {
  townsfolk: "Townsfolk",
  outsider: "Outsiders",
  minion: "Minions",
  demon: "Demons",
  traveler: "Travellers"
};

/**
 * roles.json spells it "traveler"; the server's roleType vocabulary spells it
 * "traveller". Normalize to the app side everywhere the two meet.
 */
export const normTeam = t => (t || "").replace("traveller", "traveler");

/** How many of each team a role list holds. */
export function countTeams(roles) {
  const counts = {
    townsfolk: 0,
    outsider: 0,
    minion: 0,
    demon: 0,
    traveler: 0
  };
  (roles || []).forEach(role => {
    const team = normTeam(role.team);
    if (counts[team] !== undefined) counts[team] += 1;
  });
  return counts;
}

/** Player counts the pool can serve under the official table. */
export function servableFor(counts) {
  return Object.keys(SETUP_TABLE)
    .map(Number)
    .filter(n => {
      const [t, o, m, d] = SETUP_TABLE[n];
      return (
        counts.townsfolk >= t &&
        counts.outsider >= o &&
        counts.minion >= m &&
        counts.demon >= d
      );
    });
}

/** "5–15" / "5, 7, 10–13" — collapse runs for the meter. */
export function servableText(servable) {
  const runs = [];
  (servable || []).forEach(n => {
    const last = runs[runs.length - 1];
    if (last && n === last[1] + 1) last[1] = n;
    else runs.push([n, n]);
  });
  return runs.map(([a, b]) => (a === b ? String(a) : a + "–" + b)).join(", ");
}
