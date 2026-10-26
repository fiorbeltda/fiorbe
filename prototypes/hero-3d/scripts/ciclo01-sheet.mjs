// Ciclo 01: folhas comparativas ANTES | DEPOIS a partir de captures/ciclo01 (ver ciclo01.mjs).
// Uso: node scripts/ciclo01-sheet.mjs
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = (f) => fileURLToPath(new URL(`../captures/ciclo01/${f}`, import.meta.url));
const cache = new Map();
const src = async (f) => {
  if (!cache.has(f)) cache.set(f, `data:image/png;base64,${(await readFile(dir(`${f}.png`))).toString("base64")}`);
  return cache.get(f);
};

/** Célula: imagem inteira (largura w) ou recorte [x, y, cw, ch] da captura de largura vw, ampliado para w. */
async function cell(file, w, label, crop, vw) {
  const s = await src(file);
  const body = crop
    ? (() => {
        const [x, y, cw, ch] = crop;
        const k = w / cw;
        return `<div style="width:${w}px;height:${ch * k}px;background:url(${s}) -${x * k}px -${y * k}px / ${vw * k}px auto no-repeat"></div>`;
      })()
    : `<img src="${s}" style="width:${w}px;display:block">`;
  return `<figure style="margin:0"><figcaption>${label}</figcaption>${body}</figure>`;
}
const row = (title, cells) => `<section><h2>${title}</h2><div class="r">${cells.join("")}</div></section>`;
const css = `body{margin:0;background:#05080f;color:#e8eef7;font:14px system-ui,sans-serif;width:max-content;padding:20px}
h1{font-size:22px;margin:0 0 4px}p.s{margin:0 0 18px;color:#9fb0c6}h2{font-size:15px;margin:22px 0 8px;color:#bcd}
.r{display:flex;gap:14px;align-items:flex-start}figcaption{font:600 12px ui-monospace,monospace;padding:0 0 6px;color:#8fb3ff}
figure:nth-child(2n) figcaption{color:#7be3cb}`;
const page = (title, sub, rows) => `<style>${css}</style><h1>${title}</h1><p class="s">${sub}</p>${rows.join("")}`;
const pair = async (tag, w, title) => row(title, [await cell(`antes-${tag}`, w, `ANTES · ${tag}`), await cell(`depois-${tag}`, w, `DEPOIS · ${tag}`)]);
const SUB = "V2.3 (?forma=blender2-v23) · ondas e movimento ambiente congelados na mesma fase · DPR 1 · Intel UHD 630 (D3D11) · o círculo “N” no canto é o indicador do Next em desenvolvimento";

const sheets = {
  "comparacao-desktop": page("Ciclo 01 — Desktop: ANTES | DEPOIS", SUB, [
    await pair("1440x900", 860, "Desktop amplo 1440 × 900"),
    await pair("1280x800", 860, "Notebook 1280 × 800"),
    await pair("1100x800", 860, "Intermediário 1100 × 800 (ponto mais crítico do lado a lado)"),
    await pair("1024x768", 860, "Limite do lado a lado 1024 × 768"),
  ]),
  "comparacao-empilhado": page("Ciclo 01 — Layout empilhado: ANTES | DEPOIS", SUB, [
    row("Intermediário 940 × 900 e tablet 768 × 1024", [
      await cell("antes-940x900", 560, "ANTES · 940x900"), await cell("depois-940x900", 560, "DEPOIS · 940x900"),
      await cell("antes-768x1024", 480, "ANTES · 768x1024"), await cell("depois-768x1024", 480, "DEPOIS · 768x1024"),
    ]),
    row("Mobile 390 × 844 e 360 × 740", [
      await cell("antes-390x844", 390, "ANTES · 390x844"), await cell("depois-390x844", 390, "DEPOIS · 390x844"),
      await cell("antes-360x740", 360, "ANTES · 360x740"), await cell("depois-360x740", 360, "DEPOIS · 360x740"),
    ]),
  ]),
  "comparacao-rolagem": page("Ciclo 01 — Rolagem no layout empilhado: ANTES | DEPOIS", `${SUB} · rolagem em % da altura da tela`, [
    row("ANTES · 390 × 844", await Promise.all(["", "-scroll60", "-scroll100", "-scroll120", "-scroll140", "-scroll160"].map((s) => cell(`antes-390x844${s}`, 260, `antes ${s.replace("-scroll", "") || "0"}%`)))),
    row("DEPOIS · 390 × 844", await Promise.all(["", "-scroll60", "-scroll100", "-scroll120", "-scroll140", "-scroll160"].map((s) => cell(`depois-390x844${s}`, 260, `depois ${s.replace("-scroll", "") || "0"}%`)))),
    row("ANTES · 940 × 900", await Promise.all(["-scroll60", "-scroll100", "-scroll120", "-scroll140", "-scroll160"].map((s) => cell(`antes-940x900${s}`, 330, `antes ${s.replace("-scroll", "")}%`)))),
    row("DEPOIS · 940 × 900", await Promise.all(["-scroll60", "-scroll100", "-scroll120", "-scroll140", "-scroll160"].map((s) => cell(`depois-940x900${s}`, 330, `depois ${s.replace("-scroll", "")}%`)))),
    row("Desktop 1440 × 900 (transição preservada)", [
      await cell("antes-1440x900-scroll60", 430, "antes 60%"), await cell("depois-1440x900-scroll60", 430, "depois 60%"),
      await cell("antes-1440x900-scroll100", 430, "antes 100%"), await cell("depois-1440x900-scroll100", 430, "depois 100%"),
    ]),
  ]),
  "comparacao-recortes": page("Ciclo 01 — Recortes ampliados: ANTES | DEPOIS", SUB, [
    row("1100: coluna editorial × lóbulo esquerdo da escultura (2×)", [
      await cell("antes-1100x800", 720, "ANTES", [60, 330, 560, 250], 1100), await cell("depois-1100x800", 720, "DEPOIS", [60, 330, 560, 250], 1100),
    ]),
    row("1280: lede e CTAs × escultura (2×)", [
      await cell("antes-1280x800", 720, "ANTES", [80, 360, 560, 250], 1280), await cell("depois-1280x800", 720, "DEPOIS", [80, 360, 560, 250], 1280),
    ]),
    row("1440: navegação e controle de movimento (lateral direita)", [
      await cell("antes-1440x900", 500, "ANTES", [1040, 0, 400, 760], 1440), await cell("depois-1440x900", 500, "DEPOIS", [1040, 0, 400, 760], 1440),
    ]),
    row("1024 e 360: quebra da headline", [
      await cell("antes-1024x768", 520, "ANTES · 1024", [60, 80, 520, 560], 1024), await cell("depois-1024x768", 520, "DEPOIS · 1024", [60, 80, 520, 560], 1024),
      await cell("antes-360x740", 330, "ANTES · 360", [0, 360, 360, 380], 360), await cell("depois-360x740", 330, "DEPOIS · 360", [0, 360, 360, 380], 360),
    ]),
    row("Borda direita: botão de movimento em 940 e 390 (2×)", [
      await cell("antes-940x900", 440, "ANTES · 940", [640, 40, 300, 110], 940), await cell("depois-940x900", 440, "DEPOIS · 940", [640, 40, 300, 110], 940),
      await cell("antes-390x844", 320, "ANTES · 390", [230, 40, 160, 110], 390), await cell("depois-390x844", 320, "DEPOIS · 390", [230, 40, 160, 110], 390),
    ]),
    row("940: horizonte e reflexo sob o rótulo e a headline", [
      await cell("antes-940x900", 640, "ANTES", [0, 420, 940, 300], 940), await cell("depois-940x900", 640, "DEPOIS", [0, 420, 940, 300], 940),
    ]),
  ]),
};

const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
for (const [name, html] of Object.entries(sheets)) {
  await p.setContent(html);
  await p.waitForTimeout(400);
  await p.screenshot({ path: dir(`${name}.png`), fullPage: true });
  console.log(dir(`${name}.png`));
}
await b.close();
