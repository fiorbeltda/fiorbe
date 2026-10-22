// Folha de contato para direção de arte: várias poses/tons lado a lado numa imagem.
// Uso: node scripts/sheet.mjs <nome> "<query1>" "<query2>" ...
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [name, ...queries] = process.argv.slice(2);
const out = fileURLToPath(new URL("../captures/", import.meta.url));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const cells = [];
for (const q of queries) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle" });
  await page.waitForSelector('canvas[data-status="live"]', { timeout: 20000 });
  await page.waitForTimeout(1500);
  const buf = await page.screenshot({ type: "jpeg", quality: 80 });
  cells.push({ q, src: `data:image/jpeg;base64,${buf.toString("base64")}` });
  await page.close();
}
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(${Math.min(3, cells.length)},1fr);gap:4px;font:14px sans-serif;color:#fff">${cells
  .map((c) => `<figure style="margin:0;position:relative"><img src="${c.src}" style="width:100%;display:block"><figcaption style="position:absolute;left:8px;top:8px;background:#000c;padding:2px 6px">${c.q}</figcaption></figure>`)
  .join("")}</body>`;
const sheet = await browser.newPage({ viewport: { width: 1800, height: 400 } });
await sheet.setContent(html);
await sheet.screenshot({ path: `${out}${name}.png`, fullPage: true });
await browser.close();
console.log(`${out}${name}.png`);
