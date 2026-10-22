import { Color, CustomBlending, Group, Mesh, OneFactor, PlaneGeometry, ShaderMaterial, Vector3, ZeroFactor, type Camera } from "three";

/**
 * Arquitetura de luz atrás da escultura (referência: parede luminosa ao
 * fundo do palco). Tudo procedural e aditivo:
 *
 * 1. Parede de luz — plano grande ATRÁS da escultura, do centro até a
 *    direita: fundo em gradação azul profunda, núcleo amplo de luz fria,
 *    colunas/planos verticais suaves de larguras e intensidades diferentes,
 *    névoa atmosférica e o brilho rasante onde o chão encontra a parede.
 *    Como fica atrás, a luz aparece pelos vazios entre as fitas.
 * 2. Contraluz da figura — elipse estreita logo atrás da pessoa.
 * 3. Chão — luz derramada pela parede e o reflexo das colunas no piso
 *    molhado, traçado na direção da câmera (fica vertical na tela, como
 *    num espelho), com a sombra da figura.
 */
export interface BacklightOptions {
  /** Base da figura (espaço local). */
  px: number;
  pz: number;
  floorY: number;
  /** Altura da escultura e da figura. */
  height: number;
  personH: number;
  /** Profundidade da parede (atrás da escultura). */
  wallZ: number;
  /** Centro horizontal da parede (espaço local). */
  wallX: number;
  camera: Camera | null;
  reducedMotion: boolean;
}

/** Núcleo + colunas da parede: [centro x, largura, intensidade, altura relativa]. Núcleo = índice 0. */
const COLUMNS: Array<[number, number, number, number]> = [
  [0.55, 1.7, 1.0, 1.0],
  [-2.7, 0.38, 0.22, 0.62],
  [-1.6, 0.62, 0.32, 0.8],
  [-0.55, 0.26, 0.28, 0.72],
  [1.85, 0.52, 0.36, 0.9],
  [2.75, 0.3, 0.26, 0.74],
  [3.45, 0.72, 0.18, 0.6],
];
const COLS_GLSL = `const int NCOL = ${COLUMNS.length};
const vec4 COLS[NCOL] = vec4[NCOL](${COLUMNS.map((c) => `vec4(${c.map((v) => v.toFixed(3)).join(", ")})`).join(", ")});`;

const COMMON = /* glsl */ `
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
${COLS_GLSL}
// Coluna de bordas macias (caixa suavizada) que se apaga para cima.
float column(float x, float y, float H, vec4 c) {
  float hw = c.y * 0.5;
  float edge = max(0.05, c.y * 0.18);
  float body = smoothstep(hw + edge, hw - edge, abs(x - c.x));
  float top = H * c.w;
  return body * pow(clamp(1.0 - y / top, 0.0, 1.0), 1.35);
}
`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FINISH = /* glsl */ `
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(max(col, 0.0) * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

const WALL_FRAG = /* glsl */ `
${COMMON}
uniform vec2 uSize;
uniform vec3 uCore;
uniform vec3 uHalo;
uniform vec3 uDeep;
uniform float uGain;
uniform float uShift;
void main() {
  float x = (vUv.x - 0.5) * uSize.x + uShift;
  float y = vUv.y * uSize.y;
  float H = uSize.y;
  float h = y / H;
  // Área da parede: larga, assimétrica (mais para a direita), sobe com gradação.
  float wall = smoothstep(-4.6, -2.8, x) * (1.0 - smoothstep(3.6, 5.2, x)) * pow(clamp(1.0 - h, 0.0, 1.0), 0.9);
  // Núcleo amplo e colunas.
  float core = column(x, y, H, COLS[0]);
  float hot = exp(-pow((x - COLS[0].x) / 0.55, 2.0)) * exp(-pow(y / (0.28 * H), 2.0));
  float cols = 0.0;
  for (int i = 1; i < NCOL; i++) {
    float breathe = 0.9 + 0.1 * sin(uTime * 0.17 + float(i) * 2.1);
    cols += COLS[i].z * breathe * column(x, y, H, COLS[i]);
  }
  // Névoa atmosférica: volume amplo que envolve tudo.
  float haze = exp(-pow((x - 0.4) / 3.2, 2.0) - pow((y - 0.25 * H) / (0.55 * H), 2.0));
  // Brilho rasante no encontro com o chão.
  float horizon = exp(-pow(y / 0.06, 2.0)) * smoothstep(-4.0, -2.0, x) * (1.0 - smoothstep(3.4, 5.0, x));
  vec3 col = uDeep * wall * 0.14
           + uHalo * (haze * 0.2 + cols * 0.95 + horizon * 0.6)
           + uCore * (core * 0.58 + hot * 0.28 + cols * 0.24);
  col *= uGain;
  col *= (1.0 - smoothstep(0.38, 0.5, abs(vUv.x - 0.5))) * (1.0 - smoothstep(0.55, 0.85, vUv.y));
${FINISH}
}
`;

const RIM_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uCore;
void main() {
  vec2 p = vUv - vec2(0.5, 0.42);
  float e = exp(-pow(p.x / 0.2, 2.0) - pow(p.y / 0.34, 2.0));
  vec3 col = uCore * e * 0.42;
${FINISH}
}
`;

// Chão: q = (x relativo ao centro da parede, t = distância à frente da parede).
const FLOOR_FRAG = /* glsl */ `
${COMMON}
uniform vec2 uSize;
uniform vec2 uFeet;
uniform vec2 uCam;
uniform float uPersonH;
uniform vec3 uHalo;
uniform vec3 uCore;
void main() {
  vec2 q = vec2((vUv.x - 0.5) * uSize.x, (1.0 - vUv.y) * uSize.y);
  float t = max(q.y, 0.0);
  // Lençol de luz derramado pela parede inteira.
  float sheet = smoothstep(-4.2, -2.4, q.x - t * 0.1) * (1.0 - smoothstep(3.2, 4.8, q.x + t * 0.1)) * exp(-t * 0.42) * smoothstep(0.0, 0.2, t);
  // Reflexos das colunas: linhas da base de cada coluna até o pé da câmera (verticais na tela).
  float refl = 0.0;
  for (int i = 0; i < NCOL; i++) {
    vec2 a = vec2(COLS[i].x, 0.0);
    vec2 ab = uCam - a;
    float s = clamp(dot(q - a, ab) / dot(ab, ab), 0.0, 1.0);
    float d = length(q - (a + ab * s));
    float w = COLS[i].y * 0.35 + s * 0.6;
    refl += (i == 0 ? 1.0 : COLS[i].z) * exp(-pow(d / w, 2.0)) * exp(-s * 3.2);
  }
  // Sombra da figura, projetada a partir do núcleo.
  vec2 dir = normalize(uFeet - vec2(COLS[0].x, 0.0));
  vec2 dq = q - uFeet;
  float along = dot(dq, dir);
  float perp = dot(dq, vec2(-dir.y, dir.x));
  float shadow = smoothstep(-0.02, 0.06, along) * exp(-pow(perp / (uPersonH * 0.18 + along * 0.06), 2.0)) * exp(-along / (uPersonH * 2.6));
  vec3 col = (uHalo * sheet * 0.3 + mix(uHalo, uCore, 0.5) * refl * 0.42) * (1.0 - 0.8 * shadow);
  col *= (1.0 - smoothstep(0.32, 0.5, abs(vUv.x - 0.5))) * smoothstep(0.0, 0.15, vUv.y);
${FINISH}
}
`;

export function createBacklight(o: BacklightOptions) {
  const group = new Group();
  const geo = new PlaneGeometry(1, 1);
  const core = new Color("#cfeeff");
  const halo = new Color("#2a8fe6");
  const deep = new Color("#0b3a96");
  const mats: ShaderMaterial[] = [];
  const make = (frag: string, uniforms: Record<string, { value: unknown }>) => {
    const m = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: frag,
      uniforms: { uOpacity: { value: 1 }, uTime: { value: 0 }, ...uniforms },
      // Soma só a cor: o alfa do canvas fica intacto (o fundo CSS continua visível).
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      blendSrcAlpha: ZeroFactor,
      blendDstAlpha: OneFactor,
      transparent: true,
      depthWrite: false,
    });
    mats.push(m);
    return m;
  };

  // 1 — Parede de luz atrás da escultura + uma segunda, mais ao fundo e
  //     deslocada: camadas de arquitetura que dão profundidade ao espaço.
  const ww = 12;
  const wh = o.height * 1.6;
  const wallUniforms = (gain: number, shift: number) => ({
    uSize: { value: [ww, wh] },
    uCore: { value: core },
    uHalo: { value: halo },
    uDeep: { value: deep },
    uGain: { value: gain },
    uShift: { value: shift },
  });
  const far = new Mesh(geo, make(WALL_FRAG, wallUniforms(0.45, 1.3)));
  far.scale.set(ww * 1.5, wh * 1.35, 1);
  far.position.set(o.wallX + 0.6, o.floorY + (wh * 1.35) / 2, o.wallZ - 3.2);
  far.renderOrder = -2;
  group.add(far);
  const wall = new Mesh(geo, make(WALL_FRAG, wallUniforms(1, 0)));
  wall.scale.set(ww, wh, 1);
  wall.position.set(o.wallX, o.floorY + wh / 2, o.wallZ);
  wall.renderOrder = -1;
  group.add(wall);

  // 2 — Contraluz junto à figura.
  const rim = new Mesh(geo, make(RIM_FRAG, { uCore: { value: core } }));
  rim.scale.set(o.personH * 1.1, o.personH * 1.5, 1);
  rim.position.set(o.px + 0.02, o.floorY + o.personH * 0.66, o.pz - 0.3);
  rim.renderOrder = 2;
  group.add(rim);

  // 3 — Chão: da parede até perto da câmera.
  const fw = 18;
  const fd = o.pz - o.wallZ + 12;
  const cam = { value: [0, 30] as number[] };
  const floor = new Mesh(
    geo,
    make(FLOOR_FRAG, {
      uSize: { value: [fw, fd] },
      uFeet: { value: [o.px - o.wallX, o.pz - o.wallZ] },
      uCam: cam,
      uPersonH: { value: o.personH },
      uHalo: { value: halo },
      uCore: { value: core },
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(fw, fd, 1);
  floor.position.set(o.wallX, o.floorY + 0.004, o.wallZ + fd / 2);
  floor.renderOrder = 2;
  group.add(floor);

  const camLocal = new Vector3();
  let time = 0;
  return {
    group,
    /** Adaptadores para o fade do cenário (opacidade base 1). */
    fadeables: mats.map((m) => ({
      get opacity() {
        return m.uniforms.uOpacity!.value as number;
      },
      set opacity(v: number) {
        m.uniforms.uOpacity!.value = v;
      },
    })),
    update(dt: number, paused: boolean) {
      // Pé da câmera no espaço do chão (os reflexos apontam para ela).
      if (o.camera) {
        group.updateWorldMatrix(true, false);
        group.worldToLocal(camLocal.copy(o.camera.position));
        cam.value[0] = camLocal.x - o.wallX;
        cam.value[1] = camLocal.z - o.wallZ;
      }
      if (paused || o.reducedMotion) return;
      time += dt;
      for (const m of mats) m.uniforms.uTime!.value = time;
    },
    dispose() {
      geo.dispose();
      mats.forEach((m) => m.dispose());
    },
  };
}
