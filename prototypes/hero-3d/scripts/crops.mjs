// Recortes ampliados lado a lado (ou empilhados) de várias capturas, mesma região.
// Uso: node scripts/crops.mjs <saida.png> <x,y,w,h> <escala> [--col] <arquivo[=rótulo]> ...   (caminhos relativos a captures/)
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const args = process.argv.slice(2);
const col = args.includes("--col");
const [name, region, scaleS, ...files] = args.filter((a) => a !== "--col");
const [x, y, w, h] = region.split(",").map(Number);
const k = Number(scaleS);
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const cells = await Promise.all(
  files.map(async (spec) => {
    const [f, label = f.split("/").pop()] = spec.split("=");
    const buf = await readFile(cap(f));
    const vw = buf.readUInt32BE(16); // largura do PNG (IHDR)
    return `<figure style="margin:0"><figcaption>${label}</figcaption><div style="width:${w * k}px;height:${h * k}px;background:url(data:image/png;base64,${buf.toString("base64")}) -${x * k}px -${y * k}px / ${vw * k}px auto no-repeat;image-rendering:auto"></div></figure>`;
  }),
);
const html = `<body style="margin:0;background:#000;color:#fff;font:12px ui-monospace,monospace;width:max-content"><div style="display:flex;flex-direction:${col ? "column" : "row"};gap:6px;padding:6px">${cells.join("")}</div></body>`;
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 800, height: 400 } });
await p.setContent(html);
await p.waitForTimeout(300);
await p.screenshot({ path: cap(name), fullPage: true });
await b.close();
console.log(cap(name));
