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
  /**
   * [xRef, yRef, z, largura relativa, torção (rad)]. Torção 0 = face larga
   * voltada ao observador; ±π/2 = só a borda à vista. Interpolada suavemente.
   */
  points: Array<[number, number, number, number, number]>;
  width: number;
  colorPhase: number;
  /** Quantas vezes a paleta percorre a fita (inteiro: sem costura na emenda). */
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
      // 1 — arco superior: da ponta esquerda ao topo (a ponta dobra quase de lado)
      [650, 478, 0.75, 0.85, 1.15], [672, 405, 0.5, 0.95, 0.75], [745, 315, 0.3, 1.0, 0.35], [880, 190, 0.0, 1.1, 0.1], [1060, 115, -0.1, 1.15, -0.1], [1220, 140, -0.05, 1.1, -0.55],
      // 2 — diagonal do topo ao pé central (passa À FRENTE da varredura média); gira e reabre
      [1250, 250, 0.25, 1.05, -1.05], [1200, 400, 0.45, 1.0, -0.45], [1100, 540, 0.75, 1.0, 0.05], [1015, 652, 0.85, 0.95, 0.4],
      // 3 — do pé central para a esquerda, subindo por trás — de lâmina
      [880, 612, 0.5, 0.85, 0.95], [760, 540, 0.15, 0.8, 1.35], [690, 470, -0.35, 0.75, 0.95],
      // 4 — varredura média para a direita (POR TRÁS da diagonal)
      [860, 360, -0.3, 0.75, 0.3], [1110, 312, -0.4, 0.8, 0.0], [1380, 292, -0.25, 0.8, -0.3], [1570, 336, 0.0, 0.8, -0.9], [1640, 320, -0.08, 0.9, -1.3],
      // 5 — sobe pela borda direita e volta pelo alto, ao fundo
      [1590, 200, -0.4, 1.05, -0.6], [1430, 145, -0.6, 1.05, 0.0], [1270, 180, -0.8, 0.9, 0.5],
      // 6 — laço interno, atrás de tudo — face larga: dá massa ao centro-direita
      [1150, 300, -0.9, 0.8, 0.5], [1185, 460, -0.95, 0.9, 0.15], [1380, 535, -0.9, 0.9, -0.1], [1540, 470, -0.7, 0.85, -0.35],
      // 7 — desce pela borda direita até o pé direito
      [1650, 455, -0.35, 0.9, -0.3], [1600, 585, 0.05, 0.9, -0.6], [1470, 650, 0.45, 0.8, -0.2],
      // 8 — varredura baixa frontal até a ponta esquerda (À FRENTE da diagonal)
      [1330, 622, 1.2, 0.6, 0.6], [1160, 566, 1.5, 0.55, 1.0], [970, 525, 1.6, 0.55, 0.6], [800, 560, 1.35, 0.55, 0.2], [700, 525, 1.0, 0.65, 0.8],
    ],
    width: 1,
    colorPhase: 0.05,
    colorCycles: 6,
  },
  // Fio fino que contorna a silhueta (as linhas de luz da referência).
  {
    points: [
      [645, 455, -1.2, 1, 0], [770, 225, -1.3, 1, 0], [1000, 98, -1.4, 1, 0], [1350, 105, -1.4, 1, 0], [1610, 215, -1.2, 1, 0],
      [1660, 420, -1.0, 1, 0], [1590, 600, -0.9, 1, 0], [1300, 640, -1.0, 1, 0], [920, 610, -1.1, 1, 0], [700, 560, -1.2, 1, 0],
    ],
    width: 0.022,
    colorPhase: 0.6,
    colorCycles: 2,
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

/** Valor por ponto de controle interpolado por Catmull-Rom fechado no parâmetro t da curva (C¹). */
function controlAt(points: MonumentRibbon["points"], k: 3 | 4, t: number): number {
  const n = points.length;
  const f = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(f);
  const x = f - i;
  const p0 = points[(i - 1 + n) % n]![k];
  const p1 = points[i % n]![k];
  const p2 = points[(i + 1) % n]![k];
  const p3 = points[(i + 2) % n]![k];
  return 0.5 * (2 * p1 + (-p0 + p2) * x + (2 * p0 - 5 * p1 + 4 * p2 - p3) * x * x + (-p0 + 3 * p1 - 3 * p2 + p3) * x * x * x);
}

const rotateAbout = (v: Vector3, axis: Vector3, angle: number) => v.applyAxisAngle(axis, angle);

/**
 * Referencial da fita ao longo da curva fechada:
 * 1. transporte paralelo (quadros de rotação mínima, dupla reflexão), sem
 *    torções involuntárias;
 * 2. correção de fechamento: o desvio angular acumulado ao fim da volta é
 *    distribuído ao longo do arco, então u=1 coincide com u=0;
 * 3. orientação "de frente para o observador" medida sobre esse referencial
 *    e suavizada (estável mesmo onde a tangente aponta para a câmera);
 * 4. torção autoral somada a ela.
 * Devolve W (direção da largura) por anel; N = T × W.
 */
function ribbonFrames(Ps: Vector3[], Ts: Vector3[], twistAt: (i: number) => number): Vector3[] {
  const n = Ps.length - 1; // último anel = primeiro (fechado)
  const VIEW = new Vector3(0, 0, 1);
  const facing = (T: Vector3) => new Vector3().crossVectors(T, VIEW);
  // 1 — transporte paralelo
  const r: Vector3[] = [facing(Ts[0]!).normalize()];
  const v1 = new Vector3(), rL = new Vector3(), tL = new Vector3(), v2 = new Vector3();
  for (let i = 0; i < n; i++) {
    v1.subVectors(Ps[i + 1]!, Ps[i]!);
    const c1 = v1.dot(v1) || 1e-12;
    rL.copy(r[i]!).addScaledVector(v1, (-2 / c1) * v1.dot(r[i]!));
    tL.copy(Ts[i]!).addScaledVector(v1, (-2 / c1) * v1.dot(Ts[i]!));
    v2.subVectors(Ts[i + 1]!, tL);
    const c2 = v2.dot(v2) || 1e-12;
    r.push(rL.clone().addScaledVector(v2, (-2 / c2) * v2.dot(rL)).normalize());
  }
  // 2 — fechamento
  const signed = (a: Vector3, b: Vector3, axis: Vector3) => Math.atan2(new Vector3().crossVectors(a, b).dot(axis), a.dot(b));
  const gap = signed(r[n]!, r[0]!, Ts[0]!);
  for (let i = 0; i <= n; i++) rotateAbout(r[i]!, Ts[i]!, (gap * i) / n);
  // 3 — ângulo até a orientação de frente, desembrulhado e suavizado (periódico)
  const beta: number[] = [];
  for (let i = 0; i <= n; i++) {
    const f = facing(Ts[i]!);
    const ok = f.lengthSq() > 0.04;
    const b = ok ? signed(r[i]!, f.normalize(), Ts[i]!) : beta[i - 1] ?? 0;
    if (i > 0) {
      let d = b - (beta[i - 1]! % (2 * Math.PI));
      d = Math.atan2(Math.sin(d), Math.cos(d));
      beta.push(beta[i - 1]! + d);
    } else beta.push(b);
  }
  const drift = beta[n]! - beta[0]!; // múltiplo de 2π
  const flat = beta.map((b, i) => b - (drift * i) / n);
  const win = Math.max(2, Math.round(n / 160));
  const smooth = flat.map((_, i) => {
    let acc = 0;
    for (let k = -win; k <= win; k++) acc += flat[(((i + k) % n) + n) % n]!;
    return acc / (2 * win + 1);
  });
  // 4 — torção autoral
  return r.map((ri, i) => rotateAbout(ri.clone(), Ts[i]!, smooth[i % n]! + (drift * i) / n + twistAt(i)));
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
  const bends = new Float32Array(total);
  const indices = new Uint32Array(segs.reduce((a, s) => a + s, 0) * across * 6);

  const N = new Vector3();
  const nrm = new Vector3();
  const col = new Color();

  let ii = 0;
  let base = 0;
  MONUMENT.forEach((r, band) => {
    const curve = curves[band]!;
    const length = lengths[band]!;
    const segments = segs[band]!;
    const rings = ringsOf[band]!;
    // Repetições inteiras das estrias por volta: sem costura de textura na emenda.
    const grooveReps = Math.max(1, Math.round(length * 9));

    const Ps: Vector3[] = [];
    const Ts: Vector3[] = [];
    const ts: number[] = [];
    for (let i = 0; i < rings; i++) {
      const u = (i / segments) % 1;
      Ps.push(curve.getPointAt(u));
      Ts.push(curve.getTangentAt(u).normalize());
      ts.push(curve.getUtoTmapping(u, 0));
    }
    const Ws = ribbonFrames(Ps, Ts, (i) => controlAt(r.points, 4, ts[i]!));
    // Anti-dobra: numa curva fechada, se a largura aponta para o centro da
    // curva a borda interna dobra sobre si mesma (meia-largura · |W·κ| ≥ 1).
    // A fita então gira de lado o mínimo necessário (como uma lâmina real),
    // com a correção espalhada suavemente ao longo do arco; um limite de
    // largura igualmente suave fica só como rede de segurança.
    const ds = length / segments;
    const wrap = (i: number) => ((i % segments) + segments) % segments;
    const halfRaw: number[] = [];
    const kappa: Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      kappa.push(new Vector3().subVectors(Ts[wrap(i + 1)]!, Ts[wrap(i - 1)]!).multiplyScalar(1 / (2 * ds)));
      const nearFloor = Math.min(1, Math.max(0.4, (Ps[i]!.y - FLOOR_LOCAL) / 0.5));
      halfRaw.push((r.width * controlAt(r.points, 3, ts[i]!) * nearFloor) / 2);
    }
    const LIMIT = 0.72;
    const need: number[] = [];
    const kHat = new Vector3();
    const bHat = new Vector3();
    for (let i = 0; i < segments; i++) {
      const k = kappa[i]!.length();
      const c = (LIMIT / Math.max(halfRaw[i]! * k, 1e-6));
      if (c >= 1) {
        need.push(0);
        continue;
      }
      kHat.copy(kappa[i]!).normalize();
      bHat.crossVectors(Ts[i]!, kHat).normalize();
      const W = Ws[i]!;
      const phi = Math.atan2(W.dot(bHat), W.dot(kHat));
      const lim = Math.acos(c); // |cos φ'| ≤ c  ⇔  φ' ∈ [lim, π−lim] (ou o simétrico)
      const target = Math.abs(phi) < Math.PI / 2 ? Math.sign(phi || 1) * Math.max(Math.abs(phi), lim) : Math.sign(phi) * Math.min(Math.abs(phi), Math.PI - lim);
      need.push(target - phi);
    }
    const spread = (arr: number[], win: number, pick: (a: number, b: number) => number) =>
      arr.map((_, i) => {
        let m = arr[i]!;
        for (let k = -win; k <= win; k++) m = pick(m, arr[wrap(i + k)]!);
        return m;
      });
    const blur = (arr: number[], win: number) =>
      arr.map((_, i) => {
        let acc = 0;
        for (let k = -win; k <= win; k++) acc += arr[wrap(i + k)]!;
        return acc / (2 * win + 1);
      });
    const w = Math.max(2, Math.round(0.45 / ds));
    const fix = blur(spread(need, w, (a, b) => (Math.abs(b) > Math.abs(a) ? b : a)), w);
    for (let i = 0; i < rings; i++) rotateAbout(Ws[i]!, Ts[i]!, fix[wrap(i)]!);
    // Rede de segurança (após o giro), suave: mínimo numa janela larga e média numa menor.
    const capRaw = Array.from({ length: segments }, (_, i) => {
      const bend = Math.abs(Ws[i]!.dot(kappa[i]!));
      return bend > 1e-4 ? Math.min(halfRaw[i]!, 0.85 / bend) / halfRaw[i]! : 1;
    });
    const capScale = blur(spread(capRaw, 2 * w, Math.min), w);

    for (let i = 0; i < rings; i++) {
      const u = i / segments;
      const P = Ps[i]!;
      const T = Ts[i]!;
      const W = Ws[i]!;
      N.crossVectors(T, W).normalize();

      const half = halfRaw[wrap(i)]! * capScale[wrap(i)]!;
      // Quão perto de dobrar está o anel (0 = reto; 1 = dobraria): o material suaviza o relevo aí.
      const ringBend = Math.min(1, half * Math.abs(Ws[i]!.dot(kappa[wrap(i)]!)) + half * kappa[wrap(i)]!.length() * 0.35);

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
        uvs[idx * 2] = u * grooveReps;
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
        bends[idx] = ringBend;
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
  geometry.setAttribute("aBend", new BufferAttribute(bends, 1));
  geometry.setAttribute("aClear", new BufferAttribute(computeClearance(positions, rib, ringsOf, cols, lengths), 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, bands: MONUMENT.length, lengths, curves };
}

/** Posição da figura humana na referência (x≈1495 px, à frente do pé direito). */
export const PERSON_LOCAL = toLocal([1495, REF_FLOOR_PX, 1.9]);
