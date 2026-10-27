// ENT-003: tempos de quadro REAIS (rAF) por cenário + GPU sincronizada (bench), por ROTA e DPR —
// mesmo método de validacao-perf.mjs, para comparar "/" (Hero atual) × "/editorial/entrelace-v3".
// Uso: node scripts/entrelace-perf.mjs <rota> [LxA] [dpr] [query extra]
//   ex.: node scripts/entrelace-perf.mjs /editorial/entrelace-v3 1440x900 1
import { chromium } from "playwright-core";
const [route = "/", vp = "1440x900", dprArg = "1", extra = ""] = process.argv.slice(2);
const [w, h] = vp.split("x").map(Number);
const dpr = Number(dprArg);
const base = (process.env.BASE ?? "http://localhost:3100").replace(/\/$/, "");
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-precise-memory-info"] });
const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const t0 = Date.now();
await p.goto(`${base}${route}?debug${extra ? `&${extra}` : ""}`, { waitUntil: "networkidle", timeout: 120000 });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
const load = Date.now() - t0;
await p.waitForTimeout(2500);
const sample = (secs) => p.evaluate((s) => new Promise((res) => {
  const d = []; let last = performance.now(); const end = last + s * 1000;
  const f = (t) => { d.push(t - last); last = t; if (t < end) requestAnimationFrame(f); else res(d.slice(2)); };
  requestAnimationFrame(f);
}), secs);
const stats = (d) => {
  const s = [...d].sort((a, b) => a - b); const q = (x) => s[Math.min(s.length - 1, Math.floor(x * s.length))];
  const pct = (lim) => ((d.filter((v) => v > lim).length / d.length) * 100).toFixed(1);
  const fps = (1000 / (d.reduce((a, v) => a + v, 0) / d.length)).toFixed(0);
  return `med ${q(0.5).toFixed(1)} · p95 ${q(0.95).toFixed(1)} · ${fps} fps · >16,7: ${pct(18)}% · >33,3: ${pct(34)}% · máx ${s.at(-1).toFixed(0)} ms (${d.length})`;
};
// Ponto sobre a escultura nas duas composições (centro-direita do palco).
const sx = Math.round(w * 0.66), sy = Math.round(h * 0.45);
const res = {};
res["idle+onda"] = stats(await sample(5));
const cursor = sample(4);
for (let i = 0; i < 24; i++) await p.mouse.move(sx - 120 + (i % 6) * 60, sy - 80 + (i % 4) * 50, { steps: 4 });
res["cursor"] = stats(await cursor);
await p.mouse.move(sx, sy); await p.mouse.down();
const drag = sample(3);
for (let i = 0; i < 12; i++) await p.mouse.move(sx + (i % 2 ? 160 : -60), sy, { steps: 6 });
await p.mouse.up();
res["arraste"] = stats(await drag);
await p.mouse.move(5, 5);
const scroll = sample(4);
for (let i = 0; i < 16; i++) { await p.mouse.wheel(0, i < 8 ? 120 : -120); await p.waitForTimeout(120); }
res["rolagem"] = stats(await scroll);
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1200);
await p.getByRole("button", { name: /movimento/ }).click();
res["pausado"] = stats(await sample(3));
await p.getByRole("button", { name: /movimento/ }).click();
const bench = await p.evaluate(() => { window.__fiorbe.holdWaves(true); return [window.__fiorbe.bench(90), window.__fiorbe.bench(90)]; });
const mem = await p.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
const gpu = bench.map((x) => x.msPerFrame).join(" / ");
console.log(`${route} ${vp} dpr ${dpr} · carga ${load} ms · heap JS ${mem} MB · GPU sincronizada ${gpu} ms (tier ${bench[0].tier}, dpr real ${bench[0].dpr}, ${bench[0].triangles} tri, ${bench[0].calls} draw calls) · erros ${errors.length}`);
for (const k in res) console.log(`  ${k.padEnd(10)} ${res[k]}`);
if (errors.length) console.log("  erros:", errors.slice(0, 5));
await b.close();
