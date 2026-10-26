import { damp, smoothstep } from "./spring";

/**
 * Timeline única ligada ao progresso real do scroll. Sem pin: o canvas é
 * fixo e o conteúdo rola por cima normalmente. Reversível por construção —
 * todo estado é função de `progress`, nunca acumulado.
 *
 *   0.00  Entrada: escultura íntegra, texto do hero legível
 *   0.10  Início da rolagem: a peça gira, encolhe e sobe
 *   0.35  Transição: as fitas começam a desenrolar em fluxos
 *   1.00  Saída: os fluxos assentam sobre a régua do manifesto
 */
export interface TimelineState {
  /** Progresso suavizado 0..1. */
  progress: number;
  /** Quanto o hero ainda é dono da cena (interação/idle). */
  heroWeight: number;
  /** 0..1 — orientação/escala/posição da escultura. */
  recompose: number;
  /** 0..1 — desenrolar em fluxos. */
  flow: number;
  /** 0..1 — passagem do canvas para as linhas do DOM. */
  handoff: number;
  /** Posição da régua de destino no viewport (px). */
  ruleViewportY: number;
}

export class ScrollTimeline {
  private raw = 0;
  /** Scroll (px) em que a transição começa. 0 no desktop; no layout empilhado, depois de o conteúdo do hero ser lido. */
  start = 0;
  /** Início efetivo (limitado a metade do percurso), lido pelo motor. */
  startScroll = 0;
  readonly state: TimelineState = { progress: 0, heroWeight: 1, recompose: 0, flow: 0, handoff: 0, ruleViewportY: 0 };

  constructor(private readonly rule: HTMLElement) {}

  /** Lê o DOM uma vez por quadro (sem listeners de scroll). */
  measure(): void {
    const ruleTop = this.rule.getBoundingClientRect().top;
    const vh = window.innerHeight;
    const landing = vh * 0.38;
    const end = Math.max(1, ruleTop + window.scrollY - landing);
    const start = Math.min(this.start, end * 0.5);
    this.startScroll = start;
    this.raw = Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
    this.state.ruleViewportY = ruleTop;
  }

  update(dt: number, instant = false): TimelineState {
    const s = this.state;
    s.progress = instant ? this.raw : damp(s.progress, this.raw, 14, dt);
    const p = s.progress;
    s.heroWeight = 1 - smoothstep(0.04, 0.3, p);
    s.recompose = smoothstep(0.06, 0.6, p);
    s.flow = smoothstep(0.3, 0.98, p);
    s.handoff = smoothstep(0.93, 1.0, p);
    return s;
  }
}
