# entrega proofs

**HEAD**: f2b3358
**Tree**: clean
**Result**: 20 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof | Ran | Passed | Result |
| --- | --- | --- | --- | --- |
| C1 | `bun test scripts/docs.test.ts -t "README has the six sections"` | 1 | 1 | pass |
| C2 | `bun test scripts/docs.test.ts -t "README explains the model and the cost per conversation"` | 1 | 1 | pass |
| C3 | `bun test scripts/docs.test.ts -t "env example covers every schema variable"` | 1 | 1 | pass |
| C4 | `walk - clone limpo em diretório temporário: bun install, bun run setup, bun run dev; login da Ana com o seed` | - | - | pass (Walked) |
| C5 | `bun test scripts/secrets.test.ts` | 2 | 2 | pass |
| C6 | `bun test scripts/docs.test.ts -t "README justifies the module split"` | 1 | 1 | pass |
| C7 | `bun run check-types` | count unknown | - | pass |
| C8 | `bun biome check .` | count unknown | - | pass |
| C9 | `bun run test` | 5 | - | pass |
| C10 | `bun test scripts/docs.test.ts -t "README shows the last eval result"` | 1 | 1 | pass |
| C11 | `walk - git log da entrega: um commit por tarefa, Conventional Commits validados por check_commit.py` | - | - | pass (Walked) |
| C12 | `walk - não se aplica nesta rodada: o André não autorizou o deploy (AD-010)` | - | - | pass (Walked) |
| C13 | `walk - não se aplica nesta rodada: só com deploy (AD-010)` | - | - | pass (Walked) |
| C14 | `walk - não se aplica nesta rodada: só com deploy (AD-010)` | - | - | pass (Walked) |
| C15 | `bun test scripts/docs.test.ts -t "README explains the AI Studio key and the free tier"` | 1 | 1 | pass |
| C16 | `bun --cwd apps/server test src/chat-agent.test.ts -t "the Mastra understander is built with LLM_MODEL and the ` | 1 | 1 | pass |
| Build | `bun run check-types` | - | - | pass |
| Build | `bun biome check .` | - | - | pass |
| Build | `bun run test` | - | - | pass |
| Build | `bun test scripts` | - | - | pass |

## Mutations

| Mutation | Location | Killed |
| --- | --- | --- |
| LLM_MODEL nao chega ao understander (so ao modelId devolvido) | `apps/server/src/chat-agent.ts:41` | yes |
| custo por conversa vira o custo total | `packages/agent/eval/run.ts:41` | yes |
| seed que responde erro conta como seeded | `scripts/dev.ts:23` | yes |
