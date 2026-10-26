// Ciclo 03: figura em movimento real (sem congelar) — closes em DPR 2 a cada segundo, depois
// cursor sobre a escultura, arraste e início da rolagem. Uso: node scripts/ciclo03-motion.mjs <prefixo> [query]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [prefix = "mov", q = "forma=blender2-v23"] = process.argv.slice(2);
const out = fileURLToPath(new URL(`../captures/ciclo03/${prefix}.png`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(`http://localhost:3100/?debug&${q}`, { waitUntil: "networkidle", timeout: 90000 });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
await p.addStyleTag({ content: "output{display:none!important}" });
await p.waitForTimeout(1500);
const s = await p.evaluate(() => window.__fiorbe.figureToScreen());
const fh = Math.max(s.footL[1], s.footR[1]) - s.head[1];
const cx = (s.footL[0] + s.footR[0] + s.head[0]) / 3;
const clip = { x: cx - fh * 0.75, y: s.head[1] - fh * 0.35, width: fh * 1.5, height: fh * 2.3 };
const frames = [];
for (let i = 0; i < 6; i++) { frames.push([`${i} s`, await p.screenshot({ clip })]); await p.waitForTimeout(1000); }
await p.mouse.move(1000, 380, { steps: 8 }); await p.waitForTimeout(300); frames.push(["cursor", await p.screenshot({ clip })]);
await p.mouse.down(); await p.mouse.move(1150, 390, { steps: 8 }); frames.push(["arraste", await p.screenshot({ clip })]);
await p.mouse.up(); await p.waitForTimeout(800); frames.push(["soltou", await p.screenshot({ clip })]);
await p.mouse.move(5, 5); await p.evaluate(() => window.scrollTo(0, 60)); await p.waitForTimeout(900); frames.push(["scroll 60px", await p.screenshot({ clip })]);
const sh = await b.newPage({ viewport: { width: 1200, height: 400 } });
await sh.setContent(`<body style="margin:0;background:#000;color:#fff;font:12px monospace;width:max-content"><div style="display:flex;gap:4px;padding:4px">${frames.map(([l, f]) => `<figure style="margin:0"><figcaption>${l}</figcaption><img src="data:image/png;base64,${f.toString("base64")}" style="width:${Math.round(fh * 1.5 * 1.4)}px;display:block"></figure>`).join("")}</div></body>`);
await sh.waitForTimeout(300);
await sh.screenshot({ path: out, fullPage: true });
console.log(out, errors.length ? errors : "sem erros");
await b.close();
