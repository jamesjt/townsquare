/**
 * Golem fork (FT-1320): THE CHANGE LOG — what changed, said to the humans
 * who play here.
 *
 * DATA, NOT MARKUP. The reading surface (ChangeLog.vue, opened from the
 * golem mark's menu) renders whatever stands in this list, so a future
 * entry is one line appended here — no component edit, no new dress.
 *
 * THE REGISTER IS PLAIN LANGUAGE, deliberately: these lines are read by
 * players and storytellers, not by this repo — no FT numbers, no component
 * names, no mechanism talk. Say what a person at the table would notice.
 *
 * SHAPE: newest group first; `date` is the group's header exactly as it
 * should read (a date, or a plain phrase like "Earlier this week");
 * `lines` are that group's entries, one string per change, in the order
 * they should be read.
 */
export const CHANGELOG = [
  {
    date: "2026-08-29",
    lines: [
      "Your seat survives your phone: a backgrounded tab no longer loses " +
        "its chair, and a freed chair takes itself back when you return.",
      "Votes: your hand stays up until your vote locks, then points at the " +
        "accused. The Hand UP/DOWN buttons never move mid-vote. The " +
        "countdown is properly audible, and vote timing steps in half " +
        "seconds.",
      "The night list folds as it is worked: dead players and handled " +
        "actions tuck away, Skip sits beside Send, and sending every " +
        "action was never required — now it says so.",
      "The nomination record always shows who voted Yes and whose hand " +
        "stayed down.",
      "Whisper traffic in the day's record is now a host setting.",
    ],
  },
  {
    date: "2026-08-28",
    lines: [
      "The records page became one filtered question: an always-on search " +
        "that filters as you type, script and role catalogs with their " +
        "art, a towns filter, removable filter chips, and per-column " +
        "switches.",
      "The raised-hand vote mark is the nomination hand itself, standing " +
        "on a small glass disc.",
      "Naming yourself happens right on the nameplate, outlined in purple.",
      "The Spy's night line now reads: \"Each night the Storyteller will " +
        'show you the Grimoire."',
    ],
  },
  {
    date: "Earlier this week",
    lines: [
      "The Spy keeps their grimoire after the Storyteller closes it.",
      "Play again deals a clean new game — roles arrive, coins reset.",
      "The night sheet's buttons say what they actually do.",
      "A sent answer locks the choice it was about.",
    ],
  },
];
