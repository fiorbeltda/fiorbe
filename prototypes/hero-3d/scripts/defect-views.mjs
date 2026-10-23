// Diagnóstico das regiões com defeito: mesma câmera (1672×941, DPR 1, onda congelada), cada
// região em várias vistas (metal, sem estrias, argila, normais, faces, wireframe), ampliada.
// Uso: node scripts/defect-views.mjs [forma] [prefixo] [vistas separadas por vírgula]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [forma = "blender2-v23r", prefix = "defeitos", viewList = "metal,semestrias,clay,normais,faces,wire"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
export const REGIONS = {
  "1 borda sup. abertura esq.": { x: 720, y: 330, width: 300, height: 200 },
  "2 vão inferior esq.": { x: 820, y: 420, width: 220, height: 170 },
  "3 redemoinho": { x: 1260, y: 220, width: 360, height: 360 },
};
const query = { metal: "", semestrias: "vista=semestrias", clay: "clay", normais: "vista=normais", faces: "vista=faces", wire: "vista=wire" };
const views = viewList.split(",");
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const shots = {};
for (const v of views) {
  const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
  await p.goto(`http://localhost:3100/?debug&onda=0&forma=${forma}&${query[v]}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  await p.waitForFunction(() => [...document.querySelectorAll('img[class*="poster"]')].every((el) => parseFloat(getComputedStyle(el).opacity) < 0.01), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1200);
  shots[v] = await p.screenshot();
  if (v === "metal") await p.screenshot({ path: out(`${prefix}-cena.png`) });
  await p.close();
}
// Folha: linhas = regiões, colunas = vistas, recortes ampliados (pixels visíveis).
const S = 2.2;
const cell = (buf, r, label) => `<figure style="margin:0;position:relative;width:${r.width * S}px;height:${r.height * S}px;background:url(data:image/png;base64,${buf.toString("base64")}) -${r.x * S}px -${r.y * S}px / ${1672 * S}px auto no-repeat;image-rendering:pixelated"><figcaption style="position:absolute;left:4px;top:4px;background:#000c;padding:1px 5px">${label}</figcaption></figure>`;
const rows = Object.entries(REGIONS).map(([name, r]) => `<div style="display:flex;gap:4px;margin-bottom:4px">${views.map((v) => cell(shots[v], r, `${name} · ${v}`)).join("")}</div>`);
const s = await b.newPage({ viewport: { width: 1200, height: 600 } });
await s.setContent(`<body style="margin:0;background:#000;font:12px monospace;color:#fff;width:max-content">${rows.join("")}</body>`);
await s.waitForTimeout(500);
await s.screenshot({ path: out(`${prefix}-diagnostico.png`), fullPage: true });
await b.close();
console.log(out(`${prefix}-diagnostico.png`));
