import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })).newPage();
await p.goto("http://127.0.0.1:8153/", { waitUntil: "networkidle" });
await p.waitForTimeout(1600);
await p.evaluate(() => document.querySelector("#app").classList.remove("booting"));
await p.screenshot({ path: "claude_temp_test/2026-08-19-caps-insitu.png", clip: { x: 380, y: 60, width: 520, height: 520 } });
await b.close();
console.log("shot");
