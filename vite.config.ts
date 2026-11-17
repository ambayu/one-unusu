import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Aplikasi ini dipasang di sub-path produksi (PROD_BASE). Saat mode dev,
// base dikembalikan ke '/' supaya alamat lokal tetap nyaman.
// PROD_BASE harus identik dengan basename router dan prefix location nginx.
const PROD_BASE = '/sso/'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.DEV_PORT || 5173)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DEV_PORT must be an integer between 1 and 65535')
  return {
  base: command === 'build' ? PROD_BASE : '/',
  plugins: [react()],
  server: {
    // Port portal terpisah dari callback Sarpras di 5178.
    port,
    strictPort: true,
    proxy: {
      '/api': {
        target: env.DEV_API_TARGET || 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist/client'
  }
  }
})
