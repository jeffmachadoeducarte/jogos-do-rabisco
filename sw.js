// Service worker do app Jogos do Rabisco: abre rápido e continua funcionando sem internet.
// Páginas e código: busca na rede primeiro (pega a versão nova) e usa a cópia guardada se estiver sem internet.
// Vozes, imagens e fontes: usa a cópia guardada primeiro (não mudam) e só baixa o que falta.
const VERSAO = "rabisco-v6-dois-jogos";
const ESSENCIAIS = ["./", "./index.html", "./src/app.js", "./src/style.css", "./src/catalogo.js", "./vendor/three.module.min.js", "./manifest.webmanifest", "./assets/app/icone-192.png"];

self.addEventListener("install", (e) => {
  // se alguma cópia falhar, instala mesmo assim (apaga a cópia antiga)
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESSENCIAIS)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const CODIGO = /\.(html|js|css|json|webmanifest)$|\/$/;
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") return; // a página é sempre pedida à rede
  const url = new URL(req.url);
  const mesmoSite = url.origin === self.location.origin;
  const fonte = url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if (!mesmoSite && !fonte) return;
  if (mesmoSite && CODIGO.test(url.pathname)) {
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req).then((guardado) => guardado || fetch(req).then((r) => {
    if (r.ok || r.type === "opaque") { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
    return r;
  })));
});
