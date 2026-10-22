import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, Vector3, type Mesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { paletteAt, type MonumentBuild } from "./monument";

/**
 * Escultura modelada no Blender (blender/build_sculpture.py → GLB).
 *
 * O GLB traz posição, normal e dois atributos escalares:
 *   _arc  coordenada longitudinal 0..1 por comprimento de arco (um valor por anel)
 *   _v    posição na largura da seção, −1..1
 * A curva central não sobrevive ao glTF, então é reconstruída aqui: cada anel
 * (mesmo _arc) dá o centro, a direção da largura (borda −1 → +1) e a meia-largura;
 * a tangente vem dos anéis vizinhos (fechado: o último liga ao primeiro). Daí saem
 * os mesmos atributos que a geometria procedural fornece ao material (aRib, aTan,
 * aN, aHalf, aClear, color) — a onda funciona igual.
 */
export async function loadBlenderGeometry(url: string): Promise<BufferGeometry> {
  const gltf = await new GLTFLoader().loadAsync(url);
  let geometry: BufferGeometry | null = null;
  gltf.scene.traverse((o) => {
    if (!geometry && (o as Mesh).isMesh) geometry = (o as Mesh).geometry as BufferGeometry;
  });
  if (!geometry) throw new Error("GLB sem malha");
  return geometry;
}

export function buildFromBlender(src: BufferGeometry): MonumentBuild {
  const pos = src.getAttribute("position");
  const arcAttr = src.getAttribute("_arc");
  const vAttr = src.getAttribute("_v");
  if (!arcAttr || !vAttr) throw new Error("GLB sem _arc/_v");
  const n = pos.count;

  // Anéis: agrupa vértices pelo valor exato de _arc.
  const ringOf = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const a = arcAttr.getX(i);
    let list = ringOf.get(a);
    if (!list) ringOf.set(a, (list = []));
    list.push(i);
  }
  const arcs = [...ringOf.keys()].sort((a, b) => a - b);
  const R = arcs.length;
  const centers: Vector3[] = [];
  const widths: Vector3[] = [];
  const halves: number[] = [];
  const p = new Vector3();
  for (const a of arcs) {
    const idx = ringOf.get(a)!;
    const c = new Vector3();
    const lo = new Vector3();
    const hi = new Vector3();
    let nlo = 0;
    let nhi = 0;
    for (const i of idx) {
      p.fromBufferAttribute(pos, i);
      c.add(p);
      const v = vAttr.getX(i);
      if (v < -0.9) (lo.add(p), nlo++);
      if (v > 0.9) (hi.add(p), nhi++);
    }
    c.multiplyScalar(1 / idx.length);
    lo.multiplyScalar(1 / Math.max(1, nlo));
    hi.multiplyScalar(1 / Math.max(1, nhi));
    const w = hi.sub(lo);
    halves.push(w.length() / 2);
    widths.push(w.normalize());
    centers.push(c);
  }
  let length = 0;
  for (let r = 0; r < R; r++) length += centers[r]!.distanceTo(centers[(r + 1) % R]!);
  const tangents = centers.map((_, r) => new Vector3().subVectors(centers[(r + 1) % R]!, centers[(r - 1 + R) % R]!).normalize());
  const normalsN = tangents.map((t, r) => new Vector3().crossVectors(t, widths[r]!).normalize());
  const ringIndex = new Map(arcs.map((a, r) => [a, r]));

  const rib = new Float32Array(n * 3);
  const tan = new Float32Array(n * 3);
  const rn = new Float32Array(n * 3);
  const half = new Float32Array(n);
  const colors = new Float32Array(n * 3);
  // UV longitudinal (repetições inteiras por volta: sem costura) — a anisotropia do
  // metal deriva a direção do brilho das derivadas de UV; sem UV ela degenera em listras.
  const uvs = new Float32Array(n * 2);
  const reps = Math.max(1, Math.round(length * 9));
  const col = new Color();
  for (let i = 0; i < n; i++) {
    const r = ringIndex.get(arcAttr.getX(i))!;
    const u = arcAttr.getX(i);
    rib.set([u, vAttr.getX(i), 0], i * 3);
    tan.set([tangents[r]!.x, tangents[r]!.y, tangents[r]!.z], i * 3);
    rn.set([normalsN[r]!.x, normalsN[r]!.y, normalsN[r]!.z], i * 3);
    half[i] = halves[r]!;
    uvs[i * 2] = u * reps;
    uvs[i * 2 + 1] = (vAttr.getX(i) + 1) / 2;
    paletteAt(u * 6 + 0.05, col);
    colors.set([col.r, col.g, col.b], i * 3);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", pos);
  // O perfil do Curve to Mesh sai com as faces voltadas para dentro da lâmina:
  // inverte o enrolamento e as normais (o material desenha só as faces externas).
  const index = src.getIndex()!;
  const tri = index.array.slice() as Uint32Array | Uint16Array;
  for (let t = 0; t < tri.length; t += 3) {
    const k = tri[t + 1]!;
    tri[t + 1] = tri[t + 2]!;
    tri[t + 2] = k;
  }
  const nrm = (src.getAttribute("normal").array as Float32Array).map((x) => -x);
  geometry.setAttribute("normal", new BufferAttribute(nrm, 3));
  geometry.setIndex(new BufferAttribute(tri, 1));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setAttribute("aRib", new BufferAttribute(rib, 3));
  geometry.setAttribute("aTan", new BufferAttribute(tan, 3));
  geometry.setAttribute("aN", new BufferAttribute(rn, 3));
  geometry.setAttribute("aHalf", new BufferAttribute(half, 1));
  geometry.setAttribute("aClear", new BufferAttribute(clearanceByRing(pos.array as Float32Array, arcAttr.array as Float32Array, centers, arcs, length), 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const curve = new CatmullRomCurve3(centers, true, "centripetal");
  return { geometry, bands: 1, lengths: [length], curves: [curve], cols: 0, profile: "blade" };
}

/**
 * Folga por anel: menor distância do anel a vértices de trechos distantes no
 * percurso (> 0,9 de arco), menos uma margem; constante na seção. Grade
 * espacial, alvos amostrados — dezenas de milissegundos.
 */
function clearanceByRing(positions: Float32Array, arc: Float32Array, centers: Vector3[], arcs: number[], length: number, cap = 0.6, slack = 0.08): Float32Array {
  const n = positions.length / 3;
  const cell = cap;
  const key = (x: number, y: number, z: number) => ((Math.floor(x / cell) + 512) * 1024 + (Math.floor(y / cell) + 512)) * 1024 + (Math.floor(z / cell) + 512);
  const grid = new Map<number, number[]>();
  for (let i = 0; i < n; i += 2) {
    const k = key(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
    let list = grid.get(k);
    if (!list) grid.set(k, (list = []));
    list.push(i);
  }
  const skip = 0.9 / length;
  // Vértices de cada anel (amostrados) para a consulta.
  const byArc = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const a = arc[i]!;
    let l = byArc.get(a);
    if (!l) byArc.set(a, (l = []));
    l.push(i);
  }
  const ringClear = arcs.map((a) => {
    const verts = byArc.get(a)!;
    let best = cap * cap;
    for (let s = 0; s < verts.length; s += Math.max(1, Math.floor(verts.length / 6))) {
      const i = verts[s]!;
      const x = positions[i * 3]!, y = positions[i * 3 + 1]!, z = positions[i * 3 + 2]!;
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      for (let gx = cx - 1; gx <= cx + 1; gx++)
        for (let gy = cy - 1; gy <= cy + 1; gy++)
          for (let gz = cz - 1; gz <= cz + 1; gz++) {
            const list = grid.get(((gx + 512) * 1024 + (gy + 512)) * 1024 + (gz + 512));
            if (!list) continue;
            for (const j of list) {
              const du = Math.abs(arc[j]! - a);
              if (Math.min(du, 1 - du) < skip) continue;
              const dx = positions[j * 3]! - x, dy = positions[j * 3 + 1]! - y, dz = positions[j * 3 + 2]! - z;
              const d = dx * dx + dy * dy + dz * dz;
              if (d < best) best = d;
            }
          }
    }
    return Math.max(0, Math.sqrt(best) - slack);
  });
  void centers;
  // Mínimo numa janela de anéis (sem degraus na onda).
  const R = arcs.length;
  const win = 4;
  const smooth = ringClear.map((_, r) => {
    let m = Infinity;
    for (let k = -win; k <= win; k++) m = Math.min(m, ringClear[(r + k + R) % R]!);
    return m;
  });
  const ringIndex = new Map(arcs.map((a, r) => [a, r]));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = smooth[ringIndex.get(arc[i]!)!]!;
  return out;
}
