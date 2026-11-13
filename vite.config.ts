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
    // Port tetap 5178, bukan 5173: 5173 sudah dipakai proyek lain (SIKAPI) dan
    // 5174/5177 terpakai aplikasi tetangga. Lihat D:\Project\LIST_PORT.md.
    // Port ini WAJIB sama dengan salah satu origin di CORS_ORIGIN server.
    port: 5178,
    // Wajib: alamat API hanya mengizinkan origin CORS_ORIGIN yang terdaftar di
    // server. Bila port bergeser diam-diam, browser akan memblokir respons dan
    // login tampak "gagal terhubung" padahal server sehat. Lebih baik Vite
    // berhenti dengan pesan jelas daripada bergeser tanpa disadari.
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