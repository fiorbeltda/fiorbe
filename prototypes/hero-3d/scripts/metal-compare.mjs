// Folha do metal: referência × antes × depois (hero e recortes). Uso: node scripts/metal-compare.mjs <antes> <depois> [saida]
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [before = "m0", after = "m3", name = "metal-comparacao"] = process.argv.slice(2);
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const img = async (f) => `data:image/png;base64,${(await readFile(f)).toString("base64")}`;
const ref = await img(fileURLToPath(new URL("../../../referencias/hero/referencia-hero-v1.png", import.meta.url)));
const tile = (src, label) => `<figure style="margin:0;position:relative"><img src="${src}" style="width:100%;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${label}</figcaption></figure>`;
const rows = [[tile(ref, "referência"), tile(await img(cap(`${after}-hero.png`)), "metal refinado")], [tile(await img(cap(`${before}-hero.png`)), "metal anterior"), tile(await img(cap(`${after}-hero.png`)), "metal refinado")]];
for (const v of ["lamelas", "coroa", "redemoinho", "reflexo"]) rows.push([tile(await img(cap(`${before}-${v}.png`)), `${v} — antes`), tile(await img(cap(`${after}-${v}.png`)), `${v} — depois`)]);
const html = `<body style="margin:0;background:#000;font:14px monospace;color:#fff">${rows.map((r) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:4px">${r.join("")}</div>`).join("")}</body>`;
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1600, height: 600 } });
await p.setContent(html);
await p.waitForTimeout(500);
await p.screenshot({ path: cap(`${name}.png`), fullPage: true }).catch(async () => { await p.waitForTimeout(800); await p.screenshot({ path: cap(`${name}.png`), fullPage: true }); });
await b.close();
console.log(cap(`${name}.png`));
