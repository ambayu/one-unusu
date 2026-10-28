# PROMPT VIBE CODING — MODERN GREEN UI DESIGN SYSTEM

Bertindaklah sebagai Senior UI/UX Designer dan Senior Frontend Engineer yang ahli dalam membangun website modern, profesional, minimalis, dan production-ready.

Tugasmu adalah memperbaiki atau membangun tampilan UI website menggunakan design system berikut. Terapkan desain ini secara konsisten ke seluruh halaman, bukan hanya halaman utama.

## 1. DESIGN DIRECTION

Buat website dengan karakteristik:
- Modern, clean, elegant, professional, dan minimalis.
- Dominasi warna hijau yang natural, segar, dan nyaman dilihat.
- Background terang, banyak whitespace, serta hierarki visual yang jelas.
- Gunakan rounded corners secukupnya, border halus, dan shadow yang lembut.
- Hindari tampilan terlalu ramai, terlalu banyak gradient, warna neon, efek glassmorphism berlebihan, dan dekorasi yang tidak diperlukan.
- Jangan membuat UI terlihat seperti template AI generik.
- Prioritaskan readability, usability, accessibility, dan konsistensi antarkomponen.

## 2. COLOR PALETTE

Gunakan warna berikut sebagai standar global aplikasi.

### Primary Colors
- Primary Green: `#166534`
- Deep Green: `#14532D`
- Secondary Green: `#15803D`
- Accent Green: `#22C55E`
- Soft Green: `#DCFCE7`
- Pale Green: `#F0FDF4`

### Neutral Colors
- Main Background: `#F1F5F2` (hijau keabu-abuan sangat lembut)
- Surface / Card: `#FFFFFF`
- Main Text: `#1E293B`
- Secondary Text: `#475569`
- Muted Text: `#64748B`
- Placeholder: `#94A3B8`
- Border: `#D8E5DC` (border hijau lembut berkarakter)
- Divider: `#E8EFEA`

### Semantic Colors
- Success: `#15803D`
- Success Background: `#DCFCE7`
- Warning: `#B45309`
- Warning Background: `#FEF3C7`
- Error: `#B91C1C`
- Error Background: `#FEE2E2`
- Information: `#0369A1`
- Information Background: `#E0F2FE`

### Color Usage Rules
- Gunakan `#166534` untuk primary buttons, active navigation, dan elemen utama.
- Gunakan `#22C55E` untuk aksen, indikator positif, atau elemen dekoratif kecil.
- Gunakan `#DCFCE7` untuk selected states, soft badges, dan background highlight.
- Gunakan `#F8FAFC` sebagai background halaman dan `#FFFFFF` untuk card.
- Gunakan `#1E293B` untuk teks utama agar mudah dibaca.
- Jangan menggunakan hijau terang sebagai background besar dengan teks putih apabila kontrasnya rendah.
- Jangan menggunakan warna hijau yang berbeda-beda tanpa alasan. Semua warna harus berasal dari palette yang telah ditentukan.

## 3. TYPOGRAPHY SYSTEM

Gunakan **Plus Jakarta Sans** sebagai font utama untuk seluruh aplikasi.

Font weights:
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700
- Extra Bold: 800, khusus kebutuhan tertentu.

Gunakan skala typography berikut:

| Element | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Hero Heading | 40–48px | 30–36px | 700–800 |
| Page Title | 28–32px | 24–28px | 700 |
| Section Heading | 20–24px | 18–20px | 600–700 |
| Card Title | 16–18px | 16px | 600 |
| Body Text | 16px | 14–16px | 400 |
| Secondary Text | 14px | 13–14px | 400 |
| Form Label | 14px | 14px | 500–600 |
| Table Text | 13–14px | 13–14px | 400 |
| Button Text | 14–16px | 14–16px | 600 |
| Caption | 12–13px | 12px | 400 |

Typography rules:
- Body line-height: 1.6.
- Heading line-height: 1.2–1.4.
- Jangan menggunakan terlalu banyak ukuran font dalam satu halaman.
- Gunakan ukuran heading secara konsisten.
- Hindari paragraf terlalu lebar dan teks terlalu kecil.
- Gunakan letter spacing negatif secara ringan hanya untuk heading berukuran besar.
- Pastikan seluruh teks mudah dibaca pada desktop dan mobile.

## 4. LAYOUT & SPACING

Gunakan sistem spacing berbasis kelipatan 4px:

- 4px: jarak sangat kecil.
- 8px: jarak elemen berdekatan.
- 12px: jarak komponen kecil.
- 16px: jarak standar.
- 24px: jarak antarkelompok komponen.
- 32px: jarak antarbagian.
- 48px: jarak section.
- 64px: jarak section besar pada landing page.

Layout rules:
- Gunakan container yang terstruktur dan konsisten.
- Batasi lebar konten agar tidak terlalu melebar di monitor besar.
- Gunakan grid dan flexbox sesuai kebutuhan.
- Jaga alignment, padding, dan margin antarkomponen.
- Jangan membuat setiap elemen menjadi card.
- Gunakan whitespace untuk membedakan hierarki konten.
- Hindari layout yang terlalu padat atau terlalu banyak ruang kosong tanpa tujuan.

## 5. COMPONENT STYLING

### Buttons
- Primary background: `#166534`.
- Primary text: `#FFFFFF`.
- Hover background: `#14532D`.
- Border radius: 8–10px.
- Tinggi tombol standar: 40–44px.
- Tombol utama harus terlihat jelas tanpa efek berlebihan.
- Sediakan hover, focus-visible, disabled, dan loading states jika relevan.

### Cards
- Background: `#FFFFFF`.
- Border: `1px solid #E2E8F0`.
- Border radius: 12–16px.
- Padding: 20–24px.
- Gunakan shadow tipis hanya apabila diperlukan.
- Jangan menambahkan shadow berat pada semua card.

### Forms
- Input height: 42–46px.
- Border: `#CBD5E1` atau `#E2E8F0`.
- Border radius: 8px.
- Label harus berada pada posisi yang jelas.
- Focus border: `#166534`.
- Tambahkan focus ring yang mudah terlihat.
- Validasi error harus menampilkan pesan yang jelas, bukan hanya perubahan warna.

### Tables
- Header background: `#F8FAFC`.
- Header text: `#475569`.
- Body text: `#1E293B`.
- Border: `#E2E8F0`.
- Row hover: `#F0FDF4`.
- Gunakan padding sel yang nyaman.
- Pertahankan keterbacaan dan responsivitas pada layar kecil.

### Navigation
- Gunakan warna hijau tua untuk active state.
- Navigation yang tidak aktif menggunakan warna netral.
- Pastikan active state mudah dibedakan.
- Pada dashboard, sidebar harus rapi dan tidak terlalu lebar.
- Pada mobile, gunakan navigasi yang sesuai dengan pola aplikasi.

### Badges & Status
- Gunakan soft background dengan teks berkontras tinggi.
- Success: teks `#15803D`, background `#DCFCE7`.
- Warning: teks `#92400E`, background `#FEF3C7`.
- Error: teks `#B91C1C`, background `#FEE2E2`.
- Jangan menggunakan badge untuk dekorasi yang tidak memiliki fungsi.

## 6. RESPONSIVE DESIGN

Pastikan website berfungsi dengan baik pada:
- Mobile: 320–767px.
- Tablet: 768–1023px.
- Desktop: 1024px ke atas.

Ketentuan:
- Gunakan responsive grid dan breakpoint yang sesuai.
- Heading harus menyesuaikan ukuran layar.
- Hindari horizontal overflow.
- Sidebar desktop harus beradaptasi menjadi navigasi mobile jika diperlukan.
- Tabel lebar harus memiliki solusi mobile yang layak.
- Button dan input harus mudah digunakan dengan sentuhan.
- Pertahankan hierarchy dan spacing pada seluruh ukuran layar.

## 7. ACCESSIBILITY & UX

- Pastikan kontras teks dan background memadai.
- Jangan menjadikan warna sebagai satu-satunya penanda status.
- Gunakan semantic HTML.
- Pastikan elemen interaktif dapat digunakan dengan keyboard.
- Sediakan visible focus states.
- Gunakan label yang jelas untuk setiap input.
- Tambahkan loading, empty, success, dan error states sesuai kebutuhan.
- Pertahankan aksesibilitas ketika menggunakan icon atau elemen dekoratif.

## 8. IMPLEMENTATION RULES

Sebelum melakukan perubahan:
1. Periksa struktur proyek, framework, styling system, dan komponen yang sudah tersedia.
2. Identifikasi halaman serta komponen yang perlu disesuaikan.
3. Pertahankan fungsi, business logic, API integration, routing, authentication, dan validasi yang sudah berjalan.
4. Jangan mengganti framework atau menginstal library baru tanpa kebutuhan yang jelas.

Saat melakukan implementasi:
1. Buat design tokens atau CSS variables sebagai sumber warna, typography, spacing, dan radius.
2. Terapkan design system melalui komponen reusable.
3. Hindari duplikasi style yang tidak perlu.
4. Gunakan icon library yang sudah ada dalam proyek.
5. Jangan menggunakan emoji sebagai pengganti icon UI profesional.
6. Jangan mengubah data atau fitur yang tidak berkaitan dengan pekerjaan UI.
7. Pertahankan kompatibilitas dengan struktur proyek yang sudah ada.

## 9. QUALITY CHECK

Setelah implementasi:
- Periksa konsistensi warna dan font pada seluruh halaman.
- Periksa ukuran heading, body, tabel, label, dan tombol.
- Periksa hover, focus, disabled, dan error states.
- Pastikan tidak ada teks terpotong atau elemen bertabrakan.
- Pastikan responsive layout bekerja.
- Jalankan lint, type-check, build, atau test yang tersedia dalam proyek.
- Perbaiki error yang muncul akibat perubahan.
- Jangan mengklaim pengujian berhasil jika belum benar-benar dijalankan.

## FINAL OBJECTIVE

Hasil akhir harus terlihat seperti produk digital profesional yang dirancang oleh tim UI/UX berpengalaman: clean, modern, konsisten, mudah digunakan, responsif, dan nyaman dibaca.

Terapkan design system ini pada halaman yang relevan di proyek yang sedang terbuka. Sesuaikan implementasi dengan framework dan struktur kode yang sudah ada, lalu berikan ringkasan file yang diubah serta hasil pengecekan yang benar-benar telah dilakukan.