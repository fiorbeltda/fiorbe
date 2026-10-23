// Capturas do metal (ondas congeladas, 2x): hero, lamelas, coroa, redemoinho e reflexo no piso.
// Uso: node scripts/metal-shots.mjs <prefixo> [query extra]   → captures/<prefixo>-<vista>.png
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [prefix = "metal", extra = ""] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
const shots = [
  ["hero", { x: 0, y: 0, width: 1672, height: 941 }, 1],
  ["lamelas", { x: 650, y: 330, width: 420, height: 300 }, 2],
  ["coroa", { x: 880, y: 80, width: 520, height: 300 }, 2],
  ["redemoinho", { x: 1240, y: 170, width: 460, height: 360 }, 2],
  ["reflexo", { x: 820, y: 640, width: 850, height: 200 }, 2],
];
for (const scale of [1, 2]) {
  const p = await b.newPage({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: scale });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`http://localhost:3100/?forma=${process.env.FORMA ?? "blender2"}&${extra}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  await p.waitForTimeout(1800);
  await p.evaluate(() => { window.__fiorbe?.holdWaves(true); window.__fiorbe?.seekLap(0.62); });
  await p.waitForTimeout(300);
  for (const [name, clip, s] of shots) if (s === scale) await p.screenshot({ path: out(`${prefix}-${name}.png`), clip });
  await p.close();
}
await b.close();
console.log(prefix, errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
