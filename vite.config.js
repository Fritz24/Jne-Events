import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const cleanEnvVar = (val) => {
    if (!val) return '';
    return val.replace(/^["']|["']$/g, '').trim();
  }

  // Payunit config
  const payunitApiUser = cleanEnvVar(env.PAYUNIT_API_USER || env.VITE_PAYUNIT_API_USER);
  const payunitApiPassword = cleanEnvVar(env.PAYUNIT_API_PASSWORD || env.VITE_PAYUNIT_API_PASSWORD);
  const payunitApiKey = cleanEnvVar(env.PAYUNIT_API_KEY || env.VITE_PAYUNIT_API_KEY);
  const payunitMode = cleanEnvVar(env.PAYUNIT_MODE || env.VITE_PAYUNIT_MODE || 'sandbox');
  const payunitAuth = Buffer.from(`${payunitApiUser}:${payunitApiPassword}`).toString('base64');
  const payunitApi = cleanEnvVar(env.PAYUNIT_API_URL || env.VITE_PAYUNIT_API_URL || 'https://gateway.payunit.net').replace(/\/$/, '')

  return {
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      // Local dev proxy for /api/payunit-initialize → Payunit POST /api/gateway/initialize
      '/api/payunit-initialize': {
        target: payunitApi,
        changeOrigin: true,
        rewrite: () => '/api/gateway/initialize',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Proxy Request Headers (Incoming)]:', req.headers);
            
            // Strip browser headers that trigger Cloudflare / CloudFront WAF
            const toRemove = [
              'cookie', 'origin', 'referer', 'user-agent',
              'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
              'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site',
              'accept-encoding', 'accept-language'
            ];
            toRemove.forEach(header => proxyReq.removeHeader(header));
            
            // Set standard User-Agent to avoid empty header blocks
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            if (payunitApiUser && payunitApiPassword) {
              proxyReq.setHeader('Authorization', `Basic ${payunitAuth}`)
            }
            if (payunitApiKey) {
              proxyReq.setHeader('x-api-key', payunitApiKey)
            }
            proxyReq.setHeader('mode', payunitMode)
            
            console.log('[Proxy Request Headers (Outgoing)]:', proxyReq.getHeaders());
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('[Proxy Response Status]:', proxyRes.statusCode);
            let body = '';
            proxyRes.on('data', (chunk) => { body += chunk; });
            proxyRes.on('end', () => {
              console.log('[Proxy Response Body]:', body.substring(0, 500));
            });
          });
        },
      },
      // Local dev proxy for /api/payunit-makepayment → Payunit POST /api/gateway/makepayment
      '/api/payunit-makepayment': {
        target: payunitApi,
        changeOrigin: true,
        rewrite: () => '/api/gateway/makepayment',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const toRemove = [
              'cookie', 'origin', 'referer', 'user-agent',
              'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
              'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site',
              'accept-encoding', 'accept-language'
            ];
            toRemove.forEach(header => proxyReq.removeHeader(header));
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            if (payunitApiUser && payunitApiPassword) {
              proxyReq.setHeader('Authorization', `Basic ${payunitAuth}`)
            }
            if (payunitApiKey) {
              proxyReq.setHeader('x-api-key', payunitApiKey)
            }
            proxyReq.setHeader('mode', payunitMode)
          })
        },
      },
      // Local dev proxy for /api/payunit-status → Payunit GET /api/gateway/paymentstatus/:transactionId
      '/api/payunit-status': {
        target: payunitApi,
        changeOrigin: true,
        rewrite: (p) => {
          const match = p.match(/transactionId=([^&]+)/)
          return match ? `/api/gateway/paymentstatus/${match[1]}` : '/api/gateway/paymentstatus'
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            const toRemove = [
              'cookie', 'origin', 'referer', 'user-agent',
              'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
              'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site',
              'accept-encoding', 'accept-language'
            ];
            toRemove.forEach(header => proxyReq.removeHeader(header));
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            if (payunitApiUser && payunitApiPassword) {
              proxyReq.setHeader('Authorization', `Basic ${payunitAuth}`)
            }
            if (payunitApiKey) {
              proxyReq.setHeader('x-api-key', payunitApiKey)
            }
            proxyReq.setHeader('mode', payunitMode)
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