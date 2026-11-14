# Admin Panel Route - Rules

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
- Setiap halaman memakai `AdminPanelTemplate` (judul, deskripsi, tombol muat ulang, slot konten), yang dipasang di bawah `PanelLayout`.
- Data bersama diambil melalui hook `useAdminData` dengan `Promise.allSettled`, sehingga pengguna berizin terbatas tetap mendapat data yang boleh dibaca tanpa membuat seluruh halaman gagal.

### 2.1 Pemetaan Halaman, Template, dan Komponen

| Halaman | Rute | Template | Wadah data | Penyimpangan |
| --- | --- | --- | --- | --- |
| Registrasi SSO | `/admin` | `AdminPanelTemplate` | `DataTable` | - |
| Manajemen Pengguna | `/admin/pengguna` | `AdminPanelTemplate` | `DataTable` (kolom avatar + nomor urut) | - |
| Aplikasi Non-SSO | `/admin/direktori` | `AdminPanelTemplate` | `DataTable` | - |
| Izin | `/admin/izin` | `AdminPanelTemplate` | `<table>` manual | Disetujui: matriks peran dinamis, checkbox per sel, kolom pertama `sticky left-0` |
| Peran | `/admin/peran` | `AdminPanelTemplate` | Grid kartu | Disetujui: satu peran = satu kartu berisi daftar izin ringkas |
| Slider Hero | `/admin/slider` | `AdminPanelTemplate` | Grid kartu | Disetujui: pratinjau gambar lebih penting daripada baris tabel |

Penyimpangan di atas **bukan** pelanggaran Part 9: `DataTable` tidak dapat menyatakan kolom yang jumlahnya berubah mengikuti data (matriks izin) maupun isi berbentuk gambar besar (slider). Penyimpangan baru **wajib** dicatat di tabel ini sebelum dikerjakan.

---

## 3. Struktur Visual & Tabel Data
- Stats grid menggunakan 4 kartu operasional ber-border `#D8E5DC` dengan icon container warna fungsional di kanan tengah (`w-13 h-13 rounded-[14px]` dan icon `w-8 h-8`).
- Tabel daftar aplikasi, akun civitas, dan direktori **wajib** memakai `DataTable` (`src/client/components/DataTable.tsx`). Dilarang menulis `<table>` baru dengan `thead` `#F0FDF4` di halaman admin.
- **Aturan nomor urut**: kolom "No." tampil secara bawaan (`tampilkanNomor` default `true`) dan nomornya **melanjutkan antar halaman** (`paginasi.dari + indeks`). Halaman 2 dimulai dari 11, bukan 1.
- **Aturan ukuran huruf tabel**: judul kolom `text-[12.5px] font-bold`; isi sel mewarisi `text-xs` (12px). Judul kolom **wajib lebih besar** dari isi sel; dilarang menyeragamkan keduanya.
- **Kolom avatar pada Manajemen Pengguna**: sel pertama setelah "No." menampilkan pasfoto pengguna bila `avatar` terisi; bila kosong, tampilkan inisial nama lewat `inisialNama(nama)` di dalam lingkaran `#DCFCE7` bertulisan `#166534`. Inisial diambil dari maksimal dua kata pertama dan selalu huruf besar; nama kosong menghasilkan `?`. Dilarang memakai gambar placeholder eksternal atau mengosongkan sel.
- Modal pendaftaran aplikasi baru dan penambahan akun menggunakan backdrop transparan gelap dan card ber-radius 16px.
- Matriks izin pada halaman Izin memakai baris izin dan kolom peran; kolom pertama bersifat sticky agar tetap terbaca saat tabel digeser horizontal.

## 4. Aturan Notifikasi & Konfirmasi
- Seluruh notifikasi sukses, pesan error server, dan konfirmasi hapus data pada rute tata kelola wajib menggunakan komponen dialog `NotificationModal`. Dilarang menggunakan banner alert teks inline atau fungsi `alert()` bawaan browser.
- Setiap aksi destruktif (seperti menghapus aplikasi atau menghapus peran) wajib menampilkan modal konfirmasi bertipe `confirm` dengan tombol aksi merah sebelum request API dijalankan.

---

## 5. Aturan Manajemen Pengguna & Peran Dinamis (Baru)
- **Otorisasi via `roleIds` (multi-peran)**: Form penambahan dan pengeditan pengguna mengirimkan `roleIds: number[]` (daftar ID peran di database), bukan string enum peran. Server menyimpan relasi ke tabel junction `user_roles`. Kolom tunggal `roleId` sudah dihapus dari skema.
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
  - Mode **Local**: Menunjuk port frontend Vite lokal (`5175` s.d. `5181`).
  - Mode **VPS**: Menunjuk sub-path reverse-proxy (`https://unusu.ac.id/{app}/sso/callback`).
  - Dikelola melalui perintah `npm run db:sso-dev-urls` dan `npm run db:sso-vps-urls`.
