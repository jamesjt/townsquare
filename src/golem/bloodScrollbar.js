// Golem fork: the BLOOD-DRIP overlay scrollbar (v-blood-scroll).
// The native bar had hit its ceiling — a browser thumb is a stretched 8px
// rectangle. This directive hides it and renders the creative director's
// drop art instead: the glossy drop IS the thumb, and the dried-run texture
// grows down the track to the furthest point scrolled. The drop drags;
// everything else stays click-transparent.
import dropSprite from "../assets/blood/drip-drop.png";
import trailTexture from "../assets/blood/drip-trail.png";

const DROP_W = 15; // slimmer — 20px bulged over content (user feedback)
const DROP_H = Math.round((81 / 64) * DROP_W); // sprite ratio (bulb-focused crop)

function update(el) {
  const s = el.__bloodScroll;
  if (!s) return;
  // Vue patches sibling views onto the SAME element and rewrites its class
  // attribute, wiping this runtime class — the native bar came back beside
  // the overlay (the "two scrollbars"). Re-assert it on every update.
  el.classList.add("blooddrip-host");
  const maxScroll = el.scrollHeight - el.clientHeight;
  if (maxScroll <= 4) {
    s.track.style.display = "none";
    return;
  }
  s.track.style.display = "";
  s.track.style.top = el.offsetTop + "px";
  s.track.style.left = el.offsetLeft + el.clientWidth - DROP_W - 2 + "px";
  s.track.style.height = el.clientHeight + "px";
  const travel = el.clientHeight - DROP_H;
  const y = (el.scrollTop / maxScroll) * travel;
  s.drop.style.transform = `translateY(${y}px)`;
  // the run FOLLOWS the drop — scrolling back up wipes it (user call)
  s.trail.style.height = y + DROP_H * 0.5 + "px";
}

export default {
  inserted(el) {
    el.classList.add("blooddrip-host");
    // the overlay needs its own lane — without this it sits on the rows'
    // trailing content (the shelf's checkmarks)
    el.__prevPadRight = el.style.paddingRight;
    el.style.paddingRight = "26px";
    const wrap = el.parentElement;
    if (wrap && getComputedStyle(wrap).position === "static")
      wrap.style.position = "relative";

    const track = document.createElement("div");
    track.className = "blooddrip-track";
    const trail = document.createElement("div");
    trail.className = "blooddrip-trail";
    trail.style.backgroundImage = `url(${trailTexture})`;
    const drop = document.createElement("img");
    drop.className = "blooddrip-drop";
    drop.src = dropSprite;
    drop.draggable = false;
    drop.style.width = DROP_W + "px";
    track.appendChild(trail);
    track.appendChild(drop);
    wrap.appendChild(track);

    el.__bloodScroll = { track, trail, drop };

    const onScroll = () => update(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => update(el));
    ro.observe(el);
    el.__bloodScroll.cleanup = () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      track.remove();
    };

    // drag the drop to scroll
    drop.addEventListener("pointerdown", e => {
      e.preventDefault();
      drop.setPointerCapture(e.pointerId);
      const startY = e.clientY;
      const startTop = el.scrollTop;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const travel = el.clientHeight - DROP_H;
      const onMove = ev => {
        el.scrollTop = startTop + ((ev.clientY - startY) / travel) * maxScroll;
      };
      const onUp = () => {
        drop.removeEventListener("pointermove", onMove);
        drop.removeEventListener("pointerup", onUp);
      };
      drop.addEventListener("pointermove", onMove);
      drop.addEventListener("pointerup", onUp);
    });

    update(el);
  },
  componentUpdated(el) {
    // content changes (filters, script swaps) move the geometry
    requestAnimationFrame(() => update(el));
  },
  unbind(el) {
    if (el.__bloodScroll) {
      el.__bloodScroll.cleanup();
      delete el.__bloodScroll;
    }
    el.style.paddingRight = el.__prevPadRight || "";
  }
};
