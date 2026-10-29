# Changelog - Portal Publik

## [2026-10-30]

### Changed
- **Section Profil Landing Page**: `ProfileSection` diubah fokusnya dari profil universitas menjadi profil platform **ONE UNUSU** — eyebrow "Tentang Platform", judul "Mengenal ONE UNUSU", narasi tentang gateway identitas digital tunggal, serta daftar keunggulan (satu kredensial, token SSO single-use, kendali akses berbasis peran).
- **Kartu "Ekosistem ONE UNUSU" Dihapus**: Blok kartu ekosistem 4 lapis di kolom kanan dihapus dan digantikan visual foto mahasiswa berukuran besar, sehingga section menjadi dua kolom seimbang (narasi di kiri, visual di kanan).
- **Banner Ajakan Masuk SSO**: `DigitalServicesSection` — card "Siap Mengakses Layanan Kampus Anda?" diubah dari `max-w-4xl mx-auto` menjadi `w-full` sehingga selebar kontainer section.
- **Hero Landing Page — Teks Menyatu di Gambar**: `HeroSection` tidak lagi menampilkan panel teks overlay (tag, judul, paragraf). Headline tiap slide di-bake langsung ke dalam aset banner agar foto tetap jernih tanpa lapisan blur. Sisa overlay di JSX hanya tombol aksi, indikator slide, dan navigasi; judul halaman dipindah ke `h1.sr-only` untuk aksesibilitas.
- **Hero Landing Page — Pesan per Slide**: Teks banner kini berbeda tiap slide (bukan "ONE UNUSU" seragam): *Kampus Terpadu / Gedung Rektorat Gaperta*, *Aktivitas Akademik / Kolaborasi Mahasiswa*, *Fasilitas Teknologi / Laboratorium Komputasi*, *Pusat Literasi / Perpustakaan Kampus*.
- **Hero Landing Page — Mobile**: Banner memakai aset mobile 1:1 terpisah lewat `<picture><source media="(max-width: 767px)">`, dirender pada kontainer `aspect-square` sehingga tampil utuh tanpa ter-crop dan teks tetap besar. Mulai breakpoint `md` banner menjadi full-bleed `absolute inset-0` memakai aset 16:9 dengan `object-cover`.

### Added
- **Aset hero mobile** `public/assets/hero/*-mobile.png` (1024×1024) — empat banner vertikal dengan tipografi di tengah-atas dan scrim gradient hijau tua di bagian atas.
- **Aset `public/assets/profil-mahasiswa.png`**: potret **setengah badan** (waist-up) mahasiswa berhijab mint dengan blazer kampus, latar transparan (alpha channel), dipotong presisi memakai flood-fill chroma key + feathering tepi, lalu auto-crop bounding box (726×962 px).
- **Aset hero baru** `public/assets/hero/hero-library-4.png` (1376×768) sebagai slide keempat, menggantikan tangkapan layar `app-lms.png` yang tidak sesuai konteks banner.
- Seluruh aset hero desktop (`hero-campus-1.png`, `hero-students-2.png`, `hero-digital-3.png`, `hero-library-4.png`) diregenerasi 1376×768 dengan tipografi di-bake dan scrim gradient hijau tua di sisi kiri.

## [2026-10-29]

### Added
- Rute `/fakultas`, `/prodi`, `/layanan`, dan `/keamanan` didaftarkan di `App.tsx`. Sebelumnya keempat halaman ini sudah ada tetapi tidak dapat diakses.
- Menu `Akademik` (dropdown Fakultas dan Program Studi) serta item `Layanan Terpadu` pada `mainNavigation`.
- Tautan Fakultas, Program Studi, Layanan Terpadu, dan Keamanan & Privasi pada `footerQuickLinks`.

### Removed
- `pages/Berita.tsx` dihapus karena tidak pernah dirutekan dan mengimpor `fetchBerita` yang tidak ada di `services/api.ts`.
- `components/Navbar.tsx` dan `components/Footer.tsx` dihapus karena duplikat dari `components/layout/*` dan tidak diimpor di mana pun.
