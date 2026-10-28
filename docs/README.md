# ONE UNUSU — Documentation Hub

Pusat dokumentasi arsitektur, aturan sistem, design system, dan tata kelola modul ONE UNUSU (Integrated Digital Campus Universitas Nahdlatul Ulama Sumatera Utara).

---

## 📁 Struktur Dokumentasi

```
docs/
├── README.md                  ← Gambaran umum dokumentasi & cara menjalankan project
├── PROJECT_RULES.md           ← Aturan global rekayasa software & integritas sistem
├── ARCHITECTURE.md            ← Arsitektur sistem, peta modul, SSO v2 flow, & data flow
├── uiux.md                    ← Dokumen historis vibe coding UI/UX
├── design-system/
│   ├── DESIGN_RULES.md        ← Filosofi & aturan desain visual UI/UX
│   ├── COLORS.md              ← Token warna Modern Green (panel) & brand/gold (portal publik)
│   ├── TYPOGRAPHY.md          ← Skala & aturan Plus Jakarta Sans
│   ├── COMPONENTS.md          ← Registri komponen bersama (Shared Components)
│   └── PAGE_TEMPLATES.md      ← Registri template halaman & tata kelola template
└── routes/
    ├── public/                ← Rute publik: beranda, katalog, direktori akademik
    ├── auth/                  ← Rute autentikasi SSO (/login)
    ├── dashboard/             ← Dokumentasi rute Dashboard SSO
    ├── profile/               ← Dokumentasi rute Biodata & Pasfoto 3x4
    └── admin/                 ← Dokumentasi rute Pengaturan & Otoritas SSO
```

---

## 🚀 Menjalankan Project

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

### Production Build & Run
```bash
# Build client (Vite) dan server (TypeScript)
npm run build

# Menjalankan server production
node dist/server/index.js
```

---

## 🏛️ Konvensi Tim
1. **Aturan Prioritas Tertinggi**: Baca `AGENTS.md` di root dan `docs/PROJECT_RULES.md` sebelum memulai pekerjaan apa pun.
2. **Build Once, Reuse Everywhere**: Setiap halaman terikat pada template halaman yang sesuai. Dilarang menduplikasi struktur halaman dari scratch.
3. **SSO Central Protocol**: ONE UNUSU adalah identitas induk (Single Sign-On). Seluruh tiket token menggunakan format `one_token_*` terpusat.
