// ENT-003: verificações funcionais do Entrelace com o motor real (sem congelar a cena).
// Movimento natural, cursor, arraste + inércia, toque (sintético), rolagem reversível, pausa,
// teclado, movimento reduzido, sem WebGL, sem JS. Gera quadros e um JSON de medidas.
// Uso: node scripts/entrelace-checks.mjs [rota] [saída]   (BASE = servidor)
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
const [route = "/editorial/entrelace-v3", out = "captures/entrelace/funcional"] = process.argv.slice(2);
const base = (process.env.BASE ?? "http://localhost:3120").replace(/\/$/, "");
await mkdir(out, { recursive: true });
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const R = {};

/** Fração de pixels diferentes (> limiar) entre duas capturas PNG do mesmo recorte. */
async function diff(page, a, c) {
  return page.evaluate(async ([a64, c64]) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = "data:image/png;base64," + s; });
    const [ia, ic] = await Promise.all([load(a64), load(c64)]);
    const cv = document.createElement("canvas"); cv.width = ia.width; cv.height = ia.height;
    const g = cv.getContext("2d"); g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, cv.width, cv.height).data;
    g.clearRect(0, 0, cv.width, cv.height); g.drawImage(ic, 0, 0); const dc = g.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - dc[i]) + Math.abs(da[i + 1] - dc[i + 1]) + Math.abs(da[i + 2] - dc[i + 2]) > 24) n++;
    return Math.round((n / (da.length / 4)) * 10000) / 100; // %
  }, [a.toString("base64"), c.toString("base64")]);
}

async function open(w, h, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: !!opts.touch, isMobile: !!opts.touch, reducedMotion: opts.reduced ? "reduce" : "no-preference", javaScriptEnabled: opts.js !== false });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(`${base}${route}${opts.q ?? ""}`, { waitUntil: "networkidle", timeout: 120000 });
  if (opts.js !== false && !opts.q?.includes("nowebgl")) await p.waitForSelector('canvas[data-status="live"]', { timeout: 90000 });
  if (opts.js !== false) await p.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  if (opts.js !== false) await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1800);
  return { p, ctx, errors };
}

// ---------- Desktop 1440 ----------
{
  const { p, ctx, errors } = await open(1440, 900);
  const head = await p.evaluate(() => { const r = document.getElementById("ent-title").getBoundingClientRect(); return { x: Math.max(0, r.left - 12), y: Math.max(0, r.top - 12), width: r.width + 24, height: r.height + 24 }; });
  const shot = (name, clip) => p.screenshot({ path: name ? `${out}/${name}.png` : undefined, clip });
  await p.mouse.move(720, 896);
  // 1–2. Movimento natural + onda: o recorte muda com a escultura (sem congelar nada).
  const t0 = await shot("01-movimento-t0");
  await p.waitForTimeout(2500);
  const t1 = await shot("02-movimento-t2_5s");
  R.movimento = { quadroInteiro: await diff(p, t0, t1), headline: await diff(p, await p.screenshot({ clip: head }), (await p.waitForTimeout(2500), await p.screenshot({ clip: head }))) };
  // 3. Cursor à direita (resposta limitada por mola).
  for (let i = 0; i < 20; i++) await p.mouse.move(900 + i * 20, 380, { steps: 2 });
  await p.waitForTimeout(900);
  const cur = await shot("03-cursor-direita");
  R.cursor = { vsRepouso: await diff(p, t1, cur) };
  // 4. Arraste + inércia (ponto sobre a escultura).
  await p.mouse.move(1000, 420); await p.mouse.down();
  for (let i = 0; i < 10; i++) await p.mouse.move(1000 + i * 26, 420, { steps: 3 });
  const drag = await shot("04-arraste");
  await p.mouse.up();
  await p.waitForTimeout(250);
  const inertia = await shot("05-inercia-250ms");
  await p.waitForTimeout(3500);
  const back = await shot("06-retorno-3_5s");
  R.arraste = { duranteVsCursor: await diff(p, cur, drag), inerciaVsArraste: await diff(p, drag, inertia), retornoVsArraste: await diff(p, drag, back) };
  await p.mouse.move(720, 896);
  // 8. Pausa: botão real (clique); quadros idênticos com a pausa; estado visual e aria-pressed.
  const btn = p.getByRole("button", { name: /movimento/ });
  await btn.click();
  await p.mouse.move(720, 896);
  await p.waitForTimeout(600);
  const pa = await shot("07-pausado-a");
  await p.waitForTimeout(2000);
  const pb = await shot("08-pausado-b-2s");
  R.pausa = { ariaPressed: await btn.getAttribute("aria-pressed"), rotulo: (await btn.textContent())?.trim(), difEntreQuadrosPausados: await diff(p, pa, pb), headlinePausada: await diff(p, await p.screenshot({ clip: head }), (await p.waitForTimeout(1000), await p.screenshot({ clip: head }))) };
  await btn.press("Enter");
  R.pausa.retomadoPorTeclado = await btn.getAttribute("aria-pressed");
  // 7. Rolagem: saída e volta (reversível).
  await p.waitForTimeout(400);
  await p.evaluate(() => window.__fiorbe?.freeze?.(true));
  const top0 = await shot();
  for (const [f, n] of [[0.15, "09-rolagem-15"], [0.35, "10-rolagem-35"], [0.6, "11-rolagem-60"]]) {
    await p.evaluate((y) => scrollTo(0, y), Math.round(900 * f));
    await p.waitForTimeout(1300);
    await shot(n);
  }
  await p.evaluate(() => scrollTo(0, 0));
  await p.waitForTimeout(1800);
  const top1 = await shot("12-rolagem-volta");
  R.rolagem = { voltaVsAntes: await diff(p, top0, top1) };
  // 11. Teclado: ordem de foco.
  await p.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  await p.keyboard.press("Tab");
  const order = [];
  for (let i = 0; i < 11; i++) {
    order.push(await p.evaluate(() => { const e = document.activeElement; return `${e.tagName.toLowerCase()}:${(e.textContent || e.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 28)}`; }));
    await p.keyboard.press("Tab");
  }
  R.teclado = order;
  R.erros1440 = errors;
  await ctx.close();
}

// ---------- Celular 390: toque (sintético) e menu ----------
{
  const { p, ctx, errors } = await open(390, 844, { touch: true });
  const s0 = await p.screenshot({ path: `${out}/13-celular-repouso.png` });
  const r = await p.evaluate(() => { const s = document.querySelector("[data-status=live]:not(canvas)").getBoundingClientRect(); return { x: 300, y: s.top + s.height * 0.62 }; });
  // Gesto horizontal: pointer events de toque no palco (o mesmo caminho do dedo).
  await p.evaluate(({ x, y }) => {
    const st = document.querySelector("[data-status=live]:not(canvas)");
    const ev = (type, px) => st.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: px, clientY: y, bubbles: true }));
    ev("pointerdown", x);
    let px = x;
    return new Promise((res) => { const step = () => { px -= 14; ev("pointermove", px); if (px > x - 180) requestAnimationFrame(step); else { ev("pointerup", px); res(); } }; requestAnimationFrame(step); });
  }, r);
  const s1 = await p.screenshot({ path: `${out}/14-celular-toque.png` });
  R.toque = { difDepoisDoGesto: await diff(p, s0, s1) };
  await p.getByText("Menu", { exact: true }).tap();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/15-celular-menu.png` });
  R.menu = await p.evaluate(() => ({ aberto: document.querySelector("details")?.open ?? false, links: [...document.querySelectorAll("details nav a")].map((a) => a.getAttribute("href")) }));
  await p.getByText("Menu", { exact: true }).tap(); // fecha (o painel aberto cobre a pausa, por desenho)
  await p.waitForTimeout(200);
  const pause = p.getByRole("button", { name: /movimento/ });
  await pause.tap();
  R.toque.pausaPorToque = await pause.getAttribute("aria-pressed");
  R.erros390 = errors;
  await ctx.close();
}

// ---------- Movimento reduzido ----------
{
  const { p, ctx, errors } = await open(1440, 900, { reduced: true });
  const a = await p.screenshot({ path: `${out}/16-reduzido.png` });
  await p.waitForTimeout(2000);
  const c = await p.screenshot();
  R.reduzido = { difEm2s: await diff(p, a, c), botaoPausa: await p.getByRole("button", { name: /movimento/ }).count(), entrelace: await p.evaluate(() => document.getElementById("entrelace-hero").dataset.entrelace ?? null) };
  await p.evaluate(() => scrollTo(0, 260));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/17-reduzido-rolagem.png` });
  R.reduzido.domNaRolagem = await p.evaluate(() => document.getElementById("ent-title").style.getPropertyValue("--ent-dom"));
  R.errosReduzido = errors;
  await ctx.close();
}

// ---------- Sem WebGL / sem JS ----------
{
  const { p, ctx, errors } = await open(1440, 900, { q: "?nowebgl" });
  await p.screenshot({ path: `${out}/18-sem-webgl.png` });
  R.semWebgl = { status: await p.evaluate(() => document.querySelector("canvas")?.dataset.status), erros: errors.length };
  await ctx.close();
}
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const { p, ctx } = await open(w, h, { js: false });
  await p.screenshot({ path: `${out}/19-sem-js-${w}.png` });
  // Sem JS no contexto: leitura pelos locators (mundo isolado do Playwright).
  R[`semJs${w}`] = { h1: (await p.locator("h1").textContent())?.replace(/\s+/g, " ").trim(), links: await p.locator("a[href]").count(), pausaRenderizada: await p.getByRole("button", { name: /movimento/ }).count() };
  await ctx.close();
}

await writeFile(`${out}/medidas.json`, JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 2));
await b.close();
