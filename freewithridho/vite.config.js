import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { createRequire } from 'module'
import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Plugin: Netlify Functions Dev Handler
 * Memungkinkan /.netlify/functions/* dipanggil langsung saat npm run dev
 * tanpa perlu menjalankan `netlify dev` secara terpisah.
 */
const netlifyFunctionsDevPlugin = () => ({
  name: 'netlify-functions-dev',
  apply: 'serve', // hanya aktif saat dev, tidak saat build
  configResolved(config) {
    // Load env variables (.env) dan masukkan ke process.env
    // agar backend function (create-transaction) bisa membacanya via process.env.NAMAVAR
    const env = loadEnv(config.mode, process.cwd(), '')
    Object.assign(process.env, env)
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url || ''
      if (!url.startsWith('/.netlify/functions/')) return next()

      const fnName = url.replace('/.netlify/functions/', '').split('?')[0]
      const fnPath = path.join(__dirname, 'netlify', 'functions', `${fnName}.js`)

      try {
        // Baca body request
        const body = await new Promise((resolve) => {
          const chunks = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', () => resolve(Buffer.concat(chunks).toString()))
        })

        // Build event object sesuai format Netlify Functions
        const event = {
          httpMethod: req.method,
          path: url,
          headers: req.headers,
          body,
          queryStringParameters: {},
          isBase64Encoded: false,
        }

        // Gunakan pathToFileURL agar kompatibel dengan ESM loader di Windows (membutuhkan file:// URL)
        const fileUrl = pathToFileURL(fnPath).href
        const mod = await import(`${fileUrl}?t=${Date.now()}`)
        if (!mod.handler) {
          throw new Error(`Function ${fnName} tidak punya export 'handler'`)
        }

        const result = await mod.handler(event, {})

        res.statusCode = result.statusCode || 200
        const resHeaders = { 'Content-Type': 'application/json', ...(result.headers || {}) }
        Object.entries(resHeaders).forEach(([k, v]) => res.setHeader(k, v))
        res.end(result.body || '')
      } catch (err) {
        console.error(`[netlify-fn] ❌ Error in ${fnName}:`, err.message)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: false, message: err.message }))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    netlifyFunctionsDevPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['FREEWITHRIDHO.jpeg', 'FREEWITHRIDHO.png', 'favicon.svg'],
      manifest: {
        name: 'FreeWithRidho',
        short_name: 'FreeWithRidho',
        description: 'Platform layanan digital terpercaya bersama Ridho',
        theme_color: '#7c3aed',
        background_color: '#0f0f1a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/FREEWITHRIDHO.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/FREEWITHRIDHO.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['business', 'productivity'],
        shortcuts: [
          {
            name: 'Lihat Proyek',
            short_name: 'Proyek',
            description: 'Langsung ke halaman proyek',
            url: '/projects',
            icons: [{ src: '/FREEWITHRIDHO.png', sizes: '96x96' }],
          },
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Buka dashboard kamu',
            url: '/profile',
            icons: [{ src: '/FREEWITHRIDHO.png', sizes: '96x96' }],
          },
        ],
        screenshots: [
          {
            src: '/FREEWITHRIDHO.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'FreeWithRidho Dashboard',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg,jpg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/.netlify/],
        runtimeCaching: [
          {
            // Cache Firebase API calls
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 hari
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 tahun
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache gambar
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 hari
              },
            },
          },

        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    proxy: {
      // Proxy /.netlify/functions/* ke Netlify Dev (localhost:8888)
      // Aktif saat: npm run dev (port 5173) + netlify dev (port 8888) jalan bersamaan
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      // Legacy /api/* proxy (tetap ada sebagai fallback)
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react-signature-canvas'],
  },
})
