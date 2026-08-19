/**
 * Golem fork (FT-880): THE KEY MAP, in one place.
 *
 * Until now the hotkeys existed only as a switch statement inside App.vue's
 * keyup handler, which meant two things: nothing in the app could tell a
 * player they existed, and the two places that DO print a key (the index
 * page's doors, the menu's little badges) each hard-coded their own letter and
 * could drift from the handler without anybody noticing.
 *
 * So the table lives here as data. The handler reads it, the help panel reads
 * it, the menu badges read it — a key can only be changed in one place, and a
 * key that is changed is changed everywhere it is shown.
 */
import bloodMetrics from "../assets/blood/metrics.json";

const bakedCaps = {
  A: require("../assets/blood/blood-A.png"),
  C: require("../assets/blood/blood-C.png"),
  E: require("../assets/blood/blood-E.png"),
  G: require("../assets/blood/blood-G.png"),
  H: require("../assets/blood/blood-H.png"),
  J: require("../assets/blood/blood-J.png"),
  N: require("../assets/blood/blood-N.png"),
  R: require("../assets/blood/blood-R.png"),
  S: require("../assets/blood/blood-S.png"),
  V: require("../assets/blood/blood-V.png"),
};

/**
 * Image px → em for the drop-caps, the same conversion Intro.vue's baked
 * `.blood-cap-*` rules use and for the same reason: the letters are rendered
 * at 2x against a 180px reference font and shown at 1.09x the key font, so
 * 1.09 / (180 * 2) em per trimmed pixel. Deriving it from metrics.json here
 * rather than re-baking a second set of static sizes means a re-cut letter
 * changes size on its own.
 */
const CAP_EM = 1.09 / 360;

/**
 * The blood drop-cap for a letter, or null when none has been cut yet.
 *
 * Ten letters are baked (the set the entry doors and the old key table
 * needed). A letter without art is NOT a failure and must not be a gap: the
 * caller renders it as text inside the very same `.key` span, which already
 * carries the treatment — Bloody, blood red, black outline. It reads as the
 * same family, just without the drips.
 */
export function capFor(letter) {
  const L = String(letter).toUpperCase();
  const src = bakedCaps[L];
  const m = bloodMetrics[L];
  if (!src || !m) return null;
  return {
    src,
    style: {
      width: (m.w * CAP_EM).toFixed(3) + "em",
      height: (m.h * CAP_EM).toFixed(3) + "em",
      verticalAlign: -(m.below * CAP_EM).toFixed(3) + "em",
    },
  };
}

/**
 * THE MAP. `who` says whose key it is, and is what the help panel filters on
 * so a player is never shown a storyteller's key:
 *   all         — anyone in a town
 *   host        — the storyteller only
 *   player      — a seated/watching player only
 *   sessionless — the index page, before any town
 *
 * `note` is the one-line description the panel prints. Keep them in the
 * user's language, not the code's ("the coins on the seats", never
 * "isPublic").
 */
export const HOTKEYS = [
  {
    key: "G",
    who: "host",
    label: "Grimoire",
    note: "Open and close the grimoire drawer",
  },
  {
    key: "E",
    who: "host",
    label: "End the phase",
    note: "End the day, or end the night",
  },
  {
    key: "S",
    who: "all",
    label: "Script",
    note: "Storyteller: the script editor. Player: the script sheet",
  },
  {
    key: "F",
    who: "all",
    label: "First night",
    note: "The first night's order",
  },
  {
    key: "N",
    who: "all",
    label: "Other nights",
    note: "Every other night's order",
  },
  {
    key: "R",
    who: "host",
    label: "Reveal",
    note: "Turn the coins on the seats face up or face down",
  },
  {
    key: "C",
    who: "host",
    label: "Characters",
    note: "Choose and assign characters",
  },
  {
    key: "D",
    who: "host",
    label: "Edition",
    note: "Pick the edition",
  },
  {
    key: "A",
    who: "host",
    label: "Add a player",
    note: "Add a seat to the town",
  },
  {
    key: "V",
    who: "all",
    label: "Votes",
    note: "The nomination log",
  },
  {
    key: "H",
    who: "sessionless",
    label: "Host",
    note: "Open a town of your own",
  },
  {
    key: "J",
    who: "sessionless",
    label: "Join",
    note: "Join somebody else's town",
  },
  {
    key: "Esc",
    who: "all",
    label: "Close",
    note: "Close whatever is open",
  },
];

/**
 * The keys that apply to this viewer right now. A storyteller and a player
 * genuinely have different maps, and printing the other one's keys would be
 * the same mistake as showing them the other one's controls.
 */
export function hotkeysFor({ inSession, isSpectator }) {
  return HOTKEYS.filter((k) => {
    if (k.who === "all") return true;
    if (k.who === "sessionless") return !inSession;
    if (!inSession) return false;
    return k.who === (isSpectator ? "player" : "host");
  });
}
