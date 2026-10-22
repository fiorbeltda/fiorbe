# ESTADO DO PROJETO FIORBE — MEMÓRIA ENTRE SESSÕES

**Última atualização:** 22/10/2026  
**Etapa atual:** 01 — DNA visual e Design System (planejada, não iniciada)  
**Etapas concluídas:** 00 (ver matriz)

## Base técnica

| Item | Valor |
|---|---|
| Caminho | `E:\dev\fiorbe` |
| Branch | `main` (local, sem remoto) |
| Ambiente | Windows 10 · Node 22.22.2 · npm 12.0.1 · git 2.53 · Claude Code 2.1.308 · pnpm ausente |
| Disco | C: com ~1 GB livre. Já apontam para E: (variáveis de usuário existentes, nada alterado): cache npm `E:\npm-cache`, `TEMP` `E:\BrendonData\Temp`, `PLAYWRIGHT_BROWSERS_PATH` `E:\BrendonData\Caches\Playwright`. Build/cache do Next (`.next/`) ficará dentro do projeto em E: |
| Stack | **Pendente de aprovação.** Proposta: Next.js 16 App Router + React 19 + TS strict + `tokens.css` + CSS Modules; 3D só na etapa 04 |
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

## Matriz de etapas

| N | Nome | Situação | Commit | Observações |
|---|---|---|---|---|
| 00 | Auditoria | Concluída — ajustes pedidos aplicados | primeiro commit | Só documentação, configuração git e referências |
| 01 | Tokens / design lab | Planejada | — | Exige aprovação da stack antes da camada técnica |
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
| Stack técnica | Proposta feita, sem resposta | Antes da camada técnica da 01 |
| Paleta | Kit (`#071525 #0B1F3B #176BFF #16BADE #18B7A5 #68E7C6 #F5F8FC`) × prancha aprovada (`#061A3A #0066FF #00D2FF #00C4B8 #0A0F1E #F7FAFF`) | 01, comparação visual |
| Lettering / wordmark | Estilo Exo 2 das pranchas × SVG geométrico V4 × placeholder tipográfico. Nenhum é master | 01, comparação visual |
| Tipografia de interface | Geist × Inter × Manrope (Exo 2 só como hipótese prévia) | 01 |
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
