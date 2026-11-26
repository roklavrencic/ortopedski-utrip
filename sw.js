/* Ortopedski utrip – service worker (omogoča namestitev; podatki se vedno berejo sveži) */
const CACHE = "ou-v4";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./icon-32.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)).catch(() => {}); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./index.html"))));
});

/* potisna obvestila o novih objavah */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: e.data ? e.data.text() : "" }; }
  const title = d.title || "Nova objava";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "Ortopedski utrip",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: d.id || undefined,
    lang: "sl",
    data: { url: d.url || "./" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const c of list) {
      if (c.url.startsWith(self.registration.scope) && "focus" in c) {
        c.postMessage({ type: "open-post", url });
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
self.addEventListener("pushsubscriptionchange", e => {
  e.waitUntil(self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: e.oldSubscription && e.oldSubscription.options.applicationServerKey })
    .then(sub => { const j = sub.toJSON();
      return fetch("https://ipxuyqyjhkapbfhayrja.supabase.co/rest/v1/rpc/add_push_sub", { method: "POST",
        headers: { apikey: "sb_publishable_gwnWGtdrOERUL-TD4jPgyQ_-Igq5hkO", "Content-Type": "application/json" },
        body: JSON.stringify({ p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth }) }); })
    .catch(() => {}));
});
