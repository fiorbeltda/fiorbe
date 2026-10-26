// Ciclo 01 (composição): captura comparável de cada viewport — ondas e movimento ambiente
// congelados na mesma fase, DPR 1, mouse fora do palco — mais a rolagem (60% e 100% da
// altura) e medidas da interface. Uso: node scripts/ciclo01.mjs <prefixo> [query]
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [prefix = "antes", q = "forma=blender2-v23"] = process.argv.slice(2);
const dir = fileURLToPath(new URL(`../captures/${process.env.CAPDIR ?? "ciclo01"}/`, import.meta.url));
await mkdir(dir, { recursive: true });
const VIEWS = [
  ["1440x900", 1440, 900],
  ["1280x800", 1280, 800],
  ["1100x800", 1100, 800],
  ["940x900", 940, 900],
  ["390x844", 390, 844],
];
// VIEWS=1440x900,1024x768 — filtra a lista ou acrescenta tamanhos fora dela.
const only = process.env.VIEWS?.split(",");
for (const v of only ?? []) if (!VIEWS.some(([t]) => t === v)) VIEWS.push([v, ...v.split("x").map(Number)]);
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const report = {};
for (const [tag, w, h] of VIEWS) {
  if (only && !only.includes(tag)) continue;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 768, isMobile: w < 768 });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(`${process.env.BASE ?? "http://localhost:3100/"}?debug&${q}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  await p.addStyleTag({ content: "output{display:none!important}" });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const f = window.__fiorbe; f?.freeze(true); f?.holdWaves(true); f?.seekLap(0.62); });
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${dir}${prefix}-${tag}.png` });
  report[tag] = await p.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
    const t = document.querySelector("h1");
    const lh = parseFloat(getComputedStyle(t).lineHeight);
    const pause = [...document.querySelectorAll("button")].find((x) => /movimento/.test(x.textContent));
    const pb = pause?.getBoundingClientRect();
    return {
      scrollW: document.documentElement.scrollWidth, innerW: innerWidth,
      header: r("header"), title: r("h1"), titleLines: Math.round(t.getBoundingClientRect().height / lh), titleSize: getComputedStyle(t).fontSize,
      lede: r("h1 + p"), actions: r("h1 ~ div"), status: r("h1 ~ p:last-of-type"), band: r("ul[aria-label]"),
      stage: r("[data-status]:not(canvas)"), pause: pb ? [Math.round(pb.left), Math.round(pb.top), Math.round(pb.right), Math.round(pb.bottom)] : null,
      docH: document.documentElement.scrollHeight,
    };
  });
  for (const f of (process.env.SCROLLS ?? "0.6,1").split(",").map(Number)) {
    await p.evaluate((y) => window.scrollTo(0, y), Math.round(h * f));
    await p.waitForTimeout(1600);
    await p.screenshot({ path: `${dir}${prefix}-${tag}-scroll${Math.round(f * 100)}.png` });
  }
  report[tag].errors = errors;
  await p.close();
  console.log(tag, JSON.stringify(report[tag]));
}
await writeFile(`${dir}${prefix}-medidas.json`, JSON.stringify(report, null, 2));
await b.close();
