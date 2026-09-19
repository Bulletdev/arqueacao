# PRD — Aplicativo de Arqueação de Tanques (PWA)

**Versão:** 1.0 (rascunho)
**Data:** 15/09/2026
**Status:** Em validação com o gerente do posto

---

## 1. Resumo

Aplicativo web progressivo (PWA) para **converter a medida da régua (em centímetros) em volume de combustível (litros)** nos tanques de um posto, usando as tabelas de arqueação oficiais de cada tanque. O app substitui a consulta manual na tabela impressa, registra o fechamento de cada turno com data e hora, e gera um relatório em **PDF/Excel** que pode ser **enviado pelo WhatsApp** — tudo **sem internet e sem login**.

Ele existe para uma coisa só: agilizar um serviço que hoje é feito na mão, com a tabela plastificada e uma calculadora.

---

## 2. Contexto e problema

Hoje, no fechamento, o funcionário mede cada tanque com a régua, anota o valor em centímetros, procura o número correspondente na tabela impressa (uma tabela por modelo de tanque) e copia o volume em litros. Esse processo:

- é lento e repetitivo (5 a 6 tanques por fechamento);
- gera erro de leitura (tabela pequena, linhas próximas, valores com ponto de milhar);
- não deixa histórico organizado — os resultados ficam em papel ou em mensagens soltas;
- exige refazer o relatório para mandar ao gerente.

Já existe um protótipo simples (`Test.html`) com campos GC, GA, AC, AA, S10 e um campo separado para S500, com botão "Buscar". Este PRD parte dele e define o produto completo.

---

## 3. Objetivos

| Objetivo | Métrica de sucesso |
|---|---|
| Reduzir o tempo do fechamento | Fechamento completo (todos os tanques) em menos de 2 minutos |
| Eliminar erro de leitura da tabela | 100% das conversões feitas pelo app, sem consulta ao papel |
| Manter histórico | Todo fechamento salvo localmente com data/hora e recuperável |
| Facilitar o envio ao gerente | Relatório PDF/Excel gerado e compartilhado em até 3 toques |
| Funcionar em qualquer lugar do posto | Uso 100% offline no celular e no computador |

### Não objetivos (fora do escopo desta versão)
- Controle de estoque, vendas, ou conciliação com bombas/ECF.
- Múltiplas empresas ou múltiplos postos na mesma instalação.
- Login, perfis de usuário e permissões.
- Sincronização em nuvem ou servidor central.
- Cálculo de temperatura/densidade (compensação volumétrica).
- Integração com sistemas fiscais ou ERP.

---

## 4. Usuários

**Operador de fechamento (usuário principal)**
Funcionário do posto que mede os tanques no fim do turno. Usa o celular (Android, na maioria) ou o computador do escritório. Precisa de uma tela simples, botões grandes, entrada rápida pelo teclado numérico.

**Gerente (usuário secundário)**
Recebe o relatório pelo WhatsApp. Ocasionalmente consulta o histórico no app. É quem cadastra ou atualiza as tabelas de arqueação quando um tanque muda.

Não há distinção de perfil no sistema: qualquer pessoa com o app aberto pode fazer tudo. Essa foi uma decisão explícita ("funcionário não precisa de usuário, não precisa de login").

---

## 5. Produtos e tanques

Siglas usadas no posto:

| Sigla | Produto |
|---|---|
| GC | Gasolina comum |
| GA | Gasolina aditivada |
| AC | Álcool (etanol) comum |
| AA | Álcool (etanol) aditivado |
| S10 | Diesel S10 (aditivado) |
| S500 | Diesel S500 (comum) |

Tabelas de arqueação já fotografadas:

| Tabela | Fabricante | Tanque | Ø interno | Capacidade | Faixa da régua |
|---|---|---|---|---|---|
| A | Petroaço São João | Modelo 60.000 L, 4 compartimentos de 15.000 L | 2.549 mm | 15.309 L por compartimento | 1 cm a 248 cm (249+ retorna `#NUM!`) |
| B | Petroaço São João | Modelo 10.000 L pleno (sem divisão) | 2.549 mm | 10.206 L | 1 cm a 248 cm |
| C | ARXO | Subterrâneo jaquetado 30.000 L bipartido (10/20), compartimento de 10.000 L | 2.549 mm | 10.181 L | 1 cm a 254 cm (margem de erro declarada: 2,5%) |

> **Pendência:** confirmar qual tabela pertence a qual produto/tanque. O protótipo sugere que GC, GA, AC, AA e S10 usam uma tabela e S500 usa outra, mas isso precisa ser validado. O app deve permitir associar qualquer tabela a qualquer tanque — a associação é configuração, não código.

---

## 6. Requisitos funcionais

### RF-01 — Consulta rápida (conversão avulsa)
- Tela inicial com um campo por tanque (GC, GA, AC, AA, S10, S500).
- O usuário digita a medida em **centímetros inteiros, sem vírgula**: `59` significa 0,59 m; `129` significa 1,29 m.
- Ao digitar (ou ao tocar "Buscar"), o app mostra o volume em litros ao lado do campo, formatado no padrão brasileiro (`7.391 L`).
- Campos vazios são ignorados (nem todo tanque é medido toda vez).
- Teclado numérico no celular (`inputmode="numeric"`).

### RF-02 — Regras de conversão
- A conversão é uma **busca direta na tabela** do tanque: cada centímetro tem um valor em litros. Não há fórmula.
- Se a medida não existir na tabela (ex.: 260 cm num tanque de 254 cm, ou o `#NUM!` da tabela original), o app mostra "Fora da tabela" em vez de um número, e não deixa salvar essa leitura.
- Medida `0` retorna `0 L`.
- Não existe limite mínimo/máximo configurado à parte — a própria tabela define os limites.
- Opcional (fase 2): aceitar meio centímetro (`59,5`) com interpolação linear entre as duas linhas. Só se o gerente pedir.

### RF-03 — Fechamento (registro da medição)
- Botão "Salvar fechamento" na tela de consulta.
- Um fechamento contém: data e hora (preenchidas automaticamente, editáveis), nome do operador (campo texto livre, lembra o último usado), leitura de cada tanque (cm e litros), observação opcional.
- Somatório de litros por produto e total geral.
- Após salvar, o app oferece "Gerar PDF", "Gerar Excel" e "Compartilhar".

### RF-04 — Histórico
- Lista de fechamentos salvos, do mais recente para o mais antigo, com data, hora, operador e total em litros.
- Filtro por período (hoje, últimos 7 dias, mês, intervalo livre).
- Abrir um fechamento mostra todos os detalhes e permite gerar novamente o PDF/Excel.
- Editar ou excluir um fechamento pede confirmação.
- Os dados ficam no dispositivo (IndexedDB). Deve haver aviso claro de que limpar os dados do navegador apaga o histórico, e uma opção "Exportar backup" (JSON) / "Importar backup".

### RF-05 — Relatório PDF
- Cabeçalho: nome do posto (configurável), data/hora do fechamento, operador.
- Tabela: Tanque | Produto | Medida (cm) | Volume (L).
- Totais por produto e total geral.
- Rodapé: "Gerado pelo app de arqueação" + data de geração.
- Formato A4 retrato, pronto para imprimir.
- Gerado 100% no cliente (sem servidor).

### RF-06 — Relatório Excel
- Mesmo conteúdo do PDF em uma planilha `.xlsx`, uma linha por tanque, com linha de totais.
- Exportação do histórico completo em uma única planilha (uma linha por tanque por fechamento) para o gerente analisar.

### RF-07 — Compartilhar pelo WhatsApp
- No celular: usa a **Web Share API** com arquivo (`navigator.share({ files })`), que abre o seletor do sistema com WhatsApp entre as opções.
- No computador ou onde a Web Share API não funciona: faz download do arquivo e mostra a instrução "Anexe o arquivo no WhatsApp".
- Também oferece "Copiar resumo como texto" (mensagem pronta para colar no WhatsApp, sem arquivo):

```
Fechamento 15/09/2026 21:30 — Operador: João
GC: 129 cm → 7.391 L
GA: 87 cm → 4.614 L
...
Total: 41.250 L
```

### RF-08 — Cadastro de tanques e tabelas de arqueação
- Tela "Configurações > Tanques": lista dos tanques com nome, produto, capacidade e tabela associada.
- Cadastro/edição de tabela de arqueação:
  - Colar texto (duas colunas `cm;litros`) ou importar CSV/XLSX.
  - Edição linha a linha para corrigir um valor.
  - Validação: centímetros únicos, crescentes, sem buracos; litros crescentes.
- O app é entregue com as três tabelas fotografadas já digitadas (Petroaço 15.000, Petroaço 10.000 pleno, ARXO 10.000), prontas para associar aos tanques.
- Nome do posto e nome padrão do operador também ficam em Configurações.

### RF-09 — Instalação como PWA
- Manifesto e service worker: instalável na tela inicial do Android/iOS e como app no Chrome/Edge do Windows.
- Todos os arquivos (HTML, JS, CSS, fontes, tabelas iniciais) ficam em cache; abre e funciona sem nenhuma conexão.
- Atualização silenciosa quando houver rede, com aviso "Nova versão disponível — recarregar".

---

## 7. Requisitos não funcionais

| Área | Requisito |
|---|---|
| Offline | Funciona integralmente sem internet após a primeira abertura. Nenhuma funcionalidade depende de rede. |
| Plataformas | Chrome/Edge no Windows; Chrome no Android; Safari no iOS (com limitações da Web Share). Layout responsivo de 360 px a 1920 px. |
| Desempenho | Conversão instantânea (< 50 ms). Abertura do app < 2 s em celular intermediário. |
| Armazenamento | IndexedDB para fechamentos e tabelas. Estimativa: < 5 MB para anos de uso. |
| Privacidade | Nenhum dado sai do dispositivo, exceto quando o usuário compartilha um arquivo. Sem analytics, sem chamadas externas. |
| Idioma e formato | Português (BR). Números com ponto de milhar e vírgula decimal. Datas `dd/mm/aaaa hh:mm`. |
| Acessibilidade | Botões com área mínima de 44 px, contraste AA, labels em todos os campos, navegação por teclado no desktop. |
| Segurança | Sem login por decisão de produto. O risco é aceito porque o app roda em dispositivos do posto. Backup/restore protege contra perda acidental. |

---

## 8. Modelo de dados

```ts
Tanque {
  id: string            // "gc", "s500"...
  nome: string          // "Tanque 1 — GC"
  produto: "GC" | "GA" | "AC" | "AA" | "S10" | "S500"
  capacidadeLitros: number
  tabelaId: string
  ordem: number         // ordem na tela
  ativo: boolean
}

TabelaArqueacao {
  id: string
  nome: string          // "Petroaço 15.000 L"
  fabricante?: string
  diametroMm?: number
  linhas: { cm: number; litros: number }[]   // 1 linha por cm
  margemErroPct?: number
}

Fechamento {
  id: string            // uuid
  dataHora: string      // ISO
  operador: string
  observacao?: string
  leituras: {
    tanqueId: string
    produto: string
    cm: number
    litros: number      // congelado no momento do salvamento
  }[]
  totalLitros: number
  criadoEm: string
}

Config {
  nomePosto: string
  ultimoOperador: string
  versaoSchema: number
}
```

O volume em litros é **gravado junto com a leitura**, não recalculado depois. Se a tabela for alterada no futuro, os fechamentos antigos continuam fiéis ao que foi apurado na época.

---

## 9. Telas e fluxo

```
[Início / Consulta]
   ├─ campos GC GA AC AA S10 S500 (cm) → litros em tempo real
   ├─ [Salvar fechamento] → [Confirmação: data/hora, operador, observação]
   │                           └─ salva → [Detalhe do fechamento]
   │                                        ├─ PDF
   │                                        ├─ Excel
   │                                        └─ Compartilhar / Copiar texto
   ├─ [Histórico] → lista → [Detalhe do fechamento]
   └─ [Configurações]
         ├─ Posto e operador padrão
         ├─ Tanques (associar tabela)
         ├─ Tabelas de arqueação (importar / editar)
         └─ Backup (exportar / importar JSON)
```

Princípios de interface:
- A tela inicial é a de consulta. Zero cliques para começar a digitar.
- Um campo por tanque, na ordem física dos tanques no posto.
- Resultado aparece ao lado do campo conforme digita; não precisa apertar "Buscar" (o botão existe para quem prefere).
- Valores fora da tabela ficam em vermelho com o texto "Fora da tabela".

---

## 10. Arquitetura técnica sugerida

- **Front-end:** HTML + JavaScript (vanilla ou framework leve como Preact/Svelte). Um único bundle estático — pode ser servido por qualquer hospedagem estática ou até aberto de um pendrive.
- **PWA:** `manifest.json` + service worker com estratégia *cache-first* (Workbox ou manual).
- **Banco local:** IndexedDB (via `idb` ou Dexie).
- **PDF:** `jsPDF` + `jspdf-autotable`, ou `window.print()` com CSS de impressão como fallback.
- **Excel:** SheetJS (`xlsx`).
- **Compartilhar:** Web Share API nível 2 (arquivos); fallback para download.
- **Tabelas iniciais:** arquivo JSON embutido no build, importado na primeira abertura.
- **Sem back-end.** Sem banco remoto. Sem autenticação.

---

## 11. Critérios de aceite (MVP)

1. Abrir o app no Android em modo avião e converter `129` no tanque GC para `7.391 L` (tabela Petroaço 15.000).
2. Digitar `260` em qualquer tanque e ver "Fora da tabela", sem conseguir salvar.
3. Salvar um fechamento com 6 tanques, fechar o navegador, reabrir e encontrar o fechamento no histórico.
4. Gerar PDF do fechamento e compartilhar pelo WhatsApp a partir do celular.
5. Gerar Excel do histórico do mês no computador.
6. Trocar a tabela do tanque S500 nas configurações e ver a conversão mudar na consulta, sem alterar fechamentos antigos.
7. Exportar backup, limpar dados do navegador, importar backup e recuperar tudo.

---

## 12. Roadmap

| Fase | Entrega |
|---|---|
| **MVP** | Consulta, fechamento, histórico, PDF, compartilhar, tabelas pré-carregadas, PWA offline |
| **Fase 2** | Excel, backup/restore, edição de tabelas pelo app, texto pronto para WhatsApp |
| **Fase 3 (se pedido)** | Meio centímetro com interpolação, comparação com fechamento anterior (variação em litros), impressão direta |

---

## 13. Pendências e perguntas em aberto

1. **Mapeamento tanque → tabela.** Quais produtos estão no tanque de 60.000 L (4 × 15.000), qual está no pleno de 10.000 e qual no ARXO bipartido? O gerente vai enviar a tabela/vídeo do posto.
2. **Quantidade exata de tanques.** O protótipo tem 6 campos; confirmar se há mais de um tanque para o mesmo produto.
3. ~~**Tabelas digitadas.**~~ **Resolvido.** `petroaco_15000` e `petroaco_10000_pleno` foram conferidas 254/254 pontos contra os PDFs oficiais do fabricante em petroacosaojoao.com.br/tabelas-de-arqueacao (zero divergência - inclusive corrigiu um bug de 6 linhas faltando no topo das duas tabelas). Ver `js/tables-data.js`.
4. **Operador.** Basta um campo de texto livre, ou o gerente quer uma lista fixa de nomes?
5. **Meio centímetro.** As réguas do posto permitem leitura de 0,5 cm? Se sim, vale a interpolação.
6. **iOS.** Há iPhone em uso no posto? Se sim, testar a Web Share com arquivos no Safari.
7. **Nome do posto e logo** para o cabeçalho do PDF.

---

## 14. Decisões já tomadas (registro)

- Sem login e sem perfis — o app é de uso interno no dispositivo do posto.
- Sem internet — tudo local, arquivo compartilhado manualmente pelo WhatsApp.
- Uma empresa só — não há suporte a múltiplos postos.
- Entrada em centímetros inteiros, sem vírgula (`59`, `129`).
- Sem limite mínimo/máximo artificial — a tabela de arqueação é a única fonte de verdade.
- Relatórios em PDF (prioridade) e Excel.
- Precisa rodar no computador e no celular — por isso PWA.
