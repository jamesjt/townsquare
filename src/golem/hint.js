/**
 * Golem fork (FT-847): a tiny transient hint — the least-intrusive way to say
 * "saved to <town>" from anywhere (modal open or not). Inline-styled so no
 * global stylesheet is touched; auto-removes itself.
 */
export function flashHint(text) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = [
    "position:fixed",
    "bottom:26px",
    "left:50%",
    "transform:translateX(-50%)",
    "background:rgba(0,0,0,0.85)",
    "color:#fff",
    "padding:8px 18px",
    "border:2px solid #400",
    "border-radius:8px",
    "box-shadow:0 0 8px black",
    "z-index:100",
    "font-size:14px",
    "pointer-events:none",
    "opacity:0",
    "transition:opacity 300ms"
  ].join(";");
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = "1";
  });
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 400);
  }, 2600);
}
