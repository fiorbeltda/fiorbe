import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, Vector3 } from "three";
import type { RibbonQuality } from "./ribbonGeometry";
import { computeClearance } from "./ribbonSpace";

/**
 * Escultura monumental com fitas AUTORAIS: cada fita é uma curva fechada
 * desenhada a partir das proporções medidas na referência (1672×941).
 * Coordenadas de controle em pixels da referência + profundidade z; a
 * conversão para o espaço local mantém a proporção da imagem.
 *
 * A largura da fita é orientada para o observador (faces largas visíveis,
 * como na referência) e girada por uma torção suave ao longo do percurso.
 * Nos cruzamentos, as fitas têm profundidades diferentes de propósito.
 */
export interface MonumentRibbon {
  /** [xRef, yRef, z] — pixels da referência e profundidade em unidades locais. */
  points: Array<[number, number, number]>;
  width: number;
  /** Torção base e amplitude (rad) em torno da tangente. */
  twist: [number, number];
  colorPhase: number;
}

/** Chão da referência (y≈660 px) e fator px→unidade local. */
const REF_FLOOR_PX = 660;
const REF_CENTER_X = 1145;
const PX = 0.00707;
export const FLOOR_LOCAL = -1.5;

export const MONUMENT: readonly MonumentRibbon[] = [
  // A — grande arco esquerdo: nasce na ponta esquerda, sobe ao topo, desce pelo centro até o pé.
  {
    points: [
      [655, 452, 0.2], [760, 300, 0.1], [900, 175, -0.1], [1060, 112, -0.05], [1220, 150, 0.0],
      [1265, 300, 0.2], [1200, 450, 0.7], [1080, 590, 0.9], [1015, 657, 0.8], [900, 600, 0.6], [760, 520, 0.4],
    ],
    width: 1.1,
    twist: [0.1, 0.28],
    colorPhase: 0.05,
  },
  // B — grande laço direito: do topo central à borda direita, desce ao pé direito.
  {
    points: [
      [1160, 260, -0.35], [1330, 150, -0.55], [1520, 205, -0.3], [1635, 380, 0.1], [1610, 545, 0.4],
      [1460, 655, 0.6], [1330, 640, 0.5], [1250, 520, 0.2], [1190, 390, -0.25],
    ],
    width: 1.15,
    twist: [-0.12, 0.26],
    colorPhase: 0.32,
  },
  // C — varredura horizontal no meio, cruzando da esquerda para a direita pela frente.
  {
    points: [
      [690, 470, 0.9], [880, 345, 1.1], [1120, 305, 1.25], [1380, 290, 1.15], [1590, 335, 0.9],
      [1560, 445, 0.7], [1360, 420, 1.05], [1110, 455, 1.2], [880, 545, 1.0],
    ],
    width: 0.72,
    twist: [0.2, 0.3],
    colorPhase: 0.55,
  },
  // D — laço interno ciano, mais ao fundo, à direita do centro.
  {
    points: [
      [1060, 360, -0.9], [1190, 235, -1.0], [1400, 245, -0.9], [1510, 380, -0.6], [1430, 515, -0.4],
      [1260, 560, -0.5], [1120, 480, -0.8],
    ],
    width: 0.62,
    twist: [0.35, 0.25],
    colorPhase: 0.72,
  },
  // E — varredura baixa frontal, rasante ao chão.
  {
    points: [
      [760, 585, 1.5], [960, 470, 1.6], [1170, 515, 1.7], [1330, 600, 1.6], [1520, 645, 1.55],
      [1360, 657, 1.95], [1110, 640, 1.85], [900, 630, 1.7],
    ],
    width: 0.52,
    twist: [-0.2, 0.3],
    colorPhase: 0.9,
  },
  // F — fio fino que contorna a silhueta (as linhas de luz da referência).
  {
    points: [
      [645, 455, -1.2], [770, 225, -1.3], [1000, 98, -1.4], [1350, 105, -1.4], [1610, 215, -1.2],
      [1660, 420, -1.0], [1590, 600, -0.9], [1300, 640, -1.0], [920, 610, -1.1], [700, 560, -1.2],
    ],
    width: 0.022,
    twist: [0, 0],
    colorPhase: 0.6,
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

const toLocal = ([x, y, z]: [number, number, number]) =>
  new Vector3((x - REF_CENTER_X) * PX, FLOOR_LOCAL + (REF_FLOOR_PX - y) * PX, z);

export interface MonumentBuild {
  geometry: BufferGeometry;
  bands: number;
  /** Comprimento de arco de cada fita (unidades locais). */
  lengths: number[];
  /** Curvas-espinha (para pontos de contato entre fitas). */
  curves: CatmullRomCurve3[];
}

export function createMonumentGeometry(quality: RibbonQuality): MonumentBuild {
  const { segments, across } = quality;
  const rings = segments + 1;
  const cols = across + 1;
  const perBand = rings * cols;
  const total = perBand * MONUMENT.length;

  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const colors = new Float32Array(total * 3);
  const rib = new Float32Array(total * 3);
  const tangents = new Float32Array(total * 3);
  const halves = new Float32Array(total);
  const lengths: number[] = [];
  const curves: CatmullRomCurve3[] = [];
  const indices = new Uint32Array(segments * across * 6 * MONUMENT.length);

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
  MONUMENT.forEach((r, band) => {
    const curve = new CatmullRomCurve3(r.points.map(toLocal), true, "centripetal");
    const length = curve.getLength();
    lengths.push(length);
    curves.push(curve);
    const base = band * perBand;

    for (let i = 0; i < rings; i++) {
      const u = i / segments;
      curve.getPointAt(u % 1, P);
      curve.getTangentAt(u % 1, T);
      // Largura perpendicular à tangente e ao olhar: faces largas voltadas ao observador.
      W.crossVectors(T, VIEW);
      if (W.lengthSq() < 1e-4) W.crossVectors(T, UP);
      W.normalize();
      B.crossVectors(T, W).normalize();
      const theta = r.twist[0] + r.twist[1] * Math.sin(u * TAU * 2 + band * 1.7);
      W.multiplyScalar(Math.cos(theta)).addScaledVector(B, Math.sin(theta));
      N.crossVectors(T, W).normalize();

      const swell = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(u * TAU * 3 + band));
      const nearFloor = Math.min(1, Math.max(0.4, (P.y - FLOOR_LOCAL) / 0.5));
      const half = (r.width * swell * nearFloor) / 2;

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
        paletteAt(u * 1.6 + r.colorPhase, col);
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
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setAttribute("aRib", new BufferAttribute(rib, 3));
  geometry.setAttribute("aTan", new BufferAttribute(tangents, 3));
  geometry.setAttribute("aHalf", new BufferAttribute(halves, 1));
  geometry.setAttribute("aClear", new BufferAttribute(computeClearance(positions, rib, rings, cols, MONUMENT.length), 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, bands: MONUMENT.length, lengths, curves };
}

/** Posição da figura humana na referência (x≈1495 px, à frente do pé direito). */
export const PERSON_LOCAL = toLocal([1495, REF_FLOOR_PX, 1.9]);
