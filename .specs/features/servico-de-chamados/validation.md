# Serviço de chamados validation

**Data**: 2026-10-28
**HEAD**: commit `docs(specs): fecha a validação de servico-de-chamados` (master, só local, sem push); código em eb0a8e5
**Resultado**: CONCLUÍDA - `check_proofs.py --mutations` com 36 de 36 linhas `pass` e 3 de 3 mutações mortas; `validate_verification.py` sai com 0 (só o aviso de auto-verificação).

## O que passou

- `check_proofs.py`: 36 de 36 linhas `pass` (C1 a C33, check-types, Biome em `apps` e `packages`, testes); C26 e C33 por walk registrado.
- Mutações: 3 de 3 mortas (C5, C15, C18).
- `bun run test`: tickets 125 pass e 3 skip (smoke sem `SERVER_URL` ativo, AD-019), server 11 pass. Com o dev local no ar: tickets 126 pass.
- `bun run check-types`: 8 de 8.
- `bun biome check apps packages`: sem erros, depois da formatação da base (7682075) e de 4 supressões de a11y com motivo em `packages/ui` (eb0a8e5).
- Walks com HOME vazio e dev em 3100/3101: ver `**Walked:**` em tasks.md.

## Verificação

- Auto-verificação (degradada, sem sub-agente): o único achado (Build vermelho pela base) foi fechado em eb0a8e5; ver verification.md.

## Desvios registrados

1. T16 commitou o `service.ts` inteiro; T17 a T19 só acrescentam testes (sem vermelho demonstrável), porque os testes do serviço dependem uns dos outros.
2. T24 foi commitada antes do walk; o walk (taxa 1 → `SERVICE_UNAVAILABLE`) rodou depois da T26 e passou.
3. T27 entrou com a chave `db:seed` duplicada no `package.json`; corrigida no commit 4e06e69, sem amend.
4. T23: `env:generate` não gerou arquivo versionado; o commit tem só o `.env.schema`.
5. Biome por arquivo durante as tarefas (`biome check` nos novos, `biome lint` nos alterados), porque o check geral já falhava na base.
6. tsconfig de tickets e server excluíam `*.test.ts`; resolvido com `@types/bun` em 35f1e1a.
7. Rotas só de dev `/internal/health` e `/internal/tickets?as=`, atrás de `DEV_SEED_ENABLED=true`, para o smoke enquanto o login não existe.
8. Usuário sem perfil recebe `NO_PROFILE`.
9. O seed não afirma REQ-10442 vencido (caía vencido aos domingos).
10. Build limitado a `apps` e `packages` até a `entrega` e smoke só com `SERVER_URL` (AD-019, 8a6e2d2).
11. 4 regras de a11y suprimidas com `biome-ignore` e motivo em `packages/ui/src/components/input-group.tsx` e `label.tsx` (eb0a8e5), por decisão do André.
