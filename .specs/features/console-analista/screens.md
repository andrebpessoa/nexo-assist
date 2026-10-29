# Console do analista screens

**Verifier**: independent sub-agent (author != verifier)
**Round**: 1

Fotos tiradas pelo verificador com Chromium (playwright-core), contexto aberto já no tamanho de cada captura (1440x900 e 1567x900, escala 1x), sem redimensionar. Caminho: Ana pediu analista de novo ("Quero falar com um analista"); Rafael abriu `/console`, escolheu o filtro e clicou em "Ana Souza" (04); depois "Assumir atendimento", resposta "Oi, Ana! Aqui é o Rafael…", Ana respondeu "Posso sim, está ligado." e Rafael deixou um rascunho no campo (05). Em 05 o filtro ativo é "Todas", porque depois de assumir "Para você" fica vazio e a captura mostra a Ana na lista. Dados (nomes, horas, contadores, quantas conversas existem, não lidas, N1/N2) vêm do seed e da caminhada e não contam como diferença.

| Screen | Compared with | Verdict | Finding |
| --- | --- | --- | --- |
| `captures/04-console-conversa-transferida.running.png` | `captures/04-console-conversa-transferida.png` | diverges | 15 rows differ |
| `captures/05-console-atendimento-assumido.running.png` | `captures/05-console-atendimento-assumido.png` | diverges | 13 rows differ |

### `captures/04-console-conversa-transferida.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| arranjo geral: trilho à esquerda, lista "Conversas", conversa no centro, painel "Chamados da Ana" à direita | same | |
| trilho: logo "N" no topo, ícone Conversas em botão destacado com badge numérico azul | same | badge "1" (dado) |
| trilho embaixo: só o avatar "RL" com ponto verde | differs | um botão extra de sair (ícone de saída) acima do avatar "RL" |
| cabeçalho da lista: título "Conversas" e chip verde "● Disponível" à direita | same | |
| campo "Pesquisar conversa ou chamado" com lupa | same | |
| filtros em chips: "Todas", "Para você N" (ativo, azul), "Com o agent N", "Minhas N" | same | |
| item da lista: avatar com iniciais e ponto de presença verde preso ao canto inferior direito do avatar | differs | o ponto verde fica solto abaixo e fora do avatar, sob a coluna das iniciais |
| item da lista: nome, hora à direita, prévia truncada, contador de não lidas, rótulo "● Transferida · INC-20311" em vermelho; item selecionado com fundo cinza | same | sem contador de não lidas (dado: zerado ao abrir); hora "20:54" sem azul (nota) |
| demais itens da lista (Carla, Bruno, Diego, Elisa, Fábio, Gabriela) com divisórias | same | só a Ana existe no seed para "Para você" (dado) |
| cabeçalho da conversa: avatar "AS", nome "Ana Souza", subtítulo "online · Financeiro · INC-20311" | differs | subtítulo "Financeiro · INC-20311", sem "online" (a spec só aprova tirar "digitando…" e ✓✓) |
| cabeçalho: selo "Aguardando atendente" com ícone à esquerda, lupa, "⋮" | differs | selo só com texto, sem o ícone |
| separador de dia "Hoje" em pílula com borda | differs | "Hoje" como texto solto, sem pílula |
| mensagem do funcionário: balão branco à esquerda com a hora dentro do balão, à direita do texto | differs | hora fora do balão, numa linha abaixo dele |
| mensagem do agent: rótulo "Nexo Assist" + chip "IA" acima, balão azul-claro com texto escuro à direita, hora (e ✓✓) dentro do balão | differs | balão azul saturado com texto branco; hora fora do balão, abaixo; rótulo traz a linha de ações (aprovada, AD-007) e o chip "IA" vai para a ponta direita |
| linha de sistema "⇄ Transferida para Suporte N2 · 10:05": ícone e traços horizontais dos dois lados | differs | só o texto centralizado, sem ícone e sem traços |
| conversa aberta mostrando o fim: últimas mensagens e a linha de transferência logo acima da faixa | differs | a conversa abre no topo (scrollTop 0 de 1143 px); a última mensagem do agent e "Transferida para Suporte N1 · 20:54" ficam fora da janela, abaixo |
| "digitando…" e ✓✓ | same | ausentes, como aprova AD-009 |
| faixa: ícone de mão em círculo, "Ana espera um atendente", "Agent pausado · até HH:MM", fundo branco | differs | sem o ícone de mão; faixa com fundo amarelado em caixa arredondada |
| botões da faixa: "Devolver ao agent" (contorno, ícone de robô) e "Assumir atendimento" (azul cheio, ícone de headset) | differs | os dois botões só com texto, sem ícones |
| campo desabilitado "Assuma o atendimento para responder" | same | |
| painel: cabeçalho "Chamados da Ana", "N abertos · M encerrados", X à direita | same | "3 abertos · 3 encerrados" (dado) |
| painel: rótulos de seção "Desta conversa" e "Outros chamados" | differs | rótulos em caixa alta: "DESTA CONVERSA", "OUTROS CHAMADOS" |
| cartão "Desta conversa": número, "● Aguardando analista" à direita, título em destaque, "Hardware · prioridade média", divisória e linha "⇄ Transferido para um analista" com hora à direita | differs | sem divisória e sem ícone; evento "Transferido para Suporte N1 · 20:54" com hora no texto; link extra "Ver detalhes ›"; cartão branco com borda em vez de fundo cinza |
| "Outros chamados": cada linha com ponto de cor à esquerda, título, subtítulo "INC-xxxxx · status", seta "›" à direita, divisórias | differs | três linhas por chamado: número em negrito com status ao lado (ponto antes do status), título, "atualizado …"; sem ponto à esquerda |
| botão "Ver todos os chamados da Ana ↗" preso ao pé do painel | differs | o botão fica logo abaixo da lista, no meio do painel, não no pé |

### `captures/05-console-atendimento-assumido.running.png`

| Element | Result | Picture draws |
| --- | --- | --- |
| arranjo geral: trilho, lista, conversa, painel "Chamados da Ana" | same | |
| trilho: logo "N", ícone Conversas com badge | same | sem badge porque "Para você" é 0 (dado, CON-11) |
| trilho embaixo: só o avatar "RL" com ponto verde | differs | botão extra de sair acima do avatar |
| cabeçalho da lista, "Disponível", busca e chips de filtro | same | filtro ativo "Todas" (ver nota no topo) |
| item da Ana: avatar com ponto de presença no canto do avatar, nome, hora, prévia "Posso sim, está ligado.", rótulo "● Você está atendendo" em azul | differs | o ponto verde fica solto abaixo do avatar; resto igual |
| demais itens da lista | same | não existem no seed (dado) |
| cabeçalho da conversa: avatar, "Ana Souza", subtítulo "online · Financeiro" | differs | subtítulo "Financeiro · INC-20311", sem "online" |
| cabeçalho: "Devolver ao agent" (contorno, ícone de robô), "Encerrar atendimento" (fundo vermelho-claro, texto vermelho, ícone) e "⋮"; sem lupa | differs | os dois botões sem ícones; "Encerrar atendimento" em vermelho cheio com texto branco; lupa extra entre os botões e o "⋮" |
| mensagens do funcionário: balão branco com hora dentro | differs | hora fora do balão, abaixo |
| mensagens do agent: "Nexo Assist" + chip "IA", balão azul-claro com texto escuro e hora dentro | differs | balão azul saturado com texto branco, hora fora do balão |
| linhas de sistema "⇄ Transferida para Suporte N2 · 10:05" e "headset Rafael Lima assumiu · agent pausado · 10:12" com ícone e traços dos dois lados | differs | só texto centralizado, sem ícones e sem traços |
| mensagem do analista: rótulo "Rafael Lima" + chip verde "Suporte N2", balão verde-claro com texto escuro e hora dentro | differs | rótulo "Rafael Lima · Suporte N2" em texto verde, sem chip; balão verde saturado com texto branco; hora fora |
| conversa no fim: a resposta do Rafael e "Posso sim, está ligado." visíveis logo acima do campo | differs | a conversa abre no topo (scrollTop 0 de 1263 px); a linha "Rafael Lima assumiu", a resposta do Rafael e a da Ana ficam fora da janela |
| ✓✓ | same | ausentes (AD-009) |
| campo de resposta habilitado com o rascunho e botão redondo azul de enviar à direita | same | |
| painel: cabeçalho, contagem, X | same | |
| rótulos "Desta conversa" e "Outros chamados" | differs | em caixa alta |
| cartão "Desta conversa": número, "● Em atendimento", título, "Hardware · prioridade média", divisória e "headset Assumido por Rafael Lima" com hora à direita | differs | status sem ponto; sem divisória e sem ícone; "Assumido por Rafael Lima · 20:59" com hora no texto; link extra "Ver detalhes ›" |
| "Outros chamados": ponto à esquerda, título, "INC · status", seta, divisórias | differs | três linhas por chamado (número + status, título, "atualizado …"), sem ponto à esquerda |
| botão "Ver todos os chamados da Ana ↗" no pé do painel | differs | logo abaixo da lista, no meio do painel |
