/**
 * DS-001A — três direções editoriais para a primeira tela (EXPLORAÇÃO, não decisão de marca).
 * Cada direção troca só texto e acabamento da interface; escultura, cena e motor 3D são os
 * mesmos. Rotas: /editorial/a, /editorial/b, /editorial/c e a síntese "Engenharia Escultural"
 * em duas tipografias: /editorial/d (Archivo) e /editorial/e (IBM Plex Sans). A rota "/" não usa este arquivo.
 * Restrições de copy: docs/fiorbe/IDENTIDADE_E_COPY.md (nada de métricas, clientes ou produto disponível).
 */
export type Direction = "a" | "b" | "c" | "d" | "e";

export interface EditorialCopy {
  name: string;
  eyebrow: string;
  /** Headline em partes: [texto, ênfase?] — a ênfase recebe o tratamento da direção. */
  title: Array<[string, boolean]>;
  lede: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string; status?: string };
  /** Selo de produto separado (null = a direção resolve o status no CTA ou na faixa). */
  badge: string | null;
  headerCta: string;
  /** Link secundário como texto (sem contorno de botão). */
  secondaryAsLink?: boolean;
  /** Faixa inferior: pares [rótulo, valor]. */
  band: Array<[string, string]>;
}

export const EDITORIAL: Record<Direction, EditorialCopy> = {
  // A — Editorial minimalista: uma frase de convicção, pouco texto, serifa de display.
  a: {
    name: "A · Editorial minimalista",
    eyebrow: "FIORBE — produtos de software",
    title: [["O simples não acontece ", false], ["por acaso.", true]],
    lede: "Desenvolvemos produtos de software para empresas. O primeiro, o Motor Fiscal, está em desenvolvimento.",
    primary: { label: "Conhecer a FIORBE", href: "#sobre" },
    secondary: { label: "Motor Fiscal", href: "#produtos", status: "em desenvolvimento" },
    badge: null,
    headerCta: "Conversar",
    band: [
      ["01", "Empresa multiproduto"],
      ["02", "Software para empresas"],
      ["03", "Motor Fiscal — em desenvolvimento"],
    ],
  },
  // B — Contraste conceitual: a frase espelha a escultura (camadas → leitura clara).
  b: {
    name: "B · Contraste conceitual",
    eyebrow: "Tecnologia multiproduto",
    title: [["Complexidade é o ponto de partida. ", false], ["Não o resultado.", true]],
    lede: "Partimos de problemas difíceis e os transformamos em produtos claros de usar. O primeiro deles é o Motor Fiscal, ainda em desenvolvimento.",
    primary: { label: "Conhecer a FIORBE", href: "#sobre" },
    secondary: { label: "Ver o Motor Fiscal", href: "#produtos" },
    badge: "Motor Fiscal · em desenvolvimento",
    headerCta: "Conversar",
    band: [
      ["Modelo", "Multiproduto"],
      ["Foco inicial", "Software B2B"],
      ["Primeiro produto", "Motor Fiscal, em desenvolvimento"],
    ],
  },
  // C — Engenharia e confiança: objetiva, ficha técnica, linguagem B2B contemporânea.
  c: {
    name: "C · Engenharia e confiança",
    eyebrow: "FIORBE / Software B2B / Multiproduto",
    title: [["Software com rigor. ", false], ["Simplicidade por escolha.", true]],
    lede: "Somos uma empresa de tecnologia multiproduto. Construímos software para empresas com engenharia cuidadosa — começando pelo Motor Fiscal, em desenvolvimento.",
    primary: { label: "Conhecer a FIORBE", href: "#sobre" },
    secondary: { label: "Acompanhar o Motor Fiscal", href: "#produtos" },
    badge: null,
    headerCta: "Conversar",
    band: [
      ["Empresa", "Tecnologia multiproduto"],
      ["Foco inicial", "Software B2B"],
      ["Primeiro produto", "Motor Fiscal · em desenvolvimento"],
    ],
  },
  // D/E — síntese "Engenharia Escultural" (DS-001, refinamento): frase curta com quebra fixa,
  // a segunda linha recua em tom (o complexo vai "para trás"); um botão + um link; a faixa só
  // diz qual é o produto e em que estágio está. Copy provisória do usuário, não aprovada.
  d: {
    name: "D · Engenharia Escultural — Archivo",
    eyebrow: "Software multiproduto",
    title: [["O complexo fica ", false], ["nos bastidores.", true]],
    lede: "Desenvolvemos produtos de software com engenharia cuidadosa e experiências claras. Nosso primeiro produto é o Motor Fiscal, em desenvolvimento.",
    primary: { label: "Conhecer a FIORBE", href: "#sobre" },
    secondary: { label: "Sobre o Motor Fiscal", href: "#produtos" },
    secondaryAsLink: true,
    badge: null,
    headerCta: "Conversar",
    band: [
      ["Produto 01", "Motor Fiscal"],
      ["Estágio", "Em desenvolvimento"],
    ],
  },
  e: {
    name: "E · Engenharia Escultural — IBM Plex Sans",
    eyebrow: "Software multiproduto",
    title: [["O complexo fica ", false], ["nos bastidores.", true]],
    lede: "Desenvolvemos produtos de software com engenharia cuidadosa e experiências claras. Nosso primeiro produto é o Motor Fiscal, em desenvolvimento.",
    primary: { label: "Conhecer a FIORBE", href: "#sobre" },
    secondary: { label: "Sobre o Motor Fiscal", href: "#produtos" },
    secondaryAsLink: true,
    badge: null,
    headerCta: "Conversar",
    band: [
      ["Produto 01", "Motor Fiscal"],
      ["Estágio", "Em desenvolvimento"],
    ],
  },
};
