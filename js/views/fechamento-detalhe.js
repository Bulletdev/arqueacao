// Detalhe de um fechamento - RF-05/06/07 (PDF, Excel, compartilhar, copiar texto).

async function renderFechamentoDetalhe(container, id) {
  const [fechamento, config] = await Promise.all([DB.get("fechamentos", id), DB.getConfig()]);

  if (!fechamento) {
    container.innerHTML = `<section class="tela"><p>Fechamento não encontrado.</p><a href="#/historico">Voltar ao histórico</a></section>`;
    return;
  }

  const totaisPorProduto = calcularTotaisPorProduto(fechamento.leituras);

  container.innerHTML = `
    <section class="tela tela-detalhe">
      <a href="#/historico" class="link-voltar">← Histórico</a>
      <h1>Fechamento de ${formatDataHora(fechamento.dataHora)}</h1>
      <p class="subtitulo">Operador: ${escapeHtml(fechamento.operador || "-")}</p>
      ${fechamento.observacao ? `<p class="observacao">${escapeHtml(fechamento.observacao)}</p>` : ""}

      <div class="lista-leituras">
        ${fechamento.leituras
          .map(
            (l) => `
          <div class="linha-leitura">
            <div class="linha-leitura-rotulo">
              <strong>${escapeHtml(l.tanqueNome || l.tanqueId)}</strong>
              <span>${l.produto} · ${formatNumero(l.cm)} cm</span>
            </div>
            <div class="linha-leitura-valor">${formatLitros(l.litros)}</div>
          </div>`
          )
          .join("")}
      </div>

      <div class="lista-totais">
        ${Object.entries(totaisPorProduto)
          .map(([p, litros]) => `<div class="linha-total-produto"><span>Total ${p}</span><span>${formatLitros(litros)}</span></div>`)
          .join("")}
        <div class="linha-total-geral"><span>TOTAL GERAL</span><span>${formatLitros(fechamento.totalLitros)}</span></div>
      </div>

      <div class="acoes-detalhe">
        <button id="btn-pdf" class="btn btn-secundario btn-com-icone">${ICONE_BAIXAR}PDF</button>
        <button id="btn-excel" class="btn btn-secundario btn-com-icone">${ICONE_BAIXAR}Excel</button>
        <button id="btn-compartilhar" class="btn btn-primario">Compartilhar</button>
        <button id="btn-copiar-texto" class="btn btn-texto">Copiar resumo como texto</button>
      </div>
      <div class="acoes-detalhe-perigo">
        <button id="btn-excluir" class="btn btn-perigo">Excluir fechamento</button>
      </div>
    </section>
  `;

  document.getElementById("btn-pdf").addEventListener("click", () => {
    const doc = gerarPdfFechamento(fechamento, config);
    doc.save(nomeArquivoFechamento(fechamento, "pdf"));
  });

  document.getElementById("btn-excel").addEventListener("click", () => {
    const wb = gerarExcelFechamento(fechamento);
    baixarWorkbook(wb, nomeArquivoFechamento(fechamento, "xlsx"));
  });

  document.getElementById("btn-compartilhar").addEventListener("click", async () => {
    const doc = gerarPdfFechamento(fechamento, config);
    const blob = doc.output("blob");
    const nome = nomeArquivoFechamento(fechamento, "pdf");
    const resultado = await compartilharArquivo(blob, nome, "application/pdf", "Fechamento de arqueação");
    if (resultado.modo === "download") {
      mostrarToast("Compartilhamento direto não disponível aqui - o PDF foi baixado. Anexe o arquivo no WhatsApp.");
    } else if (resultado.modo === "share") {
      mostrarToast("Compartilhado.");
    }
  });

  document.getElementById("btn-copiar-texto").addEventListener("click", async () => {
    const ok = await copiarTexto(textoResumoFechamento(fechamento));
    mostrarToast(ok ? "Resumo copiado - cole no WhatsApp." : "Não foi possível copiar automaticamente.");
  });

  document.getElementById("btn-excluir").addEventListener("click", async () => {
    const confirmou = await confirmarAcao("Excluir este fechamento? Essa ação não pode ser desfeita.", {
      textoConfirmar: "Excluir",
      perigo: true,
    });
    if (!confirmou) return;
    await DB.delete("fechamentos", id);
    navegarPara("#/historico");
  });
}
