import { Funnel_Display, Funnel_Sans, Geist_Mono } from "next/font/google";
import { EntrelaceHero } from "@/components/entrelace/EntrelaceHero";
import { ManifestoStub } from "@/components/destination/ManifestoStub";

/*
 * ENT-003 — Entrelace 003 com arquitetura luminosa L3 (Claude Design, direção escolhida para
 * implementação EXPERIMENTAL). Rota de revisão isolada: "/" e /editorial/* não mudam.
 * Fontes CANDIDATAS do canvas (SIL OFL, Google Fonts) — nenhuma é decisão de marca:
 *   Funnel Display (headline, marca, nome do produto) · Funnel Sans (texto) · Geist Mono (rótulos).
 */
const display = Funnel_Display({ subsets: ["latin"], variable: "--ent-display", display: "swap" });
const sans = Funnel_Sans({ subsets: ["latin"], variable: "--ent-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--ent-mono", display: "swap" });

export const metadata = {
  title: "FIORBE — Entrelace 003 (exploração)",
  robots: { index: false, follow: false },
};

export default function EntrelacePage() {
  return (
    <main className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <EntrelaceHero />
      <ManifestoStub />
    </main>
  );
}
