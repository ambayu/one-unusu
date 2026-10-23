# ONE UNUSU

**Integrated Digital Campus Platform**  
Universitas Nahdlatul Ulama Sumatera Utara (UNUSU)

---

## 🚀 Arsitektur & Teknologi

Proyek ini menggunakan arsitektur **Fullstack Monorepo Ringan**:
* **Frontend (`client/`)**: Vite React 18, TypeScript, Tailwind CSS, Lucide Icons, React Router v6.
* **Backend (`server/`)**: Node.js Express, TypeScript, Prisma ORM.
* **Database**: MySQL (`one_unusu_db`).

---

## 📁 Struktur Direktori

```text
one-unusu/
├── client/              # Frontend Web Portal (Vite React)
│   ├── src/
│   │   ├── components/  # Navbar, Footer, Mega Menu
│   │   ├── pages/       # Home, Fakultas, Prodi, Layanan, Berita
│   │   └── services/    # Axios API Client
│   └── package.json
├── server/              # Backend REST API (Node.js + Prisma)
│   ├── src/             # Express API Controllers & Routes
│   ├── prisma/          # schema.prisma & seeder 6 Fakultas & 14 Prodi
│   └── package.json
└── package.json         # Root orchestration (concurrently dev)
```

---

## ⚡ Cara Menjalankan

### 1. Instalasi Dependensi
Jalankan di root folder:
```bash
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Setup Database & Prisma (Server)
Copy file `.env.example` ke `.env` di folder `server/`:
```bash
cp server/.env.example server/.env
```
Sesuaikan konfigurasi database MySQL di `server/.env`, lalu jalankan:
```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

### 3. Jalankan Aplikasi
Jalankan secara bersamaan dari root folder:
```bash
npm run dev
```
* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:5000/api`

---

## 🌐 Modul Ekosistem Terkait
Layanan terintegrasi yang beroperasi di repositori terpisah:
* `lms-unusu`: E-learning & ruang belajar digital.
* `esurat-unusu`: Persuratan dinas & disposisi digital.
* `sdm-sarpras-unusu`: Kepegawaian & sarana prasarana.
* `lpm-lppm-unusu`: Penjaminan mutu & LPPM riset.
