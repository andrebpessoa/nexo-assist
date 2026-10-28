# Protótipo (Pencil) - textos e tokens

> Extraído de https://app.pen.dev/s/swhm7Xfy1krKDIc-QyqE9J8ZI2xFB0qbNvHIncCXcLg em 28/10/2026 (arquivo `nexo.pen`, versão 2.21; cópia descomprimida em `prototipo-nexo.pen.json`). Os dados exibidos são ilustrativos (PDF, Anexo C).

## Frames

| Frame | Tamanho | Captura |
| --- | --- | --- |
| Identificação (desktop) | 1440x900 | features/acesso/captures/01-login.png |
| Chat — Novo chamado (desktop) | 1440x900 | features/chat-funcionario/captures/02-chat-novo-chamado.png |
| Chat — Consulta e transferência (desktop) | 1440x900 | features/chat-funcionario/captures/03-chat-consulta-transferencia.png |
| Atendente — Conversas (desktop) | 1440x900 | features/console-analista/captures/04-console-conversa-transferida.png |
| Atendente — Atendimento assumido (desktop) | 1567x900 | features/console-analista/captures/05-console-atendimento-assumido.png |
| Cliente — Meu perfil (desktop) | 1440x900 | features/acesso/captures/06-cliente-meu-perfil.png (não citado no PDF) |

## Tokens (variables)

```json
{
 "bg": {
  "type": "color",
  "value": "#FCFCFC"
 },
 "surface": {
  "type": "color",
  "value": "#FFFFFF"
 },
 "card": {
  "type": "color",
  "value": "#F5F5F5"
 },
 "card-strong": {
  "type": "color",
  "value": "#EDEDED"
 },
 "fg": {
  "type": "color",
  "value": "#0B0B0B"
 },
 "muted": {
  "type": "color",
  "value": "#636363"
 },
 "subtle": {
  "type": "color",
  "value": "#8E8E8E"
 },
 "border": {
  "type": "color",
  "value": "#0B0B0B14"
 },
 "border-strong": {
  "type": "color",
  "value": "#0B0B0B24"
 },
 "primary": {
  "type": "color",
  "value": "#0285F7"
 },
 "primary-hover": {
  "type": "color",
  "value": "#0071D6"
 },
 "primary-soft": {
  "type": "color",
  "value": "#0285F712"
 },
 "primary-text": {
  "type": "color",
  "value": "#0069C7"
 },
 "success": {
  "type": "color",
  "value": "#00BD6C"
 },
 "success-soft": {
  "type": "color",
  "value": "#00BD6C14"
 },
 "success-text": {
  "type": "color",
  "value": "#00804A"
 },
 "warning": {
  "type": "color",
  "value": "#F5A500"
 },
 "warning-soft": {
  "type": "color",
  "value": "#F5A50018"
 },
 "warning-text": {
  "type": "color",
  "value": "#946300"
 },
 "danger": {
  "type": "color",
  "value": "#EE343B"
 },
 "danger-soft": {
  "type": "color",
  "value": "#EE343B12"
 },
 "danger-text": {
  "type": "color",
  "value": "#C4161D"
 },
 "violet": {
  "type": "color",
  "value": "#A37AFF"
 },
 "violet-soft": {
  "type": "color",
  "value": "#A37AFF16"
 },
 "violet-text": {
  "type": "color",
  "value": "#6B3FE0"
 },
 "font-sans": {
  "type": "string",
  "value": "Geist"
 },
 "font-mono": {
  "type": "string",
  "value": "Geist Mono"
 },
 "radius-sm": {
  "type": "number",
  "value": 6
 },
 "radius-md": {
  "type": "number",
  "value": 10
 },
 "radius-lg": {
  "type": "number",
  "value": 14
 },
 "font-display": {
  "type": "string",
  "value": "Newsreader"
 },
 "font-ui": {
  "type": "string",
  "value": "Schibsted Grotesk"
 },
 "font-data": {
  "type": "string",
  "value": "IBM Plex Mono"
 },
 "paper": {
  "type": "color",
  "value": "#FFFFFF"
 },
 "desk": {
  "type": "color",
  "value": "#F6F7F9"
 },
 "ink": {
  "type": "color",
  "value": "#1B2431"
 },
 "ink-2": {
  "type": "color",
  "value": "#3D4656"
 },
 "ink-3": {
  "type": "color",
  "value": "#5B6472"
 },
 "rule": {
  "type": "color",
  "value": "#E6E8EC"
 },
 "cta": {
  "type": "color",
  "value": "#0062C4"
 }
}
```

## Árvore de textos

```text
frame Identificação (desktop) 
  frame Showcase 
    frame Brand 
      text Name 'Nexo Assist'
    frame Story 
        text Eyebrow 'Service desk de TI da Nexo'
        text Title 'Seu problema de TI, resolvido em uma conversa.'
        text Body 'Descreva o que está acontecendo. O assistente consulta seus chamados, busca na central de ajuda e chama um analista quando precisa.'
              text Text 'Meu notebook não conecta na VPN. Erro 809.'
              text Name 'Nexo Assist'
              text Steps 'consultou seus chamados · criou um chamado'
              text Text 'Pronto: abri o chamado com prioridade alta. Um analista fala com você em até 4 h úteis.'
              text Number 'INC-20517'
              text Meta 'Rede e VPN · Alta · em até 4 h'
    frame Stats 
          text Number '8 s'
        text Label 'primeira resposta, em média'
          text Number '72%'
        text Label 'resolvidos sem fila'
          text Number '6'
        text Label 'analistas online agora'
  frame Sign In 
    frame Help 
      text Q 'Problema para entrar?'
      text Link 'Ligue no ramal 4000'
    frame Center 
          text Title 'Entrar'
          text Subtitle 'Use seu e-mail corporativo e a senha da rede Nexo.'
              text Label 'E-mail corporativo'
              text Value 'ana.souza@nexo.com.br'
              text Label 'Senha'
              text Link 'Esqueci minha senha'
              text Value '••••••••••'
            text Label 'Manter conectado neste computador'
          text Label 'Entrar'
    frame Footer 
      text Copy '© 2026 Nexo · Service desk de TI'
      text Privacy 'Privacidade e uso de dados'
frame Chat — Novo chamado (desktop) 
  frame Sidebar 
    frame Logo 
      text Name 'Nexo Assist'
    frame Gap1 
    frame Nav 
        text Label 'Atendimento'
        text Label 'Meu perfil'
    frame Spacer 
    frame User 
        text Initials 'AS'
        text Name 'Ana Souza'
        text Email 'ana.souza@nexo.com.br'
    frame Sair 
      text Label 'Sair'
  frame Main 
    frame Top Bar 
        text Root 'Service desk de TI'
        text Here 'Atendimento'
        text Label 'Assistente online'
    frame Columns 
              text Text 'Meu notebook não conecta na VPN desde ontem. Aparece o erro 809.'
              text Who 'Nexo Assist'
                text Label 'consultou seus chamados'
                text Label 'buscou na central de ajuda'
              text Text 'Não há chamado aberto sobre VPN, e o artigo do erro 809 vale só para Windows 10 — o seu é Windows 11. Vou abrir um chamado.'
              text Question 'Quem está sendo afetado?'
                    text N '1'
                  text Label 'Só eu'
                    text N '2'
                  text Label 'Minha equipe'
                    text N '3'
                  text Label 'Toda a empresa'
                    text N '4'
                  text Label 'Não sei'
              text Text 'Só eu. Tenho reunião com um cliente às 14h e preciso da VPN funcionando.'
              text Who 'Nexo Assist'
                text Label 'classificou a prioridade'
                text Label 'consultou o SLA'
                text Label 'montou o rascunho'
              text Text 'Coloquei prioridade alta por causa da reunião — a resposta chega antes das 14h. Confira antes de eu criar:'
                  text Kind 'Novo chamado'
                  text Draft 'Rascunho D-381'
                    text Label 'Aguardando confirmação'
                text Title 'VPN não conecta no notebook — erro 809'
                text Description 'Desde 20/10 o notebook (Windows 11) não conecta na VPN e mostra o erro 809. Precisa dela para a reunião das 14h.'
                    text Key 'Categoria'
                      text Text 'Rede e VPN'
                    text Key 'Prioridade'
                        text Label 'Alta'
                      text Due '· resposta até 13:43'
                    text Key 'Afetados'
                      text Text 'Somente você'
                  text Label 'Confirmar'
                    text Keys '⌘↵'
                  text Label 'Editar'
                  text Label 'Cancelar'
            text Placeholder 'Escreva para o Nexo…'
              text Label 'Enviar'
            text Counter '18/30 mensagens nesta sessão'
frame Chat — Consulta e transferência (desktop) 
  frame Sidebar 
    frame Logo 
      text Name 'Nexo Assist'
    frame Gap1 
    frame Nav 
        text Label 'Atendimento'
        text Label 'Meu perfil'
    frame Spacer 
    frame User 
        text Initials 'AS'
        text Name 'Ana Souza'
        text Email 'ana.souza@nexo.com.br'
    frame Sair 
      text Label 'Sair'
  frame Main 
    frame Top Bar 
        text Root 'Service desk de TI'
        text Here 'Atendimento'
        text Label 'Assistente online'
    frame Columns 
              text Text 'Qual o status do meu chamado?'
              text Who 'Nexo Assist'
                text Label 'consultou seus chamados'
              text Text 'Você tem 3 chamados abertos. Sobre qual deles quer saber?'
                text Number 'INC-20311'
                text Title 'Notebook lento após atualização'
                  text Label 'Aguardando analista'
                text Date '16 out'
                text Number 'INC-20298'
                text Title 'Acesso à pasta Financeiro no SharePoint'
                  text Label 'Em andamento'
                text Date '14 out'
                text Number 'REQ-10442'
                text Title 'Segundo monitor para home office'
                  text Label 'Aprovado'
                text Date '09 out'
              text Text 'INC-20311 · Notebook lento após atualização'
              text Who 'Nexo Assist'
                text Label 'consultou o INC-20311'
                text Label 'calculou o prazo'
                  text Kind 'Chamado'
                  text Number 'INC-20311'
                    text Label 'Aguardando analista'
                text Title 'Notebook lento após atualização do Windows'
                text Description 'Lentidão geral desde a atualização de 15/10. Reiniciar e rodar o diagnóstico da central não resolveu.'
                    text Key 'Categoria'
                    text Value 'Hardware › Notebook'
                    text Key 'Prioridade'
                      text Label 'Média'
                    text Key 'Aberto em'
                    text Value '16 out, 14:20'
                    text Key 'Última atualização'
                      text Label 'há 5 dias'
                      text Note '· prazo vencido'
              text Text 'Está sem atualização há 5 dias, acima do prazo de 3 dias úteis para prioridade média. Quer que eu chame um analista?'
                  text Label 'Falar com um analista'
                  text Label 'Adicionar informação'
                  text Label 'Não, obrigado'
            text Placeholder 'Escreva para o Nexo…'
              text Label 'Enviar'
            text Counter '16/30 mensagens nesta sessão'
frame Atendente — Conversas (desktop) 
  frame Rail 
    frame Logo 
    frame Conversas 
        text N '5'
    frame Spacer 
    frame Me 
      text Initials 'RL'
  frame Chat List 
    frame Header 
        text Title 'Conversas'
          text Label 'Disponível'
        text Placeholder 'Pesquisar conversa ou chamado'
          text Label 'Todas'
          text Label 'Para você'
          text Count '3'
          text Label 'Com o agent'
          text Count '9'
          text Label 'Minhas'
          text Count '1'
    frame Items 
          text Initials 'AS'
            text Name 'Ana Souza'
            text Time '10:05'
            text Last 'Está parado há 5 dias. Quero falar com…'
              text N '2'
            text Label 'Transferida · INC-20311'
          text Initials 'CM'
            text Name 'Carla Mendes'
            text Time '09:58'
            text Last 'Preciso de acesso ao SAP ainda hoje'
              text N '1'
            text Label 'Transferida · contato em 25 min'
          text Initials 'BT'
            text Name 'Bruno Tavares'
            text Time '09:51'
            text Last 'Nexo: Vou chamar um analista para isso.'
            text Label 'Agent pediu ajuda · confiança 41%'
          text Initials 'DR'
            text Name 'Diego Ramos'
            text Time 'agora'
            text Last 'digitando…'
            text Label 'Agent atendendo'
          text Initials 'EP'
            text Name 'Elisa Prado'
            text Time '10:03'
            text Last 'Nexo: Chamado INC-20519 criado.'
            text Label 'Agent atendendo'
          text Initials 'FN'
            text Name 'Fábio Nunes'
            text Time '10:01'
            text Last 'Isso resolveu, obrigado!'
            text Label 'Resolvida pelo agent'
          text Initials 'GR'
            text Name 'Gabriela Rocha'
            text Time 'ontem'
            text Last 'Nexo: A senha do Wi-Fi foi enviada…'
            text Label 'Resolvida pelo agent'
  frame Conversation 
    frame Header 
        text Initials 'AS'
        text Name 'Ana Souza'
        text Meta 'online · Financeiro · INC-20311'
        text Label 'Aguardando atendente'
    frame Messages 
          text Label 'Hoje'
          text Text 'Qual o status do meu chamado?'
            text Time '10:01'
          text Name 'Nexo Assist'
            text Label 'IA'
          text Text 'Você tem 3 chamados abertos. Sobre qual deles quer saber?'
            text Time '10:01'
          text Text 'INC-20311 · Notebook lento após atualização'
            text Time '10:02'
          text Name 'Nexo Assist'
            text Label 'IA'
          text Text 'Está sem atualização há 5 dias, acima do prazo de 3 dias úteis. Quer que eu chame um analista?'
            text Time '10:02'
          text Text 'Está parado há 5 dias.'
            text Time '10:04'
          text Text 'Quero falar com um analista.'
            text Time '10:04'
          text Name 'Nexo Assist'
            text Label 'IA'
          text Text 'Encaminhei para o Suporte N2. Um analista vai falar com você em até 2 h úteis.'
            text Time '10:05'
          text Text 'Transferida para Suporte N2 · 10:05'
    frame Takeover Bar 
          text Title 'Ana espera um atendente'
          text Body 'Agent pausado · até 12:05'
          text Label 'Devolver ao agent'
          text Label 'Assumir atendimento'
          text Placeholder 'Assuma o atendimento para responder'
  frame Ticket History 
    frame Header 
        text Title 'Chamados da Ana'
        text Meta '3 abertos · 2 encerrados'
    frame Body 
        text Label 'Desta conversa'
              text Number 'INC-20311'
                text Label 'Aguardando analista'
            text Title 'Notebook lento após atualização'
            text Meta 'Hardware · prioridade média'
            text Text 'Transferido para um analista'
            text Time '10:05'
        text Label 'Outros chamados'
            text Title 'Acesso à pasta Financeiro'
            text Meta 'INC-20298 · Em andamento'
            text Title 'Segundo monitor para home office'
            text Meta 'REQ-10442 · Aprovado'
            text Title 'Outlook não sincroniza no celular'
            text Meta 'INC-19877 · Resolvido em 02 set'
            text Title 'Troca de senha da rede'
            text Meta 'INC-19410 · Resolvido em 11 jul'
    frame Footer 
        text Label 'Ver todos os chamados da Ana'
frame Atendente — Atendimento assumido (desktop) 
  frame Rail 
    frame Logo 
    frame Conversas 
        text N '5'
    frame Spacer 
    frame Me 
      text Initials 'RL'
  frame Chat List 
    frame Header 
        text Title 'Conversas'
          text Label 'Disponível'
        text Placeholder 'Pesquisar conversa ou chamado'
          text Label 'Todas'
          text Label 'Para você'
          text Count '3'
          text Label 'Com o agent'
          text Count '9'
          text Label 'Minhas'
          text Count '1'
    frame Items 
          text Initials 'AS'
            text Name 'Ana Souza'
            text Time '10:05'
            text Last 'Posso sim, está ligado.'
            text Label 'Você está atendendo'
          text Initials 'CM'
            text Name 'Carla Mendes'
            text Time '09:58'
            text Last 'Preciso de acesso ao SAP ainda hoje'
              text N '1'
            text Label 'Transferida · contato em 25 min'
          text Initials 'BT'
            text Name 'Bruno Tavares'
            text Time '09:51'
            text Last 'Nexo: Vou chamar um analista para isso.'
            text Label 'Agent pediu ajuda · confiança 41%'
          text Initials 'DR'
            text Name 'Diego Ramos'
            text Time 'agora'
            text Last 'digitando…'
            text Label 'Agent atendendo'
          text Initials 'EP'
            text Name 'Elisa Prado'
            text Time '10:03'
            text Last 'Nexo: Chamado INC-20519 criado.'
            text Label 'Agent atendendo'
          text Initials 'FN'
            text Name 'Fábio Nunes'
            text Time '10:01'
            text Last 'Isso resolveu, obrigado!'
            text Label 'Resolvida pelo agent'
          text Initials 'GR'
            text Name 'Gabriela Rocha'
            text Time 'ontem'
            text Last 'Nexo: A senha do Wi-Fi foi enviada…'
            text Label 'Resolvida pelo agent'
  frame Conversation 
    frame Header 
        text Initials 'AS'
        text Name 'Ana Souza'
        text Meta 'online · Financeiro'
        text Label 'Devolver ao agent'
        text Label 'Encerrar atendimento'
    frame Messages 
          text Name 'Nexo Assist'
            text Label 'IA'
          text Text 'Você tem 3 chamados abertos. Sobre qual deles quer saber?'
            text Time '10:01'
          text Text 'INC-20311 · Notebook lento após atualização'
            text Time '10:02'
          text Name 'Nexo Assist'
            text Label 'IA'
          text Text 'Está sem atualização há 5 dias, acima do prazo de 3 dias úteis. Quer que eu chame um analista?'
            text Time '10:02'
          text Text 'Está parado há 5 dias.'
            text Time '10:04'
          text Text 'Quero falar com um analista.'
            text Time '10:04'
          text Name 'Nexo Assist'
            text Label 'IA'
          text Text 'Encaminhei para o Suporte N2. Um analista vai falar com você em até 2 h úteis.'
            text Time '10:05'
          text Text 'Transferida para Suporte N2 · 10:05'
          text Text 'Rafael Lima assumiu · agent pausado · 10:12'
          text Name 'Rafael Lima'
            text Label 'Suporte N2'
          text Text 'Oi, Ana! Aqui é o Rafael. Já li o histórico e vou verificar o driver de vídeo remotamente. Pode deixar o notebook ligado agora?'
            text Time '10:12'
          text Text 'Posso sim, está ligado.'
            text Time '10:13'
    frame Takeover Bar 
          text Value 'Ótimo! Vou iniciar o acesso remoto, é só aceitar o pedido que vai aparecer na tela|'
  frame Ticket History 
    frame Header 
        text Title 'Chamados da Ana'
        text Meta '3 abertos · 2 encerrados'
    frame Body 
        text Label 'Desta conversa'
              text Number 'INC-20311'
                text Label 'Em atendimento'
            text Title 'Notebook lento após atualização'
            text Meta 'Hardware · prioridade média'
            text Text 'Assumido por Rafael Lima'
            text Time '10:12'
        text Label 'Outros chamados'
            text Title 'Acesso à pasta Financeiro'
            text Meta 'INC-20298 · Em andamento'
            text Title 'Segundo monitor para home office'
            text Meta 'REQ-10442 · Aprovado'
            text Title 'Outlook não sincroniza no celular'
            text Meta 'INC-19877 · Resolvido em 02 set'
            text Title 'Troca de senha da rede'
            text Meta 'INC-19410 · Resolvido em 11 jul'
    frame Footer 
        text Label 'Ver todos os chamados da Ana'
frame Cliente — Meu perfil (desktop) 
  frame Sidebar 
    frame Logo 
      text Name 'Nexo Assist'
    frame Gap1 
    frame Nav 
        text Label 'Atendimento'
        text Label 'Meu perfil'
    frame Spacer 
    frame User 
        text Initials 'AS'
        text Name 'Ana Souza'
        text Email 'ana.souza@nexo.com.br'
    frame Sair 
      text Label 'Sair'
  frame Main 
    frame Top Bar 
        text Root 'Service desk de TI'
        text Here 'Meu perfil'
    frame Columns 
            text Title 'Meu perfil'
            text Subtitle 'Seus dados de acesso ao service desk de TI.'
              text Key 'Nome'
                text Text 'Ana Souza'
              text Key 'E-mail corporativo'
                text Text 'ana.souza@nexo.com.br'
                text Text 'Gerenciado pela TI'
                text Title 'Senha'
                text Meta 'Alterada há 42 dias'
                text Label 'Redefinir senha'
              text Text 'Enviaremos um link de redefinição para ana.souza@nexo.com.br.'```
