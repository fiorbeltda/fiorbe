import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
  type Material,
} from "three";

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
}

export interface SculptureSet {
  group: Group;
  /** Atualiza o reflexo a partir da matriz de mundo da escultura. */
  syncReflection(sculptureWorld: Matrix4, floorWorldY: number): void;
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

/** Silhueta humana desenhada em código: pessoa de pé, de costas para a luz. */
function personTexture(): CanvasTexture {
  return canvasTexture(
    96,
    320,
    (g) => {
      g.fillStyle = "#04070d";
      g.beginPath();
      g.ellipse(48, 30, 13, 16, 0, 0, Math.PI * 2); // cabeça
      g.fill();
      g.beginPath(); // pescoço, ombros, tronco e braços
      g.moveTo(42, 44);
      g.lineTo(54, 44);
      g.lineTo(56, 52);
      g.quadraticCurveTo(76, 56, 78, 72);
      g.lineTo(80, 150);
      g.lineTo(74, 182);
      g.lineTo(70, 182);
      g.lineTo(68, 120);
      g.lineTo(66, 172);
      g.lineTo(30, 172);
      g.lineTo(28, 120);
      g.lineTo(26, 182);
      g.lineTo(22, 182);
      g.lineTo(16, 150);
      g.lineTo(18, 72);
      g.quadraticCurveTo(20, 56, 40, 52);
      g.closePath();
      g.fill();
      g.beginPath(); // pernas
      g.moveTo(30, 170);
      g.lineTo(47, 170);
      g.lineTo(46, 300);
      g.lineTo(34, 300);
      g.closePath();
      g.moveTo(49, 170);
      g.lineTo(66, 170);
      g.lineTo(62, 300);
      g.lineTo(50, 300);
      g.closePath();
      g.fill();
      g.beginPath(); // pés
      g.ellipse(39, 304, 10, 5, 0, 0, Math.PI * 2);
      g.ellipse(57, 304, 10, 5, 0, 0, Math.PI * 2);
      g.fill();
      // Contraluz: filete frio na borda direita (a luz vem de trás, à direita).
      g.globalCompositeOperation = "source-atop";
      const rim = g.createLinearGradient(56, 0, 82, 0);
      rim.addColorStop(0, "rgba(120,200,255,0)");
      rim.addColorStop(1, "rgba(120,200,255,0.55)");
      g.fillStyle = rim;
      g.fillRect(0, 0, 96, 320);
    },
    true,
  );
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
  return canvasTexture(8, 256, (g) => {
    const grad = g.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 8, 256);
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

  const beamTex = verticalFadeTexture();
  disposables.push(beamTex);
  [
    [0.35, 0.05, 0.62],
    [0.62, 0.03, 0.82],
    [0.85, 0.07, 0.5],
    [1.1, 0.025, 0.7],
    [1.32, 0.05, 0.4],
    [1.55, 0.03, 0.55],
  ].forEach(([dx, w, h]) => {
    const m = track(
      new MeshBasicMaterial({ map: beamTex, color: new Color("#b8eeff").multiplyScalar(0.07), blending: AdditiveBlending, transparent: true, depthWrite: false }),
      1,
    );
    const beam = new Mesh(glowGeo, m);
    beam.scale.set(w!, bounds.height * h!, 1);
    beam.position.set(px + dx! * 0.7, F + (bounds.height * h!) / 2, pz - 1.0);
    beam.renderOrder = 2;
    group.add(beam);
  });

  // --- Figura humana: escala monumental (≈15% da altura da escultura) ---
  const personH = bounds.height * 0.15;
  const personTex = personTexture();
  disposables.push(personTex);
  const personMat = track(new MeshBasicMaterial({ map: personTex, transparent: true, alphaTest: 0.02, depthWrite: true }), 1);
  const personGeo = new PlaneGeometry(personH * 0.3, personH);
  disposables.push(personGeo);
  const person = new Mesh(personGeo, personMat);
  person.position.set(px, F + personH / 2, pz);
  person.renderOrder = 4;
  group.add(person);
  if (opts.reflections) {
    const mirrorMat = track(new MeshBasicMaterial({ map: personTex, transparent: true, opacity: 0.3, depthWrite: false }), 0.3);
    const mirror = new Mesh(personGeo, mirrorMat);
    mirror.scale.y = -1;
    mirror.position.set(px, F - personH / 2, pz);
    mirror.renderOrder = 0;
    group.add(mirror);
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
    syncReflection(sculptureWorld, floorWorldY) {
      if (!reflection) return;
      mirrorMatrix.set(1, 0, 0, 0, 0, -1, 0, 2 * floorWorldY, 0, 0, 1, 0, 0, 0, 0, 1);
      reflection.matrixWorld.multiplyMatrices(mirrorMatrix, sculptureWorld);
    },
    setOpacity(alpha) {
      group.visible = alpha > 0.001;
      if (reflection) reflection.visible = alpha > 0.001;
      fadeables.forEach(({ material, base }) => {
        material.opacity = base * alpha;
      });
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
