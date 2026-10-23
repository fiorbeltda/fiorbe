// Fallbacks: sem JavaScript (pôster + texto), sem WebGL (pôster, sem erro) e movimento
// reduzido (nada se move: dois quadros iguais). Uso: node scripts/fallback-check.mjs [query]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [q = "forma=blender2-v22"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const res = {};
// Sem JS
let b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
let ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
let p = await ctx.newPage();
await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "load" });
res.semJS = await p.evaluate(() => ({ h1: document.querySelector("h1")?.textContent?.slice(0, 30), poster: Boolean(document.querySelector('img[class*="poster"]')) }));
await p.screenshot({ path: out("fallback-semjs.png") }).catch(() => (res.semJSCaptura = "falhou"));
await b.close();
// Sem WebGL
b = await chromium.launch({ headless: true, args: ["--disable-gpu", "--disable-webgl", "--disable-3d-apis"] });
p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
res.semWebGL = await p.evaluate(() => ({ status: document.querySelector("canvas")?.dataset.status, poster: getComputedStyle(document.querySelector('img[class*="poster"]')).opacity }));
res.semWebGL.erros = errs.length;
await p.screenshot({ path: out("fallback-semwebgl.png") }).catch(() => (res.semWebGLCaptura = "falhou"));
await b.close();
// Movimento reduzido: dois quadros com 1,5 s de intervalo devem ser iguais.
b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle" });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
await p.waitForTimeout(2500);
await p.mouse.move(1100, 450, { steps: 6 });
const a1 = await p.screenshot({ clip: { x: 560, y: 80, width: 860, height: 560 } });
await p.mouse.move(1250, 420, { steps: 6 });
await p.waitForTimeout(1500);
const a2 = await p.screenshot({ clip: { x: 560, y: 80, width: 860, height: 560 } });
res.reduzidoQuadrosIguais = Buffer.compare(a1, a2) === 0;
await b.close();
console.log(JSON.stringify(res, null, 1));
