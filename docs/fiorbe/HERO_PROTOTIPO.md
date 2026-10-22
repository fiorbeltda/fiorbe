# Protótipo do hero interativo — H1 a H7 (22/10/2026)

Protótipo **isolado** em `prototypes/hero-3d/`. Não altera a futura estrutura da Camada B, não aprova paleta, fonte, lettering nem textos.

## H1 — Leitura crítica da referência enviada

| Aspecto | O que a imagem faz | Decisão no protótipo |
|---|---|---|
| Composição | Texto à esquerda (≈40%), escultura à direita sangrando a borda, faixa de 3 cards embaixo | Mantida a divisão; **removida a faixa de cards** (alega "segurança e escalabilidade", "automação" — fatos não confirmados) |
| Hierarquia | Título enorme com gradiente nas 2 últimas linhas | Título sólido: gradiente em parte da frase é um tique genérico |
| Escultura | Fitas largas laminadas em laços sobrepostos, bordas finas brilhantes, sulcos ao longo do comprimento | Geometria procedural com camadas laminadas, borda com rim light e microssulcos |
| Material | Metal acetinado azul/ciano/teal, reflexos de estúdio longos | MeshPhysical metálico + clearcoat + anisotropia + estúdio próprio (softboxes) |
| Luz | Contraluz forte e glow intenso | Sem bloom: o brilho vem dos reflexos do ambiente |
| Piso reflexivo, figura humana, brilho de "portal" | Dão escala, mas puxam para estética gamer/sci-fi | **Descartados** |
| "Solicitar demo" | Promete algo não confirmado | Substituído por navegação real; CTAs pedidos |

## Arquitetura

```
src/
  app/                    layout (Manrope via next/font), página, CSS global
  styles/tokens.css       tokens LOCAIS do protótipo (candidatos)
  components/hero/        Hero (server, HTML real) · HeroStage (client: palco, poster, pausa, carregamento tardio)
  components/destination/ ManifestoStub (STUB de destino da transição)
  three/
    engine.ts             orquestra cena, loop, layout, visibilidade, perda de contexto, benchmark
    sculpture/curves.ts   espinha paramétrica (nó 2,3 deformado), torção e largura
    sculpture/ribbonGeometry.ts  varredura das fitas laminadas → 1 BufferGeometry, 1 draw call
    sculpture/material.ts MeshPhysical + injeção de shader (ondulação, reação local, morph de fluxo, rim)
    sculpture/textures.ts microssulcos gerados em código
    scene/environment.ts  estúdio próprio para reflexos (PMREM)
    motion/spring.ts      mola com subpassos fixos (independe de fps)
    motion/idle.ts        movimento ambiente
    motion/interaction.ts cursor, arraste, inércia, toque horizontal
    motion/scrollTimeline.ts timeline única ligada ao scroll
    quality/quality.ts    tiers e DPR adaptativo
scripts/                  capture · still · sheet · poster (Playwright local)
```

**Escolhas:** Three.js puro (sem React Three Fiber) — loop, molas e morph imperativos ficam mais simples e leves; GSAP **não** usado — o progresso do scroll é lido do DOM e suavizado por mola; timeline reversível por construção. Dependências: next 16.4.2, react 19.3.1, three 0.186.1 (+ playwright-core 1.63 só para testes).

## Geometria

1. Espinha: nó (2,3) com raio principal variável, achatamento horizontal e profundidade modulada — evita o toro genérico.
2. Referencial: vetor "para dentro" do nó ortogonalizado contra a tangente, girado por uma torção periódica.
3. Cada fita varre um segmento com largura variável e seção levemente côncava; normais analíticas.
4. Três camadas laminadas sobre a mesma espinha, afastadas 0,026 ao longo da normal: leem como uma fita espessa de bordas escalonadas e **não se cruzam** por construção.
5. Atributo `aRib = (u, v, camada)` alimenta cor, ondulação e o morph de fluxo.

Tier alto: 900 × 14 segmentos × 3 camadas ≈ 75,6 mil triângulos, 1 draw call.

## Movimento — donos únicos por transformação

`scrollRig` (scroll) → `interactionRig` (cursor/arraste) → `idleRig` (ambiente) → malha (pose de repouso). Nenhum sistema escreve no transform de outro, então nada disputa controle.

- **Ambiente:** senóides de frequências incomensuráveis (sem ciclo perceptível) + ondulação de vértices de 1,4% ao longo da fita.
- **Cursor:** alvo limitado a ±4° X / ±8° Y perseguido por molas (k=16, ζ=0,82).
- **Arraste:** rotação segue o ponteiro; velocidade angular medida por média móvel; ao soltar, a inércia continua e uma mola fraca (k=2,4) devolve a peça pelo caminho mais curto. Pitch limitado a ±28°. Soltar parado zera a inércia.
- **Toque:** só gesto horizontal gira; vertical é scroll nativo (`touch-action: pan-y`).
- **Reação local:** o cursor é projetado no espaço local da peça; vértices próximos se afastam alguns milímetros (falloff gaussiano).
- **Delta time:** toda integração usa dt real com subpassos de 1/240 s; `dt` limitado a 0,1 s.
- **Pausar movimento:** congela o ambiente; o cursor continua porque é iniciado pelo usuário.

## Timeline de scroll (sem pin)

Canvas fixo atrás; o conteúdo rola normalmente. Progresso = scroll até a régua do manifesto chegar a 38% da altura da viewport.

| Progresso | Estado |
|---|---|
| 0 | Entrada: escultura íntegra |
| 0,04–0,30 | Interação e ambiente perdem peso; texto do hero sobe e some |
| 0,06–0,60 | Recomposição: gira, encolhe, migra ao centro (parallax 0,42) |
| 0,30–0,98 | As fitas se desenrolam a partir de uma ponta e viram 3 linhas paralelas — no vertex shader, interpolando a posição de mundo até um alvo calculado da régua real do DOM |
| 0,93–1 | Passagem: canvas some, as linhas do DOM assumem na mesma posição |

Reversível: todo estado é função do progresso.

## Desempenho, fallback e acessibilidade

- Texto do hero é HTML real servido estático; o motor 3D é um chunk separado (543 KB / 135 KB gzip), carregado depois do primeiro paint; o poster é um render próprio (`scripts/poster.mjs`).
- Tiers: alto 900×14 · médio 620×10 · baixo 380×6; DPR máximo 2 / 1,5 / 1,25; DPR adaptativo com histerese.
- Não renderiza quando o canvas está invisível; para em aba oculta; perda de contexto WebGL → poster.
- `prefers-reduced-motion`: escultura estática, sem ambiente, cursor, arraste nem morph; canvas apenas some no scroll.
- Ordem de Tab: marca → navegação → CTAs → Pausar. A escultura é decorativa (`aria-hidden`).

## H7 — Verificações executadas (resultados reais)

| Verificação | Resultado |
|---|---|
| `tsc --noEmit` / `eslint .` | sem erros |
| `next build` | ok, rota `/` estática |
| Console (1440, 1280, 768, 390, 360) | 0 erros do app (1 aviso de hidratação causado por extensão do navegador `data-bry-*`) |
| Overflow horizontal nas 5 larguras | nenhum |
| Custo de GPU por quadro (Intel UHD 630, D3D11, DPR 1, tier alto, sincronizado com readPixels) | 1440: 9,9 ms · 1280: 9,4 ms · 768: 8,5 ms · 390: 6,9 ms · 360: 7,6 ms |
| fps observado em headless (mesma GPU) | 38–60 |
| Cursor, arraste com inércia, retorno ao repouso | verificado em captura |
| Scroll 15/45/70/100% e volta a 45% e ao topo | verificado; volta restaura o estado 01 |
| Reduced motion | escultura estática, sem botão de pausa |
| Sem WebGL / sem JS | poster + texto completo / texto completo |
| Botão Pausar | alterna `aria-pressed` e rótulo (após correção) |

**Não medido:** dispositivos móveis reais, telas de 120 Hz, DPR 2–3 real, Safari/Firefox, Core Web Vitals de campo. O Chrome via extensão estrangula o rAF desta janela (2 fps até sem WebGL), por isso a medição foi feita em Playwright headless com a GPU real.

## Limitações conhecidas

1. O material ainda lê um pouco "vítreo" nas áreas de camada sobre camada; falta contraste de metal escuro × realce.
2. A composição texto à esquerda / escultura à direita segue a referência e continua previsível; a relação de profundidade entre título e escultura (Fluid Precision) ainda não foi aplicada.
3. Durante o desenrolar, as pontas das camadas aparecem por um instante como bordas escalonadas.
4. O poster é 1 PNG de 1 MB (servido otimizado pelo next/image); não há versão específica para mobile.
5. Reação local ao cursor é sutil; precisa de avaliação humana se vale manter.
6. Ainda não há contact shadow nem oclusão: a peça flutua sem chão.
