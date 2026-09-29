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

function classificarSituacao(item, toleranciaMl) {
  if (item.naoTestado) return "nao_testado";
  if (item.resultadoMl === null || item.resultadoMl === undefined) return "vazio";
  if (toleranciaMl === null || toleranciaMl === undefined || toleranciaMl === "") return "sem_criterio";
  return Math.abs(item.resultadoMl) <= limiteToleranciaMl(Number(toleranciaMl), item.volumeL) ? "ok" : "fora";
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
  const vazios = afericao.itens.filter((i) => !i.naoTestado && (i.resultadoMl === null || i.resultadoMl === undefined));
  if (vazios.length === 1) avisos.push(`O bico ${vazios[0].numero} está sem resultado.`);
  else if (vazios.length > 1) avisos.push(`${vazios.length} bicos estão sem resultado (${vazios.map((i) => i.numero).join(", ")}).`);
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
      resultadoMl: null,
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
    resultadoMl: i.naoTestado ? null : i.resultadoMl,
    naoTestado: !!i.naoTestado,
    observacao: String(i.observacao || "").trim(),
    situacao: classificarSituacao(i, tolerancia),
    erroPct: i.naoTestado ? null : calcularErroPct(i.resultadoMl, i.volumeL),
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
  sem_criterio: "Registrado",
};
