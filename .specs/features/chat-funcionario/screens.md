# Chat do funcionário screens

**Verifier**: self-verified (degraded - no sub-agent); pictures taken by the author's walk at 1440x900 on the box (ports 3100/3101, seed, keyword understander)
**Round**: 1

| Screen | Compared with | Verdict | Finding |
| --- | --- | --- | --- |
| `captures/02-chat-novo-chamado.running.png` | `captures/02-chat-novo-chamado.png` | matches | same controls and arrangement; text and times come from the seed and the keyword understander |
| `captures/03-chat-consulta-transferencia.running.png` | `captures/03-chat-consulta-transferencia.png` | matches | same controls and arrangement; the list has the two VPN tickets the walk created |

### `captures/02-chat-novo-chamado.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| barra lateral: logo, "Atendimento" ativo, "Meu perfil", Ana Souza com e-mail e "Sair" | same | |
| barra superior "Service desk de TI › Atendimento" e selo verde "Assistente online" à direita | same | |
| mensagem do funcionário à direita, fundo escuro | same | |
| "Nexo Assist" com as ações ✓ acima de cada resposta | same | |
| pergunta "Quem está sendo afetado?" com as opções e a escolhida destacada | same | as opções levam o número da tecla (CHAT-10) |
| card "Novo chamado · Rascunho …" com "Aguardando confirmação", título, descrição, Categoria, Tipo, Prioridade "· resposta até HH:MM", Afetados | same | a captura não tem a coluna Tipo, que CHAT-17 pede |
| barra do card: "Confirmar ⌘↵" azul, "Editar", "Cancelar" | same | |
| campo "Escreva para o Nexo...", "Enviar" e "N/30 mensagens nesta sessão" | same | |

### `captures/03-chat-consulta-transferencia.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| lista de chamados: rádio, número, título, status colorido com ponto, data | same | |
| a escolha volta como "<número> · <título>" à direita | same | |
| card "Chamado · INC-20311" com status, título, Categoria, Prioridade, Aberto em, Última atualização | same | a descrição não aparece: `TicketView` não a traz (desvio 4) |
| "há N dias" e "· prazo vencido" na cor de alerta | same | |
| pergunta "Quer que eu chame um analista?" com "Falar com um analista", "Adicionar informação", "Não, obrigado" | same | |
| campo, Enviar e contador | same | |
