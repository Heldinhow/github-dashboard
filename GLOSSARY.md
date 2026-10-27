# Atividade no GitHub

Contexto do dashboard pessoal que reúne PRs mergeados e contribuições de um único usuário do GitHub em uma página.

## Linguagem

**Contribuição**:
Ação contabilizada pelo GitHub em um dia: commit, issue, pull request ou review.
_Evitar_: atividade, evento

**Contribuição privada**:
Contribuição feita em repositório privado, contabilizada pelo GitHub sem expor o repositório ou o conteúdo. O heatmap não consegue separá-la das demais.
_Evitar_: contribuição anônima, contribuição restrita

**PR mergeado**:
Pull request autorado pelo usuário selecionado que foi efetivamente mesclado no período. PR aberto, fechado sem merge ou rascunho não conta.
_Evitar_: PR fechado, merge

**Mês fechado**:
Mês anterior ao mês parcial, com todos os seus dias dentro da janela.
_Evitar_: mês completo

**Mês parcial**:
O mês corrente, contado do dia 1 até hoje. Não entra na média nem no recorde.
_Evitar_: mês atual, mês incompleto

**Janela de 12 meses**:
Os 11 meses fechados mais o mês parcial, terminando hoje.
_Evitar_: último ano, período

**Heatmap**:
Grade de semanas × dias com cinco níveis de contribuição, no estilo do gráfico de contribuições do GitHub.
_Evitar_: calendário, gráfico de calor

**Nível**:
Classificação de 0 a 4 de um dia no heatmap. O nível 0 é ausência de contribuição; os níveis 1 a 4 saem dos quartis dos dias com contribuição.
_Evitar_: faixa, bucket

**Semana**:
Coluna do heatmap, de domingo a sábado, como no GitHub.
_Evitar_: coluna

**Usuário selecionado**:
Login do GitHub cuja atividade está sendo exibida. O padrão é o usuário do perfil selecionado.
_Evitar_: usuário, conta

**Perfil**:
Conjunto nomeado de usuário, token (referenciado por variável de ambiente), URL da API/GraphQL, filtros e fuso. O perfil padrão vem do ambiente; os adicionais, de um arquivo local fora do git.
_Evitar_: conta, workspace

**Perfil padrão**:
Perfil formado pelas variáveis de ambiente, usado quando a URL não pede outro perfil.
_Evitar_: perfil principal, conta padrão

**Token do perfil**:
Nome da variável de ambiente que guarda o token do perfil. O valor nunca fica no arquivo de perfis nem no repositório.
_Evitar_: token, PAT

**Filtro de contexto**:
Lista de organizações ou repositórios que restringe o gráfico de PRs do perfil. Não altera o heatmap.
_Evitar_: filtro de repositório, escopo

**Fuso do corte mensal**:
Fuso IANA do perfil que define onde um mês começa e termina nas janelas mensais e no heatmap.
_Evitar_: timezone, fuso horário

**GitHub Enterprise**:
Instância do GitHub com URL de API/GraphQL própria, configurada no perfil.
_Evitar_: GHE, GitHub corporativo

**Viewer**:
Dono do token do perfil selecionado. É o único usuário para quem o modo privado tem efeito.
_Evitar_: usuário logado, dono

**Modo privado**:
Estado em que o gráfico de PRs inclui PRs em repositórios privados acessíveis ao token. Não altera o heatmap.
_Evitar_: filtro de privacidade, privacidade

**Média mensal**:
Total de PRs mergeados nos 11 meses fechados dividido por 11.
_Evitar_: média do período

**Recorde mensal**:
Maior número de PRs mergeados entre os 11 meses fechados; empate fica com o mês mais recente.
_Evitar_: pico, máximo
