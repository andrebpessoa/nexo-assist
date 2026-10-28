# Transparência screens

**Verifier**: self-verified (degraded - no sub-agent); pictures taken in the `chat-funcionario` walk at 1440x900
**Round**: 1

| Screen | Compared with | Verdict | Finding |
| --- | --- | --- | --- |
| `captures/02-chat-novo-chamado.running.png` | `../chat-funcionario/captures/02-chat-novo-chamado.png` | matches | a linha de ações fica acima de cada resposta, como na captura |
| `captures/03-chat-consulta-transferencia.running.png` | `../chat-funcionario/captures/03-chat-consulta-transferencia.png` | matches | "consultou o INC-20311 · calculou o prazo" como na captura |
| `captures/02b-painel-por-que.running.png` | sem captura (painel proposto em TRN-06) | matches | painel à direita, conversa visível ao lado |

### `captures/02-chat-novo-chamado.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| "Nexo Assist" em negrito e as ações com "✓" na ordem | same | |
| linha clicável que abre o painel | same | |

### `captures/02b-painel-por-que.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| "Por que o Nexo fez isso" com fechar | same | |
| O que entendi, O que fiz, Confiança, Por quê, Passos, Tempo | same | o funcionário não vê modelo, tokens nem custo (TRN-13) |
