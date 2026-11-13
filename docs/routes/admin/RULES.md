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

---

## 5. Aturan Manajemen Pengguna & Peran Dinamis (Baru)
- **Otorisasi via `roleId`**: Form penambahan dan pengeditan pengguna mengirimkan `roleId` (ID peran di database), bukan string enum peran.
- **Pemuatan Peran Dinamis**: Dropdown pilihan peran di `/admin/pengguna` dimuat langsung dari `GET /api/admin/roles` (`fetchAdminRoles()`), tidak pernah di-hardcode di kode frontend.
- **Identifikasi Masukan Otomatis**: Label input identitas menyesuaikan peran yang dipilih: `Nomor Induk Mahasiswa (NIM)` untuk kode peran `MAHASISWA`, `NIDN / NUP` untuk kode `DOSEN`, dan `Username` untuk peran lainnya.
- **Badge Warna Dinamis**: Penanda badge peran pada tabel pengguna menggunakan helper `badgeForRole(code)` yang menghasilkan warna konsisten secara deterministik untuk peran kustom maupun sistem.
- **Integrasi & Sinkronisasi SIAKAD**:
  - **JIT Provisioning Otomatis**: Mahasiswa/dosen yang datanya belum ada di lokal otomatis ditarik saat pertama kali login tanpa intervensi admin.
  - **Sinkronisasi Massal**: Tombol aksi *Tarik Dosen SIAKAD* memicu penarikan seluruh direktori dosen via kredensial admin SIAKAD UNUSU ke database lokal ONE UNUSU secara berkala dan idempotent.
  - **Hirarki Akademik Cascading**: Form pembuatan/pengeditan pengguna wajib menyajikan dropdown Fakultas dan Prodi yang saling terikat (cascading) menggunakan data resmi dari endpoint hirarki akademik.
- **Proteksi Penguncian Diri**: Super Administrator dicegah dari menurunkan perannya sendiri (`SUPERADMIN`) saat mengedit profil akun sendiri untuk mencegah kehilangan akses panel secara permanen.
- **Peran Kustom oleh Superadmin**: Super Administrator dapat membuat peran kustom di `/admin/peran` dan mengatur izin fitur serta izin masuk aplikasi di `/admin/izin`, lalu menautkan peran tersebut ke pengguna di `/admin/pengguna`. Izin masuk aplikasi bersifat **global** (tiga kunci `masuk_admin`, `masuk_dosen`, `masuk_mahasiswa`, tanpa prefiks `clientId`); pembeda antar-aplikasi adalah `targetRoles` pada registry aplikasi SSO. Peran admin per-aplikasi kaku telah dihapus dari sistem.
- **Super Administrator & Admin SSO Access**: Akun ber-peran `SUPERADMIN` atau `ADMIN_SSO` secara otomatis melewati batasan izin masuk peluncuran aplikasi SSO dan memperoleh hak penuh untuk seluruh aplikasi satelit.
- **Penyelarasan Callback per Lingkungan**: Pengaturan URL redirect aplikasi satelit terbagi dua:
  - Mode **Local**: Menunjuk port frontend Vite lokal (`5174` s.d. `5180`).
  - Mode **VPS**: Menunjuk sub-path reverse-proxy (`https://unusu.ac.id/{app}/sso/callback`).
  - Dikelola melalui perintah `npm run db:sso-dev-urls` dan `npm run db:sso-vps-urls`.
