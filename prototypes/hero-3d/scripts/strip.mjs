// Tira lado a lado de capturas (mesma escala), com rótulo. Uso:
// node scripts/strip.mjs <saida.png> <largura-por-imagem> <arquivo1> [arquivo2 ...]   (caminhos relativos a captures/)
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const [name, cellW, ...files] = process.argv.slice(2);
const cap = (f) => fileURLToPath(new URL(`../captures/${f}`, import.meta.url));
const imgs = await Promise.all(files.map(async (f) => [f, `data:image/png;base64,${(await readFile(cap(f))).toString("base64")}`]));
const html = `<body style="margin:0;background:#000;font:12px monospace;color:#fff;width:max-content"><div style="display:flex;gap:6px;padding:6px">${imgs
  .map(([f, src]) => `<figure style="margin:0;width:${cellW}px"><figcaption style="padding:2px 0 4px">${f.split("/").pop()}</figcaption><img src="${src}" style="width:100%;display:block"></figure>`)
  .join("")}</div></body>`;
const b = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
const p = await b.newPage({ viewport: { width: 800, height: 400 } });
await p.setContent(html);
await p.waitForTimeout(300);
await p.screenshot({ path: cap(name), fullPage: true });
await b.close();
console.log(cap(name));
