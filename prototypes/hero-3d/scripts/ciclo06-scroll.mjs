// Ciclo 06: sequência da transição de rolagem em frações do percurso REAL da timeline
// (régua do manifesto a 38% da altura, como em scrollTimeline.ts). Ondas e ambiente congelados.
// Uso: node scripts/ciclo06-scroll.mjs <prefixo> [query] [LxA]
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [prefix = "antes", q = "forma=blender2-v23", vp = "1440x900"] = process.argv.slice(2);
const [w, h] = vp.split("x").map(Number);
const dir = fileURLToPath(new URL("../captures/ciclo06/", import.meta.url));
await mkdir(dir, { recursive: true });
const STEPS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: w, height: h } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(`${process.env.BASE ?? "http://localhost:3100/"}?debug&${q}`, { waitUntil: "networkidle", timeout: 90000 });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
await p.addStyleTag({ content: "output{display:none!important}" });
await p.waitForTimeout(1200);
await p.evaluate(() => { const f = window.__fiorbe; f?.freeze(true); f?.holdWaves(true); f?.seekLap(0.62); });
const end = await p.evaluate(() => {
  const r = document.getElementById("flow-rule").getBoundingClientRect().top + scrollY;
  return Math.max(1, r - innerHeight * 0.38);
});
const shots = [];
for (const s of STEPS) {
  await p.evaluate((y) => scrollTo(0, y), Math.round(end * s));
  await p.waitForTimeout(1300);
  const buf = await p.screenshot();
  shots.push([`${Math.round(s * 100)}%`, buf]);
}
const sh = await b.newPage({ viewport: { width: 1600, height: 400 } });
await sh.setContent(`<body style="margin:0;background:#000;color:#fff;font:13px monospace;width:max-content"><div style="display:grid;grid-template-columns:repeat(4,${Math.round(w / 3.6)}px);gap:4px;padding:4px">${shots.map(([l, f]) => `<figure style="margin:0"><figcaption>${prefix} · ${l} (${vp})</figcaption><img src="data:image/png;base64,${f.toString("base64")}" style="width:100%;display:block"></figure>`).join("")}</div></body>`);
await sh.waitForTimeout(300);
await sh.screenshot({ path: `${dir}${prefix}-scroll-${vp}.png`, fullPage: true });
console.log(`${prefix}-scroll-${vp}`, "fim da timeline (px):", Math.round(end), errors.length ? errors : "sem erros");
await b.close();
