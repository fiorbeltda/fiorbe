// ENT-003: evidências da build de produção — A (Hero atual "/") × B (Entrelace 003, /editorial/entrelace-v3)
// nas mesmas condições (cena congelada na mesma fase, mouse fora do palco), detalhes da headline e
// do cenário L3, poses reais da escultura com o recorte correspondente e um vídeo curto do movimento.
// Uso: node scripts/entrelace-evidencias.mjs   (BASE = servidor de produção; padrão http://localhost:3110)
import { chromium } from "playwright-core";
import { mkdir, readdir, rename } from "node:fs/promises";
const base = (process.env.BASE ?? "http://localhost:3110").replace(/\/$/, "");
const out = "captures/entrelace/evidencias";
await mkdir(`${out}/video`, { recursive: true });
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const A = "/", B = "/editorial/entrelace-v3";

async function open(path, w, h, dpr, extra = {}) {
  const mobile = w < 768;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: mobile, isMobile: mobile, ...extra });
  const p = await ctx.newPage();
  await p.goto(`${base}${path}?debug`, { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 90000 });
  await p.addStyleTag({ content: "output{display:none!important}" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  return { p, ctx };
}
const freeze = (p, lap = 0.62) => p.evaluate((l) => { const f = window.__fiorbe; f.freeze(true); f.holdWaves(true); f.seekLap(l); }, lap);

// 1. A × B nos quatro tamanhos pedidos.
for (const [w, h, dpr] of [[1440, 900, 1], [1920, 1080, 1], [390, 844, 2], [360, 640, 2]]) {
  for (const [k, path] of [["A", A], ["B", B]]) {
    const { p, ctx } = await open(path, w, h, dpr);
    await freeze(p);
    if (w >= 768) await p.mouse.move(w / 2, h - 4);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/${k}-${w}x${h}.png` });
    await ctx.close();
  }
}

// 2. Detalhes (DPR 2): headline/máscara e cenário L3.
{
  const { p, ctx } = await open(B, 1440, 900, 2);
  await freeze(p);
  await p.mouse.move(720, 896);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/B-detalhe-headline.png`, clip: { x: 520, y: 110, width: 820, height: 360 } });
  await p.screenshot({ path: `${out}/B-detalhe-L3.png`, clip: { x: 560, y: 0, width: 880, height: 800 } });
  await ctx.close();
}

// 3. Poses reais: fases diferentes da onda e do ambiente, cursor e arraste — o recorte acompanha.
{
  const { p, ctx } = await open(B, 1440, 900, 1);
  await p.mouse.move(720, 896);
  const poses = [];
  for (const [n, lap, idle] of [["P1-repouso", 0.62, 2], ["P2-onda", 0.15, 9], ["P3-ambiente", 0.4, 17]]) {
    await p.evaluate(([l, t]) => { const f = window.__fiorbe; f.freeze(true, t); f.holdWaves(true); f.seekLap(l); }, [lap, idle]);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/${n}.png` });
    poses.push(n);
  }
  for (let i = 0; i < 16; i++) await p.mouse.move(980 + i * 22, 300, { steps: 2 });
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `${out}/P4-cursor.png` });
  await p.mouse.move(1000, 430); await p.mouse.down();
  for (let i = 0; i < 12; i++) await p.mouse.move(1000 - i * 24, 430, { steps: 3 });
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${out}/P5-arraste.png` });
  await p.mouse.up();
  await p.evaluate(() => scrollTo(0, 150));
  await p.mouse.move(720, 896);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/P6-rolagem.png` });
  await ctx.close();
}

// 4. Vídeo do movimento real (sem congelar): ambiente, onda, cursor, arraste, pausa, rolagem.
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: `${out}/video`, size: { width: 1440, height: 900 } } });
  const p = await ctx.newPage();
  await p.goto(`${base}${B}`, { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 90000 });
  await p.mouse.move(720, 896);
  await p.waitForTimeout(4000);
  for (let i = 0; i < 30; i++) await p.mouse.move(900 + i * 14, 320 + Math.sin(i / 4) * 60, { steps: 3 });
  await p.waitForTimeout(800);
  await p.mouse.move(1000, 430); await p.mouse.down();
  for (let i = 0; i < 20; i++) await p.mouse.move(1000 - i * 14, 430, { steps: 4 });
  await p.mouse.up();
  await p.mouse.move(720, 896);
  await p.waitForTimeout(3500);
  for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, 90); await p.waitForTimeout(110); }
  await p.waitForTimeout(800);
  for (let i = 0; i < 10; i++) { await p.mouse.wheel(0, -90); await p.waitForTimeout(110); }
  await p.waitForTimeout(2500);
  await ctx.close();
  const files = (await readdir(`${out}/video`)).filter((f) => f.endsWith(".webm") && !f.startsWith("entrelace"));
  if (files[0]) await rename(`${out}/video/${files[0]}`, `${out}/video/entrelace-movimento-real.webm`);
}
await b.close();
console.log("ok", out);
