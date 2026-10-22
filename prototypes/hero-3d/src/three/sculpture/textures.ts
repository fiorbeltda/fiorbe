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
    const fine = Math.sin((y / size) * Math.PI * 2 * 38) * 0.5 + 0.5;
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
