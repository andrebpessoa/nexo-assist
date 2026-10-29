# Entrega Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/entrega/design.md`
**Status**: Approved
**Approved**: 2026-10-28 - user: "sim, siga com a validação do console e depois a entrega" (aprovação delegada, AD-020)
**Mutations**: 3
**Build**: `bun run check-types; bun biome check .; bun run test; bun test scripts`

> Commits locais, um por tarefa, sem `--no-verify` e sem push. Deploy (DLV-12 a DLV-14) só com o aval do André (AD-010).

---

## Test Coverage Matrix

> Guidelines found: nenhum `AGENTS.md` ou guia de testes; padrões das features anteriores e `bun test` (AD-014).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Escolha do modelo no servidor | unit | `LLM_MODEL` definido, ausente e sem chave | `apps/server/src/chat-agent.test.ts` | `bun --cwd apps/server test` |
| Scripts da raiz (setup, dev, varredura) | unit (sistema de arquivos temporário, `fetch` falso) | Cada caminho: cria, mantém, gera segredo; seed depois do servidor; servidor que não sobe | `scripts/*.test.ts` | `bun test scripts` |
| README e `.env.example` | unit (lê o arquivo) | Seções e variáveis obrigatórias | `scripts/docs.test.ts` | `bun test scripts` |
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

---

## Task Breakdown

#### T1: Modelo por env e chave no Worker

**What**: `chooseUnderstander` usa `LLM_MODEL` (padrão Flash-Lite); `LLM_MODEL` entra no `.env.schema` do servidor; o `pick` da infra e o `alchemy.run.ts` repassam `LLM_MODEL` e `GOOGLE_GENERATIVE_AI_API_KEY` ao Worker.
**Where**: `apps/server/src/chat-agent.ts`
**Depends on**: None
**Reuses**: `createMastraUnderstander({ modelId, apiKey })`
**Requirement**: DLV-05, DLV-15

**Done when**:

- [ ] Com chave e `LLM_MODEL`, o servidor monta o Mastra com esse modelo
- [ ] Sem `LLM_MODEL`, o modelo é `google/gemini-2.5-flash-lite`
- [ ] No dev local, a chave de `apps/server/.env` chega ao Worker (o modelo informado deixa de ser `dev-keywords`)

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

- [ ] Cada variável do `.env.schema` do servidor e do web aparece no `.env.example` do app
- [ ] `GOOGLE_GENERATIVE_AI_API_KEY` vazia e `LLM_MODEL=google/gemini-2.5-flash-lite`
- [ ] `setup` cria o `.env` que falta, mantém o que existe e gera um segredo de 48 caracteres diferente a cada execução
- [ ] Nenhum arquivo rastreado tem padrão de chave do Google (`AIza…`)

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

- [ ] O seed roda depois da primeira resposta do servidor, e só uma vez
- [ ] Servidor que não responde: aviso com `bun run db:seed`, sem seed
- [ ] `package.json` aponta `dev` para o script

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

- [ ] `bun biome check .` sai com 0 erros e 0 avisos
- [ ] `bun run check` não muda nenhum arquivo

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

- [ ] A avaliação roteirizada continua passando (`eval.test.ts`)
- [ ] `RESULT.md` traz o resultado ao vivo e o custo médio por conversa

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

- [ ] As seis seções existem com esses títulos
- [ ] Modelo, custo por conversa, chave do AI Studio, free tier e dados fictícios explicados
- [ ] O teste do README passa

**Tests**: unit
**Gate**: build
**Commit**: `docs: README do Nexo Assist`

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
Proof: `bun test scripts/secrets.test.ts -t "no Google key in tracked files"`

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
Proof: `walk - não se aplica nesta rodada: o André não autorizou o deploy (AD-010)`

**C13** - Limite de 10 mensagens por minuto e teto diário (DLV-13)
Proof: `walk - não se aplica nesta rodada: só com deploy (AD-010)`

**C14** - README explica o deploy e a proteção das chaves (DLV-14)
Proof: `walk - não se aplica nesta rodada: só com deploy (AD-010)`

**C15** - `.env.example` com a chave vazia e `LLM_MODEL`; README explica a chave, o free tier e o uso dos dados (DLV-15)
Proof: `bun test scripts/docs.test.ts -t "README explains the AI Studio key and the free tier"`

**C16** - O servidor usa o modelo de `LLM_MODEL` (DLV-15)
Proof: `bun --cwd apps/server test src/chat-agent.test.ts -t "LLM_MODEL picks the model"`

---

## Handoff

**Settled mid-build:** none
**Dispatched:** none
**Walked:** pending
