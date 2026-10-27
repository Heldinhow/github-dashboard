# Especificação: Dashboard de atividade no GitHub

Status: ready-for-agent

Decisões relacionadas: [ADR-0001](../../docs/adr/0001-github-token-only-on-server.md), [ADR-0002](../../docs/adr/0002-heatmap-includes-private-contributions.md), [ADR-0003](../../docs/adr/0003-monthly-counts-via-search-aliases.md). Vocabulário: [GLOSSARY](../../GLOSSARY.md).

## Problema

Quero acompanhar meu ritmo de trabalho no GitHub em uma página só, mas o GitHub espalha PRs mergeados e contribuições em telas diferentes, não mostra média nem recorde mensal e não permite trocar o usuário sem levar um token para o navegador. Também quero escolher se repositórios privados entram no gráfico de PRs, sem risco de vazar credencial.

## Solução

Uma página única, escura e em pt-BR, com duas visões: barras de PRs mergeados na janela de 12 meses (com total, média mensal e recorde mensal) e um heatmap de contribuições do último ano. O navegador fala com uma API do próprio projeto; essa API guarda o token do GitHub, consulta o GraphQL, agrega e cacheia por 1 hora. O usuário selecionado pode ser trocado (padrão usuario-dev) e o modo privado pode ser ligado ou desligado no gráfico de PRs.

## Histórias de usuário

1. Como dono do dashboard, quero abrir a página já com o usuário usuario-dev para ver minha atividade sem configurar nada.
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
16. Como dono, quero o usuário e o modo privado na URL para recarregar ou reabrir a mesma visão.
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

## Decisões de implementação

### Stack e execução

- Node 26 + Express 5 + npm; Vite + React + TypeScript; CSS puro; SVG próprio; Vitest.
- Sem Tailwind, biblioteca de charts, router ou UI kit.
- TypeScript estrito. O servidor roda com o TypeScript nativo do Node, sem `tsx`; código apagável (sem `enum`/`namespace`). `npm run typecheck` cobre servidor, frontend, módulos puros e testes.
- Scripts npm: `dev` (Vite + servidor em paralelo), `build` (build do frontend), `start` (servidor Express servindo o build), `test` (Vitest), `typecheck` (`tsc --noEmit`).
- Em desenvolvimento, o Vite roda na 5173 e faz proxy de `/api` para o servidor na 3001. Em produção, o Express serve o build do Vite e a API na mesma origem, sem CORS.
- O servidor carrega `.env` se existir. `GITHUB_TOKEN` é a única configuração obrigatória. `.env` fica no `.gitignore`; `.env.example` documenta a variável sem valor real. Nenhuma variável `VITE_` contém token.
- O token recomendado é um PAT clássico com `repo` (PRs privados) e, opcionalmente, `read:user` (detalhes de contribuições privadas). O app não usa `gh` em runtime; em desenvolvimento, o valor local pode ser gerado com `gh auth token` e colocado no `.env` ou no ambiente, nunca versionado.
- O servidor inicia sem token e responde `TOKEN_MISSING` na API; a página mostra o erro de configuração em vez de quebrar.

### Arquitetura

- Navegador → `GET /api/activity` → serviço de atividade → cliente GraphQL do GitHub.
- O serviço valida a entrada, resolve o viewer, calcula o modo privado efetivo, consulta o cache, monta a janela de 12 meses, consulta o GitHub, agrega e devolve o contrato abaixo.
- Módulos puros, sem React e sem rede: janelas mensais, query builder das buscas, mapeamento das respostas por alias, estatísticas (total/média/recorde), níveis do heatmap e cache.
- O heatmap é montado no cliente a partir da lista plana de dias devolvida pela API; os níveis são calculados no cliente pelo módulo puro.
- O servidor resolve o login do viewer uma vez por processo com uma query `viewer { login }` e mantém esse valor em memória. A primeira requisição de dados faz duas chamadas ao GraphQL (viewer + dados); as seguintes fazem uma. O valor é descartado ao reiniciar o processo.

### Contrato da API

`GET /api/activity?user=<login>&private=0|1`

- `user` é opcional; padrão `usuario-dev`. `private` é opcional; padrão `1`.
- `user` é validado pelo formato de login do GitHub (1–39 caracteres, alfanumérico e hífen, sem hífen no início/fim); inválido → 400.
- `private` aceita apenas `0` ou `1`; qualquer outro valor → 400 `INVALID_PRIVATE`.
- O servidor devolve o login canônico em `user`.
- `viewer` é o login dono do token. `canIncludePrivate` é verdadeiro quando `user` e `viewer` são o mesmo login (comparação sem diferenciar maiúsculas/minúsculas).
- `includePrivate` é o modo efetivo: `private === 1` **e** `canIncludePrivate`. Quando falso, as buscas de PR usam `is:public`. Para um usuário diferente do viewer, o modo efetivo é sempre falso.
- A resposta 200 tem este formato (exemplo abreviado; a resposta real traz 12 meses e 365 dias):

```json
{
  "user": "usuario-dev",
  "viewer": "usuario-dev",
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

- `months` tem exatamente 12 itens, do mais antigo ao mais recente; o último é o mês parcial (`isPartial: true`).
- `stats.total` soma os 12 meses, incluindo o parcial. `stats.average` usa apenas os 11 meses fechados, com uma casa decimal. `stats.record` é o maior mês fechado; empate fica com o mês mais recente; é `null` quando os 11 meses fechados têm zero.
- `contributions.total` é a soma dos dias; `start`/`end` são as datas locais do intervalo; `days` é cronológico, filtrado a `[start, end]` e inclui dias com zero.
- `fetchedAt` é o instante em que os dados vieram do GitHub, não o instante do cache hit.
- A resposta leva `Cache-Control: no-store`; o cache é interno do servidor.
- Erros usam `{ "error": { "code": "...", "message": "...", "retryAt"?: "..." } }` e mensagens em pt-BR; `retryAt`, quando presente, é ISO 8601 UTC:

| HTTP | code | Quando |
| --- | --- | --- |
| 400 | `INVALID_USER` | Login fora do formato permitido. |
| 400 | `INVALID_PRIVATE` | `private` diferente de `0` ou `1`. |
| 404 | `USER_NOT_FOUND` | O GraphQL não encontrou o usuário. |
| 429 | `RATE_LIMITED` | Limite do GitHub; `retryAt` com o horário de reset. |
| 502 | `TOKEN_INVALID` | Token recusado pelo GitHub ou sem permissão. |
| 502 | `GITHUB_ERROR` | Falha de rede, timeout, 5xx ou resposta incompleta. |
| 503 | `TOKEN_MISSING` | `GITHUB_TOKEN` não configurado. |

- Mensagens seguras: nunca incluir o token nem o corpo bruto de erro do GitHub. O cliente exibe a mensagem do servidor.

### Consultas ao GitHub

- Endpoint `https://api.github.com/graphql`, método POST, `Authorization: bearer <token>`, `Content-Type: application/json`, `User-Agent` próprio e timeout de 10 s. Sem retry automático.
- Resolver do viewer: `query { viewer { login } }`, cacheado por processo. Se falhar, a API devolve o erro mapeado antes de consultar os dados.
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
  m2025_11: search(query: "is:pr is:merged author:usuario-dev merged:2025-11-01..2025-11-30", type: ISSUE, first: 1) { issueCount }
  # ... 11 outros aliases, um por mês
}
```

- Cada alias tem o nome `m<AAAA>_<MM>` e usa `first: 1`; só `issueCount` importa. As contagens são lidas **pelo nome do alias**, nunca pela ordem do array, porque o GitHub não garante a ordem das chaves na resposta.
- A busca de PR é `is:pr is:merged author:<login> merged:<início>..<fim>`; quando o modo privado está desligado, inclui `is:public`. O login já foi validado; as datas são geradas pelo servidor.
- As 12 janelas são geradas no calendário de `America/Sao_Paulo`: 11 meses fechados e o mês parcial, cujo fim é hoje. O qualificador `merged:` do GitHub usa datas UTC; a diferença de borda é aceita (ADR-0003).
- Heatmap: `from` é o início do dia 364 dias antes de hoje e `to` é o fim do dia de hoje, no fuso `America/Sao_Paulo` (ISO 8601 com offset), totalizando 365 dias inclusivos. Achatar as semanas em uma lista de dias e filtrar para `[start, end]`; o total é a soma dos dias filtrados.
- Erros do GraphQL são avaliados antes de `user` nulo: se houver `errors`, mapear `RATE_LIMITED` e `NOT_FOUND`; se não houver errors e `user` vier nulo, responder `USER_NOT_FOUND`. 403 com headers de rate limit vira `RATE_LIMITED`; outros 401/403 viram `TOKEN_INVALID`. Qualquer outro erro ou alias faltante vira `GITHUB_ERROR` (sem gráfico parcial).
- Limite: 12 buscas por cache miss (o limite de busca autenticada é 30/min). O botão Aplicar, o cache de 1 h e os controles desabilitados durante o load evitam rajadas. O viewer é uma chamada separada só na primeira vez.

### Cache

- Cache em memória, por processo, com TTL de 1 hora. Chave: login canônico em minúsculas + modo privado efetivo + data local em `America/Sao_Paulo` (para a janela virar à meia-noite).
- Guardar apenas respostas 200 agregadas; erros não são cacheados. Requisições concorrentes para a mesma chave compartilham a mesma promessa (dedupe) e a entrada é removida ao terminar.
- O cache não persiste entre reinícios. Não há botão de refresh manual; a interface mostra “Atualizado às HH:MM” a partir de `fetchedAt`.
- O login do viewer tem cache próprio, sem TTL, válido enquanto o processo viver.

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
- Janela: 365 dias inclusivos terminando hoje, no fuso `America/Sao_Paulo`; o início é 00:00:00-03:00 e o fim é 23:59:59-03:00. As datas `YYYY-MM-DD` são datas de calendário local: não usar `new Date("YYYY-MM-DD")` (que interpreta UTC) para decidir a linha da semana ou o tooltip; usar componentes locais/UTC de forma explícita.
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
- Nota fixa no card: “Inclui contribuições privadas que o perfil exibe no GitHub.” O modo privado não altera o heatmap (ADR-0002).
- O SVG tem um resumo acessível com total e intervalo de datas.

### Controles, URL e estados

- Cabeçalho “Atividade no GitHub” e subtítulo “PRs mergeados e contribuições de @<usuário>”. Título da aba: “Atividade no GitHub”.
- Formulário de usuário: label “Usuário do GitHub”, input com placeholder “usuario-dev” e botão “Aplicar”. Sem fetch a cada tecla; Enter e clique aplicam. Campo vazio ou fora do formato é inválido e mostra erro inline antes de buscar.
- Estado na URL: `?user=<login>&private=1|0`. Sem `user`, padrão usuario-dev; sem `private`, padrão 1. Usar `history.replaceState` e ler o estado no carregamento; sem listener de `popstate`. O login canônico devolvido pela API atualiza o input e a URL.
- Switch “Incluir repositórios privados”: começa com a preferência da URL (padrão ligado). Durante o load, fica desabilitado; depois, se `canIncludePrivate` for falso, fica desligado e desabilitado com a explicação “Disponível apenas para o dono do token.” A preferência pedida continua na URL; ao voltar para o viewer, ela volta a valer.
- Durante o carregamento: skeleton simples nos cards de estatísticas, no gráfico de barras e no heatmap; controles desabilitados; anúncio `role="status"` para leitores de tela.
- Erro: card com `role="alert"`, mensagem do servidor e botão “Tentar de novo”. O cabeçalho e os controles continuam disponíveis para trocar usuário/URL. O retry refaz a busca do estado atual.
- Mensagens específicas: token ausente/inválido, usuário não encontrado, limite com horário de reset, falha genérica. Para token ausente, incluir a instrução de configurar `GITHUB_TOKEN` e reiniciar.
- Sem estado vazio especial: usuário sem PRs mostra barras zero; heatmap sem contribuições mostra todos os níveis 0 e título “0 contribuições no último ano”.
- Rodapé da área de dados: “Atualizado às HH:MM”, formatado do `fetchedAt` em pt-BR. Sem botão de refresh manual.

### Visual e responsivo

- Tema escuro com tokens em CSS: fundo `#0d1117`, card `#161b22`, borda `#30363d`, texto `#e6edf3`, texto secundário `#8b949e`, azul `#58a6ff`, verdes conforme a seção do heatmap.
- Fonte system-ui/-apple-system/Segoe UI/Roboto; sem fonte externa. Largura máxima de 1100 px, padding de 24 px (16 px no mobile), cards com raio 12, borda de 1 px e espaçamento de 24 px.
- Cabeçalho com título e controles; em telas estreitas, controles empilham e o formulário ocupa a largura. Stats com grid `auto-fit`/`minmax` e uma coluna no mobile. Cards empilhados; gráficos com scroll interno.
- Anel de foco visível de 2 px em azul; contraste de texto AA; nada depende só de cor para valores (tooltips, `<title>` e `aria-label`).

### Acessibilidade

- Gráfico de barras com `role="img"` e resumo textual; cada barra com `<title>`; estatísticas em texto normal.
- Heatmap com resumo no SVG; cada célula focável, com `aria-label` de data + contagem; tooltip também no foco. Células fora do intervalo não são focáveis.
- Switch com checkbox real e label; dica associada por `aria-describedby`. Input com label e erro inline em `aria-live`.
- Loading em `role="status"`; erro em `role="alert"`; botão de retry real.
- Ordem de foco: controles → stats → gráfico → heatmap; sem armadilhas de foco.

### Segurança

- O token nunca entra no bundle, em `VITE_*`, na resposta ou em log. A API devolve só os agregados e mensagens seguras.
- Login validado e query montada só com login validado e datas geradas; sem injeção no `search`.
- `Cache-Control: no-store` na API. Sem CORS: mesma origem.
- O servidor escuta em `127.0.0.1` por padrão. A URL é para recarregar/reabrir na mesma máquina, não para compartilhar com terceiros.
- A API não tem autenticação própria; o projeto é para uso pessoal/local. Expor na rede ou publicamente exigiria bind explícito e uma camada de auth, fora de escopo desta spec.
- Timeout de 10 s; sem retry automático; erros do GitHub não são repassados crus.

## Decisões de teste

- Seams escolhidos: os módulos puros de janelas mensais/query/mapeamento/estatísticas, o módulo puro de níveis do heatmap e o layout da grade. São o ponto mais alto que dá para testar sem mockar a rede ou o DOM.
- Um bom teste aqui exercita o comportamento externo das funções puras com entradas determinísticas: uma data fixa, o fuso `America/Sao_Paulo`, contagens conhecidas e respostas de alias embaralhadas. Sem snapshots, sem detalhes de implementação.
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
- Login/autenticação de usuários, multiusuário, banco de dados.
- Lista de PRs individuais, links para PRs, filtros por repositório, comparação entre usuários, janelas além de 12 meses.
- Tema claro, seletor de idioma, exportação, notificações, app mobile.
- Fronteira de mês dos PRs no horário local exato (ADR-0003).
- Heatmap somente público (ADR-0002).
- Testes de componente/E2E, regressão visual, lint dedicado.
- Atualização em tempo real; o cache de 1 h e o `fetchedAt` são a referência.
- Endurecimento para exposição pública da API.

## Notas adicionais

- Dados de referência em 26/10/2026, só para sanity check: 293 PRs mergeados na janela (99 públicos), 26 no mês parcial, recorde 117 em mar/26, média 24,3; heatmap com 2.474 contribuições (1.564 privadas), 204 dias não-zero, quartis 2/7/14 e máximo 102. Não são fixtures.
- O baseline de 2.474 inclui 1.564 contribuições privadas contabilizadas de forma anônima; por isso o heatmap não fecha com a soma dos PRs públicos.
- O `gh` local está autenticado como usuario-dev, mas o app não o usa em runtime. O `.env` é a fonte do token; em dev, `gh auth token` pode gerar o valor. Reiniciar o servidor após mudar o `.env`.
- Limite de busca: 30 req/min; 12 por cache miss. O fluxo é Aplicar + cache + controles travados, sem busca por tecla.
- O primeiro carregamento faz a query do viewer + a query de dados; os seguintes fazem só a de dados. O viewer é cacheado por processo.
- Git: o commit inicial de docs fica na `main`; sem remoto, sem push e sem PR. A implementação será dividida em tickets verticais depois desta spec; cada ticket roda em worktree/branch local e é mesclado na `main`, com um subagent implementador por ticket e a sessão principal apenas orquestrando.
- O modo privado para um usuário diferente do viewer é sempre público por decisão de produto, mesmo que o token tenha acesso a algum repositório privado onde a pessoa contribuiu; isso evita uma visão inconsistente com o switch desabilitado.
- A nota do heatmap deve aparecer sempre, não só quando o modo privado está desligado.
