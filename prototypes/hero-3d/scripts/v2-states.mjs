// Estados essenciais numa forma específica: movimento reduzido (ondas zeradas), 390 px e pausa.
// Uso: node scripts/v2-states.mjs [forma]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [forma = "blender2"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
const open = async (vp, extra = {}) => {
  const ctx = await b.newContext({ viewport: vp, ...extra });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && !/hydrat/i.test(m.text()) && errors.push(m.text().slice(0, 200)));
  await p.goto(`http://localhost:3100/?debug&forma=${forma}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  await p.waitForTimeout(2000);
  return { ctx, p };
};
let { ctx, p } = await open({ width: 1440, height: 900 }, { reducedMotion: "reduce" });
console.log("reduced motion: amplitudes", JSON.stringify((await p.evaluate(() => window.__fiorbe.waves())).map((w) => w.amp)));
await p.screenshot({ path: out(`${forma}-reduced.png`) });
await ctx.close();
({ ctx, p } = await open({ width: 390, height: 844 }));
await p.screenshot({ path: out(`${forma}-390.png`) });
await ctx.close();
await b.close();
console.log(errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
