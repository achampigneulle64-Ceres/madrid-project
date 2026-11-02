import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLE=1 → un seul fichier HTML autonome (prévisualisation dans Claude).
// Sinon → web app installable et utilisable hors ligne (GitHub Pages).
const single = !!process.env.SINGLE

export default defineConfig({
  base: './',
  plugins: [
    react(),
    ...(single
      ? [viteSingleFile()]
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['apple-touch-icon.png', 'favicon-64.png'],
            manifest: {
              name: 'Madrid · Español',
              short_name: 'Español',
              description: 'Mon parcours vers l’espagnol, de A1 à C1.',
              lang: 'fr',
              start_url: './',
              scope: './',
              display: 'standalone',
              orientation: 'portrait',
              background_color: '#f1f2f5',
              theme_color: '#f1f2f5',
              icons: [
                { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
              cleanupOutdatedCaches: true,
            },
          }),
        ]),
  ],
})
