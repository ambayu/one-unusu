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
| Berkas Dosen (monitoring) | `/admin/berkas-dosen` | `AdminPanelTemplate` | Daftar akordeon per dosen | Disetujui: kolom tabel berbeda per baris saat dibuka (satu tabel semua jenis), sehingga akordeon lebih tepat daripada `DataTable` |

Penyimpangan di atas **bukan** pelanggaran Part 9: `DataTable` tidak dapat menyatakan kolom yang jumlahnya berubah mengikuti data (matriks izin) maupun isi berbentuk gambar besar (slider). Penyimpangan baru **wajib** dicatat di tabel ini sebelum dikerjakan.

---

## 3. Struktur Visual & Tabel Data
- Stats grid menggunakan 4 kartu operasional ber-border `#D8E5DC` dengan icon container warna fungsional di kanan tengah (`w-13 h-13 rounded-[14px]` dan icon `w-8 h-8`).
- Tabel daftar aplikasi, akun civitas, dan direktori **wajib** memakai `DataTable` (`src/client/components/DataTable.tsx`). Dilarang menulis `<table>` baru dengan `thead` `#F0FDF4` di halaman admin.
- **Aturan nomor urut**: kolom "No." tampil secara bawaan (`tampilkanNomor` default `true`) dan nomornya **melanjutkan antar halaman** (`paginasi.dari + indeks`). Halaman 2 dimulai dari 11, bukan 1.
- **Seluruh tabel wajib bernomor urut**, termasuk yang ditulis manual di luar `DataTable` (matriks Izin, daftar jenis berkas pada akordeon Berkas Dosen, ketiga tabel API Hub). Kolom "No." selalu diletakkan **paling kiri**, rata tengah, `tabular-nums`, warna `#94A3B8`, lebar `w-[56px]` (di dalam akordeon `w-[48px]` karena selnya lebih rapat). Nomor melanjutkan dari baris pertama data yang tampil — jangan mengulang dari 1 pada kelompok berikutnya.
- Tabel manual yang menggeser horizontal dengan kolom sticky (matriks Izin) menempatkan **dua** kolom sticky: "No." pada `left-0` dan kolom isi pada `left-[56px]`, agar nomor tidak tertinggal saat digeser. `colSpan` baris judul kelompok ikut ditambah satu.
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

---

## 6. Modul Berkas Dosen

### 6.1 Pembagian Peran
- **Dosen** mengelola berkasnya sendiri di `/berkas-dosen` (izin `berkas_dosen:menu`, `berkas_dosen:view`, `berkas_dosen:upload`, `berkas_dosen:delete`).
- **Pengelola** (pemegang `berkas_dosen:delete`) dapat melihat dokumen seluruh dosen. Tidak ada peran "verifikator": modul ini **memantau kelengkapan**, bukan menyetujui/menolak.
- Pembeda peran ditentukan **di server** oleh `peranBerkasPengguna()`, bukan hanya oleh izin antarmuka. Parameter `userId` pada `GET /api/berkas-dosen/list` hanya dihormati untuk peran pengelola; permintaan dosen selalu dipaksa ke id dirinya sendiri.

> **Izin `berkas_dosen:verify` sudah dihapus.** Jangan menambahkannya kembali tanpa keputusan baru: status verifikasi (`isVerified`, `verifiedAt`, `verifiedBy`, `verificationNote`) tetap ada di kolom database untuk kompatibilitas skema, tetapi **tidak lagi dibaca, ditampilkan, atau diubah** oleh antarmuka maupun endpoint mana pun.

### 6.2 Panel Monitoring Admin (`/admin/berkas-dosen`)
- Sumber data adalah **tabel pengguna berperan `DOSEN`**, bukan tabel berkas. Alasannya: dosen yang belum mengunggah apa pun harus tetap terlihat, karena justru merekalah yang perlu ditindaklanjuti.
- Endpoint: `GET /api/admin/berkas-dosen/monitoring` (izin `berkas_dosen:view`). Mengembalikan seluruh dosen aktif beserta `berkas[]`, `jenisBelumDiunggah[]`, `totalBerkasTerunggah`, `totalJenisBerkas`, dan `wajibLengkap`.
- **Kelengkapan dihitung per JENIS, bukan per baris.** Satu jenis berkas dapat diunggah lebih dari sekali (mis. perpanjangan SK); menghitung baris akan membuat angka melebihi 14.
- Kategori baris: **Belum** (`sudahMengunggah = false`), **Sebagian**, **Lengkap** (`totalBerkasTerunggah >= totalJenisBerkas`). Ketiganya dipakai sebagai saringan.
- Setiap baris dapat dibuka menampilkan **satu tabel yang memuat seluruh jenis berkas** (selalu sepanjang master `meta.tipeBerkas`, saat ini 14 baris). Jenis yang belum diunggah tetap muncul dengan status **"Belum diunggah"** — merah bila wajib, abu-abu bila opsional. Tidak ada lagi blok chip "Belum Diunggah" terpisah, sehingga admin melihat kelengkapan dan kekurangan dalam satu pandangan.
- Baris berstatus terunggah menampilkan nama dokumen, nomor dokumen, tahun SK, tanggal unggah, dan tombol pratinjau. Bila satu jenis punya beberapa berkas, baris pertama menjadi isi utama dan sisanya diringkas sebagai "+N berkas lain pada jenis ini" agar jumlah baris tetap sama dengan jumlah jenis.
- **Foto profil dosen tampil di sisi kiri setiap baris** (`avatar` dari tabel `User`). Bila belum ada, ditampilkan inisial nama pada lingkaran `#DCFCE7` teks `#166534`. Cincin di sekeliling foto mengikuti status kelengkapan: merah (belum), kuning (sebagian), hijau (lengkap).
- Tombol **Ekspor Rekap** menghasilkan CSV berpemisah `;` dengan BOM UTF-8 agar terbaca benar di Excel berbahasa Indonesia.

### 6.3 Penyimpanan Berkas
- Berkas disimpan di disk lokal (`uploads/berkas-dosen`, dapat dipindahkan lewat `BERKAS_DOSEN_DIR`).
- Nama berkas di disk berupa 24 byte acak hex + `.pdf`; nama asli dari klien **tidak pernah** dipakai sebagai nama file, sehingga `originalname` berisi `../` tidak dapat menulis keluar direktori.
- Berkas **tidak** disajikan sebagai file statis publik. Pengunduhan selalu melalui `GET /api/berkas-dosen/file/:nama` yang memeriksa sesi dan kepemilikan.
- Validasi berlapis: `mimetype` (filter multer) **dan** signature `%PDF` pada 4 byte pertama. Berkas yang gagal validasi dihapus agar tidak menumpuk.
- Batas ukuran 10 MB (`MAKS_UKURAN_BERKAS`) ditegakkan di multer; respons 413 berisi pesan batas ukuran.
- Folder `uploads/` **wajib** tetap masuk `.gitignore`; dokumen pribadi dosen tidak boleh ter-commit.

### 6.4 Penghapusan
- `DELETE /api/berkas-dosen/:id` bersifat **arsip** (`isArchived`, `archivedAt`), bukan hapus fisik. Baris tetap tersimpan untuk jejak audit, tetapi tidak lagi tampil pada daftar.
- Berkas fisik **tidak** ikut dihapus saat arsip. `hapusBerkasFisik()` hanya dipanggil bila unggahan gagal validasi agar tidak menumpuk.

### 6.5 Antarmuka
- Halaman dosen memakai `PanelPageTemplate` dengan label "Panel Dosen ONE UNUSU"; halaman admin tetap memakai `AdminPanelTemplate`.
- **Struktur halaman dosen hanya dua blok**, jangan ditambah tanpa alasan kuat: (1) kartu ringkasan progres, (2) satu daftar 14 jenis berkas. Form unggah kini **modal**, jadi tidak lagi memakan ruang halaman.
- Empat kartu statistik terpisah **dihapus**; angkanya dipadatkan ke satu kartu ringkasan berisi pecahan `terisi/total jenis`, jumlah berkas terunggah, dan bar progres.
- **Tabel "Berkas Saya" dihapus.** Daftar dikelompokkan **per JENIS** (selalu sepanjang jumlah jenis berkas), bukan per baris berkas. Detail dokumen (nomor, tahun, ukuran, tanggal, pratinjau, hapus) dibuka di dalam baris jenis yang bersangkutan. Dengan begitu daftar hanya satu, tidak ada tabel kedua di bawah halaman.
- Form unggah menyembunyikan kolom pelengkap (`nomorDokumen`, `tahunSK`, `keterangan`) di balik tombol "Tambah detail dokumen". `tahunSK` tetap aktif dengan nilai awal tahun berjalan sehingga form dapat langsung disimpan tanpa membuka panel tersebut.
- Form unggah tampil sebagai **modal** (`fixed inset-0 z-50` + `bg-black/40 backdrop-blur-sm`, panel `max-w-xl rounded-2xl`), mengikuti pola modal proyek pada Manajemen Slider. Kepala `bg-[#F9FBFA]` berisi judul + keterangan + tombol tutup, isi `px-6 py-5`, kaki `px-6 py-4` berisi Batal/Simpan.
- Modal dapat ditutup lewat tombol `×`, tombol Batal, atau **Escape**. Ketiganya diabaikan selama `unggahPersen !== null` agar progres unggahan tidak hilang di tengah jalan.
- Modal memakai `role="dialog"`, `aria-modal="true"`, dan `aria-labelledby` yang menunjuk judulnya.
- Input memakai pola form panel: `border-[#D8E5DC] px-4 py-3 rounded-lg`, fokus `focus:ring-1 focus:ring-[#166534]`.
- Semua umpan balik (sukses, gagal, konfirmasi hapus) memakai `NotificationModal`; `alert()`/`confirm()` dilarang.
