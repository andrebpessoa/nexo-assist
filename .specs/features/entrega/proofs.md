# entrega proofs

**HEAD**: d8cbe72
**Tree**: clean
**Result**: 22 pass, 0 fail; mutations 3 killed, 0 not

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
| C12 | `walk - bun run deploy; seed pela rota protegida; login da Ana no link público e resposta do agent; secrets lis` | - | - | pass (Walked) |
| C13 | `bun --cwd apps/server test src/usage.test.ts src/chat-app.test.ts` | 13 | 13 | pass |
| C14 | `bun test scripts/docs.test.ts -t "README explains the deploy and how keys are protected"` | 1 | 1 | pass |
| C17 | `bun --cwd apps/server test src/admin-seed.test.ts` | 3 | 3 | pass |
| C18 | `bun test scripts/db-seed.test.ts` | 3 | 3 | pass |
| C15 | `bun test scripts/docs.test.ts -t "README explains the AI Studio key and the free tier"` | 1 | 1 | pass |
| C16 | `bun --cwd apps/server test src/chat-agent.test.ts -t "the Mastra understander is built with LLM_MODEL and the ` | 1 | 1 | pass |
| Build | `bun run check-types` | - | - | pass |
| Build | `bun biome check .` | - | - | pass |
| Build | `bun run test` | - | - | pass |
| Build | `bun test scripts` | - | - | pass |

## Mutations

| Mutation | Location | Killed |
| --- | --- | --- |
| token comparison ignores length: the token plus any suffix opens /admin/seed (C17) | `apps/server/src/admin-seed.ts:10` | yes |
| model calls never counted in the server: the daily cap never triggers (C13) | `apps/server/src/chat-agent.ts:82` | yes |
| /chat/send in the server admits every message: no minute limit nor daily cap (C13) - the wiring moved from index.ts to createChatApp in 66cc60b | `apps/server/src/chat-app.ts:27` | yes |
