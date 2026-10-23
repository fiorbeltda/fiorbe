# HERO-003 — Cenário do hero (chão, reflexo, sombras, luz, atmosfera, trilhas)

| Campo | Valor |
|---|---|
| Área | Hero Experience |
| Etapa do plano | 04 (cenário), no protótipo `E:\dev\fiorbe\prototypes\hero-3d` |
| Implementação | Ambiente cinematográfico V2 implementado (padrão em todas as formas); ambiente anterior preservado em `?ambiente=v1` |
| Aprovação | Base da luz arquitetônica aprovada como experimental (22/10/2026); ambiente cinematográfico V2 aguardando revisão visual |
| Branch / checkpoint | `exp/hero-fidelidade` · ver Histórico |
| Próximo objetivo | Revisão visual (`captures\ambiente-comparacao.png`). Depois: reflexo das bordas metálicas mais brilhante e prateado (hoje o reflexo da escultura lê escuro), brilho de horizonte/colunas à direita da figura mais próximo da referência, serrilhado distante das trilhas |

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
