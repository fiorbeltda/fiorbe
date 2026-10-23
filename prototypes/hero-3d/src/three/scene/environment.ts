import {
  BackSide,
  BoxGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type Texture,
  type WebGLRenderer,
} from "three";

/**
 * Estúdio próprio para reflexos: sala escura com poucas softboxes.
 * É o que dá ao metal os highlights longos e controlados — sem bloom.
 * Luzes coloridas só onde a marca pede (ciano, teal, azul).
 */
function softbox(color: string, intensity: number, w: number, h: number): Mesh {
  const mat = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity) });
  return new Mesh(new PlaneGeometry(w, h), mat);
}

export function createStudioEnvironment(renderer: WebGLRenderer): { texture: Texture; dispose: () => void } {
  const scene = new Scene();
  const room = new Mesh(new BoxGeometry(20, 12, 20), new MeshBasicMaterial({ color: new Color("#010308"), side: BackSide }));
  scene.add(room);

  const key = softbox("#e8f4ff", 7, 5, 0.55);
  key.position.set(4.5, 5, 2);
  key.lookAt(0, 0, 0);
  scene.add(key);

  const cyan = softbox("#3cc6e6", 5, 0.7, 8);
  cyan.position.set(8, 0.5, -3);
  cyan.lookAt(0, 0, 0);
  scene.add(cyan);

  const blue = softbox("#2f6bff", 4, 0.8, 9);
  blue.position.set(-8.5, 0, 1);
  blue.lookAt(0, 0, 0);
  scene.add(blue);

  const tealFloor = softbox("#1f8f80", 0.5, 14, 6);
  tealFloor.position.set(0, -5.5, 0);
  tealFloor.lookAt(0, 0, 0);
  scene.add(tealFloor);

  const strip = softbox("#ffffff", 9, 0.25, 6);
  strip.position.set(-2.5, 3, 8);
  strip.lookAt(0, 0, 0);
  scene.add(strip);

  // Faixas finas e longas: geram os realces alongados do metal da referência.
  const lines: Array<[string, number, [number, number, number]]> = [
    ["#dff6ff", 12, [6, 4.5, 4]],
    ["#7fe3ff", 8, [-5, 5, 5]],
    ["#9cc4ff", 7, [2, -1.5, 9]],
  ];
  lines.forEach(([color, intensity, [x, y, z]]) => {
    const line = softbox(color, intensity, 0.12, 9);
    line.position.set(x, y, z);
    line.lookAt(0, 0, 0);
    line.rotateZ(0.7);
    scene.add(line);
  });

  return bake(renderer, scene);
}

/**
 * Estúdio do metal premium (Blender V2): o azul vem da LUZ, não da cor do metal.
 * Sala quase preta (sombras profundas), dois painéis grandes e suaves — azul
 * profundo e ciano/teal — para os meios-tons, e poucos filetes brancos estreitos
 * e muito intensos: viram realces finos quase brancos, alongados pela anisotropia
 * ao longo da fita. Um teto prateado fraco separa as faces de cima.
 */
export function createPremiumEnvironment(renderer: WebGLRenderer): { texture: Texture; dispose: () => void } {
  const scene = new Scene();
  scene.add(new Mesh(new BoxGeometry(20, 12, 20), new MeshBasicMaterial({ color: new Color("#000105"), side: BackSide })));
  const place = (m: Mesh, x: number, y: number, z: number, rot = 0) => {
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    if (rot) m.rotateZ(rot);
    scene.add(m);
  };
  place(softbox("#0b2fd0", 1.9, 4, 6), -7.5, 1.5, 3);
  // Luz principal grande e suave, branco-azulada: as varreduras largas que vão ao quase branco nas faces.
  place(softbox("#d6e9ff", 3.2, 2.6, 5.5), 4.5, 3.5, 6.5, 0.5);
  place(softbox("#12b4d8", 2.4, 2.2, 8), 8, 0, -2);
  place(softbox("#1f55ff", 1.6, 9, 2.2), 0, -1, -9);
  place(softbox("#7f9cd0", 0.16, 12, 6), 0, 5.8, 0);
  place(softbox("#06215e", 0.22, 14, 6), 0, -5.5, 0);
  // Filetes: realces estreitos quase brancos (frios), em ângulos diferentes.
  const strips: Array<[string, number, number, number, [number, number, number], number]> = [
    ["#f2fbff", 26, 0.07, 10, [5, 4.5, 4], 0.7],
    ["#e6f6ff", 20, 0.06, 9, [-4.5, 5, 5.5], -0.5],
    ["#d8f2ff", 16, 0.05, 8, [1.5, -1.8, 9], 0.25],
    ["#c9f4ff", 18, 0.08, 7, [8.5, 2.5, 1], 1.3],
  ];
  strips.forEach(([c, i, w, h, [x, y, z], r]) => place(softbox(c, i, w, h), x, y, z, r));
  return bake(renderer, scene);
}

function bake(renderer: WebGLRenderer, scene: Scene): { texture: Texture; dispose: () => void } {
  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  scene.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.geometry.dispose();
      (obj.material as MeshBasicMaterial).dispose();
    }
  });

  return { texture: target.texture, dispose: () => target.dispose() };
}
