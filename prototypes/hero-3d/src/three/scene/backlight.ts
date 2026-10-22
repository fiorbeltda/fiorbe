import { Color, CustomBlending, Group, Mesh, OneFactor, PlaneGeometry, ShaderMaterial, ZeroFactor } from "three";

/**
 * Luz de fundo atrás da figura (referência: abertura luminosa ao fundo do
 * palco). Três camadas aditivas, todas procedurais (sem texturas):
 *
 * 1. Abertura — plano vertical ATRÁS da escultura: núcleo suave de luz fria,
 *    halo atmosférico amplo, feixes verticais discretos e o brilho rasante da
 *    linha do horizonte. Como fica atrás, as fitas se recortam contra ela em
 *    vez de serem lavadas por ela.
 * 2. Contraluz da figura — elipse estreita logo atrás da pessoa: separa a
 *    silhueta sem iluminar a escultura.
 * 3. Derramamento no chão — luz que vem da abertura em direção à câmera,
 *    com a sombra da figura projetada para a frente.
 *
 * Opacidade única (fade do scroll) e movimento mínimo dos feixes (parado com
 * reduced motion).
 */
export interface BacklightOptions {
  /** Base da figura (espaço local). */
  px: number;
  pz: number;
  floorY: number;
  /** Altura da escultura e da figura. */
  height: number;
  personH: number;
  /** Profundidade da abertura (atrás da escultura). */
  apertureZ: number;
  reducedMotion: boolean;
}

const COMMON = /* glsl */ `
uniform float uOpacity;
uniform float uTime;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
`;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Abertura: coordenadas em unidades (x centrado, y a partir do chão).
const APERTURE_FRAG = /* glsl */ `
${COMMON}
uniform vec2 uSize;
uniform vec3 uCore;
uniform vec3 uHalo;
uniform vec3 uDeep;
void main() {
  float x = (vUv.x - 0.5) * uSize.x;
  float y = vUv.y * uSize.y;
  float h = y / uSize.y;
  // Núcleo: fenda vertical de bordas macias, mais intensa junto ao chão.
  float slit = exp(-pow(x / 0.32, 2.0));
  float rise = pow(clamp(1.0 - h, 0.0, 1.0), 2.2);
  float core = slit * rise;
  float hot = exp(-pow(x / 0.16, 2.0)) * exp(-pow((y - 0.45) / 0.9, 2.0));
  // Halo atmosférico amplo, centrado um pouco acima do chão.
  float halo = exp(-pow(x / 1.25, 2.0) - pow((y - 0.9) / 1.7, 2.0));
  float deep = exp(-pow(x / 2.6, 2.0) - pow((y - 1.4) / 2.6, 2.0));
  // Feixes: poucos, finos, de intensidades diferentes; somem para cima.
  float beams = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float c = (hash(vec2(fi, 3.1)) - 0.5) * 1.9;
    float w = mix(0.02, 0.06, hash(vec2(fi, 7.7)));
    float a = mix(0.35, 1.0, hash(vec2(fi, 1.3)));
    float breathe = 0.85 + 0.15 * sin(uTime * 0.21 + fi * 1.9);
    float top = mix(0.55, 0.95, hash(vec2(fi, 5.2)));
    beams += a * breathe * exp(-pow((x - c) / w, 2.0)) * pow(clamp(1.0 - h / top, 0.0, 1.0), 1.3);
  }
  // Brilho rasante onde o chão encontra o fundo.
  float horizon = exp(-pow(y / 0.07, 2.0)) * exp(-pow(x / 1.6, 2.0));
  vec3 col = uCore * (core * 0.55 + hot * 0.5) + uHalo * (halo * 0.22 + horizon * 0.45) + uDeep * deep * 0.1 + uCore * beams * 0.05;
  // Sem bordas: tudo chega a zero antes dos limites do plano.
  col *= (1.0 - smoothstep(0.32, 0.5, abs(vUv.x - 0.5))) * (1.0 - smoothstep(0.72, 1.0, vUv.y));
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(max(col, 0.0) * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// Contraluz: elipse estreita e alta atrás da pessoa.
const RIM_FRAG = /* glsl */ `
${COMMON}
uniform vec3 uCore;
void main() {
  vec2 p = vUv - vec2(0.5, 0.42);
  float e = exp(-pow(p.x / 0.2, 2.0) - pow(p.y / 0.34, 2.0));
  vec3 col = uCore * e * 0.55;
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// Chão: coordenadas (x, z) em unidades; origem na base da abertura.
const FLOOR_FRAG = /* glsl */ `
${COMMON}
uniform vec2 uSize;
uniform vec2 uFeet;
uniform float uPersonH;
uniform vec3 uHalo;
uniform vec3 uCore;
void main() {
  vec2 q = vec2((vUv.x - 0.5) * uSize.x, (1.0 - vUv.y) * uSize.y);
  // Eixo da luz: da base da abertura, passando pelos pés da figura, até a câmera.
  vec2 dir = normalize(uFeet + vec2(0.0, 0.001));
  float t = max(dot(q, dir), 0.0);
  float side = dot(q, vec2(-dir.y, dir.x));
  // Leque que avança em direção à câmera e se abre.
  float spread = 0.45 + t * 0.2;
  float fan = exp(-pow(side / spread, 2.0)) * exp(-t * 0.27) * smoothstep(0.0, 0.25, t);
  float base = exp(-pow(q.x / 1.1, 2.0) - pow(q.y / 0.35, 2.0));
  // (o plano é largo: o eixo da luz atravessa o chão em diagonal até a câmera)
  // Sombra da figura: faixa estreita dos pés para a frente, no meio da luz.
  vec2 d = q - uFeet;
  float along = dot(d, dir);
  float perp = dot(d, vec2(-dir.y, dir.x));
  float shadow = smoothstep(-0.02, 0.06, along) * exp(-pow(perp / (uPersonH * 0.16 + along * 0.05), 2.0)) * exp(-along / (uPersonH * 2.4));
  // Reflexo do núcleo no piso: faixa estreita e alongada.
  float streak = exp(-pow(side / (0.2 + t * 0.03), 2.0)) * exp(-t * 0.3);
  float light = (fan * 0.95 + base * 0.6) * (1.0 - 0.85 * shadow);
  vec3 col = mix(uHalo, uCore, 0.35) * light + uCore * streak * 0.9 * (1.0 - 0.9 * shadow);
  col *= (1.0 - smoothstep(0.3, 0.5, abs(vUv.x - 0.5))) * smoothstep(0.0, 0.15, vUv.y);
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * Deslocamento lateral da abertura: compensa a paralaxe da profundidade para
 * que o núcleo apareça logo atrás da figura na câmera principal.
 */
const APERTURE_SHIFT = 1.5;

export function createBacklight(o: BacklightOptions) {
  const group = new Group();
  const geo = new PlaneGeometry(1, 1);
  const core = new Color("#d8f4ff");
  const halo = new Color("#2f9be8");
  const deep = new Color("#0d3f9a");
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

  // 1 — Abertura atrás da escultura.
  const aw = 7.5;
  const ah = o.height * 1.35;
  const aperture = new Mesh(geo, make(APERTURE_FRAG, { uSize: { value: [aw, ah] }, uCore: { value: core }, uHalo: { value: halo }, uDeep: { value: deep } }));
  aperture.scale.set(aw, ah, 1);
  aperture.position.set(o.px + APERTURE_SHIFT, o.floorY + ah / 2, o.apertureZ);
  aperture.renderOrder = -1;
  group.add(aperture);

  // 2 — Contraluz junto à figura.
  const rim = new Mesh(geo, make(RIM_FRAG, { uCore: { value: core } }));
  rim.scale.set(o.personH * 1.1, o.personH * 1.5, 1);
  rim.position.set(o.px + 0.02, o.floorY + o.personH * 0.66, o.pz - 0.3);
  rim.renderOrder = 2;
  group.add(rim);

  // 3 — Derramamento no chão, da abertura até à frente da figura.
  const fw = 16;
  const fd = o.pz - o.apertureZ + 12;
  const floor = new Mesh(
    geo,
    make(FLOOR_FRAG, {
      uSize: { value: [fw, fd] },
      uFeet: { value: [-APERTURE_SHIFT, o.pz - o.apertureZ] },
      uPersonH: { value: o.personH },
      uHalo: { value: halo },
      uCore: { value: core },
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(fw, fd, 1);
  floor.position.set(o.px + APERTURE_SHIFT, o.floorY + 0.004, o.apertureZ + fd / 2);
  floor.renderOrder = 2;
  group.add(floor);

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
