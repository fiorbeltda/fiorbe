/**
 * Mola amortecida integrada com Euler semi-implícito e subpassos fixos.
 * A dinâmica depende do tempo real (dt), não da taxa de quadros:
 * 30, 60 ou 120 Hz chegam ao mesmo estado no mesmo intervalo.
 */
export interface Spring {
  value: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;
}

const MAX_STEP = 1 / 240;

export function createSpring(stiffness: number, dampingRatio: number, value = 0): Spring {
  return { value, velocity: 0, target: value, stiffness, damping: 2 * Math.sqrt(stiffness) * dampingRatio };
}

export function stepSpring(s: Spring, dt: number): void {
  let remaining = dt;
  while (remaining > 0) {
    const h = Math.min(remaining, MAX_STEP);
    const accel = -s.stiffness * (s.value - s.target) - s.damping * s.velocity;
    s.velocity += accel * h;
    s.value += s.velocity * h;
    remaining -= h;
  }
}

/** Aproximação exponencial independente de frame rate. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
