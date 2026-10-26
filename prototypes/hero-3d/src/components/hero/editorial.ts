/**
 * DS-001A — três direções editoriais para a primeira tela (EXPLORAÇÃO, não decisão de marca).
 * Cada direção troca só texto e acabamento da interface; escultura, cena e motor 3D são os
 * mesmos. Rotas: /editorial/a, /editorial/b, /editorial/c. A rota "/" não usa este arquivo.
 * Restrições de copy: docs/fiorbe/IDENTIDADE_E_COPY.md (nada de métricas, clientes ou produto disponível).
 */
export type Direction = "a" | "b" | "c";

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
};
