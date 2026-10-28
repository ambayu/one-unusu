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

### `home/HeroSection` dan `home/DigitalServicesSection`
- Section aktif pada beranda.

### Komponen belum terpakai
- `home/AcademicSection`, `home/AdmissionCta`, `home/HowItWorksSection`, `home/NewsAgendaSection`, `home/ProfileSection`, dan `components/SsoLogo.tsx` belum diimpor halaman mana pun. Statusnya sedang dalam pengerjaan (belum di-commit). Jangan dipakai tanpa menghubungkannya ke `Home.tsx` lebih dulu.

---

## 5. Larangan Duplikasi Komponen

1. DILARANG membuat navbar/headbar sendiri di dalam page. Rute terautentikasi memakai `SidebarLayout`; rute publik memakai `layout/Navbar`.
2. DILARANG membuat style button acak menggunakan inline CSS. Gunakan kelas utility resmi `bg-[#166534] hover:bg-[#14532D] text-white rounded-[8px] font-semibold`.
3. DILARANG membuat dialog modal pasfoto baru di rute lain jika `Profile.tsx` sudah menyediakan crop modal 3x4 kanvas standar.
4. DILARANG menaruh komponen layout di `src/client/components/` tingkat atas. Lokasi resmi hanya `src/client/components/layout/`.
