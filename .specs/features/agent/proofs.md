# agent proofs

**HEAD**: afe77a9
**Tree**: clean
**Result**: 50 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof                                                                                                          | Ran | Passed | Result |
| ----- | -------------------------------------------------------------------------------------------------------------- | --- | ------ | ------ |
| C1    | `bun test packages/agent/src/understand-mastra.test.ts -t "mastra understander returns a valid understanding"` | 1   | 1      | pass   |
| C2    | `bun test packages/agent/src/engine.basics.test.ts -t "decision record"`                                       | 1   | 1      | pass   |
| C3    | `bun test packages/agent/src/engine.basics.test.ts -t "facts only from tools"`                                 | 1   | 1      | pass   |
| C4    | `bun test packages/agent/src/engine.basics.test.ts -t "one question at a time"`                                | 1   | 1      | pass   |
| C5    | `bun test packages/agent/src/engine.basics.test.ts -t "small talk"`                                            | 1   | 1      | pass   |
| C6    | `bun test packages/agent/src/engine.basics.test.ts -t "manipulation"`                                          | 1   | 1      | pass   |
| C7    | `bun test packages/agent/src/store.test.ts -t "conversation survives a new agent"`                             | 1   | 1      | pass   |
| C8    | `bun test packages/agent/src/engine.kb.test.ts -t "searches help center first"`                                | 1   | 1      | pass   |
| C9    | `bun test packages/agent/src/engine.kb.test.ts -t "article answers"`                                           | 1   | 1      | pass   |
| C10   | `bun test packages/agent/src/engine.kb.test.ts -t "article condition fails"`                                   | 1   | 1      | pass   |
| C11   | `bun test packages/agent/src/engine.kb.test.ts -t "no article"`                                                | 1   | 1      | pass   |
| C12   | `bun test packages/agent/src/engine.status.test.ts -t "many open tickets list"`                                | 1   | 1      | pass   |
| C13   | `bun test packages/agent/src/engine.status.test.ts -t "one open ticket"`                                       | 1   | 1      | pass   |
| C14   | `bun test packages/agent/src/engine.status.test.ts -t "no open ticket"`                                        | 1   | 1      | pass   |
| C15   | `bun test packages/agent/src/engine.status.test.ts -t "ticket card"`                                           | 1   | 1      | pass   |
| C16   | `bun test packages/agent/src/engine.status.test.ts -t "overdue offer"`                                         | 1   | 1      | pass   |
| C17   | `bun test packages/agent/src/engine.status.test.ts -t "not found among yours"`                                 | 1   | 1      | pass   |
| C18   | `bun test packages/agent/src/engine.status.test.ts -t "other person's tickets"`                                | 1   | 1      | pass   |
| C19   | `bun test packages/agent/src/engine.create.test.ts -t "checks tickets before draft"`                           | 1   | 1      | pass   |
| C20   | `bun test packages/agent/src/engine.create.test.ts -t "open duplicate"`                                        | 1   | 1      | pass   |
| C21   | `bun test packages/agent/src/engine.create.test.ts -t "recent resolved"`                                       | 1   | 1      | pass   |
| C22   | `bun test packages/agent/src/engine.create.test.ts -t "old resolved"`                                          | 1   | 1      | pass   |
| C23   | `bun test packages/agent/src/engine.create.test.ts -t "infers type and category"`                              | 1   | 1      | pass   |
| C24   | `bun test packages/agent/src/engine.create.test.ts -t "asks affected"`                                         | 1   | 1      | pass   |
| C25   | `bun test packages/agent/src/rules/priority.test.ts -t "priority from impact and urgency"`                     | 1   | 1      | pass   |
| C26   | `bun test packages/agent/src/rules/priority.test.ts -t "not sure counts as only me"`                           | 1   | 1      | pass   |
| C27   | `bun test packages/agent/src/engine.create.test.ts -t "draft fields"`                                          | 1   | 1      | pass   |
| C28   | `bun test packages/agent/src/engine.create.test.ts -t "nothing before confirm"`                                | 1   | 1      | pass   |
| C29   | `bun test packages/agent/src/engine.create.test.ts -t "confirm once"`                                          | 1   | 1      | pass   |
| C30   | `bun test packages/agent/src/engine.create.test.ts -t "edit recalculates"`                                     | 1   | 1      | pass   |
| C31   | `bun test packages/agent/src/engine.create.test.ts -t "cancel"`                                                | 1   | 1      | pass   |
| C32   | `bun test packages/agent/src/engine.create.test.ts -t "text confirmation"`                                     | 1   | 1      | pass   |
| C33   | `bun test packages/agent/src/engine.update.test.ts -t "update draft"`                                          | 1   | 1      | pass   |
| C34   | `bun test packages/agent/src/engine.update.test.ts -t "update confirmed"`                                      | 1   | 1      | pass   |
| C35   | `bun test packages/agent/src/engine.transfer.test.ts -t "asks for analyst"`                                    | 1   | 1      | pass   |
| C36   | `bun test packages/agent/src/engine.transfer.test.ts -t "critical creates and transfers"`                      | 1   | 1      | pass   |
| C37   | `bun test packages/agent/src/engine.transfer.test.ts -t "overdue accepted"`                                    | 1   | 1      | pass   |
| C38   | `bun test packages/agent/src/engine.transfer.test.ts -t "low confidence"`                                      | 1   | 1      | pass   |
| C39   | `bun test packages/agent/src/engine.transfer.test.ts -t "transfer summary"`                                    | 1   | 1      | pass   |
| C40   | `bun test packages/agent/src/engine.transfer.test.ts -t "silent while with analyst"`                           | 1   | 1      | pass   |
| C41   | `bun test packages/agent/src/engine.transfer.test.ts -t "returned to agent"`                                   | 1   | 1      | pass   |
| C42   | `bun test packages/agent/src/engine.basics.test.ts -t "out of scope"`                                          | 1   | 1      | pass   |
| C43   | `bun test packages/agent/src/retry.test.ts -t "service unavailable retries"`                                   | 1   | 1      | pass   |
| C44   | `bun test packages/agent/src/engine.failures.test.ts -t "failure keeps draft"`                                 | 1   | 1      | pass   |
| C45   | `bun test packages/agent/eval/eval.test.ts -t "eval set"`                                                      | 1   | 1      | pass   |
| C46   | `bun test packages/agent/src/window.test.ts -t "window of twenty plus summary"`                                | 1   | 1      | pass   |
| C47   | `bun test packages/agent/src/engine.failures.test.ts -t "rate limited"`                                        | 1   | 1      | pass   |
| Build | `bun run check-types`                                                                                          | -   | -      | pass   |
| Build | `bun biome check apps packages`                                                                                | -   | -      | pass   |
| Build | `bun run test`                                                                                                 | -   | -      | pass   |

## Mutations

| Mutation                                                                   | Location                                  | Killed |
| -------------------------------------------------------------------------- | ----------------------------------------- | ------ |
| Crítica only when the whole company is stopped (team outage drops to Alta) | `packages/agent/src/rules/priority.ts:25` | yes    |
| low confidence acts instead of calling an analyst                          | `packages/agent/src/engine.ts:1196`       | yes    |
| agent answers while the conversation waits for an analyst                  | `packages/agent/src/engine.ts:1485`       | yes    |
