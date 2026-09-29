// Bicos do posto pré-carregados para a aferição (aba Aferição).
//
// PROVISÓRIO - aguardando a lista real do gerente (nº do bico, nº da bomba e
// produto de cada um; PRD-Multiposto-e-Afericao.md, pergunta 6). Distribuição
// de exemplo pra fechar os 30 bicos do pedido: 6 bombas de gasolina/etanol
// com 4 bicos e 2 bombas de diesel com 3 bicos. Depois da primeira abertura
// os bicos vivem no IndexedDB e são editados em Configurações > Bicos.

// ±0,5% = ±100 mL em 20 L: erro máximo admissível nas verificações
// subsequentes e inspeção, item 3.1.2 do RTM aprovado pela Portaria Inmetro
// nº 227/2022 (vigente desde 01/07/2022). A tabela "60 mL a menos / 100 mL a
// mais" que ainda circula em notícias é da Portaria 294/2018 e foi substituída.
const TOLERANCIA_PADRAO_ML = 100;
const VOLUME_PADRAO_TESTE_L = 20;

const BICOS_PADRAO = (() => {
  const bicos = [];
  let numero = 1;
  const add = (bomba, produto) => {
    bicos.push({ id: `b${String(numero).padStart(2, "0")}`, numero, bomba, produto, ordem: numero, ativo: true });
    numero++;
  };
  for (let bomba = 1; bomba <= 6; bomba++) ["GC", "GA", "AC", "AA"].forEach((p) => add(bomba, p));
  for (let bomba = 7; bomba <= 8; bomba++) ["S10", "S10", "S500"].forEach((p) => add(bomba, p));
  return bicos;
})();
