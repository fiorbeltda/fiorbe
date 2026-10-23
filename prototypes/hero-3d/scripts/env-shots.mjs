// Capturas do ambiente (ondas congeladas): hero inteiro, piso, contato/figura, iluminação, janela estreita e mobile.
// Uso: node scripts/env-shots.mjs <prefixo> [query extra]   → captures/<prefixo>-<vista>.png
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [prefix = "amb", extra = ""] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
const shoot = async (vp, scale, shots) => {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: scale });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/hydrat/i.test(m.text()) && errors.push(m.text().slice(0, 200)));
  await p.goto(`http://localhost:3100/?forma=${process.env.FORMA ?? "blender2"}&${extra}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  // O pôster estático some com transição de opacidade: esperar sumir de fato.
  await p.waitForFunction(() => [...document.querySelectorAll('img[class*="poster"]')].every((el) => parseFloat(getComputedStyle(el).opacity) < 0.01), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1200);
  await p.evaluate(() => { window.__fiorbe?.holdWaves(true); window.__fiorbe?.seekLap(0.62); });
  await p.waitForTimeout(300);
  for (const [name, clip] of shots) await p.screenshot({ path: out(`${prefix}-${name}.png`), ...(clip ? { clip } : {}) });
  await p.close();
};
await shoot({ width: 1672, height: 941 }, 1, [["hero", null]]);
await shoot({ width: 1672, height: 941 }, 2, [
  ["piso", { x: 760, y: 600, width: 912, height: 341 }],
  ["contato", { x: 1180, y: 520, width: 492, height: 300 }],
  ["luz", { x: 1150, y: 120, width: 522, height: 560 }],
]);
await shoot({ width: 1000, height: 941 }, 1, [["estreito", null]]);
await shoot({ width: 390, height: 844 }, 2, [["mobile", null]]);
await b.close();
console.log(prefix, errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
