const CACHE_NAME = 'sudoku-v1';
// IMPORTANT: Add your repository name here too if not using a custom domain
const REPO_NAME = '/YOUR-REPO-NAME'; 

const ASSETS = [
  REPO_NAME + '/',
  REPO_NAME + '/index.html',
  REPO_NAME + '/style.css',
  REPO_NAME + '/js/app.js',
  REPO_NAME + '/manifest.json',
  REPO_NAME + '/icons/icon-192.png',
  REPO_NAME + '/icons/icon-512.png'
];

// Install Event: Cache files
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch Event: Serve from cache if available, else fetch from network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});