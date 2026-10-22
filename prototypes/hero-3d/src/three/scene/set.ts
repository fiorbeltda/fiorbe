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
  type Material,
} from "three";
import { createFigureRig } from "../figure/figureRig";
import { FigureMotion } from "../figure/figureMotion";

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

function verticalFadeTexture(): CanvasTexture {
  // Feixe volumétrico: forte na base, some para cima e tem bordas laterais suaves.
  return canvasTexture(64, 256, (g) => {
    const v = g.createLinearGradient(0, 256, 0, 0);
    v.addColorStop(0, "#ffffff");
    v.addColorStop(0.35, "rgba(255,255,255,0.4)");
    v.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = v;
    g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = "destination-in";
    const h = g.createLinearGradient(0, 0, 64, 0);
    h.addColorStop(0, "rgba(0,0,0,0)");
    h.addColorStop(0.5, "rgba(0,0,0,1)");
    h.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = h;
    g.fillRect(0, 0, 64, 256);
  });
}


export function createSculptureSet(opts: SetOptions, reflectionSource: { geometry: BufferGeometry; material: Material } | null): SculptureSet {
  const { floorY: F, bounds } = opts;
  const group = new Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const fadeables: Array<{ material: MeshBasicMaterial | MeshStandardMaterial; base: number }> = [];
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

  // --- Luz de fundo junto à figura: halo + feixes verticais ---
  const px = opts.person?.x ?? bounds.maxX * 0.93;
  const pz = opts.person?.z ?? bounds.maxZ * 1.05;
  const glowTex = radialTexture([
    [0, "rgba(255,255,255,1)"],
    [0.25, "rgba(255,255,255,0.45)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  disposables.push(glowTex);
  const glowMat = track(
    new MeshBasicMaterial({ map: glowTex, color: new Color("#4cc4ff").multiplyScalar(0.95), blending: AdditiveBlending, transparent: true, depthWrite: false }),
    1,
  );
  const glowGeo = new PlaneGeometry(1, 1);
  disposables.push(glowGeo);
  const glow = new Mesh(glowGeo, glowMat);
  glow.scale.set(bounds.height * 0.9, bounds.height * 0.75, 1);
  glow.position.set(px + 0.55, F + bounds.height * 0.2, pz - 1.2);
  glow.renderOrder = 2;
  group.add(glow);

  // Halo próximo, atrás da figura na altura do corpo: dá o recorte de silhueta da referência.
  const nearGlowMat = track(
    new MeshBasicMaterial({ map: glowTex, color: new Color("#8fdcff").multiplyScalar(0.75), blending: AdditiveBlending, transparent: true, depthWrite: false }),
    1,
  );
  const nearGlow = new Mesh(glowGeo, nearGlowMat);
  nearGlow.scale.set(bounds.height * 0.32, bounds.height * 0.38, 1);
  nearGlow.position.set(px + 0.05, F + bounds.height * 0.1, pz - 0.45);
  nearGlow.renderOrder = 2;
  group.add(nearGlow);

  // Feixes: poucos, largos e muito suaves — luz atmosférica, não barras.
  const beamTex = verticalFadeTexture();
  disposables.push(beamTex);
  [
    [0.5, 0.22, 0.75],
    [0.95, 0.14, 0.9],
    [1.35, 0.26, 0.6],
  ].forEach(([dx, w, h]) => {
    const m = track(
      new MeshBasicMaterial({ map: beamTex, color: new Color("#b8eeff").multiplyScalar(0.045), blending: AdditiveBlending, transparent: true, depthWrite: false }),
      1,
    );
    const beam = new Mesh(glowGeo, m);
    beam.scale.set(w!, bounds.height * h!, 1);
    beam.position.set(px + dx! * 0.7, F + (bounds.height * h!) / 2, pz - 1.0);
    beam.renderOrder = 2;
    group.add(beam);
  });

  // Poça de luz no piso, atrás da figura: integra luz de fundo, chão e silhueta.
  const poolMat = track(
    new MeshBasicMaterial({ map: glowTex, color: new Color("#6cc8ff").multiplyScalar(0.85), blending: AdditiveBlending, transparent: true, depthWrite: false }),
    1,
  );
  const pool = new Mesh(glowGeo, poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.scale.set(bounds.height * 0.62, bounds.height * 0.26, 1);
  pool.position.set(px + 0.12, F + 0.003, pz - 0.15);
  pool.renderOrder = 2;
  group.add(pool);

  // --- Figura humana com esqueleto (≈14,5% da altura da escultura, como na referência) ---
  const personH = bounds.height * 0.145;
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
