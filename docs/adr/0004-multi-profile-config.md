---
status: accepted
---

# Configuração multi-perfil com tokens por variável de ambiente

## Contexto

O app precisa servir a conta pessoal e a do trabalho, possivelmente em outro GitHub Enterprise, sem usuário, token ou URL fixos no código. Os tokens não podem ir para o repositório, para o frontend nem para um arquivo versionado; trocar de conta não pode exigir editar a aplicação, e o contexto de trabalho pode exigir filtros de organização/repositório e outro fuso mensal.

## Decisão

O perfil padrão vem de variáveis de ambiente (`GITHUB_USER`, `GITHUB_TOKEN`, `GITHUB_API_URL`, `GITHUB_GRAPHQL_URL` opcional, mais filtros/fuso). Perfis adicionais vêm de um JSON local fora do git (`GITHUB_PROFILES_FILE`, padrão `profiles.local.json`), com nome, usuário, `tokenEnv`, URL e filtros/fuso. O arquivo nunca contém o valor do token: cada perfil referencia a variável de ambiente que o guarda. O servidor lê a configuração no startup, resolve o perfil pedido, deriva/valida a URL GraphQL e cacheia por perfil, usuário, modo privado e dia.

A interface tem um seletor de perfil; trocar de perfil atualiza `?profile=`, volta ao usuário do perfil e liga o modo privado. Os filtros de organização/repositório e o fuso são por perfil. Os filtros afetam somente as buscas de PRs; o heatmap continua sendo o calendário global do perfil, porque a API de contribuições não aceita lista de repositórios e o gráfico deixaria de representar o perfil inteiro.

## Consequências

Mudar `.env` ou o arquivo de perfis exige reiniciar o servidor. O app pode rodar em outra máquina só com variáveis de ambiente; perfis nomeados são opcionais. A URL GraphQL precisa ser derivada corretamente para GitHub Enterprise (`/api/v3` → `/api/graphql`). Tokens de organização com SSO precisam ser autorizados no GitHub. O heatmap não reflete os filtros de org/repo, e a interface precisa deixar isso explícito.

## Alternativas consideradas

- Usuário/token fixos no código: rejeitado; não serve ao trabalho nem a outra máquina.
- Tokens em texto no arquivo de perfis: rejeitado por expor credenciais no disco e no backup.
- Editar perfis/tokens pela interface: rejeitado; exigiria armazenar segredos e autenticação própria.
- Um token único para todas as contas: rejeitado; tokens diferentes e GitHub Enterprise não compartilham credencial.
- Filtrar o heatmap por org/repo: rejeitado; a API não oferece lista de repositórios e o resultado deixaria de ser o calendário do perfil.
