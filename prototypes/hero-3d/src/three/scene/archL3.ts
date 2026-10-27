import { CustomBlending, Group, Mesh, OneFactor, PlaneGeometry, ShaderMaterial, ZeroFactor } from "three";

/**
 * ENT-003 — Arquitetura luminosa L3 ("arquitetura escultural", canvas Entrelace 003).
 * Uma abertura em arco do tamanho da peça, atrás dela, com cinco molduras deslocadas que repetem
 * as lamelas da escultura em escala de arquitetura, mais dois planos translúcidos laterais.
 * Módulo novo e opcional: a parede, as colunas, a fachada e o piso aprovados (backlight.ts,
 * floor.ts) ficam como estão — o arco SOMA luz por cima deles, do mesmo jeito (aditivo, só cor;
 * o alfa do canvas fica intacto) e entra no reflexo do piso pelo mesmo caminho das paredes.
 *
 * Tudo num único plano (um draw, sem sobreposição de planos): o custo é só o preenchimento da
 * área do arco. Linhas com espessura em px de tela (derivadas), nítidas em qualquer escala.
 */
export interface ArchL3Options {
  floorY: number;
  /** Limites da escultura no espaço local. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; height: number };
  reducedMotion: boolean;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float uOpacity;
uniform vec2 uSize;     // largura/altura do plano (unidades locais)
uniform vec2 uX;        // x local das bordas esquerda/direita do plano, relativo ao eixo do arco
uniform float uA;       // meia-largura da abertura
uniform float uSpring;  // altura do início da curva (pernas retas até aqui)
uniform float uTime;
uniform float uGain;    // intensidade da abertura
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// Distância ao contorno de um arco aberto embaixo (pernas + semicírculo) e "dentro".
float arcD(vec2 p, float a, float s) {
  return p.y > s ? abs(length(p - vec2(0.0, s)) - a) : abs(abs(p.x) - a);
}
float arcIn(vec2 p, float a, float s) {
  return p.y > s ? length(p - vec2(0.0, s)) - a : abs(p.x) - a;
}
// Filete de ~px de tela, com cobertura contínua (sem tracejado quando a curva passa entre os
// centros dos pixels): núcleo de meia largura + rampa de 1 px. w = tamanho do pixel em unidades
// locais, medido FORA dos desvios (derivadas dentro de um if por pixel são indefinidas).
float hair(float d, float px, float w) {
  return 1.0 - smoothstep(0.5 * px * w, (0.5 * px + 1.0) * w, d);
}
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
void main() {
  // Origem no chão, no eixo do arco.
  vec2 p = vec2(mix(uX.x, uX.y, vUv.x), vUv.y * uSize.y);
  float pw = max(length(fwidth(p)) * 0.7071, 1e-5);
  float a = uA;
  float s = uSpring;
  float top = s + a;
  float h = clamp(p.y / top, 0.0, 1.0);

  // 1 — Abertura: o gradiente do canvas (quase branco no chão → ciano → azul → azul-noturno no
  //     alto). É o contraluz que desenha a silhueta das fitas onde a headline vira contorno.
  float dIn = arcIn(p, a, s);
  float inside = (1.0 - smoothstep(-0.012 * a, 0.012 * a, dIn)) * step(0.0, p.y);
  vec3 c0 = vec3(0.941, 0.980, 1.0);
  vec3 c1 = vec3(0.588, 0.871, 1.0);
  vec3 c2 = vec3(0.243, 0.557, 1.0);
  vec3 c3 = vec3(0.110, 0.290, 0.769);
  vec3 c4 = vec3(0.047, 0.133, 0.384);
  vec3 g = h < 0.11 ? mix(c0, c1, h / 0.11)
         : h < 0.32 ? mix(c1, c2, (h - 0.11) / 0.21)
         : h < 0.58 ? mix(c2, c3, (h - 0.32) / 0.26)
         : mix(c3, c4, (h - 0.58) / 0.42);
  vec3 col = lin(g) * inside * uGain;
  // Brilho que vaza da abertura (sombra de luz de ~70 px no canvas) e o grande halo azul do vão.
  float out1 = max(dIn, 0.0);
  col += lin(vec3(0.235, 0.588, 1.0)) * exp(-out1 / (a * 0.16)) * (1.0 - inside) * 0.35 * smoothstep(0.0, top * 0.1, p.y);
  vec2 hq = vec2(p.x / (a * 2.2), p.y / (top * 1.05));
  col += lin(vec3(0.235, 0.588, 1.0)) * 0.30 * (1.0 - smoothstep(0.0, 0.72, length(hq))) * (1.0 - inside);

  // 2 — Cinco molduras deslocadas (as lamelas em escala de arquitetura): +22 px de raio e 11 px
  //     para a direita a cada passo (canvas); a mais interna é a mais nítida.
  //     Só na faixa onde as molduras existem (o resto do plano não paga o laço).
  if (dIn > -0.03 * a && dIn < 0.62 * a) for (int i = 1; i <= 5; i++) {
    float fi = float(i);
    float ai = a * (1.0 + 0.078 * fi);
    float si = s;
    vec2 pi = p - vec2(a * 0.039 * fi, 0.0);
    float d = arcD(pi, ai, si);
    float k = fi <= 2.0 ? 0.4 : fi == 3.0 ? 0.3 : fi == 4.0 ? 0.2 : 0.1;
    float rise = smoothstep(0.0, top * 0.08, p.y);
    col += lin(vec3(0.647, 0.871, 1.0)) * hair(d, 1.1, pw) * k * rise * 0.9;
    // Face da moldura (vidro azul a 2,5% cada, acumulando para dentro).
    col += lin(vec3(0.157, 0.431, 0.941)) * (1.0 - smoothstep(-0.004 * a, 0.004 * a, arcIn(pi, ai, si))) * 0.025 * rise;
  }

  // 3 — Planos translúcidos laterais: à esquerda reduzido a um filete alto (fica atrás da peça,
  //     não da coluna de texto); à direita um painel mais baixo, mais presente.
  float lx = -a * 1.30;
  col += lin(vec3(0.63, 0.82, 1.0)) * hair(abs(p.x - lx), 1.0, pw) * 0.16 * step(0.0, p.y);
  float rx0 = a * 1.03;
  float rt = top * 0.836;
  float inR = step(rx0, p.x) * step(p.y, rt) * step(0.0, p.y);
  col += lin(vec3(0.47, 0.78, 1.0)) * inR * mix(0.10, 0.03, p.y / rt) * 0.6;
  col += lin(vec3(0.67, 0.86, 1.0)) * (hair(abs(p.x - rx0), 1.0, pw) * step(p.y, rt) * 0.24 + hair(abs(p.y - rt), 1.0, pw) * step(rx0, p.x) * 0.14) * step(0.0, p.y);

  // Bordas do plano se apagam (sem corte reto) e o conjunto encosta no chão.
  col *= smoothstep(0.0, 0.05, vUv.x) * (1.0 - smoothstep(0.9, 1.0, vUv.x)) * (1.0 - smoothstep(0.88, 1.0, vUv.y));
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(max(col, 0.0) * uOpacity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createArchL3(o: ArchL3Options) {
  const { bounds: b, floorY: F } = o;
  const w = b.maxX - b.minX;
  const group = new Group();
  const geo = new PlaneGeometry(1, 1);
  // Abertura: ~58% da largura da peça e um pouco mais alta que ela; eixo levemente à direita do
  // centro (no canvas o arco fica atrás das fitas que cruzam a frase).
  // Canvas 3a: abertura de 564 px para uma peça de ~935 px, topo ~1,2× a altura da peça; o plano
  // fica atrás da escultura, então a perspectiva o encolhe — medidas compensadas.
  const a = w * 0.33;
  const spring = b.height * 1.3 - a;
  // Plano recortado à área útil (do filete esquerdo ao fim do painel direito; até acima da moldura
  // mais externa): metade da área do primeiro rascunho — a cena é limitada por preenchimento.
  const x0 = -a * 1.42;
  const x1 = a * 1.9;
  const size = [x1 - x0, spring + a * 1.45];
  const mat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uSize: { value: size },
      uX: { value: [x0, x1] },
      uA: { value: a },
      uSpring: { value: spring },
      uGain: { value: 0.85 },
    },
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneFactor,
    blendSrcAlpha: ZeroFactor,
    blendDstAlpha: OneFactor,
    transparent: true,
    depthWrite: false,
  });
  const plane = new Mesh(geo, mat);
  plane.scale.set(size[0]!, size[1]!, 1);
  // Entre a parede de luz (minZ − 0,8) e a escultura: na frente da parede, atrás de tudo o mais.
  // Eixo do arco levemente à direita do centro da peça; o plano é assimétrico em torno dele.
  plane.position.set((b.minX + b.maxX) / 2 + w * 0.05 + (x0 + x1) / 2, F + size[1]! / 2, b.minZ - 0.45);
  plane.renderOrder = -1;
  group.add(plane);

  return {
    group,
    /** O piso molhado reflete o arco pelo mesmo caminho das paredes. */
    mirrorSources: [plane] as Mesh[],
    fadeables: [
      {
        get opacity() {
          return mat.uniforms.uOpacity!.value as number;
        },
        set opacity(v: number) {
          mat.uniforms.uOpacity!.value = v;
        },
      },
    ],
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
