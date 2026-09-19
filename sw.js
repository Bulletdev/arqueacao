// RF-09 - cache-first, 100% offline após a primeira abertura.
// Suba a versão sempre que mudar qualquer arquivo da lista abaixo.
const CACHE_VERSION = "arqueacao-v14";

const ARQUIVOS_PARA_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/tables-data.js",
  "./js/format.js",
  "./js/conversion.js",
  "./js/db.js",
  "./js/ui.js",
  "./js/pdf.js",
  "./js/excel.js",
  "./js/share.js",
  "./js/views/consulta.js",
  "./js/views/fechamento-detalhe.js",
  "./js/views/historico.js",
  "./js/views/configuracoes.js",
  "./js/app.js",
  "./vendor/jspdf.umd.min.js",
  "./vendor/jspdf.plugin.autotable.min.js",
  "./vendor/xlsx.full.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./assets/bullet-logo.png",
  "./assets/posto-logo.png",
];

self.addEventListener("install", (event) => {
  // Sem skipWaiting() automático aqui: numa instalação nova (sem SW
  // anterior controlando a página) o navegador já ativa direto, sem
  // esperar. Numa ATUALIZAÇÃO (já existe um SW ativo), isso é o que faz o
  // novo worker ficar em "waiting" até o usuário clicar em "Recarregar",
  // pois se pular a espera aqui o banner de atualização nunca teria motivo
  // pra aparecer (o app.js só mostra o banner quando
  // statechange==="installed" E já existe um controller).
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.tipo === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Cache-first para tudo (app estático); atualiza o cache em segundo plano
// quando a rede responder, para a próxima visita já vir com a versão nova.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      const buscaRede = fetch(event.request)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.ok) {
            const clone = respostaRede.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return respostaRede;
        })
        .catch(() => respostaCache);

      return respostaCache || buscaRede;
    })
  );
});
