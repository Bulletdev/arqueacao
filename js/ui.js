// UI compartilhada - dialog de confirmação e toast, no lugar de confirm()/
// alert() nativos do navegador (quebravam a identidade visual do app).

const ICONE_BAIXAR = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></svg>`;

// Cápsula do tanque (cilindro deitado visto de lado) com o nível preenchido
// em dourado - mesma técnica de clip-path do ícone do app (segmento molhado),
// só que como cápsula em vez de círculo. fracao é 0..1 (cm digitado / cm
// máximo da tabela), não é litros - é a leitura física da régua mesmo.
function svgNivelTanque(id, fracao) {
  const f = Math.max(0, Math.min(1, fracao || 0));
  const topo = 6, base = 94, altura = base - topo;
  const linhaAgua = base - f * altura;
  return `<svg viewBox="0 0 220 100" class="tanque-nivel-svg" aria-hidden="true" focusable="false">
    <defs>
      <clipPath id="clip-nivel-${id}">
        <rect x="0" y="${linhaAgua.toFixed(1)}" width="220" height="${(base - linhaAgua + 10).toFixed(1)}"/>
      </clipPath>
    </defs>
    <rect x="${topo}" y="${topo}" width="208" height="88" rx="44" fill="var(--cor-acento)" clip-path="url(#clip-nivel-${id})"/>
    <rect x="${topo}" y="${topo}" width="208" height="88" rx="44" fill="none" stroke="var(--cor-texto-suave)" stroke-width="4" opacity="0.35"/>
  </svg>`;
}

function atualizarNivelTanque(tanqueId, fracao) {
  const el = document.getElementById(`nivel-${tanqueId}`);
  if (el) el.innerHTML = svgNivelTanque(tanqueId, fracao);
}

let _dialogConfirmacao = null;

function confirmarAcao(mensagem, { textoConfirmar = "Confirmar", perigo = false } = {}) {
  if (!_dialogConfirmacao) {
    _dialogConfirmacao = document.createElement("dialog");
    _dialogConfirmacao.className = "dialog-confirmacao";
    document.body.appendChild(_dialogConfirmacao);
  }
  return new Promise((resolve) => {
    _dialogConfirmacao.innerHTML = `
      <form method="dialog">
        <p>${mensagem}</p>
        <div class="acoes-dialog">
          <button type="button" class="btn btn-texto" data-resp="cancelar">Cancelar</button>
          <button type="submit" class="btn ${perigo ? "btn-perigo-solido" : "btn-primario"}" data-resp="confirmar">${textoConfirmar}</button>
        </div>
      </form>
    `;
    const fechar = (resp) => {
      _dialogConfirmacao.close();
      resolve(resp === "confirmar");
    };
    _dialogConfirmacao.querySelector('[data-resp="cancelar"]').onclick = () => fechar("cancelar");
    _dialogConfirmacao.querySelector("form").onsubmit = (ev) => {
      ev.preventDefault();
      fechar("confirmar");
    };
    _dialogConfirmacao.showModal();
  });
}

let _toastTimeout = null;

function mostrarToast(texto) {
  const el = document.getElementById("toast");
  if (!el) return;
  clearTimeout(_toastTimeout);
  el.textContent = texto;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("toast-visivel"));
  _toastTimeout = setTimeout(() => {
    el.classList.remove("toast-visivel");
    setTimeout(() => {
      el.hidden = true;
    }, 200);
  }, 3000);
}
