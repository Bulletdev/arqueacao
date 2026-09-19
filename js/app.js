// Bootstrap + roteador (hash router simples, sem framework).

const CONTAINER = () => document.getElementById("app");

const INICIO_CARREGAMENTO = Date.now();
const DURACAO_MINIMA_CARREGAMENTO = 1500;

function navegarPara(hash) {
  if (location.hash === hash) {
    roteador();
  } else {
    location.hash = hash;
  }
}

async function roteador() {
  const hash = location.hash || "#/";
  const container = CONTAINER();
  marcarNavAtiva(hash);

  const matchDetalhe = hash.match(/^#\/fechamento\/(.+)$/);

  try {
    if (hash === "#/" || hash === "") {
      await renderConsulta(container);
    } else if (matchDetalhe) {
      await renderFechamentoDetalhe(container, decodeURIComponent(matchDetalhe[1]));
    } else if (hash === "#/historico") {
      await renderHistorico(container);
    } else if (hash === "#/config") {
      await renderConfiguracoes(container);
    } else {
      await renderConsulta(container);
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<section class="tela"><p class="alerta alerta-erro">Erro ao carregar a tela: ${err.message}</p></section>`;
  }
}

function marcarNavAtiva(hash) {
  document.querySelectorAll(".nav-link").forEach((a) => {
    const alvo = a.getAttribute("href");
    const ativo = alvo === hash || (alvo === "#/" && (hash === "" || hash.startsWith("#/fechamento")));
    a.classList.toggle("ativo", ativo);
  });
}

async function iniciar() {
  try {
    await DB.seedSeNecessario();
    window.addEventListener("hashchange", roteador);
    await roteador();
  } finally {
    const decorrido = Date.now() - INICIO_CARREGAMENTO;
    setTimeout(esconderTelaCarregamento, Math.max(0, DURACAO_MINIMA_CARREGAMENTO - decorrido));
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const novoWorker = reg.installing;
        novoWorker.addEventListener("statechange", () => {
          if (novoWorker.state === "installed" && navigator.serviceWorker.controller) {
            mostrarBannerAtualizacao(reg);
          }
        });
      });
    }).catch((err) => console.warn("SW falhou ao registrar:", err));
  }
}

function esconderTelaCarregamento() {
  const el = document.getElementById("tela-carregamento");
  if (!el) return;
  el.classList.add("tela-carregamento-escondida");
  setTimeout(() => {
    el.hidden = true;
  }, 250);
}

function mostrarBannerAtualizacao(reg) {
  const banner = document.getElementById("banner-atualizacao");
  banner.hidden = false;
  document.getElementById("btn-atualizar").addEventListener("click", () => {
    if (reg.waiting) reg.waiting.postMessage({ tipo: "SKIP_WAITING" });
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
}

document.addEventListener("DOMContentLoaded", iniciar);
