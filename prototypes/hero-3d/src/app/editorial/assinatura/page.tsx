import { Archivo, IBM_Plex_Mono, Manrope } from "next/font/google";
import sig from "@/components/editorial/signature.module.css";
import s from "./assinatura.module.css";

/*
 * DS-001B — amostra do vocabulário editorial em estudo (NÃO aprovado; não é logotipo nem marca).
 * Mostra as mesmas primitivas em fundo escuro e claro, aplicadas a uma seção hipotética seguinte.
 * Conteúdo só com fatos confirmados (Motor Fiscal em desenvolvimento).
 */
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--ed-archivo", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--ed-manrope", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--ed-plexmono", display: "swap" });

export const metadata = { title: "Assinatura editorial · estudo", robots: { index: false, follow: false } };

function Specimen({ tone }: { tone: "escuro" | "claro" }) {
  return (
    <section className={`${s.panel} ${tone === "claro" ? s.light : s.dark}`} aria-label={`Fundo ${tone}`}>
      <div className={s.grid} aria-hidden="true" />
      <p className={s.label}>
        <span className={sig.lamina} aria-hidden="true" />
        <span className={sig.index}>02 — Primeiro produto</span>
      </p>
      <h2 className={s.title}>
        <span className={s.recede}>O complexo </span>
        <span>ganha forma.</span>
      </h2>
      <p className={s.contrast}>
        <span className={s.narrow}>Motor Fiscal</span>
        <span className={s.wide}>em desenvolvimento</span>
      </p>
      <hr className={s.horizon} />
      <dl className={s.sheet}>
        <div>
          <dt className={sig.index}>01 — Empresa</dt>
          <dd>Software multiproduto</dd>
        </div>
        <div>
          <dt className={sig.index}>02 — Produto</dt>
          <dd>Motor Fiscal</dd>
        </div>
        <div>
          <dt className={sig.index}>03 — Estágio</dt>
          <dd>Em desenvolvimento</dd>
        </div>
      </dl>
    </section>
  );
}

export default function AssinaturaPage() {
  return (
    <main className={`${archivo.variable} ${manrope.variable} ${plexMono.variable} ${s.page}`}>
      <header className={s.intro}>
        <p className={sig.index}>DS-001B · estudo, não aprovado</p>
        <h1>Assinatura editorial</h1>
        <ol>
          <li><b>Fio laminado</b> — três filetes que encurtam e esmaecem, como as lâminas da escultura; abre rótulos e separa blocos.</li>
          <li><b>Índice</b> — mono pequeno, numerado: a única função da fonte mono.</li>
          <li><b>Recuo tonal</b> — a parte que importa menos recua em tom, não em tamanho.</li>
          <li><b>Contraste de largura</b> — a mesma Archivo nos extremos do eixo (62% e 125%): a letra muda de forma.</li>
          <li><b>Grade de fios</b> — quatro colunas em linhas finas; o conteúdo começa sempre num fio.</li>
          <li><b>Horizonte</b> — uma linha de apoio que corresponde ao piso da escultura; blocos assentam nela.</li>
        </ol>
      </header>
      <Specimen tone="escuro" />
      <Specimen tone="claro" />
    </main>
  );
}
