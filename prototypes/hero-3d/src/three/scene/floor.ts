import {
  CanvasTexture,
  Color,
  CustomBlending,
  DoubleSide,
  HalfFloatType,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix4,
  MaxEquation,
  Mesh,
  OneFactor,
  OrthographicCamera,
  PlaneGeometry,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type WebGLRenderer,
} from "three";

/**
 * Piso cinematográfico: concreto arquitetônico escuro, levemente molhado.
 *
 * - Reflexo planar em MEIA resolução: escultura, paredes de luz e figura
 *   espelhadas são desenhadas num alvo com mipmaps; o piso amostra esse alvo
 *   com distorção pelo microrrelevo, desfoque que cresce com a rugosidade
 *   (níveis de mip + toques esticados na vertical, como em piso molhado) e
 *   Fresnel. O reflexo é consequência do material, não uma cópia nítida.
 * - Material procedural: textura de ruído pequena e repetível (relevo fino,
 *   médio e manchas molhadas) → rugosidade variável, poças mais espelhadas,
 *   albedo irregular e brilhos minúsculos onde há luz refletida.
 * - Sombras: oclusão de contato e sombra projetada a partir da luz do fundo,
 *   lidas de uma "pegada" da escultura vista de cima (alvo 256², com mipmaps,
 *   atualizado a cada poucos quadros). Sombra da figura analítica.
 * - Trilhas de luz pintadas no próprio piso (textura no espaço do chão):
 *   perspectiva correta, espessura constante, halo que se espalha mais nas
 *   regiões ásperas.
 *
 * Tudo no espaço local do cenário (mesma escala da escultura).
 */
export interface FloorOptions {
  floorY: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; height: number };
  /** Centro e profundidade da parede de luz; x do núcleo em relação ao centro. */
  wallX: number;
  wallZ: number;
  coreX: number;
  /** Base e altura da figura. */
  px: number;
  pz: number;
  personH: number;
  reflections: boolean;
  /** Tela estreita: o chão fica sob o texto — só uma faixa logo abaixo do contato, esmaecendo. */
  compact?: boolean;
  /** Trilhas no espaço do chão (polilinhas x,z) — ver setTrails. */
}

export interface CinematicFloor {
  mesh: Mesh;
  /** Cena espelhada (desenhada no alvo de reflexo). */
  reflScene: Scene;
  material: ShaderMaterial;
  /** Desenha reflexo (e, a cada poucos quadros, a pegada da escultura). */
  render(renderer: WebGLRenderer, camera: Camera, groupWorld: Matrix4, sculpture: Mesh | null): void;
  /** Trilhas como polilinhas no espaço do chão: [x, z][]; largura em unidades. */
  setTrails(trails: Array<{ points: Array<[number, number]>; width: number; intensity: number; fade: number }>): void;
  dispose(): void;
}

// --- Ruído repetível (value noise com fbm por canal) ---
function noiseTexture(size = 256): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  const cache = new Map<number, Float32Array>();
  const lattice = (period: number, seed: number) => {
    const key = period * 1000 + seed;
    const hit = cache.get(key);
    if (hit) return hit;
    const v = new Float32Array(period * period);
    cache.set(key, v);
    let s = seed * 9301 + 49297;
    for (let i = 0; i < v.length; i++) {
      s = (s * 9301 + 49297) % 233280;
      v[i] = s / 233280;
    }
    return v;
  };
  const fbm = (x: number, y: number, base: number, octaves: number, seed: number) => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      const period = base << o;
      const lat = lattice(period, seed + o * 17);
      const fx = (x / size) * period;
      const fy = (y / size) * period;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx);
      const sy = ty * ty * (3 - 2 * ty);
      const at = (i: number, j: number) => lat[((j % period) + period) % period * period + (((i % period) + period) % period)]!;
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
      const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
      sum += (a + (b - a) * sy) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      img.data[i] = fbm(x, y, 16, 3, 1) * 255;
      img.data[i + 1] = fbm(x, y, 6, 3, 2) * 255;
      img.data[i + 2] = fbm(x, y, 2, 4, 3) * 255;
      img.data[i + 3] = 255 * ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1 + 1) % 1;
    }
  g.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.premultiplyAlpha = false;
  return t;
}

const VERT = /* glsl */ `
varying vec3 vLocal;
varying vec3 vWorld;
void main() {
  vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const FRAG = /* glsl */ `
uniform sampler2D uRefl;
uniform sampler2D uNoise;
uniform sampler2D uFoot;
uniform sampler2D uTrails;
uniform mat4 uFootMatrix;
uniform vec4 uTrailRect;
uniform vec2 uRes;
uniform float uOpacity;
uniform float uReflGain;
uniform float uHasRefl;
uniform float uHasFoot;
uniform vec3 uHalo;
uniform vec3 uCore;
uniform vec3 uAlbedo;
uniform vec3 uTrailColor;
uniform vec2 uWall;
uniform float uCoreX;
uniform vec2 uFeet;
uniform float uPersonH;
uniform vec4 uFade;
uniform float uFloorY;
uniform float uDebug;
uniform float uContactY;
uniform float uCompact;
varying vec3 vLocal;
varying vec3 vWorld;

vec3 refl(vec2 uv, float lod, float spread) {
  // Toques esticados na vertical: reflexos em piso molhado se alongam na direção do olhar.
  vec2 s = vec2(0.35, 1.0) * spread / uRes;
  vec3 c = textureLod(uRefl, uv, lod).rgb * 0.32;
  c += textureLod(uRefl, uv + vec2(s.x, s.y), lod).rgb * 0.17;
  c += textureLod(uRefl, uv - vec2(s.x, s.y), lod).rgb * 0.17;
  c += textureLod(uRefl, uv + vec2(-s.x, 3.4 * s.y), lod + 0.6).rgb * 0.17;
  c += textureLod(uRefl, uv - vec2(-s.x, 3.4 * s.y), lod + 0.6).rgb * 0.17;
  return c;
}

void main() {
  vec2 p = vLocal.xz;
  // --- Material: relevo fino, médio e manchas molhadas ---
  vec4 nA = texture(uNoise, p * 0.9);
  float nMid = texture(uNoise, p * 0.23 + 0.17).g;
  float nBig = texture(uNoise, p * 0.045 + vec2(0.31, 0.07)).b;
  float wet = smoothstep(0.42, 0.66, nBig * 0.72 + nMid * 0.4);
  float rough = clamp(mix(0.5, 0.07, wet) + (nMid - 0.5) * 0.05, 0.05, 0.75);
  // Microrrelevo (gradiente do ruído no espaço do chão), mais liso onde está molhado.
  float e = 0.012;
  float h0 = nA.r * 0.65 + nMid * 0.35;
  float hx = texture(uNoise, (p + vec2(e, 0.0)) * 0.9).r * 0.65 + texture(uNoise, (p + vec2(e, 0.0)) * 0.23 + 0.17).g * 0.35;
  float hz = texture(uNoise, (p + vec2(0.0, e)) * 0.9).r * 0.65 + texture(uNoise, (p + vec2(0.0, e)) * 0.23 + 0.17).g * 0.35;
  float bump = mix(0.4, 0.12, wet);
  vec3 N = normalize(vec3(-(hx - h0) / e * bump * 0.02, 1.0, -(hz - h0) / e * bump * 0.02));
  vec3 V = normalize(cameraPosition - vWorld);
  float NdV = clamp(dot(N, V), 0.0, 1.0);
  float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);

  // --- Reflexo (alvo em meia resolução) ---
  vec3 R = vec3(0.0);
  if (uHasRefl > 0.5) {
    vec2 suv = gl_FragCoord.xy / uRes;
    // Nítido junto ao contato (linha da base na tela), desfoca com a distância dele.
    float away = clamp((uContactY - suv.y) * 3.2, 0.0, 1.0);
    // Distorção quase só vertical: concreto molhado borra na direção do olhar; jitter lateral lê como água.
    vec2 off = vec2(N.x * 0.12, -N.z) * (0.0015 + 0.008 * rough) * (0.4 + away);
    float lod = 0.7 + rough * (1.2 + 3.4 * away) + away * 1.6;
    R = refl(suv + off, lod, 1.0 + (rough * 20.0 + 10.0) * away);
  }

  // --- Sombras: pegada da escultura vista de cima ---
  float ao = 0.0;
  float shadow = 0.0;
  if (uHasFoot > 0.5) {
    vec4 fp = uFootMatrix * vec4(vLocal, 1.0);
    vec2 fuv = fp.xy * 0.5 + 0.5;
    ao = textureLod(uFoot, fuv, 2.5).r * 0.7 + textureLod(uFoot, fuv, 4.5).r * 0.5;
    // Sombra projetada a partir da base do núcleo de luz (atrás da escultura).
    vec2 L = vec2(uWall.x + uCoreX, uWall.y);
    vec2 dir = normalize(L - p);
    for (int k = 1; k <= 5; k++) {
      float fk = float(k);
      vec4 sp = uFootMatrix * vec4(p.x + dir.x * fk * 0.28, uFloorY, p.y + dir.y * fk * 0.28, 1.0);
      shadow = max(shadow, textureLod(uFoot, sp.xy * 0.5 + 0.5, 1.5 + fk * 0.6).r * (1.0 - fk * 0.13));
    }
  }
  // Sombra da figura, projetada a partir do núcleo.
  vec2 q = p - uWall;
  vec2 fdir = normalize(uFeet - vec2(uCoreX, 0.0));
  vec2 dq = q - uFeet;
  float along = dot(dq, fdir);
  float perp = dot(dq, vec2(-fdir.y, fdir.x));
  float fshadow = smoothstep(-0.02, 0.06, along) * exp(-pow(perp / (uPersonH * 0.16 + along * 0.05), 2.0)) * exp(-along / (uPersonH * 2.4));

  // --- Luz difusa derramada pela parede ---
  float t = max(q.y, 0.0);
  float sheet = smoothstep(-4.2, -2.4, q.x - t * 0.1) * (1.0 - smoothstep(3.2, 4.8, q.x + t * 0.1)) * exp(-t * 0.5) * smoothstep(0.0, 0.25, t);
  float pool = exp(-pow((q.x - uCoreX) / 1.6, 2.0) - pow(t / 1.4, 2.0));
  vec3 albedo = uAlbedo * (0.85 + 0.3 * nMid) * mix(1.0, 0.7, wet);
  // Em piso molhado quem domina é o reflexo: a difusa é discreta e mais forte no concreto seco.
  vec3 diffuse = albedo * (uHalo * sheet * 1.1 + uCore * pool * 0.45) * mix(1.0, 0.55, wet) * (1.0 - 0.85 * shadow) * (1.0 - 0.9 * fshadow);
  diffuse += albedo * 0.08;

  // Reflexo: forte nas poças, apagado e espalhado no concreto seco; a oclusão de contato também o apaga.
  float reflK = F * mix(0.4, 1.0, wet) * uReflGain;
  vec3 col = diffuse * (1.0 - ao * 0.55) + R * reflK * (1.0 - ao * 0.3);
  // Brilhos minúsculos de umidade onde há luz refletida.
  float glint = smoothstep(0.985, 1.0, nA.a) * wet;
  col += R * glint * 1.6;

  // --- Trilhas pintadas no piso ---
  vec2 tuv = (p - uTrailRect.xy) * uTrailRect.zw;
  if (all(greaterThan(tuv, vec2(0.0))) && all(lessThan(tuv, vec2(1.0)))) {
    vec2 tr = textureLod(uTrails, tuv, 0.0).rg;
    float trHalo = textureLod(uTrails, tuv, 2.0 + rough * 2.5).g;
    col += uTrailColor * (tr.r * 2.2 + tr.g * 0.3 + trHalo * mix(0.15, 0.35, rough)) + vec3(0.55, 0.85, 1.0) * tr.r * tr.r * 0.9;
  }

  if (uDebug > 1.5) col = vec3(ao, shadow, fshadow);
  else if (uDebug > 0.5) col = textureLod(uRefl, gl_FragCoord.xy / uRes, 0.0).rgb + vec3(0.0, 0.0, 0.05);
  // Névoa muito sutil junto ao horizonte (piso distante, diante da luz), sem cobrir a escultura.
  float haze = exp(-max(p.y - uWall.y, 0.0) * 0.55) * (0.35 + 0.65 * sheet);
  col += mix(uHalo, uCore, 0.25) * haze * 0.035;
  // Esmaece nas bordas do palco (o fundo CSS continua por trás).
  float fade = (1.0 - smoothstep(uFade.z, uFade.z + uFade.w, abs(p.x - uFade.x)))
             * smoothstep(uFade.y - 0.6, uFade.y + 0.2, p.y);
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  if (uCompact > 0.5) fade *= smoothstep(uContactY - 0.16, uContactY - 0.015, gl_FragCoord.y / uRes.y);
  gl_FragColor = vec4(max(col, 0.0), fade * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const FOOT_VERT = /* glsl */ `
void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
// Peso pela proximidade do chão: partes baixas fazem sombra e oclusão fortes.
const FOOT_FRAG = /* glsl */ `
uniform float uSpan;
uniform float uAbove;
void main() {
  float h = uAbove - gl_FragCoord.z * uSpan;
  float w = exp(-max(h, 0.0) / 0.9);
  gl_FragColor = vec4(w, w, w, 1.0);
}
`;

const FOOT_RES = 256;
const FOOT_EVERY = 3;

export function createCinematicFloor(o: FloorOptions): CinematicFloor {
  const F = o.floorY;
  const cx = (o.bounds.minX + o.bounds.maxX) / 2;
  const W = 64;
  const D = 40;
  const geo = new PlaneGeometry(W, D);
  geo.rotateX(-Math.PI / 2);
  geo.translate(cx, F, 6);
  const noise = noiseTexture();

  // Pegada da escultura (vista de cima) no espaço local do cenário.
  const margin = 1.6;
  const fx0 = o.bounds.minX - margin;
  const fx1 = o.bounds.maxX + margin;
  const fz0 = o.bounds.minZ - margin;
  const fz1 = o.bounds.maxZ + margin;
  const above = 40;
  const span = 60;
  const footCam = new OrthographicCamera(-(fx1 - fx0) / 2, (fx1 - fx0) / 2, (fz1 - fz0) / 2, -(fz1 - fz0) / 2, 0, span);
  footCam.position.set((fx0 + fx1) / 2, F + above, (fz0 + fz1) / 2);
  footCam.up.set(0, 0, -1);
  footCam.lookAt((fx0 + fx1) / 2, F, (fz0 + fz1) / 2);
  footCam.updateMatrixWorld(true);
  const footLocal = footCam.matrixWorld.clone();
  const footMatrix = new Matrix4().multiplyMatrices(footCam.projectionMatrix, footCam.matrixWorldInverse);
  footCam.matrixAutoUpdate = false;
  footCam.matrixWorldAutoUpdate = false;
  const footRT = new WebGLRenderTarget(FOOT_RES, FOOT_RES, {
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  });
  const footMat = new ShaderMaterial({
    vertexShader: FOOT_VERT,
    fragmentShader: FOOT_FRAG,
    uniforms: { uSpan: { value: span }, uAbove: { value: above } },
    side: DoubleSide,
    blending: CustomBlending,
    blendEquation: MaxEquation,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    depthTest: false,
    depthWrite: false,
  });

  const reflRT = new WebGLRenderTarget(2, 2, {
    type: HalfFloatType,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    depthBuffer: true,
  });

  // Trilhas: textura no espaço do chão (R = traço, G = halo próximo).
  const trailCanvas = document.createElement("canvas");
  trailCanvas.width = 1024;
  trailCanvas.height = 1024;
  const trailTex = new CanvasTexture(trailCanvas);
  trailTex.generateMipmaps = true;
  // Linha 0 do canvas = z0 do retângulo (sem inverter, como uma textura de chão).
  trailTex.flipY = false;
  // Vista rasante ao longe: filtragem anisotrópica (o three limita ao máximo da GPU).
  trailTex.anisotropy = 8;
  trailTex.minFilter = LinearMipmapLinearFilter;
  const trailRect = { x0: cx - 10, z0: -4, w: 20, d: 20 };
  const trailUniform = [trailRect.x0, trailRect.z0, 1 / trailRect.w, 1 / trailRect.d];

  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uRefl: { value: reflRT.texture },
      uNoise: { value: noise },
      uFoot: { value: footRT.texture },
      uTrails: { value: trailTex },
      uFootMatrix: { value: footMatrix },
      uTrailRect: { value: trailUniform },
      uRes: { value: new Vector2(1, 1) },
      uOpacity: { value: 1 },
      uReflGain: { value: 1.7 },
      uHasRefl: { value: o.reflections ? 1 : 0 },
      uHasFoot: { value: 0 },
      uHalo: { value: new Color("#2a8fe6") },
      uCore: { value: new Color("#cfeeff") },
      uAlbedo: { value: new Color("#0d1420") },
      uTrailColor: { value: new Color("#4fb8ff") },
      uWall: { value: [o.wallX, o.wallZ] },
      uCoreX: { value: o.coreX },
      uFeet: { value: [o.px - o.wallX, o.pz - o.wallZ] },
      uPersonH: { value: o.personH },
      uFade: { value: [cx + 1.5, o.wallZ, 7.5, 5] },
      uFloorY: { value: F },
      uContactY: { value: 0.3 },
      uCompact: { value: o.compact ? 1 : 0 },
      // ?pisodebug: alvo do reflexo puro; ?pisodebug=sombra: oclusão (R), sombra da escultura (G), da figura (B).
      uDebug: { value: (() => {
        const d = new URLSearchParams(window.location.search).get("pisodebug");
        return d === null ? 0 : d === "sombra" ? 2 : 1;
      })() },
    },
    transparent: true,
    depthWrite: false,
  });
  const mesh = new Mesh(geo, material);
  mesh.renderOrder = 1;

  const reflScene = new Scene();
  const size = new Vector2();
  const contact = new Vector3();
  const footWorld = new Matrix4();
  let frame = 0;
  let footReady = false;

  return {
    mesh,
    reflScene,
    material,
    render(renderer, camera, groupWorld, sculpture) {
      const prev = renderer.getRenderTarget();
      // Linha de contato (base da escultura) em coordenadas de tela 0..1, y para cima.
      contact.set(cx, F, (o.bounds.minZ + o.bounds.maxZ) / 2).applyMatrix4(groupWorld).project(camera);
      material.uniforms.uContactY!.value = contact.y * 0.5 + 0.5;
      renderer.getDrawingBufferSize(size);
      (material.uniforms.uRes!.value as Vector2).copy(size);
      if (o.reflections) {
        const w = Math.max(2, Math.round(size.x / 2));
        const h = Math.max(2, Math.round(size.y / 2));
        if (reflRT.width !== w || reflRT.height !== h) reflRT.setSize(w, h);
        renderer.setRenderTarget(reflRT);
        renderer.render(reflScene, camera);
      }
      if (sculpture && (frame++ % FOOT_EVERY === 0 || !footReady)) {
        footWorld.multiplyMatrices(groupWorld, footLocal);
        footCam.matrixWorld.copy(footWorld);
        footCam.matrixWorldInverse.copy(footWorld).invert();
        const mat = sculpture.material as Material;
        sculpture.material = footMat;
        renderer.setRenderTarget(footRT);
        renderer.setClearColor(0x000000, 0);
        renderer.clear();
        renderer.render(sculpture, footCam);
        sculpture.material = mat;
        footReady = true;
        material.uniforms.uHasFoot!.value = 1;
      }
      renderer.setRenderTarget(prev);
    },
    setTrails(trails) {
      if (!trails.length) return;
      // Retângulo do chão coberto pelas trilhas (com folga para o halo).
      let x0 = Infinity;
      let x1 = -Infinity;
      let z0 = Infinity;
      let z1 = -Infinity;
      for (const tr of trails)
        for (const [x, z] of tr.points) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          z0 = Math.min(z0, z);
          z1 = Math.max(z1, z);
        }
      const pad = 0.6;
      Object.assign(trailRect, { x0: x0 - pad, z0: z0 - pad, w: x1 - x0 + 2 * pad, d: z1 - z0 + 2 * pad });
      trailUniform.splice(0, 4, trailRect.x0, trailRect.z0, 1 / trailRect.w, 1 / trailRect.d);
      material.userData.trails = { rect: { ...trailRect }, counts: trails.map((t) => t.points.length), first: trails[0]?.points.slice(0, 3) };
      const g = trailCanvas.getContext("2d")!;
      g.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
      const sx = trailCanvas.width / trailRect.w;
      const sz = trailCanvas.height / trailRect.d;
      const s = Math.min(sx, sz);
      const toPx = ([x, z]: [number, number]) => [(x - trailRect.x0) * sx, (z - trailRect.z0) * sz] as const;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.globalCompositeOperation = "lighter";
      const strokeAll = (tr: (typeof trails)[number], channel: 0 | 1, width: number, blur: number, gain: number) => {
        g.filter = `blur(${blur}px)`;
        g.lineWidth = width;
        const n = tr.points.length - 1;
        for (let i = 0; i < n; i++) {
          // Intensidade ao longo da curva: forte no início (perto da câmera), apagando ao longe.
          const k = Math.round(255 * gain * tr.intensity * (1 - (1 - tr.fade) * (i / n)));
          g.strokeStyle = channel === 0 ? `rgb(${k},0,0)` : `rgb(0,${k},0)`;
          const [ax, ay] = toPx(tr.points[i]!);
          const [bx, by] = toPx(tr.points[i + 1]!);
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(bx, by);
          g.stroke();
        }
      };
      for (const tr of trails) {
        strokeAll(tr, 1, tr.width * s * 4, Math.max(2, tr.width * s * 2), 0.45);
        strokeAll(tr, 0, Math.max(1.5, tr.width * s), Math.max(0.5, tr.width * s * 0.25), 1);
      }
      g.filter = "none";
      g.globalCompositeOperation = "source-over";
      trailTex.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      noise.dispose();
      footRT.dispose();
      footMat.dispose();
      reflRT.dispose();
      trailTex.dispose();
      material.dispose();
    },
  };
}
