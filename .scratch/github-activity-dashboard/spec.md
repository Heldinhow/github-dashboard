# Especificação: Dashboard de atividade no GitHub

Status: ready-for-agent

Decisões relacionadas: [ADR-0001](../../docs/adr/0001-github-token-only-on-server.md), [ADR-0002](../../docs/adr/0002-heatmap-includes-private-contributions.md), [ADR-0003](../../docs/adr/0003-monthly-counts-via-search-aliases.md), [ADR-0004](../../docs/adr/0004-multi-profile-config.md). Vocabulário: [GLOSSARY](../../GLOSSARY.md).

## Problema

Quero acompanhar meu ritmo de trabalho no GitHub em uma página só, mas o GitHub espalha PRs mergeados e contribuições em telas diferentes, não mostra média nem recorde mensal e não permite trocar o usuário sem levar um token para o navegador. Também quero usar o mesmo app com a conta pessoal e a do trabalho — possivelmente em outro GitHub Enterprise —, com filtros de organização/repositório e fuso do corte mensal, sem editar código.

## Solução

Uma página única, escura e em pt-BR, com duas visões: barras de PRs mergeados na janela de 12 meses (com total, média mensal e recorde mensal) e um heatmap de contribuições do último ano. O navegador fala com uma API do próprio projeto; essa API escolhe um perfil configurado (usuário, token, URL e filtros), consulta o GraphQL, agrega e cacheia por 1 hora. O perfil padrão vem de variáveis de ambiente e perfis adicionais vêm de um arquivo local fora do git; a interface tem seletor de perfil e o modo privado pode ser ligado ou desligado no gráfico de PRs.

## Histórias de usuário

1. Como dono do dashboard, quero abrir a página já com o perfil padrão configurado no ambiente para ver minha atividade sem editar código.
2. Como dono, quero ver os PRs mergeados da janela de 12 meses em uma barra por mês para identificar tendências.
3. Como dono, quero que o mês parcial seja rotulado “(até agora)” para não compará-lo como um mês fechado.
4. Como dono, quero o valor exato em cima de cada barra para ler o número sem interagir.
5. Como dono, quero linhas de grade pontilhadas e o eixo Y “PRs mergeados” para estimar valores.
6. Como dono, quero ver total, média mensal e recorde mensal do período para resumir o ritmo.
7. Como dono, quero que média e recorde ignorem o mês parcial para não distorcer as estatísticas.
8. Como dono, quero que meses sem PRs apareçam como barra zero para enxergar lacunas.
9. Como dono, quero um heatmap das contribuições do último ano para ver consistência.
10. Como dono, quero cinco níveis de verde e a legenda “Menos / Mais” para ler intensidade.
11. Como dono, quero meses no topo e seg/qua/sex na lateral para me orientar no heatmap.
12. Como dono, quero um tooltip com data e contagem ao passar o mouse ou focar um dia.
13. Como dono, quero o total de contribuições no título do heatmap.
14. Como dono, quero uma nota de que o heatmap inclui contribuições privadas para entender o número.
15. Como dono, quero trocar o usuário por um login para ver a atividade de outra pessoa.
16. Como dono, quero o perfil, o usuário e o modo privado na URL para recarregar ou reabrir a mesma visão.
17. Como dono, quero ligar e desligar repositórios privados no gráfico de PRs.
18. Como dono, quero o switch desabilitado com explicação quando o usuário selecionado não é o viewer.
19. Como usuário local, quero um skeleton enquanto os dados carregam para saber que a página está trabalhando.
20. Como usuário local, quero uma mensagem de erro com “Tentar de novo” para me recuperar de falhas.
21. Como usuário local, quero mensagens específicas para token ausente, usuário inexistente e limite da API para saber o que fazer.
22. Como dono, quero ver quando os dados foram atualizados para saber a idade do cache.
23. Como usuário de celular, quero os cards empilhados e os gráficos roláveis para ler tudo sem zoom.
24. Como usuário de teclado, quero focar os dias do heatmap e ver o tooltip para inspecionar sem mouse.
25. Como usuário de leitor de tela, quero resumos e rótulos nos gráficos para acessar os dados.
26. Como dono, quero a página em pt-BR e com tema escuro.
27. Como dono, quero que o token nunca chegue ao navegador para não vazar credencial.
28. Como dono, quero cache de 1 hora para não estourar o limite da API.
29. Como desenvolvedor, quero testes da agregação mensal e dos níveis do heatmap para evitar regressões.
30. Como desenvolvedor, quero um `.env.example` e instruções para rodar localmente.
31. Como dono, quero aplicar o usuário só ao confirmar para não gastar buscas enquanto digito.
32. Como dono, quero os controles desabilitados durante o carregamento para evitar requisições concorrentes.
33. Como usuário local, quero zeros em vez de erro quando o usuário não tem atividade.
34. Como dono, quero que o login digitado seja normalizado para o login canônico do GitHub.
35. Como usuário local, quero que o heatmap continue legível quando todos os dias têm a mesma contagem.
36. Como dono, quero que a página não role horizontalmente, mesmo com os gráficos largos.
37. Como dono, quero configurar usuário, token e URL da API por variáveis de ambiente para usar qualquer conta sem editar código.
38. Como dono, quero alternar entre perfis nomeados (pessoal, trabalho) sem reiniciar o app.
39. Como dono, quero que cada perfil referencie o token por uma variável de ambiente, sem token em texto no repositório ou no arquivo de perfis.
40. Como dono, quero restringir o gráfico de PRs a organizações ou a uma lista de repositórios para ver só o contexto de trabalho.
41. Como dono, quero escolher o fuso do corte mensal do perfil para que os meses batam com o meu calendário.
42. Como dono, quero usar GitHub Enterprise informando a URL da API e, se preciso, a URL do GraphQL.
43. Como dono, quero um exemplo de perfis e instruções em pt-BR para rodar com a conta pessoal, com a do trabalho e em outra máquina.
44. Como dono, quero que a ausência de usuário/token/configuração vire uma mensagem clara, sem cair em uma conta padrão embutida.
45. Como dono, quero saber na interface que os filtros de organização/repositório valem só para os PRs, não para o heatmap.

## Decisões de implementação

### Stack e execução

- Node 26 + Express 5 + npm; Vite + React + TypeScript; CSS puro; SVG próprio; Vitest.
- Sem Tailwind, biblioteca de charts, router ou UI kit.
- TypeScript estrito. O servidor roda com o TypeScript nativo do Node, sem `tsx`; código apagável (sem `enum`/`namespace`). `npm run typecheck` cobre servidor, frontend, módulos puros e testes.
- Scripts npm: `dev` (Vite + servidor em paralelo), `build` (build do frontend), `start` (servidor Express servindo o build), `test` (Vitest), `typecheck` (`tsc --noEmit`).
- Em desenvolvimento, o Vite roda na 5173 e faz proxy de `/api` para o servidor na 3001. Em produção, o Express serve o build do Vite e a API na mesma origem, sem CORS.
- O servidor carrega `.env` se existir. O perfil padrão usa `GITHUB_USER` e `GITHUB_TOKEN` (obrigatórios), `GITHUB_API_URL` (opcional; padrão `https://api.github.com`), `GITHUB_GRAPHQL_URL` (opcional; derivada), `GITHUB_PROFILE_NAME` (opcional; padrão `default`), `GITHUB_TIME_ZONE` (opcional; padrão `UTC`), `GITHUB_ORGS`/`GITHUB_REPOS` (opcionais). Não há usuário padrão embutido no código.
- `GITHUB_PROFILES_FILE` (opcional; padrão `./profiles.local.json`) aponta para o JSON local de perfis adicionais, fora do git. `profiles.example.json` é versionado. Tokens só por variável de ambiente (`tokenEnv`), nunca no arquivo.
- `.env` fica no `.gitignore`; `.env.example` documenta as variáveis sem valores reais e `profiles.local.json` também é ignorado. Nenhuma variável `VITE_` contém token.
- O servidor inicia sem configuração e responde `CONFIG_MISSING`/`TOKEN_MISSING` na API; a página mostra o erro em vez de cair em uma conta padrão.

### Perfis e configuração

- Perfil é o conjunto nomeado de usuário, token (via variável de ambiente), URL da API/GraphQL, filtros e fuso. O perfil padrão vem do ambiente; perfis adicionais vêm do arquivo local.
- Formato do arquivo: `{ "profiles": [ { "name": "Trabalho", "user": "login", "tokenEnv": "WORK_GITHUB_TOKEN", "apiUrl": "https://ghe.exemplo/api/v3", "graphqlUrl": "https://ghe.exemplo/api/graphql", "orgs": ["minha-org"], "repos": ["owner/repo"], "timeZone": "America/Sao_Paulo" } ] }`. `name` é único; `user` e `tokenEnv` são obrigatórios; `apiUrl`, `graphqlUrl`, `orgs`, `repos` e `timeZone` são opcionais.
- `GITHUB_ORGS`/`GITHUB_REPOS` são listas separadas por vírgula no ambiente; no arquivo são arrays. Se ambos existirem, `repos` vence. `orgs`/`repos` filtram apenas a busca de PRs; o heatmap continua sendo o calendário global do perfil.
- `timeZone` é um fuso IANA validado. Padrão `UTC`; o `.env.example` mostra `America/Sao_Paulo` como exemplo. Ele define as janelas mensais e a janela de 365 dias do heatmap do perfil. O qualificador `merged:` do GitHub continua usando datas UTC (ADR-0003).
- URL do GraphQL: `graphqlUrl` explícita vence; senão deriva de `apiUrl`: `https://api.github.com` → `https://api.github.com/graphql`; `https://HOST/api/v3` → `https://HOST/api/graphql`; `https://HOST` → `https://HOST/api/graphql`. Normalizar barras e validar a URL.
- Configuração lida no startup; mudanças exigem reinício. Nome duplicado, JSON inválido, campo obrigatório ausente, URL/timezone/filtro inválido → `CONFIG_INVALID`; falta de `GITHUB_USER` → `CONFIG_MISSING`; variável de token do perfil ausente → `TOKEN_MISSING`.
- O seletor de perfil usa a lista `profiles` da resposta. Trocar de perfil atualiza `?profile=`, volta o usuário para o usuário do perfil, liga o modo privado e busca de novo. Erros de perfil desconhecido ou token ausente também trazem `profiles`, para o seletor continuar populado e permitir a troca.

### Arquitetura

- Navegador → `GET /api/activity` → serviço de atividade → cliente GraphQL do GitHub.
- O serviço valida a entrada, resolve o viewer, calcula o modo privado efetivo, consulta o cache, monta a janela de 12 meses, consulta o GitHub, agrega e devolve o contrato abaixo.
- Módulos puros, sem React e sem rede: janelas mensais, query builder das buscas, mapeamento das respostas por alias, estatísticas (total/média/recorde), níveis do heatmap e cache.
- O serviço carrega os perfis do ambiente + arquivo local no startup, resolve o perfil pedido, lê o token da variável de ambiente do perfil, deriva/valida a URL GraphQL e consulta o viewer daquele perfil.
- O heatmap é montado no cliente a partir da lista plana de dias devolvida pela API; os níveis são calculados no cliente pelo módulo puro.
- O viewer é resolvido uma vez por perfil com uma query `viewer { login }` e mantido em memória. A primeira requisição de dados de cada perfil faz duas chamadas ao GraphQL (viewer + dados); as seguintes fazem uma. O valor é descartado ao reiniciar o processo.

### Contrato da API

`GET /api/activity?profile=<nome>&user=<login>&private=0|1`

- `profile` é opcional; padrão é o perfil do ambiente (`GITHUB_PROFILE_NAME`, padrão `default`). Perfil desconhecido → 400 `UNKNOWN_PROFILE`.
- `user` é opcional; padrão é o usuário do perfil. `private` é opcional; padrão `1`.
- `user` é validado pelo formato de login do GitHub (1–39 caracteres, alfanumérico e hífen, sem hífen no início/fim); inválido → 400.
- `private` aceita apenas `0` ou `1`; qualquer outro valor → 400 `INVALID_PRIVATE`.
- O servidor devolve o login canônico em `user` e o nome do perfil em `profile`.
- `viewer` é o login dono do token do perfil. `canIncludePrivate` é verdadeiro quando `user` e `viewer` são o mesmo login (comparação sem diferenciar maiúsculas/minúsculas).
- `includePrivate` é o modo efetivo: `private === 1` **e** `canIncludePrivate`. Quando falso, as buscas de PR usam `is:public`. Para um usuário diferente do viewer, o modo efetivo é sempre falso.
- A resposta 200 tem este formato (exemplo abreviado; a resposta real traz 12 meses e 365 dias):

```json
{
  "profile": "Pessoal",
  "profiles": [
    { "name": "Pessoal", "user": "octocat" },
    { "name": "Trabalho", "user": "octocat-work" }
  ],
  "user": "octocat",
  "viewer": "octocat",
  "filters": { "orgs": [], "repos": [], "timeZone": "America/Sao_Paulo" },
  "includePrivate": true,
  "canIncludePrivate": true,
  "months": [
    { "key": "2025-11", "label": "nov/25", "count": 7, "isPartial": false }
  ],
  "stats": {
    "total": 293,
    "average": 24.3,
    "record": { "key": "2026-03", "label": "mar/26", "count": 117 }
  },
  "contributions": {
    "total": 2474,
    "start": "2025-10-27",
    "end": "2026-10-26",
    "days": [{ "date": "2025-10-27", "count": 0 }]
  },
  "fetchedAt": "2026-10-26T18:00:00.000Z"
}
```

- `profile` é o nome do perfil selecionado; `profiles` lista os perfis válidos (nome e usuário), sem tokens nem URLs; `filters` traz `orgs`, `repos` e `timeZone` efetivos (se ambos orgs e repos existirem, `repos` vence).
- `months` tem exatamente 12 itens, do mais antigo ao mais recente; o último é o mês parcial (`isPartial: true`). As janelas usam o `timeZone` do perfil.
- `stats.total` soma os 12 meses, incluindo o parcial. `stats.average` usa apenas os 11 meses fechados, com uma casa decimal. `stats.record` é o maior mês fechado; empate fica com o mês mais recente; é `null` quando os 11 meses fechados têm zero.
- `contributions.total` é a soma dos dias; `start`/`end` são as datas locais do intervalo no `timeZone` do perfil; `days` é cronológico, filtrado a `[start, end]` e inclui dias com zero.
- `fetchedAt` é o instante em que os dados vieram do GitHub, não o instante do cache hit.
- A resposta leva `Cache-Control: no-store`; o cache é interno do servidor.
- Erros usam `{ "error": { "code": "...", "message": "...", "retryAt"?: "...", "profiles"?: [...] } }` e mensagens em pt-BR; `retryAt`, quando presente, é ISO 8601 UTC:

| HTTP | code | Quando |
| --- | --- | --- |
| 400 | `INVALID_USER` | Login fora do formato permitido. |
| 400 | `INVALID_PRIVATE` | `private` diferente de `0` ou `1`. |
| 400 | `UNKNOWN_PROFILE` | `profile` não existe entre os perfis configurados. |
| 404 | `USER_NOT_FOUND` | O GraphQL não encontrou o usuário. |
| 429 | `RATE_LIMITED` | Limite do GitHub; `retryAt` com o horário de reset. |
| 502 | `TOKEN_INVALID` | Token recusado pelo GitHub ou sem permissão. |
| 502 | `GITHUB_ERROR` | Falha de rede, timeout, 5xx ou resposta incompleta. |
| 503 | `CONFIG_MISSING` | `GITHUB_USER` ou um perfil padrão válido não configurado. |
| 503 | `CONFIG_INVALID` | Arquivo de perfis, URL, fuso ou filtro inválido. |
| 503 | `TOKEN_MISSING` | Variável de ambiente do token do perfil não configurada. |

- `profiles` acompanha `UNKNOWN_PROFILE` e `TOKEN_MISSING` (configuração de perfis conhecida), no mesmo formato da resposta 200, para a interface manter o seletor de perfil utilizável. Erros de configuração sem perfis carregados não trazem a lista.
- Mensagens seguras: nunca incluir o token nem o corpo bruto de erro do GitHub. O cliente exibe a mensagem do servidor.

### Consultas ao GitHub

- Endpoint GraphQL do perfil: `graphqlUrl` explícita ou derivada de `apiUrl`/`GITHUB_API_URL`; método POST, `Authorization: bearer <token do perfil>`, `Content-Type: application/json`, `User-Agent` próprio e timeout de 10 s. Sem retry automático.
- Resolver do viewer: `query { viewer { login } }`, cacheado por perfil. Se falhar, a API devolve o erro mapeado antes de consultar os dados.
- Uma única chamada de dados por cache miss, contendo 12 aliases de busca e a coleção de contribuições:

```graphql
query ($user: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $user) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
  m2025_11: search(query: "is:pr is:merged author:<login> merged:2025-11-01..2025-11-30", type: ISSUE, first: 1) { issueCount }
  # ... 11 outros aliases, um por mês
}
```

- Cada alias tem o nome `m<AAAA>_<MM>` e usa `first: 1`; só `issueCount` importa. As contagens são lidas **pelo nome do alias**, nunca pela ordem do array, porque o GitHub não garante a ordem das chaves na resposta.
- A busca de PR é `is:pr is:merged author:<login> merged:<início>..<fim>`; quando o modo privado está desligado, inclui `is:public`. O login já foi validado; as datas são geradas pelo servidor.
- Filtros do perfil: se `repos` estiver preenchido, adiciona `repo:<owner/name>` para cada repositório; senão, se `orgs` estiver preenchido, adiciona `org:<nome>` para cada organização. Se ambos existirem, `repos` vence. Os filtros valem só para as buscas de PR; o heatmap continua global.
- As 12 janelas são geradas no `timeZone` do perfil: 11 meses fechados e o mês parcial, cujo fim é hoje. O qualificador `merged:` do GitHub usa datas UTC; a diferença de borda é aceita (ADR-0003).
- Heatmap: `from` é o início do dia 364 dias antes de hoje e `to` é o fim do dia de hoje, no `timeZone` do perfil (ISO 8601 com offset), totalizando 365 dias inclusivos. O offset é o vigente no horário local pedido (meia-noite e 23:59:59), não o do meio-dia; assim dias de transição de DST ficam corretos. Achatar as semanas em uma lista de dias e filtrar para `[start, end]`; o total é a soma dos dias filtrados.
- Erros do GraphQL são avaliados antes de `user` nulo: se houver `errors`, mapear `RATE_LIMITED` e `NOT_FOUND`; se não houver errors e `user` vier nulo, responder `USER_NOT_FOUND`; `user` ausente ou sem `login` é resposta incompleta e vira `GITHUB_ERROR`. 403 com headers de rate limit vira `RATE_LIMITED`; outros 401/403 viram `TOKEN_INVALID`. Qualquer outro erro ou alias faltante vira `GITHUB_ERROR` (sem gráfico parcial). `x-ratelimit-reset` malformado mantém `RATE_LIMITED` sem `retryAt`.
- Limite: 12 buscas por cache miss (o limite de busca autenticada é 30/min). O botão Aplicar, o cache de 1 h e os controles desabilitados durante o load evitam rajadas. O viewer é uma chamada separada por perfil, só na primeira vez.

### Cache

- Cache em memória, por processo, com TTL de 1 hora. Chave: nome do perfil + login canônico em minúsculas + modo privado efetivo + data local no `timeZone` do perfil (para a janela virar à meia-noite).
- Guardar apenas respostas 200 agregadas; erros não são cacheados. Requisições concorrentes para a mesma chave compartilham a mesma promessa (dedupe) e a entrada é removida ao terminar.
- O cache não persiste entre reinícios. Não há botão de refresh manual; a interface mostra “Atualizado às HH:MM” a partir de `fetchedAt`.
- O login do viewer tem cache próprio por perfil, sem TTL, válido enquanto o processo viver. A configuração de perfis é lida no startup; mudanças exigem reinício.

### Gráfico de barras

- 12 barras, uma por mês, com o valor inteiro em cima de cada uma (inclusive `0`).
- Eixo X com rótulos `nov/25`, `dez/25` etc.; o mês parcial mostra `out/26` e `(até agora)` em duas linhas, alinhado à sua barra.
- Eixo Y com o título “PRs mergeados” (rotacionado), de 4 a 5 ticks e topo arredondado para um número legível; se todos os meses forem zero, topo 4. Linhas de grade pontilhadas na horizontal.
- Uma única cor azul para todas as barras; sem gradiente e sem destacar o mês parcial pela cor. O rótulo “(até agora)” é o destaque.
- Barras com topo arredondado, espaçamento confortável; sem tooltip customizado. Cada barra tem um `<title>` com “mês: N PRs mergeados”.
- Os três stat cards ficam acima do gráfico: “Total no período” (12 meses), “Média por mês” (11 meses fechados, uma casa decimal) e “Recorde mensal” (mês e ano; “—” se `record` for nulo). Total e recorde usam separador de milhar pt-BR; a média usa vírgula. Uma legenda curta abaixo dos cards explica: “Média e recorde usam os 11 meses fechados; o total inclui o mês parcial.”
- O SVG tem um resumo acessível e se ajusta à largura. Em telas estreitas, o conteúdo do gráfico mantém uma largura mínima e rola horizontalmente dentro do card; a página não rola na horizontal.

### Heatmap

- Título “N contribuições no último ano”, com N formatado em pt-BR e vindo da soma dos dias.
- Janela: 365 dias inclusivos terminando hoje, no `timeZone` do perfil; o início é 00:00:00 do fuso e o fim é 23:59:59 do fuso. As datas `YYYY-MM-DD` são datas de calendário local: não usar `new Date("YYYY-MM-DD")` (que interpreta UTC) para decidir a linha da semana ou o tooltip; usar componentes locais/UTC de forma explícita.
- Grade de semanas × dias, no estilo do GitHub: colunas de domingo a sábado, 7 linhas, rótulos “seg”, “qua” e “sex” nas linhas 1, 3 e 5. Meses em pt-BR no topo. O primeiro mês da janela é rotulado na primeira coluna que tiver um dia dele, mesmo que o dia 1 esteja fora; os demais ficam na primeira semana que contém o dia 1. Rótulos que colidiriam são omitidos.
- A grade é construída a partir da lista plana de dias, começando no domingo anterior ou igual ao primeiro dia e terminando no sábado posterior ou igual ao último. Células fora do intervalo ficam vazias (sem cor de nível e sem tooltip). A janela gera 53 ou 54 colunas conforme o alinhamento.
- Células de 11×11 px, raio 2, espaçamento de 3 px. Em telas estreitas, a grade rola horizontalmente dentro do card.
- Cinco níveis de verde:
  - nível 0: `#21262d` (sem contribuição; com borda sutil para não sumir no card);
  - nível 1: `#0e4429`;
  - nível 2: `#006d32`;
  - nível 3: `#26a641`;
  - nível 4: `#39d353`.
- Cálculo dos níveis, por resposta: contar os dias com `count > 0`, ordenar e tirar os quartis q1, q2 e q3 pelos índices `floor(n * 0,25)`, `floor(n * 0,50)` e `floor(n * 0,75)`. Se não houver dias com contribuição, todos são nível 0. Se todos os dias não-zero forem iguais, todos são nível 1. Se `q1 === q3` ou `q3 === max`, usar faixas relativas ao máximo: `<= 25%` → 1, `<= 50%` → 2, `<= 75%` → 3, acima → 4 (mínimo 1 para não-zero). Caso contrário: `count <= q1` → 1; `<= q2` → 2; `<= q3` → 3; acima disso → 4. Zero é sempre 0. O fallback garante que um pico isolado (ex.: 70 dias com 1 e 30 com 100) chegue ao nível 4.
- Legenda com cinco quadrados, “Menos” à esquerda e “Mais” à direita.
- Tooltip customizado ao passar o mouse ou focar uma célula: data por extenso em pt-BR (“26 de out. de 2026”) e “N contribuições” (ou “Nenhuma contribuição”). Posicionar perto da célula sem sair da viewport; esconder ao sair/blur. Células têm `aria-label` com a mesma informação.
- Nota fixa no card: “Inclui contribuições privadas que o perfil exibe no GitHub.” O modo privado não altera o heatmap (ADR-0002). Os filtros de organização/repositório do perfil também não alteram o heatmap; eles valem só para os PRs.
- O SVG tem um resumo acessível com total e intervalo de datas.

### Controles, URL e estados

- Cabeçalho “Atividade no GitHub” e subtítulo “PRs mergeados e contribuições de @<usuário>” (com o nome do perfil). Título da aba: “Atividade no GitHub”.
- Seletor de perfil: `select` com os nomes devolvidos em `profiles`; trocar de perfil atualiza `?profile=`, volta o usuário para o usuário do perfil, liga o modo privado e busca de novo. Fica desabilitado durante o load e vazio/“Carregando…” até a primeira resposta.
- Formulário de usuário: label “Usuário do GitHub”, input com placeholder “login do GitHub” e botão “Aplicar”. O valor inicial é o `user` da URL, se houver; senão, o usuário do perfil (nunca um login fixo no código). Sem fetch a cada tecla; Enter e clique aplicam. Campo vazio ou fora do formato é inválido e mostra erro inline antes de buscar.
- Estado na URL: `?profile=<nome>&user=<login>&private=1|0`. Sem `profile`, usa o perfil padrão do ambiente; sem `user`, usa o usuário do perfil; sem `private`, padrão 1. Usar `history.replaceState` e ler o estado no carregamento; sem listener de `popstate`. O perfil e o login canônicos devolvidos pela API atualizam o select, o input e a URL.
- Resumo do perfil: linha read-only com “Filtros: org:… / repo:…” e “Fuso: …” vindos de `filters`; se não houver filtros, “Sem filtros de contexto”. Os filtros valem só para os PRs; o heatmap não muda.
- Switch “Incluir repositórios privados”: começa com a preferência da URL (padrão ligado). Durante o load, fica desabilitado; depois, se `canIncludePrivate` for falso, fica desligado e desabilitado com a explicação “Disponível apenas para o dono do token.” A preferência pedida continua na URL; ao voltar para o viewer, ela volta a valer.
- Durante o carregamento: skeleton simples nos cards de estatísticas, no gráfico de barras e no heatmap; controles desabilitados; anúncio `role="status"` para leitores de tela.
- Erro: card com `role="alert"`, mensagem do servidor e botão “Tentar de novo”. O cabeçalho e os controles continuam disponíveis para trocar perfil/usuário/URL. O retry refaz a busca do estado atual.
- Mensagens específicas: perfil desconhecido, configuração ausente (`GITHUB_USER`), arquivo/URL/fuso/filtro inválido, variável de token do perfil ausente, token inválido, usuário não encontrado, limite com horário de reset e falha genérica. As mensagens de configuração devem dizer qual variável/arquivo ajustar e que é preciso reiniciar.
- Sem estado vazio especial: usuário sem PRs mostra barras zero; heatmap sem contribuições mostra todos os níveis 0 e título “0 contribuições no último ano”.
- Rodapé da área de dados: “Atualizado às HH:MM”, formatado do `fetchedAt` em pt-BR. Sem botão de refresh manual.

### Visual e responsivo

- Tema escuro com tokens em CSS: fundo `#0d1117`, card `#161b22`, borda `#30363d`, texto `#e6edf3`, texto secundário `#8b949e`, azul `#58a6ff`, verdes conforme a seção do heatmap.
- Fonte system-ui/-apple-system/Segoe UI/Roboto; sem fonte externa. Largura máxima de 1100 px, padding de 24 px (16 px no mobile), cards com raio 12, borda de 1 px e espaçamento de 24 px.
- Cabeçalho com título e controles (seletor de perfil, usuário, switch e resumo de filtros/fuso); em telas estreitas, controles empilham e o formulário ocupa a largura. Stats com grid `auto-fit`/`minmax` e uma coluna no mobile. Cards empilhados; gráficos com scroll interno.
- Anel de foco visível de 2 px em azul; contraste de texto AA; nada depende só de cor para valores (tooltips, `<title>` e `aria-label`).

### Acessibilidade

- Gráfico de barras com `role="img"` e resumo textual; cada barra com `<title>`; estatísticas em texto normal.
- Heatmap com resumo no SVG; cada célula focável, com `aria-label` de data + contagem; tooltip também no foco. Células fora do intervalo não são focáveis.
- Switch com checkbox real e label; dica associada por `aria-describedby`. Input e seletor de perfil com labels; erro inline em `aria-live`; resumo de filtros/fuso legível.
- Loading em `role="status"`; erro em `role="alert"`; botão de retry real.
- Ordem de foco: controles → stats → gráfico → heatmap; sem armadilhas de foco.

### Segurança

- O token de cada perfil nunca entra no bundle, no arquivo de perfis, em `VITE_*`, na resposta ou em log. A API devolve só os agregados e mensagens seguras; o cliente só envia o nome do perfil, nunca token/URL.
- O arquivo de perfis fica fora do git (`profiles.local.json`) e contém apenas o nome da variável de ambiente do token (`tokenEnv`). `profiles.example.json` não tem valores de token.
- URL da API/GraphQL e filtros vêm do perfil no servidor; o cliente não escolhe URL arbitrária. A configuração é lida no startup.
- Login validado e query montada só com login validado, perfis validados e datas geradas; sem injeção no `search`.
- `Cache-Control: no-store` na API. Sem CORS: mesma origem.
- O servidor escuta em `127.0.0.1` por padrão. A URL é para recarregar/reabrir na mesma máquina, não para compartilhar com terceiros.
- A API não tem autenticação própria; o projeto é para uso pessoal/local. Expor na rede ou publicamente exigiria bind explícito e uma camada de auth, fora de escopo desta spec.
- Timeout de 10 s; sem retry automático; erros do GitHub não são repassados crus.

## Decisões de teste

- Seams escolhidos: os módulos puros de janelas mensais/query/mapeamento/estatísticas, o módulo puro de níveis do heatmap e o layout da grade. São o ponto mais alto que dá para testar sem mockar a rede ou o DOM.
- Um bom teste aqui exercita o comportamento externo das funções puras com entradas determinísticas: uma data fixa, o fuso do perfil (ex.: `UTC` e `America/Sao_Paulo`), contagens conhecidas e respostas de alias embaralhadas. Sem snapshots, sem detalhes de implementação.
- Perfis: perfil padrão do ambiente, perfis adicionais do arquivo, nome duplicado/inválido, `tokenEnv` ausente, `GITHUB_USER` ausente, perfil desconhecido, lista de perfis sem tokens/URLs e erro de `UNKNOWN_PROFILE`/`TOKEN_MISSING` com `profiles` para recuperação.
- URLs: `https://api.github.com` → `/graphql`; `https://HOST/api/v3` → `https://HOST/api/graphql`; raiz do GitHub Enterprise; URL GraphQL explícita; barras finais; URL inválida.
- Filtros: `orgs` vira `org:`; `repos` vira `repo:`; se ambos, `repos` vence; filtro inválido vira configuração inválida.
- Fuso: janelas mensais em `UTC`, `America/Sao_Paulo` e outro fuso; virada de mês; janela de 365 dias do heatmap no fuso do perfil; borda de DST (`Australia/Lord_Howe` em `2024-10-06` e `America/New_York`) sem depender do `TZ` do processo.
- Janelas mensais: 12 itens na ordem certa, rótulos pt-BR, 11 fechados + parcial, fim do parcial = hoje, anos bissextos, virada de ano, primeiro dia do mês.
- Layout do heatmap: janela de 365 dias, `start`/`end` locais, datas `YYYY-MM-DD` interpretadas como datas de calendário local, domingo como primeira coluna, padding das bordas, 53/54 colunas, rótulo do primeiro mês parcial; rodar com `TZ=America/Sao_Paulo`.
- Query builder: um alias por mês, `is:pr is:merged`, `author` correto, `merged:início..fim` correto, `is:public` presente só no modo público.
- Mapeamento: contagens lidas pelo nome do alias mesmo com chaves em ordem diferente; alias faltante vira erro.
- Estatísticas: total inclui o parcial; média divide por 11; recorde ignora o parcial; empate fica com o mês mais recente; tudo zero → média 0 e recorde nulo.
- Estado da URL/modo privado: defaults de `user`/`private`, parse de `private` 0/1, login canônico e a regra `canIncludePrivate`/modo efetivo para viewer e não-viewer.
- Níveis: vazio, todos zero, todos não-zero iguais, `q1 === q3` com máximo maior, `q3 === max` (ex.: 70 dias com 1 e 30 com 100), valores exatamente nos quartis, mistura com zeros, um único dia não-zero.
- Rodar `npm test` e `npm run typecheck`. Sem testes de componente, E2E ou regressão visual; a validação visual é manual em desktop e mobile. Não há prior art no repo (projeto novo).

## Fora de escopo

- Deploy, CI, Docker, remoto, push ou PR.
- Autenticação de usuários na interface, multiusuário concorrente, banco de dados; os perfis são configuração local do servidor, não login.
- Edição de perfis ou armazenamento de tokens pela interface; mudanças de perfil exigem editar o `.env`/arquivo local e reiniciar.
- Lista de PRs individuais, links para PRs, comparação entre usuários, janelas além de 12 meses.
- Tema claro, seletor de idioma, exportação, notificações, app mobile.
- Fronteira de mês dos PRs no horário local exato (ADR-0003).
- Heatmap somente público (ADR-0002).
- Filtros de organização/repositório no heatmap; eles valem só para os PRs.
- Testes de componente/E2E, regressão visual, lint dedicado.
- Atualização em tempo real; o cache de 1 h e o `fetchedAt` são a referência.
- Endurecimento para exposição pública da API.

## Notas adicionais

- Dados de referência em 26/10/2026, da conta usada no desenvolvimento, só para sanity check: 293 PRs mergeados na janela (99 públicos), 26 no mês parcial, recorde 117 em mar/26, média 24,3; heatmap com 2.474 contribuições (1.564 privadas), 204 dias não-zero, quartis 2/7/14 e máximo 102. Não são fixtures nem um usuário padrão.
- O baseline de 2.474 inclui 1.564 contribuições privadas contabilizadas de forma anônima; por isso o heatmap não fecha com a soma dos PRs públicos.
- Não há usuário, token ou URL fixos no código. O perfil padrão vem de `GITHUB_USER`/`GITHUB_TOKEN`/`GITHUB_API_URL`; perfis adicionais vêm de `GITHUB_PROFILES_FILE`. Em desenvolvimento, `gh auth token` pode gerar um token local; o app não usa `gh` em runtime. Reiniciar o servidor após mudar `.env` ou o arquivo de perfis.
- `.env.example` e `profiles.example.json` documentam o perfil padrão e os perfis nomeados; `profiles.local.json` fica no `.gitignore`. O README em pt-BR cobre conta pessoal, conta do trabalho, GitHub Enterprise, escopos `repo`/`read:user`, autorização SSO da organização e como rodar em outra máquina.
- GitHub Enterprise: `GITHUB_API_URL`/`profile.apiUrl` e, se necessário, `GITHUB_GRAPHQL_URL`/`profile.graphqlUrl`; a URL GraphQL é derivada quando não informada.
- Escopos do token: `repo` para PRs privados e, opcionalmente, `read:user` para detalhes de contribuições privadas. Tokens de organização com SSO precisam ser autorizados no GitHub.
- Filtros de organização/repositório e fuso são por perfil. Os filtros afetam só os PRs; o heatmap é o calendário global do perfil. O `timeZone` afeta as janelas mensais e a janela do heatmap.
- Limite de busca: 30 req/min; 12 por cache miss. O fluxo é Aplicar + cache + controles travados, sem busca por tecla.
- O primeiro carregamento de cada perfil faz a query do viewer + a query de dados; os seguintes fazem só a de dados. O viewer é cacheado por perfil.
- Git: docs e tickets ficam na `main`; sem remoto, sem push e sem PR. A implementação é dividida em tickets verticais, cada um em worktree/branch local e mesclado na `main`, com um subagent implementador por ticket e a sessão principal apenas orquestrando.
- O ticket 04 generaliza a configuração de conta/URL; os tickets 01–03 foram implementados com um perfil fixo e permanecem como histórico.
- O modo privado para um usuário diferente do viewer é sempre público por decisão de produto, mesmo que o token tenha acesso a algum repositório privado onde a pessoa contribuiu; isso evita uma visão inconsistente com o switch desabilitado.
- A nota do heatmap deve aparecer sempre, não só quando o modo privado está desligado.
