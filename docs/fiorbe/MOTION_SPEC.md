# MOTION SYSTEM — FIORBE

## Filosofia

Movimento transmite **inteligência, fluidez e precisão**. Hierarquia: (1) escultura hero, (2) transição hero→manifesto, (3) microinterações úteis, (4) entradas de conteúdo discretas. O scroll precisa continuar nativo, fluido e previsível.

## Tokens experimentais

- `--motion-fast: 160ms` (estados hover/focus simples)
- `--motion-base: 220ms` (botões, indicadores)
- `--motion-reveal: 480ms` (entradas discretas)
- `--motion-dialog: 320ms` (menu mobile)
- `--ease-out: cubic-bezier(0.22,1,0.36,1)`

Tokens sujeitos a teste com conteúdo real. Use durações diferentes quando houver justificativa contextual, não por aleatoriedade.

## Hero Ribbon — especificação criativa

- Forma original de **fitas largas entrelaçadas**, não um tubo toroidal, blob ou elipses genéricas.
- Camadas com profundidade real, curvas e bordas trabalhadas; alto nível de silhueta mesmo sem reflexos.
- Material azul profundo/metálico acetinado com nuances ciano/teal. Iluminação de estúdio, highlights finos, microtextura opcional se suportada.
- Idle: respiração quase imperceptível + rotação lenta em arco pequeno. Sem looping hipnótico.
- Pointer hover: desvio no eixo X/Y com clamp pequeno (referência de teste ±4° X, ±8° Y), suavização por spring/damping; retorna lentamente ao repouso.
- Drag (desktop) opcional: interação só na região da escultura, cursor indicativo, nunca roubar seleção de textos. Mobile: preferir sem drag ou ativação explícita para não bloquear scroll.
- Ícone/ação **Pausar movimento** se houver animação contínua significativa. `prefers-reduced-motion` pausa movimento não essencial.
- WebGL somente no cliente, lazy-load, poster sem canvas, failure fallback, resize e destroy de recursos; pausa quando não visível.
- Resolução/densidade adaptada ao device; testar telefone de entrada/intermediário.

## Hero → Manifesto (scroll)

Storyboard: (A) ribbon íntegra e hero legível → (B) composição encolhe/afasta gradualmente → (C) fita parece abrir fluxos/traçados → (D) grafismo converge à grade editorial do manifesto. Fazer no máximo **um trecho pinado** e apenas se usabilidade comprovada. Rolar para cima deve reverter com precisão. Preferir transições de transform/opacity em elementos coordenados; morph real de malha 3D é opcional e só vale se qualidade superior ao truque visual.

## Microinterações

| Elemento | Movimento | Limites |
|---|---|---|
| Navbar | borda/superfície ao rolar | sem saltos de altura |
| Botão primário | seta 2–3px + luz sutil | não aumentar tamanho e mover vizinhos |
| Link | underline/contraste | manter foco visível |
| Cards | borda e highlight guiado por hover | sem 3D tilt agressivo |
| Texto editorial | reveal pequeno em bloco | nunca word-by-word em toda página |
| Timeline | linha progride conforme seção é vista | sempre texto presente sem JS |
| Menu mobile | slide/fade contido | trap de foco quando aplicável, escape/fechar funcional |

## Acessibilidade

Obedecer preferência `prefers-reduced-motion: reduce`; nesse caso desativar parallax, scroll-scrub não essencial, entrada espacial e idle do hero, mantendo conteúdo imediatamente visível. Não bloquear navegação com animação. Interação essencial acessível por teclado ou forneça resultado equivalente fora do canvas; elementos puramente decorativos usam `aria-hidden`.

## Orçamento

Uma cena WebGL principal; evitar múltiplos canvases. Não carregar GSAP e Motion em todas as rotas por hábito. Ferramentas: CSS + Motion para microinterações; GSAP ScrollTrigger só no segmento complexo de scroll; Three.js/R3F se e somente se escultura 3D real trouxer ganho de qualidade. Reconhecer explícita e honestamente se fallback estático é melhor.
