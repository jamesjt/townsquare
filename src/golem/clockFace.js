/**
 * Golem fork (FT-1169): THE PLATE IN THE MIDDLE OF THE CLOCK, in screen
 * pixels — the one fact two different surfaces have to agree on.
 *
 * WHY IT LEFT Player.vue. FT-1167 measured this to keep a seat's reminder fan
 * from swinging its tokens behind the night checklist, and wrote the reading
 * as a private method on the seat. FT-1169's seat menu has to clear the same
 * plate for the same reason — a menu opened at a 12 o'clock coin that hangs
 * inward lands squarely on the checklist — and two copies of "where is the
 * disc" is exactly the drift this fork keeps writing notes about. One
 * definition, two readers: Player.vue's own `centrePlateRect()` now delegates
 * here and keeps its name, so nothing that called it had to change.
 *
 * THE NIGHT CHECKLIST WINS WHEN IT IS UP. Both plates are centred on the dial
 * and both are drawn as a disc on desktop (`face-disc-frame`), so one ellipse
 * describes either — but only one of them is on screen at a time, and the
 * checklist is both the larger and the one whose rows a storyteller is
 * actually reading. `ul.info` (the town readout) is the day's answer.
 *
 * THE VISIBILITY TEST IS NOT DECORATION. `ul.info` stays in the DOM with a
 * real box while the night sheet covers it, so a caller that trusted the
 * bounding box alone would clear a plate that is not there and crowd itself
 * out of the middle of the screen for nothing.
 */
export function centrePlateRect() {
  const el =
    document.querySelector(".night-sheet.has-list") ||
    document.querySelector("ul.info");
  if (!el) return null;
  const box = el.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none") return null;
  return {
    cx: box.left + box.width / 2,
    cy: box.top + box.height / 2,
    rx: box.width / 2,
    ry: box.height / 2,
  };
}

/**
 * The same plate as an axis-aligned BOX, for callers whose own object is a
 * rectangle and who therefore cannot ask an ellipse anything useful.
 *
 * THE BOX IS THE ELLIPSE'S BOUNDING BOX, i.e. deliberately PESSIMISTIC — it
 * claims the four corners the disc does not actually occupy. A menu pushed a
 * few pixels further out than it strictly had to be costs nothing; one that
 * clipped a corner of the checklist because the caller reasoned about an
 * ellipse with rectangle arithmetic costs the read the plate is there for.
 */
export function centrePlateBox() {
  const e = centrePlateRect();
  if (!e) return null;
  return {
    left: e.cx - e.rx,
    top: e.cy - e.ry,
    right: e.cx + e.rx,
    bottom: e.cy + e.ry,
  };
}
