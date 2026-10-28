# Agent Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/agent/design.md`
**Status**: In Progress
**Approved**: 2026-10-28 - user: "sim, faça a aplicação de todas as features, me avise se precisar de algo" (delegado por André em t152u; recomendações adotadas, AD-020)
**Mutations**: 3
**Build**: `bun run check-types; bun biome check apps packages; bun run test`

> Commits locais, um por tarefa, sem `--no-verify` e sem push (AD-010). Nenhum teste chama o modelo real (D-03).

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regras (`packages/agent/src/rules`) | unit | Toda linha do Anexo A | `packages/agent/src/rules/*.test.ts` | `bun test packages/agent` |
| Novas tentativas, janela | unit (relógio e sono falsos) | Esperas, cortes, limites | `packages/agent/src/*.test.ts` | `bun test packages/agent` |
| Store e motor | integration (libsql em memória + seed + entendimento roteirizado) | Cada critério do spec | `packages/agent/src/engine.*.test.ts` | `bun test packages/agent` |
| Adaptador Mastra | unit (modelo falso de `ai/test`) | Saída estruturada | `packages/agent/src/understand-mastra.test.ts` | `bun test packages/agent` |
| Avaliação | integration | ≥ 20 conversas, ≥ 90% | `packages/agent/eval/*.test.ts` | `bun --cwd packages/agent run eval` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Unidade | `bun test packages/agent` |
| Full | Integração | `bun run test` |
| Build | Fim de fase | `bun run check-types && bun biome check apps packages && bun run test` |

---

## Execution Plan

### Phase 1: Base

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Motor

```
T5 → T6 → T7 → T8 → T9 → T10 → T11
```

---

## Task Breakdown

#### T1: Regras de prioridade, contato, duplicidade e confirmação

**What**: Funções puras do Anexo A.
**Where**: `packages/agent/package.json`, `packages/agent/tsconfig.json`, `packages/agent/src/rules/*.ts`
**Depends on**: None
**Reuses**: `addBusinessMinutes`, `REOPEN_WINDOW_MS`, tipos de `@nexo-assist/tickets`
**Requirement**: AGT-25, AGT-26

**Done when**:

- [x] Prioridade por impacto e urgência nos 4 níveis
- [x] "Não sei" vira "Só eu" com a nota
- [x] Equipe e prazo de contato por prioridade
- [x] Confirmação por texto e ação de duplicidade com a janela de 7 dias

**Tests**: unit
**Gate**: quick
**Commit**: `feat(agent): regras de prioridade e duplicidade`

---

#### T2: Novas tentativas e limites do modelo

**What**: `withTicketRetry` e `withModelLimits`.
**Where**: `packages/agent/src/retry.ts`
**Depends on**: T1
**Reuses**: -
**Requirement**: AGT-43

**Done when**:

- [x] 3 novas tentativas com 500, 1000 e 2000 ms
- [x] 429 espera e tenta uma vez
- [x] corte em 30 s

**Tests**: unit
**Gate**: quick
**Commit**: `feat(agent): novas tentativas no serviço e no modelo`

---

#### T3: Tabelas e store da conversa

**What**: Schema `conversation` e `conversation_message`, migração e `ConversationStore`.
**Where**: `packages/db/src/schema/agent.ts`, `packages/db/src/schema/index.ts`, `packages/db/src/migrations/*`, `packages/agent/src/store.ts`
**Depends on**: T2
**Reuses**: `createTestDb`
**Requirement**: AGT-07

**Done when**:

- [x] Mensagens, estado e rascunho gravados e lidos
- [x] Migração gerada

**Tests**: integration
**Gate**: full
**Commit**: `feat(agent): conversa persistida no banco`

---

#### T4: Janela de contexto e custo

**What**: `buildWindow` e `estimateCost`.
**Where**: `packages/agent/src/window.ts`
**Depends on**: T3
**Reuses**: -
**Requirement**: AGT-46

**Done when**:

- [x] Últimas 20 mais resumo
- [x] Custo estimado por uso

**Tests**: unit
**Gate**: quick
**Commit**: `feat(agent): janela de 20 mensagens e custo`

---

#### T5: Entendimento

**What**: Schema, `Understander`, roteirizado e adaptador Mastra.
**Where**: `packages/agent/src/understand*.ts`, `packages/agent/package.json`
**Depends on**: T4
**Reuses**: `@mastra/core`, `ai/test`
**Requirement**: AGT-01

**Done when**:

- [x] Adaptador Mastra devolve entendimento válido com modelo falso
- [x] Roteirizado devolve a fila

**Tests**: unit
**Gate**: quick
**Commit**: `feat(agent): entendimento estruturado com Mastra`

---

#### T6: Motor: base, registro de decisão e escopo

**What**: `createAgent` com saudação, manipulação, fora de escopo e perguntas.
**Where**: `packages/agent/src/engine.ts`, `packages/agent/src/copy.ts`
**Depends on**: T5
**Reuses**: -
**Requirement**: AGT-02, AGT-03, AGT-04, AGT-05, AGT-06, AGT-42

**Done when**:

- [x] Registro de decisão em cada resposta
- [x] Textos só de modelos e ferramentas

**Tests**: integration
**Gate**: full
**Commit**: `feat(agent): motor com registro de decisão`

---

#### T7: Motor: central de ajuda e consulta

**What**: Dúvida pela central e consulta de chamados.
**Where**: `packages/agent/src/engine.ts`, `packages/agent/src/copy.ts`
**Depends on**: T6
**Reuses**: `searchArticles`, `list`, `get`
**Requirement**: AGT-08, AGT-09, AGT-10, AGT-11, AGT-12, AGT-13, AGT-14, AGT-15, AGT-16, AGT-17, AGT-18

**Done when**:

- [x] Artigo serve, não serve, não existe
- [x] Lista, card, vencido, não encontrado, outra pessoa

**Tests**: integration
**Gate**: full
**Commit**: `feat(agent): central de ajuda e consulta de chamados`

---

#### T8: Motor: abrir chamado

**What**: Rascunho, perguntas, prioridade, Confirmar, Editar e Cancelar.
**Where**: `packages/agent/src/engine.ts`, `packages/agent/src/copy.ts`
**Depends on**: T7
**Reuses**: `create`, `reopen`
**Requirement**: AGT-19, AGT-20, AGT-21, AGT-22, AGT-23, AGT-24, AGT-27, AGT-28, AGT-29, AGT-30, AGT-31, AGT-32

**Done when**:

- [x] Duplicidade antes do rascunho
- [x] Nada sem Confirmar; uma vez só

**Tests**: integration
**Gate**: full
**Commit**: `feat(agent): abrir chamado com rascunho e confirmação`

---

#### T9: Motor: complementar e transferir

**What**: Rascunho de atualização, transferência e estados.
**Where**: `packages/agent/src/engine.ts`, `packages/agent/src/copy.ts`
**Depends on**: T8
**Reuses**: `addNote`, `transfer`
**Requirement**: AGT-33, AGT-34, AGT-35, AGT-36, AGT-37, AGT-38, AGT-39, AGT-40, AGT-41

**Done when**:

- [x] Quatro gatilhos de transferência com resumo
- [x] Silêncio com analista e retomada

**Tests**: integration
**Gate**: full
**Commit**: `feat(agent): complementar e transferir para analista`

---

#### T10: Motor: falhas

**What**: Serviço fora, modelo falho, 429.
**Where**: `packages/agent/src/engine.ts`, `packages/agent/src/copy.ts`
**Depends on**: T9
**Reuses**: `withTicketRetry`, `withModelLimits`
**Requirement**: AGT-44, AGT-47

**Done when**:

- [x] Rascunho mantido e Tentar de novo cria um só
- [x] Mensagem fixa no 429

**Tests**: integration
**Gate**: full
**Commit**: `feat(agent): falhas do serviço e do modelo`

---

#### T11: Conversas de avaliação

**What**: 22 conversas e `bun run eval`.
**Where**: `packages/agent/eval/*`, `packages/agent/package.json`
**Depends on**: T10
**Reuses**: `understand-scripted`
**Requirement**: AGT-45

**Done when**:

- [ ] 22 conversas cobrindo cada regra
- [ ] Comando imprime acerto por regra e total ≥ 90%

**Tests**: integration
**Gate**: full
**Commit**: `test(agent): conversas de avaliação das decisões`

---

## Checks

**C1** - Cada mensagem recebe intenção (7 valores) e confiança 0-100 pelo adaptador Mastra (AGT-01)
Proof: `bun test packages/agent/src/understand-mastra.test.ts -t "mastra understander returns a valid understanding"`

**C2** - Cada resposta grava um registro de decisão com intenção, dados, ação, confiança, justificativa, regra e ferramentas (AGT-02)
Proof: `bun test packages/agent/src/engine.basics.test.ts -t "decision record"`

**C3** - O texto ao funcionário só traz fatos do retorno das ferramentas, nunca texto do modelo (AGT-03)
Proof: `bun test packages/agent/src/engine.basics.test.ts -t "facts only from tools"`

**C4** - Falta de dado gera uma pergunta por vez, com opções quando a lista é fechada (AGT-04)
Proof: `bun test packages/agent/src/engine.basics.test.ts -t "one question at a time"`

**C5** - Saudação ou mensagem vaga: resposta curta, pergunta como ajudar, sem ferramentas (AGT-05)
Proof: `bun test packages/agent/src/engine.basics.test.ts -t "small talk"`

**C6** - Pedido para ignorar regras ou agir por outra pessoa segue o Anexo A (AGT-06)
Proof: `bun test packages/agent/src/engine.basics.test.ts -t "manipulation"`

**C7** - A conversa e o rascunho continuam com um motor novo sobre o mesmo banco (AGT-07)
Proof: `bun test packages/agent/src/store.test.ts -t "conversation survives a new agent"`

**C8** - Dúvida e abertura buscam na central antes de responder ou montar rascunho (AGT-08)
Proof: `bun test packages/agent/src/engine.kb.test.ts -t "searches help center first"`

**C9** - Artigo que serve: passos, título citado, nenhum chamado (AGT-09)
Proof: `bun test packages/agent/src/engine.kb.test.ts -t "article answers"`

**C10** - Artigo cuja condição não vale: diz o porquê e segue para abrir chamado (AGT-10)
Proof: `bun test packages/agent/src/engine.kb.test.ts -t "article condition fails"`

**C11** - Sem artigo: diz que não achou e oferece abrir chamado (AGT-11)
Proof: `bun test packages/agent/src/engine.kb.test.ts -t "no article"`

**C12** - Mais de um aberto e nenhum citado: lista de seleção e "Sobre qual deles quer saber?" (AGT-12)
Proof: `bun test packages/agent/src/engine.status.test.ts -t "many open tickets list"`

**C13** - Um só aberto: mostra sem perguntar (AGT-13)
Proof: `bun test packages/agent/src/engine.status.test.ts -t "one open ticket"`

**C14** - Nenhum aberto: diz e oferece abrir (AGT-14)
Proof: `bun test packages/agent/src/engine.status.test.ts -t "no open ticket"`

**C15** - Card com status, categoria, prioridade, aberto em e última atualização (AGT-15)
Proof: `bun test packages/agent/src/engine.status.test.ts -t "ticket card"`

**C16** - Vencido: tempo sem atualização, prazo e as três opções (AGT-16)
Proof: `bun test packages/agent/src/engine.status.test.ts -t "overdue offer"`

**C17** - Número inexistente ou de outro: "Não encontrei esse chamado entre os seus." (AGT-17)
Proof: `bun test packages/agent/src/engine.status.test.ts -t "not found among yours"`

**C18** - Chamados de outra pessoa: recusa e explica (AGT-18)
Proof: `bun test packages/agent/src/engine.status.test.ts -t "other person's tickets"`

**C19** - Abertura consulta os chamados do funcionário antes do rascunho (AGT-19)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "checks tickets before draft"`

**C20** - Aberto sobre o mesmo problema: propõe complementar (AGT-20)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "open duplicate"`

**C21** - Resolvido há 7 dias ou menos: propõe reabrir (AGT-21)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "recent resolved"`

**C22** - Resolvido há mais de 7 dias: chamado novo que cita o antigo (AGT-22)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "old resolved"`

**C23** - Tipo e categoria inferidos; abaixo de 60% pergunta (AGT-23)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "infers type and category"`

**C24** - Pergunta "Quem está sendo afetado?" com as 4 opções (AGT-24)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "asks affected"`

**C25** - Prioridade em código: Crítica, Alta, Média, Baixa pelo Anexo A (AGT-25)
Proof: `bun test packages/agent/src/rules/priority.test.ts -t "priority from impact and urgency"`

**C26** - "Não sei" calcula como "Só eu" e anota "impacto não confirmado" (AGT-26)
Proof: `bun test packages/agent/src/rules/priority.test.ts -t "not sure counts as only me"`

**C27** - Rascunho com título, descrição, tipo, categoria, prioridade e horário-limite, afetados, "Aguardando confirmação" e a frase da prioridade (AGT-27)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "draft fields"`

**C28** - Nada é criado antes do Confirmar (AGT-28)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "nothing before confirm"`

**C29** - Confirmar executa uma vez e responde número e prazo (AGT-29)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "confirm once"`

**C30** - Editar abre os campos e recalcula a prioridade (AGT-30)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "edit recalculates"`

**C31** - Cancelar descarta e diz que nada foi criado (AGT-31)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "cancel"`

**C32** - "sim" e "pode criar" confirmam só com um rascunho pendente (AGT-32)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "text confirmation"`

**C33** - Complementar: identifica o chamado e mostra rascunho de atualização (AGT-33)
Proof: `bun test packages/agent/src/engine.update.test.ts -t "update draft"`

**C34** - Atualização confirmada anexa a nota e confirma o número (AGT-34)
Proof: `bun test packages/agent/src/engine.update.test.ts -t "update confirmed"`

**C35** - Pedido de analista transfere sem tentar resolver (AGT-35)
Proof: `bun test packages/agent/src/engine.transfer.test.ts -t "asks for analyst"`

**C36** - Crítico confirmado: cria e transfere na mesma resposta (AGT-36)
Proof: `bun test packages/agent/src/engine.transfer.test.ts -t "critical creates and transfers"`

**C37** - Aceitar a oferta num vencido transfere (AGT-37)
Proof: `bun test packages/agent/src/engine.transfer.test.ts -t "overdue accepted"`

**C38** - Confiança abaixo de 60%: não age e transfere com "Agent pediu ajuda" (AGT-38)
Proof: `bun test packages/agent/src/engine.transfer.test.ts -t "low confidence"`

**C39** - Transferência grava resumo no chamado e na conversa e diz equipe e prazo (AGT-39)
Proof: `bun test packages/agent/src/engine.transfer.test.ts -t "transfer summary"`

**C40** - Aguardando ou com analista: sem resposta e sem modelo (AGT-40)
Proof: `bun test packages/agent/src/engine.transfer.test.ts -t "silent while with analyst"`

**C41** - Devolvida ao agent, retoma com as mensagens do analista (AGT-41)
Proof: `bun test packages/agent/src/engine.transfer.test.ts -t "returned to agent"`

**C42** - Fora de TI: diz que cuida só de TI e indica a área (AGT-42)
Proof: `bun test packages/agent/src/engine.basics.test.ts -t "out of scope"`

**C43** - SERVICE_UNAVAILABLE: 3 novas tentativas com 0,5, 1 e 2 s e a mesma chave (AGT-43)
Proof: `bun test packages/agent/src/retry.test.ts -t "service unavailable retries"`

**C44** - Serviço fora ou modelo falho/lento: diz o que não fez, mantém o rascunho e permite tentar de novo (AGT-44)
Proof: `bun test packages/agent/src/engine.failures.test.ts -t "failure keeps draft"`

**C45** - Pelo menos 20 conversas cobrindo cada regra, com acerto impresso por um comando (AGT-45)
Proof: `bun test packages/agent/eval/eval.test.ts -t "eval set"`

**C46** - Janela de 20 mensagens mais resumo; tokens e custo por resposta (AGT-46)
Proof: `bun test packages/agent/src/window.test.ts -t "window of twenty plus summary"`

**C47** - 429: espera e tenta uma vez; continuando, mensagem fixa sem chamado (AGT-47)
Proof: `bun test packages/agent/src/engine.failures.test.ts -t "rate limited"`

---

## Handoff

**Settled mid-build:** -
**Dispatched:** none (sem mecanismo de sub-agente; verificação self-verified, degradada)
**Walked:** -
**Deviations:** -
