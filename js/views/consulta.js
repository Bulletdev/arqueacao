// RF-01 (consulta) + RF-03 (salvar fechamento) - tela inicial.

async function renderConsulta(container) {
  const [tanques, tabelas, config, fechamentos] = await Promise.all([
    DB.getTanquesOrdenados(),
    DB.getAll("tabelas"),
    DB.getConfig(),
    DB.getFechamentosOrdenados(),
  ]);
  const tabelasPorId = Object.fromEntries(tabelas.map((t) => [t.id, t]));
  const ultimoFechamento = fechamentos[0];

  container.innerHTML = `
    <section class="tela tela-consulta">
      <h1>Consulta rápida</h1>
      <p class="subtitulo">Digite a medida da régua em centímetros.</p>
      ${
        ultimoFechamento
          ? `<a href="#/fechamento/${ultimoFechamento.id}" class="item-historico item-ultimo-fechamento">
              <div class="item-historico-principal">
                <strong>Último fechamento</strong>
                <span>${formatTempoRelativo(ultimoFechamento.dataHora)} · ${escapeHtml(ultimoFechamento.operador || "-")}</span>
              </div>
              <div class="item-historico-fim">
                <div class="item-historico-total">${formatLitros(ultimoFechamento.totalLitros)}</div>
                <svg class="item-historico-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
              </div>
            </a>`
          : ""
      }
      <div class="campos-tanques">
        ${tanques
          .map(
            (t) => `
          <div class="campo-tanque" data-tanque-id="${t.id}">
            <label for="cm-${t.id}">${t.produto} <span class="nome-tanque">${escapeHtml(t.nome)}</span></label>
            <div class="tanque-nivel" id="nivel-${t.id}">${svgNivelTanque(t.id, 0)}</div>
            <div class="linha-campo">
              <input
                id="cm-${t.id}"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                placeholder="cm"
                autocomplete="off"
              />
              <span class="resultado" id="resultado-${t.id}">-</span>
            </div>
          </div>`
          )
          .join("")}
      </div>

      <div class="total-parcial" id="total-parcial" hidden>Total: -</div>

      <div class="acoes-consulta">
        <button id="btn-limpar" class="btn btn-texto">Limpar</button>
        <button id="btn-salvar-fechamento" class="btn btn-primario">Salvar fechamento</button>
      </div>

      <div id="erro-consulta" class="alerta alerta-erro" hidden></div>
    </section>

    <dialog id="dialog-fechamento" class="dialog-fechamento">
      <form method="dialog" id="form-fechamento">
        <h2>Confirmar fechamento</h2>
        <label class="campo">
          Data/hora
          <input type="datetime-local" id="fechamento-datahora" required />
        </label>
        <label class="campo">
          Operador
          <input type="text" id="fechamento-operador" placeholder="Nome do operador" required />
        </label>
        <label class="campo">
          Observação (opcional)
          <textarea id="fechamento-observacao" rows="2"></textarea>
        </label>
        <div class="resumo-fechamento" id="resumo-fechamento"></div>
        <div class="acoes-dialog">
          <button type="button" id="btn-cancelar-fechamento" class="btn btn-texto">Cancelar</button>
          <button type="submit" class="btn btn-primario">Salvar</button>
        </div>
      </form>
    </dialog>
  `;

  function lerLeituras() {
    const leituras = [];
    let algumaForaDaTabela = false;
    for (const t of tanques) {
      const input = document.getElementById(`cm-${t.id}`);
      const resultadoEl = document.getElementById(`resultado-${t.id}`);
      const campoEl = document.querySelector(`.campo-tanque[data-tanque-id="${t.id}"]`);
      const valor = input.value.trim();
      const tabela = tabelasPorId[t.tabelaId];
      const maxCm = tabela ? tabela.linhas.length : 0;
      const cmNum = Number(valor);
      const fracaoNivel = valor !== "" && Number.isFinite(cmNum) && maxCm > 0 ? cmNum / maxCm : 0;
      atualizarNivelTanque(t.id, fracaoNivel);
      if (valor === "") {
        resultadoEl.textContent = "-";
        resultadoEl.classList.remove("resultado-erro");
        campoEl.classList.remove("campo-tanque-ok", "campo-tanque-erro");
        continue;
      }
      const litros = tabela ? converterCmParaLitros(tabela, valor) : FORA_DA_TABELA;
      if (litros === FORA_DA_TABELA || litros === null) {
        resultadoEl.textContent = "Fora da tabela";
        resultadoEl.classList.add("resultado-erro");
        campoEl.classList.remove("campo-tanque-ok");
        campoEl.classList.add("campo-tanque-erro");
        algumaForaDaTabela = true;
      } else {
        resultadoEl.textContent = formatLitros(litros);
        resultadoEl.classList.remove("resultado-erro");
        campoEl.classList.remove("campo-tanque-erro");
        campoEl.classList.add("campo-tanque-ok");
        leituras.push({
          tanqueId: t.id,
          tanqueNome: t.nome,
          produto: t.produto,
          cm: Number(valor),
          litros,
        });
      }
    }
    const totalParcialEl = document.getElementById("total-parcial");
    if (leituras.length === 0) {
      totalParcialEl.hidden = true;
    } else {
      const totalParcial = leituras.reduce((s, l) => s + l.litros, 0);
      totalParcialEl.textContent = `Total: ${formatLitros(totalParcial)}`;
      totalParcialEl.hidden = false;
    }
    return { leituras, algumaForaDaTabela };
  }

  container.querySelectorAll('.campo-tanque input').forEach((input) => {
    input.addEventListener("input", () => lerLeituras());
  });

  document.getElementById("btn-limpar").addEventListener("click", () => {
    container.querySelectorAll(".campo-tanque input").forEach((i) => (i.value = ""));
    lerLeituras();
  });

  const erroEl = document.getElementById("erro-consulta");
  const dialog = document.getElementById("dialog-fechamento");

  document.getElementById("btn-salvar-fechamento").addEventListener("click", async () => {
    const { leituras, algumaForaDaTabela } = lerLeituras();
    erroEl.hidden = true;
    if (algumaForaDaTabela) {
      erroEl.textContent = "Existe medida fora da tabela. Corrija antes de salvar.";
      erroEl.hidden = false;
      return;
    }
    if (leituras.length === 0) {
      erroEl.textContent = "Digite ao menos uma medida antes de salvar.";
      erroEl.hidden = false;
      return;
    }
    const totalLitros = leituras.reduce((s, l) => s + l.litros, 0);
    document.getElementById("fechamento-datahora").value = isoParaDatetimeLocal(new Date().toISOString());
    document.getElementById("fechamento-operador").value = config.ultimoOperador || "";
    document.getElementById("fechamento-observacao").value = "";
    document.getElementById("resumo-fechamento").innerHTML = `
      <div class="lista-leituras">
        ${leituras
          .map(
            (l) => `
          <div class="linha-leitura">
            <div class="linha-leitura-rotulo">
              <strong>${l.produto}</strong>
              <span>${formatNumero(l.cm)} cm</span>
            </div>
            <div class="linha-leitura-valor">${formatLitros(l.litros)}</div>
          </div>`
          )
          .join("")}
      </div>
      <div class="lista-totais">
        <div class="linha-total-geral"><span>Total</span><span>${formatLitros(totalLitros)}</span></div>
      </div>
    `;
    dialog.showModal();

    const form = document.getElementById("form-fechamento");
    const onSubmit = async (ev) => {
      ev.preventDefault();
      const operador = document.getElementById("fechamento-operador").value.trim();
      if (!operador) return;
      const fechamento = {
        id: uuid(),
        dataHora: datetimeLocalParaIso(document.getElementById("fechamento-datahora").value),
        operador,
        observacao: document.getElementById("fechamento-observacao").value.trim() || undefined,
        leituras,
        totalLitros,
        criadoEm: new Date().toISOString(),
      };
      await DB.put("fechamentos", fechamento);
      await DB.setConfig({ ultimoOperador: operador });
      dialog.close();
      form.removeEventListener("submit", onSubmit);
      navegarPara(`#/fechamento/${fechamento.id}`);
    };
    form.addEventListener("submit", onSubmit);

    document.getElementById("btn-cancelar-fechamento").onclick = () => {
      dialog.close();
      form.removeEventListener("submit", onSubmit);
    };
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
