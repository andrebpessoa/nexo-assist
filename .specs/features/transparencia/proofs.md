# transparencia proofs

**HEAD**: 5ae283f
**Tree**: clean
**Result**: 21 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof                                                                                               | Ran | Passed | Result |
| ----- | --------------------------------------------------------------------------------------------------- | --- | ------ | ------ |
| C1    | `bun --cwd apps/web test src/features/decision/action-line.test.tsx -t "action line above reply"`   | 1   | 1      | pass   |
| C2    | `bun test packages/agent/src/transparency.test.ts -t "labels only from executed steps"`             | 1   | 1      | pass   |
| C3    | `bun test packages/agent/src/transparency.test.ts -t "service down shows failed label"`             | 1   | 1      | pass   |
| C4    | `bun --cwd apps/web test src/features/decision/action-line.test.tsx -t "progress in gerund"`        | 1   | 1      | pass   |
| C5    | `bun test packages/agent/src/transparency.test.ts -t "no tools label"`                              | 1   | 1      | pass   |
| C6    | `bun --cwd apps/web test src/features/decision/decision-panel.test.tsx -t "panel opens and closes"` | 1   | 1      | pass   |
| C7    | `bun test packages/agent/src/transparency.test.ts -t "panel understood"`                            | 1   | 1      | pass   |
| C8    | `bun test packages/agent/src/transparency.test.ts -t "panel did"`                                   | 1   | 1      | pass   |
| C9    | `bun test packages/agent/src/transparency.test.ts -t "confidence band"`                             | 1   | 1      | pass   |
| C10   | `bun test packages/agent/src/transparency.test.ts -t "why in three sentences"`                      | 1   | 1      | pass   |
| C11   | `bun test packages/agent/src/engine.steps.test.ts -t "step details"`                                | 1   | 1      | pass   |
| C12   | `bun test packages/agent/src/transparency.test.ts -t "transfer panel"`                              | 1   | 1      | pass   |
| C13   | `bun test packages/agent/src/transparency.test.ts -t "employee panel"`                              | 1   | 1      | pass   |
| C14   | `bun test packages/agent/src/transparency.test.ts -t "analyst panel"`                               | 1   | 1      | pass   |
| C15   | `bun test packages/agent/src/transparency.test.ts -t "help label"`                                  | 1   | 1      | pass   |
| C16   | `bun test packages/agent/src/engine.steps.test.ts -t "decision survives restart"`                   | 1   | 1      | pass   |
| C17   | `bun test packages/agent/src/engine.steps.test.ts -t "decision log"`                                | 1   | 1      | pass   |
| C18   | `bun test packages/agent/src/transparency.test.ts -t "conversation totals"`                         | 1   | 1      | pass   |
| Build | `bun run check-types`                                                                               | -   | -      | pass   |
| Build | `bun biome check apps packages`                                                                     | -   | -      | pass   |
| Build | `bun run test`                                                                                      | -   | -      | pass   |

## Mutations

| Mutation                                       | Location                                 | Killed |
| ---------------------------------------------- | ---------------------------------------- | ------ |
| a repeated step shows twice in the action line | `packages/agent/src/transparency.ts:102` | yes    |
| 80% falls into the medium band                 | `packages/agent/src/transparency.ts:116` | yes    |
| the employee sees model, tokens and cost       | `packages/agent/src/transparency.ts:261` | yes    |
