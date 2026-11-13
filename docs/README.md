# ONE UNUSU - Documentation Hub

Pusat dokumentasi arsitektur, aturan sistem, design system, dan tata kelola modul ONE UNUSU (Integrated Digital Campus Universitas Nahdlatul Ulama Sumatera Utara).

---

## Struktur Dokumentasi

```
docs/
├── README.md                  - Gambaran umum dokumentasi & cara menjalankan project
├── PROJECT_RULES.md           - Aturan global rekayasa software & integritas sistem
├── ARCHITECTURE.md            - Arsitektur sistem, peta modul, SSO v2 flow, & data flow
├── PERMISSION_DIRECTORY_AND_AUDIT_LOG.md - Analisis Permission Directory & Audit Log
├── uiux.md                    - Dokumen historis vibe coding UI/UX
├── database/
│   └── SCHEMA_MIGRATION_PLAN.md - Rencana & log migrasi skema database
├── design-system/
│   ├── DESIGN_RULES.md        - Filosofi & aturan desain visual UI/UX
│   ├── COLORS.md              - Token warna Modern Green (panel) & brand/gold (portal publik)
│   ├── TYPOGRAPHY.md          - Skala & aturan Plus Jakarta Sans
│   ├── COMPONENTS.md          - Registri komponen bersama (Shared Components)
│   └── PAGE_TEMPLATES.md      - Registri template halaman & tata kelola template
└── routes/
    ├── public/                - Rute publik: beranda, katalog, direktori akademik
    ├── auth/                  - Rute autentikasi SSO (/login, /register)
    ├── dashboard/             - Dokumentasi rute Dashboard SSO
    ├── profile/               - Dokumentasi rute Biodata & Pasfoto 3x4
    └── admin/                 - Dokumentasi rute Pengaturan & Otoritas SSO
```

Setiap folder di `docs/routes/` berisi tiga berkas: `README.md` (tujuan & alur data), `RULES.md` (aturan wajib), dan `CHANGELOG.md` (riwayat perubahan).

**Tidak ada berkas `AGENTS.md`, `CLAUDE.md`, atau `GEMINI.md` di root aplikasi.** Seluruh aturan hidup di dalam `docs/` agar tidak ada dua sumber kebenaran yang bisa saling bertentangan.

---

## Menjalankan Project

### Prerequisites
- Node.js >= 18
- MySQL Server (Database: `one_unusu_db`)
- npm

### Development
```bash
# Frontend Vite + backend Express berjalan bersamaan
npm run dev:all

# Hanya backend (tsx watch)
npm run dev

# Hanya frontend (Vite)
npm run dev:client
```

> **Port tetap.** Dev client memakai port `5178` dengan `strictPort: true`. Bila port sedang dipakai, Vite gagal dengan jelas alih-alih diam-diam pindah port - karena URL callback SSO di database menunjuk angka yang pasti.

### Production Build & Run
```bash
# Build client (Vite) dan server (TypeScript)
npm run build

# Menjalankan server production
node dist/server/index.js
```

> Build produksi dan migrasi database dijalankan manual oleh pemilik proyek. Jangan menjalankan `npm run build` atau `prisma migrate dev` sebagai bagian dari perubahan kode biasa.

### Seeder & Sinkronisasi Database
```bash
# Seeder lengkap (SSO Users, Apps, Access Control, Direktori, Slider)
npm run db:seed
```

> **Sinkronisasi izin.** Tidak ada script khusus untuk menyemai izin. Katalog izin resmi berada di `PERMISSION_CATALOG` (`src/server/lib/accessControl.ts`) dan disemai oleh `seedAccessControl()` yang dipanggil dari `npm run db:seed`. Untuk menyelaraskan katalog ke database yang sedang berjalan tanpa seed ulang, gunakan endpoint `POST /api/admin/permissions/sync` (butuh izin `permission:edit`); endpoint ini sekaligus membersihkan izin usang.

> **Otorisasi aplikasi cabang.** Portal memakai izin masuk **global** (`masuk_admin`, `masuk_dosen`, `masuk_mahasiswa`) diiriskan dengan `sso_apps.targetRoles`; server aplikasi cabang memakai `ALLOWED_SSO_ROLES`. Tabel `user_app_accesses` dan menu "Kunci Aplikasi" sudah dihapus - lihat `docs/PROJECT_RULES.md` bagian 4.1.

---

## Konvensi Tim
1. **Aturan Prioritas Tertinggi**: Baca `docs/PROJECT_RULES.md` lalu `docs/ARCHITECTURE.md` sebelum memulai pekerjaan apa pun. Untuk pekerjaan UI, lanjutkan ke `docs/design-system/DESIGN_RULES.md`.
2. **Build Once, Reuse Everywhere**: Setiap halaman terikat pada template halaman yang sesuai (`docs/design-system/PAGE_TEMPLATES.md`). Dilarang menduplikasi struktur halaman dari scratch.
3. **SSO Central Protocol**: ONE UNUSU adalah identitas induk (Single Sign-On). Seluruh tiket token menggunakan format `one_token_*` terpusat.
4. **Dokumentasi ikut berubah**: perubahan kode yang menetapkan pola baru wajib disertai pembaruan `RULES.md` dan `CHANGELOG.md` pada rute terkait.
