# CLAUDE.md - Arqueação de Tanques (PWA)

## O que é este projeto

PWA (HTML/CSS/JS puro, sem framework, sem build step) que converte a medida
da régua (cm) num tanque de combustível em volume (litros), usando as
tabelas de arqueação do posto. Substitui a consulta manual na tabela
impressa. Roda 100% offline, sem login, sem back-end. Ler
`PRD-Arqueacao-PWA.md` primeiro - é a fonte de verdade do produto (RFs,
critérios de aceite, modelo de dados, decisões já tomadas).

Se o PRD e o código divergirem, o PRD manda - mas atualize o PRD junto se a
divergência for uma decisão de produto nova, não um bug.

## Stack e por quê

- **HTML/CSS/JS vanilla, sem bundler.** O app precisa abrir de um pendrive
  ou hospedagem estática qualquer, offline, sem etapa de build. Não
  introduza React/Vue/webpack/vite - não é preciso e complica o "abre e
  funciona".
- **IndexedDB puro** (`js/db.js`) - sem Dexie/idb. Schema pequeno (3 stores +
  1 config), não vale a dependência.
- **jsPDF + jspdf-autotable + SheetJS (xlsx)**, vendorizados em `vendor/`
  (arquivos locais, não CDN) - o app tem que funcionar com zero rede, sempre.
  Se atualizar uma lib, baixe o UMD build de novo para `vendor/` e atualize
  a lista `ARQUIVOS_PARA_CACHE` em `sw.js`.
- **Hash router manual** (`js/app.js`) - 4 telas, não precisa de lib de
  rotas.

## Estrutura

```
index.html            shell + <script> tags na ordem de dependência
css/styles.css         todo o CSS do app (um arquivo só, mobile-first)
js/tables-data.js       tabelas de arqueação pré-carregadas + tanques padrão
js/format.js            formatação pt-BR (número, data, uuid)
js/conversion.js        busca cm->litros, parser de tabela colada, validação
js/db.js                camada IndexedDB (DB.get/put/getAll/...)
js/pdf.js               relatório PDF (RF-05)
js/excel.js             relatório Excel (RF-06)
js/share.js             Web Share API + fallback + copiar texto (RF-07)
js/app.js               bootstrap + roteador hash (#/, #/historico, #/config, #/fechamento/:id)
js/views/*.js            uma função render*(container) por tela
manifest.json / sw.js    PWA - cache-first, precisa listar todo arquivo novo em sw.js
images/                  fotos originais das tabelas do posto (fonte, não editar)
```

## ⚠️ As tabelas de arqueação pré-carregadas são geradas, não digitadas - leia isto antes de mexer em `js/tables-data.js`

As 3 tabelas do posto são tanques cilíndricos horizontais, Ø interno
2.549 mm (dado nas fotos). Em vez de transcrever centenas de números
pequenos de fotos de celular (risco de erro que o próprio PRD já aponta na
seção 13), as tabelas foram **geradas pela fórmula do segmento circular
molhado** (cilindro horizontal deitado) e depois **conferidas ponto a ponto**
contra os valores legíveis nas fotos (`images/EC-EA-GC-GA-S10.webp`,
`images/S500.webp`, `images/tabelaArqueacaoHistorica.webp`) em cm = 1, 50,
100, 124, 127, 128, 129, 150, 200, 248, 254 - bateram exatamente nas três
tabelas.

- `petroaco_15000` (GC, GA, AC, AA, S10): Ø 2.549 mm, L 3.000 mm.
- `petroaco_10000_pleno` (S500): Ø 2.549 mm, L 2.000 mm.
- `arxo_10000` (reserva, não associada a nenhum tanque por padrão): Ø
  2.549 mm, L 1995,8 mm - essa é a que casa exatamente com a tabela impressa
  ARXO (foto nítida, formato cm;litros direto).

**Isso ainda não é sign-off do gerente.** As três estão marcadas
`verificado` em `TABLES_DATA` (só a ARXO está `true` - as duas Petroaço
seguem `false` até alguém comparar linha a linha com a tabela física do
posto). A tela Configurações > Tabelas mostra o selo "Não conferida" e tem
um editor de colar-e-substituir (`parseTabelaTexto` em `conversion.js`,
formato `cm;litros`) - é o caminho para o gerente corrigir qualquer valor
sem precisar de código.

**Achado registrado, não decida sozinho de novo:** o rascunho do PRD (RF-07
e critério de aceite #1) usa o exemplo "129 cm → 7.391 L" para GC. Nas
tabelas geradas/conferidas, 7.391 L corresponde a **124 cm**, não 129 (129 cm
dá 7.773 L). Muito provavelmente um typo de digitação (1↔2, 4↔9 fácil de
confundir numa tabela fotografada) na hora de escrever o PRD, não um erro
das tabelas - mas fica para o gerente confirmar. Não "corrija" isso mudando
os dados para bater com o 129 sem essa confirmação.

Ao gerar/editar uma tabela: `cm=1` é a primeira linha, sem buracos, litros
estritamente crescente (`tabelaValida` em `conversion.js` cobra isso).
`converterCmParaLitros` usa `cm - 1` como índice - é busca direta na tabela
(RF-02), **nunca** interpolação/fórmula na hora da consulta real.

## Convenções deste projeto

- **Português nos identificadores de domínio** (nomes de função, variável,
  texto de UI) - o PRD, os usuários e os textos de tela são todos em pt-BR;
  manter o código na mesma língua evita a tradução mental toda hora.
  Identificadores genéricos de infra (ex.: `DB`, `CACHE_VERSION`) podem ficar
  em inglês quando for o termo padrão da plataforma.
- **Sem dependência nova sem necessidade real.** Antes de adicionar uma lib,
  pergunte se dá pra fazer em ~30 linhas de vanilla JS. O ponto do app é
  rodar de um pendrive sem instalar nada.
- **Todo arquivo estático novo precisa entrar em `ARQUIVOS_PARA_CACHE`**
  (`sw.js`) e em `<script src="...">` (`index.html`), senão quebra offline
  ou não carrega.
- **Não remova a assinatura de autoria** (`assets/bullet-logo.png`, link
  para michaelbullet.dev, renderizada no fim de Configurações via
  `js/views/configuracoes.js`). É crédito do autor do app, não faz parte do
  produto em si - só mexer nisso se o autor pedir.
- **Litros são congelados no momento do fechamento** (RF-03/seção 8) - nunca
  recalcule `leituras[].litros` de um fechamento salvo a partir da tabela
  atual. Se a tabela mudar depois, fechamentos antigos continuam como
  estavam.
- **Sem login, sem perfis, sem telemetria/analytics** - decisão de produto
  explícita (seção 14 do PRD), não adicionar "de brinde".
- Ao subir `CACHE_VERSION` em `sw.js`, o `app.js` já mostra o banner "Nova
  versão disponível" via `mostrarBannerAtualizacao` - não precisa de infra
  nova pra isso.

## Rodando localmente

Sem build. Basta servir a pasta como estático (o app usa `fetch`/service
worker, então `file://` direto não funciona bem para o SW - sirva por HTTP):

```
python3 -m http.server 8790
# depois abra http://localhost:8790
```

(8790 em vez de uma porta comum de dev server tipo 3000/8000/8080/5173, pra
não colidir com outro projeto rodando ao mesmo tempo.)

Para testar o comportamento 100% offline: abra uma vez com rede (pro SW
instalar e cachear tudo), depois desligue a rede / DevTools > Network >
Offline e recarregue.

## Status dos dados (pendências reais, não hipotéticas)

Ver PRD seção 13. As principais, do ponto de vista de código:

1. Mapeamento tanque → tabela em `TANQUES_PADRAO` (`js/tables-data.js`) é a
   melhor suposição atual (GC/GA/AC/AA/S10 → `petroaco_15000`, S500 →
   `petroaco_10000_pleno`) - pode mudar quando o gerente confirmar.
2. As três tabelas precisam de conferência final contra a tabela física
   antes do posto confiar nelas para fechar o caixa de verdade.
