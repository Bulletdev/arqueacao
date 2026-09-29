// Bicos do posto pré-carregados para a aferição (aba Aferição).
//
// PROVISÓRIO - aguardando a lista real do gerente (nº do bico, nº da bomba e
// produto de cada um; PRD-Multiposto-e-Afericao.md, pergunta 6). Distribuição
// de exemplo pra fechar os 30 bicos do pedido: 6 bombas de gasolina/etanol
// com 4 bicos e 2 bombas de diesel com 3 bicos. Depois da primeira abertura
// os bicos vivem no IndexedDB e são editados em Configurações > Bicos.

const TOLERANCIA_PADRAO_ML = 100; // por 20 L - confirmar com o gerente
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
