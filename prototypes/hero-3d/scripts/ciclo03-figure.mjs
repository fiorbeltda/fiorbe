// Ciclo 03 (figura humana): close da figura em DPR 2 — cena congelada (ondas e ambiente), recorte
// calculado pela posição projetada da figura (cabeça → reflexo). Também mede a altura da figura na tela.
// Uso: node scripts/ciclo03-figure.mjs <prefixo> [query]   (VIEWS=1440x900,... opcional)
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [prefix = "antes", q = "forma=blender2-v23"] = process.argv.slice(2);
const dir = fileURLToPath(new URL(`../captures/${process.env.CAPDIR ?? "ciclo03"}/`, import.meta.url));
await mkdir(dir, { recursive: true });
const views = (process.env.VIEWS ?? "1440x900,1280x800,1100x800,940x900").split(",").map((v) => v.split("x").map(Number));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const report = {};
for (const [w, h] of views) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  await p.goto(`http://localhost:3100/?debug&${q}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  await p.addStyleTag({ content: "output{display:none!important}" });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const f = window.__fiorbe; f?.freeze(true); f?.holdWaves(true); f?.seekLap(0.62); });
  await p.waitForTimeout(700);
  const s = await p.evaluate(() => window.__fiorbe.figureToScreen());
  const feetY = Math.max(s.footL[1], s.footR[1]);
  const fh = feetY - s.head[1];
  const cx = (s.footL[0] + s.footR[0] + s.head[0]) / 3;
  const top = s.head[1] - fh * 0.45;
  const clip = { x: Math.max(0, cx - fh * 1.1), y: Math.max(0, top), width: Math.min(w, fh * 2.2), height: Math.min(h - top, fh * 2.6) };
  await p.screenshot({ path: `${dir}${prefix}-fig-${w}x${h}.png`, clip });
  report[`${w}x${h}`] = { alturaFiguraPx: Math.round(fh), clip: Object.values(clip).map(Math.round), erros: errors };
  await p.close();
  console.log(`${w}x${h}`, JSON.stringify(report[`${w}x${h}`]));
}
await writeFile(`${dir}${prefix}-fig-medidas.json`, JSON.stringify(report, null, 2));
await b.close();
