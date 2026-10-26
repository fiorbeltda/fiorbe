import { HeroStage } from "./HeroStage";
import styles from "./Hero.module.css";
import ed from "./Editorial.module.css";
import { EDITORIAL, type Direction } from "./editorial";

/**
 * Hero em HTML real (server component), na composição da referência
 * aprovada para este estudo. A escultura é uma camada progressiva por trás.
 * Textos são propostas editoriais ainda não aprovadas.
 */
export function Hero({ direction }: { direction?: Direction } = {}) {
  // DS-001A: com `direction`, troca só texto e acabamento (exploração em /editorial/*).
  if (direction) return <EditorialHero direction={direction} />;
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <header className={styles.header}>
        <a href="#" className={styles.wordmark} aria-label="FIORBE, início">
          FIORBE
        </a>
        <nav aria-label="Principal" className={styles.nav}>
          <a href="#produtos">Produtos</a>
          <a href="#sobre">Sobre</a>
          <a href="#contato">Contato</a>
        </nav>
        <a href="#contato" className={styles.headerCta}>
          Conversar
          <Arrow />
        </a>
      </header>

      <div className={styles.copy}>
        <p className={styles.eyebrow}>Tecnologia multiproduto</p>
        <h1 id="hero-title" className={styles.title}>
          Tecnologia que transforma complexidade em clareza.
        </h1>
        <p className={styles.lede}>
          Construímos software bem desenvolvido para resolver problemas reais com precisão, fluidez e visão de longo prazo.
        </p>
        <div className={styles.actions}>
          <a href="#sobre" className={styles.primary}>
            Conhecer a FIORBE
            <Arrow />
          </a>
          <a href="#produtos" className={styles.secondary}>
            Ver o Motor Fiscal
          </a>
        </div>
        <p className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          Motor Fiscal • Em desenvolvimento
        </p>
      </div>

      {/* Trilhas de luz no piso, nas coordenadas da referência. Com o piso cinematográfico
          o 3D lê estas curvas, projeta no chão e esconde o SVG; sem ele, o SVG fica. */}
      <svg className={styles.trails} viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true" data-floor-trails="">
        <defs>
          <linearGradient id="trail-main" x1="1672" y1="915" x2="930" y2="700" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#bff3ff" />
            <stop offset="0.55" stopColor="#4fb8ff" />
            <stop offset="1" stopColor="#2a6bff" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <g fill="none" strokeLinecap="round">
          <path className={styles.trailHalo} d="M1690 925 C1590 858 1420 806 1200 774 C1010 746 905 726 935 706 C968 688 1090 690 1255 696" stroke="#2a74ff" strokeWidth="14" />
          <path d="M1690 925 C1590 858 1420 806 1200 774 C1010 746 905 726 935 706 C968 688 1090 690 1255 696" stroke="url(#trail-main)" strokeWidth="2.2" />
          <path d="M1690 712 C1610 712 1540 700 1478 684" stroke="#7fd9ff" strokeOpacity="0.55" strokeWidth="1.2" />
        </g>
      </svg>

      {/* Depois do texto no DOM: leitura e Tab chegam aos CTAs antes do controle da escultura. */}
      <HeroStage className={styles.stage} />

      <ul className={styles.band} aria-label="Sobre a FIORBE">
        <li>
          <span className={styles.icon} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
              <path d="m3 12 9 4.5 9-4.5" />
              <path d="m3 16.5 9 4.5 9-4.5" />
            </svg>
          </span>
          <span>
            <strong>Empresa multiproduto</strong>
            Pensada para desenvolver diferentes produtos de software.
          </span>
        </li>
        <li>
          <span className={styles.icon} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
            </svg>
          </span>
          <span>
            <strong>Primeiro produto: Motor Fiscal</strong>
            Em desenvolvimento.
          </span>
        </li>
        <li>
          <span className={styles.icon} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
              <rect x="4" y="13" width="4" height="7" rx="1" />
              <rect x="10" y="8" width="4" height="12" rx="1" />
              <rect x="16" y="4" width="4" height="16" rx="1" />
            </svg>
          </span>
          <span>
            <strong>Design e engenharia com rigor</strong>
            Cuidado com a qualidade em cada detalhe.
          </span>
        </li>
      </ul>
    </section>
  );
}

/** Mesma estrutura, palco e trilhas do Hero; texto, faixa e acabamento de cada direção. */
function EditorialHero({ direction }: { direction: Direction }) {
  const c = EDITORIAL[direction];
  const d = ed[direction];
  return (
    <section className={`${styles.hero} ${ed.root} ${d}`} aria-labelledby="hero-title" data-editorial={direction}>
      <header className={styles.header}>
        <a href="#" className={`${styles.wordmark} ${ed.wordmark}`} aria-label="FIORBE, início">
          FIORBE
        </a>
        <nav aria-label="Principal" className={`${styles.nav} ${ed.nav}`}>
          <a href="#produtos">Produtos</a>
          <a href="#sobre">Sobre</a>
          <a href="#contato">Contato</a>
        </nav>
        <a href="#contato" className={`${styles.headerCta} ${ed.headerCta}`}>
          {c.headerCta}
          <Arrow />
        </a>
      </header>

      <div className={`${styles.copy} ${ed.copy}`}>
        <p className={`${styles.eyebrow} ${ed.eyebrow}`}>{c.eyebrow}</p>
        <h1 id="hero-title" className={`${styles.title} ${ed.title}`}>
          {c.title.map(([t, em], i) => (em ? <em key={i} className={ed.em}>{t}</em> : <span key={i}>{t}</span>))}
        </h1>
        <p className={`${styles.lede} ${ed.lede}`}>{c.lede}</p>
        <div className={`${styles.actions} ${ed.actions}`}>
          <a href={c.primary.href} className={`${styles.primary} ${ed.primary}`}>
            {c.primary.label}
            <Arrow />
          </a>
          <a href={c.secondary.href} className={`${styles.secondary} ${ed.secondary}`}>
            {c.secondary.label}
            {c.secondary.status && <span className={ed.secondaryStatus}>{c.secondary.status}</span>}
          </a>
        </div>
        {c.badge && (
          <p className={`${styles.status} ${ed.status}`}>
            <span className={styles.dot} aria-hidden="true" />
            {c.badge}
          </p>
        )}
      </div>

      <svg className={styles.trails} viewBox="0 0 1672 941" preserveAspectRatio="none" aria-hidden="true" data-floor-trails="">
        <g fill="none" strokeLinecap="round">
          <path d="M1690 925 C1590 858 1420 806 1200 774 C1010 746 905 726 935 706 C968 688 1090 690 1255 696" stroke="#4fb8ff" strokeWidth="2.2" />
          <path d="M1690 712 C1610 712 1540 700 1478 684" stroke="#7fd9ff" strokeOpacity="0.55" strokeWidth="1.2" />
        </g>
      </svg>

      <HeroStage className={styles.stage} />

      <dl className={`${styles.band} ${ed.band}`} aria-label="Sobre a FIORBE">
        {c.band.map(([k, v]) => (
          <div key={k} className={ed.bandItem}>
            <dt className={ed.bandKey}>{k}</dt>
            <dd className={ed.bandValue}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Arrow() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}
