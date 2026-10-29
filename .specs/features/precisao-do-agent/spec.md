# Precisão do agent com o modelo real

**Approved**: 2026-10-28 - user: "aprovo, pode continuar"

Tamanho: Large · Fonte: pedido do André (2026-10-28), diagnóstico em `diagnosis.md`, Anexo A do PDF, spec do `agent` · Status: Specify aprovado em 2026-10-28; próximo: Design

## Problem Statement

A avaliação ao vivo com `google/gemini-3.5-flash-lite` acerta 72% dos campos (49/68); a meta é 90%. O diagnóstico (`diagnosis.md`) mostra que o entendimento acerta quase sempre: 14 dos 19 erros passam pela regra do motor que, ao abrir chamado, devolve um artigo da central antes de olhar a duplicidade e aceita qualquer artigo do mesmo assunto. O resto vem de uma lacuna na regra que deriva "impede o trabalho", de um `affected` inventado pelo modelo e de mensagens vagas que relatam um problema e caem em saudação.

## Goals

- [ ] `bun run eval --live` com o modelo padrão acerta pelo menos 90% dos campos.
- [ ] As regras que hoje estão em 100% ao vivo (saudação, central de ajuda, consulta, vencido, privacidade, Crítica, confirmar, só TI, seguir as regras) continuam em 100% na rodada final.
- [ ] `bun run eval` roteirizado continua em 100%; `bun run test`, `bun test scripts`, `bun run check-types` e `bun run check` continuam verdes.
- [ ] Uma conversa ou algumas podem ser rodadas ao vivo sem gastar a cota da avaliação inteira.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Mudar as respostas esperadas de `eval/conversations.ts` | Pedido do André: o número sobe pelo agent, não pela régua. |
| Trocar o modelo padrão ou testar Flash maior | O diagnóstico não aponta o modelo; o free tier do Flash (~20 req/dia, AD-008) não comporta uma rodada. |
| Mudar o ranking da central (`kb.ts`) ou os artigos do seed | A busca acha os artigos certos; o erro está no julgamento e na ordem. |
| Mudar o fluxo de `duvida` (pergunta à central) | Passa em 100% ao vivo; a regra nova vale só para abrir chamado. |
| Push, deploy | AD-010; commits só locais. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Ordem ao abrir chamado | Duplicidade antes da central: achado um chamado do mesmo problema (aberto, resolvido há até 7 dias ou há mais), segue a regra de duplicidade e não responde com artigo. | Quem diz "de novo" já passou pelo suporte; o Anexo A manda não duplicar. | y - user: "1. sim" (2026-10-28) |
| Quando um artigo responde a um pedido de chamado | Só quando trata o mesmo sintoma, resolve sem chamado (não só explica como pedir), a condição dele vale e a pessoa não disse que já tentou o passo dele. Quando responde, mantém artigo + oferta de abrir chamado. | O juiz marcava como resposta artigos só do mesmo assunto. | y - user: "2. siga o recomendado" (2026-10-28) |
| Mensagem vaga que relata problema (`confianca-baixa`) | O prompt separa "relato de que algo está errado sem dizer o quê" (`abrir_chamado` com confiança abaixo de 60, que transfere pela AD-007) de "mensagem sem pedido" (`outro`, saudação, AGT-05). A expectativa da conversa não muda. | Mantém a expectativa e a AGT-05; usa o limiar já aprovado. | y - delegado, user: "3. faça o que achar melhor" (2026-10-28) |
| Juiz devolve sinais, o motor decide | O juiz passa a devolver se o artigo resolve o sintoma sem chamado e se a pessoa já tentou o passo dele; o motor combina com `articleFits` e a duplicidade. | Hipótese do André "pedir os sinais e deixar o código decidir"; regras em código testado (spec do agent). | y - recomendação 2 aceita |
| Sinal ausente do juiz | Sinal `null` conta como "não resolve": sem certeza, o motor segue para o chamado. | Errar para o chamado custa um rascunho; errar para o artigo some com o pedido. | y - default do agent, decorre da decisão 2 |
| Alternativa e "impede o trabalho" | Quando o modelo diz que há alternativa e não diz se impede, o motor conta como não impede. | Anexo A: Média = "atrapalha, mas há alternativa". Hoje o motor deriva só no sentido contrário. | y - default do código (simetria da regra existente) |
| Variação do modelo | Cada rodada ao vivo é uma amostra; a meta vale para a rodada final completa, e o relatório diz quantas rodadas completas houve. | O modelo não é determinístico; não dá para repetir à vontade com a cota. | y - default |
| Cota | Durante o trabalho só rodadas parciais (`--only`); rodada completa só no fim, avisada antes. | Pedido do André. | y - pedido |

**Open questions:** none - as três decisões vieram em 2026-10-28 ("1. sim", "2. siga o recomendado", "3. faça o que achar melhor").

---

## User Stories

### P1: Rodar só algumas conversas ao vivo ⭐ MVP

**User Story**: Como quem ajusta o agent, quero rodar ao vivo só as conversas que interessam, para medir sem gastar a cota do dia.

**Why P1**: Sem isso cada tentativa custa ~100 chamadas.

**Acceptance Criteria**:

1. WHEN `bun run eval --live --only <id>,<id>` roda THEN a avaliação SHALL rodar só as conversas com esses ids e reportar acerto, regras e erros só delas. `PRE-01`
2. WHEN a avaliação roda com `--only` THEN o sistema SHALL não gravar `eval/RESULT.md`. `PRE-02`
3. IF um id passado em `--only` não existe THEN o sistema SHALL sair com código 1, citar o id desconhecido e não chamar o modelo. `PRE-03`
4. WHEN `--only` não é passado THEN a avaliação SHALL rodar as 22 conversas como hoje. `PRE-04`

**Independent Test**: `bun run eval --only saudacao` roda uma conversa roteirizada e não toca no RESULT.md.

---

### P1: Duplicidade antes do artigo ao abrir chamado ⭐ MVP

**User Story**: Como funcionário que volta com o mesmo problema, quero que o agent reconheça o chamado que já tenho em vez de me mandar de novo para a central.

**Why P1**: Anexo A, "sem duplicidade"; 5 erros ao vivo.

**Acceptance Criteria**:

1. WHEN a intenção é `abrir_chamado` e o juiz aponta um chamado do funcionário com o mesmo problema com confiança de 60% ou mais THEN o agent SHALL aplicar a regra de duplicidade (complementar, reabrir ou chamado novo que cita o antigo) e SHALL não responder com artigo, mesmo que o juiz aponte um artigo que resolve. `PRE-05`
2. WHEN a intenção é `abrir_chamado` e nenhum chamado do mesmo problema passa de 60% THEN o agent SHALL decidir pela central como em PRE-06 a PRE-08. `PRE-09`

**Independent Test**: "Minha senha do SAP bloqueou de novo" com INC-20150 resolvido há menos de 7 dias propõe reabrir, mesmo com o juiz dizendo que o artigo de senha resolve.

---

### P1: Artigo só quando resolve o pedido ⭐ MVP

**User Story**: Como funcionário que pede um chamado, quero receber um artigo só quando ele resolve o meu problema, e não quando só fala do assunto.

**Why P1**: 9 erros ao vivo; prioridade e "uma pergunta por vez" nem chegam a ser testadas.

**Acceptance Criteria**:

1. WHEN a intenção é `abrir_chamado`, sem chamado duplicado, e o juiz diz que o artigo resolve o mesmo sintoma sem chamado, que a condição dele vale e que a pessoa não tentou o passo dele THEN o agent SHALL responder com o artigo e oferecer abrir chamado (`responder_artigo`, como hoje). `PRE-06`
2. IF o juiz diz que o artigo não resolve sem chamado (trata outro sintoma, ou só explica como pedir ou abrir chamado) ou não devolve esse sinal THEN o agent SHALL seguir para o rascunho, ou para a pergunta do que falta, sem a frase "não serve no seu caso". `PRE-07`
3. IF o juiz diz que a pessoa já tentou o passo do artigo THEN o agent SHALL seguir para o rascunho, ou para a pergunta do que falta. `PRE-08`
4. IF o artigo resolve o sintoma mas a condição dele não vale para a pessoa (`articleFits` false) THEN o agent SHALL dizer por que o artigo não serve e seguir para o chamado, como na AGT-10. `PRE-10`
5. The juiz SHALL receber no prompt a definição de "resolve sem chamado" com exemplos curtos: artigo de outro sintoma do mesmo programa não resolve; artigo que só diz como pedir um equipamento não resolve; passo do artigo que a pessoa diz já ter feito conta como tentado. `PRE-11`
6. WHILE a intenção é `duvida` the agent SHALL decidir pelo artigo como hoje (AGT-09 a AGT-11), sem os sinais novos. `PRE-12`

**Independent Test**: "Quero pedir um segundo monitor, sem pressa" com o juiz devolvendo `pedido-de-equipamento` e "não resolve sem chamado" leva ao rascunho REQ/Hardware/Baixa.

---

### P1: Dados de impacto sem lacuna nem invenção ⭐ MVP

**User Story**: Como funcionário, quero que o agent pergunte só o que eu não disse e não presuma o que eu não disse.

**Why P1**: 9 erros ao vivo (prioridade-media e afetados-nao-sei).

**Acceptance Criteria**:

1. WHEN o modelo devolve que há alternativa (`workaround` true) e não diz se impede o trabalho (`blocksWork` null) THEN o motor SHALL contar que não impede e SHALL não perguntar "impede o trabalho". `PRE-13`
2. The prompt de entendimento SHALL pedir `affected` só quando a pessoa diz quantas pessoas são afetadas ou quando o pedido é de equipamento ou acesso para ela mesma, com exemplos curtos: "só comigo" é "Só eu"; "consigo mandar pelo webmail" sozinho não diz quem é afetado. `PRE-14`
3. WHEN a mensagem diz que há outro jeito de trabalhar THEN o prompt de entendimento SHALL pedir `workaround` true e `blocksWork` false. `PRE-15`

**Independent Test**: "O Excel trava com planilhas grandes. Só comigo, e consigo usar o Excel online." com `workaround` true e `blocksWork` null leva ao rascunho Média, sem pergunta.

---

### P1: Relato vago de problema transfere ⭐ MVP

**User Story**: Como funcionário que não sabe explicar o que está errado, quero ser levado a um analista em vez de receber uma saudação.

**Why P1**: Anexo A, transferir "quando o agent não tem segurança"; 1 erro ao vivo.

**Acceptance Criteria**:

1. The prompt de entendimento SHALL definir `outro` como saudação, agradecimento ou mensagem sem pedido nem problema, e SHALL pedir `abrir_chamado` com confiança abaixo de 60 quando a pessoa diz que algo está errado sem dizer o quê. `PRE-16`
2. WHEN a mensagem é "acho que tem alguma coisa estranha, sei lá" THEN o agent ao vivo SHALL transferir (`transferir`), como espera a conversa `confianca-baixa`. `PRE-17`

**Independent Test**: `bun run eval --live --only confianca-baixa,saudacao` acerta as duas.

---

### P1: Resultado registrado ⭐ MVP

**User Story**: Como avaliador, quero ver no RESULT.md e no README o acerto da rodada final.

**Why P1**: `scripts/docs.test.ts` exige que os dois batam.

**Acceptance Criteria**:

1. WHEN o trabalho termina THEN `eval/RESULT.md` SHALL trazer a rodada ao vivo completa final, com acerto total de pelo menos 90%. `PRE-18`
2. WHEN o RESULT.md muda THEN a seção "Último resultado ao vivo" do README SHALL mostrar o mesmo total, as mesmas regras e o custo por conversa, e a leitura do resultado SHALL descrever as causas que sobraram. `PRE-19`
3. The regras em 100% na rodada ao vivo de 2026-10-29 SHALL estar em 100% na rodada final. `PRE-20`
4. The `bun run eval` roteirizado SHALL acertar 100% dos campos, sem mudar as respostas esperadas. `PRE-21`

---

## Edge Cases

- IF o juiz aponta um artigo que a busca não devolveu THEN o agent SHALL ignorar o artigo e seguir para o chamado (comportamento de hoje).
- IF o juiz aponta um chamado com o mesmo problema que não está na lista do funcionário THEN o agent SHALL tratar como sem duplicado (comportamento de `duplicateAction`).
- WHEN `--only` recebe a mesma conversa duas vezes THEN a avaliação SHALL rodá-la uma vez.
- IF o modelo falha ou estoura a cota numa rodada parcial THEN a avaliação SHALL mostrar o erro como hoje (AGT-47) e não gravar RESULT.md.

---

## Implicit-requirement dimensions

| Dimensão | Cobertura |
| --- | --- |
| Input validation & bounds | PRE-03 (id desconhecido em `--only`). |
| Failure / partial-failure states | Edge case de falha do modelo; comportamento de falha do agent não muda. |
| Idempotency / retry / duplicate handling | PRE-05, PRE-09. |
| Auth boundaries & rate limits | Cota do free tier: PRE-01, PRE-02; rodada completa só avisada. |
| Concurrency / ordering | N/A because a avaliação roda conversas em sequência e o motor não muda de concorrência. |
| Data lifecycle / expiry | N/A because nada é gravado além do RESULT.md. |
| Observability | O registro de decisão continua a mostrar a regra aplicada; a regra nova aparece no `rule` da decisão. |
| External-dependency failure | Edge case de falha do modelo. |
| State-transition integrity | N/A because os estados da conversa não mudam. |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PRE-01 | P1: Rodar só algumas conversas | T1 | Done |
| PRE-02 | P1: Rodar só algumas conversas | T1 | Done |
| PRE-03 | P1: Rodar só algumas conversas | T1 | Done |
| PRE-04 | P1: Rodar só algumas conversas | T1 | Done |
| PRE-05 | P1: Duplicidade antes do artigo | T4 | Done |
| PRE-09 | P1: Duplicidade antes do artigo | T4 | Done |
| PRE-06 | P1: Artigo só quando resolve | T4 | Done |
| PRE-07 | P1: Artigo só quando resolve | T4 | Done |
| PRE-08 | P1: Artigo só quando resolve | T4 | Done |
| PRE-10 | P1: Artigo só quando resolve | T4 | Done |
| PRE-11 | P1: Artigo só quando resolve | T2 | Done |
| PRE-12 | P1: Artigo só quando resolve | T4 | Done |
| PRE-13 | P1: Dados de impacto | T5 | Done |
| PRE-14 | P1: Dados de impacto | Design | Pending |
| PRE-15 | P1: Dados de impacto | Design | Pending |
| PRE-16 | P1: Relato vago transfere | Design | Pending |
| PRE-17 | P1: Relato vago transfere | Design | Pending |
| PRE-18 | P1: Resultado registrado | Design | Pending |
| PRE-19 | P1: Resultado registrado | Design | Pending |
| PRE-20 | P1: Resultado registrado | Design | Pending |
| PRE-21 | P1: Resultado registrado | Design | Pending |

**Coverage:** 21 total, 0 mapped to tasks, 21 unmapped ⚠️ (Tasks ainda não feitas)

---

## Sources

- Pedido do André, 2026-10-28 - meta de 90%, cota, não mudar expectativas, commits locais.
- `.specs/features/precisao-do-agent/diagnosis.md` - causa de cada erro ao vivo.
- `.specs/source/desafio-prd.md`, Anexo A - duplicidade, prioridade, transferência sem segurança.
- `.specs/features/agent/spec.md` - AGT-05, AGT-08 a AGT-11, AGT-19 a AGT-26, AGT-38.
- `.specs/STATE.md` - AD-007 (limiar 60%), AD-008 (free tier), AD-021 (Mastra), AD-023 (modelo padrão).

---

## Success Criteria

- [ ] Rodada ao vivo final completa com pelo menos 90% dos campos, gravada no RESULT.md e no README.
- [ ] No máximo duas rodadas ao vivo completas no trabalho todo, cada uma avisada antes.
