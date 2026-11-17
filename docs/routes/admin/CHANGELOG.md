# Changelog - Admin Panel

## [2026-11-18] - Tombol kembali pada penautan izin

- Keputusan pengguna: pilihan aplikasi ditautkan per peran ONE UNUSU, bukan per anggota cabang. Menggunakan `SsoApp.targetRoles` tanpa perubahan skema; izin tindakan internal aplikasi tidak digabungkan dengan hak masuk.

- Tombol **Kembali ke Peran** berada di kanan atas header judul `/admin/peran/:id/izin`, melalui slot `headerAction` pada template panel.

## [2026-11-17] - Penautan izin per peran

- **Atur Izin** membuka halaman khusus `/admin/peran/:id/izin`, bukan editor di bawah daftar peran. Izin dikelompokkan berdasarkan modul/resource dengan checkbox dan satu tombol simpan untuk peran terpilih; menggunakan `AdminPanelTemplate`.

- `/admin/peran` menyediakan tombol **Atur Izin** pada setiap peran; katalog dan penautan terbaru dimuat sebelum menyimpan hanya peran terpilih.
- `/admin/izin` menjadi katalog izin tanpa checkbox penautan maupun simpan matriks. Filter, tambah, sinkronisasi, dan pembersihan katalog tetap tersedia.
- Penautan tetap memakai `PUT /api/admin/roles/:id/permissions`, membutuhkan `permission:edit` dan pembacaan katalog `permission:view`; tidak mengubah otorisasi server maupun data secara otomatis.

## [2026-11-17] - Direktori pengguna terpadu dan parameter API

- Atas persetujuan operator, route dan record katalog `/users/by-ids` dihapus; referensi pada lima API key dipindahkan ke `/users` dalam transaksi. Credential dan log tetap dipertahankan. Kolom parameter hanya menampilkan nama parameter.

- `POST /api/v2/website/users` menerima `ids` (1–50 ID) sebagai alternatif penelusuran `search`, `role`, `fakultas`, `prodi`, dan `limit`. Mode ID tidak digabung dengan filter penelusuran; status nonaktif tetap dikirim agar aplikasi cabang dapat memvalidasinya.
- LPM/LPPM memakai endpoint terpadu. `/users/by-ids` menjadi alias kompatibilitas, bukan implementasi terpisah.
- Katalog API Hub menampilkan kolom Parameter / Filter dengan daftar biasa; keterangan lama bahwa search wajib dikoreksi pada tampilan endpoint pengguna.
- Seeder hanya mendaftarkan endpoint pengguna terpadu untuk instalasi baru. Database lama, API key, dan riwayat penggunaan tidak dihapus atau diubah otomatis; entri alias lama tetap ditampilkan dengan petunjuk migrasi sampai katalog diselaraskan atas persetujuan operator.

## [2026-11-16] - API Hub: Data Organisasi & Perbaikan Izin Superadmin LPM

### Added
- **Endpoint `GET /api/v2/website/organisasi`** di ONE UNUSU. Mengembalikan hierarki **fakultas beserta program studi di dalamnya** (bersarang), dijaga API key, hasil di-cache 5 menit. Aplikasi cabang cukup memanggil ONE UNUSU; mereka tidak perlu tahu bahwa sumber aslinya Portal Prodi.
- **Endpoint `POST /api/v1/public/organisasi`** di Portal Prodi UNUSU sebagai sumber data. Dijaga `PRODI_API_KEY`, menolak dengan 503 bila kunci belum diisi (fail-closed).
- **`prisma/api-hub.ts`** — seeder katalog API Hub. Sebelumnya `seed.ts` hanya mengisi `sso_apps`, sehingga setiap kali database di-seed ulang seluruh katalog endpoint dan API key hilang dan harus dibuat manual. Seeder ini idempoten: endpoint dikenali lewat `endpoint` (unik), API key lewat `name`, dan **nilai kunci yang sudah beredar tidak pernah ditimpa** — hanya cakupan `allowedEndpoints` yang diselaraskan. Kunci baru dicetak sekali ke konsol.

### Changed
- **`potongKeyApi()` diperbaiki.** Sebelumnya bagian tengah kunci disamarkan dengan karakter `\uFFFD` (replacement character), yang tidak dapat dirender sehingga key tampil rusak seperti `unusu_sec_99����68ef`. Kini memakai titik-titik biasa (`·`).
- **`allowedEndpoints` seluruh API key diperluas** dari `[6]` menjadi `[6,7]` agar data organisasi dapat diambil dengan kunci yang sama.

### Fixed
- **Superadmin tidak mendapat izin saat masuk LPM (harus refresh dulu).** Dua cacat sekaligus:
  1. `ambilIzinPengguna()` di LPM menerima `_ssoRole` tetapi mengabaikannya, sehingga Superadmin tanpa peran lokal mendapat `izin` kosong dan setiap endpoint membalas 403. Kini Superadmin memperoleh seluruh izin fitur lewat `seluruhIzin()`.
  2. Respons `POST /api/auth/sso` tidak pernah menyertakan `izin`, padahal klien memakainya untuk menentukan menu. Akibatnya sesi baru tampil kosong sampai halaman di-refresh (yang memicu `/api/auth/me`). Kini `izin` ikut dikirim.

### Notes
- Data fakultas/prodi **hanya** ada di Portal Prodi (6 fakultas, 14 prodi). Tabel `fakultas`/`prodi` bawaan ONE UNUSU masih kosong dan sengaja tidak dipakai.

## [2026-11-20] - Model Akses Per-Aplikasi: Izin Masuk Global Dihapus

### Changed
- **Izin masuk global dihapus seluruhnya.** `masuk_admin`, `masuk_fakultas`, `masuk_dosen`, `masuk_mahasiswa` (id 37-40) beserta 10 baris `role_permissions` yang memakainya dihapus dari `one_unusu_db`. Katalog izin ONE UNUSU kini berisi 37 izin.
- **`decideAppAccess` di ONE UNUSU ditulis ulang.** Parameternya tetap `(permissionKeys, targetRolesRaw, userRoleCodes)`, tetapi `permissionKeys` tidak lagi dibaca. Keputusan diturunkan dari **peran kampus**:
  - `SUPERADMIN`/`ADMIN_SSO` → selalu lolos.
  - Peran berawalan `ADMIN_` → tingkat `admin`.
  - `DOSEN` → `dosen`, `MAHASISWA` → `mahasiswa`.
  - Tingkat itu harus diterima `sso_apps.targetRoles`.
- **`tingkatMasukDimiliki`** kini menerima `userRoleCodes`, bukan daftar izin.
- **Putusan ONE UNUSU bersifat pendahuluan.** Aplikasi cabang memvalidasi ulang keanggotaannya sendiri saat menukar tiket; keputusan akhir milik aplikasi tujuan.
- **`POST /api/admin/apps`** tidak lagi memanggil `siapkanIzinMasukAplikasi` — fungsi itu kini kosong dan hanya dipertahankan sebagai titik kompatibilitas.
- **`/api/applications/catalog`** membaca `targetRoles` langsung. Sebelumnya nilai `tingkatMasuk` diturunkan dari regex `<clientId>:masuk_*` yang sudah tidak pernah cocok, sehingga katalog selalu kosong.
- **Dashboard & `/aplikasi-sso`**: filter "mahasiswa murni" ditentukan dari **peran** `MAHASISWA`, bukan dari izin `masuk_mahasiswa`.

### Removed
- `src/server/lib/syncAppPermissions.ts` — kode mati tanpa satu pun impor.
- `kunciIzinMasuk`, `tingkatMasukBawaan`, `syncIzinMasukDefault` dari `accessControl.ts`; grup izin `akses` dari `PERMISSION_CATALOG`; label `masuk_*` dari `ACTION_LABEL`.
- Percabangan `resource === "akses"` di `syncPermissions`, `cleanObsoletePermissions`, dan `POST /api/admin/permissions/cleanup`.

### Added
- **`POST /api/v2/website/users`** — direktori pengguna untuk aplikasi cabang, dijaga **API key** (`Authorization: Bearer unusu_sec_...`). Terdaftar sebagai `api_endpoints` id 6 sehingga pemakaiannya tercatat di `api_usage_logs`.
  - `search` minimal 2 karakter (`422`), `limit` dibatasi 20, rate-limited (`429` bila berlebih).
  - Hanya mengembalikan `id`, `username`, `nama`, `email`, `noHp`, `nim`, `nidn`, `nip`, `fakultas`, `prodi`, `jenisKelamin`, `avatar`, `isActive`.
  - API key LPM dan LPPM diterbitkan lewat API Hub lalu ditulis ke `.env` masing-masing sebagai `ONE_UNUSU_API_KEY`.

### Verified
- 10 uji manual `POST /api/v2/website/users` lolos: validasi API key, `search` pendek, `limit` berlebih, dan bentuk respons.
- Typecheck `tsconfig.server.json` dan `tsconfig.json` ONE UNUSU bersih.

## [2026-11-20] - Dosen Dapat Mengubah Jenis Kelamin di Biodata Sendiri

### Changed
- **`PUT /api/auth/profile`** kini menerima `jenisKelamin`. Nilai dibatasi `L`/`P`; nilai lain ditolak `400`, string kosong mengosongkan kolom (`null`).
- **`/profile`**: input "Jenis Kelamin" yang semula `readOnly` diganti dropdown tiga pilihan (Belum diisi / Laki-laki / Perempuan) dengan gaya `border-[#D8E5DC] px-4 py-3` + focus ring `#166534`. Nilai tersimpan ditampilkan sebagai teks kecil di bawah dropdown.
- State `jenisKelamin` dimuat dari `GET /api/auth/me`, dikirim pada `updateProfile`, dan disinkronkan ulang setelah simpan berhasil.

### Verified
- Uji langsung sebagai akun non-admin: simpan `P` → `L` → kosong semuanya `200` dan terbaca ulang benar; `X` dan `laki-laki` ditolak `400`; penyimpanan bersama `tempatLahir`/`alamat` tidak saling menimpa. Data akun uji dipulihkan persis seperti semula.


## [2026-11-20] - Seluruh Kolom Pengguna Dapat Disunting

### Changed
- **Modal edit `/admin/pengguna` tidak lagi readonly.** Seluruh 25 kolom profil kini dapat diubah admin, terbagi dalam lima bagian: Identitas, Data Pribadi, Data Akademik, Ketenagaan, dan Tautan Akademik. Modal melebar ke `max-w-3xl` dan isinya digulir.
- **`PUT /api/admin/users/:id`** menerima kolom baru: `username`, `jenisKelamin`, `tempatLahir`, `tanggalLahir`, `nik`, `angkatan`, `statusAkademik`, `alamat`, `asalSekolah`, `namaIbuKandung`, `gelarDepan`, `gelarBelakang`, `nip`, `jabatanAkademik`, `bidangKeahlian`, `pendidikanTerakhir`, `sintaId`, `linkSinta`, `googleScholar`, `orcid`, `scopusId`, `biografi`, dan `nim` (sebelumnya tidak tampil di formulir). Respons `PUT` mengembalikan seluruh kolom tersebut.
- **Validasi username**: kosong, mengandung spasi (>60 karakter), atau bentrok dengan akun lain ditolak (`400`/`409`). Mengganti username **akun sendiri** ditolak `400` agar admin tidak terkunci.
- **Validasi ringan kolom profil** lewat daftar `kolomTeksMaksimal`; string kosong disimpan sebagai `null`. `jenisKelamin` hanya `L`/`P`.

### Fixed
- **`tanggalLahir` gagal simpan (`500`)**: kolom di Prisma bertipe `String? @db.VarChar(30)`, bukan `DateTime`. Server sempat mengirim objek `Date`; kini hanya menerima `YYYY-MM-DD` dan menyimpannya sebagai teks.

### Verified
- Uji langsung: seluruh 25 kolom tersimpan dan terbaca kembali; validasi username kosong/berspasi/bentrok, jenis kelamin tidak sah, dan tanggal rusak semuanya ditolak sesuai kode yang diharapkan. Data akun uji dipulihkan persis seperti semula. Tangkapan layar modal: 37 isian, 0 nonaktif.

## [2026-11-20] - API Hub Berbasis Data Sungguhan (CRUD Endpoint, Key, dan Riwayat)

### Added
- **CRUD katalog endpoint** di `/admin/api-hub`:
  - `GET /api/admin/api-hub/endpoints` — daftar dengan pencarian `search` dan saringan `sourceApp`.
  - `POST /api/admin/api-hub/endpoints` — tambah endpoint.
  - `PUT /api/admin/api-hub/endpoints/:id` — ubah endpoint.
  - `DELETE /api/admin/api-hub/endpoints/:id` — hapus endpoint.
- **Manajemen API key**:
  - `GET /api/admin/api-hub/keys` — daftar key dalam bentuk terpotong.
  - `POST /api/admin/api-hub/keys` — membuat key; satu-satunya respons berisi nilai utuh.
  - `PUT /api/admin/api-hub/keys/:id` — ubah nama, keterangan, dan izin endpoint.
  - `DELETE /api/admin/api-hub/keys/:id` — mencabut key.
- **Riwayat pemakaian** `GET /api/admin/api-hub/logs` — 200 catatan terbaru, menyertakan nama key dan aplikasi pemiliknya.
- **`GET /api/admin/api-hub/apps`** — daftar aplikasi untuk dropdown pemilik key.
- **Panel nilai key sekali-tampil**: kotak kuning berisi nilai utuh setelah key dibuat, dengan tombol salin dan peringatan bahwa nilai tidak akan tampil lagi.
- **Fungsi klien** di `services/api.ts`: `fetchApiEndpoints`, `createApiEndpoint`, `updateApiEndpoint`, `deleteApiEndpoint`, `fetchApiHubApps`, `fetchApiKeys`, `createApiKey`, `updateApiKey`, `revokeApiKey`, `fetchApiUsageLogs`, beserta tipe `ApiEndpointItem`, `ApiKeyItem`, `ApiKeyBaru`, `ApiUsageLogItem`, `ApiHubAppItem`, `ApiEndpointKiriman`.

### Removed
- **Seluruh data contoh di `ApiHub.tsx`** dihapus: `mockEndpoints` (5 entri), `mockKeys` (2 entri), `mockLogs` (3 entri), beserta `supportedFilters` yang hanya ada di data palsu.
- **Semua tombol yang tidak melakukan apa pun** — tombol pensil dan tempat sampah pada kedua tabel kini terhubung ke modal dan konfirmasi sungguhan.

### Changed
- **Ketiga tabel API Hub memakai `DataTable`**, bukan `<table>` manual. Efeknya: nomor urut otomatis melanjutkan antar halaman, paginasi, dan kerangka kolom seragam dengan tabel admin lain.
- **Tombol "Cabut" menggantikan ikon hapus pada API key**, karena barisnya tidak dihapus melainkan ditandai `revoked`.
- **`confirm()` bawaan peramban dihapus**; konfirmasi memakai `NotificationModal` bertipe `confirm`.
- Pemuatan data dibuat per tab (lazy), dilengkapi tombol muat ulang dan blok galat dengan tombol "Coba Lagi".

### Catatan Teknis
- **Nilai API key tidak pernah dikirim utuh lagi setelah pembuatan.** `GET /keys` memakai `potongKeyApi()` yang menghasilkan `unusu_sec_12••••••ab34`. Karena itu tombol salin pada baris lama menyalin potongan, dan itu memang disengaja — bukan bug.
- **Pencabutan key tidak menghapus baris.** `DELETE /keys/:id` mengisi `revoked`, `revokedAt`, `revokedReason`, dan `isActive = false`. Alasannya: `ApiUsageLog` berelasi `onDelete: Cascade` ke `ApiKey`, sehingga menghapus baris key akan melenyapkan seluruh riwayat pemakaiannya. Hal yang sama berlaku bila `SsoApp` dihapus — key miliknya ikut terhapus.
- **Key yang sudah dicabut tidak dapat diaktifkan kembali**; `PUT` mengembalikan 409. Penggantian dilakukan dengan membuat key baru.
- **Validasi masukan**: metode dibatasi `GET|POST|PUT|PATCH|DELETE`, alamat endpoint wajib berawalan `/` dan unik (409 bila bentrok), contoh request/response harus JSON sah, dan `allowedEndpoints` diverifikasi ke tabel `api_endpoints` sebelum disimpan.
- Tidak ada perubahan skema. Ketiga model (`ApiEndpoint`, `ApiKey`, `ApiUsageLog`) sudah ada di `schema.prisma` tetapi belum pernah dipakai.
- Diuji langsung terhadap server: pembuatan endpoint (201), metode tidak sah (400), endpoint ganda (409), JSON rusak (400), pembaruan (200), pembuatan key (201, nilai utuh 50 karakter), daftar key mengembalikan bentuk terpotong (bukan nilai utuh), pencabutan (200), pencabutan ulang (409), pengaktifan key tercabut (409), dan penghapusan endpoint (200). Data uji sudah dibersihkan; ketiga tabel kembali kosong.

## [2026-11-19] - Filter Fakultas & Prodi serta Kolom Fakultas pada Manajemen Pengguna

### Added
- **Dua dropdown filter baru di `/admin/pengguna`**: **Fakultas** dan **Program Studi**, sebaris dengan kolom pencarian dan dropdown peran. Masing-masing opsi menampilkan jumlah akun dalam kurung, contoh `Fakultas Ilmu Komputer (15)`.
- **Kolom "Fakultas" pada tabel pengguna**, diletakkan sebelum kolom "Program Studi".
- **Chip filter aktif** untuk fakultas dan prodi di bar ringkasan di atas tabel, masing-masing bisa dilepas sendiri tanpa mereset filter lain.

### Changed
- **Opsi filter diturunkan dari data pengguna yang termuat, bukan dari tabel master.** Tabel `fakultas` dan `prodi` di database masih kosong, sehingga membaca pilihan dari sana akan menghasilkan dropdown kosong. Dengan menurunkannya dari `users`, yang muncul hanya nilai yang benar-benar ada pada akun.
- **Daftar prodi menyempit mengikuti fakultas terpilih.** Memilih `Fakultas Agama Islam` mempersempit pilihan prodi menjadi `Hukum Keluarga Islam (Akhwal Syakhshiyyah)` dan `S1 Studi Islam (Dirasah Islamiyah)` saja. Mengganti fakultas otomatis mengosongkan filter prodi agar tidak menghasilkan tabel kosong tanpa penjelasan.
- **`lebarMinimal` tabel dinaikkan dari `720px` ke `1040px`** karena bertambah satu kolom.
- **Bar ringkasan di atas tabel kini juga muncul saat filter fakultas atau prodi aktif.** Sebelumnya kondisinya hanya memeriksa peran, status, dan kata kunci, sehingga memilih fakultas tidak memunculkan bar tersebut.
- **Pesan "tidak ada akun yang sesuai"** ikut menyebut fakultas dan prodi yang sedang disaring.

### Catatan Teknis
- Nilai kosong atau `"-"` pada `fakultas`/`prodi` dinormalkan ke satu kunci `__KOSONG__` dan tampil sebagai pilihan "Belum diisi", selalu diurutkan paling bawah agar tidak menutupi fakultas nyata.
- Filter fakultas, prodi, peran, dan status semuanya tercermin di URL (`?fakultas=`, `?prodi=`) memakai `setSearchParams(..., { replace: true })`, sehingga tautan hasil saringan bisa dibagikan dan bertahan saat halaman dimuat ulang.
- Pencarian teks kini juga mencocokkan kolom `fakultas`, bukan hanya `prodi`.
- Tidak ada perubahan skema maupun endpoint server: `GET /api/admin/users` sudah mengirim `fakultas` sejak sebelumnya.

## [2026-11-18] - Slider Hero Berbasis Berkas dengan Dukungan Video

### Added
- **Unggah video pada halaman Slider Hero (`/admin/slider`).** `ManajemenSlider.tsx` dan beranda publik `HeroSection.tsx` kini menerima berkas video (MP4, WebM, OGG, MOV, M4V) hingga **50 MB**, di samping gambar (JPG, PNG, WebP) yang dibatasi **5 MB**.
- **`src/server/lib/sliderMedia.ts`**: modul penyimpanan media slider — multer disk storage dengan nama berkas acak 48 karakter hex, daftar putih ekstensi, `periksaUkuranMediaSlider`, `urlMediaSlider`, `hapusMediaSliderFisik`, dan `namaBerkasMediaDariUrl`.
- **`src/client/lib/mediaSlider.ts`**: `JENIS_MEDIA`, `jenisMedia`, `validasiBerkasMedia`, `labelJenisMedia`, serta batas ukuran sisi klien.
- **Slide video menunggu selesai sebelum berpindah.** `HeroSection` tidak memakai timer untuk slide video: perpindahan terjadi saat peristiwa `ended` elemen `<video>`. Slide gambar tetap berotasi tiap 6 detik.

### Changed
- **Media slider tidak lagi disimpan sebagai base64.** Kolom `gambarUrl` kini hanya memuat path (`/storage/slider/<berkas>`); berkasnya disajikan `express.static` dengan `maxAge: "7d"`. Sebelumnya berkas dibaca `FileReader.readAsDataURL()` lalu dikirim sebagai string base64 di dalam body JSON.
- **Endpoint `POST`/`PUT` `/api/admin/sliders` menerima `multipart/form-data`** (field `gambar`), bukan lagi JSON berisi `gambarUrl`. `gambarMobileUrl` kini selalu `null` dari server. Berkas lama dihapus dari disk setelah pembaruan berhasil; `DELETE` menghapus berkas setelah baris hilang.
- **`src/client/services/api.ts`**: `SliderKiriman`, `buatFormSlider`, dan `kirimFormSlider` — `Content-Type` dikosongkan agar peramban menambahkan `boundary`.
- **Tombol `Tambah Foto Slider` menjadi `Tambah Data`**, dan kartu daftar menampilkan label jenis media.

### Notes
- Batas 5 MB / 50 MB dipasang di server, bukan hanya di klien; skema database tidak berubah.
- `UPLOAD_ROUTE_PATTERN` masih memuat `admin/sliders` untuk `largeJson`; tidak terpakai tetapi tidak berbahaya.

## [2026-11-15] - Nomor Urut pada Seluruh Tabel

### Added
- **Kolom "No." pada semua tabel yang belum memilikinya.** Sebelumnya nomor urut hanya muncul pada tabel berbasis `DataTable` dan pada Riwayat SSO. Tabel manual kini ikut bernomor:
  - `Berkas Dosen` — daftar jenis berkas di dalam akordeon dosen (14 baris), kolom `No.` di paling kiri.
  - `Izin` — matriks izin, kolom `No.` di kiri kolom "Izin".
  - `Integrasi & API Hub` — ketiga tabelnya: Endpoint, API Key, dan Riwayat Penggunaan.

### Catatan Teknis
- **Matriks Izin memakai peta nomor terpisah (`nomorIzin`).** Tabelnya dikelompokkan per resource, sehingga menghitung dari indeks di dalam `group.items` akan mengulang 1, 2, 3 pada setiap kelompok. `nomorIzin` dibuat dengan `useMemo` yang menomori seluruh grup berurutan, memberi satu deret utuh dari atas ke bawah.
- Matriks Izin menggeser horizontal, jadi kini ada **dua kolom sticky**: `No.` pada `left-0` (`w-[56px]`) dan kolom `Izin` dipindah ke `left-[56px]`. Tanpa pergeseran ini nomor akan tertinggal saat tabel digeser. `colSpan` baris judul kelompok diubah dari `roles.length + 1` menjadi `roles.length + 2`, termasuk baris "tidak ada izin".
- Tabel pada akordeon Berkas Dosen memakai lebar `w-[48px]` dan padding lebih rapat (`px-3 py-2`) agar tidak memakan ruang di dalam panel yang sudah menjorok.
- Gaya kolom nomor diseragamkan dengan `DataTable`: rata tengah, `text-[11.5px]` (11px di akordeon), `font-semibold`, warna `#94A3B8`, `tabular-nums` agar angka tidak bergeser.
- **Riwayat Masuk SSO tidak diubah** — sudah bernomor dan tabelnya tidak berpaginasi, sehingga `indeks + 1` sudah benar.
- Halaman **Peran tidak diubah** karena berbentuk grid kartu, bukan tabel.

## [2026-11-15] - Dashboard Tanpa Chip Kekurangan & Tanpa Blok Identitas

### Removed
- **Blok "Data Ketenagaan Dosen" dihapus dari dashboard.** Blok identitas civitas (berjudul "Data Ketenagaan Dosen" untuk dosen, "Otoritas & Unit Kerja" untuk superadmin, "Data Akademik Mahasiswa" untuk mahasiswa) yang menampilkan NIDN/NUP, Homebase Prodi, Fakultas Induk, dan Status Kepegawaian kini tidak lagi dirender. Datanya sudah tersedia di halaman **Biodata**, dan pengulangannya di dashboard membuat halaman terlalu padat. Turut dihapus: `identitySectionTitle`, `identityMetrics`, tipe `IdentityMetric`, `statusLabel`, serta impor `IdentificationIcon`.
- **Daftar "Belum terisi" beserta chip butir yang kurang dihapus dari `KartuProgres`.** Prop `kurang` dan `sisaKurang` dihapus sepenuhnya. Kartu kini hanya berisi judul, keterangan, persentase, bar progres, `terisi/total`, kalimat ajakan, dan tombol aksi. Impor `ExclamationCircleIcon` ikut dihapus.

### Fixed
- **Kartu "Kelengkapan Biodata" menuduh admin belum lengkap.** `daftarButir()` sebelumnya memasukkan foto profil, jenis kelamin, tanggal lahir, dan alamat ke **semua** peran, termasuk admin. Akibatnya admin dengan 3 dari 7 butir terisi mendapat ajakan "lengkapi profil akademik Anda" — padahal keempat butir itu adalah data civitas yang tidak dimiliki admin. Butir dasar kini hanya `nama`, `email`, `noHp`; butir civitas (foto, jenis kelamin, tanggal lahir, alamat) hanya dihitung untuk `DOSEN` dan `MAHASISWA`.
- Kalimat ajakan dan keterangan kartu menyesuaikan peran lewat `isCivitas`: "profil akademik" untuk dosen/mahasiswa, "profil akun" untuk admin dan pengelola. Bila biodata lengkap, ajakan diganti "Tidak ada data wajib yang kosong."

## [2026-11-15] - Panel Monitoring Berkas Dosen: Satu Tabel untuk Semua Jenis

### Changed
- **Blok chip "Belum Diunggah (N)" dihapus.** Sebelumnya setiap baris dosen yang dibuka menampilkan dua blok terpisah: tabel "Berkas Terunggah" dan kumpulan chip jenis yang belum diunggah. Keduanya digabung menjadi **satu tabel** yang memuat seluruh jenis berkas (mengikuti master `meta.tipeBerkas`, saat ini 14 baris).
- Jenis yang belum diunggah kini tampil sebagai **baris** dengan status `Belum diunggah` — merah (`#FEE2E2`) bila wajib, abu-abu (`#F1F5F2`) bila opsional. Jenis wajib juga ditandai `wajib` di bawah namanya. Jenis yang sudah ada diberi status `Terunggah` hijau (`#DCFCE7`).
- Kolom tabel berubah dari `Jenis / Nama Dokumen / Tahun / Ukuran / Diunggah / Aksi` menjadi `Jenis / Status / Dokumen / Tahun / Diunggah / Aksi`. Kolom **Ukuran dihapus** agar tabel muat tanpa gulir mendatar pada layar laptop; nama dokumen dan nomor dokumen kini berbagi satu sel.
- Judul blok menjadi "Daftar Jenis Berkas" dengan ringkasan di kanan: `N jenis terunggah dari 14 jenis` (dan `· M berkas` bila ada jenis yang diunggah lebih dari sekali).

### Catatan Teknis
- Fungsi `barisJenisDosen()` menggabungkan master jenis dari `meta.tipeBerkas` dengan `dosen.berkas` (dicocokkan lewat `tipeKode`). Master dipakai sebagai sumber kebenaran daftar jenis, bukan `dosen.berkas` — dosen yang belum mengunggah apa pun tetap melihat ke-14 jenis.
- Bila `meta` belum termuat tetapi baris berkas sudah ada, jenis yang hanya diketahui dari data berkas tetap ditampilkan agar tidak hilang.
- Baris dihitung hanya saat akordeon terbuka (`isOpen ? barisJenisDosen(dosen) : []`) supaya tidak menyaring ulang seluruh berkas setiap dosen pada setiap render.
- Tabel dibungkus `overflow-x-auto` dengan `min-w-[640px]` agar tetap terbaca pada layar sempit.
- Ikon `CheckIcon` ditambahkan pada impor `@heroicons/react/24/outline`.

## [2026-11-15] - Kartu Progres Kelengkapan pada Dashboard ONE UNUSU

### Added
- **Kartu "Kelengkapan Biodata"** di `/dashboard`, tampil untuk semua peran. Menampilkan persentase, bar progres, `terisi/total`, chip butir yang masih kosong (maksimal 3 + "+N lainnya"), dan tombol "Lengkapi Biodata".
- **Kartu "Kelengkapan Dokumen"** khusus peran `DOSEN`, ditampilkan bersebelahan pada layar `lg`. Menghitung jenis berkas yang sudah diunggah dari 14 jenis yang tersedia, menyebut berkas wajib yang belum diunggah, dan menautkan ke `/berkas-dosen`.
- Ajakan bersifat **kontekstual**, bukan kalimat tetap: bila email atau WhatsApp kosong, kartu menyebut keduanya sebagai penghalang pembukaan aplikasi SSO; bila yang kosong hanya butir opsional, ajakannya berubah menjadi saran pelengkapan. Kartu berubah hijau dan berganti tombol menjadi "Lihat Biodata"/"Lihat Dokumen" ketika sudah lengkap.

### Changed
- **Pengingat biodata lama digantikan kartu progres.** Blok kuning yang hanya muncul saat biodata belum lengkap kini tidak lagi dipakai: progres selalu terlihat agar pengguna tahu posisinya, tidak hanya ketika ada yang salah.
- `navigate('/profil')` dari kartu membawa `state.requiredBio` hanya bila butir WAJIB (email/WhatsApp) memang kosong, sehingga penanda "wajib" di halaman profil tidak menyala hanya karena alamat atau foto belum diisi.

### Catatan Teknis
- `src/client/lib/biodata.ts` diperluas dengan `ringkasBiodata()`. Fungsi lama `isBiodataComplete()` **tetap dipertahankan** karena dipakai sebagai gerbang tiket SSO di 5 berkas (Sidebar, AplikasiSsoPage, DaftarAplikasi, Dashboard, Profile). Keduanya sengaja dibedakan: `ringkasBiodata().lengkap` menghitung semua butir sehingga tidak boleh dipakai sebagai gerbang — pengguna akan terblokir hanya karena alamat kosong.
- `src/client/lib/kelengkapanDokumen.ts` menambahkan `ringkasDokumenDosen()`. Kelengkapan dihitung per JENIS, bukan per baris, konsisten dengan panel monitoring admin.
- `src/client/components/KartuProgres.tsx` menjadi komponen bersama kedua kartu agar tampilannya seragam.
- Data dokumen diambil **setelah** peran diketahui (`fetchMe` selesai), dan kegagalannya didiamkan — kartu cukup tidak tampil, dashboard tetap utuh. Ini mencegah satu endpoint bermasalah merusak seluruh halaman.

## [2026-11-15] - Form Unggah Berkas Dosen Menjadi Modal & Menu Tata Kelola Disaring

### Fixed
- **Menu "Berkas Dosen" masih muncul pada sidebar dosen.** Entri `/admin/berkas-dosen` di grup TATA KELOLA dijaga izin `berkas_dosen:menu` — izin yang memang dipegang peran `DOSEN` untuk halaman `/berkas-dosen` miliknya. Akibatnya dosen melihat menu panel pemantauan yang bukan haknya. Seluruh grup TATA KELOLA kini disaring ganda: `hasPermission(user, item.permission) && canOpenAdminPanel(user)`, sejalan dengan penjagaan rute `AdminPanelRoute`.

### Changed
- **Form unggah berkas dipindah dari kartu seksi di dalam halaman menjadi modal**, mengikuti pola modal proyek (Manajemen Slider): latar `bg-black/40 backdrop-blur-sm`, panel `max-w-xl rounded-2xl`, kepala `bg-[#F9FBFA]` berisi judul + keterangan + tombol tutup, isi `px-6 py-5`, kaki `px-6 py-4` berisi Batal dan Simpan.
- Tombol "Unggah Berkas" pada kartu ringkasan tidak lagi berganti menjadi "Tutup Form"; ia selalu membuka modal. Menutup dilakukan dari dalam modal.
- Modal dapat ditutup lewat tombol `×`, tombol Batal, atau **Escape**. Ketiganya dinonaktifkan selama `unggahPersen !== null` agar progres unggahan tidak hilang di tengah jalan.
- Modal diberi `role="dialog"`, `aria-modal="true"`, dan `aria-labelledby` yang menunjuk judulnya; latar memakai `overflow-y-auto` agar tetap dapat digulir pada layar pendek.
- Keterangan "PDF, maksimal 10 MB" dipindah ke subjudul modal, dan `PDF` dihapus dari label field karena sudah jelas dari konteks.
- Struktur halaman dosen turun dari tiga blok menjadi **dua**: kartu ringkasan progres dan satu daftar 14 jenis berkas.

## [2026-11-15] - Halaman 403 Diberi Panggung Visual Animasi

### Added
- **Panggung "403"**: angka besar `64px → 76px` berwarna `#166534` dengan `text-shadow` lembut, diapit dua cincin `#BBF7D0` yang memancar bergantian (`animate-denyutCincin`) dan latar gradien `#F0FDF4 → #F9FDFB → #FEF2F2`.
- **Tiga keyframe baru di `tailwind.config.js`**: `gerakLembut` (blob mengapung), `denyutLembut` (titik berkedip), `denyutCincin` (cincin memancar). Ketiganya didaftarkan sekaligus pada `theme.extend.animation` sebagai `animate-gerakLembut`, `animate-denyutLembut`, dan `animate-denyutCincin`.
- Blob dekoratif dan titik kecil di latar panggung memberi kesan hidup tanpa mengganggu teks.

### A11y & Performa
- Seluruh elemen dekoratif diberi `aria-hidden="true"` sehingga pembaca layar tidak membacanya.
- Semua animasi memakai prefiks `motion-safe:` — otomatis diam total pada pengguna dengan `prefers-reduced-motion`.
- Keyframe hanya menggerakkan `transform` dan `opacity` (bukan `width`/`height`/`top`/`left`) agar tidak memicu reflow; blob memakai `translate3d` untuk lapisan compositor.
- Varian durasi/delay memakai utilitas arbitrer (`[animation-duration:12s]`, `[animation-delay:1.75s]`) sehingga tidak perlu menambah entri config untuk setiap variasi.

### Changed
- Blok `dl` ringkasan ditata ulang: baris "Tujuan" ditempatkan paling atas dengan tipografi mono, latar kartu diubah ke `bg-white` agar gradien panggung di atasnya tetap menonjol.

## [2026-11-15] - Halaman 403 Diringkas Jadi Minim Info

### Changed
- **Konten dikurangi menjadi satu layar ringkas.** Halaman 403 sebelumnya memuat empat blok penjelasan: paragraf panjang tentang pemisahan peran, dua kartu fakta, kotak peringatan kuning tentang admin aplikasi cabang, dan daftar semua aplikasi yang boleh diakses. Bagi dosen yang sekadar salah membuka `/admin`, semua itu hanya menambah kebisingan.
- **Yang disisakan:** satu baris status `403` + tujuan yang ditolak, satu blok dua baris berisi peran dan izin yang dibutuhkan (hanya muncul bila server menyertakan `?need=`), lalu baris tombol.
- **Dihapus:** kotak peringatan `#FFFBEB` tentang admin aplikasi cabang, daftar chip "Aplikasi yang boleh Anda akses", baris "Mengelola: ..." / "Bukan pengelola panel administrasi", dan label "di luar kewenangan peran" yang menduplikasi pesan judul.
- **Judul dan deskripsi dipersingkat**: "Halaman ini bukan untuk akun Anda" / "Akun Anda tidak memiliki izin membuka halaman tersebut."
- Peran dan tujuan ditata sebagai `dl` bergaris pemisah, menggantikan dua kartu terpisah — jumlah kotak di halaman turun dari lima menjadi tiga.
- Tombol "Keluar" diubah menjadi gaya teks tanpa bingkar agar tidak bersaing dengan tombol utama, tetap di kanan pada layar lebar.
- `MANAGED_APP_BY_ROLE` dan `CheckCircleIcon` tidak lagi diimpor pada halaman ini.

## [2026-11-15] - Menu "Berkas Saya" Dikembalikan ke Sidebar Dosen

### Fixed
- **Menu `/berkas-dosen` tidak pernah tampil untuk akun dosen.** Izin `berkas_dosen:menu` memang sudah ada pada peran `DOSEN`, tetapi satu-satunya menu yang mendaftar rute itu adalah `/admin/berkas-dosen` pada grup **TATA KELOLA** — rute panel pemantauan yang hanya dapat dibuka pengelola. Akibatnya dosen tidak punya jalan masuk ke halaman unggah miliknya sendiri.
- **Menu "Berkas Saya" ditambahkan ke MENU UTAMA** di `SidebarLayout.tsx`, mengarah ke `/berkas-dosen` dengan ikon `DocumentTextIcon`. Diletakkan sebelum "Biodata" karena merupakan pekerjaan harian dosen, bukan tata kelola.
- Kedua menu memakai izin berbeda sehingga tidak pernah muncul bersamaan pada satu akun: `berkas_dosen:menu` untuk halaman dosen, dan `/admin/berkas-dosen` hanya untuk pengelola yang juga memiliki izin panel admin.
- Rute `/berkas-dosen` sudah terdaftar di `allNavPaths` sehingga penanda menu aktif dan breadcrumb "Berkas Dosen Saya" bekerja tanpa perubahan tambahan.

## [2026-11-15] - Halaman 403 Dipindah ke Dalam Layout Panel

### Changed
- **Akar masalah padding tidak seragam:** rute `/akses-ditolak` sebelumnya berdiri **di luar `PanelLayout`**. Halaman dirender sebagai layar penuh sendiri (`min-h-screen bg-[#F1F5F2] flex items-center justify-center`) sehingga tidak memakai padding `<main>` panel (`p-4 sm:p-6 lg:p-7`), tidak menyisakan ruang sidebar, dan kartunya mengapung di tengah dengan latar abu-abu — berbeda dari halaman panel lain yang kartunya menempel pada satu kolom konten.
- **Rute dipindahkan ke dalam `<Route element={<PanelLayout />}>`** di `App.tsx`. Kini halaman 403 otomatis mewarisi sidebar, header, footer, dan padding utama yang sama persis dengan halaman panel lain.
- **Halaman ditulis ulang memakai `PanelPageTemplate`**, sama seperti `/admin/berkas-dosen`. Bingkai kartu putih `rounded-[16px] border-[#D8E5DC]`, kepala `p-5`, dan isi `p-5 sm:p-6 space-y-5` kini berasal dari template — bukan ditulis ulang per halaman, sehingga tidak bisa lagi menyimpang.
- Judul dan penjelasan dipindah ke slot `title`/`description` template. Badge 403 menjadi kartu merah tipis `rounded-[12px] border-[#FECACA] bg-[#FEF2F2] px-4 py-3` di dalam isi.
- Kartu "Peran Anda" dan "Tujuan yang ditolak" memakai padding seragam `px-4 py-3` dan kembali ke grid dua kolom (sebelumnya sempat 4 kolom saat halaman masih layar penuh).
- Baris tombol tidak lagi memakai `pt-4 border-t` karena jarak sudah diatur `space-y-5` dari template.


## [2026-11-15] - Penyeragaman Padding Halaman 403 (`/akses-ditolak`)

### Changed
- **Padding dan jarak dibuat seragam.** Sebelumnya halaman mencampur tiga ukuran berbeda: kepala `p-6`, isi `p-6`, kartu info `p-4`, tombol `min-h-[44px]`, dan `space-y-5` — hasilnya terasa renggang dan tidak konsisten dengan panel lain.
- Sekarang mengikuti skala panel: kepala dan isi sama-sama `px-5 py-4`, jarak antar blok `space-y-4`, kartu info `p-3`, kotak peringatan `p-3`, dan chip aplikasi `py-1` (sebelumnya `py-1.5`).
- Ikon kepala diperkecil dari `w-12 h-12` + `w-6 h-6` menjadi `w-10 h-10` + `w-5 h-5` dengan radius `10px`, sejalan dengan wadah ikon pada panel.
- Tombol aksi `min-h-[44px]` menjadi `min-h-[40px]` agar setinggi tombol pada panel lain.
- Jarak vertikal halaman dari `py-10` menjadi `py-8`, dan jarak label ke judul `mt-2` menjadi `mt-1.5`.

## [2026-11-15] - Penyederhanaan Desain Halaman `/berkas-dosen`

### Changed
- **Empat kartu statistik digabung menjadi satu kartu ringkasan** berisi `N dari 14 jenis berkas terisi`, jumlah berkas terunggah, status berkas wajib, bar progres, dan peringatan jenis wajib yang masih kosong. Empat kartu sebelumnya memakan ruang vertikal tanpa menambah informasi baru.
- **Tabel "Berkas Saya" dihapus dan digabung ke grid jenis berkas.** Sekarang satu daftar 14 baris — satu baris per JENIS berkas — dengan status terisi/belum, jumlah berkas, tanggal unggah terakhir, dan aksi unggah. Detail dokumen (nomor, tahun, ukuran, tanggal, pratinjau, hapus) dibuka di dalam baris tersebut. Halaman tidak lagi punya dua daftar yang menampilkan data yang sama dari sudut berbeda.
- **Tombol "Unggah Berkas" dipindah ke kartu ringkasan** dan berganti menjadi "Tutup Form" saat form terbuka, sehingga satu tombol mengendalikan form dan tidak ada tombol mengambang terpisah.
- **Form unggah diringkas**: hanya jenis berkas, nama dokumen, dan berkas PDF yang tampil. Nomor dokumen, tahun SK, dan keterangan disembunyikan di balik tombol "Tambah detail dokumen (opsional)". Tahun SK tetap terisi tahun berjalan sehingga form dapat langsung disimpan.
- Nama dokumen terisi otomatis saat jenis berkas dipilih, dan ikut berubah bila jenis diganti sebelum dosen mengetik sendiri.

### Removed
- Blok "Kelengkapan Jenis Berkas" bertombol seluruh jenis dan blok "Berkas Saya" berupa `DataTable` — keduanya digantikan satu daftar terpadu.
- Import `DataTable`/`KolomTabel` serta ikon `ArrowUturnLeftIcon` dan `ClockIcon` yang tidak lagi dipakai pada halaman ini.

## [2026-11-15] - Foto Dosen pada Panel Monitoring Berkas

### Added
- **Foto profil dosen di sisi kiri setiap baris** `/admin/berkas-dosen`. Bila dosen belum mengunggah foto, ditampilkan inisial nama pada lingkaran `#DCFCE7` dengan teks `#166534` — pola sama dengan kolom avatar pada halaman Manajemen Pengguna.
- Cincin (ring) warna di sekeliling foto menandai status kelengkapan: merah (belum), kuning (sebagian), hijau (lengkap), sehingga status tetap terbaca tanpa membaca badge.

### Changed
- `PILIH_PROFIL_PEMILIK` di `src/server/index.ts` kini ikut menyertakan kolom `avatar`, sehingga endpoint `GET /api/admin/berkas-dosen/monitoring` mengirim foto dosen.
- Ikon `DocumentTextIcon` yang sebelumnya menjadi penanda baris digantikan avatar; ikon tersebut tetap dipakai pada kartu statistik dan keadaan kosong.

## [2026-11-15] - Panel Berkas Dosen Menjadi Monitoring Kelengkapan

### Changed
- **`/admin/berkas-dosen` berubah dari verifikasi menjadi monitoring.** Admin kini melihat **seluruh dosen aktif** (163 akun pada data saat ini), bukan hanya dosen yang sudah mengunggah. Setiap baris menampilkan progres `N/14 jenis`, status (Belum / Sebagian / Lengkap), dan dapat dibuka untuk melihat daftar berkas terunggah, jenis yang belum diunggah, serta progres berkas wajib.
- **Sumber data panel admin** berpindah dari tabel berkas ke tabel pengguna berperan `DOSEN`, agar dosen tanpa berkas tetap muncul — merekalah yang perlu ditindaklanjuti.
- **Endpoint baru** `GET /api/admin/berkas-dosen/monitoring` (izin `berkas_dosen:view`).
- **Ekspor Rekap** menghasilkan CSV berpemisah `;` ber-BOM UTF-8 untuk seluruh dosen yang sedang tersaring.
- **Saringan dan pencarian** ditambahkan: filter kategori kelengkapan, serta pencarian nama/NIDN/prodi/fakultas.

### Removed
- **Alur verifikasi dihapus sepenuhnya**: tombol setujui/tolak, form alasan penolakan, dan endpoint `PATCH /api/berkas-dosen/:id/verify`.
- **Izin `berkas_dosen:verify`** dihapus dari `PERMISSION_CATALOG` serta database (melalui `db:seed`). Katalog berkas dosen kembali menjadi `menu`, `view`, `upload`, `delete`.
- **Status verifikasi tidak lagi ditampilkan** pada halaman dosen maupun admin: badge "Terverifikasi/Menunggu", panel "Catatan Penolakan", dan field `isVerified`/`sudahDiverifikasi` pada respons `GET /api/berkas-dosen/tipe` dan `GET /api/berkas-dosen/list`.
- Kolom `isVerified`, `verifiedAt`, `verifiedBy`, `verificationNote` **tetap ada di skema database** demi kompatibilitas, tetapi tidak dibaca atau diubah kode mana pun.


## [2026-11-15] - Arsip Dokumen LPM & LPPM pada Integrasi & API Hub

### Added
- **Tab "Arsip Dokumen"** (`src/client/pages/admin/ApiHub.tsx`): tab baru dengan pemilih sumber **Arsip Dokumen LPM** / **Arsip Dokumen LPPM** (data diambil terpisah per aplikasi, tidak digabung), pencarian judul/nomor/kategori/prodi, kolom kategori, tujuan publikasi (`LPM/LPPM Internal` atau `Program Studi` beserta nama prodi), status, tautan "Buka arsip", dan tautan berkas PDF.
- **Endpoint proxy baca-saja per aplikasi** di `src/server/index.ts`, dilindungi `authenticateToken` + `requireAnyPermission(['api_hub:view', 'api_hub:menu'])`:
  - `GET /api/inter-service/dokumen-lpm`
  - `GET /api/inter-service/dokumen-lppm`
- **Katalog endpoint** pada tab *Katalog Endpoint* memuat kedua endpoint di atas dengan deskripsi parameter filternya (`search`, `status`, `tahun`, `tujuanPublish`, `prodiCode`, `skip`, `take`).
- **Fungsi klien** `fetchDokumenLpm` dan `fetchDokumenLppm` beserta tipe `DokumenIntegrasiItem` pada `src/client/services/api.ts`.
- **Konfigurasi baru** `LPM_BASE_URL` (default `http://localhost:5004`) dan `LPPM_BASE_URL` (default `http://localhost:5005`) pada `.env` / `.env.example`.

### Changed
- **`ApiHub.tsx` disesuaikan dengan `AdminPanelTemplate` terkini**: prop `pageTitle` diganti `user`, `title`, dan `description` sehingga pemeriksaan tipe lolos dan halaman tidak lagi memakai props yang tidak ada.
- **Modul bersifat hanya-baca**: perubahan dokumen tetap dilakukan pada panel aplikasi LPM/LPPM masing-masing; API Hub hanya menampilkan dan menautkan ke arsip sumber.

### Notes
- Token sesi pengguna diteruskan apa adanya ke aplikasi tujuan sehingga otorisasi per-aplikasi tetap ditegakkan. Penolakan `401`/`403` dari aplikasi sumber diteruskan dengan kode yang sama; hanya kegagalan jaringan/timeout yang dipetakan menjadi `502`.
- Endpoint gabungan (`GET /api/inter-service/dokumen`) sengaja **tidak** disediakan — arsip LPM dan LPPM dibaca terpisah agar batas kepemilikan data antar lembaga tetap jelas.

## [2026-11-15] - Modul Berkas Dosen End-to-End

### Added
- **Halaman dosen `/berkas-dosen`** (`src/client/pages/BerkasDosenSaya.tsx`): dosen mengunggah dan mengelola berkas pribadinya (CV, ijazah, SK, sertifikat, dll.). Memuat 14 jenis berkas dari database, menampilkan ringkasan kelengkapan, status verifikasi, dan catatan penolakan dari pengelola.
- **Endpoint berkas dosen** di `src/server/index.ts`: `GET /api/berkas-dosen/tipe`, `GET /api/berkas-dosen/list`, `POST /api/berkas-dosen/upload` (multipart), `GET /api/berkas-dosen/file/:nama`, `DELETE /api/berkas-dosen/:id`, `PATCH /api/berkas-dosen/:id/verify`.
- **Modul penyimpanan** `src/server/lib/dosenBerkas.ts`: multer disk storage dengan nama file acak, batas 10 MB, validasi `mimetype` dan signature `%PDF`.
- **Izin `berkas_dosen:verify`**: ditambahkan ke `PERMISSION_CATALOG` dan `PERMISSIONS` klien. Peran `DOSEN` kini memegang `berkas_dosen:menu`, `berkas_dosen:view`, `berkas_dosen:upload`, dan `berkas_dosen:delete`.
- **Template `PanelPageTemplate`** (`src/client/components/templates/PanelPageTemplate.tsx`): generalisasi `AdminPanelTemplate` dengan label dan icon yang dapat diatur, sehingga halaman dosen memakai kerangka visual sama tanpa mengklaim sebagai panel administrasi.

### Changed
- **`/admin/berkas-dosen` ditulis ulang** dari data contoh menjadi panel verifikasi nyata: pemilih dosen dengan pencarian, daftar berkas dosen terpilih, serta aksi setujui/tolak dengan alasan penolakan.
- **`AdminPanelTemplate`** kini menjadi pembungkus tipis di atas `PanelPageTemplate`; perilaku dan tampilannya tidak berubah.
- **Menu sidebar** menambahkan "Berkas Saya" pada navigasi utama (terlihat oleh pemegang `berkas_dosen:menu`).
- **Dependency baru**: `multer` dan `@types/multer`.

### Fixed
- `ApiHub.tsx` memakai prop `pageTitle` yang tidak ada pada `AdminPanelTemplate`, sehingga typecheck client gagal. Kini memakai prop `user`, `title`, dan `description`.
- `Profile.tsx` memberi `message` bertipe `unknown` pada `NotificationModal`. Kini memakai helper `pesanGalatPermintaan()` yang sudah tersedia.

### Removed
- Data contoh (`mock`) pada halaman Berkas Dosen, termasuk penggunaan `alert()`/`confirm()` bawaan browser.


## [2026-11-15]

### Changed
- Katalog API Hub menampilkan `GET /api/academic/hierarchy` sebagai endpoint publik ONE UNUSU yang mem-proxy daftar fakultas dan program studi aktif dari API Prodi UNUSU.

### Removed
- Halaman `/admin/master-akademik` beserta menu sidebar, breadcrumb, dan route-nya dihapus. Data akademik kembali sepenuhnya bergantung pada API Prodi UNUSU melalui `GET /api/academic/hierarchy`.
- Endpoint `GET /api/admin/academic/list` dan `POST /api/admin/academic/sync` dihapus. Tabel `fakultas` dan `prodi` tetap ada di database (tidak ada mutasi data).

## [2026-11-14] - `DataTable` Bersama, Kolom Nomor Urut, dan Kolom Avatar Pengguna

### Added
- **Komponen `DataTable`**: Tabel data standar panel (`src/client/components/DataTable.tsx`) yang menggantikan penulisan `<table>` berulang. Kolom dideklarasikan sebagai data (`kolom`, `sel(baris, indeks)`), bukan JSX per halaman.
- **Kolom "No." Bawaan**: Prop `tampilkanNomor` (bawaan `true`) dan `judulNomor` (bawaan `"No."`). Nomor **melanjutkan antar halaman** karena dihitung dari `paginasi.dari + indeks`, bukan indeks potongan halaman.
- **Hook `usePagination`**: `OPSI_PER_HALAMAN` (`[10, 25, 50, 100]`), `PER_HALAMAN_BAWAAN` (`10`), dan `usePagination(data, { perHalaman })` agar ringkasan serta nomor urut konsisten di semua tabel.
- **Kolom Avatar pada Manajemen Pengguna**: Sel identitas menampilkan pasfoto dari `avatar` bila tersedia; bila kosong ditampilkan inisial nama lewat `inisialNama()` di dalam lingkaran `#DCFCE7`. `inisialNama()` mengambil maksimal dua kata pertama, selalu huruf besar, dan mengembalikan `?` untuk nama kosong.
- **Kolom "No." pada Riwayat SSO**: Tabel riwayat tiket SSO kini bernomor urut.

### Changed
- **Ukuran Huruf Tabel**: Judul kolom `text-[12.5px] font-bold`, isi sel mewarisi `text-xs` (12px). Judul kolom wajib lebih besar dari isi sel.
- **Payload `GET /api/admin/users`**: Respons kini menyertakan `avatar` yang sebelumnya tidak dikirim, sehingga kolom avatar dapat dirender tanpa permintaan tambahan.
- **Status Aktif Menu Sidebar**: Perhitungan `isActive` memakai pencocokan batas segmen (`pathname === to` atau `pathname.startsWith(to + '/')`) dengan kecocokan terpanjang menang, sehingga `/admin` tidak menyala di `/admin/pengguna`.

### Fixed
- **Impor `CheckIcon` Hilang**: `ManajemenPengguna.tsx` memakai `<CheckIcon />` pada panel sinkronisasi mahasiswa tanpa mengimpornya, sehingga `tsc` gagal. Ditambahkan ke blok impor `@heroicons/react/24/outline`.
- **Impor Ikon Mati**: Dibersihkan dari `ManajemenPengguna.tsx`, `RegistrasiSso.tsx`, `Izin.tsx`, `Peran.tsx`, dan `SidebarLayout.tsx`.

### Documentation
- `docs/routes/admin/RULES.md` menambah tabel pemetaan halaman/template/wadah data beserta penyimpangan yang disetujui (`/admin/izin`, `/admin/peran`, `/admin/slider`), aturan `DataTable`, aturan nomor urut, aturan ukuran huruf, dan aturan kolom avatar.
- `docs/design-system/COMPONENTS.md` menambahkan bagian `DataTable`, `usePagination`, dan `Carousel` beserta tabel props lengkap.
- Otorisasi pengguna pada dokumentasi dikoreksi dari `roleId` tunggal menjadi `roleIds: number[]` (multi-peran melalui tabel junction `user_roles`).

## [2026-11-13] - Sinkronisasi Massal Dosen SIAKAD & Cascading Hirarki Akademik

### Added
- **Sinkronisasi Massal Dosen SIAKAD:** Endpoint `POST /api/admin/siakad/sync-dosen` yang mengautentikasi akun admin SIAKAD UNUSU ke portal web `/sia/index.php`, mengekstrak 180+ direktori dosen resmi beserta NIDN dan prodi, lalu menyimpannya/memperbaruinya ke pangkalan data ONE UNUSU secara idempotent.
- **Tombol Aksi Sinkronisasi SIAKAD:** Tombol `Tarik Dosen SIAKAD` pada antarmuka `ManajemenPengguna.tsx` yang dilengkapi dengan dialog konfirmasi, status loading interaktif, dan notifikasi hasil rekapitulasi jumlah akun yang dibuat dan diperbarui.
- **Penyimpanan Biodata Lengkap Civitas:** Model pengguna (`users`) diperluas dengan field `jenis_kelamin`, `tempat_lahir`, `tanggal_lahir`, `nik`, `angkatan`, `status_akademik`, `alamat`, `asal_sekolah`, `nama_ibu_kandung`, dan `synced_at` via migrasi `20261113090000_add_civitas_biodata_from_siakad`.
- **Hirarki Akademik Cascading:** Dropdown Fakultas dan Program Studi terintegrasi dinamis dengan API hirarki akademik portal prodi, lengkap dengan penyaringan otomatis prodi turunan saat fakultas dipilih.

## [2026-11-09] - Otorisasi Berbasis Izin Masuk Dinamis & Migrasi RoleId

### Added
- Dukungan **Multi-Role** pengguna di portal ONE UNUSU: pembuatan model tabel relasi `user_roles`, migrasi database `20261109110000_multi_role_user_roles`, dan backfill data dari `roleId`.
- Antarmuka pemilihan multi-role (checkbox checklist) pada form tambah dan ubah pengguna di `/admin/pengguna`.
- Penampilan badges multi-role pada tabel daftar pengguna.
- Pembersihan katalog izin portal ONE UNUSU SSO agar murni mengelola portal internal SSO tanpa izin cabang.
- Endpoint API `POST /api/admin/permissions` dan `DELETE /api/admin/permissions/:id` untuk pembuatan dan penghapusan izin secara mandiri.
- Tombol dan form modal ringkas **"+ Tambah Izin"** pada halaman `/admin/izin`.
- Migrasi database `20261109100300_drop_application_admin_roles`: migrasi seluruh pengguna ber-peran admin cabang ke `SUPERADMIN` dan penghapusan 7 peran `ADMIN_<APP>` dari tabel `roles`.
- Helper `badgeForRole(code)` di `ManajemenPengguna.tsx` dengan palet warna deterministik untuk peran kustom buatan Super Administrator.
- Registrasi otomatis aplikasi Portal Prodi UNUSU (`prodi-unusu`) dan 14 website program studi ke direktori aplikasi non-SSO.

### Changed
- Refaktor `ManajemenPengguna.tsx`: pemuatan daftar peran kini dinamis via API `GET /api/admin/roles` (`fetchAdminRoles()`); pembuatan dan pengeditan pengguna mengirimkan `roleId`.
- Label input identifier pada formulir tambah akun berubah secara dinamis (NIM untuk Mahasiswa, NIDN untuk Dosen, Username untuk peran lainnya).
- Otorisasi pintu masuk aplikasi cabang memakai **izin masuk global** `masuk_admin`, `masuk_dosen`, dan `masuk_mahasiswa` (tanpa prefiks `clientId`), diiriskan dengan `sso_apps.targetRoles` aplikasi tujuan lewat fungsi `decideAppAccess()`.
- Super Administrator dan Admin SSO otomatis memiliki seluruh izin masuk, sehingga dapat membuka aplikasi cabang mana pun.
- **Penyelarasan URL Callback Lingkungan**: Memisahkan seeder dan skrip sinkronisasi URL callback untuk mode lokal (`npm run db:sso-dev-urls` / `npm run db:seed:local`) dan mode VPS (`npm run db:sso-vps-urls` / `npm run db:seed:vps`).
- `seed.ts` diperbarui: akun bawaan hanya `admin` (`SUPERADMIN`) dan `admin_sso` (`ADMIN_SSO`). Penautan pengguna dilakukan sesudah penyiapan peran (`roleId`).

### Removed
- Kolom enum `users.role` pada schema database dan TypeScript.
- Definisi peran kaku per aplikasi (`ADMIN_LPM`, `ADMIN_LPPM`, `ADMIN_ESURAT`, `ADMIN_SARPRAS`, `ADMIN_AKREDITASI`, `ADMIN_LMS`, `ADMIN_PRODI`).
- Pemfilteran peran hardcoded (`ROLE_OPTIONS`, `ROLE_LABEL`, `APP_ROLES`) yang sebelumnya membatasi pengelolaan peran.

## [2026-10-30] - Seeder Direktori Non-SSO

### Added
- `prisma/directory.ts`: sumber tunggal `DIRECTORY_ENTRIES` dan fungsi `seedDirectory(prisma)` untuk tabel `LayananKampus`, dipakai bersama oleh `prisma/seed.ts` dan `prisma/seed-directory.ts`.
- Skrip `npm run prisma:seed:directory` untuk mengisi direktori non-SSO tanpa menjalankan seed penuh.
- Entri awal: **SIAKAD UNUSU** (`https://siakad.unusu.ac.id`, ikon `AcademicCapIcon`) dan **PMB UNUSU** (`https://pmb.unusu.ac.id`, ikon `UserIcon`), keduanya `isExternal: true`.

### Changed
- `prisma/seed.ts` kini memiliki bagian ke-4 yang memanggil `seedDirectory(prisma)`, sehingga seed lengkap ikut mengisi direktori non-SSO.
- `seedDirectory` bersifat idempotent: pencocokan memakai `nama`, entri yang sudah ada diperbarui (bukan diduplikasi), dan entri lain hasil panel admin tidak dihapus.

## [2026-10-29] - Pemecahan Panel Admin & Izin Berbasis Resource

### Added
- Halaman admin baru `/admin/direktori` (Direktori Publik) lengkap dengan manajemen CRUD (tambah, edit, hapus, urutan, ikon, dan tautan eksternal/internal) yang langsung terhubung dinamis ke Dashboard civitas.
- Endpoint `GET /api/directories`, `POST/PUT/DELETE /api/admin/directories` dengan izin berbasis permission (`directory:menu`, `directory:view`, `directory:edit`, `directory:delete`).
- Pemisahan tampilan `/aplikasi` publik menjadi 2 section terbuka: *Aplikasi Terintegrasi Single Sign-On (SSO)* dan *Aplikasi Mandiri & Eksternal (Non-SSO)*.
- Fitur Edit dan Hapus aplikasi SSO pada halaman Registrasi SSO lengkap dengan modal form edit dan modal dialog konfirmasi hapus.
- Endpoint `DELETE /api/admin/apps/:id` dengan perlindungan izin `application:delete` beserta pembersihan otomatis tiket SSO terkait.
- Komponen dialog pop-up standar `NotificationModal` (`success`, `error`, `confirm`, `info`) untuk seluruh aksi dan konfirmasi sistem.
- Dukungan upload gambar Base64 besar melalui kenaikan limit Express JSON parser menjadi `50mb` dan migrasi kolom `sso_apps.icon` menjadi MySQL `LONGTEXT`.
- Empat sub-rute: `/admin` (Registrasi SSO), `/admin/pengguna` (Manajemen Pengguna), `/admin/izin` (matriks izin per peran), `/admin/peran` (CRUD peran).
- Model `Permission`, `Role`, `RolePermission` beserta kolom `User.roleId`, dan enum Prisma `Role` diganti nama menjadi `UserRole` agar tidak bentrok dengan model baru.
- Endpoint `GET /api/admin/permissions`, `GET/POST/PUT/DELETE /api/admin/roles`, `PUT /api/admin/roles/:id/permissions`.
- Middleware `requirePermission` dan helper `getUserPermissionKeys`; `permissions` disertakan pada login dan `/api/auth/me`.
- Komponen `AdminPanelTemplate`, hook `useAdminData`, helper `lib/permissions.ts` dan `lib/appRoles.ts`.

### Changed
- Seluruh endpoint admin dialihkan dari pemeriksaan peran ke pemeriksaan izin: `dashboard:view`, `user:view`, `user:edit`, `application:view`, `application:edit`, `permission:view`, `permission:edit`, `role:view`, `role:edit`, `role:delete`.
- Navigasi sidebar dan breadcrumb disusun dari katalog menu (`dashboard`, `profile`, `application`, `user`, `permission`, `role`) dan hanya tampil bila izin menunya dimiliki.

### Removed
- Halaman monolit `src/client/pages/AdminPanel.tsx` serta middleware `requireSuperadmin`.

## [2026-10-29] - Penghapusan Warna Default Tailwind

### Changed
- Seluruh 40 pemakaian `slate-*` dan `emerald-*` diganti token Modern Green: judul `#1E293B`, label/deskripsi `#475569`, metadata `#64748B`, ikon redup `#94A3B8`, border kartu dan input `#D8E5DC`, divider `#E8EFEA`, latar chip dan hover `#F1F5F2`, backdrop dan tombol sekunder hover `#1E293B`/`#E8EFEA`, focus ring input `#166534`.
- Modal Tambah Akun dan Modal Daftarkan Aplikasi kini memakai token yang sama dengan tabel dan form di halaman utama panel.

## [2026-10-29]

### Changed
- Standardized operational stats cards with `#D8E5DC` borders and modern role typography.
- Enhanced table header styling to Pale Green `#F0FDF4` and border `#D8E5DC`.
- Updated role badges to follow the official semantic palette.
- Normalized filter and search input borders from `#CBD5E1` to `#D8E5DC`.
