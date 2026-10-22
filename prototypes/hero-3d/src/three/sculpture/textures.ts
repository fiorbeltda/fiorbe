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
 * Fibras do desfiar (RIB-03): cada LINHA da textura é um fio através da
 * largura da fita. O valor de cada fio = viés próprio (uns soltam antes que
 * outros) + ruído lento ao longo do comprimento (o fio recua em pontas longas).
 * Periódico em x; equalizado por histograma para o limiar ser linear.
 */
export function createFiberNoise(width = 256, rows = 28): DataTexture {
  let seed = 31;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const fade = (t: number) => t * t * (3 - 2 * t);
  const periodic = (cells: number) => {
    const g = Array.from({ length: cells }, rand);
    return (x: number) => {
      const f = x * cells;
      const i = Math.floor(f);
      return g[i % cells]! + (g[(i + 1) % cells]! - g[i % cells]!) * fade(f - i);
    };
  };
  const raw = new Float32Array(width * rows);
  for (let y = 0; y < rows; y++) {
    const bias = rand();
    const slow = periodic(4);
    const fine = periodic(11);
    for (let x = 0; x < width; x++) {
      const t = x / width;
      raw[y * width + x] = 0.5 * bias + 0.35 * slow(t) + 0.15 * fine(t);
    }
  }
  const order = Array.from(raw.keys()).sort((i, j) => raw[i]! - raw[j]!);
  const data = new Uint8Array(width * rows);
  order.forEach((idx, rank) => (data[idx] = Math.round((rank / (order.length - 1)) * 255)));
  const tex = new DataTexture(data, width, rows, RedFormat, UnsignedByteType);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
