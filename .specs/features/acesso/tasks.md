# Acesso Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: inline (Medium) - seção `## Design` abaixo
**Status**: In Progress
**Approved**: 2026-10-28 - user: "sim, faça a aplicação de todas as features, me avise se precisar de algo" (delegado por André em t152u; recomendações adotadas, AD-020)
**Mutations**: 3
**Build**: `bun run check-types; bun biome check apps packages; bun run test`

> Commits locais, um por tarefa, sem `--no-verify` e sem push (AD-010). Dev próprio em portas livres (nunca 3000/3001).

---

## Design

- **Login do seed (AUTH-03 a AUTH-07, AUTH-11, AUTH-13):** plugin do Better Auth em `packages/auth/src/seed-login.ts` com o endpoint `POST /api/auth/sign-in/seed` (`email`, `password`, `rememberMe`). Normaliza o e-mail (`trim` + minúsculas), recusa senha vazia (`INVALID_CREDENTIALS`), procura o usuário com `internalAdapter.findUserByEmail` e responde `EMAIL_NOT_FOUND` quando não há. Cria a sessão com `internalAdapter.createSession(user.id, !rememberMe)` e grava o cookie com `setSessionCookie`, como o `signInEmail` da biblioteca. `emailAndPassword.enabled: false` tira cadastro e login por senha real. Sessão de 30 dias (`session.expiresIn`).
- **Papéis (AUTH-14, AUTH-15):** o contexto do tRPC ganha `role` (`employee`, `analyst` ou `null`), lido da tabela `profile`. `employeeProcedure` e `analystProcedure` respondem `UNAUTHORIZED` sem sessão e `FORBIDDEN` com o papel errado. `me` devolve nome, e-mail, papel, iniciais e `passwordChangedAt`.
- **Rotas do front (AUTH-01, AUTH-14, Edge Cases):** função pura `resolveAccess(role, pathname)` em `apps/web/src/lib/access.ts` decide o redirecionamento; o `beforeLoad` da raiz só a aplica. Rotas: `/login`, `/atendimento` (casca até `chat-funcionario`), `/perfil`, `/console` (casca até `console-analista`) e `/` que redireciona.
- **Telas:** `LoginPage` e `ProfilePage` como componentes com props (sem ler rota nem rede), testados com Testing Library sobre happy-dom; a rota só liga os dados. Fontes do protótipo via `@fontsource` (Newsreader, Schibsted Grotesk, IBM Plex Mono) e tokens (`ink`, `rule`, `cta` #0062C4) no CSS. Tema claro sem alternador (AD-011).

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied. Amostras: `packages/tickets/src/**/*.test.ts`, `apps/server/src/*.test.ts` (bun test, libsql em memória, AD-014).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Plugin de login (`packages/auth`) | integration (libsql em memória + `auth.handler`) | Caminho feliz, papéis, e-mail fora do seed, senha vazia, lembrar, cadastro fechado | `packages/auth/src/*.test.ts` | `bun test packages/auth` |
| Procedimentos do tRPC (`packages/api`) | integration (`createCaller`) | Sem sessão, papel certo, papel errado, `me` | `packages/api/src/*.test.ts` | `bun test packages/api` |
| Regras do front (`apps/web/src/lib`) | unit | Toda combinação de papel e rota | `apps/web/src/lib/*.test.ts` | `bun --cwd apps/web test` |
| Telas (`apps/web/src/features`) | component (Testing Library + happy-dom) | Textos, validação, carregando, erro, olho da senha, confirmações simuladas | `apps/web/src/features/**/*.test.tsx` | `bun --cwd apps/web test` |
| Rotas ligadas, sessão real | walk | Login, redirecionamento por papel, sair | - | dev local em portas livres |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefas só com testes de unidade ou de componente | `bun --cwd apps/web test` |
| Full | Tarefas com testes de integração | `bun run test` |
| Build | Fim de fase, tarefas de config ou walk | `bun run check-types && bun biome check apps packages && bun run test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Servidor

```
T1 → T2
```

### Phase 2: Front

```
T3 → T4 → T5 → T6 → T7 → T8
```

---

## Task Breakdown

### Phase 1: Servidor

#### T1: Login do seed no Better Auth

**What**: Plugin `seedLogin` com `POST /sign-in/seed`, cadastro e senha real desligados, sessão de 30 dias.
**Where**: `packages/auth/src/seed-login.ts`, `packages/auth/src/index.ts`, `packages/auth/package.json`
**Depends on**: None
**Reuses**: `internalAdapter`, `setSessionCookie` (better-auth 1.7.12), `createTestDb` e `buildSeed`/`applySeed` de `@nexo-assist/tickets`
**Requirement**: AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-11, AUTH-13

**Done when**:

- [x] E-mail do seed com qualquer senha não vazia cria sessão, com maiúsculas e espaços
- [x] E-mail fora do seed e senha vazia não criam sessão
- [x] Lembrar dá cookie de 30 dias; sem lembrar, cookie de sessão
- [x] `sign-up/email` não cria usuário

**Tests**: integration
**Gate**: full
**Commit**: `feat(auth): login com e-mail do seed e qualquer senha`

---

#### T2: Papéis no tRPC e `me`

**What**: `role` no contexto, `employeeProcedure`, `analystProcedure` e a query `me`.
**Where**: `packages/api/src/index.ts`, `packages/api/src/context.ts`, `packages/api/src/access.ts`, `packages/api/src/routers/index.ts`, `apps/server/src/context.ts`, `packages/tickets/src/seed/build.ts`, `packages/tickets/src/seed/apply.ts`
**Depends on**: T1
**Reuses**: tabela `profile` (AD-015)
**Requirement**: AUTH-15, AUTH-18, AUTH-19

**Done when**:

- [x] Sem sessão: `UNAUTHORIZED`; funcionário em procedimento de analista: `FORBIDDEN`, e o inverso
- [x] `me` devolve nome, e-mail, papel, iniciais e dias desde a troca de senha

**Tests**: integration
**Gate**: full
**Commit**: `feat(api): papéis de funcionário e analista no tRPC`

---

### Phase 2: Front

#### T3: Testes de componente no web

**What**: happy-dom e Testing Library no `apps/web`, com `test` no package e preload no `bunfig.toml`.
**Where**: `apps/web/package.json`, `apps/web/bunfig.toml`, `apps/web/test/setup.ts`, `apps/web/src/lib/access.ts`
**Depends on**: T2
**Reuses**: bun test
**Requirement**: AUTH-01, AUTH-14

**Done when**:

- [x] `bun --cwd apps/web test` roda testes `.tsx` com DOM
- [x] `resolveAccess` leva quem não tem sessão a `/login?redirect=...`, cada papel à sua área e quem já entrou para fora de `/login`

**Tests**: unit
**Gate**: quick
**Commit**: `test(web): testes de componente e regra de acesso das rotas`

---

#### T4: Tema do protótipo e limpeza da base

**What**: Fontes e tokens do protótipo, tema claro sem alternador, sem cabeçalho, cadastro e dashboard da base.
**Where**: `apps/web/src/index.css`, `apps/web/src/main.tsx`, `apps/web/src/routes/__root.tsx`, `apps/web/src/components/*`, `apps/web/src/routes/_auth/*`
**Depends on**: T3
**Reuses**: `@fontsource`
**Requirement**: AUTH-13

**Done when**:

- [x] Não há `sign-up-form`, `mode-toggle`, `header` nem `dashboard`
- [x] `bun run check-types` passa

**Tests**: none
**Gate**: build
**Commit**: `refactor(web): tema do protótipo e remove o cadastro da base`

---

#### T5: Tela de login

**What**: `LoginPage` fiel a `01-login.png`: vitrine estática, formulário com validação, carregando, erros, olho da senha, "Esqueci minha senha" e modal de privacidade.
**Where**: `apps/web/src/features/login/login-page.tsx`, `apps/web/src/features/login/login-page.test.tsx`
**Depends on**: T4
**Reuses**: `@nexo-assist/ui` (button, input, checkbox, label)
**Requirement**: AUTH-01, AUTH-02, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-12, AUTH-13

**Done when**:

- [x] Textos do protótipo; erro do e-mail fora do seed abaixo do campo; validação sem envio; botão desabilitado com indicador; erro genérico mantendo o digitado

**Tests**: component
**Gate**: quick
**Commit**: `feat(web): tela de login do protótipo`

---

#### T6: Barra lateral e Meu perfil

**What**: `AppSidebar` (iniciais, nome, e-mail, item ativo, Sair) e `ProfilePage` fiel a `06-cliente-meu-perfil.png` com "Redefinir senha" simulado.
**Where**: `apps/web/src/features/shell/app-sidebar.tsx`, `apps/web/src/features/profile/profile-page.tsx` e os testes ao lado
**Depends on**: T5
**Reuses**: `me` (T2)
**Requirement**: AUTH-16, AUTH-17, AUTH-18, AUTH-19, AUTH-20

**Done when**:

- [x] Nome, e-mail, "Gerenciado pela TI", "Alterada há N dias" e a confirmação simulada
- [x] "Sair" chama o encerramento de sessão

**Tests**: component
**Gate**: quick
**Commit**: `feat(web): barra lateral e Meu perfil`

---

#### T7: Rotas ligadas à sessão

**What**: Rotas `/`, `/login`, `/atendimento`, `/perfil` e `/console` com o `beforeLoad` usando `resolveAccess` e `me`; login chama `sign-in/seed`; Sair chama `signOut` e abre `/login`.
**Where**: `apps/web/src/routes/*`, `apps/web/src/lib/auth-client.ts`
**Depends on**: T6
**Reuses**: `authClient`, `trpc`
**Requirement**: AUTH-01, AUTH-03, AUTH-04, AUTH-14, AUTH-16

**Done when**:

- [ ] Walk: Ana entra e abre `/atendimento`; Rafael abre `/console`; Ana em `/console` volta a `/atendimento`; Sair abre `/login`

**Tests**: walk
**Gate**: build
**Commit**: `feat(web): rotas por papel ligadas à sessão`

---

#### T8: Fotos das telas

**What**: `captures/01-login.running.png` e `captures/06-cliente-meu-perfil.running.png` a 1440x900, tiradas do dev local.
**Where**: `.specs/features/acesso/captures/`
**Depends on**: T7
**Reuses**: Playwright
**Requirement**: AUTH-01, AUTH-17

**Done when**:

- [ ] As duas fotos existem no tamanho da captura

**Tests**: walk
**Gate**: build
**Commit**: `docs(acesso): fotos das telas rodando`

---

## Checks

**C1** - Sem sessão, qualquer rota leva a `/login` com a rota pedida em `redirect` (AUTH-01, AC 1)
Proof: `bun --cwd apps/web test src/lib/access.test.ts -t "no session goes to login"`

**C2** - O formulário tem "E-mail corporativo", "Senha", "Esqueci minha senha", "Manter conectado neste computador" e "Entrar" (AUTH-02, AC 2)
Proof: `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "prototype texts"`

**C3** - E-mail do seed de funcionário com senha não vazia cria a sessão com papel `employee` (AUTH-03, AC 3)
Proof: `bun test packages/auth/src/seed-login.test.ts -t "employee signs in"`

**C4** - E-mail do seed de analista cria a sessão com papel `analyst` (AUTH-04, AC 4)
Proof: `bun test packages/auth/src/seed-login.test.ts -t "analyst signs in"`

**C5** - E-mail com maiúsculas e espaços nas pontas entra como o mesmo usuário (AUTH-05, AC 5)
Proof: `bun test packages/auth/src/seed-login.test.ts -t "email is normalized"`

**C6** - E-mail fora do seed responde `EMAIL_NOT_FOUND` sem sessão, e a tela mostra a mensagem abaixo do campo (AUTH-06, AC 6)
Proof: `bun test packages/auth/src/seed-login.test.ts -t "unknown email"`
Proof: `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "unknown email message"`

**C7** - E-mail vazio ou inválido e senha vazia marcam o campo e não enviam (AUTH-07, AC 7)
Proof: `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "invalid fields are not sent"`

**C8** - Enquanto envia, "Entrar" fica desabilitado com indicador (AUTH-08, AC 8)
Proof: `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "pending disables submit"`

**C9** - Erro do servidor mostra "Não foi possível entrar agora. Tente de novo." e mantém o digitado (AUTH-09, AC 9)
Proof: `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "server error keeps input"`

**C10** - O olho alterna mostrar e esconder a senha (AUTH-10, AC 10)
Proof: `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "eye toggles password"`

**C11** - Lembrar dá cookie de 30 dias; sem lembrar, cookie sem `Max-Age` (AUTH-11, AC 11)
Proof: `bun test packages/auth/src/seed-login.test.ts -t "remember me"`

**C12** - "Esqueci minha senha" mostra a confirmação simulada (AUTH-12, AC 12)
Proof: `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "forgot password is simulated"`

**C13** - Não há cadastro na API nem na tela (AUTH-13, AC 13)
Proof: `bun test packages/auth/src/seed-login.test.ts -t "no sign up"`
Proof: `bun --cwd apps/web test src/features/login/login-page.test.tsx -t "no sign up link"`

**C14** - Funcionário em `/console` vai a `/atendimento`, analista em `/atendimento` vai a `/console`, e quem já entrou sai de `/login` (AUTH-14, AC 1)
Proof: `bun --cwd apps/web test src/lib/access.test.ts -t "role areas"`

**C15** - Sem sessão a API responde `UNAUTHORIZED`; papel errado responde `FORBIDDEN` (AUTH-15, AC 2)
Proof: `bun test packages/api/src/access.test.ts -t "role procedures"`

**C16** - "Sair" encerra a sessão e abre `/login` (AUTH-16, AC 3)
Proof: `bun --cwd apps/web test src/features/shell/app-sidebar.test.tsx -t "sign out"`

**C17** - Meu perfil mostra nome, e-mail da sessão e "Gerenciado pela TI", como a captura (AUTH-17, AC 1)
Proof: `bun --cwd apps/web test src/features/profile/profile-page.test.tsx -t "profile data"`

**C18** - A barra lateral mostra iniciais, nome, e-mail e o item ativo (AUTH-18, AC 2)
Proof: `bun --cwd apps/web test src/features/shell/app-sidebar.test.tsx -t "user and active item"`

**C19** - "Alterada há N dias" vem de `passwordChangedAt` (AUTH-19, AC 3)
Proof: `bun test packages/api/src/access.test.ts -t "password age in days"`

**C20** - "Redefinir senha" mostra "Link enviado para <e-mail>. (Simulado: nenhum e-mail sai deste ambiente.)" (AUTH-20, AC 4)
Proof: `bun --cwd apps/web test src/features/profile/profile-page.test.tsx -t "reset password is simulated"`

---

## Handoff

**Settled mid-build:** T2 - o seed não preenchia `profile.passwordChangedAt`, que AUTH-19 lê; o seed passou a gravar a data (Ana 42 dias, como a captura) e T2 ganhou os dois arquivos do seed.
**Dispatched:** none (sem mecanismo de sub-agente; verificação self-verified, degradada)
**Walked:** -
**Deviations:** -

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2
Phase 2:  T3 ------→ T4 ------→ T5 ------→ T6 ------→ T7 ------→ T8
```

Execution is strictly sequential - there is no intra-phase parallelism.
