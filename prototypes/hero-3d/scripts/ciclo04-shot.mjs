// Ciclo 04 (escultura): captura da cena 1440×900 em DPR 2, congelada (ondas, ambiente), sem a
// interface — para recortes diagnósticos da escultura. Uso:
// node scripts/ciclo04-shot.mjs <nome> "<query>" [fase da onda 0..1]   → captures/ciclo04/<nome>.png
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [name, q = "forma=blender2-v23", lap = "0.62"] = process.argv.slice(2);
const dir = fileURLToPath(new URL("../captures/ciclo04/", import.meta.url));
await mkdir(dir, { recursive: true });
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: Number(process.env.DPR ?? 2) });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
await p.goto(`http://localhost:3100/?debug&${q}`, { waitUntil: "networkidle", timeout: 90000 });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
// Sem interface: só a cena (o texto atrapalharia os recortes da escultura).
await p.addStyleTag({ content: "output{display:none!important} section[aria-labelledby] > *:not([data-status]){visibility:hidden!important} section[aria-labelledby]::before{display:none!important}" });
await p.waitForTimeout(1500);
await p.evaluate((l) => { const f = window.__fiorbe; f?.freeze(true); f?.holdWaves(true); f?.seekLap(l); }, Number(lap));
await p.waitForTimeout(800);
await p.screenshot({ path: `${dir}${name}.png` });
console.log(name, errors.length ? errors : "sem erros");
await b.close();
