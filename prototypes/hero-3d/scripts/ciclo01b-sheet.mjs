// Ciclo 01b (faixa 1024–1279): folha ANTES (d3f8142) | DEPOIS + recortes da fronteira texto × escultura.
// Uso: node scripts/ciclo01b-sheet.mjs
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = (f) => fileURLToPath(new URL(`../captures/ciclo01b/${f}`, import.meta.url));
const src = async (f) => `data:image/png;base64,${(await readFile(dir(`${f}.png`))).toString("base64")}`;
async function cell(file, w, label, crop, vw) {
  const s = await src(file);
  if (!crop) return `<figure><figcaption>${label}</figcaption><img src="${s}" style="width:${w}px;display:block"></figure>`;
  const [x, y, cw, ch] = crop;
  const k = w / cw;
  return `<figure><figcaption>${label}</figcaption><div style="width:${w}px;height:${ch * k}px;background:url(${s}) -${x * k}px -${y * k}px / ${vw * k}px auto no-repeat"></div></figure>`;
}
const row = (t, cells) => `<section><h2>${t}</h2><div class="r">${cells.join("")}</div></section>`;
const css = `body{margin:0;background:#05080f;color:#e8eef7;font:14px system-ui,sans-serif;width:max-content;padding:20px}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 14px;color:#9fb0c6}
h2{font-size:15px;margin:20px 0 8px;color:#bcd}.r{display:flex;gap:14px}figure{margin:0}figcaption{font:600 12px ui-monospace,monospace;padding:0 0 6px;color:#8fb3ff}figure:nth-child(2n) figcaption{color:#7be3cb}`;
const rows = [];
for (const [tag, note] of [["1024x768", "palco 470 → 550 px (+17%)"], ["1100x800", "palco 537 → 613 px (+14%)"], ["1200x800", "palco 627 → 695 px (+11%)"], ["1280x800", "controle — sem alteração"]])
  rows.push(row(`${tag} · ${note}`, [await cell(`antes-${tag}`, 860, `ANTES (d3f8142) · ${tag}`), await cell(`depois-${tag}`, 860, `DEPOIS · ${tag}`)]));
rows.push(row("Fronteira texto × escultura, 2× (lede, CTAs e lóbulo esquerdo)", [
  await cell("depois-1024x768", 560, "DEPOIS · 1024", [40, 330, 520, 250], 1024),
  await cell("depois-1100x800", 560, "DEPOIS · 1100", [50, 340, 520, 250], 1100),
  await cell("depois-1200x800", 560, "DEPOIS · 1200", [70, 350, 520, 250], 1200),
]));
rows.push(row("Alternativas descartadas (injeção de CSS, mesmas condições)", [
  await cell("v2-1100x800", 560, "v2 · sangria à direita: figura cortada na borda"),
  await cell("v3-1024x768", 560, "v3 · coluna +380 px: lóbulo encosta no CTA a 1024"),
]));
const html = `<style>${css}</style><h1>Ciclo 01 · refinamento 1024–1279 px — ANTES | DEPOIS</h1><p>V2.3 · ondas e ambiente congelados na mesma fase · DPR 1 · UHD 630 · "N" = indicador do Next em desenvolvimento</p>${rows.join("")}`;
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
await p.setContent(html);
await p.waitForTimeout(400);
await p.screenshot({ path: dir("comparacao-1024-1280.png"), fullPage: true });
await b.close();
console.log(dir("comparacao-1024-1280.png"));
