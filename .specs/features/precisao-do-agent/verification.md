# Precisão do agent verification

**Verdict**: FAIL
**Mutations**: 3 - probed C5, C8, C13
**Proofs**: `proofs.md` at c942f7d (HEAD b92d3f9 só muda docs)
**Verifier**: independent sub-agent (author != verifier)

Uma mutação sobreviveu. O resto do que foi provado se sustenta.

## Mutations injected

Rodadas com `mutate.py --spec mutations.json` na árvore real. A árvore voltou limpa.

| Mutation | Location | Killed |
| --- | --- | --- |
| artigo volta a vencer reabrir e chamado novo que cita (PRE-05) | `packages/agent/src/engine.ts:776` | yes - C5 |
| sinal articleResolves ausente conta como resolve (PRE-07) | `packages/agent/src/rules/article.ts:26` | yes - C8 |
| alternativa sobrescreve blocksWork true dito pela pessoa (PRE-13) | `packages/agent/src/engine.ts:621` | no - nem C13 nem `bun test packages/agent` |

## Own examples

- `blocksWork` true e `workaround` true no mesmo turno, e `blocksWork` true num turno e `workaround` true no seguinte. No HEAD os dois ficam Alta com `blocksWork` true. Correto. Sob a mutação 3 os dois viram `blocksWork` false. Nenhum teste do repositório pega isso.
- `bun run eval --only=` (lista vazia). Roda 0 conversas, imprime `US$ NaN por conversa` e sai 1 sem dizer por quê.

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| A guarda de PRE-13 (só quando a pessoa não disse se impede) não tem teste. Se o modelo devolve `blocksWork` true e `workaround` true, ou se um turno anterior já disse que impede, tirar a guarda baixa a prioridade e nada fica vermelho. | mutação `merged.blocksWork === undefined && f.workaround === true` -> `f.workaround === true` (`engine.ts:621`) não morta por C13 nem pela suíte do agent | em `engine.create.test.ts:190` (C13), afirmar que `blocksWork` true + `workaround` true no mesmo turno e `blocksWork` true num turno anterior ficam Alta com `blocksWork` true | `e23bc55` |
| `--only` sem id (`--only=` ou `--only` no fim) roda 0 conversas, mostra `NaN` no custo e sai 1 sem mensagem. | `run.ts:96` devolve `[]`; `selectConversations([])` em `run.ts:113` aceita | tratar lista vazia como erro em `selectConversations` ou no `cli.ts`: sair 1 com "--only precisa de ao menos um id", e testar junto de C3 | `002a23e` |
