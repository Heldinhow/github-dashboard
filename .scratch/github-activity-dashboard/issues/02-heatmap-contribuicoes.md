# 02: Heatmap de contribuições do último ano

**What to build:** A segunda visão na mesma página: o heatmap das contribuições dos últimos 365 dias, com título “N contribuições no último ano”, cinco níveis de verde, legenda “Menos / Mais”, meses no topo, seg/qua/sex na lateral, tooltip com data e contagem e a nota de que o heatmap inclui contribuições privadas. O endpoint existente passa a devolver também o calendário de contribuições, agregado e cacheado junto com os PRs.

**Blocked by:** 01.

**Status:** ready-for-agent

- [ ] `GET /api/activity` inclui `contributions` com total, `start`, `end` e `days`; a janela é de 365 dias inclusivos terminando hoje, no fuso `America/Sao_Paulo`, com início e fim do dia locais; os dias são filtrados para o intervalo.
- [ ] O heatmap renderiza a grade de domingo a sábado, com meses no topo e rótulos seg/qua/sex; o primeiro mês da janela é rotulado mesmo quando o dia 1 está fora, e rótulos que colidiriam são omitidos.
- [ ] Os cinco níveis seguem a regra da spec: zero é 0; todos os não-zero iguais são 1; `q1 === q3` ou `q3 === max` usam faixas relativas ao máximo; caso contrário, os quartis; o pico de 70 dias com 1 e 30 com 100 chega ao nível 4.
- [ ] A legenda “Menos / Mais”, o tooltip com data + contagem (“Nenhuma contribuição” para zero), o foco por teclado e o `aria-label` por célula funcionam; a nota de privadas aparece sempre.
- [ ] A grade lida com datas `YYYY-MM-DD` como datas locais, padding das bordas, 53 ou 54 colunas; em telas estreitas ela rola dentro do card e a página não rola na horizontal.
- [ ] O gráfico de barras, os stats, o skeleton, o erro/retry e o `fetchedAt` continuam funcionando; o heatmap tem skeleton e participa do mesmo erro da API.
- [ ] Testes Vitest passam para os níveis (vazio, todos zero, todos iguais, `q1 === q3`, `q3 === max`, limites, um único dia) e para o layout da grade (domingo, padding, 53/54 colunas, primeiro mês, `TZ=America/Sao_Paulo`).
- [ ] `npm test`, `npm run typecheck` e `npm run build` passam; smoke test manual da API confirma o total e os dias.
- [ ] Sem seletor de usuário/switch de privados ainda; não há push, PR ou deploy.

## Notas

Ler a spec do dashboard, o GLOSSARY e os ADRs 0001–0003, com atenção ao ADR-0002 (o heatmap inclui privadas). A nota do heatmap deve aparecer sempre.
