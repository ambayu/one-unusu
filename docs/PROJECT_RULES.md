# PROJECT RULES — ONE UNUSU

Dokumen ini berisi aturan global mutlak yang berlaku di seluruh modul, halaman, API endpoint, dan komponen ONE UNUSU.

---

## 1. Aturan Tata Kelola Halaman & Template (Mandatory)

> **"Every page must use the correct page template and shared components. Dashboard must use its own dashboard template. Duplicating UI structure that already exists in a shared template is forbidden."**

1. **Dashboard Khusus**: Dashboard (`/dashboard`) memiliki arsitektur dan template visual sendiri (`DashboardLayout`). Dilarang mengubah dashboard menjadi halaman tabel CRUD atau mewarisi struktur halaman lain.
2. **Reuse Shared Components**: Elemen UI berulang (header, card, input, button, badge, modal) wajib menggunakan komponen bersama yang terdaftar di `docs/design-system/COMPONENTS.md`.
3. **Konfigurasi, Bukan Duplikasi**: Setiap rute halaman hanya bertanggung jawab atas data, kolom, aksi, handler, dan business logic uniknya. Struktur visual berasal dari shared template.

---

## 2. Aturan Form Section Layout (Part 10.8)

1. **Labels & Fields Inside Card**: Setiap kelompok isian form (Personal Info, Kontak, Upload Foto, Keamanan) **wajib dibungkus di dalam kartu (`bg-white rounded-[16px] border border-[#D8E5DC] p-6`)**.
2. **Dilarang Form Mengambang**: Dilarang meletakkan label, input, atau grup form langsung di atas background halaman polos tanpa card container.
3. **Card Heading Wajib**: Setiap card form harus memiliki heading section yang jelas di bagian atas.
4. **Action Button Placement**: Tombol aksi (Submit / Batal) diletakkan di luar/bawah card atau di dalam action bar khusus, bukan mengambang tanpa penahan visual.

---

## 3. Aturan Desain & Visual UI (Modern Green Palette)

1. **Palette Terikat Ketat**:
   - Primary Green: `#166534` (Aksi utama, tombol, navigasi aktif)
   - Deep Green: `#14532D` (Hover tombol primer, teks judul hijau)
   - Secondary Green: `#15803D`
   - Accent Green: `#22C55E` (Indikator status aktif, aksen border)
   - Soft Green: `#DCFCE7` (Badge, wadah icon, text highlight)
   - Pale Green: `#F0FDF4` (Welcome banner, header tabel, highlight section)
   - Main Background: `#F1F5F2` (Off-white kehijauan lembut; dilarang background putih polos di seluruh view)
   - Surface / Card: `#FFFFFF`
   - Main Text: `#1E293B`
   - Secondary Text: `#475569`
   - Border: `#D8E5DC` (Border kehijauan lembut)
2. **Typography**: Menggunakan font utama **Plus Jakarta Sans**. Skala heading 28–32px (Page title), 20–24px (Section), 14–16px (Body), 14px weight 600 (Button).
3. **Anti-Sparkles Rule**: DILARANG keras menggunakan icon `sparkles` (`Sparkles`, `SparklesIcon`, dsb). Gunakan icon fungsional spesifik dari `@heroicons/react`.
4. **Elevation**: Hindari shadow tebal; gunakan border `#D8E5DC` yang presisi dan shadow sangat halus (`shadow-xs` / `shadow-sm`).
5. **Radius**: Konsisten antara `8px` (button/input), `10px` (badge/icon-box), `12px` (dropdown), dan `16px` (card utama).
6. **Palet per Permukaan**: Panel SSO (`/dashboard`, `/profil`, `/admin`, `/login`) memakai token Modern Green di `docs/design-system/COLORS.md`. Portal publik (`/`, `/aplikasi`, `/layanan`, `/bantuan`, `/fakultas`, `/prodi`, `/keamanan`) memakai token `brand` dan `gold` di `tailwind.config.js`. Dilarang mencampur kedua palet dalam satu halaman, dan dilarang menambah kode HEX baru langsung di kelas Tailwind.
7. **Efek Dekoratif**: `backdrop-blur`, gradien, dan glow hanya dipakai jika punya alasan fungsional (keterbacaan teks di atas foto, pemisah lapisan). Maksimal satu atau dua elemen per layar.

---

## 4. Aturan Fungsional & Bisnis SSO

1. **Mandatory Biodata Completion**: Pengguna yang belum mengisi email atau WhatsApp akan menerima warning banner dan diarahkan untuk melengkapi kontak di halaman `/profil`.
2. **Pasfoto Resmi 3x4 Merah**: Mahasiswa dan dosen wajib memiliki pasfoto 3x4 dengan latar belakang merah pekat (`#b91c1c` / red-700) yang dapat di-crop interaktif di browser.
3. **Pemisahan Peran Civitas**:
   - `MAHASISWA`: Menampilkan data NIM, Program Studi, Fakultas, dan link perkuliahan.
   - `DOSEN`: Menampilkan data NIDN/NUP, Homebase Prodi, dan Fakultas Induk.
   - `SUPERADMIN`: Menampilkan Username, Unit Kerja PUSTIK, hak akses Root SSO, dan tab Registry SSO Apps & Civitas User Management.
4. **SSO Ticket Protocol**: Otorisasi ke aplikasi turunan (LMS, SIAKAD, dsb) wajib menggunakan `GET /api/sso/app-client/:clientId/v2/redirect`. Endpoint ini menerbitkan token acak 64 karakter, single-use, berlaku 5 menit, dan disimpan di tabel `sso_auth_tokens`. Verifikasi dilakukan server-ke-server melalui `POST /api/v2/website/verify-token` dengan `client_id`, `client_key`, dan `token`.

---

## 5. Aturan Keamanan, Database, & Kode

1. **No Persona Inside Code**: Dilarang memasukkan joke, slang, watermark, atau persona apa pun ke dalam source code, komentar kode, API response, atau basis data.
2. **Secret Safety**: Jangan membocorkan `.env`, API key, hash kata sandi, token JWT, atau kredensial database ke output client atau logging.
3. **Database Safety**: Operasi destruktif (`DROP`, `TRUNCATE`, bulk delete) dilarang keras tanpa persetujuan eksplisit.
4. **Type Safety**: Kode TypeScript harus bersih, hindari penggunaan `any` atau `@ts-ignore` tanpa alasan defensif yang valid.

---

## 6. Aturan Navigasi & Integritas Rute (Mandatory)

1. **Rute Terdaftar**: Setiap item di `mainNavigation`, `topbarLinks`, dan `footerQuickLinks` wajib menunjuk rute yang terdaftar di `src/client/App.tsx`. Tautan ke halaman yang belum ada dilarang; gunakan `href: null` agar `SmartLink` menampilkan status nonaktif.
2. **Satu Perubahan, Satu Kesatuan**: Menambah halaman berarti menambah rute di `App.tsx`, menambah tautan navigasi, dan menambah dokumentasi di `docs/routes/<modul>/` pada perubahan yang sama.
3. **Tanpa Halaman Yatim**: Halaman yang tidak dapat diakses dari navigasi maupun rute internal dilarang dibiarkan di repositori. Hapus, atau daftarkan rutenya.
4. **Tanpa Komponen Duplikat**: Komponen layout hanya boleh berada di `src/client/components/layout/`. Dilarang membuat salinan di `src/client/components/` tingkat atas.
5. **Tanpa Data Palsu di UI**: Nilai fallback identitas wajib berupa label netral (`Pengguna`, `Belum tersedia`). Dilarang menampilkan nama, NIM, prodi, atau status contoh yang terlihat seperti data asli.
