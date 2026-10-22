import {
  ACESFilmicToneMapping,
  AgXToneMapping,
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
import { createSculptureMaterial, createSculptureUniforms } from "./sculpture/material";
import { createGrooveTexture } from "./sculpture/textures";
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
/** Pose de repouso: o ângulo que dá a silhueta mais rica ao nó. */
const REST = { x: -0.42, y: 0.38, z: 0.12 };

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
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const env = createStudioEnvironment(renderer);
  scene.environment = env.texture;

  const key = new DirectionalLight(0xdcecff, 1.6);
  key.position.set(3, 4, 5);
  scene.add(key);

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.set(0, 0, CAMERA_Z);

  const uniforms = createSculptureUniforms();
  const grooves = createGrooveTexture();
  const geometry = createSculptureGeometry(profile.geometry);
  const material = createSculptureMaterial(uniforms, grooves);
  const mesh = new Mesh(geometry, material);
  const params = new URLSearchParams(window.location.search);
  const pose = params.get("pose")?.split(",").map(Number);
  if (pose && pose.length === 3 && pose.every(Number.isFinite)) mesh.rotation.set(pose[0]!, pose[1]!, pose[2]!);
  else mesh.rotation.set(REST.x, REST.y, REST.z);
  mesh.frustumCulled = false;

  // Hierarquia de donos únicos: scroll > interação > ambiente > malha.
  const scrollRig = new Group();
  const interactionRig = new Group();
  const idleRig = new Group();
  idleRig.add(mesh);
  interactionRig.add(idleRig);
  scrollRig.add(interactionRig);
  scene.add(scrollRig);

  const box = geometry.boundingBox!;
  const sculptureW = box.max.x - box.min.x;
  const sculptureH = box.max.y - box.min.y;

  const interaction = new InteractionController(stage);
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

    // --- Recomposição pelo scroll (dono: scrollRig) ---
    const motion = reducedMotion ? 0 : 1;
    const scrollY = window.scrollY;
    // A caixa é medida sem rotação; a pose de repouso a projeta menor, daí o fator > 1.
    const fit = Math.min(stageDoc.w / sculptureW, stageDoc.h / sculptureH) * worldPerPx * 1.14;
    const k = t.recompose * motion;
    // Parallax: a peça sobe mais devagar que a página, depois migra ao centro.
    const baseY = stageDoc.cy - scrollY * (motion ? 0.42 : 1);
    const screenX = stageDoc.cx + (width * 0.5 - stageDoc.cx) * k;
    const screenY = baseY + (height * 0.3 - baseY) * k * 0.75;
    scrollRig.position.set((screenX - width / 2) * worldPerPx, -(screenY - height / 2) * worldPerPx, 0);
    scrollRig.scale.setScalar(fit * (1 - 0.42 * k));
    scrollRig.rotation.set(0.38 * k, 1.1 * k, -0.12 * k);

    // --- Fluxos (estado 04/05): alvo em coordenadas de mundo ---
    const margin = Math.max(20, Math.min(96, width * 0.066));
    uniforms.uFlow.value = t.flow * motion;
    uniforms.uFlowLeft.value = (margin - width / 2) * worldPerPx;
    uniforms.uFlowRight.value = (width - margin - width / 2) * worldPerPx;
    uniforms.uFlowY.value = -(t.ruleViewportY - height / 2) * worldPerPx;
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
      material.dispose();
      grooves.dispose();
      env.dispose();
      renderer.dispose();
      root.style.removeProperty("--hero-out");
      root.style.removeProperty("--flow-handoff");
    },
  };
}
