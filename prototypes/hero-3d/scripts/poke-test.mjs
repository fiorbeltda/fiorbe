// RIB-004 — toque local: cursor contextual, amassado + pulsos ao varrer uma lâmina (sequência
// no tempo), arraste só sobre a peça, pausa e movimento reduzido anulando a reação.
// Uso: node scripts/poke-test.mjs [forma] [prefixo]   → captures/<prefixo>-seq.png
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
const [forma = "blender2-v22", prefix = "toque"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
const open = async (extra = "", opts = {}) => {
  const p = await b.newPage({ viewport: { width: 1672, height: 941 }, ...opts });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/hydrat/i.test(m.text()) && errors.push(m.text().slice(0, 200)));
  await p.goto(`http://localhost:3100/?debug&onda=0&forma=${forma}${extra}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  await p.waitForFunction(() => [...document.querySelectorAll('img[class*="poster"]')].every((el) => parseFloat(getComputedStyle(el).opacity) < 0.01), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(800);
  return p;
};
const stageState = (p) => p.evaluate(() => {
  const el = document.querySelector('div[class*="__stage"]');
  return { over: el?.dataset.over === "true", dragging: el?.dataset.dragging === "true", cursor: el ? getComputedStyle(el).cursor : null };
});
const clip = { x: 860, y: 300, width: 640, height: 330 };
const p = await open();
const report = {};
await p.mouse.move(300, 420);
await p.waitForTimeout(250);
report.vazio = await stageState(p);
const shots = [];
shots.push(["repouso", await p.screenshot({ clip })]);
// Faixa central (diagonal): pousa o cursor sobre ela.
await p.mouse.move(1180, 485, { steps: 4 });
await p.waitForTimeout(700);
report.sobre = await stageState(p);
shots.push(["cursor parado", await p.screenshot({ clip })]);
// Varredura rápida ao longo da faixa.
await p.mouse.move(980, 520, { steps: 2 });
await p.mouse.move(1340, 455, { steps: 6 });
for (const [label, wait] of [["varrendo +0,1 s", 100], ["+0,4 s (pulso correndo)", 300], ["+0,9 s", 500], ["+2,5 s (recuperado)", 1600]]) {
  await p.waitForTimeout(wait);
  shots.push([label, await p.screenshot({ clip })]);
}
// Arraste: começa no vazio → não gira; sobre a peça → grabbing.
await p.mouse.move(300, 420);
await p.mouse.down();
await p.mouse.move(420, 420, { steps: 5 });
report.arrasteNoVazio = await stageState(p);
await p.mouse.up();
await p.mouse.move(1180, 485, { steps: 3 });
await p.waitForTimeout(200);
await p.mouse.down();
await p.mouse.move(1260, 485, { steps: 5 });
report.arrasteNaPeca = await stageState(p);
await p.mouse.up();
// Pausa: amassado e pulsos zerados.
await p.click('button:has-text("Pausar")').catch(() => {});
await p.mouse.move(1000, 520, { steps: 2 });
await p.mouse.move(1340, 455, { steps: 6 });
await p.waitForTimeout(150);
report.pausado = await stageState(p);
shots.push(["pausado (varrendo)", await p.screenshot({ clip })]);
await p.close();
const r = await open("", { reducedMotion: "reduce" });
await r.mouse.move(1180, 485, { steps: 4 });
await r.waitForTimeout(300);
report.reduzido = await stageState(r);
await r.close();
// Folha.
const tiles = shots.map(([l, buf]) => `<figure style="margin:0;position:relative"><img src="data:image/png;base64,${buf.toString("base64")}" style="width:100%;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${l}</figcaption></figure>`);
const sheet = await b.newPage({ viewport: { width: 1600, height: 600 } });
await sheet.setContent(`<body style="margin:0;background:#000;font:14px monospace;color:#fff;display:grid;grid-template-columns:1fr 1fr;gap:4px">${tiles.join("")}</body>`);
await sheet.waitForTimeout(400);
await sheet.screenshot({ path: out(`${prefix}-seq.png`), fullPage: true });
await b.close();
console.log(JSON.stringify(report, null, 1));
console.log(errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
void readFile;
