// Referência × versão anterior × nova (material e argila, câmera principal e outro ângulo).
// Uso: node scripts/compare-forma.mjs <saida> <captura_anterior.png>
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [name = "comparacao-forma", prev = "estados-depois-v2.png"] = process.argv.slice(2);
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const clip = { x: 600, y: 60, width: 1072, height: 680 };
const errors = [];
const grab = async (q) => {
  const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`http://localhost:3100/?debug&onda=0&${q}`, { waitUntil: "networkidle" });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 30000 });
  await p.waitForTimeout(1500);
  const buf = await p.screenshot({ type: "jpeg", quality: 86, clip });
  await p.close();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
};
const ref = `data:image/png;base64,${(await readFile(fileURLToPath(new URL("../../../referencias/hero/referencia-hero-v1.png", import.meta.url)))).toString("base64")}`;
const old = `data:image/png;base64,${(await readFile(cap(prev))).toString("base64")}`;
const tiles = [
  { label: "referência", html: `<div style="width:100%;aspect-ratio:1072/680;background:url(${ref}) -${600 * 0.746}px -${60 * 0.746}px / ${1672 * 0.746}px auto no-repeat"></div>` },
  // painel superior-esquerdo da folha anterior (estática)
  { label: "anterior (6 fitas)", html: `<div style="width:100%;aspect-ratio:1072/680;background:url(${old}) 0 0 / 200% auto no-repeat"></div>` },
  { label: "nova — fita contínua", src: await grab("") },
  { label: "nova — argila (?clay)", src: await grab("clay") },
  { label: "nova — argila, girada 35°", src: await grab("clay&pose=0,0.6,0") },
  { label: "nova — argila, girada −35°", src: await grab("clay&pose=0,-0.6,0") },
];
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(2,1fr);gap:4px;font:14px monospace;color:#fff">${tiles
  .map((t) => `<figure style="margin:0;position:relative">${t.html ?? `<img src="${t.src}" style="width:100%;display:block">`}<figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${t.label}</figcaption></figure>`)
  .join("")}</body>`;
const sheet = await b.newPage({ viewport: { width: 1600, height: 400 } });
await sheet.setContent(html);
await sheet.waitForTimeout(400);
await sheet.screenshot({ path: cap(`${name}.png`), fullPage: true });
await b.close();
console.log(cap(`${name}.png`), errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
