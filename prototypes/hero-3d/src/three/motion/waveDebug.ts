import { Mesh, MeshBasicMaterial, SphereGeometry, Vector3, type CatmullRomCurve3, type Object3D } from "three";
import type { WaveDirector } from "./waveDirector";

/**
 * Visualização temporária da onda (só com ?ondadebug): marcador da crista
 * visível através da escultura + painel com fita ativa, posição, progresso
 * da volta, transferências e ordem de ativação. Nunca aparece na interface normal.
 */
const NAMES = "ABCDEF";

export function createWaveDebug(waves: WaveDirector, curves: CatmullRomCurve3[], parent: Object3D) {
  const geo = new SphereGeometry(0.07, 16, 12);
  const mats = [new MeshBasicMaterial({ color: 0xff3b6b, depthTest: false }), new MeshBasicMaterial({ color: 0xffd23b, depthTest: false })];
  const markers = mats.map((m) => {
    const s = new Mesh(geo, m);
    s.renderOrder = 999;
    s.visible = false;
    parent.add(s);
    return s;
  });
  const panel = document.createElement("pre");
  panel.setAttribute("aria-hidden", "true");
  panel.style.cssText =
    "position:fixed;left:12px;bottom:12px;z-index:9999;margin:0;padding:8px 10px;max-width:460px;font:12px/1.45 ui-monospace,monospace;color:#e8f6ff;background:rgba(2,8,20,.82);border:1px solid #1d3b66;border-radius:6px;pointer-events:none;white-space:pre-wrap";
  document.body.appendChild(panel);
  const p = new Vector3();
  let acc = 0;

  return {
    update(dt: number) {
      const snap = waves.snapshot();
      markers.forEach((m, i) => {
        const w = snap[i];
        m.visible = !!w;
        if (w) m.position.copy(curves[w.band]!.getPointAt(w.u, p));
      });
      acc += dt;
      if (acc < 0.1) return;
      acc = 0;
      const lines = snap.map(
        (w, i) =>
          `${i === 0 ? "●" : "○"} fita ${NAMES[w.band]}  crista u=${w.u.toFixed(3)}  volta ${(w.lap * 100).toFixed(0).padStart(3)}%  percurso ${(w.progress * 100).toFixed(0).padStart(3)}%  amp ${w.amp.toFixed(2)}`,
      );
      panel.textContent = [
        lines.join("\n") || "— em repouso —",
        `ordem: ${waves.order.map((b) => NAMES[b]).join(" → ")}`,
        ...waves.log.slice(-5),
      ].join("\n");
    },
    dispose() {
      markers.forEach((m) => parent.remove(m));
      geo.dispose();
      mats.forEach((m) => m.dispose());
      panel.remove();
    },
  };
}
