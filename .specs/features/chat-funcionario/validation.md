# Chat do funcionário validation

**Data**: 2026-10-28
**HEAD**: o registrado em `proofs.md` (master, só local, sem push)
**Resultado**: CONCLUÍDA - `check_proofs.py --mutations` com todas as linhas `pass` e 3 de 3 mutações mortas; `validate_verification.py` sai com 0 (só o aviso de auto-verificação).

## O que passou

- `check_proofs.py`: C1 a C33 e as linhas de Build, todas `pass`.
- Mutações: 3 de 3 mortas (C18, C24, C5).
- `bun run test`: agent 82, web 78, tickets 125, server 22, auth 7, api 5; 0 falhas.
- `bun run check-types`: 9 de 9. `bun biome check apps packages`: sem erros (1 aviso antigo em `env.public.ts`, vai para a `entrega`).

## Verificação

- Auto-verificação (degradada, sem sub-agente), 4 achados corrigidos; ver verification.md e screens.md.

## Desvios registrados

1. Aprovações de design e tarefas delegadas pelo André em t152u (AD-020).
2. Sem chave do Gemini no box: a caminhada usou o entendedor por palavras-chave (D-06), só com `DEV_SEED_ENABLED=true`. Os textos das respostas vêm dele e do motor, não do modelo.
3. O streaming é palavra a palavra depois da decisão do motor, não token a token do modelo (D-02).
4. O card do chamado não mostra a descrição: `TicketView` não a traz. Fica para quem mexer no `agent`.
5. O id do rascunho é `D-<seq da mensagem>`; o motor não guarda um id próprio.
6. Mastra soma cerca de 1,6 MB gzip ao Worker.
