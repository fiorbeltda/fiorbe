// Interface do hero: CTAs (repouso, hover, foco por teclado), navbar, barra inferior e
// rolagem horizontal em várias larguras. Uso: node scripts/ui-check.mjs [query] [prefixo]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [q = "forma=blender2-v22", prefix = "ui"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 2 });
await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle", timeout: 90000 });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
await p.waitForTimeout(2500);
const left = { x: 120, y: 120, width: 560, height: 620 };
await p.screenshot({ path: out(`${prefix}-texto.png`), clip: left });
const cta = p.locator("a, button").filter({ hasText: "Conhecer a FIORBE" }).first();
await cta.hover();
await p.waitForTimeout(400);
await p.screenshot({ path: out(`${prefix}-hover.png`), clip: { x: 120, y: 580, width: 560, height: 160 } });
await p.mouse.move(5, 500);
await p.keyboard.press("Tab");
const focusOrder = [];
for (let i = 0; i < 8; i++) {
  focusOrder.push(await p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}:${(a.textContent || a.getAttribute("aria-label") || "").trim().slice(0, 30)}` : ""; }));
  if (/Conhecer/.test(focusOrder.at(-1))) await p.screenshot({ path: out(`${prefix}-foco.png`), clip: { x: 120, y: 580, width: 560, height: 160 } });
  await p.keyboard.press("Tab");
}
await p.screenshot({ path: out(`${prefix}-nav.png`), clip: { x: 100, y: 10, width: 1572, height: 90 } });
await p.screenshot({ path: out(`${prefix}-barra.png`), clip: { x: 120, y: 760, width: 1440, height: 160 } });
console.log("foco:", focusOrder.join(" → "));
for (const w of [390, 768, 1000, 1366, 1920]) {
  await p.setViewportSize({ width: w, height: 900 });
  await p.waitForTimeout(300);
  console.log(w, await p.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth })));
}
await b.close();
