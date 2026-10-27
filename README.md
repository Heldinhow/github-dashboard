# Atividade no GitHub

Dashboard pessoal local com os PRs mergeados dos últimos 12 meses em barras mensais (total, média e recorde) e um heatmap das contribuições do último ano. A página é escura, em pt-BR e permite trocar o perfil, trocar o usuário e ligar/desligar repositórios privados no gráfico de PRs.

O perfil padrão vem de variáveis de ambiente. Perfis adicionais (conta pessoal, conta do trabalho, GitHub Enterprise) vêm de um JSON local fora do git. Nenhum usuário, token ou URL fica embutido no código.

## O que a página mostra

- **Gráfico de barras:** PRs mergeados na janela de 12 meses, com o mês corrente marcado como “(até agora)”. Média e recorde usam apenas os 11 meses fechados; o total inclui o mês parcial.
- **Heatmap:** 365 dias de contribuições, com cinco níveis de verde, tooltip por dia e navegação por teclado.
- **Seletor de perfil:** troca de conta sem reiniciar o app. A URL `?profile=<perfil>&user=<login>&private=0|1` preserva a visão para recarregar ou reabrir na mesma máquina.
- **Resumo do perfil:** mostra os filtros de organização/repositório e o fuso do corte mensal. Os filtros valem só para os PRs; o heatmap continua sendo o calendário global do perfil.

## Requisitos

- Node 26+
- Token do GitHub (PAT clássico) com escopo `repo` para incluir PRs de repositórios privados. O escopo `read:user` é opcional e permite que o GitHub detalhe contribuições privadas no perfil. Um token fine-grained precisa das permissões equivalentes de leitura nos repositórios e na organização.

Sem `repo`, o modo privado simplesmente não enxerga os repositórios privados. O heatmap sempre reflete o calendário do GitHub, que já inclui contribuições privadas de forma anônima e não pode ser filtrado por organização/repositório (ver `docs/adr/0002-heatmap-includes-private-contributions.md`).

### Conta do trabalho e SSO

Cada perfil usa o token da própria conta. Se a organização usa SAML SSO, autorize o token para a organização no GitHub (Settings → Developer settings → Tokens → Configure SSO). Sem essa autorização, PRs de repositórios privados da organização não aparecem.

### GitHub Enterprise

Informe a URL da API no perfil (`GITHUB_API_URL` ou `apiUrl`). A URL do GraphQL é derivada automaticamente:

- `https://api.github.com` → `https://api.github.com/graphql`
- `https://ghe.exemplo.com/api/v3` → `https://ghe.exemplo.com/api/graphql`
- `https://ghe.exemplo.com` → `https://ghe.exemplo.com/api/graphql`

Se a instância tiver um caminho fora desse padrão, informe `GITHUB_GRAPHQL_URL` ou `graphqlUrl` explicitamente.

## Instalação

```sh
npm install
cp .env.example .env
```

Edite o `.env` e defina pelo menos `GITHUB_USER` e `GITHUB_TOKEN`. Em desenvolvimento, o valor do token pode ser gerado com `gh auth token`. O token fica apenas no servidor: nunca entra no bundle, em variáveis `VITE_*`, na resposta da API ou em log. O `.env` não é versionado.

Se quiser mais de um perfil, copie o exemplo e preencha os dados:

```sh
cp profiles.example.json profiles.local.json
```

O `profiles.local.json` fica fora do git e contém apenas o nome da variável de ambiente do token (`tokenEnv`), nunca o valor. Defina essas variáveis no `.env` ou no ambiente do sistema; depois reinicie o servidor.

## Rodar localmente

```sh
npm run dev      # Vite em http://127.0.0.1:5173 (proxy de /api para o servidor)
npm run build    # build do frontend em dist/
npm start        # Express em http://127.0.0.1:3001 servindo dist/ e a API
npm test         # Vitest
npm run typecheck
```

O servidor escuta em `127.0.0.1` por padrão e carrega o `.env` se existir. Sem `GITHUB_USER`, a API responde `CONFIG_MISSING`; sem a variável de token do perfil, `TOKEN_MISSING`. A página mostra o erro de configuração em vez de cair em uma conta padrão. Reinicie o servidor depois de alterar o `.env` ou o arquivo de perfis.

## Perfis

O perfil padrão é montado com:

| Variável | Obrigatória | Padrão |
| --- | --- | --- |
| `GITHUB_USER` | sim | — |
| `GITHUB_TOKEN` | sim | — |
| `GITHUB_PROFILE_NAME` | não | `default` |
| `GITHUB_API_URL` | não | `https://api.github.com` |
| `GITHUB_GRAPHQL_URL` | não | derivada da API |
| `GITHUB_TIME_ZONE` | não | `UTC` |
| `GITHUB_ORGS` | não | vazio |
| `GITHUB_REPOS` | não | vazio |

`GITHUB_ORGS` e `GITHUB_REPOS` são listas separadas por vírgula. `repos` vence `orgs` quando os dois estão preenchidos. O arquivo indicado por `GITHUB_PROFILES_FILE` (padrão `./profiles.local.json`) adiciona perfis com `name`, `user`, `tokenEnv`, `apiUrl`, `graphqlUrl`, `orgs`, `repos` e `timeZone`. `name` é único, `user` e `tokenEnv` são obrigatórios e campos opcionais não preenchidos usam os padrões acima.

O `timeZone` é um fuso IANA e define as janelas mensais e a janela de 365 dias do heatmap. O qualificador `merged:` do GitHub continua usando datas UTC; PRs na virada da meia-noite podem cair no mês vizinho (ver `docs/adr/0003-monthly-counts-via-search-aliases.md`).

## Outra máquina

Em outra máquina, clone o repositório e repita a instalação. Copie o `.env` e o `profiles.local.json` por um canal seguro (gerenciador de segredos, não e-mail/chat) ou recrie os arquivos localmente com `cp .env.example .env`, `cp profiles.example.json profiles.local.json` e os mesmos nomes de variáveis de token. Nenhum dos dois arquivos deve ser commitado.

## Modo privado e cache

O modo privado (`?private=1`, padrão) só tem efeito para o dono do token (viewer) de cada perfil. Para outro usuário, o switch fica desligado e desabilitado com a explicação “Disponível apenas para o dono do token”, e as buscas são sempre públicas. A preferência pedida continua na URL e volta a valer ao retornar ao viewer. O switch afeta somente o gráfico de PRs; o heatmap não muda.

A API agrega no servidor e mantém um cache em memória de 1 hora por perfil, usuário canônico, modo privado efetivo e dia local no fuso do perfil. Erros não são cacheados. A interface mostra “Atualizado às HH:MM” a partir do instante em que os dados vieram do GitHub; não há refresh manual.

## API

`GET /api/activity?profile=<nome>&user=<login>&private=0|1`

`profile` é opcional (padrão é o perfil do ambiente), `user` é opcional (padrão é o usuário do perfil) e `private` aceita apenas `0` ou `1`. A resposta traz o nome do perfil, a lista `profiles` (só nome e usuário), os filtros/fuso efetivos, o login canônico, o viewer, os 12 meses, as estatísticas e os 365 dias do heatmap. Erros usam `{ "error": { "code", "message", "retryAt"? } }` e mensagens seguras em pt-BR:

- `CONFIG_MISSING`, `CONFIG_INVALID`, `TOKEN_MISSING`: ajuste o `.env`/arquivo de perfis e reinicie.
- `UNKNOWN_PROFILE`: o nome pedido não existe entre os perfis configurados.
- `INVALID_USER`, `INVALID_PRIVATE`: parâmetros fora do formato.
- `TOKEN_INVALID`, `USER_NOT_FOUND`, `RATE_LIMITED`, `GITHUB_ERROR`: resposta do GitHub.

A resposta leva `Cache-Control: no-store` e não há CORS.

## Limitações

- O heatmap inclui contribuições privadas e não pode ser filtrado para somente público nem por organização/repositório; por isso ele não fecha com a soma dos PRs públicos.
- A contagem mensal usa o qualificador `merged:` do GitHub, que opera em UTC.
- A configuração é lida no startup; mudanças no `.env` ou no arquivo de perfis exigem reiniciar o servidor.
- Não há autenticação própria, banco de dados, push, PR, CI ou deploy. É um projeto pessoal para uso local; expor a API na rede exigiria bind explícito e uma camada de autenticação.
