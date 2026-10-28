# Serviço de chamados verification

**Verdict**: FAIL
**Mutations**: 3 - probed C5, C15, C18
**Proofs**: `proofs.md` at 4e06e69
**Verifier**: self-verified (degraded - no sub-agent)

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| O Build da tarefa (`bun biome check .`) fica vermelho por erros que já existiam na base, fora desta feature: 128 erros e 62 avisos em `packages/ui/src/components/*`, `packages/db/src/schema/auth.ts` e `apps/web/src/routes/index.tsx` (organizeImports, a11y, useImportType). Nenhum arquivo de código criado ou alterado pela feature tem erro. O biome 2.6 também formata Markdown e JSON, então `.specs/` e `.cursor/` (fora do controle desta feature) entram no check. | linha Build de `proofs.md` em 4e06e69; `bun biome check . --reporter=summary` | André decide: corrigir o lint da base (DLV-08, feature `entrega`) ou restringir a linha Build ao código (por exemplo `bun biome check apps packages`, ignorando `.specs/` e `.cursor/`) | |

## Probed

- **Mutações (3, todas mortas):** filtro de privacidade aplicado ao analista em vez do funcionário (`service.ts:78`, C5); janela de reabertura deslocada em 1 minuto (`transitions.ts:21`, C15); vencido no instante exato do prazo, `<=` para `<` (`sla.ts:33`, C18).
- **Exemplos próprios (fora do repositório, descartados):** título com exatamente 120 caracteres e descrição com 4.000 são aceitos (TKT-10); reabrir com exatamente 7 dias é permitido (TKT-15); no instante do prazo não está vencido e 1 minuto depois está, com atraso 1 (TKT-19); chamado Fechado muito depois do prazo nunca está vencido. Os 4 passaram.
- **Asserções:** C2, C5, C10, C11, C14 a C22, C27 a C32 conferem o valor que o critério fixa. C29 confere REQ-10442 como Aprovado, não como vencido (o critério não pede vencido).
