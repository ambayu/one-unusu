# Portal Publik - Rules

Aturan teknis dan desain untuk seluruh rute publik (`/`, `/aplikasi`, `/layanan`, `/bantuan`, `/fakultas`, `/prodi`, `/keamanan`).

---

## 1. Aturan Layout

1. Setiap halaman publik wajib memakai urutan `Topbar` lalu `Navbar` lalu `main` lalu `Footer`.
2. `Navbar` menerima `items={mainNavigation}` dan `registerUrl={externalUrls.pmb}`. Dilarang membuat menu sendiri di dalam halaman.
3. Lebar konten diatur oleh `ui/Container`. Dilarang menyetel `max-w-*` baru per halaman tanpa alasan hierarki.
4. Judul section memakai `ui/SectionHeading`. Ikon memakai `ui/Icon` atau Heroicons, bukan `lucide-react`.

---

## 2. Aturan Navigasi

1. Setiap item di `mainNavigation`, `topbarLinks`, dan `footerQuickLinks` wajib menunjuk rute yang terdaftar di `src/client/App.tsx`.
2. Menambah halaman baru berarti menambah rute di `App.tsx` dan menautkannya di `src/client/data/navigation.ts` pada perubahan yang sama.
3. Dilarang menaruh tautan ke halaman yang belum ada. Jika belum siap, gunakan `href: null` agar `SmartLink` menampilkan status nonaktif.

---

## 3. Aturan Data

1. Data akademik diambil dari `src/client/data/academics.ts` (`faculties`, `studyPrograms`, `programsByFaculty`).
2. Data layanan diambil dari `src/client/data/services.ts`. Status layanan wajib salah satu dari `available` atau `coming-soon`.
3. Data kontak dan tautan eksternal diambil dari `src/client/data/site.ts`.
4. Dilarang menulis angka statistik, nama orang, atau klaim keamanan yang tidak bersumber dari data project.

---

## 4. Aturan Visual

1. Palet portal publik memakai token `brand` dan `gold` dari `tailwind.config.js`. Dilarang menambah kode HEX baru di dalam kelas Tailwind.
2. Efek blur (`backdrop-blur`) hanya untuk lapisan teks di atas foto, maksimal satu elemen per layar.
3. Gradien hanya dipakai untuk memisahkan lapisan hierarki (misalnya overlay teks di atas foto), bukan sebagai latar seluruh halaman.
4. Target sentuh minimum 44px untuk tombol dan item menu di mobile.
