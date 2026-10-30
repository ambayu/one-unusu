# Changelog — Profile & Biodata

## [2026-10-30] - Notifikasi Modal Saat Dialihkan dari Dashboard

### Added
- `NotificationModal` bertipe `info` tampil sekali saat pengguna tiba di `/profil` dengan `state.requiredBio = true` dan biodata masih belum lengkap. Modal dapat ditutup; warning banner tetap tampil sebagai pengingat persisten.
- Kelengkapan biodata kini dihitung lewat `isBiodataComplete()` (`src/client/lib/biodata.ts`), bukan ekspresi `!user?.email || !user?.noHp` yang diduplikasi.

## [2026-10-29] - Penghapusan Warna Default Tailwind

### Changed
- Banner "Lengkapi Biodata Akun Anda" memakai token Warning resmi: latar `#FEF3C7`, border `#FDE68A`, judul `#92400E`, isi dan ikon `#B45309`. Sebelumnya memakai ramp `amber-*` di luar palet.
- Modal crop pasfoto memakai token panel: border `#D8E5DC`, divider `#E8EFEA`, judul `#1E293B`, teks bantuan `#64748B`, tombol tutup `#94A3B8`, hover `#F1F5F2`.
- Kanvas pasfoto 3x4 ditulis eksplisit sebagai `bg-[#B91C1C]` (nilai sama dengan `red-700`), bukan class default Tailwind.

## [2026-10-29]

### Changed
- Standardized form sections inside `#FFFFFF` cards with `#D8E5DC` borders following Part 10.8 rules.
- Upgraded role badge styling and metadata boxes with `#F0FDF4` backgrounds and `#D8E5DC` borders.
- Preserved 3x4 formal pasfoto crop modal with solid red canvas background (`#b91c1c`).
- Normalized input borders from `#CBD5E1` to `#D8E5DC`, dividers from `#F1F5F9` to `#E8EFEA`, chip backgrounds to `#F1F5F2`, and button active state to `#14532D`.
- Replaced `slate` overlay on the crop modal with `#1E293B` and removed the unnecessary blur.
