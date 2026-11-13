# PAGE TEMPLATES REGISTRY - ONE UNUSU

Tata kelola template halaman sesuai aturan **Part 9: Build Once, Reuse Everywhere**.

---

## 1. Prinsip Utama Template

Setiap halaman di ONE UNUSU wajib mengadopsi template yang sesuai dengan jenis halaman:
- **Dilarang keras** membuat struktur halaman baru dari nol jika template sudah tersedia.
- **Dilarang keras** mengubah rute dashboard agar menyerupai halaman tabel CRUD biasa.

---

## 2. Registri Template

### Template A: Dashboard Template (`DashboardLayout`)
- **Digunakan oleh**: Rute `/dashboard`
- **Tanggung Jawab**:
  - Menyajikan ikhtisar multi-widget, status SSO civitas, katalog aplikasi terintegrasi, dan direktori link eksternal kampus.
  - Mengatur transisi launch tiket SSO (`redirectingAppId`).
  - Mengeksekusi tiga permintaan data paralel (`fetchMe`, `fetchSsoApps`, `fetchDirectories`) dengan `Promise.allSettled` agar kegagalan satu daftar tidak menjatuhkan seluruh halaman.
- **Komposisi Layout** (urut sesuai `src/client/pages/Dashboard.tsx`):
  1. `PanelLayout` sebagai induk rute (memasang `SidebarLayout` **sekali** untuk seluruh area panel).
  2. Banner sambutan `#F0FDF4` dengan border `#D8E5DC`, logo UNUSU, identitas civitas, dan badge status SSO.
  3. Kartu daftar identitas (`bg-white rounded-[20px] border border-[#D8E5DC]`), isi berupa `dl` grid `grid-cols-1 sm:grid-cols-2` yang menyesuaikan peran (`MAHASISWA`, `DOSEN`, `SUPERADMIN`), tanpa kartu per item.
  4. Kartu katalog Aplikasi Terintegrasi SSO: kepala kartu (judul + tombol "Daftar Aplikasi") dan isi berupa **`Carousel`** (bukan grid). Urutan kartu berasal dari `hitCount` server.
  5. Kartu Portal Informasi & Direktori Publik Kampus: kepala kartu (judul + tombol "Daftar Direktori") dan isi berupa **`Carousel`** kartu bergambar (`getDirectoryPreviewImage`).
  6. Banner penutup `#F0FDF4` dengan tautan ke Pusat Bantuan.
- **Aturan keadaan (state)**:
  - Memuat: skeleton berbentuk kartu selebar `w-[290px] sm:w-[320px]` agar identik dengan kartu asli.
  - Gagal memuat daftar: kotak galat merah (`#FEF2F2` / border `#FECACA` / teks `#B91C1C`) yang menyebut pemuatan **gagal**. Dilarang menampilkan "belum ada data" saat server gagal.
  - Benar-benar kosong: hanya boleh muncul setelah server menjawab sukses dengan daftar kosong.
- **Larangan**: memakai grid sebagai wadah katalog di dashboard. Bila jumlah item lebih dari satu, wadahnya wajib `Carousel` agar panah dan seret tetap tersedia.

---

### Template B: Form & Identity Template (`ProfilePageTemplate`)
- **Digunakan oleh**: Rute `/profil`
- **Tanggung Jawab**:
  - Halaman pengisian biodata, kontak, dan unggah pasfoto formal.
  - Mematuhi **Part 10.8: Form Section Layout Rule** (seluruh field terbungkus rapi di dalam card individual).
- **Komposisi Layout**:
  1. `PanelLayout` (induk rute) yang menyediakan `SidebarLayout`.
  2. Incomplete Profile Warning Banner (jika belum lengkap).
  3. Header Identity Card (Pasfoto 3x4 formal, nama, NIM/NIDN/ID, kartu peran civitas).
  4. Form Section 1: Kontak & Pasfoto (`bg-white rounded-[16px] border border-[#D8E5DC]`).
  5. Form Section 2: Keamanan Akun / Kata Sandi (`bg-white rounded-[16px] border border-[#D8E5DC]`).
  6. Action Bar di bawah kartu: Tombol "Simpan Perubahan" (`bg-[#166534]`).
  7. Interactive Crop Modal 3x4 Kanvas (Latar merah formal `#b91c1c`). Perhitungan potong memakai ukuran bingkai (`getBoundingClientRect()`) **dan** ukuran foto setelah `object-contain`; keduanya berbeda sehingga tidak boleh disamakan.

---

### Template C: Admin & Master Data Table Template (`AdminPanelTemplate`)
- **Digunakan oleh**: seluruh halaman `/admin/*` - `/admin` (Registrasi SSO), `/admin/pengguna`, `/admin/izin`, `/admin/peran`, `/admin/slider`, `/admin/direktori`.
- **Tanggung Jawab**:
  - Menyajikan kerangka tata kelola SSO: registrasi layanan, manajemen akun civitas, matriks izin, pengelolaan peran, slider hero, dan direktori publik.
  - Membungkus header halaman (judul, deskripsi, tombol muat ulang) dan slot konten. Sidebar **tidak** dipasang di sini, melainkan oleh `PanelLayout` di `App.tsx`.
- **Komposisi Layout**:
  1. `PanelLayout` (induk rute) yang menyediakan `SidebarLayout`.
  2. Header halaman: judul `#1E293B`, deskripsi `#64748B`, tombol "Muat Ulang" bergaya sekunder.
  3. Slot konten bebas: stats grid, tabel data, kartu peran, atau matriks izin.
  4. 4-Card Operational Stats Grid (khusus halaman yang menampilkan agregat).
  5. Filter & Toolbar (Search input + dropdown peran + tombol aksi "Tambah").
  6. Wadah tabel memakai `DataTable` (`bg-white rounded-[14px] border border-[#D8E5DC]`, `thead` `#F0FDF4`, teks kepala `12.5px` bold, isi sel `text-xs`).
  7. Modal form pendaftaran aplikasi / penambahan pengguna / peran baru / item slider / direktori.
- **Penyimpangan yang disetujui** (wajib dicatat di `docs/routes/admin/RULES.md`):
  - `/admin/izin` memakai `<table>` manual - matriks peran dinamis dengan kolom sticky; tidak dapat dinyatakan sebagai kolom `DataTable`.
  - `/admin/peran` dan `/admin/slider` memakai kartu/grid, bukan tabel.

---

### Template D: Public Portal Template (`PublicPageTemplate`)
- **Digunakan oleh**: `/`, `/aplikasi`, `/layanan`, `/bantuan`, `/fakultas`, `/prodi`, `/keamanan`
- **Tanggung Jawab**:
  - Halaman informasi publik yang dapat diakses tanpa login.
  - Memakai palet `brand` dan `gold` dari `tailwind.config.js`.
- **Komposisi Layout**:
  1. `Topbar`.
  2. `Navbar` dengan `items={mainNavigation}` dan `registerUrl={externalUrls.pmb}`.
  3. `main` dengan `Container` dan `SectionHeading` untuk setiap section.
  4. `Footer`.
- **Aturan**: seluruh tautan menu wajib menunjuk rute terdaftar di `App.tsx`.
- **Catatan implementasi**: `Home.tsx` merangkai `HeroSection`, `ProfileSection`, `DigitalServicesSection`, dan `NonSsoServicesSection`. Halaman publik lain (`/aplikasi`, `/layanan`, `/bantuan`, `/fakultas`, `/prodi`, `/keamanan`) memakai `Topbar` + `Navbar` + `Container` + `SectionHeading` + `Footer` yang sama.

---

## 3. Aturan Memilih Template Baru

Jika di masa depan ada halaman baru yang akan dibangun:
1. Periksa apakah halaman bertipe **katalog/ringkasan**, **formulir**, **tabel data**, atau **informasi publik**.
2. Gunakan template yang cocok dari daftar di atas.
3. Tambahkan rute dan konfigurasinya ke dalam dokumentasi `docs/routes/{module}/RULES.md`.

---

## 4. Aturan Status Aktif Menu Sidebar (`isActive`)

Semua sidebar panel **wajib** memakai aturan kecocokan yang sama agar tidak pernah ada dua menu aktif sekaligus:

1. **Cocok persis** - `pathname === to` -> aktif.
2. **Cocok batas segmen** - `pathname.startsWith(to + '/')` -> kandidat aktif. Dilarang memakai `startsWith(to)` tanpa garis miring, karena `/peran` akan ikut menyala di `/perangkat`.
3. **Kecocokan terpanjang menang** - bila beberapa menu berbagi prefix yang sama (mis. `/admin` dan `/admin/pengguna`), hanya menu dengan path **terpanjang** yang dianggap aktif.
4. **Menu ber-`end`** - menu yang menunjuk rute akar (mis. `/`) wajib ditandai `end: true` agar tidak menyala di semua halaman. Rute turunannya (mis. `/class/:id`) dipetakan manual ke menu induk.
5. **Reaktif** - status harus dihitung dari `useLocation()` (bukan `window.location.pathname`), supaya ikut berubah saat navigasi client-side.
