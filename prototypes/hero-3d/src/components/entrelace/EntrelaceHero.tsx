import { HeroStage } from "@/components/hero/HeroStage";
import s from "./Entrelace.module.css";

/**
 * ENT-003 — primeira tela "Entrelace 003 · L3" (exploração, não aprovada).
 * HTML real servido estático; a escultura, a física e as interações são as do Hero (HeroStage +
 * motor 3D, sem alterações de movimento). A headline é UM h1: com o 3D vivo o motor a redesenha
 * dentro do render, atrás da escultura (sólida onde está livre, contorno onde a peça passa).
 * Sem JS/WebGL o entrelace é estático: h1 sólido → pôster da escultura → contorno decorativo.
 * Copy provisória (canvas Entrelace 003); "Nada é superficial." fica só documentada como estudo.
 */
export function EntrelaceHero() {
  return (
    <section id="entrelace-hero" className={s.hero} aria-labelledby="ent-title">
      <header className={s.header}>
        <a href="#" className={s.wordmark} aria-label="FIORBE, início">
          FIORBE
        </a>
        <nav aria-label="Principal" className={s.nav}>
          <a href="#produtos" className={s.navLink}>
            <span className={s.navIndex} aria-hidden="true">
              01
            </span>
            Produtos
          </a>
          <a href="#sobre" className={s.navLink}>
            <span className={s.navIndex} aria-hidden="true">
              02
            </span>
            Sobre
          </a>
          <a href="#contato" className={s.contact}>
            Contato
          </a>
        </nav>
        {/* Celular: menu por <details> — funciona sem JS, teclado e leitor de tela nativos. */}
        <details className={s.menu}>
          <summary className={s.menuButton}>Menu</summary>
          <nav aria-label="Principal (menu)" className={s.menuPanel}>
            <a href="#produtos">
              <span aria-hidden="true">01</span>Produtos
            </a>
            <a href="#sobre">
              <span aria-hidden="true">02</span>Sobre
            </a>
            <a href="#contato">
              <span aria-hidden="true">03</span>Contato
            </a>
          </nav>
        </details>
      </header>

      <div className={s.archFallback} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>

      {/* Ordem de empilhamento (sem contexto próprio): h1 sólido → palco/pôster → contorno. */}
      <div className={s.titleWrap}>
        <h1 id="ent-title" className={s.title}>
          <span className={s.w1}>Cada</span> <span className={s.w2}>camada</span> <span className={s.w3}>importa.</span>
        </h1>
        <p className={s.titleLine} aria-hidden="true">
          <span className={s.w1}>Cada</span> <span className={s.w2}>camada</span> <span className={s.w3}>importa.</span>
        </p>
      </div>

      <HeroStage className={s.stage} entrelace={{ headlineId: "ent-title", hostId: "entrelace-hero" }} controlsSlot="ent-controls" />

      <div className={s.copy}>
        <p className={s.eyebrow}>Tecnologia multiproduto · Brasil</p>
        <p className={s.lede}>A FIORBE desenvolve produtos próprios de software para empresas. O primeiro, o Motor Fiscal, está em desenvolvimento.</p>
        <div className={s.actions}>
          <a href="#produtos" className={s.primary}>
            <span className={s.primaryLabel}>Conhecer o Motor Fiscal</span>
            <span className={s.lamellae} aria-hidden="true" />
          </a>
          <a href="#contato" className={s.secondary}>
            Conversar
          </a>
        </div>
      </div>

      <aside className={s.product} aria-label="Primeiro produto">
        <p className={s.productMeta}>
          <span>Produto 01</span>
          <span aria-hidden="true">FIORBE</span>
        </p>
        <p className={s.productName}>Motor Fiscal</p>
        <p className={s.productStage}>
          <span className={s.ring} aria-hidden="true" />
          Em desenvolvimento
        </p>
      </aside>

      <div className={s.foot}>
        <a href="#produtos" className={s.index}>
          <span className={s.indexMark} aria-hidden="true" />
          01 — Produtos
        </a>
        <div id="ent-controls" className={s.controlsSlot} />
      </div>
    </section>
  );
}
