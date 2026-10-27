# 04: Configuração multi-conta e genérica

**What to build:** O app deixa de ter uma conta embutida e passa a ser configurável para a conta pessoal e a do trabalho, inclusive em GitHub Enterprise. O perfil padrão vem de variáveis de ambiente; perfis adicionais vêm de um JSON local fora do git, com token referenciado por variável de ambiente. A interface ganha seletor de perfil e um resumo dos filtros/fuso; cada perfil pode restringir os PRs por organização ou lista de repositórios e escolher o fuso do corte mensal. README e exemplos explicam os dois contextos e outra máquina, sem token no repositório.

**Blocked by:** 01, 02, 03.

**Status:** done

- [x] O perfil padrão usa `GITHUB_USER` e `GITHUB_TOKEN` (obrigatórios), `GITHUB_API_URL` (padrão `https://api.github.com`), `GITHUB_GRAPHQL_URL` (opcional; derivada), `GITHUB_PROFILE_NAME` (padrão `default`), `GITHUB_TIME_ZONE` (padrão `UTC`) e `GITHUB_ORGS`/`GITHUB_REPOS` (opcionais). Não há usuário padrão nem `usuario-dev` embutido no código, nos testes, no `.env.example` ou no README.
- [x] `GITHUB_PROFILES_FILE` (padrão `./profiles.local.json`) carrega perfis adicionais com `name`, `user`, `tokenEnv`, `apiUrl`, `graphqlUrl`, `orgs`, `repos` e `timeZone`; `name` é único, `user`/`tokenEnv` são obrigatórios e o arquivo não contém valor de token. `profiles.local.json` está no `.gitignore`; `profiles.example.json` é versionado sem segredos.
- [x] Config inválida vira erro claro: `CONFIG_MISSING` sem `GITHUB_USER`/perfil padrão, `CONFIG_INVALID` para JSON/campo/URL/fuso/filtro inválido, `TOKEN_MISSING` para variável de token ausente e `UNKNOWN_PROFILE` para perfil inexistente. Nada cai em uma conta padrão.
- [x] A API aceita `profile` e devolve `profile`, `profiles` (nome/usuário, sem tokens/URLs), `filters` (`orgs`, `repos`, `timeZone` efetivos), `viewer`, `canIncludePrivate` e `includePrivate`; o viewer é resolvido por perfil e o cache usa perfil + usuário + modo efetivo + dia no fuso do perfil.
- [x] A UI tem seletor de perfil: trocar atualiza `?profile=`, volta o usuário ao usuário do perfil, liga o modo privado e busca de novo; a URL passa a `?profile=&user=&private=`; input vazio/inválido mostra erro inline; o login/perfil canônicos atualizam a URL.
- [x] Filtros e fuso são por perfil: `repos` vence `orgs`; os filtros adicionam `repo:` ou `org:` só à busca de PRs e não alteram o heatmap; o `timeZone` define as janelas mensais e a janela de 365 dias. A UI mostra um resumo read-only dos filtros e do fuso.
- [x] URL GraphQL: explícita vence; senão deriva de `GITHUB_API_URL`/`apiUrl` (`api.github.com` → `/graphql`; `https://HOST/api/v3` → `https://HOST/api/graphql`; raiz → `/api/graphql`), normalizando barras e rejeitando URL inválida.
- [x] README em pt-BR e `.env.example`/`profiles.example.json` explicam conta pessoal e do trabalho, GitHub Enterprise, escopos `repo`/`read:user`, autorização SSO da organização, fuso/filtros, execução em outra máquina e a limitação de filtros no heatmap. Nenhum token real no repositório.
- [x] Testes Vitest passam para seleção de perfil (padrão, adicionais, duplicado/inválido, `tokenEnv` ausente, perfil desconhecido, sem `GITHUB_USER`), montagem/derivação das URLs, filtros `org:`/`repo:` e janelas em fusos diferentes. Os 52 testes existentes continuam verdes.
- [x] `npm test`, `npm run typecheck` e `npm run build` passam; smoke test real cobre perfil padrão, perfil adicional, privados on/off, outro usuário, recarga de URL e erros de configuração.
- [x] Sem push, PR ou deploy.

## Decisões novas

- Perfis adicionais não herdam URL, fuso ou filtros do perfil padrão: campos omitidos usam os padrões da spec (`https://api.github.com`, GraphQL derivada, `UTC`, sem filtros). Evita acoplamento implícito entre contas.
- O arquivo de perfis rejeita a chave `token` com `CONFIG_INVALID`; a única forma aceita é `tokenEnv`, apontando para uma variável de ambiente.
- `apiUrl` com caminho fora de `api.github.com`, `/api/v3` ou raiz exige `graphqlUrl` explícita, em vez de adivinhar o endpoint.

## Notas

Ler a spec (seções de perfis/configuração, contrato, consultas, cache, controles e testes), o GLOSSARY e os ADRs 0001–0004. O heatmap continua incluindo privadas e não recebe filtros de org/repo; o switch de privados vale só para PRs. Ticket 04 é uma generalização dos tickets 01–03, que ficam como histórico.

Implementação: configuração em `server/config.ts`, cliente GraphQL com endpoint por perfil, cache por perfil e UI com seletor/resumo. 82 testes Vitest; smoke real em 26/10/2026 cobriu perfil padrão (privados on/off), perfil adicional, outro usuário, cache por recarga de URL e os erros `CONFIG_MISSING`, `CONFIG_INVALID`, `TOKEN_MISSING` e `UNKNOWN_PROFILE`.
