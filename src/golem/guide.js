/**
 * Golem fork (FT-1197): THE GUIDE — what the app can do, written down.
 *
 * The key list (FT-880) was the first surface that admitted the app had
 * hotkeys; this is the same admission for everything else. The panel that
 * shows it is HotkeyHelp.vue; the keys themselves stay in golem/hotkeys.js
 * (that section reads hotkeysFor, exactly as before), and everything else
 * lives here as data for the same reason the key map does — a fact printed
 * from a table can be corrected in one place.
 *
 * EVERY ENTRY IS FACT-CHECKED. The comment above each names the code that
 * makes it true; if that code moves, the sentence is what has to move with
 * it. Nothing here documents a wish — several of this lane's first guesses
 * (staged deaths, deal toggles, players nominating) turned out not to exist
 * and are deliberately absent or stated the other way round.
 *
 * THE SHAPE. { id, label, foot, entries: [{ lead, note, who? }] }. `lead` is
 * the line, `note` the smaller one under it — the key list's own two-line
 * row, worn by prose. `who: "host"` prints a small "storyteller" tag inline
 * rather than hiding the row: a player wondering why they can't do a thing
 * is exactly who that tag is for. Sections whose EVERY row is the
 * storyteller's say it once in the foot instead of chipping every line.
 *
 * Player-facing words only — coins, chairs, the shroud, the noose — never
 * component names or CSS. Two lines each: this is a guide you skim at the
 * table, not a manual.
 */

export const GUIDE_SECTIONS = [
  {
    id: "in",
    label: "Getting in",
    // the three doors' own drop-cap keys (Intro.vue's ul.doors; hotkeys.js
    // H / J / sessionless-C rows)
    foot: "H and J are the doors' own keys; O opens the town while the Host panel is up.",
    entries: [
      {
        // Intro.vue openHost/confirmHost: name input (minted place-names,
        // towns.js), ScriptPicker on the panel, copyShare() on open
        lead: "Host",
        note:
          "Pick a town name — one is minted for you — and a script, then Open. " +
          "The invite link is copied the moment the town opens.",
      },
      {
        // Intro.vue join panel: "town name or link" + "what the town calls
        // you"; name remembered under golem.playerName
        lead: "Join",
        note:
          "Type the town's name or paste an invite link, and what the town should " +
          "call you. The name is remembered on this browser.",
      },
      {
        // towns.js enterWhenOpen: open = a storyteller connected; the wait
        // panel polls forever, "Stop waiting" is the way out
        lead: "Not open yet",
        note:
          "A town whose storyteller isn't there is waited for, not entered — " +
          "stay on the door and you walk in the moment they open it.",
      },
      {
        // Intro.vue openCreate → the script workbench (sessionless, no role
        // gate); in a town the script is the host's pick (HostTools scriptTab)
        lead: "Scripts",
        note:
          "The script workbench — build or edit a script before any town. " +
          "Inside a town, the script is the storyteller's pick.",
      },
      {
        // Menu.vue entry strip: quill → Chronicle page, cog → prefs,
        // golem-mark → AccountDoor (FT-1200)
        lead: "The corner marks",
        note:
          "The quill opens the Chronicles, the cog your own settings, and " +
          "the golem is the account door — sign in, or see who you are.",
      },
      {
        // FT-1200: AccountDoor.vue (the golem mark, both strips); the name
        // prefills Intro's join field and the first-claim ask (a default,
        // not a cage); recorded games carry each claimed seat's account id
        // (EndGameOverlay → the stats POST), guests record as guests.
        lead: "Your account",
        note:
          "Signing in makes your name follow you to every table, and games " +
          "you play count toward your own record. No account? Guests play " +
          "exactly the same — games just aren't yours to look back on.",
      },
    ],
  },
  {
    id: "seats",
    label: "Seats",
    // seatActions.js guard idiom: disabled, never missing, reason as tooltip
    foot: "A greyed control always names its reason — rest on it and read.",
    entries: [
      {
        // Player.vue claim-overlay + oneTapClaim; first claim asks the name
        // in place; a seated player's tap on another chair reads "Move"
        lead: "Take a chair",
        note:
          "One tap on an empty seat claims it — the first claim asks your name " +
          "right there. Already seated? The same tap elsewhere is Move.",
      },
      {
        // socket.js _updateSeat + Player.vue seatMoveLocked: seated can't
        // move once underway; seatless rejoin and standing up stay open
        lead: "Chairs hold once the game starts",
        note:
          "A seated player can't switch chairs mid-game. Standing up still works, " +
          "and a dropped player can always take a free chair to rejoin.",
      },
      {
        // Player.vue chairTitle — the player's own chair icon
        lead: "Standing up",
        note:
          "The chair mark on your own seat stands you up — you leave the chair " +
          "but stay in the town.",
      },
      {
        // seatActions.js: the six-row vocabulary; nominate on living seats,
        // ghost-vote on dead ones; Player.vue seatMenuEntries (host-only)
        lead: "The seat actions",
        who: "host",
        note:
          "Every seat answers with the same six: Kill, Change role, Move player, " +
          "Move role, Player nominates, Add reminder. A dead seat trades the " +
          "nomination for its ghost vote.",
      },
      {
        // prefs.js CONTROL_SCHEMES + Player.vue: click / hover ring /
        // nameplate plate; spectators always get plain click
        lead: "Three ways to reach them",
        who: "host",
        note:
          "Click the coin, rest on the coin, or click the nameplate — pick " +
          "yours behind the cog.",
      },
    ],
  },
  {
    id: "host",
    label: "Storytelling",
    foot: "This whole chapter is the storyteller's seat.",
    entries: [
      {
        // HostTools.vue SETUP_TABS — the two tabs' own titles, verbatim
        lead: "The setup panel",
        note:
          "Two tabs: Script setup — the chairs, the script, the characters and " +
          "who is holding them — and Game settings, this town's own rules.",
      },
      {
        // HostTools seats scrub + Shuffle people (setup-only, disabled once
        // underway); RoleActions Deal / Shuffle roles / Dupes / Retract
        lead: "Seats and the deal",
        note:
          "Scrub the seat count, Deal the characters, and shuffle either half: " +
          "Shuffle people trades chairs, Shuffle roles trades characters.",
      },
      {
        // dealLies.js + dealReminders.js: bluffs, beliefs and auto-reminders
        // are consequences of dealing, drawn from one shared pool
        lead: "The deal chooses the lies",
        note:
          "Dealing picks the demon's three bluffs, what a Drunk or Lunatic is " +
          "told they are, and lays auto-reminders like the red herring. Change " +
          "any of it afterwards.",
      },
      {
        // HostTools canStart + startLabel: the button names its own blocker
        lead: "Start game",
        note:
          "Lights when every seat is claimed and cast — until then the button " +
          "names what's missing. Starting deals every player their character.",
      },
      {
        // App.vue endPhase → NightSheet.flipPhase; night.js: the checklist,
        // visibility (off/storyteller/everyone) + enforcement
        // (Optional/Warn/Required) on the Game settings tab
        lead: "Day and night",
        note:
          "E ends the day or the night. The night sheet is your ordered " +
          "checklist — who acts, in order, with room to note what you told them.",
      },
      {
        // nightLog.js modes + socket.js: "everyone" sends each seat its own
        // ask; nightTruth.js: the true answer beside the row, host-only
        lead: "Night asks",
        note:
          "Set the night checklist to “everyone” and each character's ask lands " +
          "on that player's own screen; the true answer stands beside your row, " +
          "so any lie you tell is told on purpose.",
      },
      {
        // Vote.vue execution mark + chronicles.js: recorded as "marked",
        // the storyteller decides what it becomes; Player.vue markedVotes
        lead: "The execution mark",
        note:
          "On a vote's card, mark the nominee — the noose and its tally sit on " +
          "the seat. What a marking becomes is your call.",
      },
      {
        // towerBells.js: day length (0 = Off; the bell tolls, the day never
        // auto-ends), the day-break bell choice, Menu's Timer tab layers
        lead: "The tower",
        note:
          "Give the day a length and the dial runs it down — at zero the bell " +
          "tolls and the readout flashes, but the day never ends itself.",
      },
    ],
  },
  {
    id: "play",
    label: "Playing",
    foot: "What you see and what the storyteller sees differ on purpose.",
    entries: [
      {
        // belief.js: believedRole vs role; every player-facing surface reads
        // the belief, believedAlignment colours the seat to match
        lead: "Your character",
        note:
          "Your seat shows what you were told. A Drunk or a Lunatic's screen " +
          "carries the belief, not the truth — the whole interface plays along.",
      },
      {
        // bluffs.js: BLUFF_COUNT = 3, canSeeBluffs — the storyteller, and
        // whoever believes they are the demon (the Lunatic included)
        lead: "The demon's bluffs",
        note:
          "Three characters not in play, shown to whoever believes they are " +
          "the demon — safe characters to claim.",
      },
      {
        // Player.vue nominate-mark (storyteller-only, living seats, no
        // running nomination); TownSquare.nominatePlayer bails on spectators
        lead: "Nominations",
        who: "host",
        note:
          "The storyteller runs them — the accusing hand on a seat, then the " +
          "noose on the target. Ask out loud, or in the chat, to nominate.",
      },
      {
        // Vote.vue: Hand UP / Hand DOWN on your seat, votes/majority tally,
        // hands lock as the count sweeps (lockedVote)
        lead: "Voting",
        note:
          "While a vote runs your seat offers Hand UP and Hand DOWN — change " +
          "your mind until the sweep reaches you and your hand locks.",
      },
      {
        // Player.vue ghost-vote cowl (spent stays visible, FT-1046);
        // seatActions ghost-vote hands it back
        lead: "Ghost votes",
        note:
          "The dead keep one vote. The cowl on a dead seat shows it, and goes " +
          "dim once spent — the storyteller can hand it back.",
      },
      {
        // NightCall.vue face form: the ask on the clock face, the seats are
        // the control; free-text for characters with nothing to point at
        lead: "When the night wants you",
        note:
          "Your ask appears on the clock face and the seats are the answer — " +
          "tap the coins. Some characters answer in their own words instead.",
      },
      {
        // chat.js + ChroniclesDrawer: composer at the drawer's foot, whisper
        // chips; live whispers reach their parties, finished games go public
        lead: "The talk",
        note:
          "The chat lives in the Chronicle, composer at its foot; arm a seat's " +
          "chip to whisper. A live game's whisper stays between its parties — " +
          "a finished game is public, whispers included.",
      },
    ],
  },
  {
    id: "records",
    label: "Chronicles",
    // chat.js: "a game is a FILTER over that log, never a boundary"
    foot: "A game is a chapter in the town's one log, never a reset of it.",
    entries: [
      {
        // ChroniclesDrawer: one stream, chaptered per game; chronicles.js
        // event vocabulary (deals, phases, deaths, votes, endings)
        lead: "One stream",
        note:
          "Everything the town says and does lands in one permanent log — " +
          "talk, deals, phases, deaths, votes, endings — chaptered per game.",
      },
      {
        // ChroniclesDrawer cr-mode: Current / History, the records band in
        // History with per-game rows
        lead: "Current and History",
        note:
          "Current is the town since it opened this time. History is the " +
          "reading room — every past game, its stats and its messages.",
      },
      {
        // ChroniclesDrawer filter cells + App.vue keys 1-4 and V; the
        // "Your nights" cell renders only when this viewer has night rows
        lead: "The filters",
        note:
          "All, Talk, Gallows, Events — keys 1 to 4 while it's open, and V " +
          "jumps straight to the gallows. Your own nights get a cell of their " +
          "own when you have any.",
      },
      {
        // records.js + Player.vue gameUnderway: the record published at the
        // end; whispers go public then (ChroniclesDrawer transparency note)
        lead: "When a game ends",
        note:
          "Its record — winner, script, seats, length, roster and two board " +
          "portraits — is published, and its whispers become part of the " +
          "public story.",
      },
      {
        // StatsOverlay: the cross-town Chronicle page, entry-screen quill,
        // sessionless C
        lead: "The Chronicles page",
        note:
          "Off a town, the same quill opens every town's games on one page — " +
          "end-of-game facts only, no messages.",
      },
    ],
  },
  {
    // rendered from golem/hotkeys.js by the panel itself — the one section
    // that is not entries here, so the key map keeps its single source
    id: "keys",
    label: "Keys",
    foot: "Keys are ignored while you are typing in a field.",
    entries: [],
  },
  {
    id: "you",
    label: "Settings",
    // prefs.js's own line between the two surfaces
    foot: "Personal settings follow you into every town; the Game settings tab is the town's.",
    entries: [
      {
        // Menu.vue settings tab title: "Your settings — this browser,
        // every town"
        lead: "The cog",
        note:
          "Yours, on this browser, in every town — three settings, none of " +
          "them the town's.",
      },
      {
        // prefs.js SETUP_LABELS: Names and marks / Marks only
        lead: "Setup panel",
        who: "host",
        note: "Names and marks, or marks alone once you have learned them.",
      },
      {
        // prefs.js CONTROL_SCHEMES (see the Seats section for what they do)
        lead: "Control scheme",
        who: "host",
        note:
          "Click coins, hover coins, or nameplate click — how a seat offers " +
          "its actions.",
      },
      {
        // prefs.js GRIMOIRE_SIZES: the book, the day's-end button and the
        // bell are one column and scale as one
        lead: "Grimoire size",
        who: "host",
        note:
          "Small or large. The book, the day's-end button and the bell scale " +
          "as one.",
      },
    ],
  },
];
