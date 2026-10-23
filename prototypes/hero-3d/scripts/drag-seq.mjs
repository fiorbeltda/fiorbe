// Arraste com peso: puxão rápido de 220 px e soltura; quadros em tempos fixos (atraso inicial,
// inércia, retorno ao enquadramento). Uso: node scripts/drag-seq.mjs [forma] [prefixo]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [forma = "blender2-v22", prefix = "arraste"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
await p.goto(`http://localhost:3100/?debug&onda=0&forma=${forma}`, { waitUntil: "networkidle", timeout: 90000 });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
await p.waitForTimeout(2500);
const clip = { x: 600, y: 60, width: 1072, height: 680 };
const shots = [["repouso", await p.screenshot({ clip, type: "jpeg", quality: 80 })]];
await p.mouse.move(1180, 485, { steps: 3 });
await p.mouse.down();
await p.mouse.move(1400, 485, { steps: 8 });
shots.push(["fim do puxão (peça atrasada)", await p.screenshot({ clip, type: "jpeg", quality: 80 })]);
await p.mouse.up();
for (const [l, w] of [["solto +0,25 s", 250], ["+0,8 s", 550], ["+2 s", 1200], ["+4 s (de volta)", 2000]]) {
  await p.waitForTimeout(w);
  shots.push([l, await p.screenshot({ clip, type: "jpeg", quality: 80 })]);
}
const tiles = shots.map(([l, buf]) => `<figure style="margin:0;position:relative"><img src="data:image/jpeg;base64,${buf.toString("base64")}" style="width:100%;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${l}</figcaption></figure>`);
const s = await b.newPage({ viewport: { width: 1500, height: 600 } });
await s.setContent(`<body style="margin:0;background:#000;font:14px monospace;color:#fff;display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px">${tiles.join("")}</body>`);
await s.waitForTimeout(300);
await s.screenshot({ path: out(`${prefix}-seq.png`), fullPage: true });
await b.close();
console.log(out(`${prefix}-seq.png`));
