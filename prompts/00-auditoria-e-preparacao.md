> PROMPT PARA CLAUDE CODE — Execute somente esta etapa. Leia antes `CLAUDE.md` e `docs/fiorbe/{PLANO_MESTRE,IDENTIDADE_E_COPY,MOTION_SPEC,QUALITY_GATE,ESTADO}.md`. Inspecione o repositório. Preserve todas as etapas anteriores. Não avance automaticamente. Ao terminar: preview, capturas se possível, testes realmente feitos, relatório no formato do QUALITY_GATE e atualização de ESTADO.md. Se a etapa depende de aprovação anterior ainda ausente, informe o bloqueio e proponha o mínimo para revisão, sem fingir aprovação.

# ETAPA 00 — Auditoria do projeto e preparação do repositório

## Objetivo

Preparar uma base confiável antes de desenhar ou codar qualquer componente. **Não criar hero, site final ou novas páginas nesta etapa.**

## Sua tarefa

1. Verifique diretório atual e leia package.json, estrutura, scripts, versão de framework, CSS, dependências, roteamento, arquivos de identidade e conteúdo preexistentes.
2. Identifique versões, erros atuais, possíveis conflitos com Next.js/React/Tailwind e recursos que já estão implementados. Nada de inventar stack ou apagar código pronto.
3. Confira os materiais deste kit. Veja `referencias/fita_escultural_enviada.png` apenas como referência criativa e identifique se há assets oficiais — a imagem não é a marca final.
4. Execute scripts de teste/lint/build existentes, anotando baseline, falhas prévias e limitações do ambiente.
5. Proponha (não execute sem necessidade) estrutura de módulos, rotas (`/`, `/produtos/motor-fiscal`), nomes de seções e regras de design tokens.
6. Crie somente documentação e scaffolding estritamente necessário para etapas seguintes. Não traga novas dependências sem motivo.
7. Em `ESTADO.md` registre stack, arquitetura real, scripts, caminho de assets, decisões pendentes, comando para rodar dev server e branch.

## Entrega de aprovação

Uma **auditoria de uma página**, com riscos prioritários e um plano de arquivos. Aceito se o projeto atual estiver entendido e não houver alteração estética desnecessária. PARE.
