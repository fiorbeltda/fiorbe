# ESTADO DO PROJETO FIORBE — PAINEL CENTRAL

> **Fonte canônica do status.** Atualizar ao fim de TODA tarefa: painel, mapa de componentes e ficha da tarefa (`docs/fiorbe/tarefas/`). Sempre registrar qual é o **próximo objetivo**.
> Implementado ≠ aprovado. Commit ≠ aprovação. Não usar porcentagens de progresso.

**Última atualização:** 27/10/2026

## Painel

| Campo | Situação |
|---|---|
| **Objetivo principal** | Concluir a landing page institucional da FIORBE (`/` e `/produtos/motor-fiscal`) no nível de qualidade definido em `CLAUDE.md`. |
| **Etapa atual** | **DS-001 — Identidade Visual, sub-etapa DS-001A (exploração editorial da primeira tela).** Três direções (A, B, C) implementadas em `/editorial/a|b|c` e enviadas ao GitHub (commit `bc41d0c`, branch `exp/ds001a-editorial`); **aguardando revisão visual e decisão dos fundadores** — nenhuma direção escolhida. Hero Experience segue consolidado (HERO-FINAL-001, 26/10/2026). |
| **Componentes em desenvolvimento** | `HERO-003` — Cenário: ambiente cinematográfico V2, padrão em todas as formas, anterior em `?ambiente=v1` ([ficha](tarefas/HERO-003.md)) · `RIB-001` — Escultura viva (referência artística: Blender V2.3, `?forma=blender2-v23`; V2.3 refinada é a forma padrão do protótipo desde HERO-FINAL-001; C, V2.2 e V2.3r preservadas por `?forma=`) ([ficha](tarefas/RIB-001.md)) · `FIG-001` — Figura humana (v1, aguardando revisão) ([ficha](tarefas/FIG-001.md)) |
| **Versão-base do Hero** | **Blender V2.3 refinada é a forma padrão do protótipo** (`/` = `?forma=blender2-v23`), com os acabamentos dos Ciclos 01–06. Forma C, V2.2 e V2.3r preservadas por `?forma=c`, `?forma=blender2-v22`, `?forma=blender2-v23r`. Pôster regenerado da V2.3. Decisão de consolidação autorizada pelo usuário; não converte os Ciclos 04 e 05 em aprovações individuais. |
| **Tarefa ativa** | **DS-001B — direção de arte autoral (exploração):** F1 Forma (`/editorial/f1`, "O complexo ganha forma.") e F2 Contraste (`/editorial/f2`, "Complexidade, sob outra forma.") sobre a base de D, mais a assinatura editorial em `/editorial/assinatura` ([ficha](tarefas/DS-001.md)); **aguardando revisão dos fundadores**. Nada promovido; `/` inalterada. Hero — estado dos ciclos: 01, 02, 03 e 06 aprovados formalmente; 04 e 05 com avaliação artística positiva e autorização para continuar (sem aprovação formal individual); validação integrada concluída sem bloqueadores; PERF-001 concluído (7 amostras descartadas). |
| **Próximo objetivo** | **Fundadores revisarem `captures\ds001a\ds001b\` (D × F1 × F2 e assinatura) e decidirem a direção (D, F1, F2 ou combinação) e o que da assinatura editorial entra no sistema.** Sequência acordada: corrigir status → comparar A, B e C → escolher → refinar a direção escolhida → consolidar o Design System (DS-001: marca e símbolo, lettering/wordmark, tipografia, paleta, espaçamentos, botões, ícones, animação, tokens). O Hero é referência artística, não decisão de marca. DS-002, HERO-006 e seções da landing seguem bloqueados até decisão. |
| **Branch / último checkpoint** | `exp/ds001a-editorial` (criada a partir de `exp/hero-fidelidade`) · último commit `bc41d0c` (DS-001A) **enviado ao GitHub**, sincronizado com `origin/exp/ds001a-editorial`. `exp/hero-fidelidade` em `c9f1672` (HERO-FINAL-001), também no GitHub. `origin/main` em `4d9f930` (merges dos PRs #1–#3); merge na `main` não feito e continua exigindo autorização. |
| **Servidor local** | `npm run dev` em `E:\dev\fiorbe\prototypes\hero-3d` → http://localhost:3100 (`?debug` mostra fps/qualidade) |

### Aprovado pelo usuário
- Etapa 00 (auditoria) — commit `066625d`.
- Stack: Next.js 16 · React 19 · TypeScript strict · CSS Modules · CSS variables · `next/font`; libs 3D/motion só quando necessárias.
- Fluxo: Claude Code = fonte única do código; Claude Design = exploração.
- Hero: navegação Produtos · Sobre · Contato; CTA do header "Conversar".
- Direção do estudo do hero: aproximar da imagem `E:\dev\fiorbe\referencias\hero\referencia-hero-v1.png` (direção autorizada para o estudo, **não** aprovação visual do resultado).
- Commits locais autorizados até aqui (não equivalem a aprovação visual).
- `RIB-001`: conceito "a escultura é percorrida por ondas que a desfiam em fios e a reconstroem" (experimental) e cursor B.
- Metodologia: implementar → visualizar → refinar → validar o essencial → registrar → continuar (regra permanente em `CLAUDE.md`).

### Implementado, aguardando revisão visual do usuário
- Laboratório visual da Etapa 01 (canvas, rodadas 1 e 2) — paleta, tipografia, lettering, direções.
- Hero: composição/interface da referência, escultura de fitas autorais, cenário (chão, reflexo, trilhas, luz), interação (cursor/arraste limitados), transição de scroll (protótipo técnico).
- Figura humana v1 (esqueleto, idle em camadas, IK nos pés, integração de luz).
- `RIB-001` Blender V2 (`?forma=blender2`): espinha C2, seção esculpida (6 lamelas: fechadas = superfície plissada contínua; abertas = leque real), percurso de 12 passagens retraçado sobre a referência, onda calibrada para metal. Alternativa `?forma=blender2-plissado`.
- Cenário do hero: arquitetura de luz monumental atrás da escultura (parede, núcleo, colunas, névoa, horizonte) + contraluz da figura + luz e reflexos no piso.
- `HERO-003` ambiente cinematográfico V2: piso de concreto molhado procedural, reflexo planar em meia resolução com desfoque por rugosidade e distância ao contato, oclusão/sombra pela pegada da escultura, luz arquitetônica com profundidade, trilhas projetadas no piso, névoa sutil; ≈4 ms mais barato que o ambiente anterior.
- `RIB-001` v3: escultura refeita como UMA fita contínua fechada (8 trechos, por cima/por baixo alternados, 0 interseções); duas ondas circulam continuamente, sem troca de peça; desfiar desligado (`?fios=1` liga); `?clay` mostra só a forma.
- (Histórico) `RIB-001` v2: onda percorre a fita inteira (volta completa) e só então transfere no cruzamento; torção + flexão limitadas pela folga local; cruzamento A×B sem interpenetração; desfiar em fios por faixa com bordas suavizadas (flag `?fios=0`). Debug `?ondadebug`. DPR 1,25 em GPU integrada.

### Pendências e bloqueios
- **Luz do hero — base experimental aprovada pelo usuário (22/10/2026); refinamentos futuros, sem aumentar intensidade nem novas paredes:** região central-direita lê como painel plano em alguns trechos; transições das colunas mais naturais; profundidade atmosférica; reflexos mais integrados ao piso.
- **Documento `FIORBE_Sistema_de_Execucao_e_Plano_Figura.md` não foi recebido** nesta sessão — informar o caminho para incorporar o mini-plano à ficha `FIG-001`.
- Decisões visuais da Etapa 01 (ver "Decisões pendentes") bloqueiam a Camada B (tokens no repositório).
- Asset rigado externo para a figura: só com aprovação explícita (arquivo, origem, licença, tamanho).
- Desempenho do hero (Intel UHD 630): alto/1440/DPR 1 ≈ 17,8–19,2 ms; **DPR 2 ≈ 38–41 ms** (risco em telas retina com GPU integrada). Cena limitada por preenchimento.

## Ciclos de refinamento do Hero

Iniciados em 26/10/2026. Referência artística: Blender V2.3. Padrão do protótipo: forma C durante os ciclos; **V2.3 refinada passou a ser o padrão em HERO-FINAL-001**. Aprovações formais: Ciclos 01, 02, 03 e 06.

| Ciclo | Tema | Situação |
|---|---|---|
| 01 | Composição e hierarquia visual | **Aprovado pelo usuário em 26/10/2026** (commits `d3f8142`, `ebf490c`, `2562713`; registro técnico em `HERO_PROTOTIPO.md`, "Ciclo 01") |
| 02 | Piso e reflexos cinematográficos — highlights excessivos, reflexos artificiais, roughness, distribuição de umidade, textura de concreto, integração | **Aprovado pelo usuário em 26/10/2026** (commit `b05d462`; ficha `tarefas/HERO-003.md`, seção "Ciclo 02") |
| 03 | Figura humana — anatomia aparente, silhueta, postura, animação, iluminação, contato dos pés, sombra e reflexo | **Aprovado pelo usuário em 26/10/2026** (commit `6e6f3df`; ficha `tarefas/FIG-001.md`, seção "Ciclo 03") |
| 04 | Escultura metálica — materialidade, microestrias, bordas, normais, separação das lâminas, redemoinho, metal premium, preservando a V2.3 | **Implementado e tecnicamente validado** (26/10/2026; ficha `tarefas/RIB-001.md`, seção "Ciclo 04"). Avaliação artística positiva do usuário na revisão conjunta — **sem aprovação formal individual** |
| 05 | Arquitetura e iluminação — colunas luminosas, profundidade, atmosfera, contraluz, gradação cromática, coesão cinematográfica | **Implementado** (26/10/2026; ficha `tarefas/HERO-003.md`, seção "Ciclo 05"). Avaliação artística positiva do usuário — **sem aprovação formal individual** |
| 06 | Interface e microinterações — wordmark, tipografia, navbar, CTAs, badges, controles, microanimações, transição para a próxima seção | **Aprovado pelo usuário em 26/10/2026** (commit `40c7b58`; registro em `HERO_PROTOTIPO.md`, "Ciclo 06") |
| — | Validação final do Hero — composição, responsividade, acessibilidade, interações, desempenho, comparação com a referência original | **Executada em 26/10/2026, sem bloqueadores**; consolidação (HERO-FINAL-001) autorizada pelo usuário (registro em `HERO_PROTOTIPO.md`, "Validação final integrada") |

Depois da aprovação do Hero: demais seções da landing. Cada ciclo só começa com autorização.

**Herdado do Ciclo 01 para os próximos:** (Ciclo 02) em 940 px uma linha do reflexo do piso cruza a headline — atenuada pelo véu, a causa é do piso; a trilha de luz passa por trás do botão "Pausar movimento" no desktop. (Ciclo 06) no desktop, aos ~60% da rolagem a escultura fica sozinha numa tela vazia (momento da transição aprovada, preservado). (Composição) entre 1024 e 1279 px a escultura recuperou +11–17% no refinamento, mas segue ~3–10% menor que antes do Ciclo 01 (1024: 614 → 550; 1100: 660 → 613; 1200: 720 → 695) — o máximo sem tocar o texto nem cortar a figura na borda.

## Mapa do projeto: PROJETO → ÁREA → COMPONENTE

Legenda — **Implementação:** Não iniciado · Em andamento · Implementado · Bloqueado. **Aprovação:** — · Aguardando revisão · Ajustes pedidos · Aprovado.

| Área | ID | Componente | Etapa do plano | Implementação | Aprovação | Ficha / registro |
|---|---|---|---|---|---|---|
| Projeto | PRJ-00 | Auditoria e preparação | 00 | Implementado | **Aprovado** (22/10/2026) | `AUDITORIA_00.md` |
| Design System | DS-001 | Fundação visual (Camada A: paleta, tipografia, lettering, direção) | 01 | Em andamento: laboratório (2 rodadas) + **DS-001A** três direções editoriais em `/editorial/a|b|c` (`bc41d0c`) + síntese **D/E "Engenharia Escultural"** em `/editorial/d|e` + **DS-001B** F1/F2 e assinatura ([ficha](tarefas/DS-001.md)) | Aguardando revisão — nenhuma direção escolhida | Canvas + \"Decisões pendentes\" + `captures\ds001a` |
| Design System | DS-002 | Tokens e componentes no repositório (Camada B) | 01 | Bloqueado por DS-001 | — | — |
| Hero Experience | HERO-001 | Composição e interface do hero | 02–03 | Implementado (protótipo; Ciclos 01 e 06 em 26/10/2026) | **Ciclos 01 e 06 aprovados** (26/10/2026); hero consolidado (HERO-FINAL-001) | `HERO_PROTOTIPO.md` |
| Hero Experience | HERO-002 | Escultura 3D (geometria e material) | 04 | Implementado (protótipo) | Aguardando revisão | `HERO_PROTOTIPO.md` |
| Hero Experience | HERO-003 | Cenário: chão, reflexo, sombras, luz, atmosfera, trilhas | 04 | Implementado (ambiente cinematográfico V2 + piso do Ciclo 02 na V2.3) | Base da luz aprovada; **Ciclo 02 aprovado** (26/10/2026) | [tarefas/HERO-003.md](tarefas/HERO-003.md) |
| Hero Experience | FIG-001 | Figura humana tridimensional | 04 | v1 + Ciclo 03 (padrão na V2.3) | **Ciclo 03 aprovado** (26/10/2026) | [tarefas/FIG-001.md](tarefas/FIG-001.md) |
| Hero Experience | RIB-001 | Escultura viva: onda, desfiar/recompor, hover, atmosfera, otimização | 04–05 | **V2.3 refinada é a forma padrão do protótipo** (HERO-FINAL-001); V2.2, V2.3r e C preservadas | Ciclo 04 com avaliação positiva (sem aprovação formal individual) | [tarefas/RIB-001.md](tarefas/RIB-001.md) |
| Hero Experience | HERO-004 | Interação e física (cursor, arraste, inércia) | 04 | Implementado (protótipo) | Aguardando revisão | `HERO_PROTOTIPO.md` |
| Hero Experience | HERO-005 | Transição de scroll | 05 | Implementado (protótipo técnico) | Aguardando revisão | `HERO_PROTOTIPO.md` |
| Hero Experience | HERO-006 | Integração do hero ao site definitivo | 02–05 | Não iniciado (depende de DS-002) | — | — |
| Seções | SEC-02 | Header e shell editorial | 02 | Não iniciado | — | `prompts/02-…` |
| Seções | SEC-06 | Manifesto | 06 | Não iniciado | — | `prompts/06-…` |
| Seções | SEC-07 | Motor Fiscal — teaser | 07 | Não iniciado | — | `prompts/07-…` |
| Seções | SEC-08 | Fundamentos | 08 | Não iniciado | — | `prompts/08-…` |
| Seções | SEC-09 | Ecossistema multiproduto | 09 | Não iniciado | — | `prompts/09-…` |
| Seções | SEC-10 | Abordagem | 10 | Não iniciado | — | `prompts/10-…` |
| Seções | SEC-11 | Fundadores | 11 | Não iniciado | — | `prompts/11-…` |
| Seções | SEC-12 | CTA final e footer | 12 | Não iniciado | — | `prompts/12-…` |
| Seções | SEC-13 | Página `/produtos/motor-fiscal` | 13 | Não iniciado | — | `prompts/13-…` |
| Finalização | FIN-14 | Auditoria mobile e acessibilidade | 14 | Não iniciado | — | `prompts/14-…` |
| Finalização | FIN-15 | Polish, QA e publicação | 15 | Não iniciado | — | `prompts/15-…` |

Componentes ganham ficha em `tarefas/` quando entram em desenvolvimento. Correções pequenas não ganham ficha: só uma linha no log abaixo.

## Base técnica

| Item | Valor |
|---|---|
| Caminho | `E:\dev\fiorbe` |
| Git | branches `main` e `exp/hero-fidelidade`; remoto `origin` (GitHub, privado) |
| Ambiente | Windows 10 · Node 22.22.2 · npm 12.0.1 · git 2.53 · Claude Code 2.1.308 · pnpm ausente |
| Disco | C: com ~1 GB livre. Caches já em E: (`E:\npm-cache`, `TEMP` `E:\BrendonData\Temp`, `PLAYWRIGHT_BROWSERS_PATH` `E:\BrendonData\Caches\Playwright`) |
| Stack | Aprovada (ver Painel). Protótipo usa Next 16.4.2, React 19.3.1, three 0.186.1; playwright-core 1.63 só para testes |
| Plugins Claude Code | `frontend-design@claude-plugins-official` (escopo usuário) |
| Skill do projeto | `/fiorbe-status` — `E:\dev\fiorbe\.claude\skills\fiorbe-status\SKILL.md` (lê os arquivos reais; não guarda status próprio) |
| Canvas Claude Design | https://claude.ai/artifact/EAmqGhPmZ3HVodvHWXkQED |
| Verificação do protótipo | `E:\dev\fiorbe\prototypes\hero-3d\scripts\` — `capture.mjs`, `compare.mjs`, `figure-probe.mjs`, `still.mjs`, `poster.mjs` |
| Referências | `E:\dev\fiorbe\referencias\` — somente referência, nenhum asset de produção |

## Log de decisões e entregas

| Data | Componente | Registro | Aprovação |
|---|---|---|---|
| 22/10/2026 | Planejamento | Site institucional multiproduto; hero escultural interativo; paleta e copy como propostas | Direção para execução |
| 22/10/2026 | PRJ-00 | Projeto criado; referências copiadas; Claude Code fonte única, Claude Design exploração | Usuário |
| 22/10/2026 | PRJ-00 | Etapa 00 aprovada; commit `066625d` | Usuário |
| 22/10/2026 | DS-001 | Stack aprovada; Etapa 01 em camadas A (exploração) e B (repo) | Usuário |
| 22/10/2026 | DS-001 | Laboratório com 15 quadros; rodada 2 com revisão visual real, correções e direção C4 Fluid Precision + quadro E1 | Pendente |
| 22/10/2026 | — | `CLAUDE.md`: "Exigência permanente de qualidade" | Pedido do usuário |
| 22/10/2026 | HERO-* | Protótipo isolado em `prototypes/hero-3d` (Three.js puro); commit `d498026` | Commit autorizado; visual pendente |
| 22/10/2026 | HERO-001..005 | Rodada de fidelidade à referência (8 ciclos comparativos) na branch `exp/hero-fidelidade`; commit `517b62f` | Visual pendente |
| 22/10/2026 | FIG-001 | Figura v1: esqueleto, idle em camadas, IK, integração de luz; commit `763b72a` | Visual pendente |
| 22/10/2026 | Gestão | Painel central, hierarquia de componentes, fichas em `tarefas/`, skill `/fiorbe-status` | Pedido do usuário |
| 27/10/2026 | DS-001B | Crítica de D (condensação da Archivo é instância real do eixo `wdth`, sem distorção); F1 Forma (frase em volta da escultura, inclusive no celular) e F2 Contraste (grade de fios × escultura; Archivo 62% × 125%); assinatura editorial (fio laminado, índice, recuo tonal, contraste de largura, grade, horizonte) em `/editorial/assinatura`, escuro e claro. 2 rodadas. Verificado 1920→360 sem rolagem horizontal, h1 com a frase inteira, Tab, arraste da escultura sob o quadro do F1, movimento reduzido, sem JS; tsc/eslint (0 erros)/build. Exit 127 dos servidores em segundo plano = encerramento manual com `Stop-Process` (reproduzido); builds sem erro. 3D, `/` e A–E intocados | Exploração (não aprovado) |
| 27/10/2026 | DS-001 (síntese D/E) | Exploração "Engenharia Escultural" a partir de A, B e C: headline "O complexo fica nos bastidores." em duas linhas fixas, a segunda recuando em tom; navegação agrupada à direita com o CTA; botão claro (raio 4 px) + link secundário com destino real (`#sobre`, `#produtos`); selo removido; faixa só com "Produto 01 · Motor Fiscal" e "Estágio · Em desenvolvimento" (mono só nos rótulos); controle de pausa no mesmo raio (desktop). D = Archivo condensada 75% (88 px a 1440) + Manrope; E = IBM Plex Sans 500 (68 px). 2 rodadas (r1 tímida → r2 maior e condensada; wordmark do D encostava na nav a 360 px → corrigido). Verificado: 1920/1440/1280/1024/940/768/390/360 sem rolagem horizontal, headline sempre em 2 linhas, ordem de tabulação, movimento reduzido, sem JS; tsc/eslint (0 erros)/build. 3D, `/` e A/B/C intocados. Folhas `captures\ds001a\sintese\` | Exploração (não aprovado) |
| 27/10/2026 | Gestão / DS-001A | Correção documental do painel: DS-001A registrado como exploração implementada, enviada ao GitHub (`bc41d0c`, `exp/ds001a-editorial`) e aguardando decisão dos fundadores; branch/checkpoint e próximo objetivo atualizados; referências antigas a "forma C padrão" e a revisões já feitas (Ciclos 01, 04, 05, validação final) alinhadas ao log. Nenhuma aprovação alterada. Folhas Atual × A × B × C em `captures\ds001a\` | Só documentação |
| 26/10/2026 | DS-001 (DS-001A) | Exploração editorial da primeira tela **em andamento** na branch `exp/ds001a-editorial`: três direções (A editorial minimalista, B contraste conceitual, C engenharia e confiança) em rotas estáticas `/editorial/a|b|c`; `/` inalterada; 3D intocado; fontes candidatas OFL (Instrument Serif, Archivo, IBM Plex). Nenhuma direção escolhida | Exploração (não aprovado) |
| 26/10/2026 | HERO (HERO-FINAL-001) | **Consolidação autorizada pelo usuário.** V2.3 refinada promovida a forma padrão do protótipo (`/` idêntica a `?forma=blender2-v23`, 0,01% de pixels diferentes); C, V2.2 e V2.3r preservadas por `?forma=`; pôster regenerado da V2.3 (sem troca forma C → V2.3 no carregamento). Validado: variantes, onda, cursor/arraste/toque, pausa, rolagem reversível, movimento reduzido, sem WebGL/JS, 1440/940/390, tsc/eslint/build, 0 erros. Branch enviada ao GitHub (push normal) | Consolidação (autorização do usuário) |
| 26/10/2026 | HERO (PERF-001) | Reflexo do piso com 7 toques em vez de 9: ganho não reproduzível (≈ −0,2 ms, dentro do ruído) e leve aumento de cintilação → **descartado**, código preservado. Custo de GPU da V2.3 a 1440 segue 17,2–17,7 ms; alternativas registradas em `HERO_PROTOTIPO.md` | Registro |
| 26/10/2026 | HERO (validação final) | Auditoria integrada da V2.3: sem bloqueadores. Corrigidos: palavra órfã a 1920 px e headline fora da primeira tela no celular deitado. Importantes (decisão): GPU 17,2–17,6 ms a 1440 (quedas de quadro no arraste ~6%); fonte variável no WebKit/Windows (Safari real não testado). 4 variantes, 3 motores, 11 tamanhos, DPR 2/3, rotação, CLS 0, acessibilidade e fallbacks verificados. Branch: 10 commits locais, push seria avanço linear | Aguardando decisão dos fundadores |
| 26/10/2026 | HERO-001/004/005 | **Ciclo 06 aprovado formalmente pelo usuário.** Fase de refinamentos individuais do Hero encerrada; próxima etapa: validação final integrada (aguarda autorização) | **Aprovado (Ciclo 06)** |
| 26/10/2026 | HERO-001/004/005 (Ciclo 06) | Interface só em CSS (vale para todas as formas): CTA principal em pílula, estado pressionado, hover/foco da navbar, ponto do badge sem brilho de "online", pausa em vidro legível com estado pausado visível, brilho do Conversar contido. Transição: manifesto 62vh → 38vh e saída do texto mais lenta — trecho vazio da rolagem cai pela metade. Tipografia, textos e marca preservados | Aguardando revisão artística |
| 26/10/2026 | RIB-001 / HERO-003 / HERO-001 | Ciclos 04 e 05 receberam **avaliação artística positiva** do usuário (revisão conjunta das comparações) e autorização para o Ciclo 06 — não registrada como aprovação formal. Ciclo 06 iniciado | Avaliação positiva + autorização para continuar |
| 26/10/2026 | HERO-003 (Ciclo 05) | Arquitetura e luz na V2.3 (`?luz=atual` = anterior; C e V2.3r idênticas). Colunas com acúmulo na base, volume e profundidade por intensidade; fachada e contraluz da figura em branco frio; parede do fundo com perspectiva aérea. **Borda vertical do piso a 940/768: causa era o corte reto do véu editorial do Ciclo 01** — máscara esmaecida. Descartado: escurecer o meio da parede (perdia monumentalidade). GPU ≈ +0,4 ms. Folhas `captures\ciclo05\comparacao-A…F` | Aguardando revisão artística |
| 26/10/2026 | RIB-001 / HERO-003 | Ciclo 04 validado tecnicamente; usuário autorizou o Ciclo 05 **sem revisão visual independente** das capturas do Ciclo 04 | Autorização para avançar (não aprovação visual) |
| 26/10/2026 | RIB-001 (Ciclo 04) | Escultura V2.3 refinada (padrão em `?forma=blender2-v23`; `?escultura=atual` = anterior). Causa dos losangos nas grandes faces: referencial do escovado constante por triângulo (`getTangentFrame`) → referencial analítico contínuo com a mesma proporção (mesma luz e cor). Junta das lâminas fechadas mais discreta (malha `v23c`: posições, `_arc`, `_v` idênticos). Lâmina central menos leitosa. Descartados da V2.3r: normais robustas (criavam inversões na V2.3), `o_min` 0,22, `EDGE_AA`. Onda e emenda intactas; GPU ≈ +0,3–0,4 ms. Folhas `captures\ciclo04\comparacao-A…F` | Aguardando revisão artística |
| 26/10/2026 | FIG-001 / RIB-001 | **Ciclo 03 aprovado formalmente pelo usuário.** Ciclo 04 (escultura metálica) autorizado e iniciado; V2.3 segue referência artística, V2.3r experimental, forma C padrão | **Aprovado (Ciclo 03)** |
| 26/10/2026 | FIG-001 (Ciclo 03) | Figura humana na V2.3 (`c03`, padrão só na V2.3; `?figura=atual` = v1). Silhueta legível a 50–70 px: pernas separadas, braço fora do tronco, contrapposto visível, mão e cabeça proporcionais, contraluz um pouco mais presente; sombra de contato justa; reflexo esmaecendo a partir dos pés. **Defeito corrigido:** o braço esquerdo derivava sozinho nos primeiros segundos (acúmulo de camadas sobre ossos que o mixer não reescreve). Pés imóveis, microanimação mantida, GPU igual. Folhas `captures\ciclo03\comparacao-A…E` | Aguardando revisão artística |
| 26/10/2026 | HERO-003 / FIG-001 | **Ciclo 02 aprovado formalmente pelo usuário.** Ciclo 03 (figura humana) autorizado e iniciado | **Aprovado (Ciclo 02)** |
| 26/10/2026 | HERO-003 (Ciclo 02) | Piso e reflexos na V2.3 (acabamento `uC02`, padrão só na V2.3; `?piso=atual` = anterior; C, V2.2 e V2.3r inalteradas). Causas: desfoque por mip alto isotrópico (bolhas, blocos, pente borrado), Fresnel com relevo fino (listras horizontais), brilhos densos (poeira), trilhas sem mip (serrilhado) e halo chapado, junta sob a headline a 940. Solução: reflexo em traço vertical de 9 toques com mip baixo, Fresnel do plano, compressão dos altos mais firme, destaques só de contraste real, brilhos raros, trilhas filtradas, juntas só sob o contato no empilhado. Sem passe novo. GPU ≈ +0–0,4 ms (alto) e ≈ +0,3 ms (baixo); movimento mais estável (menos picos); escultura idêntica. Folhas `captures\ciclo02\comparacao-A…F` | Aguardando revisão artística |
| 26/10/2026 | HERO-001 / HERO-003 | **Ciclo 01 aprovado formalmente pelo usuário.** Ciclo 02 (piso e reflexos) autorizado e iniciado | **Aprovado (Ciclo 01)** |
| 26/10/2026 | HERO-001 (Ciclo 01, verificação final) | 1024–1200 px conferidos na folha `captures\ciclo01b\comparacao-1024-1280.png` e em recortes 2× da borda direita (`captures\ciclo01b\borda-direita-figura.png`): texto livre, figura e redemoinho inteiros (~50 px da borda). Indicador "1 Issue" do Next: aviso de hidratação no `<html>` causado pela extensão **BRy** do Chrome do usuário (injeta `data-bry-content-script-bryweb` e `-analytics` antes do React); em Chromium limpo o indicador mostra 0 issues e o console não tem erros. Não é defeito da aplicação; nada suprimido nem alterado | Aguardando aprovação formal dos fundadores |
| 26/10/2026 | HERO-001 (Ciclo 01, refinamento) | Regressão de escala apontada pelos fundadores em 1024–1200 px corrigida só nessa faixa (`@media 1024–1279`): margem da grade que encontra 8,25vw em 1280 (sem salto), coluna editorial reservada em 400 px (era 450), CTAs 46 px de altura e 20 px de recuo, palco a 1% da borda. Palco 1024: 470 → 550 px (+17%); 1100: 537 → 613 (+14%); 1200: 627 → 695 (+11%); vazio superior direito reduzido; texto continua livre (recortes 2×). Descartadas por comparação: sangria à direita (corta a figura) e coluna de 380 px (lóbulo encosta no CTA a 1024). 1280/1440 e empilhado idênticos (medidas iguais). Mobile 390/360: rolagem completa conferida, sem defeitos — nada alterado. tsc, eslint (0 erros), build, pausa (clique/teclado/toque) e reversibilidade em 6 larguras, 0 erros de console; GPU 1100: 12,1–13,1 ms (antes 11,6–12,7). Folha `captures\ciclo01b\comparacao-1024-1280.png` | Pronto para avaliação artística final |
| 26/10/2026 | HERO-001 (Ciclo 01) | Composição e hierarquia na V2.3, sem tocar geometria, materiais, onda nem interação. **Desktop:** o palco começa depois da coluna editorial (`max(38%, margem + 450px)`) — lede e CTAs deixam de invadir o lóbulo esquerdo em 1024–1280; véu radial sutil atrás do texto; botão "Pausar movimento" sai da zona da navegação (estava desalinhado e colado ao CTA) para o piso, alinhado à margem direita da grade; faixa inferior com menos recuo (títulos numa linha a 1280–1440); headline nunca abaixo de 340px de largura (1024 tinha 5 linhas com "que" isolado). **Empilhado (< 1024):** CTAs e faixa sumiam com o fade do scroll antes de serem lidos — agora rolam normalmente, a transição só começa quando o fim do hero sobe e a escultura entra por baixo, depois da faixa (antes cruzava o texto); palco não encosta mais nas bordas; botão de movimento, que era cortado na borda direita em 940/768/390/360, alinhado à margem; respiro entre o horizonte e o rótulo; véu sob a headline; 360 px com headline em 4 linhas (era 5). Transição do desktop idêntica; reversível. tsc, eslint (0 erros), build, fallbacks, reduzido, cursor/arraste, pausa (clique, toque, teclado), sem overflow (360–1920), 0 erros de console; GPU 1440 = 16,4–18,0 ms (C 16,3–18,4 na mesma sessão). Folhas `captures\ciclo01\comparacao-desktop.png`, `-empilhado.png`, `-rolagem.png`, `-recortes.png` | Aguardando avaliação artística |
| 26/10/2026 | Repositório | Conferido o remoto: `origin/main` = `4d9f930` (PRs #1–#3 de `exp/hero-fidelidade` mergeados no GitHub, o último em 23/10/2026). O painel dizia `main` em `d498026` — corrigido. Nenhum push/merge feito nesta sessão | Registro |
| 26/10/2026 | Gestão / HERO | Contexto atualizado antes dos ciclos: GitHub sincronizado até `d199bec` (painel corrigido); V2.3 definida como referência artística do Hero; V2.3r preservada como variante experimental para aproveitamento técnico seletivo; forma C segue padrão; plano de 6 ciclos de refinamento registrado e **Ciclo 01 — Composição e Hierarquia Visual** iniciado. Só documentação | Decisões do usuário; nenhuma aprovação visual |
| 23/10/2026 | RIB-001 | **Escolha dos fundadores:** a Blender V2.3 (`?forma=blender2-v23`, geometria `f523f47`, cor azul/teal/prata de `ecfa1c8`) foi selecionada como referência visual favorita desta rodada. A V2.3r continua disponível para comparação. Não é aprovação definitiva do hero; a forma padrão do protótipo continua a C. Publicado em `origin/exp/hero-fidelidade` | Preferência registrada |
| 23/10/2026 | RIB-001 / HERO-003 | V2.3r, 4 regiões marcadas: pente claro/escuro nas lâminas de perfil (sinal da normal da borda instável → orientação robusta), pontilhado nas frestas quase fechadas (abertura mínima 0,22), borda subpixel filtrada no shader; reflexo do piso sem barras brancas (destaques só do detalhe, compressão dos altos, molhado em manchas). Comparação `captures\regioes-antes-depois.png` | Aguardando avaliação |
| 23/10/2026 | RIB-001 | V2.3r (`?forma=blender2-v23r`): lâmina central em teal/azul saturados (sem aspecto leitoso), vazio da coroa reaberto (arco esquerdo afina e recua perto da coroa), redemoinho com torção alternando face/borda e leque menos aberto. Interação e onda ok, custo igual. Comparação `captures\v23r-consolidacao.png` | Aguardando aprovação |
| 23/10/2026 | RIB-001 / HERO-003 | V2.3 comparada à V2.2 (silhuetas sobrepostas) e escolhida como candidata principal; metal da V2.3 em azul profundo, teal e prata alternando ao longo do percurso. Piso: juntas de dilatação discretas, agregado fino, borda úmida das manchas. ≈16,8 ms. Comparação `captures\v23-consolidacao.png` | Visual pendente |
| 23/10/2026 | RIB-001 | Blender V2.3 (`?forma=blender2-v23`): hierarquia — arco superior esquerdo e faixa central viram lâminas gigantes iluminadas (central mais íngreme e prateada); faixa escura média vira passagem fina quase de borda cruzando em X; leque do redemoinho gira (lâminas não paralelas). 0 interseções, onda e interação ok, ≈16,6 ms. Comparação `captures\v23-comparacao.png` | Visual pendente |
| 23/10/2026 | HERO (master polish) | 4 ciclos com checkpoint: (1) V2.2 — escovado com passo físico (fim das estrias escuras da coroa), juntas discretas, faixa média e superfície baixa esculpidas, antisserrilhado especular; (2) RIB-004 — toque local por raycast em proxy no espaço da fita (mola amortecida + pulsos), cursor contextual, arraste com peso; (3) figura — ombro, calça, contraluz na silhueta; (4) barra inferior alinhada, pôster LCP, hidratação ok em navegador limpo (extensão), fallbacks e movimento reduzido conferidos. GPU ≈16,6 ms (igual). Comparação `captures\polish-comparacao.png` | Visual pendente |
| 23/10/2026 | RIB-001 | Blender V2.2 (`?forma=blender2-v22`): coroa como superfície larga contínua que rola e abre um leque curto na descida; faixa central diagonal com torção gradual; faixa escura média cruzando em X; redemoinho sem entalhe (causas: limite de curvatura sem o afastamento do leque, leque fechando abruptamente, frestas quase fechadas). 0 interseções, onda ok, custo igual à B. Comparação `captures\v22-comparacao.png` | Visual pendente |
| 23/10/2026 | HERO-003 | Acabamento: highlights prateados no reflexo junto ao contato (mesmo alvo, sem passe novo), fachada de lâminas de luz ciano-brancas à direita da figura com reflexos verticais no piso, fundo mais escuro e colunas mais definidas. Responsividade do piso preservada. ≈16,45 ms (+3%). Comparação `captures\acabamento-comparacao.png` | Visual pendente |
| 23/10/2026 | HERO-003 | Piso: a mesma URL mudava de aparência porque o modo de tela estreita era decidido só na carga (janela aberta estreita → sem reflexo para sempre); agora reavaliado ao redimensionar. Concreto molhado sem aparência de água (manchas alongadas em profundidade, distorção mínima, textura de ruído corrigida); tier baixo com acabamento analítico. ≈16,1 ms (v1 19,9). Comparação `captures\piso-correcao.png` | Visual pendente |
| 23/10/2026 | RIB-001 | Blender V2.1: seção transversal refeita como lâmina (face plana superelíptica, espessura fina, borda curta, normais analíticas do perfil, superfície fechada contínua); variantes A Satin (`?forma=blender2-a`) e B Sculpted (`?forma=blender2-b`, escolhida); percurso e leques intactos; 0 interseções; ≈ +3,5% de custo. Comparação `captures\laminas-comparacao.png` | Visual pendente |
| 23/10/2026 | RIB-001 | Metal premium na Blender V2: estúdio de reflexos próprio (azul pela luz, filetes brancos estreitos), cor dessaturada para a prata, bordas polidas e prateadas, escovado mais fino, sem contorno emissivo; `?metal=v1` preserva o anterior. Rejeitados: prata forte, arestas vivas na geometria. Leitura de "cabos" identificada como geométrica. ≈ +0,8 ms (15,5 ms). Comparação `captures\metal-comparacao.png` | Visual pendente |
| 23/10/2026 | HERO-003 | Ambiente cinematográfico V2 (ciclos A/B/C): piso procedural molhado, reflexo em meia resolução (desfoque por rugosidade e distância ao contato), sombras pela pegada da escultura, luz arquitetônica com profundidade, trilhas projetadas no piso, névoa sutil, mobile com esmaecimento; contraluz da figura cortado no chão. GPU V2 18,7 → 14,7 ms; C 18,8 → 16,0 ms. `?ambiente=v1` preserva o anterior. Comparação `captures\ambiente-comparacao.png` | Visual pendente |
| 23/10/2026 | RIB-001 | Blender V2: espinha C2 (fim das quinas de referencial), seção esculpida com 6 lamelas que se abrem em leque (coroa direita, redemoinho, curva interna, pé direito) e fecham numa superfície plissada contínua; percurso de 12 passagens retraçado sobre a referência; faixas mais estreitas; onda calibrada pela largura (`uWaveWide`, só V2). Descartados: plissado profundo, lamelas abertas no percurso todo. 0 interseções; 56,7 mil vértices; GLB 2,5 MB; ≈18,8 ms (V1 16,9; C 18,8). Alternativa `?forma=blender2-plissado`. Capturas `captures\v1-vs-v2.png`, `captures\ref-vs-v2.png`, `captures\v2-leques.png`, `captures\v2-redemoinho.png`, `captures\onda-v2.webm` | Visual pendente |
| 22/10/2026 | RIB-001 | v5: Blender 5.2.3 LTS portátil (oficial, SHA-256 conferido) em `E:\Tools`, só em background; fluxo curva Bézier + Geometry Nodes → GLB (`_arc`, `_v`) → Three (`?forma=blender`, `?forma=blender-teste`); escultura de 9 gestos num percurso único, 0 interseções (BVH), 41 mil vértices, GLB 1,8 MB, ≈16,8 ms; forma C continua padrão | Visual pendente |
| 22/10/2026 | RIB-001 | v4 laboratório: formas `?forma=v32|a|b|c` preservadas; perfil com espessura (lâmina fechada com borda arredondada) e só faces externas; estrias analíticas com limite de banda no lugar do bump; causa do pente isolada (fita quase dobrando nas curvas fechadas → normais oscilando, amplificadas pela anisotropia); A (percurso novo do mapa) e B (laminado) descartadas, C adotada como padrão; `?gestos` mostra os grandes gestos; 0 interseções em todas; ≈18,4 ms (v32 17,6) | Visual pendente |
| 22/10/2026 | RIB-001 | v3.2: fitas mais largas, torções em leque nas varreduras, profundidade dos cruzamentos ×1,3; testada e descartada uma segunda volta aninhada (duplicava as passagens e poluía a forma); 0 interseções; ≈18 ms (+1 ms, fitas maiores). Comparações `captures\escultura-anterior-vs-r4.png`, `captures\ref-vs-r4.png` | Visual pendente |
| 22/10/2026 | Repositório | Enviados `7ab9b74` e `2b4ed80` para `exp/hero-fidelidade` (autorizado; repositório privado, sem segredos; `main` intocada) | Autorizado pelo usuário |
| 22/10/2026 | HERO (cenário) | Luz aprovada como base experimental; refinamentos registrados em Pendências | Aprovação parcial (base) |
| 22/10/2026 | HERO (cenário) | Arquitetura de luz reforçada após o usuário reenviar o pedido (a versão anterior ficou discreta): núcleo e colunas mais presentes, segunda parede ao fundo e deslocada (camadas de profundidade), ponto quente contido. Comparação `captures\luz3-comparacao.png`. Custo ≈ 17 ms | Visual pendente |
| 22/10/2026 | HERO (cenário) | Luz de fundo redirecionada: arquitetura de luz monumental atrás da escultura (parede escura em gradação, núcleo amplo, 6 colunas verticais suaves, névoa e brilho do horizonte), reflexos das colunas no piso traçados para a câmera, contraluz e sombra da figura. Comparação `captures\luz2-comparacao.png`. Custo ≈ 16,4 ms | Visual pendente |
| 22/10/2026 | Repositório | Criado `fiorbeltda/fiorbe` (privado) no GitHub; enviadas `main` e `exp/hero-fidelidade` | Autorizado pelo usuário |
| 22/10/2026 | RIB-001 | v3.1: torção autoral por ponto sobre referencial de transporte paralelo com correção de fechamento (emenda exata), giro anti-dobra nas curvas fechadas, relevo das estrias atenuado onde serrilhava; 0 interseções; comparação `captures\refino-v3-vs-r3.png` | Visual pendente |
| 22/10/2026 | HERO (cenário) | Luz de fundo refeita (`src\three\scene\backlight.ts`): abertura luminosa atrás da escultura (núcleo, halo, feixes discretos, brilho do horizonte), contraluz estreita da figura e luz derramada no piso com sombra da figura; substitui o halo que lavava a fita. Comparação `captures\luz-comparacao.png`. Custo ≈ igual (≈15,8 ms) | Visual pendente |
| 22/10/2026 | RIB-001 | v3: fita única contínua autoentrelaçada (substitui as 6 fitas), ondas contínuas, desfiar desligado, modo argila; comparação com referência e versão anterior; commit `2f50dc4` | Visual pendente |
| 22/10/2026 | RIB-001 | v2: volta completa + transferência no cruzamento, cruzamentos A×B/A×C/E corrigidos (0 interseções), desfiar por fios com cobertura suave, vídeo e quadros | Visual pendente |
| 22/10/2026 | RIB-001 | Onda v1 + desfiar v1 (flag) + DPR 1,25 em GPU integrada; servidores encerrados pelo sistema por falta de memória antes do vídeo | Visual pendente |
| 22/10/2026 | RIB-001 | Plano da escultura viva: auditoria, baseline de desempenho (tiers × DPR × larguras), pesquisa, especificação matemática, arquitetura e RIB-01..06. Sem código | Plano aguardando aprovação |

## Decisões pendentes

| Tema | Situação | Componente |
|---|---|---|
| Paleta | Kit × prancha × síntese. Recomendação: **síntese** (`#060C18 #0B1424 #2558E8 #3CC6E6 #2BBFA8 #7BE3CB #EEF3FA`; claro `#F3F6FA`/`#0A1426`) | DS-001 |
| Lettering / wordmark | L1 traço geométrico × L2 Exo 2 × L3 neutro. Recomendação: **L3 provisório**; L1 candidato | DS-001 |
| Tipografia de interface | Geist × Inter × Manrope. Recomendação: **Manrope** | DS-001 |
| Direção artística do site | Quiet Premium × Precision × Fluid Editorial × **Fluid Precision** (recomendada); hero em estudo de fidelidade à referência | DS-001 / HERO-001 |
| Copy do hero | "Tecnologia que transforma complexidade em clareza." (usuário) × propostas do kit | HERO-001 |
| Asset da figura | Manter figura procedural × trocar por personagem rigado externo (exige aprovação de arquivo/licença) | FIG-001 |
| Desfiar: só shader × híbrido com fios soltos | Decidir por comparação A/B no RIB-03 B | RIB-001 |
| Manifesto, pilares, ecossistema, processo | Conflitos de copy do kit (`AUDITORIA_00.md` §3) | SEC-06, SEC-08, SEC-09, SEC-10 |
| E-mail público `fiorbeltda@gmail.com` | Sem resposta ("ltda" pode soar como alegação societária) | SEC-02 / SEC-12 |

## Pendências de marca e negócio

- Docs do Drive não lidos; fatos limitados ao `CLAUDE.md`.
- Validar nome, domínio e registro legal antes de publicar alegações.
- Confirmar detalhes reais do Motor Fiscal com engenharia.
- Fundadores: fotos, bios, canais de contato e copy.

## Manutenção

Ao fim de cada tarefa: atualizar o **Painel** (tarefa ativa e próximo objetivo), a linha do componente no **Mapa**, a **ficha** da tarefa e o **Log**. Registrar só o que aconteceu. Nunca marcar "Aprovado" sem confirmação explícita do usuário.
