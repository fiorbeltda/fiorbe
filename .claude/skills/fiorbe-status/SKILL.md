---
name: fiorbe-status
description: Resume o estado real do projeto FIORBE (objetivo, componente e tarefa ativos, implementado × aprovado, pendências, branch/checkpoint, próximo objetivo) lendo docs/fiorbe/ESTADO.md, a ficha ativa em docs/fiorbe/tarefas/ e o Git. Use quando o usuário pedir status, "onde estamos", "o que falta" ou ao abrir uma sessão nova do projeto FIORBE.
---

# /fiorbe-status

Somente leitura. **Não guarda status próprio e não edita arquivos.** A fonte canônica é `docs/fiorbe/ESTADO.md`; esta skill apenas lê e confere.

## Passos

1. Ler o bloco **Painel** e o **Mapa do projeto** de `docs/fiorbe/ESTADO.md`.
2. Ler a ficha do componente em desenvolvimento indicada no painel (`docs/fiorbe/tarefas/<ID>.md`): subtarefas, subtarefa ativa, decisões pendentes.
3. Conferir o Git real:
   - `git -C E:/dev/fiorbe branch --show-current`
   - `git -C E:/dev/fiorbe log --oneline -5 --all`
   - `git -C E:/dev/fiorbe status --short`
4. **Checar consistência** e reportar qualquer divergência, sem corrigir:
   - branch/checkpoint do painel × `git` real;
   - componente/tarefa ativos do painel × ficha;
   - itens "Aprovado" sem registro de aprovação do usuário no Log;
   - alterações não commitadas não mencionadas no painel.

## Formato da resposta (PT-BR, curto)

```
OBJETIVO: ...
COMPONENTE EM DESENVOLVIMENTO: <ID> — <nome>
TAREFA ATIVA: <ID> — <situação>
PRÓXIMO OBJETIVO: ...
APROVADO PELO USUÁRIO: ...
IMPLEMENTADO, AGUARDANDO REVISÃO: ...
PENDÊNCIAS E BLOQUEIOS: ...
GIT: branch <x> · último commit <hash msg> · árvore <limpa|N alterações>
DIVERGÊNCIAS ENCONTRADAS: nenhuma | lista
```

Regras: citar caminhos absolutos (`E:\dev\fiorbe\...`); não inventar porcentagens; não chamar de aprovado o que só foi implementado ou commitado; se um arquivo esperado não existir, dizer isso em vez de supor o conteúdo.
