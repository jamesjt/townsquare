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
import trailSprite from "../assets/blood/drip-trail2.png";

const LANE = 26; // reserved gutter
const W = 18; // svg lane width
const DROP_W = 15;
const DROP_H = 24;

// the teardrop path in a 15x24 box: crown point -> symmetric cubics into
// the bulb -> back up
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
    <g class="bd-drop" shape-rendering="geometricPrecision">
      <path d="${DROP_PATH}" fill="url(#bdg-${id})" stroke="rgba(36,3,3,0.85)" stroke-width="0.6"/>
      <path d="M2.2 18.6 C3.4 21.6 6 23.2 8.6 23.1 C5.2 24.6 1.6 22.4 1.1 19.2 Z"
        fill="rgba(46,4,4,0.5)"/>
      <ellipse cx="4.9" cy="13.6" rx="1.7" ry="2.6" fill="rgba(255,238,230,0.5)"
        transform="rotate(-14 4.9 13.6)"/>
      <circle cx="6.1" cy="9.4" r="0.7" fill="rgba(255,238,230,0.35)"/>
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
  s.track.style.left = el.offsetLeft + el.clientWidth - W - 2 + "px";
  s.track.style.height = el.clientHeight + "px";
  s.svg.setAttribute("height", el.clientHeight);

  const travel = el.clientHeight - DROP_H;
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

  s.drop.setAttribute(
    "transform",
    `translate(${W / 2 - (DROP_W * sx) / 2} ${y}) scale(${sx} ${sy})`
  );
  // the VIDEO drip is the trail — stretched from the top to the drop's crown
  s.trail.setAttribute("height", Math.max(0, y + 6));

  // dried beads appear where the drop has passed (seeded, stable spots)
  let beads = "";
  for (let i = 0; i < s.beadSeeds.length; i++) {
    const b = s.beadSeeds[i];
    const by = b.f * travel;
    if (by < y - DROP_H * 0.4) {
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
      trail: svg.querySelector(".bd-trail"),
      beads: svg.querySelector(".bd-beads"),
      stretch: 1,
      lastTop: 0,
      lastT: 0,
      beadSeeds
    };

    const onScroll = () => update(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => update(el));
    ro.observe(el);

    // the drop drags — the track takes the pointer only over the drop lane
    track.style.pointerEvents = "none";
    const hit = document.createElement("div");
    hit.className = "blooddrip-hit";
    hit.style.cssText = `position:absolute;right:0;top:0;width:${W + 4}px;height:100%;pointer-events:auto;cursor:grab;`;
    track.appendChild(hit);
    hit.addEventListener("pointerdown", e => {
      e.preventDefault();
      hit.setPointerCapture(e.pointerId);
      hit.style.cursor = "grabbing";
      const rect = track.getBoundingClientRect();
      const maxScroll = el.scrollHeight - el.clientHeight;
      const travel = el.clientHeight - DROP_H;
      const seek = ev => {
        const y = ev.clientY - rect.top - DROP_H / 2;
        el.scrollTop = Math.max(0, Math.min(1, y / travel)) * maxScroll;
      };
      seek(e);
      const onMove = ev => seek(ev);
      const onUp = () => {
        hit.style.cursor = "grab";
        hit.removeEventListener("pointermove", onMove);
        hit.removeEventListener("pointerup", onUp);
      };
      hit.addEventListener("pointermove", onMove);
      hit.addEventListener("pointerup", onUp);
    });

    el.__bloodScroll.cleanup = () => {
      el.removeEventListener("scroll", onScroll);
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
