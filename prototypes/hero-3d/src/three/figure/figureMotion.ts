import {
  AdditiveAnimationBlendMode,
  AnimationClip,
  AnimationMixer,
  AnimationUtils,
  Euler,
  InterpolateSmooth,
  type AnimationAction,
  type Bone,
  Quaternion,
  QuaternionKeyframeTrack,
  Vector3,
  VectorKeyframeTrack,
} from "three";
import type { BoneName, FigureRig } from "./figureRig";
import { createSpring, stepSpring } from "../motion/spring";

const DEG = Math.PI / 180;

/**
 * Movimento da figura em camadas, todas integradas com dt real:
 *
 *  1. pose-base (contrapposto) ............ AnimationAction normal, peso 1
 *  2. respiração ......................... clip ADITIVO; período e intensidade
 *  3. transferência de peso .............. clip ADITIVO;  derivam por ruído suave
 *  4. olhar (cabeça/pescoço) ............. molas criticamente amortecidas com
 *                                          alvos que mudam em intervalos irregulares
 *  5. IK das pernas ...................... CCD de 2 ossos: pés cravados no chão
 *
 * O mixer escreve primeiro (1–3); olhar e IK são pós-processo sobre o resultado,
 * então nenhuma camada disputa a mesma transformação.
 */

const q = (x: number, y: number, z: number) => new Quaternion().setFromEuler(new Euler(x * DEG, y * DEG, z * DEG, "YXZ"));

/** Pose de contemplação: peso na perna direita, cabeça levemente erguida para a escultura (à esquerda). */
const POSE: Partial<Record<BoneName, Quaternion>> = {
  hips: q(0, 3, 2.2),
  spine: q(-1, 2, -0.8),
  chest: q(-1.5, 4, -1.6),
  neck: q(4, 5, 0.5),
  head: q(6, 9, 1),
  shoulderL: q(0, 0, -2),
  shoulderR: q(0, 0, 1),
  upperArmL: q(2, 0, 5),
  upperArmR: q(1, 0, -4),
  foreArmL: q(9, 0, 1),
  foreArmR: q(7, 0, -1),
  handL: q(4, 6, 0),
  handR: q(3, -6, 0),
  thighL: q(-3, -4, -2.5),
  shinL: q(7, 0, 0),
  footL: q(-3, -7, 0),
  thighR: q(0, 2, -2),
  shinR: q(1, 0, 0),
  footR: q(0, 4, 0),
};

/**
 * Ciclo 03: o mesmo contrapposto, legível nesta escala (≈ 80 px de altura). Peso claro na perna
 * direita (quadril inclinado, ombros em contra-inclinação), perna esquerda relaxada um pouco à
 * frente com o joelho solto e o pé aberto, braços levemente afastados do corpo (vão de luz).
 * Nada teatral: ângulos de poucos graus.
 */
const POSE_C03: Partial<Record<BoneName, Quaternion>> = {
  ...POSE,
  hips: q(0, 3, 3.6),
  spine: q(-1, 2, -1.4),
  chest: q(-1.5, 4, -2.3),
  upperArmL: q(2, 0, 9),
  upperArmR: q(1, 0, -8),
  thighL: q(-6, -6, -3),
  shinL: q(11, 0, 0),
  footL: q(-4, -12, 0),
  thighR: q(0, 2, -1.2),
  footR: q(0, 6, 0),
};

function quatTrack(bone: BoneName, times: number[], eulers: Array<[number, number, number]>): QuaternionKeyframeTrack {
  const values: number[] = [];
  eulers.forEach(([x, y, z]) => values.push(...q(x, y, z).toArray()));
  const t = new QuaternionKeyframeTrack(`${bone}.quaternion`, times, values);
  return t;
}

function posTrack(bone: BoneName, base: Vector3, times: number[], offsets: Array<[number, number, number]>): VectorKeyframeTrack {
  const values: number[] = [];
  offsets.forEach(([x, y, z]) => values.push(base.x + x, base.y + y, base.z + z));
  const t = new VectorKeyframeTrack(`${bone}.position`, times, values, InterpolateSmooth);
  return t;
}

/** Ruído suave e determinístico em [-1, 1] (soma de senóides incomensuráveis). */
function drift(t: number, seed: number): number {
  return (
    0.55 * Math.sin(t * 0.131 + seed) +
    0.3 * Math.sin(t * 0.287 + seed * 2.3) +
    0.15 * Math.sin(t * 0.613 + seed * 4.1)
  );
}

export class FigureMotion {
  private readonly mixer: AnimationMixer;
  private readonly breath: AnimationAction;
  private readonly shift: AnimationAction;
  private readonly lookYaw = createSpring(5, 1);
  private readonly lookPitch = createSpring(5, 1);
  private nextLook = 3;
  private ownedReady = false;
  private time = 0;
  private seed = 1;
  private readonly footTargets: Array<{ thigh: Bone; shin: Bone; foot: Bone; local: Vector3; worldQ: Quaternion }> = [];
  /**
   * Ciclo 03 — correção: o AnimationMixer só reescreve um osso quando o valor animado MUDA.
   * Antebraços (pose constante) e cabeça/pescoço com o movimento pausado deixavam de ser
   * reescritos, e as camadas pós-mixer (oscilação das mãos, olhar) multiplicavam por cima a
   * cada quadro — o braço "andava" ~8% da altura da figura nos primeiros segundos. Guardamos
   * o último valor do mixer e o restauramos antes de cada atualização.
   */
  private readonly mixerOwned: Array<{ bone: Bone; value: Quaternion }> | null;

  // temporários
  private readonly vA = new Vector3();
  private readonly vB = new Vector3();
  private readonly vT = new Vector3();
  private readonly qA = new Quaternion();
  private readonly qB = new Quaternion();
  private readonly qLook = new Quaternion();
  private readonly eLook = new Euler(0, 0, 0, "YXZ");

  constructor(
    private readonly rig: FigureRig,
    private readonly reducedMotion: boolean,
    c03 = false,
  ) {
    this.mixer = new AnimationMixer(rig.root);
    const b = rig.bones;
    this.mixerOwned = c03
      ? [b.head, b.neck, b.foreArmL, b.foreArmR].map((bone) => ({ bone, value: new Quaternion() }))
      : null;

    // 1. Pose-base: clip de um quadro.
    const poseTracks = Object.entries(c03 ? POSE_C03 : POSE).map(
      ([name, quat]) => new QuaternionKeyframeTrack(`${name}.quaternion`, [0], quat!.toArray()),
    );
    // Quadril sobre a perna de apoio (a direita); no Ciclo 03 um pouco mais, para o peso ler.
    const hipShift = c03 ? new Vector3(-0.012, -0.006, 0) : new Vector3(-0.007, -0.004, 0);
    poseTracks.push(new VectorKeyframeTrack("hips.position", [0], b.hips.position.clone().add(hipShift).toArray()));
    this.mixer.clipAction(new AnimationClip("pose", -1, poseTracks)).play();

    // 2. Respiração (duração normalizada 1; o ritmo real vem do timeScale).
    // Inspira mais curta que expira; o peito abre, os ombros sobem um fio.
    const bt = [0, 0.38, 1];
    const breathClip = new AnimationClip("breath", 1, [
      quatTrack("chest", bt, [[0, 0, 0], [-1.3, 0, 0], [0, 0, 0]]),
      quatTrack("spine", bt, [[0, 0, 0], [-0.4, 0, 0], [0, 0, 0]]),
      quatTrack("neck", bt, [[0, 0, 0], [0.6, 0, 0], [0, 0, 0]]),
      quatTrack("shoulderL", bt, [[0, 0, 0], [0, 0, 0.9], [0, 0, 0]]),
      quatTrack("shoulderR", bt, [[0, 0, 0], [0, 0, -0.9], [0, 0, 0]]),
      quatTrack("upperArmL", bt, [[0, 0, 0], [0, 0, -0.5], [0, 0, 0]]),
      quatTrack("upperArmR", bt, [[0, 0, 0], [0, 0, 0.5], [0, 0, 0]]),
    ]);
    AnimationUtils.makeClipAdditive(breathClip);
    this.breath = this.mixer.clipAction(breathClip);
    this.breath.blendMode = AdditiveAnimationBlendMode;
    this.breath.play();

    // 3. Transferência de peso: o quadril desloca alguns milímetros e o tronco compensa.
    const st = [0, 0.5, 1];
    const shiftClip = new AnimationClip("shift", 1, [
      posTrack("hips", new Vector3(), st, [[0, 0, 0], [0.011, 0.002, 0], [0, 0, 0]]),
      quatTrack("hips", st, [[0, 0, 0], [0, -1, -1.6], [0, 0, 0]]),
      quatTrack("chest", st, [[0, 0, 0], [0, 0.6, 1.1], [0, 0, 0]]),
      quatTrack("head", st, [[0, 0, 0], [0, 0, 0.5], [0, 0, 0]]),
    ]);
    AnimationUtils.makeClipAdditive(shiftClip);
    this.shift = this.mixer.clipAction(shiftClip);
    this.shift.blendMode = AdditiveAnimationBlendMode;
    this.shift.play();

    // Aplica a pose e registra onde os pés tocam o chão (no espaço da figura).
    this.mixer.update(0);
    rig.root.updateMatrixWorld(true);
    for (const side of ["L", "R"] as const) {
      const foot = b[`foot${side}`];
      const local = foot.getWorldPosition(new Vector3());
      rig.root.worldToLocal(local);
      this.footTargets.push({
        thigh: b[`thigh${side}`],
        shin: b[`shin${side}`],
        foot,
        local,
        worldQ: foot.getWorldQuaternion(new Quaternion()).premultiply(rig.root.getWorldQuaternion(new Quaternion()).invert()),
      });
    }

    if (reducedMotion) {
      this.breath.stop();
      this.shift.stop();
      this.mixer.update(0);
    }
  }

  /** weight: 0..1 — presença do movimento (o scroll a reduz); paused congela. */
  update(dt: number, weight: number, paused: boolean): void {
    if (this.reducedMotion) return;
    const live = paused ? 0 : 1;
    this.time += dt * live;
    const t = this.time;

    // Ritmos que derivam: respiração 4,2–5,4 s; peso 11–17 s, às vezes quase parado.
    const breathPeriod = 4.8 * (1 + 0.12 * drift(t, 0.7));
    this.breath.timeScale = live / breathPeriod;
    this.breath.setEffectiveWeight(weight * (0.85 + 0.18 * drift(t, 2.1)));
    const shiftPeriod = 14 * (1 + 0.2 * drift(t, 3.3));
    this.shift.timeScale = live / shiftPeriod;
    this.shift.setEffectiveWeight(weight * (0.55 + 0.45 * (0.5 + 0.5 * drift(t, 5.9))));
    if (this.mixerOwned && this.ownedReady) for (const o of this.mixerOwned) o.bone.quaternion.copy(o.value);
    this.mixer.update(dt);
    if (this.mixerOwned) {
      for (const o of this.mixerOwned) o.value.copy(o.bone.quaternion);
      this.ownedReady = true;
    }

    // Olhar: novos alvos pequenos em intervalos irregulares; molas criticamente amortecidas.
    if (live) {
      this.nextLook -= dt;
      if (this.nextLook <= 0) {
        this.seed = (this.seed * 16807) % 2147483647;
        const r1 = (this.seed % 1000) / 1000;
        this.seed = (this.seed * 16807) % 2147483647;
        const r2 = (this.seed % 1000) / 1000;
        this.lookYaw.target = (r1 - 0.5) * 9 * DEG;
        this.lookPitch.target = (r2 - 0.4) * 4 * DEG;
        this.nextLook = 5 + r2 * 7;
      }
      stepSpring(this.lookYaw, dt);
      stepSpring(this.lookPitch, dt);
    }
    const b = this.rig.bones;
    this.eLook.set(this.lookPitch.value * 0.6 * weight, this.lookYaw.value * 0.6 * weight, 0);
    b.head.quaternion.multiply(this.qLook.setFromEuler(this.eLook));
    this.eLook.set(this.lookPitch.value * 0.4 * weight, this.lookYaw.value * 0.4 * weight, 0);
    b.neck.quaternion.multiply(this.qLook.setFromEuler(this.eLook));

    // Mãos: oscilação mínima, defasada da respiração.
    const hand = 0.35 * DEG * weight;
    b.foreArmL.quaternion.multiply(this.qLook.setFromEuler(this.eLook.set(hand * drift(t * 1.7, 8.2), 0, 0)));
    b.foreArmR.quaternion.multiply(this.qLook.setFromEuler(this.eLook.set(hand * drift(t * 1.6, 9.4), 0, 0)));

    this.solveFeet();
  }

  /** IK por CCD (canela, depois coxa): devolve cada pé ao ponto de apoio original. */
  private solveFeet(): void {
    const root = this.rig.root;
    root.updateMatrixWorld(true);
    const rootQ = root.getWorldQuaternion(this.qB);
    for (const leg of this.footTargets) {
      this.vT.copy(leg.local);
      root.localToWorld(this.vT);
      for (let it = 0; it < 3; it++) {
        for (const bone of [leg.shin, leg.thigh]) {
          bone.getWorldPosition(this.vA);
          leg.foot.getWorldPosition(this.vB);
          const toEnd = this.vB.sub(this.vA);
          const toTarget = this.vT.clone().sub(this.vA);
          if (toEnd.lengthSq() < 1e-12 || toTarget.lengthSq() < 1e-12) continue;
          const delta = this.qA.setFromUnitVectors(toEnd.normalize(), toTarget.normalize());
          const worldQ = bone.getWorldQuaternion(new Quaternion());
          const parentQ = bone.parent!.getWorldQuaternion(new Quaternion());
          bone.quaternion.copy(parentQ.invert().multiply(delta.multiply(worldQ)));
          bone.updateMatrixWorld(true);
        }
      }
      // O pé mantém a orientação de apoio (sem "rolar" com a perna).
      const wanted = leg.worldQ.clone().premultiply(rootQ);
      const parentQ = leg.foot.parent!.getWorldQuaternion(new Quaternion());
      leg.foot.quaternion.copy(parentQ.invert().multiply(wanted));
    }
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.rig.root);
  }
}
