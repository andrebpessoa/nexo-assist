# Console do analista Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/console-analista/design.md`
**Status**: Approved
**Approved**: 2026-10-28 - user: "sim, faça a aplicação de todas as features, me avise se precisar de algo" (delegado por André em t152u; recomendações adotadas, AD-020)
**Mutations**: 3
**Build**: `bun run check-types; bun biome check apps packages; bun run test`

> Commits locais, um por tarefa, sem `--no-verify` e sem push (AD-010).

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Transições, resumo e store | unit + integration (banco em memória com seed) | Cada transição válida e inválida, rótulos, filtros, ordem, corrida | `packages/agent/src/console.test.ts`, `store.test.ts` | `bun test packages/agent` |
| Rotas do console | integration (`app.request`, banco em memória) | Lista, conversa, ações, erros, reinício | `apps/server/src/console.test.ts` | `bun --cwd apps/server test` |
| Lógica da tela | unit | Rótulos, busca | `apps/web/src/features/console/labels.test.ts` | `bun --cwd apps/web test` |
| Componentes | component (happy-dom, API falsa) | Cada controle desenhado | `apps/web/src/features/console/*.test.tsx` | `bun --cwd apps/web test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Unidade | `bun test packages/agent` / `bun --cwd apps/web test` |
| Full | Integração | `bun run test` |
| Build | Fim de fase | `bun run check-types && bun biome check apps packages && bun run test` |

---

## Execution Plan

```
T1 → T2 → T3 → T4 → T5 → T6
```

---

## Task Breakdown

#### T1: Transições e responsável da conversa

**What**: colunas `assignee_id` e `read_seq` com migração; `transition` pura; `store.claim` condicional, `markRead`, `listAll`; linha "<analista> assumiu · agent pausado".
**Where**: `packages/db/src/schema/agent.ts`, `packages/db/src/migrations/`, `packages/agent/src/console.ts`, `store.ts`, `engine.ts`
**Depends on**: None
**Reuses**: `seededDb`, `agentHarness`
**Requirement**: CON-23, CON-24, CON-27, CON-28, CON-29, CON-32

**Done when**:

- [ ] Cada transição válida tem teste e as inválidas devolvem `INVALID_TRANSITION`
- [ ] Assumida por outro devolve `TAKEN`; assumir de novo a própria não muda nada
- [ ] `claim` condicional: de dois pedidos, um ganha
- [ ] Estado, responsável e histórico sobrevivem a um store novo sobre o mesmo banco

**Tests**: unit + integration
**Gate**: quick
**Commit**: `feat(agent): transições e responsável da conversa no console`

---

#### T2: Resumo, filtros e ordem da lista

**What**: `summarize` (status, chamado, contato, confiança, prévia, hora, não lidas, números), `filterCounts`, `inFilter`, `order`; "Resolvida pelo agent" calculada (D-02); "Todas" sem encerradas há mais de 7 dias.
**Where**: `packages/agent/src/console.ts`
**Depends on**: T1
**Reuses**: decisões e blocos já gravados
**Requirement**: CON-02, CON-03, CON-04, CON-05, CON-06, CON-07, CON-15

**Done when**:

- [ ] Rótulo de cada estado, incluindo "pediu ajuda" com a confiança e "contato em" sem chamado
- [ ] Contadores de "Para você", "Com o agent" e "Minhas" batem com as conversas
- [ ] Aguardando primeiro pelo prazo; depois pela última mensagem
- [ ] Não lidas contam só mensagens do funcionário depois de `read_seq`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(agent): resumo, filtros e ordem das conversas do console`

---

#### T3: Rotas do console no Worker

**What**: `/console/conversations` (lista e contadores), `/console/conversations/:id` (zera não lidas), chamados do funcionário e detalhe, `assume` (com `tickets.assume` e volta se falhar), `reply`, `return`, `close`; só analista.
**Where**: `apps/server/src/console.ts`, `console-access.ts`, `index.ts`
**Depends on**: T2
**Reuses**: `createTicketService`, `createAgent`, `agentHarness`
**Requirement**: CON-10, CON-15, CON-16, CON-23, CON-24, CON-26, CON-27, CON-28, CON-29, CON-30, CON-32

**Done when**:

- [ ] Funcionário recebe 403 e sem sessão 401
- [ ] Assumir muda conversa e chamado ("Em atendimento", evento "assumido")
- [ ] Resposta do analista aparece no histórico do funcionário com nome e equipe
- [ ] Devolver faz o agent responder à próxima mensagem do funcionário
- [ ] Falha do serviço ao assumir mantém o estado anterior

**Tests**: integration
**Gate**: full
**Commit**: `feat(server): rotas do console do analista`

---

#### T4: Lista de conversas

**What**: `api.ts`, `labels.ts`, `conversation-list.tsx`: trilho com badge, "Disponível", busca sem acento, filtros com totais, itens com rótulo, "Nenhuma conversa aqui.", esqueletos.
**Where**: `apps/web/src/features/console/`
**Depends on**: T3
**Reuses**: `readSse` não; `fetch` como no chat
**Requirement**: CON-02, CON-03, CON-04, CON-05, CON-06, CON-08, CON-09, CON-11, CON-12, CON-31

**Done when**:

- [ ] Rótulos e hora de cada item
- [ ] Filtros e busca (nome, número, sem acento)
- [ ] Badge some com "Disponível" desligado
- [ ] Esqueletos enquanto carrega

**Tests**: unit + component
**Gate**: quick
**Commit**: `feat(web): lista de conversas do console`

---

#### T5: Conversa aberta e ações

**What**: `conversation-view.tsx`: cabeçalho com selo, mensagens com hora, "Hoje", selo IA e linha de ações (abre o painel de decisão), linhas de sistema; faixa "<nome> espera um atendente"; Assumir, Devolver, Encerrar com confirmação; campo de resposta; menu "⋮"; lupa; avisos de erro e `TAKEN`.
**Where**: `apps/web/src/features/console/`
**Depends on**: T4
**Reuses**: `ActionLine`, `DecisionPanel`, `Bubble`
**Requirement**: CON-13, CON-14, CON-20, CON-21, CON-22, CON-23, CON-24, CON-25, CON-26, CON-27, CON-28, CON-30, CON-31

**Done when**:

- [ ] Aguardando: faixa, botões e campo desabilitado
- [ ] Assumido: campo habilitado, "Devolver ao agent" e "Encerrar atendimento" no cabeçalho
- [ ] Encerrar pede confirmação
- [ ] `TAKEN` mostra "<nome> já assumiu esta conversa."
- [ ] Lupa destaca os resultados; "⋮" habilita conforme o estado

**Tests**: component
**Gate**: quick
**Commit**: `feat(web): conversa e ações do console`

---

#### T6: Painel de chamados e tela do console

**What**: `tickets-panel.tsx` ("Chamados da <nome>", "N abertos · M encerrados", "Desta conversa", "Outros chamados", "Ver todos", seta com detalhe, X e reabrir, erro com "Tentar de novo"); `console-screen.tsx` com polling de 3 s; rota `/console`.
**Where**: `apps/web/src/features/console/`, `apps/web/src/routes/console.tsx`
**Depends on**: T5
**Reuses**: `statusTone`
**Requirement**: CON-01, CON-10, CON-16, CON-17, CON-18, CON-19, CON-30, CON-31

**Done when**:

- [ ] Painel com os dois blocos e os totais
- [ ] "Ver todos" e a seta expandem
- [ ] X fecha e o botão do cabeçalho reabre
- [ ] Falha mostra "Não foi possível carregar os chamados · Tentar de novo"
- [ ] Lista e conversa se atualizam sozinhas

**Tests**: component
**Gate**: build
**Commit**: `feat(web): painel de chamados e tela do console`
