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
molhado** (cilindro horizontal deitado).

- `petroaco_15000` (GC, GA, AC, AA, S10): Ø 2.549 mm, L 3.000 mm.
- `petroaco_10000_pleno` (S500): Ø 2.549 mm, L 2.000 mm.
- `arxo_10000` (reserva, não associada a nenhum tanque por padrão): Ø
  2.549 mm, L 1995,8 mm - essa é a que casa exatamente com a tabela impressa
  ARXO (foto nítida, formato cm;litros direto).

**`petroaco_15000` e `petroaco_10000_pleno` agora são `verificado: true`.**
O site do posto (petroacosaojoao.com.br/tabelas-de-arqueacao) publica os
PDFs oficiais "TABELA DE ARQUEAÇÃO - TANQUE MODELO 15.000/10.000 LTS",
mesmo fabricante, mesmas dimensões (2.549×3.000mm e 2.549×2.000mm) - conferi
os 254 pontos (cm 1 a 254) de cada tabela gerada contra o PDF oficial e
bateu **exato, zero divergência**. Esse cruzamento também achou um bug real:
as duas tabelas só tinham 248 linhas, faltando os últimos 6cm até o diâmetro
(254,9mm) - corrigido com os valores oficiais dessas linhas. Ainda assim, se
o gerente comparar com a tabela física impressa do posto e achar qualquer
divergência, o editor de colar-e-substituir (`parseTabelaTexto` em
`conversion.js`, formato `cm;litros`, tela Configurações > Tabelas) corrige
sem precisar de código.

**Achado resolvido, não reabra sem motivo novo:** o rascunho do PRD (RF-07
e critério de aceite #1) usa o exemplo "129 cm → 7.391 L" para GC. Na tabela
oficial do fabricante, 7.391 L corresponde a **124 cm**, não 129 (129 cm dá
7.773 L) - confirmado contra o PDF oficial, não é mais só suposição a partir
da tabela gerada. Foi typo de digitação no PRD (124↔129). O PRD deveria ser
atualizado pra citar 124 cm, mas isso é decisão de quem mantém o PRD - não
mudei o texto dele sozinho.

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
   `petroaco_10000_pleno`) - pode mudar quando o gerente confirmar. A tabela
   oficial do fabricante confirma o *modelo* de tanque (15.000/10.000 LTS
   pleno), não qual produto físico está em qual tanque do posto - essa parte
   ainda é suposição.
2. ~~As três tabelas precisam de conferência final contra a tabela física~~
   - `petroaco_15000` e `petroaco_10000_pleno` já foram conferidas 254/254
   pontos contra o PDF oficial do fabricante (petroacosaojoao.com.br/
   tabelas-de-arqueacao) e marcadas `verificado: true`. Só falta o gerente
   bater contra a tabela física impressa se quiser uma segunda confirmação.
