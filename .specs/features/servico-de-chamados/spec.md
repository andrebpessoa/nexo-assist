# Serviço de chamados simulado

**Approved**: 2026-10-28 - user: "Aprovo todas as recomendações Q-01 a Q-16"

Tamanho: Large · Fonte: PDF (O que construir 4, Anexo A, Anexo B) · Status: Specify aprovado em 2026-10-28

## Problem Statement

O agent precisa de um sistema de chamados para consultar, abrir, atualizar e transferir chamados, e de uma central de ajuda para buscar respostas. Na Nexo esse sistema é legado e às vezes fica fora do ar por alguns segundos. O desafio pede um serviço simulado, separado do agent, com dados de exemplo e o mesmo comportamento instável. Ele também é a barreira de privacidade: um funcionário nunca vê chamado de outro.

## Goals

- [ ] Um serviço com interface própria (consultar, detalhar, criar, atualizar, reabrir, transferir) que o agent só usa por essa interface.
- [ ] Prazo e vencimento calculados em código testado, pela tabela de prioridade do Anexo A.
- [ ] Seed com os casos do Anexo B, cobrindo chamado aberto, vencido, resolvido há pouco e de outro funcionário.
- [ ] Falhas curtas simuladas, com criação idempotente para que retentativas não dupliquem chamados.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Integração com um service desk real | O PDF pede um serviço simulado. |
| Feriados no cálculo de horas úteis | Não citados no PDF; ver Assumptions. |
| Anexos (arquivos, prints) em chamados | Não citados no PDF nem no protótipo. |
| Edição da central de ajuda por tela | O PDF só pede artigos de seed. |
| Fluxo de aprovação de requisições (REQ) | O status "Aprovado" vem do seed; ninguém aprova pela aplicação. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Horário útil | Segunda a sexta, 08:00-18:00, America/Sao_Paulo, sem feriados. | Artigo de seed do Anexo B: "de segunda a sexta, das 8h às 18h". | y - recomendação aprovada em 2026-10-28 |
| Prazo da Crítica | 1 hora corrida, 24 h por dia. | Anexo A dá "1 hora" sem "úteis", e o artigo fala em plantão 24 h para críticos. | y - recomendação aprovada em 2026-10-28 |
| Dias úteis | N dias úteis = N × 10 horas úteis. | Dá um prazo exato e testável; o PDF não define a conta. | y - recomendação aprovada em 2026-10-28 |
| O que reinicia o prazo | Abertura, reabertura e cada atualização feita pela equipe (analista ou transferência). Complemento do funcionário não reinicia. | O prazo é da equipe; sem isso, o funcionário "zera" o atraso ao escrever. INC-20311 do Anexo B está vencido com "Aguardando analista". | y - recomendação aprovada em 2026-10-28 |
| Status de chamado | Aguardando analista, Em andamento, Em atendimento, Aprovado, Resolvido, Fechado, Cancelado. Abertos = todos menos Resolvido, Fechado e Cancelado. | Os três primeiros e Aprovado/Resolvido aparecem no protótipo e no Anexo B. | y - recomendação aprovada em 2026-10-28 |
| Status de um chamado novo | Aguardando analista. | Ainda não teve a primeira resposta. | y - recomendação aprovada em 2026-10-28 |
| Numeração | `INC-NNNNN` e `REQ-NNNNN`, sequencial por tipo, a partir do maior número do seed. | Formato do Anexo B e do protótipo. | y - recomendação aprovada em 2026-10-28 |
| Subcategoria ("Hardware › Notebook" no protótipo) | Campo opcional `item`, texto livre, mostrado depois de "›". As regras usam só a categoria. | O Anexo A tem seis categorias planas; o protótipo mostra um detalhe a mais. | y - recomendação aprovada em 2026-10-28 |
| Indisponibilidade simulada | Taxa configurável `TICKETS_FAILURE_RATE` (padrão 0,1) e latência extra configurável. Desligável nos testes. | O PDF diz "às vezes fica indisponível por alguns segundos". | y - recomendação aprovada em 2026-10-28 |
| Onde o serviço roda | Decidido no Design: pacote próprio atrás de uma interface (mesmo Worker) ou Worker separado. | O PDF pede separação do agent, não um processo à parte. | y - recomendação aprovada em 2026-10-28 |

**Open questions:** none - Q-01, Q-14 respondidas em 2026-10-28 ("Aprovo todas as recomendações Q-01 a Q-16"); decisões em `STATE.md` (AD-002, AD-012).

## User Stories

### P1: Consultar os chamados de um funcionário ⭐ MVP

**User Story**: Como agent, quero listar e detalhar os chamados do funcionário da sessão, para responder status sem pedir o número.

**Why P1**: Histórias 2 e 3 do funcionário dependem disso.

**Acceptance Criteria**:

1. The serviço SHALL expor consultar, detalhar, criar, atualizar, reabrir e transferir chamados por uma interface própria, sem importar nenhum módulo do agent. [PDF] `TKT-01`
2. WHEN o agent consulta os chamados de um funcionário THEN o serviço SHALL devolver os chamados dele com número, título, tipo, categoria, item, prioridade, status, aberto em, última atualização, prazo e `vencido`, do mais recente para o mais antigo. [PDF] `TKT-02`
3. WHEN a consulta pede só abertos THEN o serviço SHALL devolver os chamados fora de Resolvido, Fechado e Cancelado. [Proposta] `TKT-03`
4. WHEN o agent detalha um chamado THEN o serviço SHALL devolver também a descrição, as notas e os eventos (transferido, assumido, atualizado, reaberto) com autor e hora. [PDF] `TKT-04`
5. IF o chamado pedido não existe ou pertence a outro funcionário THEN o serviço SHALL responder `NOT_FOUND`, igual nos dois casos. [PDF] `TKT-05`
6. The serviço SHALL tirar o funcionário da consulta da sessão autenticada no servidor, nunca de um parâmetro preenchido pelo modelo. [PDF] `TKT-06`
7. WHERE quem consulta é um analista o serviço SHALL permitir ler os chamados de qualquer funcionário. [PDF] `TKT-07`

**Independent Test**: Consultar com a sessão da Ana devolve só os chamados dela; pedir `INC` de outro funcionário devolve `NOT_FOUND`.

---

### P1: Criar, atualizar e reabrir chamados ⭐ MVP

**User Story**: Como agent, quero criar um chamado completo, complementar um aberto e reabrir um resolvido há pouco, para não gerar duplicidade.

**Why P1**: "Chamados bem abertos" é uma medida de sucesso.

**Acceptance Criteria**:

1. The serviço SHALL exigir em todo chamado título, descrição, tipo (INC ou REQ), categoria (Acesso, Rede e VPN, Hardware, Software, E-mail, Outros), prioridade (Crítica, Alta, Média, Baixa) e afetados (Só eu, Minha equipe, Toda a empresa). [PDF] `TKT-08`
2. IF criar recebe um campo obrigatório vazio ou um valor fora dessas listas THEN o serviço SHALL recusar com `INVALID_TICKET` listando os campos, sem criar nada. [PDF] `TKT-09`
3. IF título passa de 120 caracteres ou descrição passa de 4.000 THEN o serviço SHALL recusar com `INVALID_TICKET`. [Proposta] `TKT-10`
4. WHEN um chamado é criado THEN o serviço SHALL dar o próximo número do tipo, status "Aguardando analista", aberto em e última atualização iguais a agora, e o prazo calculado. [Proposta] `TKT-11`
5. IF criar chega de novo com a mesma chave de idempotência THEN o serviço SHALL devolver o chamado já criado, sem criar outro. [Proposta] `TKT-12`
6. WHEN o agent atualiza um chamado aberto com uma nota THEN o serviço SHALL anexar a nota com autor e hora, mantendo título, tipo e categoria. [PDF] `TKT-13`
7. IF a atualização mira um chamado Resolvido, Fechado ou Cancelado THEN o serviço SHALL recusar com `TICKET_CLOSED`. [Proposta] `TKT-14`
8. WHEN o agent reabre um chamado Resolvido há 7 dias ou menos THEN o serviço SHALL passar o status para "Aguardando analista", anexar o motivo e recalcular o prazo. [PDF] `TKT-15`
9. IF a reabertura mira um chamado resolvido há mais de 7 dias ou fora de Resolvido THEN o serviço SHALL recusar com `REOPEN_NOT_ALLOWED`. [PDF] `TKT-16`

**Independent Test**: Criar duas vezes com a mesma chave gera um chamado; reabrir INC-20150 (resolvido há 4 dias) funciona; reabrir um resolvido há 10 dias falha.

---

### P1: Prazo e vencimento ⭐ MVP

**User Story**: Como funcionário, quero saber se meu chamado está atrasado, e como analista quero ver o prazo certo.

**Why P1**: História 2 do funcionário e gatilho de transferência do Anexo A.

**Acceptance Criteria**:

1. The serviço SHALL calcular o prazo somando à última atualização da equipe: Crítica 1 hora corrida, Alta 4 horas úteis, Média 3 dias úteis, Baixa 5 dias úteis. [PDF] `TKT-17`
2. The serviço SHALL contar horas úteis de segunda a sexta, das 08:00 às 18:00 em America/Sao_Paulo, e um dia útil como 10 horas úteis. [Proposta] `TKT-18`
3. WHILE um chamado aberto passou do prazo o serviço SHALL devolvê-lo com `vencido = true` e o tempo de atraso. [PDF] `TKT-19`
4. WHEN um analista ou uma transferência atualiza o chamado THEN o serviço SHALL recalcular o prazo a partir dessa hora. [PDF] `TKT-20`
5. WHEN o funcionário complementa o chamado THEN o serviço SHALL manter o prazo que já corria. [Proposta] `TKT-21`

**Independent Test**: Testes de unidade com relógio fixo: Alta aberta sexta 16:00 vence segunda 10:00; Média aberta segunda 09:00 vence quinta 09:00; Crítica aberta sábado 03:00 vence sábado 04:00.

---

### P1: Transferir para um analista ⭐ MVP

**User Story**: Como agent, quero transferir com um resumo, para o analista não perguntar tudo de novo.

**Why P1**: O que construir 5 e história 1 do analista.

**Acceptance Criteria**:

1. WHEN o agent transfere um chamado com resumo e equipe (Suporte N1 ou Suporte N2) THEN o serviço SHALL registrar o evento "Transferido para um analista" com resumo, equipe e hora, e deixar o status em "Aguardando analista". [PDF] `TKT-22`
2. WHEN um analista assume a conversa de um chamado THEN o serviço SHALL passar o status para "Em atendimento" e registrar "Assumido por <nome>". [Protótipo] `TKT-23`
3. IF a transferência chega sem resumo THEN o serviço SHALL recusar com `INVALID_TRANSFER`. [PDF] `TKT-24`

**Independent Test**: Transferir INC-20311 grava o evento com o resumo e o painel do analista mostra "Transferido para um analista 10:05".

---

### P1: Indisponibilidade e persistência ⭐ MVP

**User Story**: Como desenvolvedor, quero que o serviço falhe como o legado e não perca nada no reinício, para provar o tratamento de erro do agent.

**Why P1**: Requisitos técnicos de persistência e o aviso do PDF sobre o legado.

**Acceptance Criteria**:

1. WHERE a simulação de indisponibilidade está ligada o serviço SHALL responder `SERVICE_UNAVAILABLE` numa fração das chamadas igual a `TICKETS_FAILURE_RATE`, antes de gravar qualquer coisa. [PDF] `TKT-25`
2. WHERE a simulação está desligada o serviço SHALL responder sem falhas sorteadas, para testes determinísticos. [Proposta] `TKT-26`
3. WHEN a aplicação reinicia THEN o serviço SHALL manter chamados, notas, eventos e artigos no banco. [PDF] `TKT-27`

**Independent Test**: Com taxa 1,0, criar falha e nada é gravado; com taxa 0, tudo responde; depois de reiniciar o servidor, os chamados criados continuam lá.

---

### P1: Central de ajuda e dados de exemplo ⭐ MVP

**User Story**: Como avaliador, quero rodar o projeto e já ter funcionários, artigos e chamados em situações variadas.

**Why P1**: Anexo B.

**Acceptance Criteria**:

1. The seed SHALL criar pelo menos 5 funcionários com nome, e-mail `@nexo.com.br`, setor e sistema operacional (Ana Souza, ana.souza@nexo.com.br, Financeiro, Windows 11, entre eles) e pelo menos 2 analistas (um de Suporte N1 e Rafael Lima de Suporte N2). [PDF] `TKT-28`
2. The seed SHALL criar de 5 a 10 artigos curtos, incluindo os dois do Anexo B (VPN erro 809, só Windows 10; horário do service desk), cada um com título, texto e condição de aplicação. [PDF] `TKT-29`
3. The seed SHALL criar chamados abertos, um vencido, um resolvido há menos de 7 dias, um resolvido há mais de 7 dias, um REQ aprovado e chamados de outros funcionários, incluindo INC-20311, REQ-10442 e INC-20150 do Anexo B, com datas relativas ao momento do seed. [PDF] `TKT-30`
4. WHEN o agent busca na central com um texto THEN o serviço SHALL devolver até 3 artigos por relevância, com id, título, texto e condição. [PDF] `TKT-31`
5. IF nenhum artigo passa da relevância mínima THEN o serviço SHALL devolver lista vazia. [Proposta] `TKT-32`
6. WHEN o seed roda de novo THEN o sistema SHALL recriar o mesmo conjunto sem duplicar registros. [Proposta] `TKT-33`

**Independent Test**: Rodar o seed duas vezes e contar registros; buscar "erro 809" devolve o artigo de VPN.

---

## Edge Cases

- WHEN o prazo cai fora do horário útil THEN o relógio para às 18:00 e volta às 08:00 do próximo dia útil.
- WHEN um chamado é aberto fora do horário útil THEN a contagem começa às 08:00 do próximo dia útil (exceto Crítica).
- Um funcionário sem nenhum chamado recebe lista vazia, não erro.
- Duas criações concorrentes com chaves diferentes recebem números diferentes (sequência atômica no banco).

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --- | --- |
| Input validation & bounds | TKT-08, TKT-09, TKT-10, TKT-24 |
| Failure / partial-failure states | TKT-25 (falha antes de gravar) |
| Idempotency / retry / duplicate handling | TKT-12, TKT-33 |
| Auth boundaries & rate limits | TKT-05, TKT-06, TKT-07; limite de uso em `entrega` |
| Concurrency / ordering | Edge case de numeração atômica; TKT-02 (ordem) |
| Data lifecycle / expiry | TKT-15, TKT-16 (janela de 7 dias), TKT-27 |
| Observability | Eventos com autor e hora (TKT-04, TKT-22); log de decisão em `transparencia` |
| External-dependency failure | TKT-25, TKT-26; retentativa do lado do agent (AGT) |
| State-transition integrity | TKT-11, TKT-14, TKT-15, TKT-16, TKT-23 |

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TKT-01 | P1 - Consultar os chamados de um funcionário | Specify | Pending |
| TKT-02 | P1 - Consultar os chamados de um funcionário | Specify | Pending |
| TKT-03 | P1 - Consultar os chamados de um funcionário | Specify | Pending |
| TKT-04 | P1 - Consultar os chamados de um funcionário | Specify | Pending |
| TKT-05 | P1 - Consultar os chamados de um funcionário | Specify | Pending |
| TKT-06 | P1 - Consultar os chamados de um funcionário | Specify | Pending |
| TKT-07 | P1 - Consultar os chamados de um funcionário | Specify | Pending |
| TKT-08 | P1 - Criar, atualizar e reabrir chamados | Specify | Pending |
| TKT-09 | P1 - Criar, atualizar e reabrir chamados | Specify | Pending |
| TKT-10 | P1 - Criar, atualizar e reabrir chamados | Specify | Pending |
| TKT-11 | P1 - Criar, atualizar e reabrir chamados | Specify | Pending |
| TKT-12 | P1 - Criar, atualizar e reabrir chamados | Specify | Pending |
| TKT-13 | P1 - Criar, atualizar e reabrir chamados | Specify | Pending |
| TKT-14 | P1 - Criar, atualizar e reabrir chamados | Specify | Pending |
| TKT-15 | P1 - Criar, atualizar e reabrir chamados | Specify | Pending |
| TKT-16 | P1 - Criar, atualizar e reabrir chamados | Specify | Pending |
| TKT-17 | P1 - Prazo e vencimento | Specify | Pending |
| TKT-18 | P1 - Prazo e vencimento | Specify | Pending |
| TKT-19 | P1 - Prazo e vencimento | Specify | Pending |
| TKT-20 | P1 - Prazo e vencimento | Specify | Pending |
| TKT-21 | P1 - Prazo e vencimento | Specify | Pending |
| TKT-22 | P1 - Transferir para um analista | Specify | Pending |
| TKT-23 | P1 - Transferir para um analista | Specify | Pending |
| TKT-24 | P1 - Transferir para um analista | Specify | Pending |
| TKT-25 | P1 - Indisponibilidade e persistência | Specify | Pending |
| TKT-26 | P1 - Indisponibilidade e persistência | Specify | Pending |
| TKT-27 | P1 - Indisponibilidade e persistência | Specify | Pending |
| TKT-28 | P1 - Central de ajuda e dados de exemplo | Specify | Pending |
| TKT-29 | P1 - Central de ajuda e dados de exemplo | Specify | Pending |
| TKT-30 | P1 - Central de ajuda e dados de exemplo | Specify | Pending |
| TKT-31 | P1 - Central de ajuda e dados de exemplo | Specify | Pending |
| TKT-32 | P1 - Central de ajuda e dados de exemplo | Specify | Pending |
| TKT-33 | P1 - Central de ajuda e dados de exemplo | Specify | Pending |

**Coverage:** 33 critérios, todos mapeados a uma história.

## Sources

- `../../source/desafio-prd.md`: O que construir 4, Requisitos técnicos (persistência), Anexo A (tipos, categorias, prioridade, duplicidade, privacidade), Anexo B (seed).
- `../../source/prototipo.md`: status, números e eventos usados nas Telas 3, 4 e 5 (dados ilustrativos).

## Success Criteria

- [ ] Todos os testes de prazo passam com relógio fixo.
- [ ] Nenhuma consulta com a sessão de um funcionário devolve chamado de outro.
- [ ] Com `TICKETS_FAILURE_RATE=0.3`, cem criações com retentativa geram exatamente cem chamados.
