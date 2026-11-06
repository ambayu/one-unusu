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
- **Digunakan oleh**: Rute `/admin`, `/admin/pengguna`, `/admin/izin`, `/admin/peran`
- **Tanggung Jawab**:
  - Menyajikan kerangka tata kelola SSO: registrasi layanan, manajemen akun civitas, matriks izin, dan pengelolaan peran.
  - Membungkus `SidebarLayout` dengan header halaman (judul, deskripsi, tombol muat ulang) dan slot konten.
- **Komposisi Layout**:
  1. `SidebarLayout` container.
  2. Header halaman: judul `#1E293B`, deskripsi `#64748B`, tombol "Muat Ulang" bergaya sekunder.
  3. Slot konten bebas: stats grid, tabel data, kartu peran, atau matriks izin.
  4. 4-Card Operational Stats Grid (khusus halaman yang menampilkan agregat).
  5. Filter & Toolbar (Search input + Role dropdown + Action button "Tambah").
  6. Data Table Container (`bg-white rounded-[14px] border border-[#D8E5DC]` dengan `thead` berwarna `#F0FDF4`).
  7. Modal Form pendaftaran aplikasi / penambahan user / peran baru.

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

---

## 6. Template 6: Form Page Template (`FormPageTemplate`)

- **Digunakan oleh**: **seluruh** halaman formulir tambah/ubah data (mis. `/penelitian/tambah`, `/penelitian/edit/:id`, `/admin/surat-form`, `/admin/standar/tambah`). **Dashboard tidak memakai template ini.**
- **Tanggung Jawab**: Menyeragamkan kerangka halaman formulir di seluruh aplikasi sehingga tata letaknya identik antar menu: header panel + pesan galat + area isian + baris aksi tetap di bawah.
- **Komposisi Struktur**:
  ```tsx
  <FormPageTemplate
    title="Tambah Proposal Riset Baru"
    description="Formulir pencatatan lengkap proposal penelitian."
    backTo="/penelitian"
    isEdit={isEdit}
    submitLabel={isEdit ? 'Perbarui Data' : 'Simpan Proposal'}
    submitting={submitting}
    error={error}
    onSubmit={handleSubmit}
    accentClassName="bg-violet-700 hover:bg-violet-800"
  >
    <CardContainer title="Informasi Judul & Tim Peneliti">
      {/* field-field formulir */}
    </CardContainer>
  </FormPageTemplate>
  ```
- **Poin Penting**:
  1. Tidak perlu lagi menulis `<form>`, blok galat, dan baris tombol Batal/Simpan secara manual — semuanya disediakan template.
  2. Baris aksi (Batal + Simpan) selalu berada di **bawah** formulir dengan tap target minimal 42px.
  3. `submitLabel` default otomatis: `Simpan Perubahan` saat `isEdit`, `Simpan Data` saat menambah.
  4. Tombol "Batal" mengarah ke `backTo`; tombol "Kembali" pada header juga mengarah ke sana.
  5. `accentClassName` disesuaikan dengan palette aplikasi (ESurat emerald, LPM/LPPM biru/violet, dll).
- **Dilarang**: Membuat struktur header formulir + baris aksi sendiri di halaman baru. Gunakan template ini agar konsisten.

---

## 7. Aturan Status Aktif Menu Sidebar (`isActive`)

Semua sidebar panel **wajib** memakai aturan kecocokan yang sama agar tidak pernah ada dua menu aktif sekaligus:

1. **Cocok persis** — `pathname === to` → aktif.
2. **Cocok batas segmen** — `pathname.startsWith(to + '/')` → kandidat aktif. Dilarang memakai `startsWith(to)` tanpa garis miring, karena `/peran` akan ikut menyala di `/perangkat`.
3. **Kecocokan terpanjang menang** — bila beberapa menu berbagi prefix yang sama (mis. `/admin` dan `/admin/pengguna`), hanya menu dengan path **terpanjang** yang dianggap aktif.
4. **Menu ber-`end`** — menu yang menunjuk rute akar (mis. `/`) wajib ditandai `end: true` agar tidak menyala di semua halaman. Rute turunannya (mis. `/class/:id`) dipetakan manual ke menu induk.
5. **Reaktif** — status harus dihitung dari `useLocation()` (bukan `window.location.pathname`), supaya ikut berubah saat navigasi client-side.
