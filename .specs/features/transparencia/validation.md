# Transparência validation

**Data**: 2026-10-28
**HEAD**: o registrado em `proofs.md` (master, só local, sem push)
**Resultado**: CONCLUÍDA - `check_proofs.py --mutations` com todas as linhas `pass` e 3 de 3 mutações mortas; `validate_verification.py` sai com 0 (só o aviso de auto-verificação).

## O que passou

- `check_proofs.py`: C1 a C18 e as linhas de Build, todas `pass`.
- Mutações: 3 de 3 mortas (C2, C9, C13).
- `bun run test`: agent 72, web 27, tickets 125, server 11, auth 7, api 5; 0 falhas.
- `bun run check-types`: 9 de 9. `bun biome check apps packages`: sem erros (1 aviso antigo em `env.public.ts`, vai para a `entrega`).

## Verificação

- Auto-verificação (degradada, sem sub-agente), 1 achado corrigido em 04aa747; ver verification.md.

## Desvios registrados

1. Aprovações de design e tarefas delegadas pelo André em t152u (AD-020).
2. Sem `screens.md`: a feature não tem rota própria. `ActionLine` e `DecisionPanel` são conferidos nas telas da `chat-funcionario` e da `console-analista`.
3. As chamadas ao modelo não aparecem na linha de ações (o catálogo do spec não tem rótulo para elas); aparecem no gerúndio ("entendendo sua mensagem…") e nos passos do painel.
4. "calculou o prazo" também sai quando a transferência calcula o prazo de contato.
5. TRN-14 e TRN-18 estão provados no apresentador e no componente; o clique no console e o total da conversa na tela ficam na `console-analista`. O log (TRN-17) sai por `deps.log`; ligar ao `console.log` do Worker fica na `chat-funcionario`.
6. Em T2 e T3 o vermelho foi o módulo ausente; os testes passaram na primeira rodada depois do código.
