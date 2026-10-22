> PROMPT PARA CLAUDE CODE — Execute somente esta etapa. Leia antes `CLAUDE.md` e `docs/fiorbe/{PLANO_MESTRE,IDENTIDADE_E_COPY,MOTION_SPEC,QUALITY_GATE,ESTADO}.md`. Inspecione o repositório. Preserve todas as etapas anteriores. Não avance automaticamente. Ao terminar: preview, capturas se possível, testes realmente feitos, relatório no formato do QUALITY_GATE e atualização de ESTADO.md. Se a etapa depende de aprovação anterior ainda ausente, informe o bloqueio e proponha o mínimo para revisão, sem fingir aprovação.

# ETAPA 15 — Polimento, otimização e prontidão de publicação

## Objetivo

Tratar o site como produto real: revisar consistência do início ao fim, medir e corrigir problemas. **Não publicar automaticamente sem aprovação e configuração de domínio.**

## Auditoria final

1. Percorra a home inteira no desktop e mobile, capture screenshots e compare ritmo visual, continuidade de bordas/grade/cores, qualidade das transições e densidade informacional.
2. Revise cada pixel perceptível: kerning, recorte do H1, áreas de clique, alinhamentos, fundos, fallbacks, menu mobile, curvas de easing, hover, loading e estados vazios.
3. Teste build/lint/types e os testes existentes; execute navegação E2E das rotas e contato; se possível Playwright + axe + Lighthouse e perf real em device.
4. Monitore bundle JS, chunk do 3D, tamanho de imagens, fonts e layout shift; force fallback poster e reduced-motion para confirmar.
5. Metas de campo: LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1 em p75 quando houver dados de usuários. Não apresente um número simulado como resultado medido. Ajuste bundle/3D se necessário.
6. SEO: metadados, OG, headings, robots, sitemap se apropriado, canonical só após domínio verificado. Política de dados/analytics dependem de decisão adequada; sem trackers improvisados.
7. Auditoria de claims e marca: nenhuma marca registrada, promessa técnica, métrica, cliente, CNPJ ou legal entity não verificada.
8. Produza checklist GO/NO-GO com os riscos restantes, documentação para handoff e recomendação de publicação sem executar deploy ou DNS sem instrução explícita.

## Critério de aprovação

Responsáveis conseguem abrir as duas rotas, testá-las, confiar nos textos e mostrar o site publicamente; todos os comandos/resultados declarados foram de fato executados. PARE.
