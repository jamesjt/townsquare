/**
 * Golem fork (FT-1163): THE DEATH MOMENT — the one place a shroud gets a time.
 *
 * ── THE PROBLEM ────────────────────────────────────────────────────────────
 * `isDead` is a boolean. A recorded game could say a seat died and never when,
 * and the chronicle's own dead-roll says so out loud ("The app records that
 * they died, not when"). That gap is not recoverable after the fact: nothing
 * else in the app or the database holds the moment, so every game played
 * without this file is permanently missing it. Hence a plugin — it captures
 * the fact at the instant it is true, which is the only instant it exists.
 *
 * ── WHY A PLUGIN AND NOT A CALLSITE ────────────────────────────────────────
 * A shroud goes down through `players/update` with property `isDead`, and
 * Player.vue's `toggleStatus` alone reaches that three times (place, lift, and
 * the public-grimoire ghost-vote path). Stamping at the callsites would mean
 * being right three times today and remembering a fourth tomorrow. Subscribing
 * to the mutation is right once, permanently, for every path that exists or
 * gets added — the same argument the root `toggleNight` mutation makes for
 * being "the ONE place the day counter moves", which is the counter this file
 * reads.
 *
 * ── WHAT IT WRITES ─────────────────────────────────────────────────────────
 *   deathDay    `night.day` at the moment of the shroud. First night = 1; 0
 *               means the shroud went down before the town ever reached night.
 *   deathPhase  "night" | "day", from `grimoire.isNight`.
 *
 * Two fields, not one number, because within a cycle N the town runs
 * night N → day N (the counter increments on ENTERING night). An Undertaker's
 * execution and an Empath neighbour's night kill both land in cycle N and are
 * not the same moment, so anything averaging them as one scale is wrong. The
 * server stores the pair and orders night before day within a number — see
 * `botcGameSeats` in shared/schema/botc.ts.
 *
 * A LIFTED SHROUD CLEARS THE MOMENT. Storytellers correct mistakes and some
 * characters return seats to life; a seat that is alive again has no death
 * moment, and leaving a stale one behind would let a survivor be recorded with
 * a death day. The route rejects exactly that shape, so this is also what
 * keeps the fork's own records acceptable to it.
 *
 * ── WHO STAMPS ─────────────────────────────────────────────────────────────
 * The storyteller only. `isDead` originates on the host's client (FT-1010
 * says so where it composes the death line), a spectator's roster is a
 * projection of what the host chose to send, and only the host records a
 * finished game. A spectator stamping would be writing a moment onto a copy
 * nobody reads.
 *
 * IT SENDS NOTHING. The stamp rides `players/setDeathMoment`, which the socket
 * subscriber does not answer — see that mutation for why it exists apart from
 * `players/update`.
 */
export default store => {
  store.subscribe(({ type, payload }, state) => {
    if (type !== "players/update") return;
    if (!payload || payload.property !== "isDead" || !payload.player) return;
    // The host's grimoire is the record. See WHO STAMPS above.
    if (state.session.isSpectator) return;

    store.commit(
      "players/setDeathMoment",
      payload.value
        ? {
            player: payload.player,
            day: state.night.day,
            phase: state.grimoire.isNight ? "night" : "day"
          }
        : // a shroud lifted — the seat lives, so it has no moment
          { player: payload.player, day: null, phase: null }
    );
  });
};
