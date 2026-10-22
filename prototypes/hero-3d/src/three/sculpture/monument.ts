import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, Vector3 } from "three";
import type { RibbonQuality } from "./ribbonGeometry";
import { computeClearance } from "./ribbonSpace";

/**
 * Escultura monumental: UMA fita contínua e fechada que percorre toda a
 * silhueta da referência (1672×941) e se entrelaça consigo mesma. Pontos de
 * controle em pixels da referência + profundidade z + largura relativa +
 * torção autoral.
 *
 * Formas disponíveis (`?forma=`), todas preservadas para comparação:
 *  - `v32`: o percurso da rodada anterior (folha sem espessura).
 *  - `a`:   percurso redesenhado a partir do mapa da referência (varredura
 *           ascendente, coroa, redemoinho à direita, saia central) — lâmina
 *           com espessura e borda arredondada.
 *  - `b`:   o mesmo percurso de `a` com perfil laminado (três lâminas
 *           paralelas na largura, como as faixas sobrepostas da referência).
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

type ControlPoint = [number, number, number, number, number];

/** V3.2 — percurso da rodada anterior (preservado; profundidade ×1,3 já aplicada). */
const V32: ControlPoint[] = ([
  [650, 478, 0.75, 0.9, 1.15], [672, 405, 0.5, 1.1, 0.75], [745, 315, 0.3, 1.3, 0.35], [880, 190, 0.0, 1.45, 0.1], [1060, 115, -0.1, 1.5, -0.1], [1220, 140, -0.05, 1.35, -0.55],
  [1250, 250, 0.25, 1.1, -0.85], [1200, 400, 0.45, 1.2, -0.45], [1100, 540, 0.75, 1.15, 0.05], [1015, 652, 0.85, 1.05, 0.4],
  [880, 612, 0.5, 0.9, 0.95], [760, 540, 0.15, 0.95, 1.35], [690, 470, -0.35, 0.85, 0.95],
  [860, 360, -0.48, 0.9, 0.9], [1110, 312, -0.4, 1.05, 0.25], [1380, 292, -0.25, 1.1, -0.45], [1570, 336, 0.0, 1.0, -1.1], [1640, 320, -0.08, 0.95, -1.45],
  [1590, 200, -0.4, 1.3, -0.6], [1430, 145, -0.6, 1.35, 0.0], [1270, 180, -0.8, 1.1, 0.5],
  [1150, 300, -0.9, 0.8, 0.5], [1185, 460, -0.95, 0.9, 0.15], [1380, 535, -0.9, 0.9, -0.1], [1540, 470, -0.7, 0.85, -0.35],
  [1650, 455, -0.35, 1.1, -0.3], [1600, 585, 0.05, 1.05, -0.6], [1470, 650, 0.45, 0.9, -0.2],
  [1330, 622, 1.2, 0.75, 0.2], [1160, 566, 1.5, 0.8, 0.75], [970, 525, 1.6, 0.85, 1.2], [800, 560, 1.35, 0.75, 0.6], [700, 525, 1.0, 0.75, 0.9],
] as ControlPoint[]).map((p) => [p[0], p[1], p[2] * 1.3, p[3], p[4]]);

/**
 * Forma C — percurso da V3.2 com o que esta rodada provou: lâmina com
 * espessura, inclinação de base (faixas vistas de lado) e largura maior.
 * Inclinada, a largura passa a ocupar profundidade: a volta pela esquerda
 * (pontos 12–13) recua e o início da diagonal (6–7) avança, para nada se tocar.
 */
const C_DEPTH: Record<number, number> = { 6: 0.4, 7: 0.15, 12: -0.35, 13: -0.35 };
/** Larguras relativas sobrepostas (o fim do arco superior estreita antes de mergulhar na diagonal). */
const C_WIDTH: Record<number, number> = { 5: 0.95 };
const FORM_C: ControlPoint[] = V32.map((p, i) => [p[0], p[1], p[2] + (C_DEPTH[i] ?? 0), C_WIDTH[i] ?? p[3], p[4]]);

/**
 * Forma A — redesenhada a partir do mapa da referência (coordenadas da
 * imagem; z e torção são decisões de escultura, não medidas). O percurso é
 * um "novelo": passagens alternadas para a direita e para a esquerda, como
 * as faixas em leque da referência, todas parte da mesma fita.
 *  G1 faixa baixa →  : nasce no chão à esquerda e sobe até o redemoinho, À FRENTE;
 *  G2 laço externo   : contorna a borda direita por trás, até o alto;
 *  G3 coroa ←        : face larga no topo, desce até a ponta esquerda;
 *  G4 curva esquerda : vira na ponta e volta;
 *  G5 faixa média →  : atravessa o centro e mergulha na saia até o pé central;
 *  G6 espiral interna: sobe e gira dentro do redemoinho, desce ao pé direito;
 *  G7 varredura baixa←: rasante, à frente de tudo, de volta à ponta esquerda (fecha em G1).
 */
const FORM_A: ControlPoint[] = [
  // G1
  [668, 560, 1.45, 0.9, 1.0], [780, 500, 1.35, 1.15, 0.5], [930, 450, 1.3, 1.3, 0.1], [1100, 420, 1.25, 1.35, 0.0], [1280, 410, 1.15, 1.3, -0.2],
  [1430, 400, 0.95, 1.15, -0.6], [1560, 370, 0.7, 1.0, -1.0],
  // G2
  [1648, 300, 0.6, 1.05, -1.2], [1630, 200, -0.25, 1.15, -0.6], [1520, 140, -0.6, 1.25, -0.1], [1380, 125, -0.75, 1.35, 0.1],
  // G3
  [1230, 105, -0.75, 1.5, 0.0], [1070, 110, -0.6, 1.55, 0.05], [920, 150, -0.45, 1.45, 0.15], [790, 240, -0.3, 1.25, 0.35], [700, 350, -0.15, 1.05, 0.7],
  // G4
  [668, 440, 0.0, 0.9, 1.1], [720, 505, 0.15, 0.95, 0.9],
  // G5
  [840, 470, -0.3, 1.1, 0.5], [980, 540, -0.35, 1.3, 0.2], [1080, 630, -0.3, 1.5, -0.2], [1200, 560, -0.3, 1.35, 0.2], [1310, 430, -0.5, 1.15, 0.6], [1360, 330, -0.65, 1.0, 0.9],
  // G6
  [1440, 270, -0.45, 0.95, 1.1], [1545, 300, -0.75, 0.95, 0.7], [1575, 405, -0.7, 0.95, 0.2], [1510, 500, -0.35, 0.95, -0.2], [1430, 620, 0.1, 0.85, -0.3], [1380, 650, 0.3, 0.85, -0.1],
  // G7
  [1250, 615, 1.3, 0.8, 0.6], [1100, 620, 1.65, 0.8, 1.0], [950, 625, 1.8, 0.8, 0.7], [820, 630, 1.8, 0.75, 0.4], [700, 620, 1.7, 0.75, 0.8], [645, 595, 1.6, 0.75, 1.1],
];

export interface Gesture {
  name: string;
  from: number;
  to: number;
  color: string;
}

/** Grandes gestos das formas C/B (= percurso V3.2), por índice de ponto de controle. */
export const GESTURES_C: Gesture[] = [
  { name: "arco superior", from: 0, to: 5, color: "#c77dff" },
  { name: "diagonal ao pé central", from: 5, to: 9, color: "#ff4d6d" },
  { name: "retorno pela esquerda", from: 9, to: 12, color: "#4dabff" },
  { name: "varredura média", from: 12, to: 17, color: "#3bf0a0" },
  { name: "borda direita e alto", from: 17, to: 20, color: "#ff9f1c" },
  { name: "laço interno", from: 20, to: 24, color: "#ffd23f" },
  { name: "descida ao pé direito", from: 24, to: 27, color: "#9ad1ff" },
  { name: "varredura baixa", from: 27, to: 33, color: "#ffffff" },
];

/** Grandes gestos da forma A (índices de pontos de controle) — usados na visualização de diagnóstico. */
export const GESTURES_A: Gesture[] = [
  { name: "G1 faixa baixa →", from: 0, to: 7, color: "#ff4d6d" },
  { name: "G2 laço externo", from: 7, to: 11, color: "#ff9f1c" },
  { name: "G3 coroa ←", from: 11, to: 16, color: "#c77dff" },
  { name: "G4 curva esquerda", from: 16, to: 18, color: "#4dabff" },
  { name: "G5 faixa média → e saia", from: 18, to: 24, color: "#3bf0a0" },
  { name: "G6 espiral interna", from: 24, to: 30, color: "#ffd23f" },
  { name: "G7 varredura baixa ←", from: 30, to: 36, color: "#ffffff" },
];

const HAIRLINE: MonumentRibbon = {
  points: [
    [645, 455, -1.5, 1, 0], [770, 225, -1.55, 1, 0], [1000, 98, -1.6, 1, 0], [1350, 105, -1.65, 1, 0], [1610, 215, -1.7, 1, 0],
    [1668, 420, -1.7, 1, 0], [1590, 600, -1.4, 1, 0], [1300, 640, -1.3, 1, 0], [920, 610, -1.4, 1, 0], [700, 560, -1.5, 1, 0],
  ],
  width: 0.022,
  colorPhase: 0.6,
  colorCycles: 2,
};

/** Perfil transversal da fita. */
export type ProfileKind = "sheet" | "blade" | "laminated";
export type FormName = "v32" | "a" | "b" | "c";
export interface MonumentForm {
  ribbons: MonumentRibbon[];
  gestures: Gesture[];
  profile: ProfileKind;
  /**
   * Inclinação de base somada à torção autoral (rad). Com 0, a face larga
   * encara o observador em todo o percurso e as faixas largas achatam a peça
   * numa parede; inclinadas (~50°), leem como lâminas vistas de lado que rolam.
   */
  tilt: number;
}
const ribbon = (points: ControlPoint[], width = 1): MonumentRibbon => ({ points, width, colorPhase: 0.05, colorCycles: 6 });
export const FORMS: Record<FormName, MonumentForm> = {
  v32: { ribbons: [ribbon(V32), HAIRLINE], gestures: GESTURES_C, profile: "sheet", tilt: 0 },
  a: { ribbons: [ribbon(FORM_A, 1.4), HAIRLINE], gestures: GESTURES_A, profile: "blade", tilt: 0.75 },
  b: { ribbons: [ribbon(FORM_C, 1.15), HAIRLINE], gestures: GESTURES_C, profile: "laminated", tilt: 0.45 },
  c: { ribbons: [ribbon(FORM_C, 1.15), HAIRLINE], gestures: GESTURES_C, profile: "blade", tilt: 0.45 },
};
export const DEFAULT_FORM: FormName = "c";
export const isFormName = (v: string | null): v is FormName => v === "v32" || v === "a" || v === "b" || v === "c";

const STOPS = ["#06184f", "#0b3aa8", "#1668d8", "#22aed2", "#13968a", "#082a86"].map((h) => new Color(h));

export function paletteAt(x: number, out: Color): Color {
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
  /** Vértices por anel (perfil transversal completo). */
  cols: number;
  profile: ProfileKind;
}

/** Ponto do perfil transversal: deslocamentos (W, N) absolutos, normal 2D e posição v na largura (−1..1). */
interface ProfilePoint {
  w: number;
  n: number;
  nw: number;
  nn: number;
  v: number;
}
interface ProfileLoop {
  closed: boolean;
  pts: ProfilePoint[];
}

/** Concavidade leve da seção (metal estampado, não papel). */
const cup = (v: number, half: number) => 0.06 * (v * v - 1 / 3) * half;

/**
 * Lâmina fechada: face de cima, borda arredondada (meia-cana), face de baixo,
 * borda arredondada. `c`/`hv` = centro e meia-largura em unidades de v;
 * `t` = espessura absoluta; `dn` = deslocamento ao longo da normal.
 */
function bladeLoop(half: number, across: number, c: number, hv: number, t: number, dn: number): ProfileLoop {
  const r = t / 2;
  const span = Math.max(half * hv - r, 1e-4);
  const pts: ProfilePoint[] = [];
  for (let j = 0; j <= across; j++) {
    const v = -1 + (2 * j) / across;
    const vv = c + v * hv;
    pts.push({ w: c * half + v * span, n: dn + r + cup(vv, half), nw: -0.08 * vv, nn: 1, v: vv });
  }
  for (const a of [Math.PI / 4, 0, -Math.PI / 4]) {
    pts.push({ w: c * half + span + r * Math.cos(a), n: dn + r * Math.sin(a) + cup(c + hv, half), nw: Math.cos(a), nn: Math.sin(a), v: c + hv });
  }
  for (let j = across; j >= 0; j--) {
    const v = -1 + (2 * j) / across;
    const vv = c + v * hv;
    pts.push({ w: c * half + v * span, n: dn - r + cup(vv, half), nw: 0.08 * vv, nn: -1, v: vv });
  }
  for (const a of [(-3 * Math.PI) / 4, Math.PI, (3 * Math.PI) / 4]) {
    pts.push({ w: c * half - span + r * Math.cos(a), n: dn + r * Math.sin(a) + cup(c - hv, half), nw: Math.cos(a), nn: Math.sin(a), v: c - hv });
  }
  return { closed: true, pts };
}

function profileLoops(kind: ProfileKind, half: number, across: number, hairline: boolean): ProfileLoop[] {
  if (kind === "sheet" || hairline) {
    const pts: ProfilePoint[] = [];
    for (let j = 0; j <= across; j++) {
      const v = -1 + (2 * j) / across;
      pts.push({ w: v * half, n: cup(v, half), nw: -0.08 * v, nn: 1, v });
    }
    return [{ closed: false, pts }];
  }
  // Espessura proporcional à largura, com limites: lâmina fina, nunca papel.
  const t = Math.min(0.05, Math.max(0.022, half * 0.045));
  if (kind === "blade") return [bladeLoop(half, across, 0, 1, t, 0)];
  // Laminado: três lâminas paralelas, levemente escalonadas na normal (lamelas).
  const a = Math.max(2, Math.round(across / 3));
  return [
    bladeLoop(half, a, -0.66, 0.32, t * 0.8, 0.012),
    bladeLoop(half, a, 0.0, 0.3, t * 0.8, -0.018),
    bladeLoop(half, a, 0.66, 0.32, t * 0.8, 0.02),
  ];
}

/** `segments` = anéis a cada 12 unidades de comprimento (a densidade não muda com o tamanho da fita). */
export function createMonumentGeometry(quality: RibbonQuality, formName: FormName = DEFAULT_FORM): MonumentBuild {
  const form = FORMS[formName];
  const MONUMENT = form.ribbons;
  const { across } = quality;
  const curves = MONUMENT.map((r) => new CatmullRomCurve3(r.points.map(toLocal), true, "centripetal"));
  const lengths = curves.map((c) => c.getLength());
  const segs = lengths.map((L) => Math.max(64, Math.round((quality.segments * L) / 12)));
  const ringsOf = segs.map((s) => s + 1);
  // Topologia do perfil por fita (independe da meia-largura).
  const loopsOf = MONUMENT.map((r) => profileLoops(form.profile, 1, across, r.width < 0.1));
  // Todas as fitas usam o mesmo número de vértices por anel (o fio fino repete o último ponto).
  const cols = Math.max(...loopsOf.map((ls) => ls.reduce((n, l) => n + l.pts.length, 0)));
  const total = ringsOf.reduce((a, r) => a + r * cols, 0);
  const quadsPerRing = loopsOf.map((ls) => ls.reduce((n, l) => n + (l.closed ? l.pts.length : l.pts.length - 1), 0));
  const indexCount = segs.reduce((a, s, b) => a + s * quadsPerRing[b]! * 6, 0);

  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const colors = new Float32Array(total * 3);
  const rib = new Float32Array(total * 3);
  const tangents = new Float32Array(total * 3);
  const ribbonN = new Float32Array(total * 3);
  const halves = new Float32Array(total);
  const indices = new Uint32Array(indexCount);

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
    const hairline = r.width < 0.1;
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
    const tilt = hairline ? 0 : form.tilt;
    const Ws = ribbonFrames(Ps, Ts, (i) => tilt + controlAt(r.points, 4, ts[i]!));
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
      paletteAt(u * r.colorCycles + r.colorPhase, col);

      let k = 0;
      for (const loop of profileLoops(form.profile, half, across, hairline)) {
        for (const pt of loop.pts) {
          const idx = base + i * cols + k++;
          positions[idx * 3] = P.x + W.x * pt.w + N.x * pt.n;
          positions[idx * 3 + 1] = Math.max(FLOOR_LOCAL + 0.002, P.y + W.y * pt.w + N.y * pt.n);
          positions[idx * 3 + 2] = P.z + W.z * pt.w + N.z * pt.n;
          nrm.copy(W).multiplyScalar(pt.nw).addScaledVector(N, pt.nn).normalize();
          normals.set([nrm.x, nrm.y, nrm.z], idx * 3);
          uvs[idx * 2] = u * grooveReps;
          uvs[idx * 2 + 1] = (pt.v + 1) / 2;
          colors.set([col.r, col.g, col.b], idx * 3);
          rib.set([u, pt.v, band], idx * 3);
          tangents.set([T.x, T.y, T.z], idx * 3);
          ribbonN.set([N.x, N.y, N.z], idx * 3);
          halves[idx] = half;
        }
      }
      // Fio fino: completa o anel repetindo o último vértice (sem triângulos novos).
      for (; k < cols; k++) {
        const src = base + i * cols + k - 1;
        const dst = src + 1;
        positions.copyWithin(dst * 3, src * 3, src * 3 + 3);
        normals.copyWithin(dst * 3, src * 3, src * 3 + 3);
        uvs.copyWithin(dst * 2, src * 2, src * 2 + 2);
        colors.copyWithin(dst * 3, src * 3, src * 3 + 3);
        rib.copyWithin(dst * 3, src * 3, src * 3 + 3);
        tangents.copyWithin(dst * 3, src * 3, src * 3 + 3);
        ribbonN.copyWithin(dst * 3, src * 3, src * 3 + 3);
        halves[dst] = halves[src]!;
      }
    }
    for (let i = 0; i < segments; i++) {
      let start = 0;
      for (const loop of loopsOf[band]!) {
        const m = loop.pts.length;
        const last = loop.closed ? m : m - 1;
        for (let j = 0; j < last; j++) {
          const p0 = base + i * cols + start + j;
          const p1 = base + i * cols + start + ((j + 1) % m);
          const q0 = p0 + cols;
          const q1 = p1 + cols;
          indices[ii++] = p0;
          indices[ii++] = q0;
          indices[ii++] = p1;
          indices[ii++] = q0;
          indices[ii++] = q1;
          indices[ii++] = p1;
        }
        start += m;
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
  geometry.setAttribute("aN", new BufferAttribute(ribbonN, 3));
  geometry.setAttribute("aHalf", new BufferAttribute(halves, 1));
  geometry.setAttribute("aClear", new BufferAttribute(computeClearance(positions, rib, ringsOf, cols, lengths), 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, bands: MONUMENT.length, lengths, curves, cols, profile: form.profile };
}

/** Posição da figura humana na referência (x≈1495 px, à frente do pé direito). */
export const PERSON_LOCAL = toLocal([1495, REF_FLOOR_PX, 1.9]);
