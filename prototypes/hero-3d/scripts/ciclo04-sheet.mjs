// Ciclo 04 (escultura metálica): folhas ANTES (?escultura=atual: malha e metal anteriores) | DEPOIS,
// capturados na mesma sessão. Recortes em DPR 2 (final-*.png, 2880×1800) e cenas em DPR 1 (final/).
// Uso: node scripts/ciclo04-sheet.mjs
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = (f) => fileURLToPath(new URL(`../captures/ciclo04/${f}`, import.meta.url));
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
const SUB = "V2.3 · antes = malha e metal anteriores (?escultura=atual), mesma sessão · ondas e ambiente congelados na mesma fase · recortes em DPR 2 · interface oculta nos recortes";
const page = (t, rows) => `<style>${css}</style><h1>${t}</h1><p>${SUB}</p>${rows.join("")}`;
const A = "final-antes", D = "final-depois";
const sheets = {
  "A-cena": page("Ciclo 04 · A — Cena completa", [
    row("1440 × 900", await pair("final/antes-1440x900", "final/depois-1440x900", 860)),
    row("1280 × 800", await pair("final/antes-1280x800", "final/depois-1280x800", 860)),
  ]),
  "B-laminas": page("Ciclo 04 · B — Grandes lâminas (arco superior e lâmina central)", [
    row("Arco superior (1,1×)", await pair(A, D, 1000, [1300, 330, 700, 360]),
      "Antes: padrão de losangos (a direção do escovado mudava a cada triângulo) e linhas claras entre lâminas fechadas que liam como traços desenhados. Depois: reflexo contínuo, mesma luz e mesma cor."),
    row("Lâmina central (1,1×)", await pair(A, D, 1000, [1600, 620, 900, 420]),
      "Teal um pouco mais profundo e menos prata no metal todo: menos leitoso, mais contraste entre reflexo e sombra."),
  ]),
  "C-redemoinho": page("Ciclo 04 · C — Redemoinho direito", [
    row("Redemoinho (0,9×)", await pair(A, D, 700, [2200, 520, 640, 760])),
    row("Outra fase da onda", await pair("final-antes-lap2", "final-depois-lap2", 700, [2200, 520, 640, 760])),
  ]),
  "D-bordas": page("Ciclo 04 · D — Bordas, frestas e leques (2,5×)", [
    row("Fresta interna do redemoinho", await pair(A, D, 950, [2300, 720, 380, 120]),
      "Os dentes triangulares restantes são pontas reais do leque do fundo vistas pela fresta (aparecem também na argila) — limitação registrada."),
    row("Leque inferior esquerdo", await pair(A, D, 950, [1200, 740, 380, 160])),
  ]),
  "E-material": page("Ciclo 04 · E — Material (visão de conjunto da escultura, 0,6×)", [
    row("Escultura inteira", await pair(A, D, 1000, [1100, 300, 1750, 900])),
  ]),
  "F-movimento": page("Ciclo 04 · F — Movimento real no redemoinho (Δ = variação média entre quadros)", [
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
