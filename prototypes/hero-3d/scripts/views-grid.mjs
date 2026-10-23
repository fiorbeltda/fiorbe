// Folha 2×2 das vistas de uma captura clay-views (principal, giros ±35°, alto).
// Uso: node scripts/views-grid.mjs <prefixo> [saida]
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [prefix, out = `${prefix}-vistas`] = process.argv.slice(2);
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const tiles = [];
for (const v of ["principal", "giro+35", "giro-35", "alto"]) {
  tiles.push({ v, src: `data:image/jpeg;base64,${(await readFile(cap(`${prefix}-${v}.jpg`))).toString("base64")}` });
}
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(2,804px);gap:4px;font:14px monospace;color:#fff">${tiles
  .map((t) => `<figure style="margin:0;position:relative"><img src="${t.src}" style="width:804px;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${prefix} · ${t.v}</figcaption></figure>`)
  .join("")}</body>`;
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1612, height: 1024 } });
await p.setContent(html);
await p.waitForTimeout(400);
await p.screenshot({ path: cap(`${out}.png`), fullPage: true }).catch(async () => { await p.waitForTimeout(800); await p.screenshot({ path: cap(`${out}.png`), fullPage: true }); });
await b.close();
console.log(cap(`${out}.png`));
