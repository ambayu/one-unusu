# PROJECT RULES — ONE UNUSU

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
2. **Typography**: Menggunakan font utama **Plus Jakarta Sans**. Skala heading 28–32px (Page title), 20–24px (Section), 14–16px (Body), 14px weight 600 (Button).
3. **Anti-Sparkles Rule**: DILARANG keras menggunakan icon `sparkles` (`Sparkles`, `SparklesIcon`, dsb). Gunakan icon fungsional spesifik dari `@heroicons/react`.
4. **Elevation**: Hindari shadow tebal; gunakan border `#D8E5DC` yang presisi dan shadow sangat halus (`shadow-xs` / `shadow-sm`).
5. **Radius**: Konsisten antara `8px` (button/input), `10px` (badge/icon-box), `12px` (dropdown), dan `16px` (card utama).
6. **Palet per Permukaan**: Panel SSO (`/dashboard`, `/profil`, `/admin`, `/login`) memakai token Modern Green di `docs/design-system/COLORS.md`. Portal publik (`/`, `/aplikasi`, `/layanan`, `/bantuan`, `/fakultas`, `/prodi`, `/keamanan`) memakai token `brand` dan `gold` di `tailwind.config.js`. Dilarang mencampur kedua palet dalam satu halaman, dan dilarang menambah kode HEX baru langsung di kelas Tailwind.
7. **Efek Dekoratif**: `backdrop-blur`, gradien, dan glow hanya dipakai jika punya alasan fungsional (keterbacaan teks di atas foto, pemisah lapisan). Maksimal satu atau dua elemen per layar.

---

## 4. Aturan Fungsional & Bisnis SSO

1. **Mandatory Biodata Completion**: Pengguna yang belum mengisi email atau WhatsApp akan menerima warning banner dan diarahkan untuk melengkapi kontak di halaman `/profil`.
2. **Pasfoto Resmi 3x4 Merah**: Mahasiswa dan dosen wajib memiliki pasfoto 3x4 dengan latar belakang merah pekat (`#b91c1c` / red-700) yang dapat di-crop interaktif di browser.
3. **Pemisahan Peran Civitas**:
   - `MAHASISWA`: Menampilkan data NIM, Program Studi, Fakultas, dan link perkuliahan.
   - `DOSEN`: Menampilkan data NIDN/NUP, Homebase Prodi, dan Fakultas Induk.
   - `SUPERADMIN`: Menampilkan Username, Unit Kerja PUSTIK, hak akses Root SSO, dan tab Registry SSO Apps & Civitas User Management.
4. **SSO Ticket Protocol**: Otorisasi ke aplikasi turunan (LMS, SIAKAD, dsb) wajib menggunakan `GET /api/sso/app-client/:clientId/v2/redirect`. Endpoint ini menerbitkan token acak 64 karakter, single-use, berlaku 5 menit, dan disimpan di tabel `sso_auth_tokens`. Verifikasi dilakukan server-ke-server melalui `POST /api/v2/website/verify-token` dengan `client_id`, `client_key`, dan `token`.

---

## 5. Aturan Keamanan, Database, & Kode

1. **No Persona Inside Code**: Dilarang memasukkan joke, slang, watermark, atau persona apa pun ke dalam source code, komentar kode, API response, atau basis data.
2. **Secret Safety**: Jangan membocorkan `.env`, API key, hash kata sandi, token JWT, atau kredensial database ke output client atau logging.
3. **Database Safety**: Operasi destruktif (`DROP`, `TRUNCATE`, bulk delete) dilarang keras tanpa persetujuan eksplisit.
4. **Type Safety**: Kode TypeScript harus bersih, hindari penggunaan `any` atau `@ts-ignore` tanpa alasan defensif yang valid.

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
7. **Dinamisasi Direktori Publik Dashboard**: Bagian "Portal Informasi & Direktori Publik Kampus" di Dashboard SSO wajib terhubung secara dinamis ke database (tabel `layanan_kampus`) dan dapat dikelola secara penuh (CRUD) melalui menu admin khusus **`/admin/direktori` (Direktori Publik)** yang dilindungi izin `directory:*`. Dilarang melakukan hardcode link direktori di Dashboard.
