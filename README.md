```
 █████╗ ██████╗  ██████╗ ██╗   ██╗███████╗ █████╗  ██████╗ █████╗  ██████╗
██╔══██╗██╔══██╗██╔═══██╗██║   ██║██╔════╝██╔══██╗██╔════╝██╔══██╗██╔═══██╗
███████║██████╔╝██║   ██║██║   ██║█████╗  ███████║██║     ███████║██║   ██║
██╔══██║██╔══██╗██║▄▄ ██║██║   ██║██╔══╝  ██╔══██║██║     ██╔══██║██║   ██║
██║  ██║██║  ██║╚██████╔╝╚██████╔╝███████╗██║  ██║╚██████╗██║  ██║╚██████╔╝
╚═╝  ╚═╝╚═╝  ╚═╝ ╚══▀▀═╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝
            Conversor de arqueação de tanques (régua → litros) — PWA
```

<div align="center">

[![PWA](https://img.shields.io/badge/PWA-instalável-001936?logo=pwa&logoColor=white)](#)
[![Vanilla JS](https://img.shields.io/badge/js-vanilla-F7DF1E?logo=javascript&logoColor=black)](#)
[![No Build](https://img.shields.io/badge/build-nenhum-success)](#)
[![Offline First](https://img.shields.io/badge/offline-first-7f6500)](#)
[![Status](https://img.shields.io/badge/status-MVP%20em%20valida%C3%A7%C3%A3o-7f6500)](#)

</div>

---

```
╔══════════════════════════════════════════════════════════════════════════╗
║  ARQUEAÇÃO — HTML/CSS/JS vanilla, sem build, sem back-end                ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Converte a medida da régua (cm) num tanque de combustível em volume     ║
║  (litros), usando as tabelas de arqueação do posto. Substitui a consulta ║
║  manual na tabela impressa. 100% offline, sem login, sem servidor.       ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

<details>
<summary><kbd>▶ Key Features (click to expand)</kbd></summary>

```
┌────────────────────────────────────────────────────────────────────────────┐
│  [■] Consulta rápida        - cm → litros, busca direta na tabela (RF-02)  │
│  [■] Fechamento              - registra a leitura de todos os tanques      │
│  [■] Histórico                - fechamentos salvos, filtro por período     │
│  [■] Relatório PDF                - jsPDF + autotable, cabeçalho do posto  │
│  [■] Relatório Excel               - SheetJS, histórico do mês             │
│  [■] Compartilhar no WhatsApp        - Web Share API com fallback          │
│  [■] Tabelas editáveis                - colar/substituir, sem mexer código │
│  [■] Backup/restore                     - export/import JSON completo     │
│  [■] 100% Offline                        - Service Worker cache-first     │
│  [■] Instalável                           - manifest + ícones + PWA       │
│  [■] IndexedDB puro                        - sem Dexie, sem login, sem    │
│                                                telemetria                  │
└────────────────────────────────────────────────────────────────────────────┘
```

</details>

---

## Índice

```
┌──────────────────────────────────────────────────────┐
│  01 · Quick Start                                     │
│  02 · Stack                                           │
│  03 · Estrutura                                       │
│  04 · Testar offline                                  │
│  05 · Deploy na Vercel                                │
│  06 · Tabelas de arqueação                            │
│  07 · Status / Pendências                             │
│  08 · Licença e autoria                               │
└──────────────────────────────────────────────────────┘
```

---

## 01 · Quick Start

Sem build, sem `npm install`. Basta servir a pasta como estático:

```bash
python3 -m http.server 8790
# abra http://localhost:8790
```

(porta 8790 em vez de 3000/8000/8080/5173, pra não colidir com outro projeto
rodando ao mesmo tempo.)

> **Nota**: o app usa `fetch`/Service Worker, então `file://` direto não
> funciona bem pro SW - sempre sirva por HTTP.

---

## 02 · Stack

- **HTML/CSS/JS vanilla, sem bundler** - abre de um pendrive ou hospedagem
  estática qualquer, offline, sem etapa de build.
- **IndexedDB puro** (`js/db.js`) - sem Dexie/idb, schema pequeno (3 stores +
  1 config).
- **jsPDF + jspdf-autotable + SheetJS**, vendorizados em `vendor/` (arquivos
  locais, não CDN) - o app funciona com zero rede, sempre.
- **Hash router manual** (`js/app.js`) - 4 telas, sem lib de rotas.

Detalhes de arquitetura e decisões de produto: [`CLAUDE.md`](CLAUDE.md) e
[`PRD-Arqueacao-PWA.md`](PRD-Arqueacao-PWA.md).

---

## 03 · Estrutura

```
index.html             shell + <script> tags na ordem de dependência
css/styles.css          todo o CSS do app (um arquivo só, mobile-first)
js/tables-data.js        tabelas de arqueação pré-carregadas + tanques padrão
js/format.js              formatação pt-BR (número, data, uuid, tempo relativo)
js/conversion.js          busca cm→litros, parser de tabela colada, validação
js/db.js                   camada IndexedDB (DB.get/put/getAll/...)
js/ui.js                    dialog/toast/ícones compartilhados entre telas
js/pdf.js                    relatório PDF (RF-05)
js/excel.js                   relatório Excel (RF-06)
js/share.js                    Web Share API + fallback + copiar texto (RF-07)
js/app.js                       bootstrap + roteador hash (#/, #/historico, #/config, #/fechamento/:id)
js/views/*.js                    uma função render*(container) por tela
manifest.json / sw.js             PWA - cache-first, todo arquivo novo entra em sw.js
assets/                            logo do posto + assinatura de autoria
icons/                              ícones do PWA (192/512, normal/maskable)
images/                              fotos-fonte das tabelas do posto (não editar)
vendor/                              jsPDF, autotable e SheetJS (UMD, local)
```

---

## 04 · Testar offline

Pra testar o comportamento 100% offline: abra uma vez com rede (pro Service
Worker instalar e cachear tudo), depois desligue a rede ou DevTools →
Network → Offline e recarregue.

Ao subir `CACHE_VERSION` em `sw.js`, o app mostra sozinho o banner "Nova
versão disponível" - não precisa de infra nova pra isso. Sempre suba a
versão quando qualquer arquivo listado em `ARQUIVOS_PARA_CACHE` mudar.

---

## 05 · Deploy na Vercel

Projeto 100% estático (sem framework, sem build command, sem output
directory) - a raiz do repo já é o site.

**Via CLI:**

```bash
npm i -g vercel   # se ainda não tiver
vercel            # deploy de preview
vercel --prod     # deploy de produção
```

**Via import do GitHub:** push o repo, importe em vercel.com/new e use o
preset **Other** (Build Command e Output Directory em branco).

O [`vercel.json`](vercel.json) já força `Cache-Control: no-cache` em `sw.js`
e `manifest.json` - sem isso, o CDN da Vercel poderia cachear o
Service Worker de forma agressiva e o banner de atualização nunca apareceria
pros usuários.

---

## 06 · Tabelas de arqueação

⚠️ As três tabelas pré-carregadas em `js/tables-data.js` foram **geradas
pela fórmula do segmento circular molhado** (cilindro horizontal deitado) e
conferidas ponto a ponto contra as fotos em `images/`. Duas delas
(`petroaco_15000`, `petroaco_10000_pleno`) ainda **não têm sign-off do
gerente do posto** - aparecem com o selo "Não conferida" em Configurações.

Antes de usar pra fechar caixa de verdade, ver a seção 13 do
[`CLAUDE.md`](CLAUDE.md#⚠️-as-tabelas-de-arqueação-pré-carregadas-são-geradas-não-digitadas---leia-isto-antes-de-mexer-em-js-tables-datajs).

---

## 07 · Status / Pendências

MVP funcional, em validação com o posto. Pendências reais (não hipotéticas -
ver seção 13 do PRD):

1. Mapeamento tanque → tabela é a melhor suposição atual, não confirmado
   pelo gerente.
2. Conferência final das tabelas Petroaço linha a linha contra a tabela
   física.
3. Quantidade exata de tanques (protótipo tem 6).
4. Leitura em meio centímetro - ainda não avaliada se é necessária.
5. Web Share com arquivo testada no Safari/iOS.

---

## 08 · Licença e autoria

Uso interno do posto Petroaço São João. Desenvolvido por
[Bullet](https://www.michaelbullet.dev/links).
