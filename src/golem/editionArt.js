// Golem fork (FT-854): the edition card art + one-line blurbs, shared by every
// script picker (the host panel and the Almanac workbench render the SAME
// ScriptPicker component; this module keeps its imagery in one place).
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
