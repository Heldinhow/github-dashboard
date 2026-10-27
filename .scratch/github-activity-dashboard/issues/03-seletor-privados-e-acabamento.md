# 03: Seletor, modo privado e acabamento

**What to build:** Fecha a experiência: o usuário pode digitar outro login e aplicar, o modo privado liga/desliga os PRs de repositórios privados, a URL preserva usuário e modo, e o switch fica desabilitado com explicação para quem não é o dono do token. O servidor resolve o viewer, aplica `is:public` quando necessário e mantém o cache por usuário/modo/dia. O acabamento responsivo, a acessibilidade e o README final entram aqui.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- [ ] A API resolve o viewer uma vez por processo; `canIncludePrivate` é verdadeiro só para o viewer; `includePrivate` é o modo efetivo; `private` aceita apenas 0/1 e inválido vira 400 `INVALID_PRIVATE`; para não-viewer a busca é sempre pública.
- [ ] Erros do GraphQL são avaliados antes de `user` nulo; 403 com headers de rate limit vira 429; os demais 401/403 viram `TOKEN_INVALID`; alias faltante vira `GITHUB_ERROR`; `retryAt` é ISO 8601 UTC.
- [ ] A interface tem input + “Aplicar”, lê o estado da URL, atualiza o login canônico, rejeita campo vazio/inválido inline e não busca a cada tecla.
- [ ] O switch “Incluir repositórios privados” começa ligado pela URL; fica desabilitado durante o load; para não-viewer aparece desligado, desabilitado e com a explicação “Disponível apenas para o dono do token”; ao voltar ao viewer, a preferência da URL volta a valer.
- [ ] O cache usa usuário canônico + modo privado efetivo + dia; o viewer tem cache próprio; “Atualizado às HH:MM” usa `fetchedAt`; não há refresh manual.
- [ ] O layout final é uma coluna no mobile, cards empilhados, gráficos com scroll interno, sem rolagem horizontal da página; foco visível, labels no input/switch, células do heatmap focáveis e resumo acessível nos SVGs.
- [ ] README final documenta instalação, `GITHUB_TOKEN`, escopos (`repo`, opcional `read:user`), execução local em `127.0.0.1`, a limitação de privadas no heatmap e a ausência de auth/push/PR/deploy.
- [ ] Testes Vitest passam para o estado da URL/modo privado: defaults, parse de `private` 0/1, login canônico e a regra de modo efetivo para viewer e não-viewer.
- [ ] `npm test`, `npm run typecheck` e `npm run build` passam; smoke test manual com token real cobre privados on/off, outro usuário com switch desabilitado, recarga da URL e os estados de erro.
- [ ] Nenhum push, PR ou deploy.

## Notas

Ler a spec do dashboard, o GLOSSARY e os ADRs 0001–0003. O heatmap continua incluindo privadas e a nota deve permanecer visível; o switch afeta apenas o gráfico de PRs.
