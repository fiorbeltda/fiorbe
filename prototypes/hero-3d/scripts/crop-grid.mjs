// Recorte ampliado de uma imagem 1672 px de largura, com grade de coordenadas opcional.
// Uso: node scripts/crop-grid.mjs <imagem> <saida.png> x y w h [escala] [passo da grade]
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
const [src, out, x, y, w, h, scale = "1", grid = "0"] = process.argv.slice(2);
const data = `data:image/png;base64,${(await readFile(src)).toString("base64")}`;
const S = Number(scale);
let lines = "";
if (grid !== "0") {
  const g = Number(grid);
  for (let gx = Math.ceil(x / g) * g; gx < +x + +w; gx += g) lines += `<div style="position:absolute;left:${(gx - x) * S}px;top:0;bottom:0;border-left:1px solid #ff04;font:11px monospace;color:#ff0">${gx}</div>`;
  for (let gy = Math.ceil(y / g) * g; gy < +y + +h; gy += g) lines += `<div style="position:absolute;top:${(gy - y) * S}px;left:0;right:0;border-top:1px solid #ff04;font:11px monospace;color:#ff0">${gy}</div>`;
}
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: Math.round(w * S), height: Math.round(h * S) } });
await p.setContent(`<body style="margin:0;position:relative;width:${w * S}px;height:${h * S}px;background:url(${data}) -${x * S}px -${y * S}px / ${1672 * S}px auto no-repeat">${lines}</body>`);
await p.waitForTimeout(300);
await p.screenshot({ path: out }).catch(async () => { await p.waitForTimeout(800); await p.screenshot({ path: out }); });
await b.close();
