import { BufferAttribute, BufferGeometry, Color, Vector3 } from "three";
import { sampleSpine, twistAt, widthAt, type SpineSample } from "./curves";

/**
 * Uma fita = varredura de um segmento de reta ao longo da espinha, com
 * referencial "para dentro" ortogonalizado, torção periódica, largura variável
 * e seção levemente côncava (fita de metal, não papel).
 *
 * Várias fitas compartilham a mesma espinha e são empilhadas ao longo da
 * normal — camadas que nunca se cruzam, como na referência.
 */
export interface BandSpec {
  width: number;
  /** Deslocamento ao longo da normal da fita principal. */
  offsetN: number;
  /** Deslocamento lateral. */
  offsetW: number;
  twistPhase: number;
  widthPhase: number;
  colorPhase: number;
  cup: number;
}

// Camadas laminadas: larguras decrescentes, pouco afastadas — leem como uma
// única fita espessa com bordas escalonadas, não como fios paralelos.
export const BANDS: readonly BandSpec[] = [
  { width: 1.05, offsetN: 0, offsetW: 0, twistPhase: 0, widthPhase: 0, colorPhase: 0, cup: 0.2 },
  { width: 0.82, offsetN: 0.026, offsetW: 0.07, twistPhase: 0.008, widthPhase: 0.35, colorPhase: 0.08, cup: 0.19 },
  { width: 0.56, offsetN: 0.052, offsetW: 0.13, twistPhase: 0.016, widthPhase: 0.7, colorPhase: 0.16, cup: 0.17 },
];

/** Paleta cíclica ao longo da fita (candidata da síntese, não aprovada). */
const STOPS = ["#1a3cc8", "#2f6bff", "#3cc6e6", "#2bbfa8", "#2350e0"].map((hex) => new Color(hex));

function paletteAt(x: number, out: Color): Color {
  const f = ((x % 1) + 1) % 1;
  const scaled = f * STOPS.length;
  const i = Math.floor(scaled);
  const k = scaled - i;
  const s = k * k * (3 - 2 * k);
  const a = STOPS[i % STOPS.length]!;
  const b = STOPS[(i + 1) % STOPS.length]!;
  return out.copy(a).lerp(b, s);
}

export interface RibbonQuality {
  segments: number;
  across: number;
}

export function createSculptureGeometry(quality: RibbonQuality): BufferGeometry {
  const { segments, across } = quality;
  const rings = segments + 1;
  const cols = across + 1;
  const perBand = rings * cols;
  const total = perBand * BANDS.length;

  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const colors = new Float32Array(total * 3);
  const rib = new Float32Array(total * 3);

  const quadsPerBand = segments * across;
  const indices = new Uint32Array(quadsPerBand * 6 * BANDS.length);

  const s0: SpineSample = { point: new Vector3(), inward: new Vector3() };
  const sA: SpineSample = { point: new Vector3(), inward: new Vector3() };
  const sB: SpineSample = { point: new Vector3(), inward: new Vector3() };
  const T = new Vector3();
  const W0 = new Vector3();
  const B0 = new Vector3();
  const W = new Vector3();
  const N = new Vector3();
  const P = new Vector3();
  const nrm = new Vector3();
  const col = new Color();
  const eps = 1 / (segments * 4);

  let ii = 0;
  BANDS.forEach((band, bandIndex) => {
    const base = bandIndex * perBand;
    for (let i = 0; i < rings; i++) {
      const u = i / segments;
      const t = u % 1;
      sampleSpine(t, s0);
      sampleSpine((t + eps) % 1, sA);
      sampleSpine((t - eps + 1) % 1, sB);
      T.copy(sA.point).sub(sB.point).normalize();

      W0.copy(s0.inward).addScaledVector(T, -s0.inward.dot(T)).normalize();
      B0.crossVectors(T, W0);
      const theta = twistAt(t, band.twistPhase);
      W.copy(W0).multiplyScalar(Math.cos(theta)).addScaledVector(B0, Math.sin(theta));
      N.crossVectors(T, W).normalize();

      const width = widthAt(t, band.width, band.widthPhase);
      const half = width / 2;

      for (let j = 0; j < cols; j++) {
        const v = -1 + (2 * j) / across;
        const idx = base + i * cols + j;
        const cupOffset = band.cup * (v * v - 1 / 3) * half;

        P.copy(s0.point)
          .addScaledVector(N, band.offsetN + cupOffset)
          .addScaledVector(W, band.offsetW + v * half);
        positions.set([P.x, P.y, P.z], idx * 3);

        nrm.copy(N).addScaledVector(W, -2 * band.cup * v).normalize();
        normals.set([nrm.x, nrm.y, nrm.z], idx * 3);

        uvs.set([u * 48, (v + 1) / 2], idx * 2);

        paletteAt(u + band.colorPhase, col);
        const edgeLift = 1 + 0.12 * v * v;
        colors.set([col.r * edgeLift, col.g * edgeLift, col.b * edgeLift], idx * 3);

        rib.set([u, v, bandIndex], idx * 3);
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < across; j++) {
        const a = base + i * cols + j;
        const b = a + cols;
        indices[ii++] = a;
        indices[ii++] = b;
        indices[ii++] = a + 1;
        indices[ii++] = b;
        indices[ii++] = b + 1;
        indices[ii++] = a + 1;
      }
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setAttribute("aRib", new BufferAttribute(rib, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.center();
  geometry.computeBoundingBox();
  return geometry;
}
