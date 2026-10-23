# ONE UNUSU - Engineering Instructions

## Project
ONE UNUSU - Integrated Digital Campus
Universitas Nahdlatul Ulama Sumatera Utara

## Technology Stack
- Frontend (`client/`): Vite + React 18, TypeScript, Tailwind CSS, Lucide Icons
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
- LMS UNUSU: Mandiri di repositori `lms-unusu` (migrasi modul LMS dari `sin-unusu`)
- E-Surat UNUSU: Mandiri di repositori `esurat-unusu`
- SDM & Sarpras UNUSU: Mandiri di repositori `sdm-sarpras-unusu`
- LPM & LPPM UNUSU: Mandiri di repositori `lpm-lppm-unusu`

## Development Guidelines
1. Gunakan komponen React modular, accessible, dan responsif.
2. Jaga integritas skema Prisma dan relasi antar model.
3. Selalu periksa CORS dan environment variable di `server/.env`.
4. Jalankan `npm run dev` di root untuk menjalankan client dan server secara bersamaan.
