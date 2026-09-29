# Implementação - Parte A (Arqueação multiposto)

Fonte de verdade: `PRD-Multiposto-e-Afericao.md`, seção 2.

A Parte B (aferição de bicos) já está feita como aba deste app - ver
"Parte B" no fim. Quando a A1 criar os perfis de posto, o perfil passa a
levar também a lista de bicos (hoje em `js/bicos-data.js`).

## Como trabalhar neste plano

1. Pegue a **primeira etapa não marcada** cujas dependências estão feitas.
2. Antes de codar, escreva/ajuste em `tools/testes-dominio.mjs` os testes da
   regra que a etapa cria (os da A1 já estão lá, como PENDENTE).
3. Implemente. UI/IndexedDB/SW → agent `pwa-vanilla-engineer`. Números de
   tabela / qual tabela vai em qual tanque → `tank-calibration-specialist`.
4. Rode `node tools/verificar.mjs`. Etapa só está pronta com **OK**, nenhum
   PENDENTE da própria etapa e a checagem manual da etapa feita no navegador
   (`python3 -m http.server 8790`).
5. Marque `[x]`, cole a última linha da saída do verificador ao lado e faça
   um commit por etapa.

"Rodei e passou" sem a saída colada não conta.

## Etapas

### [ ] A1 - Perfil de posto (RF-A1)
- Criar `js/postos-data.js` com `POSTOS`, `POSTO_PADRAO` e
  `resolverPosto(search)` (recebe `location.search`, devolve slug válido ou
  o padrão).
- Mover `TANQUES_PADRAO` pra dentro de `POSTOS[POSTO_PADRAO].tanques`
  **mantendo os ids** `gc,ga,ac,aa,s10,s500` (instalações existentes dependem
  deles). `TANQUES_PADRAO` pode continuar existindo como alias até a A2.
- `db.js` (semeadura da primeira abertura): usa o perfil de
  `resolverPosto(location.search)`, grava `config.postoId` e `nomePosto` do
  perfil. Banco já populado **não** é ressemeado (quem já usa não perde nada);
  banco sem `postoId` = posto padrão.
- Entra em `index.html` (antes de `db.js`) e em `ARQUIVOS_PARA_CACHE`; subir
  `CACHE_VERSION`.
- **Pronto quando:** testes A1 saem de PENDENTE e passam; navegador limpo em
  `?posto=<outro>` mostra os tanques e o nome do outro posto; navegador com
  dados antigos abre igual a antes.

### [ ] A2 - Cadastro completo de tanques (RF-A2, RF-A3)
- Configurações > Tanques: adicionar, renomear, desativar, reordenar;
  produto texto livre com `<datalist>` de sugestões (`PRODUTOS_NOMES`).
- Dois tanques com o mesmo produto funcionam na consulta, no PDF, no Excel e
  no texto do WhatsApp (conferir que nada indexa por `produto`).
- Configurações > Tabelas: "Nova tabela" (nome + colar `cm;litros`),
  reaproveitando `parseTabelaTexto` + `tabelaValida`.
- Novos testes: helper puro de ordenação/validação de tanque (id único,
  produto obrigatório) em `conversion.js` ou arquivo novo, testado aqui.
- **Pronto quando:** critério de aceite A-3 do PRD passa no navegador e o
  fechamento antigo continua com os litros congelados.

### [ ] A3 - Exportar/importar perfil (RF-A4)
- Exporta `{ versao, nomePosto, postoId, tanques, tabelas }` (sem
  fechamentos) em JSON; importa com validação (`tabelaValida` em cada tabela,
  todo tanque aponta pra tabela existente) antes de gravar qualquer coisa.
- Função pura `validarPerfil(obj)` testada em `testes-dominio.mjs` (perfil
  bom passa; tabela quebrada e tanque órfão são recusados com mensagem).
- **Pronto quando:** critério de aceite A-4 do PRD passa entre dois navegadores.

### [ ] A4 - Onboarding de cada posto novo (depende das respostas do gerente)
Uma subetapa por posto. Bloqueada até chegar o material (PRD seção 7,
perguntas 1-4).
- [ ] Posto B - slug: `?` - material recebido: não
- [ ] Posto C - slug: `?` - material recebido: não
- [ ] Posto D - slug: `?` - material recebido: não

Para cada um: `tank-calibration-specialist` monta/confere as tabelas (oficial
do fabricante → `verificado: true`; gerada por fórmula → `verificado: false`),
adiciona o perfil em `POSTOS`, o verificador passa, e o link
`https://<deploy>/?posto=<slug>` é testado em aparelho limpo.

## Parte B - Aba Aferição (feita em 28/09/2026)

- [x] Regras puras em `js/afericao.js` (11 testes em `testes-dominio.mjs`)
- [x] IndexedDB v2 (`bicos`, `afericoes`, `rascunho`), migração sem perda
  testada: fechamento salvo na versão anterior continua no histórico
- [x] Aba Aferição: 30 cartões por bomba, botões +/-, situação ao vivo,
  "Não testado" com motivo obrigatório, rascunho automático
- [x] Salvar congelado, detalhe, PDF (paisagem), compartilhar, copiar texto
- [x] Histórico com alternância Fechamentos | Aferições
- [x] Configurações: tolerância, volume padrão, CRUD de bicos, backup v2
- [ ] Trocar `BICOS_PADRAO` (provisório) pela lista real do gerente
- [x] Tolerância ±100 mL em 20 L conferida: Portaria Inmetro 227/2022, item 3.1.2
- [x] Duas vazões por bico (rápida e lenta) com a regra da soma de sinais opostos - RTM item 6.4 (confirmado pelo usuário 28/09/2026)
- [ ] Testar compartilhar PDF num Android real

## Registro

| Etapa | Data | Saída do verificador | Commit |
|---|---|---|---|
| B (aba Aferição) | 28/09/2026 | OK - 95 checagens passaram (sintaxe, offline, cdn, cache-version, assinatura, dominio) | "Adiciona aba Aferição de bicos" |
| B (duas vazões) | 28/09/2026 | OK - 98 checagens passaram (sintaxe, offline, cdn, cache-version, assinatura, dominio) | "Aferição testa cada bico em duas vazões" |
| | | | |
