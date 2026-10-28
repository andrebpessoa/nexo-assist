# Transparência: o que o agent fez e por quê

**Approved**: 2026-10-28 - user: "Aprovo todas as recomendações Q-01 a Q-16"

Tamanho: Large · Fonte: PDF (O que construir 7, "a parte mais importante do desafio") + protótipo (linhas de ações nas Telas 02, 03 e 04) · Status: Specify aprovado em 2026-10-28

## Problem Statement

O funcionário e o analista precisam entender cada resposta do agent: o que ele entendeu, o que fez, com que segurança e por quê. O PDF pede as ações acima de cada resposta ("consultou seus chamados", "classificou a prioridade") e uma visão detalhada, em formato livre mas fácil de ler. Se os rótulos vierem do texto do modelo, eles podem mentir; por isso eles saem das ações que o sistema de fato executou.

## Goals

- [ ] Linha de ações acima de toda resposta do agent, derivada das ferramentas executadas.
- [ ] Um painel de detalhe por resposta, igual no chat e no console.
- [ ] Registro de decisão salvo com a mensagem e um log estruturado no servidor.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Raciocínio interno bruto do modelo | O detalhe mostra a justificativa estruturada, não a cadeia de pensamento. |
| Painel de métricas agregadas (dashboard) | O PDF pede visibilidade por resposta. |
| Edição ou contestação de uma decisão | Não citado. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Formato do detalhe (Q-09) | Clicar na linha de ações abre um painel lateral "Por que o Nexo fez isso". | O PDF deixa livre; painel lateral não empurra a conversa e cabe nas duas telas. | y - recomendação aprovada (AD-007) |
| Quem vê o detalhe | Funcionário (só das próprias conversas) e analista. | O PDF pede transparência em cada resposta. | y - recomendação aprovada em 2026-10-28 |
| Mostrar a confiança ao funcionário | Sim, em porcentagem com faixa (alta de 80%, média de 60% a 79%, baixa abaixo de 60%). | O PDF pede "a confiança". | y - recomendação aprovada em 2026-10-28 |
| Custo no detalhe | Modelo, tokens e tempo aparecem no painel do analista; no do funcionário, só o tempo. | Custo interessa à operação, não ao funcionário. | y - recomendação aprovada em 2026-10-28 |

**Open questions:** none - Q-09 respondida em 2026-10-28 ("Aprovo todas as recomendações Q-01 a Q-16"); decisões em `STATE.md` (AD-007).

## User Stories

### P1: Ver as ações acima de cada resposta ⭐ MVP

**User Story**: Como funcionário, quero ver o que o agent fez antes de responder.

**Why P1**: O que construir 7.

**Acceptance Criteria**:

1. WHEN o agent responde THEN o sistema SHALL mostrar acima da resposta "Nexo Assist" e as ações executadas naquela vez, na ordem, cada uma com "✓", como nas capturas `02-chat-novo-chamado.png` e `03-chat-consulta-transferencia.png` de `chat-funcionario`. [Protótipo] `TRN-01`
2. The sistema SHALL tirar cada rótulo de uma ferramenta realmente executada, por um catálogo fixo: "consultou seus chamados", "buscou na central de ajuda", "classificou a prioridade", "consultou o SLA", "montou o rascunho", "consultou o <número>", "calculou o prazo", "criou o chamado", "atualizou o chamado", "reabriu o chamado", "transferiu para um analista". [PDF] `TRN-02`
3. IF uma ferramenta falhou depois das tentativas THEN o sistema SHALL mostrar o rótulo com "✕" e o texto "não conseguiu <ação>". [Proposta] `TRN-03`
4. WHILE o agent está trabalhando o sistema SHALL mostrar cada ação no gerúndio ("consultando seus chamados…") assim que começa. [Proposta] `TRN-04`
5. WHEN uma resposta não usou ferramenta THEN o sistema SHALL mostrar "respondeu sem consultar sistemas" no lugar das ações. [Proposta] `TRN-05`

**Independent Test**: Com o serviço de chamados desligado, a resposta mostra "✕ não conseguiu consultar seus chamados".

---

### P1: Abrir o detalhe de uma decisão ⭐ MVP

**User Story**: Como funcionário ou analista, quero ver o que o agent entendeu, o que fez, com que segurança e por quê.

**Why P1**: "Esta é a parte mais importante do desafio."

**Acceptance Criteria**:

1. WHEN o usuário clica na linha de ações de uma resposta THEN o sistema SHALL abrir o painel "Por que o Nexo fez isso" daquela resposta; WHEN usa o X ou Esc THEN o sistema SHALL fechá-lo. [Proposta] `TRN-06`
2. The painel SHALL mostrar em "O que entendi" a intenção em português e os dados extraídos (ex.: "Problema: VPN não conecta, erro 809", "Afetados: só você", "Compromisso: reunião às 14h"). [PDF] `TRN-07`
3. The painel SHALL mostrar em "O que fiz" a ação escolhida e a regra do Anexo A aplicada (ex.: "Prioridade Alta: impede uma pessoa de trabalhar e há compromisso no mesmo dia"). [PDF] `TRN-08`
4. The painel SHALL mostrar a confiança em porcentagem com a faixa alta, média ou baixa. [PDF] `TRN-09`
5. The painel SHALL mostrar em "Por quê" a justificativa em até 3 frases. [PDF] `TRN-10`
6. The painel SHALL listar os passos: cada ferramenta com o que foi pedido, o resultado resumido, a duração, as tentativas e o erro, se houve. [PDF] `TRN-11`
7. WHEN a decisão foi transferir THEN o painel SHALL mostrar o gatilho (pedido do funcionário, Crítica, vencido ou confiança baixa) e o resumo enviado ao analista. [PDF] `TRN-12`
8. The painel SHALL mostrar só dados que o serviço devolveu para o dono da conversa. [PDF] `TRN-13`

**Independent Test**: No rascunho da Tela 02, o painel mostra intenção "abrir chamado", afetados "só você", a regra da Alta, confiança e os três passos.

---

### P1: Ver as decisões no console e no log ⭐ MVP

**User Story**: Como analista, quero ver por que o agent transferiu ou pediu ajuda.

**Why P1**: História 2 do analista.

**Acceptance Criteria**:

1. WHEN o analista clica na linha de ações de uma mensagem do agent no console THEN o sistema SHALL abrir o mesmo painel de detalhe, com modelo, tokens, custo estimado e tempo. [PDF] `TRN-14`
2. The rótulo "Agent pediu ajuda · confiança NN%" da lista de conversas SHALL usar a confiança do registro de decisão que causou a transferência. [Protótipo] `TRN-15`
3. The sistema SHALL salvar o registro de decisão junto da mensagem, e ele SHALL continuar disponível depois de reiniciar a aplicação. [PDF] `TRN-16`
4. The servidor SHALL emitir um log JSON por decisão com conversa, mensagem, intenção, ação, confiança, ferramentas, latência e tokens, sem o texto das mensagens. [Proposta] `TRN-17`

**Independent Test**: Reiniciar o servidor e abrir o painel de uma resposta antiga mostra os mesmos dados.

---

### P2: Custo e tempo por resposta

**User Story**: Como avaliador, quero ver o custo por conversa.

**Why P2**: Também esperado: eficiência.

**Acceptance Criteria**:

1. WHEN o analista abre uma conversa THEN o sistema SHALL mostrar no painel de detalhe o total de tokens e o custo estimado da conversa até ali. [PDF] `TRN-18`

**Independent Test**: A soma por resposta bate com o total da conversa.

---

## Edge Cases

- Resposta interrompida no meio: o registro guarda as ferramentas já executadas e marca a resposta como incompleta.
- Conversa antiga, de antes de um campo novo no registro: o painel esconde o campo que falta.

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --- | --- |
| Input validation & bounds | N/A because o painel só lê registros gerados pelo servidor. |
| Failure / partial-failure states | TRN-03, edge case de resposta interrompida |
| Idempotency / retry / duplicate handling | TRN-11 (tentativas registradas) |
| Auth boundaries & rate limits | TRN-13; funcionário só abre registros das próprias conversas (AUTH-15) |
| Concurrency / ordering | TRN-01, TRN-04 (ordem das ações) |
| Data lifecycle / expiry | TRN-16 |
| Observability | TRN-17, TRN-18 |
| External-dependency failure | TRN-03 |
| State-transition integrity | TRN-12 |

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TRN-01 | P1 - Ver as ações acima de cada resposta | Specify | Pending |
| TRN-02 | P1 - Ver as ações acima de cada resposta | Specify | Pending |
| TRN-03 | P1 - Ver as ações acima de cada resposta | Specify | Pending |
| TRN-04 | P1 - Ver as ações acima de cada resposta | Specify | Pending |
| TRN-05 | P1 - Ver as ações acima de cada resposta | Specify | Pending |
| TRN-06 | P1 - Abrir o detalhe de uma decisão | Specify | Pending |
| TRN-07 | P1 - Abrir o detalhe de uma decisão | Specify | Pending |
| TRN-08 | P1 - Abrir o detalhe de uma decisão | Specify | Pending |
| TRN-09 | P1 - Abrir o detalhe de uma decisão | Specify | Pending |
| TRN-10 | P1 - Abrir o detalhe de uma decisão | Specify | Pending |
| TRN-11 | P1 - Abrir o detalhe de uma decisão | Specify | Pending |
| TRN-12 | P1 - Abrir o detalhe de uma decisão | Specify | Pending |
| TRN-13 | P1 - Abrir o detalhe de uma decisão | Specify | Pending |
| TRN-14 | P1 - Ver as decisões no console e no log | Specify | Pending |
| TRN-15 | P1 - Ver as decisões no console e no log | Specify | Pending |
| TRN-16 | P1 - Ver as decisões no console e no log | Specify | Pending |
| TRN-17 | P1 - Ver as decisões no console e no log | Specify | Pending |
| TRN-18 | P2 - Custo e tempo por resposta | Specify | Pending |

**Coverage:** 18 critérios, todos mapeados a uma história.

## Sources

- `../../source/desafio-prd.md`: O que construir 7, Medidas de sucesso (transparência), Critérios de avaliação.
- Capturas de `chat-funcionario` (02, 03) e `console-analista` (04): rótulos das ações acima das respostas.

## Success Criteria

- [ ] Toda resposta do agent tem linha de ações e painel de detalhe.
- [ ] Nenhum rótulo de ação aparece sem a ferramenta correspondente no registro (teste automatizado).
