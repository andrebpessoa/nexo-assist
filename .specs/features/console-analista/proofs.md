# console-analista proofs

**HEAD**: f2b3358
**Tree**: clean
**Result**: 36 pass, 0 fail; mutations 3 killed, 0 not

| Check | Proof | Ran | Passed | Result |
| --- | --- | --- | --- | --- |
| C1 | `bun --cwd apps/web test src/features/console/console-screen.test.tsx -t "rail, list, open conversation and the` | 1 | 1 | pass |
| C2 | `bun --cwd apps/web test src/features/console/conversation-list.test.tsx -t "each item shows initials, name, ti` | 1 | 1 | pass |
| C3 | `bun test packages/agent/src/console.test.ts -t "counts per filter"` | 1 | 1 | pass |
| C4 | `bun --cwd apps/server test src/console.test.ts -t "lists with counts computed on the server"` | 1 | 1 | pass |
| C5 | `bun test packages/agent/src/console.test.ts -t "counts per filter"` | 1 | 1 | pass |
| C6 | `bun test packages/agent/src/console.test.ts -t "waiting first by nearest contact deadline, then by last messag` | 1 | 1 | pass |
| C7 | `bun test packages/agent/src/console.test.ts -t "waiting first by nearest contact deadline, then by last messag` | 1 | 1 | pass |
| C8 | `bun --cwd apps/web test src/features/console/labels.test.ts -t "search by name or ticket, ignoring case and ac` | 1 | 1 | pass |
| C9 | `bun --cwd apps/web test src/features/console/conversation-list.test.tsx -t "search by name or ticket without a` | 1 | 1 | pass |
| C10 | `bun --cwd apps/web test src/features/console/console-screen.test.tsx -t "list refreshes by itself"` | 1 | 1 | pass |
| C11 | `bun --cwd apps/web test src/features/console/conversation-list.test.tsx -t "badge shows Para você; off when un` | 1 | 1 | pass |
| C12 | `bun --cwd apps/web test src/features/console/console-screen.test.tsx -t "Disponível off hides the badge and is` | 1 | 1 | pass |
| C13 | `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "history with times, day separator,` | 1 | 1 | pass |
| C14 | `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "header: name, department, ticket a` | 1 | 1 | pass |
| C15 | `bun --cwd apps/server test src/console.test.ts -t "opening a conversation clears its unread count"` | 1 | 1 | pass |
| C16 | `bun --cwd apps/web test src/features/console/tickets-panel.test.tsx -t "title, totals, this conversation and o` | 1 | 1 | pass |
| C17 | `bun --cwd apps/web test src/features/console/tickets-panel.test.tsx -t "Ver todos expands to every ticket"` | 1 | 1 | pass |
| C18 | `bun --cwd apps/web test src/features/console/tickets-panel.test.tsx -t "the arrow expands description, notes a` | 1 | 1 | pass |
| C19 | `bun --cwd apps/web test src/features/console/console-screen.test.tsx -t "X closes the panel, header reopens"` | 1 | 1 | pass |
| C20 | `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "the magnifier finds and highlights` | 1 | 1 | pass |
| C21 | `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "⋮ menu enables items by state"` | 1 | 1 | pass |
| C22 | `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "waiting: banner, both buttons and ` | 1 | 1 | pass |
| C23 | `bun --cwd apps/server test src/console.test.ts -t "assume moves the conversation and the ticket"` | 1 | 1 | pass |
| C24 | `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "TAKEN shows who took it and reload` | 1 | 1 | pass |
| C25 | `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "assumed by me: field on, header ha` | 1 | 1 | pass |
| C26 | `bun --cwd apps/server test src/console.test.ts -t "the reply reaches the employee's chat with name and team"` | 1 | 1 | pass |
| C27 | `bun --cwd apps/server test src/console.test.ts -t "give back: the agent answers the next employee message"` | 1 | 1 | pass |
| C28 | `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "close asks for confirmation"` | 1 | 1 | pass |
| C29 | `bun test packages/agent/src/console.test.ts -t "every other move is INVALID_TRANSITION"` | 1 | 1 | pass |
| C30 | `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "a failed action warns and keeps th` | 1 | 1 | pass |
| C31 | `bun --cwd apps/web test src/features/console/conversation-list.test.tsx -t "skeletons while loading"` | 1 | 1 | pass |
| C32 | `bun --cwd apps/server test src/console.test.ts -t "state and assignee survive a restart"` | 1 | 1 | pass |
| C33 | `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "a question the agent also wrote as` | 1 | 1 | pass |
| Build | `bun run check-types` | - | - | pass |
| Build | `bun biome check apps packages` | - | - | pass |
| Build | `bun run test` | - | - | pass |

## Mutations

| Mutation | Location | Killed |
| --- | --- | --- |
| CON-15: the message at read_seq still counts as unread | `packages/agent/src/console.ts:204` | yes |
| CON-02: an employee left unanswered for 24 h shows Resolvida pelo agent | `packages/agent/src/console.ts:184` | yes |
| CON-21: Assumir atendimento enabled on a conversation another analyst holds | `apps/web/src/features/console/conversation-view.tsx:393` | yes |
