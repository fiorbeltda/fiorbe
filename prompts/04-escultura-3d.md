> PROMPT PARA CLAUDE CODE — Execute somente esta etapa. Leia antes `CLAUDE.md` e `docs/fiorbe/{PLANO_MESTRE,IDENTIDADE_E_COPY,MOTION_SPEC,QUALITY_GATE,ESTADO}.md`. Inspecione o repositório. Preserve todas as etapas anteriores. Não avance automaticamente. Ao terminar: preview, capturas se possível, testes realmente feitos, relatório no formato do QUALITY_GATE e atualização de ESTADO.md. Se a etapa depende de aprovação anterior ainda ausente, informe o bloqueio e proponha o mínimo para revisão, sem fingir aprovação.

# ETAPA 04 — Escultura FIORBE: 3D + interação refinada

## Objetivo

Transformar a composição aprovada num hero vivo, com fita escultural AUTORAL inspirada na referência enviada. O foco maior é **silhueta, material, luz e comportamento físico**, não um objeto que gira sem intenção.

## Trabalho

1. Experimente geometria de fita(s) larga(s) entrelaçada(s), camadas, superfícies dobradas, bordas e leve estriamento. Evite formas genéricas prontas. Faça silhuetas comparativas (ou justifique solução geométrica) antes do material final.
2. Shader/material: superfície azul/teal/ciano de qualidade premium, highlights finos, sombreado de estúdio, reflexos controlados; evite neon e saturação excessiva.
3. Interação: idle quase parado; ponteiro desloca gradualmente em ângulos pequenos; opcional arraste com damping/inércia contida. Nunca prender scroll, roubar eventos de texto ou causar enjoo.
4. Performance: carregamento sob demanda do canvas; poster estático pronto desde SSR; cap de pixel ratio, frame budgeting, visibilidade/offscreen pause; disposal de materiais e listeners. Canvas limitado ao hero.
5. Acessibilidade: `prefers-reduced-motion`, botão de pausar se for contínuo, fallback no touch mobile, quando WebGL estiver indisponível, falhar ou device for fraco; o conteúdo textual continua plenamente visível.
6. Aprimore o material comparando repetidamente a escultura ao briefing e referência do usuário, sem copiá-la literalmente. Mostre 2–3 perspectivas/ângulos relevantes.
7. Documente todos os parâmetros editáveis (curvatura, número de ribbons, roughness, reflection, amplitude, damping, câmera, iluminação).

## Critério de aprovação

Escultura parada já impressiona; movimento acrescenta vida sem tirar foco do H1; mobile sem travamentos; poster perfeito em falha. Se WebGL causar regressão, mantenha opção estática e explique tradeoff. PARE.
