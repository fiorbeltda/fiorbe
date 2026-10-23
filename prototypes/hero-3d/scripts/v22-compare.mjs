// Folha V2.1 B × V2.2: referência, anterior, argila, metal, close-ups (coroa, faixa central,
// redemoinho) e cena completa — todos na mesma câmera (1672×941).
// Uso: node scripts/v22-compare.mjs <antes> <depois> [saida] [rótulo antes] [rótulo depois]   (prefixos de sculpt-shots.mjs)
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [before = "v21b", after = "v22c", name = "v22-comparacao", A = "V2.1 B", B = "V2.2"] = process.argv.slice(2);
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const img = async (f) => `data:image/png;base64,${(await readFile(f)).toString("base64")}`;
const ref = await img(fileURLToPath(new URL("../../../referencias/hero/referencia-hero-v1.png", import.meta.url)));
const [bm, ac, am] = await Promise.all([img(cap(`${before}-metal.png`)), img(cap(`${after}-argila.png`)), img(cap(`${after}-metal.png`))]);
// Recorte [x, y, w, h] de uma imagem 1672×941, na largura do bloco.
const pct = (v, span) => (span > 0 ? (v / span) * 100 : 0);
const crop = (src, [x, y, w, h], label) => `<figure style="margin:0;position:relative;aspect-ratio:${w}/${h};background:url(${src}) no-repeat;background-size:${(1672 / w) * 100}% auto;background-position:${pct(x, 1672 - w)}% ${pct(y, 941 - h)}%"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${label}</figcaption></figure>`;
const FULL = [600, 60, 1072, 680];
const CROWN = [850, 70, 520, 330];
const CENTER = [820, 320, 640, 270];
const WHIRL = [1250, 200, 420, 420];
const rows = [
  [crop(ref, FULL, "1 · referência"), crop(bm, FULL, `2 · ${A} (anterior)`)],
  [crop(ac, FULL, `3 · ${B} argila`), crop(am, FULL, `4 · ${B} metal premium`)],
  [crop(bm, CROWN, `5 · coroa — ${A}`), crop(am, CROWN, `5 · coroa — ${B}`)],
  [crop(bm, CENTER, `6 · faixa central — ${A}`), crop(am, CENTER, `6 · faixa central — ${B}`)],
  [crop(bm, WHIRL, `7 · redemoinho — ${A}`), crop(am, WHIRL, `7 · redemoinho — ${B}`)],
  [crop(ref, [0, 0, 1672, 941], "8 · referência — cena"), crop(am, [0, 0, 1672, 941], `8 · ${B} — cena completa`)],
];
const html = `<body style="margin:0;background:#000;font:14px monospace;color:#fff">${rows.map((r) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:4px">${r.join("")}</div>`).join("")}</body>`;
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1600, height: 600 } });
await p.setContent(html);
await p.waitForTimeout(800);
await p.screenshot({ path: cap(`${name}.png`), fullPage: true }).catch(async () => { await p.waitForTimeout(800); await p.screenshot({ path: cap(`${name}.png`), fullPage: true }); });
await b.close();
console.log(cap(`${name}.png`));
