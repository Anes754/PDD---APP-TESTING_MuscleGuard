const CACHE_NAME = "muscleguard-v11";

const APP_SHELL_FILES = [
  "./",
  "index.html",
  "login.html",
  "register.html",
  "onboarding.html",
  "dashboard.html",
  "workouts.html",
  "results.html",
  "plan.html",
  "chat.html",
  "coach-dashboard.html",
  "client-progress.html",
  "css/style.css",
  "js/api.js",
  "manifest.json",
  "icons/app-icon.svg",
];

function pathnameToHtml(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "index.html";
  const last = parts[parts.length - 1];
  if (last.endsWith(".html")) return last;
  return `${last}.html`;
}

async function offlineHtml(pathname) {
  const file = pathnameToHtml(pathname);
  return (
    (await caches.match(file)) ||
    (await caches.match(`/${file}`)) ||
    (await caches.match("index.html")) ||
    new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL_FILES).catch(() => Promise.resolve())
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())))
    )
  );
  self.clients.claim();
});

// Network-first for ALL requests — always try to get fresh content
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const accept = event.request.headers.get("accept") || "";
  const isHtml =
    event.request.mode === "navigate" ||
    accept.includes("text/html");

  if (isHtml) {
    event.respondWith(
      fetch(event.request.url, {
        method: "GET",
        credentials: "same-origin",
        redirect: "follow",
      })
        .then((response) => {
          if (response && response.ok) return response;
          return offlineHtml(url.pathname);
        })
        .catch(() => offlineHtml(url.pathname))
    );
    return;
  }

  // Network-first for CSS, JS, and other assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
