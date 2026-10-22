import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  Box3,
  DirectionalLight,
  NeutralToneMapping,
  Group,
  Matrix4,
  Mesh,
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
import { createMonumentGeometry, FLOOR_LOCAL, PERSON_LOCAL } from "./sculpture/monument";
import { createSculptureSet } from "./scene/set";
import { createSculptureMaterial, createSculptureUniforms } from "./sculpture/material";
import { createFiberNoise, createGrooveTexture } from "./sculpture/textures";
import { computeContacts } from "./sculpture/ribbonSpace";
import { WaveDirector } from "./motion/waveDirector";
import { createStudioEnvironment } from "./scene/environment";
import { updateIdle } from "./motion/idle";
import { InteractionController } from "./motion/interaction";
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
  const grooves = createGrooveTexture();
  const monument = useKnot ? null : createMonumentGeometry(profile.geometry);
  const geometry = monument ? monument.geometry : createSculptureGeometry(profile.geometry);
  // RIB-02/03: onda viajante (?onda=0 desliga) e desfiar experimental (?fios=0 desliga).
  const fiber = createFiberNoise();
  uniforms.uFiber.value = fiber;
  uniforms.uFray.value = params.get("fios") === "0" ? 0 : 1;
  const waves =
    monument && params.get("onda") !== "0"
      ? new WaveDirector(monument.lengths, computeContacts(monument.curves, 0.9), uniforms)
      : null;
  if (monument) uniforms.uLen.value = monument.lengths.slice();
  uniforms.uFloorY.value = FLOOR_LOCAL;
  const material = createSculptureMaterial(uniforms, grooves);
  const mesh = new Mesh(geometry, material);
  const rest = useKnot ? REST_KNOT : REST_MONUMENT;
  const pose = params.get("pose")?.split(",").map(Number);
  if (pose && pose.length === 3 && pose.every(Number.isFinite)) mesh.rotation.set(pose[0]!, pose[1]!, pose[2]!);
  else mesh.rotation.set(rest.x, rest.y, rest.z);
  mesh.frustumCulled = false;

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
  const compact = window.innerWidth < 1024;
  const reflections = profile.reflections && !useKnot && !compact;
  const reflectionGeometry =
    reflections
      ? createMonumentGeometry({ segments: Math.round(profile.geometry.segments / 2), across: Math.max(4, Math.round(profile.geometry.across / 2)) }).geometry
      : null;
  const set = createSculptureSet(
    {
      floorY: floorLocal,
      bounds: { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, height: box.max.y - floorLocal },
      reflections,
      person: useKnot ? null : PERSON_LOCAL,
      reducedMotion,
    },
    reflectionGeometry ? { geometry: reflectionGeometry, material } : null,
  );
  scrollRig.add(set.group);
  if (set.reflection) scene.add(set.reflection);
  if (set.figureReflection) scene.add(set.figureReflection);

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

  let width = 0;
  let height = 0;
  let worldPerPx = 1;
  // Retângulo do palco em coordenadas de documento (independe do scroll).
  const stageDoc = { cx: 0, cy: 0, w: 0, h: 0 };
  /** Deslocamento do horizonte em px (lens shift); toda conversão tela→mundo usa o mesmo valor. */
  let horizonShift = 0;
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
    waves?.update(dt, reducedMotion ? 0 : heroW, paused || reducedMotion);

    // --- Recomposição pelo scroll (dono: scrollRig) ---
    const motion = reducedMotion ? 0 : 1;
    const scrollY = window.scrollY;
    const k = t.recompose * motion;
    // Parallax: o palco sobe mais devagar que a página.
    const stageCy = stageDoc.cy - scrollY * (motion ? 0.42 : 1);
    const stageBottom = stageCy + stageDoc.h / 2;
    // Horizonte na altura dos olhos, pouco acima da base (lens shift, sem inclinar a câmera).
    horizonShift = stageBottom - stageDoc.h * HORIZON_ABOVE_BASE - height / 2;
    camera.setViewOffset(width, height, 0, -horizonShift, width, height);

    const fit = Math.min(stageDoc.w / sculptureW, stageDoc.h / (box.max.y - floorLocal)) * worldPerPx;
    const scale = fit * (1 - 0.42 * k);
    // Estado 01: base da escultura apoiada na base do palco, centrada na horizontal.
    const restX = worldX(stageDoc.cx) - sculptureCx * fit;
    const restY = worldY(stageBottom) - floorLocal * fit;
    // Estados 03–04: migra para o centro superior da tela.
    const dx = (width * 0.5 - stageDoc.cx) * k * worldPerPx;
    const dy = -(height * 0.3 - stageCy) * k * 0.75 * worldPerPx;
    scrollRig.position.set(restX + dx, restY + dy, 0);
    scrollRig.scale.setScalar(scale);
    scrollRig.rotation.set(0.38 * k, 1.1 * k, -0.12 * k);
    // O cenário só faz sentido com a peça em repouso: sai logo no início da rolagem.
    set.setOpacity(motion ? 1 - Math.min(1, k / 0.22) : 1);

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
    if (interaction.pointerX >= 0) {
      ndc.set((interaction.pointerX / width) * 2 - 1, -(interaction.pointerY / height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      plane.constant = -scrollRig.position.z;
      if (raycaster.ray.intersectPlane(plane, hit)) {
        inverse.copy(mesh.matrixWorld).invert();
        uniforms.uPointer.value.copy(hit).applyMatrix4(inverse);
      }
    }
    uniforms.uPointerAmt.value = interaction.presence.value * (reducedMotion ? 0 : 1);
    set.syncReflection(mesh.matrixWorld, scrollRig.position.y + floorLocal * scale);

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

  const onResize = () => layout();
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
      waves: () => waves?.snapshot() ?? [],
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
        renderer.render(scene, camera);
        sync();
        const t0 = performance.now();
        for (let i = 0; i < frames; i++) {
          uniforms.uTime.value += 1 / 60;
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
      reflectionGeometry?.dispose();
      set.dispose();
      material.dispose();
      grooves.dispose();
      fiber.dispose();
      env.dispose();
      renderer.dispose();
      root.style.removeProperty("--hero-out");
      root.style.removeProperty("--flow-handoff");
    },
  };
}
