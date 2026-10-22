import styles from "./ManifestoStub.module.css";

/**
 * STUB — destino provisório só para demonstrar a transição do hero.
 * Não é a seção de manifesto (Etapa 06) nem as seções de produto/contato.
 */
export function ManifestoStub() {
  return (
    <>
      <section id="sobre" className={styles.manifesto} aria-labelledby="manifesto-title">
        <div id="flow-rule" className={styles.rule} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className={styles.label}>A ideia · seção provisória</p>
        <h2 id="manifesto-title" className={styles.title}>
          A melhor tecnologia faz a complexidade desaparecer da experiência.
        </h2>
        <p className={styles.body}>
          Para nós, desenvolver software é entender o problema, questionar o desnecessário e cuidar do que normalmente passa despercebido.
        </p>
      </section>
      <section id="produtos" className={styles.stub} aria-label="Produtos (stub)">
        <p>
          <strong>Motor Fiscal</strong> — em desenvolvimento. Seção de produto ainda não construída neste protótipo.
        </p>
      </section>
      <section id="contato" className={styles.stub} aria-label="Contato (stub)">
        <p>Contato — canal oficial a definir pelos fundadores.</p>
      </section>
    </>
  );
}
