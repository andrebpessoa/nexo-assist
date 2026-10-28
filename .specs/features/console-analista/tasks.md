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

- [x] Cada transição válida tem teste e as inválidas devolvem `INVALID_TRANSITION`
- [x] Assumida por outro devolve `TAKEN`; assumir de novo a própria não muda nada
- [x] `claim` condicional: de dois pedidos, um ganha
- [x] Estado, responsável e histórico sobrevivem a um store novo sobre o mesmo banco

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

- [x] Rótulo de cada estado, incluindo "pediu ajuda" com a confiança e "contato em" sem chamado
- [x] Contadores de "Para você", "Com o agent" e "Minhas" batem com as conversas
- [x] Aguardando primeiro pelo prazo; depois pela última mensagem
- [x] Não lidas contam só mensagens do funcionário depois de `read_seq`

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

- [x] Funcionário recebe 403 e sem sessão 401
- [x] Assumir muda conversa e chamado ("Em atendimento", evento "assumido")
- [x] Resposta do analista aparece no histórico do funcionário com nome e equipe
- [x] Devolver faz o agent responder à próxima mensagem do funcionário
- [x] Falha do serviço ao assumir mantém o estado anterior

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

- [x] Rótulos e hora de cada item
- [x] Filtros e busca (nome, número, sem acento)
- [x] Badge some com "Disponível" desligado
- [x] Esqueletos enquanto carrega

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

- [x] Aguardando: faixa, botões e campo desabilitado
- [x] Assumido: campo habilitado, "Devolver ao agent" e "Encerrar atendimento" no cabeçalho
- [x] Encerrar pede confirmação
- [x] `TAKEN` mostra "<nome> já assumiu esta conversa."
- [x] Lupa destaca os resultados; "⋮" habilita conforme o estado

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

- [x] Painel com os dois blocos e os totais
- [x] "Ver todos" e a seta expandem
- [x] X fecha e o botão do cabeçalho reabre
- [x] Falha mostra "Não foi possível carregar os chamados · Tentar de novo"
- [x] Lista e conversa se atualizam sozinhas

**Tests**: component
**Gate**: build
**Commit**: `feat(web): painel de chamados e tela do console`

---

## Checks

**C1** - Tela como a captura 04: trilho, lista "Conversas", conversa no centro e painel "Chamados da <nome>" (CON-01)
Proof: `bun --cwd apps/web test src/features/console/console-screen.test.tsx -t "rail, list, open conversation and the tickets panel"`

**C2** - Cada item com iniciais, nome, hora, prévia, não lidas e rótulo do estado (CON-02)
Proof: `bun --cwd apps/web test src/features/console/conversation-list.test.tsx -t "each item shows initials, name, time, preview, unread and label"`

**C3** - "Para você" lista as aguardando atendente, com o total (CON-03)
Proof: `bun test packages/agent/src/console.test.ts -t "counts per filter"`

**C4** - "Com o agent" lista as `com_agent`, com o total (CON-04)
Proof: `bun --cwd apps/server test src/console.test.ts -t "lists with counts computed on the server"`

**C5** - "Minhas" lista as assumidas pelo analista da sessão, com o total (CON-05)
Proof: `bun test packages/agent/src/console.test.ts -t "counts per filter"`

**C6** - "Todas" sem as encerradas há mais de 7 dias (CON-06)
Proof: `bun test packages/agent/src/console.test.ts -t "waiting first by nearest contact deadline, then by last message"`

**C7** - Aguardando primeiro pelo prazo de contato; depois pela última mensagem (CON-07)
Proof: `bun test packages/agent/src/console.test.ts -t "waiting first by nearest contact deadline, then by last message"`

**C8** - Busca por nome ou número, sem maiúsculas nem acentos (CON-08)
Proof: `bun --cwd apps/web test src/features/console/labels.test.ts -t "search by name or ticket, ignoring case and accents"`

**C9** - Sem resultado: "Nenhuma conversa aqui." (CON-09)
Proof: `bun --cwd apps/web test src/features/console/conversation-list.test.tsx -t "search by name or ticket without accents; empty shows the notice"`

**C10** - Lista e contadores se atualizam sozinhos em até 5 s (CON-10)
Proof: `bun --cwd apps/web test src/features/console/console-screen.test.tsx -t "list refreshes by itself"`

**C11** - Badge do ícone Conversas = total de "Para você" (CON-11)
Proof: `bun --cwd apps/web test src/features/console/conversation-list.test.tsx -t "badge shows Para você; off when unavailable"`

**C12** - "Disponível" desligado zera o badge e mantém a lista (CON-12)
Proof: `bun --cwd apps/web test src/features/console/console-screen.test.tsx -t "Disponível off hides the badge and is remembered"`

**C13** - Histórico com hora, "Hoje", selo "IA", nome e equipe do analista e linhas de sistema (CON-13)
Proof: `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "history with times, day separator, IA label and system lines"`

**C14** - Cabeçalho com nome, setor, chamado e selo do estado (CON-14)
Proof: `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "header: name, department, ticket and state badge"`

**C15** - Abrir a conversa zera as não lidas (CON-15)
Proof: `bun --cwd apps/server test src/console.test.ts -t "opening a conversation clears its unread count"`

**C16** - Painel com título, "N abertos · M encerrados", "Desta conversa" e "Outros chamados" (CON-16)
Proof: `bun --cwd apps/web test src/features/console/tickets-panel.test.tsx -t "title, totals, this conversation and others"`

**C17** - "Ver todos os chamados da <nome> ↗" expande todos os chamados (CON-17)
Proof: `bun --cwd apps/web test src/features/console/tickets-panel.test.tsx -t "Ver todos expands to every ticket"`

**C18** - A seta expande descrição, notas e eventos (CON-18)
Proof: `bun --cwd apps/web test src/features/console/tickets-panel.test.tsx -t "the arrow expands description, notes and events"`

**C19** - X fecha o painel e o cabeçalho ganha o botão que reabre (CON-19)
Proof: `bun --cwd apps/web test src/features/console/console-screen.test.tsx -t "X closes the panel, header reopens"`

**C20** - Lupa busca na conversa e destaca os resultados (CON-20)
Proof: `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "the magnifier finds and highlights text"`

**C21** - "⋮" abre o menu com os três itens habilitados conforme o estado (CON-21)
Proof: `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "⋮ menu enables items by state"`

**C22** - Aguardando: faixa com "Agent pausado · até HH:MM", dois botões e campo desabilitado (CON-22)
Proof: `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "waiting: banner, both buttons and a disabled field"`

**C23** - Assumir passa a conversa ao analista, grava a linha e muda o chamado para "Em atendimento" (CON-23)
Proof: `bun --cwd apps/server test src/console.test.ts -t "assume moves the conversation and the ticket"`

**C24** - Já assumida por outro: recusa com "<nome> já assumiu esta conversa." (CON-24)
Proof: `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "TAKEN shows who took it and reloads"`

**C25** - Assumida por mim: campo habilitado, "Devolver ao agent" e "Encerrar atendimento" no cabeçalho (CON-25)
Proof: `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "assumed by me: field on, header has give back and close"`

**C26** - Resposta com "<nome> · <equipe>" chega ao chat do funcionário (CON-26)
Proof: `bun --cwd apps/server test src/console.test.ts -t "the reply reaches the employee's chat with name and team"`

**C27** - Devolver: conversa em `com_agent`, linha de sistema e o agent responde à próxima mensagem (CON-27)
Proof: `bun --cwd apps/server test src/console.test.ts -t "give back: the agent answers the next employee message"`

**C28** - Encerrar pede confirmação e, confirmado, encerra com linha de sistema (CON-28)
Proof: `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "close asks for confirmation"`

**C29** - Transição inexistente: `INVALID_TRANSITION` e nada muda (CON-29)
Proof: `bun test packages/agent/src/console.test.ts -t "every other move is INVALID_TRANSITION"`

**C30** - Ação falhou: aviso e estado anterior mantido (CON-30)
Proof: `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "a failed action warns and keeps the screen"`

**C31** - Esqueletos enquanto a lista ou a conversa carrega (CON-31)
Proof: `bun --cwd apps/web test src/features/console/conversation-list.test.tsx -t "skeletons while loading"`

**C32** - Estado, responsável e histórico sobrevivem a um reinício (CON-32)
Proof: `bun --cwd apps/server test src/console.test.ts -t "state and assignee survive a restart"`

**C33** - Pergunta que vem no texto e nas opções aparece uma vez (CON-33)
Proof: `bun --cwd apps/web test src/features/console/conversation-view.test.tsx -t "a question the agent also wrote as text shows once"`

---

## Handoff

**Settled mid-build:** none
**Dispatched:** none
**Walked:** pending
