# Agent verification

**Verdict**: PASS
**Mutations**: 3 - probed C25, C38, C40
**Proofs**: `proofs.md` no HEAD do fechamento
**Verifier**: self-verified (degraded - no sub-agent)

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| "Tentar de novo" depois de uma falha do modelo, com rascunho pendente, criava o chamado | `engine.failures.test.ts` "failure keeps draft" vermelho antes da correção (`criar_chamado`) | `retry` só confirma de novo quando a última resposta foi falha de gravação (`WRITE_FAILED_RULE`); senão relê a última mensagem | d73cfab |

## Probed

- **Mutações (3, todas mortas):** Crítica só com a empresa inteira parada em `rules/priority.ts` (C25); confiança baixa sem transferir em `engine.ts` (C38); agent respondendo enquanto a conversa espera o analista em `engine.ts` (C40).
- **Avaliação roteirizada:** `bun --cwd packages/agent run eval` com 22 conversas e 13 regras, 68 de 68 conferências (intenção, ação, tipo, categoria, prioridade), 100%.
- **Modelo real:** não rodado. Falta `GOOGLE_GENERATIVE_AI_API_KEY` no `.env`; o adaptador Mastra é provado com `MockLanguageModelV4` (C1). `bun run eval --live` fica pronto para quando a chave existir.
- **Sensibilidade:** a falha de C44 acima mostrou que o teste mede o que diz; C2 a C42 passaram de primeira porque o motor foi escrito inteiro em T6 (desvio registrado), e as mutações cobrem a sensibilidade.
