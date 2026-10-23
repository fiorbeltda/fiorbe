// Figura humana em close (DPR 3), em 3 instantes (micro-movimento) + contexto.
// Uso: node scripts/figure-shot.mjs [forma] [prefixo]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [forma = "blender2-v22", prefix = "figura"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 3 });
await p.goto(`http://localhost:3100/?debug&forma=${forma}`, { waitUntil: "networkidle", timeout: 90000 });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
await p.waitForTimeout(3000);
const f = await p.evaluate(() => window.__fiorbe.figure());
console.log(JSON.stringify(f));
const clip = { x: 1500, y: 560, width: 120, height: 150 };
for (const [i, w] of [[0, 0], [1, 1800], [2, 1800]]) {
  await p.waitForTimeout(w);
  await p.screenshot({ path: out(`${prefix}-${i}.png`), clip });
}
await p.screenshot({ path: out(`${prefix}-contexto.png`), clip: { x: 1380, y: 480, width: 292, height: 320 } });
await b.close();
