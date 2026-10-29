# Entrega Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/entrega/design.md`
**Status**: In Progress
**Approved**: 2026-10-28 - user: "sim, siga com a validação do console e depois a entrega" (aprovação delegada, AD-020)
**Approved**: 2026-10-29 - user: "pode começar o deploy, depois arrume tudo para publicarmos no github" (fase 2, deploy autorizado: AD-010)
**Mutations**: 3
**Build**: `bun run check-types; bun biome check .; bun run test; bun test scripts`

> Commits locais, um por tarefa, sem `--no-verify` e sem push. Deploy (DLV-12 a DLV-14) autorizado pelo André em 2026-10-29 (AD-010); `git push` continua pedindo aval à parte.

---

## Test Coverage Matrix

> Guidelines found: nenhum `AGENTS.md` ou guia de testes; padrões das features anteriores e `bun test` (AD-014).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Escolha do modelo no servidor | unit | `LLM_MODEL` definido, ausente e sem chave | `apps/server/src/chat-agent.test.ts` | `bun --cwd apps/server test` |
| Scripts da raiz (setup, dev, varredura) | unit (sistema de arquivos temporário, `fetch` falso) | Cada caminho: cria, mantém, gera segredo; seed depois do servidor; servidor que não sobe | `scripts/*.test.ts` | `bun test scripts` |
| README e `.env.example` | unit (lê o arquivo) | Seções e variáveis obrigatórias | `scripts/docs.test.ts` | `bun test scripts` |
| Limite de uso e seed protegido | unit + integration (libsql em memória, relógio fixo) | 10 por minuto, virada do minuto, teto diário, contagem das chamadas ao modelo, token certo, errado e ausente | `apps/server/src/usage.test.ts`, `apps/server/src/admin-seed.test.ts` | `bun --cwd apps/server test` |
| Config (Biome, Alchemy, schemas) | none | build gate | - | build gate |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Unidade | `bun test scripts` / `bun --cwd apps/server test` |
| Full | Integração | `bun run test && bun test scripts` |
| Build | Fim de fase ou tarefa sem teste | `bun run check-types && bun biome check . && bun run test && bun test scripts` |

---

## Execution Plan

### Phase 1: Rodar e explicar

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Deploy protegido

```
T6 → T7 → T8 → T9 → T10
```

---

## Task Breakdown

#### T1: Modelo por env e chave no Worker

**What**: `chooseUnderstander` usa `LLM_MODEL` (padrão Flash-Lite); `LLM_MODEL` entra no `.env.schema` do servidor; o `pick` da infra e o `alchemy.run.ts` repassam `LLM_MODEL` e `GOOGLE_GENERATIVE_AI_API_KEY` ao Worker.
**Where**: `apps/server/src/chat-agent.ts`
**Depends on**: None
**Reuses**: `createMastraUnderstander({ modelId, apiKey })`
**Requirement**: DLV-05, DLV-15

**Done when**:

- [x] Com chave e `LLM_MODEL`, o servidor monta o Mastra com esse modelo
- [x] Sem `LLM_MODEL`, o modelo é `google/gemini-3.5-flash-lite`
- [x] No dev local, a chave de `apps/server/.env` chega ao Worker (o modelo informado deixa de ser `dev-keywords`)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(server): modelo do agent por LLM_MODEL`

---

#### T2: `.env.example` e `bun run setup`

**What**: `apps/server/.env.example` e `apps/web/.env.example` com todas as variáveis do schema, valores de exemplo e a chave vazia; `scripts/setup.ts` copia cada um para `.env` quando falta e gera o `BETTER_AUTH_SECRET`.
**Where**: `scripts/setup.ts`
**Depends on**: T1
**Reuses**: `.env.schema` de cada app
**Requirement**: DLV-03, DLV-04, DLV-05, DLV-15

**Done when**:

- [x] Cada variável do `.env.schema` do servidor e do web aparece no `.env.example` do app
- [x] `GOOGLE_GENERATIVE_AI_API_KEY` vazia e `LLM_MODEL=google/gemini-3.5-flash-lite`
- [x] `setup` cria o `.env` que falta, mantém o que existe e gera um segredo de 48 caracteres diferente a cada execução
- [x] Nenhum arquivo rastreado tem padrão de chave do Google (`AIza…`)

**Tests**: unit
**Gate**: quick
**Commit**: `feat: .env.example e bun run setup`

---

#### T3: `bun run dev` com seed

**What**: `scripts/dev.ts` sobe o `turbo run dev`, espera o servidor responder e roda o seed uma vez; se o servidor não subir em 120 s, avisa e mostra `bun run db:seed`.
**Where**: `scripts/dev.ts`
**Depends on**: T2
**Reuses**: `scripts/db-seed.ts`
**Requirement**: DLV-04

**Done when**:

- [x] O seed roda depois da primeira resposta do servidor, e só uma vez
- [x] Servidor que não responde: aviso com `bun run db:seed`, sem seed
- [x] `package.json` aponta `dev` para o script

**Tests**: unit
**Gate**: quick
**Commit**: `feat: bun run dev aplica o seed`

---

#### T4: Biome no repositório inteiro

**What**: `biome.json` ignora `.specs`, `.agents`, `.cursor` e `.claude`; o aviso `noNonNullAssertion` de `apps/web/src/env.public.ts` sai; `package.json`, `tsconfig.json` e `turbo.json` ficam no formato do Biome. Supera o AD-019.
**Where**: `biome.json`
**Depends on**: T3
**Reuses**: -
**Requirement**: DLV-07, DLV-08

**Done when**:

- [x] `bun biome check .` sai com 0 erros e 0 avisos
- [x] `bun run check` não muda nenhum arquivo

**Tests**: none
**Gate**: build
**Commit**: `chore(biome): lint do repositório inteiro`

---

#### T5: Avaliação ao vivo do agent

**What**: `EVAL_PAUSE_MS` dá uma pausa entre conversas para caber no limite por minuto; rodar `--live` com Flash-Lite e gravar o resultado em `packages/agent/eval/RESULT.md` (data, modelo, acerto por regra, erros, tokens e custo).
**Where**: `packages/agent/eval/cli.ts`
**Depends on**: T4
**Reuses**: `runEval`, `estimateCost`
**Requirement**: DLV-02, DLV-10

**Done when**:

- [x] A avaliação roteirizada continua passando (`eval.test.ts`)
- [x] `RESULT.md` traz o resultado ao vivo e o custo médio por conversa

**Tests**: unit
**Gate**: quick
**Commit**: `test(agent): resultado da avaliação ao vivo`

---

#### T6: README do projeto

**What**: README com "Como rodar", "Arquitetura", "Como o agent decide", "Como garanti a qualidade das decisões", "Trade-offs" e "O que faria com mais tempo"; escolha do modelo e custo por conversa; a chave do AI Studio, os limites do free tier e o uso dos dados; o resultado de `RESULT.md`.
**Where**: `README.md`
**Depends on**: T5
**Reuses**: decisões do `STATE.md`, `RESULT.md`
**Requirement**: DLV-01, DLV-02, DLV-06, DLV-10, DLV-15

**Done when**:

- [x] As seis seções existem com esses títulos
- [x] Modelo, custo por conversa, chave do AI Studio, free tier e dados fictícios explicados
- [x] O teste do README passa

**Tests**: unit
**Gate**: build
**Commit**: `docs: readme do Nexo Assist com como rodar, decisões e avaliação`

---

#### T7: Limite por usuário e teto diário do modelo

**What**: tabela `usage_counter` (chave, contagem, expira em) com migração; `createUsageLimiter` em `apps/server/src/usage.ts` conta mensagens por usuário por minuto (`RATE_LIMIT_PER_MINUTE`, padrão 10) e chamadas ao modelo por dia UTC (`LLM_DAILY_LIMIT`, padrão 400); `/chat/send` responde 429 `{ error: "rate_limit", message: "Limite de uso atingido. Tente mais tarde." }` quando um dos dois estoura; o entendedor conta cada chamada ao modelo.
**Where**: `apps/server/src/usage.ts`
**Depends on**: T6
**Reuses**: `createTestDb`, padrão de `admit` em `chat.ts`
**Requirement**: DLV-13

**Done when**:

- [x] A 11ª mensagem do mesmo usuário no mesmo minuto recebe 429 com "Limite de uso atingido. Tente mais tarde."; outro usuário e o minuto seguinte passam
- [x] Com o teto diário de chamadas ao modelo atingido, `/chat/send` recebe o mesmo 429; o dia seguinte passa
- [x] Cada chamada a `understand` e `judge` soma 1 no contador do dia
- [x] Os dois limites vêm do env, com os padrões 10 e 400

**Tests**: integration
**Gate**: quick
**Commit**: `feat(server): limite de mensagens por minuto e teto diário do modelo`

---

#### T8: Seed protegido por token no servidor publicado

**What**: `POST /admin/seed` só existe com `SEED_TOKEN` definido e exige `Authorization: Bearer <SEED_TOKEN>`; `bun run db:seed` usa a rota protegida quando `SEED_TOKEN` está no ambiente.
**Where**: `apps/server/src/admin-seed.ts`
**Depends on**: T7
**Reuses**: `applySeed`, `buildSeed`
**Requirement**: DLV-12

**Done when**:

- [x] Sem `SEED_TOKEN` no servidor, `/admin/seed` dá 404
- [x] Token ausente ou errado dá 401 e não grava nada; token certo aplica o seed e devolve as contagens
- [x] `db:seed` com `SERVER_URL` e `SEED_TOKEN` chama `/admin/seed` com o token

**Tests**: integration
**Gate**: quick
**Commit**: `feat(server): seed do deploy protegido por token`

---

#### T9: Configuração do deploy e publicação

**What**: `alchemy.run.ts` e o `.env.schema` da infra repassam `RATE_LIMIT_PER_MINUTE`, `LLM_DAILY_LIMIT` e `SEED_TOKEN` (secret); a chave do Gemini e o `BETTER_AUTH_SECRET` vão como secret; `bun run deploy` publica, o seed roda pela rota protegida e o link entra no README.
**Where**: `packages/infra/alchemy.run.ts`
**Depends on**: T8
**Reuses**: `Config.Redacted` da base
**Requirement**: DLV-12

**Done when**:

- [ ] `bun run deploy` publica o web e o servidor na conta Cloudflare do André
- [ ] Login da Ana no link público abre o chat e o agent responde com o Gemini
- [ ] Chave, segredo do auth e token do seed aparecem como secret no Worker, não como texto

**Tests**: none
**Gate**: build
**Commit**: `feat(infra): deploy com limites e seed protegido`

---

#### T10: README do deploy

**What**: seção "Deploy" no README: link público, como foi publicado (Alchemy, dois Workers, D1), como as chaves ficam (secrets do Worker, state cifrado com `ALCHEMY_PASSWORD`), o limite por usuário, o teto diário e o seed protegido.
**Where**: `README.md`
**Depends on**: T9
**Reuses**: -
**Requirement**: DLV-12, DLV-14

**Done when**:

- [ ] O README tem a seção "Deploy" com o link público
- [ ] Explica secrets, limite por usuário, teto diário e seed por token
- [ ] O teste do README passa

**Tests**: unit
**Gate**: build
**Commit**: `docs: deploy publicado e proteção das chaves`

---

## Checks

**C1** - README tem as seis seções do PDF (DLV-01)
Proof: `bun test scripts/docs.test.ts -t "README has the six sections"`

**C2** - README explica o modelo e o custo por conversa (DLV-02)
Proof: `bun test scripts/docs.test.ts -t "README explains the model and the cost per conversation"`

**C3** - `.env.example` de cada app tem todas as variáveis e nenhuma chave (DLV-03)
Proof: `bun test scripts/docs.test.ts -t "env example covers every schema variable"`

**C4** - Clone limpo sobe com migrações e seed em três comandos (DLV-04)
Proof: `walk - clone limpo em diretório temporário: bun install, bun run setup, bun run dev; login da Ana com o seed`

**C5** - Nenhuma chave no git nem no bundle do navegador (DLV-05)
Proof: `bun test scripts/secrets.test.ts`

**C6** - Interface, agent e serviço de chamados em pacotes separados, justificados no README (DLV-06)
Proof: `bun test scripts/docs.test.ts -t "README justifies the module split"`

**C7** - `bun run check-types` passa (DLV-07)
Proof: `bun run check-types`

**C8** - `bun biome check .` sem erros (DLV-08)
Proof: `bun biome check .`

**C9** - Testes de prazo, prioridade, privacidade, duplicidade, reabertura, estados e limite rodam por `bun test` (DLV-09)
Proof: `bun run test`

**C10** - README explica a avaliação e mostra o último resultado (DLV-10)
Proof: `bun test scripts/docs.test.ts -t "README shows the last eval result"`

**C11** - Histórico com um commit por tarefa e mensagens que dizem o que e por quê (DLV-11)
Proof: `walk - git log da entrega: um commit por tarefa, Conventional Commits validados por check_commit.py`

**C12** - Deploy publicado com a chave como secret (DLV-12)
Proof: `walk - bun run deploy; seed pela rota protegida; login da Ana no link público e resposta do agent; secrets listados no Worker`

**C13** - Limite de 10 mensagens por minuto e teto diário (DLV-13)
Proof: `bun --cwd apps/server test src/usage.test.ts`

**C14** - README explica o deploy e a proteção das chaves (DLV-14)
Proof: `bun test scripts/docs.test.ts -t "README explains the deploy and how keys are protected"`

**C17** - O seed do deploy só roda com o token (DLV-12)
Proof: `bun --cwd apps/server test src/admin-seed.test.ts`

**C18** - `db:seed` usa a rota protegida com `SERVER_URL` e `SEED_TOKEN` (DLV-12)
Proof: `bun test scripts/db-seed.test.ts`

**C15** - `.env.example` com a chave vazia e `LLM_MODEL`; README explica a chave, o free tier e o uso dos dados (DLV-15)
Proof: `bun test scripts/docs.test.ts -t "README explains the AI Studio key and the free tier"`

**C16** - O servidor usa o modelo de `LLM_MODEL` (DLV-15)
Proof: `bun --cwd apps/server test src/chat-agent.test.ts -t "the Mastra understander is built with LLM_MODEL and the key"`

---

## Handoff

**Settled mid-build:** none
**Dispatched:** Verifier em 2026-10-28 sobre HEAD 295dd0a (sem capturas, sem screens sub-agent); returned, 9 achados fechados em d5f4fc0
**Walked:** 2026-10-28. C4: `git clone` do HEAD 4a95c4c para um diretório temporário, `bun install` (592 pacotes), `bun run setup` (criou `apps/server/.env` com segredo de 48 caracteres e `apps/web/.env`), `bun run dev` sem `ALCHEMY_PASSWORD` nem token Cloudflare: "dev: seed ok {users:7, …, tickets:9}", web em :3001; login de `ana.souza@nexo.com.br` com senha "x" abre o chat com "Olá, Ana! Sou o Nexo Assist…". C11: os 7 commits da entrega (b52f7f7..4a95c4c) passam no `check_commit.py`, um por tarefa mais o de design. C12 a C14: sem deploy nesta rodada (AD-010). Achado da caminhada da T1: o Google devolve 404 a `gemini-2.5-flash-lite` para chaves novas; padrão trocado para `gemini-3.5-flash-lite` (AD-023).
