# Transparência Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/transparencia/design.md`
**Status**: In Progress
**Approved**: 2026-10-28 - user: "sim, faça a aplicação de todas as features, me avise se precisar de algo" (delegado por André em t152u; recomendações adotadas, AD-020)
**Mutations**: 3
**Build**: `bun run check-types; bun biome check apps packages; bun run test`

> Commits locais, um por tarefa, sem `--no-verify` e sem push (AD-010).

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Passos no motor | integration (seed + entendimento roteirizado) | Cada passo e falha | `packages/agent/src/engine.steps.test.ts` | `bun test packages/agent` |
| Apresentador e log | unit | Catálogo, painel, totais | `packages/agent/src/transparency.test.ts` | `bun test packages/agent` |
| Componentes | component (happy-dom) | Linha, painel, Esc | `apps/web/src/features/decision/*.test.tsx` | `bun --cwd apps/web test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Unidade | `bun test packages/agent` |
| Full | Integração | `bun run test` |
| Build | Fim de fase | `bun run check-types && bun biome check apps packages && bun run test` |

---

## Execution Plan

```
T1 → T2 → T3
```

---

## Task Breakdown

#### T1: Passos registrados pelo motor

**What**: Cada ferramenta, chamada ao modelo e passo de regra vira um `ToolCall` com alvo, pedido, resultado, duração, tentativas e erro; registro com latência, modelo, gatilho da transferência, resposta incompleta, eventos de progresso e log JSON.
**Where**: `packages/agent/src/types.ts`, `packages/agent/src/engine.ts`, `packages/agent/src/engine.steps.test.ts`
**Depends on**: None
**Reuses**: `agentHarness`
**Requirement**: TRN-03, TRN-04, TRN-11, TRN-12, TRN-16, TRN-17

**Done when**:

- [x] Passos de regra (`regra.prioridade`, `regra.sla`, `rascunho.montar`, `regra.prazo`) gravados quando acontecem
- [x] Falha depois das tentativas grava `ok: false` e o erro
- [x] `onStep` emite início e fim de cada passo
- [x] Transferência grava gatilho e resumo; falha do modelo grava `incomplete`
- [x] Log JSON por decisão sem texto de mensagem

**Tests**: integration
**Gate**: quick
**Commit**: `feat(agent): passos da decisão com pedido, resultado e tempo`

---

#### T2: Apresentador da decisão

**What**: Catálogo de rótulos, linha de ações, gerúndio, painel por público, rótulo de ajuda e totais da conversa.
**Where**: `packages/agent/src/transparency.ts`, `packages/agent/src/transparency.test.ts`
**Depends on**: T1
**Reuses**: `DecisionRecord`
**Requirement**: TRN-02, TRN-03, TRN-05, TRN-07, TRN-08, TRN-09, TRN-10, TRN-12, TRN-13, TRN-14, TRN-15, TRN-18

**Done when**:

- [x] Rótulo só de passo gravado, na ordem, sem repetir
- [x] Painel com entendido, feito, confiança com faixa, porquê em até 3 frases, passos e transferência
- [x] Funcionário vê só o tempo; analista vê modelo, tokens e custo
- [x] Rótulo de ajuda e totais da conversa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(agent): rótulos e painel da decisão`

---

#### T3: Linha de ações e painel na web

**What**: Componentes `ActionLine` e `DecisionPanel` usados pelo chat e pelo console.
**Where**: `apps/web/src/features/decision/*`, `apps/web/package.json`
**Depends on**: T2
**Reuses**: `transparency.ts`, estilos do protótipo
**Requirement**: TRN-01, TRN-04, TRN-06

**Done when**:

- [ ] "Nexo Assist" e os rótulos com ✓/✕ acima da resposta
- [ ] Gerúndio enquanto o passo roda
- [ ] Clique abre o painel; X e Esc fecham

**Tests**: component
**Gate**: full
**Commit**: `feat(web): linha de ações e painel da decisão`

---

## Checks

**C1** - Acima da resposta: "Nexo Assist" e as ações na ordem, com ✓ (TRN-01)
Proof: `bun --cwd apps/web test src/features/decision/action-line.test.tsx -t "action line above reply"`

**C2** - Cada rótulo sai de um passo gravado, pelo catálogo fixo (TRN-02)
Proof: `bun test packages/agent/src/transparency.test.ts -t "labels only from executed steps"`

**C3** - Ferramenta que falhou: ✕ e "não conseguiu <ação>" (TRN-03)
Proof: `bun test packages/agent/src/transparency.test.ts -t "service down shows failed label"`

**C4** - Enquanto trabalha, cada ação em gerúndio assim que começa (TRN-04)
Proof: `bun --cwd apps/web test src/features/decision/action-line.test.tsx -t "progress in gerund"`

**C5** - Sem ferramenta: "respondeu sem consultar sistemas" (TRN-05)
Proof: `bun test packages/agent/src/transparency.test.ts -t "no tools label"`

**C6** - Clique abre "Por que o Nexo fez isso"; X e Esc fecham (TRN-06)
Proof: `bun --cwd apps/web test src/features/decision/decision-panel.test.tsx -t "panel opens and closes"`

**C7** - "O que entendi": intenção em português e dados extraídos (TRN-07)
Proof: `bun test packages/agent/src/transparency.test.ts -t "panel understood"`

**C8** - "O que fiz": ação e regra do Anexo A (TRN-08)
Proof: `bun test packages/agent/src/transparency.test.ts -t "panel did"`

**C9** - Confiança em % com faixa alta, média ou baixa (TRN-09)
Proof: `bun test packages/agent/src/transparency.test.ts -t "confidence band"`

**C10** - "Por quê" em até 3 frases (TRN-10)
Proof: `bun test packages/agent/src/transparency.test.ts -t "why in three sentences"`

**C11** - Passos com pedido, resultado, duração, tentativas e erro (TRN-11)
Proof: `bun test packages/agent/src/engine.steps.test.ts -t "step details"`

**C12** - Transferência: gatilho e resumo enviado (TRN-12)
Proof: `bun test packages/agent/src/transparency.test.ts -t "transfer panel"`

**C13** - Painel só com dados devolvidos ao dono da conversa (TRN-13)
Proof: `bun test packages/agent/src/transparency.test.ts -t "employee panel"`

**C14** - Painel do analista com modelo, tokens, custo e tempo (TRN-14)
Proof: `bun test packages/agent/src/transparency.test.ts -t "analyst panel"`

**C15** - "Agent pediu ajuda · confiança NN%" da decisão que transferiu (TRN-15)
Proof: `bun test packages/agent/src/transparency.test.ts -t "help label"`

**C16** - Registro salvo com a mensagem e disponível depois de reiniciar (TRN-16)
Proof: `bun test packages/agent/src/engine.steps.test.ts -t "decision survives restart"`

**C17** - Log JSON por decisão, sem texto de mensagem (TRN-17)
Proof: `bun test packages/agent/src/engine.steps.test.ts -t "decision log"`

**C18** - Total de tokens e custo da conversa (TRN-18)
Proof: `bun test packages/agent/src/transparency.test.ts -t "conversation totals"`

---

## Handoff

**Settled mid-build:** -
**Dispatched:** none (sem mecanismo de sub-agente; verificação self-verified, degradada)
**Walked:** -
**Deviations:** -
