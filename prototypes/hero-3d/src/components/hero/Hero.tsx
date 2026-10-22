import { HeroStage } from "./HeroStage";
import styles from "./Hero.module.css";

/**
 * Hero em HTML real (server component). A escultura é uma camada
 * progressiva por trás: tudo aqui é legível sem JS e sem WebGL.
 * Textos são propostas editoriais ainda não aprovadas.
 */
export function Hero() {
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
      </header>

      <div className={styles.copy}>
        <h1 id="hero-title" className={styles.title}>
          Tecnologia que transforma complexidade em clareza.
        </h1>
        <p className={styles.lede}>
          Construímos software bem desenvolvido para resolver problemas reais com precisão, fluidez e visão de longo prazo.
        </p>
        <div className={styles.actions}>
          <a href="#sobre" className={styles.primary}>
            Conhecer a FIORBE
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 7h10M8 3l4 4-4 4" />
            </svg>
          </a>
          <a href="#produtos" className={styles.secondary}>
            Ver o Motor Fiscal
          </a>
        </div>
        <p className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          Motor Fiscal — Em desenvolvimento
        </p>
      </div>

      {/* Depois do texto no DOM: leitura e Tab chegam aos CTAs antes do controle da escultura. */}
      <HeroStage className={styles.stage} />
    </section>
  );
}
