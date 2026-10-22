// Diagnóstico de cruzamentos: interseções reais entre superfícies de fitas
// diferentes (aresta × triângulo) e folga mínima entre elas.
// Uso: node --import ./scripts/_ts.mjs scripts/crossings.mjs [folga=0.22]
import { Vector3 } from "three";
import { createMonumentGeometry, MONUMENT } from "../src/three/sculpture/monument.ts";

const CLEAR = Number(process.argv[2] ?? 0.22);
const ACROSS = 12;
const { geometry, lengths } = createMonumentGeometry({ segments: 720, across: ACROSS });
const pos = geometry.getAttribute("position").array;
const rib = geometry.getAttribute("aRib").array;
const idx = geometry.getIndex().array;
const nV = pos.length / 3;
const V = (i, o = new Vector3()) => o.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
const band = (i) => Math.round(rib[i * 3 + 2]);

console.log("comprimentos:", lengths.map((l, b) => `${"ABCDEF"[b]}=${l.toFixed(2)}`).join("  "));

// Grade espacial de triângulos.
const CELL = 0.12;
const key = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
const grid = new Map();
const tris = idx.length / 3;
const a = new Vector3(), b = new Vector3(), c = new Vector3();
for (let t = 0; t < tris; t++) {
  V(idx[t * 3], a); V(idx[t * 3 + 1], b); V(idx[t * 3 + 2], c);
  const mn = a.clone().min(b).min(c), mx = a.clone().max(b).max(c);
  for (let x = Math.floor(mn.x / CELL); x <= Math.floor(mx.x / CELL); x++)
    for (let y = Math.floor(mn.y / CELL); y <= Math.floor(mx.y / CELL); y++)
      for (let z = Math.floor(mn.z / CELL); z <= Math.floor(mx.z / CELL); z++) {
        const k = `${x},${y},${z}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(t);
      }
}

// Segmento × triângulo (Möller–Trumbore).
const e1 = new Vector3(), e2 = new Vector3(), p = new Vector3(), q = new Vector3(), s = new Vector3(), d = new Vector3();
function segTri(o, end, t) {
  V(idx[t * 3], a); V(idx[t * 3 + 1], b); V(idx[t * 3 + 2], c);
  d.subVectors(end, o);
  e1.subVectors(b, a); e2.subVectors(c, a);
  p.crossVectors(d, e2);
  const det = e1.dot(p);
  if (Math.abs(det) < 1e-12) return false;
  const inv = 1 / det;
  s.subVectors(o, a);
  const u = s.dot(p) * inv; if (u < 0 || u > 1) return false;
  q.crossVectors(s, e1);
  const v = d.dot(q) * inv; if (v < 0 || u + v > 1) return false;
  const k = e2.dot(q) * inv;
  return k >= 0 && k <= 1;
}

const hits = new Map(); // "a-b" -> [{ua, ub, p}]
const cols = ACROSS + 1;
// Início de cada fita (vértices contíguos por fita) e afastamento mínimo ao longo do arco para contar autointerseção.
const starts = [];
for (let i = 0; i < nV; i++) if (i === 0 || band(i) !== band(i - 1)) starts[band(i)] = i;
const ringsOfBand = (bb) => ((bb + 1 < starts.length ? starts[bb + 1] : nV) - starts[bb]) / cols;
const ARC_SKIP = 0.9;
const HAIR = starts.length - 1;
const farOnArc = (i, j) => { const du = Math.abs(rib[i * 3] - rib[j * 3]); return Math.min(du, 1 - du) * lengths[band(i)] >= ARC_SKIP; };
const o = new Vector3(), en = new Vector3();
for (let i = 0; i < nV; i++) {
  const ba = band(i);
  const local = i - starts[ba];
  const ring = Math.floor(local / cols), col = local % cols;
  const nbrs = [];
  if (ring < ringsOfBand(ba) - 1) nbrs.push(i + cols);
  if (col < ACROSS) nbrs.push(i + 1);
  for (const j of nbrs) {
    V(i, o); V(j, en);
    const seen = new Set();
    for (const k of [key(o.x, o.y, o.z), key(en.x, en.y, en.z)])
      for (const t of grid.get(k) ?? []) {
        if (seen.has(t)) continue;
        seen.add(t);
        const vb = idx[t * 3];
        const bb = band(vb);
        if (bb === ba && !farOnArc(i, vb)) continue;
        if (!segTri(o, en, t)) continue;
        const pair = ba < bb ? `${ba}-${bb}` : `${bb}-${ba}`;
        if (!hits.has(pair)) hits.set(pair, []);
        const ua = rib[i * 3], ub = rib[vb * 3];
        hits.get(pair).push(ba < bb ? { ua, ub, p: o.clone() } : { ua: ub, ub: ua, p: o.clone() });
      }
  }
}

// Folga: distância mínima entre vértices de fitas diferentes, por trecho.
const vgrid = new Map();
for (let i = 0; i < nV; i++) {
  V(i, o);
  const k = key(o.x, o.y, o.z);
  if (!vgrid.has(k)) vgrid.set(k, []);
  vgrid.get(k).push(i);
}
const near = new Map();
const R = Math.ceil(CLEAR / CELL);
for (let i = 0; i < nV; i++) {
  if (band(i) === HAIR) continue;
  V(i, o);
  const cx = Math.floor(o.x / CELL), cy = Math.floor(o.y / CELL), cz = Math.floor(o.z / CELL);
  for (let x = cx - R; x <= cx + R; x++)
    for (let y = cy - R; y <= cy + R; y++)
      for (let z = cz - R; z <= cz + R; z++)
        for (const j of vgrid.get(`${x},${y},${z}`) ?? []) {
          const bj = band(j);
          if (bj < band(i) || bj === HAIR) continue;
          if (bj === band(i) && !farOnArc(i, j)) continue;
          V(j, en);
          const dd = o.distanceTo(en);
          if (dd >= CLEAR) continue;
          const pair = `${band(i)}-${bj}`;
          const cur = near.get(pair);
          if (!cur || dd < cur.d) near.set(pair, { d: dd, ua: rib[i * 3], ub: rib[j * 3], p: o.clone() });
        }
}

const toRef = (v) => `ref(${Math.round(v.x / 0.00707 + 1145)}, ${Math.round(660 - (v.y + 1.5) / 0.00707)}, z=${v.z.toFixed(2)})`;
const N = "ABCDEF";
console.log(`\nINTERSEÇÕES REAIS (arestas que atravessam a outra superfície):`);
if (hits.size === 0) console.log("  nenhuma");
for (const [pair, list] of hits) {
  const [x, y] = pair.split("-").map(Number);
  // agrupa por trecho de u
  list.sort((m, n) => m.ua - n.ua);
  const groups = [];
  for (const h of list) {
    const g = groups.at(-1);
    if (g && h.ua - g.ua1 < 0.02) { g.ua1 = h.ua; g.n++; g.ub0 = Math.min(g.ub0, h.ub); g.ub1 = Math.max(g.ub1, h.ub); }
    else groups.push({ ua0: h.ua, ua1: h.ua, ub0: h.ub, ub1: h.ub, n: 1, p: h.p });
  }
  for (const g of groups)
    console.log(`  ${N[x]}×${N[y]}: u${N[x]} ${g.ua0.toFixed(3)}–${g.ua1.toFixed(3)}  u${N[y]} ${g.ub0.toFixed(3)}–${g.ub1.toFixed(3)}  (${g.n} arestas)  ${toRef(g.p)}`);
}
console.log(`\nFOLGA < ${CLEAR} (sem contar o fio F):`);
for (const [pair, v] of near) {
  const [x, y] = pair.split("-").map(Number);
  console.log(`  ${N[x]}×${N[y]}: mín ${v.d.toFixed(3)} em u${N[x]}=${v.ua.toFixed(3)} u${N[y]}=${v.ub.toFixed(3)}  ${toRef(v.p)}`);
}
void MONUMENT;
