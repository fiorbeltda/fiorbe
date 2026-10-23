// Antes/depois das regiões marcadas a partir de duas capturas de cena inteira (mesma câmera).
// Uso: node scripts/before-after.mjs <antes.png> <depois.png> [saida]
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [A, B, name = "regioes-antes-depois"] = process.argv.slice(2);
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const url = async (f) => `data:image/png;base64,${(await readFile(cap(f))).toString("base64")}`;
const [a, b] = await Promise.all([url(A), url(B)]);
const R = [
  ["1 · borda sup. da abertura esq.", 720, 330, 300, 200],
  ["2 · vão inferior esq.", 820, 420, 220, 170],
  ["3 · redemoinho", 1260, 220, 360, 360],
  ["4 · reflexo no piso", 1000, 660, 600, 150],
];
const S = 2;
const cell = (src, [l, x, y, w, h], tag) => `<figure style="margin:0;position:relative;width:${w * S}px;height:${h * S}px;background:url(${src}) -${x * S}px -${y * S}px / ${1672 * S}px auto no-repeat"><figcaption style="position:absolute;left:4px;top:4px;background:#000c;padding:1px 6px">${l} — ${tag}</figcaption></figure>`;
const full = (src, tag) => `<figure style="margin:0;position:relative;width:1180px"><img src="${src}" style="width:100%;display:block">${R.map(([, x, y, w, h], i) => `<div style="position:absolute;left:${(x / 1672) * 100}%;top:${(y / 941) * 100}%;width:${(w / 1672) * 100}%;height:${(h / 941) * 100}%;border:2px solid #f33;border-radius:50%"><span style="position:absolute;top:-16px;left:0;color:#f33;font-weight:bold">${i + 1}</span></div>`).join("")}<figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${tag}</figcaption></figure>`;
const html = `<body style="margin:0;background:#000;font:13px monospace;color:#fff;width:max-content"><div style="display:flex;gap:4px;margin-bottom:4px">${full(a, "antes (9bcd950)")}${full(b, "depois")}</div>${R.map((r) => `<div style="display:flex;gap:4px;margin-bottom:4px">${cell(a, r, "antes")}${cell(b, r, "depois")}</div>`).join("")}</body>`;
const br = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await br.newPage({ viewport: { width: 1200, height: 600 } });
await p.setContent(html);
await p.waitForTimeout(600);
await p.screenshot({ path: cap(`${name}.png`), fullPage: true });
await br.close();
console.log(cap(`${name}.png`));
