// RF-08 - posto/operador, tanques (associar tabela), tabelas de arqueação,
// aferição (tolerância, volume, bicos - RF-B7), backup/restore.

async function renderConfiguracoes(container) {
  const [config, tanques, tabelas, bicos] = await Promise.all([
    DB.getConfig(),
    DB.getTanquesOrdenados(),
    DB.getAll("tabelas"),
    DB.getBicosOrdenados(),
  ]);
  const bicosEditando = bicos.map((b) => ({ ...b }));
  const tolTexto = config.toleranciaMl === null || config.toleranciaMl === undefined ? "" : String(config.toleranciaMl);
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
        <summary>Aferição</summary>
        <label class="campo">
          Tolerância (mL em 20 L)
          <input type="text" inputmode="numeric" id="cfg-tolerancia" value="${escapeHtml(tolTexto)}" placeholder="Em branco = só registrar" />
        </label>
        <p class="ajuda">Usada pra marcar cada bico como dentro/fora. Padrão: ±100 mL (±0,5%), erro máximo admitido pelo Inmetro nas verificações e inspeções (Portaria nº 227/2022, item 3.1.2). Vale só para as próximas aferições - as já salvas guardam a tolerância da época.</p>
        <label class="campo">
          Volume padrão do teste (L)
          <input type="text" inputmode="decimal" id="cfg-volume" value="${formatNumero(config.volumePadraoL || VOLUME_PADRAO_TESTE_L)}" />
        </label>
        <div id="erro-afericao-cfg" class="alerta alerta-erro" hidden></div>
        <button id="btn-salvar-afericao-cfg" class="btn btn-primario">Salvar</button>
      </details>

      <details class="config-bloco">
        <summary>Bicos (${bicos.filter((b) => b.ativo).length} ativos)</summary>
        <p class="ajuda">Mudanças valem para a próxima aferição. Se houver um rascunho aberto, descarte-o na aba Aferição para usar a lista nova.</p>
        <div style="overflow-x:auto">
          <table class="tabela-bicos">
            <thead><tr><th class="col-num">Bico</th><th class="col-num">Bomba</th><th>Produto</th><th class="col-ativo">Ativo</th><th class="col-acao"></th></tr></thead>
            <tbody id="corpo-bicos"></tbody>
          </table>
        </div>
        <datalist id="lista-produtos">${Object.entries(PRODUTOS_NOMES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</datalist>
        <div id="erro-bicos" class="alerta alerta-erro" hidden></div>
        <div class="acoes-bicos">
          <button id="btn-add-bico" class="btn btn-secundario">+ Adicionar bico</button>
          <button id="btn-salvar-bicos" class="btn btn-primario">Salvar bicos</button>
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

  ligarConfigAfericao(container, bicosEditando);

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

// Blocos "Aferição" e "Bicos" (RF-B7).
function ligarConfigAfericao(container, editando) {
  const corpo = document.getElementById("corpo-bicos");
  function renderBicos() {
    corpo.innerHTML = editando
      .map(
        (b, i) => `
      <tr data-i="${i}">
        <td><input type="number" min="1" data-f="numero" value="${b.numero ?? ""}" aria-label="Número do bico" /></td>
        <td><input type="number" min="1" data-f="bomba" value="${b.bomba ?? ""}" aria-label="Número da bomba" /></td>
        <td><input type="text" list="lista-produtos" data-f="produto" value="${escapeHtml(b.produto || "")}" aria-label="Produto" /></td>
        <td class="col-ativo"><input type="checkbox" data-f="ativo" ${b.ativo ? "checked" : ""} aria-label="Ativo" /></td>
        <td><button type="button" class="btn-icone" data-remover="${i}" aria-label="Remover bico">✕</button></td>
      </tr>`
      )
      .join("");
  }
  renderBicos();

  corpo.addEventListener("input", (ev) => {
    const tr = ev.target.closest("tr");
    const b = editando[Number(tr.dataset.i)];
    const f = ev.target.dataset.f;
    if (f === "ativo") b.ativo = ev.target.checked;
    else if (f === "produto") b.produto = ev.target.value.trim().toUpperCase();
    else b[f] = ev.target.value === "" ? null : Number(ev.target.value);
  });
  corpo.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-remover]");
    if (!btn) return;
    editando.splice(Number(btn.dataset.remover), 1);
    renderBicos();
  });

  document.getElementById("btn-add-bico").addEventListener("click", () => {
    const ultimo = editando[editando.length - 1];
    const numero = editando.reduce((m, b) => Math.max(m, b.numero || 0), 0) + 1;
    editando.push({ id: `b${Date.now().toString(36)}`, numero, bomba: ultimo ? ultimo.bomba : 1, produto: "", ativo: true });
    renderBicos();
    corpo.querySelector("tr:last-child [data-f='produto']").focus();
  });

  document.getElementById("btn-salvar-bicos").addEventListener("click", async () => {
    const erroEl = document.getElementById("erro-bicos");
    const erros = validarBicos(editando);
    if (erros.length) {
      erroEl.innerHTML = `<ul class="lista-erros">${erros.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`;
      erroEl.hidden = false;
      return;
    }
    erroEl.hidden = true;
    // ordem física = bomba, depois número do bico
    const ordenados = [...editando]
      .sort((a, b) => a.bomba - b.bomba || a.numero - b.numero)
      .map((b, i) => ({ ...b, ordem: i + 1 }));
    await DB.clear("bicos");
    await DB.putMany("bicos", ordenados);
    mostrarToast("Bicos salvos.");
    renderConfiguracoes(container);
  });

  document.getElementById("btn-salvar-afericao-cfg").addEventListener("click", async () => {
    const erroEl = document.getElementById("erro-afericao-cfg");
    const tolBruta = document.getElementById("cfg-tolerancia").value.trim();
    const volume = Number(document.getElementById("cfg-volume").value.trim().replace(",", "."));
    const tolerancia = tolBruta === "" ? null : Number(tolBruta);
    if (tolerancia !== null && !(Number.isFinite(tolerancia) && tolerancia >= 0)) {
      erroEl.textContent = "Tolerância inválida - use um número de mL (ex.: 100) ou deixe em branco.";
      erroEl.hidden = false;
      return;
    }
    if (!(volume > 0)) {
      erroEl.textContent = "Volume padrão inválido (ex.: 20).";
      erroEl.hidden = false;
      return;
    }
    erroEl.hidden = true;
    await DB.setConfig({ toleranciaMl: tolerancia, volumePadraoL: volume });
    mostrarToast("Salvo.");
  });
}
