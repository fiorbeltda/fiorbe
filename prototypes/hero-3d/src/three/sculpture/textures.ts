import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RedFormat, UnsignedByteType } from "three";

/**
 * Microtextura direcional: sulcos finos que correm ao longo da fita
 * (variam só através da largura), como metal escovado / seda tecnológica.
 * Gerada em código: nenhum arquivo para baixar.
 */
export function createGrooveTexture(size = 256): DataTexture {
  const data = new Uint8Array(size * size);
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const rows = new Float32Array(size);
  for (let y = 0; y < size; y++) {
    const fine = Math.sin((y / size) * Math.PI * 2 * 36) * 0.5 + 0.5;
    const medium = Math.sin((y / size) * Math.PI * 2 * 9 + 1.3) * 0.5 + 0.5;
    rows[y] = 0.55 * fine + 0.25 * medium + 0.2 * rand();
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const jitter = (rand() - 0.5) * 0.06;
      data[y * size + x] = Math.max(0, Math.min(255, Math.round((rows[y]! + jitter) * 255)));
    }
  }
  const tex = new DataTexture(data, size, size, RedFormat, UnsignedByteType);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Ruído "fibroso" para o desfiar (RIB-03): baixa frequência ao longo da fita
 * (x) e alta através dela (y) — o limiar abre fios alongados, não manchas.
 * Repetível nos dois eixos; distribuição aproximadamente uniforme em [0,1]
 * para o limiar responder de forma linear.
 */
export function createFiberNoise(width = 256, height = 256): DataTexture {
  let seed = 31;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const lattice = (gx: number, gy: number) => Array.from({ length: gx * gy }, rand);
  const octaves: Array<{ gx: number; gy: number; w: number; g: number[] }> = [
    { gx: 5, gy: 30, w: 0.66, g: [] },
    { gx: 12, gy: 64, w: 0.24, g: [] },
    { gx: 32, gy: 32, w: 0.1, g: [] },
  ];
  octaves.forEach((o) => (o.g = lattice(o.gx, o.gy)));
  const fade = (t: number) => t * t * (3 - 2 * t);
  const raw = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let v = 0;
      for (const o of octaves) {
        const fx = (x / width) * o.gx;
        const fy = (y / height) * o.gy;
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const tx = fade(fx - x0);
        const ty = fade(fy - y0);
        const at = (i: number, j: number) => o.g[((j % o.gy) * o.gx + (i % o.gx)) % o.g.length]!;
        const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
        const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
        v += o.w * (a + (b - a) * ty);
      }
      raw[y * width + x] = v;
    }
  }
  // Equaliza por histograma → limiar linear.
  const order = Array.from(raw.keys()).sort((i, j) => raw[i]! - raw[j]!);
  const data = new Uint8Array(width * height);
  order.forEach((idx, rank) => (data[idx] = Math.round((rank / (order.length - 1)) * 255)));
  const tex = new DataTexture(data, width, height, RedFormat, UnsignedByteType);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
