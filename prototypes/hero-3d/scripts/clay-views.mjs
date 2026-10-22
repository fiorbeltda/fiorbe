// Mesma escultura em argila (sem onda) na câmera principal e em 3 ângulos; e o material final.
// Uso: node scripts/clay-views.mjs <prefixo>   → captures/<prefixo>-<vista>.jpg
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
const [prefix = "v3"] = process.argv.slice(2);
const views = [
  ["principal", "clay"],
  ["giro+35", "clay&pose=0,0.6,0"],
  ["giro-35", "clay&pose=0,-0.6,0"],
  ["alto", "clay&pose=0.45,0.2,0"],
  ["material", ""],
];
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
for (const [name, q] of views) {
  const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`http://localhost:3100/?debug&onda=0&${q}`, { waitUntil: "networkidle" });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 30000 });
  await p.waitForTimeout(1500);
  const buf = await p.screenshot({ type: "jpeg", quality: 88, clip: { x: 600, y: 60, width: 1072, height: 680 } });
  await writeFile(fileURLToPath(new URL(`../captures/${prefix}-${name}.jpg`, import.meta.url)), buf);
  await p.close();
}
await b.close();
console.log(prefix, errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
