# ONE UNUSU

**Integrated Digital Campus Platform**
Universitas Nahdlatul Ulama Sumatera Utara (UNUSU)

Portal identitas digital tunggal (SSO) beserta katalog aplikasi terintegrasi, direktori akademik publik, dan panel tata kelola SSO. Seluruh kode berada dalam **satu paket fullstack** di repositori ini.

---

## Teknologi

| Lapisan | Teknologi |
|---|---|
| Frontend | Vite, React 18, TypeScript, Tailwind CSS, Heroicons, React Router 7 |
| Backend | Node.js, Express, TypeScript (entri tunggal `src/server/index.ts`) |
| Database | MySQL melalui Prisma ORM |
| Autentikasi | JWT + otorisasi berbasis izin `resource:action` |

---

## Struktur Direktori

```text
one-unusu/
├── src/
│   ├── client/                 # SPA portal publik + panel SSO
│   │   ├── components/         # layout, section beranda, komponen ui
│   │   ├── data/               # konten statis: academics, services, news, navigation, site
│   │   ├── hooks/              # hook bersama
│   │   ├── lib/                # util & katalog izin (permissions.ts)
│   │   ├── pages/              # Home, Aplikasi, Fakultas, Prodi, Layanan, Bantuan,
│   │   │                       # Keamanan, Login, Dashboard, Profile, admin/*
│   │   └── services/           # klien API (Axios)
│   └── server/
│       └── index.ts            # seluruh endpoint REST API
├── prisma/
│   ├── schema.prisma           # model User, Role, Permission, RolePermission,
│   │                           # SsoApp, SsoAuthToken, Fakultas, Prodi,
│   │                           # LayananKampus, Berita, BannerSlider
│   ├── access-control.ts       # katalog izin + definisi peran sistem
│   ├── seed.ts                 # seed akun, registri aplikasi SSO, izin & peran
│   └── seed-access.ts          # seed izin & peran saja (tanpa data lain)
├── public/assets/              # logo, banner hero, ilustrasi, foto
├── docs/                       # governance: rules, arsitektur, design system, docs per rute
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.server.json
└── package.json
```

---

## Cara Menjalankan

### 1. Instalasi dependensi

```bash
npm install
```

### 2. Konfigurasi environment

Salin `.env.example` menjadi `.env` di root proyek, lalu sesuaikan:

```bash
DATABASE_URL="mysql://root:@localhost:3306/one_unusu_db"
JWT_SECRET="..."
CORS_ORIGIN="http://localhost:5173"
VITE_API_URL="http://localhost:5000/api"
```

### 3. Setup Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

`prisma:seed` membutuhkan `SSO_CLIENT_KEY_*` dan `SEED_PUBLIC_BASE_URL`. Kata sandi superadmin punya nilai bawaan `password123` di `prisma/seed.ts` (`DEFAULT_ADMIN_PASSWORD`); set `SEED_ADMIN_PASSWORD` bila ingin memakai yang lain. Akun demo dosen/mahasiswa hanya dibuat bila `SEED_DEMO_PASSWORD` diset.

Menjalankan ulang seed **tidak** menimpa kata sandi akun yang sudah ada: field `password` hanya dipakai saat akun pertama kali dibuat. Untuk mengganti kata sandi, pakai panel admin atau `PUT /api/auth/profile`.

Bila hanya perlu menyiapkan katalog izin dan peran sistem (gejala: sidebar hanya menampilkan judul "MENU UTAMA" tanpa item), jalankan:

```bash
npm run prisma:seed:access
```

### 4. Jalankan aplikasi

```bash
npm run dev
```

* Frontend: `http://localhost:5173`
* Backend API: `http://localhost:5000/api`
* `/api` diproksi oleh Vite saat mode pengembangan.

---

## Perintah npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan server (tsx watch) dan Vite bersamaan |
| `npm run dev:server` | Hanya backend |
| `npm run dev:client` | Hanya frontend |
| `npm run build` | Build client (`vite build`) lalu server (`tsc`) |
| `npm start` | Menjalankan hasil build di `dist/server/index.js` |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Migrasi development |
| `npm run prisma:seed` | Seed lengkap |
| `npm run prisma:seed:access` | Seed izin, peran, dan pemetaan role pengguna |
| `npm run prisma:seed:directory` | Seed direktori aplikasi non-SSO (`LayananKampus`) |

---

## Aplikasi yang Terdaftar di Repositori Ini

Registri aplikasi SSO ada di `prisma/seed.ts` (tabel `SsoApp`), sedangkan katalog yang tampil di portal publik ada di `src/client/data/services.ts`.

| clientId | Nama | Terintegrasi SSO | Peran yang diizinkan |
|---|---|---|---|
| `unusu-lms` | LMS UNUSU | Ya | DOSEN, MAHASISWA, SUPERADMIN |
| `lppm-unusu` | LPPM UNUSU | Ya | DOSEN, SUPERADMIN |
| `lpm-unusu` | LPM UNUSU | Ya | DOSEN, SUPERADMIN |
| `esurat-unusu` | E-Surat UNUSU | Ya | DOSEN, MAHASISWA, SUPERADMIN |
| `sdm-sarpras-unusu` | SDM & Sarpras | Ya | DOSEN, SUPERADMIN |
| `unusu-akreditasi` | Akreditasi UNUSU | Ya | DOSEN, SUPERADMIN |
| `siakad` | SIAKAD UNUSU | Tidak (tautan eksternal) | Seluruh civitas |

Yang tersedia di repositori ini adalah **registri aplikasi, kredensial klien (`clientKey`), dan alur penerbitan token SSO** — yaitu `POST /api/sso/app-client/:clientId/v2/redirect` dan `POST /api/v2/website/verify-token`. Kode aplikasi terintegrasi tidak berada di dalam repo ini.

---

## Sumber Data Konten

Halaman publik (`/fakultas`, `/prodi`, `/layanan`, `/aplikasi`) membaca konten dari `src/client/data/`:

* `academics.ts` — daftar fakultas dan program studi
* `services.ts` — katalog aplikasi digital
* `news.ts` — berita dan agenda
* `navigation.ts`, `site.ts` — navigasi, identitas, dan tautan eksternal

Model `Fakultas`, `Prodi`, `Berita`, dan `BannerSlider` sudah tersedia di skema Prisma, namun belum memiliki seeder.

Aplikasi non-SSO berada di tabel `LayananKampus` dan di-seed lewat `prisma/directory.ts` (`npm run prisma:seed:directory`). Entri saat ini: SIAKAD UNUSU dan PMB UNUSU. Entri lain ditambahkan melalui panel `/admin/direktori`.

---

## Dokumentasi

* `docs/README.md` — indeks dokumentasi
* `docs/PROJECT_RULES.md` — aturan pengembangan & batasan wajib
* `docs/ARCHITECTURE.md` — arsitektur, alur SSO, dan daftar endpoint
* `docs/design-system/` — token warna, tipografi, komponen, template halaman
* `docs/routes/` — README, RULES, dan CHANGELOG per rute (`public`, `auth`, `dashboard`, `profile`, `admin`)
* `AGENTS.md` — instruksi teknis untuk agen otomatis
