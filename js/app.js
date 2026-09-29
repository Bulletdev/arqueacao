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

  document.body.classList.toggle("com-barra-afericao", hash === "#/afericao");

  const matchDetalhe = hash.match(/^#\/fechamento\/(.+)$/);
  const matchAfericao = hash.match(/^#\/afericao\/(.+)$/);

  try {
    if (hash === "#/" || hash === "") {
      await renderConsulta(container);
    } else if (matchDetalhe) {
      await renderFechamentoDetalhe(container, decodeURIComponent(matchDetalhe[1]));
    } else if (hash === "#/afericao") {
      await renderAfericao(container);
    } else if (matchAfericao) {
      await renderAfericaoDetalhe(container, decodeURIComponent(matchAfericao[1]));
    } else if (hash === "#/historico") {
      await renderHistorico(container, "fechamentos");
    } else if (hash === "#/historico/afericoes") {
      await renderHistorico(container, "afericoes");
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
    const ativo =
      alvo === hash ||
      (alvo === "#/" && (hash === "" || hash.startsWith("#/fechamento"))) ||
      (alvo === "#/historico" && hash.startsWith("#/historico")) ||
      (alvo === "#/afericao" && hash.startsWith("#/afericao"));
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
      // Versão nova que terminou de instalar num carregamento anterior fica
      // em "waiting" e não dispara updatefound de novo - sem este check o
      // aviso nunca aparece e o usuário fica preso na versão velha do cache.
      if (reg.waiting && navigator.serviceWorker.controller) {
        mostrarBannerAtualizacao(reg);
      }
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

let _bannerAtualizacaoLigado = false;

function mostrarBannerAtualizacao(reg) {
  const banner = document.getElementById("banner-atualizacao");
  banner.hidden = false;
  if (_bannerAtualizacaoLigado) return;
  _bannerAtualizacaoLigado = true;
  document.getElementById("btn-atualizar").addEventListener("click", () => {
    if (reg.waiting) reg.waiting.postMessage({ tipo: "SKIP_WAITING" });
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload());
}

document.addEventListener("DOMContentLoaded", iniciar);
