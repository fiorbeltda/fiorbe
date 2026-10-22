import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, Vector3 } from "three";
import type { RibbonQuality } from "./ribbonGeometry";
import { computeClearance } from "./ribbonSpace";

/**
 * Escultura monumental: UMA fita contínua e fechada que percorre toda a
 * silhueta da referência (1672×941) e se entrelaça consigo mesma — um único
 * organismo, não um conjunto de bandas. Coordenadas de controle em pixels da
 * referência + profundidade z + largura relativa por ponto.
 *
 * Percurso (por cima/por baixo alternados nos cruzamentos):
 *  1. arco superior, da ponta esquerda ao topo;
 *  2. diagonal do topo ao pé central — à frente da varredura média;
 *  3. do pé central para a esquerda, subindo por trás;
 *  4. varredura média para a direita — por trás da diagonal;
 *  5. sobe pela borda direita e volta pelo alto, ao fundo;
 *  6. laço interno, atrás de tudo;
 *  7. desce pela borda direita até o pé direito;
 *  8. varredura baixa frontal até a ponta esquerda — à frente da diagonal — e fecha.
 *
 * O fio fino de luz que contorna a silhueta continua à parte (não é fita).
 */
export interface MonumentRibbon {
  /** [xRef, yRef, z, largura relativa]. */
  points: Array<[number, number, number, number]>;
  width: number;
  /** Torção base e amplitude (rad) em torno da tangente. */
  twist: [number, number];
  colorPhase: number;
  /** Quantas vezes a paleta percorre a fita. */
  colorCycles: number;
}

/** Chão da referência (y≈660 px) e fator px→unidade local. */
const REF_FLOOR_PX = 660;
const REF_CENTER_X = 1145;
const PX = 0.00707;
export const FLOOR_LOCAL = -1.5;
/** Fita que recebe a onda. */
export const MAIN_BAND = 0;

export const MONUMENT: readonly MonumentRibbon[] = [
  {
    points: [
      // 1 — arco superior: da ponta esquerda ao topo
      [650, 478, 0.75, 0.85], [672, 405, 0.5, 0.95], [745, 315, 0.3, 1.0], [880, 190, 0.0, 1.1], [1060, 115, -0.1, 1.15], [1220, 140, -0.05, 1.1],
      // 2 — diagonal do topo ao pé central (passa À FRENTE da varredura média)
      [1250, 250, 0.25, 1.05], [1200, 400, 0.45, 1.0], [1100, 540, 0.75, 1.0], [1015, 652, 0.85, 0.95],
      // 3 — do pé central para a esquerda, subindo por trás
      [880, 612, 0.5, 0.85], [760, 540, 0.15, 0.8], [690, 470, -0.35, 0.75],
      // 4 — varredura média para a direita (POR TRÁS da diagonal)
      [860, 360, -0.3, 0.75], [1110, 312, -0.4, 0.8], [1380, 292, -0.25, 0.8], [1570, 336, 0.0, 0.8], [1640, 320, -0.08, 0.9],
      // 5 — sobe pela borda direita e volta pelo alto, ao fundo
      [1590, 200, -0.4, 1.05], [1430, 145, -0.6, 1.05], [1270, 180, -0.8, 0.9],
      // 6 — laço interno, atrás de tudo
      [1150, 300, -0.9, 0.7], [1185, 460, -0.95, 0.65], [1380, 535, -0.9, 0.65], [1540, 470, -0.7, 0.75],
      // 7 — desce pela borda direita até o pé direito
      [1650, 455, -0.35, 0.9], [1600, 585, 0.05, 0.9], [1470, 650, 0.45, 0.8],
      // 8 — varredura baixa frontal até a ponta esquerda (À FRENTE da diagonal)
      [1330, 622, 1.2, 0.6], [1160, 566, 1.5, 0.55], [970, 525, 1.6, 0.55], [800, 560, 1.35, 0.55], [700, 525, 1.0, 0.65],
    ],
    width: 1,
    twist: [0.08, 0.38],
    colorPhase: 0.05,
    colorCycles: 6,
  },
  // Fio fino que contorna a silhueta (as linhas de luz da referência).
  {
    points: [
      [645, 455, -1.2, 1], [770, 225, -1.3, 1], [1000, 98, -1.4, 1], [1350, 105, -1.4, 1], [1610, 215, -1.2, 1],
      [1660, 420, -1.0, 1], [1590, 600, -0.9, 1], [1300, 640, -1.0, 1], [920, 610, -1.1, 1], [700, 560, -1.2, 1],
    ],
    width: 0.022,
    twist: [0, 0],
    colorPhase: 0.6,
    colorCycles: 1.6,
  },
];

const STOPS = ["#06184f", "#0b3aa8", "#1668d8", "#22aed2", "#13968a", "#082a86"].map((h) => new Color(h));

function paletteAt(x: number, out: Color): Color {
  const f = ((x % 1) + 1) % 1;
  const s = f * STOPS.length;
  const i = Math.floor(s);
  const k = s - i;
  const e = k * k * (3 - 2 * k);
  return out.copy(STOPS[i % STOPS.length]!).lerp(STOPS[(i + 1) % STOPS.length]!, e);
}

const toLocal = ([x, y, z]: readonly number[]) => new Vector3((x! - REF_CENTER_X) * PX, FLOOR_LOCAL + (REF_FLOOR_PX - y!) * PX, z!);

/** Largura relativa interpolada (suave, fechada) no parâmetro t da curva. */
function widthAt(points: MonumentRibbon["points"], t: number): number {
  const n = points.length;
  const f = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(f);
  const k = f - i;
  const e = k * k * (3 - 2 * k);
  return points[i % n]![3] + (points[(i + 1) % n]![3] - points[i % n]![3]) * e;
}

export interface MonumentBuild {
  geometry: BufferGeometry;
  bands: number;
  /** Comprimento de arco de cada fita (unidades locais). */
  lengths: number[];
  /** Curvas-espinha. */
  curves: CatmullRomCurve3[];
}

/** `segments` = anéis a cada 12 unidades de comprimento (a densidade não muda com o tamanho da fita). */
export function createMonumentGeometry(quality: RibbonQuality): MonumentBuild {
  const { across } = quality;
  const cols = across + 1;
  const curves = MONUMENT.map((r) => new CatmullRomCurve3(r.points.map(toLocal), true, "centripetal"));
  const lengths = curves.map((c) => c.getLength());
  const segs = lengths.map((L) => Math.max(64, Math.round((quality.segments * L) / 12)));
  const ringsOf = segs.map((s) => s + 1);
  const total = ringsOf.reduce((a, r) => a + r * cols, 0);

  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const colors = new Float32Array(total * 3);
  const rib = new Float32Array(total * 3);
  const tangents = new Float32Array(total * 3);
  const halves = new Float32Array(total);
  const indices = new Uint32Array(segs.reduce((a, s) => a + s, 0) * across * 6);

  const P = new Vector3();
  const T = new Vector3();
  const W = new Vector3();
  const N = new Vector3();
  const B = new Vector3();
  const VIEW = new Vector3(0, 0, 1);
  const UP = new Vector3(0, 1, 0);
  const nrm = new Vector3();
  const col = new Color();
  const TAU = Math.PI * 2;

  let ii = 0;
  let base = 0;
  MONUMENT.forEach((r, band) => {
    const curve = curves[band]!;
    const length = lengths[band]!;
    const segments = segs[band]!;
    const rings = ringsOf[band]!;

    for (let i = 0; i < rings; i++) {
      const u = i / segments;
      curve.getPointAt(u % 1, P);
      curve.getTangentAt(u % 1, T);
      // Largura perpendicular à tangente e ao olhar: faces largas voltadas ao observador.
      W.crossVectors(T, VIEW);
      if (W.lengthSq() < 1e-4) W.crossVectors(T, UP);
      W.normalize();
      B.crossVectors(T, W).normalize();
      const theta = r.twist[0] + r.twist[1] * Math.sin(u * TAU * 7 + band * 1.7);
      W.multiplyScalar(Math.cos(theta)).addScaledVector(B, Math.sin(theta));
      N.crossVectors(T, W).normalize();

      const rel = widthAt(r.points, curve.getUtoTmapping(u % 1, 0));
      const nearFloor = Math.min(1, Math.max(0.4, (P.y - FLOOR_LOCAL) / 0.5));
      const half = (r.width * rel * nearFloor) / 2;

      for (let j = 0; j < cols; j++) {
        const v = -1 + (2 * j) / across;
        const idx = base + i * cols + j;
        const cup = 0.06 * (v * v - 1 / 3) * half;
        positions[idx * 3] = P.x + W.x * v * half + N.x * cup;
        positions[idx * 3 + 1] = Math.max(FLOOR_LOCAL + 0.002, P.y + W.y * v * half + N.y * cup);
        positions[idx * 3 + 2] = P.z + W.z * v * half + N.z * cup;
        nrm.copy(N).addScaledVector(W, -0.08 * v).normalize();
        normals[idx * 3] = nrm.x;
        normals[idx * 3 + 1] = nrm.y;
        normals[idx * 3 + 2] = nrm.z;
        uvs[idx * 2] = u * length * 9;
        uvs[idx * 2 + 1] = (v + 1) / 2;
        paletteAt(u * r.colorCycles + r.colorPhase, col);
        colors[idx * 3] = col.r;
        colors[idx * 3 + 1] = col.g;
        colors[idx * 3 + 2] = col.b;
        rib[idx * 3] = u;
        rib[idx * 3 + 1] = v;
        rib[idx * 3 + 2] = band;
        tangents[idx * 3] = T.x;
        tangents[idx * 3 + 1] = T.y;
        tangents[idx * 3 + 2] = T.z;
        halves[idx] = half;
      }
    }
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < across; j++) {
        const p = base + i * cols + j;
        const q = p + cols;
        indices[ii++] = p;
        indices[ii++] = q;
        indices[ii++] = p + 1;
        indices[ii++] = q;
        indices[ii++] = q + 1;
        indices[ii++] = p + 1;
      }
    }
    base += rings * cols;
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setAttribute("aRib", new BufferAttribute(rib, 3));
  geometry.setAttribute("aTan", new BufferAttribute(tangents, 3));
  geometry.setAttribute("aHalf", new BufferAttribute(halves, 1));
  geometry.setAttribute("aClear", new BufferAttribute(computeClearance(positions, rib, ringsOf, cols, lengths), 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, bands: MONUMENT.length, lengths, curves };
}

/** Posição da figura humana na referência (x≈1495 px, à frente do pé direito). */
export const PERSON_LOCAL = toLocal([1495, REF_FLOOR_PX, 1.9]);
