// Builds dist/ for GitHub Pages: the artifact page wrapped as a standalone document, plus what makes it an
// installable phone app (web app manifest, home-screen icons, and a service worker for offline use).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { deflateSync, crc32 } from "node:zlib";

const out = p => new URL("../dist/" + p, import.meta.url);
const page = readFileSync(new URL("../calorie-tracker.html", import.meta.url), "utf8");
const build = Date.now().toString(36);

const head = [
  `<meta charset="utf-8">`,
  `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`,
  `<meta name="theme-color" content="#2672c0">`,
  `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `<meta name="mobile-web-app-capable" content="yes">`,
  `<meta name="apple-mobile-web-app-title" content="Plate Count">`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="default">`,
  `<link rel="manifest" href="manifest.webmanifest">`,
  `<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">`,
  `<link rel="apple-touch-icon" href="icon-180.png">`,
  `<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}` +
    `body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>`,
  `<script>if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}))</script>`,
].join("");
const doc = `<!doctype html><html lang="en"><head>${head}</head><body>${page}</body></html>`;

const manifest = {
  name: "Plate Count",
  short_name: "Plate Count",
  description: "Calorie and fiber tracker with streaks and daily ratings.",
  start_url: "./",
  scope: "./",
  display: "standalone",
  orientation: "portrait",
  background_color: "#eef6fd",
  theme_color: "#2672c0",
  icons: [
    { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

// Offline: network first for the app itself (so updates show up), cached copy when offline.
const sw = `const CACHE = "platecount-${build}";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && (new URL(e.request.url).origin === location.origin || r.type === "cors")) {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
    }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match("./"))));
});
`;

// Icon: a white plate on the app's blue, drawn per pixel and encoded as PNG with zlib (no image library needed).
function iconPng(size, inset) {
  const rgba = Buffer.alloc(size * size * 4), c = size / 2, s = size * inset;
  const paint = (i, [r, g, b]) => { rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / s, i = (y * size + x) * 4;
    paint(i, d < 0.26 ? [226, 240, 252] : d < 0.30 ? [169, 212, 245] : d < 0.40 ? [255, 255, 255] : [38, 114, 192]);
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync(out(""), { recursive: true });
writeFileSync(out("index.html"), doc);
writeFileSync(out("manifest.webmanifest"), JSON.stringify(manifest, null, 2));
writeFileSync(out("sw.js"), sw);
writeFileSync(out("icon-180.png"), iconPng(180, 1));
writeFileSync(out("icon-192.png"), iconPng(192, 1));
writeFileSync(out("icon-512.png"), iconPng(512, 1));
writeFileSync(out("icon-512-maskable.png"), iconPng(512, 0.8)); // plate kept inside the maskable safe zone
console.log("Built dist/ (app, manifest, service worker, icons)");
