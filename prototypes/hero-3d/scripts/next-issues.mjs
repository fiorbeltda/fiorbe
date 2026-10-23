// Lista erros/avisos que o indicador do Next.js contaria (console + pageerror), sem extensões.
import { chromium } from "playwright-core";
const [q = "forma=blender2-b"] = process.argv.slice(2);
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1672, height: 941 } });
const logs = [];
p.on("console", (m) => (m.type() === "error" || m.type() === "warning") && logs.push(`${m.type()}: ${m.text().slice(0, 300)}`));
p.on("pageerror", (e) => logs.push("pageerror: " + e.message));
await p.goto(`http://localhost:3100/?${q}`, { waitUntil: "networkidle" });
await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
await p.waitForTimeout(2500);
const badge = await p.evaluate(() => {
  const host = document.querySelector("nextjs-portal");
  const txt = host?.shadowRoot?.textContent ?? "";
  return txt.replace(/\s+/g, " ").slice(0, 200);
});
console.log("indicador:", JSON.stringify(badge));
console.log(logs.filter((l) => !/X4122|Program Info Log/.test(l)).join("\n") || "(sem erros/avisos)");
await b.close();
