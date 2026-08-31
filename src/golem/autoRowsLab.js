/**
 * Golem fork (FT-1348 round 2): THE AUTOMATIONS-ROWS LAB — which dress the
 * Automations pane's rule rows wear.
 *
 * Two dresses, one flag:
 *   - "checks" (the default, restored FT-1348 round 3 — user verdict: "thats
 *     not working, lets put it back to check boxes"): mark + wide name +
 *     gcheck flush to the row's right edge, the rule's sentence moved to the
 *     row's hover title instead of a visible shelf line.
 *   - "pills": the round-2 try — the rule NAME as a pill-shaped toggle,
 *     grey-ringed off / plum-filled armed (the FT-1347 grammar), description
 *     inline after it. Kept in the lab as the non-default try-it state.
 *
 * Same shape as the coin/chair labs (coinArt.js / chairArt.js): a module
 * Vue.observable every consumer renders from, persisted per browser under a
 * `golem.*` key, with an in-memory mirror so a localStorage that throws
 * (private mode) still leaves a working switch for the page's life. The
 * tower writes are untouched either way — this flag only picks which control
 * performs them.
 */
import Vue from "vue";

const KEY = "golem.autoRows"; // "pills" | "checks"; absent = checks

/** The lab's two chips, in the order they stack. */
export const AUTO_ROW_MODES = [
  { id: "checks", label: "Checkboxes" },
  { id: "pills", label: "Pills" },
];

const stored = (() => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "pills" ? "pills" : "checks";
  } catch {
    return "checks";
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
