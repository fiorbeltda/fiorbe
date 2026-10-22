// Checagens essenciais da escultura: mobile, arraste, scroll, pausa,
// reduced motion e custo de GPU com/sem onda+desfiar.
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
const open = async (vp, q = "debug", extra = {}) => {
  const ctx = await b.newContext({ viewport: vp, ...extra });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/hydrat/i.test(m.text()) && errors.push(m.text().slice(0, 200)));
  await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle" });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1500);
  return { p, ctx };
};
const shots = [];
const shot = async (p, label) => { const buf = await p.screenshot({ type: "jpeg", quality: 80 }); shots.push({ src: `data:image/jpeg;base64,${buf.toString("base64")}`, label }); };
// Desktop: arraste + scroll + pausa.
{
  const { p, ctx } = await open({ width: 1440, height: 900 });
  await p.evaluate(() => { window.__fiorbe.holdWaves(true); window.__fiorbe.stepWaves(9); });
  await p.mouse.move(1050, 420); await p.mouse.down(); await p.mouse.move(1250, 440, { steps: 12 }); await p.waitForTimeout(150);
  await shot(p, "1440 arrastando (onda ativa)");
  await p.mouse.up(); await p.waitForTimeout(1500);
  await p.evaluate(() => window.scrollTo(0, window.innerHeight * 0.45)); await p.waitForTimeout(1200);
  await shot(p, "1440 scroll 45%");
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1500);
  await p.evaluate(() => window.__fiorbe.holdWaves(false));
  const btn = p.getByRole("button", { name: /pausar/i });
  const before = await p.evaluate(() => window.__fiorbe.waves());
  await btn.click(); await p.waitForTimeout(1500);
  const a1 = await p.evaluate(() => window.__fiorbe.waves()); await p.waitForTimeout(1000);
  const a2 = await p.evaluate(() => window.__fiorbe.waves());
  console.log("pausa: onda congelada?", JSON.stringify(a1) === JSON.stringify(a2), JSON.stringify(a2), "antes", JSON.stringify(before));
  await ctx.close();
}
// Mobile 390.
{
  const { p, ctx } = await open({ width: 390, height: 844 }, "debug", { deviceScaleFactor: 1 });
  await p.evaluate(() => { window.__fiorbe?.holdWaves(true); window.__fiorbe?.stepWaves(9); });
  await p.waitForTimeout(300);
  await shot(p, "390 entrada (onda ativa)");
  await ctx.close();
}
// Reduced motion.
{
  const { p, ctx } = await open({ width: 1440, height: 900 }, "debug", { reducedMotion: "reduce" });
  const w1 = await p.evaluate(() => window.__fiorbe?.waves?.() ?? "sem engine"); await p.waitForTimeout(1500);
  const w2 = await p.evaluate(() => window.__fiorbe?.waves?.() ?? "sem engine");
  console.log("reduced motion: ondas", JSON.stringify(w1), JSON.stringify(w2));
  await shot(p, "1440 reduced motion");
  await ctx.close();
}
// Custo de GPU (bench sincronizado), 1440, com e sem onda/desfiar.
for (const q of ["debug&onda=0&fios=0", "debug"]) {
  const { p, ctx } = await open({ width: 1440, height: 900 }, q);
  await p.evaluate(() => { window.__fiorbe.holdWaves(true); window.__fiorbe.stepWaves(9); });
  const r = [];
  for (let i = 0; i < 3; i++) r.push((await p.evaluate(() => window.__fiorbe.bench(90))).msPerFrame);
  console.log(`bench ${q}: ${r.join(" / ")} ms`);
  await ctx.close();
}
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(2,1fr);gap:4px;font:13px monospace;color:#fff">${shots
  .map((x) => `<figure style="margin:0;position:relative"><img src="${x.src}" style="width:100%;max-height:900px;object-fit:contain;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${x.label}</figcaption></figure>`)
  .join("")}</body>`;
const sheet = await b.newPage({ viewport: { width: 1600, height: 400 } });
await sheet.setContent(html); await sheet.waitForTimeout(300);
await sheet.screenshot({ path: out("checagens-rib-v2.png"), fullPage: true });
await b.close();
console.log(out("checagens-rib-v2.png"), errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
