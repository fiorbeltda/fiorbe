import { Color, DoubleSide, MeshPhysicalMaterial, Vector3, Vector4, type Texture } from "three";

/** Máximo de fitas da escultura (tamanho do array de comprimentos). */
export const WAVE_BANDS = 6;
/** Ondas simultâneas (slots). */
export const WAVE_SLOTS = 3;
/** Fios através da largura (linhas da textura de fibras). */
export const FIBER_ROWS = 28;

/**
 * Uniforms compartilhados entre o material e os sistemas de movimento.
 * Cada sistema escreve só nos seus campos (ver motion/*).
 */
export interface SculptureUniforms {
  uTime: { value: number };
  /** Amplitude da ondulação ambiente ao longo da fita (unidades locais). */
  uIdleAmp: { value: number };
  /** Ponto do cursor no espaço local da escultura. */
  uPointer: { value: Vector3 };
  /** 0..1 — intensidade da reação local ao cursor. */
  uPointerAmt: { value: number };
  /** Toque local (RIB-004), no espaço da fita: arco 0..1 e largura −1..1 do ponto tocado. */
  uPokeU: { value: number };
  uPokeV: { value: number };
  /** Deslocamento do amassado (unidades locais; mola amortecida na CPU). */
  uPokeAmt: { value: number };
  /** Direção do olhar no espaço local: o amassado afunda para longe do visitante. */
  uPokeDir: { value: Vector3 };
  /** Pulsos que correm pela fita a partir do toque: (arco de origem, tempo desde a emissão, amplitude já amortecida, —). */
  uPulse: { value: Vector4[] };
  /** 0..1 — progresso do desenrolar em fluxos (timeline de scroll). */
  uFlow: { value: number };
  /** Alvo dos fluxos em coordenadas de mundo. */
  uFlowLeft: { value: number };
  uFlowRight: { value: number };
  uFlowY: { value: number };
  uFlowGap: { value: number };
  uFlowHalf: { value: number };
  uRim: { value: Color };
  // --- RIB-02: onda viajante (dono: WaveDirector) ---
  /** Por slot de onda: crista (unidades de arco), amplitude 0..1, fase e fita. */
  uWaveC: { value: number[] };
  uWaveAmp: { value: number[] };
  uWavePh: { value: number[] };
  uWaveBand: { value: number[] };
  /** Comprimento de arco de cada fita. */
  uLen: { value: number[] };
  /** Altura do chão no espaço local (pernas não flutuam). */
  uFloorY: { value: number };
  /** Deslocamento máximo ao longo da normal (unidades locais). */
  uWaveA: { value: number };
  /** Torção máxima (rad) da fita em torno da tangente na passagem da onda. */
  uTwistA: { value: number };
  /** 0..1: calibra a onda pela meia-largura (faixas largas flexionam menos e a torção limita o deslocamento da borda). */
  uWaveWide: { value: number };
  // --- RIB-03 (experimental, flag): desfiar em fios ---
  uFray: { value: number };
  uFiber: { value: Texture | null };
  uFrayEdge: { value: Color };
}

export function createSculptureUniforms(): SculptureUniforms {
  return {
    uTime: { value: 0 },
    uIdleAmp: { value: 0 },
    uPointer: { value: new Vector3(99, 99, 99) },
    uPointerAmt: { value: 0 },
    uPokeU: { value: 0 },
    uPokeV: { value: 0 },
    uPokeAmt: { value: 0 },
    uPokeDir: { value: new Vector3(0, 0, -1) },
    uPulse: { value: [new Vector4(), new Vector4()] },
    uFlow: { value: 0 },
    uFlowLeft: { value: -4 },
    uFlowRight: { value: 4 },
    uFlowY: { value: 0 },
    uFlowGap: { value: 0.03 },
    uFlowHalf: { value: 0.004 },
    uRim: { value: new Color("#5fd6f0") },
    uWaveC: { value: new Array(WAVE_SLOTS).fill(0) },
    uWaveAmp: { value: new Array(WAVE_SLOTS).fill(0) },
    uWavePh: { value: new Array(WAVE_SLOTS).fill(0) },
    uWaveBand: { value: new Array(WAVE_SLOTS).fill(-1) },
    uLen: { value: new Array(WAVE_BANDS).fill(1) },
    uFloorY: { value: -100 },
    uWaveA: { value: 0.13 },
    uTwistA: { value: 0.5 },
    uWaveWide: { value: 0 },
    uFray: { value: 0 },
    uFiber: { value: null },
    uFrayEdge: { value: new Color("#bdf2ff") },
  };
}

const VERTEX_HEAD = /* glsl */ `
#define WAVE_K 5.2
#define SIG_F 0.7
#define SIG_T 1.6
attribute vec3 aRib;
attribute vec3 aTan;
attribute float aHalf;
attribute float aClear;
attribute vec3 aN;
varying vec3 vGrooveDir;
varying float vGrHalf;
uniform float uTwistA;
uniform float uWaveWide;
#define WAVE_SLOTS ${WAVE_SLOTS}
uniform float uWaveC[${WAVE_SLOTS}];
uniform float uWaveAmp[${WAVE_SLOTS}];
uniform float uWavePh[${WAVE_SLOTS}];
uniform float uWaveBand[${WAVE_SLOTS}];
uniform float uLen[${WAVE_BANDS}];
uniform float uFloorY;
uniform float uWaveA;
varying float vFiberU;
varying float vFray;
uniform float uTime;
uniform float uIdleAmp;
uniform vec3 uPointer;
uniform float uPointerAmt;
uniform float uPokeU;
uniform float uPokeV;
uniform float uPokeAmt;
uniform vec3 uPokeDir;
uniform vec4 uPulse[2];
uniform float uFlow;
uniform float uFlowLeft;
uniform float uFlowRight;
uniform float uFlowY;
uniform float uFlowGap;
uniform float uFlowHalf;
varying vec3 vRib;
varying float vFlowK;
varying float vEdgeK;
`;

/** k do desenrolar: começa pela ponta u=1 e percorre a fita (efeito de "desfiar"). */
const FLOW_K = /* glsl */ `
float fpK = clamp(uFlow * 1.75 - (1.0 - aRib.x) * 0.75, 0.0, 1.0);
fpK = fpK * fpK * (3.0 - 2.0 * fpK);
vRib = aRib;
vFlowK = fpK;
#include <beginnormal_vertex>
// Quanto a superfície revela a espessura (borda/tampa da lâmina): normal perpendicular à da fita.
vEdgeK = dot(aN, aN) > 0.25 ? smoothstep(0.55, 0.97, 1.0 - abs(dot(normalize(objectNormal), normalize(aN)))) : 0.0;

// --- Onda viajante em comprimento de arco (RIB-02) ---
// Várias ondas (slots) podem correr na mesma fita contínua. Para cada uma:
// δ = distância periódica à crista; envelope gaussiano assimétrico (frente
// curta, cauda longa) com janela que zera exatamente fora de 3σ → retorno
// perfeito. Flexão ao longo da normal + torção em quadratura em torno da
// espinha (a faixa de reflexo rola pela superfície).
int wvB = int(aRib.z + 0.5);
float wvL = max(uLen[wvB], 1e-3);
float wvS = aRib.x * wvL;
float wvCross = 1.0 - 0.35 * aRib.y * aRib.y;
float wvGround = smoothstep(0.0, 0.6, position.y - uFloorY);
float wvDisp = 0.0;
float wvTh = 0.0;
float wvSlopeRaw = 0.0;
float wvFr = 0.0;
// Metal, não tecido: com uWaveWide, faixas largas flexionam menos e a torção
// passa a limitar o deslocamento da borda (≈ mesmo em qualquer largura).
float wvHalf = max(aHalf, 1e-3);
float wvFlexK = mix(1.0, 0.7 * clamp(0.36 / wvHalf, 0.45, 1.0), uWaveWide);
float wvTwistK = mix(1.0, clamp(0.11 / wvHalf, 0.12, 1.0), uWaveWide);
for (int k = 0; k < WAVE_SLOTS; k++) {
  float on = uWaveAmp[k] * (1.0 - step(0.5, abs(uWaveBand[k] - aRib.z)));
  if (on <= 0.0) continue;
  float d = wvS - uWaveC[k];
  d -= wvL * floor(d / wvL + 0.5);
  float sig = d > 0.0 ? SIG_F : SIG_T;
  float env = exp(-d * d / (2.0 * sig * sig)) * (1.0 - smoothstep(2.4 * sig, 3.0 * sig, abs(d)));
  float car = sin(WAVE_K * d - uWavePh[k]);
  float cs = cos(WAVE_K * d - uWavePh[k]);
  float a = uWaveA * on * wvCross * wvGround * wvFlexK;
  wvDisp += a * env * car;
  wvTh += uTwistA * on * wvGround * env * cs * wvTwistK;
  wvSlopeRaw += a * (-d / (sig * sig) * env * car + env * WAVE_K * cs);
  float df = d + 0.6;
  wvFr = max(wvFr, on * exp(-df * df / (2.0 * 0.85 * 0.85)) * wvGround);
}
// --- Toque local (RIB-004): campo no espaço da fita, somado à onda ---
// Amassado gaussiano em torno do ponto tocado (comprimento de arco × largura) e pulsos
// que correm pela fita a partir dele (frente a 1,6 un/s). Entram no mesmo
// deslocamento e na mesma inclinação de normal da onda — portanto no mesmo limite de folga.
{
  float pkSign = dot(normalize(aN + vec3(1e-6)), uPokeDir) >= 0.0 ? 1.0 : -1.0;
  float pkDs = aRib.x - uPokeU;
  pkDs = (pkDs - floor(pkDs + 0.5)) * wvL;
  float pkDv = (aRib.y - uPokeV) * wvHalf;
  float pkG = exp(-pkDs * pkDs / 0.18 - pkDv * pkDv / 0.12);
  float pkD = uPokeAmt * pkG;
  float pkS = uPokeAmt * pkG * (-2.0 * pkDs / 0.18);
  for (int i = 0; i < 2; i++) {
    vec4 pu = uPulse[i];
    if (pu.z <= 0.0) continue;
    float d = aRib.x - pu.x;
    d = (d - floor(d + 0.5)) * wvL;
    // Pacote longo e baixo (λ ≈ 1,05, σ ≈ 0,35): um pacote curto vincava a lâmina.
    float r = abs(d) - pu.y * 1.6;
    float e = exp(-r * r / 0.24);
    float sn = sin(r * 6.0);
    pkD += pu.z * e * sn;
    pkS += pu.z * e * (6.0 * cos(r * 6.0) - (2.0 / 0.24) * r * sn) * sign(d);
  }
  wvDisp += pkD * pkSign * wvGround;
  wvSlopeRaw += pkS * pkSign * wvGround;
}
// Referencial da FITA (não do vértice): a lâmina tem face de cima, de baixo
// e bordas — todas se movem juntas ao longo da normal da fita.
vec3 wvN = dot(aN, aN) > 0.25 ? normalize(aN) : normalize(objectNormal);
vec3 wvW = normalize(cross(wvN, aTan));
float wvEdge = aRib.y * aHalf;
vec3 wvOff = wvN * wvDisp + wvN * (wvEdge * sin(wvTh)) + wvW * (wvEdge * (cos(wvTh) - 1.0));
// Nunca atravessar outra passagem: no máximo 45% da folga local.
float wvKeep = min(1.0, 0.45 * aClear / max(length(wvOff), 1e-5));
wvOff *= wvKeep;
// A torção gira TODAS as normais do perfil em torno da tangente (Rodrigues).
float wvA = wvTh * wvKeep;
objectNormal = objectNormal * cos(wvA) + cross(aTan, objectNormal) * sin(wvA) + aTan * dot(aTan, objectNormal) * (1.0 - cos(wvA));
// Flexão: inclina pela derivada ao longo do arco (sinal acompanha a face).
objectNormal = normalize(objectNormal - wvKeep * wvSlopeRaw * aTan * dot(objectNormal, wvN));
// Direção através da largura (já torcida) para as estrias analíticas.
vGrooveDir = normalMatrix * (wvW * cos(wvA) + wvN * sin(wvA));
vFray = wvFr;
// Coordenada de fibra com número inteiro de repetições por volta: sem costura em u=1→0.
vFiberU = aRib.x * max(1.0, floor(wvL * 0.16 + 0.5));
vGrHalf = aHalf;
`;

const NORMAL_FLOW = /* glsl */ `
#include <defaultnormal_vertex>
transformedNormal = normalize(mix(transformedNormal, vec3(0.0, 0.0, 1.0), fpK));
`;

const BEGIN_VERTEX = /* glsl */ `
vec3 transformed = vec3(position);
transformed += wvOff;
float fpWave = sin(aRib.x * 18.8496 + uTime * 0.55 + aRib.z * 1.7) * sin(aRib.y * 1.5708 + uTime * 0.31 + aRib.x * 6.2832);
transformed += wvN * fpWave * uIdleAmp;
vec3 fpToPointer = position - uPointer;
float fpFall = exp(-dot(fpToPointer, fpToPointer) * 2.2);
transformed += wvN * sign(dot(wvN, fpToPointer) + 1e-4) * fpFall * uPointerAmt * 0.11;
`;

const PROJECT_VERTEX = /* glsl */ `
vec4 fpWorld = modelMatrix * vec4(transformed, 1.0);
vec4 fpTarget = vec4(
  mix(uFlowLeft, uFlowRight, aRib.x),
  uFlowY - aRib.z * uFlowGap + aRib.y * uFlowHalf,
  0.0,
  1.0
);
fpWorld = mix(fpWorld, fpTarget, fpK);
vec4 mvPosition = viewMatrix * fpWorld;
gl_Position = projectionMatrix * mvPosition;
`;

const FRAGMENT_HEAD = /* glsl */ `
#define FIBERS ${FIBER_ROWS}.0
#define GROOVE_DEPTH 0.0011
uniform vec3 uRim;
uniform float uFray;
uniform sampler2D uFiber;
uniform vec3 uFrayEdge;
varying vec3 vRib;
varying float vFlowK;
varying vec3 vGrooveDir;
varying float vGrHalf;
varying float vFiberU;
varying float vFray;
varying float vEdgeK;
`;

/**
 * Metal premium (só com FIORBE_PREMIUM): o metal é azul-prateado — a cor por
 * vértice (paleta azul/teal) fica, mas dessaturada para a prata; o azul profundo
 * vem do estúdio de reflexos. Nas bordas (onde a lâmina mostra a espessura) o
 * metal é mais polido e mais prateado: o realce fino nasce da luz refletida e
 * varia com orientação, câmera e curvatura — não é um contorno emissivo.
 */
const PREMIUM_COLOR = /* glsl */ `
#include <color_fragment>
#ifdef FIORBE_PREMIUM
  #ifdef FIORBE_TINT23
  // Variedade de metal ao longo do percurso (referência: passagens em azul profundo, teal e
  // prata). Tinta do metal (F0), não emissivo: muda a COR dos reflexos, não a luz. Ciclos
  // inteiros por volta → sem costura em u = 1 → 0; varia devagar (uma passagem, um tom).
  float tA = 0.5 + 0.5 * sin(vRib.x * 6.2831853 * 3.0 + 1.1);
  float tB = 0.5 + 0.5 * sin(vRib.x * 6.2831853 * 5.0 + 4.0);
  // (1ª tentativa clareava a peça inteira: azul profundo mais saturado, menos prata.)
  vec3 tint = mix(vec3(0.16, 0.34, 1.0), vec3(0.3, 0.9, 0.88), smoothstep(0.5, 0.92, tA));
  tint = mix(tint, vec3(0.86, 0.92, 1.0), smoothstep(0.6, 0.97, tB) * 0.6);
  diffuseColor.rgb = mix(diffuseColor.rgb, tint, 0.45);
  #endif
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.88, 0.96), 0.14 + 0.5 * vEdgeK);
#endif
`;
const PREMIUM_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
#ifdef FIORBE_PREMIUM
  #ifdef FIORBE_GROOVE_PHYS
  // Antisserrilhado especular geométrico: onde a normal muda mais rápido que o pixel
  // consegue mostrar (bordas finas vistas de topo, lâminas de perfil no redemoinho), o
  // realce piscava entre claro e escuro. A rugosidade sobe com a variação da normal no
  // pixel, e o polimento da borda some quando a borda fica menor que ~1 px.
  vec3 saN = normalize(vNormal);
  float saVar = dot(fwidth(saN), vec3(1.0));
  float saEdgeVis = 1.0 - smoothstep(0.35, 0.9, fwidth(vEdgeK));
  roughnessFactor = mix(roughnessFactor, 0.1, vEdgeK * saEdgeVis);
  roughnessFactor = max(roughnessFactor, clamp(saVar * 0.6, 0.0, 0.55));
  #else
  roughnessFactor = mix(roughnessFactor, 0.1, vEdgeK);
  #endif
#endif
`;

/**
 * Desfiar (RIB-03, experimental): ruído anisotrópico — longo ao longo da fita,
 * fino através — comparado a um limiar que cresce com o campo da onda.
 * Abaixo do limiar o pixel some (o fio se abre); perto dele, borda luminosa.
 * Descarte no início do shader: pixels abertos não pagam iluminação.
 */
const FRAGMENT_FRAY = /* glsl */ `
float fyEdge = 0.0;
float fyCov = 1.0;
if (uFray > 0.5 && vFray > 0.004) {
  // Cada fio é uma faixa através da largura (linha da textura); ao longo dela
  // o valor varia devagar → os fios recuam como filamentos, não como furos.
  // Cobertura suave (alpha-to-coverage com MSAA): sem serrilhado nas pontas
  // nem nas divisas entre fios.
  float fyY = (vRib.y * 0.5 + 0.5) * FIBERS;
  float fyRow = clamp(floor(fyY), 0.0, FIBERS - 1.0);
  float fyF = fyY - fyRow;
  float fyNb = clamp(fyRow + (fyF < 0.5 ? -1.0 : 1.0), 0.0, FIBERS - 1.0);
  float fyX = vFiberU + vRib.z * 0.37;
  float fyN = textureLod(uFiber, vec2(fyX, (fyRow + 0.5) / FIBERS), 0.0).r;
  float fyN2 = textureLod(uFiber, vec2(fyX, (fyNb + 0.5) / FIBERS), 0.0).r;
  // As bordas da fita desfiam primeiro; o miolo resiste.
  float fyThr = vFray * mix(0.38, 0.72, abs(vRib.y));
  float fyW = max(fwidth(fyN) * 0.75, 0.004);
  float fyC1 = smoothstep(fyThr - fyW, fyThr + fyW, fyN);
  float fyC2 = smoothstep(fyThr - fyW, fyThr + fyW, fyN2);
  float fyAa = max(fwidth(fyY), 1e-4);
  float fyOwn = clamp(0.5 + min(fyF, 1.0 - fyF) / fyAa, 0.5, 1.0);
  fyCov = mix(fyC2, fyC1, fyOwn);
  if (fyCov < 0.02) discard;
  fyEdge = (1.0 - smoothstep(0.0, 0.06, fyN - fyThr)) * smoothstep(0.05, 0.2, fyThr) * fyC1;
}
#include <clipping_planes_fragment>
`;

/**
 * Estrias analíticas (substituem o bump por textura). As ranhuras correm ao
 * longo da fita e variam só através da largura: h(x) = Σ Aᵢ·sin(2π fᵢ x + φᵢ).
 * A normal inclina por dh/dx na direção da largura. Cada componente é
 * limitada pela frequência que o pixel consegue representar (fwidth): o que
 * ficaria menor que ~2 px some suavemente em vez de serrilhar. Era o bump por
 * derivadas de tela sobre a textura de 36 ranhuras — sem limite de banda —
 * que gerava os "pentes" escuros nas curvas fechadas.
 */
const NORMAL_MAPS = /* glsl */ `
{
  #ifdef FIORBE_GROOVE_PHYS
  // Passo FÍSICO constante (ranhuras por unidade de metal, não por largura da faixa):
  // nas faixas largas da coroa o passo por largura dobrava e as ranhuras grossas
  // viravam estrias escuras. Referência: meia-largura 0,4 = mesmo passo de antes.
  float grX = (vRib.y * 0.5 + 0.5) * vGrHalf / 0.4;
  #else
  float grX = vRib.y * 0.5 + 0.5;
  #endif
  float grW = max(fwidth(grX), 1e-5);
  float grD = 0.0;
  // (frequência, amplitude, fase)
  #ifdef FIORBE_PREMIUM
  // Escovado mais fino e mais presente: linhas extremamente finas que aparecem nos realces.
  const int GR_N = 4;
  #ifdef FIORBE_GROOVE_PHYS
  // V2.2: componentes grossas mais rasas (eram elas que liam como cortes) e a fina domina.
  vec3 grT[GR_N] = vec3[GR_N](vec3(36.0, 0.24, 0.0), vec3(9.0, 0.08, 1.3), vec3(71.0, 0.3, 2.1), vec3(143.0, 0.26, 0.7));
  #else
  vec3 grT[GR_N] = vec3[GR_N](vec3(36.0, 0.5, 0.0), vec3(9.0, 0.22, 1.3), vec3(71.0, 0.32, 2.1), vec3(143.0, 0.22, 0.7));
  #endif
  float grDepth = GROOVE_DEPTH * 1.9;
  #else
  const int GR_N = 3;
  vec3 grT[GR_N] = vec3[GR_N](vec3(36.0, 0.55, 0.0), vec3(9.0, 0.25, 1.3), vec3(71.0, 0.12, 2.1));
  float grDepth = GROOVE_DEPTH;
  #endif
  for (int i = 0; i < GR_N; i++) {
    float f = grT[i].x;
    float keep = 1.0 - smoothstep(0.18, 0.42, f * grW);
    grD += grT[i].y * keep * 6.2831853 * f * cos(6.2831853 * f * grX + grT[i].z);
  }
  vec3 grDir = normalize(vGrooveDir - normal * dot(vGrooveDir, normal));
  normal = normalize(normal - grDir * grD * grDepth);
}
`;

const FRAGMENT_OUT = /* glsl */ `
float fpEdge = smoothstep(0.86, 1.0, abs(vRib.y));
float fpFres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);
#ifdef FIORBE_PREMIUM
// Sem contorno emissivo: só um véu de Fresnel muito leve (o brilho de borda vem do metal).
outgoingLight += uRim * fpFres * 0.025;
#else
outgoingLight += uRim * (fpFres * 0.06 + fpEdge * 0.14);
#endif
outgoingLight = mix(outgoingLight, vColor.rgb * 1.35, vFlowK * 0.75);
outgoingLight += mix(vColor.rgb * 1.8, uFrayEdge, 0.45) * fyEdge * 0.75;
diffuseColor.a *= fyCov;
#include <opaque_fragment>
`;

export interface SculptureMaterialOptions {
  /** Metal premium (Blender V2): prata azulada, bordas polidas, escovado fino. */
  premium?: boolean;
  /** Acabamento V2.2: escovado com passo físico constante e bordas sem serrilhado. */
  finish22?: boolean;
  /** V2.3: metal em azul profundo, teal e prata alternando ao longo do percurso. */
  tint23?: boolean;
}

export function createSculptureMaterial(uniforms: SculptureUniforms, opts: SculptureMaterialOptions = {}): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    // Metal acetinado: anisotropia alonga os realces ao longo da fita; pouco
    // clearcoat (excesso dele era o que deixava a superfície "vítrea").
    metalness: 1,
    roughness: 0.2,
    clearcoat: 0.2,
    clearcoatRoughness: 0.3,
    anisotropy: 0.6,
    envMapIntensity: 1.45,
    side: DoubleSide,
    // Bordas do desfiar suavizadas pelo MSAA (alfa = cobertura; resto da fita = 1).
    alphaToCoverage: true,
  });
  if (opts.premium) {
    // Acetinado escovado: um pouco mais áspero e bem mais anisotrópico (realces longos ao longo da fita).
    material.defines = { ...material.defines, FIORBE_PREMIUM: "" };
    material.roughness = 0.2;
    material.anisotropy = 0.8;
    material.clearcoat = 0.12;
    material.envMapIntensity = 1.3;
    if (opts.finish22) material.defines.FIORBE_GROOVE_PHYS = "";
    if (opts.tint23) material.defines.FIORBE_TINT23 = "";
  }

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader
      .replace("#include <beginnormal_vertex>", FLOW_K)
      .replace("#include <defaultnormal_vertex>", NORMAL_FLOW)
      .replace("#include <begin_vertex>", BEGIN_VERTEX)
      .replace("#include <project_vertex>", PROJECT_VERTEX);
    shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader
      .replace("#include <clipping_planes_fragment>", FRAGMENT_FRAY)
      .replace("#include <color_fragment>", PREMIUM_COLOR)
      .replace("#include <roughnessmap_fragment>", PREMIUM_ROUGHNESS)
      .replace("#include <normal_fragment_maps>", NORMAL_MAPS)
      .replace("#include <opaque_fragment>", FRAGMENT_OUT);
  };
  material.customProgramCacheKey = () => (opts.premium ? (opts.finish22 ? (opts.tint23 ? "fiorbe-ribbon-v9-premium23" : "fiorbe-ribbon-v9-premium22") : "fiorbe-ribbon-v9-premium") : "fiorbe-ribbon-v9");
  return material;
}
