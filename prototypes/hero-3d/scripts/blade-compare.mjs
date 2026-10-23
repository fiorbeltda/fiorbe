// Folha V2 × V2.1 (lâminas): referência, V2, variantes A/B em argila, escolhida em metal, close-ups e reflexo.
// Uso: node scripts/blade-compare.mjs [saida]
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [name = "laminas-comparacao"] = process.argv.slice(2);
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const img = async (f, t = "jpeg") => `data:image/${t};base64,${(await readFile(f)).toString("base64")}`;
const ref = await img(fileURLToPath(new URL("../../../referencias/hero/referencia-hero-v1.png", import.meta.url)), "png");
const refTile = `<div style="width:100%;aspect-ratio:1072/680;background:url(${ref}) -${600 * 0.476}px -${60 * 0.476}px / ${1672 * 0.476}px auto no-repeat"></div>`;
const tile = (src, label, html) => `<figure style="margin:0;position:relative">${html ?? `<img src="${src}" style="width:100%;display:block">`}<figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${label}</figcaption></figure>`;
const rows = [
  [tile(null, "referência", refTile), tile(await img(cap("s-blender2-principal.jpg")), "V2 antes — argila")],
  [tile(await img(cap("s2-blender2-a-principal.jpg")), "A Satin Blade — argila"), tile(await img(cap("s2-blender2-b-principal.jpg")), "B Sculpted Blade — argila")],
  [tile(await img(cap("s-blender2-material.jpg")), "V2 antes — metal premium"), tile(await img(cap("s2-blender2-b-material.jpg")), "V2.1 (B) — metal premium")],
];
for (const v of ["coroa", "redemoinho", "lamelas", "reflexo"]) rows.push([tile(await img(cap(`v20-${v}.png`), "png"), `${v} — V2`), tile(await img(cap(`v21-${v}.png`), "png"), `${v} — V2.1 (B)`)]);
const html = `<body style="margin:0;background:#000;font:14px monospace;color:#fff">${rows.map((r) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:4px">${r.join("")}</div>`).join("")}</body>`;
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1024, height: 600 } });
await p.setContent(html);
await p.waitForTimeout(500);
await p.screenshot({ path: cap(`${name}.png`), fullPage: true }).catch(async () => { await p.waitForTimeout(800); await p.screenshot({ path: cap(`${name}.png`), fullPage: true }); });
await b.close();
console.log(cap(`${name}.png`));
