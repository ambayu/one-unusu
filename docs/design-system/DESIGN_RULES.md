# DESIGN RULES — ONE UNUSU DESIGN SYSTEM

Dokumen ini mendefinisikan prinsip estetika, visual hierarchy, elevation, spacing, dan aturan form section layout pada aplikasi ONE UNUSU.

---

## 1. Prinsip Desain Utama

1. **Modern Institutional Cleanliness**:
   - Memadukan karakter kelembagaan universitas dengan estetika modern enterprise SaaS.
   - Menggunakan warna hijau islami bernilai wibawa (`#14532D`, `#166534`) tanpa terlihat kuno atau kusam.
2. **Eliminasi Flat Pure White Emptiness**:
   - Dilarang membuat seluruh layar putih polos yang menyilaukan mata dan membuat layout mengambang.
   - Gunakan `#F1F5F2` sebagai background canvas utama, `#F0FDF4` sebagai background kartu informasi penting, dan `#FFFFFF` dengan border `#D8E5DC` untuk card interaktif.
3. **No Slop & No Over-Decoration**:
   - Dilarang menggunakan gradient pelangi, border tebal berlebihan, efek glassmorphism murahan, atau icon sparkles AI generik.
   - Desain mengutamakan kejelasan fungsi, kontras teks, dan struktur visual yang kokoh.

---

## 2. Visual Hierarchy & Surface Mapping

| Elemen UI | Token / Hex | Karakteristik |
|---|---|---|
| Main Page Canvas | `#F1F5F2` | Off-white kehijauan lembut, menenangkan dan berkarakter |
| Primary Sidebar | `#FFFFFF` | Permukaan putih dengan border kanan `#D8E5DC`, item aktif pill `#15803D` |
| Top Headbar | `#FFFFFF` | Sticky `h-16`, border bawah `#D8E5DC`, shadow sangat halus |
| Highlight / Welcome Card | `#F0FDF4` | Pale Green dengan border `#D8E5DC` dan badge peran |
| Standard Content Card | `#FFFFFF` | Permukaan putih dengan border halus `#D8E5DC` |
| Primary Button | `#166534` | Hover ke `#14532D`, teks putih, font-weight 600 |
| Secondary / Action Button | `#F0FDF4` | Border `#D8E5DC`, teks `#166534`, hover `#DCFCE7` |
| Icon Container | `#DCFCE7` | Wadah icon ber-radius 10px dengan border `#BBF7D0` atau `#D8E5DC` |

---

## 3. Form Section Layout Rule (Part 10.8)

1. **Wajib Memakai Card Container**:
   - Setiap grup field form (misal: "Informasi Pribadi", "Kontak Resmi", "Keamanan Akun") **wajib dibungkus di dalam kartu (`bg-white rounded-[16px] border border-[#D8E5DC] p-6`)**.
   - Dilarang meletakkan label atau input langsung di atas background canvas tanpa card container.
2. **Section Heading**:
   - Setiap card form harus memiliki heading 16–18px font-bold dengan deskripsi ringkas 12px teks sekunder.
3. **Tombol Form**:
   - Tombol simpan dan batal diletakkan di footer form atau di bawah card dengan penataan yang jelas.

---

## 4. Spacing & Elevation

- **Skala Spacing**: Menggunakan kelipatan 4px Tailwind (`gap-2` = 8px, `gap-3.5` = 14px, `gap-4` = 16px, `gap-6` = 24px, `p-6` = 24px, `p-7` = 28px).
- **Elevation**: Hindari shadow tebal; gunakan border `#D8E5DC` yang presisi didukung `shadow-xs` atau `shadow-2xs`.
- **Border Radius**:
  - `8px` (`rounded-[8px]`): Tombol, input teks, filter selector.
  - `10px` (`rounded-[10px]`): Wadah icon, dropdown menu item, badge status.
  - `12px` (`rounded-[12px]`): Dropdown container, modal dialog.
  - `16px` (`rounded-[16px]`): Kartu utama, welcome section, panel tabel.
