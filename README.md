# Atividade no GitHub

Dashboard pessoal local com os PRs mergeados de usuario-dev na janela de 12 meses, em barras mensais com total, média e recorde, e um heatmap das contribuições do último ano.

## Requisitos

- Node 26+
- Token do GitHub: PAT clássico com escopo `repo`; `read:user` é opcional.

## Instalação

```sh
npm install
cp .env.example .env
```

Edite o `.env` e defina `GITHUB_TOKEN`. Em desenvolvimento, o valor pode ser gerado com `gh auth token`. O token fica apenas no servidor: nunca é enviado ao navegador nem versionado.

## Rodar

```sh
npm run dev      # Vite em http://127.0.0.1:5173 com proxy de /api para o servidor
npm run build    # build do frontend em dist/
npm start        # Express em http://127.0.0.1:3001 servindo dist/ e a API
npm test         # Vitest
npm run typecheck
```

O servidor escuta em `127.0.0.1` por padrão e carrega o `.env` se existir. Sem `GITHUB_TOKEN`, a API responde `TOKEN_MISSING` e a página mostra o erro de configuração.

## Escopo

Uso pessoal/local. Não há autenticação própria, push, PR ou deploy nesta etapa. Expor a API na rede exigiria bind explícito e uma camada de autenticação.
