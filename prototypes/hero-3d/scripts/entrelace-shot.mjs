// ENT-003: captura rápida de uma rota em vários viewports, cena congelada na mesma fase
// (freeze + holdWaves + seekLap, só com ?debug), mouse fora do palco.
// Uso: node scripts/entrelace-shot.mjs <rota> <saída-dir> [LxA[@dpr],...] [query extra] [--live]
//   --live: não congela (movimento real)
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
const [route = "/editorial/entrelace-v3", out = "captures/entrelace/dev", vps = "1440x900", extra = "", flag = ""] = process.argv.slice(2);
const base = (process.env.BASE ?? "http://localhost:3120").replace(/\/$/, "");
await mkdir(out, { recursive: true });
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
for (const spec of vps.split(",")) {
  const [vp, dprS = "1"] = spec.split("@");
  const [w, h] = vp.split("x").map(Number);
  const mobile = w < 768;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: Number(dprS), hasTouch: mobile, isMobile: mobile });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(`${base}${route}?debug${extra ? `&${extra}` : ""}`, { waitUntil: "networkidle", timeout: 120000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 90000 });
  await p.addStyleTag({ content: "output{display:none!important} nextjs-portal{display:none!important}" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  if (flag !== "--live") await p.evaluate(() => { const f = window.__fiorbe; f?.freeze(true); f?.holdWaves(true); f?.seekLap(0.62); });
  if (!mobile) await p.mouse.move(w / 2, h - 4);
  await p.waitForTimeout(900);
  const info = await p.evaluate(() => ({
    live: document.querySelector("[data-entrelace]")?.getAttribute("data-entrelace") ?? null,
    overflowX: document.documentElement.scrollWidth - innerWidth,
    title: (() => { const r = document.getElementById("ent-title")?.getBoundingClientRect(); return r ? [r.left, r.top, r.width, r.height].map(Math.round) : null; })(),
  }));
  const name = `${out}/${w}x${h}${dprS !== "1" ? `@${dprS}` : ""}${extra ? "-" + extra.replace(/[^a-z0-9]+/gi, "_") : ""}.png`;
  await p.screenshot({ path: name });
  console.log(name, JSON.stringify(info), errors.length ? `ERROS: ${errors.slice(0, 3).join(" | ")}` : "0 erros");
  await p.close();
}
await b.close();
