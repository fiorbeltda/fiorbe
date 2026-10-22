import type { Contact } from "../sculpture/ribbonSpace";

/**
 * Diretor das ondas — único dono dos uniformes uWaveC / uWaveAmp / uWavePh.
 *
 * Cada onda vive numa fita: o centro avança com velocidade V ao longo do
 * comprimento de arco, nasce e morre suavemente e percorre ~60% da fita.
 * Ao cruzar um ponto de contato com outra fita, inicia uma onda nela
 * (revezamento). Tudo é função do tempo acumulado com dt real: o mesmo
 * instante produz o mesmo estado a 30, 60 ou 120 Hz.
 */
export interface WaveParams {
  /** Velocidade do envelope (unidades locais/s). */
  speed: number;
  /** ω da portadora (rad/s). */
  omega: number;
  /** Fração do comprimento percorrida por onda. */
  travel: number;
  fadeIn: number;
  fadeOut: number;
  /** Pausa entre cadeias (s): mínimo e variação. */
  gapMin: number;
  gapRange: number;
  /** Fitas que não recebem onda (ex.: o fio fino). */
  skip: number[];
  maxActive: number;
}

export const DEFAULT_WAVE: WaveParams = {
  speed: 1.05,
  omega: 4.2,
  travel: 0.62,
  fadeIn: 0.9,
  fadeOut: 1.4,
  gapMin: 1.6,
  gapRange: 2.4,
  skip: [5],
  maxActive: 2,
};

interface Wave {
  band: number;
  /** Centro em unidades de arco. */
  center: number;
  dir: 1 | -1;
  age: number;
  life: number;
  /** Contatos já usados por esta onda. */
  used: Set<number>;
}

export interface WaveUniforms {
  uWaveC: { value: number[] };
  uWaveAmp: { value: number[] };
  uWavePh: { value: number[] };
}

export class WaveDirector {
  private waves: Wave[] = [];
  private gap = 1.2;
  private seed = 9;
  private lastBand = -1;
  /** Energia 0..1 de cada fita (para sincronizar luz, se desejado). */
  readonly energy: number[];

  constructor(
    private readonly lengths: number[],
    private readonly contacts: Contact[][],
    private readonly uniforms: WaveUniforms,
    private readonly params: WaveParams = DEFAULT_WAVE,
  ) {
    this.energy = lengths.map(() => 0);
  }

  private rand(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  private spawn(band: number, centerU: number, dir: 1 | -1): void {
    const L = this.lengths[band]!;
    this.waves.push({ band, center: centerU * L, dir, age: 0, life: (this.params.travel * L) / this.params.speed, used: new Set() });
  }

  private startChain(): void {
    const candidates = this.lengths.map((_, i) => i).filter((i) => !this.params.skip.includes(i) && i !== this.lastBand);
    const band = candidates[Math.floor(this.rand() * candidates.length)]!;
    this.lastBand = band;
    this.spawn(band, this.rand(), this.rand() < 0.5 ? 1 : -1);
  }

  /** weight: 0..1 (o scroll reduz); paused congela o tempo das ondas. */
  update(dt: number, weight: number, paused: boolean): void {
    const p = this.params;
    const step = paused ? 0 : dt;

    if (step > 0) {
      if (this.waves.length === 0) {
        this.gap -= step;
        if (this.gap <= 0) {
          this.startChain();
          this.gap = p.gapMin + this.rand() * p.gapRange;
        }
      }

      for (const w of this.waves) {
        const L = this.lengths[w.band]!;
        const before = w.center;
        w.center = (((w.center + w.dir * p.speed * step) % L) + L) % L;
        w.age += step;
        // Revezamento: o centro cruzou um ponto de contato?
        for (const c of this.contacts[w.band] ?? []) {
          if (this.waves.length >= p.maxActive || p.skip.includes(c.other) || w.used.has(c.other)) continue;
          if (this.waves.some((o) => o.band === c.other)) continue;
          const cs = c.u * L;
          if (crossed(before, w.center, cs, w.dir, L) && w.age > p.fadeIn) {
            w.used.add(c.other);
            const dir = (c.sameDirection ? w.dir : -w.dir) as 1 | -1;
            this.spawn(c.other, c.otherU, dir);
            this.lastBand = c.other;
          }
        }
      }
      this.waves = this.waves.filter((w) => w.age < w.life);
    }

    // Escreve uniformes (uma onda por fita; ondas mortas = amplitude 0).
    const C = this.uniforms.uWaveC.value;
    const A = this.uniforms.uWaveAmp.value;
    const P = this.uniforms.uWavePh.value;
    for (let i = 0; i < A.length; i++) A[i] = 0;
    for (const w of this.waves) {
      const fin = smooth(0, p.fadeIn, w.age);
      const fout = 1 - smooth(w.life - p.fadeOut, w.life, w.age);
      C[w.band] = w.center;
      A[w.band] = fin * fout * weight;
      P[w.band] = p.omega * w.age * w.dir;
    }
    for (let i = 0; i < A.length; i++) this.energy[i] = A[i]!;
  }

  get activeCount(): number {
    return this.waves.length;
  }

  /** Debug: estado das ondas. */
  snapshot(): Array<{ band: number; u: number; age: number; life: number }> {
    return this.waves.map((w) => ({ band: w.band, u: +(w.center / this.lengths[w.band]!).toFixed(3), age: +w.age.toFixed(2), life: +w.life.toFixed(2) }));
  }
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** O centro passou por `target` neste passo (considerando a volta do laço)? */
function crossed(before: number, after: number, target: number, dir: 1 | -1, L: number): boolean {
  const travelled = (((after - before) * dir) % L + L) % L;
  const toTarget = (((target - before) * dir) % L + L) % L;
  return toTarget > 0 && toTarget <= travelled;
}
