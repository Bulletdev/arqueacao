// RF-06 - relatório Excel (.xlsx) via SheetJS. Um fechamento, ou o
// histórico completo (uma linha por tanque por fechamento).

function gerarExcelFechamento(fechamento) {
  const linhas = fechamento.leituras.map((l) => ({
    Tanque: l.tanqueNome || l.tanqueId,
    Produto: l.produto,
    "Medida (cm)": l.cm,
    "Volume (L)": l.litros,
  }));
  linhas.push({ Tanque: "", Produto: "", "Medida (cm)": "TOTAL", "Volume (L)": fechamento.totalLitros });

  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fechamento");
  return wb;
}

function gerarExcelHistorico(fechamentos) {
  const linhas = [];
  for (const f of fechamentos) {
    for (const l of f.leituras) {
      linhas.push({
        "Data/hora": formatDataHora(f.dataHora),
        Operador: f.operador || "",
        Tanque: l.tanqueNome || l.tanqueId,
        Produto: l.produto,
        "Medida (cm)": l.cm,
        "Volume (L)": l.litros,
      });
    }
  }
  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Histórico");
  return wb;
}

function baixarWorkbook(wb, nomeArquivo) {
  XLSX.writeFile(wb, nomeArquivo);
}
