// Etapas do reflexo do piso no recorte das lamelas refletidas: bruto, filtrado, composto sem
// destaques e resultado. Uso: node scripts/floor-stages.mjs [forma] [prefixo]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [forma = "blender2-v23r", prefix = "piso-etapas"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const clip = { x: 1000, y: 660, width: 600, height: 150 };
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const shots = [];
for (const [label, q] of [["A · bruto", "pisodebug"], ["B · filtrado", "pisodebug=filtrado"], ["C · composto sem destaques", "pisodebug=semhl"], ["D · resultado", ""]]) {
  const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
  await p.goto(`http://localhost:3100/?debug&onda=0&forma=${forma}&${q}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  await p.waitForFunction(() => [...document.querySelectorAll('img[class*="poster"]')].every((el) => parseFloat(getComputedStyle(el).opacity) < 0.01), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1200);
  shots.push([label, await p.screenshot({ clip })]);
  await p.close();
}
const s = await b.newPage({ viewport: { width: 1200, height: 400 } });
await s.setContent(`<body style="margin:0;background:#000;font:13px monospace;color:#fff">${shots.map(([l, buf]) => `<figure style="margin:0 0 4px;position:relative"><img src="data:image/png;base64,${buf.toString("base64")}" style="width:1200px;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${l}</figcaption></figure>`).join("")}</body>`);
await s.waitForTimeout(300);
await s.screenshot({ path: out(`${prefix}.png`), fullPage: true });
await b.close();
console.log(out(`${prefix}.png`));
