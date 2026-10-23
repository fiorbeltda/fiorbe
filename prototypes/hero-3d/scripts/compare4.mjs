// Folha de consolidação: referência × três versões (mesma câmera 1672×941, onda congelada),
// close-ups (lâmina central, vazio da coroa, redemoinho) e cena completa.
// Uso: node scripts/compare4.mjs <prefA> <prefB> <prefC> [saida] [rótulos "A|B|C"]
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [pa = "v22f", pb = "v23g", pc = "r3", name = "consolidacao4", labels = "V2.2|V2.3 anterior|V2.3 refinada"] = process.argv.slice(2);
const [la, lb, lc] = labels.split("|");
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const img = async (f) => `data:image/png;base64,${(await readFile(f)).toString("base64")}`;
const ref = await img(fileURLToPath(new URL("../../../referencias/hero/referencia-hero-v1.png", import.meta.url)));
const [ma, mb, mc, ac] = await Promise.all([img(cap(`${pa}-metal.png`)), img(cap(`${pb}-metal.png`)), img(cap(`${pc}-metal.png`)), img(cap(`${pc}-argila.png`))]);
const pct = (v, span) => (span > 0 ? (v / span) * 100 : 0);
const crop = (src, [x, y, w, h], label) => `<figure style="margin:0;position:relative;aspect-ratio:${w}/${h};background:url(${src}) no-repeat;background-size:${(1672 / w) * 100}% auto;background-position:${pct(x, 1672 - w)}% ${pct(y, 941 - h)}%"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${label}</figcaption></figure>`;
const FULL = [600, 60, 1072, 680];
const CENTER = [820, 300, 760, 330];
const VOID = [800, 120, 520, 330];
const WHIRL = [1250, 200, 420, 420];
const row = (cells, cols) => `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;margin-bottom:4px">${cells.join("")}</div>`;
const html = `<body style="margin:0;background:#000;font:13px monospace;color:#fff">${[
  row([crop(ref, FULL, "1 · referência"), crop(ma, FULL, `2 · ${la}`)], 2),
  row([crop(mb, FULL, `3 · ${lb}`), crop(mc, FULL, `4 · ${lc}`)], 2),
  row([crop(ac, FULL, `${lc} — argila`), crop(ref, CENTER, "referência — centro")], 2),
  row([crop(mb, CENTER, `5 · lâmina central — ${lb}`), crop(mc, CENTER, `5 · lâmina central — ${lc}`)], 2),
  row([crop(mb, VOID, `6 · vazio da coroa — ${lb}`), crop(mc, VOID, `6 · vazio da coroa — ${lc}`), crop(ma, VOID, `6 · vazio da coroa — ${la}`)], 3),
  row([crop(mb, WHIRL, `7 · redemoinho — ${lb}`), crop(mc, WHIRL, `7 · redemoinho — ${lc}`), crop(ref, WHIRL, "redemoinho — referência")], 3),
  row([crop(ref, [0, 0, 1672, 941], "8 · referência — cena"), crop(mc, [0, 0, 1672, 941], `8 · ${lc} — cena completa`)], 2),
].join("")}</body>`;
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1600, height: 600 } });
await p.setContent(html);
await p.waitForTimeout(800);
await p.screenshot({ path: cap(`${name}.png`), fullPage: true }).catch(async () => { await p.waitForTimeout(800); await p.screenshot({ path: cap(`${name}.png`), fullPage: true }); });
await b.close();
console.log(cap(`${name}.png`));
