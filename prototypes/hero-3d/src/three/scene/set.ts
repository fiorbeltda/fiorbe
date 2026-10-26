import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  DetachedBindMode,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Plane,
  PlaneGeometry,
  Raycaster,
  SkinnedMesh,
  Vector2,
  SRGBColorSpace,
  Vector3,
  type Camera,
  type Material,
  type WebGLRenderer,
} from "three";
import { createFigureRig } from "../figure/figureRig";
import { FigureMotion } from "../figure/figureMotion";
import { CORE_X, createBacklight } from "./backlight";
import { createCinematicFloor, type CinematicFloor } from "./floor";

/**
 * Cenário da abertura: chão escuro com reflexo controlado, figura humana para dar escala monumental e luz de fundo junto a ela.
 * Tudo no espaço local da escultura (mesma escala); a escultura não é dona
 * deste grupo — o cenário não gira com o arraste.
 */
export interface SetOptions {
  floorY: number;
  /** Limites da escultura no espaço local. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; height: number };
  reflections: boolean;
  /** Posição da figura no espaço local; null = posição derivada dos limites. */
  person: Vector3 | null;
  reducedMotion: boolean;
  /** Câmera (os reflexos das colunas no piso apontam para ela). */
  camera?: Camera;
  /** Ambiente cinematográfico (piso molhado com reflexo desfocado, sombras, trilhas no piso). false = ambiente v1. */
  cinematic?: boolean;
  /** Malha da escultura (pegada para sombra e oclusão do piso cinematográfico). */
  sculpture?: Mesh;
  /** Tela estreita (piso sob o texto). */
  compact?: boolean;
  /** Acabamento do piso do Ciclo 02 (reflexo em traços verticais, Fresnel estável, trilhas filtradas). */
  floorC02?: boolean;
  /** Figura do Ciclo 03 (silhueta, contrapposto, contraluz, sombra de contato e reflexo que esmaece). */
  figureC03?: boolean;
  /** Arquitetura de luz do Ciclo 05. */
  lightC05?: boolean;
}

export interface SculptureSet {
  group: Group;
  /** Atualiza o reflexo a partir da matriz de mundo da escultura. */
  syncReflection(sculptureWorld: Matrix4, floorWorldY: number): void;
  /** Movimento da figura (dt real); weight 0..1, paused congela. */
  update(dt: number, weight: number, paused: boolean): void;
  figureReflection: SkinnedMesh | null;
  /** Debug: posições de mundo de pés, quadril e cabeça. */
  probe(): Record<string, unknown>;
  setOpacity(alpha: number): void;
  reflection: Mesh | null;
  /** Piso cinematográfico (null no ambiente v1). */
  floor: CinematicFloor | null;
  /** Passes do piso antes do render principal: reflexo e pegada da escultura. */
  renderEnvironment(renderer: WebGLRenderer, camera: Camera): void;
  /**
   * Projeta as trilhas do SVG (coordenadas de tela do hero) no plano do chão e as
   * pinta no piso; esconde o SVG. Chamar com a peça em repouso. false = sem piso cinematográfico.
   */
  layoutTrails(svg: SVGSVGElement, viewportW: number, viewportH: number): boolean;
  /** Tela estreita ↔ larga em tempo real (reflexos, piso e trilhas acompanham). */
  setCompact(compact: boolean): void;
  dispose(): void;
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = false): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  return t;
}

function radialTexture(stops: Array<[number, string]>): CanvasTexture {
  return canvasTexture(256, 256, (g) => {
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, c]) => grad.addColorStop(o, c));
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  });
}

export function createSculptureSet(opts: SetOptions, reflectionSource: { geometry: BufferGeometry; material: Material } | null): SculptureSet {
  const { floorY: F, bounds } = opts;
  const group = new Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const fadeables: Array<{ material: { opacity: number }; base: number }> = [];
  const track = <M extends MeshBasicMaterial | MeshStandardMaterial>(m: M, base: number) => {
    fadeables.push({ material: m, base });
    disposables.push(m);
    return m;
  };

  const cinematic = opts.cinematic !== false;
  // --- Chão v1: escuro, levemente metálico, some nas bordas ---
  if (!cinematic) {
    const floorAlpha = canvasTexture(256, 256, (g) => {
      const grad = g.createRadialGradient(128, 110, 10, 128, 128, 128);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.55, "#bdbdbd");
      grad.addColorStop(1, "#000000");
      g.fillStyle = grad;
      g.fillRect(0, 0, 256, 256);
    });
    disposables.push(floorAlpha);
    const floorMat = track(
      new MeshStandardMaterial({
        color: new Color("#03070f"),
        roughness: 0.3,
        metalness: 0.75,
        envMapIntensity: 0.55,
        transparent: true,
        opacity: opts.reflections ? 0.9 : 0.96,
        alphaMap: floorAlpha,
        depthWrite: false,
      }),
      opts.reflections ? 0.9 : 0.96,
    );
    const floorGeo = new PlaneGeometry(64, 40);
    disposables.push(floorGeo);
    const floor = new Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((bounds.minX + bounds.maxX) / 2, F, 6);
    floor.renderOrder = 1;
    group.add(floor);
  }

  // --- Arquitetura de luz atrás da escultura, contraluz da figura e luz no chão ---
  const px = opts.person?.x ?? bounds.maxX * 0.93;
  const pz = opts.person?.z ?? bounds.maxZ * 1.05;
  const personH = bounds.height * 0.145;
  const backlight = createBacklight({
    px,
    pz,
    floorY: F,
    height: bounds.height,
    personH,
    wallZ: bounds.minZ - 0.8,
    // Centro da parede: do meio da escultura para a direita (compensa a paralaxe da profundidade).
    wallX: (bounds.minX + bounds.maxX) / 2 + (bounds.maxX - bounds.minX) * 0.22,
    camera: opts.camera ?? null,
    reducedMotion: opts.reducedMotion,
    floorLight: !cinematic,
    c05: opts.lightC05,
  });
  disposables.push(backlight);
  backlight.fadeables.forEach((material) => fadeables.push({ material, base: 1 }));
  group.add(backlight.group);
  const glowGeo = new PlaneGeometry(1, 1);
  disposables.push(glowGeo);

  // --- Figura humana com esqueleto (≈14,5% da altura da escultura, como na referência) ---
  const c03 = Boolean(opts.figureC03);
  const rig = createFigureRig({ c03 });
  disposables.push(rig.geometry, rig.material);
  rig.root.scale.setScalar(personH);
  rig.root.position.set(px, F, pz);
  // De costas para a câmera, girada em direção ao centro da escultura.
  rig.root.rotation.y = 0.42;
  group.add(rig.root);
  const figureMotion = new FigureMotion(rig, opts.reducedMotion, c03);

  // Sombra de contato sob os pés.
  const contactTex = radialTexture([
    [0, "rgba(255,255,255,1)"],
    [0.5, "rgba(255,255,255,0.45)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  disposables.push(contactTex);
  // Ciclo 03: a elipse larga (≈ 3 pés) virava, na vista rasante, uma linha escura comprida que
  // lia como risco. Agora justa sob os pés e mais densa no centro: ancora sem desenhar.
  const contactAlpha = c03 ? 0.85 : 0.75;
  const contactMat = track(new MeshBasicMaterial({ color: 0x000000, alphaMap: contactTex, transparent: true, opacity: contactAlpha, depthWrite: false }), contactAlpha);
  const contact = new Mesh(glowGeo, contactMat);
  contact.rotation.x = -Math.PI / 2;
  if (c03) contact.scale.set(personH * 0.18, personH * 0.2, 1);
  else contact.scale.set(personH * 0.42, personH * 0.22, 1);
  contact.position.set(px, F + 0.002, pz);
  contact.renderOrder = 2;
  group.add(contact);

  // Esmaecimento do reflexo da figura (Ciclo 03): linha do chão e altura da figura, em mundo.
  const figReflUniforms = { uFigFloorY: { value: 0 }, uFigLen: { value: 1 } };
  const headWorld = new Vector3();

  // Reflexo da figura: mesma geometria e MESMO esqueleto, espelhado no chão.
  let figureReflection: SkinnedMesh | null = null;
  if (opts.reflections) {
    // No piso cinematográfico a silhueta refletida precisa tapar a luz de fundo refletida.
    const reflAlpha = cinematic ? (c03 ? 1 : 0.95) : 0.6;
    const reflMat = track(new MeshBasicMaterial({ color: new Color("#04070e"), transparent: true, opacity: reflAlpha, depthWrite: false }), reflAlpha);
    // Ciclo 03: o reflexo era uma silhueta de opacidade constante até a cabeça. Denso junto aos
    // pés e esmaecendo com a distância deles (a superfície molhada não devolve tudo).
    if (c03) {
      reflMat.onBeforeCompile = (shader) => {
        shader.uniforms.uFigFloorY = figReflUniforms.uFigFloorY;
        shader.uniforms.uFigLen = figReflUniforms.uFigLen;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nvarying float vFigY;")
          .replace("#include <project_vertex>", "#include <project_vertex>\nvFigY = (modelMatrix * vec4(transformed, 1.0)).y;");
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying float vFigY;\nuniform float uFigFloorY;\nuniform float uFigLen;")
          .replace(
            "#include <opaque_fragment>",
            "diffuseColor.a *= mix(1.0, 0.6, smoothstep(0.2, 1.0, (uFigFloorY - vFigY) / max(uFigLen, 1e-4)));\n#include <opaque_fragment>",
          );
      };
      reflMat.customProgramCacheKey = () => "fiorbe-figure-refl-c03";
    }
    figureReflection = new SkinnedMesh(rig.geometry, reflMat);
    figureReflection.bindMode = DetachedBindMode;
    figureReflection.bind(rig.skeleton, new Matrix4());
    figureReflection.matrixAutoUpdate = false;
    figureReflection.matrixWorldAutoUpdate = false;
    figureReflection.frustumCulled = false;
    // Depois da poça de luz: silhueta escura refletida sobre o piso iluminado.
    figureReflection.renderOrder = 3;
  }

  // --- Reflexo da escultura: a própria malha espelhada sob o chão ---
  let reflection: Mesh | null = null;
  const mirrorMatrix = new Matrix4();
  if (opts.reflections && reflectionSource) {
    reflection = new Mesh(reflectionSource.geometry, reflectionSource.material);
    reflection.matrixAutoUpdate = false;
    reflection.matrixWorldAutoUpdate = false;
    reflection.frustumCulled = false;
    reflection.renderOrder = 0;
  }

  // --- Piso cinematográfico: o reflexo vai para um alvo próprio (meia resolução) ---
  let floor: CinematicFloor | null = null;
  const mirrored: Array<{ src: Mesh; dst: Mesh }> = [];
  if (cinematic) {
    floor = createCinematicFloor({
      floorY: F,
      bounds,
      wallX: (bounds.minX + bounds.maxX) / 2 + (bounds.maxX - bounds.minX) * 0.22,
      wallZ: bounds.minZ - 0.8,
      coreX: CORE_X,
      px,
      pz,
      personH,
      reflections: opts.reflections,
      compact: opts.compact,
      c02: opts.floorC02,
    });
    disposables.push(floor);
    const fm = floor.material;
    fadeables.push({
      material: {
        get opacity() {
          return fm.uniforms.uOpacity!.value as number;
        },
        set opacity(v: number) {
          fm.uniforms.uOpacity!.value = v;
        },
      },
      base: 1,
    });
    group.add(floor.mesh);
    if (opts.reflections) {
      if (reflection) floor.reflScene.add(reflection);
      if (figureReflection) floor.reflScene.add(figureReflection);
      for (const src of backlight.mirrorSources) {
        const dst = new Mesh(src.geometry, src.material);
        dst.matrixAutoUpdate = false;
        dst.matrixWorldAutoUpdate = false;
        dst.frustumCulled = false;
        dst.renderOrder = src.renderOrder;
        floor.reflScene.add(dst);
        mirrored.push({ src, dst });
      }
    }
  }

  return {
    group,
    reflection,
    figureReflection,
    floor,
    renderEnvironment(renderer, camera) {
      floor?.render(renderer, camera, group.matrixWorld, opts.sculpture ?? null);
    },
    setCompact(next) {
      floor?.setCompact(next);
      // Ambiente v1: os reflexos ficam na cena principal.
      if (!floor) {
        if (reflection) reflection.userData.compactHidden = next;
        if (figureReflection) figureReflection.userData.compactHidden = next;
      }
    },
    layoutTrails(svg, vw, vh) {
      if (!floor || !opts.camera) return false;
      const box = svg.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return false;
      group.updateWorldMatrix(true, false);
      // A câmera só atualiza a matriz de mundo no render: antes do 1º quadro ela estaria na origem.
      opts.camera.updateMatrixWorld();
      const inv = group.matrixWorld.clone().invert();
      const floorPlane = new Plane(new Vector3(0, 1, 0), -new Vector3(0, F, 0).applyMatrix4(group.matrixWorld).y);
      const ray = new Raycaster();
      const ndc = new Vector2();
      const hit = new Vector3();
      const seen = new Set<string>();
      const trails: Array<{ points: Array<[number, number]>; width: number; intensity: number; fade: number }> = [];
      svg.querySelectorAll("path").forEach((path) => {
        const d = path.getAttribute("d") ?? "";
        if (seen.has(d)) return;
        seen.add(d);
        const len = path.getTotalLength();
        const pts: Array<[number, number]> = [];
        for (let i = 0; i <= 96; i++) {
          const sp = path.getPointAtLength((len * i) / 96);
          const sx = box.left + (sp.x / 1672) * box.width;
          const sy = box.top + (sp.y / 941) * box.height;
          ndc.set((sx / vw) * 2 - 1, -(sy / vh) * 2 + 1);
          ray.setFromCamera(ndc, opts.camera!);
          if (!ray.ray.intersectPlane(floorPlane, hit)) continue;
          hit.applyMatrix4(inv);
          // Perto do horizonte o raio fica rasante e o ponto vai para muito longe: só o chão diante da parede.
          if (hit.z < bounds.minZ - 1.2) continue;
          pts.push([hit.x, hit.z]);
        }
        // Principal: mais larga e brilhante perto da câmera, apagando ao longe; secundária: fina e discreta.
        if (pts.length > 2) trails.push(trails.length === 0 ? { points: pts, width: 0.03, intensity: 1, fade: 0.3 } : { points: pts, width: 0.016, intensity: 0.7, fade: 0.6 });
      });
      floor.setTrails(trails);
      svg.style.display = trails.length ? "none" : "";
      return trails.length > 0;
    },
    syncReflection(sculptureWorld, floorWorldY) {
      mirrorMatrix.set(1, 0, 0, 0, 0, -1, 0, 2 * floorWorldY, 0, 0, 1, 0, 0, 0, 0, 1);
      if (reflection) reflection.matrixWorld.multiplyMatrices(mirrorMatrix, sculptureWorld);
      for (const { src, dst } of mirrored) dst.matrixWorld.multiplyMatrices(mirrorMatrix, src.matrixWorld);
      // Ossos já estão em coordenadas de mundo: basta o espelho.
      if (figureReflection) figureReflection.matrixWorld.copy(mirrorMatrix);
      if (c03) {
        figReflUniforms.uFigFloorY.value = floorWorldY;
        figReflUniforms.uFigLen.value = rig.bones.head.getWorldPosition(headWorld).y - floorWorldY;
      }
    },
    update(dt, weight, paused) {
      figureMotion.update(dt, weight, paused);
      backlight.update(dt, paused);
    },
    probe() {
      const w = (n: "footL" | "footR" | "head" | "hips" | "handL" | "handR") => rig.bones[n].getWorldPosition(new Vector3()).toArray().map((v) => Math.round(v * 1e5) / 1e5);
      return { footL: w("footL"), footR: w("footR"), head: w("head"), hips: w("hips"), handL: w("handL"), handR: w("handR"), unitPerFigure: personH };
    },
    setOpacity(alpha) {
      group.visible = alpha > 0.001;
      if (reflection) reflection.visible = alpha > 0.001 && !reflection.userData.compactHidden;
      if (figureReflection) figureReflection.visible = alpha > 0.001 && !figureReflection.userData.compactHidden;
      fadeables.forEach(({ material, base }) => {
        material.opacity = base * alpha;
      });
    },
    dispose() {
      figureMotion.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
}
