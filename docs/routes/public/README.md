# Portal Publik - Overview

Rute publik adalah halaman yang dapat diakses tanpa login. Seluruh halaman di grup ini memakai layout yang sama: `Topbar`, `Navbar`, konten, lalu `Footer`.

---

## Daftar Rute

| Rute | Komponen | Fungsi |
|---|---|---|
| `/` | `pages/Home.tsx` | Landing page: hero dan katalog layanan digital |
| `/aplikasi` | `pages/Aplikasi.tsx` | Katalog aplikasi terintegrasi SSO |
| `/layanan` | `pages/Layanan.tsx` | Daftar layanan digital ekosistem kampus |
| `/bantuan` | `pages/Bantuan.tsx` | Pusat bantuan civitas |
| `/fakultas` | `pages/Fakultas.tsx` | Direktori fakultas dan program studi |
| `/prodi` | `pages/Prodi.tsx` | Daftar program studi sarjana |
| `/keamanan` | `pages/Keamanan.tsx` | Penjelasan protokol keamanan SSO |

Rute `/login` didokumentasikan terpisah di `docs/routes/auth/README.md`.

---

## Fitur Utama

- **Navigasi terpusat**: seluruh item menu berasal dari `src/client/data/navigation.ts` (`mainNavigation`, `topbarLinks`, `footerQuickLinks`).
- **Direktori akademik**: data fakultas dan program studi berasal dari `src/client/data/academics.ts`.
- **Katalog layanan**: data layanan berasal dari `src/client/data/services.ts`, termasuk status `available` dan `coming-soon`.
- **Tautan eksternal aman**: `SmartLink` menonaktifkan tautan yang belum dikonfigurasi dan menampilkan keterangan, bukan tautan mati.

---

## Palet

Portal publik memakai token `brand` dan `gold` yang didefinisikan di `tailwind.config.js`. Panel SSO (`/dashboard`, `/profil`, `/admin`) memakai palet Modern Green. Pemetaan lengkap ada di `docs/design-system/COLORS.md`.
