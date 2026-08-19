import { chromium } from "@playwright/test";
import { readFileSync } from "fs";

const url = process.argv[2] || "http://localhost:8141/";
const viewport = process.argv[3] === "phone"
  ? { width: 375, height: 812 }
  : { width: 1280, height: 800 };

const roles = JSON.parse(readFileSync(new URL("./tb-roles.json", import.meta.url)));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport });
await page.goto(url, { waitUntil: "networkidle" });

await page.evaluate((roles) => {
  const store = document.querySelector("#app").__vue__.$store;
  const names = ["Alice", "Bea", "Cyd", "Dee", "Eve", "Fay", "Gus"];
  names.forEach(n => store.commit("players/add", n));
  roles.forEach((role, i) => {
    store.commit("players/update", {
      player: store.state.players.players[i],
      property: "role",
      value: role
    });
  });
}, roles);

await page.waitForTimeout(500);

const data = await page.evaluate(() => {
  const info = document.querySelector(".info").getBoundingClientRect();
  const players = [...document.querySelectorAll(".player")].map((el, i) => {
    const r = el.getBoundingClientRect();
    return { i, top: r.top, bottom: r.bottom, left: r.left, right: r.right, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  return { info: { top: info.top, bottom: info.bottom, left: info.left, right: info.right }, players };
});
console.log(JSON.stringify(data, null, 2));

await browser.close();
