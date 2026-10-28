# Transparência verification

**Verdict**: PASS
**Mutations**: 3 - probed C2, C9, C13
**Proofs**: `proofs.md` no HEAD do fechamento
**Verifier**: self-verified (degraded - no sub-agent)

## Findings

| Finding | Evidence | Fix | Closed |
| --- | --- | --- | --- |
| "não conseguiu" de "transferiu" e "reabriu" saía sem infinitivo | Revisão do catálogo em T2; teste "service down shows failed label" ganhou o caso de `chamados.transferir` | Verbos em "-iu" viram "-ir" | 04aa747 |

## Probed

- **Mutações (3, todas mortas):** rótulo repetido na linha (C2); 80% na faixa média (C9); funcionário vendo modelo, tokens e custo (C13), todas em `transparency.ts`.
- **Passos reais:** C2, C3, C7, C8, C11, C12, C13, C16 e C17 rodam o motor sobre o seed (libsql em memória) com entendimento roteirizado; o registro conferido é o que o motor gravou, não um objeto montado à mão.
- **Reinício:** C16 lê o registro por um store novo sobre o mesmo banco e compara com o que a resposta devolveu.
- **Log:** C17 confere que a linha JSON não traz o texto da mensagem nem o título extraído.
- **Telas:** sem rota nesta feature; a linha e o painel entram nas telas da `chat-funcionario` (capturas 02 e 03) e da `console-analista` (04), que conferem o visual.
