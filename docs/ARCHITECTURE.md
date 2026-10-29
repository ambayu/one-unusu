# ARCHITECTURE — ONE UNUSU

Dokumen arsitektur sistem, peta modul, SSO flow, dan model integrasi data kampus terpadu Universitas Nahdlatul Ulama Sumatera Utara.

---

## 1. Arsitektur Tingkat Tinggi (High-Level Architecture)

ONE UNUSU berperan sebagai **Identity Provider (IdP)** dan **Central SSO Gateway** untuk seluruh aplikasi cabang di lingkungan UNUSU.

```
+-------------------------------------------------------------------------+
|                           CLIENT (Vite + React)                         |
|   +-------------------+  +-------------------+  +-------------------+   |
|   |   Public Portal   |  |   SSO Dashboard   |  |  Admin Registry   |   |
|   |  (Home, Fak, Pro) |  | (Layanan, Biodata)|  |  (Apps, Users)    |   |
|   +-------------------+  +-------------------+  +-------------------+   |
+------------------------------------+------------------------------------+
                                     | Axios API Requests (Bearer Token)
                                     v
+------------------------------------+------------------------------------+
|                         BACKEND (Express + TS)                          |
|   +-------------------+  +-------------------+  +-------------------+   |
|   |  Auth Controller  |  |  SSO v2 Engine    |  |  Profile & Upload |   |
|   +-------------------+  +-------------------+  +-------------------+   |
+------------------------------------+------------------------------------+
                                     | Prisma ORM
                                     v
+------------------------------------+------------------------------------+
|                         DATABASE (MySQL)                                |
|   [User]            [SsoApp]              [SsoAuthToken]   [Role]       |
+-------------------------------------------------------------------------+
```

---

## 2. Alur Kerja Single Sign-On (SSO v2 Protocol)

Setiap aplikasi internal UNUSU (LMS, E-Surat, dsb.) melakukan autentikasi terpusat melalui ONE UNUSU dengan alur:

```
[Civitas Pengguna] ---> Klik "Buka Aplikasi Cabang" di Dashboard SSO
        |
        v
[ONE UNUSU Frontend] ---> GET {API_BASE}/api/sso/app-client/:clientId/v2/redirect
                          (header: Authorization: Bearer <JWT sesi>)
        |
        v
[ONE UNUSU Backend]  (src/server/index.ts)
  1. Verifikasi JWT sesi user lewat middleware `authenticateToken`.
  2. Cari `SsoApp` berdasarkan `clientId`, tolak jika tidak ada atau `isActive = false`.
  3. Baca `targetRoles` (JSON string) dan tolak jika `user.role` tidak termasuk.
  4. Bersihkan `SsoAuthToken` yang kedaluwarsa lebih dari 24 jam.
  5. Terbitkan token acak 64 karakter hex (`crypto.randomBytes(32)`).
  6. Simpan ke tabel `sso_auth_tokens`: token, userId, appId, clientId, expiresAt (+5 menit), isUsed.
  7. Susun `redirectUrl = urlRedirect + "?client_id=...&token=..."`.
        |
        v
[Browser Redirect] ---> Callback aplikasi cabang, mis. https://lms.unusu.ac.id/sso/callback?client_id=...&token=...
        |
        v
[Aplikasi Cabang (LMS)] ---> POST {API_BASE}/api/v2/website/verify-token
                             body: { client_id, client_key, token }
        |
        v
[ONE UNUSU Backend]
  1. Validasi kelengkapan parameter (422 jika kurang).
  2. Cocokkan `client_id` + `client_key` pada `SsoApp` yang aktif (401 jika gagal).
  3. Cari token pada `SsoAuthToken` berdasarkan token + clientId.
  4. Tolak jika `isUsed = true` atau `expiresAt` sudah lewat.
  5. Tandai token sebagai terpakai (single-use) lalu kembalikan data identitas civitas.
        |
        v
[Aplikasi Cabang (LMS)] ---> Terbitkan session lokal untuk pengguna. Login selesai.
```

Catatan implementasi:
- Token SSO bersifat single-use dan berlaku 5 menit.
- Sesi login ONE UNUSU memakai JWT dengan masa berlaku 1 hari.
- Nama model Prisma: `SsoApp` dan `SsoAuthToken` (bukan `SsoAppItem` atau `SsoTicket`).

---

## 3. Peta Komponen & Modul Utama

### 3.1 Layout dan Panel Terautentikasi

1. **`src/client/components/SidebarLayout.tsx`**
   - Layout induk untuk rute `/dashboard`, `/profil`, dan `/admin`.
   - Sidebar memakai permukaan putih dengan border `#D8E5DC`, item aktif berupa pill hijau `#15803D`, ornamen daun sebagai latar, badge `SSO Gateway V2`, dan tombol keluar.
   - Headbar sticky `h-16` berisi breadcrumb, tautan Portal Publik, dan dropdown profil.
   - Menampilkan titik penanda `#B45309` pada ikon menu Biodata (saat sidebar terlipat) jika email atau nomor WhatsApp belum diisi.
2. **`src/client/pages/Dashboard.tsx`**
   - Banner sambutan `#F0FDF4` berisi identitas civitas.
   - Daftar identitas 2 kolom yang menyesuaikan peran: `MAHASISWA` (NIM, prodi, fakultas, status), `DOSEN` (NIDN/NUP, homebase, fakultas, status), `SUPERADMIN` (username, unit kerja, hak akses, status).
   - Katalog aplikasi SSO dengan pratinjau gambar dan tombol buka aplikasi.
   - Direktori portal publik dan banner penutup.
3. **`src/client/pages/Profile.tsx`**
   - Biodata adaptif per peran, form kontak, form keamanan akun, dan modal crop pasfoto 3x4 berlatar merah `#b91c1c`.
4. **`src/client/pages/admin/`** (`RegistrasiSso`, `ManajemenPengguna`, `Izin`, `Peran`)
   - Empat halaman tata kelola SSO yang dibungkus `components/templates/AdminPanelTemplate.tsx`.
   - Navigasi dan rute dibatasi izin `resource:action` melalui `lib/permissions.ts` dan `PermissionRoute` di `App.tsx`.
   - Data bersama diambil dari hook `hooks/useAdminData.ts`.

### 3.2 Halaman Publik dan Autentikasi

5. **`src/client/components/layout/`** (`Topbar`, `Navbar`, `Footer`)
   - Kerangka halaman publik. `Navbar` mendukung dropdown dua level dan mode mobile.
6. **`src/client/pages/`** (`Home`, `Aplikasi`, `Layanan`, `Bantuan`, `Fakultas`, `Prodi`, `Keamanan`, `Login`)
   - Halaman publik dan autentikasi. Detail tiap rute ada di `docs/routes/public/` dan `docs/routes/auth/`.
7. **`src/client/data/navigation.ts`**
   - Sumber tunggal struktur navigasi (`mainNavigation`, `topbarLinks`, `footerQuickLinks`). Setiap item wajib menunjuk rute yang terdaftar di `App.tsx`.

### 3.3 Backend

8. **`src/server/index.ts`**
   - Server Express dengan Prisma ORM. Endpoint yang tersedia:
     - `GET /api/health`
     - `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/profile`
     - `GET /api/sso/apps`, `GET /api/sso/app-client/:clientId/v2/redirect`
     - `POST /api/v2/website/verify-token`
     - `GET /api/admin/stats`, `GET|POST /api/admin/users`
     - `GET|POST /api/admin/apps`, `PUT /api/admin/apps/:id`
     - `GET /api/admin/permissions`, `GET|POST /api/admin/roles`, `PUT /api/admin/roles/:id`, `PUT /api/admin/roles/:id/permissions`, `DELETE /api/admin/roles/:id`
   - Setiap endpoint admin dilindungi middleware `requirePermission(key)`; `permissions` pengguna dikirim pada `POST /api/auth/login` dan `GET /api/auth/me`.
   - Model Prisma: `User`, `Role`, `Permission`, `RolePermission`, `SsoApp`, `SsoAuthToken`, `Fakultas`, `Prodi`, `LayananKampus`, `Berita`, `BannerSlider`.
