# ONE UNUSU — Changelog

## [2026-11-06] — Seksi Tentang Platform, Perbaikan Status Aktif Sidebar & Verifikasi Routing

### Changed
- **Seksi Tentang Platform** (`src/client/components/home/ProfileSection.tsx`): blok profil beranda diimplementasikan langsung dengan pola baku teks di kiri dan foto potret di kanan. Foto memakai `public/assets/profil-mahasiswa.png` (PNG 726×962 dengan alpha channel, diproses `assetUrl`).
- **Komponen `TentangPlatform` dibatalkan**: `src/client/components/TentangPlatform.tsx` dihapus karena hanya menjadi pembungkus tambahan untuk satu pemakaian. Implementasi tunggal kini berada di `home/ProfileSection.tsx`.
- **Anchor `#tentang` dipindahkan** ke seksi Tentang Platform (dari `id="profil"`), dan `HowItWorksSection` yang sebelumnya memakai `id="tentang"` (padahal komponen itu tidak pernah dirender) diubah menjadi `id="cara-kerja"` agar tidak ada anchor ganda.

### Fixed
- **Sidebar `isActive`** (`src/client/components/SidebarLayout.tsx`): versi lama memakai `pathname === path` sehingga menu `/admin` tetap menyala saat berada di `/admin/pengguna` dan dua menu tampak aktif bersamaan. Kini memakai batas segmen (`to + '/'`) dengan aturan **kecocokan terpanjang menang**.
- **Verifikasi routing** (`src/client/tests/e2e-auth-routing.verify.ts`, `scripts/verify-navigation.ts`): assertion diubah dari `/admin` ke `/dashboard`, sesuai perilaku `resolveLandingPath` yang mengarahkan **semua peran** ke dashboard portal setelah login.

### Verification
- `scripts/tsc --noEmit` — bersih.
- `src/client/tests/e2e-auth-routing.verify.ts` — 10/10 pengujian lulus.
- `vite build` — berhasil.


Semua perubahan penting pada repositori ONE UNUSU dicatat dalam dokumen ini.

---

## [2026-11-05]

### Breaking
- **Penghapusan Kunci Aplikasi per Pengguna (`user_app_accesses`)**:
  - Otorisasi akses aplikasi cabang kini memakai dua lapis terpisah: `sso_apps.targetRoles` di portal dan `ALLOWED_SSO_ROLES` di server masing-masing aplikasi cabang. Tabel allowlist per pengguna dihapus karena menjadi sumber kebenaran kedua yang rawan bentrok.
  - Migrasi baru: `prisma/migrations/20261105120000_drop_user_app_access` (`DROP TABLE user_app_accesses`).
  - Dihapus: model `UserAppAccess`, field relasi `User.appAccess` / `SsoApp.appAccess`, `prisma/seed-app-access.ts`, skrip `db:seed:app-access`, endpoint `GET/PUT /api/admin/users/:id/app-access`, `GET /api/admin/app-access`, `PUT /api/admin/apps/:id/access`, halaman `src/client/pages/admin/KunciAplikasi.tsx`, rute `/admin/akses-aplikasi`, menu sidebar "Kunci Aplikasi", tombol "Atur" pada Manajemen Pengguna, badge "Kunci" pada kartu aplikasi Dashboard, serta semua fungsi `*AppAccess*` di `src/client/services/api.ts`.
  - `syncAdminApps` tidak lagi membuat kunci admin; respons `POST /api/admin/apps/sync` tidak lagi memuat `keysCreated`.

### Changed
- **Penamaan Skrip Database**:
  - Semua skrip seed memakai awalan `db:` (`db:seed`, `db:seed:access`, `db:seed:directory`, `db:seed:sliders`, `db:sso-dev-urls`). Alias `prisma:seed*` dipertahankan sebagai penerus tipis.
  - `one-unusu` menyesuaikan `SEED_ADMIN_PASSWORD` menjadi `password123` agar seragam dengan repositori lain.

### Documentation
- Menambahkan aturan **4.1 Aturan Otorisasi Aplikasi Cabang** pada `docs/PROJECT_RULES.md` (dua lapis otorisasi, larangan menghidupkan allowlist, kewajiban konsistensi `targetRoles` dengan `ALLOWED_SSO_ROLES`).
- Menambahkan **5.2 Konvensi Skrip Database** dan dua butir keamanan baru pada `docs/PROJECT_RULES.md`.
- Menambahkan bagian **2.1 Model Otorisasi Aplikasi Cabang** pada `docs/ARCHITECTURE.md`.
- Memperbarui `AGENTS.md`, `README.md`, `docs/README.md`, dan `docs/routes/admin/README.md`.

---

## [2026-11-02]

### Documentation
- **Dokumentasi JSDoc `normalizeExternalUrl` (`src/client/lib/urls.ts`)**:
  - Menambahkan JSDoc komprehensif pada fungsi `normalizeExternalUrl` yang menjelaskan validasi/normalisasi URL eksternal http/https dan pengembalian nilai `null` untuk URL tidak valid tanpa mengubah logika fungsi.
- **Dokumentasi JSDoc `readCachedUser` (`src/client/App.tsx`)**:
  - Menambahkan JSDoc pada fungsi `readCachedUser` yang mendokumentasikan pembacaan data sesi pengguna dari cache lokal (`localStorage`) tanpa memodifikasi implementasi fungsi.

---

## [2026-11-01]

### Fixed
- **Audit & Penyelarasan Navigasi Tombol Aksi Landing Page (`/`)**:
  - Tombol-tombol aksi di landing page (`DigitalServicesSection` & `Navbar`) diaudit dan diperbaiki alur navigasinya agar tidak salah mengarahkan tamu/guest atau pengguna reguler ke panel `/admin`.
  - Target navigasi kini konsisten dengan sesi `one_unusu_user`: tamu diarahkan ke `/login`, pengguna reguler (dosen, mahasiswa, tendik) ke `/dashboard`, dan superadmin ke `/admin`.
  - Label teks CTA tombol aksi diperbarui secara kontekstual sesuai hak akses pengguna.

---

## [2026-10-31]

### Verified & Fixed
- **Verifikasi End-to-End Alur Login dan Routing SSO**:
  - Memverifikasi tombol 'Masuk' dari landing page (`Navbar.tsx` desktop/mobile, serta `DigitalServicesSection.tsx`): mengarahkan pengguna secara tepat ke form login SSO (`/login`), bukan form registrasi (`/register` / PMB external).
  - Memvalidasi proteksi `GuestOnlyRoute` pada `/login` dan `/register` di mana user yang telah memiliki sesi aktif (`one_unusu_user`) langsung dialihkan ke dashboard/panel admin (`/admin` untuk SUPERADMIN, `/dashboard` untuk civitas umum) tanpa prompt atau pengisian formulir berulang.
  - Memvalidasi alur pasca-login sukses pada `Login.tsx`: sesi disimpan dan user diarahkan ke rute target sesuai peran (`SUPERADMIN` ke `/admin`, mahasiswa/dosen/tendik ke `/dashboard`) atau parameter internal `next`.
  - Menambahkan penanda `data-testid` pada tombol 'Masuk' (`nav-masuk-button`, `nav-masuk-button-mobile`, `hero-masuk-button`) dan elemen form login (`login-identifier-input`, `login-submit-button`) untuk kepatuhan otomasi E2E testing.
  - Memverifikasi seluruh skenario pengujian dengan automated script E2E simulation dan build check (`npm run build`).

- **Verifikasi Alur Navigasi & Redirect Landing Page**:
  - Memverifikasi tombol 'Halaman Depan' dan tombol 'Kembali' di seluruh halaman aplikasi (`Login`, `Register`, `SsoAuthorize`, `SidebarLayout`).
  - Menyelaraskan teks dan atribut navigasi tombol kembali pada halaman `Login.tsx` (`Kembali ke Halaman Depan` dengan `data-testid="link-kembali-beranda"` dan `title="Kembali ke Halaman Depan"`).
  - Menambahkan pengenal atribut `data-testid` pada tombol kembali dan halaman depan di `Register.tsx` (`link-kembali-beranda`, `link-kembali-login`) serta `SsoAuthorize.tsx` (`link-kembali-beranda`, `link-kembali-dashboard`, `link-login-ulang`).
  - Memastikan seluruh skenario navigasi (langsung via URL, antar-halaman, serta tombol kembali) mengarah mulus ke root publik (`/`) tanpa redirect loop atau error 404/mental.
  - Memvalidasi build TypeScript dan Vite (`npm run build`) berhasil 100% tanpa error linter maupun compiler.

---

## [2026-10-31]

### Changed
- **Pesan penolakan akses SSO disederhanakan tanpa menyebut peran pengguna**: pesan pada `GET /api/sso/app-client/:clientId/v2/redirect`, `POST /api/v2/website/verify-token`, `Dashboard.tsx`, dan `SsoAuthorize.tsx` diseragamkan menjadi `"Akses ditolak. Anda tidak memiliki akses ke aplikasi ini."`.
- **Modal notifikasi diperbesar dan dipercantik dengan nuansa hijau kelembagaan**: `NotificationModal.tsx` kini menggunakan ukuran lebih lega (`max-w-lg`), header `#F0FDF4` dengan garis aksen hijau `#166534`, badge status, wadah ikon Heroicons `ShieldExclamationIcon` hijau lembut (`#DCFCE7` / `#BBF7D0`), tipografi lebih jelas, serta tombol tutup hijau `#166534` yang ramah aksesibilitas keyboard (`Escape`).
- **Dashboard `/dashboard` selalu menampilkan tombol "Buka Aplikasi"** pada seluruh kartu layanan SSO aktif, dan menampilkan modal notifikasi hijau **Akses Ditolak** ketika pengguna membuka aplikasi yang tidak sesuai hak aksesnya.

---

## [2026-10-30]

### Changed
- **Gerbang biodata dipindah dari login ke pembukaan aplikasi SSO.** Login SSO kini selalu berakhir di panel (`SUPERADMIN` → `/admin`, peran lain → `/dashboard`); pengguna dengan email/WhatsApp kosong tidak lagi dipaksa ke `/profil` lebih dulu.
- `Dashboard.tsx`: `handleLaunchApp` memeriksa `isBiodataComplete(user)` sebelum meminta tiket SSO, lalu mengalihkan ke `/profil` dengan `state.requiredBio`.
- `Profile.tsx`: menampilkan `NotificationModal` bertipe `info` saat pengguna diarahkan karena biodata belum lengkap, di samping warning banner persisten.
- `SidebarLayout.tsx`: indikator `Lengkapi` memakai helper kelengkapan biodata yang sama.
- `README.md` ditulis ulang agar sesuai kondisi repositori: menghapus klaim struktur monorepo (`client/` dan `server/` terpisah), perintah `npm install --prefix`, ikon Lucide, dan React Router v6.
- Bagian "Modul Ekosistem Terkait" yang menyebut repositori di luar workspace (`lms-unusu`, `esurat-unusu`, `sdm-sarpras-unusu`, `lpm-lppm-unusu`) diganti tabel **Aplikasi yang Terdaftar di Repositori Ini** berisi 7 entri: 6 aplikasi SSO dari `prisma/seed.ts` dan `siakad` (tautan eksternal non-SSO) dari `src/client/data/services.ts`.
- Klaim "seeder 6 Fakultas & 14 Prodi" dihapus; diganti penjelasan bahwa konten fakultas, prodi, layanan, berita, dan banner dibaca dari `src/client/data/` dan model Prisma terkait belum memiliki seeder.
- Menambahkan tabel perintah npm, daftar variabel environment, dan tautan indeks dokumentasi `docs/`.
- `prisma/seed.ts`: kata sandi superadmin kini punya nilai bawaan `password123` di dalam seeder, jadi `SEED_ADMIN_PASSWORD` tidak lagi wajib diisi. Bila variabel itu diset, nilainya tetap dipakai.
- `prisma/seed.ts`: blok `update` pada `upsert` akun tidak lagi menyertakan field `password`, sehingga menjalankan ulang seed tidak menimpa kata sandi yang sudah diganti.
- **Akun demo dihapus.** Tombol pintasan "Uji Coba" beserta konstanta `DEMO_PASSWORD` dibuang dari `Login.tsx`; `prisma/seed.ts` tidak lagi membuat akun dosen/mahasiswa contoh dan berhenti membaca `SEED_DEMO_PASSWORD`.
- Tombol **"Portal Publik UNUSU"** pada topbar panel sebelumnya memakai `href="/"`, yang di produksi membuka akar domain (portal lama), bukan halaman depan ONE UNUSU. Tautan kini diambil dari `VITE_PUBLIC_PORTAL_URL` dengan fallback `import.meta.env.BASE_URL`.

### Added
- `src/client/lib/biodata.ts`: `isBiodataComplete()` sebagai sumber tunggal aturan kelengkapan biodata (email + nomor WhatsApp).
- Warning banner biodata pada Dashboard — sebelumnya hanya tercatat di dokumentasi, belum diimplementasikan.
- Penyelarasan dokumen aturan: `AGENTS.md` poin 4, `docs/PROJECT_RULES.md` 4.1, `docs/routes/auth/RULES.md`, `docs/routes/dashboard/RULES.md`, `docs/routes/profile/RULES.md`.
- Catatan penyiapan akses via `npm run prisma:seed:access` bila tabel izin/peran belum terisi.
- Seeder direktori aplikasi non-SSO: `prisma/directory.ts`, `prisma/seed-directory.ts`, dan skrip `npm run prisma:seed:directory` (entri awal: SIAKAD UNUSU dan PMB UNUSU).

### Fixed
- **Kebocoran kredensial pada halaman login produksi.** Tombol pintasan "Uji Coba: Mahasiswa / Dosen / Superadmin" mengisi kata sandi secara otomatis tanpa pagar lingkungan, sehingga siapa pun dapat masuk sebagai `SUPERADMIN`. Blok tersebut dihapus seluruhnya dari `Login.tsx`.
- **Kartu "Aplikasi Terintegrasi" meluber di layar mobile.** Item grid memakai `min-width: auto` bawaan sehingga lebar track mengikuti min-content anaknya (380.9px) padahal kartu hanya 356px; ditambahkan `min-w-0` pada kedua kolom `DigitalServicesSection`.

## [2026-10-29]

### Added
- Standardized Project Documentation Governance (`docs/README.md`, `docs/PROJECT_RULES.md`, `docs/ARCHITECTURE.md`).
- Design System tokens and specification under `docs/design-system/` (`DESIGN_RULES.md`, `COLORS.md`, `TYPOGRAPHY.md`, `COMPONENTS.md`, `PAGE_TEMPLATES.md`).
- Module rules and changelogs for routes (`dashboard`, `profile`, `admin`).

### Changed
- Sidebar memakai permukaan putih `#FFFFFF` dengan border `#D8E5DC`, item aktif pill `#15803D`, serta headbar `h-16` yang sinkron.
- Standardized page background to `#F1F5F2` (soft off-white greenish) to eliminate sterile visual flatness.
- Updated Welcome Card to `#F0FDF4` with `#D8E5DC` borders.
- Enforced Form Section Layout Rule (Part 10.8) on profile and admin panels.
- Retained bottom user card removal from sidebar, centralizing user menu in topbar dropdown.

---

## [2026-10-29] - Audit Dokumentasi, Rute, dan Normalisasi Palet

### Added
- `docs/routes/public/` (README, RULES, CHANGELOG) untuk rute `/`, `/aplikasi`, `/layanan`, `/bantuan`, `/fakultas`, `/prodi`, `/keamanan`.
- `docs/routes/auth/` (README, RULES, CHANGELOG) untuk rute `/login`.
- Rute `/fakultas`, `/prodi`, `/layanan`, dan `/keamanan` pada `src/client/App.tsx`.
- Menu `Akademik` (dropdown Fakultas dan Program Studi) dan item `Layanan Terpadu` pada `mainNavigation`.
- Tautan Fakultas, Program Studi, Layanan Terpadu, dan Keamanan & Privasi pada `footerQuickLinks`.

### Fixed
- Dokumentasi `npm run dev` diperbaiki menjadi `npm run dev:all` untuk menjalankan frontend dan backend bersamaan.
- Kontrak SSO pada `docs/ARCHITECTURE.md` dan `docs/PROJECT_RULES.md` disesuaikan dengan implementasi: `GET /api/sso/app-client/:clientId/v2/redirect`, `POST /api/v2/website/verify-token`, model `SsoApp` dan `SsoAuthToken`, token single-use 64 karakter berlaku 5 menit.
- Klaim sidebar Deep Green diganti sesuai implementasi permukaan putih.
- Nilai identitas palsu (`Siti Rahmah`, `2201010045`, `S1 Sistem Informasi`, status `Aktif`) dihapus dari Dashboard dan `SidebarLayout`.
- Kartu identitas Dashboard kini menyesuaikan peran civitas.
- Respons 401/403 pada Dashboard menghapus token dan data pengguna sebelum redirect ke `/login`.

### Changed
- Kode HEX di luar palet pada panel SSO dinormalisasi: `#CBD5E1`, `#E2EBE5`, `#F1F5F9`, `#F8FAF9`, `#E5EFE8`, `#E2E8F0`, `#0F3D1F`, `#0F172A`, `#334155`, `#7E22CE`, `#F3E8FF`, `#FEF9C3`, `#FEF08A`, `#854D0E`, dan `#062419`.
- Palet portal publik didokumentasikan sebagai token `brand` dan `gold` di `docs/design-system/COLORS.md` dengan aturan cakupan per permukaan.
- Referensi `lucide-react` dihapus dari halaman yang tetap dipakai.

### Removed
- `src/client/components/Navbar.tsx` dan `src/client/components/Footer.tsx` (duplikat dari `components/layout/*`, tanpa konsumen).
- `src/client/pages/Berita.tsx` (tidak dirutekan dan mengimpor `fetchBerita` yang tidak ada di `services/api.ts`).
- Radial halo kuning dan efek blur dekoratif pada panel SSO.

---

## [2026-10-29] - Penyederhanaan Dashboard

### Changed
- Daftar identitas civitas pada `/dashboard` memakai `dl` dua kolom tanpa kartu per item: label uppercase kecil di atas, nilai semibold di bawah.
- Banner sambutan hanya menampilkan "Selamat Datang," dan nama pengguna.

### Removed
- Baris NIM, program studi, dan fakultas pada banner sambutan.
- Blok "SSO Terverifikasi / Akun Anda telah berhasil diverifikasi".
- Properti `icon` pada `IdentityMetric` dan import ikon yang tidak terpakai (`ShieldCheckIcon`, `BookOpenIcon`, `ChevronRightIcon`, `CalendarDaysIcon`, `EnvelopeIcon`).

---

## [2026-10-29] - Normalisasi Palet Panel ke Aturan Doc

### Changed
- `AdminPanel.tsx`: 40 pemakaian `slate-*` dan `emerald-*` diganti token Modern Green (judul `#1E293B`, label `#475569`, metadata `#64748B`, ikon redup `#94A3B8`, border `#D8E5DC`, divider `#E8EFEA`, chip dan hover `#F1F5F2`, focus ring `#166534`).
- `Profile.tsx`: banner peringatan biodata memakai token Warning resmi (`#FEF3C7` / `#FDE68A` / `#92400E` / `#B45309`), modal crop memakai token neutral panel, kanvas pasfoto ditulis `bg-[#B91C1C]`.
- `Skeleton.tsx`: placeholder memakai `#E8EFEA` dan `#F1F5F2`, bukan `slate-200`/`slate-100`.
- `Login.tsx`: teks deskripsi di atas foto kampus memakai Soft Green `#DCFCE7`, bukan `slate-200`.
- `SidebarLayout.tsx`: border headbar `#E2EBE5` menjadi `#D8E5DC`, backdrop drawer `#0F172A` menjadi `#1E293B`, kanvas `#F2F6F2` menjadi `#F1F5F2` (sesuai token Main Background), titik penanda biodata `#F59E0B` menjadi `#B45309` (token Warning).
- `Dashboard.tsx`: latar banner error `#FEF2F2` menjadi `#FEE2E2` (token Error resmi).

### Docs
- `docs/design-system/COLORS.md`: tambah bagian 6 (ramp netral `stone` untuk portal publik) dan bagian 7 (ramp permukaan sidebar panel), serta memperluas larangan hex menjadi tabel 1 sampai 7.
- `docs/design-system/TYPOGRAPHY.md`: tabel skala dipisah per permukaan (portal publik vs panel SSO) sesuai ukuran yang benar-benar dipakai, ditambah aturan alias `font-display` dan aturan dua kepadatan.

### Verified
- 0 class default Tailwind (`slate`, `gray`, `emerald`, `amber`, `red`) tersisa di `AdminPanel`, `Profile`, `Dashboard`, `Login`, `SidebarLayout`, dan `Skeleton`.
- 0 kode hex di luar tabel COLORS.md di seluruh `src/client`.
