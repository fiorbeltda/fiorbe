// Ciclo 01b: explora variantes de composição injetando CSS (sem mudar o código) e
// captura em condições iguais às de ciclo01.mjs. Uso: node scripts/ciclo01-variants.mjs
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL("../captures/ciclo01b/", import.meta.url));
const HERO = 'section[aria-labelledby="hero-title"]';
const STAGE = `${HERO} > div[data-status]`;
// Faixa 1024–1279: margem que encontra 8,25vw em 1280, coluna editorial justa, CTAs compactos.
const tight = (reserve, right) => `
${HERO}{--hero-gutter:clamp(20px,min(8.25vw,calc(16.4vw - 104px)),160px)!important;--copy-reserve:calc(var(--hero-gutter) + ${reserve}px)!important}
${HERO} h1 ~ div a{height:46px!important;padding:0 20px!important;font-size:15px!important}
${HERO} h1 ~ div{gap:12px!important}
${STAGE}{right:${right}!important}`;
const VARIANTS = {
  v0: "",
  v1: tight(400, "1%"),
  v2: tight(400, "-4%"),
  v3: tight(380, "1%"),
};
const only = process.env.ONLY?.split(",");
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
for (const [w, h] of [[1024, 768], [1100, 800], [1200, 800]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto(`http://localhost:3100/?debug&forma=blender2-v23`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  const base = await p.addStyleTag({ content: "output{display:none!important}" });
  void base;
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const f = window.__fiorbe; f?.freeze(true); f?.holdWaves(true); f?.seekLap(0.62); });
  for (const [name, css] of Object.entries(VARIANTS)) {
    if (only && !only.includes(name)) continue;
    await p.evaluate((c) => {
      let s = document.getElementById("variant");
      if (!s) { s = document.createElement("style"); s.id = "variant"; document.head.append(s); }
      s.textContent = c;
      window.dispatchEvent(new Event("resize"));
    }, css);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${dir}${name}-${w}x${h}.png` });
    const m = await p.evaluate(() => {
      const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
      const btns = [...document.querySelectorAll("h1 ~ div a")].map(r);
      return { stage: r(document.querySelector('section > div[data-status]')), lede: r(document.querySelector("h1 + p")), ctas: [btns[0][0], btns[0][1], btns.at(-1)[2], btns[0][3]], fig: window.__fiorbe?.figure?.() ? "ok" : "" };
    });
    console.log(name, `${w}x${h}`, JSON.stringify(m));
  }
  await p.close();
}
await b.close();
