import { Color, DoubleSide, MeshPhysicalMaterial, Vector3, type Texture } from "three";

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
  };
}

const VERTEX_HEAD = /* glsl */ `
attribute vec3 aRib;
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
`;

const NORMAL_FLOW = /* glsl */ `
#include <defaultnormal_vertex>
transformedNormal = normalize(mix(transformedNormal, vec3(0.0, 0.0, 1.0), fpK));
`;

const BEGIN_VERTEX = /* glsl */ `
vec3 transformed = vec3(position);
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
uniform vec3 uRim;
varying vec3 vRib;
varying float vFlowK;
`;

const FRAGMENT_OUT = /* glsl */ `
float fpEdge = smoothstep(0.86, 1.0, abs(vRib.y));
float fpFres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);
outgoingLight += uRim * (fpFres * 0.06 + fpEdge * 0.14);
outgoingLight = mix(outgoingLight, vColor.rgb * 1.35, vFlowK * 0.75);
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
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = VERTEX_HEAD + shader.vertexShader
      .replace("#include <beginnormal_vertex>", FLOW_K)
      .replace("#include <defaultnormal_vertex>", NORMAL_FLOW)
      .replace("#include <begin_vertex>", BEGIN_VERTEX)
      .replace("#include <project_vertex>", PROJECT_VERTEX);
    shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader.replace("#include <opaque_fragment>", FRAGMENT_OUT);
  };
  material.customProgramCacheKey = () => "fiorbe-ribbon-v1";
  return material;
}
