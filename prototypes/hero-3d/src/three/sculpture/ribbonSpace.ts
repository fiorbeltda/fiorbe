/**
 * Folga de cada vértice até a superfície mais próxima que NÃO seja a sua
 * vizinhança imediata (outra fita, ou outro trecho da mesma fita a mais de
 * `arcSkip` de distância ao longo do percurso), limitada a `cap`. O shader
 * usa isso para que a deformação da onda nunca leve uma passagem da fita a
 * atravessar outra.
 *
 * Amostragem: anéis a cada ~0,07 unidade de arco e 5 posições na largura,
 * contra os vértices de anéis a cada ~0,035 (grade espacial). A distância
 * entre amostras superestima a folga real em até ~meio espaçamento; por isso
 * o resultado é descontado de `slack`. Valor constante através da largura.
 */
export function computeClearance(
  positions: Float32Array,
  rib: Float32Array,
  ringsOf: number[],
  cols: number,
  lengths: number[],
  cap = 0.6,
  slack = 0.08,
  arcSkip = 0.9,
): Float32Array {
  const n = positions.length / 3;
  const cell = cap;
  const key = (gx: number, gy: number, gz: number) => ((gx + 512) * 1024 + (gy + 512)) * 1024 + (gz + 512);
  const starts: number[] = [];
  ringsOf.reduce((acc, r) => (starts.push(acc), acc + r * cols), 0);

  const grid = new Map<number, number[]>();
  ringsOf.forEach((rings, b) => {
    const step = Math.max(1, Math.round((rings - 1) / (lengths[b]! / 0.035)));
    for (let r = 0; r < rings; r += step)
      for (let c = 0; c < cols; c++) {
        const i = starts[b]! + r * cols + c;
        const k = key(Math.floor(positions[i * 3]! / cell), Math.floor(positions[i * 3 + 1]! / cell), Math.floor(positions[i * 3 + 2]! / cell));
        let list = grid.get(k);
        if (!list) grid.set(k, (list = []));
        list.push(i);
      }
  });

  const out = new Float32Array(n).fill(cap);
  const qCols = [0, Math.round((cols - 1) * 0.25), Math.round((cols - 1) * 0.5), Math.round((cols - 1) * 0.75), cols - 1];
  ringsOf.forEach((rings, b) => {
    const L = lengths[b]!;
    const skipU = arcSkip / L;
    const qStep = Math.max(1, Math.round((rings - 1) / (L / 0.07)));
    const ringClear = new Float32Array(rings).fill(cap);
    for (let r = 0; r < rings; r += qStep) {
      let best = cap * cap;
      for (const c of qCols) {
        const i = starts[b]! + r * cols + c;
        const x = positions[i * 3]!, y = positions[i * 3 + 1]!, z = positions[i * 3 + 2]!;
        const u = rib[i * 3]!;
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
        for (let gx = cx - 1; gx <= cx + 1; gx++)
          for (let gy = cy - 1; gy <= cy + 1; gy++)
            for (let gz = cz - 1; gz <= cz + 1; gz++) {
              const list = grid.get(key(gx, gy, gz));
              if (!list) continue;
              for (const j of list) {
                if (Math.round(rib[j * 3 + 2]!) === b) {
                  const du = Math.abs(rib[j * 3]! - u);
                  if (Math.min(du, 1 - du) < skipU) continue;
                }
                const dx = positions[j * 3]! - x, dy = positions[j * 3 + 1]! - y, dz = positions[j * 3 + 2]! - z;
                const d = dx * dx + dy * dy + dz * dz;
                if (d < best) best = d;
              }
            }
      }
      ringClear[r] = Math.max(0, Math.sqrt(best) - slack);
    }
    // Interpola anéis não amostrados e toma o mínimo numa janela (sem degraus na onda).
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
      for (let c = 0; c < cols; c++) out[starts[b]! + r * cols + c] = m;
    }
  });
  return out;
}
