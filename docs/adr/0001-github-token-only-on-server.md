---
status: accepted
---

# Token do GitHub apenas no servidor

## Contexto

O dashboard consulta PRs e contribuições, inclusive de repositórios privados, a partir de uma página React. Um token embutido no frontend ficaria visível no bundle e nas requisições do navegador.

## Decisão

O token fica em `GITHUB_TOKEN`, no ambiente do servidor, e nunca é enviado ao frontend. Todas as chamadas ao GitHub passam por uma API do próprio projeto; o navegador recebe apenas dados agregados.

## Consequências

O projeto precisa de um processo de servidor também em produção, então não é um site puramente estático. Em desenvolvimento, o Vite faz proxy de `/api`; em produção, o Express serve o build.

## Alternativas consideradas

- Token no frontend: rejeitado por expor a credencial.
- OAuth por usuário: complexidade desnecessária para um dashboard pessoal.
