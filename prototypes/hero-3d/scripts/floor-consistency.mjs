// Consistência do piso na MESMA URL: carga larga, carga estreita → alargada, após alguns segundos,
// e após redimensionar. Espera a cena ficar pronta (canvas live + 1º quadro com piso) em vez de tempo fixo.
// Uso: node scripts/floor-consistency.mjs <prefixo> [query]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [prefix = "consist", q = "forma=blender2-b"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
const ready = async (p) => {
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 90000 });
  await p.waitForFunction(() => window.__fiorbe && window.__fiorbe.floor, null, { timeout: 30000 });
  // O pôster estático só some depois de uma transição de opacidade: esperar ele sumir de fato.
  await p.waitForFunction(() => [...document.querySelectorAll('img[class*="poster"]')].every((el) => parseFloat(getComputedStyle(el).opacity) < 0.01), null, { timeout: 30000 });
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
};
const freeze = (p) => p.evaluate(() => { window.__fiorbe.holdWaves(true); window.__fiorbe.seekLap(0.62); });
const info = (p) => p.evaluate(() => window.__fiorbe.floor());
const cases = [
  ["largo", { width: 1672, height: 941 }, null],
  ["estreito-alargado", { width: 1000, height: 941 }, { width: 1672, height: 941 }],
  ["largo-redimensionado", { width: 1672, height: 941 }, { width: 1440, height: 900 }],
];
for (const [name, vp, resizeTo] of cases) {
  const p = await b.newPage({ viewport: vp });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/hydrat/i.test(m.text()) && errors.push(m.text().slice(0, 200)));
  await p.goto(`http://localhost:3100/?debug&${q}`, { waitUntil: "networkidle", timeout: 90000 });
  await ready(p);
  if (resizeTo) {
    await p.setViewportSize(resizeTo);
    await p.evaluate(() => new Promise((r) => setTimeout(r, 400)));
    await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  await freeze(p);
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const vpNow = p.viewportSize();
  await p.screenshot({ path: out(`${prefix}-${name}.png`), clip: { x: vpNow.width * 0.45, y: vpNow.height * 0.55, width: vpNow.width * 0.55, height: vpNow.height * 0.4 } });
  const { svgHidden } = await info(p);
  console.log(name, JSON.stringify({ svgHidden }));
  if (name === "largo") {
    await p.evaluate(() => new Promise((r) => setTimeout(r, 5000)));
    await freeze(p);
    await p.screenshot({ path: out(`${prefix}-largo-5s.png`), clip: { x: 752, y: 517, width: 920, height: 376 } });
  }
  await p.close();
}
await b.close();
console.log(errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
