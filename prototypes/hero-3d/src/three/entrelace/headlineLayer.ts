import {
  CanvasTexture,
  CustomBlending,
  GreaterDepth,
  LessEqualDepth,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  FrontSide,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type WebGLRenderer,
} from "three";

/**
 * ENT-003 — Entrelace: a headline (HTML real) é redesenhada DENTRO do mesmo render da cena,
 * como um plano de tela logo atrás da escultura. Nada é estimado em 2D:
 *
 *  - Preenchimento: teste de profundidade normal (LessEqual) — some exatamente onde a geometria
 *    renderizada da escultura (ou da figura) está na frente, no mesmo quadro, com o MSAA da cena.
 *  - Contorno: teste invertido (Greater) — filete claro + halo escuro + véu de vidro só onde a
 *    escultura cobre a letra.
 *  - Sombra da matéria: silhueta da escultura num alvo de 1/4 da resolução (mesma malha, mesma
 *    matriz de mundo, mesma câmera), desfocada na leitura; escurece só as letras sólidas junto às fitas.
 *
 * Nenhum loop próprio, nenhuma leitura de pixels para a CPU: o motor chama `prepare` e o render
 * principal desenha as duas camadas. O texto do DOM continua sendo o único conteúdo acessível; aqui
 * ele fica transparente (selecionável) enquanto o 3D desenha — `--ent-dom` devolve a cor ao DOM
 * quando o canvas se apaga (movimento reduzido na rolagem, passagem final, perda de contexto).
 */
export interface HeadlineLayerOptions {
  /** h1 real (fonte, quebras e posição vêm dele). */
  el: HTMLElement;
  /** Elemento que recebe data-entrelace="live" (CSS troca para o modo 3D). */
  host: HTMLElement;
  /** Canvas do motor: a opacidade EFETIVA dele (inclusive durante transições CSS) decide a cor do DOM. */
  canvas: HTMLCanvasElement;
  /** Malha da escultura (profundidade e silhueta). */
  sculpture: Mesh;
  /** Sombra da matéria (um passe extra pequeno). Desligada no tier baixo. */
  shadow: boolean;
  /**
   * Profundidade do plano das letras: "fundo" = atrás da peça inteira (canvas 3a: toda fita que
   * cruza a letra a recorta); "meio" = no meio da profundidade (as fitas de trás passam atrás das
   * letras, as da frente as cortam). "auto" = a composição decide por breakpoint (`--ent-plane`).
   */
  plane: "fundo" | "meio" | "auto";
}

const VERT = /* glsl */ `
uniform vec4 uRect;   // x, y (topo), largura, altura — px CSS do viewport
uniform vec2 uView;   // viewport em px CSS
uniform float uDepth; // profundidade NDC do plano
varying vec2 vUv;
void main() {
  vUv = uv;
  vec2 px = uRect.xy + vec2(uv.x, 1.0 - uv.y) * uRect.zw;
  gl_Position = vec4(px.x / uView.x * 2.0 - 1.0, 1.0 - px.y / uView.y * 2.0, uDepth, 1.0);
}
`;

const FILL_FRAG = /* glsl */ `
uniform sampler2D uGlyph;
uniform sampler2D uMask;
uniform vec2 uBuffer;   // drawing buffer em px reais
uniform float uOpacity;
uniform float uShadow;  // 0 = sem sombra da matéria
uniform float uBlur;    // raio do desfoque da sombra, em px reais
uniform vec3 uFill;
varying vec2 vUv;
void main() {
  float a = texture2D(uGlyph, vUv).r * uOpacity;
  if (a < 0.002) discard;
  vec3 col = uFill;
  if (uShadow > 0.0) {
    vec2 q = gl_FragCoord.xy / uBuffer;
    vec2 r = uBlur / uBuffer;
    // 9 toques em dois anéis: a máscara já é de 1/4 (o filtro linear soma o resto do desfoque).
    float m = texture2D(uMask, q).a * 0.2;
    m += (texture2D(uMask, q + r * vec2(0.5, 0.0)).a + texture2D(uMask, q - r * vec2(0.5, 0.0)).a
        + texture2D(uMask, q + r * vec2(0.0, 0.5)).a + texture2D(uMask, q - r * vec2(0.0, 0.5)).a) * 0.12;
    m += (texture2D(uMask, q + r * vec2(0.7, 0.7)).a + texture2D(uMask, q - r * vec2(0.7, 0.7)).a
        + texture2D(uMask, q + r * vec2(0.7, -0.7)).a + texture2D(uMask, q - r * vec2(0.7, -0.7)).a) * 0.08;
    // Só FORA da silhueta (junto às bordas das fitas): com o plano no meio da peça, a letra que
    // passa na frente de uma fita não é escurecida por ela. Sombra fria, mais densa colada à fita.
    float inside = texture2D(uMask, q).a;
    col = mix(col, vec3(0.30, 0.38, 0.55), smoothstep(0.0, 0.9, m) * (1.0 - smoothstep(0.35, 0.8, inside)) * uShadow);
  }
  gl_FragColor = vec4(col * a, a);
}
`;

const LINE_FRAG = /* glsl */ `
uniform sampler2D uGlyph;
uniform float uOpacity;
uniform vec3 uStroke;
uniform vec3 uHalo;
uniform float uHaloAlpha;
uniform float uVeil;
varying vec2 vUv;
void main() {
  vec3 g = texture2D(uGlyph, vUv).rgb;
  // Pré-multiplicado, de baixo para cima: halo escuro → véu de vidro dentro da letra → filete claro.
  vec4 c = vec4(uHalo, 1.0) * (g.b * uHaloAlpha);
  float veil = g.r * uVeil;
  c = vec4(vec3(1.0), 1.0) * veil + c * (1.0 - veil);
  c = vec4(uStroke, 1.0) * g.g + c * (1.0 - g.g);
  c *= uOpacity;
  if (c.a < 0.002) discard;
  gl_FragColor = c;
}
`;

/** Contorno de 1,5 px e halo de 5 px (px CSS), como no canvas 3a; o véu de vidro a 7%. */
const STROKE_PX = 1.5;
const HALO_PX = 5;

export function createHeadlineLayer(o: HeadlineLayerOptions) {
  const geo = new PlaneGeometry(1, 1);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 2;
  const glyph = new CanvasTexture(canvas);
  glyph.generateMipmaps = false;
  glyph.minFilter = LinearFilter;
  glyph.magFilter = LinearFilter;

  const mask = new WebGLRenderTarget(4, 4, { depthBuffer: false, stencilBuffer: false });
  mask.texture.minFilter = LinearFilter;
  mask.texture.magFilter = LinearFilter;
  mask.texture.generateMipmaps = false;

  const shared = {
    uRect: { value: [0, 0, 1, 1] as number[] },
    uView: { value: [1, 1] as number[] },
    uDepth: { value: 0.99 },
    uGlyph: { value: glyph },
    uOpacity: { value: 0 },
  };
  const blend = {
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
    blendSrcAlpha: OneFactor,
    blendDstAlpha: OneMinusSrcAlphaFactor,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  } as const;
  const fillMat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FILL_FRAG,
    uniforms: {
      ...shared,
      uMask: { value: mask.texture },
      uBuffer: { value: [1, 1] as number[] },
      uShadow: { value: o.shadow ? 0.62 : 0 },
      uBlur: { value: 24 },
      uFill: { value: [0.953, 0.965, 0.984] }, // #F3F6FB — branco suave
    },
    depthFunc: LessEqualDepth,
    ...blend,
  });
  const lineMat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: LINE_FRAG,
    uniforms: {
      ...shared,
      uStroke: { value: [0.93, 0.96, 1.0] },
      uHalo: { value: [0.012, 0.027, 0.07] },
      uHaloAlpha: { value: 0.62 },
      uVeil: { value: 0.07 },
    },
    depthFunc: GreaterDepth,
    ...blend,
  });
  const fill = new Mesh(geo, fillMat);
  const line = new Mesh(geo, lineMat);
  for (const [m, order] of [[fill, 50], [line, 51]] as const) {
    m.frustumCulled = false;
    m.renderOrder = order; // depois do cenário aditivo (parede, luz, piso): a letra fica por cima dele
    m.matrixAutoUpdate = false;
    m.visible = false;
  }

  // Silhueta para a sombra: mesma geometria e matriz da escultura, material liso, cena própria.
  const maskScene = new Scene();
  const maskMesh = new Mesh(o.sculpture.geometry, new MeshBasicMaterial({ color: 0xffffff }));
  maskMesh.matrixAutoUpdate = false;
  maskMesh.matrixWorldAutoUpdate = false;
  maskMesh.frustumCulled = false;
  const sculptureMat = o.sculpture.material;
  maskMesh.material.side = Array.isArray(sculptureMat) ? FrontSide : sculptureMat.side;
  maskScene.add(maskMesh);

  o.sculpture.geometry.computeBoundingSphere();
  const sphere = new Sphere().copy(o.sculpture.geometry.boundingSphere!);
  const center = new Vector3();

  let ready = false;
  let glyphW = 0;
  let glyphH = 0;
  let lastDom = -1;
  let disposed = false;
  let layoutToken = 0;
  let padPx = 0;
  let plane: "fundo" | "meio" = o.plane === "meio" ? "meio" : "fundo";
  const tmpSize = new Vector2();

  /** Redesenha as letras no canvas a partir das caixas reais de cada palavra no DOM. */
  async function layout(): Promise<void> {
    const token = ++layoutToken;
    const cs = getComputedStyle(o.el);
    if (o.plane === "auto") plane = cs.getPropertyValue("--ent-plane").trim() === "meio" ? "meio" : "fundo";
    const size = parseFloat(cs.fontSize);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    try {
      await document.fonts.load(font, "Cada camada importa.");
    } catch {
      /* fonte de sistema: segue */
    }
    if (disposed || token !== layoutToken) return;
    const box = o.el.getBoundingClientRect();
    const w = o.el.offsetWidth;
    const h = o.el.offsetHeight;
    if (w < 2 || h < 2) return;
    // Margem para o halo e para letras que passam da caixa (acentos, descendentes).
    const pad = Math.ceil(HALO_PX * 2 + size * 0.12);
    const pr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    glyphW = w + pad * 2;
    glyphH = h + pad * 2;
    canvas.width = Math.ceil(glyphW * pr);
    canvas.height = Math.ceil(glyphH * pr);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const words: Array<{ text: string; x: number; y: number }> = [];
    ctx.font = font;
    const ls = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = ls;
    ctx.fontKerning = "normal";
    const walker = document.createTreeWalker(o.el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    // Origem da caixa sem transformações (a saída por scroll só translada; o rect por quadro cuida disso).
    const ox = box.left;
    const oy = box.top;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? "";
      for (const m of text.matchAll(/\S+/g)) {
        range.setStart(n, m.index!);
        range.setEnd(n, m.index! + m[0].length);
        const r = range.getClientRects()[0];
        if (!r) continue;
        const metrics = ctx.measureText(m[0]);
        // A caixa de texto do DOM é a área de conteúdo da fonte (ascendente + descendente).
        words.push({ text: m[0], x: r.left - ox + pad, y: r.top - oy + pad + metrics.fontBoundingBoxAscent });
      }
    }
    const draw = (mode: "fill" | "stroke" | "halo") => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(pr, 0, 0, pr, 0, 0);
      ctx.font = font;
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = ls;
      ctx.textBaseline = "alphabetic";
      ctx.lineJoin = "round";
      ctx.filter = mode === "halo" ? `blur(${2 * pr}px)` : "none";
      ctx.fillStyle = ctx.strokeStyle = "#fff";
      ctx.lineWidth = mode === "halo" ? HALO_PX * 2 : STROKE_PX;
      for (const wd of words) {
        if (mode === "fill") ctx.fillText(wd.text, wd.x, wd.y);
        else ctx.strokeText(wd.text, wd.x, wd.y);
      }
      return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const f = draw("fill");
    const s = draw("stroke");
    const hl = draw("halo");
    const out = ctx.createImageData(canvas.width, canvas.height);
    const d = out.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = f[i + 3]!;
      d[i + 1] = s[i + 3]!;
      d[i + 2] = hl[i + 3]!;
      d[i + 3] = 255;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none";
    ctx.putImageData(out, 0, 0);
    glyph.dispose(); // tamanho novo: realoca na GPU
    glyph.needsUpdate = true;
    padPx = pad;
    ready = true;
  }

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => void layout()) : null;
  ro?.observe(o.el);
  void layout();
  void document.fonts?.ready.then(() => void layout());

  const setLive = (live: boolean) => {
    if (live) o.host.dataset.entrelace = "live";
    else delete o.host.dataset.entrelace;
  };

  return {
    meshes: [fill, line] as Mesh[],
    layout: () => void layout(),
    /**
     * A cada quadro, já com as matrizes deste quadro: posição/opacidade do texto (DOM real) e
     * profundidade do plano a partir da peça transformada. A cor do DOM é o complemento da
     * opacidade efetiva do canvas. Chamado mesmo quando o canvas não desenha.
     */
    sync(camera: PerspectiveCamera): void {
      const canvasOpacity = parseFloat(getComputedStyle(o.canvas).opacity) || 0;
      const dom = ready ? Math.round((1 - canvasOpacity) * 1000) / 1000 : 1;
      if (dom !== lastDom) {
        o.el.style.setProperty("--ent-dom", String(dom));
        lastDom = dom;
      }
      if (ready && !o.host.dataset.entrelace) setLive(true);
      if (canvasOpacity <= 0.001) {
        fill.visible = line.visible = false;
        return;
      }
      const r = o.el.getBoundingClientRect();
      const opacity = ready ? parseFloat(getComputedStyle(o.el).opacity) || 0 : 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const visible = ready && opacity > 0.001 && r.bottom > -padPx && r.top < vh + padPx;
      fill.visible = line.visible = visible;
      if (!visible) return;
      shared.uRect.value = [r.left - padPx, r.top - padPx, glyphW, glyphH];
      shared.uView.value = [vw, vh];
      shared.uOpacity.value = opacity;
      // Plano logo atrás da peça (ou no meio dela), na profundidade real deste quadro.
      center.copy(sphere.center).applyMatrix4(o.sculpture.matrixWorld);
      const radius = sphere.radius * o.sculpture.matrixWorld.getMaxScaleOnAxis() * 1.04;
      const zWorld = plane === "meio" ? center.z : center.z - radius;
      const zView = zWorld - camera.position.z; // câmera fixa olhando para -z
      const e = camera.projectionMatrix.elements;
      shared.uDepth.value = Math.min(0.99999, (e[10]! * zView + e[14]!) / -zView);
    },
    /** Silhueta da peça para a sombra da matéria (1/4 da resolução). Só quando o texto aparece. */
    renderMask(renderer: WebGLRenderer, camera: PerspectiveCamera): void {
      if (!fill.visible) return;
      const size = renderer.getDrawingBufferSize(tmpSize);
      fillMat.uniforms.uBuffer!.value = [size.x, size.y];
      fillMat.uniforms.uBlur!.value = 26 * renderer.getPixelRatio();
      if (!o.shadow) return;
      const mw = Math.max(4, Math.round(size.x / 4));
      const mh = Math.max(4, Math.round(size.y / 4));
      if (mask.width !== mw || mask.height !== mh) mask.setSize(mw, mh);
      maskMesh.matrixWorld.copy(o.sculpture.matrixWorld);
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(mask);
      renderer.clear(true, false, false);
      renderer.render(maskScene, camera);
      renderer.setRenderTarget(prev);
    },
    /** Contexto perdido / motor desligado: o DOM volta a ser o texto visível. */
    detach(): void {
      setLive(false);
      o.el.style.removeProperty("--ent-dom");
    },
    dispose(): void {
      disposed = true;
      ro?.disconnect();
      setLive(false);
      o.el.style.removeProperty("--ent-dom");
      geo.dispose();
      glyph.dispose();
      mask.dispose();
      fillMat.dispose();
      lineMat.dispose();
      maskMesh.material.dispose();
    },
  };
}

export type HeadlineLayer = ReturnType<typeof createHeadlineLayer>;
