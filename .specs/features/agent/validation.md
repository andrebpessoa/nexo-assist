# Agent validation

**Data**: 2026-10-28
**HEAD**: o registrado em `proofs.md` (master, só local, sem push)
**Resultado**: CONCLUÍDA - `check_proofs.py --mutations` com todas as linhas `pass` e 3 de 3 mutações mortas; `validate_verification.py` sai com 0 (só o aviso de auto-verificação).

## O que passou

- `check_proofs.py`: C1 a C47 e as linhas de Build, todas `pass`.
- Mutações: 3 de 3 mortas (C25, C38, C40).
- `bun run test`: agent 52, auth 7, api 5, web 22, tickets 125 (smoke sem `SERVER_URL`), server 11; 0 falhas.
- `bun run check-types`: 9 de 9. `bun biome check apps packages`: sem erros (1 aviso antigo em `env.public.ts`, vai para a `entrega`).
- `bun --cwd packages/agent run eval`: 22 conversas, 100% (roteirizada).

## Verificação

- Auto-verificação (degradada, sem sub-agente), 1 achado corrigido em d73cfab; ver verification.md. Sem telas nesta feature (as capturas do chat ficam na `chat-funcionario`).

## Desvios registrados

1. Aprovações de design e tarefas delegadas pelo André em t152u (AD-020).
2. T2 foi commitado sem passar no `tsc`; corrigido no commit seguinte (8b66771), sem reescrever histórico.
3. T3: teste e código escritos juntos, sem vermelho mostrado.
4. O motor foi escrito inteiro em T6; T7 a T9 só acrescentaram testes, que passaram de primeira. A sensibilidade é coberta pelas 3 mutações.
5. Duas chamadas ao modelo por mensagem no máximo: `understand` sempre, `judge` só quando há artigos ou chamados a comparar.
6. A avaliação ao vivo (Flash-Lite) não rodou: falta `GOOGLE_GENERATIVE_AI_API_KEY`.
7. Mastra em Cloudflare Workers ainda não foi provado; cabe na `chat-funcionario`, com o plano B do design (`ai` + `@ai-sdk/google`).
