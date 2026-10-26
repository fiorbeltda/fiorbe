// Ciclo 05 (arquitetura e luz): folhas ANTES (?luz=atual) | DEPOIS, mesma sessão.
// Uso: node scripts/ciclo05-sheet.mjs
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = (f) => fileURLToPath(new URL(`../captures/ciclo05/${f}`, import.meta.url));
const cache = new Map();
const load = async (f) => {
  if (!cache.has(f)) {
    const buf = await readFile(dir(`${f}.png`));
    cache.set(f, { src: `data:image/png;base64,${buf.toString("base64")}`, w: buf.readUInt32BE(16) });
  }
  return cache.get(f);
};
async function cell(file, w, label, crop) {
  const { src, w: vw } = await load(file);
  if (!crop) return `<figure><figcaption>${label}</figcaption><img src="${src}" style="width:${w}px;display:block"></figure>`;
  const [x, y, cw, ch] = crop;
  const k = w / cw;
  return `<figure><figcaption>${label}</figcaption><div style="width:${w}px;height:${ch * k}px;background:url(${src}) -${x * k}px -${y * k}px / ${vw * k}px auto no-repeat"></div></figure>`;
}
const row = (t, cells, note = "") => `<section><h2>${t}</h2>${note ? `<p class="n">${note}</p>` : ""}<div class="r">${cells.join("")}</div></section>`;
const pair = async (a, b, w, crop) => [await cell(a, w, "ANTES", crop), await cell(b, w, "DEPOIS", crop)];
const css = `body{margin:0;background:#05080f;color:#e8eef7;font:14px system-ui,sans-serif;width:max-content;padding:20px}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 12px;color:#9fb0c6}
h2{font-size:15px;margin:22px 0 4px;color:#bcd}p.n{margin:0 0 8px;font-size:13px}.r{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;max-width:2400px}figure{margin:0}
figcaption{font:600 12px ui-monospace,monospace;padding:0 0 6px;color:#8fb3ff}figure:nth-child(2n) figcaption{color:#7be3cb}`;
const SUB = "V2.3 · antes = luz anterior (?luz=atual), mesma sessão · ondas e ambiente congelados · recortes em DPR 2 sem interface";
const page = (t, rows) => `<style>${css}</style><h1>${t}</h1><p>${SUB}</p>${rows.join("")}`;
const A = "final-antes", D = "final-depois";
const sheets = {
  "A-cena": page("Ciclo 05 · A — Cena completa", [
    row("1440 × 900", await pair("final/antes-1440x900", "final/depois-1440x900", 860)),
    row("1280 × 800", await pair("final/antes-1280x800", "final/depois-1280x800", 860)),
    row("1100 × 800", await pair("final/antes-1100x800", "final/depois-1100x800", 860)),
  ]),
  "B-colunas": page("Ciclo 05 · B — Colunas arquitetônicas (0,6×)", [
    row("Parede de luz acima e atrás da escultura", await pair(A, D, 1000, [1500, 0, 1380, 900]),
      "Colunas com luz acumulada na base e cauda irregular para cima, miolo mais claro que as bordas; as mais fracas ficam macias e frias (mais longe), as fortes nítidas (mais perto). Parede do fundo com perspectiva aérea."),
  ]),
  "C-nucleo": page("Ciclo 05 · C — Núcleo e fundo pelos vazios da escultura (0,6×)", [row("Centro", await pair(A, D, 1000, [1300, 400, 1300, 900]))]),
  "D-figura": page("Ciclo 05 · D — Figura contra a fachada (2×)", [
    row("Figura e contraluz", await pair(A, D, 460, [2540, 1060, 320, 440]),
      "Fachada e brilho atrás da figura em branco frio (antes ciano saturado): a silhueta recorta sem desaparecer no campo turquesa."),
  ]),
  "E-piso": page("Ciclo 05 · E — Piso e horizonte", [
    row("1440: horizonte e reflexos das colunas (0,7×)", await pair(A, D, 1000, [1500, 820, 1380, 500])),
    row("940: borda vertical no piso sob a headline — causa: corte reto do véu editorial", await pair("final/antes-940x900", "final/depois-940x900", 900, [0, 420, 940, 260])),
    row("768 × 1024", await pair("final/antes-768x1024", "final/depois-768x1024", 600, [0, 380, 768, 420])),
  ]),
  "F-movimento": page("Ciclo 05 · F — Movimento real (onda, cursor, arraste; Δ = variação média entre quadros)", [
    row("ANTES", [await cell("mov-antes", 2200, "antes")]),
    row("DEPOIS", [await cell("mov-depois", 2200, "depois")]),
  ]),
};
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
for (const [name, html] of Object.entries(sheets)) {
  await p.setContent(html);
  await p.waitForTimeout(400);
  await p.screenshot({ path: dir(`comparacao-${name}.png`), fullPage: true });
  console.log(dir(`comparacao-${name}.png`));
}
await b.close();
