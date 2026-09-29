// RF-B4/B5/B6 - detalhe de uma aferição salva: resumo, itens, PDF,
// compartilhar, copiar texto, excluir. Os valores exibidos são os
// congelados no salvamento - nada é recalculado aqui.

async function renderAfericaoDetalhe(container, id) {
  const salva = await DB.get("afericoes", id);
  if (!salva) {
    container.innerHTML = `<section class="tela"><a href="#/historico/afericoes" class="link-voltar">‹ Aferições salvas</a><p class="alerta alerta-erro">Aferição não encontrada.</p></section>`;
    return;
  }
  const afericao = { ...salva, itens: salva.itens.map(normalizarItem) };
  const r = afericao.resumo || resumirAfericao(afericao.itens);
  const tol = afericao.toleranciaMl === null ? "sem tolerância" : `±${formatNumero(afericao.toleranciaMl)} mL em 20 L`;

  container.innerHTML = `
    <section class="tela">
      <a href="#/historico/afericoes" class="link-voltar">‹ Aferições salvas</a>
      <h1>Aferição de ${formatDataHora(afericao.dataHora)}</h1>
      <p class="meta-afericao">Responsável: <strong>${escapeHtml(afericao.responsavel || "-")}</strong></p>
      ${afericao.medidorPadrao ? `<p class="meta-afericao">Medidor padrão: <strong>${escapeHtml(afericao.medidorPadrao)}</strong></p>` : ""}
      <p class="meta-afericao">Tolerância usada: <strong>${tol}</strong></p>
      ${afericao.observacao ? `<p class="observacao">${escapeHtml(afericao.observacao)}</p>` : ""}

      <div class="resumo-chips">
        <span class="selo selo-neutro">${r.testados} testados</span>
        <span class="selo selo-ok">${r.ok} dentro</span>
        ${r.fora ? `<span class="selo selo-fora">${r.fora} fora</span>` : ""}
        ${r.naoTestados ? `<span class="selo selo-neutro">${r.naoTestados} não testados</span>` : ""}
        ${r.incompletos ? `<span class="selo selo-alerta">${r.incompletos} com uma vazão só</span>` : ""}
        ${r.vazios ? `<span class="selo selo-alerta">${r.vazios} sem resultado</span>` : ""}
      </div>

      <div class="acoes-detalhe">
        <button id="btn-compartilhar" class="btn btn-primario">Compartilhar PDF</button>
        <button id="btn-baixar" class="btn btn-secundario btn-com-icone">${ICONE_BAIXAR} Baixar PDF</button>
        <button id="btn-copiar" class="btn btn-secundario">Copiar resumo</button>
      </div>

      <div class="cartao" style="margin-top:16px">
        ${afericao.itens
          .map(
            (i) => `
          <div class="linha-item ${i.situacao === "fora" ? "fora" : ""}">
            <div class="linha-item-rotulo"><strong>Bico ${String(i.numero).padStart(2, "0")}</strong><span>${escapeHtml(i.produto)} · bomba ${i.bomba}</span></div>
            <div class="linha-item-valor ${i.situacao === "fora" ? "fora" : ""}">
              ${
                i.naoTestado
                  ? "Não testado"
                  : VAZOES.map((v) => {
                      const ml = v === "rapida" ? i.resultadoRapidaMl : i.resultadoLentaMl;
                      const pct = v === "rapida" ? i.erroRapidaPct : i.erroLentaPct;
                      return `<div><small>${v === "rapida" ? "Rápida" : "Lenta"}</small> ${ml === null || ml === undefined ? "-" : `${formatMl(ml)} <small>(${formatPct(pct)})</small>`}</div>`;
                    }).join("")
              }
            </div>
            ${i.observacao ? `<div class="linha-item-obs">${escapeHtml(i.observacao)}</div>` : ""}
          </div>`
          )
          .join("")}
      </div>

      <div class="acoes-detalhe-perigo">
        <button id="btn-excluir" class="btn btn-perigo">Excluir aferição</button>
      </div>
    </section>
  `;

  const pdfBlob = () => gerarPdfAfericao(afericao).output("blob");

  document.getElementById("btn-compartilhar").addEventListener("click", async () => {
    const res = await compartilharArquivo(pdfBlob(), nomeArquivoAfericao(afericao, "pdf"), "application/pdf", "Aferição de bicos");
    if (res.modo === "download") mostrarToast("Este navegador não compartilha arquivos - o PDF foi baixado.");
  });
  document.getElementById("btn-baixar").addEventListener("click", () => {
    baixarBlob(pdfBlob(), nomeArquivoAfericao(afericao, "pdf"));
  });
  document.getElementById("btn-copiar").addEventListener("click", async () => {
    const ok = await copiarTexto(textoResumoAfericao(afericao));
    mostrarToast(ok ? "Resumo copiado. Cole no WhatsApp." : "Não foi possível copiar.");
  });
  document.getElementById("btn-excluir").addEventListener("click", async () => {
    const ok = await confirmarAcao("Excluir esta aferição? Não dá pra desfazer.", { textoConfirmar: "Excluir", perigo: true });
    if (!ok) return;
    await DB.delete("afericoes", afericao.id);
    mostrarToast("Aferição excluída.");
    navegarPara("#/historico/afericoes");
  });
}
