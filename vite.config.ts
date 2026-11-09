import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

const built = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version.replace(/\.0$/, '')),
    __APP_BUILT__: JSON.stringify(built),
  },
  plugins: [
    react(),
          VitePWA({
            registerType: 'prompt',
            injectRegister: false,
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
  ],
})
