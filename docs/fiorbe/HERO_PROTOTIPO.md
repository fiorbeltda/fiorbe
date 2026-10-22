# Protótipo do hero interativo

## Rodada 4 — figura humana (22/10/2026) — branch `exp/hero-fidelidade`

**Pesquisa e decisão.** Opção de asset com licença limpa encontrada: Quaternius Universal Animation Library (CC0, glTF, 120+ animações). Descartada para esta cena porque o personagem é um manequim nu e liso — exatamente a leitura que o usuário quer evitar — e vesti-lo exigiria modelagem em Blender (indisponível nesta sessão). Os personagens dos exemplos do three.js (Soldier, Michelle) têm origem Mixamo e licença não confirmada. Escolha: **figura construída em código com esqueleto real** (`src/three/figure/figureRig.ts`): 20 ossos, `SkinnedMesh` com pesos misturados nas articulações, silhueta de terno (ombros estruturados, paletó com barra, calça reta, sapatos), ~7,6 cabeças de proporção. Nenhum download. A arquitetura aceita trocar por um GLB rigado (mocap) depois sem mudar o resto.

**Animação** (`src/three/figure/figureMotion.ts`), tudo com dt real:
1. Pose-base em contrapposto (peso na perna direita, cabeça levemente erguida para a escultura) — `AnimationAction` normal.
2. Respiração — clip **aditivo** (`makeClipAdditive` + `AdditiveAnimationBlendMode`): peito abre, ombros sobem um fio; inspira mais curta que expira.
3. Transferência de peso — clip **aditivo**: quadril desloca milímetros, tronco compensa.
   Período e peso dos dois derivam por ruído suave (respiração 4,2–5,4 s; peso 11–17 s, às vezes quase parado) → sem loop mecânico.
4. Olhar — molas criticamente amortecidas na cabeça/pescoço, alvos pequenos sorteados a cada 5–12 s.
5. Mãos — oscilação mínima defasada.
6. **IK por CCD** (canela→coxa, 3 iterações) devolve cada pé ao ponto de apoio, registrado no espaço local da figura (scroll/parallax não "puxam" os pés); o pé mantém a orientação de apoio.
Crossfade entre clips não foi usado: não há troca de estado, e a pesquisa apontou o problema de aditivo durante crossfade somar sobre a pose errada.

**Integração.** Contraluz só na borda voltada para a luz (fresnel enviesado, sem contorno total); halo próximo atrás da figura; poça de luz no piso; sombra de contato; reflexo com o **mesmo esqueleto** (SkinnedMesh em modo `detached` com matriz de espelho) desenhado escuro sobre a poça; feixes reduzidos a 3, largos e com bordas suaves. Sem reação ao cursor (decisão: nenhuma reação é melhor que uma artificial).

**Medições (Intel UHD 630, 1440×900, DPR 1):** GPU 18,1 ms/quadro (antes 17,7 ms; +0,4 ms); CPU do movimento da figura 0,075 ms/quadro; FPS observado 52–60. Idle em 16 s: pés variam ≤ 0,2% da altura da figura (subpixel), quadril 0,55%, cabeça 0,87%. Reduced motion e pausado: 0,000%. 0 erros de console, sem overflow nas 5 larguras, build ok. Poster passou a ser import estático com hash (o cache de imagens do Next servia o poster antigo).

**Ainda não está no nível desejado:** proporções boas mas a malha é low-poly e lisa — não há dobras de tecido nem mãos com dedos (invisíveis nesta escala, mas perceptíveis em zoom); o movimento é procedural, não captura de movimento real; o fundo imediatamente atrás da figura ainda é menos luminoso que na referência; o reflexo não esmaece com a distância dos pés.

---

## Rodada de fidelidade artística (22/10/2026) — branch `exp/hero-fidelidade`

Objetivo do usuário: aproximar a abertura da imagem `E:\dev\fiorbe\referencias\hero\referencia-hero-v1.png` (1672×941), inclusive nos detalhes, sem perder interatividade. Baseline registrada antes das mudanças (`captures\cmp-baseline.png`); comparações em `captures\compare-ciclo1..8.png` e `compare-final.png` (referência | antes | depois, mesmo enquadramento), geradas por `scripts\compare.mjs`.

**Geometria.** As 3 camadas laminadas sobre uma espinha não produziam fitas independentes. Testadas: (1) cascas elipsoidais aninhadas — sem interseções, mas viraram "gaiola" fechada; (2) **curvas autorais** (escolhida): 6 fitas fechadas desenhadas a partir das proporções medidas na referência (`sculpture/monument.ts`), com profundidade escolhida nos cruzamentos, largura voltada ao observador, torção suave e pernas acomodadas no chão. GLB externo foi descartado nesta sessão (não há modelo nem ferramenta de modelagem disponível). A geometria anterior continua em `?geo=knot`.

**Material e luz.** Metal 1.0, rugosidade 0.2, anisotropia 0.6, clearcoat 0.2 (o excesso era a causa do aspecto vítreo), estrias com passo visível (36 por largura), paleta mais marinho, estúdio de reflexos com faixas estreitas em vez de softboxes largas, luzes diretas reduzidas (geravam realces que cobriam a face inteira), filete de borda reduzido.

**Cenário.** `scene/set.ts`: chão escuro semitransparente; reflexo = a própria escultura espelhada sob o chão com geometria pela metade (sem render-to-texture), desligado no tier baixo e em telas < 1024 px; figura humana desenhada em canvas (≈15% da altura da escultura) com filete de contraluz e reflexo; halo e feixes verticais suaves junto à figura. Câmera na altura dos olhos com *lens shift* (horizonte 7,5% acima da base do palco).

**Trilhas.** Com a câmera na altura dos olhos, o piso 3D comprime toda a trilha em ~25 px. Como o piso é estático no repouso, as trilhas viraram SVG aditivo nas coordenadas da referência (`Hero.tsx`) — mesmo resultado, menor custo.

**Interface.** Wordmark provisório, Produtos/Sobre/Contato, CTA "Conversar", eyebrow, título com gradiente sutil, descrição, CTAs, badge e faixa inferior com 3 informações honestas (sem as alegações da referência).

**Interação.** Arraste limitado a ±20° de giro horizontal e ±4° de inclinação (limite elástico + a inércia não atravessa o limite); cursor ±1,5° X / ±7° Y. Scroll reversível mantido; o cenário some no início da rolagem.

**Medições (Intel UHD 630, D3D11, DPR 1, tier alto, Playwright headless):** GPU por quadro 1440: 17,8 ms · 1280: 15,5 · 768: 12,2 · 390: 8,2 · 360: 9,0 (antes: 9,9 ms a 1440). 12 draw calls, ~130 mil triângulos. FPS observado a 1440: 58–60. 0 erros de console; sem overflow; pausa alterna; reduced motion e sem JS corretos. Não medido: celulares reais, DPR 2–3, Safari/Firefox.

**Diferenças que permanecem em relação à imagem:** fitas ainda mais "macias" e menos afiadas; realces brancos finos menos intensos; faltam as linhas-contorno luminosas finas ao redor da silhueta; centro mais denso que o da referência; reflexo do chão mais nítido e menos "molhado"; não há símbolo ao lado do wordmark (logo não aprovado); feixes de luz ainda um pouco literais; pontas "desfiadas" durante o desenrolar do scroll; custo de GPU quase no limite de 60 fps nesta máquina.

---

## Primeira versão — H1 a H7 (22/10/2026)

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
