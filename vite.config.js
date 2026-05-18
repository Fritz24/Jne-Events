import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],
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
});