// RF-04 - histórico de fechamentos, com filtro por período.

async function renderHistorico(container) {
  const todos = await DB.getFechamentosOrdenados();

  container.innerHTML = `
    <section class="tela tela-historico">
      <h1>Histórico</h1>
      <div class="filtros-historico">
        <select id="filtro-periodo">
          <option value="todos">Todos</option>
          <option value="hoje">Hoje</option>
          <option value="7dias">Últimos 7 dias</option>
          <option value="mes">Este mês</option>
        </select>
        <button id="btn-excel-historico" class="btn btn-secundario">Exportar mês (Excel)</button>
      </div>
      <ul class="lista-historico" id="lista-historico"></ul>
      <div id="historico-vazio" class="estado-vazio" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
        <p>Nenhum fechamento salvo ainda.</p>
      </div>
    </section>
  `;

  const lista = document.getElementById("lista-historico");
  const vazio = document.getElementById("historico-vazio");

  function dentroDoPeriodo(fechamento, periodo) {
    const d = new Date(fechamento.dataHora);
    const agora = new Date();
    if (periodo === "todos") return true;
    if (periodo === "hoje") {
      return d.toDateString() === agora.toDateString();
    }
    if (periodo === "7dias") {
      const seteDias = 7 * 24 * 60 * 60 * 1000;
      return agora - d <= seteDias && d <= agora;
    }
    if (periodo === "mes") {
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    }
    return true;
  }

  function render() {
    const periodo = document.getElementById("filtro-periodo").value;
    const filtrados = todos.filter((f) => dentroDoPeriodo(f, periodo));
    vazio.hidden = filtrados.length > 0;
    lista.innerHTML = filtrados
      .map(
        (f) => `
      <li>
        <a href="#/fechamento/${f.id}" class="item-historico">
          <div class="item-historico-principal">
            <strong>${formatDataHora(f.dataHora)}</strong>
            <span>${escapeHtml(f.operador || "-")}</span>
          </div>
          <div class="item-historico-fim">
            <div class="item-historico-total">${formatLitros(f.totalLitros)}</div>
            <svg class="item-historico-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
          </div>
        </a>
      </li>`
      )
      .join("");
  }

  document.getElementById("filtro-periodo").addEventListener("change", render);
  document.getElementById("btn-excel-historico").addEventListener("click", () => {
    const periodo = document.getElementById("filtro-periodo").value;
    const filtrados = todos.filter((f) => dentroDoPeriodo(f, periodo === "todos" ? "mes" : periodo));
    if (filtrados.length === 0) {
      mostrarToast("Nenhum fechamento no período selecionado para exportar.");
      return;
    }
    const wb = gerarExcelHistorico(filtrados);
    baixarWorkbook(wb, `historico-arqueacao-${Date.now()}.xlsx`);
  });

  render();
}
