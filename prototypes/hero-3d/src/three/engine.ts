import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  BackSide,
  Box3,
  FrontSide,
  type BufferGeometry,
  DirectionalLight,
  DoubleSide,
  NeutralToneMapping,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { createSculptureGeometry } from "./sculpture/ribbonGeometry";
import { createMonumentGeometry, DEFAULT_FORM, FLOOR_LOCAL, FORMS, isFormName, MAIN_BAND, PERSON_LOCAL } from "./sculpture/monument";
import { createGestureDebug } from "./sculpture/gestureDebug";
import { buildFromBlender } from "./sculpture/blenderSculpture";
import { createSculptureSet } from "./scene/set";
import { createSculptureMaterial, createSculptureUniforms } from "./sculpture/material";
import { createFiberNoise } from "./sculpture/textures";
import { WaveDirector } from "./motion/waveDirector";
import { createWaveDebug } from "./motion/waveDebug";
import { createPremiumEnvironment, createStudioEnvironment } from "./scene/environment";
import { updateIdle } from "./motion/idle";
import { InteractionController } from "./motion/interaction";
import { createSpring, damp, stepSpring } from "./motion/spring";
import { ScrollTimeline } from "./motion/scrollTimeline";
import { AdaptiveDpr, detectTier, profileFor, type Tier } from "./quality/quality";

export interface EngineOptions {
  canvas: HTMLCanvasElement;
  /** Retângulo do DOM onde a escultura repousa no estado 01. */
  stage: HTMLElement;
  /** Régua de destino onde os fluxos assentam (estado 05). */
  rule: HTMLElement;
  reducedMotion: boolean;
  onReady: () => void;
  onContextLost: () => void;
  onStats?: (stats: EngineStats) => void;
  /** Malha da escultura vinda do Blender (ver preloadSculpture); ausente = geometria procedural. */
  sculpture?: BufferGeometry | null;
}

/**
 * ?forma=blender (escultura V1 modelada no Blender), ?forma=blender2[sufixo] (V2,
 * lâmina esculpida — `escultura-v2[sufixo].glb`) ou ?forma=blender-teste (prova de
 * integração): carrega o GLB antes de criar o motor. Qualquer outra forma: null.
 */
export async function preloadSculpture(): Promise<BufferGeometry | null> {
  const forma = new URLSearchParams(window.location.search).get("forma") ?? "";
  const v2 = /^blender2([a-z0-9-]*)$/.exec(forma);
  if (forma !== "blender" && forma !== "blender-teste" && !v2) return null;
  const { loadBlenderGeometry } = await import("./sculpture/blenderSculpture");
  if (v2) return loadBlenderGeometry(`/models/escultura-v2${v2[1]}.glb`);
  return loadBlenderGeometry(forma === "blender" ? "/models/escultura.glb" : "/models/teste.glb");
}

export interface EngineStats {
  tier: Tier;
  dpr: number;
  fps: number;
  progress: number;
}

export interface HeroEngine {
  setPaused(paused: boolean): void;
  dispose(): void;
}

const FOV = 30;
const CAMERA_Z = 10;
/** Pose de repouso do nó antigo (?geo=knot, só para comparação A/B). */
const REST_KNOT = { x: -0.42, y: 0.38, z: 0.12 };
/** Monumento: as curvas já são desenhadas no enquadramento da referência. */
const REST_MONUMENT = { x: 0, y: 0, z: 0 };
/** Horizonte (altura dos olhos de uma pessoa) acima da base do palco, em fração da altura do palco. */
const HORIZON_ABOVE_BASE = 0.075;

export function createHeroEngine(opts: EngineOptions): HeroEngine {
  const { canvas, stage, rule, reducedMotion } = opts;
  const profile = profileFor(detectTier());
  const adaptive = new AdaptiveDpr(profile);

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: profile.antialias,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(adaptive.dpr);
  renderer.outputColorSpace = SRGBColorSpace;
  // Neutral preserva o matiz dos azuis; ACES desvia realces para violeta.
  const tone = new URLSearchParams(window.location.search).get("tone");
  renderer.toneMapping = tone === "aces" ? ACESFilmicToneMapping : tone === "agx" ? AgXToneMapping : NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const env = createStudioEnvironment(renderer);
  scene.environment = env.texture;

  // Luz de recorte fria vinda de trás/direita, como a fonte junto à figura.
  const key = new DirectionalLight(0xbfe4ff, 0.9);
  key.position.set(5, 3, -2);
  scene.add(key);
  // Luz superior frontal: realces ciano nas faces voltadas para cima.
  const top = new DirectionalLight(0xd8f4ff, 0.45);
  top.position.set(2, 6, 4);
  scene.add(top);

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.set(0, 0, CAMERA_Z);

  const params = new URLSearchParams(window.location.search);
  const useKnot = params.get("geo") === "knot";
  const uniforms = createSculptureUniforms();
  // ?forma=v32 | a | b — variantes da escultura preservadas para comparação.
  const formParam = params.get("forma");
  const form = isFormName(formParam) ? formParam : DEFAULT_FORM;
  const blender = opts.sculpture ? buildFromBlender(opts.sculpture) : null;
  const monument = useKnot ? null : (blender ?? createMonumentGeometry(profile.geometry, form));
  const geometry = monument ? monument.geometry : createSculptureGeometry(profile.geometry);
  // RIB-02/03: onda viajante (?onda=0 desliga); desfiar experimental só com ?fios=1 (em pausa artística).
  const fiber = createFiberNoise();
  uniforms.uFiber.value = fiber;
  uniforms.uFray.value = params.get("fios") === "1" ? 1 : 0;
  const waves =
    monument && params.get("onda") !== "0"
      ? new WaveDirector(monument.lengths, MAIN_BAND, uniforms)
      : null;
  if (monument) uniforms.uLen.value = monument.lengths.slice();
  // V2 (lâmina esculpida, faixas largas): onda calibrada para metal, não tecido.
  if (blender && formParam?.startsWith("blender2")) uniforms.uWaveWide.value = 1;
  uniforms.uFloorY.value = FLOOR_LOCAL;
  // Metal premium: padrão na Blender V2 (?metal=v1 volta ao anterior); ?metal=v2 testa nas outras formas.
  const metalParam = params.get("metal");
  const premium = metalParam === "v2" || (metalParam !== "v1" && Boolean(formParam?.startsWith("blender2")));
  // Acabamento V2.2 nas formas V2.2 em diante (V2.1 B e anteriores ficam como estavam).
  // A tinta azul/teal/prata é cor de metal: na argila (?clay) fica desligada para julgar só a forma.
  const tinted = !params.has("clay");
  const material = createSculptureMaterial(uniforms, {
    premium,
    finish22: /^blender2-v2[2-9]/.test(formParam ?? ""),
    tint23: tinted && /^blender2-v2[3-9]/.test(formParam ?? ""),
    tint23r: tinted && formParam === "blender2-v23r",
    edgeAA: formParam === "blender2-v23r",
    view: params.get("vista"),
  });
  const premiumEnv = premium ? createPremiumEnvironment(renderer) : null;
  if (premiumEnv) material.envMap = premiumEnv.texture;
  // Lâmina com espessura é um sólido fechado: só as faces externas (metade do preenchimento).
  if (monument && monument.profile !== "sheet") material.side = params.get("lado") === "tras" ? BackSide : FrontSide;
  // Depuração (?vista=faces): frente verde, trás vermelho — os dois lados desenhados.
  if (params.get("vista") === "faces") material.side = DoubleSide;
  // ?clay: material neutro para julgar só a forma (sem cor, metal nem brilho de borda).
  const clay = params.has("clay");
  if (clay) {
    material.metalness = 0.05;
    material.roughness = 0.62;
    material.clearcoat = 0;
    material.anisotropy = 0;
    material.envMapIntensity = 0.9;
    uniforms.uRim.value.setRGB(0, 0, 0);
    paintClay(geometry);
  }
  const mesh = new Mesh(geometry, material);
  const rest = useKnot ? REST_KNOT : REST_MONUMENT;
  const pose = params.get("pose")?.split(",").map(Number);
  if (pose && pose.length === 3 && pose.every(Number.isFinite)) mesh.rotation.set(pose[0]!, pose[1]!, pose[2]!);
  else mesh.rotation.set(rest.x, rest.y, rest.z);
  mesh.frustumCulled = false;
  const waveDebug = waves && monument && params.has("ondadebug") ? createWaveDebug(waves, monument.curves[MAIN_BAND]!, mesh) : null;
  let holdWaves = false;
  const gestureDebug =
    monument && !blender && params.has("gestos")
      ? createGestureDebug(monument.curves[MAIN_BAND]!, FORMS[form].ribbons[MAIN_BAND]!.points.length, FORMS[form].gestures, mesh)
      : null;

  // Hierarquia de donos únicos: scroll > interação > ambiente > malha.
  const scrollRig = new Group();
  const interactionRig = new Group();
  const idleRig = new Group();
  idleRig.add(mesh);
  interactionRig.add(idleRig);
  scrollRig.add(interactionRig);
  scene.add(scrollRig);

  // Caixa real já com a pose de repouso (espaço do scrollRig).
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(mesh);
  const sculptureW = box.max.x - box.min.x;
  const sculptureCx = (box.min.x + box.max.x) / 2;
  const floorLocal = useKnot ? box.min.y - 0.35 : FLOOR_LOCAL;

  // Cenário (chão, trilhas, figura, luz de fundo) — irmão da escultura, não gira com o arraste.
  // Em telas estreitas o chão fica sob o texto: sem reflexo ali.
  // Tela estreita (piso sob o texto): reavaliada a cada redimensionamento. Os recursos
  // de reflexo são criados sempre que o tier permite e só ligam/desligam com a largura —
  // decidir isso uma vez na carga congelava a cena no modo celular se a janela abrisse estreita.
  const isCompact = () => window.innerWidth < 1024;
  let compact = isCompact();
  const reflections = profile.reflections && !useKnot;
  const reflectionGeometry =
    reflections && blender
      ? blender.geometry
      : reflections
      ? createMonumentGeometry({ segments: Math.round(profile.geometry.segments / 2), across: Math.max(4, Math.round(profile.geometry.across / 2)) }, form).geometry
      : null;
  if (clay && reflectionGeometry) paintClay(reflectionGeometry);
  const set = createSculptureSet(
    {
      floorY: floorLocal,
      bounds: { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, height: box.max.y - floorLocal },
      reflections,
      person: useKnot ? null : PERSON_LOCAL,
      reducedMotion,
      camera,
      // ?ambiente=v1: piso e reflexo anteriores (comparação).
      cinematic: params.get("ambiente") !== "v1",
      sculpture: mesh,
      compact,
      // Ciclo 02 (piso e reflexos): padrão na V2.3, a referência artística; as outras formas
      // ficam como estavam. ?piso=c02 liga em qualquer forma, ?piso=atual desliga.
      floorC02: params.get("piso") === "c02" || (params.get("piso") !== "atual" && formParam === "blender2-v23"),
    },
    reflectionGeometry ? { geometry: reflectionGeometry, material } : null,
  );
  scrollRig.add(set.group);
  set.setCompact(compact);
  const trailSvg = document.querySelector<SVGSVGElement>("svg[data-floor-trails]");
  let trailsDirty = true;
  // Ambiente v1: reflexos na cena principal. Cinematográfico: já estão na cena do reflexo do piso.
  if (set.reflection && !set.reflection.parent) scene.add(set.reflection);
  if (set.figureReflection && !set.figureReflection.parent) scene.add(set.figureReflection);

  const interaction = new InteractionController(
    stage,
    useKnot ? undefined : { followXDeg: 1.5, followYDeg: 7, pitchLimitDeg: 4, yawLimitDeg: 20 },
  );
  interaction.setEnabled(!reducedMotion);
  const timeline = new ScrollTimeline(rule);

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const hit = new Vector3();
  const inverse = new Matrix4();

  // --- Toque local (RIB-004): raycast na superfície média da fita (proxy leve) ---
  // O ponto tocado é a passagem visível mais próxima; a reação vive no espaço da fita
  // (arco × largura), com massa: alvo suavizado (resistência inicial) → mola pouco
  // subamortecida (recuperação elástica) → pulsos que correm pela fita quando o cursor
  // a varre rápido. Tudo em tempo real (molas com subpassos fixos: 30/60/120 Hz iguais).
  // DoubleSide: a fita gira e mostra as duas faces — com um lado só, o raycast ignorava metade.
  const proxy = monument?.proxy ? new Mesh(monument.proxy, new MeshBasicMaterial({ side: DoubleSide })) : null;
  if (proxy) {
    proxy.matrixAutoUpdate = false;
    proxy.matrixWorldAutoUpdate = false;
  }
  const poke = createSpring(42, 0.55);
  let pokeDrive = 0;
  let pokeU = 0;
  let pokeV = 0;
  let pokeHasPoint = false;
  let over = false;
  let lastPulse = -10;
  const pulses = [
    { u: 0, t: 0, a: 0 },
    { u: 0, t: 0, a: 0 },
  ];
  const rayHits: Array<{ uv?: Vector2 }> = [];
  const castProxy = (x: number, y: number) => {
    if (!proxy) return null;
    ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    proxy.matrixWorld.copy(mesh.matrixWorld);
    rayHits.length = 0;
    raycaster.intersectObject(proxy, false, rayHits as never);
    return rayHits[0] ?? null;
  };
  if (proxy) interaction.canGrab = (x, y) => castProxy(x, y) !== null;

  let width = 0;
  let height = 0;
  let worldPerPx = 1;
  // Retângulo do palco em coordenadas de documento (independe do scroll).
  const stageDoc = { cx: 0, cy: 0, w: 0, h: 0 };
  /** Deslocamento do horizonte em px (lens shift); toda conversão tela→mundo usa o mesmo valor. */
  let horizonShift = 0;
  /** Fração do scroll que o palco acompanha (parallax). */
  let stageParallax = 0.42;
  const worldX = (sx: number) => (sx - width / 2) * worldPerPx;
  const worldY = (sy: number) => -(sy - height / 2 - horizonShift) * worldPerPx;

  function layout(): void {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    worldPerPx = (2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360)) / height;
    const r = stage.getBoundingClientRect();
    stageDoc.cx = r.left + r.width / 2;
    stageDoc.cy = r.top + window.scrollY + r.height / 2;
    stageDoc.w = r.width;
    stageDoc.h = r.height;
    // Layout empilhado: texto e faixa ficam abaixo do palco. A peça rola junto com o palco
    // (sem parallax, que a arrastava para trás do texto) e a transição só começa quando o
    // fim do hero já subiu até perto do meio da tela — antes, CTAs e faixa sumiam antes de serem lidos.
    const stacked = window.innerWidth < 1024;
    const heroEl = stage.closest("section");
    const heroBottom = heroEl ? heroEl.getBoundingClientRect().bottom + window.scrollY : 0;
    timeline.start = stacked ? Math.max(0, heroBottom - height * 0.45) : 0;
    stageParallax = stacked ? 1 : 0.42;
  }

  let paused = false;
  let running = true;
  let lost = false;
  let readySent = false;
  let idleTime = 0;
  let last = performance.now();
  let fpsAcc = 0;
  let fpsFrames = 0;
  let fps = 0;
  let raf = 0;
  const root = document.documentElement;
  const debug = new URLSearchParams(window.location.search).has("debug");
  let lastHeroOut = -1;
  let lastHandoff = -1;

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    const dtMs = now - last;
    last = now;
    const dt = Math.min(dtMs / 1000, 0.1);

    timeline.measure();
    const t = timeline.update(dt, reducedMotion);

    // Variáveis de CSS só quando mudam (evita estilo por quadro à toa).
    const heroOut = reducedMotion ? 0 : Math.round(t.recompose * 1000) / 1000;
    if (heroOut !== lastHeroOut) {
      root.style.setProperty("--hero-out", String(heroOut));
      lastHeroOut = heroOut;
    }
    const handoff = reducedMotion ? 1 : Math.round(t.handoff * 1000) / 1000;
    if (handoff !== lastHandoff) {
      root.style.setProperty("--flow-handoff", String(handoff));
      lastHandoff = handoff;
    }

    const canvasOpacity = reducedMotion ? 1 - Math.min(1, t.progress * 2.5) : 1 - t.handoff;
    canvas.style.opacity = readySent ? String(canvasOpacity) : "0";
    if (canvasOpacity <= 0.001 && readySent) return; // nada visível: não renderiza

    if (!paused && !reducedMotion) idleTime += dt;
    uniforms.uTime.value = idleTime;

    const heroW = reducedMotion ? 0 : t.heroWeight;
    updateIdle(idleRig, uniforms, idleTime, paused || reducedMotion ? 0 : heroW);
    interaction.update(dt, interactionRig, heroW);
    set.update(dt, heroW, paused);
    waves?.update(dt, reducedMotion ? 0 : heroW, paused || reducedMotion || holdWaves);
    waveDebug?.update(dt);

    // --- Recomposição pelo scroll (dono: scrollRig) ---
    const motion = reducedMotion ? 0 : 1;
    const scrollY = window.scrollY;
    const k = t.recompose * motion;
    // Parallax: o palco sobe mais devagar que a página.
    const stageCy = stageDoc.cy - scrollY * (motion ? stageParallax : 1);
    const stageBottom = stageCy + stageDoc.h / 2;
    // Layout empilhado: quando a transição começa o palco já saiu por cima e o texto ainda
    // está na tela. Vindo de cima, a peça atravessaria o conteúdo; ela entra por baixo,
    // depois da faixa. A troca de trajeto acontece com a peça fora da tela nos dois lados.
    const rise = motion === 1 && k > 0 && stageParallax === 1 && stageDoc.cy + stageDoc.h / 2 < timeline.startScroll;
    // Horizonte na altura dos olhos, pouco acima da base (lens shift, sem inclinar a câmera).
    // Na subida o eixo fica no centro: com o palco longe, acima, a peça seria vista em viés.
    horizonShift = rise ? 0 : stageBottom - stageDoc.h * HORIZON_ABOVE_BASE - height / 2;
    camera.setViewOffset(width, height, 0, -horizonShift, width, height);

    const fit = Math.min(stageDoc.w / sculptureW, stageDoc.h / (box.max.y - floorLocal)) * worldPerPx;
    const scale = fit * (1 - 0.42 * k);
    if (rise) {
      const fromCy = height + stageDoc.h * 0.6;
      const cy = fromCy + (height * 0.42 - fromCy) * k;
      scrollRig.position.set(worldX(width / 2) - sculptureCx * scale, worldY(cy) - ((box.max.y + floorLocal) / 2) * scale, 0);
    } else {
      // Estado 01: base da escultura apoiada na base do palco, centrada na horizontal.
      const restX = worldX(stageDoc.cx) - sculptureCx * fit;
      const restY = worldY(stageBottom) - floorLocal * fit;
      // Estados 03–04: migra para o centro superior da tela.
      const dx = (width * 0.5 - stageDoc.cx) * k * worldPerPx;
      const dy = -(height * 0.3 - stageCy) * k * 0.75 * worldPerPx;
      scrollRig.position.set(restX + dx, restY + dy, 0);
    }
    scrollRig.scale.setScalar(scale);
    scrollRig.rotation.set(0.38 * k, 1.1 * k, -0.12 * k);
    // O cenário só faz sentido com a peça em repouso: sai logo no início da rolagem.
    set.setOpacity(rise ? 0 : motion ? 1 - Math.min(1, k / 0.22) : 1);

    // --- Fluxos (estado 04/05): alvo em coordenadas de mundo ---
    const margin = Math.max(20, Math.min(96, width * 0.066));
    uniforms.uFlow.value = t.flow * motion;
    uniforms.uFlowLeft.value = (margin - width / 2) * worldPerPx;
    uniforms.uFlowRight.value = (width - margin - width / 2) * worldPerPx;
    uniforms.uFlowY.value = worldY(t.ruleViewportY);
    uniforms.uFlowGap.value = 7 * worldPerPx;
    uniforms.uFlowHalf.value = 0.9 * worldPerPx;

    // --- Reação local ao cursor ---
    scene.updateMatrixWorld();
    if (proxy) {
      const live = !reducedMotion && !paused && heroW > 0.01;
      // O cursor contextual vale também pausado (o arraste continua disponível); só a deformação para.
      const hov = !reducedMotion && heroW > 0.01 && interaction.isHovering && interaction.pointerX >= 0 ? castProxy(interaction.pointerX, interaction.pointerY) : null;
      const h = live ? hov : null;
      const nowOver = hov !== null || interaction.isDragging;
      if (nowOver !== over) {
        over = nowOver;
        if (over) stage.dataset.over = "true";
        else delete stage.dataset.over;
      }
      if (h?.uv) {
        // Arco periódico: segue pelo caminho mais curto (sem saltar na emenda).
        const u = h.uv.x - Math.floor(h.uv.x);
        if (!pokeHasPoint) {
          pokeU = u;
          pokeV = h.uv.y;
        }
        let du = u - pokeU;
        du -= Math.round(du);
        pokeU = (pokeU + du * (1 - Math.exp(-14 * dt)) + 1) % 1;
        pokeV = damp(pokeV, h.uv.y, 14, dt);
        pokeHasPoint = true;
        uniforms.uPokeDir.value.copy(raycaster.ray.direction).transformDirection(inverse.copy(mesh.matrixWorld).invert());
      }
      const speed = interaction.pointerSpeed;
      // Cursor parado sobre a lâmina: amassado pequeno; varrendo: mais fundo (limitado).
      const target = h ? 0.22 + 0.78 * Math.min(1, speed / 1400) : 0;
      pokeDrive = damp(pokeDrive, target, 7, dt);
      poke.target = pokeDrive;
      stepSpring(poke, dt);
      if (h && speed > 700 && idleTime - lastPulse > 0.45) {
        const slot = pulses[0]!.t > pulses[1]!.t ? pulses[0]! : pulses[1]!;
        Object.assign(slot, { u: pokeU, t: 0, a: Math.min(1, speed / 2600) * 0.018 });
        lastPulse = idleTime;
      }
      pulses.forEach((p, i) => {
        p.t += live ? dt : 0;
        const amp = live && p.t < 2.6 ? p.a * Math.exp(-1.7 * p.t) : 0;
        uniforms.uPulse.value[i]!.set(p.u, p.t, amp, 0);
      });
      uniforms.uPokeU.value = pokeU;
      uniforms.uPokeV.value = pokeV;
      uniforms.uPokeAmt.value = live ? poke.value * 0.05 * heroW : 0;
      uniforms.uPointerAmt.value = 0;
    } else if (interaction.pointerX >= 0) {
      ndc.set((interaction.pointerX / width) * 2 - 1, -(interaction.pointerY / height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      plane.constant = -scrollRig.position.z;
      if (raycaster.ray.intersectPlane(plane, hit)) {
        inverse.copy(mesh.matrixWorld).invert();
        uniforms.uPointer.value.copy(hit).applyMatrix4(inverse);
      }
    }
    if (!proxy) {
      uniforms.uPointerAmt.value = interaction.presence.value * (reducedMotion ? 0 : 1);
      // Formas sem proxy (forma C e demais): o palco inteiro continua arrastável, como antes.
      const nowOver = (!reducedMotion && interaction.isHovering) || interaction.isDragging;
      if (nowOver !== over) {
        over = nowOver;
        if (over) stage.dataset.over = "true";
        else delete stage.dataset.over;
      }
    }
    set.syncReflection(mesh.matrixWorld, scrollRig.position.y + floorLocal * scale);
    // Trilhas do piso: projetadas com a peça em repouso (no início e depois de redimensionar).
    if (trailsDirty && k === 0 && trailSvg && !compact) {
      set.layoutTrails(trailSvg, width, height);
      trailsDirty = false;
    }

    set.renderEnvironment(renderer, camera);
    renderer.render(scene, camera);

    if (!readySent) {
      readySent = true;
      opts.onReady();
    }

    if (adaptive.record(dtMs)) renderer.setPixelRatio(adaptive.dpr);
    fpsAcc += dtMs;
    fpsFrames++;
    if (fpsAcc >= 500) {
      fps = Math.round((fpsFrames * 1000) / fpsAcc);
      fpsAcc = 0;
      fpsFrames = 0;
      if (debug && opts.onStats) opts.onStats({ tier: profile.tier, dpr: adaptive.dpr, fps, progress: t.progress });
    }
  }

  const onResize = () => {
    layout();
    const nextCompact = isCompact();
    // Sempre: dentro do layout empilhado a faixa com reflexo também depende da largura.
    set.setCompact(nextCompact);
    if (nextCompact !== compact) {
      compact = nextCompact;
      // Volta ao SVG em tela estreita (o CSS do celular o esconde); larga: o 3D reprojeta.
      if (compact && trailSvg) trailSvg.style.display = "";
    }
    trailsDirty = true;
  };
  window.addEventListener("resize", onResize, { passive: true });

  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (running && !lost) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    opts.onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onLost);

  layout();
  raf = requestAnimationFrame(frame);

  if (debug) {
    // Custo real de GPU por quadro, independente do rAF (que o navegador pode estrangular).
    (window as unknown as { __fiorbe?: unknown }).__fiorbe = {
      figure: () => set.probe(),
      floor: () => ({ ...(set.floor?.material.userData ?? {}), svgHidden: trailSvg?.style.display === "none" }),
      /** x da parede de luz (relativo ao centro dela, na linha do chão) → pixel CSS na tela. */
      wallToScreen(xs: number[], up = 0) {
        const fm = set.floor?.material;
        if (!fm) return [];
        const [wx, wz] = fm.uniforms.uWall!.value as number[];
        const fy = fm.uniforms.uFloorY!.value as number;
        set.group.updateWorldMatrix(true, false);
        return xs.map((x) => {
          const v = new Vector3(wx! + x, fy + up, wz!).applyMatrix4(set.group.matrixWorld).project(camera);
          return [Math.round((v.x * 0.5 + 0.5) * window.innerWidth), Math.round((0.5 - v.y * 0.5) * window.innerHeight)];
        });
      },
      waves: () => waves?.snapshot() ?? [],
      /** Congela só as ondas e avança o tempo delas (capturas determinísticas). */
      holdWaves(hold: boolean) {
        holdWaves = hold;
      },
      /** Congela o movimento ambiente sem mexer no botão de pausa (capturas comparáveis). */
      freeze(on: boolean, at = 2) {
        paused = on;
        if (on) idleTime = at;
      },
      stepWaves(seconds: number) {
        waves?.advance(seconds);
      },
      seekLap(fraction: number) {
        waves?.seekLap(fraction);
      },
      setFray(on: boolean) {
        uniforms.uFray.value = on ? 1 : 0;
      },
      /** CPU por quadro do movimento da figura (mixer + molas + IK), em ms. */
      figureCpu(iterations = 300) {
        const t0 = performance.now();
        for (let i = 0; i < iterations; i++) set.update(1 / 60, 1, false);
        return Math.round(((performance.now() - t0) / iterations) * 1000) / 1000;
      },
      bench(frames = 120) {
        // readPixels de 1 px força a GPU a concluir cada quadro (gl.finish não bloqueia no ANGLE).
        const gl = renderer.getContext();
        const px = new Uint8Array(4);
        const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        set.renderEnvironment(renderer, camera);
        renderer.render(scene, camera);
        sync();
        const t0 = performance.now();
        for (let i = 0; i < frames; i++) {
          uniforms.uTime.value += 1 / 60;
          set.renderEnvironment(renderer, camera);
          renderer.render(scene, camera);
          sync();
        }
        const ms = (performance.now() - t0) / frames;
        return {
          msPerFrame: Math.round(ms * 100) / 100,
          tier: profile.tier,
          dpr: renderer.getPixelRatio(),
          drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
          triangles: renderer.info.render.triangles,
          calls: renderer.info.render.calls,
        };
      },
    };
  }

  return {
    setPaused(p: boolean) {
      paused = p;
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      interaction.dispose();
      geometry.dispose();
      if (reflectionGeometry !== geometry) reflectionGeometry?.dispose();
      set.dispose();
      if (trailSvg) trailSvg.style.display = "";
      material.dispose();
      fiber.dispose();
      waveDebug?.dispose();
      gestureDebug?.dispose();
      env.dispose();
      premiumEnv?.dispose();
      renderer.dispose();
      root.style.removeProperty("--hero-out");
      root.style.removeProperty("--flow-handoff");
    },
  };
}

/** Cor única de argila em todos os vértices (só para avaliação da forma). */
function paintClay(geometry: BufferGeometry): void {
  const color = geometry.getAttribute("color");
  if (!color) return;
  for (let i = 0; i < color.count; i++) color.setXYZ(i, 0.62, 0.64, 0.67);
  color.needsUpdate = true;
}
