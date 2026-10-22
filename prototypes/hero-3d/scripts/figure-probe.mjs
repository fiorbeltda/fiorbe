// Mede o idle da figura: deslocamento dos pés (deve ser ~0), da cabeça e do quadril.
// Uso: node scripts/figure-probe.mjs [segundos]
import { chromium } from "playwright-core";
const secs = Number(process.argv[2] ?? 16);
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3100/?debug", { waitUntil: "networkidle" });
await p.waitForSelector('canvas[data-status="live"]');
await p.waitForTimeout(800);
const samples = [];
for (let i = 0; i < secs * 4; i++) {
  samples.push(await p.evaluate(() => window.__fiorbe.figure()));
  await p.waitForTimeout(250);
}
await b.close();
const unit = samples[0].unitPerFigure;
const range = (k, axis) => {
  const v = samples.map((s) => s[k][axis]);
  return (Math.max(...v) - Math.min(...v)) / unit; // em fração da altura da figura
};
const out = {};
for (const k of ["footL", "footR", "hips", "head"]) out[k] = ["x", "y", "z"].map((_, a) => +(range(k, a) * 100).toFixed(3) + "%");
console.log(JSON.stringify({ amostras: samples.length, "variação (% da altura da figura)": out }, null, 1));
