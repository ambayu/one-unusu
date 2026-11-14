# PROJECT RULES  -  ONE UNUSU

Dokumen ini berisi aturan global mutlak yang berlaku di seluruh modul, halaman, API endpoint, dan komponen ONE UNUSU.

---

## 1. Aturan Tata Kelola Halaman & Template (Mandatory)

> **"Every page must use the correct page template and shared components. Dashboard must use its own dashboard template. Duplicating UI structure that already exists in a shared template is forbidden."**

1. **Dashboard Khusus**: Dashboard (`/dashboard`) memiliki arsitektur dan template visual sendiri (`DashboardLayout`). Dilarang mengubah dashboard menjadi halaman tabel CRUD atau mewarisi struktur halaman lain.
2. **Reuse Shared Components**: Elemen UI berulang (header, card, input, button, badge, modal) wajib menggunakan komponen bersama yang terdaftar di `docs/design-system/COMPONENTS.md`.
3. **Konfigurasi, Bukan Duplikasi**: Setiap rute halaman hanya bertanggung jawab atas data, kolom, aksi, handler, dan business logic uniknya. Struktur visual berasal dari shared template.

---

## 2. Aturan Form Section Layout (Part 10.8)

1. **Labels & Fields Inside Card**: Setiap kelompok isian form (Personal Info, Kontak, Upload Foto, Keamanan) **wajib dibungkus di dalam kartu (`bg-white rounded-[16px] border border-[#D8E5DC] p-6`)**.
2. **Dilarang Form Mengambang**: Dilarang meletakkan label, input, atau grup form langsung di atas background halaman polos tanpa card container.
3. **Card Heading Wajib**: Setiap card form harus memiliki heading section yang jelas di bagian atas.
4. **Action Button Placement**: Tombol aksi (Submit / Batal) diletakkan di luar/bawah card atau di dalam action bar khusus, bukan mengambang tanpa penahan visual.

---

## 3. Aturan Desain & Visual UI (Modern Green Palette)

1. **Palette Terikat Ketat**:
   - Primary Green: `#166534` (Aksi utama, tombol, navigasi aktif)
   - Deep Green: `#14532D` (Hover tombol primer, teks judul hijau)
   - Secondary Green: `#15803D`
   - Accent Green: `#22C55E` (Indikator status aktif, aksen border)
   - Soft Green: `#DCFCE7` (Badge, wadah icon, text highlight)
   - Pale Green: `#F0FDF4` (Welcome banner, header tabel, highlight section)
   - Main Background: `#F1F5F2` (Off-white kehijauan lembut; dilarang background putih polos di seluruh view)
   - Surface / Card: `#FFFFFF`
   - Main Text: `#1E293B`
   - Secondary Text: `#475569`
   - Border: `#D8E5DC` (Border kehijauan lembut)
2. **Typography**: Menggunakan font utama **Plus Jakarta Sans**. Skala heading 28 - 32px (Page title), 20 - 24px (Section), 14 - 16px (Body), 14px weight 600 (Button).
3. **Anti-Sparkles Rule**: DILARANG keras menggunakan icon `sparkles` (`Sparkles`, `SparklesIcon`, dsb). Gunakan icon fungsional spesifik dari `@heroicons/react`.
4. **Elevation**: Hindari shadow tebal; gunakan border `#D8E5DC` yang presisi dan shadow sangat halus (`shadow-sm`). Kelas `shadow-xs`, `shadow-2xs`, dan `shadow-brand` TIDAK ada di Tailwind 3.4 dan dilarang dipakai karena tidak menghasilkan efek apa pun.
5. **Radius**: Konsisten antara `8px` (button/input), `10px` (badge/icon-box), `12px` (dropdown), dan `16px` (card utama).
6. **Palet per Permukaan**: Panel SSO (`/dashboard`, `/profil`, `/admin`, `/login`) memakai token Modern Green di `docs/design-system/COLORS.md`. Portal publik (`/`, `/aplikasi`, `/layanan`, `/bantuan`, `/fakultas`, `/prodi`, `/keamanan`) memakai token `brand` dan `gold` di `tailwind.config.js`. Dilarang mencampur kedua palet dalam satu halaman, dan dilarang menambah kode HEX baru langsung di kelas Tailwind.
7. **Efek Dekoratif**: `backdrop-blur`, gradien, dan glow hanya dipakai jika punya alasan fungsional (keterbacaan teks di atas foto, pemisah lapisan). Maksimal satu atau dua elemen per layar.

---

## 4. Aturan Fungsional & Bisnis SSO

1. **Biodata Gate on App Launch**: Pengguna yang baru login SSO selalu diarahkan ke panel (`/dashboard` untuk DOSEN & MAHASISWA, `/admin` untuk SUPERADMIN), bukan ke halaman biodata. Kelengkapan Email dan nomor WhatsApp diperiksa saat pengguna membuka aplikasi SSO: bila belum lengkap, pengguna dialihkan ke `/profil` dengan notifikasi modal dan tiket SSO tidak diterbitkan. Dashboard tetap menampilkan warning banner selama biodata belum lengkap.
2. **Pasfoto Resmi 3x4 Merah**: Mahasiswa dan dosen wajib memiliki pasfoto 3x4 dengan latar belakang merah pekat (`#b91c1c` / red-700) yang dapat di-crop interaktif di browser.
3. **Pemisahan Peran Civitas**:
   - `MAHASISWA`: Menampilkan data NIM, Program Studi, Fakultas, dan link perkuliahan.
   - `DOSEN`: Menampilkan data NIDN/NUP, Homebase Prodi, dan Fakultas Induk.
   - `SUPERADMIN`: Menampilkan Username, Unit Kerja PUSTIK, hak akses Root SSO, dan tab Registry SSO Apps & Civitas User Management.
4. **SSO Ticket Protocol**: Otorisasi ke aplikasi turunan (LMS, SIAKAD, dsb) wajib menggunakan `GET /api/sso/app-client/:clientId/v2/redirect`. Endpoint ini menerbitkan token acak 64 karakter, single-use, berlaku 5 menit, dan disimpan di tabel `sso_auth_tokens`. Verifikasi dilakukan server-ke-server melalui `POST /api/v2/website/verify-token` dengan `client_id`, `client_key`, dan `token`.

5. **Sinkronisasi SIAKAD (Hybrid Sync & JIT Provisioning)**:
   - **JIT Provisioning On-Demand**: Jika pengguna mencoba login dengan kredensial SIAKAD namun belum terdaftar di `one-unusu`, sistem backend wajib memvalidasi ke API SIAKAD (`POST /auth/index.php`), menyedot data profil mahasiswa/dosen dari portal SIAKAD, menyimpannya ke database lokal secara otomatis, dan langsung meloloskan sesi pengguna.
   - **Multi-Stage UX Progresif**: Tombol login pada antarmuka pengguna (`Login.tsx`) wajib menyajikan teks status dinamis bertahap saat autentikasi berlangsung, mencegah pengguna mengira sistem membeku atau melempar penolakan palsu.
   - **Batch Sync Terpusat**: Modul Manajemen Pengguna (`/admin/pengguna`) menyediakan tombol sinkronisasi massal direktori dosen dari portal akademik SIAKAD dengan sifat idempotent (membuat akun baru / memperbarui akun lama tanpa menimpa data kredensial aktif).

### 4.1 Aturan Otorisasi Aplikasi Cabang & Model Peran (Permission-First, Mandatory)

Otorisasi akses ke aplikasi cabang menganut prinsip **Permission-First dengan dua sumbu**: izin masuk global milik pengguna **dan** daftar peran target milik aplikasi. Keduanya harus bersinggungan.

1. **Model Peran Pengguna Dinamis (many-to-many via `user_roles`)**:
   - Kolom enum `users.role` **sudah dihapus** (migrasi `20261109100200_backfill_user_roleid`).
   - Kolom tunggal `users.role_id` **juga sudah dihapus** (migrasi `20261109110000_multi_role_user_roles`). Satu pengguna kini dapat memegang lebih dari satu peran melalui tabel junction `user_roles` (model `UserRole`, unik pada pasangan `(userId, roleId)`).
   - **Dilarang** merujuk `User.roleId` di kode, dokumentasi, atau endpoint baru. Yang benar: baca relasi `User.roles` (array `UserRole`) lalu ambil `role.code` tiap peran.
   - Peran admin cabang kaku (`ADMIN_LPM`, `ADMIN_LPPM`, `ADMIN_ESURAT`, `ADMIN_SARPRAS`, `ADMIN_AKREDITASI`, `ADMIN_LMS`, `ADMIN_PRODI`) **sudah dihapus** (migrasi `20261109100300_drop_app_admin_roles`).
   - Platform hanya menyemai 4 peran bawaan sistem: `SUPERADMIN`, `ADMIN_SSO`, `DOSEN`, dan `MAHASISWA`.
   - Peran kustom untuk unit/fakultas/staf dibuat secara dinamis oleh Super Administrator melalui panel **Peran & Izin** (`/admin/peran`), kemudian ditautkan ke civitas pada panel **Manajemen Pengguna** (`/admin/pengguna`).
2. **Izin Masuk Global (3 kunci, berlaku lintas aplikasi)**:
   - Terdapat tepat **tiga** kunci izin masuk: `masuk_admin`, `masuk_dosen`, dan `masuk_mahasiswa`.
   - Kunci ini **tidak** memakai prefiks `clientId`. Satu izin yang sama berlaku untuk seluruh aplikasi cabang; pembeda antar-aplikasi adalah `sso_apps.targetRoles`, bukan nama kunci.
   - Ketiganya didefinisikan di `PERMISSION_CATALOG` (`src/server/lib/accessControl.ts`) dengan `resource: "akses"`, sehingga kunci izinnya adalah `action` itu sendiri tanpa prefiks `resource:`. Aturan pembentukan kunci ini berlaku seragam di `syncPermissions()` dan `cleanObsoletePermissions()`.
   - Lencana peran bawaan diperoleh dari `tingkatMasukBawaan(kodePeran)`: `SUPERADMIN` dan `ADMIN_SSO` memegang ketiga tingkat; peran kustom berawalan `ADMIN_` hanya memegang `masuk_admin`; `DOSEN` memegang `masuk_dosen`; `MAHASISWA` memegang `masuk_mahasiswa`; peran lain tidak memegang apa pun.
3. **Pemetaan Tingkat Masuk dari `targetRoles`**:
   - `targetRoles` pada `sso_apps` (JSON array string) dipetakan ke tingkat masuk oleh `tingkatDiterimaAplikasi()`:
     - Memuat peran berawalan `ADMIN_`, atau `SUPERADMIN`, atau `ADMIN_SSO` -> menerima tingkat `admin`.
     - Memuat `DOSEN` -> menerima tingkat `dosen`.
     - Memuat `MAHASISWA` -> menerima tingkat `mahasiswa`.
   - Konsekuensi: aplikasi tanpa `targetRoles` yang sah **menolak semua pengguna** (fail-closed).
4. **Fungsi Keputusan: `decideAppAccess(permissionKeys, targetRolesRaw, userRoleCodes)`**:
   - Ditandatangani tiga argumen dan berada di `src/server/index.ts`.
   - `SUPERADMIN` dan `ADMIN_SSO` **selalu** diizinkan dengan `tingkat: ["admin"]`, tanpa memeriksa izin.
   - Selain itu, keputusan lolos bila ada irisan antara tingkat yang dimiliki pengguna (`masuk_*`) dan tingkat yang diterima aplikasi. Khusus tingkat `admin`, pengguna juga wajib memiliki peran yang tercantum di `targetRoles` atau peran berawalan `ADMIN_` - sehingga pemegang `masuk_admin` tidak otomatis merangsek ke aplikasi unit lain.
   - Fungsi ini dipakai pada empat titik: `GET /api/sso/apps` (penanda `isAllowed`), `GET /api/auth/panel-access`, `GET /api/sso/app-client/:clientId/v2/redirect` (penegakan `403`), dan `POST /api/v2/website/verify-token`.
5. **Pemberian Hak Akses di Portal**:
   - Super Administrator mengatur hak masuk aplikasi maupun hak fitur per sub-menu dengan menghubungkan permission ke role pada tabel `role_permissions`.
   - Tiket SSO (`POST /api/v2/website/verify-token`) mengirimkan data `access: { allowed, tingkat, permissions }` serta `user.role` (berasal dari `roleRef.code`).
6. **Validasi Berbasis Permission di Aplikasi Cabang**:
   - Aplikasi cabang **DILARANG mengecek nama peran mentah (`role === 'ADMIN_...'`)** untuk otorisasi.
   - Pintu masuk cabang memeriksa `data.access.allowed` dan `data.access.tingkat` (apakah memuat `admin`, `dosen`, atau `mahasiswa`).
   - Otorisasi fitur per sub-menu menegakkan izin fitur (contoh: `lppm:penelitian:create`, `sarpras:aset:delete`, dsb.) yang diteruskan oleh token SSO.
7. **Fail-Closed**: Akun pengguna yang belum ditautkan ke peran mana pun (relasi `User.roles` kosong) atau tidak memiliki izin masuk ke aplikasi tujuan akan ditolak dengan HTTP `403`.
8. **Penyesuaian Katalog Izin**:
   - Katalog resmi hidup di `PERMISSION_CATALOG` (`src/server/lib/accessControl.ts`) dan disemai oleh `seedAccessControl()`.
   - Endpoint `POST /api/admin/permissions/sync` menyinkronkan katalog ke database **dan** membersihkan izin usang sekaligus.
   - Endpoint `POST /api/admin/permissions/cleanup` hanya melaporkan/menghapus izin yatim. Ia **wajib** memakai aturan pembentukan kunci yang sama dengan `accessControl.ts`; membentuk kunci dengan cara berbeda akan membuat izin usang lolos dari pembersihan.

### 4.2 Aturan URL Callback Aplikasi Cabang (Local Dev vs VPS / Produksi)

URL redirect / callback SSO aplikasi satelit dikonfigurasi berdasarkan lingkungan target:

1. **Pemetaan Lingkungan**:
   - **Mode Lokal (`local`)**: Setiap aplikasi satelit berjalan di port Vite mandiri (`http://localhost:5175` s.d. `5181`). Nilai `urlRedirect` di tabel `sso_apps` harus mengarah ke port lokal masing-masing (`http://localhost:517x/sso/callback`).
   - **Mode VPS / Produksi (`vps`)**: Seluruh aplikasi satelit diakses via reverse-proxy Nginx sub-path di bawah domain utama (`{PUBLIC_BASE_URL}/{app}/sso/callback`), kecuali Portal Prodi yang memiliki multi-domain mandiri (`{PRODI_BASE_URL}/sso/callback`).
2. **Skrip Penyelaras Database**:
   - `npm run db:sso-dev-urls`: Memperbarui seluruh `urlRedirect` di database lokal menjadi port localhost.
   - `npm run db:sso-vps-urls`: Memperbarui seluruh `urlRedirect` di database menjadi URL domain VPS.
   - `npm run db:seed:local` / `npm run db:seed:vps`: Menjalankan seeder dengan target lingkungan eksplisit.
3. **Penyelarasan Kode Sumber**:
   - Fungsi `buildSsoAppDefinitions` di `src/server/lib/ssoApps.ts` mendeteksi mode secara otomatis (`isLocalMode`) bila parameter `mode === "local"`, env `SSO_ENV === "local"`, atau bila `publicBaseUrl` mengandung string `localhost`.

---

## 5. Aturan Keamanan, Database, & Kode

1. **No Persona Inside Code**: Dilarang memasukkan joke, slang, watermark, atau persona apa pun ke dalam source code, komentar kode, API response, atau basis data.
2. **Secret Safety**: Jangan membocorkan `.env`, API key, hash kata sandi, token JWT, atau kredensial database ke output client atau logging.
3. **Database Safety**: Operasi destruktif (`DROP`, `TRUNCATE`, bulk delete) dilarang keras tanpa persetujuan eksplisit.
4. **Type Safety**: Kode TypeScript harus bersih, hindari penggunaan `any` atau `@ts-ignore` tanpa alasan defensif yang valid.
5. **Typecheck Wajib Mencakup Server**: `tsconfig.json` (client) hanya meng-include `src/client/**`, sedangkan `tsconfig.server.json` meng-include `src/server/**/*` dan sudah dipakai `build:server`.
   - **Pemeriksaan lengkap: `npm run typecheck`** (client + server). Terpisah: `npm run typecheck:client` dan `npm run typecheck:server`.
   - `typecheck:server` **wajib** memakai `--noEmit`. `tsconfig.server.json` punya `outDir: "./dist/server"`, sehingga perintah tanpa `--noEmit` akan MENULIS file kompilasi, bukan sekadar memeriksa.
   - **Dilarang** menyatakan pekerjaan server selesai hanya karena `npx tsc --noEmit` bersih - perintah itu memakai `tsconfig.json` dan tidak melihat satu baris pun kode server.
   - Alasan aturan ini: opsi Prisma yang tidak ada untuk provider MySQL (mis. `mode: "insensitive"` pada `StringNullableFilter`) hanya tertangkap bila `tsconfig.server.json` benar-benar dijalankan.

### 5.1 Lapisan Hardening Server (Wajib Dipertahankan)
1. **Security Header**: `helmet` wajib aktif. CSP membatasi `script-src 'self'`; `img-src` mengizinkan `data:` karena ikon disimpan sebagai data URL base64.
2. **CORS Allowlist**: Origin hanya diterima bila terdaftar di `CORS_ORIGIN` (dipisah koma). Bila variabel kosong, hanya origin lokal yang lolos. Dilarang mengembalikan `origin: true`.
3. **Batas Payload Berlapis**: Body parser global dibatasi `1mb`; hanya route `POST/PUT /api/admin/apps` dan `PUT /api/auth/profile` yang memakai `50mb` untuk gambar base64.
4. **Rate Limiting**: `POST /api/auth/login` maksimal 10 percobaan gagal per 15 menit per IP (`skipSuccessfulRequests`), `POST /api/v2/website/verify-token` 120/menit, operasi tulis admin 60/menit, dan limiter global 300/menit untuk seluruh `/api`.
5. **Token Hanya dari Header**: `authenticateToken` menerima token **hanya** dari `Authorization: Bearer`. Token via query string ditolak karena mudah bocor lewat access log dan `Referer`. Algoritma JWT dipatok ke `HS256`.
6. **Tidak Membocorkan Detail Error**: Respons klien selalu pesan generik. Detail error hanya ditulis ke log server via `logServerError()`. Dilarang menyertakan `error.message` di response.
7. **Validasi URL Keluar**: Semua URL yang dirender menjadi tautan (`urlTarget`, `urlRedirect`) wajib lolos `normalizeHttpUrl()` (hanya `http`/`https`), untuk mencegah `javascript:` XSS.
8. **Fail-Closed**: Konfigurasi tidak valid (mis. `targetRoles` bukan JSON array peran yang dikenal) harus menolak akses, bukan membuka akses.
9. **Anti Eskalasi Hak Akses**: Saat memperbarui izin sebuah peran, pengguna hanya boleh memberikan izin yang memang sudah dimilikinya sendiri.
10. **Single-Use Token Atomik**: Pembakaran token SSO memakai `updateMany` dengan kondisi `isUsed: false` dan `expiresAt > now` di dalam `WHERE` agar dua request paralel tidak dapat memakai token yang sama.
11. **Tanpa Kunci Aplikasi per Pengguna**: Tabel `user_app_accesses` sudah dihapus (migrasi `20261105120000_drop_user_app_access`). Dilarang membuat kembali tabel, model, endpoint, atau halaman panel bertema "Kunci Aplikasi". Otorisasi aplikasi cabang mengikuti aturan bagian 4.1.
12. **Seed Idempoten Tanpa Menimpa Kata Sandi**: Blok `update` pada seeder dilarang menyertakan `password`. Kata sandi hanya ditulis pada `create`, agar seed ulang tidak mereset kredensial yang sudah diubah lewat panel admin.

### 5.2 Konvensi Skrip Database (Mandatory)

1. **Penamaan Skrip**: Seluruh skrip database memakai awalan `db:` (`db:seed`, `db:seed:local`, `db:seed:vps`, `db:sso-dev-urls`, `db:sso-vps-urls`, `db:preflight`, `db:parity`, `db:backup`, `db:verify:post`, `db:cleanup:tokens`, `db:purge:audit`). Alias lama `prisma:seed*` dan `prisma:sso-*` dipertahankan hanya sebagai penerus tipis ke `db:*`. Penyemaian izin tidak punya script tersendiri: dilakukan oleh `seedAccessControl()` di dalam `db:seed`, atau lewat endpoint `POST /api/admin/permissions/sync`.
2. **Urutan Bootstrapping Database Baru**: `prisma generate` -> `prisma migrate deploy` -> `npm run db:seed`. Penyemaian katalog izin, peran sistem, dan relasinya sudah tercakup di langkah `db:seed`. Untuk database yang sudah berisi skema tanpa riwayat migrasi, lakukan baseline dengan `prisma migrate resolve --applied` per folder migrasi, bukan dengan menghapus tabel.
3. **Paritas Skema**: Setiap perubahan `prisma/schema.prisma` wajib disertai folder migrasi baru. `prisma migrate diff --from-url <DB> --to-schema-datamodel prisma/schema.prisma --script` harus menghasilkan "empty migration" sebelum pekerjaan dianggap selesai.
4. **Migrasi dengan Hint DDL**: Sintaks `ALGORITHM`/`LOCK` hanya sah pada `ALTER TABLE`, tidak pada `CREATE INDEX` mandiri. Gunakan `ALTER TABLE ... ADD INDEX ... ALGORITHM=INPLACE, LOCK=NONE` bila hint memang diperlukan.

---

## 7. Aturan Notifikasi, Dialog & Modal Sistem (Mandatory)

1. **Standard Notification Modal**: Seluruh umpan balik aksi (berhasil simpan, gagal validasi/server, dialog konfirmasi hapus/tindakan penting) **wajib menggunakan modal dialog standar (`NotificationModal` / varian modal card)**, bukan banner alert statis yang mudah terlewat atau browser `alert()` / `confirm()`.
2. **Kategori Modal Notifikasi**:
   - `success`: Berlatar icon hijau `#DCFCE7`, teks `#166534`, tombol aksi primer.
   - `error`: Berlatar icon merah `#FEE2E2`, teks `#B91C1C`, tombol tutup bahaya.
   - `confirm`: Berlatar icon kuning/amber `#FEF3C7`, teks `#B45309`, dua tombol (Batal + Lanjutkan/Hapus).
   - `info`: Berlatar icon biru `#EFF6FF`, teks `#1D4ED8`.
3. **Penyimpanan Gambar Base64**: Kolom penyimpan gambar (seperti `icon` aplikasi SSO) di database wajib bertipe `LONGTEXT` di MySQL (`@db.LongText` di Prisma), dan body parser Express wajib diset minimal `50mb` agar tidak terjadi error `413 Payload Too Large` atau data truncation `65535`.
4. **Statistik Card Icon Placement**: Kartu metrik/statistik operasional di panel tata kelola wajib menempatkan icon di sebelah kanan tengah (bukan pojok kanan atas) dengan ukuran icon minimal `w-8 h-8` di dalam kontainer `w-13 h-13 rounded-[14px]` agar seimbang dengan angka metrik 2xl.
5. **Permukaan Gelap Portal Publik**: Banner ajakan masuk SSO dan footer landing page wajib patuh pada token resmi `brand-900` (`#0b3a25`) solid dan border `brand-800` (`#0e482d`), aksen `gold-400` (`#d3ac46`) untuk tombol & divider, serta **tanpa grid motif** (`pattern-grid-dark`) agar permukaan bersih, tidak silau/kusam, dan konsisten dengan palet resmi `docs/design-system/COLORS.md`. Dilarang mencampur token abu-abu `slate` ke dalam portal publik.
6. **Pembedaan Aplikasi SSO & Non-SSO**: Halaman katalog publik (`/aplikasi`) memunculkan seluruh aplikasi secara terbuka dan memisahkannya ke dalam dua section visual terpisah: Section 1 khusus *Aplikasi Terintegrasi Single Sign-On (SSO)* dan Section 2 khusus *Aplikasi Mandiri & Eksternal (Non-SSO)* dengan badge status dan tombol aksi yang relevan.
7. **Dinamisasi Direktori Publik Dashboard**: Bagian "Portal Informasi & Direktori Publik Kampus" di Dashboard SSO wajib terhubung secara dinamis ke database (tabel `layanan_kampus`) dan dapat dikelola secara penuh (CRUD) melalui menu admin khusus **`/admin/direktori` (Aplikasi Non-SSO)** yang dilindungi izin `non_sso:*` (`non_sso:menu`, `non_sso:view`, `non_sso:edit`, `non_sso:delete`). Dilarang melakukan hardcode link direktori di Dashboard.
