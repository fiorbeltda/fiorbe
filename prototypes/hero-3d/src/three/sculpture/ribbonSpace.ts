import { Vector3, type CatmullRomCurve3 } from "three";

/**
 * Pontos de maior proximidade entre fitas independentes. É por eles que a
 * onda "passa o bastão" de uma fita para outra: as fitas não têm
 * continuidade geométrica, então o revezamento acontece onde quase se tocam.
 */
export interface Contact {
  /** Posição na fita de origem (fração 0..1 do comprimento). */
  u: number;
  other: number;
  /** Posição na fita vizinha (fração 0..1). */
  otherU: number;
  /** Sentido coerente: +1 se as tangentes apontam para o mesmo lado. */
  sameDirection: boolean;
  distance: number;
}

export function computeContacts(curves: CatmullRomCurve3[], maxDistance: number, samples = 180): Contact[][] {
  const pts = curves.map((c) => Array.from({ length: samples }, (_, i) => c.getPointAt(i / samples, new Vector3())));
  const contacts: Contact[][] = curves.map(() => []);
  const ta = new Vector3();
  const tb = new Vector3();
  for (let a = 0; a < curves.length; a++) {
    for (let b = a + 1; b < curves.length; b++) {
      let best = Infinity;
      let ia = 0;
      let ib = 0;
      for (let i = 0; i < samples; i++) {
        for (let j = 0; j < samples; j++) {
          const d = pts[a]![i]!.distanceToSquared(pts[b]![j]!);
          if (d < best) {
            best = d;
            ia = i;
            ib = j;
          }
        }
      }
      const distance = Math.sqrt(best);
      if (distance > maxDistance) continue;
      curves[a]!.getTangentAt(ia / samples, ta);
      curves[b]!.getTangentAt(ib / samples, tb);
      const same = ta.dot(tb) >= 0;
      contacts[a]!.push({ u: ia / samples, other: b, otherU: ib / samples, sameDirection: same, distance });
      contacts[b]!.push({ u: ib / samples, other: a, otherU: ia / samples, sameDirection: same, distance });
    }
  }
  return contacts;
}

/**
 * Folga de cada vértice até a superfície mais próxima de OUTRA fita (ou de
 * outro trecho distante da mesma fita), limitada a `cap`. O shader usa isso
 * para que a deformação da onda nunca leve uma fita a atravessar a vizinha.
 *
 * Amostragem: anéis a cada ~1/180 do comprimento e 5 posições na largura,
 * contra todos os vértices das demais fitas (grade espacial). A distância
 * entre amostras superestima a folga real em até ~meio espaçamento; por isso
 * o resultado é descontado de `slack`. Valor constante através da largura.
 */
export function computeClearance(
  positions: Float32Array,
  rib: Float32Array,
  rings: number,
  cols: number,
  bands: number,
  cap = 0.6,
  slack = 0.08,
): Float32Array {
  const n = positions.length / 3;
  const cell = cap;
  const key = (x: number, y: number, z: number) => ((Math.floor(x / cell) + 512) * 1024 + (Math.floor(y / cell) + 512)) * 1024 + (Math.floor(z / cell) + 512);
  const grid = new Map<number, number[]>();
  // Alvos: anéis alternados, todas as colunas.
  const ringStep = Math.max(1, Math.round((rings - 1) / 360));
  for (let i = 0; i < n; i++) {
    const ring = Math.floor((i % (rings * cols)) / cols);
    if (ring % ringStep !== 0) continue;
    const k = key(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
    let list = grid.get(k);
    if (!list) grid.set(k, (list = []));
    list.push(i);
  }
  const out = new Float32Array(n).fill(cap);
  const qStep = Math.max(1, Math.round((rings - 1) / 180));
  const qCols = [0, Math.round((cols - 1) * 0.25), Math.round((cols - 1) * 0.5), Math.round((cols - 1) * 0.75), cols - 1];
  const perBand = rings * cols;
  const ringClear = new Float32Array(rings);
  for (let b = 0; b < bands; b++) {
    ringClear.fill(cap);
    for (let r = 0; r < rings; r += qStep) {
      let best = cap * cap;
      for (const c of qCols) {
        const i = b * perBand + r * cols + c;
        const x = positions[i * 3]!, y = positions[i * 3 + 1]!, z = positions[i * 3 + 2]!;
        const u = rib[i * 3]!;
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        for (let gx = cx - 1; gx <= cx + 1; gx++)
          for (let gy = cy - 1; gy <= cy + 1; gy++)
            for (let gz = cz - 1; gz <= cz + 1; gz++) {
              const list = grid.get(((gx + 512) * 1024 + (gy + 512)) * 1024 + (gz + 512));
              if (!list) continue;
              for (const j of list) {
                if (Math.round(rib[j * 3 + 2]!) === b) {
                  const du = Math.abs(rib[j * 3]! - u);
                  if (Math.min(du, 1 - du) < 0.08) continue;
                }
                const dx = positions[j * 3]! - x, dy = positions[j * 3 + 1]! - y, dz = positions[j * 3 + 2]! - z;
                const d = dx * dx + dy * dy + dz * dz;
                if (d < best) best = d;
              }
            }
      }
      ringClear[r] = Math.max(0, Math.sqrt(best) - slack);
    }
    // Interpola anéis não amostrados e suaviza levemente (sem degraus na onda).
    for (let r = 0; r < rings; r++) {
      if (r % qStep === 0) continue;
      const r0 = r - (r % qStep);
      const r1 = Math.min(rings - 1, r0 + qStep);
      const t = (r - r0) / Math.max(1, r1 - r0);
      ringClear[r] = ringClear[r0]! + (ringClear[r1]! - ringClear[r0]!) * t;
    }
    for (let r = 0; r < rings; r++) {
      let m = ringClear[r]!;
      for (let k = -qStep * 2; k <= qStep * 2; k++) m = Math.min(m, ringClear[(r + k + rings) % rings]!);
      for (let c = 0; c < cols; c++) out[b * perBand + r * cols + c] = m;
    }
  }
  return out;
}
