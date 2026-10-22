// Folha de quadros de um vídeo webm (confere a gravação sem ffmpeg).
// Uso: node scripts/video-sheet.mjs <arquivo.webm> <saida.png> [passo_s]
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
const [file, outPng, stepS = "3"] = process.argv.slice(2);
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const data = (await readFile(file)).toString("base64");
await p.setContent(`<body style="margin:0;background:#000"><video id=v muted src="data:video/webm;base64,${data}"></video><div id=g style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px"></div></body>`);
await p.evaluate(async (step) => {
  const v = document.getElementById("v");
  await new Promise((r) => (v.readyState >= 1 ? r() : (v.onloadedmetadata = r)));
  // webm do Playwright não traz duração: força o cálculo.
  if (!isFinite(v.duration)) { v.currentTime = 1e6; await new Promise((r) => (v.ontimeupdate = r)); v.ontimeupdate = null; }
  const dur = v.duration;
  for (let t = 0.5; t < dur; t += step) {
    v.currentTime = t;
    await new Promise((r) => (v.onseeked = r));
    const c = document.createElement("canvas");
    c.width = 533; c.height = 300;
    c.getContext("2d").drawImage(v, 0, 0, 533, 300);
    const f = document.createElement("figure");
    f.style.cssText = "margin:0;position:relative;color:#fff;font:12px monospace";
    f.append(c);
    const l = document.createElement("span");
    l.textContent = `${t.toFixed(1)}s`;
    l.style.cssText = "position:absolute;left:4px;top:4px;background:#000a;padding:1px 4px";
    f.append(l);
    document.getElementById("g").append(f);
  }
  v.remove();
}, Number(stepS));
await p.screenshot({ path: outPng, fullPage: true });
await b.close();
console.log(outPng);
