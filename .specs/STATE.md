# STATE

## Decisions

### AD-001

- **Decision**: A base do projeto é o monorepo Better-T-Stack já criado em `~/workspace/nexo-assist` (Bun, Turborepo, React 19 + TanStack Router, Hono em Cloudflare Workers, tRPC, Better Auth, Drizzle + D1, Alchemy). Features novas encaixam nos pacotes existentes em vez de trocar de stack.
- **Reason**: O André informou em 28/10/2026 que "a base do projeto já está pronta e definida".
- **Trade-off**: O agent e o streaming têm de rodar em Workers (ou num serviço à parte decidido no Design), e Next.js, sugerido no PDF, fica de fora.
- **Scope**: Todas as features.
- **Date**: 2026-10-28
- **Status**: active (AD-001)

### AD-002

- **Decision**: Quando PDF e protótipo divergem, o PDF manda nas regras e no escopo; o protótipo manda no layout, nos textos e no estilo. Cada divergência vira uma AD e uma linha em `## Differences from the source`.
- **Reason**: Q-01, respondida pelo André em 2026-10-28: "Aprovo todas as recomendações Q-01 a Q-16".
- **Trade-off**: Telas podem ganhar elementos que o protótipo não desenha.
- **Scope**: Todas as features.
- **Date**: 2026-10-28
- **Status**: active (AD-002)

### AD-003

- **Decision**: O rascunho e o card do chamado ganham o campo "Tipo" (Incidente ou Requisição) ao lado de "Categoria".
- **Reason**: Q-02: o PDF exige o tipo e o protótipo não o mostra. "Aprovo todas as recomendações Q-01 a Q-16".
- **Trade-off**: Desvio visível das Telas 02 e 03.
- **Scope**: chat-funcionario, agent, servico-de-chamados.
- **Date**: 2026-10-28
- **Status**: active (AD-003)

### AD-004

- **Decision**: Chamado vencido: o agent oferece "Quer que eu chame um analista?" e só transfere no "sim"; pedido explícito e prioridade Crítica transferem direto. Depois da transferência, o prazo de contato é de 2 horas úteis (Crítica: 1 hora corrida), mostrado como "até HH:MM"; o agent não volta sozinho quando o prazo passa.
- **Reason**: Q-03 e Q-04. "Aprovo todas as recomendações Q-01 a Q-16".
- **Trade-off**: O PDF manda transferir vencidos; aqui o funcionário confirma antes. Os números do protótipo ("contato em 25 min") passam a ser calculados.
- **Scope**: agent, chat-funcionario, console-analista.
- **Date**: 2026-10-28
- **Status**: active (AD-004)

### AD-005

- **Decision**: Uma conversa ativa por funcionário, contínua entre dias. O limite de 30 mensagens conta só as mensagens do funcionário (texto, opção rápida e seleção); no limite o envio trava e aparecem "Falar com um analista" e "Nova conversa". Conversa resolvida ou encerrada: a próxima mensagem abre outra, com contador zerado.
- **Reason**: Q-05 e Q-06. "Aprovo todas as recomendações Q-01 a Q-16".
- **Trade-off**: Sem histórico de várias conversas paralelas.
- **Scope**: agent, chat-funcionario, console-analista.
- **Date**: 2026-10-28
- **Status**: active (AD-005)

### AD-006

- **Decision**: Login aceita qualquer senha não vazia para e-mail do seed e recusa e-mail fora dele; o cadastro da base sai; analista entra pela mesma tela com papel vindo do seed. "Meu perfil" (Tela 06) é só leitura, e "Esqueci minha senha" e "Redefinir senha" mostram confirmação simulada.
- **Reason**: Q-07 e Q-08. "Aprovo todas as recomendações Q-01 a Q-16".
- **Trade-off**: Remove o fluxo de cadastro do Better Auth da base; nenhuma senha é verificada.
- **Scope**: acesso.
- **Date**: 2026-10-28
- **Status**: active (AD-006)

### AD-007

- **Decision**: O detalhe de cada decisão abre num painel lateral "Por que o Nexo fez isso", no chat e no console. Abaixo de 60% de confiança o agent não executa ação e transfere com "Agent pediu ajuda · confiança NN%".
- **Reason**: Q-09 e Q-10. "Aprovo todas as recomendações Q-01 a Q-16".
- **Trade-off**: O limiar fixo pode transferir casos que o modelo acertaria.
- **Scope**: agent, transparencia, chat-funcionario, console-analista.
- **Date**: 2026-10-28
- **Status**: active (AD-007)

### AD-008

- **Decision**: Agent em Mastra com Google Gemini pelo free tier do Google AI Studio: modelo da família Flash com tool calling, chamado pelo model router do Mastra (`google/<modelo>`). Provedor e modelo vêm de `LLM_MODEL`, então trocar de provedor é mudar env e chave. `.env.example` traz `GOOGLE_GENERATIVE_AI_API_KEY` vazia; o André cria a chave. O agent trata 429 e limite de uso com espera curta, uma nova tentativa e mensagem ao usuário (AGT-47).
- **Reason**: Q-11: o André escolheu um provedor gratuito (mensagem de 2026-10-28) depois de aprovar as recomendações.
- **Trade-off**: Free tier: limites por projeto, não garantidos e não publicados na doc do Google (que manda ver no AI Studio); medições de terceiros em out/2026 citam 5 req/min e 20 req/dia para Flash e 15 req/min e 500 req/dia para Flash-Lite. Conteúdo do free tier pode ser usado pelo Google para melhorar produtos e lido por revisores, então só dados fictícios. Sem garantia de capacidade para o avaliador.
- **Scope**: agent, entrega.
- **Date**: 2026-10-28
- **Status**: active (AD-008)

### AD-009

- **Decision**: Controles do protótipo sem regra no PDF: lupa busca na conversa; "⋮" abre "Ver decisões do agent" e "Encerrar atendimento"; "Disponível" liga e desliga a contagem "Para você"; "Ver todos" e setas expandem no painel; badge = "Para você"; números da vitrine do login ficam estáticos; "Ligue no ramal 4000" é texto; "Privacidade e uso de dados" abre um modal curto. "digitando…" e ✓✓ saem.
- **Reason**: Q-12. "Aprovo todas as recomendações Q-01 a Q-16".
- **Trade-off**: Sem presença em tempo real; o console fica um pouco diferente das Telas 04 e 05.
- **Scope**: acesso, chat-funcionario, console-analista.
- **Date**: 2026-10-28
- **Status**: active (AD-009)

### AD-010

- **Decision**: Deploy só por último, na conta Cloudflare do André, pelo Alchemy da base, e só com o aval explícito dele. Chave do LLM como secret, limite por usuário e teto diário de chamadas ao modelo.
- **Reason**: Q-13. "Aprovo todas as recomendações Q-01 a Q-16".
- **Trade-off**: O link público pode não existir na entrega.
- **Scope**: entrega.
- **Date**: 2026-10-28
- **Status**: active (AD-010)

### AD-011

- **Decision**: Só desktop a partir de 1280 px, e só o tema claro do protótipo, sem o alternador de tema da base.
- **Reason**: Q-15 e Q-16. "Aprovo todas as recomendações Q-01 a Q-16".
- **Trade-off**: Mobile e tema escuro fora de escopo; remove o ThemeProvider/alternador da base.
- **Scope**: acesso, chat-funcionario, console-analista.
- **Date**: 2026-10-28
- **Status**: active (AD-011)

### AD-012

- **Decision**: Rodar localmente não pode exigir login Cloudflare. Hoje exige: `packages/infra/alchemy.run.ts` usa `state: Cloudflare.state()`, e o log do `alchemy dev` de 2026-10-28 mostra o state store remoto ("ready (cloudflare-http)") com credenciais do perfil Alchemy; o `.env.schema` da infra pede `ALCHEMY_PASSWORD`. O caminho local sem conta é decidido no Design de `entrega`.
- **Reason**: Q-14: recomendação aprovada ("Aprovo todas as recomendações Q-01 a Q-16") era verificar no Design e, se pedisse login, documentar o passo ou rodar o dev só local.
- **Trade-off**: Mexer no `alchemy.run.ts` da base ou manter dois jeitos de subir (dev local e deploy).
- **Scope**: entrega, servico-de-chamados (migrações e seed locais).
- **Date**: 2026-10-28
- **Status**: active (AD-012)

### AD-013

- **Decision**: O serviço de chamados é o pacote `packages/tickets`, rodando no mesmo Worker do servidor atrás da interface `TicketService` (abordagem A do design). Funcionários e analistas são `user` do Better Auth com uma tabela `profile` 1:1 (papel, setor, SO, equipe); o schema gerado do Better Auth não muda.
- **Reason**: D-01 e D-03 do design de `servico-de-chamados`, aprovadas pelo André em 2026-10-28: "Aprovo D-01 a D-05 e E-01 a E-03 como recomendado (abordagem A, libsql + smoke D1, tabela profile, ranking em código, db:seed, dev local sem login, Flash-Lite, commitar a migração); pode gerar as tasks".
- **Trade-off**: A separação é de módulo, não de rede; o README precisa justificar (DLV-06). Evoluir para Worker separado (abordagem B) continua possível sem reescrever o pacote.
- **Scope**: servico-de-chamados, agent, console-analista, acesso.
- **Date**: 2026-10-28
- **Status**: active (AD-013)

### AD-014

- **Decision**: Testes com `bun test`: regras puras com relógio fixo; repositório e serviço em SQLite em memória (libsql, já dependência de `packages/db`); um teste de fumaça contra o D1 local quando o dev local existir.
- **Reason**: D-02, mesma aprovação: "Aprovo D-01 a D-05 e E-01 a E-03 como recomendado (abordagem A, libsql + smoke D1, tabela profile, ranking em código, db:seed, dev local sem login, Flash-Lite, commitar a migração); pode gerar as tasks".
- **Trade-off**: libsql pode divergir do D1 em detalhes; o teste de fumaça cobre o caminho real.
- **Scope**: Todas as features.
- **Date**: 2026-10-28
- **Status**: active (AD-014)

### AD-015

- **Decision**: A busca na central é um ranking em código, em memória (sem FTS nem embeddings). O seed roda por `bun run db:seed`, chamado pelo fluxo de dev local, e é idempotente.
- **Reason**: D-04 e D-05, mesma aprovação: "Aprovo D-01 a D-05 e E-01 a E-03 como recomendado (abordagem A, libsql + smoke D1, tabela profile, ranking em código, db:seed, dev local sem login, Flash-Lite, commitar a migração); pode gerar as tasks".
- **Trade-off**: Ranking simples pode errar em sinônimos; aceitável com 5 a 10 artigos.
- **Scope**: servico-de-chamados, agent, entrega.
- **Date**: 2026-10-28
- **Status**: active (AD-015)

### AD-016

- **Decision**: O dev local usa o state store local do Alchemy (`Alchemy.localState()`, exportado por `alchemy` 2.0.0-beta.84) em vez de `Cloudflare.state()`, para rodar sem login Cloudflare; o deploy continua com `Cloudflare.state()`. Se o `localState()` não funcionar, o fallback é wrangler/miniflare para o servidor e `vite dev` para o front. O erro do front no dev (`ERR_MODULE_NOT_FOUND .../register-dev-mode.js`) é corrigido junto. Detalha AD-012.
- **Reason**: E-01, mesma aprovação: "Aprovo D-01 a D-05 e E-01 a E-03 como recomendado (abordagem A, libsql + smoke D1, tabela profile, ranking em código, db:seed, dev local sem login, Flash-Lite, commitar a migração); pode gerar as tasks".
- **Trade-off**: Dois modos de state (local e Cloudflare) no `alchemy.run.ts` da base.
- **Scope**: entrega, todas as features (dev local).
- **Date**: 2026-10-28
- **Status**: active (AD-016)

### AD-017

- **Decision**: O modelo padrão do agent é um Gemini Flash-Lite do free tier (limites medidos por terceiros: 15 req/min e 500 req/dia, contra 5 e 20 do Flash). O ID exato é fixado no Design do agent depois de confirmar que ele faz tool calling pelo Mastra. Detalha AD-008.
- **Reason**: E-02, mesma aprovação: "Aprovo D-01 a D-05 e E-01 a E-03 como recomendado (abordagem A, libsql + smoke D1, tabela profile, ranking em código, db:seed, dev local sem login, Flash-Lite, commitar a migração); pode gerar as tasks".
- **Trade-off**: Flash-Lite é menos capaz que Flash; a avaliação AGT-45 mede se basta. `LLM_MODEL` permite trocar.
- **Scope**: agent, entrega.
- **Date**: 2026-10-28
- **Status**: superseded by AD-023

### AD-018

- **Decision**: A migração da base `packages/db/src/migrations/20261028174751_flat_lockheed/`, hoje fora do git, é commitada (commit local) antes da primeira migração nova.
- **Reason**: E-03, mesma aprovação: "Aprovo D-01 a D-05 e E-01 a E-03 como recomendado (abordagem A, libsql + smoke D1, tabela profile, ranking em código, db:seed, dev local sem login, Flash-Lite, commitar a migração); pode gerar as tasks".
- **Trade-off**: O histórico ganha um commit de base que não é desta feature.
- **Scope**: servico-de-chamados, acesso.
- **Date**: 2026-10-28
- **Status**: active (AD-018)

### AD-019

- **Decision**: Até a feature `entrega`, o Build de `servico-de-chamados` roda o Biome só em `apps` e `packages` (`bun biome check apps packages`); a correção do lint da base continua em `entrega` (DLV-08). O smoke do D1 só roda com `SERVER_URL` definido: sem ela, é pulado com aviso e não procura servidor em porta nenhuma.
- **Reason**: André, 2026-10-28: "Limita o lint a apps e packages até a entrega e o smoke só roda com SERVER_URL definido".
- **Trade-off**: Markdown e JSON de `.specs/` e `.cursor/` ficam fora do lint; o smoke não roda no `bun run test` sem `SERVER_URL`.
- **Scope**: servico-de-chamados, entrega.
- **Date**: 2026-10-28
- **Status**: superseded by AD-022

### AD-020

- **Decision**: As aprovações de `acesso`, `agent`, `transparencia`, `chat-funcionario`, `console-analista` e `entrega` estão delegadas: cada uma é registrada como "delegado por André em t152u" e adota a opção recomendada. A pausa vem a cada 2 features ou quando faltar algo que só o André dá (chave, conta, decisão que mude o produto).
- **Reason**: André, 2026-10-28 (t152u): "sim, faça a aplicação de todas as features, me avise se precisar de algo".
- **Trade-off**: Menos portões humanos; cada escolha fica escrita no design, nos ADs e no relatório de checkpoint para ele revisar.
- **Scope**: acesso, agent, transparencia, chat-funcionario, console-analista, entrega.
- **Date**: 2026-10-28
- **Status**: active (AD-020)

### AD-021

- **Decision**: O entendimento roda com Mastra dentro do Worker (plano A); o plano B (`ai` + `@ai-sdk/google`) fica sem uso. O chat usa SSE do Hono (`/chat/send`) e polling do histórico a cada 2 s.
- **Reason**: Prova de 2026-10-28 no `alchemy dev` (workerd 1.20261012.1, `nodejs_compat`): rota temporária montou o `createMastraUnderstander` e chamou o Google, que respondeu "API key not valid"; o pacote roda no Worker.
- **Trade-off**: O Worker fica maior (Mastra ~1,6 MB gzip); o texto sai palavra a palavra depois da decisão, não token a token do modelo.
- **Scope**: chat-funcionario, console-analista, entrega.
- **Date**: 2026-10-28
- **Status**: active (AD-021)

### AD-022

- **Decision**: O Biome roda no repositório inteiro (`bun biome check .`, `bun run check`) e ignora as pastas de documentação e ferramentas: `.specs`, `.agents`, `.cursor` e `.claude`. Supera o AD-019.
- **Reason**: `bun run check` (`biome check --write .`) reformatava 39 arquivos de `.specs/`, inclusive o `.pen.json` do protótipo, que são fontes e não código. Design da `entrega`, aprovação delegada (AD-020) com o "sim, siga com a validação do console e depois a entrega" do André em 2026-10-28.
- **Trade-off**: Markdown e JSON das specs não passam pelo formatador.
- **Scope**: entrega, todas as features (lint).
- **Date**: 2026-10-28
- **Status**: active (AD-022)

### AD-023

- **Decision**: O modelo padrão do agent passa a ser `google/gemini-3.5-flash-lite` (ainda Flash-Lite, com free tier); `LLM_MODEL` troca. Supera o ID de AD-017.
- **Reason**: Em 2026-10-28, com a chave do André, o Google respondeu 404 a `gemini-2.5-flash-lite`: "This model models/gemini-2.5-flash-lite is no longer available to new users. Please update your code to use models/gemini-3.5-flash-lite". Uma chamada de prova pelo Mastra com `gemini-3.5-flash-lite` devolveu intenção, categoria e tipo certos. Preço pago em https://ai.google.dev/gemini-api/docs/pricing: US$ 0,30 por 1M de entrada e US$ 2,50 por 1M de saída; free tier sem custo.
- **Trade-off**: No pago, 3x a entrada e 6x a saída do 2.5 Flash-Lite. Os limites do free tier deste modelo não foram medidos.
- **Scope**: agent, entrega.
- **Date**: 2026-10-28
- **Status**: active (AD-023)

## Handoff

- **Fase**: as 7 features do ROADMAP e `precisao-do-agent` concluídas. `entrega` fase 2 (deploy, T7 a T10) validada em 2026-10-29: `validate_verification.py entrega` com 0 (22 provas, 3 mutações mortas na rodada 2, 8 achados fechados).
- **Deploy**: publicado em 2026-10-29 na conta Cloudflare do André (stage `live_andre`). Web https://nexo-assist-web-live-andre-kos6yhp3we5xxb6c.andrebpessoa09.workers.dev, server https://nexo-assist-server-live-andre-f4pp7jzy5m7i2v43.andrebpessoa09.workers.dev. Secrets conferidos no painel pelo André.
- **Pendente**: novo deploy com as correções do verificador e as melhorias de latência (Smart Placement, cookieCache), commits 66cc60b..3057a29; o auto mode recusa `deploy --yes` para o agente, então o André roda. Limpeza de comentários e código morto em outro chat; depois `git branch -m master main` e push para `andrebpessoa/nexo-assist` (público, vazio), só com o aval dele.
- **Bloqueios**: nenhum.
- **Não commitado**: `features/*/proofs.md` (gerados no HEAD, fora do git de propósito). Segredos de produção em `apps/server/.env.production.local` e `packages/infra/.env.local`, ignorados pelo git.
- **Branch**: master.
