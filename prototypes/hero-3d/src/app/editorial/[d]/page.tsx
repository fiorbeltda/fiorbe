import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { Hero } from "@/components/hero/Hero";
import { ManifestoStub } from "@/components/destination/ManifestoStub";
import type { Direction } from "@/components/hero/editorial";

/*
 * DS-001A — direções editoriais da primeira tela (exploração; a rota "/" não muda).
 * Fontes CANDIDATAS (todas SIL OFL, Google Fonts) — nenhuma é decisão de marca:
 *   A: Instrument Serif (display) + Manrope (texto)
 *   B: Archivo com largura variável (display e wordmark) + Manrope (texto)
 *   C: IBM Plex Sans (display e texto) + IBM Plex Mono (rótulos)
 */
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--ed-instrument", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--ed-archivo", display: "swap" });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--ed-plex", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--ed-plexmono", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--ed-manrope", display: "swap" });

const FONTS: Record<Direction, { className: string; style: Record<string, string> }> = {
  a: { className: `${instrument.variable} ${manrope.variable}`, style: { "--ed-display": "var(--ed-instrument), Georgia, serif", "--ed-text": "var(--ed-manrope), system-ui, sans-serif" } },
  b: { className: `${archivo.variable} ${manrope.variable}`, style: { "--ed-display": "var(--ed-archivo), system-ui, sans-serif", "--ed-text": "var(--ed-manrope), system-ui, sans-serif" } },
  c: { className: `${plexSans.variable} ${plexMono.variable}`, style: { "--ed-display": "var(--ed-plex), system-ui, sans-serif", "--ed-text": "var(--ed-plex), system-ui, sans-serif", "--ed-mono": "var(--ed-plexmono), ui-monospace, monospace" } },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ d: "a" }, { d: "b" }, { d: "c" }];
}

export const metadata = { robots: { index: false, follow: false } };

export default async function EditorialPage({ params }: { params: Promise<{ d: string }> }) {
  const { d } = await params;
  if (d !== "a" && d !== "b" && d !== "c") notFound();
  const f = FONTS[d];
  return (
    <main className={f.className} style={f.style}>
      <Hero direction={d} />
      <ManifestoStub />
    </main>
  );
}
