/**
 * Golem fork (FT-1348 round 2): THE AUTOMATIONS-ROWS LAB — which dress the
 * Automations pane's rule rows wear.
 *
 * Two dresses, one flag:
 *   - "pills" (the default): the rule NAME is the toggle — a pill-shaped
 *     button wearing the rule's mark, grey-ringed off / plum-filled armed
 *     (the FT-1347 grammar), its description inline after it. One line per
 *     rule.
 *   - "checks": the FT-1348 checkbox rows — mark + name + gcheck with the
 *     description on its own shelf underneath. Kept as the swap-back.
 *
 * Same shape as the coin/chair labs (coinArt.js / chairArt.js): a module
 * Vue.observable every consumer renders from, persisted per browser under a
 * `golem.*` key, with an in-memory mirror so a localStorage that throws
 * (private mode) still leaves a working switch for the page's life. The
 * tower writes are untouched either way — this flag only picks which control
 * performs them.
 */
import Vue from "vue";

const KEY = "golem.autoRows"; // "pills" | "checks"; absent = pills

/** The lab's two chips, in the order they stack. */
export const AUTO_ROW_MODES = [
  { id: "pills", label: "Pills" },
  { id: "checks", label: "Checkboxes" },
];

const stored = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "checks" ? "checks" : "pills";
  } catch {
    return "pills";
  }
})();

/** The live flag — HostTools' Automations pane branches on `.v`. */
export const autoRowsChoice = Vue.observable({ v: stored });

/** One lab click: set the dress and remember it. */
export function applyAutoRows(v) {
  autoRowsChoice.v = v === "checks" ? "checks" : "pills";
  try {
    localStorage.setItem(KEY, autoRowsChoice.v);
  } catch {
    // private mode — the observable still carries this page's session
  }
}
