// Captura única para revisão: node scripts/still.mjs <nome> <largura> <altura> [query]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [name, w = "1440", h = "900", q = "debug"] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
await page.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle" });
await page.waitForSelector('canvas[data-status="live"]', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1600);
const path = fileURLToPath(new URL(`../captures/${name}.png`, import.meta.url));
await page.screenshot({ path });
await browser.close();
console.log(path);
