# ONE UNUSU - Engineering Instructions

## Project
ONE UNUSU - Integrated Digital Campus
Universitas Nahdlatul Ulama Sumatera Utara

## Technology Stack
- Frontend (`client/`): Vite + React 18, TypeScript, Tailwind CSS, Heroicons (`@heroicons/react`)
- Backend (`server/`): Node.js Express, TypeScript, Prisma ORM
- Database: MySQL (`one_unusu_db`)
- SSO & Gateway: Tautan terpadu ke LMS, SIAKAD, PMB, E-Surat, SDM-Sarpras, LPM/LPPM

## Websites & Modules in ONE UNUSU
- 1 University Main Website & SSO Gateway
- 6 Faculty Profiles & Directories
- 14 Study Program (Prodi S1) Profiles
- Kampus News & Event Announcements
- App Launcher Portal

## Integrated Applications (Terpisah ke Repositori Mandiri)
- SIAKAD: Existing third-party application
- PMB: Existing third-party application
- LMS UNUSU: Mandiri di repositori `unusu-lms` (LMS UNUSU terpadu)
- E-Surat UNUSU: Mandiri di repositori `esurat-unusu`
- SDM & Sarpras UNUSU: Mandiri di repositori `unusu-sarpras`
- LPM UNUSU: Mandiri di repositori `lpm-unusu`
- LPPM UNUSU: Mandiri di repositori `lppm-unusu`
- Akreditasi UNUSU: Mandiri di repositori `unusu-akreditasi`

## Icon & UI Standards (PENTING)
1. **Icon Library**: Gunakan Heroicons (`@heroicons/react/24/outline` atau solid). Hindari icon Lucide atau library icon lain pada modul panel dashboard.
2. **Anti-Sparkles Rule**: DILARANG keras menggunakan icon `sparkles` (`Sparkles`, `SparklesIcon`, `lucide-sparkles`, dsb). Gunakan icon fungsional yang spesifik dan relevan seperti `AcademicCapIcon`, `UserPlusIcon`, `BookOpenIcon`, atau `BeakerIcon`.
3. **Responsive Sidebar**: Setiap halaman panel manajemen / dashboard terautentikasi wajib menyertakan sidebar responsif lengkap dengan navigasi Dashboard, Biodata & Profil, dan tautan sesuai peran user.
4. **Biodata Gate on App Launch**: Pengguna yang baru login SSO selalu diarahkan ke panel (dashboard/admin), bukan ke halaman biodata. Kelengkapan nomor WhatsApp dan email diperiksa saat pengguna membuka aplikasi SSO: bila belum lengkap, arahkan ke `/profil` dengan notifikasi modal dan jangan terbitkan tiket SSO.

## SSO App Authorization (WAJIB)
1. **Satu Sumber di Portal**: Otorisasi akses aplikasi cabang hanya memakai `sso_apps.targetRoles`. DILARANG membuat tabel/allowlist per pengguna (model `UserAppAccess` / tabel `user_app_accesses`), endpoint `app-access`, atau menu "Kunci Aplikasi". Semua sudah dihapus lewat migrasi `20261105120000_drop_user_app_access`.
2. **Validasi Ulang di Aplikasi Cabang**: Setiap aplikasi cabang wajib punya `ALLOWED_SSO_ROLES` sendiri dan menolak peran asing pada `POST /api/auth/sso` dengan HTTP `403`, termasuk menolak admin aplikasi lain (`FOREIGN_APP_ADMIN_ROLES`).
3. **Konsistensi**: Mengubah `targetRoles` wajib disertai penyesuaian `ALLOWED_SSO_ROLES` di repo aplikasi cabang. Detail aturan ada di `docs/PROJECT_RULES.md` bagian 4.1.

## Database Scripts
1. Skrip database memakai awalan `db:` (`npm run db:seed`, `db:seed:access`, `db:seed:directory`, `db:seed:sliders`, `db:backup`, `db:parity`, `db:preflight`). Alias `prisma:seed*` hanya penerus tipis.
2. Urutan setup database baru: `prisma generate` → `prisma migrate deploy` → `npm run db:seed` → `npm run db:seed:access`.
3. Setiap perubahan `prisma/schema.prisma` wajib disertai folder migrasi baru; verifikasi dengan `prisma migrate diff` yang harus menghasilkan "empty migration".
4. Seeder tidak boleh menimpa `password` pada blok `update`.

## Development Guidelines
1. Gunakan komponen React modular, accessible, dan responsif.
2. Jaga integritas skema Prisma dan relasi antar model.
3. Selalu periksa CORS dan environment variable di `.env`.
4. Jalankan `npm run dev` di root untuk menjalankan client dan server secara bersamaan.
