# Último resultado da avaliação ao vivo

Avaliação ao vivo (google/gemini-3.5-flash-lite) - 22 conversas, em 2026-10-29. Gerado por `bun --cwd packages/agent run eval --live`.

```
 100%  2/2  Saudação e mensagens vagas
 100%  9/9  Central de ajuda antes do chamado
 100%  5/5  Consulta de chamados
 100%  3/3  Vencido: oferecer analista
 100%  4/4  Privacidade
  47%  7/15  Prioridade por impacto e urgência
 100%  6/6  Crítica: criar e transferir
  17%  1/6  Perguntar uma coisa por vez
  44%  4/9  Sem duplicar: complementar ou reabrir
 100%  3/3  Confirmar antes de gravar
  67%  2/3  Transferir para analista
 100%  2/2  Só TI
 100%  1/1  Seguir as regras
```

**Total**: 72% dos campos esperados.

Tokens: 12697 de entrada, 4022 de saída. Custo no pago: US$ 0.0139 (US$ 0.00063 por conversa).

## Erros

- erro: prioridade-baixa passo 1 action: esperado rascunho_chamado, veio responder_artigo
- erro: prioridade-baixa passo 1 type: esperado REQ, veio null
- erro: prioridade-baixa passo 1 category: esperado Hardware, veio null
- erro: prioridade-baixa passo 1 priority: esperado Baixa, veio null
- erro: prioridade-media passo 1 action: esperado rascunho_chamado, veio perguntar
- erro: prioridade-media passo 1 type: esperado INC, veio null
- erro: prioridade-media passo 1 category: esperado Software, veio null
- erro: prioridade-media passo 1 priority: esperado Média, veio null
- erro: afetados-nao-sei passo 1 action: esperado perguntar, veio responder_artigo
- erro: afetados-nao-sei passo 2 action: esperado rascunho_chamado, veio responder
- erro: afetados-nao-sei passo 2 type: esperado INC, veio null
- erro: afetados-nao-sei passo 2 category: esperado E-mail, veio null
- erro: afetados-nao-sei passo 2 priority: esperado Média, veio null
- erro: duplicado-resolvido-recente passo 1 action: esperado rascunho_reabrir, veio responder_artigo
- erro: duplicado-resolvido-antigo passo 1 action: esperado rascunho_chamado, veio responder_artigo
- erro: duplicado-resolvido-antigo passo 1 type: esperado INC, veio null
- erro: duplicado-resolvido-antigo passo 1 category: esperado E-mail, veio null
- erro: duplicado-resolvido-antigo passo 1 priority: esperado Média, veio null
- erro: confianca-baixa passo 1 action: esperado transferir, veio responder
