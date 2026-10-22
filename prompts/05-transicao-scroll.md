> PROMPT PARA CLAUDE CODE — Execute somente esta etapa. Leia antes `CLAUDE.md` e `docs/fiorbe/{PLANO_MESTRE,IDENTIDADE_E_COPY,MOTION_SPEC,QUALITY_GATE,ESTADO}.md`. Inspecione o repositório. Preserve todas as etapas anteriores. Não avance automaticamente. Ao terminar: preview, capturas se possível, testes realmente feitos, relatório no formato do QUALITY_GATE e atualização de ESTADO.md. Se a etapa depende de aprovação anterior ainda ausente, informe o bloqueio e proponha o mínimo para revisão, sem fingir aprovação.

# ETAPA 05 — Assinatura: transformação da fita no scroll

## Objetivo

Construir a transição cinematográfica hero → manifesto que fará a landing memorável, mantendo navegação nativa.

## Storyboard obrigatório

A. No topo, hero com ribbon em repouso e copy 100% legível.  
B. No primeiro segmento do scroll, ribbon diminui/recua com profundidade controlada.  
C. Sua energia/formas continuam como linhas organizadas, traços ou fluxos que se alinham à grade.  
D. A transição desemboca na seção manifesto sem corte brusco.

## Execução

1. Faça primeiro storyboard animado simples do timing com shapes/placeholder; só depois integre escultura real. Isso evita mexer na geometria toda a cada ajuste.
2. Use uma única timeline com `scrub` ligada ao progresso real do scroll (GSAP ScrollTrigger só se necessário). Reversível ao rolar para cima.
3. Evite pinning excessivo; se houver pin, deve ser curto, claro e não prender o usuário. Testar scroll rápido, rolagem reversa, touch e alteração de tamanho da janela.
4. Nenhum elemento essencial some de modo irreversível. Sem saltos, sobreposições indesejadas, CLS, flicker ou textos ilegíveis.
5. Reduced motion: em vez de transformação, troca limpa de composição com todos os textos acessíveis.
6. Mobile: simplificar a cena; no mínimo continuidade cromática entre hero e manifesto, não tentar reproduzir força bruta do desktop.

## Critério de aprovação

Testar no sentido descida e subida em 1440/768/390, reduzindo motion. Deve contar uma história visual, não ser uma demonstração de plugin. PARE.
