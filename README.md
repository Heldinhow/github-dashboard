# Atividade no GitHub

Dashboard pessoal local com os PRs mergeados dos últimos 12 meses em barras mensais (total, média e recorde) e um heatmap das contribuições do último ano. A página é escura, em pt-BR e permite trocar o usuário e ligar/desligar repositórios privados no gráfico de PRs.

## O que a página mostra

- **Gráfico de barras:** PRs mergeados na janela de 12 meses, com o mês corrente marcado como “(até agora)”. Média e recorde usam apenas os 11 meses fechados; o total inclui o mês parcial.
- **Heatmap:** 365 dias de contribuições, com cinco níveis de verde, tooltip por dia e navegação por teclado.
- **URL compartilhável na mesma máquina:** `?user=<login>&private=0|1` preserva o usuário selecionado e o modo privado. Sem parâmetros, o padrão é `usuario-dev` com privados ligados.

## Requisitos

- Node 26+
- Token do GitHub (PAT clássico) com escopo `repo` para incluir PRs de repositórios privados. O escopo `read:user` é opcional e permite que o GitHub detalhe contribuições privadas no perfil.

Sem `repo`, o modo privado simplesmente não enxerga os repositórios privados. O heatmap sempre reflete o calendário do GitHub, que já inclui contribuições privadas de forma anônima e não pode ser filtrado (ver `docs/adr/0002-heatmap-includes-private-contributions.md`).

## Instalação

```sh
npm install
cp .env.example .env
```

Edite o `.env` e defina `GITHUB_TOKEN`. Em desenvolvimento, o valor pode ser gerado com `gh auth token`. O token fica apenas no servidor: nunca entra no bundle, em variáveis `VITE_*`, na resposta da API ou em log. O `.env` não é versionado.

## Rodar localmente

```sh
npm run dev      # Vite em http://127.0.0.1:5173 (proxy de /api para o servidor)
npm run build    # build do frontend em dist/
npm start        # Express em http://127.0.0.1:3001 servindo dist/ e a API
npm test         # Vitest
npm run typecheck
```

O servidor escuta em `127.0.0.1` por padrão e carrega o `.env` se existir. Sem `GITHUB_TOKEN`, a API responde `TOKEN_MISSING` e a página mostra o erro de configuração; reinicie o servidor depois de alterar o `.env`.

## Modo privado e cache

O modo privado (`?private=1`, padrão) só tem efeito para o dono do token (viewer). Para outro usuário, o switch fica desligado e desabilitado com a explicação “Disponível apenas para o dono do token”, e as buscas são sempre públicas. A preferência pedida continua na URL e volta a valer ao retornar ao viewer. O switch afeta somente o gráfico de PRs; o heatmap não muda.

A API agrega no servidor e mantém um cache em memória de 1 hora por usuário canônico, modo privado efetivo e dia local (`America/Sao_Paulo`). Erros não são cacheados. A interface mostra “Atualizado às HH:MM” a partir do instante em que os dados vieram do GitHub; não há refresh manual.

## API

`GET /api/activity?user=<login>&private=0|1`

`user` é opcional (padrão `usuario-dev`) e `private` aceita apenas `0` ou `1`. A resposta traz o login canônico, o viewer, os 12 meses, as estatísticas e os 365 dias do heatmap. Erros usam `{ "error": { "code", "message", "retryAt"? } }` e mensagens seguras em pt-BR (`TOKEN_MISSING`, `TOKEN_INVALID`, `USER_NOT_FOUND`, `RATE_LIMITED`, `GITHUB_ERROR`, `INVALID_USER`, `INVALID_PRIVATE`). A resposta leva `Cache-Control: no-store` e não há CORS.

## Limitações

- O heatmap inclui contribuições privadas e não pode ser filtrado para somente público; por isso ele não fecha com a soma dos PRs públicos.
- A contagem mensal usa o qualificador `merged:` do GitHub, que opera em UTC; PRs na virada da meia-noite podem cair no mês vizinho (ver `docs/adr/0003-monthly-counts-via-search-aliases.md`).
- Não há autenticação própria, banco de dados, push, PR, CI ou deploy. É um projeto pessoal para uso local; expor a API na rede exigiria bind explícito e uma camada de autenticação.
