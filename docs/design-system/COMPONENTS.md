# SHARED COMPONENTS REGISTRY - ONE UNUSU

Dokumen ini mencatat seluruh komponen bersama yang wajib digunakan ulang dan dilarang dibuat ulang dari awal di setiap rute.

---

## 1. Komponen Layout & Navigasi

### `PanelLayout` (`src/client/components/PanelLayout.tsx`)
- **Tanggung Jawab**: Induk **tunggal** seluruh rute panel (`/dashboard`, `/profil`, `/admin/*`). Memasang `SidebarLayout` satu kali dan merender `<Outlet />` sebagai slot isi.
- **Alasan ada**: bila `SidebarLayout` dipasang di dalam tiap halaman, React Router melepas pohon komponen lama saat berpindah rute, sehingga sidebar ikut unmount lalu mount ulang. Akibatnya terlihat "kedip": status collapse kembali terbuka, drawer tertutup, animasi mulai dari awal. Dengan `PanelLayout` sebagai induk nested route, sidebar awet antar-halaman.
- **Perilaku user**: membaca cache `one_unusu_user` dari `localStorage` sebagai nilai awal agar sidebar langsung tampil, lalu menyegarkan lewat `fetchMe()`. Komponen ini **tidak** memvalidasi sesi - penjagaan rute tetap di `ProtectedRoute`/`AdminPanelRoute` di `App.tsx`.
- **Props**: tidak ada. Ia elemen rute, bukan komponen berparameter.
- **Aturan pemakaian**: halaman panel **dilarang** mengimpor dan merender `SidebarLayout` sendiri. Cukup render konten halaman.

### `SidebarLayout` (`src/client/components/SidebarLayout.tsx`)
- **Tanggung Jawab**: Kerangka visual sidebar + headbar. Dipakai **lewat** `PanelLayout`; jangan dirender langsung oleh halaman.
- **Fitur Utama**:
  - Sidebar hijau lembut `#EEF7EF` dengan border kanan `#C8DDD0` dan drawer mobile.
  - Item aktif berupa pill hijau `#15803D` dengan teks putih; item nonaktif memakai teks `#1E293B` dan hover `#F0FDF4`.
  - Ornamen daun halus di sudut kiri bawah sebagai penanda identitas kampus.
  - Headbar sticky: `h-16` di ponsel, `lg:h-[88px]` di desktop agar sejajar dengan brand header sidebar. Berisi breadcrumb rute aktif, tautan Portal Publik UNUSU, dan dropdown profil civitas.
  - Penanda `Lengkapi` pada menu Biodata jika email atau nomor WhatsApp belum diisi.
  - Badge status `SSO Gateway V2` dengan indikator titik hijau (statis, tanpa animasi).
- **Props**:
  - `user`: Objek `UserProfile | null`
  - `children`: Elemen halaman konten

---

## 1b. Komponen Tabel & Katalog Data

### `DataTable` (`src/client/components/DataTable.tsx`)
- **Tanggung Jawab**: Satu-satunya tabel data standar panel. Halaman cukup mendeklarasikan kolom dan isi sel; kerangka tabel, jarak, ukuran huruf, keadaan kosong, dan pagination diatur di sini.
- **Props**:

  | Prop | Tipe | Bawaan | Keterangan |
  | --- | --- | --- | --- |
  | `kolom` | `KolomTabel<T>[]` | wajib | Daftar kolom; tiap kolom punya `key`, `judul`, `sel(baris, indeks)`, `kelas`, `rataTengah`, `sembunyikanDiPonsel`. |
  | `data` | `T[]` | wajib | Baris data utuh (bukan potongan halaman). |
  | `kunciBaris` | `(baris) => string \| number` | wajib | Kunci unik tiap baris. |
  | `kosong` | `ReactNode` | teks "Belum ada data" | Isi tampilan saat data kosong. |
  | `berpaginasi` | `boolean` | `true` | Aktifkan pagination. |
  | `perHalamanAwal` | `number` | `10` | Jumlah baris per halaman awal. |
  | `labelRingkasan` | `(dari, sampai, total) => string` | otomatis | Teks ringkasan kiri bawah. |
  | `lebarMinimal` | `string` | `720px` | Lebar minimum tabel. |
  | `onBarisKlik` | `(baris) => void` | - | Membuat baris dapat diklik. |
  | `tampilkanNomor` | `boolean` | `true` | Menampilkan kolom "No." paling kiri. |
  | `judulNomor` | `string` | `"No."` | Judul kolom nomor. |

- **Aturan nomor urut**: nomor **melanjutkan antar halaman**. Halaman 2 dimulai dari 11, bukan 1, karena dihitung dari `paginasi.dari + indeks` - posisi baris pada data utuh, bukan indeks potongan halaman.
- **Aturan ukuran huruf (wajib)**: judul kolom `text-[12.5px] font-bold`; isi sel mewarisi `text-xs` (12px). Judul kolom **wajib lebih besar** dari isi sel. Jangan menyeragamkan keduanya.
- **Dilarang**: menulis ulang `<table>` dengan `thead` `#F0FDF4` di halaman baru. Bila butuh bentuk tabel berbeda (mis. matriks peran dengan kolom sticky), catat sebagai penyimpangan di `docs/routes/admin/RULES.md`.

### `usePagination` (`src/client/lib/usePagination.ts`)
- **Tanggung Jawab**: Hook pagination klien yang dipakai `DataTable`.
- **Ekspor**: `OPSI_PER_HALAMAN` (`[10, 25, 50, 100]`), `PER_HALAMAN_BAWAAN` (`10`), `HasilPagination<T>`, dan `usePagination(data, { perHalaman })`.
- **Aturan**: halaman **dilarang** menghitung `slice()` pagination sendiri; seluruh tabel berpaginasi memakai hook ini agar ringkasan dan nomor urut konsisten.

### `Carousel` (`src/client/components/Carousel.tsx`)
- **Tanggung Jawab**: Wadah geser mendatar untuk katalog kartu (aplikasi SSO, direktori publik).
- **Props**: `jumlahItem` (wajib), `children` (wajib), `label` (wajib, untuk pembaca layar), `tampilkanKontrol` (bawaan `true`).
- **Perilaku**:
  - Menggeser memakai `scrollLeft`, bukan `transform`, sehingga tetap bisa di-swipe di layar sentuh dan trackpad.
  - `scroll-smooth` dimatikan sementara saat menyeret; dengan smooth aktif, setiap perubahan `scrollLeft` dianimasikan sehingga kartu tertinggal dari kursor.
  - Pendengar `mousemove`/`mouseup` dipasang di `window` agar seret tetap berjalan walau kursor keluar dari kotak.
  - Klik dibatalkan (`capture` di window) bila gestur berubah menjadi seret, agar menyeret tidak ikut membuka aplikasi.
  - Panah **dinonaktifkan** (`opacity-0`, `pointer-events-none`), bukan dihapus, saat sudah mentok - supaya tata letak tidak bergeser.
- **Aturan pemakaian**: setiap kartu anak **wajib** `flex-shrink-0` dengan lebar tetap (`w-[290px] sm:w-[320px]`).
- **Dilarang**: mengganti `Carousel` dengan grid di dashboard; itu menghilangkan panah dan kemampuan seret.

---

## 2. Komponen Kartu & Section

### `DashboardWelcomeCard` (Pola di `Dashboard.tsx`)
- **Tanggung Jawab**: Menampilkan ucapan selamat datang, peran civitas, identitas akademik (NIM/NIDN/Fakultas), dan badge validasi tiket SSO v2.
- **Styling**: `bg-[#F0FDF4] rounded-[24px] border border-[#D8E5DC] p-6 sm:p-7`.

### `AppCard` (Pola di `Dashboard.tsx`)
- **Tanggung Jawab**: Menampilkan kartu katalog aplikasi SSO terintegrasi.
- **Styling**: `bg-white rounded-[18px] border border-[#D8E5DC] shadow-sm w-[290px] sm:w-[320px] flex-shrink-0`.
- **Fitur**: Pratinjau gambar aplikasi dari `getAppPreviewImage(app)` dengan overlay gelap, badge status (`Terkoneksi` / `Terkunci`), deskripsi ringkas, dan tombol buka dengan state loading `redirectingAppId`.

### `DirectoryCard` (Pola di `Dashboard.tsx`)
- **Tanggung Jawab**: Kartu direktori publik kampus di dashboard, bentuknya menyerupai `AppCard` agar dua katalog terlihat sejenis.
- **Fitur**: Gambar sampul dari `getDirectoryPreviewImage(dir)`, badge kategori, ikon direktori di pojok kanan atas, judul, deskripsi 2 baris (`line-clamp-2`), dan tautan "Kunjungi Tautan" yang memanggil `catatKunjunganDirektori(dir.id)`.

### `FormSectionCard` (Pola di `Profile.tsx`)
- **Tanggung Jawab**: Membungkus setiap kelompok input formulir (Aturan Form Section Layout Part 10.8).
- **Styling**: `bg-white rounded-[16px] p-6 sm:p-7 border border-[#D8E5DC] shadow-sm`.
- **Heading**: Icon `@heroicons/react` + judul section 16px font-bold + deskripsi 12px.

---

## 3. Komponen Feedback & Status

### `AppCardSkeleton` & `ProfileSkeleton` (`src/client/components/Skeleton.tsx`)
- **Tanggung Jawab**: State loading visual berbentuk kartu skeleton saat data SSO atau profil sedang di-fetch dari server.
- **Catatan pemakaian**: `ProfileSkeleton` dipakai `Profile.tsx`. `AppCardSkeleton` tersedia tetapi **belum** diimpor halaman mana pun - dashboard kini memakai skeleton kartu geser inline yang ukurannya sama dengan kartu `Carousel`. Jangan memakai `AppCardSkeleton` di dashboard tanpa menyesuaikan lebarnya lebih dulu, karena bentuknya tidak selebar kartu carousel dan akan membuat tata letak melompat saat data tiba.

### `NotificationModal` (`src/client/components/NotificationModal.tsx`)
- **Tanggung Jawab**: Satu-satunya dialog umpan balik aksi. Wajib untuk notifikasi sukses, galat server, dan konfirmasi tindakan destruktif.
- **Varian `type`**: `success`, `error`, `confirm`, `info`, `warning`, `denied`.
- **Aturan**: dilarang memakai `alert()`, `confirm()`, atau banner alert inline sebagai pengganti.

### `StatusBadge`
- **Bentuknya pola kelas, bukan komponen berdiri sendiri.** Tidak ada berkas `StatusBadge.tsx`; varian di bawah ditulis langsung pada elemen badge dan **wajib** mengikuti kode warna yang sama di semua halaman.
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
- Aset desktop **wajib 1376×768 (16:9)** dan aset mobile **1024×1024 (1:1)** dengan tipografi ter-bake. Mengganti aset lewat menu Manajemen Slider berarti tipografi hero di luar kendali design system - pastikan font pada aset tetap Plus Jakarta Sans.
- Dilarang menambahkan kembali lapisan overlay teks/gradient di JSX; larangan ini sudah ditegaskan di `docs/routes/public/CHANGELOG.md`.

### `home/ProfileSection` (`src/client/components/home/ProfileSection.tsx`)
- **Status**: aktif, diimpor oleh `pages/Home.tsx`.
- **Komposisi** (`lg:grid-cols-12`, 6:6 seimbang):
  - **Kiri** - `SectionHeading` (eyebrow *Tentang Platform*, judul *Mengenal ONE UNUSU*), dua paragraf narasi, dan tiga poin keunggulan berikon `shield` dalam bulatan `bg-brand-700`.
  - **Kanan** - foto potret setengah badan `assets/profil-mahasiswa.png` di atas plakat `rounded-[32px]` bersudut gradasi `from-brand-100 via-gold-100/60 to-transparent` setinggi 78%, dengan `drop-shadow-[0_20px_40px_rgba(6,34,23,0.16)]`.
- **Section background**: `bg-ivory` (`#faf9f5`).
- **Aturan Aset**: potret wajib PNG ber-**alpha channel** (latar transparan) agar plakat gradasi tembus di sekitar siluet. Ukuran acuan 726×962 px. Path wajib melalui `assetUrl()`.

### `home/DigitalServicesSection`
- Section aktif pada beranda, memuat katalog layanan terintegrasi dan banner ajakan masuk SSO.

### Komponen belum terpakai
Diverifikasi ulang terhadap `src/client` - daftar ini menyatakan keadaan sebenarnya, bukan rencana.

| Komponen | Status |
| --- | --- |
| `components/SsoLogo.tsx` | Dipakai `SsoLoadingScreen` (yang dipakai `Login` dan `SsoAuthorize`). Bukan komponen mati. |
| `components/Skeleton.tsx` → `AppCardSkeleton` | Belum diimpor halaman mana pun. `ProfileSkeleton` dipakai `Profile.tsx`. |
| `home/AcademicSection.tsx` | Belum diimpor `Home.tsx`. |
| `home/AdmissionCta.tsx` | Belum diimpor `Home.tsx`. |
| `home/HowItWorksSection.tsx` | Belum diimpor `Home.tsx`. |
| `home/NewsAgendaSection.tsx` | Belum diimpor `Home.tsx`. |
| `ui/Badge.tsx` | Hanya diimpor komponen `home/*` yang belum terpasang, jadi efektif belum tampil. |
| `ui/ImagePlaceholder.tsx` | Sama seperti di atas. |
| `ui/PlaceholderValue.tsx` | Diimpor `AcademicSection`, `Footer`, dan `Topbar` - sudah aktif lewat `Footer`/`Topbar`. |
| `ui/SmartLink.tsx` | Diimpor `Footer`, `Navbar`, `Topbar` - sudah aktif. |
| `ui/Logo.tsx` | Dipakai `Footer`, `Navbar`, `SidebarLayout`. Bukan komponen mati. |

**Aturan**: komponen berstatus "belum diimpor" **tidak boleh** dipakai sebagai acuan pola sebelum dihubungkan ke halaman yang berhak. Bila akan dipakai, hubungkan ke `Home.tsx` pada perubahan yang sama dan perbarui tabel ini.

---

## 5. Larangan Duplikasi Komponen

1. DILARANG membuat navbar/headbar sendiri di dalam page. Rute terautentikasi memakai `SidebarLayout`; rute publik memakai `layout/Navbar`.
2. DILARANG membuat style button acak menggunakan inline CSS. Gunakan kelas utility resmi `bg-[#166534] hover:bg-[#14532D] text-white rounded-[8px] font-semibold`.
3. DILARANG membuat dialog modal pasfoto baru di rute lain jika `Profile.tsx` sudah menyediakan crop modal 3x4 kanvas standar.
4. DILARANG menaruh komponen layout di `src/client/components/` tingkat atas. Lokasi resmi hanya `src/client/components/layout/`.

---

## 6. Komponen Laporan & Grafik

> **Tidak berlaku untuk ONE UNUSU.** Komponen `LaporanCharts` (`ReportCard`, `MetricTile`, `DonutChart`, `BarChart`, `ColumnChart`, `TrendChart`, `StackedBar`, `GaugeRing`, `ActivityFeed`) **tidak ada** di `src/client/components/` repo ini. Berkas `src/client/components/LaporanCharts.tsx` tidak ditemukan. Panel laporan/grafik tersebut milik aplikasi cabang (LPPM/LPM/E-Surat) dan tidak dipakai di sini.
>
> Dashboard ONE UNUSU adalah portal peluncuran aplikasi SSO, bukan panel laporan. Aturan "dashboard wajib menampilkan laporan/grafik" **tidak** diterapkan di repo ini. Bila suatu saat laporan dibutuhkan, komponennya harus dibuat di repo ini dan didaftarkan di sini lebih dulu - jangan menyalin dari repo aplikasi cabang.

---

## 7. Komponen Landing Page Lain

> Pola **"teks di kiri, foto potret di kanan"** pada landing ONE UNUSU diimplementasikan langsung di `home/ProfileSection.tsx` (lihat bagian 4). Komponen pembungkus `TentangPlatform.tsx` sudah dihapus dari repo ONE UNUSU agar tidak ada dua implementasi paralel untuk seksi yang sama. Aplikasi cabang (LPM/LPPM/E-Surat) yang membutuhkan pola serupa tetap memakai komponen lokalnya masing-masing di repositori sendiri.
