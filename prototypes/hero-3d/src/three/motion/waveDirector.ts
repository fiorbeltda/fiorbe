/**
 * Diretor das ondas — único dono dos uniformes uWaveC / uWaveAmp / uWavePh / uWaveBand.
 *
 * A escultura é uma fita contínua fechada: as ondas simplesmente circulam
 * por ela, sem início nem fim de percurso e sem trocar de peça. `count`
 * ondas igualmente espaçadas (L/count) avançam juntas; a energia nasce
 * suavemente ao carregar e "respira" devagar (nunca some no meio do corpo).
 *
 * O avanço é distância acumulada com dt real (independe da taxa de quadros);
 * a fase da portadora também é função da distância, e a posição é contínua
 * na emenda u=1→0 (o shader usa distância periódica).
 */
export interface WaveParams {
  /** Velocidade da crista (unidades locais/s). */
  speed: number;
  /** ω da portadora (rad/s). */
  omega: number;
  /** Ondas simultâneas, igualmente espaçadas no percurso. */
  count: number;
  /** Nascimento da energia ao carregar (s). */
  fadeIn: number;
  /** Respiração: profundidade (0..1) e período (s). */
  breathe: number;
  breathePeriod: number;
}

export const DEFAULT_WAVE: WaveParams = {
  speed: 1.7,
  omega: 4.4,
  count: 2,
  fadeIn: 1.6,
  breathe: 0.2,
  breathePeriod: 11,
};

export interface WaveUniforms {
  uWaveC: { value: number[] };
  uWaveAmp: { value: number[] };
  uWavePh: { value: number[] };
  uWaveBand: { value: number[] };
}

export interface WaveSnapshot {
  slot: number;
  /** Crista em fração do comprimento (0..1). */
  u: number;
  /** Progresso da volta atual (0..1) e voltas completas. */
  lap: number;
  laps: number;
  amp: number;
}

export class WaveDirector {
  private travelled = 0;
  private clock = 0;
  private readonly L: number;

  constructor(
    lengths: number[],
    private readonly band: number,
    private readonly uniforms: WaveUniforms,
    private readonly params: WaveParams = DEFAULT_WAVE,
  ) {
    this.L = lengths[band]!;
  }

  private amplitude(slot: number): number {
    const p = this.params;
    const birth = smooth(0, p.fadeIn, this.clock - slot * 0.5);
    const breath = 1 - p.breathe * (0.5 - 0.5 * Math.cos((this.clock / p.breathePeriod) * Math.PI * 2 + slot * Math.PI));
    return birth * breath;
  }

  /** weight: 0..1 (o scroll reduz); paused congela o tempo das ondas. */
  update(dt: number, weight: number, paused: boolean): void {
    const p = this.params;
    const step = paused ? 0 : Math.min(dt, 0.1);
    this.clock += step;
    this.travelled += p.speed * step;

    const { uWaveC: C, uWaveAmp: A, uWavePh: P, uWaveBand: B } = this.uniforms;
    for (let k = 0; k < A.value.length; k++) {
      const active = k < p.count;
      B.value[k] = active ? this.band : -1;
      C.value[k] = mod(this.travelled + (k * this.L) / p.count, this.L);
      A.value[k] = active ? this.amplitude(k) * weight : 0;
      // Fase pela distância (não pelo tempo): mesma forma a qualquer taxa de quadros.
      P.value[k] = (p.omega / p.speed) * this.travelled;
    }
  }

  /** Debug: estado das ondas. */
  snapshot(): WaveSnapshot[] {
    return Array.from({ length: this.params.count }, (_, k) => {
      const s = this.travelled + (k * this.L) / this.params.count;
      return {
        slot: k,
        u: +(mod(s, this.L) / this.L).toFixed(3),
        lap: +(mod(this.travelled, this.L) / this.L).toFixed(3),
        laps: Math.floor(this.travelled / this.L),
        amp: +this.amplitude(k).toFixed(2),
      };
    });
  }

  /** Debug: avança o tempo das ondas sem renderizar (capturas determinísticas). */
  advance(seconds: number, stepS = 1 / 60): void {
    for (let t = 0; t < seconds; t += stepS) this.update(stepS, 1, false);
  }

  /** Debug: posiciona a primeira crista numa fração exata da volta. */
  seekLap(fraction: number): void {
    this.travelled = Math.floor(this.travelled / this.L) * this.L + fraction * this.L;
    this.clock = Math.max(this.clock, this.params.fadeIn + 1);
    this.update(0, 1, false);
  }

  get length(): number {
    return this.L;
  }
}

function mod(x: number, m: number): number {
  return ((x % m) + m) % m;
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
