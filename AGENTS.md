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

## Development Guidelines
1. Gunakan komponen React modular, accessible, dan responsif.
2. Jaga integritas skema Prisma dan relasi antar model.
3. Selalu periksa CORS dan environment variable di `server/.env`.
4. Jalankan `npm run dev` di root untuk menjalankan client dan server secara bersamaan.
