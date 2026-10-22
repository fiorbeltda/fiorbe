# Fichas de componentes e tarefas

Uma ficha por **componente em desenvolvimento** (ex.: `FIG-001.md`). As subtarefas vivem dentro da ficha do componente — não em arquivos separados. Correções pequenas não ganham ficha: uma linha no Log do `ESTADO.md` basta.

O status consolidado fica no `ESTADO.md` (painel). A ficha guarda o detalhe: plano, evidências e histórico. Se ficha e painel divergirem, corrija os dois na mesma tarefa.

## Status (dois eixos independentes)

- **Implementação:** Não iniciado · Em andamento · Implementado · Bloqueado
- **Aprovação:** — · Aguardando revisão · Ajustes pedidos · Aprovado (somente com confirmação explícita do usuário)

Commit não é aprovação. Não usar porcentagens.

## Fluxo de cada tarefa

1. Entender o objetivo e verificar o estado atual (código, capturas, ficha).
2. Planejar alterações específicas e explicar o porquê.
3. Implementar somente a tarefa autorizada.
4. Testar funcionamento e qualidade visual.
5. Comparar com capturas anteriores.
6. Registrar na ficha e no `ESTADO.md` (incluindo o próximo objetivo).
7. Apresentar o resultado.
8. Aguardar aprovação quando houver decisão visual importante.

## Modelo

```markdown
# <ID> — <Nome do componente>

| Campo | Valor |
|---|---|
| Área | |
| Etapa do plano | |
| Implementação | |
| Aprovação | |
| Branch / checkpoint | |
| Subtarefa ativa | |
| Próximo objetivo | |

## Objetivo e contexto
## Critérios de qualidade
## Subtarefas
| ID | Subtarefa | Implementação | Aprovação | Evidência |
## Dependências
## Arquivos envolvidos
## Evidências de testes
## Decisões pendentes
## Histórico
| Data | Subtarefa | O que foi feito | Checkpoint |
## Conclusão
```
