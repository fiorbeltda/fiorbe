// Estados A/B/C (estática · onda · onda+desfiar) no mesmo instante e recorte
// ampliado dos cruzamentos. Uso: node scripts/states.mjs <nome> [voltaAlvo=0.85]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [name = "estados", lapTarget = "0.85", only = ""] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const errors = [];
const open = async (q) => {
  const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle" });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 30000 });
  await p.waitForTimeout(1200);
  return p;
};
const full = { x: 600, y: 60, width: 1072, height: 680 };
const zoom = { x: 980, y: 70, width: 520, height: 470 };
const shots = [];
const shot = async (p, label, clip) => {
  await p.waitForTimeout(250);
  const buf = await p.screenshot({ type: "jpeg", quality: 88, clip });
  shots.push({ src: `data:image/jpeg;base64,${buf.toString("base64")}`, label });
};
const a = await open("debug&onda=0");
await a.evaluate(() => window.__fiorbe.holdWaves(true));
await shot(a, "A — estática (?onda=0)", full);
await shot(a, "cruzamentos A×B no topo (ampliado)", zoom);
await a.close();
if (!only) {
  const p = await open("debug");
  await p.evaluate(() => window.__fiorbe.holdWaves(true));
  const snap = () => p.evaluate(() => window.__fiorbe.waves());
  for (let i = 0; i < 100 && (await snap()).length === 0; i++) await p.evaluate(() => window.__fiorbe.stepWaves(0.1));
  let s;
  while ((s = await snap())[0] && s[0].lap < Number(lapTarget)) await p.evaluate(() => window.__fiorbe.stepWaves(0.05));
  const lbl = s.map((x) => `${"ABCDEF"[x.band]} volta ${Math.round(x.lap * 100)}%`).join(" ");
  await p.evaluate(() => window.__fiorbe.setFray(false));
  await shot(p, `B — onda sem desfiar · ${lbl}`, full);
  await p.evaluate(() => window.__fiorbe.setFray(true));
  await shot(p, `C — onda + desfiar · ${lbl}`, full);
  await shot(p, `C ampliado`, zoom);
}
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(2,1fr);gap:4px;font:13px monospace;color:#fff">${shots
  .map((x) => `<figure style="margin:0;position:relative"><img src="${x.src}" style="width:100%;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px">${x.label}</figcaption></figure>`)
  .join("")}</body>`;
const sheet = await b.newPage({ viewport: { width: 1600, height: 400 } });
await sheet.setContent(html);
await sheet.waitForTimeout(300);
await sheet.screenshot({ path: out(`${name}.png`), fullPage: true });
await b.close();
console.log(out(`${name}.png`), errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
