# Agent Nexo Assist: decisões pelo Anexo A

**Approved**: 2026-10-28 - user: "Aprovo todas as recomendações Q-01 a Q-16"

Tamanho: Complex · Fonte: PDF (O que construir 3 e 5, Anexo A) + protótipo (conteúdo das Telas 02 e 03) · Status: Specify aprovado em 2026-10-28

## Problem Statement

A cada mensagem do funcionário o agent decide o que fazer: responder pela central de ajuda, consultar um chamado, complementar, abrir, reabrir ou transferir. Hoje os chamados chegam com prioridade errada, duplicados e incompletos. O agent resolve isso seguindo o Anexo A: pergunta o que falta, mostra um rascunho, só age depois do "Confirmar" e chama um analista na hora certa com um resumo. Regras que mudam o resultado (prioridade, prazo, privacidade, estados da conversa) ficam em código testado; o modelo entende a mensagem e escolhe a ação.

## Goals

- [ ] Cada mensagem gera uma decisão registrada: intenção, ação, confiança e porquê.
- [ ] Nenhum chamado é criado, atualizado ou reaberto sem confirmação, e nenhum é duplicado.
- [ ] Prioridade calculada em código a partir de impacto e urgência, com a frase que explica a escolha.
- [ ] Transferência nos quatro gatilhos do Anexo A, com resumo, e o agent calado enquanto o analista atende.
- [ ] Um conjunto de conversas de avaliação que mede as decisões com um comando.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Assuntos de RH, financeiro e facilities | Anexo A: só TI; o agent redireciona. |
| Ações técnicas no computador do funcionário | O agent só mexe em chamados e na central. |
| Idiomas além do português | Público da Nexo; não citado. |
| Voz e anexos de imagem | Não citados. |
| Treinar ou ajustar o modelo | Fora do prazo e do pedido. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Framework e modelo (Q-11) | Mastra com Google Gemini pelo free tier do Google AI Studio: um modelo Flash com tool calling, chamado pelo model router do Mastra (`google/<modelo>`). Modelo e provedor vêm de `LLM_MODEL`; a chave, de `GOOGLE_GENERATIVE_AI_API_KEY`. O modelo padrão exato sai do Design do agent. | O André escolheu um provedor gratuito. O PDF prefere Mastra e pede uso consciente do modelo. | y - recomendação aprovada (AD-008) |
| Vencido (Q-03) | Oferecer transferência e transferir no "sim". | O protótipo pergunta "Quer que eu chame um analista?"; o PDF pede confirmar antes de agir. | y - recomendação aprovada (AD-004) |
| Limiar de confiança (Q-10) | Abaixo de 60%, não age e transfere. | O console mostra "Agent pediu ajuda · confiança 41%". | y - recomendação aprovada (AD-007) |
| Prazo de contato na transferência (Q-04) | 2 horas úteis; Crítica 1 hora corrida. | Mensagem do protótipo: "em até 2 h úteis". | y - recomendação aprovada (AD-004) |
| Equipe de destino | Crítica e vencidos: Suporte N2. Os demais: Suporte N1. | No protótipo o vencido vai para N2. | y - recomendação aprovada em 2026-10-28 |
| Afetados "Não sei" | Tratar como "Só eu" para a prioridade e anotar "impacto não confirmado" na descrição. | Evita pergunta em loop e não infla a prioridade. | y - recomendação aprovada em 2026-10-28 |
| "Mesmo problema" para duplicidade | Mesmo tipo e categoria e o modelo julga o mesmo sintoma com confiança de 60% ou mais. | O Anexo A não define; comparar só texto falha em sinônimos. | y - recomendação aprovada em 2026-10-28 |
| "Editar" no rascunho | Abre os campos do rascunho para edição na própria mensagem; a prioridade é recalculada se afetados ou urgência mudam. | O protótipo não desenha a edição. | y - recomendação aprovada em 2026-10-28 |
| Confirmação por texto | "sim", "pode criar" e equivalentes valem como Confirmar só quando há um único rascunho pendente. | Conversa natural sem risco de confirmar o rascunho errado. | y - recomendação aprovada em 2026-10-28 |
| Janela de contexto enviada ao modelo | As últimas 20 mensagens mais um resumo das anteriores. | Custo por conversa; PDF pede uso consciente. | y - recomendação aprovada em 2026-10-28 |
| Texto de redirecionamento fora de TI | "Eu cuido só de TI. Para <assunto>, fale com <área> pelo portal interno." | O Anexo A pede redirecionar, sem texto. | y - recomendação aprovada em 2026-10-28 |

**Open questions:** none - Q-01, Q-03, Q-04, Q-10, Q-11 respondidas em 2026-10-28 ("Aprovo todas as recomendações Q-01 a Q-16"); decisões em `STATE.md` (AD-002, AD-004, AD-007, AD-008).

## User Stories

### P1: Decidir o que fazer a cada mensagem ⭐ MVP

**User Story**: Como funcionário, quero descrever o problema com minhas palavras e o agent saber o que fazer.

**Why P1**: O que construir 3.

**Acceptance Criteria**:

1. WHEN chega uma mensagem do funcionário numa conversa com o agent THEN o agent SHALL classificar a intenção em `duvida`, `consultar_chamado`, `complementar_chamado`, `abrir_chamado`, `falar_com_analista`, `fora_de_escopo` ou `outro`, com confiança de 0 a 100%. [PDF] `AGT-01`
2. The agent SHALL registrar para cada resposta um registro de decisão com intenção, dados extraídos, ação, confiança, justificativa, regra do Anexo A aplicada e ferramentas chamadas (formato em `transparencia`). [PDF] `AGT-02`
3. The agent SHALL afirmar fatos sobre chamados, prazos e procedimentos só a partir do retorno das ferramentas ou da conversa. [PDF] `AGT-03`
4. IF falta uma informação para decidir THEN o agent SHALL perguntar uma coisa por vez, com opções rápidas quando a resposta tem lista fechada. [PDF] `AGT-04`
5. WHEN a intenção é `outro` (saudação, agradecimento, mensagem vaga) THEN o agent SHALL responder curto e perguntar como pode ajudar, sem chamar ferramentas. [Proposta] `AGT-05`
6. IF a mensagem pede para ignorar as regras ou agir por outra pessoa THEN o agent SHALL seguir o Anexo A e dizer o que pode fazer. [Proposta] `AGT-06`
7. The agent SHALL manter as referências da conversa ("ele", "esse chamado", "a reunião") em toda a conversa, inclusive depois de reiniciar a aplicação. [PDF] `AGT-07`

**Independent Test**: As conversas de avaliação (AGT-45) classificam cada mensagem com a intenção esperada.

---

### P1: Tirar dúvida pela central de ajuda ⭐ MVP

**User Story**: Como funcionário, quero tirar uma dúvida sem abrir chamado.

**Why P1**: História 1 e "resolução sem fila".

**Acceptance Criteria**:

1. WHEN a intenção é `duvida` ou `abrir_chamado` THEN o agent SHALL buscar na central de ajuda antes de responder ou de montar rascunho. [PDF] `AGT-08`
2. WHEN um artigo responde e a condição dele vale para o funcionário THEN o agent SHALL responder com os passos do artigo, citar o título e não abrir chamado. [PDF] `AGT-09`
3. IF a condição do artigo não vale para o funcionário (ex.: erro 809 com Windows 11) THEN o agent SHALL dizer por que o artigo não serve e seguir para abrir chamado. [Protótipo] `AGT-10`
4. IF nenhum artigo responde THEN o agent SHALL dizer que não achou na central e oferecer abrir um chamado. [Proposta] `AGT-11`

**Independent Test**: "Qual o horário do service desk?" responde pelo artigo sem chamado; "erro 809" vindo de Windows 11 leva a rascunho.

---

### P1: Consultar status sem lembrar o número ⭐ MVP

**User Story**: Como funcionário, quero saber o status do meu chamado e se está atrasado.

**Why P1**: História 2.

**Acceptance Criteria**:

1. WHEN o funcionário pergunta por um chamado sem dizer qual e tem mais de um aberto THEN o agent SHALL mostrar a lista de seleção dos abertos (número, título, status, data de abertura) e perguntar "Sobre qual deles quer saber?". [Protótipo] `AGT-12`
2. WHEN o funcionário tem um só chamado aberto THEN o agent SHALL mostrar esse chamado sem perguntar. [Proposta] `AGT-13`
3. WHEN o funcionário não tem chamado aberto THEN o agent SHALL dizer isso e oferecer abrir um chamado. [Proposta] `AGT-14`
4. WHEN o chamado é identificado por número, seleção ou descrição THEN o agent SHALL mostrar o card do chamado com status, categoria, prioridade, aberto em e última atualização. [Protótipo] `AGT-15`
5. IF o chamado está vencido THEN o agent SHALL dizer há quanto tempo está sem atualização, qual era o prazo da prioridade, e oferecer "Falar com um analista", "Adicionar informação" e "Não, obrigado". [Protótipo] `AGT-16`
6. IF o número citado não existe ou é de outro funcionário THEN o agent SHALL responder "Não encontrei esse chamado entre os seus." sem dizer se ele existe. [PDF] `AGT-17`
7. IF o funcionário pede dados de chamados de outra pessoa THEN o agent SHALL recusar e explicar que cada um vê só os próprios chamados. [PDF] `AGT-18`

**Independent Test**: Ana pergunta "Qual o status do meu chamado?", escolhe INC-20311 e recebe o card com "prazo vencido" e as três opções.

---

### P1: Abrir chamado conversando, sem duplicar ⭐ MVP

**User Story**: Como funcionário, quero abrir um chamado só conversando e conferir antes de criar.

**Why P1**: História 4 e "chamados bem abertos".

**Acceptance Criteria**:

1. WHEN a intenção é `abrir_chamado` THEN o agent SHALL consultar os chamados do funcionário antes de montar o rascunho. [PDF] `AGT-19`
2. IF existe um chamado aberto sobre o mesmo problema THEN o agent SHALL propor complementar esse chamado em vez de criar outro. [PDF] `AGT-20`
3. IF existe um chamado resolvido há 7 dias ou menos sobre o mesmo problema THEN o agent SHALL propor reabri-lo. [PDF] `AGT-21`
4. IF o chamado parecido foi resolvido há mais de 7 dias THEN o agent SHALL propor um chamado novo que cita o número antigo na descrição. [Proposta] `AGT-22`
5. The agent SHALL inferir tipo (INC quando algo parou ou não funciona; REQ para acesso, equipamento ou software) e categoria pela descrição e perguntar só quando a confiança fica abaixo de 60%. [PDF] `AGT-23`
6. WHEN falta saber quem é afetado THEN o agent SHALL perguntar "Quem está sendo afetado?" com as opções "Só eu", "Minha equipe", "Toda a empresa" e "Não sei". [Protótipo] `AGT-24`
7. The sistema SHALL calcular a prioridade em código a partir de impacto e urgência extraídos: Crítica se está parado para uma equipe ou a empresa; Alta se impede uma pessoa de trabalhar ou há compromisso no mesmo dia; Média se atrapalha mas há alternativa; Baixa para pedidos e melhorias sem urgência. [PDF] `AGT-25`
8. WHEN o funcionário responde "Não sei" sobre os afetados THEN o sistema SHALL calcular como "Só eu" e anotar "impacto não confirmado" na descrição. [Proposta] `AGT-26`
9. WHEN todos os campos estão completos THEN o agent SHALL mostrar o rascunho com título, descrição, tipo, categoria, prioridade com o horário-limite da resposta, afetados e status "Aguardando confirmação", e explicar a prioridade numa frase. [PDF] `AGT-27`
10. The agent SHALL criar, complementar ou reabrir um chamado só depois do "Confirmar" do funcionário para aquele rascunho. [PDF] `AGT-28`
11. WHEN o funcionário confirma THEN o agent SHALL executar exatamente uma vez e responder com o número do chamado e o prazo. [PDF] `AGT-29`
12. WHEN o funcionário usa "Editar" THEN o agent SHALL abrir os campos do rascunho para edição e recalcular a prioridade se afetados ou urgência mudarem. [Proposta] `AGT-30`
13. WHEN o funcionário usa "Cancelar" THEN o agent SHALL descartar o rascunho e dizer que nada foi criado. [Protótipo] `AGT-31`
14. WHERE há um único rascunho pendente o agent SHALL aceitar "sim", "pode criar" e equivalentes como Confirmar. [Proposta] `AGT-32`

**Independent Test**: Conversa da Tela 02: VPN erro 809, Windows 11, "Só eu", reunião às 14h. O rascunho sai com Rede e VPN, INC, Alta, e o chamado só existe depois do Confirmar.

---

### P1: Complementar um chamado aberto ⭐ MVP

**User Story**: Como funcionário, quero acrescentar informação a um chamado aberto.

**Why P1**: História 3.

**Acceptance Criteria**:

1. WHEN o funcionário quer acrescentar informação THEN o agent SHALL identificar o chamado (perguntando se houver mais de um aberto) e mostrar um rascunho de atualização com o número e o texto que será anexado. [PDF] `AGT-33`
2. WHEN o funcionário confirma a atualização THEN o agent SHALL anexar a nota e confirmar com o número do chamado. [PDF] `AGT-34`

**Independent Test**: "Adicionar informação" no INC-20311 anexa a nota e ela aparece no detalhe do chamado.

---

### P1: Transferir para um analista ⭐ MVP

**User Story**: Como funcionário, quero falar com um analista quando prefiro ou quando é grave; como analista, quero receber o caso com contexto.

**Why P1**: História 5 do funcionário, histórias 1 e 2 do analista, O que construir 5.

**Acceptance Criteria**:

1. WHEN o funcionário pede um analista THEN o agent SHALL transferir sem tentar resolver antes. [PDF] `AGT-35`
2. WHEN um chamado Crítico é confirmado THEN o agent SHALL criar o chamado e transferir na mesma resposta. [PDF] `AGT-36`
3. WHEN o funcionário aceita a oferta de analista num chamado vencido THEN o agent SHALL transferir. [Protótipo] `AGT-37`
4. IF a confiança da decisão fica abaixo do limiar THEN o agent SHALL não executar a ação e transferir com o motivo "Agent pediu ajuda" e a confiança. [PDF] `AGT-38`
5. WHEN o agent transfere THEN o agent SHALL gravar no chamado e na conversa um resumo com problema, o que já foi tentado, chamado relacionado, prioridade e motivo da transferência, e dizer ao funcionário a equipe e o prazo de contato. [PDF] `AGT-39`
6. WHILE a conversa está aguardando atendente ou com um analista o agent SHALL não responder e não chamar o modelo. [PDF] `AGT-40`
7. WHEN o analista devolve a conversa ao agent THEN o agent SHALL retomar levando em conta as mensagens trocadas com o analista. [PDF] `AGT-41`

**Independent Test**: Depois de "Falar com um analista", a conversa fica "Aguardando atendente", o chamado ganha o evento com resumo e novas mensagens do funcionário não geram resposta do agent.

---

### P1: Escopo e falhas ⭐ MVP

**User Story**: Como Nexo, quero que o agent fique em TI e que uma falha do legado ou do modelo não quebre a conversa.

**Why P1**: Anexo A (escopo) e Também esperado (tratamento de erro).

**Acceptance Criteria**:

1. WHEN a intenção é `fora_de_escopo` (RH, financeiro, facilities) THEN o agent SHALL dizer que cuida só de TI e indicar a área certa, sem abrir chamado. [PDF] `AGT-42`
2. IF o serviço de chamados responde `SERVICE_UNAVAILABLE` THEN o agent SHALL tentar de novo até 3 vezes, esperando 0,5 s, 1 s e 2 s, com a mesma chave de idempotência. [PDF] `AGT-43`
3. IF o serviço continua fora depois das tentativas, ou o modelo falha ou passa de 30 s THEN o agent SHALL dizer o que não conseguiu fazer, manter o rascunho pendente e permitir tentar de novo sem perder a mensagem. [PDF] `AGT-44`
4. IF o provedor do modelo responde 429 ou outro erro de limite de uso THEN o agent SHALL esperar o tempo indicado pelo provedor (padrão 2 s) e tentar no máximo mais uma vez dentro do limite de 30 s; se continuar limitado, SHALL responder "Estou recebendo muitas solicitações agora. Tente de novo em alguns instantes ou fale com um analista.", manter a mensagem e o rascunho e não abrir chamado. [Proposta] `AGT-47`

**Independent Test**: Com `TICKETS_FAILURE_RATE=1`, Confirmar mostra o aviso e o rascunho continua lá; com a taxa de volta a 0, "Tentar de novo" cria um chamado só.

---

### P2: Medir a qualidade das decisões

**User Story**: Como avaliador, quero ver como a qualidade das decisões foi garantida.

**Why P2**: README pede "como garantiu a qualidade das decisões"; critério "Qualidade das decisões".

**Acceptance Criteria**:

1. The repositório SHALL ter pelo menos 20 conversas roteirizadas com a intenção, a ação, o tipo, a categoria e a prioridade esperados, cobrindo cada regra do Anexo A, rodadas por um comando que imprime a taxa de acerto. [Proposta] `AGT-45`
2. The agent SHALL mandar ao modelo no máximo as últimas 20 mensagens mais um resumo das anteriores, e registrar tokens e custo estimado por resposta. [PDF] `AGT-46`

**Independent Test**: O comando de avaliação roda e mostra acertos por regra.

---

## Edge Cases

- O funcionário manda duas mensagens seguidas antes da resposta: o agent responde às duas juntas, na ordem.
- O funcionário muda de assunto com um rascunho pendente: o rascunho fica pendente e o agent pergunta se descarta antes de abrir outro.
- O chamado muda de status entre a consulta e a confirmação (um analista resolveu): a confirmação falha com `TICKET_CLOSED` e o agent propõe reabrir.
- Mensagem só com número ("INC-20311"): vale como consulta desse chamado.

## Implicit-Requirement Dimensions

| Dimension | Coverage |
| --- | --- |
| Input validation & bounds | AGT-04, AGT-06; tamanho de mensagem em CHAT-17 |
| Failure / partial-failure states | AGT-44 |
| Idempotency / retry / duplicate handling | AGT-20, AGT-21, AGT-29, AGT-43 |
| Auth boundaries & rate limits | AGT-17, AGT-18; identidade vem da sessão (TKT-06); limite de 30 mensagens em CHAT |
| Concurrency / ordering | Edge cases de mensagens seguidas e de status que muda; AGT-40 |
| Data lifecycle / expiry | AGT-21, AGT-22 (janela de 7 dias); AGT-07 |
| Observability | AGT-02, AGT-46 |
| External-dependency failure | AGT-43, AGT-44, AGT-47 |
| State-transition integrity | AGT-28, AGT-40, AGT-41; estados da conversa no console (CON) |

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AGT-01 | P1 - Decidir o que fazer a cada mensagem | Specify | Pending |
| AGT-02 | P1 - Decidir o que fazer a cada mensagem | Specify | Pending |
| AGT-03 | P1 - Decidir o que fazer a cada mensagem | Specify | Pending |
| AGT-04 | P1 - Decidir o que fazer a cada mensagem | Specify | Pending |
| AGT-05 | P1 - Decidir o que fazer a cada mensagem | Specify | Pending |
| AGT-06 | P1 - Decidir o que fazer a cada mensagem | Specify | Pending |
| AGT-07 | P1 - Decidir o que fazer a cada mensagem | Specify | Pending |
| AGT-08 | P1 - Tirar dúvida pela central de ajuda | Specify | Pending |
| AGT-09 | P1 - Tirar dúvida pela central de ajuda | Specify | Pending |
| AGT-10 | P1 - Tirar dúvida pela central de ajuda | Specify | Pending |
| AGT-11 | P1 - Tirar dúvida pela central de ajuda | Specify | Pending |
| AGT-12 | P1 - Consultar status sem lembrar o número | Specify | Pending |
| AGT-13 | P1 - Consultar status sem lembrar o número | Specify | Pending |
| AGT-14 | P1 - Consultar status sem lembrar o número | Specify | Pending |
| AGT-15 | P1 - Consultar status sem lembrar o número | Specify | Pending |
| AGT-16 | P1 - Consultar status sem lembrar o número | Specify | Pending |
| AGT-17 | P1 - Consultar status sem lembrar o número | Specify | Pending |
| AGT-18 | P1 - Consultar status sem lembrar o número | Specify | Pending |
| AGT-19 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-20 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-21 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-22 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-23 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-24 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-25 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-26 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-27 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-28 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-29 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-30 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-31 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-32 | P1 - Abrir chamado conversando, sem duplicar | Specify | Pending |
| AGT-33 | P1 - Complementar um chamado aberto | Specify | Pending |
| AGT-34 | P1 - Complementar um chamado aberto | Specify | Pending |
| AGT-35 | P1 - Transferir para um analista | Specify | Pending |
| AGT-36 | P1 - Transferir para um analista | Specify | Pending |
| AGT-37 | P1 - Transferir para um analista | Specify | Pending |
| AGT-38 | P1 - Transferir para um analista | Specify | Pending |
| AGT-39 | P1 - Transferir para um analista | Specify | Pending |
| AGT-40 | P1 - Transferir para um analista | Specify | Pending |
| AGT-41 | P1 - Transferir para um analista | Specify | Pending |
| AGT-42 | P1 - Escopo e falhas | Specify | Pending |
| AGT-43 | P1 - Escopo e falhas | Specify | Pending |
| AGT-44 | P1 - Escopo e falhas | Specify | Pending |
| AGT-45 | P2 - Medir a qualidade das decisões | Specify | Pending |
| AGT-46 | P2 - Medir a qualidade das decisões | Specify | Pending |
| AGT-47 | P1 - Escopo e falhas | Specify | Pending |

**Coverage:** 47 critérios, todos mapeados a uma história.

## Sources

- `../../source/desafio-prd.md`: Contexto, histórias do funcionário e do analista, O que construir 3 e 5, Anexo A inteiro, Também esperado (eficiência, segurança).
- Capturas `../chat-funcionario/captures/02-chat-novo-chamado.png` e `../chat-funcionario/captures/03-chat-consulta-transferencia.png`: o diálogo que o agent conduz. Elas pertencem à spec `chat-funcionario`, que verifica a tela.

## Success Criteria

- [ ] Taxa de acerto de pelo menos 90% nas conversas de avaliação.
- [ ] Zero chamados criados sem confirmação e zero duplicados nas conversas de avaliação.
- [ ] Prioridade, prazo, privacidade e estados da conversa cobertos por testes de unidade sem LLM.
