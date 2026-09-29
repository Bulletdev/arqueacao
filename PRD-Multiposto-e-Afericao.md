# PRD - Expansão: Arqueação multiposto + App de Aferição de Bicos

**Versão:** 0.1 (rascunho)
**Data:** 28/09/2026
**Status:** Parte B implementada como aba do app de Arqueação (28/09/2026), com bicos provisórios. Parte A aguardando informações do gerente (ver seção 7).
**Origem:** conversa com o Matheus (WhatsApp, terça e quarta), pedido do gerente do posto

---

## 1. Resumo do pedido

Dois pedidos independentes, vindos da mesma conversa:

| # | Pedido | O que foi dito | Leitura |
|---|---|---|---|
| A | **Arqueação para mais 3 postos** | "vão colocar uma sonda lá que vai medir automático os tanques [...] porém tem mais três postos que vão precisar do aplicativo [...] vai ter que fazer uma versão diferente do aplicativo pra cada posto [...] cê vai ter que mudar aquela tabelinha" | O app atual continua igual; o que muda por posto é o nome, os tanques e as tabelas de arqueação. |
| B | **Aferição de bombas** | "um local pra preencher sobre todos os bicos, que são 30. Cada um precisa do lugar pra pôr a vazão [...] os 20 L configurado na bomba e o lugar que mostra o resultado do teste [...] tipo 20 L passou tantos mL. Um lugar pra cada bico onde coloca uma observação. Aí salvar, exportar. Não tem tabela nem nada." / "Não precisa ser no mesmo app. É só um local pra preencher com informações e salvar PDF." | Formulário digital de aferição: 30 bicos, volume de teste, diferença medida, observação, salvar e gerar PDF. Sem tabela de conversão. |

O posto atual (o do Matheus) vai ganhar sonda automática, então o app de arqueação vira backup lá; os usuários novos da arqueação são os outros 3 postos.

---

## 2. Parte A - Arqueação multiposto

### 2.1 Problema

Hoje o app tem os tanques do posto atual "chumbados" em `js/tables-data.js` (`TANQUES_PADRAO`: GC, GA, AC, AA, S10, S500) e a lista de produtos é fixa (`PRODUTOS_NOMES`). Pela tela de Configurações só dá pra trocar qual tabela cada tanque usa - não dá pra criar/remover tanque, renomear produto, nem ter dois tanques do mesmo produto. Cada posto novo tem tanques diferentes, então hoje cada um exigiria mexer no código.

### 2.2 Abordagem recomendada: um código, um "perfil de posto" por posto

Não criar 4 cópias do app. Manter **um único código** e separar o que é específico de cada posto num **perfil**:

```js
// js/postos-data.js (novo)
const POSTOS = {
  "posto-atual": {
    nomePosto: "Posto ...",
    tanques: [ /* hoje em TANQUES_PADRAO */ ],
  },
  "posto-b": {
    nomePosto: "Posto B",
    tanques: [
      { id: "t1", nome: "Tanque 1", produto: "GC", tabelaId: "petroaco_15000", ordem: 1, ativo: true },
      // ...
    ],
  },
};
```

As tabelas de arqueação continuam num catálogo único (`TABLES_DATA`) - vários postos podem usar o mesmo modelo de tanque (ex.: Petroaço 15.000) sem duplicar números.

**Como cada posto recebe "a versão dele":** link com o perfil na primeira abertura, ex. `https://<app>/?posto=posto-b`. Na primeira abertura o `db.js` semeia o IndexedDB com o perfil daquele posto; depois disso o app funciona offline como hoje (o `start_url` do manifest não precisa do parâmetro, porque os dados já estão no aparelho). Um link por posto, mesmo deploy, zero build step - mantém a regra do CLAUDE.md.

Alternativas descartadas:
- *4 pastas/deploys copiados* - qualquer correção precisa ser feita 4 vezes; diverge rápido.
- *Tela "escolha seu posto" na abertura* - expõe os outros postos pro funcionário e cria chance de escolher errado. O link resolve sem essa tela.

### 2.3 Requisitos funcionais

**RF-A1 - Perfil de posto.** Novo arquivo `js/postos-data.js` com os perfis. Na primeira abertura, `?posto=<slug>` escolhe o perfil; sem parâmetro, usa o perfil do posto atual (instalações existentes continuam iguais, sem migração visível).

**RF-A2 - Cadastro completo de tanques em Configurações.** Adicionar, remover (desativar), renomear e reordenar tanques; produto como texto livre com sugestões (GC, GA, AC, AA, S10, S500, etanol, etc.), permitindo dois tanques do mesmo produto (ex.: "GC - Tanque 1" e "GC - Tanque 2"). Isso tira a dependência de código para ajustes finos em qualquer posto.

**RF-A3 - Tabela nova pelo app.** Já existe o colar-e-substituir (`parseTabelaTexto`); falta **criar** uma tabela nova (nome + colar `cm;litros`) em vez de só substituir uma existente. Continua valendo `tabelaValida` (cm=1 primeiro, sem buracos, litros crescente).

**RF-A4 - Exportar/importar perfil.** Exportar "tanques + tabelas + nome do posto" como JSON e importar em outro aparelho do mesmo posto. É o mesmo mecanismo do backup (RF-04 do PRD original), só que sem os fechamentos.

**RF-A5 - PDF/Excel/WhatsApp com o nome do posto certo.** Já usam `config.nomePosto`; só garantir que vem do perfil.

### 2.4 Tabelas dos postos novos (a parte que depende de dados)

Para cada tanque de cada posto novo precisamos de **uma** destas, em ordem de preferência:
1. Tabela oficial do fabricante (PDF/site, como foi com a Petroaço) - conferência ponto a ponto, `verificado: true`.
2. Foto nítida da tabela física impressa + fabricante/modelo.
3. Fabricante, modelo, diâmetro interno e comprimento - para tanque cilíndrico horizontal dá pra gerar pela fórmula do segmento circular (mesmo método usado hoje), marcando `verificado: false` até conferir com a tabela física.

Se algum tanque for do mesmo modelo Petroaço já conferido, reaproveita a tabela existente sem trabalho extra.

### 2.5 Critérios de aceite (Parte A)

1. Abrir `?posto=posto-b` num aparelho limpo, em modo avião depois da primeira carga, e ver só os tanques do posto B com o nome do posto B no PDF.
2. Aparelho que já usava o app (sem parâmetro) abre com os mesmos tanques e o histórico intacto.
3. Criar um tanque novo pela tela, associar a uma tabela colada, converter um valor e salvar fechamento.
4. Exportar o perfil num celular e importar em outro; os dois convertem igual.
5. Fechamentos antigos continuam com os litros congelados mesmo após mudar tanque/tabela.

---

## 3. Parte B - App de Aferição de Bicos (app separado)

### 3.1 Contexto

A aferição é o teste periódico das bombas: o frentista abastece o volume de teste (20 L) num **medidor padrão** (o "balde" de 20 L aferido) e lê na escala do medidor quanto **passou ou faltou**, em mL. Hoje isso é anotado em papel, bico por bico. O gerente quer um formulário digital para os **30 bicos**, com observação por bico, salvar e gerar **PDF**.

Não há conversão nem tabela - é um formulário estruturado com histórico e relatório. O próprio Matheus disse que **não precisa ser no mesmo app**.

### 3.2 Decisão: ~~app separado~~ aba "Aferição" no app de Arqueação

> **Atualizado em 28/09/2026:** decidido pelo autor colocar a aferição como
> aba do app de Arqueação (Consulta | Aferição | Histórico | Config), não
> como app separado. Motivo: um app só pra instalar e manter no posto,
> mesma infra, mesmo backup. O texto original abaixo fica como histórico.
> Rotas: `#/afericao`, `#/afericao/:id`, `#/historico/afericoes`. O
> histórico alterna Fechamentos | Aferições; bicos, tolerância e volume
> ficam em Configurações.

- **Separado** (repositório/pasta própria, ex. `Afericao/`), porque o público e a frequência são outros e o app de arqueação fica mais simples sem isso. Também facilita cobrar e entregar separadamente.
- **Mesma stack e mesmos arquivos reaproveitados:** HTML/CSS/JS puro, IndexedDB puro, jsPDF + autotable vendorizados, service worker cache-first, hash router, `format.js`, `share.js` e o esqueleto de `db.js`/`pdf.js`/`app.js`. Na prática é copiar a base da Arqueação e trocar as telas. Também ganha perfil de posto do mesmo jeito da Parte A (lista de bicos varia por posto).

### 3.3 Requisitos funcionais

**RF-B1 - Cadastro de bicos.** Lista de bicos do posto: número do bico, bomba (nº), produto, ativo, ordem. Vem pré-carregada do perfil do posto (30 bicos no posto atual) e é editável em Configurações.

**RF-B2 - Nova aferição (tela principal).**
- Cabeçalho: data/hora (automática, editável), responsável (lembra o último), identificação do medidor padrão (nº/lacre - opcional, lembra o último), observação geral.
- Um cartão por bico, agrupado por bomba, na ordem física:
  - **Bico / bomba / produto** (só leitura).
  - **Volume do teste (L)** - já vem com 20, editável (caso usem 10 L ou 50 L em algum bico).
  - **Resultado (mL)** - quanto passou ou faltou. Botões grandes **[+ Passou] [- Faltou]** + campo numérico, para não depender da tecla de sinal "-" no teclado numérico do Android (que em muitos aparelhos não aparece).
  - **Situação** calculada na hora: *Dentro da tolerância* (verde) / *Fora da tolerância* (vermelho), e o erro em % (ex.: +60 mL em 20 L = +0,30%).
  - **Observação** do bico (texto livre, ex.: "trocado bico", "lacre rompido", "vazamento na mangueira").
  - Opção **"Não testado"** (bico desativado, em manutenção, sem produto) - obriga observação.
- Contador de progresso fixo na tela: "18 de 30 bicos preenchidos · 1 fora da tolerância".
- **Rascunho automático** a cada alteração (IndexedDB): são 30 bicos, perder tudo por causa de uma ligação ou de o navegador fechar é o maior risco de uso real.

**RF-B3 - Salvar.** Salva a aferição com todos os valores e a situação **congelados** (mesma regra dos litros no fechamento: mudar a tolerância depois não reescreve aferições antigas). Se houver bico sem resultado e sem "Não testado", avisa e pede confirmação.

**RF-B4 - Histórico.** Lista de aferições por data, com resumo (bicos testados, quantos fora). Abrir, gerar PDF de novo, excluir.

**RF-B5 - PDF (prioridade).** Cabeçalho com nome do posto, data/hora, responsável e medidor padrão; tabela `Bomba | Bico | Produto | Volume (L) | Resultado (mL) | Erro (%) | Situação | Observação`; linhas fora da tolerância destacadas; resumo no fim (testados / dentro / fora / não testados); campo para assinatura do responsável e do gerente.

**RF-B6 - Compartilhar.** Mesmo fluxo do app atual: Web Share com o arquivo PDF (WhatsApp), fallback para download, e "copiar resumo em texto" com os bicos fora da tolerância.

**RF-B7 - Configurações.** Nome do posto, tolerância (mL por 20 L ou %), volume padrão do teste, lista de bicos, backup/restore JSON. Excel é opcional (fase 2), porque o pedido citou só PDF.

**RF-B8 - PWA offline.** Igual ao app atual: instala, abre e funciona sem rede.

### 3.4 Tolerância e vazão (conferido no RTM oficial em 28/09/2026)

**Tolerância:** item 3.1.2 do RTM aprovado pela **Portaria Inmetro nº
227/2022** (vigente desde 01/07/2022): erro máximo admissível de **±0,5%**
nas verificações subsequentes e inspeção, ou seja **±100 mL em 20 L**, igual
pros dois lados. É o padrão do app (configurável). A tabela "60 mL a menos /
100 mL a mais" que ainda aparece em notícias é da Portaria 294/2018 (2019 a
jun/2022), substituída. Fonte: RTM consolidado publicado pelo IPEM-PR.

**Vazão (confirmado pelo usuário em 28/09/2026 e implementado):** o item 6.4
do mesmo RTM manda ensaiar cada bico em pelo menos **duas vazões** - Q1
(lenta, perto da mínima) e Q2 (rápida, perto da máxima). Cada bico tem
agora dois resultados (rápida e lenta). Regra em `js/afericao.js`:
- cada ensaio dentro de ±tolerância (limite inclusivo);
- se os dois erros tiverem sinais contrários, a soma dos módulos também
  não pode passar da tolerância (6.4 e);
- um ensaio fora já reprova o bico, mesmo com o outro em branco;
- só uma vazão preenchida (e dentro) = situação "incompleto" (aviso ao
  salvar, não bloqueia).
Aferições salvas antes disso (um resultado só) são lidas como vazão rápida
(`normalizarItem`).

### 3.5 Modelo de dados

```ts
Bico {
  id: string          // "b01"
  numero: number      // nº do bico no posto (1..30)
  bomba: number       // nº da bomba
  produto: string     // "GC", "S10"...
  ordem: number
  ativo: boolean
}

Afericao {
  id: string          // uuid
  dataHora: string    // ISO
  responsavel: string
  medidorPadrao?: string
  observacao?: string
  toleranciaMl: number | null   // congelada no salvamento
  itens: {
    bicoId: string
    numero: number
    bomba: number
    produto: string   // copiado, não referência (bico pode mudar de produto)
    volumeL: number   // 20
    resultadoRapidaMl: number | null   // vazão rápida (Q2): +passou / -faltou
    resultadoLentaMl: number | null    // vazão lenta (Q1)
    erroRapidaPct: number | null
    erroLentaPct: number | null
    situacao: "ok" | "fora" | "nao_testado" | "vazio" | "incompleto" | "sem_criterio"   // sem_criterio = tolerância em branco
    observacao?: string
  }[]
  criadoEm: string
}

Rascunho   // mesmo formato de Afericao, 1 registro só, apagado ao salvar
Config { nomePosto, toleranciaMl, volumePadraoL, ultimoResponsavel, ultimoMedidor }
```

Stores IndexedDB: `bicos`, `afericoes`, `rascunho`, `config`.

### 3.6 Telas

```
[Nova aferição]  (tela inicial; retoma rascunho se houver)
   ├─ cabeçalho (data, responsável, medidor)
   ├─ Bomba 1: bico 1, bico 2, ...   [+/-] [mL] [obs]
   ├─ ...
   ├─ barra fixa: "18/30 · 1 fora"  [Salvar]
   └─ salvar → [Detalhe] → PDF / Compartilhar / Copiar texto
[Histórico] → lista → [Detalhe]
[Configurações] → posto, tolerância, bicos, backup
```

### 3.7 Critérios de aceite (Parte B)

1. Em modo avião, preencher os 30 bicos, salvar e gerar o PDF no celular.
2. Digitar +150 mL num bico com tolerância 100 mL e ver "Fora da tolerância" em vermelho na tela e destacado no PDF.
3. Preencher 10 bicos, fechar o navegador, reabrir e continuar do rascunho.
4. Marcar um bico como "Não testado" sem observação e o app não deixar salvar até preencher.
5. Mudar a tolerância em Configurações e aferições antigas continuarem com a situação original.
6. Compartilhar o PDF pelo WhatsApp a partir do Android.

---

## 4. Fora do escopo (as duas partes)

- Integração com a sonda automática do posto atual (o pedido não inclui; se quiserem depois, é outro projeto e depende do modelo da sonda).
- Login, perfis, servidor, sincronização entre postos ou painel central do gerente comparando os 4 postos.
- Emissão de documento com validade legal perante Inmetro/ANP - o PDF é registro interno.
- Foto por bico, assinatura digital na tela (possíveis na fase 2 se pedirem).

---

## 5. Plano de implementação

| Etapa | Entrega | Esforço estimado |
|---|---|---|
| A1 | `postos-data.js` + seleção por `?posto=` + migração transparente do posto atual | 3-4 h |
| A2 | Configurações: CRUD de tanques, produto livre, tabela nova | 4-6 h |
| A3 | Exportar/importar perfil + testes dos critérios de aceite | 2-3 h |
| A4 | Onboarding de cada posto novo (montar/conferir tabelas, perfil, link) | 1-3 h **por posto**, depende do material recebido |
| B1 | Base do app Aferição (cópia da infra, PWA, db, router, perfil de bicos) | 3-4 h |
| B2 | Tela de aferição (cartões, +/-, situação, progresso, rascunho) | 6-8 h |
| B3 | Salvar, histórico, detalhe | 3-4 h |
| B4 | PDF + compartilhar + texto | 3-4 h |
| B5 | Configurações, backup, testes em Android real | 3-4 h |

**Total aproximado:** Parte A ~9-13 h + 3-9 h de onboarding dos 3 postos; Parte B ~18-24 h. Ordem sugerida: **B primeiro** se o gerente tiver pressa na aferição (não depende de dado nenhum além da lista de bicos); A1-A3 podem ser feitos em paralelo enquanto as tabelas dos postos novos não chegam.

---

## 6. Riscos

- **Tabelas erradas nos postos novos** - é o risco mais caro (erro de estoque silencioso). Mitigação: só marcar `verificado: true` com tabela oficial conferida; tabela gerada por fórmula entra marcada como não verificada.
- **Perda de preenchimento na aferição** - mitigado pelo rascunho automático.
- **Tecla de sinal no Android** - mitigado pelos botões +/-.
- **Mesmo celular usado em dois postos** - com o perfil semeado na primeira abertura, o aparelho fica "de um posto". Se isso acontecer na prática, usar o importar perfil (RF-A4) ou um navegador/perfil separado.

---

## 7. Perguntas para o gerente (bloqueiam ou mudam o escopo)

**Parte A - Arqueação**
1. Nome de cada um dos 3 postos (vai no PDF).
2. Por posto: quantos tanques, qual produto em cada, e fabricante/modelo/capacidade de cada tanque. Foto da tabela de arqueação física ou PDF do fabricante de cada um.
3. Algum posto tem tanque bipartido (dois produtos no mesmo tanque) ou dois tanques do mesmo produto?
4. Os postos novos usam o mesmo celular/computador ou cada um tem o seu?

**Parte B - Aferição**
5. Os 30 bicos são do posto atual ou somados dos 4 postos? Os outros postos também vão usar?
6. Lista dos bicos: nº do bico, nº da bomba e produto de cada um (ou foto do painel/ficha).
7. O resultado é anotado como "passou/faltou X mL" (diferença) ou como a leitura direta da escala do medidor? Sempre 20 L?
8. Qual tolerância o posto usa para considerar reprovado? (sugestão inicial: ±100 mL em 20 L)
9. Com que frequência fazem (diária, semanal, mensal)? Quem preenche?
10. Existe uma ficha de papel ou modelo atual? **Uma foto dela** ajuda a deixar o PDF no formato que o gerente já conhece.
11. Precisa de Excel além do PDF? Precisa de campo de assinatura?

---

## 8. Decisões tomadas neste rascunho

- Arqueação: um código só, perfil por posto via link (`?posto=`), sem build step.
- Aferição: aba dentro do app de Arqueação (mudou em 28/09/2026 - era app separado).
- Valores da aferição congelados no salvamento (mesma regra dos litros no fechamento).
- Tolerância é configuração, não regra fixa no código.
- Sem login, sem servidor, sem telemetria - igual ao app atual.
