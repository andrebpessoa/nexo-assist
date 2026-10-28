# Chat do funcionário Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/chat-funcionario/design.md`
**Status**: Approved
**Approved**: 2026-10-28 - user: "sim, faça a aplicação de todas as features, me avise se precisar de algo" (delegado por André em t152u; recomendações adotadas, AD-020)
**Mutations**: 3
**Build**: `bun run check-types; bun biome check apps packages; bun run test`

> Commits locais, um por tarefa, sem `--no-verify` e sem push (AD-010).

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Sessão e motor | unit + integration (seed + entendimento roteirizado) | Contagem, limite, encerrar, analista | `packages/agent/src/session.test.ts`, `engine.session.test.ts` | `bun test packages/agent` |
| Rotas do chat | integration (`app.request`, banco em memória) | SSE, limite, histórico, encerrar | `apps/server/src/chat.test.ts` | `bun --cwd apps/server test` |
| Lógica da tela | unit | SSE, dobra do histórico | `apps/web/src/features/chat/*.test.ts` | `bun --cwd apps/web test` |
| Componentes | component (happy-dom, API falsa) | Cada controle desenhado | `apps/web/src/features/chat/*.test.tsx` | `bun --cwd apps/web test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Unidade | `bun test packages/agent` / `bun --cwd apps/web test` |
| Full | Integração | `bun run test` |
| Build | Fim de fase | `bun run check-types && bun biome check apps packages && bun run test` |

---

## Execution Plan

```
T1 → T2
T1 → T3 → T4 → T5
```

---

## Task Breakdown

#### T1: Sessão, analista no limite e conversa encerrada

**What**: `session.ts` com contagem e admissão; `{ action: "analyst" }` transfere com gatilho `pedido`; `close` e estado `encerrada`; `store.open` ignora encerradas; número no rascunho criado.
**Where**: `packages/agent/src/session.ts`, `engine.ts`, `store.ts`, `types.ts`, `packages/db/src/schema/agent.ts`
**Depends on**: None
**Reuses**: `agentHarness`
**Requirement**: CHAT-22, CHAT-23, CHAT-24, CHAT-29

**Done when**:

- [x] Contagem só de mensagens do funcionário com texto
- [x] `admit` recusa vazio, longo e a 31ª
- [x] `analyst` transfere sem chamar o modelo
- [x] `close` encerra e `open` abre outra conversa

**Tests**: unit + integration
**Gate**: quick
**Commit**: `feat(agent): limite de mensagens, analista no limite e conversa encerrada`

---

#### T2: Rotas do chat no Worker

**What**: `GET /chat/history`, `POST /chat/send` em SSE (`step`, `delta`, `done`), `POST /chat/new`; agent real por requisição (Mastra com chave, entendimento dev sem chave); log de decisão no Worker; chave opcional no env.
**Where**: `apps/server/src/chat.ts`, `chat-agent.ts`, `dev-understander.ts`, `index.ts`, `apps/server/.env.schema`, `packages/infra/alchemy.run.ts`
**Depends on**: T1
**Reuses**: `createTicketService`, `createMastraUnderstander`, `agentHarness`
**Requirement**: CHAT-02, CHAT-03, CHAT-05, CHAT-24, CHAT-25, CHAT-28, CHAT-29

**Done when**:

- [ ] SSE com passos, palavras e `done`
- [ ] 401 sem sessão, 403 para analista, 400 vazio ou longo, 429 no limite
- [ ] Histórico com contador, estado, prazo de contato e mensagens do analista
- [ ] `/chat/new` encerra e abre outra

**Tests**: integration
**Gate**: full
**Commit**: `feat(server): rotas do chat com streaming`

---

#### T3: Cliente do chat e dobra do histórico

**What**: `api.ts` com leitor de SSE; `fold.ts` com o estado final de rascunhos, opções e listas.
**Where**: `apps/web/src/features/chat/api.ts`, `stream.ts`, `fold.ts`
**Depends on**: T1
**Reuses**: tipos de `@nexo-assist/agent/types`
**Requirement**: CHAT-11, CHAT-13, CHAT-18, CHAT-20, CHAT-21, CHAT-25, CHAT-31

**Done when**:

- [ ] Eventos SSE lidos em pedaços; queda antes do `done` vira erro com texto parcial
- [ ] Opções e listas respondidas travadas; rascunho no estado final

**Tests**: unit
**Gate**: quick
**Commit**: `feat(web): cliente do chat e estado final dos blocos`

---

#### T4: Blocos ricos e campo de mensagem

**What**: Opções numeradas, lista de chamados, card do chamado, card do rascunho (Confirmar ⌘↵, Editar, Cancelar), campo com contador e limite.
**Where**: `apps/web/src/features/chat/blocks.tsx`, `composer.tsx`
**Depends on**: T3
**Reuses**: tokens do protótipo
**Requirement**: CHAT-04, CHAT-05, CHAT-06, CHAT-10 a CHAT-20, CHAT-22, CHAT-23

**Done when**:

- [ ] Cada controle desenhado com teste
- [ ] Confirmar manda uma vez só

**Tests**: component
**Gate**: quick
**Commit**: `feat(web): blocos do chat e campo de mensagem`

---

#### T5: Tela do chat em /atendimento

**What**: `ChatScreen` com histórico, esqueletos, boas-vindas, linha de ações e painel, faixa do analista, polling, "Novas mensagens", selo de saúde e erros; rota ligada.
**Where**: `apps/web/src/features/chat/chat-screen.tsx`, `apps/web/src/routes/atendimento.tsx`
**Depends on**: T4
**Reuses**: `EmployeeFrame`, `ActionLine`, `DecisionPanel`
**Requirement**: CHAT-01, CHAT-02, CHAT-03, CHAT-07, CHAT-08, CHAT-09, CHAT-26, CHAT-27, CHAT-28, CHAT-30, CHAT-31, CHAT-32, CHAT-33

**Done when**:

- [ ] Telas 02 e 03 percorridas em 1440x900
- [ ] Erros de envio e de streaming com "Tentar de novo"

**Tests**: component
**Gate**: build
**Commit**: `feat(web): tela do chat do funcionário`

---

## Checks

**C1** - Tela como a captura 02: barra lateral, barra superior com selo, conversa, campo, Enviar e contador (CHAT-01)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "layout"`

**C2** - Mensagem na hora à direita; resposta palavra a palavra (CHAT-02)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "own message at once and reply word by word"`

**C3** - Enquanto responde: Enviar desabilitado e ações em andamento (CHAT-03)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "working disables send and shows progress"`

**C4** - Vazia ou só espaços: Enviar desabilitado (CHAT-04)
Proof: `bun --cwd apps/web test src/features/chat/composer.test.tsx -t "send disabled when empty"`

**C5** - Mais de 2.000 caracteres: "Máximo de 2.000 caracteres." (CHAT-05)
Proof: `bun --cwd apps/web test src/features/chat/composer.test.tsx -t "max length"`

**C6** - Enter envia; Shift+Enter quebra a linha (CHAT-06)
Proof: `bun --cwd apps/web test src/features/chat/composer.test.tsx -t "enter sends, shift enter breaks"`

**C7** - Rola no fim; lendo acima mostra "Novas mensagens" (CHAT-07)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "new messages button"`

**C8** - Primeira conversa: boas-vindas com o primeiro nome (CHAT-08)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "welcome"`

**C9** - Sem saúde: "Assistente indisponível" (CHAT-09)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "health badge"`

**C10** - Pergunta com opções numeradas (CHAT-10)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "options numbered"`

**C11** - Clique ou número com campo vazio envia a opção e trava as outras (CHAT-11)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "option by click or key"`

**C12** - Lista de chamados com número, título, status colorido e data (CHAT-12)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "ticket list"`

**C13** - Escolher envia "<número> · <título>" e trava a lista (CHAT-13)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "select ticket"`

**C14** - Card "Chamado · <número>" com status, título, descrição e campos (CHAT-14)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "ticket card"`

**C15** - Vencido: "prazo vencido" na cor de alerta (CHAT-15)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "overdue card"`

**C16** - "Falar com um analista", "Adicionar informação", "Não, obrigado" como opções rápidas (CHAT-16)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "overdue offers are quick options"`

**C17** - Card "Novo chamado · Rascunho <id>" com Tipo, prazo e botões (CHAT-17)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "draft card"`

**C18** - Confirmar (ou atalho) manda uma vez só e o card vira "Chamado criado · <número>" (CHAT-18)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "confirm once"`

**C19** - Editar abre campos com "Salvar" e "Descartar alterações" (CHAT-19)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "edit fields"`

**C20** - Cancelar: status "Cancelado" sem botões (CHAT-20)
Proof: `bun --cwd apps/web test src/features/chat/blocks.test.tsx -t "cancel"`

**C21** - Confirmação falhou: rascunho segue com botões ativos e o aviso (CHAT-21)
Proof: `bun --cwd apps/web test src/features/chat/fold.test.ts -t "failed confirm keeps draft active"`

**C22** - "N/30 mensagens nesta sessão" contando só mensagens do funcionário (CHAT-22)
Proof: `bun test packages/agent/src/session.test.ts -t "counts only employee messages"`

**C23** - No limite: envio travado, aviso e as duas saídas (CHAT-23)
Proof: `bun --cwd apps/web test src/features/chat/composer.test.tsx -t "limit reached"`

**C24** - Servidor recusa a 31ª mensagem (CHAT-24)
Proof: `bun --cwd apps/server test src/chat.test.ts -t "refuses the 31st message"`

**C25** - Volta com o histórico, cards no estado final e contador (CHAT-25)
Proof: `bun --cwd apps/server test src/chat.test.ts -t "history after restart"`

**C26** - Esqueletos enquanto o histórico carrega (CHAT-26)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "skeleton while loading"`

**C27** - Faixa "Aguardando um analista · contato até HH:MM" e escrita liberada (CHAT-27)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "waiting analyst banner"`

**C28** - Mensagem do analista e linhas de sistema em até 3 s (CHAT-28)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "analyst message arrives by polling"`

**C29** - Encerrada: escrever abre conversa nova com contador zerado (CHAT-29)
Proof: `bun --cwd apps/server test src/chat.test.ts -t "closed conversation opens a new one"`

**C30** - Envio falhou: "Não enviada · Tentar de novo" com o texto (CHAT-30)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "failed send"`

**C31** - Streaming caiu: texto parcial e "Resposta interrompida · Tentar de novo" (CHAT-31)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "interrupted reply"`

**C32** - Sem rolagem horizontal a partir de 1280 px (CHAT-32)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "fits 1280"`

**C33** - "Sair" e "Meu perfil" seguem AUTH-16 e AUTH-17 (CHAT-33)
Proof: `bun --cwd apps/web test src/features/chat/chat-screen.test.tsx -t "frame keeps profile and sign out"`
