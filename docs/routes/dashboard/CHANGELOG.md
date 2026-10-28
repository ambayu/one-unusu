# Changelog Route: Dashboard SSO

## [2026-10-29] - Ornamen Sidebar Dilebarkan 60%

### Changed
- Kontainer ornamen botanical di kiri bawah sidebar (`SidebarLayout.tsx`) dilebarkan dari `w-72` (288px) menjadi `w-[460px]` (60% lebih lebar), tinggi tetap `h-[420px]`, anchor tetap `-bottom-6 -left-6`.
- Karena `backgroundSize: cover` dengan anchor `bottom left`, wash kuning (`#FEF08A`) dan seluruh helai daun ikut melebar 60% secara proporsional tanpa mengubah rasio asli SVG.

## [2026-10-29] - Penyederhanaan Banner Sambutan & Daftar Identitas

### Changed
- Daftar identitas civitas (`Data Akademik Mahasiswa`, `Data Ketenagaan Dosen`, `Otoritas & Unit Kerja`) tidak lagi memakai kartu per item. Diganti `dl` dua kolom (`grid-cols-1 sm:grid-cols-2`): label kecil uppercase di atas, nilai semibold di bawah. NIM, NIDN, dan username tetap `font-mono`.
- Banner sambutan kini hanya memuat "Selamat Datang," dan nama pengguna. Logo, ilustrasi kampus, dan permukaan `#F0FDF4` tidak berubah.

### Removed
- Baris `NIM: ...`, `Program Studi: ...`, dan `Fakultas: ...` pada banner sambutan, karena informasinya sudah ada di daftar identitas.
- Blok "SSO Terverifikasi / Akun Anda telah berhasil diverifikasi" beserta ikon shield dan chevron.
- Properti `icon` pada `IdentityMetric` serta ikon per baris. Import `ShieldCheckIcon`, `BookOpenIcon`, `ChevronRightIcon`, `CalendarDaysIcon`, dan `EnvelopeIcon` yang tidak terpakai lagi dihapus.

## [2026-10-29] - Headbar Height Sync & Collapsible Sidebar

### Added
- **Tombol Collapse Sidebar (Desktop)**: Tombol `ChevronDoubleLeft/Right` di headbar untuk menciutkan sidebar dari `w-64` (256px) menjadi `w-20` (80px, icon-only rail) dengan transisi `duration-300 ease-in-out`. State tersimpan di `SidebarLayout` sehingga konsisten di seluruh halaman terautentikasi.
- **Mode Rail (Sidebar Ciut)**:
  - Brand header hanya menampilkan logo, teks "ONE UNUSU" dan subtitle disembunyikan.
  - Label seksi "MENU UTAMA" dan "TATA KELOLA" disembunyikan; navigasi jadi ikon terpusat dengan tooltip `title` sebagai aksesibilitas.
  - Badge "Lengkapi" pada Biodata berubah jadi indikator titik amber kecil.
  - Footer menampilkan indikator status gateway (dot hijau berdenyut) dan tombol logout ikon-only.

### Changed
- **Tinggi Headbar Disamakan**: Headbar utama diubah dari `h-16` (64px) menjadi `h-[88px]` agar sejajar presisi dengan brand header sidebar (`h-[88px]`).
- **Toggle Mobile Dipisah**: Tombol drawer mobile (`Bars3Icon`) tetap `lg:hidden`, sedangkan tombol collapse desktop memakai ikon chevron ganda agar tidak ambigu.

## [2026-10-29] - Sidebar Leaf Scale Up & Brand Header Contrast

### Changed
- **Ornamen Daun Diperbesar**: Kontainer ilustrasi daun sudut kiri bawah dinaikkan dari `w-56 h-80` menjadi `w-72 h-[420px]` dengan offset `-bottom-6 -left-6`, `backgroundSize: cover`, dan opacity `0.85` agar ornamen menjulang lebih tinggi di sisi sidebar.
- **Aset SVG Daun Digambar Ulang**: `public/assets/sidebar-leaves.svg` memakai viewBox lebih tinggi (`300x520`), lima helai daun berlapis (pale, mint, deep green, gold), plus aksen stem, dengan gradient fill agar tetap tajam saat diskalakan besar.
- **Ambient Glow Kuning Diperluas**: Radial halo kiri atas dibesarkan dari `w-44 h-44` menjadi `w-72 h-72` dengan offset `-top-16 -left-16` sehingga gradasi kuning menutup seluruh area brand header.
- **Diferensiasi Warna Brand Header**: Kata "ONE" memakai slate `#475569`, "UNUSU" memakai emerald tua `#14532D`, dan subtitle "Gateway Sistem Terpadu" memakai hijau sage `#7FAD8E` dengan gaya italic — kontras antar elemen lebih jelas.
- **Saturasi Background Sidebar**: Background dinaikkan saturasinya dari `#F7FAF7` ke `#EEF7EF` dengan border `#C8DDD0` / `#B8D0BD`.

### Added
- **Loading & Empty State Katalog SSO**: Grid aplikasi kini menampilkan skeleton `animate-pulse` saat memuat, state kosong berformat dashed border saat tidak ada aplikasi aktif, dan banner error `bg-[#FEF2F2]` saat pemuatan gagal.

### Fixed
- **Unused Icon Imports**: Membersihkan import ikon yang tidak terpakai pada `Dashboard.tsx` dan melengkapi import `ShieldCheckIcon`, `ChevronRightIcon`, `CalendarDaysIcon`, serta `ExclamationCircleIcon` yang sempat hilang.
- **Syntax Error `SidebarLayout.tsx`**: Menghapus karakter `\` liar setelah `&& (` yang menyebabkan esbuild gagal transform.

## [2026-10-29] - Refinement Layout Stacked & Sidebar Styling Sync
- **Stacked Structure (Single Column Layout)**: Mengubah "Aplikasi Terintegrasi SSO" dan "Portal Informasi & Direktori Publik" dari layout 2 kolom kiri-kanan menjadi tersusun berurutan ke bawah (stacked) dalam kontainer card terpadu yang lebar dan responsif.
- **Mockup App Visuals**: Mengintegrasikan gambar antarmuka asli dari `/assets/apps/` (`app-lms.png`, `app-esurat.png`, `app-siakad.png`, `app-sarpras.png`, `app-lpm.png`, `app-lppm.png`) dengan aspect ratio 16:10, gradient scrim, dan tag status "Terkoneksi" persis seperti di landing page.
- **Sidebar Menu Simplification**: Menghapus seksi cepat "Layanan Kampus Terpadu" dan "Informasi & Bantuan" dari sidebar sesuai arahan, menyisakan menu esensial: "Dashboard SSO", "Biodata", pengaturan Superadmin (jika role berhak), status SSO Gateway ONLINE, dan tombol Keluar Akun.
- **Sidebar Visual & Palette Calibration**:
  - Menyelaraskan background sidebar menjadi off-white sejuk `#FCFDFC`.
  - Mengkalibrasi ambient glow kuning di sudut kiri atas menjadi soft golden-yellow radial halo.
  - Memperbarui ilustrasi daun herbal sudut kiri bawah (`sidebar-leaves.svg`) dengan kurva halus dan opacity seimbang (60%).
  - Memastikan tombol menu aktif memakai Forest Green (`#15803D`) dengan icon circular white badge, dan menu inaktif memakai font slate gelap (`#1E293B`) yang tegas dan kontras.

## [2026-10-29] - Identitas per Peran & Normalisasi Palet

### Fixed
- Kartu identitas kini menyesuaikan peran: `MAHASISWA` (NIM, prodi, fakultas, status), `DOSEN` (NIDN/NUP, homebase, fakultas, status), `SUPERADMIN` (username, unit kerja, hak akses, status).
- Nama, NIM, prodi, dan fakultas contoh (`Siti Rahmah`, `2201010045`, `S1 Sistem Informasi`) dihapus. Nilai kosong ditampilkan sebagai `Belum tersedia`.
- Status civitas diambil dari `user.isActive`, bukan teks tetap `Aktif`.
- Respons 401/403 pada pemuatan data menghapus `one_unusu_token` dan `one_unusu_user` sebelum redirect ke `/login`.

### Changed
- Sidebar memakai permukaan putih `#FFFFFF` dengan border `#D8E5DC`; latar halaman `#F1F5F2`.
- Radial halo kuning di sudut sidebar dihapus karena tidak menambah kejelasan hierarki.
- Gradien kuning-hijau pada banner sambutan dan banner penutup diganti `#F0FDF4` solid dengan border `#D8E5DC`.
- Warna ungu `#7E22CE` dan `#F3E8FF` pada kartu Fakultas & Prodi diganti `#166534` dan `#DCFCE7`.
- Border kartu diseragamkan dari `#E2EBE5` ke `#D8E5DC`, kartu metrik dari `#F8FAF9` ke `#F0FDF4`, teks judul dari `#0F172A` ke `#1E293B`.
- Badge status di atas pratinjau aplikasi memakai `#1E293B/85` tanpa blur.
