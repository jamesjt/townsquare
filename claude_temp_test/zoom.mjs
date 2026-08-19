import { chromium } from "@playwright/test";
import { readFileSync } from "fs";

const url = process.argv[2] || "http://localhost:8141/";
const viewport = process.argv[3] === "phone"
  ? { width: 375, height: 812 }
  : { width: 1280, height: 800 };
const editionMode = process.argv[5] || "tb";
const outPath = process.argv[4] || "claude_temp_test/2026-08-18-ft875-shots/zoom.png";

const roles = JSON.parse(readFileSync(new URL("./tb-roles.json", import.meta.url)));

const squareLogoDataUri =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">' +
      '<rect width="400" height="400" fill="#7a1f1f"/>' +
      '<rect x="20" y="20" width="360" height="360" fill="none" stroke="#e0b45f" stroke-width="16"/>' +
      '</svg>'
  ).toString("base64");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport, deviceScaleFactor: 3 });
await page.goto(url, { waitUntil: "networkidle" });

await page.evaluate(({ roles, editionMode, squareLogoDataUri }) => {
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
  if (editionMode === "custom-wide") {
    store.commit("setEdition", { id: "custom", name: "Custom Script", isOfficial: false, roles: [] });
  } else if (editionMode === "custom-square") {
    store.commit("setEdition", {
      id: "custom",
      name: "Custom Script",
      isOfficial: false,
      roles: [],
      logo: squareLogoDataUri
    });
    store.state.grimoire.isImageOptIn = true;
  }
}, { roles, editionMode, squareLogoDataUri });

await page.waitForTimeout(500);

const box = await page.evaluate(() => {
  const info = document.querySelector(".info").getBoundingClientRect();
  const edition = document.querySelector(".info li.edition").getBoundingClientRect();
  const top = Math.min(info.top, edition.top) - 20;
  const bottom = Math.max(info.bottom, edition.bottom) + 60;
  const left = Math.min(info.left, edition.left) - 20;
  const right = Math.max(info.right, edition.right) + 20;
  return { x: left, y: top, width: right - left, height: bottom - top };
});

await page.screenshot({ path: outPath, clip: box });
await browser.close();
