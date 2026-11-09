# Changelog — Admin Panel

## [2026-11-09] - Otorisasi Berbasis Izin Masuk Dinamis & Migrasi RoleId

### Added
- Dukungan **Multi-Role** pengguna di portal ONE UNUSU: pembuatan model tabel relasi `user_roles`, migrasi database `20261109110000_multi_role_user_roles`, dan backfill data dari `roleId`.
- Antarmuka pemilihan multi-role (checkbox checklist) pada form tambah dan ubah pengguna di `/admin/pengguna`.
- Penampilan badges multi-role pada tabel daftar pengguna.
- Pembersihan katalog izin portal ONE UNUSU SSO agar murni mengelola portal internal SSO tanpa izin cabang.
- Endpoint API `POST /api/admin/permissions` dan `DELETE /api/admin/permissions/:id` untuk pembuatan dan penghapusan izin secara mandiri.
- Tombol dan form modal ringkas **"+ Tambah Izin"** pada halaman `/admin/izin`.
- Migrasi database `20261109100300_drop_application_admin_roles`: migrasi seluruh pengguna ber-peran admin cabang ke `SUPERADMIN` dan penghapusan 7 peran `ADMIN_<APP>` dari tabel `roles`.
- Helper `badgeForRole(code)` di `ManajemenPengguna.tsx` dengan palet warna deterministik untuk peran kustom buatan Super Administrator.
- Registrasi otomatis aplikasi Portal Prodi UNUSU (`prodi-unusu`) dan 14 website program studi ke direktori aplikasi non-SSO.

### Changed
- Refaktor `ManajemenPengguna.tsx`: pemuatan daftar peran kini dinamis via API `GET /api/admin/roles` (`fetchAdminRoles()`); pembuatan dan pengeditan pengguna mengirimkan `roleId`.
- Label input identifier pada formulir tambah akun berubah secara dinamis (NIM untuk Mahasiswa, NIDN untuk Dosen, Username untuk peran lainnya).
- Otorisasi pintu masuk aplikasi cabang beralih sepenuhnya ke izin masuk standar `<clientId>:masuk_*` (`masuk_admin`, `masuk_dosen`, `masuk_mahasiswa`) via fungsi `decideAppAccess()`.
- Super Administrator dan Admin SSO otomatis memiliki seluruh izin masuk ke semua aplikasi cabang.
- **Penyelarasan URL Callback Lingkungan**: Memisahkan seeder dan skrip sinkronisasi URL callback untuk mode lokal (`npm run db:sso-dev-urls` / `npm run db:seed:local`) dan mode VPS (`npm run db:sso-vps-urls` / `npm run db:seed:vps`).
- `seed.ts` diperbarui: akun bawaan hanya `admin` (`SUPERADMIN`) dan `admin_sso` (`ADMIN_SSO`). Penautan pengguna dilakukan sesudah penyiapan peran (`roleId`).

### Removed
- Kolom enum `users.role` pada schema database dan TypeScript.
- Definisi peran kaku per aplikasi (`ADMIN_LPM`, `ADMIN_LPPM`, `ADMIN_ESURAT`, `ADMIN_SARPRAS`, `ADMIN_AKREDITASI`, `ADMIN_LMS`, `ADMIN_PRODI`).
- Pemfilteran peran hardcoded (`ROLE_OPTIONS`, `ROLE_LABEL`, `APP_ROLES`) yang sebelumnya membatasi pengelolaan peran.

## [2026-10-30] - Seeder Direktori Non-SSO

### Added
- `prisma/directory.ts`: sumber tunggal `DIRECTORY_ENTRIES` dan fungsi `seedDirectory(prisma)` untuk tabel `LayananKampus`, dipakai bersama oleh `prisma/seed.ts` dan `prisma/seed-directory.ts`.
- Skrip `npm run prisma:seed:directory` untuk mengisi direktori non-SSO tanpa menjalankan seed penuh.
- Entri awal: **SIAKAD UNUSU** (`https://siakad.unusu.ac.id`, ikon `AcademicCapIcon`) dan **PMB UNUSU** (`https://pmb.unusu.ac.id`, ikon `UserIcon`), keduanya `isExternal: true`.

### Changed
- `prisma/seed.ts` kini memiliki bagian ke-4 yang memanggil `seedDirectory(prisma)`, sehingga seed lengkap ikut mengisi direktori non-SSO.
- `seedDirectory` bersifat idempotent: pencocokan memakai `nama`, entri yang sudah ada diperbarui (bukan diduplikasi), dan entri lain hasil panel admin tidak dihapus.

## [2026-10-29] - Pemecahan Panel Admin & Izin Berbasis Resource

### Added
- Halaman admin baru `/admin/direktori` (Direktori Publik) lengkap dengan manajemen CRUD (tambah, edit, hapus, urutan, ikon, dan tautan eksternal/internal) yang langsung terhubung dinamis ke Dashboard civitas.
- Endpoint `GET /api/directories`, `POST/PUT/DELETE /api/admin/directories` dengan izin berbasis permission (`directory:menu`, `directory:view`, `directory:edit`, `directory:delete`).
- Pemisahan tampilan `/aplikasi` publik menjadi 2 section terbuka: *Aplikasi Terintegrasi Single Sign-On (SSO)* dan *Aplikasi Mandiri & Eksternal (Non-SSO)*.
- Fitur Edit dan Hapus aplikasi SSO pada halaman Registrasi SSO lengkap dengan modal form edit dan modal dialog konfirmasi hapus.
- Endpoint `DELETE /api/admin/apps/:id` dengan perlindungan izin `application:delete` beserta pembersihan otomatis tiket SSO terkait.
- Komponen dialog pop-up standar `NotificationModal` (`success`, `error`, `confirm`, `info`) untuk seluruh aksi dan konfirmasi sistem.
- Dukungan upload gambar Base64 besar melalui kenaikan limit Express JSON parser menjadi `50mb` dan migrasi kolom `sso_apps.icon` menjadi MySQL `LONGTEXT`.
- Empat sub-rute: `/admin` (Registrasi SSO), `/admin/pengguna` (Manajemen Pengguna), `/admin/izin` (matriks izin per peran), `/admin/peran` (CRUD peran).
- Model `Permission`, `Role`, `RolePermission` beserta kolom `User.roleId`, dan enum Prisma `Role` diganti nama menjadi `UserRole` agar tidak bentrok dengan model baru.
- Endpoint `GET /api/admin/permissions`, `GET/POST/PUT/DELETE /api/admin/roles`, `PUT /api/admin/roles/:id/permissions`.
- Middleware `requirePermission` dan helper `getUserPermissionKeys`; `permissions` disertakan pada login dan `/api/auth/me`.
- Komponen `AdminPanelTemplate`, hook `useAdminData`, helper `lib/permissions.ts` dan `lib/appRoles.ts`.

### Changed
- Seluruh endpoint admin dialihkan dari pemeriksaan peran ke pemeriksaan izin: `dashboard:view`, `user:view`, `user:edit`, `application:view`, `application:edit`, `permission:view`, `permission:edit`, `role:view`, `role:edit`, `role:delete`.
- Navigasi sidebar dan breadcrumb disusun dari katalog menu (`dashboard`, `profile`, `application`, `user`, `permission`, `role`) dan hanya tampil bila izin menunya dimiliki.

### Removed
- Halaman monolit `src/client/pages/AdminPanel.tsx` serta middleware `requireSuperadmin`.

## [2026-10-29] - Penghapusan Warna Default Tailwind

### Changed
- Seluruh 40 pemakaian `slate-*` dan `emerald-*` diganti token Modern Green: judul `#1E293B`, label/deskripsi `#475569`, metadata `#64748B`, ikon redup `#94A3B8`, border kartu dan input `#D8E5DC`, divider `#E8EFEA`, latar chip dan hover `#F1F5F2`, backdrop dan tombol sekunder hover `#1E293B`/`#E8EFEA`, focus ring input `#166534`.
- Modal Tambah Akun dan Modal Daftarkan Aplikasi kini memakai token yang sama dengan tabel dan form di halaman utama panel.

## [2026-10-29]

### Changed
- Standardized operational stats cards with `#D8E5DC` borders and modern role typography.
- Enhanced table header styling to Pale Green `#F0FDF4` and border `#D8E5DC`.
- Updated role badges to follow the official semantic palette.
- Normalized filter and search input borders from `#CBD5E1` to `#D8E5DC`.
