// Golem fork: the BLOOD-DRIP overlay scrollbar (v-blood-scroll), v5 —
// rebuilt from first principles (user call: the cropped-photo drop read as
// anything but blood).
//
// The lessons the earlier versions taught, all kept:
//   - Vue patches sibling views onto one element and wipes runtime classes:
//     update() re-asserts blooddrip-host every pass
//   - the overlay needs its own lane (padding-right) or it sits on content
//   - the drop drags via pointer capture
//   - the trail FOLLOWS the drop (scrolling up wipes it)
//   - never TILE a texture — repetition reads as a chain; DRAW instead
//
// What's new: everything visual is drawn SVG.
//   - the drop is the canonical teardrop SILHOUETTE (pointed crown, round
//     bulb) with a radial crimson body, dark rim and one specular glint —
//     the shape itself says "drop of blood"
//   - liquid motion: scroll velocity stretches the drop long, and it eases
//     back round at rest
//   - the trail is a tapered run (thin at its top, swelling to meet the
//     drop) plus seeded dried beads left where the drop has passed
import Vue from "vue";
import trailSprite from "../assets/blood/drip-shaft.png";
import bulbSprite from "../assets/blood/drip-bulb.png";

// The gutter the host reserves, and the svg that fills it. The lane is wide
// enough for the WHOLE bulb (22px) plus a margin, so the drip always draws
// INSIDE its scroll region — it used to hang ~20px past the host's right
// edge, which nobody saw on the open page but crossed the role drawer's
// border (user call 2026-08-18).
const LANE = 30;
const W = LANE;

// USER-adjustable drip dials (the Dr panel) — persisted per browser
// the USER-calibrated drip (dialed in the Dr lab, 2026-08-18)
// dx was +20 while the lane was drawn at the host's edge — the drip's own
// lane now carries that offset, so the nudge starts at zero again.
const DRIP_DEFAULTS = { w: 22, h: 102, trailW: 6, overlap: 26, dx: 0, dy: -15, bx: -1 };
// bumped whenever the lane geometry changes — stored dials calibrated against
// the OLD lane would push the drip back outside its host
const DRIP_V = 2;
let dripStored = {};
try {
  const raw = JSON.parse(localStorage.getItem("golem.drip") || "{}");
  if (raw && raw.v === DRIP_V) dripStored = raw;
} catch (e) {
  dripStored = {};
}
export const dripKnobs = Vue.observable({ ...DRIP_DEFAULTS, ...dripStored, v: DRIP_V });
export function saveDripKnobs() {
  localStorage.setItem("golem.drip", JSON.stringify({ ...dripKnobs, v: DRIP_V }));
  window.dispatchEvent(new Event("golem-drip-update"));
}
export function resetDripKnobs() {
  Object.assign(dripKnobs, DRIP_DEFAULTS);
  saveDripKnobs();
}

// the teardrop path in a 15x24 box: crown point -> symmetric cubics into
// the bulb -> back up (drawn fallback — the drips.webp art rides now)
// eslint-disable-next-line no-unused-vars
const DROP_PATH =
  "M7.5 0 C8.1 4.2 10.2 7.3 12.1 10.2 C13.8 12.8 15 15 15 17.2 " +
  "C15 21.1 11.6 24 7.5 24 C3.4 24 0 21.1 0 17.2 " +
  "C0 15 1.2 12.8 2.9 10.2 C4.8 7.3 6.9 4.2 7.5 0 Z";

let uid = 0;

function makeSvg(id) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("class", "blooddrip-svg");
  svg.setAttribute("width", W);
  svg.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;overflow:visible;";
  svg.innerHTML = `
    <defs>
      <radialGradient id="bdg-${id}" cx="42%" cy="38%" r="72%">
        <stop offset="0%" stop-color="#c62828"/>
        <stop offset="55%" stop-color="#8f1010"/>
        <stop offset="100%" stop-color="#4a0606"/>
      </radialGradient>
      <linearGradient id="bdt-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(90,10,10,0)"/>
        <stop offset="18%" stop-color="rgba(112,14,14,0.55)"/>
        <stop offset="100%" stop-color="rgba(140,18,18,0.8)"/>
      </linearGradient>
    </defs>
    <image class="bd-trail" href="${trailSprite}" x="${W / 2 - 4}" y="0"
      width="8" height="0" preserveAspectRatio="none"/>
    <g class="bd-beads" fill="#6d0d0d"></g>
    <g class="bd-drop">
      <image class="bd-bulb" href="${bulbSprite}" width="17" height="64" preserveAspectRatio="xMidYMid meet"/>
    </g>`;
  return svg;
}

/** Tapered trail: hairline at the top, swelling to kiss the drop.
 *  (kept as the drawn fallback — the video drip rides now) */
// eslint-disable-next-line no-unused-vars
function trailPath(toY) {
  if (toY <= 2) return "";
  const cx = W / 2;
  const wTop = 0.7,
    wBot = 2.6;
  return (
    `M${cx - wTop} 0 L${cx + wTop} 0 ` +
    `C${cx + wTop} ${toY * 0.4} ${cx + wBot} ${toY * 0.75} ${cx + wBot} ${toY} ` +
    `L${cx - wBot} ${toY} ` +
    `C${cx - wBot} ${toY * 0.75} ${cx - wTop} ${toY * 0.4} ${cx - wTop} 0 Z`
  );
}

function update(el) {
  const s = el.__bloodScroll;
  if (!s) return;
  // Vue patches sibling views onto the SAME element and rewrites its class
  // attribute — re-assert the runtime class every pass
  el.classList.add("blooddrip-host");
  const maxScroll = el.scrollHeight - el.clientHeight;
  if (maxScroll <= 4) {
    s.track.style.display = "none";
    return;
  }
  s.track.style.display = "";
  s.track.style.top = el.offsetTop + "px";
  // the lane sits just inside the host's right edge; the drip centres in it
  s.track.style.left = el.offsetLeft + el.clientWidth - LANE - 2 + "px";
  s.track.style.height = el.clientHeight + "px";
  s.svg.setAttribute("height", el.clientHeight);

  const K = dripKnobs;
  // dy lifts the bulb (trail alignment) — the travel compensates so the
  // bulb's tip still reaches the track bottom at full scroll
  const travel = el.clientHeight - K.h - K.dy;
  const y = (el.scrollTop / maxScroll) * travel;

  // liquid: velocity stretches the drop; it relaxes back round
  const now = performance.now();
  if (s.lastT) {
    const v = Math.abs(el.scrollTop - s.lastTop) / Math.max(1, now - s.lastT);
    s.stretch = Math.min(1.45, Math.max(s.stretch * 0.86, 1 + v * 0.35));
  }
  s.lastTop = el.scrollTop;
  s.lastT = now;
  const sy = s.stretch;
  const sx = 1 / Math.sqrt(sy);

  s.bulb.setAttribute("width", K.w);
  s.bulb.setAttribute("height", K.h);
  // the image centres on the group origin, so the velocity scale is
  // symmetric — the bulb never drifts sideways while scrolling
  s.bulb.setAttribute("x", -K.w / 2);
  s.drop.setAttribute(
    "transform",
    `translate(${W / 2 + K.dx + K.bx} ${y + K.dy}) scale(${sx} ${sy})`
  );
  // the VIDEO drip is the trail — stretched from the top to the drop's crown
  s.trail.setAttribute("x", W / 2 - K.trailW / 2 + K.dx);
  s.trail.setAttribute("width", K.trailW);
  s.trail.setAttribute("height", Math.max(0, y + K.overlap));

  // dried beads appear where the drop has passed (seeded, stable spots)
  let beads = "";
  for (let i = 0; i < s.beadSeeds.length; i++) {
    const b = s.beadSeeds[i];
    const by = b.f * travel;
    if (by < y - K.h * 0.4) {
      beads += `<circle cx="${W / 2 + b.dx}" cy="${by}" r="${b.r}" opacity="0.55"/>`;
    }
  }
  s.beads.innerHTML = beads;
}

export default {
  inserted(el) {
    el.classList.add("blooddrip-host");
    el.__prevPadRight = el.style.paddingRight;
    el.style.paddingRight = LANE + "px";
    const wrap = el.parentElement;
    if (wrap && getComputedStyle(wrap).position === "static")
      wrap.style.position = "relative";

    const track = document.createElement("div");
    track.className = "blooddrip-track";
    const id = ++uid;
    const svg = makeSvg(id);
    track.appendChild(svg);
    wrap.appendChild(track);

    // stable per-instance bead spots (no Math.random at render time —
    // deterministic from the instance id)
    const beadSeeds = [];
    for (let i = 0; i < 5; i++) {
      const h = ((id * 7 + i * 131) % 97) / 97;
      beadSeeds.push({
        f: 0.12 + 0.8 * h,
        dx: ((i % 3) - 1) * 2.2,
        r: 1 + ((i * 37) % 10) / 9
      });
    }

    el.__bloodScroll = {
      track,
      svg,
      drop: svg.querySelector(".bd-drop"),
      bulb: svg.querySelector(".bd-bulb"),
      trail: svg.querySelector(".bd-trail"),
      beads: svg.querySelector(".bd-beads"),
      stretch: 1,
      lastTop: 0,
      lastT: 0,
      beadSeeds
    };

    const onScroll = () => update(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("golem-drip-update", onScroll);
    const ro = new ResizeObserver(() => update(el));
    ro.observe(el);

    // the drop drags — the track takes the pointer only over the drop lane
    track.style.pointerEvents = "none";
    const hit = document.createElement("div");
    hit.className = "blooddrip-hit";
    // `touch-action: none` is what stops the browser deciding, mid-drag, that
    // this gesture was really a scroll: without it the drag dies on a
    // `pointercancel` that the old handler never listened for.
    // THE GRAB STRIP COVERS THE RESERVED LANE, AND NOT A PIXEL MORE.
    //
    // It used to be `right: 0; width: LANE + 4`, anchored to the track's
    // right edge — and because the track itself is planted 2px inside the
    // lane, that put 16px of invisible, always-on grab area INSIDE the
    // host's content column. Measured at 1920×1080 (FT-882,
    // 2026-08-19-drip-overlap.mjs): the ul's text ended at x1162.7 and this
    // strip started at x1146.4, so the right-most control on a row —
    // whatever it happened to be — took its clicks on the scrollbar
    // instead of on itself. It was found by a delete button that would not
    // fire; the night sheet's false-info checkbox was already within a
    // pixel or two of the same fate, and every other scrolling list in the
    // app carried the same dead strip.
    //
    // `left: 2px` is measured off the track's own placement above
    // (offsetLeft + clientWidth − LANE − 2), so the strip starts exactly at
    // the content edge and runs the full width of the padding the host
    // reserved for it.
    hit.style.cssText = `position:absolute;left:2px;top:0;width:${LANE}px;height:100%;pointer-events:auto;cursor:grab;touch-action:none;`;
    track.appendChild(hit);

    // A COARSE POINTER MUST NOT MEET THIS STRIP AT ALL.
    //
    // It is 34px of always-on hit area pinned to the right edge of every
    // scrolling list in the app — the grimoire drawer's role list is 250px
    // wide, so the strip owns its right-hand seventh. On a mouse that is a
    // scrollbar. Under a thumb it is a trap: the handler seeks on pointerDOWN,
    // so beginning an ordinary swipe anywhere near the right edge did not
    // scroll the list, it teleported it to wherever the finger happened to
    // land — and right-edge is where a right-handed thumb naturally starts.
    //
    // A touch user loses nothing by its absence: dragging the list itself is
    // the native gesture, and the drip still rides along, because it animates
    // off the host's `scroll` event and does not care what caused it.
    const coarse =
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (coarse) hit.style.pointerEvents = "none";

    hit.addEventListener("pointerdown", e => {
      e.preventDefault();
      hit.setPointerCapture(e.pointerId);
      hit.style.cursor = "grabbing";
      const rect = track.getBoundingClientRect();
      const maxScroll = el.scrollHeight - el.clientHeight;
      const travel = el.clientHeight - dripKnobs.h - dripKnobs.dy;
      const seek = ev => {
        const y = ev.clientY - rect.top - dripKnobs.h / 2;
        el.scrollTop = Math.max(0, Math.min(1, y / travel)) * maxScroll;
      };
      seek(e);
      const onMove = ev => seek(ev);
      const onUp = () => {
        hit.style.cursor = "grab";
        hit.removeEventListener("pointermove", onMove);
        hit.removeEventListener("pointerup", onUp);
        hit.removeEventListener("pointercancel", onUp);
      };
      hit.addEventListener("pointermove", onMove);
      hit.addEventListener("pointerup", onUp);
      // a cancelled gesture fires no pointerup at all — without this the move
      // handler outlived the drag and every later scroll kept seeking
      hit.addEventListener("pointercancel", onUp);
    });

    el.__bloodScroll.cleanup = () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("golem-drip-update", onScroll);
      ro.disconnect();
      track.remove();
    };

    // the ease-back needs a few relax frames after scrolling stops
    const relax = () => {
      const st = el.__bloodScroll;
      if (!st) return;
      if (st.stretch > 1.005) update(el);
      st.raf = requestAnimationFrame(relax);
    };
    el.__bloodScroll.raf = requestAnimationFrame(relax);

    update(el);
  },
  componentUpdated(el) {
    requestAnimationFrame(() => update(el));
  },
  unbind(el) {
    if (el.__bloodScroll) {
      cancelAnimationFrame(el.__bloodScroll.raf);
      el.__bloodScroll.cleanup();
      delete el.__bloodScroll;
    }
    el.style.paddingRight = el.__prevPadRight || "";
  }
};
