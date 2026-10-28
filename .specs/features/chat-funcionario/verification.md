# Chat do funcionário verification

**Verdict**: PASS
**Mutations**: 3 - probed C18, C24, C5
**Proofs**: `proofs.md` no HEAD do fechamento
**Verifier**: self-verified (degraded - no sub-agent)

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| A edição aceitava qualquer campo, inclusive a prioridade | Revisão de T2; teste "edit cannot set the priority" | Esquema estrito com título, descrição, tipo, categoria e afetados | bd3dec1 |
| O cliente não sabia se o rascunho ainda estava guardado no servidor; uma conversa que mudou de assunto deixava o card com botões | Revisão de T3 contra o motor (`pending`) | `/chat/history` devolve `conversation.pending`; só o último rascunho com `pending = ticket_draft` fica ativo | 197573f |
| A pergunta saía duas vezes (no texto e acima das opções) | Caminhada, tela 02 | A pergunta no fim do texto passa para as opções | f90cac7 |
| O painel "Por que o Nexo fez isso" empurrava a conversa para baixo | Caminhada, painel aberto | Painel como coluna à direita da conversa | f90cac7 |

## Probed

- **Mutações (3, todas mortas):** confirmação enviada duas vezes (C18, `blocks.tsx`); 31ª mensagem aceita (C24, `session.ts`); exatamente 2.000 caracteres recusado (C5, `composer.tsx`).
- **Servidor real:** C24, C25 e C29 sobem as rotas Hono com o motor e o seed em libsql na memória; C25 relê o histórico por um app novo sobre o mesmo banco.
- **Tela:** C1 a C33 rodam com um `ChatApi` falso que segura o streaming (promessas adiadas), então "na hora", "palavra a palavra" e "Enviar desabilitado" são vistos no meio da resposta.
- **Caminhada (1440x900, box, portas 3100/3101):** login da Ana, boas-vindas, VPN até o rascunho com opção por clique e por tecla, painel aberto pela linha de ações, Editar e Descartar, Ctrl+Enter confirma e o card vira "Chamado criado · INC-…", consulta com lista, escolha do INC-20311 com card vencido e opções rápidas, "Falar com um analista" com a faixa "Aguardando um analista · contato até HH:MM", e 1280 px sem rolagem horizontal. Fotos em `captures/*.running.png` e `/workspace/screens/chat`.
- **Mastra no Worker:** workerd 1.20261012.1 com `nodejs_compat` executou o agent Mastra e chegou ao Google ("API key not valid" com chave falsa); plano B não foi preciso (AD-021).
