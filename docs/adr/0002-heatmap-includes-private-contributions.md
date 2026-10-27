---
status: accepted
---

# Heatmap inclui contribuições privadas; o modo privado filtra apenas PRs

## Contexto

O calendário de contribuições do GraphQL já inclui contribuições privadas como contagens anônimas quando o perfil do usuário permite exibi-las. A API não oferece um filtro por requisição para excluí-las, e o total do calendário não traz a distribuição pública por dia. Nos dados de 26/10/2026, 1.564 de 2.474 contribuições eram privadas.

## Decisão

O heatmap sempre espelha o calendário do GitHub e exibe uma nota de que inclui contribuições privadas. O switch "incluir repositórios privados" afeta somente o gráfico de PRs, adicionando `is:public` à busca quando desligado. Para um usuário diferente do viewer, o switch fica desabilitado e a busca é sempre pública.

## Consequências

O total do heatmap não é comparável à soma dos PRs públicos e pode ser bem maior, porque inclui commits, issues e reviews, além das contribuições privadas. O switch não muda o heatmap. A nota na interface evita que a diferença pareça um bug. Não é possível oferecer um heatmap somente público sem outra fonte de dados.

## Alternativas consideradas

- Subtrair `restrictedContributionsCount` do total: não há distribuição diária, então os níveis ficariam errados.
- Construir o heatmap a partir de PRs/issues: mudaria a métrica e não representaria commits/reviews.
- Usar um segundo token sem acesso a privados: mais configuração e ainda assim sem garantia de um calendário somente público.
