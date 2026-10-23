import type { Object3D } from "three";
import { createSpring, stepSpring, type Spring } from "./spring";

const DEG = Math.PI / 180;

/** Limites de exploração; a escultura apoiada no chão pede inclinação mínima. */
export interface InteractionLimits {
  followXDeg: number;
  followYDeg: number;
  pitchLimitDeg: number;
  /** Giro horizontal máximo no arraste; Infinity = livre. */
  yawLimitDeg?: number;
}

const DEFAULT_LIMITS: InteractionLimits = { followXDeg: 4, followYDeg: 8, pitchLimitDeg: 28 };
const MAX_ANGULAR_VELOCITY = 7;
/**
 * Peso no arraste: o ponteiro move um ALVO; a peça o persegue por uma mola rígida e bem
 * amortecida (resposta inicial com massa, sem copiar o ponteiro). Ao soltar, a velocidade
 * da própria mola vira inércia, limitada baixa — peça monumental, não objeto leve.
 */
const DRAG_STIFFNESS = 38;
const DRAG_DAMPING_RATIO = 0.95;
const RELEASE_MAX_VELOCITY = 2.2;
const RETURN_STIFFNESS = 2.4;
const TOUCH_SLOP = 8;

/**
 * Cursor e arraste. Dono exclusivo de `interactionRig`.
 *
 * - Seguir o cursor: alvo limitado (±4° X, ±8° Y) perseguido por molas.
 * - Arrastar: a rotação acompanha o ponteiro; ao soltar, a velocidade
 *   angular medida continua (inércia) e uma mola fraca traz a peça de volta
 *   ao repouso pelo caminho mais curto.
 * - Toque: só gesto horizontal gira; gesto vertical é scroll nativo.
 */
export class InteractionController {
  private readonly followX: Spring = createSpring(16, 0.82);
  private readonly followY: Spring = createSpring(16, 0.82);
  private readonly yaw: Spring = createSpring(RETURN_STIFFNESS, 0.92);
  private readonly pitch: Spring = createSpring(RETURN_STIFFNESS, 0.95);
  /** Alvo do arraste (o ponteiro move o alvo; a mola move a peça). */
  private dragYaw = 0;
  private dragPitch = 0;
  /** 0..1 — presença do cursor sobre o palco (reação local). */
  readonly presence: Spring = createSpring(10, 1);

  /** Coordenadas do ponteiro em pixels de viewport (para o raycast local). */
  pointerX = -1;
  pointerY = -1;
  /** Velocidade do ponteiro (px/s), suavizada e decaindo quando ele para. */
  pointerSpeed = 0;
  /**
   * Mouse: o arraste só começa sobre a escultura (o motor responde pelo raycast).
   * Sem isso, qualquer ponto vazio do palco girava a peça.
   */
  canGrab: ((x: number, y: number) => boolean) | null = null;
  private moveT = 0;

  private nx = 0;
  private ny = 0;
  private hovering = false;
  private dragging = false;
  private pending: { id: number; x: number; y: number } | null = null;
  private activeId: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private lastT = 0;
  private enabled = true;
  private readonly cleanup: Array<() => void> = [];

  private readonly followXMax: number;
  private readonly followYMax: number;
  private readonly pitchLimit: number;
  private readonly yawLimit: number;

  constructor(
    private readonly stage: HTMLElement,
    limits: InteractionLimits = DEFAULT_LIMITS,
  ) {
    this.followXMax = limits.followXDeg * DEG;
    this.followYMax = limits.followYDeg * DEG;
    this.pitchLimit = limits.pitchLimitDeg * DEG;
    this.yawLimit = (limits.yawLimitDeg ?? Infinity) * DEG;
    const on = <K extends keyof WindowEventMap>(target: Window | HTMLElement, type: K, fn: (e: WindowEventMap[K]) => void) => {
      target.addEventListener(type, fn as EventListener, { passive: true });
      this.cleanup.push(() => target.removeEventListener(type, fn as EventListener));
    };

    on(window, "pointermove", (e) => this.onMove(e));
    on(stage, "pointerdown", (e) => this.onDown(e));
    on(window, "pointerup", (e) => this.onUp(e));
    on(window, "pointercancel", (e) => this.onUp(e));
    on(stage, "pointerenter", () => (this.hovering = true));
    on(stage, "pointerleave", () => (this.hovering = false));
    on(document.documentElement as unknown as HTMLElement, "pointerleave", () => {
      this.nx = 0;
      this.ny = 0;
      this.hovering = false;
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.endDrag();
  }

  private onMove(e: PointerEvent): void {
    const t = e.timeStamp / 1000;
    if (this.pointerX >= 0 && t > this.moveT) {
      const v = Math.hypot(e.clientX - this.pointerX, e.clientY - this.pointerY) / Math.max(t - this.moveT, 1 / 240);
      this.pointerSpeed = Math.min(6000, 0.6 * this.pointerSpeed + 0.4 * v);
    }
    this.moveT = t;
    this.pointerX = e.clientX;
    this.pointerY = e.clientY;
    if (e.pointerType === "mouse") {
      this.nx = (e.clientX / window.innerWidth) * 2 - 1;
      this.ny = (e.clientY / window.innerHeight) * 2 - 1;
    }

    if (this.pending && e.pointerId === this.pending.id && !this.dragging) {
      const dx = e.clientX - this.pending.x;
      const dy = e.clientY - this.pending.y;
      if (Math.abs(dx) > TOUCH_SLOP && Math.abs(dx) > Math.abs(dy) * 1.2) {
        this.beginDrag(e);
      } else if (Math.abs(dy) > TOUCH_SLOP) {
        this.pending = null;
      }
      return;
    }

    if (!this.dragging || e.pointerId !== this.activeId) return;
    const now = e.timeStamp / 1000;
    const dYaw = (e.clientX - this.lastX) * 0.0062;
    const dPitch = (e.clientY - this.lastY) * 0.0042;
    // Limite elástico: perto do limite o arraste rende cada vez menos.
    const room = Number.isFinite(this.yawLimit) ? Math.max(0, 1 - Math.abs(this.dragYaw + dYaw) / this.yawLimit) : 1;
    this.dragYaw += dYaw * (Math.sign(dYaw) === Math.sign(this.dragYaw) ? room : 1);
    this.dragPitch = Math.max(-this.pitchLimit, Math.min(this.pitchLimit, this.dragPitch + dPitch));
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.lastT = now;
  }

  private onDown(e: PointerEvent): void {
    if (!this.enabled) return;
    // Controles dentro do palco (ex.: Pausar) recebem o clique normalmente.
    if (e.target instanceof Element && e.target.closest("button, a")) return;
    if (e.pointerType === "mouse") {
      if (e.button !== 0) return;
      if (this.canGrab && !this.canGrab(e.clientX, e.clientY)) return;
      this.beginDrag(e);
    } else {
      this.pending = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  }

  private beginDrag(e: PointerEvent): void {
    this.dragging = true;
    this.pending = null;
    this.activeId = e.pointerId;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.lastT = e.timeStamp / 1000;
    this.dragYaw = this.yaw.value;
    this.dragPitch = this.pitch.value;
    setSpringRate(this.yaw, DRAG_STIFFNESS, DRAG_DAMPING_RATIO);
    setSpringRate(this.pitch, DRAG_STIFFNESS, DRAG_DAMPING_RATIO);
    try {
      this.stage.setPointerCapture(e.pointerId);
    } catch {
      /* captura pode falhar se o ponteiro já saiu; o arraste segue pelo window */
    }
    this.stage.dataset.dragging = "true";
  }

  private onUp(e: PointerEvent): void {
    if (this.pending && e.pointerId === this.pending.id) this.pending = null;
    if (!this.dragging || e.pointerId !== this.activeId) return;
    // Soltou parado (sem movimento recente): sem arremesso.
    if (e.timeStamp / 1000 - this.lastT > 0.08) {
      this.yaw.velocity *= 0.3;
      this.pitch.velocity *= 0.3;
    }
    this.endDrag();
  }

  private endDrag(): void {
    if (this.activeId !== null && this.stage.hasPointerCapture?.(this.activeId)) {
      this.stage.releasePointerCapture(this.activeId);
    }
    this.dragging = false;
    this.activeId = null;
    this.pending = null;
    setSpringRate(this.yaw, RETURN_STIFFNESS, 0.92);
    setSpringRate(this.pitch, RETURN_STIFFNESS, 0.95);
    this.yaw.velocity = Math.max(-RELEASE_MAX_VELOCITY, Math.min(RELEASE_MAX_VELOCITY, this.yaw.velocity));
    this.pitch.velocity = Math.max(-RELEASE_MAX_VELOCITY, Math.min(RELEASE_MAX_VELOCITY, this.pitch.velocity));
    this.yaw.value = Math.atan2(Math.sin(this.yaw.value), Math.cos(this.yaw.value));
    delete this.stage.dataset.dragging;
  }

  /** weight: 0..1 — o scroll reduz a influência da interação. */
  update(dt: number, rig: Object3D, weight: number): void {
    const follow = this.enabled ? weight : 0;
    this.followX.target = -this.ny * this.followXMax * follow;
    this.followY.target = this.nx * this.followYMax * follow;
    stepSpring(this.followX, dt);
    stepSpring(this.followY, dt);

    if (this.dragging) {
      this.yaw.target = this.dragYaw;
      this.pitch.target = this.dragPitch;
      stepSpring(this.yaw, dt);
      stepSpring(this.pitch, dt);
      this.yaw.velocity = clampVel(this.yaw.velocity);
    } else {
      this.yaw.target = 0;
      this.pitch.target = 0;
      stepSpring(this.yaw, dt);
      stepSpring(this.pitch, dt);
      // A inércia não atravessa o limite: encosta nele e perde a velocidade.
      if (Math.abs(this.yaw.value) > this.yawLimit) {
        this.yaw.value = Math.sign(this.yaw.value) * this.yawLimit;
        this.yaw.velocity = 0;
      }
    }

    this.pointerSpeed *= Math.exp(-6 * dt);
    this.presence.target = this.enabled && (this.hovering || this.dragging) ? weight : 0;
    stepSpring(this.presence, dt);

    rig.rotation.x = this.followX.value + this.pitch.value * weight;
    rig.rotation.y = this.followY.value + this.yaw.value * weight;
  }

  /** Ponteiro sobre o palco (não sobre a página fora dele). */
  get isHovering(): boolean {
    return this.hovering;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  dispose(): void {
    this.endDrag();
    this.cleanup.forEach((fn) => fn());
  }
}

function setSpringRate(s: Spring, stiffness: number, dampingRatio: number): void {
  s.stiffness = stiffness;
  s.damping = 2 * Math.sqrt(stiffness) * dampingRatio;
}

function clampVel(v: number): number {
  return Math.max(-MAX_ANGULAR_VELOCITY, Math.min(MAX_ANGULAR_VELOCITY, v));
}
