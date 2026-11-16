# Changelog - Autentikasi SSO

## [2026-11-17] — Kewajiban Ganti Kata Sandi Bawaan & Penutupan Celah Pengambilalihan Akun

### Added
- **`ForcePasswordChangeModal`** (`src/client/components/ForcePasswordChangeModal.tsx`):
  modal ganti kata sandi yang **tidak dapat ditutup** — tanpa tombol batal, klik
  latar diabaikan, dan `Escape` diblokir. Menampilkan username aktif, tombol
  lihat/sembunyikan per kolom, daftar persyaratan kata sandi yang diperbarui
  langsung, serta tombol "Keluar dari Akun" sebagai satu-satunya alternatif.
- **`PenjagaKataSandiBawaan`** di `App.tsx`: dirender di dalam `Router` namun di
  luar `<Routes>`, sehingga modal tampil di seluruh halaman sampai kata sandi
  diganti.
- **Kolom `User.harusGantiPassword`** dan **`User.passwordDiubahAt`** pada
  `schema.prisma` (kolom DB: `harus_ganti_password`, `password_diubah_at`).
- **Konstanta `KATA_SANDI_BAWAAN`** di server, dapat ditimpa lewat environment
  `DEFAULT_PASSWORD`.
- 162 akun yang masih memakai kata sandi bawaan telah ditandai
  `harusGantiPassword = true` di database.

### Changed
- Login (`POST /api/auth/login`) kini mengirim `harusGantiPassword`. Status
  dihitung ulang setiap login dengan membandingkan hash tersimpan terhadap kata
  sandi bawaan, sehingga akun lama tidak lolos dari kewajiban ini.
- `GET /api/auth/me` ikut mengirim `harusGantiPassword` agar `PanelLayout` dapat
  memperbarui cache profil dan memicu pengecekan ulang.
- `PUT /api/auth/profile` menolak kata sandi baru yang sama dengan kata sandi
  saat ini atau sama dengan kata sandi bawaan.

### Fixed
- **Pengambilalihan akun lewat fallback SIAKAD (kritis).** Sebelumnya, bila
  `bcrypt.compare` lokal gagal, server memverifikasi ke SIAKAD dan — jika
  berhasil — **menimpa hash kata sandi lokal** dengan kata sandi yang baru saja
  diketik. Karena NIDN dosen bukan rahasia, siapa pun yang mengetahui NIDN dapat
  masuk memakai kata sandi lemah yang diterima SIAKAD, lalu kata sandi lemah itu
  menggantikan kata sandi portal secara permanen. Fallback kini hanya memberi
  akses satu sesi dan tidak lagi menyentuh `user.password`.
- **Peran fallback SIAKAD tidak divalidasi.** Peran hasil autentikasi eksternal
  sekarang harus sejalan dengan peran akun lokal; bila tidak, permintaan ditolak
  dengan 403.
- **JIT provisioning bisa membuat akun administratif.** Peran SIAKAD yang
  mengandung kata "ADMIN" dahulu dipetakan menjadi `ADMIN_SSO`, dan akun yang
  peran pemetaannya tidak ditemukan jatuh ke `MAHASISWA`. Kini hanya `DOSEN`
  dan `MAHASISWA` yang diizinkan; selain itu ditolak, tanpa fallback.

## [2026-11-16]

### Changed
- Callback SSO seragam ke seluruh aplikasi cabang: URL redirect hanya membawa `token`. Parameter `client_id` dihilangkan dari URL browser; verifikasi identitas cabang dilakukan server-to-server.
- Cakupan cookie sesi ONE UNUSU pada produksi ditetapkan melalui `AUTH_COOKIE_DOMAIN=.unusu.ac.id` agar subdomain aplikasi cabang dapat mengirim cookie ke endpoint pemeriksaan sesi SSO. Atribut `HttpOnly`, `Secure`, dan `SameSite=Lax` tetap dipertahankan.

## [2026-11-14] - Pesan Galat Login yang Jujur & Type Safety

### Added
- **Helper `pesanGalatPermintaan`**: `src/client/lib/pesanGalat.ts` memetakan galat axios menjadi pesan yang menyebut penyebab sebenarnya (jaringan, 401, 403, 5xx, atau galat tanpa respons) beserta tipe `GalatPermintaan`.

### Fixed
- **Pesan "Server Mati" untuk Galat Ber-respons**: Sebelumnya setiap kegagalan tanpa `message` ditampilkan sebagai "Gagal terhubung ke server SSO", sehingga kata sandi salah pun tampak seperti server mati. Kini pesan dibedakan menurut penyebabnya.
- **`catch (err: any)` pada Formulir Login**: Diganti `catch (err)` dengan penyempitan tipe eksplisit sebelum diteruskan ke helper (`err !== null && typeof err === 'object' ? (err as GalatPermintaan) : {}`), sesuai PROJECT_RULES 5.4.
- **Port Dev Tetap 5178**: `vite.config.ts` memakai `strictPort: true` dan `CORS_ORIGIN` diselaraskan ke 5178, sehingga Vite gagal dengan jelas alih-alih diam-diam berpindah port dan membuat browser memblokir respons karena origin tidak terdaftar.

## [2026-11-13] - Integrasi JIT Provisioning & Multi-Stage Loading UX SIAKAD

### Added
- **On-Demand JIT Provisioning:** Otentikasi fallback ke endpoint resmi SIAKAD UNUSU (`https://siakad.unusu.ac.id/auth/index.php`). Akun mahasiswa/dosen yang valid di SIAKAD namun belum terdaftar di database lokal `one-unusu` otomatis dibuatkan entri profil lokal lengkap dengan hash sandi dan penautan peran dinamis (`MAHASISWA`/`DOSEN`).
- **Penyedotan Biodata Profil Mahasiswa:** Integrasi scraper profil mahasiswa dari portal SIAKAD UNUSU (`/mahasiswa/index.php?module=home`) untuk mengambil NIK, tempat/tanggal lahir, jenis kelamin, alamat, asal sekolah, nama ibu kandung, serta pemetaan fakultas/prodi saat login pertama kali.
- **Dynamic Multi-Stage UX Status:** Tombol masuk pada `Login.tsx` menampilkan animasi progresif bertahap saat autentikasi & sinkronisasi berlangsung: *"Memverifikasi kredensial..."* → *"Memeriksa pangkalan data SIAKAD..."* → *"Menyinkronkan biodata & program studi..."*.

## [2026-10-30] - Login Tidak Lagi Dipaksa ke Biodata

### Changed
- **Login selalu berakhir di panel.** Blok `else if (!userData.email || !userData.noHp) → navigate('/profil')` dihapus. Pengguna kini diarahkan ke `resolveLandingPath(role)` (`SUPERADMIN` → `/admin`, peran lain → `/dashboard`).
- Pemeriksaan kelengkapan biodata dipindahkan ke `handleLaunchApp` pada Dashboard, sehingga katalog layanan tetap bisa dilihat sebelum biodata dilengkapi.

## [2026-10-30]

### Fixed
- **Login Superadmin gagal**: tombol pintasan "Uji Coba: Superadmin" pada `Login.tsx` mengisi kata sandi `AdminPassword123!`, sedangkan hash di database cocok dengan `password123`. Tombol kini memakai satu konstanta `DEMO_PASSWORD` yang sama untuk ketiga akun uji, sesuai `SEED_DEMO_PASSWORD`/`SEED_ADMIN_PASSWORD`.
- Label dan pesan validasi login menyebut hanya "NIM / NIDN", sehingga akun administrator yang memakai username dianggap tidak valid. Label, placeholder, dan pesan kini menyebut "NIM / NIDN / Username", termasuk pesan `POST /api/auth/login` di `src/server/index.ts`.

## [2026-10-29]

### Changed
- Palet halaman login diseragamkan ke token Modern Green: border input `#D8E5DC`, state aktif tombol `#14532D`, chip status memakai `#14532D` dan `#22C55E`, teks footer `#64748B`.
- Overlay foto kampus memakai `#14532D` dengan tiga tingkat opasitas, menggantikan `#062419`.
- Efek blur pada chip status dihapus karena tidak menambah keterbacaan.
