// FT-1054 proof rig — the sound rows align: sun for the dawn, bell for the
// call, the volume dials retire.
//
// Single host client against the fork's dev server. No audio server or
// second client needed — the checks are about the PANEL (two rows merged
// into one, icons swapped, volume UI gone) and that a click still previews
// (HTMLMediaElement.play() called), not the multiplayer wire.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "2026-08-22-ft1054-shots");
mkdirSync(OUT, { recursive: true });

const APP = process.argv[2] || "http://localhost:8393/";
const TOWN = "ft1054proof";

const browser = await chromium.launch({
  args: ["--autoplay-policy=no-user-gesture-required"],
});

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
  if (!ok) failures++;
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  window.__plays = window.__plays || [];
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    window.__plays.push({ src: this.currentSrc || this.src, muted: this.muted });
    return orig.apply(this, arguments);
  };
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
await page.goto(APP, { waitUntil: "networkidle" });
await page.evaluate(
  ({ town }) => {
    const store = document.querySelector("#app").__vue__.$store;
    localStorage.clear();
    store.commit("session/setSpectator", false);
    store.commit("session/setSessionId", town);
  },
  { town: TOWN },
);

const bellSeg = 'span[aria-label="Which bell"]';
await page.waitForSelector(bellSeg, { timeout: 20000 });
await page.waitForTimeout(800);

// ── (1) the two sound rows sit in ONE .tw-row, side by side ───────────────
const layout = await page.evaluate(() => {
  const dayLead = document
    .querySelector('span[aria-label="Day-start bell"]')
    ?.closest(".tw-lead");
  const callLead = document
    .querySelector('span[aria-label="Call-back voice"]')
    ?.closest(".tw-lead");
  return {
    sameRow: !!dayLead && !!callLead && dayLead.parentElement === callLead.parentElement,
    dayIcon: dayLead?.querySelector(".row-mark-fa")?.getAttribute("data-icon"),
    callIcon: callLead?.querySelector(".row-mark-fa")?.getAttribute("data-icon"),
  };
});
check(
  "the day-start and call-back clusters share one row",
  layout.sameRow,
  JSON.stringify(layout),
);
check("day-start row now leads with the SUN", layout.dayIcon === "sun", layout.dayIcon);
check("call-back row now leads with the BELL", layout.callIcon === "bell", layout.callIcon);

// ── (2) the volume scrub + speaker preview button are GONE ────────────────
const goneCheck = await page.evaluate(() => ({
  bellTrail: !!document.querySelector(".tw-bell-trail"),
  volumeIcon: !!document.querySelector('[data-icon="volume-up"]'),
  broadcastIcon: !!document.querySelector('[data-icon="broadcast-tower"]'),
}));
check("the volume scrub / speaker trail is gone from the DOM", !goneCheck.bellTrail, JSON.stringify(goneCheck));
check("no leftover volume-up icon in the panel", !goneCheck.volumeIcon);
check("the broadcast-tower icon no longer appears (bell replaced it)", !goneCheck.broadcastIcon);

await page.screenshot({ path: `${OUT}/01-sound-rows-parallel.png` });

// ── (3) a preview click STILL plays (FT-1045's preview-on-pick survives) ──
await page.click(`${bellSeg} .tw-opt:nth-child(1)`);
await page.waitForTimeout(600);
const plays = await page.evaluate(() => window.__plays.filter((x) => !x.muted));
check(
  "clicking a bell option still calls play() — preview survives the dial's removal",
  plays.length > 0,
  JSON.stringify(plays.map((x) => x.src)),
);
await page.click(`${bellSeg} .tw-opt:nth-child(1)`); // stop it
await page.screenshot({ path: `${OUT}/02-preview-still-plays.png` });

console.log(failures === 0 ? "\nALL PROOFS PASS" : `\n${failures} FAILURE(S)`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
