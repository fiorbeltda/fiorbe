# HERO-003 — Cenário do hero (chão, reflexo, sombras, luz, atmosfera, trilhas)

| Campo | Valor |
|---|---|
| Área | Hero Experience |
| Etapa do plano | 04 (cenário), no protótipo `E:\dev\fiorbe\prototypes\hero-3d` |
| Implementação | Ambiente cinematográfico V2 (todas as formas) + **acabamento de piso do Ciclo 02** (`uC02`: padrão só na V2.3; `?piso=c02` liga em qualquer forma, `?piso=atual` volta ao anterior). Ambiente v1 em `?ambiente=v1` |
| Aprovação | Base da luz aprovada como experimental (22/10/2026); Ciclo 02 aprovado (26/10/2026); **Ciclo 05 implementado, aguardando revisão artística** |
| Branch / checkpoint | `exp/hero-fidelidade` · ver Histórico |
| Próximo objetivo | Revisão artística do Ciclo 05 (`E:\dev\fiorbe\prototypes\hero-3d\captures\ciclo05\comparacao-*.png`). Ciclo 06 só com nova autorização |

## Ciclo 05 — arquitetura e iluminação (26/10/2026)

Chave `uC05` em `backlight.ts` (opção `lightC05`): padrão só na V2.3; `?luz=c05` liga em qualquer forma, `?luz=atual` volta à anterior. Forma C e V2.3r conferidas idênticas (0,000%).

**Diagnóstico.** A arquitetura é 100% procedural e aditiva: duas paredes planas (principal e uma ao fundo, deslocada, ganho 0,45) com núcleo, 6 colunas, névoa, brilho do horizonte e uma "fachada" de lâminas finas à direita da figura; plano de contraluz atrás da figura; o piso reflete as duas paredes e o contraluz. Custo dominado pelo preenchimento das paredes (loop de 6 colunas por pixel em dois planos grandes).
| Problema | Causa |
|---|---|
| Colunas gráficas (faixas uniformes) | Caixa suavizada com borda igual para todas e queda de brilho simples para cima — sem distinção de distância |
| Região atrás da figura chapada em ciano-branco | Fachada e brilho de contraluz somados em `uCore` (ciano) com ganho alto |
| Parede do fundo igual à principal, só mais fraca | Mesmo shader; nenhuma perspectiva aérea |
| **Borda vertical no piso a 940/768 px** (pendência registrada) | **Não era reflexo**: o véu editorial do Ciclo 01 (`.copy::before`, layout empilhado) termina num corte reto na largura da coluna de texto (≈ 796 px a 940). Confirmado nas etapas `?pisodebug` (a borda aparece até no reflexo bruto, sobreposta pelo DOM) |

**Implementado.** (1) `column05`: luz acumulada na base e cauda que sobe, miolo mais claro que as bordas; profundidade por coluna derivada da intensidade (fracas = macias, frias, atrás; fortes = nítidas, à frente). (2) Fachada e contraluz atrás da figura em branco frio (meio-termo entre `uCore` e branco) e entrada da fachada gradual. (3) Parede do fundo com perspectiva aérea leve (dessatura para azul profundo, −8%). (4) Véu editorial empilhado com máscara esmaecendo para a direita (`Hero.module.css`) — some a borda vertical do piso.
**Descartado.** Concentrar a luz no horizonte e escurecer o meio da parede (1ª e 2ª iterações): a cena ficou visivelmente mais escura e menos monumental — "menos luz" sem ganho de profundidade. Cor das colunas em degradê branco→azul: reduzia a energia da base aprovada. `sin` por pixel na cauda das colunas: custo sem ganho visível.

**Verificado.** Cena idêntica acima e na escultura (material do Ciclo 04 intacto); onda, cursor, arraste, pausa, reduzido, rolagem reversível, sem JS/WebGL, 0 erros de console; tsc, eslint (0 erros), build. GPU 1440 alto (A/B, 2 séries): 17,1–17,4 × 16,7–16,8 ms (≈ +0,4 ms, 2,5%). Movimento real (`scripts\ciclo05-motion.mjs`): variação entre quadros igual ou menor. Folhas `captures\ciclo05\comparacao-A-cena.png` … `-F-movimento.png`.

**Limitações.** Mudança deliberadamente contida: a base da luz já era aprovada, e as tentativas mais ousadas pioraram a profundidade. Colunas continuam planos procedurais (sem geometria). Antes de nova volumetria, valeria rever com os fundadores se a direção "mais escura/mais contraste" é desejada.

## Ciclo 02 — piso e reflexos (26/10/2026)

**Diagnóstico (etapas `?pisodebug`, `=filtrado`, `=semhl`, `=sombra`; recortes 2–4×).** As correções de piso da V2.3r (destaques por contraste local, compressão dos altos, umidade em manchas — `88db3ac`) já valiam para todas as formas: resolveram as barras dos destaques, não o desfoque base. Causas reais restantes:
| Sintoma | Causa |
|---|---|
| Manchas/bolhas claras, degraus quadrados (regiões A, B) | Desfoque quase todo por mip alto (LOD ≈ 4–5) do alvo em meia resolução — isotrópico e em blocos; um filete claro virava bolha redonda |
| "Pente" branco borrado sob o redemoinho | Mesmo desfoque + compressão fraca (joelho 0,22) das faixas de luz entre as lâminas |
| Listras horizontais (aparência de água) | Fresnel calculado com a normal do relevo **fino** (não alongado): na vista rasante `pow(1 − N·V, 5)` amplifica o desvio e a perspectiva o comprime em linhas. O reflexo filtrado não tem listras; o composto tem |
| "Poeira" de pontos brancos | Brilhos de umidade densos (1,5% das células) e fortes (×1,6), inclusive em células subpixel |
| Trilha serrilhada, anel chapado | Textura das trilhas lida com `textureLod(…, 0)` (sem mip nem anisotropia); halo próximo em faixa larga e saturada |
| Linha atrás da headline a 940 px | Junta do concreto no layout empilhado (não é reflexo) |
| Borda vertical clara à direita (940) | Reflexo da fachada de luz — coerente com as colunas acima; fica para o Ciclo 05 |

**Implementação (só `floor.ts`, sem passe nem textura novos; tudo sob `uC02`).**
1. Reflexo em **traço vertical**: 9 toques ao longo da vertical da tela, mip baixo (teto 2,6), comprimento `5 + 40·rough + (14 + 80·rough)·away` px — curto junto ao contato e nas poças, longo no concreto áspero e ao longe; toques alternados levemente para os lados (sem "código de barras"); jitter fixo por pixel (estável no tempo).
2. Fresnel pela normal do plano (o relevo fino segue no difuso e nos brilhos).
3. Compressão dos altos com joelho 0,15 e ombro mais firme; destaques prateados meio mip acima, limiar de contraste mais alto e com teto.
4. Brilhos de umidade raros, fracos e só em células ≥ ~1 px.
5. Trilhas com mip/anisotropia, sem a faixa chapada do halo, cor um pouco menos saturada, halo que se espalha mais no molhado.
6. Layout empilhado: juntas só na faixa sob o contato.
Descartado: mais ruído procedural no concreto (criaria manchas evidentes — a variação de rugosidade/umidade já aparece no comprimento dos traços); traço sem largura mínima (lâminas em "código de barras"); traço sem comprimento mínimo junto ao contato (o redemoinho voltava a refletir como pente nítido, espelho).

**Verificado.** Acima da linha do piso a imagem é idêntica (diferença máx. 3–4 níveis); `?piso=atual` = caminho anterior por construção (todas as linhas novas sob `uC02`) → forma C, V2.2 e V2.3r inalteradas. Estabilidade em movimento real (`scripts\ciclo02-motion.mjs`, recorte do piso): onda Δ 5,3–5,8 → 4,1–5,2 e picos 349–874 → 210–683; cursor Δ 6,6–10,7 → 5,2–7,6; arraste equivalente (a peça gira de fato). Consistência carga larga/estreita→alargada/redimensionada/5 s ok (`floor-consistency.mjs`). tsc, eslint (0 erros), build, pausa, reversibilidade, fallbacks e 0 erros de console. GPU (A/B alternado, mesma sessão, 1440, alto): novo 16,9–18,2 ms × anterior 16,6–18,2 (≈ +0–0,4 ms; uma amostra contaminada de 21,8 descartada); tier baixo 10,3–10,9 × 10,1–10,4. Folhas `captures\ciclo02\comparacao-A-geral.png` … `-F-movimento.png`.

**Limitações.** O piso ficou mais contido — se os fundadores quiserem mais brilho prateado, os ganhos dos destaques e da compressão são os controles. Borda vertical do reflexo da fachada (Ciclo 05). Serrilhado claro na base da escultura é da borda do metal (Ciclo 04). Mobile/toque continua sem reflexo (regra anterior).

## Arquitetura (ambiente cinematográfico V2)

| Peça | Arquivo | Como funciona |
|---|---|---|
| Piso | `src\three\scene\floor.ts` | Shader próprio: concreto escuro com textura de ruído 256² repetível (relevo fino, médio, manchas molhadas) → rugosidade variável, poças mais espelhadas, albedo irregular discreto, microrrelevo, brilhos de umidade, Fresnel |
| Reflexo | `floor.ts` + `set.ts` | Escultura, paredes de luz e figura espelhadas numa cena própria, desenhadas em **meia resolução** num alvo com mipmaps. O piso amostra com distorção quase só vertical, desfoque por rugosidade e pela distância à linha de contato (nítido junto à base, desfocado longe), toques esticados na vertical |
| Sombras | `floor.ts` | "Pegada" da escultura vista de cima (alvo 256², a cada 3 quadros) → oclusão de contato e sombra projetada a partir do núcleo de luz; sombra analítica da figura; reflexo escuro da figura no alvo |
| Luz arquitetônica | `src\three\scene\backlight.ts` (`uCine`) | Preenchimento chapado mínimo (vãos escuros entre colunas), luz concentrada no horizonte, ciano/teal embaixo e azul-noturno no alto; contraluz da figura cortado na linha do chão |
| Atmosfera | `floor.ts`, `backlight.ts` | Névoa muito sutil no piso distante e brilho baixo junto ao horizonte; sem pós-processamento |
| Trilhas | `set.ts` (`layoutTrails`) + `floor.ts` | As curvas do SVG do hero são lidas do DOM, projetadas no plano do chão e pintadas numa textura do piso (traço + halo); perspectiva real, espessura constante no chão, halo que se espalha nas regiões ásperas; o SVG fica escondido. Recalculadas ao redimensionar. Mobile: sem trilhas 3D (como antes) |
| Responsivo | `floor.ts` (`uCompact`, `setCompact`) | Largo: completo. Empilhado (< 1024 px) com mouse e ≥ 768 px: reflexo numa faixa sob a escultura. Toque ou mais estreito: sem reflexo, piso esmaece logo abaixo do contato. Reavaliado a cada redimensionamento |

Depuração: `?pisodebug` (alvo do reflexo puro), `?pisodebug=sombra` (oclusão R, sombra da escultura G, sombra da figura B), `?ambiente=v1` (ambiente anterior), `window.__fiorbe.floor()` (trilhas projetadas).

## Desempenho (Intel UHD 630, alto, 1440×900, DPR 1, `scripts\bench-ab.mjs`)

| Configuração | GPU/quadro |
|---|---|
| Blender V2 · ambiente v1 | 18,6–18,8 ms |
| Blender V2 · ambiente V2 | 14,7 ms |
| Forma C · ambiente V2 | 16,0 ms (v1 ≈ 18,8) |
| Blender V1 · ambiente V2 | 13,5 ms |

O reflexo deixou de ser uma segunda escultura em resolução cheia (a cena é limitada por preenchimento) — o ambiente novo é mais barato que o anterior.

## Histórico

| Data | O que foi feito | Checkpoint |
|---|---|---|
| 23/10/2026 | Ambiente cinematográfico V2 em três ciclos. **A:** piso procedural molhado + reflexo planar em meia resolução com desfoque por rugosidade e distância ao contato; corrigido o contraluz da figura que vazava abaixo do chão (tapava o reflexo da figura). **B:** luz arquitetônica com profundidade (alto escuro, vãos entre colunas, ciano no horizonte), oclusão e sombra pela pegada da escultura. **C:** trilhas projetadas no piso, névoa sutil no horizonte, mobile com esmaecimento. Rejeitados no caminho: distorção forte (lia água), mosqueado fino visível (lia piso agitado), luz difusa forte (apagava o reflexo da figura). Capturas `captures\ambiente-comparacao.png`, `captures\antes-*.png`, `captures\c8-*.png`, `captures\formaC-hero.png`, `captures\checagens-rib-v2.png`, `captures\blender2-reduced.png`, `captures\blender2-390.png` | ver commit |
| 23/10/2026 | **Correção de consistência + concreto molhado.** Causa da diferença entre cargas da mesma URL: o modo de tela estreita (`innerWidth < 1024`) era decidido **uma vez na carga** — abrindo a janela estreita (navegador dividido, zoom, DevTools) e depois alargando, a cena ficava presa sem reflexo (piso quase preto) e com as trilhas SVG; abrindo larga, vinha o reflexo completo. Agora o modo é reavaliado a cada redimensionamento (`setCompact`): o alvo de reflexo é criado sempre que o tier permite e só liga/desliga com a largura. Tier baixo sem reflexo ganhou acabamento analítico (faixa da luz do núcleo, brilho do horizonte, luz ambiente) em vez de plano preto. Aparência de água: manchas de umidade/rugosidade/relevo eram redondas no chão e a perspectiva rasante as comprimia em faixas horizontais — agora alongadas em profundidade; distorção do reflexo só vertical e mínima; corrigida corrupção da textura de ruído (alfa aleatório no canvas 2D pré-multiplicava e degradava os canais → blocos); brilhos de umidade como pontos redondos; contraste seco/molhado maior e piso mais escuro. Testado e revertido: MSAA no alvo de reflexo em meia precisão (pixels laranja inválidos). Indicador \"1 Issue\" do Next: não aparece num Chromium limpo (só aviso de LCP do pôster no console) — vem do navegador do usuário (extensão). Teste reproduzível `scripts\floor-consistency.mjs` (espera a cena pronta e o pôster sumir; carga larga, estreita→alargada, redimensionada, após 5 s; com `tier=low`). GPU: V2.1 B ≈ 16,1 ms (v1 ≈ 19,9; tier baixo ≈ 9,7); forma C ≈ 15,9 ms. Capturas `captures\antes-estreito-alargado.png` × `captures\ciclo1-*.png`, `captures\piso-correcao.png`, `captures\piso-vs-v1.png`, `captures\fim-*.png` | ver commit |\n
| 23/10/2026 | **Acabamento final do ambiente.** Responsividade do piso preservada (commits `53a7467`/`147030d`: largo completo; janela estreita com mouse ≥ 768 px = faixa com reflexo sob a escultura; toque/estreito = simplificado; reavaliado ao redimensionar — `scripts\floor-consistency.mjs` ok). **Reflexos:** amostra extra mais nítida do mesmo alvo (sem passe novo) que guarda só a parte brilhante, alongada para baixo na tela e levemente dessaturada (prateado), mais forte junto ao contato e só nas áreas molhadas; reflexo difuso um pouco mais nítido perto da base (mip ≥ 0,45 para não serrilhar a meia resolução). Diagnóstico (`?pisodebug`): o reflexo da escultura mostra o lado de baixo das lâminas, que é azul-escuro — o brilho junto à base vem da luz entre as lâminas; deixá-lo prateado exigiria mexer na iluminação do material (fora do escopo). **Luz:** fachada de lâminas de luz finas à direita da figura (larguras, alturas e brilhos variados, bordas nítidas antisserrilhadas, mais brancas embaixo), brilho ciano-branco localizado atrás da figura no horizonte, bordas das colunas mais definidas, alto da parede e colunas à esquerda mais escuros (menos véu azul); as lâminas aparecem como reflexos verticais no piso. GPU (mesma sessão, A/B): V2.1 B 15,95 → 16,45 ms (+3%); forma C 16,0 → 16,45; tier baixo ≈ 9,9. Depuração `window.__fiorbe.wallToScreen(xs)`. Capturas `captures\acabamento-comparacao.png`, `captures\fin0-*.png` × `captures\fin4-*.png` | ver commit |
| 23/10/2026 | **Master polish (ciclo 4) — primeira visão.** Cenário congelado (sem mudanças). Interface: barra inferior com títulos e ícones desalinhados (a grade centralizava cada item pela própria altura; o do meio, de uma linha, descia 15 px) → itens com a altura da linha e conteúdo pelo topo. Pôster do hero com `loading=\"eager\"` e prioridade alta (era o aviso de LCP do Next). Hidratação: num Chromium limpo não há erro — os atributos `data-bry-content-script-bryweb*` vêm de uma extensão do navegador do usuário; código não alterado. Conferidos: foco por teclado visível e em ordem, sem rolagem horizontal (390/768/1000/1366/1920), sem JS (texto + pôster), sem WebGL (pôster, sem erros), movimento reduzido (quadros idênticos com o mouse sobre a peça). Scripts `scripts\ui-check.mjs`, `scripts\fallback-check.mjs` | ver commit |
| 23/10/2026 | **Detalhamento do piso (pedido do usuário).** Concreto arquitetônico: juntas de dilatação entre placas de 2,8 un (escala real ao lado da figura), cortes finos que quebram o reflexo em vez de desenhar linha preta (1ª versão escura demais, suavizada), antisserrilhadas pela derivada e apagadas ao longe; agregado fino (grão de pedra) perto da câmera, some pelo mip ao longe; borda mais escura do concreto úmido em volta das manchas molhadas. Continua concreto molhado, não água. Custo ≈ +0,1–0,2 ms (A/B na mesma sessão). Capturas `captures\chao2-piso.png`, `captures\chao2-contato.png` | ver commit |
| 23/10/2026 | **Reflexo das lamelas no piso (região 4).** Etapas comparadas (`scripts\floor-stages.mjs`, `?pisodebug`, `=filtrado`, `=semhl`): o reflexo bruto já tem as faixas de luz do fundo entre as lâminas, e o desfoque é correto — as barras brancas repetitivas eram criadas pelo passe de destaques prateados, que pegava qualquer região clara (inclusive as faixas largas inteiras). Agora: destaques só do detalhe mais claro que a vizinhança (bruto − desfocado), amostrados mais suaves (sem degraus da meia resolução); compressão suave só dos valores altos do reflexo largo; variação de molhado em manchas alongadas quebrando o reflexo em áreas. Juntas continuam cortando o reflexo. Sem passe novo. Capturas `captures\piso-etapas0.png` × `captures\piso-etapas-final.png` | ver commit |
