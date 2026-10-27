// DS-001A (revisão): Atual × A × B × C em condições iguais — cena congelada na mesma fase,
// mouse fora do palco, DPR 2. Gera capturas cruas e folhas comparativas em captures/ds001a/revisao/.
// Uso: node scripts/ds001a-review.mjs   (BASE = servidor; padrão http://localhost:3100)
// DIRS=a,b,c,d,e escolhe as variantes (padrão atual,a,b,c); OUT=subpasta de captures/ds001a (padrão revisao).
import { chromium } from "playwright-core";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const base = (process.env.BASE ?? "http://localhost:3100").replace(/\/$/, "");
const dir = fileURLToPath(new URL(`../captures/ds001a/${process.env.OUT ?? "revisao"}/`, import.meta.url));
await mkdir(dir, { recursive: true });
const ALL = [
  ["atual", "/", "Atual (raiz /)"],
  ["a", "/editorial/a", "A · Editorial minimalista"],
  ["b", "/editorial/b", "B · Contraste conceitual"],
  ["c", "/editorial/c", "C · Engenharia e confiança"],
  ["d", "/editorial/d", "D · Engenharia Escultural — Archivo"],
  ["e", "/editorial/e", "E · Engenharia Escultural — IBM Plex Sans"],
  ["f1", "/editorial/f1", "F1 · Forma"],
  ["f2", "/editorial/f2", "F2 · Contraste"],
];
const VARIANTS = (process.env.DIRS ?? "atual,a,b,c").split(",").map((k) => ALL.find(([x]) => x === k)).filter(Boolean);
const TITLE = VARIANTS.map(([k]) => (k === "atual" ? "Atual" : k.toUpperCase())).join(" × ");
const b = await chromium.launch({ headless: true, args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const shots = {};
const info = {};

async function open(path, w, h) {
  const mobile = w < 768;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: mobile, isMobile: mobile });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(`${base}${path}?debug`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForSelector('canvas[data-status="live"]', { timeout: 60000 });
  await p.addStyleTag({ content: "output{display:none!important} nextjs-portal{display:none!important}" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const f = window.__fiorbe; f?.freeze(true); f?.holdWaves(true); f?.seekLap(0.62); });
  if (!mobile) await p.mouse.move(w / 2, h - 4);
  await p.waitForTimeout(800);
  return { p, errors };
}

const measure = (p) => p.evaluate(() => {
  const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top + scrollY, w: b.width, h: b.height }; };
  const h1 = document.querySelector("h1");
  const font = (e) => e && `${getComputedStyle(e).fontFamily.split(",")[0].replace(/"/g, "")} ${getComputedStyle(e).fontWeight} ${getComputedStyle(e).fontSize}`;
  return {
    header: r(document.querySelector("header")),
    copy: r(h1.parentElement),
    band: r(document.querySelector('[aria-label="Sobre a FIORBE"]')),
    stage: r(document.querySelector("canvas")),
    fonts: { title: font(h1), lede: font(h1.nextElementSibling), wordmark: font(document.querySelector("header a")) },
    docH: document.documentElement.scrollHeight,
  };
});

for (const [key, path] of VARIANTS) {
  // Desktop 1440 × 900
  {
    const { p, errors } = await open(path, 1440, 900);
    const file = `${key}-1440x900.png`;
    await p.screenshot({ path: dir + file });
    shots[file] = true;
    info[key] = { d1440: await measure(p) };
    info[key].d1440.errors = errors;
    await p.close();
  }
  // Mobile 390 × 844: primeira tela e rolagem até a faixa inferior aparecer inteira
  {
    const { p, errors } = await open(path, 390, 844);
    await p.screenshot({ path: `${dir}${key}-390x844.png` });
    const m = await measure(p);
    // Sem faixa (F1): rola até o fim do bloco de texto.
    const end = m.band ?? m.copy;
    const y = Math.max(0, Math.round(end.y + end.h - 844 + 24));
    await p.evaluate((v) => window.scrollTo(0, v), y);
    await p.waitForTimeout(1600);
    await p.screenshot({ path: `${dir}${key}-390x844-faixa.png` });
    info[key].m390 = { ...m, bandScroll: y, errors };
    await p.close();
  }
  // Celular pequeno 360 × 640: só a primeira tela (o que se entende sem rolar)
  {
    const { p, errors } = await open(path, 360, 640);
    await p.screenshot({ path: `${dir}${key}-360x640.png` });
    info[key].m360 = { ...(await measure(p)), errors };
    await p.close();
  }
  console.log(key, JSON.stringify(info[key].d1440.fonts), "erros:", info[key].d1440.errors.length + info[key].m390.errors.length);
}
await writeFile(`${dir}medidas.json`, JSON.stringify(info, null, 2));

// ---------- Folhas ----------
const { readFile } = await import("node:fs/promises");
const img = async (f) => `data:image/png;base64,${(await readFile(dir + f)).toString("base64")}`;
// Recorte em px CSS de uma captura DPR 2, exibido com escala k.
const crop = async (f, [x, y, w, h], k, srcW) =>
  `<div style="width:${w * k}px;height:${h * k}px;background:url(${await img(f)}) -${x * k}px -${y * k}px / ${srcW * k}px auto no-repeat"></div>`;
const fig = (label, body, i) => `<figure><figcaption class="c${i}">${label}</figcaption>${body}</figure>`;
const css = `body{margin:0;background:#05080f;color:#e8eef7;font:15px system-ui,sans-serif;width:max-content;padding:24px}h1{font-size:24px;margin:0 0 4px}
p.s{margin:0 0 16px;color:#9fb0c6}h2{font-size:16px;margin:26px 0 8px;color:#bcd}.g{display:grid;gap:18px;align-items:start}figure{margin:0}
figcaption{font:600 13px ui-monospace,monospace;padding:0 0 6px}.c0{color:#9aa7b8}.c1{color:#8fb3ff}.c2{color:#7be3cb}.c3{color:#f2c879}.c4{color:#ff9fb2}.c5{color:#c9a7ff}.c6{color:#ffd27a}
.f{font:12px ui-monospace,monospace;color:#7d8ba0;padding-top:4px}`;
const SUB = "Mesma cena real (Hero 3D V2.3, motor WebGL ativo) congelada na mesma fase · DPR 2 · mouse fora do palco · build de produção · " + (process.env.REV ?? "commit bc41d0c");
const fontsLine = (k) => { const f = info[k].d1440.fonts; return `<div class="f">título: ${f.title} · texto: ${f.lede}</div>`; };

const sheets = {};
sheets["1-desktop-1440"] = `<h1>DS-001 · Desktop 1440 × 900 — ${TITLE}</h1><p class="s">${SUB}</p><div class="g" style="grid-template-columns:repeat(2,1200px)">${
  (await Promise.all(VARIANTS.map(async ([k, , l], i) => fig(l, `<img src="${await img(`${k}-1440x900.png`)}" style="width:1200px;display:block">${fontsLine(k)}`, i)))).join("")}</div>`;

// Recortes do texto (mesma janela para todas: união das áreas de cabeçalho+texto)
const union = (key) => { const { header, copy } = info[key].d1440; return [header.x - 24, 0, Math.max(header.w, 1240), copy.y + copy.h + 28]; };
const area = VARIANTS.map(([k]) => union(k)).reduce((a, c) => [Math.min(a[0], c[0]), 0, Math.max(a[2], c[2]), Math.max(a[3], c[3])]);
// Composições que ocupam a largura toda (F1) entram inteiras, em escala menor.
const detail = (k) => { const c = info[k].d1440.copy; return c.w > 900 ? [[0, 0, 1440, 900], 0.66] : [[Math.max(0, area[0]), 0, 760, area[3]], 1.25]; };
sheets["2-editorial-detalhe"] = `<h1>DS-001 · Navbar, headline, descrição e CTAs (recorte 1440 × 900)</h1><p class="s">${SUB}</p><div class="g" style="grid-template-columns:repeat(2,auto)">${
  (await Promise.all(VARIANTS.map(async ([k, , l], i) => { const [r, z] = detail(k); return fig(l, (await crop(`${k}-1440x900.png`, r, z, 1440)) + fontsLine(k), i); }))).join("")}</div>`;

const bandRect = (k) => { const r = info[k].d1440.band; return r ? [Math.max(0, r.x - 20), r.y - 20, r.w + 40, r.h + 40] : null; };
sheets["3-navbar-e-faixa"] = `<h1>DS-001 · Navbar e barra inferior (1440 × 900, ampliado 1,2×)</h1><p class="s">${SUB}</p>` +
  (await Promise.all(VARIANTS.map(async ([k, , l], i) => {
    const h = info[k].d1440.header; const br = bandRect(k);
    return `<h2>${l}</h2><div class="g">${fig("navbar", await crop(`${k}-1440x900.png`, [0, 0, 1440, h.y + h.h + 16], 1.2, 1440), i)}${br ? fig("barra inferior", await crop(`${k}-1440x900.png`, br, 1.2, 1440), i) : ""}</div>`;
  }))).join("");

sheets["4-mobile-390"] = `<h1>DS-001 · Mobile 390 × 844 — primeira tela e rolagem até a barra inferior</h1><p class="s">${SUB}. A segunda linha rola a página até a barra aparecer inteira (a transição de rolagem do Hero começa a agir).</p><div class="g" style="grid-template-columns:repeat(${VARIANTS.length},480px)">${
  (await Promise.all(VARIANTS.map(async ([k, , l], i) => fig(l, `<img src="${await img(`${k}-390x844.png`)}" style="width:480px;display:block">`, i)))).join("")}${
  (await Promise.all(VARIANTS.map(async ([k, , l], i) => fig(`${l} · rolagem ${info[k].m390.bandScroll}px`, `<img src="${await img(`${k}-390x844-faixa.png`)}" style="width:480px;display:block">`, i)))).join("")}</div>`;

sheets["5-mobile-360"] = `<h1>DS-001 · Celular pequeno 360 × 640 — primeira tela, sem rolar</h1><p class="s">${SUB}</p><div class="g" style="grid-template-columns:repeat(${VARIANTS.length},450px)">${
  (await Promise.all(VARIANTS.map(async ([k, , l], i) => fig(l, `<img src="${await img(`${k}-360x640.png`)}" style="width:450px;display:block">`, i)))).join("")}</div>`;

const sp = await b.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
for (const [name, html] of Object.entries(sheets)) {
  await sp.setContent(`<style>${css}</style>${html}`);
  await sp.waitForTimeout(500);
  await sp.screenshot({ path: `${dir}DS001A-${name}.png`, fullPage: true });
  console.log(`${dir}DS001A-${name}.png`);
}
await b.close();
