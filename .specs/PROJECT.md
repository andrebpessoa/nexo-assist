# PROJECT - Nexo Assist

> Fora da estrutura canônica da skill tlc-spec-driven v4 (que guarda só STATE.md, LESSONS.md e `features/`). Este arquivo existe para dar a visão do todo antes das specs por feature. Fonte de verdade das regras: `source/desafio-prd.md`.

## Visão

O Nexo Assist é o agent de atendimento do service desk de TI da Nexo (cerca de 2.000 funcionários). O funcionário descreve o problema num chat. O agent consulta os chamados dele, busca na central de ajuda, abre ou atualiza chamados e chama um analista quando precisa. Cada resposta mostra o que o agent fez e por quê.

É um desafio técnico do processo seletivo da Beyond the Bytes. A entrega é um repositório GitHub com README, e um deploy opcional.

## Medidas de sucesso (PDF)

- **Resolução sem fila:** dúvidas e consultas resolvidas no próprio chat.
- **Chamados bem abertos:** completos, com tipo, categoria e prioridade corretos, sem duplicidade.
- **Encaminhamento certo:** o que precisa de uma pessoa chega ao analista na hora certa e com contexto.
- **Transparência:** dá para entender o que o agent fez e por quê em cada resposta. O PDF chama esta de "a parte mais importante do desafio".

## Usuários

| Usuário | Entra por | Usa |
| --- | --- | --- |
| Funcionário | e-mail corporativo do seed | chat (Telas 2 e 3), Meu perfil |
| Analista (Suporte N1/N2) | e-mail do seed com papel de analista | console (Telas 4 e 5) |

## Fontes

| Fonte | Arquivo | Papel |
| --- | --- | --- |
| PRD do desafio (PDF, 5 páginas) | `source/desafio-prd.md` | requisitos, regras do Anexo A, seed do Anexo B |
| Protótipo Pencil (Anexo C) | `source/prototipo.md`, `source/prototipo-nexo.pen.json`, capturas em cada feature | layout, textos e estilo (binding); dados ilustrativos |

Cada critério das specs traz a origem: **[PDF]**, **[Protótipo]** ou **[Proposta]** (default proposto aqui e aprovado pelo André em 2026-10-28 junto com as recomendações Q-01 a Q-16).

## Stack (base já definida pelo André)

Better-T-Stack 3.49.0, monorepo Bun 1.4.4 + Turborepo:

- `apps/web`: React 19, TanStack Router (rotas por arquivo, `_auth` com redirect de sessão), TanStack Query, cliente tRPC, Tailwind 4, Vite 8.
- `apps/server`: Hono num Cloudflare Worker, com `/api/auth/*` (Better Auth) e `/trpc/*`.
- `packages/api`: routers tRPC com `publicProcedure` e `protectedProcedure`.
- `packages/auth`: Better Auth 1.7 (e-mail e senha) sobre Drizzle.
- `packages/db`: Drizzle 1.0 rc em Cloudflare D1 (SQLite). Hoje só tem as tabelas de auth.
- `packages/ui`: componentes shadcn/base-ui, incluindo primitivas de chat (`message`, `message-scroller`, `bubble`, `attachment`, `marker`, `input-group`).
- `packages/infra`: Alchemy 2 beta (`alchemy.run.ts`) com D1, Worker do servidor (porta 3000) e site Vite (porta 3001). Estado local em `.alchemy/local` (miniflare).
- Env com varlock (`.env.schema` por app). Biome (tabs, aspas duplas) com lefthook no pre-commit. TypeScript 6 strict com `noUncheckedIndexedAccess`.

**Faltam na base** e entram pelas specs: framework de agent (Mastra preferido pelo PDF), provedor de LLM (Google Gemini, AD-008), test runner, `.env.example`, schema de domínio (conversas, mensagens, chamados, artigos, decisões), tema claro do protótipo.

## Estado do repositório (28/10/2026)

- Um commit, `cc0c4fb initial commit`.
- Não rastreados: `.agents/`, `.cursor/` e a migração `packages/db/src/migrations/20261028174751_flat_lockheed`.
- README é o padrão do Better-T-Stack.
- Nenhum teste.

## Convenções das specs

- Prosa em pt-BR. Títulos de seção em inglês, como a skill pede. Identificadores não são traduzidos.
- Critérios em EARS com as palavras-chave em inglês: `WHEN … THEN o sistema SHALL …`, `IF … THEN`, `WHILE`, `WHERE`, `The … SHALL`.
- Cada critério tem um ID `PREFIXO-NN` e uma origem [PDF], [Protótipo] ou [Proposta].
- Textos de tela são copiados do protótipo caractere por caractere. Dados de exemplo são ilustrativos.

## Glossário

| Termo | Significado |
| --- | --- |
| Conversa | Uma sessão de chat de um funcionário. Estados: `com_agent`, `aguardando_atendente`, `com_analista`, `resolvida`, `encerrada`. |
| Transferência | Passar a conversa para `aguardando_atendente`. O agent para de responder até um analista devolver. |
| Rascunho | Proposta de criação, atualização ou reabertura de chamado que só é executada depois do "Confirmar" do funcionário. |
| Registro de decisão | O que o agent entendeu, a ação, a confiança, o porquê e as ferramentas usadas, salvo por resposta. |
| Prazo (SLA) | Tempo para a primeira resposta e para cada atualização, pela prioridade (Anexo A). Passou do prazo: chamado vencido. |
| Serviço de chamados | Sistema legado simulado, separado do agent, com seed e indisponibilidades curtas. |
