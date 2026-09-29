// RF-B5/B6 - PDF e texto de WhatsApp da aferição de bicos (jsPDF, 100% no cliente).
// Paisagem: são 8 colunas (a observação precisa de espaço).

function gerarPdfAfericao(afericao) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const larguraPagina = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.text(afericao.nomePosto || "Posto", 14, 16);
  doc.setFontSize(11);
  doc.text("Relatório de aferição de bicos", 14, 23);

  doc.setFontSize(10);
  const tol =
    afericao.toleranciaMl === null
      ? "sem tolerância configurada"
      : `±${formatNumero(afericao.toleranciaMl)} mL em 20 L`;
  const linhasCab = [
    `Data/hora: ${formatDataHora(afericao.dataHora)}`,
    `Responsável: ${afericao.responsavel || "-"}`,
    `Medidor padrão: ${afericao.medidorPadrao || "-"}`,
    `Tolerância: ${tol}`,
  ];
  doc.text(linhasCab[0] + "    " + linhasCab[1], 14, 31);
  doc.text(linhasCab[2] + "    " + linhasCab[3], 14, 37);
  let y = 43;
  if (afericao.observacao) {
    doc.text(doc.splitTextToSize(`Observação: ${afericao.observacao}`, larguraPagina - 28), 14, y);
    y += 6;
  }

  const corpo = afericao.itens.map((i) => [
    String(i.bomba),
    String(i.numero).padStart(2, "0"),
    i.produto,
    i.naoTestado ? "-" : formatNumero(i.volumeL),
    i.naoTestado ? "-" : formatMl(i.resultadoMl),
    i.naoTestado ? "-" : formatPct(i.erroPct),
    SITUACAO_ROTULO[i.situacao] || "",
    i.observacao || "",
  ]);

  doc.autoTable({
    startY: y,
    head: [["Bomba", "Bico", "Produto", "Volume (L)", "Resultado", "Erro (%)", "Situação", "Observação"]],
    body: corpo,
    theme: "grid",
    headStyles: { fillColor: [0, 25, 54] },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { halign: "center", cellWidth: 16 },
      1: { halign: "center", cellWidth: 14 },
      2: { cellWidth: 20 },
      3: { halign: "right", cellWidth: 22 },
      4: { halign: "right", cellWidth: 24 },
      5: { halign: "right", cellWidth: 20 },
      6: { cellWidth: 38 },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const item = afericao.itens[data.row.index];
      if (item.situacao === "fora") {
        data.cell.styles.fillColor = [252, 232, 230];
        data.cell.styles.textColor = [150, 30, 24];
        if (data.column.index >= 4 && data.column.index <= 6) data.cell.styles.fontStyle = "bold";
      } else if (item.situacao === "nao_testado" || item.situacao === "vazio") {
        data.cell.styles.textColor = [110, 110, 110];
      }
    },
  });

  const r = afericao.resumo || resumirAfericao(afericao.itens);
  let yFim = doc.lastAutoTable.finalY + 8;
  if (yFim > 170) {
    doc.addPage();
    yFim = 20;
  }
  doc.setFontSize(10);
  doc.text(
    `Resumo: ${r.testados} testados · ${r.ok} dentro da tolerância · ${r.fora} fora · ${r.naoTestados} não testados · ${r.vazios} sem resultado`,
    14,
    yFim
  );

  const yAss = yFim + 22;
  doc.setDrawColor(120);
  doc.line(14, yAss, 110, yAss);
  doc.line(160, yAss, 256, yAss);
  doc.setFontSize(9);
  doc.text("Responsável pela aferição", 14, yAss + 5);
  doc.text("Gerente", 160, yAss + 5);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Gerado pelo app de aferição em ${formatDataHora(new Date().toISOString())}`, 14, 200);

  return doc;
}

function nomeArquivoAfericao(afericao, ext) {
  const d = new Date(afericao.dataHora);
  const pad = (n) => String(n).padStart(2, "0");
  const carimbo = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `afericao-${carimbo}.${ext}`;
}

// Texto curto pro WhatsApp: destaca só o que precisa de atenção.
function textoResumoAfericao(afericao) {
  const r = afericao.resumo || resumirAfericao(afericao.itens);
  const linhas = [
    `Aferição ${formatDataHora(afericao.dataHora)} - ${afericao.nomePosto || "Posto"}`,
    `Responsável: ${afericao.responsavel || "-"}`,
    `${r.testados} bicos testados · ${r.ok} ok · ${r.fora} fora da tolerância`,
  ];
  const fora = afericao.itens.filter((i) => i.situacao === "fora");
  if (fora.length) {
    linhas.push("", "Fora da tolerância:");
    for (const i of fora) {
      linhas.push(`- Bico ${i.numero} (${i.produto}, bomba ${i.bomba}): ${formatMl(i.resultadoMl)} em ${formatNumero(i.volumeL)} L${i.observacao ? " - " + i.observacao : ""}`);
    }
  }
  const nao = afericao.itens.filter((i) => i.situacao === "nao_testado");
  if (nao.length) {
    linhas.push("", "Não testados:");
    for (const i of nao) linhas.push(`- Bico ${i.numero} (${i.produto}): ${i.observacao}`);
  }
  if (r.vazios) linhas.push("", `${r.vazios} bico(s) sem resultado.`);
  return linhas.join("\n");
}
