import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 })).newPage();
await page.goto("http://localhost:8393/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  const store = document.querySelector("#app").__vue__.$store;
  localStorage.clear();
  store.commit("session/setSpectator", false);
  store.commit("session/setSessionId", "ft1054crop2");
});
await page.waitForSelector('span[aria-label="Which bell"]', { timeout: 20000 });
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const dayIcon = document.querySelector('span[aria-label="Day-start bell"]').closest(".tw-lead").querySelector(".row-mark-fa");
  const callIcon = document.querySelector('span[aria-label="Call-back voice"]').closest(".tw-lead").querySelector(".row-mark-fa");
  const d = dayIcon.getBoundingClientRect();
  const c = callIcon.getBoundingClientRect();
  return {
    dayIconAttr: dayIcon.getAttribute("data-icon"),
    callIconAttr: callIcon.getAttribute("data-icon"),
    d: { x: d.x, y: d.y, width: d.width, height: d.height },
    c: { x: c.x, y: c.y, width: c.width, height: c.height },
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({
  path: "claude_temp_test/2026-08-22-ft1054-shots/04-day-icon-zoom.png",
  clip: { x: info.d.x - 8, y: info.d.y - 8, width: info.d.width + 16, height: info.d.height + 16 },
});
await page.screenshot({
  path: "claude_temp_test/2026-08-22-ft1054-shots/05-call-icon-zoom.png",
  clip: { x: info.c.x - 8, y: info.c.y - 8, width: info.c.width + 16, height: info.c.height + 16 },
});
await browser.close();
