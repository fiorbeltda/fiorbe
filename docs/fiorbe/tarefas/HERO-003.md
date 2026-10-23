# HERO-003 — Cenário do hero (chão, reflexo, sombras, luz, atmosfera, trilhas)

| Campo | Valor |
|---|---|
| Área | Hero Experience |
| Etapa do plano | 04 (cenário), no protótipo `E:\dev\fiorbe\prototypes\hero-3d` |
| Implementação | Ambiente cinematográfico V2 implementado (padrão em todas as formas); ambiente anterior preservado em `?ambiente=v1` |
| Aprovação | Base da luz arquitetônica aprovada como experimental (22/10/2026); ambiente cinematográfico V2 aguardando revisão visual |
| Branch / checkpoint | `exp/hero-fidelidade` · ver Histórico |
| Próximo objetivo | Revisão do piso corrigido (`captures\piso-correcao.png`, `captures\fim-hero.png`). Depois: reflexo das bordas prateadas mais presente no contato, colunas de luz à direita da figura mais definidas e com reflexo vertical no piso |

## Arquitetura (ambiente cinematográfico V2)

| Peça | Arquivo | Como funciona |
|---|---|---|
| Piso | `src\three\scene\floor.ts` | Shader próprio: concreto escuro com textura de ruído 256² repetível (relevo fino, médio, manchas molhadas) → rugosidade variável, poças mais espelhadas, albedo irregular discreto, microrrelevo, brilhos de umidade, Fresnel |
| Reflexo | `floor.ts` + `set.ts` | Escultura, paredes de luz e figura espelhadas numa cena própria, desenhadas em **meia resolução** num alvo com mipmaps. O piso amostra com distorção quase só vertical, desfoque por rugosidade e pela distância à linha de contato (nítido junto à base, desfocado longe), toques esticados na vertical |
| Sombras | `floor.ts` | "Pegada" da escultura vista de cima (alvo 256², a cada 3 quadros) → oclusão de contato e sombra projetada a partir do núcleo de luz; sombra analítica da figura; reflexo escuro da figura no alvo |
| Luz arquitetônica | `src\three\scene\backlight.ts` (`uCine`) | Preenchimento chapado mínimo (vãos escuros entre colunas), luz concentrada no horizonte, ciano/teal embaixo e azul-noturno no alto; contraluz da figura cortado na linha do chão |
| Atmosfera | `floor.ts`, `backlight.ts` | Névoa muito sutil no piso distante e brilho baixo junto ao horizonte; sem pós-processamento |
| Trilhas | `set.ts` (`layoutTrails`) + `floor.ts` | As curvas do SVG do hero são lidas do DOM, projetadas no plano do chão e pintadas numa textura do piso (traço + halo); perspectiva real, espessura constante no chão, halo que se espalha nas regiões ásperas; o SVG fica escondido. Recalculadas ao redimensionar. Mobile: sem trilhas 3D (como antes) |
| Mobile | `floor.ts` (`uCompact`) | Sem reflexo; o piso esmaece logo abaixo do contato (fica sob o texto) |

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