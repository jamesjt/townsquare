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
import { resolvedCapKey, glyphFrom, glyphCapStyleFrom } from "./titleFonts";

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
 * The blood drop-cap for a letter, or null when none has been cut yet — the
 * FALLBACK tier of capFor below, kept working because it's the tier a
 * letter lands on when the picker's active family doesn't carry it. Ten
 * letters are baked (the set the entry doors used to need); a letter
 * without art here falls to capFor's third tier (plain text) instead of a
 * gap.
 */
function bloodCapFor(letter) {
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
 * The drop-cap for a hotkey letter (FT-948). THREE tiers, in order:
 *
 *   1. The picker's active family — `resolvedCapKey()`, the exact function
 *      the entry doors resolve their own caps through (Intro.vue's
 *      capKeyNow). This is the fix: before FT-948 this function ignored the
 *      picker entirely and always rendered the baked blood alphabet, so the
 *      Keys panel and the doors could show two different fonts depending on
 *      what the user had picked. Now they always read the same family and
 *      move together when the picker cycles. Sized through
 *      `glyphCapStyleFrom`, the same lone-drop-cap normalization the doors
 *      use, so a shared letter (S is on both) renders pixel-identical.
 *   2. The baked blood alphabet (bloodCapFor) — for a letter the active
 *      family doesn't carry. It has its own pixel-tuned art, so a gap still
 *      reads as the same family instead of falling out of it. In practice
 *      this tier is defensive: every letter HOTKEYS binds is now bundled in
 *      all three families (see titleFonts.js's G/F/V comment), so this only
 *      fires for a future hotkey letter nobody's bundled yet.
 *   3. Nothing (null) — the caller (KeyCap) renders the raw letter as text
 *      inside the same `.key` span, which already carries the treatment —
 *      Bloody, blood red, black outline. It reads as the same family, just
 *      without the drips. This is also the deliberate landing spot for
 *      "Esc": a multi-character key was never a single glyph to begin with,
 *      so it skips both art tiers on purpose rather than looking up "E" and
 *      silently dropping the "sc".
 */
export function capFor(letter) {
  if (!letter || String(letter).length !== 1) return null;
  const L = String(letter).toUpperCase();

  const family = resolvedCapKey();
  const g = glyphFrom(family, L);
  if (g) {
    const style = glyphCapStyleFrom(family, L);
    if (style) return { src: g.src, style };
  }

  return bloodCapFor(L);
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
  // D (Edition) and A (Add a player) RETIRED 2026-08-20, both on the user's
  // call and both verified redundant before removal:
  //
  //   D opened `toggleModal("edition")` — and S, for a storyteller already in
  //   a town, opens exactly the same thing. D returned early unless you were
  //   the host, so the host-in-a-town case was the ONLY case it covered, and
  //   S covers it identically. Two letters, one door.
  //
  //   A added a single seat. The seat count is a SCRUB now — drag the number
  //   in the build panel and set it outright — so a key that adds one at a
  //   time is a slower way to reach a control that already answers the whole
  //   question.
  //
  // Their handlers in App.vue went with them: a key that still fires while
  // this map no longer lists it is worse than either keeping or removing it,
  // because the panel is the only place these are written down.
  {
    key: "V",
    who: "all",
    // FT-1019: V lands in the CHRONICLES with the gallows filter already on
    // — the nomination log lives there now, each vote unfolding its own
    // roster and outcome. (The old vote-history drawer is retired.)
    label: "Gallows",
    note: "The chronicles, filtered to nominations and votes",
  },
  {
    key: "1–4",
    who: "all",
    // FT-1019: live only while the chronicles drawer is out — the four
    // filter cells in their on-screen order.
    label: "Chronicle filters",
    note: "While the chronicles are open: All, Talk, Gallows, Events",
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
