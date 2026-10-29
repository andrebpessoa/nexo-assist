# chat-funcionario proofs

**HEAD**: 5ae283f
**Tree**: clean
**Result**: 36 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof                                                                                                            | Ran | Passed | Result |
| ----- | ---------------------------------------------------------------------------------------------------------------- | --- | ------ | ------ |
| C1    | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "layout"`                                     | 1   | 1      | pass   |
| C2    | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "own message at once and reply word by word"` | 1   | 1      | pass   |
| C3    | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "working disables send and shows progress"`   | 1   | 1      | pass   |
| C4    | `bun --cwd apps/web test src/features/chat/composer.test.tsx -t "send disabled when empty"`                      | 1   | 1      | pass   |
| C5    | `bun --cwd apps/web test src/features/chat/composer.test.tsx -t "max length"`                                    | 1   | 1      | pass   |
| C6    | `bun --cwd apps/web test src/features/chat/composer.test.tsx -t "enter sends, shift enter breaks"`               | 1   | 1      | pass   |
| C7    | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "new messages button"`                        | 1   | 1      | pass   |
| C8    | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "welcome"`                                    | 1   | 1      | pass   |
| C9    | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "health badge"`                               | 1   | 1      | pass   |
| C10   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "options numbered"`                                | 1   | 1      | pass   |
| C11   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "option by click or key"`                          | 1   | 1      | pass   |
| C12   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "ticket list"`                                     | 1   | 1      | pass   |
| C13   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "select ticket"`                                   | 1   | 1      | pass   |
| C14   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "ticket card"`                                     | 1   | 1      | pass   |
| C15   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "overdue card"`                                    | 1   | 1      | pass   |
| C16   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "overdue offers are quick options"`                | 1   | 1      | pass   |
| C17   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "draft card"`                                      | 1   | 1      | pass   |
| C18   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "confirm once"`                                    | 1   | 1      | pass   |
| C19   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "edit fields"`                                     | 1   | 1      | pass   |
| C20   | `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "cancel"`                                          | 1   | 1      | pass   |
| C21   | `bun --cwd apps/web test src/features/chat/fold.test.ts -t "failed confirm keeps draft active"`                  | 1   | 1      | pass   |
| C22   | `bun test packages/agent/src/session.test.ts -t "counts only employee messages"`                                 | 1   | 1      | pass   |
| C23   | `bun --cwd apps/web test src/features/chat/composer.test.tsx -t "limit reached"`                                 | 1   | 1      | pass   |
| C24   | `bun --cwd apps/server test src/chat.test.ts -t "refuses the 31st message"`                                      | 1   | 1      | pass   |
| C25   | `bun --cwd apps/server test src/chat.test.ts -t "history after restart"`                                         | 1   | 1      | pass   |
| C26   | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "skeleton while loading"`                     | 1   | 1      | pass   |
| C27   | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "waiting analyst banner"`                     | 1   | 1      | pass   |
| C28   | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "analyst message arrives by polling"`         | 1   | 1      | pass   |
| C29   | `bun --cwd apps/server test src/chat.test.ts -t "closed conversation opens a new one"`                           | 1   | 1      | pass   |
| C30   | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "failed send"`                                | 1   | 1      | pass   |
| C31   | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "interrupted reply"`                          | 1   | 1      | pass   |
| C32   | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "fits 1280"`                                  | 1   | 1      | pass   |
| C33   | `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "frame keeps profile and sign out"`           | 1   | 1      | pass   |
| Build | `bun run check-types`                                                                                            | -   | -      | pass   |
| Build | `bun biome check apps packages`                                                                                  | -   | -      | pass   |
| Build | `bun run test`                                                                                                   | -   | -      | pass   |

## Mutations

| Mutation                                    | Location                                     | Killed |
| ------------------------------------------- | -------------------------------------------- | ------ |
| the draft card sends the confirmation twice | `apps/web/src/features/chat/blocks.tsx:413`  | yes    |
| the server takes a 31st message             | `packages/agent/src/session.ts:29`           | yes    |
| exactly 2.000 characters is refused         | `apps/web/src/features/chat/composer.tsx:28` | yes    |
