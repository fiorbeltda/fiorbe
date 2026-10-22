import { CatmullRomCurve3, Color, Mesh, MeshBasicMaterial, TubeGeometry, Vector3, type Object3D } from "three";
import type { Gesture } from "./monument";

/**
 * Diagnóstico (só com ?gestos): a espinha da fita desenhada por cima da
 * escultura, um tubo fino por grande gesto, visível através das fitas, e uma
 * legenda. Nunca aparece na interface normal.
 */
export function createGestureDebug(curve: CatmullRomCurve3, pointCount: number, gestures: Gesture[], parent: Object3D) {
  const meshes: Mesh[] = [];
  for (const g of gestures) {
    // Amostra a espinha entre os pontos de controle do gesto (parâmetro t da curva).
    const pts: Vector3[] = [];
    const t0 = g.from / pointCount;
    const t1 = g.to / pointCount;
    for (let k = 0; k <= 48; k++) pts.push(curve.getPoint(t0 + ((t1 - t0) * k) / 48));
    const geo = new TubeGeometry(new CatmullRomCurve3(pts), 96, 0.03, 6, false);
    const mat = new MeshBasicMaterial({ color: new Color(g.color), depthTest: false, transparent: true, opacity: 0.9 });
    const mesh = new Mesh(geo, mat);
    mesh.renderOrder = 998;
    parent.add(mesh);
    meshes.push(mesh);
  }
  const legend = document.createElement("ol");
  legend.setAttribute("aria-hidden", "true");
  legend.style.cssText =
    "position:fixed;right:12px;bottom:12px;z-index:9999;margin:0;padding:8px 12px 8px 28px;font:12px/1.6 ui-monospace,monospace;color:#e8f6ff;background:rgba(2,8,20,.85);border:1px solid #1d3b66;border-radius:6px;pointer-events:none";
  for (const g of gestures) {
    const li = document.createElement("li");
    li.textContent = g.name;
    li.style.color = g.color;
    legend.appendChild(li);
  }
  document.body.appendChild(legend);
  return {
    dispose() {
      meshes.forEach((m) => {
        parent.remove(m);
        m.geometry.dispose();
        (m.material as MeshBasicMaterial).dispose();
      });
      legend.remove();
    },
  };
}
