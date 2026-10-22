# FIORBE — Kit de execução para Claude

**Versão:** 1.0 — 22/10/2026  
**Objetivo:** construir uma landing page institucional de qualidade internacional, por partes, sem perder a unidade visual nem inventar fatos sobre a startup.

## Comece por aqui

1. Extraia o ZIP e copie `CLAUDE.md`, `docs/fiorbe/*` e `prompts/*` para seu projeto. Mantenha `referencias/fita_escultural_enviada.png` apenas como inspiração visual; ela NÃO é um asset final nem deve ser reproduzida literalmente.
2. Abra o repositório no Claude Code. Envie o conteúdo de `prompts/00-auditoria-e-preparacao.md`. Ele deve ler `CLAUDE.md`, entender o repositório real e indicar o estado de base.
3. Execute os prompts em **ordem**. Cada etapa cria uma parte, preserva as anteriores e termina com relatório, preview e teste. Você aprova ou pede mudanças antes da próxima.
4. Depois da entrega inicial, execute `prompts/REVISAO-CRITICA-DA-ETAPA.md`, aprove visualmente, e então use `prompts/CHECAGEM-DE-INTEGRACAO.md` antes da próxima etapa.
5. Use `docs/fiorbe/ESTADO.md` como memória do projeto entre sessões. Atualize em cada etapa.
6. Se o Claude iniciar uma sessão nova, diga: "Leia CLAUDE.md, docs/fiorbe/PLANO_MESTRE.md, docs/fiorbe/ESTADO.md e execute somente prompts/XX-...md".

## Estrutura

- `CLAUDE.md` — contrato global que nunca muda a cada sessão.
- `docs/fiorbe/PLANO_MESTRE.md` — narrativa, seções, dependencies e mapa da experiência.
- `docs/fiorbe/IDENTIDADE_E_COPY.md` — o que foi aprovado vs. proposto e microcopy.
- `docs/fiorbe/MOTION_SPEC.md` — efeitos e regras de interação.
- `docs/fiorbe/QUALITY_GATE.md` — checklist de aceitação, QA e relatórios.
- `docs/fiorbe/ESTADO.md` — checkpoint durável de implementação.
- `prompts/00...15` — instruções para sessões individuais.
- `referencias/` — imagem enviada e links oficiais, não uma licença para copiar.

## Regra de ouro

**Uma etapa = uma unidade revisável de trabalho.** Não peça "crie o site inteiro" de uma vez.  Primeiro aprovar sistema visual e hero estático, depois a escultura interativa, depois a transição de scroll e cada capítulo.

## Entregas

Primeiro: home institucional (`/`). Depois: página de produto (`/produtos/motor-fiscal`). Por último: testes end-to-end, performance, acessibilidade e publicação; nada de inventar recursos, clientes, resultados ou status jurídico.
