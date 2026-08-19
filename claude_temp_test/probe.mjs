import { chromium } from "@playwright/test";

const url = process.argv[2] || "http://localhost:8141/";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: "networkidle" });

const info = await page.evaluate(() => {
  const appEl = document.querySelector("#app");
  const vue = appEl && appEl.__vue__;
  return {
    hasVue: !!vue,
    hasStore: !!(vue && vue.$store),
    edition: vue && vue.$store ? vue.$store.state.edition : null,
    playersLen: vue && vue.$store ? vue.$store.state.players.players.length : null,
  };
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
