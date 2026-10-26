// Ciclo 04: estabilidade temporal da escultura (redemoinho) — quadros em movimento real (onda, figura, cursor
// varrendo a peça e arraste) no recorte do reflexo; mede a variação quadro a quadro só no recorte.
// Uso: node scripts/ciclo04-motion.mjs [query] [prefixo]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [q = "forma=blender2-v23", prefix = "mov"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/ciclo04/${f}`, import.meta.url));
const clip = { x: 1060, y: 250, width: 360, height: 380 };
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`http://localhost:3100/?debug&${q}`, { waitUntil: "networkidle", timeout: 90000 });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
await p.addStyleTag({ content: "output{display:none!important}" });
await p.waitForTimeout(1500);
const frames = [];
const step = async (label) => { frames.push([label, await p.screenshot({ clip })]); };
for (let i = 0; i < 4; i++) { await step(`onda ${i}`); await p.waitForTimeout(250); }
for (let i = 0; i < 4; i++) { await p.mouse.move(900 + i * 90, 380, { steps: 6 }); await p.waitForTimeout(120); await step(`cursor ${i}`); }
await p.mouse.move(1000, 400); await p.mouse.down();
for (let i = 0; i < 3; i++) { await p.mouse.move(1000 + (i + 1) * 70, 400, { steps: 5 }); await step(`arraste ${i}`); }
await p.mouse.up(); await p.waitForTimeout(300); await step("soltou");
// Variação média de pixel entre quadros consecutivos (só o recorte do piso).
const diffs = await p.evaluate(async (bufs) => {
  const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64," + s; });
  const imgs = await Promise.all(bufs.map(load));
  const cv = new OffscreenCanvas(imgs[0].width, imgs[0].height);
  const g = cv.getContext("2d", { willReadFrequently: true });
  const data = imgs.map((im) => { g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; });
  const res = [];
  for (let k = 1; k < data.length; k++) {
    let s = 0, spikes = 0;
    for (let i = 0; i < data[k].length; i += 4) {
      const d = Math.abs(data[k][i] - data[k - 1][i]) + Math.abs(data[k][i + 1] - data[k - 1][i + 1]) + Math.abs(data[k][i + 2] - data[k - 1][i + 2]);
      s += d; if (d > 90) spikes++;
    }
    res.push([Math.round((s / (data[k].length / 4)) * 10) / 10, spikes]);
  }
  return res;
}, frames.map(([, f]) => f.toString("base64")));
const s = await b.newPage({ viewport: { width: 1520, height: 400 } });
await s.setContent(`<body style="margin:0;background:#000;color:#fff;font:12px monospace;width:max-content"><div style="display:flex;flex-wrap:wrap;gap:3px;width:2200px">${frames.map(([l, f], i) => `<figure style="margin:0;position:relative"><img src="data:image/png;base64,${f.toString("base64")}" style="display:block"><figcaption style="position:absolute;left:4px;top:4px;background:#000b;padding:1px 5px">${l}${i ? ` · Δ ${diffs[i - 1][0]} · picos ${diffs[i - 1][1]}` : ""}</figcaption></figure>`).join("")}</div></body>`);
await s.waitForTimeout(300);
await s.screenshot({ path: out(`${prefix}.png`), fullPage: true });
console.log(prefix, JSON.stringify(diffs));
await b.close();
