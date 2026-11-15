import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Aplikasi ini dipasang di sub-path produksi (PROD_BASE). Saat mode dev,
// base dikembalikan ke '/' supaya alamat lokal tetap nyaman.
// PROD_BASE harus identik dengan basename router dan prefix location nginx.
const PROD_BASE = '/sso/'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? PROD_BASE : '/',
  plugins: [react()],
  server: {
    // Port tetap ONE UNUSU SSO Central Gateway adalah 5178.
    port: 5178,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist/client'
  }
}))