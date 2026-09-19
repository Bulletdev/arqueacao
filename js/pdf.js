// RF-05 - relatório PDF do fechamento, gerado 100% no cliente com jsPDF.

function gerarPdfFechamento(fechamento, config) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const nomePosto = config.nomePosto || "Posto";
  doc.setFontSize(16);
  doc.text(nomePosto, 14, 18);
  doc.setFontSize(11);
  doc.text("Relatório de fechamento - Arqueação de tanques", 14, 25);

  doc.setFontSize(10);
  doc.text(`Data/hora do fechamento: ${formatDataHora(fechamento.dataHora)}`, 14, 33);
  doc.text(`Operador: ${fechamento.operador || "-"}`, 14, 39);
  if (fechamento.observacao) {
    doc.text(`Observação: ${fechamento.observacao}`, 14, 45);
  }

  const linhasCorpo = fechamento.leituras.map((l) => [
    l.tanqueNome || l.tanqueId,
    l.produto,
    formatNumero(l.cm) + " cm",
    formatLitros(l.litros),
  ]);

  const totaisPorProduto = calcularTotaisPorProduto(fechamento.leituras);
  const linhasRodape = Object.entries(totaisPorProduto).map(([produto, litros]) => [
    "", `Total ${produto}`, "", formatLitros(litros),
  ]);
  linhasRodape.push(["", "TOTAL GERAL", "", formatLitros(fechamento.totalLitros)]);

  doc.autoTable({
    startY: fechamento.observacao ? 50 : 44,
    head: [["Tanque", "Produto", "Medida", "Volume"]],
    body: linhasCorpo,
    foot: linhasRodape,
    theme: "grid",
    headStyles: { fillColor: [30, 64, 90] },
    footStyles: { fillColor: [235, 238, 240], textColor: [20, 20, 20], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 2.5 },
  });

  const finalY = doc.lastAutoTable.finalY || 60;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Gerado pelo app de arqueação em ${formatDataHora(new Date().toISOString())}`,
    14,
    Math.max(finalY + 10, 280)
  );

  return doc;
}

function calcularTotaisPorProduto(leituras) {
  const totais = {};
  for (const l of leituras) {
    totais[l.produto] = (totais[l.produto] || 0) + l.litros;
  }
  return totais;
}

function nomeArquivoFechamento(fechamento, ext) {
  const d = new Date(fechamento.dataHora);
  const pad = (n) => String(n).padStart(2, "0");
  const carimbo = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `fechamento-${carimbo}.${ext}`;
}
