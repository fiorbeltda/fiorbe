# ESTADO DO PROJETO FIORBE — PAINEL CENTRAL

> **Fonte canônica do status.** Atualizar ao fim de TODA tarefa: painel, mapa de componentes e ficha da tarefa (`docs/fiorbe/tarefas/`). Sempre registrar qual é o **próximo objetivo**.
> Implementado ≠ aprovado. Commit ≠ aprovação. Não usar porcentagens de progresso.

**Última atualização:** 22/10/2026

## Painel

| Campo | Situação |
|---|---|
| **Objetivo principal** | Concluir a landing page institucional da FIORBE (`/` e `/produtos/motor-fiscal`) no nível de qualidade definido em `CLAUDE.md`. |
| **Etapa atual** | Hero Experience — protótipo isolado em `E:\dev\fiorbe\prototypes\hero-3d` (antecede as etapas 02–05 do plano). Etapa 01 (Design System) em revisão em paralelo. |
| **Componentes em desenvolvimento** | `FIG-001` — Figura humana (v1 implementada, aguardando revisão) ([ficha](tarefas/FIG-001.md)) · `RIB-001` — Escultura viva (planejado) ([ficha](tarefas/RIB-001.md)) |
| **Tarefa ativa** | Nenhuma em execução. Plano do `RIB-001` entregue para aprovação. |
| **Próximo objetivo** | Recomendado: `RIB-01` — diagnóstico de desempenho com chaves de debug (isolar custo de reflexo, MSAA, clearcoat, glows, figura), porque a cena está no limite de 60 fps e é limitada por preenchimento; serve de base também para `FIG-01`. Alternativa: `FIG-01`. Decisão do usuário. |
| **Branch / último checkpoint** | `exp/hero-fidelidade` · `763b72a` (figura com esqueleto). `main` está em `d498026`. Sem remoto. Nenhum merge/push autorizado. |
| **Servidor local** | `npm run dev` em `E:\dev\fiorbe\prototypes\hero-3d` → http://localhost:3100 (`?debug` mostra fps/qualidade) |

### Aprovado pelo usuário
- Etapa 00 (auditoria) — commit `066625d`.
- Stack: Next.js 16 · React 19 · TypeScript strict · CSS Modules · CSS variables · `next/font`; libs 3D/motion só quando necessárias.
- Fluxo: Claude Code = fonte única do código; Claude Design = exploração.
- Hero: navegação Produtos · Sobre · Contato; CTA do header "Conversar".
- Direção do estudo do hero: aproximar da imagem `E:\dev\fiorbe\referencias\hero\referencia-hero-v1.png` (direção autorizada para o estudo, **não** aprovação visual do resultado).
- Commits locais autorizados até aqui (não equivalem a aprovação visual).

### Implementado, aguardando revisão visual do usuário
- Laboratório visual da Etapa 01 (canvas, rodadas 1 e 2) — paleta, tipografia, lettering, direções.
- Hero: composição/interface da referência, escultura de fitas autorais, cenário (chão, reflexo, trilhas, luz), interação (cursor/arraste limitados), transição de scroll (protótipo técnico).
- Figura humana v1 (esqueleto, idle em camadas, IK nos pés, integração de luz).
- Plano do `RIB-001` (escultura viva): auditoria, baseline, pesquisa, especificação e 6 subtarefas — **planejado, nada implementado**.

### Pendências e bloqueios
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
| Hero Experience | HERO-003 | Cenário: chão, reflexo, trilhas, luz | 04 | Implementado (protótipo) | Aguardando revisão | `HERO_PROTOTIPO.md` |
| Hero Experience | FIG-001 | Figura humana tridimensional | 04 | Em andamento (v1 implementada) | Aguardando revisão | [tarefas/FIG-001.md](tarefas/FIG-001.md) |
| Hero Experience | RIB-001 | Escultura viva: onda, desfiar/recompor, hover, atmosfera, otimização | 04–05 | Planejado | Plano aguardando aprovação | [tarefas/RIB-001.md](tarefas/RIB-001.md) |
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
| Git | branches `main` e `exp/hero-fidelidade`; sem remoto |
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
| Linguagem do efeito da escultura | Conceito proposto "a fita se desfia em fios e se recompõe"; só shader × híbrido com fios instanciados; cursor opção B | RIB-001 |
| Ordem de trabalho | `RIB-01` (recomendado) × `FIG-01` | Painel |
| Manifesto, pilares, ecossistema, processo | Conflitos de copy do kit (`AUDITORIA_00.md` §3) | SEC-06, SEC-08, SEC-09, SEC-10 |
| E-mail público `fiorbeltda@gmail.com` | Sem resposta ("ltda" pode soar como alegação societária) | SEC-02 / SEC-12 |

## Pendências de marca e negócio

- Docs do Drive não lidos; fatos limitados ao `CLAUDE.md`.
- Validar nome, domínio e registro legal antes de publicar alegações.
- Confirmar detalhes reais do Motor Fiscal com engenharia.
- Fundadores: fotos, bios, canais de contato e copy.

## Manutenção

Ao fim de cada tarefa: atualizar o **Painel** (tarefa ativa e próximo objetivo), a linha do componente no **Mapa**, a **ficha** da tarefa e o **Log**. Registrar só o que aconteceu. Nunca marcar "Aprovado" sem confirmação explícita do usuário.
