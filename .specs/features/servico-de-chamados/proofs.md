# servico-de-chamados proofs

**HEAD**: 4e06e69
**Tree**: clean
**Result**: 35 pass, 1 fail; mutations 3 killed, 0 not

| Check | Proof | Ran | Passed | Result |
| --- | --- | --- | --- | --- |
| C1 | `bun test packages/tickets/src/boundaries.test.ts -t "no agent imports"` | 1 | 1 | pass |
| C2 | `bun test packages/tickets/src/service.test.ts -t "list own tickets newest first"` | 1 | 1 | pass |
| C3 | `bun test packages/tickets/src/service.test.ts -t "only open"` | 1 | 1 | pass |
| C4 | `bun test packages/tickets/src/service.test.ts -t "detail includes notes and events"` | 1 | 1 | pass |
| C5 | `bun test packages/tickets/src/service.test.ts -t "not found for other requester"` | 1 | 1 | pass |
| C6 | `bun test apps/server/src/tickets.test.ts -t "actor from session"` | 2 | 2 | pass |
| C7 | `bun test packages/tickets/src/service.test.ts -t "analyst reads all"` | 1 | 1 | pass |
| C8 | `bun test packages/tickets/src/rules/validate.test.ts -t "invalid fields"` | 11 | 11 | pass |
| C9 | `bun test packages/tickets/src/rules/validate.test.ts -t "length limits"` | 2 | 2 | pass |
| C10 | `bun test packages/tickets/src/service.test.ts -t "create assigns next number"` | 1 | 1 | pass |
| C11 | `bun test packages/tickets/src/repository.test.ts -t "idempotent insert"` | 2 | 2 | pass |
| C12 | `bun test packages/tickets/src/service.test.ts -t "add note"` | 13 | 13 | pass |
| C13 | `bun test packages/tickets/src/service.test.ts -t "ticket closed"` | 1 | 1 | pass |
| C14 | `bun test packages/tickets/src/service.test.ts -t "reopen within 7 days"` | 2 | 2 | pass |
| C15 | `bun test packages/tickets/src/rules/transitions.test.ts -t "reopen not allowed"` | 8 | 8 | pass |
| C16 | `bun test packages/tickets/src/rules/sla.test.ts -t "deadline by priority"` | 4 | 4 | pass |
| C17 | `bun test packages/tickets/src/rules/business-hours.test.ts -t "friday 16:00 plus 4 business hours"` | 1 | 1 | pass |
| C18 | `bun test packages/tickets/src/rules/sla.test.ts -t "overdue"` | 5 | 5 | pass |
| C19 | `bun test packages/tickets/src/service.test.ts -t "team update resets deadline"` | 2 | 2 | pass |
| C20 | `bun test packages/tickets/src/service.test.ts -t "employee note keeps deadline"` | 1 | 1 | pass |
| C21 | `bun test packages/tickets/src/service.test.ts -t "transfer records event"` | 1 | 1 | pass |
| C22 | `bun test packages/tickets/src/service.test.ts -t "assume"` | 5 | 5 | pass |
| C23 | `bun test packages/tickets/src/rules/validate.test.ts -t "transfer without summary"` | 1 | 1 | pass |
| C24 | `bun test packages/tickets/src/failure.test.ts -t "fails before writing"` | 1 | 1 | pass |
| C25 | `bun test packages/tickets/src/failure.test.ts -t "rate zero never fails"` | 1 | 1 | pass |
| C26 | `walk - criar um chamado pelo smoke, reiniciar bun run dev e rodar bun test packages/tickets/test/d1.smoke.test` | - | - | pass (Walked) |
| C27 | `bun test packages/tickets/src/seed/build.test.ts -t "people"` | 1 | 1 | pass |
| C28 | `bun test packages/tickets/src/seed/build.test.ts -t "articles"` | 1 | 1 | pass |
| C29 | `bun test packages/tickets/src/seed/build.test.ts -t "tickets"` | 3 | 3 | pass |
| C30 | `bun test packages/tickets/src/kb.test.ts -t "vpn 809 first"` | 1 | 1 | pass |
| C31 | `bun test packages/tickets/src/kb.test.ts -t "no match empty"` | 1 | 1 | pass |
| C32 | `bun test packages/tickets/src/seed/apply.test.ts -t "idempotent seed"` | 2 | 2 | pass |
| C33 | `walk - com HOME apontando para uma pasta vazia, bun run dev abre a tela de login em localhost e bun run db:see` | - | - | pass (Walked) |
| Build | `bun run check-types` | - | - | pass |
| Build | `bun biome check .` | - | - | **fail** - 29     │ - /·Something·users·**CALL**·(API)·/·Response·format,·errors,·auth,·versioning,·rate·limiti |
| Build | `bun run test` | - | - | pass |

## Mutations

| Mutation | Location | Killed |
| --- | --- | --- |
| privacy filter applied to analyst instead of employee | `packages/tickets/src/service.ts:78` | yes |
| reopen window shifted by one minute | `packages/tickets/src/rules/transitions.ts:21` | yes |
| overdue at exactly the deadline (<= -> <) | `packages/tickets/src/rules/sla.ts:33` | yes |
