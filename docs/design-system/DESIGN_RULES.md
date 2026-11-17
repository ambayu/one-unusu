# DESIGN RULES - ONE UNUSU DESIGN SYSTEM

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

## 4. Standar Tata Letak Filter Panel

- Berlaku untuk seluruh halaman panel ONE UNUSU (`/admin/*` dan panel sivitas), bukan portal publik atau repositori aplikasi cabang. Implementasi acuan: `/admin/pengguna`; penerapan halaman lain tidak mengubah semantik filter/izin masing-masing.
- Gunakan template halaman dan komponen data yang terdaftar; filter adalah pola layout lokal, bukan template/komponen baru.
- Kelompokkan filter dalam section putih berjudul (`rounded-[16px] border border-[#D8E5DC] p-4 sm:p-6`). Pisahkan toolbar sinkronisasi/tambah dari grid filter.
- Pencarian memakai satu baris penuh. Dropdown memakai kolom sama lebar: satu kolom pada ponsel, tiga kolom mulai `sm` untuk Peran/Fakultas/Prodi. Pembungkus memakai `min-w-0`, kontrol `min-w-0 w-full`; jangan batasi lebar dropdown berdasarkan panjang label.
- Label terlihat dan terhubung melalui `htmlFor`/`id`. Input/select memakai `px-4 py-3`, border `#D8E5DC`, radius 8px dan focus ring `#166534`. Pencarian berikon memakai `left-4`, ikon 20px, dan `pl-12` agar teks tidak menimpa ikon.
- Status opsional disatukan di setiap kartu ringkasan yang relevan: pada `/admin/pengguna`, kartu **Total Pengguna, Mahasiswa, Dosen, Superadmin** masing-masing berisi tombol total serta tombol **Aktif N / Nonaktif N**. Wadah kartu berupa `div`, kontrol `button type="button"` dengan `aria-pressed`, label status+peran, dan fokus keyboard; jangan menumpuk button di dalam button. Jumlah status dihitung dari keanggotaan kartu pada pengguna termuat, bukan hasil pencarian. Klik status memilih peran kartu dan status sekaligus melalui satu pembaruan URL atomik, bukan dua setter URL berturut-turut. Jangan tambah bar/dropdown status terpisah. Klik hanya menyaring, bukan mengubah keaktifan akun.
- Ukuran tombol aksi header (termasuk Segarkan), status kartu, dan reset mengikuti keterbacaan **Ekspor Rekap**: `text-sm font-semibold px-4 py-3 min-h-[44px]`. Kelompok tombol di kartu maupun header memakai `flex-wrap` agar tidak meluber pada layar sempit.
- Aksi halaman seperti sinkronisasi dan tambah memakai slot `headerAction` template, berdampingan dengan **Segarkan** dalam grup `flex flex-wrap items-center gap-2`; pada layar sempit tombol turun baris, bukan memeras filter.
- Sediakan satu tombol **Reset Semua Filter** pada kepala section, tampil jika salah satu filter aktif, termasuk fakultas/prodi saja atau pencarian. Reset membersihkan seluruh state dan parameter URL filter tanpa menghapus parameter lain; pertahankan aturan cascading.
- Ringkasan filter aktif berupa teks biasa yang membungkus pada layar sempit, bukan chip/badge berwarna atau tombol reset tambahan. Filter individual diubah melalui kontrol asal.

## 5. Spacing & Elevation

- **Skala Spacing**: Menggunakan kelipatan 4px Tailwind (`gap-2` = 8px, `gap-3.5` = 14px, `gap-4` = 16px, `gap-6` = 24px, `p-6` = 24px, `p-7` = 28px).
- **Elevation**: Hindari shadow tebal. Kedalaman visual utama dibuat oleh border `#D8E5DC` yang presisi; shadow hanya pelengkap. Skala shadow netral yang **sah** di proyek ini (Tailwind 3.4, tanpa `boxShadow` kustom di `tailwind.config.js`): `shadow-sm`, `shadow`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-inner`, `shadow-none`.
- **Kelas yang dilarang** (tidak ada di Tailwind 3.4 sehingga menjadi kelas mati tanpa efek): `shadow-xs`, `shadow-2xs`, `scale-103`. Gunakan `shadow-sm` sebagai pengganti untuk kedalaman sangat halus, dan `scale-105` untuk pembesaran hover.
- **Shadow berwarna**: `shadow-brand-900` dan `shadow-brand-950/15` **sah** karena `brand-900` dan `brand-950` terdefinisi di `tailwind.config.js`. Yang dilarang adalah nama skala ukuran yang tidak ada (`shadow-xs`), bukan shadow berwarna.
- **Border Radius**:
  - `8px` (`rounded-[8px]`): Tombol, input teks, filter selector.
  - `10px` (`rounded-[10px]`): Wadah icon, dropdown menu item, badge status.
  - `12px` (`rounded-[12px]`): Dropdown container, modal dialog.
  - `16px` (`rounded-[16px]`): Kartu utama, welcome section, panel tabel.
