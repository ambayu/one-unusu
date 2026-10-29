# Admin Panel Route — Rules

Dokumentasi aturan teknis dan desain untuk rute `/admin` beserta sub-rute tata kelola SSO.

---

## 1. Aturan Akses & Otoritas
- Akses ditentukan oleh izin `resource:action`, bukan oleh nama peran.
- Format izin: `menu`, `view`, `edit`, `delete` pada resource `dashboard`, `profile`, `application`, `user`, `permission`, dan `role`.
- Rute dilindungi `PermissionRoute` di client berdasarkan `permissions` pada cache pengguna; endpoint API dilindungi middleware `requirePermission` di server.
- Client tanpa izin menu dialihkan ke `/dashboard`. Server mengembalikan `403` untuk request tanpa izin aksi.
- `permissions` wajib disertakan pada respons `POST /api/auth/login` dan `GET /api/auth/me` agar navigasi dapat disusun tanpa request tambahan.

---

## 2. Struktur Halaman
- Setiap halaman memakai `AdminPanelTemplate` (judul, deskripsi, tombol muat ulang, slot konten).
- Data bersama diambil melalui hook `useAdminData` dengan `Promise.allSettled`, sehingga pengguna berizin terbatas tetap mendapat data yang boleh dibaca tanpa membuat seluruh halaman gagal.

---

## 3. Struktur Visual & Tabel Data
- Stats grid menggunakan 4 kartu operasional ber-border `#D8E5DC` dengan icon container warna fungsional di kanan tengah (`w-13 h-13 rounded-[14px]` dan icon `w-8 h-8`).
- Tabel daftar aplikasi dan tabel akun civitas wajib menggunakan header `#F0FDF4` dengan teks `#166534` dan border pembatas `#D8E5DC`.
- Modal pendaftaran aplikasi baru dan penambahan akun menggunakan backdrop transparan gelap dan card ber-radius 16px.
- Matriks izin pada halaman Izin memakai baris izin dan kolom peran; kolom pertama bersifat sticky agar tetap terbaca saat tabel digeser horizontal.

## 4. Aturan Notifikasi & Konfirmasi
- Seluruh notifikasi sukses, pesan error server, dan konfirmasi hapus data pada rute tata kelola wajib menggunakan komponen dialog `NotificationModal`. Dilarang menggunakan banner alert teks inline atau fungsi `alert()` bawaan browser.
- Setiap aksi destruktif (seperti menghapus aplikasi atau menghapus peran) wajib menampilkan modal konfirmasi bertipe `confirm` dengan tombol aksi merah sebelum request API dijalankan.
