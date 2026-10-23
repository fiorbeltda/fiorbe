// Estado do piso cinematográfico (trilhas projetadas). Uso: node scripts/floor-probe.mjs [query]
import { chromium } from "playwright-core";
const [q = "forma=blender2"] = process.argv.slice(2);
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
const logs = [];
p.on("console", (m) => logs.push(m.type() + ": " + m.text().slice(0, 200)));
p.on("pageerror", (e) => logs.push("pageerror: " + e.message));
await p.goto(`http://localhost:3100/?debug&${q}`, { waitUntil: "networkidle" });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(() => window.__fiorbe.floor()), null, 1));
console.log(logs.filter((l) => !/hydrat|HMR|Fast Refresh|React DevTools/i.test(l)).join("\n"));
await b.close();
