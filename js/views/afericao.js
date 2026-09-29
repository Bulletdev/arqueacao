// RF-B2/RF-B3 - aba Aferição: nova aferição de bicos (ou retoma o rascunho).
// Toda conta (resultado com sinal, situação, erro %, validação) vem de
// js/afericao.js; aqui só tem DOM e persistência do rascunho.

const ATRASO_SALVAR_RASCUNHO_AFERICAO_MS = 300;
let _rascunhoPendente = null;
let _timerRascunho = null;

function agendarSalvarRascunho(rascunho) {
  _rascunhoPendente = rascunho;
  clearTimeout(_timerRascunho);
  _timerRascunho = setTimeout(salvarRascunhoAgora, ATRASO_SALVAR_RASCUNHO_AFERICAO_MS);
}

function salvarRascunhoAgora() {
  clearTimeout(_timerRascunho);
  _timerRascunho = null;
  if (!_rascunhoPendente) return Promise.resolve();
  const r = _rascunhoPendente;
  _rascunhoPendente = null;
  return DB.salvarRascunhoAfericao({ ...r, atualizadoEm: new Date().toISOString() });
}

function cancelarRascunhoPendente() {
  clearTimeout(_timerRascunho);
  _timerRascunho = null;
  _rascunhoPendente = null;
}

// Celular trocando de app / tela apagando: grava na hora, sem esperar o
// debounce (é quando uma ligação ou o navegador fechando levaria o preenchido).
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") salvarRascunhoAgora();
});
window.addEventListener("pagehide", () => salvarRascunhoAgora());

function novoRascunho(bicos, config) {
  return {
    dataHora: new Date().toISOString(),
    responsavel: config.ultimoResponsavel || "",
    medidorPadrao: config.ultimoMedidor || "",
    observacao: "",
    itens: montarItens(bicos, config.volumePadraoL || VOLUME_PADRAO_TESTE_L).map((i) => ({ ...i, sinal: null, valorTexto: "" })),
    criadoEm: new Date().toISOString(),
  };
}

function textoTolerancia(config) {
  if (config.toleranciaMl === null || config.toleranciaMl === undefined || config.toleranciaMl === "") {
    return "Sem tolerância configurada - os resultados só são registrados.";
  }
  return `Tolerância: ±${formatNumero(config.toleranciaMl)} mL em 20 L (${formatPct((config.toleranciaMl / 20000) * 100).replace("+", "")}).`;
}

async function renderAfericao(container) {
  const config = await DB.getConfig();
  let rascunho = await DB.getRascunhoAfericao();
  const retomado = !!rascunho;
  if (!rascunho) {
    const bicos = await DB.getBicosOrdenados();
    rascunho = novoRascunho(bicos, config);
  }
  const tolerancia = config.toleranciaMl;

  const grupos = [];
  rascunho.itens.forEach((item, idx) => {
    let g = grupos[grupos.length - 1];
    if (!g || g.bomba !== item.bomba) {
      g = { bomba: item.bomba, itens: [] };
      grupos.push(g);
    }
    g.itens.push({ item, idx });
  });

  container.innerHTML = `
    <section class="tela tela-afericao">
      <h1>Nova aferição</h1>
      <p class="subtitulo">${escapeHtml(textoTolerancia(config))}</p>

      ${
        retomado
          ? `<div class="aviso-rascunho">
              <p class="alerta alerta-info">Continuando o rascunho${rascunho.atualizadoEm ? " salvo " + formatTempoRelativo(rascunho.atualizadoEm) : ""}.</p>
              <button type="button" id="btn-descartar-rascunho" class="btn btn-texto">Descartar e começar outra</button>
            </div>`
          : ""
      }

      <div class="cartao cabecalho-afericao">
        <div class="grade-campos">
          <label class="campo">
            Data e hora
            <input type="datetime-local" id="af-data" value="${isoParaDatetimeLocal(rascunho.dataHora)}" />
          </label>
          <label class="campo">
            Responsável
            <input type="text" id="af-responsavel" value="${escapeHtml(rascunho.responsavel)}" placeholder="Quem fez a aferição" autocomplete="name" />
          </label>
          <label class="campo">
            Medidor padrão (nº / lacre)
            <input type="text" id="af-medidor" value="${escapeHtml(rascunho.medidorPadrao)}" placeholder="Opcional" />
          </label>
          <label class="campo">
            Observação geral
            <input type="text" id="af-observacao" value="${escapeHtml(rascunho.observacao)}" placeholder="Opcional" />
          </label>
        </div>
      </div>

      <div id="erros-afericao" class="alerta alerta-erro" hidden></div>

      ${
        rascunho.itens.length === 0
          ? `<div class="estado-vazio"><p>Nenhum bico ativo cadastrado. Cadastre os bicos em Configurações.</p><a class="btn btn-primario" href="#/config">Ir para Configurações</a></div>`
          : grupos
              .map(
                (g) => `
        <h2 class="titulo-bomba">Bomba ${g.bomba}</h2>
        ${g.itens.map(({ item, idx }) => htmlCartaoBico(item, idx)).join("")}`
              )
              .join("")
      }
    </section>

    <div class="barra-afericao">
      <div class="barra-afericao-conteudo">
        <div>
          <div class="progresso-texto" id="progresso-texto"></div>
          <div class="barra-progresso"><div id="progresso-barra" style="width:0%"></div></div>
        </div>
        <button type="button" id="btn-salvar-afericao" class="btn btn-primario">Salvar aferição</button>
      </div>
    </div>
  `;

  function atualizarCartao(idx) {
    const item = rascunho.itens[idx];
    const el = document.getElementById(`bico-${idx}`);
    if (!el) return;
    item.resultadoMl = item.naoTestado ? null : resultadoDoCampo(item.valorTexto, item.sinal);
    const situacao = classificarSituacao(item, tolerancia);
    el.className = `cartao-bico situacao-${situacao}`;

    el.querySelectorAll(".btn-sinal").forEach((b) => {
      b.setAttribute("aria-pressed", String(Number(b.dataset.sinal) === item.sinal));
      b.disabled = item.naoTestado;
    });
    el.querySelector('[data-campo="valor"]').disabled = item.naoTestado;
    el.querySelector('[data-campo="volume"]').disabled = item.naoTestado;
    el.querySelector('[data-campo="obs"]').placeholder = item.naoTestado ? "Motivo (obrigatório)" : "Observação (opcional)";

    const selo = el.querySelector("[data-selo]");
    const classesSelo = { ok: "selo-ok", fora: "selo-fora", nao_testado: "selo-neutro", sem_criterio: "selo-neutro" };
    selo.hidden = situacao === "vazio";
    selo.className = `selo ${classesSelo[situacao] || ""}`;
    selo.textContent = SITUACAO_ROTULO[situacao] || "";

    const leitura = el.querySelector("[data-erro]");
    const valorDigitado = String(item.valorTexto || "").trim();
    if (item.naoTestado) {
      leitura.innerHTML = "";
    } else if (item.resultadoMl !== null) {
      leitura.innerHTML = `<span class="valor-erro">${formatMl(item.resultadoMl)} · ${formatPct(calcularErroPct(item.resultadoMl, item.volumeL))}</span>`;
    } else if (/^\d+$/.test(valorDigitado) && !item.sinal) {
      leitura.innerHTML = `<span class="dica-sinal">Toque em Passou ou Faltou</span>`;
    } else if (valorDigitado) {
      leitura.innerHTML = `<span class="dica-sinal">Digite só números (mL inteiros)</span>`;
    } else {
      leitura.innerHTML = "";
    }
  }

  function atualizarBarra() {
    const total = rascunho.itens.length;
    const preenchidos = rascunho.itens.filter((i) => i.naoTestado || i.resultadoMl !== null).length;
    const fora = rascunho.itens.filter((i) => classificarSituacao(i, tolerancia) === "fora").length;
    document.getElementById("progresso-texto").innerHTML =
      `${preenchidos} de ${total} bicos` + (fora ? ` · <span class="fora">${fora} fora</span>` : "");
    document.getElementById("progresso-barra").style.width = total ? `${(preenchidos / total) * 100}%` : "0%";
  }

  rascunho.itens.forEach((_, idx) => atualizarCartao(idx));
  atualizarBarra();

  function mudou(idx) {
    if (idx !== undefined) atualizarCartao(idx);
    atualizarBarra();
    agendarSalvarRascunho(rascunho);
  }

  // Cabeçalho
  const ligarCabecalho = (id, campo, transformar = (v) => v) => {
    document.getElementById(id).addEventListener("input", (ev) => {
      rascunho[campo] = transformar(ev.target.value);
      mudou();
    });
  };
  ligarCabecalho("af-data", "dataHora", (v) => (v ? datetimeLocalParaIso(v) : new Date().toISOString()));
  ligarCabecalho("af-responsavel", "responsavel");
  ligarCabecalho("af-medidor", "medidorPadrao");
  ligarCabecalho("af-observacao", "observacao");

  // Cartões (delegação de evento - 30 cartões, um listener só)
  const tela = container.querySelector(".tela-afericao");
  tela.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn-sinal");
    if (!btn) return;
    const idx = Number(btn.closest(".cartao-bico").dataset.idx);
    const item = rascunho.itens[idx];
    const sinal = Number(btn.dataset.sinal);
    item.sinal = item.sinal === sinal ? null : sinal;
    mudou(idx);
    if (item.sinal && !String(item.valorTexto || "").trim()) {
      document.querySelector(`#bico-${idx} [data-campo="valor"]`).focus();
    }
  });
  tela.addEventListener("input", (ev) => {
    const cartao = ev.target.closest(".cartao-bico");
    if (!cartao) return;
    const idx = Number(cartao.dataset.idx);
    const item = rascunho.itens[idx];
    const campo = ev.target.dataset.campo;
    if (campo === "valor") {
      item.valorTexto = ev.target.value;
    } else if (campo === "volume") {
      const v = Number(String(ev.target.value).replace(",", "."));
      if (v > 0) item.volumeL = v;
    } else if (campo === "obs") {
      item.observacao = ev.target.value;
    } else if (campo === "nao-testado") {
      item.naoTestado = ev.target.checked;
      if (item.naoTestado) cartao.querySelector('[data-campo="obs"]').focus();
    } else {
      return;
    }
    mudou(idx);
  });

  const btnDescartar = document.getElementById("btn-descartar-rascunho");
  if (btnDescartar) {
    btnDescartar.addEventListener("click", async () => {
      const ok = await confirmarAcao("Descartar o rascunho atual? O que foi preenchido nele será perdido.", {
        textoConfirmar: "Descartar",
        perigo: true,
      });
      if (!ok) return;
      cancelarRascunhoPendente();
      await DB.descartarRascunhoAfericao();
      renderAfericao(container);
    });
  }

  document.getElementById("btn-salvar-afericao").addEventListener("click", async () => {
    const errosEl = document.getElementById("erros-afericao");
    const { erros, avisos } = validarAfericao(rascunho);
    if (erros.length) {
      errosEl.innerHTML = `<strong>Antes de salvar:</strong><ul class="lista-erros">${erros.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>`;
      errosEl.hidden = false;
      errosEl.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    errosEl.hidden = true;
    if (avisos.length) {
      const ok = await confirmarAcao(`${escapeHtml(avisos.join(" "))} Eles vão aparecer como "sem resultado" no relatório. Salvar assim mesmo?`, {
        textoConfirmar: "Salvar assim",
      });
      if (!ok) return;
    }
    const configAtual = await DB.getConfig();
    const afericao = congelarAfericao({ ...rascunho, nomePosto: configAtual.nomePosto }, configAtual.toleranciaMl);
    cancelarRascunhoPendente();
    await DB.put("afericoes", afericao);
    await DB.descartarRascunhoAfericao();
    await DB.setConfig({ ultimoResponsavel: afericao.responsavel, ultimoMedidor: afericao.medidorPadrao });
    mostrarToast("Aferição salva.");
    navegarPara(`#/afericao/${afericao.id}`);
  });
}

function htmlCartaoBico(item, idx) {
  const nomeProduto = PRODUTOS_NOMES[item.produto] ? ` · ${PRODUTOS_NOMES[item.produto]}` : "";
  return `
    <div class="cartao-bico" id="bico-${idx}" data-idx="${idx}">
      <div class="cartao-bico-topo">
        <div class="cartao-bico-nome">
          <strong>Bico ${String(item.numero).padStart(2, "0")}</strong>
          <span>${escapeHtml(item.produto)}${escapeHtml(nomeProduto)}</span>
        </div>
        <span class="selo" data-selo hidden></span>
      </div>
      <div class="linha-entrada">
      <div class="linha-medida">
        <label class="campo-ml">
          <input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-campo="valor"
                 value="${escapeHtml(item.valorTexto || "")}" placeholder="0" aria-label="Bico ${item.numero}: diferença em mL" />
          <span>mL</span>
        </label>
        <label class="campo-volume">
          <span>teste de</span>
          <input type="text" inputmode="decimal" data-campo="volume" value="${formatNumero(item.volumeL)}" aria-label="Bico ${item.numero}: volume do teste em litros" />
          <span>L</span>
        </label>
      </div>
      <div class="grupo-sinal" role="group" aria-label="Bico ${item.numero}: passou ou faltou">
        <button type="button" class="btn-sinal sinal-menos" data-sinal="-1" aria-pressed="false">- Faltou</button>
        <button type="button" class="btn-sinal sinal-mais" data-sinal="1" aria-pressed="false">+ Passou</button>
      </div>
      </div>
      <div class="linha-leitura-bico" data-erro></div>
      <div class="linha-obs">
        <input type="text" data-campo="obs" value="${escapeHtml(item.observacao || "")}" aria-label="Bico ${item.numero}: observação" />
        <label class="check-nao-testado">
          <input type="checkbox" data-campo="nao-testado" ${item.naoTestado ? "checked" : ""} />
          Não testado
        </label>
      </div>
    </div>`;
}
