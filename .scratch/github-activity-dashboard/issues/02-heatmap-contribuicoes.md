# 02: Heatmap de contribuições do último ano

**What to build:** A segunda visão na mesma página: o heatmap das contribuições dos últimos 365 dias, com título “N contribuições no último ano”, cinco níveis de verde, legenda “Menos / Mais”, meses no topo, seg/qua/sex na lateral, tooltip com data e contagem e a nota de que o heatmap inclui contribuições privadas. O endpoint existente passa a devolver também o calendário de contribuições, agregado e cacheado junto com os PRs.

**Blocked by:** 01.

**Status:** done

- [x] `GET /api/activity` inclui `contributions` com total, `start`, `end` e `days`; a janela é de 365 dias inclusivos terminando hoje, no fuso `America/Sao_Paulo`, com início e fim do dia locais; os dias são filtrados para o intervalo.
- [x] O heatmap renderiza a grade de domingo a sábado, com meses no topo e rótulos seg/qua/sex; o primeiro mês da janela é rotulado mesmo quando o dia 1 está fora, e rótulos que colidiriam são omitidos.
- [x] Os cinco níveis seguem a regra da spec: zero é 0; todos os não-zero iguais são 1; `q1 === q3` ou `q3 === max` usam faixas relativas ao máximo; caso contrário, os quartis; o pico de 70 dias com 1 e 30 com 100 chega ao nível 4.
- [x] A legenda “Menos / Mais”, o tooltip com data + contagem (“Nenhuma contribuição” para zero), o foco por teclado e o `aria-label` por célula funcionam; a nota de privadas aparece sempre.
- [x] A grade lida com datas `YYYY-MM-DD` como datas locais, padding das bordas, 53 ou 54 colunas; em telas estreitas ela rola dentro do card e a página não rola na horizontal.
- [x] O gráfico de barras, os stats, o skeleton, o erro/retry e o `fetchedAt` continuam funcionando; o heatmap tem skeleton e participa do mesmo erro da API.
- [x] Testes Vitest passam para os níveis (vazio, todos zero, todos iguais, `q1 === q3`, `q3 === max`, limites, um único dia) e para o layout da grade (domingo, padding, 53/54 colunas, primeiro mês, `TZ=America/Sao_Paulo`).
- [x] `npm test`, `npm run typecheck` e `npm run build` passam; smoke test manual da API confirma o total e os dias.
- [x] Sem seletor de usuário/switch de privados ainda; não há push, PR ou deploy.

## Notas

Ler a spec do dashboard, o GLOSSARY e os ADRs 0001–0003, com atenção ao ADR-0002 (o heatmap inclui privadas). A nota do heatmap deve aparecer sempre.

## Comments

- Janela: `today - 364` a `today` no calendário local; `from`/`to` usam `-03:00` fixo (`America/Sao_Paulo` não tem horário de verão desde 2019). O total é a soma dos 365 dias filtrados; dias ausentes na resposta do GitHub entram como zero.
- A janela de 365 dias sempre produz 53 colunas quando alinhada a semanas (371 dias de grade); o layout suporta 54 e tem teste com uma lista de 366 dias.
- Rótulos de mês a menos de 2 colunas do anterior são omitidos: um rótulo de 3 letras ocupa ~16 px e a coluna tem 14 px.
- Smoke em 26/10/2026 local: 2.474 contribuições, 204 dias não-zero, 365 dias, `start` 2025-10-27, `end` 2026-10-26, soma dos dias igual ao total; 293 PRs preservados; cache hit ~16 ms; `INVALID_USER` 400.
- 40 testes; `npm test` roda com `TZ=America/Sao_Paulo`. Typecheck e build verdes. Sem seletor/switch (fica no ticket 03), sem push/PR/merge.
- T04: a conta/URL passou a ser por perfil; o heatmap continua global ao perfil e não recebe filtros de org/repo.
