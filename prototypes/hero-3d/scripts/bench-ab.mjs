// Custo de GPU alternando variantes (reduz o viés de ordem/carga). Uso: node scripts/bench-ab.mjs "q1" "q2" ...
import { chromium } from "playwright-core";
const qs = process.argv.slice(2);
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const res = Object.fromEntries(qs.map((q) => [q, []]));
for (let round = 0; round < 3; round++)
  for (const q of round % 2 ? [...qs].reverse() : qs) {
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(`http://localhost:3100/?debug&${q}`, { waitUntil: "networkidle" });
    await p.waitForSelector('canvas[data-status="live"]', { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => { window.__fiorbe.holdWaves(true); window.__fiorbe.stepWaves(5); });
    res[q].push((await p.evaluate(() => window.__fiorbe.bench(90))).msPerFrame);
    await p.close();
  }
await b.close();
for (const q of qs) console.log(q.padEnd(20), res[q].join(" / "), "ms");
