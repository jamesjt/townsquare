import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:8393/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  const store = document.querySelector("#app").__vue__.$store;
  localStorage.clear();
  store.commit("session/setSpectator", false);
  store.commit("session/setSessionId", "ft1054crop");
});
await page.waitForSelector('span[aria-label="Which bell"]', { timeout: 20000 });
await page.waitForTimeout(800);
const box = await page.evaluate(() => {
  const row = document.querySelector('span[aria-label="Which bell"]').closest(".row.tw-row");
  const r = row.getBoundingClientRect();
  return { x: r.x, y: r.y, width: r.width, height: r.height };
});
await page.screenshot({
  path: "claude_temp_test/2026-08-22-ft1054-shots/03-sound-row-crop.png",
  clip: { x: box.x - 20, y: box.y - 15, width: box.width + 40, height: box.height + 30 },
});
await browser.close();
