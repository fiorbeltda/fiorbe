// Referência × escultura em argila na mesma câmera (lado a lado + sobreposição 50%).
// Uso: node scripts/ref-vs.mjs <saida> [prefixo da captura clay "<p>-principal.jpg"]
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [out = "ref-vs", prefix = "r3"] = process.argv.slice(2);
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const ref = `data:image/png;base64,${(await readFile(fileURLToPath(new URL("../../../referencias/hero/referencia-hero-v1.png", import.meta.url)))).toString("base64")}`;
const clay = `data:image/jpeg;base64,${(await readFile(cap(`${prefix}-principal.jpg`))).toString("base64")}`;
// A captura clay é o recorte (600,60,1072×680) da página 1672×941 = coordenadas da referência.
const refTile = `<div style="width:640px;height:406px;background:url(${ref}) -${600 * 0.597}px -${60 * 0.597}px / ${1672 * 0.597}px auto no-repeat"></div>`;
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:640px 640px;gap:4px;font:13px monospace;color:#fff">
<figure style="margin:0;position:relative">${refTile}<figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">referência</figcaption></figure>
<figure style="margin:0;position:relative"><img src="${clay}" style="width:640px;height:406px;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${prefix} · argila</figcaption></figure>
<figure style="margin:0;position:relative;grid-column:span 2;width:640px;justify-self:center">${refTile}<img src="${clay}" style="position:absolute;inset:0;width:640px;height:406px;opacity:.5;mix-blend-mode:screen"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">sobreposição</figcaption></figure></body>`;
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1284, height: 820 } });
await p.setContent(html);
await p.waitForTimeout(400);
await p.screenshot({ path: cap(`${out}.png`) });
await b.close();
console.log(cap(`${out}.png`));
