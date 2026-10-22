import type { Object3D } from "three";
import { createSpring, stepSpring, type Spring } from "./spring";

const DEG = Math.PI / 180;
const FOLLOW_X = 4 * DEG;
const FOLLOW_Y = 8 * DEG;
const PITCH_LIMIT = 28 * DEG;
const MAX_ANGULAR_VELOCITY = 7;
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
  private readonly yaw: Spring = createSpring(2.4, 0.92);
  private readonly pitch: Spring = createSpring(2.4, 0.95);
  /** 0..1 — presença do cursor sobre o palco (reação local). */
  readonly presence: Spring = createSpring(10, 1);

  /** Coordenadas do ponteiro em pixels de viewport (para o raycast local). */
  pointerX = -1;
  pointerY = -1;

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

  constructor(private readonly stage: HTMLElement) {
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
    const dt = Math.max(now - this.lastT, 1 / 240);
    const dYaw = (e.clientX - this.lastX) * 0.0062;
    const dPitch = (e.clientY - this.lastY) * 0.0042;
    this.yaw.value += dYaw;
    this.pitch.value = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch.value + dPitch));
    this.yaw.velocity = 0.65 * this.yaw.velocity + 0.35 * clampVel(dYaw / dt);
    this.pitch.velocity = 0.65 * this.pitch.velocity + 0.35 * clampVel(dPitch / dt);
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
    this.yaw.velocity = 0;
    this.pitch.velocity = 0;
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
    if (e.timeStamp / 1000 - this.lastT > 0.08) {
      this.yaw.velocity = 0;
      this.pitch.velocity = 0;
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
    this.yaw.value = Math.atan2(Math.sin(this.yaw.value), Math.cos(this.yaw.value));
    delete this.stage.dataset.dragging;
  }

  /** weight: 0..1 — o scroll reduz a influência da interação. */
  update(dt: number, rig: Object3D, weight: number): void {
    const follow = this.enabled ? weight : 0;
    this.followX.target = -this.ny * FOLLOW_X * follow;
    this.followY.target = this.nx * FOLLOW_Y * follow;
    stepSpring(this.followX, dt);
    stepSpring(this.followY, dt);

    if (!this.dragging) {
      this.yaw.target = 0;
      this.pitch.target = 0;
      stepSpring(this.yaw, dt);
      stepSpring(this.pitch, dt);
    }

    this.presence.target = this.enabled && (this.hovering || this.dragging) ? weight : 0;
    stepSpring(this.presence, dt);

    rig.rotation.x = this.followX.value + this.pitch.value * weight;
    rig.rotation.y = this.followY.value + this.yaw.value * weight;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  dispose(): void {
    this.endDrag();
    this.cleanup.forEach((fn) => fn());
  }
}

function clampVel(v: number): number {
  return Math.max(-MAX_ANGULAR_VELOCITY, Math.min(MAX_ANGULAR_VELOCITY, v));
}
