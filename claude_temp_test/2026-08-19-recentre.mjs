// FT-anon (2026-08-19): recentre-the-clock-face proof rig.
//
// Usage:
//   node claude_temp_test/2026-08-19-recentre.mjs capture before http://localhost:8137/
//   node claude_temp_test/2026-08-19-recentre.mjs capture after  http://localhost:8137/
//   node claude_temp_test/2026-08-19-recentre.mjs compare
//
// "capture" loads the app at three viewports, drops a zero-footprint PROBE
// element that resolves the exact same `50% + coefX*fpx / 50% + coefY*fpx`
// formula the face itself is anchored with (old coefficients for "before":
// 15,-20.5 — new for "after": 0,0), then measures every face-anchored
// element's screen rect, alongside that probe. It writes one JSON file per
// tag under claude_temp_test/2026-08-19-recentre-out/.
//
// "compare" loads both JSON files and prints, per viewport, per element:
// the raw before/after screen position, the position RELATIVE TO THE FACE
// PROBE (before/after), and the delta of the relative position — the number
// that answers "did anything move relative to the face". It also prints the
// probe's own absolute screen delta (expected to be non-zero — see the
// script's own trailing report for why) and the measured cover-fit scale
// before/after (the --fpx-per-1000 ratio), so a scale-drift bug and a
// position bug are never conflated into the same number.

import { chromium } from "@playwright/test";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "2026-08-19-recentre-out");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "375x812", width: 375, height: 812 }
];

// The face-anchor coefficients each tag's SHIPPED CODE actually uses (see
// TownSquare.vue .blood-dial .stain, which is the canonical "this IS the
// face's own centre" anchor in both the old and new coordinate systems).
const FACE_COEF = {
  before: { x: 15, y: -20.5 },
  after: { x: 0, y: 0 }
};

// A fixed, deterministic seat list so the blood-dial's hash-derived
// size/radius/spin come out identical in the before and after runs — any
// on-screen difference is then attributable ONLY to the coordinate change,
// not to different random stains.
const SEAT_NAMES = ["Alice", "Bea", "Cyd", "Dee", "Eve", "Fay", "Gus"];
const DEAD_SEATS = [1, 4]; // Bea and Eve — "a couple of dead seats"

async function probe(page, coefX, coefY) {
  return page.evaluate(
    ({ coefX, coefY }) => {
      const app = document.getElementById("app");
      const el = document.createElement("div");
      el.id = "__face_probe__";
      el.style.position = "absolute";
      el.style.left = `calc(50% + ${coefX} * var(--fpx))`;
      el.style.top = `calc(50% + ${coefY} * var(--fpx))`;
      el.style.width = "0px";
      el.style.height = "0px";
      app.appendChild(el);
      const r = el.getBoundingClientRect();
      el.remove();
      return { x: r.left, y: r.top };
    },
    { coefX, coefY }
  );
}

/** Renders a synthetic 1000-face-px probe box and reads its rendered CSS
 *  width — the actual, browser-computed CSS-px-per-face-px ratio, i.e. what
 *  --fpx resolves to right now, at this viewport. Independent of any
 *  hand math — this is what the browser itself is doing. */
async function measureFpx(page) {
  return page.evaluate(() => {
    const app = document.getElementById("app");
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.left = "0px";
    el.style.top = "0px";
    el.style.width = "calc(1000 * var(--fpx))";
    el.style.height = "0px";
    app.appendChild(el);
    const w = el.getBoundingClientRect().width;
    el.remove();
    return w / 1000;
  });
}

function rectOf(r) {
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2
  };
}

async function captureViewport(browser, url, viewport, tag) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page
    .waitForFunction(
      () => !document.getElementById("app").classList.contains("booting"),
      { timeout: 8000 }
    )
    .catch(() => {});
  await page.waitForTimeout(250);

  const face = await probe(page, FACE_COEF[tag].x, FACE_COEF[tag].y);
  const fpxPx = await measureFpx(page);

  // dial letters (Intro screen, no players yet)
  const dialLetters = await page.evaluate(() => {
    return [...document.querySelectorAll(".dl")].map(el => {
      const cls = [...el.classList].find(c => c.startsWith("dl-"));
      const r = el.getBoundingClientRect();
      return { cls, left: r.left, top: r.top, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    });
  });

  // the intro doors panel
  const doors = await page.evaluate(() => {
    const el = document.querySelector("ul.doors");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });

  // the seat ring's own box centre (sanity check — untouched by this change)
  const circle = await page.evaluate(() => {
    const el = document.querySelector(".circle");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });

  const introShot = path.join(OUT_DIR, `intro-${tag}-${viewport.name}.png`);
  await page.screenshot({ path: introShot });

  // now add a fixed seat list + kill two, to render the blood dial's stains
  await page.evaluate(
    ({ names, dead }) => {
      const store = document.getElementById("app").__vue__.$store;
      names.forEach(n => store.commit("players/add", n));
      dead.forEach(i => {
        const player = store.state.players.players[i];
        store.commit("players/update", { player, property: "isDead", value: true });
      });
    },
    { names: SEAT_NAMES, dead: DEAD_SEATS }
  );
  await page.waitForTimeout(400); // stain-in animation (420ms) settles

  const stains = await page.evaluate(() => {
    return [...document.querySelectorAll(".blood-dial .stain")].map(el => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    });
  });

  const circleWithSeats = await page.evaluate(() => {
    const el = document.querySelector(".circle");
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });

  const stainsShot = path.join(OUT_DIR, `stains-${tag}-${viewport.name}.png`);
  await page.screenshot({ path: stainsShot });

  await page.close();

  return {
    viewport: viewport.name,
    face,
    fpxPx,
    dialLetters,
    doors,
    circle,
    circleWithSeats,
    stains,
    shots: { intro: introShot, stains: stainsShot }
  };
}

async function capture(tag, url) {
  const browser = await chromium.launch();
  const results = [];
  for (const vp of VIEWPORTS) {
    const r = await captureViewport(browser, url, vp, tag);
    results.push(r);
    console.log(`[${tag}] ${vp.name} captured — face=(${r.face.x.toFixed(2)},${r.face.y.toFixed(2)}) fpxPx=${r.fpxPx.toFixed(5)} dialLetters=${r.dialLetters.length} stains=${r.stains.length}`);
  }
  await browser.close();
  const outFile = path.join(OUT_DIR, `${tag}.json`);
  writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`wrote ${outFile}`);
}

function fmt(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function compareSets(label, beforeItems, afterItems, beforeFace, afterFace, keyFn) {
  const rows = [];
  const bMap = new Map(beforeItems.map(i => [keyFn(i), i]));
  const aMap = new Map(afterItems.map(i => [keyFn(i), i]));
  for (const [key, b] of bMap) {
    const a = aMap.get(key);
    if (!a) {
      rows.push({ key, missing: "after" });
      continue;
    }
    const relBX = b.cx - beforeFace.x, relBY = b.cy - beforeFace.y;
    const relAX = a.cx - afterFace.x, relAY = a.cy - afterFace.y;
    rows.push({
      key,
      beforeAbs: `(${fmt(b.cx)},${fmt(b.cy)})`,
      afterAbs: `(${fmt(a.cx)},${fmt(a.cy)})`,
      relBefore: `(${fmt(relBX)},${fmt(relBY)})`,
      relAfter: `(${fmt(relAX)},${fmt(relAY)})`,
      deltaRelX: fmt(relAX - relBX),
      deltaRelY: fmt(relAY - relBY),
      deltaRelMag: fmt(Math.hypot(relAX - relBX, relAY - relBY))
    });
  }
  console.log(`\n-- ${label} --`);
  console.table(rows);
  return rows;
}

function compare() {
  const before = JSON.parse(readFileSync(path.join(OUT_DIR, "before.json")));
  const after = JSON.parse(readFileSync(path.join(OUT_DIR, "after.json")));

  const allDeltas = [];

  for (const vpName of VIEWPORTS.map(v => v.name)) {
    const b = before.find(x => x.viewport === vpName);
    const a = after.find(x => x.viewport === vpName);
    console.log(`\n=====================  ${vpName}  =====================`);
    console.log(
      `face probe ABS   before=(${fmt(b.face.x)},${fmt(b.face.y)})  after=(${fmt(a.face.x)},${fmt(a.face.y)})` +
        `  delta=(${fmt(a.face.x - b.face.x)},${fmt(a.face.y - b.face.y)})`
    );
    console.log(
      `--fpx CSS-px/1000-face-px   before=${fmt(b.fpxPx)}  after=${fmt(a.fpxPx)}` +
        `  ratio=${(a.fpxPx / b.fpxPx).toFixed(5)}  (941/900=${(941 / 900).toFixed(5)})`
    );

    const dl = compareSets("dial letters (rel to face)", b.dialLetters, a.dialLetters, b.face, a.face, x => x.cls);
    allDeltas.push(...dl.map(r => parseFloat(r.deltaRelMag)).filter(n => !isNaN(n)));

    if (b.doors && a.doors) {
      const relBX = b.doors.cx - b.face.x, relBY = b.doors.cy - b.face.y;
      const relAX = a.doors.cx - a.face.x, relAY = a.doors.cy - a.face.y;
      console.log(
        `doors panel  relBefore=(${fmt(relBX)},${fmt(relBY)})  relAfter=(${fmt(relAX)},${fmt(relAY)})` +
          `  deltaRelMag=${fmt(Math.hypot(relAX - relBX, relAY - relBY))}`
      );
      allDeltas.push(Math.hypot(relAX - relBX, relAY - relBY));
    }

    const stainRows = compareSets(
      "blood-dial stains (rel to face, index-matched)",
      b.stains.map((s, i) => ({ ...s, idx: i })),
      a.stains.map((s, i) => ({ ...s, idx: i })),
      b.face,
      a.face,
      x => x.idx
    );
    allDeltas.push(...stainRows.map(r => parseFloat(r.deltaRelMag)).filter(n => !isNaN(n)));

    console.log(
      `seat ring .circle CENTRE (absolute, no face-relative math — should be ~identical, untouched by this change)` +
        `  before=(${fmt(b.circle.cx)},${fmt(b.circle.cy)})  after=(${fmt(a.circle.cx)},${fmt(a.circle.cy)})` +
        `  delta=${fmt(Math.hypot(a.circle.cx - b.circle.cx, a.circle.cy - b.circle.cy))}`
    );
  }

  const max = Math.max(...allDeltas);
  const mean = allDeltas.reduce((s, n) => s + n, 0) / allDeltas.length;
  console.log(`\n=== summary: ${allDeltas.length} relative-position deltas, mean=${fmt(mean)}px max=${fmt(max)}px ===`);
}

const [, , cmd, ...rest] = process.argv;
if (cmd === "capture") {
  const [tag, url] = rest;
  if (!tag || !url) {
    console.error("usage: node 2026-08-19-recentre.mjs capture <before|after> <url>");
    process.exit(1);
  }
  await capture(tag, url);
} else if (cmd === "compare") {
  compare();
} else {
  console.error("usage: node 2026-08-19-recentre.mjs capture <before|after> <url>");
  console.error("       node 2026-08-19-recentre.mjs compare");
  process.exit(1);
}
