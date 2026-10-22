// Volta completa da onda em quadros determinísticos (ondas congeladas e
// avançadas por passo): 0/25/50/75/100% da volta, transferência e a fita
// seguinte; mais o mesmo instante com e sem desfiar.
// Uso: node scripts/wave-lap.mjs <nome> [query]
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
const [name = "volta", q = "debug&ondadebug"] = process.argv.slice(2);
const out = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && !/hydrat/i.test(m.text()) && errors.push(m.text().slice(0, 300)));
await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle" });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 30000 });
await p.evaluate(() => window.__fiorbe.holdWaves(true));
const snap = () => p.evaluate(() => window.__fiorbe.waves());
const step = (s) => p.evaluate((s) => window.__fiorbe.stepWaves(s), s);
const clip = { x: 600, y: 60, width: 1072, height: 680 };
const shots = [];
const shot = async (label) => {
  await p.waitForTimeout(250);
  const buf = await p.screenshot({ type: "jpeg", quality: 86, clip });
  shots.push({ src: `data:image/jpeg;base64,${buf.toString("base64")}`, label });
};
// Até existir uma onda.
for (let i = 0; i < 100 && (await snap()).length === 0; i++) await step(0.1);
let s = await snap();
const band = s[0].band;
const fmt = (w) => w.map((x) => `${"ABCDEF"[x.band]} u=${x.u} volta=${Math.round(x.lap * 100)}% amp=${x.amp}`).join(" | ");
for (const target of [0.02, 0.25, 0.5, 0.75, 1.0]) {
  while ((s = await snap())[0]?.band === band && s[0].lap < target) await step(0.05);
  await shot(`volta ${Math.round(target * 100)}% — ${fmt(s)}`);
  if (target === 0.5) {
    await p.evaluate(() => window.__fiorbe.setFray(false));
    await shot(`mesmo instante SEM desfiar (?fios=0) — ${fmt(s)}`);
    await p.evaluate(() => window.__fiorbe.setFray(true));
  }
}
// Transferência: primeiro instante com duas ondas.
while ((s = await snap()).length < 2 && s[0]?.band === band) await step(0.05);
await shot(`transferência — ${fmt(s)}`);
await step(0.8);
await shot(`transferência +0.8s — ${fmt(await snap())}`);
await step(3);
await shot(`fita seguinte +3.8s — ${fmt(await snap())}`);
const log = await p.evaluate(() => window.__fiorbe.waveLog());
const html = `<body style="margin:0;background:#000;display:grid;grid-template-columns:repeat(2,1fr);gap:4px;font:13px monospace;color:#fff">${shots
  .map((x) => `<figure style="margin:0;position:relative"><img src="${x.src}" style="width:100%;display:block"><figcaption style="position:absolute;left:6px;top:6px;background:#000c;padding:2px 6px;max-width:95%">${x.label}</figcaption></figure>`)
  .join("")}</body>`;
const sheet = await b.newPage({ viewport: { width: 1600, height: 400 } });
await sheet.setContent(html);
await sheet.waitForTimeout(300);
await sheet.screenshot({ path: out(`${name}.png`), fullPage: true });
await b.close();
console.log(out(`${name}.png`));
console.log(log.log.join("\n"));
console.log(errors.length ? "ERROS: " + errors.join(" | ") : "sem erros");
