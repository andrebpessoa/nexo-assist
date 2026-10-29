# Diagnóstico dos erros da avaliação ao vivo

Rodada de diagnóstico em 2026-10-28 com `google/gemini-3.5-flash-lite`, só nas conversas com erro (mais `duplicado-aberto` como controle), por um script fora do repo que grava a saída crua de `understand` e `judge`. Uma amostra por conversa: o modelo não é determinístico.

**Veredito**: o entendimento acerta quase tudo. 14 dos 19 erros passam pela regra do motor que escolhe entre artigo e chamado, alimentada por um juiz com critério frouxo. O resto: uma lacuna na regra que deriva `blocksWork`, um dado inventado pelo modelo e uma expectativa que contradiz a AGT-05.

| Conversa | Erros | O que o modelo devolveu | Causa |
| --- | --- | --- | --- |
| prioridade-baixa | 4 | intent, REQ, Hardware, Só eu, blocksWork=false: tudo certo. Juiz: `pedido-de-equipamento`, fits=true | Motor + prompt do juiz. O artigo só diz que monitor se pede por REQ; o juiz o marca como "responde" e o motor (`startTicket`) devolve o artigo em vez do rascunho. |
| duplicado-resolvido-recente | 1 | Entendimento certo. Juiz: `senha-bloqueada` fits=true **e** `INC-20150` com 95% | Motor: o artigo é testado antes da duplicidade, então o reabrir nunca é avaliado. Prompt do juiz: a pessoa disse que o autoatendimento (o passo do artigo) não libera. |
| duplicado-resolvido-antigo | 4 | Entendimento certo. Juiz: `outlook-nao-sincroniza` fits=true e `INC-19877` com 95% | Motor: artigo antes da duplicidade. O artigo cobre o celular, mas a pessoa diz "de novo" e já há chamado sobre isso. |
| afetados-nao-sei | 5 | Entendimento certo, **menos** `affected: "Só eu"`, que a pessoa não disse. Juiz: `outlook-nao-sincroniza` fits=true | Prompt do juiz: o artigo é de sincronizar, o problema é enviar. O passo 2 erra em cascata (a opção "Não sei" cai na oferta de chamado e vira "nao"). Corrigido o artigo, o `affected` inventado pula a pergunta: modelo/prompt. |
| prioridade-media | 4 | Tudo certo, com `workaround: true` e `blocksWork: null` | Motor: `fieldsFrom` deriva `workaround` de `blocksWork`, mas não o contrário. Com alternativa, não impede o trabalho (Anexo A, Média). |
| confianca-baixa | 1 | `outro`, confiança 70 | Expectativa x spec: o prompt e a AGT-05 mandam mensagem vaga para `outro` (saudação), e o motor não aplica o limiar a `outro`. A conversa espera `transferir`. |

Schema da saída estruturada: nenhum erro veio dele. Os campos chegam válidos e preenchidos.

## Hipóteses

- **Separar decisão de entendimento**: já está separado; o modelo não escolhe a ação. O problema é a pergunta frouxa feita ao juiz ("o artigo que responde") e a ordem no motor.
- **Pedir sinais e deixar o código decidir**: é a correção principal para o artigo. O juiz devolve sinais (o artigo trata o mesmo sintoma? só orienta a abrir pedido? a pessoa já tentou o passo dele?) e o motor decide.
- **Exemplos curtos no prompt**: úteis para `affected` só quando dito e para "alternativa = não impede". Prioridade em si já vem certa.
- **Flash maior via LLM_MODEL**: não ataca a causa; o free tier do Flash (cerca de 20 req/dia, AD-008) não comporta uma rodada (~100 chamadas).

## Conta

68 campos; hoje 49 certos (72%). Corrigidos o artigo/ordem (9 erros) e o `blocksWork` (4), sobram 6 erros (5 de afetados-nao-sei se o `affected` inventado persistir, 1 de confianca-baixa): 62/68 = 91%. Com o prompt do `affected`, 67/68.
