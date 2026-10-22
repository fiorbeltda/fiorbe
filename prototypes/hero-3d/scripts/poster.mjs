// Gera o poster estático a partir do próprio render (fundo transparente).
// Saída em src/assets (import estático com hash no componente).
// Uso: node scripts/poster.mjs   (servidor em :3100)
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
await page.waitForSelector('canvas[data-status="live"]', { timeout: 20000 });
await page.waitForTimeout(1200);
await page.addStyleTag({ content: "html,body{background:transparent!important} body *{visibility:hidden!important} canvas{visibility:visible!important}" });
await page.waitForTimeout(300);
const stage = await page.locator('div[data-status="live"]').boundingBox();
const path = fileURLToPath(new URL("../src/assets/hero-poster.png", import.meta.url));
await page.screenshot({ path, omitBackground: true, clip: stage });
await browser.close();
console.log(path, stage);
