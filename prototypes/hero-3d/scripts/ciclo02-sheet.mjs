// Ciclo 02 (piso e reflexos): folhas ANTES | DEPOIS. "Antes" = caminho anterior do piso (?piso=atual)
// capturado na mesma sessão que o "depois" (escultura idêntica; só o piso muda).
// Uso: node scripts/ciclo02-sheet.mjs   (requer captures/ciclo02/final/{antes,depois}-*.png e mov-*.png)
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = (f) => fileURLToPath(new URL(`../captures/ciclo02/${f}`, import.meta.url));
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
const pair = async (tag, w, crop) => [await cell(`final/antes-${tag}`, w, `ANTES · ${tag}`, crop), await cell(`final/depois-${tag}`, w, `DEPOIS · ${tag}`, crop)];
const css = `body{margin:0;background:#05080f;color:#e8eef7;font:14px system-ui,sans-serif;width:max-content;padding:20px}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 12px;color:#9fb0c6}
h2{font-size:15px;margin:22px 0 4px;color:#bcd}p.n{margin:0 0 8px;font-size:13px}.r{display:flex;gap:14px;align-items:flex-start}figure{margin:0}
figcaption{font:600 12px ui-monospace,monospace;padding:0 0 6px;color:#8fb3ff}figure:nth-child(2n) figcaption{color:#7be3cb}`;
const SUB = "V2.3 · mesma sessão, ondas e ambiente congelados na mesma fase · DPR 1 · Intel UHD 630 · acima da linha do piso as imagens são idênticas (diferença máx. 3–4 níveis)";
const page = (t, rows) => `<style>${css}</style><h1>${t}</h1><p>${SUB}</p>${rows.join("")}`;

const sheets = {
  "A-geral": page("Ciclo 02 · A — Cena completa: ANTES | DEPOIS", [
    row("Desktop amplo 1440 × 900", await pair("1440x900", 860)),
    row("Notebook 1280 × 800", await pair("1280x800", 860)),
  ]),
  "B-redemoinho": page("Ciclo 02 · B — Reflexo do redemoinho (2,5×)", [
    row("Sob o redemoinho e o controle de movimento", await pair("1440x900", 1000, [1040, 630, 400, 130]),
      "Antes: faixas claras borradas repetidas (“pente”), bolhas e listras horizontais. Depois: traços verticais com gradação, sem estouro em branco."),
    row("Sob a lâmina central e o laço da trilha (região A)", await pair("1440x900", 1000, [620, 630, 440, 130]),
      "Antes: mancha clara redonda, degraus de mip, halo da trilha em faixa chapada. Depois: reflexo alongado, trilha fina e filtrada."),
  ]),
  "C-material": page("Ciclo 02 · C — Material do concreto", [
    row("Faixa do piso inteira (1,2×)", await pair("1440x900", 1060, [540, 600, 880, 170])),
    row("Juntas, rugosidade e trilha perto da câmera (3×)", await pair("1440x900", 700, [1150, 650, 240, 90]),
      "Rugosidade e umidade (manchas alongadas) agora aparecem no comprimento dos traços do reflexo; juntas continuam cortando o reflexo."),
  ]),
  "D-figura": page("Ciclo 02 · D — Figura humana: contato e reflexo (3×)", [
    row("Pés, sombra de contato e reflexo", await pair("1440x900", 450, [1290, 540, 150, 220]),
      "Sem a “poeira” de pontos e as listras; o reflexo nasce nos pés e se alonga; a trilha sob a figura é contínua (antes, contas pontilhadas)."),
  ]),
  "E-responsivo": page("Ciclo 02 · E — Responsividade", [
    row("Intermediário 1100 × 800", await pair("1100x800", 860)),
    row("Empilhado 940 × 900 — piso sob a headline (região F)", await pair("940x900", 860, [0, 400, 940, 360]),
      "A junta do concreto que cruzava “transforma” some sob o texto no layout empilhado."),
    row("Mobile 390 × 844 (sem reflexo por regra; inalterado)", await pair("390x844", 390)),
  ]),
  "F-movimento": page("Ciclo 02 · F — Estabilidade temporal (movimento real, sem congelar)", [
    row("Onda, cursor varrendo a peça e arraste — Δ = variação média de pixel entre quadros, picos = pixels com salto > 90",
      [await cell("mov-antes", 680, "ANTES (?piso=atual)"), await cell("mov-depois2", 680, "DEPOIS")]),
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
