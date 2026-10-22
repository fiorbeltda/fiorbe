// Comparação visual no MESMO enquadramento da referência (1672×941).
// Uso: node scripts/compare.mjs <rótulo>
//   - captura o protótipo atual em captures/cmp-<rótulo>.png
//   - monta captures/compare-<rótulo>.png: referência | baseline | <rótulo>
import { chromium } from "playwright-core";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const label = process.argv[2] ?? "atual";
const W = 1672;
const H = 941;
const cap = (n) => fileURLToPath(new URL(`../captures/${n}`, import.meta.url));
const ref = fileURLToPath(new URL("../../../referencias/hero/referencia-hero-v1.png", import.meta.url));

const browser = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto("http://localhost:3100/", { waitUntil: "networkidle" });
await page.waitForSelector('canvas[data-status="live"]', { timeout: 20000 });
await page.waitForTimeout(1800);
await page.screenshot({ path: cap(`cmp-${label}.png`) });

const img = (p) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;
const cells = [["Referência", ref]];
if (existsSync(cap("cmp-baseline.png")) && label !== "baseline") cells.push(["Baseline (antes)", cap("cmp-baseline.png")]);
cells.push([label, cap(`cmp-${label}.png`)]);
const html = `<body style="margin:0;background:#000;font:600 22px sans-serif;color:#fff">${cells
  .map(([t, p]) => `<figure style="margin:0 0 6px;position:relative"><img src="${img(p)}" style="width:${W}px;display:block"><figcaption style="position:absolute;left:12px;top:12px;background:#000c;padding:4px 10px">${t}</figcaption></figure>`)
  .join("")}</body>`;
const sheet = await browser.newPage({ viewport: { width: W, height: 400 } });
await sheet.setContent(html);
await sheet.screenshot({ path: cap(`compare-${label}.png`), fullPage: true });
await browser.close();
console.log(cap(`compare-${label}.png`));
