import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages project site (skyewalker3.github.io/Bingo_App/), not a
  // custom domain or user/org page — update if the hosting target changes.
  base: '/Bingo_App/',
  plugins: [
    react(),
    VitePWA({
      // autoUpdate (not the default 'prompt') so a caller reopening the app
      // mid-session always gets the latest build without a manual "reload
      // to update" step getting in the way during a live game.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico'],
      manifest: {
        name: "Bingo Caller's Board",
        short_name: 'Bingo Caller',
        description: "Offline-capable bingo caller's tracker and card scanner",
        // Matches src/index.css's --bg / --panel so the splash screen and
        // browser chrome don't flash a mismatched color before paint.
        theme_color: '#1b2a2f',
        background_color: '#1b2a2f',
        display: 'standalone',
        start_url: '/Bingo_App/',
        scope: '/Bingo_App/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the app shell (JS/CSS/HTML/icons) at install time —
        // the ~14MB self-hosted Tesseract worker/core/language files are
        // deliberately NOT precached here (see runtimeCaching below); most
        // installs will never open the scanner, so forcing that download
        // upfront would be a poor tradeoff for an offline-first PWA.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Excluded from precache, not just left to the (2 MiB default) size
        // limit: these are large, scanner-only, and already covered by the
        // runtimeCaching rule below — see the comment above globPatterns.
        globIgnores: ['tesseract/**', 'tessdata/**'],
        // OCR assets get cached the first time the scanner actually runs
        // (via src/lib/ocr.ts's WORKER_PATH/CORE_PATH/LANG_PATH), same as
        // the "works offline once fetched/cached once" behavior documented
        // there — this makes that guarantee durable (survives eviction of
        // the plain HTTP cache) instead of relying on browser cache
        // heuristics.
        runtimeCaching: [
          {
            urlPattern: /\/(tesseract|tessdata)\/.+/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-ocr-assets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
})
