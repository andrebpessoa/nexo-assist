# Precisão do agent Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, the walk, check_proofs, the Verifier and the screens sub-agent).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/precisao-do-agent/design.md`
**Status**: In Progress
**Approved**: 2026-10-29 - user: "pode xecutar"
**Mutations**: 3
**Build**: `bun run check-types; bun run check; bun run test; bun test scripts`

> Commits locais, um por tarefa, em português (Conventional Commits), sem push. `eval/conversations.ts` não muda. Rodada ao vivo completa só na T7, avisada antes; no máximo duas no trabalho todo.

---

## Test Coverage Matrix

> Guidelines found: nenhum `AGENTS.md` ou guia de testes; padrões das features `agent` e `entrega` e `bun test` (AD-014).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regras puras do agent | unit | Uma linha da tabela de decisão por teste; cada AC | `packages/agent/src/rules/*.test.ts` | `bun test packages/agent/src/rules` |
| Motor do agent (`engine.ts`) | integration (SQLite em memória, modelo roteirizado) | Cada AC e edge case da spec; duplicidade aberta, recente e antiga | `packages/agent/src/engine.*.test.ts` | `bun test packages/agent/src` |
| Entendimento Mastra (schema e prompts) | unit (`MockLanguageModelV4`) | Campos novos aceitos; prompt enviado traz definições, exemplos e corpo do artigo | `packages/agent/src/understand-mastra.test.ts` | `bun test packages/agent/src/understand-mastra.test.ts` |
| Avaliação (`eval/`) | unit + processo (`bun eval/cli.ts` sem rede) | `--only` seleciona, deduplica, recusa id desconhecido sem modelo, não grava RESULT.md | `packages/agent/eval/*.test.ts` | `bun test packages/agent/eval` |
| RESULT.md e README | unit (lê o arquivo) | Meta, regras em 100% e README igual ao RESULT.md | `packages/agent/eval/result.test.ts`, `scripts/docs.test.ts` | `bun test packages/agent/eval scripts` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Regras puras, prompts, avaliação | `bun test packages/agent` |
| Full | Motor | `bun run test && bun test scripts` |
| Build | Fim de cada tarefa antes do commit | `bun run check-types && bun run check && bun run test && bun test scripts` |

---

## Execution Plan

### Phase 1: Medir barato

```
T1
```

### Phase 2: Artigo e duplicidade

```
T2 → T3 → T4
```

### Phase 3: Dados de impacto e relato vago

```
T5 → T6
```

**Rodada parcial (depois da T6, sem commit)**: `bun run eval --live --only prioridade-baixa,prioridade-media,afetados-nao-sei,duplicado-resolvido-recente,duplicado-resolvido-antigo,confianca-baixa,artigo-serve,artigo-nao-serve,duplicado-aberto,saudacao,prioridade-alta-compromisso` (as 6 com erro e 5 controles das regras em 100%, ~25 chamadas). Rodadas parciais menores podem vir depois de T4 e T6 para conferir uma regra. Um ajuste de prompt que a rodada pedir vira tarefa nova, anotada em `**Settled mid-build:**` e mostrada ao André antes.

### Phase 4: Resultado

```
T7
```

---

## Task Breakdown

### T1: `--only` na avaliação

**What**: `bun run eval [--live] --only a,b` roda só essas conversas, deduplica, recusa id desconhecido com saída 1 antes de criar o modelo e nunca grava o RESULT.md.
**Where**: `packages/agent/eval/run.ts` (`selectConversations`, `onlyArg`, `runEval({ conversations })`), `packages/agent/eval/cli.ts`
**Depends on**: None
**Reuses**: `runEval`, `CONVERSATIONS`
**Requirement**: PRE-01, PRE-02, PRE-03, PRE-04

**Done when**:

- [ ] Testes em `eval/eval.test.ts`: só as escolhidas (relatório, regras e erros só delas), repetida roda uma vez, sem `--only` roda as 22, gravação do RESULT.md só sem `--only` e ao vivo, `bun eval/cli.ts --live --only nao-existe` com chave falsa sai 1 citando o id
- [ ] `bun run eval --only saudacao` roda uma conversa e não toca no RESULT.md
- [ ] Gate quick e build passam

**Tests**: unit
**Gate**: build
**Commit**: `feat(eval): roda só as conversas pedidas com --only`

---

### T2: Juiz devolve se o artigo resolve e se já foi tentado

**What**: `JudgementSchema` ganha `articleResolves` e `articleTried` (nulos em `emptyJudgement`); o juiz recebe o corpo do artigo e a definição de "resolve sem chamado" com os três exemplos da PRE-11; `describeModel` mostra os sinais.
**Where**: `packages/agent/src/understand.ts`, `packages/agent/src/understand-mastra.ts`
**Depends on**: None (Phase 1 antes)
**Reuses**: `MockLanguageModelV4` em `understand-mastra.test.ts`
**Requirement**: PRE-11

**Done when**:

- [ ] Teste: o prompt enviado ao juiz traz `body` de cada artigo; as instruções trazem a definição e os exemplos (outro sintoma do mesmo programa, só como pedir equipamento, passo já feito)
- [ ] Teste: a resposta com os dois campos é aceita; sem eles o parse falha como hoje para campo obrigatório
- [ ] Gate build passa (o roteirizado continua em 100%)

**Tests**: unit
**Gate**: build
**Commit**: `feat(agent): juiz diz se o artigo resolve e se a pessoa já tentou`

---

### T3: Regra do artigo ao abrir chamado

**What**: `articleForTicket(signals, articles)` devolve `answer`, `misfit` ou `skip` pela tabela do design.
**Where**: `packages/agent/src/rules/article.ts`
**Depends on**: T2
**Reuses**: padrão de `rules/duplicates.ts`
**Requirement**: PRE-06, PRE-07, PRE-08, PRE-10

**Done when**:

- [ ] `rules/article.test.ts` com um teste por linha da tabela: fora da busca, não resolve, sinal nulo, já tentado, não serve, responde
- [ ] Gate quick e build passam

**Tests**: unit
**Gate**: build
**Commit**: `feat(agent): regra que decide se o artigo responde ao pedido de chamado`

---

### T4: Duplicidade antes do artigo em `startTicket`

**What**: `startTicket` aplica `duplicateAction` antes do artigo e decide o artigo por `articleForTicket`; a frase "não serve no seu caso" só sai em `misfit`; `helpCenter` (dúvida) não muda.
**Where**: `packages/agent/src/engine.ts`
**Depends on**: T3
**Reuses**: `duplicateAction`, `answerWithArticle`, `continueDraft`
**Requirement**: PRE-05, PRE-09, PRE-06, PRE-07, PRE-08, PRE-10, PRE-12

**Done when**:

- [ ] `engine.ticket-article.test.ts`: chamado aberto, resolvido há ≤ 7 dias e há mais, cada um com o juiz dizendo que o artigo resolve, dão complementar, reabrir e rascunho que cita (sem bloco de artigo); sem duplicado, artigo que resolve responde com oferta; que não resolve ou sem sinal vai ao rascunho sem "não serve"; já tentado vai ao rascunho; resolve mas não serve diz por quê; chamado apontado fora da lista segue para o artigo
- [ ] Teste em `engine.kb.test.ts`: dúvida com `articleResolves: false` ainda responde com o artigo (PRE-12)
- [ ] `bun run eval` roteirizado em 100%, `conversations.ts` sem mudança
- [ ] Gate full e build passam

**Tests**: integration
**Gate**: build
**Commit**: `fix(agent): duplicidade antes do artigo e artigo só quando resolve`

---

### T5: Alternativa conta como "não impede"

**What**: `fieldsFrom` define `blocksWork = false` quando `workaround` é true e `blocksWork` é null.
**Where**: `packages/agent/src/engine.ts`
**Depends on**: None (Phase 2 antes)
**Reuses**: `fieldsFrom`
**Requirement**: PRE-13

**Done when**:

- [ ] Teste em `engine.create.test.ts`: "O Excel trava…" com `workaround: true`, `blocksWork: null`, `affected: "Só eu"` dá rascunho Média sem pergunta; `workaround: false` e `blocksWork: null` ainda pergunta "impede"
- [ ] Gate full e build passam

**Tests**: integration
**Gate**: build
**Commit**: `fix(agent): alternativa de trabalho conta como não impede`

---

### T6: Prompt de entendimento para afetados, alternativa e relato vago

**What**: `UNDERSTAND_INSTRUCTIONS` (exportado) define `affected` só quando dito (ou equipamento/acesso para si) com os exemplos da PRE-14, "outro jeito de trabalhar" como `workaround` true e `blocksWork` false, `outro` só para saudação, agradecimento ou mensagem sem pedido nem problema, e relato vago de problema como `abrir_chamado` com confiança abaixo de 60.
**Where**: `packages/agent/src/understand-mastra.ts`
**Depends on**: T5
**Reuses**: `understand-mastra.test.ts`
**Requirement**: PRE-14, PRE-15, PRE-16

**Done when**:

- [ ] Testes que conferem cada definição e exemplo no prompt enviado ao modelo
- [ ] Rodada parcial ao vivo do plano acima registrada em `## Handoff` (acerto por conversa)
- [ ] Gate quick e build passam

**Tests**: unit
**Gate**: build
**Commit**: `feat(agent): prompt pede afetados só quando ditos e trata relato vago`

---

### T7: Rodada final e resultado registrado

**What**: Com aviso ao André, `bun run eval --live` completo; RESULT.md gerado; README ("Último resultado ao vivo", leitura do resultado e "O que faria com mais tempo") atualizado; `eval/result.test.ts` prova a meta a partir do RESULT.md; `scripts/docs.test.ts` confere as regras abaixo de 100% no README.
**Where**: `packages/agent/eval/RESULT.md`, `README.md`, `packages/agent/eval/result.test.ts`, `scripts/docs.test.ts`
**Depends on**: None (Phase 3 antes)
**Reuses**: `scripts/docs.test.ts`
**Requirement**: PRE-17, PRE-18, PRE-19, PRE-20, PRE-21

**Done when**:

- [ ] André avisado antes da rodada completa; resultado ≥ 90% (abaixo disso: parar e mostrar os erros antes de uma segunda rodada)
- [ ] `result.test.ts`: 22 conversas, total ≥ 90%, as 9 regras que estavam em 100% continuam em 100%, nenhum erro de `confianca-baixa`
- [ ] `docs.test.ts`: total, custo por conversa e cada regra abaixo de 100% do RESULT.md aparecem no README
- [ ] Gate build passa

**Tests**: unit
**Gate**: build
**Commit**: `docs(agent): rodada ao vivo final acima de 90%`

---

## Checks

**C1** - `--only saudacao,consulta-nenhum` roda 2 conversas e o relatório traz só elas, regras e erros (PRE-01, AC 1)
Proof: `bun test packages/agent/eval/eval.test.ts -t "only runs the chosen conversations"`

**C2** - Com `--only` o RESULT.md não é gravado, mesmo ao vivo (PRE-02, AC 2)
Proof: `bun test packages/agent/eval/eval.test.ts -t "partial run never writes RESULT.md"`

**C3** - `--live --only nao-existe` sai 1, cita `nao-existe` e não cria o modelo (PRE-03, AC 3)
Proof: `bun test packages/agent/eval/eval.test.ts -t "unknown id exits 1 without calling the model"`

**C4** - Sem `--only`, as 22 conversas rodam (PRE-04, AC 4)
Proof: `bun test packages/agent/eval/eval.test.ts -t "without only runs all 22"`

**C5** - Chamado do mesmo problema ≥ 60% leva a complementar, reabrir ou rascunho que cita, sem artigo, mesmo com o artigo resolvendo (PRE-05, AC 1)
Proof: `bun test packages/agent/src/engine.ticket-article.test.ts -t "duplicate wins over the article"`

**C6** - Sem duplicado (abaixo de 60% ou fora da lista), a decisão vai para o artigo (PRE-09, AC 2)
Proof: `bun test packages/agent/src/engine.ticket-article.test.ts -t "no duplicate decides by the article"`

**C7** - Artigo que resolve, serve e não foi tentado: `responder_artigo` com oferta de chamado (PRE-06, AC 1)
Proof: `bun test packages/agent/src/engine.ticket-article.test.ts -t "article that resolves answers with a ticket offer"`

**C8** - Artigo que não resolve ou sem sinal: rascunho ou pergunta, sem "não serve no seu caso" (PRE-07, AC 2)
Proof: `bun test packages/agent/src/engine.ticket-article.test.ts -t "article that does not resolve goes to the draft"`

**C9** - Passo do artigo já tentado: rascunho ou pergunta (PRE-08, AC 3)
Proof: `bun test packages/agent/src/engine.ticket-article.test.ts -t "article already tried goes to the draft"`

**C10** - Artigo que resolve mas não serve: diz por quê e segue para o chamado (PRE-10, AC 4)
Proof: `bun test packages/agent/src/engine.ticket-article.test.ts -t "article that resolves but does not fit says why"`

**C11** - O juiz recebe o corpo do artigo e a definição de "resolve sem chamado" com os três exemplos (PRE-11, AC 5)
Proof: `bun test packages/agent/src/understand-mastra.test.ts -t "judge prompt defines resolves without a ticket"`

**C12** - Na dúvida, o artigo responde mesmo com `articleResolves: false` (PRE-12, AC 6)
Proof: `bun test packages/agent/src/engine.kb.test.ts -t "doubt ignores the ticket signals"`

**C13** - `workaround` true e `blocksWork` null: rascunho Média, sem pergunta "impede" (PRE-13, AC 1)
Proof: `bun test packages/agent/src/engine.create.test.ts -t "workaround counts as not blocking"`

**C14** - O prompt de entendimento pede `affected` só quando dito, com os dois exemplos (PRE-14, AC 2)
Proof: `bun test packages/agent/src/understand-mastra.test.ts -t "understand prompt asks affected only when said"`

**C15** - O prompt pede `workaround` true e `blocksWork` false para "outro jeito de trabalhar" (PRE-15, AC 3)
Proof: `bun test packages/agent/src/understand-mastra.test.ts -t "understand prompt reads a workaround as not blocking"`

**C16** - O prompt define `outro` e manda relato vago para `abrir_chamado` abaixo de 60 (PRE-16, AC 1)
Proof: `bun test packages/agent/src/understand-mastra.test.ts -t "understand prompt sends a vague report to low confidence"`

**C17** - Na rodada ao vivo final, `confianca-baixa` transfere (PRE-17, AC 2)
Proof: `bun test packages/agent/eval/result.test.ts -t "vague report transfers live"`

**C18** - O RESULT.md traz a rodada completa final com 22 conversas e total ≥ 90% (PRE-18, AC 1)
Proof: `bun test packages/agent/eval/result.test.ts -t "final live run reaches 90 percent"`

**C19** - O README mostra o mesmo total, as mesmas regras e o mesmo custo por conversa do RESULT.md (PRE-19, AC 2)
Proof: `bun test scripts/docs.test.ts -t "README shows the last eval result"`

**C20** - As 9 regras em 100% na rodada de 2026-10-29 continuam em 100% (PRE-20, AC 3)
Proof: `bun test packages/agent/eval/result.test.ts -t "rules at 100 percent stay at 100 percent"`

**C21** - `bun run eval` roteirizado acerta 100% sem mudar as respostas esperadas (PRE-21, AC 4)
Proof: `bun test packages/agent/eval/eval.test.ts -t "eval set"`

---

## Handoff

**Settled mid-build:** none
**Dispatched:** none
**Walked:** N/A - sem tela nova; o efeito é medido pelas rodadas ao vivo

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1
Phase 2:  T2 ------→ T3 ------→ T4
Phase 3:  T5 ------→ T6   (+ rodada parcial)
Phase 4:  T7   (rodada completa avisada)
```

Arquivos múltiplos em T1 (`run.ts` e `cli.ts`, uma opção), T2 (schema e prompt do mesmo juiz) e T7 (RESULT.md e README precisam bater no mesmo commit, senão `docs.test.ts` fica vermelho) são uma entrega só cada.

7 tarefas: cabem num lote, execução inline sem sub-agentes de lote. O Verifier roda no fim.
