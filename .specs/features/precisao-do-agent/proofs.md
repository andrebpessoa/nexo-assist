# precisao-do-agent proofs

**HEAD**: 9de1422
**Tree**: clean
**Result**: 27 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof | Ran | Passed | Result |
| --- | --- | --- | --- | --- |
| C1 | `bun test packages/agent/eval/eval.test.ts -t "only runs the chosen conversations"` | 1 | 1 | pass |
| C2 | `bun test packages/agent/eval/eval.test.ts -t "partial run never writes RESULT.md"` | 1 | 1 | pass |
| C3 | `bun test packages/agent/eval/eval.test.ts -t "unknown id exits 1 without calling the model"` | 1 | 1 | pass |
| C4 | `bun test packages/agent/eval/eval.test.ts -t "without only runs all 22"` | 1 | 1 | pass |
| C5 | `bun test packages/agent/src/engine.ticket-article.test.ts -t "duplicate wins over the article"` | 1 | 1 | pass |
| C6 | `bun test packages/agent/src/engine.ticket-article.test.ts -t "no duplicate decides by the article"` | 1 | 1 | pass |
| C7 | `bun test packages/agent/src/engine.ticket-article.test.ts -t "article that resolves answers with a ticket offe` | 1 | 1 | pass |
| C8 | `bun test packages/agent/src/engine.ticket-article.test.ts -t "article that does not resolve goes to the draft"` | 1 | 1 | pass |
| C9 | `bun test packages/agent/src/engine.ticket-article.test.ts -t "article already tried goes to the draft"` | 1 | 1 | pass |
| C10 | `bun test packages/agent/src/engine.ticket-article.test.ts -t "article that resolves but does not fit says why"` | 1 | 1 | pass |
| C11 | `bun test packages/agent/src/understand-mastra.test.ts -t "judge prompt defines resolves without a ticket"` | 1 | 1 | pass |
| C12 | `bun test packages/agent/src/engine.kb.test.ts -t "doubt ignores the ticket signals"` | 1 | 1 | pass |
| C13 | `bun test packages/agent/src/engine.create.test.ts -t "workaround counts as not blocking"` | 1 | 1 | pass |
| C23 | `bun test packages/agent/eval/eval.test.ts -t "only without ids exits 1"` | 1 | 1 | pass |
| C14 | `bun test packages/agent/src/understand-mastra.test.ts -t "understand prompt asks affected only when said"` | 1 | 1 | pass |
| C22 | `bun test packages/agent/src/understand-mastra.test.ts -t "understand prompt leaves affected null by default"` | 1 | 1 | pass |
| C15 | `bun test packages/agent/src/understand-mastra.test.ts -t "understand prompt reads a workaround as not blocking` | 1 | 1 | pass |
| C16 | `bun test packages/agent/src/understand-mastra.test.ts -t "understand prompt sends a vague report to low confid` | 1 | 1 | pass |
| C17 | `bun test packages/agent/eval/result.test.ts -t "vague report transfers live"` | 1 | 1 | pass |
| C18 | `bun test packages/agent/eval/result.test.ts -t "final live run reaches 90 percent"` | 1 | 1 | pass |
| C19 | `bun test scripts/docs.test.ts -t "README shows the last eval result"` | 1 | 1 | pass |
| C20 | `bun test packages/agent/eval/result.test.ts -t "rules at 100 percent stay at 100 percent"` | 1 | 1 | pass |
| C21 | `bun test packages/agent/eval/eval.test.ts -t "eval set"` | 1 | 1 | pass |
| Build | `bun run check-types` | - | - | pass |
| Build | `bun run check` | - | - | pass |
| Build | `bun run test` | - | - | pass |
| Build | `bun test scripts` | - | - | pass |

## Mutations

| Mutation | Location | Killed |
| --- | --- | --- |
| artigo volta a vencer reabrir e chamado novo que cita (PRE-05) | `packages/agent/src/engine.ts:776` | yes |
| sinal articleResolves ausente conta como resolve (PRE-07) | `packages/agent/src/rules/article.ts:26` | yes |
| alternativa sobrescreve blocksWork true dito pela pessoa (PRE-13) | `packages/agent/src/engine.ts:621` | yes |
