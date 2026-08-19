import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 3 })).newPage();
await p.goto("http://127.0.0.1:8145/", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector("#app").classList.remove("booting"));
await p.evaluate(async () => {
  const s = document.querySelector("#app").__vue__.$store;
  s.commit("session/setSpectator", false);
  s.commit("players/clear");
  for (let i = 0; i < 7; i++) s.commit("players/add", "P" + i);
  s.commit("toggleModal", "scriptDrawer");
  await new Promise(z => setTimeout(z, 900));
});
const el = await p.$(".wb-order") || await p.$(".wb-groups");
if (el) await el.screenshot({ path: "claude_temp_test/2026-08-19-icon-centre.png" });
else await p.screenshot({ path: "claude_temp_test/2026-08-19-icon-centre.png" });
await b.close();
