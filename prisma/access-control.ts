// Sumber tunggal katalog izin kini berada di `src/server/lib/accessControl.ts`.
//
// Alasan pemindahan: `src/server/index.ts` mengimpor katalog ini dari luar
// `src/server`, sehingga `tsc` menolak (file di luar rootDir) dan hasil build
// kehilangan `dist/server/prisma/access-control.js` — endpoint
// `/api/admin/permissions/sync` akan gagal saat dijalankan.
//
// Berkas ini dipertahankan sebagai re-export agar `prisma/seed.ts` dan
// `prisma/seed-access.ts` tetap berjalan tanpa perubahan.
export * from "../src/server/lib/accessControl.js";
