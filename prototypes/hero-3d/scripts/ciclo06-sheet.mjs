// Ciclo 06 (interface): folhas ANTES (código de 4d3239b) | DEPOIS.
// Uso: node scripts/ciclo06-sheet.mjs
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = (f) => fileURLToPath(new URL(`../captures/ciclo06/${f}`, import.meta.url));
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
h2{font-size:15px;margin:22px 0 4px;color:#bcd}p.n{margin:0 0 8px;font-size:13px;max-width:1700px}.r{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;max-width:2400px}figure{margin:0}
figcaption{font:600 12px ui-monospace,monospace;padding:0 0 6px;color:#8fb3ff}figure:nth-child(2n) figcaption{color:#7be3cb}`;
const SUB = "V2.3 · antes = 4d3239b · cena congelada (ondas e ambiente) · DPR 1 nas cenas, DPR 2 nos recortes de interface";
const page = (t, rows) => `<style>${css}</style><h1>${t}</h1><p>${SUB}</p>${rows.join("")}`;
const sheets = {
  "A-interface": page("Ciclo 06 · A — Interface completa", [
    row("1440 × 900", await pair("antes-1440x900", "depois-1440x900", 860)),
    row("1280 × 800", await pair("antes-1280x800", "depois-1280x800", 860)),
  ]),
  "B-editorial": page("Ciclo 06 · B — Editorial (2×)", [
    row("Rótulo, headline, texto, CTAs e badge", await pair("antes-ui", "depois-ui", 760, [200, 250, 1300, 1100]),
      "Tipografia, tamanhos e quebras preservados (aprovados no Ciclo 01). Mudam o CTA principal (pílula), as bordas dos botões e o ponto do badge."),
  ]),
  "C-navegacao-ctas": page("Ciclo 06 · C — Navegação, CTAs e estados (normal · hover · pressionado · foco por teclado)", [
    row("ANTES", [await cell("antes-estados", 1300, "antes")]),
    row("DEPOIS", [await cell("depois-estados", 1300, "depois")],
      "Hover da navbar com filete; foco arredondado; CTA principal em pílula como os demais controles; pressionado afunda 1 px (antes igual ao hover); Conversar com brilho mais contido."),
    row("Navbar (2×)", await pair("antes-ui", "depois-ui", 1100, [200, 0, 2560, 200])),
  ]),
  "D-badge-barra": page("Ciclo 06 · D — Badge e barra informativa (2×)", [
    row("Badge", await pair("antes-ui", "depois-ui", 560, [220, 1180, 560, 140]), "Ponto sem brilho (não lê como \"online agora\") e em mint, cor da paleta."),
    row("Barra informativa — sem alteração (alinhamento, divisórias e quebras já corretos desde o Ciclo 01)", await pair("antes-ui", "depois-ui", 1100, [200, 1440, 2500, 330])),
  ]),
  "E-controle": page("Ciclo 06 · E — Controle de movimento (2×)", [
    row("No piso, ao lado da trilha", await pair("antes-ui", "depois-ui", 560, [2280, 1300, 400, 160]),
      "Mesma posição (aprovada no Ciclo 01). Vidro com desfoque e texto mais claro: legível sobre reflexo claro ou escuro. Pausado ganha borda ciano (estado visível)."),
  ]),
  "F-scroll": page("Ciclo 06 · F — Transição de rolagem (frações do percurso real da timeline)", [
    row("ANTES · 1440 × 900", [await cell("antes-scroll-1440x900", 1620, "antes")]),
    row("DEPOIS · 1440 × 900", [await cell("depois-scroll-1440x900", 1620, "depois")],
      "Antes: de ~30% a ~70% (≈ 450 px) só a escultura no escuro; o manifesto entrava aos 75%. Depois: texto do hero acompanha a recomposição e o manifesto entra aos ~60%; o trecho vazio cai pela metade. Escultura, câmera e animação inalteradas."),
    row("940 × 900", [await cell("antes-scroll-940x900", 800, "antes"), await cell("depois-scroll-940x900", 800, "depois")]),
  ]),
  "G-responsivo": page("Ciclo 06 · G — Responsividade", [
    row("1100 × 800 e 1024 × 768", [...(await pair("antes-1100x800", "depois-1100x800", 560)), ...(await pair("antes-1024x768", "depois-1024x768", 520))]),
    row("768 × 1024, 390 × 844 e 360 × 740", [...(await pair("antes-768x1024", "depois-768x1024", 300)), ...(await pair("antes-390x844", "depois-390x844", 260)), ...(await pair("antes-360x740", "depois-360x740", 250))]),
  ]),
};
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
for (const [name, html] of Object.entries(sheets)) {
  await p.setContent(html);
  await p.waitForTimeout(400);
  const size = await p.evaluate(() => [document.body.scrollWidth, document.body.scrollHeight]);
  try {
    await p.screenshot({ path: dir(`comparacao-${name}.png`), fullPage: true });
    console.log(dir(`comparacao-${name}.png`), size);
  } catch (e) {
    console.log("FALHOU", name, size, e.message.slice(0, 80));
  }
}
await b.close();
