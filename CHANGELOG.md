# ONE UNUSU — Changelog

Semua perubahan penting pada repositori ONE UNUSU dicatat dalam dokumen ini.

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
