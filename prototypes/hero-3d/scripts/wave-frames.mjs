// Sequência de quadros da escultura para ver a onda/desfiar ao longo do tempo.
// Uso: node scripts/wave-frames.mjs <nome> [query] [quadros] [intervalo_ms]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [name = "onda", q = "debug", n = "8", every = "700"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && !/hydrat/i.test(m.text()) && errors.push(m.text().slice(0, 300)));
await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle" });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 20000 });
await p.waitForTimeout(1500);
const shots = [];
for (let i = 0; i < Number(n); i++) {
  const buf = await p.screenshot({ type: "jpeg", quality: 85, clip: { x: 600, y: 80, width: 1072, height: 640 } });
  const state = await p.evaluate(() => window.__fiorbe?.waves?.() ?? []);
  shots.push({ src: `data:image/jpeg;base64,${buf.toString("base64")}`, label: `t+${((i * Number(every)) / 1000).toFixed(1)}s ${JSON.stringify(state)}` });
  await p.waitForTimeout(Number(every));
}
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(2,1fr);gap:4px;font:13px monospace;color:#fff">${shots
  .map((s) => `<figure style="margin:0;position:relative"><img src="${s.src}" style="width:100%;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px;max-width:95%">${s.label}</figcaption></figure>`)
  .join("")}</body>`;
const sheet = await b.newPage({ viewport: { width: 1600, height: 400 } });
await sheet.setContent(html);
await sheet.waitForTimeout(300);
await sheet.screenshot({ path: out(`${name}.png`), fullPage: true });
await b.close();
console.log(out(`${name}.png`), errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
