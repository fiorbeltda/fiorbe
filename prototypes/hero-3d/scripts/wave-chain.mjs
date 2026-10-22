// Uso: node --experimental-transform-types --import ./scripts/_ts.mjs scripts/wave-chain.mjs [Hz]
// Simula um ciclo inteiro do diretor (sem navegador) e imprime ordem, voltas e transferências.
import { createMonumentGeometry } from "../src/three/sculpture/monument.ts";
import { computeContacts } from "../src/three/sculpture/ribbonSpace.ts";
import { WaveDirector } from "../src/three/motion/waveDirector.ts";
const m = createMonumentGeometry({ segments: 320, across: 6 });
const u = { uWaveC: { value: Array(6).fill(0) }, uWaveAmp: { value: Array(6).fill(0) }, uWavePh: { value: Array(6).fill(0) } };
const w = new WaveDirector(m.lengths, computeContacts(m.curves, 1.6), u);
const fps = Number(process.argv[2] ?? 60);
let maxJump = 0, lastC = null, lastB = null;
for (let t = 0; t < 120; t += 1 / fps) {
  w.update(1 / fps, 1, false);
  const s = w.snapshot()[0];
  if (s && s.band === lastB && lastC !== null) {
    const L = m.lengths[s.band], d = Math.abs(s.u - lastC);
    maxJump = Math.max(maxJump, Math.min(d, 1 - d) * L);
  }
  lastB = s?.band ?? null; lastC = s?.u ?? null;
}
console.log(w.log.join("\n"));
console.log(`maior passo da crista por quadro a ${fps} Hz: ${maxJump.toFixed(4)} (esperado ${(1.25 / fps).toFixed(4)})`);
