// Golem fork (FT-854): the edition card art + one-line blurbs, shared by every
// script picker (the host panel and the Almanac workbench render the SAME
// ScriptPicker component; this module keeps its imagery in one place).
import editionJSON from "../editions.json";
import edTb from "../assets/editions/tb.png";
import edBmr from "../assets/editions/bmr.png";
import edSnv from "../assets/editions/snv.png";
import edLuf from "../assets/editions/luf.png";
import edCustom from "../assets/editions/custom.png";

export const EDITION_ICONS = { tb: edTb, bmr: edBmr, snv: edSnv, luf: edLuf };
export { edCustom };

// One-line flavor per official edition (level-appropriate, ours to write —
// editions.json carries only the long prose descriptions).
export const OFFICIAL_BLURBS = {
  tb: "Deception and deduction in a sleepy town — the first-timers' script.",
  bmr: "Death comes in the night; keep the town alive long enough to win.",
  snv: "Madness and altered minds — nobody is sure of anything.",
  luf: "A freewheeling veteran brew of the strangest minds."
};

/**
 * FT-1162: THE ART FOR A SCRIPT A RECORD NAMES.
 *
 * A recorded game stores its script as a display NAME and nothing else —
 * `botc_games.scriptName` (plus a nullable `scriptId` for a vault script);
 * there is no `editionId` column, and EndGameOverlay drops the `tb`/`bmr`/
 * `snv` id when it writes the row. So the only handle a record gives us is
 * the name, and this maps it back.
 *
 * The name→id table is DERIVED from editions.json rather than typed out, so
 * a renamed edition cannot drift out of sync with its art.
 *
 * EVERY return value is a bundled `require()` — an official mark or the stock
 * custom mark. There is no path here that yields a URL which might 404, which
 * is the point: a record can name a script that no longer exists, or a custom
 * one that never had art, and neither may produce a broken image. The caller
 * still prints the NAME beside it; the art only ever adds to that.
 *
 * NOT WIRED (deliberate, FT-1162): a vault script's own uploaded icon. It
 * lives in the script JSON's `_meta.logo` pseudo-role, which means a fetch per
 * opened record for a script that may since have been deleted, and its values
 * are a mixed bag — a `data:` URL, a bare official role id, or the `"__gold"`
 * sentinel — whose decoder is a private method on EditionModal
 * (`scriptLogoSrc`). Promoting that decoder is its own job across five call
 * sites. The stock custom mark is the honest answer until then.
 */
const EDITION_ID_BY_NAME = editionJSON.reduce((map, e) => {
  if (e && e.name) map[String(e.name).trim().toLowerCase()] = e.id;
  return map;
}, {});

export function scriptArtFor(scriptName) {
  if (!scriptName) return edCustom;
  const id = EDITION_ID_BY_NAME[String(scriptName).trim().toLowerCase()];
  return (id && EDITION_ICONS[id]) || edCustom;
}
