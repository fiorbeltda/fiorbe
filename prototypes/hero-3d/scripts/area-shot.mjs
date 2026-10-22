// Captura de uma região da cena (ondas congeladas), em 2x. Uso:
// node scripts/area-shot.mjs <saida.png> "<query>" x,y,w,h [larguraViewport=1672] [alturaViewport=941]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [name, q = "", clipS = "600,60,1072,680", vw = "1672", vh = "941"] = process.argv.slice(2);
const [x, y, width, height] = clipS.split(",").map(Number);
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: Number(vw), height: Number(vh) }, deviceScaleFactor: 2 });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(`http://localhost:3100/?debug&${q}`, { waitUntil: "networkidle" });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 30000 });
await p.waitForTimeout(1500);
await p.evaluate(() => { window.__fiorbe?.holdWaves(true); window.__fiorbe?.seekLap(0.62); });
await p.waitForTimeout(300);
const out = fileURLToPath(new URL(`../captures/${name}`, import.meta.url));
await p.screenshot({ path: out, clip: { x, y, width, height } });
await b.close();
console.log(out, errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
