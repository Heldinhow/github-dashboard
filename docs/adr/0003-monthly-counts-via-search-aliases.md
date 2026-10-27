---
status: accepted
---

# Contagem mensal por 12 buscas e fronteira UTC

## Contexto

Há duas formas de obter PRs mergeados por mês: doze buscas mensais com `issueCount`, ou baixar todos os PRs do período e agrupar por `mergedAt`. A primeira é uma única chamada GraphQL, sem paginação e sem o teto de 1.000 resultados da busca; a segunda permitiria agrupar no fuso de America/Sao_Paulo, mas exige paginação e falha acima de 1.000 PRs no período.

## Decisão

Usar doze buscas mensais em uma única chamada GraphQL, com aliases derivados da chave do mês, e ler cada contagem pelo nome do alias. As doze janelas são geradas no calendário de America/Sao_Paulo, mas o qualificador `merged:` do GitHub usa datas UTC.

## Consequências

PRs mergeados perto da meia-noite UTC podem cair no mês vizinho. A diferença é aceita para um dashboard mensal e fica registrada aqui. O servidor não tem dados por PR; se isso for necessário, a decisão precisa ser revista.

## Alternativas consideradas

- Baixar e agrupar por `mergedAt`: mais fiel à virada local, mas com paginação, teto de 1.000 e mais código.
- Usar contribuições do GraphQL: mede PRs abertos, não mergeados; métrica diferente.
