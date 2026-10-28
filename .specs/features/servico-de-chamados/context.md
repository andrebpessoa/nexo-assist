# Serviço de chamados Context

**Gathered:** 2026-10-28
**Spec:** `.specs/features/servico-de-chamados/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Um serviço simulado de chamados e central de ajuda, separado do agent, com interface própria (consultar, detalhar, criar, atualizar, reabrir, transferir, buscar artigos), prazo calculado pela tabela do Anexo A, indisponibilidade simulada, persistência e seed do Anexo B. É também a barreira de privacidade: o funcionário só vê os próprios chamados. Telas, agent e login ficam nas outras features.

---

## Implementation Decisions

Todas vêm da spec aprovada em 2026-10-28 (André: "Aprovo todas as recomendações Q-01 a Q-16"). Não houve discussão nova nesta fase.

### Precedência das fontes

- O PDF manda nas regras (tipos, categorias, prioridade, prazos, privacidade, seed); o protótipo só empresta status, números e rótulos de eventos (AD-002).

### Prazo e horário útil

- Segunda a sexta, 08:00-18:00, America/Sao_Paulo, sem feriados.
- Crítica: 1 hora corrida. Alta: 4 horas úteis. Média: 3 dias úteis. Baixa: 5 dias úteis. Um dia útil = 10 horas úteis.
- O prazo conta da última atualização da equipe (abertura, reabertura, analista, transferência). Complemento do funcionário não reinicia.

### Ciclo de vida do chamado

- Status: Aguardando analista, Em andamento, Em atendimento, Aprovado, Resolvido, Fechado, Cancelado. Abertos = todos menos Resolvido, Fechado e Cancelado.
- Chamado novo e reaberto ficam em "Aguardando analista". Reabrir só até 7 dias depois de Resolvido.
- Transferência grava resumo e equipe (Suporte N1 ou N2); analista assumindo passa para "Em atendimento".
- O campo "Tipo" (INC ou REQ) é obrigatório e aparece no card (AD-003).

### Falhas e persistência

- `TICKETS_FAILURE_RATE` (padrão 0,1) sorteia `SERVICE_UNAVAILABLE` antes de qualquer gravação; desligável nos testes.
- Criação idempotente por chave.
- Rodar localmente não pode exigir login Cloudflare (AD-012); o caminho local é decidido no Design de `entrega`.

### Agent's Discretion

- Estrutura interna (pacote, repositório, nomes de tabelas), algoritmo de busca na central e forma do seed, desde que os critérios TKT-01 a TKT-33 passem por testes.
- Como medir o "tempo de atraso" de TKT-19: horas úteis para Alta, Média e Baixa; minutos corridos para Crítica.

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma nova. As da spec (`## Assumptions & Open Questions`) estão todas confirmadas.

---

## Specific References

- Anexo B do PDF: Ana Souza (Financeiro, Windows 11), Rafael Lima (Suporte N2), INC-20311 vencido em "Aguardando analista", REQ-10442 aprovado, INC-20150 resolvido há 4 dias, artigo da VPN erro 809 (só Windows 10) e artigo do horário do service desk.
- Telas 03, 04 e 05 do protótipo: "Transferido para um analista 10:05", "Assumido por Rafael Lima", "Hardware › Notebook".

---

## Deferred Ideas

- Feriados no horário útil.
- Anexos em chamados.
- Edição da central de ajuda por tela.
- Fluxo de aprovação de REQ pela aplicação.
