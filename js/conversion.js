// RF-02 - busca direta na tabela (sem fórmula, sem interpolação por padrão).

const FORA_DA_TABELA = Symbol("fora-da-tabela");

// `tabela` é um registro do formato de TABLES_DATA (tem `.linhas`, array
// onde o índice 0 corresponde a cm=1).
function converterCmParaLitros(tabela, cm) {
  if (cm === null || cm === undefined || cm === "") return null;
  const n = Number(cm);
  if (!Number.isInteger(n)) return FORA_DA_TABELA;
  if (n === 0) return 0;
  if (n < 0) return FORA_DA_TABELA;
  const idx = n - 1;
  if (idx < 0 || idx >= tabela.linhas.length) return FORA_DA_TABELA;
  return tabela.linhas[idx];
}

function tabelaValida(linhas) {
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return "A tabela precisa ter pelo menos uma linha.";
  }
  for (let i = 0; i < linhas.length; i++) {
    if (!Number.isFinite(linhas[i]) || linhas[i] < 0) {
      return `Litros inválido na linha cm=${i + 1}.`;
    }
    if (i > 0 && linhas[i] < linhas[i - 1]) {
      return `Litros deve ser crescente (cm=${i + 1} é menor que cm=${i}).`;
    }
  }
  return null;
}

// Texto colado no formato "cm;litros" (uma linha por medida), como pedido
// pela RF-08. Aceita separador ; , ou tab. Preenche buracos faltando? Não:
// exige cm contíguo a partir de 1 (validação simples e previsível).
function parseTabelaTexto(texto) {
  const linhasTexto = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const pares = [];
  for (const linha of linhasTexto) {
    const partes = linha.split(/[;,\t]/).map((p) => p.trim().replace(",", "."));
    if (partes.length < 2) continue;
    const cm = parseInt(partes[0], 10);
    const litros = parseFloat(partes[1]);
    if (Number.isFinite(cm) && Number.isFinite(litros)) {
      pares.push({ cm, litros: Math.round(litros) });
    }
  }
  if (pares.length === 0) throw new Error("Nenhuma linha reconhecida. Use o formato cm;litros, uma medida por linha.");
  pares.sort((a, b) => a.cm - b.cm);
  const cmMin = pares[0].cm;
  if (cmMin !== 1) throw new Error(`A tabela precisa começar em cm=1 (começou em cm=${cmMin}).`);
  for (let i = 0; i < pares.length; i++) {
    if (pares[i].cm !== i + 1) {
      throw new Error(`Falta a medida cm=${i + 1} na tabela colada (sem buracos permitido).`);
    }
  }
  return pares.map((p) => p.litros);
}
