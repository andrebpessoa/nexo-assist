# ROADMAP - Nexo Assist

> Fora da estrutura canônica da skill tlc-spec-driven v4. Lista as features, a ordem sugerida e as perguntas que travavam a aprovação das specs.

## Features

| # | Feature | Prefixo | Tamanho | Depende de | Telas | Critérios |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [servico-de-chamados](features/servico-de-chamados/spec.md) | TKT | Large | - | - | 33 |
| 2 | [acesso](features/acesso/spec.md) | AUTH | Medium | 1 (seed) | 01, 06 | 20 |
| 3 | [agent](features/agent/spec.md) | AGT | Complex | 1 | 02, 03 (conteúdo) | 47 |
| 4 | [transparencia](features/transparencia/spec.md) | TRN | Large | 3 | 02, 03, 04 (linha de ações) | 18 |
| 5 | [chat-funcionario](features/chat-funcionario/spec.md) | CHAT | Large | 2, 3, 4 | 02, 03 | 33 |
| 6 | [console-analista](features/console-analista/spec.md) | CON | Large | 2, 3, 4 | 04, 05 | 32 |
| 7 | [entrega](features/entrega/spec.md) | DLV | Medium | todas | - | 15 |

Total: 198 critérios. As 7 specs foram aprovadas em 2026-10-28 ("Aprovo todas as recomendações Q-01 a Q-16"); AGT-47 e DLV-15 entraram depois, pela escolha do Gemini (AD-008).

## Ordem sugerida para o Design

1. `servico-de-chamados`: dados, prazos e privacidade são a base de tudo e são testáveis sem LLM.
2. `acesso`: troca o login de cadastro da base pelo login do seed e cria os papéis.
3. `agent` com `transparencia` juntos: o registro de decisão nasce no mesmo laço que decide.
4. `chat-funcionario`.
5. `console-analista`.
6. `entrega`: README, `.env.example`, avaliação do agent e, se aprovado, deploy.

## Mapa PDF → features

| Item do PDF | Feature |
| --- | --- |
| O que construir 1 - Login (Tela 1) | acesso |
| O que construir 2 - Chat do funcionário (Telas 2 e 3) | chat-funcionario |
| O que construir 3 - Agent e Anexo A | agent |
| O que construir 4 - Serviço de chamados simulado | servico-de-chamados |
| O que construir 5 - Transferência | agent, chat-funcionario, console-analista |
| O que construir 6 - Console do analista (Telas 4 e 5) | console-analista |
| O que construir 7 - Visibilidade das decisões | transparencia |
| Requisitos técnicos (strict, Mastra, LLM, persistência, rodar local, `.env.example`) | entrega, servico-de-chamados, agent |
| Também esperado (arquitetura, testes, erros, custo, segurança) | entrega, agent, servico-de-chamados |
| Diferencial (deploy) | entrega (P3) |
| Anexo A (regras) | agent, servico-de-chamados |
| Anexo B (seed) | servico-de-chamados |
| Anexo C (protótipo) | acesso, chat-funcionario, console-analista, transparencia |

## Perguntas para o André (respondidas)

Todas respondidas em 2026-10-28: "Aprovo todas as recomendações Q-01 a Q-16". Q-11 foi fechada depois com o Gemini gratuito. Cada uma virou AD em `STATE.md`.

| ID | Pergunta | Recomendação | Status |
| --- | --- | --- | --- |
| Q-01 | Quando PDF e protótipo divergem, quem manda? | PDF manda nas regras e no escopo. Protótipo manda no layout, nos textos e no estilo. Cada divergência vira uma AD. | aprovada (AD-002) |
| Q-02 | O rascunho do protótipo não mostra o **Tipo** (INC/REQ), que o PDF exige. | Adicionar o campo "Tipo" ao rascunho e ao card do chamado, ao lado de "Categoria". | aprovada (AD-003) |
| Q-03 | Chamado vencido: o PDF manda transferir; o protótipo pergunta "Quer que eu chame um analista?". | Oferecer e transferir só no "sim". Pedido explícito e Crítica transferem direto. | aprovada (AD-004) |
| Q-04 | Prazo de contato depois da transferência: o protótipo mostra "em até 2 h úteis", "Agent pausado · até 12:05" e "contato em 25 min", que não batem com a tabela de SLA. | Contato em até 2 horas úteis (Crítica: 1 hora corrida). O "até HH:MM" mostra esse prazo. O agent não volta sozinho quando o prazo passa. | aprovada (AD-004) |
| Q-05 | Limite de 30 mensagens por sessão: o que conta e o que acontece no limite? | Contar só as mensagens do funcionário na conversa (texto, opção rápida e seleção). No limite, travar o envio e oferecer "Falar com um analista" e "Nova conversa". | aprovada (AD-005) |
| Q-06 | "Voltar outro dia e continuar de onde parei": como é a sessão? | Uma conversa ativa por funcionário, contínua entre dias. Depois de encerrada ou resolvida, a próxima mensagem abre uma conversa nova com contador zerado. | aprovada (AD-005) |
| Q-07 | Login com qualquer senha e entrada do analista. | Aceitar qualquer senha não vazia para e-mail do seed. Recusar e-mail fora do seed. Tirar o cadastro da base. Analista usa a mesma tela e o papel vem do seed. | aprovada (AD-006) |
| Q-08 | "Meu perfil" (Tela 6) não está no PDF. "Redefinir senha" e "Esqueci minha senha" não fazem sentido com qualquer senha. | Fazer o perfil só leitura. Os dois botões de senha mostram uma confirmação simulada, sem enviar e-mail. | aprovada (AD-006) |
| Q-09 | Formato do detalhe das decisões (o PDF deixa livre). | Clicar na linha de ações abre um painel lateral "Por que o Nexo fez isso". O mesmo painel abre no console. | aprovada (AD-007) |
| Q-10 | Limiar de "o agent não tem segurança". | Abaixo de 60% de confiança o agent não executa ação e transfere com "Agent pediu ajuda · confiança NN%". | aprovada (AD-007) |
| Q-11 | Provedor e modelo de LLM, e o framework. | Mastra com Google Gemini (free tier do AI Studio), modelo Flash com tool calling; provedor e modelo configuráveis por env. | aprovada (AD-008) |
| Q-12 | Controles do protótipo sem comportamento no PDF: lupa e "⋮" do console, "Disponível", "Ver todos os chamados da Ana ↗", setas dos chamados, "digitando…", ✓✓, badge "5", "Manter conectado", "Ligue no ramal 4000", "Privacidade e uso de dados", números da vitrine do login, atalho ⌘↵ e números 1-4 das opções. | Ver a tabela de controles em `console-analista`, `acesso` e `chat-funcionario`. Em resumo: lupa busca na conversa; "⋮" abre "Ver decisões do agent" e "Encerrar atendimento"; "Disponível" liga e desliga a contagem "Para você"; "Ver todos" e setas expandem no painel; "digitando…" e ✓✓ saem (sem presença em tempo real); badge = "Para você"; números da vitrine ficam estáticos. | aprovada (AD-009) |
| Q-13 | Deploy (diferencial). | Fazer por último, na sua conta Cloudflare com o Alchemy da base, só com seu aval. Chave como secret, limite por usuário e teto diário de chamadas ao modelo. | aprovada (AD-010) |
| Q-14 | Rodar localmente com poucos comandos: o `alchemy dev` da base pode pedir perfil Cloudflare. | Verificar no Design. Se pedir, documentar o passo ou rodar o dev só com miniflare. Verificado: pede (AD-012). | aprovada (AD-012) |
| Q-15 | Larguras de tela (o protótipo só tem desktop). | Desktop a partir de 1280 px. Mobile fora de escopo. | aprovada (AD-011) |
| Q-16 | Tema: a base abre escura com alternador; o protótipo é claro. | Só o tema claro do protótipo, sem alternador. | aprovada (AD-011) |
