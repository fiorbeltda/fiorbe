import type { Object3D } from "three";
import type { SculptureUniforms } from "../sculpture/material";

/**
 * Movimento ambiente. Soma de senóides com frequências incomensuráveis:
 * nunca forma um ciclo perceptível. Dono exclusivo de `idleRig`.
 */
export function updateIdle(rig: Object3D, uniforms: SculptureUniforms, time: number, weight: number): void {
  const t = time;
  rig.rotation.y = weight * (0.07 * Math.sin(t * 0.131) + 0.03 * Math.sin(t * 0.293 + 1.3));
  rig.rotation.x = weight * (0.04 * Math.sin(t * 0.171 + 0.4) + 0.015 * Math.sin(t * 0.413));
  rig.rotation.z = weight * 0.022 * Math.sin(t * 0.109 + 2.0);
  rig.position.y = weight * 0.03 * Math.sin(t * 0.23 + 0.7);
  const breathe = 1 + weight * 0.008 * Math.sin(t * 0.47);
  rig.scale.setScalar(breathe);
  uniforms.uIdleAmp.value = weight * 0.014;
}
