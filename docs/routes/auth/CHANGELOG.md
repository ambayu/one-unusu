# Changelog - Autentikasi SSO

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
