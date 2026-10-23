# ESTADO DO PROJETO FIORBE — PAINEL CENTRAL

> **Fonte canônica do status.** Atualizar ao fim de TODA tarefa: painel, mapa de componentes e ficha da tarefa (`docs/fiorbe/tarefas/`). Sempre registrar qual é o **próximo objetivo**.
> Implementado ≠ aprovado. Commit ≠ aprovação. Não usar porcentagens de progresso.

**Última atualização:** 23/10/2026

## Painel

| Campo | Situação |
|---|---|
| **Objetivo principal** | Concluir a landing page institucional da FIORBE (`/` e `/produtos/motor-fiscal`) no nível de qualidade definido em `CLAUDE.md`. |
| **Etapa atual** | Hero Experience — protótipo isolado em `E:\dev\fiorbe\prototypes\hero-3d` (antecede as etapas 02–05 do plano). Etapa 01 (Design System) em revisão em paralelo. |
| **Componentes em desenvolvimento** | `HERO-003` — Cenário: ambiente cinematográfico V2, padrão em todas as formas, anterior em `?ambiente=v1` ([ficha](tarefas/HERO-003.md)) · `RIB-001` — Escultura viva (Blender V2: lâmina esculpida com leques de lamelas, `?forma=blender2`; padrão segue forma C; V1 em `?forma=blender`) ([ficha](tarefas/RIB-001.md)) · `FIG-001` — Figura humana (v1, aguardando revisão) ([ficha](tarefas/FIG-001.md)) |
| **Tarefa ativa** | `RIB-001` V2.3r — correção das 4 regiões marcadas — aguardando avaliação; nada aprovado |
| **Próximo objetivo** | Avaliar a V2.3r corrigida (`captures\regioes-antes-depois.png`) e decidir se vira padrão; depois experiência completa do hero e próximas seções da landing. |
| **Branch / último checkpoint** | `exp/hero-fidelidade` · ver Log (último enviado ao GitHub: `2b4ed80`; commits locais posteriores não enviados). `main` está em `d498026`. Remoto: `origin` = https://github.com/fiorbeltda/fiorbe (privado), as duas branches enviadas em 22/10/2026 com autorização. Merge em `main` continua exigindo autorização. |
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

## Mapa do projeto: PROJETO → ÁREA → COMPONENTE

Legenda — **Implementação:** Não iniciado · Em andamento · Implementado · Bloqueado. **Aprovação:** — · Aguardando revisão · Ajustes pedidos · Aprovado.

| Área | ID | Componente | Etapa do plano | Implementação | Aprovação | Ficha / registro |
|---|---|---|---|---|---|---|
| Projeto | PRJ-00 | Auditoria e preparação | 00 | Implementado | **Aprovado** (22/10/2026) | `AUDITORIA_00.md` |
| Design System | DS-001 | Fundação visual (Camada A: paleta, tipografia, lettering, direção) | 01 | Implementado (2 rodadas) | Aguardando revisão | Canvas + "Decisões pendentes" |
| Design System | DS-002 | Tokens e componentes no repositório (Camada B) | 01 | Bloqueado por DS-001 | — | — |
| Hero Experience | HERO-001 | Composição e interface do hero | 02–03 | Implementado (protótipo) | Aguardando revisão | `HERO_PROTOTIPO.md` |
| Hero Experience | HERO-002 | Escultura 3D (geometria e material) | 04 | Implementado (protótipo) | Aguardando revisão | `HERO_PROTOTIPO.md` |
| Hero Experience | HERO-003 | Cenário: chão, reflexo, sombras, luz, atmosfera, trilhas | 04 | Implementado (ambiente cinematográfico V2) | Base da luz aprovada; V2 aguardando revisão | [tarefas/HERO-003.md](tarefas/HERO-003.md) |
| Hero Experience | FIG-001 | Figura humana tridimensional | 04 | Em andamento (v1 implementada) | Aguardando revisão | [tarefas/FIG-001.md](tarefas/FIG-001.md) |
| Hero Experience | RIB-001 | Escultura viva: onda, desfiar/recompor, hover, atmosfera, otimização | 04–05 | Em andamento (Blender V2 + onda contínua calibrada) | Conceito e cursor B aprovados; visual aguardando revisão | [tarefas/RIB-001.md](tarefas/RIB-001.md) |
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
