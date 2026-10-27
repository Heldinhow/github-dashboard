# 01: Primeira visão — PRs mergeados por mês

**What to build:** A página dark em pt-BR com a primeira visão completa: os PRs mergeados de usuario-dev na janela de 12 meses, em barras com valor em cima, eixo Y “PRs mergeados”, grade pontilhada, mês parcial “(até agora)” e os três stat cards. O dado vem de uma API do próprio projeto que lê `GITHUB_TOKEN` do servidor, consulta o GraphQL do GitHub, agrega e cacheia por 1 hora. A página tem skeleton, erro com “Tentar de novo” e “Atualizado às HH:MM”. Ainda não há heatmap, seletor de usuário nem switch de privados.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] O projeto roda com `npm run dev` (Vite + servidor), `npm run build`, `npm start`, `npm test` e `npm run typecheck`; o servidor escuta em `127.0.0.1` e serve o build localmente.
- [x] `GET /api/activity` devolve o usuário, 12 meses (11 fechados + parcial), total, média (11 fechados), recorde (11 fechados), `fetchedAt` e o mês parcial marcado. As contagens vêm de 12 aliases `issueCount`, lidos pelo nome do alias, sem paginação.
- [x] O token fica só no servidor, lido de `GITHUB_TOKEN`; existem `.env.example` e `.gitignore`, nenhum token aparece no frontend, na resposta ou no repositório.
- [x] O gráfico mostra 12 barras, valores, eixo Y, grade pontilhada, uma cor azul e o rótulo “out/26 (até agora)” no mês parcial; os stat cards mostram total, média com uma casa decimal e recorde com mês. A legenda curta explica que média e recorde usam os 11 meses fechados.
- [x] A página é dark, pt-BR, uma coluna no mobile e não rola horizontalmente; o gráfico rola dentro do card em telas estreitas.
- [x] Loading mostra skeleton; erro mostra mensagem + “Tentar de novo”; token ausente, usuário inexistente e rate limit têm mensagens específicas; “Atualizado às HH:MM” aparece no rodapé.
- [x] O cache é em memória, de 1 hora, e erros não são cacheados; o ticket 03 estende a chave para usuário/modo privado.
- [x] Testes Vitest passam para: janelas mensais (bissexto, virada de ano, mês parcial), query builder (ranges, `is:pr is:merged`, author), mapeamento por alias com chaves fora de ordem e estatísticas (total, média, recorde, empate, zero).
- [x] `npm test`, `npm run typecheck` e `npm run build` passam; smoke test manual da API com o token local confirma dados reais.
- [x] README mínimo com instalação, configuração do `.env`, como rodar e o aviso de que não há push, PR ou deploy.

## Notas

Ler a spec do dashboard, o GLOSSARY e os ADRs 0001–0003. Este ticket não inclui heatmap, seletor de usuário, switch de privados nem a query de viewer. Sem push, PR ou deploy.

## Comments

- Cache em memória com TTL de 1 h, chave por login em minúsculas + data local em `America/Sao_Paulo`; o modo privado entra na chave no ticket 03. Erros não são cacheados e requisições concorrentes compartilham a promessa.
- A API já aceita `?user=` e valida o formato, mas a página desta etapa sempre consulta o padrão usuario-dev. Sem query de viewer e sem `contributions`.
- 22 testes Vitest; smoke real em 26/10/2026: total 293, média 24,3, recorde 117 em mar/26, parcial 26. Cache hit em ~1 ms; `TOKEN_MISSING` e `INVALID_USER` verificados.
