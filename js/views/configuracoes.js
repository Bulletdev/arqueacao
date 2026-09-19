// RF-08 - posto/operador, tanques (associar tabela), tabelas de arqueação,
// backup/restore.

async function renderConfiguracoes(container) {
  const [config, tanques, tabelas] = await Promise.all([
    DB.getConfig(),
    DB.getTanquesOrdenados(),
    DB.getAll("tabelas"),
  ]);
  const tabelasPorId = Object.fromEntries(tabelas.map((t) => [t.id, t]));

  container.innerHTML = `
    <section class="tela tela-config">
      <h1>Configurações</h1>

      <details class="config-bloco">
        <summary>Posto e operador</summary>
        <label class="campo">
          Nome do posto
          <input type="text" id="cfg-nome-posto" value="${escapeHtml(config?.nomePosto || "")}" placeholder="Ex: Posto Exemplo" />
        </label>
        <label class="campo">
          Operador padrão
          <input type="text" id="cfg-operador-padrao" value="${escapeHtml(config?.ultimoOperador || "")}" />
        </label>
        <button id="btn-salvar-posto" class="btn btn-primario">Salvar</button>
      </details>

      <details class="config-bloco">
        <summary>Tanques</summary>
        <p class="ajuda">A tabela usada por cada tanque é configuração, não código - troque aqui sem alterar fechamentos já salvos.</p>
        <div class="lista-tanques-config">
          ${tanques
            .map(
              (t) => `
            <div class="linha-tanque-config">
              <div class="linha-tanque-config-nome">
                <strong>${escapeHtml(t.nome)}</strong>
                <span class="nome-tanque">${t.produto}</span>
              </div>
              <select data-tanque-id="${t.id}" class="select-tabela-tanque">
                ${tabelas
                  .map(
                    (tb) =>
                      `<option value="${tb.id}" ${tb.id === t.tabelaId ? "selected" : ""}>${escapeHtml(tb.nome)}</option>`
                  )
                  .join("")}
              </select>
            </div>`
            )
            .join("")}
        </div>
      </details>

      <details class="config-bloco">
        <summary>Tabelas de arqueação</summary>
        <div id="lista-tabelas">
          ${tabelas
            .map(
              (t) => `
            <div class="cartao-tabela">
              <div class="cartao-tabela-cabecalho">
                <strong>${escapeHtml(t.nome)}</strong>
                ${t.verificado ? '<span class="selo selo-ok">Conferida</span>' : '<span class="selo selo-alerta">Não conferida - validar com o gerente</span>'}
              </div>
              <p class="ajuda">${t.linhas.length} medidas (1 a ${t.linhas.length} cm). ${escapeHtml(t.origem || "")}</p>
              <button class="btn btn-texto btn-editar-tabela" data-tabela-id="${t.id}">Colar / substituir valores</button>
            </div>`
            )
            .join("")}
        </div>
      </details>

      <details class="config-bloco">
        <summary>Backup</summary>
        <p class="ajuda">Os dados ficam só neste aparelho (IndexedDB). Limpar os dados do navegador apaga o histórico - exporte um backup de vez em quando.</p>
        <div class="acoes-backup">
          <button id="btn-exportar-backup" class="btn btn-secundario">Exportar backup (JSON)</button>
          <label class="btn btn-secundario btn-arquivo">
            Importar backup
            <input type="file" id="input-importar-backup" accept="application/json" hidden />
          </label>
        </div>
      </details>

      <div class="assinatura-wrap">
        <a href="https://www.michaelbullet.dev/links" target="_blank" rel="noopener noreferrer"
           class="assinatura" aria-label="Desenvolvido por Bullet - michaelbullet.dev">
          <span class="assinatura-texto">Desenvolvido por</span>
          <img src="assets/bullet-logo.png" alt="" width="80" height="32" class="assinatura-logo" />
        </a>
      </div>
    </section>

    <dialog id="dialog-editar-tabela" class="dialog-tabela">
      <form method="dialog" id="form-editar-tabela">
        <h2 id="titulo-editar-tabela">Colar valores da tabela</h2>
        <p class="ajuda">Cole duas colunas separadas por ; ou tab, uma medida por linha: <code>1;4</code>, começando em cm=1, sem pular nenhuma medida.</p>
        <textarea id="texto-tabela" rows="10" placeholder="1;4&#10;2;12&#10;3;22..."></textarea>
        <div id="erro-tabela" class="alerta alerta-erro" hidden></div>
        <div class="acoes-dialog">
          <button type="button" id="btn-cancelar-tabela" class="btn btn-texto">Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar tabela</button>
        </div>
      </form>
    </dialog>
  `;

  document.getElementById("btn-salvar-posto").addEventListener("click", async () => {
    await DB.setConfig({
      nomePosto: document.getElementById("cfg-nome-posto").value.trim(),
      ultimoOperador: document.getElementById("cfg-operador-padrao").value.trim(),
    });
    mostrarToast("Salvo.");
  });

  container.querySelectorAll(".select-tabela-tanque").forEach((select) => {
    select.addEventListener("change", async () => {
      const tanqueId = select.dataset.tanqueId;
      const tanque = tanques.find((t) => t.id === tanqueId);
      tanque.tabelaId = select.value;
      await DB.put("tanques", tanque);
    });
  });

  const dialogTabela = document.getElementById("dialog-editar-tabela");
  container.querySelectorAll(".btn-editar-tabela").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabelaId = btn.dataset.tabelaId;
      const tabela = tabelasPorId[tabelaId];
      document.getElementById("titulo-editar-tabela").textContent = `Editar - ${tabela.nome}`;
      document.getElementById("texto-tabela").value = tabela.linhas
        .map((litros, i) => `${i + 1};${litros}`)
        .join("\n");
      document.getElementById("erro-tabela").hidden = true;
      dialogTabela.dataset.tabelaId = tabelaId;
      dialogTabela.showModal();
    });
  });

  document.getElementById("btn-cancelar-tabela").addEventListener("click", () => dialogTabela.close());

  document.getElementById("form-editar-tabela").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const erroEl = document.getElementById("erro-tabela");
    erroEl.hidden = true;
    try {
      const linhas = parseTabelaTexto(document.getElementById("texto-tabela").value);
      const problema = tabelaValida(linhas);
      if (problema) throw new Error(problema);
      const tabelaId = dialogTabela.dataset.tabelaId;
      const tabela = tabelasPorId[tabelaId];
      tabela.linhas = linhas;
      tabela.verificado = true;
      tabela.origem = "Editada manualmente em Configurações";
      await DB.put("tabelas", tabela);
      dialogTabela.close();
      renderConfiguracoes(container);
    } catch (err) {
      erroEl.textContent = err.message;
      erroEl.hidden = false;
    }
  });

  document.getElementById("btn-exportar-backup").addEventListener("click", async () => {
    const backup = await DB.exportarBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    baixarBlob(blob, `backup-arqueacao-${Date.now()}.json`);
  });

  document.getElementById("input-importar-backup").addEventListener("change", async (ev) => {
    const arquivo = ev.target.files[0];
    if (!arquivo) return;
    try {
      const texto = await arquivo.text();
      const backup = JSON.parse(texto);
      const confirmou = await confirmarAcao(
        "Importar este backup vai substituir todos os dados atuais. Continuar?",
        { textoConfirmar: "Importar", perigo: true }
      );
      if (!confirmou) return;
      await DB.importarBackup(backup);
      mostrarToast("Backup importado. Recarregando...");
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      mostrarToast("Erro ao importar: " + err.message);
    }
  });
}
