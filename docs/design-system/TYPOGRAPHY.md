# TYPOGRAPHY SYSTEM — PLUS JAKARTA SANS

Standar tipografi resmi aplikasi ONE UNUSU menggunakan font keluarga **Plus Jakarta Sans**.

---

## 1. Font Family & Weight

- **Primary Font**: `'Plus Jakarta Sans', sans-serif`
- **Tersedia Weights**:
  - `400` (Regular): Teks deskripsi, paragraf, metadata
  - `500` (Medium): Label form, navigation items non-aktif
  - `600` (Semibold): Subheading, tombol aksi, badge, tabel header
  - `700` (Bold): Judul halaman (Page Title), card title, metrik angka statistik
  - `800` (Extra Bold): Brand logo atau hero heading tertentu

---

## 2. Type Scale Table

Skala dibedakan per permukaan. Portal publik memakai ukuran longgar, panel SSO memakai ukuran padat karena berisi tabel, metadata, dan kontrol.

| Level Elemen | Portal Publik | Panel SSO | Weight | Tracking |
|---|---|---|---|---|
| **Hero / Banner Heading** | 24 → 48px (`text-2xl sm:text-4xl lg:text-5xl`) | — | 700 | `tracking-tight` |
| **Page Title** | — | 20 → 24px (`text-xl sm:text-2xl`) | 700 | `tracking-tight` |
| **Section Title** | 30 → 36px (`text-3xl sm:text-4xl`) | 16px (`text-base`) | 600 publik / 700 panel | `tracking-tight` / normal |
| **Card Title** | 16–18px (`text-base sm:text-lg`) | 16px (`text-base`) | 600–700 | Normal |
| **Body Text** | 14–16px (`text-sm sm:text-base`) | 12px (`text-xs`) | 400 | Normal |
| **Secondary Text** | 13–14px (`text-xs sm:text-sm`) | 11px (`text-[11px]`) | 400–500 | Normal |
| **Form Label** | 13–14px (`text-sm`) | 13px (`text-sm`) | 500–600 | Normal |
| **Table Head / Cell** | 12–13px (`text-xs`) | 11–12px (`text-[11px]` / `text-xs`) | 500–600 | Normal |
| **Button Text** | 13–14px (`text-xs sm:text-sm`) | 12–13px (`text-xs`) | 600–700 | Normal |
| **Badge / Tag** | 10–12px (`text-[10px] sm:text-xs`) | 10–11px (`text-[10px]`) | 600–700 | `tracking-wider` |

---

## 3. Aturan Tipografi

1. **Kontras Terjamin**: Teks `#1E293B` di atas background putih atau `#F1F5F2` menjamin rasio kontras WCAG AAA.
2. **Keterbacaan Monospace**: Untuk NIM, NIDN, ID Tiket SSO, dan URL callback wajib menggunakan class font monospace (`font-mono`).
3. **Line Length**: Paragraf dibatasi maksimal 65–75 karakter per baris (`max-w-2xl` atau `max-w-3xl`) agar nyaman dibaca.
4. **Satu Keluarga Font**: `font-sans` dan `font-display` di `tailwind.config.js` sama-sama menunjuk ke Plus Jakarta Sans. `font-display` hanya alias semantik untuk heading, bukan font kedua. Dilarang memuat font keluarga lain.
5. **Dua Kepadatan**: Portal publik memakai body 14–16px. Panel SSO memakai body 12px dengan secondary 11px. Dilarang memakai body 16px di dalam panel karena merusak kepadatan tabel.
6. **Hierarki Judul**: Satu halaman hanya boleh punya satu `h1`. Panel memakai Page Title 20–24px, portal publik memakai Hero Heading sampai 48px.
