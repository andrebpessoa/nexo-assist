# Acesso validation

**Data**: 2026-10-28
**HEAD**: o registrado em `proofs.md` (master, só local, sem push)
**Resultado**: CONCLUÍDA - `check_proofs.py --mutations` com 25 de 25 linhas `pass` e 3 de 3 mutações mortas; `validate_verification.py` sai com 0 (só o aviso de auto-verificação).

## O que passou

- `check_proofs.py`: 25 de 25 linhas `pass` (C1 a C20 e as linhas de Build).
- Mutações: 3 de 3 mortas (C11, C14, C15).
- `bun run test`: auth 7, api 5, web 22, tickets 125 (smoke sem `SERVER_URL`), server 11; 0 falhas.
- `bun run check-types`: 8 de 8. `bun biome check apps packages`: sem erros (1 aviso antigo em `env.public.ts`, vai para a `entrega`).
- Walk de 14 passos no dev local (3100/3101) e fotos 01 e 06 a 1440x900: ver `**Walked:**` em tasks.md e `screens.md`.

## Verificação

- Auto-verificação (degradada, sem sub-agente), sem achados; ver verification.md e screens.md.

## Desvios registrados

1. T2 passou a gravar `passwordChangedAt` no seed (AUTH-19 depende dele).
2. Aprovações delegadas pelo André em t152u (AD-020).
3. Os `env.ts` gerados e ignorados pelo git são formatados antes do Build; correção de raiz na `entrega`.
4. Walk por script Playwright local, com `alchemy.run.ts` em 3100/3101 só durante o walk (revertido, sem commit).
