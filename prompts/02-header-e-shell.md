> PROMPT PARA CLAUDE CODE — Execute somente esta etapa. Leia antes `CLAUDE.md` e `docs/fiorbe/{PLANO_MESTRE,IDENTIDADE_E_COPY,MOTION_SPEC,QUALITY_GATE,ESTADO}.md`. Inspecione o repositório. Preserve todas as etapas anteriores. Não avance automaticamente. Ao terminar: preview, capturas se possível, testes realmente feitos, relatório no formato do QUALITY_GATE e atualização de ESTADO.md. Se a etapa depende de aprovação anterior ainda ausente, informe o bloqueio e proponha o mínimo para revisão, sem fingir aprovação.

# ETAPA 02 — Header, navegação e esqueleto editorial

## Objetivo

Construir a moldura perfeita para a experiência da FIORBE. Navbar premium com acabamento Vercel/Linear, mas personalidade própria.

## Escopo

1. Implemente shell semântico de app/página, max-width, grid, ancoragens e espaços; placeholders claramente identificados para seções futuras, sem fingir conteúdo pronto.
2. Header: marca FIORBE ou placeholder fiel ao status; links `Visão`, `Motor Fiscal`, `Abordagem`, `Fundadores`, CTA `Conversar`. Link da marca retorna ao topo/home.
3. Scroll: superfície do header muda de opacidade/borda sem salto de layout. Active link pode refletir seção visível, mas não sacrifique estabilidade por um indicador complexo.
4. Hover: underline/ícone/contexto com transição de 160–220 ms; foco visível; links funcionais. Mobile: menu acessível, abrir/fechar/escape, foco, touch target.
5. Sem scroll-lock arbitrário fora do menu aberto; sem nav gigantesca que compete com hero; testar os 4 breakpoints.
6. Evite inventar domínio, URLs de redes e dados legais. Contato corporativo permitido como `mailto:fiorbeltda@gmail.com` caso não haja rota de contato.

## Critério de aprovação

Header elegante no topo e após 800px de rolagem; mobile tão bem resolvido quanto desktop; sem links vazios, menu operável por teclado e sem layout shift. **Não construir o hero ainda.** PARE.
