// Validação final: carga das variantes (Chromium/D3D11) e da V2.3 em Firefox e WebKit
// (motores do Playwright no Windows — WebKit aqui NÃO é o Safari real). Registra estado do
// palco, erros de console e uma captura. Uso: node scripts/validacao-browsers.mjs
import { chromium, firefox, webkit } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const dir = fileURLToPath(new URL("../captures/validacao-final/", import.meta.url));
await mkdir(dir, { recursive: true });
const run = async (name, type, q, args = []) => {
  const b = await type.launch({ headless: true, args });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message.slice(0, 140)));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 140)));
  const t0 = Date.now();
  await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle", timeout: 120000 });
  const status = await p.waitForSelector('canvas[data-status="live"], canvas[data-status="fallback"]', { timeout: 60000 }).then((e) => e.getAttribute("data-status")).catch(() => "timeout");
  const ms = Date.now() - t0;
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${dir}F-${name}.png` });
  console.log(name.padEnd(22), status.padEnd(9), `${ms} ms até o palco`, errors.length ? `ERROS: ${errors.join(" | ")}` : "sem erros");
  await b.close();
};
const GPU = ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"];
for (const [n, q] of [["chromium-forma-c", "forma=c"], ["chromium-v22", "forma=blender2-v22"], ["chromium-v23", "forma=blender2-v23"], ["chromium-v23r", "forma=blender2-v23r"]]) await run(n, chromium, q, GPU);
for (const [n, t] of [["firefox-v23", firefox], ["webkit-v23", webkit]]) await run(n, t, "forma=blender2-v23").catch((e) => console.log(n, "NÃO EXECUTADO:", e.message.split("\n")[0]));
