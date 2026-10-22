// Captura e verificação do protótipo do hero.
// Uso: node scripts/capture.mjs [baseUrl]   (servidor rodando em :3100)
// Saída: ./captures/*.png e um resumo JSON no stdout.
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = process.argv[2] ?? "http://localhost:3100";
const out = new URL("../captures/", import.meta.url);
mkdirSync(out, { recursive: true });
const shot = (page, name) => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, out)) });

const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});

const report = { viewports: {}, errors: [] };

async function open(viewport, query = "?debug", extra = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ...extra });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" && !/hydrat/i.test(m.text())) report.errors.push(`${viewport.width}: ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => report.errors.push(`${viewport.width}: ${e.message}`));
  await page.goto(base + "/" + query, { waitUntil: "networkidle" });
  return { context, page };
}

async function waitLive(page) {
  await page.waitForSelector('canvas[data-status="live"]', { timeout: 20000 });
  await page.waitForTimeout(1600);
}

const sizes = [
  [1440, 900],
  [1280, 800],
  [768, 1024],
  [390, 844],
  [360, 800],
];

for (const [width, height] of sizes) {
  const { context, page } = await open({ width, height });
  await waitLive(page);
  await shot(page, `${width}-01-entrada`);
  const bench = await page.evaluate(() => window.__fiorbe?.bench(90));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "?";
  });
  report.viewports[width] = { bench, horizontalOverflow: overflow, renderer };

  if (width === 1440 || width === 390) {
    const stage = await page.locator("[data-status=live]").nth(1).boundingBox();
    if (stage && width === 1440) {
      // Estado 02 — cursor sobre o palco
      await page.mouse.move(stage.x + stage.width * 0.8, stage.y + stage.height * 0.2, { steps: 12 });
      await page.waitForTimeout(900);
      await shot(page, `${width}-02-cursor`);
      // Arraste com soltura rápida (inércia)
      const cx = stage.x + stage.width / 2;
      const cy = stage.y + stage.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 260, cy + 40, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(160);
      await shot(page, `${width}-03-arraste-inercia`);
      await page.waitForTimeout(2600);
      await shot(page, `${width}-04-retorno`);
      await page.mouse.move(5, 5);
    }
    // Scroll: ida
    const total = await page.evaluate(() => {
      const rule = document.getElementById("flow-rule");
      return rule.getBoundingClientRect().top + scrollY - innerHeight * 0.38;
    });
    for (const f of [0.15, 0.45, 0.7, 1.0]) {
      await page.evaluate((y) => scrollTo(0, y), Math.round(total * f));
      await page.waitForTimeout(900);
      await shot(page, `${width}-05-scroll-${Math.round(f * 100)}`);
    }
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    // Scroll: volta
    await page.evaluate((y) => scrollTo(0, y), Math.round(total * 0.45));
    await page.waitForTimeout(900);
    await shot(page, `${width}-06-volta-45`);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(1200);
    await shot(page, `${width}-07-volta-topo`);
  }
  await context.close();
}

// Movimento reduzido
{
  const { context, page } = await open({ width: 1440, height: 900 }, "?debug", { reducedMotion: "reduce" });
  await waitLive(page);
  await shot(page, "1440-08-reduced-motion");
  const paused = await page.locator("button[aria-pressed]").count();
  report.reducedMotion = { pauseButtonShown: paused > 0 };
  await context.close();
}

// Sem WebGL (fallback)
{
  const { context, page } = await open({ width: 1440, height: 900 }, "?nowebgl");
  await page.waitForTimeout(1500);
  await shot(page, "1440-09-sem-webgl");
  await context.close();
}

// Sem JavaScript
{
  const { context, page } = await open({ width: 1440, height: 900 }, "", { javaScriptEnabled: false });
  await page.waitForTimeout(800);
  await shot(page, "1440-10-sem-js");
  report.noJsTitle = await page.locator("h1").textContent();
  await context.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
