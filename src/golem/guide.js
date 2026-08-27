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
 * THE REGISTER (FT-1226, user): instruction manual, not prose. Imperative,
 * front-loaded, one fact per sentence, no scene-setting clauses, and ZERO
 * em-dashes in any rendered string — the punctuation budget is the period.
 * Keep every fact that tells the reader what to DO; cut everything that
 * explains why it is nice. (The comments keep their own voice; only the
 * strings are rendered.)
 *
 * THE SHAPE. { id, label, foot, entries: [{ lead, note, who? }] }. `lead` is
 * the line, `note` the smaller one under it — the key list's own two-line
 * row, worn by prose. `who: "host"` prints a small "storyteller" tag inline
 * rather than hiding the row: a player wondering why they can't do a thing
 * is exactly who that tag is for. Sections whose EVERY row is the
 * storyteller's say it once in the foot instead of chipping every line.
 *
 * Player-facing words only — coins, chairs, the shroud, the noose — never
 * component names or CSS.
 */

export const GUIDE_SECTIONS = [
  {
    id: "in",
    label: "Getting in",
    // the three doors' own drop-cap keys (Intro.vue's ul.doors; hotkeys.js
    // H / J / sessionless-C rows)
    foot: "H hosts, J joins. O opens the town from the Host panel.",
    entries: [
      {
        // Intro.vue openHost/confirmHost: name input (minted place-names,
        // towns.js), ScriptPicker on the panel, copyShare() on open
        lead: "Host",
        note:
          "Name the town, pick a script, press Open. The invite link is " +
          "copied.",
      },
      {
        // Intro.vue join panel: "town name or link" + "what the town calls
        // you"; name remembered under golem.playerName
        lead: "Join",
        note:
          "Type the town's name or a link, and your own. This browser " +
          "remembers it.",
      },
      {
        // towns.js enterWhenOpen: open = a storyteller connected; the wait
        // panel polls forever, "Stop waiting" is the way out
        lead: "Not open yet",
        note: "Wait on the door. You walk in when the storyteller opens.",
      },
      {
        // Intro.vue openCreate → the script workbench (sessionless, no role
        // gate); in a town the script is the host's pick (HostTools scriptTab)
        lead: "Scripts",
        note:
          "Build or edit scripts before any town. In a town, the " +
          "storyteller picks.",
      },
      {
        // Menu.vue entry strip: quill → Chronicle page, cog → prefs,
        // golem-mark → AccountDoor (FT-1200)
        lead: "The corner marks",
        note: "Quill: the Chronicles. Cog: your settings. Golem: your account.",
      },
      {
        // FT-1200: AccountDoor.vue (the golem mark, both strips); the name
        // prefills Intro's join field and the first-claim ask (a default,
        // not a cage); recorded games carry each claimed seat's account id
        // (EndGameOverlay → the stats POST), guests record as guests.
        lead: "Your account",
        note:
          "Sign in: your name follows you, your games count. Guests play " +
          "the same, unrecorded.",
      },
      {
        // FT-1222: the panel's pitch, said once in the guide too — without
        // an account everything lives in this browser's local storage
        // (golem.playerName, prefs) and clearing the browser clears it; an
        // account (AccountDoor.vue) is what carries it across devices.
        lead: "Where it lives",
        note:
          "No account: name and settings stay in this browser. Signed in: " +
          "they follow you anywhere.",
      },
    ],
  },
  {
    id: "seats",
    label: "Seats",
    // seatActions.js guard idiom: disabled, never missing, reason as tooltip
    foot: "A greyed control names its reason. Rest on it and read.",
    entries: [
      {
        // Player.vue claim-overlay + oneTapClaim; first claim asks the name
        // in place; a seated player's tap on another chair reads "Move"
        lead: "Take a chair",
        note:
          "Tap an empty seat. The first claim asks your name. Seated, the " +
          "same tap is Move.",
      },
      {
        // socket.js _updateSeat + Player.vue seatMoveLocked: seated can't
        // move once underway; seatless rejoin and standing up stay open
        lead: "Chairs hold once the game starts",
        note:
          "No switching mid-game. Standing up works. A dropped player " +
          "rejoins on any free chair.",
      },
      {
        // Player.vue chairTitle — the player's own chair icon
        lead: "Standing up",
        note: "Tap your own chair mark. You leave the chair, not the town.",
      },
      {
        // seatActions.js: the six-row vocabulary; nominate on living seats,
        // ghost-vote on dead ones; Player.vue seatMenuEntries (host-only)
        lead: "The seat actions",
        who: "host",
        note:
          "Kill, Change role, Move player, Move role, Player nominates, " +
          "Add reminder. Dead seats trade the nomination for a ghost vote.",
      },
      {
        // prefs.js CONTROL_TOGGLES + Player.vue (FT-1213): every gesture is
        // its own switch on the Control settings tab; spectators always get
        // plain click
        lead: "Six ways to reach them",
        who: "host",
        note:
          "Coin click, coin hover, plate click, plate hover, both drags. " +
          "Each has a switch under Control settings.",
      },
    ],
  },
  {
    id: "host",
    label: "Storytelling",
    foot: "This whole chapter is the storyteller's seat.",
    entries: [
      {
        // HostTools.vue SETUP_TABS — the tabs' own titles, verbatim
        // (FT-1209 added the third: Control settings, the cog's own rows)
        lead: "The setup panel",
        note:
          "Script setup builds the game. Game settings sets the town's " +
          "rules. Control settings is yours.",
      },
      {
        // HostTools seats scrub + Shuffle people (setup-only, disabled once
        // underway); RoleActions Deal / Shuffle roles / Dupes / Retract
        lead: "Seats and the deal",
        note:
          "Scrub the seat count, then Deal. Shuffle people trades chairs; " +
          "Shuffle roles, characters.",
      },
      {
        // dealLies.js + dealReminders.js: bluffs, beliefs and auto-reminders
        // are consequences of dealing, drawn from one shared pool
        lead: "The deal chooses the lies",
        note:
          "Dealing picks the bluffs, the Drunk's and Lunatic's beliefs, " +
          "and reminders like the red herring. Change anything after.",
      },
      {
        // HostTools canStart + startLabel: the button names its own blocker
        lead: "Start game",
        note:
          "Lights when all seats are claimed and cast; until then it names " +
          "the blocker. Starting deals the characters.",
      },
      {
        // App.vue endPhase → NightSheet.flipPhase; night.js: the checklist,
        // visibility (off/storyteller/everyone) + enforcement
        // (Optional/Warn/Required) on the Game settings tab
        lead: "Day and night",
        note:
          "E ends the day or night. The night sheet lists who acts, in " +
          "order, with room for notes.",
      },
      {
        // nightLog.js modes + socket.js: "everyone" sends each seat its own
        // ask; nightTruth.js: the true answer beside the row, host-only
        lead: "Night asks",
        note:
          "Set the checklist to “everyone”: each ask lands on that " +
          "player's screen. The truth stays beside your row.",
      },
      {
        // Vote.vue execution mark + chronicles.js: recorded as "marked",
        // the storyteller decides what it becomes; Player.vue markedVotes
        lead: "The execution mark",
        note:
          "Mark the nominee on the vote card. The noose sits on the seat. " +
          "What it becomes is your call.",
      },
      {
        // towerBells.js: day length (0 = Off; the bell tolls, the day never
        // auto-ends), the day-break bell choice, Menu's Timer tab layers
        lead: "The tower",
        note:
          "Set a day length; the dial runs down. At zero the bell tolls. " +
          "The day never ends itself.",
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
          "Your seat shows what you were told. Drunks and Lunatics see the " +
          "belief, not the truth.",
      },
      {
        // bluffs.js: BLUFF_COUNT = 3, canSeeBluffs — the storyteller, and
        // whoever believes they are the demon (the Lunatic included)
        lead: "The demon's bluffs",
        note:
          "Three out-of-play characters, safe to claim. Shown to whoever " +
          "believes they are the demon.",
      },
      {
        // Player.vue nominate-mark (storyteller-only, living seats, no
        // running nomination); TownSquare.nominatePlayer bails on spectators
        lead: "Nominations",
        who: "host",
        note:
          "The storyteller runs them: accusing hand, then noose. Ask out " +
          "loud or in chat to nominate.",
      },
      {
        // Vote.vue: Hand UP / Hand DOWN on your seat, votes/majority tally,
        // hands lock as the count sweeps (lockedVote)
        lead: "Voting",
        note:
          "During a vote your seat offers Hand UP and Hand DOWN. Change " +
          "until the sweep locks yours.",
      },
      {
        // Player.vue ghost-vote cowl (spent stays visible, FT-1046);
        // seatActions ghost-vote hands it back
        lead: "Ghost votes",
        note:
          "The dead keep one vote. The cowl dims once spent; the " +
          "storyteller can hand it back.",
      },
      {
        // NightCall.vue face form: the ask on the clock face, the seats are
        // the control; free-text for characters with nothing to point at
        lead: "When the night wants you",
        note:
          "Your ask appears on the clock face. Tap coins to answer. Some " +
          "characters answer in words.",
      },
      {
        // chat.js + ChroniclesDrawer: composer at the drawer's foot, whisper
        // chips; live whispers reach their parties, finished games go public
        lead: "The talk",
        note:
          "Chat lives in the Chronicle; arm a seat's chip to whisper. " +
          "Whispers go public when the game ends.",
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
          "Talk, deals, phases, deaths, votes and endings land in one " +
          "permanent log, chaptered per game.",
      },
      {
        // ChroniclesDrawer cr-mode: Current / History, the records band in
        // History with per-game rows
        lead: "Current and History",
        note:
          "Current: the town since it opened. History: every past game, " +
          "stats and messages.",
      },
      {
        // ChroniclesDrawer filter cells + App.vue keys 1-4 and V; the
        // "Your nights" cell renders only when this viewer has night rows
        lead: "The filters",
        note:
          "All, Talk, Gallows, Events: keys 1 to 4 while open. V jumps to " +
          "the gallows. Your nights appears when you have any.",
      },
      {
        // records.js + Player.vue gameUnderway: the record published at the
        // end; whispers go public then (ChroniclesDrawer transparency note)
        lead: "When a game ends",
        note:
          "The record publishes: winner, script, seats, length, roster, " +
          "two portraits. Whispers go public.",
      },
      {
        // StatsOverlay: the cross-town Chronicle page, entry-screen quill,
        // sessionless C
        lead: "The Chronicles page",
        note:
          "Off a town, the quill opens every town's games. Facts only, no " +
          "messages.",
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
    foot: "Personal settings follow you everywhere. The Game settings tab is the town's.",
    entries: [
      {
        // Menu.vue settings tab title: "Your settings — this browser,
        // every town"
        lead: "The cog",
        note: "Yours, in every town, on this browser. Never the town's.",
      },
      {
        // prefs.js SETUP_LABELS: Names and icons / Icons only (FT-1209
        // rider renamed the display strings; the stored key is unchanged)
        lead: "Setup panel",
        who: "host",
        note: "Names and icons, or icons alone once you know them.",
      },
      {
        // prefs.js CONTROL_TOGGLES (FT-1213; the Seats section lists the
        // gestures themselves)
        lead: "Control settings",
        who: "host",
        note: "One switch per gesture. Turn off what gets in your way.",
      },
      {
        // prefs.js GRIMOIRE_SIZES: the book, the day's-end button and the
        // bell are one column and scale as one
        lead: "Grimoire size",
        who: "host",
        note: "Small or large. Book, day button and bell scale as one.",
      },
    ],
  },
];
