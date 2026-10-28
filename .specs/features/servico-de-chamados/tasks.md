# Serviço de chamados Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/servico-de-chamados/design.md`
**Status**: In Progress
**Approved**: 2026-10-28 - user: "Aprovo as 28 tasks de servico-de-chamados e as 4 recomendações (biome check só leitura, pedir aval antes de trocar a versão do alchemy, seed por rota de dev, corrigir dev:server na entrega); pode implementar"
**Mutations**: 3
**Build**: `bun run check-types; bun biome check .; bun run test`

> Nota de execução (2026-10-28): `bun biome check .` já falhava na base (128 erros em `packages/ui`, `packages/db/src/schema/auth.ts` e `apps/web`, mais Markdown/JSON de `.specs/` e `.cursor/`, que o biome 2.6 também formata), nenhum em código desta feature. Nas tarefas, o gate rodou `bun biome check` nos arquivos novos e `bun biome lint` nos alterados. A linha Build fica como aprovada; o Build de `proofs.md` segue vermelho até André decidir.

> Commits locais, um por tarefa, sem `--no-verify` e sem push (AD-010). T1 a T3 vêm antes do domínio porque o dev local e a migração da base travam as tarefas de banco (AD-016, AD-018).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied. A base não tem testes; tipo e comando vêm de AD-014 ("libsql + smoke D1", aprovado pelo André). Lint: `biome.json` e `lefthook.yml`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regras puras (`rules/`, `kb.ts`, `seed/build.ts`) | unit | Todos os ramos; 1:1 com os critérios TKT; todo edge case da spec | `packages/tickets/src/**/*.test.ts` | `bun test packages/tickets` |
| Repositório, serviço, falha simulada, seed aplicado | integration (libsql em memória) | Caminhos principais de consulta e escrita + todos os códigos de erro | `packages/tickets/src/**/*.test.ts` | `bun run test` |
| Servidor (fábrica, rota de seed) | integration (`app.request`) | Caminho feliz + flag desligada + sem sessão | `apps/server/src/**/*.test.ts` | `bun run test` |
| Fumaça no D1 local | integration (dev local no ar) | Seed + privacidade + persistência | `packages/tickets/test/*.smoke.test.ts` | `bun test packages/tickets/test/d1.smoke.test.ts` |
| Infra e dev local (`alchemy.run.ts`, scripts) | walk | O comando sobe e o efeito é visto | - | `bun run dev` |
| Schema, tipos, config, migração | none | - (build gate only) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefas só com testes de unidade | `bun test packages/tickets` |
| Full | Tarefas com testes de integração | `bun run test` |
| Build | Fim de fase, tarefas de config, schema ou walk | `bun run check-types && bun biome check . && bun run test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Base e ambiente

```
T1 → T2 → T3
T4 → T5
```

### Phase 2: Domínio puro

```
T6 → T7 → T8 → T9
T7 → T10
T7 → T11
T7 → T12
```

### Phase 3: Persistência

```
T13 → T14 → T15
```

### Phase 4: Serviço

```
T16 → T17 → T18
T16 → T19
T16 → T20
```

### Phase 5: Seed e servidor

```
T21 → T22 → T26 → T27 → T28
T23 → T24 → T25 → T26
```

---

## Task Breakdown

### Phase 1: Base e ambiente

#### T1: Commitar a migração da base

**What**: Commit local da migração existente do Better Auth, sem alterar o conteúdo (AD-018).
**Where**: `packages/db/src/migrations/20261028174751_flat_lockheed/`
**Depends on**: None
**Reuses**: Migração gerada pela base
**Requirement**: DLV-11

**Done when**:

- [x] `git status` não lista mais a pasta da migração
- [x] `git show --stat HEAD` mostra só essa pasta
- [x] Hooks do lefthook passam sem `--no-verify`

**Tests**: none
**Gate**: build
**Commit**: `chore(db): versiona a migração inicial da base`

---

#### T2: State local do Alchemy no dev

**What**: Usar `Alchemy.localState()` quando o comando é `alchemy dev` e manter `Cloudflare.state()` no deploy (AD-016); fallback wrangler/miniflare se `localState()` não servir, registrado no Handoff.
**Where**: `packages/infra/alchemy.run.ts`
**Depends on**: T1
**Reuses**: `Alchemy.localState` (alchemy 2.0.0-beta.84), `Cloudflare.D1.Database` já configurado
**Requirement**: DLV-04

**Done when**:

- [x] Com `HOME` apontando para uma pasta vazia (sem perfil Alchemy), `bun run dev` sobe o servidor e aplica as migrações no D1 local, sem pedir login
- [x] `bun run deploy` continua usando `Cloudflare.state()` (lido no código, sem rodar deploy)
- [x] `bun run check-types` passa

**Tests**: walk
**Gate**: build
**Commit**: `fix(infra): roda o dev local sem login Cloudflare`

---

#### T3: Corrigir o front no dev

**What**: Fazer o `Cloudflare.Website.Vite` subir no `alchemy dev` sem `ERR_MODULE_NOT_FOUND .../register-dev-mode.js`: diagnosticar no pacote `alchemy` instalado; se for bug da beta.84, trocar de versão (pedir aval antes de instalar) ou rodar o front com `vite dev` pelo script do pacote web.
**Where**: `packages/infra/package.json`
**Depends on**: T2
**Reuses**: `apps/web` `dev:bare` (`vite dev`)
**Requirement**: DLV-04

**Done when**:

- [x] `bun run dev` serve o front e o servidor, e o front abre a tela de login da base no navegador
- [x] Nenhum `ERR_MODULE_NOT_FOUND` no log de `.alchemy/log`
- [x] `bun run check-types` passa

**Tests**: walk
**Gate**: build
**Commit**: `fix(infra): sobe o front no dev local`

---

#### T4: Tarefa `test` no Turborepo

**What**: Declarar a tarefa `test` (dependendo de `^build` não; sem cache de saída) para `turbo run test` funcionar.
**Where**: `turbo.json`
**Depends on**: None
**Reuses**: Tarefas existentes de `turbo.json`
**Requirement**: DLV-09

**Done when**:

- [x] `bunx turbo run test --dry` lista a tarefa sem erro

**Tests**: none
**Gate**: build
**Commit**: `chore: adiciona a tarefa test no turbo`

---

#### T5: Script `test` na raiz

**What**: Adicionar `"test": "turbo run test"` ao `package.json` da raiz.
**Where**: `package.json`
**Depends on**: T4
**Reuses**: Scripts da raiz
**Requirement**: DLV-09

**Done when**:

- [x] `bun run test` roda (zero pacotes com testes ainda) e sai com código 0

**Tests**: none
**Gate**: build
**Commit**: `chore: adiciona bun run test na raiz`

---

### Phase 2: Domínio puro

#### T6: Pacote `packages/tickets`

**What**: Criar o pacote `@nexo-assist/tickets` (`package.json` com `test: bun test` e `check-types`, `tsconfig.json` estendendo `@nexo-assist/config`, `src/index.ts` vazio) e rodar `bun install` para ligar o workspace.
**Where**: `packages/tickets/`
**Depends on**: T5
**Reuses**: `packages/db/package.json` e `packages/api/package.json` como modelo
**Requirement**: TKT-01

**Done when**:

- [x] `bun run check-types` passa com o pacote novo
- [x] Teste `src/boundaries.test.ts` falha se algum arquivo do pacote importar módulo de agent ou de `apps/*`
- [x] Gate: `bun test packages/tickets` passa (1 teste)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tickets): cria o pacote do serviço de chamados`

---

#### T7: Tipos do domínio

**What**: Tipos de `design.md` › Data Models: enums, `Actor`, `TicketErrorCode`, `Result`, `TicketSummary`, `TicketDetail`, `Article`, `Clock`.
**Where**: `packages/tickets/src/types.ts`
**Depends on**: T6
**Reuses**: design.md › Data Models
**Requirement**: TKT-01, TKT-08

**Done when**:

- [x] Tipos exportados por `src/index.ts`
- [x] `bun run check-types` passa

**Tests**: none
**Gate**: build
**Commit**: `feat(tickets): tipos do domínio`

---

#### T8: Horas úteis

**What**: `addBusinessMinutes` e `businessMinutesBetween` em America/Sao_Paulo via `Intl.DateTimeFormat`, seg-sex 08:00-18:00.
**Where**: `packages/tickets/src/rules/business-hours.ts`
**Depends on**: T7
**Reuses**: Nenhum
**Requirement**: TKT-18

**Done when**:

- [x] Testes: Alta sexta 16:00 + 240 min = segunda 10:00; Média segunda 09:00 + 1.800 = quinta 09:00; início fora do horário conta a partir das 08:00 do próximo dia útil; para às 18:00; virada de dia em UTC
- [x] Gate: `bun test packages/tickets` passa
- [x] Contagem: pelo menos 8 testes

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tickets): calcula horas úteis`

---

#### T9: Prazo e vencimento

**What**: `deadlineFor(priority, anchor)` e `overdue(ticket, now)` (Crítica 60 min corridos; Alta 240, Média 1.800, Baixa 3.000 min úteis; atraso em minutos úteis, corridos na Crítica).
**Where**: `packages/tickets/src/rules/sla.ts`
**Depends on**: T8
**Reuses**: `business-hours.ts`
**Requirement**: TKT-17, TKT-19

**Done when**:

- [x] Testes 1:1 com TKT-17 e TKT-19, incluindo Crítica sábado 03:00 vence 04:00 e chamado fechado nunca vencido
- [x] Gate: `bun test packages/tickets` passa
- [x] Contagem: pelo menos 14 testes no pacote

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tickets): prazo por prioridade`

---

#### T10: Validação de chamado

**What**: `validateNewTicket` (campos obrigatórios, listas, título até 120, descrição até 4.000, lista de campos inválidos) e `validateTransfer` (resumo e equipe).
**Where**: `packages/tickets/src/rules/validate.ts`
**Depends on**: T7
**Reuses**: `types.ts`
**Requirement**: TKT-08, TKT-09, TKT-10, TKT-24

**Done when**:

- [x] Testes para cada campo vazio, cada valor fora da lista, os limites 120/121 e 4.000/4.001 e transferência sem resumo
- [x] Gate: `bun test packages/tickets` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tickets): valida chamados e transferências`

---

#### T11: Transições de status

**What**: `isOpen`, `canUpdate`, `canReopen(ticket, now)` (Resolvido há 7 dias ou menos).
**Where**: `packages/tickets/src/rules/transitions.ts`
**Depends on**: T7
**Reuses**: `types.ts`
**Requirement**: TKT-03, TKT-14, TKT-15, TKT-16

**Done when**:

- [x] Testes: os 7 status em `isOpen`; reabrir com 7 dias exatos aceita, 7 dias e 1 minuto recusa; reabrir fora de Resolvido recusa
- [x] Gate: `bun test packages/tickets` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tickets): regras de status e reabertura`

---

#### T12: Ranking da central

**What**: `rankArticles(query, articles)`: normaliza, pontua título ×2, texto ×1, palavras-chave ×3, corta abaixo do mínimo, devolve até 3.
**Where**: `packages/tickets/src/kb.ts`
**Depends on**: T7
**Reuses**: `types.ts`
**Requirement**: TKT-31, TKT-32

**Done when**:

- [x] Testes: "erro 809" traz o artigo de VPN primeiro; acento e caixa não importam; nunca mais de 3; texto sem relação devolve lista vazia
- [x] Gate: `bun test packages/tickets` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tickets): busca na central de ajuda`

---

### Phase 3: Persistência

#### T13: Schema das tabelas novas

**What**: Tabelas `profile`, `ticket`, `ticket_note`, `ticket_event`, `ticket_counter`, `kb_article` com os índices de design.md, exportadas por `schema/index.ts`, e migração gerada por `bun run db:generate`.
**Where**: `packages/db/src/schema/tickets.ts`
**Depends on**: T1
**Reuses**: `packages/db/src/schema/auth.ts` (estilo), `drizzle.config.ts`
**Requirement**: TKT-27

**Done when**:

- [x] Migração nova gerada em `packages/db/src/migrations/` e aplicada pelo dev local (T2)
- [x] Schema de `auth.ts` sem alteração
- [x] `bun run check-types` passa

**Tests**: none
**Gate**: build
**Commit**: `feat(db): tabelas de chamados, perfil e central`

---

#### T14: Banco de teste em memória

**What**: Helper que cria um Drizzle sobre libsql em memória e aplica as migrações de `packages/db/src/migrations`.
**Where**: `packages/tickets/src/testing/db.ts`
**Depends on**: T13
**Reuses**: `@libsql/client` (já em `packages/db`), `drizzle-orm/libsql`
**Requirement**: TKT-27

**Done when**:

- [x] Teste de integração: as 6 tabelas novas existem depois de aplicar as migrações
- [x] Gate: `bun test packages/tickets` passa

**Tests**: integration
**Gate**: full
**Commit**: `test(tickets): banco em memória para testes`

---

#### T15: Repositório

**What**: `TicketRepository`: listagens (por solicitante, todos), busca por número, `insertTicket` em `db.batch` (contador + insert, índice único de idempotência), notas, eventos, status, perfil por usuário, artigos.
**Where**: `packages/tickets/src/repository.ts`
**Depends on**: T14
**Reuses**: `createDb`, schema da T13
**Requirement**: TKT-02, TKT-11, TKT-12, TKT-27

**Done when**:

- [x] Testes de integração: ordem do mais recente; numeração sequencial por tipo a partir do contador; mesma chave devolve o mesmo chamado e não consome número; chaves diferentes em paralelo dão números diferentes
- [x] Gate: `bun run test` passa

**Tests**: integration
**Gate**: full
**Commit**: `feat(tickets): repositório Drizzle`

---

### Phase 4: Serviço

#### T16: Serviço: consultar e detalhar

**What**: `TicketService.list` e `get` com `Actor`: funcionário só vê os próprios, outro ou inexistente dá `NOT_FOUND`; analista lê todos e pode filtrar por `requesterId`; prazo e `vencido` calculados na leitura.
**Where**: `packages/tickets/src/service.ts`
**Depends on**: T15, T9, T11
**Reuses**: `repository.ts`, `sla.ts`, `transitions.ts`
**Requirement**: TKT-01, TKT-02, TKT-03, TKT-04, TKT-05, TKT-06, TKT-07, TKT-19

**Done when**:

- [x] Testes de integração 1:1 com TKT-02 a TKT-07
- [x] `requesterId` vindo de funcionário é ignorado
- [x] Gate: `bun run test` passa

**Tests**: integration
**Gate**: full
**Commit**: `feat(tickets): consulta com privacidade`

---

#### T17: Serviço: criar, complementar e reabrir

**What**: `create` (validação, número, "Aguardando analista", âncora do prazo), `addNote` (nota de funcionário não move a âncora; de analista move), `reopen`.
**Where**: `packages/tickets/src/service.ts`
**Depends on**: T16, T10
**Reuses**: `validate.ts`, `transitions.ts`
**Requirement**: TKT-08, TKT-09, TKT-10, TKT-11, TKT-12, TKT-13, TKT-14, TKT-15, TKT-16, TKT-20, TKT-21

**Done when**:

- [x] Testes de integração 1:1 com cada critério citado, com relógio fixo
- [x] Gate: `bun run test` passa

**Tests**: integration
**Gate**: full
**Commit**: `feat(tickets): criar, complementar e reabrir`

---

#### T18: Serviço: transferir e assumir

**What**: `transfer` (evento com resumo e equipe, status "Aguardando analista", âncora move) e `assume` (status "Em atendimento", evento "Assumido por <nome>").
**Where**: `packages/tickets/src/service.ts`
**Depends on**: T17
**Reuses**: `validate.ts`
**Requirement**: TKT-20, TKT-22, TKT-23, TKT-24

**Done when**:

- [x] Testes de integração 1:1 com TKT-22 a TKT-24 e com o reinício do prazo
- [x] Gate: `bun run test` passa

**Tests**: integration
**Gate**: full
**Commit**: `feat(tickets): transferência e assunção`

---

#### T19: Serviço: buscar artigos

**What**: `searchArticles` lê os artigos do repositório e aplica `rankArticles`.
**Where**: `packages/tickets/src/service.ts`
**Depends on**: T16, T12
**Reuses**: `kb.ts`
**Requirement**: TKT-31, TKT-32

**Done when**:

- [x] Teste de integração: busca no banco com o artigo de VPN e lista vazia sem relevância
- [x] Gate: `bun run test` passa

**Tests**: integration
**Gate**: full
**Commit**: `feat(tickets): busca da central no serviço`

---

#### T20: Falha simulada

**What**: `withSimulatedFailure(service, { rate, extraLatencyMs, random })`: sorteia `SERVICE_UNAVAILABLE` antes de chamar o serviço.
**Where**: `packages/tickets/src/failure.ts`
**Depends on**: T16
**Reuses**: `TicketService`
**Requirement**: TKT-25, TKT-26

**Done when**:

- [x] Testes: taxa 1 falha sempre e nada é gravado; taxa 0 nunca falha; com `random` fixo, falha exatamente quando o sorteio fica abaixo da taxa; 100 criações com taxa 0,3 e retentativa geram 100 chamados
- [x] Gate: `bun run test` passa

**Tests**: integration
**Gate**: full
**Commit**: `feat(tickets): indisponibilidade simulada`

---

### Phase 5: Seed e servidor

#### T21: Dados do seed

**What**: `buildSeed(now)`: funcionários (Ana Souza e mais 4), analistas (N1 e Rafael Lima N2), 5 a 10 artigos (incluindo VPN erro 809 e horário do service desk), chamados do Anexo B com datas relativas a `now`.
**Where**: `packages/tickets/src/seed/build.ts`
**Depends on**: T7
**Reuses**: Anexo B em `.specs/source/desafio-prd.md`
**Requirement**: TKT-28, TKT-29, TKT-30

**Done when**:

- [x] Testes de unidade: contagens mínimas, e-mails `@nexo.com.br`, INC-20311 vencido, INC-20150 resolvido há 4 dias, um resolvido há mais de 7 dias, REQ-10442 aprovado, chamados de outro funcionário
- [x] Gate: `bun test packages/tickets` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tickets): dados de exemplo do Anexo B`

---

#### T22: Aplicar o seed

**What**: `applySeed(db, data)` com upsert por e-mail, número e slug, e contadores ajustados ao maior número.
**Where**: `packages/tickets/src/seed/apply.ts`
**Depends on**: T21, T15
**Reuses**: `repository.ts`
**Requirement**: TKT-30, TKT-33

**Done when**:

- [x] Teste de integração: rodar duas vezes deixa as mesmas contagens; o próximo INC criado é o maior do seed + 1
- [x] Gate: `bun run test` passa

**Tests**: integration
**Gate**: full
**Commit**: `feat(tickets): seed idempotente`

---

#### T23: Variáveis do serviço no schema

**What**: Declarar `TICKETS_FAILURE_RATE` (padrão 0.1), `TICKETS_EXTRA_LATENCY_MS` (padrão 0) e `DEV_SEED_ENABLED` (padrão false) no varlock do servidor.
**Where**: `apps/server/.env.schema`
**Depends on**: None
**Reuses**: varlock da base
**Requirement**: TKT-25, TKT-26

**Done when**:

- [x] `bun run env:generate` gera os tipos sem erro
- [x] Nenhum valor secreto novo

**Tests**: none
**Gate**: build
**Commit**: `feat(server): variáveis do serviço de chamados`

---

#### T24: Variáveis no Worker

**What**: Passar as três variáveis ao Worker em `alchemy.run.ts` (`Config.String` com padrão), para valerem no dev e no deploy.
**Where**: `packages/infra/alchemy.run.ts`
**Depends on**: T23
**Reuses**: `env` do `Cloudflare.Worker("server")`
**Requirement**: TKT-25

**Done when**:

- [x] `bun run check-types` passa
- [x] No dev local, o servidor lê a taxa configurada (walk: com taxa 1, a consulta devolve `SERVICE_UNAVAILABLE`)

**Tests**: walk
**Gate**: build
**Commit**: `feat(infra): repassa as variáveis do serviço ao Worker`

---

#### T25: Fábrica do serviço no servidor

**What**: `createTicketService({ db, env, session })`: monta o `Actor` pelo `profile` da sessão (nunca de parâmetro do modelo), aplica `withSimulatedFailure` e devolve o serviço; recebe `env` por parâmetro (não importa `cloudflare:workers`, para rodar no `bun test`). Adiciona `@nexo-assist/tickets` às dependências do servidor.
**Where**: `apps/server/src/tickets.ts`
**Depends on**: T24, T20
**Reuses**: `services.ts` (`getDb`), `withSimulatedFailure`
**Requirement**: TKT-06, TKT-25

**Done when**:

- [x] Testes de integração: sessão de funcionário vira `Actor` employee; de analista vira analyst com equipe; sem sessão devolve erro de autenticação; taxa lida do `env`
- [x] Gate: `bun run test` passa

**Tests**: integration
**Gate**: full
**Commit**: `feat(server): liga o serviço de chamados à sessão`

---

#### T26: Rota de seed só no dev

**What**: Sub-app Hono `POST /internal/seed` que roda `buildSeed(new Date())` + `applySeed`, montada só quando `DEV_SEED_ENABLED=true`; responde 404 caso contrário.
**Where**: `apps/server/src/dev-seed.ts`
**Depends on**: T25, T22
**Reuses**: `app.route` do Hono em `apps/server/src/index.ts`
**Requirement**: TKT-28, TKT-33

**Done when**:

- [x] Testes de integração com `app.request`: com a flag, 200 e contagens; sem a flag, 404
- [x] Gate: `bun run test` passa

**Tests**: integration
**Gate**: full
**Commit**: `feat(server): rota de seed para o dev local`

---

#### T27: Comando `db:seed`

**What**: Script `db:seed` na raiz que chama `POST /internal/seed` do servidor local e imprime as contagens.
**Where**: `package.json`
**Depends on**: T26
**Reuses**: Script de dev da raiz
**Requirement**: TKT-33, DLV-04

**Done when**:

- [x] Walk: com o dev no ar, `bun run db:seed` duas vezes imprime as mesmas contagens

**Tests**: walk
**Gate**: build
**Commit**: `feat: comando db:seed`

---

#### T28: Teste de fumaça no D1 local

**What**: Teste que, com o dev local no ar, roda o seed e consulta como Ana: vê INC-20311 vencido e não vê chamado de outro funcionário (AD-014).
**Where**: `packages/tickets/test/d1.smoke.test.ts`
**Depends on**: T27
**Reuses**: `bun run db:seed`, rota tRPC ou rota de teste do servidor
**Requirement**: TKT-05, TKT-27, TKT-30

**Done when**:

- [x] `bun test packages/tickets/test/d1.smoke.test.ts` passa com o dev local no ar e é pulado (skip com aviso) quando o servidor não responde
- [x] Inclui o teste `persisted ticket still listed`, usado no walk de C26
- [x] Gate: `bun run test` passa

**Tests**: integration
**Gate**: full
**Commit**: `test(tickets): fumaça contra o D1 local`

---

## Checks

**C1** - O serviço expõe consultar, detalhar, criar, atualizar, reabrir e transferir pela interface `TicketService`, sem importar agent nem `apps/*` (TKT-01, AC 1)
Proof: `bun test packages/tickets/src/boundaries.test.ts -t "no agent imports"`

**C2** - Consultar como Ana devolve só os chamados dela, do mais recente para o mais antigo, com prazo e `vencido` (TKT-02, AC 2)
Proof: `bun test packages/tickets/src/service.test.ts -t "list own tickets newest first"`

**C3** - `onlyOpen` exclui Resolvido, Fechado e Cancelado (TKT-03, AC 3)
Proof: `bun test packages/tickets/src/service.test.ts -t "only open"`

**C4** - Detalhar traz descrição, notas e eventos com autor e hora (TKT-04, AC 4)
Proof: `bun test packages/tickets/src/service.test.ts -t "detail includes notes and events"`

**C5** - Chamado inexistente e chamado de outro funcionário devolvem o mesmo `NOT_FOUND` (TKT-05, AC 5)
Proof: `bun test packages/tickets/src/service.test.ts -t "not found for other requester"`

**C6** - O solicitante vem do `Actor` da sessão; `requesterId` de funcionário é ignorado (TKT-06, AC 6)
Proof: `bun test apps/server/src/tickets.test.ts -t "actor from session"`

**C7** - Analista lê chamados de qualquer funcionário (TKT-07, AC 7)
Proof: `bun test packages/tickets/src/service.test.ts -t "analyst reads all"`

**C8** - Criar sem um campo obrigatório ou com valor fora da lista dá `INVALID_TICKET` com os campos e não grava (TKT-08, AC 1; TKT-09, AC 2)
Proof: `bun test packages/tickets/src/rules/validate.test.ts -t "invalid fields"`

**C9** - Título de 121 caracteres ou descrição de 4.001 dá `INVALID_TICKET` (TKT-10, AC 3)
Proof: `bun test packages/tickets/src/rules/validate.test.ts -t "length limits"`

**C10** - Chamado novo recebe o próximo número do tipo, "Aguardando analista" e prazo (TKT-11, AC 4)
Proof: `bun test packages/tickets/src/service.test.ts -t "create assigns next number"`

**C11** - Mesma chave de idempotência devolve o mesmo chamado, sem outro número (TKT-12, AC 5)
Proof: `bun test packages/tickets/src/repository.test.ts -t "idempotent insert"`

**C12** - Nota em chamado aberto é anexada com autor e hora, sem mudar título, tipo e categoria (TKT-13, AC 6)
Proof: `bun test packages/tickets/src/service.test.ts -t "add note"`

**C13** - Nota em chamado Resolvido, Fechado ou Cancelado dá `TICKET_CLOSED` (TKT-14, AC 7)
Proof: `bun test packages/tickets/src/service.test.ts -t "ticket closed"`

**C14** - Reabrir resolvido há 7 dias ou menos volta para "Aguardando analista" com motivo e prazo novo (TKT-15, AC 8)
Proof: `bun test packages/tickets/src/service.test.ts -t "reopen within 7 days"`

**C15** - Reabrir resolvido há 7 dias e 1 minuto, ou fora de Resolvido, dá `REOPEN_NOT_ALLOWED` (TKT-16, AC 9)
Proof: `bun test packages/tickets/src/rules/transitions.test.ts -t "reopen not allowed"`

**C16** - Prazos: Crítica +1 h corrida, Alta +4 h úteis, Média +3 dias úteis, Baixa +5 dias úteis (TKT-17, AC 1)
Proof: `bun test packages/tickets/src/rules/sla.test.ts -t "deadline by priority"`

**C17** - Alta aberta sexta 16:00 vence segunda 10:00 em America/Sao_Paulo (TKT-18, AC 2)
Proof: `bun test packages/tickets/src/rules/business-hours.test.ts -t "friday 16:00 plus 4 business hours"`

**C18** - Chamado aberto depois do prazo volta com `vencido = true` e o atraso (TKT-19, AC 3)
Proof: `bun test packages/tickets/src/rules/sla.test.ts -t "overdue"`

**C19** - Atualização de analista ou transferência reinicia o prazo (TKT-20, AC 4)
Proof: `bun test packages/tickets/src/service.test.ts -t "team update resets deadline"`

**C20** - Complemento do funcionário mantém o prazo (TKT-21, AC 5)
Proof: `bun test packages/tickets/src/service.test.ts -t "employee note keeps deadline"`

**C21** - Transferir grava "Transferido para um analista" com resumo, equipe e hora, em "Aguardando analista" (TKT-22, AC 1)
Proof: `bun test packages/tickets/src/service.test.ts -t "transfer records event"`

**C22** - Analista assume: "Em atendimento" e "Assumido por Rafael Lima" (TKT-23, AC 2)
Proof: `bun test packages/tickets/src/service.test.ts -t "assume"`

**C23** - Transferência sem resumo dá `INVALID_TRANSFER` (TKT-24, AC 3)
Proof: `bun test packages/tickets/src/rules/validate.test.ts -t "transfer without summary"`

**C24** - Com taxa 1, criar dá `SERVICE_UNAVAILABLE` e nada é gravado (TKT-25, AC 1)
Proof: `bun test packages/tickets/src/failure.test.ts -t "fails before writing"`

**C25** - Com taxa 0, nenhuma chamada falha (TKT-26, AC 2)
Proof: `bun test packages/tickets/src/failure.test.ts -t "rate zero never fails"`

**C26** - Chamados criados continuam no D1 local depois de reiniciar o dev (TKT-27, AC 3)
Proof: walk - criar um chamado pelo smoke, reiniciar `bun run dev` e rodar `bun test packages/tickets/test/d1.smoke.test.ts -t "persisted ticket still listed"` de novo

**C27** - Seed cria ao menos 5 funcionários com Ana Souza (Financeiro, Windows 11) e 2 analistas com Rafael Lima N2 (TKT-28, AC 1)
Proof: `bun test packages/tickets/src/seed/build.test.ts -t "people"`

**C28** - Seed cria de 5 a 10 artigos com VPN erro 809 e horário do service desk (TKT-29, AC 2)
Proof: `bun test packages/tickets/src/seed/build.test.ts -t "articles"`

**C29** - Seed cria INC-20311 vencido, REQ-10442 aprovado, INC-20150 resolvido há 4 dias, um resolvido há mais de 7 dias e chamados de outro funcionário (TKT-30, AC 3)
Proof: `bun test packages/tickets/src/seed/build.test.ts -t "tickets"`

**C30** - Buscar "erro 809" devolve até 3 artigos com o de VPN primeiro (TKT-31, AC 4)
Proof: `bun test packages/tickets/src/kb.test.ts -t "vpn 809 first"`

**C31** - Busca sem relevância devolve lista vazia (TKT-32, AC 5)
Proof: `bun test packages/tickets/src/kb.test.ts -t "no match empty"`

**C32** - Rodar o seed duas vezes não duplica registros (TKT-33, AC 6)
Proof: `bun test packages/tickets/src/seed/apply.test.ts -t "idempotent seed"`

**C33** - Sem perfil Alchemy (HOME vazio), `bun run dev` sobe servidor e front e `bun run db:seed` imprime as contagens (DLV-04, AC 4)
Proof: walk - com HOME apontando para uma pasta vazia, `bun run dev` abre a tela de login em localhost e `bun run db:seed` responde 200 com as contagens

---

## Fora desta feature (anotado)

- **Tool calling do Flash-Lite (AD-017)**: confirmar, no Design do `agent`, que o Flash-Lite escolhido chama ferramentas e devolve saída estruturada pelo model router do Mastra, antes de fixar o ID em `LLM_MODEL`. Precisa da chave do André no `.env`; não roda nesta feature.
- **`dev:server` da raiz**: filtra `-F hono`, mas o pacote se chama `server` e não tem `dev:bare`. Corrigir em `entrega` se o fluxo de dev ainda usar esse script depois de T2 e T3.

---

## Handoff

**Settled mid-build:** T3 - André: rodar o dev sob Node em vez de Bun, sem trocar a versão do alchemy nem instalar nada (feito: `env -u npm_execpath node ./node_modules/alchemy/bin/cli.js dev`).
**Dispatched:** none (sem mecanismo de sub-agente; verificação self-verified, degradada)
**Walked:** 2026-10-28, dev local com HOME vazio em 3100/3101 (portas trocadas só durante o teste e restauradas). T13: as 6 tabelas novas no D1 local. T24: com `TICKETS_FAILURE_RATE=1`, a consulta como Ana devolve `SERVICE_UNAVAILABLE`. T27: `bun run db:seed` duas vezes imprime as mesmas contagens (users 7, profiles 7, articles 7, tickets 9, notes 2, events 18). C33: tela de login 200 e `db:seed` ok. C26: smoke 3 de 3; dev reiniciado e `persisted ticket still listed` passa de novo.
**Deviations:** ver `validation.md` (T16 a T19, T24, T27 corrigida em 4e06e69, T23, biome por arquivo, tsconfig sem testes, rotas só de dev, NO_PROFILE, REQ-10442).

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ------→ T2 ------→ T3
          T4 ------→ T5
Phase 2:  T6 ------→ T7 ------→ T8 ------→ T9
          T7 ------→ T10
          T7 ------→ T11
          T7 ------→ T12
Phase 3:  T13 ------→ T14 ------→ T15
Phase 4:  T16 ------→ T17 ------→ T18
          T16 ------→ T19
          T16 ------→ T20
Phase 5:  T21 ------→ T22 ------→ T26 ------→ T27 ------→ T28
          T23 ------→ T24 ------→ T25 ------→ T26
```

Execution is strictly sequential - there is no intra-phase parallelism. 28 tarefas → cerca de 4 lotes de fases inteiras no Execute.
