// Validação final: folhas de evidência do código final (captures/validacao-final/).
// Uso: node scripts/validacao-sheet.mjs
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = (f) => fileURLToPath(new URL(`../captures/validacao-final/${f}`, import.meta.url));
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
const css = `body{margin:0;background:#05080f;color:#e8eef7;font:14px system-ui,sans-serif;width:max-content;padding:20px}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 12px;color:#9fb0c6}
h2{font-size:15px;margin:22px 0 4px;color:#bcd}p.n{margin:0 0 8px;font-size:13px;max-width:1800px}.r{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;max-width:2300px}figure{margin:0}
figcaption{font:600 12px ui-monospace,monospace;padding:0 0 6px;color:#8fb3ff}`;
const page = (t, rows) => `<style>${css}</style><h1>${t}</h1><p>V2.3 · código final da validação · cena congelada nas capturas estáticas</p>${rows.join("")}`;
const D = "B-escultura-dpr2";
const sheets = {
  "A-hero": page("Validação final · A — Hero completo", [
    row("Desktop", [await cell("A-1920x1080", 760, "1920 × 1080"), await cell("A-1440x900", 760, "1440 × 900"), await cell("A-1280x800", 700, "1280 × 800")]),
    row("Notebook e empilhado", [await cell("A-1100x800", 620, "1100 × 800"), await cell("A-1024x768", 560, "1024 × 768"), await cell("A-940x900", 560, "940 × 900")]),
    row("Tablet, celular e celular deitado", [await cell("A-768x1024", 380, "768 × 1024"), await cell("A-390x844", 250, "390 × 844"), await cell("A-360x740", 240, "360 × 740"), await cell("A-844x390", 560, "844 × 390 (corrigido)"), await cell("A-667x375", 460, "667 × 375")]),
  ]),
  "B-detalhes": page("Validação final · B — Detalhes críticos (DPR 2)", [
    row("Escultura inteira", [await cell(D, 1500, "escultura", [1100, 220, 1780, 700])]),
    row("Arco superior · lâmina central · redemoinho", [await cell(D, 700, "arco superior", [1300, 330, 700, 360]), await cell(D, 700, "lâmina central", [1600, 620, 900, 420]), await cell(D, 560, "redemoinho", [2200, 520, 640, 760])]),
    row("Figura e piso", [await cell(D, 420, "figura", [2540, 1060, 320, 440]), await cell(D, 1100, "piso e trilha", [1100, 1250, 1780, 440])]),
  ]),
  "C-interface": page("Validação final · C — Estados da interface (normal · hover · pressionado · foco)", [
    row("Estados", [await cell("final-estados", 1300, "1440 · DPR 2")], "Pausado: aria-pressed=true, rótulo \"Retomar movimento\" e borda ciano (verificado por script)."),
    row("Interface em DPR 2", [await cell("final-ui", 1400, "1440 × 900")]),
  ]),
  "D-rolagem": page("Validação final · D — Rolagem até o manifesto provisório (frações do percurso real)", [
    row("1440 × 900", [await cell("final-scroll-1440x900", 1620, "desktop")]),
    row("940 × 900 e 390 × 844", [await cell("final-scroll-940x900", 1000, "empilhado"), await cell("final-scroll-390x844", 700, "celular")]),
  ]),
  "E-movimento": page("Validação final · E — Onda: volta completa (0% = 100%)", [row("Volta", [await cell("E-volta-onda", 1400, "V2.3")])]),
  "F-motores-fallback": page("Validação final · F — Variantes e motores (Playwright no Windows; WebKit ≠ Safari real)", [
    row("Variantes no Chromium", [await cell("F-chromium-forma-c", 520, "forma C (padrão)"), await cell("F-chromium-v22", 520, "V2.2"), await cell("F-chromium-v23", 520, "V2.3"), await cell("F-chromium-v23r", 520, "V2.3r")]),
    row("V2.3 em Firefox e WebKit", [await cell("F-firefox-v23", 700, "Firefox (headless)"), await cell("F-webkit-v23", 700, "WebKit/Windows — peso da fonte variável não aplicado")]),
  ]),
};
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
for (const [name, html] of Object.entries(sheets)) {
  await p.setContent(html);
  await p.waitForTimeout(500);
  try {
    await p.screenshot({ path: dir(`validacao-${name}.png`), fullPage: true });
    console.log(dir(`validacao-${name}.png`));
  } catch (e) {
    console.log("FALHOU", name, e.message.slice(0, 80));
  }
}
await b.close();
