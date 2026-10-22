> PROMPT PARA CLAUDE CODE — Execute somente esta etapa. Leia antes `CLAUDE.md` e `docs/fiorbe/{PLANO_MESTRE,IDENTIDADE_E_COPY,MOTION_SPEC,QUALITY_GATE,ESTADO}.md`. Inspecione o repositório. Preserve todas as etapas anteriores. Não avance automaticamente. Ao terminar: preview, capturas se possível, testes realmente feitos, relatório no formato do QUALITY_GATE e atualização de ESTADO.md. Se a etapa depende de aprovação anterior ainda ausente, informe o bloqueio e proponha o mínimo para revisão, sem fingir aprovação.

# ETAPA 01 — DNA visual e Design System

## Objetivo

Criar o sistema que vai unir toda a landing. **Nesta etapa a entrega principal é a fundação visual e uma pequena página de amostras/design lab**, não a home completa.

## Escopo

1. Defina tokens em CSS (ou convenção existente) para cores, superfícies, bordas, sombras, texto, espaços, raios, container, grid, camadas z-index, durações e easings.
2. Parta da hipótese de paleta do briefing (`#071525`, `#0B1F3B`, `#176BFF`, `#16BADE`, `#18B7A5`, `#68E7C6`, `#F5F8FC`); ajuste apenas após mostrar a razão e medir contraste. Marque a paleta como proposta, não como manual oficial.
3. Compare visualmente opções tipográficas (Geist, Inter, Manrope; Exo 2 é hipótese prévia) e escolha uma combinação orientada à clareza. Wordmark oficial não pode ser improvisado.
4. Demonstre: H1/H2/body/caption, link, CTA primário/secundário, card editorial, eyebrow, nav item e estados hover/focus/disabled.
5. Defina grids: desktop 12 colunas, container ~1200–1280 px, mobile 4 colunas, escalas de espaçamento e ritmo vertical; números são propostas e precisam funcionar nos breakpoints.
6. Produza 2–3 amostras visuais diferentes **dentro da mesma linguagem**, comparando quiet premium vs. contrastes editoriais; recomende uma.
7. Registre nomenclatura dos tokens, fontes escolhidas/licenças e decisões em `ESTADO.md`.

## Critério de aprovação

Os botões, links, cards e texto parecem pertencer à mesma marca; a paleta funciona no escuro e claro; sem CSS mágico duplicado; contraste, foco, 360px e 1440px adequados. **Sem adicionar canvas, hero e múltiplas seções nesta fase.** PARE.
