# Serviço de chamados validation

**Data**: 2026-10-28
**HEAD**: 4e06e69 (master, só local, sem push)
**Resultado**: NÃO CONCLUÍDA - `validate_verification.py` sai com 1 só pela linha Build (lint da base); todas as provas de checks passam e as 3 mutações morrem.

## O que passou

- `check_proofs.py`: 35 de 36 linhas `pass` (C1 a C33 e as linhas de check-types e testes); C26 e C33 por walk registrado.
- Mutações: 3 de 3 mortas (C5, C15, C18).
- `bun run test`: tickets 123 pass e 3 skip (smoke sem servidor, com aviso), server 11 pass. Com o dev local no ar: tickets 126 pass.
- `bun run check-types`: 8 de 8.
- `bun install --frozen-lockfile`: ok.
- Walks com HOME vazio e dev em 3100/3101: ver `**Walked:**` em tasks.md.

## O que falta

- Linha Build: `bun biome check .` falha por 128 erros que já estavam na base (`packages/ui`, `packages/db/src/schema/auth.ts`, `apps/web`) e por Markdown/JSON de `.specs/` e `.cursor/`, que o biome 2.6 também formata. Precisa da decisão do André (ver verification.md).

## Desvios registrados

1. T16 commitou o `service.ts` inteiro; T17 a T19 só acrescentam testes (sem vermelho demonstrável), porque os testes do serviço dependem uns dos outros.
2. T24 foi commitada antes do walk; o walk (taxa 1 → `SERVICE_UNAVAILABLE`) rodou depois da T26 e passou.
3. T27 entrou com a chave `db:seed` duplicada no `package.json`; corrigida no commit 4e06e69, sem amend.
4. T23: `env:generate` não gerou arquivo versionado; o commit tem só o `.env.schema`.
5. Biome por arquivo durante as tarefas (`biome check` nos novos, `biome lint` nos alterados), porque o check geral já falhava na base.
6. tsconfig de tickets e server excluem `*.test.ts` (sem `@types/bun`, que é instalação nova).
7. Rotas só de dev `/internal/health` e `/internal/tickets?as=`, atrás de `DEV_SEED_ENABLED=true`, para o smoke enquanto o login não existe.
8. Usuário sem perfil recebe `NO_PROFILE`.
9. O seed não afirma REQ-10442 vencido (caía vencido aos domingos).
