// Ciclo 06: interface em DPR 2 (cena congelada) + estados hover/foco/pressionado dos controles.
// Uso: node scripts/ciclo06-ui.mjs <prefixo> [query]  → captures/ciclo06/<prefixo>-ui*.png
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [prefix = "antes", q = "forma=blender2-v23"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/ciclo06/${prefix}-${f}.png`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto(`${process.env.BASE ?? "http://localhost:3100/"}?debug&${q}`, { waitUntil: "networkidle", timeout: 90000 });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
await p.addStyleTag({ content: "output{display:none!important} nextjs-portal{display:none!important}" });
await p.waitForTimeout(1200);
await p.evaluate(() => { const f = window.__fiorbe; f?.freeze(true); f?.holdWaves(true); f?.seekLap(0.62); });
await p.mouse.move(700, 880);
await p.waitForTimeout(600);
await p.screenshot({ path: out("ui") });
const states = [];
const shot = async (label, loc, pad = 16) => {
  const bb = await loc.boundingBox();
  states.push([label, await p.screenshot({ clip: { x: bb.x - pad, y: bb.y - pad, width: bb.width + pad * 2, height: bb.height + pad * 2 } })]);
};
for (const [name, loc] of [
  ["Conversar", p.locator("header a", { hasText: "Conversar" })],
  ["Produtos", p.locator("nav a", { hasText: "Produtos" })],
  ["Conhecer", p.locator("a", { hasText: "Conhecer a FIORBE" })],
  ["Motor", p.locator("a", { hasText: "Ver o Motor Fiscal" })],
  ["Pausa", p.getByRole("button", { name: /movimento/ })],
]) {
  await p.mouse.move(700, 880); await p.waitForTimeout(250);
  await shot(`${name} · normal`, loc);
  await loc.hover(); await p.waitForTimeout(350);
  await shot(`${name} · hover`, loc);
  const bb = await loc.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(120);
  await shot(`${name} · pressionado`, loc);
  await p.mouse.move(700, 880); await p.mouse.up(); await p.waitForTimeout(250);
  await loc.focus(); await p.evaluate(() => document.activeElement?.blur()); await p.keyboard.press("Tab").catch(() => {});
  await loc.evaluate((el) => el.focus({ focusVisible: true })); await p.waitForTimeout(250);
  await shot(`${name} · foco teclado`, loc);
  await p.evaluate(() => document.activeElement?.blur());
}
const sh = await b.newPage({ viewport: { width: 1400, height: 400 } });
await sh.setContent(`<body style="margin:0;background:#000;color:#fff;font:12px monospace;width:max-content"><div style="display:grid;grid-template-columns:repeat(4,auto);gap:8px;padding:8px;align-items:start">${states.map(([l, f]) => `<figure style="margin:0"><figcaption>${l}</figcaption><img src="data:image/png;base64,${f.toString("base64")}" style="display:block;height:${l.startsWith("Produtos") ? 60 : 90}px"></figure>`).join("")}</div></body>`);
await sh.waitForTimeout(300);
await sh.screenshot({ path: out("estados"), fullPage: true });
console.log(out("estados"));
await b.close();
