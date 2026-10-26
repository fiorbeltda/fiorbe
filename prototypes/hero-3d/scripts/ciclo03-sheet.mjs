// Ciclo 03 (figura humana): folhas ANTES (?figura=atual) | DEPOIS, capturados na mesma sessão.
// Uso: node scripts/ciclo03-sheet.mjs   (requer captures/ciclo03/final/* e captures/ciclo03/mov-*.png)
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = (f) => fileURLToPath(new URL(`../captures/ciclo03/${f}`, import.meta.url));
const cache = new Map();
const load = async (f) => {
  if (!cache.has(f)) {
    const buf = await readFile(dir(`${f}.png`));
    cache.set(f, { src: `data:image/png;base64,${buf.toString("base64")}`, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });
  }
  return cache.get(f);
};
async function cell(file, w, label, crop) {
  const { src, w: vw, h: vh } = await load(file);
  // crop em frações [x, y, largura, altura] da imagem (os closes têm tamanhos diferentes por viewport).
  if (!crop) return `<figure><figcaption>${label}</figcaption><img src="${src}" style="width:${w}px;display:block"></figure>`;
  const [fx, fy, fw, fh] = crop;
  const k = w / (fw * vw);
  return `<figure><figcaption>${label}</figcaption><div style="width:${w}px;height:${fh * vh * k}px;background:url(${src}) -${fx * vw * k}px -${fy * vh * k}px / ${vw * k}px auto no-repeat"></div></figure>`;
}
const row = (t, cells, note = "") => `<section><h2>${t}</h2>${note ? `<p class="n">${note}</p>` : ""}<div class="r">${cells.join("")}</div></section>`;
const pair = async (name, w, crop) => [await cell(`final/antes-${name}`, w, `ANTES · ${name}`, crop), await cell(`final/depois-${name}`, w, `DEPOIS · ${name}`, crop)];
const css = `body{margin:0;background:#05080f;color:#e8eef7;font:14px system-ui,sans-serif;width:max-content;padding:20px}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 12px;color:#9fb0c6}
h2{font-size:15px;margin:22px 0 4px;color:#bcd}p.n{margin:0 0 8px;font-size:13px}.r{display:flex;gap:14px;align-items:flex-start}figure{margin:0}
figcaption{font:600 12px ui-monospace,monospace;padding:0 0 6px;color:#8fb3ff}figure:nth-child(2n) figcaption{color:#7be3cb}`;
const SUB = "V2.3 · antes = figura anterior (?figura=atual), mesma sessão · cena congelada (ondas e ambiente) · closes em DPR 2";
const page = (t, rows) => `<style>${css}</style><h1>${t}</h1><p>${SUB}</p>${rows.join("")}`;
const FIG = [0.22, 0.02, 0.56, 0.98];
const FEET = [0.28, 0.5, 0.44, 0.34];
const sheets = {
  "A-cena": page("Ciclo 03 · A — Cena completa", [row("1440 × 900", await pair("1440x900", 860)), row("1280 × 800", await pair("1280x800", 860))]),
  "B-figura": page("Ciclo 03 · B — Figura ampliada (silhueta, pés, sombra, reflexo)", [
    row("1440 × 900", await pair("fig-1440x900", 420, FIG),
      "Pernas separadas (antes: uma coluna), contrapposto legível (perna esquerda solta, peso na direita), braço fora do tronco, mão proporcional, pescoço mais firme, contraluz nos dois lados; reflexo das duas pernas, denso nos pés e esmaecendo; sombra de contato justa."),
    row("1280 × 800", await pair("fig-1280x800", 420, FIG)),
  ]),
  "C-contato": page("Ciclo 03 · C — Contato com o chão (pés e base)", [
    row("1440 × 900", await pair("fig-1440x900", 560, FEET), "Antes: elipse de sombra larga que virava um risco escuro; reflexo de opacidade constante. Depois: sombra sob os pés, reflexo saindo dos pés."),
    row("1280 × 800", await pair("fig-1280x800", 560, FEET)),
  ]),
  "D-movimento": page("Ciclo 03 · D — Movimento real (1 s entre quadros, cursor, arraste, rolagem)", [
    row("ANTES — o braço esquerdo deriva sozinho nos primeiros segundos (defeito do mixer)", [await cell("mov-antes", 1500, "antes")]),
    row("DEPOIS — pose estável; respiração, peso e olhar discretos", [await cell("mov-depois", 1500, "depois")]),
  ]),
  "E-responsivo": page("Ciclo 03 · E — Responsividade", [
    row("1100 × 800", [...(await pair("1100x800", 640)), ...(await pair("fig-1100x800", 300, FIG))]),
    row("940 × 900", [...(await pair("940x900", 600)), ...(await pair("fig-940x900", 300, FIG))]),
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
