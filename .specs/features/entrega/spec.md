# Entrega: README, execução local, qualidade e deploy

**Approved**: 2026-10-28 - user: "Aprovo todas as recomendações Q-01 a Q-16"

Tamanho: Medium · Fonte: PDF (Requisitos técnicos, Também esperado, Diferencial, Entregáveis) · Status: Specify aprovado em 2026-10-28

## Problem Statement

O avaliador clona o repositório, roda com poucos comandos e lê no README como o agent decide e por que as escolhas foram feitas. A base não tem `.env.example`, testes nem README do projeto. O deploy é opcional e só conta ponto extra.

## Goals

- [ ] Rodar localmente com até três comandos depois do clone, documentados.
- [ ] README com as seis seções pedidas e a escolha do modelo.
- [ ] Testes onde importam e commits que contam a história.
- [ ] Deploy protegido, se o André autorizar (P3).

## Out of Scope

| Item | Motivo |
| --- | --- |
| CI no GitHub Actions | Não pedido; pode entrar em "com mais tempo". |
| Monitoramento de produção | Não pedido. |
| Deploy sem aval do André | Usa a conta Cloudflare dele (Q-13). |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Comandos locais (Q-14) | `bun install`, `cp .env.example` para os `.env` dos apps (ou um script `bun run setup`), `bun run dev`, que aplica migrações e seed. | PDF: "poucos comandos". Checado em 2026-10-28: o `alchemy dev` atual precisa de perfil Cloudflare (ver AD-012). | y - recomendação aprovada (AD-012) |
| Test runner | `bun test`. | Já vem com o Bun da base; escolha final no Design. | y - recomendação aprovada em 2026-10-28 |
| Commits | Um commit por tarefa, Conventional Commits, locais; push só com aval. | "commits que contem a história"; regra do André de não fazer push sem pedir. | y - recomendação aprovada em 2026-10-28 |
| Deploy (Q-13) | Cloudflare pelo Alchemy da base, chave do LLM como secret, 10 mensagens por minuto por usuário e teto diário de chamadas ao modelo. | Diferencial do PDF; a base já aponta para Cloudflare. | y - recomendação aprovada (AD-010) |

**Open questions:** none - Q-11, Q-13, Q-14 respondidas em 2026-10-28 ("Aprovo todas as recomendações Q-01 a Q-16"); decisões em `STATE.md` (AD-008, AD-010, AD-012).

## User Stories

### P1: Rodar e entender o projeto ⭐ MVP

**User Story**: Como avaliador, quero rodar o projeto e entender as decisões lendo o README.

**Why P1**: Entregáveis e critério "Comunicação".

**Acceptance Criteria**:

1. The README SHALL ter as seções "Como rodar", "Arquitetura", "Como o agent decide", "Como garanti a qualidade das decisões", "Trade-offs" e "O que faria com mais tempo". [PDF] `DLV-01`
2. The README SHALL explicar a escolha do modelo de LLM e o custo estimado por conversa. [PDF] `DLV-02`
3. The repositório SHALL ter um `.env.example` com todas as variáveis, valores de exemplo e nenhuma chave real. [PDF] `DLV-03`
4. WHEN o avaliador segue "Como rodar" numa máquina com Bun THEN o sistema SHALL subir com migrações e seed aplicados em até três comandos depois do clone. [PDF] `DLV-04`
5. The código SHALL ler chaves só de variáveis de ambiente do servidor, e nenhuma chave SHALL ir para o bundle do navegador nem para o git. [PDF] `DLV-05`
6. The arquitetura SHALL separar interface (`apps/web`), agent e serviço de chamados em módulos distintos, e o README SHALL justificar a separação. [PDF] `DLV-06`
7. The `.env.example` SHALL trazer `GOOGLE_GENERATIVE_AI_API_KEY` vazia e `LLM_MODEL` com o modelo padrão, e o README SHALL explicar como criar a chave no Google AI Studio, que os limites do free tier são por projeto e baixos para um agent com ferramentas, e que no free tier o Google pode usar prompts e respostas para melhorar seus produtos, por isso o seed usa só dados fictícios. [Proposta] `DLV-15`

**Independent Test**: Um clone limpo, seguindo o README, chega ao login com o seed; `git grep` por padrões de chave não acha nada.

---

### P1: Qualidade de código ⭐ MVP

**User Story**: Como avaliador, quero ver testes onde importam e um histórico de commits legível.

**Why P1**: Critério "Arquitetura e boas práticas".

**Acceptance Criteria**:

1. The projeto SHALL passar em `bun run check-types` com TypeScript strict. [PDF] `DLV-07`
2. The projeto SHALL passar em `bun run check` (Biome) sem erros. [Proposta] `DLV-08`
   - Nota (AD-019): inclui o lint da base em `apps` e `packages`, que hoje falha; até lá o Build de `servico-de-chamados` roda `bun biome check apps packages`.
   - Nota (2026-10-28): formatação da base em `apps` e `packages` feita no commit 7682075 (`bun biome check --write apps packages`, aprovado pelo André). Restam 4 erros de a11y em `packages/ui` (`input-group.tsx`: 2 `useSemanticElements` e 1 `useKeyWithClickEvents`; `label.tsx`: 1 `noLabelWithoutControl`) e 1 aviso em `apps/web/src/env.public.ts` (`noNonNullAssertion`), que pedem mudança de marcação ou supressão. Os 4 erros foram suprimidos com `biome-ignore` e motivo em eb0a8e5 (decisão do André); o aviso continua para a `entrega`.
3. The projeto SHALL ter testes automatizados para prazo e horas úteis, prioridade, privacidade, duplicidade e reabertura, estados da conversa e limite de mensagens, rodados por `bun test`. [PDF] `DLV-09`
4. The README SHALL explicar como rodar a avaliação do agent (AGT-45) e mostrar o último resultado. [PDF] `DLV-10`
5. The histórico SHALL ter commits pequenos, um por tarefa, com mensagens que dizem o que e por quê. [PDF] `DLV-11`

**Independent Test**: `bun run check-types`, `bun run check` e `bun test` passam num clone limpo.

---

### P3: Deploy protegido

**User Story**: Como avaliador, quero abrir um link e testar sem rodar nada.

**Why P3**: Diferencial, só ponto extra (Q-13).

**Acceptance Criteria**:

1. WHERE o André autorizou o deploy o sistema SHALL ser publicado com a chave do LLM como secret do provedor e o link no README. [PDF] `DLV-12`
2. WHERE há deploy o servidor SHALL limitar cada usuário a 10 mensagens por minuto e o total de chamadas ao modelo a um teto diário configurável, respondendo "Limite de uso atingido. Tente mais tarde." [PDF] `DLV-13`
3. WHERE há deploy o README SHALL explicar como o deploy foi feito e como as chaves e o uso são protegidos. [PDF] `DLV-14`

**Independent Test**: A 11ª mensagem em um minuto recebe a recusa; o bundle publicado não contém a chave.

---

## Edge Cases

- `.env` ausente: o servidor para na subida com a lista das variáveis que faltam (o varlock da base já faz isso).
- Sem chave de LLM: o chat mostra "Assistente indisponível" (CHAT-09) e o resto da aplicação funciona.

## Implicit-Requirement Dimensions

Medium: dimensões presentes nesta feature.

| Dimension | Coverage |
| --- | --- |
| Auth boundaries & rate limits | DLV-05, DLV-13, DLV-15; AGT-47 |
| Observability | DLV-10 |
| External-dependency failure | Edge case sem chave de LLM |

Remaining dimensions N/A for this scope.

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DLV-01 | P1 - Rodar e entender o projeto | Verify | Verified |
| DLV-02 | P1 - Rodar e entender o projeto | Verify | Verified |
| DLV-03 | P1 - Rodar e entender o projeto | Verify | Verified |
| DLV-04 | P1 - Rodar e entender o projeto | Verify | Verified |
| DLV-05 | P1 - Rodar e entender o projeto | Verify | Verified |
| DLV-06 | P1 - Rodar e entender o projeto | Verify | Verified |
| DLV-07 | P1 - Qualidade de código | Verify | Verified |
| DLV-08 | P1 - Qualidade de código | Verify | Verified |
| DLV-09 | P1 - Qualidade de código | Verify | Verified |
| DLV-10 | P1 - Qualidade de código | Verify | Verified |
| DLV-11 | P1 - Qualidade de código | Verify | Verified |
| DLV-12 | P3 - Deploy protegido | Verify | Verified |
| DLV-13 | P3 - Deploy protegido | Verify | Verified |
| DLV-14 | P3 - Deploy protegido | Verify | Verified |
| DLV-15 | P1 - Rodar e entender o projeto | Verify | Verified |

**Coverage:** 15 critérios, todos mapeados a uma história.

## Sources

- `../../source/desafio-prd.md`: Requisitos técnicos, Também esperado, Diferencial, Entregáveis, Critérios de avaliação.

## Success Criteria

- [ ] Um clone limpo roda em até três comandos.
- [ ] Todas as seções do README existem.
