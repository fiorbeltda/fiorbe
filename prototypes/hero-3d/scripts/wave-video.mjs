// Grava a escultura em tempo real (webm) — volta completa + transferência.
// Uso: node scripts/wave-video.mjs <nome> [query] [segundos]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { rename, mkdir } from "node:fs/promises";
const [name = "onda-video", q = "ondadebug&debug", secs = "26"] = process.argv.slice(2);
const dir = fileURLToPath(new URL(`../captures/video-tmp/`, import.meta.url));
await mkdir(dir, { recursive: true });
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir, size: { width: 1280, height: 720 } } });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle" });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 30000 });
const t0 = Date.now();
const fpsSamples = [];
while (Date.now() - t0 < Number(secs) * 1000) {
  await p.waitForTimeout(2000);
  fpsSamples.push(await p.evaluate(() => new Promise((r) => { let n = 0; const s = performance.now(); const f = () => { n++; if (performance.now() - s < 500) requestAnimationFrame(f); else r(Math.round(n * 2)); }; requestAnimationFrame(f); })));
}
const log = await p.evaluate(() => ({ log: [JSON.stringify(window.__fiorbe?.waves?.() ?? [])] }));
const video = p.video();
await ctx.close();
const target = fileURLToPath(new URL(`../captures/${name}.webm`, import.meta.url));
await rename(await video.path(), target);
await b.close();
console.log(target);
console.log("fps aprox. durante a gravação:", fpsSamples.join(" "));
console.log(log?.log?.join("\n"));
console.log(errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
