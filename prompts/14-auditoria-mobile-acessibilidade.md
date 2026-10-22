> PROMPT PARA CLAUDE CODE — Execute somente esta etapa. Leia antes `CLAUDE.md` e `docs/fiorbe/{PLANO_MESTRE,IDENTIDADE_E_COPY,MOTION_SPEC,QUALITY_GATE,ESTADO}.md`. Inspecione o repositório. Preserve todas as etapas anteriores. Não avance automaticamente. Ao terminar: preview, capturas se possível, testes realmente feitos, relatório no formato do QUALITY_GATE e atualização de ESTADO.md. Se a etapa depende de aprovação anterior ainda ausente, informe o bloqueio e proponha o mínimo para revisão, sem fingir aprovação.

# ETAPA 14 — Auditoria transversal: mobile, teclado e motion reduzido

## Objetivo

Revisar todas as rotas e estados para que a excelência visual não dependa de monitor grande nem GPU poderosa. Este é um passe transversal de QA e correções necessárias, não redesign geral.

## Matriz

1. Larguras 360, 390, 768, 1280 e 1440; altura mobile real; orientation e zoom 200% quando possível.
2. Teclado: tab order, menus, Escape, skip link, foco visível, links/CTAs e áreas clicáveis.
3. Touch: sem hover obrigatório, botões confortáveis e WebGL que não sequestra gesto de scroll.
4. `prefers-reduced-motion`: hero estático, scroll sem parallax não essencial, todas as informações visíveis; testar opção sem WebGL e falha de JS.
5. Leitor de tela/semântica: landmark, headings, labels, nomes de botão, alt para conteúdo (arte decorativa pode ser `aria-hidden`).
6. Testar navegação ao acessar rota diretamente; não depende de visita prévia à home.
7. Identificar e corrigir overflow, jank, CLS, contrastes, tap targets e scroll pin excessivo.
8. Documentar bugs com passos para reproduzir e antes/depois quando houver ferramenta visual.

## Critério de aprovação

Sem blockers de acessibilidade/uso; experiência de marca preservada em tela pequena; regressões visuais mínimas. PARE.
