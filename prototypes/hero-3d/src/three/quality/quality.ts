import type { RibbonQuality } from "../sculpture/ribbonGeometry";

export type Tier = "high" | "mid" | "low";

export interface QualityProfile {
  tier: Tier;
  geometry: RibbonQuality;
  maxDpr: number;
  minDpr: number;
  antialias: boolean;
  /** Reflexo da escultura no chão (um draw extra com geometria reduzida). */
  reflections: boolean;
}

const PROFILES: Record<Tier, Omit<QualityProfile, "tier">> = {
  high: { geometry: { segments: 720, across: 12 }, maxDpr: 2, minDpr: 1, antialias: true, reflections: true },
  mid: { geometry: { segments: 520, across: 9 }, maxDpr: 1.5, minDpr: 1, antialias: true, reflections: true },
  low: { geometry: { segments: 320, across: 6 }, maxDpr: 1.25, minDpr: 0.85, antialias: false, reflections: false },
};

/** Estimativa inicial conservadora; a qualidade adaptativa corrige em seguida. */
export function detectTier(): Tier {
  const forced = new URLSearchParams(window.location.search).get("tier");
  if (forced === "high" || forced === "mid" || forced === "low") return forced;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (coarse) return cores >= 8 && memory >= 6 ? "mid" : "low";
  if (cores <= 4 || memory <= 4) return "mid";
  return "high";
}

/**
 * GPU integrada (Intel UHD/Iris, Apple sem M-Pro, Mali/Adreno de entrada):
 * a cena é limitada por preenchimento — medido na UHD 630: DPR 1 ≈ 18 ms,
 * DPR 2 ≈ 40 ms por quadro. Nessas GPUs o DPR fica limitado a 1,25.
 */
function isIntegratedGpu(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? String(gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return /intel|uhd|iris|mali|adreno [1-6]/i.test(name);
  } catch {
    return false;
  }
}

export function profileFor(tier: Tier): QualityProfile {
  const base = PROFILES[tier];
  const forcedDpr = new URLSearchParams(window.location.search).has("fulldpr");
  const maxDpr = !forcedDpr && isIntegratedGpu() ? Math.min(base.maxDpr, 1.25) : base.maxDpr;
  return { tier, ...base, maxDpr };
}

/**
 * DPR adaptativo: mede o custo médio por quadro e ajusta a densidade de pixels
 * em degraus, com histerese, para não oscilar.
 */
export class AdaptiveDpr {
  private samples = 0;
  private sum = 0;
  private cooldown = 0;
  dpr: number;

  constructor(private readonly profile: QualityProfile) {
    this.dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr);
  }

  /** Retorna true quando o DPR mudou. */
  record(frameMs: number): boolean {
    this.sum += Math.min(frameMs, 100);
    this.samples++;
    if (this.cooldown > 0) this.cooldown--;
    if (this.samples < 60 || this.cooldown > 0) return false;
    const avg = this.sum / this.samples;
    this.sum = 0;
    this.samples = 0;
    const ceiling = Math.min(window.devicePixelRatio || 1, this.profile.maxDpr);
    let next = this.dpr;
    if (avg > 24) next = Math.max(this.profile.minDpr, this.dpr - 0.25);
    else if (avg < 12 && this.dpr < ceiling) next = Math.min(ceiling, this.dpr + 0.25);
    if (next === this.dpr) return false;
    this.dpr = next;
    this.cooldown = 120;
    return true;
  }

  get averageHint(): number {
    return this.samples ? this.sum / this.samples : 0;
  }
}
