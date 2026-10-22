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
  const room = new Mesh(new BoxGeometry(20, 12, 20), new MeshBasicMaterial({ color: new Color("#04070e"), side: BackSide }));
  scene.add(room);

  const key = softbox("#e8f4ff", 6, 7, 2.2);
  key.position.set(4.5, 5, 2);
  key.lookAt(0, 0, 0);
  scene.add(key);

  const cyan = softbox("#3cc6e6", 4.5, 2.4, 8);
  cyan.position.set(8, 0.5, -3);
  cyan.lookAt(0, 0, 0);
  scene.add(cyan);

  const blue = softbox("#2f6bff", 5, 2, 9);
  blue.position.set(-8.5, 0, 1);
  blue.lookAt(0, 0, 0);
  scene.add(blue);

  const tealFloor = softbox("#1f8f80", 1.4, 14, 6);
  tealFloor.position.set(0, -5.5, 0);
  tealFloor.lookAt(0, 0, 0);
  scene.add(tealFloor);

  const strip = softbox("#ffffff", 9, 0.25, 6);
  strip.position.set(-2.5, 3, 8);
  strip.lookAt(0, 0, 0);
  scene.add(strip);

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
