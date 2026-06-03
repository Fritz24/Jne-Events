import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const campayToken = env.CAMPAY_APP_TOKEN || env.VITE_CAMPAY_APP_TOKEN
  const campayApi = (env.CAMPAY_API_URL || env.VITE_CAMPAY_API_URL || 'https://demo.campay.net/api').replace(/\/$/, '')

  return {
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      '/api/campay': {
        target: campayApi,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/campay\/?/, '/'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (campayToken) {
              proxyReq.setHeader('Authorization', `Token ${campayToken}`)
            }
          })
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('html2canvas') || id.includes('qrcode.react') || id.includes('date-fns')) {
              return 'vendor-utils';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-animation';
            }
          }
        }
      }
    }
  }
}})