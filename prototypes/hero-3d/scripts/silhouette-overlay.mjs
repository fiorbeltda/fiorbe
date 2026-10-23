// Silhuetas sobrepostas de duas capturas em argila (mesma câmera): a argila é cinza, o fundo
// azul saturado — máscara = pouca saturação e luminância média/alta. A em vermelho, B em ciano,
// sobreposição em branco; e a área de cada uma (px) como medida dos vazios.
// Uso: node scripts/silhouette-overlay.mjs <prefixoA> <prefixoB> [saida]
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [A = "pf", B = "v23c", name = "silhuetas"] = process.argv.slice(2);
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const url = async (f) => `data:image/png;base64,${(await readFile(cap(f))).toString("base64")}`;
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 1072, height: 680 } });
await p.setContent(`<canvas id=c width=1072 height=680></canvas>`);
const res = await p.evaluate(async ([ua, ub]) => {
  const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
  const [ia, ib] = await Promise.all([load(ua), load(ub)]);
  const c = document.getElementById("c");
  const g = c.getContext("2d");
  const mask = (img) => {
    g.drawImage(img, 600, 60, 1072, 680, 0, 0, 1072, 680);
    const d = g.getImageData(0, 0, 1072, 680).data;
    const m = new Uint8Array(1072 * 680);
    for (let i = 0; i < m.length; i++) {
      const r = d[i * 4], gg = d[i * 4 + 1], bb = d[i * 4 + 2];
      const mx = Math.max(r, gg, bb), mn = Math.min(r, gg, bb);
      const sat = mx ? (mx - mn) / mx : 0;
      m[i] = sat < 0.32 && mx > 70 ? 1 : 0;
    }
    return m;
  };
  const ma = mask(ia), mb = mask(ib);
  const out = g.createImageData(1072, 680);
  let na = 0, nb = 0, both = 0;
  for (let i = 0; i < ma.length; i++) {
    const a = ma[i], bq = mb[i];
    na += a; nb += bq; both += a & bq;
    const o = i * 4;
    out.data[o] = a ? 255 : 0;
    out.data[o + 1] = bq ? 220 : a ? 40 : 0;
    out.data[o + 2] = bq ? 255 : a ? 40 : 0;
    out.data[o + 3] = 255;
    if (!a && !bq) out.data.set([6, 10, 20, 255], o);
  }
  g.putImageData(out, 0, 0);
  return { areaA: na, areaB: nb, comum: both, png: c.toDataURL() };
}, [await url(`${A}-argila.png`), await url(`${B}-argila.png`)]);
await p.setContent(`<body style="margin:0;background:#000;font:14px monospace;color:#fff"><img src="${res.png}" style="display:block"><div style="position:absolute;left:8px;top:8px;background:#000c;padding:4px 8px">vermelho = ${A} · ciano = ${B} · branco = as duas</div></body>`);
await p.waitForTimeout(200);
await p.screenshot({ path: cap(`${name}.png`) });
await b.close();
console.log(JSON.stringify({ areaA: res.areaA, areaB: res.areaB, comum: res.comum }));
