import type { Contact } from "../sculpture/ribbonSpace";

/**
 * Diretor das ondas — único dono dos uniformes uWaveC / uWaveAmp / uWavePh.
 *
 * Revezamento em volta completa: a onda nasce no ponto de transferência
 * vindo da fita anterior, percorre a fita INTEIRA (uma volta = L em
 * comprimento de arco, mais o trecho de nascimento para que ele também seja
 * percorrido em amplitude plena) e segue até o ponto de contato com a
 * próxima fita. Só então transfere: a próxima nasce no ponto correspondente
 * enquanto esta se apaga ali (cruzamento suave de amplitudes).
 *
 * O avanço é distância acumulada com dt real (independe da taxa de quadros);
 * a posição é contínua na emenda u=1→0 (o shader usa distância periódica).
 */
export interface WaveParams {
  /** Velocidade da crista (unidades locais/s). */
  speed: number;
  /** ω da portadora (rad/s). */
  omega: number;
  /** Distâncias (arco) de nascimento e de apagamento. */
  fadeIn: number;
  fadeOut: number;
  /** Fitas encadeadas por ciclo; depois, pausa. */
  chain: number;
  /** Pausa entre ciclos (s). */
  rest: number;
  /** Fitas que não recebem onda (o fio fino). */
  skip: number[];
}

export const DEFAULT_WAVE: WaveParams = {
  speed: 1.25,
  omega: 3.6,
  fadeIn: 1.4,
  fadeOut: 1.4,
  chain: 5,
  rest: 2.5,
  skip: [5],
};

interface Wave {
  band: number;
  dir: 1 | -1;
  /** Ponto de entrada (arco). */
  start: number;
  /** Distância já percorrida e total a percorrer. */
  travelled: number;
  total: number;
  /** Próxima fita (ou -1) e ponto de saída nesta fita. */
  next: Contact | null;
  handed: boolean;
}

export interface WaveUniforms {
  uWaveC: { value: number[] };
  uWaveAmp: { value: number[] };
  uWavePh: { value: number[] };
}

export interface WaveSnapshot {
  band: number;
  /** Crista em fração do comprimento (0..1). */
  u: number;
  /** Progresso da volta (0..1 = uma volta inteira). */
  lap: number;
  /** Progresso do percurso total até a transferência. */
  progress: number;
  amp: number;
}

const NAMES = "ABCDEF";

export class WaveDirector {
  private waves: Wave[] = [];
  private seed = 9;
  private restLeft = 0.8;
  /** Fitas já visitadas no ciclo atual. */
  private cycle: number[] = [];
  private clock = 0;
  /** Ordem de ativação e instantes de transferência (debug). */
  readonly log: string[] = [];
  readonly order: number[] = [];
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

  /**
   * Próxima fita: entre os vizinhos ainda não visitados no ciclo, o ponto de
   * saída que chega primeiro depois da volta completa (percurso mais curto).
   */
  private pickNext(band: number, afterBase: number, dir: 1 | -1): { contact: Contact; extra: number } | null {
    if (this.cycle.length >= this.params.chain) return null;
    const L = this.lengths[band]!;
    let best: { contact: Contact; extra: number } | null = null;
    for (const c of this.contacts[band] ?? []) {
      if (this.params.skip.includes(c.other) || this.cycle.includes(c.other)) continue;
      const extra = mod((c.u * L - afterBase) * dir, L);
      if (!best || extra < best.extra) best = { contact: c, extra };
    }
    return best;
  }

  private spawn(band: number, startU: number, dir: 1 | -1): void {
    const L = this.lengths[band]!;
    const start = startU * L;
    this.cycle.push(band);
    const p = this.params;
    // Volta inteira + trecho de nascimento; depois até o ponto de saída.
    const base = L + p.fadeIn;
    const pick = this.pickNext(band, start + dir * base, dir);
    const next = pick?.contact ?? null;
    const total = base + (pick?.extra ?? 0);
    this.waves.push({ band, dir, start, travelled: 0, total, next, handed: false });
    this.order.push(band);
    this.log.push(`${this.clock.toFixed(1)}s nasce ${NAMES[band]} u=${startU.toFixed(3)} ${dir > 0 ? "→" : "←"} percurso ${(total / L).toFixed(2)} voltas`);
    if (this.log.length > 12) this.log.shift();
  }

  private startCycle(): void {
    const candidates = this.lengths.map((_, i) => i).filter((i) => !this.params.skip.includes(i) && i !== this.order.at(-1));
    const band = candidates[Math.floor(this.rand() * candidates.length)]!;
    this.cycle = [];
    // Começa num ponto de contato (cruzamento), não em lugar arbitrário.
    const c = (this.contacts[band] ?? [])[0];
    this.spawn(band, c ? c.u : this.rand(), this.rand() < 0.5 ? 1 : -1);
  }

  private amplitude(w: Wave): number {
    const p = this.params;
    return smooth(0, p.fadeIn, w.travelled) * (1 - smooth(w.total - p.fadeOut, w.total, w.travelled));
  }

  /** weight: 0..1 (o scroll reduz); paused congela o tempo das ondas. */
  update(dt: number, weight: number, paused: boolean): void {
    const p = this.params;
    const step = paused ? 0 : Math.min(dt, 0.1);

    if (step > 0) {
      this.clock += step;
      if (this.waves.length === 0) {
        this.restLeft -= step;
        if (this.restLeft <= 0) this.startCycle();
      }
      for (const w of this.waves.slice()) {
        w.travelled = Math.min(w.total, w.travelled + p.speed * step);
        // Transferência: a crista chega ao ponto de saída; a próxima nasce ali
        // enquanto esta se apaga (fadeOut) — energia passa sem salto.
        if (!w.handed && w.next && w.travelled >= w.total - p.fadeOut * 0.5) {
          w.handed = true;
          const c = w.next;
          const nextDir = (c.sameDirection ? w.dir : -w.dir) as 1 | -1;
          this.log.push(`${this.clock.toFixed(1)}s transfere ${NAMES[w.band]}→${NAMES[c.other]}`);
          this.spawn(c.other, c.otherU, nextDir);
        }
      }
      const before = this.waves.length;
      this.waves = this.waves.filter((w) => w.travelled < w.total);
      if (before > 0 && this.waves.length === 0) this.restLeft = p.rest;
    }

    const C = this.uniforms.uWaveC.value;
    const A = this.uniforms.uWaveAmp.value;
    const P = this.uniforms.uWavePh.value;
    for (let i = 0; i < A.length; i++) A[i] = 0;
    for (const w of this.waves) {
      const L = this.lengths[w.band]!;
      C[w.band] = mod(w.start + w.dir * w.travelled, L);
      A[w.band] = this.amplitude(w) * weight;
      // Fase pela distância (não pelo tempo): o mesmo ponto do percurso tem
      // sempre a mesma forma, a qualquer taxa de quadros.
      P[w.band] = (p.omega / p.speed) * w.travelled * w.dir;
    }
    for (let i = 0; i < A.length; i++) this.energy[i] = A[i]!;
  }

  get activeCount(): number {
    return this.waves.length;
  }

  /** Debug: estado das ondas ativas. */
  snapshot(): WaveSnapshot[] {
    return this.waves.map((w) => {
      const L = this.lengths[w.band]!;
      return {
        band: w.band,
        u: +(mod(w.start + w.dir * w.travelled, L) / L).toFixed(3),
        lap: +Math.min(1, w.travelled / L).toFixed(3),
        progress: +(w.travelled / w.total).toFixed(3),
        amp: +this.amplitude(w).toFixed(2),
      };
    });
  }

  /** Debug: avança o tempo das ondas sem renderizar (para capturas determinísticas). */
  advance(seconds: number, stepS = 1 / 60): void {
    for (let t = 0; t < seconds; t += stepS) this.update(stepS, 1, false);
  }
}

function mod(x: number, m: number): number {
  return ((x % m) + m) % m;
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
