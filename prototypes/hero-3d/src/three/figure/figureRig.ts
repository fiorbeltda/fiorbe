import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  Vector3,
} from "three";

/**
 * Figura humana construída em código: esqueleto real (19 ossos) e malha
 * com skinning suave nas articulações. Silhueta de terno — ombros
 * estruturados, paletó com barra, calça reta, sapatos — porque em contraluz
 * é a silhueta que comunica, não o detalhe.
 *
 * Espaço local: altura 1, pés em y=0, de costas para a câmera (olhando -z).
 * Proporção de ~7,6 cabeças.
 */
export const BONE_NAMES = [
  "root", "hips", "spine", "chest", "neck", "head",
  "shoulderL", "upperArmL", "foreArmL", "handL",
  "shoulderR", "upperArmR", "foreArmR", "handR",
  "thighL", "shinL", "footL", "thighR", "shinR", "footR",
] as const;
export type BoneName = (typeof BONE_NAMES)[number];

/** Posição de repouso (espaço da figura) da origem de cada osso + pai. */
const REST: Record<BoneName, { parent: BoneName | null; at: [number, number, number] }> = {
  root: { parent: null, at: [0, 0, 0] },
  hips: { parent: "root", at: [0, 0.52, 0] },
  spine: { parent: "hips", at: [0, 0.6, 0] },
  chest: { parent: "spine", at: [0, 0.71, 0] },
  neck: { parent: "chest", at: [0, 0.84, 0] },
  head: { parent: "neck", at: [0, 0.89, 0] },
  shoulderL: { parent: "chest", at: [0.04, 0.81, 0] },
  upperArmL: { parent: "shoulderL", at: [0.108, 0.805, 0] },
  foreArmL: { parent: "upperArmL", at: [0.116, 0.64, 0] },
  handL: { parent: "foreArmL", at: [0.12, 0.488, 0] },
  shoulderR: { parent: "chest", at: [-0.04, 0.81, 0] },
  upperArmR: { parent: "shoulderR", at: [-0.108, 0.805, 0] },
  foreArmR: { parent: "upperArmR", at: [-0.116, 0.64, 0] },
  handR: { parent: "foreArmR", at: [-0.12, 0.488, 0] },
  thighL: { parent: "hips", at: [0.056, 0.5, 0] },
  shinL: { parent: "thighL", at: [0.056, 0.27, 0.004] },
  footL: { parent: "shinL", at: [0.056, 0.045, 0] },
  thighR: { parent: "hips", at: [-0.056, 0.5, 0] },
  shinR: { parent: "thighR", at: [-0.056, 0.27, 0.004] },
  footR: { parent: "shinR", at: [-0.056, 0.045, 0] },
};

const idx = (n: BoneName) => BONE_NAMES.indexOf(n);

interface Builder {
  pos: number[];
  nrm: number[];
  si: number[];
  sw: number[];
  ix: number[];
}

/** Peso ao longo de y: lista de (y, osso); mistura linear numa faixa ±blend. */
type Ramp = Array<[number, BoneName]>;

function weightsAt(y: number, ramp: Ramp, blend: number): [number, number, number] {
  // Ramp ordenada de cima para baixo.
  for (let k = 0; k < ramp.length - 1; k++) {
    const [yTop, boneTop] = ramp[k]!;
    const [yBot, boneBot] = ramp[k + 1]!;
    if (y >= yBot) {
      void yTop;
      const d = (y - yBot) / blend;
      const t = Math.min(1, Math.max(0, 0.5 + d / 2));
      return [idx(boneTop), idx(boneBot), t];
    }
  }
  const last = ramp[ramp.length - 1]![1];
  return [idx(last), idx(last), 1];
}

/**
 * Loft vertical: anéis superelípticos ao longo de y, com centro (cx, cz).
 * Usado para tronco, braços e pernas — tudo com a mesma topologia limpa.
 */
function loft(
  b: Builder,
  rings: Array<{ y: number; cx: number; cz: number; rx: number; rz: number }>,
  ramp: Ramp,
  blend: number,
  sides = 18,
  power = 2,
  capTop = true,
  capBottom = true,
): void {
  const base = b.pos.length / 3;
  rings.forEach((r) => {
    const [i0, i1, t] = weightsAt(r.y, ramp, blend);
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      const e = 2 / power;
      const x = Math.sign(c) * Math.pow(Math.abs(c), e) * r.rx;
      const z = Math.sign(sn) * Math.pow(Math.abs(sn), e) * r.rz;
      b.pos.push(r.cx + x, r.y, r.cz + z);
      const n = new Vector3(c / r.rx, 0, sn / r.rz).normalize();
      b.nrm.push(n.x, n.y, n.z);
      b.si.push(i0, i1, 0, 0);
      b.sw.push(t, 1 - t, 0, 0);
    }
  });
  for (let k = 0; k < rings.length - 1; k++) {
    for (let s = 0; s < sides; s++) {
      const a = base + k * sides + s;
      const bb = base + k * sides + ((s + 1) % sides);
      const c = a + sides;
      const d = bb + sides;
      b.ix.push(a, c, bb, bb, c, d);
    }
  }
  const cap = (ringIndex: number, up: boolean) => {
    const r = rings[ringIndex]!;
    const center = b.pos.length / 3;
    const [i0, i1, t] = weightsAt(r.y, ramp, blend);
    b.pos.push(r.cx, r.y + (up ? r.rx * 0.35 : -r.rx * 0.35), r.cz);
    b.nrm.push(0, up ? 1 : -1, 0);
    b.si.push(i0, i1, 0, 0);
    b.sw.push(t, 1 - t, 0, 0);
    const ringBase = base + ringIndex * sides;
    for (let s = 0; s < sides; s++) {
      const a = ringBase + s;
      const n = ringBase + ((s + 1) % sides);
      if (up) b.ix.push(center, n, a);
      else b.ix.push(center, a, n);
    }
  };
  if (capTop) cap(0, true);
  if (capBottom) cap(rings.length - 1, false);
}

/** Elipsoide rígido preso a um osso. */
function ellipsoid(b: Builder, c: [number, number, number], r: [number, number, number], bone: BoneName, seg = 14): void {
  const base = b.pos.length / 3;
  const bi = idx(bone);
  for (let i = 0; i <= seg; i++) {
    const v = i / seg;
    const phi = v * Math.PI;
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(th);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(th);
      b.pos.push(c[0] + nx * r[0], c[1] + ny * r[1], c[2] + nz * r[2]);
      const n = new Vector3(nx / r[0], ny / r[1], nz / r[2]).normalize();
      b.nrm.push(n.x, n.y, n.z);
      b.si.push(bi, bi, 0, 0);
      b.sw.push(1, 0, 0, 0);
    }
  }
  for (let i = 0; i < seg; i++) {
    for (let j = 0; j < seg; j++) {
      const a = base + i * (seg + 1) + j;
      const d = a + seg + 1;
      b.ix.push(a, d, a + 1, a + 1, d, d + 1);
    }
  }
}

export interface FigureRig {
  root: Group;
  mesh: SkinnedMesh;
  skeleton: Skeleton;
  bones: Record<BoneName, Bone>;
  geometry: BufferGeometry;
  material: MeshStandardMaterial;
}

export function createFigureRig(): FigureRig {
  // --- Esqueleto ---
  const bones = {} as Record<BoneName, Bone>;
  BONE_NAMES.forEach((n) => {
    const bone = new Bone();
    bone.name = n;
    bones[n] = bone;
  });
  BONE_NAMES.forEach((n) => {
    const { parent, at } = REST[n];
    const bone = bones[n];
    if (parent) {
      const p = REST[parent].at;
      bone.position.set(at[0] - p[0], at[1] - p[1], at[2] - p[2]);
      bones[parent].add(bone);
    } else {
      bone.position.set(...at);
    }
  });

  // --- Malha ---
  const b: Builder = { pos: [], nrm: [], si: [], sw: [], ix: [] };

  // Paletó + tronco: ombros estruturados, cintura marcada, barra levemente aberta.
  loft(
    b,
    [
      { y: 0.84, cx: 0, cz: 0.002, rx: 0.036, rz: 0.034 },
      { y: 0.826, cx: 0, cz: 0.004, rx: 0.075, rz: 0.06 },
      { y: 0.812, cx: 0, cz: 0.004, rx: 0.118, rz: 0.066 },
      { y: 0.79, cx: 0, cz: 0.004, rx: 0.128, rz: 0.07 },
      { y: 0.74, cx: 0, cz: 0.002, rx: 0.118, rz: 0.072 },
      { y: 0.67, cx: 0, cz: 0.002, rx: 0.104, rz: 0.066 },
      { y: 0.6, cx: 0, cz: 0, rx: 0.094, rz: 0.06 },
      { y: 0.53, cx: 0, cz: 0, rx: 0.1, rz: 0.062 },
      { y: 0.47, cx: 0, cz: 0.002, rx: 0.108, rz: 0.066 },
      { y: 0.445, cx: 0, cz: 0.003, rx: 0.11, rz: 0.067 },
    ],
    [
      [0.84, "neck"],
      [0.7, "chest"],
      [0.59, "spine"],
      [0.5, "hips"],
    ],
    0.05,
    22,
    2.6,
  );

  // Pescoço e cabeça (com volume de cabelo atrás/em cima).
  loft(b, [
    { y: 0.895, cx: 0, cz: 0.004, rx: 0.027, rz: 0.03 },
    { y: 0.835, cx: 0, cz: 0.002, rx: 0.031, rz: 0.032 },
  ], [[0.9, "head"], [0.85, "neck"]], 0.02, 12, 2, false, false);
  // Cabeça um pouco mais estreita que funda; cabelo curto como volume na nuca e no topo.
  ellipsoid(b, [0, 0.932, -0.002], [0.043, 0.057, 0.052], "head");
  ellipsoid(b, [0, 0.948, 0.008], [0.045, 0.045, 0.049], "head");

  // Braços (manga do paletó) e mãos.
  for (const side of [1, -1] as const) {
    const L = side === 1;
    const s = (n: string) => (n + (L ? "L" : "R")) as BoneName;
    loft(
      b,
      [
        { y: 0.82, cx: side * 0.104, cz: 0.004, rx: 0.036, rz: 0.04 },
        { y: 0.78, cx: side * 0.11, cz: 0.004, rx: 0.036, rz: 0.038 },
        { y: 0.7, cx: side * 0.114, cz: 0.002, rx: 0.032, rz: 0.034 },
        { y: 0.64, cx: side * 0.116, cz: 0, rx: 0.029, rz: 0.031 },
        { y: 0.56, cx: side * 0.118, cz: -0.002, rx: 0.027, rz: 0.028 },
        { y: 0.5, cx: side * 0.12, cz: -0.002, rx: 0.026, rz: 0.027 },
      ],
      [
        [0.82, s("upperArm")],
        [0.64, s("foreArm")],
        [0.49, s("hand")],
      ],
      0.035,
      14,
    );
    ellipsoid(b, [side * 0.121, 0.452, -0.004], [0.017, 0.044, 0.028], s("hand"), 10);
  }

  // Pernas (calça reta) e sapatos.
  for (const side of [1, -1] as const) {
    const L = side === 1;
    const s = (n: string) => (n + (L ? "L" : "R")) as BoneName;
    loft(
      b,
      [
        { y: 0.5, cx: side * 0.054, cz: 0, rx: 0.05, rz: 0.056 },
        { y: 0.4, cx: side * 0.055, cz: 0.002, rx: 0.046, rz: 0.05 },
        { y: 0.27, cx: side * 0.056, cz: 0.004, rx: 0.039, rz: 0.042 },
        { y: 0.15, cx: side * 0.056, cz: 0.002, rx: 0.037, rz: 0.039 },
        { y: 0.06, cx: side * 0.056, cz: 0, rx: 0.036, rz: 0.038 },
      ],
      [
        [0.5, s("thigh")],
        [0.27, s("shin")],
        [0.04, s("foot")],
      ],
      0.04,
      14,
      2,
      false,
      true,
    );
    ellipsoid(b, [side * 0.056, 0.024, -0.03], [0.03, 0.024, 0.074], s("foot"), 10);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(b.pos), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(b.nrm), 3));
  geometry.setAttribute("skinIndex", new BufferAttribute(new Uint16Array(b.si), 4));
  geometry.setAttribute("skinWeight", new BufferAttribute(new Float32Array(b.sw), 4));
  geometry.setIndex(b.ix);
  geometry.computeBoundingSphere();

  // Tecido escuro fosco + contraluz frio (fresnel enviesado para a direita,
  // de onde vem a luz de fundo). Nada de emissivo: a figura é recortada pela luz.
  const material = new MeshStandardMaterial({ color: new Color("#03050a"), roughness: 0.85, metalness: 0, envMapIntensity: 0.25 });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      /* glsl */ `
      // Contraluz só na borda voltada para a luz (direita da tela): filete fino, não contorno.
      float fgFres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 5.0);
      float fgSide = smoothstep(0.25, 0.95, normal.x);
      outgoingLight += vec3(0.45, 0.8, 1.0) * fgFres * fgSide * 0.55;
      #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => "fiorbe-figure-v1";

  // Vínculo na origem (matriz identidade): as inversas dos ossos ficam no
  // espaço da figura, o que permite reaproveitar o esqueleto no reflexo.
  const mesh = new SkinnedMesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.add(bones.root);
  mesh.updateMatrixWorld(true);
  const skeleton = new Skeleton(BONE_NAMES.map((n) => bones[n]));
  mesh.bind(skeleton);
  const root = new Group();
  root.add(mesh);

  return { root, mesh, skeleton, bones, geometry, material };
}
