# Dashboard Route - Rules

Dokumentasi aturan khusus rute `/dashboard` (Portal SSO Gateway).

---

## 1. Template & Komponen yang Digunakan
- **Template**: Dashboard Template (`DashboardLayout`) - lihat `docs/design-system/PAGE_TEMPLATES.md` bagian Template A.
- **Induk rute**: `PanelLayout` (`src/client/components/PanelLayout.tsx`). Komponen ini memasang `SidebarLayout` **satu kali** untuk seluruh area panel, sehingga sidebar tidak lepas-pasang saat berpindah menu. Halaman **tidak** boleh memasang `SidebarLayout` sendiri.
- **Shared Components**: `Carousel`, `NotificationModal`, `SsoLogo`, `AnimatedFlatSsoLogo`, Heroicons v2 (`@heroicons/react/24/outline`). Dilarang memakai `lucide-react` dan ikon `Sparkles`.
- **Warna Spesifik**:
  - Welcome Card: `#F0FDF4` dengan border `#D8E5DC`
  - App Card Container: `#FFFFFF` dengan border `#D8E5DC`
  - App Icon Container: `#DCFCE7` dengan border `#BBF7D0`
  - Badge terkunci: `#1E293B/90` dengan teks putih
  - Badge terkoneksi: `#DCFCE7` dengan teks `#15803D`

---

## 2. Aturan Bisnis & Integrasi
1. Mengambil data paralel via `Promise.allSettled([fetchMe(), fetchSsoApps(), fetchDirectories()])`.
   - **Dilarang** memakai `Promise.all` di sini. `allSettled` tidak pernah melempar galat, sehingga kegagalan satu permintaan tidak menjatuhkan dua daftar lainnya; konsekuensinya tiap hasil **wajib** diperiksa statusnya sendiri.
2. Jika `fetchMe` gagal dengan status 401/403, serahkan pembersihan sesi kepada interceptor API (yang menghapus `one_unusu_token` dan `one_unusu_user` lalu mengalihkan ke `/login`); fungsi hanya berhenti tanpa menimpa pesan.
3. Membuka aplikasi menggunakan `GET /api/sso/app-client/:clientId/v2/redirect` melalui `getSsoRedirectV2`, dengan state loading interaktif `redirectingAppId`. Seluruh kartu aplikasi tetap menampilkan tombol buka; apabila pengguna tidak memiliki izin ke aplikasi tersebut (`isAllowed === false` atau HTTP 403), tampilkan `NotificationModal` bertajuk **Akses Ditolak** dengan pesan `"Akses ditolak. Anda tidak memiliki akses ke aplikasi ini."` tanpa menampilkan nama peran pengguna.
4. **Super Administrator & Admin SSO Access**: Akun dengan peran `SUPERADMIN` atau `ADMIN_SSO` secara otomatis memiliki hak akses penuh ke seluruh kartu aplikasi SSO (`isAllowed = true`) pada katalog maupun proses penerbitan token, tanpa terkunci oleh evaluasi izin masuk cabang.
5. **Gerbang biodata pada `handleLaunchApp`**: bila `isBiodataComplete(user)` bernilai `false` (email atau nomor WhatsApp kosong), jangan minta tiket SSO. Alihkan ke `/profil` dengan `state: { requiredBio: true }` agar halaman biodata menampilkan notifikasi modal.
6. Jika profil civitas belum memiliki email atau WhatsApp, tampilkan warning banner pengingat biodata (tidak memblokir akses dashboard).

---

## 3. Aturan Keadaan (Loading, Galat, Kosong)

Ketiga keadaan ini **wajib dibedakan** dan tidak boleh saling menutupi.

1. **Loading** - skeleton berbentuk kartu (`animate-pulse`, `w-[290px] sm:w-[320px]` untuk direktori) yang ukurannya sama dengan kartu asli, sehingga tata letak tidak melompat saat data tiba.
2. **Galat** - disimpan pada state terpisah per daftar:
   - `galatApps` untuk daftar aplikasi SSO,
   - `galatDirektori` untuk daftar direktori publik.
   Keduanya ditampilkan sebagai kotak merah (`bg-[#FEF2F2]`, border `#FECACA`, teks `#B91C1C`, ikon `ExclamationCircleIcon`).
3. **Kosong** - hanya boleh muncul bila server **menjawab sukses** dengan daftar kosong.
4. **Larangan tegas**: saat pemuatan gagal, dilarang menampilkan teks "Belum ada aplikasi SSO aktif" atau "Belum ada direktori publik yang dikonfigurasi". Kalimat itu menyatakan fakta tentang konfigurasi admin, padahal yang sebenarnya terjadi adalah server tidak menjawab - itu menyesatkan.
5. Pesan galat wajib menyatakan pemuatan gagal dan menyarankan tindakan (muat ulang), bukan menyalahkan server tanpa bukti maupun mengklaim data tidak ada.
6. Kegagalan pencatatan kunjungan (bagian 5) **boleh** diabaikan, karena itu statistik sampingan dan pengguna sudah diarahkan ke tautan tujuan. Pengabaian ini harus berupa `catch` eksplisit berkomentar - bukan `catch` kosong tanpa alasan.

---

## 4. Aturan Katalog & Urutan (Carousel + `hitCount`)

1. Katalog aplikasi SSO dan direktori publik **wajib** dirender di dalam `Carousel`, bukan grid. Bila jumlah item lebih dari satu, `Carousel` menampilkan tombol panah kiri/kanan; isinya juga dapat diseret (drag) dengan mouse maupun digeser di layar sentuh.
2. `Carousel` memakai `scrollLeft` (bukan `transform`) dan mematikan `scroll-smooth` selama gestur seret, agar kartu menempel pada kursor. Pendengar `mousemove`/`mouseup` dipasang di `window` agar seret tetap berjalan walau kursor keluar dari area.
3. Setiap kartu di dalam `Carousel` wajib `flex-shrink-0` dengan lebar `w-[290px] sm:w-[320px]`. Tanpa `flex-shrink-0`, kartu akan terhimpit dan carousel kehilangan makna.
4. Urutan kartu **bukan** urutan manual. Server mengurutkan `GET /api/sso/apps` dengan `[{ hitCount: "desc" }, { order: "asc" }]` dan `GET /api/directories` dengan `[{ hitCount: "desc" }, { urutan: "asc" }]`. Kolom manual (`order`/`urutan`) hanya berperan sebagai pemutus seri ketika `hitCount` sama.
5. `hitCount` dinaikkan **hanya** oleh kunjungan nyata:
   - aplikasi SSO: di dalam `GET /api/sso/app-client/:clientId/v2/redirect` saat tiket benar-benar diterbitkan;
   - direktori publik: `POST /api/directories/:id/hit` yang dipanggil `catatKunjunganDirektori(id)` ketika kartu diklik, memakai `fetch(..., { method: 'POST', keepalive: true })`.
6. Membuka halaman dashboard **tidak** boleh menaikkan `hitCount`. Halaman yang dibuka berulang kali bukan bukti aplikasi itu dipakai.
7. Gambar pratinjau kartu diambil dari `getAppPreviewImage(app)` (aplikasi) dan `getDirectoryPreviewImage(dir)` (direktori). Dua helper ini yang memutuskan gambar mana yang tampil, sehingga tampilan kartu direktori dan kartu SSO tetap sejenis.

---

## 5. Aturan Kepala Kartu & Aksi Muat Ulang

1. Setiap kartu katalog memiliki kepala berisi judul + deskripsi singkat di kiri dan tombol berbentuk pil di kanan.
2. Tombol **"Daftar Aplikasi"** dan **"Daftar Direktori"** sama-sama memanggil `loadDashboardData()`, yaitu memuat ulang **seluruh** data dashboard - bukan hanya daftarnya sendiri. Perilaku seragam ini disengaja agar pengguna tidak perlu menebak tombol mana yang memperbarui apa.
3. Kegagalan muat ulang wajib memakai jalur galat yang sama dengan pemuatan pertama (bagian 3); dilarang mengganti galat menjadi daftar kosong.

---

## 6. Aturan Identitas Civitas
1. Daftar identitas wajib menyesuaikan peran: `MAHASISWA` (NIM, prodi, fakultas, status), `DOSEN` (NIDN/NUP, homebase, fakultas, status), `SUPERADMIN` (username, unit kerja, hak akses, status).
2. Daftar identitas ditampilkan sebagai `dl` dua kolom (`grid-cols-1 sm:grid-cols-2`), tanpa kartu per item dan tanpa ikon per baris.
3. Status aktif diambil dari `user.isActive`, bukan nilai tetap.
4. Nilai yang belum tersedia ditampilkan sebagai `Belum tersedia`. Dilarang memakai nama, NIM, atau prodi contoh.
5. NIM, NIDN, dan username wajib memakai `font-mono`.

---

## 7. Aturan yang Dilarang Diubah Tanpa Keputusan Formal
1. Rute `/dashboard` tetap rute tunggal panel; `/` adalah landing page publik, bukan pengalihan ke dashboard.
2. Dilarang mengubah dashboard menjadi halaman tabel CRUD atau meminjam struktur `AdminPanelTemplate`.
3. Dilarang memindahkan logika gerbang biodata ke `Login.tsx`; gerbang hidup di dashboard saat aplikasi dibuka.
4. Dilarang menambahkan penghitung kunjungan di sisi klien lalu mengirimnya sebagai kenaikan `hitCount` - sumber kebenaran ada di server.

---

## 8. Dependensi
- `src/client/components/Carousel.tsx` - wadah geser untuk katalog.
- `src/client/components/PanelLayout.tsx` - induk rute yang memasang sidebar.
- `src/client/lib/biodata.ts` - `isBiodataComplete()`.
- `src/client/services/api.ts` - `fetchMe`, `fetchSsoApps`, `fetchDirectories`, `getSsoRedirectV2`.
- `src/server/index.ts` - `GET /api/sso/apps`, `GET /api/directories`, `POST /api/directories/:id/hit`, `GET /api/sso/app-client/:clientId/v2/redirect`.

---

## 9. Dokumentasi Terkait
- `docs/design-system/PAGE_TEMPLATES.md` - Template A (Dashboard).
- `docs/design-system/COMPONENTS.md` - `Carousel`, `NotificationModal`, `Skeleton`.
- `docs/routes/dashboard/README.md` dan `docs/routes/dashboard/CHANGELOG.md`.
- `docs/ARCHITECTURE.md` bagian 2 - alur SSO v2 dan pencatatan kunjungan.
