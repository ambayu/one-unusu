# SHARED COMPONENTS REGISTRY — ONE UNUSU

Dokumen ini mencatat seluruh komponen bersama yang wajib digunakan ulang dan dilarang dibuat ulang dari awal di setiap rute.

---

## 1. Komponen Layout & Navigasi

### `SidebarLayout` (`src/client/components/SidebarLayout.tsx`)
- **Tanggung Jawab**: Kerangka layout utama untuk seluruh halaman terotentikasi (`/dashboard`, `/profil`, `/admin`).
- **Fitur Utama**:
  - Sidebar permukaan putih (`#FFFFFF`) dengan border kanan `#D8E5DC` dan drawer mobile.
  - Item aktif berupa pill hijau `#15803D` dengan teks putih; item nonaktif memakai teks `#1E293B` dan hover `#F0FDF4`.
  - Ornamen daun halus di sudut kiri bawah sebagai penanda identitas kampus.
  - Sticky Topbar `h-16` dengan breadcrumb rute aktif, tautan Portal Publik UNUSU, dan dropdown profil civitas.
  - Penanda `Lengkapi` pada menu Biodata jika email atau nomor WhatsApp belum diisi.
  - Badge status `SSO Gateway V2` dengan indikator titik hijau (statis, tanpa animasi).
- **Props**:
  - `user`: Objek `UserProfile | null`
  - `children`: Elemen halaman konten

---

## 2. Komponen Kartu & Section

### `DashboardWelcomeCard` (Pola di `Dashboard.tsx`)
- **Tanggung Jawab**: Menampilkan ucapan selamat datang, peran civitas, identitas akademik (NIM/NIDN/Fakultas), dan badge validasi tiket SSO v2.
- **Styling**: `bg-[#F0FDF4] rounded-[16px] border border-[#D8E5DC] p-6 sm:p-7`.

### `AppCard` (Pola di `Dashboard.tsx`)
- **Tanggung Jawab**: Menampilkan kartu katalog aplikasi SSO terintegrasi.
- **Styling**: `bg-white rounded-[18px] border border-[#D8E5DC] shadow-xs`.
- **Fitur**: Pratinjau gambar aplikasi (`/assets/apps/`) dengan overlay gelap, badge status, deskripsi ringkas, dan tombol "Buka Aplikasi Cabang" dengan state loading `redirectingAppId`.

### `FormSectionCard` (Pola di `Profile.tsx`)
- **Tanggung Jawab**: Membungkus setiap kelompok input formulir (Aturan Form Section Layout Part 10.8).
- **Styling**: `bg-white rounded-[16px] p-6 sm:p-7 border border-[#D8E5DC] shadow-xs`.
- **Heading**: Icon `@heroicons/react` + judul section 16px font-bold + deskripsi 12px.

---

## 3. Komponen Feedback & Status

### `AppCardSkeleton` & `ProfileSkeleton` (`src/client/components/Skeleton.tsx`)
- **Tanggung Jawab**: State loading visual berbentuk kartu skeleton saat data SSO atau profil sedang di-fetch dari server.

### `StatusBadge`
- **Tanggung Jawab**: Label status peran civitas atau status aktif/nonaktif aplikasi.
- **Varian**:
  - Mahasiswa / Sukses: `bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]`
  - Dosen / Warning: `bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]`
  - Superadmin / Info: `bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]`
  - Nonaktif / Muted: `bg-[#F1F5F2] text-[#64748B] border-[#D8E5DC]`

---

## 4. Komponen Portal Publik

Seluruh komponen di bawah berada di `src/client/components/` dan wajib dipakai ulang oleh halaman publik.

### `layout/Topbar` (`src/client/components/layout/Topbar.tsx`)
- Bar tipis di atas navbar: tautan bantuan PUSTIK dan status SSO.

### `layout/Navbar` (`src/client/components/layout/Navbar.tsx`)
- **Props**: `items: NavItem[]`, `registerUrl: string | null`
- **Fitur**: dropdown desktop dua level, panel mobile, tombol Login SSO, tombol Daftar Kuliah, state `scrolled` untuk latar putih tegas.
- **Catatan**: blur hanya aktif saat halaman di-scroll, bukan permanen.

### `layout/Footer` (`src/client/components/layout/Footer.tsx`)
- Kolom Tautan Cepat (`footerQuickLinks`), Layanan Digital (`digitalServices`), Kontak (`siteConfig.contact`), dan media sosial.
- Memakai `SmartLink` dan `PlaceholderValue`, sehingga tautan yang belum dikonfigurasi tampil nonaktif, bukan tautan mati.

### `ui/Container`
- Pembatas lebar konten untuk semua halaman publik.

### `ui/SectionHeading`
- Judul section dengan eyebrow opsional, dipakai di seluruh section beranda dan halaman direktori.

### `ui/Icon`
- Set ikon SVG inline dengan nama terdaftar di `data/types.ts` (`IconName`). Dilarang menambah `lucide-react`.

### `ui/Logo`
- Logo dan wordmark UNUSU. Varian `compact` untuk navbar, `tone="dark"` untuk footer.

### `ui/SmartLink`
- Pembungkus tautan yang menonaktifkan `href` kosong atau belum dikonfigurasi, dengan keterangan status.

### `ui/PlaceholderValue`
- Menampilkan nilai data atau teks placeholder resmi (`Menunggu data resmi`) jika data belum tersedia.

### `ui/Badge` dan `ui/ImagePlaceholder`
- Badge status dan gambar pengganti untuk aset yang belum tersedia.

### `components/NotificationModal.tsx`
- Komponen dialog pop-up standar untuk semua notifikasi aksi sistem (`success`, `error`, `confirm`, `info`).
- Menggantikan banner alert dan browser native alert/confirm.
- Memiliki backdrop blur, icon tematik, tombol konfirmasi/batal berstatus loading, dan animasi modal card.

### `home/HeroSection`
- Section aktif pada beranda (urutan render: `HeroSection` → `ProfileSection` → `DigitalServicesSection`).

#### Komposisi
1. **Gambar full-bleed**: mobile memakai kontainer `aspect-square` dengan aset 1:1 lewat `<picture><source media="(max-width: 767px)">`; mulai breakpoint `md` menjadi `absolute inset-0 h-full` dengan aset 16:9 dan `object-cover object-center`.
2. **Tanpa panel teks overlay**: headline tiap slide **di-bake ke dalam file PNG**, bukan teks HTML. Tidak ada gradient scrim maupun `backdrop-blur`. Judul halaman hanya tersedia sebagai `h1.sr-only` untuk pembaca layar dan SEO.
3. **Bar navigasi** (`relative z-10 py-5 md:pb-6`): indikator titik di kiri (aktif `w-6 bg-gold-400`, pasif `w-2 bg-white/40`) dan tombol panah `size-8` di kanan.

#### Perilaku
- Autoplay setiap **6000 ms**, transisi `opacity` selama **1000 ms**.
- Sumber data primer: `fetchSliders()` (tabel slider dari panel admin). Bila API kosong/gagal, dipakai `defaultHeroSlides` statis (4 slide: campus, students, digital, library).
- `loading="eager"` hanya untuk slide pertama, sisanya `lazy`.
- URL gambar diproses `resolveImageUrl` → `assetUrl` sehingga tetap benar pada sub-path build (`/sso/`).

#### Aturan Aset
- Aset desktop **wajib 1376×768 (16:9)** dan aset mobile **1024×1024 (1:1)** dengan tipografi ter-bake. Mengganti aset lewat menu Manajemen Slider berarti tipografi hero di luar kendali design system — pastikan font pada aset tetap Plus Jakarta Sans.
- Dilarang menambahkan kembali lapisan overlay teks/gradient di JSX; larangan ini sudah ditegaskan di `docs/routes/public/CHANGELOG.md`.

### `home/ProfileSection` (`src/client/components/home/ProfileSection.tsx`)
- **Status**: aktif, diimpor oleh `pages/Home.tsx`.
- **Komposisi** (`lg:grid-cols-12`, 6:6 seimbang):
  - **Kiri** — `SectionHeading` (eyebrow *Tentang Platform*, judul *Mengenal ONE UNUSU*), dua paragraf narasi, dan tiga poin keunggulan berikon `shield` dalam bulatan `bg-brand-700`.
  - **Kanan** — foto potret setengah badan `assets/profil-mahasiswa.png` di atas plakat `rounded-[32px]` bersudut gradasi `from-brand-100 via-gold-100/60 to-transparent` setinggi 78%, dengan `drop-shadow-[0_20px_40px_rgba(6,34,23,0.16)]`.
- **Section background**: `bg-ivory` (`#faf9f5`).
- **Aturan Aset**: potret wajib PNG ber-**alpha channel** (latar transparan) agar plakat gradasi tembus di sekitar siluet. Ukuran acuan 726×962 px. Path wajib melalui `assetUrl()`.

### `home/DigitalServicesSection`
- Section aktif pada beranda, memuat katalog layanan terintegrasi dan banner ajakan masuk SSO.

### Komponen belum terpakai
- `home/AcademicSection`, `home/AdmissionCta`, `home/HowItWorksSection`, `home/NewsAgendaSection`, dan `components/SsoLogo.tsx` belum diimpor halaman mana pun. Statusnya sedang dalam pengerjaan (belum di-commit). Jangan dipakai tanpa menghubungkannya ke `Home.tsx` lebih dulu.

---

## 5. Larangan Duplikasi Komponen

1. DILARANG membuat navbar/headbar sendiri di dalam page. Rute terautentikasi memakai `SidebarLayout`; rute publik memakai `layout/Navbar`.
2. DILARANG membuat style button acak menggunakan inline CSS. Gunakan kelas utility resmi `bg-[#166534] hover:bg-[#14532D] text-white rounded-[8px] font-semibold`.
3. DILARANG membuat dialog modal pasfoto baru di rute lain jika `Profile.tsx` sudah menyediakan crop modal 3x4 kanvas standar.
4. DILARANG menaruh komponen layout di `src/client/components/` tingkat atas. Lokasi resmi hanya `src/client/components/layout/`.

---

## 4. Komponen Laporan & Grafik

### `LaporanCharts` (`src/client/components/LaporanCharts.tsx`)
- **Tanggung Jawab**: Kumpulan komponen grafik ringkas untuk dashboard panel, dibangun **murni dengan SVG dan CSS** — tanpa library chart eksternal, sehingga ukuran bundle tetap ringan dan tidak menambah dependensi baru.
- **Alasan tidak memakai library**: grafik dashboard bersifat ringkasan (bukan analitik interaktif), dan palette harus mengikuti warna aplikasi masing-masing.
- **Komponen yang tersedia**:
  | Komponen | Kegunaan |
  | --- | --- |
  | `ReportCard` | Kartu pembungkus laporan (judul + subjudul + aksi opsional) |
  | `MetricTile` | Kartu metrik angka besar dengan ikon & aksen warna |
  | `DonutChart` | Proporsi antar kategori (mis. status surat, kondisi fasilitas) |
  | `BarChart` | Perbandingan kategori dengan bar horizontal |
  | `ColumnChart` | Tren per periode dengan kolom vertikal |
  | `TrendChart` | Tren waktu dengan area lembut (SVG path) |
  | `StackedBar` | Komposisi satu batang bertingkat |
  | `GaugeRing` | Capaian persentase tunggal berbentuk cincin |
  | `ActivityFeed` | Daftar kejadian terbaru bersusun waktu |
- **Aksesibilitas**: Setiap grafik memakai `role="img"` + `aria-label` yang merangkum datanya; nilai juga tetap ditampilkan sebagai teks sehingga tidak bergantung pada warna saja.
- **Aturan Pemakaian**: Dashboard setiap aplikasi **wajib** menampilkan laporan/grafik ringkas untuk tiap menu, dan **dilarang** menyertakan panel aksi cepat (tombol pintas tambah/input) di dashboard. Navigasi tetap melalui sidebar.

---

## 6. Komponen Landing Page Lain

> Pola **"teks di kiri, foto potret di kanan"** pada landing ONE UNUSU diimplementasikan langsung di `home/ProfileSection.tsx` (lihat bagian 4). Komponen pembungkus `TentangPlatform.tsx` sudah dihapus dari repo ONE UNUSU agar tidak ada dua implementasi paralel untuk seksi yang sama. Aplikasi cabang (LPM/LPPM/E-Surat) yang membutuhkan pola serupa tetap memakai komponen lokalnya masing-masing di repositori sendiri.
