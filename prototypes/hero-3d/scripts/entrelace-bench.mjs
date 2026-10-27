// ENT-003: só o custo de GPU sincronizado (bench do motor), várias variantes alternadas na mesma
// sessão do navegador. Uso: node scripts/entrelace-bench.mjs [LxA] [dpr] "rota?q|rota?q|..." [rodadas]
import { chromium } from "playwright-core";
const [vp = "1440x900", dprS = "1", list = "/|/editorial/entrelace-v3", roundsS = "2"] = process.argv.slice(2);
const [w, h] = vp.split("x").map(Number);
const base = (process.env.BASE ?? "http://localhost:3110").replace(/\/$/, "");
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const res = {};
for (let r = 0; r < Number(roundsS); r++) {
  for (const v of list.split("|")) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: Number(dprS) });
    const url = `${base}${v}${v.includes("?") ? "&" : "?"}debug`;
    await p.goto(url, { waitUntil: "networkidle", timeout: 120000 });
    await p.waitForSelector('canvas[data-status="live"]', { timeout: 90000 });
    await p.waitForTimeout(2000);
    const ms = await p.evaluate(() => { window.__fiorbe.holdWaves(true); window.__fiorbe.bench(30); return [window.__fiorbe.bench(90), window.__fiorbe.bench(90)]; });
    (res[v] ??= []).push(...ms.map((x) => x.msPerFrame));
    res[v].dpr = ms[0].dpr;
    await p.close();
  }
}
for (const v in res) console.log(`${v.padEnd(48)} ${res[v].join(" / ")} ms  (dpr ${res[v].dpr})`);
await b.close();
