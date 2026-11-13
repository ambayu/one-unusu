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
  3. Baca `targetRoles` (JSON string), petakan ke tingkat masuk yang diterima, lalu putuskan lewat `decideAppAccess(permissionKeys, targetRoles, roleCodes)`. Tolak `403` bila tidak lolos.
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

### 2.1 Model Otorisasi Aplikasi Cabang (Dua Lapis)

Otorisasi akses aplikasi cabang **tidak** memakai tabel allowlist per pengguna. Tabel `user_app_accesses` (model `UserAppAccess`) sudah dihapus lewat migrasi `20261105120000_drop_user_app_access`, beserta endpoint `/api/admin/app-access`, `/api/admin/users/:id/app-access`, `/api/admin/apps/:id/access`, halaman `/admin/akses-aplikasi`, dan seeder `prisma/seed-app-access.ts`.

| Lapis | Lokasi | Peran | Ditegakkan pada |
|---|---|---|---|
| 1. Portal | Izin masuk global (`masuk_admin`/`masuk_dosen`/`masuk_mahasiswa`) + `sso_apps.targetRoles`, diputuskan `decideAppAccess()` di `src/server/index.ts` | Menentukan ikon mana yang tampil dan tiket mana yang boleh terbit | `/api/sso/apps`, `/api/auth/panel-access`, `/api/sso/app-client/:clientId/v2/redirect`, `/api/v2/website/verify-token` |
| 2. Aplikasi cabang | `ALLOWED_SSO_ROLES` di server masing-masing aplikasi | Menolak peran yang tidak berhak masuk panel cabang | `POST /api/auth/sso` & middleware otorisasi cabang |

Cara kerja lapis 1 secara ringkas:

1. Pengguna memegang salah satu (atau beberapa) izin masuk global pada tabel `permissions` lewat `role_permissions`. Kunci izinnya **tidak** berprefiks `clientId`.
2. Aplikasi memiliki `targetRoles`, yang dipetakan ke tingkat masuk oleh `tingkatDiterimaAplikasi()`: peran `ADMIN_*`/`SUPERADMIN`/`ADMIN_SSO` → `admin`, `DOSEN` → `dosen`, `MAHASISWA` → `mahasiswa`.
3. `decideAppAccess()` meloloskan bila irisan kedua himpunan tidak kosong. Untuk tingkat `admin`, pemegang `masuk_admin` tetap wajib memiliki peran yang tercantum di `targetRoles` atau peran berawalan `ADMIN_`, sehingga admin suatu unit tidak otomatis masuk ke unit lain.
4. `SUPERADMIN` dan `ADMIN_SSO` selalu lolos tanpa pemeriksaan izin.

Konsekuensi yang disengaja:
- Ikon di portal adalah cermin dari keputusan `decideAppAccess()` yang sama dengan yang menegakkan tiket. Bila `targetRoles` meleset, login tetap ditolak lapis ke-2 - jadi ketidaksesuaian dianggap bug.
- Isolasi admin unit (mis. `ADMIN_LPM` tidak boleh masuk panel LPPM) dijaga oleh kombinasi `targetRoles` di lapis 1 dan `FOREIGN_APP_ADMIN_ROLES` di lapis 2, seperti pada `lppm-unusu`.
- Menambah peran baru ke sebuah aplikasi berarti mengubah `targetRoles` (seed / panel Registrasi SSO) **dan** `ALLOWED_SSO_ROLES` di repo aplikasi cabang terkait. Izin masuk global **tidak** perlu ditambah, karena cakupannya sudah lintas aplikasi.


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
- **`src/client/pages/admin/RegistrasiSso.tsx`**: Modul Registrasi SSO yang mengelola pendaftaran dan konfigurasi aplikasi cabang Single Sign-On ONE UNUSU, dilindungi permission independen `application:menu`, `application:view`, `application:edit`, dan `application:delete`.
- **`src/client/pages/admin/`** (`RegistrasiSso`, `ManajemenPengguna`, `Izin`, `Peran`)
   - Empat halaman tata kelola SSO yang dibungkus `components/templates/AdminPanelTemplate.tsx`.
   - Navigasi dan rute dibatasi izin `resource:action` melalui `lib/permissions.ts` dan `PermissionRoute` di `App.tsx`.
   - Dokumentasi lengkap arsitektur Permission Directory dan Audit Log dapat dilihat pada `docs/PERMISSION_DIRECTORY_AND_AUDIT_LOG.md`.
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
   - `GET /api/sso/apps` mengembalikan **semua** aplikasi aktif beserta penanda `isAllowed` yang dihitung oleh `decideAppAccess()`. Penyaringan keras diterapkan pada `GET /api/sso/app-client/:clientId/v2/redirect` dan `POST /api/v2/website/verify-token` yang menolak `403` bila keputusan tidak lolos.
   - Izin dibaca dari relasi `User.roleId → Role → RolePermission → Permission`. Karena itu `User.roleId` wajib terisi; kolom enum `User.role` hanya dipakai saat seeding.
   - Katalog izin resmi dan seeder-nya berada di satu tempat: `PERMISSION_CATALOG` dan `seedAccessControl()` pada `src/server/lib/accessControl.ts`. Penyelarasan ke database dijalankan lewat endpoint `POST /api/admin/permissions/sync` (butuh izin `permission:edit`).
   - Model Prisma: `User`, `Role`, `Permission`, `RolePermission`, `SsoApp`, `SsoAuthToken`, `AuditLog`, `Fakultas`, `Prodi`, `LayananKampus`, `Berita`, `BannerSlider`. Model `UserAppAccess` sudah dihapus.
