// Escultura no enquadramento do hero (1672×941, mesma câmera da referência), sem onda:
// argila e material. Uso: FORMA=blender2-b node scripts/sculpt-shots.mjs <prefixo> → captures/<prefixo>-argila.png / -metal.png
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [prefix = "esc"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
for (const [name, q] of [["argila", "clay"], ["metal", ""]]) {
  const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/hydrat/i.test(m.text()) && errors.push(m.text().slice(0, 200)));
  await p.goto(`http://localhost:3100/?debug&onda=0&forma=${process.env.FORMA ?? "blender2-b"}&${q}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  await p.waitForFunction(() => [...document.querySelectorAll('img[class*="poster"]')].every((el) => parseFloat(getComputedStyle(el).opacity) < 0.01), null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1200);
  await p.screenshot({ path: out(`${prefix}-${name}.png`) });
  await p.close();
}
await b.close();
console.log(prefix, errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
