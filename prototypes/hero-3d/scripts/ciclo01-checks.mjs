// Ciclo 01: botão de movimento (clicável onde está, sem nada por cima, teclado e toque),
// reversibilidade da rolagem (descer e voltar ao topo = quadro inicial) e erros de console.
// Uso: node scripts/ciclo01-checks.mjs [query]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [q = "forma=blender2-v23"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/ciclo01/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const res = {};
for (const [w, h, touch] of [[1440, 900, false], [1100, 800, false], [940, 900, false], [390, 844, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  await p.goto(`http://localhost:3100/?debug&${q}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  await p.addStyleTag({ content: "output{display:none!important}" });
  await p.waitForTimeout(1200);
  const btn = p.getByRole("button", { name: /movimento/ });
  const box = await btn.boundingBox();
  // Quem recebe o clique no centro do botão (nada pode estar por cima).
  const topmost = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-pressed") ?? "outro", [box.x + box.width / 2, box.y + box.height / 2]);
  if (touch) await btn.tap();
  else await btn.click();
  const afterClick = await btn.getAttribute("aria-pressed");
  await btn.focus();
  await p.keyboard.press("Enter");
  const afterKey = await btn.getAttribute("aria-pressed");
  const name = await btn.textContent();
  // Reversibilidade: congela, captura o topo, desce até depois da transição e volta.
  await p.evaluate(() => { const f = window.__fiorbe; f?.freeze(true); f?.holdWaves(true); f?.seekLap(0.62); });
  await p.waitForTimeout(800);
  const a = await p.screenshot();
  for (const y of [h * 0.6, h * 1.2, h * 1.8, h * 0.9, 0]) {
    await p.evaluate((v) => window.scrollTo(0, v), Math.round(y));
    await p.waitForTimeout(900);
  }
  await p.waitForTimeout(1500);
  const c = await p.screenshot({ path: out(`volta-${w}.png`) });
  const diff = await p.evaluate(async ([x, y]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64," + s; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const cv = new OffscreenCanvas(ia.width, ia.height);
    const g = cv.getContext("2d");
    g.drawImage(ia, 0, 0);
    const da = g.getImageData(0, 0, ia.width, ia.height).data;
    g.drawImage(ib, 0, 0);
    const db = g.getImageData(0, 0, ia.width, ia.height).data;
    let n = 0;
    for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 24) n++;
    return Math.round((n / (da.length / 4)) * 10000) / 100;
  }, [a.toString("base64"), c.toString("base64")]);
  res[`${w}x${h}`] = { botao: box && [Math.round(box.x), Math.round(box.y), Math.round(box.x + box.width), Math.round(box.y + box.height)], recebeClique: topmost !== "outro", clique: afterClick, teclado: afterKey, rotulo: name?.trim(), voltaAoTopoPixelsDiferentes: `${diff}%`, erros: errors };
  await ctx.close();
}
console.log(JSON.stringify(res, null, 1));
await b.close();
