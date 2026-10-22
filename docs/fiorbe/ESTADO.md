# ESTADO DO PROJETO FIORBE — MEMÓRIA ENTRE SESSÕES

**Última atualização:** 22/10/2026  
**Etapa atual:** 01 — Camada A (laboratório visual) entregue, **aguardando decisão do usuário**. Camada B não iniciada.  
**Etapas aprovadas:** 00 (aprovada oficialmente pelo usuário em 22/10/2026)

## Base técnica

| Item | Valor |
|---|---|
| Caminho | `E:\dev\fiorbe` |
| Branch | `main` (local, sem remoto) |
| Ambiente | Windows 10 · Node 22.22.2 · npm 12.0.1 · git 2.53 · Claude Code 2.1.308 · pnpm ausente |
| Disco | C: com ~1 GB livre. Já apontam para E: (variáveis de usuário existentes, nada alterado): cache npm `E:\npm-cache`, `TEMP` `E:\BrendonData\Temp`, `PLAYWRIGHT_BROWSERS_PATH` `E:\BrendonData\Caches\Playwright`. Build/cache do Next (`.next/`) ficará dentro do projeto em E: |
| Stack | **Aprovada (22/10/2026):** Next.js 16 App Router + React 19 + TypeScript strict + CSS Modules + CSS variables/`tokens.css` + `next/font`. Three.js, R3F, GSAP e Motion só quando a etapa precisar — **não instalar antes** |
| Plugins Claude Code | `frontend-design@claude-plugins-official` instalado (escopo usuário, habilitado) em 22/10/2026 |
| Canvas Claude Design | Laboratório 01: https://claude.ai/artifact/EAmqGhPmZ3HVodvHWXkQED (privado; exploração, não fonte de código) |
| Scripts | Nenhum ainda. Previstos: `dev` (http://localhost:3000), `build`, `lint`, `typecheck`, `test:e2e` |
| Referências | `referencias/` — **somente referência**, nenhum asset de produção (ver `referencias/README.md`) |
| Auditoria | `docs/fiorbe/AUDITORIA_00.md` |

## Fluxo de trabalho e ferramentas

- **Claude Code = fonte única do código.** Nada vai para o repositório a não ser pelo Claude Code.
- **Claude Design = exploração.** Composições e alternativas são exploradas em artefatos do tipo "Design" (canvas de artboards no claude.ai); só a decisão aprovada é traduzida em tokens/componentes no repo. O artefato não é fonte de verdade de código.
- Disponibilidade verificada em 22/10/2026: ver relatório da etapa 00 (seção "Ferramentas").

## Log de decisões

| Data | Etapa | Decisão | Aprovação |
|---|---|---|---|
| 22/10/2026 | Planejamento | Site institucional multiproduto; hero escultural interativo; paleta e copy como propostas | Direção para execução, não layout aprovado |
| 22/10/2026 | 00 | Projeto criado em `E:\dev\fiorbe`; referências de identidade copiadas para `referencias/identidade` (sem comparativos OREVUM) | Usuário, 22/10/2026 |
| 22/10/2026 | 00 | Claude Code como fonte única do código; Claude Design para exploração visual antes da implementação | Usuário, 22/10/2026 |
| 22/10/2026 | 00 | Paleta, lettering e textos com conflito **permanecem pendentes**; comparação visual na etapa 01 (paleta/lettering) e nas etapas indicadas (textos) | Usuário, 22/10/2026 |
| 22/10/2026 | 00 | Etapa 00 aprovada oficialmente; commit `066625d` aceito | Usuário, 22/10/2026 |
| 22/10/2026 | 01 | Stack aprovada (ver Base técnica); Etapa 01 em duas camadas: A = exploração no Claude Design, B = tokens/componentes no repo | Usuário, 22/10/2026 |
| 22/10/2026 | 01-A | Laboratório publicado com 15 quadros: 3 paletas, 3 fontes, 3 letterings, 3 direções em 1440 e 390, componentes. Recomendação registrada abaixo, **não aprovada** | Pendente |
| 22/10/2026 | 01-A | Rodada 2: revisão visual real do canvas (cortes em C1–C3, títulos sobrepostos, botões quebrando em D1, L1 vazando — corrigidos); nova direção **C4 Fluid Precision** (1440 + 390) e quadro **E1** de evolução nas etapas 03–05 | Pendente |
| 22/10/2026 | — | `CLAUDE.md` ganhou "Exigência permanente de qualidade" (originalidade, direção de arte, refinamento, consistência, acessibilidade, desempenho) | Pedido do usuário |
| 22/10/2026 | Protótipo | Hero 3D interativo **isolado** em `prototypes/hero-3d/` (Three.js puro, sem GSAP/R3F). Detalhes e testes em `HERO_PROTOTIPO.md`. Não é Camada B nem implementação definitiva | Em revisão |

## Matriz de etapas

| N | Nome | Situação | Commit | Observações |
|---|---|---|---|---|
| 00 | Auditoria | **Aprovada** (22/10/2026) | `066625d` | Só documentação, configuração git e referências |
| 01 | Design System | Camada A em revisão (rodada 2) · Camada B não iniciada | — | Canvas no Claude Design; decisões abaixo |
| — | Protótipo hero 3D | Rodada de fidelidade em revisão | `d498026` (main) + branch `exp/hero-fidelidade` | `E:\dev\fiorbe\prototypes\hero-3d` · `npm run dev` → http://localhost:3100 |
| 02 | Header | Não iniciado | — | — |
| 03 | Hero estático | Não iniciado | — | — |
| 04 | Fitas 3D | Não iniciado | — | — |
| 05 | Transição scroll | Não iniciado | — | — |
| 06 | Manifesto | Não iniciado | — | — |
| 07 | Produto teaser | Não iniciado | — | — |
| 08 | Fundamentos | Não iniciado | — | — |
| 09 | Multiproduto | Não iniciado | — | — |
| 10 | Abordagem | Não iniciado | — | — |
| 11 | Fundadores | Não iniciado | — | — |
| 12 | CTA e Footer | Não iniciado | — | — |
| 13 | Página produto | Não iniciado | — | — |
| 14 | Mobile/A11y | Não iniciado | — | — |
| 15 | Polish/QA | Não iniciado | — | — |

## Decisões pendentes (cada uma com a etapa onde será resolvida)

| Tema | Situação | Resolver em |
|---|---|---|
| Paleta | Kit × prancha × síntese no canvas (A1–A3). Recomendação: **síntese** (`#060C18 #0B1424 #2558E8 #3CC6E6 #2BBFA8 #7BE3CB #EEF3FA`; claro `#F3F6FA`/`#0A1426`) | 01-A, decisão do usuário |
| Lettering / wordmark | L1 traço geométrico V4 × L2 caixa alta Exo 2 × L3 neutro (B4). Recomendação: **L3 provisório** até o vetor master; L1 como candidato a desenvolver | 01-A, decisão do usuário |
| Tipografia de interface | Geist × Inter × Manrope (B1–B3). Recomendação: **Manrope** como família única | 01-A, decisão do usuário |
| Direção artística | Quiet Premium × Precision × Fluid Editorial × **Fluid Precision** (C1–C4, 1440 e 390). Recomendação atual: **Fluid Precision** | 01-A, decisão do usuário |
| Navegação | **Decidido para o hero (22/10/2026):** Produtos · Sobre · Contato; CTA do header "Conversar" até haver demonstração confirmada | Usuário |
| Composição do hero | Rodada de fidelidade à imagem `referencias\hero\referencia-hero-v1.png` em andamento; Fluid Precision segue candidata ao design system | Revisão visual do usuário |
| Copy do hero | Proposta nova do usuário ("Tecnologia que transforma complexidade em clareza.") × propostas do kit | 03 |
| Sub do hero | IDENTIDADE × PLANO_MESTRE (AUDITORIA_00 §3.1) | 03 |
| Manifesto | duas headlines (§3.2) | 06 |
| Pilares | 3 × 5 (§3.5) | 08 |
| Ecossistema | duas headlines (§3.3) | 09 |
| Processo | nomes das etapas (§3.4) | 10 |
| E-mail público `fiorbeltda@gmail.com` | Sem resposta ("ltda" pode soar como alegação societária) | 02 |

## Pendências de marca/negócio

- Docs do Drive não lidos (sem acesso nesta sessão); fatos limitados ao `CLAUDE.md`.
- Validar nome/domínio/registro legal externamente antes de publicar alegações.
- Confirmar detalhes reais do Motor Fiscal com engenharia/especificações.
- Fundadores: fotos, bios, canais de contato e copy.

## Instruções de manutenção

Atualize somente decisões que aconteceram. Acrescente em cada etapa: data, arquivos alterados, screenshots, QA executado, aprovação ou pedidos de revisão, riscos. Não marque etapa como aprovada sem confirmação explícita do usuário.
