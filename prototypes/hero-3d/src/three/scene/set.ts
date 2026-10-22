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
  PlaneGeometry,
  SkinnedMesh,
  SRGBColorSpace,
  Vector3,
  type Camera,
  type Material,
} from "three";
import { createFigureRig } from "../figure/figureRig";
import { FigureMotion } from "../figure/figureMotion";
import { createBacklight } from "./backlight";

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

  // --- Chão: escuro, levemente metálico, some nas bordas ---
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
  });
  disposables.push(backlight);
  backlight.fadeables.forEach((material) => fadeables.push({ material, base: 1 }));
  group.add(backlight.group);
  const glowGeo = new PlaneGeometry(1, 1);
  disposables.push(glowGeo);

  // --- Figura humana com esqueleto (≈14,5% da altura da escultura, como na referência) ---
  const rig = createFigureRig();
  disposables.push(rig.geometry, rig.material);
  rig.root.scale.setScalar(personH);
  rig.root.position.set(px, F, pz);
  // De costas para a câmera, girada em direção ao centro da escultura.
  rig.root.rotation.y = 0.42;
  group.add(rig.root);
  const figureMotion = new FigureMotion(rig, opts.reducedMotion);

  // Sombra de contato sob os pés.
  const contactTex = radialTexture([
    [0, "rgba(255,255,255,1)"],
    [0.5, "rgba(255,255,255,0.45)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  disposables.push(contactTex);
  const contactMat = track(new MeshBasicMaterial({ color: 0x000000, alphaMap: contactTex, transparent: true, opacity: 0.75, depthWrite: false }), 0.75);
  const contact = new Mesh(glowGeo, contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.scale.set(personH * 0.42, personH * 0.22, 1);
  contact.position.set(px, F + 0.002, pz);
  contact.renderOrder = 2;
  group.add(contact);

  // Reflexo da figura: mesma geometria e MESMO esqueleto, espelhado no chão.
  let figureReflection: SkinnedMesh | null = null;
  if (opts.reflections) {
    const reflMat = track(new MeshBasicMaterial({ color: new Color("#04070e"), transparent: true, opacity: 0.6, depthWrite: false }), 0.6);
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

  return {
    group,
    reflection,
    figureReflection,
    syncReflection(sculptureWorld, floorWorldY) {
      mirrorMatrix.set(1, 0, 0, 0, 0, -1, 0, 2 * floorWorldY, 0, 0, 1, 0, 0, 0, 0, 1);
      if (reflection) reflection.matrixWorld.multiplyMatrices(mirrorMatrix, sculptureWorld);
      // Ossos já estão em coordenadas de mundo: basta o espelho.
      if (figureReflection) figureReflection.matrixWorld.copy(mirrorMatrix);
    },
    update(dt, weight, paused) {
      figureMotion.update(dt, weight, paused);
      backlight.update(dt, paused);
    },
    probe() {
      const w = (n: "footL" | "footR" | "head" | "hips") => rig.bones[n].getWorldPosition(new Vector3()).toArray().map((v) => Math.round(v * 1e5) / 1e5);
      return { footL: w("footL"), footR: w("footR"), head: w("head"), hips: w("hips"), unitPerFigure: personH };
    },
    setOpacity(alpha) {
      group.visible = alpha > 0.001;
      if (reflection) reflection.visible = alpha > 0.001;
      if (figureReflection) figureReflection.visible = alpha > 0.001;
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
