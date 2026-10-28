# PAGE TEMPLATES REGISTRY — ONE UNUSU

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
- **Komposisi Layout**:
  1. `SidebarLayout` container.
  2. Banner sambutan `#F0FDF4` dengan border `#D8E5DC`, logo UNUSU, identitas civitas, dan badge status SSO.
  3. Daftar identitas 2 kolom (`dl` grid `grid-cols-1 sm:grid-cols-2`) yang menyesuaikan peran (`MAHASISWA`, `DOSEN`, `SUPERADMIN`), tanpa kartu per item.
  4. Kartu terpadu berisi katalog Aplikasi Terintegrasi SSO (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, pratinjau gambar tiap aplikasi) dan Direktori Portal Publik (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
  5. Banner penutup `#F0FDF4` dengan tautan ke Pusat Bantuan.

---

### Template B: Form & Identity Template (`ProfilePageTemplate`)
- **Digunakan oleh**: Rute `/profil`
- **Tanggung Jawab**:
  - Halaman pengisian biodata, kontak, dan unggah pasfoto formal.
  - Mematuhi **Part 10.8: Form Section Layout Rule** (seluruh field terbungkus rapi di dalam card individual).
- **Komposisi Layout**:
  1. `SidebarLayout` container.
  2. Incomplete Profile Warning Banner (jika belum lengkap).
  3. Header Identity Card (Pasfoto 3x4 formal, nama, NIM/NIDN/ID, kartu peran civitas).
  4. Form Section 1: Kontak & Pasfoto (`bg-white rounded-[16px] border border-[#D8E5DC]`).
  5. Form Section 2: Keamanan Akun / Kata Sandi (`bg-white rounded-[16px] border border-[#D8E5DC]`).
  6. Action Bar di bawah kartu: Tombol "Simpan Perubahan" (`bg-[#166534]`).
  7. Interactive Crop Modal 3x4 Kanvas (Latar merah formal `#b91c1c`).

---

### Template C: Admin & Master Data Table Template (`AdminPanelTemplate`)
- **Digunakan oleh**: Rute `/admin`
- **Tanggung Jawab**:
  - Menyajikan statistik agregat, pendaftaran layanan SSO, dan manajemen akun civitas kampus.
- **Komposisi Layout**:
  1. `SidebarLayout` container.
  2. 4-Card Operational Stats Grid (Aplikasi, User, Mahasiswa, Dosen).
  3. Tab Switcher (`Aplikasi SSO` vs `Data Akun Civitas`).
  4. Filter & Toolbar Toolbar (Search input + Role dropdown + Action button "Tambah").
  5. Data Table Container (`bg-white rounded-[14px] border border-[#D8E5DC]` dengan `thead` berwarna `#F0FDF4`).
  6. Modal Form pendaftaran aplikasi / penambahan user baru.

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

---

## 3. Aturan Memilih Template Baru

Jika di masa depan ada halaman baru yang akan dibangun:
1. Periksa apakah halaman bertipe **katalog/ringkasan**, **formulir**, **tabel data**, atau **informasi publik**.
2. Gunakan template yang cocok dari daftar di atas.
3. Tambahkan rute dan konfigurasinya ke dalam dokumentasi `docs/routes/{module}/RULES.md`.
