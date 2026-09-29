// Testes de regra de negócio do app de Arqueação.
// Cada teste: { nome, etapa?, exige?, scripts, rodar(avaliar) -> true | "mensagem de erro" }
//   scripts: arquivos carregados no mesmo escopo global, na ordem do index.html
//   exige:   arquivos que a etapa cria; enquanto não existirem, o teste é PENDENTE
//   avaliar: avalia uma expressão JS nesse escopo (ex.: avaliar("TABLES_DATA"))
//
// Ao implementar uma etapa do IMPLEMENTACAO.md, os testes dela saem de PENDENTE
// sozinhos. Adicione aqui os testes de qualquer regra nova antes de marcar a
// etapa como feita.

const BASE = ["js/tables-data.js", "js/format.js", "js/conversion.js"];
const COM_POSTOS = [...BASE, "js/postos-data.js"];
const LOGICA = ["js/format.js", "js/afericao.js"];
const COM_BICOS = [...LOGICA, "js/bicos-data.js"];

const item = (o) => JSON.stringify({ resultadoMl: null, volumeL: 20, naoTestado: false, observacao: "", ...o });

export default [
  // ---------- regras já existentes (MVP) ----------
  {
    nome: "todas as tabelas do catálogo passam em tabelaValida",
    scripts: BASE,
    rodar(avaliar) {
      const erros = avaliar(`Object.values(TABLES_DATA).map(t => [t.id, tabelaValida(t.linhas)]).filter(([,e]) => e)`);
      return erros.length === 0 || JSON.stringify(erros);
    },
  },
  {
    nome: "Petroaço 15.000: 124 cm = 7.391 L (valor oficial conferido)",
    scripts: BASE,
    rodar(avaliar) {
      const v = avaliar(`converterCmParaLitros(TABLES_DATA.petroaco_15000, 124)`);
      return v === 7391 || `deu ${v}`;
    },
  },
  {
    nome: "Petroaço 15.000 e 10.000 pleno vão até 254 cm (bug das 6 linhas faltando não volta)",
    scripts: BASE,
    rodar(avaliar) {
      const a = avaliar(`TABLES_DATA.petroaco_15000.linhas.length`);
      const b = avaliar(`TABLES_DATA.petroaco_10000_pleno.linhas.length`);
      return (a === 254 && b === 254) || `15000=${a} linhas, 10000=${b} linhas`;
    },
  },
  {
    nome: "fora da tabela: 0 = 0 L, 255/-1/12.5 = FORA_DA_TABELA, vazio = null",
    scripts: BASE,
    rodar(avaliar) {
      const r = avaliar(`(() => { const t = TABLES_DATA.petroaco_15000; return [
        converterCmParaLitros(t, 0) === 0,
        converterCmParaLitros(t, 255) === FORA_DA_TABELA,
        converterCmParaLitros(t, -1) === FORA_DA_TABELA,
        converterCmParaLitros(t, 12.5) === FORA_DA_TABELA,
        converterCmParaLitros(t, "") === null,
      ]; })()`);
      return r.every(Boolean) || `resultados ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "parseTabelaTexto aceita ; , e tab e recusa buraco",
    scripts: BASE,
    rodar(avaliar) {
      const ok = avaliar(`JSON.stringify(parseTabelaTexto("1;10\\n2,20\\n3\\t30"))`);
      if (ok !== "[10,20,30]") return `parse deu ${ok}`;
      const erro = avaliar(`(() => { try { parseTabelaTexto("1;10\\n3;30"); return null; } catch (e) { return e.message; } })()`);
      return (erro && erro.includes("cm=2")) || "não recusou tabela com buraco";
    },
  },
  {
    nome: "todo tanque padrão aponta pra uma tabela que existe",
    scripts: BASE,
    rodar(avaliar) {
      const orfaos = avaliar(`TANQUES_PADRAO.filter(t => !TABLES_DATA[t.tabelaId]).map(t => t.id)`);
      return orfaos.length === 0 || `tanques sem tabela: ${orfaos}`;
    },
  },

  // ---------- Aba Aferição (js/afericao.js) - PRD-Multiposto-e-Afericao.md seção 3 ----------
  {
    nome: "calcularErroPct: +60 mL em 20 L = +0,3%; -100 em 20 = -0,5%; null = null",
    etapa: "B2",
    exige: ["js/afericao.js"],
    scripts: LOGICA,
    rodar(avaliar) {
      const r = avaliar(`[calcularErroPct(60, 20), calcularErroPct(-100, 20), calcularErroPct(null, 20), calcularErroPct(50, 10)]`);
      const ok = Math.abs(r[0] - 0.3) < 1e-9 && Math.abs(r[1] + 0.5) < 1e-9 && r[2] === null && Math.abs(r[3] - 0.5) < 1e-9;
      return ok || `deu ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "classificarSituacao: limite é inclusivo (±100 em 20 L = ok, 101 = fora), vale pra + e -",
    etapa: "B2",
    exige: ["js/afericao.js"],
    scripts: LOGICA,
    rodar(avaliar) {
      const r = avaliar(`[
        classificarSituacao(${item({ resultadoMl: 100 })}, 100),
        classificarSituacao(${item({ resultadoMl: -100 })}, 100),
        classificarSituacao(${item({ resultadoMl: 101 })}, 100),
        classificarSituacao(${item({ resultadoMl: -150 })}, 100),
        classificarSituacao(${item({ resultadoMl: 0 })}, 100),
      ]`);
      return JSON.stringify(r) === JSON.stringify(["ok", "ok", "fora", "fora", "ok"]) || `deu ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "classificarSituacao: tolerância é por 20 L e escala com o volume (10 L → limite 50 mL)",
    etapa: "B2",
    exige: ["js/afericao.js"],
    scripts: LOGICA,
    rodar(avaliar) {
      const r = avaliar(`[
        classificarSituacao(${item({ resultadoMl: 50, volumeL: 10 })}, 100),
        classificarSituacao(${item({ resultadoMl: 60, volumeL: 10 })}, 100),
      ]`);
      return JSON.stringify(r) === JSON.stringify(["ok", "fora"]) || `deu ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "classificarSituacao: vazio, não testado e sem critério (tolerância null)",
    etapa: "B2",
    exige: ["js/afericao.js"],
    scripts: LOGICA,
    rodar(avaliar) {
      const r = avaliar(`[
        classificarSituacao(${item({})}, 100),
        classificarSituacao(${item({ naoTestado: true, observacao: "em manutenção" })}, 100),
        classificarSituacao(${item({ naoTestado: true, resultadoMl: 30 })}, 100),
        classificarSituacao(${item({ resultadoMl: 500 })}, null),
      ]`);
      return JSON.stringify(r) === JSON.stringify(["vazio", "nao_testado", "nao_testado", "sem_criterio"]) || `deu ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "validarAfericao: não testado sem observação é ERRO; bico vazio é só AVISO; sem responsável é erro",
    etapa: "B2",
    exige: ["js/afericao.js"],
    scripts: LOGICA,
    rodar(avaliar) {
      const r = avaliar(`(() => {
        const base = { responsavel: "João", itens: [] };
        const a = validarAfericao({ ...base, itens: [${item({ resultadoMl: 10 })}] });
        const b = validarAfericao({ ...base, itens: [${item({ naoTestado: true, observacao: "  " })}] });
        const c = validarAfericao({ ...base, itens: [${item({})}] });
        const d = validarAfericao({ responsavel: "", itens: [${item({ resultadoMl: 0 })}] });
        return [a.erros.length, a.avisos.length, b.erros.length, c.erros.length, c.avisos.length, d.erros.length];
      })()`);
      return JSON.stringify(r) === JSON.stringify([0, 0, 1, 0, 1, 1]) || `[erros/avisos] deu ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "resumirAfericao conta testados/ok/fora/não testados/vazios",
    etapa: "B2",
    exige: ["js/afericao.js"],
    scripts: LOGICA,
    rodar(avaliar) {
      const r = avaliar(`resumirAfericao([
        { situacao: "ok" }, { situacao: "ok" }, { situacao: "fora" },
        { situacao: "nao_testado" }, { situacao: "vazio" }, { situacao: "sem_criterio" },
      ])`);
      const esperado = { testados: 4, ok: 2, fora: 1, naoTestados: 1, vazios: 1 };
      const ok = Object.entries(esperado).every(([k, v]) => r[k] === v);
      return ok || `deu ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "montarItens: só bicos ativos, na ordem, com volume padrão e dados COPIADOS do bico",
    etapa: "B2",
    exige: ["js/afericao.js"],
    scripts: LOGICA,
    rodar(avaliar) {
      const r = avaliar(`(() => {
        const bicos = [
          { id: "b2", numero: 2, bomba: 1, produto: "GA", ordem: 2, ativo: true },
          { id: "b1", numero: 1, bomba: 1, produto: "GC", ordem: 1, ativo: true },
          { id: "b3", numero: 3, bomba: 2, produto: "S10", ordem: 3, ativo: false },
        ];
        const itens = montarItens(bicos, 20);
        bicos[1].produto = "MUDOU";
        return itens.map(i => [i.bicoId, i.numero, i.bomba, i.produto, i.volumeL, i.resultadoMl]);
      })()`);
      const esperado = [["b1", 1, 1, "GC", 20, null], ["b2", 2, 1, "GA", 20, null]];
      return JSON.stringify(r) === JSON.stringify(esperado) || `deu ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "congelarAfericao grava situacao e erroPct em cada item com a tolerância do momento",
    etapa: "B3",
    exige: ["js/afericao.js"],
    scripts: LOGICA,
    rodar(avaliar) {
      const r = avaliar(`(() => {
        if (typeof congelarAfericao !== "function") return "congelarAfericao(rascunho, toleranciaMl) não definida";
        const a = congelarAfericao({ responsavel: "João", itens: [${item({ resultadoMl: 150 })}, ${item({ resultadoMl: 20 })}] }, 100);
        return [a.toleranciaMl, a.itens[0].situacao, a.itens[1].situacao, a.itens[0].erroPct, typeof a.id, typeof a.criadoEm];
      })()`);
      if (typeof r === "string") return r;
      return JSON.stringify(r) === JSON.stringify([100, "fora", "ok", 0.75, "string", "string"]) || `deu ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "resultadoDoCampo: valor sem sinal + botão escolhido; sem botão só vale o zero; só inteiro",
    etapa: "B2",
    exige: ["js/afericao.js"],
    scripts: LOGICA,
    rodar(avaliar) {
      const r = avaliar(`[
        resultadoDoCampo("60", 1), resultadoDoCampo("60", -1), resultadoDoCampo("0", null),
        resultadoDoCampo("60", null), resultadoDoCampo("", 1), resultadoDoCampo("abc", 1),
        resultadoDoCampo("12,5", 1), resultadoDoCampo(" 40 ", -1),
      ]`);
      const esperado = [60, -60, 0, null, null, null, null, -40];
      return JSON.stringify(r) === JSON.stringify(esperado) || `deu ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "validarBicos: número repetido, bomba inválida e produto vazio são recusados",
    etapa: "B5",
    exige: ["js/afericao.js"],
    scripts: LOGICA,
    rodar(avaliar) {
      const r = avaliar(`[
        validarBicos([{ id: "a", numero: 1, bomba: 1, produto: "GC" }, { id: "b", numero: 2, bomba: 1, produto: "GA" }]).length,
        validarBicos([{ id: "a", numero: 1, bomba: 1, produto: "GC" }, { id: "b", numero: 1, bomba: 2, produto: "GA" }]).length,
        validarBicos([{ id: "a", numero: 1, bomba: 0, produto: "GC" }]).length,
        validarBicos([{ id: "a", numero: 1, bomba: 1, produto: " " }]).length,
        validarBicos([]).length,
      ]`);
      return JSON.stringify(r) === JSON.stringify([0, 1, 1, 1, 1]) || `quantidade de erros deu ${JSON.stringify(r)}`;
    },
  },
  {
    nome: "BICOS_PADRAO passa em validarBicos, ids únicos, e tolerância/volume padrão definidos",
    scripts: COM_BICOS,
    rodar(avaliar) {
      const r = avaliar(`(() => {
        const erros = validarBicos(BICOS_PADRAO);
        const ids = new Set(BICOS_PADRAO.map(b => b.id));
        if (ids.size !== BICOS_PADRAO.length) erros.push("id de bico repetido");
        if (!(TOLERANCIA_PADRAO_ML > 0)) erros.push("TOLERANCIA_PADRAO_ML inválida");
        if (!(VOLUME_PADRAO_TESTE_L > 0)) erros.push("VOLUME_PADRAO_TESTE_L inválido");
        return erros;
      })()`);
      return r.length === 0 || r.join("; ");
    },
  },

  // ---------- Parte A - multiposto (PRD-Multiposto-e-Afericao.md seção 2) ----------
  {
    nome: "POSTOS existe e tem o perfil do posto atual com os mesmos tanques de hoje",
    etapa: "A1",
    exige: ["js/postos-data.js"],
    scripts: COM_POSTOS,
    rodar(avaliar) {
      const r = avaliar(`(() => {
        if (typeof POSTOS !== "object") return "POSTOS não definido";
        if (typeof POSTO_PADRAO !== "string" || !POSTOS[POSTO_PADRAO]) return "POSTO_PADRAO não aponta pra um perfil";
        const ids = POSTOS[POSTO_PADRAO].tanques.map(t => t.id).join(",");
        return ids === "gc,ga,ac,aa,s10,s500" || "perfil padrão mudou os ids dos tanques (quebra instalações existentes): " + ids;
      })()`);
      return r;
    },
  },
  {
    nome: "todo perfil de posto: nome, tanques com id único, tabela existente, ordem única",
    etapa: "A1",
    exige: ["js/postos-data.js"],
    scripts: COM_POSTOS,
    rodar(avaliar) {
      const erros = avaliar(`(() => {
        const erros = [];
        for (const [slug, p] of Object.entries(POSTOS)) {
          if (!/^[a-z0-9-]+$/.test(slug)) erros.push(slug + ": slug precisa ser a-z0-9-");
          if (!p.nomePosto) erros.push(slug + ": sem nomePosto");
          if (!Array.isArray(p.tanques) || p.tanques.length === 0) { erros.push(slug + ": sem tanques"); continue; }
          const ids = new Set(), ordens = new Set();
          for (const t of p.tanques) {
            if (ids.has(t.id)) erros.push(slug + ": id repetido " + t.id);
            if (ordens.has(t.ordem)) erros.push(slug + ": ordem repetida " + t.ordem);
            ids.add(t.id); ordens.add(t.ordem);
            if (!TABLES_DATA[t.tabelaId]) erros.push(slug + "/" + t.id + ": tabela inexistente " + t.tabelaId);
            if (!t.produto) erros.push(slug + "/" + t.id + ": sem produto");
          }
        }
        return erros;
      })()`);
      return erros.length === 0 || erros.join("; ");
    },
  },
  {
    nome: "resolverPosto: ?posto=<slug> válido escolhe o perfil, inválido/ausente cai no padrão",
    etapa: "A1",
    exige: ["js/postos-data.js"],
    scripts: COM_POSTOS,
    rodar(avaliar) {
      const r = avaliar(`(() => {
        if (typeof resolverPosto !== "function") return "resolverPosto(search) não definida";
        const outro = Object.keys(POSTOS).find(s => s !== POSTO_PADRAO);
        const casos = [
          [resolverPosto(""), POSTO_PADRAO],
          [resolverPosto("?posto=nao-existe"), POSTO_PADRAO],
          [resolverPosto("?posto=" + POSTO_PADRAO), POSTO_PADRAO],
        ];
        if (outro) casos.push([resolverPosto("?posto=" + outro), outro]);
        const ruins = casos.filter(([a, b]) => a !== b);
        return ruins.length === 0 || "casos errados: " + JSON.stringify(ruins);
      })()`);
      return r;
    },
  },
];
