import { Vector3, type CatmullRomCurve3 } from "three";

/**
 * Pontos de maior proximidade entre fitas independentes. É por eles que a
 * onda "passa o bastão" de uma fita para outra: as fitas não têm
 * continuidade geométrica, então o revezamento acontece onde quase se tocam.
 */
export interface Contact {
  /** Posição na fita de origem (fração 0..1 do comprimento). */
  u: number;
  other: number;
  /** Posição na fita vizinha (fração 0..1). */
  otherU: number;
  /** Sentido coerente: +1 se as tangentes apontam para o mesmo lado. */
  sameDirection: boolean;
  distance: number;
}

export function computeContacts(curves: CatmullRomCurve3[], maxDistance: number, samples = 180): Contact[][] {
  const pts = curves.map((c) => Array.from({ length: samples }, (_, i) => c.getPointAt(i / samples, new Vector3())));
  const contacts: Contact[][] = curves.map(() => []);
  const ta = new Vector3();
  const tb = new Vector3();
  for (let a = 0; a < curves.length; a++) {
    for (let b = a + 1; b < curves.length; b++) {
      let best = Infinity;
      let ia = 0;
      let ib = 0;
      for (let i = 0; i < samples; i++) {
        for (let j = 0; j < samples; j++) {
          const d = pts[a]![i]!.distanceToSquared(pts[b]![j]!);
          if (d < best) {
            best = d;
            ia = i;
            ib = j;
          }
        }
      }
      const distance = Math.sqrt(best);
      if (distance > maxDistance) continue;
      curves[a]!.getTangentAt(ia / samples, ta);
      curves[b]!.getTangentAt(ib / samples, tb);
      const same = ta.dot(tb) >= 0;
      contacts[a]!.push({ u: ia / samples, other: b, otherU: ib / samples, sameDirection: same, distance });
      contacts[b]!.push({ u: ib / samples, other: a, otherU: ia / samples, sameDirection: same, distance });
    }
  }
  return contacts;
}
