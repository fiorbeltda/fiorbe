// Continuidade da fita: emenda u=1→0 (posição, normal, textura) e maior giro entre anéis vizinhos.
// Uso: node --import ./scripts/_ts.mjs scripts/seam-check.mjs
import { createMonumentGeometry } from "../src/three/sculpture/monument.ts";
const ACROSS = 12, cols = ACROSS + 1;
const { geometry, lengths } = createMonumentGeometry({ segments: 720, across: ACROSS });
const pos = geometry.getAttribute("position").array, nor = geometry.getAttribute("normal").array, uv = geometry.getAttribute("uv").array, rib = geometry.getAttribute("aRib").array;
const n = pos.length / 3;
let start = 0;
for (let b = 0; b < lengths.length; b++) {
  let end = start;
  while (end < n && Math.round(rib[end * 3 + 2]) === b) end++;
  const rings = (end - start) / cols;
  const last = start + (rings - 1) * cols;
  let dp = 0, dn = 0, maxTurn = 0;
  for (let j = 0; j < cols; j++) {
    const a = (start + j) * 3, c = (last + j) * 3;
    dp = Math.max(dp, Math.hypot(pos[a] - pos[c], pos[a + 1] - pos[c + 1], pos[a + 2] - pos[c + 2]));
    dn = Math.max(dn, Math.hypot(nor[a] - nor[c], nor[a + 1] - nor[c + 1], nor[a + 2] - nor[c + 2]));
  }
  const uvGap = (uv[last * 2] - uv[start * 2]) % 1;
  // giro entre anéis vizinhos (normal central)
  const mid = Math.floor(cols / 2);
  for (let i = 0; i < rings - 1; i++) {
    const a = (start + i * cols + mid) * 3, c = (start + (i + 1) * cols + mid) * 3;
    const d = nor[a] * nor[c] + nor[a + 1] * nor[c + 1] + nor[a + 2] * nor[c + 2];
    maxTurn = Math.max(maxTurn, Math.acos(Math.min(1, d)) * 180 / Math.PI);
  }
  console.log(`fita ${b}: emenda posição ${dp.toExponential(1)} · normal ${dn.toExponential(1)} · estrias ${uvGap.toFixed(3)} · maior giro entre anéis ${maxTurn.toFixed(2)}° (${rings} anéis)`);
  start = end;
}
