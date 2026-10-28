# Changelog - Portal Publik

## [2026-10-29]

### Added
- Rute `/fakultas`, `/prodi`, `/layanan`, dan `/keamanan` didaftarkan di `App.tsx`. Sebelumnya keempat halaman ini sudah ada tetapi tidak dapat diakses.
- Menu `Akademik` (dropdown Fakultas dan Program Studi) serta item `Layanan Terpadu` pada `mainNavigation`.
- Tautan Fakultas, Program Studi, Layanan Terpadu, dan Keamanan & Privasi pada `footerQuickLinks`.

### Removed
- `pages/Berita.tsx` dihapus karena tidak pernah dirutekan dan mengimpor `fetchBerita` yang tidak ada di `services/api.ts`.
- `components/Navbar.tsx` dan `components/Footer.tsx` dihapus karena duplikat dari `components/layout/*` dan tidak diimpor di mana pun.
