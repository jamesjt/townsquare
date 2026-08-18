/**
 * Golem fork (FT-857): the script COMPOSITION maths, shared by every surface
 * that reads a script's shape — the workbench's meter (EditionModal) and the
 * player-facing script drawer both count the same way, from one source.
 *
 * The meter INFORMS, never blocks: a non-conforming script still saves,
 * shares and plays. Nothing in here gates anything.
 */

/** The official setup table — players: [townsfolk, outsiders, minions, demons]. */
export const SETUP_TABLE = {
  5: [3, 0, 1, 1],
  6: [3, 1, 1, 1],
  7: [5, 0, 1, 1],
  8: [5, 1, 1, 1],
  9: [5, 2, 1, 1],
  10: [7, 0, 2, 1],
  11: [7, 1, 2, 1],
  12: [7, 2, 2, 1],
  13: [9, 0, 3, 1],
  14: [9, 1, 3, 1],
  15: [9, 2, 3, 1]
};

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
