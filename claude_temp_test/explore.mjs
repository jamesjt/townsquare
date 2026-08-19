import { chromium } from "@playwright/test";
import { readFileSync } from "fs";

const url = process.argv[2] || "http://localhost:8141/";
const viewport = process.argv[3] === "phone"
  ? { width: 375, height: 812 }
  : { width: 1280, height: 800 };
const editionMode = process.argv[5] || "tb"; // tb | custom-wide | custom-square

const roles = JSON.parse(readFileSync(new URL("./tb-roles.json", import.meta.url)));

// a synthetic 1:1 (square) logo, so the edition badge's ART itself is
// square rather than the file-level squareness tb.png/bmr.png/snv.png
// already have — exercises the `edition.logo` + isImageOptIn branch, the
// same branch a real custom-script upload goes through.
const squareLogoDataUri =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">' +
      '<rect width="400" height="400" fill="#7a1f1f"/>' +
      '<rect x="20" y="20" width="360" height="360" fill="none" stroke="#e0b45f" stroke-width="16"/>' +
      '</svg>'
  ).toString("base64");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport });
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

const rects = await page.evaluate(() => {
  const info = document.querySelector(".info");
  const edition = document.querySelector(".info li.edition");
  const phase = document.querySelector(".info li.info-phase");
  const players = document.querySelectorAll(".player");
  const rect = (el) => el ? (({ x, y, width, height, top, left, right, bottom }) => ({ x, y, width, height, top, left, right, bottom }))(el.getBoundingClientRect()) : null;
  const intersects = (a, b) => a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const editionRect = rect(edition);
  const phaseRect = rect(phase);
  return {
    info: rect(info),
    edition: editionRect,
    phase: phaseRect,
    intersectsEditionPhase: intersects(editionRect, phaseRect),
    playerCount: players.length,
  };
});
console.log(JSON.stringify(rects, null, 2));

if (process.argv[4]) {
  await page.screenshot({ path: process.argv[4] });
}

await browser.close();
