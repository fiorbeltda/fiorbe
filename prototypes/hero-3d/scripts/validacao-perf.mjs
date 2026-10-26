// Validação final: tempos de quadro REAIS (rAF) por cenário — mediana, p95, p99, % de quadros
// > 20 ms e máximo — mais o custo de GPU sincronizado (bench) e a carga (tempo até o palco, heap).
// Headless Chromium com a GPU real (D3D11). Uso: node scripts/validacao-perf.mjs [query] [LxA]
import { chromium } from "playwright-core";
const [q = "forma=blender2-v23", vp = "1440x900"] = process.argv.slice(2);
const [w, h] = vp.split("x").map(Number);
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-precise-memory-info"] });
const p = await b.newPage({ viewport: { width: w, height: h } });
const t0 = Date.now();
await p.goto(`http://localhost:3100/?debug&${q}`, { waitUntil: "networkidle", timeout: 120000 });
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
  // Com vsync a 60 Hz um quadro "perdido" mede ~33,3 ms: > 16,7 (com folga de jitter: > 18) e > 33,3 (> 34).
  const pct = (lim) => ((d.filter((v) => v > lim).length / d.length) * 100).toFixed(1);
  return `med ${q(0.5).toFixed(1)} · p95 ${q(0.95).toFixed(1)} · >16,7: ${pct(18)}% · >33,3: ${pct(34)}% · máx ${s.at(-1).toFixed(0)} ms (${d.length} quadros)`;
};
const res = {};
res["idle+onda"] = stats(await sample(5));
const cursor = sample(4);
for (let i = 0; i < 24; i++) { await p.mouse.move(900 + (i % 6) * 70, 300 + (i % 4) * 60, { steps: 4 }); }
res["cursor"] = stats(await cursor);
await p.mouse.move(1000, 400); await p.mouse.down();
const drag = sample(3);
for (let i = 0; i < 12; i++) await p.mouse.move(1000 + ((i % 2) ? 160 : -60), 400, { steps: 6 });
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
const bench = await p.evaluate(() => { window.__fiorbe.holdWaves(true); return window.__fiorbe.bench(90); });
const mem = await p.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
console.log(`${q} ${vp} · carga ${load} ms · heap JS ${mem} MB · GPU sincronizada ${bench.msPerFrame} ms (tier ${bench.tier}, dpr ${bench.dpr}, ${bench.triangles} tri, ${bench.calls} draw calls)`);
for (const k in res) console.log(`  ${k.padEnd(10)} ${res[k]}`);
await b.close();
