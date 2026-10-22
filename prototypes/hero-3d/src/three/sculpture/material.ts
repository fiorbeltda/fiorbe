import { Color, DoubleSide, MeshPhysicalMaterial, Vector3, type Texture } from "three";

/** Número de fitas da escultura (tamanho dos arrays de uniformes da onda). */
export const WAVE_BANDS = 6;
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
  /** Centro da onda em cada fita (unidades de arco). */
  uWaveC: { value: number[] };
  /** Amplitude 0..1 da onda em cada fita (0 = sem onda). */
  uWaveAmp: { value: number[] };
  /** Fase da portadora em cada fita (ω·τ). */
  uWavePh: { value: number[] };
  /** Comprimento de arco de cada fita. */
  uLen: { value: number[] };
  /** Altura do chão no espaço local (pernas não flutuam). */
  uFloorY: { value: number };
  /** Deslocamento máximo ao longo da normal (unidades locais). */
  uWaveA: { value: number };
  /** Torção máxima (rad) da fita em torno da tangente na passagem da onda. */
  uTwistA: { value: number };
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
    uFlow: { value: 0 },
    uFlowLeft: { value: -4 },
    uFlowRight: { value: 4 },
    uFlowY: { value: 0 },
    uFlowGap: { value: 0.03 },
    uFlowHalf: { value: 0.004 },
    uRim: { value: new Color("#5fd6f0") },
    uWaveC: { value: new Array(WAVE_BANDS).fill(0) },
    uWaveAmp: { value: new Array(WAVE_BANDS).fill(0) },
    uWavePh: { value: new Array(WAVE_BANDS).fill(0) },
    uLen: { value: new Array(WAVE_BANDS).fill(1) },
    uFloorY: { value: -100 },
    uWaveA: { value: 0.13 },
    uTwistA: { value: 0.5 },
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
uniform float uTwistA;
uniform float uWaveC[${WAVE_BANDS}];
uniform float uWaveAmp[${WAVE_BANDS}];
uniform float uWavePh[${WAVE_BANDS}];
uniform float uLen[${WAVE_BANDS}];
uniform float uFloorY;
uniform float uWaveA;
varying float vFiberU;
varying float vFray;
uniform float uTime;
uniform float uIdleAmp;
uniform vec3 uPointer;
uniform float uPointerAmt;
uniform float uFlow;
uniform float uFlowLeft;
uniform float uFlowRight;
uniform float uFlowY;
uniform float uFlowGap;
uniform float uFlowHalf;
varying vec3 vRib;
varying float vFlowK;
`;

/** k do desenrolar: começa pela ponta u=1 e percorre a fita (efeito de "desfiar"). */
const FLOW_K = /* glsl */ `
float fpK = clamp(uFlow * 1.75 - (1.0 - aRib.x) * 0.75, 0.0, 1.0);
fpK = fpK * fpK * (3.0 - 2.0 * fpK);
vRib = aRib;
vFlowK = fpK;
#include <beginnormal_vertex>

// --- Onda viajante em comprimento de arco (RIB-02) ---
// δ = distância periódica ao centro; envelope gaussiano assimétrico (frente
// curta, cauda longa) com janela que zera exatamente fora de 3σ → retorno
// perfeito. Portadora com cristas deslizando dentro do envelope.
int wvB = int(aRib.z + 0.5);
float wvL = max(uLen[wvB], 1e-3);
float wvS = aRib.x * wvL;
float wvD = wvS - uWaveC[wvB];
wvD -= wvL * floor(wvD / wvL + 0.5);
float wvSig = wvD > 0.0 ? SIG_F : SIG_T;
float wvEnv = exp(-wvD * wvD / (2.0 * wvSig * wvSig)) * (1.0 - smoothstep(2.4 * wvSig, 3.0 * wvSig, abs(wvD)));
float wvCar = sin(WAVE_K * wvD - uWavePh[wvB]);
float wvCos = cos(WAVE_K * wvD - uWavePh[wvB]);
float wvCross = 1.0 - 0.35 * aRib.y * aRib.y;
float wvGround = smoothstep(0.0, 0.6, position.y - uFloorY);
float wvAmp = uWaveA * uWaveAmp[wvB] * wvCross * wvGround;
float wvDisp = wvAmp * wvEnv * wvCar;
// Torção: a fita gira em torno da própria espinha na passagem (em quadratura
// com a flexão) — a faixa de reflexo rola pela superfície.
float wvTh = uTwistA * uWaveAmp[wvB] * wvGround * wvEnv * wvCos;
vec3 wvN = normalize(objectNormal);
vec3 wvW = normalize(cross(wvN, aTan));
float wvEdge = aRib.y * aHalf;
vec3 wvOff = normal * wvDisp + wvN * (wvEdge * sin(wvTh)) + wvW * (wvEdge * (cos(wvTh) - 1.0));
// Nunca atravessar a vizinha: cada fita usa no máximo 45% da folga local.
float wvLen = length(wvOff);
wvOff *= min(1.0, 0.45 * aClear / max(wvLen, 1e-5));
float wvKeep = min(1.0, 0.45 * aClear / max(wvLen, 1e-5));
objectNormal = wvN * cos(wvTh * wvKeep) - wvW * sin(wvTh * wvKeep);
// Normal corrigida pela derivada ao longo do arco (a luz acompanha a forma).
float wvDEnv = -wvD / (wvSig * wvSig) * wvEnv;
float wvSlope = wvKeep * wvAmp * (wvDEnv * wvCar + wvEnv * WAVE_K * wvCos);
objectNormal = normalize(objectNormal - wvSlope * aTan);
// Campo de desfiar: centrado logo atrás da crista, acompanha a onda inteira.
float wvDf = wvD + 0.6;
vFray = uWaveAmp[wvB] * exp(-wvDf * wvDf / (2.0 * 0.85 * 0.85)) * wvGround * step(float(wvB), 4.5);
// Coordenada de fibra com número inteiro de repetições por volta: sem costura em u=1→0.
vFiberU = aRib.x * max(1.0, floor(wvL * 0.16 + 0.5));
`;

const NORMAL_FLOW = /* glsl */ `
#include <defaultnormal_vertex>
transformedNormal = normalize(mix(transformedNormal, vec3(0.0, 0.0, 1.0), fpK));
`;

const BEGIN_VERTEX = /* glsl */ `
vec3 transformed = vec3(position);
transformed += wvOff;
float fpWave = sin(aRib.x * 18.8496 + uTime * 0.55 + aRib.z * 1.7) * sin(aRib.y * 1.5708 + uTime * 0.31 + aRib.x * 6.2832);
transformed += normal * fpWave * uIdleAmp;
vec3 fpToPointer = position - uPointer;
float fpFall = exp(-dot(fpToPointer, fpToPointer) * 2.2);
transformed += normal * sign(dot(normal, fpToPointer) + 1e-4) * fpFall * uPointerAmt * 0.11;
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
uniform vec3 uRim;
uniform float uFray;
uniform sampler2D uFiber;
uniform vec3 uFrayEdge;
varying vec3 vRib;
varying float vFlowK;
varying float vFiberU;
varying float vFray;
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

const FRAGMENT_OUT = /* glsl */ `
float fpEdge = smoothstep(0.86, 1.0, abs(vRib.y));
float fpFres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);
outgoingLight += uRim * (fpFres * 0.06 + fpEdge * 0.14);
outgoingLight = mix(outgoingLight, vColor.rgb * 1.35, vFlowK * 0.75);
outgoingLight += mix(vColor.rgb * 1.8, uFrayEdge, 0.45) * fyEdge * 0.75;
diffuseColor.a *= fyCov;
#include <opaque_fragment>
`;

export function createSculptureMaterial(uniforms: SculptureUniforms, grooves: Texture): MeshPhysicalMaterial {
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
    bumpMap: grooves,
    bumpScale: 0.45,
    envMapIntensity: 1.45,
    side: DoubleSide,
    // Bordas do desfiar suavizadas pelo MSAA (alfa = cobertura; resto da fita = 1).
    alphaToCoverage: true,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader
      .replace("#include <beginnormal_vertex>", FLOW_K)
      .replace("#include <defaultnormal_vertex>", NORMAL_FLOW)
      .replace("#include <begin_vertex>", BEGIN_VERTEX)
      .replace("#include <project_vertex>", PROJECT_VERTEX);
    shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader
      .replace("#include <clipping_planes_fragment>", FRAGMENT_FRAY)
      .replace("#include <opaque_fragment>", FRAGMENT_OUT);
  };
  material.customProgramCacheKey = () => "fiorbe-ribbon-v4";
  return material;
}
