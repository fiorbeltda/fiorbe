import { Vector3 } from "three";

/**
 * Espinha da escultura: um nó (2,3) deformado — não um toro.
 * Raio principal, achatamento e profundidade variam ao longo do percurso
 * para que a silhueta tenha lobos de tamanhos diferentes.
 */
export interface SpineSample {
  point: Vector3;
  /** Direção "para dentro" do nó (aponta para o eixo central), antes de ortogonalizar. */
  inward: Vector3;
}

const TAU = Math.PI * 2;

export const SPINE = {
  p: 2,
  q: 3,
  major: 1.5,
  majorWobble: 0.28,
  minor: 0.64,
  stretchX: 1.28,
  stretchY: 0.84,
  depth: 1.4,
  lift: 0.24,
} as const;

/** t em [0, 1) percorre o laço fechado uma vez. */
export function sampleSpine(t: number, out: SpineSample): SpineSample {
  const phi = t * TAU;
  const a = SPINE.p * phi;
  const b = SPINE.q * phi;
  const major = SPINE.major + SPINE.majorWobble * Math.cos(2 * phi + 0.6);
  const ring = major + SPINE.minor * Math.cos(b);

  out.point.set(
    ring * Math.cos(a) * SPINE.stretchX,
    ring * Math.sin(a) * SPINE.stretchY,
    SPINE.minor * Math.sin(b) * SPINE.depth + SPINE.lift * Math.sin(a + 0.4),
  );

  const core = new Vector3(
    major * Math.cos(a) * SPINE.stretchX,
    major * Math.sin(a) * SPINE.stretchY,
    SPINE.lift * Math.sin(a + 0.4),
  );
  out.inward.copy(core).sub(out.point);
  return out;
}

/** Ângulo de torção da fita em torno da tangente (periódico em t). */
export function twistAt(t: number, phase: number): number {
  const phi = t * TAU;
  return 1.05 + 0.62 * Math.sin(3 * phi + 0.8 + phase) + 0.18 * Math.sin(5 * phi + phase * 2);
}

/** Largura total da fita (unidades de cena), com afinamentos suaves. */
export function widthAt(t: number, base: number, phase: number): number {
  const phi = t * TAU;
  const swell = 0.5 + 0.5 * Math.sin(2 * phi - 0.5 + phase);
  return base * (0.58 + 0.42 * swell);
}
