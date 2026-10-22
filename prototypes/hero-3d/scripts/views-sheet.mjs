// Folha comparativa de vistas: node scripts/views-sheet.mjs <saida> <prefixoA> <prefixoB> [vistas...]
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [out, A, B, ...vs] = process.argv.slice(2);
const views = vs.length ? vs : ["principal", "giro+35", "giro-35", "alto", "material"];
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const img = async (f) => `data:image/jpeg;base64,${(await readFile(cap(f))).toString("base64")}`;
const cells = [];
for (const v of views) for (const p of [A, B]) cells.push(`<figure style="margin:0;position:relative"><img src="${await img(`${p}-${v}.jpg`)}" style="width:100%;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${p} · ${v}</figcaption></figure>`);
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1300, height: 400 } });
await p.setContent(`<body style="margin:0;background:#000;display:grid;grid-template-columns:1fr 1fr;gap:4px;font:14px monospace;color:#fff">${cells.join("")}</body>`);
await p.waitForTimeout(400);
const h = await p.evaluate(() => document.body.scrollHeight);
await p.setViewportSize({ width: 1300, height: h });
await p.screenshot({ path: cap(`${out}.png`) });
await b.close();
console.log(cap(`${out}.png`));
