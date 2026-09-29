// Regras de negócio da aferição - funções puras (sem DOM, sem IndexedDB).
// São a parte testada pelo harness (tools/testes-dominio.mjs); as views só
// chamam estas funções, nunca refazem a conta por conta própria.

// Tolerância configurada vale para um teste de 20 L e escala com o volume
// (teste de 10 L com tolerância 100 mL/20 L -> limite 50 mL).
const VOLUME_REFERENCIA_TOLERANCIA_L = 20;

function calcularErroPct(resultadoMl, volumeL) {
  if (resultadoMl === null || resultadoMl === undefined || !volumeL) return null;
  return (resultadoMl / (volumeL * 1000)) * 100;
}

function limiteToleranciaMl(toleranciaMl, volumeL) {
  return toleranciaMl * (volumeL / VOLUME_REFERENCIA_TOLERANCIA_L);
}

// Cada bico é ensaiado em duas vazões (RTM da Portaria Inmetro nº 227/2022,
// item 6.4): rápida (Q2, perto da máxima) e lenta (Q1, perto da mínima).
// Regras (itens 3.1.2 e 6.4 e):
//   - cada ensaio dentro de ±tolerância;
//   - se os dois erros tiverem sinais contrários, a soma dos módulos também
//     não pode passar da tolerância.
const VAZOES = ["rapida", "lenta"];
const VAZAO_ROTULO = { rapida: "Vazão rápida", lenta: "Vazão lenta" };

const temValor = (v) => v !== null && v !== undefined;

function detalharFora(item, toleranciaMl) {
  const limiteMl = limiteToleranciaMl(Number(toleranciaMl), item.volumeL);
  const r = item.resultadoRapidaMl;
  const l = item.resultadoLentaMl;
  const opostos = temValor(r) && temValor(l) && Math.sign(r) * Math.sign(l) < 0;
  const somaOpostos = opostos ? Math.abs(r) + Math.abs(l) : null;
  return {
    limiteMl,
    rapida: temValor(r) && Math.abs(r) > limiteMl,
    lenta: temValor(l) && Math.abs(l) > limiteMl,
    somaOpostos,
    estourouSoma: somaOpostos !== null && somaOpostos > limiteMl,
  };
}

function classificarSituacao(item, toleranciaMl) {
  if (item.naoTestado) return "nao_testado";
  const qtd = [item.resultadoRapidaMl, item.resultadoLentaMl].filter(temValor).length;
  if (qtd === 0) return "vazio";
  const semCriterio = toleranciaMl === null || toleranciaMl === undefined || toleranciaMl === "";
  if (!semCriterio) {
    const d = detalharFora(item, toleranciaMl);
    // Um ensaio fora já reprova, mesmo com o outro ainda em branco.
    if (d.rapida || d.lenta || d.estourouSoma) return "fora";
  }
  if (qtd === 1) return "incompleto";
  return semCriterio ? "sem_criterio" : "ok";
}

// Aferição salva antes das duas vazões guardava um resultado só
// (resultadoMl/erroPct): passa a ser lido como vazão rápida, lenta em branco.
function normalizarItem(item) {
  if (item.resultadoRapidaMl !== undefined || item.resultadoMl === undefined) return item;
  return {
    ...item,
    resultadoRapidaMl: item.resultadoMl,
    resultadoLentaMl: null,
    erroRapidaPct: item.erroPct ?? null,
    erroLentaPct: null,
  };
}

// O campo de mL é digitado sem sinal; o sinal vem dos botões Passou (+1) /
// Faltou (-1). Sem botão escolhido só o zero é resultado válido - um "60"
// sem dizer se passou ou faltou fica como vazio em vez de virar +60 calado.
function resultadoDoCampo(valorTexto, sinal) {
  const limpo = String(valorTexto ?? "").trim();
  if (!/^\d+$/.test(limpo)) return null;
  const n = Number(limpo);
  if (n === 0) return 0;
  if (sinal !== 1 && sinal !== -1) return null;
  return n * sinal;
}

function validarAfericao(afericao) {
  const erros = [];
  const avisos = [];
  if (!String(afericao.responsavel || "").trim()) erros.push("Informe o responsável pela aferição.");
  const semObs = afericao.itens.filter((i) => i.naoTestado && !String(i.observacao || "").trim());
  for (const i of semObs) erros.push(`Bico ${i.numero}: marcado como não testado - escreva o motivo na observação.`);
  const semNada = afericao.itens.filter((i) => !i.naoTestado && !temValor(i.resultadoRapidaMl) && !temValor(i.resultadoLentaMl));
  const soUma = afericao.itens.filter((i) => !i.naoTestado && temValor(i.resultadoRapidaMl) !== temValor(i.resultadoLentaMl));
  const lista = (itens) => itens.map((i) => i.numero).join(", ");
  if (semNada.length === 1) avisos.push(`O bico ${semNada[0].numero} está sem resultado.`);
  else if (semNada.length > 1) avisos.push(`${semNada.length} bicos estão sem resultado (${lista(semNada)}).`);
  if (soUma.length === 1) avisos.push(`O bico ${soUma[0].numero} tem só uma das duas vazões.`);
  else if (soUma.length > 1) avisos.push(`${soUma.length} bicos têm só uma das duas vazões (${lista(soUma)}).`);
  return { erros, avisos };
}

function resumirAfericao(itens) {
  const conta = (s) => itens.filter((i) => i.situacao === s).length;
  const ok = conta("ok");
  const fora = conta("fora");
  return {
    testados: ok + fora + conta("sem_criterio"),
    ok,
    fora,
    naoTestados: conta("nao_testado"),
    vazios: conta("vazio"),
    incompletos: conta("incompleto"),
  };
}

// Itens do rascunho a partir da lista de bicos. Bomba/produto são COPIADOS:
// se o bico mudar de produto depois, a aferição antiga continua certa.
function montarItens(bicos, volumePadraoL) {
  return bicos
    .filter((b) => b.ativo)
    .sort((a, b) => a.ordem - b.ordem)
    .map((b) => ({
      bicoId: b.id,
      numero: b.numero,
      bomba: b.bomba,
      produto: b.produto,
      volumeL: volumePadraoL,
      resultadoRapidaMl: null,
      resultadoLentaMl: null,
      naoTestado: false,
      observacao: "",
    }));
}

// Aferição pronta pra salvar: situação e erro % gravados em cada item com a
// tolerância do momento. Nunca recalcular isso depois ao exibir.
function congelarAfericao(rascunho, toleranciaMl) {
  const tolerancia = toleranciaMl === "" || toleranciaMl === undefined ? null : toleranciaMl;
  const itens = rascunho.itens.map((i) => ({
    bicoId: i.bicoId,
    numero: i.numero,
    bomba: i.bomba,
    produto: i.produto,
    volumeL: i.volumeL,
    resultadoRapidaMl: i.naoTestado ? null : i.resultadoRapidaMl ?? null,
    resultadoLentaMl: i.naoTestado ? null : i.resultadoLentaMl ?? null,
    naoTestado: !!i.naoTestado,
    observacao: String(i.observacao || "").trim(),
    situacao: classificarSituacao(i, tolerancia),
    erroRapidaPct: i.naoTestado ? null : calcularErroPct(i.resultadoRapidaMl, i.volumeL),
    erroLentaPct: i.naoTestado ? null : calcularErroPct(i.resultadoLentaMl, i.volumeL),
  }));
  const agora = new Date().toISOString();
  return {
    id: uuid(),
    dataHora: rascunho.dataHora || agora,
    responsavel: String(rascunho.responsavel || "").trim(),
    medidorPadrao: String(rascunho.medidorPadrao || "").trim(),
    observacao: String(rascunho.observacao || "").trim(),
    nomePosto: rascunho.nomePosto || "",
    toleranciaMl: tolerancia,
    itens,
    resumo: resumirAfericao(itens),
    criadoEm: agora,
  };
}

function validarBicos(bicos) {
  const erros = [];
  if (!bicos.length) erros.push("Cadastre pelo menos um bico.");
  const numeros = new Set();
  for (const b of bicos) {
    const rotulo = `Bico ${b.numero || "?"}`;
    if (!Number.isInteger(b.numero) || b.numero < 1) erros.push(`${rotulo}: número inválido.`);
    else if (numeros.has(b.numero)) erros.push(`${rotulo}: número repetido.`);
    numeros.add(b.numero);
    if (!Number.isInteger(b.bomba) || b.bomba < 1) erros.push(`${rotulo}: número da bomba inválido.`);
    if (!String(b.produto || "").trim()) erros.push(`${rotulo}: informe o produto.`);
  }
  return erros;
}

const SITUACAO_ROTULO = {
  ok: "Dentro da tolerância",
  fora: "Fora da tolerância",
  nao_testado: "Não testado",
  vazio: "Sem resultado",
  incompleto: "Falta uma vazão",
  sem_criterio: "Registrado",
};
